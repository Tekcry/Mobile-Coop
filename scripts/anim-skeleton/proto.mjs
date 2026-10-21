// anim-skeleton runner: runs a scripts/anim-skeleton/py script headless (-b) in the pinned Blender, on the copied
// build/anim-skeleton/wren-lods.blend (copied from the anim-rig build if missing) unless the script builds its own scene
// (NO_BLEND). Takes C:/NightShift/heavy.lock (refuses to run while another job holds it).
//   node scripts/anim-skeleton/proto.mjs [inspect|proto_rig|smoke_skeleton|hand_sheet] [-- extra args]
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBlender } from '../operators/blender.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'build', 'anim-skeleton');
const BLEND = path.join(OUT, 'wren-lods.blend');
const SOURCE = 'C:/NightShift/Mobile-Coop-anim-rig/build/operators/wren/wren-lods.blend';
const LOCK = 'C:/NightShift/heavy.lock';
const NO_BLEND = new Set(['hand_sheet']);
const script = process.argv[2] ?? 'proto_rig';
const extra = process.argv.includes('--') ? process.argv.slice(process.argv.indexOf('--') + 1) : [];

mkdirSync(OUT, { recursive: true });
if (!NO_BLEND.has(script) && !existsSync(BLEND)) copyFileSync(SOURCE, BLEND);
if (existsSync(LOCK)) throw new Error(`heavy lock held: ${readFileSync(LOCK, 'utf8')}`);
writeFileSync(LOCK, `Night Shift | Menu Notes Build | anim-skeleton ${script} | ${new Date().toISOString()}`);
const t0 = Date.now();
try {
  const blender = findBlender();
  const file = path.join(ROOT, 'scripts', 'anim-skeleton', 'py', `${script}.py`);
  const scene = NO_BLEND.has(script) ? [] : [BLEND];
  const argv = ['-b', ...scene, '--factory-startup', '-noaudio', '--python-exit-code', '1', '--python', file, '--', '--seed', '1015', '--root', ROOT, ...extra];
  const r = spawnSync(blender.exe, argv, { windowsHide: true, stdio: 'inherit', timeout: 40 * 60 * 1000 });
  if (r.status !== 0) throw new Error(`Blender ${script} failed (exit ${r.status ?? r.signal}).`);
} finally {
  if (existsSync(LOCK)) unlinkSync(LOCK);
}
console.log(`anim-skeleton: ${script} done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
