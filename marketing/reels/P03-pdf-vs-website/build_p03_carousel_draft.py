from __future__ import annotations

import random
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = Path(__file__).with_name("visual-draft-2026-08-09")
PRODUCT_STILL = (
    ROOT
    / "marketing"
    / "reels"
    / "P02-couple-one-tap"
    / "product-proof-2026-08-08"
    / "P02_Product-Proof_Handheld-Palace-RSVP_v7-inner-phone-glass-poster.png"
)

W, H = 1080, 1350
MARGIN = 86

FONT_SERIF = r"C:\Windows\Fonts\georgiab.ttf"
FONT_SERIF_REG = r"C:\Windows\Fonts\georgia.ttf"
FONT_SANS = r"C:\Windows\Fonts\segoeui.ttf"
FONT_SANS_BOLD = r"C:\Windows\Fonts\seguisb.ttf"

MAROON_DARK = (42, 13, 22)
MAROON = (83, 24, 39)
MAROON_SOFT = (117, 44, 58)
IVORY = (255, 246, 225)
IVORY_MUTED = (235, 218, 190)
GOLD = (224, 178, 98)
GOLD_SOFT = (224, 178, 98, 88)
BEIGE = (236, 218, 184)
INK = (47, 26, 28)


SLIDES = [
    {
        "kicker": "PDF VS WEDDING WEBSITE",
        "headline": "Your wedding invite can do more than a PDF.",
        "body": "WhatsApp par link bhejna easy hona chahiye.\nBut guests ko experience bhi milna chahiye.",
        "visual": "cover",
    },
    {
        "kicker": "THE REAL PROBLEM",
        "headline": "PDF bhej diya. Phir RSVP WhatsApp chats mein start.",
        "body": "\"Aap aa rahe ho?\"\n\"Venue kya hai?\"\n\"Function timing bhejna.\"\n\nSuddenly, invite simple tha... planning messy ho gayi.",
        "visual": "quotes",
    },
    {
        "kicker": "BETTER INVITE FLOW",
        "headline": "What if one link handled the invite and the RSVP?",
        "body": "Guests open the link.\nExplore the wedding website.\nAnd RSVP from the same place.",
        "visual": "link-flow",
    },
    {
        "kicker": "WHAT GUESTS NEED",
        "headline": "Not just a card. A place to come back to.",
        "body": "Story.\nFunctions.\nVenue.\nTimings.\nImportant details.\nGuest RSVP.",
        "visual": "checklist",
    },
    {
        "kicker": "WHATSAPP FRIENDLY",
        "headline": "Share it on WhatsApp like a normal invite.",
        "body": "Bas link bhejo.\nNo heavy PDF searching.\nNo details getting lost in chat.",
        "visual": "whatsapp-link",
    },
    {
        "kicker": "SHAADI NYOTA",
        "headline": "Your invite becomes a mobile wedding website.",
        "body": "Beautiful opening.\nEvent sections.\nAll key details.\nGuest RSVP in one link.",
        "visual": "product",
    },
    {
        "kicker": "READY FOR YOUR GUESTS",
        "headline": "Send one link. Let guests experience and RSVP.",
        "body": "See the full Shaadi Nyota experience - link in bio.",
        "visual": "cta",
    },
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def gradient_background() -> Image.Image:
    img = Image.new("RGB", (W, H), MAROON_DARK)
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        if t < 0.55:
            u = t / 0.55
            color = tuple(round(MAROON_DARK[i] + (MAROON[i] - MAROON_DARK[i]) * u) for i in range(3))
        else:
            u = (t - 0.55) / 0.45
            color = tuple(round(MAROON[i] + (MAROON_DARK[i] - MAROON[i]) * u) for i in range(3))
        for x in range(W):
            px[x, y] = color

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    blooms = [
        (905, 180, 430, (225, 178, 98, 44)),
        (160, 1160, 520, (151, 62, 70, 58)),
        (520, 700, 680, (255, 224, 160, 18)),
    ]
    for cx, cy, radius, rgba in blooms:
        for r in range(radius, 0, -10):
            alpha = int(rgba[3] * (1 - r / radius) ** 1.7)
            od.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba[:3] + (alpha,))
    img = Image.alpha_composite(img.convert("RGBA"), overlay)

    texture = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(texture)
    random.seed(903)
    for _ in range(2600):
        x = random.randrange(W)
        y = random.randrange(H)
        alpha = random.randrange(4, 13)
        color = random.choice([(255, 235, 190, alpha), (18, 6, 10, alpha)])
        td.point((x, y), fill=color)
    img = Image.alpha_composite(img, texture)

    vignette = Image.new("L", (W, H), 180)
    vd = ImageDraw.Draw(vignette)
    for r in range(760, 0, -14):
        alpha = int(180 * (r / 760) ** 2.2)
        vd.ellipse((W / 2 - r, H / 2 - r * 1.15, W / 2 + r, H / 2 + r * 1.15), fill=alpha)
    vignette = vignette.filter(ImageFilter.GaussianBlur(28))
    dark = Image.new("RGBA", (W, H), (0, 0, 0, 76))
    img = Image.composite(img, Image.alpha_composite(img, dark), vignette)
    return img


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    scale = 4
    mask = Image.new("L", (size[0] * scale, size[1] * scale), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size[0] * scale - 1, size[1] * scale - 1), radius=radius * scale, fill=255)
    return mask.resize(size, Image.Resampling.LANCZOS)


def draw_frame(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle((42, 42, W - 42, H - 42), radius=38, outline=GOLD_SOFT, width=2)
    draw.rounded_rectangle((62, 62, W - 62, H - 62), radius=28, outline=(255, 237, 190, 34), width=1)


def draw_page_number(draw: ImageDraw.ImageDraw, idx: int) -> None:
    small = font(FONT_SANS_BOLD, 26)
    text = f"{idx:02d}/07"
    draw.text((W - MARGIN - draw.textlength(text, font=small), 82), text, font=small, fill=(243, 216, 166, 185))


def wrap_text(text: str, font_obj: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        words = paragraph.split()
        current = ""
        for word in words:
            trial = word if not current else f"{current} {word}"
            if ImageDraw.Draw(Image.new("RGB", (1, 1))).textlength(trial, font=font_obj) <= max_width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    font_obj: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int] | tuple[int, int, int, int],
    max_width: int,
    line_gap: int = 12,
) -> int:
    x, y = xy
    for line in wrap_text(text, font_obj, max_width):
        if not line:
            y += int(font_obj.size * 0.65)
            continue
        draw.text((x, y), line, font=font_obj, fill=fill)
        bbox = draw.textbbox((x, y), line, font=font_obj)
        y = bbox[3] + line_gap
    return y


def draw_text_block(img: Image.Image, idx: int, slide: dict[str, str], headline_size: int = 74) -> int:
    draw = ImageDraw.Draw(img)
    kicker_f = font(FONT_SANS_BOLD, 24)
    headline_f = font(FONT_SERIF, headline_size)
    body_f = font(FONT_SANS, 34)

    draw.text((MARGIN, 82), slide["kicker"], font=kicker_f, fill=(245, 217, 166, 210))
    draw_page_number(draw, idx)
    y = 170
    y = draw_wrapped(draw, slide["headline"], (MARGIN, y), headline_f, IVORY, W - MARGIN * 2, line_gap=10)
    y += 28
    y = draw_wrapped(draw, slide["body"], (MARGIN, y), body_f, IVORY_MUTED, W - MARGIN * 2, line_gap=13)
    return y


def draw_paper_card(img: Image.Image, box: tuple[int, int, int, int], title: str, body: str, rotate: float = 0) -> None:
    x1, y1, x2, y2 = box
    card = Image.new("RGBA", (x2 - x1, y2 - y1), (248, 234, 205, 255))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, card.width - 1, card.height - 1), radius=28, fill=(248, 234, 205, 255), outline=(226, 176, 97, 120), width=2)
    d.text((30, 28), title, font=font(FONT_SANS_BOLD, 30), fill=INK)
    draw_wrapped(d, body, (30, 84), font(FONT_SANS, 26), (80, 46, 44), card.width - 60, line_gap=8)
    shadow = Image.new("RGBA", card.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((6, 8, card.width - 1, card.height - 1), radius=28, fill=(0, 0, 0, 54))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    if rotate:
        card = card.rotate(rotate, expand=True, resample=Image.Resampling.BICUBIC)
        shadow = shadow.rotate(rotate, expand=True, resample=Image.Resampling.BICUBIC)
    img.alpha_composite(shadow, (x1 - (shadow.width - (x2 - x1)) // 2, y1 - (shadow.height - (y2 - y1)) // 2))
    img.alpha_composite(card, (x1 - (card.width - (x2 - x1)) // 2, y1 - (card.height - (y2 - y1)) // 2))


def visual_cover(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    draw_paper_card(img, (112, 865, 468, 1180), "PDF", "A file attachment.\nEasy to send.\nEasy to forget.", rotate=-4)
    draw_paper_card(img, (538, 835, 972, 1198), "WEBSITE LINK", "Story + functions + details + RSVP\nin one mobile invite.", rotate=3)
    draw.line((476, 1018, 526, 1018), fill=(236, 188, 110, 160), width=3)
    draw.polygon([(526, 1018), (506, 1006), (506, 1030)], fill=(236, 188, 110, 160))


def visual_quotes(img: Image.Image) -> None:
    draw_paper_card(img, (104, 765, 476, 928), "WHATSAPP PINGS", '"Aap aa rahe ho?"', rotate=-5)
    draw_paper_card(img, (522, 815, 938, 978), "DETAILS AGAIN", '"Venue kya hai?"', rotate=4)
    draw_paper_card(img, (228, 1015, 852, 1188), "FOLLOW-UP LOOP", '"Function timing bhejna."', rotate=-2)


def visual_link_flow(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    cx, cy = W // 2, 875
    draw.ellipse((cx - 118, cy - 118, cx + 118, cy + 118), fill=(236, 218, 184, 24), outline=(226, 178, 98, 150), width=3)
    draw.text((cx - 76, cy - 38), "ONE\nLINK", font=font(FONT_SERIF, 52), fill=IVORY, align="center")
    items = [("INVITE", 178, 800), ("DETAILS", 694, 800), ("RSVP", 286, 1075), ("STORY", 616, 1075)]
    for label, x, y in items:
        draw.line((cx, cy, x + 92, y + 38), fill=(226, 178, 98, 92), width=2)
        draw.rounded_rectangle((x, y, x + 184, y + 76), radius=38, fill=(255, 246, 225, 24), outline=(226, 178, 98, 128), width=2)
        tw = draw.textlength(label, font=font(FONT_SANS_BOLD, 28))
        draw.text((x + (184 - tw) / 2, y + 20), label, font=font(FONT_SANS_BOLD, 28), fill=(245, 220, 173, 230))


def visual_checklist(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    items = ["Story", "Functions", "Venue", "Timings", "Important details", "Guest RSVP"]
    x, y = 150, 695
    for i, item in enumerate(items):
        row_y = y + i * 78
        draw.rounded_rectangle((x, row_y, W - x, row_y + 52), radius=26, fill=(255, 246, 225, 20), outline=(226, 178, 98, 95), width=1)
        draw.ellipse((x + 22, row_y + 14, x + 46, row_y + 38), outline=(226, 178, 98, 180), width=2)
        draw.line((x + 28, row_y + 27, x + 35, row_y + 34), fill=(226, 178, 98, 220), width=3)
        draw.line((x + 35, row_y + 34, x + 48, row_y + 18), fill=(226, 178, 98, 220), width=3)
        draw.text((x + 72, row_y + 9), item, font=font(FONT_SANS, 32), fill=IVORY_MUTED)


def visual_whatsapp_link(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((132, 780, 948, 1042), radius=52, fill=(255, 246, 225, 24), outline=(226, 178, 98, 120), width=2)
    draw.text((188, 835), "WHATSAPP", font=font(FONT_SANS_BOLD, 42), fill=(245, 220, 173, 235))
    draw.text((188, 902), "shaadinyota.com/your-invite", font=font(FONT_SANS, 36), fill=IVORY)
    draw.line((188, 970, 820, 970), fill=(226, 178, 98, 120), width=2)
    draw.text((188, 1000), "one link, not scattered details", font=font(FONT_SANS, 28), fill=IVORY_MUTED)
    draw.ellipse((798, 830, 890, 922), outline=(226, 178, 98, 140), width=3)
    draw.line((844, 830, 844, 922), fill=(226, 178, 98, 120), width=2)
    draw.line((798, 876, 890, 876), fill=(226, 178, 98, 120), width=2)


def visual_product(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    if PRODUCT_STILL.exists():
        product = Image.open(PRODUCT_STILL).convert("RGB")
        # Keep the real product/phone proof, cropped into an editorial proof card.
        target = (470, 760)
        scale = max(target[0] / product.width, target[1] / product.height)
        resized = product.resize((round(product.width * scale), round(product.height * scale)), Image.Resampling.LANCZOS)
        left = (resized.width - target[0]) // 2
        top = 160
        crop = resized.crop((left, top, left + target[0], top + target[1]))
        proof = Image.new("RGBA", target, (0, 0, 0, 0))
        proof.paste(crop.convert("RGBA"), (0, 0), rounded_mask(target, 34))
        shadow = Image.new("RGBA", target, (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.rounded_rectangle((12, 16, target[0] - 2, target[1] - 2), radius=34, fill=(0, 0, 0, 70))
        shadow = shadow.filter(ImageFilter.GaussianBlur(18))
        img.alpha_composite(shadow, (548, 560))
        img.alpha_composite(proof, (548, 548))
    draw.rounded_rectangle((100, 766, 486, 1138), radius=36, fill=(255, 246, 225, 18), outline=(226, 178, 98, 105), width=2)
    bullets = ["Real invite", "Real details", "Real RSVP flow"]
    y = 828
    for item in bullets:
        draw.text((148, y), item, font=font(FONT_SANS_BOLD, 34), fill=IVORY)
        y += 92
    draw.text((148, 1088), "No AI-redrawn UI", font=font(FONT_SANS, 27), fill=IVORY_MUTED)


def visual_cta(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((120, 746, 960, 1038), radius=52, fill=(255, 246, 225, 22), outline=(226, 178, 98, 132), width=2)
    draw.text((190, 820), "Experience + RSVP", font=font(FONT_SERIF, 70), fill=IVORY)
    draw.text((190, 930), "in one invite link", font=font(FONT_SANS, 42), fill=IVORY_MUTED)
    draw.line((190, 1088, 890, 1088), fill=(226, 178, 98, 120), width=2)
    footer = "SHAADI NYOTA"
    tw = draw.textlength(footer, font=font(FONT_SANS_BOLD, 28))
    draw.text(((W - tw) / 2, 1140), footer, font=font(FONT_SANS_BOLD, 28), fill=(245, 220, 173, 210))


VISUALS = {
    "cover": visual_cover,
    "quotes": visual_quotes,
    "link-flow": visual_link_flow,
    "checklist": visual_checklist,
    "whatsapp-link": visual_whatsapp_link,
    "product": visual_product,
    "cta": visual_cta,
}


def build_slide(idx: int, slide: dict[str, str]) -> Image.Image:
    img = gradient_background()
    draw = ImageDraw.Draw(img)
    draw_frame(draw)
    headline_size = 68 if idx in {2, 6, 7} else 74
    draw_text_block(img, idx, slide, headline_size=headline_size)
    VISUALS[slide["visual"]](img)
    return img.convert("RGB")


def build_contact_sheet(paths: list[Path]) -> Path:
    thumb_w = 270
    thumb_h = round(H * thumb_w / W)
    sheet = Image.new("RGB", (thumb_w * 4, (thumb_h + 44) * 2), (246, 239, 226))
    d = ImageDraw.Draw(sheet)
    label_font = font(FONT_SANS_BOLD, 18)
    for pos, path in enumerate(paths):
        img = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        x = (pos % 4) * thumb_w
        y = (pos // 4) * (thumb_h + 44)
        sheet.paste(img, (x, y + 34))
        d.text((x + 10, y + 8), f"Slide {pos + 1}", font=label_font, fill=(64, 34, 36))
    out = OUT_DIR / "P03_Carousel_Draft_v1_contact_sheet.jpg"
    sheet.save(out, "JPEG", quality=92, optimize=True)
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for idx, slide in enumerate(SLIDES, start=1):
        image = build_slide(idx, slide)
        out = OUT_DIR / f"P03_Carousel_Draft_v1_Slide_{idx:02d}.png"
        image.save(out, "PNG", optimize=True)
        paths.append(out)
        print(out)
    contact = build_contact_sheet(paths)
    print(contact)


if __name__ == "__main__":
    main()
