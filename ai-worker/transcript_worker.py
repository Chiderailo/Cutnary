"""
Transcript worker - processes transcript jobs from Redis (transcript_jobs queue).
Downloads audio only (yt-dlp -x), transcribes with Whisper API + optional AssemblyAI speaker diarization.
Reports to backend POST /api/transcript/:jobId/complete.

ENV (ai-worker/.env):
  BACKEND_URL       - e.g. http://localhost:3333
  OPENAI_API_KEY    - for Whisper API
  ASSEMBLYAI_API_KEY - for AssemblyAI speaker diarization (assemblyai.com)
  REDIS_HOST       - default localhost
  REDIS_PORT       - default 6379

RUN:
  cd ai-worker
  pip install -r requirements.txt
  py -3.11 transcript_worker.py
"""

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

import json
import logging
import os
import sys
import uuid

import redis
import requests

from download import download_video
from transcribe_speakers import transcribe_with_speakers

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3333")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

QUEUE_NAME = "transcript_jobs"
WAIT_LIST_KEY = f"bull:{QUEUE_NAME}:wait"


def get_job_data_key(job_id: str) -> str:
    return f"bull:{QUEUE_NAME}:{job_id}"


def _report_status(job_id: str, status: str, error: str | None = None) -> None:
    try:
        resp = requests.post(
            f"{BACKEND_URL.rstrip('/')}/api/transcript/{job_id}/status",
            json={"status": status, **({"error": error} if error else {})},
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        if not resp.ok:
            logger.warning("Status update failed: %s %s", resp.status_code, resp.text)
    except Exception as e:
        logger.warning("Could not report status: %s", e)


def _report_complete(
    job_id: str,
    segments: list[dict],
    video_url: str,
    video_title: str,
    speaker_separation: bool = True,
    note: str | None = None,
) -> None:
    try:
        payload = {
            "status": "completed",
            "segments": segments,
            "video_url": video_url,
            "video_title": video_title,
            "speaker_separation": speaker_separation,
        }
        if note:
            payload["note"] = note
        resp = requests.post(
            f"{BACKEND_URL.rstrip('/')}/api/transcript/{job_id}/complete",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        if not resp.ok:
            logger.warning("Complete update failed: %s %s", resp.status_code, resp.text)
    except Exception as e:
        logger.warning("Could not report completion: %s", e)


def process_transcript_job(redis_client: redis.Redis, job_id: str) -> None:
    job_key = get_job_data_key(job_id)
    data_json = redis_client.hget(job_key, "data")

    if not data_json:
        logger.warning("Transcript job %s has no data, skipping", job_id)
        _report_status(job_id, "failed", error="Job has no data")
        return

    try:
        payload = json.loads(data_json)
    except json.JSONDecodeError as e:
        logger.error("Invalid JSON for job %s: %s", job_id, e)
        _report_status(job_id, "failed", error=f"Invalid JSON: {e}")
        return

    video_url = payload.get("video_url")
    if not video_url:
        _report_status(job_id, "failed", error="Missing video_url")
        return

    language = payload.get("language", "en")
    speaker_separation = payload.get("speaker_separation", True)
    video_title = payload.get("video_title", "Untitled")

    audio_id = str(uuid.uuid4())[:8]

    try:
        _report_status(job_id, "downloading")
        logger.info("Downloading audio only: %s", video_url)
        audio_path = download_video(video_url, audio_id, audio_only=True)

        _report_status(job_id, "transcribing")
        logger.info("Transcribing with speakers=%s", speaker_separation)

        result = transcribe_with_speakers(
            audio_path,
            language=language,
            speaker_separation=speaker_separation,
        )
        segments = result["segments"]
        note = result.get("note")

        # Debug: log transcript result
        if segments:
            first_text = segments[0].get("text", "")[:200]
            logger.info("[DEBUG] Transcript after pipeline: %d segments, first segment: %r", len(segments), first_text)
        else:
            logger.info("[DEBUG] Transcript after pipeline: 0 segments")

        _report_complete(
            job_id, segments, video_url, video_title, speaker_separation, note=note
        )
        logger.info("Transcript complete: %s segments", len(segments))

    except Exception as e:
        logger.exception("Transcript job %s failed: %s", job_id, e)
        _report_status(job_id, "failed", error=str(e))


def run_worker() -> None:
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    logger.info("Transcript worker started, listening on %s", WAIT_LIST_KEY)

    while True:
        try:
            result = redis_client.blpop(WAIT_LIST_KEY, timeout=0)
            if result is None:
                continue
            _list_name, job_id = result
            logger.info("Transcript job received: %s", job_id)
            process_transcript_job(redis_client, job_id)
        except redis.ConnectionError as e:
            logger.error("Redis connection error: %s", e)
        except KeyboardInterrupt:
            logger.info("Transcript worker stopped.")
            break
        except Exception as e:
            logger.exception("Error processing transcript job: %s", e)


if __name__ == "__main__":
    run_worker()
