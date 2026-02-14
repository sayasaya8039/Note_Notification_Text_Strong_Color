// Note Notification Text Strong Color - Background Service Worker

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "openNewTab" && message.url) {
    chrome.tabs.create({ url: message.url, openerTabId: sender.tab.id });
  }
});
