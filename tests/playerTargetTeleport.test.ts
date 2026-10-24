/**
 * (rig-pose-fix S1 fix round 2, e2e-stealth-ai 'search area' near) The local player's perception points (`center`,
 * `aimPoint`, `headPoint`) and hit volumes follow a teleport in the same fixed step: `PlayerTarget.sync` builds the sim
 * body from `controller.pos` (no cached or render-interpolated source), and `GameState.fixedUpdate` runs it after the
 * player's step and before the guards' (`enemyMgr.update`), so a guard never samples the old spot after any position set
 * (a test hook, a respawn, a rejoin placement, a hall-back, a rappel / vent exit). Real Havok on a NullEngine scene,
 * a real `PlayerController` and `PlayerTarget`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import HavokPhysics from '@babylonjs/havok';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CreateBox, HavokPlugin, PhysicsAggregate, PhysicsShapeType, Scene, Vector3 } from '../src/core/babylon';
import { G } from '../src/physics/groups';
import { GRAVITY } from '../src/physics/havok';
import { PlayerController, type PlayerInput } from '../src/player/playerController';
import { PlayerTarget } from '../src/game/playerTarget';
import { emptyPlayerBodyIn, emptyPlayerBodyOut, localBodyIn, playerBody } from '../src/player/playerVolumes';
import { WALL } from '../src/player/wallController';

const DT = 1 / 60;

let engine: NullEngine;
let scene: Scene;

beforeAll(async () => {
  const wasm = readFileSync(path.resolve('node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm'));
  const hk = await HavokPhysics({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer });
  engine = new NullEngine();
  scene = new Scene(engine);
  const plugin = new HavokPlugin(false, hk);
  plugin.setTimeStep(DT);
  scene.enablePhysics(GRAVITY, plugin);
  const m = CreateBox('floor', { width: 80, height: 1, depth: 80 }, scene);
  m.position.set(0, -0.5, 0);
  const a = new PhysicsAggregate(m, PhysicsShapeType.BOX, { mass: 0 }, scene);
  a.shape.filterMembershipMask = G.STATIC;
});

afterAll(() => {
  scene?.dispose();
  engine?.dispose();
});

function rig() {
  const c = new PlayerController(scene, new Vector3(-0.5, 0, 0), 0);
  const src = {
    position: c.pos,
    controller: c,
    carry: { raise: 0 },
    cam: { pitch: 0 },
    pose: { wall: false, wallSide: 0, lean: 0, traverse: 'none' as const, traverseT: 0, tumble: 0 },
    rootLift: { x: 0, y: 0, z: 0 },
    alive: true,
  };
  const registry = { register() {}, unregisterBody() {}, removeTarget() {} } as never;
  const target = new PlayerTarget(scene, registry, src as never);
  const inp: PlayerInput = { moveX: 0, moveY: 0, crouchPressed: false, crouchHeld: false, crouchToggle: false, ads: false, aiming: false, reloading: false };
  return { c, src, target, inp };
}

const pts = (t: PlayerTarget) => [t.center(new Vector3()), t.aimPoint(new Vector3()), t.headPoint(new Vector3())];

describe('PlayerTarget follows a teleport the same fixed step', () => {
  it('teleport, one controller step, sync: every point and the body are at the new place', () => {
    const { c, src, target, inp } = rig();
    for (let k = 0; k < 30; k++) {
      c.fixedUpdate(DT, inp, 0);
      target.sync(false);
    }
    for (const p of pts(target)) expect(Math.hypot(p.x + 0.5, p.z)).toBeLessThan(0.5);
    // the e2e's park spot, then the step a guard runs in
    c.teleport(new Vector3(0, 0, -20), 0);
    c.fixedUpdate(DT, inp, 0);
    target.sync(false);
    for (const p of pts(target)) {
      expect(Math.hypot(p.x, p.z + 20)).toBeLessThan(0.5);
      expect(p.y).toBeGreaterThan(0.5);
    }
    // exactly the model on this step's controller state (no older source)
    const ref = playerBody(localBodyIn(src, false, WALL.peekLean, emptyPlayerBodyIn()), emptyPlayerBodyOut());
    const head = target.headPoint(new Vector3());
    expect(Math.hypot(head.x - ref.head.x, head.y - ref.head.y, head.z - ref.head.z)).toBeLessThan(1e-9);
    expect(target.body.head.z).toBeCloseTo(ref.head.z, 9);
    target.dispose();
  });

  it('a sync right after a teleport (no controller step) already reads the new feet', () => {
    const { c, target, inp } = rig();
    c.fixedUpdate(DT, inp, 0);
    target.sync(false);
    c.teleport(new Vector3(6, 0, 4), Math.PI);
    target.sync(false);
    for (const p of pts(target)) expect(Math.hypot(p.x - 6, p.z - 4)).toBeLessThan(0.5);
    target.dispose();
  });

  it('GameState: the target syncs after the player step and before the guards perceive (wiring)', () => {
    const src = readFileSync(path.resolve('src/game/gameState.ts'), 'utf8');
    const start = src.indexOf('  fixedUpdate(dt: number): void {');
    expect(start).toBeGreaterThan(0);
    const body = src.slice(start);
    const step = body.indexOf('this.player.fixedUpdate(dt, inp);');
    const sync = body.indexOf('this.target.sync(');
    const guards = body.indexOf('this.enemyMgr?.update(dt);');
    expect(step).toBeGreaterThan(0);
    expect(sync).toBeGreaterThan(step);
    expect(guards).toBeGreaterThan(sync);
  });
});
