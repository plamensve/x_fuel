from __future__ import annotations

import html
import json
import os
import re
import statistics
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

import requests
from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
SOFIA = ZoneInfo("Europe/Sofia")
TABLE = "fuel_prices"
PAGE_SIZE = 1000
MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")

MIN_DAILY_RECORDS = int(os.getenv("MIN_DAILY_RECORDS", "50"))
MIN_DAILY_STATIONS = int(os.getenv("MIN_DAILY_STATIONS", "15"))
MIN_DAILY_CITIES = int(os.getenv("MIN_DAILY_CITIES", "5"))
SOURCE_MAX_AGE_HOURS = int(os.getenv("SOURCE_MAX_AGE_HOURS", "72"))

PREFERRED_BG_SOURCES = (
    "bta.bg",
    "bnr.bg",
    "bntnews.bg",
    "economic.bg",
    "investor.bg",
    "capital.bg",
    "dnevnik.bg",
    "money.bg",
    "mediapool.bg",
    "minfin.bg",
    "mi.government.bg",
    "me.government.bg",
    "nsi.bg",
    "customs.bg",
    "kzp.bg",
    "cpc.bg",
)

TRACKING_QUERY_KEYS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "gclid", "fbclid", "mc_cid", "mc_eid",
}


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(SOFIA)


def canonical_fuel(value: str) -> str:
    raw = (value or "").strip()
    low = raw.lower()
    if "метан" in low or "cng" in low:
        return "Метан"
    if "пропан" in low or "газ" in low or "lpg" in low:
        return "LPG"
    if "дизел" in low or "diesel" in low:
        return "Дизел +" if ("+" in raw or "premium" in low or "премиум" in low) else "Дизел"
    if "100" in low:
        return "Бензин A100"
    if "98" in low:
        return "Бензин A98"
    if "95" in low:
        return "Бензин A95"
    return raw or "Друго"


def fetch_rows() -> list[dict]:
    supabase_url = require_env("SUPABASE_URL").rstrip("/")
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
        if not (0.2 <= price <= 10):
            continue

        day = dt.date().isoformat()
        fuel = canonical_fuel(row.get("fuel", ""))
        key = (
            day,
            (row.get("city") or "").strip().lower(),
            (row.get("station") or "").strip().lower(),
            fuel,
            (row.get("location") or "").strip().lower(),
        )
        candidate = dict(row)
        candidate["_dt"] = dt
        candidate["_day"] = day
        candidate["_fuel"] = fuel
        candidate["_price"] = price
        current = latest.get(key)
        if current is None or dt > current["_dt"]:
            latest[key] = candidate

    by_day: dict[str, list[dict]] = defaultdict(list)
    for row in latest.values():
        by_day[row["_day"]].append(row)
    return dict(by_day)


def summarize_day(rows: list[dict]) -> dict:
    by_fuel: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        by_fuel[row["_fuel"]].append(row)

    fuels = {}
    for fuel, items in sorted(by_fuel.items()):
        prices = [r["_price"] for r in items]
        fuels[fuel] = {
            "count": len(items),
            "average": round(statistics.fmean(prices), 3),
            "median": round(statistics.median(prices), 3),
            "minimum": round(min(prices), 3),
            "maximum": round(max(prices), 3),
        }

    city_fuel: dict[tuple[str, str], list[float]] = defaultdict(list)
    for row in rows:
        city = (row.get("city") or "").strip()
        if city:
            city_fuel[(city, row["_fuel"])].append(row["_price"])

    city_averages = [
        {"city": city, "fuel": fuel, "average": round(statistics.fmean(values), 3), "count": len(values)}
        for (city, fuel), values in city_fuel.items()
        if len(values) >= 3
    ]

    return {
        "records": len(rows),
        "stations": len({((r.get("station") or ""), (r.get("location") or ""), (r.get("city") or "")) for r in rows}),
        "cities": len({(r.get("city") or "").strip() for r in rows if (r.get("city") or "").strip()}),
        "fuels": fuels,
        "city_averages": city_averages,
    }


def coverage_is_sufficient(summary: dict) -> bool:
    return (
        summary["records"] >= MIN_DAILY_RECORDS
        and summary["stations"] >= MIN_DAILY_STATIONS
        and summary["cities"] >= MIN_DAILY_CITIES
    )


def select_days(by_day: dict[str, list[dict]]) -> tuple[str, str | None]:
    requested = os.getenv("ARTICLE_DATE", "").strip()
    days = sorted(by_day)
    if not days:
        raise RuntimeError("No viable daily snapshots")

    if requested:
        if requested not in by_day:
            raise RuntimeError(f"Requested ARTICLE_DATE={requested} has no data")
        target = requested
    else:
        viable = [d for d in days if coverage_is_sufficient(summarize_day(by_day[d]))]
        if not viable:
            latest = days[-1]
            summary = summarize_day(by_day[latest])
            raise RuntimeError(
                "Publication skipped: latest dataset is too small for a daily market article "
                f"({summary['records']} records, {summary['stations']} stations, {summary['cities']} cities; "
                f"required at least {MIN_DAILY_RECORDS}/{MIN_DAILY_STATIONS}/{MIN_DAILY_CITIES})."
            )
        target = viable[-1]

    previous = next((d for d in reversed(days) if d < target), None)
    return target, previous


def fmt_price(value: float) -> str:
    return f"{value:.3f}".rstrip("0").rstrip(".").replace(".", ",")


def fmt_change(value: float) -> str:
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.3f}".rstrip("0").rstrip(".").replace(".", ",")


def fmt_percent(value: float) -> str:
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.2f}".replace(".", ",") + "%"


def build_facts(target: str, current: dict, previous_day: str | None, previous: dict | None) -> dict:
    facts = {
        "date": target,
        "previous_date": previous_day,
        "coverage": {
            "records": current["records"],
            "stations": current["stations"],
            "cities": current["cities"],
            "scope_label": "наблюдаваната извадка на goriva.online",
            "national_claim_allowed": False,
        },
        "fuels": {},
        "cheapest_cities": {},
    }

    for fuel, data in current["fuels"].items():
        item = {
            "count": data["count"],
            "average": data["average"],
            "median": data["median"],
            "minimum": data["minimum"],
            "maximum": data["maximum"],
            "display": {
                "average": fmt_price(data["average"]),
                "median": fmt_price(data["median"]),
                "minimum": fmt_price(data["minimum"]),
                "maximum": fmt_price(data["maximum"]),
            },
        }
        old = previous["fuels"].get(fuel) if previous else None
        if old:
            delta = round(data["average"] - old["average"], 3)
            pct = round((delta / old["average"]) * 100, 2) if old["average"] else 0
            item["change"] = {
                "previous_average": old["average"],
                "absolute": delta,
                "percent": pct,
                "display_previous_average": fmt_price(old["average"]),
                "display_absolute": fmt_change(delta),
                "display_percent": fmt_percent(pct),
            }
        facts["fuels"][fuel] = item

    for fuel in ("Бензин A95", "Дизел", "LPG", "Метан"):
        candidates = [x for x in current["city_averages"] if x["fuel"] == fuel]
        candidates.sort(key=lambda x: x["average"])
        facts["cheapest_cities"][fuel] = [
            {**x, "display_average": fmt_price(x["average"])} for x in candidates[:5]
        ]

    return facts


def response_text(response) -> str:
    text = getattr(response, "output_text", None)
    if text:
        return text.strip()
    chunks = []
    for item in getattr(response, "output", []) or []:
        for content in getattr(item, "content", []) or []:
            value = getattr(content, "text", None)
            if value:
                chunks.append(value)
    return "\n".join(chunks).strip()


def generate_article(facts: dict) -> dict:
    client = OpenAI(api_key=require_env("OPENAI_API_KEY"))
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

    source_list = ", ".join(PREFERRED_BG_SOURCES)
    target_date = facts["date"]
    prompt = f"""
Ти си икономически журналист на goriva.online. Напиши оригинален дневен обзор на БЪЛГАРСКИ език.

СТРОГИ РЕДАКЦИОННИ ПРАВИЛА:
1. Ценовите числа са изчислени от Python и се намират във FACTS_JSON. НЕ смятай сам нищо. Когато цитираш цена, промяна или процент, използвай точно display полетата.
2. Данните НЕ са официална национална статистика. Формулирай ги като „наблюдаваната извадка на goriva.online“, „наблюдаваните обекти“ или „данните в goriva.online“.
3. Забранено е заглавието да внушава, че малката извадка представлява целия български пазар. Не използвай категорично „горивата в България поскъпват/поевтиняват“. Споменавай goriva.online или наблюдаваната извадка.
4. Задължително посочи размера на извадката: records, stations и cities.
5. За външен контекст използвай web search САМО към български източници/домейни. Предпочитани: {source_list}.
6. Използвай само външни публикации, публикувани до {SOURCE_MAX_AGE_HOURS} часа преди {target_date}. Ако няма надеждна свежа публикация, НЕ добавяй пазарен контекст и върни sources=[] .
7. Не използвай чуждестранен домейн като директен източник. Българска медия може да преразказва международна новина.
8. В body_html НЕ поставяй URL, markdown link, скоби с източник, inline citation или utm параметри. Всички източници са само в sources.
9. В пазарния контекст не цитирай външни десетични котировки или проценти. Описвай контекста качествено.
10. Ако има външен контекст, секцията се казва точно <h2>Пазарен контекст от български източници</h2>.
11. Не твърди причинно-следствена връзка между външна новина и конкретна промяна в наблюдаваните цени без доказателство.
12. Без сензационализъм, инвестиционни прогнози и AI формулировки. 600–900 думи при достатъчно материал.
13. body_html може да съдържа само <h2>, <h3>, <p>, <ul>, <li>, <strong>, <blockquote>.
14. За всеки source върни published_at във формат YYYY-MM-DDTHH:MM:SS+03:00 или поне YYYY-MM-DD.

FACTS_JSON:
{json.dumps(facts, ensure_ascii=False, indent=2)}
""".strip()

    response = client.responses.create(
        model=MODEL,
        reasoning={"effort": "low"},
        tools=[{"type": "web_search"}],
        input=prompt,
        text={
            "format": {
                "type": "json_schema",
                "name": "daily_fuel_article_bg",
                "strict": True,
                "schema": schema,
            }
        },
    )
    raw = response_text(response)
    if not raw:
        raise RuntimeError("OpenAI returned no article text")
    return json.loads(raw)


def clean_source_url(url: str) -> str:
    parts = urlsplit((url or "").strip())
    kept = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k.lower() not in TRACKING_QUERY_KEYS and not k.lower().startswith("utm_")]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(kept), ""))


def is_bulgarian_source(url: str) -> bool:
    try:
        host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    except ValueError:
        return False
    return host.endswith(".bg") or host in PREFERRED_BG_SOURCES


def parse_source_date(value: str, target_day: str) -> datetime:
    text = (value or "").strip()
    if not text:
        raise ValueError("missing source date")
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=SOFIA)
        return parsed.astimezone(SOFIA)
    except ValueError:
        parsed_day = date.fromisoformat(text[:10])
        return datetime.combine(parsed_day, datetime.min.time(), tzinfo=SOFIA)


def normalize_and_validate_sources(article: dict, target_day: str) -> None:
    cleaned = []
    target_end = datetime.combine(date.fromisoformat(target_day), datetime.max.time(), tzinfo=SOFIA)
    oldest = target_end - timedelta(hours=SOURCE_MAX_AGE_HOURS)

    for source in article.get("sources") or []:
        url = clean_source_url(str(source.get("url") or ""))
        if not url.startswith(("https://", "http://")):
            raise RuntimeError(f"Publication stopped: invalid source URL: {url}")
        if not is_bulgarian_source(url):
            raise RuntimeError(f"Publication stopped: non-Bulgarian source returned by model: {url}")

        try:
            published = parse_source_date(str(source.get("published_at") or ""), target_day)
        except ValueError as exc:
            raise RuntimeError(f"Publication stopped: source has no valid publication date: {url}") from exc

        if published < oldest or published > target_end + timedelta(hours=12):
            raise RuntimeError(
                f"Publication stopped: source is not fresh enough for daily news ({source.get('published_at')}): {url}"
            )

        cleaned.append({"name": source.get("name") or url, "url": url, "published_at": published.isoformat()})

    article["sources"] = cleaned


def allowed_numbers(facts: dict) -> set[str]:
    values: set[str] = set()

    def add(value):
        if isinstance(value, bool):
            return
        if isinstance(value, (int, float)):
            for variant in (str(value), f"{value:.1f}", f"{value:.2f}", f"{value:.3f}"):
                values.add(variant)
                values.add(variant.replace(".", ","))
        elif isinstance(value, str):
            values.update(re.findall(r"(?<!\d)\d+[\.,]\d{1,3}(?!\d)", value))
        elif isinstance(value, dict):
            for v in value.values():
                add(v)
        elif isinstance(value, list):
            for v in value:
                add(v)

    add(facts)
    return values


def decimal_numbers(text: str) -> list[str]:
    return re.findall(r"(?<!\d)\d+[\.,]\d{1,3}(?!\d)", text or "")


def validate_article(article: dict, facts: dict) -> None:
    title = article.get("title", "")
    title_low = title.lower()
    if "в българия" in title_low and "goriva.online" not in title_low and "наблюдаван" not in title_low:
        raise RuntimeError("Publication stopped: title overstates the scope of the goriva.online sample")

    body_html = article.get("body_html", "")
    if re.search(r"https?://|www\.", body_html, flags=re.I) or re.search(r"\[[^\]]+\]\([^\)]+\)", body_html):
        raise RuntimeError("Publication stopped: inline URL/markdown citation leaked into body_html")

    allowed = allowed_numbers(facts)
    context_heading = r"<h2\b[^>]*>\s*Пазарен\s+контекст\s+от\s+български\s+източници\s*</h2>"
    marker = re.search(context_heading, body_html, flags=re.I)
    local_html = body_html[:marker.start()] if marker else body_html
    external_html = body_html[marker.start():] if marker else ""

    local_text = " ".join([title, article.get("deck", ""), re.sub(r"<[^>]+>", " ", local_html)])
    unknown_local = sorted({n for n in decimal_numbers(local_text) if n not in allowed})
    if unknown_local:
        raise RuntimeError(f"Publication stopped: local decimal numbers are not present in prepared facts: {unknown_local}")

    external_text = re.sub(r"<[^>]+>", " ", external_html)
    external_decimals = sorted(set(decimal_numbers(external_text)))
    if external_decimals:
        raise RuntimeError(f"Publication stopped: external context must stay qualitative: {external_decimals}")


def sanitize_body(body_html: str) -> str:
    body = body_html or ""
    body = re.sub(r"<\/?(?:script|style|iframe|object|embed)[^>]*>", "", body, flags=re.I)
    body = re.sub(r"\[([^\]]+)\]\(https?://[^\)]+\)", r"\1", body, flags=re.I)
    body = re.sub(r"\(\s*https?://[^\)]+\)", "", body, flags=re.I)
    body = re.sub(r"https?://\S+", "", body, flags=re.I)
    return body.strip()


def render_sources(sources: list[dict]) -> str:
    items = []
    for source in sources[:8]:
        url = clean_source_url(str(source.get("url") or ""))
        if not is_bulgarian_source(url):
            continue
        name = html.escape(str(source.get("name") or url))
        safe_url = html.escape(url, quote=True)
        items.append(f'<li><a href="{safe_url}" target="_blank" rel="noopener noreferrer">{name}</a></li>')
    if not items:
        return ""
    return '<section class="article-sources"><h2>Източници</h2><ul>' + "".join(items) + "</ul></section>"


def publication_timestamp(target_day: str) -> str:
    today = datetime.now(SOFIA).date().isoformat()
    if target_day == today:
        return datetime.now(SOFIA).replace(microsecond=0).isoformat()
    return f"{target_day}T18:30:00+03:00"


def render_article(date_str: str, article: dict) -> str:
    title = html.escape(article["title"])
    description = html.escape(article["description"][:160], quote=True)
    deck = html.escape(article["deck"])
    body = sanitize_body(article["body_html"])
    url = f"https://goriva.online/pages/articles/daily/{date_str}/"
    published = publication_timestamp(date_str)
    image_url = f"https://goriva.online/media/daily-news/{date_str}.png"
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
        "articleSection": "Цени на горивата",
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
            {"@type": "ListItem", "position": 3, "name": "Дневен обзор", "item": url},
        ],
    }
    return f'''<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} | goriva.online</title>
  <meta name="description" content="{description}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="{url}">
  <link rel="icon" type="image/svg+xml" href="/media/fav.svg">
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
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/pages/styles/article-modern.css?v=20260829-newsroom1">
  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
  <script type="application/ld+json">{json.dumps(breadcrumbs, ensure_ascii=False)}</script>
</head>
<body>
  <main class="article-page">
    <article>
      <div class="article-news-kicker">Дневен обзор</div>
      <h1 class="article-title">{title}</h1>
      <p class="article-news-deck">{deck}</p>
      <div class="article-meta"><span>{date_str}</span><span>goriva.online</span></div>
      <div class="article-content-full">
        {body}
        {render_sources(article.get("sources", []))}
        <p class="data-source"><strong>За данните:</strong> ценовите стойности са агрегирани от наблюденията в goriva.online за посочената дата и не представляват официална национална средна цена. Данните са информационни и могат да се различават от цената на място.</p>
      </div>
    </article>
  </main>
  <script src="/scripts/script.js?v=20260829-daily-news" defer></script>
</body>
</html>
'''


def load_manifest() -> list[dict]:
    path = ROOT / "data" / "generated-news.json"
    if not path.exists():
        return []
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, list) else []
    except json.JSONDecodeError:
        return []


def save_manifest(items: list[dict]) -> None:
    path = ROOT / "data" / "generated-news.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_news_page() -> None:
    path = ROOT / "pages" / "news.html"
    text = path.read_text(encoding="utf-8")
    start = "<!-- AUTO_DAILY_NEWS_START -->"
    end = "<!-- AUTO_DAILY_NEWS_END -->"
    manifest = load_manifest()
    cards = []
    for entry in manifest[:12]:
        cards.append(f'''<article class="article-card" data-category="analysis">
  <div class="article-content">
    <div class="article-date">{html.escape(entry['date'])} · Дневен обзор</div>
    <h3><a href="{html.escape(entry['url'], quote=True)}">{html.escape(entry['title'])}</a></h3>
    <p>{html.escape(entry['description'])}</p>
    <a class="article-link" href="{html.escape(entry['url'], quote=True)}">Прочети повече →</a>
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
    path.write_text(text, encoding="utf-8")


def update_sitemap(url: str, date_str: str) -> None:
    from automation.rebuild_sitemap import rebuild_sitemap
    rebuild_sitemap()


def main() -> None:
    rows = fetch_rows()
    by_day = build_daily_snapshots(rows)
    target_day, previous_day = select_days(by_day)
    current = summarize_day(by_day[target_day])
    if not coverage_is_sufficient(current):
        raise RuntimeError(
            "Publication skipped: selected dataset does not meet minimum coverage "
            f"({current['records']} records, {current['stations']} stations, {current['cities']} cities)."
        )

    previous = summarize_day(by_day[previous_day]) if previous_day else None
    facts = build_facts(target_day, current, previous_day, previous)
    article = generate_article(facts)
    normalize_and_validate_sources(article, target_day)
    article["body_html"] = sanitize_body(article.get("body_html", ""))
    validate_article(article, facts)

    out_dir = ROOT / "pages" / "articles" / "daily" / target_day
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.html").write_text(render_article(target_day, article), encoding="utf-8")

    relative_url = f"/pages/articles/daily/{target_day}/"
    manifest = [x for x in load_manifest() if x.get("date") != target_day]
    manifest.insert(0, {
        "date": target_day,
        "title": article["title"],
        "description": article["description"],
        "url": relative_url,
    })
    manifest.sort(key=lambda x: x.get("date", ""), reverse=True)
    save_manifest(manifest[:90])
    update_news_page()
    update_sitemap(f"https://goriva.online{relative_url}", target_day)

    print(json.dumps({
        "status": "generated",
        "date": target_day,
        "previous_date": previous_day,
        "records": current["records"],
        "stations": current["stations"],
        "cities": current["cities"],
        "sources": [s.get("url") for s in article.get("sources", [])],
        "model": MODEL,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
