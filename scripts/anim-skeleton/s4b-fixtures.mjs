// (anim-skeleton S4b) The exact-preview fixtures, from one Blender run set (the pinned 5.2.2, headless):
//   node --import ./scripts/operators/ts-resolve.mjs scripts/anim-skeleton/s4b-fixtures.mjs
// - tests/fixtures/keyed-s4b-rebake.json: three clips (jog and walk mirrored, hold_fwd 8 keys unmirrored) baked by
//   key_clip.py as they are and with one key edited (EDIT below, applied as the tuner's Export would: applyKeyEdits),
//   their pel / q / arm / head samples;
// - tests/fixtures/key-curve-blender.json: Blender's own F-curves (key_curve_fixture.py): synthetic curves on the real
//   key frame sets and edge cases, and a few bones' curves of the three base bakes (keys, handles, evaluated).
// Writes build/anim-skeleton/s4b/ (not committed) and the two fixtures. Heavy (Blender): take C:/NightShift/heavy.lock.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, JOINTS_JSON } from '../operators/paths.mjs';
import { runBlender } from '../operators/blender.mjs';
import { applyKeyEdits, keyGroupId } from '../../src/anim/tuneKeysFile.ts';

export const EDIT = { pelvis_dy: 3, chest_pitch: 10, armR_flex: 20, head_pitch: 8 };
export const CASES = [
  { clip: 'jog', key: 1 },
  { clip: 'walk', key: 2 },
  { clip: 'hold_fwd', key: 3 },
];
const OUT = path.join(ROOT, 'build', 'anim-skeleton', 's4b');
const KEYS_IN = path.join(ROOT, 'scripts', 'anim-keys', 'keys');
mkdirSync(path.join(OUT, 'keys'), { recursive: true });
const r7 = (v) => Math.round(v * 1e7) / 1e7;

function bake(keysPath, tag) {
  const json = path.join(OUT, `${tag}.json`);
  const blend = path.join(OUT, `${tag}.blend`);
  runBlender(path.join('..', '..', 'anim-keys', 'py', 'key_clip.py'), ['--joints', JOINTS_JSON, '--operator', 'wren', '--keys', keysPath, '--out', json, '--blend', blend]);
  return { clip: JSON.parse(readFileSync(json, 'utf8')), blend };
}

const pick = (clip) => {
  const o = {};
  for (const k of ['pel', 'q', 'arm', 'head']) if (clip.samples[0][k]) o[k] = clip.samples.flatMap((s) => s[k].map(r7));
  return o;
};

const rebake = [];
const blends = [];
for (const c of CASES) {
  const src = path.join(KEYS_IN, `${c.clip}.json`);
  const file = JSON.parse(readFileSync(src, 'utf8'));
  const base = bake(src, `${c.clip}-base`);
  const edited = applyKeyEdits(file, { [keyGroupId(c.clip, c.key)]: EDIT });
  const ep = path.join(OUT, 'keys', `${c.clip}.json`);
  writeFileSync(ep, JSON.stringify(edited, null, 2) + '\n');
  const ed = bake(ep, `${c.clip}-edit`);
  rebake.push({ clip: c.clip, key: c.key, edit: EDIT, frames: base.clip.frames, base: pick(base.clip), edited: pick(ed.clip) });
  blends.push({ name: c.clip, path: base.blend, frames: base.clip.frames, bones: ['pelvis', 'chest', 'neck', 'shR', 'elR'] });
}
writeFileSync(path.join(ROOT, 'tests', 'fixtures', 'keyed-s4b-rebake.json'), JSON.stringify({ blender: '5.2.2', cases: rebake }) + '\n');

// synthetic curves: the real key frame sets (jog's 8, hold_choke's 11 uneven) with varied values, and edge cases
const frameSets = {
  even8: [0, 6, 12, 18, 24, 30, 36, 42],
  uneven11: [0, 1, 5, 10, 14, 18, 22, 28, 33, 40, 47],
  ratio: [0, 1, 30],
  two: [0, 24],
};
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 20 - 10;
const synthetic = [];
for (const [name, fs] of Object.entries(frameSets)) {
  for (let v = 0; v < 3; v++) synthetic.push({ name: `${name}-rand${v}`, keys: fs.map((f) => [f, Math.round(rnd() * 1000) / 1000]) });
  synthetic.push({ name: `${name}-bump`, keys: fs.map((f, i) => [f, i === 1 ? 10 : 0]) });
}
// a steep run next to a near-flat one (handles cut at a neighbour's value), ties, a monotone ramp
synthetic.push({ name: 'violate', keys: [[0, 0], [6, 0.2], [12, 10], [18, 10.3], [24, 4], [36, -6], [42, -5.9]] });
synthetic.push({ name: 'ties', keys: [[0, 1], [8, 1], [16, 3], [24, 3], [32, -2], [40, -2]] });
synthetic.push({ name: 'ramp', keys: [[0, 0], [12, 1], [24, 2], [36, 3]] });
const spec = path.join(OUT, 'curve-spec.json');
writeFileSync(spec, JSON.stringify({ synthetic, blends }));
const raw = path.join(OUT, 'curves.json');
runBlender(path.join('..', '..', 'anim-skeleton', 'py', 'key_curve_fixture.py'), ['--spec', spec, '--out', raw]);
const curves = JSON.parse(readFileSync(raw, 'utf8'));
const round = (_k, v) => (typeof v === 'number' ? Math.round(v * 1e7) / 1e7 : v);
writeFileSync(path.join(ROOT, 'tests', 'fixtures', 'key-curve-blender.json'), JSON.stringify(curves, round) + '\n');
console.log('s4b-fixtures: tests/fixtures/keyed-s4b-rebake.json, tests/fixtures/key-curve-blender.json');
