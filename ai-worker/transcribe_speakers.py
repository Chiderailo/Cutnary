"""
Transcribe video with speaker diarization using Whisper API + AssemblyAI.
Returns segments with speaker labels and word-level timestamps.
Adds punctuation restoration via OpenAI.
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from transcribe import get_word_timestamps, get_openai_client
from speaker_diarization import diarize, assign_speakers_to_words, group_by_speaker

load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)


def add_punctuation(text: str, language: str = "en") -> str:
    """Add proper punctuation and capitalization to transcript using OpenAI."""
    if not text or not text.strip():
        return text
    try:
        client = get_openai_client()
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=f"""Add proper punctuation, capitalization and line breaks to this transcript.
Keep all the words exactly the same - only add punctuation.
Add periods, commas, question marks where appropriate.
Start new paragraphs for topic changes or long pauses.
Language: {language}

Transcript:
{text}

Return ONLY the punctuated text, nothing else."""
        )
        result = response.output_text
        return result.strip() if result else text
    except Exception as e:
        logger.exception("Punctuation restoration failed: %s", e)
        return text


def _apply_punctuation_to_segments(segments: list[dict], language: str) -> list[dict]:
    """Apply punctuation to each segment's text."""
    print(f"[PUNCTUATION] Applying to {len(segments)} segments")
    for seg in segments:
        if seg.get("text"):
            seg["text"] = add_punctuation(seg["text"], language=language)
    return segments


def transcribe_with_speakers(
    audio_path: str,
    language: str = "en",
    speaker_separation: bool = True,
) -> dict:
    """
    Transcribe audio with optional speaker diarization.

    Returns dict: { "segments": [...], "note": "..."? }
    Segments:
    [
      {
        "speaker": "Speaker 1",
        "start": 0.0,
        "end": 5.2,
        "text": "Welcome to the show...",
        "words": [{"word": "Welcome", "start": 0.0, "end": 0.4, "speaker": "Speaker 1"}]
      },
      ...
    ]
    """
    words = get_word_timestamps(audio_path, language=language)
    if not words:
        return {
            "segments": [{"speaker": "Speaker 1", "start": 0.0, "end": 0.0, "text": "", "words": []}],
            "note": None,
        }

    note = None
    if speaker_separation and os.getenv("ASSEMBLYAI_API_KEY"):
        try:
            speaker_segments = diarize(audio_path)
            print(f"[DIARIZATION] Found {len(speaker_segments)} speaker segments")
            print(f"[DIARIZATION] Speakers found: {set(s['speaker'] for s in speaker_segments)}")
            if not speaker_segments:
                for w in words:
                    w["speaker"] = "Speaker 1"
                segments, _ = group_by_speaker(words)
            else:
                words_with_speakers = assign_speakers_to_words(words, speaker_segments)
                segments, diar_note = group_by_speaker(words_with_speakers)
                if diar_note:
                    note = diar_note
        except Exception as e:
            logger.warning("Speaker diarization failed, using single speaker: %s", e)
            for w in words:
                w["speaker"] = "Speaker 1"
            segments, _ = group_by_speaker(words)
    else:
        for w in words:
            w["speaker"] = "Speaker 1"
        segments, _ = group_by_speaker(words)

    # Debug: raw transcript before punctuation
    if segments:
        raw_preview = segments[0].get("text", "")[:100] if segments else "none"
        logger.info("Applying punctuation to %d segments. Raw first segment: %r", len(segments), raw_preview)
    else:
        logger.info("Applying punctuation to 0 segments")

    segments = _apply_punctuation_to_segments(segments, language)

    # Debug: after punctuation
    if segments:
        logger.info("Punctuation applied. First segment: %s", segments[0].get("text", "")[:100] if segments else "none")
    else:
        logger.info("Punctuation applied. No segments.")

    return {"segments": segments, "note": note}
