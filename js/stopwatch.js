(function () {
  "use strict";

  const state = {
    running: false,
    elapsed: 0,
    startTime: null
  };
  let display;
  let screen;
  let startButton;
  let stopButton;
  let active = false;

  function currentElapsed(now) {
    return state.running
      ? state.elapsed + (now - state.startTime)
      : state.elapsed;
  }

  function render(now) {
    const value = TimerApp.formatDuration(currentElapsed(now));
    if (screen.dataset.font === "digital") {
      TimerApp.renderSevenSegment(display, value);
    } else {
      TimerApp.renderPlainText(display, value);
    }
    display.setAttribute("aria-label", `碼表 ${value}`);
  }

  function syncControls() {
    startButton.disabled = state.running;
    stopButton.disabled = !state.running;
    startButton.textContent = state.elapsed > 0 ? "繼續" : "開始";
  }

  function syncAnimation() {
    if (active && state.running) {
      TimerApp.animation.add(render);
    } else {
      TimerApp.animation.remove(render);
    }
  }

  function start() {
    if (state.running) {
      return;
    }
    state.running = true;
    state.startTime = performance.now();
    syncControls();
    syncAnimation();
  }

  function stop() {
    if (!state.running) {
      return;
    }
    const now = performance.now();
    state.elapsed = currentElapsed(now);
    state.running = false;
    state.startTime = null;
    render(now);
    syncControls();
    syncAnimation();
  }

  function reset() {
    state.running = false;
    state.elapsed = 0;
    state.startTime = null;
    render(performance.now());
    syncControls();
    syncAnimation();
    TimerApp.announce("碼表已歸零");
  }

  function toggle() {
    if (state.running) {
      stop();
    } else {
      start();
    }
  }

  function initialize() {
    screen = document.getElementById("stopwatch-screen");
    display = document.getElementById("stopwatch-display");
    startButton = document.getElementById("stopwatch-start");
    stopButton = document.getElementById("stopwatch-stop");
    const resetButton = document.getElementById("stopwatch-reset");
    const fontSelect = document.getElementById("stopwatch-font");
    const colorSelect = document.getElementById("stopwatch-color");
    const backgroundSelect = document.getElementById("stopwatch-background");

    fontSelect.value = TimerApp.storage.get("stopwatch-font", "digital");
    colorSelect.value = TimerApp.storage.get("stopwatch-color", "green");
    backgroundSelect.value = TimerApp.storage.get("stopwatch-background", "gray");
    screen.dataset.font = fontSelect.value;
    screen.dataset.color = colorSelect.value;
    screen.dataset.background = backgroundSelect.value;

    fontSelect.addEventListener("change", () => {
      screen.dataset.font = fontSelect.value;
      TimerApp.storage.set("stopwatch-font", fontSelect.value);
      render(performance.now());
    });
    colorSelect.addEventListener("change", () => {
      screen.dataset.color = colorSelect.value;
      TimerApp.storage.set("stopwatch-color", colorSelect.value);
    });
    backgroundSelect.addEventListener("change", () => {
      screen.dataset.background = backgroundSelect.value;
      TimerApp.storage.set("stopwatch-background", backgroundSelect.value);
    });

    startButton.addEventListener("click", start);
    stopButton.addEventListener("click", stop);
    resetButton.addEventListener("click", reset);
    window.addEventListener("timerscreenchange", (event) => {
      active = event.detail.current === "stopwatch";
      if (active) {
        render(performance.now());
      }
      syncAnimation();
    });
    window.addEventListener("timertoggle", (event) => {
      if (event.detail.screen === "stopwatch") {
        toggle();
      }
    });
    window.addEventListener("timerreset", (event) => {
      if (event.detail.screen === "stopwatch") {
        reset();
      }
    });

    syncControls();
    render(performance.now());
  }

  document.addEventListener("DOMContentLoaded", initialize);
}());
