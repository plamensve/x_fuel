from __future__ import annotations

import base64
import html
import json
import os
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
SOFIA = ZoneInfo("Europe/Sofia")
MANIFEST_PATH = ROOT / "data" / "generated-news.json"
NEWS_PATH = ROOT / "pages" / "news.html"
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2")


def load_manifest() -> list[dict]:
    if not MANIFEST_PATH.exists():
        return []
    value = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return value if isinstance(value, list) else []


def save_manifest(items: list[dict]) -> None:
    MANIFEST_PATH.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def resolve_target_date() -> str:
    requested = os.getenv("ARTICLE_DATE", "").strip()
    if requested:
        return requested

    changed = []
    daily_root = ROOT / "pages" / "articles" / "daily"
    if daily_root.exists():
        for path in daily_root.glob("*/index.html"):
            changed.append((path.stat().st_mtime, path.parent.name))
    if changed:
        return max(changed)[1]

    return datetime.now(SOFIA).date().isoformat()


def extract(html_text: str, pattern: str, fallback: str = "") -> str:
    match = re.search(pattern, html_text, flags=re.I | re.S)
    return html.unescape(match.group(1).strip()) if match else fallback


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value or "")).strip()


def format_bg_date(date_str: str) -> str:
    months = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"]
    dt = datetime.fromisoformat(date_str)
    return f"{dt.day} {months[dt.month - 1]} {dt.year}"


def build_image_prompt(date_str: str, title: str, deck: str, body: str) -> str:
    context = clean_text(body)[:1200]
    return f"""
Create a premium editorial hero image for a Bulgarian fuel-price market article.

Article date: {format_bg_date(date_str)}
Headline meaning: {clean_text(title)}
Deck: {clean_text(deck)}
Article context: {context}

Visual direction:
- realistic editorial photography or polished cinematic editorial illustration;
- clearly related to petrol stations, fuel pumps, road transport, fuel pricing or market movement;
- interpret the article's actual direction and subject, rather than making a generic fuel image;
- modern European/Bulgarian roadside atmosphere where appropriate;
- restrained, trustworthy business-news mood; dark blue/neutral palette with subtle green or red market accents only when semantically useful;
- strong composition suitable for a news article hero and social sharing;
- leave useful negative space, but DO NOT render any headline, date, numbers, labels, captions, logos, trademarks, station brands or watermarks;
- no legible text anywhere in the image;
- no fake UI, no infographic panels, no typography-as-art.

Landscape composition, editorial quality, natural lighting, believable objects and proportions.
""".strip()


def generate_ai_image(date_str: str, title: str, deck: str, body: str) -> tuple[str, int, int]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not available for image generation")

    client = OpenAI(api_key=api_key)
    response = client.images.generate(
        model=IMAGE_MODEL,
        prompt=build_image_prompt(date_str, title, deck, body),
        size="1536x1024",
        quality="medium",
        output_format="png",
    )
    if not response.data or not getattr(response.data[0], "b64_json", None):
        raise RuntimeError("Image API returned no base64 image")

    image_path = ROOT / "media" / "daily-news" / f"{date_str}.png"
    image_path.parent.mkdir(parents=True, exist_ok=True)
    image_path.write_bytes(base64.b64decode(response.data[0].b64_json))
    return f"/media/daily-news/{date_str}.png", 1536, 1024


def build_fallback_svg(date_str: str, title: str) -> str:
    """Text-free editorial fallback used only if AI image generation is unavailable."""
    label = html.escape(clean_text(title))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="{label}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#071321"/><stop offset=".55" stop-color="#16324d"/><stop offset="1" stop-color="#123c31"/></linearGradient>
  <linearGradient id="road" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f2937"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="22"/></filter>
</defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<circle cx="1040" cy="90" r="210" fill="#3b82f6" opacity=".12" filter="url(#soft)"/>
<circle cx="160" cy="560" r="190" fill="#22c55e" opacity=".10" filter="url(#soft)"/>
<path d="M0 520 C240 455 385 470 595 505 C810 542 990 525 1200 450 L1200 630 L0 630 Z" fill="url(#road)"/>
<path d="M0 549 C260 486 430 510 620 539 C825 570 1000 548 1200 486" fill="none" stroke="#f8fafc" stroke-width="5" stroke-dasharray="34 27" opacity=".55"/>
<g transform="translate(190 115)">
  <rect x="0" y="75" width="235" height="300" rx="28" fill="#e5edf6"/>
  <rect x="28" y="108" width="179" height="102" rx="14" fill="#17283b"/>
  <rect x="45" y="128" width="145" height="62" rx="8" fill="#80b7c9" opacity=".78"/>
  <rect x="45" y="246" width="60" height="87" rx="13" fill="#3b82f6"/>
  <rect x="130" y="246" width="60" height="87" rx="13" fill="#22c55e"/>
  <path d="M235 125 C320 125 300 230 330 250 C360 270 375 228 390 190" fill="none" stroke="#111827" stroke-width="18" stroke-linecap="round"/>
  <path d="M375 190 l34 -40 l22 18 l-30 45 z" fill="#111827"/>
</g>
<g transform="translate(655 105)" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M0 100 L105 150 L205 128 L315 225 L420 280" stroke="#94a3b8" stroke-width="11" opacity=".35"/>
  <path d="M0 94 L105 146 L205 124 L315 221 L420 276" stroke="#34d399" stroke-width="7"/>
  <circle cx="0" cy="94" r="10" fill="#34d399" stroke="none"/><circle cx="105" cy="146" r="10" fill="#34d399" stroke="none"/><circle cx="205" cy="124" r="10" fill="#34d399" stroke="none"/><circle cx="315" cy="221" r="10" fill="#34d399" stroke="none"/><circle cx="420" cy="276" r="10" fill="#34d399" stroke="none"/>
</g>
</svg>'''


def generate_fallback_image(date_str: str, title: str) -> tuple[str, int, int]:
    path = ROOT / "media" / "daily-news" / f"{date_str}.svg"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(build_fallback_svg(date_str, title), encoding="utf-8")
    return f"/media/daily-news/{date_str}.svg", 1200, 630


def ensure_article_visual(date_str: str) -> tuple[str, str, str]:
    article_path = ROOT / "pages" / "articles" / "daily" / date_str / "index.html"
    if not article_path.exists():
        raise RuntimeError(f"Generated article not found: {article_path}")

    text = article_path.read_text(encoding="utf-8")
    title = extract(text, r'<h1[^>]*class="article-title"[^>]*>(.*?)</h1>', "Дневен обзор на горивата")
    deck = extract(text, r'<p[^>]*class="article-news-deck"[^>]*>(.*?)</p>', "Актуални данни и анализ от goriva.online")
    body = extract(text, r'<div[^>]*class="article-content-full"[^>]*>(.*?)</div>', "")

    try:
        image_rel, width, height = generate_ai_image(date_str, title, deck, body)
        image_kind = "AI editorial illustration"
    except Exception as exc:
        print(f"Image generation warning: {exc}. Using text-free fallback artwork.")
        image_rel, width, height = generate_fallback_image(date_str, title)
        image_kind = "editorial illustration"

    image_abs = f"https://goriva.online{image_rel}"

    text = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{image_abs}">', text, count=1)
    text = re.sub(r'<meta property="og:image:width" content="[^"]*">', f'<meta property="og:image:width" content="{width}">', text, count=1)
    text = re.sub(r'<meta property="og:image:height" content="[^"]*">', f'<meta property="og:image:height" content="{height}">', text, count=1)
    if 'property="og:image:width"' not in text:
        text = text.replace(
            f'<meta property="og:image" content="{image_abs}">',
            f'<meta property="og:image" content="{image_abs}">\n  <meta property="og:image:width" content="{width}">\n  <meta property="og:image:height" content="{height}">',
            1,
        )
    if 'name="twitter:card"' not in text:
        text = text.replace(f'<meta property="og:image:height" content="{height}">', f'<meta property="og:image:height" content="{height}">\n  <meta name="twitter:card" content="summary_large_image">', 1)

    figure = f'''\n      <figure class="article-daily-visual">\n        <img class="article-image-main" src="{image_rel}" alt="Илюстрация към дневния обзор на горивата за {html.escape(format_bg_date(date_str))}" width="{width}" height="{height}" loading="eager" fetchpriority="high">\n        <figcaption class="article-image-caption">Илюстрация към дневния обзор на goriva.online.</figcaption>\n      </figure>'''
    if 'class="article-daily-visual"' in text:
        text = re.sub(r'\s*<figure class="article-daily-visual">.*?</figure>', figure, text, count=1, flags=re.S)
    else:
        text = re.sub(r'(\s*<div class="article-meta">.*?</div>)', r'\1' + figure, text, count=1, flags=re.S)

    # Keep structured data synchronized with the real hero image.
    if '"image"' in text:
        text = re.sub(r'"image"\s*:\s*"[^"]*"', f'"image": "{image_abs}"', text, count=1)
    else:
        text = text.replace('"mainEntityOfPage":', f'"image": "{image_abs}", "mainEntityOfPage":', 1)

    article_path.write_text(text, encoding="utf-8")
    print(f"Article image: {image_kind} -> {image_rel}")
    return title, deck, image_rel


def update_manifest(date_str: str, image_rel: str) -> list[dict]:
    items = load_manifest()
    found = False
    for item in items:
        if item.get("date") == date_str:
            item["image"] = image_rel
            found = True
            break
    if not found:
        raise RuntimeError(f"Manifest entry not found for {date_str}")
    items.sort(key=lambda item: item.get("date", ""), reverse=True)
    save_manifest(items)
    return items


def rebuild_news_daily_section(items: list[dict]) -> None:
    if not NEWS_PATH.exists():
        return
    text = NEWS_PATH.read_text(encoding="utf-8")
    start = "<!-- AUTO_DAILY_NEWS_START -->"
    end = "<!-- AUTO_DAILY_NEWS_END -->"
    cards = []
    for entry in items[:12]:
        url = html.escape(str(entry.get("url") or "#"), quote=True)
        title = html.escape(str(entry.get("title") or "Дневен обзор"))
        description = html.escape(str(entry.get("description") or ""))
        date_str = html.escape(str(entry.get("date") or ""))
        image = html.escape(str(entry.get("image") or "/media/og-3.png"), quote=True)
        cards.append(f'''<article class="article-card" data-category="analysis">
  <a class="article-card-media" href="{url}" style="background-image:url('{image}')"><span>Дневен обзор</span></a>
  <div class="article-content">
    <div class="article-date">{date_str} · Дневен обзор</div>
    <h3><a href="{url}">{title}</a></h3>
    <p>{description}</p>
    <a class="article-link" href="{url}">Прочети повече →</a>
  </div>
</article>''')

    section = f'''{start}
<section class="news-library auto-daily-news" aria-labelledby="daily-news-heading">
  <div class="section-heading-row"><div><span class="section-eyebrow">Ежедневно</span><h2 id="daily-news-heading">Дневни обзори на пазара</h2></div></div>
  <div class="articles-grid">{''.join(cards)}</div>
</section>
{end}'''
    pattern = re.escape(start) + r".*?" + re.escape(end)
    if re.search(pattern, text, flags=re.S):
        text = re.sub(pattern, section, text, flags=re.S)
    else:
        text = text.replace("</main>", section + "\n</main>", 1)
    NEWS_PATH.write_text(text, encoding="utf-8")


def main() -> None:
    date_str = resolve_target_date()
    title, deck, image_rel = ensure_article_visual(date_str)
    items = update_manifest(date_str, image_rel)
    rebuild_news_daily_section(items)
    print(json.dumps({"status": "postprocessed", "date": date_str, "title": title, "image": image_rel, "image_model": IMAGE_MODEL}, ensure_ascii=False))


if __name__ == "__main__":
    main()
