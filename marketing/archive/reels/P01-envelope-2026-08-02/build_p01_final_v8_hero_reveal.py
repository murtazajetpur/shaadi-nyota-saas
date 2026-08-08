from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).parent
FFMPEG = ROOT / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"

SOURCE_PRODUCT = HERE / "P01_Product-Proof_Handheld_v1.mp4"
HERO_PRODUCT = HERE / "P01_Product-Proof_Handheld_v2-hero-reveal.mp4"
SOURCE_FINAL = HERE / "P01_Final_v7.mp4"
FINAL = HERE / "P01_Final_v8-hero-reveal.mp4"
QA = HERE / "P01_Final_v8-hero-reveal-QA.jpg"


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    for path in (FFMPEG, SOURCE_PRODUCT, SOURCE_FINAL):
        if not path.exists():
            raise FileNotFoundError(path)

    # Preserve the real product recording. Frame 88 is the clearest completed
    # Ganesha reveal; hold it for 1.2 seconds. Remove the same 35-frame interval
    # from a repetitive middle scroll so the product sequence remains 315 frames.
    product_filter = (
        "[0:v]trim=start_frame=0:end_frame=88,setpts=PTS-STARTPTS[v0];"
        "[0:v]trim=start_frame=88:end_frame=89,setpts=PTS-STARTPTS,"
        "tpad=stop_mode=clone:stop_duration=1.166667,trim=end_frame=36,setpts=PTS-STARTPTS[vhold];"
        "[0:v]trim=start_frame=89:end_frame=135,setpts=PTS-STARTPTS[v1];"
        "[0:v]trim=start_frame=170:end_frame=315,setpts=PTS-STARTPTS[v2];"
        "[v0][vhold][v1][v2]concat=n=4:v=1:a=0[vout]"
    )
    run([
        str(FFMPEG), "-y", "-i", str(SOURCE_PRODUCT),
        "-filter_complex", product_filter,
        "-map", "[vout]", "-an",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart",
        str(HERO_PRODUCT),
    ])

    # Keep the approved presenter, original audio, and approved CTA. Replace
    # only the 315-frame product section in the centre of the Reel.
    final_filter = (
        "[0:v]trim=start_frame=0:end_frame=200,setpts=PTS-STARTPTS[vpresenter];"
        "[1:v]trim=start_frame=0:end_frame=315,setpts=PTS-STARTPTS[vproduct];"
        "[0:v]trim=start_frame=515:end_frame=590,setpts=PTS-STARTPTS[vcta];"
        "[vpresenter][vproduct][vcta]concat=n=3:v=1:a=0[vout]"
    )
    run([
        str(FFMPEG), "-y",
        "-i", str(SOURCE_FINAL), "-i", str(HERO_PRODUCT),
        "-filter_complex", final_filter,
        "-map", "[vout]", "-map", "0:a:0",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-c:a", "copy",
        "-movflags", "+faststart", "-shortest", str(FINAL),
    ])

    # Targeted review frames: presenter, opening, three moments across the hero
    # reveal, RSVP proof, and approved CTA.
    run([
        str(FFMPEG), "-y", "-i", str(FINAL),
        "-vf",
        "select='eq(n,0)+eq(n,205)+eq(n,270)+eq(n,288)+eq(n,305)+eq(n,470)+eq(n,555)',"
        "setpts=N/FRAME_RATE/TB,scale=90:160,tile=7x1",
        "-frames:v", "1", "-update", "1", "-q:v", "20", str(QA),
    ])

    print(f"Wrote {HERO_PRODUCT}")
    print(f"Wrote {FINAL}")
    print(f"Wrote {QA}")


if __name__ == "__main__":
    main()
