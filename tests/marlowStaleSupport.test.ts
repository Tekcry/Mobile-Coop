/**
 * (marlow-final S-e2e-fix, e2e-ctcourse:1 "A1 variant host: feet on the yard floor past the wall (12.52, 2.52, 7.00)") The
 * Havok character controller answers `checkSupport` from the contact manifold of its last `integrate`; `setPosition` does
 * not refresh it. A kinematic override (a hang, a climb, a team move) or a teleport moves the capsule with `setPosition`
 * only, so the first free step after it read the old floor (the wall top the hang began on) as support: `grounded` held
 * one step at the hang height after a let-go. The controller now checks the floor under it on that step.
 *
 * Real Havok (the bundled WASM) on a NullEngine scene.
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

const DT = 1 / 60;
const IDLE: PlayerInput = { moveX: 0, moveY: 0, crouchPressed: false, crouchHeld: false, crouchToggle: false, ads: false, aiming: false, reloading: false };

let engine: NullEngine;
let scene: Scene;

/** A static box (collision group `G.STATIC`) from min to max. */
function block(name: string, min: [number, number, number], max: [number, number, number]): void {
  const m = CreateBox(name, { width: max[0] - min[0], height: max[1] - min[1], depth: max[2] - min[2] }, scene);
  m.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  const a = new PhysicsAggregate(m, PhysicsShapeType.BOX, { mass: 0 }, scene);
  a.shape.filterMembershipMask = G.STATIC;
}

/** One fixed step as the game runs it: the controller, then the physics world. */
function step(c: PlayerController, n = 1): void {
  for (let i = 0; i < n; i++) {
    c.fixedUpdate(DT, IDLE, 0);
    (scene.getPhysicsEngine() as unknown as { _step(dt: number): void })._step(DT);
  }
}

beforeAll(async () => {
  const wasm = readFileSync(path.resolve('node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm'));
  const hk = await HavokPhysics({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer });
  engine = new NullEngine();
  scene = new Scene(engine);
  const plugin = new HavokPlugin(false, hk);
  plugin.setTimeStep(DT);
  scene.enablePhysics(GRAVITY, plugin);
  // the yard floor and a 4.4 m wall (A1's boundary wall: x 11.7-12.3)
  block('floor', [-10, -0.5, -10], [30, 0, 20]);
  block('wall', [11.7, 0, 0], [12.3, 4.4, 14]);
});

afterAll(() => {
  scene?.dispose();
  engine?.dispose();
});

describe('stale support after a kinematic override (S-e2e-fix)', () => {
  it('standing on the wall top, the controller is grounded there', () => {
    const c = new PlayerController(scene, new Vector3(12.0, 4.4, 7), Math.PI / 2);
    step(c, 20);
    expect(c.grounded).toBe(true);
    expect(c.pos.y).toBeGreaterThan(4.3);
    c.dispose();
  });

  it('a let-go from a hang under the wall top is airborne on its first free step and lands on the yard floor', () => {
    const c = new PlayerController(scene, new Vector3(12.0, 4.4, 7), Math.PI / 2);
    step(c, 20);
    expect(c.grounded).toBe(true);
    // lowered into a hang on the yard face (the kinematic override the attach drives), as the hang-drop does
    const hang = new Vector3(12.52, 2.52, 7);
    c.override = { kinematic: hang };
    step(c, 30);
    expect(Math.abs(c.pos.y - 2.52)).toBeLessThan(0.05);
    // the let-go: the override goes, gravity takes over
    c.override = null;
    step(c, 1);
    expect(c.grounded).toBe(false);
    let t = 0;
    while (!(c.grounded && c.pos.y < 0.3) && t < 3) {
      step(c, 1);
      t += DT;
    }
    expect(c.pos.y).toBeLessThan(0.3);
    expect(c.pos.x).toBeGreaterThan(12.3);
    expect(t).toBeLessThan(1.2);
    // a real fall, measured from the hang height
    expect(c.lastFall).toBeGreaterThan(2);
    c.dispose();
  });

  it('a kinematic move that ends on a floor stays grounded on its first free step (a climb-up onto the wall top)', () => {
    const c = new PlayerController(scene, new Vector3(5, 0, 7), Math.PI / 2);
    step(c, 20);
    c.override = { kinematic: new Vector3(12.0, 4.4, 7) };
    step(c, 10);
    c.override = null;
    step(c, 1);
    expect(c.grounded).toBe(true);
    expect(c.pos.y).toBeGreaterThan(4.3);
    c.dispose();
  });

  it('a teleport into the air is airborne on the next step; a teleport onto a floor is grounded', () => {
    const c = new PlayerController(scene, new Vector3(5, 0, 7), Math.PI / 2);
    step(c, 20);
    c.teleport(new Vector3(5, 3, 7));
    step(c, 1);
    expect(c.grounded).toBe(false);
    for (let i = 0; i < 120 && !c.grounded; i++) step(c, 1);
    expect(c.grounded).toBe(true);
    c.teleport(new Vector3(12.0, 4.4, 7));
    step(c, 1);
    expect(c.grounded).toBe(true);
    expect(c.pos.y).toBeGreaterThan(4.3);
    c.dispose();
  });
});
