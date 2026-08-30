from __future__ import annotations

import base64
import html
import os
import re
from collections import defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
from openai import OpenAI

import automation.generate_daily_article_bg as base

ROOT = Path(__file__).resolve().parents[1]
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2")
MAJOR_CITIES = ("София", "Пловдив", "Варна", "Бургас", "Русе", "Стара Загора")
FUEL_ORDER = ("Бензин A95", "Дизел", "LPG", "Метан")
FUEL_LABELS = {"Бензин A95": "Бензин A95", "Дизел": "Дизел", "LPG": "Газ (LPG)", "Метан": "Метан"}


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
    wanted = city_name.casefold()
    for row in day_rows:
        if (row.get("city") or "").strip().casefold() != wanted:
            continue
        buckets[row["_fuel"]].append(float(row["_price"]))
    result = {}
    for fuel, values in buckets.items():
        if values:
            result[fuel] = {
                "average": sum(values) / len(values),
                "minimum": min(values),
                "maximum": max(values),
                "count": len(values),
            }
    return result


def fmt_eur(value: float) -> str:
    return f"{value:.2f} €".replace(".", ",")


def euro_tick(value, _pos=None):
    return f"{value:.2f}".replace(".", ",")


def save_city_chart(date_str: str, city: str, summary: dict, out_dir: Path) -> str | None:
    fuels = [f for f in FUEL_ORDER if f in summary]
    if not fuels:
        return None
    values = [float(summary[f]["average"]) for f in fuels]
    labels = [FUEL_LABELS[f] for f in fuels]
    fig, ax = plt.subplots(figsize=(9.6, 5.4))
    bars = ax.bar(labels, values)
    ax.set_ylabel("Средна цена, €")
    ax.set_title(f"Цени на горивата в {city}")
    ax.yaxis.set_major_formatter(FuncFormatter(euro_tick))
    ax.grid(axis="y", alpha=0.18)
    ax.tick_params(axis="x", rotation=10)
    for bar, value in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height(), fmt_eur(value), ha="center", va="bottom", fontsize=10, fontweight="bold")
    fig.tight_layout()
    slug = city.lower().replace(" ", "-").replace("а", "a").replace("о", "o").replace("и", "i").replace("е", "e").replace("у", "u").replace("р", "r").replace("с", "s").replace("ф", "f").replace("в", "v").replace("н", "n").replace("б", "b").replace("г", "g").replace("д", "d").replace("л", "l").replace("п", "p").replace("м", "m").replace("т", "t").replace("к", "k").replace("з", "z")
    path = out_dir / f"city-{slug}.png"
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return f"/media/daily-news/{date_str}/{path.name}"


def save_city_comparison(date_str: str, summaries: dict[str, dict], out_dir: Path) -> str | None:
    cities = [c for c in MAJOR_CITIES if summaries.get(c)]
    if not cities:
        return None
    fuels = ("Бензин A95", "Дизел", "LPG")
    fig, ax = plt.subplots(figsize=(11.5, 6.2))
    x = list(range(len(cities)))
    width = 0.24
    offsets = (-width, 0, width)
    for fuel, offset in zip(fuels, offsets):
        values = [summaries[c].get(fuel, {}).get("average", float("nan")) for c in cities]
        ax.bar([i + offset for i in x], values, width=width, label=FUEL_LABELS[fuel])
    ax.set_xticks(x, cities)
    ax.set_ylabel("Средна цена, €")
    ax.set_title("Сравнение на цените в големите градове")
    ax.yaxis.set_major_formatter(FuncFormatter(euro_tick))
    ax.grid(axis="y", alpha=0.18)
    ax.legend(frameon=False, ncol=3)
    fig.tight_layout()
    path = out_dir / "major-cities-comparison.png"
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return f"/media/daily-news/{date_str}/major-cities-comparison.png"


def save_price_spread(date_str: str, overall: dict, out_dir: Path) -> str | None:
    fuels = [f for f in FUEL_ORDER if f in overall.get("fuels", {})]
    if not fuels:
        return None
    fig, ax = plt.subplots(figsize=(10.5, 5.8))
    for i, fuel in enumerate(fuels):
        data = overall["fuels"][fuel]
        lo, avg, hi = float(data["minimum"]), float(data["average"]), float(data["maximum"])
        ax.hlines(i, lo, hi, linewidth=7, alpha=0.55)
        ax.scatter([avg], [i], s=90, zorder=3)
        ax.text(lo, i + 0.18, fmt_eur(lo), ha="center", va="bottom", fontsize=8)
        ax.text(avg, i - 0.22, "ср. " + fmt_eur(avg), ha="center", va="top", fontsize=9, fontweight="bold")
        ax.text(hi, i + 0.18, fmt_eur(hi), ha="center", va="bottom", fontsize=8)
    ax.set_yticks(range(len(fuels)), [FUEL_LABELS[f] for f in fuels])
    ax.set_xlabel("Цена, €")
    ax.set_title("Ценови диапазон по вид гориво")
    ax.xaxis.set_major_formatter(FuncFormatter(euro_tick))
    ax.grid(axis="x", alpha=0.18)
    fig.tight_layout()
    path = out_dir / "price-spread.png"
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return f"/media/daily-news/{date_str}/price-spread.png"


def save_recent_trend(date_str: str, by_day: dict[str, list[dict]], out_dir: Path) -> str | None:
    days = [d for d in sorted(by_day) if d <= date_str][-7:]
    if len(days) < 2:
        return None
    series = {fuel: [] for fuel in ("Бензин A95", "Дизел", "LPG")}
    usable_days = []
    for day in days:
        summary = base.summarize_day(by_day[day])
        usable_days.append(day[5:])
        for fuel in series:
            item = summary.get("fuels", {}).get(fuel)
            series[fuel].append(float(item["average"]) if item else float("nan"))
    fig, ax = plt.subplots(figsize=(10.5, 5.8))
    for fuel, values in series.items():
        ax.plot(usable_days, values, marker="o", linewidth=2.2, label=FUEL_LABELS[fuel])
    ax.set_ylabel("Средна цена, €")
    ax.set_title("Движение през последните налични дни")
    ax.yaxis.set_major_formatter(FuncFormatter(euro_tick))
    ax.grid(alpha=0.18)
    ax.legend(frameon=False, ncol=3)
    fig.tight_layout()
    path = out_dir / "recent-trend.png"
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return f"/media/daily-news/{date_str}/recent-trend.png"


def figure(src: str, title: str, caption: str, kind: str) -> str:
    return f'<figure class="article-data-chart article-data-chart--matplotlib" data-chart-kind="{html.escape(kind)}"><img src="{html.escape(src, quote=True)}" alt="{html.escape(title)}" loading="lazy" decoding="async"><figcaption>{html.escape(caption)}</figcaption></figure>'


def remove_old_charts(body: str) -> str:
    return re.sub(r'<figure\b[^>]*class="[^"]*article-data-chart[^"]*"[^>]*>.*?</figure>', '', body, flags=re.I | re.S)


def insert_after_heading(body: str, heading_match: str, block: str) -> tuple[str, bool]:
    pattern = re.compile(r'(<h2\b[^>]*>(.*?)</h2>)', re.I | re.S)
    for match in pattern.finditer(body):
        label = re.sub(r'<[^>]+>', ' ', match.group(2)).lower()
        if heading_match.lower() in label:
            return body[:match.end()] + block + body[match.end():], True
    return body, False


def city_section(city: str, summary: dict, chart_src: str | None) -> str:
    if summary:
        items = []
        for fuel in FUEL_ORDER:
            item = summary.get(fuel)
            if not item:
                continue
            items.append(f'<li><strong>{html.escape(FUEL_LABELS[fuel])}</strong>: средно {fmt_eur(item["average"])}, минимум {fmt_eur(item["minimum"])}, максимум {fmt_eur(item["maximum"])}, {item["count"]} наблюдения.</li>')
        copy = '<p>Ето как изглеждат наличните цени по основни горива за града:</p><ul>' + ''.join(items) + '</ul>'
    else:
        copy = '<p>За тази дата няма достатъчно налични наблюдения за надеждно градско обобщение.</p>'
    chart = figure(chart_src, f"Цени на горивата в {city}", f"Средни цени по основни горива в {city}, закръглени до втория знак.", f"city-{city}") if chart_src else ''
    return f'<h2>Цени на горивата в {city}</h2>{chart}{copy}'


def ensure_city_sections(body: str, summaries: dict[str, dict], charts: dict[str, str | None]) -> str:
    marker = re.search(r'<h2[^>]*>\s*Пазарен контекст', body, re.I)
    insert_at = marker.start() if marker else len(body)
    additions = []
    for city in MAJOR_CITIES:
        pattern = rf'<h2[^>]*>\s*Цени на горивата (?:в|във) {re.escape(city)}\s*</h2>'
        if re.search(pattern, body, re.I):
            if charts.get(city):
                body, _ = insert_after_heading(body, city, figure(charts[city], f"Цени на горивата в {city}", f"Средни цени по основни горива в {city}, закръглени до втория знак.", f"city-{city}"))
            continue
        additions.append(city_section(city, summaries.get(city, {}), charts.get(city)))
    if additions:
        block = ''.join(additions)
        body = body[:insert_at] + block + body[insert_at:]
    return body


def generate_inline_ai_image(date_str: str, slug: str, heading: str, context: str, out_dir: Path) -> str | None:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or not context:
        return None
    prompt = f"Create a realistic editorial image for a Bulgarian fuel-market article section. Section: {heading}. Context: {context[:900]}. Use a credible Bulgarian/European setting. No text, prices, numbers, logos, station brands, watermarks or fake UI. Landscape, natural light, business-news quality."
    try:
        response = OpenAI(api_key=api_key).images.generate(model=IMAGE_MODEL, prompt=prompt, size="1536x1024", quality="medium", output_format="png")
        if not response.data or not getattr(response.data[0], "b64_json", None):
            return None
        path = out_dir / f"section-{slug}.png"
        path.write_bytes(base64.b64decode(response.data[0].b64_json))
        return f"/media/daily-news/{date_str}/section-{slug}.png"
    except Exception as exc:
        print(f"Inline image warning ({slug}): {exc}")
        return None


def enrich_article(date_str: str, by_day: dict[str, list[dict]]) -> None:
    article_path = ROOT / "pages" / "articles" / "daily" / date_str / "index.html"
    text = article_path.read_text(encoding="utf-8")
    day_rows = by_day[date_str]
    overall = base.summarize_day(day_rows)
    summaries = {city: city_summary(day_rows, city) for city in MAJOR_CITIES}
    out_dir = ROOT / "media" / "daily-news" / date_str
    out_dir.mkdir(parents=True, exist_ok=True)

    city_charts = {city: save_city_chart(date_str, city, summaries[city], out_dir) for city in MAJOR_CITIES}
    comparison = save_city_comparison(date_str, summaries, out_dir)
    spread = save_price_spread(date_str, overall, out_dir)
    trend = save_recent_trend(date_str, by_day, out_dir)

    match = re.search(r'(<div\b[^>]*class="[^"]*article-content-full[^"]*"[^>]*>)(.*?)(</div>\s*</article>)', text, re.I | re.S)
    if not match:
        raise RuntimeError("article-content-full not found")
    body = remove_old_charts(match.group(2))
    body = ensure_city_sections(body, summaries, city_charts)

    if spread:
        body, _ = insert_after_heading(body, "Цени на горивата днес", figure(spread, "Ценови диапазон по горива", "Минимум, средна цена и максимум по основни горива.", "spread"))
    if comparison:
        block = '<h2>Сравнение на цените в големите градове</h2>' + figure(comparison, "Сравнение на цените в големите градове", "София, Пловдив, Варна, Бургас, Русе и Стара Загора – бензин A95, дизел и LPG.", "major-cities")
        marker = re.search(r'<h2[^>]*>\s*Пазарен контекст', body, re.I)
        body = body[:marker.start()] + block + body[marker.start():] if marker else body + block
    if trend:
        body, ok = insert_after_heading(body, "Какво се промени", figure(trend, "Последни налични дни", "Движение на средните цени по A95, дизел и LPG.", "trend"))
        if not ok:
            body += '<h2>Движение на цените през последните дни</h2>' + figure(trend, "Последни налични дни", "Движение на средните цени по A95, дизел и LPG.", "trend")

    city_context = ' '.join(f"{city}: " + ', '.join(f"{FUEL_LABELS[f]} {fmt_eur(v['average'])}" for f, v in summaries[city].items() if f in FUEL_LABELS) for city in MAJOR_CITIES)
    city_img = generate_inline_ai_image(date_str, "cities", "Цени на горивата в големите градове", city_context, out_dir)
    if city_img:
        body = body.replace('<h2>Сравнение на цените в големите градове</h2>', '<h2>Сравнение на цените в големите градове</h2><figure class="editorial-inline-ai-image"><img src="' + city_img + '" alt="Големите градове и пазарът на горива" loading="lazy"><figcaption>Редакционна AI илюстрация към сравнението между големите градове.</figcaption></figure>', 1)

    text = text[:match.start(2)] + body + text[match.end(2):]
    article_path.write_text(text, encoding="utf-8")
    print(f"Mandatory city coverage added for {date_str}: {', '.join(MAJOR_CITIES)}")


def main() -> None:
    date_str = resolve_date()
    by_day = get_snapshots(date_str)
    enrich_article(date_str, by_day)


if __name__ == "__main__":
    main()
