#!/usr/bin/env python3
"""Resume-safe generator for facet calibration rows.

Reads kindel/principles (index, facet map, human records). Human rows are
source: they define the facet and set the voice. They are not the app table.

Writes a full generated set onto every facet that does not already have one.
Never overwrites quoted or authored rows on records. Never copies them into
the generated set. Amazon authored and Dawn quoted are the style bar, loaded
at run time.

Same shape as BIQ example packs: dry run reports the cost, a real run needs
XAI_API_KEY, output lands on a branch via the workflow, never on main.
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROMPT = os.path.join(ROOT, "prompt.md")
API = "https://api.x.ai/v1/chat/completions"
MODEL = "grok-4.6"
WORKERS = 3
TIMEOUT = 180
RETRIES = 3
N_ROWS = 8
TRUTHY = ("1", "true", "yes", "on")
SENTENCE = re.compile(r"(?<=[.!?])[\"'\)\]]*\s+")
KEBAB = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

INDEX_URL = os.environ.get(
    "PRINCIPLES_INDEX_URL",
    "https://raw.githubusercontent.com/kindel/principles/main/data/index.json",
)
FACETS_URL = os.environ.get(
    "PRINCIPLES_FACETS_URL",
    "https://raw.githubusercontent.com/kindel/principles/main/data/facets.json",
)
RECORD_URL = os.environ.get(
    "PRINCIPLES_RECORD_URL",
    "https://raw.githubusercontent.com/kindel/principles/main/{file}",
)


def is_inline_generated(row):
    if not isinstance(row, dict):
        return False
    return any(k in row for k in ("situation", "under", "justRight", "over"))


def row_words(row, records_by_pid):
    """Whose words a facet row is. Default authored, like the schema."""
    if is_inline_generated(row):
        return row.get("words") or "authored"
    rec = records_by_pid.get(row.get("principle"))
    if not rec:
        return "authored"
    rid = row.get("id")
    for r in rec.get("rows") or []:
        if r.get("id") == rid:
            return r.get("words") or "authored"
    return "authored"


def classify_facet(facet, records_by_pid):
    """human, generated, or empty. Source shape, not a skip rule."""
    rows = facet.get("rows") or []
    if not rows:
        return "empty"
    kinds = {row_words(r, records_by_pid) for r in rows}
    if kinds <= {"generated"}:
        return "generated"
    return "human"


def split_facet_rows(facet, records_by_pid):
    """Keep human refs intact; generated inline rows are the replaceable set."""
    human = []
    generated = []
    for r in facet.get("rows") or []:
        if row_words(r, records_by_pid) == "generated":
            generated.append(r)
        else:
            human.append(r)
    return human, generated


def needs_generation(facet, records_by_pid):
    """True until the facet has a full generated set.

    Human source refs are not a reason to skip. Resume when N_ROWS generated
    rows are already on the facet.
    """
    _human, generated = split_facet_rows(facet, records_by_pid)
    return len(generated) < N_ROWS


def style_examples(records_by_pid, n_amazon=4, n_dawn=2):
    """Amazon authored and Dawn quoted, loaded at run time, never generated."""
    amazon = []
    dawn = []
    for rec in records_by_pid.values():
        company = rec.get("company")
        for r in rec.get("rows") or []:
            words = r.get("words") or "authored"
            if words == "generated":
                continue
            sample = {
                "id": r.get("id"),
                "situation": r.get("situation"),
                "under": r.get("under"),
                "justRight": r.get("justRight"),
                "over": r.get("over"),
                "words": words,
            }
            if company == "amazon" and words == "authored" and len(amazon) < n_amazon:
                amazon.append(sample)
            elif company == "dawn" and words == "quoted" and len(dawn) < n_dawn:
                dawn.append(sample)
            if len(amazon) >= n_amazon and len(dawn) >= n_dawn:
                return amazon + dawn
    return amazon + dawn


def load_from_root(principles_root):
    data = os.path.join(principles_root, "data")
    with open(os.path.join(data, "index.json"), encoding="utf-8") as fh:
        index = json.load(fh)
    with open(os.path.join(data, "facets.json"), encoding="utf-8") as fh:
        facets = json.load(fh)
    records = {}
    for company in index.get("companies") or []:
        for p in company.get("principles") or []:
            rel = p.get("file") or ("data/%s/%s.json" % (company["id"], p["slug"]))
            path = os.path.join(principles_root, rel.replace("/", os.sep))
            with open(path, encoding="utf-8") as fh:
                rec = json.load(fh)
            records[rec["id"]] = rec
    return index, facets, records


def _get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "kindel-porridge-generate"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def load_from_urls():
    index = _get_json(INDEX_URL)
    facets = _get_json(FACETS_URL)
    records = {}
    for company in index.get("companies") or []:
        for p in company.get("principles") or []:
            rel = p.get("file") or ("data/%s/%s.json" % (company["id"], p["slug"]))
            rec = _get_json(RECORD_URL.replace("{file}", rel))
            records[rec["id"]] = rec
    return index, facets, records


def parse_rows(text):
    if not text:
        return None
    t = str(text).strip()
    if t.startswith("```"):
        lines = t.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        t = "\n".join(lines).strip()
    try:
        obj = json.loads(t)
    except Exception:
        start = t.find("{")
        last = t.rfind("}")
        if start < 0 or last <= start:
            return None
        try:
            obj = json.loads(t[start : last + 1])
        except Exception:
            return None
    rows = obj.get("rows") if isinstance(obj, dict) else None
    if not isinstance(rows, list) or not rows:
        return None
    return rows


def row_ok(row, seen):
    rid = row.get("id") or ""
    if not KEBAB.match(rid) or rid in seen:
        return False
    for key in ("situation", "under", "justRight", "over"):
        val = (row.get(key) or "").strip()
        if not val:
            return False
        if "\u2014" in val or "\u2013" in val or "---" in val:
            return False
    for key in ("under", "justRight", "over"):
        n = len([x for x in SENTENCE.split((row.get(key) or "").strip()) if x])
        if not 1 <= n <= 3:
            return False
    return True


def stamp(rows, reserved=None):
    out = []
    seen = set(reserved or ())
    for r in rows:
        if not isinstance(r, dict) or not row_ok(r, seen):
            continue
        seen.add(r["id"])
        out.append({
            "id": r["id"],
            "situation": r["situation"].strip(),
            "under": r["under"].strip(),
            "justRight": r["justRight"].strip(),
            "over": r["over"].strip(),
            "words": "generated",
        })
        if len(out) >= N_ROWS:
            break
    return out


def is_complete_set(rows):
    """A table is complete only when stamp kept N_ROWS. Partial sets stay pending."""
    return isinstance(rows, list) and len(rows) >= N_ROWS


def system_prompt():
    return open(PROMPT, encoding="utf-8").read().strip()


def user_prompt(facet, records_by_pid, examples, reserved_ids=None):
    mapped = []
    for pid in facet.get("principles") or []:
        rec = records_by_pid.get(pid) or {}
        mapped.append({
            "id": pid,
            "company": rec.get("company"),
            "name": rec.get("name"),
            "definition": rec.get("definition"),
        })
    parts = [
        "Facet: %s (%s)" % (facet.get("label"), facet.get("id")),
        "Principles this facet maps to:",
        json.dumps(mapped, indent=2),
        "",
        "Human style examples (do not copy):",
        json.dumps(examples, indent=2),
        "",
        "Write %d new rows for this facet." % N_ROWS,
    ]
    if reserved_ids:
        parts.extend([
            "",
            "Do not reuse these existing row ids:",
            json.dumps(sorted(reserved_ids)),
        ])
    return "\n".join(parts)


def call(facet, records_by_pid, examples, api_key, reserved_ids=None):
    payload = json.dumps({
        "model": MODEL,
        "temperature": 0.6,
        "messages": [
            {"role": "system", "content": system_prompt()},
            {"role": "user", "content": user_prompt(facet, records_by_pid, examples, reserved_ids)},
        ],
    }).encode()
    last_err = None
    for attempt in range(1, RETRIES + 1):
        try:
            req = urllib.request.Request(
                API,
                data=payload,
                headers={
                    "Authorization": "Bearer " + api_key,
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                raw = json.loads(resp.read().decode())
            text = (((raw.get("choices") or [{}])[0].get("message") or {}).get("content")) or ""
            rows = stamp(parse_rows(text) or [], reserved=reserved_ids)
            if not is_complete_set(rows):
                raise ValueError("incomplete set: %d, need %d" % (len(rows), N_ROWS))
            return rows
        except Exception as e:
            last_err = str(e)
            time.sleep(1.5 * attempt)
    raise RuntimeError(last_err or "failed")


def write_facets(principles_root, facets):
    path = os.path.join(principles_root, "data", "facets.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(facets, fh, indent=2)
        fh.write("\n")


def main():
    dry_run = (os.environ.get("PORRIDGE_DRY_RUN") or "").strip().lower() in TRUTHY
    api_key = os.environ.get("XAI_API_KEY") or ""
    want_facet = (os.environ.get("PORRIDGE_FACET") or "").strip()
    principles_root = (os.environ.get("PRINCIPLES_ROOT") or "").strip()

    if principles_root:
        _index, facets, records = load_from_root(principles_root)
    else:
        _index, facets, records = load_from_urls()

    pending = []
    skipped = 0
    for f in facets.get("facets") or []:
        if want_facet and f.get("id") != want_facet:
            continue
        if needs_generation(f, records):
            pending.append(f)
        else:
            skipped += 1

    print(
        "facets=%d skipped=%d pending=%d"
        % (skipped + len(pending), skipped, len(pending)),
        flush=True,
    )
    for f in pending:
        print("pending %s" % f.get("id"), flush=True)

    if dry_run:
        print(
            "dry run: %d api calls would be made, nothing written" % len(pending),
            flush=True,
        )
        return 0

    if pending and not api_key:
        raise SystemExit("Set XAI_API_KEY to generate facet rows.")
    if pending and not principles_root:
        raise SystemExit("Set PRINCIPLES_ROOT to a kindel/principles checkout to write.")
    if not pending:
        print("done new=0 fail=0", flush=True)
        return 0

    examples = style_examples(records)
    ok = 0
    fail = []
    reserved_by_id = {}
    for f in pending:
        human, _gen = split_facet_rows(f, records)
        reserved_by_id[id(f)] = set(r.get("id") for r in human if r.get("id"))
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {
            ex.submit(call, f, records, examples, api_key, reserved_by_id[id(f)]): f
            for f in pending
        }
        for fut in as_completed(futs):
            f = futs[fut]
            try:
                rows = fut.result()
                human, _old = split_facet_rows(f, records)
                f["rows"] = human + rows
                ok += 1
                print("ok %s generated=%d kept_human=%d" % (f.get("id"), len(rows), len(human)), flush=True)
            except Exception as e:
                fail.append({"facet": f.get("id"), "error": str(e)})
                print("fail %s %s" % (f.get("id"), e), flush=True)

    if ok:
        write_facets(principles_root, facets)
    print("done new=%d fail=%d" % (ok, len(fail)), flush=True)
    if fail:
        print("FAILURES", json.dumps(fail, indent=2), flush=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
