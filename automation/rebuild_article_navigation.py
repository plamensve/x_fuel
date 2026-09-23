from __future__ import annotations

import html
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://goriva.online"
SERIES = {
    "daily": "Дневни обзори за България",
    "sofia": "Дневни обзори за София",
}

CANONICAL_RE = re.compile(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']', re.I)
TITLE_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.I | re.S)
TAG_RE = re.compile(r"<[^>]+>")
MANAGED_HEAD_RE = re.compile(r"\n?\s*<!-- ARTICLE_SERIES_HEAD_START -->.*?<!-- ARTICLE_SERIES_HEAD_END -->", re.S)
MANAGED_NAV_RE = re.compile(r"\n?\s*<!-- ARTICLE_SERIES_NAV_START -->.*?<!-- ARTICLE_SERIES_NAV_END -->", re.S)


def article_title(source: str, fallback: str) -> str:
    match = TITLE_RE.search(source)
    if not match:
        return fallback
    return html.unescape(TAG_RE.sub("", match.group(1))).strip()


def canonical(source: str, path: Path) -> str:
    match = CANONICAL_RE.search(source)
    if match:
        return match.group(1).strip()
    return f"{BASE_URL}/{path.relative_to(ROOT).parent.as_posix()}/"


def rebuild_series(series: str, label: str) -> int:
    root = ROOT / "pages" / "articles" / series
    items: list[dict[str, object]] = []
    for path in sorted(root.glob("????-??-??/index.html")):
        source = path.read_text(encoding="utf-8")
        items.append({
            "path": path,
            "source": source,
            "date": path.parent.name,
            "url": canonical(source, path),
            "title": article_title(source, path.parent.name),
        })

    changed = 0
    for index, item in enumerate(items):
        source = MANAGED_HEAD_RE.sub("", str(item["source"]))
        source = MANAGED_NAV_RE.sub("", source)
        older = items[index - 1] if index > 0 else None
        newer = items[index + 1] if index + 1 < len(items) else None

        head_links = []
        if older:
            head_links.append(f'  <link rel="prev" href="{older["url"]}">')
        if newer:
            head_links.append(f'  <link rel="next" href="{newer["url"]}">')
        head_block = (
            "\n  <!-- ARTICLE_SERIES_HEAD_START -->\n"
            + "\n".join(head_links)
            + "\n  <link rel=\"stylesheet\" href=\"/pages/styles/article-archive-nav.css?v=20260923-3\">\n"
            + "  <!-- ARTICLE_SERIES_HEAD_END -->"
        )
        source = source.replace("</head>", head_block + "\n</head>", 1)

        links = []
        if older:
            links.append(
                f'<a class="article-archive-nav__item" href="{older["url"]}" rel="prev">'
                f'<span>← Предишна публикация</span><strong>{html.escape(str(older["title"]))}</strong></a>'
            )
        if newer:
            links.append(
                f'<a class="article-archive-nav__item article-archive-nav__item--next" href="{newer["url"]}" rel="next">'
                f'<span>Следваща публикация →</span><strong>{html.escape(str(newer["title"]))}</strong></a>'
            )
        nav_block = (
            '\n      <!-- ARTICLE_SERIES_NAV_START -->\n'
            '<nav class="article-archive-nav" aria-label="Хронологична навигация между публикациите">'
            f'<div class="article-archive-nav__heading"><span>Архив</span><h2>{html.escape(label)}</h2>'
            '<a href="/pages/news.html#archive">Всички публикации</a></div>'
            f'<div class="article-archive-nav__links">{"".join(links)}</div>'
            '</nav>\n'
            '      <!-- ARTICLE_SERIES_NAV_END -->\n'
        )
        source = re.sub(r"[ \t]*</article>", nav_block + "    </article>", source, count=1)

        path = item["path"]
        assert isinstance(path, Path)
        old_source = str(item["source"])
        if source != old_source:
            path.write_text(source, encoding="utf-8")
            changed += 1
    return changed


def rebuild_article_navigation() -> int:
    changed = sum(rebuild_series(series, label) for series, label in SERIES.items())
    print(f"Updated article navigation: {changed} pages")
    return changed


if __name__ == "__main__":
    rebuild_article_navigation()
