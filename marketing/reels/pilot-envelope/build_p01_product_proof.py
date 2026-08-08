from __future__ import annotations

import sys
from fractions import Fraction
from pathlib import Path

from PIL import Image


PYAV_DEPENDENCY = Path(r"C:\tmp\codex-video-review-deps")
if PYAV_DEPENDENCY.exists():
    sys.path.insert(0, str(PYAV_DEPENDENCY))

import av  # noqa: E402

from build_envelope_pilot import CANVAS_SIZE, FPS, SOURCE, prepare_plate


OUTPUT = Path(__file__).with_name("P01_Product-Proof_Phone_v1.mp4")
DURATION_SECONDS = 8.0


def source_time_for_output(output_time: float) -> float:
    """Map the eight-second proof cut to four authentic source sections."""
    if output_time < 5.2:
        return output_time
    if output_time < 6.2:
        return 7.0 + (output_time - 5.2)
    if output_time < 7.2:
        return 10.0 + (output_time - 6.2)
    return 15.0 + (output_time - 7.2)


def main() -> None:
    plate, screen_box = prepare_plate()
    screen_size = (screen_box[2] - screen_box[0], screen_box[3] - screen_box[1])
    requested_times = [source_time_for_output(i / FPS) for i in range(round(DURATION_SECONDS * FPS))]

    output = av.open(str(OUTPUT), "w", options={"movflags": "+faststart"})
    stream = output.add_stream("libx264", rate=FPS)
    stream.width, stream.height = CANVAS_SIZE
    stream.pix_fmt = "yuv420p"
    stream.options = {"crf": "18", "preset": "medium", "profile": "high"}

    source = av.open(str(SOURCE))
    video = source.streams.video[0]
    requested_index = 0

    for decoded in source.decode(video):
        decoded_time = float(decoded.time or 0)
        while requested_index < len(requested_times) and decoded_time >= requested_times[requested_index]:
            product = decoded.to_image().convert("RGB").resize(screen_size, Image.Resampling.LANCZOS)
            composite = plate.copy()
            composite.paste(product, (screen_box[0], screen_box[1]))

            frame = av.VideoFrame.from_image(composite)
            frame.pts = requested_index
            frame.time_base = Fraction(1, FPS)
            for packet in stream.encode(frame):
                output.mux(packet)
            requested_index += 1

        if requested_index >= len(requested_times):
            break

    source.close()

    if requested_index != len(requested_times):
        raise RuntimeError(f"Encoded {requested_index} of {len(requested_times)} requested frames.")

    for packet in stream.encode():
        output.mux(packet)
    output.close()
    print(f"Wrote {OUTPUT}")
    print(f"Frames: {requested_index}; duration: {requested_index / FPS:.2f}s; audio: none")


if __name__ == "__main__":
    main()
