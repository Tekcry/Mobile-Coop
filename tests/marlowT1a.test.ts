// (marlow-bays slice T1a) The Keys tab's new fields (item 17), the Mirror box (item 18), the key timeline and the
// chamber's key requests (items 15-16), the aim stances and the gun pick (item 19), the shared rows' own rows and their
// migration (COVERAGE gap 3), the drawn set's edit channel (gap 4), the right stick's flicks and the plain names.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import '../src/player/speedTune';
import '../src/player/weightTune';
import '../src/anim/moveTune';
import { clearKeyedArms, keyedClip, KE, KW, mirrorKeyed, mixKeyed, newKeyedPose, sampleKeyed, type KeyedPose } from '../src/anim/keyed';
import { KEYED_WALK } from '../src/anim/clips/keyed/walk';
import { KEYED_READY_STANCE } from '../src/anim/clips/keyed/ready_stance';
import { applyKeyEdits, expandMirror, KEY_FIELDS, keyFileText, keyGroupId, keyMirrorGroupId, keyValuesOf, mirrorDelta, readKeys, type KeyFile } from '../src/anim/tuneKeysFile';
import { KEYS_SECTION, keyedClipByName, tuneKeysMirror, tuneKeysMirrorOn, tuneKeysSync } from '../src/anim/tuneKeys';
import { keyClip, keyCount, keyMirrorOf, keyNearest, keyPhase, keyReadout, keyStep } from '../src/anim/keyTimeline';
import { BODY_GROUPS, selectBodyGroup } from '../src/anim/tune';
import { HAND_WEAPONS } from '../src/anim/tuneHands';
import { ARMED_JOINT_STATES, BODY_ROW_FROM, JOINT_GUNS, migrateTuneChanged, migrateTuneRows, ROW_WEAPONS, TUNE_ROWS_VERSION } from '../src/anim/tuneRows';
import { TUNE_EXPORT_MAGIC, tuneExport, tuneGet, tuneImport, tuneLoad, tuneResetAll, tuneSet, tuneSnapshot } from '../src/anim/tuneRegistry';
import { JOINT_ROWS, jointsGet } from '../src/anim/tuneJoints';
import { JOINT_GROUP_IDS, tuneV2Frame, tuneV2JointRow } from '../src/anim/tuneV2Sections';
import { presetFile, presetParse } from '../src/anim/tuneHistory';
import { CHAMBER, CHAMBER_ENTRIES, chamberEntry, chamberInput, chamberKeyInfo, chamberKeyPhase, chamberReset, chamberWeaponFor } from '../src/anim/chamber';
import { tuneBake, bakeCatalogue } from '../src/anim/tuneBake';
import { BAKE_KEYS_DIR } from '../src/anim/tuneBakeTable';
import { bodyCarry, loopGroups, plainGroupWord, plainLabel } from '../src/ui/tunerLayout';
import { tuneTarget } from '../src/ui/tunerTarget';
import { bindable } from '../src/input/keyBindings';
import { TUNER_KEY_BACK, TUNER_KEY_FWD, TUNER_PLAY_KEY } from '../src/ui/tunerMouse';

const ROOT = path.join(__dirname, '..');
const qAngle = (a: ArrayLike<number>, sa: number, b: ArrayLike<number>, sb: number): number => {
  const d = Math.abs(a[sa]! * b[sb]! + a[sa + 1]! * b[sb + 1]! + a[sa + 2]! * b[sb + 2]! + a[sa + 3]! * b[sb + 3]!);
  return (2 * Math.acos(Math.min(1, d)) * 180) / Math.PI;
};
const ID = [0, 0, 0, 1];

/** Every channel of a clip, the new ones included, over a cycle. */
function sweep(clipName: string): number[] {
  const c = keyedClipByName(clipName)!;
  const p = newKeyedPose();
  const out: number[] = [];
  for (let i = 0; i < c.frames * 2; i++) {
    sampleKeyed(c, i / (c.frames * 2), 1, p);
    out.push(...p.pel, ...p.q, ...p.arm, ...p.wrist, ...p.fore, ...p.head, ...p.sh, ...p.ed, p.hasFore, p.hasHead, p.hasSh, p.edOn);
  }
  return out;
}

afterEach(() => {
  tuneResetAll();
  tuneKeysSync();
  chamberReset();
});

/** A key file as written before T1a (no head, shoulder, twists): a literal, mirrored, two keys. */
const OLD_KEY_FILE: KeyFile = {
  name: 'walk',
  mirror: true,
  frames: 32,
  keys: [
    { phase: 0, pelvis: { dx: 0, dy: -1, dz: 0, yaw: 2, pitch: 1, roll: 0 }, spine: { yaw: 1, pitch: 2, roll: 0 }, chest: { yaw: -2, pitch: 2, roll: 0 }, neck: { yaw: 0, pitch: 1, roll: 0 }, armL: { flex: -10, abd: 5, elbow: 20, inward: 5 }, armR: { flex: 15, abd: 5, elbow: 25, inward: 6 }, legL: { flex: 20, add: 2, knee: 10, ankle: 0 }, legR: { flex: -15, add: 2, knee: 40, ankle: -10 } },
    { phase: 0.25, pelvis: { dx: 1, dy: 0, dz: 0, yaw: 0, pitch: 1, roll: 1 }, spine: { yaw: 0, pitch: 2, roll: 0 }, chest: { yaw: 0, pitch: 2, roll: 0 }, neck: { yaw: 0, pitch: 1, roll: 0 }, armL: { flex: 0, abd: 5, elbow: 22, inward: 5 }, armR: { flex: 0, abd: 5, elbow: 22, inward: 5 }, legL: { flex: 0, add: 2, knee: 5, ankle: 0 }, legR: { flex: 0, add: 2, knee: 60, ankle: 0 } },
  ],
};

describe('T1a item 17: the new key fields', () => {
  it('a key file from before T1a reads every new field as 0, and an edit writes them where the bake reads them', () => {
    const F = (id: string): number => KEY_FIELDS.findIndex((f) => f.id === id);
    const r = readKeys(OLD_KEY_FILE);
    expect(r).toHaveLength(4);
    for (const id of ['head_pitch', 'head_yaw', 'armL_twist', 'armR_twistUpper', 'armL_shPitch', 'armR_shRoll']) for (const k of r) expect(k.v[F(id)], id).toBe(0);
    // the old fields are read as before (the mirrored half: dx negated)
    expect(r[1]!.v[F('pelvis_dx')]).toBe(1);
    expect(r[3]!.v[F('pelvis_dx')]).toBe(-1);
    // no edits: the file unchanged
    expect(keyFileText(applyKeyEdits(OLD_KEY_FILE, {}))).toBe(keyFileText(OLD_KEY_FILE));
    const out = applyKeyEdits(OLD_KEY_FILE, { 'key.walk.0': { armL_twist: 30, armR_shPitch: 10, head_yaw: -5, pelvis_dz: 1.5, armR_twistUpper: 12 } });
    const k0 = out.keys[0] as Record<string, Record<string, unknown>>;
    expect(k0.armL!.twist).toBe(30);
    expect(k0.armR!.sh).toEqual({ yaw: 0, pitch: 10, roll: 0 });
    expect(k0.armR!.twistUpper).toBe(12);
    expect(k0.head).toEqual({ yaw: -5 });
    expect(k0.pelvis!.dz).toBe(1.5);
    expect(out.keys[1]).toEqual(OLD_KEY_FILE.keys[1]);
    // the mirrored half as the bake poses it: the arms swapped, the head yaw negated
    const ro = readKeys(out);
    expect(ro[2]!.v[F('armR_twist')]).toBe(30);
    expect(ro[2]!.v[F('armL_shPitch')]).toBe(10);
    expect(ro[2]!.v[F('head_yaw')]).toBe(5);
  });

  it('the live preview turns the forearm about the bone, the head, the shoulder; shifts the pelvis; twists the upper arm', () => {
    const base = newKeyedPose();
    const p = newKeyedPose();
    sampleKeyed(KEYED_WALK, 0, 1, base);
    expect(base.hasFore + base.hasHead + base.hasSh).toBe(0);
    tuneSet(keyGroupId('walk', 0), 'armR_twist', 40);
    tuneSet(keyGroupId('walk', 0), 'head_pitch', 10);
    tuneSet(keyGroupId('walk', 0), 'armL_shPitch', 15);
    tuneSet(keyGroupId('walk', 0), 'pelvis_dy', 2);
    tuneSet(keyGroupId('walk', 0), 'armR_twistUpper', 25);
    tuneKeysSync();
    sampleKeyed(KEYED_WALK, 0, 1, p);
    expect(p.hasFore).toBe(1);
    expect(qAngle(ID, 0, p.fore, KW.wristR)).toBeCloseTo(40, 3);
    // about the bone: the elbow node's y only
    expect(Math.abs(p.fore[KW.wristR]!) + Math.abs(p.fore[KW.wristR + 2]!)).toBeLessThan(1e-6);
    expect(qAngle(ID, 0, p.fore, KW.wristL)).toBeLessThan(1e-4);
    expect(p.hasHead).toBe(1);
    expect(qAngle(ID, 0, p.head, 0)).toBeCloseTo(10, 3);
    expect(p.hasSh).toBe(1);
    expect(qAngle(ID, 0, p.sh, KW.wristL)).toBeCloseTo(15, 3);
    expect(p.pel[1]! - base.pel[1]!).toBeCloseTo((0.02 * 1.75) / 1.68, 6);
    // the upper arm twist: the elbow point stays, the wrist turns 25 deg about the shoulder-elbow line
    expect([...p.arm.slice(6, 9)].map((v, i) => v - base.arm[6 + i]!).every((d) => Math.abs(d) < 1e-9)).toBe(true);
    const e = [base.arm[6]!, base.arm[7]!, base.arm[8]!];
    const proj = (a: Float64Array): number[] => {
      const v = [a[9]! - a[6]!, a[10]! - a[7]!, a[11]! - a[8]!];
      const l = Math.hypot(...e);
      const k = e.map((x) => x / l);
      const d = v[0]! * k[0]! + v[1]! * k[1]! + v[2]! * k[2]!;
      return v.map((x, i) => x - d * k[i]!);
    };
    const a = proj(base.arm);
    const b = proj(p.arm);
    const ang = (Math.acos((a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!) / (Math.hypot(...a) * Math.hypot(...b))) * 180) / Math.PI;
    expect(ang).toBeCloseTo(25, 1);
    // the edit channel carries the twist for the drawn set
    expect(p.edOn).toBe(1);
    expect(p.ed[KE.twist + 1]).toBeCloseTo((25 * Math.PI) / 180, 6);
  });

  it('identity: no edits, every channel bit-identical, also after a reset', () => {
    const b = sweep('jog');
    tuneSet(keyGroupId('jog', 1), 'armL_twist', 20);
    tuneSet(keyGroupId('jog', 2), 'head_roll', 4);
    tuneKeysSync();
    expect(sweep('jog')).not.toEqual(b);
    tuneSet(keyGroupId('jog', 1), 'armL_twist', 0);
    tuneSet(keyGroupId('jog', 2), 'head_roll', 0);
    tuneKeysSync();
    expect(keyedClipByName('jog')!.keyOff).toBeNull();
    expect(sweep('jog')).toEqual(b);
  });

  it('a clip with baked fore / head / sh channels samples them; mirror swaps them; mix keeps a pose\'s arms with edits off', () => {
    const N = 2;
    const q = (yawDeg: number): number[] => [0, Math.sin((yawDeg * Math.PI) / 360), 0, Math.cos((yawDeg * Math.PI) / 360)];
    const def = {
      name: 't1a_test',
      frames: N,
      duty: 0.6,
      liftH: 0.1,
      kneeOut: 0,
      half: 0.05,
      pel: new Array(N * 3).fill(0),
      q: Array.from({ length: N * 4 }, () => ID).flat(),
      arm: new Array(N * 12).fill(0),
      fore: Array.from({ length: N }, () => [...ID, ...q(30)]).flat(),
      head: Array.from({ length: N }, () => q(10)).flat(),
      sh: Array.from({ length: N }, () => [...q(5), ...ID]).flat(),
    };
    const c = keyedClip(def);
    const p = newKeyedPose();
    sampleKeyed(c, 0.3, 1, p);
    expect(p.hasFore && p.hasHead && p.hasSh).toBe(1);
    expect(qAngle(ID, 0, p.fore, KW.wristR)).toBeCloseTo(30, 3);
    mirrorKeyed(p);
    expect(qAngle(ID, 0, p.fore, KW.wristL)).toBeCloseTo(30, 3);
    expect(p.fore[KW.wristL + 1]).toBeLessThan(0); // reflected: the yaw negated
    const a = newKeyedPose();
    sampleKeyed(KEYED_WALK, 0, 1, a);
    const out = newKeyedPose();
    mixKeyed(a, p, 1, out, false);
    expect(out.hasFore).toBe(0);
    expect(out.hasHead).toBe(1);
    clearKeyedArms(p);
    expect(p.hasFore + p.hasSh + p.edOn).toBe(0);
  });
});

describe('T1a item 18: the Mirror box', () => {
  it('a mirrored clip has its mirrored half and a Mirror box (on by default); a full clip has none', () => {
    expect(KEYS_SECTION.groups).toContain(keyGroupId('jog', 7));
    expect(KEYS_SECTION.groups).toContain(keyMirrorGroupId('jog'));
    expect(KEYS_SECTION.groups).not.toContain(keyMirrorGroupId('idle'));
    expect(tuneKeysMirrorOn('jog')).toBe(true);
    expect(tuneKeysMirror('idle', false)).toBe(false);
  });

  it('on: an edit shows on the mirror key too; off: the pose stays, then an edit changes this key and this arm only', () => {
    const at = (ph: number): KeyedPose => sampleKeyed(KEYED_WALK, ph, 1, newKeyedPose());
    tuneSet(keyGroupId('walk', 1), 'armL_elbow', 30); // key 2 (0.125); mirror key 6 (0.625): the right arm
    tuneKeysSync();
    const on6 = at(0.625);
    tuneResetAll();
    tuneKeysSync();
    const base6 = at(0.625);
    const base2 = at(0.125);
    const fore = (p: KeyedPose, o: number): number[] => [0, 1, 2].map((c) => p.arm[o + 3 + c]! - p.arm[o + c]!);
    const angle = (u: number[], v: number[]): number => (Math.acos((u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!) / (Math.hypot(...u) * Math.hypot(...v))) * 180) / Math.PI;
    expect(angle(fore(on6, 6), fore(base6, 6))).toBeCloseTo(30, 0);
    // Mirror off: the mirrored half takes the image, so the pose does not jump
    tuneSet(keyGroupId('walk', 1), 'armL_elbow', 30);
    expect(tuneKeysMirror('walk', false)).toBe(true);
    expect(tuneGet(keyMirrorGroupId('walk'), 'mirror')).toBe(0);
    expect(tuneGet(keyGroupId('walk', 5), 'armR_elbow')).toBe(30);
    tuneKeysSync();
    expect(angle(fore(at(0.625), 6), fore(on6, 6))).toBeLessThan(1e-6);
    // now the mirrored key's right elbow back to 0: key 2's left elbow keeps its 30
    tuneSet(keyGroupId('walk', 5), 'armR_elbow', 0);
    tuneKeysSync();
    expect(angle(fore(at(0.625), 6), fore(base6, 6))).toBeLessThan(1e-6);
    expect(angle(fore(at(0.125), 0), fore(base2, 0))).toBeCloseTo(30, 0);
    expect(tuneGet(keyGroupId('walk', 1), 'armL_elbow')).toBe(30);
    // on again: the mirrored half's own edits are dropped
    tuneKeysMirror('walk', true);
    expect(tuneGet(keyGroupId('walk', 5), 'armR_elbow')).toBe(0);
    expect(tuneKeysMirrorOn('walk')).toBe(true);
  });

  it('(fix round) off, an edit to the mirrored half, on, off again: the edit is still there; untouched keys take the image', () => {
    tuneSet(keyGroupId('walk', 0), 'armL_twist', 8);
    tuneKeysMirror('walk', false);
    expect(tuneGet(keyGroupId('walk', 4), 'armR_twist')).toBe(8);
    tuneSet(keyGroupId('walk', 6), 'armR_elbow', 12);
    tuneKeysMirror('walk', true);
    expect(tuneGet(keyGroupId('walk', 6), 'armR_elbow')).toBe(12); // kept (ignored while on)
    tuneSet(keyGroupId('walk', 1), 'head_yaw', 4); // an own key edited while on: its mirror key has nothing of its own
    tuneKeysMirror('walk', false);
    expect(tuneGet(keyGroupId('walk', 6), 'armR_elbow')).toBe(12);
    expect(tuneGet(keyGroupId('walk', 4), 'armR_twist')).toBe(8);
    expect(tuneGet(keyGroupId('walk', 5), 'head_yaw')).toBe(-4);
  });

  it('(fix round) the bake: Mirror off with the halves still mirror images, a mirrored-half value is baked, not manual', () => {
    const data = { magic: TUNE_EXPORT_MAGIC, version: 2, exported: '2026-10-21T10:00:00.000Z', log: [], changed: [
      { group: keyGroupId('walk', 1), id: 'armL_elbow', value: 10 },
      { group: keyGroupId('walk', 5), id: 'armR_elbow', value: 10 },
      { group: keyMirrorGroupId('walk'), id: 'mirror', value: 0 },
    ] };
    const read = (p: string): string | null => (p === `${BAKE_KEYS_DIR}walk.json` ? readFileSync(path.join(ROOT, p), 'utf8') : null);
    const r = tuneBake(data, bakeCatalogue([]), read);
    expect(r.ok, r.error).toBe(true);
    expect(r.rows.find((x) => x.group === keyGroupId('walk', 5))!.result).toMatch(/^baked \(the halves still mirror/);
    expect(r.manual).toBe(0);
    expect(r.baked).toBe(3);
    expect((JSON.parse(r.writes.find((x) => x.path === `${BAKE_KEYS_DIR}walk.json`)!.after) as KeyFile).mirror).toBe(true);
  });

  it('the bake: off with the halves apart, the clip is written in full (mirror: false); on, or still mirror images, mirrored', () => {
    const walk = JSON.parse(readFileSync(path.join(ROOT, 'scripts/anim-keys/keys/walk.json'), 'utf8')) as KeyFile;
    const n = walk.keys.length;
    const own = { armL_elbow: 10 };
    const same: Record<string, Record<string, number>> = { [keyGroupId('walk', 1)]: own, [keyGroupId('walk', n + 1)]: mirrorDelta(own), [keyMirrorGroupId('walk')]: { mirror: 0 } };
    expect(applyKeyEdits(walk, same).mirror).toBe(true);
    const apart: Record<string, Record<string, number>> = { [keyGroupId('walk', 1)]: own, [keyGroupId('walk', n + 1)]: { armR_elbow: 4 }, [keyMirrorGroupId('walk')]: { mirror: 0 } };
    const full = applyKeyEdits(walk, apart);
    expect(full.mirror).toBe(false);
    expect(full.keys).toHaveLength(2 * n);
    expect(full.keys.map((k) => k.phase)).toEqual([...walk.keys.map((k) => k.phase as number), ...walk.keys.map((k) => (k.phase as number) + 0.5)]);
    const rf = readKeys(full);
    const rm = readKeys(expandMirror(walk));
    const E = KEY_FIELDS.findIndex((f) => f.id === 'armL_elbow');
    const ER = KEY_FIELDS.findIndex((f) => f.id === 'armR_elbow');
    expect(rf[1]!.v[E]! - rm[1]!.v[E]!).toBeCloseTo(10, 9);
    expect(rf[n + 1]!.v[ER]! - rm[n + 1]!.v[ER]!).toBeCloseTo(4, 9);
    // Mirror on: the mirrored half's groups are ignored
    const on = applyKeyEdits(walk, { ...apart, [keyMirrorGroupId('walk')]: { mirror: 1 } });
    expect(on.mirror).toBe(true);
    expect(on.keys).toHaveLength(n);
    // through the bake script's logic (the key JSON written in full, the Mirror box row reported)
    const data = { magic: TUNE_EXPORT_MAGIC, version: 2, exported: '2026-10-21T10:00:00.000Z', log: [], changed: [
      { group: keyGroupId('walk', 1), id: 'armL_twist', value: 20 },
      { group: keyGroupId('walk', n + 1), id: 'armR_twist', value: 5 },
      { group: keyMirrorGroupId('walk'), id: 'mirror', value: 0 },
    ] };
    const read = (p: string): string | null => (p === `${BAKE_KEYS_DIR}walk.json` ? readFileSync(path.join(ROOT, p), 'utf8') : null);
    const r = tuneBake(data, bakeCatalogue([]), read);
    expect(r.ok, r.error).toBe(true);
    const w = r.writes.find((x) => x.path === `${BAKE_KEYS_DIR}walk.json`)!;
    const out = JSON.parse(w.after) as KeyFile;
    expect(out.mirror).toBe(false);
    expect((out.keys[1]!.armL as Record<string, number>).twist).toBe(20);
    expect((out.keys[n + 1]!.armR as Record<string, number>).twist).toBe(5);
    expect(r.rows.find((x) => x.id === 'mirror')!.result).toMatch(/written in full/);
    // the export reader keeps the Mirror box
    expect(keyValuesOf(data)[keyMirrorGroupId('walk')]).toEqual({ mirror: 0 });
  });
});

describe('T1a item 15: the key timeline and the chamber key requests', () => {
  it('a mirrored clip has twice its keys; key 2 of sneak mirrors onto 6; the step walks the keys in phase order', () => {
    // (anim-bake-1022) on sneak (own keys evenly spaced, 0 / 0.125 / 0.25 / 0.375): it ran on jog until Michael's
    // 2026-10-22 tune retimed jog's key 3 to 0.1458, so a step from 0.2 no longer lands on jog's key 3
    const sneak = keyClip('sneak')!;
    expect(keyCount(sneak)).toBe(8);
    expect(keyPhase(sneak, 5)).toBeCloseTo(0.625, 9);
    expect(keyMirrorOf(sneak, 1)).toBe(5);
    expect(keyReadout(sneak, 1)).toBe('sneak - key 2 of 8 (mirror of 6), frame 4');
    expect(keyReadout(keyClip('idle')!, 0)).toBe('idle - key 1 of 12, frame 0');
    expect(keyStep(sneak, 0.125, 1)).toBe(2);
    expect(keyStep(sneak, 0.125, -1)).toBe(0);
    expect(keyStep(sneak, 0.875, 1)).toBe(0);
    expect(keyStep(sneak, 0, -1)).toBe(7);
    expect(keyStep(sneak, 0.2, 1)).toBe(2);
    expect(keyStep(sneak, 0.2, -1)).toBe(1);
    expect(keyNearest(sneak, 0.62)).toBe(5);
  });

  it('chamber requests: a key by index or the next one, NaN with nothing to do; the readout fields', () => {
    expect(chamberKeyPhase('walk', 0, 5, 0)).toBeCloseTo(0.625, 9);
    expect(chamberKeyPhase('walk', 0.625, -1, 1)).toBeCloseTo(0.75, 9);
    expect(Number.isNaN(chamberKeyPhase('walk', 0.3, -1, 0))).toBe(true);
    expect(Number.isNaN(chamberKeyPhase('no_clip', 0.3, 1, 0))).toBe(true);
    const o = { keys: 0, key: -1, onKey: false };
    chamberKeyInfo('walk', 0.625, o);
    expect(o).toEqual({ keys: 8, key: 5, onKey: true });
    chamberKeyInfo('walk', 0.6, o);
    expect(o.onKey).toBe(false);
    chamberKeyInfo('', 0.6, o);
    expect(o).toEqual({ keys: 0, key: -1, onKey: false });
  });

  it('the bar keys are reserved (no binding takes them)', () => {
    for (const k of [TUNER_PLAY_KEY, TUNER_KEY_BACK, TUNER_KEY_FWD]) expect(bindable(k), k).toBe(false);
  });
});

describe('T1a item 19: the aim stances and the gun pick', () => {
  it('aim standing, crouch aim standing and crouch aim moving are loops; armed loops take the picked gun', () => {
    for (const id of ['state:aimStill', 'state:crouchAim', 'state:crouchAimFwd']) expect(CHAMBER_ENTRIES.some((e) => e.id === id), id).toBe(true);
    const out = { x: 0, y: 0, turn: 0, ads: false, crouch: false, drawn: false };
    chamberInput(chamberEntry('state:crouchAim'), false, out, true);
    expect(out).toMatchObject({ ads: true, crouch: true, drawn: true, x: 0, y: 0 });
    chamberInput(chamberEntry('state:crouchAimFwd'), false, out, true);
    expect(out.ads && out.crouch && out.y > 0).toBe(true);
    expect(chamberWeaponFor(chamberEntry('state:aimStill'), 'pistol')).toBe('pistol');
    expect(chamberWeaponFor(chamberEntry('keyed:ready_stance'), 'rifle')).toBe('rifle');
    expect(chamberWeaponFor(chamberEntry('state:walk'), 'pistol')).toBe('');
    CHAMBER.weapon = 'pistol';
    chamberReset();
    expect(CHAMBER.weapon).toBe('pistol'); // kept across chamber visits
    expect(loopGroups('state:aimStill').body).toBe('aimStill');
    expect(loopGroups('state:crouchAimFwd').body).toBe('aimCrouchMove');
  });
});

describe('T1a gap 3: the shared rows get their own', () => {
  it('the body states pick the new rows', () => {
    const s = (o: Partial<Parameters<typeof selectBodyGroup>[0]>, armed = false): string | null => selectBodyGroup({ speed: 0, crouch: 0, aim: 0, ...o }, false, armed);
    expect(s({ aim: 1 })).toBe('aimStill');
    expect(s({ aim: 1, speed: 1 })).toBe('aim');
    expect(s({ aim: 1, crouch: 1 })).toBe('aimCrouch');
    expect(s({ aim: 1, crouch: 1, speed: 1 })).toBe('aimCrouchMove');
    expect(s({ crouch: 1, speed: 1.6 })).toBe('crouchWalk');
    expect(s({ crouch: 1, speed: 2.5 })).toBe('crouchRun');
    expect(s({ wall: true, crouch: 1 })).toBe('wallCrouchIdle');
    expect(s({ wall: true, crouch: 1, speed: 0.6 })).toBe('wallCrouchSlide');
    expect(s({ wall: true, crouch: 1, lean: 0.4 })).toBe('wallCrouchPeek');
    expect(s({ wall: true, speed: 0.6 })).toBe('wallSlide');
    expect(s({ bend: 0.3 })).toBe('hold');
    expect(s({ bend: 0.3, carryBody: true })).toBe('carry');
    for (const g of Object.keys(BODY_ROW_FROM)) expect(BODY_GROUPS as readonly string[]).toContain(g);
    expect([...ROW_WEAPONS]).toEqual([...HAND_WEAPONS]);
  });

  it('a save from before the rows (literal version 1) gives each new row its old row\'s values; a version 2 save is taken as saved', () => {
    const OLD_SAVE = {
      version: 1,
      values: {
        aim: { leanAdd: 0.05 },
        crouchWalk: { kneeOutMul: 1.3 },
        wallPeek: { peekLeanMul: 1.4 },
        hold: { handUpAdd: 0.02 },
        'joint.aim': { elbowR_y: 12 },
        'joint.lowReady': { wristL_x: -6 },
        'hand.rifle.aim': { handLFwd: 0.01 },
        'ik.crouchWalk': { footL: 0.5 },
      },
      log: [],
    };
    tuneLoad(OLD_SAVE);
    expect(tuneGet('aimStill', 'leanAdd')).toBe(0.05);
    expect(tuneGet('aim', 'leanAdd')).toBe(0.05);
    expect(tuneGet('crouchRun', 'kneeOutMul')).toBe(1.3);
    expect(tuneGet('wallCrouchPeek', 'peekLeanMul')).toBe(1.4);
    expect(tuneGet('carry', 'handUpAdd')).toBe(0.02);
    expect(tuneGet('joint.aimStill', 'elbowR_y')).toBe(12);
    expect(tuneGet('joint.rifle.aim', 'elbowR_y')).toBe(12);
    expect(tuneGet('joint.pistol.aimStill', 'elbowR_y')).toBe(12);
    expect(tuneGet('joint.pistol.lowReady', 'wristL_x')).toBe(-6);
    expect(tuneGet('hand.rifle.aimStill', 'handLFwd')).toBe(0.01);
    expect(tuneGet('ik.crouchRun', 'footL')).toBe(0.5);
    // the next save is version 2: a new row reset on purpose stays reset
    tuneSet('aimStill', 'leanAdd', 0);
    const snap = JSON.parse(JSON.stringify(tuneSnapshot())) as { version: number };
    expect(snap.version).toBe(TUNE_ROWS_VERSION);
    tuneResetAll();
    tuneLoad(snap);
    expect(tuneGet('aim', 'leanAdd')).toBe(0.05);
    expect(tuneGet('aimStill', 'leanAdd')).toBe(0);
  });

  it('an export and a presets file from before the rows migrate too; the export is version 2', () => {
    const r = tuneImport({ magic: TUNE_EXPORT_MAGIC, version: 1, changed: [{ group: 'crouchWalk', id: 'trackMul', value: 1.2 }], log: [] });
    expect(r.ok).toBe(true);
    expect(tuneGet('crouchRun', 'trackMul')).toBe(1.2);
    expect(tuneExport().version).toBe(2);
    const old = presetParse({ version: 1, presets: [{ name: 'a', saved: '', values: { wallIdle: { wallGapAdd: 0.03 } } }] });
    expect(old[0]!.values.wallCrouchIdle).toEqual({ wallGapAdd: 0.03 });
    expect(presetFile(old).version).toBe(2);
    expect(migrateTuneChanged([{ group: 'hold', id: 'x' }]).map((c) => c.group)).toContain('carry');
    expect(migrateTuneRows({ carry: { x: 1 }, hold: { x: 2 } }).carry).toEqual({ x: 1 });
  });

  it('a rifle and a pistol have their own Joints rows in the armed states; the frame picks the gun\'s row', () => {
    for (const w of JOINT_GUNS) for (const s of ARMED_JOINT_STATES) expect(JOINT_GROUP_IDS).toContain(`joint.${w}.${s}`);
    expect(JOINT_ROWS.slice(0, BODY_GROUPS.length)).toEqual([...BODY_GROUPS]);
    tuneSet('joint.pistol.aimStill', 'elbowR_y', 9);
    tuneV2Frame('aimStill', 'pistol');
    expect(tuneV2JointRow()).toBe('pistol.aimStill');
    expect(jointsGet('pistol.aimStill', 10, 1)).toBe(9);
    tuneV2Frame('aimStill', 'rifle');
    expect(tuneV2JointRow()).toBe('rifle.aimStill');
    tuneV2Frame('walk', 'pistol');
    expect(tuneV2JointRow()).toBe('walk');
    tuneV2Frame('aimStill', 'knife');
    expect(tuneV2JointRow()).toBe('aimStill');
    expect(bodyCarry('aim', undefined, 'pistol').joint).toBe('joint.pistol.aim');
    expect(bodyCarry('walk', undefined, 'pistol').joint).toBe('joint.walk');
  });
});

describe('T1a: plain names and the scene marker', () => {
  it('a twist is named as one; the new key fields have short plain names', () => {
    expect(plainLabel('joint', 'elbowR_y', '')).toBe('Right forearm twist');
    expect(plainLabel('joint', 'upperArmL_y', '')).toBe('Left upper arm twist');
    expect(plainLabel('keys', 'armL_twist', '')).toBe('Left forearm twist, palm in');
    expect(plainLabel('keys', 'armR_twistUpper', '')).toBe('Right upper arm twist');
    expect(plainLabel('keys', 'armR_shPitch', '')).toBe('Right shoulder forward');
    expect(plainLabel('keys', 'head_yaw', '')).toBe('Head turn');
    expect(plainLabel('keys', 'pelvis_dz', '')).toBe('Hips shift forward');
    expect(plainGroupWord('body', 0, 'aimStill')).toBe('Aim standing');
    expect(plainGroupWord('gun', 1, 'aim')).toBe('Aim');
    expect(plainGroupWord('hand', 0, 'rifle')).toBe('Rifle');
  });

  it('the forearm twist marks the forearm, the shoulder its joint, the head the head', () => {
    expect(tuneTarget('keys', 'armL_twist')).toMatchObject({ kind: 'joint', a: 'elbowL', b: 'wristL', line: true });
    expect(tuneTarget('keys', 'armR_shYaw')).toMatchObject({ a: 'shoulderR', b: '' });
    expect(tuneTarget('keys', 'head_pitch')).toMatchObject({ a: 'headNode' });
    expect(tuneTarget('keys', 'armR_twistUpper')).toMatchObject({ a: 'shoulderR', b: 'elbowR' });
  });
});

describe('T1a gap 4: the drawn set carries its per-key edits', () => {
  it('the ready stance\'s arm edit rides the edit channel (the rig applies it over the gun arms)', () => {
    const p = newKeyedPose();
    sampleKeyed(KEYED_READY_STANCE, 0, 1, p);
    expect(p.edOn).toBe(0);
    tuneSet(keyGroupId('ready_stance', 0), 'armR_elbow', 20);
    tuneSet(keyGroupId('ready_stance', 0), 'chest_pitch', 6);
    tuneKeysSync();
    sampleKeyed(KEYED_READY_STANCE, 0, 1, p);
    expect(p.edOn).toBe(1);
    expect(qAngle(ID, 0, p.ed, KE.arm + 12)).toBeCloseTo(20, 3); // the right forearm
    expect(qAngle(ID, 0, p.ed, KE.trunk + 8)).toBeCloseTo(6, 3); // the chest
    expect(qAngle(ID, 0, p.ed, KE.arm + 4)).toBeLessThan(1e-4); // the left forearm untouched
  });
});
