"""
Transcribe video with speaker diarization using Whisper + pyannote.audio.
Returns segments with speaker labels and word-level timestamps.
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from transcribe import extract_audio, get_word_timestamps

load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)

HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN")


def _speaker_for_time(diarization, start: float, end: float) -> str | None:
    """Find the speaker with most overlap for a time range. Returns Speaker N or None."""
    word_mid = (start + end) / 2
    best_speaker = None
    best_overlap = 0.0

    for segment, _, speaker in diarization.itertracks(yield_label=True):
        seg_start = segment.start
        seg_end = segment.end
        overlap_start = max(start, seg_start)
        overlap_end = min(end, seg_end)
        if overlap_end > overlap_start:
            overlap = overlap_end - overlap_start
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = speaker

    if best_speaker is None:
        for segment, _, speaker in diarization.itertracks(yield_label=True):
            if segment.start <= word_mid <= segment.end:
                return speaker
    return best_speaker


def _speaker_to_display(speaker: str, speaker_map: dict[str, str]) -> str:
    """Convert SPEAKER_00 to Speaker 1, etc."""
    if speaker in speaker_map:
        return speaker_map[speaker]
    num = 1
    for s in speaker_map:
        if s.startswith("SPEAKER_") and s != speaker:
            num += 1
    idx = 1
    try:
        idx = int(speaker.split("_")[-1]) + 1
    except (ValueError, IndexError):
        idx = len(speaker_map) + 1
    label = f"Speaker {idx}"
    speaker_map[speaker] = label
    return label


def transcribe_with_speakers(
    audio_path: str,
    language: str = "en",
    speaker_separation: bool = True,
) -> list[dict]:
    """
    Transcribe audio with optional speaker diarization.

    Returns list of segments:
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
        return [{"speaker": "Speaker 1", "start": 0.0, "end": 0.0, "text": "", "words": []}]

    speaker_map: dict[str, str] = {}

    if speaker_separation and HUGGINGFACE_TOKEN:
        try:
            from pyannote.audio import Pipeline

            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=HUGGINGFACE_TOKEN,
            )
            diarization = pipeline(audio_path)

            for w in words:
                start = float(w.get("start", w.get("start_time", 0)))
                end = float(w.get("end", w.get("end_time", start)))
                sp = _speaker_for_time(diarization, start, end)
                w["_speaker"] = _speaker_to_display(sp or "SPEAKER_00", speaker_map)
        except Exception as e:
            logger.warning("Speaker diarization failed, using single speaker: %s", e)
            for w in words:
                w["_speaker"] = "Speaker 1"
    else:
        for w in words:
            w["_speaker"] = "Speaker 1"

    segments: list[dict] = []
    current_speaker = None
    current_words: list[dict] = []
    seg_start = 0.0
    seg_end = 0.0

    for w in words:
        start = float(w.get("start", w.get("start_time", 0)))
        end = float(w.get("end", w.get("end_time", start)))
        speaker = w.get("_speaker", "Speaker 1")
        word_text = (w.get("word") or "").strip()

        word_obj = {"word": word_text, "start": round(start, 3), "end": round(end, 3), "speaker": speaker}

        if speaker != current_speaker:
            if current_words:
                segments.append({
                    "speaker": current_speaker,
                    "start": round(seg_start, 3),
                    "end": round(seg_end, 3),
                    "text": " ".join(x["word"] for x in current_words),
                    "words": current_words,
                })
            current_speaker = speaker
            current_words = [word_obj]
            seg_start = start
            seg_end = end
        else:
            current_words.append(word_obj)
            seg_end = end

    if current_words:
        segments.append({
            "speaker": current_speaker,
            "start": round(seg_start, 3),
            "end": round(seg_end, 3),
            "text": " ".join(x["word"] for x in current_words),
            "words": current_words,
        })

    return segments
