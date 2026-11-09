(function () {
  "use strict";

  var API = "https://www.dictionaryapi.com/api/v3/references/collegiate/json/";
  var MW_PAGE = "https://www.merriam-webster.com/dictionary/";
  var M = window.MORPHEMES;
  var WORDS = window.WORDS || new Set();

  var $ = function (id) { return document.getElementById(id); };
  var statusEl = $("status"), resultEl = $("result"), q = $("q");

  /* ---------- API key ---------- */
  function getKey() {
    if (window.MW_KEY) return window.MW_KEY;
    try { return localStorage.getItem("mw_key") || ""; } catch (e) { return ""; }
  }
  function showKeyBox(show) { $("keybox").hidden = !show; }

  $("keyform").addEventListener("submit", function (e) {
    e.preventDefault();
    var k = $("key").value.trim();
    if (!k) return;
    try { localStorage.setItem("mw_key", k); } catch (err) {}
    showKeyBox(false);
    route();
  });
  $("resetkey").addEventListener("click", function (e) {
    e.preventDefault();
    try { localStorage.removeItem("mw_key"); } catch (err) {}
    $("key").value = "";
    showKeyBox(true);
  });

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function base(id) { return String(id || "").split(":")[0].toLowerCase(); }
  function clean(hw) { return String(hw || "").replace(/\*/g, ""); }
  function syll(hw) { return String(hw || "").replace(/\*/g, "·"); }
  function link(w, label) {
    w = base(w);
    return '<a href="#' + encodeURIComponent(w) + '">' + esc(label || w) + "</a>";
  }

  // Render Merriam-Webster markup tokens as HTML
  function mwText(s) {
    s = esc(s);
    s = s.replace(/\{ma\}[\s\S]*?\{\/ma\}/g, "");
    s = s.replace(/\{(et_link|d_link|mat|a_link|i_link|dxt)\|([^|}]*)\|?([^|}]*)?\|?[^}]*\}/g,
      function (_, t, a) { return link(a); });
    s = s.replace(/\{sx\|([^|}]*)\|[^}]*\}/g, function (_, a) { return '<span class="sc">' + link(a) + "</span>"; });
    s = s.replace(/\{(it|qword|wi)\}/g, "<i>").replace(/\{\/(it|qword|wi)\}/g, "</i>");
    s = s.replace(/\{b\}/g, "<b>").replace(/\{\/b\}/g, "</b>");
    s = s.replace(/\{sc\}/g, '<span class="sc">').replace(/\{\/sc\}/g, "</span>");
    s = s.replace(/\{inf\}/g, "<sub>").replace(/\{\/inf\}/g, "</sub>");
    s = s.replace(/\{sup\}/g, "<sup>").replace(/\{\/sup\}/g, "</sup>");
    s = s.replace(/\{ldquo\}/g, "“").replace(/\{rdquo\}/g, "”");
    s = s.replace(/\{bc\}/g, "").replace(/\{p_br\}/g, "<br>");
    s = s.replace(/\{dx_ety\}/g, " — ").replace(/\{\/dx_ety\}/g, "");
    s = s.replace(/\{ds\|[^}]*\}/g, "");
    s = s.replace(/\{[^}]*\}/g, "");
    return s.trim();
  }

  function etParts(et) {
    // et is an array like [["text", "..."], ["et_snote", [["t", "..."]]]]
    var out = [];
    (et || []).forEach(function (p) {
      if (p[0] === "text") out.push(p[1]);
      else if (p[0] === "et_snote") (p[1] || []).forEach(function (n) { if (n[0] === "t") out.push(n[1]); });
    });
    return out;
  }

  function fetchMW(word) {
    var url = API + encodeURIComponent(word) + "?key=" + encodeURIComponent(getKey());
    return fetch(url).then(function (r) { return r.text(); }).then(function (t) {
      try { return JSON.parse(t); }
      catch (e) { var err = new Error("key"); err.detail = t; throw err; }
    });
  }

  /* ---------- word breakdown ---------- */
  var ROOTS = [];
  Object.keys(M.roots).forEach(function (k) {
    k.split("/").forEach(function (v) { ROOTS.push({ v: v, key: k, gloss: M.roots[k][0], origin: M.roots[k][1] }); });
  });
  ROOTS.sort(function (a, b) { return b.v.length - a.v.length; });
  var PRE = Object.keys(M.prefixes), SUF = Object.keys(M.suffixes);
  var FINAL = ["s", "es", "est", "ed"];

  function restores(stem, hasSuffix) {
    var f = [stem];
    if (hasSuffix) {
      if (/i$/.test(stem)) f.push(stem.slice(0, -1) + "y");
      f.push(stem + "e");
      if (/([bdfglmnprt])\1$/.test(stem)) f.push(stem.slice(0, -1));
    }
    return f;
  }

  function findRoot(forms) {
    for (var i = 0; i < ROOTS.length; i++) {
      var r = ROOTS[i];
      for (var j = 0; j < forms.length; j++) {
        var f = forms[j];
        if (f === r.v) return { r: r, score: 3 };
        if (r.v.length >= 3 && f.indexOf(r.v) === 0 && f.length - r.v.length <= 2) return { r: r, score: 2 };
      }
    }
    return null;
  }

  function weight(a) { return a.length >= 3 ? 1 : a.length === 2 ? 0.6 : 0.3; }

  function analyze(word, ctx) {
    var cands = [];
    function sufs(core, ss, pres, d) {
      cands.push({ pre: pres, stem: core, suf: ss });
      if (d >= 3) return;
      SUF.forEach(function (s) {
        if (core.length - s.length >= 3 && core.slice(-s.length) === s) sufs(core.slice(0, -s.length), [s].concat(ss), pres, d + 1);
      });
    }
    function pres(rest, ps, d) {
      sufs(rest, [], ps, 0);
      if (d >= 2) return;
      PRE.forEach(function (p) {
        if (rest.length - p.length >= 3 && rest.indexOf(p) === 0) pres(rest.slice(p.length), ps.concat(p), d + 1);
      });
    }
    pres(word, [], 0);

    var best = null;
    cands.forEach(function (c) {
      var n = c.pre.length + c.suf.length;
      // inflectional endings can only come last
      for (var k = 0; k < c.suf.length - 1; k++) if (FINAL.indexOf(c.suf[k]) >= 0) return;
      var forms = restores(c.stem, c.suf.length > 0);
      var known = null;
      if (n) forms.forEach(function (f) { if (!known && f !== word && (WORDS.has(f) || ctx.known.has(f))) known = f; });
      var root = findRoot(forms);
      var s = n ? 0 : 0.5;
      c.pre.forEach(function (p) { s += weight(p) + (ctx.tokens.indexOf(p + "-") >= 0 ? 2 : 0); });
      c.suf.forEach(function (x) { s += weight(x) + (ctx.tokens.indexOf("-" + x) >= 0 ? 2 : 0); });
      if (known) s += 3 + 0.1 * known.length;
      if (root) s += root.score;
      if (n && !known && !root) s -= c.stem.length < 5 ? 2 : 0.4 * n;
      if (n && (c.pre.some(function (p) { return p.length === 1; }) || c.suf.some(function (x) { return x.length === 1; })) && !known && !root) s -= 2;
      c.score = s; c.known = known; c.root = root; c.n = n;
      if (!best || s > best.score || (s === best.score && n < best.n)) best = c;
    });

    if (ctx.nonDerived) best = cands[0]; // M-W lists no internal parts: keep the word whole

    // A whole word that is a root plus an ending, e.g. hap + -y
    if (best.n === 0 && best.root && best.root.score === 2 && !ctx.nonDerived) {
      var rest = word.slice(best.root.r.v.length);
      if (rest[0] === best.root.r.v.slice(-1) && rest.length > 1) rest = rest.slice(1);
      if (M.suffixes[rest]) best = { pre: [], stem: best.root.r.v, suf: [rest], root: { r: best.root.r, score: 3 }, known: null, n: 1 };
    }
    return best;
  }

  function partsHTML(c, word) {
    var parts = [];
    c.pre.forEach(function (p) {
      parts.push({ form: p + "-", type: "prefix", gloss: M.prefixes[p][0], origin: M.prefixes[p][1] });
    });
    var stemType = c.root ? "root" : c.known ? "base" : "base";
    var stemGloss = c.root ? c.root.r.gloss : "";
    var stemOrigin = c.root ? c.root.r.origin + (c.root.r.key.indexOf("/") > 0 ? " · also " + c.root.r.key.split("/").filter(function (v) { return v !== c.root.r.v; }).join(", ") : "") : "";
    var stemLabel = c.n === 0 ? word : c.stem;
    var stemLink = c.known && c.known !== word ? c.known : null;
    parts.push({
      form: stemLabel, type: stemType, gloss: stemGloss, origin: stemOrigin,
      extra: stemLink && stemLink !== c.stem ? "from " + link(stemLink) : stemLink ? link(stemLink, "look up") : ""
    });
    c.suf.forEach(function (s) {
      parts.push({ form: "-" + s, type: "suffix", gloss: M.suffixes[s][0], origin: M.suffixes[s][1] });
    });

    var html = '<div class="parts">' + parts.map(function (p) {
      return '<div class="part"><div class="type">' + p.type + '</div><div class="form">' + esc(p.form) + "</div>" +
        (p.gloss ? '<div class="gloss">' + esc(p.gloss) + "</div>" : "") +
        (p.origin ? '<div class="origin">' + esc(p.origin) + "</div>" : "") +
        (p.extra ? '<div class="origin">' + p.extra + "</div>" : "") + "</div>";
    }).join("") + "</div>";
    if (parts.length > 1) html += '<p class="formula">' + parts.map(function (p) { return esc(p.form); }).join(" + ") + "</p>";
    return html;
  }

  // Pull "X + Y" component lists out of M-W etymology text
  function mwComponents(texts) {
    var out = [];
    texts.forEach(function (t) {
      var re = /((?:\{it\}[^{}]+\{\/it\}[^{}+;]*?\s\+\s)+\{it\}[^{}]+\{\/it\}(?:\s[a-z ,']+)?)/g, m;
      while ((m = re.exec(t))) out.push(m[1].replace(/[,\s]+$/, ""));
    });
    return out;
  }

  /* ---------- rendering ---------- */
  function setStatus(html) { statusEl.innerHTML = html || ""; }

  function render(word, data) {
    var entries = data.filter(function (e) { return e && e.meta; });
    var exact = entries.filter(function (e) { return base(e.meta.id) === word; });
    var related = entries.filter(function (e) { return (e.meta.stems || []).indexOf(word) >= 0; });
    var main = exact.length ? exact : related.length ? related.slice(0, 1) : [];
    if (!main.length) return null;

    var head = main[0];
    var headBase = base(head.meta.id);
    var display = word === headBase ? syll(head.hwi && head.hwi.hw) : word;
    var pron = head.hwi && head.hwi.prs && head.hwi.prs[0] && head.hwi.prs[0].mw;
    var fl = head.fl;
    if (word !== headBase) (head.uros || []).forEach(function (u) { if (clean(u.ure) === word) { display = syll(u.ure); fl = u.fl || fl; } });

    // etymology
    var etyEntries = main.filter(function (e) { return e.et; });
    var etyTexts = [];
    etyEntries.forEach(function (e) { etyTexts = etyTexts.concat(etParts(e.et)); });
    var raw = etyTexts.join(" ");
    var tokens = [];
    raw.replace(/\{it\}([^{}]+)\{\/it\}/g, function (_, a) { tokens.push(a.toLowerCase().trim()); });
    raw.replace(/\{(?:et_link|d_link|mat|a_link)\|([^|}]+)/g, function (_, a) { tokens.push(base(a)); });

    var known = new Set();
    entries.forEach(function (e) { known.add(base(e.meta.id)); (e.meta.stems || []).forEach(function (s) { known.add(s); }); });
    known.delete(word);

    var ctx = {
      tokens: tokens, known: known,
      nonDerived: word === headBase && etyTexts.length > 0 && raw.indexOf("+") < 0 &&
        !tokens.some(function (t) { return /^-|-$/.test(t); }) && tokens.indexOf(word) < 0 && raw.indexOf("{et_link") < 0
    };
    var c = analyze(word, ctx);

    var html = "";
    html += '<div class="word">' + esc(display) + "</div>";
    html += '<div class="meta">' + [fl ? '<span class="fl">' + esc(fl) + "</span>" : "", pron ? "\\" + esc(pron) + "\\" : ""].filter(Boolean).join(" &nbsp; ") + "</div>";

    // Breakdown
    html += "<section><h2>Word breakdown</h2>" + partsHTML(c, word);
    var comps = mwComponents(etyTexts);
    if (comps.length) html += '<p class="note">Parts named in Merriam-Webster’s etymology: ' + comps.map(mwText).join("; ") + "</p>";
    else if (c.n === 0 && ctx.nonDerived) html += '<p class="note">Merriam-Webster’s etymology doesn’t divide this word into English parts. See its history below.</p>';
    html += "</section>";

    // Etymology
    html += '<section class="ety"><h2>Etymology</h2>';
    if (etyEntries.length) {
      etyEntries.forEach(function (e) {
        if (etyEntries.length > 1) html += "<h3>" + esc(clean(e.hwi.hw)) + ' <span class="fl">' + esc(e.fl || "") + "</span></h3>";
        etParts(e.et).forEach(function (t) { html += "<p>" + mwText(t) + "</p>"; });
        if (e.date) html += '<p class="date">First known use: ' + mwText(e.date) + "</p>";
      });
    } else {
      html += '<div id="baseety"><p class="note">Looking for the etymology of the base word…</p></div>';
    }
    html += "</section>";

    // Definitions
    html += "<section><h2>Definitions</h2>";
    main.forEach(function (e) {
      if (main.length > 1) html += "<h3>" + esc(clean(e.hwi.hw)) + ' <span class="fl">' + esc(e.fl || "") + "</span></h3>";
      if (word !== base(e.meta.id)) html += '<p class="note">Listed under ' + link(e.meta.id) + " (" + esc(e.fl || "") + "):</p>";
      if (e.shortdef && e.shortdef.length) html += '<ol class="defs">' + e.shortdef.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ol>";
    });
    html += '<p class="note"><a href="' + MW_PAGE + encodeURIComponent(word) + '" target="_blank" rel="noopener">Full entry at Merriam-Webster</a></p></section>';

    resultEl.innerHTML = html;

    if (!etyEntries.length) loadBaseEtymology(word, headBase, c, entries);
    return true;
  }

  function loadBaseEtymology(word, headBase, c, entries) {
    var box = $("baseety");
    var cands = [];
    if (headBase !== word) cands.push(headBase);
    // strip endings one at a time: transportation -> transport
    for (var i = c.suf.length - 1; i >= 0; i--) {
      var w0 = c.pre.join("") + c.stem + c.suf.slice(0, i).join("");
      restores(w0, true).forEach(function (f) { if (WORDS.has(f)) cands.push(f); });
    }
    if (c.known) cands.push(c.known);
    if (c.pre.length) restores(c.stem, c.suf.length > 0).forEach(function (f) { if (WORDS.has(f)) cands.push(f); });
    cands = cands.filter(function (w, i) { return cands.indexOf(w) === i && w !== word; });

    function done(html) { if (box && document.body.contains(box)) box.innerHTML = html; }
    function tryNext(i) {
      if (i >= cands.length) return done('<p class="note">Merriam-Webster has no etymology for this entry.</p>');
      var w = cands[i];
      var local = entries.filter(function (e) { return base(e.meta.id) === w && e.et; });
      var p = local.length ? Promise.resolve(local) : fetchMW(w).then(function (d) {
        return (d || []).filter(function (e) { return e && e.meta && base(e.meta.id) === w && e.et; });
      });
      p.then(function (list) {
        if (!list.length) return tryNext(i + 1);
        var html = '<p class="note">Merriam-Webster gives no separate etymology for <i>' + esc(word) + "</i>. Etymology of the base word " + link(w) + ":</p>";
        list.forEach(function (e) {
          etParts(e.et).forEach(function (t) { html += "<p>" + mwText(t) + "</p>"; });
          if (e.date) html += '<p class="date">First known use: ' + mwText(e.date) + "</p>";
        });
        done(html);
      }).catch(function () { tryNext(i + 1); });
    }
    tryNext(0);
  }

  /* ---------- search ---------- */
  var current = 0;
  function search(word) {
    word = String(word || "").trim().toLowerCase();
    resultEl.innerHTML = "";
    if (!word) { setStatus(""); return; }
    q.value = word;
    if (!/^[a-z][a-z'-]*$/.test(word)) { setStatus("Please enter a single English word."); return; }
    if (!getKey()) { showKeyBox(true); setStatus(""); return; }
    var id = ++current;
    setStatus("Looking up “" + esc(word) + "”…");
    fetchMW(word).then(function (data) {
      if (id !== current) return;
      if (!Array.isArray(data) || !data.length) { setStatus("No entry found for “" + esc(word) + "”."); return; }
      if (typeof data[0] === "string") {
        setStatus("No entry found for “" + esc(word) + "”. Did you mean:" +
          '<div class="suggest">' + data.slice(0, 8).map(function (s) {
            return '<button type="button" data-w="' + esc(s) + '">' + esc(s) + "</button>";
          }).join("") + "</div>");
        return;
      }
      setStatus("");
      if (!render(word, data)) setStatus("No entry found for “" + esc(word) + "”.");
    }).catch(function (err) {
      if (id !== current) return;
      if (err.message === "key") {
        setStatus("Merriam-Webster didn’t accept the API key. Check that it is a Collegiate Dictionary key.");
        showKeyBox(true);
      } else {
        setStatus("Couldn’t reach Merriam-Webster. Check your connection and try again.");
      }
    });
  }

  function route() {
    var w = decodeURIComponent(location.hash.slice(1));
    if (w) search(w); else { resultEl.innerHTML = ""; setStatus(""); }
  }

  $("search").addEventListener("submit", function (e) {
    e.preventDefault();
    var w = q.value.trim().toLowerCase();
    if (location.hash.slice(1) === encodeURIComponent(w)) search(w);
    else location.hash = encodeURIComponent(w);
  });
  statusEl.addEventListener("click", function (e) {
    var w = e.target.getAttribute && e.target.getAttribute("data-w");
    if (w) location.hash = encodeURIComponent(w.toLowerCase());
  });
  window.addEventListener("hashchange", function () { route(); window.scrollTo(0, 0); });

  if (!getKey()) showKeyBox(true);
  route();
})();
