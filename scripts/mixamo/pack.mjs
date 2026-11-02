// (mixamo-chars, N53) Packs Mixamo downloads into the game's models through headless Blender (py/pack_glb.py):
//   node scripts/mixamo/pack.mjs [--raw <folder>]
// The raw folder (default D:/NightShift/mixamo-raw, or MIXAMO_RAW) holds `characters/<id>.fbx` (with skin) and
// `moves/*.fbx` (without skin, all on the shared Mixamo skeleton). Raw Mixamo files never enter the repo; the packed
// GLBs go to src/characters/assets/<id>.glb, each with every move.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findBlender } from '../operators/blender.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const i = process.argv.indexOf('--raw');
const RAW = i > 0 ? process.argv[i + 1] : process.env.MIXAMO_RAW ?? 'D:/NightShift/mixamo-raw';
const OUT = path.join(ROOT, 'src', 'characters', 'assets');

const chars = path.join(RAW, 'characters');
const moves = path.join(RAW, 'moves');
if (!existsSync(chars) || !existsSync(moves)) throw new Error(`${RAW}: needs characters/ and moves/`);
const blender = findBlender();
for (const f of readdirSync(chars).filter((n) => n.toLowerCase().endsWith('.fbx'))) {
  const id = f.replace(/\.fbx$/i, '');
  const out = path.join(OUT, `${id}.glb`);
  const argv = ['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '--python', path.join(ROOT, 'scripts', 'mixamo', 'py', 'pack_glb.py'), '--',
    '--seed', '0', '--character', path.join(chars, f), '--moves', moves, '--out', out];
  const r = spawnSync(blender.exe, argv, { windowsHide: true, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${id}: Blender failed (exit ${r.status ?? r.signal})`);
}
