// Service worker — 메시지 중계 + 단축키 처리
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-qa') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle-qa' });
      }
    });
  }
});

// popup.js → content script 메시지 중계
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === 'content') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, msg, sendResponse);
      }
    });
    return true;
  }
});
