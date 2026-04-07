import os
import platform
import subprocess
import json
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
DEBUG_LOG_PATH = "c:/Users/iloch/.cursor/projects/cutnary/debug-c6756d.log"
DEBUG_SESSION_ID = "c6756d"
DEBUG_RUN_ID = f"subs-{int(time.time() * 1000)}"


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


def _probe_stream_times(path: str) -> dict:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "stream=index,codec_type,start_time,duration",
                "-of",
                "json",
                path,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        parsed = json.loads(result.stdout or "{}")
        streams = parsed.get("streams", [])
        video = next((s for s in streams if s.get("codec_type") == "video"), {})
        audio = next((s for s in streams if s.get("codec_type") == "audio"), {})
        return {
            "video_start": video.get("start_time"),
            "audio_start": audio.get("start_time"),
            "video_duration": video.get("duration"),
            "audio_duration": audio.get("duration"),
        }
    except Exception as e:
        return {"probe_error": str(e)}

def to_ass_time(s):
    s = max(0.0, float(s))
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = int(s % 60)
    cs = int(round((s % 1) * 100))
    return f"{h}:{m:02d}:{sec:02d}.{cs:02d}"

def add_subtitles_to_clip(clip_path: str) -> str:
    from openai import OpenAI
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        timeout=120.0,
        max_retries=5
    )
    
    output_path = clip_path.replace('.mp4', '_final.mp4')
    audio_path = clip_path.replace('.mp4', '_tmp.mp3')
    ass_path = clip_path.replace('.mp4', '_tmp.ass')
    
    try:
        # region agent log
        _debug_log(
            "H3",
            "subtitles.py:add_subtitles_to_clip:input",
            "subtitle stage input stream timing",
            {"clip_path": clip_path, "probe": _probe_stream_times(clip_path)},
        )
        # endregion
        # Extract audio from clip
        subprocess.run([
            "ffmpeg", "-y", "-i", clip_path,
            "-vn", "-acodec", "mp3", "-q:a", "2",
            audio_path
        ], check=True, capture_output=True)
        
        # Transcribe clip audio - timestamps start from 0
        with open(audio_path, "rb") as f:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="verbose_json",
                timestamp_granularities=["word"]
            )
        
        words = []
        if hasattr(transcript, 'words') and transcript.words:
            for w in transcript.words:
                if w.word.strip():
                    words.append({
                        "word": w.word.strip(),
                        "start": max(0.0, round(float(w.start), 3)),
                        "end": round(float(w.end), 3)
                    })
        
        print(f"[SUBTITLES] {len(words)} words from clip audio")
        
        if not words:
            return clip_path
        
        # Group into 4-word phrases
        phrases, current = [], []
        for word in words:
            current.append(word)
            if len(current) >= 4:
                phrases.append(current[:])
                current = []
        if current:
            phrases.append(current)
        
        # Get clip dimensions
        probe = subprocess.run([
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=p=0", clip_path
        ], capture_output=True, text=True)
        try:
            dims = probe.stdout.strip().split(',')
            play_w, play_h = int(dims[0]), int(dims[1])
        except:
            play_w, play_h = 1080, 1920
        
        font_size = max(40, int(play_w * 0.055))
        
        # Write ASS file
        ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {play_w}
PlayResY: {play_h}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,{font_size},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,20,20,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        for phrase in phrases:
            s = to_ass_time(phrase[0]["start"])
            e = to_ass_time(phrase[-1]["end"])
            t = " ".join(w["word"] for w in phrase)
            ass += f"Dialogue: 0,{s},{e},Default,,0,0,0,,{t}\n"
        
        with open(ass_path, "w", encoding="utf-8") as f:
            f.write(ass)
        
        print(f"[SUBTITLES] {len(phrases)} phrases written to ASS")
        
        # Escape path for Windows ffmpeg
        abs_ass = os.path.abspath(ass_path).replace("\\", "/")
        if platform.system() == "Windows" and len(abs_ass) > 1 and abs_ass[1] == ":":
            abs_ass = abs_ass[0] + "\\:" + abs_ass[2:]
        
        print(f"[SUBTITLES] Burning: {abs_ass}")
        
        # Burn subtitles
        result = subprocess.run([
            "ffmpeg", "-y",
            "-i", clip_path,
            "-vf", f"ass='{abs_ass}'",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "copy",
            output_path
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"[SUBTITLES] ffmpeg error: {result.stderr[-500:]}")
            return clip_path
        
        # region agent log
        _debug_log(
            "H3",
            "subtitles.py:add_subtitles_to_clip:output",
            "subtitle stage output stream timing",
            {"output_path": output_path, "probe": _probe_stream_times(output_path)},
        )
        # endregion
        print(f"[SUBTITLES] Success: {output_path}")
        return output_path
        
    except Exception as e:
        print(f"[SUBTITLES] Failed: {e}")
        return clip_path
    finally:
        for f in [audio_path, ass_path]:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except:
                pass

