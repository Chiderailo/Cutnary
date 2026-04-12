"""
ASS subtitle generation for render jobs.
Creates ASS files from caption array with style mapping:
- simple: white Arial 24, no background
- bold: white Arial 28 bold, black outline 2px
- karaoke: yellow Arial 24, \\k timing tags for word highlight
- glitch: cyan Arial 24, shadow offset 2
- highlighter: black Arial 24, yellow background box
"""

import os
from pathlib import Path

from storage_paths import storage_root

RENDER_SUB_DIR = str(storage_root() / "subtitles" / "render")
# PlayRes for common clip sizes (9:16 portrait)
PLAY_RES_X = 1080
PLAY_RES_Y = 1920


def _seconds_to_ass(sec: float) -> str:
    """Convert seconds to ASS timestamp format H:M:S.cs"""
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h}:{m:02}:{s:05.2f}"


def _hex_to_ass(color_hex: str, default: str = "&H00FFFFFF") -> str:
    """Convert #RRGGBB to ASS &HAABBGGRR"""
    if not color_hex or not color_hex.startswith("#"):
        return default
    hex_val = color_hex.lstrip("#")
    if len(hex_val) != 6:
        return default
    r = int(hex_val[0:2], 16)
    g = int(hex_val[2:4], 16)
    b = int(hex_val[4:6], 16)
    # ASS: &HAABBGGRR (alpha=0 for opaque)
    return f"&H00{b:02X}{g:02X}{r:02X}"


def _style_for(style: str, position: str, fontSize: str, text_color: str, bg_color: str) -> str:
    """Build ASS Style line based on style, position, fontSize."""
    # Font size: small=18, medium=24, large=32
    fs_map = {"small": 18, "medium": 24, "large": 32}
    font_size = fs_map.get(fontSize, 24)

    # Position: Alignment 2=bottom, 5=middle, 8=top. MarginV from edge.
    pos_map = {"top": (8, 40), "middle": (5, 0), "bottom": (2, 80)}
    align, margin_v = pos_map.get(position, (2, 80))

    primary = _hex_to_ass(text_color, "&H00FFFFFF")
    outline = "&H00000000"  # black outline
    shadow = "0"
    outline_w = 1
    border_style = 1

    if style == "simple":
        # white Arial 24, no background
        return f"Style: Default,Arial,{font_size},{primary},&H000000FF,{outline},{border_style},{outline_w},{shadow},{align},40,40,{margin_v}"

    if style == "bold":
        # white Arial Bold 28, black outline 2px
        return f"Style: Default,Arial Bold,{font_size + 4},{primary},&H000000FF,{outline},{border_style},2,{shadow},{align},40,40,{margin_v}"

    if style == "karaoke":
        # yellow Arial 24
        yellow = "&H0000FFFF"
        return f"Style: Default,Arial,{font_size},{yellow},&H000000FF,{outline},{border_style},{outline_w},{shadow},{align},40,40,{margin_v}"

    if style == "glitch":
        # cyan Arial 24, shadow offset 2
        cyan = "&H00FFFF00"
        return f"Style: Default,Arial,{font_size},{cyan},&H000000FF,{outline},{border_style},{outline_w},2,{align},40,40,{margin_v}"

    if style == "highlighter":
        # black Arial 24, yellow background - use outline as "box"
        black = "&H00000000"
        return f"Style: Default,Arial,{font_size},{black},&H000000FF,{_hex_to_ass(bg_color, '&H0000FFFF')},{border_style},3,{shadow},{align},40,40,{margin_v}"

    return f"Style: Default,Arial,{font_size},{primary},&H000000FF,{outline},{border_style},{outline_w},{shadow},{align},40,40,{margin_v}"


def generate_render_ass(
    output_path: str,
    captions: list,
    style: str = "simple",
    position: str = "bottom",
    fontSize: str = "medium",
    text_color: str = "#ffffff",
    bg_color: str = "#facc15",
) -> str:
    """
    Generate ASS file for render from captions array.
    Each caption: { start, end, text, words?: [{ word, start, end }] }
    """
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    style_line = _style_for(style, position, fontSize, text_color, bg_color)

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {PLAY_RES_X}
PlayResY: {PLAY_RES_Y}

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV
{style_line}

[Events]
Format: Layer,Start,End,Style,Text
"""

    lines = [header.strip()]

    for cap in captions:
        start = float(cap.get("start", 0))
        end = float(cap.get("end", start + 1))
        text = (cap.get("text") or "").strip()
        words = cap.get("words") or []

        start_str = _seconds_to_ass(start)
        end_str = _seconds_to_ass(end)

        if style == "karaoke" and words:
            # Karaoke: \\k<centiseconds> per word
            parts = []
            for w in words:
                w_start = float(w.get("start", start))
                w_end = float(w.get("end", w_start))
                dur_cs = max(1, int((w_end - w_start) * 100))
                parts.append(f"{{\\k{dur_cs}}}{w.get('word', '')}")
            dialogue_text = "".join(parts)
        else:
            dialogue_text = text

        if dialogue_text:
            lines.append(f"Dialogue: 0,{start_str},{end_str},Default,{dialogue_text}")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return output_path
