from __future__ import annotations

import html
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROBOTS_VALUE = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_if_changed(path: Path, content: str) -> bool:
    old = read(path)
    if old == content:
        return False
    path.write_text(content, encoding="utf-8")
    print(f"updated: {path.relative_to(ROOT)}")
    return True


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Required SEO anchor not found: {label}")
    return text.replace(old, new, 1)


def ensure_robots(text: str) -> str:
    head = text.split("</head>", 1)[0]
    if re.search(r'<meta\s+name=["\']robots["\']', head, flags=re.I):
        return text
    pattern = re.compile(r'(<meta\s+name=["\']viewport["\'][^>]*>)', re.I)
    return pattern.sub(lambda m: m.group(1) + f'\n    <meta name="robots" content="{ROBOTS_VALUE}">', text, count=1)


def ensure_og_site_name(text: str) -> str:
    head = text.split("</head>", 1)[0]
    if re.search(r'<meta\s+property=["\']og:site_name["\']', head, flags=re.I):
        return text
    pattern = re.compile(r'(<meta\s+property=["\']og:title["\'][^>]*>)', re.I)
    return pattern.sub(lambda m: '    <meta property="og:site_name" content="goriva.online">\n' + m.group(1), text, count=1)


def ensure_preconnects(text: str, origins: tuple[str, ...]) -> str:
    missing = [origin for origin in origins if f'rel="preconnect" href="{origin}"' not in text]
    if not missing:
        return text
    lines = "\n".join(f'    <link rel="preconnect" href="{origin}" crossorigin>' for origin in missing)
    anchor = re.search(r'<link\s+rel=["\']icon["\'][^>]*>', text, flags=re.I)
    if not anchor:
        raise RuntimeError("favicon anchor missing while adding preconnect")
    pos = anchor.end()
    return text[:pos] + "\n" + lines + text[pos:]


def ensure_schema_script(text: str, schema: dict, script_id: str = "seo-structured-data") -> str:
    if f'id="{script_id}"' in text:
        return text
    payload = json.dumps(schema, ensure_ascii=False, separators=(",", ":"))
    snippet = f'    <script id="{script_id}" type="application/ld+json">{payload}</script>\n'
    return text.replace("</head>", snippet + "</head>", 1)


def page_schema(name: str, description: str, url: str, breadcrumb_name: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "@id": f"{url}#webpage",
                "url": url,
                "name": name,
                "description": description,
                "inLanguage": "bg-BG",
                "isPartOf": {"@type": "WebSite", "name": "goriva.online", "url": "https://goriva.online/"},
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Начало", "item": "https://goriva.online/"},
                    {"@type": "ListItem", "position": 2, "name": breadcrumb_name, "item": url},
                ],
            },
        ],
    }


def patch_index() -> None:
    path = ROOT / "index.html"
    text = read(path)
    text = ensure_robots(text)
    text = ensure_og_site_name(text)
    text = ensure_preconnects(text, ("https://eaqvhxfvozhzatrnbkvx.supabase.co", "https://unpkg.com"))
    text = text.replace("Разчитаме на коретно изпратена информация.", "Разчитаме на коректно изпратена информация.")
    text = text.replace(
        '<button id="menu-toggle" class="menu-toggle">☰</button>',
        '<button id="menu-toggle" class="menu-toggle" type="button" aria-label="Отвори менюто">☰</button>',
    )
    text = text.replace(
        '"@type": "WebSite",\n            "name": "goriva.online",',
        '"@type": "WebSite",\n            "@id": "https://goriva.online/#website",\n            "name": "goriva.online",',
        1,
    )
    text = text.replace(
        '"@type": "Organization",\n            "name": "goriva.online",',
        '"@type": "Organization",\n            "@id": "https://goriva.online/#organization",\n            "name": "goriva.online",',
        1,
    )
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "@id": "https://goriva.online/#webpage",
                "url": "https://goriva.online/",
                "name": "Цени на горивата днес в България | goriva.online",
                "description": "Актуални цени на бензин A95, дизел, LPG и метан по градове и бензиностанции в България.",
                "inLanguage": "bg-BG",
                "isPartOf": {"@id": "https://goriva.online/#website"},
                "about": {"@id": "https://goriva.online/#organization"},
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Начало", "item": "https://goriva.online/"}
                ],
            },
        ],
    }
    text = ensure_schema_script(text, schema, "homepage-seo-structured-data")
    write_if_changed(path, text)


def patch_trends() -> None:
    path = ROOT / "pages" / "trends.html"
    text = read(path)
    text = re.sub(r'\s*<script\s+src=["\'](?:https?:)?//fuelo\.net/js/widget-bg\.min\.js["\']></script>\s*', "\n", text, flags=re.I)
    text = text.replace(
        "<title>История на цените на горивата в България</title>",
        "<title>История на цените на горивата в България | goriva.online</title>",
    )
    text = ensure_robots(text)
    text = ensure_og_site_name(text)
    if '<meta property="og:locale"' not in text:
        text = text.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="website">\n    <meta property="og:locale" content="bg_BG">', 1)
    if '<meta name="twitter:card"' not in text:
        twitter = '''    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="История на цените на горивата в България | goriva.online">
    <meta name="twitter:description" content="Проследи исторически цени на бензин, дизел, LPG и метан по дни, градове и бензиностанции.">
    <meta name="twitter:image" content="https://goriva.online/media/og-3.png">
'''
        text = text.replace('    <link rel="canonical" href="https://goriva.online/pages/trends.html">', twitter + '    <link rel="canonical" href="https://goriva.online/pages/trends.html">', 1)
    text = text.replace('<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>', '<script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script>')
    text = ensure_preconnects(text, ("https://eaqvhxfvozhzatrnbkvx.supabase.co", "https://cdn.jsdelivr.net"))
    schema = page_schema(
        "История на цените на горивата в България | goriva.online",
        "Исторически и актуални цени на бензин, дизел, LPG и метан по дни, градове и бензиностанции.",
        "https://goriva.online/pages/trends.html",
        "История на цените",
    )
    text = ensure_schema_script(text, schema)
    write_if_changed(path, text)


def patch_useful() -> None:
    path = ROOT / "pages" / "useful.html"
    text = read(path)
    text = ensure_robots(text)
    text = ensure_og_site_name(text)
    text = ensure_preconnects(text, ("https://eaqvhxfvozhzatrnbkvx.supabase.co", "https://unpkg.com"))
    text = text.replace(
        '<button id="menu-toggle" class="menu-toggle">☰</button>',
        '<button id="menu-toggle" class="menu-toggle" type="button" aria-label="Отвори менюто">☰</button>',
    )
    schema = page_schema(
        "Полезни инструменти за шофьори | goriva.online",
        "Най-близки бензиностанции, калкулатор за разход на гориво и полезни проверки за шофьори в България.",
        "https://goriva.online/pages/useful.html",
        "Полезни инструменти",
    )
    text = ensure_schema_script(text, schema)
    write_if_changed(path, text)


def patch_business() -> None:
    path = ROOT / "pages" / "business-clients.html"
    text = read(path)
    text = re.sub(r'\s*<script\s+src=["\'](?:https?:)?//fuelo\.net/js/widget-bg\.min\.js["\']></script>\s*', "\n", text, flags=re.I)
    text = text.replace(
        "<title>Картови зареждания на горива за бизнес клиенти</title>",
        "<title>Карти за гориво за бизнес и автопаркове | goriva.online</title>",
    )
    text = ensure_robots(text)
    text = ensure_og_site_name(text)
    text = text.replace(
        '<button id="menu-toggle" class="menu-toggle">☰</button>',
        '<button id="menu-toggle" class="menu-toggle" type="button" aria-label="Отвори менюто">☰</button>',
    )
    schema = page_schema(
        "Карти за гориво за бизнес и автопаркове | goriva.online",
        "Картови зареждания на горива за фирми с преференциални цени, отчетност и контрол на разходите за автопарка.",
        "https://goriva.online/pages/business-clients.html",
        "Бизнес клиенти",
    )
    text = ensure_schema_script(text, schema)
    write_if_changed(path, text)


def patch_weather() -> None:
    path = ROOT / "pages" / "weather.html"
    text = read(path)
    text = ensure_robots(text)
    text = ensure_og_site_name(text)
    text = ensure_preconnects(text, ("https://eaqvhxfvozhzatrnbkvx.supabase.co", "https://unpkg.com", "https://openweathermap.org"))
    text = text.replace('<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>', '<script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script>')
    text = text.replace(
        '<button id="menu-toggle" class="menu-toggle">☰</button>',
        '<button id="menu-toggle" class="menu-toggle" type="button" aria-label="Отвори менюто">☰</button>',
    )
    schema = page_schema(
        "Прогноза за времето в България | goriva.online",
        "Актуално време, почасова и 5-дневна прогноза по градове в България за планиране на пътувания.",
        "https://goriva.online/pages/weather.html",
        "Прогноза за времето",
    )
    text = ensure_schema_script(text, schema)
    write_if_changed(path, text)


def patch_all_fuelo_widgets() -> None:
    pattern = re.compile(r'\s*<script\s+src=["\'](?:https?:)?//fuelo\.net/js/widget-bg\.min\.js["\']></script>\s*', re.I)
    for path in ROOT.rglob("*.html"):
        text = read(path)
        updated = pattern.sub("\n", text)
        if updated != text:
            write_if_changed(path, updated)


def get_meta(text: str, key: str, value: str) -> str:
    pattern = re.compile(
        rf'<meta\s+[^>]*{re.escape(key)}=["\']{re.escape(value)}["\'][^>]*content=["\']([^"\']*)["\'][^>]*>',
        re.I,
    )
    match = pattern.search(text)
    return html.unescape(match.group(1)).strip() if match else ""


def get_title(text: str) -> str:
    match = re.search(r"<title>(.*?)</title>", text, flags=re.I | re.S)
    if not match:
        return "goriva.online"
    value = re.sub(r"\s+", " ", html.unescape(match.group(1))).strip()
    return re.sub(r"\s*\|\s*goriva\.online\s*$", "", value, flags=re.I)


def absolute_image(value: str) -> str:
    if not value:
        return "https://goriva.online/media/og-3.png"
    if value.startswith("http://") or value.startswith("https://"):
        return value
    if value.startswith("/"):
        return "https://goriva.online" + value
    return "https://goriva.online/" + value


def enrich_newsarticle_schema(text: str, image_url: str) -> str:
    pattern = re.compile(r'(<script\s+type=["\']application/ld\+json["\'][^>]*>)(.*?)(</script>)', re.I | re.S)

    def repl(match: re.Match[str]) -> str:
        raw = match.group(2).strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return match.group(0)
        if not isinstance(data, dict) or data.get("@type") != "NewsArticle":
            return match.group(0)
        data.setdefault("image", [image_url])
        canonical = data.get("mainEntityOfPage")
        if isinstance(canonical, str):
            data["mainEntityOfPage"] = {"@type": "WebPage", "@id": canonical}
        author = data.get("author")
        if isinstance(author, dict) and author.get("@type") == "Organization":
            author.setdefault("url", "https://goriva.online/")
        publisher = data.setdefault("publisher", {"@type": "Organization", "name": "goriva.online"})
        if isinstance(publisher, dict):
            publisher.setdefault("url", "https://goriva.online/")
            publisher.setdefault("logo", {"@type": "ImageObject", "url": "https://goriva.online/media/2logo.png"})
        payload = json.dumps(data, ensure_ascii=False)
        return match.group(1) + payload + match.group(3)

    return pattern.sub(repl, text)


def patch_article(path: Path) -> None:
    text = read(path)
    original = text
    text = ensure_robots(text)
    text = ensure_og_site_name(text)

    title = get_meta(text, "property", "og:title") or get_title(text)
    description = get_meta(text, "property", "og:description") or get_meta(text, "name", "description")
    image_url = absolute_image(get_meta(text, "property", "og:image"))
    canonical = get_meta(text, "property", "og:url")
    if not canonical:
        canonical_match = re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']', text, flags=re.I)
        canonical = canonical_match.group(1) if canonical_match else ""

    missing_meta = []
    if '<meta name="twitter:card"' not in text:
        missing_meta.append('<meta name="twitter:card" content="summary_large_image">')
    if '<meta name="twitter:title"' not in text:
        missing_meta.append(f'<meta name="twitter:title" content="{html.escape(title, quote=True)}">')
    if '<meta name="twitter:description"' not in text and description:
        missing_meta.append(f'<meta name="twitter:description" content="{html.escape(description, quote=True)}">')
    if '<meta name="twitter:image"' not in text:
        missing_meta.append(f'<meta name="twitter:image" content="{html.escape(image_url, quote=True)}">')
    if '<meta property="og:image:alt"' not in text and title:
        missing_meta.append(f'<meta property="og:image:alt" content="{html.escape(title, quote=True)}">')
    if '<meta property="article:section"' not in text and 'content="article"' in text:
        missing_meta.append('<meta property="article:section" content="Цени на горивата">')

    published_match = re.search(r'"datePublished"\s*:\s*"([^"]+)"', text)
    modified_match = re.search(r'"dateModified"\s*:\s*"([^"]+)"', text)
    if published_match and '<meta property="article:published_time"' not in text:
        missing_meta.append(f'<meta property="article:published_time" content="{html.escape(published_match.group(1), quote=True)}">')
    if modified_match and '<meta property="article:modified_time"' not in text:
        missing_meta.append(f'<meta property="article:modified_time" content="{html.escape(modified_match.group(1), quote=True)}">')

    if missing_meta:
        anchor = re.search(r'<link\s+rel=["\']stylesheet["\'][^>]*>', text, flags=re.I)
        snippet = "  " + "\n  ".join(missing_meta) + "\n  "
        if anchor:
            text = text[:anchor.start()] + snippet + text[anchor.start():]
        else:
            text = text.replace("</head>", snippet + "</head>", 1)

    text = enrich_newsarticle_schema(text, image_url)

    if "BreadcrumbList" not in text and canonical:
        relative = path.relative_to(ROOT).as_posix()
        category = "София" if "/sofia/" in "/" + relative else "Дневен обзор" if "/daily/" in "/" + relative else "Статия"
        schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Начало", "item": "https://goriva.online/"},
                {"@type": "ListItem", "position": 2, "name": "Новини", "item": "https://goriva.online/pages/news.html"},
                {"@type": "ListItem", "position": 3, "name": category, "item": canonical},
            ],
        }
        payload = json.dumps(schema, ensure_ascii=False, separators=(",", ":"))
        text = text.replace("</head>", f'  <script type="application/ld+json">{payload}</script>\n</head>', 1)

    if text != original:
        write_if_changed(path, text)


def patch_existing_articles() -> None:
    root = ROOT / "pages" / "articles"
    for path in sorted(root.rglob("*.html")):
        patch_article(path)


def patch_daily_generator() -> None:
    path = ROOT / "automation" / "generate_daily_article_bg.py"
    text = read(path)
    old_schema = '''    schema = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": article["title"],
        "description": article["description"],
        "datePublished": published,
        "dateModified": published,
        "mainEntityOfPage": url,
        "inLanguage": "bg-BG",
        "author": {"@type": "Organization", "name": "goriva.online"},
        "publisher": {"@type": "Organization", "name": "goriva.online", "url": "https://goriva.online/"},
    }
'''
    new_schema = '''    image_url = f"https://goriva.online/media/daily-news/{date_str}.png"
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
'''
    text = replace_required(text, old_schema, new_schema, "daily NewsArticle schema")
    text = replace_required(
        text,
        '  <meta name="description" content="{description}">\n  <link rel="canonical" href="{url}">',
        f'  <meta name="description" content="{{description}}">\n  <meta name="robots" content="{ROBOTS_VALUE}">\n  <link rel="canonical" href="{{url}}">',
        "daily robots meta",
    )
    text = replace_required(
        text,
        '  <meta property="og:type" content="article">\n  <meta property="og:locale" content="bg_BG">',
        '  <meta property="og:type" content="article">\n  <meta property="og:site_name" content="goriva.online">\n  <meta property="og:locale" content="bg_BG">',
        "daily og site name",
    )
    text = replace_required(
        text,
        '  <meta property="og:url" content="{url}">\n  <meta property="og:image" content="https://goriva.online/media/og-3.png">',
        '  <meta property="og:url" content="{url}">\n  <meta property="og:image" content="{image_url}">\n  <meta property="article:published_time" content="{published}">\n  <meta property="article:modified_time" content="{published}">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:title" content="{title}">\n  <meta name="twitter:description" content="{description}">\n  <meta name="twitter:image" content="{image_url}">',
        "daily social metadata",
    )
    text = replace_required(
        text,
        '  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>',
        '  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>\n  <script type="application/ld+json">{json.dumps(breadcrumbs, ensure_ascii=False)}</script>',
        "daily breadcrumb schema",
    )
    text = re.sub(
        r'def update_sitemap\(url: str, date_str: str\) -> None:\n.*?\n\n\ndef main\(\) -> None:',
        'def update_sitemap(url: str, date_str: str) -> None:\n    from automation.rebuild_sitemap import rebuild_sitemap\n    rebuild_sitemap()\n\n\ndef main() -> None:',
        text,
        count=1,
        flags=re.S,
    )
    write_if_changed(path, text)


def patch_sofia_generator() -> None:
    path = ROOT / "automation" / "generate_sofia_article.py"
    text = read(path)
    old_schema = '''    schema = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": article["title"],
        "description": article["description"],
        "datePublished": published,
        "dateModified": published,
        "mainEntityOfPage": url,
        "inLanguage": "bg-BG",
        "about": ["Цени на горивата в София", "Цена на бензина в София", "Цена на дизела в София", "LPG София"],
        "author": {"@type": "Organization", "name": "goriva.online"},
        "publisher": {"@type": "Organization", "name": "goriva.online", "url": "https://goriva.online/"},
    }
'''
    new_schema = '''    image_url = f"https://goriva.online/media/sofia-news/{date_str}/hero.png"
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
'''
    text = replace_required(text, old_schema, new_schema, "Sofia NewsArticle schema")
    text = replace_required(
        text,
        '  <meta property="og:type" content="article">\n  <meta property="og:locale" content="bg_BG">',
        '  <meta property="og:type" content="article">\n  <meta property="og:site_name" content="goriva.online">\n  <meta property="og:locale" content="bg_BG">',
        "Sofia og site name",
    )
    text = replace_required(
        text,
        '  <meta property="og:url" content="{url}">\n  <meta name="twitter:card" content="summary_large_image">',
        '  <meta property="og:url" content="{url}">\n  <meta property="og:image" content="{image_url}">\n  <meta property="article:published_time" content="{published}">\n  <meta property="article:modified_time" content="{published}">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:title" content="{title}">\n  <meta name="twitter:description" content="{description}">\n  <meta name="twitter:image" content="{image_url}">',
        "Sofia social metadata",
    )
    text = replace_required(
        text,
        '  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>',
        '  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>\n  <script type="application/ld+json">{json.dumps(breadcrumbs, ensure_ascii=False)}</script>',
        "Sofia breadcrumb schema",
    )
    text = re.sub(
        r'def update_sitemap\(date_str: str\) -> None:\n.*?\n\n\ndef main\(\) -> None:',
        'def update_sitemap(date_str: str) -> None:\n    from automation.rebuild_sitemap import rebuild_sitemap\n    rebuild_sitemap()\n\n\ndef main() -> None:',
        text,
        count=1,
        flags=re.S,
    )
    write_if_changed(path, text)


def patch_news_generator() -> None:
    path = ROOT / "automation" / "rebuild_news_page.py"
    text = read(path)
    text = replace_required(
        text,
        '        "url": "https://goriva.online/pages/news.html",\n        "mainEntity": {',
        '        "url": "https://goriva.online/pages/news.html",\n        "description": "Последни новини, дневни обзори и анализи за цените на горивата в България.",\n        "inLanguage": "bg-BG",\n        "dateModified": latest.get("date"),\n        "isPartOf": {"@type": "WebSite", "name": "goriva.online", "url": "https://goriva.online/"},\n        "breadcrumb": {\n            "@type": "BreadcrumbList",\n            "itemListElement": [\n                {"@type": "ListItem", "position": 1, "name": "Начало", "item": "https://goriva.online/"},\n                {"@type": "ListItem", "position": 2, "name": "Новини", "item": "https://goriva.online/pages/news.html"},\n            ],\n        },\n        "mainEntity": {',
        "news CollectionPage schema",
    )
    text = replace_required(
        text,
        '<meta name="description" content="Последни новини, дневни обзори и анализи за цените на бензин, дизел и LPG в България. Търсене и филтриране на всички публикации на goriva.online.">',
        f'<meta name="description" content="Последни новини, дневни обзори и анализи за цените на бензин, дизел и LPG в България. Търсене и филтриране на всички публикации на goriva.online.">\n<meta name="robots" content="{ROBOTS_VALUE}">',
        "news robots meta",
    )
    text = replace_required(
        text,
        '<meta property="og:title" content="Новини и анализи за горивата | goriva.online"><meta property="og:description" content="Дневни обзори, анализи по градове и практически материали за горивата."><meta property="og:image" content="https://goriva.online/media/og-3.png"><meta property="og:url" content="https://goriva.online/pages/news.html"><meta property="og:type" content="website"><meta property="og:locale" content="bg_BG">',
        '<meta property="og:site_name" content="goriva.online"><meta property="og:title" content="Новини и анализи за горивата | goriva.online"><meta property="og:description" content="Дневни обзори, анализи по градове и практически материали за горивата."><meta property="og:image" content="https://goriva.online/media/og-3.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:url" content="https://goriva.online/pages/news.html"><meta property="og:type" content="website"><meta property="og:locale" content="bg_BG">\n<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Новини и анализи за горивата | goriva.online"><meta name="twitter:description" content="Дневни обзори, анализи по градове и практически материали за горивата."><meta name="twitter:image" content="https://goriva.online/media/og-3.png">',
        "news social metadata",
    )
    write_if_changed(path, text)


def rebuild_news() -> None:
    subprocess.run([sys.executable, str(ROOT / "automation" / "rebuild_news_page.py")], cwd=ROOT, check=True)


def validate() -> None:
    key_pages = [
        ROOT / "index.html",
        ROOT / "pages" / "trends.html",
        ROOT / "pages" / "useful.html",
        ROOT / "pages" / "weather.html",
        ROOT / "pages" / "news.html",
        ROOT / "pages" / "business-clients.html",
    ]
    errors: list[str] = []
    for path in key_pages:
        source = read(path)
        label = path.relative_to(ROOT).as_posix()
        for needle, name in (
            ("<title>", "title"),
            ('name="description"', "description"),
            ('rel="canonical"', "canonical"),
            ('name="robots"', "robots"),
        ):
            if needle not in source:
                errors.append(f"{label}: missing {name}")
        h1_count = len(re.findall(r"<h1\b", source, flags=re.I))
        if h1_count != 1:
            errors.append(f"{label}: expected one H1, found {h1_count}")

    for path in ROOT.rglob("*.html"):
        if "fuelo.net/js/widget-bg.min.js" in read(path):
            errors.append(f"{path.relative_to(ROOT)}: Fuelo widget reference remains")

    index = read(ROOT / "index.html")
    if "HOMEPAGE_SEO_SNAPSHOT" in index:
        errors.append("index.html: visual SEO snapshot marker must not return")

    if errors:
        raise RuntimeError("Technical SEO validation failed:\n- " + "\n- ".join(errors))
    print("Technical SEO validation passed")


def main() -> None:
    patch_index()
    patch_trends()
    patch_useful()
    patch_business()
    patch_weather()
    patch_all_fuelo_widgets()
    patch_daily_generator()
    patch_sofia_generator()
    patch_news_generator()
    rebuild_news()
    patch_existing_articles()

    from automation.rebuild_sitemap import rebuild_sitemap
    rebuild_sitemap()
    validate()


if __name__ == "__main__":
    main()
