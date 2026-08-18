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


def page_text(company: str, pid: str, name: str) -> str:
    lines = ["---"]
    if company == "amazon":
        lines.append("aliases:")
        lines.append(f"  - /lps/{pid}/")
        lines.append(f"  - /porridge/{pid}/")
    lines.append(f"title: {name}")
    lines.append(f"description: Under, just right, and over for {name}.")
    lines.append(f"lpId: {pid}")
    lines.append(f"company: {company}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def main() -> int:
    idx = load_index()
    sha = principles_sha()
    added = []
    for company in idx.get("companies", []):
        cid = company["id"]
        cdir = CONTENT / cid
        cdir.mkdir(parents=True, exist_ok=True)
        index_path = cdir / "_index.md"
        if not index_path.exists():
            index_path.write_text(company_index_text(company["name"]))
            added.append(f"{cid}/_index.md")
        for p in company.get("principles", []):
            pid, name = p["id"], p["name"]
            path = cdir / f"{pid}.md"
            if path.exists():
                continue
            path.write_text(page_text(cid, pid, name))
            added.append(f"{cid}/{pid}.md")

    lines = [f"principles {sha}", ""]
    if not added:
        lines.append("no missing stubs")
        print("\n".join(lines))
        return 0
    lines.append("added:")
    lines.extend(f"  {a}" for a in added)
    report = ROOT / ".kindel" / "last-sync.txt"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
