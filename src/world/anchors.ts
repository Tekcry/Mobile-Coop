import { hyp2 } from '../core/mathx';
/**
 * Traversal anchors (pure: no Babylon/DOM), unit-tested. Mirrors `cover/coverData.ts`.
 *
 * Attached locomotion (ladders, pipes, hanging on ledges, ducts, ziplines) and the world objects the
 * player moves through (windows, doors) are described here as plain data placed by `LevelBuilder` and
 * stored in the `BuiltLevel` / `MapLayout`. Ledges are generated automatically from box tops (like cover
 * faces) and can be overridden per map. The helpers answer "which anchor is in reach, and where do the
 * hands and feet go on it" so the traversal state machine and the AI never touch geometry directly.
 */

export interface P3 {
  x: number;
  y: number;
  z: number;
}

export type AnchorKind = 'ladder' | 'pipeV' | 'pipeH' | 'ledge' | 'duct' | 'window' | 'door' | 'zipline' | 'split' | 'rappel' | 'fence';

interface AnchorBase {
  /** Index in `TraversalAnchors.all` (stable for a built level; co-op sends it). */
  id: number;
  kind: AnchorKind;
}

/** A ladder against a wall. `base` and `top` are the climbing line at the rungs' face (base at the floor,
 *  top at the floor you step off onto); the climber faces `facing` (yaw, towards the wall). */
export interface Ladder extends AnchorBase {
  kind: 'ladder';
  base: P3;
  top: P3;
  facing: number;
  /** Rung spacing (m) and the width between the rails (m). */
  rung: number;
  width: number;
}

/** A vertical pipe (drainpipe). The climber faces `side` (yaw, towards the pipe). */
export interface PipeVertical extends AnchorBase {
  kind: 'pipeV';
  base: P3;
  top: P3;
  side: number;
  radius: number;
}

/** A horizontal pipe to hang from hand over hand; `a`/`b` are the pipe's axis ends at `hangHeight`. */
export interface PipeHorizontal extends AnchorBase {
  kind: 'pipeH';
  a: P3;
  b: P3;
  hangHeight: number;
  radius: number;
}

/** A ledge lip: `a` -> `b` along the top edge at height `top`, `nx/nz` pointing out over the drop. */
export interface Ledge extends AnchorBase {
  kind: 'ledge';
  a: P3;
  b: P3;
  top: number;
  nx: number;
  nz: number;
  /** Unit tangent a -> b and length. */
  tx: number;
  tz: number;
  len: number;
  /** Height of the face below the lip (m). */
  drop: number;
  canHang: boolean;
  canClimbUp: boolean;
  /** Ledge continuing round the corner at a / at b (-1 = none) and whether that corner is inside. */
  nextA: number;
  nextB: number;
  /** Source piece (box index + 1; 0 = manual). */
  piece: number;
}

export interface Grate {
  pos: P3;
  /** Outward normal of the grate (wall vent: horizontal; ceiling vent: (0,-1,0); floor vent: (0,1,0)). */
  nx: number;
  ny: number;
  nz: number;
  where: 'wall' | 'ceiling' | 'floor';
}

/** A crawlable duct: a polyline at the crawler's feet height, with grates at the ends (and along it). */
export interface Duct extends AnchorBase {
  kind: 'duct';
  path: P3[];
  entry: Grate;
  exit: Grate;
  /** Peek grates along the path (look through, drop through). */
  grates: Grate[];
}

/** A window: frame centre, size and yaw (the frame's normal is the yaw's forward). */
export interface WindowAnchor extends AnchorBase {
  kind: 'window';
  c: P3;
  w: number;
  h: number;
  yaw: number;
  sillHeight: number;
  breakable: boolean;
  /** Open (vault through) or glazed (break then vault). */
  open: boolean;
}

/** A hinged door: hinge at the floor, leaf `width` along `yaw` when closed, opening by `swing` (+1 / -1). */
export interface Door extends AnchorBase {
  kind: 'door';
  hinge: P3;
  width: number;
  height: number;
  yaw: number;
  swing: 1 | -1;
  locked: boolean;
  breachable: boolean;
}

/** A zipline from `a` (high end) to `b`, at the cable. */
export interface Zipline extends AnchorBase {
  kind: 'zipline';
  a: P3;
  b: P3;
}

/**
 * (3.2.0) A split jump gap: two tall walls facing each other a body's span apart (`player/splitJump.ts`
 * `findSplitGaps`, generated at build time). `a` -> `b` is the corridor's centre line on the floor; `nx/nz` the
 * first wall's normal (across the gap).
 */
export interface SplitAnchor extends AnchorBase {
  kind: 'split';
  a: P3;
  b: P3;
  tx: number;
  tz: number;
  nx: number;
  nz: number;
  len: number;
  width: number;
  height: number;
}

/**
 * (3.2.0) A rappel point at a roof / mezzanine edge: `top` on the edge at the roof's floor height, `nx/nz` the
 * wall's outward normal (where the rope hangs), `length` the drop to the floor below.
 */
export interface RappelPoint extends AnchorBase {
  kind: 'rappel';
  top: P3;
  nx: number;
  nz: number;
  length: number;
}

/** (3.2.0) A chain-link fence: `a` -> `b` along its foot on the floor, `height` tall; `nx/nz` one side's normal. */
export interface Fence extends AnchorBase {
  kind: 'fence';
  a: P3;
  b: P3;
  height: number;
  tx: number;
  tz: number;
  nx: number;
  nz: number;
  len: number;
}

export type Anchor = Ladder | PipeVertical | PipeHorizontal | Ledge | Duct | WindowAnchor | Door | Zipline | SplitAnchor | RappelPoint | Fence;

/** Box piece as the generator sees it (same shape as `CoverBox`). */
export interface AnchorBox {
  c: readonly [number, number, number];
  s: readonly [number, number, number];
  yaw: number;
  pitch: number;
  collide: boolean;
  visible?: boolean;
  /** Never generate ledges from this piece. */
  noLedge?: boolean;
}

/** Ledge rules (m). */
export const LEDGE = {
  /** A face must drop at least this far below the lip to be hung from (shorter is a mantle / vault). */
  minDrop: 1.9,
  /** Shortest usable lip. */
  minLen: 0.6,
  /** Top depth needed to climb up onto it (else hang only: a thin wall); a 0.4 m wall top is walkable. */
  climbDepth: 0.38,
  /** Clearance above the lip that must be free of other pieces to grab it. */
  clearAbove: 0.35,
  /** Usable range keeps the hands off the corners. */
  edgeMargin: 0.25,
  /** Sampling step when cutting lips around overlapping pieces. */
  sample: 0.2,
} as const;

/** Body placement hanging from a lip (proportions at 1.75 m; callers scale). */
export const HANG = {
  /** Feet below the lip (arms overhead, a slight bend). */
  drop: 1.9,
  /** Body centre out from the face. */
  out: 0.22,
} as const;

/** Reach bands for attaching (m, from the feet). */
export const REACH = {
  /** Lip heights above the feet that can be jumped to and grabbed. */
  grabMin: 1.6,
  grabMax: 2.7,
  /** Horizontal reach to a lip, ladder or pipe. */
  horiz: 0.85,
  /** Standing on top: how close to the lip to lower into a hang. */
  lowerIn: 0.7,
  /** Ladder top entry: how close to the top. */
  ladderTop: 0.9,
  /** Zipline: how close to the high end. */
  zip: 1.3,
} as const;

/** Every anchor of a built level, by kind and in one list (ids index `all`). */
export class TraversalAnchors {
  readonly all: Anchor[] = [];
  readonly ladders: Ladder[] = [];
  readonly pipesV: PipeVertical[] = [];
  readonly pipesH: PipeHorizontal[] = [];
  readonly ledges: Ledge[] = [];
  readonly ducts: Duct[] = [];
  readonly windows: WindowAnchor[] = [];
  readonly doors: Door[] = [];
  readonly ziplines: Zipline[] = [];
  readonly splits: SplitAnchor[] = [];
  readonly rappels: RappelPoint[] = [];
  readonly fences: Fence[] = [];

  /** Adds an anchor (its id is assigned here) and returns it. */
  add<T extends Anchor>(a: Omit<T, 'id'> & { id?: number }): T {
    const x = a as T;
    x.id = this.all.length;
    this.all.push(x);
    switch (x.kind) {
      case 'ladder':
        this.ladders.push(x);
        break;
      case 'pipeV':
        this.pipesV.push(x);
        break;
      case 'pipeH':
        this.pipesH.push(x);
        break;
      case 'ledge':
        this.ledges.push(x);
        break;
      case 'duct':
        this.ducts.push(x);
        break;
      case 'window':
        this.windows.push(x);
        break;
      case 'door':
        this.doors.push(x);
        break;
      case 'zipline':
        this.ziplines.push(x);
        break;
      case 'split':
        this.splits.push(x);
        break;
      case 'rappel':
        this.rappels.push(x);
        break;
      case 'fence':
        this.fences.push(x);
        break;
    }
    return x;
  }

  get(id: number): Anchor | null {
    return this.all[id] ?? null;
  }

  get size(): number {
    return this.all.length;
  }
}

/** Is a point inside an (upright or yawed, unpitched) box, grown by `pad`? */
export function insideBox(b: AnchorBox, x: number, y: number, z: number, pad = 0): boolean {
  if (Math.abs(y - b.c[1]) > b.s[1] / 2 + pad) return false;
  const s = Math.sin(b.yaw);
  const c = Math.cos(b.yaw);
  const dx = x - b.c[0];
  const dz = z - b.c[2];
  // inverse of the cover generator's rotation (local x right, z forward)
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  return Math.abs(lx) <= b.s[0] / 2 + pad && Math.abs(lz) <= b.s[2] / 2 + pad;
}

/**
 * Ledges from box tops: every solid, visible, unpitched box tall enough to hang from gives one lip per top
 * edge, cut where another solid piece sits on or against it (stacked crates, a wall meeting it, a roof slab
 * resting on it). Lips on the same top are linked round their outside corners.
 */
export function generateLedges(boxes: readonly AnchorBox[], out: TraversalAnchors = new TraversalAnchors()): TraversalAnchors {
  const solid = boxes.filter((b) => b.collide && Math.abs(b.pitch) < 1e-3);
  let piece = 0;
  for (const b of boxes) {
    piece++;
    if (!b.collide || b.visible === false || b.noLedge || Math.abs(b.pitch) > 1e-3) continue;
    const [w, h, d] = b.s;
    const top = b.c[1] + h / 2;
    const bottom = b.c[1] - h / 2;
    // a lip high enough off the floor to hang from (pieces resting on the ground need the full face)
    if (top < LEDGE.minDrop || (h < LEDGE.minDrop && bottom < 0.05)) continue;
    if (Math.max(w, d) < LEDGE.minLen) continue;
    const s = Math.sin(b.yaw);
    const c = Math.cos(b.yaw);
    const rot = (lx: number, lz: number): [number, number] => [b.c[0] + lx * c + lz * s, b.c[2] - lx * s + lz * c];
    const hw = w / 2;
    const hd = d / 2;
    // counter-clockwise from above, as the cover faces: +z, -x, -z, +x
    const corners: [number, number][] = [rot(hw, hd), rot(-hw, hd), rot(-hw, -hd), rot(hw, -hd)];
    const depths = [d, w, d, w];
    // broad phase: only pieces near this top (bounding circles in XZ, overlapping heights) can cut its lips
    const rb = hyp2(w, d) / 2 + 0.6;
    const near: AnchorBox[] = [];
    for (let k = 0; k < solid.length; k++) {
      const o = solid[k]!;
      if (o === b) continue;
      const ro = hyp2(o.s[0], o.s[2]) / 2;
      if (hyp2(o.c[0] - b.c[0], o.c[2] - b.c[2]) > rb + ro) continue;
      if (o.c[1] - o.s[1] / 2 > top + LEDGE.clearAbove + 0.05 || o.c[1] + o.s[1] / 2 < top - 0.6) continue;
      near.push(o);
    }
    const first = out.ledges.length;
    const whole: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i]!;
      const e = corners[(i + 1) % 4]!;
      const before = out.ledges.length;
      cutLip(out, near, b, a, e, top, depths[i]!, piece);
      // a single uncut lip spanning the whole edge keeps its corner links
      const one = out.ledges.length - before === 1 ? out.ledges[out.ledges.length - 1]! : null;
      whole.push(!!one && one.len > hyp2(e[0] - a[0], e[1] - a[1]) - 1e-3);
    }
    // link the whole lips round the top's outside corners
    const made = out.ledges.slice(first);
    if (made.length === 4 && whole.every(Boolean)) {
      for (let i = 0; i < 4; i++) {
        const cur = made[i]!;
        const next = made[(i + 1) % 4]!;
        cur.nextB = next.id;
        next.nextA = cur.id;
      }
    }
  }
  return out;
}

/** One top edge a -> e, cut into runs whose lip is free (nothing on it, nothing pressed against its face). */
function cutLip(out: TraversalAnchors, solid: readonly AnchorBox[], self: AnchorBox, a: [number, number], e: [number, number], top: number, depth: number, piece: number): void {
  const dx = e[0] - a[0];
  const dz = e[1] - a[1];
  const len = hyp2(dx, dz);
  if (len < LEDGE.minLen) return;
  const tx = dx / len;
  const tz = dz / len;
  // outward normal (corners are counter-clockwise from above)
  const nx = tz;
  const nz = -tx;
  const n = Math.max(2, Math.ceil(len / LEDGE.sample) + 1);
  let runStart = -1;
  const flush = (i0: number, i1: number): void => {
    const s0 = (i0 / (n - 1)) * len;
    const s1 = (i1 / (n - 1)) * len;
    if (s1 - s0 < LEDGE.minLen) return;
    const ax = a[0] + tx * s0;
    const az = a[1] + tz * s0;
    const bx = a[0] + tx * s1;
    const bz = a[1] + tz * s1;
    out.add<Ledge>({
      kind: 'ledge',
      a: { x: ax, y: top, z: az },
      b: { x: bx, y: top, z: bz },
      top,
      nx,
      nz,
      tx,
      tz,
      len: s1 - s0,
      // to the ground plane; the run-time probe measures the real floor under the lip
      drop: top,
      canHang: true,
      canClimbUp: depth >= LEDGE.climbDepth,
      nextA: -1,
      nextB: -1,
      piece,
    });
  };
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1)) * len;
    const x = a[0] + tx * s;
    const z = a[1] + tz * s;
    let free = true;
    for (let k = 0; k < solid.length && free; k++) {
      const o = solid[k]!;
      if (o === self) continue;
      // something resting on the lip, or occupying the space where the hands / body go
      if (insideBox(o, x - nx * 0.05, top + LEDGE.clearAbove * 0.5, z - nz * 0.05, 0.02)) free = false;
      else if (insideBox(o, x + nx * 0.2, top - 0.3, z + nz * 0.2, 0.02)) free = false;
    }
    if (free && runStart < 0) runStart = i;
    if ((!free || i === n - 1) && runStart >= 0) {
      flush(runStart, free ? i : i - 1);
      runStart = -1;
    }
  }
}

/** Manual ledge (overrides / additions in a map). */
export function makeLedge(ax: number, az: number, bx: number, bz: number, top: number, opts: { drop?: number; canHang?: boolean; canClimbUp?: boolean } = {}): Omit<Ledge, 'id'> {
  const len = hyp2(bx - ax, bz - az);
  const tx = (bx - ax) / (len || 1);
  const tz = (bz - az) / (len || 1);
  return {
    kind: 'ledge',
    a: { x: ax, y: top, z: az },
    b: { x: bx, y: top, z: bz },
    top,
    nx: tz,
    nz: -tx,
    tx,
    tz,
    len,
    drop: opts.drop ?? top,
    canHang: opts.canHang ?? true,
    canClimbUp: opts.canClimbUp ?? true,
    nextA: -1,
    nextB: -1,
    piece: 0,
  };
}

/** Remove generated ledges whose lip passes within `r` of (x, z) (manual override: "no ledge here"). */
export function suppressLedgesNear(anchors: TraversalAnchors, x: number, z: number, r: number): void {
  for (const l of anchors.ledges) {
    const q = closestOnSegment(l.a.x, l.a.z, l.b.x, l.b.z, x, z);
    if (hyp2(q.x - x, q.z - z) < r) l.canHang = l.canClimbUp = false;
  }
}

// --- geometry helpers

export interface Closest {
  /** Closest point on the anchor's line (XZ), its parameter along it (m) and the horizontal distance. */
  x: number;
  y: number;
  z: number;
  s: number;
  dist: number;
}

const tmpClosest: Closest = { x: 0, y: 0, z: 0, s: 0, dist: 0 };

/** Closest point on segment a -> b to (px, pz) in XZ. Returns a reused object. */
export function closestOnSegment(ax: number, az: number, bx: number, bz: number, px: number, pz: number): { x: number; z: number; s: number; len: number } {
  const dx = bx - ax;
  const dz = bz - az;
  const len = hyp2(dx, dz);
  const t = len > 1e-6 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (len * len))) : 0;
  segOut.x = ax + dx * t;
  segOut.z = az + dz * t;
  segOut.s = t * len;
  segOut.len = len;
  return segOut;
}
const segOut = { x: 0, z: 0, s: 0, len: 0 };

/** Closest point of an anchor to a world point (horizontal distance; y on the anchor). Reused result. */
export function closestOn(a: Anchor, x: number, y: number, z: number): Closest {
  const o = tmpClosest;
  switch (a.kind) {
    case 'ladder':
    case 'pipeV': {
      const lo = Math.min(a.base.y, a.top.y);
      const hi = Math.max(a.base.y, a.top.y);
      o.x = a.base.x;
      o.z = a.base.z;
      o.y = Math.max(lo, Math.min(hi, y));
      o.s = o.y - a.base.y;
      o.dist = hyp2(x - a.base.x, z - a.base.z);
      return o;
    }
    case 'rappel': {
      o.x = a.top.x;
      o.z = a.top.z;
      o.y = Math.max(a.top.y - a.length, Math.min(a.top.y, y));
      o.s = a.top.y - o.y;
      o.dist = hyp2(x - a.top.x, z - a.top.z);
      return o;
    }
    case 'pipeH':
    case 'zipline':
    case 'split':
    case 'fence':
    case 'ledge': {
      const q = closestOnSegment(a.a.x, a.a.z, a.b.x, a.b.z, x, z);
      o.x = q.x;
      o.z = q.z;
      o.s = q.s;
      o.y = a.kind === 'pipeH' ? a.hangHeight : a.kind === 'ledge' ? a.top : a.kind === 'split' || a.kind === 'fence' ? a.a.y : a.a.y + (a.b.y - a.a.y) * (q.len > 0 ? q.s / q.len : 0);
      o.dist = hyp2(x - q.x, z - q.z);
      return o;
    }
    case 'duct': {
      let best = Infinity;
      let along = 0;
      for (let i = 0; i + 1 < a.path.length; i++) {
        const p0 = a.path[i]!;
        const p1 = a.path[i + 1]!;
        const q = closestOnSegment(p0.x, p0.z, p1.x, p1.z, x, z);
        const d = hyp2(x - q.x, z - q.z);
        if (d < best) {
          best = d;
          o.x = q.x;
          o.z = q.z;
          o.y = p0.y + (p1.y - p0.y) * (q.len > 0 ? q.s / q.len : 0);
          o.s = along + q.s;
        }
        along += q.len;
      }
      o.dist = best;
      return o;
    }
    case 'window': {
      const tx = Math.cos(a.yaw);
      const tz = -Math.sin(a.yaw);
      const q = closestOnSegment(a.c.x - (tx * a.w) / 2, a.c.z - (tz * a.w) / 2, a.c.x + (tx * a.w) / 2, a.c.z + (tz * a.w) / 2, x, z);
      o.x = q.x;
      o.z = q.z;
      o.s = q.s;
      o.y = a.c.y - a.h / 2;
      o.dist = hyp2(x - q.x, z - q.z);
      return o;
    }
    case 'door': {
      const ex = a.hinge.x + Math.sin(a.yaw) * a.width;
      const ez = a.hinge.z + Math.cos(a.yaw) * a.width;
      const q = closestOnSegment(a.hinge.x, a.hinge.z, ex, ez, x, z);
      o.x = q.x;
      o.z = q.z;
      o.s = q.s;
      o.y = a.hinge.y;
      o.dist = hyp2(x - q.x, z - q.z);
      return o;
    }
  }
}

/** Length of an anchor's travel axis (m): height for ladders / vertical pipes, span otherwise. */
export function anchorLength(a: Anchor): number {
  switch (a.kind) {
    case 'ladder':
    case 'pipeV':
      return Math.abs(a.top.y - a.base.y);
    case 'pipeH':
    case 'zipline':
      return hyp2(a.b.x - a.a.x, a.b.z - a.a.z);
    case 'ledge':
    case 'split':
    case 'fence':
      return a.len;
    case 'rappel':
      return a.length;
    case 'duct': {
      let l = 0;
      for (let i = 0; i + 1 < a.path.length; i++) l += hyp2(a.path[i + 1]!.x - a.path[i]!.x, a.path[i + 1]!.z - a.path[i]!.z);
      return l;
    }
    case 'window':
      return a.w;
    case 'door':
      return a.width;
  }
}

/** Point at parameter `s` along a duct's path (feet height), and the travel direction there. */
export function ductPoint(d: Duct, s: number, out: P3 & { dx: number; dz: number }): P3 & { dx: number; dz: number } {
  let rest = Math.max(0, s);
  for (let i = 0; i + 1 < d.path.length; i++) {
    const p0 = d.path[i]!;
    const p1 = d.path[i + 1]!;
    const l = hyp2(p1.x - p0.x, p1.z - p0.z);
    if (rest <= l || i + 2 === d.path.length) {
      const t = l > 0 ? Math.min(1, rest / l) : 0;
      out.x = p0.x + (p1.x - p0.x) * t;
      out.y = p0.y + (p1.y - p0.y) * t;
      out.z = p0.z + (p1.z - p0.z) * t;
      out.dx = l > 0 ? (p1.x - p0.x) / l : 0;
      out.dz = l > 0 ? (p1.z - p0.z) / l : 1;
      return out;
    }
    rest -= l;
  }
  const p = d.path[0]!;
  out.x = p.x;
  out.y = p.y;
  out.z = p.z;
  out.dx = 0;
  out.dz = 1;
  return out;
}

/** Feet and facing while hanging from a ledge at `s` along it (scaled by body height). */
export function hangPoint(l: Ledge, s: number, height = 1.75, out: { x: number; y: number; z: number; yaw: number } = { x: 0, y: 0, z: 0, yaw: 0 }): { x: number; y: number; z: number; yaw: number } {
  const k = height / 1.75;
  const c = Math.max(Math.min(LEDGE.edgeMargin, l.len / 2), Math.min(l.len - Math.min(LEDGE.edgeMargin, l.len / 2), s));
  out.x = l.a.x + l.tx * c + l.nx * HANG.out * k;
  out.z = l.a.z + l.tz * c + l.nz * HANG.out * k;
  out.y = l.top - HANG.drop * k;
  // facing the wall: against the outward normal
  out.yaw = Math.atan2(-l.nx, -l.nz);
  return out;
}

/** World points for the two hands on a ledge lip at `s` (shoulder width apart, on the edge). */
export function lipGrips(l: Ledge, s: number, halfSpan: number, outL: P3, outR: P3): void {
  // facing the wall (forward f = -n), the climber's right is (f.z, -f.x) = (-nz, nx)
  const rx = -l.nz;
  const rz = l.nx;
  const sgn = rx * l.tx + rz * l.tz >= 0 ? 1 : -1;
  const cx = l.a.x + l.tx * s;
  const cz = l.a.z + l.tz * s;
  outR.x = cx + l.tx * halfSpan * sgn;
  outR.z = cz + l.tz * halfSpan * sgn;
  outL.x = cx - l.tx * halfSpan * sgn;
  outL.z = cz - l.tz * halfSpan * sgn;
  outL.y = outR.y = l.top;
}

/** Rung heights of a ladder (from just above the base to the top). */
export function rungHeights(l: Ladder): number[] {
  const out: number[] = [];
  const h = l.top.y - l.base.y;
  for (let y = l.rung; y < h - 0.05; y += l.rung) out.push(l.base.y + y);
  return out;
}

/** Nearest rung height to `y` (hands and feet lock to rungs). */
export function nearestRung(l: Ladder, y: number): number {
  const k = Math.round((y - l.base.y) / l.rung);
  const top = Math.floor((l.top.y - l.base.y - 0.05) / l.rung);
  return l.base.y + Math.max(1, Math.min(top, k)) * l.rung;
}

export type AttachEntry = 'bottom' | 'top' | 'below' | 'above' | 'side' | 'wall';

export interface ReachResult {
  anchor: Anchor;
  /** How the player would get on: from the bottom / top (ladder), jump up to (below) or lower onto
   *  (above) a lip, or alongside (pipes, zipline). */
  entry: AttachEntry;
  /** Parameter along the anchor where they attach (m). */
  s: number;
  dist: number;
  /** (3.2.0) Which way the body faces along a split gap (+1 towards b). */
  face?: 1 | -1;
}

/**
 * Can a standing player (feet at `x, y, z`, facing `dirX/dirZ`) attach to `a`? Returns how, or null.
 * Pure reach test: the run-time controller still probes the path (clear space, floor).
 */
export function reach(a: Anchor, x: number, y: number, z: number, dirX: number, dirZ: number): ReachResult | null {
  const q = closestOn(a, x, y, z);
  switch (a.kind) {
    case 'ladder': {
      const fx = Math.sin(a.facing);
      const fz = Math.cos(a.facing);
      if (Math.abs(y - a.base.y) < 0.4 && q.dist < REACH.horiz && dirX * fx + dirZ * fz > 0.2) return { anchor: a, entry: 'bottom', s: 0, dist: q.dist };
      const tdist = hyp2(x - a.top.x, z - a.top.z);
      // from the top: walking towards the edge the ladder hangs off (facing away from the wall it leans on)
      if (Math.abs(y - a.top.y) < 0.4 && tdist < REACH.ladderTop && -(dirX * fx + dirZ * fz) > 0.3) return { anchor: a, entry: 'top', s: a.top.y - a.base.y, dist: tdist };
      return null;
    }
    case 'pipeV': {
      const fx = Math.sin(a.side);
      const fz = Math.cos(a.side);
      if (q.dist > REACH.horiz || dirX * fx + dirZ * fz < 0.2) return null;
      if (y < a.base.y - 0.4 || y > a.top.y - 1.2) return null;
      return { anchor: a, entry: 'side', s: Math.max(0, y - a.base.y), dist: q.dist };
    }
    case 'pipeH': {
      const up = a.hangHeight - y;
      if (up < REACH.grabMin || up > REACH.grabMax || q.dist > REACH.horiz * 0.7) return null;
      return { anchor: a, entry: 'below', s: q.s, dist: q.dist };
    }
    case 'ledge': {
      if (!a.canHang) return null;
      if (q.s < LEDGE.edgeMargin * 0.5 || q.s > a.len - LEDGE.edgeMargin * 0.5) return null;
      // which side of the lip the feet are on: out over the drop (+) or on top (-)
      const side = (x - q.x) * a.nx + (z - q.z) * a.nz;
      const up = a.top - y;
      if (side > 0 && up >= REACH.grabMin && up <= REACH.grabMax && q.dist < REACH.horiz && -(dirX * a.nx + dirZ * a.nz) > 0.3) return { anchor: a, entry: 'below', s: q.s, dist: q.dist };
      if (side <= 0 && Math.abs(up) < 0.15 && q.dist < REACH.lowerIn && dirX * a.nx + dirZ * a.nz > 0.3) return { anchor: a, entry: 'above', s: q.s, dist: q.dist };
      return null;
    }
    case 'zipline': {
      const d = hyp2(x - a.a.x, z - a.a.z);
      const up = a.a.y - y;
      if (d > REACH.zip || up < 1.5 || up > 2.6) return null;
      return { anchor: a, entry: 'side', s: 0, dist: d };
    }
    case 'duct': {
      const g = a.entry;
      const d = hyp2(x - g.pos.x, z - g.pos.z);
      if (d > 1.1 || Math.abs(g.pos.y - y) > 1.4) return null;
      // facing into the vent
      if (g.where === 'wall' && -(dirX * g.nx + dirZ * g.nz) < 0.3) return null;
      return { anchor: a, entry: 'side', s: 0, dist: d };
    }
    case 'window': {
      // from either side, facing through it, close enough, the sill at vault height, room to pass
      const nx = Math.sin(a.yaw);
      const nz = Math.cos(a.yaw);
      const rx = x - a.c.x;
      const rz = z - a.c.z;
      const side = rx * nx + rz * nz;
      const lat = rx * nz - rz * nx;
      if (Math.abs(side) < 0.25 || Math.abs(side) > 1.4 || Math.abs(lat) > a.w / 2 - 0.2 || a.h < 0.9) return null;
      const up = a.sillHeight - y;
      if (up < 0.3 || up > 1.3) return null;
      if (-Math.sign(side) * (dirX * nx + dirZ * nz) < 0.6) return null;
      return { anchor: a, entry: 'side', s: lat + a.w / 2, dist: Math.abs(side) };
    }
    case 'door': {
      if (q.dist > 1.3 || Math.abs(q.y - y) > 0.4) return null;
      return { anchor: a, entry: 'side', s: q.s, dist: q.dist };
    }
    case 'split':
      // (offered by the attach controller's own probe: `player/splitJump.ts` `splitReach`)
      return null;
    case 'rappel': {
      // on the roof at the point, facing out over the edge
      if (Math.abs(y - a.top.y) > 0.4 || q.dist > RAPPEL_REACH || dirX * a.nx + dirZ * a.nz < 0.3) return null;
      // (not out past the edge already)
      if ((x - a.top.x) * a.nx + (z - a.top.z) * a.nz > 0.2) return null;
      return { anchor: a, entry: 'above', s: 0, dist: q.dist };
    }
    case 'fence': {
      if (Math.abs(y - a.a.y) > 0.4 || q.dist > FENCE_REACH || q.s < 0.4 || q.s > a.len - 0.4) return null;
      const side = (x - q.x) * a.nx + (z - q.z) * a.nz >= 0 ? 1 : -1;
      // facing the fence from this side
      if (-(dirX * a.nx + dirZ * a.nz) * side < 0.5) return null;
      return { anchor: a, entry: 'side', s: q.s, dist: q.dist, face: side };
    }
  }
}

/** (3.2.0) Reach to a rappel point / a fence from the floor (m; `config/movement.ts` RAPPEL.reach / FENCE.reach). */
export const RAPPEL_REACH = 0.9;
export const FENCE_REACH = 0.85;

/** Best anchor in reach (smallest distance, ties to the one most in front). `kinds` filters. */
export function nearestInReach(
  anchors: TraversalAnchors,
  x: number,
  y: number,
  z: number,
  dirX: number,
  dirZ: number,
  kinds?: readonly AnchorKind[],
  accept?: (r: ReachResult) => boolean,
): ReachResult | null {
  let best: ReachResult | null = null;
  let bestScore = Infinity;
  const all = anchors.all;
  for (let i = 0; i < all.length; i++) {
    const a = all[i]!;
    if (kinds && !kinds.includes(a.kind)) continue;
    // cheap reject before the full test
    const q = closestOn(a, x, y, z);
    if (q.dist > 3) continue;
    const r = reach(a, x, y, z, dirX, dirZ);
    if (!r || (accept && !accept(r))) continue;
    // a placed climber (ladder, drainpipe) or vent beats the lip beside it
    const placed = a.kind === 'ladder' || a.kind === 'pipeV' || a.kind === 'duct' || a.kind === 'zipline' || a.kind === 'rappel' || a.kind === 'fence';
    const score = r.dist - (placed ? 0.6 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

/** Anchors of `kinds` within `radius` (XZ) of a point, nearest first (for prompts and the AI). */
export function anchorsNear(anchors: TraversalAnchors, x: number, y: number, z: number, radius: number, kinds?: readonly AnchorKind[]): { anchor: Anchor; dist: number }[] {
  const out: { anchor: Anchor; dist: number }[] = [];
  for (const a of anchors.all) {
    if (kinds && !kinds.includes(a.kind)) continue;
    const q = closestOn(a, x, y, z);
    if (q.dist <= radius) out.push({ anchor: a, dist: q.dist });
  }
  out.sort((p, q) => p.dist - q.dist);
  return out;
}

/**
 * The lip continuing from one end of a ledge (`side` -1 = the a end, 1 = the b end): its linked outside-corner
 * neighbour, else any hangable lip at the same height whose end meets this one (an inside corner or a
 * collinear neighbour). Returns the ledge and the parameter to continue at (just inside its meeting end).
 */
export function ledgeContinuation(anchors: TraversalAnchors, l: Ledge, side: -1 | 1, gap = 0.45): { ledge: Ledge; s: number } | null {
  const link = side < 0 ? l.nextA : l.nextB;
  const ex = side < 0 ? l.a.x : l.b.x;
  const ez = side < 0 ? l.a.z : l.b.z;
  if (link >= 0) {
    const n = anchors.get(link);
    if (n && n.kind === 'ledge' && n.canHang) return { ledge: n, s: side < 0 ? n.len - LEDGE.edgeMargin : LEDGE.edgeMargin };
  }
  let best: { ledge: Ledge; s: number } | null = null;
  let bd = gap;
  for (const o of anchors.ledges) {
    if (o === l || !o.canHang || Math.abs(o.top - l.top) > 0.12) continue;
    // never fold back onto a lip facing the opposite way
    if (o.nx * l.nx + o.nz * l.nz < -0.5) continue;
    const da = hyp2(o.a.x - ex, o.a.z - ez);
    const db = hyp2(o.b.x - ex, o.b.z - ez);
    if (da < bd) {
      bd = da;
      best = { ledge: o, s: Math.min(o.len / 2, LEDGE.edgeMargin) };
    }
    if (db < bd) {
      bd = db;
      best = { ledge: o, s: Math.max(o.len / 2, o.len - LEDGE.edgeMargin) };
    }
  }
  return best;
}

/** Grip point of an anchor nearest a point (ledge lip / pipe axis / rung line), for jump targets. */
function gripNear(a: Anchor, x: number, y: number, z: number, out: P3 & { s: number }): boolean {
  switch (a.kind) {
    case 'ledge': {
      if (!a.canHang) return false;
      const q = closestOnSegment(a.a.x, a.a.z, a.b.x, a.b.z, x, z);
      const m = Math.min(LEDGE.edgeMargin, a.len / 2);
      out.s = Math.max(m, Math.min(a.len - m, q.s));
      out.x = a.a.x + a.tx * out.s;
      out.z = a.a.z + a.tz * out.s;
      out.y = a.top;
      return true;
    }
    case 'pipeH': {
      const q = closestOnSegment(a.a.x, a.a.z, a.b.x, a.b.z, x, z);
      out.s = Math.max(0.2, Math.min(q.len - 0.2, q.s));
      const t = q.len > 0 ? out.s / q.len : 0;
      out.x = a.a.x + (a.b.x - a.a.x) * t;
      out.z = a.a.z + (a.b.z - a.a.z) * t;
      out.y = a.hangHeight;
      return true;
    }
    case 'pipeV':
    case 'ladder': {
      out.x = a.base.x;
      out.z = a.base.z;
      out.y = Math.max(a.base.y + 1.6, Math.min(a.top.y, y));
      out.s = out.y - a.base.y - 1.75;
      return out.s >= -0.01;
    }
    default:
      return false;
  }
}

export interface JumpTarget {
  anchor: Anchor;
  /** Parameter to attach at and the grip point the hands go to. */
  s: number;
  grip: P3;
  dist: number;
}

/**
 * Ledge-to-ledge / pipe jump: the anchor within `maxGap` (m, grip to grip) of the current grip that lies most
 * along the wanted direction (`dirX/dirZ` horizontal, unit; `up` -1..1 for jumps up / down), excluding the one
 * held. Needs the direction to point at it (cos >= `minCos`). Lips facing `faceX/faceZ` (the held lip's normal)
 * are preferred.
 */
export function findJumpTarget(
  anchors: TraversalAnchors,
  from: P3,
  exclude: number,
  dirX: number,
  dirZ: number,
  up: number,
  maxGap = 2.5,
  minCos = 0.6,
  faceX = 0,
  faceZ = 0,
  clear?: (to: JumpTarget) => boolean,
): JumpTarget | null {
  const g = { x: 0, y: 0, z: 0, s: 0 };
  let best: JumpTarget | null = null;
  let bestScore = -Infinity;
  const all = anchors.all;
  for (let i = 0; i < all.length; i++) {
    const a = all[i]!;
    if (a.id === exclude) continue;
    if (a.kind !== 'ledge' && a.kind !== 'pipeH' && a.kind !== 'pipeV' && a.kind !== 'ladder') continue;
    // a cheap reject: far anchors
    const q = closestOn(a, from.x, from.y, from.z);
    if (q.dist > maxGap + 0.5) continue;
    if (!gripNear(a, from.x + dirX * 1.2, from.y + up * 1.2, from.z + dirZ * 1.2, g)) continue;
    const dx = g.x - from.x;
    const dy = g.y - from.y;
    const dz = g.z - from.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 0.5 || d > maxGap) continue;
    // a jump never goes more than 1.2 m up; a jump "up" (pushing into the wall) only takes something above
    if (dy > 1.2) continue;
    if (up > 0.6 && dy < 0.4) continue;
    const h = hyp2(dx, dz);
    // direction: horizontal intent and the vertical push
    const cos = h > 0.3 ? (dx * dirX + dz * dirZ) / h : 0;
    const vert = up !== 0 ? (dy / d) * Math.sign(up) : 0;
    const aim = up !== 0 && Math.abs(up) > 0.6 && h < 0.8 ? vert : cos;
    if (aim < minCos) continue;
    // a lip facing the same way as the one held reads as the continuation (hanging stays on that face)
    const same = a.kind === 'ledge' ? a.nx * faceX + a.nz * faceZ : 0;
    const score = aim * 2 - d * 0.4 + same * 0.6;
    if (score > bestScore) {
      const cand = { anchor: a, s: g.s, grip: { x: g.x, y: g.y, z: g.z }, dist: d };
      // the flight path must be free (never through the corner of a building)
      if (clear && !clear(cand)) continue;
      bestScore = score;
      best = cand;
    }
  }
  return best;
}
