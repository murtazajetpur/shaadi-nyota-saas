from __future__ import annotations

import sys
from fractions import Fraction
from pathlib import Path

PYAV_DEPENDENCY = Path(r"C:\tmp\codex-video-review-deps")
if PYAV_DEPENDENCY.exists():
    sys.path.insert(0, str(PYAV_DEPENDENCY))

from PIL import Image, ImageDraw, ImageFilter  # noqa: E402
import av  # noqa: E402


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "marketing" / "wedding website screen recording" / "palace door opening christian.mp4"
PLATE = ROOT / "marketing" / "reels" / "pilot-envelope" / "phone-plate-bride-v4-large.png"
OUTPUT_DIR = Path(__file__).with_name("product-proof-2026-08-08")
OUTPUT = OUTPUT_DIR / "P02_Product-Proof_Handheld-Palace-RSVP_v7-inner-phone-glass.mp4"
POSTER = OUTPUT_DIR / "P02_Product-Proof_Handheld-Palace-RSVP_v7-inner-phone-glass-poster.png"

CANVAS_SIZE = (1080, 1920)
FPS = 30


def source_time_for_output(output_time: float) -> float:
    """Map proof time to real source time.

    Keep the full Palace Door opening visible first, skip quickly through a
    middle details/functions section, then spend the longest beat on RSVP.
    """
    if output_time < 6.2:
        return output_time
    if output_time < 7.6:
        return 24.8 + (output_time - 6.2)
    return 31.0 + (output_time - 7.6)


DURATION_SECONDS = 11.2


def prepare_plate() -> tuple[Image.Image, tuple[int, int, int, int], Image.Image, tuple[int, int, int, int]]:
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

    initial_box = detect_screen_box(make_screen_mask(plate))
    initial_height = initial_box[3] - initial_box[1]
    desired_screen_height = 1320
    zoom = desired_screen_height / initial_height
    zoomed = plate.resize((round(plate.width * zoom), round(plate.height * zoom)), Image.Resampling.LANCZOS)
    center_x = ((initial_box[0] + initial_box[2]) / 2) * zoom
    center_y = ((initial_box[1] + initial_box[3]) / 2) * zoom
    crop_left = round(center_x - CANVAS_SIZE[0] / 2)
    crop_top = round(center_y - CANVAS_SIZE[1] / 2)
    crop_left = max(0, min(crop_left, zoomed.width - CANVAS_SIZE[0]))
    crop_top = max(0, min(crop_top, zoomed.height - CANVAS_SIZE[1]))
    plate = zoomed.crop((crop_left, crop_top, crop_left + CANVAS_SIZE[0], crop_top + CANVAS_SIZE[1]))

    chroma_mask = make_screen_mask(plate)
    outer_screen_box = detect_screen_box(chroma_mask)
    outer_screen_mask = make_rounded_screen_mask(plate.size, outer_screen_box, radius=92)
    plate = clean_chroma_plate(plate, chroma_mask)

    # The real website recording must not touch the phone plate edge. The plate
    # has soft/perspective corner geometry, so this black-glass inset hides edge
    # mismatch while preserving every product pixel inside the visible display.
    phone_glass = Image.new("RGB", plate.size, (7, 7, 8))
    plate.paste(phone_glass, (0, 0), outer_screen_mask)

    inset_x = 24
    inset_y = 28
    content_box = (
        outer_screen_box[0] + inset_x,
        outer_screen_box[1] + inset_y,
        outer_screen_box[2] - inset_x,
        outer_screen_box[3] - inset_y,
    )
    content_mask = make_rounded_screen_mask(plate.size, content_box, radius=68)
    return plate, content_box, content_mask, outer_screen_box


def make_screen_mask(plate: Image.Image) -> Image.Image:
    pix = plate.load()
    mask = Image.new("L", plate.size, 0)
    mask_pix = mask.load()
    for y in range(plate.height):
        for x in range(plate.width):
            red, green, blue = pix[x, y]
            is_core_green = green > 190 and red < 95 and blue < 95 and green > red * 1.8 and green > blue * 1.8
            is_edge_green = green > 125 and red < 150 and blue < 150 and green > red * 1.25 and green > blue * 1.25
            if is_core_green or is_edge_green:
                mask_pix[x, y] = 255
    if mask.getbbox() is None:
        raise RuntimeError("Could not detect the chroma-green phone display.")

    return mask.filter(ImageFilter.MaxFilter(17))


def detect_screen_box(mask: Image.Image) -> tuple[int, int, int, int]:
    box = mask.getbbox()
    if box is None:
        raise RuntimeError("Could not detect the chroma-green phone display.")
    return box


def make_rounded_screen_mask(size: tuple[int, int], box: tuple[int, int, int, int], radius: int) -> Image.Image:
    scale = 4
    scaled_size = (size[0] * scale, size[1] * scale)
    scaled_box = tuple(value * scale for value in box)
    mask = Image.new("L", scaled_size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        (
            scaled_box[0],
            scaled_box[1],
            scaled_box[2] - scale,
            scaled_box[3] - scale,
        ),
        radius=radius * scale,
        fill=255,
    )
    return mask.resize(size, Image.Resampling.LANCZOS)


def clean_chroma_plate(plate: Image.Image, chroma_mask: Image.Image) -> Image.Image:
    clean = plate.copy()
    bezel_fill = Image.new("RGB", plate.size, (12, 12, 12))
    clean.paste(bezel_fill, (0, 0), chroma_mask)
    return clean


def fit_inside(image: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    scale = min(max_size[0] / image.width, max_size[1] / image.height)
    fitted_size = (round(image.width * scale), round(image.height * scale))
    return image.resize(fitted_size, Image.Resampling.LANCZOS)


def output_stream(container: av.container.OutputContainer):
    stream = container.add_stream("libx264", rate=FPS)
    stream.width, stream.height = CANVAS_SIZE
    stream.pix_fmt = "yuv420p"
    stream.options = {"crf": "18", "preset": "medium", "profile": "high"}
    return stream


def encode_frame(container, stream, image: Image.Image, index: int) -> None:
    frame = av.VideoFrame.from_image(image)
    frame.pts = index
    frame.time_base = Fraction(1, FPS)
    for packet in stream.encode(frame):
        container.mux(packet)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    if not PLATE.exists():
        raise FileNotFoundError(PLATE)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    plate, content_box, content_mask, outer_screen_box = prepare_plate()
    content_size = (content_box[2] - content_box[0], content_box[3] - content_box[1])
    requested_times = [source_time_for_output(i / FPS) for i in range(round(DURATION_SECONDS * FPS))]

    output = av.open(str(OUTPUT), "w", options={"movflags": "+faststart"})
    stream = output_stream(output)

    source = av.open(str(SOURCE))
    video = source.streams.video[0]
    requested_index = 0

    for decoded in source.decode(video):
        decoded_time = float(decoded.time or 0)
        while requested_index < len(requested_times) and decoded_time >= requested_times[requested_index]:
            product = fit_inside(decoded.to_image().convert("RGB"), content_size)
            product_layer = Image.new("RGB", CANVAS_SIZE, (0, 0, 0))
            paste_x = content_box[0] + (content_size[0] - product.width) // 2
            paste_y = content_box[1] + (content_size[1] - product.height) // 2
            product_layer.paste(product, (paste_x, paste_y))
            composite = plate.copy()
            composite.paste(product_layer, (0, 0), content_mask)
            if requested_index == 0:
                composite.save(POSTER, "PNG", optimize=True)
            encode_frame(output, stream, composite, requested_index)
            requested_index += 1

        if requested_index >= len(requested_times):
            break

    source.close()

    if requested_index != len(requested_times):
        raise RuntimeError(f"Encoded {requested_index} of {len(requested_times)} requested frames.")

    for packet in stream.encode():
        output.mux(packet)
    output.close()

    content_height_pct = 100 * content_size[1] / CANVAS_SIZE[1]
    outer_screen_size = (outer_screen_box[2] - outer_screen_box[0], outer_screen_box[3] - outer_screen_box[1])
    outer_screen_height_pct = 100 * outer_screen_size[1] / CANVAS_SIZE[1]
    print(f"Wrote {OUTPUT}")
    print(f"Wrote {POSTER}")
    print(f"Detected phone glass: {outer_screen_box} ({outer_screen_size[0]}x{outer_screen_size[1]})")
    print(f"Phone glass height: {outer_screen_height_pct:.1f}% of 1920")
    print(f"Content display: {content_box} ({content_size[0]}x{content_size[1]})")
    print(f"Content display height: {content_height_pct:.1f}% of 1920")
    print(f"Frames: {requested_index}; duration: {requested_index / FPS:.2f}s; audio: none")


if __name__ == "__main__":
    main()