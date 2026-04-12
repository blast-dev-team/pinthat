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

export { supabaseConfigMissing };
