/** Pure spatial navigation maths (unit-tested). */
export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DIRV: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/**
 * Picks the best candidate in direction `dir` from `from`.
 * Score favours candidates that overlap on the perpendicular axis and are close along the axis.
 * Returns -1 if nothing lies in that direction.
 */
export function pickSpatial(from: Rect, candidates: readonly Rect[], dir: Dir): number {
  const [dx, dy] = DIRV[dir];
  const fcx = from.x + from.w / 2;
  const fcy = from.y + from.h / 2;
  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]!;
    const ccx = c.x + c.w / 2;
    const ccy = c.y + c.h / 2;
    // Edge-based distance along the axis so large neighbours are not penalised.
    let along: number;
    if (dx !== 0) along = dx > 0 ? c.x - (from.x + from.w) : from.x - (c.x + c.w);
    else along = dy > 0 ? c.y - (from.y + from.h) : from.y - (c.y + c.h);
    const centreAlong = (ccx - fcx) * dx + (ccy - fcy) * dy;
    if (centreAlong <= 1) continue;
    along = Math.max(0, along);
    let perp: number;
    if (dx !== 0) {
      const overlap = Math.min(from.y + from.h, c.y + c.h) - Math.max(from.y, c.y);
      perp = overlap > 0 ? 0 : Math.abs(ccy - fcy);
    } else {
      const overlap = Math.min(from.x + from.w, c.x + c.w) - Math.max(from.x, c.x);
      perp = overlap > 0 ? 0 : Math.abs(ccx - fcx);
    }
    const score = along + perp * 3 + Math.abs(dx !== 0 ? ccy - fcy : ccx - fcx) * 0.05;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/** When nothing is in `dir`, wrap to the furthest element on the opposite side in the same row/column. */
export function pickWrap(from: Rect, candidates: readonly Rect[], dir: Dir): number {
  const [dx, dy] = DIRV[dir];
  let best = -1;
  let bestVal = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]!;
    const aligned =
      dx !== 0
        ? Math.min(from.y + from.h, c.y + c.h) - Math.max(from.y, c.y) > 0
        : Math.min(from.x + from.w, c.x + c.w) - Math.max(from.x, c.x) > 0;
    if (!aligned) continue;
    const v = (c.x + c.w / 2) * dx + (c.y + c.h / 2) * dy;
    if (v < bestVal) {
      bestVal = v;
      best = i;
    }
  }
  return best;
}
