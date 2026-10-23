import { describe, expect, it } from 'vitest';
import { MAX_INTRUDERS, mayBeSeen, nearestTarget, pickTarget, TARGETS } from '../src/ai/targetPick';
import { sightRate, type SightInput } from '../src/ai/perception';

// (guard-ai S23) Co-op perception, the pure part: `mayBeSeen` (no ray for a player a calm guard cannot see) agrees with
// `sightRate > 0`, and `pickTarget` picks the best-seen player when calm and keeps the one he fights in combat.

const D = (...v: number[]) => Float64Array.from(v);
const L = (...v: number[]) => Uint8Array.from(v);
const X = Infinity;

describe('mayBeSeen', () => {
  it('agrees with sightRate > 0 on a grid (dist 0-30, angle -pi..pi, speed 0 / 1 / 4; exposure 1, light 1): no false "no"', () => {
    const si: SightInput = { dist: 0, angle: 0, light: 1, crouched: false, speed: 0, exposure: 1, sensitivity: 1, pitch: 0 };
    let checked = 0;
    let yes = 0;
    for (const speed of [0, 1, 4]) {
      for (const crouched of [false, true]) {
        for (let d = 0; d <= 30; d += 0.25) {
          for (let a = -Math.PI; a <= Math.PI + 1e-9; a += Math.PI / 90) {
            si.dist = d;
            si.angle = a;
            si.speed = speed;
            si.crouched = crouched;
            const seen = sightRate(si) > 0;
            expect(mayBeSeen(d, a, speed, false, false), `d ${d} a ${a.toFixed(3)} v ${speed} c ${crouched}`).toBe(seen);
            checked++;
            if (seen) yes++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(40000);
    expect(yes).toBeGreaterThan(1000);
  });

  it('a calm guard: behind him beyond the close range, or past the field range, is a "no"; alerted guards and dogs always pass', () => {
    expect(mayBeSeen(15, Math.PI, 4, false, false)).toBe(false);
    expect(mayBeSeen(26, 0, 1, false, false)).toBe(false);
    expect(mayBeSeen(13, 1.5, 1, false, false)).toBe(false);
    expect(mayBeSeen(9, 0, 0, false, false)).toBe(true);
    // felt close by from behind: a walk, not a sneak
    expect(mayBeSeen(1, Math.PI, 1.5, false, false)).toBe(true);
    expect(mayBeSeen(1, Math.PI, 0.5, false, false)).toBe(false);
    expect(mayBeSeen(15, Math.PI, 0, true, false)).toBe(true);
    expect(mayBeSeen(40, Math.PI, 0, false, true)).toBe(true);
  });
});

describe('pickTarget', () => {
  it('calm: the highest rate wins; nobody seen: the nearest', () => {
    expect(pickTarget(2, false, -1, -1, L(0, 1), D(0.1, 0.9), D(4, 9))).toBe(1);
    expect(pickTarget(2, false, -1, -1, L(1, 1), D(1.2, 0.4), D(6, 3))).toBe(0);
    expect(pickTarget(3, false, -1, -1, L(0, 0, 0), D(0, 0, 0), D(7, 3, 5))).toBe(1);
  });

  it('alerted: keeps cur while he has los; else the nearest visible; else hunt, then cur, then the nearest', () => {
    // cur 1 in sight, a nearer 0 also in sight: stays on 1
    expect(pickTarget(2, true, 1, -1, L(1, 1), D(0, 0), D(2, 9))).toBe(1);
    // cur 1 out of sight: the nearest visible
    expect(pickTarget(3, true, 1, -1, L(0, 0, 1), D(0, 0, 0), D(2, 4, 8))).toBe(2);
    expect(pickTarget(3, true, 1, -1, L(1, 0, 1), D(0, 0, 0), D(9, 4, 8))).toBe(2);
    // nobody visible: hunt when alive
    expect(pickTarget(3, true, 1, 2, L(0, 0, 0), D(0, 0, 0), D(2, 4, 8))).toBe(2);
    // hunt dead: cur
    expect(pickTarget(3, true, 1, 2, L(0, 0, 0), D(0, 0, 0), D(2, 4, X))).toBe(1);
    // hunt -1 and cur dead: the nearest
    expect(pickTarget(3, true, 1, -1, L(0, 0, 0), D(0, 0, 0), D(5, X, 3))).toBe(2);
    // no cur at all: the nearest visible, else the nearest
    expect(pickTarget(2, true, -1, -1, L(0, 1), D(0, 0), D(2, 6))).toBe(1);
    expect(pickTarget(2, true, -1, -1, L(0, 0), D(0, 0), D(2, 6))).toBe(0);
  });

  it('dead players (Infinity) are never picked; all dead: -1', () => {
    expect(pickTarget(2, false, -1, -1, L(1, 1), D(3, 0.5), D(X, 9))).toBe(1);
    expect(pickTarget(2, true, 0, -1, L(1, 1), D(0, 0), D(X, 9))).toBe(1);
    expect(pickTarget(2, true, 0, 0, L(0, 0), D(0, 0), D(X, 9))).toBe(1);
    expect(pickTarget(2, false, -1, -1, L(0, 0), D(0, 0), D(X, X))).toBe(-1);
    expect(pickTarget(2, true, 1, 0, L(0, 0), D(0, 0), D(X, X))).toBe(-1);
    expect(pickTarget(0, false, -1, -1, L(), D(), D())).toBe(-1);
  });

  it('ties: the nearer, then the lower index', () => {
    expect(pickTarget(3, false, -1, -1, L(1, 1, 1), D(0.5, 0.5, 0.5), D(6, 4, 4))).toBe(1);
    expect(pickTarget(2, false, -1, -1, L(1, 1), D(0.5, 0.5), D(4, 4))).toBe(0);
    expect(pickTarget(3, true, -1, -1, L(1, 1, 1), D(0, 0, 0), D(6, 4, 4))).toBe(1);
    expect(pickTarget(2, false, -1, -1, L(0, 0), D(0, 0), D(4, 4))).toBe(0);
  });

  it('TARGETS.all false gives the nearest (nearestTarget); the defaults are all and sticky; four players at most', () => {
    expect(TARGETS).toEqual({ all: true, sticky: true });
    expect(MAX_INTRUDERS).toBe(4);
    expect(nearestTarget(3, D(7, X, 3))).toBe(2);
    expect(nearestTarget(2, D(4, 4))).toBe(0);
    expect(nearestTarget(2, D(X, X))).toBe(-1);
  });
});
