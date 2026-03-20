"""
Transcript worker - processes transcript jobs from Redis (transcript_jobs queue).
Downloads video, extracts audio, transcribes with optional speaker diarization.
Reports to backend POST /api/transcript/:jobId/complete.
"""

import json
import logging
import os
import sys
import uuid
from pathlib import Path

import redis
import requests
from dotenv import load_dotenv

from download import download_video
from transcribe_speakers import transcribe_with_speakers

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3333")

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
) -> None:
    try:
        resp = requests.post(
            f"{BACKEND_URL.rstrip('/')}/api/transcript/{job_id}/complete",
            json={
                "status": "completed",
                "segments": segments,
                "video_url": video_url,
                "video_title": video_title,
                "speaker_separation": speaker_separation,
            },
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

    video_id = str(uuid.uuid4())[:8]

    try:
        _report_status(job_id, "downloading")
        logger.info("Downloading video: %s", video_url)
        video_path = download_video(video_url, video_id)

        _report_status(job_id, "transcribing")
        from transcribe import extract_audio

        audio_path = extract_audio(video_path, video_id)
        logger.info("Transcribing with speakers=%s", speaker_separation)

        segments = transcribe_with_speakers(
            audio_path,
            language=language,
            speaker_separation=speaker_separation,
        )

        _report_complete(job_id, segments, video_url, video_title, speaker_separation)
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
