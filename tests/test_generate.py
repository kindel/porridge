#!/usr/bin/env python3
"""Skip rules and output stamping for the facet generator."""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), "scripts"))

from generate import (N_ROWS, classify_facet, is_complete_set, needs_generation,
                      parse_rows, row_words, split_facet_rows, stamp,
                      style_examples)


def rec(pid, company, rows):
    return {"id": pid, "company": company, "rows": rows}


def authored(i="a"):
    return {
        "id": "row-%s" % i,
        "situation": "A situation",
        "under": "Does not do it.",
        "justRight": "Does it well.",
        "over": "Does far too much of it.",
    }


def quoted():
    r = authored("dawn")
    r["words"] = "quoted"
    return r


def generated(i="g"):
    r = authored(i)
    r["id"] = "gen-%s" % i
    r["words"] = "generated"
    return r


class ClassifyTest(unittest.TestCase):

    def test_a_facet_with_an_amazon_ref_is_human(self):
        records = {1002: rec(1002, "amazon", [authored()])}
        facet = {"id": "acts-like-an-owner",
                 "rows": [{"principle": 1002, "id": "row-a"}]}
        self.assertEqual("human", classify_facet(facet, records))

    def test_a_facet_with_a_dawn_quoted_ref_is_human(self):
        records = {6004: rec(6004, "dawn", [quoted()])}
        facet = {"id": "acts-like-an-owner",
                 "rows": [{"principle": 6004, "id": "row-dawn"}]}
        self.assertEqual("human", classify_facet(facet, records))
        self.assertEqual("quoted", row_words(facet["rows"][0], records))

    def test_an_empty_facet_is_pending(self):
        facet = {"id": "collaboration", "principles": [5001], "rows": []}
        self.assertEqual("empty", classify_facet(facet, {}))

    def test_a_facet_that_already_has_generated_rows_is_skipped(self):
        facet = {"id": "collaboration", "rows": [
            {**generated(), "situation": "When you have been stuck",
             "under": "Stays silent.", "justRight": "Asks for help.",
             "over": "Floods the channel."},
        ]}
        self.assertEqual("generated", classify_facet(facet, {}))

    def test_human_rows_win_over_generated_on_the_same_facet(self):
        records = {1002: rec(1002, "amazon", [authored()])}
        facet = {"id": "mixed", "rows": [
            {"principle": 1002, "id": "row-a"},
            generated(),
        ]}
        self.assertEqual("human", classify_facet(facet, records))
        human, gen = split_facet_rows(facet, records)
        self.assertEqual(1, len(human))
        self.assertEqual(1, len(gen))
        self.assertTrue(needs_generation(facet, records))

    def test_a_facet_with_eight_generated_rows_is_skipped(self):
        rows = [generated(str(i)) for i in range(8)]
        for i, r in enumerate(rows):
            r["id"] = "gen-%d" % i
        facet = {"id": "full", "rows": rows}
        self.assertFalse(needs_generation(facet, {}))

    def test_a_human_source_facet_still_needs_generated_rows(self):
        records = {1002: rec(1002, "amazon", [authored()])}
        facet = {"id": "acts-like-an-owner",
                 "rows": [{"principle": 1002, "id": "row-a"}]}
        self.assertTrue(needs_generation(facet, records))


class StyleExamplesTest(unittest.TestCase):

    def test_style_examples_skip_generated_rows(self):
        records = {
            1002: rec(1002, "amazon", [authored(), generated()]),
            6004: rec(6004, "dawn", [quoted()]),
        }
        samples = style_examples(records, n_amazon=4, n_dawn=2)
        self.assertTrue(samples)
        self.assertTrue(all(s["words"] != "generated" for s in samples))
        self.assertTrue(any(s["words"] == "quoted" for s in samples))
        self.assertTrue(any(s["words"] == "authored" for s in samples))


class StampTest(unittest.TestCase):

    def test_stamp_marks_words_generated_and_drops_junk(self):
        rows = stamp([
            {"id": "good-row", "situation": "A case",
             "under": "Under does too little.",
             "justRight": "Just right names the tradeoff.",
             "over": "Over does too much."},
            {"id": "Bad Id", "situation": "Nope",
             "under": "x.", "justRight": "y.", "over": "z."},
            {"id": "emdash", "situation": "Nope",
             "under": "Uses an em—dash.", "justRight": "y.", "over": "z."},
        ])
        self.assertEqual(["good-row"], [r["id"] for r in rows])
        self.assertEqual("generated", rows[0]["words"])

    def test_parse_rows_accepts_fenced_json(self):
        text = "```json\n{\"rows\": [{\"id\": \"a\"}]}\n```"
        self.assertEqual([{"id": "a"}], parse_rows(text))

    def _valid(self, i):
        return {
            "id": "row-%d" % i,
            "situation": "Situation %d" % i,
            "under": "Under does too little.",
            "justRight": "Just right names the tradeoff.",
            "over": "Over does too much.",
        }

    def test_five_stamped_rows_are_not_a_complete_set(self):
        rows = stamp([self._valid(i) for i in range(5)])
        self.assertEqual(5, len(rows))
        self.assertFalse(is_complete_set(rows))
        facet = {"id": "partial", "rows": rows}
        self.assertTrue(needs_generation(facet, {}))

    def test_eight_stamped_rows_are_a_complete_set(self):
        rows = stamp([self._valid(i) for i in range(N_ROWS)])
        self.assertEqual(N_ROWS, len(rows))
        self.assertTrue(is_complete_set(rows))
        facet = {"id": "full", "rows": rows}
        self.assertFalse(needs_generation(facet, {}))


if __name__ == "__main__":
    unittest.main()
