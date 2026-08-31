from __future__ import annotations

import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def resolve_date() -> str:
    requested = os.getenv("ARTICLE_DATE", "").strip()
    if requested:
        return requested
    root = ROOT / "pages" / "articles" / "sofia"
    dates = sorted(p.parent.name for p in root.glob("*/index.html"))
    if not dates:
        raise RuntimeError("No Sofia article found")
    return dates[-1]


def engagement_inner() -> str:
    return '''
        <div class="article-engagement-top">
          <div class="article-engagement-stats">
            <span class="article-engagement-stat">Публикувана: <strong><time data-article-published>—</time></strong></span>
            <span class="article-engagement-dot" aria-hidden="true"></span>
            <span class="article-engagement-stat">Прочетена <strong data-article-views>—</strong> пъти</span>
            <span class="article-engagement-dot" aria-hidden="true"></span>
            <span class="article-engagement-stat"><strong data-article-likes>—</strong> харесвания</span>
          </div>
          <button class="article-like-button" type="button" data-like-article aria-pressed="false"><span class="heart" aria-hidden="true">♡</span><span class="article-like-label">Харесай</span></button>
        </div>
        <div class="article-share-row" aria-label="Споделяне">
          <span class="article-share-label">Сподели статията:</span>
          <button class="article-share-button" type="button" data-share-network="facebook">Facebook</button>
          <button class="article-share-button" type="button" data-share-network="x">X</button>
          <button class="article-share-button" type="button" data-share-network="linkedin">LinkedIn</button>
          <button class="article-share-button" type="button" data-share-network="whatsapp">WhatsApp</button>
          <button class="article-share-button" type="button" data-share-network="telegram">Telegram</button>
          <button class="article-share-button" type="button" data-share-network="email">Email</button>
          <button class="article-share-button" type="button" data-share-network="copy">Копирай линк</button>
          <button class="article-share-button article-share-button--primary" type="button" data-share-network="native">Още…</button>
        </div>
'''


def top_block() -> str:
    return f'''\n      <section class="article-engagement sofia-article-engagement" aria-label="Информация и взаимодействия със статията">\n{engagement_inner()}      </section>\n'''


def footer_block() -> str:
    return f'''\n      <section class="article-engagement-footer sofia-article-engagement-footer" aria-label="Споделяне и харесване на статията">\n{engagement_inner()}      </section>\n'''


def patch(date_str: str) -> None:
    path = ROOT / "pages" / "articles" / "sofia" / date_str / "index.html"
    if not path.exists():
        raise RuntimeError(f"Sofia article not found: {path}")

    text = path.read_text(encoding="utf-8")

    if 'class="article-engagement sofia-article-engagement"' not in text:
        meta = re.search(r'<div\b[^>]*class="[^"]*article-meta[^"]*"[^>]*>.*?</div>', text, flags=re.I | re.S)
        if meta:
            text = text[:meta.end()] + top_block() + text[meta.end():]
        else:
            raise RuntimeError("Could not find article-meta insertion point for Sofia engagement block")

    if 'class="article-engagement-footer sofia-article-engagement-footer"' not in text:
        sources = re.search(r'<section\b[^>]*class="[^"]*article-sources[^"]*"', text, flags=re.I)
        if sources:
            text = text[:sources.start()] + footer_block() + text[sources.start():]
        else:
            content_end = re.search(r'</div>\s*</article>', text, flags=re.I | re.S)
            if content_end:
                text = text[:content_end.start()] + footer_block() + text[content_end.start():]
            else:
                raise RuntimeError("Could not find footer engagement insertion point")

    # Keep the shared engagement runtime/style in sync with the daily overview.
    engagement_css = '/pages/styles/article-engagement.css?v=20260830-3'
    if engagement_css not in text:
        text = text.replace('</head>', f'  <link rel="stylesheet" href="{engagement_css}">\n</head>', 1)

    engagement_js = '/scripts/article-engagement.js?v=20260830-3'
    if engagement_js not in text:
        text = text.replace('</body>', f'  <script src="{engagement_js}" defer></script>\n</body>', 1)

    path.write_text(text, encoding="utf-8")
    print(f"Added sharing, likes and engagement counters to Sofia article {date_str}")


def main() -> None:
    patch(resolve_date())


if __name__ == "__main__":
    main()
