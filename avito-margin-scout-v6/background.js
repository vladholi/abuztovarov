'use strict';
chrome.notifications.onClicked.addListener(async (notificationId) => {
  try {
    const { notificationTargets = {} } = await chrome.storage.local.get('notificationTargets');
    const url = notificationTargets[notificationId];
    if (url && /^https:\/\/(?:www\.)?avito\.ru\//.test(url)) await chrome.tabs.create({ url });
    else await chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    await chrome.notifications.clear(notificationId);
  } catch (e) { console.warn('Cannot open notification:', e); }
});
