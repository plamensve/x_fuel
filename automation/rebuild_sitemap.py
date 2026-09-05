from __future__ import annotations

import html
import re
import subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOFIA = ZoneInfo("Europe/Sofia")
BASE_URL = "https://goriva.online"
SITEMAP = ROOT / "sitemap.xml"

STATIC_FILES = (
    ROOT / "index.html",
    ROOT / "pages" / "trends.html",
    ROOT / "pages" / "useful.html",
    ROOT / "pages" / "top-fuel-prices.html",
    ROOT / "pages" / "weather.html",
    ROOT / "pages" / "news.html",
    ROOT / "pages" / "business-clients.html",
    ROOT / "pages" / "rules.html",
    ROOT / "pages" / "privacy.html",
)

CANONICAL_RE = re.compile(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']', re.I)
ROBOTS_RE = re.compile(r'<meta\s+name=["\']robots["\']\s+content=["\']([^"\']+)["\']', re.I)
SCHEMA_DATE_RE = re.compile(r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})', re.I)
PUBLISHED_DATE_RE = re.compile(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})', re.I)
PATH_DATE_RE = re.compile(r'/(\d{4}-\d{2}-\d{2})/(?:index\.html)?$')


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def canonical_for(path: Path, source: str) -> str:
    match = CANONICAL_RE.search(source)
    if match:
        return match.group(1).strip()
    relative = path.relative_to(ROOT).as_posix()
    if relative == "index.html":
        return f"{BASE_URL}/"
    return f"{BASE_URL}/{relative}"


def is_indexable(source: str) -> bool:
    match = ROBOTS_RE.search(source)
    return not match or "noindex" not in match.group(1).lower()


def changed_in_worktree(path: Path) -> bool:
    relative = path.relative_to(ROOT).as_posix()
    result = subprocess.run(
        ["git", "status", "--porcelain", "--", relative],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    return bool(result.stdout.strip())


def git_lastmod(path: Path) -> str | None:
    relative = path.relative_to(ROOT).as_posix()
    result = subprocess.run(
        ["git", "log", "-1", "--format=%cs", "--", relative],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    value = result.stdout.strip()
    return value if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) else None


def lastmod_for(path: Path, source: str) -> str:
    today = datetime.now(SOFIA).date().isoformat()
    if changed_in_worktree(path):
        return today

    for regex in (SCHEMA_DATE_RE, PUBLISHED_DATE_RE):
        match = regex.search(source)
        if match:
            return match.group(1)

    normalized = "/" + path.relative_to(ROOT).as_posix()
    match = PATH_DATE_RE.search(normalized)
    if match:
        return match.group(1)

    return git_lastmod(path) or today


def public_html_files() -> list[Path]:
    files = [path for path in STATIC_FILES if path.exists()]
    articles_root = ROOT / "pages" / "articles"
    if articles_root.exists():
        files.extend(sorted(articles_root.rglob("*.html")))
    return files


def build_entries() -> list[tuple[str, str]]:
    by_url: dict[str, str] = {}
    for path in public_html_files():
        source = read_text(path)
        if not is_indexable(source):
            continue
        url = canonical_for(path, source)
        if not url.startswith(BASE_URL):
            continue
        by_url[url] = lastmod_for(path, source)

    home = f"{BASE_URL}/"
    entries = sorted(by_url.items(), key=lambda item: (item[0] != home, item[0]))
    return entries


def render(entries: list[tuple[str, str]]) -> str:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, lastmod in entries:
        lines.extend([
            "  <url>",
            f"    <loc>{html.escape(url)}</loc>",
            f"    <lastmod>{lastmod}</lastmod>",
            "  </url>",
        ])
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def rebuild_sitemap() -> int:
    entries = build_entries()
    content = render(entries)
    previous = SITEMAP.read_text(encoding="utf-8") if SITEMAP.exists() else ""
    if previous == content:
        print(f"Sitemap already current: {len(entries)} URLs")
        return 0
    SITEMAP.write_text(content, encoding="utf-8")
    print(f"Rebuilt sitemap: {len(entries)} URLs")
    return len(entries)


def main() -> None:
    rebuild_sitemap()


if __name__ == "__main__":
    main()
