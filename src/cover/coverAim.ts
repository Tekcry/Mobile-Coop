/**
 * Aim limits from cover (pure; unit-tested). From a cover peek only the angles the weapon can actually
 * shoot along are allowed, so whatever the crosshair can reach, the shot clears the cover:
 *  - round an edge (high or low cover): from just across the face (a few degrees back over the cover, as
 *    far as the muzzle, leaned past the edge, clears the corner) round to well behind the shoulder;
 *  - over low cover: a wide arc out over the top, never so far down that the line dips into it;
 *  - at high cover away from an edge: only along or away from the wall (never into it).
 * Yaw follows the game's convention (`atan2(dx, dz)`); pitch is positive up.
 */
export interface AimLimit {
  /** Centre of the allowed yaw arc and its half-width (rad). */
  yaw: number;
  half: number;
  /**
   * Over low cover: the muzzle's height above the top (m) and the horizontal distance to the far edge of
   * the top straight across (m); Infinity = no pitch limit. Aiming lower than the line from the muzzle
   * over that edge would put the round into the cover; aiming sideways the top runs further, so the limit
   * tightens with the yaw (`pitchMin`).
   */
  clear: number;
  reach: number;
}

/** How far back across the face (rad) an edge peek may aim: the muzzle sits only a little past the corner. */
export const EDGE_BACK = 0;
/** How far round past the edge (rad from straight across the cover) an edge peek may aim. */
export const EDGE_ROUND = 2.36;
/** Over low cover: half-width of the yaw arc (rad). */
export const OVER_HALF = 1.4;
/** At high cover away from an edge: half-width of the arc facing away from the wall (rad). */
export const WALL_HALF = 1.4;
/** Over low cover: only this much of the muzzle's clearance may be used (margin for spread / sway), and
 *  the sideways reach is capped (aiming almost along the top). */
export const OVER_MARGIN = 0.6;
export const OVER_MIN_COS = 0.12;
/** Easing rate (rad/s) back into range when a limit starts outside the current aim. */
export const LIMIT_EASE = 8;

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Edge peek. `nx, nz`: the face's outward normal (towards the player's side); `ux, uz`: along the face
 * towards the edge being peeked past.
 */
export function edgeLimit(nx: number, nz: number, ux: number, uz: number, out: AimLimit): AimLimit {
  const across = Math.atan2(-nx, -nz);
  const sgn = wrapAngle(Math.atan2(ux, uz) - across) >= 0 ? 1 : -1;
  out.yaw = across + sgn * ((EDGE_ROUND - EDGE_BACK) / 2);
  out.half = (EDGE_ROUND + EDGE_BACK) / 2;
  out.clear = Infinity;
  return out;
}

/**
 * Over low cover: the muzzle `clear` metres above the top, the far edge of the top `reach` metres away
 * horizontally (standoff + depth): aiming lower than that line would put the shot into the cover.
 */
export function overLimit(nx: number, nz: number, clear: number, reach: number, out: AimLimit): AimLimit {
  out.yaw = Math.atan2(-nx, -nz);
  out.half = OVER_HALF;
  out.clear = Math.max(0, clear);
  out.reach = Math.max(0.1, reach);
  return out;
}

/** High cover away from an edge: along or away from the wall only. */
export function wallLimit(nx: number, nz: number, out: AimLimit): AimLimit {
  out.yaw = Math.atan2(nx, nz);
  out.half = WALL_HALF;
  out.clear = Infinity;
  return out;
}

export interface AimState {
  yaw: number;
  pitch: number;
  /** Was inside the limit last frame (then the limit is a hard stop, else the aim eases into it). */
  inside: boolean;
}

/** Lowest pitch allowed at a yaw (rad from the limit's centre). */
export function pitchMin(lim: AimLimit, rel: number): number {
  if (!Number.isFinite(lim.clear)) return -Infinity;
  // the far edge of the top is further away the more sideways the aim
  const c = Math.max(OVER_MIN_COS, Math.cos(rel));
  return -Math.atan2(lim.clear * OVER_MARGIN, lim.reach / c);
}

/** Keep an aim inside a limit: a hard stop at the boundary, or an ease into range if it starts outside. */
export function clampAim(a: AimState, lim: AimLimit, dt: number): void {
  const rel = wrapAngle(a.yaw - lim.yaw);
  const pmin = pitchMin(lim, Math.max(-lim.half, Math.min(lim.half, rel)));
  const pitchOk = a.pitch >= pmin - 1e-6;
  if (Math.abs(rel) <= lim.half + 1e-6 && pitchOk) {
    a.inside = true;
    return;
  }
  if (Math.abs(rel) > lim.half) {
    const edge = Math.sign(rel) * lim.half;
    if (a.inside) a.yaw = lim.yaw + edge;
    else {
      const step = LIMIT_EASE * dt;
      const d = edge - rel;
      a.yaw = lim.yaw + rel + Math.max(-step, Math.min(step, d));
    }
  }
  if (!pitchOk) a.pitch = a.inside ? pmin : Math.min(pmin, a.pitch + LIMIT_EASE * dt);
  a.inside = Math.abs(wrapAngle(a.yaw - lim.yaw)) <= lim.half + 1e-6 && a.pitch >= pmin - 1e-6;
}
