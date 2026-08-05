import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'RAWcket',
        short_name: 'RAWcket',
        description: 'Editor fotografico no destructivo y local-first.',
        theme_color: '#10100f',
        background_color: '#10100f',
        display: 'standalone',
        start_url: '/'
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,webp,woff2}'] }
    })
  ],
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
