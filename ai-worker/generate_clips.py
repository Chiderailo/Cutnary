import os
import statistics
import subprocess
import json
import time

import cv2

from face_tracking import get_video_dimensions

PORTRAIT_W, PORTRAIT_H = 1080, 1920
DEBUG_LOG_PATH = "c:/Users/iloch/.cursor/projects/cutnary/debug-c6756d.log"
DEBUG_SESSION_ID = "c6756d"
DEBUG_RUN_ID = f"clipgen-{int(time.time() * 1000)}"


def _debug_log(hypothesis_id: str, location: str, message: str, data: dict) -> None:
    # region agent log
    try:
        payload = {
            "sessionId": DEBUG_SESSION_ID,
            "runId": DEBUG_RUN_ID,
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data,
            "timestamp": int(time.time() * 1000),
        }
        with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:
        pass
    # endregion


def _probe_stream_times(path: str) -> dict:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "stream=index,codec_type,start_time,duration",
                "-of",
                "json",
                path,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        parsed = json.loads(result.stdout or "{}")
        streams = parsed.get("streams", [])
        video = next((s for s in streams if s.get("codec_type") == "video"), {})
        audio = next((s for s in streams if s.get("codec_type") == "audio"), {})
        return {
            "video_start": video.get("start_time"),
            "audio_start": audio.get("start_time"),
            "video_duration": video.get("duration"),
            "audio_duration": audio.get("duration"),
        }
    except Exception as e:
        return {"probe_error": str(e)}


def _run_clip_ffmpeg(
    *,
    video_path: str,
    start: float,
    duration: float,
    filter_chain: str,
    output: str,
    shape: str,
) -> None:
    command = [
        "ffmpeg",
        "-y",
        "-ss",
        str(start),
        "-i",
        video_path,
        "-t",
        str(duration),
        "-vf",
        filter_chain,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-threads",
        "0",
        output,
    ]
    # region agent log
    _debug_log(
        "H1",
        "generate_clips.py:_run_clip_ffmpeg:pre",
        "ffmpeg clip command",
        {
            "shape": shape,
            "start": start,
            "duration": duration,
            "output": output,
            "command_head": command[:10],
        },
    )
    # endregion
    subprocess.run(command, check=True)
    # region agent log
    _debug_log(
        "H2",
        "generate_clips.py:_run_clip_ffmpeg:post",
        "clip stream timing",
        {"shape": shape, "output": output, "probe": _probe_stream_times(output)},
    )
    # endregion


def _portrait_crop_filter(video_path: str, start_sec: float, end_sec: float) -> str:
    """
    Build ffmpeg crop filter for 9:16 portrait.
    Tracks the main speaking face throughout the clip (samples at 10%, 25%, 40%, 55%, 70%, 85%).
    Uses median face position to avoid outliers. Falls back to center crop if no faces.
    """
    dims = get_video_dimensions(video_path)
    if not dims:
        return "scale=1920:1080:force_original_aspect_ratio=decrease,crop=608:1080:656:0,scale=1080:1920"

    src_w, src_h = dims

    crop_w = int(src_h * 9 / 16)
    crop_h = src_h

    if crop_w > src_w:
        crop_w = src_w
        crop_h = int(src_w * 16 / 9)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    clip_duration = end_sec - start_sec
    sample_times = [
        start_sec + clip_duration * t for t in [0.1, 0.25, 0.4, 0.55, 0.7, 0.85]
    ]

    face_centers_x = []

    for t in sample_times:
        frame_num = int(t * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
        ret, frame = cap.read()
        if not ret:
            continue

        scale = 0.5
        small = cv2.resize(frame, (0, 0), fx=scale, fy=scale)
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=4,
            minSize=(30, 30),
        )

        if len(faces) > 0:
            largest = max(faces, key=lambda f: f[2] * f[3])
            x, w = largest[0], largest[2]
            center_x = int((x + w // 2) / scale)
            face_centers_x.append(center_x)

    cap.release()

    if face_centers_x:
        face_x = int(statistics.median(face_centers_x))
        crop_x = face_x - crop_w // 2
    else:
        crop_x = (src_w - crop_w) // 2

    crop_x = max(0, min(crop_x, src_w - crop_w))

    print(f"[FACE TRACKING] Face center: {face_centers_x}, Crop X: {crop_x}")

    return f"crop={crop_w}:{crop_h}:{crop_x}:0,scale={PORTRAIT_W}:{PORTRAIT_H}"


def generate_portrait_clip(video_path, start, end, name):
    import os
    os.makedirs("../storage/clips", exist_ok=True)
    output = f"../storage/clips/{name}_9x16.mp4"
    duration = end - start
    crop_filter = _portrait_crop_filter(video_path, start, end)
    filter_chain = f"scale=1920:1080:force_original_aspect_ratio=decrease,{crop_filter}"
    _run_clip_ffmpeg(
        video_path=video_path,
        start=start,
        duration=duration,
        filter_chain=filter_chain,
        output=output,
        shape="9:16",
    )
    return output


def generate_landscape_clip(video_path, start, end, name):
    import os
    os.makedirs("../storage/clips", exist_ok=True)
    output = f"../storage/clips/{name}_16x9.mp4"
    duration = end - start
    filter_chain = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2"
    _run_clip_ffmpeg(
        video_path=video_path,
        start=start,
        duration=duration,
        filter_chain=filter_chain,
        output=output,
        shape="16:9",
    )
    return output


def generate_square_clip(video_path, start, end, name):
    import os
    os.makedirs("../storage/clips", exist_ok=True)
    output = f"../storage/clips/{name}_1x1.mp4"
    duration = end - start
    filter_chain = "scale=1920:1080:force_original_aspect_ratio=decrease,scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080"
    _run_clip_ffmpeg(
        video_path=video_path,
        start=start,
        duration=duration,
        filter_chain=filter_chain,
        output=output,
        shape="1:1",
    )
    return output


def generate_4_5_clip(video_path, start, end, name):
    import os
    os.makedirs("../storage/clips", exist_ok=True)
    output = f"../storage/clips/{name}_4x5.mp4"
    duration = end - start
    filter_chain = "scale=1920:1080:force_original_aspect_ratio=decrease,scale=1080:1350:force_original_aspect_ratio=decrease,pad=1080:1350:(ow-iw)/2:(oh-ih)/2"
    _run_clip_ffmpeg(
        video_path=video_path,
        start=start,
        duration=duration,
        filter_chain=filter_chain,
        output=output,
        shape="4:5",
    )
    return output


def generate_clips(video_path, segments, video_id=None, aspect_ratio="9:16"):
    if video_id is None:
        video_id = os.path.splitext(os.path.basename(video_path))[0].replace("_clean","")
    clip_paths = []
    for i, seg in enumerate(segments):
        name = f"clip{i+1}"
        start, end = seg["start"], seg["end"]
        # region agent log
        _debug_log(
            "H1",
            "generate_clips.py:generate_clips:segment",
            "segment received for clip",
            {"index": i, "aspect_ratio": aspect_ratio, "start": start, "end": end, "duration": end - start},
        )
        # endregion
        if aspect_ratio == "16:9":
            path = generate_landscape_clip(video_path, start, end, name)
        elif aspect_ratio == "1:1":
            path = generate_square_clip(video_path, start, end, name)
        elif aspect_ratio == "4:5":
            path = generate_4_5_clip(video_path, start, end, name)
        else:
            path = generate_portrait_clip(video_path, start, end, name)
        clip_paths.append(path)
    return clip_paths

