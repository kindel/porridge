(function () {
  var sel = document.getElementById("lps-company");
  if (!sel) return;
  var fallback = sel.getAttribute("data-default") || "";

  function kld(name, params) {
    if (typeof window.kldTrack !== "function") return;
    window.kldTrack(name, params);
  }

  function known(id) {
    if (!id) return false;
    if (id === fallback) return true;
    return !!sel.querySelector('option[value="' + id + '"]');
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
    sel.value = id === fallback ? "" : id;
    try {
      var u = new URL(window.location.href);
      if (id === fallback) u.searchParams.delete("c");
      else u.searchParams.set("c", id);
      window.history.replaceState({}, "", u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  kld("app_view", { app: "porridge" });
  var current = fromUrl();
  apply(current);
  if (current) kld("kld_company", { app: "porridge", company: current, source: "url" });
  sel.addEventListener("change", function () {
    var next = this.value || fallback;
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
  });
})();
