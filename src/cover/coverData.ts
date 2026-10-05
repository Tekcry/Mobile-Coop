/**
 * Cover geometry. Pure (no Babylon/DOM), unit-tested.
 *
 * Every solid, upright map piece taller than a crouch (boxes, walls, crates, pillars) contributes
 * cover segments: one per side face, with an outward normal, a base height, a nominal low/high class
 * (low = crouch height, high = standing) and corner links. Box/pillar corners are outside corners
 * linked to the neighbouring face, so the player can pivot around them; inside corners and edges
 * blocked by other geometry are found at run time by probing (raycasts), which also re-checks the
 * real cover height (stacked crates, slopes) at the point of use.
 */

export interface CoverSegment {
  id: number;
  /** Face endpoints on the ground plane (on the surface, before standoff). */
  ax: number;
  az: number;
  bx: number;
  bz: number;
  /** Unit tangent a -> b and outward normal (towards where a player stands). */
  tx: number;
  tz: number;
  nx: number;
  nz: number;
  len: number;
  /** Base height and height of the piece above its base (m). */
  y: number;
  height: number;
  low: boolean;
  /** Thickness behind the face (for vaults). */
  depth: number;
  /** Neighbouring face around the outside corner at a / at b (-1 = none). */
  nextA: number;
  nextB: number;
  /** Source piece (faces of one piece share it). */
  piece: number;
}

export interface CoverBox {
  c: readonly [number, number, number];
  s: readonly [number, number, number];
  yaw: number;
  pitch: number;
  collide: boolean;
  visible?: boolean;
}

export interface CoverCyl {
  c: readonly [number, number, number];
  r: number;
  h: number;
  collide: boolean;
}

/** Cover classes by height (m). */
export const LOW_MIN = 0.75;
export const LOW_MAX = 1.45;
export const HIGH_MIN = 1.6;
/** Faces shorter than this are skipped (posts, poles). */
export const MIN_FACE = 0.5;

export function classifyHeight(h: number): 'low' | 'high' | null {
  if (h >= HIGH_MIN) return 'high';
  if (h >= LOW_MIN && h <= LOW_MAX) return 'low';
  return null;
}

/** Build segments for every eligible piece. */
export function buildCoverSegments(boxes: readonly CoverBox[], cyls: readonly CoverCyl[] = []): CoverSegment[] {
  const out: CoverSegment[] = [];
  let piece = 0;
  for (const b of boxes) {
    piece++;
    if (!b.collide || b.visible === false || Math.abs(b.pitch) > 1e-3) continue;
    const [w, h, d] = b.s;
    const cls = classifyHeight(h);
    if (!cls || Math.max(w, d) < MIN_FACE) continue;
    // local corners (x right = width, z forward = depth), rotated by yaw
    const s = Math.sin(b.yaw);
    const c = Math.cos(b.yaw);
    const rot = (lx: number, lz: number): [number, number] => [b.c[0] + lx * c + lz * s, b.c[2] - lx * s + lz * c];
    const hw = w / 2;
    const hd = d / 2;
    // counter-clockwise (seen from above): +z face, -x face, -z face, +x face
    const corners: [number, number][] = [rot(hw, hd), rot(-hw, hd), rot(-hw, -hd), rot(hw, -hd)];
    const depths = [d, w, d, w];
    const first = out.length;
    for (let i = 0; i < 4; i++) {
      const a = corners[i]!;
      const e = corners[(i + 1) % 4]!;
      pushFace(out, a, e, b.c[1] - h / 2, h, cls === 'low', depths[i]!, piece);
    }
    linkRing(out, first);
  }
  for (const cy of cyls) {
    piece++;
    if (!cy.collide) continue;
    const cls = classifyHeight(cy.h);
    if (!cls || cy.r * 2 < MIN_FACE * 0.8) continue;
    const n = 8;
    const first = out.length;
    // circumscribed octagon so the standoff clears the round surface
    const R = cy.r / Math.cos(Math.PI / n);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      pushFace(out, [cy.c[0] + Math.cos(a0) * R, cy.c[2] + Math.sin(a0) * R], [cy.c[0] + Math.cos(a1) * R, cy.c[2] + Math.sin(a1) * R], cy.c[1] - cy.h / 2, cy.h, cls === 'low', cy.r * 2, piece);
    }
    linkRing(out, first);
  }
  return out;
}

function pushFace(out: CoverSegment[], a: [number, number], b: [number, number], y: number, height: number, low: boolean, depth: number, piece: number): void {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const tx = dx / (len || 1);
  const tz = dz / (len || 1);
  // corners are counter-clockwise seen from above (+y): outward normal is the tangent turned clockwise
  out.push({ id: out.length, ax: a[0], az: a[1], bx: b[0], bz: b[1], tx, tz, nx: tz, nz: -tx, len, y, height, low, depth, nextA: -1, nextB: -1, piece });
}

/** Faces of one closed piece: b of face i meets a of face i+1 at an outside corner. */
function linkRing(out: CoverSegment[], first: number): void {
  const n = out.length - first;
  for (let i = 0; i < n; i++) {
    const cur = out[first + i]!;
    const next = out[first + ((i + 1) % n)]!;
    if (cur.len >= MIN_FACE && next.len >= MIN_FACE) {
      cur.nextB = next.id;
      next.nextA = cur.id;
    }
  }
}

/** Position along the face (0..len, unclamped) and signed distance in front of it. */
export function locate(seg: CoverSegment, x: number, z: number): { s: number; dist: number } {
  const px = x - seg.ax;
  const pz = z - seg.az;
  return { s: px * seg.tx + pz * seg.tz, dist: px * seg.nx + pz * seg.nz };
}

/** Body-to-surface gap when in cover: controller capsule radius plus a small clearance. */
export function coverStandoff(capsuleRadius: number, bodyDepthHalf: number): number {
  return Math.max(capsuleRadius, bodyDepthHalf) + 0.05;
}

/** Usable range along a face (keeps the capsule off the corners). */
export const EDGE_MARGIN = 0.22;

export interface SnapQuery {
  x: number;
  z: number;
  /** Feet height (cover pieces must be at this level). */
  y: number;
  /** Direction the player faces or moves (unit XZ). */
  dirX: number;
  dirZ: number;
  /** Max distance from the face to allow a snap. */
  reach?: number;
}

/**
 * Best cover face to snap to: in front of the face, within reach, at the player's level, roughly
 * facing it, and with the snap point inside the usable range. Returns the face and snap parameter.
 */
export function findSnap(segs: readonly CoverSegment[], q: SnapQuery): { seg: CoverSegment; s: number; dist: number } | null {
  const reach = q.reach ?? 1.5;
  let best: { seg: CoverSegment; s: number; dist: number } | null = null;
  let bestScore = Infinity;
  for (const seg of segs) {
    if (q.y < seg.y - 0.4 || q.y > seg.y + 0.6) continue;
    const { s, dist } = locate(seg, q.x, q.z);
    if (dist < 0 || dist > reach) continue;
    if (s < -0.1 || s > seg.len + 0.1) continue;
    if (seg.len < EDGE_MARGIN * 2 + 0.1) continue;
    const facing = -(q.dirX * seg.nx + q.dirZ * seg.nz);
    if (facing < 0.35) continue;
    const score = dist - facing * 0.6;
    if (score < bestScore) {
      bestScore = score;
      best = { seg, s: clampAlong(seg, s).s, dist };
    }
  }
  return best;
}

/** Clamp a position along the face to the usable range; reports which edge it is pressed against. */
export function clampAlong(seg: CoverSegment, s: number, margin = EDGE_MARGIN): { s: number; edge: -1 | 0 | 1 } {
  if (s <= margin) return { s: margin, edge: -1 };
  if (s >= seg.len - margin) return { s: seg.len - margin, edge: 1 };
  return { s, edge: 0 };
}

/** World position and facing (towards the surface) for a point along the face at `standoff`. */
export function coverPose(seg: CoverSegment, s: number, standoff: number): { x: number; z: number; yaw: number } {
  return {
    x: seg.ax + seg.tx * s + seg.nx * standoff,
    z: seg.az + seg.tz * s + seg.nz * standoff,
    yaw: Math.atan2(-seg.nx, -seg.nz),
  };
}

/** Move input (world XZ) projected onto the face tangent: signed speed fraction along a -> b. */
export function projectOnTangent(seg: CoverSegment, wishX: number, wishZ: number): number {
  return wishX * seg.tx + wishZ * seg.tz;
}

/** How much the input pushes away from the cover (towards the normal), 0..1. */
export function awayAmount(seg: CoverSegment, wishX: number, wishZ: number): number {
  return Math.max(0, wishX * seg.nx + wishZ * seg.nz);
}

/** Nearest edge to a point along the face: side (-1 = a, 1 = b) and distance to it. */
export function nearestEdge(seg: CoverSegment, s: number): { side: -1 | 1; dist: number } {
  return s < seg.len / 2 ? { side: -1, dist: s } : { side: 1, dist: seg.len - s };
}

/** Sample AI cover points along every face (feet positions at standoff, protecting along -normal). */
export function coverPointsFromSegments(
  segs: readonly CoverSegment[],
  standoff: number,
  spacing = 1.7,
): { x: number; y: number; z: number; nx: number; nz: number; low: boolean; seg: number; s: number }[] {
  const out: { x: number; y: number; z: number; nx: number; nz: number; low: boolean; seg: number; s: number }[] = [];
  for (const seg of segs) {
    if (seg.len < 1) continue;
    const n = Math.max(1, Math.round((seg.len - 0.4) / spacing));
    for (let i = 0; i < n; i++) {
      const s = n === 1 ? seg.len / 2 : 0.5 + ((seg.len - 1) * i) / (n - 1);
      const p = coverPose(seg, s, standoff + 0.2);
      out.push({ x: p.x, y: seg.y, z: p.z, nx: -seg.nx, nz: -seg.nz, low: seg.low, seg: seg.id, s });
    }
  }
  return out;
}
