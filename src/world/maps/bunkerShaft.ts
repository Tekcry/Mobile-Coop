import type { LevelBuilder } from '../levelBuilder';
import type { P3 } from '../anchors';
import type { CourseDevice, CourseObjective, ElementFlag } from '../../game/course/courseDef';
import { wallXAt, wallZAt } from './storey';
import { glass, led, pit, slabWithHoles } from './bunkerUpper';

/**
 * Fallow, the shaft and reservoir (y 6), BAYS v2 (T5e): B3 The Intake, airlock A3, B4 The Cistern, airlock A4
 * (docs/archive/training/BAYS.md sections 0, B3, B4). Every coordinate below is a BAYS local coordinate; `plantAt` / the
 * per-bay `X` / `Z` / `Y` add the bay's offset and floor (BAYS 0.1; A4's floor is the outlet platform, A32).
 *
 * One shared course (R3). B3 is one line up the shaft and down again: G1 -> riser slot -> G2 -> WJ1 -> G3 -> WJ2 ->
 * G4 -> bar -> G5 -> RP1 -> ML -> RP2 (window) -> CR -> ZD -> zipline -> WP -> floor ring -> fan guard -> pit -> ducts
 * -> PP -> A3. Every landing edge is a flush 2.4 `noLedge` glass screen except its move point (R2, A51).
 *
 * Ledges: every piece here is `noLedge`; the only lips are the manual ones in `PLANT_LIPS` (RC's casing top, G3's
 * front (WJ1), the pier top (WJ2), B4's co-op lips W1 / W2 / the outlet platform).
 *
 * T5f moved B4 / A4 to their v2 offsets (the T5e interim passage, A71, is gone): A3's far door opens on C1's door, OP's
 * door on A4, and A4's far door on B5's entry landing (y 10.4). A4 carries a wall medkit (BAYS 0.4).
 */

export const PLANT_Y = 6;

export type PlantBay = 'B3' | 'A3' | 'B4' | 'A4';

/** BAYS 0.1 offsets (x, z) and floor y. */
export const PLANT_OFFSET: Record<PlantBay, readonly [number, number, number]> = {
  B3: [65, 46, PLANT_Y],
  A3: [69, 40, PLANT_Y],
  B4: [66, 14, PLANT_Y],
  A4: [70, 8, PLANT_Y + 4.4],
};

/** World point from a bay's local (x, z, y above the bay's floor). */
export function plantAt(bay: PlantBay, x: number, z: number, y = 0): P3 {
  const o = PLANT_OFFSET[bay];
  return { x: x + o[0], y: o[2] + y, z: z + o[1] };
}

/** B3 metrics (BAYS B3 element table, local heights over the chamber floor). */
export const B3_METRICS = {
  g1: 10,
  /** RC: the casing (x 3..8, z 11.2..12.4) 1.6 off the north wall, 4.6 over G1 (A30, A51). */
  casingTop: 14.6,
  slot: 1.6,
  g2: 14,
  g3: 17.4,
  g4: 20.6,
  g5: 20.6,
  bar: 23.1,
  nt1: 19,
  nr: 8.8,
  ml: 13.6,
  /** RF lowered from 7.5 (T5e): CR's window sill 5.0 over it, out of boost reach (the window is a breakable pane until T7a). */
  rf: 4.5,
  cr: 7.5,
  crRoof: 11.5,
  nt2: 2.0,
  wp: 2.6,
  pp: 3.0,
  top: 26,
  /** RP1 7.0 (rope end at ML's floor), RP2 to RF's floor. */
  rope1: 7.0,
  rope2: 9.1,
  windowSill: 9.5,
  windowHead: 11.0,
  zipTop: 9.4,
  zipEnd: 4.5,
  fence: 2.4,
  /** The full-height screen over ML's west edge (T5c open item 1). */
  screenTop: 23.0,
  ductW: 1.2,
  ductH: 1.0,
} as const;

/** B4 metrics (BAYS B4, local heights over the cell floors). */
export const B4_METRICS = {
  wall: 4.4,
  /** W2 (A35): 4.25 at the human-ladder spot (x 1..4) so the grip (`TEAM.ladderGrab` + 0.2) reaches it. */
  w2: 4.25,
  wallThick: 1.0,
  gallery: 4.4,
  outlet: 4.4,
  overflow: 6.2,
  sump: -4,
  clear: 9,
} as const;

const OUTER = 0.45;
const DOOR_W = 1.2;
const DOOR_H = 2.1;
const ROOF_T = 0.3;
const SCREEN_H = 2.4;
export const PLANT_AIRLOCK_CLEAR = 3.0;

const C = {
  wall: '#3f4245',
  conc: '#55595d',
  floor: '#45484c',
  roof: '#2e3033',
  steel: '#8d949b',
  grate: '#4d5358',
  net: '#3f4a3c',
  wood: '#7a5a3c',
  lock: '#b03a2e',
  fan: '#3c4146',
} as const;

/** A planned lip: its plan box (world, grown 5 cm), top (world y) and the floor it is measured from. */
export interface PlantLip {
  id: string;
  /** The bay id (a Plant bay here; bunkerDeep's lips use the same shape with Deep bay ids). */
  bay: string;
  box: [number, number, number, number];
  top: number;
  floor: number;
}

function lipBox(bay: PlantBay, id: string, x0: number, z0: number, x1: number, z1: number, top: number, floor = 0): PlantLip {
  const a = plantAt(bay, x0, z0);
  const e = plantAt(bay, x1, z1);
  return { id, bay, box: [a.x - 0.05, a.z - 0.05, e.x + 0.05, e.z + 0.05], top: a.y + top, floor: a.y + floor };
}

const M3 = B3_METRICS;
const M4 = B4_METRICS;

/** B4's co-op lips (level-design 11.3): W1, W2's human-ladder spot, the outlet platform. The course-wide list with B9's
 *  gap is `BUNKER_COOP_LIPS` (bunkerDeep). */
export const B4_COOP_LIPS: readonly PlantLip[] = [
  lipBox('B4', 'W1', 0, 18, 9, 18, M4.wall),
  lipBox('B4', 'W2', 1, 9, 4, 9, M4.w2),
  lipBox('B4', 'OUT', 3, 0, 9, 2, M4.outlet),
];

/** Every lip on the shaft and reservoir (all manual; nothing else makes a ledge). */
export const PLANT_LIPS: readonly PlantLip[] = [
  lipBox('B3', 'RC', 3, 12.4, 8, 12.4, M3.casingTop, M3.g1),
  lipBox('B3', 'WJ1', 10, 12.4, 14, 12.4, M3.g3, M3.g2),
  lipBox('B3', 'WJ2', 10, 12.4, 10, 14, M3.g4, M3.g3),
  ...B4_COOP_LIPS,
];

/** BAYS v2 room tables in plan (local rect per room; R4 footprints, debug points). */
export const SHAFT_BOX: Record<'B3' | 'B4', readonly [number, number, number, number]> = {
  B3: [65, 46, 79, 60],
  B4: [66, 14, 78, 40],
};

/** BAYS v2 objective tables (R5, A47): the names T7a turns into drills (`DrillDef.name`), in teaching order. */
const B3_OBJ = [
  'Split jump in the riser slot', 'Jump up out of the split onto the casing', 'Wall jump up to the hoist landing',
  'Corner-kick up the inside corner', 'Hang from the damper bar', 'Legs up on the bar', 'Go inverted on the bar',
  'Flip drop onto the hoist deck', 'Rappel the hoist rope: change speed, kick out, move sideways',
  'Unhook at the mid landing', 'Rappel the davit rope and kick through the control-room window',
  'Stop the fan at the isolator', 'Ride the zipline to the west platform', 'Climb the fan guard',
  'Shimmy along the fan guard', 'Rattle the fan guard: climb it at gear 4 or more', 'Flip over the fan guard into the pit',
  'Crawl your discharge duct', 'Unscrew the inner grille (quiet)', 'Kick out the outer louvre (loud)', 'Both on the airlock pad',
];
const B4_OBJ = [
  'Brace against the wall for your partner', 'Take the boost onto the wall', 'Drop into the next cell and draw the door bolt',
  'Hold steady as a human ladder', 'Climb your partner up the wall', 'Hold the sluice open from the gallery',
  'Pass under the sluice', 'Climb down into the last cell', 'Boost onto the outlet platform',
  'Lower the outlet ladder for your partner', 'Climb the outlet ladder', 'Both on the airlock pad',
];
export const SHAFT_OBJECTIVES: readonly CourseObjective[] = [
  ...B3_OBJ.map((text, i) => ({ id: `B3-${i + 1}`, bay: 'B3', text })),
  ...B4_OBJ.map((text, i) => ({ id: `B4-${i + 1}`, bay: 'B4', text })),
];

/** Elements whose behaviour is a stub until T7a (A61, A53): built as geometry, not final. */
export const SHAFT_ELEMENTS: Record<'B3' | 'B4', ElementFlag[]> = {
  B3: [
    { id: 'B3-W5', feature: 'W5 one-way return turnstile G5 -> NT1 (A61): locked door until T7a', final: false },
    { id: 'B3-NR', feature: "NR's return turnstile to G5 (A61): an open gap until T7a (a way back only)", final: false },
    { id: 'B3-MLR', feature: "ML -> NR return gate in ML's west screen (A61): locked door until T7a", final: false },
    { id: 'B3-window', feature: "CR's sprung rope-only window (A53): a breakable pane until T7a (RF 5.0 below its sill)", final: false },
    { id: 'B3-hatch', feature: "RF's below-only hatch to ML: an open manhole until T7a (RF is a dead end)", final: false },
    { id: 'B3-grilles', feature: 'inner grilles unscrew-only and outer louvres kick-only, self-closing (A53, A61): plain duct ends until T7a', final: false },
  ],
  B4: [
    { id: 'B4-railgate', feature: "W2's rail gate onto VG: an opening until T7a", final: false },
    { id: 'B4-P5', feature: 'Phase 5 bay: overflow channel and sump built, float shaft not yet (greyed objective line: T7a)', final: false },
  ],
};

/** What the shaft builder hands back to the map. */
export interface ShaftResult {
  doors: Record<string, number>;
  devices: Record<string, CourseDevice>;
  anchors: Record<string, number>;
  debug: { id: string; label: string; pos: P3; yaw: number }[];
}

interface Frame {
  X: (x: number) => number;
  Z: (z: number) => number;
  Y: (y: number) => number;
}

function frame(bay: PlantBay): Frame {
  const o = PLANT_OFFSET[bay];
  return { X: (x) => x + o[0], Z: (z) => z + o[1], Y: (y) => y + o[2] };
}

/** Roof slab (visual, overhead: no nav blocker, no lip). */
function roof(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number): void {
  const from = b.boxes.length;
  b.box((x0 + x1) / 2, y + ROOF_T / 2, (z0 + z1) / 2, x1 - x0, ROOF_T, z1 - z0, C.roof);
  b.mark(from, { overhead: true, noLedge: true });
}

/** A visual-only ladder with a padlocked hasp (B4 C1 / C2: training rig locked out of use, no anchor). */
function lockedLadder(b: LevelBuilder, x: number, z: number, y0: number, y1: number): void {
  for (const dz of [-0.25, 0.25]) b.box(x - 0.06, (y0 + y1) / 2, z + dz, 0.05, y1 - y0, 0.05, C.steel, 0, 0, false);
  for (let y = y0 + 0.3; y < y1; y += 0.3) b.box(x - 0.06, y, z, 0.035, 0.035, 0.5, C.steel, 0, 0, false);
  b.box(x - 0.12, y0 + 1.2, z, 0.08, 0.12, 0.08, C.lock, 0, 0, false);
}

/** Local helpers for one bay: a solid box, a deck (0.3 slab, top at y), a glass screen (A26), an LED strip. */
function kit(b: LevelBuilder, f: Frame) {
  const { X, Z, Y } = f;
  return {
    solid: (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, color: string = C.conc) =>
      b.box(X((x0 + x1) / 2), Y((y0 + y1) / 2), Z((z0 + z1) / 2), x1 - x0, y1 - y0, z1 - z0, color),
    deck: (x0: number, z0: number, x1: number, z1: number, y: number, color: string = C.grate) =>
      b.box(X((x0 + x1) / 2), Y(y) - 0.15, Z((z0 + z1) / 2), x1 - x0, 0.3, z1 - z0, color),
    gl: (x0: number, z0: number, x1: number, z1: number, y0: number, h = SCREEN_H) => glass(b, X(x0), Z(z0), X(x1), Z(z1), Y(y0), h),
    strip: (x0: number, z0: number, x1: number, z1: number, y: number) => led(b, X(x0), Z(z0), X(x1), Z(z1), Y(y)),
  };
}

// ---------------------------------------------------------------------------------------------------- B3 The Intake

function buildB3(b: LevelBuilder, r: ShaftResult): void {
  const f = frame('B3');
  const { X, Z, Y } = f;
  const { solid, deck, gl, strip } = kit(b, f);
  const H = M3.top;
  b.floor(X(7), Z(7), 14.9, 14.9, C.floor, Y(0));
  // shaft walls (outside the box); the west wall is shared with A2 (A2 builds its own stretch y 10..13, z 3.55..10.45
  // with the far door onto G1); the south wall is shared with A3 (the A3 near door from PP, x 6.4..7.6)
  wallZAt(b, X(0), Z(-0.225), Z(14.45), [], Y(0), M3.g1, C.wall, OUTER);
  wallZAt(b, X(0), Z(-0.225), Z(3.55), [], Y(M3.g1), 3, C.wall, OUTER);
  wallZAt(b, X(0), Z(10.45), Z(14.45), [], Y(M3.g1), 3, C.wall, OUTER);
  wallZAt(b, X(0), Z(-0.225), Z(14.45), [], Y(M3.g1 + 3), H - M3.g1 - 3, C.wall, OUTER);
  // the north wall in two parts at G1 (its face and the casing's make the RC slot on one floor: the split finder)
  wallXAt(b, Z(14.225), X(-0.225), X(14.45), [], Y(0), M3.g1, C.wall, OUTER);
  wallXAt(b, Z(14.225), X(-0.225), X(14.45), [], Y(M3.g1), H - M3.g1, C.wall, OUTER);
  wallZAt(b, X(14.225), Z(-0.225), Z(14.45), [], Y(0), H, C.wall, OUTER);
  wallXAt(b, Z(0), X(-0.225), X(14.45), [[X(6.4), X(7.6)]], Y(0), H, C.wall, OUTER);
  b.box(X(7), Y((DOOR_H + H) / 2), Z(0), DOOR_W, H - DOOR_H, OUTER, C.wall);
  roof(b, X(-0.45), Z(-0.45), X(14.45), Z(14.45), Y(H));

  // G1 (10): west arm x 0..2.8, z 4..14 and north arm x 2.8..8, z 11.2..14; screens on every inner edge
  deck(0, 4, 2.8, 14, M3.g1);
  deck(2.8, 11.2, 8, 14, M3.g1);
  gl(2.7, 4, 2.8, 11.2, M3.g1);
  gl(0, 4, 2.8, 4.1, M3.g1);
  gl(2.8, 11.2, 3, 11.3, M3.g1);
  gl(7.9, 12.4, 8, 14, M3.g1);
  // RC: the riser casing (x 3..8, z 11.2..12.4) 4.6 over G1; the slot (z 12.4..14) to the north wall; the casing
  // top's south edge screened (a fall there would land on the floor ring)
  solid(3, 11.2, 8, 12.4, M3.g1, M3.casingTop);
  gl(3, 11.2, 8, 11.3, M3.casingTop);
  b.ledge(X(8), Z(12.4), X(3), Z(12.4), Y(M3.casingTop), { drop: M3.casingTop - M3.g1, canHang: true, canClimbUp: true });
  // G2 (14): the grated bridge x 8..11, z 11.2..12.4 and the east gallery x 11..14, z 8..12.4; screens on every open edge
  deck(8, 11.2, 11, 12.4, M3.g2);
  deck(11, 8, 14, 12.4, M3.g2);
  gl(8, 11.2, 11, 11.3, M3.g2);
  gl(8, 12.3, 9, 12.4, M3.g2);
  gl(11, 8, 11.1, 11.2, M3.g2);
  gl(11, 8, 14, 8.1, M3.g2);
  // G3 (17.4): the ring-beam mass x 10..14, z 12.4..14 (its south face is WJ1); the riser pier x 9..10, z 12.4..14 up
  // to G4 (20.6, WJ2 up the inside corner with the north wall)
  solid(10, 12.4, 14, 14, 0, M3.g3);
  solid(9, 12.4, 10, 14, 0, M3.g4);
  b.ledge(X(10), Z(12.4), X(14), Z(12.4), Y(M3.g3), { drop: M3.g3 - M3.g2, canHang: true, canClimbUp: true });
  b.ledge(X(10), Z(12.4), X(10), Z(14), Y(M3.g4), { drop: M3.g4 - M3.g3, canHang: true, canClimbUp: true });
  // G4 (20.6): x 4..9, z 12.6..14 plus the pier top; screens but the bar's gap (x 4..5 on the south edge)
  deck(4, 12.6, 9, 14, M3.g4);
  gl(5, 12.6, 9, 12.7, M3.g4);
  gl(9, 12.4, 10, 12.5, M3.g4);
  gl(4, 12.6, 4.1, 14, M3.g4);
  // PH: the damper bar from over G4's west end to over G5
  b.pipeH(X(4.5), Z(13.3), X(2.5), Z(2), Y(M3.bar));
  // NT1 (19): the catch net under the bar, mesh screens (glass method, visual mesh T9a); its ladder up to G4's gap
  deck(1.2, 4, 6, 12.6, M3.nt1, C.net);
  gl(1.2, 4, 6, 4.1, M3.nt1);
  gl(5.9, 4, 6, 12.6, M3.nt1);
  gl(1.2, 12.5, 4, 12.6, M3.nt1);
  gl(1.2, 4, 1.3, 9.8, M3.nt1, M3.g5 - 0.3 - M3.nt1);
  gl(1.2, 11, 1.3, 12.6, M3.nt1);
  b.ladder(X(4.5), Z(12.2), Y(M3.nt1), Y(M3.g4), 0);
  // W5 (20.6): the return walkway on G5's north edge (x 0..1.2, z 4..11); its turnstile (A61) is a locked door until
  // T7a (SHAFT_ELEMENTS); north of it the walkway steps down 1.6 to NT1
  deck(0, 4, 1.2, 11, M3.g5);
  gl(1.2, 4, 1.3, 9.8, M3.g5);
  gl(0, 10.9, 1.2, 11, M3.g5);
  r.doors['B3-w5'] = b.door(X(0), Y(M3.g5), Z(9.8), DOOR_W, Math.PI / 2, { locked: true }).id;
  // G5 (20.6): x 0..4, z 0..4; HP the hoist pier x 3.4..5.4, z 0..0.8 from NR's floor, its top the hoist stub HS
  deck(0, 0, 4, 4, M3.g5);
  solid(3.4, 0, 5.4, 0.8, M3.nr, M3.g5);
  gl(1.2, 3.9, 4, 4, M3.g5);
  gl(3.9, 0.8, 4, 2.8, M3.g5);
  gl(3.9, 3.8, 4, 4, M3.g5);
  // T5c open item 1: the rope column (x 3..5.95, z 0..3.8 over NR) is closed north and east to y 23.0, so a walk-off
  // or jump from HS lands in NR, never on ML or the chamber; ML's return gate to NR (A61) a locked door until T7a
  gl(5.6, 0, 5.95, 1.8, M3.ml, M3.screenTop - M3.ml);
  gl(5.6, 1.8, 5.95, 3.8, M3.ml + DOOR_H, M3.screenTop - M3.ml - DOOR_H);
  gl(5.6, 3, 5.95, 3.8, M3.ml, DOOR_H);
  r.doors['B3-mlr'] = b.door(X(5.775), Y(M3.ml), Z(1.8), DOOR_W, 0, { locked: true }).id;
  gl(4, 3.7, 5.95, 3.8, M3.nr, M3.screenTop - M3.nr);
  gl(3, 3.7, 4, 3.8, M3.nr, M3.g5 - 0.3 - M3.nr);
  gl(3, 0, 3.1, 3.8, M3.nr, M3.g5 - 0.3 - M3.nr);
  // NR / RF partition (x 6) from RF's floor to ML's floor
  gl(5.95, 0, 6.05, 3.8, M3.rf, M3.ml - M3.rf);
  // NR (8.8): the rope net x 3..6, z 0..3.8 round HP's foot; its ladder (moved north out of RP1's kick volume, T5c
  // open item 2) up a backing plate on G5's east edge to the turnstile gap (z 2.8..3.8; an open gap until T7a)
  deck(3, 0, 6, 3.8, M3.nr, C.net);
  solid(3.9, 3.0, 4.0, 3.6, M3.nr, M3.g5 - 0.3, C.steel);
  b.ladder(X(4.4), Z(3.3), Y(M3.nr), Y(M3.g5), -Math.PI / 2);
  // RP1: the hoist rope on HP's north face, 7.0 to ML's floor height
  r.anchors['B3-rappel-1'] = b.rappel(X(4.8), Y(M3.g5), Z(0.8), 0, M3.rope1).id;
  // ML (13.6): x 6..8.1, z 0..3.75 less the hatch (x 6..6.8, z 1.5..2.9); DB x 8.1..9, z 2.2..3.75; DH the davit head
  // x 9..9.8, z 0..3.75 (CR's west wall raised from CR's roof). The well's north screen stands at z 3.65..3.75: RP2's
  // body at lateralMax (z 3.3) plus the capsule radius ends at 3.6, so no unhook or bottom-out overlaps it and no
  // push-out lands in the fan pit; at -lateralMax (z 0.3) its centre stays north of the south wall's face (0.225)
  deck(6, 0, 8.1, 1.5, M3.ml);
  deck(6.8, 1.5, 8.1, 3.75, M3.ml);
  deck(6, 2.9, 6.8, 3.75, M3.ml);
  deck(8.1, 2.2, 9, 3.75, M3.ml);
  solid(9, 0, 9.8, 3.75, M3.crRoof, M3.ml);
  gl(8.1, 0, 8.2, 2.2, M3.ml);
  gl(8.1, 2.2, 9, 2.3, M3.ml);
  gl(6, 3.65, 9.8, 3.75, M3.rf, M3.ml + SCREEN_H - M3.rf);
  gl(9.7, 0, 9.8, 3.65, M3.ml);
  gl(9, 0, 9.1, 1.3, M3.ml);
  // the hatch pier under ML and RF's ladder up to the hatch (moved west out of RP2's kick volume, T5c open item 2)
  // (the climber stands 0.6 behind the ladder on RF, clear of the well screen at z 3.65)
  solid(6, 1.05, 6.8, 1.5, M3.rf, M3.ml - 0.3);
  b.ladder(X(6.4), Z(1.9), Y(M3.rf), Y(M3.ml), Math.PI);
  // RF (4.5): the rope foot x 6..9, z 0..3.75 (its north strip over the pit's edge); its east side closed over the
  // pit (x 9, z 2.6..3.75) to CR's floor
  deck(6, 0, 9, 3.75, M3.rf, C.net);
  solid(9, 2.6, 9.2, 3.75, M3.rf, M3.cr);
  // RP2: the davit rope on DH's west face (CR's west wall), 9.1 to RF's floor
  r.anchors['B3-rappel-2'] = b.rappel(X(9), Y(M3.ml), Z(1.8), -Math.PI / 2, M3.rope2).id;

  // CR (7.5): the substructure (x 9..14, z 0..2.6 and x 12..14, z 0..6.5, solid to 7.5), CR x 9..14, z 0..5, roof 11.5;
  // its west wall (x 9..9.45) carries the rope window (z 1.05..2.55, y 9.5..11.0)
  solid(9, 0, 14, 2.6, 0, M3.cr);
  solid(12, 2.6, 14, 6.5, 0, M3.cr);
  deck(9, 2.6, 12, 5, M3.cr, C.floor);
  solid(9, 0, 9.45, 1.05, M3.cr, M3.crRoof, C.wall);
  solid(9, 2.55, 9.45, 5, M3.cr, M3.crRoof, C.wall);
  solid(9, 1.05, 9.45, 2.55, M3.cr, M3.windowSill, C.wall);
  solid(9, 1.05, 9.45, 2.55, M3.windowHead, M3.crRoof, C.wall);
  b.windowAt(X(9.225), Y((M3.windowSill + M3.windowHead) / 2), Z(1.8), 1.5, M3.windowHead - M3.windowSill, -Math.PI / 2, { sill: Y(M3.windowSill), breakable: true });
  roof(b, X(9.45), Z(0), X(14), Z(5), Y(M3.crRoof));
  // CR's glazed north wall with its door onto ZD (plain)
  gl(9.45, 4.95, 11.4, 5.05, M3.cr, M3.crRoof - M3.cr);
  gl(12.6, 4.95, 14, 5.05, M3.cr, M3.crRoof - M3.cr);
  gl(11.4, 4.95, 12.6, 5.05, M3.cr + DOOR_H, M3.crRoof - M3.cr - DOOR_H);
  r.doors['B3-cr'] = b.door(X(11.4), Y(M3.cr), Z(5), DOOR_W, Math.PI / 2, {}).id;
  r.devices['sw-isolator'] = { x: X(13.6), y: Y(M3.cr), z: Z(2.5), yaw: Math.PI / 2, label: 'Fan isolator' };
  b.box(X(13.9), Y(M3.cr + 1.4), Z(2.5), 0.15, 0.8, 0.6, C.steel, 0, 0, false);
  // ZD (7.5): x 9..14, z 5..8; screens but the launch gap (x 9, z 6.4..8: the cable and NT2's ladder head)
  deck(9, 5, 14, 8, M3.cr);
  gl(9, 7.9, 14, 8, M3.cr);
  gl(9, 5, 9.1, 6.4, M3.cr);
  // ZP: the spoil ropeway from just inside ZD's west edge to over WP (the body hangs 1.9 under the cable)
  r.anchors['B3-zipline'] = b.zipline({ x: X(9.6), y: Y(M3.zipTop), z: Z(6.8) }, { x: X(1.5), y: Y(M3.zipEnd), z: Z(8.5) }).id;
  // NT2 (2.0): the catch net under the cable, x 4..9.5, z 6.6..9.4; its west screen 2.0 (the rider's feet pass over it)
  deck(4, 6.6, 9.5, 9.4, M3.nt2, C.net);
  gl(4, 6.6, 9.5, 6.7, M3.nt2);
  gl(4, 9.3, 9.5, 9.4, M3.nt2);
  gl(9.4, 6.6, 9.5, 9.4, M3.nt2);
  gl(4, 6.6, 4.1, 9.4, M3.nt2, 2.0);
  b.ladder(X(8.6), Z(7.75), Y(M3.nt2), Y(M3.cr), Math.PI / 2);
  // WP (2.6): the west platform; a drop to the floor ring
  solid(0, 7, 3, 10, 0, M3.wp);

  // FP: the fan guard on the pit's north side (x 6..12, z 6.5), locked until `fan-off`; the fan housing in the pit
  r.anchors['B3-fence'] = b.fence(X(6), Z(6.5), X(12), Z(6.5), M3.fence, Y(0)).id;
  b.block(X(10.5), Z(4.6), 2.4, 1.2, 1.6, C.fan, Y(0));
  // the block west of the pit (x 2..6, z 2.6..6.5, to NR's floor) with the twin ducts (z 3.0..4.2, 4.8..6.0, 1.0 high)
  // (the separators stand only the duct's height under one mass, so the ducts read as ducts, not split gaps)
  solid(2, 2.6, 6, 3.0, 0, M3.ductH);
  solid(2, 4.2, 6, 4.8, 0, M3.ductH);
  solid(2, 6.0, 6, 6.5, 0, M3.ductH);
  solid(2, 2.6, 6, 6.5, M3.ductH, M3.nr);
  for (const [k, z] of [[1, 3.6], [2, 5.4]] as const) {
    r.anchors[`B3-duct-${k}`] = b.duct(
      [{ x: X(6), y: Y(0), z: Z(z) }, { x: X(2), y: Y(0), z: Z(z) }],
      { pos: { x: X(6), y: Y(0.5), z: Z(z) }, nx: 1, ny: 0, nz: 0, where: 'wall' },
      { pos: { x: X(2), y: Y(0.5), z: Z(z) }, nx: -1, ny: 0, nz: 0, where: 'wall' },
    ).id;
    b.box(X(6.02), Y(0.5), Z(z), 0.04, M3.ductH, M3.ductW, C.grate, 0, 0, false);
    b.box(X(1.98), Y(0.5), Z(z), 0.04, M3.ductH, M3.ductW, C.steel, 0, 0, false);
  }
  // PP: the plant passage (x 0..2, z 2.6..6.5 and x 0..9, z 0..2.6), roofed at 3.0; the pit's south wall
  solid(6, 2.45, 9, 2.6, 0, M3.pp, C.wall);
  solid(0, 6.35, 2, 6.5, 0, M3.pp, C.wall);
  solid(0, 0, 9, 2.6, M3.pp, M3.pp + 0.3, C.conc);
  solid(0, 2.6, 2, 6.35, M3.pp, M3.pp + 0.3, C.conc);

  // LED strips under the landing lips (accent, T6)
  strip(0.1, 4, 2.8, 4, M3.g1 - 0.32);
  strip(8, 11.2, 11, 11.2, M3.g2 - 0.32);
  strip(10, 12.4, 14, 12.4, M3.g3 - 0.05);
  strip(4, 12.6, 9, 12.6, M3.g4 - 0.32);
  strip(0.1, 4, 4, 4, M3.g5 - 0.32);
  strip(6, 2.9, 8.1, 2.9, M3.ml - 0.32);
  strip(9, 8, 14, 8, M3.cr - 0.32);

  r.debug.push(
    { id: 'B3', label: 'B3 The Intake (G1 at the A2 door)', pos: plantAt('B3', 1.4, 7, M3.g1), yaw: Math.PI / 2 },
    { id: 'B3-RC', label: 'B3 RC slot (split)', pos: plantAt('B3', 5.5, 13.2, M3.g1), yaw: Math.PI / 2 },
    { id: 'B3-G2', label: 'B3 G2 east gallery (WJ1)', pos: plantAt('B3', 12.5, 11, M3.g2), yaw: 0 },
    { id: 'B3-G3', label: 'B3 G3 hoist landing (WJ2)', pos: plantAt('B3', 12.5, 13.2, M3.g3), yaw: -Math.PI / 2 },
    { id: 'B3-G4', label: 'B3 G4 ring-beam landing (bar)', pos: plantAt('B3', 7, 13.3, M3.g4), yaw: -Math.PI / 2 },
    { id: 'B3-NT1', label: 'B3 NT1 bar net', pos: plantAt('B3', 3.5, 8, M3.nt1), yaw: 0 },
    { id: 'B3-G5', label: 'B3 G5 hoist deck (RP1)', pos: plantAt('B3', 2, 2, M3.g5), yaw: Math.PI / 2 },
    { id: 'B3-NR', label: 'B3 NR rope net', pos: plantAt('B3', 4.6, 2.4, M3.nr), yaw: 0 },
    { id: 'B3-ML', label: 'B3 ML mid landing (RP2)', pos: plantAt('B3', 7.4, 2, M3.ml), yaw: Math.PI / 2 },
    { id: 'B3-RF', label: 'B3 RF rope foot', pos: plantAt('B3', 7.8, 2, M3.rf), yaw: 0 },
    { id: 'B3-CR', label: 'B3 CR fan control room', pos: plantAt('B3', 11.5, 2.5, M3.cr), yaw: 0 },
    { id: 'B3-ZD', label: 'B3 ZD zip deck', pos: plantAt('B3', 12, 6.5, M3.cr), yaw: -Math.PI / 2 },
    { id: 'B3-NT2', label: 'B3 NT2 zip net', pos: plantAt('B3', 6, 8, M3.nt2), yaw: 0 },
    { id: 'B3-WP', label: 'B3 WP west platform', pos: plantAt('B3', 1.5, 8.5, M3.wp), yaw: Math.PI / 2 },
    { id: 'B3-floor', label: 'B3 chamber floor ring (fan guard)', pos: plantAt('B3', 11, 10, 0), yaw: Math.PI },
    { id: 'B3-pit', label: 'B3 fan pit (ducts)', pos: plantAt('B3', 8, 4.5, 0), yaw: -Math.PI / 2 },
    { id: 'B3-PP', label: 'B3 plant passage', pos: plantAt('B3', 4, 1.3, 0), yaw: Math.PI / 2 },
  );
  for (const [x, z, y] of [[7, 7, 24], [7, 7, 16], [7, 10, 4], [11.5, 2.5, 10.8], [4, 1.3, 2.7]] as const) b.light({ ...plantAt('B3', x, z, y), radius: 14, intensity: 0.8 });
}

// ---------------------------------------------------------------------------------------------------- airlocks

/** A3 / A4: 6 x 6 x 3.0 between two bays north and south; each builds its stretch of the far bay's wall (A3's in B4's
 *  north wall, A4's in B5's north wall at the outlet height); W / E walls, bench, the pad border, roof, the two locked
 *  blast doors (automatic, R6: no panel); A4's wall medkit (BAYS 0.4, `BUNKER_DEVICES` A4-MED). */
function buildAirlock(b: LevelBuilder, bay: 'A3' | 'A4', r: ShaftResult): void {
  const f = frame(bay);
  const { X, Z, Y } = f;
  const { strip } = kit(b, f);
  b.floor(X(3), Z(3), 6 + 2 * OUTER, 6, C.floor, Y(0));
  wallZAt(b, X(-OUTER / 2), Z(0), Z(6), [], Y(0), PLANT_AIRLOCK_CLEAR, C.wall, OUTER);
  wallZAt(b, X(6 + OUTER / 2), Z(0), Z(6), [], Y(0), PLANT_AIRLOCK_CLEAR, C.wall, OUTER);
  // the far wall (z 0): A4's stretch of B5's north wall (B5 fills below and above it), A3's stretch of B4's north wall
  wallXAt(b, Z(0), X(-OUTER), X(6 + OUTER), [[X(2.4), X(3.6)]], Y(0), PLANT_AIRLOCK_CLEAR, C.wall, OUTER);
  b.box(X(3), Y((DOOR_H + PLANT_AIRLOCK_CLEAR) / 2), Z(0), DOOR_W, PLANT_AIRLOCK_CLEAR - DOOR_H, OUTER, C.wall);
  b.block(X(5.6), Z(3), 0.45, 0.45, 3, C.wood, Y(0));
  b.box(X(3.6) + 0.9, Y(1.5), Z(0) + 0.24, 0.6, 0.6, 0.04, C.steel, 0, 0, false);
  if (bay === 'A4') b.box(X(0.25), Y(1.2), Z(4.5), 0.06, 0.4, 0.5, '#a33a30', 0, 0, false);
  strip(1, 1, 5, 1, 0.015);
  strip(1, 5, 5, 5, 0.015);
  strip(1, 1, 1, 5, 0.015);
  strip(5, 1, 5, 5, 0.015);
  roof(b, X(-OUTER), Z(-0.225), X(6 + OUTER), Z(6.225), Y(PLANT_AIRLOCK_CLEAR));
  // doors 1.2 x 2.1 at local x 2.4..3.6: near (north, the bay left) and far (south), both swinging into the chamber
  r.doors[`${bay}-near`] = b.door(X(2.4), Y(0), Z(6), DOOR_W, Math.PI / 2, { locked: true, swing: 1 }).id;
  r.doors[`${bay}-far`] = b.door(X(2.4), Y(0), Z(0), DOOR_W, Math.PI / 2, { locked: true, swing: -1 }).id;
  r.debug.push({ id: bay, label: `${bay} airlock${bay === 'A4' ? ' (medkit)' : ''}`, pos: plantAt(bay, 3, 3), yaw: Math.PI });
}

// ---------------------------------------------------------------------------------------------------- B4 The Cistern

/** The sump hole (world rect, B4 local x 0..3, z 0..3: the Phase 5 bay). */
const B4_SUMP: [number, number, number, number] = [PLANT_OFFSET.B4[0], PLANT_OFFSET.B4[1], 3 + PLANT_OFFSET.B4[0], 3 + PLANT_OFFSET.B4[1]];

function buildB4(b: LevelBuilder, r: ShaftResult): void {
  const f = frame('B4');
  const { X, Z, Y } = f;
  const { solid, gl, strip } = kit(b, f);
  const H = M4.clear;
  slabWithHoles(b, X(-OUTER), Z(-0.225), X(12 + OUTER), Z(26.225), Y(0), [B4_SUMP], C.floor);
  // outer walls: west / east outside the bay box; north (A3's stretch, the C1 door x 5.4..6.6) and south (A4: the door
  // at OP's height)
  wallZAt(b, X(-OUTER / 2), Z(-0.225), Z(26.225), [], Y(0), H, C.wall, OUTER);
  wallZAt(b, X(12 + OUTER / 2), Z(-0.225), Z(26.225), [], Y(0), H, C.wall, OUTER);
  // north wall: A3 builds its 6.9 m stretch (x 2.55..9.45, to 3.0, the C1 door); B4 fills above it
  wallXAt(b, Z(26), X(-OUTER), X(12 + OUTER), [[X(2.55), X(9.45)]], Y(0), H, C.wall, OUTER);
  b.box(X(6), Y((PLANT_AIRLOCK_CLEAR + H) / 2), Z(26), 6.9, H - PLANT_AIRLOCK_CLEAR, OUTER, C.wall);
  wallXAt(b, Z(0), X(-OUTER), X(12 + OUTER), [[X(6.4), X(7.6)]], Y(0), H, C.wall, OUTER);
  b.box(X(7), Y(M4.outlet / 2), Z(0), DOOR_W, M4.outlet, OUTER, C.wall);
  b.box(X(7), Y((M4.outlet + DOOR_H + H) / 2), Z(0), DOOR_W, H - M4.outlet - DOOR_H, OUTER, C.wall);
  roof(b, X(-OUTER), Z(-0.225), X(12 + OUTER), Z(26.225), Y(H));

  // W1 (z 17..18, 4.4) wall to wall with its inspection door (x 4..5.2, bolted from C2); screened where it meets VG
  solid(0, 17, 4, 18, 0, M4.wall);
  solid(5.2, 17, 9, 18, 0, M4.wall);
  solid(4, 17, 5.2, 18, DOOR_H, M4.wall);
  gl(8.9, 17, 9, 18, M4.wall);
  b.ledge(X(9), Z(18), X(0), Z(18), Y(M4.wall), { drop: M4.wall, canHang: true, canClimbUp: true });
  r.doors['B4-insp'] = b.door(X(4), Y(0), Z(17), DOOR_W, Math.PI / 2, { locked: true, swing: 1 }).id;
  // W2 (z 8..9): 4.25 at the human-ladder spot (x 1..4, the only lip), 4.4 elsewhere (its north edge screened), the
  // sluice (x 6..7.5) under it; its south edge screened (no drop into C3)
  solid(0, 8, 1, 9, 0, M4.wall);
  solid(1, 8, 4, 9, 0, M4.w2);
  solid(4, 8, 6, 9, 0, M4.wall);
  solid(7.5, 8, 9, 9, 0, M4.wall);
  solid(6, 8, 7.5, 9, DOOR_H, M4.wall);
  gl(0, 8.9, 1, 9, M4.wall);
  gl(4, 8.9, 8.9, 9, M4.wall);
  gl(0, 8, 9, 8.1, M4.w2);
  b.ledge(X(4), Z(9), X(1), Z(9), Y(M4.w2), { drop: M4.w2, canHang: true, canClimbUp: true });
  r.doors['B4-sluice'] = b.door(X(6), Y(0), Z(9), 1.5, Math.PI / 2, { locked: true, swing: -1 }).id;
  // VG (x 9..12, z 3..26, 4.4), solid; its cell side screened but the rail gate (z 8..9) and the C3 ladder head
  // (z 5.4..6.6); its south end screened
  solid(9, 3, 12, 26, 0, M4.gallery);
  gl(9, 3, 9.1, 5.4, M4.gallery);
  gl(9, 6.6, 9.1, 8, M4.gallery);
  gl(9, 9, 9.1, 26, M4.gallery);
  gl(9, 3, 12, 3.1, M4.gallery);
  r.devices['hold-sluice'] = { x: X(10), y: Y(M4.gallery), z: Z(8.5), yaw: -Math.PI / 2, label: 'Hold handwheel' };
  b.box(X(9.3), Y(M4.gallery + 1.0), Z(8.5), 0.08, 0.6, 0.6, C.steel, 0, 0, false);
  r.anchors['B4-c3-ladder'] = b.ladder(X(8.6), Z(6), Y(0), Y(M4.gallery), Math.PI / 2).id;
  lockedLadder(b, X(9), Z(22), Y(0), Y(M4.gallery));
  lockedLadder(b, X(9), Z(13), Y(0), Y(M4.gallery));
  // OP (x 3..9, z 0..2, 4.4): the co-op lip on its north and east edges; its ladder locked until lowered
  solid(3, 0, 9, 2, 0, M4.outlet);
  b.ledge(X(9), Z(2), X(3), Z(2), Y(M4.outlet), { drop: M4.outlet, canHang: true, canClimbUp: true });
  b.ledge(X(9), Z(0), X(9), Z(2), Y(M4.outlet), { drop: M4.outlet, canHang: true, canClimbUp: true });
  r.anchors['B4-outlet-ladder'] = b.ladder(X(5), Z(2.4), Y(0), Y(M4.outlet), Math.PI).id;
  r.devices['sw-outlet-ladder'] = { x: X(5.6), y: Y(M4.outlet), z: Z(1.2), yaw: 0, label: 'Lower ladder' };
  // the Phase 5 bay (x 0..3, z 0..6.5) behind full-height glass with a locked glass door: the overflow channel
  // (x 0..1.6, z 3.5..6.45 against a 6.2 wall: a split), the sump (x 0..3, z 0..3, 4 deep) with a ladder out
  gl(2.95, 0, 3.05, 4, 0, H);
  gl(2.95, 4, 3.05, 5.2, DOOR_H, H - DOOR_H);
  gl(2.95, 5.2, 3.05, 6.5, 0, H);
  gl(0, 6.45, 3.05, 6.55, 0, H);
  b.door(X(3), Y(0), Z(4), DOOR_W, 0, { locked: true });
  solid(1.6, 3.5, 2.0, 6.45, 0, M4.overflow);
  b.ladder(X(1.5), Z(2.6), Y(M4.sump), Y(0), 0);
  // LED strips on the co-op lips and OP's edge (accent, T6)
  strip(0, 18.02, 9, 18.02, M4.wall - 0.05);
  strip(1, 9.02, 4, 9.02, M4.w2 - 0.05);
  strip(3, 2.02, 9, 2.02, M4.outlet - 0.05);
  r.debug.push(
    { id: 'B4', label: 'B4 The Cistern (C1 at the A3 door)', pos: plantAt('B4', 6, 24), yaw: Math.PI },
    { id: 'B4-W1', label: 'B4 W1 top', pos: plantAt('B4', 2, 17.5, M4.wall), yaw: Math.PI },
    { id: 'B4-C2', label: 'B4 C2', pos: plantAt('B4', 2.5, 12), yaw: Math.PI },
    { id: 'B4-VG', label: 'B4 valve gallery', pos: plantAt('B4', 10.5, 14, M4.gallery), yaw: Math.PI },
    { id: 'B4-C3', label: 'B4 C3', pos: plantAt('B4', 6, 5), yaw: Math.PI },
    { id: 'B4-OP', label: 'B4 outlet platform', pos: plantAt('B4', 5, 1, M4.outlet), yaw: Math.PI },
  );
  for (const z of [22, 13, 4.5]) b.light({ ...plantAt('B4', 4.5, z, 7.5), radius: 12, intensity: 0.9 });
}

/**
 * The sump's liners and floor, built after every other piece of the map (bunker.ts): its floor is a piece the 'epic'
 * detail pass dresses as floor, so the wall dressing before it draws the same random stream at 'ultra' and 'epic'.
 */
export function buildShaftFloors(b: LevelBuilder): void {
  const from = b.boxes.length;
  pit(b, B4_SUMP, PLANT_Y, -M4.sump, C.conc);
  b.mark(from, { noLedge: true });
}

/**
 * Build the shaft and the reservoir into `b` (the sump last of all: `buildShaftFloors`). Returns doors (course ids ->
 * anchor ids), course devices, course anchors and the debug points. Afterwards every piece is `noLedge`.
 */
export function buildShaft(b: LevelBuilder): ShaftResult {
  const r: ShaftResult = { doors: {}, devices: {}, anchors: {}, debug: [] };
  const from = b.boxes.length;
  buildB3(b, r);
  buildAirlock(b, 'A3', r);
  buildB4(b, r);
  buildAirlock(b, 'A4', r);
  for (let k = from; k < b.boxes.length; k++) b.boxes[k]!.noLedge = true;
  return r;
}
