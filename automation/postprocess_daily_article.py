from __future__ import annotations

import base64
import html
import json
import math
import os
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from openai import OpenAI

import automation.generate_daily_article_bg as base

ROOT = Path(__file__).resolve().parents[1]
SOFIA = ZoneInfo("Europe/Sofia")
MANIFEST_PATH = ROOT / "data" / "generated-news.json"
NEWS_PATH = ROOT / "pages" / "news.html"
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2")
MIN_CITY_RANKING_COUNT = 10
FUEL_ORDER = ("Бензин A95", "Дизел", "LPG", "Метан")
FUEL_LABELS = {"Бензин A95": "A95", "Дизел": "Дизел", "LPG": "LPG", "Метан": "Метан"}


def load_manifest() -> list[dict]:
    if not MANIFEST_PATH.exists():
        return []
    try:
        value = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
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
    return max(changed)[1] if changed else datetime.now(SOFIA).date().isoformat()


def extract(html_text: str, pattern: str, fallback: str = "") -> str:
    match = re.search(pattern, html_text, flags=re.I | re.S)
    return html.unescape(match.group(1).strip()) if match else fallback


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value or "")).strip()


def format_bg_date(date_str: str) -> str:
    months = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"]
    dt = datetime.fromisoformat(date_str)
    return f"{dt.day} {months[dt.month - 1]} {dt.year}"


def get_facts(date_str: str) -> dict:
    rows = base.fetch_rows()
    by_day = base.build_daily_snapshots(rows)
    if date_str not in by_day:
        raise RuntimeError(f"No fuel data for article date {date_str}")
    days = sorted(by_day)
    previous_day = next((d for d in reversed(days) if d < date_str), None)
    current = base.summarize_day(by_day[date_str])
    current["city_averages"] = [
        item for item in current.get("city_averages", [])
        if int(item.get("count", 0)) >= MIN_CITY_RANKING_COUNT
    ]
    previous = base.summarize_day(by_day[previous_day]) if previous_day else None
    if previous:
        previous["city_averages"] = [
            item for item in previous.get("city_averages", [])
            if int(item.get("count", 0)) >= MIN_CITY_RANKING_COUNT
        ]
    return base.build_facts(date_str, current, previous_day, previous)


def build_image_prompt(date_str: str, title: str, deck: str, body: str) -> str:
    return f"""
Create a premium editorial hero image for a Bulgarian fuel-price market article.
Article date: {format_bg_date(date_str)}
Headline meaning: {clean_text(title)}
Deck: {clean_text(deck)}
Article context: {clean_text(body)[:1200]}

Visual direction:
- realistic editorial photography or polished cinematic editorial illustration;
- clearly related to petrol stations, fuel pumps, road transport, fuel pricing or market movement;
- interpret the article's actual subject rather than making a generic fuel image;
- modern European/Bulgarian roadside atmosphere where appropriate;
- restrained, trustworthy business-news mood;
- landscape composition with useful negative space;
- no headline, date, prices, labels, logos, station brands, watermarks or legible text;
- no fake UI, infographic panels or typography-as-art.
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
    path = ROOT / "media" / "daily-news" / f"{date_str}.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(base64.b64decode(response.data[0].b64_json))
    return f"/media/daily-news/{date_str}.png", 1536, 1024


def build_fallback_svg(title: str) -> str:
    label = html.escape(clean_text(title))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="{label}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#071321"/><stop offset=".55" stop-color="#16324d"/><stop offset="1" stop-color="#123c31"/></linearGradient></defs>
<rect width="1200" height="630" fill="url(#bg)"/><path d="M0 520 C260 455 450 490 650 520 C850 550 1010 525 1200 455 L1200 630 L0 630 Z" fill="#111827"/><path d="M0 548 C270 490 455 515 650 545 C850 575 1010 548 1200 490" fill="none" stroke="#f8fafc" stroke-width="5" stroke-dasharray="34 27" opacity=".55"/>
<g transform="translate(190 120)"><rect width="230" height="310" rx="28" fill="#e5edf6"/><rect x="28" y="34" width="174" height="100" rx="14" fill="#17283b"/><rect x="45" y="170" width="60" height="90" rx="13" fill="#3b82f6"/><rect x="128" y="170" width="60" height="90" rx="13" fill="#22c55e"/></g>
<path d="M650 240 L755 290 L850 265 L960 360 L1070 405" fill="none" stroke="#34d399" stroke-width="8" stroke-linecap="round"/>
</svg>'''


def generate_fallback_image(date_str: str, title: str) -> tuple[str, int, int]:
    path = ROOT / "media" / "daily-news" / f"{date_str}.svg"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(build_fallback_svg(title), encoding="utf-8")
    return f"/media/daily-news/{date_str}.svg", 1200, 630


def fmt(value: float, digits: int = 3) -> str:
    text = f"{value:.{digits}f}".rstrip("0").rstrip(".")
    return text.replace(".", ",")


def svg_bar_chart(title: str, subtitle: str, rows: list[tuple[str, float]], value_suffix: str, zero_baseline: bool = False) -> str:
    width, height = 1200, 620
    left, right, top, bottom = 110, 75, 150, 105
    plot_w, plot_h = width - left - right, height - top - bottom
    vals = [v for _, v in rows] or [0]
    if zero_baseline:
        max_abs = max(max(abs(v) for v in vals), 0.001)
        lo, hi = -max_abs * 1.18, max_abs * 1.18
    else:
        lo = min(vals)
        hi = max(vals)
        pad = max((hi - lo) * 0.22, max(abs(hi), 1) * 0.035)
        lo = max(0, lo - pad)
        hi = hi + pad
        if math.isclose(lo, hi):
            hi = lo + 1

    def y(value: float) -> float:
        return top + (hi - value) / (hi - lo) * plot_h

    zero_y = y(0) if lo <= 0 <= hi else top + plot_h
    bar_gap = 34
    bar_w = (plot_w - bar_gap * (len(rows) - 1)) / max(len(rows), 1)
    parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}">
<rect width="1200" height="620" rx="28" fill="#ffffff"/>
<text x="70" y="62" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="800" fill="#0f172a">{html.escape(title)}</text>
<text x="70" y="98" font-family="Inter,Arial,sans-serif" font-size="16" fill="#64748b">{html.escape(subtitle)}</text>
<line x1="{left}" x2="{width-right}" y1="{zero_y:.1f}" y2="{zero_y:.1f}" stroke="#cbd5e1" stroke-width="2"/>''']
    for i, (label, value) in enumerate(rows):
        x = left + i * (bar_w + bar_gap)
        vy = y(value)
        if zero_baseline:
            rect_y = min(vy, zero_y)
            rect_h = max(abs(zero_y - vy), 3)
        else:
            rect_y = vy
            rect_h = max(top + plot_h - vy, 3)
        parts.append(f'<rect x="{x:.1f}" y="{rect_y:.1f}" width="{bar_w:.1f}" height="{rect_h:.1f}" rx="14" fill="url(#barGrad)"/>')
        value_text = f"{fmt(value)}{value_suffix}"
        label_y = rect_y - 16 if value >= 0 else rect_y + rect_h + 28
        parts.append(f'<text x="{x+bar_w/2:.1f}" y="{label_y:.1f}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="800" fill="#0f172a">{html.escape(value_text)}</text>')
        parts.append(f'<text x="{x+bar_w/2:.1f}" y="{height-58}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="700" fill="#334155">{html.escape(label)}</text>')
    parts.insert(1, '<defs><linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#22c55e"/></linearGradient></defs>')
    parts.append('</svg>')
    return ''.join(parts)


def svg_horizontal_ranking(title: str, subtitle: str, rows: list[tuple[str, float]]) -> str:
    width, height = 1200, 650
    max_v = max((v for _, v in rows), default=1)
    min_v = min((v for _, v in rows), default=0)
    span = max(max_v - min_v, 0.01)
    parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}">
<defs><linearGradient id="rankGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>
<rect width="1200" height="650" rx="28" fill="#ffffff"/>
<text x="70" y="62" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="800" fill="#0f172a">{html.escape(title)}</text>
<text x="70" y="98" font-family="Inter,Arial,sans-serif" font-size="16" fill="#64748b">{html.escape(subtitle)}</text>''']
    for i, (label, value) in enumerate(rows):
        y = 150 + i * 88
        w = 360 + ((value - min_v) / span) * 520 if span else 700
        parts.append(f'<text x="70" y="{y+28}" font-family="Inter,Arial,sans-serif" font-size="19" font-weight="750" fill="#334155">{html.escape(label[:28])}</text>')
        parts.append(f'<rect x="360" y="{y}" width="{w:.1f}" height="46" rx="13" fill="url(#rankGrad)" opacity=".92"/>')
        parts.append(f'<text x="{min(360+w+18,1080):.1f}" y="{y+30}" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="800" fill="#0f172a">{fmt(value)} €</text>')
    parts.append('</svg>')
    return ''.join(parts)


def generate_charts(date_str: str, facts: dict) -> list[dict]:
    out_dir = ROOT / "media" / "daily-news" / date_str
    out_dir.mkdir(parents=True, exist_ok=True)
    charts: list[dict] = []

    averages = []
    for fuel in FUEL_ORDER:
        item = facts.get("fuels", {}).get(fuel)
        if item:
            averages.append((FUEL_LABELS[fuel], float(item["average"])))
    if averages:
        path = out_dir / "average-prices.svg"
        path.write_text(svg_bar_chart("Средни цени в наблюдаваната извадка", "Стойности за деня по основни видове гориво", averages, " €"), encoding="utf-8")
        charts.append({"kind": "averages", "src": f"/media/daily-news/{date_str}/average-prices.svg", "title": "Средни цени по горива", "caption": "Средни стойности в наблюдаваната извадка на goriva.online."})

    changes = []
    for fuel in FUEL_ORDER:
        item = facts.get("fuels", {}).get(fuel) or {}
        change = item.get("change")
        if change:
            changes.append((FUEL_LABELS[fuel], float(change["absolute"])))
    if changes:
        path = out_dir / "daily-change.svg"
        path.write_text(svg_bar_chart("Промяна спрямо предходния ден", "Разлика в средната цена за литър", changes, " €", zero_baseline=True), encoding="utf-8")
        charts.append({"kind": "change", "src": f"/media/daily-news/{date_str}/daily-change.svg", "title": "Дневна промяна", "caption": "Промяна на средната цена спрямо предходния наличен ден."})

    ranking_fuel = None
    ranking_rows = []
    for fuel in FUEL_ORDER:
        candidates = facts.get("cheapest_cities", {}).get(fuel) or []
        candidates = [x for x in candidates if int(x.get("count", 0)) >= MIN_CITY_RANKING_COUNT]
        if len(candidates) >= 3:
            ranking_fuel = fuel
            ranking_rows = [(str(x["city"]), float(x["average"])) for x in candidates[:5]]
            break
    if ranking_rows:
        path = out_dir / "cheapest-cities.svg"
        path.write_text(svg_horizontal_ranking(f"Градове с по-ниски наблюдавани цени: {FUEL_LABELS[ranking_fuel]}", "Класацията включва само градове с достатъчно наблюдения", ranking_rows), encoding="utf-8")
        charts.append({"kind": "cities", "src": f"/media/daily-news/{date_str}/cheapest-cities.svg", "title": "Градове с по-ниски цени", "caption": f"Класация за {FUEL_LABELS[ranking_fuel]} сред градовете с достатъчно наблюдения."})

    return charts


def chart_figure(chart: dict) -> str:
    return f'''<figure class="article-data-chart" data-chart-kind="{html.escape(chart['kind'])}">
  <img src="{html.escape(chart['src'], quote=True)}" alt="{html.escape(chart['title'])}" loading="lazy" decoding="async">
  <figcaption>{html.escape(chart['caption'])}</figcaption>
</figure>'''


def insert_after_heading(body: str, keywords: tuple[str, ...], block: str) -> tuple[str, bool]:
    pattern = re.compile(r"(<h2\b[^>]*>(.*?)</h2>)", flags=re.I | re.S)
    for match in pattern.finditer(body):
        label = clean_text(match.group(2)).lower()
        if any(word in label for word in keywords):
            pos = match.end()
            return body[:pos] + block + body[pos:], True
    return body, False


def build_snapshot(facts: dict) -> str:
    coverage = facts.get("coverage", {})
    cards = [
        ("Наблюдения", str(coverage.get("records", "—"))),
        ("Бензиностанции", str(coverage.get("stations", "—"))),
        ("Градове", str(coverage.get("cities", "—"))),
    ]
    fuel_cards = []
    for fuel in FUEL_ORDER[:3]:
        item = facts.get("fuels", {}).get(fuel)
        if item:
            fuel_cards.append((FUEL_LABELS[fuel], f"{item['display']['average']} €"))
    all_cards = cards + fuel_cards
    return '<section class="article-snapshot" aria-label="Ключови данни за деня">' + ''.join(
        f'<div class="article-snapshot-card"><span>{html.escape(label)}</span><strong>{html.escape(value)}</strong></div>'
        for label, value in all_cards
    ) + '</section>'


def enrich_article(date_str: str, facts: dict, charts: list[dict]) -> tuple[str, str, str]:
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
    if 'property="og:image:width"' not in text:
        text = text.replace(f'<meta property="og:image" content="{image_abs}">', f'<meta property="og:image" content="{image_abs}">\n  <meta property="og:image:width" content="{width}">\n  <meta property="og:image:height" content="{height}">', 1)
    text = re.sub(r'/pages/styles/article-modern\.css\?v=[^"\']+', '/pages/styles/article-modern.css?v=20260830-data-viz1', text)

    figure = f'''<figure class="article-daily-visual">
  <img class="article-image-main" src="{image_rel}" alt="Илюстрация към дневния обзор на горивата за {html.escape(format_bg_date(date_str))}" width="{width}" height="{height}" loading="eager" fetchpriority="high">
  <figcaption class="article-image-caption">Илюстрация към дневния обзор на goriva.online.</figcaption>
</figure>'''
    if 'class="article-daily-visual"' in text:
        text = re.sub(r'<figure class="article-daily-visual">.*?</figure>', figure, text, count=1, flags=re.S)
    else:
        text = re.sub(r'(\s*<div class="article-meta">.*?</div>)', r'\1\n' + figure, text, count=1, flags=re.S)

    if 'class="article-snapshot"' not in text:
        text = text.replace('</figure>\n      <div class="article-content-full">', '</figure>\n      ' + build_snapshot(facts) + '\n      <div class="article-content-full">', 1)

    content_match = re.search(r'(<div class="article-content-full">)(.*?)(</div>\s*</article>)', text, flags=re.S)
    if content_match:
        content = content_match.group(2)
        fallback_blocks = []
        for chart in charts:
            block = chart_figure(chart)
            if chart["kind"] == "averages":
                content, ok = insert_after_heading(content, ("цените", "днес"), block)
            elif chart["kind"] == "change":
                content, ok = insert_after_heading(content, ("промени", "спрямо", "движ"), block)
            else:
                content, ok = insert_after_heading(content, ("къде", "град", "евтин"), block)
            if not ok:
                fallback_blocks.append(block)
        if fallback_blocks:
            content = ''.join(fallback_blocks) + content
        cta = '''<section class="article-modern-end"><div><strong>Провери актуалните цени</strong><p>Разгледай текущите данни по град, гориво и бензиностанция в goriva.online.</p></div><a href="/">Към актуалните цени →</a></section>'''
        content += cta
        text = text[:content_match.start(2)] + content + text[content_match.end(2):]

    if '"image"' in text:
        text = re.sub(r'"image"\s*:\s*"[^"]*"', f'"image": "{image_abs}"', text, count=1)
    else:
        text = text.replace('"mainEntityOfPage":', f'"image": "{image_abs}", "mainEntityOfPage":', 1)

    article_path.write_text(text, encoding="utf-8")
    print(f"Article image: {image_kind} -> {image_rel}")
    print(f"Charts generated: {len(charts)}")
    return title, deck, image_rel


def update_manifest(date_str: str, image_rel: str) -> list[dict]:
    items = load_manifest()
    for item in items:
        if item.get("date") == date_str:
            item["image"] = image_rel
            break
    else:
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
  <div class="article-content"><div class="article-date">{date_str} · Дневен обзор</div><h3><a href="{url}">{title}</a></h3><p>{description}</p><a class="article-link" href="{url}">Прочети повече →</a></div>
</article>''')
    section = f'''{start}
<section class="news-library auto-daily-news" aria-labelledby="daily-news-heading">
  <div class="section-heading-row"><div><span class="section-eyebrow">Ежедневно</span><h2 id="daily-news-heading">Дневни обзори на пазара</h2></div></div>
  <div class="articles-grid">{''.join(cards)}</div>
</section>
{end}'''
    pattern = re.escape(start) + r".*?" + re.escape(end)
    text = re.sub(pattern, section, text, flags=re.S) if re.search(pattern, text, flags=re.S) else text.replace("</main>", section + "\n</main>", 1)
    NEWS_PATH.write_text(text, encoding="utf-8")


def main() -> None:
    date_str = resolve_target_date()
    facts = get_facts(date_str)
    charts = generate_charts(date_str, facts)
    _, _, image_rel = enrich_article(date_str, facts, charts)
    items = update_manifest(date_str, image_rel)
    rebuild_news_daily_section(items)
    print(json.dumps({"status": "postprocessed", "date": date_str, "image": image_rel, "charts": [c["src"] for c in charts]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
