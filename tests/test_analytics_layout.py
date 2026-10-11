#!/usr/bin/env python3
"""Hosted principle pages record the same view and company as the list."""

import os
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
        return f.read()


class AnalyticsLayoutTest(unittest.TestCase):

    def test_the_principle_page_records_the_company_from_the_url(self):
        single = read("layouts", "porridge", "single.html")
        self.assertIn('src="{{ "js/app-kit/analytics.js" | relURL }}"', single)
        self.assertIn('kldTrack("app_view", { app: "porridge" })', single)
        self.assertIn('kldTrack("kld_company"', single)
        # html/template already quotes a value inside <script>. jsonify on top
        # of that sent the company to GA as "\"amazon\"", quote marks included.
        self.assertIn("company: {{ $company }},", single)
        self.assertNotIn("$company | jsonify", single)
        self.assertIn('source: "url"', single)
        self.assertLess(single.index("analytics.js"), single.index('kldTrack("app_view"'))
