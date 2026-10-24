import type { Vector3 } from '../../core/babylon';
import type { LevelBuilder } from '../levelBuilder';
import type { Door } from '../anchors';
import type { RoomDef } from '../rooms';
import type { MapLayout } from '../mapDef';
import type { ShutterSpec } from '../../game/kit/shutter';
import type { CoopLip } from './ctcourseGreybox';

/**
 * Tallow Wharf (`tallowWharf`, mission-framework GB0): the shared kit of the four section files (`tallowWharfW1..W4.ts`),
 * so the parallel slices never touch the map file. Pure; Babylon only through `core/babylon`. Frame: world metres, x east,
 * z north (north up), y up; a `y` below is the feet height of a walking surface; yaw 0 faces +z, PI / 2 faces +x
 * (`docs/missions/slices/GB-briefs.md` 0.4). The graph (`docs/missions/prototypes/campaign-map/graph.json`) is the source
 * of truth for ids, area boxes, storeys and link heights.
 */

const PI = Math.PI;

/** The map's bounds (graph `meta.bounds`: x 0-120, z 0-80; the canal is z 0-6 along the south). */
export const WHARF_BOUNDS = { minX: 0, maxX: 120, minZ: 0, maxZ: 80 } as const;

/** Section ids in play order (section index 0-3, the sector order). */
export const SECTION_IDS = ['W1', 'W2', 'W3', 'W4'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

/** Section boxes [x0, z0, x1, z1] (graph `meta.section_info[W].box`). */
export const SECTION_BOX: Readonly<Record<SectionId, readonly [number, number, number, number]>> = {
  W1: [0, 6, 40, 62],
  W2: [40, 48, 76, 80],
  W3: [82, 34, 120, 80],
  W4: [44, 0, 120, 34],
};

/** Walking-surface heights (feet): the street, the lofts (and the W1 gallery), the roofs, the W4 gantry, the W3 west-wing gallery, the coal chute floor, the W4 canal bed, the boat deck. */
export const Y = { ground: 0, loft: 4.5, roof: 8.4, gantry: 10, wingGallery: 4.2, chute: 4.4, canalBed: -4.4, boat: -1 } as const;

export const T = 0.3;
export const OUTER = 0.6;
export const DOOR_H = 2.1;
export const PARAPET = 1.1;
/** A drop guard's height over the walking surface: over the 1.8 m mantle, with no lip. */
export const SCREEN = 2.2;
/** The solid building mass tops out here. */
export const MASS_TOP = 12;
/** A crouch duct's interior (m): 1.5 m high is over the 1.15 m crouch. */
export const DUCT = { w: 1.2, h: 1.5 } as const;

/** The lamp circuits (switch groups) per section. */
export const GROUPS = {
  W1: { min: 60, max: 67 },
  W2: { min: 70, max: 76 },
  W3: { min: 80, max: 90 },
  W4: { min: 91, max: 97 },
} as const;

const WALL = '#8d887c';
const MASS = '#2f3236';
const STANDIN = '#6a6f74';
const DUCT_COLOR = '#5a5f63';
const WHITE: [number, number, number] = [1, 0.95, 0.88];

export interface P3 {
  x: number;
  y: number;
  z: number;
}

/** A partner throw: the thrower stands on `thrower`, the runner runs in from `runner`; `stage` is the staging box [x0, z0, x1, z1] the runner starts in. */
export interface WharfThrow {
  id: string;
  link: string;
  thrower: P3;
  runner: P3;
  stage: [number, number, number, number];
}
/** A pull-up: the holder braces at an edge (facing `yaw`), the partner jumps from `partner` on the floor below. */
export interface WharfPull {
  id: string;
  link: string;
  holder: P3;
  yaw: number;
  partner: P3;
}
/** A two-person rope: the holder braces at the top edge (facing `yaw`), the climber starts at `foot`. */
export interface WharfRope {
  id: string;
  link: string;
  holder: P3;
  yaw: number;
  foot: P3;
}
/** A solid drop guard: a `noLedge` screen `h` tall on floor `y` from `a` to `b` (no lip, over the mantle). */
export interface DropGuard {
  id: string;
  a: { x: number; z: number };
  b: { x: number; z: number };
  y: number;
  h: number;
}

/** One section of the map: its build function and the data the tests and the sector data read. */
export interface WharfSection {
  id: SectionId;
  build(b: LevelBuilder): void;
  rooms: RoomDef[];
  switches: NonNullable<MapLayout['switches']>;
  hideSpots: NonNullable<MapLayout['hideSpots']>;
  navSeeds: Vector3[];
  /** Boost lips (`floor` = the approach floor y). */
  lips: readonly CoopLip[];
  legUps: readonly { lip: string; x: number; y: number; z: number; facing: { x: number; z: number } }[];
  pulls: readonly WharfPull[];
  ropes: readonly WharfRope[];
  throws: readonly WharfThrow[];
  /** Reserved shutter openings, data only (brief 0.2): closed stand-ins are built, `placeShutter` is not called. */
  shutters: readonly ShutterSpec[];
  dropGuards: readonly DropGuard[];
  /** Doors a later slice locks or bolts, by name: the centre [x, y, z]. */
  doors: Readonly<Record<string, readonly [number, number, number]>>;
  debugPoints: { id: string; label: string; pos: Vector3; yaw: number }[];
  /** Spaces whose built size differs from the graph's area, with the reason (the size test reads it). */
  deviations: readonly { space: string; why: string }[];
  entry: readonly [number, number, number];
  exit: readonly [number, number, number];
}

/** An empty section (the GB0 stub): `entry` and `exit` are the no-bypass test's ends. */
export function emptySection(id: SectionId, entry: readonly [number, number, number], exit: readonly [number, number, number]): WharfSection {
  return {
    id,
    build: () => {},
    rooms: [],
    switches: [],
    hideSpots: [],
    navSeeds: [],
    lips: [],
    legUps: [],
    pulls: [],
    ropes: [],
    throws: [],
    shutters: [],
    dropGuards: [],
    doors: {},
    debugPoints: [],
    deviations: [],
    entry,
    exit,
  };
}

/** A visible lamp fitting (no model: the glowing box), a real registry light (a copy of `campusS2.ts` `lamp`). */
export function lamp(
  b: LevelBuilder,
  x: number,
  y: number,
  z: number,
  o: { r: number; i: number; group: number; colour?: [number, number, number]; cone?: Parameters<LevelBuilder['light']>[0]['cone']; w?: number; destructible?: boolean; electric?: boolean },
): void {
  const w = o.w ?? 0.5;
  b.light({
    kind: o.cone ? 'spot' : 'lamp',
    x,
    y,
    z,
    radius: o.r,
    intensity: o.i,
    color: o.colour ?? WHITE,
    cone: o.cone ?? null,
    group: o.group,
    on: true,
    destructible: o.destructible ?? true,
    electric: o.electric ?? true,
    fixture: { sx: w, sy: 0.1, sz: w / 2, oy: 0 },
  });
}

/**
 * A wall along x (`alongX`, at z = `at`) or along z (at x = `at`) from `a` to `e` between heights, with door gaps (heads over
 * them, overhead). A copy of `campusS2.ts` `wall`; every piece is `noLedge` and a plain (unturned) box. `gapH` is the gaps' clear
 * height (default `DOOR_H`).
 */
export function wall(
  b: LevelBuilder,
  alongX: boolean,
  at: number,
  a: number,
  e: number,
  gaps: readonly (readonly [number, number])[],
  y0: number,
  y1: number,
  th = T,
  color = WALL,
  gapH = DOOR_H,
): void {
  const i0 = b.boxes.length;
  const put = (s: number, f: number, lo: number, hi: number, head: boolean): void => {
    if (f - s < 0.01 || hi - lo < 0.01) return;
    const m = (s + f) / 2;
    if (alongX) b.box(m, (lo + hi) / 2, at, f - s, hi - lo, th, color);
    else b.box(at, (lo + hi) / 2, m, th, hi - lo, f - s, color);
    if (head) b.boxes[b.boxes.length - 1]!.overhead = true;
  };
  let s = a;
  for (const g of [...gaps].sort((p, q) => p[0] - q[0])) {
    put(s, g[0], y0, y1, false);
    put(g[0], g[1], y0 + gapH, y1, true);
    s = g[1];
  }
  put(s, e, y0, y1, false);
  b.mark(i0, { noLedge: true });
}

/** A door anchor in a wall along x (at z) or along z (at x), centred on `c`, on floor `y` (`campusS2.ts` `doorIn` with width and height). */
export function doorIn(
  b: LevelBuilder,
  alongX: boolean,
  at: number,
  c: number,
  y: number,
  o: { w?: number; h?: number; swing?: 1 | -1; locked?: boolean; breachable?: boolean } = {},
): Door {
  const w = o.w ?? 1.2;
  const opts = { height: o.h ?? DOOR_H, swing: o.swing ?? 1, ...(o.locked !== undefined ? { locked: o.locked } : {}), ...(o.breachable !== undefined ? { breachable: o.breachable } : {}) };
  return alongX ? b.door(c - w / 2, y, at, w, PI / 2, opts) : b.door(at, y, c - w / 2, w, 0, opts);
}

/** Solid building mass: one `noLedge` collide box over the plan rectangle from `y0` to `y1`. */
export function mass(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y0 = 0, y1 = MASS_TOP): void {
  const i0 = b.boxes.length;
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, MASS);
  b.mark(i0, { noLedge: true });
}

/** Box index -> tag, per builder: the closed shutter stand-ins (`shutter-standin:<id>`). The wiring slice deletes them by tag and calls `placeShutter`. */
export const STANDIN_TAGS = new WeakMap<LevelBuilder, Map<number, string>>();

/** The closed stand-in panel of a reserved shutter: a collide `noLedge` box filling the opening, 0.1 thick. Returns its box index. */
export function standIn(b: LevelBuilder, spec: ShutterSpec): number {
  const alongX = Math.abs(Math.sin(spec.yaw)) < 0.5;
  const i = b.boxes.length;
  b.box(spec.x, spec.y + spec.height / 2, spec.z, alongX ? spec.width : 0.1, spec.height, alongX ? 0.1 : spec.width, STANDIN);
  b.mark(i, { noLedge: true });
  let tags = STANDIN_TAGS.get(b);
  if (!tags) STANDIN_TAGS.set(b, (tags = new Map()));
  tags.set(i, `shutter-standin:${spec.id}`);
  return i;
}

const DUCT_WALL = 0.2;
const HALF = DUCT.w / 2;
const OFF = HALF + DUCT_WALL / 2;
const EDGE = HALF + DUCT_WALL;

/**
 * A crouch duct along a polyline (axis-aligned legs) whose floor is at `y`: a floor slab, two walls (0.2 thick), a lid; the
 * interior is `DUCT.w` x `DUCT.h` (1.2 x 1.5). All `noLedge`; the lid is `overhead`. The two ends are open; a turn is closed
 * on its outside and open on its inside.
 */
export function duct(b: LevelBuilder, pts: readonly [number, number][], y: number): void {
  const i0 = b.boxes.length;
  const n = pts.length;
  const dirs: [number, number][] = [];
  const lens: number[] = [];
  for (let i = 0; i + 1 < n; i++) {
    const dx = pts[i + 1]![0] - pts[i]![0];
    const dz = pts[i + 1]![1] - pts[i]![1];
    if (Math.abs(dx) > 1e-6 && Math.abs(dz) > 1e-6) throw new Error('duct: legs must be axis-aligned');
    const l = Math.abs(dx) + Math.abs(dz);
    dirs.push([Math.sign(dx), Math.sign(dz)]);
    lens.push(l);
  }
  /** A box on a leg: along-span [t0, t1] from the leg start, across-span [c0, c1] from the leg axis, heights [lo, hi]. */
  const leg = (i: number, t0: number, t1: number, c0: number, c1: number, lo: number, hi: number, lid = false): void => {
    if (t1 - t0 < 0.01) return;
    const [ax, az] = pts[i]!;
    const [dx, dz] = dirs[i]!;
    const tm = (t0 + t1) / 2;
    const cm = (c0 + c1) / 2;
    // left normal of the direction: (-dz, dx)
    const cx = ax + dx * tm - dz * cm;
    const cz = az + dz * tm + dx * cm;
    const alongZ = Math.abs(dz) > 0.5;
    const sx = alongZ ? c1 - c0 : t1 - t0;
    const sz = alongZ ? t1 - t0 : c1 - c0;
    b.box(cx, (lo + hi) / 2, cz, sx, hi - lo, sz, DUCT_COLOR);
    if (lid) b.boxes[b.boxes.length - 1]!.overhead = true;
  };
  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i]!;
    const L = lens[i]!;
    const prev = i > 0 ? dirs[i - 1]! : null;
    const next = i + 1 < dirs.length ? dirs[i + 1]! : null;
    const turnIn = prev !== null && (prev[0] !== d[0] || prev[1] !== d[1]);
    const turnOut = next !== null && (next[0] !== d[0] || next[1] !== d[1]);
    // the floor slab and the lid run through a turn (and past its outside corner)
    const f0 = turnIn ? -EDGE : 0;
    const f1 = turnOut ? L + EDGE : L;
    leg(i, f0, f1, -EDGE, EDGE, y - 0.2, y);
    leg(i, f0, f1, -EDGE, EDGE, y + DUCT.h, y + DUCT.h + 0.2, true);
    for (const s of [-1, 1] as const) {
      // the left normal of this leg is (-dz, dx); the wall on side s lies at s * OFF along it
      const nx = -d[1] * s;
      const nz = d[0] * s;
      let t0 = 0;
      let t1 = L;
      if (turnIn) {
        // the previous leg arrived along `prev`: a wall on its back side starts past its interior, the front side runs back over the corner
        const back = nx === -prev![0] && nz === -prev![1];
        t0 = back ? HALF : -EDGE;
      }
      if (turnOut) {
        // the next leg leaves along `next`: a wall on that side stops where its interior starts, the other runs on past the corner
        const toward = nx === next![0] && nz === next![1];
        t1 = toward ? L - HALF : L + EDGE;
      }
      leg(i, t0, t1, s * OFF - DUCT_WALL / 2, s * OFF + DUCT_WALL / 2, y, y + DUCT.h);
    }
  }
  b.mark(i0, { noLedge: true });
}

/** A drop guard: a `noLedge` collide screen 0.1 thick, `g.h` tall on `g.y`, from `a` to `b`. */
export function screen(b: LevelBuilder, g: DropGuard): void {
  const i0 = b.boxes.length;
  const dx = g.b.x - g.a.x;
  const dz = g.b.z - g.a.z;
  const len = Math.hypot(dx, dz);
  const cx = (g.a.x + g.b.x) / 2;
  const cz = (g.a.z + g.b.z) / 2;
  const cy = g.y + g.h / 2;
  if (Math.abs(dz) < 1e-6) b.box(cx, cy, cz, len, g.h, 0.1, STANDIN);
  else if (Math.abs(dx) < 1e-6) b.box(cx, cy, cz, 0.1, g.h, len, STANDIN);
  else b.box(cx, cy, cz, 0.1, g.h, len, STANDIN, Math.atan2(dx, dz));
  b.mark(i0, { noLedge: true });
}

/** A copy of the campus `inSection`: tags a section file's switches and hide spots with its section index (the co-op host mirrors them only while it is live). */
export function inSection<U extends object>(list: readonly U[], section: number): (U & { section: number })[] {
  return list.map((x) => ({ ...x, section }));
}
