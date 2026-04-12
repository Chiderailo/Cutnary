"""
AI Voice Explainer: Gemini analyzes video → generates script → TTS voiceover → FFmpeg merge.
"""

import os
import subprocess
import time
import logging
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)

STYLE_PROMPTS = {
    "commentary": "You are an engaging sports/entertainment commentator. Describe what's happening in this video with energy and excitement. Keep it under 60 seconds when spoken.",
    "educational": "You are an educational content creator. Explain what's happening in this video in a clear, informative way. Add interesting facts. Keep it under 60 seconds when spoken.",
    "funny": "You are a comedian. Write a funny commentary about what's happening in this video. Be witty and entertaining. Keep it under 60 seconds when spoken.",
    "dramatic": "You are a dramatic narrator. Narrate what's happening in this video with dramatic flair and emotion. Keep it under 60 seconds when spoken.",
    "news": "You are a news anchor. Report on what's happening in this video in a professional news style. Keep it under 60 seconds when spoken.",
}

def analyze_video_with_gemini(video_path: str, style: str = "commentary") -> str:
    """
    Use Gemini 1.5 Pro to analyze video and generate explainer script.
    style options: commentary, educational, funny, dramatic, news
    """
    import google.generativeai as genai

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is required")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-pro")

    print(f"[EXPLAINER] Uploading video to Gemini: {video_path}")
    video_file = genai.upload_file(video_path)

    while video_file.state.name == "PROCESSING":
        time.sleep(2)
        video_file = genai.get_file(video_file.name)

    prompt_base = STYLE_PROMPTS.get(style, STYLE_PROMPTS["commentary"])
    prompt = f"""{prompt_base}

Write ONLY the spoken script, no stage directions, no timestamps.
Make it engaging and suitable for social media.
Maximum 150 words."""

    response = model.generate_content([video_file, prompt])
    script = response.text.strip()

    print(f"[EXPLAINER] Generated script ({len(script)} chars): {script[:100]}...")
    return script


def generate_voiceover(script: str, output_path: str, voice_name: str = "en-US-Neural2-J") -> str:
    """
    Use Google Cloud TTS REST API to generate voiceover from script.
    Uses GOOGLE_API_KEY for auth (same key can work if TTS API is enabled in the project).
    """
    import base64
    import requests

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is required")

    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}"
    payload = {
        "input": {"text": script},
        "voice": {
            "languageCode": "en-US",
            "name": voice_name,
        },
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": 1.1,
            "pitch": 0.0,
        },
    }

    resp = requests.post(url, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    audio_b64 = data.get("audioContent")
    if not audio_b64:
        raise ValueError("No audioContent in TTS response")

    with open(output_path, "wb") as f:
        f.write(base64.b64decode(audio_b64))

    print(f"[EXPLAINER] Voiceover saved: {output_path}")
    return output_path


def merge_voiceover_with_video(
    video_path: str,
    voiceover_path: str,
    output_path: str,
    original_audio_volume: float = 0.2,
) -> str:
    """
    Merge AI voiceover with video using FFmpeg.
    Lowers original audio and adds voiceover on top.
    """
    command = [
        "ffmpeg",
        "-y",
        "-i",
        video_path,
        "-i",
        voiceover_path,
        "-filter_complex",
        f"[0:a]volume={original_audio_volume}[original];"
        f"[1:a]volume=1.0[voice];"
        f"[original][voice]amix=inputs=2:duration=first[aout]",
        "-map",
        "0:v",
        "-map",
        "[aout]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
        output_path,
    ]

    subprocess.run(command, check=True)
    print(f"[EXPLAINER] Final video saved: {output_path}")
    return output_path


def create_voice_explainer(
    video_path: str,
    output_path: str,
    style: str = "commentary",
    voice_name: str = "en-US-Neural2-J",
    original_audio_volume: float = 0.2,
) -> dict:
    """
    Full pipeline: video -> Gemini analysis -> TTS -> merge
    Returns: { "output_path": str, "script": str }
    """
    script = analyze_video_with_gemini(video_path, style)

    p = Path(output_path)
    voiceover_path = str(p.parent / (p.stem + "_voice.mp3"))
    generate_voiceover(script, voiceover_path, voice_name)

    merge_voiceover_with_video(
        video_path,
        voiceover_path,
        output_path,
        original_audio_volume,
    )

    if os.path.exists(voiceover_path):
        os.remove(voiceover_path)

    return {
        "output_path": output_path,
        "script": script,
    }
