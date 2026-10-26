import { describe, expect, it, vi } from 'vitest';
import { NavGrid, type NavBlocker, type P2 } from '../src/ai/navGrid';
import { PatrolWalker, PATROL } from '../src/ai/patrol';
import { AlertMachine } from '../src/ai/alertState';
import { POST, PostLure, LURE, type PostLureOut } from '../src/ai/posts';
import { Vector3, type Scene } from '../src/core/babylon';
import { hyp2 } from '../src/core/mathx';
import type { Enemy } from '../src/ai/enemy';
import type { AlarmPanel } from '../src/ai/alarm';
import type { World } from '../src/world/world';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import { DIFFICULTY } from '../src/ai/archetypes';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PACE } from '../src/ai/response';
import { runtimeNav } from './helpers/runtimeNav';

// (guard-ai play A, docs/guard-ai/PLAY-PASS.md P1-1, P2-1, P2-2) Guards get home. After a search the calm walk to his
// post / route point takes a partial path when the full one is past `goTo`'s A* budget (never straight into a wall), and
// gives the point up when he stops making progress; it keeps his spawn height (a gallery post is upstairs). An alarm
// runner with no way to the panel drops the run (and is not sent again this fight); a run, or a walk to a body to wake,
// or a walk to a body to wake, ends when he stops getting nearer (no path, or under `GIVE_UP.homeMove` m in
// `GIVE_UP.homeT` s: check A, not on time); the lure's walk back is capped.

type Goal = { point: P2 | null; speed: number; face: number | null };
/** The private parts the tests drive. */
type Priv = {
  calmDecide(dt: number): Goal;
  alarmStep(dt: number): Goal | null;
  move(dt: number, goal: P2 | null, speed: number, face: number | null): void;
  runLink(dt: number): void;
  link: unknown;
  walker: PatrolWalker;
  pos: Vector3;
  alarm: AlarmPanel | null;
  aware: AlertMachine;
  reviving: unknown;
  reviveQuit: unknown;
  alarmBarred: boolean;
  runAlarm(p: AlarmPanel): void;
};

/** The manager's movement context (`doorStep`) on `nav`, as tests/guardDoors.test.ts builds it (no doors here). */
async function managerCtx(nav: NavGrid) {
  const { EnemyManager } = await import('../src/ai/enemyManager');
  const world = { level: { lights: { lights: [] }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  return (em as unknown as { ctx: { doorStep(e: Enemy, x0: number, z0: number, x1: number, z1: number, y: number): boolean } }).ctx;
}

/**
 * A calm guard (Enemy's prototype, no rig) at `at` on `nav`, whose post (or route) is `post` at height `homeY`
 * (his spawn height).
 */
async function calmGuard(nav: NavGrid, at: [number, number, number], post: [number, number], homeY: number, route: P2[] | null = null, ctxO: Record<string, unknown> = {}) {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const { MotionDriver, emptyMotionInput } = await import('../src/anim/motion');
  const mctx = await managerCtx(nav);
  const list: unknown[] = [];
  const ctx = { nav, enemies: () => list, players: () => [], doorStep: mctx.doorStep, ...ctxO };
  const aware = new AlertMachine();
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    health: { alive: true },
    taken: false,
    aware,
    pos: new Vector3(at[0], at[2], at[1]),
    vel: new Vector3(),
    desired: new Vector3(),
    tmp: new Vector3(),
    sepOut: { x: 0, z: 0 },
    motion: new MotionDriver(0),
    motionIn: emptyMotionInput(),
    navCell: -1,
    yaw: 0,
    target: null,
    def: ENEMIES.officer,
    ctx,
    // the calm branch
    lure: { active: false },
    brkGroup: -1,
    turnT: 0,
    hasStimulus: false,
    dog: null,
    pairFace: Number.NaN,
    caution: 0,
    spotArrived: false,
    walker: new PatrolWalker(route ? { points: route as [number, number][], wait: 1 } : null, post[0], post[1], 0, 1),
    // goTo
    meP: [0, 0],
    routePath: [],
    routeGoal: [NaN, NaN],
    routeT: 0,
    routeVer: -1,
    routeMiss: false,
    routeNear: false,
    homeY,
    homeG: null,
    homeX: 0,
    homeZ: 0,
    homeT: 0,
    homeLong: false,
    homeSlicing: false,
    // links (ladders, stairs drops)
    link: null,
    linkS: 0,
    climbT: 0,
    climbing: false,
    linksTaken: 0,
    path: [],
    // the alarm run
    alarm: null,
    alarmT: 0,
    alarmQuit: false,
    walkX: 0,
    walkZ: 0,
    walkT: 0,
    // the search (the walk to a body to wake)
    reviving: null,
    reviveQuit: null,
    spot: [0, 0],
    spotSet: true,
    spotLookT: 0,
    lookBase: 0,
    entry: null,
    crew: null,
    hold: null,
    searchRoom: null,
    postDef: null,
    rush: false,
    planPoint: false,
    heardSpot: false,
    lkpLate: false,
    searchK: 1,
    searchKind: 0,
    wantCrouch: false,
    combatSearch: false,
    alarmPt: [0, 0],
    bark() {},
  });
  Object.defineProperty(e, 'aimedMotion', { value: false });
  list.push(e);
  return e as unknown as Priv;
}

/** Step the calm guard `sec` s at 30 Hz (the decide and the move `Enemy.update` runs); the first time `done` holds. */
function runCalm(e: Priv, sec: number, done: () => boolean): number {
  const dt = 1 / 30;
  for (let t = 0; t < sec; t += dt) {
    if (done()) return t;
    if (e.link) e.runLink(dt);
    else {
      const g = e.calmDecide(dt);
      e.move(dt, g.point, g.speed, g.face);
    }
  }
  return done() ? sec : Number.POSITIVE_INFINITY;
}

describe('PatrolWalker.giveUp and the storey check (pure)', () => {
  it('a route walker moves on to his next point; a post guard stands where he is until the next rejoin', () => {
    const r = new PatrolWalker({ points: [[0, 0], [10, 0], [10, 10]] }, 0, 0, 0);
    expect(r.step(0.1, 5, 5)).toEqual([0, 0]);
    r.giveUp(5, 5);
    expect(r.step(0.1, 5, 5)).toEqual([10, 0]);
    const p = new PatrolWalker(null, 0, 0, 0);
    expect(p.step(0.1, 5, 5)).toEqual([0, 0]);
    p.giveUp(5, 5);
    expect(p.step(0.1, 5, 5)).toBeNull();
    p.rejoin(5, 5);
    expect(p.step(0.1, 5, 5)).toEqual([0, 0]);
  });

  it('a post guard straight under his post on another storey is not on it (`away`)', () => {
    const p = new PatrolWalker(null, 0, 0, 0);
    expect(p.step(0.1, 0.1, 0)).toBeNull();
    expect(p.step(0.1, 0.1, 0, true)).toEqual([0, 0]);
  });
});

describe('the lure walk back is capped (posts.ts)', () => {
  it(`a blocked walk back faces his post after POST.lureWalkMax (${POST.lureWalkMax}) s`, () => {
    const l = new PostLure();
    const o: PostLureOut = { phase: LURE.idle, x: 0, z: 0, yaw: 0, moving: false };
    l.start(10, 0, 0, 0, 0, 3);
    l.step(0.1, false, o);
    l.step(0.1, true, o);
    for (let t = 0; t < POST.lureLook + 0.2; t += 0.1) l.step(0.1, false, o);
    expect(l.phase).toBe(LURE.back);
    let t = 0;
    while (l.phase === LURE.back && t < 60) {
      l.step(0.1, false, o);
      t += 0.1;
    }
    expect(l.phase).toBe(LURE.face);
    expect(t).toBeLessThan(POST.lureWalkMax + 0.5);
  });
});

describe('Saltmarsh Park S1 (campusV2): guards get back to their posts after a search (P1-1)', () => {
  // Each start: no clear line home and no path within goTo's A* budget (3000 expansions), a path with a large one.
  // Before the fix: the 34-38 m gate starts already got home (the straight fallback slid round); the two "stuck" starts
  // pressed a wall for good (the gate officer at (16.6, -33.5), the badge-door officer at (10.5, -29.5)).
  const cases: { guard: number; role: string; at: readonly [number, number]; within: number; note: string }[] = [
    { guard: 0, role: 'gate', at: [50, -76], within: 60, note: 'beyond the gatehouse, east' },
    { guard: 0, role: 'gate', at: [-18, -60], within: 60, note: 'beyond the gatehouse, west' },
    { guard: 0, role: 'gate', at: [20, -32], within: 90, note: 'north of the fence (was stuck)' },
    { guard: 4, role: 'posted', at: [12, -19], within: 120, note: 'east of C1 (was stuck)' },
  ];

  it('the gate officer ~35 m out beyond the gatehouse within 60 s; the stuck starts get home too', async () => {
    vi.resetModules();
    const { flags } = await import('../src/core/flags');
    (flags as { campusV2: readonly number[] }).campusV2 = [1];
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { campusOps } = await import('../src/world/maps/campusOps');
    const b = new LevelBuilder();
    const lay = campusOps.build(b, 0);
    const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, campusOps.navLayers ?? 3, lay.navSeeds ?? []);
    for (const c of cases) {
      const g = campusOps.sectors![0]!.guards[c.guard]!;
      expect(g.role).toBe(c.role);
      const post: [number, number] = [g.x, g.z];
      const homeY = nav.heightAt(g.x, g.z, 0);
      const at = c.at;
      const d = hyp2(at[0] - post[0], at[1] - post[1]);
      expect(d).toBeGreaterThan(30);
      expect(nav.lineClear([at[0], at[1]], post)).toBe(false);
      expect(nav.findPath([at[0], at[1]], post, 3000)).toBeNull();
      expect(nav.findPath([at[0], at[1]], post, 60000)).not.toBeNull();
      // (train 132 fix) S1 v2-c rebuilt the gatehouse round the gate post: from the east the only way in is round the
      // site (~250 m). The limit is `within` or the walk of the shortest path at his calm pace with a 1.5 margin,
      // whichever is longer: the case proves he never presses a wall, not that the map is compact
      const way = nav.findPath([at[0], at[1]], post, 200000)!;
      let len = 0;
      let px = at[0];
      let pz = at[1];
      for (const w of way) {
        len += hyp2(w[0] - px, w[1] - pz);
        px = w[0];
        pz = w[1];
      }
      const lim = Math.max(c.within, (1.5 * len) / (ENEMIES.officer.walkSpeed * PACE.patrol));
      const e = await calmGuard(nav, [at[0], at[1], nav.heightAt(at[0], at[1], 0)], post, homeY);
      const t = runCalm(e, lim, () => hyp2(e.pos.x - post[0], e.pos.z - post[1]) < PATROL.arrive * 1.5);
      console.info(`guard ${c.guard} from (${at[0]}, ${at[1]}) ${d.toFixed(1)} m out (path ${len.toFixed(0)} m), ${c.note}: home in ${t.toFixed(1)} s (limit ${lim.toFixed(0)} s)`);
      expect(t).toBeLessThan(lim);
    }
  });
});

describe("Marlow Yard A8: the gallery officer (y 4.4) walks home upstairs, not under his post (P2-2)", () => {
  it('calm on the ground floor west of the gallery: back on his gallery post within 60 s', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { buildCtcourse, ctcourse } = await import('../src/world/maps/ctcourse');
    const b = new LevelBuilder();
    const lay = buildCtcourse(b, { replan: true }).layout;
    const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, ctcourse.navLayers ?? 3, lay.navSeeds ?? []);
    const s = lay.course!.squads['a8-officer']!;
    expect(s.y).toBeCloseTo(4.4);
    const post: [number, number] = [s.x, s.z];
    const homeY = nav.heightAt(s.x, s.z, s.y!);
    expect(homeY).toBeGreaterThan(4);
    // the nearest ground-floor cell to a spot 4 m west and 4 m south of the post (the gallery's foot)
    const c = nav.nearestWalkable(s.x - 6, s.z - 4, 12, 0);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(nav.height[c]!).toBeLessThan(2);
    const [sx, sz] = nav.center(c);
    const e = await calmGuard(nav, [sx, sz, nav.height[c]!], post, homeY);
    const t = runCalm(e, 60, () => hyp2(e.pos.x - post[0], e.pos.z - post[1]) < PATROL.arrive * 1.5 && Math.abs(e.pos.y - homeY) < 1.2);
    console.info(`A8 officer from the ground (${sx}, ${sz}): home in ${t.toFixed(1)} s, at (${e.pos.x.toFixed(1)}, ${e.pos.y.toFixed(1)}, ${e.pos.z.toFixed(1)})`);
    expect(t).toBeLessThan(60);
  });
});

/** A ground floor (0..12 x 0..10) with a gallery at 3 m over x >= 8, reached by a ramp along z 0..1.5 from x 2 to 8. */
function gallery(): NavGrid {
  return new NavGrid({
    minX: 0, maxX: 12, minZ: 0, maxZ: 10, cell: 0.25,
    sample: () => ({ h: 0, ok: true }),
    sampleLayers: (x, z) => {
      if (z < 1.5 && x >= 2 && x < 8) return [{ h: (x - 2) * 0.5, ok: true }];
      return x >= 8 ? [{ h: 0, ok: true }, { h: 3, ok: true }] : [{ h: 0, ok: true }];
    },
    layers: 2,
    blockers: [],
    agentRadius: 0.3, stepHeight: 0.4, seed: [1, 5],
  });
}

describe('a gallery post on a ramped test floor: calm straight under his post, he goes up (P2-2)', () => {
  it('the ground under the post is not the post: he walks the ramp up and stands on the gallery', async () => {
    const nav = gallery();
    expect(nav.heightAt(10, 5, 3)).toBeCloseTo(3);
    expect(nav.heightAt(10, 5.3, 0)).toBeCloseTo(0);
    expect(nav.findPath([10, 5.3], [10, 5], 6000, 0, 3)).not.toBeNull();
    const e = await calmGuard(nav, [10, 5.3, 0], [10, 5], 3);
    const t = runCalm(e, 60, () => hyp2(e.pos.x - 10, e.pos.z - 5) < PATROL.arrive * 1.5 && Math.abs(e.pos.y - 3) < 0.3);
    expect(t).toBeLessThan(60);
  });
});

/** A 12 x 20 m floor cut by a solid wall along x = 0 (no doorway, no gap). */
function cut(): NavGrid {
  const wall: NavBlocker = { cx: 0, cz: 0, hx: 0.1, hz: 10, yaw: 0, bottom: 0, top: 3 };
  return new NavGrid({
    minX: -6, maxX: 6, minZ: -10, maxZ: 10, cell: 0.25,
    sample: () => ({ h: 0, ok: true }),
    blockers: [wall],
    agentRadius: 0.32, stepHeight: 0.45, seed: [-5, -5], extraSeeds: [[5, 0, 5]],
  });
}

describe('stuck: the calm walk home gives the point up after GIVE_UP.homeT s without progress (P1-1)', () => {
  it('a post guard across a solid wall from his post stands where he is; a route walker moves on to his next point', async () => {
    const { GIVE_UP } = await import('../src/ai/enemy');
    const nav = cut();
    const post = await calmGuard(nav, [-3, 2, 0], [3, 2], 0);
    // he never walks into the wall, and after the give-up stands (no goal) on his side
    for (let t = 0; t < GIVE_UP.homeT + 1; t += 1 / 30) {
      const g = post.calmDecide(1 / 30);
      post.move(1 / 30, g.point, g.speed, g.face);
    }
    expect(post.pos.x).toBeLessThan(-0.3);
    expect(post.calmDecide(1 / 30).point).toBeNull();
    // the route walker: [3, 2] across the wall, then [-3, -6] on his side
    const r = await calmGuard(nav, [-3, 2, 0], [-3, 2], 0, [[3, 2], [-3, -6]]);
    const t = runCalm(r, 30, () => hyp2(r.pos.x + 3, r.pos.z + 6) < PATROL.arrive);
    // to the wall (~3 m), stuck GIVE_UP.homeT s, then ~8.5 m on to his next point
    expect(t).toBeLessThan(GIVE_UP.homeT + 20);
  });
});

describe('one long plan per frame across the guards (check B: AiContext.longPlan)', () => {
  it('two guards calming in the same frame run one long plan between them; the other runs his the next frame', async () => {
    const { GIVE_UP } = await import('../src/ai/enemy');
    const { EnemyManager } = await import('../src/ai/enemyManager');
    // a wall along x = 0 with a gap at its north end (z 6..10): no clear line home, a path round
    const wall: NavBlocker = { cx: 0, cz: -2, hx: 0.1, hz: 8, yaw: 0, bottom: 0, top: 3 };
    const nav = new NavGrid({
      minX: -6, maxX: 6, minZ: -10, maxZ: 10, cell: 0.25,
      sample: () => ({ h: 0, ok: true }),
      blockers: [wall],
      agentRadius: 0.32, stepHeight: 0.45, seed: [-5, -5],
    });
    // goTo's 3000 plan is made partial (as past its budget on a large map); the long plans' slices are counted (train
    // 132 fix: the long plan is a sliced A*, `GIVE_UP.homeExpand` per slice; on this small map one slice ends it)
    const find = nav.findPath.bind(nav);
    vi.spyOn(nav, 'findPath').mockImplementation((a, b, _budget, ya, yb) => find(a, b, 3, ya, yb, true));
    const step = nav.sliceStep.bind(nav);
    let longs = 0;
    vi.spyOn(nav, 'sliceStep').mockImplementation((o, budget, cap) => {
      expect(budget).toBe(GIVE_UP.homeExpand);
      longs++;
      return step(o, budget, cap);
    });
    const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] }, addShadowCaster: vi.fn() };
    const em = new EnemyManager({} as Scene, world as unknown as World, nav, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
    const longPlan = (em as unknown as { ctx: { longPlan(): boolean } }).ctx.longPlan;
    const a = await calmGuard(nav, [-3, 2, 0], [3, 2], 0, null, { longPlan });
    const b = await calmGuard(nav, [-3, -2, 0], [3, -2], 0, null, { longPlan });
    const dt = 1 / 30;
    em.update(dt);
    a.calmDecide(dt);
    b.calmDecide(dt);
    expect(longs).toBe(1);
    // the same frame again (a second think): still taken
    b.calmDecide(dt);
    expect(longs).toBe(1);
    em.update(dt);
    a.calmDecide(dt);
    b.calmDecide(dt);
    expect(longs).toBe(2);
    // both have theirs: no more
    em.update(dt);
    a.calmDecide(dt);
    b.calmDecide(dt);
    expect(longs).toBe(2);
  });
});

/** A 12 x 20 m floor cut by a wall along x = 0 with a gap at its north end (z 6..10): a way round. */
function walled(): NavGrid {
  const wall: NavBlocker = { cx: 0, cz: -2, hx: 0.1, hz: 8, yaw: 0, bottom: 0, top: 3 };
  return new NavGrid({
    minX: -6, maxX: 6, minZ: -10, maxZ: 10, cell: 0.25,
    sample: () => ({ h: 0, ok: true }),
    blockers: [wall],
    agentRadius: 0.32, stepHeight: 0.45, seed: [-5, -5],
  });
}

describe('the walk to a body to wake gives up only when he cannot get there (check A, P3-5)', () => {
  /** A searching guard at `at` sent to wake a body at `b`; stepped until he wakes it or gives it up. */
  async function wake(nav: NavGrid, at: [number, number], b: [number, number]) {
    const revive = vi.fn();
    const e = await calmGuard(nav, [at[0], at[1], 0], at, 0, null, { revive });
    e.aware.set('searching');
    const body = { present: true, pos: new Vector3(b[0], 0, b[1]), reviveT: 0 };
    e.reviving = body;
    const dt = 1 / 30;
    let t = 0;
    while (e.reviving && t < 90) {
      if (e.link) e.runLink(dt);
      else {
        const g = e.calmDecide(dt);
        e.move(dt, g.point, g.speed, g.face);
      }
      t += dt;
    }
    return { e, body, revive, t };
  }

  it('a reachable body with a path over 16 m (the old 15 s cap gave it up) is woken', async () => {
    const nav = walled();
    const full = nav.findPath([-3, -6], [3, -6], 60000)!;
    let len = 0;
    let px = -3;
    let pz = -6;
    for (const w of full) {
      len += hyp2(w[0] - px, w[1] - pz);
      px = w[0];
      pz = w[1];
    }
    expect(len).toBeGreaterThan(16);
    const r = await wake(nav, [-3, -6], [3, -6]);
    console.info(`wake round the wall (${len.toFixed(1)} m path): woken after ${r.t.toFixed(1)} s`);
    expect(r.revive).toHaveBeenCalledTimes(1);
    expect(r.e.reviveQuit).toBeNull();
    expect(r.t).toBeGreaterThan(15);
  });

  it('a body across a solid wall (no path) is given up, and not his again', async () => {
    const { GIVE_UP } = await import('../src/ai/enemy');
    const r = await wake(cut(), [-3, 2], [3, 2]);
    expect(r.revive).not.toHaveBeenCalled();
    expect(r.e.reviveQuit).toBe(r.body);
    expect(r.t).toBeLessThan(GIVE_UP.homeT + 5);
    expect(r.e.pos.x).toBeLessThan(-0.3);
  });
});

describe('the alarm runner with no way to the panel drops the run (P2-1)', () => {
  const panel = (x: number, z: number): AlarmPanel => ({ id: 'p1', x, y: 0, z, yaw: 0, disabled: false });

  it('no path: he drops it at once, and is barred from the next pick this fight', async () => {
    const { GIVE_UP } = await import('../src/ai/enemy');
    const e = await calmGuard(cut(), [-3, 2, 0], [-3, 2], 0, null, { alarmOpen: () => true, diff: DIFFICULTY.normal, raiseAlarm: vi.fn() });
    e.runAlarm(panel(3, 2));
    expect(e.alarm).not.toBeNull();
    let t = 0;
    const dt = 1 / 30;
    while (e.alarm && t < 30) {
      const g = e.alarmStep(dt);
      if (g) e.move(dt, g.point, g.speed, g.face);
      t += dt;
    }
    expect(e.alarm).toBeNull();
    expect(t).toBeLessThan(GIVE_UP.homeT);
    expect(e.alarmBarred).toBe(true);
  });

  it(`a path he makes no progress on: he drops it after GIVE_UP.homeT s`, async () => {
    const { GIVE_UP } = await import('../src/ai/enemy');
    const e = await calmGuard(cut(), [-3, 2, 0], [-3, 2], 0, null, { alarmOpen: () => true, diff: DIFFICULTY.normal, raiseAlarm: vi.fn() });
    e.runAlarm(panel(-3, -8));
    let t = 0;
    const dt = 1 / 30;
    // held where he is (not moved): the run times out
    let goals = 0;
    while (e.alarm && t < 30) {
      if (e.alarmStep(dt)) goals++;
      t += dt;
    }
    // running each step but the last (the give-up)
    expect(goals).toBe(Math.round(t / dt) - 1);
    expect(t).toBeGreaterThan(GIVE_UP.homeT - 0.1);
    expect(t).toBeLessThan(GIVE_UP.homeT + 0.1);
  });

  it('the manager does not send a guard who gave a run up (assignAlarm)', async () => {
    const { EnemyManager } = await import('../src/ai/enemyManager');
    const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] }, addShadowCaster: vi.fn() };
    const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
    const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn(() => true) } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
    em.stealth = true;
    em.alarms.push(panel(4, 0));
    const g = { alive: true, alerted: true, def: ENEMIES.grunt, pos: new Vector3(0, 0, 0), roleFlags: 0, inLeash: () => true, runningAlarm: false, alarmBarred: true, runAlarm: vi.fn() };
    em.enemies.push(g as unknown as Enemy);
    const assign = (): void => (em as unknown as { assignAlarm(): void }).assignAlarm();
    assign();
    expect(g.runAlarm).not.toHaveBeenCalled();
    g.alarmBarred = false;
    assign();
    expect(g.runAlarm).toHaveBeenCalledTimes(1);
  });
});
