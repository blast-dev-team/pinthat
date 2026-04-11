import { useCallback } from 'react';
import { useStore } from '../state/store';
import { t as tRaw, type StringKey } from '../../shared/i18n';

/**
 * Returns a translator bound to the current language. Re-renders the
 * subscriber whenever the language changes.
 */
export function useT() {
  const lang = useStore((s) => s.lang);
  return useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => tRaw(key, lang, vars),
    [lang],
  );
}
