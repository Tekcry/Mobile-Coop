/**
 * Marlow Yard facility shell, greybox (marlow-final slice 0d; SPEC sections 5-7, KIT.md; dressing is slice 0e).
 *
 * Vellan & Rook's rehearsal centre round the eight sets: the site floor, the outer and set-boundary walls (on the
 * `SET_BOX` edges) with the hall roofs, the instructor gallery (an H at y 4.5: the south strip, the bridge over L4 and the
 * north strip, out of bounds, glazed into the sets with `kit.glass`), the service corridors under it and the plant
 * room (closed void), the seven holding rooms L1-L7 (6 x 6 x 3.2 m, two 1.8 m `kit.slidingDoor`s, a pad, a clear glass
 * slot beside the far door onto the next set, cool LED read slots on the house circuits 91-97), the wall medkits in L4
 * and L7, the model plinth in L7 and the cash dock with the exit zone (group 98). Gallery lamps are group 90: decor, not
 * jam targets, not shootable, each stopping short of its glazing (LIGHTING-PLAN 2, `spillsPast`).
 *
 * Every facility piece is `noLedge` (the shell never offers a lip; co-op lips are the sets'), every slab `overhead`.
 * Wall boxes are plain `LevelBuilder` boxes in the kit's charcoal: 0e clads their faces (`kit.wallPanel`) without
 * moving them. Prototype starting values (G10).
 */
import { AIRLOCK_PAD_INSET } from '../../../config/course';
import type { AirlockDef } from '../../../game/course/courseDef';
import type { CamSpace } from '../../camSpaces';
import type { FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import type { PropPlacement } from '../../props/facilityProps';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { marlowCourseGroups } from '../../lighting/marlowCircuits';
import {
  DOCK_BOX,
  EXIT_ZONE,
  HALL_H,
  HOLD_BOX,
  HOLD_DOOR_W,
  HOLD_DOORS,
  HOLD_H,
  HOLD_IDS,
  holdDoorId,
  SET_BOX,
  SET_IDS,
  tally,
  type AmbientZoneDef,
  type Box,
  type DebugPoint,
  type HoldId,
  type LightSpot,
  type Pt,
  type RegisterRow,
  type ShotVantage,
} from './types';

/** Facility wall thickness (m). SPEC 5 says 0.45; 0.5 keeps every face on the voxel path's 5 cm grid (`tests/voxelFit.test.ts`
 *  failed on the A4 security room's 0.45 m faces at x 106.6 / z 19.6). */
export const FAC_T = 0.5;
/** The instructor gallery: floor slab top (its underside 4.2), the glazing's top, the roof slab's underside (m). */
export const GAL_FLOOR = 4.5;
export const GAL_SLAB = 0.3;
export const GAL_TOP = 7.5;
/** The gallery strips' plan boxes (SPEC 5): south strip, bridge over L4, north strip (stepping out to z 54 over A6). */
export const GALLERY_BOX: readonly Box[] = [
  [0, 20, 112, 24],
  [70, 24, 76, 48],
  [40, 48, 106, 52],
  [40, 52, 64, 54],
];
/** The plant room (closed void, SPEC 5: why A3's north wall has no glazing). */
export const PLANT_BOX: Box = [76, 13, 100, 20];
/** The holding rooms' glass slot beside the far door: its centre off the door's centre along the wall, its width, sill
 *  and height (m). The door's leaves pocket 0.9 m past each side, so the slot starts 1.7 m off centre. */
export const SLOT = { off: 2.2, w: 0.5, sill: 1.0, h: 1.2 } as const;
/** The cash dock's clear height (m). */
export const DOCK_H = 4.5;
/** The house circuits (`MARLOW_CIRCUITS`): gallery, holding rooms L1-L7 (91-97), the dock. */
export const GALLERY_GROUP = 90;
export const holdGroup = (h: HoldId): number => 90 + Number(h.slice(1));
export const DOCK_GROUP = 98;
/**
 * Holding-room doors built locked (A4 set doc A4-D3): L4's east door is A4's dock wicket, released from the floor side by
 * A4's push bar (an `egress` gate naming it). The course drives every course door's lock from its state each step
 * (`CourseMode.applyLocks`), so with no gate naming it the door is simply unlocked once the course runs.
 */
export const L4_EAST_DOOR = 'L4-near';
export const LOCKED_AT_START: readonly string[] = [L4_EAST_DOOR];
/** The wall medkits (SPEC 5: L4 and L7; A8's office medkit is the A8 set's). */
export const MEDKIT_HOLDS: readonly HoldId[] = ['L4', 'L7'];

const WALL = '#17191b';
const SLAB_C = '#202326';
const FLOOR_C = '#34373b';
const PAD_C = '#1f5c66';
const PLINTH_C = '#3a3226';
const WARM: [number, number, number] = [1.0, 0.8, 0.58];

/** What the facility gives the merge (`ctcourse.ts`). */
export interface FacilityPart {
  airlocks: AirlockDef[];
  /** Course door id (`L1-near` ... `L7-far`) -> door anchor id. */
  doors: Record<string, number>;
  exitZone: { box: [number, number, number, number]; floorY: number };
  /** The house circuits' course groups (90-98). */
  groups: Record<string, number>;
  ambientZones: AmbientZoneDef[];
  medkitWalls: { pos: Pt; yaw: number }[];
  navSeeds: Pt[];
  camSpaces: CamSpace[];
  debugPoints: DebugPoint[];
  register: RegisterRow[];
  lightSpots: LightSpot[];
  shotVantages: ShotVantage[];
  /** The props kit's placements in the shell (0e dressing: gallery interior, lounge pieces, holding-room benches). */
  props: PropPlacement[];
}

/** A wall on a plan line (`axis` 'x': along x at z = `at`; 'z': along z at x = `at`), from `from` to `to`. */
interface WallSpec {
  axis: 'x' | 'z';
  at: number;
  from: number;
  to: number;
  /**
   * hall: solid 0-10 (a set hall); gal: a set wall under the gallery (solid to 4.5, glass 4.5-7.5 on `glass`, solid
   * above); galOnly: the gallery's own wall where no set is (4.2-7.8); hold: a holding room's side (3.2); low: under the
   * gallery slab (4.2); dock: the cash dock (4.5).
   */
  kind: 'hall' | 'gal' | 'galOnly' | 'hold' | 'low' | 'dock';
  /** Holding-room doors in it (the opening's centre along the wall). */
  doors?: { c: number; id: string; locked?: boolean }[];
  /** A holding room's glass slot (its centre along the wall). */
  slots?: number[];
  /** Open gaps [a, b] with a lintel from `h` to the band's top. */
  opens?: [number, number, number][];
  /** gal: the glazed ranges (default the whole wall). */
  glass?: [number, number][];
}

const bandOf = (k: WallSpec['kind']): [number, number] =>
  k === 'hall' ? [0, HALL_H] : k === 'gal' ? [0, GAL_FLOOR] : k === 'galOnly' ? [GAL_FLOOR - GAL_SLAB, GAL_TOP + GAL_SLAB] : k === 'hold' ? [0, HOLD_H] : k === 'low' ? [0, GAL_FLOOR - GAL_SLAB] : [0, DOCK_H];

/** The facility walls (SPEC 5 plan; boxes are wall centre lines). Set walls, holding-room sides, gallery walls, plant room,
 *  A4's staff passage, the cash dock. */
function wallSpecs(): WallSpec[] {
  const d = (h: HoldId, end: 'near' | 'far'): { c: number; id: string; locked?: boolean } => {
    const s = HOLD_DOORS[h][end];
    const id = holdDoorId(h, end);
    return { c: s.yaw === 0 ? s.z : s.x, id, ...(LOCKED_AT_START.includes(id) ? { locked: true } : {}) };
  };
  const slot = (h: HoldId): number => {
    const s = HOLD_DOORS[h].far;
    return (s.yaw === 0 ? s.z : s.x) + SLOT.off;
  };
  return [
    // A1 the Gate (the lounge inside it is the A1 set's)
    { axis: 'x', at: 2, from: 0, to: 22, kind: 'hall' },
    { axis: 'z', at: 0, from: 2, to: 20, kind: 'hall' },
    { axis: 'x', at: 20, from: 0, to: 22, kind: 'gal' },
    { axis: 'z', at: 22, from: 2, to: 20, kind: 'hall', doors: [d('L1', 'near')] },
    // A2 the Carriage Shed
    { axis: 'x', at: 0, from: 28, to: 70, kind: 'hall' },
    { axis: 'z', at: 28, from: 0, to: 20, kind: 'hall', doors: [d('L1', 'far')], slots: [slot('L1')] },
    { axis: 'x', at: 20, from: 28, to: 70, kind: 'gal' },
    { axis: 'z', at: 70, from: 0, to: 20, kind: 'hall', doors: [d('L2', 'near')] },
    // A3 the Office Range (no glazing: the plant room is behind its north wall)
    { axis: 'x', at: 0, from: 76, to: 100, kind: 'hall' },
    { axis: 'z', at: 76, from: 0, to: 13, kind: 'hall', doors: [d('L2', 'far')], slots: [slot('L2')] },
    { axis: 'x', at: 13, from: 76, to: 100, kind: 'hall' },
    { axis: 'z', at: 100, from: 0, to: 13, kind: 'hall', doors: [d('L3', 'near')] },
    // A4 the Goods Shed: the security room (from L3), the staff passage under the gallery, the goods floor
    { axis: 'x', at: 13, from: 100, to: 106.6, kind: 'hall', doors: [d('L3', 'far')], slots: [slot('L3')] },
    { axis: 'z', at: 100, from: 13, to: 19.6, kind: 'hall' },
    { axis: 'z', at: 106.6, from: 13, to: 19.6, kind: 'hall' },
    { axis: 'x', at: 19.6, from: 100, to: 106.6, kind: 'hall', opens: [[101, 104, GAL_FLOOR - GAL_SLAB]] },
    // the staff passage cuts the south service corridor (A4-C4): its two side walls close the corridor at x 101 and x 104
    { axis: 'z', at: 101, from: 19.6, to: 24, kind: 'low' },
    { axis: 'z', at: 104, from: 19.6, to: 24, kind: 'low' },
    { axis: 'x', at: 24, from: 76, to: 112, kind: 'gal', opens: [[101, 104, GAL_FLOOR - GAL_SLAB]] },
    { axis: 'z', at: 76, from: 24, to: 48, kind: 'gal', doors: [d('L4', 'near')] },
    { axis: 'x', at: 48, from: 76, to: 106, kind: 'gal' },
    { axis: 'x', at: 48, from: 106, to: 112, kind: 'hall' },
    { axis: 'z', at: 112, from: 24, to: 48, kind: 'hall' },
    // A5 the Substation (the bridge on its east side, both strips on its south and north sides)
    { axis: 'x', at: 24, from: 40, to: 70, kind: 'gal' },
    { axis: 'z', at: 40, from: 24, to: 48, kind: 'hall' },
    { axis: 'x', at: 48, from: 40, to: 70, kind: 'gal', doors: [d('L5', 'near')] },
    { axis: 'z', at: 70, from: 24, to: 48, kind: 'gal', doors: [d('L4', 'far')], slots: [slot('L4')] },
    // A6 the Pump House
    { axis: 'x', at: 54, from: 40, to: 64, kind: 'gal', doors: [d('L5', 'far')], slots: [slot('L5')] },
    { axis: 'z', at: 40, from: 54, to: 72, kind: 'hall' },
    { axis: 'x', at: 72, from: 40, to: 64, kind: 'hall' },
    { axis: 'z', at: 64, from: 54, to: 72, kind: 'hall', doors: [d('L6', 'near')] },
    // A7 the Data Hall
    { axis: 'x', at: 52, from: 70, to: 100, kind: 'gal' },
    { axis: 'z', at: 70, from: 52, to: 72, kind: 'hall', doors: [d('L6', 'far')], slots: [slot('L6')] },
    { axis: 'x', at: 72, from: 70, to: 100, kind: 'hall' },
    { axis: 'z', at: 100, from: 52, to: 72, kind: 'hall', doors: [d('L7', 'near')] },
    // A8 the Strongroom (the gallery's glazed end bay looks in over its west wall, z 50-52)
    { axis: 'z', at: 106, from: 50, to: 52, kind: 'gal' },
    { axis: 'z', at: 106, from: 52, to: 78, kind: 'hall', doors: [d('L7', 'far')], slots: [slot('L7')] },
    { axis: 'x', at: 50, from: 106, to: 150, kind: 'hall' },
    { axis: 'x', at: 78, from: 106, to: 150, kind: 'hall' },
    { axis: 'z', at: 150, from: 50, to: 78, kind: 'hall', opens: [[DOCK_BOX[1], DOCK_BOX[3], DOCK_H]] },
    // the cash dock (open west to the vault's back)
    { axis: 'x', at: DOCK_BOX[1], from: DOCK_BOX[0], to: DOCK_BOX[2], kind: 'dock' },
    { axis: 'x', at: DOCK_BOX[3], from: DOCK_BOX[0], to: DOCK_BOX[2], kind: 'dock' },
    { axis: 'z', at: DOCK_BOX[2], from: DOCK_BOX[1], to: DOCK_BOX[3], kind: 'dock' },
  ];
}

/** The holding rooms' side walls (the door walls are the sets' boundary walls above). */
function holdSides(): WallSpec[] {
  const out: WallSpec[] = [];
  for (const h of HOLD_IDS) {
    const [x0, z0, x1, z1] = HOLD_BOX[h];
    const near = HOLD_DOORS[h].near;
    const far = HOLD_DOORS[h].far;
    // a side is a wall of the box that holds no door
    const sides: WallSpec[] = [
      { axis: 'x', at: z0, from: x0, to: x1, kind: 'hold' },
      { axis: 'x', at: z1, from: x0, to: x1, kind: 'hold' },
      { axis: 'z', at: x0, from: z0, to: z1, kind: 'hold' },
      { axis: 'z', at: x1, from: z0, to: z1, kind: 'hold' },
    ];
    const onIt = (w: WallSpec, s: { x: number; z: number; yaw: number }): boolean => (w.axis === 'x' ? s.yaw !== 0 && s.z === w.at : s.yaw === 0 && s.x === w.at);
    for (const w of sides) if (!onIt(w, near) && !onIt(w, far)) out.push(w);
  }
  return out;
}

/** The gallery's own walls where no set wall bounds it (gallery level only), and the plant room. */
function galleryWalls(): WallSpec[] {
  return [
    { axis: 'x', at: 20, from: 22, to: 28, kind: 'galOnly' },
    { axis: 'x', at: 20, from: 70, to: 112, kind: 'galOnly' },
    { axis: 'x', at: 24, from: 0, to: 40, kind: 'galOnly' },
    { axis: 'z', at: 0, from: 20, to: 24, kind: 'galOnly' },
    { axis: 'z', at: 112, from: 20, to: 24, kind: 'galOnly' },
    { axis: 'z', at: 40, from: 48, to: 54, kind: 'galOnly' },
    { axis: 'z', at: 64, from: 52, to: 54, kind: 'galOnly' },
    { axis: 'x', at: 52, from: 64, to: 70, kind: 'galOnly' },
    { axis: 'x', at: 52, from: 100, to: 106, kind: 'galOnly' },
    { axis: 'z', at: 106, from: 48, to: 50, kind: 'galOnly' },
  ];
}

function plantWalls(): WallSpec[] {
  return [
    { axis: 'z', at: PLANT_BOX[0], from: PLANT_BOX[1], to: PLANT_BOX[3], kind: 'low' },
    { axis: 'x', at: PLANT_BOX[3], from: PLANT_BOX[0], to: PLANT_BOX[2], kind: 'low' },
  ];
}

/** One horizontal band of a wall from `y0` to `y1`, skipping the gaps (sorted [a, b] along the wall). */
function band(b: LevelBuilder, w: WallSpec, y0: number, y1: number, gaps: readonly (readonly [number, number])[]): void {
  let s = w.from;
  const piece = (a: number, e: number): void => {
    if (e - a < 0.01 || y1 - y0 < 0.01) return;
    const m = (a + e) / 2;
    if (w.axis === 'x') b.box(m, (y0 + y1) / 2, w.at, e - a, y1 - y0, FAC_T, WALL);
    else b.box(w.at, (y0 + y1) / 2, m, FAC_T, y1 - y0, e - a, WALL);
  };
  for (const [a, e] of gaps) {
    if (a > s) piece(s, a);
    s = Math.max(s, e);
  }
  if (w.to > s) piece(s, w.to);
}

/** A box across a gap [a, e] of wall `w` from `y0` to `y1` (a sill or a lintel). */
function across(b: LevelBuilder, w: WallSpec, a: number, e: number, y0: number, y1: number): void {
  if (y1 - y0 < 0.01) return;
  const m = (a + e) / 2;
  if (w.axis === 'x') b.box(m, (y0 + y1) / 2, w.at, e - a, y1 - y0, FAC_T, WALL);
  else b.box(w.at, (y0 + y1) / 2, m, FAC_T, y1 - y0, e - a, WALL);
}

/** Glass on wall `w` over [a, e] from `y` (`kit.glass`: a collision-only box, light passes). */
function glassOn(kit: FacilityKit, w: WallSpec, a: number, e: number, y: number, h: number): void {
  if (w.axis === 'x') kit.glass(a, w.at, e, w.at, h, { y });
  else kit.glass(w.at, a, w.at, e, h, { y });
}

/** Build one wall: its bands, doors, slots and open gaps. Returns the course door anchors it made. */
function buildWall(b: LevelBuilder, kit: FacilityKit, w: WallSpec, doors: Record<string, number>): void {
  const [y0, y1] = bandOf(w.kind);
  const gaps: [number, number][] = [];
  for (const dr of w.doors ?? []) gaps.push([dr.c - HOLD_DOOR_W / 2, dr.c + HOLD_DOOR_W / 2]);
  for (const s of w.slots ?? []) gaps.push([s - SLOT.w / 2, s + SLOT.w / 2]);
  for (const [a, e] of w.opens ?? []) gaps.push([a, e]);
  gaps.sort((p, q) => p[0] - q[0]);
  band(b, w, y0, y1, gaps);
  for (const dr of w.doors ?? []) {
    const x = w.axis === 'x' ? dr.c : w.at;
    const z = w.axis === 'x' ? w.at : dr.c;
    // the lintel from the door's 2.1 m to the band's top is the kit's
    doors[dr.id] = kit.slidingDoor(x, z, HOLD_DOOR_W, w.axis === 'x' ? Math.PI / 2 : 0, { wallThick: FAC_T, wallH: y1, locked: dr.locked ?? false }).id;
  }
  for (const s of w.slots ?? []) {
    const a = s - SLOT.w / 2;
    const e = s + SLOT.w / 2;
    across(b, w, a, e, 0, SLOT.sill);
    glassOn(kit, w, a, e, SLOT.sill, SLOT.h);
    across(b, w, a, e, SLOT.sill + SLOT.h, y1);
  }
  for (const [a, e, h] of w.opens ?? []) across(b, w, a, e, h, y1);
  if (w.kind === 'gal') {
    // the gallery's glazing over the set wall, then solid to the hall roof
    const glass = w.glass ?? [[w.from, w.to]];
    band(b, w, GAL_FLOOR, GAL_TOP, glass);
    for (const [a, e] of glass) glassOn(kit, w, a, e, GAL_FLOOR, GAL_TOP - GAL_FLOOR);
    band(b, w, GAL_TOP, HALL_H, []);
  }
}

/** A slab over plan box `bx` from `y` (thickness `t`): overhead, no ledges. */
function slab(b: LevelBuilder, bx: Box, y: number, t: number): void {
  const from = b.boxes.length;
  b.box((bx[0] + bx[2]) / 2, y + t / 2, (bx[1] + bx[3]) / 2, bx[2] - bx[0], t, bx[3] - bx[1], SLAB_C);
  b.mark(from, { overhead: true, noLedge: true });
}

const centre = (bx: Box): [number, number] => [(bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2];

/**
 * The holding room's two read slots (cool LED, one lamp each on the room's house circuit): placed off the door axis and
 * sized so the light stops 0.35 m short of both door planes (the glass slot is in the far one), so no house lamp
 * reaches a set (LIGHTING-PLAN 3, "Lounge, holding rooms").
 */
export function holdLampSpots(h: HoldId): { x: number; z: number; radius: number }[] {
  const [cx, cz] = centre(HOLD_BOX[h]);
  const { near, far } = HOLD_DOORS[h];
  const pts: [number, number][] =
    near.yaw === far.yaw
      ? near.yaw === 0
        ? [[cx, cz - 1.2], [cx, cz + 1.2]]
        : [[cx - 1.2, cz], [cx + 1.2, cz]]
      : // L3: doors on two walls (x 100 and z 13): both lamps in the corner away from them
        [[cx + 0.8, cz - 1.4], [cx + 2.0, cz - 0.1]];
  const plane = (s: { x: number; z: number; yaw: number }, x: number, z: number): number => (s.yaw === 0 ? Math.abs(x - s.x) : Math.abs(z - s.z));
  return pts.map(([x, z]) => ({ x, z, radius: Math.min(2.6, Math.min(plane(near, x, z), plane(far, x, z)) - 0.35) }));
}

/** The gallery's lamp spots: one per 7.5 m along each strip's centre line, `GAL_LAMP` radius (stops short of the glass). */
export const GAL_LAMP = { y: GAL_FLOOR + 1.4, radius: 1.6, intensity: 0.8 } as const;
export function galleryLampSpots(): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  for (let x = 3.75; x < 112; x += 7.5) out.push({ x, z: 22 });
  for (const z of [30, 37.5, 45]) out.push({ x: 73, z });
  for (let x = 43.75; x < 106; x += 7.5) out.push({ x, z: x < 64 ? 51 : 50 });
  return out;
}

/** The facility's light-test spots (feet; holding rooms read with the doors shut). */
function facilitySpots(): LightSpot[] {
  const out: LightSpot[] = [];
  for (const h of HOLD_IDS) {
    const [cx, cz] = centre(HOLD_BOX[h]);
    out.push({ name: `F ${h} centre`, kind: 'body', x: cx, y: 0, z: cz, band: 'read', shut: true });
    out.push({ name: `F ${h} pad floor`, kind: 'surf', x: cx + 1.2, y: 0.05, z: cz + 1.2, band: 'any', shut: true });
    out.push({ name: `F ${h} house`, kind: 'body', x: cx, y: 0, z: cz, band: 'house', shut: true });
  }
  const [dx, dz] = centre(EXIT_ZONE);
  out.push({ name: 'F dock exit zone', kind: 'body', x: dx, y: 0, z: dz, band: 'read' });
  out.push({ name: 'F dock house', kind: 'body', x: dx, y: 0, z: dz, band: 'house' });
  return out;
}

/** Build the facility into `b` (with the kit's sliding doors and glass). Call once, before the sets. */
export function buildFacility(b: LevelBuilder, kit: FacilityKit): FacilityPart {
  const from = b.boxes.length;
  const rows: RegisterRow[] = [];
  const doors: Record<string, number> = {};
  b.bounds = { minX: -1, maxX: 161, minZ: -1, maxZ: 79 };

  tally(b, rows, 'F0', 'Facility shell: site floor, outer and set-boundary walls, hall roofs', () => {
    b.floor(80, 39, 160, 78, FLOOR_C);
    for (const w of wallSpecs()) if (!w.doors?.length && !w.slots?.length) buildWall(b, kit, w, doors);
    for (const id of SET_IDS) for (const bx of SET_BOX[id]) if (!(id === 'a4GoodsShed' && bx[1] === 19.6)) slab(b, bx, HALL_H, 0.4);
  });
  tally(b, rows, 'F1', 'Holding rooms L1-L7: walls with the 1.8 m sliding doors, side walls, lids, pads, the L7 model plinth', () => {
    for (const w of wallSpecs()) if (w.doors?.length && !w.slots?.length) buildWall(b, kit, w, doors);
    for (const w of holdSides()) buildWall(b, kit, w, doors);
    for (const h of HOLD_IDS) {
      const bx = HOLD_BOX[h];
      slab(b, bx, HOLD_H, 0.4);
      // the pad (visual: the mode draws its outline; `airlockPad` is the gameplay box)
      const i = AIRLOCK_PAD_INSET;
      b.box((bx[0] + bx[2]) / 2, 0.01, (bx[1] + bx[3]) / 2, bx[2] - bx[0] - 2 * i, 0.02, bx[3] - bx[1] - 2 * i, PAD_C, 0, 0, false);
    }
    // L7, the Model Room: the plinth for A8's scale model against its south wall (0e puts the vitrine on it)
    const l7 = HOLD_BOX.L7;
    b.box((l7[0] + l7[2]) / 2, 0.45, l7[1] + FAC_T / 2 + 0.3, 1.6, 0.9, 0.6, PLINTH_C);
  });
  tally(b, rows, 'F2', 'Holding-room glass slots (kit.glass) beside the far doors', () => {
    for (const w of wallSpecs()) if (w.slots?.length) buildWall(b, kit, w, doors);
  });
  tally(b, rows, 'F3', 'Instructor gallery: slabs, its own walls, decor lamps (group 90); glazing is on the set walls (F0)', () => {
    for (const bx of GALLERY_BOX) {
      slab(b, bx, GAL_FLOOR - GAL_SLAB, GAL_SLAB);
      slab(b, bx, GAL_TOP, GAL_SLAB);
    }
    for (const w of galleryWalls()) buildWall(b, kit, w, doors);
    for (const p of galleryLampSpots()) b.light({ x: p.x, y: GAL_LAMP.y, z: p.z, radius: GAL_LAMP.radius, intensity: GAL_LAMP.intensity, color: WARM, group: GALLERY_GROUP, electric: false, destructible: false, fixture: { sx: 0.6, sy: 0.04, sz: 0.6, oy: 0.02 } });
  });
  tally(b, rows, 'F4', 'LED read slots: holding rooms (cool, groups 91-97), the cash dock (warm, group 98)', () => {
    for (const h of HOLD_IDS) {
      for (const s of holdLampSpots(h)) kit.ledSlot(s.x, HOLD_H, s.z, 2.4, h === 'L3' ? Math.PI / 2 : 0, { tone: 'cool', light: { radius: s.radius, intensity: 0.9, group: holdGroup(h) } });
    }
    for (const z of [60, 64]) kit.ledSlot(156, DOCK_H, z, 2.4, 0, { tone: 'warm', light: { radius: 4.5, intensity: 0.9, group: DOCK_GROUP } });
  });
  tally(b, rows, 'F7', 'Plant room and service corridors under the gallery (closed void), A4 staff passage sides, the cash dock', () => {
    for (const w of plantWalls()) buildWall(b, kit, w, doors);
    slab(b, PLANT_BOX, GAL_FLOOR - GAL_SLAB, GAL_SLAB);
    slab(b, DOCK_BOX, DOCK_H, 0.4);
  });
  // F6: the wall medkits are layout data (no builder piece)
  rows.push({ id: 'F6', element: 'Wall medkits in L4 and L7 (layout medkitWalls)' });
  // the shell never offers a lip (the sets' planned co-op lips are their own)
  b.mark(from, { noLedge: true });

  const airlocks: AirlockDef[] = HOLD_IDS.map((h) => ({ id: h, box: [...HOLD_BOX[h]] as [number, number, number, number], floorY: 0, nearDoor: holdDoorId(h, 'near'), farDoor: holdDoorId(h, 'far') }));
  const groups: Record<string, number> = {};
  for (const [k, g] of Object.entries(marlowCourseGroups())) if (g >= 90) groups[k] = g;
  const medkitWalls = MEDKIT_HOLDS.map((h) => {
    const bx = HOLD_BOX[h];
    // on the north side wall, 0.4 m out of its face, facing into the room (-z)
    return { pos: { x: (bx[0] + bx[2]) / 2 - 1.0, y: 0, z: bx[3] - FAC_T / 2 - 0.4 }, yaw: Math.PI };
  });
  const [ex, ez] = centre(EXIT_ZONE);
  return {
    airlocks,
    doors,
    exitZone: { box: [...EXIT_ZONE] as [number, number, number, number], floorY: 0 },
    groups,
    // the south gallery strip sits inside A4's standby zone box: its own house-level zone above the corridor
    ambientZones: [{ id: 'gallery-south', box: GALLERY_BOX[0]!, ambient: MARLOW_LEVEL.house, minY: GAL_FLOOR - 0.5, maxY: GAL_TOP }],
    medkitWalls,
    navSeeds: [...HOLD_IDS.map((h) => ({ x: centre(HOLD_BOX[h])[0], y: 0, z: centre(HOLD_BOX[h])[1] })), { x: 152, y: 0, z: 62 }],
    camSpaces: HOLD_IDS.map((h) => ({ box: HOLD_BOX[h], size: 'tight' as const })),
    debugPoints: [
      ...HOLD_IDS.map((h) => ({ id: h, label: `Holding room ${h.slice(1)}`, pos: { x: centre(HOLD_BOX[h])[0], y: 0, z: centre(HOLD_BOX[h])[1] }, yaw: 0 })),
      { id: 'dock', label: 'Cash dock', pos: { x: ex, y: 0, z: ez }, yaw: Math.PI / 2 },
    ],
    register: rows,
    props: [],
    lightSpots: facilitySpots(),
    shotVantages: [
      { name: 'f-l1-holding', feet: [24, 0, 10], cam: [23.2, 1.8, 9], target: [28, 1.4, 12] },
      { name: 'f-l7-model', feet: [102, 0, 61], cam: [101, 2.0, 62.3], target: [103, 0.9, 57.6] },
      { name: 'f-gallery-from-a1', feet: [12, 0, 14], cam: [11, 1.8, 12], target: [14, 6, 21] },
      { name: 'f-dock', feet: [152, 0, 62], cam: [151, 2.0, 60], target: [157, 1, 63] },
    ],
  };
}
