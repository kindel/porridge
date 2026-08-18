(function () {
  var cfg = window.PORRIDGE || {};
  var INDEX = cfg.principlesIndex || "https://cdn.jsdelivr.net/gh/kindel/principles@main/data/index.json";
  var RECORD = cfg.principlesRecord || "https://cdn.jsdelivr.net/gh/kindel/principles@main/data/{company}/{slug}.json";
  var FACETS = cfg.facetsJson || "https://cdn.jsdelivr.net/gh/kindel/principles@main/data/facets.json";
  var TEACH = cfg.teaching || "https://cdn.jsdelivr.net/gh/kindel/biq@main/data/lps/{slug}.json";
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
  function teachUrl(company, slug) {
    // data/lps in kindel/biq is an Amazon-only copy. Asking it for another
    // company's slug returns Amazon's prose under that company's name.
    if (company !== "amazon") return "";
    return TEACH.replace("{slug}", slug);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function groupLabel(g) {
    if (!g) return "";
    return g.replace(/-/g, " ");
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

  function renderSingle(bank, companyId, slug, rec, teach, facetsData, principleById, companyNames, recCache) {
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
    var rows = mergedRows.map(function (r) {
      var isShared = r._sourceCompany && r._sourceCompany !== companyId;
      var isQuoted = r.words === "quoted";
      var showSource = isShared || isQuoted;
      var srcLabel = isQuoted ? "quoted" : (r._sourceCompanyName || "");
      var srcSpan = showSource ? "<span class=\"lps-row-source\">" + esc(srcLabel) + "</span>" : "";
      var trClass = showSource ? " class=\"lps-row-shared\"" : "";
      return "<tr" + trClass + "><th scope=\"row\">" + esc(r.situation) + srcSpan + "</th>" +
        "<td data-label=\"Under\">" + esc(r.under) + "</td>" +
        "<td data-label=\"Just Right\">" + esc(r.justRight) + "</td>" +
        "<td data-label=\"Over\">" + esc(r.over) + "</td></tr>";
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
      "<p>" + esc(rec.definition || "") + "</p>" +
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
      if (!p) {
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
        return Promise.all(pending).then(function () { renderList(bank, c); });
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
          var turl = teachUrl(c, p);
          if (!turl) return renderSingle(bank, c, p, rec, null, facetsData, principleById, companyNames, recCache);
          return fetch(turl).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
            .then(function (teach) { renderSingle(bank, c, p, rec, teach, facetsData, principleById, companyNames, recCache); });
        });
      }).catch(function () { renderList(bank, c); });
    }).catch(function (err) {
      root.innerHTML = "<p>Could not load the principle sets.</p>";
      console.error(err);
    });
  }
  boot();
})();
