"""Regression checks for the static fuel-history URL inventory and sitemap."""
import re
import unittest
from pathlib import Path
from unittest.mock import patch

from automation import rebuild_sitemap as seo


class HistorySitemapTests(unittest.TestCase):
    def test_history_pages_have_self_canonicals_and_sitemap_entries(self):
        pages = sorted((seo.ROOT / "pages" / "history").rglob("index.html"))
        self.assertEqual(len(pages), 24)
        sitemap = seo.SITEMAP.read_text(encoding="utf-8")

        for path in pages:
            with self.subTest(path=path.relative_to(seo.ROOT)):
                source = path.read_text(encoding="utf-8")
                relative = path.relative_to(seo.ROOT).as_posix()
                canonical = f"{seo.BASE_URL}/{relative.removesuffix('index.html')}"
                self.assertEqual(seo.canonical_for(path, source), canonical)
                self.assertTrue(seo.is_indexable(source))
                self.assertIn("<title>", source)
                self.assertIn('name="description"', source)
                self.assertEqual(sitemap.count(f"<loc>{canonical}</loc>"), 1)
                self.assertRegex(
                    sitemap,
                    re.escape(f"<loc>{canonical}</loc>")
                    + r"\s*<lastmod>\d{4}-\d{2}-\d{2}</lastmod>",
                )

    def test_shallow_checkout_keeps_previous_lastmod(self):
        path = seo.ROOT / "pages" / "history" / "dizel" / "month" / "index.html"
        source = path.read_text(encoding="utf-8")
        canonical = seo.canonical_for(path, source)
        with (
            patch.object(seo, "changed_in_worktree", return_value=False),
            patch.object(seo, "git_lastmod", return_value=None),
            patch.object(seo, "previous_sitemap_lastmods", return_value={canonical: "2026-09-27"}),
        ):
            self.assertEqual(seo.lastmod_for(path, source), "2026-09-27")


if __name__ == "__main__":
    unittest.main()
