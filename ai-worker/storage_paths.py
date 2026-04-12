"""
Central storage paths — absolute and cwd-independent.

Relative paths like ../storage/... break when the worker is started from a
different directory (e.g. repo root): FFmpeg/OpenCV on Windows may then raise
OSError: [Errno 22] Invalid argument.
"""

from __future__ import annotations

import os
from pathlib import Path

_AI_WORKER = Path(__file__).resolve().parent
_REPO_ROOT = _AI_WORKER.parent

try:
    from dotenv import load_dotenv

    load_dotenv(_AI_WORKER / ".env")
except ImportError:
    pass


def storage_root() -> Path:
    raw = (os.getenv("STORAGE_PATH") or "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return (_REPO_ROOT / "storage").resolve()


def video_dir() -> Path:
    return storage_root() / "videos"


def audio_dir() -> Path:
    return storage_root() / "audio"


def clips_dir() -> Path:
    return storage_root() / "clips"


def thumbnails_dir() -> Path:
    return storage_root() / "thumbnails"


def cache_dir() -> Path:
    return storage_root() / "cache"


def gameplay_video_path() -> Path:
    return (_REPO_ROOT / "assets" / "gameplay.mp4").resolve()


def ensure_storage_dirs() -> None:
    for d in (video_dir(), audio_dir(), clips_dir(), thumbnails_dir(), cache_dir()):
        d.mkdir(parents=True, exist_ok=True)


def abs_path_for_media(path_str: str) -> str:
    """Normalize path for OpenCV / FFmpeg (always absolute)."""
    if not path_str:
        return path_str
    p = Path(path_str)
    if p.is_absolute():
        return str(p.resolve())
    return str((_AI_WORKER / p).resolve())
