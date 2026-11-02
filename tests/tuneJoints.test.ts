import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Quaternion } from '../src/core/babylon';
import { BODY_GROUPS, tuneLoad, tuneSnapshot } from '../src/anim/tune';
import {
  eulerQuat,
  J,
  JOINT_COUNT,
  JOINTS,
  JOINTS_CUR,
  JOINTS_HOOKS,
  jointApply,
  jointChanged,
  jointsAttach,
  jointsBegin,
  jointsEnd,
  jointsGet,
  jointsGroupChanged,
  jointsLoad,
  jointsLoadFrom,
  jointsMirror,
  jointsReset,
  jointsResetAll,
  jointsResetGroup,
  jointsSet,
  jointsBaseLoad,
  jointsSnapshot,
  MIRROR_OF,
} from '../src/anim/tuneJoints';
import { ANIM_BASE } from '../src/anim/animBase';

// (anim-bake-1022) These pin the tuner's delta table on its own, so they run on a test-local empty base table (the
// untuned rig). Michael's 2026-10-22 bake filled the generated base (idle / walk / jog upperArm roll), which
// tests/animJointsBase.test.ts covers; the generated base is restored after.
beforeAll(() => {
  jointsBaseLoad(undefined);
});
afterAll(() => {
  jointsBaseLoad(ANIM_BASE.joints);
});

beforeEach(() => {
  JOINTS_HOOKS.changed = null;
  jointsLoad(undefined);
  jointsEnd();
});

describe('tuneJoints table', () => {
  it('has the 23 joints (S4: + the clavicles), each paired joint mirrored onto its partner', () => {
    expect(JOINT_COUNT).toBe(23);
    for (let j = 0; j < JOINT_COUNT; j++) {
      expect(MIRROR_OF[MIRROR_OF[j]!]).toBe(j);
      const n = JOINTS[j]!;
      if (/[LR]$/.test(n)) expect(JOINTS[MIRROR_OF[j]!]).toBe(n.slice(0, -1) + (n.endsWith('L') ? 'R' : 'L'));
      else expect(MIRROR_OF[j]).toBe(j);
    }
  });

  it('identity: every default is 0, no joint is live, the window stays off and jointApply leaves q bit-identical', () => {
    for (const g of BODY_GROUPS) {
      expect(jointsGroupChanged(g)).toBe(false);
      for (let j = 0; j < JOINT_COUNT; j++) for (let a = 0; a < 3; a++) expect(jointsGet(g, j, a as 0 | 1 | 2)).toBe(0);
      jointsBegin(g);
      expect(JOINTS_CUR.on).toBe(false);
    }
    // a live joint in another state, or a zero joint in a live state, never touches q
    jointsSet('run', J.chest, 0, 12);
    jointsSet('walk', J.wristL, 1, 7);
    const vals = [-0.31234567891234, 0.123456789, -0, 0.94321];
    for (const g of BODY_GROUPS) {
      jointsBegin(g);
      for (let j = 0; j < JOINT_COUNT; j++) {
        if ((g === 'run' && j === J.chest) || (g === 'walk' && j === J.wristL)) continue;
        const q = { x: vals[0]!, y: vals[1]!, z: vals[2]!, w: vals[3]! };
        expect(jointApply(q, j)).toBe(false);
        expect(jointApply(q, j, true)).toBe(false);
        expect(Object.is(q.x, vals[0])).toBe(true);
        expect(Object.is(q.z, -0)).toBe(true);
        expect([q.y, q.w]).toEqual([vals[1], vals[3]]);
      }
    }
    jointsEnd();
    const q = { x: 0, y: 0, z: 0, w: 1 };
    expect(jointApply(q, J.chest)).toBe(false);
  });

  it('eulerQuat matches Babylon RotationYawPitchRoll (x pitch, y yaw, z roll)', () => {
    const out = new Float64Array(4);
    for (const [x, y, z] of [
      [0.3, -0.7, 0.2],
      [-1.2, 0.4, 2.1],
      [0, 0, 0.5],
    ] as const) {
      eulerQuat(x, y, z, out, 0);
      const b = Quaternion.RotationYawPitchRoll(y, x, z);
      expect(out[0]).toBeCloseTo(b.x, 12);
      expect(out[1]).toBeCloseTo(b.y, 12);
      expect(out[2]).toBeCloseTo(b.z, 12);
      expect(out[3]).toBeCloseTo(b.w, 12);
    }
  });

  it('applies the offset in the joint frame (q * off) or the parent frame (off * q)', () => {
    jointsSet('walk', J.elbowR, 0, 30);
    jointsBegin('walk');
    expect(JOINTS_CUR.on).toBe(true);
    const base = Quaternion.RotationYawPitchRoll(0.5, 0.1, -0.2);
    const off = Quaternion.RotationYawPitchRoll(0, (30 * Math.PI) / 180, 0);
    const post = base.multiply(off);
    const pre = off.multiply(base);
    const q1 = base.clone();
    const q2 = base.clone();
    expect(jointApply(q1, J.elbowR)).toBe(true);
    jointApply(q2, J.elbowR, true);
    const near = (a: Quaternion, b: Quaternion): boolean => Math.abs(Math.abs(Quaternion.Dot(a, b)) - 1) < 1e-12;
    expect(near(q1, post)).toBe(true);
    expect(near(q2, pre)).toBe(true);
    expect(near(q1, q2)).toBe(false);
  });

  it('mirror lock writes the partner with pitch kept, yaw and roll flipped; off by default; centre joints alone', () => {
    expect(jointsMirror()).toBe(false);
    jointsSet('aim', J.kneeL, 1, 10);
    expect(jointsGet('aim', J.kneeR, 1)).toBe(0);
    jointsMirror(true);
    jointsSet('aim', J.kneeL, 0, 15);
    jointsSet('aim', J.kneeL, 1, 10);
    jointsSet('aim', J.kneeR, 2, 5);
    expect([0, 1, 2].map((a) => jointsGet('aim', J.kneeR, a as 0 | 1 | 2))).toEqual([15, -10, 5]);
    expect([0, 1, 2].map((a) => jointsGet('aim', J.kneeL, a as 0 | 1 | 2))).toEqual([15, 10, -5]);
    jointsSet('aim', J.head, 1, 20);
    expect(jointsGet('aim', J.head, 1)).toBe(20);
    // the mirrored offset quaternion is the mirror (x, -y, -z, w) of the original
    jointsBegin('aim');
    const l = { x: 0, y: 0, z: 0, w: 1 };
    const r = { x: 0, y: 0, z: 0, w: 1 };
    jointApply(l, J.kneeL);
    jointApply(r, J.kneeR);
    expect(r.x).toBeCloseTo(l.x, 14);
    expect(r.y).toBeCloseTo(-l.y, 14);
    expect(r.z).toBeCloseTo(-l.z, 14);
    expect(r.w).toBeCloseTo(l.w, 14);
    // reset with the lock clears both sides
    jointsReset('aim', J.kneeL);
    expect(jointChanged('aim', J.kneeL) || jointChanged('aim', J.kneeR)).toBe(false);
  });

  it('clamps, refuses non-finite values, fires the hook, resets per group and all', () => {
    let n = 0;
    JOINTS_HOOKS.changed = () => n++;
    expect(jointsSet('jog', J.spine, 0, 999)).toBe(true);
    expect(jointsGet('jog', J.spine, 0)).toBe(180);
    expect(jointsSet('jog', J.spine, 0, Number.NaN)).toBe(false);
    expect(jointsSet('jog', J.spine, 0, 180)).toBe(false);
    expect(n).toBe(1);
    jointsSet('idle', J.toeR, 2, 3);
    jointsResetGroup('jog');
    expect(jointsGroupChanged('jog')).toBe(false);
    expect(jointsGroupChanged('idle')).toBe(true);
    jointsResetAll();
    expect(jointsGroupChanged('idle')).toBe(false);
  });

  it('eases the applied offset on a state change (walk elbowR 40 -> run 0) and settles to exact identity', () => {
    const ang = (q: { x: number; y: number; z: number; w: number }): number => 2 * Math.acos(Math.min(1, Math.abs(q.w)));
    jointsSet('walk', J.elbowR, 0, 40);
    jointsBegin('walk'); // dt omitted: jumps to the row
    const full = { x: 0, y: 0, z: 0, w: 1 };
    jointApply(full, J.elbowR);
    expect(ang(full)).toBeCloseTo((40 * Math.PI) / 180, 12);
    const seq: number[] = [];
    for (let k = 0; k < 120; k++) {
      jointsBegin('run', 1 / 60);
      const q = { x: 0, y: 0, z: 0, w: 1 };
      seq.push(jointApply(q, J.elbowR) ? ang(q) : 0);
    }
    // first frame moves only part of the way (no snap), then strictly down over many frames
    expect(seq[0]).toBeGreaterThan(ang(full) * 0.5);
    expect(seq[0]).toBeLessThan(ang(full));
    const moving = seq.findIndex((a) => a === 0);
    expect(moving).toBeGreaterThanOrEqual(3);
    for (let k = 1; k < moving; k++) expect(seq[k]).toBeLessThan(seq[k - 1]!);
    // settled: the window is off and q stays bit-identical
    expect(JOINTS_CUR.on).toBe(false);
    const q = { x: 0.1, y: -0, z: 0.2, w: 0.9 };
    expect(jointApply(q, J.elbowR)).toBe(false);
    expect(Object.is(q.y, -0)).toBe(true);
    // and back in: eases up from 0 toward the row, again over several frames
    jointsBegin('walk', 1 / 60);
    const up = { x: 0, y: 0, z: 0, w: 1 };
    jointApply(up, J.elbowR);
    expect(ang(up)).toBeGreaterThan(0);
    expect(ang(up)).toBeLessThan(ang(full) * 0.5);
  });

  it('all zero with dt: the window never opens, every frame', () => {
    for (let k = 0; k < 30; k++) {
      for (const g of BODY_GROUPS) {
        jointsBegin(g, 1 / 60);
        expect(JOINTS_CUR.on).toBe(false);
      }
      jointsBegin('', 1 / 60);
      expect(JOINTS_CUR.on).toBe(false);
    }
  });
});

describe('tuneJoints save / export', () => {
  it('an untouched table leaves the tuner record unchanged (no joints key)', () => {
    const rec = tuneSnapshot();
    expect(jointsAttach(rec)).toBe(rec);
  });

  it('round-trips through the tuner record as an additive key; tuneLoad ignores it; an old save loads as zero', () => {
    jointsMirror(true);
    jointsSet('crouchWalk', J.hipL, 0, -12.5);
    jointsSet('ladder', J.neck, 2, 4);
    const rec = JSON.parse(JSON.stringify(jointsAttach(tuneSnapshot()))) as Record<string, unknown>;
    expect(rec.version).toBe(2); // (marlow-bays T1a: the rows' version)
    expect(rec.joints).toEqual(jointsSnapshot());
    expect(() => tuneLoad(rec)).not.toThrow();
    jointsLoad(undefined);
    expect(jointsGroupChanged('crouchWalk')).toBe(false);
    jointsLoadFrom(rec);
    expect(jointsMirror()).toBe(true);
    expect(jointsGet('crouchWalk', J.hipL, 0)).toBe(-12.5);
    expect(jointsGet('crouchWalk', J.hipR, 0)).toBe(-12.5);
    expect(jointsGet('ladder', J.neck, 2)).toBe(4);
    // a literal old (4.20) record with no joints key
    jointsLoadFrom({ version: 1, values: { walk: { armSwingMul: 1.2 } }, log: [] });
    expect(jointsMirror()).toBe(false);
    for (const g of BODY_GROUPS) expect(jointsGroupChanged(g)).toBe(false);
    // junk is skipped
    jointsLoadFrom({ joints: { values: { nope: { head: [1, 2, 3] }, walk: { nope: [1, 2, 3], head: [Number.NaN, 'x', 400] } } } });
    expect([0, 1, 2].map((a) => jointsGet('walk', J.head, a as 0 | 1 | 2))).toEqual([0, 0, 180]);
  });
});

describe('tuneJoints on the real rig', () => {
  it('identity is bit-identical; a wrist offset turns only the wrist branch; remotes (outside the window) are untouched', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const names = ['hips', 'spine', 'torso', 'neck', 'headNode', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'toeL', 'toeR'] as const;
    const run = (window: boolean): number[][] => {
      vi.spyOn(Math, 'random').mockReturnValue(0.25); // the idle clock's random start (animGraph idleT)
      const scene = new Scene(new NullEngine());
      const lib = new PartLibrary(scene);
      const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
      rg.carrier = true;
      const rp = { speed: 1.4, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
      const out: number[][] = [];
      for (let k = 0; k < 90; k++) {
        rg.root.position.z += rp.speed / 60;
        if (window) jointsBegin('walk');
        rg.animate(1 / 60, rp);
        jointsEnd();
        if (k % 15 === 14) for (const n of names) {
          const q = (rg as unknown as Record<string, { rotationQuaternion: Quaternion }>)[n]!.rotationQuaternion;
          out.push([q.x, q.y, q.z, q.w]);
        }
      }
      rg.dispose();
      scene.dispose();
      vi.restoreAllMocks();
      return out;
    };
    const base = run(false);
    expect(run(false)).toEqual(base);
    // every value 0 (and an offset in another state): bit-identical
    jointsSet('run', J.chest, 0, 20);
    expect(run(true)).toEqual(base);
    // a wrist offset in the walk: the trunk, legs, head, shoulders and elbows bit-identical, the left wrist turned
    jointsSet('walk', J.wristL, 0, 25);
    const tuned = run(true);
    const wi = names.indexOf('wristL');
    let wristMoved = false;
    for (let i = 0; i < base.length; i++) {
      const n = i % names.length;
      if (n === wi) wristMoved ||= Math.abs(base[i]![0]! - tuned[i]![0]!) > 1e-3;
      else expect(tuned[i]).toEqual(base[i]);
    }
    expect(wristMoved).toBe(true);
    // a rig animated outside the window (a remote, a guard) is untouched
    expect(run(false)).toEqual(base);
  });

  it('a state change on the real rig (walk elbowR 40 -> run 0) eases over frames, then is bit-identical to untuned', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const names = ['hips', 'spine', 'torso', 'neck', 'headNode', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'toeL', 'toeR'] as const;
    const SWITCH = 60;
    const run = (): number[][][] => {
      vi.spyOn(Math, 'random').mockReturnValue(0.25);
      const scene = new Scene(new NullEngine());
      const lib = new PartLibrary(scene);
      const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
      rg.carrier = true;
      const rp = { speed: 1.4, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
      const out: number[][][] = [];
      for (let k = 0; k < SWITCH + 90; k++) {
        rg.root.position.z += rp.speed / 60;
        jointsBegin(k < SWITCH ? 'walk' : 'run', 1 / 60);
        rg.animate(1 / 60, rp);
        jointsEnd();
        out.push(names.map((n) => {
          const q = (rg as unknown as Record<string, { rotationQuaternion: Quaternion }>)[n]!.rotationQuaternion;
          return [q.x, q.y, q.z, q.w];
        }));
      }
      rg.dispose();
      scene.dispose();
      vi.restoreAllMocks();
      return out;
    };
    const base = run();
    jointsSet('walk', J.elbowR, 0, 40);
    const tuned = run();
    const ei = names.indexOf('elbowR');
    const diff = (k: number): number => {
      const a = base[k]![ei]!;
      const b = tuned[k]![ei]!;
      return 2 * Math.acos(Math.min(1, Math.abs(a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]! + a[3]! * b[3]!)));
    };
    const before = diff(SWITCH - 1);
    expect(before).toBeGreaterThan((30 * Math.PI) / 180);
    // no snap: the elbow keeps a shrinking share of the offset for at least 3 frames after the switch
    for (let k = 0; k < 3; k++) expect(diff(SWITCH + k)).toBeGreaterThan(before * 0.2);
    expect(diff(SWITCH)).toBeLessThan(before);
    expect(diff(SWITCH + 2)).toBeLessThan(diff(SWITCH));
    // settled: every node bit-identical to the untuned rig
    for (let k = SWITCH + 80; k < SWITCH + 90; k++) expect(tuned[k]).toEqual(base[k]);
  });
});
