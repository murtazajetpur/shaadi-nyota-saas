from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "marketing" / "reels" / "pilot-envelope" / "P01_CTA_Option_B_Invitation.png"
OUTPUT = ROOT / "marketing" / "reels" / "pilot-envelope" / "P01_CTA_Option_B_Final.png"


def main() -> None:
    image = Image.open(SOURCE).convert("RGB")
    draw = ImageDraw.Draw(image)

    # Clear the complete lower decorative circle while preserving the original
    # left panel and divider. Only the area below the one-click button changes.
    clean_reference_y = 1000
    ivory = image.getpixel((900, 1600))
    for x in range(0, 311):
        draw.line((x, 1380, x, 1865), fill=image.getpixel((x, clean_reference_y)))
    draw.rectangle((311, 1380, 760, 1865), fill=ivory)

    # Restore only the approved lower copy. There is intentionally no trailing
    # question mark, arrow, circle, or other symbol.
    body_font = ImageFont.truetype(r"C:\Windows\Fonts\GARA.TTF", 43)
    label_font = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 25)
    draw.text((340, 1510), "See the full experience", font=body_font, fill=(43, 28, 31))
    draw.text((340, 1593), "LINK IN BIO", font=label_font, fill=(122, 29, 44))

    image.save(OUTPUT, quality=100)
    print(OUTPUT)


if __name__ == "__main__":
    main()
