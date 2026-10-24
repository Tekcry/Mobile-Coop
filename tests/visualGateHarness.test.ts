import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { mapQuery, settleTarget, gridMeans, gridDelta, isConverged, projectPoint, projectQuads, VIEWPORT,
  pickRigGuard, placeGuards, unplaced, settle, pin, LATE_ROUNDS, gridDeltaQ, convergeState, CONVERGE, flickerNear,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/visual-gate/harness.mjs';
// @ts-expect-error plain .mjs process script without types
import { parseArgs, finish, meterRow } from '../scripts/e2e-visual.mjs';

type Vec3 = [number, number, number];

/** Row-major 4 x 4 product in Babylon's row-vector order (v x A x B = v x (A.multiply(B))). */
function mul(a: number[], b: number[]): number[] {
  const out = new Array<number>(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) out[i * 4 + j]! += a[i * 4 + k]! * b[k * 4 + j]!;
  return out;
}

/** Babylon PerspectiveFovLH (left-handed, z forward, w = view z), row-vector order. */
function perspectiveLH(fov: number, aspect: number, near: number, far: number): number[] {
  const f = 1 / Math.tan(fov / 2);
  const a = (far + near) / (far - near);
  const b = (-2 * far * near) / (far - near);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, a, 1, 0, 0, b, 0];
}

/** A camera at `eye` looking down +z (LH): the view matrix is a translation by -eye (row-vector order: row 3). */
function viewAt(eye: Vec3): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -eye[0], -eye[1], -eye[2], 1];
}

const W = 960;
const H = 540;
const PROJ = perspectiveLH(Math.PI / 2, 16 / 9, 0.1, 500);
const M = mul(viewAt([0, 0, 0]), PROJ);

function flat(w: number, h: number, v: number): Uint8Array {
  const a = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) a.set([v, v, v, 255], i * 4);
  return a;
}

describe('visual-gate harness (pure part)', () => {
  it('VIEWPORT is 960 x 540 (A6)', () => {
    expect(VIEWPORT).toEqual({ width: 960, height: 540 });
  });

  it('mapQuery adds the preset, clear weather and the proof flags', () => {
    const map = { query: 'autostart=warehouse&mode=clear', label: 'warehouse' };
    expect(mapQuery(map, 'low')).toBe('autostart=warehouse&mode=clear&gfx=low&weather=clear');
    expect(mapQuery(map, 'epic', 'falloff=photo')).toBe('autostart=warehouse&mode=clear&gfx=epic&weather=clear&falloff=photo');
    expect(mapQuery(map, 'low', '')).toBe('autostart=warehouse&mode=clear&gfx=low&weather=clear');
  });

  it('settleTarget covers the torch round robin and the minimum sim time', () => {
    expect(settleTarget(0)).toBe(0.3);
    expect(settleTarget(40)).toBeCloseTo(41 / 60, 12);
    expect(settleTarget(0, 0.5)).toBe(0.5);
    expect(settleTarget(40, 1)).toBe(1);
    expect(settleTarget(5, 0)).toBeCloseTo(6 / 60, 12);
  });

  it('gridMeans: flat grey, a left-half white image, the cell count', () => {
    const g = gridMeans(flat(32, 18, 128), 32, 18);
    expect(g).toHaveLength(16 * 9);
    for (const v of g) expect(Math.abs(v - 128 / 255)).toBeLessThan(1e-9);
    const w = 8;
    const h = 9;
    const half = flat(w, h, 0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++) half.set([255, 255, 255], (y * w + x) * 4);
    const two = gridMeans(half, w, h, 2);
    expect(two).toHaveLength(2 * 9);
    for (let r = 0; r < 9; r++) {
      expect(two[r * 2]).toBeCloseTo(1, 9);
      expect(two[r * 2 + 1]).toBe(0);
    }
    expect(gridMeans(flat(40, 30, 10), 40, 30, 5, 3)).toHaveLength(15);
  });

  it('gridMeans runs from its own source text (the page path)', () => {
    const src = (gridMeans as (...a: unknown[]) => number[]).toString();
    const fn = new Function(`return (${src});`)() as typeof gridMeans;
    expect(fn(flat(16, 9, 51), 16, 9)).toEqual(gridMeans(flat(16, 9, 51), 16, 9));
  });

  it('gridDelta and isConverged', () => {
    expect(gridDelta([0.1, 0.5, 0.2], [0.1, 0.45, 0.3])).toBeCloseTo(0.1, 12);
    expect(() => gridDelta([1], [1, 2])).toThrow();
    expect(isConverged([0.01, 0.003, 0.002, 0.001], 0.004, 3)).toBe(true);
    expect(isConverged([0.003, 0.005, 0.001], 0.004, 3)).toBe(false);
    expect(isConverged([0.001, 0.001])).toBe(false);
    expect(isConverged([0.001, 0.001, 0.001])).toBe(true);
  });

  it('gridDeltaQ: the q quantile of the cell differences (nearest rank)', () => {
    const a = new Array<number>(144).fill(0.2);
    const b = a.map((v, i) => (i < 10 ? v + 0.02 : v + 0.001));
    expect(gridDelta(a, b)).toBeCloseTo(0.02, 12);
    expect(gridDeltaQ(a, b, 0.9)).toBeCloseTo(0.001, 12); // 10 shimmering cells of 144 sit above the 0.9 rank
    expect(gridDeltaQ(a, b, 1)).toBeCloseTo(0.02, 12);
    expect(gridDeltaQ([], [], 0.9)).toBe(0);
    expect(() => gridDeltaQ([1], [1, 2])).toThrow();
  });

  it('convergeState: steady, noisy (a shimmer under the cap), still settling', () => {
    expect(CONVERGE).toEqual({ tol: 0.004, need: 3, q: 0.9, maxTol: 0.03 });
    expect(convergeState([0.01, 0.003, 0.002, 0.001], [0.001, 0.001, 0.001, 0.001])).toBe('steady');
    // m-f-gallery@epic (M0 / VG5 laptop runs): the worst cell moves 0.008-0.012 for 60 reads, the rest are still
    expect(convergeState([0.009, 0.012, 0.008], [0.001, 0.0008, 0.001])).toBe('noisy');
    // a frame still settling everywhere (the quantile over tol) or one cell jumping past the cap: not converged
    expect(convergeState([0.009, 0.012, 0.008], [0.005, 0.001, 0.001])).toBeNull();
    expect(convergeState([0.009, 0.05, 0.008], [0.001, 0.001, 0.001])).toBeNull();
    expect(convergeState([0.001, 0.001], [0.001, 0.001])).toBeNull();
    expect(convergeState([0.009, 0.012, 0.008], [0.001, 0.001, 0.001], { maxTol: 0.01 })).toBeNull();
  });

  it('flickerNear: flickering lights whose radius (+0.5 m) reaches the chest or head sample; runs from its source', () => {
    const reg = {
      flickering: [0, 1, 2, 9],
      lights: [
        { x: 0, y: 3, z: 0, radius: 2 }, // head at 1.615: 1.385 m, in reach
        { x: 10, y: 3, z: 0, radius: 4 }, // 10 m away
        { x: 0, y: 3, z: 3.2, radius: 2.5 }, // chest / head ~3.3 m: within 2.5 + 0.5? no (3.2 m flat)
      ],
    };
    expect(flickerNear(reg, 0, 0, 0, 1.7)).toBe(1);
    expect(flickerNear({ flickering: [0], lights: [{ x: 50, y: 0, z: 0 }] }, 0, 0, 0, 1.7)).toBe(1); // no radius counts
    expect(flickerNear(undefined, 0, 0, 0, 1.7)).toBe(0);
    expect(flickerNear({ lights: [] }, 0, 0, 0, 1.7)).toBe(0);
    const fromSource = new Function(`return ${flickerNear.toString()}`)();
    expect(fromSource(reg, 0, 0, 0, 1.7)).toBe(1);
  });

  it('projectPoint: centre, right, up, behind', () => {
    const c = projectPoint(M, [0, 0, 5], W, H);
    expect(c.x).toBeCloseTo(480, 9);
    expect(c.y).toBeCloseTo(270, 9);
    expect(c.w).toBeCloseTo(5, 9);
    expect(projectPoint(M, [1, 0, 5], W, H).x).toBeGreaterThan(480);
    expect(projectPoint(M, [0, 1, 5], W, H).y).toBeLessThan(270);
    expect(projectPoint(M, [0, 0, -5], W, H).w).toBeLessThanOrEqual(0);
    // fov 90: a point at x = z / aspect sits on the right edge, y = z on the top edge
    expect(projectPoint(M, [5 * (16 / 9), 0, 5], W, H).x).toBeCloseTo(W, 6);
    expect(projectPoint(M, [0, 5, 5], W, H).y).toBeCloseTo(0, 6);
    // a moved camera: the view matrix shifts the point
    const m2 = mul(viewAt([1, 0, 0]), PROJ);
    expect(projectPoint(m2, [1, 0, 5], W, H).x).toBeCloseTo(480, 9);
  });

  it('projectQuads: screen corners, and behind when a corner is behind the camera', () => {
    const front: [Vec3, Vec3, Vec3, Vec3] = [[-1, -1, 5], [1, -1, 5], [1, 1, 5], [-1, 1, 5]];
    const back: [Vec3, Vec3, Vec3, Vec3] = [[-1, -1, 5], [1, -1, 5], [1, 1, -5], [-1, 1, -5]];
    const p = projectQuads(M, { wall: front, floor: back }, W, H);
    expect(Object.keys(p).sort()).toEqual(['floor', 'wall']);
    expect(p.wall.behind).toBe(false);
    expect(p.wall.pts).toHaveLength(4);
    const [x0, y0] = p.wall.pts[0];
    const [x2, y2] = p.wall.pts[2];
    expect(x0).toBeLessThan(480);
    expect(y0).toBeGreaterThan(270);
    expect(x2).toBeGreaterThan(480);
    expect(y2).toBeLessThan(270);
    expect(p.floor.behind).toBe(true);
    expect(projectQuads(M, {}, W, H)).toEqual({});
  });
});

// ---- guard placement (M1 fix round): fakes of the page's enemy objects ----
class FakeV {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  copyFrom(o: FakeV): this {
    return this.set(o.x, o.y, o.z);
  }
}

interface FakeE {
  alive: boolean;
  def: { quadruped: boolean };
  pos: FakeV;
  prevPos: FakeV;
  yaw: number;
  torchOverride: boolean | null;
  update: (dt: number) => void;
  bodyRig: { setEnabled: (v: boolean) => void };
  __vgPlaced?: boolean;
}

function fakeE(quadruped = false, alive = true): FakeE {
  return {
    alive,
    def: { quadruped },
    pos: new FakeV(5, 0, 5),
    prevPos: new FakeV(4, 0, 4),
    yaw: 0,
    torchOverride: null,
    update: () => {
      throw new Error('brain ran');
    },
    bodyRig: { setEnabled: () => {} },
  };
}

const BD = { minX: -50, minZ: -60 };
const FEET: Vec3 = [1, 2, 3];
const RIG = { guard: { pos: [7, 0, 8] as Vec3, yaw: 1.5 }, torch: true, doorAt: null };

/** A page whose evaluate runs the harness's source-text expression in node over a fake `window.__app`. */
function fakePage(app: unknown): { evaluate: (expr: string) => Promise<unknown> } {
  const w = globalThis as unknown as Record<string, unknown>;
  w.window = { __app: app };
  w.document = { body: { classList: { add: () => {}, remove: () => {} } } };
  return { evaluate: async (expr: string) => new Function(`return ${expr}`)() };
}

/** A fake game: `time` steps 0.1 s per read; `spawn(read)` may add guards when `enemies` is read (read 1 = the placement). */
function fakeApp(list: FakeE[], spawn: (read: number) => void = () => {}) {
  let t = 0;
  let reads = 0;
  const g = {
    player: { position: new FakeV(), controller: { teleport: () => {} }, rig: { setEnabled: () => {} } },
    photoFreeze: () => {},
    vision: { set: () => {} },
    enemyMgr: {
      get enemies() {
        spawn(++reads);
        return list;
      },
      torches: [] as unknown[],
      hasTorch: (e: FakeE) => e.torchOverride === true,
    },
    world: {
      level: { bounds: BD, lights: { flickering: [], lights: [], sway: false } },
      lightField: { bodyLevel: () => 0.25 },
      doors: { list: [] },
    },
    lightLevel: 0.3,
    get time() {
      t += 0.1;
      return t;
    },
  };
  return { current: g, loop: { timeScale: 0 } };
}

describe('visual-gate guard placement (late spawns)', () => {
  afterEach(() => {
    const w = globalThis as unknown as Record<string, unknown>;
    delete w.window;
    delete w.document;
  });

  it('pickRigGuard: the first alive non-quadruped, else null', () => {
    const dog = fakeE(true);
    const dead = fakeE(false, false);
    const man = fakeE();
    expect(pickRigGuard([dog, dead, man])).toBe(man);
    expect(pickRigGuard([dog, dead])).toBeNull();
    expect(pickRigGuard(undefined)).toBeNull();
  });

  it('placeGuards: rig guard at its pose with its torch, the rest (dogs too) parked in slots, all stubbed and tagged', () => {
    const dog = fakeE(true);
    const rigG = fakeE();
    const other = fakeE();
    const k = placeGuards([dog, rigG, other], rigG, RIG, BD, FEET, 0);
    expect(k).toBe(2);
    expect([rigG.pos.x, rigG.pos.y, rigG.pos.z, rigG.yaw, rigG.torchOverride]).toEqual([7, 0, 8, 1.5, true]);
    expect([dog.pos.x, dog.pos.y, dog.pos.z, dog.torchOverride]).toEqual([-49, -38, -59, false]);
    expect([other.pos.x, other.pos.y, other.pos.z, other.torchOverride]).toEqual([-48.5, -38, -59, false]);
    for (const e of [dog, rigG, other]) {
      expect(e.__vgPlaced).toBe(true);
      expect(e.prevPos).toEqual(e.pos);
      e.pos.set(0, 0, 0);
      e.update(1 / 60); // the stub only holds the position (no brain)
      expect(e.prevPos.x).toBe(0);
    }
    // late guards continue from the next slot, never as the rig guard
    const late = fakeE();
    expect(placeGuards([late], null, RIG, BD, FEET, k)).toBe(3);
    expect([late.pos.x, late.torchOverride]).toEqual([-48, false]);
  });

  it('unplaced: alive and untagged only', () => {
    const a = fakeE();
    const b = fakeE();
    const dead = fakeE(false, false);
    placeGuards([a], null, null, BD, FEET, 0);
    expect(unplaced([a, b, dead])).toEqual([b]);
    expect(unplaced(undefined)).toEqual([]);
  });

  it('the helpers run from their own source text (the page path)', () => {
    const p = new Function(`return ${placeGuards.toString()}`)();
    const u = new Function(`return ${unplaced.toString()}`)();
    const r = new Function(`return ${pickRigGuard.toString()}`)();
    const e = fakeE();
    expect(r([fakeE(true), e])).toBe(e);
    expect(p([e], e, RIG, BD, FEET, 0)).toBe(0);
    expect(u([e, fakeE()])).toHaveLength(1);
  });

  it('settle parks a guard spawned during the wait and waits again', async () => {
    const dog = fakeE(true);
    const rigG = fakeE();
    const list = [dog, rigG];
    const late = fakeE();
    // read 1 = placement, read 2 = the late check after round 0: the sector fill spawns one
    const app = fakeApp(list, (read) => {
      if (read === 2) list.push(late);
    });
    const r = await settle(fakePage(app), { feet: FEET, rig: RIG, minSimS: 0.05 });
    expect(r.guards).toBe(3);
    expect(late.__vgPlaced).toBe(true);
    expect([late.pos.x, late.pos.y, late.pos.z, late.torchOverride]).toEqual([-48.5, -38, -59, false]);
    expect(r.torch).toEqual({ want: true, has: true });
    expect(r.othersLit).toBe(0);
    expect(app.loop.timeScale).toBe(1);
  });

  it(`settle throws when guards keep spawning past ${LATE_ROUNDS} late rounds`, async () => {
    const list = [fakeE()];
    const app = fakeApp(list, (read) => {
      if (read >= 2) list.push(fakeE());
    });
    await expect(settle(fakePage(app), { feet: FEET, rig: null, minSimS: 0.05 })).rejects.toThrow(/guards still spawning/);
  });

  it('pin throws on an unplaced guard before pinning, and pins when all are placed', async () => {
    const a = fakeE();
    const list = [a];
    const app = fakeApp(list);
    placeGuards(list, null, null, BD, FEET, 0);
    list.push(fakeE());
    app.loop.timeScale = 1;
    await expect(pin(fakePage(app))).rejects.toThrow('pin: unplaced guard(s) 1');
    expect(app.loop.timeScale).toBe(1);
    list.pop();
    expect(await pin(fakePage(app))).toEqual({ flickers: 0, swayed: false, bars: 0 });
    expect(app.loop.timeScale).toBe(0);
  });

  it('pin clears the cinematic letterbox (vg5t: sector / clear modes open with 2.8 s of bars) and reports its amount', async () => {
    const list = [fakeE()];
    const app = fakeApp(list);
    placeGuards(list, null, null, BD, FEET, 0);
    const g = app.current as unknown as { post?: { bars: number; barsTarget: number }; letterboxT?: number };
    g.post = { bars: 0.62, barsTarget: 1 };
    g.letterboxT = 1.4;
    const r = await pin(fakePage(app));
    expect(r.bars).toBeCloseTo(0.62, 12);
    expect(g.post).toEqual({ bars: 0, barsTarget: 0 });
    expect(g.letterboxT).toBe(0);
    // a build without the post (or without bars) is left alone
    delete g.post;
    delete g.letterboxT;
    expect((await pin(fakePage(app))).bars).toBe(0);
    expect(g.letterboxT).toBeUndefined();
  });
});

describe('visual-gate settle additions (VG5: flickering lights, alarm before / after)', () => {
  afterEach(() => {
    const w = globalThis as unknown as Record<string, unknown>;
    delete w.window;
    delete w.document;
  });

  it('records the flickering count and the alarm before / after; raised when either changes; null without a mode', async () => {
    const list = [fakeE()];
    const app = fakeApp(list, (read) => {
      if (read === 2) mode.run.alarm = 1;
    });
    const mode = { run: { alarm: 0 }, reinforced: 0 };
    const g = app.current as unknown as { mode?: unknown; world: { level: { lights: { flickering: number[]; lights: unknown[] } } } };
    g.mode = mode;
    // (vg5t) two flickering lights on the map, one of them reaching the player's body (the fake player stands at 0, 0, 0)
    g.world.level.lights.flickering = [3, 4];
    g.world.level.lights.lights = [null, null, null, { x: 0, y: 2.5, z: 0, radius: 3 }, { x: 40, y: 2.5, z: 0, radius: 3 }];
    const r = await settle(fakePage(app), { feet: FEET, rig: null, minSimS: 0.05 });
    expect(r.flickering).toBe(1);
    expect(r.flickeringAll).toBe(2);
    expect(r.alarm).toEqual({ before: { stage: 0, reinforced: 0 }, after: { stage: 1, reinforced: 0 }, raised: true });
    const quiet = fakeApp([fakeE()]);
    (quiet.current as unknown as { mode?: unknown }).mode = { run: { alarm: 0 }, reinforced: 2 };
    expect((await settle(fakePage(quiet), { feet: FEET, rig: null, minSimS: 0.05 })).alarm).toEqual({ before: { stage: 0, reinforced: 2 }, after: { stage: 0, reinforced: 2 }, raised: false });
    const none = await settle(fakePage(fakeApp([fakeE()])), { feet: FEET, rig: null, minSimS: 0.05 });
    expect(none.alarm).toBeNull();
    expect(none.flickering).toBe(0);
    expect(none.flickeringAll).toBe(0);
  });

  it('(vg5t) meter and field where the player stands: pos, drift from the feet, the field there and at the feet', async () => {
    const app = fakeApp([fakeE()]);
    const g = app.current as unknown as { player: { position: FakeV }; world: { lightField: { bodyLevel: (x: number, y: number, z: number, h: number) => number } } };
    const reads: number[][] = [];
    g.world.lightField.bodyLevel = (x, y, z, h) => {
      reads.push([x, y, z, h]);
      return x === 1 ? 0.25 : 0.4; // the view's feet are at x 1 (FEET), the pushed-aside player at x 1.6
    };
    g.player.position.set(1.6, 2, 3);
    const r = await settle(fakePage(app), { feet: FEET, rig: null, minSimS: 0.05 });
    expect(r.pos).toEqual([1.6, 2, 3]);
    expect(r.drift).toBeCloseTo(0.6, 9);
    expect(r.field).toBe(0.4);
    expect(r.fieldFeet).toBe(0.25);
    expect(reads).toEqual([[1.6, 2, 3, 1.7], [1, 2, 3, 1.7]]);
    // standing on the feet: one read, both the same
    g.player.position.set(1, 2, 3);
    reads.length = 0;
    const s = await settle(fakePage(app), { feet: FEET, rig: null, minSimS: 0.05 });
    expect([s.drift, s.field, s.fieldFeet, reads.length]).toEqual([0, 0.25, 0.25, 1]);
  });
});

describe('e2e-visual meterRow and finish (vg5t)', () => {
  const V = { id: 'cp-s3-c', map: 'campusOps', feet: [46, 0, -24] };
  const st = { meter: 0.4153, field: 0.3519, simS: 0.3, guards: 1, flickering: 0, flickeringAll: 1, drift: 0, alarm: null };

  it('meterRow: a far flickering light no longer hides a miss; a near one is a flicker skip; drift and counts in the note', () => {
    expect(meterRow(V, 'low', st)).toMatchObject({ id: 'meter-cp-s3-c@low', ok: false, skip: null, note: 'd 0.0634, 0 of 1 flickering near' });
    expect(meterRow(V, 'low', { ...st, flickering: 1 })).toMatchObject({ ok: true, skip: 'flicker' });
    expect(meterRow(V, 'epic', { ...st, field: 0.41, drift: 0.62 })).toMatchObject({ ok: true, skip: null, note: 'd 0.0053, 0 of 1 flickering near, drift 0.62 m' });
    expect(meterRow(V, 'low', { ...st, meter: NaN })).toMatchObject({ ok: true, skip: 'error', note: 'meter NaN field 0.3519 not finite, 0 of 1 flickering near' });
    expect(meterRow(V, 'low', { ...st, field: 0.4153, flickeringAll: 0 }).note).toBe('d 0');
  });

  it('finish: sets exitCode, arms an unref\'d backstop exit, never exits at once', () => {
    const exits: number[] = [];
    const proc = { exitCode: undefined as number | undefined, exit: (c: number) => exits.push(c) };
    const armed: { fn: (() => void) | null; ms: number; unref: boolean } = { fn: null, ms: 0, unref: false };
    const timer = (fn: () => void, ms: number) => {
      armed.fn = fn;
      armed.ms = ms;
      return { unref: () => (armed.unref = true) };
    };
    expect(finish(1, proc, timer)).toBe(1);
    expect(proc.exitCode).toBe(1);
    expect(exits).toEqual([]);
    expect(armed).toMatchObject({ ms: 5000, unref: true });
    armed.fn?.();
    expect(exits).toEqual([1]);
  });
});

const GATE_DEFAULTS = { extra: '', record: false, noRecord: false, rulesOnly: false, cards: null, version: null, deadline: null, scratch: null, rescore: null };

describe('e2e-visual parseArgs', () => {
  it('reads the url and every flag', () => {
    expect(parseArgs(['http://127.0.0.1:4189/', '--time', '--json', 'out/m0.json', '--png', 'out/png', '--only', 'a,b', '--maps', 'ctcourse,warehouse', '--serial'])).toEqual({
      url: 'http://127.0.0.1:4189/',
      time: true,
      json: 'out/m0.json',
      png: 'out/png',
      only: ['a', 'b'],
      maps: ['ctcourse', 'warehouse'],
      serial: true,
      ...GATE_DEFAULTS,
    });
  });

  it('defaults, and refuses unknown or empty flags', () => {
    expect(parseArgs(['http://x/'])).toEqual({ url: 'http://x/', time: false, json: null, png: null, only: null, maps: null, serial: false, ...GATE_DEFAULTS });
    expect(() => parseArgs(['http://x/', '--bogus'])).toThrow(/unknown flag/);
    expect(() => parseArgs(['http://x/', '--json'])).toThrow(/needs a value/);
    expect(() => parseArgs(['http://x/', '--only', '--time'])).toThrow(/needs a value/);
  });

  it('reads the gate flags (VG5)', () => {
    expect(parseArgs(['http://x/', '--extra', 'falloff=photo&gfx=low', '--record', '--no-record', '--rules-only', '--cards', '1', '--version', '4.97.1', '--deadline', '200', '--scratch', 'C:/s', '--rescore', 'r.json'])).toEqual({
      url: 'http://x/', time: false, json: null, png: null, only: null, maps: null, serial: false,
      extra: 'falloff=photo&gfx=low', record: true, noRecord: true, rulesOnly: true, cards: 1, version: '4.97.1', deadline: 200, scratch: 'C:/s', rescore: 'r.json',
    });
    expect(parseArgs(['http://x/', '--cards', '0']).cards).toBe(0);
    expect(() => parseArgs(['http://x/', '--cards', 'two'])).toThrow(/--cards/);
    expect(() => parseArgs(['http://x/', '--cards', '-1'])).toThrow(/needs a value|--cards/);
    expect(() => parseArgs(['http://x/', '--cards', '1.5'])).toThrow(/--cards/);
    expect(() => parseArgs(['http://x/', '--deadline', '0'])).toThrow(/--deadline/);
    expect(() => parseArgs(['http://x/', '--deadline', 'soon'])).toThrow(/--deadline/);
    expect(() => parseArgs(['http://x/', '--version', '4.97'])).toThrow(/--version/);
    expect(() => parseArgs(['http://x/', '--rescore'])).toThrow(/needs a value/);
  });
});

describe('visual-gate static guard', () => {
  const harness = fs.readFileSync('scripts/visual-gate/harness.mjs', 'utf8');
  const runner = fs.readFileSync('scripts/e2e-visual.mjs', 'utf8');
  const srcImport = /(from\s+|import\s*\(\s*)['"][^'"]*\/src\//;

  it('no Babylon and no game source import in node code', () => {
    for (const t of [harness, runner]) {
      expect(t).not.toContain('@babylonjs');
      expect(t).not.toMatch(srcImport);
    }
  });

  it('e2e-lib is imported lazily by the harness (no playwright in the unit test path)', () => {
    expect(harness).not.toMatch(/^\s*import\s[^;]*from\s+['"]\.\.\/e2e-lib\.mjs['"]/m);
    expect(harness).toContain("import('../e2e-lib.mjs')");
    expect(runner).not.toMatch(/^\s*import\s[^;]*from\s+['"]\.\/e2e-lib\.mjs['"]/m);
  });

  it('pins through loop.timeScale, no src hook', () => {
    expect(harness).toContain('timeScale = 0');
    expect(harness).not.toContain('shotPin');
    expect(runner).not.toContain('shotPin');
  });
});
