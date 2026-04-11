import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        success: resolve(__dirname, 'success.html'),
        paymentCallback: resolve(__dirname, 'payment/callback.html'),
      },
    },
  },
});
