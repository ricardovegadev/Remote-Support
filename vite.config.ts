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
  const previewHosts = new Set(
    (process.env.PREVIEW_HOSTS ?? '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  );
  try {
    const appUrl = process.env.APP_URL?.trim();
    if (appUrl && appUrl !== 'MY_APP_URL') {
      previewHosts.add(new URL(appUrl).hostname.toLowerCase());
    }
  } catch {
    // Ignore placeholder or malformed APP_URL values; explicit preview hosts
    // and the Cloud Run suffix remain available as appropriate.
  }
  const allowedHosts = new Set(previewHosts);
  if (isPreviewEnv) allowedHosts.add('.run.app');
  if (process.env.ALLOW_QUICK_TUNNEL === 'true') {
    allowedHosts.add('.trycloudflare.com');
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
        '@supabase/supabase-js',
      ],
      entries: [
        'index.html',
        'src/main.tsx',
        'src/App.tsx',
        'src/components/**/*.tsx',
      ],
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 30,
              },
              {
                name: 'supabase-vendor',
                test: /node_modules[\\/]@supabase[\\/]/,
                priority: 25,
              },
              {
                name: 'lucide-vendor',
                test: /node_modules[\\/]lucide-react[\\/]/,
                priority: 20,
              },
            ],
          },
        },
      },
    },
    server: {
      // Keep host checking enabled while allowing explicitly configured preview
      // proxy hosts and Cloud Run's generated hostname.
      // Avoid `true`, which disables Vite's DNS-rebinding protection.
      allowedHosts: [...allowedHosts],
      // Disable HMR WebSocket in AI Studio / Cloud Run preview proxy to avoid
      // `@vite/client` "WebSocket closed without opened" errors.
      hmr: isPreviewEnv ? false : true,
      // Disable file watching in preview/DISABLE_HMR mode to speed up cold start and save CPU.
      watch: isPreviewEnv ? null : {},
    },
  };
});
