import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).parent / ".env")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _clip_length_to_seconds(clip_length: str) -> tuple[float, float]:
    """Map clip_length to (min_sec, max_sec) for segment duration."""
    mapping = {
        "auto": (20, 90),
        "<30s": (10, 30),
        "30-60s": (30, 60),
        "60-90s": (60, 90),
        "90-3min": (90, 180),
        ">3min": (180, 600),
    }
    return mapping.get(clip_length, (20, 90))


def _filter_segments_by_duration(segments: list[dict], min_dur: float, max_dur: float) -> list[dict]:
    """Filter segments to match duration. If none pass, adjust closest ones to fit."""
    out = [s for s in segments if min_dur <= (s.get("end", 0) - s.get("start", 0)) <= max_dur]
    if out:
        return out
    if not segments:
        return []
    adjusted = []
    for s in segments:
        start = s.get("start", 0)
        end = s.get("end", 0)
        dur = end - start
        if dur > max_dur:
            adjusted.append({**s, "end": start + max_dur})
        elif dur < min_dur:
            adjusted.append({**s, "end": start + min_dur})
        else:
            adjusted.append(s)
    return adjusted


def detect_emotional_hooks(
    transcript: str, video_duration: float = 60.0, clip_length: str = "auto"
):
    min_dur, max_dur = _clip_length_to_seconds(clip_length)
    target_duration = (min_dur + max_dur) / 2
    num_clips = max(3, min(10, int(video_duration / target_duration)))

    prompt = f"""Analyze this transcript and identify {num_clips} viral moments.

Score each segment using:
- emotional intensity
- curiosity
- surprise
- storytelling hook

Each segment MUST be {min_dur}-{max_dur} seconds long (end minus start).
Return ONLY a JSON array with exactly {num_clips} objects like:
[
  {{"start":10,"end":20,"emotion_score":92}},
  {{"start":35,"end":48,"emotion_score":88}}
]

Transcript:
{transcript}
"""

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    text = response.output_text

    try:
        segments = json.loads(text)
        return _filter_segments_by_duration(segments, min_dur, max_dur)
    except Exception:
        return [{"start": 5, "end": min(5 + max_dur, 30), "emotion_score": 70}]