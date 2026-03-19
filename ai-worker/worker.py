"""
AI Video Clipper worker - processes videos through the full pipeline.
Reports progress to the backend via POST /api/job/:id/status so the
frontend can show animated progress steps.
"""

import json
import logging
import os
import uuid

import requests

from download import download_video

logger = logging.getLogger(__name__)


def _report_status(job_id: str | None, backend_url: str | None, status: str, error: str | None = None) -> None:
    """Call backend to update job status. No-op if job_id or backend_url missing."""
    if not job_id or not backend_url:
        return
    try:
        resp = requests.post(
            f"{backend_url.rstrip('/')}/api/job/{job_id}/status",
            json={"status": status, **({"error": error} if error else {})},
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        if not resp.ok:
            logger.warning("Status update failed: %s %s", resp.status_code, resp.text)
    except Exception as e:
        logger.warning("Could not report status: %s", e)
from transcribe import extract_audio, transcribe_audio, get_word_timestamps
from emotion_hooks import detect_emotional_hooks
from subtitles import generate_karaoke_ass
from generate_clips import generate_clips
from emoji_captions import add_emojis_to_transcript
from silence_cut import remove_silence
from broll_matcher import detect_silence, insert_broll
from engagement_model import predict_engagement


def top_segments(segments, limit=3):

    segments.sort(
        key=lambda x: x.get("emotion_score", 0),
        reverse=True
    )

    return segments[:limit]


def transcript_for_segment(words, start, end):

    segment_words = []

    for w in words:

        if w["start"] >= start and w["end"] <= end:
            segment_words.append(w["word"])

    return " ".join(segment_words)


def process_video(
    url: str,
    job_id: str | None = None,
    backend_url: str | None = None,
) -> None:
    """
    Process a video through the full pipeline.
    If job_id and backend_url are provided, reports progress to the backend
    so the frontend can show animated status steps.
    """
    backend_url = backend_url or os.getenv("BACKEND_URL")

    video_id = str(uuid.uuid4())[:8]

    try:
        # Step 1: Download
        _report_status(job_id, backend_url, "downloading")
        print("\nDownloading video...")
        video_path = download_video(url, video_id)

        print("\nRemoving silence...")
        cleaned_video = f"../storage/videos/{video_id}_clean.mp4"
        video_path = remove_silence(video_path, cleaned_video)

        # Step 2: Transcribe
        _report_status(job_id, backend_url, "transcribing")
        print("\nExtracting audio...")
        audio_path = extract_audio(video_path, video_id)

        print("\nTranscribing audio...")
        transcript = transcribe_audio(audio_path)

        print("\nTranscript:")
        print(transcript)

        print("\nEnhancing captions with emojis...")
        transcript_with_emojis = add_emojis_to_transcript(transcript)

        print("\nGetting word timestamps...")
        words = get_word_timestamps(audio_path)

        # Step 3: Add subtitles
        _report_status(job_id, backend_url, "adding_subtitles")
        print("\nGenerating karaoke captions...")
        subtitle_path = generate_karaoke_ass(video_id, words)
        print("Subtitle file:", subtitle_path)

        # Step 4: Detect viral moments
        _report_status(job_id, backend_url, "detecting_clips")
        print("\nDetecting emotional hooks...")
        segments = detect_emotional_hooks(transcript_with_emojis)

        print("\nAI segments:")
        print(segments)

        try:
            segments = top_segments(segments)
        except Exception:
            print("\nHook scoring failed. Using fallback.")
            segments = [
                {"start": 2, "end": 12, "emotion_score": 70},
                {"start": 15, "end": 25, "emotion_score": 65}
            ]

        # Step 5: Generate clips
        _report_status(job_id, backend_url, "generating_clips")
        print("\nGenerating clips...")

        clips = generate_clips(
            video_path,
            segments,
            subtitle_path
        )

        print("\nClips generated:")
        for clip in clips:
            print(clip)

        print("\nDetecting silent sections for B-roll...")
        silences = detect_silence(video_path)
        print("Silence sections:", silences)

        final_clips = []
        for clip, seg in zip(clips, segments):
            portrait_clip = clip["portrait"]
            print("\nInserting B-roll for:", portrait_clip)
            final_clip = insert_broll(
                portrait_clip,
                "../assets/gameplay.mp4",
                f"{portrait_clip}_broll.mp4"
            )
            segment_text = transcript_for_segment(
                words,
                seg["start"],
                seg["end"]
            )
            print("\nPredicting engagement score...")
            score = predict_engagement(segment_text)
            print("Segment transcript:", segment_text)
            print("Predicted engagement:", score)
            final_clips.append({
                "clip": final_clip,
                "score": score
            })

        print("\nFinal clips ranked:")
        final_clips.sort(key=lambda x: x["score"], reverse=True)
        for c in final_clips:
            print(c)

        _report_status(job_id, backend_url, "completed")
        print("\nProcessing complete.")

    except Exception as e:
        _report_status(job_id, backend_url, "failed", error=str(e))
        raise


if __name__ == "__main__":

    url = input("\nEnter video URL: ")

    process_video(url)