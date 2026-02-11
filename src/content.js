// Note Notification Text Strong Color - Content Script

(function () {
  "use strict";

  const DEFAULTS = {
    enabled: true,
    fontWeight: 600,
    fontSize: 14,
    textColor: "#1a1a1a",
  };

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

  chrome.storage.sync.get(DEFAULTS, function (items) {
    applyCSSVariables(items);
  });

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "sync") return;

    chrome.storage.sync.get(DEFAULTS, function (items) {
      applyCSSVariables(items);
    });
  });
})();
