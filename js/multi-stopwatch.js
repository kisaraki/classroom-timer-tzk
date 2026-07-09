(function () {
  "use strict";

  const COLORS = [
    "#39ff14", "#E6CEA7", "#00ffff", "#ff4fd8", "#b266ff",
    "#ffff33", "#ff8c00", "#ff3333", "#66ccff", "#7fff00",
    "#ffffff", "#cc99ff", "#ffd700", "#40e0d0", "#ff69b4",
    "#98ff98", "#ff7f50", "#ffcc99", "#afeeee", "#dddddd"
  ];
  const timers = Array.from({ length: 20 }, () => ({
    running: false,
    elapsed: 0,
    startTime: null,
    card: null,
    display: null,
    status: null
  }));
  let screen;
  let active = false;

  function elapsedFor(timer, now) {
    return timer.running
      ? timer.elapsed + (now - timer.startTime)
      : timer.elapsed;
  }

  function render(now) {
    timers.forEach((timer) => {
      const value = TimerApp.formatDuration(elapsedFor(timer, now));
      if (screen.dataset.font === "digital") {
        TimerApp.renderSevenSegment(timer.display, value);
      } else {
        TimerApp.renderPlainText(timer.display, value);
      }
    });
  }

  function syncTimer(timer) {
    timer.card.classList.toggle("is-running", timer.running);
    timer.card.setAttribute("aria-pressed", String(timer.running));
    const groupNumber = timers.indexOf(timer) + 1;
    timer.card.setAttribute(
      "aria-label",
      `第 ${groupNumber} 組碼表，${timer.running ? "計時中" : "已停止"}`
    );
    timer.status.textContent = timer.running ? "計時中" : "已停止";
  }

  function syncAnimation() {
    if (active && timers.some((timer) => timer.running)) {
      TimerApp.animation.add(render);
    } else {
      TimerApp.animation.remove(render);
    }
  }

  function startTimer(timer, now) {
    if (timer.running) {
      return;
    }
    timer.running = true;
    timer.startTime = now;
    syncTimer(timer);
  }

  function stopTimer(timer, now) {
    if (!timer.running) {
      return;
    }
    timer.elapsed = elapsedFor(timer, now);
    timer.running = false;
    timer.startTime = null;
    syncTimer(timer);
  }

  function toggleTimer(index) {
    const timer = timers[index];
    const now = performance.now();
    if (timer.running) {
      stopTimer(timer, now);
    } else {
      startTimer(timer, now);
    }
    render(now);
    syncAnimation();
  }

  function startAll() {
    const now = performance.now();
    timers.forEach((timer) => startTimer(timer, now));
    syncAnimation();
  }

  function stopAll() {
    const now = performance.now();
    timers.forEach((timer) => stopTimer(timer, now));
    render(now);
    syncAnimation();
  }

  function resetAll() {
    timers.forEach((timer) => {
      timer.running = false;
      timer.elapsed = 0;
      timer.startTime = null;
      syncTimer(timer);
    });
    render(performance.now());
    syncAnimation();
    TimerApp.announce("20 組碼表已全部歸零");
  }

  function initialize() {
    screen = document.getElementById("multi-stopwatch-screen");
    const grid = document.getElementById("multi-grid");
    const fontSelect = document.getElementById("multi-font");

    fontSelect.value = TimerApp.storage.get("multi-stopwatch-font", "digital");
    screen.dataset.font = fontSelect.value;
    fontSelect.addEventListener("change", () => {
      screen.dataset.font = fontSelect.value;
      TimerApp.storage.set("multi-stopwatch-font", fontSelect.value);
      render(performance.now());
    });

    timers.forEach((timer, index) => {
      const number = String(index + 1).padStart(2, "0");
      const card = document.createElement("button");
      card.type = "button";
      card.className = "multi-card";
      card.style.setProperty("--timer-color", COLORS[index]);
      card.setAttribute("aria-pressed", "false");
      card.setAttribute("aria-label", `第 ${index + 1} 組碼表，已停止`);
      card.innerHTML = `
        <span class="multi-card__header">
          <span class="multi-card__dot"></span>
          <span>GROUP ${number} · <span class="multi-card__status">已停止</span></span>
        </span>
        <span class="multi-card__time">00:00:00.00</span>
      `;
      card.addEventListener("click", () => toggleTimer(index));
      grid.appendChild(card);

      timer.card = card;
      timer.display = card.querySelector(".multi-card__time");
      timer.status = card.querySelector(".multi-card__status");
    });
    render(performance.now());

    document.getElementById("multi-start-all").addEventListener("click", startAll);
    document.getElementById("multi-stop-all").addEventListener("click", stopAll);
    document.getElementById("multi-reset-all").addEventListener("click", resetAll);

    window.addEventListener("timerscreenchange", (event) => {
      active = event.detail.current === "multi-stopwatch";
      if (active) {
        render(performance.now());
      }
      syncAnimation();
    });
    window.addEventListener("timertoggle", (event) => {
      if (event.detail.screen !== "multi-stopwatch") {
        return;
      }
      if (timers.some((timer) => timer.running)) {
        stopAll();
      } else {
        startAll();
      }
    });
    window.addEventListener("timerreset", (event) => {
      if (event.detail.screen === "multi-stopwatch") {
        resetAll();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initialize);
}());
