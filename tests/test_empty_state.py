#!/usr/bin/env python3
"""A principle with no generated rows gets a sentence, not an empty table.

SCHEMA.md in kindel/principles: a display consumer shows only generated
rows on the principle's facets, and when there are none it does not fall
back to the record's human rows or the facet's refs. Every principle the
facet audit skips (all of GitLab, for one) has no rows. Rendering the table
shell anyway reads as a broken page (kindel/porridge#42). Both renderers
must guard the table on having rows and say why when they do not.
"""

import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
        return f.read()


class EmptyStateTest(unittest.TestCase):

    def test_hugo_single_guards_the_table(self):
        s = read("layouts", "porridge", "single.html")
        guard = s.find("{{ if not $mergedRows }}")
        self.assertGreater(guard, -1, "single.html must branch on $mergedRows")
        empty = s.find('class="lps-cal-empty"', guard)
        self.assertGreater(empty, guard, "empty state must follow the guard")
        # The outer else closes the empty-state <p> and opens the table.
        # Anchor on that boundary so a nested else inside the <p> cannot
        # satisfy the check.
        branch = re.compile(r'</p>\s*\{\{ else \}\}\s*'
                            r'<div class="lps-table-wrap">\s*'
                            r'<table class="lps-table">')
        m = branch.search(s, empty)
        self.assertIsNotNone(m, "the table must open the else branch that "
                             "follows the empty-state paragraph")
        self.assertEqual(s.count('<table class="lps-table">'), 1,
                         "one table, inside the guard")

    def test_standalone_guards_the_table(self):
        s = read("js", "porridge-app.js")
        self.assertIn("if (mergedRows.length)", s)
        self.assertIn("lps-cal-empty", s)
        self.assertEqual(len(re.findall(r'<table class=\\"lps-table\\">', s)),
                         1, "one table, inside the guard")

    def test_empty_state_has_a_style(self):
        self.assertIn(".lps-cal-empty", read("css", "porridge.css"))

    def test_no_fallback_to_human_rows(self):
        # The contract: never show $lp.rows or facet refs as the table.
        s = read("layouts", "porridge", "single.html")
        self.assertNotIn("$lp.rows", s)
        self.assertNotIn("rec.rows", read("js", "porridge-app.js"))


if __name__ == "__main__":
    unittest.main()
