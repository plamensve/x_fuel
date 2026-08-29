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
DEFAULT_SUPABASE_URL = "https://eaqvhxfvozhzatrnbkvx.supabase.co"
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
        if not row.get("created_at") or row.get("price") is None:
            continue
        dt = parse_dt(row["created_at"])
        day = dt.date().isoformat()
        fuel = canonical_fuel(row.get("fuel", ""))
        key = (
            day,
            (row.get("city") or "").strip(),
            (row.get("station") or "").strip(),
            fuel,
            (row.get("location") or "").strip(),
        )
        candidate = dict(row)
        candidate["_dt"] = dt
        candidate["_day"] = day
        candidate["_fuel"] = fuel
        current = latest.get(key)
        if current is None or dt > current["_dt"]:
            latest[key] = candidate

    by_day: dict[str, list[dict]] = defaultdict(list)
    for row in latest.values():
        by_day[row["_day"]].append(row)
    return dict(by_day)


def select_days(by_day: dict[str, list[dict]], requested: str | None) -> tuple[str, str | None]:
    days = sorted(by_day)
    if not days:
        raise RuntimeError("No viable daily snapshots")
    if requested:
        if requested not in by_day:
            raise RuntimeError(f"Requested ARTICLE_DATE {requested} has no data")
        target = requested
    else:
        viable = [d for d in days if len(by_day[d]) >= 20]
        target = viable[-1] if viable else days[-1]
    previous = next((d for d in reversed(days) if d < target), None)
    return target, previous


def safe_price(row: dict) -> float:
    return float(row["price"])


def summarize_day(rows: list[dict]) -> dict:
    by_fuel: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        price = safe_price(row)
        if 0.2 <= price <= 10:
            by_fuel[row["_fuel"]].append(row)

    fuels = {}
    for fuel, items in sorted(by_fuel.items()):
        prices = [safe_price(r) for r in items]
        cheapest = sorted(items, key=safe_price)[:5]
        fuels[fuel] = {
            "count": len(items),
            "average": round(statistics.mean(prices), 3),
            "median": round(statistics.median(prices), 3),
            "minimum": round(min(prices), 3),
            "maximum": round(max(prices), 3),
            "cheapest": [
                {
                    "city": r.get("city") or "",
                    "station": r.get("station") or "",
                    "price": round(safe_price(r), 3),
                    "location": r.get("location") or "",
                }
                for r in cheapest
            ],
        }

    city_fuel: dict[tuple[str, str], list[float]] = defaultdict(list)
    for row in rows:
        city = (row.get("city") or "").strip()
        if city:
            city_fuel[(city, row["_fuel"])].append(safe_price(row))
    city_averages = [
        {"city": city, "fuel": fuel, "average": round(statistics.mean(values), 3), "count": len(values)}
        for (city, fuel), values in city_fuel.items()
        if len(values) >= 2
    ]
    return {
        "records": len(rows),
        "stations": len({((r.get("station") or ""), (r.get("location") or ""), (r.get("city") or "")) for r in rows}),
        "cities": len({(r.get("city") or "").strip() for r in rows if (r.get("city") or "").strip()}),
        "fuels": fuels,
        "city_averages": city_averages,
    }


def build_facts(target: str, current: dict, previous_day: str | None, previous: dict | None) -> dict:
    facts = {"date": target, "current": current, "previous_date": previous_day, "changes": {}}
    if previous:
        for fuel, data in current["fuels"].items():
            old = previous["fuels"].get(fuel)
            if old:
                delta = round(data["average"] - old["average"], 3)
                pct = round((delta / old["average"]) * 100, 2) if old["average"] else 0
                facts["changes"][fuel] = {"absolute": delta, "percent": pct, "previous_average": old["average"]}
    for fuel in ("Дизел", "Бензин A95", "LPG"):
        candidates = [x for x in current["city_averages"] if x["fuel"] == fuel and x["count"] >= 3]
        candidates.sort(key=lambda x: x["average"])
        facts.setdefault("cheapest_cities", {})[fuel] = candidates[:5]
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
                    "properties": {"name": {"type": "string"}, "url": {"type": "string"}},
                    "required": ["name", "url"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["title", "description", "deck", "body_html", "sources"],
        "additionalProperties": False,
    }
    prompt = f"""
Ти си икономически журналист на goriva.online. Напиши оригинален дневен обзор на БЪЛГАРСКИ език за цените и пазара на горивата.

СТРОГИ ПРАВИЛА:
- Данните за българските цени идват единствено от FACTS_JSON. Не измисляй числа, цени, проценти, градове или бензиностанции.
- Разграничавай средна наблюдавана цена в goriva.online от официална национална средна цена.
- Използвай web search само за актуален международен/европейски пазарен контекст: Brent, петролни продукти, OPEC+, рафинерии, запаси, санкции или събития с реално отношение към горивата.
- За външния контекст предпочитай Reuters, IEA, EIA, European Commission, OPEC и официални институции. Не използвай слухове и SEO агрегатори.
- Не твърди причинно-следствена връзка между международно събитие и българска цена, ако няма доказателство. Използвай формулировки като „може да окаже влияние“.
- Международни числови стойности са разрешени само когато са подкрепени от поне един върнат source URL.
- Отделяй международния контекст в самостоятелна секция с точно заглавие <h2>Международен пазарен контекст</h2>. Всички локални български числа трябва да са преди тази секция и да идват само от FACTS_JSON.
- Статията трябва да звучи като професионален български икономически новинарски материал, не като AI отчет.
- Без сензационни заглавия и без инвестиционни прогнози.
- Около 700–1000 думи, когато има достатъчно факти; по-кратко, ако денят е спокоен.
- body_html съдържа само HTML фрагмент с <h2>, <p>, <ul>/<li> и по желание <blockquote>. Без <html>, <head>, markdown и script.
- Не поставяй URL-и в body_html. Върни използваните външни източници в sources.

FACTS_JSON:
{json.dumps(facts, ensure_ascii=False, indent=2)}
""".strip()
    response = client.responses.create(
        model=MODEL,
        reasoning={"effort": "low"},
        tools=[{"type": "web_search"}],
        input=prompt,
        text={"format": {"type": "json_schema", "name": "daily_fuel_article", "strict": True, "schema": schema}},
    )
    raw = response_text(response)
    if not raw:
        raise RuntimeError("OpenAI returned no article text")
    return json.loads(raw)


def allowed_numbers(facts: dict) -> set[str]:
    numbers = set()

    def add(value):
        if isinstance(value, bool):
            return
        if isinstance(value, (int, float)):
            variants = {
                str(value),
                f"{value:.1f}",
                f"{value:.2f}",
                f"{value:.3f}",
            }
            for variant in variants:
                numbers.add(variant)
                numbers.add(variant.replace(".", ","))
        elif isinstance(value, dict):
            for v in value.values():
                add(v)
        elif isinstance(value, list):
            for v in value:
                add(v)

    add(facts)
    return numbers


def decimal_numbers(text: str) -> list[str]:
    return re.findall(r"(?<!\d)\d+[\.,]\d{1,3}(?!\d)", text or "")


def valid_external_sources(article: dict) -> list[dict]:
    valid = []
    for source in article.get("sources") or []:
        url = str(source.get("url") or "").strip()
        if re.match(r"^https?://", url, flags=re.I):
            valid.append(source)
    return valid


def validate_local_claims(article: dict, facts: dict) -> None:
    allowed = allowed_numbers(facts)
    title_and_deck = " ".join([article.get("title", ""), article.get("deck", "")])
    header_unknown = sorted({n for n in decimal_numbers(title_and_deck) if n not in allowed})
    if header_unknown:
        raise RuntimeError(
            "Validation stopped publication: title/deck contains decimal numbers not present in local facts: "
            f"{header_unknown}"
        )

    body_html = article.get("body_html", "")
    marker = re.search(
        r"<h2\b[^>]*>\s*Международен\s+пазарен\s+контекст\s*</h2>",
        body_html,
        flags=re.I,
    )

    if marker:
        local_html = body_html[:marker.start()]
        external_html = body_html[marker.start():]
    else:
        local_html = body_html
        external_html = ""

    local_text = re.sub(r"<[^>]+>", " ", local_html)
    local_unknown = sorted({n for n in decimal_numbers(local_text) if n not in allowed})
    if local_unknown:
        raise RuntimeError(
            "Validation stopped publication: unverified decimal numbers in the Bulgarian/local section: "
            f"{local_unknown}"
        )

    external_text = re.sub(r"<[^>]+>", " ", external_html)
    external_numbers = decimal_numbers(external_text)
    if external_numbers and not valid_external_sources(article):
        raise RuntimeError(
            "Validation stopped publication: international numeric claims were generated without a valid external source URL"
        )

    # Extra guard: local market wording must never carry an unknown decimal even inside the
    # international section. This prevents a sourced oil-market number from being presented
    # as if it were a Bulgarian pump-price observation.
    local_markers = (
        "българ", "goriva.online", "бензиностан", "бензин a95", "бензин a98",
        "бензин a100", "дизел", "lpg", "пропан", "метан", "наблюдавана цена",
        "средна цена", "цена на колонка",
    )
    for block in re.findall(r"<(?:p|li|blockquote)\b[^>]*>(.*?)</(?:p|li|blockquote)>", body_html, flags=re.I | re.S):
        text = re.sub(r"<[^>]+>", " ", block)
        lower = text.lower()
        if not any(marker_text in lower for marker_text in local_markers):
            continue
        unknown = sorted({n for n in decimal_numbers(text) if n not in allowed})
        if unknown:
            raise RuntimeError(
                "Validation stopped publication: a local-market sentence contains an unverified decimal number: "
                f"{unknown}"
            )


def render_sources(sources: list[dict]) -> str:
    items = []
    for source in sources[:8]:
        name = html.escape(source.get("name") or "Източник")
        url = html.escape(source.get("url") or "", quote=True)
        if url.startswith("http"):
            items.append(f'<li><a href="{url}" target="_blank" rel="noopener noreferrer">{name}</a></li>')
    if not items:
        return ""
    return '<section class="article-sources"><h2>Източници</h2><ul>' + "".join(items) + "</ul></section>"


def render_article(date_str: str, article: dict) -> str:
    title = html.escape(article["title"])
    description = html.escape(article["description"], quote=True)
    deck = html.escape(article["deck"])
    url = f"https://goriva.online/pages/articles/daily/{date_str}/"
    published = f"{date_str}T18:30:00+03:00"
    schema = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": article["title"],
        "description": article["description"],
        "datePublished": published,
        "dateModified": published,
        "mainEntityOfPage": url,
        "author": {"@type": "Organization", "name": "goriva.online"},
        "publisher": {"@type": "Organization", "name": "goriva.online", "url": "https://goriva.online/"},
    }
    return f'''<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} | goriva.online</title>
  <meta name="description" content="{description}">
  <link rel="canonical" href="{url}">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/pages/styles/article-modern.css?v=20260829-newsroom1">
  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
</head>
<body>
  <main class="article-page">
    <article>
      <div class="article-news-kicker">Дневен обзор</div>
      <h1 class="article-title">{title}</h1>
      <p class="article-news-deck">{deck}</p>
      <div class="article-meta"><span>{date_str}</span><span>goriva.online</span></div>
      <div class="article-content-full">
        {article["body_html"]}
        {render_sources(article.get("sources", []))}
        <p class="data-source"><strong>За цените в България:</strong> анализът използва наблюденията в базата данни на goriva.online за посочената дата. Данните са информационни и могат да се различават от цената на място.</p>
      </div>
    </article>
  </main>
  <script src="/scripts/script.js?v=20260829-daily-news"></script>
</body>
</html>
'''


def load_manifest() -> list[dict]:
    path = ROOT / "data" / "generated-news.json"
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def save_manifest(items: list[dict]) -> None:
    path = ROOT / "data" / "generated-news.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_news_page(item: dict) -> None:
    path = ROOT / "pages" / "news.html"
    text = path.read_text(encoding="utf-8")
    start = "<!-- AUTO_DAILY_NEWS_START -->"
    end = "<!-- AUTO_DAILY_NEWS_END -->"
    if start not in text or end not in text:
        block = f"\n{start}\n{end}\n"
        text = text.replace("</main>", block + "</main>", 1)
    manifest = load_manifest()
    cards = []
    for entry in manifest[:12]:
        cards.append(f'''<article class="news-card auto-daily-news-card">
  <div class="news-card-body">
    <span class="news-card-category">Дневен обзор</span>
    <h2><a href="{html.escape(entry['url'], quote=True)}">{html.escape(entry['title'])}</a></h2>
    <p>{html.escape(entry['description'])}</p>
    <div class="news-card-meta"><span>{html.escape(entry['date'])}</span><a href="{html.escape(entry['url'], quote=True)}">Прочети анализа →</a></div>
  </div>
</article>''')
    section = f'''{start}
<section class="news-section auto-daily-news" aria-labelledby="daily-news-heading">
  <div class="news-section-heading"><span>Ежедневно</span><h2 id="daily-news-heading">Дневни обзори на пазара</h2></div>
  <div class="news-grid">{''.join(cards)}</div>
</section>
{end}'''
    text = re.sub(re.escape(start) + r".*?" + re.escape(end), section, text, flags=re.S)
    path.write_text(text, encoding="utf-8")


def update_sitemap(url: str, date_str: str) -> None:
    path = ROOT / "sitemap.xml"
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    if url in text:
        return
    node = f"  <url>\n    <loc>{html.escape(url)}</loc>\n    <lastmod>{date_str}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n"
    text = text.replace("</urlset>", node + "</urlset>")
    path.write_text(text, encoding="utf-8")


def main() -> None:
    rows = fetch_rows()
    by_day = build_daily_snapshots(rows)
    requested = os.getenv("ARTICLE_DATE", "").strip() or None
    target_day, previous_day = select_days(by_day, requested)
    current = summarize_day(by_day[target_day])
    previous = summarize_day(by_day[previous_day]) if previous_day else None
    facts = build_facts(target_day, current, previous_day, previous)
    article = generate_article(facts)
    validate_local_claims(article, facts)

    out_dir = ROOT / "pages" / "articles" / "daily" / target_day
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "index.html"
    out_path.write_text(render_article(target_day, article), encoding="utf-8")

    url = f"/pages/articles/daily/{target_day}/"
    manifest = [x for x in load_manifest() if x.get("date") != target_day]
    manifest.insert(0, {
        "date": target_day,
        "title": article["title"],
        "description": article["description"],
        "url": url,
    })
    manifest.sort(key=lambda x: x.get("date", ""), reverse=True)
    save_manifest(manifest[:90])
    update_news_page(manifest[0])
    update_sitemap(f"https://goriva.online{url}", target_day)

    print(json.dumps({
        "status": "generated",
        "date": target_day,
        "previous_date": previous_day,
        "records": current["records"],
        "article": str(out_path.relative_to(ROOT)),
        "model": MODEL,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
