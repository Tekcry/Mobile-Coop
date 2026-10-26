import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error plain .mjs tool script without types
import { PageDriver, pageScript, pageOptions, runOne } from '../scripts/route-run/driver.mjs';
// @ts-expect-error plain .mjs tool script without types
import { PairDriver } from '../scripts/route-run/pair.mjs';
// @ts-expect-error plain .mjs tool script without types
import { checkSelftest, forgiveFor, parseArgs, readPoints, stepsContext } from '../scripts/route-run.mjs';
// @ts-expect-error plain .mjs tool script without types
import { paceFor } from '../scripts/route-run/progress.mjs';

// Route-runs seams (briefs/route-runs-seams.md): R4c's seam requests SR1-SR5 and R6's points loader in the CLI and the
// driver, against fake pages in a Node vm (as tests/routeRunPair.test.ts). course.mjs is replaced by recording hooks.

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const metrics = JSON.parse(readFileSync(new URL('../docs/design/metrics.json', import.meta.url), 'utf8'));
const pace = paceFor('sneak', metrics);

const hook = vi.hoisted(() => ({ onPoll: null as any, onRestart: null as any, onRunEnd: null as any, check: null as any })); // eslint-disable-line @typescript-eslint/no-explicit-any
vi.mock('../scripts/route-run/course.mjs', async (orig) => ({
  ...(await orig<Obj>()),
  onPoll: (...a: unknown[]) => hook.onPoll(...a),
  onRestart: (...a: unknown[]) => hook.onRestart(...a),
  onRunEnd: (...a: unknown[]) => hook.onRunEnd(...a),
  checkCourseExpect: (...a: unknown[]) => hook.check(...a),
}));
beforeEach(() => {
  hook.onPoll = vi.fn(async () => {});
  hook.onRestart = vi.fn(async () => null);
  hook.onRunEnd = vi.fn(async () => {});
  hook.check = vi.fn(() => []);
});

class V {
  constructor(public x: number, public y: number, public z: number) {}
}

/** A flat fake game with one far guard; each page call's name is recorded in `calls`. */
function fakeGame(x: number, z: number) {
  const axes = [0, 0, 0, 0];
  const buttons: number[] = Array(17).fill(0);
  const pos = new V(x, 0, z);
  const guard = { id: 'e1', def: { kind: 'rifle' }, job: 'gate', zone: 'yard', pos: new V(200, 0, 200), yaw: 0, alive: true, level: 'unaware', aware: { set(l: string) { guard.level = l; } } };
  const em = { enemies: [guard], resets: 0, hear() {}, resetAlarm() { em.resets++; } };
  const game: Obj = {
    time: 0,
    player: { position: pos, cam: { yaw: 0 }, controller: { crouched: false, crouchIntent: false, speed: 0, yaw: 0, teleport(v: V) { pos.x = v.x; pos.y = v.y; pos.z = v.z; } } },
    nav: { findPath: (_a: number[], b: number[]) => [[b[0], b[1]]], heightAt: () => NaN, cellOf: () => 1, isWalkable: () => true, nearestWalkable: () => -1, centerInto: (_k: number, o: number[]) => o, cellHeight: () => 0 },
    world: { doors: { nearest: () => null }, map: { sectors: [] } },
    enemyMgr: em,
    target: { damageMul: 1 },
    team: { end() {} },
    restartCheckpoint: () => { pos.x = x; pos.z = z; return true; },
  };
  const step = (dt: number) => {
    const c = game.player.controller;
    if (buttons[1]) { c.crouchIntent = !c.crouchIntent; c.crouched = c.crouchIntent; buttons[1] = 0; }
    const m = Math.hypot(axes[0]!, axes[1]!);
    if (m > 0.1) {
      pos.x += (axes[0]! / m) * pace.speed * dt;
      pos.z += (-axes[1]! / m) * pace.speed * dt;
    }
    game.time += dt;
  };
  const window: Obj = { __app: { current: game, loop: { manual: false, stepHeadless: step } }, __pad: { connect() {}, set(i: number, v: number) { buttons[i] = v; }, axis(i: number, v: number) { axes[i] = v; } } };
  const calls: string[] = [];
  const vctx = vm.createContext({ window, Math, Float64Array, Array, Map });
  const page = {
    async evaluate(fn: unknown, arg?: unknown) {
      if (Array.isArray(arg) && typeof arg[0] === 'string') calls.push(arg[0]);
      const r = typeof fn === 'string' ? vm.runInContext(fn, vctx) : vm.runInContext(`(${String(fn)})(${JSON.stringify(arg)})`, vctx);
      return r === undefined ? undefined : JSON.parse(JSON.stringify(r));
    },
    async screenshot() {},
  };
  return { game, guard, em, pos, page, calls };
}

async function oneCtx(forgive = true) {
  const A = fakeGame(0, 0);
  const driver = new PageDriver(A.page, { pace, forgive, points: null });
  await driver.install();
  return { A, ctx: { host: A.page, client: null, driver, shots: null, players: 1, notes: [] as string[] } as Obj };
}

async function pairCtx() {
  const A = fakeGame(0, 0);
  const B = fakeGame(0, -2);
  A.game.net = { remotes: new Map([['c', { feet: B.pos, ref: { crouched: false, speed: 0 }, state: {}, damageMul: 1, allowTeleport() {} }]]) };
  B.game.net = { avatars: new Map([['h', { pos: A.pos }]]) };
  A.game.restartCheckpoint = () => { A.pos.x = 0; A.pos.z = 0; B.pos.x = 0; B.pos.z = -2; return true; };
  const host = new PageDriver(A.page, { pace, forgive: true, points: null, role: 'leader' });
  const client = new PageDriver(B.page, { pace, forgive: true, points: null, role: 'follower' });
  await host.install();
  await client.install();
  const notes: string[] = [];
  const pair = new PairDriver(host, client, { points: null, notes });
  const ctx: Obj = { host: A.page, client: B.page, driver: pair, pair, shots: null, players: 2, notes };
  Object.assign(ctx, { advance: (s: number) => pair.advance(s), stick: pace.stick });
  return { A, B, pair, ctx };
}

/** The course hook interrupts once, at the first poll past `t` game s (from `onPoll`, inside the pair's tick lock). */
function interruptAfter(t: number) {
  let fired = false;
  hook.onPoll = vi.fn(async (ctx: Obj) => {
    if (!fired && (await ctx.driver.call('time')) > t) {
      fired = true;
      await ctx.driver.call('interrupt');
    }
  });
}

/** The guard rises to alert once, after the first chunk of the run. */
function raiseOnce(guard: Obj) {
  let done = false;
  hook.onPoll = vi.fn(async () => {
    if (!done) guard.level = 'alert';
    done = true;
  });
}

const walk = (to: number[]) => ({ type: 'walk', to, space: null, link: null });

describe('SR1: no in-page forgive in course mode (BRIEF A2)', () => {
  it('forgive only outside the course', () => {
    expect([forgiveFor('forgive', 'course'), forgiveFor('forgive', 'sector'), forgiveFor('keep', 'sector')]).toEqual([false, true, false]);
  });

  it('course mode: the rise is logged and the guard stays alert (no calm, no alarm reset); elsewhere he is calmed', async () => {
    for (const mode of ['course', 'sector']) {
      const { A, ctx } = await oneCtx(forgiveFor('forgive', mode));
      raiseOnce(A.guard);
      const log = await runOne(ctx, { id: 'r', section: null, steps: [walk([0, 0, 12])] });
      expect(log.detections).toHaveLength(1);
      expect([A.guard.level, A.em.resets]).toEqual(mode === 'course' ? ['alert', 0] : ['unaware', 1]);
    }
  });
});

describe('SR2: the graphs and the selftest on the steps context', () => {
  it('ctx.graphs and ctx.selftest (null outside a selftest); the clock and the advance go through the driver', async () => {
    const seen: string[] = [];
    const driver = { call: async (n: string) => (seen.push(n), 7), advance: async (s: number) => seen.push(`advance ${s}`) };
    const graphs = [{ meta: { map: 'ctcourse' } }];
    const fixture = { expect: { players: 2, runs: [{ id: 'a2-seen-once', course: { raise: [] } }] } };
    const ctx = stepsContext({ driver }, { shots: 'out/shots', notes: [], stick: 0.4, graphs, fixture });
    expect([ctx.graphs, ctx.selftest, ctx.shots, ctx.stick]).toEqual([graphs, fixture.expect, 'out/shots', 0.4]);
    expect(await ctx.clock()).toBe(7);
    await ctx.advance(0.2);
    expect(seen).toEqual(['time', 'advance 0.2']);
    expect(stepsContext({ driver }, { shots: null, notes: [], stick: 0.4, graphs }).selftest).toBe(null);
  });
});

describe('SR3: the course interrupt', () => {
  it("latches 'course' for the leader's next tick (it ends at once, the robot stopped); the follower latches it as its other events", async () => {
    const { A, ctx } = await oneCtx();
    const d = ctx.driver;
    await d.call('begin');
    await d.call('walkStart', 0, 0, 30);
    await d.call('tick', 1);
    const z = A.pos.z;
    expect(await d.call('interrupt')).toBe(true);
    expect(await d.call('tick', 1)).toMatchObject({ ev: 'course', dt: 0, walking: false });
    const r = await d.call('tick', 1);
    expect([r.ev, r.dt]).toEqual(['', expect.closeTo(1, 6)]);
    expect(A.pos.z).toBeCloseTo(z, 6);
    // posN: the feet and the placements made
    await d.call('place', 3, 0, 4, null);
    expect(await d.call('posN')).toEqual([3, 0, 4, 1]);
    const B = fakeGame(0, 0);
    const f = new PageDriver(B.page, { pace, forgive: true, points: null, role: 'follower' });
    await f.install();
    await f.call('begin');
    await f.call('interrupt');
    expect(await f.call('tick', 0.2, true)).toMatchObject({ ev: 'course', dt: expect.closeTo(0.2, 6) });
    expect((await f.call('tick', 0.2, true)).ev).toBe('');
  });

  it('one page: a walk ended by the interrupt goes to course.onRestart once; its placement and resume are taken', async () => {
    const { A, ctx } = await oneCtx();
    interruptAfter(1);
    hook.onRestart = vi.fn(async () => ({ resume: 1, place: { leader: [5, 0, 5], follower: null } }));
    const steps = [walk([0, 0, 30]), walk([6, 0, 5])];
    const log = await runOne(ctx, { id: 'r', section: null, steps });
    expect(hook.onRestart).toHaveBeenCalledTimes(1);
    const [c, run, st, i] = hook.onRestart.mock.calls[0];
    expect([c, run, st, i]).toEqual([ctx, log, steps, 0]);
    expect(log.deadStops).toEqual([]);
    expect([A.pos.x, A.pos.z]).toEqual([expect.closeTo(6, 0), expect.closeTo(5, 0)]);
    expect((await ctx.driver.call('posN'))[3]).toBe(1);
  });

  it('the pair: the leader is interrupted, onRestart once, both placed; the follower is never interrupted', async () => {
    const { A, B, ctx } = await pairCtx();
    interruptAfter(1);
    hook.onRestart = vi.fn(async () => ({ resume: 1, place: { leader: [5, 0, 5], follower: null } }));
    const steps = [walk([0, 0, 30]), walk([6, 0, 5])];
    const log = await runOne(ctx, { id: 'r', section: null, steps });
    expect(hook.onRestart).toHaveBeenCalledTimes(1);
    expect(hook.onRestart.mock.calls[0][3]).toBe(0);
    expect(log.deadStops).toEqual([]);
    expect(A.calls.filter((n) => n === 'interrupt')).toHaveLength(1);
    expect(B.calls).not.toContain('interrupt');
    expect(Math.hypot(A.pos.x - 6, A.pos.z - 5)).toBeLessThan(0.5);
    expect(Math.hypot(B.pos.x - A.pos.x, B.pos.z - A.pos.z)).toBeLessThan(3.5);
  });

  it('inside a split: both legs end, onRestart once at the split step, the run goes on at its resume', async () => {
    const { A, B, ctx } = await pairCtx();
    interruptAfter(1);
    hook.onRestart = vi.fn(async () => ({ resume: 1, place: null }));
    const steps = [{ type: 'split', id: 'sp', fork: null, a: [walk([-3, 0, 30])], b: [walk([3, 0, 30])], rejoin: null }, walk([0, 0, 4])];
    const log = await runOne(ctx, { id: 'r', section: null, steps });
    expect(hook.onRestart).toHaveBeenCalledTimes(1);
    expect(hook.onRestart.mock.calls[0][3]).toBe(0);
    expect(B.calls.filter((n) => n === 'interrupt')).toHaveLength(1);
    expect(log.splits[0].legs.map((l: Obj) => [l.robot, l.reached])).toEqual([['leader', false], ['follower', false]]);
    expect(log.deadStops).toEqual([]);
    expect(Math.hypot(A.pos.x, A.pos.z - 4)).toBeLessThan(0.5);
  });

  it('no action queued (the R4a default): the same step again', async () => {
    const { A, ctx } = await oneCtx();
    interruptAfter(1);
    const log = await runOne(ctx, { id: 'r', section: null, steps: [walk([0, 0, 8])] });
    expect(hook.onRestart).toHaveBeenCalledTimes(1);
    expect(log.deadStops).toEqual([]);
    expect(A.pos.z).toBeCloseTo(8, 0);
  });
});

describe('SR4: course.onRunEnd after the detection and notice lines', () => {
  it('runs once at the end of the run, with the lines already in the log', async () => {
    const { A, ctx } = await oneCtx();
    raiseOnce(A.guard);
    const seen: Obj[] = [];
    hook.onRunEnd = vi.fn(async (c: Obj, run: Obj) => seen.push({ c, detections: run.detections.length, time: run.time_s }));
    const log = await runOne(ctx, { id: 'r', section: null, steps: [walk([0, 0, 6])] });
    expect(hook.onRunEnd).toHaveBeenCalledTimes(1);
    expect(hook.onRunEnd.mock.calls[0][1]).toBe(log);
    expect(seen).toEqual([{ c: ctx, detections: 1, time: log.time_s }]);
  });
});

describe('SR5: checkCourseExpect in checkSelftest', () => {
  const log = { id: 'a2-seen-once', links: [], deadStops: [], stubs: [], guards: { spawned: 1, alive: 1 } };
  it("a run's course block is checked against its log; its problems are the selftest's", () => {
    hook.check = vi.fn(() => ['a2-seen-once: no seen restart from a2-neck']);
    const course = { restarts: [{ cause: 'seen', space: 'a2-neck', then: 'rejoined' }] };
    expect(checkSelftest({ runs: [{ id: 'a2-seen-once', lines: [{ type: 'noDeadStops' }], course }] }, [log])).toEqual(['a2-seen-once: no seen restart from a2-neck']);
    expect(hook.check).toHaveBeenCalledWith(course, log);
  });

  it('no course block: not called', () => {
    expect(checkSelftest({ runs: [{ id: 'a2-seen-once', lines: [] }] }, [log])).toEqual([]);
    expect(hook.check).not.toHaveBeenCalled();
  });

  it('the defaults (until R4c): no restart action, no course problems', async () => {
    const real = await vi.importActual<Obj>('../scripts/route-run/course.mjs');
    expect(await real.onRestart({}, {}, [], 0)).toBe(null);
    expect(real.checkCourseExpect({ restarts: [] }, log)).toEqual([]);
  });
});

describe('R6: --points through the points loader', () => {
  const graphs = [{ meta: { map: 'campusOps' }, spaces: [], links: [] }];
  it('a --points file goes through the loader with the graphs and their files; its notes are printed', async () => {
    const table = { spaces: [], links: [], geom: 'g1', notes: ['the graph is not measured: the points table\'s geom was not checked'] };
    const load = vi.fn(() => table);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const o = parseArgs(['http://x/', '--graph', 'a.json', 'b.json', '--points', 'p.json']);
      expect(await readPoints(o, graphs, null, load)).toBe(table);
      expect(load).toHaveBeenCalledWith({ graphs, files: ['a.json', 'b.json'], src: 'p.json' });
      expect(err.mock.calls.map((c) => c[0])).toEqual([`route-run points: ${table.notes[0]}`]);
    } finally {
      err.mockRestore();
    }
  });

  it("a stale table is refused (the loader throws); auto is passed on; a selftest's table is never checked", async () => {
    const stale = () => {
      throw new Error('the points table was made on another build of the map');
    };
    await expect(readPoints({ points: 'p.json', graphs: ['a.json'] }, graphs, null, stale)).rejects.toThrow(/another build/);
    const load = vi.fn(() => ({ spaces: [], links: [] }));
    await readPoints({ points: 'auto', graphs: ['a.json'] }, graphs, null, load);
    expect(load.mock.calls[0]).toEqual([{ graphs, files: ['a.json'], src: 'auto' }]);
    const own = { spaces: [{ id: 's' }], links: [] };
    const none = vi.fn();
    expect(await readPoints({ points: 'p.json', selftest: 'f.json', graphs: [] }, graphs, { points: own }, none)).toBe(own);
    // a selftest fixture with no table: --points read as it is
    const file = 'tests/fixtures/route-run/campusOps-S1.points.json';
    expect(await readPoints({ points: file, selftest: 'f.json', graphs: [] }, graphs, {}, none)).toEqual(JSON.parse(readFileSync(file, 'utf8')));
    expect(await readPoints({ points: null, graphs: ['f.json'] }, [{ ...graphs[0], points: own }], null, none)).toBe(own);
    expect(none).not.toHaveBeenCalled();
    expect(() => parseArgs(['--bogus'])).toThrow(/--points <file\|auto>/);
  });
});
