/**
 * (campaign look-video) The look-video recorder's pure parts (`scripts/look-video.mjs`): the plan parser, the camera path at
 * a time (linear, clamped, 0 s segments are cuts), and the Tallow Wharf plan's points inside the map. The browser recording
 * itself is a PC run (GPU, laptop queue).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs tool script without types
import { parseLookPlan, pathAt, pathSeconds } from '../scripts/look-video.mjs';

type Point = [number, number, number, number, number, number, number];
type Section = { key: string; seconds: number; path: Point[] };
const parse = parseLookPlan as (json: unknown, only?: string[]) => Section[];
const at = pathAt as (path: Point[], t: number) => number[];
const seconds = pathSeconds as (path: Point[]) => number;

const PATH: Point[] = [
  [0, 1, 0, 0, 1, 10, 0],
  [10, 1, 0, 10, 1, 10, 10],
  [10, 3, 20, 0, 0, 0, 5],
  [50, 5, 50, 50, 0, 60, 0], // a cut
  [60, 5, 50, 60, 0, 60, 10],
];
const plan = (path: unknown, extra: Record<string, unknown> = {}) => ({ params: 'autostart=x&mode=sector', sections: { a: { seconds: 30, path }, ...extra } });

describe('look-video: parseLookPlan', () => {
  it('returns the sections in file order, or the picked ones', () => {
    const p = plan(PATH, { b: { seconds: 25, path: PATH } });
    expect(parse(p).map((s) => s.key)).toEqual(['a', 'b']);
    expect(parse(JSON.stringify(p), ['b']).map((s) => [s.key, s.seconds])).toEqual([['b', 25]]);
  });

  it('rejects an unknown section', () => {
    expect(() => parse(plan(PATH), ['a', 'zz'])).toThrow(/unknown section "zz"/);
  });

  it('rejects a bad point: too short, not a number, a negative time, a first time that is not 0', () => {
    expect(() => parse(plan([PATH[0], [1, 2, 3, 4, 5, 6]]))).toThrow(/point 1/);
    expect(() => parse(plan([PATH[0], [1, 2, 3, 4, 5, 'x', 2]]))).toThrow(/point 1/);
    expect(() => parse(plan([PATH[0], [1, 2, 3, 4, 5, Number.NaN, 2]]))).toThrow(/point 1/);
    expect(() => parse(plan([PATH[0], [1, 2, 3, 4, 5, 6, -1]]))).toThrow(/negative/);
    expect(() => parse(plan([[0, 1, 0, 0, 1, 10, 3], PATH[1]]))).toThrow(/point 0/);
  });

  it('rejects a plan without params or sections, a one-point path and a path longer than its seconds', () => {
    expect(() => parse({ sections: { a: { seconds: 30, path: PATH } } })).toThrow(/params/);
    expect(() => parse({ params: 'x', sections: {} })).toThrow(/no sections/);
    expect(() => parse(plan([PATH[0]]))).toThrow(/2 or more/);
    expect(() => parse({ params: 'x', sections: { a: { seconds: 20, path: PATH } } })).toThrow(/over its 20 s/);
  });
});

describe('look-video: pathAt', () => {
  it('the path takes 25 s (the cut adds none)', () => {
    expect(seconds(PATH)).toBe(25);
  });

  it('at 0 (and before) the first point', () => {
    expect(at(PATH, 0)).toEqual([0, 1, 0, 0, 1, 10]);
    expect(at(PATH, -3)).toEqual([0, 1, 0, 0, 1, 10]);
  });

  it('at a point its pose; between two points the linear mix', () => {
    expect(at(PATH, 10)).toEqual([10, 1, 0, 10, 1, 10]);
    expect(at(PATH, 5)).toEqual([5, 1, 0, 5, 1, 10]);
    const m = at(PATH, 12.5);
    [10, 2, 10, 5, 0.5, 5].forEach((v, i) => expect(m[i]).toBeCloseTo(v, 9));
  });

  it('a 0 s segment is a cut: just before it the last pose, at it the cut point', () => {
    const before = at(PATH, 15 - 1e-9);
    [10, 3, 20, 0, 0, 0].forEach((v, i) => expect(before[i]).toBeCloseTo(v, 6));
    expect(at(PATH, 15)).toEqual([50, 5, 50, 50, 0, 60]);
    expect(at(PATH, 20)).toEqual([55, 5, 50, 55, 0, 60]);
  });

  it('past the end the last point', () => {
    expect(at(PATH, 25)).toEqual([60, 5, 50, 60, 0, 60]);
    expect(at(PATH, 99)).toEqual([60, 5, 50, 60, 0, 60]);
  });
});

describe('look-video: the Tallow Wharf plan', () => {
  // WHARF_BOUNDS and SECTION_BOX from `src/world/maps/tallowWharfKit.ts:20` and `:27-32` on origin/feature/mission-engine
  // (the map is not on master yet)
  const WHARF_BOUNDS = { minX: 0, maxX: 120, minZ: 0, maxZ: 80 };
  const SECTION_BOX: Record<string, [number, number, number, number]> = { w1: [0, 6, 40, 62], w2: [40, 48, 76, 80], w3: [82, 34, 120, 80], w4: [44, 0, 120, 34] };
  const json = JSON.parse(readFileSync('scripts/look-video/tallowWharf.json', 'utf8')) as unknown;
  const sections = parse(json);

  it('parses: W1-W4, ~75 s each, 6-10 points, the mission params', () => {
    expect(sections.map((s) => s.key)).toEqual(['w1', 'w2', 'w3', 'w4']);
    expect((json as { params: string }).params).toBe('autostart=tallowWharf&mode=sector&missions=1&coopkit=1&mission=threeGreyCoats');
    for (const s of sections) {
      expect(s.seconds, s.key).toBe(75);
      expect(seconds(s.path), s.key).toBeGreaterThanOrEqual(65);
      expect(s.path.length, s.key).toBeGreaterThanOrEqual(6);
      expect(s.path.length, s.key).toBeLessThanOrEqual(10);
    }
  });

  it('every camera and look target lies inside WHARF_BOUNDS; every camera inside its section box', () => {
    for (const s of sections) {
      const box = SECTION_BOX[s.key]!;
      for (const p of s.path) {
        for (const [x, z] of [[p[0], p[2]], [p[3], p[5]]] as const) {
          expect(x >= WHARF_BOUNDS.minX && x <= WHARF_BOUNDS.maxX && z >= WHARF_BOUNDS.minZ && z <= WHARF_BOUNDS.maxZ, `${s.key} ${JSON.stringify(p)}`).toBe(true);
        }
        expect(p[0] >= box[0] && p[0] <= box[2] && p[2] >= box[1] && p[2] <= box[3], `${s.key} camera ${JSON.stringify(p)} in ${JSON.stringify(box)}`).toBe(true);
      }
    }
  });

  it('each section has one high view (a camera 6 m or more up) and walks at eye height (1.6-3 m) elsewhere', () => {
    for (const s of sections) {
      const high = s.path.filter((p) => p[1] >= 6);
      expect(high.length, s.key).toBeGreaterThan(0);
      for (const p of s.path) if (p[1] < 6) expect(p[1] >= 1.6 && p[1] <= 3, `${s.key} ${JSON.stringify(p)}`).toBe(true);
    }
  });
});
