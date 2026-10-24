import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnemyManager, POLISH_B, TACTICS } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { BREAKER_WALK, type BreakerHost } from '../src/ai/breaker';
import { CONSOLE_GROUP } from '../src/ai/consoleFault';
import { CoverGrid, coverSetFrom, type CoverPointLike } from '../src/ai/coverGrid';
import { SEARCH_AREA, SearchPlan } from '../src/ai/searchArea';
import { assignRoles, R_FLANK, R_NONE, R_OVERWATCH, R_POINT, RoleInput, RoleOutput, ROLES, ROLES_SHARE_TAKEN, rolesCommit, rolesTickStart } from '../src/ai/squadRoles';
import { Vector3, type Scene } from '../src/core/babylon';
import { LightRegistry } from '../src/world/lights';
import { Enemy, type AiContext, type PlayerRef } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai polish batch, group B) The manager's polish fixes on a real EnemyManager with stand-in guards: B1 a cut
// circuit nobody fixed is relit (A168), B2 the one-mover rule counts only a trip to the role cover, B4 the search plan
// remembers its searched points (pure part; the wiring is in searchAreaWiring), B5 two groups of one roles tick never
// share a free cover, B7 no `tell(alarmHunt)` after an alerted spawn (A182), B8 a busy console costs no ray. B3 and B6
// are in combatHearing.

type Mut<T> = { -readonly [K in keyof T]: T[K] extends boolean ? boolean : T[K] extends number ? number : T[K] };
const walk = BREAKER_WALK as Mut<typeof BREAKER_WALK>;
const polish = POLISH_B as Mut<typeof POLISH_B>;
afterEach(() => {
  walk.retry = 20;
  polish.roleTrip = true;
  polish.alarmTell = true;
});

function bareManager(reg = new LightRegistry(), clear: (a: Vector3, b: Vector3) => boolean = () => true) {
  const world = { level: { lights: reg, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const ray = vi.fn(clear);
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: ray } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  return { em, ray };
}

// ----- B1 (A168): a cut nobody fixed comes back on late discovery's list -----

/** A calm stand-in: sent on the reset walk he is on it (`breakerGroup`) until `done`. */
function calm(num: number, x: number, z: number, yaw: number) {
  const g = {
    id: `b${num}`,
    num,
    alive: true,
    alerted: false,
    passive: false,
    taken: false,
    dog: false,
    secure: false,
    runningAlarm: false,
    level: 'unaware',
    incident: -1,
    breakerGroup: -1,
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    yaw,
    checkLight: vi.fn(),
    resetBreaker: vi.fn(),
    ack: vi.fn(),
    notice: vi.fn(),
    hear: vi.fn(),
    sendTo: vi.fn(),
  };
  g.resetBreaker.mockImplementation((_x: number, _z: number, _y: number, inc: number, group: number) => {
    g.incident = inc;
    g.breakerGroup = group;
  });
  g.checkLight.mockImplementation((_x: number, _z: number, inc: number) => {
    g.incident = inc;
    g.level = 'investigating';
  });
  return g;
}
type Calm = ReturnType<typeof calm>;
const done = (g: Calm): void => {
  g.incident = -1;
  g.breakerGroup = -1;
  g.level = 'unaware';
};

function breakerSetup() {
  // the circuit's lamp 3 m up over (0, 0); its switch on the wall at (0, 1.2, 4); both guards face the lamp
  const reg = new LightRegistry();
  reg.add({ x: 0, y: 3, z: 0, group: 4 });
  const off = new Set<number>();
  const h: BreakerHost = {
    switchOf: (g, _x, _z, out) => {
      if (g !== 4) return false;
      out[0] = 0;
      out[1] = 1.2;
      out[2] = 4;
      return true;
    },
    isOff: (g) => off.has(g),
    reset: (g) => {
      if (!off.delete(g)) return false;
      reg.setGroup(g, true);
      return true;
    },
  };
  const { em } = bareManager(reg);
  em.breakers = h;
  const a = calm(1, 0, -3, 0);
  const b = calm(2, 3, -3, -0.7);
  em.enemies.push(a as unknown as Enemy, b as unknown as Enemy);
  const cut = (): void => {
    off.add(4);
    reg.setGroup(4, false);
    em.lightsOut(0, 4, 3.7, -1, 4);
  };
  const late = (n = 2): void => {
    for (let i = 0; i < n; i++) (em as unknown as { lateStep(): void }).lateStep();
  };
  const walks = (): number => a.resetBreaker.mock.calls.length + b.resetBreaker.mock.calls.length;
  return { reg, h, em, a, b, cut, late, walks, isOff: () => off.has(4) };
}

describe('guard-ai polish B1 (A168): a cut circuit nobody fixed is relit', () => {
  it('two cuts inside repeatT: the tamper check, then (the check over, still off) after BREAKER_WALK.retry a walker relights it', () => {
    const { em, h, a, b, cut, late, walks, isOff } = breakerSetup();
    cut();
    expect(walks()).toBe(1);
    // he turned it back on; cut again 20 s later: tampering, the S2 check at the switch
    h.reset(4);
    done(a);
    em.board.now += 20;
    cut();
    expect(walks()).toBe(1);
    expect(a.checkLight.mock.calls.length + b.checkLight.mock.calls.length).toBeGreaterThanOrEqual(1);
    // while the check is open nothing more, however long
    em.board.now += BREAKER_WALK.retry + 5;
    late(4);
    expect(walks()).toBe(1);
    // the check is over, the circuit still off: held `retry` s, then noticed again: the same cut, the reset walk
    done(a);
    done(b);
    em.board.clear();
    late(2);
    em.board.now += BREAKER_WALK.retry - 0.5;
    late(4);
    expect(walks()).toBe(1);
    em.board.now += 0.5;
    late(2);
    expect(walks()).toBe(2);
    const g = a.resetBreaker.mock.calls.length === 2 ? a : b;
    const call = g.resetBreaker.mock.calls.at(-1)!;
    expect(call.slice(0, 2)).toEqual([0, 4]);
    expect(call[4]).toBe(4);
    expect(em.board.kindOf(call[3] as number)).toBe('breaker');
    expect(isOff()).toBe(true);
  });

  it('the walker knocked out mid-walk: another guard relights it after the hold (not while the walk or its incident lives)', () => {
    const { em, a, b, cut, late, walks } = breakerSetup();
    cut();
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    expect(a.breakerGroup).toBe(4);
    // on his way (30 s): nobody else is sent
    em.board.now += 30;
    late(4);
    expect(walks()).toBe(1);
    // knocked out; his incident gone
    a.alive = false;
    em.board.clear();
    late(2);
    em.board.now += BREAKER_WALK.retry;
    late(2);
    expect(b.resetBreaker).toHaveBeenCalledTimes(1);
    expect(b.resetBreaker.mock.calls[0]![4]).toBe(4);
    // once: b is on it now
    em.board.now += BREAKER_WALK.retry + 1;
    late(4);
    expect(walks()).toBe(2);
  });

  it('relit by other means in the hold: nothing; BREAKER_WALK.retry = Infinity (undo): dark for good', () => {
    const s = breakerSetup();
    s.cut();
    s.a.alive = false;
    s.em.board.clear();
    s.late(2);
    s.h.reset(4);
    s.em.board.now += BREAKER_WALK.retry + 1;
    s.late(4);
    expect(s.walks()).toBe(1);
    walk.retry = Infinity;
    const u = breakerSetup();
    u.cut();
    u.a.alive = false;
    u.em.board.clear();
    u.late(2);
    u.em.board.now += 1000;
    u.late(6);
    expect(u.walks()).toBe(1);
  });
});

// ----- B2: the one-mover rule counts a trip to the role cover only -----

interface Sq {
  id: string;
  num: number;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  runningAlarm: boolean;
  closing: boolean;
  dog: null;
  hold: null;
  level: string;
  incident: number;
  state: string;
  coverIdx: number;
  tacticsProfile: number;
  seesTarget: boolean;
  def: { melee: null; kind: string; scale: number; usesCover: boolean };
  pos: Vector3;
  role: number;
  cover: number;
  moving: boolean;
  mates: boolean;
  hunt: number;
  setRole: ReturnType<typeof vi.fn>;
  radio: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
}
let sqN = 0;
function sq(x: number, z: number): Sq {
  const num = 8600 + sqN++;
  const g: Sq = {
    id: `q${num}`,
    num,
    alive: true,
    alerted: true,
    passive: false,
    taken: false,
    runningAlarm: false,
    closing: false,
    dog: null,
    hold: null,
    level: 'alert',
    incident: -1,
    state: 'chase',
    coverIdx: -1,
    tacticsProfile: 0,
    seesTarget: false,
    def: { melee: null, kind: 'grunt', scale: 1, usesCover: true },
    pos: new Vector3(x, 0, z),
    role: R_NONE,
    cover: -1,
    moving: false,
    mates: false,
    hunt: 0,
    setRole: vi.fn(),
    radio: vi.fn(),
    bark: vi.fn(),
  };
  g.setRole = vi.fn((role: number, cover: number, moving: boolean, _run: boolean, mates: boolean) => {
    g.role = role;
    g.cover = cover;
    g.moving = moving;
    g.mates = mates;
  });
  return g;
}

/** A cover at (x, z) facing the LKP at the origin. */
function cp(x: number, z: number) {
  const l = Math.sqrt(x * x + z * z);
  return { pos: new Vector3(x, 0, z), normal: new Vector3(-x / l, 0, -z / l), low: false, seg: 0, s: 0 };
}
// squadWiring's layout: c0 point, c1 overwatch, c2 flank, c3 reporter, c4 a decoy near the point's bearing
const COVERS = [cp(0, -7), cp(1, -12), cp(12, -4), cp(1, -17.5), cp(3, -9)];

function squad(gs: Sq[]) {
  const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: COVERS, coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn(() => true) } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
  const priv = em as unknown as { ctx: AiContext; rolesStep(dt: number): void };
  expect(priv.ctx.reportSighting({ id: 'p1', feet: new Vector3(0, 0, 0) } as unknown as PlayerRef)).toBe(0);
  return () => priv.rolesStep(TACTICS.tick);
}

describe('guard-ai polish B2: the one-mover rule counts only a trip to the role cover', () => {
  function onTheirWay() {
    const gs = [sq(0, -16), sq(2, -17), sq(-2, -17)];
    const roles = squad(gs);
    gs[1]!.state = 'inCover';
    gs[1]!.coverIdx = 1;
    roles();
    expect(gs.map((g) => ROLES[g.role])).toEqual(['point', 'overwatch', 'flank']);
    // the flank on its way to its role cover; the point's open-wait pick: a trip to another cover (the decoy)
    gs[2]!.state = 'seekCover';
    gs[2]!.coverIdx = gs[2]!.cover;
    gs[0]!.state = 'seekCover';
    gs[0]!.coverIdx = 4;
    return { gs, roles };
  }

  it('the flank on its way, the point open-waits to a non-role cover: the point stays held (one mover); the overwatch still covers', () => {
    const { gs, roles } = onTheirWay();
    roles();
    expect(gs[0]!.role).toBe(R_POINT);
    expect(gs[2]!.role).toBe(R_FLANK);
    expect(gs[0]!.moving).toBe(false);
    expect(gs[1]!.role).toBe(R_OVERWATCH);
    expect(gs[1]!.mates).toBe(true);
    // his trip is to his role cover: he is the one on his way, as before
    gs[0]!.coverIdx = gs[0]!.cover;
    gs[2]!.state = 'chase';
    gs[2]!.coverIdx = -1;
    roles();
    expect(gs[2]!.moving).toBe(false);
  });

  it('POLISH_B.roleTrip false (undo): any trip counts, the hold is lifted (two movers)', () => {
    polish.roleTrip = false;
    const { gs, roles } = onTheirWay();
    roles();
    expect(gs[0]!.moving).toBe(true);
  });
});

// ----- B4 (pure part): the plan remembers what was searched -----

describe('guard-ai polish B4: SearchPlan keeps its searched points across a rebuild round the same position', () => {
  it('finish records a point once; covered: the centre and searched points within spacing; reset forgets unless kept', () => {
    const p = new SearchPlan();
    p.reset(0, 0, 0);
    p.offer(10, 0, 1);
    p.offer(0, 10, 0.5);
    p.finish(0);
    p.finish(0);
    expect(p.sn).toBe(1);
    expect([p.sx[0], p.sz[0]]).toEqual([10, 0]);
    const sp = SEARCH_AREA.spacing;
    expect(p.covered(0, sp - 0.1)).toBe(true);
    expect(p.covered(10 + sp - 0.1, 0)).toBe(true);
    expect(p.covered(0, 10)).toBe(false);
    p.reset(0, 0, 1, true);
    expect([p.n, p.sn]).toEqual([0, 1]);
    expect(p.covered(10, 1)).toBe(true);
    p.reset(0, 0, 2);
    expect(p.sn).toBe(0);
    expect(p.covered(10, 1)).toBe(false);
  });

  it('a ring of 4 x points: the oldest searched point is overwritten, never an overflow', () => {
    const p = new SearchPlan();
    const cap = SEARCH_AREA.points * 4;
    for (let k = 0; k < cap + 3; k++) {
      p.reset(0, 0, k, true);
      p.offer(100 + k * 10, 0, 1);
      p.finish(0);
    }
    expect(p.sn).toBe(cap);
    expect(p.covered(100, 0)).toBe(false);
    expect(p.covered(100 + (cap + 2) * 10, 0)).toBe(true);
  });

  it('remarkSearched (the PLAN_SKIP_SEARCHED false path): kept points near a searched one are done again', () => {
    const p = new SearchPlan();
    p.reset(0, 0, 0);
    p.offer(10, 0, 1);
    p.finish(0);
    p.reset(0, 0, 1, true);
    p.offer(10.5, 0, 1);
    p.offer(-10, 0, 0.5);
    p.remarkSearched();
    expect([p.done[0], p.done[1]]).toEqual([1, 0]);
  });
});

// ----- B5: two groups of one roles tick never share a free cover -----

function group(slots: number[], xs: [number, number][], covers: CoverPointLike[]) {
  const set = coverSetFrom(covers);
  const grid = CoverGrid.fromSet(set);
  const mk = (sl: number[], ps: [number, number][]): RoleInput => {
    const inp = new RoleInput();
    inp.cover = set;
    inp.grid = grid;
    inp.n = sl.length;
    for (let i = 0; i < sl.length; i++) {
      inp.slot[i] = sl[i]!;
      inp.x[i] = ps[i]![0];
      inp.y[i] = 0;
      inp.z[i] = ps[i]![1];
    }
    inp.lkpX = 0;
    inp.lkpY = 0;
    inp.lkpZ = 0;
    inp.callerSlot = -1;
    return inp;
  };
  return { a: mk(slots.slice(0, 2), xs.slice(0, 2)), b: mk(slots.slice(2), xs.slice(2)) };
}

describe('guard-ai polish B5: one roles tick, two intruder groups, one free cover', () => {
  const pc = (x: number, z: number): CoverPointLike => {
    const l = Math.sqrt(x * x + z * z);
    return { pos: { x, y: 0, z }, normal: { x: -x / l, z: -z / l }, low: false };
  };
  const covers = [pc(0, -7)];
  const pos: [number, number][] = [
    [0, -16],
    [2, -17],
    [-1, -16],
    [1, -17],
  ];

  it('only the first group gets it; a new tick starts with nothing taken', () => {
    const { a, b } = group([1, 2, 3, 4], pos, covers);
    const oa = new RoleOutput();
    const ob = new RoleOutput();
    rolesTickStart();
    assignRoles(a, oa);
    rolesCommit();
    assignRoles(b, ob);
    rolesCommit();
    expect(Array.from(oa.cover.slice(0, 2))).toContain(0);
    expect(Array.from(ob.cover.slice(0, 2))).not.toContain(0);
    // the next tick: the second group alone gets it
    rolesTickStart();
    assignRoles(b, ob);
    expect(Array.from(ob.cover.slice(0, 2))).toContain(0);
    rolesTickStart();
  });

  it('rolesTickStart clears the shared picks: the same group assigned again in a new tick gets the same covers', () => {
    expect(ROLES_SHARE_TAKEN).toBe(true);
    const { a } = group([1, 2, 3, 4], pos, covers);
    const oa = new RoleOutput();
    rolesTickStart();
    assignRoles(a, oa);
    rolesCommit();
    rolesTickStart();
    const o2 = new RoleOutput();
    assignRoles(a, o2);
    expect(Array.from(o2.cover.slice(0, 2))).toEqual(Array.from(oa.cover.slice(0, 2)));
  });
});

// ----- B7 (A182): no `tell(alarmHunt)` after an alerted spawn -----

describe('guard-ai polish B7 (A182): a parked reinforcement with no valid intruder binds nothing', () => {
  /** A stand-in on the real `Enemy.tell`; `alert()` as `onLevel('alert')` takes the told intruder. */
  function stand() {
    const proto = Enemy.prototype as unknown as Record<string, unknown>;
    const g: Record<string, unknown> & { hunt: number; pendingHunt: number; alerted: boolean } = {
      alive: true,
      alerted: false,
      hunt: -1,
      pendingHunt: -1,
      section: 0,
    };
    g.tell = proto.tell;
    g.alert = () => {
      g.alerted = true;
      if (g.pendingHunt >= 0) g.hunt = g.pendingHunt;
      g.pendingHunt = -1;
    };
    return g;
  }

  function parked() {
    const { em } = bareManager();
    em.coordinated = false;
    const pr = em as unknown as { alarmHunt: number; sendIn(e: unknown): void; spawn: unknown };
    // the alarm's intruder is forgotten (no position) and nobody else is known
    pr.alarmHunt = 1;
    em.intruders.valid[1] = 0;
    pr.spawn = (_k: unknown, _at: Vector3, alerted: boolean) => {
      const g = stand();
      if (alerted) pr.sendIn(g);
      return g;
    };
    return { em, pr };
  }

  it('reinforce: hunt -1 (not the positionless alarm slot); the next call binds him', () => {
    const { em } = parked();
    const [e] = em.reinforce('grunt', new Vector3(0, 0, 0), 1) as unknown as ReturnType<typeof stand>[];
    expect([e!.alerted, e!.hunt]).toEqual([true, -1]);
    (e!.tell as (s: number) => void).call(e, 2);
    expect(e!.hunt).toBe(2);
  });

  it('joinReinforcement (uncoordinated): the same; POLISH_B.alarmTell false (undo): the old bind', () => {
    const { em, pr } = parked();
    const g = stand();
    pr.sendIn(g);
    em.joinReinforcement(g as unknown as Enemy, 0, null);
    expect(g.hunt).toBe(-1);
    polish.alarmTell = false;
    const h = stand();
    pr.sendIn(h);
    em.joinReinforcement(h as unknown as Enemy, 0, null);
    expect(h.hunt).toBe(1);
  });
});

// ----- B8: a busy console costs no ray -----

describe('guard-ai polish B8: consoleStep checks busy before the sight ray', () => {
  it('a console off with a guard walking to it: the free guard facing it casts no ray, notices nothing; free again: one ray, noticed', () => {
    const { em, ray } = bareManager();
    const walker = calm(1, 20, 20, 0);
    walker.breakerGroup = CONSOLE_GROUP;
    const free = calm(2, 0, 0, 0);
    em.enemies.push(walker as unknown as Enemy, free as unknown as Enemy);
    em.consoleState('con', 0, 0, 4, true);
    em.consoleState('con', 0, 0, 4, false);
    const step = (n: number): void => {
      for (let i = 0; i < n; i++) (em as unknown as { consoleStep(): void }).consoleStep();
    };
    step(6);
    expect(ray).not.toHaveBeenCalled();
    expect(em.consoleFinds).toBe(0);
    walker.breakerGroup = -1;
    step(2);
    expect(ray).toHaveBeenCalled();
    expect(em.consoleFinds).toBe(1);
  });
});
