from __future__ import annotations

import html
import json
import os
import re
import textwrap
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOFIA = ZoneInfo("Europe/Sofia")
MANIFEST_PATH = ROOT / "data" / "generated-news.json"
NEWS_PATH = ROOT / "pages" / "news.html"


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


def wrap_lines(text: str, width: int, max_lines: int) -> list[str]:
    words = clean_text(text).split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        candidate = " ".join(current + [word])
        if len(candidate) <= width or not current:
            current.append(word)
            continue
        lines.append(" ".join(current))
        current = [word]
        if len(lines) == max_lines - 1:
            break
    if len(lines) < max_lines and current:
        remaining = " ".join(current)
        consumed = " ".join(lines + [remaining])
        if len(consumed.split()) < len(words):
            remaining = remaining.rstrip(" .,:;-") + "…"
        lines.append(remaining)
    return lines[:max_lines]


def format_bg_date(date_str: str) -> str:
    months = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"]
    dt = datetime.fromisoformat(date_str)
    return f"{dt.day} {months[dt.month - 1]} {dt.year}"


def build_svg(date_str: str, title: str, deck: str) -> str:
    title_lines = wrap_lines(title, 39, 4)
    deck_lines = wrap_lines(deck, 72, 2)
    title_tspans = "".join(
        f'<tspan x="78" dy="{0 if i == 0 else 54}">{html.escape(line)}</tspan>'
        for i, line in enumerate(title_lines)
    )
    deck_y = 392 + max(0, len(title_lines) - 2) * 24
    deck_tspans = "".join(
        f'<tspan x="80" dy="{0 if i == 0 else 29}">{html.escape(line)}</tspan>'
        for i, line in enumerate(deck_lines)
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
<title id="title">{html.escape(title)}</title>
<desc id="desc">Дневен обзор на цените на горивата от goriva.online за {html.escape(format_bg_date(date_str))}</desc>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#07111f"/><stop offset="0.58" stop-color="#102642"/><stop offset="1" stop-color="#0d3a2b"/></linearGradient>
  <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#22c55e"/></linearGradient>
  <filter id="glow"><feGaussianBlur stdDeviation="42"/></filter>
</defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<circle cx="1040" cy="70" r="190" fill="#2563eb" opacity=".16" filter="url(#glow)"/>
<circle cx="1065" cy="550" r="220" fill="#22c55e" opacity=".12" filter="url(#glow)"/>
<rect x="76" y="64" width="176" height="38" rx="19" fill="#ffffff" opacity=".08"/>
<circle cx="98" cy="83" r="5" fill="#22c55e"/>
<text x="114" y="89" fill="#dbeafe" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="1.3">ДНЕВЕН ОБЗОР</text>
<text x="78" y="146" fill="#93c5fd" font-family="Arial, sans-serif" font-size="21" font-weight="700">{html.escape(format_bg_date(date_str))}</text>
<text x="78" y="212" fill="#f8fafc" font-family="Arial, sans-serif" font-size="47" font-weight="800">{title_tspans}</text>
<text x="80" y="{deck_y}" fill="#b9c7d8" font-family="Arial, sans-serif" font-size="22">{deck_tspans}</text>
<rect x="78" y="542" width="1044" height="2" fill="url(#accent)" opacity=".85"/>
<text x="78" y="588" fill="#ffffff" font-family="Arial, sans-serif" font-size="28" font-weight="800">goriva.online</text>
<text x="1122" y="588" text-anchor="end" fill="#9fb0c3" font-family="Arial, sans-serif" font-size="17">Цени · данни · анализ</text>
</svg>'''


def ensure_article_visual(date_str: str) -> tuple[str, str, str]:
    article_path = ROOT / "pages" / "articles" / "daily" / date_str / "index.html"
    if not article_path.exists():
        raise RuntimeError(f"Generated article not found: {article_path}")

    text = article_path.read_text(encoding="utf-8")
    title = extract(text, r'<h1[^>]*class="article-title"[^>]*>(.*?)</h1>', "Дневен обзор на горивата")
    deck = extract(text, r'<p[^>]*class="article-news-deck"[^>]*>(.*?)</p>', "Актуални данни и анализ от goriva.online")
    image_rel = f"/media/daily-news/{date_str}.svg"
    image_abs = f"https://goriva.online{image_rel}"

    image_path = ROOT / "media" / "daily-news" / f"{date_str}.svg"
    image_path.parent.mkdir(parents=True, exist_ok=True)
    image_path.write_text(build_svg(date_str, title, deck), encoding="utf-8")

    text = re.sub(
        r'<meta property="og:image" content="[^"]*">',
        f'<meta property="og:image" content="{image_abs}">',
        text,
        count=1,
    )
    if 'property="og:image:width"' not in text:
        text = text.replace(
            f'<meta property="og:image" content="{image_abs}">',
            f'<meta property="og:image" content="{image_abs}">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n  <meta name="twitter:card" content="summary_large_image">',
            1,
        )

    figure = f'''\n      <figure class="article-daily-visual">\n        <img class="article-image-main" src="{image_rel}" alt="Дневен обзор на цените на горивата за {html.escape(format_bg_date(date_str))}" width="1200" height="630">\n        <figcaption class="article-image-caption">Автоматично генерирана визуализация към дневния обзор на goriva.online.</figcaption>\n      </figure>'''
    if 'class="article-daily-visual"' not in text:
        text = re.sub(r'(\s*<div class="article-meta">.*?</div>)', r'\1' + figure, text, count=1, flags=re.S)

    article_path.write_text(text, encoding="utf-8")
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
    print(json.dumps({"status": "postprocessed", "date": date_str, "title": title, "image": image_rel}, ensure_ascii=False))


if __name__ == "__main__":
    main()
