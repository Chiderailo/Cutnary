from broll_matcher import insert_broll
from engagement_model import predict_engagement
from storage_paths import gameplay_video_path


def process_clip(task):

    clip_path = task["clip"]
    transcript = task["transcript"]

    final_clip = insert_broll(
        clip_path,
        str(gameplay_video_path()),
        f"{clip_path}_broll.mp4"
    )

    score = predict_engagement(transcript)

    return {
        "clip": final_clip,
        "score": score
    }