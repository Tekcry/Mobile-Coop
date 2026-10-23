import { hyp2 } from '../core/mathx';
import { LIGHT } from '../world/lights';

/**
 * (guard-ai S25) The probable-area search after combat, the pure part (no Babylon, no allocation after construction).
 *
 * The probable area: cells reachable from the last known position within R = clamp(base + speed x seconds since he
 * was seen, base, max) path metres. Points: cover spots and dark cells in it, best first, spaced >= `spacing` m, at
 * most `points`; dark = baked light below `dark` at `sampleY` m over the floor (the light perception reads, parity).
 * `enabled` false: today's ring for every search. The numbers are prototype starting values (A151, A154).
 */
export const SEARCH_AREA = {
  enabled: true,
  /** R at 0 s since seen (m). */
  base: 6,
  /** R growth per second since seen (m/s). */
  speed: 1.5,
  /** R cap (m). */
  max: 20,
  /** Points kept per plan. */
  points: 12,
  /** Minimum distance between two kept points (m). */
  spacing: 3,
  /** Lattice step for the dark-cell candidates (m). */
  lattice: 2,
  /** Baked light below this is dark (the light meter's shadow threshold, light parity). */
  dark: LIGHT.shadow,
  /** Height over the floor the light is sampled at (m). */
  sampleY: 0.9,
  /** Score weight of darkness. */
  wDark: 1,
  /** Score bonus of a cover spot. */
  wCover: 0.6,
  /** Score weight of distance (path from the last known position in `pointScore`, straight from the guard in `take`). */
  wNear: 0.8,
  /** A plan older than this is rebuilt (s). */
  rebuild: 2,
} as const;

const N = SEARCH_AREA.points;

/** R for a search started `sinceSeen` seconds after the intruder was last seen: clamp(base + speed x t, base, max).
 *  A negative, zero or NaN time gives `base`. */
export function areaRadius(sinceSeen: number): number {
  if (!(sinceSeen > 0)) return SEARCH_AREA.base;
  const r = SEARCH_AREA.base + SEARCH_AREA.speed * sinceSeen;
  return r > SEARCH_AREA.max ? SEARCH_AREA.max : r;
}

/**
 * How worth searching a candidate point is (higher first):
 *   score = wDark x (1 - clamp(light / dark, 0, 1)) + (cover ? wCover : 0) - wNear x clamp(pathM / r, 0, 1)
 * `light` is the baked light at the point, `pathM` the path distance from the last known position (m), `r` the area
 * radius. So darker, cover and nearer by path score higher; light at or above `dark` adds nothing.
 */
export function pointScore(light: number, cover: boolean, pathM: number, r: number): number {
  let l = light / SEARCH_AREA.dark;
  if (!(l > 0)) l = 0;
  else if (l > 1) l = 1;
  let p = r > 0 ? pathM / r : 1;
  if (!(p > 0)) p = 0;
  else if (p > 1) p = 1;
  return SEARCH_AREA.wDark * (1 - l) + (cover ? SEARCH_AREA.wCover : 0) - SEARCH_AREA.wNear * p;
}

/** (S25b) Candidate order for `EnemyManager.buildPlan`: fills `order[0..n)` with 0..n-1 sorted by `score` best first
 *  (a shell sort in place: no allocation, no closure), so the plan is offered its candidates best first and `offer`'s
 *  order dependence never loses a point (S25a check polish 1). Equal scores keep no particular order. */
export function orderByScore(order: Int32Array, score: Float64Array, n: number): void {
  for (let i = 0; i < n; i++) order[i] = i;
  let gap = 1;
  while (gap < n / 3) gap = gap * 3 + 1;
  for (; gap > 0; gap = (gap - 1) / 3) {
    for (let i = gap; i < n; i++) {
      const o = order[i]!;
      const s = score[o]!;
      let j = i;
      while (j >= gap && score[order[j - gap]!]! < s) {
        order[j] = order[j - gap]!;
        j -= gap;
      }
      order[j] = o;
    }
  }
}

/** One intruder's search plan: up to `SEARCH_AREA.points` points, kept best first, each claimed by at most one
 *  searcher. Made once at load; every method is allocation-free. */
export class SearchPlan {
  readonly x = new Float32Array(N);
  readonly z = new Float32Array(N);
  /** Float64 so a re-offered score compares exactly with the kept one. */
  readonly score = new Float64Array(N);
  /** Guard num that claimed point k (-1 free). */
  readonly claim = new Int32Array(N).fill(-1);
  /** 1 once point k was searched (or found unreachable): never handed out again until `reset`. */
  readonly done = new Uint8Array(N);
  n = 0;
  cx = 0;
  cz = 0;
  builtAt = -1;

  /** Candidate in, kept only if it beats the worst (or there is room) and is >= spacing from every kept point. A
   *  near-duplicate (closer than spacing) wins only by a strictly higher score; it then replaces every kept point it is
   *  near. Points stay sorted best first (insertion, no allocation); claims and done flags move with their points. */
  offer(x: number, z: number, score: number): void {
    const sp = SEARCH_AREA.spacing;
    let near = 0;
    for (let k = 0; k < this.n; k++) {
      if (hyp2(this.x[k]! - x, this.z[k]! - z) < sp) {
        if (this.score[k]! >= score) return;
        near++;
      }
    }
    if (near === 0 && this.n >= N && score <= this.score[this.n - 1]!) return;
    if (near > 0) {
      // Drop every kept point the newcomer is near (it beats them all), compacting in order.
      let w = 0;
      for (let k = 0; k < this.n; k++) {
        if (hyp2(this.x[k]! - x, this.z[k]! - z) < sp) continue;
        if (w !== k) this.move(k, w);
        w++;
      }
      for (let k = w; k < this.n; k++) {
        this.claim[k] = -1;
        this.done[k] = 0;
      }
      this.n = w;
    }
    // Insert sorted (descending); a full plan drops its worst.
    let i = this.n < N ? this.n : N - 1;
    while (i > 0 && this.score[i - 1]! < score) {
      this.move(i - 1, i);
      i--;
    }
    this.x[i] = x;
    this.z[i] = z;
    this.score[i] = score;
    this.claim[i] = -1;
    this.done[i] = 0;
    if (this.n < N) this.n++;
  }

  /** Best free point for searcher `num` at (gx, gz): max of score - wNear x dist / r over points neither done nor
   *  claimed by another guard; equal values keep the better-ranked point. Any earlier claim of `num` is released, the
   *  pick is claimed for `num`. -1 when none is left. */
  take(num: number, gx: number, gz: number, r: number): number {
    this.release(num);
    const inv = SEARCH_AREA.wNear / (r > 0 ? r : 1);
    let best = -1;
    let bestV = -Infinity;
    for (let k = 0; k < this.n; k++) {
      if (this.done[k] || this.claim[k] !== -1) continue;
      const v = this.score[k]! - inv * hyp2(this.x[k]! - gx, this.z[k]! - gz);
      if (v > bestV) {
        bestV = v;
        best = k;
      }
    }
    if (best >= 0) this.claim[best] = num;
    return best;
  }

  /** Frees every point `num` holds (death, knockout, despawn, leaving the search, a memory reset). */
  release(num: number): void {
    for (let k = 0; k < this.n; k++) if (this.claim[k] === num) this.claim[k] = -1;
  }

  /** Point k searched (or unreachable): done, unclaimed, never handed out again until `reset`. */
  finish(k: number): void {
    if (k < 0 || k >= this.n) return;
    this.done[k] = 1;
    this.claim[k] = -1;
  }

  /** (S25b) The point searcher `num` holds, -1 none. Found by the claim, never by an index saved earlier: `offer`
   *  shifts indices. */
  claimOf(num: number): number {
    for (let k = 0; k < this.n; k++) if (this.claim[k] === num) return k;
    return -1;
  }

  /** (S25b) The point searcher `num` holds is searched (or unreachable): `finish` it. Returns its index, -1 none. */
  finishBy(num: number): number {
    const k = this.claimOf(num);
    if (k >= 0) this.finish(k);
    return k;
  }

  /** (S25b) Some point is claimed (a searcher on his way to it or looking into it): the plan is not rebuilt. */
  anyClaim(): boolean {
    for (let k = 0; k < this.n; k++) if (this.claim[k] !== -1) return true;
    return false;
  }

  /** Empties the plan round a new centre (the last known position) built at `now`. */
  reset(cx: number, cz: number, now: number): void {
    this.n = 0;
    this.claim.fill(-1);
    this.done.fill(0);
    this.cx = cx;
    this.cz = cz;
    this.builtAt = now;
  }

  private move(from: number, to: number): void {
    this.x[to] = this.x[from]!;
    this.z[to] = this.z[from]!;
    this.score[to] = this.score[from]!;
    this.claim[to] = this.claim[from]!;
    this.done[to] = this.done[from]!;
  }
}
