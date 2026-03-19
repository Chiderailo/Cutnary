import subprocess
import os
from face_tracking import detect_face_center

CLIP_DIR = "../storage/clips"


def portrait_crop_filter(video_path):

    face_center = detect_face_center(video_path)

    if face_center is None:
        return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"

    x = int(face_center - 540)

    if x < 0:
        x = 0

    return f"crop=1080:1920:{x}:0"


def dynamic_crop_filter(video_path):
    from speaker_tracking import detect_speaker_positions

    speakers = detect_speaker_positions(video_path)

    if not speakers:
        return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"

    avg_center = sum(
        center
        for _, centers in speakers
        for center in centers
    ) / sum(len(c) for _, c in speakers)

    x = int(avg_center - 540)

    if x < 0:
        x = 0

    return f"crop=1080:1920:{x}:0"


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


def generate_portrait_clip(video_path, start, end, name, subtitle=None):

    os.makedirs(CLIP_DIR, exist_ok=True)

    output = f"{CLIP_DIR}/{name}_portrait.mp4"

    # Scale to 1080 width (maintain aspect), then pad to 1080x1920 portrait
    # Works for any source size (e.g. 640x360 landscape)
    filter_chain = "scale=1080:-2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2"

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