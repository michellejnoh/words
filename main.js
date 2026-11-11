// Tab router. Addresses: #en/word, #fr/verb, #ipa (old #word links open the English tab)
(function () {
  "use strict";
  var tabs = ["en", "fr", "ipa"];
  var panels = ["en", "th", "fr", "ipa"];

  function route() {
    var h = decodeURIComponent(location.hash.slice(1));
    var tab = "en", arg = "";
    var m = h.match(/^(en|th|fr|ipa)(?:\/(.*))?$/);
    if (m) { tab = m[1]; arg = m[2] || ""; }
    else if (h) { arg = h; }

    panels.forEach(function (p) { document.getElementById("panel-" + p).hidden = p !== tab; });
    var top = tab === "th" ? "en" : tab;
    tabs.forEach(function (t) {
      var a = document.querySelector('[data-tab="' + t + '"]');
      a.classList.toggle("on", t === top);
      a.setAttribute("aria-selected", t === top ? "true" : "false");
    });
    // switching between dictionary and thesaurus keeps the word
    if (tab === "en" || tab === "th") {
      document.querySelectorAll(".subtabs a").forEach(function (a) {
        a.href = "#" + a.getAttribute("data-sub") + (arg ? "/" + encodeURIComponent(arg) : "");
      });
      document.querySelector('[data-tab="en"]').href = "#" + tab + (arg ? "/" + encodeURIComponent(arg) : "");
    }

    if (tab === "en") window.EN.show(arg);
    if (tab === "th") window.TH.show(arg);
    if (tab === "fr") window.FR.show(arg);
  }

  window.addEventListener("hashchange", function () { route(); window.scrollTo(0, 0); });
  route();
})();
