// (anim-joints J1, COVERAGE gap 1) The base table every Wren rig reads: literal old exports bake into the generated
// `src/anim/animBase.ts` (temp copies, never the real tree), base + delta composition, the bake's identity (bake then
// reset looks the same), the ledger no-op, nothing live by default, and the per-rig window on the real rig.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { setMixamo } from '../src/anim/mixamo';
import type { Quaternion } from '../src/core/babylon';
import '../src/anim/tune';
import '../src/anim/tuneV2Sections';
import { BODY_GROUPS, type BodyGroup } from '../src/anim/tune';
import { TUNE_SECTIONS, tuneExport, tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import { tuneV2SyncAll } from '../src/anim/tuneV2Sections';
import { bakeCatalogue, tuneBake, type BakeResult } from '../src/anim/tuneBake';
import { BAKE_RULES } from '../src/anim/tuneBakeTable';
import { applyBaseEntries, BAKE_BASE_FILE, emptyBase, parseAnimBase, printAnimBase, spliceAnimBase } from '../src/anim/tuneBakeBase';
import { ANIM_BASE, type AnimBaseData } from '../src/anim/animBase';
import { J, JOINTS, JOINT_ROWS, JOINTS_CUR, eulerQuat, jointsAnyLive, jointsEffective, jointsLoad, type JointAxis } from '../src/anim/tuneJoints';
import { HAND_PARAMS, HAND_WEAPONS, HANDS_CUR, handsAnyLive, handsEffective, handsLoad, IK_LIMBS, ikEffective, type IkLimb } from '../src/anim/tuneHands';
import { animBaseLoad } from '../src/anim/tuneJointsRig';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

const ROOT = path.join(__dirname, '..');
const real = (p: string): string => readFileSync(path.join(ROOT, p), 'utf8');
const lf = (s: string): string => s.replace(/\r\n/g, '\n');
const CAT = bakeCatalogue(TUNE_SECTIONS.filter((s) => s.id !== 'keys'));
const TABLE_FILES = [...new Set(BAKE_RULES.flatMap((r) => r.edits.map((e) => e.file)))];

const dirs: string[] = [];
function tempTree(): { read: (p: string) => string | null; write: (r: BakeResult) => void } {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'anim-base-'));
  dirs.push(dir);
  for (const f of [...TABLE_FILES, BAKE_BASE_FILE]) {
    mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    cpSync(path.join(ROOT, f), path.join(dir, f));
  }
  // (anim-bake-1022) the copy's base table starts empty (the literal exports below bake onto an untuned rig), whatever
  // the generated table holds after a bake
  writeFileSync(path.join(dir, BAKE_BASE_FILE), spliceAnimBase(readFileSync(path.join(dir, BAKE_BASE_FILE), 'utf8'), emptyBase()));
  const read = (p: string): string | null => (existsSync(path.join(dir, p)) ? readFileSync(path.join(dir, p), 'utf8') : null);
  const write = (r: BakeResult): void => {
    for (const w of r.writes) {
      mkdirSync(path.dirname(path.join(dir, w.path)), { recursive: true });
      writeFileSync(path.join(dir, w.path), w.after);
    }
  };
  return { read, write };
}
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
afterEach(() => {
  animBaseLoad(ANIM_BASE);
  tuneResetAll();
  tuneV2SyncAll();
  jointsLoad(undefined);
  handsLoad(undefined);
});

/** The JSON between the markers of a base file's text (LF). */
const jsonOf = (text: string): string => {
  const t = lf(text);
  return t.slice(t.indexOf('\n', t.indexOf('// @anim-base-begin')) + 1, t.lastIndexOf('\n', t.indexOf('// @anim-base-end')) + 1);
};
/** Everything outside the markers (LF). */
const outside = (text: string): string => {
  const t = lf(text);
  return t.replace(jsonOf(t), '');
};

// A literal version 1 export (before marlow-bays T1a's own rows), as the tuner wrote it.
const V1_EXPORT = JSON.parse(`{
  "magic": "night-shift-anim-tune",
  "version": 1,
  "exported": "2026-10-19T08:30:00.000Z",
  "changed": [
    { "group": "joint.wallIdle", "id": "elbowR_x", "label": "elbowR pitch", "kind": "add", "unit": "deg", "value": 12.5, "default": 0 },
    { "group": "hand.rifle.aim", "id": "handRFwd", "label": "handR IK target fwd", "kind": "add", "unit": "m", "value": 0.02, "default": 0 },
    { "group": "ik.crouchWalk", "id": "footL", "label": "footL IK strength (0 = FK: rest + joint offsets)", "kind": "mul", "unit": "x", "value": 0.5, "default": 1 },
    { "group": "weapon.pistol.aim", "id": "gunScale", "label": "gun scale (visual only)", "kind": "mul", "unit": "x", "value": 1.2, "default": 1 },
    { "group": "joint.options", "id": "mirror", "label": "mirror lock L / R (0 off, 1 on)", "kind": "add", "unit": "", "value": 1, "default": 0 },
    { "group": "wallPeek", "id": "peekLeanMul", "label": "peek lean", "kind": "mul", "unit": "x", "value": 1.5, "default": 1 }
  ],
  "log": []
}`) as unknown;

// The base table it bakes to: the version 1 rule gives each new row (crouched wall idle, aim standing still, crouch run)
// the value of the row it shared.
const V1_BASE = `{
  "version": 1,
  "joints": {
    "wallCrouchIdle": { "elbowR": [12.5, 0, 0] },
    "wallIdle": { "elbowR": [12.5, 0, 0] }
  },
  "hands": {
    "pistol": {
      "aim": { "gunScale": 1.2 },
      "aimStill": { "gunScale": 1.2 }
    },
    "rifle": {
      "aim": { "handRFwd": 0.02 },
      "aimStill": { "handRFwd": 0.02 }
    }
  },
  "ik": {
    "crouchRun": [1, 1, 0.5, 1],
    "crouchWalk": [1, 1, 0.5, 1]
  }
}
`;

// A literal version 2 export (marlow-bays T1a's rows: the rifle's own aim row).
const V2_EXPORT = JSON.parse(`{
  "magic": "night-shift-anim-tune",
  "version": 2,
  "exported": "2026-10-21T15:00:00.000Z",
  "changed": [
    { "group": "joint.rifle.aim", "id": "elbowL_y", "label": "elbowL yaw", "kind": "add", "unit": "deg", "value": -20, "default": 0 },
    { "group": "hand.none.walk", "id": "footLUp", "label": "footL IK target up", "kind": "add", "unit": "m", "value": 0.03, "default": 0 },
    { "group": "ik.carry", "id": "handR", "label": "handR IK strength (0 = FK: rest + joint offsets)", "kind": "mul", "unit": "x", "value": 0.25, "default": 1 }
  ],
  "log": []
}`) as unknown;

const V2_BASE = `{
  "version": 1,
  "joints": {
    "rifle.aim": { "elbowL": [0, -20, 0] }
  },
  "hands": {
    "none": {
      "walk": { "footLUp": 0.03 }
    }
  },
  "ik": {
    "carry": [1, 0.25, 1, 1]
  }
}
`;

const res = (r: BakeResult, g: string, id: string): string => r.rows.find((x) => x.group === g && x.id === id)?.result ?? '(none)';

describe('anim-joints J1: the base table file', () => {
  // (anim-bake-1022) was 'the generated file is empty': Michael's 2026-10-22 bake filled it (idle / walk / jog upperArm
  // roll), so it is read against the game's own ANIM_BASE; the empty table is the test-local base below.
  it('the generated file parses to ANIM_BASE and prints back identically (a re-bake of identity is the same text)', () => {
    const text = real(BAKE_BASE_FILE);
    const b = parseAnimBase(text);
    expect(b).toEqual(ANIM_BASE);
    expect(lf(spliceAnimBase(text, b))).toBe(lf(text));
    expect(printAnimBase(b)).toBe(jsonOf(text));
    // identity entries leave nothing behind
    expect(printAnimBase(applyBaseEntries(b, [{ group: 'joint.walk', id: 'kneeL_x', value: 0 }, { group: 'weapon.rifle.aim', id: 'gunScale', value: 1 }, { group: 'ik.walk', id: 'handL', value: 1 }]))).toBe(jsonOf(text));
  });

  it('composes by the A1 rules: degrees add and wrap, offsets add, gun scale and IK multiply, trigger the delta when set', () => {
    let b = applyBaseEntries(emptyBase(), [
      { group: 'joint.walk', id: 'elbowR_x', value: 170 },
      { group: 'weapon.rifle.aim', id: 'gunScale', value: 1.5 },
      { group: 'weapon.rifle.aim', id: 'trigger', value: 1 },
      { group: 'hand.rifle.aim', id: 'handLFwd', value: 0.05 },
      { group: 'ik.walk', id: 'footR', value: 0.5 },
    ]);
    b = applyBaseEntries(b, [
      { group: 'joint.walk', id: 'elbowR_x', value: 20 },
      { group: 'weapon.rifle.aim', id: 'gunScale', value: 1.2 },
      { group: 'weapon.rifle.aim', id: 'trigger', value: 0 },
      { group: 'hand.rifle.aim', id: 'handLFwd', value: -0.02 },
      { group: 'ik.walk', id: 'footR', value: 0.5 },
    ]);
    expect(b.joints.walk!.elbowR).toEqual([-170, 0, 0]);
    expect(b.hands.rifle!.aim!.gunScale).toBe(1.8);
    expect(b.hands.rifle!.aim!.trigger).toBe(1); // auto keeps the base's
    expect(b.hands.rifle!.aim!.handLFwd).toBe(0.03);
    expect(b.ik.walk).toEqual([1, 1, 1, 0.25]);
    expect(() => applyBaseEntries(b, [{ group: 'joint.walk', id: 'nope_x', value: 1 }])).toThrow(/not a joint axis/);
  });
});

describe('anim-joints J1: baking literal old exports into the base table (temp copies)', () => {
  it('(a) a version 1 export: the base table text, the migrated rows, the mirror lock manual, the body slider baked', () => {
    const t = tempTree();
    const r = tuneBake(V1_EXPORT, CAT, t.read, { now: new Date('2026-10-21T17:00:00Z') });
    expect(r.ok, r.error).toBe(true);
    t.write(r);
    const after = t.read(BAKE_BASE_FILE)!;
    expect(jsonOf(after)).toBe(V1_BASE);
    expect(outside(after)).toBe(outside(real(BAKE_BASE_FILE))); // only the JSON between the markers changes
    expect(after.includes('\r\n')).toBe(real(BAKE_BASE_FILE).includes('\r\n')); // line ends kept
    for (const [g, id] of [
      ['joint.wallIdle', 'elbowR_x'],
      ['joint.wallCrouchIdle', 'elbowR_x'],
      ['hand.rifle.aim', 'handRFwd'],
      ['ik.crouchWalk', 'footL'],
      ['ik.crouchRun', 'footL'],
      ['weapon.pistol.aim', 'gunScale'],
    ] as const) expect(res(r, g, id), `${g} ${id}`).toBe('baked (base table)');
    expect(r.rows.find((x) => x.group === 'joint.wallIdle')!.target).toBe('src/anim/animBase.ts: joints.wallIdle.elbowR[0] + (deg, wrapped)');
    expect(res(r, 'joint.options', 'mirror')).toBe('manual: no code target');
    expect(res(r, 'wallPeek', 'peekLeanMul')).toBe('baked');
    expect(r.writes.filter((w) => w.path === BAKE_BASE_FILE).length).toBe(1);
    expect(r.diff).toContain(`--- a/${BAKE_BASE_FILE}`);
    expect(r.diff).toContain('+    "wallCrouchIdle": { "elbowR": [12.5, 0, 0] },');
    expect(JSON.parse(t.read('src/anim/tuneBakeLog.json')!).bakes[0].baked).toContain('joint.wallCrouchIdle|elbowR_x=12.5');
  });

  it('(b) a version 2 export: the rifle aim row, a Hands & feet row of no weapon, the carry IK row', () => {
    const t = tempTree();
    const r = tuneBake(V2_EXPORT, CAT, t.read);
    expect(r.ok, r.error).toBe(true);
    t.write(r);
    expect(jsonOf(t.read(BAKE_BASE_FILE)!)).toBe(V2_BASE);
    expect(r.rows.every((x) => x.result === 'baked (base table)')).toBe(true);
    // a value beyond the slider's wide range still refuses (nothing written)
    const bad = tuneBake({ ...(V2_EXPORT as object), changed: [{ group: 'joint.walk', id: 'elbowR_x', kind: 'add', value: 400 }] }, CAT, t.read);
    expect(bad.ok).toBe(false);
    expect(bad.error).toMatch(/outside the slider's wide range/);
  });

  it('(c) bake, then load the new base and reset the tuner: every row has the same effective values (joints exact)', () => {
    const t = tempTree();
    // a base table from an earlier bake, live in the game
    const before: AnimBaseData = { version: 1, joints: { walk: { elbowR: [10, 0, -5] }, 'rifle.aim': { wristL: [0, 170, 0] } }, hands: { rifle: { aim: { handRFwd: 0.01 } }, pistol: { aim: { gunScale: 1.5 } } }, ik: { crouchWalk: [1, 1, 0.8, 1] } };
    writeFileSync(path.join(dirs[dirs.length - 1]!, BAKE_BASE_FILE), spliceAnimBase(t.read(BAKE_BASE_FILE)!, before));
    animBaseLoad(before);
    // Michael tunes on top of it in the panel
    tuneSet('joint.walk', 'elbowR_x', 12.5);
    tuneSet('joint.walk', 'kneeL_y', -7.5);
    tuneSet('joint.rifle.aim', 'wristL_y', 30); // 170 + 30 wraps to -160
    tuneSet('hand.rifle.aim', 'handRFwd', 0.02);
    tuneSet('weapon.pistol.aim', 'gunScale', 1.2);
    tuneSet('weapon.pistol.aim', 'trigger', -1);
    tuneSet('ik.crouchWalk', 'footL', 0.5);
    tuneV2SyncAll();
    const snap = (): { j: number[]; h: number[]; ik: number[] } => {
      const j: number[] = [];
      for (const row of JOINT_ROWS) for (let k = 0; k < JOINTS.length; k++) for (let a = 0; a < 3; a++) j.push(jointsEffective(row, k, a as JointAxis));
      const h: number[] = [];
      const ik: number[] = [];
      for (const b of BODY_GROUPS) {
        for (const w of HAND_WEAPONS) for (let i = 0; i < HAND_PARAMS.length; i++) h.push(handsEffective(w, b as BodyGroup, i));
        for (let l = 0; l < IK_LIMBS.length; l++) ik.push(ikEffective(b as BodyGroup, l as IkLimb));
      }
      return { j, h, ik };
    };
    const look = snap();
    expect(jointsEffective('rifle.aim', J.wristL, 1)).toBe(-160);
    const r = tuneBake(tuneExport(new Date('2026-10-21T18:00:00Z')), CAT, t.read);
    expect(r.ok, r.error).toBe(true);
    t.write(r);
    animBaseLoad(parseAnimBase(t.read(BAKE_BASE_FILE)!));
    tuneResetAll();
    tuneV2SyncAll();
    const baked = snap();
    expect(baked.j).toEqual(look.j); // degree space: exact
    expect(baked.ik).toEqual(look.ik);
    for (let i = 0; i < look.h.length; i++) expect(baked.h[i]!, `hand param ${i}`).toBeCloseTo(look.h[i]!, 9);
  });

  it('(d) a re-run of the same export is a no-op (the ledger)', () => {
    const t = tempTree();
    t.write(tuneBake(V2_EXPORT, CAT, t.read));
    const text = t.read(BAKE_BASE_FILE);
    const r2 = tuneBake(V2_EXPORT, CAT, t.read);
    expect(r2.ok).toBe(true);
    expect(r2.writes).toEqual([]);
    expect(r2.rows.every((x) => x.result.startsWith('already baked'))).toBe(true);
    expect(t.read(BAKE_BASE_FILE)).toBe(text);
  });
});

describe('anim-joints J1: nothing live by default, and the per-rig window on the real rig', () => {
  it('(e) the empty base and zero deltas: nothing live, and a Wren rig is bit-identical to a rig without the flag', async () => {
    animBaseLoad(emptyBase()); // (anim-bake-1022) test-local: the generated table is no longer empty
    expect(jointsAnyLive()).toBe(false);
    expect(handsAnyLive()).toBe(false);
    const flagged = await runRigs([{ wren: true, speed: 0 }]);
    const plain = await runRigs([{ wren: false, speed: 0 }]);
    expect(flagged[0]).toEqual(plain[0]);
    expect(windowsSeen).toBe(0); // the hooks never ran
  });

  it('a base row turns a Wren rig\'s bone with the tuner at identity; a guard rig and a Wren rig in another state are untouched', async () => {
    animBaseLoad(emptyBase()); // (anim-bake-1022) from the untuned rig: the generated table now holds idle / walk rows
    const before = await runRigs([{ wren: true, speed: 0 }, { wren: true, speed: 1.4 }, { wren: false, speed: 0 }]);
    animBaseLoad({ version: 1, joints: { idle: { elbowR: [40, 0, 0] } }, hands: {}, ik: { idle: [1, 0, 1, 1] } });
    const after = await runRigs([{ wren: true, speed: 0 }, { wren: true, speed: 1.4 }, { wren: false, speed: 0 }]);
    // the idle Wren rig: right arm pure FK (IK strength 0) with the elbow offset exactly (rest + offset)
    const off = new Float64Array(4);
    eulerQuat((40 * Math.PI) / 180, 0, 0, off, 0);
    const q = after[0]!.elbowR!;
    expect(Math.abs(q[0]! * off[0]! + q[1]! * off[1]! + q[2]! * off[2]! + q[3]! * off[3]!)).toBeGreaterThan(0.99999);
    expect(after[0]!.elbowR).not.toEqual(before[0]!.elbowR);
    expect(after[0]!.elbowL).toEqual(before[0]!.elbowL);
    // the walking Wren rig (its own row, walk) and the guard (no flag): bit-identical, though animated in between
    expect(after[1]).toEqual(before[1]);
    expect(after[2]).toEqual(before[2]);
    expect(JOINTS_CUR.on).toBe(false);
    expect(HANDS_CUR.on).toBe(false);
  });
});

let windowsSeen = 0;
const NODES = ['hips', 'spine', 'torso', 'neck', 'headNode', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'] as const;

/** Rigs animated in turn (interleaved, 90 frames), their bones' local rotations at the end. */
async function runRigs(spec: readonly { wren: boolean; speed: number }[]): Promise<Record<string, number[]>[]> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/player/avatarLook');
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const rigs = spec.map((s, k) => {
    const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook(), 1.75, `r${k}`);
    rg.carrier = true;
    rg.tuneRows = s.wren;
    rg.root.position.x = k * 3;
    return rg;
  });
  const poses = spec.map((s) => ({ speed: s.speed, localX: 0, localZ: s.speed > 0 ? 1 : 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' as const }));
  windowsSeen = 0;
  for (let f = 0; f < 90; f++) {
    for (let k = 0; k < rigs.length; k++) {
      const rg = rigs[k]!;
      rg.root.position.z += poses[k]!.speed / 60;
      rg.animate(1 / 60, poses[k]!);
      if (rg.tuneSt && (rg.tuneSt.joints.any || rg.tuneSt.hands.curAny || rg.tuneSt.hands.ikAny)) windowsSeen++;
    }
  }
  const out = rigs.map((rg) => {
    const o: Record<string, number[]> = {};
    for (const n of NODES) {
      const q = (rg as unknown as Record<string, { rotationQuaternion: Quaternion }>)[n]!.rotationQuaternion;
      o[n] = [q.x, q.y, q.z, q.w];
    }
    return o;
  });
  for (const rg of rigs) rg.dispose();
  scene.dispose();
  vi.restoreAllMocks();
  return out;
}
