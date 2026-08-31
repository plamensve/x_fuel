from __future__ import annotations

import html
import json
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


def bg_date(value: str) -> str:
    months = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"]
    dt = datetime.fromisoformat(value[:10])
    return f"{dt.day} {months[dt.month - 1]} {dt.year}"


def load_items() -> list[dict]:
    generated = []
    if MANIFEST.exists():
        value = json.loads(MANIFEST.read_text(encoding="utf-8"))
        if isinstance(value, list):
            generated = value
    normalized = []
    for item in generated:
        row = dict(item)
        url = row.get("url", "")
        if not row.get("type"):
            row["type"] = "sofia" if "/sofia/" in url else "daily"
        if not row.get("label"):
            row["label"] = "София" if row["type"] == "sofia" else "Дневен обзор"
        if not row.get("image") and row["type"] == "daily":
            row["image"] = f"/media/daily-news/{row.get('date')}.png"
        normalized.append(row)
    items = normalized + STATIC_ARTICLES
    seen = set()
    unique = []
    for item in sorted(items, key=lambda x: (x.get("date", ""), x.get("url", "")), reverse=True):
        url = item.get("url")
        if not url or url in seen:
            continue
        seen.add(url)
        unique.append(item)
    return unique


def media(item: dict, featured: bool = False) -> str:
    image = item.get("image")
    cls = "featured-story-media" if featured else "article-card-media"
    style = f" style=\"background-image:url('{html.escape(image, quote=True)}')\"" if image else ""
    extra = " news-card-media--sofia" if item.get("type") == "sofia" and not image else ""
    return f'<div class="{cls}{extra}"{style}><span class="story-category">{html.escape(item.get("label", "Статия"))}</span></div>'


def card(item: dict) -> str:
    category = "business" if item.get("type") == "business" else ("sofia" if item.get("type") == "sofia" else "analysis")
    return f'''<article class="article-card" data-category="{category}" data-published="{html.escape(item.get('date',''))}">
<a href="{html.escape(item['url'], quote=True)}" class="article-card-link" aria-label="{html.escape(item['title'], quote=True)}">{media(item)}</a>
<div class="article-content">
<div class="article-date">{bg_date(item['date'])} · {html.escape(item.get('label','Статия'))}</div>
<h3><a href="{html.escape(item['url'], quote=True)}">{html.escape(item['title'])}</a></h3>
<p>{html.escape(item.get('description',''))}</p>
<a class="article-link" href="{html.escape(item['url'], quote=True)}">Прочети повече →</a>
</div></article>'''


def render(items: list[dict]) -> str:
    latest = items[0]
    rest = items[1:]
    cards = "\n".join(card(item) for item in rest)
    return f'''<!doctype html>
<html lang="bg">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Новини и актуални цени на горивата | goriva.online</title>
<meta name="description" content="Последни статии, дневни обзори и анализи за цените на горивата в София и България от goriva.online.">
<link rel="canonical" href="https://goriva.online/pages/news.html"><link rel="icon" type="image/svg+xml" href="/media/fav.svg">
<meta property="og:title" content="Новини и анализи за горивата | goriva.online"><meta property="og:description" content="Най-новите анализи и актуални данни за цените на горивата."><meta property="og:image" content="https://goriva.online/media/og-3.png"><meta property="og:url" content="https://goriva.online/pages/news.html"><meta property="og:type" content="website"><meta property="og:locale" content="bg_BG">
<link rel="stylesheet" href="../styles.css?v=20260831-news4"><link rel="stylesheet" href="styles/news.css?v=20260831-news4">
</head>
<body id="top" class="news-page"><div class="background"></div>
<header class="header-bar"><div class="header-container"><img src="../media/2logo.png" alt="goriva.online logo" class="header-logo"><div class="header-text"><strong>Новини и анализи</strong><span>Актуални цени, пазарни тенденции и практични анализи.</span></div><a class="facebook-button" href="https://www.facebook.com/groups/960591129738525" target="_blank" rel="noopener noreferrer">Facebook група</a></div></header>
<nav class="main-nav"><button id="menu-toggle" class="menu-toggle">☰</button><div id="nav-menu" class="nav-container"><a href="../index.html">Начало</a><a href="useful.html">Полезно</a><a href="trends.html">История на цените</a><a href="weather.html">Прогноза за времето</a><a href="business-clients.html">Бизнес клиенти</a><a href="news.html">Новини</a><a href="rules.html">Общи условия</a></div></nav>
<main class="news-shell">
<section class="news-topline"><div><span class="news-kicker"><i></i> Последни публикации</span><h1>Новини и анализи за <span>цените на горивата</span></h1><p>Най-новите публикации са винаги най-отгоре — дневни обзори, анализи за София и практически материали.</p></div><div class="news-topline-actions"><a href="../index.html#home-top10-prices" class="news-primary-btn">Цени днес</a><a href="trends.html" class="news-secondary-btn">История на цените</a></div></section>
<section class="news-featured news-featured--latest" aria-labelledby="latest-title"><div class="section-heading-row"><div><span class="section-eyebrow">Най-нова статия</span><h2 id="latest-title">Последно публикувано</h2></div><a href="{html.escape(latest['url'], quote=True)}" class="section-text-link">Отвори статията →</a></div><a href="{html.escape(latest['url'], quote=True)}" class="featured-story">{media(latest, True)}<div class="featured-story-copy"><div class="story-meta"><span>{bg_date(latest['date'])}</span><span>•</span><span>{html.escape(latest.get('label','Статия'))}</span></div><h3>{html.escape(latest['title'])}</h3><p>{html.escape(latest.get('description',''))}</p><span class="story-read-more">Прочети статията <b>→</b></span></div></a></section>
<section id="latest" class="news-library"><div class="section-heading-row news-library-head"><div><span class="section-eyebrow">Всички публикации</span><h2>От най-новите към по-старите</h2><p>Архивът се подрежда автоматично по дата на публикуване.</p></div><div class="news-filters" aria-label="Филтрирай статиите"><button class="is-active" data-news-filter="all">Всички</button><button data-news-filter="sofia">София</button><button data-news-filter="analysis">Анализи</button><button data-news-filter="business">За бизнеса</button></div></div><div class="articles-grid" id="news-grid">{cards}</div></section>
<section class="news-cta"><div><span class="section-eyebrow">Данните зад статиите</span><h2>Провери цените директно</h2><p>Виж актуалните стойности и историческата динамика в платформата.</p></div><div class="news-cta-actions"><a href="../index.html#home-top10-prices" class="news-primary-btn">Текущи цени</a><a href="trends.html" class="news-secondary-btn">Исторически данни</a></div></section>
</main><footer class="site-footer"></footer><script src="../scripts/script.js" defer></script><script>document.addEventListener('DOMContentLoaded',()=>{{const buttons=document.querySelectorAll('[data-news-filter]');const cards=document.querySelectorAll('#news-grid .article-card');buttons.forEach(button=>button.addEventListener('click',()=>{{buttons.forEach(item=>item.classList.remove('is-active'));button.classList.add('is-active');const filter=button.dataset.newsFilter;cards.forEach(card=>card.hidden=filter!=='all'&&card.dataset.category!==filter);}}));}});</script></body></html>'''


def main() -> None:
    items = load_items()
    if not items:
        raise RuntimeError("No news items available")
    NEWS.write_text(render(items), encoding="utf-8")
    print(f"Rebuilt news page with {len(items)} articles; latest={items[0].get('url')}")


if __name__ == "__main__":
    main()
