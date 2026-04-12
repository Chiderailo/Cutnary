"""
Face detection for portrait crop - uses OpenCV haarcascade.
Samples every N frames for efficiency; returns average face center X.
"""

import cv2

from storage_paths import abs_path_for_media


def get_video_dimensions(video_path: str) -> tuple[int, int] | None:
    """Return (width, height) of the video, or None if unable to read."""
    video_path = abs_path_for_media(video_path)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    return (w, h)


def detect_face_center(
    video_path: str,
    start_sec: float | None = None,
    end_sec: float | None = None,
    sample_interval: int = 30,
) -> float | None:
    """
    Detect faces and return average center X (in pixel coords).
    Uses haarcascade_frontalface_default.xml.
    If start_sec/end_sec given, only processes that segment and samples every sample_interval frames.
    Returns None if no faces found.
    """
    video_path = abs_path_for_media(video_path)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None

    cascade_path = (
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    face_cascade = cv2.CascadeClassifier(cascade_path)

    if start_sec is not None:
        cap.set(cv2.CAP_PROP_POS_MSEC, start_sec * 1000.0)

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_interval = max(1, int(fps / 2))  # ~0.5s between samples if sampling every 30
    if sample_interval > 0:
        frame_interval = sample_interval

    centers: list[float] = []
    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        pos_sec = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
        if end_sec is not None and pos_sec >= end_sec:
            break

        frame_count += 1
        if (frame_count - 1) % frame_interval != 0:
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.2,
            minNeighbors=5,
            minSize=(30, 30),
        )

        for (x, y, w, h) in faces:
            center_x = x + w / 2
            centers.append(center_x)

    cap.release()

    if not centers:
        return None
    return sum(centers) / len(centers)