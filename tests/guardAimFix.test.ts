import { describe, expect, it, vi } from 'vitest';
import { Enemy, FIRE_CONE } from '../src/ai/enemy';
import { DIFFICULTY } from '../src/ai/archetypes';
import { ENEMIES, type EnemyDef } from '../src/ai/enemyDefs';
import { P_STANDARD, R_NONE, R_OVERWATCH, Rng } from '../src/ai/squadRoles';
import { Vector3 } from '../src/core/babylon';
import { emptyMotionInput, MotionDriver } from '../src/anim/motion';
import { ENEMY_MOTION } from '../src/config/movement';
import { wrapAngle } from '../src/player/playerController';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

// (guard-ai aim fix, Michael 2026-10-27 storm mill walk: "they currently shoot at you without actually aiming at you (ie
// facing away from you) which is unrealistic") A guard fires only while his body faces the shot's aim point within
// FIRE_CONE; facing away he turns first (the aimed turn, ENEMY_MOTION) and then fires. Every fire path of `decide` is
// driven on a stand-in guard built on Enemy's prototype (no rig, no scene; the squadWiring probe's fields), turned each
// step as `update` -> `move` turns a guard standing still: the motion driver to `faceFor(goal.face)`, aimed.

const DT = 1 / 60;
let n = 0;

function cp(x: number, z: number, low = false) {
  const l = Math.sqrt(x * x + z * z);
  return { pos: new Vector3(x, 0, z), normal: new Vector3(-x / l, 0, -z / l), low, seg: 0, s: 0 };
}

interface P {
  state: string;
  stateT: number;
  yaw: number;
  los: boolean;
  fireT: number;
  roundsFired: number;
  suppressRounds: number;
  aimHeld: number;
  aimFace: number;
  lastSeenT: number;
  blindPlan: boolean;
  decide(dt: number): { point: [number, number] | null; speed: number; face: number | null };
  faceFor(face: number | null): number | null;
  tryFire(dt: number, mode?: 'aim' | 'suppress' | 'blind'): void;
}

interface Opt {
  def?: EnemyDef;
  state: string;
  x?: number;
  z?: number;
  yaw: number;
  los: boolean;
  stateT?: number;
  lastSeenT?: number;
  stealth?: boolean;
  covers?: ReturnType<typeof cp>[];
  coverIdx?: number;
  role?: number;
  mates?: boolean;
  path?: number[][];
  blindPlan?: boolean;
}

/** A guard at (x, z) on the target at the origin (head 1.6, chest 1.0; his last known position there too). */
function probe(o: Opt) {
  const covers = o.covers ?? [];
  const def = o.def ?? ENEMIES.grunt;
  const x = o.x ?? 0;
  const z = o.z ?? -10;
  const lkp = new Vector3(0, 0, 0);
  const shots: { yaw: number; from: number[]; to: number[] }[] = [];
  const target = { id: 'p1', feet: new Vector3(0, 0, 0), speed: 0, crouched: false, cover: null, coverT: 0, target: { aimPoint: (v: Vector3) => v.set(0, 1, 0), headPoint: (v: Vector3) => v.set(0, 1.6, 0) } };
  const e = Object.create(Enemy.prototype) as Enemy;
  const ctx = {
    cover: covers,
    coverSegments: [],
    nav: { findPath: vi.fn((_a: number[], b: number[]) => [[b[0], b[1]]]), isWalkable: () => true, cellOf: () => 0, lineClear: () => true },
    reserveCover: vi.fn(() => true),
    releaseCover: vi.fn(),
    blockCover: vi.fn(),
    stealth: () => o.stealth ?? true,
    lkpOf: () => lkp,
    ballistics: { clear: vi.fn(() => true), ray: vi.fn((_a: Vector3, b: Vector3) => ({ hit: false, point: b })), armouredFirst: () => false },
    vfx: {
      tracer: vi.fn((a: Vector3, b: Vector3) => shots.push({ yaw: (e as unknown as P).yaw, from: [a.x, a.y, a.z], to: [b.x, b.y, b.z] })),
      muzzleFlash: vi.fn(),
    },
    diff: DIFFICULTY.normal,
    players: () => [],
    throwGrenade: vi.fn(() => false),
    isFlanker: () => false,
    alarmRaised: () => false,
  };
  Object.assign(e, {
    ctx,
    def,
    num: 9700 + n++,
    pos: new Vector3(x, 0, z),
    yaw: o.yaw,
    aware: { alert: true, level: 'alert' },
    health: { alive: true },
    target,
    stagger: 0,
    los: o.los,
    losT: o.los ? 2 : 0,
    losHead: false,
    dist: Math.sqrt(x * x + z * z),
    lastSeenT: o.lastSeenT ?? (o.los ? 0 : 1),
    lastKnown: new Vector3(0, 1.1, 0),
    sawOnce: true,
    hasStimulus: false,
    stimulus: [0, 0],
    knownV: new Vector3(),
    hunt: 0,
    alarm: null,
    entry: null,
    smelled: false,
    knownPt: [0, 0],
    advanceCd: 0,
    hold: null,
    postDef: null,
    post: [x, z],
    doorCheck: 0,
    role: R_NONE,
    roleCover: -1,
    roleMoving: false,
    roleRun: false,
    mateMoving: false,
    onRadio: false,
    closing: false,
    tacticsProfile: P_STANDARD,
    roleGoal: { point: null, speed: 0, face: null },
    coverIdx: o.coverIdx ?? -1,
    onRoleBound: false,
    state: o.state,
    stateT: o.stateT ?? 0,
    coverPicked: true,
    armourPick: false,
    relocating: false,
    flanking: false,
    advancing: false,
    path: o.path ?? [],
    peekCycles: 0,
    fireGate: { blocked: false, moveT: 0, gate: () => false, plan: () => 'hold' },
    coverPose: 'none',
    coverPeek: 0,
    coverWallSide: 0,
    wantCrouch: false,
    crouch: 0,
    rng: new Rng(7),
    strafeT: 0,
    strafe: 1,
    blindPlan: o.blindPlan ?? false,
    grenadeCd: 99,
    carry: { drawn: true },
    shieldT: 0,
    burstLeft: 0,
    pauseT: 0,
    windup: 0,
    fireT: 0,
    roundsFired: 0,
    buff: false,
    shotsHere: 0,
    kick: 0,
    fireFrom: new Vector3(),
    fireTo: new Vector3(),
    openT: 0,
    openNoCover: false,
    suppressAim: new Vector3(),
    suppressing: false,
    suppressOk: false,
    suppressCheckT: 0,
    suppressRounds: 0,
    suppressHeld: 0,
    aimFace: Number.NaN,
    aimHeld: 0,
    bark: vi.fn(),
  });
  if (o.role !== undefined) e.setRole(o.role, o.coverIdx ?? -1, false, false, o.mates ?? false, false);
  const p = e as unknown as P;
  const motion = new MotionDriver(o.yaw);
  const mi = emptyMotionInput();
  /** One fixed step as `update` runs it for a guard standing still: decide, then the aimed turn to `faceFor`. */
  const step = (turn = true) => {
    const g = p.decide(DT);
    const face = p.faceFor(g.face);
    if (turn && face !== null) {
      mi.vx = 0;
      mi.vz = 0;
      mi.yaw = face;
      mi.aiming = true;
      motion.step(DT, mi, ENEMY_MOTION);
      p.yaw = motion.yaw;
    }
    p.stateT += DT;
    p.fireT = Math.max(0, p.fireT - DT);
    p.lastSeenT += p.los ? 0 : DT;
    return g;
  };
  return { e, p, step, shots, ctx };
}

/** Yaw from (x, z) to the origin. */
const toOrigin = (x: number, z: number) => Math.atan2(-x, -z);
/** Every recorded round left from a body within FIRE_CONE of its aim point (the origin). */
function allFaced(shots: { yaw: number; from: number[] }[], x: number, z: number): void {
  for (const s of shots) expect(Math.abs(wrapAngle(toOrigin(x, z) - s.yaw))).toBeLessThanOrEqual(FIRE_CONE + 1e-9);
}

/** Facing away by 2.2 rad (126 deg). */
const AWAY = 2.2;

/** Each of `decide`'s fire paths with the options that reach it (target at the origin, guard at (x, z)). */
/** `away`: the turn test's start (rad off the aim; default AWAY): the blind phase is 1 s long (0.6-1.6 s of the hide
 *  cycle), so his turn there starts 1 rad off. */
const PATHS: { name: string; o: Omit<Opt, 'yaw'>; count: 'rounds' | 'suppress'; turns: boolean; away?: number }[] = [
  { name: 'attack, in sight (aimed)', o: { state: 'attack', los: true }, count: 'rounds', turns: true },
  { name: 'attack, sight just lost (suppress at the last known spot)', o: { state: 'attack', los: false, stealth: false }, count: 'rounds', turns: true },
  { name: 'enforcer push, in sight', o: { def: ENEMIES.enforcer, state: 'attack', los: true, z: -2 }, count: 'rounds', turns: true },
  { name: 'enforcer push, sight just lost (suppress)', o: { def: ENEMIES.enforcer, state: 'attack', los: false, stealth: false, z: -2 }, count: 'rounds', turns: true },
  { name: 'cover peek (aimed)', o: { state: 'inCover', los: true, covers: [cp(0, -10, true)], coverIdx: 0, stateT: 2.5 }, count: 'rounds', turns: true },
  { name: 'cover hide phase blind fire', o: { state: 'inCover', los: false, stealth: false, covers: [cp(0, -10, true)], coverIdx: 0, stateT: 0.62, blindPlan: true }, count: 'rounds', turns: true, away: 1 },
  { name: 'overwatch suppress from cover (S27)', o: { state: 'inCover', los: false, covers: [cp(1, -12)], coverIdx: 0, x: 1, z: -12, role: R_OVERWATCH, mates: true, lastSeenT: 5 }, count: 'suppress', turns: true },
  { name: 'overwatch suppress waiting in the open (S27)', o: { state: 'chase', los: false, x: 1, z: -12, role: R_OVERWATCH, mates: true, lastSeenT: 5 }, count: 'suppress', turns: true },
];

const fired = (p: P, c: 'rounds' | 'suppress') => (c === 'rounds' ? p.roundsFired : p.suppressRounds);

describe('guard-ai aim fix: no round from a body facing away (every fire path)', () => {
  for (const f of PATHS) {
    it(`${f.name}: facing away he holds every round`, () => {
      const x = f.o.x ?? 0;
      const z = f.o.z ?? -10;
      const r = probe({ ...f.o, yaw: toOrigin(x, z) + AWAY });
      for (let i = 0; i < 60; i++) r.step(false);
      expect(fired(r.p, f.count)).toBe(0);
      expect(r.shots.length).toBe(0);
      expect(r.p.aimHeld).toBeGreaterThan(0);
    });

    it(`${f.name}: already facing he fires exactly as before (no added delay)`, () => {
      const x = f.o.x ?? 0;
      const z = f.o.z ?? -10;
      const a = probe({ ...f.o, yaw: toOrigin(x, z) });
      // the old rule: no facing check at all (the gate bypassed on this instance), the same seed and steps
      const b = probe({ ...f.o, yaw: toOrigin(x, z) });
      Object.assign(b.e, { facesAim: () => true });
      const ra: number[] = [];
      const rb: number[] = [];
      for (let i = 0; i < 60; i++) {
        a.step(false);
        b.step(false);
        ra.push(fired(a.p, f.count));
        rb.push(fired(b.p, f.count));
      }
      expect(ra).toEqual(rb);
      expect(ra[ra.length - 1]).toBeGreaterThan(0);
      expect(a.p.aimHeld).toBe(0);
    });

    if (f.turns) {
      it(`${f.name}: facing away he turns at the aimed rate, then fires, each round from a body facing the aim`, () => {
        const x = f.o.x ?? 0;
        const z = f.o.z ?? -10;
        const away = f.away ?? AWAY;
        const r = probe({ ...f.o, yaw: toOrigin(x, z) + away });
        let first = -1;
        for (let i = 0; i < 60 * 2.4 && first < 0; i++) {
          r.step();
          if (fired(r.p, f.count) > 0) first = i;
        }
        expect(first).toBeGreaterThan(0);
        // (away - 15 deg) at 110 deg/s at best (eased in at 12 rad/s^2): never sooner
        expect(first * DT).toBeGreaterThan((away - FIRE_CONE) / ENEMY_MOTION.turnAim);
        allFaced(r.shots, x, z);
      });
    }
  }

  it('a run to cover (seekCover, no facing goal): he fires on the move only when the run faces the target', () => {
    const away = probe({ state: 'seekCover', los: true, stateT: 0.6, path: [[0, -30]], yaw: Math.PI });
    for (let i = 0; i < 60; i++) {
      const g = away.step();
      // he is not turned off his run: the travel facing stays his own
      expect(away.p.faceFor(g.face)).toBeNull();
    }
    expect(away.p.roundsFired).toBe(0);
    expect(away.p.aimHeld).toBeGreaterThan(0);
    const facing = probe({ state: 'seekCover', los: true, stateT: 0.6, path: [[0, 10]], yaw: 0 });
    const old = probe({ state: 'seekCover', los: true, stateT: 0.6, path: [[0, 10]], yaw: 0 });
    Object.assign(old.e, { facesAim: () => true });
    for (let i = 0; i < 60; i++) {
      facing.step();
      old.step();
    }
    expect(facing.p.roundsFired).toBeGreaterThan(0);
    expect(facing.p.roundsFired).toBe(old.p.roundsFired);
    allFaced(facing.shots, 0, -10);
  });

  it('a target sweeping across him at under the aimed turn rate: tracked, every round within the cone, none held', () => {
    const r = probe({ state: 'attack', los: true, yaw: 0 });
    const t = (r.e as unknown as { target: { feet: Vector3; target: { aimPoint: (v: Vector3) => Vector3 } } }).target;
    let ang = 0;
    // 60 deg/s round him at 10 m (a sprint across his front)
    const w = (60 * Math.PI) / 180;
    let px = 0;
    let pz = 0;
    t.target.aimPoint = (v: Vector3) => v.set(px, 1, pz);
    for (let i = 0; i < 120; i++) {
      ang += w * DT;
      px = Math.sin(ang) * 10;
      pz = -10 + Math.cos(ang) * 10;
      t.feet.set(px, 0, pz);
      r.step();
    }
    expect(r.p.roundsFired).toBeGreaterThan(0);
    // (the first rounds land while he is still lined up; then the eased turn tracks it within the cone)
    expect(r.p.aimHeld).toBe(0);
  });

  it('the facing check adds no allocation (a round held for the turn; a facing round runs the same check)', async () => {
    const held = probe({ state: 'attack', los: true, yaw: AWAY });
    const ph = held.p;
    const perHeld = await bytesPerCall((k) => {
      for (let i = 0; i < k; i++) ph.tryFire(DT);
    }, HEAP_NUMBER);
    expect(perHeld).toBeLessThanOrEqual(HEAP_NUMBER);
    expect(ph.roundsFired).toBe(0);
    expect(Number.isNaN(ph.aimFace)).toBe(false);
  });
});
