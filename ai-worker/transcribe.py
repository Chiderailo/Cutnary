import logging
import os
import subprocess
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

API_KEY = os.getenv("OPENAI_API_KEY")
AUDIO_DIR = "../storage/audio"


def extract_audio(video_path, video_id):

    os.makedirs(AUDIO_DIR, exist_ok=True)

    audio_path = f"{AUDIO_DIR}/{video_id}.mp3"

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
    """
    Transcribe audio using OpenAI Whisper API.
    language: ISO 639-1 code (e.g. "en", "es"). Default "en".
    """
    url = "https://api.openai.com/v1/audio/transcriptions"

    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    files = {
        "file": open(audio_path, "rb"),
        "model": (None, "whisper-1"),
        "language": (None, language or "en"),
    }

    response = requests.post(url, headers=headers, files=files)
    data = response.json()

    # OpenAI Whisper API returns {"text": "..."} for default format.
    # On error, it returns {"error": {"message": "...", "type": "..."}}.
    if "text" in data:
        return data["text"]

    if "error" in data:
        err = data["error"]
        msg = err.get("message", str(err))
        logger.error("OpenAI API error: %s", msg)
        raise RuntimeError(f"OpenAI Whisper API error: {msg}")

    # Log and print full response when structure is unexpected
    # (e.g. different Whisper API or local model with different format)
    print("Full API response (missing 'text' key):", data)
    logger.error(
        "Response missing 'text' key. Full response: %s",
        data,
    )
    raise KeyError(
        f"'text' not in API response. Keys received: {list(data.keys())}. "
        "Full response logged above. Check if using OpenAI API vs local Whisper model."
    )


def get_word_timestamps(audio_path, language="en"):
    """
    Get word-level timestamps using OpenAI Whisper API.
    language: ISO 639-1 code (e.g. "en", "es"). Default "en".
    """
    url = "https://api.openai.com/v1/audio/transcriptions"

    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    files = {
        "file": open(audio_path, "rb"),
        "model": (None, "whisper-1"),
        "response_format": (None, "verbose_json"),
        "timestamp_granularities[]": (None, "word"),
        "language": (None, language or "en"),
    }

    response = requests.post(url, headers=headers, files=files)
    data = response.json()

    # Whisper API with verbose_json + word timestamps returns words at data["words"]
    if "words" in data:
        return data["words"]

    # Fallback: some API versions return words nested in segments
    if "segments" in data:
        words = []
        for segment in data["segments"]:
            words.extend(segment.get("words", []))
        return words

    if "error" in data:
        err = data["error"]
        msg = err.get("message", str(err))
        logger.error("OpenAI API error in get_word_timestamps: %s", msg)
        raise RuntimeError(f"OpenAI Whisper API error: {msg}")

    # Neither "words" nor "segments" present - log for debugging
    print("Full API response keys (get_word_timestamps):", list(data.keys()))
    logger.error(
        "Response missing 'words' and 'segments'. Keys received: %s",
        list(data.keys()),
    )
    raise KeyError(
        f"'words' and 'segments' not in API response. Keys received: {list(data.keys())}. "
        "Full response keys printed above."
    )