// (tuner-v2 item 4) Per-key editing: the Keys section, the sampler's per-key offsets, the key JSON export.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { newKeyedPose, sampleKeyed, type KeyedClip } from '../src/anim/keyed';
import { KEYED_WALK } from '../src/anim/clips/keyed/walk';
import { KEYED_IDLE } from '../src/anim/clips/keyed/idle';
import { KEY_CLIPS } from '../src/anim/tuneKeysMeta';
import { applyKeyEdits, editedClips, KEY_FIELDS, keyFileText, keyGroupId, keyValuesOf, readKeys, type KeyFile } from '../src/anim/tuneKeysFile';
import { KEYS_SECTION, keyedClipByName, tuneKeysClipValues, tuneKeysFilesReady, tuneKeysFrame, tuneKeysSync } from '../src/anim/tuneKeys';
/** (item 30e) The spine pitch half way between walk key 2 (+10) and key 1, on the bake's curve (measured, see the test). */
const MID_LO = 1;
const MID_HI = 9;
import { TUNE_SECTIONS, tuneExport, tuneLoad, tuneResetAll, tuneSet, tuneSnapshot } from '../src/anim/tuneRegistry';

const DIR = path.join(__dirname, '..', 'scripts', 'anim-keys', 'keys');
const text = (n: string): string => readFileSync(path.join(DIR, `${n}.json`), 'utf8');
const file = (n: string): KeyFile => JSON.parse(text(n)) as KeyFile;

/** Every channel of a clip sampled over two cycles at three amplitudes. */
function sweep(clip: KeyedClip): number[] {
  const p = newKeyedPose();
  const out: number[] = [];
  for (const amp of [1, 0.6, 0]) {
    for (let i = 0; i < 2 * clip.frames * 3; i++) {
      sampleKeyed(clip, i / (clip.frames * 3) - 0.37, amp, p);
      out.push(...p.pel, ...p.q, ...p.arm, ...p.wrist, p.hasWrist);
    }
  }
  return out;
}

const qAngle = (a: ArrayLike<number>, b: ArrayLike<number>, s: number): number => {
  const d = Math.abs(a[s]! * b[s]! + a[s + 1]! * b[s + 1]! + a[s + 2]! * b[s + 2]! + a[s + 3]! * b[s + 3]!);
  return (2 * Math.acos(Math.min(1, d)) * 180) / Math.PI;
};

afterEach(() => {
  tuneResetAll();
  tuneKeysSync();
});

describe('tuner-v2 item 4: per-key editing', () => {
  it('the key table matches scripts/anim-keys/keys and every clip is found; Keys registers last', () => {
    const names = readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
    expect(KEY_CLIPS.map((c) => c.name)).toEqual(names);
    for (const c of KEY_CLIPS) {
      const f = file(c.name);
      expect(c.phases).toEqual(f.keys.map((k) => k.phase));
      expect(c.mirror).toBe(!!f.mirror);
      expect(c.frames).toBe(f.frames ?? 32);
      expect(keyedClipByName(c.name)?.frames).toBe(c.frames);
    }
    expect(TUNE_SECTIONS.at(-1)).toBe(KEYS_SECTION);
    // (marlow-bays T1a, item 18) a mirrored clip: its mirrored half's keys and its Mirror box too
    // (marlow-bays item 25) and 8 added-key groups per clip
    expect(KEYS_SECTION.groups.length).toBe(KEY_CLIPS.reduce((n, c) => n + (c.mirror ? 2 * c.phases.length + 1 : c.phases.length) + 8, 0));
    expect(KEYS_SECTION.tunables.length).toBe(KEY_FIELDS.length + 4); // (marlow-bays item 23) + the key time; (item 25) + del, at
  });

  it('identity: no edits = a real clip samples bit-identical, also after an edit is reset', () => {
    const base = sweep(KEYED_WALK);
    const idle = sweep(KEYED_IDLE);
    tuneKeysFrame();
    expect(KEYED_WALK.keyOff).toBeNull();
    expect(sweep(KEYED_WALK)).toEqual(base);
    tuneSet(keyGroupId('walk', 1), 'spine_pitch', 12);
    tuneSet(keyGroupId('walk', 2), 'armR_elbow', 20);
    tuneKeysSync();
    expect(KEYED_WALK.keyOff).not.toBeNull();
    expect(sweep(KEYED_WALK)).not.toEqual(base);
    expect(KEYED_IDLE.keyOff).toBeNull();
    expect(sweep(KEYED_IDLE)).toEqual(idle);
    const tables = KEYED_WALK.keyOff;
    tuneSet(keyGroupId('walk', 1), 'spine_pitch', 0);
    tuneSet(keyGroupId('walk', 2), 'armR_elbow', 0);
    tuneKeysFrame();
    expect(KEYED_WALK.keyOff).toBeNull();
    expect(sweep(KEYED_WALK)).toEqual(base);
    // the tables are kept and reused in place (allocated on the first edit only)
    tuneSet(keyGroupId('walk', 0), 'neck_yaw', 5);
    tuneKeysFrame();
    expect(KEYED_WALK.keyOff).toBe(tables);
  });

  it('live preview: the edit shows at its key, fades to the next key, its mirror follows; the chest stays put', async () => {
    // (marlow-bays item 30e) the exact preview: with walk's key file loaded the edit spreads on the bake's curve
    tuneSet(keyGroupId('walk', 1), 'spine_pitch', 1);
    tuneKeysSync();
    await tuneKeysFilesReady();
    tuneResetAll();
    tuneKeysSync();
    const p0 = newKeyedPose();
    const p1 = newKeyedPose();
    const at = (ph: number, out: typeof p0): void => void sampleKeyed(KEYED_WALK, ph, 1, out);
    tuneSet(keyGroupId('walk', 1), 'spine_pitch', 10); // walk key 1: phase 0.125
    at(0.125, p0);
    tuneKeysSync();
    at(0.125, p1);
    expect(qAngle(p0.q, p1.q, 4)).toBeCloseTo(10, 3); // spine
    // chest world unchanged: (spine * E) * (E^-1 * chest)
    const mul = (a: number[], b: number[]): number[] => [
      a[3]! * b[0]! + a[0]! * b[3]! + a[1]! * b[2]! - a[2]! * b[1]!,
      a[3]! * b[1]! - a[0]! * b[2]! + a[1]! * b[3]! + a[2]! * b[0]!,
      a[3]! * b[2]! + a[0]! * b[1]! - a[1]! * b[0]! + a[2]! * b[3]!,
      a[3]! * b[3]! - a[0]! * b[0]! - a[1]! * b[1]! - a[2]! * b[2]!,
    ];
    const sc = (p: typeof p0): number[] => mul([...p.q.slice(4, 8)], [...p.q.slice(8, 12)]);
    expect(qAngle(sc(p0), sc(p1), 0)).toBeLessThan(1e-3);
    // half way to the neighbouring keys (0 and 0.25): half the offset
    at(0.1875, p1);
    tuneResetAll();
    tuneKeysSync();
    at(0.1875, p0);
    tuneSet(keyGroupId('walk', 1), 'spine_pitch', 10);
    tuneKeysSync();
    at(0.1875, p1);
    // (item 30e) on the bake's curve, not the linear half: between the key's 10 and the neighbour's 0, eased
    const mid = qAngle(p0.q, p1.q, 4);
    expect(mid).toBeGreaterThan(MID_LO);
    expect(mid).toBeLessThan(MID_HI);
    // the mirrored key (0.625) carries it too; the keys either side of the pair stay as baked
    tuneResetAll();
    tuneKeysSync();
    at(0.625, p0);
    at(0, p1);
    const base0 = [...p1.q];
    tuneSet(keyGroupId('walk', 1), 'spine_pitch', 10);
    tuneKeysSync();
    at(0.625, p1);
    expect(qAngle(p0.q, p1.q, 4)).toBeCloseTo(10, 3);
    at(0, p1);
    // (item 30e) the trunk re-keyed from the key file: the clip modules' 1e-5 rounding (tests/keyedExactPreview.test.ts)
    expect(qAngle(base0, p1.q, 4)).toBeLessThan(0.002);
  });

  it('arms: an elbow edit turns the forearm only; a wrist edit on a clip without wrist keys samples a wrist frame', () => {
    const p0 = newKeyedPose();
    const p1 = newKeyedPose();
    sampleKeyed(KEYED_WALK, 0, 1, p0);
    tuneSet(keyGroupId('walk', 0), 'armR_elbow', 30);
    tuneSet(keyGroupId('walk', 0), 'armL_wristPitch', 15);
    tuneKeysSync();
    sampleKeyed(KEYED_WALK, 0, 1, p1);
    expect([...p1.arm.slice(6, 9)]).toEqual([...p0.arm.slice(6, 9)]); // elbow R point
    const fore = (p: typeof p0, o: number): number[] => [0, 1, 2].map((c) => p.arm[o + 3 + c]! - p.arm[o + c]!);
    const a = fore(p0, 6);
    const b = fore(p1, 6);
    const cos = (a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!) / (Math.hypot(...a) * Math.hypot(...b));
    expect((Math.acos(cos) * 180) / Math.PI).toBeCloseTo(30, 0);
    expect([...p1.arm.slice(0, 6)]).toEqual([...p0.arm.slice(0, 6)]); // left arm points
    expect(KEYED_WALK.wrist).toBeNull();
    expect(p0.hasWrist).toBe(0);
    expect(p1.hasWrist).toBe(1);
    expect(qAngle([0, 0, 0, 1], p1.wrist, 0)).toBeCloseTo(15, 3);
  });

  it('export: the edited key JSON round-trips through the bake key reader to the same values', () => {
    const base = file('walk');
    expect(keyFileText(applyKeyEdits(base, {}))).toBe(text('walk')); // no edits = the file byte for byte
    tuneSet(keyGroupId('walk', 1), 'spine_pitch', 7.5);
    tuneSet(keyGroupId('walk', 1), 'chest_yaw', -3);
    tuneSet(keyGroupId('walk', 3), 'armL_inward', 4);
    tuneSet(keyGroupId('walk', 3), 'armR_wristRoll', 6);
    tuneSet(keyGroupId('idle', 0), 'neck_pitch', 2);
    const vals = keyValuesOf(tuneExport()); // the panel's Export file, as apply-tune.mjs reads it
    expect(vals).toEqual(keyValuesOf(tuneSnapshot()));
    expect(editedClips(vals)).toEqual(['idle', 'walk']);
    expect(tuneKeysClipValues('walk')).toEqual({ 'key.walk.1': { spine_pitch: 7.5, chest_yaw: -3 }, 'key.walk.3': { armL_inward: 4, armR_wristRoll: 6 } });
    const out = JSON.parse(keyFileText(applyKeyEdits(base, vals))) as KeyFile;
    expect({ ...out, keys: undefined }).toEqual({ ...base, keys: undefined });
    const rb = readKeys(base);
    const ro = readKeys(out);
    expect(ro.map((k) => k.phase)).toEqual(rb.map((k) => k.phase));
    const F = (id: string): number => KEY_FIELDS.findIndex((f) => f.id === id);
    const want = rb.map((k) => [...k.v]);
    const ph = (p: number): number => rb.findIndex((k) => k.phase === p);
    want[ph(0.125)]![F('spine_pitch')]! += 7.5;
    want[ph(0.125)]![F('chest_yaw')]! += -3;
    want[ph(0.625)]![F('spine_pitch')]! += 7.5; // the mirror: pitch kept
    want[ph(0.625)]![F('chest_yaw')]! -= -3; // yaw negated
    want[ph(0.375)]![F('armL_inward')]! += 4;
    want[ph(0.375)]![F('armR_wristRoll')]! += 6;
    want[ph(0.875)]![F('armR_inward')]! += 4; // the mirror: sides swapped
    want[ph(0.875)]![F('armL_wristRoll')]! += 6;
    for (let i = 0; i < rb.length; i++) for (let j = 0; j < KEY_FIELDS.length; j++) expect(ro[i]!.v[j]).toBeCloseTo(want[i]![j]!, 9);
    // a wrist frame is added to that arm only, the untouched keys are as they were
    expect((out.keys[3]!.armR as Record<string, unknown>).wrist).toEqual({ yaw: 0, pitch: 0, roll: 6 });
    expect((out.keys[3]!.armL as Record<string, unknown>).wrist).toBeUndefined();
    expect(out.keys[0]).toEqual(base.keys[0]);
  });

  it('save: the Keys values ride the registry snapshot and come back live after a load', () => {
    tuneSet(keyGroupId('run', 2), 'pelvis_roll', 4);
    const snap = JSON.parse(JSON.stringify(tuneSnapshot())) as unknown;
    expect((snap as { values: Record<string, unknown> }).values['key.run.2']).toEqual({ pelvis_roll: 4 });
    tuneResetAll();
    tuneKeysSync();
    expect(keyedClipByName('run')!.keyOff).toBeNull();
    tuneLoad(snap);
    tuneKeysFrame();
    expect(keyedClipByName('run')!.keyOff).not.toBeNull();
  });
});
