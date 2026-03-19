import logging
import os
import subprocess

logger = logging.getLogger(__name__)


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

    if not os.path.exists(broll_video):
        logger.info("B-roll file not found, skipping broll insertion: %s", broll_video)
        return video_path

    command = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-i", broll_video,
        "-filter_complex",
        "[0:v][1:v]overlay=(W-w)/2:(H-h)/2",
        output
    ]

    subprocess.run(command, check=True)

    return output