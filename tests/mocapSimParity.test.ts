/**
 * (rig-pose-fix S7, audit G17) The mocap setting is per machine (`settings.gameplay.mocapLoco`, `?mocap=`): the mocap
 * strafe's side-step moved the player's gait clock, which drives the root modulation of the sim velocity, so the same
 * input walked a different path with mocap on. The side-step now moves the drawn clock only (`MotionDriver.simPhase`).
 * Same input, mocap on vs off: the same sim position trace. Real Havok (the bundled WASM) on a NullEngine scene.
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
import { LOCO, setMocapLocomotion } from '../src/anim/mocap';

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
  const m = CreateBox('floor', { width: 60, height: 1, depth: 60 }, scene);
  m.position.set(0, -0.5, 0);
  const a = new PhysicsAggregate(m, PhysicsShapeType.BOX, { mass: 0 }, scene);
  a.shape.filterMembershipMask = G.STATIC;
});

afterAll(() => {
  setMocapLocomotion(false);
  scene?.dispose();
  engine?.dispose();
});

/** The aimed strafe (left, a stop, right with the aim turned, a diagonal), standing; the feet every step. */
function walk(mocap: boolean, x0: number): number[] {
  setMocapLocomotion(mocap);
  const c = new PlayerController(scene, new Vector3(x0, 0, 0), 0);
  const inp: PlayerInput = { moveX: 0, moveY: 0, crouchPressed: false, crouchHeld: false, crouchToggle: false, ads: true, aiming: true, reloading: false };
  const out: number[] = [];
  const legs: [number, number, number, number][] = [[0, 0, 0, 20], [-1, 0, 0, 90], [0, 0, 0, 20], [0.8, 0, 0.5, 90], [0.6, 0.6, 0.5, 60]];
  for (const [mx, my, yaw, n] of legs)
    for (let k = 0; k < n; k++) {
      inp.moveX = mx;
      inp.moveY = my;
      c.fixedUpdate(DT, inp, yaw);
      (scene.getPhysicsEngine() as unknown as { _step(dt: number): void })._step(DT);
      out.push(c.pos.x - x0, c.pos.y, c.pos.z);
    }
  c.dispose();
  return out;
}

describe('rig-pose-fix S7: the mocap setting never moves the sim (G17)', () => {
  it('same input, mocap on vs off: the same position trace', () => {
    // the mocap set has its strafe captures (else the switch would not touch the clock at all)
    setMocapLocomotion(true);
    expect(LOCO.set.strafeL).not.toBeNull();
    expect(LOCO.set.strafeR).not.toBeNull();
    // two controllers far apart on one floor, one after the other
    const on = walk(true, -15);
    const off = walk(false, 15);
    expect(on.length).toBe(off.length);
    let worst = 0;
    for (let k = 0; k < on.length; k++) worst = Math.max(worst, Math.abs(on[k]! - off[k]!));
    console.info(`mocap on vs off: position trace max difference ${(worst * 1000).toFixed(3)} mm over ${on.length / 3} steps`);
    expect(worst).toBeLessThan(1e-4);
    // and it moved
    expect(Math.abs(off[off.length - 3]!)).toBeGreaterThan(0.5);
  });
});
