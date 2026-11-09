// Tab router. Addresses: #en/word, #fr/verb, #ipa (old #word links open the English tab)
(function () {
  "use strict";
  var tabs = ["en", "fr", "ipa"];

  function route() {
    var h = decodeURIComponent(location.hash.slice(1));
    var tab = "en", arg = "";
    var m = h.match(/^(en|fr|ipa)(?:\/(.*))?$/);
    if (m) { tab = m[1]; arg = m[2] || ""; }
    else if (h) { arg = h; }

    tabs.forEach(function (t) {
      document.getElementById("panel-" + t).hidden = t !== tab;
      var a = document.querySelector('[data-tab="' + t + '"]');
      a.classList.toggle("on", t === tab);
      a.setAttribute("aria-selected", t === tab ? "true" : "false");
    });

    if (tab === "en") window.EN.show(arg);
    if (tab === "fr") window.FR.show(arg);
  }

  window.addEventListener("hashchange", function () { route(); window.scrollTo(0, 0); });
  route();
})();
