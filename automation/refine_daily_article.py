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
    root = ROOT / "pages" / "articles" / "daily"
    dates = sorted(p.parent.name for p in root.glob("*/index.html"))
    if not dates:
        raise RuntimeError("No daily article found")
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
        print(f"Daily editorial image generation skipped for {path.name}: {exc}")
        return False


def site_header() -> str:
    return '''<div class="background"></div>
<header class="header-bar daily-site-header"><div class="header-container"><a href="/" class="daily-logo-link"><img src="/media/2logo.png" alt="goriva.online logo" class="header-logo"></a><div class="header-text"><strong>Цени на горивата днес</strong><span>Дневни анализи, сравнения и актуални данни от goriva.online.</span></div><a class="facebook-button" href="https://www.facebook.com/groups/960591129738525" target="_blank" rel="noopener noreferrer">Facebook група</a></div></header>
<nav class="main-nav"><button id="menu-toggle" class="menu-toggle" type="button" aria-label="Отвори менюто">☰</button><div id="nav-menu" class="nav-container"><a href="/">Начало</a><a href="/pages/useful.html">Полезно</a><a href="/pages/trends.html">История на цените</a><a href="/pages/weather.html">Прогноза за времето</a><a href="/pages/business-clients.html">Бизнес клиенти</a><a href="/pages/news.html">Новини</a><a href="/pages/rules.html">Общи условия</a></div></nav>'''


def figure(src: str, alt: str, caption: str, slug: str) -> str:
    return (
        f'<figure class="daily-text-image daily-text-image--{slug}">'
        f'<img src="{src}" alt="{alt}" loading="lazy" decoding="async">'
        f'<figcaption>{caption}</figcaption>'
        '</figure>'
    )


def insert_before_heading(text: str, headings: tuple[str, ...], block: str) -> str:
    for heading in headings:
        pattern = re.compile(rf'<h2\b[^>]*>\s*{re.escape(heading)}\s*</h2>', re.I)
        match = pattern.search(text)
        if match:
            return text[:match.start()] + block + text[match.start():]
    return text


def remove_charts(text: str) -> str:
    # Remove all chart figures produced by the previous visual enrichment pipeline.
    text = re.sub(
        r'<figure\b[^>]*class="[^"]*article-data-chart[^"]*"[^>]*>.*?</figure>',
        '',
        text,
        flags=re.I | re.S,
    )
    text = re.sub(
        r'<div\b[^>]*class="[^"]*editorial-section-visual[^"]*"[^>]*>\s*</div>',
        '',
        text,
        flags=re.I | re.S,
    )
    # Sections that used to be split around a chart should return to normal full-width editorial sections.
    text = re.sub(
        r'class="editorial-section\s+editorial-section--split(?:\s+editorial-section--reverse)?"',
        'class="editorial-section"',
        text,
        flags=re.I,
    )
    text = re.sub(
        r'class="editorial-section\s+editorial-section--visual-wide"',
        'class="editorial-section"',
        text,
        flags=re.I,
    )
    return text


def refine(date_str: str) -> None:
    article_path = ROOT / "pages" / "articles" / "daily" / date_str / "index.html"
    if not article_path.exists():
        raise RuntimeError(f"Daily article not found: {article_path}")

    text = article_path.read_text(encoding="utf-8")
    media = ROOT / "media" / "daily-news" / date_str
    media.mkdir(parents=True, exist_ok=True)

    text = remove_charts(text)

    # Remove section images from earlier runs so regeneration is idempotent.
    text = re.sub(
        r'<figure\b[^>]*class="[^"]*daily-text-image[^"]*"[^>]*>.*?</figure>',
        '',
        text,
        flags=re.I | re.S,
    )

    # Match the Sofia article shell: real site header/navigation and professional page wrapper.
    if '<header class="header-bar' not in text:
        text = text.replace('<body>', '<body>\n' + site_header(), 1)
    if 'daily-professional-article-page' not in text:
        text = text.replace('<main class="article-page">', '<main class="article-page daily-professional-article-page">', 1)
    text = text.replace('<article>', '<article class="article-shell">', 1)

    # Keep the existing hero generated by postprocess_daily_article, but style it like the Sofia hero.
    text = text.replace('class="article-daily-visual"', 'class="article-daily-visual daily-hero-visual"')

    images = {
        "sofia": (
            media / "section-sofia.png",
            "Premium editorial photograph for a Bulgarian fuel-price article. Sofia urban boulevard with modern petrol station context and everyday traffic, realistic European city atmosphere, polished economic-news photography, no logos, no readable text, no prices, landscape composition.",
            "Градски трафик и бензиностанция в София",
            "София остава един от най-конкурентните пазари за горива заради големия брой обекти и интензивния трафик.",
            ("Цени на горивата в София",),
        ),
        "plovdiv": (
            media / "section-plovdiv.png",
            "Editorial documentary photograph for a Bulgarian fuel-price market article. Plovdiv urban road environment with cars and a modern fuel station in the middle distance, realistic Bulgarian city atmosphere, professional business-news photography, no brand logos, no readable signs, no prices, landscape orientation.",
            "Градско движение и бензиностанция в Пловдив",
            "Разликите между големите градове се влияят от конкуренцията, локацията и конкретните търговски условия на станциите.",
            ("Цени на горивата в Пловдив",),
        ),
        "varna": (
            media / "section-varna.png",
            "Professional editorial photograph for a Bulgarian article about fuel prices in Varna. Coastal Bulgarian city road with everyday traffic and petrol station context, realistic modern European visual language, clean economic-news photography, no logos, no readable text, no prices, landscape composition.",
            "Трафик и горивна инфраструктура във Варна",
            "Във Варна цените се разглеждат в контекста на градския трафик и ролята на основните входно-изходни направления.",
            ("Цени на горивата във Варна",),
        ),
        "comparison": (
            media / "section-comparison.png",
            "Premium editorial image about comparing fuel prices across Bulgarian cities. Modern Bulgarian highway and urban interchange with passenger cars, visual sense of regional travel and fuel choice, realistic business-news photography, no maps, no logos, no text, no prices, landscape orientation.",
            "Пътуване между големите градове и сравнение на разходите за гориво",
            "Сравнението между градовете е най-полезно, когато се разглежда заедно с маршрута и реалното потребление на автомобила.",
            ("Сравнение между големите градове", "Сравнение на цените между големите градове"),
        ),
        "market": (
            media / "section-market.png",
            "Editorial economic-news photograph about the fuel market in Bulgaria. Fuel tanker logistics, refinery or distribution infrastructure at a distance, professional realistic business journalism style, no company logos, no readable text, no numbers, no prices, landscape composition.",
            "Логистика и пазарен контекст при доставките на горива",
            "Цените на колонката са свързани и с по-широкия контекст на доставки, логистика и международни пазари.",
            ("Пазарен контекст от български източници",),
        ),
    }

    for slug, (path, prompt, alt, caption, headings) in images.items():
        if not path.exists():
            generate_image(path, prompt)
        if path.exists():
            src = f"/media/daily-news/{date_str}/{path.name}"
            text = insert_before_heading(text, headings, figure(src, alt, caption, slug))

    # Ensure the shared site footer and scripts are present exactly once.
    text = re.sub(r'<footer\b[^>]*class="[^"]*sofia-footer[^"]*"[^>]*>.*?</footer>', '', text, flags=re.I | re.S)
    if 'class="site-footer"' not in text:
        text = text.replace('</body>', '<footer class="site-footer"></footer>\n</body>', 1)
    if '/scripts/script.js' not in text:
        text = text.replace('</body>', '<script src="/scripts/script.js" defer></script>\n</body>', 1)
    if '/scripts/article-engagement.js' not in text:
        text = text.replace('</body>', '<script src="/scripts/article-engagement.js?v=20260830-3" defer></script>\n</body>', 1)

    css = '/pages/styles/daily-professional-article.css?v=20260831-1'
    if css not in text:
        text = text.replace('</head>', f'  <link rel="stylesheet" href="{css}">\n</head>', 1)

    article_path.write_text(text, encoding="utf-8")
    print(f"Daily article refined to Sofia-style editorial structure for {date_str}")


def main() -> None:
    refine(resolve_date())


if __name__ == "__main__":
    main()
