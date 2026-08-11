(function () {
  "use strict";

  var $ = function (id) {
    return document.getElementById(id);
  };

  var ws = null;
  var paired = false;
  var code = "";
  var mode = "chem";

  var debugLog = [];
  function debug(msg) {
    debugLog.push(msg);
    if (debugLog.length > 5) debugLog.shift();
    var el = $("debug");
    if (el) el.textContent = debugLog.join("  |  ");
  }

  function setStatus(text, ok) {
    $("status").textContent = text;
    $("status").className = "status " + (ok ? "ok" : "off");
    $("statusDot").className = "dot " + (ok ? "on" : "");
  }

  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  // ---- Fullscreen + landscape orientation ----
  function enterFullscreen() {
    var el = document.documentElement;
    var rfs =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen;
    if (rfs) {
      try {
        var p = rfs.call(el);
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
    var so = screen.orientation || null;
    if (so && so.lock && typeof so.lock === "function") {
      try {
        var lp = so.lock("landscape");
        if (lp && lp.catch) lp.catch(function () {});
      } catch (e) {}
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(15); } catch (e) {}
    }
  }

  $("fsBtn").addEventListener("pointerdown", function (e) {
    e.preventDefault();
    enterFullscreen();
  });

  // Auto-enter fullscreen + landscape on the first touch anywhere (Android
  // browsers need a user gesture; iOS Safari ignores fullscreen gracefully).
  var fsOnce = false;
  function maybeFullscreen() {
    if (fsOnce) return;
    fsOnce = true;
    enterFullscreen();
  }
  document.addEventListener(
    "pointerdown",
    function (e) {
      if (e.target && e.target.closest && e.target.closest("#controls")) {
        maybeFullscreen();
      }
    },
    { passive: true }
  );

  function connect() {
    if (ws) {
      try { ws.close(); } catch (e) {}
    }
    var proto = location.protocol === "https:" ? "wss://" : "ws://";
    ws = new WebSocket(proto + location.host + "/ws");

    ws.onopen = function () {
      setStatus("CONNECTED", true);
      debug("ws open");
      send({ type: "telemetry", bound: 0, ua: navigator.userAgent });
      if (code) send({ type: "controller", code: code });
    };

    ws.onmessage = function (e) {
      var msg;
      try {
        msg = JSON.parse(e.data);
      } catch (err) {
        return;
      }
      if (!msg || typeof msg.type !== "string") return;

      if (msg.type === "paired") {
        paired = true;
        debug("paired!");
        $("pair").classList.add("hidden");
        $("controls").classList.remove("hidden");
        setStatus("PAIRED", true);
      } else if (msg.type === "error") {
        $("pairError").textContent = msg.message || "Error";
      }
    };

    ws.onclose = function () {
      setStatus("OFFLINE", false);
      paired = false;
      debug("ws closed - reconnecting");
      setTimeout(connect, 2000);
    };

    ws.onerror = function () {
      try { ws.close(); } catch (e) {}
    };
  }

  // ---- Pairing ----
  $("pairBtn").addEventListener("click", function () {
    var c = $("code").value.trim();
    if (c.length !== 4 || isNaN(Number(c))) {
      $("pairError").textContent = "Enter the 4-digit code";
      return;
    }
    code = c;
    $("pairError").textContent = "";
    send({ type: "controller", code: code });
  });

  $("code").addEventListener("keydown", function (e) {
    if (e.key === "Enter") $("pairBtn").click();
  });

  // Auto-fill + auto-pair when opened via the QR code (?code=XXXX)
  (function () {
    var params = new URLSearchParams(location.search);
    var qrCode = params.get("code");
    if (qrCode && /^\d{4}$/.test(qrCode)) {
      $("code").value = qrCode;
      code = qrCode;
      $("pairError").textContent = "";
      send({ type: "controller", code: code });
    }
  })();

  connect();

  // ---- Mode switch (which app is running on the big screen) ----
  try {
    mode = localStorage.getItem("mentis-remote-mode") || "chem";
  } catch (e) {}
  if (mode !== "solar") mode = "chem";

  function applyMode() {
    $("chemLayout").classList.toggle("hidden", mode !== "chem");
    $("solarLayout").classList.toggle("hidden", mode !== "solar");
    Array.prototype.forEach.call($("modes").querySelectorAll(".mode"), function (b) {
      b.classList.toggle("active", b.getAttribute("data-mode") === mode);
    });
    try {
      localStorage.setItem("mentis-remote-mode", mode);
    } catch (e) {}
  }
  applyMode();

  Array.prototype.forEach.call($("modes").querySelectorAll(".mode"), function (b) {
    b.addEventListener("click", function () {
      mode = b.getAttribute("data-mode");
      applyMode();
    });
  });

  // ---- Chemistry joysticks ----
  // Left stick = absolute position -> move axes (x, z where up = forward).
  // Right stick = incremental deltas -> look deltas.
  var stickState = { id: null, ox: 0, oy: 0, radius: 46 };

  function setupStick(el, onDelta, onAxis) {
    var knob = el.querySelector(".knob");
    var state = { id: null, ox: 0, oy: 0, px: 0, py: 0 };

    el.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      state.id = e.pointerId;
      state.ox = e.clientX;
      state.oy = e.clientY;
      state.px = e.clientX;
      state.py = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.classList.add("active");
    });

    el.addEventListener("pointermove", function (e) {
      if (e.pointerId !== state.id) return;
      var dx = e.clientX - state.ox;
      var dy = e.clientY - state.oy;
      var len = Math.hypot(dx, dy);
      if (len > stickState.radius) {
        dx = (dx / len) * stickState.radius;
        dy = (dy / len) * stickState.radius;
      }
      knob.style.transform = "translate(" + dx + "px," + dy + "px)";
      if (onAxis) {
        onAxis(dx / stickState.radius, dy / stickState.radius);
      }
      if (onDelta) {
        onDelta(e.clientX - state.px, e.clientY - state.py);
        state.px = e.clientX;
        state.py = e.clientY;
      }
    });

    function end(e) {
      if (e.pointerId !== state.id) return;
      state.id = null;
      knob.style.transform = "translate(0,0)";
      el.classList.remove("active");
      if (onAxis) onAxis(0, 0);
    }
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  // Walk stick -> { type: 'move', x, z } (z negative = forward).
  setupStick($("stickL"), null, function (x, y) {
    send({ type: "move", x: x, z: y });
  });

  // Look stick -> { type: 'look', dx, dy } pixel deltas.
  setupStick($("stickR"), function (dx, dy) {
    send({ type: "look", dx: dx, dy: dy });
  }, null);

  // ---- Chemistry action buttons ----
  function sendKey(code) {
    if (!paired) return;
    send({ type: "key", code: code, down: true });
    setTimeout(function () {
      send({ type: "key", code: code, down: false });
    }, 70);
    debug("key " + code);
  }

  Array.prototype.forEach.call($("chemLayout").querySelectorAll(".abtn[data-key]"), function (btn) {
    btn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      sendKey(btn.getAttribute("data-key"));
    });
  });

  // ---- Hold to talk (both layouts) ----
  var voiceHeld = false;
  function setVoice(on) {
    voiceHeld = on;
    $("voiceBtnChem").classList.toggle("active", on);
    $("voiceBtn").classList.toggle("active", on);
    if (paired) send({ type: "voice", down: on });
  }
  ["voiceBtn", "voiceBtnChem"].forEach(function (id) {
    var el = $(id);
    el.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      setVoice(true);
    });
    ["pointerup", "pointercancel"].forEach(function (ev) {
      el.addEventListener(ev, function (e) {
        e.preventDefault();
        setVoice(false);
      });
    });
  });

  // ---- Solar touchpad: swipe to rotate, tap to select ----
  var touch = { id: null, x: 0, y: 0, moved: 0 };
  var zone = $("touchZone");

  zone.addEventListener("pointerdown", function (e) {
    e.stopPropagation();
    touch.id = e.pointerId;
    touch.x = e.clientX;
    touch.y = e.clientY;
    touch.moved = 0;
    zone.setPointerCapture(e.pointerId);
  });

  zone.addEventListener("pointermove", function (e) {
    if (e.pointerId !== touch.id) return;
    var dx = e.clientX - touch.x;
    var dy = e.clientY - touch.y;
    touch.x = e.clientX;
    touch.y = e.clientY;
    touch.moved += Math.abs(dx) + Math.abs(dy);
    send({ type: "look", dx: dx, dy: dy });
  });

  function endTouch(e) {
    if (e.pointerId !== touch.id) return;
    touch.id = null;
    if (touch.moved < 8) {
      send({ type: "select" });
    }
  }
  ["pointerup", "pointercancel"].forEach(function (ev) {
    zone.addEventListener(ev, endTouch);
  });

  // ---- Solar buttons ----
  $("cameraBtn").addEventListener("pointerdown", function (e) {
    e.preventDefault();
    sendKey("KeyC");
  });

  $("resetBtn").addEventListener("pointerdown", function (e) {
    e.preventDefault();
    sendKey("KeyR");
  });

  window.onerror = function (msg, src, line) {
    send({ type: "telemetry", error: String(msg) + " @" + line });
  };
})();
