// Popup 스크립트 — 토글 상태 동기화 및 세션 목록 열기
const qaToggle = document.getElementById('qaToggle');
const feedbackCount = document.getElementById('feedbackCount');
const sessionListBtn = document.getElementById('sessionListBtn');

// 현재 탭의 content script에서 상태 가져오기
function syncStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'get-status' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res) {
        qaToggle.checked = res.active;
        feedbackCount.textContent = res.feedbackCount;
      }
    });
  });
}

// QA 모드 토글 — 직접 탭에 메시지 전송
qaToggle.addEventListener('change', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle-qa' });
    }
  });
});

// 세션 목록 열기
sessionListBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'open-session-list' });
    }
  });
  window.close();
});

syncStatus();
