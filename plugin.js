(function () {
  let ctx = null;
  let box = null;
  let size = 48;
  let shape = "square";
  let playersOn = false;
  let beat = 0;
  let seq = 0;
  let pushedAt = 0;

  function take(next) {
    if (!next) return;
    ctx = ctx || {};
    ["roomId", "headers", "campaign", "save"].forEach(function (key) {
      if (next[key] != null) ctx[key] = next[key];
    });
  }

  function pad2(n) { return String(n).padStart(2, "0"); }

  function digitHtml(text) {
    return String(text).split("").map(function (ch) {
      return '<span class="' + (ch === ":" ? "colon" : "digit") + '">' + ch + "</span>";
    }).join("");
  }

  function paintCss() {
    if (document.getElementById("clock-plugin-css")) return;
    const style = document.createElement("style");
    style.id = "clock-plugin-css";
    style.textContent = [
      ".clock-layer.is-embedded { position: static; z-index: auto; top: auto; right: auto; width: 100%; max-width: 420px; box-shadow: none; }",
      ".clock-layer.is-embedded h2 { margin: 0; padding: 10px 14px 0; font-weight: 500; font-size: 16px; color: var(--brass); }"
    ].join("\n");
    document.head.appendChild(style);
  }

  function pushClock() {
    if (!ctx || !ctx.roomId) return;
    seq += 1;
    pushedAt = Date.now();
    fetch("/api/rooms/" + ctx.roomId + "/events", {
      method: "POST",
      headers: ctx.headers || { "content-type": "application/json" },
      body: JSON.stringify({ type: "clock", on: playersOn, size: size, shape: shape, seq: seq })
    }).catch(function () {});
  }

  function maybePush() {
    if (!playersOn) return;
    if (Date.now() - pushedAt < 1000) return;
    pushClock();
  }

  function paintFace() {
    maybePush();
    if (!box || !box.isConnected) return;
    const now = new Date();
    const node = box.querySelector("[data-clock=now]");
    if (node) node.innerHTML = digitHtml(pad2(now.getHours()) + ":" + pad2(now.getMinutes()) + ":" + pad2(now.getSeconds()));
  }

  function wake() {
    if (beat) return;
    paintFace();
    beat = setInterval(paintFace, 250);
  }

  function applyLook() {
    if (!box) return;
    box.style.setProperty("--clock-size", size + "px");
    box.classList.remove("shape-square", "shape-round", "shape-narrow", "shape-segment");
    box.classList.add("shape-" + shape);
    box.querySelectorAll("[data-clock-shape]").forEach(function (button) {
      button.classList.toggle("is-on", button.getAttribute("data-clock-shape") === shape);
    });
  }

  function build() {
    box = document.createElement("div");
    box.id = "clock-layer";
    box.className = "clock-layer is-embedded shape-" + shape;
    box.setAttribute("aria-label", "Часы");
    box.innerHTML = '<h2>Часы</h2>' +
      '<p class="clock-face" data-clock="now">00:00:00</p>' +
      '<label class="clock-size">Размер<input data-clock="size" type="range" min="28" max="120" value="' + size + '"></label>' +
      '<div class="clock-shapes" role="group" aria-label="Форма цифр">' +
      '<button type="button" data-clock-shape="square">Прямые</button>' +
      '<button type="button" data-clock-shape="round">Круглые</button>' +
      '<button type="button" data-clock-shape="narrow">Узкие</button>' +
      '<button type="button" data-clock-shape="segment">Сегмент</button></div>' +
      '<button type="button" class="clock-players" data-clock="eye">Показать игрокам</button>';
    box.querySelector("[data-clock=size]").addEventListener("input", function (event) {
      size = Math.min(120, Math.max(28, Math.round(Number(event.target.value) || 48)));
      applyLook();
      if (playersOn) pushClock();
    });
    box.querySelectorAll("[data-clock-shape]").forEach(function (button) {
      button.addEventListener("click", function () {
        shape = button.getAttribute("data-clock-shape") || "square";
        applyLook();
        if (playersOn) pushClock();
      });
    });
    const eye = box.querySelector("[data-clock=eye]");
    function markEye() {
      eye.classList.toggle("is-on", playersOn);
      eye.textContent = playersOn ? "Скрыть у игроков" : "Показать игрокам";
    }
    eye.addEventListener("click", function () {
      playersOn = !playersOn;
      markEye();
      pushClock();
    });
    markEye();
    applyLook();
    document.body.appendChild(box);
  }

  function ensure(host) {
    paintCss();
    if (!box || !box.isConnected) build();
    box.classList.add("is-embedded");
    if (host) {
      box.hidden = false;
      if (box.parentElement !== host) host.append(box);
    } else if (!host && box.parentElement === document.body) {
      box.hidden = true;
    }
    wake();
  }

  function stop() {
    if (playersOn) {
      playersOn = false;
      pushClock();
    }
    clearInterval(beat);
    beat = 0;
    if (box) box.remove();
    box = null;
  }

  function install(host) {
    host.add({
      id: "clock",
      boot: function (env) { take(env); ensure(null); },
      module: {
        title: "Часы",
        icon: '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 8v4l2.5 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
        mount: function (hostNode, next) { take(next); ensure(hostNode); },
        stop: stop
      }
    });
  }

  if (window.ShirmoHost) install(window.ShirmoHost);
  else window.addEventListener("shirmo-host", function () { install(window.ShirmoHost); }, { once: true });
})();
