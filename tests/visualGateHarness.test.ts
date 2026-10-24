import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { mapQuery, settleTarget, gridMeans, gridDelta, isConverged, projectPoint, projectQuads, VIEWPORT,
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
