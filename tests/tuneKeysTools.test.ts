// (marlow-bays item 30) The Keys tab's key tools: the pure helpers (wave, smoothstep, the keys between, the compare
// line), the registry tools on sneak (wave with the Mirror box on and off, apply to ticked keys, smooth between on the
// key file's poses, one undo step each, the diff) and (item 30e) the exact preview with retimed and added keys.
import { afterEach, describe, expect, it } from 'vitest';
import { newKeyedPose, sampleKeyed, type KeyedClip } from '../src/anim/keyed';
import { KEYED_SNEAK } from '../src/anim/clips/keyed/sneak';
import { KEY_CLIPS } from '../src/anim/tuneKeysMeta';
import { KEY_FIELDS, KEY_FIELD_INDEX, keyGroupId } from '../src/anim/tuneKeysFile';
import { keyDiffLine, keySmoothWeight, keySmoothstep, keysBetween, keyWaveValue } from '../src/anim/tuneKeysTools';
import {
  tuneKeysAdd,
  tuneKeysApply,
  tuneKeysDiff,
  tuneKeysFilesReady,
  tuneKeysLoadFile,
  tuneKeysMirror,
  tuneKeysPose,
  tuneKeysRetime,
  tuneKeysSmooth,
  tuneKeysSync,
  tuneKeysToolKeys,
  tuneKeysWave,
} from '../src/anim/tuneKeys';
import { TUNE_HOOKS, tuneGet, tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import { TuneHistory } from '../src/anim/tuneHistory';

afterEach(() => {
  TUNE_HOOKS.changed = null;
  tuneResetAll();
  tuneKeysSync();
});

const SNEAK = KEY_CLIPS.find((c) => c.name === 'sneak')!;
const g = (k: number): string => keyGroupId('sneak', k);
const r2 = (v: number): number => Math.round(v * 100) / 100;

describe('item 30: the pure key tools', () => {
  it('wave: amount x sin(2 pi (phase + timing))', () => {
    expect(keyWaveValue(10, 0, 0)).toBe(0);
    expect(keyWaveValue(10, 0.25, 0)).toBeCloseTo(10, 12);
    expect(keyWaveValue(10, 0, 0.25)).toBeCloseTo(10, 12);
    expect(keyWaveValue(10, 0.5, 0)).toBe(0); // exact zero, not 1e-15
    expect(keyWaveValue(-4, 0.75, 0)).toBeCloseTo(4, 12);
  });

  it('smoothstep and the smooth weight (wrapping past the cycle end)', () => {
    expect(keySmoothstep(-1)).toBe(0);
    expect(keySmoothstep(0.5)).toBe(0.5);
    expect(keySmoothstep(0.25)).toBeCloseTo(0.15625, 12);
    expect(keySmoothstep(2)).toBe(1);
    expect(keySmoothWeight(0.25, 0.75, 0.5)).toBe(0.5);
    // a to b across the cycle end: 0.75 -> 0.25, the key at 0 half way
    expect(keySmoothWeight(0.75, 0.25, 0)).toBe(0.5);
    expect(keySmoothWeight(0.75, 0.25, 0.875)).toBeCloseTo(keySmoothstep(0.25), 12);
  });

  it('the keys between two list positions, going forward, wrapping', () => {
    expect(keysBetween(8, 1, 4)).toEqual([2, 3]);
    expect(keysBetween(8, 6, 1)).toEqual([7, 0]);
    expect(keysBetween(8, 2, 3)).toEqual([]);
    expect(keysBetween(8, 3, 3)).toEqual([]);
    expect(keysBetween(8, -1, 3)).toEqual([]);
  });

  it('the compare line: the largest differences first, plain units, "+N more", the same pose', () => {
    const f = [
      { name: 'Chest turn', unit: 'deg' },
      { name: 'Right forearm twist', unit: 'deg' },
      { name: 'Hips shift up', unit: 'cm' },
      { name: 'Right index curl', unit: '' },
      { name: 'Head tilt', unit: 'deg' },
    ];
    expect(keyDiffLine(f, [-3, 12, 0, 0, 0.2], [0, 0, 0, 0, 0])).toBe('Right forearm twist +12°, Chest turn -3°');
    expect(keyDiffLine(f, [1.25, 0, 0.5, 0.1, 0], [0, 0, 0, 0, 0])).toBe('Right index curl +0.1, Chest turn +1.3°, Hips shift up +0.5 cm');
    expect(keyDiffLine(f, [5, 4, 3, 0.5, 2], [0, 0, 0, 0, 0], 2)).toBe('Right index curl +0.5, Hips shift up +3 cm (+3 more)');
    expect(keyDiffLine(f, [0.1, 0, 0, 0, 0], [0, 0, 0, 0, 0])).toBe('Same pose');
  });
});

describe('item 30: the registry tools (sneak: mirrored, 4 own keys at bake frames 0, 6, 12, 18)', () => {
  it('sneak is laid out as these tests expect', () => {
    expect(SNEAK.mirror).toBe(true);
    expect(SNEAK.phases).toEqual([0, 0.125, 0.25, 0.375]);
  });

  it('the tool key list: every live key in phase order, the own keys editable with the Mirror box on', () => {
    const ks = tuneKeysToolKeys('sneak');
    expect(ks.map((k) => k.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(ks.map((k) => k.editable)).toEqual([true, true, true, true, false, false, false, false]);
    expect(ks[1]!.group).toBe(g(1));
    expect(tuneKeysMirror('sneak', false)).toBe(true);
    expect(tuneKeysToolKeys('sneak').every((k) => k.editable)).toBe(true);
  });

  it('wave, Mirror on: the own keys take the sine; the mirrored half follows the mirror rule (a turn flips)', () => {
    expect(tuneKeysWave('sneak', 'chest_yaw', 8, 0.1)).toBe(4);
    for (let k = 0; k < 4; k++) expect(tuneGet(g(k), 'chest_yaw')).toBe(r2(8 * Math.sin(2 * Math.PI * (SNEAK.phases[k]! + 0.1))));
    // the mirrored-half groups keep 0 (they follow their own keys)
    for (let k = 4; k < 8; k++) expect(tuneGet(g(k), 'chest_yaw')).toBe(0);
    // the mirrored key's pose deltas: the own key's, negated (a turn flips): = the sine half a cycle on
    const own = tuneKeysDiff('sneak', 1, 0).d; // (pose diffs need no file: delta - delta when it is not loaded)
    expect(Number.isFinite(own[KEY_FIELD_INDEX.chest_yaw!]!)).toBe(true);
    expect(tuneKeysWave('sneak', 'nope', 1, 0)).toBe(-1);
  });

  it('wave, Mirror off: every key on its own takes the sine at its phase', () => {
    tuneKeysMirror('sneak', false);
    expect(tuneKeysWave('sneak', 'armR_twist', 20, 0)).toBe(6); // keys 0 and 4 sit at sin 0 and sin pi: 0, unchanged
    for (let k = 0; k < 8; k++) {
      const ph = k < 4 ? SNEAK.phases[k]! : SNEAK.phases[k - 4]! + 0.5;
      expect(tuneGet(g(k), 'armR_twist')).toBe(r2(keyWaveValue(20, ph, 0)));
    }
  });

  it('wave is one undo step', () => {
    const h = new TuneHistory();
    let now = 0;
    TUNE_HOOKS.changed = () => h.note(now);
    h.reset();
    h.settle(now, true);
    expect(tuneKeysWave('sneak', 'spine_roll', 6, 0.25)).toBe(3); // (key 3 at phase 0.25: cos(pi / 2) = 0, unchanged)
    now += 10;
    h.settle(now, true);
    expect(h.undoCount).toBe(1);
    expect(h.undo(now)).toBe(true);
    for (let k = 0; k < 4; k++) expect(tuneGet(g(k), 'spine_roll')).toBe(0);
  });

  it('apply to keys: the shown key value of one slider to the ticked keys only (one undo step)', () => {
    const h = new TuneHistory();
    let now = 0;
    TUNE_HOOKS.changed = () => h.note(now);
    tuneSet(g(1), 'chest_pitch', 5);
    tuneSet(g(3), 'chest_pitch', -2);
    h.reset();
    expect(tuneKeysApply('sneak', 1, 'chest_pitch', [0, 2, 1])).toBe(2);
    expect([0, 1, 2, 3].map((k) => tuneGet(g(k), 'chest_pitch'))).toEqual([5, 5, 5, -2]);
    now += 10;
    h.settle(now, true);
    expect(h.undoCount).toBe(1);
    h.undo(now);
    expect([0, 1, 2, 3].map((k) => tuneGet(g(k), 'chest_pitch'))).toEqual([0, 5, 0, -2]);
    // the mirrored key shown (Mirror on): its own key's sliders
    tuneSet(g(2), 'armL_flex', 7);
    expect(tuneKeysApply('sneak', 6, 'armL_flex', [0, 1, 2, 3])).toBe(3);
    expect([0, 1, 3].map((k) => tuneGet(g(k), 'armL_flex'))).toEqual([7, 7, 7]);
    expect(tuneKeysApply('sneak', 1, 'nope', [0])).toBe(-1);
  });

  it("smooth between: the keys between eased from one key's pose to the other's (the bake's poses), every slider or one", async () => {
    await tuneKeysLoadFile('sneak');
    tuneSet(g(3), 'chest_yaw', 12);
    const A = new Float64Array(KEY_FIELDS.length);
    const B = new Float64Array(KEY_FIELDS.length);
    expect(tuneKeysPose('sneak', 0, A)).toBe(true);
    tuneKeysPose('sneak', 3, B);
    const h = new TuneHistory();
    let now = 0;
    TUNE_HOOKS.changed = () => h.note(now);
    h.reset();
    expect(tuneKeysSmooth('sneak', 0, 3, 'chest_yaw')).toBe(2);
    const P = new Float64Array(KEY_FIELDS.length);
    const j = KEY_FIELD_INDEX.chest_yaw!;
    for (const k of [1, 2]) {
      tuneKeysPose('sneak', k, P);
      const w = keySmoothstep(SNEAK.phases[k]! / SNEAK.phases[3]!);
      expect(P[j]).toBeCloseTo(A[j]! + (B[j]! - A[j]!) * w, 2);
    }
    // only that slider moved
    expect(tuneGet(g(1), 'chest_pitch')).toBe(0);
    now += 10;
    h.settle(now, true);
    expect(h.undoCount).toBe(1);
    // every slider: each field eased
    expect(tuneKeysSmooth('sneak', 0, 3, null)).toBeGreaterThan(0);
    tuneKeysPose('sneak', 1, P);
    const w1 = keySmoothstep(1 / 3);
    for (const id of ['pelvis_dy', 'armL_flex', 'armR_elbow', 'spine_pitch']) {
      const i = KEY_FIELD_INDEX[id]!;
      expect(P[i]).toBeCloseTo(A[i]! + (B[i]! - A[i]!) * w1, 2);
    }
    // neighbours (nothing between) and unknown keys
    expect(tuneKeysSmooth('sneak', 1, 2, null)).toBe(0);
    expect(tuneKeysSmooth('sneak', 1, 9, null)).toBe(-1);
  });

  it('compare: key a minus key b, from the key file once it is loaded', async () => {
    await tuneKeysLoadFile('sneak');
    tuneSet(g(1), 'armR_twist', 12);
    tuneSet(g(0), 'armR_twist', 0);
    const A = new Float64Array(KEY_FIELDS.length);
    const B = new Float64Array(KEY_FIELDS.length);
    tuneKeysPose('sneak', 1, A);
    tuneKeysPose('sneak', 0, B);
    const { d, abs } = tuneKeysDiff('sneak', 1, 0);
    expect(abs).toBe(true);
    for (let j = 0; j < d.length; j++) expect(d[j]).toBeCloseTo(A[j]! - B[j]!, 9);
    const line = keyDiffLine(
      KEY_FIELDS.map((f) => ({ name: f.id, unit: f.unit })),
      d,
      new Float64Array(d.length),
    );
    expect(line).toContain('armR_twist');
  });
});

/** The largest change between neighbouring frames of a sweep (pelvis m, quaternion components, arm points m). */
function maxStep(clip: KeyedClip): number {
  const p = newKeyedPose();
  let prev: number[] | null = null;
  let m = 0;
  const S = clip.frames * 4;
  for (let i = 0; i <= S; i++) {
    sampleKeyed(clip, i / S, 1, p);
    const v = [...p.pel, ...p.q, ...p.arm];
    if (prev) for (let c = 0; c < v.length; c++) m = Math.max(m, Math.abs(v[c]! - prev[c]!));
    prev = v;
  }
  return m;
}
const pose = (clip: KeyedClip, ph: number): number[] => {
  const p = newKeyedPose();
  sampleKeyed(clip, ph, 1, p);
  return [...p.pel, ...p.q, ...p.arm];
};
const maxDiff = (a: number[], b: number[]): number => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i]!)), 0);

describe('item 30e: retimed and added keys preview sensibly on the curve', () => {
  it('a retimed key: its pose lands at its new time, the in-betweens stay smooth', async () => {
    const step0 = maxStep(KEYED_SNEAK);
    const atKey = pose(KEYED_SNEAK, 0.125);
    expect(tuneKeysRetime('sneak', 1, 3)).toBe(true);
    await tuneKeysFilesReady();
    tuneKeysSync();
    // on the curve: a retime alone re-keys the clip (offsets on)
    expect(KEYED_SNEAK.keyOff).not.toBeNull();
    expect(maxDiff(pose(KEYED_SNEAK, 9 / 48), atKey)).toBeLessThan(1e-4);
    expect(maxStep(KEYED_SNEAK)).toBeLessThan(step0 * 2.5);
    // with an edit on the retimed key too
    tuneSet(g(1), 'chest_pitch', 10);
    tuneKeysSync();
    // (the 10 degrees over the squeezed gap: about 0.011 a quarter frame; no jump)
    expect(maxStep(KEYED_SNEAK)).toBeLessThan(0.02);
  });

  it('an added key: the pose at its time is as before, the in-betweens stay smooth; an edit on it shows', async () => {
    await tuneKeysLoadFile('sneak');
    const step0 = maxStep(KEYED_SNEAK);
    const p0 = pose(KEYED_SNEAK, 9 / 48);
    const id = tuneKeysAdd('sneak', 1);
    expect(id).toBeGreaterThan(0);
    tuneKeysSync();
    expect(KEYED_SNEAK.keyOff).not.toBeNull();
    // the added key takes the value the preview showed there (the trunk re-keyed from its fields: a few hundredths of a degree)
    expect(maxDiff(pose(KEYED_SNEAK, 9 / 48), p0)).toBeLessThan(1e-3);
    expect(maxStep(KEYED_SNEAK)).toBeLessThan(step0 * 2.5);
    const ga = `key.sneak.a0`;
    tuneSet(ga, 'pelvis_dy', tuneGet(ga, 'pelvis_dy') + 3);
    tuneKeysSync();
    const dy = pose(KEYED_SNEAK, 9 / 48)[1]! - p0[1]!;
    expect(dy).toBeCloseTo((3 * 0.01 * 1.75) / 1.68, 4);
  });
});
