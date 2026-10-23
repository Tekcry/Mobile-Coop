/**
 * (guard-ai sniper triage) The S16 fire gate on real Havok: a plain wall built the way `LevelBuilder` builds the level's
 * static body (one `PhysicsShapeContainer`, its membership `G.STATIC` set on the container only, the box children left at
 * their default filter) is NOT armour. Havok reports no leaf shape for a container hit, and the container's filter reads
 * back as the default (every bit, the armour bit included) whatever was set on it, so reading the hit's shape bits made
 * every wall armour: a guard whose muzzle line touched his own cover held fire and dropped his wind-up (e2e-enemies
 * "sniper relocates after its shots": the sniper lost his wind-up at the start of each peek and never got his two shots
 * in). Armour is now the body's mark (`markArmoured`, set where `LevelBuilder.buildGlass` and `Doors.addBody` build an
 * armoured pane group / leaf; the helpers below mirror them), read by `isArmouredBody`.
 *
 * Real Havok (the bundled WASM) on a NullEngine scene.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import HavokPhysics from '@babylonjs/havok';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  HavokPlugin,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeBox,
  PhysicsShapeContainer,
  Quaternion,
  Scene,
  TransformNode,
  Vector3,
} from '../src/core/babylon';
import { G, MASK, doorMembership, glassMembership, isArmoured, markArmoured } from '../src/physics/groups';
import { GRAVITY } from '../src/physics/havok';
import { Ballistics } from '../src/weapons/ballistics';
import type { DamageRegistry } from '../src/game/damage';
import type { PropSystem } from '../src/world/props';
import type { Vfx } from '../src/vfx/vfx';

let engine: NullEngine;
let scene: Scene;
let bal: Ballistics;

/** A static body as `LevelBuilder.build` makes the level's: a container whose membership is set, children left default. */
function levelStatic(name: string, centre: Vector3, size: Vector3): void {
  const root = new TransformNode(name, scene);
  const container = new PhysicsShapeContainer(scene);
  container.addChild(new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), size, scene), centre, Quaternion.Identity());
  container.filterMembershipMask = G.STATIC;
  container.filterCollideMask = 0xffffffff & ~G.STATIC;
  const body = new PhysicsBody(root, PhysicsMotionType.STATIC, false, scene);
  body.shape = container;
}

/** A pane group as `LevelBuilder.buildGlass` makes it: container and children carry the membership. */
function paneGroup(name: string, centre: Vector3, size: Vector3, member: number): void {
  const root = new TransformNode(name, scene);
  const gc = new PhysicsShapeContainer(scene);
  const s = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), size, scene);
  s.filterMembershipMask = member;
  gc.addChild(s, centre, Quaternion.Identity());
  gc.filterMembershipMask = member;
  const body = new PhysicsBody(root, PhysicsMotionType.STATIC, false, scene);
  body.shape = gc;
  if (isArmoured(member)) markArmoured(body);
}

/** A door leaf as `doors.ts` makes it: one box shape with `doorMembership`. */
function leaf(name: string, centre: Vector3, size: Vector3, armoured: boolean): void {
  const root = new TransformNode(name, scene);
  root.position.copyFrom(centre);
  const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), size, scene);
  shape.filterMembershipMask = doorMembership(armoured);
  const body = new PhysicsBody(root, PhysicsMotionType.STATIC, false, scene);
  body.shape = shape;
  if (armoured) markArmoured(body);
}

beforeAll(async () => {
  const wasm = readFileSync(path.resolve('node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm'));
  const hk = await HavokPhysics({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer });
  engine = new NullEngine();
  scene = new Scene(engine);
  scene.enablePhysics(GRAVITY, new HavokPlugin(false, hk));
  const registry = { lookup: () => undefined } as unknown as DamageRegistry;
  const props = { get: () => undefined } as unknown as PropSystem;
  bal = new Ballistics(scene, registry, props, {} as Vfx);
  // four fire lanes along +z at x 0, 10, 20, 30: a plain level wall, an armoured pane, a plain pane, an armoured leaf
  levelStatic('level', new Vector3(0, 1.5, 5), new Vector3(2, 3, 0.3));
  paneGroup('armoured-pane', new Vector3(10, 1.5, 5), new Vector3(2, 3, 0.05), glassMembership('clear', true));
  paneGroup('plain-pane', new Vector3(20, 1.5, 5), new Vector3(2, 3, 0.05), glassMembership('clear', false));
  leaf('armoured-leaf', new Vector3(30, 1.5, 5), new Vector3(1, 2.2, 0.1), true);
  leaf('plain-leaf', new Vector3(40, 1.5, 5), new Vector3(1, 2.2, 0.1), false);
  (scene.getPhysicsEngine() as unknown as { _step(dt: number): void })._step(1 / 60);
});

afterAll(() => {
  scene?.dispose();
  engine?.dispose();
});

const lane = (x: number): [Vector3, Vector3] => [new Vector3(x, 1.4, 0), new Vector3(x, 1.4, 10)];

describe('guard-ai S16 fire gate on real Havok: what is armour', () => {
  it('a plain level wall (container membership only, default children) is hit on the enemy shot mask but is not armour', () => {
    const [from, to] = lane(0);
    expect(bal.clear(from, to, MASK.ENEMY_SHOT)).toBe(false);
    expect(bal.armouredFirst(from, to, MASK.ENEMY_SHOT)).toBe(false);
    expect(bal.ray(from, to, MASK.ENEMY_SHOT).armoured).not.toBe(true);
  });

  it('an armoured pane and an armoured door leaf are armour; a plain pane is not on the mask; a plain leaf is not armour', () => {
    expect(bal.armouredFirst(...lane(10), MASK.ENEMY_SHOT)).toBe(true);
    expect(bal.ray(...lane(10), MASK.ENEMY_SHOT).armoured).toBe(true);
    expect(bal.clear(...lane(20), MASK.ENEMY_SHOT)).toBe(true);
    expect(bal.armouredFirst(...lane(30), MASK.ENEMY_SHOT)).toBe(true);
    expect(bal.armouredFirst(...lane(40), MASK.ENEMY_SHOT)).toBe(false);
  });
});

describe('guard-ai sniper triage: armour is marked where it is built', () => {
  it('LevelBuilder.buildGlass marks an armoured pane group, Doors.addBody an armoured leaf; ballistics reads the mark', () => {
    const lb = readFileSync(path.resolve('src/world/levelBuilder.ts'), 'utf8');
    expect(lb).toContain('if (group.armoured) markArmoured(body);');
    const doors = readFileSync(path.resolve('src/world/doors.ts'), 'utf8');
    expect(doors).toContain('if (a.armoured === true) markArmoured(body);');
    const b = readFileSync(path.resolve('src/weapons/ballistics.ts'), 'utf8');
    expect(b.match(/isArmouredBody\(r\.body\)/g)?.length).toBe(2);
    expect(b).not.toMatch(/filterMembershipMask/);
  });
});
