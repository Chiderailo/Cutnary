import uuid
import json

from download import download_video
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


def process_video(url):

    video_id = str(uuid.uuid4())[:8]

    print("\nDownloading video...")
    video_path = download_video(url, video_id)

    print("\nRemoving silence...")
    cleaned_video = f"../storage/videos/{video_id}_clean.mp4"
    video_path = remove_silence(video_path, cleaned_video)

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

    print("\nGenerating karaoke captions...")
    subtitle_path = generate_karaoke_ass(video_id, words)

    print("Subtitle file:", subtitle_path)

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

    for clip in clips:

        portrait_clip = clip["portrait"]

        print("\nInserting B-roll for:", portrait_clip)

        final_clip = insert_broll(
            portrait_clip,
            "../assets/gameplay.mp4",
            f"{portrait_clip}_broll.mp4"
        )

        segment_text = transcript_for_segment(
            words,
            clip["start"],
            clip["end"]
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

    final_clips.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    for c in final_clips:
        print(c)

    print("\nProcessing complete.")


if __name__ == "__main__":

    url = input("\nEnter video URL: ")

    process_video(url)