(function () {
  "use strict";

  const ROUTE_PARAMETER = "tool";
  const SCREEN_CONFIG = Object.freeze({
    menu: { title: "Classroom Timer tzk" },
    clock: { title: "即時時鐘 | Classroom Timer tzk" },
    stopwatch: { title: "大型碼表 | Classroom Timer tzk" },
    "multi-stopwatch": { title: "20 組碼表 | Classroom Timer tzk" },
    countdown: { title: "倒數計時器 | Classroom Timer tzk" }
  });
  const screens = new Map();
  const frameCallbacks = new Set();
  let activeScreen = "menu";
  let frameRequest = null;
  let toolbarTimer = null;

  function formatDuration(milliseconds) {
    const safeMs = Math.max(0, Number.isFinite(milliseconds) ? milliseconds : 0);
    const centisecondsTotal = Math.floor(safeMs / 10);
    const centiseconds = centisecondsTotal % 100;
    const secondsTotal = Math.floor(centisecondsTotal / 100);
    const seconds = secondsTotal % 60;
    const minutesTotal = Math.floor(secondsTotal / 60);
    const minutes = minutesTotal % 60;
    const hours = Math.floor(minutesTotal / 60);

    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0")
    ].join(":") + "." + String(centiseconds).padStart(2, "0");
  }

  function createSevenSegmentSlot(character) {
    if (/^\d$/.test(character)) {
      const digit = document.createElement("span");
      digit.className = "seven-digit";
      digit.dataset.value = character;
      digit.setAttribute("aria-hidden", "true");
      ["a", "b", "c", "d", "e", "f", "g"].forEach((name) => {
        const segment = document.createElement("i");
        segment.className = `seven-segment seven-segment--${name}`;
        digit.appendChild(segment);
      });
      return { element: digit, type: "digit" };
    }

    const separator = document.createElement("span");
    separator.className = character === "."
      ? "seven-separator seven-separator--dot"
      : "seven-separator seven-separator--colon";
    separator.setAttribute("aria-hidden", "true");
    const dotCount = character === "." ? 1 : 2;
    for (let index = 0; index < dotCount; index += 1) {
      separator.appendChild(document.createElement("i"));
    }
    return { element: separator, type: character };
  }

  function renderSevenSegment(element, value) {
    const text = String(value);
    if (
      element.dataset.displayValue === text &&
      element.classList.contains("seven-segment-display")
    ) {
      return;
    }

    const pattern = Array.from(text, (character) => /^\d$/.test(character) ? "d" : character).join("");
    let slots = element._sevenSegmentSlots;

    if (!slots || element._sevenSegmentPattern !== pattern) {
      slots = Array.from(text, createSevenSegmentSlot);
      const fragment = document.createDocumentFragment();
      slots.forEach((slot) => fragment.appendChild(slot.element));
      element.replaceChildren(fragment);
      element._sevenSegmentSlots = slots;
      element._sevenSegmentPattern = pattern;
    }

    Array.from(text).forEach((character, index) => {
      if (slots[index].type === "digit" && slots[index].element.dataset.value !== character) {
        slots[index].element.dataset.value = character;
      }
    });
    element.dataset.displayValue = text;
    element.classList.add("seven-segment-display");
  }

  function renderPlainText(element, value) {
    const text = String(value);
    if (element.classList.contains("seven-segment-display") || element.textContent !== text) {
      element.classList.remove("seven-segment-display");
      element.replaceChildren(document.createTextNode(text));
    }
    delete element._sevenSegmentSlots;
    delete element._sevenSegmentPattern;
    element.dataset.displayValue = text;
  }

  function animationTick(timestamp) {
    frameCallbacks.forEach((callback) => callback(timestamp));
    frameRequest = frameCallbacks.size
      ? window.requestAnimationFrame(animationTick)
      : null;
  }

  const animation = {
    add(callback) {
      frameCallbacks.add(callback);
      if (frameRequest === null) {
        frameRequest = window.requestAnimationFrame(animationTick);
      }
    },
    remove(callback) {
      frameCallbacks.delete(callback);
      if (!frameCallbacks.size && frameRequest !== null) {
        window.cancelAnimationFrame(frameRequest);
        frameRequest = null;
      }
    }
  };

  const storage = {
    get(key, fallback) {
      try {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        return false;
      }
    }
  };

  function announce(message) {
    const liveMessage = document.getElementById("live-message");
    liveMessage.textContent = "";
    window.setTimeout(() => {
      liveMessage.textContent = message;
    }, 30);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else {
          announce("此瀏覽器不支援全螢幕功能");
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      announce("無法切換全螢幕，計時功能仍可正常使用");
    }
  }

  function updateFullscreenLabels() {
    const label = document.fullscreenElement ? "離開全螢幕" : "全螢幕";
    document.querySelectorAll(".fullscreen-button").forEach((button) => {
      button.textContent = label;
    });
  }

  function resetToolbarFade() {
    const current = screens.get(activeScreen);
    if (!current || activeScreen === "menu") {
      return;
    }

    current.classList.remove("toolbar-hidden");
    window.clearTimeout(toolbarTimer);
    toolbarTimer = window.setTimeout(() => {
      const toolbarHasFocus = current.querySelector(".tool-toolbar")?.matches(":focus-within");
      if (!toolbarHasFocus) {
        current.classList.add("toolbar-hidden");
      }
    }, 5000);
  }

  function isKnownScreen(screenName) {
    return Object.prototype.hasOwnProperty.call(SCREEN_CONFIG, screenName);
  }

  function screenFromLocation() {
    const url = new URL(window.location.href);
    const queryScreen = url.searchParams.get(ROUTE_PARAMETER);
    if (isKnownScreen(queryScreen)) {
      return queryScreen;
    }

    let hashScreen = "";
    try {
      hashScreen = decodeURIComponent(url.hash.replace(/^#/, ""));
    } catch (error) {
      hashScreen = "";
    }
    return isKnownScreen(hashScreen) ? hashScreen : "menu";
  }

  function urlForScreen(screenName) {
    const url = new URL(window.location.href);
    if (screenName === "menu") {
      url.searchParams.delete(ROUTE_PARAMETER);
    } else {
      url.searchParams.set(ROUTE_PARAMETER, screenName);
    }
    url.hash = "";
    return url;
  }

  function updateAddress(screenName, historyMode) {
    if (historyMode === "none") {
      return;
    }

    const method = historyMode === "replace" ? "replaceState" : "pushState";
    try {
      window.history[method]({ screen: screenName }, "", urlForScreen(screenName).href);
    } catch (error) {
      // Some browsers restrict History API updates for local file URLs.
      // Navigation still works; only the visible address may remain unchanged.
    }
  }

  function updateDocumentTitle(screenName) {
    document.title = SCREEN_CONFIG[screenName].title;
  }

  function navigate(screenName, options = {}) {
    const nextScreen = screens.get(screenName);
    if (!nextScreen) {
      return false;
    }

    const historyMode = options.historyMode || "push";
    const shouldFocus = options.focus !== false;
    if (screenName === activeScreen) {
      updateAddress(screenName, historyMode);
      updateDocumentTitle(screenName);
      return true;
    }

    const previousScreen = activeScreen;
    screens.forEach((screen, name) => {
      const isActive = name === screenName;
      screen.classList.toggle("is-active", isActive);
      screen.setAttribute("aria-hidden", String(!isActive));
      if (!isActive) {
        screen.classList.remove("toolbar-hidden");
      }
    });

    activeScreen = screenName;
    document.body.dataset.screen = screenName;
    updateAddress(screenName, historyMode);
    updateDocumentTitle(screenName);
    window.clearTimeout(toolbarTimer);
    resetToolbarFade();
    window.dispatchEvent(new CustomEvent("timerscreenchange", {
      detail: { current: screenName, previous: previousScreen }
    }));

    const heading = nextScreen.querySelector("h1, h2");
    if (heading && shouldFocus) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
    return true;
  }

  function isTypingTarget(target) {
    return target instanceof HTMLElement && (
      target.matches("input, select, textarea") ||
      target.isContentEditable
    );
  }

  function handleKeyboard(event) {
    if (isTypingTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === " " && activeScreen !== "menu") {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent("timertoggle", {
        detail: { screen: activeScreen }
      }));
    } else if (key === "r" && activeScreen !== "menu") {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent("timerreset", {
        detail: { screen: activeScreen }
      }));
    } else if (key === "h") {
      event.preventDefault();
      navigate("menu");
    } else if (key === "f") {
      event.preventDefault();
      toggleFullscreen();
    }
  }

  function initialize() {
    document.querySelectorAll("[data-screen]").forEach((screen) => {
      screens.set(screen.dataset.screen, screen);
      screen.setAttribute("aria-hidden", String(!screen.classList.contains("is-active")));
    });

    document.querySelectorAll("[data-navigate]").forEach((control) => {
      control.addEventListener("click", (event) => {
        const isModifiedLinkClick = control instanceof HTMLAnchorElement && (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          control.target === "_blank"
        );
        if (isModifiedLinkClick) {
          return;
        }
        event.preventDefault();
        navigate(control.dataset.navigate);
      });
    });
    document.querySelectorAll(".fullscreen-button").forEach((button) => {
      button.addEventListener("click", toggleFullscreen);
    });

    document.addEventListener("fullscreenchange", updateFullscreenLabels);
    document.addEventListener("keydown", handleKeyboard);
    window.addEventListener("popstate", () => {
      navigate(screenFromLocation(), { historyMode: "none", focus: false });
    });
    window.addEventListener("hashchange", () => {
      navigate(screenFromLocation(), { historyMode: "replace", focus: false });
    });
    ["pointermove", "pointerdown", "touchstart"].forEach((eventName) => {
      document.addEventListener(eventName, resetToolbarFade, { passive: true });
    });
    document.addEventListener("focusin", resetToolbarFade);

    document.body.dataset.screen = activeScreen;
    updateDocumentTitle(activeScreen);
    window.setTimeout(() => {
      const initialScreen = screenFromLocation();
      if (initialScreen === activeScreen) {
        updateAddress(initialScreen, "replace");
      } else {
        navigate(initialScreen, { historyMode: "replace", focus: false });
      }
    }, 0);
  }

  window.TimerApp = {
    animation,
    storage,
    formatDuration,
    renderSevenSegment,
    renderPlainText,
    navigate,
    announce,
    toggleFullscreen,
    getScreenUrl: (screenName) => isKnownScreen(screenName)
      ? urlForScreen(screenName).href
      : null,
    getActiveScreen: () => activeScreen
  };

  document.addEventListener("DOMContentLoaded", initialize);
}());
