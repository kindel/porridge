#!/usr/bin/env python3
"""Write missing Porridge page stubs from kindel/principles."""

from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "porridge"
INDEX_URL = os.environ.get(
    "PRINCIPLES_INDEX_URL",
    "https://raw.githubusercontent.com/kindel/principles/main/data/index.json",
)
SHA_URL = os.environ.get(
    "PRINCIPLES_SHA_URL",
    "https://api.github.com/repos/kindel/principles/commits/main",
)


def load_index() -> dict:
    with urllib.request.urlopen(INDEX_URL, timeout=30) as r:
        return json.load(r)


def principles_sha() -> str:
    req = urllib.request.Request(
        SHA_URL, headers={"Accept": "application/vnd.github+json", "User-Agent": "kindel-cascade"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r).get("sha", "unknown")
    except Exception:
        return "unknown"


def company_index_text(name: str) -> str:
    return f"---\ntitle: {name}\nbuild:\n  render: never\n  list: never\n---\n"


def page_text(company: str, slug: str, name: str) -> str:
    lines = ["---"]
    if company == "amazon":
        lines.append("aliases:")
        lines.append(f"  - /lps/{slug}/")
        lines.append(f"  - /porridge/{slug}/")
    lines.append(f"title: {name}")
    lines.append(f"description: Under, just right, and over for {name}.")
    lines.append(f"lpId: {slug}")
    lines.append(f"company: {company}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def main() -> int:
    idx = load_index()
    sha = principles_sha()
    added = []
    removed = []
    known_cids = set()
    for company in idx.get("companies", []):
        cid = company["id"]
        known_cids.add(cid)
        cdir = CONTENT / cid
        cdir.mkdir(parents=True, exist_ok=True)
        index_path = cdir / "_index.md"
        if not index_path.exists():
            index_path.write_text(company_index_text(company["name"]))
            added.append(f"{cid}/_index.md")
        expected = set()
        for p in company.get("principles", []):
            slug = p.get("slug") or str(p["id"])
            name = p["name"]
            expected.add(slug)
            path = cdir / f"{slug}.md"
            if path.exists():
                continue
            path.write_text(page_text(cid, slug, name))
            added.append(f"{cid}/{slug}.md")
        # A stub whose record was renamed or removed upstream (SCHEMA.md
        # permits both) points single.html at a record that no longer
        # exists, and its errorf fails the whole site build. Prune it.
        for stale in sorted(cdir.glob("*.md")):
            if stale.name == "_index.md" or stale.stem in expected:
                continue
            stale.unlink()
            removed.append(f"{cid}/{stale.name}")

    # A company removed upstream orphans its whole directory the same way.
    for cdir in sorted(CONTENT.iterdir()):
        if not cdir.is_dir() or cdir.name in known_cids:
            continue
        for stale in sorted(cdir.glob("*.md")):
            stale.unlink()
            removed.append(f"{cdir.name}/{stale.name}")
        if not any(cdir.iterdir()):
            cdir.rmdir()

    lines = [f"principles {sha}", ""]
    if not added and not removed:
        lines.append("no missing or stale stubs")
        print("\n".join(lines))
        return 0
    if added:
        lines.append("added:")
        lines.extend(f"  {a}" for a in added)
    if removed:
        lines.append("removed (record gone upstream):")
        lines.extend(f"  {r}" for r in removed)
    report = ROOT / ".kindel" / "last-sync.txt"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
