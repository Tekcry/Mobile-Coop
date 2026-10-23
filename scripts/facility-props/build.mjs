// npm run props:build  (marlow-final M5 / A6: the props kit, the sets' dressing)
// Builds the props headless in the pinned Blender (scripts/operators/blender.mjs refuses any other version):
// build.py -> build/facility-props/facility-props.glb + facility-props.json (triangles, bounds, bytes per prop), then
// copies both to src/world/props/assets/ (the game bundles the GLB; tests read the report). No textures, no network.
// `node scripts/facility-props/build.mjs --only boxVan,serverRack` builds a subset into build/ only (a quick look; the
// bundled assets are written by a full build alone).
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBlender } from '../operators/blender.mjs';
import { SEED } from '../operators/paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'build', 'facility-props');
const ASSETS = path.join(ROOT, 'src', 'world', 'props', 'assets');
const PY = path.join(ROOT, 'scripts', 'facility-props', 'build.py');

const oi = process.argv.indexOf('--only');
const only = oi >= 0 ? (process.argv[oi + 1] ?? '') : '';

const blender = findBlender();
console.info(`facility-props: ${blender.version}`);
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const args = ['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '--python', PY, '--', '--seed', String(SEED), '--out', OUT];
if (only) args.push('--only', only);
const r = spawnSync(blender.exe, args, { windowsHide: true, stdio: 'inherit', timeout: 300_000, env: { ...process.env, PYTHONHASHSEED: String(SEED) } });
if (r.status !== 0) throw new Error(`facility-props: Blender build failed (exit ${r.status ?? r.signal})`);
const rep = JSON.parse(readFileSync(path.join(OUT, 'facility-props.json'), 'utf8'));
if (!only) {
  mkdirSync(ASSETS, { recursive: true });
  for (const f of ['facility-props.glb', 'facility-props.json']) copyFileSync(path.join(OUT, f), path.join(ASSETS, f));
}
console.info(`facility-props: ${Object.keys(rep.pieces).length} props, ${rep.triangles} tris, GLB ${(rep.bytes / 1024).toFixed(1)} KB, ${Math.round((Date.now() - t0) / 1000)} s${only ? ' (subset: build/ only)' : ''}`);
