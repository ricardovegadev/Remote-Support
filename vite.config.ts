import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isPreviewEnv =
    process.env.DISABLE_HMR === 'true' ||
    Boolean(
      process.env.K_SERVICE ||
        process.env.K_REVISION ||
        process.env.K_CONFIGURATION ||
        process.env.CLOUD_RUN_TIMEOUT_SECONDS
    );

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // Allow AI Studio / Cloud Run proxy hostnames (*.run.app) in dev & preview.
      allowedHosts: true as const,
      // Disable HMR WebSocket in AI Studio / Cloud Run preview proxy to avoid
      // `@vite/client` "WebSocket closed without opened" errors.
      hmr: isPreviewEnv ? false : true,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
