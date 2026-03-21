import logging
import os
import subprocess
from pathlib import Path

from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

AUDIO_DIR = "../storage/audio"


def get_openai_client():
    load_dotenv(Path(__file__).parent / ".env")
    return OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        timeout=120.0,  # 2 minute timeout
        max_retries=5   # retry 5 times
    )


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
    client = get_openai_client()

    with open(audio_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=language
        )
    return transcript.text


def get_word_timestamps(audio_path, language="en"):
    client = get_openai_client()

    with open(audio_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=language,
            response_format="verbose_json",
            timestamp_granularities=["word"]
        )

    words = []
    if hasattr(transcript, 'words') and transcript.words:
        for w in transcript.words:
            words.append({
                "word": w.word,
                "start": w.start,
                "end": w.end
            })
    return words