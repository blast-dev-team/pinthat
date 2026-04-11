/**
 * Auth helpers for the popup.
 *
 * Email/password — plain Supabase auth.
 * Google OAuth — uses chrome.identity.launchWebAuthFlow with
 * signInWithOAuth({ skipBrowserRedirect: true }).
 *
 * Google provider setup in Supabase dashboard:
 *   Authentication → Providers → Google → enabled
 *   Add redirect URL: https://<extension-id>.chromiumapp.org/
 *   (value of chrome.identity.getRedirectURL())
 */
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigMissing } from './supabase';

export type AuthResult = { ok: true } | { ok: false; error: string };

function mustClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb: (user: User | null) => void) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const { error } = await mustClient().auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const { error } = await mustClient().auth.signUp({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  // Disable the inspection panel in every tab before clearing the session,
  // so no tab is left with the panel enabled while logged out.
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs.map((tab) =>
        tab.id != null
          ? chrome.tabs
              .sendMessage(tab.id, { action: 'disable-panel' })
              .catch(() => {})
          : Promise.resolve(),
      ),
    );
  } catch {
    /* ignore — panel-disable is best-effort */
  }
  await supabase.auth.signOut();
}

/**
 * Google OAuth via chrome.identity.launchWebAuthFlow.
 *
 * Supabase returns a URL we open via launchWebAuthFlow; after Google
 * redirects back to https://<extension-id>.chromiumapp.org/#access_token=…
 * we parse the fragment and hand the tokens to Supabase via setSession.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const client = mustClient();
    const redirectTo = chrome.identity.getRedirectURL();

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data?.url) {
      return { ok: false, error: error?.message ?? 'Google 로그인 URL을 얻지 못했습니다.' };
    }

    const redirectUrl = await chrome.identity.launchWebAuthFlow({
      url: data.url,
      interactive: true,
    });
    if (!redirectUrl) return { ok: false, error: '로그인이 취소되었습니다.' };

    const hash = new URL(redirectUrl).hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) {
      return { ok: false, error: '토큰을 받지 못했습니다.' };
    }

    const setRes = await client.auth.setSession({ access_token, refresh_token });
    if (setRes.error) return { ok: false, error: setRes.error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export { supabaseConfigMissing };
