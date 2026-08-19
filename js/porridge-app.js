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
  function lpHref(companyId, slug) {
    return "?c=" + encodeURIComponent(companyId) + "&p=" + encodeURIComponent(slug);
  }
  // Escape first, then expand {lp:<slug>} into query-param links. Tokens
  // become trusted markup; everything else stays escaped, matching Hugo's
  // lp-tokens.html + safeHTML split.
  function expandLp(text, principles, companyId) {
    var out = esc(text);
    (principles || []).forEach(function (p) {
      var token = "{lp:" + p.slug + "}";
      if (out.indexOf(token) === -1) return;
      var link = "<a href=\"" + lpHref(companyId, p.slug) + "\">" + esc(p.name) + "</a>";
      out = out.split(token).join(link);
    });
    return out;
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
        if (ref.under && ref.principle == null) {
          var gkey = "generated:" + facetId + ":" + ref.id;
          if (seenKeys[gkey]) return;
          seenKeys[gkey] = true;
          mergedRows.push({
            id: ref.id,
            situation: ref.situation,
            under: ref.under,
            justRight: ref.justRight,
            over: ref.over,
            words: ref.words || "generated"
          });
          return;
        }
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
    var principles = co.principles || [];
    var principlesByCompany = {};
    companies.forEach(function (c) { principlesByCompany[c.id] = c.principles || []; });
    var rows = mergedRows.map(function (r) {
      var isQuoted = r.words === "quoted";
      var isGenerated = r.words === "generated";
      var srcSpan = isQuoted ? "<span class=\"lps-row-source\">quoted</span>"
        : (isGenerated ? "<span class=\"lps-row-source\">generated</span>" : "");
      var trClass = (isQuoted || isGenerated) ? " class=\"lps-row-shared\"" : "";
      // A row pulled in via the facet map keeps its own company's tokens:
      // {lp:<slug>} names a principle of the company that wrote the row, so
      // it must expand against that company's list, not the viewing one's.
      var rowCompany = r._sourceCompany || companyId;
      var rowPrinciples = principlesByCompany[rowCompany] || [];
      return "<tr" + trClass + "><th scope=\"row\">" + esc(r.situation) + srcSpan + "</th>" +
        "<td data-label=\"Under\">" + expandLp(r.under, rowPrinciples, rowCompany) + "</td>" +
        "<td data-label=\"Just Right\">" + expandLp(r.justRight, rowPrinciples, rowCompany) + "</td>" +
        "<td data-label=\"Over\">" + expandLp(r.over, rowPrinciples, rowCompany) + "</td></tr>";
    }).join("");
    var jump = principles.map(function (p) {
      var q = "?p=" + encodeURIComponent(p.slug) + (companyId === def ? "" : "&c=" + encodeURIComponent(companyId));
      var cur = p.slug === slug ? " class=\"is-current\"" : "";
      return "<li" + cur + "><a href=\"" + q + "\">" + esc(p.name) + "</a></li>";
    }).join("");
    var eyebrow = rec.group ? " · " + esc(groupLabel(rec.group)) : "";
    var whyHtml = "";
    if (teach && teach.why && teach.why.length) {
      whyHtml = "<section class=\"lps-section\" aria-labelledby=\"lps-why-title\">" +
        "<p class=\"kld-section-label\">Why it matters</p>" +
        "<h2 id=\"lps-why-title\">What this principle is for.</h2>" +
        teach.why.map(function (para) {
          return "<p>" + expandLp(para, principles, companyId) + "</p>";
        }).join("") +
        "</section>";
    }
    var calIntro = "";
    if (teach && teach.calibrationIntro) {
      calIntro = "<p class=\"lps-cal-intro\">" + expandLp(teach.calibrationIntro, principles, companyId) + "</p>";
    }
    var afterCal = "";
    if (teach && teach.examples && teach.examples.length) {
      afterCal += "<section class=\"lps-section\" aria-labelledby=\"lps-ex-title\">" +
        "<p class=\"kld-section-label\">Examples</p>" +
        "<h2 id=\"lps-ex-title\">What it looks like in the work.</h2>" +
        "<div class=\"lps-examples\">" +
        teach.examples.map(function (ex) {
          return "<article><h3>" + esc(ex.title) + "</h3><p>" +
            expandLp(ex.body, principles, companyId) + "</p></article>";
        }).join("") +
        "</div></section>";
    }
    if (teach && teach.looksLike && (teach.looksLike.individual || teach.looksLike.manager)) {
      var looks = "";
      if (teach.looksLike.individual) {
        looks += "<article><h3>Individual</h3><p>" +
          expandLp(teach.looksLike.individual, principles, companyId) + "</p></article>";
      }
      if (teach.looksLike.manager) {
        looks += "<article><h3>Manager</h3><p>" +
          expandLp(teach.looksLike.manager, principles, companyId) + "</p></article>";
      }
      afterCal += "<section class=\"lps-section\" aria-labelledby=\"lps-looks-title\">" +
        "<p class=\"kld-section-label\">In the role</p>" +
        "<h2 id=\"lps-looks-title\">Individual and manager.</h2>" +
        "<div class=\"lps-looks\">" + looks + "</div></section>";
    }
    if (teach && teach.deepen && teach.deepen.length) {
      afterCal += "<section class=\"lps-section\" aria-labelledby=\"lps-deep-title\">" +
        "<p class=\"kld-section-label\">Go deeper</p>" +
        "<h2 id=\"lps-deep-title\">Questions that make the principle concrete.</h2>" +
        "<ol class=\"lps-deepen\">" +
        teach.deepen.map(function (q) {
          return "<li>" + expandLp(q, principles, companyId) + "</li>";
        }).join("") +
        "</ol></section>";
    }
    if (teach && teach.blog && teach.blog.length) {
      afterCal += "<section class=\"lps-section\" aria-labelledby=\"lps-blog-title\">" +
        "<p class=\"kld-section-label\">From the blog</p>" +
        "<h2 id=\"lps-blog-title\">Writing that goes deeper.</h2>" +
        "<ul class=\"lps-blog\">" +
        teach.blog.map(function (item) {
          var note = item.note ? "<p>" + esc(item.note) + "</p>" : "";
          return "<li><a href=\"" + esc(item.url) + "\">" + esc(item.title) + "</a>" + note + "</li>";
        }).join("") +
        "</ul></section>";
    }
    if (teach && teach.related && teach.related.length) {
      afterCal += "<section class=\"lps-section\" aria-labelledby=\"lps-rel-title\">" +
        "<p class=\"kld-section-label\">Related</p>" +
        "<h2 id=\"lps-rel-title\">Principles that sit next to this one.</h2>" +
        "<ul class=\"lps-related\">" +
        teach.related.map(function (rel) {
          var relName = rel.id;
          principles.forEach(function (p) {
            if (p.slug === rel.id) relName = p.name;
          });
          var note = rel.note ? "<p>" + expandLp(rel.note, principles, companyId) + "</p>" : "";
          return "<li><a href=\"" + lpHref(companyId, rel.id) + "\">" + esc(relName) + "</a>" + note + "</li>";
        }).join("") +
        "</ul></section>";
    }
    root.innerHTML =
      "<p class=\"kld-eyebrow\"><a href=\"" + (listQ || "?") + "\">Porridge</a>" + eyebrow + "</p>" +
      "<h1>" + esc(rec.name) + "</h1>" +
      "<p>" + expandLp(rec.definition || "", principles, companyId) + "</p>" +
      "<nav class=\"lps-jump\" aria-label=\"All principles\"><ol>" + jump + "</ol></nav>" +
      whyHtml +
      "<section class=\"lps-section\" aria-labelledby=\"lps-cal-title\"><p class=\"kld-section-label\">Calibration</p>" +
      "<h2 id=\"lps-cal-title\">Under, just right, over.</h2>" +
      calIntro +
      "<div class=\"lps-table-wrap\"><table class=\"lps-table\"><thead><tr>" +
      "<th scope=\"col\">Situation</th><th scope=\"col\">Under</th><th scope=\"col\">Just Right</th><th scope=\"col\">Over</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div></section>" +
      afterCal;
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
          var turl = teachUrl(c, p);
          if (!turl) return renderSingle(bank, c, p, rec, null, facetsData, principleById, companyNames, recCache);
          return fetch(turl).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
            .then(function (teach) { renderSingle(bank, c, p, rec, teach, facetsData, principleById, companyNames, recCache); });
        });
      }).catch(function () { return showList(c); });
    }).catch(function (err) {
      root.innerHTML = "<p>Could not load the principle sets.</p>";
      console.error(err);
    });
  }
  boot();
})();
