#!/usr/bin/env node
// Checks {lp:<slug>} token expansion in the standalone app. Lifts esc() and
// expandTokens() out of js/porridge-app.js rather than restating them, so
// this cannot drift from what the page actually runs.
//
//   node scripts/check_tokens.js
//
// Exits non-zero on any failure.
const fs = require("fs");
const path = require("path");

const ROOT = path.dirname(__dirname);

function lift(src) {
  const body = fs.readFileSync(src, "utf8");
  const grab = (name) => {
    const i = body.indexOf("function " + name + "(");
    if (i < 0) return "";
    let depth = 0;
    for (let k = body.indexOf("{", i); k < body.length; k++) {
      if (body[k] === "{") depth++;
      else if (body[k] === "}") { depth--; if (!depth) return body.slice(i, k + 1); }
    }
    return "";
  };
  const esc = grab("esc");
  const expand = grab("expandTokens");
  if (!expand) throw new Error("expandTokens not found in js/porridge-app.js");
  return new Function(esc + "\n" + expand + "\nreturn { esc: esc, expandTokens: expandTokens };")();
}

const m = lift(path.join(ROOT, "js", "porridge-app.js"));
const fail = [];
const amazon = [
  { slug: "deliver-results", name: "Deliver Results" },
  { slug: "ownership", name: "Ownership" },
];

function check(label, got, want) {
  if (got !== want) fail.push(`${label}:\n    got  ${got}\n    want ${want}`);
}

// A token expands to a link into the owning company's set.
check("default-company link",
  m.expandTokens("See {lp:deliver-results} first.", "amazon", amazon, "amazon"),
  'See <a href="?p=deliver-results">Deliver Results</a> first.');

// A non-default company keeps its ?c= parameter.
check("non-default-company link",
  m.expandTokens("See {lp:ownership}.", "dawn", amazon, "amazon"),
  'See <a href="?p=ownership&c=dawn">Ownership</a>.');

// A slug the owning company does not have stays literal rather than
// linking to some other company's principle.
check("unknown slug stays literal",
  m.expandTokens("See {lp:nope}.", "amazon", amazon, "amazon"),
  "See {lp:nope}.");

// The surrounding text is still escaped.
check("text is escaped",
  m.expandTokens("a <b> & {lp:ownership}", "amazon", amazon, "amazon"),
  'a &lt;b&gt; &amp; <a href="?p=ownership">Ownership</a>');

// Real corpus texts: every {lp:} token in the corpus must expand against
// its owning company. All live tokens today are Amazon's, referencing
// Amazon slugs, so none may survive expansion as a literal.
const upstream = process.env.PRINCIPLES_DATA_DIR;
if (upstream) {
  const idx = JSON.parse(fs.readFileSync(path.join(upstream, "index.json"), "utf8"));
  for (const co of idx.companies || []) {
    const list = (co.principles || []).map((p) => ({ slug: p.slug, name: p.name }));
    for (const p of co.principles || []) {
      const rec = JSON.parse(fs.readFileSync(path.join(upstream, co.id, p.slug + ".json"), "utf8"));
      const texts = [rec.definition || ""];
      for (const r of rec.rows || []) texts.push(r.under || "", r.justRight || "", r.over || "");
      for (const t of texts) {
        if (!t.includes("{lp:")) continue;
        const out = m.expandTokens(t, co.id, list, "amazon");
        if (out.includes("{lp:")) {
          fail.push(`${co.id}/${p.slug}: token survives expansion in: ${t.slice(0, 60)}...`);
        }
      }
    }
  }
}

if (fail.length) {
  console.log(`FAIL (${fail.length})`);
  fail.forEach((f) => console.log("  " + f));
  process.exit(1);
}
console.log("OK: token expansion vectors pass" + (upstream ? " (corpus tokens included)" : ""));
