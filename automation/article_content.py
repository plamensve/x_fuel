"""Locate the generated article body independently of nested HTML elements."""

import re


def content_span(page: str) -> tuple[int, int]:
    opening = re.search(
        r'<div\b[^>]*class=["\'][^"\']*\barticle-content-full\b[^"\']*["\'][^>]*>',
        page,
        re.I,
    )
    if not opening:
        raise RuntimeError('article-content-full opening tag not found')
    article_end = re.search(r'</article\s*>', page[opening.end():], re.I)
    if not article_end:
        raise RuntimeError('article closing tag not found after article-content-full')
    before_article_end = opening.end() + article_end.start()
    closing_tags = list(re.finditer(r'</div\s*>', page[opening.end():before_article_end], re.I))
    if not closing_tags:
        raise RuntimeError('article-content-full closing tag not found')
    return opening.end(), opening.end() + closing_tags[-1].start()
