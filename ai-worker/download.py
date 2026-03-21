import os
import subprocess
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

VIDEO_DIR = "../storage/videos"
AUDIO_DIR = "../storage/audio"

# Query params that indicate playlists - strip to download only the single video
PLAYLIST_PARAMS = frozenset({"list", "start_radio"})


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


def download_video(url, video_id, audio_only=False):
    """
    Download video or audio from URL.
    audio_only: If True, download and extract audio only (mp3). Faster and smaller.
    """
    url = _strip_playlist_params(url)

    if audio_only:
        os.makedirs(AUDIO_DIR, exist_ok=True)
        output_path = f"{AUDIO_DIR}/{video_id}.mp3"
        command = [
            "yt-dlp",
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "-o", output_path,
            url,
        ]
    else:
        os.makedirs(VIDEO_DIR, exist_ok=True)
        output_path = f"{VIDEO_DIR}/{video_id}.mp4"
        command = [
            "yt-dlp",
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "-o", output_path,
            url,
        ]

    subprocess.run(command, check=True)
    return output_path