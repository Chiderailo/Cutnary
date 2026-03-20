"""
ASS subtitle generation for video clips.
Uses Whisper word timestamps for frame-accurate sync.
Per-segment ASS files are generated so subtitles stay in sync when clips are trimmed.
"""

import os

SUB_DIR = "../storage/subtitles"

# Style tuned for portrait (1080x1920): small font, bottom third, margins
# Alignment 2 = bottom center; MarginV = pixels from bottom; MarginL/R = horizontal margins
ASS_HEADER = """
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV
Style: Default,Arial,18,&H00FFFFFF,&H0000FFFF,&H00000000,1,2,0,2,40,40,80

[Events]
Format: Layer,Start,End,Style,Text
"""


def _seconds_to_ass(sec: float) -> str:
    """Convert seconds to ASS timestamp format H:M:S.cs"""
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h}:{m:02}:{s:05.2f}"


def _get_word_times(w: dict) -> tuple[float, float]:
    """Extract start/end from word dict (Whisper uses 'start'/'end')."""
    start = w.get("start", w.get("start_time", 0))
    end = w.get("end", w.get("end_time", start))
    return float(start), float(end)


def generate_karaoke_ass(video_id: str, words: list[dict]) -> str:
    """
    Generate ASS file for the full video (legacy/fallback).
    For clips, use generate_segment_ass() so timestamps match the trimmed segment.
    """
    os.makedirs(SUB_DIR, exist_ok=True)
    path = f"{SUB_DIR}/{video_id}.ass"
    _write_ass(path, words)
    return path


def generate_segment_ass(
    video_id: str,
    words: list[dict],
    segment_start: float,
    segment_end: float,
    clip_index: int,
) -> str:
    """
    Generate ASS for a single clip segment.
    - Filters words that overlap [segment_start, segment_end]
    - Shifts timestamps by -segment_start so they match the trimmed output (PTS starts at 0)
    - Ensures subtitles stay in sync when ffmpeg uses -ss/-to
    """
    os.makedirs(SUB_DIR, exist_ok=True)
    path = f"{SUB_DIR}/{video_id}_clip{clip_index}.ass"

    segment_words = []
    for w in words:
        start, end = _get_word_times(w)
        if end <= segment_start or start >= segment_end:
            continue
        # Clip to segment bounds and shift to segment-relative time
        rel_start = max(0, start - segment_start)
        rel_end = min(segment_end - segment_start, end - segment_start)
        if rel_end <= rel_start:
            continue
        segment_words.append({
            "word": w.get("word", "").strip(),
            "start": rel_start,
            "end": rel_end,
        })

    _write_ass(path, segment_words)
    return path


def _write_ass(path: str, words: list[dict]) -> None:
    """Write ASS file with exact word timings from Whisper."""
    lines = [ASS_HEADER.strip()]

    for w in words:
        start = w.get("start", w.get("start_time", 0))
        end = w.get("end", w.get("end_time", start))
        start, end = float(start), float(end)
        word = (w.get("word", "") or "").strip()
        if not word:
            continue

        start_str = _seconds_to_ass(start)
        end_str = _seconds_to_ass(end)
        # Karaoke: {\k<centiseconds>} for word duration; 1 sec = 100 centisec
        duration_cs = max(1, int((end - start) * 100))
        text = f"{{\\k{duration_cs}}}{word}"
        lines.append(f"Dialogue: 0,{start_str},{end_str},Default,{text}")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))