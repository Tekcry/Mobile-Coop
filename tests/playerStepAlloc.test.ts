/**
 * player-hygiene S1 (H2, the player half): the player's fixed step (`PlayerController.fixedUpdate`) and the traversal
 * probe / committed move (`TraversalController`) make no per-step garbage, and behave bit-identically.
 *
 * (a) Golden trace on real Havok (the bundled WASM on a NullEngine scene, as `tests/marlowStaleSupport.test.ts`): walk,
 *     run, turn and stop; crouch under a low ceiling and try to stand; step off a ledge; up a ramp; a kinematic override.
 *     Every step hashes the feet, the controller's velocity, yaw, grounded, crouched and speed.
 * (b) `bytesPerCall` on `fixedUpdate` per state with the character controller and the physics engine swapped for
 *     no-allocation stubs after construction (BRIEF A2: Babylon / Havok internals are outside the claim).
 * (c) The traversal probe (vault, mantle, drop, hop, nothing, a window), `probeDir`, and the committed vault / mantle /
 *     drop / hop / window moves through a minimal fake player on a box world: probe rows and per-step overrides and
 *     poses against the fixture; `bytesPerCall` on `probe`, `probeDir` and a committed step held mid-move.
 *
 * Fixture: `tests/fixtures/player-hygiene-s1.json`. `PH_S1_WRITE=1` rewrites it; only ever run that on the pre-refactor
 * code (the parity record). Values are hashed as float64 bit patterns (cyrb53 over the two words, -0 as +0, as
 * `tests/helpers/animSkeletonIdentity.ts`).
 *
 * Allocation: each state logs `bytesPerCall` and a sampling heap profile of the same call (`sampled`). After the refactor
 * (`REFACTORED`: `TraversalController.prototype.glassKey` exists) the profile must show no allocation bigger than a boxed
 * double (`HEAP_NUMBER`) on a step: no object, vector, array, closure or string. What is left is V8 boxing doubles that
 * cross calls it does not inline (16 B HeapNumbers: `ray` / `floor` hits returned as `number | null`, arguments to
 * `Vector3.set`, `MotionDriver.step`, `AnalogGear.update`, `hyp2`), which reads 32-700 B per call by state and varies
 * between runs with V8's inlining, so the bytes are logged, not asserted (player-hygiene S1 report).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Session } from 'node:inspector';
import path from 'node:path';
import HavokPhysics from '@babylonjs/havok';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CharacterSupportedState,
  CreateBox,
  HavokPlugin,
  PhysicsAggregate,
  PhysicsRaycastResult,
  PhysicsShapeType,
  Scene,
  Vector3,
  type CharacterSurfaceInfo,
} from '../src/core/babylon';
import { MOVEMENT } from '../src/config/movement';
import { G } from '../src/physics/groups';
import { GRAVITY } from '../src/physics/havok';
import { PlayerController, type MoveOverride, type PlayerInput } from '../src/player/playerController';
import { TraversalController } from '../src/player/traversal';
import type { Player } from '../src/player/player';
import type { Breakables } from '../src/world/breakables';
import { TraversalAnchors, type WindowAnchor } from '../src/world/anchors';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

const FIXTURE = path.resolve(__dirname, 'fixtures/player-hygiene-s1.json');
const WRITE = !!process.env.PH_S1_WRITE;
/** The refactor is in (a member it adds). */
const REFACTORED = 'glassKey' in TraversalController.prototype;
const DT = 1 / 60;
const ALLOC = { n: 1000, warm: 20000 };

class Hasher {
  private h1 = 0xdeadbeef;
  private h2 = 0x41c6ce57;
  private readonly f = new Float64Array(1);
  private readonly u = new Uint32Array(this.f.buffer);
  add(v: number): void {
    this.f[0] = v === 0 ? 0 : v;
    for (let k = 0; k < 2; k++) {
      const c = this.u[k]!;
      this.h1 = Math.imul(this.h1 ^ c, 2654435761);
      this.h2 = Math.imul(this.h2 ^ c, 1597334677);
    }
  }
  digest(): string {
    let h1 = Math.imul(this.h1 ^ (this.h1 >>> 16), 2246822507);
    h1 ^= Math.imul(this.h2 ^ (this.h2 >>> 13), 3266489909);
    let h2 = Math.imul(this.h2 ^ (this.h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }
}

interface Run {
  steps: number;
  hash: string;
  last: number[];
}
type Row = (string | number)[] | null;
interface Fixture {
  trace: Record<string, Run>;
  probe: Record<string, Row>;
  commit: Record<string, Run>;
}
const got: Fixture = { trace: {}, probe: {}, commit: {} };
const want: Fixture | null = WRITE ? null : (JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture);

/** Records (write mode) or checks one result against the fixture. */
function check(group: keyof Fixture, name: string, v: Run | Row): void {
  (got[group] as Record<string, Run | Row>)[name] = v;
  if (!want) return;
  const w = (want[group] as Record<string, Run | Row>)[name];
  if (v && !Array.isArray(v)) {
    const r = w as Run;
    expect(v.last, `${group}.${name} last`).toEqual(r.last);
    expect(v.steps, `${group}.${name} steps`).toBe(r.steps);
    expect(v.hash, `${group}.${name} hash`).toBe(r.hash);
  } else expect(v, `${group}.${name}`).toEqual(w);
}

afterAll(() => {
  session?.disconnect();
  if (WRITE) writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
});

/** One input record per case (mutated between phases, never inside a measured loop). */
function input(moveX = 0, moveY = 0): PlayerInput {
  return { moveX, moveY, crouchPressed: false, crouchHeld: false, crouchToggle: true, ads: false, aiming: false, reloading: false };
}

// ---------------------------------------------------------------------------------------------------------------------
// (a) Golden trace on real Havok
// ---------------------------------------------------------------------------------------------------------------------

let engine: NullEngine;
let scene: Scene;

/** A static box (collision group `G.STATIC`) from min to max, optionally pitched about x (rad). */
function block(name: string, min: [number, number, number], max: [number, number, number], pitch = 0): void {
  const m = CreateBox(name, { width: max[0] - min[0], height: max[1] - min[1], depth: max[2] - min[2] }, scene);
  m.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  m.rotation.x = pitch;
  const a = new PhysicsAggregate(m, PhysicsShapeType.BOX, { mass: 0 }, scene);
  a.shape.filterMembershipMask = G.STATIC;
}

beforeAll(async () => {
  const wasm = readFileSync(path.resolve('node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm'));
  const hk = await HavokPhysics({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer });
  engine = new NullEngine();
  scene = new Scene(engine);
  const plugin = new HavokPlugin(false, hk);
  plugin.setTimeStep(DT);
  scene.enablePhysics(GRAVITY, plugin);
  block('floor', [-40, -0.5, -40], [60, 0, 60]);
  // a low ceiling (underside 1.4 m: crouched fits, standing does not)
  block('ceiling', [10, 1.4, -3], [13, 1.8, 6]);
  // a 1 m platform to step off
  block('platform', [20, 0, -3], [24, 1, 6]);
  // a ~14 deg ramp rising along +z (its top surface from z ~ 1 at the floor to ~1.9 m at z ~ 9)
  const a = (14 * Math.PI) / 180;
  const half = 4.2;
  const cy = Math.sin(a) * half - Math.cos(a) * 0.2;
  block('ramp', [-12, cy - 0.2, 5 - half], [-8, cy + 0.2, 5 + half], -a);
});

afterAll(() => {
  scene?.dispose();
  engine?.dispose();
});

/** One fixed step as the game runs it (the controller, then the physics world), hashed. */
function step(c: PlayerController, inp: PlayerInput, h: Hasher, n = 1): void {
  for (let i = 0; i < n; i++) {
    c.fixedUpdate(DT, inp, 0);
    (scene.getPhysicsEngine() as unknown as { _step(dt: number): void })._step(DT);
    const v = c.cc.getVelocity();
    for (const x of [c.pos.x, c.pos.y, c.pos.z, v.x, v.y, v.z, c.yaw, c.grounded ? 1 : 0, c.crouched ? 1 : 0, c.speed]) h.add(x);
  }
}

function lastOf(c: PlayerController): number[] {
  const v = c.cc.getVelocity();
  return [c.pos.x, c.pos.y, c.pos.z, v.x, v.y, v.z, c.yaw, c.grounded ? 1 : 0, c.crouched ? 1 : 0, c.speed];
}

function trace(name: string, spawn: Vector3, yaw: number, run: (c: PlayerController, h: Hasher, count: () => void) => void): PlayerController {
  const c = new PlayerController(scene, spawn, yaw);
  const h = new Hasher();
  let steps = 0;
  run(c, h, () => steps++);
  check('trace', name, { steps, hash: h.digest(), last: lastOf(c) });
  c.dispose();
  return c;
}

describe('(a) golden trace on real Havok', () => {
  it('walk, run, diagonal turn, stop', () => {
    let maxSpeed = 0;
    const c = trace('walk', new Vector3(0, 0, -20), 0, (c, h, count) => {
      const phases: [number, number, number][] = [[0, 0, 20], [0, 0.5, 60], [0, 1, 60], [0.7, 0.7, 60], [0, 0, 60]];
      for (const [mx, my, n] of phases) {
        const inp = input(mx, my);
        for (let i = 0; i < n; i++) {
          step(c, inp, h);
          count();
          maxSpeed = Math.max(maxSpeed, c.speed);
        }
      }
    });
    expect(maxSpeed).toBeGreaterThan(2);
    expect(c.speed).toBeLessThan(0.05);
    expect(c.pos.x).toBeGreaterThan(0.5);
  });

  it('crouch under a low ceiling, try to stand, walk out', () => {
    let blocked = false;
    const c = trace('crouch', new Vector3(8, 0, 1.5), Math.PI / 2, (c, h, count) => {
      const run = (inp: PlayerInput, n: number): void => {
        for (let i = 0; i < n; i++) {
          step(c, inp, h);
          count();
          inp.crouchPressed = false;
        }
      };
      run(input(), 20);
      const press = input();
      press.crouchPressed = true;
      run(press, 1);
      expect(c.crouched).toBe(true);
      run(input(0.6, 0), 120);
      expect(c.pos.x).toBeGreaterThan(10.4);
      expect(c.pos.x).toBeLessThan(12.6);
      // wants to stand under the ceiling: blocked
      const again = input();
      again.crouchPressed = true;
      run(again, 1);
      run(input(), 30);
      blocked = c.crouched;
      run(input(0.8, 0), 200);
    });
    expect(blocked).toBe(true);
    expect(c.pos.x).toBeGreaterThan(13.4);
    expect(c.crouched).toBe(false);
  });

  it('step off a 1 m ledge', () => {
    let air = 0;
    const c = trace('ledge', new Vector3(22, 1, 1.5), Math.PI / 2, (c, h, count) => {
      step(c, input(), h, 20);
      for (let i = 0; i < 20; i++) count();
      const inp = input(0.6, 0);
      for (let i = 0; i < 150; i++) {
        step(c, inp, h);
        count();
        if (!c.grounded) air++;
      }
    });
    expect(air).toBeGreaterThan(3);
    expect(c.grounded).toBe(true);
    expect(c.pos.y).toBeLessThan(0.1);
    expect(c.pos.x).toBeGreaterThan(24.3);
  });

  it('up a ramp', () => {
    const c = trace('ramp', new Vector3(-10, 0, -1), 0, (c, h, count) => {
      step(c, input(), h, 20);
      for (let i = 0; i < 20; i++) count();
      const inp = input(0, 0.6);
      for (let i = 0; i < 200; i++) {
        step(c, inp, h);
        count();
      }
    });
    expect(c.pos.y).toBeGreaterThan(0.5);
    expect(c.grounded).toBe(true);
  });

  it('a kinematic override along an arc, then free', () => {
    let crouchedOn = false;
    const c = trace('kinematic', new Vector3(30, 0, 20), 0, (c, h, count) => {
      step(c, input(), h, 20);
      for (let i = 0; i < 20; i++) count();
      const kin = new Vector3();
      const ov: MoveOverride = { kinematic: kin, yaw: 0.6, crouch: true };
      for (let i = 0; i < 30; i++) {
        const t = (i + 1) / 30;
        kin.set(30 + Math.sin(t * 2) * 1.5, Math.sin(t * Math.PI) * 0.6, 20 + (1 - Math.cos(t * 2)) * 1.5);
        c.override = ov;
        step(c, input(), h);
        count();
      }
      crouchedOn = c.crouched;
      c.override = null;
      step(c, input(), h, 60);
      for (let i = 0; i < 60; i++) count();
    });
    expect(crouchedOn).toBe(true);
    expect(c.grounded).toBe(true);
    expect(Math.abs(c.yaw - 0.6)).toBeLessThan(0.05);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Stubs: a box world (raycasts with no allocation) and a character controller
// ---------------------------------------------------------------------------------------------------------------------

/** Axis-aligned static boxes answering `raycastToRef` with no allocation (a slab test). */
class BoxWorld {
  private readonly b: number[] = [];
  private readonly n = new Vector3();
  private readonly p = new Vector3();
  private readonly one = new PhysicsRaycastResult();
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): this {
    this.b.push(x0, y0, z0, x1, y1, z1);
    return this;
  }
  raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult): void {
    result.reset(from, to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    let best = 2;
    let axis = -1;
    let sign = 0;
    for (let i = 0; i < this.b.length; i += 6) {
      let t0 = -Infinity;
      let t1 = Infinity;
      let ax = -1;
      let sg = 0;
      for (let k = 0; k < 3; k++) {
        const o = k === 0 ? from.x : k === 1 ? from.y : from.z;
        const d = k === 0 ? dx : k === 1 ? dy : dz;
        const lo = this.b[i + k]!;
        const hi = this.b[i + 3 + k]!;
        if (Math.abs(d) < 1e-12) {
          if (o < lo || o > hi) t0 = Infinity;
          continue;
        }
        const ta = (lo - o) / d;
        const tb = (hi - o) / d;
        const near = ta < tb ? ta : tb;
        const far = ta < tb ? tb : ta;
        if (near > t0) {
          t0 = near;
          ax = k;
          sg = d > 0 ? -1 : 1;
        }
        if (far < t1) t1 = far;
      }
      if (t0 <= t1 && t0 >= 0 && t0 <= 1 && t0 < best && ax >= 0) {
        best = t0;
        axis = ax;
        sign = sg;
      }
    }
    if (axis < 0) return;
    this.n.set(axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0);
    this.p.set(from.x + dx * best, from.y + dy * best, from.z + dz * best);
    result.setHitData(this.n, this.p);
    result.setHitDistance(best * Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  /** The pre-refactor `raycast` form: one reused result (the reading is the caller's bytes). */
  raycast(from: Vector3, to: Vector3): PhysicsRaycastResult {
    this.raycastToRef(from, to, this.one);
    return this.one;
  }
}

/** A character controller that allocates nothing: support and movement from its own fields, no integration. */
class StubCC {
  readonly pos = new Vector3();
  readonly vel = new Vector3();
  readonly shape = { filterMembershipMask: 0, filterCollideMask: 0 };
  acceleration = 1;
  maxAcceleration = 80;
  maxSlopeCosine = Math.cos((50 * Math.PI) / 180);
  maxStepHeight = 0;
  characterStrength = 0;
  characterMass = 0;
  keepDistance = 0;
  supported = true;
  readonly normal = new Vector3(0, 1, 0);
  lift = 0;
  private readonly info: CharacterSurfaceInfo = {
    isSurfaceDynamic: false,
    supportedState: CharacterSupportedState.UNSUPPORTED,
    averageSurfaceNormal: new Vector3(),
    averageSurfaceVelocity: new Vector3(),
    averageAngularSurfaceVelocity: new Vector3(),
  };
  private readonly moveOut = new Vector3();
  getPosition(): Vector3 {
    return this.pos;
  }
  setPosition(p: Vector3): void {
    this.pos.copyFrom(p);
  }
  getVelocity(): Vector3 {
    return this.vel;
  }
  setVelocity(v: Vector3): void {
    this.vel.copyFrom(v);
  }
  checkSupportToRef(_dt: number, _dir: Vector3, info: CharacterSurfaceInfo): void {
    info.isSurfaceDynamic = false;
    info.supportedState = this.supported ? CharacterSupportedState.SUPPORTED : CharacterSupportedState.UNSUPPORTED;
    info.averageSurfaceNormal.copyFrom(this.normal);
    info.averageSurfaceVelocity.setAll(0);
    info.averageAngularSurfaceVelocity.setAll(0);
  }
  checkSupport(dt: number, dir: Vector3): CharacterSurfaceInfo {
    this.checkSupportToRef(dt, dir, this.info);
    return this.info;
  }
  calculateMovementToRef(_dt: number, _f: Vector3, _n: Vector3, _c: Vector3, _s: Vector3, desired: Vector3, _u: Vector3, result: Vector3): boolean {
    result.set(desired.x, desired.y + this.lift, desired.z);
    return true;
  }
  calculateMovement(dt: number, f: Vector3, n: Vector3, c: Vector3, s: Vector3, desired: Vector3, u: Vector3): Vector3 {
    this.calculateMovementToRef(dt, f, n, c, s, desired, u, this.moveOut);
    return this.moveOut;
  }
  integrate(): void {}
  /** Keeps the feet where they are (as the real one with `preserveFootPosition`). */
  private h = MOVEMENT.standHeight;
  setShapeOptions(o: { capsuleHeight: number }): void {
    this.pos.y += (o.capsuleHeight - this.h) / 2;
    this.h = o.capsuleHeight;
  }
  dispose(): void {}
}

interface HeapNode {
  id: number;
  callFrame: { functionName: string; url: string };
  children: HeapNode[];
}
interface HeapProfile {
  head: HeapNode;
  samples: { size: number; nodeId: number }[];
}
let session: Session | null = null;
function post<T>(method: string, params: object = {}): Promise<T> {
  return new Promise((res, rej) => session!.post(method, params, (err, r) => (err ? rej(err) : res(r as T))));
}

/**
 * What `fn` allocates under `src/` (V8's sampling heap profiler at an 8 B mean interval, collected objects included, so
 * about every allocation is sampled): bytes per call made in the two files and elsewhere, and the functions that make an
 * allocation bigger than a boxed double (a HeapNumber, `HEAP_NUMBER`: an object, vector, array, closure or string) on
 * at least one call in ten. (V8's own one-off allocations while it re-optimizes under the profiler, feedback and code
 * of 56 B to a few KB, are sampled a handful of times in the run, not per call.)
 */
async function sampled(fn: (n: number) => void, n: number): Promise<{ ours: number; other: number; objects: string[] }> {
  if (!session) {
    session = new Session();
    session.connect();
    await post('HeapProfiler.enable');
  }
  const rounds = 5;
  await post('HeapProfiler.startSampling', { samplingInterval: 8, includeObjectsCollectedByMinorGC: true, includeObjectsCollectedByMajorGC: true });
  for (let r = 0; r < rounds; r++) fn(n);
  const { profile } = await post<{ profile: HeapProfile }>('HeapProfiler.stopSampling');
  const byId = new Map<number, HeapNode>();
  const parent = new Map<number, HeapNode>();
  const index = (nd: HeapNode): void => {
    byId.set(nd.id, nd);
    for (const ch of nd.children) {
      parent.set(ch.id, nd);
      index(ch);
    }
  };
  index(profile.head);
  let ours = 0;
  let other = 0;
  const objects = new Map<string, number>();
  for (const smp of profile.samples) {
    const leaf = byId.get(smp.nodeId)!;
    let src = false;
    for (let nd: HeapNode | undefined = leaf; nd && !src; nd = parent.get(nd.id)) src = nd.callFrame.url.includes('/src/');
    if (!src) continue;
    const where = `${leaf.callFrame.functionName || '(anonymous)'} ${leaf.callFrame.url.split('/').slice(-2).join('/')}`;
    if (smp.size > HEAP_NUMBER) objects.set(where, (objects.get(where) ?? 0) + 1);
    else if (/playerController\.ts|traversal\.ts/.test(where)) ours += smp.size;
    else other += smp.size;
  }
  const perCall: string[] = [];
  for (const [where, count] of objects) if (count >= (rounds * n) / 10) perCall.push(`${where} (${count} in ${rounds * n} calls)`);
  return { ours: ours / (rounds * n), other: other / (rounds * n), objects: perCall };
}

/**
 * Logs `fn`'s readings: `bytesPerCall`, and the sampled bytes in the two files / elsewhere (V8 boxing a double that
 * crosses a call it does not inline: 16 B HeapNumbers, also in `MotionDriver`, `AnalogGear` and `hyp2`). After the
 * refactor (`assert`) nothing bigger than a HeapNumber may be allocated: no object, vector, array, closure or string.
 */
async function readings(label: string, fn: (n: number) => void, assert = true): Promise<void> {
  const per = await bytesPerCall(fn, HEAP_NUMBER, ALLOC);
  const s = await sampled(fn, ALLOC.n);
  const tag = REFACTORED ? 'refactored' : 'pre-refactor';
  console.info(
    `player-hygiene S1 ${label} (${tag}): ${per.toFixed(1)} B per call; sampled HeapNumbers ${s.ours.toFixed(1)} B in the two files, ${s.other.toFixed(1)} B elsewhere; ${s.objects.length} kinds of object${s.objects.length ? `: ${s.objects.slice(0, 6).join('; ')}` : ''}`,
  );
  if (REFACTORED && assert) expect(s.objects, label).toEqual([]);
}

// ---------------------------------------------------------------------------------------------------------------------
// (b) fixedUpdate allocations per state
// ---------------------------------------------------------------------------------------------------------------------

describe('(b) PlayerController.fixedUpdate allocates nothing per step', () => {
  // the floor, and a ceiling over x 48..52 (underside 1.4 m)
  const world = new BoxWorld().box(-100, -1, -100, 100, 0, 100).box(48, 1.4, -2, 52, 2, 2);
  const fakeScene = { getPhysicsEngine: () => world };

  function stubbed(x: number): { c: PlayerController; cc: StubCC } {
    const c = new PlayerController(scene, new Vector3(x, 0, 0), 0);
    c.dispose();
    const cc = new StubCC();
    cc.pos.set(x, MOVEMENT.standHeight / 2 + 0.02, 0);
    (c as unknown as { cc: unknown }).cc = cc;
    (c as unknown as { scene: unknown }).scene = fakeScene;
    return { c, cc };
  }

  async function measure(label: string, c: PlayerController, inp: PlayerInput): Promise<void> {
    await readings(`fixedUpdate ${label}`, (n) => {
      for (let k = 0; k < n; k++) c.fixedUpdate(DT, inp, 0);
    });
  }

  it('walk', async () => {
    const { c } = stubbed(0);
    await measure('walk', c, input(0, 0.5));
    expect(c.grounded).toBe(true);
  });

  it('run', async () => {
    const { c } = stubbed(0);
    await measure('run', c, input(0, 1));
    expect(c.speed).toBeGreaterThan(2);
  });

  it('ramp (slope projection)', async () => {
    const { c, cc } = stubbed(0);
    const a = (14 * Math.PI) / 180;
    cc.normal.set(0, Math.cos(a), -Math.sin(a));
    cc.lift = 0.3;
    await measure('ramp', c, input(0, 0.6));
    expect(c.grounded).toBe(true);
  });

  it('air', async () => {
    const { c, cc } = stubbed(0);
    cc.supported = false;
    await measure('air', c, input(0, 0.5));
    expect(c.grounded).toBe(false);
  });

  it('crouched under a ceiling, wanting to stand', async () => {
    const { c } = stubbed(50);
    const hold = input();
    hold.crouchToggle = false;
    hold.crouchHeld = true;
    c.fixedUpdate(DT, hold, 0);
    expect(c.crouched).toBe(true);
    hold.crouchHeld = false;
    await measure('crouch under ceiling', c, hold);
    expect(c.crouched).toBe(true);
  });

  it('kinematic override', async () => {
    const { c } = stubbed(0);
    c.override = { kinematic: new Vector3(1, 0.3, 2), yaw: 0.6, crouch: true };
    await measure('kinematic', c, input());
    expect(c.crouched).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// (c) Traversal: probe rows, committed moves, allocations
// ---------------------------------------------------------------------------------------------------------------------

/** A minimal player for the traversal controller (the fields it reads and writes). */
function fakePlayer(x: number, speed: number): { player: Player; ctl: FakeCtl; pose: FakePose } {
  const ctl: FakeCtl = {
    pos: new Vector3(x, 0, 0),
    wishDir: new Vector3(),
    yaw: 0,
    speed,
    teleports: 0,
    landings: 0,
    lastLanding: 'none',
    override: null,
    landT: 0,
    grounded: true,
    crouched: false,
    rollHeld: false,
    gear: 3,
    vel: { x: 0, z: 0 },
    motion: { vx: 0, vz: 0, carried: 0, carry(): void { this.carried++; } },
    crouchSet: 0,
    setCrouchToggle(): void { this.crouchSet++; },
    clearCrouchToggle(): void {},
    takeRollHold(): void {},
  };
  const pose: FakePose = { traverse: 'none', traverseT: 0, traverseH: 0, traverseD: 0 };
  return { player: { controller: ctl, pose, alive: true, ads: false } as unknown as Player, ctl, pose };
}
interface FakeCtl {
  pos: Vector3;
  wishDir: Vector3;
  yaw: number;
  speed: number;
  teleports: number;
  landings: number;
  lastLanding: string;
  override: MoveOverride | null;
  landT: number;
  grounded: boolean;
  crouched: boolean;
  rollHeld: boolean;
  gear: number;
  vel: { x: number; z: number };
  motion: { vx: number; vz: number; carried: number; carry(vx: number, vz: number): void };
  crouchSet: number;
  setCrouchToggle(): void;
  clearCrouchToggle(): void;
  takeRollHold(): void;
}
interface FakePose {
  traverse: string;
  traverseT: number;
  traverseH: number;
  traverseD: number;
}

const POSE_KINDS = ['none', 'step', 'vault', 'mantle', 'drop', 'hop', 'roll', 'windowVault'];

describe('(c) traversal probe and committed moves', () => {
  // lanes along +z from feet (X, 0, 0); the low floor is at -2
  const world = new BoxWorld()
    .box(-100, -3, -100, 100, -2, 100)
    // vault: a 0.9 m wall, 0.25 m deep
    .box(-3, -1, -3, 3, 0, 8).box(-2, 0, 0.8, 2, 0.9, 1.05)
    // mantle: a 1.2 m box, 2 m deep
    .box(7, -1, -3, 13, 0, 8).box(8, 0, 0.8, 12, 1.2, 2.8)
    // drop: the floor ends at z 0.6, 2 m down
    .box(17, -1, -3, 23, 0, 0.6)
    // hop: a 1.6 m gap (z 0.6 .. 2.2)
    .box(27, -1, -3, 33, 0, 0.6).box(27, -1, 2.2, 33, 0, 8)
    // nothing: open floor
    .box(37, -1, -3, 43, 0, 8)
    // window: the floor on both sides of the frame
    .box(47, -1, -3, 53, 0, 8);
  const fakeScene = { getPhysicsEngine: () => world };
  const LANES: [string, number, number][] = [['vault', 0, 2], ['mantle', 10, 0], ['drop', 20, 4], ['hop', 30, 5], ['nothing', 40, 1]];

  function make(x: number, speed: number, anchors = new TraversalAnchors()): { tr: TraversalController; ctl: FakeCtl; pose: FakePose } {
    const f = fakePlayer(x, speed);
    return { tr: new TraversalController(fakeScene as unknown as Scene, f.player, anchors), ctl: f.ctl, pose: f.pose };
  }

  function row(p: ReturnType<TraversalController['probe']>): Row {
    return p ? [p.kind, p.front, p.height, p.depth, p.end.x, p.end.y, p.end.z] : null;
  }

  function windowRig(): { tr: TraversalController; ctl: FakeCtl; pose: FakePose; w: WindowAnchor; asked: { key: string; n: number }; opened: string[] } {
    const anchors = new TraversalAnchors();
    const w = anchors.add<WindowAnchor>({ kind: 'window', c: { x: 50, y: 0.9, z: 1 }, w: 1.2, h: 1.2, yaw: 0, sillHeight: 0.9, breakable: false, open: false });
    const asked = { key: '', n: 0 };
    const opened: string[] = [];
    const r = make(50, 1, anchors);
    const isOpen = (k: string): boolean => {
      asked.key = k;
      asked.n++;
      return true;
    };
    r.tr.breakables = { isOpen, open: (k: string) => void opened.push(k) } as unknown as Breakables;
    return { ...r, w, asked, opened };
  }

  /** A jump press at the lane, then every step of the committed move until it ends, hashed. */
  function commit(name: string, tr: TraversalController, ctl: FakeCtl, pose: FakePose): void {
    const h = new Hasher();
    let steps = 0;
    let last: number[] = [];
    const rec = (): void => {
      const o = ctl.override;
      last = o ? [o.kinematic!.x, o.kinematic!.y, o.kinematic!.z, o.yaw!, o.crouch ? 1 : 0] : [-1];
      last.push(POSE_KINDS.indexOf(pose.traverse), pose.traverseT, pose.traverseH, pose.traverseD);
      for (const v of last) h.add(v);
      steps++;
    };
    expect(tr.fixedUpdate(DT, true, false)).toBe(true);
    rec();
    while (tr.kind !== 'none' && steps < 200) {
      tr.fixedUpdate(DT, false, false);
      rec();
    }
    expect(tr.kind).toBe('none');
    expect(ctl.override).toBe(null);
    check('commit', name, { steps, hash: h.digest(), last });
  }

  it('probe rows', () => {
    for (const [name, x, speed] of LANES) {
      const { tr } = make(x, speed);
      const p = tr.probe(new Vector3(x, 0, 0), 0, 1);
      check('probe', name, row(p));
      expect(p?.kind ?? 'none').toBe(name === 'nothing' ? 'none' : name);
    }
  });

  it('a window: the probe asks the glass key; a jump press opens it and vaults through', () => {
    const { tr, ctl, pose, w, asked, opened } = windowRig();
    const p = tr.probe(new Vector3(50, 0, 0), 0, 1);
    check('probe', 'window', row(p));
    expect(p?.kind).toBe('vault');
    expect(tr.hintWindow).toBe(w);
    expect(asked).toEqual({ key: `glass:${w.id}`, n: 1 });
    tr.fixedUpdate(DT, true, false);
    expect(opened).toEqual([`glass:${w.id}`]);
    expect(pose.traverse).toBe('windowVault');
    expect(ctl.override?.kinematic).toBeDefined();
  });

  it('committed moves (vault, mantle, drop, hop, window)', () => {
    for (const [name, x, speed] of LANES) {
      if (name === 'nothing') continue;
      const { tr, ctl, pose } = make(x, speed);
      commit(name, tr, ctl, pose);
    }
    const wr = windowRig();
    commit('window', wr.tr, wr.ctl, wr.pose);
  });

  it('allocation: probe per case, probeDir, a committed step', async () => {
    for (const [name, x, speed] of LANES) {
      const { tr } = make(x, speed);
      const feet = new Vector3(x, 0, 0);
      await readings(`probe ${name}`, (n) => {
        for (let k = 0; k < n; k++) tr.probe(feet, 0, 1);
      });
    }
    {
      // the window probe: `nearestInReach` (src/world/anchors.ts:785-815: `closestOn` and `reach` return literals) is
      // outside the claim (BRIEF A3, J21): logged, no assert
      const { tr } = windowRig();
      const feet = new Vector3(50, 0, 0);
      await readings(
        'probe window (nearestInReach, A3, not asserted)',
        (n) => {
          for (let k = 0; k < n; k++) tr.probe(feet, 0, 1);
        },
        false,
      );
    }
    for (const stick of [false, true]) {
      const { tr, ctl } = make(40, 1);
      ctl.yaw = 0.4;
      if (stick) ctl.wishDir.set(0.5, 0, 0.6);
      const pd = tr as unknown as { probeDir(): { x: number; z: number } };
      await readings(`probeDir ${stick ? 'stick' : 'facing'}`, (n) => {
        for (let k = 0; k < n; k++) pd.probeDir();
      });
    }
    {
      const { tr, ctl } = make(0, 2);
      tr.fixedUpdate(DT, true, false);
      expect(tr.kind).toBe('vault');
      await readings('committed step', (n) => {
        for (let k = 0; k < n; k++) {
          tr.t = 0;
          tr.fixedUpdate(DT, false, false);
        }
      });
      expect(ctl.override?.kinematic).toBeDefined();
    }
  });
});
