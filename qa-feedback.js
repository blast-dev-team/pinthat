/**
 * QA Feedback Tool — Agentation-style visual QA for pure HTML/JS projects
 * Always active when script is loaded. Remove <script> tag for production.
 */
(function() {
  'use strict';

  /* ===== State ===== */
  const STATE = {
    active: false,          // inspection mode on/off
    mode: 'element',        // element | text | area
    feedbacks: [],          // { id, el, selector, section, tagName, classes, textContent, bbox, styles, feedback, selectedText, areaBox, fbType }
    nextId: 1,
    detailLevel: 'standard', // compact | standard | detailed | forensic
    animPaused: false,
    dragStart: null,         // area selection start {x,y}
    panelCollapsed: false,
    panelPos: null,          // {x,y} for drag
    reviewMode: false,       // 재검수 모드 on/off
    reviewSessionId: null,   // 재검수 중인 세션 ID
    savedFeedbacksBeforeReview: null, // 재검수 진입 전 기존 피드백 임시 저장
  };

  /* ===== Storage ===== */
  const STORAGE_KEY = 'qa-feedbacks-' + location.pathname;
  const SESSIONS_KEY = 'qa-sessions';

  function saveFeedbacks() {
    try {
      const data = STATE.feedbacks.map(fb => ({
        ...fb,
        el: null
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        feedbacks: data,
        nextId: STATE.nextId
      }));
    } catch(e) {}
  }

  function restoreFeedbacks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const { feedbacks, nextId } = JSON.parse(saved);
      if (!feedbacks || feedbacks.length === 0) return;

      STATE.feedbacks = feedbacks;
      STATE.nextId = nextId || feedbacks.length + 1;

      feedbacks.forEach(fb => {
        if (fb.selector) {
          const el = document.querySelector(fb.selector);
          if (el) {
            fb.el = el;
            addOverlay(el, fb.id);
          }
        } else if (fb.areaBox) {
          addAreaOverlay(fb.areaBox, fb.id);
        }
      });

      updateCount();
    } catch(e) {}
  }

  /* ===== Helpers ===== */
  function qs(s, root) { return (root || document).querySelector(s); }
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

  /* ===== Inject Styles ===== */
  function injectStyles() {
    const style = ce('style');
    style.textContent = `
      .qa-feedback-panel { position:fixed; z-index:99999; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:13px; color:#e2e8f0; user-select:none; }
      .qa-feedback-panel * { box-sizing:border-box; }
      .qa-feedback-panel-inner { background:#1e293b; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); overflow:hidden; min-width:220px; }
      .qa-feedback-panel-header { padding:10px 14px; background:#0f172a; cursor:move; display:flex; align-items:center; justify-content:space-between; }
      .qa-feedback-panel-header span { font-weight:600; font-size:13px; }
      .qa-feedback-panel-body { padding:6px 0; }
      .qa-feedback-btn { display:flex; align-items:center; gap:8px; width:100%; padding:9px 14px; background:none; border:none; color:#cbd5e1; font-size:13px; cursor:pointer; text-align:left; transition:background .15s; }
      .qa-feedback-btn:hover { background:#334155; color:#f1f5f9; }
      .qa-feedback-btn.active { background:#2563eb; color:#fff; }
      .qa-feedback-btn .qa-fb-icon { width:18px; text-align:center; flex-shrink:0; }
      .qa-feedback-sep { height:1px; background:#334155; margin:4px 0; }
      .qa-feedback-badge-count { background:#ef4444; color:#fff; font-size:10px; border-radius:8px; padding:1px 6px; margin-left:auto; font-weight:600; }
      .qa-feedback-collapse-btn { background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px; padding:2px 4px; }

      /* Overlay */
      .qa-feedback-hover-overlay { position:fixed; pointer-events:none; z-index:99990; border:2px solid #3b82f6; background:rgba(59,130,246,0.08); transition:all .05s; }
      .qa-feedback-selected-overlay { position:absolute; z-index:99980; border:2px solid #ef4444; background:rgba(239,68,68,0.06); pointer-events:none; border-radius:4px; }
      .qa-feedback-number-badge { position:absolute; top:-10px; left:-10px; z-index:99981; background:#ef4444; color:#fff; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; pointer-events:auto; cursor:pointer; }
      .qa-feedback-area-select { position:fixed; z-index:99991; border:2px dashed #f59e0b; background:rgba(245,158,11,0.1); pointer-events:none; }

      /* Popup */
      .qa-feedback-popup { position:fixed; z-index:99998; background:#fff; border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,0.25); width:340px; color:#1e293b; }
      .qa-feedback-popup-header { padding:14px 16px 10px; border-bottom:1px solid #e2e8f0; }
      .qa-feedback-popup-header .qa-fb-sel { font-size:12px; color:#64748b; font-family:monospace; word-break:break-all; }
      .qa-feedback-popup-header .qa-fb-loc { font-size:11px; color:#94a3b8; margin-top:2px; }
      .qa-feedback-popup-body { padding:14px 16px; }
      .qa-feedback-popup-body textarea { width:100%; min-height:80px; border:1px solid #e2e8f0; border-radius:8px; padding:10px; font-size:13px; font-family:inherit; resize:vertical; outline:none; }
      .qa-feedback-popup-body textarea:focus { border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,0.15); }
      .qa-feedback-popup-footer { padding:10px 16px 14px; display:flex; gap:8px; justify-content:flex-end; }
      .qa-feedback-popup-footer button { padding:7px 16px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; border:none; }
      .qa-feedback-popup-footer .qa-fb-save { background:#2563eb; color:#fff; }
      .qa-feedback-popup-footer .qa-fb-save:hover { background:#1d4ed8; }
      .qa-feedback-popup-footer .qa-fb-cancel { background:#f1f5f9; color:#475569; }
      .qa-feedback-popup-footer .qa-fb-delete { background:#fef2f2; color:#ef4444; }

      /* Settings popup (centered with backdrop) */
      .qa-settings-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:100000; display:flex; align-items:center; justify-content:center; }
      .qa-settings-modal { background:#1e293b; border-radius:16px; width:360px; box-shadow:0 12px 40px rgba(0,0,0,0.5); color:#e2e8f0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
      .qa-settings-modal-header { padding:16px 20px; border-bottom:1px solid #334155; display:flex; align-items:center; justify-content:space-between; }
      .qa-settings-modal-header h3 { font-size:15px; font-weight:600; margin:0; }
      .qa-settings-modal-body { padding:16px 20px; }
      .qa-settings-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; font-size:13px; color:#cbd5e1; }
      .qa-settings-key { background:#334155; padding:3px 10px; border-radius:4px; font-family:monospace; font-size:12px; min-width:32px; text-align:center; }
      .qa-settings-change { background:none; border:1px solid #475569; color:#94a3b8; padding:3px 10px; border-radius:4px; font-size:11px; cursor:pointer; }
      .qa-settings-change:hover { border-color:#3b82f6; color:#3b82f6; }
      .qa-settings-change.listening { background:#3b82f6; color:#fff; border-color:#3b82f6; }
      .qa-settings-modal-footer { padding:12px 20px; border-top:1px solid #334155; display:flex; gap:8px; justify-content:flex-end; }
      .qa-settings-modal-footer button { padding:7px 16px; border-radius:8px; font-size:12px; font-weight:500; cursor:pointer; border:none; }
      .qa-settings-btn-restore { background:#334155; color:#94a3b8; }
      .qa-settings-btn-restore:hover { background:#475569; color:#e2e8f0; }
      .qa-settings-btn-close { background:#475569; color:#e2e8f0; }
      .qa-settings-btn-close:hover { background:#64748b; }
      .qa-settings-btn-save { background:#2563eb; color:#fff; }
      .qa-settings-btn-save:hover { background:#1d4ed8; }

      /* Popup drag handle */
      .qa-feedback-popup-header { cursor:move; }

      /* Feedback type tabs */
      .qa-feedback-type-tabs { display:flex; gap:4px; padding:8px 16px 4px; }
      .qa-feedback-type-tab { padding:5px 12px; border-radius:6px; font-size:12px; border:1px solid #e2e8f0; background:#fff; cursor:pointer; color:#64748b; }
      .qa-feedback-type-tab.active { background:#1e293b; color:#fff; border-color:#1e293b; }

      /* Output modal */
      .qa-feedback-output-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:99999; display:flex; align-items:center; justify-content:center; }
      .qa-feedback-output-modal { background:#fff; border-radius:16px; width:90%; max-width:640px; max-height:85vh; display:flex; flex-direction:column; color:#1e293b; }
      .qa-feedback-output-modal-header { padding:18px 20px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; }
      .qa-feedback-output-modal-header h3 { font-size:16px; margin:0; }
      .qa-feedback-output-levels { display:flex; gap:6px; padding:12px 20px; border-bottom:1px solid #f1f5f9; }
      .qa-feedback-output-levels button { padding:5px 12px; border-radius:6px; font-size:12px; border:1px solid #e2e8f0; background:#fff; cursor:pointer; color:#64748b; }
      .qa-feedback-output-levels button.active { background:#1e293b; color:#fff; border-color:#1e293b; }
      .qa-feedback-output-pre { flex:1; overflow:auto; padding:16px 20px; }
      .qa-feedback-output-pre pre { white-space:pre-wrap; font-size:12px; line-height:1.6; font-family:'SF Mono',Menlo,monospace; background:#f8fafc; padding:16px; border-radius:8px; border:1px solid #e2e8f0; }
      .qa-feedback-output-actions { padding:14px 20px; border-top:1px solid #e2e8f0; display:flex; gap:8px; justify-content:flex-end; }
      .qa-feedback-output-actions button { padding:8px 20px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; border:none; }

      /* Review mode pin */
      .qa-feedback-review-overlay { position:absolute; z-index:99980; border:2px solid #f59e0b; background:rgba(245,158,11,0.08); pointer-events:none; border-radius:4px; }
      .qa-feedback-review-overlay.not-found { border-color:#6b7280; background:rgba(107,114,128,0.08); }
      .qa-feedback-review-badge { position:absolute; top:-10px; left:-10px; z-index:99981; background:#f59e0b; color:#fff; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; pointer-events:auto; cursor:pointer; }
      .qa-feedback-review-badge.not-found { background:#6b7280; }
      .qa-feedback-review-badge.fixed { background:#22c55e; }
      .qa-feedback-review-badge.not-fixed { background:#ef4444; }

      /* Review popup */
      .qa-feedback-review-popup { position:fixed; z-index:99998; background:#fff; border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,0.25); width:320px; color:#1e293b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
      .qa-feedback-review-popup-header { padding:14px 16px 10px; border-bottom:1px solid #e2e8f0; cursor:move; }
      .qa-feedback-review-popup-body { padding:14px 16px; }
      .qa-review-radio-group { display:flex; flex-direction:column; gap:8px; margin:10px 0; }
      .qa-review-radio { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:13px; border:1px solid #e2e8f0; transition:background .15s; }
      .qa-review-radio:hover { background:#f8fafc; }
      .qa-review-radio.selected { border-color:#2563eb; background:#eff6ff; }
      .qa-review-radio input { display:none; }

      /* Review complete button */
      .qa-feedback-btn.review-complete { background:#f59e0b; color:#fff; }
      .qa-feedback-btn.review-complete:hover { background:#d97706; }

      /* Mobile */
      @media(max-width:480px) {
        .qa-feedback-popup { width:calc(100vw - 24px); left:12px!important; }
        .qa-feedback-output-modal { width:96%; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ===== Panel UI ===== */
  let panel, hoverOverlay, areaBox;

  function buildPanel() {
    panel = ce('div', 'qa-feedback-panel');
    panel.style.bottom = '20px';
    panel.style.right = '20px';
    panel.innerHTML = `
      <div class="qa-feedback-panel-inner">
        <div class="qa-feedback-panel-header" id="qaPanelHeader">
          <span>QA 검수 도구</span>
          <button class="qa-feedback-collapse-btn" id="qaCollapseBtn">−</button>
        </div>
        <div class="qa-feedback-panel-body" id="qaPanelBody">
          <button class="qa-feedback-btn" id="qaToggleMode">
            <span class="qa-fb-icon">🔍</span> 검수 모드 OFF <span class="qa-shortcut-hint" style="font-size:10px;color:#64748b;margin-left:auto;">⌥Q</span>
          </button>
          <div class="qa-feedback-sep"></div>
          <button class="qa-feedback-btn" id="qaModeElement" disabled>
            <span class="qa-fb-icon">📌</span> 요소 선택 <span class="qa-feedback-badge-count" id="qaCount">0</span> <span class="qa-shortcut-hint" data-action="element" style="font-size:10px;color:#64748b;margin-left:auto;">1</span>
          </button>
          <button class="qa-feedback-btn" id="qaModeText" disabled>
            <span class="qa-fb-icon">📝</span> 텍스트 선택 <span class="qa-shortcut-hint" data-action="text" style="font-size:10px;color:#64748b;margin-left:auto;">2</span>
          </button>
          <button class="qa-feedback-btn" id="qaModeArea" disabled>
            <span class="qa-fb-icon">▢</span> 영역 선택 <span class="qa-shortcut-hint" data-action="area" style="font-size:10px;color:#64748b;margin-left:auto;">3</span>
          </button>
          <button class="qa-feedback-btn" id="qaAnimPause" disabled>
            <span class="qa-fb-icon">⏸️</span> 애니메이션 중지
          </button>
          <div class="qa-feedback-sep"></div>
          <button class="qa-feedback-btn" id="qaExport">
            <span class="qa-fb-icon">📋</span> 마크다운 출력 <span class="qa-shortcut-hint" data-action="export" style="font-size:10px;color:#64748b;margin-left:auto;">E</span>
          </button>
          <button class="qa-feedback-btn" id="qaMarkdownImport">
            <span class="qa-fb-icon">📋</span> 마크다운 가져오기
          </button>
          <button class="qa-feedback-btn" id="qaReset" disabled>
            <span class="qa-fb-icon">🗑️</span> 초기화 <span class="qa-shortcut-hint" data-action="reset" style="font-size:10px;color:#64748b;margin-left:auto;">R</span>
          </button>
          <div class="qa-feedback-sep"></div>
          <button class="qa-feedback-btn" id="qaSessionSave">
            <span class="qa-fb-icon">💾</span> 세션 저장
          </button>
          <button class="qa-feedback-btn" id="qaSessionLoad">
            <span class="qa-fb-icon">📂</span> 세션 불러오기
          </button>
          <div class="qa-feedback-sep"></div>
          <button class="qa-feedback-btn" id="qaSettingsToggle">
            <span class="qa-fb-icon">⚙️</span> 단축키 설정
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Hover overlay
    hoverOverlay = ce('div', 'qa-feedback-hover-overlay');
    hoverOverlay.style.display = 'none';
    document.body.appendChild(hoverOverlay);

    // Area selection box
    areaBox = ce('div', 'qa-feedback-area-select');
    areaBox.style.display = 'none';
    document.body.appendChild(areaBox);

    // Events
    qs('#qaCollapseBtn').onclick = toggleCollapse;
    qs('#qaToggleMode').onclick = toggleActive;
    qs('#qaModeElement').onclick = () => setMode('element');
    qs('#qaModeText').onclick = () => setMode('text');
    qs('#qaModeArea').onclick = () => setMode('area');
    qs('#qaAnimPause').onclick = toggleAnimPause;
    qs('#qaExport').onclick = showOutput;
    qs('#qaReset').onclick = resetAll;
    qs('#qaSessionSave').onclick = saveSession;
    qs('#qaSessionLoad').onclick = loadSessionList;
    qs('#qaMarkdownImport').onclick = showMarkdownImport;

    // Drag panel
    initPanelDrag();
  }

  function toggleCollapse() {
    STATE.panelCollapsed = !STATE.panelCollapsed;
    qs('#qaPanelBody').style.display = STATE.panelCollapsed ? 'none' : '';
    qs('#qaCollapseBtn').textContent = STATE.panelCollapsed ? '+' : '−';
  }

  function toggleActive() {
    STATE.active = !STATE.active;
    const btn = qs('#qaToggleMode');
    btn.classList.toggle('active', STATE.active);
    btn.innerHTML = `<span class="qa-fb-icon">🔍</span> 검수 모드 ${STATE.active ? 'ON' : 'OFF'}`;
    const modeBtns = ['#qaModeElement','#qaModeText','#qaModeArea','#qaAnimPause','#qaReset'];
    modeBtns.forEach(s => { qs(s).disabled = !STATE.active; });
    if (STATE.active) {
      setMode('element');
    } else {
      hoverOverlay.style.display = 'none';
      document.body.style.cursor = '';
    }
    updateModeButtons();
  }

  function setMode(m) {
    STATE.mode = m;
    updateModeButtons();
    document.body.style.cursor = m === 'area' ? 'crosshair' : (STATE.active ? 'pointer' : '');
  }

  function updateModeButtons() {
    ['element','text','area'].forEach(m => {
      const id = '#qaMode' + m.charAt(0).toUpperCase() + m.slice(1);
      const btn = qs(id);
      if (btn) btn.classList.toggle('active', STATE.active && STATE.mode === m);
    });
  }

  function toggleAnimPause() {
    STATE.animPaused = !STATE.animPaused;
    document.documentElement.style.setProperty('--qa-anim', STATE.animPaused ? 'paused' : 'running');
    if (STATE.animPaused) {
      if (!qs('#qaAnimStyle')) {
        const s = ce('style');
        s.id = 'qaAnimStyle';
        s.textContent = '*, *::before, *::after { animation-play-state: paused !important; transition-duration: 0s !important; }';
        document.head.appendChild(s);
      }
    } else {
      const s = qs('#qaAnimStyle');
      if (s) s.remove();
    }
    qs('#qaAnimPause').classList.toggle('active', STATE.animPaused);
    qs('#qaAnimPause').innerHTML = `<span class="qa-fb-icon">⏸️</span> 애니메이션 ${STATE.animPaused ? '재개' : '중지'}`;
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
    return el && (el.closest('.qa-feedback-panel') || el.closest('.qa-feedback-popup') || el.closest('.qa-feedback-review-popup') || el.closest('.qa-feedback-output-overlay') || el.closest('.qa-settings-overlay') || el.classList.contains('qa-feedback-hover-overlay') || el.classList.contains('qa-feedback-area-select') || el.classList.contains('qa-feedback-selected-overlay') || el.classList.contains('qa-feedback-number-badge') || el.classList.contains('qa-feedback-review-overlay') || el.classList.contains('qa-feedback-review-badge') || el.classList.contains('qa-feedback-toast'));
  }

  function onMouseMove(e) {
    if (!STATE.active || STATE.mode !== 'element' || isQaElement(e.target)) {
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
    if (!STATE.active || isQaElement(e.target)) return;
    if (STATE.mode === 'element') {
      e.preventDefault();
      e.stopPropagation();
      hoverOverlay.style.display = 'none';
      showFeedbackPopup(e.target, e.shiftKey);
    }
  }

  function onMouseUp(e) {
    if (!STATE.active || STATE.mode !== 'text') return;
    const sel = window.getSelection();
    const text = sel.toString().trim();
    if (text.length > 0) {
      const anchorEl = sel.anchorNode.parentElement;
      if (!isQaElement(anchorEl)) {
        showFeedbackPopup(anchorEl, false, text);
      }
    }
  }

  // Area selection
  function onAreaDown(e) {
    if (!STATE.active || STATE.mode !== 'area' || isQaElement(e.target)) return;
    e.preventDefault();
    STATE.dragStart = { x: e.clientX, y: e.clientY };
    areaBox.style.display = 'block';
    areaBox.style.left = e.clientX + 'px';
    areaBox.style.top = e.clientY + 'px';
    areaBox.style.width = '0';
    areaBox.style.height = '0';
  }
  function onAreaMove(e) {
    if (!STATE.dragStart) return;
    const x = Math.min(STATE.dragStart.x, e.clientX);
    const y = Math.min(STATE.dragStart.y, e.clientY);
    const w = Math.abs(e.clientX - STATE.dragStart.x);
    const h = Math.abs(e.clientY - STATE.dragStart.y);
    areaBox.style.left = x + 'px';
    areaBox.style.top = y + 'px';
    areaBox.style.width = w + 'px';
    areaBox.style.height = h + 'px';
  }
  function onAreaUp(e) {
    if (!STATE.dragStart) return;
    const x = Math.min(STATE.dragStart.x, e.clientX);
    const y = Math.min(STATE.dragStart.y, e.clientY);
    const w = Math.abs(e.clientX - STATE.dragStart.x);
    const h = Math.abs(e.clientY - STATE.dragStart.y);
    STATE.dragStart = null;
    areaBox.style.display = 'none';
    if (w > 10 && h > 10) {
      showFeedbackPopup(null, false, null, { x: Math.round(x + window.scrollX), y: Math.round(y + window.scrollY), w: Math.round(w), h: Math.round(h) });
    }
  }

  document.addEventListener('mousemove', e => {
    onMouseMove(e);
    onAreaMove(e);
  }, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('mousedown', onAreaDown, true);
  document.addEventListener('mouseup', onAreaUp, true);

  // Touch support
  document.addEventListener('touchend', e => {
    if (!STATE.active || STATE.mode !== 'element' || isQaElement(e.target)) return;
    e.preventDefault();
    showFeedbackPopup(e.target, false);
  }, { passive: false });

  /* ===== Popup Drag Helper ===== */
  function makePopupDraggable(popup) {
    const header = popup.querySelector('.qa-feedback-popup-header');
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

  function showFeedbackPopup(el, isShift, selectedText, areaRect) {
    if (currentPopup) currentPopup.remove();

    // For shift+click, add to last feedback group
    if (isShift && STATE.feedbacks.length > 0 && el) {
      const last = STATE.feedbacks[STATE.feedbacks.length - 1];
      if (!last.multiEls) last.multiEls = [];
      last.multiEls.push(captureElement(el));
      addOverlay(el, STATE.feedbacks.length);
      updateCount();
      saveFeedbacks();
      return;
    }

    const info = el ? captureElement(el) : null;
    const popup = ce('div', 'qa-feedback-popup');

    // Position near element or area
    let posY = 100, posX = 100;
    if (el) {
      const r = el.getBoundingClientRect();
      posY = Math.min(r.bottom + 10, window.innerHeight - 300);
      posX = Math.min(r.left, window.innerWidth - 360);
    } else if (areaRect) {
      posY = Math.min(areaRect.y + areaRect.h + 10, window.innerHeight - 300);
      posX = Math.min(areaRect.x, window.innerWidth - 360);
    }
    if (posY < 10) posY = 10;
    if (posX < 10) posX = 10;

    popup.style.top = posY + 'px';
    popup.style.left = posX + 'px';

    const selectorText = info ? info.selector : '(영역 선택)';
    const locationText = info ? info.section : 'x:' + areaRect.x + ' y:' + areaRect.y;
    const textPreview = selectedText ? `<div style="font-size:11px;color:#2563eb;margin-top:4px;">선택 텍스트: "${truncate(selectedText, 60)}"</div>` : '';

    popup.innerHTML = `
      <div class="qa-feedback-popup-header">
        <div class="qa-fb-sel">${selectorText}</div>
        <div class="qa-fb-loc">${locationText}</div>
        ${textPreview}
      </div>
      <div class="qa-feedback-type-tabs" id="qaTypeTabs">
        <button class="qa-feedback-type-tab active" data-type="UI">🎨 UI</button>
        <button class="qa-feedback-type-tab" data-type="기능">⚙️ 기능</button>
        <button class="qa-feedback-type-tab" data-type="텍스트">📝 텍스트</button>
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

    // Type tab switching
    let selectedType = 'UI';
    qs('#qaTypeTabs', popup).querySelectorAll('.qa-feedback-type-tab').forEach(btn => {
      btn.onclick = () => {
        qs('#qaTypeTabs', popup).querySelectorAll('.qa-feedback-type-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedType = btn.dataset.type;
      };
    });

    setTimeout(() => qs('#qaFeedbackInput').focus(), 50);

    qs('#qaPopupCancel').onclick = () => { popup.remove(); currentPopup = null; };
    qs('#qaPopupSave').onclick = () => {
      const fb = qs('#qaFeedbackInput').value.trim();
      if (!fb) { qs('#qaFeedbackInput').style.borderColor = '#ef4444'; return; }
      const entry = {
        id: STATE.nextId++,
        el: el,
        selector: info ? info.selector : null,
        section: info ? info.section : null,
        tagName: info ? info.tagName : null,
        classes: info ? info.classes : [],
        textContent: info ? info.textContent : null,
        bbox: info ? info.bbox : areaRect,
        styles: info ? info.styles : null,
        feedback: fb,
        selectedText: selectedText || null,
        areaBox: areaRect || null,
        fbType: selectedType,
      };
      STATE.feedbacks.push(entry);
      if (el) addOverlay(el, entry.id);
      if (areaRect) addAreaOverlay(areaRect, entry.id);
      updateCount();
      saveFeedbacks();
      popup.remove();
      currentPopup = null;
    };

    // Enter key to save
    qs('#qaFeedbackInput').addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) qs('#qaPopupSave').click();
    });
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
    badge.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      showEditPopup(id, ov);
    };
    ov.appendChild(badge);

    document.body.appendChild(ov);
  }

  function addAreaOverlay(rect, id) {
    const ov = ce('div', 'qa-feedback-selected-overlay');
    ov.style.left = rect.x + 'px';
    ov.style.top = rect.y + 'px';
    ov.style.width = rect.w + 'px';
    ov.style.height = rect.h + 'px';
    ov.style.borderColor = '#f59e0b';
    ov.style.background = 'rgba(245,158,11,0.06)';
    ov.dataset.qaId = id;

    const badge = ce('div', 'qa-feedback-number-badge', id);
    badge.style.background = '#f59e0b';
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
        <div class="qa-fb-sel">${entry.selector || '(영역 선택)'}</div>
        <div class="qa-fb-loc">${entry.section || ''}</div>
      </div>
      <div class="qa-feedback-type-tabs" id="qaEditTypeTabs">
        <button class="qa-feedback-type-tab${curType==='UI'?' active':''}" data-type="UI">🎨 UI</button>
        <button class="qa-feedback-type-tab${curType==='기능'?' active':''}" data-type="기능">⚙️ 기능</button>
        <button class="qa-feedback-type-tab${curType==='텍스트'?' active':''}" data-type="텍스트">📝 텍스트</button>
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

    // Edit type tab switching
    let editType = curType;
    qs('#qaEditTypeTabs', popup).querySelectorAll('.qa-feedback-type-tab').forEach(btn => {
      btn.onclick = () => {
        qs('#qaEditTypeTabs', popup).querySelectorAll('.qa-feedback-type-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        editType = btn.dataset.type;
      };
    });

    qs('#qaPopupCancel').onclick = () => { popup.remove(); currentPopup = null; };
    qs('#qaPopupSave').onclick = () => {
      entry.feedback = qs('#qaFeedbackInput').value.trim();
      entry.fbType = editType;
      saveFeedbacks();
      popup.remove(); currentPopup = null;
    };
    qs('#qaPopupDelete').onclick = () => {
      STATE.feedbacks = STATE.feedbacks.filter(f => f.id !== id);
      document.querySelectorAll(`[data-qa-id="${id}"]`).forEach(e => e.remove());
      updateCount();
      saveFeedbacks();
      popup.remove(); currentPopup = null;
    };
  }

  /* ===== Markdown Output ===== */
  function generateMarkdown(level) {
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const page = location.pathname.split('/').pop() || 'index.html';

    let md = `# QA 피드백 — ${page}\n> 검수일: ${dateStr}\n> 총 피드백: ${STATE.feedbacks.length}건\n> 상세도: ${level}\n\n---\n\n`;

    STATE.feedbacks.forEach((fb, i) => {
      const num = i + 1;
      const sectionLabel = fb.section ? ` — ${fb.section}` : '';
      const tag = fb.tagName || '영역';
      const typeTag = fb.fbType ? `[${fb.fbType}] ` : '';
      md += `## ${circled(num)} ${typeTag}${tag}${sectionLabel}\n`;

      if (fb.selector) md += `- **요소**: \`${fb.selector}\`\n`;
      if (fb.areaBox) md += `- **영역**: x:${fb.areaBox.x} y:${fb.areaBox.y} ${fb.areaBox.w}x${fb.areaBox.h}\n`;

      if (level !== 'compact') {
        if (fb.textContent) md += `- **현재 텍스트**: "${truncate(fb.textContent, 80)}"\n`;
        if (fb.selectedText) md += `- **선택 텍스트**: "${fb.selectedText}"\n`;
      }

      md += `- **피드백**: ${fb.feedback}\n`;

      if (level === 'detailed' || level === 'forensic') {
        if (fb.bbox) md += `- **위치**: x:${fb.bbox.x} y:${fb.bbox.y} ${fb.bbox.w}x${fb.bbox.h}\n`;
        if (fb.multiEls && fb.multiEls.length > 0) {
          md += `- **추가 선택 요소**: ${fb.multiEls.map(e => '`' + e.selector + '`').join(', ')}\n`;
        }
      }

      if (level === 'forensic' && fb.styles) {
        md += `- **계산된 스타일**:\n`;
        Object.entries(fb.styles).forEach(([k, v]) => {
          if (v && v !== 'normal' && v !== 'none' && v !== '0px' && v !== 'rgba(0, 0, 0, 0)' && v !== 'static') {
            md += `  - ${k}: \`${v}\`\n`;
          }
        });
      }

      md += '\n';
    });

    md += `---\n> 이 피드백을 클로드 코드에 붙여넣어 수정을 요청하세요.\n`;
    return md;
  }

  function circled(n) {
    const chars = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
    return n <= 20 ? chars[n - 1] : '(' + n + ')';
  }

  function showOutput() {
    if (STATE.feedbacks.length === 0) {
      alert('피드백이 없습니다. 요소를 선택하고 피드백을 입력해주세요.');
      return;
    }

    const overlay = ce('div', 'qa-feedback-output-overlay');
    const md = generateMarkdown(STATE.detailLevel);

    overlay.innerHTML = `
      <div class="qa-feedback-output-modal">
        <div class="qa-feedback-output-modal-header">
          <h3>마크다운 출력 (${STATE.feedbacks.length}건)</h3>
          <button onclick="this.closest('.qa-feedback-output-overlay').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#94a3b8;">✕</button>
        </div>
        <div class="qa-feedback-output-levels" id="qaOutputLevels">
          <button data-level="compact">Compact</button>
          <button data-level="standard">Standard</button>
          <button data-level="detailed">Detailed</button>
          <button data-level="forensic">Forensic</button>
        </div>
        <div class="qa-feedback-output-pre">
          <pre id="qaOutputPre"></pre>
        </div>
        <div class="qa-feedback-output-actions">
          <button style="background:#f1f5f9;color:#475569;" onclick="this.closest('.qa-feedback-output-overlay').remove()">닫기</button>
          <button style="background:#1e293b;color:#fff;" id="qaCopyBtn">클립보드 복사</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Set initial level
    const pre = qs('#qaOutputPre', overlay);
    pre.textContent = md;

    // Level buttons
    qs('#qaOutputLevels', overlay).querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.level === STATE.detailLevel);
      btn.onclick = () => {
        STATE.detailLevel = btn.dataset.level;
        qs('#qaOutputLevels', overlay).querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
        pre.textContent = generateMarkdown(STATE.detailLevel);
      };
    });

    // Copy
    qs('#qaCopyBtn', overlay).onclick = () => {
      const text = pre.textContent;
      navigator.clipboard.writeText(text).then(() => {
        qs('#qaCopyBtn', overlay).textContent = '복사 완료!';
        setTimeout(() => { qs('#qaCopyBtn', overlay).textContent = '클립보드 복사'; }, 1500);
      });
    };

    // Close on overlay click
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  /* ===== Reset ===== */
  function resetAll() {
    if (!confirm('모든 피드백을 초기화하시겠습니까?')) return;
    STATE.feedbacks = [];
    STATE.nextId = 1;
    localStorage.removeItem(STORAGE_KEY);
    // Remove all overlays, badges, area markers
    document.querySelectorAll('.qa-feedback-selected-overlay, .qa-feedback-number-badge, .qa-feedback-area-select').forEach(e => {
      if (e !== areaBox) e.remove();
    });
    // Remove any open popup
    if (currentPopup) { currentPopup.remove(); currentPopup = null; }
    // Remove any open output modal
    document.querySelectorAll('.qa-feedback-output-overlay').forEach(e => e.remove());
    // Hide hover overlay
    hoverOverlay.style.display = 'none';
    updateCount();
  }

  /* ===== Session Manager ===== */
  function getSessionsData() {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (!raw) return { sessions: [] };
      return JSON.parse(raw);
    } catch(e) { return { sessions: [] }; }
  }

  function saveSessionsData(data) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(data));
  }

  function cleanOldSessions(data) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const old = data.sessions.filter(s => new Date(s.createdAt).getTime() < thirtyDaysAgo);
    if (old.length > 0) {
      data.sessions = data.sessions.filter(s => new Date(s.createdAt).getTime() >= thirtyDaysAgo);
      saveSessionsData(data);
    }
    return old;
  }

  function saveSession() {
    if (STATE.feedbacks.length === 0) {
      alert('저장할 피드백이 없습니다.');
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
    qs('#qaSessionNameSave', overlay).onclick = () => {
      const name = input.value.trim() || defaultName;
      const data = getSessionsData();
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
      saveSessionsData(data);
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
    Object.assign(toast.style, {
      position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
      background: '#1e293b', color: '#e2e8f0', padding: '10px 20px', borderRadius: '8px',
      fontSize: '13px', zIndex: '100000', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 1500);
    setTimeout(() => toast.remove(), 1800);
  }

  function loadSessionList() {
    const data = getSessionsData();
    const removed = cleanOldSessions(data);
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

    function renderList() {
      const freshData = getSessionsData();
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
        return `
          <div style="padding:12px 0;border-bottom:1px solid #334155;">
            <div style="font-size:14px;font-weight:600;color:#e2e8f0;margin-bottom:4px;">\u25B8 ${s.name}</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:8px;">
              ${count}\uAC74 \u00B7 ${date} \u00B7 <span style="color:${statusColor}">${s.status}</span>
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
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const d = getSessionsData();
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
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const d = getSessionsData();
          const session = d.sessions[idx];
          if (!session) return;
          if (!confirm('"' + session.name + '" \uC138\uC158\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) return;
          d.sessions.splice(idx, 1);
          saveSessionsData(d);
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
  function enterReviewMode(sessionIdx) {
    const data = getSessionsData();
    const session = data.sessions[sessionIdx];
    if (!session) return;

    // 기존 피드백 임시 저장
    if (STATE.feedbacks.length > 0) {
      STATE.savedFeedbacksBeforeReview = {
        feedbacks: STATE.feedbacks.map(fb => ({ ...fb, el: null })),
        nextId: STATE.nextId
      };
    }

    // 기존 오버레이 제거
    document.querySelectorAll('.qa-feedback-selected-overlay, .qa-feedback-review-overlay').forEach(e => e.remove());
    if (currentPopup) { currentPopup.remove(); currentPopup = null; }

    // 세션 상태를 reviewing으로 변경
    session.status = 'reviewing';
    data.sessions[sessionIdx] = session;
    saveSessionsData(data);

    STATE.reviewMode = true;
    STATE.reviewSessionId = session.id;
    STATE.feedbacks = session.feedbacks || [];
    STATE.nextId = session.nextId || STATE.feedbacks.length + 1;

    // reviewStatus/reviewNote 초기화
    STATE.feedbacks.forEach(fb => {
      if (!fb.reviewStatus) fb.reviewStatus = null;
      if (!fb.reviewNote) fb.reviewNote = '';
    });

    // 재검수 핀 복원
    STATE.feedbacks.forEach((fb, i) => {
      if (fb.selector) {
        const el = document.querySelector(fb.selector);
        if (el) {
          fb.el = el;
          addReviewOverlay(el, fb, i);
        } else {
          addReviewOverlayNotFound(fb, i);
        }
      } else if (fb.areaBox) {
        addReviewAreaOverlay(fb, i);
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
    badge.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      showReviewPopup(fb, idx, ov);
    };
    ov.appendChild(badge);
    document.body.appendChild(ov);
  }

  function addReviewOverlayNotFound(fb, idx) {
    // 요소를 못 찾은 경우: 저장된 bbox 위치에 회색 핀
    const bbox = fb.bbox || { x: 100, y: 100 + idx * 40, w: 100, h: 30 };
    const ov = ce('div', 'qa-feedback-review-overlay not-found');
    ov.style.left = (bbox.x + window.scrollX) + 'px';
    ov.style.top = (bbox.y + window.scrollY) + 'px';
    ov.style.width = bbox.w + 'px';
    ov.style.height = bbox.h + 'px';
    ov.dataset.qaReviewIdx = idx;

    const badge = ce('div', 'qa-feedback-review-badge not-found', (idx + 1));
    badge.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      showReviewPopup(fb, idx, ov);
    };
    ov.appendChild(badge);
    document.body.appendChild(ov);
  }

  function addReviewAreaOverlay(fb, idx) {
    const rect = fb.areaBox;
    const ov = ce('div', 'qa-feedback-review-overlay');
    ov.style.left = rect.x + 'px';
    ov.style.top = rect.y + 'px';
    ov.style.width = rect.w + 'px';
    ov.style.height = rect.h + 'px';
    ov.dataset.qaReviewIdx = idx;

    const badge = ce('div', 'qa-feedback-review-badge', (idx + 1));
    updateBadgeStatus(badge, fb.reviewStatus);
    badge.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      showReviewPopup(fb, idx, ov);
    };
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

    // 라디오 버튼 스타일링
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

      // 뱃지 상태 업데이트
      const badge = overlayEl.querySelector('.qa-feedback-review-badge');
      if (badge) updateBadgeStatus(badge, fb.reviewStatus);

      // 세션에 자동 저장
      saveReviewState();

      popup.remove();
      currentPopup = null;
    };
  }

  function saveReviewState() {
    if (!STATE.reviewSessionId) return;
    const data = getSessionsData();
    const session = data.sessions.find(s => s.id === STATE.reviewSessionId);
    if (!session) return;
    session.feedbacks = STATE.feedbacks.map(fb => ({ ...fb, el: null }));
    session.nextId = STATE.nextId;
    saveSessionsData(data);
  }

  function updateReviewPanel() {
    // 재검수 모드일 때 패널에 "재검수 완료" 버튼 표시
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

  function completeReview() {
    const md = generateReviewMarkdown();

    // 마크다운 출력 모달
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

    qs('#qaReviewOutputPre', overlay).textContent = md;

    qs('#qaReviewCopyBtn', overlay).onclick = () => {
      navigator.clipboard.writeText(md).then(() => {
        qs('#qaReviewCopyBtn', overlay).textContent = '\uBCF5\uC0AC \uC644\uB8CC!';
        setTimeout(() => { qs('#qaReviewCopyBtn', overlay).textContent = '\uD074\uB9BD\uBCF4\uB4DC \uBCF5\uC0AC'; }, 1500);
      });
    };

    qs('#qaReviewFinishBtn', overlay).onclick = () => {
      // 클립보드 복사 후 삭제 확인
      navigator.clipboard.writeText(md).then(() => {
        showToast('\uB9AC\uD3EC\uD2B8\uAC00 \uD074\uB9BD\uBCF4\uB4DC\uC5D0 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
        overlay.remove();

        const data = getSessionsData();
        const sessionIdx = data.sessions.findIndex(s => s.id === STATE.reviewSessionId);
        if (sessionIdx !== -1) {
          if (confirm('\uC138\uC158\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) {
            data.sessions.splice(sessionIdx, 1);
          } else {
            data.sessions[sessionIdx].status = 'closed';
            data.sessions[sessionIdx].feedbacks = STATE.feedbacks.map(fb => ({ ...fb, el: null }));
          }
          saveSessionsData(data);
        }
        exitReviewMode();
      });
    };

    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  function generateReviewMarkdown() {
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const page = location.pathname.split('/').pop() || 'index.html';

    // 원본 세션 날짜
    const data = getSessionsData();
    const session = data.sessions.find(s => s.id === STATE.reviewSessionId);
    const createdAt = session ? session.createdAt.replace('T', ' ').slice(0, 16) : '';

    const fixedCount = STATE.feedbacks.filter(fb => fb.reviewStatus === 'fixed').length;
    const notFixedCount = STATE.feedbacks.filter(fb => fb.reviewStatus === 'not-fixed').length;

    let md = `# QA \uC7AC\uAC80\uC218 \uB9AC\uD3EC\uD2B8 \u2014 ${page}\n`;
    md += `> \uC6D0\uBCF8 \uAC80\uC218\uC77C: ${createdAt}\n`;
    md += `> \uC7AC\uAC80\uC218\uC77C: ${dateStr}\n`;
    md += `> \uACB0\uACFC: ${fixedCount}\uAC74 \uC218\uC815\uB428 / ${notFixedCount}\uAC74 \uBBF8\uC218\uC815\n\n---\n\n`;

    STATE.feedbacks.forEach((fb, i) => {
      const num = i + 1;
      const typeTag = fb.fbType ? `[${fb.fbType}] ` : '';
      const tag = fb.tagName || '\uC601\uC5ED';
      const sectionLabel = fb.section ? ' \u2014 ' + fb.section : '';
      md += `## ${circled(num)} ${typeTag}${tag}${sectionLabel}\n`;
      if (fb.selector) md += `- **\uC694\uC18C**: \`${fb.selector}\`\n`;
      if (fb.areaBox) md += `- **\uC601\uC5ED**: x:${fb.areaBox.x} y:${fb.areaBox.y} ${fb.areaBox.w}x${fb.areaBox.h}\n`;
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

  function cancelReview() {
    // 세션 status를 open으로 되돌림
    const data = getSessionsData();
    const session = data.sessions.find(s => s.id === STATE.reviewSessionId);
    if (session) {
      session.status = 'open';
      saveSessionsData(data);
    }
    exitReviewMode();
    showToast('\uC7AC\uAC80\uC218\uAC00 \uCDE8\uC18C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
  }

  function exitReviewMode() {
    STATE.reviewMode = false;
    STATE.reviewSessionId = null;

    // 재검수 오버레이 제거
    document.querySelectorAll('.qa-feedback-review-overlay').forEach(e => e.remove());

    // 재검수 버튼들 제거
    ['#qaReviewCancel', '#qaReviewComplete', '#qaReviewSep'].forEach(id => {
      const el = qs(id);
      if (el) el.remove();
    });

    // 기존 피드백 복원
    if (STATE.savedFeedbacksBeforeReview) {
      STATE.feedbacks = STATE.savedFeedbacksBeforeReview.feedbacks;
      STATE.nextId = STATE.savedFeedbacksBeforeReview.nextId;
      STATE.savedFeedbacksBeforeReview = null;
      // 핀 복원
      STATE.feedbacks.forEach(fb => {
        if (fb.selector) {
          const el = document.querySelector(fb.selector);
          if (el) { fb.el = el; addOverlay(el, fb.id); }
        } else if (fb.areaBox) {
          addAreaOverlay(fb.areaBox, fb.id);
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
    // 기존 오버레이 제거
    document.querySelectorAll('.qa-feedback-selected-overlay').forEach(e => {
      if (e !== areaBox) e.remove();
    });
    if (currentPopup) { currentPopup.remove(); currentPopup = null; }

    STATE.feedbacks = session.feedbacks || [];
    STATE.nextId = session.nextId || STATE.feedbacks.length + 1;

    // 핀 복원
    STATE.feedbacks.forEach(fb => {
      if (fb.selector) {
        const el = document.querySelector(fb.selector);
        if (el) {
          fb.el = el;
          addOverlay(el, fb.id);
        }
      } else if (fb.areaBox) {
        addAreaOverlay(fb.areaBox, fb.id);
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

      // 헤더 파싱: ① [UI] DIV — sectionName
      const headerMatch = headerLine.match(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳\(\d+\)]+\s*(?:\[([^\]]*)\]\s*)?(\S+)?(?:\s*—\s*(.+))?/);
      const fbType = headerMatch ? (headerMatch[1] || 'UI') : 'UI';
      const tagName = headerMatch ? (headerMatch[2] || null) : null;
      const sectionName = headerMatch ? (headerMatch[3] || '').trim() || null : null;

      let selector = null;
      let feedback = null;
      let areaBox = null;
      let textContent = null;

      lines.forEach(line => {
        const selectorMatch = line.match(/^\- \*\*\uC694\uC18C\*\*:\s*`([^`]+)`/);
        if (selectorMatch) selector = selectorMatch[1];

        const feedbackMatch = line.match(/^\- \*\*\uD53C\uB4DC\uBC31\*\*:\s*(.+)/);
        if (feedbackMatch) feedback = feedbackMatch[1].trim();

        const areaMatch = line.match(/^\- \*\*\uC601\uC5ED\*\*:\s*x:(\d+)\s*y:(\d+)\s*(\d+)x(\d+)/);
        if (areaMatch) areaBox = { x: +areaMatch[1], y: +areaMatch[2], w: +areaMatch[3], h: +areaMatch[4] };

        const textMatch = line.match(/^\- \*\*\uD604\uC7AC \uD14D\uC2A4\uD2B8\*\*:\s*"([^"]*)"/);
        if (textMatch) textContent = textMatch[1];
      });

      if (feedback && (selector || areaBox)) {
        feedbacks.push({ selector, feedback, fbType, tagName, section: sectionName, areaBox, textContent });
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
    qs('#qaImportConfirm', overlay).onclick = () => {
      const md = textarea.value.trim();
      if (!md) { textarea.style.borderColor = '#ef4444'; return; }

      const parsed = parseMarkdown(md);
      if (parsed.length === 0) {
        alert('\uD53C\uB4DC\uBC31\uC744 \uD30C\uC2F1\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB9C8\uD06C\uB2E4\uC6B4 \uD615\uC2DD\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.');
        return;
      }

      const enterReview = qs('#qaImportReviewMode', overlay).checked;
      overlay.remove();

      // 기존 오버레이 제거
      document.querySelectorAll('.qa-feedback-selected-overlay').forEach(e => {
        if (e !== areaBox) e.remove();
      });
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
          selectedText: null,
          areaBox: p.areaBox || null,
          fbType: p.fbType,
        };

        if (p.selector) {
          const el = document.querySelector(p.selector);
          if (el) {
            fb.el = el;
            fb.bbox = { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) };
            addOverlay(el, id);
            restored++;
          }
        } else if (p.areaBox) {
          addAreaOverlay(p.areaBox, id);
          restored++;
        }

        STATE.feedbacks.push(fb);
      });

      updateCount();
      saveFeedbacks();
      showToast(parsed.length + '\uAC74\uC758 \uD53C\uB4DC\uBC31\uC744 \uAC00\uC838\uC654\uC2B5\uB2C8\uB2E4. (' + restored + '\uAC74 \uBCF5\uC6D0 \uC131\uACF5)');

      if (enterReview) {
        // 가져온 피드백을 세션으로 저장 후 재검수 진입
        const data = getSessionsData();
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
        saveSessionsData(data);
        const idx = data.sessions.length - 1;

        // 기존 오버레이 제거 (재검수 모드에서 다시 그림)
        document.querySelectorAll('.qa-feedback-selected-overlay').forEach(e => {
          if (e !== areaBox) e.remove();
        });

        enterReviewMode(idx);
      }
    };

    setTimeout(() => {
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }, 100);
  }

  /* ===== Shortcut Config (object-based for modifier support) ===== */
  const DEFAULT_KEYS = {
    toggle: { alt: true, key: 'q' },
    element: { key: '1' },
    text: { key: '2' },
    area: { key: '3' },
    export: { key: 'e' },
    reset: { key: 'r' },
  };
  let shortcutKeys = JSON.parse(JSON.stringify(DEFAULT_KEYS));

  function normalizeKeyConfig(v) {
    if (typeof v === 'string') return { key: v };
    return v;
  }

  function loadShortcuts() {
    try {
      const saved = localStorage.getItem('qa-shortcuts');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(k => {
          shortcutKeys[k] = normalizeKeyConfig(parsed[k]);
        });
      }
    } catch(e) {}
  }
  function saveShortcuts() {
    localStorage.setItem('qa-shortcuts', JSON.stringify(shortcutKeys));
  }

  function keyLabel(config) {
    config = normalizeKeyConfig(config);
    let label = '';
    if (config.ctrl) label += '⌃';
    if (config.alt) label += '⌥';
    if (config.shift) label += '⇧';
    if (config.meta) label += '⌘';
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

  /* ===== Settings Popup (centered with backdrop) ===== */
  function buildSettings() {
    const actions = [
      { key:'toggle', label:'검수 ON/OFF' },
      { key:'element', label:'요소 선택' },
      { key:'text', label:'텍스트 선택' },
      { key:'area', label:'영역 선택' },
      { key:'export', label:'마크다운 출력' },
      { key:'reset', label:'초기화' },
    ];

    qs('#qaSettingsToggle').onclick = () => {
      const draft = JSON.parse(JSON.stringify(shortcutKeys));

      const overlay = ce('div', 'qa-settings-overlay');
      overlay.innerHTML = `
        <div class="qa-settings-modal">
          <div class="qa-settings-modal-header">
            <h3>⚙️ 단축키 설정</h3>
          </div>
          <div class="qa-settings-modal-body" id="qaSettingsBody"></div>
          <div class="qa-settings-modal-footer">
            <button class="qa-settings-btn-restore" id="qaSettingsRestore">기본값 복원</button>
            <button class="qa-settings-btn-close" id="qaSettingsClose">닫기</button>
            <button class="qa-settings-btn-save" id="qaSettingsSave">저장</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      // Block background events while settings open (propagation only)
      ['mousedown','mouseup','mousemove'].forEach(evt => {
        overlay.addEventListener(evt, (ev) => {
          if (ev.target === overlay) ev.stopPropagation();
        }, true);
      });

      // Backdrop click to close — delayed to prevent immediate close on open
      setTimeout(() => {
        overlay.addEventListener('click', (ev) => {
          if (ev.target === overlay) {
            ev.stopPropagation();
            overlay.remove();
          }
        });
      }, 100);

      function renderRows() {
        const body = qs('#qaSettingsBody', overlay);
        body.innerHTML = actions.map(a =>
          `<div class="qa-settings-row">
            <span>${a.label}</span>
            <span class="qa-settings-key">${keyLabel(draft[a.key])}</span>
            <button class="qa-settings-change" data-action="${a.key}">변경</button>
          </div>`
        ).join('');

        body.querySelectorAll('.qa-settings-change').forEach(btn => {
          btn.onclick = () => {
            btn.textContent = '키 입력...';
            btn.classList.add('listening');
            const handler = (ev) => {
              ev.preventDefault(); ev.stopPropagation();
              // Ignore modifier-only keys
              if (['Alt','Control','Shift','Meta'].includes(ev.key)) return;
              if (ev.key === 'Escape') { btn.textContent = '변경'; btn.classList.remove('listening'); document.removeEventListener('keydown', handler, true); return; }
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
    // Block shortcuts when settings popup is open
    if (document.querySelector('.qa-settings-overlay')) return;

    // Toggle inspection mode
    if (matchShortcut(e, shortcutKeys.toggle)) {
      e.preventDefault();
      toggleActive();
      return;
    }

    // Escape → close popup or exit review mode
    if (e.key === 'Escape') {
      if (currentPopup) { currentPopup.remove(); currentPopup = null; return; }
      document.querySelectorAll('.qa-feedback-output-overlay').forEach(el => el.remove());
      if (STATE.reviewMode) { cancelReview(); return; }
      return;
    }

    // Export (works even when mode is OFF)
    if (matchShortcut(e, shortcutKeys.export)) { showOutput(); return; }

    // Below shortcuts only work when inspection mode is ON
    if (!STATE.active) return;

    if (matchShortcut(e, shortcutKeys.element)) { setMode('element'); return; }
    if (matchShortcut(e, shortcutKeys.text)) { setMode('text'); return; }
    if (matchShortcut(e, shortcutKeys.area)) { setMode('area'); return; }
    if (matchShortcut(e, shortcutKeys.reset)) { resetAll(); return; }
  });

  /* ===== Init ===== */
  loadShortcuts();
  injectStyles();
  buildPanel();
  buildSettings();
  updateHints();
  restoreFeedbacks();
})();
