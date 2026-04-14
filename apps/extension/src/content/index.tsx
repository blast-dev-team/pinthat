import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import cssText from './content.css?inline';
import { loadFeedbacksFromStorage, useStore } from './state/store';
import { loadLangFromStorage, LANG_STORAGE_KEY } from '../shared/i18n';
import { loadShortcutsFromStorage, SHORTCUTS_STORAGE_KEY } from './features/shortcuts';

/**
 * Content script entry.
 * Mounts a React root inside a Shadow DOM so that host-page styles cannot
 * affect our UI and vice-versa (CLAUDE.md rule: no style conflicts).
 */
function mount() {
  // Avoid double-mounting if the script re-runs (SPA soft-navs, HMR).
  if (document.getElementById('pinthat-root')) return;

  const host = document.createElement('div');
  host.id = 'pinthat-root';
  // Host element has no layout impact on the page.
  host.style.all = 'initial';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = cssText;
  shadow.appendChild(styleEl);

  const reactRoot = document.createElement('div');
  reactRoot.className = 'pinthat-root';
  shadow.appendChild(reactRoot);

  ReactDOM.createRoot(reactRoot).render(
    <React.StrictMode>
      <App shadowRoot={shadow} />
    </React.StrictMode>,
  );

  // Hydrate feedbacks from chrome.storage
  loadFeedbacksFromStorage().then(({ feedbacks, nextId }) => {
    useStore.getState().setFeedbacksFromStorage(feedbacks, nextId);
  });

  // Hydrate language preference from chrome.storage
  loadLangFromStorage().then((lang) => {
    useStore.getState().setLang(lang);
  });

  // Hydrate shortcut config from chrome.storage
  loadShortcutsFromStorage().then((shortcuts) => {
    // Direct set to avoid re-persisting what we just read.
    useStore.setState({ shortcuts });
  });

  // Keep language + shortcuts in sync if another extension surface changes them.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const nextLang = changes[LANG_STORAGE_KEY]?.newValue;
    if (nextLang === 'ko' || nextLang === 'en') {
      useStore.getState().setLang(nextLang);
    }
    const nextShortcuts = changes[SHORTCUTS_STORAGE_KEY]?.newValue;
    if (nextShortcuts && typeof nextShortcuts === 'object') {
      useStore.setState({ shortcuts: nextShortcuts });
    }
  });

  // Popup ↔ content messaging
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    const state = useStore.getState();
    if (msg.action === 'ping') {
      sendResponse({ pong: true });
      return true;
    }
    if (msg.action === 'get-status') {
      sendResponse({
        active: state.panelVisible,
        feedbackCount: state.feedbacks.length,
      });
      return true;
    }
    if (msg.action === 'toggle-qa') {
      state.togglePanelVisible();
      sendResponse({ ok: true });
      return true;
    }
    if (msg.action === 'disable-panel') {
      state.setPanelVisible(false);
      state.setPopup(null);
      sendResponse({ ok: true });
      return true;
    }
    if (msg.action === 'open-session-list') {
      state.setPopup({ kind: 'session-list' });
      sendResponse({ ok: true });
      return true;
    }
    if (msg.action === 'set-lang' && (msg.lang === 'ko' || msg.lang === 'en')) {
      state.setLang(msg.lang);
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
