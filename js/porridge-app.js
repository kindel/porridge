(function () {
  var cfg = window.PORRIDGE || {};
  var INDEX = cfg.principlesIndex || "https://cdn.jsdelivr.net/gh/kindel/principles@main/data/index.json";
  var RECORD = cfg.principlesRecord || "https://cdn.jsdelivr.net/gh/kindel/principles@main/data/{company}/{slug}.json";
  var FACETS = cfg.facetsJson || "https://cdn.jsdelivr.net/gh/kindel/principles@main/data/facets.json";
  var root = document.getElementById("porridge-root");
  if (!root) return;

  function param(name) {
    try { return new URL(window.location.href).searchParams.get(name) || ""; }
    catch (e) { return ""; }
  }
  function setParams(next) {
    var u = new URL(window.location.href);
    Object.keys(next).forEach(function (k) {
      if (!next[k]) u.searchParams.delete(k);
      else u.searchParams.set(k, next[k]);
    });
    window.history.replaceState({}, "", u.pathname + u.search + u.hash);
  }
  function recUrl(company, slug) {
    return RECORD.replace("{company}", company).replace("{slug}", slug);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function groupLabel(g) {
    if (!g) return "";
    return g.replace(/-/g, " ");
  }

  // Expand {lp:<slug>} tokens against the principle list of the company that
  // owns the text, mirroring layouts/partials/lp-tokens.html. companyId is
  // the owning company, companyPrinciples its principle list, and def the
  // default company (whose links omit ?c=). Escapes the text, so the return
  // value is HTML.
  function expandTokens(text, companyId, companyPrinciples, def) {
    return esc(text).replace(/\{lp:([a-z0-9-]+)\}/g, function (token, slug) {
      var match = null;
      (companyPrinciples || []).forEach(function (p) {
        if (p.slug === slug) match = p;
      });
      if (!match) return token;
      var q = "?p=" + encodeURIComponent(slug) +
        (companyId === def ? "" : "&c=" + encodeURIComponent(companyId));
      return "<a href=\"" + q + "\">" + esc(match.name) + "</a>";
    });
  }

  function renderList(bank, companyId) {
    var companies = bank.companies || [];
    var def = companies[0] && companies[0].id;
    if (!companyId || !companies.some(function (c) { return c.id === companyId; })) companyId = def;
    var co = companies.filter(function (c) { return c.id === companyId; })[0];
    var opts = companies.map(function (c) {
      return "<option value=\"" + esc(c.id) + "\"" + (c.id === companyId ? " selected" : "") + ">" + esc(c.name) + "</option>";
    }).join("");
    var cards = (co.principles || []).map(function (p) {
      var q = companyId === def ? "" : ("?c=" + encodeURIComponent(companyId) + "&p=" + encodeURIComponent(p.slug));
      if (companyId === def) q = "?p=" + encodeURIComponent(p.slug);
      var group = p.group ? "<p class=\"lps-card-group\">" + esc(groupLabel(p.group)) + "</p>" : "";
      return "<li><article class=\"lps-card\"><span class=\"lps-card-num\">" + esc(p.sort) + "</span>" +
        group + "<h3><a href=\"" + q + "\">" + esc(p.name) + "</a></h3><p>" + esc(p.definition || "") + "</p></article></li>";
    }).join("");
    root.innerHTML =
      "<section class=\"lps-intro\">" +
      "<p class=\"kld-section-label\">How to use it</p>" +
      "<h2>Get the balance right.</h2>" +
      "<p>A great way to be thoughtful about this is to apply a Just Right, Over, Under taxonomy. Pick the row that matches what happened.</p>" +
      "<label class=\"lps-company-label\" for=\"lps-company\">Company</label>" +
      "<select id=\"lps-company\" class=\"lps-select\">" + opts + "</select>" +
      "</section>" +
      "<section class=\"lps-index\">" +
      "<p class=\"kld-section-label\">The set</p>" +
      "<h2>" + esc(co.set) + ", in teaching order.</h2>" +
      "<ol class=\"lps-card-list\">" + cards + "</ol></section>" +
      "<p class=\"lps-add-note\">To add another company's set, <a href=\"https://github.com/kindel/principles/issues/new\">open an issue on kindel/principles</a>.</p>";
    document.getElementById("lps-company").addEventListener("change", function () {
      var id = this.value;
      setParams({ c: id === def ? "" : id, p: "" });
      renderList(bank, id);
    });
  }

  function renderSingle(bank, companyId, slug, rec, facetsData, principleById, companyNames, recCache) {
    var companies = bank.companies || [];
    var def = companies[0] && companies[0].id;
    var co = companies.filter(function (c) { return c.id === companyId; })[0] || companies[0];
    var listQ = companyId === def ? "" : ("?c=" + encodeURIComponent(companyId));
    var thisPrincipleEntry = null;
    (co.principles || []).forEach(function (p) {
      if (p.slug === slug) thisPrincipleEntry = p;
    });
    var thisNumericId = thisPrincipleEntry ? thisPrincipleEntry.id : 0;
    var thisFacets = (thisPrincipleEntry && thisPrincipleEntry.facets) || [];
    var facetMap = {};
    (facetsData.facets || []).forEach(function (f) { facetMap[f.id] = f; });
    var seenKeys = {};
    var mergedRows = [];
    thisFacets.forEach(function (facetId) {
      var facet = facetMap[facetId];
      if (!facet) return;
      (facet.rows || []).forEach(function (ref) {
        var srcPid = String(ref.principle);
        var rowId = ref.id;
        var key = srcPid + ":" + rowId;
        if (seenKeys[key]) return;
        seenKeys[key] = true;
        var srcEntry = principleById[srcPid];
        if (!srcEntry) return;
        var srcRec = recCache[srcPid];
        if (!srcRec) return;
        (srcRec.rows || []).forEach(function (r) {
          if (r.id === rowId) {
            mergedRows.push({
              id: r.id,
              situation: r.situation,
              under: r.under,
              justRight: r.justRight,
              over: r.over,
              words: r.words,
              _sourceCompany: srcEntry.company,
              _sourceCompanyName: companyNames[srcEntry.company] || srcEntry.company,
              _sourcePid: srcPid
            });
          }
        });
      });
    });
    var localPid = String(thisNumericId);
    (rec.rows || []).forEach(function (r) {
      var key = localPid + ":" + r.id;
      if (seenKeys[key]) return;
      seenKeys[key] = true;
      mergedRows.push(r);
    });
    var principlesByCompany = {};
    companies.forEach(function (c) { principlesByCompany[c.id] = c.principles || []; });
    var rows = mergedRows.map(function (r) {
      var isQuoted = r.words === "quoted";
      var srcSpan = isQuoted ? "<span class=\"lps-row-source\">quoted</span>" : "";
      var trClass = isQuoted ? " class=\"lps-row-shared\"" : "";
      // A row pulled in via the facet map keeps its own company's tokens:
      // {lp:<slug>} names a principle of the company that wrote the row.
      var rowCompany = r._sourceCompany || companyId;
      var rowPrinciples = principlesByCompany[rowCompany] || [];
      return "<tr" + trClass + "><th scope=\"row\">" + esc(r.situation) + srcSpan + "</th>" +
        "<td data-label=\"Under\">" + expandTokens(r.under, rowCompany, rowPrinciples, def) + "</td>" +
        "<td data-label=\"Just Right\">" + expandTokens(r.justRight, rowCompany, rowPrinciples, def) + "</td>" +
        "<td data-label=\"Over\">" + expandTokens(r.over, rowCompany, rowPrinciples, def) + "</td></tr>";
    }).join("");
    var jump = (co.principles || []).map(function (p) {
      var q = "?p=" + encodeURIComponent(p.slug) + (companyId === def ? "" : "&c=" + encodeURIComponent(companyId));
      var cur = p.slug === slug ? " class=\"is-current\"" : "";
      return "<li" + cur + "><a href=\"" + q + "\">" + esc(p.name) + "</a></li>";
    }).join("");
    var eyebrow = rec.group ? " · " + esc(groupLabel(rec.group)) : "";
    root.innerHTML =
      "<p class=\"kld-eyebrow\"><a href=\"" + (listQ || "?") + "\">Porridge</a>" + eyebrow + "</p>" +
      "<h1>" + esc(rec.name) + "</h1>" +
      "<p>" + expandTokens(rec.definition || "", companyId, co.principles || [], def) + "</p>" +
      "<nav class=\"lps-jump\" aria-label=\"All principles\"><ol>" + jump + "</ol></nav>" +
      "<section class=\"lps-section\"><p class=\"kld-section-label\">Calibration</p>" +
      "<h2>Under, just right, over.</h2>" +
      "<div class=\"lps-table-wrap\"><table class=\"lps-table\"><thead><tr>" +
      "<th scope=\"col\">Situation</th><th scope=\"col\">Under</th><th scope=\"col\">Just Right</th><th scope=\"col\">Over</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div></section>";
  }

  function boot() {
    Promise.all([
      fetch(INDEX).then(function (r) { return r.json(); }),
      fetch(FACETS).then(function (r) { return r.ok ? r.json() : { facets: [] }; }).catch(function () { return { facets: [] }; })
    ]).then(function (results) {
      var bank = results[0];
      var facetsData = results[1];
      var companies = bank.companies || [];
      var def = companies[0] && companies[0].id;
      var principleById = {};
      var companyNames = {};
      companies.forEach(function (co) {
        companyNames[co.id] = co.name;
        (co.principles || []).forEach(function (pr) {
          principleById[pr.id] = { company: co.id, slug: pr.slug, name: pr.name, facets: pr.facets || [] };
        });
      });
      var c = param("c") || def;
      if (!companies.some(function (x) { return x.id === c; })) c = def;
      var p = param("p");
      // The index carries no definitions, so backfill them from the records
      // before any list render, including the fallback after a failed
      // single-page load: a stale ?p= must not produce blank cards.
      function showList(companyId) {
        var pending = [];
        companies.forEach(function (co) {
          (co.principles || []).forEach(function (pr) {
            if (pr.definition) return;
            pending.push(fetch(recUrl(co.id, pr.slug)).then(function (r) { return r.json(); }).then(function (rec) {
              pr.definition = rec.definition;
              pr.group = rec.group;
              pr.name = rec.name || pr.name;
            }).catch(function () {}));
          });
        });
        return Promise.all(pending).then(function () { renderList(bank, companyId); });
      }
      if (!p) {
        return showList(c);
      }
      var co = companies.filter(function (x) { return x.id === c; })[0] || companies[0];
      var thisPrincipleEntry = null;
      (co.principles || []).forEach(function (pr) {
        if (pr.slug === p) thisPrincipleEntry = pr;
      });
      var thisNumericId = thisPrincipleEntry ? thisPrincipleEntry.id : 0;
      var thisFacets = (thisPrincipleEntry && thisPrincipleEntry.facets) || [];
      var facetMap = {};
      (facetsData.facets || []).forEach(function (f) { facetMap[f.id] = f; });
      var neededPids = {};
      thisFacets.forEach(function (facetId) {
        var facet = facetMap[facetId];
        if (!facet) return;
        (facet.rows || []).forEach(function (ref) {
          neededPids[String(ref.principle)] = true;
        });
      });
      return fetch(recUrl(c, p)).then(function (r) {
        if (!r.ok) throw new Error("missing record");
        return r.json();
      }).then(function (rec) {
        var recCache = {};
        recCache[thisNumericId] = rec;
        var fetches = Object.keys(neededPids).filter(function (pid) {
          return !recCache[pid];
        }).map(function (pid) {
          var entry = principleById[pid];
          if (!entry) return Promise.resolve();
          return fetch(recUrl(entry.company, entry.slug)).then(function (r) {
            return r.ok ? r.json() : null;
          }).then(function (srcRec) {
            if (srcRec) recCache[pid] = srcRec;
          }).catch(function () {});
        });
        return Promise.all(fetches).then(function () {
          renderSingle(bank, c, p, rec, facetsData, principleById, companyNames, recCache);
        });
      }).catch(function () { return showList(c); });
    }).catch(function (err) {
      root.innerHTML = "<p>Could not load the principle sets.</p>";
      console.error(err);
    });
  }
  boot();
})();
