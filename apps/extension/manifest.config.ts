import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 1,
  name: 'PinThat',
  version: pkg.version,
  description: 'Pin it, remember it, share it — visual QA feedback tool',
  permissions: ['activeTab', 'storage', 'clipboardWrite', 'identity'],
  host_permissions: [
    'https://*.supabase.co/*',
  ],
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*', 'file:///*'],
      js: ['src/content/index.tsx'],
      run_at: 'document_idle',
    },
  ],
  commands: {
    'toggle-qa': {
      suggested_key: { default: 'Alt+Q' },
      description: 'Toggle QA inspection mode',
    },
  },
  icons: {
    '16': 'icons/icon-16.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
});
