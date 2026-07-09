(function () {
  "use strict";

  const MAX_DURATION = 359999990;
  const UNIT_VALUES = {
    hours: 3600000,
    minutes: 60000,
    seconds: 1000,
    centiseconds: 10
  };
  const state = {
    running: false,
    remaining: 0,
    totalDuration: 0,
    startRemaining: 0,
    startTime: null,
    warningSeconds: 10,
    soundEnabled: false,
    showHourglass: true
  };
  let display;
  let segments;
  let progressLine;
  let screen;
  let stage;
  let hourglass;
  let status;
  let startButton;
  let stopButton;
  let warningInput;
  let soundInput;
  let modeToggle;
  let fontSelect;
  let colorSelect;
  let quickControls;
  let active = false;
  let selectedUnit = "hours";
  let touchStartY = null;

  function remainingAt(now) {
    return state.running
      ? Math.max(0, state.startRemaining - (now - state.startTime))
      : state.remaining;
  }

  function splitDuration(milliseconds) {
    const centisecondsTotal = Math.floor(Math.max(0, milliseconds) / 10);
    return {
      centiseconds: centisecondsTotal % 100,
      seconds: Math.floor(centisecondsTotal / 100) % 60,
      minutes: Math.floor(centisecondsTotal / 6000) % 60,
      hours: Math.floor(centisecondsTotal / 360000)
    };
  }

  function updateDisplay(milliseconds) {
    const parts = splitDuration(milliseconds);
    segments.forEach((segment) => {
      const value = String(parts[segment.dataset.unit]).padStart(2, "0");
      if (screen.dataset.font === "digital") {
        TimerApp.renderSevenSegment(segment, value);
      } else {
        TimerApp.renderPlainText(segment, value);
      }
    });
    const totalSeconds = milliseconds / 1000;
    const warningActive = state.warningSeconds > 0 &&
      milliseconds > 0 &&
      totalSeconds <= state.warningSeconds;
    display.classList.toggle("is-warning", warningActive);
    const progress = state.totalDuration > 0
      ? Math.min(1, Math.max(0, milliseconds / state.totalDuration))
      : 1;
    const travelWidth = Math.max(0, display.clientWidth - progressLine.offsetWidth);
    progressLine.style.transform = `translate3d(${travelWidth * progress}px, 0, 0)`;
    progressLine.classList.toggle("is-visible", state.totalDuration > 0);
    display.setAttribute(
      "aria-label",
      `倒數時間 ${parts.hours} 小時 ${parts.minutes} 分 ${parts.seconds} 秒`
    );
  }

  function playFinishedSound() {
    if (!state.soundEnabled) {
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(740, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.13, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.56);
      oscillator.addEventListener("ended", () => context.close());
    } catch (error) {
      TimerApp.announce("提示音無法播放");
    }
  }

  function finish() {
    state.running = false;
    state.remaining = 0;
    state.startRemaining = 0;
    state.startTime = null;
    TimerApp.animation.remove(frame);
    hourglass.classList.remove("is-running");
    display.classList.remove("is-warning");
    display.classList.add("is-finished");
    window.setTimeout(() => display.classList.remove("is-finished"), 1800);
    syncControls();
    status.textContent = "時間到";
    playFinishedSound();
    TimerApp.announce("倒數結束，時間到");
  }

  function frame(now) {
    const remaining = remainingAt(now);
    updateDisplay(remaining);
    if (remaining <= 0) {
      finish();
    }
  }

  function syncAnimation() {
    if (active && state.running) {
      TimerApp.animation.add(frame);
    } else {
      TimerApp.animation.remove(frame);
    }
  }

  function syncControls() {
    startButton.disabled = state.running || state.remaining <= 0;
    stopButton.disabled = !state.running;
    segments.forEach((segment) => {
      segment.disabled = state.running;
    });
    display.querySelectorAll(".countdown-step").forEach((button) => {
      button.disabled = state.running;
    });
    quickControls.querySelectorAll("button").forEach((button) => {
      button.disabled = state.running;
    });
    warningInput.disabled = state.running;
    status.textContent = state.running ? "倒數進行中" :
      state.remaining > 0 ? "已暫停，可調整時間" : "滑動或滾動數字來設定時間";
  }

  function start() {
    if (state.running) {
      return;
    }
    if (state.remaining <= 0) {
      TimerApp.announce("請先設定倒數時間");
      return;
    }
    state.running = true;
    state.startRemaining = state.remaining;
    state.startTime = performance.now();
    hourglass.style.setProperty("--hourglass-duration", `${Math.max(10, state.startRemaining)}ms`);
    hourglass.classList.add("is-running");
    display.classList.remove("is-finished");
    syncControls();
    syncAnimation();
  }

  function stop() {
    if (!state.running) {
      return;
    }
    const now = performance.now();
    state.remaining = remainingAt(now);
    state.running = false;
    state.startTime = null;
    hourglass.classList.remove("is-running");
    updateDisplay(state.remaining);
    syncControls();
    syncAnimation();
  }

  function reset() {
    state.running = false;
    state.remaining = 0;
    state.totalDuration = 0;
    state.startRemaining = 0;
    state.startTime = null;
    hourglass.classList.remove("is-running");
    display.classList.remove("is-finished", "is-warning");
    updateDisplay(0);
    syncControls();
    syncAnimation();
    TimerApp.announce("倒數計時器已歸零");
  }

  function adjust(milliseconds) {
    if (state.running) {
      return;
    }
    state.remaining = Math.min(MAX_DURATION, Math.max(0, state.remaining + milliseconds));
    state.totalDuration = state.remaining;
    updateDisplay(state.remaining);
    syncControls();
  }

  function selectSegment(segment) {
    selectedUnit = segment.dataset.unit;
    segments.forEach((item) => item.classList.toggle("is-selected", item === segment));
  }

  function setHourglassVisibility(show) {
    state.showHourglass = show;
    stage.classList.toggle("no-hourglass", !show);
    modeToggle.setAttribute("aria-pressed", String(show));
    modeToggle.textContent = show ? "模式：沙漏動畫" : "模式：純文字";
    TimerApp.storage.set("countdown-show-hourglass", show);
  }

  function normalizeWarningInput() {
    const parsed = Math.floor(Number(warningInput.value));
    state.warningSeconds = Number.isFinite(parsed) && parsed >= 0 ? parsed : 10;
    warningInput.value = String(state.warningSeconds);
    TimerApp.storage.set("countdown-warning-seconds", state.warningSeconds);
    updateDisplay(remainingAt(performance.now()));
  }

  function toggle() {
    if (state.running) {
      stop();
    } else {
      start();
    }
  }

  function initialize() {
    screen = document.getElementById("countdown-screen");
    display = document.getElementById("countdown-display");
    segments = Array.from(display.querySelectorAll(".countdown-segment"));
    progressLine = document.getElementById("countdown-progress-line");
    stage = document.getElementById("countdown-stage");
    hourglass = document.getElementById("countdown-hourglass");
    status = document.getElementById("countdown-status");
    startButton = document.getElementById("countdown-start");
    stopButton = document.getElementById("countdown-stop");
    warningInput = document.getElementById("warning-seconds");
    soundInput = document.getElementById("countdown-sound");
    modeToggle = document.getElementById("countdown-mode-toggle");
    fontSelect = document.getElementById("countdown-font");
    colorSelect = document.getElementById("countdown-color");
    quickControls = document.getElementById("countdown-quick-controls");

    const storedWarning = Number(TimerApp.storage.get("countdown-warning-seconds", 10));
    state.warningSeconds = Number.isFinite(storedWarning) && storedWarning >= 0
      ? Math.floor(storedWarning)
      : 10;
    state.soundEnabled = TimerApp.storage.get("countdown-sound", false) === true;
    state.showHourglass = TimerApp.storage.get("countdown-show-hourglass", true) !== false;
    fontSelect.value = TimerApp.storage.get("countdown-font", "digital");
    colorSelect.value = TimerApp.storage.get("countdown-color", "amber");
    screen.dataset.font = fontSelect.value;
    screen.dataset.color = colorSelect.value;
    warningInput.value = String(state.warningSeconds);
    soundInput.checked = state.soundEnabled;
    setHourglassVisibility(state.showHourglass);

    startButton.addEventListener("click", start);
    stopButton.addEventListener("click", stop);
    document.getElementById("countdown-reset").addEventListener("click", reset);
    warningInput.addEventListener("change", normalizeWarningInput);
    warningInput.addEventListener("blur", normalizeWarningInput);
    soundInput.addEventListener("change", () => {
      state.soundEnabled = soundInput.checked;
      TimerApp.storage.set("countdown-sound", state.soundEnabled);
    });
    modeToggle.addEventListener("click", () => {
      setHourglassVisibility(!state.showHourglass);
    });
    fontSelect.addEventListener("change", () => {
      screen.dataset.font = fontSelect.value;
      TimerApp.storage.set("countdown-font", fontSelect.value);
      updateDisplay(remainingAt(performance.now()));
    });
    colorSelect.addEventListener("change", () => {
      screen.dataset.color = colorSelect.value;
      TimerApp.storage.set("countdown-color", colorSelect.value);
    });

    quickControls.addEventListener("click", (event) => {
      const button = event.target.closest("[data-adjust]");
      if (button) {
        adjust(Number(button.dataset.adjust));
      }
    });

    display.addEventListener("click", (event) => {
      const stepButton = event.target.closest("[data-countdown-step]");
      if (!stepButton || state.running) {
        return;
      }
      const unit = stepButton.dataset.unit;
      const segment = display.querySelector(`.countdown-segment[data-unit="${unit}"]`);
      selectSegment(segment);
      adjust(Number(stepButton.dataset.countdownStep) * UNIT_VALUES[unit]);
    });

    display.addEventListener("wheel", (event) => {
      if (state.running) {
        return;
      }
      const field = event.target.closest(".countdown-field");
      if (!field) {
        return;
      }
      event.preventDefault();
      const unit = field.dataset.field;
      const segment = field.querySelector(".countdown-segment");
      selectSegment(segment);
      adjust(event.deltaY < 0 ? UNIT_VALUES[unit] : -UNIT_VALUES[unit]);
    }, { passive: false });

    segments.forEach((segment) => {
      segment.addEventListener("click", () => selectSegment(segment));
      segment.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          selectSegment(segment);
          adjust(event.key === "ArrowUp" ? UNIT_VALUES[selectedUnit] : -UNIT_VALUES[selectedUnit]);
        }
      });
      segment.addEventListener("touchstart", (event) => {
        touchStartY = event.changedTouches[0].clientY;
        selectSegment(segment);
      }, { passive: true });
      segment.addEventListener("touchend", (event) => {
        if (touchStartY === null || state.running) {
          return;
        }
        const distance = touchStartY - event.changedTouches[0].clientY;
        touchStartY = null;
        if (Math.abs(distance) >= 18) {
          adjust(distance > 0 ? UNIT_VALUES[selectedUnit] : -UNIT_VALUES[selectedUnit]);
        }
      }, { passive: true });
    });

    window.addEventListener("timerscreenchange", (event) => {
      active = event.detail.current === "countdown";
      if (active) {
        const now = performance.now();
        if (state.running && remainingAt(now) <= 0) {
          finish();
        } else {
          updateDisplay(remainingAt(now));
        }
      }
      syncAnimation();
    });
    window.addEventListener("timertoggle", (event) => {
      if (event.detail.screen === "countdown") {
        toggle();
      }
    });
    window.addEventListener("timerreset", (event) => {
      if (event.detail.screen === "countdown") {
        reset();
      }
    });
    window.addEventListener("resize", () => {
      updateDisplay(remainingAt(performance.now()));
    });

    updateDisplay(0);
    syncControls();
  }

  document.addEventListener("DOMContentLoaded", initialize);
}());
