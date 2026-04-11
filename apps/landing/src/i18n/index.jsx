import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import en from './locales/en.js';
import ko from './locales/ko.js';

const DICTS = { en, ko };
const SUPPORTED = Object.keys(DICTS);
const STORAGE_KEY = 'pinthat.lang';
const DEFAULT_LANG = 'en';

function detectInitialLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED.includes(stored)) return stored;
  const nav = window.navigator.language || '';
  const base = nav.toLowerCase().split('-')[0];
  return SUPPORTED.includes(base) ? base : DEFAULT_LANG;
}

// Dot-path lookup — `get(dict, "hero.title")`. Returns the key itself on miss
// so stale translations stand out in the UI instead of silently rendering "".
function get(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLang);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLangState(next);
  }, []);

  const value = useMemo(() => {
    const dict = DICTS[lang] || DICTS[DEFAULT_LANG];
    const t = (key) => {
      const val = get(dict, key);
      if (val === undefined) {
        const fallback = get(DICTS[DEFAULT_LANG], key);
        return fallback === undefined ? key : fallback;
      }
      return val;
    };
    return { lang, setLang, t, supported: SUPPORTED };
  }, [lang, setLang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useT must be used inside <LanguageProvider>');
  }
  return ctx;
}
