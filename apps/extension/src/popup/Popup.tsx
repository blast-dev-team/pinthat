import { useEffect, useState } from 'react';
import { Globe, LogOut, Mail, Lock, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import {
  loadLangFromStorage,
  saveLangToStorage,
  t as tRaw,
  type Lang,
  type StringKey,
} from '../shared/i18n';
import {
  getSession,
  onAuthChange,
  signInWithPassword,
  signUpWithPassword,
  signOut,
  supabaseConfigMissing,
} from './auth';
import {
  fetchEntitlement,
  startCheckout,
  type Entitlement,
} from './entitlement';
import { setAccessAllowed } from '../shared/access';

interface TabStatus {
  active: boolean;
  feedbackCount: number;
}

async function sendToActiveTab<T = unknown>(
  message: Record<string, unknown>,
): Promise<T | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;

  // Retry up to 5 times (total ~2.5 s) to handle the case where the content
  // script hasn't mounted yet on a freshly-opened tab.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return (await chrome.tabs.sendMessage(tab.id, message)) as T;
    } catch {
      if (attempt < 4) await new Promise((r) => setTimeout(r, 500));
    }
  }
  return null;
}

export function Popup() {
  const [active, setActive] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [entitlement, setEntitlement] = useState<Entitlement>({ status: 'loading' });

  const t = (key: StringKey, vars?: Record<string, string | number>) =>
    tRaw(key, lang, vars);

  const refreshEntitlement = async () => {
    setEntitlement(await fetchEntitlement());
  };

  // Keep the cached access flag (read by the background service worker
  // when Alt+Q fires) in sync with the current entitlement.
  useEffect(() => {
    if (entitlement.status === 'loading') return;
    setAccessAllowed(entitlement.status === 'paid');
  }, [entitlement.status]);

  useEffect(() => {
    loadLangFromStorage().then(setLang);
    sendToActiveTab<TabStatus>({ action: 'get-status' }).then((res) => {
      if (res) setActive(res.active);
    });
    getSession().then((session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
      if (session?.user) refreshEntitlement();
      else setEntitlement({ status: 'unauthenticated' });
    });
    const unsub = onAuthChange((u) => {
      setUser(u);
      if (u) refreshEntitlement();
      else setEntitlement({ status: 'unauthenticated' });
    });
    // Re-check entitlement whenever the popup regains focus — catches
    // the case where the user just returned from a successful checkout.
    const onFocus = () => {
      if (user) refreshEntitlement();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      unsub();
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async () => {
    if (entitlement.status !== 'paid') return;
    const next = !active;
    setActive(next);
    await sendToActiveTab({ action: 'toggle-qa' });
  };

  const handleLangChange = async (next: Lang) => {
    setLang(next);
    await saveLangToStorage(next);
    await sendToActiveTab({ action: 'set-lang', lang: next });
  };

  return (
    <>
      <div className="header">
        <h1>{t('appName')}</h1>
        <p>v3.0.0</p>
      </div>

      {!authReady ? (
        <div className="body loading-body">
          <Loader2 size={18} className="spin" />
        </div>
      ) : !user ? (
        <LoginBody t={t} />
      ) : (
        <LoggedInBody
          t={t}
          active={active}
          onToggle={handleToggle}
          user={user}
          lang={lang}
          onLangChange={handleLangChange}
          entitlement={entitlement}
          onRefreshEntitlement={refreshEntitlement}
        />
      )}

    </>
  );
}

/* ───────── Logged-in view ───────── */

function LoggedInBody({
  t,
  active,
  onToggle,
  user,
  lang,
  onLangChange,
  entitlement,
  onRefreshEntitlement,
}: {
  t: (k: StringKey, v?: Record<string, string | number>) => string;
  active: boolean;
  onToggle: () => void;
  user: User;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  entitlement: Entitlement;
  onRefreshEntitlement: () => void;
}) {
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const isPaid = entitlement.status === 'paid';
  const isLoadingEntitlement = entitlement.status === 'loading';
  const toggleDisabled = !isPaid;

  const handlePurchase = async () => {
    setBuyError(null);
    setBuying(true);
    const res = await startCheckout();
    setBuying(false);
    if (!res.ok) setBuyError(res.error);
  };

  return (
    <div className="body">
      <div className="toggle-row">
        <span>{active ? t('btnModeOn') : t('btnModeOff')}</span>
        <div className={`toggle-switch${toggleDisabled ? ' is-disabled' : ''}`}>
          <input
            type="checkbox"
            id="qaToggle"
            checked={active}
            onChange={onToggle}
            disabled={toggleDisabled}
          />
          <label htmlFor="qaToggle"></label>
        </div>
      </div>

      {isPaid ? (
        <div className="plan-badge">
          <CheckCircle2 size={14} strokeWidth={2.5} />
          <span>{t('paywallPaidBadge')}</span>
        </div>
      ) : isLoadingEntitlement ? (
        <div className="plan-badge plan-badge-loading">
          <Loader2 size={14} className="spin" />
        </div>
      ) : (
        <div className="plan-card">
          <div className="plan-card-title">{t('paywallTitle')}</div>
          <div className="plan-card-desc">{t('paywallDesc')}</div>
          <div className="plan-card-price">{t('paywallPrice')}</div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePurchase}
            disabled={buying}
          >
            {buying ? <Loader2 size={14} className="spin" /> : t('paywallBuyBtn')}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={onRefreshEntitlement}
          >
            {t('paywallRefresh')}
          </button>
          {buyError && <div className="prompt-error">{buyError}</div>}
        </div>
      )}

      <div className="lang-row">
        <span className="lang-label">
          <Globe size={14} strokeWidth={2} />
          {t('langLabel')}
        </span>
        <select
          className="lang-select"
          value={lang}
          onChange={(e) => onLangChange(e.target.value as Lang)}
        >
          <option value="en">English</option>
          <option value="ko">한국어</option>
        </select>
      </div>

      <div className="user-row">
        <div className="user-info">
          <span className="user-label">{t('authSignedInAs')}</span>
          <span className="user-email" title={user.email ?? ''}>
            {user.email}
          </span>
        </div>
        <button className="icon-btn" onClick={() => signOut()} title={t('authSignOut')}>
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

/* ───────── Login view ───────── */

function LoginBody({
  t,
}: {
  t: (k: StringKey, v?: Record<string, string | number>) => string;
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (supabaseConfigMissing) {
    return (
      <div className="body">
        <div className="prompt-box">
          <div className="prompt-title">{t('authLoginRequired')}</div>
          <div className="prompt-error">{t('authConfigMissing')}</div>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email || !password) return;
    setLoading(true);
    const res =
      mode === 'signin'
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (mode === 'signup') setInfo(t('authSignUpSuccess'));
  };

  return (
    <div className="body">
      <div className="prompt-title">{t('authLoginPrompt')}</div>

      <form onSubmit={submit} className="auth-form">
        <label className="field">
          <Mail size={13} />
          <input
            type="email"
            placeholder={t('authEmail')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="field">
          <Lock size={13} />
          <input
            type="password"
            placeholder={t('authPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={6}
          />
        </label>

        {error && <div className="prompt-error">{error}</div>}
        {info && <div className="prompt-info">{info}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <Loader2 size={14} className="spin" />
          ) : mode === 'signin' ? (
            t('authSignIn')
          ) : (
            t('authSignUp')
          )}
        </button>
      </form>

      <button
        type="button"
        className="link-btn"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setError(null);
          setInfo(null);
        }}
      >
        {mode === 'signin' ? t('authSwitchToSignUp') : t('authSwitchToSignIn')}
      </button>
    </div>
  );
}

