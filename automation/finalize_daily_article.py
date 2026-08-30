from __future__ import annotations

import html
import os
import re
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def target_date() -> str:
    requested = os.getenv("ARTICLE_DATE", "").strip()
    if requested:
        return requested
    daily_root = ROOT / "pages" / "articles" / "daily"
    candidates = sorted(p.parent.name for p in daily_root.glob("*/index.html"))
    if not candidates:
        raise RuntimeError("No generated daily article found")
    return candidates[-1]


def money_2(value: str) -> str:
    normalized = value.replace(",", ".")
    rounded = Decimal(normalized).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"{rounded:.2f}".replace(".", ",")


def round_euro_values(text: str) -> str:
    pattern = re.compile(r"(?<!\d)(\d+(?:[\.,]\d{1,4})?)(?=\s*€)")
    return pattern.sub(lambda m: money_2(m.group(1)), text)


def clean_heading(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value)).strip().lower()


def extract_chart(section_html: str) -> tuple[str, str]:
    pattern = re.compile(r"<figure\b[^>]*class=\"[^\"]*article-data-chart[^\"]*\"[^>]*>.*?</figure>", re.I | re.S)
    match = pattern.search(section_html)
    if not match:
        return section_html, ""
    return section_html[:match.start()] + section_html[match.end():], match.group(0)


def build_side_image(date_str: str, preferred_slug: str | None = None) -> str:
    candidates: list[tuple[Path, str]] = []
    if preferred_slug:
        candidates.append((ROOT / "media" / "daily-news" / date_str / f"section-{preferred_slug}.png", f"/media/daily-news/{date_str}/section-{preferred_slug}.png"))
    candidates.extend([
        (ROOT / "media" / "daily-news" / f"{date_str}.png", f"/media/daily-news/{date_str}.png"),
        (ROOT / "media" / "daily-news" / f"{date_str}.svg", f"/media/daily-news/{date_str}.svg"),
    ])
    src = ""
    for path, rel in candidates:
        if path.exists():
            src = rel
            break
    if not src:
        return ""
    return (
        '<figure class="editorial-side-image">'
        f'<img src="{html.escape(src, quote=True)}" alt="Визуален контекст към пазара на горива" loading="lazy" decoding="async">'
        '<figcaption>Редакционна илюстрация към дневния обзор на goriva.online.</figcaption>'
        '</figure>'
    )


def reshape_content(body: str, date_str: str) -> str:
    if "article-editorial-layout" in body:
        return body

    heading_pattern = re.compile(r"<h2\b[^>]*>.*?</h2>", re.I | re.S)
    matches = list(heading_pattern.finditer(body))
    if not matches:
        return body

    intro = body[:matches[0].start()].strip()
    sections: list[str] = []

    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        heading = match.group(0)
        section_rest = body[match.end():end].strip()
        label = clean_heading(heading)

        copy_html, chart_html = extract_chart(section_rest)
        copy_html = copy_html.strip()

        if "пазарен контекст" in label:
            visual = build_side_image(date_str, "market")
            if visual:
                copy_html = re.sub(r'<figure\b[^>]*class="[^"]*editorial-inline-ai-image[^"]*"[^>]*>.*?</figure>', '', copy_html, flags=re.I | re.S)
                sections.append(
                    '<section class="editorial-section editorial-section--split editorial-section--image">'
                    f'<div class="editorial-section-copy">{heading}{copy_html}</div>'
                    f'<div class="editorial-section-visual">{visual}</div>'
                    '</section>'
                )
                if chart_html:
                    sections.append(f'<section class="editorial-section editorial-section--visual-wide">{chart_html}</section>')
                continue

        if chart_html:
            reverse = " editorial-section--reverse" if index % 2 else ""
            sections.append(
                f'<section class="editorial-section editorial-section--split{reverse}">'
                f'<div class="editorial-section-copy">{heading}{copy_html}</div>'
                f'<div class="editorial-section-visual">{chart_html}</div>'
                '</section>'
            )
        elif index % 2 == 1 and "какво да следим" not in label:
            sections.append(
                '<section class="editorial-section editorial-section--columns">'
                f'{heading}<div class="editorial-columns">{copy_html}</div>'
                '</section>'
            )
        else:
            special = " editorial-section--watch" if "какво да следим" in label else ""
            sections.append(f'<section class="editorial-section{special}">{heading}{copy_html}</section>')

    intro_block = ""
    if intro:
        intro_block = (
            '<section class="editorial-intro">'
            '<div class="editorial-intro-rule" aria-hidden="true"></div>'
            f'<div class="editorial-intro-copy">{intro}</div>'
            '</section>'
        )

    return '<div class="article-editorial-layout">' + intro_block + ''.join(sections) + '</div>'


def enhance_article(date_str: str) -> None:
    path = ROOT / "pages" / "articles" / "daily" / date_str / "index.html"
    if not path.exists():
        raise RuntimeError(f"Generated article not found: {path}")

    text = path.read_text(encoding="utf-8")
    text = round_euro_values(text)

    stylesheet = '/pages/styles/daily-editorial-layout.css?v=20260830-3'
    if stylesheet not in text:
        text = re.sub(r'/pages/styles/daily-editorial-layout\.css\?v=[^"\']+', stylesheet, text)
        if stylesheet not in text:
            link = f'  <link rel="stylesheet" href="{stylesheet}">\n'
            text = text.replace("</head>", link + "</head>", 1)

    content_pattern = re.compile(r'(<div\b[^>]*class="[^"]*article-content-full[^"]*"[^>]*>)(.*?)(</div>\s*</article>)', re.I | re.S)
    match = content_pattern.search(text)
    if match:
        reshaped = reshape_content(match.group(2), date_str)
        text = text[:match.start(2)] + reshaped + text[match.end(2):]

    path.write_text(text, encoding="utf-8")


def enhance_charts(date_str: str) -> None:
    chart_dir = ROOT / "media" / "daily-news" / date_str
    if not chart_dir.exists():
        return
    for svg in chart_dir.glob("*.svg"):
        source = svg.read_text(encoding="utf-8")
        updated = round_euro_values(source)
        if updated != source:
            svg.write_text(updated, encoding="utf-8")


def main() -> None:
    date_str = target_date()
    enhance_charts(date_str)
    enhance_article(date_str)
    print(f"Finalized reader-facing article layout and 2-decimal euro prices for {date_str}")


if __name__ == "__main__":
    main()
