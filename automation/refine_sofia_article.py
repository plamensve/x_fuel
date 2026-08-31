from __future__ import annotations

import base64
import os
import re
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2")


def resolve_date() -> str:
    requested = os.getenv("ARTICLE_DATE", "").strip()
    if requested:
        return requested
    root = ROOT / "pages" / "articles" / "sofia"
    dates = sorted(p.parent.name for p in root.glob("*/index.html"))
    if not dates:
        raise RuntimeError("No Sofia article found")
    return dates[-1]


def generate_image(path: Path, prompt: str) -> bool:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return False
    try:
        client = OpenAI(api_key=api_key)
        response = client.images.generate(
            model=IMAGE_MODEL,
            prompt=prompt,
            size="1536x1024",
            quality="medium",
            output_format="png",
        )
        if not response.data:
            return False
        payload = getattr(response.data[0], "b64_json", None)
        if not payload:
            return False
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(base64.b64decode(payload))
        return True
    except Exception as exc:
        print(f"Editorial image generation skipped for {path.name}: {exc}")
        return False


def figure(src: str, alt: str, caption: str, slug: str) -> str:
    return (
        f'<figure class="sofia-text-image sofia-text-image--{slug}">'
        f'<img src="{src}" alt="{alt}" loading="lazy" decoding="async">'
        f'<figcaption>{caption}</figcaption>'
        '</figure>'
    )


def insert_before_heading(text: str, heading: str, block: str) -> str:
    pattern = re.compile(rf'<h2\b[^>]*>\s*{re.escape(heading)}\s*</h2>', re.I)
    match = pattern.search(text)
    if not match:
        return text
    return text[:match.start()] + block + text[match.start():]


def refine(date_str: str) -> None:
    article_path = ROOT / "pages" / "articles" / "sofia" / date_str / "index.html"
    if not article_path.exists():
        raise RuntimeError(f"Sofia article not found: {article_path}")

    text = article_path.read_text(encoding="utf-8")
    media = ROOT / "media" / "sofia-news" / date_str
    media.mkdir(parents=True, exist_ok=True)

    editorial_css = '/pages/styles/sofia-editorial-images.css?v=20260831-1'
    if editorial_css not in text:
        text = text.replace('</head>', f'  <link rel="stylesheet" href="{editorial_css}">\n</head>', 1)

    # Remove the chart dashboard completely. The article should read like an editorial story,
    # not like a compressed analytics dashboard.
    text = re.sub(
        r'<section\b[^>]*class="[^"]*sofia-data-dashboard[^"]*"[^>]*>.*?</section>',
        '',
        text,
        flags=re.I | re.S,
    )

    # Remove any previously injected chart figures left by older versions.
    text = re.sub(
        r'<figure\b[^>]*class="[^"]*sofia-chart-card[^"]*"[^>]*>.*?</figure>',
        '',
        text,
        flags=re.I | re.S,
    )

    # Remove the custom second footer. The main site script owns the standard site footer.
    text = re.sub(
        r'<footer\b[^>]*class="[^"]*sofia-footer[^"]*"[^>]*>.*?</footer>',
        '',
        text,
        flags=re.I | re.S,
    )
    if 'class="site-footer"' not in text:
        text = text.replace('</body>', '<footer class="site-footer"></footer>\n</body>', 1)

    # Remove older section images so regeneration stays idempotent.
    text = re.sub(
        r'<figure\b[^>]*class="[^"]*sofia-text-image[^"]*"[^>]*>.*?</figure>',
        '',
        text,
        flags=re.I | re.S,
    )

    images = {
        "a95": (
            media / "section-a95.png",
            "Professional editorial photograph for a Bulgarian consumer fuel-price article. Petrol station in Sofia with a passenger car refuelling with petrol, modern urban European setting, natural daylight, realistic documentary photography, no visible brands, no readable signs, no prices, no logos, landscape composition with editorial negative space.",
            "Автомобил зарежда бензин A95 на градска бензиностанция в София",
            "Цените на бензин A95 се различават между отделните обекти и локации в столицата.",
            "Цена на бензин A95 в София",
        ),
        "diesel": (
            media / "section-diesel.png",
            "Premium editorial documentary photograph for a fuel-price article about diesel in Sofia, Bulgaria. Diesel passenger car and light commercial vehicle at a modern urban fuel station, Sofia road environment, realistic European city photography, clean business-news aesthetic, no brand logos, no readable text, no prices, landscape composition.",
            "Дизелови автомобили на бензиностанция в София",
            "При дизела разликите между отделните станции могат да бъдат съществени за шофьори с по-висок месечен пробег.",
            "Цена на дизела в София",
        ),
        "lpg": (
            media / "section-lpg.png",
            "Editorial photograph for a Bulgarian article about LPG autogas prices in Sofia. Passenger car at an LPG/autogas pump in a modern city fuel station, realistic safety-conscious scene, European urban environment, natural light, professional news photography, no logos, no readable text, no prices, landscape orientation.",
            "Автомобил на LPG колонка в София",
            "При LPG наличността по маршрут е важна наред с цената на литър.",
            "Цена на LPG в София",
        ),
    }

    for slug, (path, prompt, alt, caption, heading) in images.items():
        if not path.exists():
            generate_image(path, prompt)
        if path.exists():
            rel = f"/media/sofia-news/{date_str}/{path.name}"
            text = insert_before_heading(text, heading, figure(rel, alt, caption, slug))

    # Keep the existing larger city editorial image, but remove it if it sits immediately
    # before the diesel section to avoid two consecutive images after the new section inserts.
    text = re.sub(
        r'<figure\b[^>]*class="[^"]*sofia-editorial-image[^"]*"[^>]*>.*?</figure>\s*(?=<figure\b[^>]*class="[^"]*sofia-text-image--diesel)',
        '',
        text,
        flags=re.I | re.S,
    )

    article_path.write_text(text, encoding="utf-8")
    print(f"Sofia article refined: charts removed, standard footer restored, editorial images added for {date_str}")


def main() -> None:
    refine(resolve_date())


if __name__ == "__main__":
    main()
