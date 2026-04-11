import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let cached: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client for the given config.
 *
 * Pass the URL and anon key explicitly — each app (extension, landing,
 * worker) decides how to source them (import.meta.env, process.env,
 * chrome.storage, etc.) and hands them in.
 */
export function getSupabaseClient(config: SupabaseConfig): SupabaseClient {
  if (cached) return cached;
  if (!config.url || !config.anonKey) {
    throw new Error(
      '[@pinthat/supabase] Missing url or anonKey when initializing client.',
    );
  }
  cached = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return cached;
}

/** Escape hatch for tests — clears the cached singleton. */
export function resetSupabaseClient(): void {
  cached = null;
}
