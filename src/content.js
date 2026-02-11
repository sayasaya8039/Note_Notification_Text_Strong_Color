// Note Notification Text Strong Color - Content Script

(function () {
  "use strict";

  // Default settings
  const DEFAULTS = {
    enabled: true,
    fontWeight: 600,
    fontSize: 14,
    textColor: "#1a1a1a",
  };

  // Notification-related selectors for MutationObserver targeting
  const NOTIF_SELECTORS = [
    '[class*="notifPanel"]',
    '[class*="NotifPanel"]',
    '[class*="notificationPanel"]',
    '[class*="notifItem"]',
    '[class*="NotifItem"]',
    '[class*="notificationItem"]',
    '[class*="notifText"]',
    '[class*="notifBody"]',
    '[class*="notifContent"]',
    '[class*="NotifText"]',
    '[class*="NotifBody"]',
    '[class*="NotifContent"]',
    '[class*="navbarNotif"]',
    '[class*="NotifButton"]',
  ];

  const COMBINED_SELECTOR = NOTIF_SELECTORS.join(", ");

  /**
   * Apply CSS custom properties to :root based on settings
   */
  function applyCSSVariables(settings) {
    const root = document.documentElement;

    if (!settings.enabled) {
      // Reset to browser defaults when disabled
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
   * Apply inline styles to a notification element for reinforcement
   */
  function applyStylesToElement(el, settings) {
    if (!settings.enabled) return;

    el.style.setProperty("font-weight", String(settings.fontWeight), "important");
    el.style.setProperty("font-size", settings.fontSize + "px", "important");
    el.style.setProperty("color", settings.textColor, "important");
    el.style.setProperty("line-height", "1.6", "important");
    el.style.setProperty("letter-spacing", "0.02em", "important");
    el.style.setProperty("-webkit-font-smoothing", "antialiased", "important");
    el.style.setProperty("text-rendering", "optimizeLegibility", "important");
  }

  /**
   * Scan and style all notification elements currently in the DOM
   */
  function styleExistingNotifications(settings) {
    if (!settings.enabled) return;

    const elements = document.querySelectorAll(COMBINED_SELECTOR);
    elements.forEach(function (el) {
      applyStylesToElement(el, settings);

      // Also style child text elements (a, p, span)
      const children = el.querySelectorAll("a, p, span");
      children.forEach(function (child) {
        applyStylesToElement(child, settings);
      });
    });
  }

  /**
   * Remove applied inline styles from all notification elements
   */
  function removeStyles() {
    const elements = document.querySelectorAll(COMBINED_SELECTOR);
    elements.forEach(function (el) {
      el.style.removeProperty("font-weight");
      el.style.removeProperty("font-size");
      el.style.removeProperty("color");
      el.style.removeProperty("line-height");
      el.style.removeProperty("letter-spacing");
      el.style.removeProperty("-webkit-font-smoothing");
      el.style.removeProperty("text-rendering");

      var children = el.querySelectorAll("a, p, span");
      children.forEach(function (child) {
        child.style.removeProperty("font-weight");
        child.style.removeProperty("font-size");
        child.style.removeProperty("color");
        child.style.removeProperty("line-height");
        child.style.removeProperty("letter-spacing");
        child.style.removeProperty("-webkit-font-smoothing");
        child.style.removeProperty("text-rendering");
      });
    });
  }

  /**
   * Check if a node or its descendants match notification selectors
   */
  function isNotificationRelated(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    if (node.matches && node.matches(COMBINED_SELECTOR)) return true;
    if (node.querySelector && node.querySelector(COMBINED_SELECTOR)) return true;
    return false;
  }

  // Current settings (kept in memory for MutationObserver callback)
  let currentSettings = Object.assign({}, DEFAULTS);

  /**
   * MutationObserver callback
   */
  function onMutation(mutations) {
    if (!currentSettings.enabled) return;

    let needsUpdate = false;

    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];

      // Check added nodes
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let j = 0; j < mutation.addedNodes.length; j++) {
          if (isNotificationRelated(mutation.addedNodes[j])) {
            needsUpdate = true;
            break;
          }
        }
      }

      // Check attribute changes on notification elements
      if (
        mutation.type === "attributes" &&
        mutation.target.nodeType === Node.ELEMENT_NODE
      ) {
        if (isNotificationRelated(mutation.target)) {
          needsUpdate = true;
        }
      }

      if (needsUpdate) break;
    }

    if (needsUpdate) {
      styleExistingNotifications(currentSettings);
    }
  }

  // Set up MutationObserver
  const observer = new MutationObserver(onMutation);

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  /**
   * Initialize: load settings and apply
   */
  function init() {
    chrome.storage.sync.get(DEFAULTS, function (items) {
      currentSettings = {
        enabled: items.enabled,
        fontWeight: items.fontWeight,
        fontSize: items.fontSize,
        textColor: items.textColor,
      };

      applyCSSVariables(currentSettings);

      if (currentSettings.enabled) {
        styleExistingNotifications(currentSettings);
      }
    });
  }

  /**
   * Listen for settings changes from popup or options page
   */
  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "sync") return;

    let updated = false;

    if (changes.enabled !== undefined) {
      currentSettings.enabled = changes.enabled.newValue;
      updated = true;
    }
    if (changes.fontWeight !== undefined) {
      currentSettings.fontWeight = changes.fontWeight.newValue;
      updated = true;
    }
    if (changes.fontSize !== undefined) {
      currentSettings.fontSize = changes.fontSize.newValue;
      updated = true;
    }
    if (changes.textColor !== undefined) {
      currentSettings.textColor = changes.textColor.newValue;
      updated = true;
    }

    if (updated) {
      applyCSSVariables(currentSettings);

      if (currentSettings.enabled) {
        styleExistingNotifications(currentSettings);
      } else {
        removeStyles();
      }
    }
  });

  // Run initialization
  if (document.body) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
