/**
 * (sector-fixes-r fix) How far across a player alone carries a running jump onto a co-op lip or pipe, from the game's
 * own constants: the manual jump (`LEAP`: take-off `vy`, the run's pace carried, capped), gravity (`GRAVITY`, the
 * controller adds it each step; air control is 5 %, so the pace holds), the top gear (`GEARS.stand`, the spawn gear) and
 * the in-air grab (`FALL_GRAB`, `AttachController.fallProbe`: a lip / pipe `minAbove`-`maxAbove` over the falling
 * feet within `plan` of the body, taken on its own after a jump).
 *
 * A top at `T` reaches a grip at `lip` when the jump's apex lifts the feet to `lip - maxAbove` or higher; it is then
 * caught up to `plan + speed * t` across, where `t` is the last time the feet are still at or over `lip - maxAbove`.
 * The body's radius is added: the feet leave the top up to a radius past its edge.
 */
import { FALL_GRAB, GEARS, LEAP, MOVEMENT } from '../../src/config/movement';
import { GRAVITY } from '../../src/physics/havok';
import { LEDGE } from '../../src/world/anchors';
import type { BoxPiece } from '../../src/world/levelBuilder';
import { hyp2 } from '../../src/core/mathx';
import facts from '../../scripts/kestrel/facts.json';

/** The fastest a player alone runs (m/s): the top gear, carried into the jump up to `LEAP.maxSpeed`. */
export const SOLO_TOP_SPEED = Math.min(LEAP.maxSpeed, Math.max(...GEARS.stand) * LEAP.carry);
const G = -GRAVITY.y;
/** The manual jump's rise over the take-off (m). */
export const LEAP_APEX = (LEAP.vy * LEAP.vy) / (2 * G);

/** The last time (s) after a jump off a top at `from` that the feet are still at or over `y`; null if they never get there. */
export function lastTimeAtOrOver(from: number, y: number): number | null {
  // from + vy t - G t^2 / 2 = y
  const disc = LEAP.vy * LEAP.vy - 2 * G * (y - from);
  if (disc < 0) return null;
  return (LEAP.vy + Math.sqrt(disc)) / G;
}

/**
 * The plan gap (m) from a top at height `from` that a running jump closes onto a grip at `lip` (a lip's top or a pipe's
 * hang height), or 0 when the jump never lifts the feet into the grab window.
 */
export function soloJumpReach(from: number, lip: number): number {
  const t = lastTimeAtOrOver(from, lip - FALL_GRAB.maxAbove);
  if (t === null) return 0;
  return FALL_GRAB.plan + SOLO_TOP_SPEED * t + MOVEMENT.radius;
}

/** A co-op grip: a lip (its outward normal `n`; only a body on that side takes it) or a pipe (`n` absent), a -> b at `y`. */
export interface CoopGrip {
  y: number;
  a: { x: number; z: number };
  b: { x: number; z: number };
  n?: { x: number; z: number };
}

/** The game's mantle reach (scripts/kestrel/facts.json, F04): a `noLedge` top over it cannot be climbed onto alone. */
export const MANTLE = facts.traverse.mantleMax.value;

const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
/** (x, y, z) inside the piece, or within `r` of it in plan. */
const inside = (p: BoxPiece, x: number, y: number, z: number, r = 0): boolean =>
  Math.abs(x - p.c[0]) < p.s[0] / 2 + r && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2 + r;
/** The body column a spot needs clear (most of `MOVEMENT.radius`: a sliver beside a wall is no place to stand). */
const BODY = MOVEMENT.radius * 0.8;
/** The nearest point of segment a -> b to (x, z), and the plan distance. */
const nearestOn = (g: CoopGrip, x: number, z: number): { x: number; z: number; d: number } => {
  const dx = g.b.x - g.a.x;
  const dz = g.b.z - g.a.z;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - g.a.x) * dx + (z - g.a.z) * dz) / l2)) : 0;
  const qx = g.a.x + dx * t;
  const qz = g.a.z + dz * t;
  return { x: qx, z: qz, d: hyp2(x - qx, z - qz) };
};

/**
 * The solo-standable tops (of `solid`, axis-aligned collision pieces) a top-gear running jump off which reaches the grip:
 * a top over 0.3 m and under the grip, wide enough to stand on (`LEDGE.climbDepth`), not a `noLedge` piece over the mantle
 * (nothing to climb it by), with crouch room over the spot it jumps from, on the lip's outer side, and with nothing solid
 * on the straight line from there to under the grip. A top is reported when that spot is within `soloJumpReach` of the
 * grip in plan. `skip` leaves out tops a route plans as a solo way on from above (LD A2: co-op-only from the floor it
 * starts on). (sector-fixes-r e2e fix) `extra` (m) is added to a reach over 0: the margin the grip must clear it by.
 */
export function soloJumpThreats(solid: readonly BoxPiece[], g: CoopGrip, skip: (p: BoxPiece) => boolean = () => false, extra = 0): string[] {
  const out: string[] = [];
  for (const p of solid) {
    const t = top(p);
    if (t <= 0.3 || t >= g.y - 0.05 || skip(p)) continue;
    if (Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth) continue;
    if (p.noLedge && t > MANTLE) continue;
    const reach0 = soloJumpReach(t, g.y);
    const reach = reach0 > 0 ? reach0 + extra : 0;
    if (reach <= 0) continue;
    // broad phase: the footprint's centre within reach plus its half diagonal of the grip
    const half = hyp2(p.s[0], p.s[2]) / 2;
    if (nearestOn(g, p.c[0], p.c[2]).d > reach + half) continue;
    const r0 = half + reach + 1;
    const near = solid.filter((o) => o !== p && hyp2(o.c[0] - p.c[0], o.c[2] - p.c[2]) < r0 + hyp2(o.s[0], o.s[2]) / 2);
    let best: { x: number; z: number; d: number } | null = null;
    const nx = Math.max(1, Math.ceil(p.s[0] / 0.2));
    const nz = Math.max(1, Math.ceil(p.s[2] / 0.2));
    for (let i = 0; i <= nx; i++)
      for (let k = 0; k <= nz; k++) {
        const x = p.c[0] - p.s[0] / 2 + Math.min(p.s[0] - 0.01, Math.max(0.01, (p.s[0] * i) / nx));
        const z = p.c[2] - p.s[2] / 2 + Math.min(p.s[2] - 0.01, Math.max(0.01, (p.s[2] * k) / nz));
        const q = nearestOn(g, x, z);
        if (q.d >= reach || (best && q.d >= best.d)) continue;
        if (g.n && (x - q.x) * g.n.x + (z - q.z) * g.n.z < -0.05) continue;
        // crouch room for the body over the spot (not under a slab or a wall's head, not a sliver against a wall)
        let room = true;
        for (let y = t + 0.05; y <= t + MOVEMENT.crouchHeight && room; y += 0.1) if (near.some((o) => inside(o, x, y, z, BODY))) room = false;
        if (!room) continue;
        // the flight: from the body over the spot to under the grip (just off a lip's face), nothing solid in the way
        const ex = q.x + (g.n ? g.n.x * 0.4 : 0);
        const ez = q.z + (g.n ? g.n.z * 0.4 : 0);
        let clear = true;
        for (let s = 1; s <= 20 && clear; s++) {
          const f = s / 20;
          const fx = x + (ex - x) * f;
          const fz = z + (ez - z) * f;
          const fy = t + 1.0 + (g.y - 1.2 - (t + 1.0)) * f;
          if (near.some((o) => inside(o, fx, fy, fz))) clear = false;
        }
        if (clear) best = { x, z, d: q.d };
      }
    if (best) out.push(`top ${t.toFixed(2)} at (${p.c[0]}, ${p.c[2]}): ${best.d.toFixed(2)} m from the grip at ${g.y}, a running jump reaches ${reach.toFixed(2)}`);
  }
  return out;
}

/**
 * (sector-fixes-r2 jump) Landing on a higher top: a running jump off a top at `from` lands on a top at `to` when the
 * capsule meets the far top's face with the feet still at or over `to - MOVEMENT.maxStep` (the controller steps up the
 * rest, `playerController` `maxStepHeight`). The plan gap (m) closed: the run's pace (`SOLO_TOP_SPEED`) times the last
 * time the feet are at or over that height, plus a radius past the take-off edge (the feet leave the top up to a radius
 * past it) and a radius to the far face (the capsule meets it a radius early). 0 when the jump never lifts the feet that
 * high. Conservative: the take-off at the very edge (a press within 0.75 m of it is a drop unless the stick points along
 * the edge, `TraversalController.probe`) and an air-borne step-up are both granted.
 */
export function soloTopLandingReach(from: number, to: number): number {
  const t = lastTimeAtOrOver(from, to - MOVEMENT.maxStep);
  if (t === null) return 0;
  return SOLO_TOP_SPEED * t + 2 * MOVEMENT.radius;
}

/** A co-op-only top: its plan box and height. */
export interface CoopTop {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  top: number;
}

/** Plan gap between a point and a top's footprint, and the footprint's nearest point. */
const nearestOnTop = (q: CoopTop, x: number, z: number): { x: number; z: number; d: number } => {
  const qx = Math.max(q.x0, Math.min(q.x1, x));
  const qz = Math.max(q.z0, Math.min(q.z1, z));
  return { x: qx, z: qz, d: hyp2(x - qx, z - qz) };
};

/**
 * (sector-fixes-r2 jump) The solo-standable tops (as `soloJumpThreats`: over 0.3 m and under the co-op top, deep enough to
 * stand on, not a `noLedge` piece over the mantle, crouch room over the take-off spot) a top-gear running jump off which
 * lands on the co-op top `q` (`soloTopLandingReach`), with nothing solid on the way at body height over the co-op top.
 * `skip` leaves out the co-op top's own pieces and planned solo ways on; `extra` (m) is the margin the gap must clear.
 */
export function soloTopLandingThreats(solid: readonly BoxPiece[], q: CoopTop, skip: (p: BoxPiece) => boolean = () => false, extra = 0): string[] {
  const out: string[] = [];
  const qcx = (q.x0 + q.x1) / 2;
  const qcz = (q.z0 + q.z1) / 2;
  for (const p of solid) {
    const t = top(p);
    if (t <= 0.3 || t >= q.top - 0.05 || skip(p)) continue;
    if (Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth) continue;
    if (p.noLedge && t > MANTLE) continue;
    const reach0 = soloTopLandingReach(t, q.top);
    if (reach0 <= 0) continue;
    const reach = reach0 + extra;
    // broad phase: the footprints' plan gap
    const gx = Math.max(0, Math.abs(p.c[0] - qcx) - p.s[0] / 2 - (q.x1 - q.x0) / 2);
    const gz = Math.max(0, Math.abs(p.c[2] - qcz) - p.s[2] / 2 - (q.z1 - q.z0) / 2);
    if (hyp2(gx, gz) >= reach) continue;
    const r0 = hyp2(p.s[0], p.s[2]) / 2 + reach + hyp2(q.x1 - q.x0, q.z1 - q.z0) + 1;
    const near = solid.filter((o) => o !== p && hyp2(o.c[0] - p.c[0], o.c[2] - p.c[2]) < r0 + hyp2(o.s[0], o.s[2]) / 2);
    let best: { x: number; z: number; d: number } | null = null;
    const nx = Math.max(1, Math.ceil(p.s[0] / 0.2));
    const nz = Math.max(1, Math.ceil(p.s[2] / 0.2));
    for (let i = 0; i <= nx; i++)
      for (let k = 0; k <= nz; k++) {
        const x = p.c[0] - p.s[0] / 2 + Math.min(p.s[0] - 0.01, Math.max(0.01, (p.s[0] * i) / nx));
        const z = p.c[2] - p.s[2] / 2 + Math.min(p.s[2] - 0.01, Math.max(0.01, (p.s[2] * k) / nz));
        const e = nearestOnTop(q, x, z);
        if (e.d >= reach || (best && e.d >= best.d)) continue;
        let room = true;
        for (let y = t + 0.05; y <= t + MOVEMENT.crouchHeight && room; y += 0.1) if (near.some((o) => inside(o, x, y, z, BODY))) room = false;
        if (!room) continue;
        // the flight: over the co-op top's height (the feet arrive within the step of it), nothing solid in the way
        let clear = true;
        for (let s = 1; s <= 20 && clear; s++) {
          const f = s / 20;
          const fx = x + (e.x - x) * f;
          const fz = z + (e.z - z) * f;
          for (const dy of [0.1, 0.5, 0.9]) if (near.some((o) => inside(o, fx, q.top + dy, fz))) clear = false;
        }
        if (clear) best = { x, z, d: e.d };
      }
    if (best) out.push(`top ${t.toFixed(2)} at (${p.c[0]}, ${p.c[2]}): ${best.d.toFixed(2)} m from the co-op top at ${q.top}, a running jump lands up to ${reach.toFixed(2)}`);
  }
  return out;
}
