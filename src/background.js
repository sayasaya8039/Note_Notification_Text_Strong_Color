// Note Notification Text Strong Color - Background Service Worker
// Service Worker はスリープするため、chrome.storage.session で永続化する

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "openNewTab" && message.url && sender.tab) {
    var originalTabId = sender.tab.id;
    chrome.tabs.create(
      { url: message.url, openerTabId: originalTabId },
      function (newTab) {
        if (newTab && newTab.id) {
          chrome.storage.session.get({ openerMap: {} }, function (data) {
            var map = data.openerMap || {};
            map[String(newTab.id)] = originalTabId;
            chrome.storage.session.set({ openerMap: map });
          });
        }
      }
    );
  }
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  chrome.storage.session.get({ openerMap: {} }, function (data) {
    var map = data.openerMap || {};
    var key = String(tabId);
    var originalTabId = map[key];
    if (originalTabId != null) {
      delete map[key];
      chrome.storage.session.set({ openerMap: map });
      chrome.tabs.update(originalTabId, { active: true }).catch(function () {});
    }
  });
});
