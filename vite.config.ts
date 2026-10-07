import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves from /<repo>/. The deploy workflow sets VITE_BASE.
const base = process.env.VITE_BASE ?? '/';
// Preview build (dev branch) served under /<repo>/preview/ next to the live game (VITE_PREVIEW=1).
const preview = process.env.VITE_PREVIEW === '1';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __PREVIEW__: JSON.stringify(preview),
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
        name: preview ? 'Silent But Deadly (Preview)' : 'Silent But Deadly',
        short_name: preview ? 'SBD Preview' : 'Silent But Deadly',
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
