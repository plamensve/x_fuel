from __future__ import annotations

import html
import json
import os
import re
import statistics
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import requests
from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
SOFIA = ZoneInfo("Europe/Sofia")
DEFAULT_SUPABASE_URL = "https://eaqvhxfvozhatrnbkvx.supabase.co"
TABLE = "fuel_prices"
PAGE_SIZE = 1000
MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(SOFIA)


def canonical_fuel(value: str) -> str:
    raw = (value or "").strip()
    s = raw.lower().replace("а", "a")
    if "метан" in raw.lower() or "methane" in s or "cng" in s:
        return "Метан"
    if "газ" in raw.lower() or "lpg" in s or "propane" in s:
        return "LPG"
    if "дизел" in raw.lower() or "diesel" in s:
        if "+" in raw or "premium" in s or "премиум" in raw.lower():
            return "Дизел +"
        return "Дизел"
    if "100" in s:
        return "Бензин A100"
    if "98" in s:
        return "Бензин A98"
    if "95" in s or "a95" in s:
        return "Бензин A95"
    return raw or "Друго"


def fetch_rows() -> list[dict]:
    supabase_url = (os.getenv("SUPABASE_URL") or DEFAULT_SUPABASE_URL).rstrip("/")
    key = require_env("SUPABASE_SERVICE_ROLE_KEY")
    start = (datetime.now(SOFIA) - timedelta(days=10)).astimezone(timezone.utc).isoformat()
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    rows: list[dict] = []
    offset = 0

    while True:
        params = {
            "select": "created_at,city,station,fuel,price,location",
            "created_at": f"gte.{start}",
            "order": "created_at.asc",
            "limit": PAGE_SIZE,
            "offset": offset,
        }
        url = f"{supabase_url}/rest/v1/{TABLE}?{urlencode(params)}"
        response = requests.get(url, headers=headers, timeout=45)
        response.raise_for_status()
        batch = response.json()
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
        if offset > 100000:
            raise RuntimeError("Safety stop: unexpectedly large Supabase result set")

    if not rows:
        raise RuntimeError("No recent fuel price rows returned from Supabase")
    return rows


def build_daily_snapshots(rows: list[dict]) -> dict[str, list[dict]]:
    latest: dict[tuple, dict] = {}
    for row in rows:
        try:
            dt = parse_dt(row["created_at"])
            price = float(row["price"])
        except (KeyError, TypeError, ValueError):
            continue
        if not (0.1 <= price <= 10):
            continue
        day = dt.date().isoformat()
        normalized = dict(row)
        normalized["_dt"] = dt
        normalized["_price"] = price
        normalized["_fuel"] = canonical_fuel(row.get("fuel", ""))
        key = (
            day,
            (row.get("city") or "").strip().lower(),
            (row.get("station") or "").strip().lower(),
            normalized["_fuel"],
            (row.get("location") or "").strip().lower(),
        )
        previous = latest.get(key)
        if previous is None or dt > previous["_dt"]:
            latest[key] = normalized

    daily: dict[str, list[dict]] = defaultdict(list)
    for key, row in latest.items():
        daily[key[0]].append(row)
    return dict(daily)


def choose_target_day(daily: dict[str, list[dict]]) -> str:
    requested = os.getenv("ARTICLE_DATE", "").strip()
    if requested:
        if requested not in daily:
            raise RuntimeError(f"No data for requested ARTICLE_DATE={requested}")
        return requested
    viable = [day for day, items in daily.items() if len(items) >= 20]
    if not viable:
        raise RuntimeError("No day with enough observations to generate an article")
    return max(viable)


def aggregate(items: list[dict]) -> dict[str, dict]:
    groups: dict[str, list[float]] = defaultdict(list)
    for row in items:
        groups[row["_fuel"]].append(row["_price"])
    result = {}
    for fuel, values in groups.items():
        result[fuel] = {
            "count": len(values),
            "avg": round(statistics.fmean(values), 3),
            "median": round(statistics.median(values), 3),
            "min": round(min(values), 3),
            "max": round(max(values), 3),
        }
    return result


def build_report(daily: dict[str, list[dict]], target: str) -> dict:
    days = sorted(daily)
    target_index = days.index(target)
    previous = days[target_index - 1] if target_index > 0 else None
    current_stats = aggregate(daily[target])
    previous_stats = aggregate(daily[previous]) if previous else {}

    preferred = ["Бензин A95", "Дизел", "LPG", "Метан", "Бензин A100", "Дизел +"]
    fuels = [f for f in preferred if f in current_stats] + [f for f in current_stats if f not in preferred]

    fuel_rows = []
    for fuel in fuels:
        cur = current_stats[fuel]
        prev = previous_stats.get(fuel)
        delta = round(cur["avg"] - prev["avg"], 3) if prev else None
        pct = round((delta / prev["avg"]) * 100, 2) if prev and prev["avg"] else None
        fuel_rows.append({"fuel": fuel, **cur, "previous_avg": prev["avg"] if prev else None, "delta": delta, "delta_pct": pct})

    city_fuel: dict[tuple[str, str], list[float]] = defaultdict(list)
    for row in daily[target]:
        city = (row.get("city") or "").strip()
        if city:
            city_fuel[(row["_fuel"], city)].append(row["_price"])

    cheapest = {}
    for fuel in preferred[:4]:
        candidates = []
        for (group_fuel, city), values in city_fuel.items():
            if group_fuel == fuel and len(values) >= 2:
                candidates.append({"city": city, "avg": round(statistics.fmean(values), 3), "count": len(values)})
        cheapest[fuel] = sorted(candidates, key=lambda x: x["avg"])[:5]

    return {
        "date": target,
        "previous_date": previous,
        "observations": len(daily[target]),
        "fuel_stats": fuel_rows,
        "cheapest_cities": cheapest,
    }


def generate_editorial(report: dict) -> dict:
    client = OpenAI(api_key=require_env("OPENAI_API_KEY"))
    prompt = f"""
Ти си редактор на българския сайт goriva.online. Подготви ежедневен журналистически обзор за пазара на горива на БЪЛГАРСКИ език.

Авторитетните локални данни са тези по-долу. Не измисляй цени, проценти, градове или тенденции. За международния контекст използвай web search и само надеждни, актуални източници (например Reuters, IEA, EIA, Европейска комисия, OPEC и официални институции). Не използвай числови котировки от външни източници; международният контекст трябва да е качествен, за да не се смесват различни мерни единици и пазари.

Локални данни:
{json.dumps(report, ensure_ascii=False, indent=2)}

Върни САМО валиден JSON без markdown със следната структура:
{{
  "title": "кратко новинарско заглавие",
  "meta_description": "до 155 символа",
  "lead": "2-3 изречения",
  "analysis": ["абзац 1", "абзац 2"],
  "market_context": ["абзац 1", "абзац 2"],
  "outlook": ["кратък предпазлив абзац"],
  "sources": [{{"publisher":"...","title":"...","url":"https://..."}}],
  "linkedin": "кратък текст за LinkedIn",
  "facebook": "кратък текст за Facebook"
}}

Правила: без сензационализъм; без категорични прогнози; ясно отделяй наблюдавани локални данни от външен пазарен контекст; не твърди причинно-следствена връзка, ако източниците не я доказват; 2-5 източника; текстът да звучи като икономическа новина, а не като AI отчет.
"""
    response = client.responses.create(
        model=MODEL,
        reasoning={"effort": "low"},
        tools=[{"type": "web_search_preview"}],
        include=["web_search_call.action.sources"],
        input=prompt,
    )
    text = response.output_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.S)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"OpenAI returned invalid JSON: {exc}\n{text[:800]}") from exc

    required = ["title", "meta_description", "lead", "analysis", "market_context", "outlook", "sources"]
    missing = [key for key in required if key not in data]
    if missing:
        raise RuntimeError(f"OpenAI response missing fields: {missing}")
    return data


def format_price(value) -> str:
    return "—" if value is None else f"{float(value):.3f} €"


def render_stats(report: dict) -> str:
    rows = []
    for item in report["fuel_stats"]:
        delta = item["delta"]
        if delta is None:
            change = "няма база за сравнение"
        elif abs(delta) < 0.0005:
            change = "без промяна"
        else:
            sign = "+" if delta > 0 else ""
            change = f"{sign}{delta:.3f} € ({sign}{item['delta_pct']:.2f}%)"
        rows.append(
            f"<tr><td>{html.escape(item['fuel'])}</td><td>{format_price(item['avg'])}</td>"
            f"<td>{format_price(item['min'])}</td><td>{format_price(item['max'])}</td>"
            f"<td>{html.escape(change)}</td><td>{item['count']}</td></tr>"
        )
    return (
        '<div class="article-data-table"><table><thead><tr><th>Гориво</th><th>Средна</th><th>Мин.</th><th>Макс.</th><th>Спрямо предходния ден</th><th>Наблюдения</th></tr></thead>'
        f"<tbody>{''.join(rows)}</tbody></table></div>"
    )


def render_cheapest(report: dict) -> str:
    blocks = []
    for fuel, cities in report["cheapest_cities"].items():
        if not cities:
            continue
        lis = "".join(f"<li><strong>{html.escape(c['city'])}</strong> — {c['avg']:.3f} € средна наблюдавана цена</li>" for c in cities)
        blocks.append(f"<h3>{html.escape(fuel)}</h3><ul>{lis}</ul>")
    return "".join(blocks) or "<p>Няма достатъчно наблюдения по градове за надеждно сравнение.</p>"


def safe_paragraphs(values) -> str:
    return "".join(f"<p>{html.escape(str(value))}</p>" for value in (values or []))


def render_article(report: dict, editorial: dict, article_url: str) -> str:
    date_obj = datetime.fromisoformat(report["date"])
    bg_months = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"]
    display_date = f"{date_obj.day} {bg_months[date_obj.month - 1]} {date_obj.year}"
    title = html.escape(editorial["title"])
    meta = html.escape(editorial["meta_description"][:160])
    lead = html.escape(editorial["lead"])
    sources = editorial.get("sources") or []
    source_items = []
    for source in sources[:5]:
        url = str(source.get("url", "")).strip()
        if not url.startswith("http"):
            continue
        publisher = html.escape(str(source.get("publisher", "Източник")))
        stitle = html.escape(str(source.get("title", "Пазарен източник")))
        source_items.append(f'<li><a href="{html.escape(url, quote=True)}" target="_blank" rel="noopener noreferrer">{publisher}: {stitle}</a></li>')
    sources_html = "".join(source_items) or "<li>Международният контекст е обобщен от актуални публични пазарни източници.</li>"

    schema = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": editorial["title"],
        "description": editorial["meta_description"],
        "datePublished": report["date"],
        "dateModified": report["date"],
        "inLanguage": "bg-BG",
        "mainEntityOfPage": article_url,
        "author": {"@type": "Organization", "name": "goriva.online Редакция"},
        "publisher": {"@type": "Organization", "name": "goriva.online", "url": "https://goriva.online/"},
        "image": "https://goriva.online/media/og-3.png",
    }

    return f'''<!doctype html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} | goriva.online</title>
  <meta name="description" content="{meta}">
  <link rel="canonical" href="{article_url}">
  <link rel="icon" type="image/svg+xml" href="/media/fav.svg">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="bg_BG">
  <meta property="og:site_name" content="goriva.online">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{meta}">
  <meta property="og:url" content="{article_url}">
  <meta property="og:image" content="https://goriva.online/media/og-3.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/styles.css?v=20260829-daily1">
  <link rel="stylesheet" href="/pages/styles/article-modern.css?v=20260829-newsroom1">
  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
</head>
<body id="top" class="article-modern-page">
<div class="background"></div>
<header class="header-bar"><div class="header-container"><img src="/media/2logo.png" alt="goriva.online logo" class="header-logo"><div class="header-text"><strong>Новини и анализи</strong><span>Ежедневен обзор на пазара на горива</span></div></div></header>
<nav class="main-nav"><div class="nav-container"><a href="/">Начало</a><a href="/pages/trends.html">История на цените</a><a href="/pages/news.html">Новини</a><a href="/pages/business-clients.html">За бизнеса</a></div></nav>
<main class="container">
<section class="article-page">
  <h1 class="article-title">{title}</h1>
  <div class="article-meta"><span>{display_date}</span><span>•</span><span>Дневен обзор</span><span>•</span><span>goriva.online Редакция</span></div>
  <div class="article-image-main" style="background-image:url('/media/og-3.png')"></div>
  <div class="article-content-full">
    <p>{lead}</p>
    <h2>Цените в България днес</h2>
    <p>Обзорът е изчислен от {report['observations']} последни дневни наблюдения в базата на goriva.online. За всяка бензиностанция и вид гориво се използва последната налична цена за деня.</p>
    {render_stats(report)}
    <h2>Какво показват данните</h2>
    {safe_paragraphs(editorial.get('analysis'))}
    <h2>Къде средните наблюдавани цени са най-ниски</h2>
    {render_cheapest(report)}
    <h2>Международен пазарен контекст</h2>
    {safe_paragraphs(editorial.get('market_context'))}
    <h2>Какво да следим</h2>
    {safe_paragraphs(editorial.get('outlook'))}
    <h2>Източници</h2>
    <ul>{sources_html}</ul>
    <p><small>Данните за България са автоматично агрегирани от goriva.online. Международният контекст е автоматично обобщен от публични източници. Материалът е с информационна цел и не представлява прогноза за бъдещи цени.</small></p>
  </div>
</section>
</main>
<footer class="site-footer"></footer>
<script src="/scripts/script.js?v=20260829-daily1" defer></script>
</body>
</html>'''


def load_manifest() -> list[dict]:
    path = ROOT / "data" / "generated-news.json"
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def save_manifest(entries: list[dict]) -> None:
    path = ROOT / "data" / "generated-news.json"
    path.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_news_page(entries: list[dict]) -> None:
    path = ROOT / "pages" / "news.html"
    text = path.read_text(encoding="utf-8")
    cards = []
    for item in entries[:30]:
        cards.append(f'''            <article class="article-card" data-category="analysis">
                <a class="article-card-media" href="{html.escape(item['href'], quote=True)}" style="background-image:url('/media/og-3.png')"><span>Дневен обзор</span></a>
                <div class="article-content">
                    <div class="article-date">{html.escape(item['display_date'])} · Дневен обзор</div>
                    <h3><a href="{html.escape(item['href'], quote=True)}">{html.escape(item['title'])}</a></h3>
                    <p>{html.escape(item['description'])}</p>
                    <a class="article-link" href="{html.escape(item['href'], quote=True)}">Прочети повече →</a>
                </div>
            </article>''')
    block = "<!-- AUTO-DAILY-START -->\n" + "\n".join(cards) + "\n            <!-- AUTO-DAILY-END -->"
    pattern = r"<!-- AUTO-DAILY-START -->.*?<!-- AUTO-DAILY-END -->"
    if re.search(pattern, text, flags=re.S):
        text = re.sub(pattern, block, text, flags=re.S)
    else:
        marker = '<div class="articles-grid" id="news-grid">'
        text = text.replace(marker, marker + "\n            " + block, 1)
    total = 3 + len(entries)
    text = re.sub(r'(<div class="news-aside-stat"><span>)\d+(</span>)', rf'\g<1>{total:02d}\2', text, count=1)
    path.write_text(text, encoding="utf-8")


def update_sitemap(article_url: str, date_str: str) -> None:
    path = ROOT / "sitemap.xml"
    text = path.read_text(encoding="utf-8")
    if article_url in text:
        return
    node = f'''    <url>
        <loc>{article_url}</loc>
        <lastmod>{date_str}</lastmod>
        <changefreq>yearly</changefreq>
        <priority>0.7</priority>
    </url>\n\n'''
    text = text.replace("</urlset>", node + "</urlset>")
    path.write_text(text, encoding="utf-8")


def main() -> None:
    rows = fetch_rows()
    daily = build_daily_snapshots(rows)
    target = choose_target_day(daily)
    report = build_report(daily, target)
    editorial = generate_editorial(report)

    slug = target
    article_dir = ROOT / "pages" / "articles" / "daily" / slug
    article_dir.mkdir(parents=True, exist_ok=True)
    href = f"/pages/articles/daily/{slug}/index.html"
    article_url = f"https://goriva.online{href}"
    article_html = render_article(report, editorial, article_url)
    (article_dir / "index.html").write_text(article_html, encoding="utf-8")

    date_obj = datetime.fromisoformat(target)
    months = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"]
    display_date = f"{date_obj.day} {months[date_obj.month - 1]} {date_obj.year}"

    entries = [item for item in load_manifest() if item.get("date") != target]
    entries.append({
        "date": target,
        "display_date": display_date,
        "title": editorial["title"],
        "description": editorial["meta_description"],
        "href": href,
        "linkedin": editorial.get("linkedin", ""),
        "facebook": editorial.get("facebook", ""),
    })
    entries.sort(key=lambda x: x.get("date", ""), reverse=True)
    save_manifest(entries)
    update_news_page(entries)
    update_sitemap(article_url, target)

    print(f"Generated: {article_dir / 'index.html'}")
    print(f"Article URL: {article_url}")
    print(f"Model: {MODEL}")
    print(f"Observations used: {report['observations']}")


if __name__ == "__main__":
    main()
