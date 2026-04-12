"""
AI Video Clipper worker - processes videos through the full pipeline.
Reports progress to the backend via POST /api/job/:id/status so the
frontend can show animated progress steps.
"""

import json
import logging
import os
import uuid
import time
import sys
from pathlib import Path

import requests

from download import download_video
from storage_paths import ensure_storage_dirs, gameplay_video_path, thumbnails_dir

logger = logging.getLogger(__name__)
DEBUG_LOG_PATH = "c:/Users/iloch/.cursor/projects/cutnary/debug-c6756d.log"
DEBUG_SESSION_ID = "c6756d"
DEBUG_RUN_ID = f"worker-{int(time.time() * 1000)}"

# Force UTF-8 output when worker runs outside queue_worker.py.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


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
from silence_cut import get_video_duration_seconds
from broll_matcher import insert_broll
from r2_upload import upload_to_r2
from titles import batch_viral_descriptions_and_scores
from thumbnail_generator import create_thumbnail


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
        ensure_storage_dirs()

        # Step 1: Download
        _report_status(job_id, backend_url, "downloading")
        print("\nDownloading video...")
        video_path = download_video(url, video_id)

        # Silence removal intentionally removed from the pipeline to avoid
        # audio-leading-lip desync from audio-only trimming.

        # Step 2: Transcribe
        _report_status(job_id, backend_url, "transcribing")
        print("\nExtracting audio...")
        audio_path = extract_audio(video_path, video_id)

        print("\nTranscribing audio...")
        transcript = transcribe_audio(audio_path, language=language)

        print("\nTranscript preview:")
        print((transcript or "")[:1000])

        print("\nGetting word timestamps...")
        words = get_word_timestamps(audio_path, language=language)

        # Step 3: Detect viral moments
        _report_status(job_id, backend_url, "detecting_clips")
        print("\nDetecting emotional hooks...")
        duration = get_video_duration_seconds(video_path) or 60.0
        segments = detect_emotional_hooks(
            transcript, video_duration=duration, clip_length=clip_length
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

        # Step 4: Generate clips (without subtitles)
        _report_status(job_id, backend_url, "generating_clips")
        print("\nGenerating clips...")
        clip_paths = generate_clips(
            video_path=video_path,
            segments=segments,
            video_id=video_id,
            aspect_ratio=aspect_ratio,
        )
        print("\nClips generated:", clip_paths)

        # Keep source clips clean (no burned captions). Editor uses words[] for editable captions.

        # OPTIMIZATION: One batch AI call for all clips (viral_description + score)
        segments_data = [
            {"index": i, "transcript": transcript_for_segment(words, s["start"], s["end"])}
            for i, s in enumerate(segments)
        ]
        print("\nBatch generating viral descriptions and scores...")
        batch_results = batch_viral_descriptions_and_scores(segments_data)
        batch_by_index = {r["index"]: r for r in batch_results}

        final_clips = []
        for i, (clip_path, seg) in enumerate(zip(clip_paths, segments)):
            # B-roll only for 9:16 portrait
            if aspect_ratio == "9:16":
                print("\nInserting B-roll for:", clip_path)
                broll_path = str(Path(clip_path).with_name(f"{Path(clip_path).stem}_broll.mp4"))
                clip_url = insert_broll(
                    clip_path,
                    str(gameplay_video_path()),
                    broll_path,
                )
            else:
                clip_url = clip_path

            br = batch_by_index.get(i, {})
            segment_text = transcript_for_segment(words, seg["start"], seg["end"])
            viral_desc = (br.get("viral_description") or segment_text or "Watch this")[:80]
            score = int(br.get("score", 50)) if isinstance(br.get("score"), (int, float)) else 50
            print(f"Segment {i}: score={score}, viral_desc={viral_desc[:50]}...")

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
            subtitle_words = adjusted_words

            final_clips.append({
                "url": clip_url,
                "start_time": seg["start"],
                "end_time": seg["end"],
                "description": viral_desc,
                "viral_description": viral_desc,
                "score": score,
                "words": subtitle_words,
            })

        print("\nFinal clips ranked:")
        final_clips.sort(key=lambda x: x["score"], reverse=True)
        for c in final_clips:
            print(c)

        # Upload each clip to R2; generate thumbnails; fall back to localhost URL if upload fails
        base_url = (backend_url or "").rstrip("/")
        worker_dir = os.path.dirname(os.path.abspath(__file__))
        thumb_dir = str(thumbnails_dir())
        os.makedirs(thumb_dir, exist_ok=True)
        clips_payload = []
        for i, c in enumerate(final_clips):
            raw_url = c["url"]
            local_path = (
                os.path.normpath(raw_url)
                if os.path.isabs(raw_url)
                else os.path.normpath(os.path.join(worker_dir, "..", raw_url))
            )
            filename = os.path.basename(c["url"].replace("\\", "/"))
            r2_url = upload_to_r2(local_path, filename)
            if r2_url:
                clip_url = r2_url
            else:
                clip_url = f"{base_url}/storage/clips/{filename}" if base_url else c["url"]
                logger.warning("R2 upload failed for %s, using localhost URL", filename)

            thumbnail_url = None
            thumb_filename = f"{video_id}_clip{i + 1}.jpg"
            thumb_path = os.path.join(thumb_dir, thumb_filename)
            try:
                # Thumbnail: actual speech from spoken words, not viral/marketing hook
                spoken = " ".join(
                    (w.get("word") or "").strip() for w in (c.get("words") or []) if w.get("word")
                ).strip()
                thumb_script = spoken[:500] if spoken else (
                    transcript_for_segment(words, c["start_time"], c["end_time"]) or ""
                )
                create_thumbnail(
                    video_path=local_path,
                    output_path=thumb_path,
                    script=thumb_script,
                    style="tiktok" if aspect_ratio == "9:16" else "youtube",
                )
                r2_thumb = upload_to_r2(thumb_path, f"thumbnails/{thumb_filename}", content_type="image/jpeg")
                if r2_thumb:
                    thumbnail_url = r2_thumb
                else:
                    thumbnail_url = f"{base_url}/storage/thumbnails/{thumb_filename}" if base_url else None
            except Exception as e:
                logger.warning("Thumbnail generation failed for clip %s: %s", i + 1, e)

            clips_payload.append({
                "url": clip_url,
                "start_time": c["start_time"],
                "end_time": c["end_time"],
                "description": c["description"],
                "viral_description": c["viral_description"],
                "score": c["score"],
                "words": c.get("words", []),
                "thumbnail_url": thumbnail_url,
            })
            # region agent log
            _debug_log(
                "H5",
                "worker.py:process_video:payload",
                "final clip payload path selection",
                {
                    "index": i,
                    "local_input": local_path,
                    "clip_url_sent": clip_url,
                    "raw_clip_url": c["url"],
                },
            )
            # endregion

        _report_complete(job_id, backend_url, clips_payload)
        print("\nProcessing complete.")

    except Exception as e:
        _report_status(job_id, backend_url, "failed", error=str(e))
        raise


if __name__ == "__main__":

    url = input("\nEnter video URL: ")

    process_video(url)