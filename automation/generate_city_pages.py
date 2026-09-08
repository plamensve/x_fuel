from __future__ import annotations

import html
import json
import os
import statistics
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "https://eaqvhxfvozhzatrnbkvx.supabase.co").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY") or "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH"
SOFIA_TZ = ZoneInfo("Europe/Sofia")

CITIES = {
    "sofia": {"name": "София", "region": "София"},
    "plovdiv": {"name": "Пловдив", "region": "Пловдив"},
    "varna": {"name": "Варна", "region": "Варна"},
}

# These names correspond to price feeds maintained as chain-published imports.
OFFICIAL_STATIONS = {"ЕКО", "PETROL"}
FUEL_ORDER = ("Бензин A95", "Дизел", "Пропан Бутан", "Бензин A100", "Дизел премиум", "Метан")
FUEL_LABELS = {
    "Бензин A95": "A95",
    "Дизел": "Дизел",
    "Пропан Бутан": "LPG",
    "Бензин A100": "A100",
    "Дизел премиум": "Дизел +",
    "Метан": "Метан",
}


def normalize(value: object) -> str:
    return str(value or "").strip().upper()


def local_date(value: str) -> str:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.astimezone(SOFIA_TZ).date().isoformat()


def bg_date(value: str) -> str:
    months = ("", "януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември")
    parsed = datetime.fromisoformat(value)
    return f"{parsed.day} {months[parsed.month]} {parsed.year} г."


def fetch_city_rows(city: str) -> list[dict]:
    params = urllib.parse.urlencode({
        "select": "station,city,region,location,fuel,price,created_at",
        "city": f"eq.{city}",
        "order": "created_at.desc",
        "limit": "1000",
    })
    request = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/fuel_prices?{params}",
        headers={"apikey": SUPABASE_KEY, "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        rows = json.load(response)

    official = [row for row in rows if normalize(row.get("station")) in OFFICIAL_STATIONS]
    if not official:
        return []
    newest = max(local_date(str(row["created_at"])) for row in official)
    return [row for row in official if local_date(str(row["created_at"])) == newest]


def summarize(rows: list[dict]) -> dict:
    by_fuel: dict[str, list[dict]] = defaultdict(list)
    stations: dict[str, dict] = {}
    for row in rows:
        fuel = str(row.get("fuel") or "")
        if fuel not in FUEL_ORDER:
            continue
        price = float(row["price"])
        row = {**row, "price": price}
        by_fuel[fuel].append(row)
        location = str(row.get("location") or row.get("station") or "Бензиностанция").strip()
        station = stations.setdefault(location, {"location": location, "brand": str(row.get("station") or ""), "prices": {}})
        current = station["prices"].get(fuel)
        if current is None or price < current:
            station["prices"][fuel] = price

    fuels = {}
    for fuel in FUEL_ORDER:
        items = by_fuel.get(fuel, [])
        if not items:
            continue
        values = [item["price"] for item in items]
        fuels[fuel] = {
            "average": round(statistics.fmean(values), 3),
            "minimum": min(values),
            "maximum": max(values),
            "count": len({str(item.get("location") or item.get("station")) for item in items}),
        }

    ordered_stations = sorted(
        stations.values(),
        key=lambda item: (normalize(item["brand"]), normalize(item["location"])),
    )
    date_value = max(local_date(str(row["created_at"])) for row in rows) if rows else ""
    return {
        "date": date_value,
        "records": len(rows),
        "station_count": len(ordered_stations),
        "brands": sorted({str(row.get("station") or "") for row in rows}, key=normalize),
        "fuels": fuels,
        "stations": ordered_stations,
    }


def money(value: float, fuel: str) -> str:
    unit = "€/кг" if fuel == "Метан" else "€/л"
    return f"{value:.2f}".replace(".", ",") + f" {unit}"


def render_summary_cards(summary: dict) -> str:
    cards = []
    for fuel in FUEL_ORDER:
        data = summary["fuels"].get(fuel)
        if not data:
            continue
        cards.append(f'''<article class="city-price-card" data-fuel="{html.escape(fuel)}">
          <span class="city-price-label">{html.escape(FUEL_LABELS[fuel])}</span>
          <strong>{money(data["average"], fuel)}</strong>
          <span>средна цена</span>
          <small>от {money(data["minimum"], fuel)} до {money(data["maximum"], fuel)} · {data["count"]} обекта</small>
        </article>''')
    return "\n".join(cards)


def render_station_rows(summary: dict) -> str:
    rows = []
    for station in summary["stations"]:
        cells = []
        for fuel in FUEL_ORDER:
            value = station["prices"].get(fuel)
            cells.append(f'<td data-label="{html.escape(FUEL_LABELS[fuel])}">{money(value, fuel) if value is not None else "—"}</td>')
        rows.append(
            '<tr>'
            f'<th scope="row"><strong>{html.escape(station["brand"])}</strong><span>{html.escape(station["location"])}</span></th>'
            + "".join(cells)
            + "</tr>"
        )
    return "\n".join(rows)


def render_page(slug: str, city: str, summary: dict) -> str:
    url = f"https://goriva.online/cities/{slug}/"
    where = f"във {city}" if city == "Варна" else f"в {city}"
    description = f"Актуални цени на бензин A95, дизел и LPG {where} по бензиностанции. Виж средни, най-ниски цени, адреси и дата на публикуване."
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{url}#webpage",
                "url": url,
                "name": f"Цени на горивата {where}",
                "description": description,
                "dateModified": summary["date"],
                "inLanguage": "bg-BG",
                "isPartOf": {"@type": "WebSite", "name": "goriva.online", "url": "https://goriva.online/"},
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Начало", "item": "https://goriva.online/"},
                    {"@type": "ListItem", "position": 2, "name": f"Цени на горивата {where}", "item": url},
                ],
            },
        ],
    }
    city_links = "".join(
        f'<a href="/cities/{key}/" class="city-switch-link{" is-current" if key == slug else ""}"{(" aria-current=\"page\"" if key == slug else "")}>{html.escape(item["name"])}</a>'
        for key, item in CITIES.items()
    )
    headers = "".join(f"<th scope=\"col\">{html.escape(FUEL_LABELS[fuel])}</th>" for fuel in FUEL_ORDER)
    brands = ", ".join(summary["brands"])
    return f'''<!doctype html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
  <title>Цени на горивата {html.escape(where)} днес | goriva.online</title>
  <meta name="description" content="{html.escape(description, quote=True)}">
  <link rel="canonical" href="{url}">
  <link rel="icon" type="image/svg+xml" href="/media/fav.svg">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="goriva.online">
  <meta property="og:locale" content="bg_BG">
  <meta property="og:title" content="Цени на горивата {html.escape(where)} днес">
  <meta property="og:description" content="{html.escape(description, quote=True)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="https://goriva.online/media/2logo.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" href="/styles-legacy.css" as="style" data-goriva-css-preload>
  <link rel="preload" href="/pages/styles/site-shell.css" as="style" data-goriva-css-preload>
  <link rel="stylesheet" href="/styles.css?v=20260908-city1">
  <link rel="stylesheet" href="/pages/styles/city-prices.css?v=20260908-city1">
  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
</head>
<body class="city-prices-page" data-city="{html.escape(city)}" data-city-slug="{slug}">
  <header class="header-bar" hidden></header>
  <main class="city-page-shell">
    <nav class="city-breadcrumbs" aria-label="Навигационна пътека"><a href="/">Начало</a><span>›</span><strong>{html.escape(city)}</strong></nav>
    <section class="city-hero">
      <div class="city-hero-copy">
        <span class="city-eyebrow"><i></i> Публикувани цени по бензиностанции</span>
        <h1>Цени на горивата <span>{html.escape(where)}</span></h1>
        <p>Сравни последните публикувани цени на бензин A95, дизел, LPG и други горива в наблюдаваните обекти {html.escape(where)}.</p>
        <div class="city-coverage">
          <span><b id="city-station-count">{summary["station_count"]}</b> наблюдавани обекта</span>
          <span><b id="city-record-count">{summary["records"]}</b> ценови записа</span>
          <span id="city-source-summary">Импорти: {html.escape(brands)}</span>
        </div>
      </div>
      <aside class="city-update-card">
        <span>Последна публикувана дата</span>
        <strong id="city-price-date">{html.escape(bg_date(summary["date"]))}</strong>
        <small id="city-freshness">Цените са информационни и могат да се променят на място.</small>
      </aside>
    </section>
    <nav class="city-switcher" aria-label="Цени по градове">{city_links}</nav>

    <section class="city-price-overview" aria-labelledby="city-overview-title">
      <div class="city-section-heading"><span>Обобщение</span><h2 id="city-overview-title">Средни и най-ниски цени {html.escape(where)}</h2><p id="city-loading-status" role="status" aria-live="polite">Показани са данните към {html.escape(bg_date(summary["date"]))}</p></div>
      <div id="city-price-cards" class="city-price-grid">{render_summary_cards(summary)}</div>
    </section>

    <section class="city-stations" aria-labelledby="city-stations-title">
      <div class="city-section-heading"><span>По обекти</span><h2 id="city-stations-title">Цени по бензиностанции {html.escape(where)}</h2><p>Подреди таблицата по гориво и провери конкретния обект преди зареждане.</p></div>
      <div class="city-filter-row"><label for="city-fuel-filter">Покажи обекти с</label><select id="city-fuel-filter"><option value="all">Всички горива</option>{''.join(f'<option value="{html.escape(fuel)}">{html.escape(FUEL_LABELS[fuel])}</option>' for fuel in FUEL_ORDER)}</select></div>
      <div class="city-table-wrap">
        <table class="city-price-table"><thead><tr><th scope="col">Бензиностанция и обект</th>{headers}</tr></thead><tbody id="city-prices-body">{render_station_rows(summary)}</tbody></table>
      </div>
    </section>

    <section class="city-methodology" aria-labelledby="city-method-title">
      <div><span>За данните</span><h2 id="city-method-title">Как се изчисляват цените</h2></div>
      <div class="city-method-grid">
        <p><strong>Източници.</strong> Страницата използва последните налични записи от поддържаните ценови импорти за EKO и Petrol. Изписаната дата е датата на самите ценови записи.</p>
        <p><strong>Средна цена.</strong> Средната стойност се изчислява само върху показаните обекти за съответното гориво. Тя не е официална национална или градска статистика.</p>
        <p><strong>Проверка на място.</strong> Цените могат да се променят след публикуването и да не включват отстъпки, карти за лоялност или промоционални условия.</p>
      </div>
      <div class="city-source-links"><a href="https://www.eko.bg/self-service-terminal-instructions/karta-na-obektite/" target="_blank" rel="noopener noreferrer">Официална карта на EKO</a><a href="https://www.petrol.bg/%D1%86%D0%B5%D0%BD%D0%B8-%D0%BD%D0%B0-%D0%B3%D0%BE%D1%80%D0%B8%D0%B2%D0%B0%D1%82%D0%B0/" target="_blank" rel="noopener noreferrer">Официални цени на Petrol</a><a href="/pages/methodology.html">Методология на goriva.online</a></div>
    </section>
  </main>
  <script defer src="/scripts/city-prices.js?v=20260908-city1"></script>
  <script defer src="/scripts/global-nav.js?v=20260908-city1"></script>
</body>
</html>
'''


def main() -> None:
    failures = []
    for slug, config in CITIES.items():
        try:
            rows = fetch_city_rows(config["name"])
            if not rows:
                raise RuntimeError("no supported price rows")
            summary = summarize(rows)
            output = ROOT / "cities" / slug / "index.html"
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(render_page(slug, config["name"], summary), encoding="utf-8")
            print(f"Generated {output.relative_to(ROOT)}: {summary['station_count']} stations, {summary['records']} records, {summary['date']}")
        except Exception as exc:
            failures.append(f"{config['name']}: {exc}")
    if failures:
        raise RuntimeError("; ".join(failures))


if __name__ == "__main__":
    main()
