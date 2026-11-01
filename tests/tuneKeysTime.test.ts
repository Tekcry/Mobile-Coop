// (marlow-bays item 23) Key timing: the retime clamp, the mirror partner, the sampler's time map, the key file's
// phases, the tuner store and the export (literal old key file and literal old store value).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { newKeyedPose, sampleKeyed, type KeyedClip } from '../src/anim/keyed';
import { KEYED_SNEAK } from '../src/anim/clips/keyed/sneak';
import { KEYED_WALK } from '../src/anim/clips/keyed/walk';
import { KEY_CLIPS } from '../src/anim/tuneKeysMeta';
import { applyKeyEdits, editedClips, keyFileText, keyGroupId, keyHalvesDiffer, keyMetaText, keyMirrorGroupId, keyValuesOf, readKeys, type KeyFile } from '../src/anim/tuneKeysFile';
import { KEYS_SECTION, tuneKeysClipValues, tuneKeysFrame, tuneKeysMirror, tuneKeysRetime, tuneKeysSync, tuneKeysTimeInfo } from '../src/anim/tuneKeys';
import { keyClip, keyFrame, keyPhase, keyReadout, keyStep } from '../src/anim/keyTimeline';
import { KEY_SPAN, KEY_TIME_ID, KEY_TIMES, keyBasePos, keyRetimeRange, keyTimeOwner, keyTimeSolve, keyWarpPhase } from '../src/anim/tuneKeysTime';
import { TUNE_EXPORT_MAGIC, tuneExport, tuneGet, tuneImport, tuneLoad, tuneResetAll, tuneSet, tuneSnapshot } from '../src/anim/tuneRegistry';
import { tuneApplyValues, tuneValues } from '../src/anim/tuneHistory';
import { chamberKeyInfo, chamberKeyPhase } from '../src/anim/chamber';
import { bakeCatalogue, tuneBake } from '../src/anim/tuneBake';

const DIR = path.join(__dirname, '..', 'scripts', 'anim-keys', 'keys');
const text = (n: string): string => readFileSync(path.join(DIR, `${n}.json`), 'utf8');
const file = (n: string): KeyFile => JSON.parse(text(n)) as KeyFile;

// (anim-bake-1022) The live preview, store and bake tests run on sneak: a mirrored clip with 4 own keys evenly spaced
// (bake frames 0, 6, 12, 18 of 48), the layout JOG describes. They ran on jog until Michael's 2026-10-22 tune retimed
// jog's key 3 (phase 0.25 -> 0.1458, one bake frame after key 2). A tune that moves sneak's keys fails the precondition
// test below: move these tests to another evenly spaced clip.
const JOG = { phases: [0, 0.125, 0.25, 0.375], mirror: true };
const FULL = { phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875], mirror: false };

/** Every channel of a clip sampled over two cycles at three amplitudes. */
function sweep(clip: KeyedClip): number[] {
  const p = newKeyedPose();
  const out: number[] = [];
  for (const amp of [1, 0.6, 0]) {
    for (let i = 0; i < 2 * clip.frames * 3; i++) {
      sampleKeyed(clip, i / (clip.frames * 3) - 0.37, amp, p);
      out.push(...p.pel, ...p.q, ...p.arm, ...p.wrist, p.hasWrist, ...p.fore, ...p.head, ...p.sh);
    }
  }
  return out;
}
const pose = (clip: KeyedClip, ph: number): number[] => {
  const p = newKeyedPose();
  sampleKeyed(clip, ph, 1, p);
  return [...p.pel, ...p.q, ...p.arm];
};

afterEach(() => {
  tuneResetAll();
  tuneKeysSync();
});

describe('item 23: the retime clamp and the mirror partner (pure)', () => {
  it('(anim-bake-1022) precondition: the test clip (sneak) is keyed as JOG describes (read from the tuner meta)', () => {
    const c = KEY_CLIPS.find((x) => x.name === 'sneak')!;
    expect({ phases: c.phases, mirror: c.mirror, frames: c.frames }).toEqual({ ...JOG, frames: 32 });
  });

  it('no moves: every key where it was baked; a move clamps between the neighbours; the first key is fixed', () => {
    const pos: number[] = [];
    expect(keyTimeSolve(JOG, [0, 0, 0, 0, 0, 0, 0, 0], true, pos)).toBe(false);
    expect(pos).toEqual([0, 6, 12, 18, 24, 30, 36, 42]);
    // key 2 three bake frames later: its mirror (key 6) moves with it, half a cycle on
    expect(keyTimeSolve(JOG, [0, 3, 0, 0, 0, 0, 0, 0], true, pos)).toBe(true);
    expect(pos).toEqual([0, 9, 12, 18, 24, 33, 36, 42]);
    // never onto or past a neighbour
    keyTimeSolve(JOG, [0, 40, 0, 0], true, pos);
    expect(pos.slice(0, 4)).toEqual([0, 11, 12, 18]);
    keyTimeSolve(JOG, [0, -40, 0, 0], true, pos);
    expect(pos.slice(0, 4)).toEqual([0, 1, 12, 18]);
    // the first key never moves; the own half stays before the mirror of the first key (24)
    keyTimeSolve(JOG, [5, 0, 0, 30], true, pos);
    expect(pos).toEqual([0, 6, 12, 23, 24, 30, 36, 47]);
    // keys pushed together keep one frame apart and their order
    keyTimeSolve(FULL, [0, 40, 40, 40, 40, 40, 40, 40], false, pos);
    expect(pos).toEqual([0, 41, 42, 43, 44, 45, 46, 47]);
    // a non-finite move is no move, a fraction rounds
    keyTimeSolve(FULL, [0, Number.NaN, 1.4, 0, 0, 0, 0, 0], false, pos);
    expect(pos.slice(0, 3)).toEqual([0, 6, 13]);
  });

  it('Mirror on: a mirrored key is moved by its own key; Mirror off: every key on its own in the full cycle', () => {
    expect(keyTimeOwner(JOG, 5, true)).toBe(1);
    expect(keyTimeOwner(JOG, 5, false)).toBe(5);
    expect(keyTimeOwner(FULL, 5, true)).toBe(5);
    const pos: number[] = [];
    keyTimeSolve(JOG, [0, 0, 0, 0, 0, 2, 0, 0], true, pos); // the mirrored half ignored while on
    expect(pos).toEqual([0, 6, 12, 18, 24, 30, 36, 42]);
    keyTimeSolve(JOG, [0, 0, 0, 0, 0, 2, 0, 0], false, pos);
    expect(pos).toEqual([0, 6, 12, 18, 24, 32, 36, 42]);
    // the range: between the neighbours, the first key fixed; the last own key of a mirrored clip before 24
    keyTimeSolve(JOG, [0, 0, 0, 0], true, pos);
    expect(keyRetimeRange(JOG, pos, true, 1)).toEqual({ owner: 1, pos: 6, base: 6, lo: 1, hi: 11, fixed: false });
    expect(keyRetimeRange(JOG, pos, true, 7)).toEqual({ owner: 3, pos: 18, base: 18, lo: 13, hi: 23, fixed: false });
    expect(keyRetimeRange(JOG, pos, true, 4).fixed).toBe(true); // the mirror of the first key
    expect(keyRetimeRange(JOG, pos, false, 4)).toEqual({ owner: 4, pos: 24, base: 24, lo: 19, hi: 29, fixed: false });
    expect(keyRetimeRange(FULL, pos, false, 7).hi).toBe(47);
  });

  it('the time map: identity unmoved, a key at its new time samples its baked pose, the in-between stretched', () => {
    const old = [0, 6, 12, 18, 24, 30, 36, 42];
    for (let i = 0; i <= 96; i++) expect(keyWarpPhase(old, old, 8, i / 96)).toBeCloseTo((i / 96) % 1, 12);
    const neu = [0, 9, 12, 18, 24, 33, 36, 42];
    expect(keyWarpPhase(neu, old, 8, 9 / 48)).toBe(6 / 48);
    expect(keyWarpPhase(neu, old, 8, 33 / 48)).toBe(30 / 48);
    expect(keyWarpPhase(neu, old, 8, 4.5 / 48)).toBeCloseTo(3 / 48, 12); // half way to the moved key
    expect(keyWarpPhase(neu, old, 8, 10.5 / 48)).toBeCloseTo(9 / 48, 12);
    expect(keyWarpPhase(neu, old, 8, 1.25)).toBeCloseTo(keyWarpPhase(neu, old, 8, 0.25), 12); // wraps
    expect(keyWarpPhase(neu, old, 8, 45 / 48)).toBeCloseTo(45 / 48, 12); // the last segment to the cycle end
    expect(keyBasePos(JOG, 5)).toBe(30);
  });
});

describe('item 23: the live preview', () => {
  it('a retime moves the key (and its mirror) in the readout and the chamber, the pose comes along, a reset is bit-identical', () => {
    const base = sweep(KEYED_SNEAK);
    const walk = sweep(KEYED_WALK);
    const sneak = keyClip('sneak')!;
    expect(keyReadout(sneak, 1)).toBe('sneak - key 2 of 8 (mirror of 6), frame 4');
    const atKey = pose(KEYED_SNEAK, 0.125);
    const atKey6 = pose(KEYED_SNEAK, 0.625);
    expect(tuneKeysRetime('sneak', 1, 3)).toBe(true);
    expect(tuneGet(keyGroupId('sneak', 1), KEY_TIME_ID)).toBe(3);
    expect(KEYED_SNEAK.keyTime).not.toBeNull();
    expect(keyPhase(sneak, 1)).toBe(9 / 48);
    expect(keyPhase(sneak, 5)).toBe(33 / 48);
    expect(keyFrame(sneak, 1)).toBe(6);
    expect(keyReadout(sneak, 1)).toBe('sneak - key 2 of 8 (mirror of 6), frame 6');
    // the chamber pauses on the key at its new time and steps onto it
    expect(chamberKeyPhase('sneak', 0, 1, 0)).toBe(9 / 48);
    expect(keyStep(sneak, 0, 1)).toBe(1);
    const info = { keys: 0, key: -1, onKey: false };
    chamberKeyInfo('sneak', 9 / 48, info);
    expect(info.key === 1 && info.onKey).toBe(true);
    // the key's pose at its new time; the old frame now between keys
    expect(pose(KEYED_SNEAK, 9 / 48)).toEqual(atKey);
    expect(pose(KEYED_SNEAK, 33 / 48)).toEqual(atKey6);
    expect(pose(KEYED_SNEAK, 0.125)).not.toEqual(atKey);
    expect(sweep(KEYED_WALK)).toEqual(walk); // other clips untouched
    // the timing info the panel shows
    const ti = tuneKeysTimeInfo('sneak', 1)!;
    expect(ti).toMatchObject({ owner: 1, pos: 9, base: 6, lo: 1, hi: 11, fixed: false, frame: 6, frames: 32, partner: 5 });
    expect(tuneKeysTimeInfo('sneak', 5)).toMatchObject({ owner: 1, pos: 33, base: 30, lo: 25, hi: 35, partner: 1 });
    // clamped: against the next key, then no further; the first key never moves
    expect(tuneKeysRetime('sneak', 1, 10)).toBe(true);
    expect(keyPhase(sneak, 1)).toBe(11 / 48);
    expect(tuneKeysRetime('sneak', 1, 1)).toBe(false);
    expect(tuneKeysRetime('sneak', 0, 1)).toBe(false);
    expect(tuneKeysRetime('sneak', 4, 1)).toBe(false);
    // back: bit-identical, and the time state is reused in place
    const kt = KEYED_SNEAK.keyTime;
    tuneSet(keyGroupId('sneak', 1), KEY_TIME_ID, 0);
    tuneKeysFrame();
    tuneKeysSync();
    expect(KEYED_SNEAK.keyTime).toBeNull();
    expect(KEY_TIMES.has('sneak')).toBe(false);
    expect(sweep(KEYED_SNEAK)).toEqual(base);
    expect(keyReadout(sneak, 1)).toBe('sneak - key 2 of 8 (mirror of 6), frame 4');
    tuneKeysRetime('sneak', 2, -1);
    expect(KEYED_SNEAK.keyTime).toBe(kt);
  });

  it('a key edit on a retimed clip shows at the key\'s new time', () => {
    const p0 = pose(KEYED_SNEAK, 0.125); // the key's baked pose
    tuneKeysRetime('sneak', 1, 3);
    tuneSet(keyGroupId('sneak', 1), 'spine_pitch', 10);
    tuneKeysSync();
    const a = newKeyedPose();
    sampleKeyed(KEYED_SNEAK, 9 / 48, 1, a);
    const s = [...a.q.slice(4, 8)];
    const b = p0.slice(3 + 4, 3 + 8);
    const d = Math.abs(s[0]! * b[0]! + s[1]! * b[1]! + s[2]! * b[2]! + s[3]! * b[3]!);
    expect((2 * Math.acos(Math.min(1, d)) * 180) / Math.PI).toBeCloseTo(10, 3);
  });

  it('Mirror off: a mirrored key moves on its own; going off keeps the mirrored key where its own key put it', () => {
    const sneak = keyClip('sneak')!;
    tuneKeysRetime('sneak', 1, 2);
    expect(tuneKeysMirror('sneak', false)).toBe(true);
    expect(tuneGet(keyGroupId('sneak', 5), KEY_TIME_ID)).toBe(2); // copied: nothing jumps
    tuneKeysSync();
    expect(keyPhase(sneak, 5)).toBe(32 / 48);
    expect(tuneKeysRetime('sneak', 5, -3)).toBe(true);
    expect(keyPhase(sneak, 5)).toBe(29 / 48);
    expect(keyPhase(sneak, 1)).toBe(8 / 48);
    tuneKeysMirror('sneak', true);
    tuneKeysSync();
    expect(keyPhase(sneak, 5)).toBe(32 / 48); // on again: the mirror follows the own key
  });

  it('undo: the snapshot before the retime restores the timing and the pose', () => {
    const before = tuneValues();
    const base = sweep(KEYED_SNEAK);
    tuneKeysRetime('sneak', 2, 4);
    expect(sweep(KEYED_SNEAK)).not.toEqual(base);
    tuneApplyValues(before);
    tuneKeysSync();
    expect(KEYED_SNEAK.keyTime).toBeNull();
    expect(sweep(KEYED_SNEAK)).toEqual(base);
  });
});

describe('item 23: the store, the export and the key file', () => {
  it('a literal tuner store value from before key timing loads with every key as baked; the time rides the save', () => {
    // a version 2 save (marlow-bays T1a / T2) with a key edit and a Mirror box: no `time` anywhere
    const OLD_STORE = {
      version: 2,
      values: { 'key.sneak.1': { armL_elbow: 10 }, 'key.walk.mirror': { mirror: 0 }, 'key.walk.5': { armR_elbow: -4 } },
      log: [{ t: '2026-10-20T09:00:00.000Z', group: 'key.sneak.1', id: 'armL_elbow', from: 0, to: 10 }],
    };
    tuneLoad(OLD_STORE);
    tuneKeysSync();
    expect(tuneGet('key.sneak.1', 'armL_elbow')).toBe(10);
    expect(tuneGet('key.sneak.1', KEY_TIME_ID)).toBe(0);
    expect(KEY_TIMES.size).toBe(0);
    expect(KEYED_SNEAK.keyTime).toBeNull();
    expect(KEYED_WALK.keyTime).toBeNull();
    for (const c of KEY_CLIPS) for (let k = 0; k < c.phases.length; k++) expect(keyPhase(c, k)).toBe(c.phases[k]);
    // a retime is saved and comes back live
    tuneKeysRetime('sneak', 3, -2);
    const snap = JSON.parse(JSON.stringify(tuneSnapshot())) as unknown;
    expect((snap as { values: Record<string, Record<string, number>> }).values['key.sneak.3']).toEqual({ time: -2 });
    tuneResetAll();
    tuneKeysSync();
    expect(KEYED_SNEAK.keyTime).toBeNull();
    tuneLoad(snap);
    tuneKeysSync();
    expect(keyPhase(keyClip('sneak')!, 3)).toBe(16 / 48);
    expect(KEYED_SNEAK.keyTime).not.toBeNull();
  });

  it('export / import carry the time; the export bakes it into the key phases (the mirror follows)', () => {
    tuneKeysRetime('sneak', 1, 3);
    tuneSet(keyGroupId('sneak', 2), 'chest_yaw', 2);
    const exp = JSON.parse(JSON.stringify(tuneExport())) as unknown;
    expect(tuneKeysClipValues('sneak')).toEqual({ 'key.sneak.1': { time: 3 }, 'key.sneak.2': { chest_yaw: 2 } });
    tuneResetAll();
    const r = tuneImport(exp, 'exp');
    expect(r.ok && r.applied === 2).toBe(true);
    tuneKeysSync();
    expect(keyPhase(keyClip('sneak')!, 1)).toBe(9 / 48);
    const vals = keyValuesOf(exp);
    expect(editedClips(vals)).toEqual(['sneak']);
    const base = file('sneak');
    const out = JSON.parse(keyFileText(applyKeyEdits(base, vals))) as KeyFile;
    expect(out.mirror).toBe(true);
    expect(out.keys.map((k) => k.phase)).toEqual([0, 0.1875, 0.25, 0.375]);
    expect(readKeys(out).map((k) => k.phase)).toEqual([0, 0.1875, 0.25, 0.375, 0.5, 0.6875, 0.75, 0.875]);
    // everything but the moved key's phase (and the chest edit) as it was
    expect({ ...out.keys[1], phase: 0.125 }).toEqual(base.keys[1]);
    // the meta the tuner reads, regenerated from the written file
    const meta = keyMetaText([out]);
    expect(meta).toContain("{ name: 'sneak', frames: 32, mirror: true, phases: [0, 0.1875, 0.25, 0.375] },");
  });

  it('every key file with no timing edit is written byte for byte; the meta regenerates byte for byte', () => {
    const files = KEY_CLIPS.map((c) => file(c.name));
    for (const c of KEY_CLIPS) expect(keyFileText(applyKeyEdits(file(c.name), { [keyGroupId(c.name, 1)]: { time: 0 } }))).toBe(text(c.name));
    const disk = readFileSync(path.join(__dirname, '..', 'src', 'anim', 'tuneKeysMeta.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(keyMetaText(files)).toBe(disk);
  });

  it('a literal old key file (no time field, evenly spaced keys) keeps its spacing; a retime writes the phase on the bake grid', () => {
    const OLD_FILE: KeyFile = {
      name: 'walk',
      note: 'an old key file',
      mirror: true,
      duty: 0.6,
      keys: [
        { phase: 0, spine: { pitch: 2 } },
        { phase: 0.125, spine: { pitch: 3 } },
        { phase: 0.25, spine: { pitch: 2 } },
        { phase: 0.375, spine: { pitch: 1 } },
      ],
    };
    expect(applyKeyEdits(OLD_FILE, {})).toEqual(OLD_FILE);
    expect(readKeys(OLD_FILE).map((k) => k.phase)).toEqual([0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]);
    const out = applyKeyEdits(OLD_FILE, { 'key.walk.2': { time: -1 }, 'key.walk.0': { time: 4 } });
    expect(out.keys.map((k) => k.phase)).toEqual([0, 0.125, 11 / 48, 0.375]); // the first key fixed
    for (const k of out.keys) expect(Math.abs((k.phase as number) * KEY_SPAN - Math.round((k.phase as number) * KEY_SPAN))).toBeLessThan(1e-9);
    // a clamp past the neighbour is written clamped
    expect(applyKeyEdits(OLD_FILE, { 'key.walk.1': { time: 30 } }).keys[1]!.phase).toBe(11 / 48);
  });

  it('Mirror off with a mirrored key moved apart: the file is written in full with each key\'s own phase', () => {
    const vals: Record<string, Record<string, number>> = { [keyMirrorGroupId('sneak')]: { mirror: 0 }, 'key.sneak.1': { time: 2 }, 'key.sneak.5': { time: 2 } };
    expect(keyHalvesDiffer(vals, 'sneak', 4)).toBe(false);
    const still = applyKeyEdits(file('sneak'), vals);
    expect(still.mirror).toBe(true);
    expect(still.keys.map((k) => k.phase)).toEqual([0, 8 / 48, 0.25, 0.375]);
    const apart = { ...vals, 'key.sneak.5': { time: -1 } };
    expect(keyHalvesDiffer(apart, 'sneak', 4)).toBe(true);
    const full = applyKeyEdits(file('sneak'), apart);
    expect(full.mirror).toBe(false);
    expect(full.keys.map((k) => k.phase)).toEqual([0, 8 / 48, 0.25, 0.375, 0.5, 29 / 48, 0.75, 0.875]);
    // the first key's mirror moved: also apart
    expect(keyHalvesDiffer({ [keyMirrorGroupId('sneak')]: { mirror: 0 }, 'key.sneak.4': { time: 1 } }, 'sneak', 4)).toBe(true);
  });

  it('an import of an export from before key timing (version 2) changes no key time', () => {
    const r = tuneImport({ magic: TUNE_EXPORT_MAGIC, version: 2, changed: [{ group: 'key.run.2', id: 'pelvis_roll', value: 4 }], log: [] });
    expect(r.ok).toBe(true);
    tuneKeysSync();
    expect(KEY_TIMES.size).toBe(0);
    expect(KEYS_SECTION.values['key.run.2']![KEY_TIME_ID]).toBe(0);
  });
});

// (item 23, track A) The in-app bake (src/anim/tuneBake.ts): the `time` rule writes the key phase and the tuner's key
// meta; an export with no timing edit bakes exactly as before. Reads the real tree only (nothing written).
describe('key timing: the bake (tuneBake)', () => {
  const ROOT = path.join(__dirname, '..');
  const read = (p: string): string | null => {
    try {
      return readFileSync(path.join(ROOT, p), 'utf8');
    } catch {
      return null;
    }
  };
  const CAT = bakeCatalogue([]);
  const META = 'src/anim/tuneKeysMeta.ts';
  const exp = (changed: unknown[]) => ({ magic: 'night-shift-anim-tune', version: 2, exported: '2026-10-21T20:00:00.000Z', changed, log: [] });

  it('a literal export with a retimed key: the key file gets the new phase, the meta follows, the clip is rebaked', () => {
    const r = tuneBake(exp([{ group: 'key.sneak.1', id: 'time', label: 'key time', kind: 'add', unit: 'fr', value: 3, default: 0 }, { group: 'key.sneak.2', id: 'chest_yaw', label: 'chest yaw', kind: 'add', unit: 'deg', value: 2.5, default: 0 }]), CAT, read);
    expect(r.ok, r.error).toBe(true);
    const row = r.rows.find((x) => x.id === 'time')!;
    expect(row.result).toBe('baked (key JSON; rebake the clip)');
    expect(row.target).toBe('scripts/anim-keys/keys/sneak.json key 1 phase + (bake frames / 48)');
    const w = r.writes.find((x) => x.path === 'scripts/anim-keys/keys/sneak.json')!;
    const out = JSON.parse(w.after) as KeyFile;
    expect(out.keys.map((k) => k.phase)).toEqual([0, 9 / 48, 0.25, 0.375]);
    expect(w.after).toBe(keyFileText(applyKeyEdits(file('sneak'), { 'key.sneak.1': { time: 3 }, 'key.sneak.2': { chest_yaw: 2.5 } })));
    const m = r.writes.find((x) => x.path === META)!;
    expect(m.after).toContain("{ name: 'sneak', frames: 32, mirror: true, phases: [0, 0.1875, 0.25, 0.375] },");
    // only the sneak row of the meta changed; its line ends kept
    const lines = (t: string): string[] => t.split('\n');
    const diff = lines(m.after).filter((l, i) => l !== lines(m.before)[i]);
    expect(diff.length).toBe(1);
    expect(m.after.includes('\r\n')).toBe(m.before.includes('\r\n'));
    expect(r.rebake).toEqual(['node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/build.mjs sneak']);
    expect(r.writes.map((x) => x.path).sort()).toEqual([META, 'scripts/anim-keys/keys/sneak.json', 'src/anim/tuneBakeLog.json'].sort());
  });

  it('the first key is fixed: its time is skipped, nothing written for it', () => {
    const r = tuneBake(exp([{ group: 'key.sneak.0', id: 'time', kind: 'add', value: 2 }]), CAT, read);
    expect(r.ok, r.error).toBe(true);
    expect(r.rows[0]!.result).toBe('skipped: the first key is fixed (phase 0)');
    expect(r.writes).toEqual([]);
  });

  it('no timing edit: the key file as before (the apply-tune functions), the meta never touched', () => {
    const r = tuneBake(exp([{ group: 'key.sneak.2', id: 'chest_yaw', kind: 'add', value: 2.5 }]), CAT, read);
    expect(r.ok, r.error).toBe(true);
    expect(r.writes.map((x) => x.path).sort()).toEqual(['scripts/anim-keys/keys/sneak.json', 'src/anim/tuneBakeLog.json']);
    const w = r.writes.find((x) => x.path === 'scripts/anim-keys/keys/sneak.json')!;
    expect(w.after).toBe(keyFileText(applyKeyEdits(file('sneak'), { 'key.sneak.2': { chest_yaw: 2.5 } })));
    const a = JSON.parse(w.after) as KeyFile;
    const b = file('sneak');
    expect(a.keys.map((k) => k.phase)).toEqual(b.keys.map((k) => k.phase));
    // every field but the edited chest yaw as it was
    expect({ ...a.keys[2], chest: b.keys[2]!.chest }).toEqual(b.keys[2]);
  });
});
