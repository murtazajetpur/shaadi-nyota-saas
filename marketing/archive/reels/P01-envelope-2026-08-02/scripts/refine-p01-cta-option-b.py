from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "marketing" / "reels" / "pilot-envelope" / "P01_CTA_Option_B_Invitation.png"
OUTPUT = ROOT / "marketing" / "reels" / "pilot-envelope" / "P01_CTA_Option_B_Final.png"


def main() -> None:
    image = Image.open(SOURCE).convert("RGB")
    draw = ImageDraw.Draw(image)

    # Remove only the decorative lower-left circle. Sampling a clean row keeps
    # the original maroon panel, ivory field, and fine vertical gold divider.
    clean_reference_y = 1120
    for x in range(0, 335):
        draw.line((x, 1190, x, 1865), fill=image.getpixel((x, clean_reference_y)))

    # Remove the accidental question-mark/arrow after "LINK IN BIO" without
    # changing the approved wording or the surrounding typography.
    ivory = image.getpixel((700, 1610))
    draw.rectangle((500, 1570, 570, 1665), fill=ivory)

    image.save(OUTPUT, quality=100)
    print(OUTPUT)


if __name__ == "__main__":
    main()
