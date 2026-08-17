(function () {
  var sel = document.getElementById("lps-company");

  function defaultId() {
    return (sel && sel.options.length && sel.options[0].value) || "amazon";
  }

  function known(id) {
    return !!(sel && sel.querySelector('option[value="' + id + '"]'));
  }

  function fromUrl() {
    try {
      var c = new URL(window.location.href).searchParams.get("c") || "";
      if (c && known(c)) return c;
    } catch (e) {}
    return defaultId();
  }

  function apply(id) {
    if (!known(id)) id = defaultId();
    var sets = document.querySelectorAll("[data-company-set]");
    for (var i = 0; i < sets.length; i++) {
      sets[i].hidden = sets[i].getAttribute("data-company-set") !== id;
    }
    if (sel) sel.value = id;
    try {
      var u = new URL(window.location.href);
      if (id === defaultId()) u.searchParams.delete("c");
      else u.searchParams.set("c", id);
      window.history.replaceState({}, "", u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  apply(fromUrl());
  if (sel) {
    sel.addEventListener("change", function () {
      apply(this.value);
    });
  }
})();
