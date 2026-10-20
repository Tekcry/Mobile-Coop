// Fetches the CC0 MakeHuman base body data (base mesh, shape targets, vertex groups, default rig weights) from the
// MPFB2 repository at a pinned commit into build/operators/cache/mpfb2/ (git-ignored, never shipped). Only CC0 data
// files are fetched (LICENSE.ASSETS.md); no MPFB code (GPL). Source and licence: docs/art-credits.md.
// Michael approved the download on 2026-10-15 (DECISIONS D12). Skips files already present.
// MPFB2_ZIP=<path to the official extension zip> (anim-rig A7: add-on-mpfb-v2.0.18.zip from extensions.blender.org, the
// install route makehumancommunity.org links) takes the data files from that local zip instead (its data/ folder is
// src/mpfb/data/); nothing is fetched then, and the repository-root files (LICENSE.ASSETS.md) are not in the zip.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
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

/** Extracts the listed data files from the official MPFB extension zip (bsdtar reads zip; Windows ships it). */
function fromZip(zip, files) {
  const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot ?? 'C:/Windows', 'System32', 'tar.exe') : 'tar';
  const stage = mkdtempSync(path.join(os.tmpdir(), 'mpfb2-'));
  try {
    const dirs = [...new Set(files.filter((r) => !r.startsWith('/')).map((r) => `data/${r.split('/')[0]}`))];
    execFileSync(tar, ['-xf', path.resolve(zip), '-C', stage, ...dirs], { stdio: 'inherit' });
    let copied = 0;
    for (const rel of files) {
      if (rel.startsWith('/')) continue;
      const local = path.join(MPFB2_DIR, rel);
      if (existsSync(local)) continue;
      const src = path.join(stage, 'data', rel);
      if (!existsSync(src)) throw new Error(`${zip}: no data/${rel}`);
      mkdirSync(path.dirname(local), { recursive: true });
      copyFileSync(src, local);
      copied++;
    }
    return copied;
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

export async function fetchBaseBody() {
  const files = entries();
  const zip = process.env.MPFB2_ZIP;
  if (zip) return { dir: MPFB2_DIR, files: files.length, fetched: fromZip(zip, files) };
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
