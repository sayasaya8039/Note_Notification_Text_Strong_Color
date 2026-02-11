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
  let rafId = 0;

  /**
   * Apply CSS custom properties to :root
   */
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

  /**
   * Apply inline styles to a single element (highest cascade priority)
   */
  function applyInline(el) {
    el.style.setProperty("font-weight", String(currentSettings.fontWeight), "important");
    el.style.setProperty("font-size", currentSettings.fontSize + "px", "important");
    el.style.setProperty("color", currentSettings.textColor, "important");
  }

  /**
   * Scan and style all notification elements + their child text nodes
   */
  function styleAll() {
    if (!currentSettings.enabled) return;
    var els = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < els.length; i++) {
      applyInline(els[i]);
      var children = els[i].querySelectorAll("a,p,span");
      for (var j = 0; j < children.length; j++) {
        applyInline(children[j]);
      }
    }
  }

  /**
   * Schedule styleAll via requestAnimationFrame (batched, max once per frame)
   */
  function scheduleStyle() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      styleAll();
    });
  }

  /**
   * Quick check if a node is notification-related (lightweight)
   */
  function isNotifNode(node) {
    if (node.nodeType !== 1) return false;
    var cn = node.className;
    if (typeof cn === "string" && (cn.indexOf("otif") !== -1 || cn.indexOf("Notif") !== -1)) return true;
    return false;
  }

  /**
   * MutationObserver callback - childList only, no attributes
   */
  var observer = new MutationObserver(function (mutations) {
    if (!currentSettings.enabled) return;
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      if (!added || added.length === 0) continue;
      for (var j = 0; j < added.length; j++) {
        if (isNotifNode(added[j])) {
          scheduleStyle();
          return;
        }
      }
    }
  });

  /**
   * Initialize
   */
  function init() {
    chrome.storage.sync.get(DEFAULTS, function (items) {
      currentSettings = items;
      applyCSSVariables(currentSettings);
      if (currentSettings.enabled) styleAll();
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Listen for settings changes
   */
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
    } else {
      // Remove inline styles
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
  });

  // Run
  if (document.body) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
