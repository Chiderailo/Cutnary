"""
Clip generation - landscape and portrait.
Portrait uses face detection to center crop on faces; falls back to center crop.
Uses per-segment ASS subtitles so timings stay in sync when clips are trimmed.
"""

import subprocess
import os

from face_tracking import detect_face_center, get_video_dimensions
from subtitles import generate_segment_ass

CLIP_DIR = "../storage/clips"
PORTRAIT_W, PORTRAIT_H = 1080, 1920


def _portrait_crop_filter(
    video_path: str, start_sec: float, end_sec: float
) -> str:
    """
    Build ffmpeg crop filter for 9:16 portrait.
    - If faces found: crop centered on average face X, then scale to 1080x1920
    - If no faces: center crop, then scale to fill 1080x1920 (no black bars)
    Samples every 30 frames for face position.
    """
    dims = get_video_dimensions(video_path)
    if not dims:
        return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"

    src_w, src_h = dims
    # 9:16 crop: use full height, width = height * 9/16
    crop_w = int(src_h * 9 / 16)
    crop_h = src_h

    if crop_w > src_w:
        crop_w = src_w
        crop_h = int(src_w * 16 / 9)

    face_center = detect_face_center(
        video_path,
        start_sec=start_sec,
        end_sec=end_sec,
        sample_interval=30,
    )

    if face_center is not None:
        face_x = int(face_center - crop_w / 2)
    else:
        face_x = (src_w - crop_w) // 2

    face_x = max(0, min(face_x, src_w - crop_w))

    return f"crop={crop_w}:{crop_h}:{face_x}:0,scale={PORTRAIT_W}:{PORTRAIT_H}"


def generate_square_clip(
    video_path: str, start: float, end: float, name: str, subtitle: str | None = None
) -> str:
    """Generate 1:1 square clip (1080x1080)."""
    os.makedirs(CLIP_DIR, exist_ok=True)
    output = f"{CLIP_DIR}/{name}_1x1.mp4"
    filter_chain = "scale=1920:1080:force_original_aspect_ratio=decrease,scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080"
    if subtitle:
        filter_chain += f",ass={subtitle}"
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(start), "-to", str(end),
        "-i", video_path, "-vf", filter_chain, "-preset", "fast", "-crf", "23",
        "-threads", "0",
        output,
    ], check=True)
    return output


def generate_4_5_clip(
    video_path: str, start: float, end: float, name: str, subtitle: str | None = None
) -> str:
    """Generate 4:5 clip (1080x1350) for Instagram feed. Uses scale+pad for letterboxing."""
    os.makedirs(CLIP_DIR, exist_ok=True)
    output = f"{CLIP_DIR}/{name}_4x5.mp4"
    filter_chain = "scale=1920:1080:force_original_aspect_ratio=decrease,scale=1080:1350:force_original_aspect_ratio=decrease,pad=1080:1350:(ow-iw)/2:(oh-ih)/2"
    if subtitle:
        filter_chain += f",ass={subtitle}"
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(start), "-to", str(end),
        "-i", video_path, "-vf", filter_chain, "-preset", "fast", "-crf", "23",
        "-threads", "0",
        output,
    ], check=True)
    return output


def generate_landscape_clip(video_path, start, end, name, subtitle=None):
    """
    Generate 16:9 landscape clip. Maintains original resolution, does not upscale.
    """
    os.makedirs(CLIP_DIR, exist_ok=True)
    output = f"{CLIP_DIR}/{name}_16x9.mp4"

    # Cap input at 1920x1080 first, then pad to 16:9
    filter_chain = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2"

    if subtitle:
        filter_chain += f",ass={subtitle}"

    command = [
        "ffmpeg",
        "-y",
        "-ss", str(start),
        "-to", str(end),
        "-i", video_path,
        "-vf", filter_chain,
        "-preset", "fast",
        "-crf", "23",
        "-threads", "0",
        output,
    ]
    subprocess.run(command, check=True)
    return output


def generate_portrait_clip(
    video_path: str, start: float, end: float, name: str, subtitle: str | None = None
) -> str:
    """
    Generate 9:16 portrait clip (1080x1920) for TikTok/Reels.
    - Detects faces; crops 9:16 region centered on face (sampled every 30 frames)
    - Falls back to center crop if no faces
    - No black bars; fills frame
    - Subtitles (ass) applied after crop/scale
    """
    os.makedirs(CLIP_DIR, exist_ok=True)
    output = f"{CLIP_DIR}/{name}_9x16.mp4"

    crop_filter = _portrait_crop_filter(video_path, start, end)
    filter_chain = f"scale=1920:1080:force_original_aspect_ratio=decrease,{crop_filter}"
    if subtitle:
        ass_path = subtitle.replace("\\", "/")
        filter_chain += f",ass={ass_path}"

    command = [
        "ffmpeg",
        "-y",
        "-ss", str(start),
        "-to", str(end),
        "-i", video_path,
        "-vf", filter_chain,
        "-preset", "fast",
        "-crf", "23",
        "-threads", "0",
        output,
    ]
    subprocess.run(command, check=True)
    return output


def generate_clips(video_path, segments, words, video_id=None, aspect_ratio="9:16"):
    """
    Generate clips for each segment in the requested aspect ratio only.
    Returns a list of clip file paths (one per segment).
    aspect_ratio: "9:16", "16:9", "1:1", "4:5" – only this format is generated.
    words: from get_word_timestamps() - used for per-segment ASS with correct sync.
    video_id: used for ASS filenames; derived from video_path if not provided.
    """
    if video_id is None:
        video_id = os.path.splitext(os.path.basename(video_path))[0].replace("_clean", "")

    clip_paths = []

    for i, seg in enumerate(segments):
        start = seg["start"]
        end = seg["end"]
        name = f"clip{i + 1}"

        segment_ass = generate_segment_ass(
            video_id, words, segment_start=start, segment_end=end, clip_index=i + 1
        )

        if aspect_ratio == "16:9":
            path = generate_landscape_clip(video_path, start, end, name, segment_ass)
        elif aspect_ratio == "1:1":
            path = generate_square_clip(video_path, start, end, name, segment_ass)
        elif aspect_ratio == "4:5":
            path = generate_4_5_clip(video_path, start, end, name, segment_ass)
        else:
            # 9:16 (default) – portrait
            path = generate_portrait_clip(video_path, start, end, name, segment_ass)

        clip_paths.append(path)

    return clip_paths