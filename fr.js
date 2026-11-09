(function () {
  "use strict";

  var FIGARO = "https://leconjugueur.lefigaro.fr/conjugaison/verbe/";
  var $ = function (id) { return document.getElementById(id); };
  var statusEl = $("fr-status"), resultEl = $("fr-result"), q = $("fr-q");

  var TENSES = "PIJFCSTYGKW";
  var PRON = ["je", "tu", "il", "nous", "vous", "ils"];
  var REFL = ["me", "te", "se", "nous", "vous", "se"];
  var IMP_REFL = ["", "toi", "", "nous", "vous", ""];

  // Verbs that take être in compound tenses
  var ETRE = ("aller apparaître arriver débeller décéder devenir échoir entrer intervenir mourir naître naitre " +
    "partir parvenir provenir redevenir repartir rester resurvenir retomber revenir survenir tomber venir").split(" ");
  // Take être, or avoir when they have a direct object
  var DUAL = "descendre monter passer rentrer retourner sortir ressortir redescendre remonter repasser".split(" ");
  // Common verbs beginning with an aspirated h (no elision: je hais, not j'hais)
  var H_ASP = ("haïr hacher haleter hanter harceler harponner hasarder hâter hausser héler hennir hérisser " +
    "heurter hisser honnir hoqueter huer hululer hurler").split(" ");

  var verbs = null, byPlain = null, loading = null;

  function plain(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  function build() {
    verbs = {}; byPlain = {};
    window.FR_VERBS.split("|").forEach(function (row) {
      var p = row.split(" ");
      verbs[p[0]] = [parseInt(p[1], 10), parseInt(p[2], 36)];
      var k = plain(p[0]);
      (byPlain[k] = byPlain[k] || []).push(p[0]);
    });
  }

  function load() {
    if (verbs) return Promise.resolve();
    if (window.FR_VERBS) { build(); return Promise.resolve(); }
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "fr-verbs.js";
      s.onload = function () { build(); resolve(); };
      s.onerror = function () { loading = null; reject(new Error("load")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function forms(verb) {
    var v = verbs[verb];
    var stem = verb.slice(0, v[0]);
    var tpl = window.FR_MODELS[v[1]].split(";");
    var out = {};
    for (var i = 0; i < TENSES.length; i++) {
      out[TENSES[i]] = tpl[i] ? tpl[i].split(",").map(function (e) { return e === "-" ? null : stem + e; }) : [];
    }
    return out;
  }

  function vowelStart(w, verb) {
    if (/^h/.test(w)) return H_ASP.indexOf(verb) < 0;
    return /^[aeiouyàâäéèêëîïôöûùüœæ]/.test(w);
  }
  // join a word that may elide (je, me, te, se, que) with the next word
  function join(a, b, verb) {
    if (/^(je|me|te|se|que)$/.test(a.split(" ").pop()) && vowelStart(b, verb)) return a.slice(0, -1) + "’" + b;
    return a + " " + b;
  }

  function agree(K, plural) {
    var m = K[0], f = K[2] || m + "e", mp = K[1] || m + "s", fp = K[3] || f + "s";
    if (!plural) return f.indexOf(m) === 0 && f !== m ? m + "(" + f.slice(m.length) + ")" : m;
    if (mp === m + "s" && fp === m + "es") return m + "(e)s";
    if (fp.indexOf(mp) === 0 && fp !== mp) return mp + "(" + fp.slice(mp.length) + ")";
    return mp;
  }

  function conjugate(verb, refl) {
    var F = forms(verb);
    var A = forms("avoir"), E = forms("être");
    var auxIsEtre = refl || ETRE.indexOf(verb) >= 0 || DUAL.indexOf(verb) >= 0;
    var X = auxIsEtre ? E : A;
    var K = F.K;
    var hasPP = K && K[0];

    function pp(i) { return auxIsEtre ? agree(K, i >= 3) : K[0]; }

    function simple(t, subj) {
      return (F[t] || []).map(function (f, i) {
        if (!f) return null;
        var s = refl ? join(PRON[i], join(REFL[i], f, verb), verb) : join(PRON[i], f, verb);
        return subj ? join("que", s, "") : s;
      });
    }
    function compound(auxT, base, subj) {
      if (!hasPP) return [];
      return (F[base] || []).map(function (f, i) {
        if (!f) return null;
        var aux = X[auxT][i];
        var s = refl ? join(PRON[i], join(REFL[i], aux, "être"), "être") : join(PRON[i], aux, "avoir");
        s += " " + pp(i);
        return subj ? join("que", s, "") : s;
      });
    }
    function imperative() {
      return (F.Y || []).map(function (f, i) {
        if (!f) return null;
        return refl ? f + "-" + IMP_REFL[i] : f;
      });
    }
    function impPast() {
      if (refl || !hasPP) return [];
      var aux = auxIsEtre ? [0, "sois", 0, "soyons", "soyez", 0] : [0, "aie", 0, "ayons", "ayez", 0];
      return (F.Y || []).map(function (f, i) { return f && aux[i] ? aux[i] + " " + pp(i) : null; });
    }
    var se = function (w) { return refl ? join("se", w, verb) : w; };
    var inf = refl ? join("se", verb, verb) : verb;
    var auxInf = auxIsEtre ? "être" : "avoir";
    var auxPart = auxIsEtre ? "étant" : "ayant";
    var ppAll = hasPP ? (auxIsEtre ? K[0] + "(e)(s)" : K[0]) : "";

    var pastPart = hasPP ? [K[0], K[2], K[1], K[3]].filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join(", ") : "";

    return {
      inf: inf, auxIsEtre: auxIsEtre, dual: !refl && DUAL.indexOf(verb) >= 0,
      group: verb === "être" || verb === "avoir" ? "auxiliaire" : verb === "aller" ? "3e groupe" :
        /er$/.test(verb) ? "1er groupe" : /ir$/.test(verb) && F.G[0] && /issant$/.test(F.G[0]) ? "2e groupe" : "3e groupe",
      pp: pastPart, ppr: F.G[0] || "",
      modes: [
        ["Indicatif", [
          ["Présent", simple("P")], ["Passé composé", compound("P", "P")],
          ["Imparfait", simple("I")], ["Plus-que-parfait", compound("I", "I")],
          ["Passé simple", simple("J")], ["Passé antérieur", compound("J", "J")],
          ["Futur simple", simple("F")], ["Futur antérieur", compound("F", "F")]
        ]],
        ["Subjonctif", [
          ["Présent", simple("S", true)], ["Passé", compound("S", "S", true)],
          ["Imparfait", simple("T", true)], ["Plus-que-parfait", compound("T", "T", true)]
        ]],
        ["Conditionnel", [
          ["Présent", simple("C")], ["Passé", compound("C", "C")]
        ]],
        ["Impératif", [
          ["Présent", imperative()], ["Passé", impPast()]
        ]],
        ["Participe", [
          ["Présent", F.G[0] ? [se(F.G[0])] : []],
          ["Passé", hasPP ? [pastPart, (refl ? "s’étant " : auxPart + " ") + ppAll] : []]
        ]],
        ["Infinitif", [
          ["Présent", [inf]],
          ["Passé", hasPP ? [(refl ? "s’être " : auxInf + " ") + ppAll] : []]
        ]],
        ["Gérondif", [
          ["Présent", F.G[0] ? ["en " + se(F.G[0])] : []],
          ["Passé", hasPP ? ["en " + (refl ? "s’étant " : auxPart + " ") + ppAll] : []]
        ]]
      ]
    };
  }

  function render(verb, refl) {
    var c = conjugate(verb, refl);
    var html = '<div class="word">' + esc(c.inf) + "</div>";
    html += '<div class="meta">' + esc(c.group) + " &nbsp; · &nbsp; auxiliaire " + (c.auxIsEtre ? "être" : "avoir") +
      (c.ppr ? " &nbsp; · &nbsp; " + esc(c.ppr) : "") + (c.pp ? ", " + esc(c.pp.split(", ")[0]) : "") + "</div>";
    if (c.dual) html += '<p class="note">Takes <i>avoir</i> when it has a direct object (e.g. <i>j’ai ' + esc(forms(verb).K[0]) + " la valise</i>).</p>";

    c.modes.forEach(function (m) {
      var tenses = m[1].filter(function (t) { return t[1] && t[1].some(Boolean); });
      if (!tenses.length) return;
      html += "<section><h2>" + m[0] + '</h2><div class="tenses">';
      tenses.forEach(function (t) {
        html += '<div class="tense"><h3>' + t[0] + "</h3><ul>" +
          t[1].filter(Boolean).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul></div>";
      });
      html += "</div></section>";
    });
    html += '<p class="note"><a href="' + FIGARO + encodeURIComponent(plain(verb)) + '.html" target="_blank" rel="noopener">See this verb on Le Conjugueur (Le Figaro)</a></p>';
    resultEl.innerHTML = html;
  }

  function suggest(word) {
    var p = plain(word), out = [];
    Object.keys(byPlain).forEach(function (k) { if (k.indexOf(p) === 0 && out.length < 40) out = out.concat(byPlain[k]); });
    out.sort(function (a, b) { return a.length - b.length; });
    return out.slice(0, 10);
  }

  function search(input) {
    var raw = String(input || "").trim().toLowerCase().replace(/['’]/g, "’").replace(/\s+/g, " ");
    resultEl.innerHTML = "";
    q.value = raw.replace(/’/g, "'");
    if (!raw) { statusEl.innerHTML = ""; return; }
    var refl = false, verb = raw;
    var m = raw.match(/^(se |s’)(.+)$/);
    if (m) { refl = true; verb = m[2]; }
    statusEl.textContent = "Loading verbs…";
    load().then(function () {
      if (!verbs[verb]) {
        var alt = byPlain[plain(verb)];
        if (alt && alt.length === 1) verb = alt[0];
      }
      if (!verbs[verb]) {
        var s = suggest(verb);
        statusEl.innerHTML = "“" + esc(verb) + "” isn’t in the verb list. Type the infinitive, e.g. <i>parler</i>, <i>finir</i>, <i>se lever</i>." +
          (s.length ? '<div class="suggest">' + s.map(function (w) {
            return '<button type="button" data-w="' + esc(w) + '">' + esc(w) + "</button>";
          }).join("") + "</div>" : "");
        return;
      }
      statusEl.innerHTML = "";
      render(verb, refl);
    }).catch(function () {
      statusEl.textContent = "Couldn’t load the verb list. Check your connection and try again.";
    });
  }

  function go(w) {
    var h = "#fr/" + encodeURIComponent(w);
    if (location.hash === h) search(w); else location.hash = h;
  }

  $("fr-search").addEventListener("submit", function (e) { e.preventDefault(); go(q.value.trim().toLowerCase()); });
  statusEl.addEventListener("click", function (e) {
    var w = e.target.getAttribute && e.target.getAttribute("data-w");
    if (w) go(w);
  });

  window.FR = {
    show: function (w) {
      if (w) search(w); else { resultEl.innerHTML = ""; statusEl.innerHTML = ""; q.value = ""; load(); }
    },
    _conjugate: function (v, r) { return load().then(function () { return conjugate(v, r); }); }
  };
})();
