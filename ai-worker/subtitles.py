import os

SUB_DIR = "../storage/subtitles"


def seconds_to_ass(sec):

    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60

    return f"{h}:{m:02}:{s:05.2f}"


def generate_karaoke_ass(video_id, words):

    os.makedirs(SUB_DIR, exist_ok=True)

    path = f"{SUB_DIR}/{video_id}.ass"

    header = """
[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV
Style: Default,Arial,70,&H00FFFFFF,&H0000FFFF,&H00000000,1,4,0,5,10,10,250

[Events]
Format: Layer,Start,End,Style,Text
"""

    lines = [header]

    for w in words:

        start = seconds_to_ass(w["start"])
        end = seconds_to_ass(w["end"])

        text = f"{{\\k50}}{w['word']}"

        line = f"Dialogue: 0,{start},{end},Default,{text}"

        lines.append(line)

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return path