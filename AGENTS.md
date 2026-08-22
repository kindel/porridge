# Agent guidance

PR-only. Never push to main.

## Attribution

MIT. Copyright (c) 2026 Kindel, LLC. Keep the copyright notice and permission notice in all copies.

All derivatives must link to https://kindel.com as part of attribution. A LICENSE file alone is not enough. Forks, ports, hosted copies, and generated apps that ship this work must include a visible link to https://kindel.com.

## Principles

The tenets for this work live in the Tenets section of https://github.com/kindel/principles/blob/main/README.md. Study those tenets before any upstream work: a change to kindel/principles, or anything that changes the model, schema, or principle data. Do not start that work from memory of last week's README.

SCHEMA.md is the contract. The data is data/index.json, data/facets.json, and data/\<company\>/\<slug\>.json. Do not fork a private copy of a set into this repo.

This repo is the Just Right / Over / Under user's manual. Sets come from kindel/principles. Do not name this repo "lps" or "porridge" in site copy as the core; the core is kindel/principles.

When mounted on kindel.com, pages use `.tool-page` for the column width (token `--tool-page-width` from the site). Do not add a second page max-width.

## Cursor Cloud specific instructions

See `README.md` for what this app is and how the standalone page and Hugo module fit together.

This repo is a static web app plus a Hugo module. There is no package manager, no build step, and no automated test suite in this repo, so there is nothing to install beyond the preinstalled Python 3 and Go.

### Run the app (standalone dev)

- Serve the repo root with a static file server, then open the standalone page. The canonical command is in `README.md` (`python3 -m http.server`). Port `8000` is the default.
- The standalone page (`index.html` + `js/porridge-app.js`) has no local data. It fetches the principle sets over the network from jsDelivr (`cdn.jsdelivr.net/gh/kindel/principles@main/...`). Outbound network access to jsDelivr is required, or the page renders "Could not load the principle sets." Egress to jsDelivr and `raw.githubusercontent.com` works in this environment.
- To point the page at locally hosted JSON instead of the CDN, set `window.PORRIDGE` before `js/porridge-app.js` loads (keys documented in `README.md`). This repo does not ship a `data/` directory, so the CDN is the only data source out of the box.

### Lint / test / build

- No linter, no test framework, and no build config exist in this repo. `go.mod` declares a Hugo Go module (`github.com/kindel/porridge`); there is no runnable Go program and no `.go` source, so `go build`/`go test` do nothing useful here.
- The production build is Hugo, and it happens in the external `kindel/kindelwww` site that mounts this repo as a module. That site is not present here, so the full Hugo-rendered experience cannot be built from this repo alone.

### Maintainer script

- `scripts/sync_from_principles.py` regenerates missing `content/porridge/<company>/` stubs from `kindel/principles`. Run it with `python3 scripts/sync_from_principles.py`. It only writes files that are missing and prints "no missing stubs" when everything is current. It reads from GitHub over the network.
