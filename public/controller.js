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
        $("actionBar").classList.remove("hidden");
        setStatus("PAIRED", true);
        goLandscape();
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
    goLandscape();
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

  // ---- Landscape lock (best effort) ----
  function goLandscape() {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(function () {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock("landscape").catch(function () {});
          }
        }).catch(function () {});
      } else if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(function () {});
      }
    } catch (e) {}
  }
  $("landscapeBtn").addEventListener("click", goLandscape);

  // ---- Mode-2 virtual joysticks ----
  // Left stick: throttle (up = climb) + yaw (left/right rotate).
  // Right stick: pitch (forward/back tilt) + roll (left/right tilt).
  var JOY_RADIUS = 46;
  var sticks = {
    left: { id: null, x: 0, y: 0, knob: $("leftKnob") },
    right: { id: null, x: 0, y: 0, knob: $("rightKnob") },
  };

  function updateStick(zone, stick, e) {
    var rect = zone.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = e.clientX - cx;
    var dy = e.clientY - cy;
    var len = Math.hypot(dx, dy);
    if (len > JOY_RADIUS) {
      dx = (dx / len) * JOY_RADIUS;
      dy = (dy / len) * JOY_RADIUS;
    }
    stick.x = dx / JOY_RADIUS;
    stick.y = dy / JOY_RADIUS;
    stick.knob.style.transform = "translate(" + dx + "px," + dy + "px)";
  }

  function resetStick(stick) {
    stick.id = null;
    stick.x = 0;
    stick.y = 0;
    stick.knob.style.transform = "translate(0,0)";
  }

  function bindStick(zoneName, stickName) {
    var zone = $(zoneName);
    var stick = sticks[stickName];
    zone.addEventListener("pointerdown", function (e) {
      e.stopPropagation();
      stick.id = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      updateStick(zone, stick, e);
    });
    zone.addEventListener("pointermove", function (e) {
      if (e.pointerId === stick.id) updateStick(zone, stick, e);
    });
    ["pointerup", "pointercancel"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        if (e.pointerId === stick.id) resetStick(stick);
      });
    });
  }

  bindStick("leftZone", "left");
  bindStick("rightZone", "right");

  // ---- Drone telemetry stream (30 Hz) ----
  // Left stick: throttle = up positive, yaw = right positive.
  // Right stick: pitch = forward positive (tilt nose down), roll = right positive.
  var turboHeld = false;
  var stream = setInterval(function () {
    if (!paired) return;
    var l = sticks.left;
    var r = sticks.right;
    send({
      type: "drone",
      throttle: Math.max(0, -l.y),
      yaw: l.x,
      pitch: -r.y,
      roll: r.x,
      turbo: turboHeld,
      active: true,
    });
  }, 33);
  window.addEventListener("pagehide", function () {
    clearInterval(stream);
  });

  // ---- Command buttons ----
  function sendCmd(cmd) {
    if (!paired) return;
    send({ type: "droneCmd", cmd: cmd });
    debug("cmd " + cmd);
  }

  $("takeoffBtn").addEventListener("pointerdown", function (e) {
    e.preventDefault();
    sendCmd("takeoff");
  });
  $("landBtn").addEventListener("pointerdown", function (e) {
    e.preventDefault();
    sendCmd("land");
  });
  $("resetBtn").addEventListener("pointerdown", function (e) {
    e.preventDefault();
    sendCmd("reset");
  });
  $("modeBtn").addEventListener("pointerdown", function (e) {
    e.preventDefault();
    sendCmd("mode");
  });
  $("cameraBtn").addEventListener("pointerdown", function (e) {
    e.preventDefault();
    sendCmd("camera");
  });

  // TURBO is a hold-to-boost button.
  function setTurbo(on) {
    turboHeld = on;
    $("turboBtn").classList.toggle("active", on);
  }
  $("turboBtn").addEventListener("pointerdown", function (e) {
    e.preventDefault();
    setTurbo(true);
  });
  ["pointerup", "pointercancel"].forEach(function (ev) {
    $("turboBtn").addEventListener(ev, function (e) {
      e.preventDefault();
      setTurbo(false);
    });
  });

  window.onerror = function (msg, src, line) {
    send({ type: "telemetry", error: String(msg) + " @" + line });
  };
})();
