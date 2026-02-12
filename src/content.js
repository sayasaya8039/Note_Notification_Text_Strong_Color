// Note Notification Text Strong Color - Content Script

(function () {
  "use strict";

  const DEFAULTS = {
    enabled: true,
    fontWeight: 600,
    fontSize: 14,
    textColor: "#1a1a1a",
    newTabButton: true,
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
    // 新しいタブボタンには適用しない（ボタン独自のスタイルを維持）
    if (el.classList && el.classList.contains("nnts-new-tab-btn")) return;
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

  // ── New Tab Buttons ─────────────────────────────────────
  // note.comの通知オーバーレイリンク（m-navbarNoticeItem__link）を直接探し、
  // その親要素（=通知アイテム）の末尾にボタンを1つだけ追加する。

  var NEW_TAB_BTN_CLASS = "nnts-new-tab-btn";
  var newTabScanInterval = null;

  function createNewTabLink(href) {
    var span = document.createElement("span");
    span.className = NEW_TAB_BTN_CLASS;
    span.setAttribute("role", "link");
    span.setAttribute("tabindex", "0");
    span.setAttribute("data-href", href);
    span.textContent = "\u21D7 \u65B0\u3057\u3044\u30BF\u30D6\u3067\u958B\u304F";
    return span;
  }

  // pointerdown でタブを開く（window キャプチャフェーズ = 最速）
  function findNewTabBtn(e) {
    var target = e.target;
    return target.closest ? target.closest("." + NEW_TAB_BTN_CLASS) : null;
  }
  function onPointerDown(e) {
    var btn = findNewTabBtn(e);
    if (!btn) return;
    var href = btn.getAttribute("data-href");
    if (!href) return;
    e.stopPropagation();
    e.stopImmediatePropagation();
    chrome.runtime.sendMessage({ type: "openNewTab", url: href });
  }
  function blockIfBtn(e) {
    if (!findNewTabBtn(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("mousedown", blockIfBtn, true);
  window.addEventListener("mouseup", blockIfBtn, true);
  window.addEventListener("pointerup", blockIfBtn, true);
  window.addEventListener("click", blockIfBtn, true);

  function addNewTabButtons() {
    if (!settingsLoaded || !currentSettings.newTabButton) return;

    // note.comの実際の構造:
    // <div class="m-navbarNoticeItem ...">        ← 通知アイテム(親)
    //   <a class="m-navbarNoticeItem__link ..." href="..." aria-hidden="true">&nbsp;</a>  ← オーバーレイ
    //   <div>... 通知コンテンツ ...</div>
    // </div>
    //
    // この <a> オーバーレイを見つけ、その親をアイテムとして扱う。

    var overlays = document.querySelectorAll('a[class*="navbarNoticeItem__link"]');
    for (var i = 0; i < overlays.length; i++) {
      var overlay = overlays[i];
      var href = overlay.href;
      if (!href || href === "#") continue;

      var item = overlay.parentElement;
      if (!item) continue;

      // 既にボタンがあればスキップ（アイテムの直後のsiblingをチェック）
      var next = item.nextElementSibling;
      if (next && next.classList.contains(NEW_TAB_BTN_CLASS)) continue;

      // 通知アイテムの直後（下）に挿入
      item.insertAdjacentElement("afterend", createNewTabLink(href));
    }
  }

  function removeNewTabButtons() {
    var btns = document.querySelectorAll("." + NEW_TAB_BTN_CLASS);
    for (var i = 0; i < btns.length; i++) {
      btns[i].remove();
    }
  }

  // 通知パネルは動的生成されるため、定期スキャンで補完
  function startNewTabScan() {
    if (newTabScanInterval) return;
    newTabScanInterval = setInterval(function () {
      if (!settingsLoaded || !currentSettings.enabled || !currentSettings.newTabButton) return;
      addNewTabButtons();
    }, 1000);
  }

  function stopNewTabScan() {
    if (newTabScanInterval) {
      clearInterval(newTabScanInterval);
      newTabScanInterval = null;
    }
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
          if (currentSettings.newTabButton) {
            setTimeout(addNewTabButtons, 200);
          }
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
    ["enabled", "fontWeight", "fontSize", "textColor", "newTabButton"].forEach(function (key) {
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
      if (currentSettings.newTabButton) {
        addNewTabButtons();
        startNewTabScan();
      } else {
        removeNewTabButtons();
        stopNewTabScan();
      }
    } else {
      removeAllInlineStyles();
      removeNewTabButtons();
      stopCSSCheck();
      stopNewTabScan();
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
        if (currentSettings.newTabButton) {
          addNewTabButtons();
          startNewTabScan();
        }
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
