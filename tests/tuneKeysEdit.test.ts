// (marlow-bays item 25) Add / delete keys: the live key list (with and without the Mirror box), the blended pose of an
// added key, the minimum, retime + insert, the live preview, undo, the store and the export (literal old ones), the
// key file and the bake.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { newKeyedPose, sampleKeyed, type KeyedClip } from '../src/anim/keyed';
import { KEYED_JOG } from '../src/anim/clips/keyed/jog';
import { KEYED_IDLE } from '../src/anim/clips/keyed/idle';
import { KEY_CLIPS } from '../src/anim/tuneKeysMeta';
import { applyKeyEdits, editedClips, expandMirror, KEY_FIELDS, keyBlendAt, keyEditPlan, keyFileText, keyGroupId, keyMetaText, keyMirrorGroupId, keyValuesOf, readKeys, type KeyFile } from '../src/anim/tuneKeysFile';
import { tuneKeysAdd, tuneKeysClipValues, tuneKeysDelete, tuneKeysEditInfo, tuneKeysFilesReady, tuneKeysMirror, tuneKeysRetime, tuneKeysSync, tuneKeysTimeInfo } from '../src/anim/tuneKeys';
import { keyClip, keyCount, keyPhase, keyReadout, keyStep } from '../src/anim/keyTimeline';
import { KEY_SPAN, keyTimeSolve } from '../src/anim/tuneKeysTime';
import { KEY_ADD_SLOTS, KEY_AT_ID, KEY_DEL_ID, KEY_LIVE, keyAddedGroupId, keyInsertPos, keyKnotsAt, keyLiveSolve, newKeyLive, parseKeyAdded } from '../src/anim/tuneKeysEdit';
import { TUNE_EXPORT_MAGIC, tuneExport, tuneGet, tuneImport, tuneLoad, tuneResetAll, tuneSet, tuneSnapshot } from '../src/anim/tuneRegistry';
import { tuneApplyValues, tuneValues } from '../src/anim/tuneHistory';
import { bakeCatalogue, tuneBake } from '../src/anim/tuneBake';

const DIR = path.join(__dirname, '..', 'scripts', 'anim-keys', 'keys');
const text = (n: string): string => readFileSync(path.join(DIR, `${n}.json`), 'utf8');
const file = (n: string): KeyFile => JSON.parse(text(n)) as KeyFile;

const JOG = { phases: [0, 0.125, 0.25, 0.375], mirror: true };
const FULL = { phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875], mirror: false };
const NONE = new Array<number>(8).fill(0);
const slots = (...at: number[]): number[] => [...at, ...NONE].slice(0, KEY_ADD_SLOTS);

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
const maxDiff = (a: number[], b: number[]): number => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i]!)), 0);

/** The bake's linear key read (key_clip.py `lerp_key`) of the KEY_FIELDS at bake frame p, over every key the bake poses. */
function lerpKey(f: KeyFile, p: number): number[] {
  const keys = readKeys(f);
  const pos = keys.map((k) => Math.round(k.phase * KEY_SPAN) % KEY_SPAN);
  const vals = keys.flatMap((k) => k.v);
  const out: number[] = [];
  keyKnotsAt(pos, vals, keys.length, KEY_FIELDS.length, p, out);
  return out;
}

afterEach(() => {
  tuneResetAll();
  tuneKeysSync();
});

describe('item 25: the live key list (pure)', () => {
  it('Mirror on: an added key sits in the own half and gets its mirror; a delete takes its mirror; key 1 stays', () => {
    const pos: number[] = [];
    keyTimeSolve(JOG, NONE, true, pos);
    const live = newKeyLive(8);
    expect(keyLiveSolve(JOG, pos, true, NONE, NONE, live)).toBe(false);
    expect(Array.from(live.ids.slice(0, live.n))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(keyLiveSolve(JOG, pos, true, NONE, slots(9), live)).toBe(true);
    expect(live.n).toBe(10);
    expect(Array.from(live.pos.slice(0, live.n))).toEqual([0, 6, 9, 12, 18, 24, 30, 33, 36, 42]);
    expect(live.at[8]).toBe(9);
    expect(live.at[8 + KEY_ADD_SLOTS]).toBe(33); // its mirror
    // delete key 2 (own index 1): its mirror (index 5) goes too; the first key never
    expect(keyLiveSolve(JOG, pos, true, [1, 1, 0, 0, 0, 0, 0, 0], NONE, live)).toBe(true);
    expect(Array.from(live.ids.slice(0, live.n))).toEqual([0, 2, 3, 4, 6, 7]);
    // an added key out of the own half, on a key, or twice on one place: not placed
    keyLiveSolve(JOG, pos, true, NONE, slots(30, 12, 9, 9), live);
    expect(Array.from(live.at.slice(8, 12))).toEqual([-1, -1, 9, -1]);
  });

  it('Mirror off: every key on its own in the full cycle; the minimum keeps 4 keys (2 own keys with Mirror on)', () => {
    const pos: number[] = [];
    keyTimeSolve(JOG, NONE, false, pos);
    const live = newKeyLive(8);
    keyLiveSolve(JOG, pos, false, [0, 0, 0, 0, 0, 1, 0, 0], slots(40), live);
    expect(Array.from(live.ids.slice(0, live.n))).toEqual([0, 1, 2, 3, 4, 6, 8, 7]);
    expect(live.at[8 + KEY_ADD_SLOTS]).toBe(-1); // no mirror copy
    // the mirror of the first key (index 4) can go with the box off
    keyLiveSolve(JOG, pos, false, [0, 0, 0, 0, 1, 0, 0, 0], NONE, live);
    expect(live.dead[4]).toBe(1);
    // the minimum: with the box on, 2 own keys stay (the later deletes are ignored)
    keyTimeSolve(JOG, NONE, true, pos);
    keyLiveSolve(JOG, pos, true, [0, 1, 1, 1, 0, 0, 0, 0], NONE, live);
    expect(live.n).toBe(4);
    expect(Array.from(live.dead)).toEqual([0, 1, 1, 0, 0, 1, 1, 0]);
    // a clip keyed in full: at least 4
    keyTimeSolve(FULL, NONE, true, pos);
    keyLiveSolve(FULL, pos, true, [0, 1, 1, 1, 1, 1, 1, 1], NONE, live);
    expect(live.n).toBe(4);
  });

  it('insert: midway to the next key, wrapping to the cycle end; the own half with Mirror on; never on a key', () => {
    const pos: number[] = [];
    keyTimeSolve(JOG, NONE, true, pos);
    const live = newKeyLive(8);
    keyLiveSolve(JOG, pos, true, NONE, NONE, live);
    expect(keyInsertPos(JOG, live, pos, 1)).toBe(9);
    expect(keyInsertPos(JOG, live, pos, 3)).toBe(21); // before the mirror of key 1 (24)
    expect(keyInsertPos(JOG, live, pos, 7)).toBe(21); // a mirrored key: its own key's place
    keyTimeSolve(JOG, NONE, false, pos);
    keyLiveSolve(JOG, pos, false, NONE, NONE, live);
    expect(keyInsertPos(JOG, live, pos, 7)).toBe(45); // Mirror off: wraps to the cycle end
    // a deleted key's place is skipped (it stays a knot of the clip as baked)
    keyTimeSolve(FULL, NONE, false, pos);
    keyLiveSolve(FULL, pos, false, [0, 0, 1, 0, 0, 0, 0, 0], NONE, live);
    expect(keyInsertPos(FULL, live, pos, 1)).toBe(11); // 6 .. 18: 12 is key 3's (deleted) place
    // no room: keys one frame apart
    keyTimeSolve(FULL, [0, 0, 0, 0, 0, 0, 0, 0], false, pos);
    keyLiveSolve(FULL, pos, false, NONE, slots(7), live);
    expect(keyInsertPos(FULL, live, pos, 8)).toBe(9); // after an added key (7) to the next (12)
    keyLiveSolve(FULL, [0, 1, 12, 18, 24, 30, 36, 42], false, NONE, NONE, live);
    expect(keyInsertPos(FULL, live, [0, 1, 12, 18, 24, 30, 36, 42], 0)).toBe(-1);
  });

  it('retime + insert: the insert follows the retimed keys', () => {
    const pos: number[] = [];
    keyTimeSolve(JOG, [0, 3, 0, 0], true, pos); // key 2 at 9
    const live = newKeyLive(8);
    keyLiveSolve(JOG, pos, true, NONE, NONE, live);
    expect(keyInsertPos(JOG, live, pos, 1)).toBe(10); // 9 .. 12
    expect(keyInsertPos(JOG, live, pos, 0)).toBe(4); // 0 .. 9
    expect(parseKeyAdded('key.jog.a3')).toEqual(['jog', 3]);
    expect(parseKeyAdded('key.jog.a8')).toBeNull();
    expect(parseKeyAdded('key.jog.3')).toBeNull();
  });
});

describe('item 25: the key file', () => {
  it('an added key is the blended pose the bake samples there (every key field); its deltas add on', () => {
    for (const name of ['jog', 'walk', 'idle', 'hold_knife']) {
      const f = file(name);
      for (const p of [1, 3, 9, 21, 45]) {
        const k = keyBlendAt(expandMirror(f).keys, p);
        const v = readKeys({ ...f, mirror: false, keys: [k] })[0]!.v;
        const want = lerpKey(f, p);
        for (let j = 0; j < v.length; j++) expect(v[j]).toBeCloseTo(want[j]!, 2);
      }
    }
  });

  it('Mirror on: the insert keeps the file mirrored (one more own key, phase order); a delete removes the own key', () => {
    const f = file('jog');
    const vals = { [keyAddedGroupId('jog', 0)]: { at: 9, armL_elbow: 5 } };
    expect(editedClips(vals)).toEqual(['jog']);
    const out = applyKeyEdits(f, vals);
    expect(out.mirror).toBe(true);
    expect(out.keys.map((k) => k.phase)).toEqual([0, 0.125, 9 / 48, 0.25, 0.375]);
    const v = readKeys({ ...out, mirror: false, keys: [out.keys[2]!] })[0]!.v;
    const want = lerpKey(f, 9);
    const el = KEY_FIELDS.findIndex((x) => x.id === 'armL_elbow');
    for (let j = 0; j < v.length; j++) expect(v[j]).toBeCloseTo(want[j]! + (j === el ? 5 : 0), 2);
    // the legs (not a key field) are blended too, so every field flows in
    const legFlex = (k: Record<string, unknown> | undefined): number => (k?.legL as Record<string, number>).flex!;
    expect(legFlex(out.keys[2])).toBeCloseTo((legFlex(f.keys[1]) + legFlex(f.keys[2])) / 2, 2);
    // the other keys exactly as they were
    expect([out.keys[0], out.keys[1], out.keys[3], out.keys[4]]).toEqual(f.keys);
    const del = applyKeyEdits(f, { [keyGroupId('jog', 2)]: { del: 1 } });
    expect(del.mirror).toBe(true);
    expect(del.keys).toEqual([f.keys[0], f.keys[1], f.keys[3]]);
    // the meta the tuner reads
    expect(keyMetaText([out])).toContain("{ name: 'jog', frames: 32, mirror: true, phases: [0, 0.125, 0.1875, 0.25, 0.375] },");
  });

  it('Mirror off: written in full, every key its own; the first key is never deleted', () => {
    const f = file('jog');
    const out = applyKeyEdits(f, { [keyMirrorGroupId('jog')]: { mirror: 0 }, [keyAddedGroupId('jog', 0)]: { at: 39 }, [keyGroupId('jog', 5)]: { del: 1 }, [keyGroupId('jog', 0)]: { del: 1 } });
    expect(out.mirror).toBe(false);
    expect(out.keys.map((k) => k.phase)).toEqual([0, 0.125, 0.25, 0.375, 0.5, 0.75, 39 / 48, 0.875]);
    const plan = keyEditPlan(f, { [keyMirrorGroupId('jog')]: { mirror: 0 }, [keyGroupId('jog', 5)]: { del: 1 } });
    expect(plan.full).toBe(true);
    expect(Array.from(plan.live.dead)).toEqual([0, 0, 0, 0, 0, 1, 0, 0]);
  });

  it('retime + insert + delete in one export: the times first, the added key on the retimed keys', () => {
    const f = file('jog');
    const out = applyKeyEdits(f, { [keyGroupId('jog', 1)]: { time: 3 }, [keyAddedGroupId('jog', 0)]: { at: 10 }, [keyGroupId('jog', 3)]: { del: 1 } });
    expect(out.keys.map((k) => k.phase)).toEqual([0, 9 / 48, 10 / 48, 0.25]);
  });

  it('no add / delete: every key file byte for byte; a literal old key file and a literal old export unchanged', () => {
    for (const c of KEY_CLIPS) expect(keyFileText(applyKeyEdits(file(c.name), { [keyGroupId(c.name, 1)]: { del: 0 }, [keyAddedGroupId(c.name, 0)]: { at: 0 } }))).toBe(text(c.name));
    const OLD_FILE: KeyFile = { name: 'walk', mirror: true, keys: [{ phase: 0, spine: { pitch: 2 } }, { phase: 0.125, spine: { pitch: 3 } }, { phase: 0.25 }, { phase: 0.375 }] };
    expect(applyKeyEdits(OLD_FILE, {})).toEqual(OLD_FILE);
    const add = applyKeyEdits(OLD_FILE, { 'key.walk.a0': { at: 3 } });
    expect(add.keys[1]).toEqual({ phase: 3 / 48, spine: { pitch: 2.5 } });
    // an export from before item 25 (version 2): its key values carry no del / at
    const OLD_EXPORT = { magic: TUNE_EXPORT_MAGIC, version: 2, changed: [{ group: 'key.jog.1', id: 'time', value: 2 }, { group: 'key.jog.2', id: 'armL_elbow', value: 4 }], log: [] };
    const vals = keyValuesOf(OLD_EXPORT);
    expect(keyEditPlan(file('jog'), vals).live.edited).toBe(false);
    expect(applyKeyEdits(file('jog'), vals).keys.length).toBe(4);
  });
});

describe('item 25: the live preview, undo, the store', () => {
  it('add: one more key (its mirror too), the pose unchanged (bit for bit with no other edit); delete it: as before', () => {
    const base = sweep(KEYED_JOG);
    const idle = sweep(KEYED_IDLE);
    const jog = keyClip('jog')!;
    expect(keyCount(jog)).toBe(8);
    const id = tuneKeysAdd('jog', 1);
    expect(id).toBe(8);
    expect(tuneGet(keyAddedGroupId('jog', 0), KEY_AT_ID)).toBe(9);
    expect(keyCount(jog)).toBe(10);
    expect(keyPhase(jog, id)).toBe(9 / 48);
    expect(keyReadout(jog, id)).toBe('jog - key 3 of 10 (mirror of 8) (added), frame 6');
    expect(keyReadout(jog, 2)).toBe('jog - key 4 of 10 (mirror of 9), frame 8');
    expect(keyStep(jog, 0.125, 1)).toBe(8);
    expect(KEYED_JOG.keyOff).toBeNull();
    expect(sweep(KEYED_JOG)).toEqual(base);
    expect(sweep(KEYED_IDLE)).toEqual(idle);
    // its sliders edit the new key: the pose moves at its time only (and its mirror)
    const at0 = pose(KEYED_JOG, 0);
    const at9 = pose(KEYED_JOG, 9 / 48);
    tuneSet(keyAddedGroupId('jog', 0), 'chest_yaw', 6);
    tuneKeysSync();
    expect(KEYED_JOG.keyOff).not.toBeNull();
    expect(maxDiff(pose(KEYED_JOG, 0), at0)).toBeLessThan(1e-6); // key 1: no offset
    expect(maxDiff(pose(KEYED_JOG, 9 / 48), at9)).toBeGreaterThan(1e-3);
    expect(tuneKeysDelete('jog', id)).toBe(true);
    expect(keyCount(jog)).toBe(8);
    expect(KEY_LIVE.size).toBe(0);
    expect(sweep(KEYED_JOG)).toEqual(base);
  });

  it('add between edited keys: the pose at the new key stays (its deltas copy the blended offset)', () => {
    tuneSet(keyGroupId('jog', 1), 'armL_elbow', 20);
    tuneSet(keyGroupId('jog', 2), 'spine_pitch', -8);
    tuneKeysSync();
    const before = [0.1, 9 / 48, 0.22, 0.7].map((p) => pose(KEYED_JOG, p));
    const id = tuneKeysAdd('jog', 1);
    expect(id).toBe(8);
    expect(tuneGet(keyAddedGroupId('jog', 0), 'armL_elbow')).toBeCloseTo(10, 6);
    expect(tuneGet(keyAddedGroupId('jog', 0), 'spine_pitch')).toBeCloseTo(-4, 6);
    const after = [0.1, 9 / 48, 0.22, 0.7].map((p) => pose(KEYED_JOG, p));
    for (let i = 0; i < before.length; i++) expect(maxDiff(before[i]!, after[i]!)).toBeLessThan(1e-5);
  });

  it('delete: never key 1, never below the minimum; the deleted key takes its neighbours\' blend; undo brings it back', async () => {
    const base = sweep(KEYED_JOG);
    const jog = keyClip('jog')!;
    expect(tuneKeysDelete('jog', 0)).toBe(false);
    expect(tuneKeysDelete('jog', 4)).toBe(false); // the mirror of key 1 (Mirror on)
    expect(tuneKeysEditInfo('jog', 0)!.delWhy).toMatch(/never deleted/);
    const before = tuneValues();
    const p25 = pose(KEYED_JOG, 0.25);
    const p125 = pose(KEYED_JOG, 0.125);
    expect(tuneKeysDelete('jog', 2)).toBe(true);
    expect(tuneGet(keyGroupId('jog', 2), KEY_DEL_ID)).toBe(1);
    await tuneKeysFilesReady();
    tuneKeysSync();
    expect(keyCount(jog)).toBe(6);
    expect(KEYED_JOG.keyOff).not.toBeNull();
    // at the deleted key's time the pose is now its neighbours' blend (it moved); a kept key does not move
    expect(maxDiff(pose(KEYED_JOG, 0.25), p25)).toBeGreaterThan(1e-3);
    expect(maxDiff(pose(KEYED_JOG, 0.125), p125)).toBeLessThan(1e-6);
    tuneApplyValues(before);
    tuneKeysSync();
    expect(keyCount(jog)).toBe(8);
    expect(sweep(KEYED_JOG)).toEqual(base); // undo: bit for bit
    // the minimum: 2 own keys with Mirror on
    expect(tuneKeysDelete('jog', 1)).toBe(true);
    expect(tuneKeysDelete('jog', 2)).toBe(true);
    expect(keyCount(jog)).toBe(4);
    expect(tuneKeysDelete('jog', 3)).toBe(false);
    expect(tuneKeysEditInfo('jog', 3)!.delWhy).toMatch(/at least 4/);
  });

  it('Mirror off after an add / delete: the mirror half gets its own added key and delete (nothing jumps)', async () => {
    tuneKeysAdd('jog', 1);
    tuneKeysDelete('jog', 3);
    await tuneKeysFilesReady();
    tuneKeysSync();
    const before = [0.05, 0.3, 33 / 48, 0.9].map((p) => pose(KEYED_JOG, p));
    expect(tuneKeysMirror('jog', false)).toBe(true);
    expect(tuneGet(keyGroupId('jog', 7), KEY_DEL_ID)).toBe(1);
    expect(tuneGet(keyAddedGroupId('jog', 1), KEY_AT_ID)).toBe(33);
    expect(keyCount(keyClip('jog')!)).toBe(8);
    const after = [0.05, 0.3, 33 / 48, 0.9].map((p) => pose(KEYED_JOG, p));
    for (let i = 0; i < before.length; i++) expect(maxDiff(before[i]!, after[i]!)).toBeLessThan(1e-5);
  });

  it('retime + insert: the retimed key stays before the added key; the added key moves between its neighbours', () => {
    expect(tuneKeysRetime('jog', 1, 3)).toBe(true); // 9
    const id = tuneKeysAdd('jog', 1);
    expect(tuneGet(keyAddedGroupId('jog', 0), KEY_AT_ID)).toBe(10);
    expect(tuneKeysTimeInfo('jog', 1)).toMatchObject({ pos: 9, lo: 1, hi: 9 });
    expect(tuneKeysRetime('jog', 1, 1)).toBe(false);
    expect(tuneKeysTimeInfo('jog', id)).toMatchObject({ pos: 10, lo: 10, hi: 11, added: true, partner: id + KEY_ADD_SLOTS });
    expect(tuneKeysRetime('jog', id, 5)).toBe(true);
    expect(tuneGet(keyAddedGroupId('jog', 0), KEY_AT_ID)).toBe(11);
    // its mirror moves it too
    expect(tuneKeysRetime('jog', id + KEY_ADD_SLOTS, -1)).toBe(true);
    expect(tuneGet(keyAddedGroupId('jog', 0), KEY_AT_ID)).toBe(10);
  });

  it('a literal old store (no del / at) loads with no key added or deleted; an add rides the save and the export', () => {
    const OLD_STORE = {
      version: 2,
      values: { 'key.jog.1': { armL_elbow: 10, time: 2 }, 'key.walk.mirror': { mirror: 0 } },
      log: [{ t: '2026-10-21T09:00:00.000Z', group: 'key.jog.1', id: 'armL_elbow', from: 0, to: 10 }],
    };
    tuneLoad(OLD_STORE);
    tuneKeysSync();
    expect(KEY_LIVE.size).toBe(0);
    expect(keyCount(keyClip('jog')!)).toBe(8);
    tuneKeysAdd('jog', 2);
    tuneKeysDelete('jog', 3);
    const snap = JSON.parse(JSON.stringify(tuneSnapshot())) as { values: Record<string, Record<string, number>> };
    expect(snap.values['key.jog.a0']!.at).toBe(15);
    expect(snap.values['key.jog.3']).toEqual({ del: 1 });
    const exp = JSON.parse(JSON.stringify(tuneExport())) as unknown;
    expect(tuneKeysClipValues('jog')['key.jog.3']).toEqual({ del: 1 });
    tuneResetAll();
    tuneKeysSync();
    expect(KEY_LIVE.size).toBe(0);
    tuneLoad(snap);
    tuneKeysSync();
    expect(keyCount(keyClip('jog')!)).toBe(8); // + 2 added, - 2 deleted
    expect(KEY_LIVE.has('jog')).toBe(true);
    tuneResetAll();
    const r = tuneImport(exp, 'exp');
    expect(r.ok).toBe(true);
    tuneKeysSync();
    expect(KEY_LIVE.has('jog')).toBe(true);
    const out = applyKeyEdits(file('jog'), keyValuesOf(exp));
    expect(out.keys.map((k) => k.phase)).toEqual([0, 8 / 48, 0.25, 15 / 48]);
  });
});

// (item 25, track A) The in-app bake (src/anim/tuneBake.ts): an add and a delete rewrite the key file and the meta; an
// export with no add / delete bakes as before. Reads the real tree only (nothing written).
describe('add / delete keys: the bake (tuneBake)', () => {
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
  const exp = (changed: unknown[]) => ({ magic: 'night-shift-anim-tune', version: 2, exported: '2026-10-21T21:00:00.000Z', changed, log: [] });

  it('a literal export with an added and a deleted key: the key file, the meta, the rebake command', () => {
    const r = tuneBake(exp([{ group: 'key.jog.a0', id: 'at', value: 9 }, { group: 'key.jog.a0', id: 'chest_yaw', value: 2 }, { group: 'key.jog.3', id: 'del', value: 1 }, { group: 'key.jog.0', id: 'del', value: 1 }]), CAT, read);
    expect(r.ok, r.error).toBe(true);
    expect(r.rows.find((x) => x.group === 'key.jog.a0' && x.id === 'at')!.result).toBe('baked (key added to the key JSON; rebake the clip)');
    expect(r.rows.find((x) => x.group === 'key.jog.3')!.result).toBe('baked (key removed from the key JSON; rebake the clip)');
    expect(r.rows.find((x) => x.group === 'key.jog.0')!.result).toBe('skipped: the first key is never deleted');
    const w = r.writes.find((x) => x.path === 'scripts/anim-keys/keys/jog.json')!;
    expect((JSON.parse(w.after) as KeyFile).keys.map((k) => k.phase)).toEqual([0, 0.125, 9 / 48, 0.25]);
    expect(w.after).toBe(keyFileText(applyKeyEdits(file('jog'), { 'key.jog.a0': { at: 9, chest_yaw: 2 }, 'key.jog.3': { del: 1 }, 'key.jog.0': { del: 1 } })));
    expect(r.writes.find((x) => x.path === META)!.after).toContain("{ name: 'jog', frames: 32, mirror: true, phases: [0, 0.125, 0.1875, 0.25] },");
    expect(r.rebake.some((c) => c.endsWith('build.mjs jog'))).toBe(true);
  });

  it('(fix round) Mirror off with the halves edited apart and no time edit: the full write regenerates the meta', () => {
    const r = tuneBake(exp([{ group: 'key.jog.mirror', id: 'mirror', value: 0 }, { group: 'key.jog.5', id: 'armR_elbow', value: 4 }]), CAT, read);
    expect(r.ok, r.error).toBe(true);
    const w = r.writes.find((x) => x.path === 'scripts/anim-keys/keys/jog.json')!;
    expect((JSON.parse(w.after) as KeyFile).mirror).toBe(false);
    expect(r.writes.find((x) => x.path === META)?.after).toContain("{ name: 'jog', frames: 32, mirror: false, phases: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] },");
  });

  it('(fix round) a refused delete (the first key, Mirror off) forces no full write and writes no key file or meta', () => {
    const vals: Record<string, Record<string, number>> = { [keyMirrorGroupId('jog')]: { mirror: 0 }, [keyGroupId('jog', 0)]: { del: 1 } };
    expect(keyEditPlan(file('jog'), vals).full).toBe(false);
    expect(keyFileText(applyKeyEdits(file('jog'), vals))).toBe(text('jog'));
    const r = tuneBake(exp([{ group: 'key.jog.mirror', id: 'mirror', value: 0 }, { group: 'key.jog.0', id: 'del', value: 1 }]), CAT, read);
    expect(r.ok, r.error).toBe(true);
    expect(r.rows.find((x) => x.group === 'key.jog.0')!.result).toBe('skipped: the first key is never deleted');
    expect(r.writes.filter((x) => x.path.startsWith('scripts/anim-keys/keys/') || x.path === META)).toEqual([]);
  });

  it('an export with no add / delete bakes as before: no meta write, the key count kept', () => {
    const r = tuneBake(exp([{ group: 'key.jog.2', id: 'chest_yaw', value: 2.5 }, { group: 'key.jog.2', id: 'del', value: 0 }]), CAT, read);
    expect(r.ok, r.error).toBe(true);
    expect(r.writes.map((x) => x.path)).not.toContain(META);
    const w = r.writes.find((x) => x.path === 'scripts/anim-keys/keys/jog.json')!;
    expect((JSON.parse(w.after) as KeyFile).keys.length).toBe(4);
    expect(w.after).toBe(keyFileText(applyKeyEdits(file('jog'), { 'key.jog.2': { chest_yaw: 2.5 } })));
  });
});
