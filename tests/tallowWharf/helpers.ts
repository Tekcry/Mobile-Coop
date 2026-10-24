/**
 * Tallow Wharf test helpers (mission-framework GB0, shared by GB1-GB5; frozen after GB0): the graph, the built map, the
 * solid pieces, the leg-up / climb-up / throw / pull / rope replicas of `TeamController`'s checks (analytic casts over the collision
 * boxes in place of Havok's), and the guards' nav grid with the bolted / shuttered doors shut. Every number is read from the
 * game's tables, never retuned.
 */
import { readFileSync } from 'node:fs';
import type { Vector3 } from '../../src/core/babylon';
import { findJumpTarget, generateLedges, LEDGE, type Ledge, type TraversalAnchors } from '../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../src/world/levelBuilder';
import type { MapLayout } from '../../src/world/mapDef';
import { MOVEMENT, TEAM } from '../../src/config/movement';
import { hyp2 } from '../../src/core/mathx';
import { ropeRoom, throwArc, throwLanding, throwLandingOk, throwRoom, type RopeRoom, type ThrowRoom } from '../../src/game/teamMoves';
import { PULL, pullBand, type PullBand } from '../../src/game/kit/pullUp';
import { tallowWharf } from '../../src/world/maps/tallowWharf';
import type { CoopLip } from '../../src/world/maps/ctcourseGreybox';
import type { NavGrid } from '../../src/ai/navGrid';
import type { WharfPull, WharfRope, WharfThrow } from '../../src/world/maps/tallowWharfKit';
import { runtimeNav } from '../helpers/runtimeNav';

export { soloJumpThreats } from '../helpers/soloJumpReach';
export { COOP_BAND, GREY_KEEP_CLEAR } from '../../src/world/maps/ctcourseGreybox';

// ---- the graph ----

export interface GraphSpace {
  id: string;
  section: string;
  type: string;
  room_class: string;
  function: string;
  /** The walking surface's feet height. */
  storey: number;
  size: [number, number, number];
  /** Plan boxes [x0, z0, x1, z1]. */
  area: [number, number, number, number][];
  tension: number;
  tags: string[];
  note: string;
}
export interface GraphLink {
  from: string;
  to: string;
  kind: string;
  route: string;
  width: number;
  height: number;
  length: number;
  at: [number, number, number];
  reason: string;
  [k: string]: unknown;
}
export interface Graph {
  meta: {
    map: string;
    bounds: [number, number, number, number];
    sections: string[];
    section_info: Record<string, { name: string; box: [number, number, number, number]; entry: string; exit: string; choke: string; forced_coop: string[] }>;
    [k: string]: unknown;
  };
  spaces: GraphSpace[];
  links: GraphLink[];
}

export const GRAPH = JSON.parse(readFileSync(new URL('../../docs/missions/prototypes/campaign-map/graph.json', import.meta.url), 'utf8')) as Graph;

/** One graph space by id (throws when the id is not in the graph). */
export function space(id: string): GraphSpace {
  const s = GRAPH.spaces.find((p) => p.id === id);
  if (!s) throw new Error(`graph space ${id} not found`);
  return s;
}
/** The graph's spaces of a section ('W1'..'W4'). */
export const spacesIn = (section: string): GraphSpace[] => GRAPH.spaces.filter((s) => s.section === section);
/** The graph's links of a kind ('opening', 'door', 'coop_boost', ...). */
export const linksOf = (kind: string): GraphLink[] => GRAPH.links.filter((l) => l.kind === kind);

// ---- the built map ----

let cache: { b: LevelBuilder; layout: MapLayout } | null = null;
/** The map built once into a fresh builder (cached): `tallowWharf.build(b, 0)`. */
export function builtWharf(): { b: LevelBuilder; layout: MapLayout } {
  if (!cache) {
    const b = new LevelBuilder();
    cache = { b, layout: tallowWharf.build(b, 0) };
  }
  return cache;
}

/** The collision pieces that are plain (unturned) boxes: what the jump and cast helpers read. */
export function solidOf(b: LevelBuilder): BoxPiece[] {
  return b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
}

const anchorCache = new WeakMap<LevelBuilder, TraversalAnchors>();
/** The anchors the game builds over the whole map plus the manual ledges (cached: `generateLedges` adds to `b.anchors`). */
export function anchorsOf(b: LevelBuilder): TraversalAnchors {
  let a = anchorCache.get(b);
  if (!a) anchorCache.set(b, (a = generateLedges(b.boxes, b.anchors)));
  return a;
}

// ---- boxes and casts ----

const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;

/** The solid pieces in a body's height band whose plan footprint is within `r` of (x, z): descriptions, empty when the spot is clear. */
export function blockedAt(solid: readonly BoxPiece[], x: number, z: number, r = MOVEMENT.radius, y = 0): string[] {
  return solid
    .filter((p) => bottom(p) < y + 1.7 && top(p) > y + 0.15)
    .filter((p) => hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r)
    .map((p) => `box (${p.c.map((v) => v.toFixed(2)).join(', ')}) size (${p.s.map((v) => v.toFixed(2)).join(', ')})`);
}

/** Does the segment (a -> b) hit a piece? A start inside a piece misses it, as Havok's ray does. */
function segmentHits(solid: readonly BoxPiece[], ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  for (const p of solid) {
    const h0 = p.s[0] / 2;
    const h1 = p.s[1] / 2;
    const h2 = p.s[2] / 2;
    const o = [ax - p.c[0], ay - p.c[1], az - p.c[2]];
    if (Math.abs(o[0]!) < h0 && Math.abs(o[1]!) < h1 && Math.abs(o[2]!) < h2) continue;
    const d = [dx, dy, dz];
    const h = [h0, h1, h2];
    let t0 = 0;
    let t1 = 1;
    let miss = false;
    for (let k = 0; k < 3; k++) {
      if (Math.abs(d[k]!) < 1e-12) {
        if (Math.abs(o[k]!) > h[k]!) {
          miss = true;
          break;
        }
        continue;
      }
      let ta = (-h[k]! - o[k]!) / d[k]!;
      let tb = (h[k]! - o[k]!) / d[k]!;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      if (t0 > t1) {
        miss = true;
        break;
      }
    }
    if (!miss) return true;
  }
  return false;
}

/** A ray straight down from (x, yFrom, z) to yTo: the highest top it meets (NaN = none). A piece the start is inside is missed. */
export function downHit(solid: readonly BoxPiece[], x: number, yFrom: number, z: number, yTo: number): number {
  let best = NaN;
  for (const p of solid) {
    if (Math.abs(x - p.c[0]) >= p.s[0] / 2 || Math.abs(z - p.c[2]) >= p.s[2] / 2) continue;
    const t = top(p);
    if (yFrom > t && t >= yTo && !(best >= t)) best = t;
  }
  return best;
}

// ---- the leg-up (co-op boost) ----

/** The boost's toss apex from a booster's mark (the existing map tests' search: `findJumpTarget` up to 2.2 m, cos 0.2). */
export function legUpTarget(anchors: TraversalAnchors, spot: { x: number; y: number; z: number }, facing: { x: number; z: number }) {
  return findJumpTarget(anchors, { x: spot.x, y: spot.y + TEAM.boostMax - 1.15, z: spot.z }, -1, facing.x, facing.z, 1, 2.2, 0.2);
}

/**
 * Room for the booster at their mark: no solid in the body band at +-`TEAM.roomSide` beside the spot (across `facing`), and
 * nothing over it under `TEAM.roomUp`.
 */
export function roomForBoost(solid: readonly BoxPiece[], spot: { x: number; y: number; z: number }, facing: { x: number; z: number }): boolean {
  for (const s of [-TEAM.roomSide, TEAM.roomSide]) {
    if (blockedAt(solid, spot.x - facing.z * s, spot.z + facing.x * s, MOVEMENT.radius, spot.y).length > 0) return false;
  }
  return !solid.some((p) => top(p) > spot.y + 0.15 && bottom(p) < spot.y + TEAM.roomUp && Math.abs(p.c[0] - spot.x) < p.s[0] / 2 && Math.abs(p.c[2] - spot.z) < p.s[2] / 2);
}

/** A generated ledge lies along a planned lip: on its line, facing the same way, inside its run (0.3 m slack). */
export function onPlannedLip(l: Ledge, lips: readonly CoopLip[]): boolean {
  return lips.some((p) => {
    if (Math.abs(l.top - p.y) > 1e-3 || l.nx * p.n.x + l.nz * p.n.z < 0.99) return false;
    const dx = p.b.x - p.a.x;
    const dz = p.b.z - p.a.z;
    const len = hyp2(dx, dz);
    for (const q of [l.a, l.b]) {
      const s = ((q.x - p.a.x) * dx + (q.z - p.a.z) * dz) / len;
      const off = Math.abs((q.x - p.a.x) * dz - (q.z - p.a.z) * dx) / len;
      if (off > 0.05 || s < -0.3 || s > len + 0.3) return false;
    }
    return true;
  });
}

/**
 * `AttachController.climbRoom` (`attachController.ts:1057`) analytically: the climb-up off a lip needs a standing body's room
 * (`roomAt`: `MOVEMENT.standHeight` 1.75 m free over the lip top) just inside the face. The game probes 0.45 m in (the hang
 * point `HANG.out` out, then `HANG.out + 0.45` back); this checks every depth up to 0.67 m in (the `warehouseCoopS3.test.ts:105`
 * precedent), at the lip's ends (clamped by `LEDGE.edgeMargin`, as `hangPoint` clamps) and its middle. Returns the blocked
 * samples: empty when the climb-up has room.
 */
export function climbRoom(solid: readonly BoxPiece[], lip: { y: number; a: { x: number; z: number }; b: { x: number; z: number }; n: { x: number; z: number } }): string[] {
  const dx = lip.b.x - lip.a.x;
  const dz = lip.b.z - lip.a.z;
  const len = hyp2(dx, dz);
  const m = Math.min(LEDGE.edgeMargin, len / 2);
  const y0 = lip.y + 0.1;
  const y1 = lip.y + 0.05 + MOVEMENT.standHeight;
  const out: string[] = [];
  for (const s of [m, len / 2, len - m]) {
    for (const d of [0.05, 0.25, 0.45, 0.67]) {
      const x = lip.a.x + (dx / len) * s - lip.n.x * d;
      const z = lip.a.z + (dz / len) * s - lip.n.z * d;
      const hit = solid.find((p) => bottom(p) < y1 && top(p) > y0 && Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);
      if (hit) out.push(`(${x.toFixed(2)}, ${z.toFixed(2)}) ${d} in: box (${hit.c.map((v) => v.toFixed(2)).join(', ')}) y ${bottom(hit).toFixed(2)}-${top(hit).toFixed(2)}`);
    }
  }
  return out;
}

// ---- the partner throw ----

export interface ThrowReport {
  land: { x: number; z: number; dx: number; dz: number };
  /** The host's bound on the landing: `throwLandingOk` with the landing floor found (false when there is none). */
  ok: boolean;
  /** The landing floor's height (NaN = no floor found). */
  floorY: number;
  /** Free air over the landing (m, up to 1.8). */
  head: number;
  /** Nothing solid along the 8 legs of the arc at the feet (+0.3) and the head (+1.6). */
  arcClear: boolean;
  /** Free air over the standing thrower: nothing solid from y + 1.0 to y + 1.0 + `TEAM.throwUp`. */
  upClear: boolean;
  /** `throwRoom` of the above: 'ok' lets the throw go. */
  room: ThrowRoom;
}

/** Replicates `TeamController.requestThrow` (`teamController.ts:939-960`) and `throwRoomUp` (`:927`) analytically. */
export function throwCheck(solid: readonly BoxPiece[], t: WharfThrow): ThrowReport {
  const { thrower, runner } = t;
  const out = { x: 0, z: 0, dx: 0, dz: 0 };
  const l = throwLanding(runner.x, runner.z, thrower.x, thrower.z, 0, out);
  const by = thrower.y;
  const floorY = downHit(solid, l.x, by + TEAM.throwDrop + 1.6, l.z, by - TEAM.throwDrop - 0.2);
  const found = Number.isFinite(floorY);
  let head = 0;
  if (found) {
    const y0 = floorY + 0.1;
    head = firstUp(solid, l.x, y0, l.z, 1.8);
  }
  let arcClear = found;
  const y1 = found ? floorY : by;
  const pa = { x: 0, y: 0, z: 0 };
  const pb = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < 8 && arcClear; i++) {
    for (const off of [0.3, 1.6]) {
      throwArc((i / 8) * TEAM.throwTime, runner.x, runner.y, runner.z, l.x, y1, l.z, pa);
      throwArc(((i + 1) / 8) * TEAM.throwTime, runner.x, runner.y, runner.z, l.x, y1, l.z, pb);
      if (segmentHits(solid, pa.x, pa.y + off, pa.z, pb.x, pb.y + off, pb.z)) {
        arcClear = false;
        break;
      }
    }
  }
  const upClear = !segmentHits(solid, thrower.x, thrower.y + 1.0, thrower.z, thrower.x, thrower.y + 1.0 + TEAM.throwUp, thrower.z);
  return {
    land: { x: l.x, z: l.z, dx: l.dx, dz: l.dz },
    ok: found && throwLandingOk(thrower.x, thrower.y, thrower.z, l.x, floorY, l.z),
    floorY,
    head,
    arcClear,
    upClear,
    room: throwRoom(arcClear, floorY - by, head),
  };
}

/** The distance up from (x, y, z) to the nearest solid underside within `max` (an upward ray; `max` when none). */
function firstUp(solid: readonly BoxPiece[], x: number, y: number, z: number, max: number): number {
  let best = max;
  for (const p of solid) {
    if (Math.abs(x - p.c[0]) >= p.s[0] / 2 || Math.abs(z - p.c[2]) >= p.s[2] / 2) continue;
    const lo = bottom(p);
    if (lo >= y && lo - y < best && top(p) > y) best = lo - y;
  }
  return best;
}

// ---- the pull-up and the rope: the edge ----

/** `TeamController.hangPoint` (`teamController.ts:609-640`) analytically: a drop `TEAM.hangProbe` m ahead of a player at (x, y, z) facing `yaw`. */
export function hangPointAt(solid: readonly BoxPiece[], x: number, y: number, z: number, yaw: number): { x: number; z: number; floorY: number } | null {
  const dx = Math.sin(yaw);
  const dz = Math.cos(yaw);
  for (let d = 0.4; d <= TEAM.hangProbe + 1e-3; d += 0.3) {
    const px = x + dx * d;
    const pz = z + dz * d;
    if (segmentHits(solid, x, y + 0.5, z, px, y + 0.5, pz)) return null;
    if (Number.isFinite(downHit(solid, px, y + 0.5, pz, y - TEAM.hangDrop))) continue;
    // over the drop: a little further in when that is still clear (the middle of a hatch)
    let hx = px + dx * 0.15;
    let hz = pz + dz * 0.15;
    if (Number.isFinite(downHit(solid, hx, y + 0.5, hz, y - TEAM.hangDrop))) {
      hx = px;
      hz = pz;
    }
    return { x: hx, z: hz, floorY: downHit(solid, hx, y - 0.2, hz, y - 30) };
  }
  return null;
}

export interface PullReport {
  band: PullBand;
  /** The hang point the holder's edge gives (null: no drop there). */
  hang: { x: number; z: number; floorY: number } | null;
  /** The catch point is within `PULL.reach` of the partner in plan. */
  partnerReach: boolean;
  /** `hangPointOk`: the catch point is within `TEAM.hangProbe` + 0.6 of the holder and at their floor. */
  holderOk: boolean;
  ok: boolean;
}

/** The pull-up's checks: the lip band (`pullBand`), then the holder's edge as `hangPoint` finds it and the two reaches. */
export function pullCheck(solid: readonly BoxPiece[], p: WharfPull): PullReport {
  const band = pullBand(p.holder.y - p.partner.y);
  const hang = hangPointAt(solid, p.holder.x, p.holder.y, p.holder.z, p.yaw);
  const partnerReach = hang !== null && hyp2(hang.x - p.partner.x, hang.z - p.partner.z) <= PULL.reach;
  const holderOk = hang !== null && hyp2(hang.x - p.holder.x, hang.z - p.holder.z) <= TEAM.hangProbe + 0.6;
  return { band, hang, partnerReach, holderOk, ok: band === 'ok' && hang !== null && partnerReach && holderOk };
}

export interface RopeReport {
  room: RopeRoom;
  /** The climber's foot is within `TEAM.ropeReach` of the holder in plan. */
  reach: boolean;
  hang: { x: number; z: number; floorY: number } | null;
  ok: boolean;
}

/** The rope's checks: `ropeRoom` over the drop, the foot within `TEAM.ropeReach` of the holder, and the same edge test as the pull. */
export function ropeCheck(solid: readonly BoxPiece[], r: WharfRope): RopeReport {
  const room = ropeRoom(r.holder.y, r.foot.y);
  const reach = hyp2(r.foot.x - r.holder.x, r.foot.z - r.holder.z) <= TEAM.ropeReach;
  const hang = hangPointAt(solid, r.holder.x, r.holder.y, r.holder.z, r.yaw);
  return { room, reach, hang, ok: room === 'ok' && reach && hang !== null };
}

// ---- the guards' nav with doors shut ----

/** A door (or shutter) a solo run cannot pass: its plan centre, floor, width, and whether its wall runs along x (the plane is z = at[1]). */
export interface ShutDoor {
  at: [number, number];
  y: number;
  w: number;
  alongX: boolean;
}

/**
 * The runtime nav grid (`runtimeNav`: doors are open there) with every cell within 0.6 m of a listed door's plane, along its
 * width, on its floor, set unwalkable (the pattern of `campusS2.test.ts:722-735`). `restore()` puts them back.
 */
export function soloNav(b: LevelBuilder, layers: number, seeds: readonly Vector3[], shut: readonly ShutDoor[]): { nav: NavGrid; restore: () => void } {
  const nav = runtimeNav(b, seeds[0]!, layers, seeds);
  const closed: number[] = [];
  for (let i = 0; i < nav.walk.length; i++) {
    if (!nav.walk[i]) continue;
    const [cx, cz] = nav.center(i % nav.cols);
    const h = nav.height[i]!;
    for (const d of shut) {
      if (Math.abs(h - d.y) > 1.0) continue;
      const across = d.alongX ? Math.abs(cz - d.at[1]) : Math.abs(cx - d.at[0]);
      const along = d.alongX ? Math.abs(cx - d.at[0]) : Math.abs(cz - d.at[1]);
      if (across <= 0.6 && along <= d.w / 2) {
        closed.push(i);
        nav.walk[i] = 0;
        break;
      }
    }
  }
  return {
    nav,
    restore: () => {
      for (const i of closed) nav.walk[i] = 1;
    },
  };
}
