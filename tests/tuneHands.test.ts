import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Quaternion, Vector3 } from '../src/core/babylon';
import { tuneLoad, tuneSnapshot } from '../src/anim/tune';
import {
  FINGERS,
  HAND_PARAMS,
  HAND_PARAM_COUNT,
  HANDS_CUR,
  HANDS_GUN,
  HANDS_HOOKS,
  HP,
  gunVisualPoint,
  handsAttach,
  handsBegin,
  handsChanged,
  handsEnd,
  handsGet,
  handsGroupChanged,
  handsLoad,
  handsLoadFrom,
  handsReset,
  handsResetAll,
  handsResetGroup,
  handsSet,
  handsSnapshot,
  handsWeaponOf,
  ikGet,
  ikGroupChanged,
  ikReset,
  ikResetAll,
  ikSet,
  rotInto,
} from '../src/anim/tuneHands';
import { J, eulerQuat, jointsBegin, jointsEnd, jointsLoad, jointsSet } from '../src/anim/tuneJoints';

beforeEach(() => {
  handsLoad(undefined);
  jointsLoad(undefined);
  HANDS_HOOKS.changed = null;
});

describe('tuneHands table', () => {
  it('has the placement, Weapon and finger params, all identity by default; the window stays off', () => {
    for (const id of ['handLFwd', 'handRUp', 'footLOut', 'footRFwd', 'handRPitch', 'gunScale', 'gunX', 'gunRoll', 'supportSlide', 'supportOut', 'supportYaw', 'trigger']) expect(HP[id]).toBeDefined();
    for (const f of FINGERS) for (const h of ['L', 'R']) {
      expect(HP[`${f}${h}Curl`]).toBeDefined();
      expect(HP[`${f}${h}Spread`]).toBeDefined();
    }
    expect(HAND_PARAMS.length).toBe(HAND_PARAM_COUNT);
    for (let i = 0; i < HAND_PARAM_COUNT; i++) expect(handsGet('rifle', 'walk', i)).toBe(HAND_PARAMS[i]!.def);
    expect(HAND_PARAMS[HP.gunScale!]!.def).toBe(1);
    handsBegin('walk', 'rifle');
    expect(HANDS_CUR.on).toBe(false);
    expect(HANDS_GUN.on).toBe(false);
  });

  it('clamps, refuses NaN, rounds the trigger mode, fires the hook, resets', () => {
    const hook = vi.fn();
    HANDS_HOOKS.changed = hook;
    expect(handsSet('rifle', 'aim', HP.gunScale!, 9)).toBe(true);
    expect(handsGet('rifle', 'aim', HP.gunScale!)).toBe(2);
    expect(handsSet('rifle', 'aim', HP.gunScale!, Number.NaN)).toBe(false);
    handsSet('rifle', 'aim', HP.trigger!, -0.7);
    expect(handsGet('rifle', 'aim', HP.trigger!)).toBe(-1);
    expect(hook).toHaveBeenCalledTimes(2);
    expect(handsChanged('rifle', 'aim', HP.gunScale!)).toBe(true);
    expect(handsGroupChanged('rifle', 'aim')).toBe(true);
    expect(handsGroupChanged('pistol', 'aim')).toBe(false);
    handsReset('rifle', 'aim', HP.gunScale!);
    expect(handsGet('rifle', 'aim', HP.gunScale!)).toBe(1);
    handsResetGroup('rifle', 'aim');
    expect(handsGroupChanged('rifle', 'aim')).toBe(false);
    handsSet('none', 'run', HP.footLUp!, 0.02);
    handsResetAll();
    expect(handsGroupChanged('none', 'run')).toBe(false);
  });

  it('picks the weapon row from the rig', () => {
    const r = (n: string | null, knife = false, cup = false) => handsWeaponOf({ heldWeapon: n === null ? null : { name: n }, holdingKnife: knife, supportStyle: cup ? 'cup' : 'tube' });
    expect(r(null)).toBe('none');
    expect(r('wpn-rifle')).toBe('rifle');
    expect(r('wpn-pistolSd', false, true)).toBe('pistol');
    expect(r('wpn-launcher')).toBe('launcher');
    expect(r(null, true)).toBe('knife');
  });

  it('eases a state change and a weapon change, then is exactly identity', () => {
    handsSet('none', 'walk', HP.handRFwd!, 0.1);
    handsBegin('walk', 'none', 1 / 60);
    for (let k = 0; k < 120; k++) handsBegin('walk', 'none', 1 / 60);
    expect(HANDS_CUR.pos[3]).toBe(0.1);
    const seen: number[] = [];
    for (let k = 0; k < 120; k++) {
      handsBegin('run', 'none', 1 / 60);
      seen.push(HANDS_CUR.on ? HANDS_CUR.pos[3]! : 0);
    }
    expect(seen[0]).toBeGreaterThan(0.02);
    expect(seen[0]).toBeLessThan(0.1);
    for (let k = 1; k < 3; k++) {
      expect(seen[k]).toBeLessThan(seen[k - 1]!);
      expect(seen[k]).toBeGreaterThan(0.02);
    }
    expect(seen[119]).toBe(0);
    expect(HANDS_CUR.on).toBe(false);
    expect(HANDS_CUR.pos[3]).toBe(0);
    // rifle 1.5 -> pistol (default) eases the gun scale down
    handsSet('rifle', 'lowReady', HP.gunScale!, 1.5);
    handsBegin('lowReady', 'rifle');
    expect(HANDS_GUN.s).toBe(1.5);
    handsBegin('lowReady', 'pistol', 1 / 60);
    expect(HANDS_GUN.s).toBeGreaterThan(1.1);
    expect(HANDS_GUN.s).toBeLessThan(1.5);
    for (let k = 0; k < 120; k++) handsBegin('lowReady', 'pistol', 1 / 60);
    expect(HANDS_GUN.on).toBe(false);
    expect(HANDS_GUN.s).toBe(1);
    // the gun params never apply without a gun (knife, none)
    handsSet('knife', 'idle', HP.gunScale!, 1.5);
    handsBegin('idle', 'knife');
    expect(HANDS_GUN.on).toBe(false);
    handsEnd();
    expect(HANDS_CUR.on).toBe(false);
  });

  it('finger curl is the mean of the five; the trigger mode switches at once', () => {
    handsSet('rifle', 'aim', HP.indexRCurl!, 0.5);
    handsSet('rifle', 'aim', HP.thumbRCurl!, 0.5);
    handsSet('rifle', 'aim', HP.trigger!, -1);
    handsBegin('aim', 'rifle', 1 / 60);
    expect(HANDS_CUR.trigger).toBe(-1);
    for (let k = 0; k < 120; k++) handsBegin('aim', 'rifle', 1 / 60);
    expect(HANDS_CUR.curl[0]).toBeCloseTo(0.2, 12);
    expect(HANDS_CUR.curl[1]).toBe(0);
  });

  it('the gun visual keeps the grip point; rotInto is Babylon rotateByQuaternion', () => {
    const q = Quaternion.RotationYawPitchRoll(0.3, -0.2, 0.5);
    const v = new Vector3(0.1, -0.2, 0.7);
    const out = { x: 0, y: 0, z: 0 };
    rotInto(q.x, q.y, q.z, q.w, v.x, v.y, v.z, out);
    const ref = v.rotateByQuaternionToRef(q, new Vector3());
    expect(out.x).toBeCloseTo(ref.x, 6);
    expect(out.y).toBeCloseTo(ref.y, 6);
    expect(out.z).toBeCloseTo(ref.z, 6);
    const g = { x: 0, y: -0.05, z: 0 };
    const p = { ...g };
    gunVisualPoint({ on: true, s: 1.7, tx: 0, ty: 0, tz: 0, qx: q.x, qy: q.y, qz: q.z, qw: q.w }, g, p);
    expect(p.x).toBeCloseTo(g.x, 12);
    expect(p.y).toBeCloseTo(g.y, 12);
    expect(p.z).toBeCloseTo(g.z, 12);
  });

  it('save / export are additive; an old record loads as all default; junk is skipped', () => {
    const rec = tuneSnapshot();
    expect(handsAttach(rec)).toBe(rec);
    handsSet('pistol', 'aim', HP.supportSlide!, 0.03);
    handsSet('none', 'run', HP.footRUp!, 0.01);
    const saved = JSON.parse(JSON.stringify(handsAttach(rec))) as Record<string, unknown>;
    expect(saved.hands).toEqual({ version: 1, values: { none: { run: { footRUp: 0.01 } }, pistol: { aim: { supportSlide: 0.03 } } } });
    expect(handsSnapshot().values.pistol!.aim!.supportSlide).toBe(0.03);
    handsLoad(undefined);
    expect(handsGet('pistol', 'aim', HP.supportSlide!)).toBe(0);
    tuneLoad(saved);
    handsLoadFrom(saved);
    expect(handsGet('pistol', 'aim', HP.supportSlide!)).toBe(0.03);
    expect(handsGet('none', 'run', HP.footRUp!)).toBe(0.01);
    // a literal 4.20 record (no `hands` key)
    handsLoadFrom({ version: 1, body: {}, gun: {} });
    expect(handsGroupChanged('pistol', 'aim')).toBe(false);
    handsLoad({ values: { bogus: { aim: { gunX: 1 } }, rifle: { nope: { gunX: 1 }, aim: { gunX: 'x', huh: 2, gunY: 0.01 } } } });
    expect(handsGet('rifle', 'aim', HP.gunY!)).toBe(0.01);
    expect(handsGet('rifle', 'aim', HP.gunX!)).toBe(0);
  });
});

const NAMES = ['hips', 'spine', 'torso', 'neck', 'headNode', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'] as const;

describe('tuneHands on the real rig', () => {
  it('identity is bit-identical; a hand rotation turns only that wrist; a foot offset moves that leg only', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const run = (window: boolean): number[][] => {
      vi.spyOn(Math, 'random').mockReturnValue(0.25);
      const scene = new Scene(new NullEngine());
      const lib = new PartLibrary(scene);
      const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
      rg.carrier = true;
      const rp = { speed: 1.4, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
      const out: number[][] = [];
      for (let k = 0; k < 90; k++) {
        rg.root.position.z += rp.speed / 60;
        if (window) handsBegin('walk', handsWeaponOf(rg), k === 0 ? Infinity : 1 / 60); // a fresh run jumps (no ease from the last)
        rg.animate(1 / 60, rp);
        handsEnd();
        if (k % 15 === 14) {
          for (const n of NAMES) {
            const q = (rg as unknown as Record<string, { rotationQuaternion: Quaternion }>)[n]!.rotationQuaternion;
            out.push([q.x, q.y, q.z, q.w]);
          }
          out.push([rg.handGrip.l, rg.handGrip.r, rg.rightTrigger ? 1 : 0]);
        }
      }
      rg.dispose();
      scene.dispose();
      vi.restoreAllMocks();
      return out;
    };
    const base = run(false);
    expect(run(false)).toEqual(base);
    handsSet('none', 'run', HP.handRFwd!, 0.1); // another state: never applied
    handsSet('rifle', 'walk', HP.gunScale!, 1.5); // another weapon: never applied
    ikSet('run', 1, 0); // IK strength in another state: never applied
    expect(run(true)).toEqual(base);
    const per = NAMES.length + 1;
    const only = (tuned: number[][], moved: readonly string[]): void => {
      let any = false;
      for (let i = 0; i < base.length; i++) {
        const n = i % per;
        const name = n < NAMES.length ? NAMES[n]! : '';
        if (moved.includes(name)) any ||= Math.abs(base[i]![0]! - tuned[i]![0]!) + Math.abs(base[i]![1]! - tuned[i]![1]!) > 1e-4;
        else expect(tuned[i]).toEqual(base[i]);
      }
      expect(any).toBe(true);
    };
    handsSet('none', 'walk', HP.handRPitch!, 30);
    only(run(true), ['wristR']);
    handsResetAll();
    handsSet('none', 'walk', HP.footLFwd!, 0.08);
    only(run(true), ['hipL', 'kneeL', 'ankleL']);
    handsResetAll();
    // a remote (outside the window) is untouched
    handsSet('none', 'walk', HP.handLUp!, 0.1);
    expect(run(false)).toEqual(base);
  });

  it('gun scale / position / rotation are visual only: the muzzle and the weapon node are unchanged, the mesh and support hand move', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Mesh } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../src/weapons/weaponModel');
    const { WEAPONS } = await import('../src/weapons/weaponDefs');
    const run = (): { muzzle: number[][]; node: number[][]; mesh: number[][]; wristL: number[][]; wristR: number[][] } => {
      vi.spyOn(Math, 'random').mockReturnValue(0.25);
      const scene = new Scene(new NullEngine());
      const lib = new PartLibrary(scene);
      const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
      rg.carrier = true;
      const rifle = new WeaponModel(scene, lib, WEAPONS.rifle, DEFAULT_WEAPON_COLORS, rg.root);
      const mesh = new Mesh('fake-baked', scene); // stands in for the async baked mesh
      mesh.parent = rifle.node;
      rifle.mesh = mesh;
      rifle.hold(rg);
      const rp = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: true, stride: 'facing' as const };
      const r = { muzzle: [] as number[][], node: [] as number[][], mesh: [] as number[][], wristL: [] as number[][], wristR: [] as number[][] };
      const mz = new Vector3();
      for (let k = 0; k < 60; k++) {
        handsBegin('lowReady', handsWeaponOf(rg), k === 0 ? Infinity : 1 / 60);
        rg.animate(1 / 60, rp);
        handsEnd();
        if (k % 10 === 9) {
          rifle.muzzleWorld(mz);
          r.muzzle.push([mz.x, mz.y, mz.z]);
          r.node.push(Array.from(rifle.node.computeWorldMatrix(true).asArray()));
          r.mesh.push(Array.from(mesh.computeWorldMatrix(true).asArray()));
          const l = rg.wristL.getAbsolutePosition();
          const rr = rg.wristR.getAbsolutePosition();
          r.wristL.push([l.x, l.y, l.z]);
          r.wristR.push([rr.x, rr.y, rr.z]);
        }
      }
      rifle.holster(rg, 'sling');
      expect(mesh.scaling.x).toBe(1); // holstered: the mesh back to its own pose
      rg.dispose();
      scene.dispose();
      vi.restoreAllMocks();
      return r;
    };
    const base = run();
    expect(run()).toEqual(base);
    handsSet('rifle', 'lowReady', HP.gunScale!, 1.6);
    handsSet('rifle', 'lowReady', HP.gunZ!, 0.04);
    handsSet('rifle', 'lowReady', HP.gunPitch!, 8);
    const tuned = run();
    expect(tuned.muzzle).toEqual(base.muzzle);
    expect(tuned.node).toEqual(base.node);
    expect(tuned.wristR).toEqual(base.wristR); // the trigger hand stays: the gun moves in it
    expect(tuned.mesh).not.toEqual(base.mesh);
    expect(tuned.wristL).not.toEqual(base.wristL); // the support hand follows the rendered gun
    // a support slide alone: the gun, muzzle and trigger hand unchanged, the support hand moves
    handsResetAll();
    handsSet('rifle', 'lowReady', HP.supportSlide!, 0.05);
    const slid = run();
    expect(slid.muzzle).toEqual(base.muzzle);
    expect(slid.mesh).toEqual(base.mesh);
    expect(slid.wristL).not.toEqual(base.wristL);
  });
});

describe('IK targeting strength', () => {
  it('defaults to 1 per limb per state; clamps; resets; eases; saves additively', () => {
    expect(ikGet('walk', 0)).toBe(1);
    expect(ikSet('walk', 2, -3)).toBe(true);
    expect(ikGet('walk', 2)).toBe(0);
    expect(ikSet('walk', 2, Number.NaN)).toBe(false);
    expect(ikGroupChanged('walk')).toBe(true);
    ikReset('walk', 2);
    expect(ikGroupChanged('walk')).toBe(false);
    ikSet('aim', 1, 0.5);
    const saved = JSON.parse(JSON.stringify(handsAttach({ version: 1 }))) as { hands: { ik: Record<string, number[]> } };
    expect(saved.hands.ik).toEqual({ aim: [1, 0.5, 1, 1] });
    handsLoad(undefined);
    expect(ikGet('aim', 1)).toBe(1);
    handsLoadFrom(saved);
    expect(ikGet('aim', 1)).toBe(0.5);
    handsBegin('aim', 'none');
    expect(HANDS_CUR.ikOn).toBe(true);
    handsBegin('walk', 'none', 1 / 60);
    expect(HANDS_CUR.ikOn).toBe(true); // easing back, not snapped
    for (let k = 0; k < 120; k++) handsBegin('walk', 'none', 1 / 60);
    expect(HANDS_CUR.ikOn).toBe(false);
    ikResetAll();
    expect(ikGroupChanged('aim')).toBe(false);
  });

  it('on the real rig: 1 leaves the IK; 0 lets item 1 joint offsets through exactly (rest + offset)', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const run = (): Record<string, number[]> => {
      vi.spyOn(Math, 'random').mockReturnValue(0.25);
      const scene = new Scene(new NullEngine());
      const lib = new PartLibrary(scene);
      const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
      rg.carrier = true;
      const rp = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
      for (let k = 0; k < 90; k++) {
        jointsBegin('idle', k === 0 ? Infinity : 1 / 60);
        handsBegin('idle', 'none', k === 0 ? Infinity : 1 / 60);
        rg.animate(1 / 60, rp);
        handsEnd();
        jointsEnd();
      }
      const out: Record<string, number[]> = {};
      for (const n of ['elbowR', 'kneeL']) {
        const q = (rg as unknown as Record<string, { rotationQuaternion: Quaternion }>)[n]!.rotationQuaternion;
        out[n] = [q.x, q.y, q.z, q.w];
      }
      rg.dispose();
      scene.dispose();
      vi.restoreAllMocks();
      return out;
    };
    const base = run();
    // all strengths 1 (default): unchanged
    expect(run()).toEqual(base);
    jointsSet('idle', J.elbowR, 0, 40);
    jointsSet('idle', J.kneeL, 0, 30);
    const off = new Float64Array(8);
    eulerQuat((40 * Math.PI) / 180, 0, 0, off, 0);
    eulerQuat((30 * Math.PI) / 180, 0, 0, off, 4);
    const near = (q: number[], o: number): number => Math.abs(q[0]! * off[o]! + q[1]! * off[o + 1]! + q[2]! * off[o + 2]! + q[3]! * off[o + 3]!);
    const full = run();
    expect(near(full.elbowR!, 0)).toBeLessThan(0.999); // the IK pose under the offset
    ikSet('idle', 1, 0);
    ikSet('idle', 2, 0);
    const free = run();
    expect(near(free.elbowR!, 0)).toBeGreaterThan(0.99999); // exactly the joint offset on the rest pose
    expect(near(free.kneeL!, 4)).toBeGreaterThan(0.99999);
  });

  it('(CHECK2) active state: right hand IK 0 + an elbowR offset shows the offset on rest; the left arm and legs unchanged; 1 = unchanged', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const NODES = ['shoulderR', 'elbowR', 'wristR', 'shoulderL', 'elbowL', 'wristL', 'hipL', 'kneeL', 'ankleL', 'hipR', 'kneeR', 'ankleR'] as const;
    const run = (): Record<string, number[]> => {
      vi.spyOn(Math, 'random').mockReturnValue(0.25);
      const scene = new Scene(new NullEngine());
      const lib = new PartLibrary(scene);
      const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
      rg.carrier = true;
      const rp = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
      for (let k = 0; k < 90; k++) {
        jointsBegin('idle', k === 0 ? Infinity : 1 / 60);
        handsBegin('idle', 'none', k === 0 ? Infinity : 1 / 60);
        rg.animate(1 / 60, rp);
        handsEnd();
        jointsEnd();
      }
      const out: Record<string, number[]> = {};
      for (const n of NODES) {
        const q = (rg as unknown as Record<string, { rotationQuaternion: Quaternion }>)[n]!.rotationQuaternion;
        out[n] = [q.x, q.y, q.z, q.w];
      }
      rg.dispose();
      scene.dispose();
      vi.restoreAllMocks();
      return out;
    };
    jointsSet('idle', J.elbowR, 0, 40);
    const ik1 = run(); // strength 1: the IK pose under the offset
    const off = new Float64Array(4);
    eulerQuat((40 * Math.PI) / 180, 0, 0, off, 0);
    const near = (q: number[]): number => Math.abs(q[0]! * off[0]! + q[1]! * off[1]! + q[2]! * off[2]! + q[3]! * off[3]!);
    expect(near(ik1.elbowR!)).toBeLessThan(0.999);
    ikSet('idle', 1, 0);
    const fk = run();
    expect(near(fk.elbowR!)).toBeGreaterThan(0.99999); // rest + the offset exactly
    expect(fk.elbowR).not.toEqual(ik1.elbowR); // the right arm moved
    for (const n of NODES) if (!n.endsWith('R') || n.startsWith('hip') || n.startsWith('knee') || n.startsWith('ankle')) expect(fk[n], n).toEqual(ik1[n]);
    ikSet('idle', 1, 1);
    expect(run()).toEqual(ik1);
  });
});
