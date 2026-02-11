'use strict';

const DEFAULTS = {
  enabled: true,
  fontWeight: 600,
  fontSize: 14,
  textColor: '#1a1a1a'
};

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const toggleEnabled = document.getElementById('toggle-enabled');
  const fontWeightSlider = document.getElementById('fontWeight');
  const fontWeightValue = document.getElementById('fontWeight-value');
  const fontSizeSlider = document.getElementById('fontSize');
  const fontSizeValue = document.getElementById('fontSize-value');
  const textColorPicker = document.getElementById('textColor');
  const textColorValue = document.getElementById('textColor-value');
  const previewArea = document.getElementById('preview-area');
  const resetBtn = document.getElementById('reset-btn');

  // 未保存の変更があるかどうかのフラグ
  let hasPendingChanges = false;

  // プレビューを更新する
  function updatePreview() {
    previewArea.style.fontWeight = fontWeightSlider.value;
    previewArea.style.fontSize = fontSizeSlider.value + 'px';
    previewArea.style.color = textColorPicker.value;
  }

  // 現在のUI値から設定オブジェクトを構築する
  function getCurrentSettings() {
    return {
      enabled: toggleEnabled.checked,
      fontWeight: parseInt(fontWeightSlider.value, 10),
      fontSize: parseInt(fontSizeSlider.value, 10),
      textColor: textColorPicker.value
    };
  }

  // ストレージに保存する（エラーチェック付き）
  function saveToStorage() {
    const settings = getCurrentSettings();
    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        console.error('Settings save failed:', chrome.runtime.lastError.message);
      } else {
        console.log('Settings saved:', settings);
        hasPendingChanges = false;
      }
    });
  }

  // 未保存の変更をフラッシュする
  function flushPendingChanges() {
    if (hasPendingChanges) {
      saveToStorage();
    }
  }

  // デバウンスされた保存（150ms - ポップアップが閉じられる前に保存されるよう短縮）
  const debouncedSave = debounce(saveToStorage, 150);

  // 設定を読み込む
  function loadSettings() {
    chrome.storage.sync.get(DEFAULTS, (settings) => {
      if (chrome.runtime.lastError) {
        console.error('Settings load failed:', chrome.runtime.lastError.message);
        return;
      }
      toggleEnabled.checked = settings.enabled;
      fontWeightSlider.value = settings.fontWeight;
      fontWeightValue.textContent = settings.fontWeight;
      fontSizeSlider.value = settings.fontSize;
      fontSizeValue.textContent = settings.fontSize + 'px';
      textColorPicker.value = settings.textColor;
      textColorValue.textContent = settings.textColor;
      updatePreview();
    });
  }

  // ポップアップが閉じられる直前に未保存の設定をフラッシュする
  window.addEventListener('beforeunload', flushPendingChanges);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingChanges();
    }
  });

  // イベントリスナー設定
  toggleEnabled.addEventListener('change', () => {
    saveToStorage();
  });

  fontWeightSlider.addEventListener('input', () => {
    fontWeightValue.textContent = fontWeightSlider.value;
    updatePreview();
    hasPendingChanges = true;
    debouncedSave();
  });

  fontWeightSlider.addEventListener('change', () => {
    flushPendingChanges();
  });

  fontSizeSlider.addEventListener('input', () => {
    fontSizeValue.textContent = fontSizeSlider.value + 'px';
    updatePreview();
    hasPendingChanges = true;
    debouncedSave();
  });

  fontSizeSlider.addEventListener('change', () => {
    flushPendingChanges();
  });

  textColorPicker.addEventListener('input', () => {
    textColorValue.textContent = textColorPicker.value;
    updatePreview();
    hasPendingChanges = true;
    debouncedSave();
  });

  textColorPicker.addEventListener('change', () => {
    flushPendingChanges();
  });

  // リセットボタン
  resetBtn.addEventListener('click', () => {
    hasPendingChanges = false;
    chrome.storage.sync.set(DEFAULTS, () => {
      if (chrome.runtime.lastError) {
        console.error('Reset failed:', chrome.runtime.lastError.message);
        return;
      }
      console.log('Settings reset to defaults');
      loadSettings();
    });
  });

  // 初期読み込み
  loadSettings();
});
