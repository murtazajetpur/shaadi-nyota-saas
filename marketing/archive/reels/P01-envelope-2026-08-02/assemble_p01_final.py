from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).parent
FFMPEG = ROOT / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"

PRESENTER = HERE / "P01_Aanya_Presenter_v1.mp4"
PRODUCT = HERE / "P01_Product-Proof_Phone_v1.mp4"
ENDCARD = HERE / "P01_CTA_Endcard_v1.mp4"
OUTPUT = HERE / "P01_Final_v1.mp4"


def main() -> None:
    if not FFMPEG.exists():
        raise FileNotFoundError(f"FFmpeg not found: {FFMPEG}")
    if not PRESENTER.exists():
        raise FileNotFoundError(
            f"Missing Flow output: {PRESENTER.name}. Download the approved Aanya clip and save it here first."
        )

    video_filter = (
        "[0:v]fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,"
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=#F6F0EA,"
        "tpad=stop_mode=clone:stop_duration=8,trim=duration=8,setpts=PTS-STARTPTS[v0];"
        "[1:v]fps=30,scale=1080:1920,trim=duration=8,setpts=PTS-STARTPTS[v1];"
        "[2:v]fps=30,scale=1080:1920,trim=duration=2,setpts=PTS-STARTPTS[v2];"
        "[v0][v1][v2]concat=n=3:v=1:a=0[vout];"
        "[0:a]aresample=48000,apad,atrim=duration=8,asetpts=PTS-STARTPTS[a0];"
        "[a0][3:a]concat=n=2:v=0:a=1[aout]"
    )

    command = [
        str(FFMPEG), "-y",
        "-i", str(PRESENTER),
        "-i", str(PRODUCT),
        "-i", str(ENDCARD),
        "-f", "lavfi", "-t", "10", "-i", "anullsrc=r=48000:cl=stereo",
        "-filter_complex", video_filter,
        "-map", "[vout]", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart", "-shortest", str(OUTPUT),
    ]
    subprocess.run(command, check=True)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
