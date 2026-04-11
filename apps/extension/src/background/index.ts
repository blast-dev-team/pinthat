// Service worker — keyboard shortcut relay + popup→content message relay.
//
// Identity and payments are handled entirely via Supabase auth (popup)
// and the pinthat-auth worker (Stripe checkout). GitHub OAuth is no
// longer used.

interface ContentMessage {
  target?: 'content';
  action: string;
  [key: string]: unknown;
}

// Keyboard shortcut → content script
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-qa') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId != null) {
        chrome.tabs.sendMessage(tabId, { action: 'toggle-qa' }).catch(() => {});
      }
    });
  }
});

// popup → content relay
chrome.runtime.onMessage.addListener((msg: ContentMessage, _sender, sendResponse) => {
  if (msg.target === 'content') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId != null) {
        chrome.tabs
          .sendMessage(tabId, msg)
          .then(sendResponse)
          .catch(() => sendResponse(null));
      } else {
        sendResponse(null);
      }
    });
    return true;
  }
  return false;
});

export {};
