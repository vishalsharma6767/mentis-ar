(function () {
  "use strict";

  var $ = function (id) {
    return document.getElementById(id);
  };

  var ws = null;
  var paired = false;
  var code = "";

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

  // ---- Touchpad: swipe to rotate the solar system, tap to select ----
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
    send({ type: "look", dx: dx, dy: dy }); // rotate the model
  });

  function endTouch(e) {
    if (e.pointerId !== touch.id) return;
    touch.id = null;
    if (touch.moved < 8) {
      // tap = select the planet at the centre of the view
      send({ type: "select" });
    }
  }
  ["pointerup", "pointercancel"].forEach(function (ev) {
    zone.addEventListener(ev, endTouch);
  });

  // ---- Buttons ----
  function sendKey(code) {
    if (!paired) return;
    send({ type: "key", code: code, down: true });
    setTimeout(function () {
      send({ type: "key", code: code, down: false });
    }, 60);
    debug("key " + code);
  }

  $("cameraBtn").addEventListener("pointerdown", function (e) {
    e.preventDefault();
    sendKey("KeyC");
  });

  $("resetBtn").addEventListener("pointerdown", function (e) {
    e.preventDefault();
    sendKey("KeyR");
  });

  // TALK is hold-to-talk (Spacebar push-to-talk in the solar academy).
  var voiceHeld = false;
  function setVoice(on) {
    voiceHeld = on;
    $("voiceBtn").classList.toggle("active", on);
    if (paired) send({ type: "voice", down: on });
  }
  $("voiceBtn").addEventListener("pointerdown", function (e) {
    e.preventDefault();
    setVoice(true);
  });
  ["pointerup", "pointercancel"].forEach(function (ev) {
    $("voiceBtn").addEventListener(ev, function (e) {
      e.preventDefault();
      setVoice(false);
    });
  });

  window.onerror = function (msg, src, line) {
    send({ type: "telemetry", error: String(msg) + " @" + line });
  };
})();