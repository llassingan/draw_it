/**
 * Vite build configuration for the collaborative whiteboard web app.
 *
 * Key decisions:
 * - `manualChunks` splits React and Yjs into separate cacheable bundles
 *   so that framework updates don't invalidate the application code cache
 *   and vice versa.
 * - y-protocols submodules (`y-protocols/sync`, `/awareness`, `/auth`)
 *   are marked as external in Rollup because they are bundled into
 *   y-websocket itself — marking them external prevents duplicate
 *   bundling and runtime conflicts.
 * - The Vitest `test` block is co-located here (not in a separate
 *   vitest.config.ts) because all relevant server config (aliases,
 *   resolve conditions, dependency optimization) is shared between
 *   dev, build, and test modes.
 * - `ssr.noExternal` forces y-websocket and y-protocols to be bundled
 *   rather than externalized in SSR (test) mode, since they rely on
 *   WebSocket globals that are mocked in happy-dom.
 */

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 14022,
    strictPort: true,
    allowedHosts: ['staging.mahara.web.id', 'localhost', '127.0.0.1', '10.0.0.4'],
  },
  preview: {
    host: '0.0.0.0',
    port: 14022,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      external: ['y-protocols', 'y-protocols/sync', 'y-protocols/awareness', 'y-protocols/auth'],
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          yjs: ['yjs', 'y-websocket'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@whiteboard/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
    },
    conditions: ['module', 'browser', 'import', 'default'],
  },
  optimizeDeps: {
    include: ['y-websocket', 'y-protocols/sync', 'y-protocols/awareness', 'y-protocols/auth'],
  },
  ssr: {
    noExternal: ['y-websocket', 'y-protocols', 'y-protocols/*'],
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/types/**', 'src/test/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        perFile: false,
      },
    },
  },
});
