// (walk-test round 1) Measures every Mixamo move's gait (stride, left heel strike) through headless Blender
// (py/measure_gait.py) into src/characters/gait.ts:
//   node scripts/mixamo/gait.mjs [--raw <folder>]
// The raw folder is pack.mjs's (default D:/NightShift/mixamo-raw, or MIXAMO_RAW). Run it after new move downloads.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findBlender } from '../operators/blender.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const i = process.argv.indexOf('--raw');
const RAW = i > 0 ? process.argv[i + 1] : process.env.MIXAMO_RAW ?? 'D:/NightShift/mixamo-raw';
const blender = findBlender();
const argv = ['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '--python', path.join(ROOT, 'scripts', 'mixamo', 'py', 'measure_gait.py'), '--',
  '--raw', RAW, '--out', path.join(ROOT, 'src', 'characters', 'gait.ts')];
const r = spawnSync(blender.exe, argv, { windowsHide: true, stdio: 'inherit' });
if (r.status !== 0) throw new Error(`Blender failed (exit ${r.status ?? r.signal})`);
