from __future__ import annotations

import math
import sys
from fractions import Fraction
from pathlib import Path

PYAV_DEPENDENCY = Path(r"C:\tmp\codex-video-review-deps")
if PYAV_DEPENDENCY.exists():
    sys.path.insert(0, str(PYAV_DEPENDENCY))

from PIL import Image  # noqa: E402
import av  # noqa: E402


ROOT = Path(__file__).resolve().parents[3]
POST_DIR = ROOT / "marketing" / "reels" / "P02-couple-one-tap"
PRESENTER_DIR = POST_DIR / "assets" / "presenter-flow-2026-08-07"
OUTPUT_DIR = POST_DIR / "final-assembly-2026-08-08"

PRESENTER_CLIPS = [
    PRESENTER_DIR / "Couple_speaking_about_wedding_RSVPs_202608070026.mp4",
    PRESENTER_DIR / "Couple_talking_in_modern_home_202608070025.mp4",
    PRESENTER_DIR / "Couple_speaking_in_modern_home_202608070025.mp4",
]
PRODUCT_PROOF = (
    POST_DIR
    / "product-proof-2026-08-08"
    / "P02_Product-Proof_Handheld-Palace-RSVP_v7-inner-phone-glass.mp4"
)
CTA_STILL = POST_DIR / "cta-2026-08-08" / "P02_CTA_Option_B_RSVP_Link_ASCII_Clean.png"

OUTPUT = OUTPUT_DIR / "P02_Final_Reel_v2_for_review.mp4"
POSTER = OUTPUT_DIR / "P02_Final_Reel_v2_for_review-poster.png"

CANVAS_SIZE = (1080, 1920)
FPS = 30
AUDIO_RATE = 48000
CTA_SECONDS = 2.5


def fit_cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def apply_subtle_motion(image: Image.Image, frame_number: int, frame_count: int) -> Image.Image:
    progress = frame_number / max(1, frame_count - 1)
    zoom = 1.006 + (0.014 * progress)
    resized = image.resize(
        (round(CANVAS_SIZE[0] * zoom), round(CANVAS_SIZE[1] * zoom)),
        Image.Resampling.LANCZOS,
    )
    drift_x = round(3 * math.sin(progress * math.pi * 2.0))
    drift_y = round(4 * math.sin(progress * math.pi * 1.4))
    left = (resized.width - CANVAS_SIZE[0]) // 2 + drift_x
    top = (resized.height - CANVAS_SIZE[1]) // 2 + drift_y
    left = max(0, min(left, resized.width - CANVAS_SIZE[0]))
    top = max(0, min(top, resized.height - CANVAS_SIZE[1]))
    return resized.crop((left, top, left + CANVAS_SIZE[0], top + CANVAS_SIZE[1]))


def source_duration(path: Path) -> float:
    container = av.open(str(path))
    try:
        if container.duration:
            return float(container.duration / av.time_base)
        stream = container.streams.video[0]
        if stream.duration:
            return float(stream.duration * stream.time_base)
    finally:
        container.close()
    raise RuntimeError(f"Could not read duration for {path}")


def video_stream(container: av.container.OutputContainer):
    stream = container.add_stream("libx264", rate=FPS)
    stream.width, stream.height = CANVAS_SIZE
    stream.pix_fmt = "yuv420p"
    stream.options = {"crf": "18", "preset": "medium", "profile": "high"}
    return stream


def audio_stream(container: av.container.OutputContainer):
    stream = container.add_stream("aac", rate=AUDIO_RATE)
    stream.codec_context.layout = "stereo"
    return stream


def encode_video_frame(container, stream, image: Image.Image, frame_index: int) -> None:
    frame = av.VideoFrame.from_image(image)
    frame.pts = frame_index
    frame.time_base = Fraction(1, FPS)
    for packet in stream.encode(frame):
        container.mux(packet)


def encode_video_clip(container, stream, path: Path, frame_index: int, subtle_motion: bool = False) -> int:
    duration = source_duration(path)
    requested_times = [i / FPS for i in range(round(duration * FPS))]
    source = av.open(str(path))
    video = source.streams.video[0]
    requested_index = 0
    last_image: Image.Image | None = None
    try:
        for decoded in source.decode(video):
            decoded_time = float(decoded.time or 0)
            current_image = fit_cover(decoded.to_image().convert("RGB"), CANVAS_SIZE)
            while requested_index < len(requested_times) and decoded_time >= requested_times[requested_index]:
                output_image = (
                    apply_subtle_motion(current_image, requested_index, len(requested_times))
                    if subtle_motion
                    else current_image
                )
                encode_video_frame(container, stream, output_image, frame_index)
                if frame_index == 0:
                    output_image.save(POSTER, "PNG", optimize=True)
                frame_index += 1
                requested_index += 1
            last_image = current_image

            if requested_index >= len(requested_times):
                break

        if requested_index < len(requested_times) and last_image is not None:
            while requested_index < len(requested_times):
                output_image = (
                    apply_subtle_motion(last_image, requested_index, len(requested_times))
                    if subtle_motion
                    else last_image
                )
                encode_video_frame(container, stream, output_image, frame_index)
                frame_index += 1
                requested_index += 1
    finally:
        source.close()
    return frame_index


def encode_cta(container, stream, frame_index: int) -> int:
    base = Image.open(CTA_STILL).convert("RGB")
    frame_count = round(CTA_SECONDS * FPS)
    for i in range(frame_count):
        progress = i / max(1, frame_count - 1)
        zoom = 1.0 + (0.018 * progress)
        resized = base.resize((round(CANVAS_SIZE[0] * zoom), round(CANVAS_SIZE[1] * zoom)), Image.Resampling.LANCZOS)
        left = (resized.width - CANVAS_SIZE[0]) // 2
        top = (resized.height - CANVAS_SIZE[1]) // 2
        frame = resized.crop((left, top, left + CANVAS_SIZE[0], top + CANVAS_SIZE[1]))
        encode_video_frame(container, stream, frame, frame_index)
        frame_index += 1
    return frame_index


def encode_presenter_audio(container, stream, path: Path, audio_pts: int) -> int:
    source = av.open(str(path))
    if not source.streams.audio:
        source.close()
        return audio_pts

    resampler = av.AudioResampler(format="fltp", layout="stereo", rate=AUDIO_RATE)
    audio = source.streams.audio[0]
    try:
        for decoded in source.decode(audio):
            for frame in resampler.resample(decoded):
                frame.pts = audio_pts
                frame.time_base = Fraction(1, AUDIO_RATE)
                frame.sample_rate = AUDIO_RATE
                audio_pts += frame.samples
                for packet in stream.encode(frame):
                    container.mux(packet)
    finally:
        source.close()
    return audio_pts


def encode_silence(container, stream, audio_pts: int, seconds: float) -> int:
    remaining = round(seconds * AUDIO_RATE)
    while remaining > 0:
        samples = min(1024, remaining)
        frame = av.AudioFrame(format="fltp", layout="stereo", samples=samples)
        frame.sample_rate = AUDIO_RATE
        frame.pts = audio_pts
        frame.time_base = Fraction(1, AUDIO_RATE)
        for plane in frame.planes:
            plane.update(bytes(plane.buffer_size))
        audio_pts += samples
        remaining -= samples
        for packet in stream.encode(frame):
            container.mux(packet)
    return audio_pts


def main() -> None:
    for path in [*PRESENTER_CLIPS, PRODUCT_PROOF, CTA_STILL]:
        if not path.exists():
            raise FileNotFoundError(path)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    container = av.open(str(OUTPUT), "w", options={"movflags": "+faststart"})
    vstream = video_stream(container)
    astream = audio_stream(container)

    frame_index = 0
    for clip in PRESENTER_CLIPS:
        frame_index = encode_video_clip(container, vstream, clip, frame_index)
    presenter_frame_count = frame_index

    frame_index = encode_video_clip(container, vstream, PRODUCT_PROOF, frame_index, subtle_motion=True)
    frame_index = encode_cta(container, vstream, frame_index)

    for packet in vstream.encode():
        container.mux(packet)

    audio_pts = 0
    for clip in PRESENTER_CLIPS:
        audio_pts = encode_presenter_audio(container, astream, clip, audio_pts)

    total_duration = frame_index / FPS
    presenter_audio_duration = audio_pts / AUDIO_RATE
    audio_pts = encode_silence(container, astream, audio_pts, max(0, total_duration - presenter_audio_duration))
    for packet in astream.encode():
        container.mux(packet)

    container.close()

    print(f"Wrote {OUTPUT}")
    print(f"Wrote {POSTER}")
    print(f"Presenter frames: {presenter_frame_count} ({presenter_frame_count / FPS:.2f}s)")
    print(f"Total frames: {frame_index} ({frame_index / FPS:.2f}s)")
    print(f"Audio duration target: {audio_pts / AUDIO_RATE:.2f}s")


if __name__ == "__main__":
    main()
