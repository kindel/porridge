#!/usr/bin/env python3
"""The reading list is labeled Further reading in every renderer.

The list under a principle (and under the set) is no longer only Tig's
blog. kindel/porridge#46 renamed the label from "From the blog" to
"Further reading" and changed the subheads to match. The Hugo principle
page, the Hugo set page, and the standalone app must all say the same
thing, so a later edit to one cannot quietly drift from the others.
"""

import os
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LABEL = "Further reading"
PRINCIPLE_SUBHEAD = "Sources and essays on this principle."
SET_SUBHEAD = "Sources and essays on the whole set."


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
        return f.read()


class FurtherReadingTest(unittest.TestCase):

    def setUp(self):
        self.single = read("layouts", "porridge", "single.html")
        self.list = read("layouts", "porridge", "list.html")
        self.app = read("js", "porridge-app.js")

    def test_old_label_is_gone(self):
        for name, s in (("single.html", self.single),
                        ("list.html", self.list),
                        ("porridge-app.js", self.app)):
            self.assertNotIn("From the blog", s, name)
            self.assertNotIn("Writing that goes", s, name)

    def test_principle_page_label_and_subhead(self):
        self.assertIn('<p class="kld-section-label">%s</p>' % LABEL,
                      self.single)
        self.assertIn('<h2 id="lps-blog-title">%s</h2>' % PRINCIPLE_SUBHEAD,
                      self.single)

    def test_set_page_label_and_subhead(self):
        self.assertIn('<p class="kld-section-label">%s</p>' % LABEL,
                      self.list)
        self.assertIn('<h2 id="lps-blog-title">%s</h2>' % SET_SUBHEAD,
                      self.list)

    def test_standalone_matches_principle_page(self):
        self.assertIn('<p class=\\"kld-section-label\\">%s</p>' % LABEL,
                      self.app)
        self.assertIn('<h2 id=\\"lps-blog-title\\">%s</h2>'
                      % PRINCIPLE_SUBHEAD, self.app)


if __name__ == "__main__":
    unittest.main()
