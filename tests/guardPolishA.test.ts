import { describe, expect, it, vi } from 'vitest';
import { COVER_DETOUR, COVER_TRIES, Enemy } from '../src/ai/enemy';
import { AlertMachine, type AlertLevel } from '../src/ai/alertState';
import { DIFFICULTY } from '../src/ai/archetypes';
import { ENEMIES } from '../src/ai/enemyDefs';
import { P_STANDARD, R_NONE, R_OVERWATCH, R_POINT, Rng, SQUAD } from '../src/ai/squadRoles';
import { searchSpec, SEARCH_PLAIN } from '../src/ai/response';
import { NavGrid } from '../src/ai/navGrid';
import { G } from '../src/physics/groups';
import { Vector3 } from '../src/core/babylon';
import type { RoomRect } from '../src/world/rooms';
import { bytesPerCall } from './helpers/allocPerCall';

// (guard-ai polish batch, group A) The guard brain's polish fixes on stand-in guards built on Enemy's prototype (no
// rig, no scene): the device responder back on his search (A1), the cover pick that tries its best 3 and rejects
// detours (A2, A167), the slotless guard on his own spot (A3, A165), the open-wait pick that holds (A6), the suppress
// line (A7, A8), the search spots (A11-A13) and the allocation-free cover pick (A14). A4 (twoIntruders), A5 (here),
// A9 / A10 (coopPerception), A15 (twoIntruders) and A16 (squadWiring) sit with their area's tests.

const DT = 1 / 60;
const sq = SQUAD as unknown as { openWait: number };
let n = 0;

type Goal = { point: [number, number] | null; speed: number; face: number | null };

// ----- the role probe (squadWiring's): a grunt hunting slot 0, last known position at the origin -----

/** A cover point at (x, z) whose protected side faces the origin. */
function cp(x: number, z: number, low = false) {
  const l = Math.sqrt(x * x + z * z);
  return { pos: new Vector3(x, 0, z), normal: new Vector3(-x / l, 0, -z / l), low, seg: 0, s: 0 };
}
const COVERS = [cp(0, -7), cp(1, -12), cp(12, -4), cp(1, -17.5), cp(3, -9)];

interface ProbeP {
  state: string;
  stateT: number;
  wantCrouch: boolean;
  coverIdx: number;
  advancing: boolean;
  openNoCover: boolean;
  los: boolean;
  lastSeenT: number;
  fireT: number;
  roundsFired: number;
  suppressRounds: number;
  suppressHeld: number;
  suppressCheckT: number;
  suppressGap: number;
  path: [number, number][];
  pos: Vector3;
  target: { feet: Vector3 };
  knownPt: [number, number];
  decide(dt: number): Goal;
  pickCover(skip?: number): boolean;
}

function roleProbe(o: { role: number; cover?: number; moving?: boolean; mates?: boolean; covers?: ReturnType<typeof cp>[]; x?: number; z?: number; state?: string } = { role: R_NONE }) {
  const covers = o.covers ?? COVERS;
  const owner = covers.map(() => -1);
  const line = { clear: true };
  const lkp = new Vector3(0, 0, 0);
  const target = { id: 'p1', feet: new Vector3(0, 0, 0), speed: 0, crouched: false, cover: null, coverT: 0, target: { aimPoint: (v: Vector3) => v.set(0, 1, 0), headPoint: (v: Vector3) => v.set(0, 1.6, 0) } };
  /** Paths: straight to the goal unless `detour` names the cover index (then round a far corner). */
  const detour = new Set<number>();
  const e = Object.create(Enemy.prototype) as Enemy;
  const ctx = {
    cover: covers,
    coverSegments: [],
    nav: {
      findPath: vi.fn((_a: number[], b: number[]) => {
        const k = covers.findIndex((c) => Math.abs(c.pos.x - b[0]!) < 1e-6 && Math.abs(c.pos.z - b[1]!) < 1e-6);
        return detour.has(k) ? [[30, b[1]! - 20], [b[0], b[1]]] : [[b[0], b[1]]];
      }),
      isWalkable: () => true,
      cellOf: () => 0,
      lineClear: () => true,
    },
    reserveCover: vi.fn((g: Enemy, i: number) => {
      if (owner[i] !== -1 && owner[i] !== g.num) return false;
      for (let k = 0; k < owner.length; k++) if (owner[k] === g.num) owner[k] = -1;
      owner[i] = g.num;
      return true;
    }),
    releaseCover: vi.fn((g: Enemy) => {
      for (let k = 0; k < owner.length; k++) if (owner[k] === g.num) owner[k] = -1;
    }),
    blockCover: vi.fn(),
    stealth: () => true,
    lkpOf: () => lkp,
    ballistics: { clear: vi.fn((_a: Vector3, _b: Vector3, _mask: number) => line.clear), ray: vi.fn((_a: Vector3, b: Vector3) => ({ hit: false, point: b })), armouredFirst: () => false },
    vfx: { tracer: vi.fn(), muzzleFlash: vi.fn() },
    diff: DIFFICULTY.normal,
    players: () => [],
    throwGrenade: vi.fn(() => true),
    isFlanker: () => false,
    alarmRaised: () => false,
  };
  Object.assign(e, {
    ctx,
    def: ENEMIES.grunt,
    num: 9600 + n++,
    pos: new Vector3(o.x ?? 0, 0, o.z ?? -16),
    yaw: 0,
    aware: { alert: true, level: 'alert' },
    health: { alive: true },
    target,
    stagger: 0,
    los: false,
    losT: 0,
    losHead: false,
    dist: 16,
    lastSeenT: 5,
    lastKnown: new Vector3(3, 1.1, 3),
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
    post: [o.x ?? 0, o.z ?? -16],
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
    coverIdx: -1,
    state: o.state ?? 'chase',
    stateT: 0,
    coverPicked: false,
    armourPick: false,
    relocating: false,
    flanking: false,
    advancing: false,
    path: [],
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
    blindPlan: false,
    grenadeCd: 0,
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
    suppressGap: 99,
    suppressRounds: 0,
    suppressHeld: 0,
    bark: vi.fn(),
  });
  e.setRole(o.role, o.cover ?? -1, o.moving ?? false, false, o.mates ?? false, false);
  const p = e as unknown as ProbeP;
  /** `decide` steps with the clocks `update` runs (stateT, the fire clock, the suppress gap). */
  const step = (k = 1): Goal => {
    let g: Goal = { point: null, speed: 0, face: null };
    for (let i = 0; i < k; i++) {
      p.suppressGap += DT;
      g = p.decide(DT);
      p.stateT += DT;
      p.fireT = Math.max(0, p.fireT - DT);
    }
    return g;
  };
  return { e, p, ctx, line, owner, detour, step };
}

/** The cover `pickCover` takes with the given covers held by a mate (num 1) and detours. */
function pickWith(held: number[], detours: number[] = []): { ok: boolean; idx: number } {
  const r = roleProbe();
  for (const k of held) r.owner[k] = 1;
  for (const k of detours) r.detour.add(k);
  const ok = r.p.pickCover();
  return { ok, idx: r.p.coverIdx };
}

describe('A2 / A167: the cover pick tries its best 3 and rejects a detour', () => {
  it(`the numbers: COVER_DETOUR ${COVER_DETOUR.k} x straight + ${COVER_DETOUR.add} m, COVER_TRIES ${COVER_TRIES}`, () => {
    expect(COVER_DETOUR).toEqual({ k: 1.5, add: 3 });
    expect(COVER_TRIES).toBe(3);
  });

  it('a mate holds the best: the second best (4.97.1: no cover at all)', () => {
    const first = pickWith([]);
    expect(first.ok).toBe(true);
    const second = pickWith([first.idx]);
    expect(second.ok).toBe(true);
    expect(second.idx).not.toBe(first.idx);
    const third = pickWith([first.idx, second.idx]);
    expect(third.ok).toBe(true);
    expect([first.idx, second.idx]).not.toContain(third.idx);
    // all three kept candidates held: no cover (no fourth try)
    expect(pickWith([first.idx, second.idx, third.idx]).ok).toBe(false);
  });

  it('the best is behind a wall (its walk a long detour): the open one next, never the wall pocket', () => {
    const first = pickWith([]);
    const second = pickWith([first.idx]);
    const r = roleProbe();
    r.detour.add(first.idx);
    expect(r.p.pickCover()).toBe(true);
    expect(r.p.coverIdx).toBe(second.idx);
    // the rejected cover's reservation was let go
    expect(r.owner[first.idx]).toBe(-1);
    expect(r.owner[second.idx]).toBe(r.e.num);
  });

  it('a group bound to a cover whose walk is a detour: blocked for the roles, no trip', () => {
    const r = roleProbe({ role: R_POINT, cover: 0, moving: true, state: 'chase' });
    r.detour.add(0);
    r.step();
    expect(r.ctx.blockCover).toHaveBeenCalledWith(0);
    expect(r.owner[0]).toBe(-1);
  });

  it('the open wait: no cover free, then a mate leaves his: taken on the retry after openWait', () => {
    const r = roleProbe({ role: R_OVERWATCH });
    for (let k = 0; k < r.owner.length; k++) r.owner[k] = 1;
    r.step(2);
    expect(r.p.openNoCover).toBe(true);
    expect(r.p.state).toBe('chase');
    r.owner.fill(-1);
    r.step(Math.floor(sq.openWait / DT) - 5);
    expect(r.p.state).toBe('chase');
    for (let i = 0; i < 10 && r.p.state === 'chase'; i++) r.step();
    expect(r.p.state).toBe('seekCover');
    expect(r.owner[r.p.coverIdx]).toBe(r.e.num);
  });

  it("held by the group (roleMoving false), the open wait's pick never lands on his own role cover", () => {
    const own = pickWith([]).idx;
    const r = roleProbe({ role: R_POINT, cover: own, moving: false });
    r.step(Math.floor(sq.openWait / DT) + 5);
    expect(r.p.state).toBe('seekCover');
    expect(r.p.coverIdx).not.toBe(own);
    expect(r.p.coverIdx).toBeGreaterThanOrEqual(0);
  });
});

describe('A6: the open-wait pick ends a bound', () => {
  it('an overwatch who advanced before picks cover in the open wait: holds there, no chase after the advance hold', () => {
    const r = roleProbe({ role: R_OVERWATCH });
    r.p.advancing = true;
    r.step(2);
    expect(r.p.state).toBe('seekCover');
    expect(r.p.advancing).toBe(false);
    // there: in cover, then 4 s out of sight
    const c = COVERS[r.p.coverIdx]!;
    r.p.pos.set(c.pos.x, 0, c.pos.z);
    r.step(3);
    expect(r.p.state).toBe('inCover');
    for (let i = 0; i < 60 * 4; i++) {
      r.step();
      expect(r.p.state).toBe('inCover');
    }
  });
});

describe('A5: in cover out of sight, the exits read his known spot', () => {
  it('the player walks round behind his cover out of sight: he stays in cover (no upright attack, no re-pick)', () => {
    const r = roleProbe({ role: R_OVERWATCH, cover: 1, moving: false, x: 1, z: -12, state: 'inCover' });
    Object.assign(r.e, { coverIdx: 1 });
    r.owner[1] = r.e.num;
    // the real feet behind him (the cover would not protect) and close (under engageMin x 0.7); out of sight
    r.p.target.feet.set(1, 0, -13.5);
    for (let i = 0; i < 60 * 2; i++) {
      r.step();
      expect(r.p.state).toBe('inCover');
    }
    // in sight it is today's rule: flanked, he leaves
    r.p.los = true;
    r.p.lastSeenT = 0;
    Object.assign(r.e, { dist: 1.5 });
    r.step();
    expect(r.p.state).toBe('attack');
  });
});

describe('A7 / A8: the suppress line', () => {
  function overwatch() {
    const r = roleProbe({ role: R_OVERWATCH, cover: 1, moving: false, mates: true, x: 1, z: -12, state: 'inCover' });
    Object.assign(r.e, { coverIdx: 1 });
    r.owner[1] = r.e.num;
    return r;
  }

  it('A8: the line test is blocked by props too (ENEMY_SHOT stops on them)', () => {
    const r = overwatch();
    r.step();
    const mask = r.ctx.ballistics.clear.mock.calls[0]![2];
    expect(mask & G.STATIC).toBeTruthy();
    expect(mask & G.PROP).toBeTruthy();
  });

  it('A7: after a lapse (his mate stopped, then moves again) the first suppress step casts again: no round on the old verdict', () => {
    const r = overwatch();
    r.step(30);
    expect(r.p.suppressRounds + r.p.suppressHeld).toBeGreaterThan(0);
    // the step after a cast: the cached verdict (clear) has most of SUPPRESS_CHECK left
    const calls = () => r.ctx.ballistics.clear.mock.calls.length;
    let c0 = calls();
    for (let i = 0; i < 30 && calls() === c0; i++) r.step();
    // the lapse: nobody moving for a second
    r.e.setRole(R_OVERWATCH, 1, false, false, false, false);
    r.step(60);
    // the line is blocked now; his mate moves again
    r.line.clear = false;
    r.e.setRole(R_OVERWATCH, 1, false, false, true, false);
    c0 = calls();
    const rounds = r.p.suppressRounds;
    r.step();
    expect(calls()).toBe(c0 + 1);
    r.step(10);
    expect(r.p.suppressRounds).toBe(rounds);
  });
});

describe('A3 / A165: a slotless guard in stealth walks to his own spot, never the freshest intruder field', () => {
  function chaser(hunt: number) {
    const e = Object.create(Enemy.prototype) as Enemy;
    const nav = {
      version: 0,
      lineClear: vi.fn(() => false),
      findPath: vi.fn((_a: number[], b: number[]) => [[2, 2], [b[0], b[1]]]),
      flowNext: vi.fn(() => [9, 9]),
    };
    const ctx = { nav, stealth: () => true, flowOf: vi.fn(() => ({})), flow: vi.fn(() => ({})) };
    Object.assign(e, {
      ctx,
      hunt,
      pos: new Vector3(0, 0, 0),
      dist: 30,
      stateT: 0,
      postDef: null,
      meP: [0, 0],
      routePath: [],
      routeGoal: [NaN, NaN],
      routeT: 0,
      routeVer: -1,
      routeMiss: false,
    });
    return { e: e as unknown as { chasePoint(dt: number, tp: [number, number], zig: boolean): [number, number] | null }, nav, ctx };
  }

  it('hunt -1: an A* walk to the spot he was given (his own stimulus / sighting), no field read', () => {
    const c = chaser(-1);
    const p = c.e.chasePoint(DT, [6, 8], false);
    expect(p).toEqual([2, 2]);
    expect(c.nav.findPath).toHaveBeenCalledTimes(1);
    expect(c.nav.findPath.mock.calls[0]![1]).toEqual([6, 8]);
    expect(c.ctx.flowOf).not.toHaveBeenCalled();
    expect(c.nav.flowNext).not.toHaveBeenCalled();
  });

  it('with a slot (solo or co-op): his intruder field as before', () => {
    const c = chaser(0);
    expect(c.e.chasePoint(DT, [6, 8], false)).toEqual([9, 9]);
    expect(c.ctx.flowOf).toHaveBeenCalledWith(0);
    expect(c.nav.findPath).not.toHaveBeenCalled();
  });
});

// ----- the calm searcher (deviceTrip's stand-in) -----

const LAB: RoomRect = { id: 'lab', name: 'Lab', minX: 0, maxX: 12, minZ: 0, maxZ: 8 };

interface Searcher {
  aware: AlertMachine;
  pos: Vector3;
  spot: [number, number];
  searchK: number;
  planPoint: boolean;
  hunt: number;
  searchRoomId: string | null;
  responder: boolean;
  stimulus: [number, number];
  hasStimulus: boolean;
  joinAsResponder(route: null, x: number, z: number, room: RoomRect | null): void;
  calmDecide(dt: number): Goal;
  onLevel(a: AlertLevel, b: AlertLevel): void;
  hearSearch(x: number, z: number): void;
}

function searcher(at: [number, number, number?], o: Record<string, unknown> = {}, ctxO: Record<string, unknown> = {}): Searcher {
  const e = Object.create(Enemy.prototype) as Enemy;
  Object.assign(e, {
    aware: new AlertMachine(),
    health: { alive: true },
    passive: false,
    taken: false,
    incident: -1,
    incMode: 0,
    turnT: 0,
    caution: 0,
    brkGroup: -1,
    stimulus: [0, 0],
    hasStimulus: false,
    searchReq: false,
    searchOwn: false,
    searchRoom: null,
    reviving: null,
    camBody: null,
    combatSearch: false,
    spot: [0, 0],
    spotSet: false,
    spotArrived: false,
    spotLookT: 0,
    lookBase: 0,
    searchK: 0,
    planN: 0,
    planPoint: false,
    heardSpot: false,
    spotClamped: false,
    hearBarkT: 99,
    heardT: 99,
    routePath: [],
    routeGoal: [NaN, NaN],
    routeT: 0,
    routeVer: -1,
    routeMiss: false,
    meP: [0, 0],
    entry: null,
    crew: null,
    hold: null,
    postDef: null,
    post: [0, 0],
    hunt: -1,
    pendingHunt: -1,
    calledMask: 0,
    yaw: 0,
    responder: false,
    pos: new Vector3(at[0], at[2] ?? 0, at[1]),
    def: { walkSpeed: 0.9, runSpeed: 3.2, kind: 'grunt', scale: 1 },
    ctx: {
      coordinated: () => true,
      stealth: () => true,
      lkpValid: () => false,
      searchSlot: () => 0,
      nav: { nearestWalkable: () => -1, lineClear: () => true, version: 0 },
      ...ctxO,
    },
    lc: { active: false, stop() {} },
    lure: { cancel() {}, active: false },
    walker: { rejoin() {} },
    alertIn: { called: false },
    bark() {},
    setState() {},
    ...o,
  });
  return e as unknown as Searcher;
}

/** Walks him `secs` on `calmDecide` (straight moves at the goal's speed). */
function walk(e: Searcher, secs: number): void {
  for (let t = 0; t < secs; t += DT) {
    const g = e.calmDecide(DT);
    if (!g.point) continue;
    const dx = g.point[0] - e.pos.x;
    const dz = g.point[1] - e.pos.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    const s = Math.min(d, g.speed * DT);
    if (d > 1e-6) e.pos.addInPlaceFromFloats((dx / d) * s, 0, (dz / d) * s);
  }
}

describe('A1: a device responder pulled into an investigation goes back to the device search', () => {
  it('searching the lab, sent to a light, the look ends calm: searching the lab again (not standing)', () => {
    const e = searcher([20, 4], { profile: 'standard', tacticsProfile: P_STANDARD, entryK: 0, entryT: 0 });
    e.joinAsResponder(null, 6, 4, LAB);
    e.aware.set('searching');
    e.onLevel('unaware', 'searching');
    expect([e.responder, e.searchRoomId]).toEqual([true, 'lab']);
    // a light check / a body takes him off it
    e.aware.set('investigating');
    e.onLevel('searching', 'investigating');
    e.stimulus[0] = 30;
    e.stimulus[1] = 30;
    e.pos.set(30, 0, 30);
    // nothing there: calm again
    e.aware.set('cooldown');
    e.onLevel('investigating', 'cooldown');
    expect(e.aware.level).toBe('searching');
    expect(e.searchRoomId).toBe('lab');
    expect([e.stimulus[0], e.stimulus[1], e.hasStimulus]).toEqual([6, 4, true]);
    // he walks back to the device spot, then searches inside the lab
    e.calmDecide(DT);
    expect(e.spot).toEqual([6, 4]);
    walk(e, 150);
    expect(e.pos.x).toBeGreaterThanOrEqual(LAB.minX - 1.2);
    expect(e.pos.x).toBeLessThanOrEqual(LAB.maxX + 1.2);
    expect(e.pos.z).toBeLessThanOrEqual(LAB.maxZ + 1.2);
  });

  it('a guard who is not a responder calms as before', () => {
    const e = searcher([20, 4]);
    e.aware.set('investigating');
    e.onLevel('unaware', 'investigating');
    e.aware.set('cooldown');
    e.onLevel('investigating', 'cooldown');
    expect(e.aware.level).toBe('cooldown');
  });
});

describe('A11: search spots snap to the right storey', () => {
  /** A 10 x 10 m ground floor and an upper floor at 4 m over x >= 6 only (two seeds: no stairs modelled). */
  function twoStorey(): NavGrid {
    return new NavGrid({
      minX: 0,
      maxX: 10,
      minZ: 0,
      maxZ: 10,
      cell: 0.5,
      sample: () => ({ h: 0, ok: true }),
      sampleLayers: (x) => (x >= 6 ? [{ h: 0, ok: true }, { h: 4, ok: true }] : [{ h: 0, ok: true }]),
      layers: 2,
      blockers: [],
      agentRadius: 0.3,
      stepHeight: 0.4,
      seed: [2, 5],
      extraSeeds: [[8, 4, 5]],
    });
  }

  it('hearSearch on the upper floor: the spot by the noise snaps to his storey (4.97.1: the ground floor under it)', () => {
    const nav = twoStorey();
    const e = searcher([8, 5, 4], {}, { nav });
    e.aware.set('searching');
    e.hearSearch(5.2, 5.2);
    // the nearest upper-floor cell is past x = 6
    expect(e.spot[0]).toBeGreaterThan(6);
    // a guard on the ground floor keeps the cell under the noise
    const g = searcher([8, 5, 0], {}, { nav });
    g.aware.set('searching');
    g.hearSearch(5.2, 5.2);
    expect(g.spot[0]).toBeLessThan(5.5);
  });

  it("a search point round his intruder's position on the upper floor snaps up there", () => {
    const nav = twoStorey();
    const lkp = new Vector3(5.2, 4, 5.2);
    const e = searcher([8, 5, 0], { hunt: 0 }, { nav, lkpOf: () => lkp });
    e.aware.set('searching');
    e.calmDecide(DT);
    expect(e.spot[0]).toBeGreaterThan(6);
  });
});

describe('A12: a heard spot keeps the ring place', () => {
  it('heard at searchK 0: after its look the next point is still the search centre', () => {
    const e = searcher([3, 3], { hasStimulus: true, stimulus: [10, 0] });
    e.aware.set('searching');
    e.hearSearch(3, 3);
    // there: the look runs out
    for (let t = 0; t < searchSpec(SEARCH_PLAIN).look + 0.2; t += DT) e.calmDecide(DT);
    expect(e.searchK).toBe(0);
    e.calmDecide(DT);
    expect(e.spot).toEqual([10, 0]);
  });
});

describe('A13: plan points and clamps', () => {
  it('a high-security post never asks for a plan point (he would only look from his leash edge)', () => {
    const searchPoint = vi.fn(() => true);
    const e = searcher([0, 0], { hunt: 0, combatSearch: true, searchK: 2, postDef: { highSecurity: true, leash: 4 }, post: [0, 0] }, { searchPoint, lkpOf: () => new Vector3(20, 0, 0) });
    e.aware.set('searching');
    e.calmDecide(DT);
    expect(searchPoint).not.toHaveBeenCalled();
    expect(e.planPoint).toBe(false);
  });

  it('a plan point a hold-room clamp moved: finished with reached false; one inside the room: reached true', () => {
    const room: RoomRect = { id: 'r', name: 'R', minX: 0, maxX: 6, minZ: 0, maxZ: 6 };
    const searchDone = vi.fn();
    let pt: [number, number] = [20, 3];
    const searchPoint = vi.fn((_e: unknown, out: [number, number]) => {
      out[0] = pt[0];
      out[1] = pt[1];
      return true;
    });
    const e = searcher([3, 3], { hunt: 0, combatSearch: true, searchK: 1, hold: room }, { searchPoint, searchDone, lkpOf: () => new Vector3(3, 0, 3) });
    e.aware.set('searching');
    walk(e, 20);
    expect(searchDone).toHaveBeenCalled();
    expect(searchDone.mock.calls[0]![1]).toBe(false);
    searchDone.mockClear();
    pt = [2, 2];
    walk(e, 20);
    expect(searchDone.mock.calls.some((c) => c[1] === true)).toBe(true);
  });
});

describe('A14: pickCover allocates nothing per candidate', () => {
  it('20 candidates in range, every one refused: no bytes per candidate', async () => {
    const covers: ReturnType<typeof cp>[] = [];
    for (let k = 0; k < 20; k++) covers.push(cp(-4 + (k % 5) * 2, -8 - Math.floor(k / 5) * 1.5));
    const r = roleProbe({ role: R_NONE, covers });
    // plain functions (a spy records every call)
    Object.assign(r.ctx, { reserveCover: () => false, releaseCover: () => {} });
    const pick = r.p.pickCover.bind(r.p);
    expect(pick()).toBe(false);
    const per = await bytesPerCall((m) => {
      for (let k = 0; k < m; k++) pick();
    }, 16);
    // 4.97.1: two object literals and an array per candidate (well over 1 KB a call here)
    expect(per).toBeLessThan(64);
  });
});

