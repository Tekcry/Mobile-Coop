import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { kestrelEditor } from './scripts/kestrel/editor-server';

// GitHub Pages serves from /<repo>/. The deploy workflow sets VITE_BASE.
const base = process.env.VITE_BASE ?? '/';
// Preview build (dev branch) served under /<repo>/preview/ next to the live game (VITE_PREVIEW=1). A named slot
// (VITE_PREVIEW_ID=ct: the ct-movement branch under /<repo>/ct/) gets its own save database and label.
const previewId = /^[a-z0-9-]{1,16}$/.test(process.env.VITE_PREVIEW_ID ?? '') ? (process.env.VITE_PREVIEW_ID as string) : '';
const preview = process.env.VITE_PREVIEW === '1' || previewId !== '';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
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
      registerType: 'autoUpdate',
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
        // the game's music tracks and the movement foley and weapon sprites are precached (offline play); the music lab's audition
        // MP3s (debug only) stay out of the cache
        globPatterns: ['**/*.{js,css,html,wasm,png,svg,webmanifest,json}', '**/music-*.mp3', 'assets/foley-*.mp3', 'assets/weapons-*.mp3'],
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        // the live game's worker never answers for the preview builds under /preview/, /ct/ and /kestrel/ (their own workers do)
        navigateFallbackDenylist: preview ? [] : [/\/preview(\/|$)/, /\/ct(\/|$)/, /\/kestrel(\/|$)/],
        // (operators 11e, A98 / A99) the operator bodies (Wren's LOD0-2 for play, the hero for the menu and close
        // cameras) are too big to precache (hero 55 MB, LOD0 18 MB): each is cached the first time it is fetched through
        // the worker, then served from the cache. The first visit loads Wren before the worker controls the page, so
        // once it does the game fetches each missing play LOD through it (A109, operators/runtime/offline.ts): one online
        // start that reaches the menu leaves LOD0-2 cached for offline play; the hero is cached the first time a
        // close-up asks for it. Same origin only; a new build's hashed files replace the old ones (8 entries = two builds
        // of four files).
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/[^/]+\.glb$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'operators',
              expiration: { maxEntries: 8 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
