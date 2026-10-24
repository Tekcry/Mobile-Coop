/**
 * (rig-pose-fix S5, audit G8 / G9 / P13) A downed guard's `Body.pos` and lie come from sim state only: the guard's feet
 * and yaw at death plus a pure settle offset along the fall (`bodyLie.ts`), the drop point on a put down. The ragdoll
 * (real Havok on a NullEngine) and the rig's pose never move them; the ragdoll eases onto the lie once it settles.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import HavokPhysics from '@babylonjs/havok';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HavokPlugin, PhysicsBody, PhysicsMotionType, PhysicsShapeBox, PhysicsShapeContainer, Quaternion, Scene, TransformNode, Vector3 } from '../src/core/babylon';
import { G } from '../src/physics/groups';
import { GRAVITY } from '../src/physics/havok';
import { Ballistics } from '../src/weapons/ballistics';
import { PartLibrary } from '../src/world/partLibrary';
import { CharacterRig } from '../src/player/characterRig';
import { defaultLook } from '../src/cosmetics/avatarLook';
import { ENEMIES } from '../src/ai/enemyDefs';
import { proportions } from '../src/player/proportions';
import { carrySide, chestOffset, deathLie, dropLie, headReach, lieLift, newLie, settleMax, type BodyLie } from '../src/ai/bodyLie';
import { Body, deathLieOn } from '../src/ai/body';
import { SNAP_EASE } from '../src/ai/ragdoll';
import type { DamageRegistry } from '../src/game/damage';
import type { PropSystem } from '../src/world/props';
import type { Vfx } from '../src/vfx/vfx';
import type { World } from '../src/world/world';

const grunt = ENEMIES.grunt;
const P = proportions(grunt.build ?? 'average', grunt.height);
const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

describe('bodyLie (pure)', () => {
  it('the same sim inputs give the same lie; only the impulse direction counts, not its size', () => {
    const a = deathLie(newLie(), 3, 0.5, -2, 0.7, 4, -3, P);
    const b = deathLie(newLie(), 3, 0.5, -2, 0.7, 48, -36, P);
    expect(b).toEqual(a);
  });

  it('the head points along the fall, the pelvis settles settleMax along it at the lying height, the chest beyond it', () => {
    const l = deathLie(newLie(), 1, 2, 3, 0, 1, 0, P);
    expect(near(l.headYaw, Math.PI / 2)).toBe(true);
    expect(l.x).toBeCloseTo(1 + settleMax(P), 9);
    expect(l.z).toBeCloseTo(3, 9);
    expect(l.y).toBeCloseTo(2 + lieLift(P), 9);
    expect(l.cx - l.x).toBeCloseTo(chestOffset(P), 9);
    expect(l.cy).toBe(l.y);
    expect(chestOffset(P)).toBeGreaterThan(0.2);
    expect(chestOffset(P)).toBeLessThan(0.35);
  });

  it('no horizontal impulse: he falls backward from his facing', () => {
    const yaw = 0.4;
    const l = deathLie(newLie(), 0, 0, 0, yaw, 0, 0, P);
    expect(near(wrap(l.headYaw - (yaw + Math.PI)), 0, 1e-9)).toBe(true);
    expect(l.x).toBeCloseTo(-Math.sin(yaw) * settleMax(P), 9);
    expect(l.z).toBeCloseTo(-Math.cos(yaw) * settleMax(P), 9);
  });

  it('a wall on the fall line holds the pelvis back so the body fits (never past his feet)', () => {
    const open = deathLie(newLie(), 0, 0, 0, 0, 0, 1, P);
    const room = headReach(P) + 0.1;
    const tight = deathLie(newLie(), 0, 0, 0, 0, 0, 1, P, room);
    const wall = deathLie(newLie(), 0, 0, 0, 0, 0, 1, P, 0.3);
    expect(open.z).toBeCloseTo(settleMax(P), 9);
    expect(tight.z).toBeCloseTo(0.1, 9);
    expect(wall.z).toBe(0);
  });

  it('a put down lies with the pelvis at the drop point, the head its way', () => {
    const l = dropLie(newLie(), 5, 1, -4, Math.PI, P);
    expect([l.x, l.z, l.headYaw]).toEqual([5, -4, Math.PI]);
    expect(l.y).toBeCloseTo(1 + lieLift(P), 9);
    expect(l.cz).toBeCloseTo(-4 - chestOffset(P), 9);
  });

  it('the carry shoulder from the lie: the head to the carrier\'s right takes the right shoulder, to his left the left', () => {
    // he faces +Z (liftYaw 0): +X is his right
    expect(carrySide(Math.PI / 2, 0)).toBe(1);
    expect(carrySide(-Math.PI / 2, 0)).toBe(-1);
    // facing +X (liftYaw PI/2): his right is -Z (yaw PI)
    expect(carrySide(Math.PI, Math.PI / 2)).toBe(1);
    expect(carrySide(0, Math.PI / 2)).toBe(-1);
  });
});

// ----- Body on real Havok: the ragdoll and the rig never move Body.pos -----

let engine: NullEngine;
let scene: Scene;
let lib: PartLibrary;
let bal: Ballistics;
let world: World;

function levelStatic(name: string, centre: Vector3, size: Vector3): void {
  const root = new TransformNode(name, scene);
  const container = new PhysicsShapeContainer(scene);
  container.addChild(new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), size, scene), centre, Quaternion.Identity());
  container.filterMembershipMask = G.STATIC;
  container.filterCollideMask = 0xffffffff & ~G.STATIC;
  const body = new PhysicsBody(root, PhysicsMotionType.STATIC, false, scene);
  body.shape = container;
}

const step = (): void => (scene.getPhysicsEngine() as unknown as { _step(dt: number): void })._step(1 / 60);

beforeAll(async () => {
  const wasm = readFileSync(path.resolve('node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm'));
  const hk = await HavokPhysics({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer });
  engine = new NullEngine();
  scene = new Scene(engine);
  scene.enablePhysics(GRAVITY, new HavokPlugin(false, hk));
  lib = new PartLibrary(scene);
  bal = new Ballistics(scene, { lookup: () => undefined } as unknown as DamageRegistry, { get: () => undefined } as unknown as PropSystem, {} as Vfx);
  world = { parts: lib, addShadowCaster: () => undefined } as unknown as World;
  // the floor (top at y 0) and a wall across +Z at z 21 (the fall-room lane at x 20)
  levelStatic('floor', new Vector3(0, -0.5, 0), new Vector3(80, 1, 80));
  levelStatic('wall', new Vector3(20, 1.5, 21), new Vector3(2, 3, 0.3));
  step();
});

afterAll(() => {
  scene?.dispose();
  engine?.dispose();
});

function guardRig(): CharacterRig {
  const r = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), grunt.look, grunt.height);
  r.groundProbe = () => 0;
  return r;
}

/** A guard rig posed somewhere else than his sim feet (render root, a stride, a lean): what the rig shows. */
function posedRig(x: number, z: number, yaw: number, k: number): CharacterRig {
  const r = guardRig();
  r.root.position.set(x + 0.4 * k, 0, z - 0.3 * k);
  r.root.rotation.y = yaw + 0.8 * k;
  Quaternion.RotationYawPitchRollToRef(0, -0.7 * k, 0, r.hipL.rotationQuaternion!);
  Quaternion.RotationYawPitchRollToRef(0, 0.5 * k, 0.2 * k, r.torso.rotationQuaternion!);
  return r;
}

const posOf = (b: Body): [number, number, number] => [b.pos.x, b.pos.y, b.pos.z];
const lieOf = (b: Body): BodyLie => ({ ...b.lie });

describe('Body: position and lie from sim (real Havok ragdoll)', () => {
  it('same sim inputs -> the same Body.pos and lie, ragdoll or laid flat, whatever the rig shows, through the settle', () => {
    const lie = deathLieOn(newLie(), bal, 0, 0, 0, 0.3, 0.6, 0.8, P);
    const imp = new Vector3(0.6 * 30, 3, 0.8 * 30);
    const a = new Body(scene, world, grunt, true, posedRig(0, 0, 0.3, 0), imp, true, lie);
    const b = new Body(scene, world, grunt, true, posedRig(0, 0, 0.3, 1), imp, true, lie);
    const c = new Body(scene, world, grunt, true, posedRig(0, 0, 0.3, -1), new Vector3(-40, 20, 5), false, lie);
    const want: [number, number, number] = [lie.x, lie.y, lie.z];
    for (const x of [a, b, c]) {
      expect(posOf(x)).toEqual(want);
      expect(lieOf(x)).toEqual(lie);
    }
    for (let n = 0; n < 60 * 5; n++) {
      step();
      for (const x of [a, b, c]) x.update(1 / 60);
      if (n % 30 === 0) for (const x of [a, b, c]) expect(posOf(x)).toEqual(want);
      if (n === 200) {
        // still falling / lying where physics put it (not on the lie yet): the ragdoll really moved, Body.pos did not
        const r = a.view!;
        r.hips.computeWorldMatrix(true);
        const hp = r.hips.getAbsolutePosition();
        expect(Math.abs(hp.x - lie.x) + Math.abs(hp.y - lie.y) + Math.abs(hp.z - lie.z), 'the ragdoll off the lie before it settles').toBeGreaterThan(0.05);
      }
    }
    for (const x of [a, b, c]) {
      expect(posOf(x)).toEqual(want);
      expect(lieOf(x)).toEqual(lie);
      expect(x.simulating).toBe(false);
    }
    // the settled ragdolls eased onto the lie: pelvis on its pelvis, head its way
    for (const x of [a, b, c]) {
      const r = x.view!;
      r.hips.computeWorldMatrix(true);
      r.headNode.computeWorldMatrix(true);
      const hp = r.hips.getAbsolutePosition();
      const hd = r.headNode.getAbsolutePosition();
      expect(Math.abs(hp.x - lie.x), 'pelvis x').toBeLessThan(0.02);
      expect(Math.abs(hp.z - lie.z), 'pelvis z').toBeLessThan(0.02);
      // (the ragdolls turn exactly onto it; the laid one keeps its spine's death bend: the head a little off the axis)
      expect(Math.abs(wrap(Math.atan2(hd.x - hp.x, hd.z - hp.z) - lie.headYaw)), 'head yaw').toBeLessThan(x === c ? 0.2 : 0.02);
    }
    expect(SNAP_EASE).toBeLessThan(1);
    for (const x of [a, b, c]) x.dispose();
  });

  it('the step-in reads the lie: chest point and head yaw from sim, whatever the rig shows', () => {
    const lie = deathLieOn(newLie(), null, 10, 0, 0, Math.PI, 0, 0, P);
    const b = new Body(scene, world, grunt, false, posedRig(12, 3, 1, 1), new Vector3(), false, lie);
    const ch = new Vector3();
    const yaw = b.lieChest(ch);
    expect([ch.x, ch.y, ch.z, yaw]).toEqual([lie.cx, lie.cy, lie.cz, lie.headYaw]);
    // laid without a ragdoll: the rig lies on the lie (pelvis on it, head its way)
    const r = b.view!;
    r.hips.computeWorldMatrix(true);
    r.headNode.computeWorldMatrix(true);
    const hp = r.hips.getAbsolutePosition();
    expect(Math.abs(hp.x - lie.x) + Math.abs(hp.z - lie.z)).toBeLessThan(0.05);
    const hd = r.headNode.getAbsolutePosition();
    // (its spine keeps the death bend: the head a little off the body's axis)
    expect(Math.abs(wrap(Math.atan2(hd.x - hp.x, hd.z - hp.z) - lie.headYaw))).toBeLessThan(0.2);
    b.dispose();
  });

  it('a wall on the fall line (static collision) holds the pelvis back', () => {
    // feet at (20, 0, 20), the wall's face at z 20.85: falling +Z there is less room than the body
    const open = deathLieOn(newLie(), bal, 30, 0, 20, 0, 0, 1, P);
    const wall = deathLieOn(newLie(), bal, 20, 0, 20, 0, 0, 1, P);
    expect(open.z - 20).toBeCloseTo(settleMax(P), 6);
    expect(wall.z - 20).toBeLessThan(0.01);
    expect(wall.z).toBeGreaterThanOrEqual(20);
  });

  for (const ragdollOk of [false, true]) {
    it(`a put down sets Body.pos and the lie from the drop point (${ragdollOk ? 'ragdoll' : 'laid flat'})`, () => {
      const lie = deathLieOn(newLie(), null, -10, 0, -10, 0, 1, 0, P);
      const b = new Body(scene, world, grunt, false, guardRig(), new Vector3(), false, lie);
      const carrier = guardRig();
      carrier.root.position.set(-5, 0, -5);
      b.pickUp(carrier.torso, 0.15, 0.2);
      expect(b.carried).toBe(true);
      // carried: pos stays where it lay
      expect(posOf(b)).toEqual([lie.x, lie.y, lie.z]);
      const at = new Vector3(-4.5, 0, -5);
      b.drop(new Vector3(3, -1, 0), ragdollOk, at, Math.PI);
      const want = dropLie(newLie(), at.x, at.y, at.z, Math.PI, P);
      expect(posOf(b)).toEqual([want.x, want.y, want.z]);
      expect(lieOf(b)).toEqual(want);
      for (let n = 0; n < 60 * 3; n++) {
        step();
        b.update(1 / 60);
      }
      expect(posOf(b)).toEqual([want.x, want.y, want.z]);
      const r = b.view!;
      r.hips.computeWorldMatrix(true);
      const hp = r.hips.getAbsolutePosition();
      expect(Math.abs(hp.x - want.x) + Math.abs(hp.z - want.z), 'the rig lies on the drop lie').toBeLessThan(0.05);
      b.dispose();
      carrier.dispose();
    });
  }

  it('the rig proportions of a default operator give a sane lie too (any rig)', () => {
    const r = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
    const l = deathLie(newLie(), 0, 0, 0, 0, 0, 1, r.p);
    expect(l.y).toBeGreaterThan(0.08);
    expect(l.y).toBeLessThan(0.2);
    r.dispose();
  });
});
