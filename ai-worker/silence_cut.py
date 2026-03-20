"""
Silence removal - trims leading silence from video.
Uses -c:v copy to avoid re-encoding video; only audio is re-encoded.
"""

import subprocess


def get_video_duration_seconds(video_path: str) -> float | None:
    """Get video duration in seconds using ffprobe. Returns None on error."""
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                video_path,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        return float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError):
        return None


def remove_silence(video_path: str, output: str) -> str:
    """
    Remove leading silence. Uses stream copy for video to preserve quality.
    Audio is re-encoded to AAC with silenceremove filter.
    """
    command = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-af", "silenceremove=start_periods=1:start_duration=1:start_threshold=-50dB",
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",  # match output to shorter (filtered) audio
        output,
    ]
    subprocess.run(command, check=True)
    return output