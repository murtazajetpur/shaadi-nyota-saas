from __future__ import annotations

import sys
from fractions import Fraction
from pathlib import Path

import numpy as np
from PIL import Image


PYAV_DEPENDENCY = Path(r"C:\tmp\codex-video-review-deps")
if PYAV_DEPENDENCY.exists():
    sys.path.insert(0, str(PYAV_DEPENDENCY))

import av  # noqa: E402


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "marketing" / "wedding website screen recording" / "envelope opening hindu.mp4"
PLATE = Path(__file__).with_name("phone-plate-bride-v2.png")
OUTPUT_DIR = Path(__file__).parent

FPS = 30
START_SECONDS = 0.0
END_SECONDS = 6.2
CANVAS_SIZE = (1080, 1920)


def prepare_plate() -> tuple[Image.Image, tuple[int, int, int, int]]:
    source = Image.open(PLATE).convert("RGB")
    target_ratio = CANVAS_SIZE[0] / CANVAS_SIZE[1]
    source_ratio = source.width / source.height

    if source_ratio > target_ratio:
        resized_height = CANVAS_SIZE[1]
        resized_width = round(resized_height * source_ratio)
    else:
        resized_width = CANVAS_SIZE[0]
        resized_height = round(resized_width / source_ratio)

    plate = source.resize((resized_width, resized_height), Image.Resampling.LANCZOS)
    left = (resized_width - CANVAS_SIZE[0]) // 2
    top = (resized_height - CANVAS_SIZE[1]) // 2
    plate = plate.crop((left, top, left + CANVAS_SIZE[0], top + CANVAS_SIZE[1]))

    pixels = np.asarray(plate)
    red = pixels[:, :, 0]
    green = pixels[:, :, 1]
    blue = pixels[:, :, 2]
    chroma = (green > 190) & (red < 95) & (blue < 95) & (green > red * 1.8) & (green > blue * 1.8)
    ys, xs = np.where(chroma)
    if not len(xs):
        raise RuntimeError("Could not detect the chroma-green phone display.")

    # The generated plate has a single rectangular green display. A two-pixel
    # inset prevents a green antialiasing fringe without covering the bezel.
    screen_box = (int(xs.min()) + 2, int(ys.min()) + 2, int(xs.max()), int(ys.max()))
    return plate, screen_box


def output_stream(container: av.container.OutputContainer, width: int, height: int):
    stream = container.add_stream("libx264", rate=FPS)
    stream.width = width
    stream.height = height
    stream.pix_fmt = "yuv420p"
    stream.options = {"crf": "18", "preset": "medium", "profile": "high"}
    return stream


def encode_frame(container, stream, image: Image.Image, index: int) -> None:
    frame = av.VideoFrame.from_image(image)
    frame.pts = index
    frame.time_base = Fraction(1, FPS)
    for packet in stream.encode(frame):
        container.mux(packet)


def flush(container, stream) -> None:
    for packet in stream.encode():
        container.mux(packet)
    container.close()


def main() -> None:
    plate, screen_box = prepare_plate()
    screen_width = screen_box[2] - screen_box[0]
    screen_height = screen_box[3] - screen_box[1]
    print(f"Detected display: {screen_box} ({screen_width}x{screen_height})")

    clean_path = OUTPUT_DIR / "WS-01_Classic-Envelope_Opening-Clean_v1.mp4"
    phone_path = OUTPUT_DIR / "WS-01_Classic-Envelope_Phone-Master_v1.mp4"
    poster_path = OUTPUT_DIR / "WS-01_Classic-Envelope_Phone-Master_v1-poster.png"

    clean_container = av.open(str(clean_path), "w", options={"movflags": "+faststart"})
    clean_stream = output_stream(clean_container, 490, 850)
    phone_container = av.open(str(phone_path), "w", options={"movflags": "+faststart"})
    phone_stream = output_stream(phone_container, *CANVAS_SIZE)

    input_container = av.open(str(SOURCE))
    input_stream = input_container.streams.video[0]
    total_frames = round((END_SECONDS - START_SECONDS) * FPS)
    output_index = 0
    last_source: Image.Image | None = None

    for decoded in input_container.decode(input_stream):
        source_time = float(decoded.time or 0)
        if source_time < START_SECONDS:
            continue
        if source_time > END_SECONDS and output_index >= total_frames:
            break

        image = decoded.to_image().convert("RGB")
        last_source = image
        while output_index < total_frames:
            target_time = START_SECONDS + output_index / FPS
            if target_time > source_time:
                break

            clean = image.resize((490, 850), Image.Resampling.LANCZOS)
            product = image.resize((screen_width, screen_height), Image.Resampling.LANCZOS)
            composite = plate.copy()
            composite.paste(product, (screen_box[0], screen_box[1]))

            encode_frame(clean_container, clean_stream, clean, output_index)
            encode_frame(phone_container, phone_stream, composite, output_index)
            if output_index == 0:
                composite.save(poster_path, "PNG", optimize=True)
            output_index += 1

    input_container.close()

    if last_source is None:
        raise RuntimeError("No source frames decoded in the requested time range.")

    while output_index < total_frames:
        clean = last_source.resize((490, 850), Image.Resampling.LANCZOS)
        product = last_source.resize((screen_width, screen_height), Image.Resampling.LANCZOS)
        composite = plate.copy()
        composite.paste(product, (screen_box[0], screen_box[1]))
        encode_frame(clean_container, clean_stream, clean, output_index)
        encode_frame(phone_container, phone_stream, composite, output_index)
        output_index += 1

    flush(clean_container, clean_stream)
    flush(phone_container, phone_stream)
    print(f"Wrote {clean_path}")
    print(f"Wrote {phone_path}")
    print(f"Wrote {poster_path}")
    print(f"Frames: {output_index}; duration: {output_index / FPS:.2f}s; audio: none")


if __name__ == "__main__":
    main()
