// "Float": opens the site in a small window that stays on top of other apps
// (Google Docs, Pages, Word…). Uses Chrome/Edge's Document Picture-in-Picture.
(function () {
  "use strict";
  var btn = document.getElementById("float");
  var msg = document.getElementById("float-msg");
  if (!btn) return;

  // Inside the floating window itself, hide the button
  if (document.documentElement.className.indexOf("mini") >= 0) { btn.hidden = true; return; }

  var pip = null;

  function miniURL() {
    return location.origin + location.pathname + "?mini" + location.hash;
  }

  btn.addEventListener("click", function () {
    if (pip && !pip.closed) { pip.focus(); return; }

    if ("documentPictureInPicture" in window) {
      var size = { width: 420, height: 640 };
      try { size = JSON.parse(localStorage.getItem("float_size")) || size; } catch (e) {}
      window.documentPictureInPicture.requestWindow(size).then(function (win) {
        pip = win;
        var d = win.document;
        d.title = "Words";
        var st = d.createElement("style");
        st.textContent = "html,body{margin:0;height:100%;background:#fff}iframe{border:0;width:100%;height:100%;display:block}";
        d.head.appendChild(st);
        var f = d.createElement("iframe");
        f.src = miniURL();
        f.allow = "clipboard-read; clipboard-write";
        d.body.appendChild(f);
        win.addEventListener("pagehide", function () {
          try { localStorage.setItem("float_size", JSON.stringify({ width: win.innerWidth, height: win.innerHeight })); } catch (e) {}
          pip = null;
          msg.hidden = true;
        });
        msg.textContent = "The floating window stays on top of your other apps. Keep this tab open: closing it also closes the floating window.";
        msg.hidden = false;
      }).catch(function () {
        msg.textContent = "Couldn’t open the floating window. Try clicking Float again.";
        msg.hidden = false;
      });
    } else {
      // Safari and Firefox: a small ordinary window (not always on top)
      pip = window.open(miniURL(), "words-mini", "width=420,height=700");
      msg.textContent = "This browser opened a small window, but it won’t stay on top of other apps. For a window that floats over Google Docs, open this site in Chrome or Edge and click Float.";
      msg.hidden = false;
    }
  });
})();
