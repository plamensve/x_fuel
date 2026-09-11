from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAV_VERSION = "20260911-privacy-banner1"


def write_if_changed(path: Path, updated: str, changed: list[str]) -> None:
    source = path.read_text(encoding="utf-8")
    if updated == source:
        return
    path.write_text(updated, encoding="utf-8")
    changed.append(path.relative_to(ROOT).as_posix())


def normalize_html(path: Path, changed: list[str]) -> None:
    source = path.read_text(encoding="utf-8")
    updated = source

    replacements = [
        (
            r'(<script\b[^>]*\bsrc=["\'])(?:\.\./|/)?scripts/script\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
            rf'\1/scripts/script.js?v={NAV_VERSION}\2',
        ),
        (
            r'(<script\b[^>]*\bsrc=["\'])(?:\.\./|/)?scripts/site-shell\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
            rf'\1/scripts/site-shell.js?v={NAV_VERSION}\2',
        ),
        (
            r'(<script\b[^>]*\bsrc=["\'])(?:\.\./|/)?scripts/article-engagement\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
            rf'\1/scripts/article-engagement.js?v={NAV_VERSION}\2',
        ),
        (
            r'(<script\b[^>]*\bsrc=["\'])(?:\.\./|/)?scripts/global-nav\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
            rf'\1/scripts/global-nav.js?v={NAV_VERSION}\2',
        ),
        (
            r'(<script\b[^>]*\bsrc=["\'])/scripts/eko-fallback-efficient\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
            rf'\1/scripts/eko-fallback-efficient.js?v={NAV_VERSION}\2',
        ),
    ]
    for pattern, replacement in replacements:
        updated = re.sub(pattern, replacement, updated, flags=re.I)

    updated = re.sub(
        r'\s*<script\b[^>]*\bsrc=["\'](?:\.\./|/)?scripts/stations-nav\.js(?:\?[^"\']*)?["\'][^>]*></script>',
        '',
        updated,
        flags=re.I,
    )

    # Car pages also cache their dedicated CSS/JS assets.
    if "/cars/" in path.as_posix() or path.as_posix().startswith(str(ROOT / "cars")):
        updated = re.sub(r"20260907-cars\d+", NAV_VERSION, updated)

    write_if_changed(path, updated, changed)


def normalize_text_file(path: Path, changed: list[str]) -> None:
    if not path.exists():
        return
    source = path.read_text(encoding="utf-8")
    updated = source
    replacements = [
        (r'/scripts/global-nav\.js\?v=[A-Za-z0-9._-]+', f'/scripts/global-nav.js?v={NAV_VERSION}'),
        (r'/scripts/stations-nav\.js\?v=[A-Za-z0-9._-]+', f'/scripts/stations-nav.js?v={NAV_VERSION}'),
        (r'/scripts/article-engagement\.js\?v=[A-Za-z0-9._-]+', f'/scripts/article-engagement.js?v={NAV_VERSION}'),
        (r'/pages/styles/global-progress\.css\?v=[A-Za-z0-9._-]+', f'/pages/styles/global-progress.css?v={NAV_VERSION}'),
        (r'canonical-nav\.css\?v=[A-Za-z0-9._-]+', f'canonical-nav.css?v={NAV_VERSION}'),
    ]
    for pattern, replacement in replacements:
        updated = re.sub(pattern, replacement, updated)
    write_if_changed(path, updated, changed)


def polish_global_nav(changed: list[str]) -> None:
    path = ROOT / "scripts" / "global-nav.js"
    source = path.read_text(encoding="utf-8")
    updated = source

    # Terms remain available in the footer, but are no longer a primary nav item.
    updated = re.sub(
        r'\n\s*\{ href: "/pages/rules\.html", label: "Условия", symbol: "✓", match: \["/pages/rules\.html"\] \}',
        '',
        updated,
        count=1,
    )

    # Keep the footer as the single place for site rules/privacy links.
    if '<a href="/pages/rules.html">Общи условия</a>' not in updated:
        updated = updated.replace(
            '<li><a href="/pages/business-clients.html">Бизнес клиенти</a></li>',
            '<li><a href="/pages/business-clients.html">Бизнес клиенти</a></li><li><a href="/pages/rules.html">Общи условия</a></li>',
            1,
        )

    updated = re.sub(
        r'/pages/styles/global-progress\.css\?v=[A-Za-z0-9._-]+',
        f'/pages/styles/global-progress.css?v={NAV_VERSION}',
        updated,
    )
    write_if_changed(path, updated, changed)


def polish_car_search(changed: list[str]) -> None:
    index_path = ROOT / "cars" / "index.html"
    source = index_path.read_text(encoding="utf-8")
    updated = re.sub(
        r'\s*<div class="cars-search-heading-badge"[^>]*><span>⌕</span><strong>Намери точния автомобил</strong></div>',
        '',
        source,
        count=1,
    )
    updated = re.sub(r"20260907-cars\d+", NAV_VERSION, updated)
    write_if_changed(index_path, updated, changed)

    css_path = ROOT / "cars" / "cars.css"
    source = css_path.read_text(encoding="utf-8")
    updated = source
    updated = re.sub(r'^\.cars-search-heading-badge \{.*?\}\n', '', updated, flags=re.M)
    updated = re.sub(r'^\.cars-search-heading-badge span \{.*?\}\n', '', updated, flags=re.M)
    updated = re.sub(r'^\.cars-search-heading-badge strong \{.*?\}\n', '', updated, flags=re.M)
    updated = re.sub(r'^\s*\.cars-search-heading-badge \{ width:100%;.*?\}\n', '', updated, flags=re.M)
    write_if_changed(css_path, updated, changed)


def widen_navigation_css(path: Path, changed: list[str], important: bool) -> None:
    source = path.read_text(encoding="utf-8")
    marker = "/* GORIVA NAV WIDE DESKTOP 20260907 */"
    if marker in source:
        return

    bang = "!important" if important else ""
    block = f'''\n\n{marker}\n@media (min-width: 1200px) {{\n  .goriva-global-nav-shell {{\n    width: min(1600px, calc(100% - 20px)){bang};\n    max-width: 1600px{bang};\n    grid-template-columns: minmax(220px, auto) minmax(0, 1fr) auto{bang};\n    gap: 20px{bang};\n    padding-left: 2px{bang};\n    padding-right: 2px{bang};\n    box-sizing: border-box{bang};\n  }}\n  .goriva-global-nav {{\n    width: 100%{bang};\n    justify-content: stretch{bang};\n  }}\n  .goriva-global-menu {{\n    width: 100%{bang};\n    box-sizing: border-box{bang};\n    justify-content: center{bang};\n    gap: 9px{bang};\n  }}\n  .goriva-global-menu > a {{\n    margin-left: 0{bang};\n    margin-right: 0{bang};\n    padding-left: 13px{bang};\n    padding-right: 13px{bang};\n  }}\n  .goriva-stations-nav-item {{\n    margin-left: 4px{bang};\n    margin-right: 4px{bang};\n  }}\n  .goriva-global-actions {{\n    justify-self: end{bang};\n    justify-content: flex-end{bang};\n    margin-left: auto{bang};\n  }}\n}}\n'''
    write_if_changed(path, source + block, changed)


def main() -> None:
    changed: list[str] = []

    html_files = [ROOT / "index.html"]
    for html_root in (ROOT / "pages", ROOT / "stations", ROOT / "cars"):
        if html_root.exists():
            html_files.extend(sorted(html_root.rglob("*.html")))
    for path in html_files:
        if path.exists():
            normalize_html(path, changed)

    text_files = [
        ROOT / "scripts" / "article-engagement.js",
        ROOT / "scripts" / "script.js",
        ROOT / "scripts" / "site-shell.js",
        ROOT / "scripts" / "global-nav.js",
        ROOT / "pages" / "styles" / "site-shell-legacy.css",
    ]
    for path in text_files:
        normalize_text_file(path, changed)

    polish_global_nav(changed)
    polish_car_search(changed)
    widen_navigation_css(ROOT / "pages" / "styles" / "global-progress.css", changed, important=True)
    widen_navigation_css(ROOT / "pages" / "styles" / "canonical-nav.css", changed, important=False)

    unique_changed = list(dict.fromkeys(changed))
    print(f"Applied navigation/search polish in {len(unique_changed)} files")
    for item in unique_changed:
        print(f" - {item}")


if __name__ == "__main__":
    main()
