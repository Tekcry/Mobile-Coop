/**
 * (rig-pose-fix S1 fix round, check A B1) The tense sneak's kneel rule, owner vs host. The owner's controller does not
 * kneel crouched and still within `TENSE.radius` of an unaware guard (`kneeling = ... && !tense`); the host's
 * `RemotePlayer` rebuilt the kneel from the crouch flag and its stillness only, so its volumes knelt (~0.33 m on the
 * head) where the owner's body did not. Now both apply one rule on the same registered guards (`setTenseSource`).
 * Real Havok (the bundled WASM) on a NullEngine scene: the owner is a real `PlayerController`, the host a real
 * `RemotePlayer` fed the owner's state through the real `pstate` parse.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import HavokPhysics from '@babylonjs/havok';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { CreateBox, HavokPlugin, PhysicsAggregate, PhysicsShapeType, Scene, Vector3 } from '../src/core/babylon';
import { G } from '../src/physics/groups';
import { GRAVITY } from '../src/physics/havok';
import { PlayerController, type PlayerInput } from '../src/player/playerController';
import { emptyPlayerBodyIn, emptyPlayerBodyOut, localBodyIn, playerBody, wireKneel, wireTense, type PlayerBodyIn, type PlayerBodyOut } from '../src/player/playerVolumes';
import { setTenseSource, type TenseGuard } from '../src/player/tenseSneak';
import { WALL } from '../src/player/wallController';
import { emptyMoveState, packMoveState } from '../src/player/moveState';
import { parseMessage, PF, type PlayerState } from '../src/net/protocol';
import { RemotePlayer } from '../src/net/remotePlayer';
import { TENSE } from '../src/config/movement';

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

afterEach(() => setTenseSource(null));

afterAll(() => {
  scene?.dispose();
  engine?.dispose();
});

interface Run {
  ownerKneel: boolean;
  hostKneel: boolean;
  owner: PlayerBodyOut;
  host: PlayerBodyOut;
  hostIn: PlayerBodyIn;
}

/** The owner crouches and stands still for 1.5 s at (x0, 0), drawn at low ready; every step its state goes to the host's `RemotePlayer`. */
function crouchStill(x0: number, guards: TenseGuard[]): Run {
  setTenseSource(() => guards);
  const c = new PlayerController(scene, new Vector3(x0, 0, 0), 0);
  c.setCrouchToggle();
  const registry = { register() {}, removeTarget() {} } as never;
  const avatar = { rig: { height: 1.68 }, dispose() {} } as never;
  const rp = new RemotePlayer(scene, registry, 'client', avatar, new Vector3(x0, 0, 0));
  const inp: PlayerInput = { moveX: 0, moveY: 0, crouchPressed: false, crouchHeld: false, crouchToggle: true, ads: false, aiming: false, reloading: false };
  const ownerIn = emptyPlayerBodyIn();
  const owner = emptyPlayerBodyOut();
  const src = {
    position: c.pos,
    controller: c,
    carry: { raise: 0 },
    cam: { pitch: 0 },
    pose: { wall: false, wallSide: 0, lean: 0, traverse: 'none' as const, traverseT: 0, tumble: 0 },
    rootLift: { x: 0, y: 0, z: 0 },
  };
  for (let k = 0; k < 90; k++) {
    c.fixedUpdate(DT, inp, 0);
    (scene.getPhysicsEngine() as unknown as { _step(dt: number): void })._step(DT);
    // the owner's PlayerTarget.sync: the controller's kneel as it is, the pistol drawn at low ready (where the kneel moves
    // the head ~0.33 m)
    playerBody(localBodyIn(src, true, WALL.peekLean, ownerIn), owner);
    // the wire: what the owner sends, through the real parse, into the host's accept
    const f = (c.crouched ? PF.crouch : 0) | (c.grounded ? PF.grounded : 0);
    const msg = parseMessage({ t: 'pstate', s: { id: 'client', x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw, pitch: 0, speed: c.speed, f, w: 'pistolSd', hp: 100, mv: packMoveState({ ...emptyMoveState(), dw: 2 }) } });
    expect(msg?.t).toBe('pstate');
    rp.accept((msg as { s: PlayerState }).s, (k + 1) * DT);
  }
  const run = { ownerKneel: c.kneeling, hostKneel: rp.bodyIn.kneel, owner, host: rp.body, hostIn: rp.bodyIn };
  expect(c.crouched).toBe(true);
  expect(c.grounded).toBe(true);
  c.dispose();
  return run;
}

function worstJoint(a: PlayerBodyOut, b: PlayerBodyOut): number {
  let w = 0;
  for (const j of ['pelvis', 'chest', 'neck', 'head'] as const) {
    const dx = a[j].x - b[j].x;
    const dy = a[j].y - b[j].y;
    const dz = a[j].z - b[j].z;
    w = Math.max(w, Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  return w;
}

const guard = (x: number, z: number, level: string): TenseGuard => ({ pos: { x, z }, alive: true, alerted: level !== 'unaware', level });

describe('rig-pose-fix S1 fix round (check A B1): the host applies the owner tense-sneak kneel rule', () => {
  it('the rule: no kneel in the tense sneak; the tense sneak needs crouched, grounded, ground mode and an unaware guard near', () => {
    setTenseSource(() => [guard(2, 0, 'unaware')]);
    expect(wireTense(true, true, 'ground', 0, 0)).toBe(true);
    expect(wireTense(true, true, undefined, 0, 0)).toBe(true);
    expect(wireTense(false, true, 'ground', 0, 0)).toBe(false);
    expect(wireTense(true, false, 'ground', 0, 0)).toBe(false);
    expect(wireTense(true, true, 'wall', 0, 0)).toBe(false);
    expect(wireTense(true, true, 'ground', 10, 0)).toBe(false);
    expect(wireKneel(1, true)).toBe(false);
    expect(wireKneel(1, false)).toBe(true);
    expect(wireKneel(0.01, false)).toBe(false);
  });

  it('crouched and still with an unaware guard within 5 m: neither side kneels, the host volumes match the owner', () => {
    const r = crouchStill(-15, [guard(-15 + 3, 1, 'unaware')]);
    expect(r.ownerKneel).toBe(false);
    expect(r.hostKneel).toBe(false);
    expect(worstJoint(r.owner, r.host)).toBeLessThan(0.002);
  });

  it('the guard beyond 5 m: both kneel as before, and agree', () => {
    const r = crouchStill(0, [guard(TENSE.radius + 2, 0, 'unaware')]);
    expect(r.ownerKneel).toBe(true);
    expect(r.hostKneel).toBe(true);
    expect(worstJoint(r.owner, r.host)).toBeLessThan(0.002);
  });

  it('the guard within 5 m but aware: both kneel as before, and agree', () => {
    const r = crouchStill(15, [guard(15 + 3, 1, 'alert')]);
    expect(r.ownerKneel).toBe(true);
    expect(r.hostKneel).toBe(true);
    expect(worstJoint(r.owner, r.host)).toBeLessThan(0.002);
  });

  it('the kneel offset is large enough that a mismatch would show (the test can fail)', () => {
    // the same feet, the kneel from the old host rule (stillness only) vs the tense rule: well over the 2 mm bound
    const r = crouchStill(-5, [guard(-5 + 3, 1, 'unaware')]);
    const old = emptyPlayerBodyIn();
    Object.assign(old, r.hostIn);
    old.kneel = true;
    expect(worstJoint(playerBody(old, emptyPlayerBodyOut()), r.host)).toBeGreaterThan(0.1);
  });
});
