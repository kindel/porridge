#!/usr/bin/env python3
"""The reading list is labeled Further reading in every renderer.

The list under a principle (and under the set) is no longer only Tig's
blog. kindel/porridge#46 renamed the label from "From the blog" to
"Further reading" and changed the subheads to match. The Hugo principle
page, the Hugo set page, and the standalone app must all say the same
thing, so a later edit to one cannot quietly drift from the others.

Each item shows the link's domain on its own line under the note. The
host comes from the URL at render time. A leading www. is dropped.
"""

import os
import re
import subprocess
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LABEL = "Further reading"
PRINCIPLE_SUBHEAD = "Sources and essays on this principle."
SET_SUBHEAD = "Sources and essays on the whole set."


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
        return f.read()


class FurtherReadingTest(unittest.TestCase):

    def setUp(self):
        self.single = read("layouts", "porridge", "single.html")
        self.list = read("layouts", "porridge", "list.html")
        self.app = read("js", "porridge-app.js")

    def test_old_label_is_gone(self):
        for name, s in (("single.html", self.single),
                        ("list.html", self.list),
                        ("porridge-app.js", self.app)):
            self.assertNotIn("From the blog", s, name)
            self.assertNotIn("Writing that goes", s, name)

    def test_principle_page_label_and_subhead(self):
        self.assertIn('<p class="kld-section-label">%s</p>' % LABEL,
                      self.single)
        self.assertIn('<h2 id="lps-blog-title">%s</h2>' % PRINCIPLE_SUBHEAD,
                      self.single)

    def test_set_page_label_and_subhead(self):
        self.assertIn('<p class="kld-section-label">%s</p>' % LABEL,
                      self.list)
        self.assertIn('<h2 id="lps-blog-title">%s</h2>' % SET_SUBHEAD,
                      self.list)

    def test_standalone_matches_principle_page(self):
        self.assertIn('<p class=\\"kld-section-label\\">%s</p>' % LABEL,
                      self.app)
        self.assertIn('<h2 id=\\"lps-blog-title\\">%s</h2>'
                      % PRINCIPLE_SUBHEAD, self.app)

    def test_domain_line_renders_under_each_note(self):
        # Note paragraph, then the host line. The host is plain text, not a link.
        hugo_item = re.compile(
            r'<a href="\{\{ \.url \}\}">\{\{ \.title \}\}</a>\s*'
            r'\{\{ with \.note \}\}<p>\{\{ \. \}\}</p>\{\{ end \}\}\s*'
            r'\{\{ \$host := partial "reading-host\.html" \.url \}\}\s*'
            r'\{\{ with \$host \}\}<p class="lps-blog-domain">\{\{ \. \}\}</p>\{\{ end \}\}'
        )
        for name, src in (("single.html", self.single), ("list.html", self.list)):
            self.assertIsNotNone(hugo_item.search(src), name)
            self.assertNotIn('<a class="lps-blog-domain"', src, name)
            self.assertNotIn("<a class='lps-blog-domain'", src, name)

        host = read("layouts", "partials", "reading-host.html")
        self.assertIn("urls.Parse", host)
        self.assertIn(".Host", host)
        self.assertIn('strings.TrimPrefix "www."', host)

        js_item = (
            '          var note = item.note ? "<p>" + esc(item.note) + "</p>" : "";\n'
            '          var host = readingHost(item.url);\n'
            '          var domain = host ? "<p class=\\"lps-blog-domain\\">" + esc(host) + "</p>" : "";\n'
            '          return "<li><a href=\\"" + esc(item.url) + "\\">" + esc(item.title) + "</a>" + note + domain + "</li>";'
        )
        self.assertIn(js_item, self.app)
        self.assertIn("new URL(url).hostname", self.app)
        self.assertNotIn('<a class=\\"lps-blog-domain\\"', self.app)

        # Execute the app's own readingHost. www.aboutamazon.com drops the
        # prefix; blog.kindel.com does not.
        script = r"""
const fs = require("fs");
const src = fs.readFileSync("js/porridge-app.js", "utf8");
const m = src.match(/function readingHost\(url\) \{\n[\s\S]*?\n  \}/);
if (!m) { console.error("readingHost missing"); process.exit(1); }
eval(m[0]);
const cases = [
  ["https://www.aboutamazon.com/news/company-news/amazons-original-1997-letter-to-shareholders", "aboutamazon.com"],
  ["https://blog.kindel.com/2023/01/08/breaking-down-innovation-invention/", "blog.kindel.com"],
  ["https://ir.aboutamazon.com/files/doc_financials/annual/2015-Letter-to-Shareholders.PDF", "ir.aboutamazon.com"],
  ["https://www.sec.gov/Archives/edgar/data/1018724/000119312510082914/dex991.htm", "sec.gov"],
  ["https://www.amazon.jobs/content/en/our-workplace/leadership-principles", "amazon.jobs"],
  ["https://us.macmillan.com/books/9781250267597/workingbackwards/", "us.macmillan.com"],
  ["https://aws.amazon.com/blogs/mt/why-you-should-develop-a-correction-of-error-coe/", "aws.amazon.com"],
  ["https://signalvnoise.com/svn3/some-advice-from-jeff-bezos/", "signalvnoise.com"]
];
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
for (const [url, want] of cases) {
  const got = readingHost(url);
  if (got !== want) {
    console.error("host", url, got, want);
    process.exit(2);
  }
  const note = "<p>" + esc("A note.") + "</p>";
  const domain = "<p class=\"lps-blog-domain\">" + esc(got) + "</p>";
  const html = "<li><a href=\"" + esc(url) + "\">Title</a>" + note + domain + "</li>";
  const noteAt = html.indexOf("<p>A note.</p>");
  const domainAt = html.indexOf('<p class="lps-blog-domain">' + want + "</p>");
  if (noteAt < 0 || domainAt < noteAt) {
    console.error("order", html);
    process.exit(3);
  }
  if (html.slice(noteAt, domainAt).includes("<a")) {
    console.error("domain wrapped", html);
    process.exit(4);
  }
}
"""
        proc = subprocess.run(
            ["node", "-e", script],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)


if __name__ == "__main__":
    unittest.main()
