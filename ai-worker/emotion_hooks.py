import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from api_utils import call_with_retry, rate_limited_call

load_dotenv(Path(__file__).parent / ".env")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _clip_length_to_seconds(clip_length: str) -> tuple[float, float]:
    mapping = {
        "auto": (20, 90),
        "<30s": (10, 30),
        "30-60s": (30, 60),
        "60-90s": (60, 90),
        "90-3min": (90, 180),
        ">3min": (180, 600),
    }
    return mapping.get(clip_length, (20, 90))


def detect_emotional_hooks(
    transcript: str, video_duration: float = 60.0, clip_length: str = "auto"
):
    min_dur, max_dur = _clip_length_to_seconds(clip_length)
    min_clips = max(3, int(video_duration / 60))

    print(f"[HOOKS] Video duration: {video_duration:.0f}s, expecting min {min_clips} clips")
    print(f"[HOOKS] Transcript length: {len(transcript)} chars")

    system_prompt = """You are a viral social media content expert who has 
helped grow channels to millions of followers. You find EVERY clip-worthy 
moment without exception. You are thorough and never miss a moment.
You always return valid JSON only."""

    user_prompt = f"""Find every single clip-worthy moment in this {video_duration:.0f} second video transcript.

WHAT MAKES A GOOD CLIP (find ALL of these):
- Funny moments, jokes, reactions, awkward situations
- Surprising facts or shocking revelations
- Emotional moments - heartwarming, sad, touching
- Relatable situations everyone understands  
- Controversial or debate-worthy opinions
- Useful tips or valuable information
- Great storytelling with a clear arc
- Unexpected twists in conversation
- Strong reactions and responses
- Inspiring or motivational statements
- Casual but entertaining dialogue
- ANY moment that would make someone stop scrolling

RULES:
- Clip duration: {min_dur:.0f}-{max_dur:.0f} seconds each
- Start 2 seconds BEFORE the interesting moment
- End 2 seconds AFTER it concludes
- Clips must NOT overlap
- For a {video_duration:.0f}s video find AT LEAST {min_clips} clips
- More clips is ALWAYS better - never return less than {min_clips}
- Every minute of content has at least one good moment

TRANSCRIPT:
{transcript}

Return ONLY a valid JSON array with no other text before or after:
[
  {{
    "start": 0.0,
    "end": 35.0,
    "description": "Why this is viral-worthy"
  }}
]"""

    def _call():
        return rate_limited_call(
            lambda: client.responses.create(
                model="gpt-4.1",
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_output_tokens=4000
            )
        )

    response = call_with_retry(_call)
    text = response.output_text.strip()

    print(f"[HOOKS] Raw GPT response ({len(text)} chars):")
    print(text[:1000])

    # Try multiple JSON extraction methods
    segments = None

    # Method 1: Direct parse
    try:
        segments = json.loads(text)
    except Exception:
        pass

    # Method 2: Extract JSON array with regex
    if not segments:
        try:
            match = re.search(r'\[[\s\S]*\]', text)
            if match:
                segments = json.loads(match.group())
        except Exception:
            pass

    # Method 3: Extract from code block
    if not segments:
        try:
            match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
            if match:
                segments = json.loads(match.group(1))
        except Exception:
            pass

    if not segments:
        print(f"[HOOKS] ERROR: Could not parse GPT response as JSON!")
        print(f"[HOOKS] Full response was: {text}")
        # Generate evenly spaced clips as fallback
        segments = []
        clip_dur = min(max_dur, 60)
        t = 5.0
        while t + clip_dur < video_duration:
            segments.append({
                "start": t,
                "end": t + clip_dur,
                "description": "Auto-generated clip"
            })
            t += clip_dur + 5
        print(f"[HOOKS] Using fallback: {len(segments)} evenly spaced clips")

    # Add emotion_score if missing
    for s in segments:
        if "emotion_score" not in s:
            s["emotion_score"] = 70
        # Clamp to video duration
        s["start"] = max(0, float(s.get("start", 0)))
        s["end"] = min(video_duration, float(s.get("end", s["start"] + 30)))

    # Remove clips that are too short
    segments = [s for s in segments if s["end"] - s["start"] >= min_dur * 0.5]

    print(f"[HOOKS] Final: {len(segments)} clips found")
    for i, s in enumerate(segments):
        print(f"[HOOKS] Clip {i+1}: {s['start']:.1f}s-{s['end']:.1f}s ({s['end']-s['start']:.0f}s) - {s.get('description','')[:60]}")

    return segments