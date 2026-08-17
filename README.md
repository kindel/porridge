# porridge

Just Right, Over, Under. A user's manual for living a company's principles.

Live: [https://kindel.com/porridge/](https://kindel.com/porridge/). Amazon is the default. Arm is [https://kindel.com/porridge/?c=arm](https://kindel.com/porridge/?c=arm).

The sets come from [`kindel/principles`](https://github.com/kindel/principles). This repo is the app. Teaching prose for Amazon still comes from [`kindel/biq`](https://github.com/kindel/biq) `data/lps/`. Arm pages are definition plus calibration rows.

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
    principlesRecord: "/data/principles/{company}/{id}.json",
    teaching: "/data/lps/{id}.json"
  };
</script>
```

## Hugo

kindelwww mounts this module for layouts, content, js, and css, and paints the Kindel chrome. Adding a company is an issue on kindel/principles, then a content file here for each new single.
