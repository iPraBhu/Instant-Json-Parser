const POPUP_URL = chrome.runtime.getURL('popup/popup.html');
const CONTEXT_MENU_IDS = {
  PASTE: 'instant-json-parser-paste',
  FORMAT: 'instant-json-parser-format'
};

chrome.runtime.onInstalled.addListener((details) => {
  console.info('[Instant JSON Parser] Installed:', details.reason);
  setupContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenus();
});

chrome.contextMenus?.onClicked.addListener((info) => {
  if (
    info.menuItemId === CONTEXT_MENU_IDS.PASTE ||
    info.menuItemId === CONTEXT_MENU_IDS.FORMAT
  ) {
    openPopup();
  }
});

chrome.action.onClicked.addListener(() => {
  openPopup();
});

function setupContextMenus() {
  if (!chrome.contextMenus) {
    return;
  }
  chrome.contextMenus.removeAll(() => {
    const pasteTitle =
      chrome.i18n?.getMessage('contextMenuPaste') ||
      'Open Instant JSON Parser (Paste)';
    const formatTitle =
      chrome.i18n?.getMessage('contextMenuFormat') ||
      'Open Instant JSON Parser';
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.PASTE,
      title: pasteTitle,
      contexts: ['action']
    });
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.FORMAT,
      title: formatTitle,
      contexts: ['selection', 'page']
    });
  });
}

function openPopup() {
  if (chrome.action?.openPopup) {
    chrome.action.openPopup().catch(() => {
      chrome.tabs.create({ url: POPUP_URL });
    });
  } else {
    chrome.tabs.create({ url: POPUP_URL });
  }
}
