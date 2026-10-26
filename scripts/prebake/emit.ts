// (map-ready S4) The build emits the prebake's files (`.prebake-cache/current.json`: `{ h, files }`, written by
// `scripts/prebake.mjs`) as `bakes/<name>`: the manifest `bakes/campusOps.json` and its gzip files. Nothing lands in
// `public/` or git. No `current.json` (a `PREBAKE=0` build, a plain `vite build`): nothing is emitted and the PC bakes
// as today. Build only (the dev server serves no bakes).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

export function shippedBakes(): Plugin {
  let root = process.cwd();
  return {
    name: 'night-shift-shipped-bakes',
    apply: 'build',
    configResolved(c) {
      root = c.root;
    },
    generateBundle() {
      const cache = join(root, '.prebake-cache');
      const cur = join(cache, 'current.json');
      if (!existsSync(cur)) return;
      const { h, files } = JSON.parse(readFileSync(cur, 'utf8')) as { h: string; files: string[] };
      for (const name of files) this.emitFile({ type: 'asset', fileName: `bakes/${name}`, source: readFileSync(join(cache, h, name)) });
    },
  };
}
