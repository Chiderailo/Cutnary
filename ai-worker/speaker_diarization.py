"""
Speaker diarization using AssemblyAI.
Assigns speaker labels to words and groups into segments.
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)


def diarize(audio_path: str, hf_token: str = None) -> list[dict]:
    """
    Use AssemblyAI for speaker diarization.
    Returns list of {speaker, start, end} segments.
    Falls back to single speaker if ASSEMBLYAI_API_KEY not set.
    """
    import assemblyai as aai

    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        return []

    try:
        aai.settings.api_key = api_key

        config = aai.TranscriptionConfig(
            speaker_labels=True,
            speech_models=[aai.SpeechModel.universal]
        )

        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(audio_path, config=config)

        if transcript.status == aai.TranscriptStatus.error:
            raise Exception(f"AssemblyAI error: {transcript.error}")

        segments = []
        for utterance in transcript.utterances:
            segments.append({
                "speaker": f"SPEAKER_{utterance.speaker}",
                "start": round(utterance.start / 1000, 3),
                "end": round(utterance.end / 1000, 3)
            })

        return segments

    except Exception as e:
        logger.warning("AssemblyAI diarization failed: %s", e)
        return []


def assign_speakers_to_words(
    words: list[dict],
    speaker_segments: list[dict],
) -> list[dict]:
    """
    For each word, find which speaker segment it falls in.
    Returns words with speaker field added.
    Words can have "start"/"end" or "start_time"/"end_time".
    """
    result = []
    for w in words:
        start = float(w.get("start", w.get("start_time", 0)))
        end = float(w.get("end", w.get("end_time", start)))
        word_mid = (start + end) / 2

        speaker = None
        best_overlap = 0.0

        for seg in speaker_segments:
            seg_start = seg["start"]
            seg_end = seg["end"]
            overlap_start = max(start, seg_start)
            overlap_end = min(end, seg_end)
            if overlap_end > overlap_start:
                overlap = overlap_end - overlap_start
                if overlap > best_overlap:
                    best_overlap = overlap
                    speaker = seg["speaker"]

        if speaker is None:
            for seg in speaker_segments:
                if seg["start"] <= word_mid <= seg["end"]:
                    speaker = seg["speaker"]
                    break
            if speaker is None and speaker_segments:
                speaker = speaker_segments[0]["speaker"]

        out = dict(w)
        out["speaker"] = speaker or "SPEAKER_00"
        result.append(out)
    return result


def _speaker_to_display(speaker: str, speaker_map: dict[str, str]) -> str:
    """Convert SPEAKER_00 to Speaker 1, etc."""
    if speaker in speaker_map:
        return speaker_map[speaker]
    try:
        idx = int(speaker.split("_")[-1]) + 1
    except (ValueError, IndexError):
        idx = len(speaker_map) + 1
    label = f"Speaker {idx}"
    speaker_map[speaker] = label
    return label


def group_by_speaker(words_with_speakers: list[dict]) -> tuple[list[dict], str | None]:
    """
    Group consecutive words with same speaker into segments.
    Returns (segments, note). Note is set when only 1 speaker detected.
    Segments: list of {speaker, start, end, text, words}.
    Converts SPEAKER_00 -> Speaker 1 for display.
    """
    if not words_with_speakers:
        return [], None

    speaker_map: dict[str, str] = {}
    segments: list[dict] = []
    current_speaker = None
    current_words: list[dict] = []
    seg_start = 0.0
    seg_end = 0.0

    for w in words_with_speakers:
        start = float(w.get("start", w.get("start_time", 0)))
        end = float(w.get("end", w.get("end_time", start)))
        raw_speaker = w.get("speaker", "SPEAKER_00")
        display_speaker = _speaker_to_display(raw_speaker, speaker_map)
        word_text = (w.get("word") or "").strip()

        word_obj = {
            "word": word_text,
            "start": round(start, 3),
            "end": round(end, 3),
            "speaker": display_speaker,
        }

        if display_speaker != current_speaker:
            if current_words:
                segments.append({
                    "speaker": current_speaker,
                    "start": round(seg_start, 3),
                    "end": round(seg_end, 3),
                    "text": " ".join(x["word"] for x in current_words),
                    "words": current_words,
                })
            current_speaker = display_speaker
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

    note = None
    if len(speaker_map) <= 1:
        note = (
            "Only one speaker detected. Speaker separation works best for spoken content "
            "like podcasts and interviews, not music."
        )

    return segments, note
