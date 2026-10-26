import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs tool script without types
import { PageDriver, pageScript, pageOptions, runOne } from '../scripts/route-run/driver.mjs';
// @ts-expect-error plain .mjs tool script without types
import { paceFor } from '../scripts/route-run/progress.mjs';

// Route-runs R4b (docs/route-runs/PLAN.md "R4b The robot pair"): the pair's pure parts (both page URLs, the boot path
// per mode, split roles and the rejoin wait, stub spots, robot attribution, the lockstep tick) and the driver's hold
// objective (the R4a recheck's hack fix), against scripted pages in a Node vm. The two-page runs are pending PC runs.

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const metrics = JSON.parse(readFileSync(new URL('../docs/design/metrics.json', import.meta.url), 'utf8'));
const pace = paceFor('sneak', metrics);

/** A flat fake game (camera yaw 0) with S2's hold objective at (hx, 0, 0) used through the held context menu, as
 *  `contextMenuStep`: A down opens the list on row 1, D-pad moves the highlight, progress fills only while A stays down
 *  on the item row; a tap never fills it. */
function fakeGame({ hx = 2, holdTime = 3, rows = ['door', 'item'] as string[], reach = 2.5 } = {}) {
  class V {
    constructor(public x: number, public y: number, public z: number) {}
  }
  const axes = [0, 0, 0, 0];
  const buttons: number[] = Array(17).fill(0);
  const prev: number[] = Array(17).fill(0);
  const presses: number[] = [];
  const item = { id: 's2-obj', holdTime, progress: 0, done: false };
  const run = { index: 1, phase: 'objective', downloading: false, extractT: 0, conn: { insideT: 0 }, current: { id: 's2', objective: { x: hx, y: 0, z: 0, kind: 'hack' }, connector: { box: [50, 50, 51, 51], floorY: 0 } } };
  const cm = { state: 'none', sel: 0, count: 0, opts: rows.map((kind) => ({ kind })) };
  const done: number[] = [];
  const game: Obj = {
    time: 0,
    player: { position: new V(0, 0, 0), cam: { yaw: 0 }, controller: { crouched: true, crouchIntent: true, speed: 0, yaw: 0, teleport(v: V) { game.player.position = v; } } },
    nav: { findPath: (_a: number[], b: number[]) => [[b[0], b[1]]], heightAt: () => 0, cellOf: () => 1, isWalkable: () => true, nearestWalkable: () => -1, centerInto: (_k: number, o: number[]) => o, cellHeight: () => 0 },
    world: { doors: { nearest: () => null }, map: { sectors: [{ id: 's1' }, { id: 's2' }] } },
    enemyMgr: { enemies: [], hear() {}, resetAlarm() {} },
    target: { damageMul: 1 },
    interactables: { items: [item] },
    ctxMenu: cm,
    restartCheckpoint: () => true,
  };
  const step = (dt: number) => {
    const p = game.player.position;
    const m = Math.hypot(axes[0]!, axes[1]!);
    if (m > 0.1) {
      p.x += (axes[0]! / m) * pace.speed * dt;
      p.z += (-axes[1]! / m) * pace.speed * dt;
    }
    // the held context menu (row kinds `rows`; the item listed only within its reach)
    const near = Math.abs(p.x - hx) < reach;
    cm.count = near && run.phase === 'objective' ? rows.length : 0;
    const a = buttons[0]!;
    if (cm.count === 0) cm.state = 'none';
    else if (cm.state !== 'active' && a && !prev[0]) {
      cm.state = 'active';
      cm.sel = 0;
    } else if (cm.state === 'active') {
      if (buttons[13] && !prev[13]) cm.sel = Math.min(cm.count - 1, cm.sel + 1);
      if (buttons[12] && !prev[12]) cm.sel = Math.max(0, cm.sel - 1);
      if (!a) cm.state = 'passive';
    }
    const on = cm.state === 'active' && cm.opts[cm.sel]!.kind === 'item' && !!a;
    item.progress = on ? item.progress + dt : 0;
    if (item.progress >= holdTime - 1e-9 && run.phase === 'objective') {
      item.done = true;
      run.phase = 'connector';
      done.push(game.time);
    }
    for (let i = 0; i < 17; i++) prev[i] = buttons[i]!;
    game.time += dt;
  };
  const window: Obj = {
    __app: { current: game, loop: { manual: false, stepHeadless: step } },
    __pad: { connect() {}, set(i: number, v: number) { buttons[i] = v; if (v) presses.push(i); }, axis(i: number, v: number) { axes[i] = v; } },
    __sector: { camAlarms: 0, run },
  };
  const ctx = vm.createContext({ window, Math, Float64Array, Array });
  vm.runInContext(pageScript(pageOptions({ pace, forgive: true })), ctx);
  const page = {
    async evaluate(fn: unknown, arg?: unknown) {
      const r = typeof fn === 'string' ? vm.runInContext(fn, ctx) : vm.runInContext(`(${String(fn)})(${JSON.stringify(arg)})`, ctx);
      return r === undefined ? undefined : JSON.parse(JSON.stringify(r));
    },
    async screenshot() {},
  };
  return { game, item, run, cm, presses, buttons, done, page };
}

async function objectiveRun(g: { page: unknown }) {
  const driver = new PageDriver(g.page, { pace, forgive: true, points: null });
  await driver.install();
  const ctx = { driver, host: g.page, client: null, shots: null, players: 1, notes: [] as string[] };
  return runOne(ctx, { id: 'S2-code-1', section: 'S2', steps: [{ type: 'objective', space: null }] });
}

describe('hold objectives (R4a recheck item 1: S2 is a 3 s hack)', () => {
  it('holds A in the held context menu until the phase changes: the highlight moved onto the item row first', async () => {
    const g = fakeGame();
    const log = await objectiveRun(g);
    expect(log.deadStops).toEqual([]);
    expect(log.objectives).toEqual([{ space: null, kind: 'hack', hold_s: expect.any(Number), done: true, from: 'stand' }]);
    // one press of A held through the hold (a tap every 3 s would never fill it), one D-pad down onto the item row
    expect(g.presses.filter((b) => b === 0)).toHaveLength(1);
    expect(g.presses.filter((b) => b === 13)).toHaveLength(1);
    expect(g.run.phase).toBe('connector');
    expect(log.objectives[0].hold_s).toBeGreaterThanOrEqual(3);
    expect(log.objectives[0].hold_s).toBeLessThan(3.6);
    // A goes up once the phase changed
    expect(g.buttons[0]).toBe(0);
  });

  it("the try watches the item's progress: out of reach it walks to the hack's own point and holds there", async () => {
    const g = fakeGame({ hx: 8, rows: ['item'] });
    const log = await objectiveRun(g);
    expect(log.deadStops).toEqual([]);
    expect(log.objectives).toEqual([{ space: null, kind: 'hack', hold_s: expect.any(Number), done: true, from: 'point' }]);
    expect(g.game.player.position.x).toBeGreaterThan(5.5);
    expect(g.presses.filter((b) => b === 13)).toHaveLength(0);
  });

  it('a hold that never fills stops at its own hold + 5 s (read from the item, not a constant)', async () => {
    const g = fakeGame({ rows: ['door'], holdTime: 3 });
    const log = await objectiveRun(g);
    expect(log.objectives[0]).toMatchObject({ kind: 'hack', done: false, from: 'point' });
    expect(log.deadStops.map((d: Obj) => d.class)).toEqual(['step-timeout']);
    // from the retry at the point: 3 s hold + A4's 5 s
    expect(log.objectives[0].hold_s).toBeGreaterThan(8);
    expect(log.objectives[0].hold_s).toBeLessThan(8.3);
    // with no item row A went up and was pressed again (never held on a door row)
    expect(g.presses.filter((b) => b === 0).length).toBeGreaterThan(3);
    expect(g.item.progress).toBe(0);
  });
});

// @ts-expect-error plain .mjs tool script without types
import { addPast, checkSelftest, ownParams, stepsForPath } from '../scripts/route-run.mjs';
// @ts-expect-error plain .mjs tool script without types
import { attributeRobot, bootPath, ClockWatch, lockTick, PairDriver, pairBoot, RejoinWait, splitRoles, stubSpots, PAIR_SIDE_M } from '../scripts/route-run/pair.mjs';
// @ts-expect-error plain .mjs tool script without types
import { lineOf } from '../scripts/route-run/causes.mjs';

const json = (f: string) => JSON.parse(readFileSync(new URL(`./fixtures/route-run/${f}`, import.meta.url), 'utf8'));
const dist = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[2]! - b[2]!);

describe('the pair boot', () => {
  const own = ownParams({ map: 'campusOps', mode: 'sector' }, pace, 2);
  it('both pages come from the one helper and are equal: caller params kept, net / autostart / mode once', () => {
    const b = pairBoot('http://127.0.0.1:4189/?campusv2=2', own, 'sector');
    expect(b.client).toEqual(b.host);
    expect(b.host.url).toBe('http://127.0.0.1:4189/');
    const q = new URLSearchParams(b.host.params);
    expect(q.get('campusv2')).toBe('2');
    for (const k of ['net', 'autostart', 'mode']) expect(q.getAll(k)).toHaveLength(1);
    expect([q.get('net'), q.get('autostart'), q.get('mode')]).toEqual(['local', 'campusOps', 'sector']);
    // the course bay is the host session's, never a URL param
    const c = new URLSearchParams(pairBoot('http://h/', ownParams({ map: 'ctcourse', mode: 'training' }, pace, 2), 'course').host.params);
    expect(c.get('mode')).toBe('course');
    expect(c.has('courseBay')).toBe(false);
  });

  it('course and Sector Ops autostart; any other mode boots the lobby (hostAndJoin + startMode), no autostart in it', () => {
    expect([bootPath('course'), bootPath('sector'), bootPath('campaign'), bootPath('infiltration')]).toEqual(['autostart', 'autostart', 'lobby', 'lobby']);
    const q = new URLSearchParams(pairBoot('http://h/?campusv2=1', ownParams({ map: 'tallow', mode: 'campaign' }, pace, 2), 'campaign').host.params);
    expect([q.has('autostart'), q.has('mode'), q.get('net'), q.get('campusv2')]).toEqual([false, false, 'local', '1']);
  });
});

describe('pair roles and spots', () => {
  it('split roles: leader leg a, follower leg b; the rejoin wait either way round', () => {
    const r = splitRoles({ a: [1], b: [2] });
    expect(r.map((x: Obj) => [x.side, x.robot, x.steps])).toEqual([['a', 'leader', [1]], ['b', 'follower', [2]]]);
    const w = new RejoinWait();
    expect(w.arrive('follower', 10)).toBe('wait');
    expect(w.waited()).toBe(null);
    expect(w.arrive('leader', 13.5)).toBe('go');
    expect(w.waited()).toEqual({ robot: 'follower', s: 3.5 });
    const v = new RejoinWait();
    expect(v.arrive('leader', 4)).toBe('wait');
    expect(v.arrive('follower', 6)).toBe('go');
    expect(v.waited()).toEqual({ robot: 'leader', s: 2 });
  });

  it('stub spots: 1 m apart on the near side at `at`, the far side past `at` along from -> to, never one point', () => {
    const at = [-20, 0, -40.5];
    const past = [-20, 4.4, -39.3];
    const s = stubSpots(at, past);
    expect(s.leaderNear).toEqual(at);
    expect(dist(s.leaderNear, s.followerNear)).toBeCloseTo(PAIR_SIDE_M, 9);
    expect(dist(s.leaderFar, s.followerFar)).toBeCloseTo(PAIR_SIDE_M, 9);
    const u = [past[0]! - at[0]!, past[2]! - at[2]!];
    for (const p of [s.leaderFar, s.followerFar]) expect((p[0]! - at[0]!) * u[0]! + (p[2]! - at[2]!) * u[1]!).toBeGreaterThan(0);
    // the follower beside, not behind: across the approach
    expect((s.followerNear[0]! - at[0]!) * u[0]! + (s.followerNear[2]! - at[2]!) * u[1]!).toBeCloseTo(0, 9);
    expect(s.followerFar[1]).toBe(4.4);
  });
});

describe('robot attribution (A12)', () => {
  const guard = { id: 'e1', kind: 'rifle', x: 0, y: 1.6, z: 0, yaw: 0 };
  const rise = (a: number[], b: number[]) => ({ t: 1, cls: 'detection', level: 'alert', camera: null, guard, robots: [{ x: a[0], y: 0, z: a[1] }, { x: b[0], y: 0, z: b[1] }], heard: [] });
  it('a target slot wins; else the robot in the view cone; else the nearer', () => {
    // the leader ahead in his cone, the follower nearer behind him
    expect(attributeRobot(rise([0, 8], [0, -3]))).toBe(0);
    expect(attributeRobot(rise([0, 8], [0, -3]), 1)).toBe(1);
    expect(attributeRobot(rise([0, -8], [0, 6]))).toBe(1);
    // both in the cone, or neither: the nearer
    expect(attributeRobot(rise([0, 9], [1, 5]))).toBe(1);
    expect(attributeRobot(rise([0, -9], [1, -5]))).toBe(1);
    expect(attributeRobot(rise([0, -4], [1, -5]))).toBe(0);
    // a camera has no guard position: the leader
    expect(attributeRobot({ ...rise([0, 1], [0, 2]), guard: { id: 'cam', kind: 'camera' } })).toBe(0);
  });

  it('one rise is one line, whichever robot it names', async () => {
    const raws = [rise([0, 8], [0, -3]), rise([0, -8], [0, 6])];
    const lines = raws.map((r) => lineOf({ ...r, space: null }));
    const pair = new PairDriver({ call: async () => raws }, {}, { points: null });
    await pair.nameRobots(lines);
    expect(lines.map((l: Obj) => [l.kind, l.robot, l.robotAt])).toEqual([['detection', 'leader', [0, 0, 8]], ['detection', 'follower', [0, 0, 6]]]);
  });
});

describe('the lockstep tick', () => {
  it('host then client each tick, the client the same game time; the drift note once past 1 s', async () => {
    const order: string[] = [];
    let ct = 0;
    const host = { t: 0, async tick(s: number) { order.push(`host ${s}`); this.t += s; return { ev: '', t: this.t, dt: s, walking: true }; } };
    const client = { async tick(s: number, idle: boolean) { order.push(`client ${s} ${idle}`); ct += s / 4; return { ev: '', t: ct, dt: s }; } };
    const clock = new ClockWatch();
    clock.arm();
    const notes: string[] = [];
    for (let i = 0; i < 20; i++) {
      const { h, c } = await lockTick(host, client, 0.2);
      const n = clock.check(h.t, c.t, 'r1');
      if (n) notes.push(n);
    }
    expect(order.slice(0, 4)).toEqual(['host 0.2', 'client 0.2 false', 'host 0.2', 'client 0.2 false']);
    // the client clock runs at a quarter: over 1 s behind after 1.4 s of host time; one note only
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/^clock: run r1: the client was 1\.05 s behind the host at 1\.4 s/);
    expect(new ClockWatch().check(10, 0)).toBe(null);
  });
});

/** Two fake pages in two vms over one flat world: the host's remote is the client player's feet, the client's host
 *  avatar the host player's (the net, with no lag); each page steps only its own player. */
function fakePair(start = [23, 0, -68]) {
  class V {
    constructor(public x: number, public y: number, public z: number) {}
  }
  const mk = (x: number, z: number) => {
    const axes = [0, 0, 0, 0];
    const buttons: number[] = Array(17).fill(0);
    const pos = new V(x, start[1]!, z);
    const game: Obj = {
      time: 0,
      player: { position: pos, cam: { yaw: 0 }, controller: { crouched: false, crouchIntent: false, speed: 0, yaw: 0, teleport(v: V) { pos.x = v.x; pos.y = v.y; pos.z = v.z; } } },
      nav: { findPath: (_a: number[], b: number[]) => [[b[0], b[1]]], heightAt: () => NaN, cellOf: () => 1, isWalkable: () => true, nearestWalkable: () => -1, centerInto: (_k: number, o: number[]) => o, cellHeight: () => 0 },
      world: { doors: { nearest: () => null }, map: { sectors: [] } },
      target: { damageMul: 1 },
      team: { end() {} },
    };
    const step = (dt: number) => {
      const c = game.player.controller;
      if (buttons[1]) { c.crouchIntent = !c.crouchIntent; c.crouched = c.crouchIntent; buttons[1] = 0; }
      const m = Math.hypot(axes[0]!, axes[1]!);
      c.speed = m > 0.1 ? pace.speed : 0;
      if (m > 0.1) {
        pos.x += (axes[0]! / m) * pace.speed * dt;
        pos.z += (-axes[1]! / m) * pace.speed * dt;
      }
      game.time += dt;
    };
    const window: Obj = { __app: { current: game, loop: { manual: false, stepHeadless: step } }, __pad: { connect() {}, set(i: number, v: number) { buttons[i] = v; }, axis(i: number, v: number) { axes[i] = v; } } };
    return { game, window, pos };
  };
  const A = mk(start[0]!, start[2]!);
  const B = mk(start[0]!, start[2]! - 2);
  const guard = { id: 'e1', def: { kind: 'rifle' }, job: 'gate', zone: 'barrier', pos: new V(200, 0, 200), yaw: 0, alive: true, level: 'unaware', aware: { set(l: string) { guard.level = l; } } };
  A.game.enemyMgr = { enemies: [guard], hear() {}, resetAlarm() {} };
  A.game.net = { remotes: new Map([['c', { feet: B.pos, ref: { crouched: true, speed: 0 }, state: {}, damageMul: 1, allowTeleport() {} }]]) };
  B.game.net = { avatars: new Map([['h', { pos: A.pos }]]) };
  A.game.restartCheckpoint = () => {
    A.pos.x = start[0]!; A.pos.z = start[2]!;
    B.pos.x = start[0]!; B.pos.z = start[2]! - 2;
    return true;
  };
  const page = (w: Obj) => {
    const ctx = vm.createContext({ window: w, Math, Float64Array, Array, Map });
    return {
      async evaluate(fn: unknown, arg?: unknown) {
        const r = typeof fn === 'string' ? vm.runInContext(fn, ctx) : vm.runInContext(`(${String(fn)})(${JSON.stringify(arg)})`, ctx);
        return r === undefined ? undefined : JSON.parse(JSON.stringify(r));
      },
      async screenshot() {},
    };
  };
  return { A, B, guard, pageA: page(A.window), pageB: page(B.window) };
}

describe('the robot pair against two fake pages (PairDriver + runOne)', () => {
  const fx = json('selftest-pair.graph.json');
  const runOf = (er: Obj) => ({ id: er.id, section: er.section, steps: addPast(stepsForPath([fx], fx.points, er.path, metrics.rules.split_speed_mps), fx.points) });
  async function pairCtx() {
    const f = fakePair();
    const host = new PageDriver(f.pageA, { pace, forgive: true, points: fx.points, role: 'leader' });
    const client = new PageDriver(f.pageB, { pace, forgive: true, points: fx.points, role: 'follower' });
    await host.install();
    await client.install();
    const notes: string[] = [];
    const pair = new PairDriver(host, client, { points: fx.points, notes });
    return { f, pair, notes, ctx: { host: f.pageA, client: f.pageB, driver: pair, pair, shots: null, players: 2, notes } as Obj };
  }

  it("the fixture's split is walked by both legs at once, the boost is a stub held 6 s with both placed, and the selftest passes", async () => {
    const { f, ctx } = await pairCtx();
    const er = fx.expect.runs[0];
    const log = await runOne(ctx, runOf(er));
    expect(log.deadStops).toEqual([]);
    expect(log.splits).toHaveLength(1);
    const [a, b] = log.splits[0].legs;
    expect([a.robot, a.links, a.reached, b.robot, b.links, b.reached]).toEqual(['leader', [3, 5], true, 'follower', [4, 6], true]);
    expect(log.stubs).toEqual([{ link: 17, kind: 'coop_boost', hold_s: 6, why: expect.any(String), robots: ['leader', 'follower'] }]);
    expect(log.links.filter((l: Obj) => l.robot === 'follower').map((l: Obj) => l.index)).toEqual([4, 6]);
    expect(checkSelftest({ runs: [er] }, [log])).toEqual([]);
    // both placed past the boost, 1 m apart, the follower crouched behind the leader on the way
    expect(dist([f.A.pos.x, 0, f.A.pos.z], [f.B.pos.x, 0, f.B.pos.z])).toBeLessThan(3.5);
    expect(f.B.game.player.controller.crouched).toBe(true);
  });

  it('a guard rising on the trailing follower names the follower (one line), and the follower keeps up on a plain run', async () => {
    const { f, ctx } = await pairCtx();
    const er = fx.expect.runs[1];
    let raised = false;
    const orig = f.A.window.__app.loop.stepHeadless;
    f.A.window.__app.loop.stepHeadless = (dt: number) => {
      orig(dt);
      // a guard behind the pair, facing them, rises once the walk is under way: the follower is the one he sees
      if (!raised && f.A.game.time > 8) {
        raised = true;
        Object.assign(f.guard.pos, { x: f.B.pos.x, y: 0, z: f.B.pos.z - 6 });
        f.guard.yaw = 0;
        f.guard.level = 'alert';
      }
    };
    const log = await runOne(ctx, runOf(er));
    expect(log.deadStops).toEqual([]);
    expect(log.detections.map((d: Obj) => d.robot)).toEqual(['follower']);
    expect(log.stubs.map((s: Obj) => [s.link, s.hold_s, s.robots])).toEqual([[18, 7, ['leader', 'follower']]]);
    expect(checkSelftest({ runs: [er] }, [log])).toEqual([]);
  });

  it('a follower pinned while trailing is a follower dead stop, placed beside the leader, and the run goes on', async () => {
    const { f, ctx } = await pairCtx();
    // the client cannot move once its z passes -66: the leader walks on north
    const orig = f.B.window.__app.loop.stepHeadless;
    // (until the harness places it: a jump between two steps)
    let pinned = true;
    let lastZ = f.B.pos.z;
    f.B.window.__app.loop.stepHeadless = (dt: number) => {
      const z = f.B.pos.z;
      if (Math.abs(z - lastZ) > 1) pinned = false;
      orig(dt);
      if (pinned && f.B.pos.z > -66) f.B.pos.z = Math.max(z, -66);
      lastZ = f.B.pos.z;
    };
    const log = await runOne(ctx, { id: 'pinned', section: 'S1', steps: [{ type: 'walk', to: [23, 0, -50], space: 's1-verge', link: null }] });
    expect(log.deadStops.map((d: Obj) => [d.robot, d.class])).toEqual([['follower', 'could-not-follow']]);
    expect(log.deadStops[0].t - log.deadStops[0].since).toBeGreaterThanOrEqual(8 - 1e-6);
  });
});
