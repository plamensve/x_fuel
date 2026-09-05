from __future__ import annotations

import html
import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "generated-news.json"
NEWS = ROOT / "pages" / "news.html"

STATIC_ARTICLES = [
    {
        "date": "2026-04-11",
        "title": "Как бизнесът може да оптимизира разходите за гориво",
        "description": "Как картовите решения, централизираните плащания и контролът на зарежданията помагат за по-добро управление на автопарк.",
        "url": "/pages/articles/fuel-cards/art-fuel-cards.html",
        "image": "/pages/articles/fuel-cards/art-fuel-card-main-photo.png",
        "type": "business",
        "label": "За бизнеса",
    },
    {
        "date": "2026-03-30",
        "title": "Промените в цените на горивата в България (23–29 март 2026)",
        "description": "Поскъпването при основните горива продължава. Анализ на динамиката при бензин, дизел и пропан-бутан.",
        "url": "/pages/articles/article-2/article-2.html",
        "image": "/pages/articles/article-2/img.png",
        "type": "analysis",
        "label": "Пазарен анализ",
    },
    {
        "date": "2026-03-22",
        "title": "Как се промениха цените на горивата в България (16–22 март 2026)",
        "description": "Първи ясни сигнали за възходящ тренд при бензин A95 и дизел, при по-стабилна цена на газта.",
        "url": "/pages/articles/article-1/article-1.html",
        "image": "/pages/articles/article-1/img.png",
        "type": "analysis",
        "label": "Седмичен обзор",
    },
]

TYPE_META = {
    "daily": ("Дневен обзор", "daily"),
    "sofia": ("София", "sofia"),
    "analysis": ("Анализ", "analysis"),
    "business": ("За бизнеса", "business"),
}


def bg_date(value: str) -> str:
    months = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"]
    dt = datetime.fromisoformat(value[:10])
    return f"{dt.day} {months[dt.month - 1]} {dt.year}"


def text_from_html(raw: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", raw)).strip()


def extract(pattern: str, source: str, fallback: str = "") -> str:
    match = re.search(pattern, source, flags=re.I | re.S)
    return text_from_html(match.group(1)) if match else fallback


def discover_generated_articles() -> list[dict]:
    rows: list[dict] = []
    for article_type in ("daily", "sofia"):
        root = ROOT / "pages" / "articles" / article_type
        if not root.exists():
            continue
        for index in sorted(root.glob("*/index.html")):
            date = index.parent.name
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
                continue
            source = index.read_text(encoding="utf-8")
            title = extract(r"<h1\b[^>]*>(.*?)</h1>", source)
            description = extract(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', source)
            image = extract(r'<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']', source)
            if image.startswith("https://goriva.online"):
                image = image.removeprefix("https://goriva.online")
            label = "София" if article_type == "sofia" else "Дневен обзор"
            rows.append({
                "date": date,
                "title": title or f"Статия за {date}",
                "description": description,
                "url": f"/pages/articles/{article_type}/{date}/",
                "image": image,
                "type": article_type,
                "label": label,
            })
    return rows


def load_items() -> list[dict]:
    generated: list[dict] = []
    if MANIFEST.exists():
        value = json.loads(MANIFEST.read_text(encoding="utf-8"))
        if isinstance(value, list):
            generated = value

    normalized = []
    for item in generated + discover_generated_articles():
        row = dict(item)
        url = str(row.get("url", ""))
        if not row.get("type"):
            row["type"] = "sofia" if "/sofia/" in url else "daily"
        label, _ = TYPE_META.get(row["type"], ("Статия", row["type"]))
        row["label"] = row.get("label") or label
        if not row.get("image") and row["type"] == "daily":
            row["image"] = f"/media/daily-news/{row.get('date')}.png"
        if not row.get("image") and row["type"] == "sofia":
            row["image"] = f"/media/sofia-news/{row.get('date')}/hero.png"
        normalized.append(row)

    # Prefer discovered/on-disk metadata over stale manifest rows for the same URL.
    by_url: dict[str, dict] = {}
    for item in normalized + STATIC_ARTICLES:
        url = str(item.get("url", ""))
        if not url:
            continue
        current = by_url.get(url, {})
        by_url[url] = {**current, **{k: v for k, v in item.items() if v not in (None, "")}}

    return sorted(by_url.values(), key=lambda x: (x.get("date", ""), x.get("url", "")), reverse=True)


def category(item: dict) -> str:
    kind = item.get("type", "analysis")
    return kind if kind in {"daily", "sofia", "analysis", "business"} else "analysis"


def media(item: dict, cls: str = "news-card-media") -> str:
    image = str(item.get("image") or "")
    style = f" style=\"background-image:url('{html.escape(image, quote=True)}')\"" if image else ""
    fallback = " news-card-media--fallback" if not image else ""
    return f'<div class="{cls}{fallback}"{style}><span class="story-category story-category--{category(item)}">{html.escape(item.get("label", "Статия"))}</span></div>'


def card(item: dict) -> str:
    search = " ".join((item.get("title", ""), item.get("description", ""), item.get("label", ""))).lower()
    return f'''<article class="news-archive-card" data-news-card data-category="{category(item)}" data-published="{html.escape(item.get('date',''))}" data-search="{html.escape(search, quote=True)}">
<a href="{html.escape(item['url'], quote=True)}" class="news-card-image-link" aria-label="{html.escape(item['title'], quote=True)}">{media(item)}</a>
<div class="news-card-body">
<div class="news-card-meta"><span>{html.escape(item.get('label','Статия'))}</span><time datetime="{html.escape(item.get('date',''))}">{bg_date(item['date'])}</time></div>
<h3><a href="{html.escape(item['url'], quote=True)}">{html.escape(item['title'])}</a></h3>
<p>{html.escape(item.get('description',''))}</p>
<a class="news-card-read" href="{html.escape(item['url'], quote=True)}">Прочети статията <span aria-hidden="true">→</span></a>
</div></article>'''


def compact_story(item: dict) -> str:
    return f'''<a class="news-secondary-story" href="{html.escape(item['url'], quote=True)}">
{media(item, "news-secondary-media")}
<div><div class="news-secondary-meta">{html.escape(item.get('label','Статия'))} · {bg_date(item['date'])}</div><h3>{html.escape(item['title'])}</h3><p>{html.escape(item.get('description',''))}</p></div>
</a>'''


def render(items: list[dict]) -> str:
    latest = items[0]
    secondary = items[1:3]
    archive_cards = "\n".join(card(item) for item in items)
    secondary_html = "\n".join(compact_story(item) for item in secondary)
    counts = {key: sum(1 for item in items if category(item) == key) for key in ("daily", "sofia", "analysis", "business")}
    years = sorted({str(item.get("date", ""))[:4] for item in items if item.get("date")}, reverse=True)
    year_options = "".join(f'<option value="{year}">{year}</option>' for year in years)

    item_list = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Новини и анализи за горивата | goriva.online",
        "url": "https://goriva.online/pages/news.html",
        "description": "Последни новини, дневни обзори и анализи за цените на горивата в България.",
        "inLanguage": "bg-BG",
        "dateModified": latest.get("date"),
        "isPartOf": {"@type": "WebSite", "name": "goriva.online", "url": "https://goriva.online/"},
        "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Начало", "item": "https://goriva.online/"},
                {"@type": "ListItem", "position": 2, "name": "Новини", "item": "https://goriva.online/pages/news.html"},
            ],
        },
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "url": f"https://goriva.online{item['url']}", "name": item["title"]}
                for i, item in enumerate(items[:30])
            ],
        },
    }

    return f'''<!doctype html>
<html lang="bg">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Новини, анализи и цени на горивата | goriva.online</title>
<meta name="description" content="Последни новини, дневни обзори и анализи за цените на бензин, дизел и LPG в България. Търсене и филтриране на всички публикации на goriva.online.">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="https://goriva.online/pages/news.html"><link rel="icon" type="image/svg+xml" href="/media/fav.svg">
<meta property="og:site_name" content="goriva.online"><meta property="og:title" content="Новини и анализи за горивата | goriva.online"><meta property="og:description" content="Дневни обзори, анализи по градове и практически материали за горивата."><meta property="og:image" content="https://goriva.online/media/og-3.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:url" content="https://goriva.online/pages/news.html"><meta property="og:type" content="website"><meta property="og:locale" content="bg_BG">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Новини и анализи за горивата | goriva.online"><meta name="twitter:description" content="Дневни обзори, анализи по градове и практически материали за горивата."><meta name="twitter:image" content="https://goriva.online/media/og-3.png">
<link rel="stylesheet" href="../styles.css?v=20260831-newsroom1"><link rel="stylesheet" href="styles/news.css?v=20260831-newsroom1">
<script type="application/ld+json">{json.dumps(item_list, ensure_ascii=False)}</script>
</head>
<body id="top" class="news-page"><div class="background"></div>
<header class="header-bar"><div class="header-container"><a href="../index.html" class="news-brand-link"><img src="../media/2logo.png" alt="goriva.online logo" class="header-logo"></a><div class="header-text"><strong>Новини и анализи</strong><span>Актуални цени, пазарни тенденции и практични анализи.</span></div><a class="facebook-button" href="https://www.facebook.com/groups/960591129738525" target="_blank" rel="noopener noreferrer">Facebook група</a></div></header>
<nav class="main-nav"><button id="menu-toggle" class="menu-toggle" aria-label="Отвори менюто">☰</button><div id="nav-menu" class="nav-container"><a href="../index.html">Начало</a><a href="useful.html">Полезно</a><a href="trends.html">История на цените</a><a href="weather.html">Прогноза за времето</a><a href="business-clients.html">Бизнес клиенти</a><a href="news.html" aria-current="page">Новини</a><a href="rules.html">Общи условия</a></div></nav>

<main class="news-shell">
<section class="news-masthead">
<div class="news-masthead-copy"><span class="news-kicker"><i></i> goriva.online newsroom</span><h1>Новини и анализи за <span>горивата</span></h1><p>Дневни ценови обзори, анализи за София и големите градове, пазарен контекст и практически материали — подредени така, че бързо да намериш важната за теб информация.</p></div>
<div class="news-masthead-actions"><a href="../index.html#home-top10-prices" class="news-primary-btn">Виж цените днес</a><a href="trends.html" class="news-secondary-btn">История на цените</a></div>
</section>

<section class="news-lead-grid" aria-labelledby="news-latest-title">
<a class="news-lead-story" href="{html.escape(latest['url'], quote=True)}">{media(latest, "news-lead-media")}<div class="news-lead-copy"><div class="news-lead-meta"><span>Последно публикувано</span><time datetime="{latest['date']}">{bg_date(latest['date'])}</time></div><h2 id="news-latest-title">{html.escape(latest['title'])}</h2><p>{html.escape(latest.get('description',''))}</p><strong>Прочети анализа <span aria-hidden="true">→</span></strong></div></a>
<div class="news-secondary-stack">{secondary_html}</div>
</section>

<section class="news-discovery" id="archive" aria-labelledby="archive-title">
<div class="news-discovery-heading"><div><span class="section-eyebrow">Архив</span><h2 id="archive-title">Всички публикации</h2><p>Търси по тема или филтрирай по тип публикация и година.</p></div><div class="news-total"><strong>{len(items)}</strong><span>публикации</span></div></div>

<div class="news-toolbar" role="search">
<label class="news-search"><span class="sr-only">Търси статии</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg><input id="news-search" type="search" placeholder="Търси: дизел, София, LPG..." autocomplete="off"></label>
<div class="news-select-wrap"><label for="news-year">Година</label><select id="news-year"><option value="all">Всички</option>{year_options}</select></div>
<div class="news-select-wrap"><label for="news-sort">Подреждане</label><select id="news-sort"><option value="newest">Най-новите</option><option value="oldest">Най-старите</option></select></div>
</div>

<div class="news-filter-row" aria-label="Категории">
<button class="news-filter is-active" type="button" data-news-filter="all">Всички <span>{len(items)}</span></button>
<button class="news-filter" type="button" data-news-filter="daily">Дневни обзори <span>{counts['daily']}</span></button>
<button class="news-filter" type="button" data-news-filter="sofia">София <span>{counts['sofia']}</span></button>
<button class="news-filter" type="button" data-news-filter="analysis">Анализи <span>{counts['analysis']}</span></button>
<button class="news-filter" type="button" data-news-filter="business">За бизнеса <span>{counts['business']}</span></button>
</div>

<div class="news-results-bar"><p id="news-results" aria-live="polite"></p><button id="news-clear" type="button" hidden>Изчисти филтрите</button></div>
<div class="news-archive-grid" id="news-grid">{archive_cards}</div>
<div class="news-empty" id="news-empty" hidden><strong>Няма намерени публикации</strong><p>Промени търсенето или избери друга категория.</p><button type="button" data-clear-news>Покажи всички статии</button></div>
<div class="news-load-more-wrap"><button class="news-load-more" id="news-load-more" type="button">Покажи още публикации</button></div>
</section>

<section class="news-footer-cta"><div><span class="section-eyebrow">Данните зад историите</span><h2>Провери цените директно в платформата</h2><p>Сравни текущи стойности или проследи как са се променяли във времето.</p></div><div><a href="../index.html#home-top10-prices" class="news-primary-btn">Текущи цени</a><a href="trends.html" class="news-secondary-btn">Исторически данни</a></div></section>
</main>
<footer class="site-footer"></footer>
<script src="../scripts/script.js" defer></script>
<script>
(() => {{
  const grid = document.getElementById('news-grid');
  const cards = [...grid.querySelectorAll('[data-news-card]')];
  const filters = [...document.querySelectorAll('[data-news-filter]')];
  const search = document.getElementById('news-search');
  const year = document.getElementById('news-year');
  const sort = document.getElementById('news-sort');
  const results = document.getElementById('news-results');
  const empty = document.getElementById('news-empty');
  const clear = document.getElementById('news-clear');
  const loadMore = document.getElementById('news-load-more');
  let active = 'all';
  let visibleLimit = 9;

  const normalize = value => (value || '').toLocaleLowerCase('bg-BG').trim();
  const stateFromUrl = () => {{
    const params = new URLSearchParams(location.search);
    const c = params.get('category');
    if (c && filters.some(button => button.dataset.newsFilter === c)) active = c;
    search.value = params.get('q') || '';
    if ([...year.options].some(option => option.value === params.get('year'))) year.value = params.get('year');
    if (params.get('sort') === 'oldest') sort.value = 'oldest';
  }};
  const updateUrl = () => {{
    const params = new URLSearchParams();
    if (active !== 'all') params.set('category', active);
    if (search.value.trim()) params.set('q', search.value.trim());
    if (year.value !== 'all') params.set('year', year.value);
    if (sort.value !== 'newest') params.set('sort', sort.value);
    const query = params.toString();
    history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + '#archive');
  }};
  const apply = () => {{
    const query = normalize(search.value);
    const selectedYear = year.value;
    const ordered = [...cards].sort((a, b) => sort.value === 'oldest' ? a.dataset.published.localeCompare(b.dataset.published) : b.dataset.published.localeCompare(a.dataset.published));
    ordered.forEach(card => grid.appendChild(card));
    const matches = ordered.filter(card => (active === 'all' || card.dataset.category === active) && (selectedYear === 'all' || card.dataset.published.startsWith(selectedYear)) && (!query || normalize(card.dataset.search).includes(query)));
    ordered.forEach(card => card.hidden = true);
    matches.slice(0, visibleLimit).forEach(card => card.hidden = false);
    filters.forEach(button => button.classList.toggle('is-active', button.dataset.newsFilter === active));
    results.textContent = matches.length === 1 ? '1 намерена публикация' : `${{matches.length}} намерени публикации`;
    empty.hidden = matches.length !== 0;
    loadMore.hidden = matches.length <= visibleLimit;
    clear.hidden = active === 'all' && !query && selectedYear === 'all' && sort.value === 'newest';
    updateUrl();
  }};
  const reset = () => {{ active = 'all'; search.value = ''; year.value = 'all'; sort.value = 'newest'; visibleLimit = 9; apply(); }};

  filters.forEach(button => button.addEventListener('click', () => {{ active = button.dataset.newsFilter; visibleLimit = 9; apply(); }}));
  search.addEventListener('input', () => {{ visibleLimit = 9; apply(); }});
  year.addEventListener('change', () => {{ visibleLimit = 9; apply(); }});
  sort.addEventListener('change', apply);
  clear.addEventListener('click', reset);
  document.querySelectorAll('[data-clear-news]').forEach(button => button.addEventListener('click', reset));
  loadMore.addEventListener('click', () => {{ visibleLimit += 9; apply(); }});
  stateFromUrl();
  apply();
}})();
</script>
</body></html>'''


def main() -> None:
    items = load_items()
    if not items:
        raise RuntimeError("No news items available")
    NEWS.write_text(render(items), encoding="utf-8")
    print(f"Rebuilt professional news hub with {len(items)} articles; latest={items[0].get('url')}")


if __name__ == "__main__":
    main()
