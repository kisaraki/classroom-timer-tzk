(function () {
  "use strict";

  const DAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  let stage;
  let screen;
  let digitalClock;
  let dateDisplay;
  let hourHand;
  let minuteHand;
  let secondHand;
  let lastRender = 0;
  let isActive = false;

  function render(timestamp, force) {
    if (!force && timestamp - lastRender < 100) {
      return;
    }
    lastRender = timestamp;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();
    const timeText = [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");

    if (screen.dataset.font === "digital") {
      TimerApp.renderSevenSegment(digitalClock, timeText);
    } else {
      TimerApp.renderPlainText(digitalClock, timeText);
    }
    digitalClock.dateTime = now.toISOString();
    digitalClock.setAttribute("aria-label", `現在時間 ${timeText}`);
    dateDisplay.textContent = `${now.getFullYear()} 年 ${String(now.getMonth() + 1).padStart(2, "0")} 月 ${String(now.getDate()).padStart(2, "0")} 日　${DAYS[now.getDay()]}`;

    const preciseSeconds = seconds + milliseconds / 1000;
    const preciseMinutes = minutes + preciseSeconds / 60;
    const preciseHours = (hours % 12) + preciseMinutes / 60;
    secondHand.style.transform = `translateX(-50%) rotate(${preciseSeconds * 6}deg)`;
    minuteHand.style.transform = `translateX(-50%) rotate(${preciseMinutes * 6}deg)`;
    hourHand.style.transform = `translateX(-50%) rotate(${preciseHours * 30}deg)`;
  }

  function frame(timestamp) {
    render(timestamp, false);
  }

  function activate() {
    if (!isActive) {
      isActive = true;
      render(performance.now(), true);
      TimerApp.animation.add(frame);
    }
  }

  function deactivate() {
    isActive = false;
    TimerApp.animation.remove(frame);
  }

  function setPreference(name, value) {
    screen.dataset[name] = value;
    TimerApp.storage.set(`clock-${name}`, value);
  }

  function initialize() {
    screen = document.getElementById("clock-screen");
    stage = document.getElementById("clock-stage");
    digitalClock = document.getElementById("digital-clock");
    dateDisplay = document.getElementById("clock-date");
    hourHand = document.getElementById("hour-hand");
    minuteHand = document.getElementById("minute-hand");
    secondHand = document.getElementById("second-hand");

    const fontSelect = document.getElementById("clock-font");
    const colorSelect = document.getElementById("clock-color");
    const backgroundSelect = document.getElementById("clock-background");
    const analogToggle = document.getElementById("clock-analog-toggle");

    fontSelect.value = TimerApp.storage.get("clock-font", "digital");
    colorSelect.value = TimerApp.storage.get("clock-color", "green");
    const storedBackground = TimerApp.storage.get("clock-background", "black");
    backgroundSelect.value = storedBackground === "amber" ? "watch" : storedBackground;
    const showAnalog = TimerApp.storage.get("clock-show-analog", true) !== false;

    screen.dataset.font = fontSelect.value;
    screen.dataset.color = colorSelect.value;
    screen.dataset.background = backgroundSelect.value;
    stage.classList.toggle("no-analog", !showAnalog);
    analogToggle.setAttribute("aria-pressed", String(showAnalog));
    analogToggle.textContent = showAnalog ? "隱藏指針鐘" : "顯示指針鐘";

    fontSelect.addEventListener("change", () => {
      setPreference("font", fontSelect.value);
      render(performance.now(), true);
    });
    colorSelect.addEventListener("change", () => setPreference("color", colorSelect.value));
    backgroundSelect.addEventListener("change", () => setPreference("background", backgroundSelect.value));
    analogToggle.addEventListener("click", () => {
      const shouldShow = stage.classList.contains("no-analog");
      stage.classList.toggle("no-analog", !shouldShow);
      analogToggle.setAttribute("aria-pressed", String(shouldShow));
      analogToggle.textContent = shouldShow ? "隱藏指針鐘" : "顯示指針鐘";
      TimerApp.storage.set("clock-show-analog", shouldShow);
    });

    window.addEventListener("timerscreenchange", (event) => {
      if (event.detail.current === "clock") {
        activate();
      } else {
        deactivate();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initialize);
}());
