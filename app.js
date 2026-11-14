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
    if (q.value.trim()) search(q.value);
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
    return '<a href="#en/' + encodeURIComponent(w) + '">' + esc(label || w) + "</a>";
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

  /* ---------- word breakdown (MorphoLex-en) ---------- */
  // Each line of morpholex/<letter>.txt is "word<TAB>segmentation".
  // Segmentation notation: <prefix<  (root)  >suffix>  and { } for groups.
  // "=" means the word is a single root.
  var ROOTGLOSS = {};
  Object.keys(M.roots).forEach(function (k) {
    k.split("/").forEach(function (v) { if (!ROOTGLOSS[v]) ROOTGLOSS[v] = M.roots[k]; });
  });
  ["bio", "tele", "geo", "auto", "micro", "macro", "neo", "proto", "pseudo", "poly", "mono", "pan"].forEach(function (p) {
    if (!ROOTGLOSS[p] && M.prefixes[p]) ROOTGLOSS[p] = M.prefixes[p];
  });

  var SEG = {}, segLoading = {};
  function loadSeg(letter) {
    if (SEG[letter]) return Promise.resolve(SEG[letter]);
    if (segLoading[letter]) return segLoading[letter];
    segLoading[letter] = fetch("morpholex/" + letter + ".txt").then(function (r) {
      if (!r.ok) throw new Error("seg");
      return r.text();
    }).then(function (t) {
      var map = {};
      t.split("\n").forEach(function (line) {
        var i = line.indexOf("\t");
        if (i > 0) map[line.slice(0, i)] = line.slice(i + 1);
      });
      SEG[letter] = map;
      return map;
    }).catch(function (e) { segLoading[letter] = null; throw e; });
    return segLoading[letter];
  }

  // Inflected forms that may not be listed: try the base form
  var INFL = [["ies", "y", "s"], ["ied", "y", "ed"], ["ier", "y", "er"], ["iest", "y", "est"], ["ing", "", "ing"], ["ing", "e", "ing"],
    ["ed", "", "ed"], ["ed", "e", "ed"], ["es", "", "es"], ["s", "", "s"], ["er", "", "er"], ["er", "e", "er"], ["est", "", "est"], ["est", "e", "est"]];
  function lookupSeg(word) {
    var letter = word[0];
    if (!/[a-z]/.test(letter)) return Promise.resolve(null);
    return loadSeg(letter).then(function (map) {
      var direct = map[word];
      for (var i = 0; i < INFL.length; i++) {
        var end = INFL[i][0];
        if (word.length > end.length + 2 && word.slice(-end.length) === end) {
          var stem = word.slice(0, -end.length);
          var cands = [stem + INFL[i][1]];
          if (/([bdfgklmnprtvz])\1$/.test(stem)) cands.push(stem.slice(0, -1));
          for (var j = 0; j < cands.length; j++) {
            var c = cands[j];
            if (!map[c]) continue;
            // walked = walk + -ed only if the database analyses both the same way
            if (!direct || shape(parseSegm(direct, word), true) === shape(parseSegm(map[c], c), true))
              return { word: c, segm: map[c], infl: INFL[i][2] };
          }
        }
      }
      return direct ? { word: word, segm: direct, infl: "" } : null;
    });
  }

  function parseSegm(s, word) {
    if (s === "=") return { g: true, kids: [{ t: "root", f: word }] };
    var stack = [{ g: true, kids: [] }], i = 0, j;
    while (i < s.length) {
      var ch = s[i], top = stack[stack.length - 1];
      if (ch === "{") { var g = { g: true, kids: [] }; top.kids.push(g); stack.push(g); i++; }
      else if (ch === "}") { if (stack.length > 1) stack.pop(); i++; }
      else if (ch === "<") { j = s.indexOf("<", i + 1); top.kids.push({ t: "prefix", f: s.slice(i + 1, j) }); i = j + 1; }
      else if (ch === ">") { j = s.indexOf(">", i + 1); top.kids.push({ t: "suffix", f: s.slice(i + 1, j) }); i = j + 1; }
      else if (ch === "(") { j = s.indexOf(")", i + 1); top.kids.push({ t: "root", f: s.slice(i + 1, j) }); i = j + 1; }
      else i++;
    }
    var tree = stack[0];
    while (tree.kids.length === 1 && tree.kids[0].g) tree = tree.kids[0];
    return tree;
  }

  function flatten(node, groupOf, out) {
    node.kids.forEach(function (k) {
      if (k.g) flatten(k, k, out);
      else { k.group = groupOf; out.push(k); }
    });
    return out;
  }
  function shape(node, top) {
    var s = node.kids.map(function (k) {
      return k.g ? shape(k, false) : k.t === "prefix" ? k.f + "-" : k.t === "suffix" ? "-" + k.f : k.f;
    }).join(" + ");
    return top || node.kids.length < 2 ? s : "[" + s + "]";
  }

  // Concatenations of each bracketed group, e.g. {<trans<(port)} -> "transport"
  function groupWords(node, out) {
    node.kids.forEach(function (k) { if (k.g) groupWords(k, out); });
    out.push(node.kids.map(function surface(k) { return k.g ? k.kids.map(surface).join("") : k.f; }).join(""));
    return out;
  }

  // MorphoLex writes some morphemes under one label: <im< is the negative prefix
  // in any spelling (in-, im-, il-, ir-), <in< is "in, into", >able> also covers -ible.
  var LABELS = {
    prefix: { im: { gloss: ["not", "Latin"], spell: ["im", "il", "ir", "in", "i"] }, "in": { gloss: ["in, into, on", "Latin"], spell: ["im", "il", "ir", "in"] } },
    suffix: { able: { spell: ["ible", "able", "ble"] }, ion: { spell: ["ation", "ition", "ution", "tion", "sion", "ion"] } }
  };
  // Prefixes whose last letter changes to match the next sound: ad- -> af-fect, ob- -> op-pose
  var ASSIM = { a: ["to, toward (form of ad-)", "Latin"], o: ["against, toward (form of ob-)", "Latin"],
    su: ["under (form of sub-)", "Latin"], e: ["out (form of ex-)", "Latin"] };
  function assimilated(f, word) {
    var n = f.length, c = word[n];
    if (f === "co") {
      var m = word.match(/^(com|con|col|cor)/);
      return { spell: m ? m[1] : "co", gloss: ["together, with", "Latin"] };
    }
    if (ASSIM[f] && c && /[bcdfgklmnprst]/.test(c) && word[n + 1] === c) return { spell: f + c, gloss: ASSIM[f] };
    return null;
  }

  function spelled(t, f, word, prev) {
    var L = LABELS[t] && LABELS[t][f];
    if (!L) return f;
    for (var i = 0; i < L.spell.length; i++) {
      var sp = L.spell[i];
      if (t === "prefix" && word.indexOf(sp) === 0) return sp;
      // the spelling that actually follows the previous part: port+ation, struct+ion
      if (t === "suffix" && word.indexOf((prev || "") + sp) >= 0) return sp;
    }
    return f;
  }

  function describeParts(parts, word) {
    return parts.map(function (p, idx) {
      if (p.t === "prefix") {
        // only the first prefix touches the start of the word
        var as = idx === 0 ? assimilated(p.f, word) : null;
        var L = LABELS.prefix[p.f], pg = (as && as.gloss) || (L && L.gloss) || M.prefixes[p.f];
        var form = as ? as.spell : idx === 0 ? spelled("prefix", p.f, word) : p.f;
        return { form: form + "-", type: "prefix", gloss: pg ? pg[0] : "", origin: pg ? pg[1] : "" };
      }
      if (p.t === "suffix") {
        var sg = M.suffixes[p.f];
        var prev = idx > 0 ? parts[idx - 1].f : "";
        return { form: "-" + (p.infl ? p.f : spelled("suffix", p.f, word, prev)), type: p.infl ? "inflection" : "suffix", gloss: sg ? sg[0] : "", origin: sg ? sg[1] : "" };
      }
      var isWord = WORDS.has(p.f);
      var rg = ROOTGLOSS[p.f];
      // A root that is also an everyday English word only gets a Latin/Greek meaning
      // when a prefix or a bound (non-word) root sits right next to it, as in trans- + port.
      var latinate = !isWord || (p.group && p.group.kids.some(function (k) {
        return k !== p && !k.g && (k.t === "prefix" || (k.t === "root" && !WORDS.has(k.f)));
      }));
      if (rg && latinate) return { form: p.f, type: "root", gloss: rg[0], origin: rg[1] };
      if (isWord) return { form: p.f, type: latinate ? "root" : "base word", gloss: "", origin: "", link: p.f };
      return { form: p.f, type: "root", gloss: "", origin: "" };
    });
  }

  function breakdownHTML(found, word) {
    var tree = parseSegm(found.segm, found.word);
    var parts = flatten(tree, tree, []);
    if (found.infl) parts.push({ t: "suffix", f: found.infl, infl: true });
    var d = describeParts(parts, found.word);
    var html = '<div class="parts">' + d.map(function (p) {
      return '<div class="part"><div class="type">' + p.type + '</div><div class="form">' + esc(p.form) + "</div>" +
        (p.gloss ? '<div class="gloss">' + esc(p.gloss) + "</div>" : "") +
        (p.origin ? '<div class="origin">' + esc(p.origin) + "</div>" : "") +
        (p.link && p.link !== word ? '<div class="origin">' + link(p.link, "look up") + "</div>" : "") + "</div>";
    }).join("") + "</div>";
    if (d.length > 1) {
      var k = 0;
      (function relabel(node) { node.kids.forEach(function (n) { if (n.g) relabel(n); else { var f = d[k++].form; n.f = f.replace(/^-|-$/g, ""); } }); })(tree);
      var sh = shape(tree, true) + (found.infl ? " + -" + found.infl : "");
      html += '<p class="formula">' + esc(sh) + "</p>";
    } else {
      html += '<p class="note">In modern English this word is a single morpheme: it isn’t divided into smaller meaningful parts. Its older parts, if any, are under Etymology.</p>';
    }
    if (found.infl) html += '<p class="note">-' + esc(found.infl) + " is a grammatical ending added to <i>" + esc(found.word) + "</i>.</p>";
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

    var html = "";
    html += '<div class="word">' + esc(display) + "</div>";
    html += '<div class="meta">' + [fl ? '<span class="fl">' + esc(fl) + "</span>" : "", pron ? "\\" + esc(pron) + "\\" : ""].filter(Boolean).join(" &nbsp; ") + "</div>";

    // Breakdown (filled in once the MorphoLex file for this letter has loaded)
    html += '<section><h2>Word breakdown</h2><div id="breakdown"><p class="note">Loading…</p></div>';
    var comps = mwComponents(etyTexts);
    if (comps.length) html += '<p class="note">Parts named in Merriam-Webster’s etymology: ' + comps.map(mwText).join("; ") + "</p>";
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

    // Definitions, with Merriam-Webster's example sentences
    html += "<section><h2>Definitions</h2>";
    main.forEach(function (e) {
      if (main.length > 1) html += "<h3>" + esc(clean(e.hwi.hw)) + ' <span class="fl">' + esc(e.fl || "") + "</span></h3>";
      if (word !== base(e.meta.id)) html += '<p class="note">Listed under ' + link(e.meta.id) + " (" + esc(e.fl || "") + "):</p>";
      html += definitionsHTML(e);
    });
    html += '<p class="note"><a href="' + MW_PAGE + encodeURIComponent(word) + '" target="_blank" rel="noopener">Full entry at Merriam-Webster</a></p></section>';

    resultEl.innerHTML = html;

    var box = $("breakdown");
    lookupSeg(word).then(function (found) {
      if (!document.body.contains(box)) return;
      if (found) {
        box.innerHTML = breakdownHTML(found, word) +
          '<p class="note">Breakdown: MorphoLex-en (Sánchez-Gutiérrez et al., 2018). Part meanings are general meanings.</p>';
      } else {
        box.innerHTML = '<p class="note">This word isn’t in the MorphoLex-en database, so there’s no verified breakdown for it.' +
          (comps.length ? "" : " Its history is under Etymology.") + "</p>";
      }
      if (!etyEntries.length) loadBaseEtymology(word, headBase, found, entries);
    }).catch(function () {
      if (document.body.contains(box)) box.innerHTML = '<p class="note">Couldn’t load the breakdown. Try again.</p>';
      if (!etyEntries.length) loadBaseEtymology(word, headBase, null, entries);
    });
    return true;
  }

  // Senses from the full entry: definition text plus example sentences ("vis")
  var MAX_SENSES = 8;
  function definitionsHTML(e) {
    var senses = [];
    (e.def || []).forEach(function (d) {
      (d.sseq || []).forEach(function (seq) {
        seq.forEach(function (item) {
          if (item[0] === "sense") senses.push(item[1]);
          else if (item[0] === "bs" && item[1] && item[1].sense) senses.push(item[1].sense);
          else if (item[0] === "pseq") (item[1] || []).forEach(function (p) { if (p[0] === "sense") senses.push(p[1]); });
        });
      });
    });
    if (!senses.length) {
      return (e.shortdef && e.shortdef.length) ?
        '<ol class="defs">' + e.shortdef.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ol>" : "";
    }
    var html = '<ul class="senses">', shown = 0;
    senses.forEach(function (s) {
      var text = "", ex = [];
      (s.dt || []).forEach(function (d) {
        if (d[0] === "text") text += d[1];
        else if (d[0] === "vis") (d[1] || []).forEach(function (v) { ex.push(v.t); });
        else if (d[0] === "uns") (d[1] || []).forEach(function (u) {
          (u || []).forEach(function (x) { if (x[0] === "vis") (x[1] || []).forEach(function (v) { ex.push(v.t); }); });
        });
      });
      text = mwText(text);
      if (!text || shown >= MAX_SENSES) return;
      shown++;
      html += '<li><span class="sn">' + esc(s.sn || "") + '</span><div class="sd"><p>' + text + "</p>" +
        ex.slice(0, 2).map(function (t) { return '<p class="ex">' + mwText(t) + "</p>"; }).join("") + "</div></li>";
    });
    html += "</ul>";
    if (senses.length > shown) html += '<p class="note">' + (senses.length - shown) + " more senses in the full entry.</p>";
    return html;
  }

  function loadBaseEtymology(word, headBase, found, entries) {
    var box = $("baseety");
    if (!box) return;
    var cands = [];
    if (headBase !== word) cands.push(headBase);
    if (found) {
      if (found.word !== word) cands.push(found.word);
      var tree = parseSegm(found.segm, found.word);
      groupWords(tree, []).reverse().forEach(function (w) { if (WORDS.has(w)) cands.push(w); });
      flatten(tree, tree, []).forEach(function (p) { if (p.t === "root" && WORDS.has(p.f)) cands.push(p.f); });
    }
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

  function go(w) {
    var h = "#en/" + encodeURIComponent(w);
    if (location.hash === h) search(w); else location.hash = h;
  }

  $("search").addEventListener("submit", function (e) {
    e.preventDefault();
    go(q.value.trim().toLowerCase());
  });
  statusEl.addEventListener("click", function (e) {
    var w = e.target.getAttribute && e.target.getAttribute("data-w");
    if (w) go(w.toLowerCase());
  });

  window.MW_UTIL = { mwText: mwText, esc: esc };

  // Called by the tab router in main.js
  window.EN = {
    show: function (w) {
      if (!getKey()) showKeyBox(true);
      if (w) search(w); else { resultEl.innerHTML = ""; setStatus(""); q.value = ""; }
    }
  };
})();
