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
  signInWithGoogle,
  signOut,
  supabaseConfigMissing,
} from './auth';
import {
  fetchEntitlement,
  startCheckout,
  type Entitlement,
} from './entitlement';

interface TabStatus {
  active: boolean;
  feedbackCount: number;
}

async function sendToActiveTab<T = unknown>(
  message: Record<string, unknown>,
): Promise<T | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  try {
    return (await chrome.tabs.sendMessage(tab.id, message)) as T;
  } catch {
    return null;
  }
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

      <div className="footer">{t('popupShortcutHint')}</div>
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

  const google = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    const res = await signInWithGoogle();
    setLoading(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <div className="body">
      <div className="prompt-title">{t('authLoginPrompt')}</div>

      <button
        type="button"
        className="btn btn-google"
        onClick={google}
        disabled={loading}
      >
        <GoogleIcon />
        {t('authGoogle')}
      </button>

      <div className="divider">
        <span>{t('authOr')}</span>
      </div>

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

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16.1 18.9 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.3l-6.2-5.2c-2 1.5-4.5 2.5-7.2 2.5-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.4 39.6 16.1 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41.3 35.4 44 30.1 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
