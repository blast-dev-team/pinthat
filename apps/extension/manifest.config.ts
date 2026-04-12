import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'PinThat',
  version: pkg.version,
  description: 'Visualize your instructions. Pin it. Tell AI what to do.',
  permissions: ['activeTab', 'storage', 'clipboardWrite', 'identity', 'downloads'],
  host_permissions: [
    'https://*.supabase.co/*',
  ],
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
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
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
});
