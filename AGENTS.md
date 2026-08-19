# porridge

See `README.md` for what this app is and how the standalone page and Hugo module fit together.

## Cursor Cloud specific instructions

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
