// (anim-skeleton S4b) The keyframe curve evaluator against Blender 5.2.2's own F-curves (key_clip.py's settings), from
// tests/fixtures/key-curve-blender.json (scripts/anim-skeleton/s4b-fixtures.mjs): synthetic curves on the real key
// frame sets and edge cases, and real bone curves of three baked clips.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { keyCurveAt, keyCurveSet, newKeyCurve } from '../src/anim/keyCurve';

interface Curve {
  name?: string;
  clip?: string;
  path?: string;
  index?: number;
  smoothing: string;
  cyclic?: string;
  keys: number[][];
  handles: number[][][];
  x: number[];
  y: number[];
}
const FIX = JSON.parse(readFileSync(path.join(__dirname, 'fixtures', 'key-curve-blender.json'), 'utf8')) as { blender: string; synthetic: Curve[]; real: Curve[] };
const SPAN = 48;

/** The curve's knots as the bake keys them: every key but the repeat at 48. */
function knots(c: Curve): { t: Float64Array; v: Float64Array; n: number } {
  const ks = c.keys.filter((k) => k[0]! < SPAN);
  return { t: Float64Array.from(ks.map((k) => k[0]!)), v: Float64Array.from(ks.map((k) => k[1]!)), n: ks.length };
}

/** Max |ours - Blender| over the curve's handles (heights) and its evaluated points, scaled by the curve's range. */
function check(c: Curve): { handle: number; value: number; range: number } {
  const { t, v, n } = knots(c);
  const k = keyCurveSet(newKeyCurve(), t, v, n, 1, 0, SPAN);
  let range = 0;
  for (const kk of c.keys) range = Math.max(range, Math.abs(kk[1]!));
  let handle = 0;
  for (let i = 0; i < n; i++) {
    const [hl, hr] = c.handles[i]!;
    handle = Math.max(handle, Math.abs(v[i]! + k.hl[i]! - hl![1]!), Math.abs(v[i]! + k.hr[i]! - hr![1]!));
    // the handles reach a third of their gaps in time
    const gl = t[i]! - (i > 0 ? t[i - 1]! : t[n - 1]! - SPAN);
    expect(Math.abs(t[i]! - hl![0]! - gl / 3)).toBeLessThan(1e-4);
  }
  let value = 0;
  for (let j = 0; j < c.x.length; j++) value = Math.max(value, Math.abs(keyCurveAt(k, c.x[j]!) - c.y[j]!));
  return { handle, value, range: range || 1 };
}

describe('anim-skeleton S4b: Blender keyframe curve', () => {
  it('the fixture is Blender 5.2.2 with the bake settings (Continuous Acceleration smoothing, a Cycles modifier)', () => {
    expect(FIX.blender.startsWith('5.2.2')).toBe(true);
    for (const c of [...FIX.synthetic, ...FIX.real]) expect(c.smoothing).toBe('CONT_ACCEL');
    for (const c of FIX.real) expect(c.cyclic).toBe('CYCLES');
    expect(FIX.real.length).toBeGreaterThan(90);
  });

  it('synthetic curves: handles and values equal Blender to float noise', () => {
    for (const c of FIX.synthetic) {
      const r = check(c);
      expect(r.handle / r.range, `${c.name} handles`).toBeLessThan(2e-6);
      expect(r.value / r.range, `${c.name} values`).toBeLessThan(2e-6);
    }
  });

  it('real bone curves of jog, walk and hold_fwd: handles and the sampled frames equal Blender to float noise', () => {
    let worst = 0;
    for (const c of FIX.real) {
      const r = check(c);
      const e = Math.max(r.handle, r.value);
      worst = Math.max(worst, e);
      expect(e, `${c.clip} ${c.path}[${c.index}]`).toBeLessThan(2e-6 * Math.max(1, r.range));
    }
    expect(worst).toBeLessThan(2e-6);
  });

  it('wraps by the period and never allocates', () => {
    const t = Float64Array.of(0, 12, 24, 36);
    const v = Float64Array.of(0, 1, 2, 3);
    const k = keyCurveSet(newKeyCurve(8), t, v, 4, 1, 0, SPAN);
    expect(keyCurveAt(k, 13.5 + SPAN)).toBeCloseTo(keyCurveAt(k, 13.5), 12);
    expect(keyCurveAt(k, 13.5 - 2 * SPAN)).toBeCloseTo(keyCurveAt(k, 13.5), 12);
    expect(keyCurveAt(k, 12)).toBe(1);
    // the ramp (Blender: free keys at 12 and 24 get handles of 0.4)
    expect(k.hr[1]).toBeCloseTo(0.4, 12);
    const add = Float64Array.of(0, 0.5, 0, 0);
    let s = 0;
    const run = (): number => {
      const before = process.memoryUsage().heapUsed;
      for (let r = 0; r < 100000; r++) {
        keyCurveSet(k, t, v, 4, 1, 0, SPAN, r & 1 ? add : null);
        s += keyCurveAt(k, (r % 480) / 10);
      }
      return process.memoryUsage().heapUsed - before;
    };
    run();
    const grown = Math.min(run(), run(), run());
    expect(Number.isFinite(s)).toBe(true);
    // a 16-byte allocation per iteration would grow ~1.6 MB a pass
    expect(grown).toBeLessThan(1_000_000);
  });
});
