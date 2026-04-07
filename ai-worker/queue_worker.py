"""
Queue worker that consumes video jobs from BullMQ via Redis using redis-py and BLPOP.

BullMQ stores jobs in Redis with these key patterns:
  - bull:video_jobs:wait      - LIST of job IDs waiting to be processed
  - bull:video_jobs:{job_id}  - HASH containing job data; field "data" = JSON payload

We use BLPOP on the wait list to block until a job is available, then fetch the job
payload from the hash and process it.

Rate limiting (0.5s between API calls) and retry with exponential backoff are handled
in api_utils.py - used by emotion_hooks, titles, engagement_model, transcribe.
"""

import json
import logging
import os
import sys
from pathlib import Path

import redis
from dotenv import load_dotenv

from worker import process_video

# Force UTF-8 console output on Windows to avoid charmap encode crashes.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

# Load config from .env
load_dotenv(Path(__file__).parent / ".env")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3333")

# BullMQ queue name and Redis key for the wait list
QUEUE_NAME = "video_jobs"
WAIT_LIST_KEY = f"bull:{QUEUE_NAME}:wait"


def get_job_data_key(job_id: str) -> str:
    """BullMQ stores each job as a hash: bull:queue_name:job_id"""
    return f"bull:{QUEUE_NAME}:{job_id}"


def process_job(redis_client: redis.Redis, job_id: str) -> None:
    """
    Fetch job payload from Redis and process the video.
    BullMQ stores the payload as JSON in the "data" field of the job hash.
    """
    job_key = get_job_data_key(job_id)
    data_json = redis_client.hget(job_key, "data")

    if not data_json:
        logger.warning("Job %s has no data field, skipping", job_id)
        return

    try:
        payload = json.loads(data_json)
    except json.JSONDecodeError as e:
        logger.error("Invalid JSON for job %s: %s", job_id, e)
        return

    raw_job_id = payload.get("job_id")
    if raw_job_id is None or raw_job_id == "":
        logger.error("Job %s has no job_id in payload: %s", job_id, payload)
        return

    db_job_id = str(raw_job_id)
    print(f"Full payload: {payload}")
    print(f"BullMQ ID: {job_id}, Database ID: {db_job_id}")

    video_url = payload.get("video_url")

    if not video_url:
        logger.error("Job %s has no video_url in payload: %s", job_id, payload)
        return

    # Settings from payload (top-level or nested in settings)
    settings = payload.get("settings") or {}
    aspect_ratio = payload.get("aspect_ratio") or settings.get("aspect_ratio") or "9:16"
    clip_length = payload.get("clip_length") or settings.get("clip_length") or "auto"
    language = settings.get("language") or payload.get("language") or "en"
    caption_style = settings.get("caption_style") or "simple"

    print(f"[WORKER] aspect_ratio={aspect_ratio}, clip_length={clip_length}")
    logger.info(
        "Processing video: %s (language=%s, aspect=%s, clip_length=%s)",
        video_url, language, aspect_ratio, clip_length
    )
    process_video(
        video_url,
        job_id=db_job_id,
        backend_url=BACKEND_URL,
        language=language,
        aspect_ratio=aspect_ratio,
        clip_length=clip_length,
        caption_style=caption_style,
    )
    logger.info("Completed job: %s (BullMQ: %s)", db_job_id, job_id)


def run_worker() -> None:
    """Main worker loop: BLPOP on wait list, parse job, process video."""
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

    logger.info("Worker started...")

    while True:
        try:
            # BLPOP blocks until a job ID appears in the wait list.
            # Returns (list_name, job_id) or None on timeout (we use 0 = block forever).
            result = redis_client.blpop(WAIT_LIST_KEY, timeout=0)

            if result is None:
                continue

            _list_name, job_id = result
            logger.info("Job received: %s", job_id)
            process_job(redis_client, job_id)

        except redis.ConnectionError as e:
            logger.error("Redis connection error: %s. Reconnecting...", e)
        except KeyboardInterrupt:
            logger.info("Worker stopped.")
            break
        except Exception as e:
            logger.exception("Error processing job: %s", e)


if __name__ == "__main__":
    run_worker()
