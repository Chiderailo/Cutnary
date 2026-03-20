"""
Render worker - consumes render jobs from Redis (BullMQ render_jobs queue).
Builds ASS from captions, trims clip, burns subtitles, saves to storage/renders/.
Calls backend POST /api/job/:jobId/render-complete when done.
"""

import json
import logging
import os
import subprocess
import sys
import uuid
from pathlib import Path

import redis
import requests
from dotenv import load_dotenv

from render_ass import generate_render_ass
from r2_upload import upload_to_r2

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).parent / ".env")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3333")

QUEUE_NAME = "render_jobs"
WAIT_LIST_KEY = f"bull:{QUEUE_NAME}:wait"

# Storage paths relative to ai-worker/
STORAGE_ROOT = Path(__file__).parent / ".." / "storage"
CLIPS_DIR = STORAGE_ROOT / "clips"
RENDERS_DIR = STORAGE_ROOT / "renders"
SUBTITLES_DIR = STORAGE_ROOT / "subtitles" / "render"


def get_job_data_key(job_id: str) -> str:
    return f"bull:{QUEUE_NAME}:{job_id}"


def process_render_job(redis_client: redis.Redis, job_id: str) -> None:
    """Fetch job payload and render the video."""
    job_key = get_job_data_key(job_id)
    data_json = redis_client.hget(job_key, "data")

    if not data_json:
        logger.warning("Render job %s has no data, skipping", job_id)
        _report_complete(job_id, error="Job has no data")
        return

    try:
        payload = json.loads(data_json)
    except json.JSONDecodeError as e:
        logger.error("Invalid JSON for job %s: %s", job_id, e)
        _report_complete(job_id, error=f"Invalid JSON: {e}")
        return

    clip_url = payload.get("clip_url")
    if not clip_url:
        _report_complete(job_id, error="Missing clip_url")
        return

    captions = payload.get("captions", [])
    style = payload.get("style", "simple")
    position = payload.get("position", "bottom")
    fontSize = payload.get("fontSize", "medium")
    trim_start = float(payload.get("trimStart", 0))
    trim_end = float(payload.get("trimEnd", 60))
    text_color = payload.get("textColor", "#ffffff")
    bg_color = payload.get("backgroundColor", "#facc15")
    bg_opacity = float(payload.get("backgroundOpacity", 0.8))

    clip_path = CLIPS_DIR / clip_url
    if not clip_path.exists():
        logger.error("Clip not found: %s", clip_path)
        _report_complete(job_id, error=f"Clip not found: {clip_url}")
        return

    RENDERS_DIR.mkdir(parents=True, exist_ok=True)
    SUBTITLES_DIR.mkdir(parents=True, exist_ok=True)

    # Output filename: clip1_9x16.mp4 -> clip1_9x16_rendered.mp4
    base = clip_url.replace(".mp4", "").replace(".MP4", "")
    output_filename = f"{base}_rendered.mp4"
    output_path = RENDERS_DIR / output_filename

    # Shift captions by -trimStart for trimmed output (output starts at 0)
    shifted_captions = []
    for cap in captions:
        start = float(cap.get("start", 0))
        end = float(cap.get("end", start + 1))
        if end <= trim_start or start >= trim_end:
            continue
        new_start = max(0, start - trim_start)
        new_end = min(trim_end - trim_start, end - trim_start)
        if new_end <= new_start:
            continue
        shifted = {
            "start": new_start,
            "end": new_end,
            "text": cap.get("text", ""),
            "words": cap.get("words"),
        }
        if shifted.get("words"):
            shifted["words"] = [
                {
                    "word": w.get("word", ""),
                    "start": max(0, float(w.get("start", 0)) - trim_start),
                    "end": min(trim_end - trim_start, float(w.get("end", 0)) - trim_start),
                }
                for w in shifted["words"]
                if float(w.get("end", 0)) > trim_start and float(w.get("start", 0)) < trim_end
            ]
        shifted_captions.append(shifted)

    # Generate ASS
    ass_id = str(uuid.uuid4())[:8]
    ass_path = SUBTITLES_DIR / f"render_{job_id}_{ass_id}.ass"
    generate_render_ass(
        str(ass_path),
        shifted_captions,
        style=style,
        position=position,
        fontSize=fontSize,
        text_color=text_color,
        bg_color=bg_color,
    )

    # ASS path for ffmpeg - use forward slashes
    ass_path_str = ass_path.as_posix()

    # ffmpeg: trim then burn captions
    # -ss before -i = input seeking (fast), -to = end time
    cmd = [
        "ffmpeg",
        "-y",
        "-ss", str(trim_start),
        "-to", str(trim_end),
        "-i", str(clip_path),
        "-vf", f"ass='{ass_path_str}'",
        "-c:a", "copy",
        "-preset", "fast",
        "-crf", "23",
        str(output_path),
    ]

    logger.info("Rendering: %s -> %s", clip_url, output_filename)

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        logger.error("ffmpeg failed: %s %s", e.stderr, e.stdout)
        _report_complete(job_id, error=f"ffmpeg failed: {e.stderr[:200]}")
        return
    finally:
        if ass_path.exists():
            try:
                ass_path.unlink()
            except OSError:
                pass

    if not output_path.exists():
        _report_complete(job_id, error="Output file not created")
        return

    # Upload rendered clip to R2; fall back to local filename if upload fails
    r2_url = upload_to_r2(str(output_path), f"renders/{job_id}_{output_filename}")
    if r2_url:
        report_url = r2_url
    else:
        report_url = output_filename
        logger.warning("R2 upload failed for render %s, using local filename", output_filename)

    _report_complete(job_id, url=report_url)
    logger.info("Render complete: %s", output_filename)


def _report_complete(job_id: str, url: str | None = None, error: str | None = None) -> None:
    """POST to backend render-complete."""
    try:
        resp = requests.post(
            f"{BACKEND_URL.rstrip('/')}/api/job/{job_id}/render-complete",
            json={"url": url} if url else {"error": error},
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        if not resp.ok:
            logger.warning("render-complete failed: %s %s", resp.status_code, resp.text)
    except Exception as e:
        logger.warning("Could not report render complete: %s", e)


def run_worker() -> None:
    """Main loop: BLPOP on render_jobs wait list."""
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    logger.info("Render worker started, listening on %s", WAIT_LIST_KEY)

    while True:
        try:
            result = redis_client.blpop(WAIT_LIST_KEY, timeout=0)
            if result is None:
                continue
            _list_name, job_id = result
            logger.info("Render job received: %s", job_id)
            process_render_job(redis_client, job_id)
        except redis.ConnectionError as e:
            logger.error("Redis connection error: %s", e)
        except KeyboardInterrupt:
            logger.info("Render worker stopped.")
            break
        except Exception as e:
            logger.exception("Error processing render job: %s", e)


if __name__ == "__main__":
    run_worker()
