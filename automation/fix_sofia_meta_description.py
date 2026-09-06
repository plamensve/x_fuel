from __future__ import annotations

import html
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES_ROOT = ROOT / "pages" / "articles" / "sofia"
MAX_DESCRIPTION_LENGTH = 155
MIN_SENTENCE_LENGTH = 70


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()


def sentence_safe_description(value: str, max_length: int = MAX_DESCRIPTION_LENGTH) -> str:
    text = normalize(value)
    if len(text) <= max_length:
        return text

    prefix = text[: max_length + 1]
    sentence_ends = [
        match.end()
        for match in re.finditer(r"[.!?](?=\s|$)", prefix)
        if match.end() >= MIN_SENTENCE_LENGTH
    ]
    if sentence_ends:
        return text[: sentence_ends[-1]].strip()

    shortened = text[: max_length - 1].rsplit(" ", 1)[0].rstrip(" ,;:-")
    return shortened + "…"


def schema_description(source: str) -> str:
    for match in re.finditer(
        r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        source,
        flags=re.I | re.S,
    ):
        try:
            payload = json.loads(html.unescape(match.group(1)).strip())
        except (json.JSONDecodeError, TypeError):
            continue
        candidates = payload if isinstance(payload, list) else [payload]
        for item in candidates:
            if not isinstance(item, dict):
                continue
            item_type = item.get("@type")
            types = item_type if isinstance(item_type, list) else [item_type]
            if "NewsArticle" in types and item.get("description"):
                return normalize(str(item["description"]))
    return ""


def existing_meta_description(source: str) -> str:
    match = re.search(
        r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']*)["\']',
        source,
        flags=re.I,
    )
    return normalize(match.group(1)) if match else ""


def replace_meta(source: str, key: str, value: str, *, property_attr: bool = False) -> str:
    attr = "property" if property_attr else "name"
    escaped = html.escape(value, quote=True)
    pattern = rf'(<meta\s+{attr}=["\']{re.escape(key)}["\']\s+content=["\'])[^"\']*(["\'])'
    return re.sub(pattern, lambda m: f"{m.group(1)}{escaped}{m.group(2)}", source, count=1, flags=re.I)


def resolve_article_path() -> Path:
    requested = os.getenv("ARTICLE_DATE", "").strip()
    if requested:
        path = ARTICLES_ROOT / requested / "index.html"
        if not path.exists():
            raise FileNotFoundError(f"Sofia article not found: {path}")
        return path

    candidates = sorted(ARTICLES_ROOT.glob("*/index.html"))
    if not candidates:
        raise FileNotFoundError("No Sofia article found")
    return candidates[-1]


def main() -> None:
    path = resolve_article_path()
    source = path.read_text(encoding="utf-8")
    original = schema_description(source) or existing_meta_description(source)
    if not original:
        raise RuntimeError(f"No description found in {path}")

    description = sentence_safe_description(original)
    updated = source
    updated = replace_meta(updated, "description", description)
    updated = replace_meta(updated, "og:description", description, property_attr=True)
    updated = replace_meta(updated, "twitter:description", description)

    if updated != source:
        path.write_text(updated, encoding="utf-8")
        print(f"Updated SEO descriptions: {path}")
    else:
        print(f"SEO descriptions already current: {path}")


if __name__ == "__main__":
    main()
