from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAV_VERSION = "20260906-eko-fix3"


def normalize_html(path: Path) -> bool:
    source = path.read_text(encoding="utf-8")
    updated = source

    # One authoritative bootstrap for regular pages.
    updated = re.sub(
        r'(<script\b[^>]*\bsrc=["\'])(?:\.\./|/)?scripts/script\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
        rf'\1/scripts/script.js?v={NAV_VERSION}\2',
        updated,
        flags=re.I,
    )

    # Homepage only: install the bounded/cached EKO fallback before script.js.
    if path == ROOT / "index.html" and "/scripts/eko-fallback-efficient.js" not in updated:
        marker = f'<script src="/scripts/script.js?v={NAV_VERSION}"></script>'
        replacement = (
            f'<script src="/scripts/eko-fallback-efficient.js?v={NAV_VERSION}"></script>\n'
            f'{marker}'
        )
        updated = updated.replace(marker, replacement, 1)

    updated = re.sub(
        r'(<script\b[^>]*\bsrc=["\'])(?:\.\./|/)?scripts/site-shell\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
        rf'\1/scripts/site-shell.js?v={NAV_VERSION}\2',
        updated,
        flags=re.I,
    )

    updated = re.sub(
        r'(<script\b[^>]*\bsrc=["\'])(?:\.\./|/)?scripts/article-engagement\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
        rf'\1/scripts/article-engagement.js?v={NAV_VERSION}\2',
        updated,
        flags=re.I,
    )

    updated = re.sub(
        r'(<script\b[^>]*\bsrc=["\'])(?:\.\./|/)?scripts/global-nav\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
        rf'\1/scripts/global-nav.js?v={NAV_VERSION}\2',
        updated,
        flags=re.I,
    )

    updated = re.sub(
        r'(<script\b[^>]*\bsrc=["\'])/scripts/eko-fallback-efficient\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
        rf'\1/scripts/eko-fallback-efficient.js?v={NAV_VERSION}\2',
        updated,
        flags=re.I,
    )

    # Global navigation owns the stations dropdown. Never load the legacy
    # stations-nav bootstrap directly from HTML.
    updated = re.sub(
        r'\s*<script\b[^>]*\bsrc=["\'](?:\.\./|/)?scripts/stations-nav\.js(?:\?[^"\']*)?["\'][^>]*></script>',
        '',
        updated,
        flags=re.I,
    )

    if updated == source:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def normalize_text_file(path: Path) -> bool:
    if not path.exists():
        return False
    source = path.read_text(encoding="utf-8")
    updated = source
    updated = re.sub(
        r'/scripts/global-nav\.js\?v=[A-Za-z0-9._-]+',
        f'/scripts/global-nav.js?v={NAV_VERSION}',
        updated,
    )
    updated = re.sub(
        r'/scripts/stations-nav\.js\?v=[A-Za-z0-9._-]+',
        f'/scripts/stations-nav.js?v={NAV_VERSION}',
        updated,
    )
    updated = re.sub(
        r'/scripts/article-engagement\.js\?v=[A-Za-z0-9._-]+',
        f'/scripts/article-engagement.js?v={NAV_VERSION}',
        updated,
    )
    updated = re.sub(
        r'/pages/styles/global-progress\.css\?v=[A-Za-z0-9._-]+',
        f'/pages/styles/global-progress.css?v={NAV_VERSION}',
        updated,
    )
    if updated == source:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> None:
    changed: list[str] = []

    html_files = [ROOT / "index.html"]
    for html_root in (ROOT / "pages", ROOT / "stations"):
        if html_root.exists():
            html_files.extend(sorted(html_root.rglob("*.html")))
    for path in html_files:
        if path.exists() and normalize_html(path):
            changed.append(path.relative_to(ROOT).as_posix())

    text_files = [
        ROOT / "scripts" / "article-engagement.js",
        ROOT / "scripts" / "script.js",
        ROOT / "scripts" / "site-shell.js",
        ROOT / "scripts" / "global-nav.js",
    ]
    text_files.extend(sorted((ROOT / "automation").glob("*.py")))
    for path in text_files:
        if normalize_text_file(path):
            changed.append(path.relative_to(ROOT).as_posix())

    print(f"Unified navigation references in {len(changed)} files")
    for item in changed:
        print(f" - {item}")


if __name__ == "__main__":
    main()
