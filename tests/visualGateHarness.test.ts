import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { mapQuery, settleTarget, gridMeans, gridDelta, isConverged, projectPoint, projectQuads, VIEWPORT,
  pickRigGuard, placeGuards, unplaced, settle, pin, LATE_ROUNDS,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/visual-gate/harness.mjs';
// @ts-expect-error plain .mjs process script without types
import { parseArgs } from '../scripts/e2e-visual.mjs';

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
    expect(await pin(fakePage(app))).toEqual({ flickers: 0, swayed: false });
    expect(app.loop.timeScale).toBe(0);
  });
});

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
    });
  });

  it('defaults, and refuses unknown or empty flags', () => {
    expect(parseArgs(['http://x/'])).toEqual({ url: 'http://x/', time: false, json: null, png: null, only: null, maps: null, serial: false });
    expect(() => parseArgs(['http://x/', '--bogus'])).toThrow(/unknown flag/);
    expect(() => parseArgs(['http://x/', '--json'])).toThrow(/needs a value/);
    expect(() => parseArgs(['http://x/', '--only', '--time'])).toThrow(/needs a value/);
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
