import subprocess
import os

VIDEO_DIR = "../storage/videos"

def download_video(url, video_id):

    os.makedirs(VIDEO_DIR, exist_ok=True)

    output_path = f"{VIDEO_DIR}/{video_id}.mp4"

    command = [
        "yt-dlp",
        "-f", "mp4",
        "-o", output_path,
        url
    ]

    subprocess.run(command, check=True)

    return output_path