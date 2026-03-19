import subprocess

def generate_thumbnail(video_path, output):

    command = [
        "ffmpeg",
        "-i", video_path,
        "-ss", "00:00:02",
        "-vframes", "1",
        output
    ]

    subprocess.run(command, check=True)

    return output