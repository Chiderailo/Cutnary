import os
import subprocess
import sys
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

VIDEO_DIR = "../storage/videos"
AUDIO_DIR = "../storage/audio"

# Query params that indicate playlists - strip to download only the single video
PLAYLIST_PARAMS = frozenset({"list", "start_radio"})
# Seek/timestamp params (t=27s etc.) — not needed for download and can confuse some paths
YOUTUBE_STRIP_PARAMS = frozenset({"t", "start", "si", "pp"})


def _strip_playlist_params(url: str) -> str:
    """
    Remove playlist-related query params so we download only the single video.
    E.g. ...?v=ABC&list=RDP8jOQUsTU9o&start_radio=1 -> ...?v=ABC
    """
    parsed = urlparse(url)
    if not parsed.query:
        return url
    params = parse_qs(parsed.query, keep_blank_values=True)
    filtered = {k: v for k, v in params.items() if k.lower() not in PLAYLIST_PARAMS}
    if len(filtered) == len(params):
        return url
    new_query = urlencode(filtered, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


def _strip_youtube_extra_params(url: str) -> str:
    """Drop seek/timestamp query params on YouTube watch URLs."""
    parsed = urlparse(url)
    if not parsed.query or "youtube.com" not in (parsed.netloc or "").lower():
        return url
    params = parse_qs(parsed.query, keep_blank_values=True)
    filtered = {k: v for k, v in params.items() if k.lower() not in YOUTUBE_STRIP_PARAMS}
    if len(filtered) == len(params):
        return url
    new_query = urlencode(filtered, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


def _yt_dlp_base() -> list[str]:
    """
    Use the same Python's yt-dlp package (python -m yt_dlp), not a separate
    yt-dlp.exe on PATH — avoids stale installs and matches `pip install -U yt-dlp`.
    """
    base = [
        sys.executable,
        "-m",
        "yt_dlp",
        "--no-playlist",
        "--retries",
        "5",
        "--fragment-retries",
        "5",
        "--socket-timeout",
        "30",
    ]
    cookies = os.getenv("YOUTUBE_COOKIES_FILE") or os.getenv("YTDLP_COOKIES_FILE")
    if cookies and os.path.isfile(cookies):
        base.extend(["--cookies", cookies])
    return base


def download_video(url, video_id, audio_only=False):
    """
    Download video or audio from URL.
    audio_only: If True, download and extract audio only (mp3). Faster and smaller.
    """
    url = _strip_playlist_params(url)
    url = _strip_youtube_extra_params(url)

    print(f"[DOWNLOAD] module={__file__}")

    if audio_only:
        os.makedirs(AUDIO_DIR, exist_ok=True)
        output_path = f"{AUDIO_DIR}/{video_id}.mp3"
        commands = [
            _yt_dlp_base()
            + ["-x", "--audio-format", "mp3", "--audio-quality", "0", "-o", output_path, url],
            _yt_dlp_base()
            + [
                "--extractor-args",
                "youtube:player_client=android",
                "-x",
                "--audio-format",
                "mp3",
                "--audio-quality",
                "0",
                "-o",
                output_path,
                url,
            ],
        ]
    else:
        os.makedirs(VIDEO_DIR, exist_ok=True)
        output_path = f"{VIDEO_DIR}/{video_id}.mp4"
        # Order matters: try merge formats first, then simpler; add android client when YouTube blocks default web client (often exit 120).
        commands = [
            _yt_dlp_base()
            + [
                "-f",
                "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio/best[ext=mp4]/best",
                "--merge-output-format",
                "mp4",
                "-o",
                output_path,
                url,
            ],
            _yt_dlp_base()
            + [
                "--extractor-args",
                "youtube:player_client=android",
                "-f",
                "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio/best[ext=mp4]/best",
                "--merge-output-format",
                "mp4",
                "-o",
                output_path,
                url,
            ],
            _yt_dlp_base()
            + ["-f", "best[ext=mp4]/best", "--merge-output-format", "mp4", "-o", output_path, url],
            _yt_dlp_base()
            + [
                "--extractor-args",
                "youtube:player_client=android",
                "-f",
                "best[ext=mp4]/best",
                "--merge-output-format",
                "mp4",
                "-o",
                output_path,
                url,
            ],
            _yt_dlp_base()
            + ["-f", "best", "--merge-output-format", "mp4", "-o", output_path, url],
        ]

    last_error = None
    for i, command in enumerate(commands, start=1):
        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
            return output_path
        except subprocess.CalledProcessError as e:
            last_error = e
            stderr_tail = (e.stderr or "")[-1200:]
            print(f"[DOWNLOAD] yt-dlp attempt {i}/{len(commands)} failed (exit={e.returncode})")
            if stderr_tail:
                print(f"[DOWNLOAD] stderr tail:\n{stderr_tail}")

    if last_error:
        raise last_error
    return output_path