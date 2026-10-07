#!/usr/bin/env python3
"""The generic set is the principles. A company set is an optional view.

Copy lives in content/porridge/_index.md. The standalone page repeats those
sentences because it has no Hugo. The company control does not list the
default set as a company.
"""

import os
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PROMPT = "Or view a company's principles:"
HEADING = "These are universal leadership principles that work for any company."
BACK = "Back to the universal principles"
CARD = "Learn how to live it »"


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
        return f.read()


class FramingTest(unittest.TestCase):

    def test_the_list_page_reads_copy_from_content(self):
        content = read("content", "porridge", "_index.md")
        layout = read("layouts", "porridge", "list.html")
        for sentence in (PROMPT, HEADING, BACK):
            self.assertIn(sentence, content)
        self.assertIn(".Params.heading", layout)
        self.assertIn(".Params.companyPrompt", layout)
        self.assertIn(".Params.backLabel", layout)
        self.assertNotIn("Pick the company whose principles fit you", layout)
        self.assertNotIn(">Any Company<", layout)

    def test_the_company_menu_omits_the_default_set(self):
        layout = read("layouts", "porridge", "list.html")
        self.assertIn('ne .id $default', layout)
        self.assertIn('data-default="{{ $default }}"', layout)
        js = read("js", "porridge.js")
        self.assertIn("data-default", js)
        self.assertNotIn("options[0]", js)

    def test_standalone_copy_matches_the_content_file(self):
        content = read("content", "porridge", "_index.md")
        js = read("js", "porridge-app.js")
        for sentence in (PROMPT, HEADING, BACK):
            self.assertIn(sentence, content)
            self.assertIn(sentence, js)
        self.assertNotIn("Pick the company whose principles fit you", js)

    def test_the_company_control_sits_above_the_cards(self):
        layout = read("layouts", "porridge", "list.html")
        js = read("js", "porridge-app.js")
        self.assertLess(layout.index('class="lps-or"'), layout.index("lps-card-list"))
        self.assertLess(js.index('class=\\"lps-or\\"'), js.index("lps-card-list"))
        css = read("css", "porridge.css")
        start = css.index(".lps-or-label")
        block = css[start:css.index("}", start)]
        self.assertIn("var(--kld-muted", block)
        self.assertIn("font-weight: 400", block)

    def test_the_app_frame_wraps_the_control_and_the_principle(self):
        listing = read("layouts", "porridge", "list.html")
        single = read("layouts", "porridge", "single.html")
        self.assertLess(
            listing.index('partial "app-kit/frame-start.html"'),
            listing.index('class="lps-or"'),
        )
        self.assertLess(listing.index('class="lps-or"'), listing.index("lps-card-list"))
        self.assertIn('partial "app-kit/frame-end.html"', listing)
        self.assertIn("teaching/generic/index.json", listing)
        self.assertIn('partial "app-kit/hero.html"', single)
        self.assertLess(
            single.index('partial "app-kit/frame-start.html"'),
            single.index(".Params.backLabel"),
        )
        self.assertIn('partial "app-kit/frame-end.html"', single)

    def test_the_whole_card_is_one_link(self):
        content = read("content", "porridge", "_index.md")
        layout = read("layouts", "porridge", "list.html")
        js = read("js", "porridge-app.js")
        css = read("css", "porridge.css")
        self.assertIn(CARD, content)
        self.assertIn(CARD, js)
        self.assertIn("$.Params.cardCta", layout)
        self.assertIn('class="lps-card"', layout)
        self.assertNotIn("<h3><a", layout)
        self.assertNotIn("<h3><a", js)
        self.assertIn("a.lps-card:focus-visible", css)
        self.assertIn("a.lps-card:hover", css)
        self.assertIn("a.lps-card:active", css)
        card = layout[layout.index('class="lps-card"'):layout.index("lps-card-go")]
        self.assertNotIn("<a ", card)
        self.assertIn("UI_DEFAULTS", js)
        self.assertIn("custom[k] || UI_DEFAULTS[k]", js)
        self.assertNotIn("var UI = cfg.ui", js)
