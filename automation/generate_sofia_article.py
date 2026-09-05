from __future__ import annotations

import html
import json
import os
import re
import statistics
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

from openai import OpenAI

import automation.generate_daily_article_bg as base

ROOT = Path(__file__).resolve().parents[1]
MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")
SOURCE_MAX_AGE_HOURS = int(os.getenv("SOURCE_MAX_AGE_HOURS", "72"))
MIN_SOFIA_RECORDS = int(os.getenv("MIN_SOFIA_RECORDS", "20"))
MIN_SOFIA_STATIONS = int(os.getenv("MIN_SOFIA_STATIONS", "8"))
TOP_STATIONS_LIMIT = int(os.getenv("TOP_STATIONS_LIMIT", "7"))
TARGET_FUELS = ("Бензин A95", "Дизел", "LPG")

SOFIA_SOURCES = tuple(dict.fromkeys(base.PREFERRED_BG_SOURCES + (
    "forbesbulgaria.com",
    "profit.bg",
    "manager.bg",
    "bloombergtv.bg",
    "24chasa.bg",
    "trud.bg",
    "segabg.com",
    "offnews.bg",
)))


def is_sofia(value: str) -> bool:
    normalized = re.sub(r"\s+", " ", (value or "").strip().lower())
    return normalized in {"софия", "sofia", "гр. софия", "град софия"} or "софия" in normalized


def fmt_money(value: float) -> str:
    return f"{float(value):.2f}".replace(".", ",")


def fmt_change(value: float) -> str:
    value = float(value)
    sign = "+" if value > 0 else ""
    return sign + f"{value:.2f}".replace(".", ",")


def fmt_percent(value: float) -> str:
    value = float(value)
    sign = "+" if value > 0 else ""
    return sign + f"{value:.2f}".replace(".", ",") + "%"


def bg_date(date_str: str) -> str:
    months = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"]
    dt = datetime.fromisoformat(date_str)
    return f"{dt.day} {months[dt.month - 1]} {dt.year}"


def city_rows(rows: list[dict]) -> list[dict]:
    return [row for row in rows if is_sofia(str(row.get("city") or ""))]


def summarize_sofia(rows: list[dict]) -> dict:
    rows = city_rows(rows)
    by_fuel: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        fuel = row.get("_fuel") or base.canonical_fuel(row.get("fuel", ""))
        if fuel in TARGET_FUELS:
            by_fuel[fuel].append(row)

    fuels: dict[str, dict] = {}
    for fuel, items in by_fuel.items():
        prices = [float(row.get("_price", row.get("price"))) for row in items]
        stations = {}
        for row in items:
            key = (
                (row.get("station") or "").strip(),
                (row.get("location") or "").strip(),
            )
            current = stations.get(key)
            price = float(row.get("_price", row.get("price")))
            if current is None or price < current["price"]:
                stations[key] = {
                    "station": key[0] or "Бензиностанция",
                    "location": key[1],
                    "price": price,
                }

        ranking = sorted(stations.values(), key=lambda item: (item["price"], item["station"].lower()))[:TOP_STATIONS_LIMIT]
        fuels[fuel] = {
            "count": len(items),
            "stations": len(stations),
            "average": round(statistics.fmean(prices), 4),
            "median": round(statistics.median(prices), 4),
            "minimum": round(min(prices), 4),
            "maximum": round(max(prices), 4),
            "spread": round(max(prices) - min(prices), 4),
            "top_stations": ranking,
        }

    station_count = len({
        ((row.get("station") or "").strip().lower(), (row.get("location") or "").strip().lower())
        for row in rows
    })
    return {"records": len(rows), "stations": station_count, "fuels": fuels}


def select_target(by_day: dict[str, list[dict]]) -> tuple[str, str | None]:
    requested = os.getenv("ARTICLE_DATE", "").strip()
    days = sorted(by_day)
    if requested:
        if requested not in by_day:
            raise RuntimeError(f"ARTICLE_DATE={requested} has no dataset")
        target = requested
    else:
        viable = []
        for day in days:
            summary = summarize_sofia(by_day[day])
            if summary["records"] >= MIN_SOFIA_RECORDS and summary["stations"] >= MIN_SOFIA_STATIONS:
                viable.append(day)
        if not viable:
            raise RuntimeError("No Sofia dataset meets the minimum publication coverage")
        target = viable[-1]
    previous = next((day for day in reversed(days) if day < target and summarize_sofia(by_day[day])["records"]), None)
    return target, previous


def build_facts(target: str, current: dict, previous_day: str | None, previous: dict | None) -> dict:
    facts = {
        "date": target,
        "city": "София",
        "coverage": {
            "records": current["records"],
            "stations": current["stations"],
            "scope_label": "данните за София в goriva.online",
        },
        "previous_date": previous_day,
        "fuels": {},
    }

    for fuel in TARGET_FUELS:
        item = current["fuels"].get(fuel)
        if not item:
            continue
        payload = {
            "count": item["count"],
            "stations": item["stations"],
            "average": item["average"],
            "median": item["median"],
            "minimum": item["minimum"],
            "maximum": item["maximum"],
            "spread": item["spread"],
            "display": {
                "average": fmt_money(item["average"]),
                "median": fmt_money(item["median"]),
                "minimum": fmt_money(item["minimum"]),
                "maximum": fmt_money(item["maximum"]),
                "spread": fmt_money(item["spread"]),
            },
            "top_stations": [
                {
                    "station": station["station"],
                    "location": station["location"],
                    "price": station["price"],
                    "display_price": fmt_money(station["price"]),
                }
                for station in item["top_stations"]
            ],
        }
        old = (previous or {}).get("fuels", {}).get(fuel)
        if old and old.get("average"):
            delta = item["average"] - old["average"]
            pct = delta / old["average"] * 100
            payload["change"] = {
                "previous_average": old["average"],
                "absolute": round(delta, 4),
                "percent": round(pct, 2),
                "display_previous_average": fmt_money(old["average"]),
                "display_absolute": fmt_change(delta),
                "display_percent": fmt_percent(pct),
            }
        facts["fuels"][fuel] = payload
    return facts


def generate_article(facts: dict) -> dict:
    schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "deck": {"type": "string"},
            "body_html": {"type": "string"},
            "sources": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "url": {"type": "string"},
                        "published_at": {"type": "string"},
                    },
                    "required": ["name", "url", "published_at"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["title", "description", "deck", "body_html", "sources"],
        "additionalProperties": False,
    }
    source_list = ", ".join(SOFIA_SOURCES)
    prompt = f"""
Ти си редактор на goriva.online. Напиши подробна, практична и SEO-оптимизирана статия на български, посветена САМО на актуалните цени на горивата в София.

ОСНОВНА SEO ТЕМА:
- „Цените на горивата днес в София“
- „Цените на горивата в София“
- „цена на бензина в София“
- „цена на дизела в София“
- „цена на LPG в София“
Използвай фразите естествено. Без keyword stuffing.

ЗАГЛАВИЕ:
- Започни с „Цените на горивата днес в София“.
- Добави датата {bg_date(facts['date'])}.
- Не използвай сензационализъм.

ВАЛУТА:
- Всички парични стойности са в евро.
- Използвай € и €/литър.
- Никога не използвай лв., лев, BGN или стотинки.
- Числата от FACTS_JSON вече са в евро и не се конвертират.

ДАННИ:
- Всички конкретни локални числа идват САМО от FACTS_JSON.
- Не пресмятай нови стойности.
- Използвай display полетата за читателските стойности.
- Задължително уточни веднъж, че анализът е базиран на наличните данни за София в goriva.online и не е официална държавна статистика.
- Задължително посочи броя анализирани записи и станции.

СТРУКТУРА:
- lead от 2–3 абзаца с най-важното за деня;
- <h2>Цените на горивата днес в София</h2>;
- <h2>Цена на бензин A95 в София</h2>;
- <h2>Цена на дизела в София</h2>;
- <h2>Цена на LPG в София</h2>;
- <h2>Най-ниски цени по бензиностанции в София</h2> – използвай списъци с наличните top_stations;
- <h2>Как се променят цените спрямо предходния ден</h2>, само ако има change данни;
- <h2>Какво означават ценовите разлики за шофьорите</h2> – практичен анализ без нови измислени числа;
- <h2>Пазарен контекст от последните 72 часа</h2>, само ако има действително релевантни свежи източници;
- <h2>Какво да следим</h2>.

ВЪНШНИ ИЗТОЧНИЦИ:
- Използвай web search за свеж контекст максимум {SOURCE_MAX_AGE_HOURS} часа назад спрямо датата на статията.
- Предпочитани български източници: {source_list}.
- Може да използваш няколко източника, когато са релевантни към петрол, доставки, данъци, рафинерии, транспорт, акцизи или пазара на горива.
- Не използвай стари материали извън 72 часа.
- Не поставяй URL или inline citations в body_html. Всички източници са само в sources.
- Не твърди, че дадена външна новина е причината за конкретно движение в София, освен ако източникът доказва това.
- Ако няма качествен свеж контекст, върни sources=[] и пропусни секцията за пазарен контекст.

СТИЛ И ДЪЛЖИНА:
- Професионален бизнес/новинарски стил, но лесен за шофьори.
- 900–1400 думи, когато данните позволяват.
- Кратки абзаци и ясни подзаглавия.
- Без AI клишета и празни заключения.
- body_html може да съдържа само <h2>, <h3>, <p>, <ul>, <li>, <strong>, <blockquote>.

FACTS_JSON:
{json.dumps(facts, ensure_ascii=False, indent=2)}
""".strip()

    client = OpenAI(api_key=base.require_env("OPENAI_API_KEY"))
    response = client.responses.create(
        model=MODEL,
        reasoning={"effort": "low"},
        tools=[{"type": "web_search"}],
        input=prompt,
        text={"format": {"type": "json_schema", "name": "sofia_fuel_article", "strict": True, "schema": schema}},
    )
    raw = base.response_text(response)
    if not raw:
        raise RuntimeError("OpenAI returned no Sofia article")
    return json.loads(raw)


def normalize_sources(article: dict, target_day: str) -> None:
    cleaned = []
    target_end = datetime.combine(date.fromisoformat(target_day), datetime.max.time(), tzinfo=base.SOFIA)
    oldest = target_end - timedelta(hours=SOURCE_MAX_AGE_HOURS)
    for source in article.get("sources") or []:
        url = base.clean_source_url(str(source.get("url") or ""))
        if not url.startswith(("https://", "http://")) or not base.is_bulgarian_source(url):
            continue
        try:
            published = base.parse_source_date(str(source.get("published_at") or ""), target_day)
        except ValueError:
            continue
        if published < oldest or published > target_end + timedelta(hours=12):
            continue
        cleaned.append({"name": source.get("name") or url, "url": url, "published_at": published.isoformat()})
    seen = set()
    article["sources"] = [item for item in cleaned if not (item["url"] in seen or seen.add(item["url"]))][:8]
    if not article["sources"]:
        article["body_html"] = re.sub(
            r'<h2\b[^>]*>\s*Пазарен\s+контекст\s+от\s+последните\s+72\s+часа\s*</h2>.*?(?=<h2\b|$)',
            '',
            article.get("body_html", ""),
            flags=re.I | re.S,
        )


def allowed_numbers(facts: dict) -> set[str]:
    return base.allowed_numbers(facts)


def validate(article: dict, facts: dict) -> None:
    title = article.get("title", "")
    if "цените на горивата днес в софия" not in title.lower():
        raise RuntimeError("Sofia article title does not contain the required SEO phrase")
    body = article.get("body_html", "")
    if re.search(r"https?://|www\.", body, flags=re.I):
        raise RuntimeError("Inline URL leaked into Sofia body")
    if re.search(r"(?i)\b(?:лв\.?|лева|левове|BGN|стотинки)\b", " ".join([title, article.get("deck", ""), body])):
        raise RuntimeError("Legacy BGN currency leaked into Sofia article")
    marker = re.search(r"<h2\b[^>]*>\s*Пазарен\s+контекст\s+от\s+последните\s+72\s+часа\s*</h2>", body, flags=re.I)
    local_html = body[:marker.start()] if marker else body
    local_text = " ".join([title, article.get("deck", ""), re.sub(r"<[^>]+>", " ", local_html)])
    allowed = allowed_numbers(facts)
    unknown = sorted({n for n in base.decimal_numbers(local_text) if n not in allowed})
    if unknown:
        raise RuntimeError(f"Unknown local decimal values in Sofia article: {unknown}")


def station_table(facts: dict) -> str:
    sections = []
    for fuel in TARGET_FUELS:
        items = facts.get("fuels", {}).get(fuel, {}).get("top_stations", [])
        if not items:
            continue
        rows = []
        for item in items:
            rows.append(
                "<tr>"
                f"<td>{html.escape(item['station'])}</td>"
                f"<td>{html.escape(item.get('location') or '—')}</td>"
                f"<td><strong>{html.escape(item['display_price'])} €</strong></td>"
                "</tr>"
            )
        sections.append(
            f'<section class="sofia-ranking"><h3>{html.escape(fuel)}</h3>'
            '<div class="sofia-table-wrap"><table class="sofia-price-table"><thead><tr><th>Бензиностанция</th><th>Локация</th><th>Цена</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div></section>'
        )
    return "".join(sections)


def render_article(date_str: str, article: dict, facts: dict) -> str:
    title = html.escape(article["title"])
    description = html.escape(re.sub(r"\s+", " ", article["description"]).strip()[:155], quote=True)
    deck = html.escape(article["deck"])
    body = base.sanitize_body(article.get("body_html", ""))
    url = f"https://goriva.online/pages/articles/sofia/{date_str}/"
    published = base.publication_timestamp(date_str)
    sources = base.render_sources(article.get("sources", []))
    ranking = station_table(facts)
    image_url = f"https://goriva.online/media/sofia-news/{date_str}/hero.png"
    schema = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": article["title"],
        "description": article["description"],
        "datePublished": published,
        "dateModified": published,
        "image": [image_url],
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "inLanguage": "bg-BG",
        "articleSection": "Цени на горивата в София",
        "about": ["Цени на горивата в София", "Цена на бензина в София", "Цена на дизела в София", "LPG София"],
        "author": {"@type": "Organization", "name": "goriva.online", "url": "https://goriva.online/"},
        "publisher": {
            "@type": "Organization",
            "name": "goriva.online",
            "url": "https://goriva.online/",
            "logo": {"@type": "ImageObject", "url": "https://goriva.online/media/2logo.png"},
        },
    }
    breadcrumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Начало", "item": "https://goriva.online/"},
            {"@type": "ListItem", "position": 2, "name": "Новини", "item": "https://goriva.online/pages/news.html"},
            {"@type": "ListItem", "position": 3, "name": "Цени на горивата в София", "item": url},
        ],
    }
    return f'''<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} | goriva.online</title>
  <meta name="description" content="{description}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="goriva.online">
  <meta property="og:locale" content="bg_BG">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{image_url}">
  <meta property="article:published_time" content="{published}">
  <meta property="article:modified_time" content="{published}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="{image_url}">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/pages/styles/daily-editorial-layout.css?v=20260831-padding-euro1">
  <link rel="stylesheet" href="/pages/styles/article-engagement.css?v=20260830-3">
  <link rel="stylesheet" href="/pages/styles/sofia-daily-article.css?v=20260831-1">
  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
  <script type="application/ld+json">{json.dumps(breadcrumbs, ensure_ascii=False)}</script>
</head>
<body>
  <header class="site-header"><div class="container"><a class="brand" href="/">goriva.online</a></div></header>
  <main class="article-page sofia-article-page">
    <article class="article-shell">
      <div class="article-kicker">СОФИЯ · ЦЕНИ НА ГОРИВАТА</div>
      <h1>{title}</h1>
      <p class="article-deck">{deck}</p>
      <div class="article-meta">Публикувана: <time datetime="{published}">{bg_date(date_str)}</time> · Данни за София от goriva.online</div>
      <section class="sofia-summary-grid" aria-label="Обобщение на цените">
        {summary_cards(facts)}
      </section>
      <div class="article-content-full">
        <div class="article-editorial-layout">
          <section class="editorial-intro"><div class="editorial-intro-rule" aria-hidden="true"></div><div class="editorial-intro-copy">{body}</div></section>
        </div>
        <section class="sofia-stations-block">
          <h2>Най-ниски цени по бензиностанции в София</h2>
          <p>Класацията е изчислена автоматично от наличните данни в goriva.online за датата на анализа.</p>
          {ranking}
        </section>
        {sources}
      </div>
    </article>
  </main>
  <script src="/scripts/article-engagement.js?v=20260830-3" defer></script>
</body>
</html>'''


def summary_cards(facts: dict) -> str:
    cards = []
    labels = {"Бензин A95": "Бензин A95", "Дизел": "Дизел", "LPG": "LPG"}
    for fuel in TARGET_FUELS:
        item = facts.get("fuels", {}).get(fuel)
        if not item:
            continue
        change = item.get("change")
        change_text = ""
        if change:
            change_text = f'<span class="sofia-card-change">{html.escape(change["display_absolute"])} € спрямо предходния ден</span>'
        cards.append(
            '<div class="sofia-summary-card">'
            f'<span class="sofia-card-label">{labels[fuel]}</span>'
            f'<strong>{html.escape(item["display"]["average"])} €</strong>'
            '<span class="sofia-card-caption">средна цена</span>'
            f'{change_text}'
            '</div>'
        )
    cards.append(
        '<div class="sofia-summary-card sofia-summary-card--coverage">'
        '<span class="sofia-card-label">Покритие</span>'
        f'<strong>{facts["coverage"]["stations"]}</strong>'
        '<span class="sofia-card-caption">наблюдавани станции</span>'
        '</div>'
    )
    return "".join(cards)


def update_sitemap(date_str: str) -> None:
    from automation.rebuild_sitemap import rebuild_sitemap
    rebuild_sitemap()


def main() -> None:
    base.PREFERRED_BG_SOURCES = SOFIA_SOURCES
    rows = base.fetch_rows()
    by_day = base.build_daily_snapshots(rows)
    target, previous_day = select_target(by_day)
    current = summarize_sofia(by_day[target])
    if current["records"] < MIN_SOFIA_RECORDS or current["stations"] < MIN_SOFIA_STATIONS:
        raise RuntimeError(
            f"Sofia publication skipped: {current['records']} records / {current['stations']} stations; "
            f"minimum is {MIN_SOFIA_RECORDS}/{MIN_SOFIA_STATIONS}."
        )
    previous = summarize_sofia(by_day[previous_day]) if previous_day else None
    facts = build_facts(target, current, previous_day, previous)
    article = generate_article(facts)
    normalize_sources(article, target)
    article["body_html"] = base.sanitize_body(article.get("body_html", ""))
    validate(article, facts)

    out_dir = ROOT / "pages" / "articles" / "sofia" / target
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.html").write_text(render_article(target, article, facts), encoding="utf-8")
    update_sitemap(target)

    print(json.dumps({
        "status": "generated",
        "date": target,
        "city": "София",
        "records": current["records"],
        "stations": current["stations"],
        "sources": [source.get("url") for source in article.get("sources", [])],
        "url": f"https://goriva.online/pages/articles/sofia/{target}/",
        "model": MODEL,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
