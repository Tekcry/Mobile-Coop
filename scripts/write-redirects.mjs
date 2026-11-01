// (one-game, 2026-11-01) The site is one build, the main game at /<repo>/. The three old slots (/preview/, /ct/, /kestrel/)
// each get a static page that forwards to the main game, keeping the ?query and #hash (`?autostart=...` links), and a
// replacement `sw.js` that retires the old slot's service worker (a browser that had opened the old slot keeps its worker
// and its cached copy of that build until the worker is replaced; the replacement unregisters itself, drops that slot's
// cache and forwards the open page). No network dependency: both files are plain static files.
//   node scripts/write-redirects.mjs [distDir]      (the deploy workflow runs it on `dist` after the build)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The slots of the old site; each becomes `<dist>/<slot>/index.html` and `<dist>/<slot>/sw.js`. */
export const OLD_SLOTS = ['preview', 'ct', 'kestrel'];

/** The forwarding page for a slot: one level below the main game, so `../` is the main game. */
export function redirectPage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Night Shift</title>
<script>location.replace('../' + location.search + location.hash);</script>
<noscript><meta http-equiv="refresh" content="0; url=../"></noscript>
<style>body{background:#070b0c;color:#cfd8d6;font:16px/1.5 system-ui,sans-serif;margin:2rem}a{color:#8fd6c8}</style>
</head>
<body>
<p>Night Shift has moved to one address. <a href="../">Open the game</a>.</p>
</body>
</html>
`;
}

/** The replacement worker for a slot: takes over at once, drops only this slot's precache, unregisters, forwards open pages. */
export function retireWorker() {
  return `// Retired slot worker (one-game, 2026-11-01): replaces the old build's worker so an open or installed copy of this slot forwards to the main game.
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // only this slot's precache (its name carries the scope); the main game's caches share the origin and stay
        for (const key of await caches.keys()) if (key.includes(self.registration.scope)) await caches.delete(key);
      } catch (e) {
        // nothing to drop
      }
      const main = new URL('../', self.registration.scope);
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await self.registration.unregister();
      for (const c of open) {
        try {
          const here = new URL(c.url);
          const to = new URL(main.href);
          to.search = here.search;
          to.hash = here.hash;
          await c.navigate(to.href);
        } catch (e) {
          // a window that cannot be navigated forwards from its page next time
        }
      }
    })(),
  );
});
`;
}

/** Write every old slot's files under `dist`; returns the paths written. */
export function writeRedirects(dist) {
  const out = [];
  for (const slot of OLD_SLOTS) {
    const dir = join(dist, slot);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), redirectPage());
    writeFileSync(join(dir, 'sw.js'), retireWorker());
    out.push(join(dir, 'index.html'), join(dir, 'sw.js'));
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = resolve(process.argv[2] ?? 'dist');
  for (const f of writeRedirects(dist)) console.log('wrote', f);
}
