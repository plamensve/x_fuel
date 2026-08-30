from __future__ import annotations

import base64
import html
import json
import os
import re
from collections import defaultdict
from pathlib import Path

from openai import OpenAI

import automation.generate_daily_article_bg as base

ROOT = Path(__file__).resolve().parents[1]
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2")
MAJOR_CITIES = ("София", "Пловдив", "Варна", "Бургас", "Русе", "Стара Загора")
FUEL_ORDER = ("Бензин A95", "Дизел", "LPG", "Метан")
FUEL_LABELS = {"Бензин A95": "Бензин A95", "Дизел": "Дизел", "LPG": "Газ (LPG)", "Метан": "Метан"}
MIN_CITY_FUEL_OBSERVATIONS = 3


def resolve_date() -> str:
    requested = os.getenv("ARTICLE_DATE", "").strip()
    if requested:
        return requested
    daily_root = ROOT / "pages" / "articles" / "daily"
    candidates = sorted(p.parent.name for p in daily_root.glob("*/index.html"))
    if not candidates:
        raise RuntimeError("No generated daily article found")
    return candidates[-1]


def get_snapshots(date_str: str):
    rows = base.fetch_rows()
    by_day = base.build_daily_snapshots(rows)
    if date_str not in by_day:
        raise RuntimeError(f"No fuel data for {date_str}")
    return by_day


def city_summary(day_rows: list[dict], city_name: str) -> dict[str, dict]:
    buckets: dict[str, list[float]] = defaultdict(list)
    wanted = city_name.strip().casefold()
    for row in day_rows:
        if (row.get("city") or "").strip().casefold() != wanted:
            continue
        fuel = row.get("_fuel")
        if fuel not in FUEL_ORDER:
            continue
        buckets[fuel].append(float(row["_price"]))

    result = {}
    for fuel, values in buckets.items():
        if len(values) < MIN_CITY_FUEL_OBSERVATIONS:
            continue
        result[fuel] = {
            "average": sum(values) / len(values),
            "minimum": min(values),
            "maximum": max(values),
            "count": len(values),
        }
    return result


def fmt_eur(value: float) -> str:
    return f"{value:.2f} €".replace(".", ",")


def chart_block(spec: dict, caption: str, kind: str) -> str:
    payload = html.escape(json.dumps(spec, ensure_ascii=False, separators=(",", ":")), quote=True)
    return (
        f'<figure class="article-data-chart article-data-chart--recharts" data-chart-kind="{html.escape(kind)}">'
        f'<div class="recharts-article-chart" data-chart="{payload}"></div>'
        f'<figcaption>{html.escape(caption)}</figcaption>'
        '</figure>'
    )


def city_chart_spec(city: str, summary: dict) -> dict | None:
    data = []
    for fuel in FUEL_ORDER:
        item = summary.get(fuel)
        if not item:
            continue
        data.append({"fuel": FUEL_LABELS[fuel], "price": round(float(item["average"]), 2), "count": int(item["count"])})
    if not data:
        return None
    return {
        "type": "city",
        "title": f"Цени на горивата в {city}",
        "subtitle": "Средни цени по наличните наблюдения",
        "series": [{"key": "price", "label": "Средна цена"}],
        "data": data,
        "note": f"Показват се само горива с поне {MIN_CITY_FUEL_OBSERVATIONS} наблюдения за града.",
    }


def comparison_spec(summaries: dict[str, dict]) -> dict | None:
    rows = []
    for city in MAJOR_CITIES:
        summary = summaries.get(city, {})
        row = {"city": city}
        has_value = False
        for fuel, key in (("Бензин A95", "a95"), ("Дизел", "diesel"), ("LPG", "lpg")):
            item = summary.get(fuel)
            if item:
                row[key] = round(float(item["average"]), 2)
                has_value = True
            else:
                row[key] = None
        if has_value:
            rows.append(row)
    if len(rows) < 2:
        return None

    distinct_by_fuel = {}
    for key in ("a95", "diesel", "lpg"):
        vals = {row[key] for row in rows if row.get(key) is not None}
        distinct_by_fuel[key] = len(vals)
    note = "Скалата се адаптира към реалния диапазон, за да се виждат и малките разлики между градовете."
    if all(v <= 1 for v in distinct_by_fuel.values()):
        note += " За тази дата закръглените средни стойности по наличните градове практически съвпадат."

    return {
        "type": "comparison",
        "title": "Сравнение на цените в големите градове",
        "subtitle": "София, Пловдив, Варна, Бургас, Русе и Стара Загора",
        "series": [
            {"key": "a95", "label": "Бензин A95"},
            {"key": "diesel", "label": "Дизел"},
            {"key": "lpg", "label": "Газ (LPG)"},
        ],
        "data": rows,
        "note": note,
    }


def trend_spec(by_day: dict[str, list[dict]], date_str: str) -> dict | None:
    days = [d for d in sorted(by_day) if d <= date_str][-7:]
    if len(days) < 2:
        return None
    rows = []
    for day in days:
        summary = base.summarize_day(by_day[day])
        row = {"day": day[5:]}
        for fuel, key in (("Бензин A95", "a95"), ("Дизел", "diesel"), ("LPG", "lpg")):
            item = summary.get("fuels", {}).get(fuel)
            row[key] = round(float(item["average"]), 2) if item else None
        rows.append(row)
    return {
        "type": "trend",
        "title": "Движение на цените през последните налични дни",
        "subtitle": "Средни стойности по основни горива",
        "series": [
            {"key": "a95", "label": "Бензин A95"},
            {"key": "diesel", "label": "Дизел"},
            {"key": "lpg", "label": "Газ (LPG)"},
        ],
        "data": rows,
        "note": "Всички стойности са закръглени до втория знак след десетичната запетая.",
    }


def remove_old_charts(body: str) -> str:
    body = re.sub(r'<figure\b[^>]*class="[^"]*article-data-chart[^"]*"[^>]*>.*?</figure>', '', body, flags=re.I | re.S)
    return body


def insert_after_heading(body: str, heading_match: str, block: str) -> tuple[str, bool]:
    pattern = re.compile(r'(<h2\b[^>]*>(.*?)</h2>)', re.I | re.S)
    for match in pattern.finditer(body):
        label = re.sub(r'<[^>]+>', ' ', match.group(2)).casefold()
        if heading_match.casefold() in label:
            return body[:match.end()] + block + body[match.end():], True
    return body, False


def city_section(city: str, summary: dict, chart_html: str) -> str:
    if summary:
        items = []
        for fuel in FUEL_ORDER:
            item = summary.get(fuel)
            if not item:
                continue
            items.append(
                f'<li><strong>{html.escape(FUEL_LABELS[fuel])}</strong>: средно {fmt_eur(item["average"])}, '
                f'минимум {fmt_eur(item["minimum"])}, максимум {fmt_eur(item["maximum"])}, '
                f'{item["count"]} наблюдения.</li>'
            )
        copy = '<p>Актуалните налични данни за града показват:</p><ul>' + ''.join(items) + '</ul>'
    else:
        copy = '<p>За тази дата няма поне три надеждни наблюдения за основните горива в този град.</p>'
    return f'<h2>Цени на горивата в {city}</h2>{chart_html}{copy}'


def ensure_city_sections(body: str, summaries: dict[str, dict], charts: dict[str, str]) -> str:
    marker = re.search(r'<h2[^>]*>\s*Пазарен контекст', body, re.I)
    insert_at = marker.start() if marker else len(body)
    additions = []
    for city in MAJOR_CITIES:
        pattern = rf'<h2[^>]*>\s*Цени на горивата (?:в|във) {re.escape(city)}\s*</h2>'
        chart = charts.get(city, "")
        if re.search(pattern, body, re.I):
            if chart:
                body, _ = insert_after_heading(body, city, chart)
            continue
        additions.append(city_section(city, summaries.get(city, {}), chart))
    if additions:
        body = body[:insert_at] + ''.join(additions) + body[insert_at:]
    return body


def section_text(body: str, keyword: str) -> str:
    pattern = re.compile(r'<h2\b[^>]*>(.*?)</h2>(.*?)(?=<h2\b|$)', re.I | re.S)
    for match in pattern.finditer(body):
        heading = re.sub(r'<[^>]+>', ' ', match.group(1)).casefold()
        if keyword.casefold() in heading:
            text = re.sub(r'<[^>]+>', ' ', match.group(2))
            return re.sub(r'\s+', ' ', text).strip()[:900]
    return ''


def generate_inline_ai_image(date_str: str, slug: str, heading: str, context: str, out_dir: Path) -> str | None:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or not context:
        return None
    prompt = (
        f"Create a realistic editorial image for a Bulgarian fuel-market article section. Section: {heading}. "
        f"Context: {context[:900]}. Use a credible Bulgarian/European setting. No text, prices, numbers, logos, "
        "station brands, watermarks or fake UI. Landscape, natural light, business-news quality."
    )
    try:
        response = OpenAI(api_key=api_key).images.generate(
            model=IMAGE_MODEL, prompt=prompt, size="1536x1024", quality="medium", output_format="png"
        )
        if not response.data or not getattr(response.data[0], "b64_json", None):
            return None
        path = out_dir / f"section-{slug}.png"
        path.write_bytes(base64.b64decode(response.data[0].b64_json))
        return f"/media/daily-news/{date_str}/section-{slug}.png"
    except Exception as exc:
        print(f"Inline image warning ({slug}): {exc}")
        return None


def inline_image(src: str, caption: str) -> str:
    return (
        f'<figure class="editorial-inline-ai-image"><img src="{html.escape(src, quote=True)}" '
        f'alt="{html.escape(caption)}" loading="lazy" decoding="async"><figcaption>{html.escape(caption)}</figcaption></figure>'
    )


def enrich_article(date_str: str, by_day: dict[str, list[dict]]) -> None:
    article_path = ROOT / "pages" / "articles" / "daily" / date_str / "index.html"
    text = article_path.read_text(encoding="utf-8")
    day_rows = by_day[date_str]
    summaries = {city: city_summary(day_rows, city) for city in MAJOR_CITIES}

    # Diagnostic guard: report identical rounded values rather than pretending the chart shows a difference.
    for fuel in ("Бензин A95", "Дизел", "LPG"):
        city_values = [(city, round(float(summary[fuel]["average"]), 2)) for city, summary in summaries.items() if fuel in summary]
        if len(city_values) >= 3 and len({v for _, v in city_values}) == 1:
            print(f"City comparison note: {fuel} has the same rounded average in {len(city_values)} major cities: {city_values[0][1]:.2f}")

    city_charts = {}
    for city, summary in summaries.items():
        spec = city_chart_spec(city, summary)
        city_charts[city] = chart_block(spec, f"Средни цени по основни горива в {city}.", f"city-{city}") if spec else ""

    comparison = comparison_spec(summaries)
    trend = trend_spec(by_day, date_str)

    match = re.search(r'(<div\b[^>]*class="[^"]*article-content-full[^"]*"[^>]*>)(.*?)(</div>\s*</article>)', text, re.I | re.S)
    if not match:
        raise RuntimeError("article-content-full not found")
    body = remove_old_charts(match.group(2))
    body = ensure_city_sections(body, summaries, city_charts)

    if comparison:
        comparison_html = '<h2>Сравнение на цените в големите градове</h2>' + chart_block(
            comparison,
            "Сравнение между средните цени в големите градове; празните стойности означават недостатъчно данни.",
            "major-cities",
        )
        marker = re.search(r'<h2[^>]*>\s*Пазарен контекст', body, re.I)
        if marker:
            body = body[:marker.start()] + comparison_html + body[marker.start():]
        else:
            body += comparison_html

    if trend:
        body, ok = insert_after_heading(
            body,
            "Какво се промени",
            chart_block(trend, "Тренд за последните налични дни.", "trend"),
        )
        if not ok:
            body += '<h2>Движение на цените през последните дни</h2>' + chart_block(trend, "Тренд за последните налични дни.", "trend")

    out_dir = ROOT / "media" / "daily-news" / date_str
    out_dir.mkdir(parents=True, exist_ok=True)
    cities_context = section_text(body, "Сравнение на цените")
    market_context = section_text(body, "Пазарен контекст")
    cities_img = generate_inline_ai_image(date_str, "cities", "Сравнение на цените в големите градове", cities_context, out_dir)
    market_img = generate_inline_ai_image(date_str, "market", "Пазарен контекст", market_context, out_dir)
    if cities_img:
        body, _ = insert_after_heading(body, "Сравнение на цените", inline_image(cities_img, "Редакционна илюстрация към сравнението между големите градове."))
    if market_img:
        body, _ = insert_after_heading(body, "Пазарен контекст", inline_image(market_img, "Редакционна илюстрация към пазарния контекст."))

    text = text[:match.start(2)] + body + text[match.end(2):]
    module_src = '/scripts/daily-article-charts.js?v=20260830-1'
    if module_src not in text:
        text = text.replace('</body>', f'  <script type="module" src="{module_src}"></script>\n</body>', 1)
    article_path.write_text(text, encoding="utf-8")
    print(f"Recharts article visuals added for {date_str}; cities with data: {[c for c,s in summaries.items() if s]}")


def main() -> None:
    date_str = resolve_date()
    by_day = get_snapshots(date_str)
    enrich_article(date_str, by_day)


if __name__ == "__main__":
    main()
