"""
AI Thumbnail Generator - extracts best frame, uses Gemini for text, composes viral thumbnail.
"""

import json
import logging
import os
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv

from storage_paths import abs_path_for_media

load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)


def _get_font(size: int, bold: bool = False):
    """Load a bold font, fallback to default."""
    candidates = []
    if sys.platform == "win32":
        candidates = [
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/arial.ttf",
        ]
    else:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size=size)
            except OSError:
                pass
    return ImageFont.load_default()


def extract_best_frame(video_path: str, num_samples: int = 10) -> np.ndarray | None:
    """Extract the most visually interesting frame from video."""
    video_path = abs_path_for_media(video_path)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        cap.release()
        return None

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    best_frame = None
    best_score = 0.0

    for i in range(num_samples):
        pos = int((i / max(1, num_samples - 1)) * (total_frames - 1))
        cap.set(cv2.CAP_PROP_POS_FRAMES, pos)
        ret, frame = cap.read()
        if not ret:
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        face_score = len(faces) * 1000.0
        brightness = float(np.mean(gray))
        brightness_score = 100.0 - abs(brightness - 128)

        total_score = sharpness + face_score + brightness_score
        if total_score > best_score:
            best_score = total_score
            best_frame = frame.copy()

    cap.release()
    return best_frame


def generate_thumbnail_text(video_script: str, style: str = "youtube") -> dict:
    """Use Gemini to generate thumbnail text."""
    import google.generativeai as genai

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return {"headline": "WATCH THIS", "subtext": "You won't believe it", "emoji": "🔥"}

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""Generate thumbnail text for a {style} video.
Based on this content: {video_script[:500]}

Return ONLY a JSON object:
{{
    "headline": "SHORT PUNCHY TEXT (max 4 words, ALL CAPS)",
    "subtext": "Supporting text (max 6 words)",
    "emoji": "One relevant emoji"
}}"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if "```" in text:
            for part in text.split("```"):
                part = part.replace("json", "").strip()
                if part.startswith("{"):
                    return json.loads(part)
        return json.loads(text)
    except Exception as e:
        logger.warning("Gemini thumbnail text failed: %s", e)
        return {"headline": "WATCH THIS", "subtext": "You won't believe it", "emoji": "🔥"}


def create_thumbnail(
    video_path: str,
    output_path: str,
    headline: str | None = None,
    subtext: str | None = None,
    emoji: str = "🔥",
    style: str = "youtube",
    script: str = "",
) -> str:
    """
    Create viral thumbnail from video frame.
    Styles: youtube (16:9), tiktok (9:16), instagram (1:1), shorts (9:16)
    """
    if not headline:
        text_data = generate_thumbnail_text(script or "engaging video content", style)
        headline = text_data.get("headline", "WATCH THIS")
        subtext = text_data.get("subtext", "")
        emoji = text_data.get("emoji", "🔥")

    frame = extract_best_frame(video_path)
    if frame is None:
        raise ValueError("Could not extract frame from video")

    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(frame_rgb)

    sizes = {
        "youtube": (1280, 720),
        "tiktok": (1080, 1920),
        "instagram": (1080, 1080),
        "shorts": (1080, 1920),
    }
    target_size = sizes.get(style, (1280, 720))

    img_ratio = img.width / img.height
    target_ratio = target_size[0] / target_size[1]

    if img_ratio > target_ratio:
        new_height = target_size[1]
        new_width = int(new_height * img_ratio)
    else:
        new_width = target_size[0]
        new_height = int(new_width / img_ratio)

    img = img.resize((new_width, new_height), Image.LANCZOS)
    left = (new_width - target_size[0]) // 2
    top = (new_height - target_size[1]) // 2
    img = img.crop((left, top, left + target_size[0], top + target_size[1]))

    # Gradient overlay (bottom half, dark to transparent)
    img_rgba = img.convert("RGBA")
    gradient = Image.new("RGBA", target_size, (0, 0, 0, 0))
    grad_draw = ImageDraw.Draw(gradient)
    half = target_size[1] // 2
    steps = 60
    for s in range(steps):
        y_top = half + int((s / steps) * half)
        y_bot = half + int(((s + 1) / steps) * half)
        if y_top >= target_size[1]:
            break
        alpha = int(180 * (s + 1) / steps)
        grad_draw.rectangle(
            [(0, y_top), (target_size[0], min(y_bot, target_size[1]))],
            fill=(0, 0, 0, alpha),
        )
    img_rgba = Image.alpha_composite(img_rgba, gradient)
    img = img_rgba.convert("RGB")
    draw = ImageDraw.Draw(img)

    font_large = _get_font(int(target_size[0] * 0.09))
    font_small = _get_font(int(target_size[0] * 0.045))

    headline_text = f"{emoji} {headline}"
    shadow_offset = 4

    # Shadow
    draw.text(
        (target_size[0] // 2 + shadow_offset, int(target_size[1] * 0.72) + shadow_offset),
        headline_text,
        font=font_large,
        fill=(0, 0, 0),
        anchor="mm",
    )
    draw.text(
        (target_size[0] // 2, int(target_size[1] * 0.72)),
        headline_text,
        font=font_large,
        fill=(255, 255, 255),
        anchor="mm",
    )

    if subtext:
        draw.text(
            (
                target_size[0] // 2 + 2,
                int(target_size[1] * 0.85) + 2,
            ),
            subtext,
            font=font_small,
            fill=(0, 0, 0),
            anchor="mm",
        )
        draw.text(
            (target_size[0] // 2, int(target_size[1] * 0.85)),
            subtext,
            font=font_small,
            fill=(200, 200, 200),
            anchor="mm",
        )

    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    img.save(output_path, "JPEG", quality=95)
    logger.info("[THUMBNAIL] Saved: %s", output_path)
    return output_path
