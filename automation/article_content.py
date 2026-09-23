"""Locate the generated article body without including its adjacent archive navigation."""

import re


OPENING = re.compile(
    r'<div\b[^>]*class=["\'][^"\']*\barticle-content-full\b[^"\']*["\'][^>]*>',
    re.I,
)
CLOSING = re.compile(r'</div\s*>', re.I)


def content_span(page: str) -> tuple[int, int]:
    opening = OPENING.search(page)
    if not opening:
        raise RuntimeError('article-content-full opening tag not found')
    article_end = re.search(r'</article\s*>', page[opening.end():], re.I)
    if not article_end:
        raise RuntimeError('article closing tag not found after article-content-full')
    limit = opening.end() + article_end.start()
    nav_start = page.find('<!-- ARTICLE_SERIES_NAV_START -->', opening.end(), limit)
    if nav_start != -1:
        limit = nav_start
    closing = list(CLOSING.finditer(page, opening.end(), limit))
    if not closing:
        raise RuntimeError('article-content-full closing tag not found')
    return opening.end(), closing[-1].start()
