import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { PAIRS, PAIR_LINES, pickMeet, type MeetPick } from '../src/ai/pairs';
import { PATROL, PatrolWalker, type PatrolRoute } from '../src/ai/patrol';
import { AlertMachine } from '../src/ai/alertState';
import { PostLure } from '../src/ai/posts';
import { hyp2 } from '../src/core/mathx';
import { flags } from '../src/core/flags';
import { Vector3, type Scene } from '../src/core/babylon';
import type { AiContext, Enemy } from '../src/ai/enemy';
import type { P2 } from '../src/ai/navGrid';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S10, GA2, the `pair` tag) Talking pairs wired into the manager: `placeSlot` builds a `PairMeet` for two
// guards tagged as a pair whose timed loops overlap (`pickMeet`), `pairStep` fills both sides from the guards, steps it
// and acts: hold and face while meeting, the lines over the speaker, an interrupt on a disturbance, the one left sent to
// look for a partner who never came (the S5b `missing` path). Stand-in guards walk real `PatrolWalker`s.

const PERIOD = 60;
const SPEED = 1.2;
/** Two timed loops meeting 2 m apart at stop 1 (A at (-1, 0), B at (1, 0)); `leave1` = when they leave it. */
const routeA = (leave1 = 25): PatrolRoute => ({
  points: [
    [-10, 0],
    [-1, 0],
    [-10, 8],
  ],
  loop: { period: PERIOD, leave: [0, leave1, 40], t0: 0 },
});
const routeB = (leave1 = 25): PatrolRoute => ({
  points: [
    [10, 0],
    [1, 0],
    [10, 8],
  ],
  loop: { period: PERIOD, leave: [0, leave1, 40], t0: 0 },
});

interface FakeGuard {
  id: string;
  num: number;
  key: number;
  ko: boolean;
  alive: boolean;
  alerted: boolean;
  taken: boolean;
  dog: object | null;
  level: string;
  incident: number;
  squad: number;
  section: number;
  slotIdx: number;
  pairSlot: number;
  pairCalm: boolean;
  disturbed: boolean;
  pairFace: number;
  pairPt: P2;
  pos: Vector3;
  yaw: number;
  walker: PatrolWalker | null;
  patrolRoute: PatrolRoute | null;
  def: { melee: object | null; kind: string; scale: number; walkSpeed: number };
  sayLine: ReturnType<typeof vi.fn>;
  pairSearch: ReturnType<typeof vi.fn>;
  searchAt: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
  [k: string]: unknown;
}

let n = 0;
function guard(route: PatrolRoute | null, x = 0, z = 0, o: Partial<FakeGuard> = {}): FakeGuard {
  const num = 8000 + n++;
  const p0 = route?.points[0];
  const w = route ? new PatrolWalker(route, p0![0], p0![1], 0, 0) : null;
  const g: FakeGuard = {
    id: `p${num}`,
    num,
    key: n,
    ko: false,
    alive: true,
    alerted: false,
    passive: false,
    taken: false,
    runningAlarm: false,
    dog: null,
    buff: false,
    secure: false,
    level: 'unaware',
    incident: -1,
    caution: 0,
    squad: -1,
    section: 0,
    coverIdx: -1,
    roleBound: false,
    roleFlags: 0,
    job: '',
    setGear: vi.fn(), // (guard-ai S12) placeSlot puts gear on him
    zone: '',
    zoneR: 0,
    zoneX: 0,
    zoneZ: 0,
    slotIdx: -1,
    handlerSlot: -1,
    handler: null,
    leader: null,
    pairSlot: -1,
    pairCalm: true,
    disturbed: false,
    pairFace: Number.NaN,
    pairPt: [0, 0],
    // (guard-rules S6) read by `postedWhyNot` (flag on): no post tag; his post centre is his spawn point
    postDef: null,
    postPoint: p0 ? [p0[0], p0[1]] : [x, z],
    def: { melee: null, kind: 'grunt', scale: 1, walkSpeed: SPEED },
    pos: new Vector3(p0 ? p0[0] : x, 0, p0 ? p0[1] : z),
    yaw: 0,
    walker: w,
    patrolRoute: route,
    loopTime: () => (w ? w.loopTime() : Number.NaN),
    routePoint(out: P2): P2 {
      const p = route && w ? route.points[w.idx]! : ([g.pos.x, g.pos.z] as P2);
      out[0] = p[0];
      out[1] = p[1];
      return out;
    },
    inLeash: () => true,
    sayLine: vi.fn(),
    bark: vi.fn(),
    searchAt: vi.fn(),
    pairSearch: vi.fn(),
    sendTo: vi.fn(),
    checkLight: vi.fn(),
    ack: vi.fn(),
    hear: vi.fn(),
    hearTurn: vi.fn(),
    lureTo: vi.fn(),
    radio: vi.fn(),
    runAlarm: vi.fn(),
    koSearch: vi.fn(),
    dispose: vi.fn(),
    setPost: vi.fn(),
    setCaution(c: number) {
      g.caution = c;
    },
    ...o,
  };
  return g;
}

const E = (g: FakeGuard) => g as unknown as Enemy;

interface Priv {
  pairStep(dt: number): void;
  swapSlot(old: Enemy, e: Enemy): void;
  silent: Set<Enemy>;
}

function manager(gs: FakeGuard[]) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    lightField: { totalAt: () => 0 },
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn(() => true) } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  for (const g of gs) em.enemies.push(E(g));
  em.stealth = true;
  return { em, priv: em as unknown as Priv };
}

type Slot = { kind: 'grunt' | 'dog'; x: number; z: number; yaw: number; squad?: number; pair?: number };

function place(em: EnemyManager, gs: FakeGuard[], slots: Slot[], section = 0, order?: number[]): void {
  for (const i of order ?? slots.map((_, k) => k)) em.placeSlot(E(gs[i]!), slots[i]!, section, slots, i);
}

/** One guard's tick: his walker (the clock, the schedule), then the walk; a meeting holds him at his meet point. */
function walk(g: FakeGuard, dt: number): void {
  const w = g.walker;
  if (!w || !g.alive) return;
  w.tick(dt);
  const tgt = w.step(dt, g.pos.x, g.pos.z);
  let goal: P2 | null = tgt;
  if (g.pairFace === g.pairFace) {
    goal = hyp2(g.pairPt[0] - g.pos.x, g.pairPt[1] - g.pos.z) > PATROL.arrive ? g.pairPt : null;
    if (!goal) g.yaw = g.pairFace;
  }
  if (!goal) return;
  const dx = goal[0] - g.pos.x;
  const dz = goal[1] - g.pos.z;
  const d = hyp2(dx, dz);
  const s = Math.min(d, g.def.walkSpeed * dt);
  if (d > 1e-6) {
    g.pos.x += (dx / d) * s;
    g.pos.z += (dz / d) * s;
  }
}

/** Run `seconds`: the guards at 20 Hz, the pairs at the board rate; `each(t)` before every pair step. */
function sim(priv: Priv, gs: FakeGuard[], seconds: number, each?: (t: number) => void, t0 = 0): number {
  const dt = 0.05;
  const per = Math.round(PAIRS.tick / dt);
  let t = t0;
  for (let i = 1; i <= Math.round(seconds / dt); i++) {
    t += dt;
    for (const g of gs) walk(g, dt);
    if (i % per === 0) {
      each?.(t);
      priv.pairStep(PAIRS.tick);
    }
  }
  return t;
}

const pairSlots = (): Slot[] => [
  { kind: 'grunt', x: -10, z: 0, yaw: 0, squad: 0, pair: 1 },
  { kind: 'grunt', x: 10, z: 0, yaw: 0, squad: 0, pair: 0 },
];

describe('pickMeet: where two timed loops meet', () => {
  it('the nearest stops whose stays overlap; none within maxD -> false', () => {
    const m: MeetPick = { stopA: 0, stopB: 0, open: 0, close: 0, d: 0 };
    expect(pickMeet(routeA(), routeB(), SPEED, PAIRS.meetMax, m)).toBe(true);
    expect([m.stopA, m.stopB]).toEqual([1, 1]);
    expect(m.d).toBeCloseTo(2, 5);
    expect(m.open).toBeCloseTo(9 / SPEED, 5);
    expect(m.close).toBe(25);
    expect(pickMeet(routeA(), routeB(), SPEED, 1.5, m)).toBe(false);
    expect(pickMeet({ points: [[0, 0], [1, 0]] }, routeB(), SPEED, PAIRS.meetMax, m)).toBe(false);
  });

  it('side by side at every stop (the campus car-park pair): the tie goes to the longest stay', () => {
    const ra: PatrolRoute = { points: [[-29, -66.2], [-21, -66.2], [-21, -63.8], [-29, -63.8]], loop: { period: 42, leave: [4.5, 18, 25, 38], t0: 0 } };
    const rb: PatrolRoute = { points: [[-29, -65.2], [-21, -65.2], [-21, -62.8], [-29, -62.8]], loop: { period: 42, leave: [4.5, 18, 25, 38], t0: 0 } };
    const m: MeetPick = { stopA: 0, stopB: 0, open: 0, close: 0, d: 0 };
    expect(pickMeet(ra, rb, 0.85, PAIRS.meetMax, m)).toBe(true);
    // stop 0 (from 38 + 2.4 / 0.85 to 4.5, wrapping) is the longest of the four 1 m-apart stays
    expect([m.stopA, m.stopB]).toEqual([0, 0]);
    expect(m.open).toBeCloseTo(38 + 2.4 / 0.85, 4);
    expect(m.close).toBeCloseTo(4.5, 5);
  });
});

describe('live map data', () => {
  it('every `pair` in the live sectors (Tallow Wharf, if any) has a meeting window', async () => {
    const { WHARF_SECTORS } = await import('../src/world/maps/tallowWharfSectors');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    let pairs = 0;
    for (const s of WHARF_SECTORS) {
      s.guards.forEach((a, i) => {
        const j = a.pair;
        if (j === undefined || j < i) return;
        const b = s.guards[j]!;
        pairs++;
        const ids = `${s.id} ${i} + ${j}`;
        if (a.loop && b.loop) {
          // two timed loops: a meeting window
          const ra: PatrolRoute = { points: a.route ?? [], loop: a.loop };
          const rb: PatrolRoute = { points: b.route ?? [], loop: b.loop };
          const m: MeetPick = { stopA: 0, stopB: 0, open: 0, close: 0, d: 0 };
          const speed = Math.min(ENEMIES[a.kind].walkSpeed, ENEMIES[b.kind].walkSpeed);
          expect(pickMeet(ra, rb, speed, PAIRS.meetMax, m), ids).toBe(true);
        } else if (!a.route && !b.route) {
          // (guard-rules S6) two standing guards: a posted pair (flag on) needs their posts within `meetMax`
          expect(hyp2(a.x - b.x, a.z - b.z), ids).toBeLessThanOrEqual(PAIRS.meetMax);
        } else {
          expect.fail(`${ids}: neither two timed loops nor two standing guards`);
        }
      });
    }
    expect(pairs).toBeGreaterThanOrEqual(0);
  });
});

describe('placeSlot builds the talking pairs', () => {
  it('one pair per two tagged guards (either order, the mirror tag skipped): id section x 100 + the lower slot', () => {
    for (const order of [
      [0, 1],
      [1, 0],
    ]) {
      const gs = [guard(routeA()), guard(routeB())];
      const { em } = manager(gs);
      place(em, gs, pairSlots(), 3, order);
      expect(em.pairs.length).toBe(1);
      const p = em.pairs[0]!;
      expect([p.sa, p.sb]).toEqual([0, 1]);
      expect(p.pm.def.id).toBe(300);
      expect(p.pm.def.aPt).toEqual([-1, 0]);
      expect(p.pm.def.bPt).toEqual([1, 0]);
      expect(em.pairSkips).toEqual([]);
    }
  });

  it('(S10 check fix) both slots placed again with new guards (same list): the pair is built afresh on their clocks', () => {
    const gs = [guard(routeA()), guard(routeB())];
    const { em, priv } = manager(gs);
    const slots = pairSlots();
    place(em, gs, slots);
    const old = em.pairs[0]!;
    // the first pair runs 25 s (met and done), then a stale hold is left on A as if mid-talk
    sim(priv, gs, 25);
    expect(em.pairLines).toBe(2);
    gs[0]!.pairFace = 1;
    // both respawn into their slots: new walkers, loop time 0 again
    const ns = [guard(routeA()), guard(routeB())];
    em.enemies.length = 0;
    for (const g of ns) em.enemies.push(E(g));
    place(em, ns, slots);
    expect(em.pairs.length).toBe(1);
    expect(em.pairs[0]).not.toBe(old);
    expect(em.pairs[0]!.pm.loopNow()).toBeCloseTo(0, 5);
    // the old occupant is out of the pair: no hold left on him
    expect(Number.isNaN(gs[0]!.pairFace)).toBe(true);
    // they meet in the first window (7.5 s) of their own clocks (the kept old clock would open it ~42 s later)
    sim(priv, ns, 20);
    expect(em.pairLines).toBe(4);
    expect(ns[0]!.sayLine).toHaveBeenCalledTimes(1);
    expect(ns[1]!.sayLine).toHaveBeenCalledTimes(1);
  });

  it('one tag is enough (the partner untagged)', () => {
    const gs = [guard(routeA()), guard(routeB())];
    const { em } = manager(gs);
    const slots = pairSlots();
    delete slots[0]!.pair;
    place(em, gs, slots);
    expect(em.pairs.length).toBe(1);
  });

  it('skipped and logged: no timed loop, periods that differ, stays that never overlap, a dog', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cases: [PatrolRoute | null, PatrolRoute | null, string][] = [
      [routeA(), { points: [[10, 0], [1, 0]] }, 'timed loop'],
      [routeA(), { ...routeB(), loop: { period: 50, leave: [0, 25, 40], t0: 0 } }, 'periods differ'],
      // B stands at his stop 1 only from 40 s on, after A has gone at 25 s
      [routeA(), { ...routeB(), loop: { period: PERIOD, leave: [30, 50, 55], t0: 0 } }, 'no overlapping'],
    ];
    for (const [ra, rb, why] of cases) {
      const gs = [guard(ra), guard(rb)];
      const { em } = manager(gs);
      place(em, gs, pairSlots());
      expect(em.pairs.length, why).toBe(0);
      expect(em.pairSkips.join(' '), why).toContain(why);
    }
    const gs = [guard(routeA()), guard(routeB(), 0, 0, { dog: {}, def: { melee: {}, kind: 'dog', scale: 1, walkSpeed: SPEED } })];
    const { em } = manager(gs);
    place(em, gs, pairSlots());
    expect(em.pairs.length).toBe(0);
    expect(em.pairSkips[0]).toContain('dog');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('a pair meets, talks, splits', () => {
  it('they meet at their stops, face each other, say two lines over the speakers in order, then let go', () => {
    const gs = [guard(routeA()), guard(routeB())];
    const { em, priv } = manager(gs);
    place(em, gs, pairSlots());
    const [A, B] = gs as [FakeGuard, FakeGuard];
    let faced = false;
    sim(priv, gs, 20, () => {
      if (A.pairFace === A.pairFace) faced = true;
    });
    expect(faced).toBe(true);
    // A faces +X (towards B), B faces -X
    expect(A.yaw).toBeCloseTo(Math.PI / 2, 1);
    expect(B.yaw).toBeCloseTo(-Math.PI / 2, 1);
    expect(em.pairLines).toBe(2);
    const ex = PAIR_LINES[em.pairs[0]!.pm.exchange]!;
    // opener A on the first meeting, then B replies
    expect(A.sayLine.mock.calls).toEqual([[ex[0]]]);
    expect(B.sayLine.mock.calls).toEqual([[ex[1]]]);
    // the talk is over: the hold is off
    expect(Number.isNaN(A.pairFace) && Number.isNaN(B.pairFace)).toBe(true);
    expect(em.pairs[0]!.pm.state).toBe('done');
  });

  it('a short stay: held at the meet point until the talk ends, then he walks on and the loop takes the delay back', () => {
    // they leave stop 1 at 9 s (the window is 7.5 .. 9 s): the talk runs to ~14 s
    const gs = [guard(routeA(9)), guard(routeB(9))];
    const { em, priv } = manager(gs);
    place(em, gs, pairSlots());
    const [A] = gs as [FakeGuard, FakeGuard];
    let heldMax = 0;
    sim(priv, gs, 13, (t) => {
      if (t > 9.5) heldMax = Math.max(heldMax, hyp2(A.pos.x + 1, A.pos.z));
    });
    expect(em.pairLines).toBe(2);
    expect(heldMax).toBeLessThan(PATROL.arrive + 0.05);
    // after the talk he walks on to stop 2 and still leaves it at 40 s (his loop clock was never broken)
    sim(priv, gs, 26, undefined, 13);
    expect(A.walker!.idx).toBe(2);
    expect(hyp2(A.pos.x + 10, A.pos.z - 8)).toBeLessThan(PATROL.arrive);
    sim(priv, gs, 2, undefined, 39);
    expect(A.walker!.idx).toBe(0);
  });

  it('a disturbance (a look toward a sound) after the first line: no second line, interrupted for that window', () => {
    const gs = [guard(routeA()), guard(routeB())];
    const { em, priv } = manager(gs);
    place(em, gs, pairSlots());
    const [A, B] = gs as [FakeGuard, FakeGuard];
    sim(priv, gs, 20, () => {
      if (em.pairLines === 1) B.disturbed = true;
    });
    expect(em.pairLines).toBe(1);
    expect(em.pairs[0]!.pm.state).toBe('interrupted');
    expect(Number.isNaN(A.pairFace)).toBe(true);
  });

  it('a guard not calm (cautious, on a task) never starts a talk', () => {
    const gs = [guard(routeA()), guard(routeB())];
    const { em, priv } = manager(gs);
    place(em, gs, pairSlots());
    gs[1]!.pairCalm = false;
    sim(priv, gs, 20);
    expect(em.pairLines).toBe(0);
    expect(em.pairMisses).toBe(0);
  });
});

describe('take one before the meeting: the other searches', () => {
  it('B down unseen before the window: after the grace A is sent (missing incident, the lead) to B\'s stop; once', () => {
    const gs = [guard(routeA()), guard(routeB())];
    const { em, priv } = manager(gs);
    place(em, gs, pairSlots());
    const [A, B] = gs as [FakeGuard, FakeGuard];
    let sentAt = -1;
    sim(priv, gs, 20, (t) => {
      if (t >= 2 && B.alive) {
        B.alive = false;
        B.ko = true;
      }
      if (sentAt < 0 && A.pairSearch.mock.calls.length) sentAt = t;
    });
    expect(em.pairLines).toBe(0);
    expect(em.pairMisses).toBe(1);
    expect(A.pairSearch).toHaveBeenCalledTimes(1);
    const [x, z, inc, lead] = A.pairSearch.mock.calls[0]!;
    // B's last route point while he was up: his meet stop
    expect([x, z]).toEqual([1, 0]);
    expect(lead).toBe(true);
    expect(em.board.kindOf(inc as number)).toBe('missing');
    // the window opens at 7.5 s; the request fires `grace` later (+ one board step)
    expect(sentAt).toBeGreaterThanOrEqual(9 / SPEED + PAIRS.grace - 0.05);
    expect(sentAt).toBeLessThanOrEqual(9 / SPEED + PAIRS.grace + PAIRS.tick + 0.05);
    expect(em.pairs[0]!.pm.state).toBe('missing');
    // he counts as missed: the squad's radio check does not miss him again
    expect(priv.silent.has(E(B))).toBe(true);
    em.radioCheckNow();
    expect(em.radioMisses).toBe(0);
  });

  it('the partner woken (his slot holds the new guard): the pair starts over and meets at the next window', () => {
    const gs = [guard(routeA()), guard(routeB())];
    const { em, priv } = manager(gs);
    place(em, gs, pairSlots());
    const [A, B] = gs as [FakeGuard, FakeGuard];
    let t = sim(priv, gs, 20, (tt) => {
      if (tt >= 2 && B.alive) B.alive = false;
    });
    expect(em.pairs[0]!.pm.state).toBe('missing');
    // woken: the same walker (Enemy.inherit), on his feet at his stop 1
    const B2 = guard(null, 1, 0, { walker: B.walker, patrolRoute: B.patrolRoute, slotIdx: B.slotIdx, routePoint: B.routePoint, loopTime: B.loopTime });
    em.enemies.push(E(B2));
    priv.swapSlot(E(B), E(B2));
    B.walker!.tick(t - 2);
    t = sim(priv, [A, B2], 0.4, undefined, t);
    expect(em.pairs[0]!.pm.state).not.toBe('missing');
    // the next loop's window (67.5 s): they meet and talk (the second meeting: B opens)
    sim(priv, [A, B2], 60 + 15 - t, undefined, t);
    expect(em.pairLines).toBe(2);
    expect(B2.sayLine).toHaveBeenCalledTimes(1);
    expect(A.sayLine).toHaveBeenCalledTimes(1);
  });

  it('parked modes (not coordinated): the one left searches the spot himself', () => {
    const gs = [guard(routeA()), guard(routeB())];
    const { em, priv } = manager(gs);
    em.coordinated = false;
    place(em, gs, pairSlots());
    const [A, B] = gs as [FakeGuard, FakeGuard];
    sim(priv, gs, 20, (t) => {
      if (t >= 2) B.alive = false;
    });
    expect(A.searchAt).toHaveBeenCalledTimes(1);
    expect(A.searchAt.mock.calls[0]!.slice(0, 2)).toEqual([1, 0]);
    expect(A.pairSearch).not.toHaveBeenCalled();
  });
});

// ----- Enemy: the hold branch of the calm patrol -----

interface Probe {
  calmDecide(dt: number): { point: P2 | null; speed: number; face: number | null };
  pairFace: number;
  pairPt: P2;
  pos: { x: number; y: number; z: number };
  walker: { step: ReturnType<typeof vi.fn>; lookYaw: number; route: null; idx: number };
  pairCalm: boolean;
  disturbed: boolean;
  aware: AlertMachine;
  caution: number;
  incident: number;
  turnT: number;
  rate: number;
  routePoint(out: P2): P2;
}

async function probe(x: number, z: number): Promise<Probe> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    aware: new AlertMachine(),
    health: { alive: true },
    passive: false,
    taken: false,
    meter: 0,
    rate: 0,
    caution: 0,
    incident: -1,
    camBody: null,
    pos: { x, y: 0, z },
    post: [x, z] as P2,
    stimulus: [0, 0] as P2,
    hasStimulus: false,
    turnT: 0,
    lure: new PostLure(),
    dog: null,
    routePath: [],
    def: { walkSpeed: 0.9, kind: 'grunt' },
    ctx: {} as AiContext,
    walker: { step: vi.fn(() => [9, 9] as P2), lookYaw: Number.NaN, route: null, idx: 0 },
    pairFace: Number.NaN,
    pairPt: [0, 0] as P2,
    pairGoal: { point: null, speed: 0, face: null },
    goTo(p: P2): P2 | null {
      return p;
    },
  });
  return e as unknown as Probe;
}

describe('Enemy: the talking pair hold', () => {
  it('meeting: on to his meet point, then he stands facing his partner; the walker still steps (its schedule runs on)', async () => {
    const g = await probe(3, 0);
    g.pairFace = 1.2;
    g.pairPt[0] = 0;
    g.pairPt[1] = 0;
    let goal = g.calmDecide(0.05);
    expect(goal.point).toEqual([0, 0]);
    expect(goal.speed).toBeCloseTo(0.9, 5);
    g.pos.x = 0.2;
    goal = g.calmDecide(0.05);
    expect(goal.point).toBeNull();
    expect(goal.speed).toBe(0);
    expect(goal.face).toBe(1.2);
    expect(g.walker.step).toHaveBeenCalledTimes(2);
    // no meeting: the walker's point as before
    g.pairFace = Number.NaN;
    goal = g.calmDecide(0.05);
    expect(goal.point).toEqual([9, 9]);
  });

  it('pairCalm: unaware, not cautious, no task; disturbed: a look toward a sound, a glimpse building; routePoint: his post without a route', async () => {
    const g = await probe(2, 3);
    expect(g.pairCalm).toBe(true);
    g.caution = 1;
    expect(g.pairCalm).toBe(false);
    g.caution = 0;
    g.incident = 4;
    expect(g.pairCalm).toBe(false);
    g.incident = -1;
    expect(g.disturbed).toBe(false);
    g.turnT = 1;
    expect(g.disturbed).toBe(true);
    g.turnT = 0;
    g.rate = 1;
    expect(g.disturbed).toBe(true);
    expect(g.routePoint([0, 0])).toEqual([2, 3]);
  });
});

// ----- (guard-rules S6, A10, A11) flags.guardPairs: posted pairs and the walking-together check -----

/** Two standing guards (no route), `gap` m apart, back to back, tagged as a pair. */
const standSlots = (gap: number): Slot[] => [
  { kind: 'grunt', x: 0, z: 0, yaw: -Math.PI / 2, squad: 0, pair: 1 },
  { kind: 'grunt', x: gap, z: 0, yaw: Math.PI / 2, squad: 0, pair: 0 },
];
/** Two timed loops side by side, 1 m apart at every stop (the campus car-park shape). */
const sideA = (): PatrolRoute => ({ points: [[-29, -66.2], [-21, -66.2], [-21, -63.8], [-29, -63.8]], loop: { period: 42, leave: [4.5, 18, 25, 38], t0: 0 } });
const sideB = (): PatrolRoute => ({ points: [[-29, -65.2], [-21, -65.2], [-21, -62.8], [-29, -62.8]], loop: { period: 42, leave: [4.5, 18, 25, 38], t0: 0 } });

describe('(guard-rules S6) posted pairs and the walking-together check', () => {
  const flagWas = flags.guardPairs;
  afterEach(() => {
    flags.guardPairs = flagWas;
  });

  it('flag off: two standing guards tagged as a pair are not a pair (today: not on a timed loop)', () => {
    flags.guardPairs = false;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gs = [guard(null, 0, 0), guard(null, 1.2, 0)];
    const { em } = manager(gs);
    place(em, gs, standSlots(1.2));
    expect(em.pairs.length).toBe(0);
    expect(em.pairSkips.join(' ')).toContain('timed loop');
    expect(em.pairSkips.join(' ')).not.toContain('posted pair');
    warn.mockRestore();
  });

  it('flag on: the same two, 1.2 m apart, are a posted pair at their posts; they talk at once', () => {
    flags.guardPairs = true;
    const gs = [guard(null, 0, 0), guard(null, 1.2, 0)];
    const { em, priv } = manager(gs);
    place(em, gs, standSlots(1.2), 2);
    expect(em.pairSkips).toEqual([]);
    expect(em.pairs.length).toBe(1);
    const p = em.pairs[0]!;
    expect([p.sa, p.sb]).toEqual([0, 1]);
    expect(p.pm.def.posted && p.pm.def.watch).toBe(true);
    expect(p.pm.def.aPt).toEqual([0, 0]);
    expect(p.pm.def.bPt).toEqual([1.2, 0]);
    expect(p.pm.def.id).toBe(200);
    sim(priv, gs, 12);
    expect(em.pairLines).toBe(2);
    expect(gs[0]!.sayLine).toHaveBeenCalledTimes(1);
    expect(gs[1]!.sayLine).toHaveBeenCalledTimes(1);
  });

  it('flag on: standing guards 8 m apart are skipped (posted pair: over 6 m)', () => {
    flags.guardPairs = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gs = [guard(null, 0, 0), guard(null, 8, 0)];
    const { em } = manager(gs);
    place(em, gs, standSlots(8));
    expect(em.pairs.length).toBe(0);
    const msg = em.pairSkips.join(' ');
    expect(msg).toContain('timed loop');
    expect(msg).toContain('posted pair');
    expect(msg).toContain(`over ${PAIRS.meetMax} m`);
    warn.mockRestore();
  });

  it('flag on: one timed loop + one standing is skipped (today: not on a timed loop)', () => {
    flags.guardPairs = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gs = [guard(routeA()), guard(null, 1, 0)];
    const { em } = manager(gs);
    place(em, gs, standSlots(1.2));
    expect(em.pairs.length).toBe(0);
    expect(em.pairSkips.join(' ')).toContain('timed loop');
    warn.mockRestore();
  });

  it('a timed-loop pair gets the walking-together check with the flag on, not with it off', () => {
    for (const on of [true, false]) {
      flags.guardPairs = on;
      const gs = [guard(routeA()), guard(routeB())];
      const { em } = manager(gs);
      place(em, gs, pairSlots());
      expect(em.pairs.length).toBe(1);
      expect(em.pairs[0]!.pm.def.watch).toBe(on);
      expect(em.pairs[0]!.pm.def.posted).toBeUndefined();
    }
  });

  it('flag on: two timed loops walking side by side, B down between meetings: A is sent `notice` s later', () => {
    flags.guardPairs = true;
    const gs = [guard(sideA()), guard(sideB())];
    const { em, priv } = manager(gs);
    place(em, gs, pairSlots());
    const [A, B] = gs as [FakeGuard, FakeGuard];
    // the meeting is at stop 1 (the longest stay at 1.2 m/s: 11.2 .. 18 s); at 27 s they walk from stop 2 to stop 3
    const take = 27;
    let takenAt = -1;
    let sentAt = -1;
    let gap = -1;
    let stateAtTake = '';
    sim(priv, gs, 35, (t) => {
      if (takenAt < 0 && t >= take) {
        // walking together, the meeting over and its window closed
        gap = hyp2(A.pos.x - B.pos.x, A.pos.z - B.pos.z);
        stateAtTake = em.pairs[0]!.pm.state;
        B.alive = false;
        B.ko = true;
        takenAt = t;
      }
      if (sentAt < 0 && A.pairSearch.mock.calls.length) sentAt = t;
    });
    expect(gap).toBeLessThan(PAIRS.togetherR);
    expect(stateAtTake).toBe('idle');
    expect(em.pairLines).toBe(2);
    expect(em.pairMisses).toBe(1);
    expect(A.pairSearch).toHaveBeenCalledTimes(1);
    expect(sentAt - takenAt).toBeGreaterThanOrEqual(PAIRS.notice - 0.05);
    expect(sentAt - takenAt).toBeLessThanOrEqual(PAIRS.notice + PAIRS.tick + 0.05);
    const [x, z, inc, lead] = A.pairSearch.mock.calls[0]!;
    // B's last route point: stop 3 (where he was heading)
    expect(x).toBeCloseTo(-29, 4);
    expect(z).toBeCloseTo(-62.8, 4);
    expect(lead).toBe(true);
    expect(em.board.kindOf(inc as number)).toBe('missing');
    expect(em.pairs[0]!.pm.state).toBe('missing');
  });
});
