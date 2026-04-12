"""
Explainer worker - consumes explainer jobs from Redis (BullMQ explainer_jobs queue).
Downloads clip, runs create_voice_explainer, uploads to R2, calls backend complete callback.
"""

import json
import logging
import os
import tempfile
import uuid
from pathlib import Path

import redis
import requests
from dotenv import load_dotenv

from r2_upload import upload_to_r2
from voice_explainer import create_voice_explainer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=__import__("sys").stdout,
)
logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).parent / ".env")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3333")

# Storage paths
STORAGE_ROOT = Path(__file__).parent.parent / "storage"
CLIPS_DIR = STORAGE_ROOT / "clips"
EXPLAINERS_DIR = STORAGE_ROOT / "explainers"

QUEUE_NAME = "explainer_jobs"
WAIT_LIST_KEY = f"bull:{QUEUE_NAME}:wait"


def get_job_data_key(job_id: str) -> str:
    return f"bull:{QUEUE_NAME}:{job_id}"


def download_clip(url: str, dest_path: str) -> bool:
    """Download clip from URL to local path."""
    try:
        resp = requests.get(url, stream=True, timeout=120)
        resp.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=65536):
                f.write(chunk)
        return True
    except Exception as e:
        logger.error("Download failed for %s: %s", url, e)
        return False


def process_explainer_job(redis_client: redis.Redis, job_id: str) -> None:
    """Fetch job payload, process explainer, report complete."""
    job_key = get_job_data_key(job_id)
    data_json = redis_client.hget(job_key, "data")

    if not data_json:
        logger.warning("Explainer job %s has no data, skipping", job_id)
        _report_complete(job_id, error="Job has no data")
        return

    try:
        payload = json.loads(data_json)
    except json.JSONDecodeError as e:
        logger.error("Invalid JSON for job %s: %s", job_id, e)
        _report_complete(job_id, error=f"Invalid JSON: {e}")
        return

    raw_job_id = payload.get("job_id")
    if not raw_job_id:
        _report_complete(job_id, error="Missing job_id")
        return

    db_job_id = str(raw_job_id)
    clip_url = payload.get("clip_url")
    if not clip_url:
        _report_complete(job_id, error="Missing clip_url")
        return

    style = payload.get("style", "commentary")
    voice = payload.get("voice", "en-US-Neural2-J")
    original_audio_volume = float(payload.get("original_audio_volume", 0.2))

    # Resolve clip path
    clip_path: str | None = None
    if clip_url.startswith("http://") or clip_url.startswith("https://"):
        # Download from URL
        EXPLAINERS_DIR.mkdir(parents=True, exist_ok=True)
        ext = ".mp4"
        if "." in clip_url.split("?")[0]:
            ext = "." + clip_url.split("?")[0].rsplit(".", 1)[-1].lower()
        if ext not in (".mp4", ".webm", ".mov"):
            ext = ".mp4"
        tmp_name = f"explain_input_{uuid.uuid4().hex[:12]}{ext}"
        clip_path = str(EXPLAINERS_DIR / tmp_name)
        if not download_clip(clip_url, clip_path):
            _report_complete(job_id, error="Failed to download clip")
            return
    else:
        # Local path - assume clips dir or storage
        candidate = CLIPS_DIR / clip_url
        if candidate.exists():
            clip_path = str(candidate)
        else:
            candidate = Path(clip_url)
            if candidate.exists():
                clip_path = str(candidate)
        if not clip_path:
            _report_complete(job_id, error=f"Clip not found: {clip_url}")
            return

    EXPLAINERS_DIR.mkdir(parents=True, exist_ok=True)
    output_filename = f"explain_{db_job_id}_{uuid.uuid4().hex[:8]}.mp4"
    output_path = str(EXPLAINERS_DIR / output_filename)

    try:
        result = create_voice_explainer(
            video_path=clip_path,
            output_path=output_path,
            style=style,
            voice_name=voice,
            original_audio_volume=original_audio_volume,
        )
    except Exception as e:
        logger.exception("create_voice_explainer failed: %s", e)
        _report_complete(job_id, error=str(e))
        if clip_path and clip_path != str(CLIPS_DIR / clip_url):
            try:
                Path(clip_path).unlink(missing_ok=True)
            except OSError:
                pass
        return

    # Cleanup downloaded temp clip
    if clip_url.startswith("http"):
        try:
            Path(clip_path).unlink(missing_ok=True)
        except OSError:
            pass

    script = result.get("script", "")
    out_path = result.get("output_path", output_path)

    if not Path(out_path).exists():
        _report_complete(job_id, error="Output file not created")
        return

    r2_key = f"explainers/{output_filename}"
    report_url = upload_to_r2(out_path, r2_key)
    if not report_url:
        report_url = output_filename
        logger.warning("R2 upload failed for explainer %s, using local filename", output_filename)

    _report_complete(job_id, url=report_url, script=script)
    logger.info("Explainer complete: %s", output_filename)

    try:
        Path(out_path).unlink(missing_ok=True)
    except OSError:
        pass


def _report_complete(
    job_id: str,
    url: str | None = None,
    script: str | None = None,
    error: str | None = None,
) -> None:
    """POST to backend explainer complete callback."""
    # BullMQ job_id may have explainer_ prefix
    raw_id = job_id
    if job_id.startswith("explainer_"):
        raw_id = job_id[10:]

    body = {"error": error} if error else {"url": url or "", "script": script or ""}
    try:
        resp = requests.post(
            f"{BACKEND_URL.rstrip('/')}/api/explainer/{raw_id}/complete",
            json=body,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        if not resp.ok:
            logger.warning("explainer complete callback failed: %s %s", resp.status_code, resp.text)
    except Exception as e:
        logger.warning("Could not report explainer complete: %s", e)


def run_worker() -> None:
    """Main loop: BLPOP on explainer_jobs wait list."""
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    logger.info("Explainer worker started, listening on %s", WAIT_LIST_KEY)

    while True:
        try:
            result = redis_client.blpop(WAIT_LIST_KEY, timeout=0)
            if result is None:
                continue
            _list_name, job_id = result
            logger.info("Explainer job received: %s", job_id)
            process_explainer_job(redis_client, job_id)
        except redis.ConnectionError as e:
            logger.error("Redis connection error: %s", e)
        except KeyboardInterrupt:
            logger.info("Explainer worker stopped.")
            break
        except Exception as e:
            logger.exception("Error processing explainer job: %s", e)


if __name__ == "__main__":
    run_worker()
