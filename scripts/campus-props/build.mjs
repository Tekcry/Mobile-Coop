// npm run campus-props:build -- --set kit|hero-s1|...|hero-s5 [--only a,b]  (sector-redesign ART-KIT step 3)
// Builds one campus prop set headless in the pinned Blender (scripts/operators/blender.mjs refuses any other version):
// kit.py (the base kit K) or hero_s<N>.py (section N's hero set) -> build/campus-props/<name>.glb + <name>.json
// (triangles, bounds, meshes per material, bytes), then copies both to src/world/campusArt/assets/ (the game bundles the
// GLB; tests read the report). `--only a,b` builds a subset into build/ only (a quick look; the bundled assets are
// written by a full build alone). No textures, no network. The set name `kit` writes `campus-kit.*`, `hero-s<N>` writes
// `hero-s<N>.*`.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBlender } from '../operators/blender.mjs';
import { SEED } from '../operators/paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'build', 'campus-props');
const ASSETS = path.join(ROOT, 'src', 'world', 'campusArt', 'assets');

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? '') : '';
};
const set = arg('--set') || 'kit';
const only = arg('--only');
const m = /^hero-s([1-5])$/.exec(set);
if (set !== 'kit' && !m) throw new Error(`campus-props: unknown set "${set}" (kit, hero-s1 .. hero-s5)`);
const name = set === 'kit' ? 'campus-kit' : set;
const PY = path.join(ROOT, 'scripts', 'campus-props', set === 'kit' ? 'kit.py' : `hero_s${m[1]}.py`);
if (!existsSync(PY)) throw new Error(`campus-props: ${path.relative(ROOT, PY)} is missing`);

const blender = findBlender();
console.info(`campus-props ${set}: ${blender.version}`);
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const args = ['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '--python', PY, '--', '--seed', String(SEED), '--out', OUT, '--name', name];
if (only) args.push('--only', only);
const r = spawnSync(blender.exe, args, { windowsHide: true, stdio: 'inherit', timeout: 300_000, env: { ...process.env, PYTHONHASHSEED: String(SEED) } });
if (r.status !== 0) throw new Error(`campus-props: Blender build failed (exit ${r.status ?? r.signal})`);
const rep = JSON.parse(readFileSync(path.join(OUT, `${name}.json`), 'utf8'));
if (!only) {
  mkdirSync(ASSETS, { recursive: true });
  for (const f of [`${name}.glb`, `${name}.json`]) copyFileSync(path.join(OUT, f), path.join(ASSETS, f));
}
console.info(`campus-props ${set}: ${Object.keys(rep.pieces).length} pieces, ${rep.triangles} tris, GLB ${(rep.bytes / 1024).toFixed(1)} KB, ${Math.round((Date.now() - t0) / 1000)} s${only ? ' (subset: build/ only)' : ''}`);
