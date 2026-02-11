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
      }
    });
  }

  // デバウンスされた保存（300ms）
  const debouncedSave = debounce(saveToStorage, 300);

  // 設定を読み込む
  function loadSettings() {
    chrome.storage.sync.get(DEFAULTS, (settings) => {
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

  // イベントリスナー設定
  toggleEnabled.addEventListener('change', () => {
    saveToStorage();
  });

  fontWeightSlider.addEventListener('input', () => {
    fontWeightValue.textContent = fontWeightSlider.value;
    updatePreview();
    debouncedSave();
  });

  fontSizeSlider.addEventListener('input', () => {
    fontSizeValue.textContent = fontSizeSlider.value + 'px';
    updatePreview();
    debouncedSave();
  });

  textColorPicker.addEventListener('input', () => {
    textColorValue.textContent = textColorPicker.value;
    updatePreview();
    debouncedSave();
  });

  // リセットボタン
  resetBtn.addEventListener('click', () => {
    chrome.storage.sync.set(DEFAULTS, () => {
      loadSettings();
    });
  });

  // 初期読み込み
  loadSettings();
});
