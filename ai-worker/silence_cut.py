"""
Silence removal - trims leading silence from video.
Uses -c:v copy to avoid re-encoding video; only audio is re-encoded.
"""

import subprocess
import json
import time

from storage_paths import abs_path_for_media

DEBUG_LOG_PATH = "c:/Users/iloch/.cursor/projects/cutnary/debug-c6756d.log"
DEBUG_SESSION_ID = "c6756d"
DEBUG_RUN_ID = f"silence-{int(time.time() * 1000)}"


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


def get_video_duration_seconds(video_path: str) -> float | None:
    """Get video duration in seconds using ffprobe. Returns None on error."""
    video_path = abs_path_for_media(video_path)
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
    # region agent log
    _debug_log(
        "H6",
        "silence_cut.py:remove_silence:pre",
        "remove_silence input timing and command",
        {"video_path": video_path, "output": output, "probe": _probe_stream_times(video_path), "command": command},
    )
    # endregion
    subprocess.run(command, check=True)
    # region agent log
    _debug_log(
        "H6",
        "silence_cut.py:remove_silence:post",
        "remove_silence output timing",
        {"output": output, "probe": _probe_stream_times(output)},
    )
    # endregion
    return output