import type { BoxPiece, LevelBuilder } from '../levelBuilder';
import type { SectorDef } from '../../game/sectors';
import type { SecurityData } from '../../security/data';
import type { LaserDef } from '../../game/jammer';
import { mountEnd } from '../lampMount';
import { hyp2 } from '../../core/mathx';

/**
 * Sector Ops Warehouse dressing (warehouse-lamps; pure). Michael (2026-10-20): the open roof sections become "a opaque
 * type of corrugated plastic sheet that allow light in but cant be passed through"; and quick detail so the sections
 * feel full ("Walls + ceiling + dead-space clutter").
 * - Roof sheets over every opening of the hall roofs (`LevelBuilder.sheet`: solid, not baked, drawn see-through). The
 *   section 1 roof hatch and smoke vent are routes and stay open.
 * - Wall, ceiling and floor detail: pipe runs, cable trays, signs, fire points, hazard stripes, roller doors, trusses, a
 *   duct, floor lanes and bay plates. Visual only: `detail` boxes (no collision, not in the light shapes, no ledges).
 * - Floor clutter in dead space only: pallet stacks, drums, cartons, a parked forklift, lockers and desks in side rooms.
 *   Each is a `detail` look plus one collision-only box (not baked, no cover face, no ledge), placed only where no
 *   section route or guard patrol comes within reach and no sightline from a guard's post or patrol to a route crosses it.
 * Every piece is checked against the level: nothing cuts a solid piece, a traversal anchor, a switch or device, a lamp
 * or its mount, and overhead pieces keep 1.8 m over any walkable top (rack tops, decks, roofs: the high routes).
 * `tests/warehouseDress.test.ts` checks the result independently.
 */

export interface DressInput {
  sectors: readonly SectorDef[];
  /** Plan points to keep clear: switches, pickups, hides, spawns, alarms (x, z). */
  points: readonly (readonly [number, number])[];
  security: SecurityData;
  lasers: readonly LaserDef[];
}

export interface ClutterItem {
  kind: 'pallets' | 'drums' | 'cartons' | 'forklift' | 'lockers' | 'desk';
  x: number;
  z: number;
  /** Plan size (x, z) and height (m). */
  w: number;
  d: number;
  h: number;
  section: number;
}

export interface DressReport {
  /** `b.boxes` index of the first piece the dressing added (everything after it is the dressing). */
  firstBox: number;
  sheets: { x0: number; x1: number; z0: number; z1: number }[];
  /** Detail pieces added, by kind. */
  pieces: Record<string, number>;
  clutter: ClutterItem[];
  /** Where a kind was tried and dropped (it would cut something), by kind. */
  dropped: Record<string, number>;
}

/** The roof's sheet line (the hall roof strips: y 6.03-6.28). */
const ROOF_Y0 = 6.03;
const ROOF_Y1 = 6.28;
/**
 * The hall roof's openings in Sector Ops [x0, x1, z0, z1]: the skylight gaps between the strips (`warehouse.ts`), the
 * slit over section 2's south wall and section 3's south strip (the base z -12 strip is skipped and section 1's roof
 * ends at z -8.95).
 */
export const ROOF_OPENINGS: readonly (readonly [number, number, number, number])[] = [
  [-24, 24, -1.2, 0],
  [-24, 24, 4.8, 6],
  [-24, 24, 10.8, 12],
  [-24, 24, 16.8, 18],
  [-24, -4, -6.15, -6],
  [-4, 24, -8.95, -6],
];
/** Openings that are routes and stay open [x0, x1, z0, z1, why] (SPEC 5.2: section 1's roof). */
export const ROUTE_OPENINGS: readonly (readonly [number, number, number, number, string])[] = [
  [-20.6, -19.4, -8.0, -6.8, 'section 1 smoke vent (route R2: the roof to the lobby-block roof)'],
  [4.5, 5.5, -14.8, -14.0, 'section 1 roof hatch (route R2: the roof hatch ladder to the plant deck)'],
];

const C = {
  pipe: '#6d7378',
  pipeRed: '#9a3a32',
  tray: '#8b9196',
  steel: '#55606a',
  truss: '#5d666e',
  duct: '#a3a9ad',
  signBlue: '#2f5f9e',
  signGreen: '#2f8a4a',
  signWhite: '#d9d9d2',
  red: '#b0302a',
  panel: '#7a8086',
  hazard: '#e8b923',
  black: '#26282a',
  roller: '#8f979c',
  lane: '#d8b42a',
  laneWhite: '#cfcfc6',
  pallet: '#8a6a44',
  shrink: '#c4c0b0',
  carton: '#a8845a',
  drumBlue: '#2f5a8a',
  drumRed: '#8a3a2f',
  forklift: '#d9a420',
  tyre: '#222426',
  locker: '#6f7a83',
  desk: '#8a6a4c',
};

/** A detail box: centre, size, colour. */
type Part = [number, number, number, number, number, number, string];

interface Aabb {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

function aabbOf(p: BoxPiece): Aabb {
  const c = Math.abs(Math.cos(p.yaw));
  const s = Math.abs(Math.sin(p.yaw));
  const hx = (c * p.s[0] + s * p.s[2]) / 2;
  const hz = (s * p.s[0] + c * p.s[2]) / 2;
  return { x0: p.c[0] - hx, x1: p.c[0] + hx, y0: p.c[1] - p.s[1] / 2, y1: p.c[1] + p.s[1] / 2, z0: p.c[2] - hz, z1: p.c[2] + hz };
}
const meets = (a: Aabb, b: Aabb, e = 0): boolean => a.x0 < b.x1 - e && a.x1 > b.x0 + e && a.y0 < b.y1 - e && a.y1 > b.y0 + e && a.z0 < b.z1 - e && a.z1 > b.z0 + e;

/** Plan distance from segment (ax, az)-(bx, bz) to a rectangle (0 when it crosses it). */
export function segRectDist(ax: number, az: number, bx: number, bz: number, r: { x0: number; x1: number; z0: number; z1: number }): number {
  if (segHitsRect(ax, az, bx, bz, r)) return 0;
  const pr = (px: number, pz: number): number => hyp2(Math.max(r.x0 - px, 0, px - r.x1), Math.max(r.z0 - pz, 0, pz - r.z1));
  const ps = (px: number, pz: number): number => {
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz;
    const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
    return hyp2(px - ax - dx * t, pz - az - dz * t);
  };
  return Math.min(pr(ax, az), pr(bx, bz), ps(r.x0, r.z0), ps(r.x1, r.z0), ps(r.x0, r.z1), ps(r.x1, r.z1));
}

/** Does the segment cross the rectangle (Liang-Barsky)? */
export function segHitsRect(ax: number, az: number, bx: number, bz: number, r: { x0: number; x1: number; z0: number; z1: number }): boolean {
  let t0 = 0;
  let t1 = 1;
  const d = [bx - ax, bz - az];
  const o = [ax, az];
  const lo = [r.x0, r.z0];
  const hi = [r.x1, r.z1];
  for (let k = 0; k < 2; k++) {
    const dk = d[k]!;
    if (Math.abs(dk) < 1e-9) {
      if (o[k]! < lo[k]! || o[k]! > hi[k]!) return false;
      continue;
    }
    let ta = (lo[k]! - o[k]!) / dk;
    let tb = (hi[k]! - o[k]!) / dk;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

/** A keep-clear segment with its height band: anchors, devices, lamps and their mounts. */
interface Keep {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  y0: number;
  y1: number;
}

/** The hall floor slab's top (m): floor pieces stand on it. */
const FLOOR_TOP = 0.021;

/** A floor item keeps this far (m, plan) from every section route and every guard's patrol and post. */
export const ROUTE_CLEAR = 1.5;
export const PATROL_CLEAR = 2.0;

/** The sections' plan boxes [x0, x1, z0, z1] (section 1 includes the yard). */
const SECTION_BOX: readonly (readonly [number, number, number, number])[] = [
  [-24, 24, -26, -8.8],
  [-24, -4, -6, 18],
  [-4, 24, -8.8, 18],
];
const sectionAt = (x: number, z: number): number => SECTION_BOX.findIndex(([x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);

/** The last build's report (the tests and the PR table read it). */
export const dressReport: { last: DressReport | null } = { last: null };

/** Dress Sector Ops' Warehouse (called by `warehouseOps.build` after the lamps are mounted). */
export function dressWarehouseOps(b: LevelBuilder, inp: DressInput): DressReport {
  const rep: DressReport = { firstBox: b.boxes.length, sheets: [], pieces: {}, clutter: [], dropped: {} };
  const count = (r: Record<string, number>, k: string): void => {
    r[k] = (r[k] ?? 0) + 1;
  };

  // ---- roof sheets (before anything reads the solids: they are solid)
  for (const [x0, x1, z0, z1] of ROOF_OPENINGS) {
    b.sheet(x0, x1, z0, z1, ROOF_Y0, ROOF_Y1);
    rep.sheets.push({ x0, x1, z0, z1 });
  }

  const solids: Aabb[] = b.boxes.filter((p) => p.collide && !p.detail).map(aabbOf);
  // walkable tops: what a player stands on (thin slabs, rack and block tops, roofs); the roof sheets are not
  const tops: Aabb[] = b.boxes.filter((p) => p.collide && !p.detail && p.visible !== false).map(aabbOf);
  const keeps: Keep[] = [];
  const keepPt = (x: number, z: number, y0: number, y1: number): void => {
    keeps.push({ ax: x, az: z, bx: x, bz: z, y0, y1 });
  };
  for (const a of b.anchors.all) {
    switch (a.kind) {
      case 'ladder':
      case 'pipeV':
        keeps.push({ ax: a.base.x, az: a.base.z, bx: a.top.x, bz: a.top.z, y0: a.base.y, y1: a.top.y + 1.8 });
        break;
      case 'pipeH':
        keeps.push({ ax: a.a.x, az: a.a.z, bx: a.b.x, bz: a.b.z, y0: a.a.y - 2.2, y1: a.a.y + 0.6 });
        break;
      case 'door':
        keeps.push({ ax: a.hinge.x, az: a.hinge.z, bx: a.hinge.x + Math.sin(a.yaw) * a.width, bz: a.hinge.z + Math.cos(a.yaw) * a.width, y0: a.hinge.y, y1: a.hinge.y + a.height + 0.4 });
        break;
      case 'window':
        keeps.push({ ax: a.c.x - Math.sin(a.yaw) * a.w / 2, az: a.c.z - Math.cos(a.yaw) * a.w / 2, bx: a.c.x + Math.sin(a.yaw) * a.w / 2, bz: a.c.z + Math.cos(a.yaw) * a.w / 2, y0: 0, y1: a.c.y + a.h });
        break;
      case 'duct':
        for (let k = 1; k < a.path.length; k++) {
          const p = a.path[k - 1]!;
          const q = a.path[k]!;
          keeps.push({ ax: p.x, az: p.z, bx: q.x, bz: q.z, y0: Math.min(p.y, q.y) - 0.6, y1: Math.max(p.y, q.y) + 0.6 });
        }
        for (const g of [a.entry, a.exit, ...a.grates]) keepPt(g.pos.x, g.pos.z, g.pos.y - 1.5, g.pos.y + 1);
        break;
      case 'fence':
        keeps.push({ ax: a.a.x, az: a.a.z, bx: a.b.x, bz: a.b.z, y0: a.a.y, y1: a.a.y + a.height + 0.5 });
        break;
      case 'ledge':
        keeps.push({ ax: a.a.x, az: a.a.z, bx: a.b.x, bz: a.b.z, y0: a.top - 2.2, y1: a.top + 2 });
        break;
      default: {
        const anyA = a as unknown as { pos?: { x: number; y: number; z: number }; a?: { x: number; y: number; z: number }; b?: { x: number; y: number; z: number } };
        const p = anyA.pos ?? anyA.a;
        if (p) keeps.push({ ax: p.x, az: p.z, bx: (anyA.b ?? p).x, bz: (anyA.b ?? p).z, y0: Math.min(p.y, (anyA.b ?? p).y) - 2, y1: Math.max(p.y, (anyA.b ?? p).y) + 2 });
      }
    }
  }
  for (const [x, z] of inp.points) keepPt(x, z, 0, 2.6);
  for (const d of inp.security.devices) {
    const y = (inp.security.levels as Record<string, number>)[d.level] ?? 0;
    keepPt(d.at[0], d.at[1], y, y + ((d as { y?: number }).y ?? 2) + 0.6);
  }
  for (const l of inp.lasers) keeps.push({ ax: l.x1, az: l.z1, bx: l.x2, bz: l.z2, y0: l.floorY ?? 0, y1: (l.floorY ?? 0) + 2 });
  // the lamps: the fitting and its mount
  for (const l of b.lights.lights) {
    if (l.kind === 'flashlight') continue;
    const e = mountEnd(l) ?? [l.x, l.y + 0.2, l.z];
    keeps.push({ ax: l.x, az: l.z, bx: e[0], bz: e[2], y0: Math.min(l.y, e[1]) - 0.4, y1: Math.max(l.y, e[1]) + 0.1 });
  }

  /** Clearance of a piece against the keep list (plan reach `r` where the height bands meet). */
  const clearOfKeeps = (a: Aabb, r: number): boolean =>
    !keeps.some((k) => k.y1 > a.y0 && k.y0 < a.y1 && segRectDist(k.ax, k.az, k.bx, k.bz, a) < r);
  /** An overhead piece keeps 1.8 m over every walkable top under it (the high routes); a low piece must stand clear of solids only. */
  // how far round an overhead piece the walkable tops count: a wall piece only looks into its room (not over its wall)
  let grow = 0.12;
  const headroom = (a: Aabb): boolean => {
    if (a.y0 < 2.4) return true;
    const g: Aabb = { x0: a.x0 - grow, x1: a.x1 + grow, y0: -10, y1: a.y0 + 0.01, z0: a.z0 - grow, z1: a.z1 + grow };
    let top = 0;
    for (const t of tops) if (t.y1 <= a.y0 + 0.01 && meets(g, t)) top = Math.max(top, t.y1);
    return a.y0 - top >= 1.8;
  };
  const free = (a: Aabb): boolean => !solids.some((s) => meets(a, s, 0.004));

  /** Add one visual piece (a detail box) if it is clear of everything; returns whether it went in. */
  const piece = (kind: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: string, keepR = 0.35): boolean => {
    const a: Aabb = { x0: cx - sx / 2, x1: cx + sx / 2, y0: cy - sy / 2, y1: cy + sy / 2, z0: cz - sz / 2, z1: cz + sz / 2 };
    if (!free(a) || !headroom(a) || !clearOfKeeps(a, keepR)) {
      count(rep.dropped, kind);
      return false;
    }
    b.box(cx, cy, cz, sx, sy, sz, color, 0, 0, false);
    const p = b.boxes[b.boxes.length - 1]!;
    p.detail = true;
    p.noLedge = true;
    count(rep.pieces, kind);
    return true;
  };
  /** A piece set that goes in whole or not at all (a sign with its frame, a roller door). */
  const group = (kind: string, parts: Part[], keepR = 0.35): boolean => {
    for (const [cx, cy, cz, sx, sy, sz] of parts) {
      const a: Aabb = { x0: cx - sx / 2, x1: cx + sx / 2, y0: cy - sy / 2, y1: cy + sy / 2, z0: cz - sz / 2, z1: cz + sz / 2 };
      if (!free(a) || !headroom(a) || !clearOfKeeps(a, keepR)) {
        count(rep.dropped, kind);
        return false;
      }
    }
    for (const [cx, cy, cz, sx, sy, sz, color] of parts) {
      b.box(cx, cy, cz, sx, sy, sz, color, 0, 0, false);
      const p = b.boxes[b.boxes.length - 1]!;
      p.detail = true;
      p.noLedge = true;
    }
    count(rep.pieces, kind);
    return true;
  };

  // ---- walls: runs along the hall walls' inner faces (fx/fz the face line, n into the room, t along it)
  interface Run {
    /** The face: x = f (normal along x) or z = f. */
    axis: 'x' | 'z';
    f: number;
    n: 1 | -1;
    t0: number;
    t1: number;
  }
  const RUNS: Run[] = [
    // section 2: the perimeter west and north, the x -4 wall, the z -6 wall
    { axis: 'x', f: -24, n: 1, t0: -6, t1: 18 },
    { axis: 'z', f: 18, n: -1, t0: -24, t1: -4 },
    { axis: 'x', f: -4.15, n: -1, t0: -6, t1: 18 },
    { axis: 'z', f: -5.85, n: 1, t0: -24, t1: -4 },
    // section 3: the x -4 wall, the perimeter north and east, the z -8.8 wall
    { axis: 'x', f: -3.85, n: 1, t0: -8.8, t1: 18 },
    { axis: 'z', f: 18, n: -1, t0: -4, t1: 24 },
    { axis: 'x', f: 24, n: -1, t0: -8.8, t1: 18 },
    { axis: 'z', f: -8.65, n: 1, t0: -4, t1: 24 },
    // section 1: the facade's inner face, the bay's west wall, the workshop's east wall
    { axis: 'z', f: -17.85, n: 1, t0: -24, t1: 24 },
    { axis: 'x', f: -24, n: 1, t0: -18, t1: -8.8 },
    { axis: 'x', f: 24, n: -1, t0: -18, t1: -8.8 },
  ];
  /** World centre and size of a wall piece: `t` along the run, `off` out from the face, `len` along, `dep` deep. */
  const at = (r: Run, t: number, off: number, len: number, y: number, h: number, dep: number): [number, number, number, number, number, number] =>
    r.axis === 'x' ? [r.f + r.n * (off + dep / 2), y, t, dep, h, len] : [t, y, r.f + r.n * (off + dep / 2), len, h, dep];
  /** `at` with its colour: one part of a `group`. */
  const wp = (r: Run, t: number, off: number, len: number, y: number, h: number, dep: number, color: string): Part => [...at(r, t, off, len, y, h, dep), color];
  /** Is the wall solid behind the face over [t - len / 2, t + len / 2] at height y? */
  const wallBehind = (r: Run, t: number, len: number, y: number): boolean => {
    for (let k = -1; k <= 1; k++) {
      const tt = t + (k * len) / 2.2;
      const px = r.axis === 'x' ? r.f - r.n * 0.06 : tt;
      const pz = r.axis === 'x' ? tt : r.f - r.n * 0.06;
      if (!solids.some((s) => px > s.x0 && px < s.x1 && pz > s.z0 && pz < s.z1 && y > s.y0 && y < s.y1)) return false;
    }
    return true;
  };
  const wallPiece = (kind: string, r: Run, t: number, off: number, len: number, y: number, h: number, dep: number, color: string): boolean => {
    if (!wallBehind(r, t, len, y)) {
      count(rep.dropped, kind);
      return false;
    }
    const [cx, cy, cz, sx, sy, sz] = at(r, t, off, len, y, h, dep);
    return piece(kind, cx, cy, cz, sx, sy, sz, color);
  };

  for (const [ri, r] of RUNS.entries()) {
    // services in 1 m lengths: two pipes (4.55, 4.75; the red one a sprinkler feed) and a cable tray (3.7)
    for (let t = r.t0 + 0.5; t < r.t1 - 0.4; t += 1) {
      wallPiece('pipe run', r, t, 0.1, 1.0, 4.55, 0.1, 0.1, C.pipe);
      wallPiece('pipe run', r, t, 0.1, 1.0, 4.77, 0.1, 0.1, C.pipeRed);
      wallPiece('cable tray', r, t, 0.08, 1.0, 3.72, 0.06, 0.3, C.tray);
    }
    // signs every 7 m (a plate on a dark frame), a fire point (extinguisher and panel) every 11 m
    for (let t = r.t0 + 3; t < r.t1 - 1; t += 7) {
      const col = [C.signBlue, C.signGreen, C.signWhite][(ri + Math.round(t)) % 3]!;
      if (!wallBehind(r, t, 0.8, 2.8)) continue;
      group('sign', [wp(r, t, 0.01, 0.8, 2.8, 0.55, 0.02, C.black), wp(r, t, 0.03, 0.7, 2.8, 0.45, 0.01, col)]);
    }
    for (let t = r.t0 + 5.5; t < r.t1 - 1; t += 11) {
      if (!wallBehind(r, t, 0.9, 1.2)) continue;
      group('fire point', [
        wp(r, t - 0.3, 0.01, 0.42, 1.55, 0.6, 0.12, C.panel),
        wp(r, t + 0.3, 0.01, 0.16, 0.75, 0.5, 0.16, C.red),
        wp(r, t + 0.3, 0.01, 0.06, 1.05, 0.1, 0.06, C.black),
        wp(r, t + 0.3, 0.01, 0.34, 1.75, 0.22, 0.02, C.red),
      ]);
    }
  }
  // hazard stripes on the wall either side of each doorway in the runs (0.3 m bands, yellow and black)
  for (const a of b.anchors.doors) {
    const ex = a.hinge.x + Math.sin(a.yaw) * a.width;
    const ez = a.hinge.z + Math.cos(a.yaw) * a.width;
    for (const r of RUNS) {
      const onX = r.axis === 'x' && Math.abs(a.hinge.x - r.f) < 0.4 && Math.abs(ex - r.f) < 0.4;
      const onZ = r.axis === 'z' && Math.abs(a.hinge.z - r.f) < 0.4 && Math.abs(ez - r.f) < 0.4;
      if (!onX && !onZ) continue;
      const lo = Math.min(onX ? a.hinge.z : a.hinge.x, onX ? ez : ex);
      const hi = Math.max(onX ? a.hinge.z : a.hinge.x, onX ? ez : ex);
      if (lo < r.t0 || hi > r.t1) continue;
      for (const [s, dir] of [[lo, -1], [hi, 1]] as const) {
        for (let k = 0; k < 4; k++) {
          const t = s + dir * (0.45 + k * 0.3);
          if (!wallBehind(r, t, 0.3, 0.6)) break;
          const [cx, cy, cz, sx, sy, sz] = at(r, t, 0.005, 0.3, 0.63, 1.2, 0.015);
          if (!piece('hazard stripe', cx, cy, cz, sx, sy, sz, k % 2 ? C.black : C.hazard, 0)) break;
        }
      }
    }
  }
  // roller doors on end walls (closed: slatted curtain, header box, guide rails)
  const roller = (r: Run, t: number): void => {
    const W = 3.6;
    const H = 4.2;
    for (const y of [0.5, 2.1, 3.9]) {
      if (!wallBehind(r, t, W, y)) {
        count(rep.dropped, 'roller door');
        return;
      }
    }
    const parts: Part[] = [];
    parts.push(wp(r, t, 0.005, W, H / 2 + 0.03, H, 0.03, C.roller));
    for (let y = 0.25; y < H; y += 0.3) parts.push(wp(r, t, 0.035, W - 0.04, y, 0.04, 0.02, C.steel));
    parts.push(wp(r, t, 0.005, W + 0.3, H + 0.25, 0.5, 0.45, C.steel));
    for (const s of [-1, 1]) parts.push(wp(r, t + (s * (W + 0.1)) / 2, 0.005, 0.1, H / 2 + 0.03, H, 0.12, C.steel));
    parts.push(wp(r, t, 0.035, W, 0.15, 0.24, 0.03, C.hazard));
    group('roller door', parts, 0.6);
  };
  roller(RUNS[1]!, -11.5); // section 2: the north end wall
  roller(RUNS[6]!, 6.5); // section 3: the east end wall

  grow = 0.4;
  // ---- ceiling: trusses on the frame lines (section 2 between its rafters, section 3 every 6 m) in 1.5 m panels, a duct in section 3
  for (const x of [-20, -12, 0, 6, 12, 18]) {
    const z0 = x < -4 ? -6 : -8.8;
    for (let z = z0 + 0.75; z < 18 - 0.5; z += 1.5) {
      // a full panel (chords and a diagonal) where there is headroom; over the high routes the top chord only
      const full = group('truss', [
        [x, 5.96, z, 0.12, 0.12, 1.5, C.truss],
        [x, 5.45, z, 0.1, 0.1, 1.5, C.truss],
        [x, 5.7, z - 0.7, 0.06, 0.4, 0.06, C.truss],
      ], 0.4);
      if (!full) piece('truss', x, 5.96, z, 0.12, 0.12, 1.5, C.truss, 0.4);
    }
  }
  for (let z = -5.5; z < 17; z += 1.5) piece('duct', 9.5, 5.2, z, 0.7, 0.45, 1.5, C.duct, 0.4);

  // ---- floor markings: lanes beside the racks (section 2) and the hall's walkway (section 3), bay plates at rack ends
  const RACK = '#3f6f9a';
  for (const p of b.boxes.slice()) {
    if (p.color !== RACK || p.detail || !p.collide) continue;
    const a = aabbOf(p);
    const len = a.z1 - a.z0;
    for (const x of [a.x0 - 0.3, a.x1 + 0.3]) piece('floor lane', x, 0.024, (a.z0 + a.z1) / 2, 0.08, 0.008, len, C.lane, 0);
    for (const z of [a.z0 - 0.45, a.z1 + 0.45]) piece('bay plate', (a.x0 + a.x1) / 2, 0.024, z, 0.45, 0.008, 0.3, C.laneWhite, 0);
  }
  for (const x of [-2.6, -1.4]) for (let z = -5.5; z < 11.5; z += 2) piece('floor lane', x, 0.024, z, 0.08, 0.008, 1.8, C.lane, 0);
  for (const x of [-20, -12]) for (let z = -16.5; z < -10; z += 2) piece('floor lane', x, 0.024, z, 0.08, 0.008, 1.8, C.lane, 0);

  // ---- floor clutter in dead space
  const routeSegs: number[][] = [];
  const patrolSegs: number[][] = [];
  const watchPts: [number, number, number][] = [];
  const routePts: [number, number, number][] = [];
  inp.sectors.forEach((s, si) => {
    for (const r of s.routes) {
      for (let k = 1; k < r.pts.length; k++) {
        const p = r.pts[k - 1]!;
        const q = r.pts[k]!;
        routeSegs.push([p[0], p[1], q[0], q[1]]);
        const n = Math.max(1, Math.ceil(hyp2(q[0] - p[0], q[1] - p[1])));
        for (let j = 0; j <= n; j++) routePts.push([p[0] + ((q[0] - p[0]) * j) / n, p[1] + ((q[1] - p[1]) * j) / n, si]);
      }
    }
    for (const g of s.guards) {
      const route = g.route ?? [[g.x, g.z]];
      watchPts.push([g.x, g.z, si]);
      for (let k = 0; k < route.length; k++) {
        const p = route[k]!;
        const q = route[(k + 1) % route.length]!;
        patrolSegs.push([p[0], p[1], q[0], q[1]]);
        const n = Math.max(1, Math.ceil(hyp2(q[0] - p[0], q[1] - p[1]) / 2));
        for (let j = 0; j < n; j++) watchPts.push([p[0] + ((q[0] - p[0]) * j) / n, p[1] + ((q[1] - p[1]) * j) / n, si]);
      }
      if (g.takedownSpot) keepPt(g.takedownSpot[0], g.takedownSpot[1], 0, 2.6);
    }
    keepPt(s.objective.x, s.objective.z, 0, 2.6);
    if (s.connector) {
      const [x0, z0, x1, z1] = s.connector.box;
      keeps.push({ ax: x0, az: z0, bx: x1, bz: z1, y0: 0, y1: 3 }, { ax: x0, az: z1, bx: x1, bz: z0, y0: 0, y1: 3 });
    }
    keepPt(s.start.x, s.start.z, 0, 2.6);
  });
  const placed: { x0: number; x1: number; z0: number; z1: number }[] = [];
  /** Is the rectangle at least `clear` from every segment? (Its centre at least `clear` + its half diagonal: a little strict, cheap; cached per centre.) */
  const near = new Map<number[][], Map<number, number>>();
  const clearOf = (segs: number[][], r: { x0: number; x1: number; z0: number; z1: number }, clear: number): boolean => {
    const cx = (r.x0 + r.x1) / 2;
    const cz = (r.z0 + r.z1) / 2;
    let m = near.get(segs);
    if (!m) near.set(segs, (m = new Map()));
    const key = Math.round(cx * 20) * 100000 + Math.round(cz * 20);
    let d = m.get(key);
    if (d === undefined) {
      d = Infinity;
      for (const [ax, az, bx, bz] of segs) {
        const dx = bx! - ax!;
        const dz = bz! - az!;
        const l2 = dx * dx + dz * dz;
        const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((cx - ax!) * dx + (cz - az!) * dz) / l2)) : 0;
        d = Math.min(d, hyp2(cx - ax! - dx * t, cz - az! - dz * t));
      }
      m.set(key, d);
    }
    return d >= clear + hyp2(r.x1 - r.x0, r.z1 - r.z0) / 2;
  };
  // pieces that stop sight at chest height today (walls, racks, tall blocks), for the sightline test
  const blockers = solids.filter((sd) => sd.y0 < 1.0 && sd.y1 > 1.5);
  /**
   * The 0.5 m plan cells some open sightline crosses today: from a guard's post or patrol to a route point within 20 m
   * with no blocker across it. Built on first use (one pass over the pairs); a tall item may not stand on one.
   */
  const SG = 0.5;
  const GX0 = -27;
  const GZ0 = -29;
  const GW = 110;
  let seen: Uint8Array | null = null;
  const sightCells = (): Uint8Array => {
    if (seen) return seen;
    const g = new Uint8Array(GW * GW);
    for (const [wx, wz] of watchPts) {
      for (const [px, pz] of routePts) {
        const len = hyp2(px - wx, pz - wz);
        if (len > 20) continue;
        const lx = Math.min(wx, px), hx = Math.max(wx, px), lz = Math.min(wz, pz), hz = Math.max(wz, pz);
        if (blockers.some((sd) => sd.x0 < hx && sd.x1 > lx && sd.z0 < hz && sd.z1 > lz && segHitsRect(wx, wz, px, pz, { x0: sd.x0 + 0.05, x1: sd.x1 - 0.05, z0: sd.z0 + 0.05, z1: sd.z1 - 0.05 }))) continue;
        const n = Math.max(1, Math.ceil(len / 0.2));
        for (let k = 0; k <= n; k++) {
          const cx = Math.floor((wx + ((px - wx) * k) / n - GX0) / SG);
          const cz = Math.floor((wz + ((pz - wz) * k) / n - GZ0) / SG);
          if (cx >= 0 && cz >= 0 && cx < GW && cz < GW) g[cz * GW + cx] = 1;
        }
      }
    }
    seen = g;
    return g;
  };
  /** May a floor item with this footprint stand here? Dead space only (see the module note). */
  const deadSpace = (r: { x0: number; x1: number; z0: number; z1: number }, h: number, wallNeeded: boolean): boolean => {
    const a: Aabb = { ...r, y0: 0.03, y1: h };
    if (placed.some((p) => p.x0 < r.x1 + 0.8 && p.x1 > r.x0 - 0.8 && p.z0 < r.z1 + 0.8 && p.z1 > r.z0 - 0.8)) return false;
    if (!clearOf(routeSegs, r, ROUTE_CLEAR) || !clearOf(patrolSegs, r, PATROL_CLEAR)) return false;
    if (!free(a) || !clearOfKeeps(a, 1.2)) return false;
    // a floor under it (not over a pit or outside)
    const under: Aabb = { x0: r.x0 + 0.05, x1: r.x1 - 0.05, y0: -0.2, y1: 0.03, z0: r.z0 + 0.05, z1: r.z1 - 0.05 };
    if (!solids.some((s) => meets(under, s) && s.y1 <= 0.035 && s.x0 <= r.x0 && s.x1 >= r.x1 && s.z0 <= r.z0 && s.z1 >= r.z1)) return false;
    if (wallNeeded) {
      const g: Aabb = { x0: r.x0 - 0.15, x1: r.x1 + 0.15, y0: 0.5, y1: 1.0, z0: r.z0 - 0.15, z1: r.z1 + 0.15 };
      if (!solids.some((s) => s.y1 - s.y0 >= 2 && meets(g, s))) return false;
    }
    // no guard's post or patrol sees a route point today through where it would stand (within 20 m; under 1 m tall it hides no one standing)
    if (h < 1.0) return true;
    const g = sightCells();
    for (let cz = Math.floor((r.z0 - 0.1 - GZ0) / SG); cz <= Math.floor((r.z1 + 0.1 - GZ0) / SG); cz++) {
      for (let cx = Math.floor((r.x0 - 0.1 - GX0) / SG); cx <= Math.floor((r.x1 + 0.1 - GX0) / SG); cx++) if (g[cz * GW + cx]) return false;
    }
    return true;
  };
  const look = (kind: ClutterItem['kind'], cx: number, cz: number, w: number, d: number, h: number): void => {
    const add = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, yaw = 0): void => {
      b.box(x, y + FLOOR_TOP, z, sx, sy, sz, color, yaw, 0, false);
      const p = b.boxes[b.boxes.length - 1]!;
      p.detail = true;
      p.noLedge = true;
    };
    const along = w >= d;
    const L = along ? w : d;
    const S = along ? d : w;
    const pt = (u: number, v: number): [number, number] => (along ? [cx + u, cz + v] : [cx + v, cz + u]);
    const sz = (lu: number, sv: number): [number, number] => (along ? [lu, sv] : [sv, lu]);
    if (kind === 'pallets') {
      for (const u of [-L / 4, L / 4]) {
        const [x, z] = pt(u, 0);
        const [a1, a2] = sz(L / 2 - 0.05, S);
        add(x, 0.07, z, a1, 0.14, a2, C.pallet);
        add(x, 0.14 + (h - 0.14) / 2, z, a1 - 0.06, h - 0.14, a2 - 0.06, (Math.round(cx * 7 + u) & 1) ? C.shrink : C.carton);
      }
    } else if (kind === 'drums') {
      const n = Math.max(1, Math.round(L / 0.62));
      for (let k = 0; k < n; k++) {
        const [x, z] = pt(-L / 2 + 0.31 + k * 0.62, 0);
        const col = k % 2 ? C.drumRed : C.drumBlue;
        add(x, h / 2, z, 0.56, h, 0.4, col);
        add(x, h / 2, z, 0.56, h, 0.4, col, Math.PI / 2);
        add(x, h / 2, z, 0.4, h - 0.01, 0.4, col, Math.PI / 4);
      }
    } else if (kind === 'cartons') {
      for (const [u, v, hh] of [[-L / 4, 0, h], [L / 4, -S / 4, h * 0.6], [L / 4, S / 4, h * 0.8]] as const) {
        const [x, z] = pt(u, v);
        const [a1, a2] = sz(L / 2 - 0.06, v === 0 ? S - 0.06 : S / 2 - 0.06);
        add(x, hh / 2, z, a1, hh, a2, C.carton);
      }
    } else if (kind === 'forklift') {
      // body, counterweight, overhead guard posts and roof, mast, forks, wheels (lowered, parked)
      const [bw, bl] = sz(1.6, S);
      const b1 = pt(0.2, 0);
      add(b1[0], 0.6, b1[1], bw, 0.8, bl, C.forklift);
      const cw = pt(0.85, 0);
      const [cw1, cw2] = sz(0.3, S);
      add(cw[0], 0.75, cw[1], cw1, 1.1, cw2, C.black);
      for (const v of [-S / 2 + 0.06, S / 2 - 0.06]) for (const u of [-0.45, 0.75]) {
        const q = pt(u, v);
        add(q[0], 1.55, q[1], 0.06, 1.1, 0.06, C.black);
      }
      const roof = pt(0.15, 0);
      const [r1, r2] = sz(1.3, S);
      add(roof[0], 2.12, roof[1], r1, 0.06, r2, C.black);
      const mast = pt(-0.65, 0);
      const [m1, m2] = sz(0.12, S - 0.2);
      add(mast[0], 1.1, mast[1], m1, 2.2, m2, C.steel);
      for (const v of [-0.3, 0.3]) {
        const f = pt(-0.95, v);
        const [f1, f2] = sz(0.6, 0.1);
        add(f[0], 0.05, f[1], f1, 0.05, f2, C.steel);
      }
      for (const v of [-S / 2 + 0.12, S / 2 - 0.12]) for (const u of [-0.35, 0.65]) {
        const q = pt(u, v);
        const [t1, t2] = sz(0.5, 0.2);
        add(q[0], 0.25, q[1], t1, 0.5, t2, C.tyre);
      }
    } else if (kind === 'lockers') {
      const n = Math.max(1, Math.round(L / 0.4));
      for (let k = 0; k < n; k++) {
        const [x, z] = pt(-L / 2 + 0.2 + k * 0.4, 0);
        const [a1, a2] = sz(0.38, S);
        add(x, h / 2, z, a1, h, a2, k % 2 ? C.locker : C.panel);
      }
    } else {
      const [a1, a2] = sz(L, S);
      add(cx, h - 0.02, cz, a1, 0.04, a2, C.desk);
      for (const u of [-L / 2 + 0.05, L / 2 - 0.05]) {
        const [x, z] = pt(u, 0);
        const [l1, l2] = sz(0.05, S - 0.1);
        add(x, (h - 0.04) / 2, z, l1, h - 0.04, l2, C.steel);
      }
    }
  };
  /** Search a section box (or a room) on a 0.5 m grid for the first `n` places a kind may stand; place them. */
  const scatter = (kind: ClutterItem['kind'], area: readonly [number, number, number, number], w: number, d: number, h: number, n: number, wallNeeded = true): void => {
    let left = n;
    const [ax0, ax1, az0, az1] = area;
    for (let gz = az0 + 0.5; gz < az1 - 0.4 && left > 0; gz += 0.5) {
      for (let gx = ax0 + 0.5; gx < ax1 - 0.4 && left > 0; gx += 0.5) {
        for (const [ww, dd] of [[w, d], [d, w]] as const) {
          const r = { x0: gx - ww / 2, x1: gx + ww / 2, z0: gz - dd / 2, z1: gz + dd / 2 };
          if (r.x0 < ax0 || r.x1 > ax1 || r.z0 < az0 || r.z1 > az1 || !deadSpace(r, h, wallNeeded)) continue;
          b.box(gx, h / 2, gz, ww, h, dd, C.pallet, 0, 0, true, false);
          const p = b.boxes[b.boxes.length - 1]!;
          p.noLedge = true;
          solids.push(aabbOf(p));
          placed.push(r);
          look(kind, gx, gz, ww, dd, h);
          rep.clutter.push({ kind, x: gx, z: gz, w: ww, d: dd, h, section: sectionAt(gx, gz) + 1 });
          left--;
          break;
        }
      }
    }
    if (left > 0) rep.dropped[kind] = (rep.dropped[kind] ?? 0) + left;
  };
  // the forklift parks on a hall floor (section 2's, else section 3's south of the offices)
  scatter('forklift', [-24, -4, -6, 12], 1.2, 2.6, 2.15, 1, false);
  if (!rep.clutter.some((c) => c.kind === 'forklift')) {
    delete rep.dropped.forklift;
    scatter('forklift', [-4, 16, -6, 12], 1.2, 2.6, 2.15, 1, false);
  }
  // the halls' floors only (offices get lockers and desks below; section 1's yard keeps its own cover design)
  const HALLS: readonly (readonly [number, number, number, number])[] = [
    [-24, -8, -18, -8.8], // section 1: the goods-in bay
    [8, 24, -18, -8.8], // section 1: the workshop
    [-24, -4, -6, 18], // section 2: the storage hall
    [-4, 24, -8.8, 12], // section 3: the assembly hall
    [8, 16, 12, 18], // section 3: the parts store
  ];
  for (const a of HALLS) {
    scatter('pallets', a, 1.2, 1.0, 1.3, 2, false);
    scatter('drums', a, 1.24, 0.6, 0.9, 2, false);
    scatter('cartons', a, 1.0, 0.8, 0.8, 1, false);
  }
  // side rooms: a locker bank and a desk where there is room
  const ROOMS: readonly (readonly [number, number, number, number])[] = [
    [-8, -2, -18, -13.8], // reception
    [-2, 3, -18, -13.8], // transport office
    [1, 8, -10.8, -8.8], // mess
    [-8, -3, -10.8, -8.8], // comms
    [2, 8, 12, 18], // manager's office
    [-4, 2, 12, 18], // office
  ];
  for (const r of ROOMS) {
    scatter('lockers', r, 1.2, 0.5, 1.9, 1);
    scatter('desk', r, 1.4, 0.7, 0.75, 1, false);
  }
  dressReport.last = rep;
  return rep;
}
