(function () {
  var cfg = window.PORRIDGE || {};
  var INDEX = cfg.principlesIndex || "https://cdn.jsdelivr.net/gh/kindel/principles@main/data/index.json";
  var RECORD = cfg.principlesRecord || "https://cdn.jsdelivr.net/gh/kindel/principles@main/data/{company}/{slug}.json";
  var FACETS = cfg.facetsJson || "https://cdn.jsdelivr.net/gh/kindel/principles@main/data/facets.json";
  var TEACH = cfg.teaching || "https://cdn.jsdelivr.net/gh/kindel/principles@main/data/teaching/amazon/{slug}.json";
  var TENSION_URL = "https://blog.kindel.com/2019/05/16/the-tension-is-intentional/";
  // Same sentences as content/porridge/_index.md. The Hugo page reads those
  // params. This standalone page has no Hugo, so the strings live here too.
  var UI = cfg.ui || {
    heading: "These are universal leadership principles that work for any company.",
    intro: "Pick a principle. You get a deep dive you can learn from.",
    companyPrompt: "Or view a company's principles:",
    companyPlaceholder: "Choose a company",
    backLabel: "Back to the universal principles",
    cardCta: "Learn how to live it »"
  };
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
    // Default pattern is the Amazon path. A company with its own teaching
    // directory uses that directory. A pattern with no company slot and no
    // Amazon directory is left alone, so a custom URL is not guessed.
    if (!company || !slug) return "";
    if (TEACH.indexOf("{company}") !== -1) {
      return TEACH.replace("{company}", company).replace("{slug}", slug);
    }
    if (company === "amazon") return TEACH.replace("{slug}", slug);
    var swapped = TEACH.replace("/teaching/amazon/", "/teaching/" + company + "/");
    if (swapped === TEACH) return "";
    return swapped.replace("{slug}", slug);
  }
  // Emphasis only. Escape first so the preamble cannot inject markup.
  function inlineMd(md) {
    var s = esc(md || "");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return s;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  // Root domain under a Further reading note: last two hostname labels.
  // Fine for this data. A multi-part public suffix (co.uk, com.au) would
  // need a real suffix list; none of these hosts have one.
  function readingHost(url) {
    var host = "";
    try { host = new URL(url).hostname; }
    catch (e) { return ""; }
    var parts = host.split(".");
    if (parts.length >= 2) host = parts.slice(-2).join(".");
    return host;
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
    var opts = "<option value=\"\">" + esc(UI.companyPlaceholder) + "</option>" +
      companies.filter(function (c) { return c.id !== def; }).map(function (c) {
        return "<option value=\"" + esc(c.id) + "\"" + (c.id === companyId ? " selected" : "") + ">" + esc(c.name) + "</option>";
      }).join("");
    var setTitle = (companyId === def ? "" : esc(co.name) + " ") + esc(co.set) + ", in teaching order.";
    var back = companyId === def ? "" :
      "<p class=\"lps-back\"><a href=\"?\">" + esc(UI.backLabel) + "</a></p>";
    var cards = (co.principles || []).map(function (p) {
      var q = companyId === def ? "" : ("?c=" + encodeURIComponent(companyId) + "&p=" + encodeURIComponent(p.slug));
      if (companyId === def) q = "?p=" + encodeURIComponent(p.slug);
      var group = p.group ? "<p class=\"lps-card-group\">" + esc(groupLabel(p.group)) + "</p>" : "";
      return "<li><a class=\"lps-card\" href=\"" + q + "\"><span class=\"lps-card-num\">" + esc(p.sort) + "</span>" +
        group + "<h3>" + esc(p.name) + "</h3><p>" + esc(p.definition || "") + "</p><p class=\"lps-card-go\">" + esc(UI.cardCta) + "</p></a></li>";
    }).join("");
    root.innerHTML =
      "<section class=\"lps-intro\">" +
      "<p class=\"kld-section-label\">How to use it</p>" +
      "<h2>" + esc(UI.heading) + "</h2>" +
      "<p>" + esc(UI.intro) + "</p>" +
      "</section>" +
      "<section class=\"lps-or\">" +
      "<label class=\"lps-or-label\" for=\"lps-company\">" + esc(UI.companyPrompt) + "</label>" +
      "<select id=\"lps-company\" class=\"lps-select\" data-default=\"" + esc(def) + "\">" + opts + "</select>" +
      "</section>" +
      "<section class=\"lps-index\">" +
      back +
      "<p class=\"kld-section-label\">The set</p>" +
      "<h2>" + setTitle + "</h2>" +
      (co.preamble ? "<div class=\"lps-preamble\"><p>" + inlineMd(co.preamble) + "</p></div>" : "") +
      "<ol class=\"lps-card-list\">" + cards + "</ol></section>" +
      "<p class=\"lps-add-note\">To add another company's set, <a href=\"https://github.com/kindel/principles/issues/new\">open an issue on kindel/principles</a>.</p>";
    var companySel = document.getElementById("lps-company");
    if (companyId === def) companySel.value = "";
    companySel.addEventListener("change", function () {
      var id = this.value || def;
      setParams({ c: id === def ? "" : id, p: "" });
      renderList(bank, id);
    });
  }

  function renderSingle(bank, companyId, slug, rec, teach, facetsData) {
    var companies = bank.companies || [];
    var def = companies[0] && companies[0].id;
    var co = companies.filter(function (c) { return c.id === companyId; })[0] || companies[0];
    var listQ = companyId === def ? "" : ("?c=" + encodeURIComponent(companyId));
    var thisPrincipleEntry = null;
    (co.principles || []).forEach(function (p) {
      if (p.slug === slug) thisPrincipleEntry = p;
    });
    var thisFacets = (thisPrincipleEntry && thisPrincipleEntry.facets) || [];
    var facetMap = {};
    (facetsData.facets || []).forEach(function (f) { facetMap[f.id] = f; });
    var seenKeys = {};
    var mergedRows = [];
    thisFacets.forEach(function (facetId) {
      var facet = facetMap[facetId];
      if (!facet) return;
      (facet.rows || []).forEach(function (ref) {
        if (!(ref.under && ref.principle == null)) return;
        var gkey = "generated:" + facetId + ":" + ref.id;
        if (seenKeys[gkey]) return;
        seenKeys[gkey] = true;
        mergedRows.push(ref);
      });
    });
    var principles = co.principles || [];
    var rows = mergedRows.map(function (r) {
      return "<tr><th scope=\"row\">" + esc(r.situation) + "</th>" +
        "<td data-label=\"Under\">" + expandLp(r.under, principles, companyId) + "</td>" +
        "<td data-label=\"Just Right\">" + expandLp(r.justRight, principles, companyId) + "</td>" +
        "<td data-label=\"Over\">" + expandLp(r.over, principles, companyId) + "</td></tr>";
    }).join("");
    // No generated rows: say so, never an empty table. Valid principles data
    // never hits this branch. The principles check requires generated rows,
    // and the Hugo build fails for a known principle that has none. This
    // sentence is the fallback for a bad or older payload. SCHEMA.md forbids
    // falling back to the record's human rows or the facet's refs.
    var calBody;
    if (mergedRows.length) {
      calBody = "<div class=\"lps-table-wrap\"><table class=\"lps-table\"><thead><tr>" +
        "<th scope=\"col\">Situation</th><th scope=\"col\">Under</th><th scope=\"col\">Just Right</th><th scope=\"col\">Over</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>";
    } else {
      var why = thisFacets.length
        ? "The calibration table for " + esc(rec.name) + " has not been generated yet."
        : "Porridge builds its tables from facets, behaviors that line up across companies' sets. " +
          esc(rec.name) + " is not mapped to a facet yet, so there is no table for it.";
      var src = /^https?:/.test(co.source || "")
        ? " Read it in <a href=\"" + esc(co.source) + "\">" + esc(co.name) + "'s own words</a>."
        : "";
      calBody = "<p class=\"lps-cal-empty\">" + why + src + "</p>";
    }
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
        "<p class=\"kld-section-label\">Further reading</p>" +
        "<h2 id=\"lps-blog-title\">Sources and essays on this principle.</h2>" +
        "<ul class=\"lps-blog\">" +
        teach.blog.map(function (item) {
          var note = item.note ? "<p>" + esc(item.note) + "</p>" : "";
          var host = readingHost(item.url);
          var domain = host ? "<p class=\"lps-blog-domain\">" + esc(host) + "</p>" : "";
          return "<li><a href=\"" + esc(item.url) + "\">" + esc(item.title) + "</a>" + note + domain + "</li>";
        }).join("") +
        "</ul></section>";
    }
    if (teach && teach.related && teach.related.length) {
      afterCal += "<section class=\"lps-section\" aria-labelledby=\"lps-rel-title\">" +
        "<p class=\"kld-section-label\">Related</p>" +
        "<h2 id=\"lps-rel-title\">Principles that sit next to this one.</h2>" +
        "<p class=\"lps-rel-intro\">Principles lean on each other, and some pull against each other on purpose " +
        "(<a href=\"" + TENSION_URL + "\">the tension is intentional</a>). " +
        "Here is how " + esc(rec.name) + " connects to the rest of the set.</p>" +
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
    var back = companyId === def ? "" :
      "<p class=\"lps-back\"><a href=\"?\">" + esc(UI.backLabel) + "</a></p>";
    root.innerHTML =
      "<p class=\"kld-eyebrow\"><a href=\"" + (listQ || "?") + "\">Porridge</a>" + eyebrow + "</p>" +
      back +
      "<h1>" + esc(rec.name) + "</h1>" +
      "<p>" + expandLp(rec.definition || "", principles, companyId) + "</p>" +
      "<nav class=\"lps-jump\" aria-label=\"All principles\"><ol>" + jump + "</ol></nav>" +
      whyHtml +
      "<section class=\"lps-section\" aria-labelledby=\"lps-cal-title\"><p class=\"kld-section-label\">Calibration</p>" +
      "<h2 id=\"lps-cal-title\">Under, just right, over.</h2>" +
      calIntro +
      calBody + "</section>" +
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
      return fetch(recUrl(c, p)).then(function (r) {
        if (!r.ok) throw new Error("missing record");
        return r.json();
      }).then(function (rec) {
        var turl = teachUrl(c, p);
        if (!turl) return renderSingle(bank, c, p, rec, null, facetsData);
        return fetch(turl).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
          .then(function (teach) { renderSingle(bank, c, p, rec, teach, facetsData); });
      }).catch(function () { return showList(c); });
    }).catch(function (err) {
      root.innerHTML = "<p>Could not load the principle sets.</p>";
      console.error(err);
    });
  }
  boot();
})();
