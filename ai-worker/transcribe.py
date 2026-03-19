import subprocess
import requests
import os

API_KEY = "YOUR_API_KEY"

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


def transcribe_audio(audio_path):

    url = "https://api.openai.com/v1/audio/transcriptions"

    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    files = {
        "file": open(audio_path, "rb"),
        "model": (None, "whisper-1")
    }

    response = requests.post(url, headers=headers, files=files)

    return response.json()["text"]


def get_word_timestamps(audio_path):

    url = "https://api.openai.com/v1/audio/transcriptions"

    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    files = {
        "file": open(audio_path, "rb"),
        "model": (None, "whisper-1"),
        "response_format": (None, "verbose_json"),
        "timestamp_granularities[]": (None, "word")
    }

    response = requests.post(url, headers=headers, files=files)

    data = response.json()

    words = []

    for segment in data["segments"]:
        words.extend(segment["words"])

    return words