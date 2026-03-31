(function() {
  'use strict';

  /* ===== State ===== */
  const STATE = {
    active: false,
    mode: 'element',
    feedbacks: [],
    nextId: 1,
    panelCollapsed: false,
    panelPos: null,
    reviewMode: false,
    reviewSessionId: null,
    savedFeedbacksBeforeReview: null,
    moveMode: false,
    moveSource: null,
  };

  /* ===== Storage (chrome.storage.local) ===== */
  let currentUrl = location.origin + location.pathname;
  function getStorageKey() { return 'qa-feedbacks-' + currentUrl; }
  const SESSIONS_KEY = 'qa-sessions';

  async function saveFeedbacks() {
    try {
      const data = STATE.feedbacks.map(fb => ({ ...fb, el: null }));
      await chrome.storage.local.set({ [getStorageKey()]: { feedbacks: data, nextId: STATE.nextId } });
    } catch(e) {}
  }

  async function restoreFeedbacks() {
    try {
      const result = await chrome.storage.local.get(getStorageKey());
      const saved = result[getStorageKey()];
      if (!saved) return;
      const { feedbacks, nextId } = saved;
      if (!feedbacks || feedbacks.length === 0) return;

      STATE.feedbacks = feedbacks;
      STATE.nextId = nextId || feedbacks.length + 1;

      feedbacks.forEach(fb => {
        if (fb.selector) {
          const el = document.querySelector(fb.selector);
          if (el) {
            fb.el = el;
            if (fb.fbType === '\uC704\uCE58\uC774\uB3D9') {
              addMoveOverlay(el, fb.id);
            } else {
              addOverlay(el, fb.id);
            }
          }
        }
      });

      updateCount();
    } catch(e) {}
  }

  async function getSessionsData() {
    try {
      const result = await chrome.storage.local.get(SESSIONS_KEY);
      return result[SESSIONS_KEY] || { sessions: [] };
    } catch(e) { return { sessions: [] }; }
  }

  async function saveSessionsData(data) {
    await chrome.storage.local.set({ [SESSIONS_KEY]: data });
  }

  async function cleanOldSessions(data) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const old = data.sessions.filter(s => new Date(s.createdAt).getTime() < thirtyDaysAgo);
    if (old.length > 0) {
      data.sessions = data.sessions.filter(s => new Date(s.createdAt).getTime() >= thirtyDaysAgo);
      await saveSessionsData(data);
    }
    return old;
  }

  /* ===== Helpers ===== */
  function qs(s, root) { return (root || document).querySelector(s); }
  function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function ce(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html) el.innerHTML = html;
    return el;
  }

  function getSelector(el) {
    if (el.id) return '#' + el.id;
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && parts.length < 5) {
      let s = cur.tagName.toLowerCase();
      if (cur.id) { parts.unshift('#' + cur.id); break; }
      if (cur.className && typeof cur.className === 'string') {
        const cls = cur.className.trim().split(/\s+/).filter(c => !c.startsWith('qa-feedback-')).slice(0, 2).join('.');
        if (cls) s += '.' + cls;
      }
      const parent = cur.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
        if (siblings.length > 1) s += ':nth-child(' + (Array.from(parent.children).indexOf(cur) + 1) + ')';
      }
      parts.unshift(s);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function getSection(el) {
    let cur = el;
    while (cur) {
      if (cur.tagName === 'SECTION' || cur.tagName === 'FOOTER' || cur.tagName === 'HEADER' || cur.tagName === 'NAV') {
        return cur.id || cur.className.split(/\s+/)[0] || cur.tagName.toLowerCase();
      }
      cur = cur.parentElement;
    }
    return 'body';
  }

  function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '...' : s; }

  function getComputedProps(el) {
    const cs = getComputedStyle(el);
    return {
      color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      backgroundColor: cs.backgroundColor, padding: cs.padding, margin: cs.margin,
      display: cs.display, position: cs.position, border: cs.border,
      lineHeight: cs.lineHeight, textAlign: cs.textAlign
    };
  }

  function captureElement(el) {
    const rect = el.getBoundingClientRect();
    return {
      selector: getSelector(el),
      section: getSection(el),
      tagName: el.tagName,
      classes: Array.from(el.classList).filter(c => !c.startsWith('qa-feedback-')),
      id: el.id || '',
      textContent: truncate((el.textContent || '').trim(), 120),
      bbox: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      styles: getComputedProps(el)
    };
  }

  /* ===== Panel UI ===== */
  let panel, hoverOverlay;

  function buildPanel() {
    panel = ce('div', 'qa-feedback-panel');
    panel.style.bottom = '20px';
    panel.style.right = '20px';
    panel.innerHTML = `
      <div class="qa-feedback-panel-inner">
        <div class="qa-feedback-panel-header" id="qaPanelHeader">
          <span>QA 검수 도구</span>
          <button class="qa-feedback-collapse-btn" id="qaCollapseBtn">\u2212</button>
        </div>
        <div class="qa-feedback-panel-body" id="qaPanelBody">
          <button class="qa-feedback-btn" id="qaToggleMode">
            <span class="qa-fb-icon">\uD83D\uDD0D</span> 검수 모드 OFF <span class="qa-shortcut-hint" style="font-size:10px;color:#64748b;margin-left:auto;">\u2325Q</span>
          </button>
          <button class="qa-feedback-btn" id="qaModeElement" disabled>
            <span class="qa-fb-icon">\uD83D\uDCCC</span> 요소 선택 <span class="qa-feedback-badge-count" id="qaCount">0</span> <span class="qa-shortcut-hint" data-action="element" style="font-size:10px;color:#64748b;margin-left:auto;">1</span>
          </button>
          <div class="qa-feedback-sep"></div>
          <button class="qa-feedback-btn" id="qaExport">
            <span class="qa-fb-icon">\uD83D\uDCCB</span> 마크다운 출력 <span class="qa-shortcut-hint" data-action="export" style="font-size:10px;color:#64748b;margin-left:auto;">E</span>
          </button>
          <button class="qa-feedback-btn" id="qaMarkdownImport">
            <span class="qa-fb-icon">\uD83D\uDCCB</span> 마크다운 가져오기
          </button>
          <button class="qa-feedback-btn" id="qaReset" disabled>
            <span class="qa-fb-icon">\uD83D\uDDD1\uFE0F</span> 초기화 <span class="qa-shortcut-hint" data-action="reset" style="font-size:10px;color:#64748b;margin-left:auto;">R</span>
          </button>
          <div class="qa-feedback-sep"></div>
          <button class="qa-feedback-btn" id="qaGitHubSettings">
            <span class="qa-fb-icon">\uD83D\uDD17</span> GitHub 설정
          </button>
          <button class="qa-feedback-btn" id="qaGhIssueList" style="display:none;">
            <span class="qa-fb-icon">\uD83D\uDCCB</span> 이슈 현황
          </button>
          <div class="qa-feedback-sep"></div>
          <button class="qa-feedback-btn" id="qaSessionSave">
            <span class="qa-fb-icon">\uD83D\uDCBE</span> 세션 저장
          </button>
          <button class="qa-feedback-btn" id="qaSessionLoad">
            <span class="qa-fb-icon">\uD83D\uDCC2</span> 세션 불러오기
          </button>
          <button class="qa-feedback-btn" id="qaSettingsToggle">
            <span class="qa-fb-icon">\u2699\uFE0F</span> 단축키 설정
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    hoverOverlay = ce('div', 'qa-feedback-hover-overlay');
    hoverOverlay.style.display = 'none';
    document.body.appendChild(hoverOverlay);

    qs('#qaCollapseBtn').onclick = toggleCollapse;
    qs('#qaToggleMode').onclick = toggleActive;
    qs('#qaModeElement').onclick = () => { STATE.mode = 'element'; updateModeButton(); };
    qs('#qaExport').onclick = showOutput;
    qs('#qaReset').onclick = resetAll;
    qs('#qaSessionSave').onclick = saveSession;
    qs('#qaSessionLoad').onclick = loadSessionList;
    qs('#qaMarkdownImport').onclick = showMarkdownImport;
    qs('#qaGitHubSettings').onclick = showGitHubSettings;
    qs('#qaGhIssueList').onclick = showGitHubIssueList;

    // GitHub 설정 존재 시 이슈 현황 버튼 표시
    getGitHubMapping().then(m => {
      if (m) qs('#qaGhIssueList').style.display = '';
    });

    initPanelDrag();
  }

  function toggleCollapse() {
    STATE.panelCollapsed = !STATE.panelCollapsed;
    qs('#qaPanelBody').style.display = STATE.panelCollapsed ? 'none' : '';
    qs('#qaCollapseBtn').textContent = STATE.panelCollapsed ? '+' : '\u2212';
  }

  function toggleActive() {
    STATE.active = !STATE.active;
    const btn = qs('#qaToggleMode');
    btn.classList.toggle('active', STATE.active);
    btn.innerHTML = `<span class="qa-fb-icon">\uD83D\uDD0D</span> 검수 모드 ${STATE.active ? 'ON' : 'OFF'}`;
    const modeBtns = ['#qaModeElement','#qaReset'];
    modeBtns.forEach(s => { qs(s).disabled = !STATE.active; });
    if (STATE.active) {
      STATE.mode = 'element';
      document.body.style.cursor = 'pointer';
    } else {
      hoverOverlay.style.display = 'none';
      document.body.style.cursor = '';
    }
    updateModeButton();
  }

  function updateModeButton() {
    const btn = qs('#qaModeElement');
    if (btn) btn.classList.toggle('active', STATE.active && STATE.mode === 'element');
  }

  function updateCount() {
    qs('#qaCount').textContent = STATE.feedbacks.length;
  }

  /* ===== Panel Drag ===== */
  function initPanelDrag() {
    const header = qs('#qaPanelHeader');
    let dragging = false, offX, offY;
    header.addEventListener('mousedown', e => {
      if (e.target.closest('.qa-feedback-collapse-btn')) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      offX = e.clientX - rect.left;
      offY = e.clientY - rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      panel.style.left = (e.clientX - offX) + 'px';
      panel.style.top = (e.clientY - offY) + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }

  /* ===== Event Handlers ===== */
  function isQaElement(el) {
    return el && (el.closest('.qa-feedback-panel') || el.closest('.qa-feedback-popup') || el.closest('.qa-feedback-review-popup') || el.closest('.qa-feedback-output-overlay') || el.closest('.qa-settings-overlay') || el.closest('.qa-feedback-move-guide') || el.classList.contains('qa-feedback-hover-overlay') || el.classList.contains('qa-feedback-selected-overlay') || el.classList.contains('qa-feedback-number-badge') || el.classList.contains('qa-feedback-review-overlay') || el.classList.contains('qa-feedback-review-badge') || el.classList.contains('qa-feedback-move-source-overlay') || el.classList.contains('qa-feedback-move-marker') || el.classList.contains('qa-feedback-toast'));
  }

  function onMouseMove(e) {
    if (!hoverOverlay) return;
    if (!STATE.active || STATE.mode !== 'element' || STATE.moveMode || isQaElement(e.target)) {
      hoverOverlay.style.display = 'none';
      return;
    }
    const rect = e.target.getBoundingClientRect();
    hoverOverlay.style.display = 'block';
    hoverOverlay.style.left = rect.left + 'px';
    hoverOverlay.style.top = rect.top + 'px';
    hoverOverlay.style.width = rect.width + 'px';
    hoverOverlay.style.height = rect.height + 'px';
  }

  function onClick(e) {
    if (!hoverOverlay) return;
    if (!STATE.active) return;
    if (STATE.moveMode) {
      if (isQaElement(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      handleFreeMoveDest(e);
      return;
    }
    if (isQaElement(e.target)) return;
    if (STATE.mode === 'element') {
      e.preventDefault();
      e.stopPropagation();
      hoverOverlay.style.display = 'none';
      showTypeSelectionPopup(e.target, e.shiftKey);
    }
  }

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);

  document.addEventListener('touchend', e => {
    if (!STATE.active || STATE.mode !== 'element' || isQaElement(e.target)) return;
    e.preventDefault();
    showTypeSelectionPopup(e.target, false);
  }, { passive: false });

  /* ===== Popup Drag Helper ===== */
  function makePopupDraggable(popup) {
    const header = popup.querySelector('.qa-feedback-popup-header') || popup.querySelector('.qa-feedback-review-popup-header');
    if (!header) return;
    let dragging = false, offX = 0, offY = 0;
    header.addEventListener('mousedown', e => {
      dragging = true;
      const rect = popup.getBoundingClientRect();
      offX = e.clientX - rect.left;
      offY = e.clientY - rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      popup.style.left = Math.max(0, e.clientX - offX) + 'px';
      popup.style.top = Math.max(0, e.clientY - offY) + 'px';
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }

  /* ===== Feedback Popup ===== */
  let currentPopup = null;

  /* 피드백 유형 선택 팝업: 요소 클릭 시 먼저 유형을 선택 */
  function showTypeSelectionPopup(el, isShift) {
    if (currentPopup) currentPopup.remove();

    if (isShift && STATE.feedbacks.length > 0 && el) {
      const last = STATE.feedbacks[STATE.feedbacks.length - 1];
      if (!last.multiEls) last.multiEls = [];
      last.multiEls.push(captureElement(el));
      addOverlay(el, STATE.feedbacks.length);
      updateCount();
      saveFeedbacks();
      return;
    }

    const info = captureElement(el);
    const popup = ce('div', 'qa-feedback-popup');

    const r = el.getBoundingClientRect();
    let posY = Math.min(r.bottom + 10, window.innerHeight - 200);
    let posX = Math.min(r.left, window.innerWidth - 280);
    if (posY < 10) posY = 10;
    if (posX < 10) posX = 10;

    popup.style.top = posY + 'px';
    popup.style.left = posX + 'px';

    popup.innerHTML = `
      <div class="qa-feedback-popup-header">
        <div class="qa-fb-sel">${info.selector}</div>
        <div class="qa-fb-loc">${info.section}</div>
      </div>
      <div class="qa-feedback-type-select">
        <div style="font-size:12px;color:#94a3b8;margin-bottom:8px;">피드백 유형 선택</div>
        <div class="qa-feedback-type-buttons">
          <button class="qa-feedback-type-btn" data-type="UI">\uD83C\uDFA8 UI</button>
          <button class="qa-feedback-type-btn" data-type="\uAE30\uB2A5">\u2699\uFE0F 기능</button>
          <button class="qa-feedback-type-btn" data-type="\uD14D\uC2A4\uD2B8">\uD83D\uDCDD 텍스트</button>
          <button class="qa-feedback-type-btn" data-type="\uC704\uCE58\uC774\uB3D9">\uD83D\uDCCD 위치 이동</button>
        </div>
      </div>
      <div class="qa-feedback-popup-footer">
        <button class="qa-fb-cancel" id="qaPopupCancel">취소</button>
      </div>
    `;

    document.body.appendChild(popup);
    currentPopup = popup;
    makePopupDraggable(popup);

    popup.querySelectorAll('.qa-feedback-type-btn').forEach(btn => {
      btn.onclick = () => {
        const type = btn.dataset.type;
        popup.remove();
        currentPopup = null;
        if (type === '\uC704\uCE58\uC774\uB3D9') {
          showMoveSubOptions(el, info);
          return;
        }
        showFeedbackInputPopup(el, info, type);
      };
    });

    qs('#qaPopupCancel', popup).onclick = () => { popup.remove(); currentPopup = null; };
  }

  /* 피드백 입력 팝업: 유형 선택 후 실제 피드백 텍스트를 입력 */
  function showFeedbackInputPopup(el, info, fbType) {
    if (currentPopup) currentPopup.remove();

    const popup = ce('div', 'qa-feedback-popup');

    const r = el.getBoundingClientRect();
    let posY = Math.min(r.bottom + 10, window.innerHeight - 300);
    let posX = Math.min(r.left, window.innerWidth - 360);
    if (posY < 10) posY = 10;
    if (posX < 10) posX = 10;

    popup.style.top = posY + 'px';
    popup.style.left = posX + 'px';

    const typeLabels = { 'UI': '\uD83C\uDFA8 UI', '\uAE30\uB2A5': '\u2699\uFE0F 기능', '\uD14D\uC2A4\uD2B8': '\uD83D\uDCDD 텍스트' };

    popup.innerHTML = `
      <div class="qa-feedback-popup-header">
        <div class="qa-fb-sel">${info.selector}</div>
        <div class="qa-fb-loc">${info.section}</div>
        <div style="margin-top:4px;"><span class="qa-feedback-type-label">${typeLabels[fbType] || fbType}</span></div>
      </div>
      <div class="qa-feedback-popup-body">
        <textarea placeholder="피드백을 입력하세요..." id="qaFeedbackInput" autofocus></textarea>
      </div>
      <div class="qa-feedback-popup-footer">
        <button class="qa-fb-cancel" id="qaPopupCancel">취소</button>
        <button class="qa-fb-save" id="qaPopupSave">저장</button>
      </div>
    `;

    document.body.appendChild(popup);
    currentPopup = popup;
    makePopupDraggable(popup);

    setTimeout(() => qs('#qaFeedbackInput', popup).focus(), 50);

    qs('#qaPopupCancel', popup).onclick = () => { popup.remove(); currentPopup = null; };
    qs('#qaPopupSave', popup).onclick = () => {
      const fb = qs('#qaFeedbackInput', popup).value.trim();
      if (!fb) { qs('#qaFeedbackInput', popup).style.borderColor = '#ef4444'; return; }
      const entry = {
        id: STATE.nextId++,
        el: el,
        selector: info.selector,
        section: info.section,
        tagName: info.tagName,
        classes: info.classes,
        textContent: info.textContent,
        bbox: info.bbox,
        styles: info.styles,
        feedback: fb,
        fbType: fbType,
        moveTarget: null,
      };
      STATE.feedbacks.push(entry);
      addOverlay(el, entry.id);
      updateCount();
      saveFeedbacks();
      popup.remove();
      currentPopup = null;
    };

    qs('#qaFeedbackInput', popup).addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) qs('#qaPopupSave', popup).click();
    });
  }

  /* ===== Move Mode (위치 이동) ===== */
  let moveGuide = null;

  /* 서브 옵션 팝업: 컴포넌트 이동 / 자유 위치 이동 */
  function showMoveSubOptions(el, info) {
    if (currentPopup) currentPopup.remove();

    const popup = ce('div', 'qa-feedback-popup');
    const r = el.getBoundingClientRect();
    let posY = Math.min(r.bottom + 10, window.innerHeight - 200);
    let posX = Math.min(r.left, window.innerWidth - 280);
    if (posY < 10) posY = 10;
    if (posX < 10) posX = 10;
    popup.style.top = posY + 'px';
    popup.style.left = posX + 'px';

    popup.innerHTML = `
      <div class="qa-feedback-popup-header">
        <div class="qa-fb-sel">${info.selector}</div>
        <div class="qa-fb-loc">${info.section}</div>
      </div>
      <div class="qa-feedback-type-select">
        <div style="font-size:12px;color:#94a3b8;margin-bottom:8px;">이동 방식 선택</div>
        <div class="qa-feedback-move-sub-buttons">
          <button class="qa-feedback-move-sub-btn" data-move="component">\uD83D\uDCE6 컴포넌트 이동</button>
          <button class="qa-feedback-move-sub-btn" data-move="free">\uD83D\uDD00 자유 위치 이동</button>
        </div>
      </div>
      <div class="qa-feedback-popup-footer">
        <button class="qa-fb-cancel" id="qaPopupCancel">취소</button>
      </div>
    `;

    document.body.appendChild(popup);
    currentPopup = popup;
    makePopupDraggable(popup);

    popup.querySelectorAll('.qa-feedback-move-sub-btn').forEach(btn => {
      btn.onclick = () => {
        popup.remove();
        currentPopup = null;
        if (btn.dataset.move === 'component') {
          showComponentDirectionPopup(el, info);
        } else {
          enterFreeMoveMode(el, info);
        }
      };
    });

    qs('#qaPopupCancel', popup).onclick = () => { popup.remove(); currentPopup = null; };
  }

  /* --- A. 컴포넌트 이동 --- */
  function showComponentDirectionPopup(el, info) {
    if (currentPopup) currentPopup.remove();

    const popup = ce('div', 'qa-feedback-popup');
    const r = el.getBoundingClientRect();
    let posY = Math.min(r.bottom + 10, window.innerHeight - 300);
    let posX = Math.min(r.left, window.innerWidth - 360);
    if (posY < 10) posY = 10;
    if (posX < 10) posX = 10;
    popup.style.top = posY + 'px';
    popup.style.left = posX + 'px';

    popup.innerHTML = `
      <div class="qa-feedback-popup-header">
        <div style="margin-bottom:4px;"><span class="qa-feedback-type-label">\uD83D\uDCE6 컴포넌트 이동</span></div>
        <div class="qa-fb-sel">${info.selector}</div>
      </div>
      <div class="qa-feedback-move-options">
        <div style="font-size:12px;color:#94a3b8;margin-bottom:8px;">이동 방향 선택</div>
        <div class="qa-feedback-move-direction-buttons">
          <button class="qa-feedback-move-option-btn" data-dir="left">\u2B05 왼쪽</button>
          <button class="qa-feedback-move-option-btn" data-dir="right">\u27A1 오른쪽</button>
          <button class="qa-feedback-move-option-btn" data-dir="up">\u2B06 위로</button>
          <button class="qa-feedback-move-option-btn" data-dir="down">\u2B07 아래로</button>
        </div>
      </div>
      <div class="qa-feedback-popup-footer">
        <button class="qa-fb-cancel" id="qaPopupCancel">취소</button>
      </div>
    `;

    document.body.appendChild(popup);
    currentPopup = popup;
    makePopupDraggable(popup);

    popup.querySelectorAll('.qa-feedback-move-option-btn').forEach(btn => {
      btn.onclick = () => {
        const dir = btn.dataset.dir;
        popup.remove();
        currentPopup = null;
        showComponentMemoPopup(el, info, dir);
      };
    });

    qs('#qaPopupCancel', popup).onclick = () => { popup.remove(); currentPopup = null; };
  }

  function showComponentMemoPopup(el, info, direction) {
    if (currentPopup) currentPopup.remove();

    const dirLabels = { left: '\u2B05 왼쪽', right: '\u27A1 오른쪽', up: '\u2B06 위로', down: '\u2B07 아래로' };
    const autoFeedback = `컴포넌트 이동: ${info.selector} → ${dirLabels[direction]}`;
    const popup = ce('div', 'qa-feedback-popup');

    const r = el.getBoundingClientRect();
    let posY = Math.min(r.bottom + 10, window.innerHeight - 300);
    let posX = Math.min(r.left, window.innerWidth - 360);
    if (posY < 10) posY = 10;
    if (posX < 10) posX = 10;
    popup.style.top = posY + 'px';
    popup.style.left = posX + 'px';

    popup.innerHTML = `
      <div class="qa-feedback-popup-header">
        <div style="margin-bottom:4px;"><span class="qa-feedback-type-label">\uD83D\uDCE6 컴포넌트 이동</span></div>
        <div class="qa-fb-sel" style="margin-top:4px;">${autoFeedback}</div>
      </div>
      <div class="qa-feedback-popup-body">
        <textarea placeholder="추가 메모 (선택사항)..." id="qaMoveMemo" autofocus></textarea>
      </div>
      <div class="qa-feedback-popup-footer">
        <button class="qa-fb-cancel" id="qaMoveMemoCancel">취소</button>
        <button class="qa-fb-save" id="qaMoveMemoSave">저장</button>
      </div>
    `;

    document.body.appendChild(popup);
    currentPopup = popup;
    makePopupDraggable(popup);
    setTimeout(() => qs('#qaMoveMemo', popup).focus(), 50);

    qs('#qaMoveMemoCancel', popup).onclick = () => { popup.remove(); currentPopup = null; };
    qs('#qaMoveMemoSave', popup).onclick = () => {
      const memo = qs('#qaMoveMemo', popup).value.trim();
      const fullFeedback = memo ? autoFeedback + ' — ' + memo : autoFeedback;

      const entry = {
        id: STATE.nextId++,
        el: el,
        selector: info.selector,
        section: info.section,
        tagName: info.tagName,
        classes: info.classes,
        textContent: info.textContent,
        bbox: info.bbox,
        styles: info.styles,
        feedback: fullFeedback,
        fbType: '\uC704\uCE58\uC774\uB3D9',
        moveType: 'component',
        moveDirection: direction,
        moveTarget: null,
      };

      STATE.feedbacks.push(entry);
      addMoveOverlay(el, entry.id);
      updateCount();
      saveFeedbacks();
      popup.remove();
      currentPopup = null;
    };

    qs('#qaMoveMemo', popup).addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) qs('#qaMoveMemoSave', popup).click();
    });
  }

  /* --- B. 자유 위치 이동 (좌표 기반) --- */
  function enterFreeMoveMode(sourceEl, sourceInfo) {
    STATE.moveMode = true;
    STATE.moveSource = { el: sourceEl, info: sourceInfo };

    addMoveSourceOverlay(sourceEl);
    document.body.style.cursor = 'crosshair';

    moveGuide = ce('div', 'qa-feedback-move-guide');
    moveGuide.innerHTML = `
      <span>\uD83D\uDCCD 목적지 위치를 클릭하세요 — 출발: <code>${truncate(sourceInfo.selector, 40)}</code> (${sourceInfo.tagName})</span>
      <button class="qa-feedback-move-guide-cancel">취소</button>
    `;
    document.body.appendChild(moveGuide);

    moveGuide.querySelector('.qa-feedback-move-guide-cancel').onclick = (e) => {
      e.stopPropagation();
      exitMoveMode();
    };
  }

  function exitMoveMode() {
    STATE.moveMode = false;
    STATE.moveSource = null;
    if (moveGuide) { moveGuide.remove(); moveGuide = null; }
    document.querySelectorAll('.qa-feedback-move-source-overlay, .qa-feedback-move-marker').forEach(e => e.remove());
    document.body.style.cursor = STATE.active ? 'pointer' : '';
  }

  function addMoveSourceOverlay(el) {
    const rect = el.getBoundingClientRect();
    const ov = ce('div', 'qa-feedback-move-source-overlay');
    ov.style.left = (rect.left + window.scrollX) + 'px';
    ov.style.top = (rect.top + window.scrollY) + 'px';
    ov.style.width = rect.width + 'px';
    ov.style.height = rect.height + 'px';
    document.body.appendChild(ov);
  }

  function handleFreeMoveDest(e) {
    if (!STATE.moveSource) return;
    const sourceInfo = STATE.moveSource.info;
    const sourceEl = STATE.moveSource.el;

    const destX = e.pageX;
    const destY = e.pageY;
    const nearestEl = document.elementFromPoint(e.clientX, e.clientY);
    const nearestSelector = (nearestEl && !isQaElement(nearestEl)) ? getSelector(nearestEl) : '';

    // 목적지 마커 표시
    addFreeMovMarker(destX, destY);
    if (moveGuide) { moveGuide.remove(); moveGuide = null; }

    showFreeMoveMemoPopup(sourceEl, sourceInfo, destX, destY, nearestSelector);
  }

  function addFreeMovMarker(x, y) {
    const marker = ce('div', 'qa-feedback-move-marker');
    marker.style.left = (x - 6) + 'px';
    marker.style.top = (y - 6) + 'px';
    document.body.appendChild(marker);
  }

  function showFreeMoveMemoPopup(sourceEl, sourceInfo, destX, destY, nearestSelector) {
    if (currentPopup) currentPopup.remove();

    const destDesc = nearestSelector ? `${nearestSelector} 근처` : `(${destX}, ${destY})`;
    const autoFeedback = `자유 이동: ${sourceInfo.selector} → ${destDesc}`;
    const popup = ce('div', 'qa-feedback-popup');

    const r = sourceEl.getBoundingClientRect();
    let posY = Math.min(r.bottom + 10, window.innerHeight - 300);
    let posX = Math.min(r.left, window.innerWidth - 360);
    if (posY < 10) posY = 10;
    if (posX < 10) posX = 10;
    popup.style.top = posY + 'px';
    popup.style.left = posX + 'px';

    popup.innerHTML = `
      <div class="qa-feedback-popup-header">
        <div style="margin-bottom:4px;"><span class="qa-feedback-type-label">\uD83D\uDD00 자유 위치 이동</span></div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">출발: <code>${truncate(sourceInfo.selector, 30)}</code></div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">목적지: ${destDesc} (${destX}, ${destY})</div>
      </div>
      <div class="qa-feedback-popup-body">
        <textarea placeholder="예: 사이드바 아래로 옮겨주세요" id="qaMoveMemo" autofocus></textarea>
      </div>
      <div class="qa-feedback-popup-footer">
        <button class="qa-fb-cancel" id="qaMoveMemoCancel">취소</button>
        <button class="qa-fb-save" id="qaMoveMemoSave">저장</button>
      </div>
    `;

    document.body.appendChild(popup);
    currentPopup = popup;
    makePopupDraggable(popup);
    setTimeout(() => qs('#qaMoveMemo', popup).focus(), 50);

    qs('#qaMoveMemoCancel', popup).onclick = () => {
      popup.remove();
      currentPopup = null;
      exitMoveMode();
    };

    qs('#qaMoveMemoSave', popup).onclick = () => {
      const memo = qs('#qaMoveMemo', popup).value.trim();
      if (!memo) showToast('자유 이동은 메모를 입력해주세요.');
      const fullFeedback = memo ? autoFeedback + ' — ' + memo : autoFeedback;

      const entry = {
        id: STATE.nextId++,
        el: sourceEl,
        selector: sourceInfo.selector,
        section: sourceInfo.section,
        tagName: sourceInfo.tagName,
        classes: sourceInfo.classes,
        textContent: sourceInfo.textContent,
        bbox: sourceInfo.bbox,
        styles: sourceInfo.styles,
        feedback: fullFeedback,
        fbType: '\uC704\uCE58\uC774\uB3D9',
        moveType: 'free',
        moveDirection: null,
        moveTarget: {
          x: destX,
          y: destY,
          nearestSelector: nearestSelector,
          description: destDesc,
        },
      };

      STATE.feedbacks.push(entry);
      addMoveOverlay(sourceEl, entry.id);
      updateCount();
      saveFeedbacks();
      popup.remove();
      currentPopup = null;
      exitMoveMode();
    };

    qs('#qaMoveMemo', popup).addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) qs('#qaMoveMemoSave', popup).click();
    });
  }

  /* 이동 피드백 오버레이 — 보라색 */
  function addMoveOverlay(el, id) {
    const rect = el.getBoundingClientRect();
    const ov = ce('div', 'qa-feedback-selected-overlay qa-feedback-move-overlay');
    ov.style.left = (rect.left + window.scrollX) + 'px';
    ov.style.top = (rect.top + window.scrollY) + 'px';
    ov.style.width = rect.width + 'px';
    ov.style.height = rect.height + 'px';
    ov.dataset.qaId = id;

    const fb = STATE.feedbacks.find(f => f.id === id);
    const dirIcons = { left: '\u2B05', right: '\u27A1', up: '\u2B06', down: '\u2B07' };
    const badgeContent = (fb && fb.moveType === 'component' && fb.moveDirection) ? dirIcons[fb.moveDirection] || id : id;
    const badge = ce('div', 'qa-feedback-number-badge qa-feedback-move-badge', badgeContent);
    badge.onclick = (e) => { e.stopPropagation(); e.preventDefault(); showEditPopup(id, ov); };
    ov.appendChild(badge);
    document.body.appendChild(ov);

    // 자유 이동: 목적지 좌표에 마커 표시
    if (fb && fb.moveType === 'free' && fb.moveTarget && fb.moveTarget.x != null) {
      const marker = ce('div', 'qa-feedback-move-marker');
      marker.style.left = (fb.moveTarget.x - 6) + 'px';
      marker.style.top = (fb.moveTarget.y - 6) + 'px';
      marker.dataset.qaId = id;
      document.body.appendChild(marker);
    }
  }

  /* ===== Overlays & Badges ===== */
  function addOverlay(el, id) {
    const rect = el.getBoundingClientRect();
    const ov = ce('div', 'qa-feedback-selected-overlay');
    ov.style.left = (rect.left + window.scrollX) + 'px';
    ov.style.top = (rect.top + window.scrollY) + 'px';
    ov.style.width = rect.width + 'px';
    ov.style.height = rect.height + 'px';
    ov.dataset.qaId = id;

    const badge = ce('div', 'qa-feedback-number-badge', id);
    badge.onclick = (e) => { e.stopPropagation(); e.preventDefault(); showEditPopup(id, ov); };
    ov.appendChild(badge);
    document.body.appendChild(ov);
  }


  function showEditPopup(id, overlayEl) {
    const entry = STATE.feedbacks.find(f => f.id === id);
    if (!entry) return;
    if (currentPopup) currentPopup.remove();

    const rect = overlayEl.getBoundingClientRect();
    const popup = ce('div', 'qa-feedback-popup');
    popup.style.top = Math.min(rect.bottom + 10, window.innerHeight - 250) + 'px';
    popup.style.left = Math.min(rect.left, window.innerWidth - 360) + 'px';

    const curType = entry.fbType || 'UI';
    popup.innerHTML = `
      <div class="qa-feedback-popup-header">
        <div class="qa-fb-sel">${entry.selector || ''}</div>
        <div class="qa-fb-loc">${entry.section || ''}</div>
      </div>
      <div class="qa-feedback-type-tabs" id="qaEditTypeTabs">
        <button class="qa-feedback-type-tab${curType==='UI'?' active':''}" data-type="UI">\uD83C\uDFA8 UI</button>
        <button class="qa-feedback-type-tab${curType==='\uAE30\uB2A5'?' active':''}" data-type="\uAE30\uB2A5">\u2699\uFE0F 기능</button>
        <button class="qa-feedback-type-tab${curType==='\uD14D\uC2A4\uD2B8'?' active':''}" data-type="\uD14D\uC2A4\uD2B8">\uD83D\uDCDD 텍스트</button>
      </div>
      <div class="qa-feedback-popup-body">
        <textarea id="qaFeedbackInput">${entry.feedback}</textarea>
      </div>
      <div class="qa-feedback-popup-footer">
        <button class="qa-fb-delete" id="qaPopupDelete">삭제</button>
        <button class="qa-fb-cancel" id="qaPopupCancel">취소</button>
        <button class="qa-fb-save" id="qaPopupSave">저장</button>
      </div>
    `;
    document.body.appendChild(popup);
    currentPopup = popup;
    makePopupDraggable(popup);

    let editType = curType;
    qs('#qaEditTypeTabs', popup).querySelectorAll('.qa-feedback-type-tab').forEach(btn => {
      btn.onclick = () => {
        qs('#qaEditTypeTabs', popup).querySelectorAll('.qa-feedback-type-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        editType = btn.dataset.type;
      };
    });

    qs('#qaPopupCancel', popup).onclick = () => { popup.remove(); currentPopup = null; };
    qs('#qaPopupSave', popup).onclick = () => {
      entry.feedback = qs('#qaFeedbackInput', popup).value.trim();
      entry.fbType = editType;
      saveFeedbacks();
      popup.remove(); currentPopup = null;
    };
    qs('#qaPopupDelete', popup).onclick = () => {
      STATE.feedbacks = STATE.feedbacks.filter(f => f.id !== id);
      document.querySelectorAll(`[data-qa-id="${id}"]`).forEach(e => e.remove());
      updateCount();
      saveFeedbacks();
      popup.remove(); currentPopup = null;
    };
  }

  /* ===== Markdown Output ===== */
  function generateMarkdown() {
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const page = location.pathname.split('/').pop() || 'index.html';

    let md = `# QA \uD53C\uB4DC\uBC31 \u2014 ${page}\n> \uAC80\uC218\uC77C: ${dateStr}\n> \uCD1D \uD53C\uB4DC\uBC31: ${STATE.feedbacks.length}\uAC74\n\n---\n\n`;

    STATE.feedbacks.forEach((fb, i) => {
      const num = i + 1;
      const sectionLabel = fb.section ? ` \u2014 ${fb.section}` : '';
      const tag = fb.tagName || '\uC601\uC5ED';
      const typeTag = fb.fbType ? `[${fb.fbType}] ` : '';
      md += `## ${circled(num)} ${typeTag}${tag}${sectionLabel}\n`;

      if (fb.selector) md += `- **\uC694\uC18C**: \`${fb.selector}\`\n`;

      if (fb.fbType === '\uC704\uCE58\uC774\uB3D9') {
        const memo = fb.feedback.includes(' — ') ? fb.feedback.split(' — ').slice(1).join(' — ') : '';
        if (fb.moveType === 'component') {
          const dirLabels = { left: '\u2B05 왼쪽', right: '\u27A1 오른쪽', up: '\u2B06 위로', down: '\u2B07 아래로' };
          md += `- **\uC774\uB3D9 \uBC29\uC2DD**: 컴포넌트 이동\n`;
          md += `- **\uBC29\uD5A5**: ${dirLabels[fb.moveDirection] || fb.moveDirection}\n`;
        } else if (fb.moveType === 'free' && fb.moveTarget) {
          md += `- **\uC774\uB3D9 \uBC29\uC2DD**: 자유 위치 이동\n`;
          const destDesc = fb.moveTarget.description || (fb.moveTarget.nearestSelector ? fb.moveTarget.nearestSelector + ' 근처' : `(${fb.moveTarget.x}, ${fb.moveTarget.y})`);
          md += `- **\uC774\uB3D9 \uBAA9\uC801\uC9C0**: ${destDesc} (${fb.moveTarget.x}, ${fb.moveTarget.y})\n`;
        }
        if (memo) md += `- **\uBA54\uBAA8**: ${memo}\n`;
      } else {
        if (fb.textContent) md += `- **\uD604\uC7AC \uD14D\uC2A4\uD2B8**: "${truncate(fb.textContent, 80)}"\n`;
        md += `- **\uD53C\uB4DC\uBC31**: ${fb.feedback}\n`;
      }

      if (fb.bbox) md += `- **\uC704\uCE58**: x:${fb.bbox.x} y:${fb.bbox.y} ${fb.bbox.w}x${fb.bbox.h}\n`;
      if (fb.multiEls && fb.multiEls.length > 0) {
        md += `- **\uCD94\uAC00 \uC120\uD0DD \uC694\uC18C**: ${fb.multiEls.map(e => '`' + e.selector + '`').join(', ')}\n`;
      }

      md += '\n';
    });

    md += `---\n> \uC774 \uD53C\uB4DC\uBC31\uC744 \uD074\uB85C\uB4DC \uCF54\uB4DC\uC5D0 \uBD99\uC5EC\uB123\uC5B4 \uC218\uC815\uC744 \uC694\uCCAD\uD558\uC138\uC694.\n`;
    return md;
  }

  function circled(n) {
    const chars = '\u2460\u2461\u2462\u2463\u2464\u2465\u2466\u2467\u2468\u2469\u246A\u246B\u246C\u246D\u246E\u246F\u2470\u2471\u2472\u2473';
    return n <= 20 ? chars[n - 1] : '(' + n + ')';
  }

  function showOutput() {
    if (STATE.feedbacks.length === 0) {
      alert('\uD53C\uB4DC\uBC31\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC694\uC18C\uB97C \uC120\uD0DD\uD558\uACE0 \uD53C\uB4DC\uBC31\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.');
      return;
    }

    const overlay = ce('div', 'qa-feedback-output-overlay');
    const md = generateMarkdown();

    overlay.innerHTML = `
      <div class="qa-feedback-output-modal">
        <div class="qa-feedback-output-modal-header">
          <h3>\uB9C8\uD06C\uB2E4\uC6B4 \uCD9C\uB825 (${STATE.feedbacks.length}\uAC74)</h3>
          <button onclick="this.closest('.qa-feedback-output-overlay').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#94a3b8;">\u2715</button>
        </div>
        <div class="qa-feedback-output-pre">
          <pre id="qaOutputPre"></pre>
        </div>
        <div class="qa-feedback-output-actions">
          <button style="background:#f1f5f9;color:#475569;" onclick="this.closest('.qa-feedback-output-overlay').remove()">\uB2EB\uAE30</button>
          <button style="background:#1e293b;color:#fff;" id="qaCopyBtn">\uD074\uB9BD\uBCF4\uB4DC \uBCF5\uC0AC</button>
          <button style="background:#24292f;color:#fff;" id="qaGhIssueBtn" disabled>\uD83D\uDD17 GitHub Issue</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const pre = qs('#qaOutputPre', overlay);
    pre.textContent = md;

    qs('#qaCopyBtn', overlay).onclick = () => {
      const text = pre.textContent;
      navigator.clipboard.writeText(text).then(() => {
        qs('#qaCopyBtn', overlay).textContent = '\uBCF5\uC0AC \uC644\uB8CC!';
        setTimeout(() => { qs('#qaCopyBtn', overlay).textContent = '\uD074\uB9BD\uBCF4\uB4DC \uBCF5\uC0AC'; }, 1500);
      });
    };

    // GitHub Issue 버튼 상태
    const ghIssueBtn = qs('#qaGhIssueBtn', overlay);
    getGitHubMapping().then(mapping => {
      if (mapping) {
        ghIssueBtn.disabled = false;
        ghIssueBtn.title = `${mapping.repoOwner}/${mapping.repoName}에 Issue 생성`;
      } else {
        ghIssueBtn.title = 'GitHub 설정 필요 — 패널에서 🔗 GitHub 설정을 먼저 연결하세요';
      }
    });

    ghIssueBtn.onclick = async () => {
      if (ghIssueBtn.disabled) return;

      // 중복 전송 경고
      const lastIssue = await getLastIssueHistory();
      if (lastIssue) {
        if (!confirm(`이미 Issue #${lastIssue.issueNumber}으로 전송되었습니다.\n새로 생성하시겠습니까?`)) return;
      }

      showIssueSendModal(overlay, ghIssueBtn);
    };

    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  /* ===== Issue Send Modal ===== */
  function showIssueSendModal(parentOverlay, ghIssueBtn) {
    const sendOverlay = ce('div', 'qa-settings-overlay');
    const page = location.pathname.split('/').pop() || 'index';
    const today = new Date().toISOString().slice(0, 10);
    const defaultTitle = `[QA] ${page} — 피드백 ${STATE.feedbacks.length}건 (${today})`;

    const fbListHtml = STATE.feedbacks.map((fb, i) => {
      const typeTag = fb.fbType || 'UI';
      const summary = truncate(fb.feedback, 30);
      const section = fb.section ? ' — ' + fb.section : '';
      return `<label class="qa-gh-send-item"><input type="checkbox" checked data-idx="${i}" />${circled(i+1)} [${typeTag}] ${summary}${section}</label>`;
    }).join('');

    sendOverlay.innerHTML = `
      <div class="qa-settings-modal" style="width:440px;max-height:80vh;display:flex;flex-direction:column;">
        <div class="qa-settings-modal-header">
          <h3>\uD83D\uDE80 GitHub Issue 전송</h3>
        </div>
        <div class="qa-settings-modal-body" style="overflow-y:auto;flex:1;">
          <div class="qa-gh-field">
            <label>이슈 제목 (선택)</label>
            <input type="text" id="qaIssueTitleInput" placeholder="미입력 시 자동 생성" />
          </div>
          <div class="qa-gh-field" style="margin-top:12px;">
            <label>전송 범위</label>
            <div style="margin-top:6px;">
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#e2e8f0;cursor:pointer;margin-bottom:4px;">
                <input type="radio" name="qaSendScope" value="all" checked style="accent-color:#3b82f6;" /> 전체 피드백 (${STATE.feedbacks.length}건)
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#e2e8f0;cursor:pointer;">
                <input type="radio" name="qaSendScope" value="selected" style="accent-color:#3b82f6;" /> 선택한 피드백만
              </label>
            </div>
          </div>
          <div id="qaIssueFbList" style="display:none;margin-top:10px;max-height:200px;overflow-y:auto;border:1px solid #334155;border-radius:8px;padding:8px;">
            ${fbListHtml}
          </div>
        </div>
        <div class="qa-settings-modal-footer">
          <button class="qa-settings-btn-close" id="qaIssueSendCancel">취소</button>
          <button class="qa-settings-btn-save" id="qaIssueSendConfirm">전송</button>
        </div>
      </div>
    `;
    document.body.appendChild(sendOverlay);

    const fbListEl = qs('#qaIssueFbList', sendOverlay);
    sendOverlay.querySelectorAll('input[name="qaSendScope"]').forEach(radio => {
      radio.onchange = () => {
        fbListEl.style.display = radio.value === 'selected' && radio.checked ? '' : 'none';
      };
    });

    qs('#qaIssueSendCancel', sendOverlay).onclick = () => sendOverlay.remove();

    qs('#qaIssueSendConfirm', sendOverlay).onclick = async () => {
      const customTitle = qs('#qaIssueTitleInput', sendOverlay).value.trim();
      const scope = sendOverlay.querySelector('input[name="qaSendScope"]:checked').value;

      let selectedFeedbacks = STATE.feedbacks;
      if (scope === 'selected') {
        const checkedIdxs = [];
        fbListEl.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
          checkedIdxs.push(parseInt(cb.dataset.idx));
        });
        if (checkedIdxs.length === 0) {
          showToast('전송할 피드백을 선택하세요.');
          return;
        }
        selectedFeedbacks = checkedIdxs.map(i => STATE.feedbacks[i]);
      }

      // 선택된 피드백으로 마크다운 생성
      const md = generateMarkdownForFeedbacks(selectedFeedbacks);
      const title = customTitle || `[QA] ${location.pathname.split('/').pop() || 'index'} — 피드백 ${selectedFeedbacks.length}건 (${new Date().toISOString().slice(0, 10)})`;

      sendOverlay.remove();
      ghIssueBtn.disabled = true;
      ghIssueBtn.textContent = '전송 중...';

      const type = STATE.reviewMode ? 'review-resend' : 'initial';
      const result = await createGitHubIssueWithTitle(title, md, selectedFeedbacks.length);

      if (result) {
        await recordIssueHistory(result, type);
        ghIssueBtn.textContent = `\u2705 Issue #${result.number}`;
        ghIssueBtn.style.background = '#22c55e';
        showToast(`\u2705 Issue #${result.number} 생성 완료 (피드백 ${selectedFeedbacks.length}건)`);
        setTimeout(() => {
          ghIssueBtn.textContent = `Issue #${result.number} 열기`;
          ghIssueBtn.style.background = '#24292f';
          ghIssueBtn.disabled = false;
          ghIssueBtn.onclick = () => window.open(result.url, '_blank');
        }, 2000);
      } else {
        ghIssueBtn.disabled = false;
        ghIssueBtn.textContent = '\uD83D\uDD17 GitHub Issue';
      }
    };

    setTimeout(() => {
      sendOverlay.addEventListener('click', e => { if (e.target === sendOverlay) sendOverlay.remove(); });
    }, 100);
  }

  /* 선택 피드백으로 마크다운 생성 */
  function generateMarkdownForFeedbacks(feedbacks) {
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const page = location.pathname.split('/').pop() || 'index.html';

    let md = `# QA \uD53C\uB4DC\uBC31 \u2014 ${page}\n> \uAC80\uC218\uC77C: ${dateStr}\n> \uCD1D \uD53C\uB4DC\uBC31: ${feedbacks.length}\uAC74\n\n---\n\n`;

    feedbacks.forEach((fb, i) => {
      const num = i + 1;
      const sectionLabel = fb.section ? ` \u2014 ${fb.section}` : '';
      const tag = fb.tagName || '\uC694\uC18C';
      const typeTag = fb.fbType ? `[${fb.fbType}] ` : '';
      md += `## ${circled(num)} ${typeTag}${tag}${sectionLabel}\n`;
      if (fb.selector) md += `- **\uC694\uC18C**: \`${fb.selector}\`\n`;

      if (fb.fbType === '\uC704\uCE58\uC774\uB3D9') {
        const memo = fb.feedback.includes(' — ') ? fb.feedback.split(' — ').slice(1).join(' — ') : '';
        if (fb.moveType === 'component') {
          const dirLabels = { left: '\u2B05 왼쪽', right: '\u27A1 오른쪽', up: '\u2B06 위로', down: '\u2B07 아래로' };
          md += `- **\uC774\uB3D9 \uBC29\uC2DD**: 컴포넌트 이동\n`;
          md += `- **\uBC29\uD5A5**: ${dirLabels[fb.moveDirection] || fb.moveDirection}\n`;
        } else if (fb.moveType === 'free' && fb.moveTarget) {
          md += `- **\uC774\uB3D9 \uBC29\uC2DD**: 자유 위치 이동\n`;
          const destDesc = fb.moveTarget.description || (fb.moveTarget.nearestSelector ? fb.moveTarget.nearestSelector + ' 근처' : `(${fb.moveTarget.x}, ${fb.moveTarget.y})`);
          md += `- **\uC774\uB3D9 \uBAA9\uC801\uC9C0**: ${destDesc} (${fb.moveTarget.x}, ${fb.moveTarget.y})\n`;
        }
        if (memo) md += `- **\uBA54\uBAA8**: ${memo}\n`;
      } else {
        if (fb.textContent) md += `- **\uD604\uC7AC \uD14D\uC2A4\uD2B8**: "${truncate(fb.textContent, 80)}"\n`;
        md += `- **\uD53C\uB4DC\uBC31**: ${fb.feedback}\n`;
      }
      md += '\n';
    });

    md += `---\n> \uC774 \uD53C\uB4DC\uBC31\uC744 \uD074\uB85C\uB4DC \uCF54\uB4DC\uC5D0 \uBD99\uC5EC\uB123\uC5B4 \uC218\uC815\uC744 \uC694\uCCAD\uD558\uC138\uC694.\n`;
    return md;
  }

  /* 제목 지정 가능한 Issue 생성 */
  async function createGitHubIssueWithTitle(title, markdown, feedbackCount) {
    const mapping = await getGitHubMapping();
    if (!mapping) { showToast('GitHub 설정이 필요합니다.'); return null; }

    const { repoOwner, repoName, token } = mapping;
    await ensureLabelExists(repoOwner, repoName, token);

    try {
      const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body: markdown, labels: ['qa-feedback'] })
      });
      if (res.ok) {
        const data = await res.json();
        return { number: data.number, url: data.html_url };
      } else if (res.status === 401) { showToast('❌ 토큰이 만료되었습니다.'); }
      else if (res.status === 403) { showToast('❌ 권한이 없습니다.'); }
      else if (res.status === 404) { showToast('❌ 레포를 찾을 수 없습니다.'); }
      else { showToast(`❌ Issue 생성 실패 (${res.status})`); }
      return null;
    } catch(err) { showToast('❌ 네트워크 오류'); return null; }
  }

  /* ===== Reset ===== */
  async function resetAll() {
    if (!confirm('\uBAA8\uB4E0 \uD53C\uB4DC\uBC31\uC744 \uCD08\uAE30\uD654\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) return;
    STATE.feedbacks = [];
    STATE.nextId = 1;
    await chrome.storage.local.remove(getStorageKey());
    document.querySelectorAll('.qa-feedback-selected-overlay, .qa-feedback-number-badge, .qa-feedback-move-marker').forEach(e => e.remove());
    if (currentPopup) { currentPopup.remove(); currentPopup = null; }
    document.querySelectorAll('.qa-feedback-output-overlay').forEach(e => e.remove());
    hoverOverlay.style.display = 'none';
    updateCount();
  }

  /* ===== Session Manager ===== */
  async function saveSession() {
    if (STATE.feedbacks.length === 0) {
      alert('\uC800\uC7A5\uD560 \uD53C\uB4DC\uBC31\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.');
      return;
    }
    showSessionNamePopup();
  }

  function showSessionNamePopup() {
    const overlay = ce('div', 'qa-settings-overlay');
    const pageName = location.pathname.split('/').pop() || 'index.html';
    const today = new Date().toISOString().slice(0, 10);
    const defaultName = pageName + ' \u2014 ' + today;

    overlay.innerHTML = `
      <div class="qa-settings-modal" style="width:340px;">
        <div class="qa-settings-modal-header">
          <h3>\uD83D\uDCBE \uC138\uC158 \uC800\uC7A5</h3>
        </div>
        <div class="qa-settings-modal-body">
          <div style="margin-bottom:12px;font-size:13px;color:#94a3b8;">\uD53C\uB4DC\uBC31 ${STATE.feedbacks.length}\uAC74\uC744 \uC138\uC158\uC73C\uB85C \uC800\uC7A5\uD569\uB2C8\uB2E4.</div>
          <input type="text" id="qaSessionNameInput" value="${defaultName}" style="width:100%;padding:10px;border:1px solid #475569;border-radius:8px;background:#0f172a;color:#e2e8f0;font-size:13px;outline:none;" />
        </div>
        <div class="qa-settings-modal-footer">
          <button class="qa-settings-btn-close" id="qaSessionNameCancel">\uCDE8\uC18C</button>
          <button class="qa-settings-btn-save" id="qaSessionNameSave">\uC800\uC7A5</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = qs('#qaSessionNameInput', overlay);
    input.focus();
    input.select();

    qs('#qaSessionNameCancel', overlay).onclick = () => overlay.remove();
    qs('#qaSessionNameSave', overlay).onclick = async () => {
      const name = input.value.trim() || defaultName;
      const data = await getSessionsData();
      const feedbacksCopy = STATE.feedbacks.map(fb => ({ ...fb, el: null }));
      data.sessions.push({
        id: 'session-' + Date.now(),
        name: name,
        page: location.pathname,
        url: location.href,
        createdAt: new Date().toISOString(),
        status: 'open',
        feedbacks: feedbacksCopy,
        nextId: STATE.nextId
      });
      await saveSessionsData(data);
      overlay.remove();
      showToast('\uC138\uC158\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') qs('#qaSessionNameSave', overlay).click();
      if (e.key === 'Escape') overlay.remove();
    });

    setTimeout(() => {
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }, 100);
  }

  function showToast(msg) {
    const toast = ce('div', 'qa-feedback-toast', msg);
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 1500);
    setTimeout(() => toast.remove(), 1800);
  }

  async function loadSessionList() {
    const data = await getSessionsData();
    const removed = await cleanOldSessions(data);
    if (removed.length > 0) {
      showToast(removed.length + '\uAC1C\uC758 \uC624\uB798\uB41C \uC138\uC158(30\uC77C+)\uC774 \uC790\uB3D9 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
    }

    if (data.sessions.length === 0) {
      alert('\uC800\uC7A5\uB41C \uC138\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.');
      return;
    }
    showSessionListPopup(data);
  }

  function showSessionListPopup(data) {
    const overlay = ce('div', 'qa-settings-overlay');
    overlay.innerHTML = `
      <div class="qa-settings-modal" style="width:400px;max-height:80vh;display:flex;flex-direction:column;">
        <div class="qa-settings-modal-header">
          <h3>\uD83D\uDCC2 \uC800\uC7A5\uB41C \uC138\uC158</h3>
        </div>
        <div class="qa-settings-modal-body" id="qaSessionListBody" style="overflow-y:auto;flex:1;"></div>
        <div class="qa-settings-modal-footer">
          <button class="qa-settings-btn-close" id="qaSessionListClose">\uB2EB\uAE30</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    async function renderList() {
      const freshData = await getSessionsData();
      const body = qs('#qaSessionListBody', overlay);
      if (freshData.sessions.length === 0) {
        body.innerHTML = '<div style="text-align:center;color:#64748b;padding:20px;">\uC800\uC7A5\uB41C \uC138\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
        return;
      }
      body.innerHTML = freshData.sessions.map((s, i) => {
        const date = s.createdAt ? s.createdAt.slice(0, 10) : '';
        const count = s.feedbacks ? s.feedbacks.length : 0;
        const statusColors = { open: '#22c55e', reviewing: '#f59e0b', closed: '#64748b' };
        const statusColor = statusColors[s.status] || '#64748b';
        const issueInfo = (s.issueHistory && s.issueHistory.length > 0) ? s.issueHistory[s.issueHistory.length - 1] : null;
        const issueTag = issueInfo ? ` → <a href="${issueInfo.issueUrl}" target="_blank" style="color:#3b82f6;text-decoration:none;">Issue #${issueInfo.issueNumber}</a> 전송됨` : '';
        return `
          <div style="padding:12px 0;border-bottom:1px solid #334155;">
            <div style="font-size:14px;font-weight:600;color:#e2e8f0;margin-bottom:4px;">\u25B8 ${s.name}</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:8px;">
              ${count}\uAC74 \u00B7 ${date} \u00B7 <span style="color:${statusColor}">${s.status}</span>${issueTag}
            </div>
            <div style="display:flex;gap:6px;">
              <button class="qa-settings-change qa-session-load" data-idx="${i}" style="border-color:#3b82f6;color:#3b82f6;">\uBD88\uB7EC\uC624\uAE30</button>
              <button class="qa-settings-change qa-session-review" data-idx="${i}" style="border-color:#f59e0b;color:#f59e0b;">\uC7AC\uAC80\uC218</button>
              <button class="qa-settings-change qa-session-delete" data-idx="${i}" style="border-color:#ef4444;color:#ef4444;">\uC0AD\uC81C</button>
            </div>
          </div>
        `;
      }).join('');

      body.querySelectorAll('.qa-session-load').forEach(btn => {
        btn.onclick = async () => {
          const idx = parseInt(btn.dataset.idx);
          const d = await getSessionsData();
          const session = d.sessions[idx];
          if (!session) return;
          restoreSessionFeedbacks(session);
          overlay.remove();
          showToast('\uC138\uC158 "\u200B' + session.name + '"\uC744 \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4.');
        };
      });

      body.querySelectorAll('.qa-session-review').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          enterReviewMode(idx);
          overlay.remove();
        };
      });

      body.querySelectorAll('.qa-session-delete').forEach(btn => {
        btn.onclick = async () => {
          const idx = parseInt(btn.dataset.idx);
          const d = await getSessionsData();
          const session = d.sessions[idx];
          if (!session) return;
          if (!confirm('"' + session.name + '" \uC138\uC158\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) return;
          d.sessions.splice(idx, 1);
          await saveSessionsData(d);
          renderList();
        };
      });
    }

    renderList();

    qs('#qaSessionListClose', overlay).onclick = () => overlay.remove();
    setTimeout(() => {
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }, 100);
  }

  /* ===== Review Mode ===== */
  async function enterReviewMode(sessionIdx) {
    const data = await getSessionsData();
    const session = data.sessions[sessionIdx];
    if (!session) return;

    if (STATE.feedbacks.length > 0) {
      STATE.savedFeedbacksBeforeReview = {
        feedbacks: STATE.feedbacks.map(fb => ({ ...fb, el: null })),
        nextId: STATE.nextId
      };
    }

    document.querySelectorAll('.qa-feedback-selected-overlay, .qa-feedback-review-overlay').forEach(e => e.remove());
    if (currentPopup) { currentPopup.remove(); currentPopup = null; }

    session.status = 'reviewing';
    if (!session.reviewCount) session.reviewCount = 0;
    session.reviewCount++;
    data.sessions[sessionIdx] = session;
    await saveSessionsData(data);

    STATE.reviewMode = true;
    STATE.reviewSessionId = session.id;
    STATE.feedbacks = session.feedbacks || [];
    STATE.nextId = session.nextId || STATE.feedbacks.length + 1;

    STATE.feedbacks.forEach(fb => {
      if (!fb.reviewStatus) fb.reviewStatus = null;
      if (!fb.reviewNote) fb.reviewNote = '';
    });

    STATE.feedbacks.forEach((fb, i) => {
      if (fb.selector) {
        const el = document.querySelector(fb.selector);
        if (el) {
          fb.el = el;
          addReviewOverlay(el, fb, i);
        } else {
          addReviewOverlayNotFound(fb, i);
        }
      }
    });

    updateCount();
    updateReviewPanel();
  }

  function addReviewOverlay(el, fb, idx) {
    const rect = el.getBoundingClientRect();
    const ov = ce('div', 'qa-feedback-review-overlay');
    ov.style.left = (rect.left + window.scrollX) + 'px';
    ov.style.top = (rect.top + window.scrollY) + 'px';
    ov.style.width = rect.width + 'px';
    ov.style.height = rect.height + 'px';
    ov.dataset.qaReviewIdx = idx;

    const badge = ce('div', 'qa-feedback-review-badge', (idx + 1));
    updateBadgeStatus(badge, fb.reviewStatus);
    badge.onclick = (e) => { e.stopPropagation(); e.preventDefault(); showReviewPopup(fb, idx, ov); };
    ov.appendChild(badge);
    document.body.appendChild(ov);
  }

  function addReviewOverlayNotFound(fb, idx) {
    const bbox = fb.bbox || { x: 100, y: 100 + idx * 40, w: 100, h: 30 };
    const ov = ce('div', 'qa-feedback-review-overlay not-found');
    ov.style.left = (bbox.x + window.scrollX) + 'px';
    ov.style.top = (bbox.y + window.scrollY) + 'px';
    ov.style.width = bbox.w + 'px';
    ov.style.height = bbox.h + 'px';
    ov.dataset.qaReviewIdx = idx;

    const badge = ce('div', 'qa-feedback-review-badge not-found', (idx + 1));
    badge.onclick = (e) => { e.stopPropagation(); e.preventDefault(); showReviewPopup(fb, idx, ov); };
    ov.appendChild(badge);
    document.body.appendChild(ov);
  }

  function updateBadgeStatus(badge, status) {
    badge.classList.remove('fixed', 'not-fixed', 'not-found');
    if (status === 'fixed') badge.classList.add('fixed');
    else if (status === 'not-fixed') badge.classList.add('not-fixed');
  }

  function showReviewPopup(fb, idx, overlayEl) {
    if (currentPopup) currentPopup.remove();

    const rect = overlayEl.getBoundingClientRect();
    const popup = ce('div', 'qa-feedback-review-popup');
    const posY = Math.min(rect.bottom + 10, window.innerHeight - 320);
    const posX = Math.min(rect.left, window.innerWidth - 340);
    popup.style.top = Math.max(10, posY) + 'px';
    popup.style.left = Math.max(10, posX) + 'px';

    const typeTag = fb.fbType ? `[${fb.fbType}] ` : '';
    const tag = fb.tagName || '\uC601\uC5ED';
    const sectionLabel = fb.section ? ' \u2014 ' + fb.section : '';
    const notFoundMsg = (!fb.selector || document.querySelector(fb.selector)) ? '' : '<div style="color:#f59e0b;font-size:11px;margin-top:4px;">\u26A0\uFE0F \uC694\uC18C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC74C</div>';

    const curStatus = fb.reviewStatus || '';
    popup.innerHTML = `
      <div class="qa-feedback-review-popup-header">
        <div style="font-size:14px;font-weight:600;">${circled(idx + 1)} ${typeTag}${tag}${sectionLabel}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">\uC6D0\uBCF8 \uD53C\uB4DC\uBC31: "${truncate(fb.feedback, 60)}"</div>
        ${notFoundMsg}
      </div>
      <div class="qa-feedback-review-popup-body">
        <div class="qa-review-radio-group">
          <label class="qa-review-radio${curStatus === 'fixed' ? ' selected' : ''}">
            <input type="radio" name="qaReviewStatus" value="fixed" ${curStatus === 'fixed' ? 'checked' : ''} />
            \u2705 \uC218\uC815\uB428
          </label>
          <label class="qa-review-radio${curStatus === 'not-fixed' ? ' selected' : ''}">
            <input type="radio" name="qaReviewStatus" value="not-fixed" ${curStatus === 'not-fixed' ? 'checked' : ''} />
            \u274C \uBBF8\uC218\uC815
          </label>
        </div>
        <div style="margin-top:10px;">
          <div style="font-size:12px;color:#64748b;margin-bottom:4px;">\uBA54\uBAA8:</div>
          <textarea id="qaReviewNote" style="width:100%;min-height:50px;border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:13px;font-family:inherit;resize:vertical;outline:none;">${fb.reviewNote || ''}</textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:10px;">
          <button id="qaReviewConfirm" style="padding:7px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:#2563eb;color:#fff;">\uD655\uC778</button>
        </div>
      </div>
    `;

    document.body.appendChild(popup);
    currentPopup = popup;
    makePopupDraggable(popup);

    popup.querySelectorAll('.qa-review-radio').forEach(label => {
      label.onclick = () => {
        popup.querySelectorAll('.qa-review-radio').forEach(l => l.classList.remove('selected'));
        label.classList.add('selected');
        label.querySelector('input').checked = true;
      };
    });

    qs('#qaReviewConfirm', popup).onclick = () => {
      const checked = popup.querySelector('input[name="qaReviewStatus"]:checked');
      fb.reviewStatus = checked ? checked.value : null;
      fb.reviewNote = qs('#qaReviewNote', popup).value.trim();

      const badge = overlayEl.querySelector('.qa-feedback-review-badge');
      if (badge) updateBadgeStatus(badge, fb.reviewStatus);

      saveReviewState();

      popup.remove();
      currentPopup = null;
    };
  }

  async function saveReviewState() {
    if (!STATE.reviewSessionId) return;
    const data = await getSessionsData();
    const session = data.sessions.find(s => s.id === STATE.reviewSessionId);
    if (!session) return;
    session.feedbacks = STATE.feedbacks.map(fb => ({ ...fb, el: null }));
    session.nextId = STATE.nextId;
    await saveSessionsData(data);
  }

  function updateReviewPanel() {
    ['#qaReviewCancel', '#qaReviewComplete', '#qaReviewSep'].forEach(id => {
      const el = qs(id);
      if (el) el.remove();
    });

    if (STATE.reviewMode) {
      const body = qs('#qaPanelBody');
      const settingsBtn = qs('#qaSettingsToggle');
      const sep = ce('div', 'qa-feedback-sep');
      sep.id = 'qaReviewSep';

      const cancelBtn = ce('button', 'qa-feedback-btn');
      cancelBtn.id = 'qaReviewCancel';
      cancelBtn.style.color = '#94a3b8';
      cancelBtn.innerHTML = '<span class="qa-fb-icon">\u274C</span> \uC7AC\uAC80\uC218 \uCDE8\uC18C';
      cancelBtn.onclick = cancelReview;

      const completeBtn = ce('button', 'qa-feedback-btn review-complete');
      completeBtn.id = 'qaReviewComplete';
      completeBtn.innerHTML = '<span class="qa-fb-icon">\uD83D\uDCCB</span> \uC7AC\uAC80\uC218 \uC644\uB8CC';
      completeBtn.onclick = completeReview;

      body.insertBefore(sep, settingsBtn.previousElementSibling);
      body.insertBefore(cancelBtn, sep.nextSibling);
      body.insertBefore(completeBtn, cancelBtn.nextSibling);
    }
  }

  async function completeReview() {
    const md = await generateReviewMarkdown();

    const overlay = ce('div', 'qa-feedback-output-overlay');
    overlay.innerHTML = `
      <div class="qa-feedback-output-modal">
        <div class="qa-feedback-output-modal-header">
          <h3>\uC7AC\uAC80\uC218 \uB9AC\uD3EC\uD2B8</h3>
          <button onclick="this.closest('.qa-feedback-output-overlay').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#94a3b8;">\u2715</button>
        </div>
        <div class="qa-feedback-output-pre">
          <pre id="qaReviewOutputPre"></pre>
        </div>
        <div class="qa-feedback-output-actions">
          <button style="background:#f1f5f9;color:#475569;" onclick="this.closest('.qa-feedback-output-overlay').remove()">\uB2EB\uAE30</button>
          <button style="background:#1e293b;color:#fff;" id="qaReviewCopyBtn">\uD074\uB9BD\uBCF4\uB4DC \uBCF5\uC0AC</button>
          <button style="background:#f59e0b;color:#fff;" id="qaReviewFinishBtn">\uC7AC\uAC80\uC218 \uC885\uB8CC</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const pre = qs('#qaReviewOutputPre', overlay);
    pre.textContent = md;

    qs('#qaReviewCopyBtn', overlay).onclick = () => {
      const text = pre.textContent;
      navigator.clipboard.writeText(text).then(() => {
        qs('#qaReviewCopyBtn', overlay).textContent = '\uBCF5\uC0AC \uC644\uB8CC!';
        setTimeout(() => { qs('#qaReviewCopyBtn', overlay).textContent = '\uD074\uB9BD\uBCF4\uB4DC \uBCF5\uC0AC'; }, 1500);
      });
    };

    qs('#qaReviewFinishBtn', overlay).onclick = async () => {
      const text = pre.textContent;
      await navigator.clipboard.writeText(text);
      showToast('\uB9AC\uD3EC\uD2B8\uAC00 \uD074\uB9BD\uBCF4\uB4DC\uC5D0 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
      overlay.remove();

      const data = await getSessionsData();
      const sessionIdx = data.sessions.findIndex(s => s.id === STATE.reviewSessionId);
      if (sessionIdx !== -1) {
        if (confirm('\uC138\uC158\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) {
          data.sessions.splice(sessionIdx, 1);
        } else {
          data.sessions[sessionIdx].status = 'closed';
          data.sessions[sessionIdx].feedbacks = STATE.feedbacks.map(fb => ({ ...fb, el: null }));
        }
        await saveSessionsData(data);
      }
      exitReviewMode();
    };

    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  async function generateReviewMarkdown() {
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const page = location.pathname.split('/').pop() || 'index.html';

    const data = await getSessionsData();
    const session = data.sessions.find(s => s.id === STATE.reviewSessionId);
    const createdAt = session ? session.createdAt.replace('T', ' ').slice(0, 16) : '';
    const reviewCount = session ? (session.reviewCount || 1) : 1;

    const total = STATE.feedbacks.length;
    const fixedCount = STATE.feedbacks.filter(fb => fb.reviewStatus === 'fixed').length;
    const notFixedCount = STATE.feedbacks.filter(fb => fb.reviewStatus === 'not-fixed').length;
    const notFoundCount = STATE.feedbacks.filter(fb => !fb.reviewStatus && !fb.el && fb.selector).length;
    const pct = (n) => total > 0 ? Math.round(n / total * 100) : 0;

    let md = `# QA \uC7AC\uAC80\uC218 \uB9AC\uD3EC\uD2B8 \u2014 ${page}\n`;
    md += `> \uAC80\uC218 \uCC28\uC218: ${reviewCount}\uCC28 \uC7AC\uAC80\uC218\n`;
    md += `> \uC6D0\uBCF8 \uAC80\uC218\uC77C: ${createdAt}\n`;
    md += `> \uC7AC\uAC80\uC218\uC77C: ${dateStr}\n`;
    md += `> \uACB0\uACFC \uC694\uC57D: \u2705 ${fixedCount}\uAC74 \uC218\uC815\uB428 (${pct(fixedCount)}%) / \u274C ${notFixedCount}\uAC74 \uBBF8\uC218\uC815 (${pct(notFixedCount)}%)`;
    if (notFoundCount > 0) md += ` / \u26A0\uFE0F ${notFoundCount}\uAC74 \uC694\uC18C \uBBBB \uCC3E\uC74C (${pct(notFoundCount)}%)`;
    md += `\n\n---\n\n`;

    // 통계 테이블
    md += `## \uD83D\uDCCA \uD1B5\uACC4\n\n`;
    md += `| \uC0C1\uD0DC | \uAC74\uC218 | \uBE44\uC728 |\n`;
    md += `|------|------|------|\n`;
    md += `| \u2705 \uC218\uC815\uB428 | ${fixedCount} | ${pct(fixedCount)}% |\n`;
    md += `| \u274C \uBBF8\uC218\uC815 | ${notFixedCount} | ${pct(notFixedCount)}% |\n`;
    if (notFoundCount > 0) md += `| \u26A0\uFE0F \uC694\uC18C \uBBBB \uCC3E\uC74C | ${notFoundCount} | ${pct(notFoundCount)}% |\n`;
    md += `\n---\n\n`;

    // 항목별 상세
    STATE.feedbacks.forEach((fb, i) => {
      const num = i + 1;
      const typeTag = fb.fbType ? `[${fb.fbType}] ` : '';
      const tag = fb.tagName || '\uC601\uC5ED';
      const sectionLabel = fb.section ? ' \u2014 ' + fb.section : '';
      md += `## ${circled(num)} ${typeTag}${tag}${sectionLabel}\n`;
      if (fb.selector) md += `- **\uC694\uC18C**: \`${fb.selector}\`\n`;
      md += `- **\uC6D0\uBCF8 \uD53C\uB4DC\uBC31**: ${fb.feedback}\n`;

      if (fb.reviewStatus === 'fixed') {
        md += `- **\uC7AC\uAC80\uC218 \uACB0\uACFC**: \u2705 \uC218\uC815\uB428\n`;
      } else if (fb.reviewStatus === 'not-fixed') {
        md += `- **\uC7AC\uAC80\uC218 \uACB0\uACFC**: \u274C \uBBF8\uC218\uC815\n`;
      } else {
        md += `- **\uC7AC\uAC80\uC218 \uACB0\uACFC**: \u2753 \uBBF8\uD655\uC778\n`;
      }

      if (fb.reviewNote) md += `- **\uC7AC\uAC80\uC218 \uBA54\uBAA8**: ${fb.reviewNote}\n`;
      md += '\n';
    });

    md += `---\n> \uC774 \uB9AC\uD3EC\uD2B8\uB97C \uD074\uB85C\uB4DC \uCF54\uB4DC\uC5D0 \uBD99\uC5EC\uB123\uC5B4 \uBBF8\uC218\uC815 \uD56D\uBAA9\uC758 \uC218\uC815\uC744 \uC694\uCCAD\uD558\uC138\uC694.\n`;
    return md;
  }



  async function cancelReview() {
    const data = await getSessionsData();
    const session = data.sessions.find(s => s.id === STATE.reviewSessionId);
    if (session) {
      session.status = 'open';
      await saveSessionsData(data);
    }
    exitReviewMode();
    showToast('\uC7AC\uAC80\uC218\uAC00 \uCDE8\uC18C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
  }

  function exitReviewMode() {
    STATE.reviewMode = false;
    STATE.reviewSessionId = null;

    document.querySelectorAll('.qa-feedback-review-overlay').forEach(e => e.remove());

    ['#qaReviewCancel', '#qaReviewComplete', '#qaReviewSep'].forEach(id => {
      const el = qs(id);
      if (el) el.remove();
    });

    if (STATE.savedFeedbacksBeforeReview) {
      STATE.feedbacks = STATE.savedFeedbacksBeforeReview.feedbacks;
      STATE.nextId = STATE.savedFeedbacksBeforeReview.nextId;
      STATE.savedFeedbacksBeforeReview = null;
      STATE.feedbacks.forEach(fb => {
        if (fb.selector) {
          const el = document.querySelector(fb.selector);
          if (el) { fb.el = el; fb.fbType === '\uC704\uCE58\uC774\uB3D9' ? addMoveOverlay(el, fb.id) : addOverlay(el, fb.id); }
        }
      });
    } else {
      STATE.feedbacks = [];
      STATE.nextId = 1;
    }

    updateCount();
    saveFeedbacks();
  }

  function restoreSessionFeedbacks(session) {
    document.querySelectorAll('.qa-feedback-selected-overlay').forEach(e => e.remove());
    if (currentPopup) { currentPopup.remove(); currentPopup = null; }

    STATE.feedbacks = session.feedbacks || [];
    STATE.nextId = session.nextId || STATE.feedbacks.length + 1;

    STATE.feedbacks.forEach(fb => {
      if (fb.selector) {
        const el = document.querySelector(fb.selector);
        if (el) {
          fb.el = el;
          fb.fbType === '\uC704\uCE58\uC774\uB3D9' ? addMoveOverlay(el, fb.id) : addOverlay(el, fb.id);
        }
      }
    });

    updateCount();
    saveFeedbacks();
  }

  /* ===== Markdown Import ===== */
  function parseMarkdown(md) {
    const feedbacks = [];
    const sections = md.split(/^## /m).slice(1);

    sections.forEach(section => {
      const lines = section.split('\n');
      const headerLine = lines[0] || '';

      const headerMatch = headerLine.match(/^[\u2460\u2461\u2462\u2463\u2464\u2465\u2466\u2467\u2468\u2469\u246A\u246B\u246C\u246D\u246E\u246F\u2470\u2471\u2472\u2473\(\d+\)]+\s*(?:\[([^\]]*)\]\s*)?(\S+)?(?:\s*\u2014\s*(.+))?/);
      const fbType = headerMatch ? (headerMatch[1] || 'UI') : 'UI';
      const tagName = headerMatch ? (headerMatch[2] || null) : null;
      const sectionName = headerMatch ? (headerMatch[3] || '').trim() || null : null;

      let selector = null;
      let feedback = null;
      let textContent = null;

      lines.forEach(line => {
        const selectorMatch = line.match(/^\- \*\*\uC694\uC18C\*\*:\s*`([^`]+)`/);
        if (selectorMatch) selector = selectorMatch[1];

        const feedbackMatch = line.match(/^\- \*\*\uD53C\uB4DC\uBC31\*\*:\s*(.+)/);
        if (feedbackMatch) feedback = feedbackMatch[1].trim();

        const textMatch = line.match(/^\- \*\*\uD604\uC7AC \uD14D\uC2A4\uD2B8\*\*:\s*"([^"]*)"/);
        if (textMatch) textContent = textMatch[1];
      });

      if (feedback && selector) {
        feedbacks.push({ selector, feedback, fbType, tagName, section: sectionName, textContent });
      }
    });

    return feedbacks;
  }

  function showMarkdownImport() {
    const overlay = ce('div', 'qa-settings-overlay');
    overlay.innerHTML = `
      <div class="qa-settings-modal" style="width:480px;max-height:80vh;display:flex;flex-direction:column;">
        <div class="qa-settings-modal-header">
          <h3>\uD83D\uDCCB \uB9C8\uD06C\uB2E4\uC6B4 \uAC00\uC838\uC624\uAE30</h3>
        </div>
        <div class="qa-settings-modal-body" style="flex:1;">
          <div style="font-size:12px;color:#94a3b8;margin-bottom:8px;">QA \uD53C\uB4DC\uBC31 \uB9C8\uD06C\uB2E4\uC6B4\uC744 \uBD99\uC5EC\uB123\uC73C\uC138\uC694.</div>
          <textarea id="qaImportTextarea" style="width:100%;min-height:200px;padding:10px;border:1px solid #475569;border-radius:8px;background:#0f172a;color:#e2e8f0;font-size:12px;font-family:'SF Mono',Menlo,monospace;outline:none;resize:vertical;" placeholder="# QA \uD53C\uB4DC\uBC31 \u2014 demo.html\n...\n\n\uC5EC\uAE30\uC5D0 \uBD99\uC5EC\uB123\uAE30"></textarea>
          <label style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12px;color:#94a3b8;cursor:pointer;">
            <input type="checkbox" id="qaImportReviewMode" style="accent-color:#f59e0b;" />
            \uAC00\uC838\uC628 \uD6C4 \uC7AC\uAC80\uC218 \uBAA8\uB4DC\uB85C \uC9C4\uC785
          </label>
        </div>
        <div class="qa-settings-modal-footer">
          <button class="qa-settings-btn-close" id="qaImportCancel">\uCDE8\uC18C</button>
          <button class="qa-settings-btn-save" id="qaImportConfirm">\uAC00\uC838\uC624\uAE30</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const textarea = qs('#qaImportTextarea', overlay);
    textarea.focus();

    qs('#qaImportCancel', overlay).onclick = () => overlay.remove();
    qs('#qaImportConfirm', overlay).onclick = async () => {
      const md = textarea.value.trim();
      if (!md) { textarea.style.borderColor = '#ef4444'; return; }

      const parsed = parseMarkdown(md);
      if (parsed.length === 0) {
        alert('\uD53C\uB4DC\uBC31\uC744 \uD30C\uC2F1\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB9C8\uD06C\uB2E4\uC6B4 \uD615\uC2DD\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.');
        return;
      }

      const enterReview = qs('#qaImportReviewMode', overlay).checked;
      overlay.remove();

      document.querySelectorAll('.qa-feedback-selected-overlay').forEach(e => e.remove());
      if (currentPopup) { currentPopup.remove(); currentPopup = null; }

      STATE.feedbacks = [];
      STATE.nextId = 1;
      let restored = 0;

      parsed.forEach(p => {
        const id = STATE.nextId++;
        const fb = {
          id: id,
          el: null,
          selector: p.selector,
          section: p.section,
          tagName: p.tagName,
          classes: [],
          textContent: p.textContent || null,
          bbox: null,
          styles: null,
          feedback: p.feedback,
          fbType: p.fbType,
          moveTarget: null,
        };

        if (p.selector) {
          const el = document.querySelector(p.selector);
          if (el) {
            fb.el = el;
            fb.bbox = { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) };
            fb.fbType === '\uC704\uCE58\uC774\uB3D9' ? addMoveOverlay(el, id) : addOverlay(el, id);
            restored++;
          }
        }

        STATE.feedbacks.push(fb);
      });

      updateCount();
      await saveFeedbacks();
      showToast(parsed.length + '\uAC74\uC758 \uD53C\uB4DC\uBC31\uC744 \uAC00\uC838\uC654\uC2B5\uB2C8\uB2E4. (' + restored + '\uAC74 \uBCF5\uC6D0 \uC131\uACF5)');

      if (enterReview) {
        const data = await getSessionsData();
        const pageName = location.pathname.split('/').pop() || 'index.html';
        const sessionObj = {
          id: 'session-' + Date.now(),
          name: pageName + ' \u2014 \uAC00\uC838\uC624\uAE30',
          page: location.pathname,
          url: location.href,
          createdAt: new Date().toISOString(),
          status: 'open',
          feedbacks: STATE.feedbacks.map(fb => ({ ...fb, el: null })),
          nextId: STATE.nextId
        };
        data.sessions.push(sessionObj);
        await saveSessionsData(data);
        const idx = data.sessions.length - 1;

        document.querySelectorAll('.qa-feedback-selected-overlay').forEach(e => e.remove());

        enterReviewMode(idx);
      }
    };

    setTimeout(() => {
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }, 100);
  }

  /* ===== Shortcut Config ===== */
  const DEFAULT_KEYS = {
    toggle: { alt: true, key: 'q' },
    element: { key: '1' },
    export: { key: 'e' },
    reset: { key: 'r' },
  };
  let shortcutKeys = JSON.parse(JSON.stringify(DEFAULT_KEYS));

  function normalizeKeyConfig(v) {
    if (typeof v === 'string') return { key: v };
    return v;
  }

  async function loadShortcuts() {
    try {
      const result = await chrome.storage.local.get('qa-shortcuts');
      const saved = result['qa-shortcuts'];
      if (saved) {
        Object.keys(saved).forEach(k => {
          shortcutKeys[k] = normalizeKeyConfig(saved[k]);
        });
      }
    } catch(e) {}
  }

  async function saveShortcuts() {
    await chrome.storage.local.set({ 'qa-shortcuts': shortcutKeys });
  }

  function keyLabel(config) {
    config = normalizeKeyConfig(config);
    let label = '';
    if (config.ctrl) label += '\u2303';
    if (config.alt) label += '\u2325';
    if (config.shift) label += '\u21E7';
    if (config.meta) label += '\u2318';
    label += config.key.length === 1 ? config.key.toUpperCase() : config.key;
    return label;
  }

  function matchShortcut(e, config) {
    config = normalizeKeyConfig(config);
    if (e.key.toLowerCase() !== config.key.toLowerCase()) return false;
    if (!!config.alt !== e.altKey) return false;
    if (!!config.ctrl !== e.ctrlKey) return false;
    if (!!config.shift !== e.shiftKey) return false;
    if (!!config.meta !== e.metaKey) return false;
    return true;
  }

  function updateHints() {
    const toggleHint = panel.querySelector('.qa-shortcut-hint:not([data-action])');
    if (toggleHint) toggleHint.textContent = keyLabel(shortcutKeys.toggle);
    panel.querySelectorAll('.qa-shortcut-hint[data-action]').forEach(el => {
      if (shortcutKeys[el.dataset.action]) el.textContent = keyLabel(shortcutKeys[el.dataset.action]);
    });
  }

  /* ===== Settings Popup ===== */
  function buildSettings() {
    const actions = [
      { key:'toggle', label:'검수 ON/OFF' },
      { key:'element', label:'요소 선택' },
      { key:'export', label:'마크다운 출력' },
      { key:'reset', label:'초기화' },
    ];

    qs('#qaSettingsToggle').onclick = () => {
      const draft = JSON.parse(JSON.stringify(shortcutKeys));

      const overlay = ce('div', 'qa-settings-overlay');
      overlay.innerHTML = `
        <div class="qa-settings-modal">
          <div class="qa-settings-modal-header">
            <h3>\u2699\uFE0F \uB2E8\uCD95\uD0A4 \uC124\uC815</h3>
          </div>
          <div class="qa-settings-modal-body" id="qaSettingsBody"></div>
          <div class="qa-settings-modal-footer">
            <button class="qa-settings-btn-restore" id="qaSettingsRestore">\uAE30\uBCF8\uAC12 \uBCF5\uC6D0</button>
            <button class="qa-settings-btn-close" id="qaSettingsClose">\uB2EB\uAE30</button>
            <button class="qa-settings-btn-save" id="qaSettingsSave">\uC800\uC7A5</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      ['mousedown','mouseup','mousemove'].forEach(evt => {
        overlay.addEventListener(evt, (ev) => {
          if (ev.target === overlay) ev.stopPropagation();
        }, true);
      });

      setTimeout(() => {
        overlay.addEventListener('click', (ev) => {
          if (ev.target === overlay) { ev.stopPropagation(); overlay.remove(); }
        });
      }, 100);

      function renderRows() {
        const body = qs('#qaSettingsBody', overlay);
        body.innerHTML = actions.map(a =>
          `<div class="qa-settings-row">
            <span>${a.label}</span>
            <span class="qa-settings-key">${keyLabel(draft[a.key])}</span>
            <button class="qa-settings-change" data-action="${a.key}">\uBCC0\uACBD</button>
          </div>`
        ).join('');

        body.querySelectorAll('.qa-settings-change').forEach(btn => {
          btn.onclick = () => {
            btn.textContent = '\uD0A4 \uC785\uB825...';
            btn.classList.add('listening');
            const handler = (ev) => {
              ev.preventDefault(); ev.stopPropagation();
              if (['Alt','Control','Shift','Meta'].includes(ev.key)) return;
              if (ev.key === 'Escape') { btn.textContent = '\uBCC0\uACBD'; btn.classList.remove('listening'); document.removeEventListener('keydown', handler, true); return; }
              const keyConfig = { key: ev.key.length === 1 ? ev.key.toLowerCase() : ev.key };
              if (ev.altKey) keyConfig.alt = true;
              if (ev.ctrlKey) keyConfig.ctrl = true;
              if (ev.shiftKey) keyConfig.shift = true;
              if (ev.metaKey) keyConfig.meta = true;
              draft[btn.dataset.action] = keyConfig;
              renderRows();
              document.removeEventListener('keydown', handler, true);
            };
            document.addEventListener('keydown', handler, true);
          };
        });
      }
      renderRows();

      qs('#qaSettingsRestore', overlay).onclick = () => {
        Object.assign(draft, JSON.parse(JSON.stringify(DEFAULT_KEYS)));
        renderRows();
      };
      qs('#qaSettingsClose', overlay).onclick = () => overlay.remove();
      qs('#qaSettingsSave', overlay).onclick = () => {
        Object.keys(draft).forEach(k => shortcutKeys[k] = draft[k]);
        saveShortcuts();
        updateHints();
        overlay.remove();
      };
    };
  }

  /* ===== Keyboard Shortcuts ===== */
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (document.querySelector('.qa-settings-overlay')) return;

    if (matchShortcut(e, shortcutKeys.toggle)) {
      e.preventDefault();
      toggleActive();
      return;
    }

    if (e.key === 'Escape') {
      if (STATE.moveMode) { exitMoveMode(); return; }
      if (currentPopup) { currentPopup.remove(); currentPopup = null; return; }
      document.querySelectorAll('.qa-feedback-output-overlay').forEach(el => el.remove());
      if (STATE.reviewMode) { cancelReview(); return; }
      return;
    }

    if (matchShortcut(e, shortcutKeys.export)) { showOutput(); return; }

    if (!STATE.active) return;

    if (matchShortcut(e, shortcutKeys.element)) { STATE.mode = 'element'; updateModeButton(); return; }
    if (matchShortcut(e, shortcutKeys.reset)) { resetAll(); return; }
  });

  /* ===== Chrome Extension Message Handler ===== */
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'toggle-qa') {
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? '' : 'none';
      }
      toggleActive();
    }
    if (msg.action === 'get-status') {
      sendResponse({ active: STATE.active, feedbackCount: STATE.feedbacks.length });
    }
    if (msg.action === 'open-session-list') {
      loadSessionList();
    }
  });

  /* ===== GitHub Integration ===== */
  const GH_SETTINGS_KEY = 'qa-github-settings';

  function parseRepoInput(input) {
    input = input.trim();
    const urlMatch = input.match(/github\.com\/([^\/]+)\/([^\/\s#?]+)/);
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
    const parts = input.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) return { owner: parts[0], repo: parts[1] };
    return null;
  }

  async function loadGitHubSettings() {
    try {
      const result = await chrome.storage.local.get(GH_SETTINGS_KEY);
      return result[GH_SETTINGS_KEY] || { mappings: [] };
    } catch(e) { return { mappings: [] }; }
  }

  async function saveGitHubSettings(settings) {
    await chrome.storage.local.set({ [GH_SETTINGS_KEY]: settings });
  }

  async function getGitHubMapping() {
    const settings = await loadGitHubSettings();
    const origin = location.origin;
    const mapping = settings.mappings.find(m => {
      if (m.matchMode === 'exact') return m.urlPattern === origin;
      return origin.includes(m.urlPattern);
    }) || null;
    if (!mapping) return null;
    // 토큰 하위 호환: auth.token → mapping.token 순서
    const token = (settings.auth && settings.auth.token) || mapping.token;
    return { ...mapping, token };
  }

  function showGitHubSettings() {
    const overlay = ce('div', 'qa-settings-overlay');

    overlay.innerHTML = `
      <div class="qa-settings-modal" style="width:420px;max-height:85vh;display:flex;flex-direction:column;">
        <div class="qa-settings-modal-header">
          <h3>\uD83D\uDD17 GitHub 연동 설정</h3>
        </div>
        <div class="qa-settings-modal-body" id="qaGhSettingsBody" style="overflow-y:auto;flex:1;">
          <div id="qaGhAuthSection"></div>
          <div id="qaGhRepoSection" style="display:none;">
            <div class="qa-gh-field">
              <label>현재 사이트</label>
              <div class="qa-gh-origin">${location.origin}</div>
            </div>
            <div class="qa-gh-field">
              <label>레포 선택</label>
              <select id="qaGhRepoSelect" style="width:100%;padding:10px;border:1px solid #475569;border-radius:8px;background:#0f172a;color:#e2e8f0;font-size:13px;outline:none;">
                <option value="">레포를 선택하세요...</option>
              </select>
            </div>
          </div>
          <div id="qaGhManualRepoArea" style="display:none;margin-top:12px;">
            <div id="qaGhManualToggle" style="font-size:12px;color:#94a3b8;cursor:pointer;user-select:none;">\u25B6 레포 직접 입력</div>
            <div id="qaGhManualSection" style="display:none;margin-top:8px;">
              <div class="qa-gh-field">
                <input type="text" id="qaGhManualRepo" placeholder="owner/repo 또는 GitHub URL" />
              </div>
            </div>
          </div>
        </div>
        <div class="qa-settings-modal-footer">
          <button class="qa-settings-btn-close" id="qaGhClose">닫기</button>
          <button class="qa-settings-btn-save" id="qaGhSave" style="opacity:0.5;cursor:not-allowed;pointer-events:none;">저장</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    let connectionVerified = false;
    let oauthToken = null;
    let selectedRepo = null;

    function setSaveBtnEnabled(enabled) {
      const saveBtn = qs('#qaGhSave', overlay);
      saveBtn.style.opacity = enabled ? '1' : '0.5';
      saveBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
      saveBtn.style.pointerEvents = enabled ? 'auto' : 'none';
    }

    // OAuth 상태에 따라 UI 렌더
    async function renderAuthSection() {
      const settings = await loadGitHubSettings();
      const authSection = qs('#qaGhAuthSection', overlay);
      const repoSection = qs('#qaGhRepoSection', overlay);

      if (settings.auth && settings.auth.token) {
        oauthToken = settings.auth.token;
        authSection.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
            <img src="${escapeHtml(settings.auth.avatarUrl || '')}" style="width:32px;height:32px;border-radius:50%;border:1px solid #475569;" />
            <div>
              <div style="font-size:13px;font-weight:600;color:#22c55e;">\u2705 @${escapeHtml(settings.auth.username || '')} 연결됨</div>
              <div style="font-size:11px;color:#64748b;">OAuth 로그인</div>
            </div>
            <button id="qaGhDisconnect" style="margin-left:auto;padding:4px 10px;border-radius:6px;font-size:11px;border:1px solid #ef4444;color:#ef4444;background:none;cursor:pointer;">연결 해제</button>
          </div>
        `;
        repoSection.style.display = '';
        qs('#qaGhManualRepoArea', overlay).style.display = '';
        loadRepoList(oauthToken);

        qs('#qaGhDisconnect', overlay).onclick = async () => {
          const s = await loadGitHubSettings();
          delete s.auth;
          await saveGitHubSettings(s);
          oauthToken = null;
          connectionVerified = false;
          setSaveBtnEnabled(false);
          renderAuthSection();
          showToast('GitHub 연결이 해제되었습니다.');
        };
      } else {
        repoSection.style.display = 'none';
        qs('#qaGhManualRepoArea', overlay).style.display = 'none';
        authSection.innerHTML = `
          <div class="qa-gh-field">
            <button class="qa-feedback-btn" id="qaGhOAuthBtn" style="width:100%;justify-content:center;background:#24292f;color:#fff;border-radius:8px;padding:12px;">
              <span class="qa-fb-icon">\uD83D\uDC19</span> GitHub로 로그인
            </button>
          </div>
        `;

        qs('#qaGhOAuthBtn', overlay).onclick = () => {
          qs('#qaGhOAuthBtn', overlay).textContent = '로그인 중...';
          qs('#qaGhOAuthBtn', overlay).disabled = true;

          chrome.runtime.sendMessage({ action: 'github-oauth-login' }, async (response) => {
            if (!response || response.error) {
              showToast(response ? response.error : 'OAuth 로그인 실패');
              qs('#qaGhOAuthBtn', overlay).textContent = '\uD83D\uDC19 GitHub로 로그인';
              qs('#qaGhOAuthBtn', overlay).disabled = false;
              return;
            }

            // auth 저장
            const settings = await loadGitHubSettings();
            settings.auth = {
              method: 'oauth',
              token: response.token,
              username: response.username,
              avatarUrl: response.avatarUrl
            };
            await saveGitHubSettings(settings);
            oauthToken = response.token;
            renderAuthSection();
            showToast(`GitHub 연결 완료 — @${response.username}`);
          });
        };
      }
    }

    // 레포 목록 로드
    function loadRepoList(token) {
      const select = qs('#qaGhRepoSelect', overlay);
      select.innerHTML = '<option value="">레포 불러오는 중...</option>';

      chrome.runtime.sendMessage({ action: 'github-fetch-repos', token }, (response) => {
        if (!response || response.error) {
          select.innerHTML = '<option value="">레포를 불러올 수 없습니다.</option>';
          return;
        }

        select.innerHTML = '<option value="">레포를 선택하세요...</option>' +
          response.repos.map(r =>
            `<option value="${r.owner}/${r.name}" data-owner="${r.owner}" data-name="${r.name}">${r.full_name}${r.private ? ' 🔒' : ''}</option>`
          ).join('');

        // 기존 매핑이 있으면 선택
        loadGitHubSettings().then(settings => {
          const mapping = settings.mappings.find(m => m.urlPattern === location.origin);
          if (mapping) {
            select.value = mapping.repoOwner + '/' + mapping.repoName;
            connectionVerified = true;
            setSaveBtnEnabled(true);
          }
        });
      });

      select.onchange = () => {
        if (select.value) {
          const opt = select.selectedOptions[0];
          selectedRepo = { owner: opt.dataset.owner, name: opt.dataset.name };
          connectionVerified = true;
          setSaveBtnEnabled(true);
        } else {
          selectedRepo = null;
          connectionVerified = false;
          setSaveBtnEnabled(false);
        }
      };
    }

    // 레포 직접 입력 접이식
    let manualRepo = null;
    qs('#qaGhManualToggle', overlay).onclick = () => {
      const section = qs('#qaGhManualSection', overlay);
      const isHidden = section.style.display === 'none';
      section.style.display = isHidden ? '' : 'none';
      qs('#qaGhManualToggle', overlay).textContent = isHidden ? '\u25BC 레포 직접 입력' : '\u25B6 레포 직접 입력';
    };

    qs('#qaGhManualRepo', overlay).addEventListener('input', () => {
      const val = qs('#qaGhManualRepo', overlay).value.trim();
      const parsed = parseRepoInput(val);
      if (parsed) {
        manualRepo = parsed;
        connectionVerified = true;
        setSaveBtnEnabled(true);
        // 드롭다운 선택 해제
        qs('#qaGhRepoSelect', overlay).value = '';
        selectedRepo = null;
      } else {
        manualRepo = null;
        connectionVerified = false;
        setSaveBtnEnabled(false);
      }
    });

    // 저장
    qs('#qaGhSave', overlay).onclick = async () => {
      if (!connectionVerified || !oauthToken) {
        showToast('먼저 GitHub 로그인 후 레포를 선택하세요.');
        return;
      }

      const settings = await loadGitHubSettings();
      let owner, name;

      if (manualRepo) {
        owner = manualRepo.owner;
        name = manualRepo.repo;
      } else if (selectedRepo) {
        owner = selectedRepo.owner;
        name = selectedRepo.name;
      } else {
        showToast('레포를 선택하거나 직접 입력하세요.');
        return;
      }

      const existingIdx = settings.mappings.findIndex(m => m.urlPattern === location.origin);
      const mapping = { urlPattern: location.origin, matchMode: 'exact', repoOwner: owner, repoName: name };

      if (existingIdx >= 0) settings.mappings[existingIdx] = mapping;
      else settings.mappings.push(mapping);

      await saveGitHubSettings(settings);
      overlay.remove();
      showToast('GitHub 설정이 저장되었습니다.');
      qs('#qaGhIssueList').style.display = '';
    };

    qs('#qaGhClose', overlay).onclick = () => overlay.remove();
    setTimeout(() => {
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }, 100);

    renderAuthSection();
  }

  /* Issue 리스트 조회 */
  const ARCHIVE_KEY = 'qa-archived-issues';

  async function getArchivedIssues() {
    try { const r = await chrome.storage.local.get(ARCHIVE_KEY); return r[ARCHIVE_KEY] || []; } catch(e) { return []; }
  }
  async function saveArchivedIssues(list) { await chrome.storage.local.set({ [ARCHIVE_KEY]: list }); }

  async function fetchGitHubIssues(owner, repo, token, page) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?labels=qa-feedback&state=all&per_page=5&page=${page || 1}`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const linkHeader = res.headers.get('Link') || '';
    const hasNext = linkHeader.includes('rel="next"');
    const hasPrev = page > 1;
    return { issues: await res.json(), hasNext, hasPrev };
  }

  async function showGitHubIssueList() {
    const mapping = await getGitHubMapping();
    if (!mapping) { showToast('GitHub 설정이 필요합니다.'); return; }

    const overlay = ce('div', 'qa-feedback-output-overlay');
    overlay.innerHTML = `
      <div class="qa-feedback-output-modal" style="max-width:520px;">
        <div class="qa-feedback-output-modal-header">
          <h3>\uD83D\uDCCB GitHub 이슈 현황</h3>
          <button onclick="this.closest('.qa-feedback-output-overlay').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#94a3b8;">\u2715</button>
        </div>
        <div class="qa-gh-filter-tabs" id="qaGhFilterTabs">
          <button class="qa-gh-filter-tab active" data-filter="all">전체</button>
          <button class="qa-gh-filter-tab" data-filter="open">Open</button>
          <button class="qa-gh-filter-tab" data-filter="closed">Closed</button>
          <button class="qa-gh-filter-tab" data-filter="archived">아카이브</button>
        </div>
        <div id="qaGhIssueListBody" style="padding:12px 20px;overflow-y:auto;max-height:50vh;">
          <div style="text-align:center;color:#94a3b8;padding:20px;">이슈 불러오는 중...</div>
        </div>
        <div id="qaGhPagination" style="display:none;padding:8px 20px;display:flex;align-items:center;justify-content:center;gap:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
          <button id="qaGhPrev" class="qa-gh-action-btn" disabled>\u25C0 이전</button>
          <span id="qaGhPageInfo">1</span>
          <button id="qaGhNext" class="qa-gh-action-btn">\u25B6 다음</button>
        </div>
        <div class="qa-feedback-output-actions">
          <button style="background:#f1f5f9;color:#475569;" onclick="this.closest('.qa-feedback-output-overlay').remove()">닫기</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    let currentPage = 1;
    let activeFilter = 'all';
    let archivedList = await getArchivedIssues();
    const body = qs('#qaGhIssueListBody', overlay);
    const paginationEl = qs('#qaGhPagination', overlay);
    const currentPath = location.pathname.split('/').pop() || 'index';

    async function loadPage() {
      body.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;">이슈 불러오는 중...</div>';

      // 아카이브 탭은 로컬 데이터
      if (activeFilter === 'archived') {
        paginationEl.style.display = 'none';
        if (archivedList.length === 0) {
          body.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;">아카이브된 이슈가 없습니다.</div>';
          return;
        }
        body.innerHTML = archivedList.map(a => `
          <div class="qa-gh-issue-row">
            <div class="qa-gh-issue-info">
              <div style="font-size:13px;font-weight:500;color:#94a3b8;">\u2705 #${a.number} ${a.title || ''}</div>
            </div>
            <div class="qa-gh-issue-actions">
              <button class="qa-gh-action-btn qa-gh-restore-btn" data-number="${a.number}" style="color:#3b82f6;border-color:#3b82f6;">복원</button>
              <button class="qa-gh-action-btn qa-gh-link-btn" data-url="${a.url}">GitHub \u2197</button>
            </div>
          </div>
        `).join('');
        bindActions();
        return;
      }

      try {
        const result = await fetchGitHubIssues(mapping.repoOwner, mapping.repoName, mapping.token, currentPage);
        let issues = result.issues;

        // 아카이브된 이슈 필터
        const archivedNums = new Set(archivedList.map(a => a.number));
        issues = issues.filter(i => !archivedNums.has(i.number));

        // 상태 필터
        if (activeFilter === 'open') issues = issues.filter(i => i.state === 'open');
        if (activeFilter === 'closed') issues = issues.filter(i => i.state === 'closed');

        if (issues.length === 0 && currentPage === 1) {
          body.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;">표시할 이슈가 없습니다.</div>';
          paginationEl.style.display = 'none';
          return;
        }

        body.innerHTML = issues.map(issue => {
          const isOpen = issue.state === 'open';
          const icon = isOpen ? '\uD83D\uDD34' : '\u2705';
          const date = issue.created_at ? issue.created_at.slice(0, 10) : '';
          const isSamePage = issue.title && issue.title.includes(currentPath);
          const reviewBtn = (!isOpen && isSamePage) ? `<button class="qa-gh-action-btn qa-gh-review-btn" data-number="${issue.number}" data-url="${issue.html_url}" data-title="${issue.title.replace(/"/g, '&quot;')}">재검수</button>` : '';
          const archiveBtn = !isOpen ? `<button class="qa-gh-action-btn qa-gh-archive-btn" data-number="${issue.number}" data-url="${issue.html_url}" data-title="${issue.title.replace(/"/g, '&quot;')}" style="color:#94a3b8;">아카이브</button>` : '';
          return `
            <div class="qa-gh-issue-row">
              <div class="qa-gh-issue-info">
                <div style="font-size:13px;font-weight:500;color:#1e293b;">${icon} ${issue.title}</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:3px;">${date}</div>
              </div>
              <div class="qa-gh-issue-actions">
                ${reviewBtn}${archiveBtn}
                <button class="qa-gh-action-btn qa-gh-link-btn" data-url="${issue.html_url}">GitHub \u2197</button>
              </div>
            </div>
          `;
        }).join('');

        // 페이지네이션
        paginationEl.style.display = 'flex';
        qs('#qaGhPrev', overlay).disabled = !result.hasPrev;
        qs('#qaGhNext', overlay).disabled = !result.hasNext;
        qs('#qaGhPageInfo', overlay).textContent = `${currentPage} 페이지`;

        bindActions();
      } catch(err) {
        const msg = err.message || '';
        if (msg.includes('401')) body.innerHTML = '<div style="text-align:center;color:#ef4444;padding:20px;">토큰이 만료되었습니다. 설정에서 재발급하세요.</div>';
        else body.innerHTML = '<div style="text-align:center;color:#ef4444;padding:20px;">이슈를 불러올 수 없습니다. 설정을 확인하세요.</div>';
        paginationEl.style.display = 'none';
      }
    }

    function bindActions() {
      body.querySelectorAll('.qa-gh-link-btn').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); window.open(btn.dataset.url, '_blank'); };
      });
      body.querySelectorAll('.qa-gh-review-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          overlay.remove();
          enterIssueReviewMode(parseInt(btn.dataset.number), btn.dataset.url, btn.dataset.title);
        };
      });
      body.querySelectorAll('.qa-gh-archive-btn').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          archivedList.push({ number: parseInt(btn.dataset.number), url: btn.dataset.url, title: btn.dataset.title });
          await saveArchivedIssues(archivedList);
          showToast(`이슈 #${btn.dataset.number} 아카이브됨`);
          loadPage();
        };
      });
      body.querySelectorAll('.qa-gh-restore-btn').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const num = parseInt(btn.dataset.number);
          archivedList = archivedList.filter(a => a.number !== num);
          await saveArchivedIssues(archivedList);
          showToast(`이슈 #${num} 복원됨`);
          loadPage();
        };
      });
    }

    // 필터 탭
    qs('#qaGhFilterTabs', overlay).querySelectorAll('.qa-gh-filter-tab').forEach(tab => {
      tab.onclick = () => {
        qs('#qaGhFilterTabs', overlay).querySelectorAll('.qa-gh-filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFilter = tab.dataset.filter;
        currentPage = 1;
        loadPage();
      };
    });

    // 페이지네이션 버튼
    qs('#qaGhPrev', overlay).onclick = () => { if (currentPage > 1) { currentPage--; loadPage(); } };
    qs('#qaGhNext', overlay).onclick = () => { currentPage++; loadPage(); };

    loadPage();
  }

  /* ===== Issue 재검수 모드 ===== */
  let issueReviewState = null;

  function enterIssueReviewMode(issueNumber, issueUrl, issueTitle) {
    issueReviewState = { number: issueNumber, url: issueUrl, title: issueTitle };

    showToast('Closed 이슈의 피드백을 확인하세요. 수정이 안 됐으면 "재전송"을 눌러주세요.');

    // 패널에 재검수 UI 추가
    const body = qs('#qaPanelBody');
    const existingReviewUI = qs('#qaIssueReviewUI');
    if (existingReviewUI) existingReviewUI.remove();

    const reviewUI = ce('div');
    reviewUI.id = 'qaIssueReviewUI';
    reviewUI.innerHTML = `
      <div class="qa-feedback-sep"></div>
      <div style="padding:8px 14px;font-size:12px;color:#94a3b8;">
        \uD83D\uDD0D 재검수 모드<br>
        <span style="color:#e2e8f0;font-weight:600;">${truncate(issueTitle, 30)} #${issueNumber}</span>
      </div>
      <button class="qa-feedback-btn" id="qaIssueReviewOk" style="color:#22c55e;">
        <span class="qa-fb-icon">\u2705</span> 검수 완료
      </button>
      <button class="qa-feedback-btn" id="qaIssueReviewResend" style="color:#f59e0b;">
        <span class="qa-fb-icon">\uD83D\uDD04</span> 재전송
      </button>
      <button class="qa-feedback-btn" id="qaIssueReviewCancel" style="color:#94a3b8;">
        <span class="qa-fb-icon">\u274C</span> 취소
      </button>
    `;
    body.appendChild(reviewUI);

    qs('#qaIssueReviewOk').onclick = () => {
      exitIssueReviewMode();
      showToast('검수 완료 처리되었습니다.');
    };

    qs('#qaIssueReviewResend').onclick = async () => {
      const mapping = await getGitHubMapping();
      if (!mapping) { showToast('GitHub 설정이 필요합니다.'); return; }

      qs('#qaIssueReviewResend').disabled = true;
      qs('#qaIssueReviewResend').innerHTML = '<span class="qa-fb-icon">\uD83D\uDD04</span> 전송 중...';

      try {
        // Reopen
        const reopenRes = await fetch(`https://api.github.com/repos/${mapping.repoOwner}/${mapping.repoName}/issues/${issueNumber}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${mapping.token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: 'open' })
        });

        if (!reopenRes.ok) {
          const status = reopenRes.status;
          if (status === 401) showToast('❌ 토큰이 만료되었습니다.');
          else if (status === 403) showToast('❌ 권한이 없습니다.');
          else if (status === 404) showToast('❌ 이슈를 찾을 수 없습니다.');
          else showToast(`❌ 재오픈 실패 (${status})`);
          qs('#qaIssueReviewResend').disabled = false;
          qs('#qaIssueReviewResend').innerHTML = '<span class="qa-fb-icon">\uD83D\uDD04</span> 재전송';
          return;
        }

        // Comment
        await fetch(`https://api.github.com/repos/${mapping.repoOwner}/${mapping.repoName}/issues/${issueNumber}/comments`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${mapping.token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: '재검수 결과: 수정이 확인되지 않아 재오픈합니다.' })
        });

        exitIssueReviewMode();
        showToast(`이슈 #${issueNumber}이 재오픈되었습니다.`);
      } catch(err) {
        showToast('❌ 네트워크 오류');
        qs('#qaIssueReviewResend').disabled = false;
        qs('#qaIssueReviewResend').innerHTML = '<span class="qa-fb-icon">\uD83D\uDD04</span> 재전송';
      }
    };

    qs('#qaIssueReviewCancel').onclick = () => exitIssueReviewMode();
  }

  function exitIssueReviewMode() {
    issueReviewState = null;
    const ui = qs('#qaIssueReviewUI');
    if (ui) ui.remove();
  }

  /* Issue 생성 */
  async function ensureLabelExists(owner, repo, token) {
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/labels/qa-feedback`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (res.status === 404) {
        await fetch(`https://api.github.com/repos/${owner}/${repo}/labels`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'qa-feedback', color: 'c5def5', description: 'QA 피드백 자동 생성' })
        });
      }
    } catch(e) { /* label 생성 실패해도 무시 */ }
  }

  async function createGitHubIssue(markdown, feedbackCount) {
    const mapping = await getGitHubMapping();
    if (!mapping) {
      showToast('GitHub 설정이 필요합니다. 🔗 GitHub 설정에서 연결하세요.');
      return null;
    }

    const { repoOwner, repoName, token } = mapping;
    const today = new Date().toISOString().slice(0, 10);
    const pathname = location.pathname.split('/').pop() || 'index';
    const title = `[QA] ${pathname} — 피드백 ${feedbackCount}건 (${today})`;

    await ensureLabelExists(repoOwner, repoName, token);

    try {
      const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title,
          body: markdown,
          labels: ['qa-feedback']
        })
      });

      if (res.ok) {
        const data = await res.json();
        return { number: data.number, url: data.html_url };
      } else if (res.status === 401) {
        showToast('❌ 토큰이 만료되었습니다. GitHub 설정에서 토큰을 재설정하세요.');
      } else if (res.status === 403) {
        showToast('❌ 권한이 없습니다. 토큰 권한을 확인하세요.');
      } else if (res.status === 404) {
        showToast('❌ 레포를 찾을 수 없습니다. GitHub 설정을 확인하세요.');
      } else {
        showToast(`❌ Issue 생성 실패 (${res.status})`);
      }
      return null;
    } catch(err) {
      showToast('❌ 네트워크 오류로 Issue 생성에 실패했습니다.');
      return null;
    }
  }

  /* Issue 이력 저장 (세션에 기록) */
  async function recordIssueHistory(issueData, type) {
    const data = await getSessionsData();
    // 현재 피드백 URL에 해당하는 가장 최근 세션 찾기
    const currentPath = location.pathname;
    const session = data.sessions.find(s => s.page === currentPath && s.status !== 'closed');
    if (session) {
      if (!session.issueHistory) session.issueHistory = [];
      session.issueHistory.push({
        issueNumber: issueData.number,
        issueUrl: issueData.url,
        sentAt: new Date().toISOString(),
        feedbackCount: STATE.feedbacks.length,
        type: type || 'initial'
      });
      await saveSessionsData(data);
    }
  }

  /* 현재 피드백의 Issue 전송 이력 확인 */
  async function getLastIssueHistory() {
    const data = await getSessionsData();
    const currentPath = location.pathname;
    for (let i = data.sessions.length - 1; i >= 0; i--) {
      const s = data.sessions[i];
      if (s.page === currentPath && s.issueHistory && s.issueHistory.length > 0) {
        return s.issueHistory[s.issueHistory.length - 1];
      }
    }
    return null;
  }

  /* ===== Overlay Visibility ===== */
  function isElementVisible(el) {
    if (!el || !el.isConnected) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (!el.offsetParent && cs.position !== 'fixed') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function refreshOverlayVisibility() {
    document.querySelectorAll('.qa-feedback-selected-overlay, .qa-feedback-review-overlay').forEach(ov => {
      const id = ov.dataset.qaId || ov.dataset.qaReviewIdx;
      if (!id) return;

      const fb = STATE.feedbacks.find(f => String(f.id) === String(id));
      if (!fb || !fb.selector) return;

      const el = document.querySelector(fb.selector);
      if (el && isElementVisible(el)) {
        ov.style.display = '';
        // 위치 갱신
        const rect = el.getBoundingClientRect();
        ov.style.left = (rect.left + window.scrollX) + 'px';
        ov.style.top = (rect.top + window.scrollY) + 'px';
        ov.style.width = rect.width + 'px';
        ov.style.height = rect.height + 'px';
      } else {
        ov.style.display = 'none';
      }
    });
  }

  let visibilityTimer = null;
  function debouncedRefresh() {
    if (visibilityTimer) clearTimeout(visibilityTimer);
    visibilityTimer = setTimeout(refreshOverlayVisibility, 300);
  }

  /* MutationObserver: DOM 변화 감지 */
  function startMutationObserver() {
    const observer = new MutationObserver(debouncedRefresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  }

  /* URL 변화 감지 (SPA 대응) */
  let lastUrl = location.href;

  function onUrlChange() {
    const newUrl = location.href;
    if (newUrl === lastUrl) return;
    lastUrl = newUrl;
    currentUrl = location.origin + location.pathname;

    // 기존 오버레이 모두 제거
    document.querySelectorAll('.qa-feedback-selected-overlay').forEach(e => e.remove());
    if (currentPopup) { currentPopup.remove(); currentPopup = null; }

    // 새 URL의 피드백 복원
    STATE.feedbacks = [];
    STATE.nextId = 1;
    restoreFeedbacks();
  }

  window.addEventListener('popstate', onUrlChange);

  // pushState / replaceState 감지
  const origPushState = history.pushState;
  const origReplaceState = history.replaceState;
  history.pushState = function() {
    origPushState.apply(this, arguments);
    setTimeout(onUrlChange, 0);
  };
  history.replaceState = function() {
    origReplaceState.apply(this, arguments);
    setTimeout(onUrlChange, 0);
  };

  /* 주기적 체크 (백업) */
  setInterval(refreshOverlayVisibility, 2000);

  /* ===== Init ===== */
  async function init() {
    await loadShortcuts();
    buildPanel();
    panel.style.display = 'none';
    buildSettings();
    updateHints();
    await restoreFeedbacks();
    startMutationObserver();
    console.log('[QA Feedback] Content script loaded');
  }

  init();
})();
