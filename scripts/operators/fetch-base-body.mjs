// Fetches the CC0 MakeHuman base body data (base mesh, shape targets, vertex groups, default rig weights) from the
// MPFB2 repository at a pinned commit into build/operators/cache/mpfb2/ (git-ignored, never shipped). Only CC0 data
// files are fetched (LICENSE.ASSETS.md); no MPFB code (GPL). Source and licence: docs/art-credits.md.
// Michael approved the download on 2026-10-15 (DECISIONS D12). Skips files already present.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUT_DIR } from './paths.mjs';

export const MPFB2_COMMIT = '3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf';
export const MPFB2_DIR = path.join(OUT_DIR, 'cache', 'mpfb2');
const RAW = `https://raw.githubusercontent.com/makehumancommunity/mpfb2/${MPFB2_COMMIT}`;
const LIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'mpfb2-files.txt');

/** Repo-relative paths: a leading "/" is the repository root, anything else is under src/mpfb/data/. */
function entries() {
  return readFileSync(LIST, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

export async function fetchBaseBody() {
  const files = entries();
  let fetched = 0;
  for (const rel of files) {
    const local = path.join(MPFB2_DIR, rel.startsWith('/') ? rel.slice(1) : rel);
    if (existsSync(local)) continue;
    const url = rel.startsWith('/') ? `${RAW}${rel}` : `${RAW}/src/mpfb/data/${rel}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
    mkdirSync(path.dirname(local), { recursive: true });
    writeFileSync(local, Buffer.from(await res.arrayBuffer()));
    fetched++;
  }
  return { dir: MPFB2_DIR, files: files.length, fetched };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await fetchBaseBody();
  console.info(`operators: MPFB2 CC0 data ${r.files} files (${r.fetched} fetched) -> ${r.dir}`);
}
