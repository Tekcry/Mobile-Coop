import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { kestrelEditor } from './scripts/kestrel/editor-server';
import { pickBuildSha } from './src/core/buildSha';
import { PRECACHE_GLOBS, PRECACHE_IGNORES } from './src/pwa/precacheGlobs';
import { RUNTIME_CACHING } from './src/pwa/runtimeCaching';

// GitHub Pages serves from /<repo>/. The deploy workflow sets VITE_BASE.
const base = process.env.VITE_BASE ?? '/';
// Preview build (dev branch) served under /<repo>/preview/ next to the live game (VITE_PREVIEW=1). A named slot
// (VITE_PREVIEW_ID=ct: the ct-movement branch under /<repo>/ct/) gets its own save database and label.
const previewId = /^[a-z0-9-]{1,16}$/.test(process.env.VITE_PREVIEW_ID ?? '') ? (process.env.VITE_PREVIEW_ID as string) : '';
const preview = process.env.VITE_PREVIEW === '1' || previewId !== '';
// (G183) the build's commit, shown next to the version so every build is identifiable: the checked-out folder's HEAD
// (each Pages slot checks out its own branch), GITHUB_SHA only when git fails (src/core/buildSha.ts)
const buildSha = pickBuildSha(
  (() => {
    try { return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { return null; }
  })(),
  process.env.GITHUB_SHA,
);

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_SHA__: JSON.stringify(buildSha),
    __PREVIEW__: JSON.stringify(preview),
    __PREVIEW_ID__: JSON.stringify(previewId),
  },
  optimizeDeps: {
    // Havok resolves its WASM relative to its own module; prebundling breaks that.
    exclude: ['@babylonjs/havok'],
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 4096,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@babylonjs/core')) return 'babylon';
          if (id.includes('node_modules/@babylonjs/havok')) return 'havok';
          if (id.includes('node_modules/trystero') || id.includes('node_modules/@trystero')) return 'net';
          return undefined;
        },
      },
    },
  },
  plugins: [
    // the level editor's endpoints (dev server only; editor.html is never built)
    kestrelEditor(),
    VitePWA({
      // (sw-reload) 'prompt': a new deploy's worker waits (no mid-match reload); src/pwa/pwa.ts activates it on the menu
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        name: preview ? `Night Shift (Preview${previewId ? ' ' + previewId.toUpperCase() : ''})` : 'Night Shift',
        short_name: preview ? `NS ${previewId ? previewId.toUpperCase() : 'Preview'}` : 'Night Shift',
        description: 'Mobile third-person stealth shooter. Plays offline.',
        theme_color: '#070b0c',
        background_color: '#070b0c',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // the menu font (ttf), the game's music tracks and the movement foley and weapon sprites are precached (offline play); the music lab's audition
        // MP3s (debug only) stay out of the cache
        // (guard-models) the lists live in src/pwa/precacheGlobs.ts (unit tested); the guard figures' GLBs are never
        // precached (`globIgnores`): fetched only with ?guardmodels=1, then kept by the `guards` runtime rule (src/pwa/runtimeCaching.ts)
        globPatterns: [...PRECACHE_GLOBS],
        globIgnores: [...PRECACHE_IGNORES],
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // (sw-reload) the first install still claims the open page (offline warm-up, A109); updates wait (no skipWaiting)
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: 'index.html',
        // the live game's worker never answers for the preview builds under /preview/, /ct/ and /kestrel/ (their own workers do)
        navigateFallbackDenylist: preview ? [] : [/\/preview(\/|$)/, /\/ct(\/|$)/, /\/kestrel(\/|$)/],
        // (operators 11e, guard-models) the GLB rules (weapons, guards, operators) live in src/pwa/runtimeCaching.ts:
        // every urlPattern there is self-contained, since workbox writes it into sw.js as text (tests/swRuntimeCaching.test.ts)
        runtimeCaching: RUNTIME_CACHING,
      },
      devOptions: { enabled: false },
    }),
  ],
});
