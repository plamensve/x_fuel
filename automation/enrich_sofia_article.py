from __future__ import annotations

import base64
import html
import os
import re
from pathlib import Path

from openai import OpenAI

import automation.generate_daily_article_bg as base
import automation.generate_sofia_article as sofia

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


def facts_for(date_str: str) -> dict:
    rows = base.fetch_rows()
    by_day = base.build_daily_snapshots(rows)
    if date_str not in by_day:
        raise RuntimeError(f"No data for Sofia article date {date_str}")
    current = sofia.summarize_sofia(by_day[date_str])
    previous_day = next((d for d in reversed(sorted(by_day)) if d < date_str and sofia.summarize_sofia(by_day[d])["records"]), None)
    previous = sofia.summarize_sofia(by_day[previous_day]) if previous_day else None
    return sofia.build_facts(date_str, current, previous_day, previous)


def svg_bar_chart(title: str, subtitle: str, rows: list[tuple[str, float]], suffix: str = " €") -> str:
    width, height = 1200, 620
    left, right, top, bottom = 90, 70, 150, 100
    plot_w, plot_h = width - left - right, height - top - bottom
    values = [v for _, v in rows] or [0]
    lo, hi = min(values), max(values)
    pad = max((hi - lo) * .35, .08)
    lo = max(0, lo - pad)
    hi += pad
    span = max(hi - lo, .01)
    gap = 45
    bar_w = (plot_w - gap * max(0, len(rows) - 1)) / max(1, len(rows))
    parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}">
<defs><linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1d4ed8"/><stop offset="1" stop-color="#22c55e"/></linearGradient></defs>
<rect width="1200" height="620" rx="30" fill="#ffffff"/>
<text x="70" y="65" font-family="Arial,sans-serif" font-size="31" font-weight="800" fill="#0f172a">{html.escape(title)}</text>
<text x="70" y="103" font-family="Arial,sans-serif" font-size="17" fill="#64748b">{html.escape(subtitle)}</text>''']
    for i, (label, value) in enumerate(rows):
        x = left + i * (bar_w + gap)
        y = top + (hi - value) / span * plot_h
        h = top + plot_h - y
        parts.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" height="{max(h,4):.1f}" rx="16" fill="url(#g)"/>')
        parts.append(f'<text x="{x+bar_w/2:.1f}" y="{y-17:.1f}" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="800" fill="#0f172a">{value:.2f}{html.escape(suffix)}</text>')
        parts.append(f'<text x="{x+bar_w/2:.1f}" y="{height-50}" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#334155">{html.escape(label)}</text>')
    parts.append('</svg>')
    return ''.join(parts)


def svg_range_chart(facts: dict) -> str:
    width, height = 1200, 620
    items = []
    for fuel, label in (("Бензин A95", "A95"), ("Дизел", "Дизел"), ("LPG", "LPG")):
        data = facts.get("fuels", {}).get(fuel)
        if data:
            items.append((label, float(data["minimum"]), float(data["average"]), float(data["maximum"])))
    all_values = [v for _, a, b, c in items for v in (a,b,c)] or [0,1]
    lo, hi = min(all_values), max(all_values)
    pad = max((hi-lo)*.08, .02)
    lo, hi = max(0,lo-pad), hi+pad
    span = max(hi-lo,.01)
    x0, x1 = 255, 1080
    def x(v: float) -> float: return x0 + (v-lo)/span*(x1-x0)
    parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="Минимални, средни и максимални цени в София">
<rect width="1200" height="620" rx="30" fill="#ffffff"/>
<text x="70" y="65" font-family="Arial,sans-serif" font-size="31" font-weight="800" fill="#0f172a">Ценови диапазон в София</text>
<text x="70" y="103" font-family="Arial,sans-serif" font-size="17" fill="#64748b">Минимална, средна и максимална наблюдавана цена</text>''']
    for i,(label,mn,av,mx) in enumerate(items):
        y=190+i*125
        parts.append(f'<text x="70" y="{y+8}" font-family="Arial,sans-serif" font-size="20" font-weight="800" fill="#334155">{html.escape(label)}</text>')
        parts.append(f'<line x1="{x(mn):.1f}" x2="{x(mx):.1f}" y1="{y}" y2="{y}" stroke="#cbd5e1" stroke-width="16" stroke-linecap="round"/>')
        parts.append(f'<circle cx="{x(mn):.1f}" cy="{y}" r="11" fill="#22c55e"/><circle cx="{x(av):.1f}" cy="{y}" r="13" fill="#2563eb"/><circle cx="{x(mx):.1f}" cy="{y}" r="11" fill="#0f172a"/>')
        parts.append(f'<text x="{x(mn):.1f}" y="{y+42}" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#475569">{mn:.2f} €</text>')
        parts.append(f'<text x="{x(av):.1f}" y="{y-26}" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="800" fill="#2563eb">{av:.2f} €</text>')
        parts.append(f'<text x="{x(mx):.1f}" y="{y+42}" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#475569">{mx:.2f} €</text>')
    parts.append('</svg>')
    return ''.join(parts)


def svg_change_chart(facts: dict) -> str:
    rows=[]
    for fuel,label in (("Бензин A95","A95"),("Дизел","Дизел"),("LPG","LPG")):
        change=facts.get("fuels",{}).get(fuel,{}).get("change")
        if change:
            rows.append((label,float(change["absolute"])))
    if not rows:
        return ""
    width,height=1200,560
    max_abs=max(max(abs(v) for _,v in rows),.01)
    center=300
    scale=180/max_abs
    parts=[f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="Промяна на цените спрямо предходния ден">
<rect width="1200" height="560" rx="30" fill="#ffffff"/>
<text x="70" y="65" font-family="Arial,sans-serif" font-size="31" font-weight="800" fill="#0f172a">Промяна спрямо предходния ден</text>
<text x="70" y="103" font-family="Arial,sans-serif" font-size="17" fill="#64748b">Разлика в средната цена за литър</text>
<line x1="70" x2="1130" y1="{center}" y2="{center}" stroke="#cbd5e1" stroke-width="2"/>''']
    gap=300
    for i,(label,v) in enumerate(rows):
        x=190+i*gap
        h=abs(v)*scale
        y=center-h if v>=0 else center
        fill="#2563eb" if v>=0 else "#22c55e"
        sign="+" if v>0 else ""
        parts.append(f'<rect x="{x}" y="{y:.1f}" width="150" height="{max(h,4):.1f}" rx="15" fill="{fill}"/>')
        parts.append(f'<text x="{x+75}" y="{(y-16 if v>=0 else y+h+34):.1f}" text-anchor="middle" font-family="Arial,sans-serif" font-size="21" font-weight="800" fill="#0f172a">{sign}{v:.2f} €</text>')
        parts.append(f'<text x="{x+75}" y="500" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#334155">{html.escape(label)}</text>')
    parts.append('</svg>')
    return ''.join(parts)


def generate_ai_image(path: Path, prompt: str) -> bool:
    key=os.getenv("OPENAI_API_KEY","").strip()
    if not key:
        return False
    try:
        client=OpenAI(api_key=key)
        response=client.images.generate(model=IMAGE_MODEL,prompt=prompt,size="1536x1024",quality="medium",output_format="png")
        data=response.data[0] if response.data else None
        b64=getattr(data,"b64_json",None)
        if not b64:
            return False
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(base64.b64decode(b64))
        return True
    except Exception as exc:
        print(f"Image generation skipped: {exc}")
        return False


def site_header() -> str:
    return '''<div class="background"></div>
<header class="header-bar sofia-site-header"><div class="header-container"><a href="/" class="sofia-logo-link"><img src="/media/2logo.png" alt="goriva.online logo" class="header-logo"></a><div class="header-text"><strong>Цени на горивата в София</strong><span>Актуални данни, сравнения и анализи за шофьори.</span></div><a class="facebook-button" href="https://www.facebook.com/groups/960591129738525" target="_blank" rel="noopener noreferrer">Facebook група</a></div></header>
<nav class="main-nav"><button id="menu-toggle" class="menu-toggle" type="button" aria-label="Отвори менюто">☰</button><div id="nav-menu" class="nav-container"><a href="/">Начало</a><a href="/pages/useful.html">Полезно</a><a href="/pages/trends.html">История на цените</a><a href="/pages/weather.html">Прогноза за времето</a><a href="/pages/business-clients.html">Бизнес клиенти</a><a href="/pages/news.html">Новини</a><a href="/pages/rules.html">Общи условия</a></div></nav>'''


def site_footer() -> str:
    return '''<footer class="sofia-footer"><div class="sofia-footer-inner"><div class="sofia-footer-brand"><img src="/media/2logo.png" alt="goriva.online"><p>Актуални цени на горивата, анализи и практични инструменти за шофьори и бизнес.</p></div><div class="sofia-footer-links"><strong>Навигация</strong><a href="/">Начало</a><a href="/pages/news.html">Новини и анализи</a><a href="/pages/trends.html">История на цените</a><a href="/pages/useful.html">Полезно</a></div><div class="sofia-footer-links"><strong>Последвай goriva.online</strong><a href="https://www.instagram.com/goriva.online/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.facebook.com/groups/960591129738525" target="_blank" rel="noopener noreferrer">Facebook</a><a href="/pages/business-clients.html">За бизнеса</a></div></div><div class="sofia-footer-bottom">© 2026 goriva.online · Данните са информационни и могат да се променят.</div></footer>'''


def enrich(date_str: str, facts: dict) -> None:
    article_path=ROOT/"pages"/"articles"/"sofia"/date_str/"index.html"
    text=article_path.read_text(encoding="utf-8")
    media=ROOT/"media"/"sofia-news"/date_str
    media.mkdir(parents=True,exist_ok=True)

    averages=[]
    for fuel,label in (("Бензин A95","A95"),("Дизел","Дизел"),("LPG","LPG")):
        item=facts.get("fuels",{}).get(fuel)
        if item: averages.append((label,float(item["average"])))
    (media/"average-prices.svg").write_text(svg_bar_chart("Средни цени на горивата в София","Стойности от наличните данни за деня",averages),encoding="utf-8")
    (media/"price-range.svg").write_text(svg_range_chart(facts),encoding="utf-8")
    change=svg_change_chart(facts)
    if change: (media/"daily-change.svg").write_text(change,encoding="utf-8")

    hero=media/"hero.png"
    street=media/"sofia-street.png"
    generate_ai_image(hero,"Premium editorial photograph for a Bulgarian fuel-price news article about Sofia. Modern Sofia boulevard at blue hour, contemporary petrol station in the middle distance, cars moving through the city, realistic European urban atmosphere, polished business-news photography, natural light, no logos, no readable text, no prices, no typography, landscape composition.")
    generate_ai_image(street,"Editorial documentary-style image for an article about fuel prices in Sofia, Bulgaria. Urban traffic on a recognizably Southeast European city boulevard with a fuel station context, realistic cars and road environment, professional economic-news visual language, daylight, no brand logos, no signs with readable text, no prices, landscape composition.")

    # Replace the minimal generated header with the real site header and navigation.
    text=re.sub(r'<header class="site-header">.*?</header>',site_header(),text,count=1,flags=re.I|re.S)

    # Ensure core site stylesheet is correct and analytics/menu behavior is available.
    text=text.replace('<link rel="stylesheet" href="/style.css">','<link rel="stylesheet" href="/styles.css?v=20260831-sofia-pro2">')
    text=re.sub(r'/pages/styles/sofia-daily-article\.css\?v=[^"\']+', '/pages/styles/sofia-daily-article.css?v=20260831-pro2', text)
    if '/media/fav.svg' not in text:
        text=text.replace('</head>','  <link rel="icon" type="image/svg+xml" href="/media/fav.svg">\n</head>',1)
    if hero.exists():
        og='https://goriva.online'+f'/media/sofia-news/{date_str}/hero.png'
        if 'property="og:image"' not in text:
            text=text.replace('<meta property="og:url"',f'<meta property="og:image" content="{og}">\n  <meta name="twitter:image" content="{og}">\n  <meta property="og:url"',1)

    # Hero visual after metadata.
    if 'class="sofia-hero-visual"' not in text:
        hero_src=f'/media/sofia-news/{date_str}/hero.png' if hero.exists() else f'/media/sofia-news/{date_str}/average-prices.svg'
        hero_html=f'''<figure class="sofia-hero-visual"><img src="{hero_src}" alt="Цени на горивата в София – визуален контекст" loading="eager" fetchpriority="high"><figcaption>Ежедневен анализ на цените на горивата в София от goriva.online.</figcaption></figure>'''
        meta=re.search(r'<div class="article-meta">.*?</div>',text,flags=re.I|re.S)
        if meta: text=text[:meta.end()]+hero_html+text[meta.end():]

    # Data dashboard after summary cards.
    if 'class="sofia-data-dashboard"' not in text:
        change_card=f'''<figure class="sofia-chart-card"><img src="/media/sofia-news/{date_str}/daily-change.svg" alt="Промяна на цените спрямо предходния ден" loading="lazy"><figcaption>Дневна промяна на средната цена.</figcaption></figure>''' if change else ''
        dash=f'''<section class="sofia-data-dashboard" aria-label="Графики за цените в София"><div class="sofia-dashboard-heading"><span>Данните в графики</span><h2>Бърз визуален преглед</h2><p>Средни стойности, ценови диапазони и дневна динамика за основните горива.</p></div><div class="sofia-chart-grid"><figure class="sofia-chart-card"><img src="/media/sofia-news/{date_str}/average-prices.svg" alt="Средни цени на горивата в София" loading="lazy"><figcaption>Средни цени по вид гориво.</figcaption></figure><figure class="sofia-chart-card"><img src="/media/sofia-news/{date_str}/price-range.svg" alt="Минимални и максимални цени на горивата в София" loading="lazy"><figcaption>Минимална, средна и максимална наблюдавана цена.</figcaption></figure>{change_card}</div></section>'''
        summary_end=re.search(r'</section>\s*<div class="article-content-full">',text,flags=re.I)
        if summary_end: text=text[:summary_end.start()]+dash+text[summary_end.start():]

    # Editorial image in the long-form content.
    if street.exists() and 'sofia-editorial-image' not in text:
        img=f'''<figure class="sofia-editorial-image"><img src="/media/sofia-news/{date_str}/sofia-street.png" alt="Градски трафик и зареждане в София" loading="lazy"><figcaption>Цената на колонката е само част от реалния разход — маршрутът и локацията също имат значение.</figcaption></figure>'''
        marker=re.search(r'<h2>Цена на дизела в София</h2>',text,flags=re.I)
        if marker: text=text[:marker.start()]+img+text[marker.start():]

    # Footer + main site JS.
    if 'class="sofia-footer"' not in text:
        text=text.replace('</body>',site_footer()+'\n<script src="/scripts/script.js" defer></script>\n</body>',1)

    article_path.write_text(text,encoding="utf-8")
    print(f"Professional Sofia article enrichment completed for {date_str}")


def main() -> None:
    date_str=resolve_date()
    enrich(date_str,facts_for(date_str))


if __name__ == "__main__":
    main()
