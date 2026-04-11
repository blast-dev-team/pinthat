/**
 * Supabase client for the extension popup.
 *
 * Reads config from Vite env vars:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * Set these in `apps/extension/.env.local`.
 */
import { getSupabaseClient } from '../../../../packages/supabase/supabase/src';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigMissing = !url || !anonKey;

export const supabase = supabaseConfigMissing
  ? null
  : getSupabaseClient({ url: url!, anonKey: anonKey! });
