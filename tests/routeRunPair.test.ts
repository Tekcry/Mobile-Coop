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

/**
 * A flat fake game in a vm: the robot moves at the pace along the pad's stick (camera yaw 0: stick x = world x, stick y
 * = world z). `hack`: Sector Ops S2's hold objective at (hx, 0, 0), hold `holdTime`, used through the held context menu
 * (the game's `contextMenuStep`: A down opens the list on row 1, D-pad down / up moves the highlight, the item's
 * progress fills only while A stays down with the highlight on its row, full runs it; a tap never fills it).
 */
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
