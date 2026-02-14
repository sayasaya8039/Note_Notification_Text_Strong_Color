// Note Notification Text Strong Color - Background Service Worker

var openerMap = new Map();

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "openNewTab" && message.url && sender.tab) {
    chrome.tabs.create(
      { url: message.url, openerTabId: sender.tab.id },
      function (newTab) {
        if (newTab && newTab.id) {
          openerMap.set(newTab.id, sender.tab.id);
        }
      }
    );
  }
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  var originalTabId = openerMap.get(tabId);
  if (originalTabId != null) {
    openerMap.delete(tabId);
    chrome.tabs.update(originalTabId, { active: true }).catch(function () {});
  }
});
