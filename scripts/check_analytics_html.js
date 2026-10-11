#!/usr/bin/env node
// Renders the kldTrack script from layouts/porridge/single.html with Hugo
// and checks the company reaches the page as a plain JS string. A company
// rendered as "\"amazon\"" lands in GA with its quote marks.
//
//   HUGO=/path/to/hugo node scripts/check_analytics_html.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.dirname(__dirname);
const single = fs.readFileSync(path.join(ROOT, "layouts", "porridge", "single.html"), "utf8");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const start = single.indexOf("<script>", single.indexOf("analytics.js"));
const end = single.indexOf("</script>", start);
if (start < 0 || end < 0) fail("single.html has no kldTrack script after analytics.js");
const block = single.slice(start, end + "</script>".length);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "porridge-analytics-"));
fs.mkdirSync(path.join(dir, "layouts", "_default"), { recursive: true });
fs.mkdirSync(path.join(dir, "content"), { recursive: true });
fs.writeFileSync(path.join(dir, "hugo.toml"), [
  'baseURL = "https://kindel.com/"',
  'disableKinds = ["taxonomy", "term", "RSS", "sitemap", "robotsTXT", "404", "home", "section"]',
  ""
].join("\n"));
fs.writeFileSync(path.join(dir, "content", "amazon.md"), "---\ntitle: check\ncompany: amazon\n---\n");
fs.writeFileSync(
  path.join(dir, "layouts", "_default", "single.html"),
  "{{ $company := .Params.company }}\n" + block + "\n"
);

execFileSync(process.env.HUGO || "hugo", ["--quiet", "-s", dir], { stdio: "inherit" });
const html = fs.readFileSync(path.join(dir, "public", "amazon", "index.html"), "utf8");
if (!/company:\s*"amazon",/.test(html)) {
  fail("company did not render as a plain string:\n" + html);
}
if (html.includes('\\"amazon\\"')) fail("company rendered with quote marks inside the string:\n" + html);
console.log("analytics html: ok");
