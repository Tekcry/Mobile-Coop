// (guard-models G4s) guards.html, the guard variety sheet's page (dev-only, never dist/), built by
// scripts/operators/guard-sheet.mjs into build/guards-lab/ and served with the bake out dir at /__guards from
// GUARD_SHEET_IN. A production-style build, not the dev server: Babylon loads its shaders through dynamic imports that
// only a bundled build resolves. The game build (vite.config.ts) builds index.html only.
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Connect } from 'vite';

const port = Number(process.env.E2E_PORT ?? 4189);
const guardsRoot = process.env.GUARD_SHEET_IN ? path.resolve(process.env.GUARD_SHEET_IN) : '';
const page = (f: string): string => path.resolve(import.meta.dirname, f);

/** Serves the files under `dir` (nothing outside it, no listing). */
const serveDir = (dir: string): Connect.NextHandleFunction => (req, res, next) => {
  const rel = decodeURIComponent((req.url ?? '').split('?')[0] ?? '');
  const file = path.join(dir, rel);
  if (!file.startsWith(dir) || !existsSync(file) || !statSync(file).isFile()) return next();
  res.setHeader('Content-Type', file.endsWith('.json') ? 'application/json' : 'application/octet-stream');
  res.setHeader('Content-Length', statSync(file).size);
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
};

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify('operator-lab'),
    __BUILD_TIME__: JSON.stringify(''),
    __BUILD_SHA__: JSON.stringify(''),
    __PREVIEW__: JSON.stringify(false),
    __PREVIEW_ID__: JSON.stringify(''),
  },
  build: {
    outDir: 'build/guards-lab',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 8192,
    rollupOptions: { input: { guards: page('guards.html') } },
  },
  preview: { host: '127.0.0.1', port, strictPort: true, open: false },
  plugins: [
    {
      // some game modules reach src/pwa; the sheet has no service worker, so the PWA virtual module is an empty stub
      name: 'operators-pwa-stub',
      resolveId: (id) => (id === 'virtual:pwa-register' ? 'virtual:operators-pwa-stub' : null),
      load: (id) => (id === 'virtual:operators-pwa-stub' ? 'export const registerSW = () => () => {};' : null),
    },
    {
      name: 'operators-build-files',
      configurePreviewServer: (server) => {
        if (guardsRoot) server.middlewares.use('/__guards', serveDir(guardsRoot));
      },
    },
  ],
});
