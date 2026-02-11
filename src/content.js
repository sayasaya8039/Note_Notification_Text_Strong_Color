// Note Notification Text Strong Color - Content Script

(function () {
  "use strict";

  const DEFAULTS = {
    enabled: true,
    fontWeight: 600,
    fontSize: 14,
    textColor: "#1a1a1a",
  };

  const SELECTOR =
    '[class*="notifPanel"],[class*="NotifPanel"],[class*="notificationPanel"],' +
    '[class*="notifItem"],[class*="NotifItem"],[class*="notificationItem"],' +
    '[class*="notifText"],[class*="notifBody"],[class*="notifContent"],' +
    '[class*="NotifText"],[class*="NotifBody"],[class*="NotifContent"],' +
    '[class*="navbarNotif"],[class*="NotifButton"]';

  let currentSettings = Object.assign({}, DEFAULTS);
  let settingsLoaded = false;
  let rafId = 0;
  let cssCheckInterval = null;
  let lastUrl = location.href;

  // ── CSS Variables ──────────────────────────────────────────

  function applyCSSVariables(settings) {
    const root = document.documentElement;
    if (!settings.enabled) {
      root.style.removeProperty("--nnts-font-weight");
      root.style.removeProperty("--nnts-font-size");
      root.style.removeProperty("--nnts-text-color");
      return;
    }
    root.style.setProperty("--nnts-font-weight", String(settings.fontWeight));
    root.style.setProperty("--nnts-font-size", settings.fontSize + "px");
    root.style.setProperty("--nnts-text-color", settings.textColor);
  }

  function ensureCSSVariables() {
    if (!settingsLoaded || !currentSettings.enabled) return;
    const root = document.documentElement;
    const current = root.style.getPropertyValue("--nnts-font-weight");
    if (!current || current !== String(currentSettings.fontWeight)) {
      applyCSSVariables(currentSettings);
    }
  }

  // ── Inline Styles ─────────────────────────────────────────

  function applyInline(el) {
    el.style.setProperty("font-weight", String(currentSettings.fontWeight), "important");
    el.style.setProperty("font-size", currentSettings.fontSize + "px", "important");
    el.style.setProperty("color", currentSettings.textColor, "important");
  }

  function styleAll() {
    if (!settingsLoaded || !currentSettings.enabled) return;
    var els = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < els.length; i++) {
      applyInline(els[i]);
      var children = els[i].querySelectorAll("a,p,span");
      for (var j = 0; j < children.length; j++) {
        applyInline(children[j]);
      }
    }
  }

  function removeAllInlineStyles() {
    var els = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < els.length; i++) {
      els[i].style.removeProperty("font-weight");
      els[i].style.removeProperty("font-size");
      els[i].style.removeProperty("color");
      var children = els[i].querySelectorAll("a,p,span");
      for (var j = 0; j < children.length; j++) {
        children[j].style.removeProperty("font-weight");
        children[j].style.removeProperty("font-size");
        children[j].style.removeProperty("color");
      }
    }
  }

  function scheduleStyle() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      styleAll();
    });
  }

  // ── MutationObserver ──────────────────────────────────────

  function containsNotifNode(node) {
    if (node.nodeType !== 1) return false;
    var cn = node.className;
    if (typeof cn === "string" && (cn.indexOf("otif") !== -1 || cn.indexOf("Notif") !== -1)) {
      return true;
    }
    try {
      if (node.querySelector && node.querySelector(SELECTOR)) {
        return true;
      }
    } catch (e) {
      // ignore
    }
    return false;
  }

  var observer = new MutationObserver(function (mutations) {
    if (!settingsLoaded || !currentSettings.enabled) return;
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      if (!added || added.length === 0) continue;
      for (var j = 0; j < added.length; j++) {
        if (containsNotifNode(added[j])) {
          scheduleStyle();
          return;
        }
      }
    }
  });

  // ── SPA Navigation Detection ──────────────────────────────

  function onNavigation() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    if (!settingsLoaded) return;
    applyCSSVariables(currentSettings);
    scheduleStyle();
  }

  function patchHistoryMethod(method) {
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      onNavigation();
      return result;
    };
  }

  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");
  window.addEventListener("popstate", onNavigation);

  // ── Visibility Change ─────────────────────────────────────

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      if (!settingsLoaded) return;
      ensureCSSVariables();
      scheduleStyle();
    }
  });

  // ── Periodic CSS Variable Check (fallback, every 5s) ──────

  function startCSSCheck() {
    if (cssCheckInterval) return;
    cssCheckInterval = setInterval(function () {
      ensureCSSVariables();
    }, 5000);
  }

  function stopCSSCheck() {
    if (cssCheckInterval) {
      clearInterval(cssCheckInterval);
      cssCheckInterval = null;
    }
  }

  // ── Settings Listener ─────────────────────────────────────

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "sync") return;
    var updated = false;
    ["enabled", "fontWeight", "fontSize", "textColor"].forEach(function (key) {
      if (changes[key] !== undefined) {
        currentSettings[key] = changes[key].newValue;
        updated = true;
      }
    });
    if (!updated) return;

    applyCSSVariables(currentSettings);
    if (currentSettings.enabled) {
      styleAll();
      startCSSCheck();
    } else {
      removeAllInlineStyles();
      stopCSSCheck();
    }
  });

  // ── Initialize ────────────────────────────────────────────

  function init() {
    chrome.storage.sync.get(DEFAULTS, function (items) {
      currentSettings = items;
      settingsLoaded = true;
      applyCSSVariables(currentSettings);
      if (currentSettings.enabled) {
        styleAll();
        startCSSCheck();
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
