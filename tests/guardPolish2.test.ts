import { describe, expect, it, vi } from 'vitest';
import { Enemy } from '../src/ai/enemy';
import { AlertMachine } from '../src/ai/alertState';
import { NavGrid } from '../src/ai/navGrid';
import { DIFFICULTY } from '../src/ai/archetypes';
import { ENEMIES } from '../src/ai/enemyDefs';
import { P_STANDARD, R_NONE, R_OVERWATCH, Rng } from '../src/ai/squadRoles';
import { Vector3 } from '../src/core/babylon';

// (guard-ai polish batch 2, group A) The brain's polish2 fixes on stand-in guards built on Enemy's prototype (no rig, no
// scene), as guardPolishA: the high-cover overwatch's suppress edge (A186) and the items that have no area test of their
// own. A184 (lockedDoorPath, nav), A185 (combatHearing), A187 (twoIntruders) and A188 (searchAreaWiring) sit with their
// area's tests. The enemy.ts switches are module consts (as batch 1's): each test here fails with its switch flipped
// (checked by hand at the build), the manager's `POLISH2` switches are flipped by the tests.

const DT = 1 / 60;
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
    num: 9700 + n++,
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
    onRoleBound: false,
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


describe('A186: a high-cover overwatch suppresses from his peek point while a mate bounds', () => {
  /** In his high cover c1 (1, -12), a mate moving, the target out of sight 5 s ago; the suppress line (static) is clear
   *  only from past the wall's side (the side step at x ~0.1), blocked from behind it. */
  function overwatch() {
    const r = roleProbe({ role: R_OVERWATCH, cover: 1, moving: false, mates: true, x: 1, z: -12, state: 'inCover' });
    Object.assign(r.e, { coverIdx: 1 });
    r.owner[1] = r.e.num;
    r.ctx.ballistics.clear = vi.fn((from: Vector3) => from.x < 0.6);
    return r;
  }

  it('in the hide phase he stays at the side step and rounds go out (4.98: back behind the wall, none)', () => {
    const r = overwatch();
    let hideRounds = 0;
    let hideSteps = 0;
    let hideAtEdge = 0;
    for (let i = 0; i < 60 * 9; i++) {
      const hide = r.p.stateT % 4.2 <= 2.4;
      const before = r.p.suppressRounds;
      const g = r.step();
      // he walks there (instant here)
      if (g.point) r.p.pos.set(g.point[0], 0, g.point[1]);
      if (hide) {
        hideSteps++;
        hideRounds += r.p.suppressRounds - before;
        if (r.p.pos.x < 0.6) hideAtEdge++;
      }
    }
    expect(r.p.state).toBe('inCover');
    expect(hideSteps).toBeGreaterThan(60 * 4);
    // (the first step is behind the wall: he walks out on it)
    expect(hideAtEdge).toBeGreaterThanOrEqual(hideSteps - 2);
    expect(hideRounds).toBeGreaterThan(0);
  });

  it('his mate stops: the hide phase is behind the wall again (no suppress, no peek point)', () => {
    const r = overwatch();
    r.e.setRole(R_OVERWATCH, 1, false, false, false, false);
    for (let i = 0; i < 60 * 2; i++) {
      const g = r.step();
      if (g.point) r.p.pos.set(g.point[0], 0, g.point[1]);
      if (r.p.stateT % 4.2 <= 2.4) expect(r.p.pos.x).toBeCloseTo(1, 5);
    }
    expect(r.p.suppressRounds).toBe(0);
  });
});

// ----- the calm searcher (guardPolishA's stand-in) -----

interface Searcher {
  aware: AlertMachine;
  pos: Vector3;
  spot: [number, number];
  hearSearch(x: number, y: number, z: number, mayBark?: boolean): boolean;
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


describe("A193: a heard spot snaps to the noise's storey", () => {
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

  it('a step on the ground floor heard from the upper floor (x >= 6 only): the spot by the step on the ground (A11: the upper floor past x 6)', () => {
    const nav = twoStorey();
    const e = searcher([8, 5, 4], {}, { nav });
    e.aware.set('searching');
    e.hearSearch(5.2, 0, 5.2);
    expect(e.spot[0]).toBeLessThan(5.5);
    // the noise on his own storey: his storey, as A11
    const g = searcher([8, 5, 4], {}, { nav });
    g.aware.set('searching');
    g.hearSearch(6.2, 4, 5.2);
    expect(g.spot[0]).toBeGreaterThan(6);
    // no height given (NaN): his own storey, as A11
    const h = searcher([8, 5, 4], {}, { nav });
    h.aware.set('searching');
    h.hearSearch(5.2, Number.NaN, 5.2);
    expect(h.spot[0]).toBeGreaterThan(6);
  });
});
