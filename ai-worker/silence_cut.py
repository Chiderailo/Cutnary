import subprocess

def remove_silence(video_path, output):

    command = [
        "ffmpeg",
        "-i", video_path,
        "-af",
        "silenceremove=start_periods=1:start_duration=1:start_threshold=-50dB",
        output
    ]

    subprocess.run(command, check=True)

    return output