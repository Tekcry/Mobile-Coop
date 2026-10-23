// npm run kit:build  (marlow-final M5: the facility kit)
// Builds the facility kit headless in the pinned Blender (scripts/operators/blender.mjs refuses any other version):
// py/build_kit.py -> build/facility-kit/facility-kit.glb + facility-kit.json (triangles, bounds, bytes per piece), then
// copies both to src/world/kit/assets/ (the game bundles the GLB; tests read the report). No textures, no network.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBlender } from '../operators/blender.mjs';
import { SEED } from '../operators/paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'build', 'facility-kit');
const ASSETS = path.join(ROOT, 'src', 'world', 'kit', 'assets');
const PY = path.join(ROOT, 'scripts', 'facility-kit', 'py', 'build_kit.py');

const blender = findBlender();
console.info(`facility-kit: ${blender.version}`);
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const args = ['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '--python', PY, '--', '--seed', String(SEED), '--out', OUT];
const r = spawnSync(blender.exe, args, { windowsHide: true, stdio: 'inherit', timeout: 300_000, env: { ...process.env, PYTHONHASHSEED: String(SEED) } });
if (r.status !== 0) throw new Error(`facility-kit: Blender build failed (exit ${r.status ?? r.signal})`);
mkdirSync(ASSETS, { recursive: true });
for (const f of ['facility-kit.glb', 'facility-kit.json']) copyFileSync(path.join(OUT, f), path.join(ASSETS, f));
const rep = JSON.parse(readFileSync(path.join(ASSETS, 'facility-kit.json'), 'utf8'));
console.info(`facility-kit: ${Object.keys(rep.pieces).length} pieces, ${rep.triangles} tris, GLB ${(rep.bytes / 1024).toFixed(1)} KB, ${Math.round((Date.now() - t0) / 1000)} s`);
