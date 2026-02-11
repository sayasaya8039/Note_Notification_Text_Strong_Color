'use strict';

const DEFAULTS = {
  enabled: true,
  fontWeight: 600,
  fontSize: 14,
  textColor: '#1a1a1a'
};

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
      updatePreview(settings);
    });
  }

  // プレビューを更新する
  function updatePreview(settings) {
    previewArea.style.fontWeight = settings.fontWeight;
    previewArea.style.fontSize = settings.fontSize + 'px';
    previewArea.style.color = settings.textColor;
  }

  // 設定を保存する
  function saveSettings() {
    const settings = {
      enabled: toggleEnabled.checked,
      fontWeight: parseInt(fontWeightSlider.value, 10),
      fontSize: parseInt(fontSizeSlider.value, 10),
      textColor: textColorPicker.value
    };
    chrome.storage.sync.set(settings);
    updatePreview(settings);
  }

  // イベントリスナー設定
  toggleEnabled.addEventListener('change', saveSettings);

  fontWeightSlider.addEventListener('input', () => {
    fontWeightValue.textContent = fontWeightSlider.value;
    saveSettings();
  });

  fontSizeSlider.addEventListener('input', () => {
    fontSizeValue.textContent = fontSizeSlider.value + 'px';
    saveSettings();
  });

  textColorPicker.addEventListener('input', () => {
    textColorValue.textContent = textColorPicker.value;
    saveSettings();
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
