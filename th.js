(function () {
  "use strict";

  var API = "https://www.dictionaryapi.com/api/v3/references/thesaurus/json/";
  var MW_PAGE = "https://www.merriam-webster.com/thesaurus/";
  var $ = function (id) { return document.getElementById(id); };
  var statusEl = $("th-status"), resultEl = $("th-result"), q = $("th-q");
  var U = window.MW_UTIL;

  var LISTS = [
    ["syn_list", "Synonyms"],
    ["sim_list", "Synonyms and similar words"],
    ["rel_list", "Related words"],
    ["phrase_list", "Phrases"],
    ["near_list", "Near antonyms", 1],
    ["opp_list", "Antonyms and near antonyms", 1],
    ["ant_list", "Antonyms", 1]
  ];

  function getKey() {
    if (window.MW_THES_KEY) return window.MW_THES_KEY;
    try { return localStorage.getItem("mw_thes_key") || ""; } catch (e) { return ""; }
  }
  function showKeyBox(show) { $("th-keybox").hidden = !show; }

  $("th-keyform").addEventListener("submit", function (e) {
    e.preventDefault();
    var k = $("th-key").value.trim();
    if (!k) return;
    try { localStorage.setItem("mw_thes_key", k); } catch (err) {}
    showKeyBox(false);
    if (q.value.trim()) search(q.value);
  });

  function showAnts() {
    try { return localStorage.getItem("th_ants") === "1"; } catch (e) { return false; }
  }
  function applyAnts() { resultEl.classList.toggle("show-ants", showAnts()); }
  resultEl.addEventListener("change", function (e) {
    if (e.target.id !== "th-ants") return;
    try { localStorage.setItem("th_ants", e.target.checked ? "1" : "0"); } catch (err) {}
    applyAnts();
  });

  function base(id) { return String(id || "").split(":")[0].toLowerCase(); }
  function clean(hw) { return String(hw || "").replace(/\*/g, ""); }
  function wordLink(w) {
    return '<a href="#th/' + encodeURIComponent(w.toLowerCase()) + '">' + U.esc(w) + "</a>";
  }
  function words(groups) {
    // groups: [[{wd: "..."}, ...], ...]; each inner group is a cluster of similar words
    var out = [];
    (groups || []).forEach(function (g) { (g || []).forEach(function (w) { if (w && w.wd && out.indexOf(w.wd) < 0) out.push(w.wd); }); });
    return out;
  }

  function senses(entry) {
    var list = [];
    (entry.def || []).forEach(function (d) {
      (d.sseq || []).forEach(function (seq) {
        seq.forEach(function (item) {
          if (item[0] === "sense") list.push(item[1]);
          else if (item[0] === "pseq") (item[1] || []).forEach(function (p) { if (p[0] === "sense") list.push(p[1]); });
        });
      });
    });
    return list;
  }

  function render(word, data) {
    var entries = data.filter(function (e) { return e && e.meta; });
    var exact = entries.filter(function (e) { return base(e.meta.id) === word; });
    var main = exact.length ? exact : entries.filter(function (e) { return (e.meta.stems || []).indexOf(word) >= 0; }).slice(0, 2);
    if (!main.length) main = entries.slice(0, 1);
    if (!main.length) return false;

    var html = '<div class="word">' + U.esc(clean(main[0].hwi && main[0].hwi.hw) || word) + "</div>";
    if (base(main[0].meta.id) !== word) html += '<p class="note">Showing results for <i>' + U.esc(base(main[0].meta.id)) + "</i>.</p>";

    main.forEach(function (e) {
      html += "<section><h2>" + U.esc(e.fl || "") + "</h2>";
      var ss = senses(e);
      if (!ss.length) {
        // fall back to the short lists in meta
        (e.shortdef || []).forEach(function (d, i) {
          html += '<div class="sense"><p class="def">' + (e.shortdef.length > 1 ? (i + 1) + ". " : "") + U.esc(d) + "</p>";
          var syn = (e.meta.syns || [])[i] || [], ant = (e.meta.ants || [])[i] || [];
          if (syn.length) html += '<p class="lbl">Synonyms</p><p class="wl">' + syn.map(wordLink).join(", ") + "</p>";
          if (ant.length) html += '<div class="ant"><p class="lbl">Antonyms</p><p class="wl">' + ant.map(wordLink).join(", ") + "</p></div>";
          html += "</div>";
        });
      }
      ss.forEach(function (s, i) {
        var def = "", ex = "";
        (s.dt || []).forEach(function (d) {
          if (d[0] === "text") def += U.mwText(d[1]);
          if (d[0] === "vis" && !ex) ex = U.mwText((d[1][0] || {}).t || "");
        });
        html += '<div class="sense"><p class="def">' + (ss.length > 1 ? (s.sn || i + 1) + ". " : "") + (def || U.esc((e.shortdef || [])[i] || "")) + "</p>";
        if (ex) html += '<p class="ex">' + ex + "</p>";
        LISTS.forEach(function (L) {
          var w = words(s[L[0]]);
          if (w.length) html += (L[2] ? '<div class="ant">' : "<div>") + '<p class="lbl">' + L[1] + '</p><p class="wl">' + w.map(wordLink).join(", ") + "</p></div>";
        });
        html += "</div>";
      });
      html += "</section>";
    });
    html += '<label class="toggle"><input type="checkbox" id="th-ants"' + (showAnts() ? " checked" : "") + '> Show antonyms</label>';
    html += '<p class="note"><a href="' + MW_PAGE + encodeURIComponent(word) + '" target="_blank" rel="noopener">Full entry at Merriam-Webster Thesaurus</a></p>';
    resultEl.innerHTML = html;
    applyAnts();
    return true;
  }

  var current = 0;
  function search(word) {
    word = String(word || "").trim().toLowerCase();
    resultEl.innerHTML = "";
    q.value = word;
    if (!word) { statusEl.innerHTML = ""; return; }
    if (!getKey()) { showKeyBox(true); statusEl.innerHTML = ""; return; }
    var id = ++current;
    statusEl.textContent = "Looking up “" + word + "”…";
    fetch(API + encodeURIComponent(word) + "?key=" + encodeURIComponent(getKey()))
      .then(function (r) { return r.text(); })
      .then(function (t) {
        if (id !== current) return;
        var data;
        try { data = JSON.parse(t); } catch (e) {
          statusEl.textContent = "Merriam-Webster didn’t accept the thesaurus key. Check that it is a Collegiate Thesaurus key.";
          showKeyBox(true);
          return;
        }
        if (!Array.isArray(data) || !data.length) { statusEl.textContent = "No thesaurus entry for “" + word + "”."; return; }
        if (typeof data[0] === "string") {
          statusEl.innerHTML = "No thesaurus entry for “" + U.esc(word) + "”. Did you mean:" +
            '<div class="suggest">' + data.slice(0, 8).map(function (s) {
              return '<button type="button" data-w="' + U.esc(s) + '">' + U.esc(s) + "</button>";
            }).join("") + "</div>";
          return;
        }
        statusEl.innerHTML = "";
        if (!render(word, data)) statusEl.textContent = "No thesaurus entry for “" + word + "”.";
      })
      .catch(function () {
        if (id !== current) return;
        statusEl.textContent = "Couldn’t reach Merriam-Webster. Check your connection and try again.";
      });
  }

  function go(w) {
    var h = "#th/" + encodeURIComponent(w);
    if (location.hash === h) search(w); else location.hash = h;
  }
  $("th-search").addEventListener("submit", function (e) { e.preventDefault(); go(q.value.trim().toLowerCase()); });
  statusEl.addEventListener("click", function (e) {
    var w = e.target.getAttribute && e.target.getAttribute("data-w");
    if (w) go(w.toLowerCase());
  });
  $("th-resetkey").addEventListener("click", function (e) {
    e.preventDefault();
    try { localStorage.removeItem("mw_thes_key"); } catch (err) {}
    $("th-key").value = "";
    showKeyBox(true);
  });

  window.TH = {
    show: function (w) {
      if (!getKey()) showKeyBox(true);
      if (w) search(w); else { resultEl.innerHTML = ""; statusEl.innerHTML = ""; q.value = ""; }
    }
  };
})();
