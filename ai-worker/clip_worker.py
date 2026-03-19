from broll_matcher import insert_broll
from engagement_model import predict_engagement


def process_clip(task):

    clip_path = task["clip"]
    transcript = task["transcript"]

    final_clip = insert_broll(
        clip_path,
        "../assets/gameplay.mp4",
        f"{clip_path}_broll.mp4"
    )

    score = predict_engagement(transcript)

    return {
        "clip": final_clip,
        "score": score
    }