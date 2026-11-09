(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var box = $("ipa-text"), keys = $("ipa-keys"), msg = $("ipa-msg");
  var D = "◌"; // dotted circle, shows where a diacritic attaches

  var PLACES = ["Bilabial", "Labiodental", "Dental", "Alveolar", "Postalveolar", "Retroflex", "Palatal", "Velar", "Uvular", "Pharyngeal", "Glottal"];
  var SHORT = ["Bilabial", "Labio-dental", "Dental", "Alveolar", "Post-alveolar", "Retroflex", "Palatal", "Velar", "Uvular", "Pharyn-geal", "Glottal"];
  // [manner, cells by place: "voiceless voiced" (use _ for empty)]
  var PULMONIC = [
    ["Plosive", ["p b", "_ _", "_ _", "t d", "_ _", "ʈ ɖ", "c ɟ", "k ɡ", "q ɢ", "_ _", "ʔ _"]],
    ["Nasal", ["_ m", "_ ɱ", "_ _", "_ n", "_ _", "_ ɳ", "_ ɲ", "_ ŋ", "_ ɴ", "_ _", "_ _"]],
    ["Trill", ["_ ʙ", "_ _", "_ _", "_ r", "_ _", "_ _", "_ _", "_ _", "_ ʀ", "_ _", "_ _"]],
    ["Tap or flap", ["_ _", "_ ⱱ", "_ _", "_ ɾ", "_ _", "_ ɽ", "_ _", "_ _", "_ _", "_ _", "_ _"]],
    ["Fricative", ["ɸ β", "f v", "θ ð", "s z", "ʃ ʒ", "ʂ ʐ", "ç ʝ", "x ɣ", "χ ʁ", "ħ ʕ", "h ɦ"]],
    ["Lateral fricative", ["_ _", "_ _", "_ _", "ɬ ɮ", "_ _", "_ _", "_ _", "_ _", "_ _", "_ _", "_ _"]],
    ["Approximant", ["_ _", "_ ʋ", "_ _", "_ ɹ", "_ _", "_ ɻ", "_ j", "_ ɰ", "_ _", "_ _", "_ _"]],
    ["Lateral approximant", ["_ _", "_ _", "_ _", "_ l", "_ _", "_ ɭ", "_ ʎ", "_ ʟ", "_ _", "_ _", "_ _"]]
  ];

  var HEIGHTS = ["Close", "Near-close", "Close-mid", "Mid", "Open-mid", "Near-open", "Open"];
  var BACKNESS = ["Front", "Central", "Back"];
  var VOWELS = [
    ["i y", "ɨ ʉ", "ɯ u"],
    ["ɪ ʏ", "_ _", "_ ʊ"],
    ["e ø", "ɘ ɵ", "ɤ o"],
    ["_ _", "ə _", "_ _"],
    ["ɛ œ", "ɜ ɞ", "ʌ ɔ"],
    ["æ _", "ɐ _", "_ _"],
    ["a ɶ", "_ _", "ɑ ɒ"]
  ];

  // [symbol, name, combining?]
  var GROUPS = [
    ["Other vowels", [
      ["ɚ", "rhotacized schwa"], ["ɝ", "rhotacized open-mid central vowel"], ["ᵻ", "near-close central unrounded vowel"], ["ᵿ", "near-close central rounded vowel"]
    ]],
    ["Non-pulmonic consonants", [
      ["ʘ", "bilabial click"], ["ǀ", "dental click"], ["ǃ", "(post)alveolar click"], ["ǂ", "palatoalveolar click"], ["ǁ", "alveolar lateral click"],
      ["ɓ", "voiced bilabial implosive"], ["ɗ", "voiced alveolar implosive"], ["ʄ", "voiced palatal implosive"], ["ɠ", "voiced velar implosive"], ["ʛ", "voiced uvular implosive"],
      ["ʼ", "ejective"]
    ]],
    ["Other symbols", [
      ["ʍ", "voiceless labial-velar fricative"], ["w", "voiced labial-velar approximant"], ["ɥ", "voiced labial-palatal approximant"],
      ["ʜ", "voiceless epiglottal fricative"], ["ʢ", "voiced epiglottal fricative"], ["ʡ", "epiglottal plosive"],
      ["ɕ", "voiceless alveolo-palatal fricative"], ["ʑ", "voiced alveolo-palatal fricative"], ["ɺ", "voiced alveolar lateral flap"],
      ["ɧ", "simultaneous ʃ and x"], ["ɫ", "velarized alveolar lateral approximant"],
      ["ʦ", "ts digraph"], ["ʣ", "dz digraph"], ["ʧ", "tʃ digraph"], ["ʤ", "dʒ digraph"], ["ʨ", "tɕ digraph"], ["ʥ", "dʑ digraph"],
      ["͡", "tie bar above", 1], ["͜", "tie bar below", 1]
    ]],
    ["Suprasegmentals", [
      ["ˈ", "primary stress"], ["ˌ", "secondary stress"], ["ː", "long"], ["ˑ", "half-long"], ["̆", "extra-short", 1],
      ["|", "minor (foot) group"], ["‖", "major (intonation) group"], [".", "syllable break"], ["‿", "linking (absence of a break)"]
    ]],
    ["Tones and word accents", [
      ["˥", "extra high tone letter"], ["˦", "high tone letter"], ["˧", "mid tone letter"], ["˨", "low tone letter"], ["˩", "extra low tone letter"],
      ["̋", "extra high", 1], ["́", "high", 1], ["̄", "mid", 1], ["̀", "low", 1], ["̏", "extra low", 1],
      ["̌", "rising", 1], ["̂", "falling", 1], ["᷄", "high rising", 1], ["᷅", "low rising", 1], ["᷈", "rising-falling", 1],
      ["ꜜ", "downstep"], ["ꜛ", "upstep"], ["↗", "global rise"], ["↘", "global fall"]
    ]],
    ["Diacritics", [
      ["̥", "voiceless", 1], ["̊", "voiceless (above)", 1], ["̬", "voiced", 1], ["ʰ", "aspirated"], ["ʱ", "breathy aspirated"],
      ["̹", "more rounded", 1], ["̜", "less rounded", 1], ["̟", "advanced", 1], ["̠", "retracted", 1],
      ["̈", "centralized", 1], ["̽", "mid-centralized", 1], ["̩", "syllabic", 1], ["̍", "syllabic (above)", 1], ["̯", "non-syllabic", 1],
      ["˞", "rhoticity"], ["̤", "breathy voiced", 1], ["̰", "creaky voiced", 1], ["̼", "linguolabial", 1],
      ["ʷ", "labialized"], ["ʲ", "palatalized"], ["ˠ", "velarized"], ["ˤ", "pharyngealized"], ["̴", "velarized or pharyngealized", 1],
      ["̝", "raised", 1], ["̞", "lowered", 1], ["̘", "advanced tongue root", 1], ["̙", "retracted tongue root", 1],
      ["̪", "dental", 1], ["̺", "apical", 1], ["̻", "laminal", 1], ["̃", "nasalized", 1],
      ["ⁿ", "nasal release"], ["ˡ", "lateral release"], ["̚", "no audible release", 1], ["ᵊ", "mid central vowel release"], ["ᶿ", "dental fricative release"], ["ˣ", "velar fricative release"]
    ]]
  ];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function key(sym, name, comb) {
    return '<button type="button" class="k" data-s="' + esc(sym) + '" title="' + esc(name) + '" aria-label="' + esc(name) + '">' +
      esc(comb ? D + sym : sym) + "</button>";
  }
  function pair(cell, nameFn) {
    var p = cell.split(" ");
    return p.map(function (s, i) { return s === "_" ? '<span class="k empty"></span>' : key(s, nameFn(i)); }).join("");
  }

  var html = "";
  html += '<section><h2>Consonants (pulmonic)</h2><p class="scroll-hint">Scroll sideways for more →</p><div class="chart"><table><tr><th></th>' +
    SHORT.map(function (p) { return "<th>" + p.replace("-", "-<br>") + "</th>"; }).join("") + "</tr>";
  PULMONIC.forEach(function (row) {
    html += "<tr><th>" + row[0] + "</th>" + row[1].map(function (c, j) {
      return "<td>" + pair(c, function (i) { return (i ? "voiced " : "voiceless ") + PLACES[j].toLowerCase() + " " + row[0].toLowerCase(); }) + "</td>";
    }).join("") + "</tr>";
  });
  html += "</table></div></section>";

  html += '<section><h2>Vowels</h2><div class="chart"><table><tr><th></th>' +
    BACKNESS.map(function (b) { return "<th>" + b + "</th>"; }).join("") + "</tr>";
  VOWELS.forEach(function (row, r) {
    html += "<tr><th>" + HEIGHTS[r] + "</th>" + row.map(function (c, j) {
      return "<td>" + pair(c, function (i) { return HEIGHTS[r].toLowerCase() + " " + BACKNESS[j].toLowerCase() + " " + (i ? "rounded" : "unrounded") + " vowel"; }) + "</td>";
    }).join("") + "</tr>";
  });
  html += '</table></div><p class="note">In each pair, the left symbol is unrounded and the right is rounded.</p></section>';

  GROUPS.forEach(function (g) {
    html += "<section><h2>" + g[0] + '</h2><div class="keyrow">' + g[1].map(function (k) { return key(k[0], k[1], k[2]); }).join("") + "</div></section>";
  });
  keys.innerHTML = html;

  /* ---------- typing ---------- */
  var timer;
  function flash(t) { msg.textContent = t; clearTimeout(timer); timer = setTimeout(function () { msg.textContent = ""; }, 1600); }

  function insert(s) {
    var a = box.selectionStart, b = box.selectionEnd;
    if (typeof a !== "number") { a = b = box.value.length; }
    box.setRangeText(s, a, b, "end");
    try { localStorage.setItem("ipa_text", box.value); } catch (e) {}
  }

  keys.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button.k");
    if (!b) return;
    insert(b.getAttribute("data-s"));
    $("ipa-name").textContent = b.getAttribute("data-s") ? b.textContent.replace(D, "") + "  " + b.title : "";
  });

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    box.select(); document.execCommand("copy"); return Promise.resolve();
  }
  $("ipa-copy").addEventListener("click", function () {
    if (!box.value) { flash("Nothing to copy yet."); return; }
    copy(box.value).then(function () { flash("Copied."); }, function () { flash("Couldn’t copy. Select the text and copy it manually."); });
  });
  $("ipa-back").addEventListener("click", function () {
    var a = box.selectionStart, b = box.selectionEnd;
    if (a !== b) box.setRangeText("", a, b, "end");
    else if (a > 0) {
      var chars = Array.from(box.value.slice(0, a));
      var removed = chars.pop();
      box.setRangeText("", a - removed.length, a, "end");
    }
    try { localStorage.setItem("ipa_text", box.value); } catch (e) {}
  });
  $("ipa-clear").addEventListener("click", function () {
    box.value = "";
    try { localStorage.removeItem("ipa_text"); } catch (e) {}
  });
  box.addEventListener("input", function () { try { localStorage.setItem("ipa_text", box.value); } catch (e) {} });
  try { box.value = localStorage.getItem("ipa_text") || ""; } catch (e) {}
})();
