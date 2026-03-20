import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).parent / ".env")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_title(transcript):
    prompt = f"""
Create a viral short-form video title
and caption for this transcript.

Transcript:
{transcript}
"""
    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )
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
- "Wait til you hear what happens next 👀"
- "This is why you're stuck and don't even know it"
- "The truth they don't want you to know"

Return ONLY the caption, nothing else."""

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )
        return (response.output_text or "").strip()[:80] or transcript_segment[:80] or "Watch this 👀"
    except Exception:
        return transcript_segment[:80] or "Watch this 👀"


def generate_viral_caption(transcript: str, emotion_score: float | None = None) -> str:
    """
    Generate a viral, engaging caption for a clip based on transcript and hooks.
    Delegates to generate_viral_description for consistency.
    """
    return generate_viral_description(transcript)