import logging
import os
import subprocess
import json
import time
from pathlib import Path

from storage_paths import abs_path_for_media

logger = logging.getLogger(__name__)
DEBUG_LOG_PATH = "c:/Users/iloch/.cursor/projects/cutnary/debug-c6756d.log"
DEBUG_SESSION_ID = "c6756d"
DEBUG_RUN_ID = f"broll-{int(time.time() * 1000)}"


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


def detect_silence(video_path):

    command = [
        "ffmpeg",
        "-i", video_path,
        "-af", "silencedetect=n=-40dB:d=0.8",
        "-f", "null",
        "-"
    ]

    process = subprocess.Popen(
        command,
        stderr=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True
    )

    _, stderr = process.communicate()

    silences = []

    start = None

    for line in stderr.split("\n"):

        if "silence_start" in line:
            start = float(line.split("silence_start:")[1])

        if "silence_end" in line:

            end = float(line.split("silence_end:")[1].split("|")[0])

            silences.append({
                "start": start,
                "end": end
            })

    return silences


def insert_broll(video_path, broll_video, output):
    video_path = abs_path_for_media(video_path)
    output = str(Path(output).resolve())
    broll_video = abs_path_for_media(broll_video)

    if not os.path.exists(broll_video):
        # region agent log
        _debug_log(
            "H4",
            "broll_matcher.py:insert_broll:skip",
            "broll skipped",
            {"video_path": video_path, "broll_video": broll_video},
        )
        # endregion
        logger.info("B-roll file not found, skipping broll insertion: %s", broll_video)
        return video_path

    command = [
        "ffmpeg",
        "-y",
        "-i",
        video_path,
        "-i",
        broll_video,
        "-filter_complex",
        "[0:v][1:v]overlay=(W-w)/2:(H-h)/2[vout]",
        "-map", "[vout]",
        "-map", "0:a:0",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "copy",
        output,
    ]

    subprocess.run(command, check=True)
    # region agent log
    _debug_log(
        "H4",
        "broll_matcher.py:insert_broll:applied",
        "broll applied",
        {"input": video_path, "output": output},
    )
    # endregion

    return output