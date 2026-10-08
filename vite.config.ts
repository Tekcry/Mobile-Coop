import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

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
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      manifest: {
        name: preview ? `Silent But Deadly (Preview${previewId ? ' ' + previewId.toUpperCase() : ''})` : 'Silent But Deadly',
        short_name: preview ? `SBD ${previewId ? previewId.toUpperCase() : 'Preview'}` : 'Silent But Deadly',
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
        globPatterns: ['**/*.{js,css,html,wasm,png,svg,webmanifest,json}'],
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        // the live game's worker never answers for the preview builds under /preview/ and /ct/ (their own workers do)
        navigateFallbackDenylist: preview ? [] : [/\/preview(\/|$)/, /\/ct(\/|$)/],
      },
      devOptions: { enabled: false },
    }),
  ],
});
