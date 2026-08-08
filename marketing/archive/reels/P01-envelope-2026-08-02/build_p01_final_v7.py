from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).parent
FFMPEG = ROOT / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"

APPROVED_CTA = HERE / "P01_CTA_Option_B_Final_v2.png"
CTA_VIDEO = HERE / "P01_CTA_Option_B_Final_v2.mp4"
APPROVED_REVIEW = HERE / "P01_Final_v6-handheld-cta-review.mp4"
FINAL = HERE / "P01_Final_v7.mp4"
CONTACT = HERE / "P01_Final_v7-contact.jpg"

MAIN_DURATION = 17.1666667
CTA_DURATION = 2.5


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    for path in (FFMPEG, APPROVED_CTA, APPROVED_REVIEW):
        if not path.exists():
            raise FileNotFoundError(path)

    # The approved CTA remains fully legible while receiving only a restrained
    # 0.6% push-in so the end card does not feel like a clickable UI screen.
    run([
        str(FFMPEG), "-y",
        "-loop", "1", "-framerate", "30", "-t", str(CTA_DURATION),
        "-i", str(APPROVED_CTA),
        "-vf",
        "scale=1080:1920,"
        "zoompan=z='1+0.006*on/74':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,"
        "format=yuv420p",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-movflags", "+faststart", str(CTA_VIDEO),
    ])

    # Preserve the already-approved presenter and handheld product sequence
    # pixel-for-pixel in timing and content; replace only its old 2.5 s CTA.
    filter_complex = (
        f"[0:v]trim=duration={MAIN_DURATION},setpts=PTS-STARTPTS[vmain];"
        f"[1:v]trim=duration={CTA_DURATION},setpts=PTS-STARTPTS[vcta];"
        "[vmain][vcta]concat=n=2:v=1:a=0[vout];"
        f"[0:a]atrim=duration={MAIN_DURATION},asetpts=PTS-STARTPTS[amain];"
        f"[2:a]atrim=duration={CTA_DURATION},asetpts=PTS-STARTPTS[asilence];"
        "[amain][asilence]concat=n=2:v=0:a=1[aout]"
    )
    run([
        str(FFMPEG), "-y",
        "-i", str(APPROVED_REVIEW),
        "-i", str(CTA_VIDEO),
        "-f", "lavfi", "-t", str(CTA_DURATION),
        "-i", "anullsrc=r=48000:cl=stereo",
        "-filter_complex", filter_complex,
        "-map", "[vout]", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart", "-shortest", str(FINAL),
    ])

    run([
        str(FFMPEG), "-y", "-i", str(FINAL),
        "-vf", "fps=1/3.8,scale=180:320,tile=6x1",
        "-frames:v", "1", "-q:v", "3", str(CONTACT),
    ])

    print(f"Wrote {CTA_VIDEO}")
    print(f"Wrote {FINAL}")
    print(f"Wrote {CONTACT}")


if __name__ == "__main__":
    main()
