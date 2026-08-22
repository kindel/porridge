#!/usr/bin/env python3
"""The stub sync must track upstream in both directions.

layouts/porridge/single.html calls errorf when a stub's record is missing,
so a stub that outlives its upstream principle fails the whole site build.
SCHEMA.md explicitly permits slug renames and removals; the sync has to
prune what they orphan, not just add what they create.
"""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), "scripts"))

import sync_from_principles as sync


def index_doc():
    return {"companies": [{
        "id": "amazon", "name": "Amazon",
        "principles": [
            {"id": 1001, "slug": "current", "name": "Current"},
            {"id": 1002, "slug": "brand-new", "name": "Brand New"},
        ]}]}


class SyncTest(unittest.TestCase):

    def run_sync(self, prepare):
        """Run main() against a temp content tree; return {path: text}."""
        with tempfile.TemporaryDirectory() as td:
            td = Path(td)
            content = td / "content" / "porridge"
            content.mkdir(parents=True)
            prepare(content)
            (td / "index.json").write_text(json.dumps(index_doc()))

            old = sync.ROOT, sync.CONTENT, sync.INDEX_URL, sync.principles_sha
            sync.ROOT = td
            sync.CONTENT = content
            sync.INDEX_URL = (td / "index.json").as_uri()
            sync.principles_sha = lambda: "test"
            try:
                sync.main()
            finally:
                sync.ROOT, sync.CONTENT, sync.INDEX_URL, sync.principles_sha = old
            return {str(f.relative_to(content)): f.read_text()
                    for f in sorted(content.rglob("*.md"))}

    def test_a_missing_stub_is_added(self):
        result = self.run_sync(lambda c: None)
        self.assertIn("amazon/brand-new.md", result)
        self.assertIn("amazon/current.md", result)

    def test_an_existing_stub_is_kept_untouched(self):
        marker = "---\ntitle: Current\nlpId: current\ncompany: amazon\nextra: kept\n---\n"

        def prepare(c):
            (c / "amazon").mkdir()
            (c / "amazon" / "current.md").write_text(marker)

        result = self.run_sync(prepare)
        self.assertEqual(marker, result.get("amazon/current.md"))

    def test_a_stub_for_a_removed_principle_is_pruned(self):
        def prepare(c):
            (c / "amazon").mkdir()
            (c / "amazon" / "retired.md").write_text(
                "---\ntitle: Retired\nlpId: retired\ncompany: amazon\n---\n")

        result = self.run_sync(prepare)
        self.assertNotIn("amazon/retired.md", result,
                         "a stub whose record no longer exists upstream "
                         "fails the whole Hugo build via errorf")

    def test_the_company_index_survives_pruning(self):
        def prepare(c):
            (c / "amazon").mkdir()
            (c / "amazon" / "_index.md").write_text("---\ntitle: Amazon\n---\n")
            (c / "amazon" / "retired.md").write_text(
                "---\ntitle: Retired\nlpId: retired\ncompany: amazon\n---\n")

        result = self.run_sync(prepare)
        self.assertIn("amazon/_index.md", result)
        self.assertNotIn("amazon/retired.md", result)

    def test_a_removed_company_s_stubs_are_pruned(self):
        def prepare(c):
            (c / "oldco").mkdir()
            (c / "oldco" / "_index.md").write_text("---\ntitle: Oldco\n---\n")
            (c / "oldco" / "gone.md").write_text(
                "---\ntitle: Gone\nlpId: gone\ncompany: oldco\n---\n")

        result = self.run_sync(prepare)
        self.assertEqual([], [p for p in result if p.startswith("oldco/")])


if __name__ == "__main__":
    unittest.main()
