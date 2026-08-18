# porridge

Just Right, Over, Under. A user's manual for living a company's principles.

Live: [https://kindel.com/porridge/](https://kindel.com/porridge/). Amazon is the default. Arm is [https://kindel.com/porridge/?c=arm](https://kindel.com/porridge/?c=arm).

The sets come from [`kindel/principles`](https://github.com/kindel/principles): Amazon, Arm, Coupang, Delivery Hero, and GitLab. This repo is the app. Teaching prose for Amazon still comes from [`kindel/biq`](https://github.com/kindel/biq) `data/lps/`. Every other company is definition plus calibration rows.

`data/lps/` is an Amazon-only copy, so it is only ever consulted when the company is `amazon`. Asking it for another company's id returns Amazon's prose under someone else's name.

`/lps/` is an alias on kindel.com, not a second app.

## Run

Needs a static file server because the sets are loaded with `fetch`.

```
python3 -m http.server
```

Open http://127.0.0.1:8000/

The standalone page fetches `kindel/principles` from jsDelivr. A host that already serves the JSON can override the URLs by setting `window.PORRIDGE` before `js/porridge-app.js` loads:

```html
<script>
  window.PORRIDGE = {
    principlesIndex: "/data/principles/index.json",
    principlesRecord: "/data/principles/{company}/{slug}.json",
    teaching: "/data/lps/{slug}.json"
  };
</script>
```

## URLs

Single pages are `/porridge/<company>/<id>/`. The company has to be in the path because ids are only unique within a company: `dive-deep` belongs to Amazon, Coupang, and Delivery Hero, and `own-it` to both Arm and Delivery Hero.

Every pre-existing flat URL is kept as an alias, so `/porridge/dive-deep/` redirects to `/porridge/amazon/dive-deep/`.

The standalone page addresses the same content with query parameters, `?c=<company>&p=<id>`, and needs no path scheme.

## Hugo

kindelwww mounts this module for layouts, content, js, and css, and paints the Kindel chrome. The module carries its own `layouts/partials/lp-tokens.html`; a site that defines its own will override it, and that override must be company-aware or cross-references will point at the wrong company.

Adding a company is an issue on kindel/principles, then a content file here for each new single, under `content/porridge/<company>/`.
