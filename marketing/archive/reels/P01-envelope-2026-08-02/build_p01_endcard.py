from __future__ import annotations

import sys
from fractions import Fraction
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


PYAV_DEPENDENCY = Path(r"C:\tmp\codex-video-review-deps")
if PYAV_DEPENDENCY.exists():
    sys.path.insert(0, str(PYAV_DEPENDENCY))

import av  # noqa: E402


ROOT = Path(__file__).resolve().parents[3]
OUTPUT = Path(__file__).with_name("P01_CTA_Endcard_v1.mp4")
POSTER = Path(__file__).with_name("P01_CTA_Endcard_v1-poster.png")
LOGO = ROOT / "marketing" / "shaadi-nyota-logo.png"

WIDTH, HEIGHT = 1080, 1920
FPS = 30
DURATION = 2


def contain(image: Image.Image, max_width: int, max_height: int) -> Image.Image:
    ratio = min(max_width / image.width, max_height / image.height)
    return image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)


def main() -> None:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), "#F6F0EA")
    draw = ImageDraw.Draw(canvas)

    # Restrained editorial frame that echoes the logo's envelope geometry.
    draw.rounded_rectangle((92, 90, WIDTH - 92, HEIGHT - 110), radius=42, outline="#C7A45A", width=3)
    draw.line((160, 1560, WIDTH - 160, 1560), fill="#DBC69A", width=2)

    logo = Image.open(LOGO).convert("RGBA")
    logo = contain(logo, 430, 430)
    canvas.paste(logo, ((WIDTH - logo.width) // 2, 385), logo)

    title_font = ImageFont.truetype(r"C:\Windows\Fonts\georgiab.ttf", 76)
    sub_font = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 36)
    title = "Start your preview"
    subtitle = "Your wedding deserves a memorable welcome."

    title_box = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_box[2] - title_box[0]
    draw.text(((WIDTH - title_width) // 2, 1010), title, font=title_font, fill="#5A101B")

    sub_box = draw.textbbox((0, 0), subtitle, font=sub_font)
    sub_width = sub_box[2] - sub_box[0]
    draw.text(((WIDTH - sub_width) // 2, 1135), subtitle, font=sub_font, fill="#654E48")

    canvas.save(POSTER, "PNG", optimize=True)

    output = av.open(str(OUTPUT), "w", options={"movflags": "+faststart"})
    stream = output.add_stream("libx264", rate=FPS)
    stream.width, stream.height = WIDTH, HEIGHT
    stream.pix_fmt = "yuv420p"
    stream.options = {"crf": "18", "preset": "medium", "profile": "high"}

    total_frames = FPS * DURATION
    for index in range(total_frames):
        frame = av.VideoFrame.from_image(canvas)
        frame.pts = index
        frame.time_base = Fraction(1, FPS)
        for packet in stream.encode(frame):
            output.mux(packet)
    for packet in stream.encode():
        output.mux(packet)
    output.close()
    print(f"Wrote {OUTPUT}")
    print(f"Wrote {POSTER}")


if __name__ == "__main__":
    main()
