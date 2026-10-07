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
