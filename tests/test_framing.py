#!/usr/bin/env python3
"""The generic set is the principles. A company set is an optional view.

Copy lives in content/porridge/_index.md. The standalone page repeats those
sentences because it has no Hugo. The company control does not list the
default set as a company.
"""

import os
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PROMPT = "Or, you can use Porridge focused on how any of these companies define their principles."
UNIVERSAL = "Universal principles"
HEADING = "There is a set of universal leadership principles."
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

    def test_the_company_tiles_are_a_radio_group(self):
        layout = read("layouts", "porridge", "list.html")
        app = read("js", "porridge-app.js")
        js = read("js", "porridge.js")
        for src in (layout, app):
            self.assertIn("role=", src)
            self.assertIn("radiogroup", src)
            self.assertIn("aria-checked", src)
            self.assertNotIn("<select", src)
            self.assertNotIn("<option", src)
        self.assertIn('data-default="{{ $default }}"', layout)
        self.assertIn(".Params.universalLabel", layout)
        self.assertIn("data-default", js)
        for src in (js, app):
            self.assertIn('source: "picker"', src)
            self.assertIn("replaceState", src)
            self.assertIn("ArrowRight", src)
        self.assertIn(UNIVERSAL, read("content", "porridge", "_index.md"))
        self.assertIn(UNIVERSAL, app)

    def test_every_logo_is_a_local_file(self):
        import re
        content = read("content", "porridge", "_index.md")
        app = read("js", "porridge-app.js")
        block = content[content.index("logos:"):content.index("cardCta")]
        pairs = re.findall(r"^  ([a-z0-9-]+): (\S+)$", block, re.M)
        self.assertTrue(pairs)
        for cid, name in pairs:
            self.assertTrue(os.path.isfile(os.path.join(ROOT, "css", "logos", name)), name)
            self.assertIn(name, app)
        self.assertNotIn("http", block)
        self.assertNotIn("\u2014", content.split("---")[1])

    def test_standalone_copy_matches_the_content_file(self):
        content = read("content", "porridge", "_index.md")
        js = read("js", "porridge-app.js")
        for sentence in (PROMPT, HEADING, BACK, UNIVERSAL):
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

    def test_the_explainer_and_how_to_sit_inside_the_card(self):
        listing = read("layouts", "porridge", "list.html")
        start = listing.index('partial "app-kit/frame-start.html"')
        self.assertLess(start, listing.index('partial "app-kit/summary.html"'))
        self.assertLess(start, listing.index('partial "app-kit/related.html"'))
        self.assertLess(start, listing.index('class="lps-intro"'))
        self.assertNotIn("How to use it", listing)
        self.assertNotIn("How to use it", read("js", "porridge-app.js"))
