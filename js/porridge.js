(function () {
  // Company tiles on the Hugo list page. One tile is always checked. The
  // universal tile (data-default) clears ?c= and shows the universal set.
  var group = document.getElementById("lps-company");
  if (!group) return;
  var fallback = group.getAttribute("data-default") || "";
  var tiles = Array.prototype.slice.call(group.querySelectorAll("[data-company]"));

  function kld(name, params) {
    if (typeof window.kldTrack !== "function") return;
    window.kldTrack(name, params);
  }

  function known(id) {
    if (!id) return false;
    return tiles.some(function (t) { return t.getAttribute("data-company") === id; });
  }

  function fromUrl() {
    try {
      var c = new URL(window.location.href).searchParams.get("c") || "";
      if (c && known(c)) return c;
    } catch (e) {}
    return fallback;
  }

  function apply(id) {
    if (!known(id)) id = fallback;
    var sets = document.querySelectorAll("[data-company-set]");
    for (var i = 0; i < sets.length; i++) {
      sets[i].hidden = sets[i].getAttribute("data-company-set") !== id;
    }
    tiles.forEach(function (t) {
      var on = t.getAttribute("data-company") === id;
      t.setAttribute("aria-checked", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    try {
      var u = new URL(window.location.href);
      if (id === fallback) u.searchParams.delete("c");
      else u.searchParams.set("c", id);
      window.history.replaceState({}, "", u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  function choose(next) {
    if (!known(next)) next = fallback;
    var prev = current;
    apply(next);
    if (next && next !== prev) {
      kld("kld_company", {
        app: "porridge",
        company: next,
        previous_company: prev,
        source: "picker"
      });
    }
    current = next;
  }

  kld("app_view", { app: "porridge" });
  var current = fromUrl();
  apply(current);
  if (current) kld("kld_company", { app: "porridge", company: current, source: "url" });

  tiles.forEach(function (t, i) {
    t.addEventListener("click", function () {
      choose(t.getAttribute("data-company"));
    });
    // Radio group keys: arrows move and select, Home and End jump.
    t.addEventListener("keydown", function (e) {
      var n = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % tiles.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + tiles.length) % tiles.length;
      else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = tiles.length - 1;
      if (n < 0) return;
      e.preventDefault();
      tiles[n].focus();
      choose(tiles[n].getAttribute("data-company"));
    });
  });
})();
