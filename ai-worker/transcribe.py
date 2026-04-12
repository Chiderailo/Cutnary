import hashlib
import json
import logging
import os
import subprocess
from pathlib import Path

from openai import OpenAI
from dotenv import load_dotenv

from api_utils import call_with_retry, rate_limited_call
from storage_paths import audio_dir, cache_dir, ensure_storage_dirs

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


def get_cache_key(audio_path: str, language: str = "en") -> str:
    with open(audio_path, "rb") as f:
        return hashlib.md5(f.read(8192) + language.encode()).hexdigest()


def get_openai_client():
    load_dotenv(Path(__file__).parent / ".env")
    return OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        timeout=120.0,  # 2 minute timeout
        max_retries=5   # retry 5 times
    )


def extract_audio(video_path, video_id):
    ensure_storage_dirs()
    ad = audio_dir()
    ad.mkdir(parents=True, exist_ok=True)

    audio_path = str(ad / f"{video_id}.mp3")

    command = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "libmp3lame",
        "-ab", "64k",
        audio_path
    ]

    subprocess.run(command, check=True)

    return audio_path


def transcribe_audio(audio_path, language="en"):
    ensure_storage_dirs()
    cd = cache_dir()
    cd.mkdir(parents=True, exist_ok=True)
    cache_key = get_cache_key(audio_path, language)
    cache_file = str(cd / f"{cache_key}_transcript.json")

    if os.path.exists(cache_file):
        logger.info("Using cached transcript for %s", os.path.basename(audio_path))
        with open(cache_file) as f:
            return json.load(f)["text"]

    client = get_openai_client()

    def _call():
        def _do_transcribe():
            with open(audio_path, "rb") as audio_file:
                return client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=language
                )
        return rate_limited_call(_do_transcribe)

    transcript = call_with_retry(_call)
    result = transcript.text

    with open(cache_file, "w") as f:
        json.dump({"text": result}, f)

    return result


def get_word_timestamps(audio_path, language="en"):
    client = get_openai_client()

    def _call():
        def _do_transcribe():
            with open(audio_path, "rb") as audio_file:
                return client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=language,
                    response_format="verbose_json",
                    timestamp_granularities=["word"]
                )
        return rate_limited_call(_do_transcribe)

    transcript = call_with_retry(_call)

    words = []
    if hasattr(transcript, 'words') and transcript.words:
        for w in transcript.words:
            words.append({
                "word": w.word,
                "start": w.start,
                "end": w.end
            })
    return words