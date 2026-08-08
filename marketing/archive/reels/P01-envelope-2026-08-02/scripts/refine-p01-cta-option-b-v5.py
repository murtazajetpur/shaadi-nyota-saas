from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "marketing" / "reels" / "pilot-envelope" / "P01_CTA_Option_B_Final.png"
OUTPUT = ROOT / "marketing" / "reels" / "pilot-envelope" / "P01_CTA_Option_B_Final_v2.png"


def main() -> None:
    image = Image.open(SOURCE).convert("RGB")
    draw = ImageDraw.Draw(image)

    # Replace the non-interactive button treatment with an editorial text line.
    ivory = image.getpixel((900, 1600))
    draw.rectangle((320, 1185, 1010, 1400), fill=ivory)

    one_click_font = ImageFont.truetype(r"C:\Windows\Fonts\GARABD.TTF", 56)
    draw.text((340, 1215), "in one click", font=one_click_font, fill=(181, 138, 60))

    image.save(OUTPUT, quality=100)
    print(OUTPUT)


if __name__ == "__main__":
    main()
