import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { AlertMachine, emptyAlertInput } from '../src/ai/alertState';
import { ringPoint, SEARCH_BODY, SEARCH_DEVICE, SEARCH_PLAIN, searchSpec } from '../src/ai/response';
import { SEARCH_AREA, areaRadius, type SearchPlan } from '../src/ai/searchArea';
import { P_STANDARD } from '../src/ai/squadRoles';
import { Vector3, type Scene } from '../src/core/babylon';
import type { AiContext, Enemy, PlayerRef } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid, P2 } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S25, A151-A153) The probable-area search wired in. On a real EnemyManager with a stub nav (1 m cells, a
// flow field set by hand: a wall line of Infinity cells, the room behind it 40 m round), a stub baked light (a dark
// corner 6 m from the last known position, the room behind the wall dark too) and three cover points: (a) a point
// behind the wall is never in the plan; (b) the dark corner is the first point handed out; (c) three searchers get three
// different points; (d) a dead searcher's claim is released. On the real Enemy search branch: (e) calm searches never
// ask the plan; (f) the plan exhausted, the ring (today's points from its first); (g) `SEARCH_AREA.enabled` false:
// today's points exactly.

const W = 40;
const OX = -20;
const OZ = -20;
const WALL_Z = 3;
const LKP = { x: 0, z: 0 };
const DARK = 0.05;
const LIT = 0.8;

const col = (x: number, z: number): number => {
  const ix = Math.floor(x - OX);
  const iz = Math.floor(z - OZ);
  return ix < 0 || iz < 0 || ix >= W || iz >= W ? -1 : iz * W + ix;
};
const centreX = (c: number): number => OX + (c % W) + 0.5;
const centreZ = (c: number): number => OZ + Math.floor(c / W) + 0.5;

/** The hand-set flow field (path m from the last known position; cell 1 m): straight-line distance on this side of the
 *  wall row, Infinity on it, 40 behind it (the long way round, past any R). */
function handField(): { walk: Uint8Array; field: Float32Array } {
  const walk = new Uint8Array(W * W);
  const field = new Float32Array(W * W);
  for (let c = 0; c < W * W; c++) {
    const z = centreZ(c);
    const wall = z >= WALL_Z && z < WALL_Z + 1;
    walk[c] = wall ? 0 : 1;
    field[c] = wall ? Infinity : z >= WALL_Z + 1 ? 40 : Math.sqrt((centreX(c) - LKP.x) ** 2 + (centreZ(c) - LKP.z) ** 2);
  }
  return { walk, field };
}

/** Baked light: the dark corner x -12..-3, z -8..3 (this side), the whole room behind the wall dark; lit elsewhere. */
const levelAt = (x: number, _y: number, z: number): number => (z >= WALL_Z || (x >= -12 && x <= -3 && z >= -8 && z < WALL_Z) ? DARK : LIT);

/** A cover point at (x, z) (the normal is not read by the plan). */
const cp = (x: number, z: number) => ({ pos: new Vector3(x, 0, z), normal: new Vector3(0, 0, 1), low: false, seg: 0, s: 0 });
/** The dark corner's cover (6 m by path), a cover behind the wall (4.2 m straight, 40 m by path), a lit cover. */
const COVERS = [cp(-6, 0), cp(0, WALL_Z + 1.2), cp(4, -4)];

interface FakeGuard {
  id: string;
  num: number;
  alive: boolean;
  alerted: boolean;
  level: string;
  hunt: number;
  onPlan: boolean;
  pos: Vector3;
  def: { kind: string };
  handler: null;
}

let n = 0;
function guard(x: number, z: number): FakeGuard {
  const num = 9700 + n++;
  return { id: `s${num}`, num, alive: true, alerted: false, level: 'searching', hunt: 0, onPlan: true, pos: new Vector3(x, 0, z), def: { kind: 'grunt' }, handler: null };
}

type Priv = { ctx: AiContext; slotFlowStep(dt: number): void; planSweep(): void; planClock: number };

/** The real manager, stealth, one intruder seen at the last known position `since` s ago, his chase field built. */
function manager(gs: FakeGuard[], since = 2) {
  const { walk, field } = handField();
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: COVERS, coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    lightField: { levelAt: vi.fn(levelAt) },
  };
  const nav = {
    walk,
    cell: 1,
    version: 0,
    cellOf: (x: number, z: number) => col(x, z),
    isWalkable: (c: number) => c >= 0 && walk[c] === 1,
    nearestWalkable: (x: number, z: number) => {
      const c = col(x, z);
      return c >= 0 && walk[c] === 1 ? c : -1;
    },
    cellHeight: () => 0,
    heightAt: () => 0,
    lineClear: () => true,
    findPath: () => null,
    flowField: vi.fn((_g: readonly P2[], out: Float32Array) => {
      out.set(field);
      return out;
    }),
  };
  const players: PlayerRef[] = [{ id: 'p1', feet: new Vector3(LKP.x, 0, LKP.z), target: { alive: true }, speed: 0, crouched: false } as unknown as PlayerRef];
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn() } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => players);
  em.stealth = true;
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
  const priv = em as unknown as Priv;
  expect(priv.ctx.reportSighting(players[0]!)).toBe(0);
  // (S26) seen `since` s ago: both clocks (a sighting is also a location; the plan reads `locT`)
  em.intruders.seenT[0] = since;
  em.intruders.locT[0] = since;
  priv.slotFlowStep(0);
  const out: P2 = [0, 0];
  const point = (g: FakeGuard): P2 | null => (priv.ctx.searchPoint!(g as unknown as Enemy, out) ? [out[0], out[1]] : null);
  return { em, priv, ctx: priv.ctx, plan: em.plans[0]!, point, world };
}

const pts = (p: SearchPlan): P2[] => {
  const o: P2[] = [];
  for (let k = 0; k < p.n; k++) o.push([p.x[k]!, p.z[k]!]);
  return o;
};

afterEach(() => {
  (SEARCH_AREA as { enabled: boolean }).enabled = true;
});

describe('the plan per intruder (EnemyManager.buildPlan)', () => {
  it('(a) a spot behind the wall (4.2 m straight, 40 m by path) is never in the plan; lit open floor is not either', () => {
    const { em, plan } = manager([]);
    em.buildPlan(0);
    expect(plan.n).toBeGreaterThan(3);
    const r = areaRadius(2);
    for (const [x, z] of pts(plan)) {
      expect(z).toBeLessThan(WALL_Z);
      // every point is a cover spot or a dark cell, within R by path
      const cover = COVERS.some((c) => c.pos.x === x && c.pos.z === z);
      expect(cover || levelAt(x, 0, z) < SEARCH_AREA.dark).toBe(true);
      expect(Math.hypot(x - LKP.x, z - LKP.z)).toBeLessThanOrEqual(r + 1);
    }
    // the same with all the time in the world (R at its cap): still nothing past the wall
    em.intruders.seenT[0] = 60;
    em.intruders.locT[0] = 60;
    (em as unknown as Priv).planClock += SEARCH_AREA.rebuild;
    em.buildPlan(0);
    expect(plan.n).toBeGreaterThan(3);
    for (const [, z] of pts(plan)) expect(z).toBeLessThan(WALL_Z);
  });

  it('(b) the dark corner 6 m away is the first point handed out, best first', () => {
    const g = guard(LKP.x, LKP.z);
    const { point, plan } = manager([g]);
    expect(point(g)).toEqual([-6, 0]);
    expect(plan.claimOf(g.num)).toBe(0);
    for (let k = 1; k < plan.n; k++) expect(plan.score[k - 1]!).toBeGreaterThanOrEqual(plan.score[k]!);
  });

  it('(c) three searchers get three different points', () => {
    const gs = [guard(0, 0), guard(1, 0), guard(0, -1)];
    const { point, plan } = manager(gs);
    const got = gs.map((g) => point(g));
    expect(got.every((p) => p !== null)).toBe(true);
    const keys = new Set(got.map((p) => `${p![0]},${p![1]}`));
    expect(keys.size).toBe(3);
    expect(gs.map((g) => plan.claimOf(g.num)).every((k) => k >= 0)).toBe(true);
  });

  it('(d) a dead searcher\'s claim is released (and one who left the search, or despawned)', () => {
    const gs = [guard(0, 0), guard(1, 0), guard(0, -1)];
    const { em, ctx, point, plan, priv } = manager(gs);
    em.coordinated = false;
    for (const g of gs) point(g);
    gs[0]!.alive = false;
    ctx.onKilled(gs[0] as unknown as Enemy, {} as never);
    expect(plan.claimOf(gs[0]!.num)).toBe(-1);
    // the freed point goes to the next searcher who asks (the best one: the dead man had it)
    const next = guard(0, 0);
    em.enemies.push(next as unknown as Enemy);
    expect(point(next)).toEqual([-6, 0]);
    // out of the search: the sweep frees it
    gs[1]!.level = 'cooldown';
    priv.planSweep();
    expect(plan.claimOf(gs[1]!.num)).toBe(-1);
    expect(plan.claimOf(gs[2]!.num)).toBeGreaterThanOrEqual(0);
    // despawned
    (gs[2] as unknown as { dispose(): void }).dispose = vi.fn();
    em.despawn(gs[2] as unknown as Enemy);
    expect(plan.claimOf(gs[2]!.num)).toBe(-1);
  });

  it('a searched point stays done by its claim; no rebuild while a claim is live; a rebuild keeps the searched points done', () => {
    const a = guard(0, 0);
    const b = guard(0, 0);
    const { em, ctx, point, plan, priv } = manager([a, b]);
    expect(point(a)).toEqual([-6, 0]);
    const built = plan.builtAt;
    // the area grows with time, but a's point is live: no rebuild under him
    em.intruders.seenT[0] = 8;
    em.intruders.locT[0] = 8;
    priv.planClock += SEARCH_AREA.rebuild + 1;
    const pb = point(b);
    expect(pb).not.toEqual([-6, 0]);
    expect(plan.builtAt).toBe(built);
    ctx.searchDone!(a as unknown as Enemy, true);
    ctx.searchDone!(b as unknown as Enemy, false);
    expect(plan.claimOf(a.num)).toBe(-1);
    // no claim live and the plan is old: rebuilt round the same position with the larger R; the corner stays done
    const p2 = point(a);
    expect(plan.builtAt).toBeGreaterThan(built);
    expect(p2).not.toBeNull();
    expect(p2).not.toEqual([-6, 0]);
    expect(p2).not.toEqual(pb);
    const k = pts(plan).findIndex(([x, z]) => x === -6 && z === 0);
    expect(k).toBeGreaterThanOrEqual(0);
    expect(plan.done[k]).toBe(1);
  });

  it('(guard-ai S26, A157) a plan built 10 s after the sighting but 0.5 s after a heard report: R = areaRadius(0.5)', () => {
    const { em, plan } = manager([], 10);
    // heard 0.5 s ago at the same spot (located, not seen)
    em.intruders.report(0, LKP.x, 0, LKP.z, false);
    em.intruders.step(0.5);
    expect(em.intruders.seenT[0]).toBeCloseTo(10.5, 4);
    em.buildPlan(0);
    expect(plan.builtAt).toBeGreaterThanOrEqual(0);
    const planR = (em as unknown as { planR: Float32Array }).planR;
    expect(planR[0]).toBeCloseTo(areaRadius(0.5), 5);
    expect(planR[0]).toBeLessThan(areaRadius(10));
  });

  it('exhausted, off, the parked modes or no intruder: no point (the ring)', () => {
    const g = guard(0, 0);
    const { em, ctx, point, plan } = manager([g]);
    let got = 0;
    while (point(g) && got < 50) {
      ctx.searchDone!(g as unknown as Enemy, true);
      got++;
    }
    expect(got).toBe(plan.n);
    expect(point(g)).toBeNull();
    const h = guard(0, 0);
    h.hunt = -1;
    expect(point(h)).toBeNull();
    (SEARCH_AREA as { enabled: boolean }).enabled = false;
    plan.reset(0, 0, -1);
    expect(point(guard(0, 0))).toBeNull();
    (SEARCH_AREA as { enabled: boolean }).enabled = true;
    em.stealth = false;
    expect(point(guard(0, 0))).toBeNull();
  });
});

// ----- on the real Enemy search branch (stand-in on its prototype, as bodySearch.test.ts) -----

type Goal = { point: P2 | null; speed: number; face: number | null };
type Searcher = {
  bodySearch(x: number, z: number): void;
  searchAt(x: number, z: number, revive: null, kind?: number): void;
  updateAwareness(dt: number): void;
  calmDecide(dt: number): Goal;
  aware: AlertMachine;
  pos: Vector3;
  spot: P2;
  hunt: number;
  combatSearch: boolean;
  searchOwn: boolean;
  num: number;
  onPlan: boolean;
};

async function searcher(ctx: Partial<AiContext>): Promise<Searcher> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    aware: new AlertMachine(),
    alertIn: emptyAlertInput(),
    health: { alive: true },
    passive: false,
    taken: false,
    los: false,
    smelled: false,
    rate: 0,
    meter: 0,
    sinceSeen: 99,
    called: 0,
    heard: false,
    gunfire: false,
    alarm: null,
    state: 'idle',
    incident: -1,
    incMode: 0,
    incCalm: false,
    turnT: 0,
    caution: 0,
    responder: false,
    tacticsProfile: P_STANDARD,
    brkGroup: -1,
    stimulus: [0, 0],
    hasStimulus: false,
    searchReq: false,
    searchOwn: false,
    searchKind: SEARCH_PLAIN,
    searchRoom: null,
    reviving: null,
    camBody: null,
    camBodyT: 0,
    combatSearch: false,
    spot: [0, 0],
    spotSet: false,
    spotArrived: false,
    spotLookT: 0,
    lookBase: 0,
    searchK: 0,
    planPoint: false,
    planN: 0,
    hunt: -1,
    num: 4242,
    routePath: [],
    entry: null,
    crew: null,
    hold: null,
    postDef: null,
    post: [0, 0],
    yaw: 0,
    rush: false,
    pos: new Vector3(0, 0, 0),
    def: { walkSpeed: 0.9, runSpeed: 3.2, kind: 'grunt', scale: 1 },
    ctx: {
      coordinated: () => true,
      stealth: () => true,
      lkpValid: () => true,
      lkp: new Vector3(5, 0, -3),
      lkpOf: (s: number) => (s === 0 ? new Vector3(5, 0, -3) : null),
      searchSlot: () => 1,
      nav: { nearestWalkable: () => -1 },
      ...ctx,
    },
    lc: { active: false, stop() {} },
    lure: { cancel() {}, active: false },
    walker: { rejoin() {} },
    bark() {},
    setState() {},
    goTo: (p: P2) => p,
  });
  return e as unknown as Searcher;
}

/** Walks the search on the real branch (teleporting to each step's point): the distinct spots in order, up to `max`. */
function spots(e: Searcher, max: number): P2[] {
  const out: P2[] = [];
  const dt = 0.05;
  for (let i = 0; i < 4000 && out.length < max; i++) {
    const g = e.calmDecide(dt);
    const last = out[out.length - 1];
    if (!last || last[0] !== e.spot[0] || last[1] !== e.spot[1]) out.push([e.spot[0], e.spot[1]]);
    if (g.point) e.pos.set(g.point[0], 0, g.point[1]);
  }
  return out;
}

/** A combat search (alert -> searching) on intruder 0, round his last known position (5, -3). */
function combat(e: Searcher): void {
  e.aware.set('searching');
  e.combatSearch = true;
  e.searchOwn = false;
  e.hunt = 0;
}

/** Today's points: the last known position, then the plain ring from its first point (slot 1). */
function ring(cx: number, cz: number, count: number, from = 0, kind = SEARCH_PLAIN): P2[] {
  const o: P2[] = [];
  for (let k = from; k < from + count; k++) o.push(ringPoint(cx, cz, k, 1, searchSpec(kind), [0, 0]));
  return o;
}

describe('Enemy.decide: the search branch', () => {
  it('a combat search asks the plan after the last known position; each point is done once looked into', async () => {
    const plan: P2[] = [[-1, -1], [9, -7]];
    let i = 0;
    const searchPoint = vi.fn((_e: Enemy, out: P2) => {
      const p = plan[i++];
      if (!p) return false;
      out[0] = p[0];
      out[1] = p[1];
      return true;
    });
    const searchDone = vi.fn();
    const e = await searcher({ searchPoint, searchDone });
    combat(e);
    const got = spots(e, 5);
    // (f) the plan exhausted: the ring, today's points from its first
    expect(got).toEqual([[5, -3], [-1, -1], [9, -7], ...ring(5, -3, 2)]);
    expect(searchDone).toHaveBeenCalledTimes(2);
    expect(searchDone.mock.calls.every((c) => c[1] === true)).toBe(true);
    expect(e.onPlan).toBe(false);
  });

  it('(e) calm searches (a body, a call, a device; searchOwn) never ask the plan', async () => {
    const searchPoint = vi.fn(() => true);
    for (const [kind, start] of [
      [SEARCH_BODY, (e: Searcher) => e.bodySearch(2, 2)],
      [SEARCH_PLAIN, (e: Searcher) => e.searchAt(2, 2, null)],
      [SEARCH_DEVICE, (e: Searcher) => e.searchAt(2, 2, null, SEARCH_DEVICE)],
    ] as const) {
      const e = await searcher({ searchPoint });
      e.hunt = 0;
      start(e);
      e.updateAwareness(0.05);
      expect(e.aware.level).toBe('searching');
      expect(e.combatSearch).toBe(false);
      expect(spots(e, 4)).toEqual([[2, 2], ...ring(2, 2, 3, 0, kind)]);
    }
    // a combat search with no intruder of his own (hunt -1) keeps today's points too (round where he stands)
    const today = await searcher({});
    combat(today);
    today.hunt = -1;
    today.pos.set(1, 0, 1);
    const e = await searcher({ searchPoint });
    combat(e);
    e.hunt = -1;
    e.pos.set(1, 0, 1);
    expect(spots(e, 4)).toEqual(spots(today, 4));
    expect(searchPoint).not.toHaveBeenCalled();
  });

  it('(g) SEARCH_AREA.enabled false: today\'s points exactly (no hook asked)', async () => {
    const today = await searcher({});
    combat(today);
    const base = spots(today, 8);
    expect(base).toEqual([[5, -3], ...ring(5, -3, 7)]);
    (SEARCH_AREA as { enabled: boolean }).enabled = false;
    const searchPoint = vi.fn(() => true);
    const off = await searcher({ searchPoint, searchDone: vi.fn() });
    combat(off);
    expect(spots(off, 8)).toEqual(base);
    expect(searchPoint).not.toHaveBeenCalled();
  });

  it('an unreachable plan point is done too (searchDone with reached false), then the next', async () => {
    let i = 0;
    const searchPoint = vi.fn((_e: Enemy, out: P2) => {
      if (i++ > 0) return false;
      out[0] = 30;
      out[1] = 30;
      return true;
    });
    const searchDone = vi.fn();
    const e = await searcher({ searchPoint, searchDone });
    combat(e);
    // no path to (30, 30): goTo gives nothing and no route
    (e as unknown as { goTo: (p: P2) => P2 | null }).goTo = (p: P2) => (p[0] === 30 ? null : p);
    const got = spots(e, 3);
    expect(got).toEqual([[5, -3], [30, 30], ...ring(5, -3, 1)]);
    expect(searchDone).toHaveBeenCalledTimes(1);
    expect(searchDone.mock.calls[0]![1]).toBe(false);
  });
});
