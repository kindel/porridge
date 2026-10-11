#!/usr/bin/env python3
"""The Facet line comes from the shared footer, with one local fallback.

Pass facet true. Capture the partial. Print the old sentence only when that
output has no app-facet-fix, then emit the captured partial once. An edit
that drops the guard, skips facet, or prints the partial twice fails here.
"""

import os
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
        return f.read()


def assert_footer(case, name, src):
    case.assertEqual(src.count('partial "app-feedback.html"'), 1, name)
    case.assertEqual(src.count("$feedback :="), 1, name)
    case.assertIn('"facet" true', src, name)
    guard = src.index('in $html "app-facet-fix"')
    sentence = src.index("See something wrong or missing?")
    emit = src.index("$feedback | safeHTML")
    case.assertLess(guard, sentence, name)
    case.assertLess(sentence, emit, name)
    case.assertEqual(src.count("See something wrong or missing?"), 1, name)
    case.assertEqual(src.count("$feedback | safeHTML"), 1, name)
    case.assertEqual(src.count('class="lps-fix-note"'), 1, name)


class FacetFooterTest(unittest.TestCase):

    def test_the_company_list_guards_the_fallback(self):
        assert_footer(self, "list.html", read("layouts", "porridge", "list.html"))

    def test_the_principle_page_guards_the_fallback(self):
        assert_footer(self, "single.html", read("layouts", "porridge", "single.html"))

    def test_the_fallback_keeps_its_rule(self):
        css = read("css", "porridge.css")
        start = css.index(".lps-fix-note {")
        block = css[start:css.index("}", start)]
        self.assertIn("text-align: center", block)
        self.assertIn(".lps-fix-note + .app-feedback-section", css)
