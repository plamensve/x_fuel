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
FUEL_ORDER = ("Бензин A95", "Дизел", "LPG", "Метан")
FUEL_LABELS = {"Бензин A95": "A95", "Дизел": "Дизел", "LPG": "LPG", "Метан": "Метан"}


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
    return rows, by_day


def city_summary(day_rows: list[dict], city_name: str) -> dict[str, dict]:
    buckets: dict[str, list[float]] = defaultdict(list)
    wanted = city_name.strip().lower()
    for row in day_rows:
        if (row.get("city") or "").strip().lower() != wanted:
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


def save_sofia_comparison(date_str: str, overall: dict, sofia: dict, out_dir: Path) -> str | None:
    fuels = [f for f in FUEL_ORDER if f in overall.get("fuels", {}) and f in sofia]
    if not fuels:
        return None
    labels = [FUEL_LABELS[f] for f in fuels]
    sample_values = [float(overall["fuels"][f]["average"]) for f in fuels]
    sofia_values = [float(sofia[f]["average"]) for f in fuels]

    fig, ax = plt.subplots(figsize=(10.5, 5.8))
    y = list(range(len(labels)))
    height = 0.34
    ax.barh([i + height / 2 for i in y], sample_values, height=height, label="Извадка goriva.online")
    ax.barh([i - height / 2 for i in y], sofia_values, height=height, label="София")
    ax.set_yticks(y, labels)
    ax.set_xlabel("Цена, €")
    ax.set_title("София спрямо наблюдаваната извадка")
    ax.xaxis.set_major_formatter(FuncFormatter(euro_tick))
    ax.grid(axis="x", alpha=0.18)
    ax.legend(frameon=False)
    for i, value in enumerate(sample_values):
        ax.text(value, i + height / 2, "  " + fmt_eur(value), va="center", fontsize=9)
    for i, value in enumerate(sofia_values):
        ax.text(value, i - height / 2, "  " + fmt_eur(value), va="center", fontsize=9)
    fig.tight_layout()
    path = out_dir / "sofia-vs-sample.png"
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return f"/media/daily-news/{date_str}/sofia-vs-sample.png"


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
    ax.set_title("Ценови диапазон: минимум, средна и максимум")
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
        if not summary.get("fuels"):
            continue
        usable_days.append(day[5:])
        for fuel in series:
            item = summary["fuels"].get(fuel)
            series[fuel].append(float(item["average"]) if item else float("nan"))
    if len(usable_days) < 2:
        return None

    fig, ax = plt.subplots(figsize=(10.5, 5.8))
    for fuel, values in series.items():
        if any(v == v for v in values):
            ax.plot(usable_days, values, marker="o", linewidth=2.2, label=FUEL_LABELS[fuel])
            for x, value in zip(usable_days, values):
                if value == value:
                    ax.annotate(fmt_eur(value), (x, value), textcoords="offset points", xytext=(0, 7), ha="center", fontsize=8)
    ax.set_ylabel("Средна цена, €")
    ax.set_title("Движение на средните цени през последните налични дни")
    ax.yaxis.set_major_formatter(FuncFormatter(euro_tick))
    ax.grid(alpha=0.18)
    ax.legend(frameon=False, ncol=3)
    fig.tight_layout()
    path = out_dir / "recent-trend.png"
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return f"/media/daily-news/{date_str}/recent-trend.png"


def figure(src: str, title: str, caption: str, kind: str) -> str:
    return (
        f'<figure class="article-data-chart article-data-chart--matplotlib" data-chart-kind="{html.escape(kind)}">'
        f'<img src="{html.escape(src, quote=True)}" alt="{html.escape(title)}" loading="lazy" decoding="async">'
        f'<figcaption>{html.escape(caption)}</figcaption></figure>'
    )


def remove_old_charts(body: str) -> str:
    return re.sub(r'<figure\b[^>]*class="[^"]*article-data-chart[^"]*"[^>]*>.*?</figure>', '', body, flags=re.I | re.S)


def insert_after_heading(body: str, heading_match: str, block: str) -> tuple[str, bool]:
    pattern = re.compile(r'(<h2\b[^>]*>(.*?)</h2>)', re.I | re.S)
    for match in pattern.finditer(body):
        label = re.sub(r'<[^>]+>', ' ', match.group(2)).lower()
        if heading_match.lower() in label:
            return body[:match.end()] + block + body[match.end():], True
    return body, False


def ensure_sofia_section(body: str, sofia: dict) -> str:
    if re.search(r'<h2[^>]*>\s*Цени на горивата в София\s*</h2>', body, re.I):
        return body
    if not sofia:
        section = '<h2>Цени на горивата в София</h2><p>За тази дата няма достатъчно наблюдения от София за надеждно ценово обобщение.</p>'
    else:
        parts = []
        for fuel in FUEL_ORDER:
            item = sofia.get(fuel)
            if not item:
                continue
            parts.append(f'<li><strong>{html.escape(FUEL_LABELS[fuel])}</strong>: средно {fmt_eur(item["average"])}, диапазон {fmt_eur(item["minimum"])} – {fmt_eur(item["maximum"])}, {item["count"]} наблюдения.</li>')
        section = '<h2>Цени на горивата в София</h2><p>Отделяме София като самостоятелна секция, защото столицата е сред най-търсените локални пазари в сайта.</p><ul>' + ''.join(parts) + '</ul>'
    marker = re.search(r'<h2[^>]*>\s*Пазарен контекст', body, re.I)
    return body[:marker.start()] + section + body[marker.start():] if marker else body + section


def section_text(body: str, keyword: str) -> str:
    pattern = re.compile(r'<h2\b[^>]*>(.*?)</h2>(.*?)(?=<h2\b|$)', re.I | re.S)
    for match in pattern.finditer(body):
        heading = re.sub(r'<[^>]+>', ' ', match.group(1)).lower()
        if keyword.lower() in heading:
            text = re.sub(r'<[^>]+>', ' ', match.group(2))
            return re.sub(r'\s+', ' ', text).strip()[:900]
    return ''


def generate_inline_ai_image(date_str: str, slug: str, heading: str, context: str, out_dir: Path) -> str | None:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or not context:
        return None
    prompt = f"""Create a realistic editorial image for a Bulgarian fuel-market article section.
Section: {heading}
Context: {context}
Use a credible modern Bulgarian/European setting appropriate to the paragraph. No text, no prices, no numbers, no logos, no station brands, no watermarks, no fake UI. Landscape editorial composition, natural light, business-news quality."""
    try:
        client = OpenAI(api_key=api_key)
        response = client.images.generate(model=IMAGE_MODEL, prompt=prompt, size="1536x1024", quality="medium", output_format="png")
        if not response.data or not getattr(response.data[0], "b64_json", None):
            return None
        path = out_dir / f"section-{slug}.png"
        path.write_bytes(base64.b64decode(response.data[0].b64_json))
        return f"/media/daily-news/{date_str}/section-{slug}.png"
    except Exception as exc:
        print(f"Inline image warning ({slug}): {exc}")
        return None


def inline_image(src: str, caption: str) -> str:
    return f'<figure class="editorial-inline-ai-image"><img src="{html.escape(src, quote=True)}" alt="{html.escape(caption)}" loading="lazy" decoding="async"><figcaption>{html.escape(caption)}</figcaption></figure>'


def enrich_article(date_str: str, by_day: dict[str, list[dict]]) -> None:
    article_path = ROOT / "pages" / "articles" / "daily" / date_str / "index.html"
    if not article_path.exists():
        raise RuntimeError(f"Article not found: {article_path}")
    text = article_path.read_text(encoding="utf-8")
    day_rows = by_day[date_str]
    overall = base.summarize_day(day_rows)
    sofia = city_summary(day_rows, "София")
    out_dir = ROOT / "media" / "daily-news" / date_str
    out_dir.mkdir(parents=True, exist_ok=True)

    sofia_chart = save_sofia_comparison(date_str, overall, sofia, out_dir)
    spread_chart = save_price_spread(date_str, overall, out_dir)
    trend_chart = save_recent_trend(date_str, by_day, out_dir)

    content_match = re.search(r'(<div\b[^>]*class="[^"]*article-content-full[^"]*"[^>]*>)(.*?)(</div>\s*</article>)', text, re.I | re.S)
    if not content_match:
        raise RuntimeError("article-content-full not found")
    body = remove_old_charts(content_match.group(2))
    body = ensure_sofia_section(body, sofia)

    if spread_chart:
        body, _ = insert_after_heading(body, "Какви са цените днес", figure(spread_chart, "Ценови диапазон по горива", "Минимум, средна стойност и максимум в наблюдаваната извадка. Всички стойности са визуализирани до втория знак.", "spread"))
    if sofia_chart:
        body, _ = insert_after_heading(body, "Цени на горивата в София", figure(sofia_chart, "Цени в София спрямо извадката", "Сравнение между средните цени в София и общата наблюдавана извадка на goriva.online.", "sofia"))
    if trend_chart:
        body, ok = insert_after_heading(body, "Какво се промени", figure(trend_chart, "Последни налични дни", "Движение на средните цени по основни горива за последните налични дни.", "trend"))
        if not ok:
            body = figure(trend_chart, "Последни налични дни", "Движение на средните цени по основни горива за последните налични дни.", "trend") + body

    sofia_context = section_text(body, "Цени на горивата в София")
    market_context = section_text(body, "Пазарен контекст")
    sofia_img = generate_inline_ai_image(date_str, "sofia", "Цени на горивата в София", sofia_context, out_dir)
    market_img = generate_inline_ai_image(date_str, "market", "Пазарен контекст", market_context, out_dir)
    if sofia_img:
        body, _ = insert_after_heading(body, "Цени на горивата в София", inline_image(sofia_img, "Редакционна илюстрация към секцията за цените на горивата в София."))
    if market_img:
        body, _ = insert_after_heading(body, "Пазарен контекст", inline_image(market_img, "Редакционна илюстрация към пазарния контекст."))

    text = text[:content_match.start(2)] + body + text[content_match.end(2):]
    article_path.write_text(text, encoding="utf-8")
    print(f"Editorial visuals added for {date_str}: Sofia={bool(sofia_chart)}, spread={bool(spread_chart)}, trend={bool(trend_chart)}, inline_images={sum(bool(x) for x in (sofia_img, market_img))}")


def main() -> None:
    date_str = resolve_date()
    _, by_day = get_snapshots(date_str)
    enrich_article(date_str, by_day)


if __name__ == "__main__":
    main()
