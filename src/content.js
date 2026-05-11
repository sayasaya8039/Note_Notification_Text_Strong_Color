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
  // note.comのお知らせ/通知オーバーレイリンクを探し、実アイテム内にだけ
  // ボタンを1つ追加する。パネル直下や空リンクには追加しない。

  var NEW_TAB_BTN_CLASS = "nnts-new-tab-btn";
  var NEW_TAB_ADDED_ATTR = "data-nnts-new-tab-added";
  var newTabScanInterval = null;

  function getClassName(el) {
    return (el && typeof el.className === "string") ? el.className : "";
  }

  function getNormalizedClassName(el) {
    return getClassName(el).toLowerCase();
  }

  function isSafeNoteUrl(href) {
    try {
      var url = new URL(href, location.href);
      return url.protocol === "https:" &&
        (url.hostname === "note.com" || url.hostname.slice(-9) === ".note.com");
    } catch (e) {
      return false;
    }
  }

  function isNoticeItemElement(el) {
    if (!el || el.tagName === "A") return false;
    var cn = getNormalizedClassName(el);
    if (cn.indexOf("__link") !== -1) return false;
    if (isNoticeContainerElement(el)) {
      return false;
    }
    return cn.indexOf("navbarnoticeitem") !== -1 ||
      cn.indexOf("noticeitem") !== -1 ||
      cn.indexOf("notificationitem") !== -1 ||
      cn.indexOf("notifitem") !== -1;
  }

  function isNoticeContainerElement(el) {
    var cn = getNormalizedClassName(el);
    return cn.indexOf("list") !== -1 ||
      cn.indexOf("panel") !== -1 ||
      cn.indexOf("tabs") !== -1 ||
      cn.indexOf("tab") !== -1 ||
      cn.indexOf("header") !== -1 ||
      cn.indexOf("footer") !== -1 ||
      cn.indexOf("container") !== -1 ||
      cn.indexOf("wrapper") !== -1 ||
      cn.indexOf("scroll") !== -1;
  }

  function hasNoticeText(el) {
    var text = (el.textContent || "")
      .replace(/\u21D7\s*\u65B0\u3057\u3044\u30BF\u30D6\u3067\u958B\u304F/g, "")
      .replace(/\s+/g, "");
    return text.length > 0;
  }

  function hasSingleOverlay(el) {
    try {
      return el.querySelectorAll('a[class*="navbarNoticeItem__link"]').length === 1;
    } catch (e) {
      return false;
    }
  }

  function hasOneOverlayOnly(el) {
    try {
      return el.querySelectorAll('a[class*="navbarNoticeItem__link"][href]').length === 1;
    } catch (e) {
      return false;
    }
  }

  function isValidNoticeItemForButton(el) {
    if (!el || el.tagName === "BODY" || el.tagName === "HTML") return false;
    if (isNoticeContainerElement(el)) return false;
    if (!hasOneOverlayOnly(el) || !hasNoticeText(el)) return false;
    return isNoticeItemElement(el) || hasSingleOverlay(el);
  }

  function findNoticeItemFromOverlay(overlay) {
    var el = overlay ? overlay.parentElement : null;
    for (var depth = 0; el && depth < 8; depth++) {
      if (isValidNoticeItemForButton(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

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

  function cleanupDetachedNewTabButtons() {
    var btns = document.querySelectorAll("." + NEW_TAB_BTN_CLASS);
    for (var i = 0; i < btns.length; i++) {
      if (!isValidNoticeItemForButton(btns[i].parentElement)) {
        btns[i].remove();
      }
    }
    var marked = document.querySelectorAll("[" + NEW_TAB_ADDED_ATTR + "]");
    for (var j = 0; j < marked.length; j++) {
      if (!isValidNoticeItemForButton(marked[j])) {
        marked[j].removeAttribute(NEW_TAB_ADDED_ATTR);
      }
    }
  }

  function addNewTabButtons() {
    if (!settingsLoaded || !currentSettings.newTabButton) return;
    cleanupDetachedNewTabButtons();

    // note.comの実際の構造:
    // <div class="m-navbarNoticeItem ...">        ← 通知アイテム(親)
    //   <a class="m-navbarNoticeItem__link ..." href="..." aria-hidden="true">&nbsp;</a>  ← オーバーレイ
    //   <div>... 通知コンテンツ ...</div>
    // </div>
    //
    // この <a> オーバーレイを見つけ、本文を持つ最小の祖先をアイテムとして扱う。

    var overlays = document.querySelectorAll('a[class*="navbarNoticeItem__link"][href]');
    for (var i = 0; i < overlays.length; i++) {
      var overlay = overlays[i];
      var href = overlay.href;
      if (!href || href === "#" || !isSafeNoteUrl(href)) continue;

      var item = findNoticeItemFromOverlay(overlay);
      if (!item) continue;

      var existing = item.querySelector("." + NEW_TAB_BTN_CLASS);
      if (existing) {
        if (existing.getAttribute("data-href") !== href) {
          existing.setAttribute("data-href", href);
        }
        item.setAttribute(NEW_TAB_ADDED_ATTR, "true");
        continue;
      }
      if (item.getAttribute(NEW_TAB_ADDED_ATTR) === "true") continue;

      // お知らせ/通知アイテム内に閉じて挿入し、パネル上部への孤立表示を防ぐ。
      item.appendChild(createNewTabLink(href));
      item.setAttribute(NEW_TAB_ADDED_ATTR, "true");
    }
  }

  function removeNewTabButtons() {
    var btns = document.querySelectorAll("." + NEW_TAB_BTN_CLASS);
    for (var i = 0; i < btns.length; i++) {
      btns[i].remove();
    }
    var items = document.querySelectorAll("[" + NEW_TAB_ADDED_ATTR + "]");
    for (var j = 0; j < items.length; j++) {
      items[j].removeAttribute(NEW_TAB_ADDED_ATTR);
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
