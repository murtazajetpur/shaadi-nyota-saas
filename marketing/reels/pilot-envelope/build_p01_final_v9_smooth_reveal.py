from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).parent
FFMPEG = ROOT / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"

SOURCE_PRODUCT = HERE / "P01_Product-Proof_Handheld_v1.mp4"
SMOOTH_PRODUCT = HERE / "P01_Product-Proof_Handheld_v3-smooth-reveal.mp4"
SOURCE_FINAL = HERE / "P01_Final_v7.mp4"
FINAL = HERE / "P01_Final_v9-smooth-reveal.mp4"
QA = HERE / "P01_Final_v9-smooth-reveal-QA.jpg"


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    for path in (FFMPEG, SOURCE_PRODUCT, SOURCE_FINAL):
        if not path.exists():
            raise FileNotFoundError(path)

    # Keep the opening at normal speed through frame 69, then slow the final
    # reveal animation (frames 70-89) to 2.25x duration with motion-compensated
    # interpolation. This extends visibility without freezing any reveal frame.
    # Remove an equivalent short interval from a repetitive middle scroll.
    product_filter = (
        "[0:v]trim=start_frame=0:end_frame=70,setpts=PTS-STARTPTS[v0];"
        "[0:v]trim=start_frame=70:end_frame=90,"
        "setpts=2.25*(PTS-STARTPTS),"
        "minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,"
        "setpts=PTS-STARTPTS[vslow];"
        "[0:v]trim=start_frame=90:end_frame=135,setpts=PTS-STARTPTS[v1];"
        "[0:v]trim=start_frame=160:end_frame=315,setpts=PTS-STARTPTS[v2];"
        "[v0][vslow][v1][v2]concat=n=4:v=1:a=0,"
        "fps=30,tpad=stop_mode=clone:stop_duration=1,trim=end_frame=315,setpts=PTS-STARTPTS[vout]"
    )
    run([
        str(FFMPEG), "-y", "-i", str(SOURCE_PRODUCT),
        "-filter_complex", product_filter,
        "-map", "[vout]", "-an",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart",
        str(SMOOTH_PRODUCT),
    ])

    # Preserve the previously approved presenter, audio, RSVP proof, and CTA;
    # replace only the 315-frame product section.
    final_filter = (
        "[0:v]trim=start_frame=0:end_frame=200,setpts=PTS-STARTPTS[vpresenter];"
        "[1:v]trim=start_frame=0:end_frame=315,setpts=PTS-STARTPTS[vproduct];"
        "[0:v]trim=start_frame=515:end_frame=590,setpts=PTS-STARTPTS[vcta];"
        "[vpresenter][vproduct][vcta]concat=n=3:v=1:a=0[vout]"
    )
    run([
        str(FFMPEG), "-y",
        "-i", str(SOURCE_FINAL), "-i", str(SMOOTH_PRODUCT),
        "-filter_complex", final_filter,
        "-map", "[vout]", "-map", "0:a:0",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-c:a", "copy",
        "-movflags", "+faststart", "-shortest", str(FINAL),
    ])

    run([
        str(FFMPEG), "-y", "-i", str(FINAL),
        "-vf",
        "select='eq(n,0)+eq(n,205)+eq(n,270)+eq(n,285)+eq(n,300)+eq(n,315)+eq(n,470)+eq(n,555)',"
        "setpts=N/FRAME_RATE/TB,scale=90:160,tile=8x1",
        "-frames:v", "1", "-update", "1", "-q:v", "20", str(QA),
    ])

    print(f"Wrote {SMOOTH_PRODUCT}")
    print(f"Wrote {FINAL}")
    print(f"Wrote {QA}")


if __name__ == "__main__":
    main()
