#!/usr/bin/env node
// Renders layouts/partials/lp-tokens.html with Hugo and checks the result.
// Note text is escaped. A {lp:slug} token is the only markup that is added.
//
//   node scripts/check_lp_html.js
//
// HUGO may point at the binary. Exits non-zero on any failure.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.dirname(__dirname);
const partialPath = path.join(ROOT, "layouts", "partials", "lp-tokens.html");
const partial = fs.readFileSync(partialPath, "utf8");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const escapeAt = partial.indexOf("htmlEscape");
const rangeAt = partial.indexOf("range .principles");
const safeAt = partial.lastIndexOf("safeHTML");
if (escapeAt < 0 || rangeAt < 0 || safeAt < 0 || !(escapeAt < rangeAt && rangeAt < safeAt)) {
  fail("lp-tokens.html must htmlEscape the note before expanding tokens, then mark the result safeHTML");
}
if (!partial.includes(".name | htmlEscape")) {
  fail("lp-tokens.html must escape the principle name inside the link");
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lp-tokens-"));
fs.mkdirSync(path.join(dir, "layouts", "partials"), { recursive: true });
fs.mkdirSync(path.join(dir, "content"), { recursive: true });
fs.copyFileSync(partialPath, path.join(dir, "layouts", "partials", "lp-tokens.html"));
fs.writeFileSync(path.join(dir, "content", "_index.md"), "---\ntitle: check\n---\n");
fs.writeFileSync(path.join(dir, "hugo.toml"), [
  'baseURL = "https://kindel.com/"',
  'disableKinds = ["taxonomy", "term", "RSS", "sitemap", "robotsTXT", "404", "section"]',
  "",
].join("\n"));
fs.writeFileSync(path.join(dir, "layouts", "index.html"), [
  '{{- $principles := slice (dict "slug" "ownership" "name" "Ownership") (dict "slug" "think-big" "name" "Think Big") -}}',
  '{{- $named := slice (dict "slug" "amp" "name" "A & B <C>") -}}',
  'NOTE={{ partial "lp-tokens.html" (dict "text" "a <b> & {lp:ownership}" "principles" $principles "company" "amazon") }}',
  'RELATED={{ partial "lp-tokens.html" (dict "text" "See {lp:think-big} and <img onerror=alert(1)>." "principles" $principles "company" "amazon") }}',
  'NAME={{ partial "lp-tokens.html" (dict "text" "Name {lp:amp}" "principles" $named "company" "amazon") }}',
  'PLAIN={{ partial "lp-tokens.html" (dict "text" "1 < 2 & 3 > 0" "principles" (slice) "company" "amazon") }}',
  "",
].join("\n"));

const hugo = process.env.HUGO || "hugo";
try {
  execFileSync(hugo, ["--source", dir, "--quiet"], { stdio: ["ignore", "pipe", "pipe"] });
} catch (err) {
  const detail = (err.stderr || err.stdout || "").toString();
  fail("hugo render failed: " + (detail || err.message));
}

const html = fs.readFileSync(path.join(dir, "public", "index.html"), "utf8");
const want = [
  'NOTE=a &lt;b&gt; &amp; <a href="/kld/apps/porridge/amazon/ownership/">Ownership</a>',
  'RELATED=See <a href="/kld/apps/porridge/amazon/think-big/">Think Big</a> and &lt;img onerror=alert(1)&gt;.',
  'NAME=Name <a href="/kld/apps/porridge/amazon/amp/">A &amp; B &lt;C&gt;</a>',
  "PLAIN=1 &lt; 2 &amp; 3 &gt; 0",
];
const missing = want.filter((line) => !html.includes(line));
if (missing.length) {
  fail("rendered lp-tokens.html did not match:\n" + missing.join("\n") + "\n--- html ---\n" + html);
}
if (html.includes("<b>") || html.includes("<img")) {
  fail("rendered note still contains raw tags:\n" + html);
}
console.log("OK: escaped notes render, and {lp:} tokens become links");
