import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'cross-origin'
};
const basePath = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'pwa-sw.js',
      registerType: 'prompt',
      manifest: {
        name: 'RAWcket',
        short_name: 'RAWcket',
        description: 'A non-destructive, local-first photo editor.',
        theme_color: '#10100f',
        background_color: '#10100f',
        display: 'standalone',
        start_url: basePath,
        scope: basePath
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,webp,svg,woff2}', 'assets/libraw-*.wasm'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024
      }
    })
  ],
  server: { headers: crossOriginIsolationHeaders },
  preview: { headers: crossOriginIsolationHeaders },
  optimizeDeps: { exclude: ['libraw-wasm'] },
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id): string | undefined {
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('fflate')) return 'archive';
          if (id.includes('idb')) return 'storage';
          return undefined;
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    coverage: { reporter: ['text', 'html'], exclude: ['src/main.tsx'] }
  }
});
