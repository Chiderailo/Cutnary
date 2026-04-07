import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from api_utils import call_with_retry, rate_limited_call

load_dotenv(Path(__file__).parent / ".env")
logger = logging.getLogger(__name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_title(transcript):
    prompt = f"""
Create a viral short-form video title
and caption for this transcript.

Transcript:
{transcript}
"""
    def _call():
        return rate_limited_call(
            lambda: client.responses.create(
                model="gpt-4.1-mini",
                input=prompt
            )
        )
    response = call_with_retry(_call)
    return response.output_text


def generate_viral_description(transcript_segment: str) -> str:
    """
    Generate a punchy viral caption for a clip (max 80 chars).
    Uses curiosity gap, emotion, or shock value. No hashtags, no quotes.
    """
    prompt = f"""You are a viral social media expert for TikTok/Reels/Shorts.
Given this video transcript segment, write ONE punchy viral caption (max 80 chars).
Make it a hook - use curiosity gap, emotion, or shock value.
NO hashtags. NO quotes. Just the caption text.

Transcript: {transcript_segment}

Examples of good captions:
- "Nobody talks about this but it changes everything..."
- "Wait til you hear what happens next"
- "This is why you're stuck and don't even know it"
- "The truth they don't want you to know"

Return ONLY the caption, nothing else."""

    def _call():
        return rate_limited_call(
            lambda: client.responses.create(
                model="gpt-4.1-mini",
                input=prompt,
            )
        )

    try:
        response = call_with_retry(_call)
        return (response.output_text or "").strip()[:80] or transcript_segment[:80] or "Watch this"
    except Exception as e:
        logger.warning("Viral description API failed: %s", e)
        return transcript_segment[:80] or "Watch this"


def generate_viral_caption(transcript: str, emotion_score: float | None = None) -> str:
    """
    Generate a viral, engaging caption for a clip based on transcript and hooks.
    Delegates to generate_viral_description for consistency.
    """
    return generate_viral_description(transcript)


def batch_viral_descriptions_and_scores(segments_data: list[dict]) -> list[dict]:
    """
    Single OpenAI call for all segments: returns viral_description and score per segment.
    Reduces N*2 calls down to 1 call.
    """
    if not segments_data:
        return []

    def _call():
        return rate_limited_call(
            lambda: client.responses.create(
                model="gpt-4.1-mini",
                input=_build_batch_prompt(segments_data),
            )
        )

    try:
        response = call_with_retry(_call)
        return _parse_batch_response(response, segments_data)
    except Exception as e:
        logger.warning("Batch viral descriptions failed: %s. Using fallbacks.", e)
        return [
            {"index": i, "viral_description": s.get("transcript", "")[:80] or "Watch this", "score": 50}
            for i, s in enumerate(segments_data)
        ]


def _build_batch_prompt(segments_data: list[dict]) -> str:
    return f'''For each of these {len(segments_data)} video segments, provide:
1. A viral social media caption (max 80 chars, curiosity-driven)
2. An engagement score (0-100)

Segments:
{json.dumps(segments_data, indent=2)}

Return ONLY a JSON array, no other text:
[
  {{"index": 0, "viral_description": "...", "score": 85}},
  {{"index": 1, "viral_description": "...", "score": 72}}
]'''


def _parse_batch_response(response, segments_data: list[dict]) -> list[dict]:
    text = (response.output_text or "").strip()
    if not text:
        return _fallback_results(segments_data)
    try:
        # Extract JSON array if wrapped in markdown
        if "```" in text:
            text = text.split("```")[1].replace("json", "").strip()
        arr = json.loads(text)
        if not isinstance(arr, list):
            return _fallback_results(segments_data)
        # Index by segment index
        by_index = {int(item.get("index", i)): item for i, item in enumerate(arr)}
        result = []
        for i, s in enumerate(segments_data):
            item = by_index.get(i, {})
            result.append({
                "index": i,
                "viral_description": (item.get("viral_description") or s.get("transcript", "")[:80] or "Watch this")[:80],
                "score": int(item.get("score", 50)) if isinstance(item.get("score"), (int, float)) else 50,
            })
        return result
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning("Failed to parse batch response: %s", e)
        return _fallback_results(segments_data)


def _fallback_results(segments_data: list[dict]) -> list[dict]:
    return [
        {"index": i, "viral_description": s.get("transcript", "")[:80] or "Watch this", "score": 50}
        for i, s in enumerate(segments_data)
    ]