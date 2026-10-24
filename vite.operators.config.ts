// `npm run operators`: the dev-only Operator Lab (operators.html), built into build/operators-lab/ (never dist/) and served
// with the pipeline's build/operators/ folder at /__operators. A production-style build, not the dev server: Babylon loads its
// shaders through dynamic imports that only a bundled build resolves. The game build (vite.config.ts) builds index.html only;
// `npm run build` output is checked for the Lab.
// (guard-models G4s) guards.html, the guard variety sheet's page, is the second entry. Its bake out dir is served at
// /__guards from GUARD_SHEET_IN (`GUARD_SHEET_IN=<dir> npm run operators`, or scripts/operators/guard-sheet.mjs, which also
// sets GUARD_SHEET_ONLY=1: that page alone, built into build/guards-lab/, so the Lab's build is left untouched; with neither variable set the Lab builds its single operators.html entry).
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Connect } from 'vite';

const root = path.resolve(import.meta.dirname, 'build', 'operators');
const port = Number(process.env.E2E_PORT ?? 4189);
const guardsOnly = process.env.GUARD_SHEET_ONLY === '1';
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
    outDir: guardsOnly ? 'build/guards-lab' : 'build/operators-lab',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 8192,
    rollupOptions: { input: guardsOnly ? { guards: page('guards.html') } : guardsRoot ? { operators: page('operators.html'), guards: page('guards.html') } : page('operators.html') },
  },
  preview: { host: '127.0.0.1', port, strictPort: true, open: guardsOnly ? false : '/operators.html' },
  plugins: [
    {
      // some game modules reach src/pwa; the Lab has no service worker, so the PWA virtual module is an empty stub
      name: 'operators-pwa-stub',
      resolveId: (id) => (id === 'virtual:pwa-register' ? 'virtual:operators-pwa-stub' : null),
      load: (id) => (id === 'virtual:operators-pwa-stub' ? 'export const registerSW = () => () => {};' : null),
    },
    {
      name: 'operators-build-files',
      configurePreviewServer: (server) => {
        server.middlewares.use('/__operators', serveDir(root));
        if (guardsRoot) server.middlewares.use('/__guards', serveDir(guardsRoot));
      },
    },
  ],
});
