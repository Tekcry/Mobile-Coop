// (map-ready S4) The build emits the prebake's files (`.prebake-cache/current.json`, written by `scripts/prebake.mjs`)
// as `bakes/<name>`: per shipped map the manifest `bakes/<map>.json` and its gzip files. `current.json` is
// `{ maps: [{ map, h, files }] }` (piano SO2: one entry per map, each from its own `<h>` folder) or the one-map shape
// before it, `{ h, files }`. Nothing lands in `public/` or git. No `current.json` (a `PREBAKE=0` build, a plain
// `vite build`): nothing is emitted and the PC bakes as today. Build only (the dev server serves no bakes).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

interface CurrentMap {
  h: string;
  files: string[];
}

/** The folders and files `current.json` names, either shape. */
export function currentMaps(json: unknown): CurrentMap[] {
  const c = json as { maps?: CurrentMap[]; h?: string; files?: string[] };
  if (Array.isArray(c.maps)) return c.maps;
  return typeof c.h === 'string' && Array.isArray(c.files) ? [{ h: c.h, files: c.files }] : [];
}

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
      for (const { h, files } of currentMaps(JSON.parse(readFileSync(cur, 'utf8')))) {
        for (const name of files) this.emitFile({ type: 'asset', fileName: `bakes/${name}`, source: readFileSync(join(cache, h, name)) });
      }
    },
  };
}
