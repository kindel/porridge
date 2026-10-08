#!/usr/bin/env python3
"""lp-tokens.html escapes note text and emits markup only for {lp:slug}."""

import os
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
        return f.read()


class LpTokensTest(unittest.TestCase):

    def test_partial_escapes_before_the_token_links(self):
        partial = read("layouts", "partials", "lp-tokens.html")
        escape_at = partial.index("htmlEscape")
        range_at = partial.index("range .principles")
        safe_at = partial.rindex("safeHTML")
        self.assertLess(escape_at, range_at)
        self.assertLess(range_at, safe_at)
        self.assertIn(".text | htmlEscape", partial)
        self.assertIn(".name | htmlEscape", partial)

    def test_every_caller_still_uses_the_shared_partial(self):
        single = read("layouts", "porridge", "single.html")
        listing = read("layouts", "porridge", "list.html")
        # Definition, subtitle, why, calibration, examples, looks-like,
        # questions, Further reading, and Related notes.
        self.assertEqual(single.count('partial "lp-tokens.html"'), 13)
        # Amazon and generic set-level Further reading notes.
        self.assertEqual(listing.count('partial "lp-tokens.html"'), 2)
        self.assertIn("Related", single)
        self.assertIn("$rel.note", single)


if __name__ == "__main__":
    unittest.main()
