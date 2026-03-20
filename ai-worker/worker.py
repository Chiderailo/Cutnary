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


def _report_complete(
    job_id: str | None,
    backend_url: str | None,
    clips: list[dict],
) -> None:
    """Call backend to report job completion with clip URLs."""
    if not job_id or not backend_url:
        return
    try:
        resp = requests.post(
            f"{backend_url.rstrip('/')}/api/job/{job_id}/complete",
            json={"status": "completed", "clips": clips},
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        if not resp.ok:
            logger.warning("Complete update failed: %s %s", resp.status_code, resp.text)
    except Exception as e:
        logger.warning("Could not report completion: %s", e)
from transcribe import extract_audio, transcribe_audio, get_word_timestamps
from emotion_hooks import detect_emotional_hooks
from generate_clips import generate_clips
from emoji_captions import add_emojis_to_transcript
from silence_cut import get_video_duration_seconds, remove_silence
from broll_matcher import insert_broll
from engagement_model import predict_engagement
from r2_upload import upload_to_r2
from titles import generate_viral_description


def top_segments(segments, limit=10):

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


def _clip_length_limits(clip_length: str) -> tuple[float, float]:
    """Return (min_sec, max_sec) for the given clip_length."""
    m = {
        "auto": (20, 90),
        "<30s": (10, 30),
        "30-60s": (30, 60),
        "60-90s": (60, 90),
        "90-3min": (90, 180),
        ">3min": (180, 600),
    }
    return m.get(clip_length, (20, 90))


def _constrain_segment_durations(segments: list[dict], clip_length: str) -> list[dict]:
    """Trim segments to fit clip_length duration limits."""
    min_sec, max_sec = _clip_length_limits(clip_length)
    out = []
    for seg in segments:
        start = seg["start"]
        end = seg["end"]
        dur = end - start
        if dur <= max_sec and dur >= min_sec:
            out.append(seg)
        elif dur > max_sec:
            out.append({
                **seg,
                "end": min(end, start + max_sec),
            })
        elif dur < min_sec and dur >= 3:
            out.append(seg)
    return out


def process_video(
    url: str,
    job_id: str | None = None,
    backend_url: str | None = None,
    language: str = "en",
    aspect_ratio: str = "9:16",
    clip_length: str = "auto",
    caption_style: str = "simple",
) -> None:
    """
    Process a video through the full pipeline.
    If job_id and backend_url are provided, reports progress to the backend
    so the frontend can show animated status steps.
    language: ISO 639-1 code for transcription (e.g. "en", "es"). Default "en".
    aspect_ratio: "9:16", "16:9", "1:1", "4:5" – only this format is generated.
    clip_length: "auto", "<30s", "30-60s", "60-90s", "90-3min", ">3min"
    """
    backend_url = backend_url or os.getenv("BACKEND_URL")

    video_id = str(uuid.uuid4())[:8]

    try:
        # Step 1: Download
        _report_status(job_id, backend_url, "downloading")
        print("\nDownloading video...")
        video_path = download_video(url, video_id)

        # Skip silence removal for short videos (<5 min) to avoid unnecessary re-encoding
        duration = get_video_duration_seconds(video_path)
        if duration is not None and duration < 300:  # < 5 minutes
            print("\nSkipping silence removal (video < 5 min)")
        else:
            print("\nRemoving silence...")
            cleaned_video = f"../storage/videos/{video_id}_clean.mp4"
            video_path = remove_silence(video_path, cleaned_video)

        # Step 2: Transcribe
        _report_status(job_id, backend_url, "transcribing")
        print("\nExtracting audio...")
        audio_path = extract_audio(video_path, video_id)

        print("\nTranscribing audio...")
        transcript = transcribe_audio(audio_path, language=language)

        print("\nTranscript:")
        print(transcript)

        print("\nEnhancing captions with emojis...")
        transcript_with_emojis = add_emojis_to_transcript(transcript)

        print("\nGetting word timestamps...")
        words = get_word_timestamps(audio_path, language=language)

        # Step 3: Subtitles are generated per-segment in generate_clips (for sync)
        _report_status(job_id, backend_url, "adding_subtitles")
        print("\nWord timestamps ready for per-segment subtitles")

        # Step 4: Detect viral moments
        _report_status(job_id, backend_url, "detecting_clips")
        print("\nDetecting emotional hooks...")
        duration = get_video_duration_seconds(video_path) or 60.0
        segments = detect_emotional_hooks(
            transcript_with_emojis, video_duration=duration, clip_length=clip_length
        )

        # Constrain segment durations to clip_length
        segments = _constrain_segment_durations(segments, clip_length)

        print("\nAI segments (after clip_length constraint):")
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

        clip_paths = generate_clips(
            video_path,
            segments,
            words,
            video_id=video_id,
            aspect_ratio=aspect_ratio,
        )

        print("\nClips generated:", clip_paths)

        final_clips = []
        for clip_path, seg in zip(clip_paths, segments):
            # B-roll only for 9:16 portrait
            if aspect_ratio == "9:16":
                print("\nInserting B-roll for:", clip_path)
                broll_path = clip_path.replace(".mp4", "_broll.mp4")
                clip_url = insert_broll(
                    clip_path,
                    "../assets/gameplay.mp4",
                    broll_path,
                )
            else:
                clip_url = clip_path

            segment_text = transcript_for_segment(
                words, seg["start"], seg["end"]
            )
            print("\nPredicting engagement score...")
            raw_score = predict_engagement(segment_text)
            try:
                score = json.loads(raw_score)["score"] if isinstance(raw_score, str) else raw_score
                score = int(score) if isinstance(score, (int, float)) else 50
            except (json.JSONDecodeError, KeyError, TypeError):
                score = 50
            print("Segment transcript:", segment_text)
            print("Predicted engagement:", score)
            print("\nGenerating viral description...")
            viral_desc = generate_viral_description(segment_text)
            print("Viral description:", viral_desc)

            # Offset word timestamps: Whisper gives absolute video times; clip starts at seg["start"]
            seg_start, seg_end = seg["start"], seg["end"]
            adjusted_words = []
            for w in words:
                start = float(w.get("start", w.get("start_time", 0)))
                end = float(w.get("end", w.get("end_time", start)))
                if end <= seg_start or start >= seg_end:
                    continue
                rel_start = round(max(0, start - seg_start), 3)
                rel_end = round(min(seg_end - seg_start, end - seg_start), 3)
                if rel_end > rel_start:
                    adjusted_words.append({
                        "word": (w.get("word") or "").strip(),
                        "start": rel_start,
                        "end": rel_end,
                    })
            final_clips.append({
                "url": clip_url,
                "start_time": seg["start"],
                "end_time": seg["end"],
                "description": viral_desc,
                "viral_description": viral_desc,
                "score": score,
                "words": adjusted_words,
            })

        print("\nFinal clips ranked:")
        final_clips.sort(key=lambda x: x["score"], reverse=True)
        for c in final_clips:
            print(c)

        # Upload each clip to R2; fall back to localhost URL if upload fails
        base_url = (backend_url or "").rstrip("/")
        worker_dir = os.path.dirname(os.path.abspath(__file__))
        clips_payload = []
        for c in final_clips:
            local_path = os.path.normpath(os.path.join(worker_dir, "..", c["url"]))
            filename = os.path.basename(c["url"].replace("\\", "/"))
            r2_url = upload_to_r2(local_path, filename)
            if r2_url:
                clip_url = r2_url
            else:
                clip_url = f"{base_url}/storage/clips/{filename}" if base_url else c["url"]
                logger.warning("R2 upload failed for %s, using localhost URL", filename)
            clips_payload.append({
                "url": clip_url,
                "start_time": c["start_time"],
                "end_time": c["end_time"],
                "description": c["description"],
                "viral_description": c["viral_description"],
                "score": c["score"],
                "words": c.get("words", []),
            })

        _report_complete(job_id, backend_url, clips_payload)
        print("\nProcessing complete.")

    except Exception as e:
        _report_status(job_id, backend_url, "failed", error=str(e))
        raise


if __name__ == "__main__":

    url = input("\nEnter video URL: ")

    process_video(url)