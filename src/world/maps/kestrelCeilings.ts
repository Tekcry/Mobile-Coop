/**
 * ON13: the one copy of the ceiling types, ceiling hatches and crawl spaces, shared by the level editor (drawing, the
 * clear height rule) and the walk test (src/world/maps/kestrel.ts builds `ceilingBoxes` and `crawlBoxes`). Pure and
 * Babylon-free (tests/editor/ceilings.test.ts).
 *
 * A room's ceiling is `rooms[].ceiling` (height above the floor, 0 = none) with an optional `ceilingType` and `hatches`
 * (hatch centres). A crawl space is a `crawls[]` record (schema.md section 2): a route on a level at a height inside a
 * ceiling void. In the walk test a grid ceiling is drawn and lights as a solid (the light bake sees it, bible 5.1) but
 * does not collide: a tile pushes up anywhere and nobody stands on tiles (one-sided collision is not available). A
 * plasterboard ceiling and an exposed slab collide; a placed hatch is a hole in them. A crawl space is floor boards and
 * side boards (both collide); a hatch end leaves the hole open below.
 */
import { hyp2 } from '../../core/mathx';

export type Pt2 = [number, number];
export type Rect4 = [number, number, number, number];
export type CeilingType = 'grid' | 'plasterboard' | 'slab' | 'open';

export interface CeilingTypeDef {
  id: CeilingType;
  name: string;
  /** Thickness of the ceiling itself (the clear height of the void above takes it off). */
  thick: number;
  /** The walk test: it collides (blocks from below and can be stood on). */
  collide: boolean;
  /** The player can stand on it (only a slab). */
  stand: boolean;
  /** A grid ceiling: any tile pushes up, so a hatch is any tile; elsewhere only a placed access hatch opens. */
  anyTile: boolean;
  colour: string;
  src: string;
}

/** The ceiling types (ON13 decision 1), each with its source. */
export const CEILING_TYPES: readonly CeilingTypeDef[] = [
  { id: 'grid', name: 'Suspended grid tile', thick: 0.02, collide: false, stand: false, anyTile: true, colour: '#d8d5cb', src: 'editor default: typical product (600 x 600 mineral fibre lay-in tiles, 15-20 mm, in a T-bar grid)' },
  { id: 'plasterboard', name: 'Plasterboard', thick: 0.015, collide: true, stand: false, anyTile: false, colour: '#e2e0da', src: 'editor default: typical product (12.5 mm plasterboard on a metal frame)' },
  { id: 'slab', name: 'Exposed slab', thick: 0.15, collide: true, stand: true, anyTile: false, colour: '#8f9195', src: 'editor default: typical product (a 150 mm concrete deck)' },
  { id: 'open', name: 'Open / none', thick: 0, collide: false, stand: false, anyTile: false, colour: '#000000', src: 'ON13 brief decision 1 (no ceiling: the slab above shows)' },
];

/** A ceiling grid's tile (decision 4: a hatch on a grid ceiling is any tile). */
export const CEILING_TILE = { size: 0.6, src: 'editor default: typical product (600 x 600 lay-in tiles)' } as const;
/** A placed access hatch in plasterboard or a slab. */
export const ACCESS_HATCH = { size: 0.6, src: 'editor default: typical product (a 600 x 600 hinged access panel)' } as const;
/** Crawl boards (floor and sides of a crawl space). */
export const CRAWL_BOARD = { thick: 0.05, src: 'editor default: typical product (25 mm crawl boards on bearers, built 50 mm so the light bake sees them)' } as const;
/** Thinner pieces are left out of the light bake (src/voxel/lightShapes.ts CANON_MIN_THICK; the test keeps them equal), so a ceiling builds at least this thick. */
export const BUILD_MIN = 0.05;

export const CEILING_TYPE_IDS: readonly CeilingType[] = CEILING_TYPES.map((t) => t.id);

/** The fields of a room the ceiling reads. */
export interface CeilingRoom {
  id: string;
  level: string;
  kind: string;
  rect: Rect4 | readonly number[];
  ceiling?: number;
  ceilingType?: string;
  hatches?: Pt2[];
}

/** A room's ceiling type: its own, else open with no height, a grid in a corridor (handover R4), plasterboard elsewhere. */
export function ceilingType(r: Pick<CeilingRoom, 'kind' | 'ceiling' | 'ceilingType'>): CeilingTypeDef {
  if (!r.ceiling || r.ceiling <= 0) return CEILING_TYPES[3]!;
  const own = CEILING_TYPES.find((t) => t.id === r.ceilingType);
  if (own) return own;
  return CEILING_TYPES[r.kind === 'corridor' ? 0 : 1]!;
}

/** The side of a hatch in this ceiling (a tile on a grid, else an access hatch). */
export const hatchSize = (t: CeilingTypeDef): number => (t.anyTile ? CEILING_TILE.size : ACCESS_HATCH.size);

/** A hatch's square in plan. */
export function hatchRect(t: CeilingTypeDef, h: Pt2): Rect4 {
  const s = hatchSize(t) / 2;
  return [h[0] - s, h[1] - s, h[0] + s, h[1] + s];
}

/** `rect` less the holes, as rectangles (cut on every hole edge, rows merged). */
export function rectMinus(rect: Rect4, holes: readonly Rect4[]): Rect4[] {
  const [x0, z0, x1, z1] = rect;
  const hs = holes.map((h): Rect4 => [Math.max(x0, h[0]), Math.max(z0, h[1]), Math.min(x1, h[2]), Math.min(z1, h[3])]).filter((h) => h[2] > h[0] + 1e-6 && h[3] > h[1] + 1e-6);
  if (!hs.length) return [rect];
  const xs = [...new Set([x0, x1, ...hs.flatMap((h) => [h[0], h[2]])])].sort((a, b) => a - b);
  const zs = [...new Set([z0, z1, ...hs.flatMap((h) => [h[1], h[3]])])].sort((a, b) => a - b);
  const out: Rect4[] = [];
  for (let j = 0; j + 1 < zs.length; j++) {
    let run: Rect4 | null = null;
    for (let i = 0; i + 1 < xs.length; i++) {
      const cx = (xs[i]! + xs[i + 1]!) / 2;
      const cz = (zs[j]! + zs[j + 1]!) / 2;
      const hole = hs.some((h) => cx > h[0] && cx < h[2] && cz > h[1] && cz < h[3]);
      if (hole) {
        if (run) out.push(run);
        run = null;
      } else if (run) run[2] = xs[i + 1]!;
      else run = [xs[i]!, zs[j]!, xs[i + 1]!, zs[j + 1]!];
    }
    if (run) out.push(run);
  }
  return out;
}

/** One box the walk test builds (kestrel.ts: `b.box(c, s, colour, yaw, 0, collide)`; noLedge marks it). */
export interface CeilBox {
  id: string;
  c: [number, number, number];
  s: [number, number, number];
  yaw: number;
  colour: string;
  collide: boolean;
  noLedge: boolean;
}

/**
 * A room's ceiling as boxes (decision 6): the rect less its hatches, from the ceiling height up by the type's thickness
 * (at least BUILD_MIN, so the light bake sees it: decision 8). Open / none builds nothing. `floor` is the level's floor.
 */
export function ceilingBoxes(r: CeilingRoom, floor: number): CeilBox[] {
  const t = ceilingType(r);
  if (t.id === 'open' || !r.ceiling) return [];
  const th = Math.max(BUILD_MIN, t.thick);
  const y = floor + r.ceiling + th / 2;
  const holes = (r.hatches ?? []).map((h) => hatchRect(t, h));
  return rectMinus([r.rect[0]!, r.rect[1]!, r.rect[2]!, r.rect[3]!], holes).map((q, i) => ({ id: `${r.id}.ceiling.${i}`, c: [(q[0] + q[2]) / 2, y, (q[1] + q[3]) / 2], s: [q[2] - q[0], th, q[3] - q[1]], yaw: 0, colour: t.colour, collide: t.collide, noLedge: !t.stand }));
}

export type CrawlEndKind = 'hatch' | 'vent' | 'open';
/** A crawl space's end: a ceiling hatch (`ref` the room), an ON5 vent (`ref` the exterior piece) or open. */
export interface CrawlEnd {
  kind: CrawlEndKind;
  ref: string;
  at: Pt2;
}

/** A crawl space (schema.md section 2 `crawls[]`): `y0` (the boards' top) and `y1` (the underside above) over its level's floor. */
export interface CrawlRecord {
  id: string;
  level: string;
  name?: string;
  path: Pt2[];
  width: number;
  y0: number;
  y1: number;
  ends: CrawlEnd[];
  reason?: string;
  [k: string]: unknown;
}

export const CRAWL_COLOUR = '#a08a64';

/** A box along a -> b (centreline), `across` wide, y0 to y1. */
function along(id: string, a: Pt2, b: Pt2, across: number, y0: number, y1: number, collide: boolean, noLedge: boolean): CeilBox {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  return { id, c: [(a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2], s: [across, y1 - y0, hyp2(dx, dz)], yaw: Math.atan2(dx, dz), colour: CRAWL_COLOUR, collide, noLedge };
}

/**
 * A crawl space as boxes (decision 6): per leg the floor boards (top at y0) and a side board each side (y0 to y1). The
 * floor runs on half the width past a bend to cover the corner; the sides stop half the width short of a bend so the turn
 * stays open. At a hatch end the floor stops short of the hatch so the hole stays open below; side boards never give a
 * ledge. `hatch` is the hatch side at each end (0 for a vent or open end).
 */
export function crawlBoxes(c: CrawlRecord, floor: number, hatch: readonly [number, number] = [0, 0]): CeilBox[] {
  const out: CeilBox[] = [];
  const n = c.path.length;
  const T = CRAWL_BOARD.thick;
  const y0 = floor + c.y0;
  const y1 = floor + c.y1;
  for (let i = 0; i + 1 < n; i++) {
    const p = c.path[i]!;
    const q = c.path[i + 1]!;
    const len = hyp2(q[0] - p[0], q[1] - p[1]);
    if (len < 1e-6) continue;
    const ux = (q[0] - p[0]) / len;
    const uz = (q[1] - p[1]) / len;
    const at = (s: number): Pt2 => [p[0] + ux * s, p[1] + uz * s];
    // the floor: past a bend by half the width; short of a hatch by half the hatch (and the board)
    const f0 = i === 0 ? hatch[0] / 2 : -c.width / 2;
    const f1 = i + 2 === n ? len - hatch[1] / 2 : len + c.width / 2;
    if (f1 - f0 > 1e-6) out.push(along(`${c.id}.floor.${i}`, at(f0), at(f1), c.width + 2 * T, y0 - T, y0, true, false));
    // the sides: short of a bend by half the width
    const s0 = i === 0 ? 0 : c.width / 2 + T;
    const s1 = i + 2 === n ? len : len - c.width / 2 - T;
    if (s1 - s0 > 1e-6) {
      const nx = uz;
      const nz = -ux;
      for (const k of [1, -1] as const) {
        const o = (k * (c.width + T)) / 2;
        const a = at(s0);
        const b = at(s1);
        out.push(along(`${c.id}.side${k > 0 ? 'R' : 'L'}.${i}`, [a[0] + nx * o, a[1] + nz * o], [b[0] + nx * o, b[1] + nz * o], T, y0, y1, true, true));
      }
    }
  }
  return out;
}

/** The length of a crawl's route. */
export function crawlLength(c: Pick<CrawlRecord, 'path'>): number {
  let L = 0;
  for (let i = 0; i + 1 < c.path.length; i++) L += hyp2(c.path[i + 1]![0] - c.path[i]![0], c.path[i + 1]![1] - c.path[i]![1]);
  return L;
}
