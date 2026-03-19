"""
Clip generation - landscape and portrait.
Portrait uses face detection to center crop on faces; falls back to center crop.
"""

import subprocess
import os

from face_tracking import detect_face_center, get_video_dimensions

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


def generate_landscape_clip(video_path, start, end, name, subtitle=None):

    os.makedirs(CLIP_DIR, exist_ok=True)

    output = f"{CLIP_DIR}/{name}_landscape.mp4"

    filter_chain = "scale=1920:1080"

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
        output
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
    output = f"{CLIP_DIR}/{name}_portrait.mp4"

    crop_filter = _portrait_crop_filter(video_path, start, end)
    filter_chain = crop_filter
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
        output,
    ]
    subprocess.run(command, check=True)
    return output


def generate_clips(video_path, segments, subtitle_path):

    clips = []

    for i, seg in enumerate(segments):

        start = seg["start"]
        end = seg["end"]

        name = f"clip{i+1}"

        landscape = generate_landscape_clip(
            video_path,
            start,
            end,
            name,
            subtitle_path
        )

        portrait = generate_portrait_clip(
            video_path,
            start,
            end,
            name,
            subtitle_path
        )

        clips.append({
            "landscape": landscape,
            "portrait": portrait
        })

    return clips