// Service worker — keyboard shortcut relay + popup→content message relay.
//
// Identity and payments are handled entirely via Supabase auth (popup)
// and the pinthat-auth worker (Stripe checkout). GitHub OAuth is no
// longer used.

import { getAccessAllowed } from '../shared/access';

interface ContentMessage {
  target?: 'content';
  action: string;
  [key: string]: unknown;
}

async function sendWithRetry(tabId: number, message: Record<string, unknown>): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
      return;
    } catch {
      if (attempt < 4) await new Promise((r) => setTimeout(r, 500));
    }
  }
}

// Keyboard shortcut → content script. Only relayed if the signed-in user
// has a paid plan — the popup keeps the cached access flag fresh.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-qa') return;
  if (!(await getAccessAllowed())) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id != null) {
    await sendWithRetry(tab.id, { action: 'toggle-qa' });
  }
});

// popup → content relay
chrome.runtime.onMessage.addListener((msg: ContentMessage, _sender, sendResponse) => {
  // Capture visible tab for snapshot feature
  if (msg.action === 'capture-tab') {
    chrome.tabs.captureVisibleTab({ format: 'png' })
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch((err) => sendResponse({ error: String(err) }));
    return true;
  }

  // Download markdown file
  if (msg.action === 'download-md') {
    const content = msg.content as string;
    const filename = msg.filename as string;
    const blob = new Blob([content], { type: 'text/markdown' });
    const reader = new FileReader();
    reader.onloadend = () => {
      chrome.downloads.download({
        url: reader.result as string,
        filename,
        saveAs: true,
      })
        .then((id) => sendResponse({ downloadId: id }))
        .catch((err) => sendResponse({ error: String(err) }));
    };
    reader.readAsDataURL(blob);
    return true;
  }

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
