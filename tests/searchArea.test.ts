/**
 * (guard-ai S25) The probable-area search, pure part: `areaRadius` grows with the time since the intruder was seen and
 * clamps (6 m at 0 s, 20 m cap); `SearchPlan.offer` keeps the best `points`, best first, spaced >= `spacing` (a worse
 * near-duplicate is dropped, a better one replaces); `take` hands different points to different guards, prefers the
 * nearer of two equal scores, gives -1 when everything is claimed or done; `release` frees a claim, `finish` never
 * re-offers, `reset` clears; `pointScore` ranks a dark cover spot over lit open floor; no allocation (arrays keep their
 * identity through loops of offer / take).
 */
import { describe, expect, it } from 'vitest';
import { SEARCH_AREA, SearchPlan, areaRadius, orderByScore, pointScore } from '../src/ai/searchArea';
import { LIGHT } from '../src/world/lights';

const N = SEARCH_AREA.points;
const SP = SEARCH_AREA.spacing;

describe('areaRadius', () => {
  it('is base at 0 s, grows by speed, caps at max, and is monotone', () => {
    expect(areaRadius(0)).toBe(6);
    expect(areaRadius(0)).toBe(SEARCH_AREA.base);
    expect(areaRadius(2)).toBeCloseTo(SEARCH_AREA.base + SEARCH_AREA.speed * 2, 6);
    expect(areaRadius(1000)).toBe(20);
    expect(areaRadius(Infinity)).toBe(SEARCH_AREA.max);
    expect(areaRadius(-5)).toBe(SEARCH_AREA.base);
    expect(areaRadius(Number.NaN)).toBe(SEARCH_AREA.base);
    let prev = -Infinity;
    for (let t = 0; t <= 30; t += 0.25) {
      const r = areaRadius(t);
      expect(r).toBeGreaterThanOrEqual(prev);
      expect(r).toBeGreaterThanOrEqual(SEARCH_AREA.base);
      expect(r).toBeLessThanOrEqual(SEARCH_AREA.max);
      prev = r;
    }
  });

  it('uses the light meter shadow threshold for dark (light parity)', () => {
    expect(SEARCH_AREA.dark).toBe(LIGHT.shadow);
  });
});

describe('pointScore', () => {
  it('ranks a dark cover spot above lit open floor at the same path distance', () => {
    const r = 10;
    expect(pointScore(0.05, true, 4, r)).toBeGreaterThan(pointScore(0.8, false, 4, r));
  });

  it('scores darker, cover and nearer by path higher', () => {
    const r = 12;
    expect(pointScore(0.0, false, 5, r)).toBeGreaterThan(pointScore(0.2, false, 5, r));
    expect(pointScore(0.1, true, 5, r)).toBeGreaterThan(pointScore(0.1, false, 5, r));
    expect(pointScore(0.1, false, 2, r)).toBeGreaterThan(pointScore(0.1, false, 8, r));
    // light at or over the dark threshold adds nothing; the path term clamps at r.
    expect(pointScore(SEARCH_AREA.dark, false, 0, r)).toBe(0);
    expect(pointScore(0.9, false, 0, r)).toBe(0);
    expect(pointScore(0, false, 2 * r, r)).toBeCloseTo(SEARCH_AREA.wDark - SEARCH_AREA.wNear, 9);
    expect(pointScore(0, true, 0, r)).toBeCloseTo(SEARCH_AREA.wDark + SEARCH_AREA.wCover, 9);
  });
});

/** Points along +x, `step` m apart (step >= spacing), scores given in order. */
function fill(plan: SearchPlan, scores: number[], step = SP + 1): void {
  for (let i = 0; i < scores.length; i++) plan.offer(i * step, 0, scores[i]!);
}

describe('SearchPlan.offer', () => {
  it('keeps the best `points` candidates, sorted best first', () => {
    const plan = new SearchPlan();
    plan.reset(0, 0, 0);
    const scores: number[] = [];
    for (let i = 0; i < N + 8; i++) scores.push(((i * 7) % (N + 8)) / 10);
    fill(plan, scores);
    expect(plan.n).toBe(N);
    const best = [...scores].sort((a, b) => b - a).slice(0, N);
    for (let k = 0; k < N; k++) expect(plan.score[k]).toBeCloseTo(best[k]!, 9);
    // a candidate no better than the worst is dropped
    plan.offer(-500, -500, plan.score[N - 1]!);
    expect(plan.n).toBe(N);
    for (let k = 0; k < N; k++) expect(plan.x[k]).not.toBe(-500);
  });

  it('enforces spacing: a worse near-duplicate is dropped, a better one replaces', () => {
    const plan = new SearchPlan();
    plan.reset(0, 0, 0);
    plan.offer(0, 0, 0.5);
    plan.offer(10, 0, 0.4);
    // worse (and equal) near-duplicate of (0, 0): dropped
    plan.offer(1, 1, 0.3);
    plan.offer(0.5, 0, 0.5);
    expect(plan.n).toBe(2);
    expect(plan.x[0]).toBe(0);
    expect(plan.score[0]).toBe(0.5);
    // better near-duplicate of (10, 0): replaces it, goes to the top
    plan.offer(11, 0, 0.9);
    expect(plan.n).toBe(2);
    expect(plan.x[0]).toBe(11);
    expect(plan.score[0]).toBe(0.9);
    expect(plan.x[1]).toBe(0);
    // every kept pair stays >= spacing apart
    for (let i = 0; i < 200; i++) plan.offer((i * 37) % 23, (i * 53) % 19, ((i * 13) % 17) / 17);
    for (let a = 0; a < plan.n; a++)
      for (let b = a + 1; b < plan.n; b++) {
        expect(Math.sqrt((plan.x[a]! - plan.x[b]!) ** 2 + (plan.z[a]! - plan.z[b]!) ** 2)).toBeGreaterThanOrEqual(SP);
      }
    for (let k = 1; k < plan.n; k++) expect(plan.score[k - 1]!).toBeGreaterThanOrEqual(plan.score[k]!);
  });

  it('a better candidate near two kept points replaces both', () => {
    const plan = new SearchPlan();
    plan.reset(0, 0, 0);
    plan.offer(0, 0, 0.2);
    plan.offer(4, 0, 0.3);
    plan.offer(20, 0, 0.1);
    plan.offer(2, 0, 0.8);
    expect(plan.n).toBe(2);
    expect(plan.x[0]).toBe(2);
    expect(plan.x[1]).toBe(20);
  });
});

describe('SearchPlan.take / release / finish / reset', () => {
  it('gives different points to different guards, then -1 when all are claimed', () => {
    const plan = new SearchPlan();
    plan.reset(0, 0, 0);
    fill(plan, [0.9, 0.8, 0.7]);
    const r = 10;
    const a = plan.take(1, 0, 0, r);
    const b = plan.take(2, 0, 0, r);
    const c = plan.take(3, 0, 0, r);
    expect(new Set([a, b, c]).size).toBe(3);
    expect([a, b, c].every((k) => k >= 0)).toBe(true);
    expect(plan.claim[a]).toBe(1);
    expect(plan.claim[b]).toBe(2);
    expect(plan.claim[c]).toBe(3);
    expect(plan.take(4, 0, 0, r)).toBe(-1);
  });

  it('prefers the nearer of two equal scores', () => {
    const plan = new SearchPlan();
    plan.reset(0, 0, 0);
    plan.offer(-8, 0, 0.5);
    plan.offer(8, 0, 0.5);
    const k = plan.take(1, 6, 0, 10);
    expect(plan.x[k]).toBe(8);
    const j = plan.take(2, 6, 0, 10);
    expect(plan.x[j]).toBe(-8);
  });

  it('a guard holds one claim: taking again frees his old point', () => {
    const plan = new SearchPlan();
    plan.reset(0, 0, 0);
    fill(plan, [0.9, 0.8]);
    const a = plan.take(1, 0, 0, 10);
    const a2 = plan.take(1, 0, 0, 10);
    expect(a2).toBe(a);
    let held = 0;
    for (let k = 0; k < plan.n; k++) if (plan.claim[k] === 1) held++;
    expect(held).toBe(1);
  });

  it('release frees the guard\'s claim for another', () => {
    const plan = new SearchPlan();
    plan.reset(0, 0, 0);
    fill(plan, [0.9]);
    const a = plan.take(1, 0, 0, 10);
    expect(plan.take(2, 0, 0, 10)).toBe(-1);
    plan.release(1);
    expect(plan.claim[a]).toBe(-1);
    expect(plan.take(2, 0, 0, 10)).toBe(a);
  });

  it('finish marks done and never re-offers; -1 once every point is done', () => {
    const plan = new SearchPlan();
    plan.reset(0, 0, 0);
    fill(plan, [0.9, 0.8]);
    const a = plan.take(1, 0, 0, 10);
    plan.finish(a);
    expect(plan.done[a]).toBe(1);
    expect(plan.claim[a]).toBe(-1);
    const b = plan.take(1, 0, 0, 10);
    expect(b).not.toBe(a);
    plan.finish(b);
    expect(plan.take(1, 0, 0, 10)).toBe(-1);
    expect(plan.take(2, 0, 0, 10)).toBe(-1);
    plan.finish(-1);
    plan.finish(99);
  });

  it('reset clears points, claims and done flags and records the centre', () => {
    const plan = new SearchPlan();
    plan.reset(0, 0, 0);
    fill(plan, [0.9, 0.8, 0.7]);
    plan.take(1, 0, 0, 10);
    plan.finish(plan.take(2, 0, 0, 10));
    plan.reset(3, -4, 12.5);
    expect(plan.n).toBe(0);
    expect(plan.cx).toBe(3);
    expect(plan.cz).toBe(-4);
    expect(plan.builtAt).toBe(12.5);
    for (let k = 0; k < N; k++) {
      expect(plan.claim[k]).toBe(-1);
      expect(plan.done[k]).toBe(0);
    }
    expect(plan.take(1, 0, 0, 10)).toBe(-1);
    fill(plan, [0.5]);
    expect(plan.take(1, 0, 0, 10)).toBe(0);
  });

  it('allocates nothing: arrays keep their identity through offer / take loops', () => {
    const plan = new SearchPlan();
    const { x, z, score, claim, done } = plan;
    for (let round = 0; round < 50; round++) {
      plan.reset(round, 0, round);
      for (let i = 0; i < 60; i++) plan.offer((i * 31) % 29, (i * 17) % 23, ((i * 11) % 19) / 19);
      for (let g = 0; g < 8; g++) {
        const k = plan.take(g, g, -g, areaRadius(round));
        if (k >= 0 && g % 2 === 0) plan.finish(k);
      }
      plan.release(3);
    }
    expect(plan.x).toBe(x);
    expect(plan.z).toBe(z);
    expect(plan.score).toBe(score);
    expect(plan.claim).toBe(claim);
    expect(plan.done).toBe(done);
    expect(plan.x.length).toBe(N);
  });
});

// (guard-ai S25b) the helpers the wiring uses: a point found by its claim (offer shifts indices), the rebuild guard, and
// the best-first candidate order
describe('SearchPlan.claimOf / finishBy / anyClaim (S25b)', () => {
  it('finds a guard\'s point by its claim after an insert shifted it, and finishes that point only', () => {
    const plan = new SearchPlan();
    plan.reset(0, 0, 0);
    fill(plan, [0.5, 0.4]);
    expect(plan.anyClaim()).toBe(false);
    const k = plan.take(7, 4, 0, 10);
    expect(plan.claimOf(7)).toBe(k);
    expect(plan.anyClaim()).toBe(true);
    const x = plan.x[k]!;
    // a better point far away goes in first: every index shifts by one, the claim moves with its point
    plan.offer(-40, 0, 0.9);
    const k2 = plan.claimOf(7);
    expect(k2).toBe(k + 1);
    expect(plan.x[k2]).toBe(x);
    expect(plan.finishBy(7)).toBe(k2);
    expect(plan.done[k2]).toBe(1);
    expect(plan.done[0]).toBe(0);
    expect(plan.claimOf(7)).toBe(-1);
    expect(plan.finishBy(7)).toBe(-1);
    expect(plan.anyClaim()).toBe(false);
  });

  it('a released claim is not live; reset clears every claim', () => {
    const plan = new SearchPlan();
    plan.reset(0, 0, 0);
    fill(plan, [0.5, 0.4, 0.3]);
    plan.take(1, 0, 0, 10);
    plan.take(2, 0, 0, 10);
    plan.release(1);
    expect(plan.claimOf(1)).toBe(-1);
    expect(plan.anyClaim()).toBe(true);
    plan.reset(0, 0, 1);
    expect(plan.anyClaim()).toBe(false);
    expect(plan.claimOf(2)).toBe(-1);
  });
});

describe('orderByScore (S25b)', () => {
  it('orders indices best score first, in place, for any length', () => {
    const order = new Int32Array(64);
    const score = new Float64Array(64);
    for (const n of [0, 1, 2, 5, 13, 40, 64]) {
      for (let i = 0; i < n; i++) score[i] = ((i * 37) % 23) / 7 - 1;
      orderByScore(order, score, n);
      const seen = new Set<number>();
      for (let i = 0; i < n; i++) {
        seen.add(order[i]!);
        if (i > 0) expect(score[order[i - 1]!]!).toBeGreaterThanOrEqual(score[order[i]!]!);
      }
      expect(seen.size).toBe(n);
    }
  });

  it('offered best first, the polish-1 chain keeps every point (no order dependence)', () => {
    // S25a check polish 1: A(0,0,0.5), B(2.5,0,0.4), C(-2,0,0.9) offered as A, B, C lose B; best first keeps C and B
    const xs = [0, 2.5, -2];
    const ss = new Float64Array([0.5, 0.4, 0.9]);
    const order = new Int32Array(3);
    orderByScore(order, ss, 3);
    const plan = new SearchPlan();
    plan.reset(0, 0, 0);
    for (let i = 0; i < 3; i++) plan.offer(xs[order[i]!]!, 0, ss[order[i]!]!);
    expect(plan.n).toBe(2);
    expect([plan.x[0], plan.x[1]]).toEqual([-2, 2.5]);
  });
});
