/**
 * (sector-redesign LR16c) Lamp placement audit and showcase framing audit, pure (no Babylon, no DOM). Offline only:
 * `scripts/lamp-audit.mjs` runs it on every map in the LR16 plan; LR16d moves lamps strictly from its table.
 *
 * Lamp audit (LR16 plan, "Per-map lamp audit (LR16c)"): a wall close to a lamp sits in the photometric near plateau
 * (`PHOTO.near` 1 m), where the hard cone cut draws a bright arc on it (plan, "Diagnosis of the wall arcs"). For each
 * fixed lamp, 16 horizontal rays + 8 downward-tilted rays find the nearest wall face (its normal faces the lamp); a
 * lamp is flagged when that face is within `WALL_NEAR` (1.0 m), a spot when its axis meets a wall within
 * `SPOT_AXIS_NEAR` (0.6 m). The proposed move keeps the lamp's height: push back along the wall's normal until the
 * face is `PUSH_TO` (1.2 m) away, else onto the room's centre line across that wall. A wall-mounted fitting
 * (bulkhead) ignores its own mounting wall and only slides along it.
 *
 * (LR16dx fix round, Michael: "Must be realistic depiction of light") A wall the lamp's light cannot reach cannot carry
 * its arc: the flag reads the nearer of the rule's limit and the lamp's reach (a dead fitting, reach 0, is never
 * flagged). A sign or indicator glow (`isEmissive`: a wall fitting with a small reach, or one the caller marks) is
 * never moved off its wall or door; when its glow reaches a face it gets a `dim` proposal (the reach that stops short of
 * the face). A move goes only as far as needed and never past the room's centre line (the smallest step from the push
 * to the centre line that clears), and never onto another lamp (`SPACING` in plan, `auditAll`).
 *
 * Framing audit (LR16-0 CT audit, LR16-2): from a grid of standing spots x 4 yaws, the light level on the floor / wall
 * points the player sees; shares lit (> `VIEW_LIT`), dim and dark (< `VIEW_DARK`); a view with no pool or no dark is
 * flagged. The level comes from a caller-supplied function (the real `LightField.levelAt` in the script).
 *
 * Read-only: nothing here changes a light.
 */
import { hyp2, hyp3 } from '../core/mathx';
import type { VoxelShape } from '../voxel/shapes';
import { PHOTO } from './lampMath';

// ---- lamp audit thresholds (m unless noted) -----------------------------------------------------------------------
/** Flag: a wall face within this of a lamp (the photometric near radius, `PHOTO.near`). */
export const WALL_NEAR = 1.0;
/** Flag: a spot whose axis meets a wall within this. */
export const SPOT_AXIS_NEAR = 0.6;
/** Move: push the lamp back until the face is this far (the plan's 1.2 m). */
export const PUSH_TO = 1.2;
/** Rays: horizontal ones, and downward-tilted ones at `DOWN_TILT` (rad) below the horizon. */
export const H_RAYS = 16;
export const DOWN_RAYS = 8;
export const DOWN_TILT = Math.PI / 4;
/** Longest ray of the wall scan (beyond `WALL_NEAR` / the push target, so the report shows the true nearest wall). */
export const SCAN_REACH = 3;
/** Longest ray of the centre-line scan (room span across the wall). */
export const SPAN_REACH = 40;
/** A face is a wall when |normal.y| is under this (floors, ceilings and slab undersides are not). */
export const WALL_NY = 0.5;
/** Mount: a ceiling underside within this over the light holds it (strip wires `MAX_HANGER` 0.6 + body). */
export const CEIL_ATTACH = 0.8;
/** Mount: a wall-mounted fitting's own wall lies within this behind it (`lampMount.ts` `WALL_GAP` 0.35 + slack). */
export const OWN_WALL = 0.45;
/** A moved light must stay this clear of every solid (half a bake cell: the bake grows occupancy by it). */
export const CLEAR = 0.1;
/** A wall fitting reaching no further than this is a sign / indicator glow (exit signs: radius 0.6 x 1.6 = 0.96 m). */
export const SIGN_REACH = 1.2;
/** A proposed spot keeps at least this from every other lamp in plan (same storey: within `SPACING_DY` in height), and
 *  when both fittings give their plan size (`AuditLamp.foot`), this gap between their bodies (a strip is 1.2 m long). */
export const SPACING = 1.0;
export const SPACING_DY = 1.0;
export const FIT_GAP = 0.3;
/** (LR16dx fix) A solid thinner than this in both plan axes (a post, a pipe, a hanger) paints no arc: not a wall face. */
export const THIN = 0.15;
/** The search step from the push toward the centre line, and the margin a dimmed sign's reach keeps off the face. */
export const STEP = 0.05;
export const DIM_MARGIN = 0.05;

// ---- framing audit thresholds ----------------------------------------------------------------------------------
/** Level above which a seen point is lit (a pool), below which it is dark (`LIGHT.shadow`). */
export const VIEW_LIT = 0.45;
export const VIEW_DARK = 0.28;
/** A view with a lit / dark share under this has "no pool" / "no dark". */
export const VIEW_MIN_SHARE = 0.05;
/** Standing spots: grid step, eye height, headroom needed over the floor. */
export const SPOT_STEP = 6;
export const EYE = 1.6;
export const HEADROOM = 1.9;
/** View rays: horizontal field (rad), pitch range (rad, down negative), grid, reach (m). */
export const VIEW_FOV = (70 * Math.PI) / 180;
export const VIEW_PITCH_LO = (-40 * Math.PI) / 180;
export const VIEW_PITCH_HI = (10 * Math.PI) / 180;
export const VIEW_COLS = 16;
export const VIEW_ROWS = 8;
export const VIEW_REACH = 25;
/** A view must see at least this many surface points to be judged (else it faces a wall point blank). */
export const VIEW_MIN_HITS = 24;

export type Rule = 'wall' | 'axis';
export type Mount = 'ceiling' | 'wall' | 'free';
export type MoveHow = 'push' | 'centre' | 'dim' | 'none';

/** One lamp as the audit reads it. */
export interface AuditLamp {
  id: number;
  x: number;
  y: number;
  z: number;
  /** Spots: unit axis; null: the lamp hemisphere (straight down). */
  cone: { dx: number; dy: number; dz: number } | null;
  /** `LightFixture.base` / `model` when given. */
  base?: 'ceiling' | 'wall';
  model?: string;
  /** A wall fitting's facing yaw (`LightFixture.yaw`, local +z away from the wall). */
  yaw?: number;
  /** The light's reach (m, `LightDef.radius`: the authored radius x `PHOTO.reach`); 0 = a dead fitting; unset = unknown. */
  reach?: number;
  /** A sign or indicator (an emissive wall fitting): never moved, only dimmed. */
  sign?: boolean;
  /** The fitting's plan size (x, z extent, m; `LightFixture.sx` / `sz`): two bodies keep `FIT_GAP` apart. */
  foot?: readonly [number, number];
}

export interface Hit {
  t: number;
  nx: number;
  ny: number;
  nz: number;
}

export interface LampMove {
  how: MoveHow;
  /** New light position (y unchanged), the plan step from the old one, and the nearest wall after it. */
  to: [number, number, number] | null;
  dx: number;
  dz: number;
  after: number;
  /** Ceiling gap over the new position (ceiling-mounted lamps), Infinity: none needed. */
  ceilGap: number;
  /** `dim`: the reach (m) that stops the glow short of the face, and that as an authored radius (reach / `PHOTO.reach`). */
  reach?: number;
  radius?: number;
  note: string;
}

export interface LampAudit {
  id: number;
  pos: [number, number, number];
  rule: Rule;
  mount: Mount;
  /** The measure the rule reads: the nearest wall (perpendicular, m), or the axis's wall distance for a spot. */
  dist: number;
  /** The face's outward normal (toward the lamp). */
  normal: [number, number, number] | null;
  /** The nearest wall by the 24-ray scan (every lamp, also spots; Infinity: none within `SCAN_REACH`). */
  nearWall: number;
  flagged: boolean;
  move: LampMove | null;
}

// ---- shapes and ray casting --------------------------------------------------------------------------------------

export interface Prepared {
  box: boolean;
  cx: number;
  cy: number;
  cz: number;
  hx: number;
  hy: number;
  hz: number;
  cyw: number;
  syw: number;
  cp: number;
  sp: number;
  lo: [number, number, number];
  hi: [number, number, number];
  /** Thinner than `THIN` in both plan axes (world bounds): the near-wall scan sees through it. */
  thin: boolean;
}

/** The shapes in an xz bucket grid for ray casting. */
export interface Scene {
  shapes: Prepared[];
  cell: number;
  x0: number;
  z0: number;
  nx: number;
  nz: number;
  cells: number[][];
  lo: [number, number, number];
  hi: [number, number, number];
}

const SCENE_CELL = 4;

/** Precompute the shapes' frames and world bounds (fill shapes only) and bucket them in plan. */
export function prepareScene(shapes: readonly VoxelShape[]): Scene {
  const out: Prepared[] = [];
  for (const s of shapes) {
    if (s.mode !== undefined && s.mode !== 0) continue;
    if (s.kind === 'cyl') {
      const hh = s.h / 2;
      out.push({ box: false, cx: s.c[0], cy: s.c[1], cz: s.c[2], hx: s.r, hy: hh, hz: s.r, cyw: 1, syw: 0, cp: 1, sp: 0, lo: [s.c[0] - s.r, s.c[1] - hh, s.c[2] - s.r], hi: [s.c[0] + s.r, s.c[1] + hh, s.c[2] + s.r], thin: 2 * s.r < THIN });
      continue;
    }
    const hx = s.s[0] / 2;
    const hy = s.s[1] / 2;
    const hz = s.s[2] / 2;
    const cyw = Math.cos(s.yaw);
    const syw = Math.sin(s.yaw);
    const cp = Math.cos(s.pitch);
    const sp = Math.sin(s.pitch);
    const ex = Math.abs(cyw) * hx + Math.abs(syw * sp) * hy + Math.abs(syw * cp) * hz;
    const ey = Math.abs(cp) * hy + Math.abs(sp) * hz;
    const ez = Math.abs(syw) * hx + Math.abs(cyw * sp) * hy + Math.abs(cyw * cp) * hz;
    out.push({ box: true, cx: s.c[0], cy: s.c[1], cz: s.c[2], hx, hy, hz, cyw, syw, cp, sp, lo: [s.c[0] - ex, s.c[1] - ey, s.c[2] - ez], hi: [s.c[0] + ex, s.c[1] + ey, s.c[2] + ez], thin: 2 * ex < THIN && 2 * ez < THIN });
  }
  const lo: [number, number, number] = [Infinity, Infinity, Infinity];
  const hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of out) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k]!, p.lo[k]!);
      hi[k] = Math.max(hi[k]!, p.hi[k]!);
    }
  }
  if (!out.length) {
    lo.fill(0);
    hi.fill(0);
  }
  const x0 = lo[0] - 1;
  const z0 = lo[2] - 1;
  const nx = Math.max(1, Math.ceil((hi[0] - x0 + 1) / SCENE_CELL));
  const nz = Math.max(1, Math.ceil((hi[2] - z0 + 1) / SCENE_CELL));
  const cells: number[][] = Array.from({ length: nx * nz }, () => []);
  out.forEach((p, i) => {
    const i0 = Math.max(0, Math.floor((p.lo[0] - x0) / SCENE_CELL));
    const i1 = Math.min(nx - 1, Math.floor((p.hi[0] - x0) / SCENE_CELL));
    const k0 = Math.max(0, Math.floor((p.lo[2] - z0) / SCENE_CELL));
    const k1 = Math.min(nz - 1, Math.floor((p.hi[2] - z0) / SCENE_CELL));
    for (let a = i0; a <= i1; a++) for (let c = k0; c <= k1; c++) cells[c * nx + a]!.push(i);
  });
  return { shapes: out, cell: SCENE_CELL, x0, z0, nx, nz, cells, lo, hi };
}

/** World -> box frame (undo yaw, then pitch). */
function toLocal(p: Prepared, x: number, y: number, z: number, o: number[]): void {
  const lx = x * p.cyw - z * p.syw;
  const az = x * p.syw + z * p.cyw;
  o[0] = lx;
  o[1] = y * p.cp + az * p.sp;
  o[2] = -y * p.sp + az * p.cp;
}
/** Box frame -> world. */
function toWorld(p: Prepared, lx: number, ly: number, lz: number, o: number[]): void {
  const az = ly * p.sp + lz * p.cp;
  o[1] = ly * p.cp - lz * p.sp;
  o[0] = lx * p.cyw + az * p.syw;
  o[2] = -lx * p.syw + az * p.cyw;
}

const tO = [0, 0, 0];
const tD = [0, 0, 0];
const tN = [0, 0, 0];

/** Distance from a point to a shape's surface (0 inside). */
function gap(p: Prepared, x: number, y: number, z: number): number {
  if (!p.box) return hyp2(Math.max(0, hyp2(x - p.cx, z - p.cz) - p.hx), Math.max(0, Math.abs(y - p.cy) - p.hy));
  toLocal(p, x - p.cx, y - p.cy, z - p.cz, tO);
  return hyp3(Math.max(0, Math.abs(tO[0]!) - p.hx), Math.max(0, Math.abs(tO[1]!) - p.hy), Math.max(0, Math.abs(tO[2]!) - p.hz));
}

/** Distance from a point to the nearest solid (0 inside one), searched within `r`. */
export function clearance(sc: Scene, x: number, y: number, z: number, r: number): number {
  let best = r;
  for (const i of bucketsNear(sc, x, z, r)) {
    const g = gap(sc.shapes[i]!, x, y, z);
    if (g < best) best = g;
  }
  return best;
}

function bucketsNear(sc: Scene, x: number, z: number, r: number): Set<number> {
  const out = new Set<number>();
  const i0 = Math.max(0, Math.floor((x - r - sc.x0) / sc.cell));
  const i1 = Math.min(sc.nx - 1, Math.floor((x + r - sc.x0) / sc.cell));
  const k0 = Math.max(0, Math.floor((z - r - sc.z0) / sc.cell));
  const k1 = Math.min(sc.nz - 1, Math.floor((z + r - sc.z0) / sc.cell));
  for (let a = i0; a <= i1; a++) for (let c = k0; c <= k1; c++) for (const s of sc.cells[c * sc.nx + a]!) out.add(s);
  return out;
}

/** Ray vs one shape: the entry distance and normal when under `best`, else null. Rays from inside a shape ignore it. */
function hitShape(p: Prepared, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, best: number): Hit | null {
  if (!p.box) {
    let bt = best;
    let n: [number, number, number] | null = null;
    const px = ox - p.cx;
    const pz = oz - p.cz;
    const inside = px * px + pz * pz < p.hx * p.hx && Math.abs(oy - p.cy) < p.hy;
    if (inside) return null;
    const a = dx * dx + dz * dz;
    if (a > 1e-12) {
      const b = px * dx + pz * dz;
      const c = px * px + pz * pz - p.hx * p.hx;
      const disc = b * b - a * c;
      if (c > 0 && disc >= 0) {
        const t = (-b - Math.sqrt(disc)) / a;
        const y = oy + dy * t - p.cy;
        if (t > 1e-6 && t < bt && Math.abs(y) <= p.hy) {
          bt = t;
          const hx = px + dx * t;
          const hz = pz + dz * t;
          const l = hyp2(hx, hz) || 1;
          n = [hx / l, 0, hz / l];
        }
      }
    }
    if (Math.abs(dy) > 1e-12) {
      for (const s of [1, -1]) {
        const cap = p.cy + s * p.hy;
        if ((oy - cap) * s <= 0) continue;
        const t = (cap - oy) / dy;
        if (t > 1e-6 && t < bt) {
          const hx = px + dx * t;
          const hz = pz + dz * t;
          if (hx * hx + hz * hz <= p.hx * p.hx) {
            bt = t;
            n = [0, s, 0];
          }
        }
      }
    }
    return n ? { t: bt, nx: n[0], ny: n[1], nz: n[2] } : null;
  }
  toLocal(p, ox - p.cx, oy - p.cy, oz - p.cz, tO);
  toLocal(p, dx, dy, dz, tD);
  const h = [p.hx, p.hy, p.hz];
  if (Math.abs(tO[0]!) < h[0]! && Math.abs(tO[1]!) < h[1]! && Math.abs(tO[2]!) < h[2]!) return null;
  let tn = -Infinity;
  let tf = Infinity;
  let axis = -1;
  let sign = 0;
  for (let k = 0; k < 3; k++) {
    const o = tO[k]!;
    const d = tD[k]!;
    const hk = h[k]!;
    if (Math.abs(d) < 1e-12) {
      if (o < -hk || o > hk) return null;
      continue;
    }
    let t1 = (-hk - o) / d;
    let t2 = (hk - o) / d;
    let s = -1;
    if (t1 > t2) {
      const q = t1;
      t1 = t2;
      t2 = q;
      s = 1;
    }
    if (t1 > tn) {
      tn = t1;
      axis = k;
      sign = s;
    }
    if (t2 < tf) tf = t2;
    if (tn > tf) return null;
  }
  if (axis < 0 || tn <= 1e-6 || tn >= best) return null;
  toWorld(p, axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0, tN);
  return { t: tn, nx: tN[0]!, ny: tN[1]!, nz: tN[2]! };
}

/** First hit of a ray (unit direction) within `tMax`, or null: a plan DDA over the buckets. `skipThin`: see through thin solids. */
export function cast(sc: Scene, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, tMax: number, skipThin = false): Hit | null {
  let best: Hit | null = null;
  let bt = tMax;
  const seen = new Set<number>();
  const c = sc.cell;
  let i = Math.floor((ox - sc.x0) / c);
  let k = Math.floor((oz - sc.z0) / c);
  const si = dx > 0 ? 1 : -1;
  const sk = dz > 0 ? 1 : -1;
  const tdi = Math.abs(dx) > 1e-12 ? c / Math.abs(dx) : Infinity;
  const tdk = Math.abs(dz) > 1e-12 ? c / Math.abs(dz) : Infinity;
  let ti = Math.abs(dx) > 1e-12 ? ((sc.x0 + (i + (si > 0 ? 1 : 0)) * c - ox) / dx) : Infinity;
  let tk = Math.abs(dz) > 1e-12 ? ((sc.z0 + (k + (sk > 0 ? 1 : 0)) * c - oz) / dz) : Infinity;
  let tEnter = 0;
  for (let guard = 0; guard < 4096; guard++) {
    if (i >= 0 && k >= 0 && i < sc.nx && k < sc.nz) {
      for (const s of sc.cells[k * sc.nx + i]!) {
        if (seen.has(s)) continue;
        seen.add(s);
        if (skipThin && sc.shapes[s]!.thin) continue;
        const h = hitShape(sc.shapes[s]!, ox, oy, oz, dx, dy, dz, bt);
        if (h) {
          best = h;
          bt = h.t;
        }
      }
    }
    const tExit = Math.min(ti, tk);
    if (bt <= tExit || tEnter > bt || tExit === Infinity) break;
    tEnter = tExit;
    if (ti < tk) {
      i += si;
      ti += tdi;
    } else {
      k += sk;
      tk += tdk;
    }
    // left the grid for good
    if ((i < 0 && si < 0) || (i >= sc.nx && si > 0) || (k < 0 && sk < 0) || (k >= sc.nz && sk > 0)) break;
  }
  return best;
}

// ---- lamp audit --------------------------------------------------------------------------------------------------

/** The 24 scan directions: `H_RAYS` horizontal, `DOWN_RAYS` tilted down by `DOWN_TILT`. */
export function scanDirs(): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < H_RAYS; i++) {
    const a = (i / H_RAYS) * 2 * Math.PI;
    out.push([Math.cos(a), 0, Math.sin(a)]);
  }
  const c = Math.cos(DOWN_TILT);
  const s = Math.sin(DOWN_TILT);
  for (let i = 0; i < DOWN_RAYS; i++) {
    const a = ((i + 0.5) / DOWN_RAYS) * 2 * Math.PI;
    out.push([Math.cos(a) * c, -s, Math.sin(a) * c]);
  }
  return out;
}
const DIRS = scanDirs();

interface Near {
  dist: number;
  n: [number, number, number] | null;
}

/**
 * The nearest wall face by the 24-ray scan: perpendicular distance (ray length x cos to the face normal) and the
 * normal. `skip` drops one face direction (a wall fitting's own wall: normal along its facing). (LR16dx) A face a
 * tilted ray finds below the light (a cabinet, a unit, a wall top) is as near as its top edge: the perpendicular
 * distance with the drop from the light to the solid's top there (`faceDrop`), so a low unit 1.5 m under a lamp is
 * not read as a wall at its plan distance (the near radius is 3D). (LR16dx fix) Thin solids (posts, pipes: under `THIN`
 * in both plan axes) are seen through: a 5 cm post paints no arc.
 */
export function nearestWall(sc: Scene, x: number, y: number, z: number, skip: [number, number] | null = null): Near {
  let dist = Infinity;
  let n: [number, number, number] | null = null;
  for (const [dx, dy, dz] of DIRS) {
    const h = cast(sc, x, y, z, dx, dy, dz, SCAN_REACH, true);
    if (!h || Math.abs(h.ny) >= WALL_NY) continue;
    const facing = -(dx * h.nx + dy * h.ny + dz * h.nz);
    if (facing <= 0) continue;
    const perp = h.t * facing;
    if (skip && h.nx * skip[0] + h.nz * skip[1] > 0.9 && perp < OWN_WALL) continue;
    const d = dy < 0 ? hyp2(perp, faceDrop(sc, x + dx * h.t - h.nx * 0.02, y, z + dz * h.t - h.nz * 0.02, y + dy * h.t)) : perp;
    if (d < dist) {
      dist = d;
      n = [h.nx, h.ny, h.nz];
    }
  }
  return { dist, n };
}

/**
 * The drop from height `y` to the top of the solid just behind a face hit at (`x`, `hitY`, `z`): 0 when the solid
 * (or another) stands at `y` there (a full-height wall), else the gap down to the first top under `y`.
 */
export function faceDrop(sc: Scene, x: number, y: number, z: number, hitY: number): number {
  if (clearance(sc, x, y, z, 0.01) < 0.005) return 0;
  const h = cast(sc, x, y, z, 0, -1, 0, y - hitY + 0.05);
  return h ? h.t : Math.max(0, y - hitY);
}

/** The ceiling underside over a point within `CEIL_ATTACH` (its gap), Infinity when none. */
export function ceilingGap(sc: Scene, x: number, y: number, z: number): number {
  const h = cast(sc, x, y, z, 0, 1, 0, CEIL_ATTACH);
  return h && h.ny < -0.5 ? h.t : Infinity;
}

/** A wall fitting's own-wall direction (the facing in plan) from its yaw: local +z = (sin yaw, cos yaw). */
function facingOf(l: AuditLamp): [number, number] | null {
  return l.base === 'wall' || l.model === 'bulkhead' ? [Math.sin(l.yaw ?? 0), Math.cos(l.yaw ?? 0)] : null;
}

/** A sign or indicator glow: a wall fitting the caller marks, or one whose reach is at most `SIGN_REACH`. */
export function isEmissive(l: AuditLamp): boolean {
  return (l.base === 'wall' || l.model === 'bulkhead') && (!!l.sign || (l.reach !== undefined && l.reach <= SIGN_REACH));
}

/** The rule's measure at a position: nearest wall (lamps) or the axis's wall distance (spots). */
function measure(sc: Scene, l: AuditLamp, x: number, y: number, z: number, skip: [number, number] | null): Near & { near: number } {
  const nw = nearestWall(sc, x, y, z, skip);
  if (!l.cone) return { ...nw, near: nw.dist };
  const h = cast(sc, x, y, z, l.cone.dx, l.cone.dy, l.cone.dz, SCAN_REACH);
  if (!h || Math.abs(h.ny) >= WALL_NY) return { dist: Infinity, n: null, near: nw.dist };
  return { dist: h.t, n: [h.nx, h.ny, h.nz], near: nw.dist };
}

const r2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * Audit one lamp: the rule, the measure, and a move when flagged. `others`: every other lamp (a moved one at its
 * target), which a move keeps `SPACING` (and `FIT_GAP` body to body) from.
 */
export function auditLamp(sc: Scene, l: AuditLamp, others: readonly AuditLamp[] = []): LampAudit {
  const rule: Rule = l.cone ? 'axis' : 'wall';
  // a face beyond the light's reach is never lit by it (a dead fitting: reach 0)
  const limit = Math.min(l.cone ? SPOT_AXIS_NEAR : WALL_NEAR, l.reach ?? Infinity);
  const skip = facingOf(l);
  const ceil0 = ceilingGap(sc, l.x, l.y, l.z);
  const mount: Mount = skip ? 'wall' : l.base === 'ceiling' || Number.isFinite(ceil0) ? 'ceiling' : 'free';
  const m = measure(sc, l, l.x, l.y, l.z, skip);
  const res: LampAudit = { id: l.id, pos: [l.x, l.y, l.z], rule, mount, dist: m.dist, normal: m.n, nearWall: m.near, flagged: m.dist < limit, move: null };
  if (!res.flagged || !m.n) return res;
  if (isEmissive(l)) {
    // a sign stays on its wall (over its door): cut its glow short of the face instead
    const reach = Math.max(0, Math.floor((m.dist - DIM_MARGIN) / STEP) * STEP);
    const radius = Math.floor(reach / PHOTO.reach / STEP) * STEP;
    res.move = { how: 'dim', to: null, dx: 0, dz: 0, after: m.dist, ceilGap: ceil0, reach: r2(reach), radius: r2(radius), note: `sign / indicator: stays on its wall; radius <= ${radius.toFixed(2)} (reach ${reach.toFixed(2)} m) or less output` };
    return res;
  }

  // plan direction of the push: the face normal; a wall fitting slides along its own wall only
  let px = m.n[0];
  let pz = m.n[2];
  if (skip) {
    const d = px * skip[0] + pz * skip[1];
    px -= d * skip[0];
    pz -= d * skip[1];
  }
  const pl = hyp2(px, pz);
  if (pl < 1e-3) {
    res.move = { how: 'none', to: null, dx: 0, dz: 0, after: m.dist, ceilGap: ceil0, note: 'the face is in front of the wall fitting (no slide along its wall clears it): re-site by hand' };
    return res;
  }
  px /= pl;
  pz /= pl;
  // how far the measure grows per metre of push
  const n = m.n;
  const gain = l.cone ? (px * n[0] + pz * n[2]) / Math.max(1e-3, -(l.cone.dx * n[0] + l.cone.dy * n[1] + l.cone.dz * n[2])) : px * n[0] + pz * n[2];
  // a moved light keeps at least its old clearance (a wall fitting already sits within `CLEAR` of its wall)
  const clear0 = Math.min(CLEAR, clearance(sc, l.x, l.y, l.z, 1)) - 0.005;
  /** A wall fitting still has a wall behind it (within `OWN_WALL`, against its facing). */
  const ownWall = (x: number, z: number): boolean => !!skip && !!cast(sc, x, l.y, z, -skip[0], 0, -skip[1], OWN_WALL);
  // the centre line across the wall (between it and the face opposite): no move goes past it
  const back = cast(sc, l.x, l.y, l.z, -px, 0, -pz, SPAN_REACH);
  const fore = cast(sc, l.x, l.y, l.z, px, 0, pz, SPAN_REACH);
  const mid = back && fore ? (fore.t - back.t) / 2 : Infinity;
  const crowd = (x: number, z: number): boolean => others.some((o) => crowds(l, x, z, o));
  const check = (x: number, z: number, step: number): { ok: boolean; after: number; ceil: number; why: string } => {
    const after = measure(sc, l, x, l.y, z, skip).dist;
    const ceil = ceilingGap(sc, x, l.y, z);
    if (mid > 0 && step > mid + 1e-3) return { ok: false, after, ceil, why: 'past the centre line' };
    const blocked = cast(sc, l.x, l.y, l.z, px * Math.sign(step), 0, pz * Math.sign(step), Math.abs(step));
    if (blocked) return { ok: false, after, ceil, why: 'a solid in the way' };
    if (clearance(sc, x, l.y, z, 1) < clear0) return { ok: false, after, ceil, why: 'lands in a solid' };
    if (mount === 'ceiling' && !Number.isFinite(ceil)) return { ok: false, after, ceil, why: 'no ceiling over it' };
    if (skip && !ownWall(x, z)) return { ok: false, after, ceil, why: 'off the end of its wall' };
    if (after < limit) return { ok: false, after, ceil, why: `still ${after.toFixed(2)} m` };
    if (crowd(x, z)) return { ok: false, after, ceil, why: 'on another lamp' };
    return { ok: true, after, ceil, why: '' };
  };
  const mk = (how: MoveHow, step: number, c: { after: number; ceil: number }, note: string): LampMove => {
    const x = r2(l.x + px * step);
    const z = r2(l.z + pz * step);
    return { how, to: [x, r2(l.y), z], dx: r2(x - l.x), dz: r2(z - l.z), after: c.after, ceilGap: c.ceil, note };
  };
  // A: push back to PUSH_TO
  const push = Math.max(0.01, (PUSH_TO - m.dist) * (gain > 1e-3 ? 1 / gain : 1));
  const a = check(l.x + px * push, l.z + pz * push, push);
  if (a.ok) {
    res.move = mk('push', push, a, '');
    return res;
  }
  // B: toward the centre line, only as far as needed (the smallest step past the push that clears, the line at most)
  if (back && fore && mid <= 0) {
    // the centre line is behind the lamp: the face is not the wall across the room (a low unit, a wall top)
    res.move = { how: 'none', to: null, dx: 0, dz: 0, after: a.after, ceilGap: a.ceil, note: `push: ${a.why}; the centre line is ${mid.toFixed(2)} m along the push (the face is not the room's wall): re-site by hand` };
    return res;
  }
  if (back && fore) {
    const step = mid;
    const span = back.t + fore.t;
    for (let s = Math.ceil(push / STEP) * STEP + STEP; s < step - 1e-6; s += STEP) {
      const c = check(l.x + px * s, l.z + pz * s, s);
      if (c.ok) {
        res.move = mk('centre', s, c, `push blocked (${a.why}); ${s.toFixed(2)} of ${step.toFixed(2)} m to the centre line, room ${span.toFixed(2)} m across`);
        return res;
      }
    }
    const b = check(l.x + px * step, l.z + pz * step, step);
    if (b.ok) {
      res.move = mk('centre', step, b, `push blocked (${a.why}); room ${span.toFixed(2)} m across`);
      return res;
    }
    res.move = { ...mk('none', step, b, `push: ${a.why}; centre (${r2(l.x + px * step)}, ${r2(l.z + pz * step)}): ${b.why}; room ${span.toFixed(2)} m across`), how: 'none' };
    return res;
  }
  res.move = { how: 'none', to: null, dx: 0, dz: 0, after: a.after, ceilGap: a.ceil, note: `push: ${a.why}; no opposite face within ${SPAN_REACH} m` };
  return res;
}

/** Audit lamps in order, each move kept off every other lamp's spot (a lamp moved earlier: its target). */
export function auditAll(sc: Scene, lamps: readonly AuditLamp[]): LampAudit[] {
  const at: AuditLamp[] = lamps.map((l) => ({ ...l }));
  return lamps.map((l, i) => {
    const r = auditLamp(sc, l, at.filter((_, k) => k !== i));
    if (r.move?.to && r.move.how !== 'none') at[i] = { ...l, x: r.move.to[0], z: r.move.to[2] };
    return r;
  });
}

/** Lamp `l` placed at (x, z) crowds lamp `o`: same storey and closer than `SPACING`, or their bodies (plan extents turned
 *  by each fitting's yaw) within `FIT_GAP`. */
export function crowds(l: AuditLamp, x: number, z: number, o: AuditLamp): boolean {
  if (Math.abs(o.y - l.y) >= SPACING_DY) return false;
  if (hyp2(o.x - x, o.z - z) < SPACING) return true;
  if (!l.foot || !o.foot) return false;
  // each fitting's plan extents turned by its yaw (a strip turned 90 degrees is long in z)
  const ly = l.yaw ?? 0;
  const oy = o.yaw ?? 0;
  const lc = Math.abs(Math.cos(ly));
  const ls = Math.abs(Math.sin(ly));
  const oc = Math.abs(Math.cos(oy));
  const os = Math.abs(Math.sin(oy));
  const ex = (lc * l.foot[0] + ls * l.foot[1] + oc * o.foot[0] + os * o.foot[1]) / 2;
  const ez = (ls * l.foot[0] + lc * l.foot[1] + os * o.foot[0] + oc * o.foot[1]) / 2;
  return Math.abs(o.x - x) < ex + FIT_GAP && Math.abs(o.z - z) < ez + FIT_GAP;
}

/** Audit every lamp of a level against its canonical light shapes. */
export function auditLamps(shapes: readonly VoxelShape[], lamps: readonly AuditLamp[]): LampAudit[] {
  return auditAll(prepareScene(shapes), lamps);
}

// ---- framing audit -----------------------------------------------------------------------------------------------

export interface ViewShare {
  /** Standing spot (feet), yaw (rad, 0 = +z), rays that hit a surface. */
  x: number;
  y: number;
  z: number;
  /** Open sky over the spot (a yard or a roof): no solid within `SKY_REACH` over the head. */
  sky: boolean;
  yaw: number;
  hits: number;
  lit: number;
  dim: number;
  dark: number;
  noPool: boolean;
  noDark: boolean;
}

/** Over-head reach of the open-sky test (m). */
export const SKY_REACH = 30;

/** Standing spots on a plan grid: every floor (upward face) with `HEADROOM` clear over it, every storey. */
export function standingSpots(sc: Scene, step = SPOT_STEP): [number, number, number][] {
  const out: [number, number, number][] = [];
  const top = sc.hi[1] + 1;
  for (let x = sc.lo[0] + step / 2; x < sc.hi[0]; x += step) {
    for (let z = sc.lo[2] + step / 2; z < sc.hi[2]; z += step) {
      let y = top;
      for (let guard = 0; guard < 16; guard++) {
        const h = cast(sc, x, y, z, 0, -1, 0, y - sc.lo[1] + 1);
        if (!h) break;
        const fy = y - h.t;
        if (h.ny > 0.5) {
          const up = cast(sc, x, fy + 0.02, z, 0, 1, 0, HEADROOM);
          if (!up && clearance(sc, x, fy + EYE, z, 0.3) >= 0.3) out.push([x, fy, z]);
        }
        y = fy - 0.02;
      }
    }
  }
  return out;
}

/** Classify a view's sampled levels. */
export function shareOf(levels: readonly number[]): { lit: number; dim: number; dark: number } {
  if (!levels.length) return { lit: 0, dim: 0, dark: 0 };
  let lit = 0;
  let dark = 0;
  for (const v of levels) {
    if (v > VIEW_LIT) lit++;
    else if (v < VIEW_DARK) dark++;
  }
  return { lit: lit / levels.length, dim: (levels.length - lit - dark) / levels.length, dark: dark / levels.length };
}

/** The view from a spot at a yaw: level at every seen surface point (`level`, sampled 5 cm off the face). */
export function viewLevels(sc: Scene, x: number, feetY: number, z: number, yaw: number, level: (x: number, y: number, z: number) => number): number[] {
  const out: number[] = [];
  const ey = feetY + EYE;
  for (let r = 0; r < VIEW_ROWS; r++) {
    const pitch = VIEW_PITCH_LO + ((r + 0.5) / VIEW_ROWS) * (VIEW_PITCH_HI - VIEW_PITCH_LO);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    for (let c = 0; c < VIEW_COLS; c++) {
      const a = yaw + ((c + 0.5) / VIEW_COLS - 0.5) * VIEW_FOV;
      const dx = Math.sin(a) * cp;
      const dz = Math.cos(a) * cp;
      const h = cast(sc, x, ey, z, dx, sp, dz, VIEW_REACH);
      if (!h) continue;
      out.push(level(x + dx * h.t + h.nx * 0.05, ey + sp * h.t + h.ny * 0.05, z + dz * h.t + h.nz * 0.05));
    }
  }
  return out;
}

/** Every spot x 4 yaws (0, 90, 180, 270 deg). Views seeing fewer than `VIEW_MIN_HITS` points are left out. */
export function frameViews(sc: Scene, spots: readonly [number, number, number][], level: (x: number, y: number, z: number) => number): ViewShare[] {
  const out: ViewShare[] = [];
  for (const [x, y, z] of spots) {
    const sky = !cast(sc, x, y + 0.02, z, 0, 1, 0, SKY_REACH);
    for (let k = 0; k < 4; k++) {
      const yaw = (k * Math.PI) / 2;
      const lv = viewLevels(sc, x, y, z, yaw, level);
      if (lv.length < VIEW_MIN_HITS) continue;
      const s = shareOf(lv);
      out.push({ x, y, z, sky, yaw, hits: lv.length, ...s, noPool: s.lit < VIEW_MIN_SHARE, noDark: s.dark < VIEW_MIN_SHARE });
    }
  }
  return out;
}
