/**
 * J14 Marlow re-plan, A6 the Pump House (slice G-A6; PLAN section 2 and its cage-move risk, STATIONS.md sections 3, 6, 8, 9,
 * 10 SA11 / SA13 / OQ6; BRIEF A6): stations 14 (the rope), 15 (the hang-down) and 16 (the drop catch). The set file builds the
 * built yard less what this file removes or rebuilds (its `opts.replan` guards: the staff stair, its fillers, rail and dressing;
 * the gauge board and its dressing; the bridge slab round the plate and its plate skins; the cage's east wall and its dressing;
 * the cage's inner dressing; the lifted plate cover; the tagged-out fittings). This file adds:
 * - the drive pit: the cage footprint x 49.4-53.6, z 62.0-66.2 sunk to -1.6 (`FLOOR_HOLES`), lined under the cage walls (the
 *   cage keeps its place, its walls and its locked door `A6-cage`); inside, a landing at the door (y 0) reached by ten steps up
 *   the west wall, an upstand round the landing's open sides and a balustrade on the steps' high end (the drive panel stays out
 *   of a device's reach from them); the drive cabinet stands on a plinth from the pit floor. The exit release on the cabinet's
 *   back is in reach from the landing: pressed there, the door opens (push-bar side, inside only) and the landing walks out;
 * - the outfall: a covered culvert from the pit's east face to holding room six's near door (L6, x 64): z 62.5-63.7 from x 53.6,
 *   its floor a ramp from -1.6 to 0 by x 61.5, then z 61.1-63.7 at 0 to the door; a closed housing over it (walls 0.2 m outside
 *   the hole, roof 2.1 m over the floor at its highest, `noLedge`), the cage's east wall opened over the mouth. The pump floor
 *   reaches neither the pit nor the L6 door: the only way into L6 is the pit's outfall (the outfall gate stays the built flag
 *   gate on `a6-drive`);
 * - the gauge board on the housing's north face (the housing covers its old stand) and the attendant's round re-routed north of
 *   the housing, reading it (step 1's noise test, `A6_ATTENDANT_ROUTE_REPLAN`);
 * - the drop opening (OQ6): 1.0 x 1.0 m in the bridge deck at x 52-53, z 65-66, railed on its south and east sides, its west side
 *   the drop-out rail section (the rail lifted out, the sockets painted), the north side the stand-in ladder's head: a fall from
 *   the deck (4.4) lands on the pit floor (-1.6), 6.0 m. The hang-down through the gland plate is as built; the drive panel is out
 *   of reach from the pit floor (2.8 m over it), so dropping in first skips nothing;
 * - station 16's stand-in: the cage's fixed ladder `a6-pit-ladder` from the pit floor up through the drop opening to the deck,
 *   locked by the `anchorLock` gate `g-a6-pit-ladder` (the base opens it while `dropCatch` is not playable, R1 fix 7);
 * - the closed routes (Q24): no staff stair (the gallery's east end gets a 1.2 m screen across its head); the self-closing edge
 *   gate `g-a6-edge` (SA11, an `anchorLock` with `lockOn`): the loading edge's lip `a6-gallery-lip` is usable for the first
 *   player's leg-up and locks once one player stands on the gallery (`a6-gal1`), so the second climbs by the rope; a station 14
 *   retry drops the flag and the lip opens again;
 * - circuit 69 re-lamped (Q2): the sump high-bay and the two west gallery bulkheads (3 lamps, the table's budget), switched at
 *   `a6-sw-sump` on the sump bay's south wall by the L5 door;
 * - the stations (STATIONS section 3, verbatim), the pit's pass zone (section 8), LANTERN's retry lines (section 6), the
 *   objective lines (one per station and the outfall line).
 * Only type imports from `../` besides the set file's constants (the facility imports nothing from here).
 */
import { retryKey, type AnchorLockGate, type CourseObjective } from '../../../../game/course/courseDef';
import type { StationDef } from '../../../../game/course/stationDef';
import type { FacilityKit } from '../../../kit/facilityKit';
import type { LevelBuilder } from '../../../levelBuilder';
import { makeCone } from '../../../lights';
import { MARLOW_LEVEL } from '../../../lighting/levels';
import type { FloorHole } from '../../ctcourseGreybox';
import { A6_ATTENDANT, A6_BRIDGE, A6_CAGE, A6_DEAD_FITTINGS, A6_DECK, A6_DRIVE_FLAG, A6_GAL_FLAG, A6_GALLERY_LIP, A6_HANG, A6_HOLDER, A6_PASS_WAIT, A6_PLATE, A6_SHELL } from '../a6PumpHouse';
import { HALL_H, tally, type SetPart } from '../types';

// ---------------------------------------------------------------------------------------------------- the geometry

/** The drive pit: the cage footprint sunk to `y` (the cage's 0.1 m walls stand on its lining), the slab's floor under it. */
export const A6_PIT_Y = -1.6;
export const A6_PIT = { x0: A6_CAGE[0], z0: A6_CAGE[1], x1: A6_CAGE[2], z1: A6_CAGE[3], y: A6_PIT_Y, t: 0.1, base: -2.0 } as const;
/** The drop-catch landing spot on the pit floor (STATIONS section 3, mark B of 16). */
export const A6_PIT_LANDING = { x: 51.5, y: A6_PIT_Y, z: 63.5 } as const;
/** The outfall culvert's two holes (world [x0, z0, x1, z1]): from the pit's east face along z 62.5-63.7, then the widening to the L6
 *  door (z 61.1-62.9 at x 64); its floor ramps from the pit floor to 0 over the first. */
export const A6_CULVERT_1: FloorHole = [53.6, 62.5, 61.5, 63.7];
export const A6_CULVERT_2: FloorHole = [61.5, 61.1, 64.0, 63.7];
/** The housing over the culvert: walls `t` thick 0.2 m outside the holes (clear of the pump plinths' z 62.2 and pump 1's x 61.2),
 *  standing to the roof's underside `h` (the L6 door's head), the roof `roof` thick; the jog at x 61.3-61.5. */
export const A6_HOUSING = { t: 0.2, h: 2.1, roof: 0.2, jog: 61.3, south1: 62.3, south2: 60.9, north: 63.9, east: A6_SHELL.east } as const;
/** Holes this set cuts in the site slab (world metres [x0, z0, x1, z1]); `ctcourse.ts` hands every set's table to the facility. */
export const FLOOR_HOLES: readonly FloorHole[] = [[A6_PIT.x0, A6_PIT.z0, A6_PIT.x1, A6_PIT.z1], A6_CULVERT_1, A6_CULVERT_2];

/** The landing inside the cage door (y 0), its upstand (north and east, 1.1 m over it, from the pit floor) and the steps up the
 *  west wall (ten risers of 0.16 m, rising south) with the balustrade on their high end. */
export const A6_LANDING = { x0: A6_PIT.x0 + A6_PIT.t, x1: 52.2, z0: A6_PIT.z0 + A6_PIT.t, z1: 62.95, up: 1.1, t: 0.1 } as const;
export const A6_STEPS = { x0: A6_PIT.x0 + A6_PIT.t, x1: 50.5, z0: A6_LANDING.z1, len: 2.85, steps: 10 } as const;
export const A6_BALUSTRADE = { x0: 50.5, x1: 50.6, z1: 64.4 } as const;
/** The drive cabinet's plinth (the built cabinet's footprint, x 51.1-51.9, z 63.8-64.4) from the pit floor to 0. */
export const A6_PLINTH: [number, number, number, number] = [51.1, 63.8, 51.9, 64.4];

/** The drop opening in the bridge deck (OQ6) and its rails (0.05 m outside its south and east edges, 1.1 m). */
export const A6_DROP: FloorHole = [52.0, 65.0, 53.0, 66.0];
export const A6_DROP_RAIL = { h: 1.1, off: 0.05 } as const;
/** The lifted gland-plate cover, laid on the deck west of the plate (the built spot is over the drop opening). */
export const A6_COVER: FloorHole = [50.4, 64.625, 50.95, 65.175];
/** Station 16's stand-in: the cage's fixed ladder against the opening's north edge, the pit floor to the deck; its gate and flag. */
export const A6_PIT_LADDER = 'a6-pit-ladder';
export const A6_PIT_LADDER_GATE = 'g-a6-pit-ladder';
export const A6_PIT_LADDER_AT = { x: 52.5, z: 65.85 } as const;

/** The gauge board on the housing's north face (the built board's size), the attendant's G stop in front of it. */
export const A6_GAUGE_REPLAN = { x: 58.0, z: A6_HOUSING.north + 0.1, w: 1.2, t: 0.2, h: 1.5 } as const;
/** The screen across the gallery's east end (the closed stair head, Q24): 1.2 m on the deck at x 55.9-56.0. */
export const A6_STAIR_SCREEN = { x0: 55.9, x1: 56.0, h: 1.2 } as const;

// ------------------------------------------------------------------------------------- the guard, stations, lines

/**
 * The attendant's round on the re-plan (the outfall housing closes the gap he crossed by the gauge board and the cage door):
 * D the desk (his post, facing south over the log), W round the desk's west end, G the gauge board on the housing's north
 * face (facing south), N1 / N2 along the north side of the cage under the bridge, P3 pump 3's east face (facing west), and
 * back the same way. His waits (4 / 3 / 4 s) and facings are the built round's.
 */
export const A6_ATTENDANT_ROUTE_REPLAN: [number, number][] = [
  [61.5, 67.1],
  [60.0, 67.0],
  [58.0, 64.6],
  [54.5, 67.5],
  [48.5, 67.5],
  [48.2, 61.0],
  [48.5, 67.5],
  [54.5, 67.5],
  [60.0, 67.0],
];
export const A6_ATTENDANT_WAITS_REPLAN = [4, A6_PASS_WAIT, 3, A6_PASS_WAIT, A6_PASS_WAIT, 4, A6_PASS_WAIT, A6_PASS_WAIT, A6_PASS_WAIT];
export const A6_ATTENDANT_FACES_REPLAN = [Math.PI, Number.NaN, Math.PI, Number.NaN, Number.NaN, -Math.PI / 2, Number.NaN, Number.NaN, Number.NaN];

/** The new done flag's pass zone (STATIONS section 8): both players in the drive pit. */
export const A6_PIT_FLAG = 'a6-pit';
export const A6_PIT_ZONE: [number, number, number, number] = [49.55, 62.15, 53.45, 66.05];
/** The self-closing edge gate (SA11) and its flag: the lip is usable until one player stands on the gallery, then locked. */
export const A6_EDGE_GATE = 'g-a6-edge';
export const A6_GAL1_FLAG = 'a6-gal1';
/** Its pass zone (any player, floor 4.4): the gallery deck from 0.3 m back off the loading edge (a player hanging on the lip or
 *  mid-climb is not in it) to the north wall, west of the stair-head screen. */
export const A6_GAL1_ZONE: [number, number, number, number] = [A6_SHELL.west, A6_DECK.z + 0.3, A6_STAIR_SCREEN.x0, A6_SHELL.north];

/** Stations 14-16 (STATIONS.md section 3, the A6 block). */
export const A6_PUMP_HOUSE_STATIONS: readonly StationDef[] = [
  { n: 14, id: 'a6-rope', lesson: 'rope', retry: 'station', doneFlag: 'a6-gal',
    marks: [{ x: 51.0, z: 56.5, y: 0, yaw: 0 }, { x: 52.5, z: 56.5, y: 0, yaw: 0 }],
    guards: ['a6-attendant'], gates: ['g-a6-edge'] },
  { n: 15, id: 'a6-hangdown', lesson: 'hang_down', retry: 'station', doneFlag: 'a6-drive',
    marks: [{ x: 50.5, z: 68.5, y: 4.4, yaw: Math.PI }, { x: 52.5, z: 68.5, y: 4.4, yaw: Math.PI }],
    guards: ['a6-attendant'], gates: ['g-a6-panel'] },
  { n: 16, id: 'a6-dropcatch', lesson: 'drop_catch', retry: 'station', doneFlag: 'a6-pit', kit: 'dropCatch', standIn: 'g-a6-pit-ladder',
    marks: [{ x: 51.5, z: 65.5, y: 4.4, yaw: Math.PI }, { x: 51.5, z: 63.5, y: -1.6, yaw: 0 }],
    guards: ['a6-attendant'], gates: ['g-a6-pit-ladder'] },
];

/** LANTERN's lines when a station retries (STATIONS section 6). */
export const A6_RETRY_LINES: readonly { id: string; text: string }[] = [
  { id: 'a6-rope', text: 'The attendant saw you. Back to the sump bay, behind the kerb.' },
  { id: 'a6-hangdown', text: "The attendant saw you on the bridge. Back to the bridge's north end." },
  { id: 'a6-dropcatch', text: 'The attendant heard the landing. Back to the bridge; catch your partner.' },
];

/** The bay's objective lines on the re-plan: one per station (what and where), then the outfall line. */
export const A6_OBJECTIVES: readonly CourseObjective[] = [
  {
    id: 'a6-up',
    bay: 'A6',
    text: 'Both of you onto the motor gallery at the west end: a leg-up, then the rescue line.',
    a: 'Boost your partner up at the loading edge, then climb the rescue line.',
    b: 'Drop the rescue line from the davit box and brace it for your partner.',
    done: { flag: A6_GAL_FLAG },
  },
  {
    id: 'a6-hang',
    bay: 'A6',
    text: 'Lower one of you through the gland plate on the bridge to the drive panel.',
    a: 'Hold your partner over the drive cabinet. Watch the attendant.',
    b: 'Hold the isolate key on the drive panel while he is away.',
    done: { flag: A6_DRIVE_FLAG },
  },
  {
    id: 'a6-drop',
    bay: 'A6',
    text: 'One of you drops through the bridge opening into the drive pit; the other catches.',
    a: 'Step off the bridge through the opening over the pit.',
    b: 'Stand under the opening in the drive pit and catch your partner.',
    done: { flag: A6_PIT_FLAG },
  },
  { id: 'a6-lock', bay: 'A6', text: 'The interlock is green. Out through the outfall culvert from the pit to holding room six.' },
];

const STEEL = '#8d949b';
const DARK = '#3f4348';
const CONCRETE = '#5d5f5c';
const PANEL_DARK = '#20252b';
const GAUGE = '#5c6268';
const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
/** Dressing colours (the set's own materials; visual skins, `noLedge`, a side under 5 cm: out of the canonical light shapes). */
const LOOK = {
  black: '#1d1f20',
  white: '#e5e5de',
  red: '#b5282d',
  yellow: '#c9a227',
  wall: '#7d8588',
  dado: '#3b5445',
  frame: '#3b4147',
  steel: '#6a7077',
  steelDark: '#3a3f44',
  plate: '#585d61',
  seam: '#2f3336',
  louvre: '#6e757b',
  lampGreen: '#2f9e5a',
  tag: '#c0262b',
} as const;
const SKIN = 0.03;
/** A kit wall panel's outer face off the wall's face (the set's `PANEL_OUT`). */
const PANEL_OUT = 0.06;

/** `r` less `cut`, as up to four rects (west, east, then the south and north strips between them). */
function subtract(r: FloorHole, cut: FloorHole): FloorHole[] {
  const [x0, z0, x1, z1] = r;
  const [cx0, cz0, cx1, cz1] = cut;
  if (cx0 >= x1 || cx1 <= x0 || cz0 >= z1 || cz1 <= z0) return [r];
  const out: FloorHole[] = [];
  const ix0 = Math.max(x0, cx0);
  const ix1 = Math.min(x1, cx1);
  if (ix0 > x0) out.push([x0, z0, ix0, z1]);
  if (ix1 < x1) out.push([ix1, z0, x1, z1]);
  if (cz0 > z0) out.push([ix0, z0, ix1, cz0]);
  if (cz1 < z1) out.push([ix0, cz1, ix1, z1]);
  return out;
}
/** `rects` less every one of `cuts`. */
export function subtractAll(rects: readonly FloorHole[], cuts: readonly FloorHole[]): FloorHole[] {
  let out = [...rects];
  for (const c of cuts) out = out.flatMap((r) => subtract(r, c));
  return out;
}
/** The built bridge slab's four pieces round the gland plate (`hangPlate`: the plate 0.8 m north of the cage centre, the slab the cage
 *  plus its overhang on every side), world [x0, z0, x1, z1]. */
export function bridgeSlabRects(): FloorHole[] {
  const h2 = A6_HANG.hole / 2;
  const half = A6_HANG.cage[0] / 2 + A6_HANG.overhang;
  const [x0, x1, z0, z1] = [A6_HANG.x - half, A6_HANG.x + half, A6_HANG.z - half, A6_HANG.z + half];
  const pz0 = A6_PLATE.z - h2;
  const pz1 = A6_PLATE.z + h2;
  return [
    [x0, pz1, x1, z1],
    [x0, z0, x1, pz0],
    [x0, pz0, A6_PLATE.x - h2, pz1],
    [A6_PLATE.x + h2, pz0, x1, pz1],
  ];
}

/** Add the re-plan's pieces to `b` and amend `part` (the merge reads it afterwards). */
export function replanA6PumpHouse(b: LevelBuilder, kit: FacilityKit, part: SetPart): void {
  const p = part;
  /** A collide box from x0 to x1, z0 to z1, y0 to y1, `noLedge` unless told otherwise. */
  const solid = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string, o: { noLedge?: boolean; overhead?: boolean } = {}): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
    b.mark(from, { noLedge: o.noLedge ?? true, ...(o.overhead ? { overhead: true } : {}) });
  };
  /** A visual skin (no collision, `noLedge`, one side under `CANON_MIN_THICK`). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    if (Math.min(x1 - x0, y1 - y0, z1 - z0) >= 0.05) throw new Error(`replan a6: the skin at (${x0}, ${y0}, ${z0}) is not thin`);
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
    b.mark(from, { noLedge: true });
  };
  /** A skin on a face (the set's `face`): `side` its outward direction, `at` its plane, [a0, a1] the run along it, `layer` skins out. */
  const face = (side: 'n' | 's' | 'e' | 'w', at: number, a0: number, a1: number, y0: number, y1: number, color: string, layer = 0): void => {
    const o0 = layer * SKIN;
    const o1 = (layer + 1) * SKIN;
    if (side === 'n') skin(a0, a1, y0, y1, at + o0, at + o1, color);
    else if (side === 's') skin(a0, a1, y0, y1, at - o1, at - o0, color);
    else if (side === 'e') skin(at + o0, at + o1, y0, y1, a0, a1, color);
    else skin(at - o1, at - o0, y0, y1, a0, a1, color);
  };
  const P = A6_PIT;
  const H = A6_HOUSING;
  const [c1x0, c1z0, c1x1, c1z1] = A6_CULVERT_1;
  const [c2x0, c2z0, c2x1, c2z1] = A6_CULVERT_2;
  const deck = A6_HANG.deck;
  const under = deck - A6_HANG.slab;

  // ---- A6-R1: the drive pit (the cage footprint sunk 1.6 m), its lining under the cage walls, the east wall over the culvert mouth ----
  tally(b, p.register, 'A6-R1', "Drive pit: the cage footprint x 49.4-53.6, z 62.0-66.2 sunk to -1.6 (the slab cut by FLOOR_HOLES), its floor and a 0.1 m lining under the cage walls to the slab (noLedge; open over the culvert mouth z 62.5-63.7 on the east face); the cage's east wall rebuilt round the mouth to the housing's roof (2.1), its walls, door and place as built", () => {
    solid(P.x0, P.x1, P.z0, P.z1, P.base, P.y, CONCRETE);
    solid(P.x0, P.x0 + P.t, P.z0, P.z1, P.y, 0, CONCRETE);
    solid(P.x0 + P.t, P.x1 - P.t, P.z1 - P.t, P.z1, P.y, 0, CONCRETE);
    solid(P.x0 + P.t, P.x1 - P.t, P.z0, P.z0 + P.t, P.y, 0, CONCRETE);
    solid(P.x1 - P.t, P.x1, P.z0, c1z0, P.y, 0, CONCRETE);
    solid(P.x1 - P.t, P.x1, c1z1, P.z1, P.y, 0, CONCRETE);
    // the cage's east wall (the built 0.1 m wall from the floor to the slab's underside, its corners the north and south walls')
    solid(P.x1 - P.t, P.x1, P.z0 + P.t, c1z0, 0, under, STEEL);
    solid(P.x1 - P.t, P.x1, c1z1, P.z1 - P.t, 0, under, STEEL);
    solid(P.x1 - P.t, P.x1, c1z0, c1z1, H.h, under, STEEL);
  });

  // ---- A6-R2: inside the pit: the landing at the door, its upstand, the steps up the west wall, the balustrade, the cabinet's plinth ----
  tally(b, p.register, 'A6-R2', "Inside the pit: the landing inside the cage door (y 0, x 49.5-52.2, z 62.1-62.95) with a 1.1 m upstand on its open north and east sides; ten 0.16 m risers up the west wall (x 49.5-50.5) from the pit floor, rising south to the landing, a balustrade on their high end (x 50.5-50.6 to z 64.4); the drive cabinet's plinth from the pit floor (all noLedge): the drive panel is out of a device's reach from all of them, the exit release in reach from the landing", () => {
    const L = A6_LANDING;
    solid(L.x0, L.x1, L.z0, L.z1, P.y, 0, CONCRETE);
    solid(A6_BALUSTRADE.x0, L.x1 + L.t, L.z1, L.z1 + L.t, P.y, L.up, STEEL);
    solid(L.x1, L.x1 + L.t, L.z0, L.z1, P.y, L.up, STEEL);
    const S = A6_STEPS;
    b.stairs((S.x0 + S.x1) / 2, S.z0 + S.len / 2, S.x1 - S.x0, S.len, -P.y, S.steps, CONCRETE, Math.PI, P.y);
    solid(A6_BALUSTRADE.x0, A6_BALUSTRADE.x1, L.z1 + L.t, A6_BALUSTRADE.z1, P.y, L.up, STEEL);
    const [px0, pz0, px1, pz1] = A6_PLINTH;
    solid(px0, px1, pz0, pz1, P.y, 0, PANEL_DARK);
  });

  // ---- A6-R3: the outfall culvert (station 16's way out) and its housing ----
  tally(b, p.register, 'A6-R3', "Outfall culvert from the pit's east face to holding room six's near door (L6): z 62.5-63.7, its floor a ramp from -1.6 at x 53.6 to 0 at x 61.5, then z 61.1-63.7 at 0 to x 64; walls under the slab on its edges; a closed housing over it (0.2 m walls 0.2 m outside the holes, clear of the pump plinths, to a roof at 2.1-2.3; noLedge, the roof overhead): the pump floor reaches neither the pit nor the L6 door", () => {
    b.ramp((c1x0 + c1x1) / 2, (c1z0 + c1z1) / 2, c1z1 - c1z0, c1x1 - c1x0, -P.y, CONCRETE, Math.PI / 2, P.y);
    solid(c2x0, c2x1, c2z0, c2z1, -0.4, 0, CONCRETE);
    solid(c1x0, c1x1, c1z0 - H.t, c1z0, P.base, -0.4, CONCRETE);
    solid(c1x0, c1x1, c1z1, c1z1 + H.t, P.base, -0.4, CONCRETE);
    solid(c1x0, H.jog, H.south1, H.south1 + H.t, 0, H.h, CONCRETE);
    solid(H.jog, c2x0, H.south2, H.south1 + H.t, 0, H.h, CONCRETE);
    solid(c2x0, H.east, H.south2, H.south2 + H.t, 0, H.h, CONCRETE);
    solid(c1x0, H.east, H.north - H.t, H.north, 0, H.h, CONCRETE);
    solid(c1x0, H.jog, H.south1, H.north, H.h, H.h + H.roof, CONCRETE, { overhead: true });
    solid(H.jog, H.east, H.south2, H.north, H.h, H.h + H.roof, CONCRETE, { overhead: true });
  });

  // ---- A6-12: the gauge board, moved onto the housing's north face ----
  tally(b, p.register, 'A6-12', "Gauge board on the outfall housing's north face (the duty pumps' common panel, the attendant's G stop; moved from between pumps 1 and 2, which the housing covers): 1.2 x 0.2 x 1.5, noLedge", () => {
    const G = A6_GAUGE_REPLAN;
    solid(G.x - G.w / 2, G.x + G.w / 2, G.z - G.t / 2, G.z + G.t / 2, 0, G.h, GAUGE);
  });

  // ---- A6-R4: the bridge slab with the drop opening, its rails, the lifted cover moved ----
  tally(b, p.register, 'A6-R4', "Bridge slab round the gland plate (the built pieces, noLedge and overhead) with the drop opening 1.0 x 1.0 m at x 52-53, z 65-66 cut through it (OQ6: a fall from the deck lands on the pit floor, 6.0 m); 1.1 m rails on the opening's south and east sides (kit.handrail: invisible noLedge collision), its west side the drop-out rail section (sockets painted), its north side the stand-in ladder's head; the lifted plate cover laid west of the plate (paint, no collision)", () => {
    for (const [x0, z0, x1, z1] of subtractAll(bridgeSlabRects(), [A6_DROP])) solid(x0, x1, z0, z1, under, deck, DARK, { overhead: true });
    const [dx0, dz0, dx1, dz1] = A6_DROP;
    const o = A6_DROP_RAIL.off;
    kit.handrail(dx0, dz0 - o, dx1 + o, dz0 - o, { y: deck, h: A6_DROP_RAIL.h, group: 61 });
    kit.handrail(dx1 + o, dz0 - o, dx1 + o, dz1, { y: deck, h: A6_DROP_RAIL.h, group: 61 });
    const [cx0, cz0, cx1, cz1] = A6_COVER;
    const from = b.boxes.length;
    b.box((cx0 + cx1) / 2, deck + 0.02, (cz0 + cz1) / 2, cx1 - cx0, 0.04, cz1 - cz0, '#5c6268', 0, 0, false);
    b.mark(from, { noLedge: true });
  });

  // ---- A6-R5: station 16's stand-in ladder ----
  tally(b, p.register, 'A6-R5', "The cage's fixed ladder a6-pit-ladder (station 16's stand-in) against the drop opening's north edge, from the pit floor (-1.6) to the deck (4.4); locked by the anchorLock gate g-a6-pit-ladder (the base opens it while dropCatch is not playable, and it latches)", () => {
    p.anchors[A6_PIT_LADDER] = b.ladder(A6_PIT_LADDER_AT.x, A6_PIT_LADDER_AT.z, P.y, deck, 0, '#5b5f63').id;
  });
  p.bay.gates.push({ kind: 'anchorLock', id: A6_PIT_LADDER_GATE, anchorId: A6_PIT_LADDER, flag: A6_PIT_LADDER } satisfies AnchorLockGate);
  // the self-closing edge gate (SA11): the set file names the loading edge's lip; station 14 lists the gate (its retry reopens the lip)
  if (p.anchors[A6_GALLERY_LIP] === undefined) throw new Error('replan a6: the loading edge lip is not named');
  p.bay.gates.push({ kind: 'anchorLock', id: A6_EDGE_GATE, anchorId: A6_GALLERY_LIP, flag: A6_GAL1_FLAG, lockOn: true } satisfies AnchorLockGate);

  // ---- A6-R6: the closed stair head (Q24) ----
  tally(b, p.register, 'A6-R6', "The staff stair closed (Q24): no flight; a 1.2 m screen across the gallery's east end (x 55.9-56.0, z 69.6-71.775, noLedge) where its head was", () => {
    const S = A6_STAIR_SCREEN;
    solid(S.x0, S.x1, A6_DECK.z, A6_SHELL.north, A6_DECK.lip, A6_DECK.lip + S.h, DARK);
  });

  // ---- A6-R7: circuit 69 re-lamped (Q2): the sump high-bay and the two west gallery bulkheads, at the tagged-out fittings' spots ----
  tally(b, p.register, 'A6-R7', 'Circuit 69 live (Q2: every light works): the sump high-bay (51.0, 8.4, 56.0) and the two west gallery bulkheads (42.5 and 46.5, 6.6, 71.4), at the built tagged-out fittings, on the switch a6-sw-sump by the L5 door; their rod and arms', () => {
    const [bay, ...bulks] = A6_DEAD_FITTINGS;
    b.light({ kind: 'spot', x: bay!.x, y: 8.4, z: bay!.z, radius: 11, intensity: 2.4, color: WHITE, cone: makeCone(0, -1, 0, 0.9), group: 69, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.3, sz: 0.6, oy: 0.15 } });
    skin(bay!.x - 0.02, bay!.x + 0.02, 8.7, HALL_H, bay!.z - 0.02, bay!.z + 0.02, LOOK.steel);
    for (const f of bulks) {
      b.light({ x: f.x, y: f.y, z: f.z, radius: 6.5, intensity: 0.7, color: WHITE, group: 69, electric: true, destructible: true, fixture: { sx: 0.3, sy: 0.2, sz: 0.15, oy: 0 } });
      skin(f.x - 0.02, f.x + 0.02, f.y - 0.02, f.y + 0.02, f.z + f.sz / 2, A6_SHELL.north - PANEL_OUT, LOOK.steelDark);
    }
  });
  p.switches.push({ id: 'a6-sw-sump', group: 69, pos: { x: 51.0, y: 1.2, z: A6_SHELL.south + 0.05 }, yaw: 0 });

  // ---- the guard re-routed, the stations, the pit's pass zone, LANTERN's lines, the objective lines ----
  const att = p.squads[A6_ATTENDANT];
  if (!att || !p.bay.squad.includes(A6_ATTENDANT)) throw new Error('replan a6: the attendant is missing');
  p.squads[A6_ATTENDANT] = { ...att, route: A6_ATTENDANT_ROUTE_REPLAN, waits: A6_ATTENDANT_WAITS_REPLAN, faces: A6_ATTENDANT_FACES_REPLAN };
  p.bay.stations = A6_PUMP_HOUSE_STATIONS;
  p.passZones.push({ id: 'a6-p-pit', box: A6_PIT_ZONE, flag: A6_PIT_FLAG, floorY: A6_PIT_Y });
  p.passZones.push({ id: 'a6-p-gal1', box: A6_GAL1_ZONE, flag: A6_GAL1_FLAG, floorY: A6_DECK.lip, any: true });
  p.externalFlags.push(A6_PIT_FLAG, A6_PIT_LADDER, A6_GAL1_FLAG);
  for (const r of A6_RETRY_LINES) p.bay.radio.push({ at: retryKey(r.id), text: r.text });
  p.objectives.length = 0;
  p.objectives.push(...A6_OBJECTIVES.map((o) => ({ ...o })));

  // ---- spaces, nav seeds, debug points, light and shot spots (the cage's and the gauge board's move with them) ----
  p.ambientZones.push({ id: 'A6-pit', box: [49, 61, 64, 67], ambient: MARLOW_LEVEL.standby, minY: A6_PIT_Y - 0.5, maxY: HALL_H - 0.1 });
  p.camSpaces.push({ box: [c1x0, c2z0, c2x1, c1z1], size: 'tight' });
  const cageSeed = p.navSeeds.findIndex((s) => Math.abs(s.x - A6_HANG.x) < 1e-6 && Math.abs(s.z - 62.9) < 1e-6);
  if (cageSeed >= 0) p.navSeeds.splice(cageSeed, 1);
  p.navSeeds.push({ x: 51.0, y: 0, z: 62.5 }, { x: 52.5, y: A6_PIT_Y, z: 64.8 }, { x: 62.5, y: 0, z: 62.4 });
  const move = (id: string, label: string, x: number, y: number, z: number): void => {
    const d = p.debugPoints.find((q) => q.id === id);
    if (d) Object.assign(d, { label, pos: { x, y, z } });
  };
  move('A6-mid', 'Set 6 middle (the gauge board on the outfall housing)', A6_GAUGE_REPLAN.x, 0, 64.8);
  move('A6-cage', 'Set 6 in the drive pit (station 16, mark B)', A6_PIT_LANDING.x, A6_PIT_Y, A6_PIT_LANDING.z);
  p.debugPoints.push(
    { id: 'A6-landing', label: 'Set 6 the landing inside the cage door', pos: { x: 51.5, y: 0, z: 62.5 }, yaw: Math.PI },
    { id: 'A6-culvert', label: 'Set 6 the outfall culvert (the ramp)', pos: { x: 57.5, y: -0.82, z: 63.1 }, yaw: Math.PI / 2 },
    { id: 'A6-drop', label: 'Set 6 bridge, the drop opening (station 16, mark A)', pos: { x: 51.5, y: deck, z: 65.5 }, yaw: Math.PI },
  );
  const spot = (name: string, o: Partial<SetPart['lightSpots'][number]>): void => {
    const s = p.lightSpots.find((q) => q.name === name);
    if (s) Object.assign(s, o);
  };
  spot('A6 gauge board', { z: 64.8 });
  spot('A6 gauge board cut', { z: 64.8 });
  // the outfall approach is now the covered culvert (dark under its roof); the cage's spot is the pit floor, under the work light
  // 5 m up (no band: the catcher's mark reads as the bake gives it)
  spot('A6 outfall approach', { band: 'pocket' });
  spot('A6 cage', { y: A6_PIT_Y, z: 63.5, band: 'any' });
  spot('A6 pump floor', { z: 65.2 });
  // circuit 69 live (Q2): the sump vantage and the west gallery read lit, pump 3 between the bands; each dark with 69 cut
  spot('A6 vantage', { band: 'read' });
  spot('A6 rope spot', { band: 'read' });
  spot('A6 pump 3', { band: 'any' });
  p.lightSpots.push(
    { name: 'A6 sump cut', kind: 'body', x: 51.0, y: 0, z: 56.6, band: 'cut', off: [69] },
    { name: 'A6 west gallery cut', kind: 'body', x: 43.15, y: A6_DECK.lip, z: 70.2, band: 'cut', off: [69] },
    { name: 'A6 pump 3 cut', kind: 'body', x: 48.2, y: 0, z: 61.0, band: 'cut', off: [69] },
    { name: 'A6 culvert', kind: 'body', x: 57.5, y: -0.82, z: 63.1, band: 'pocket' },
  );
  const shot = p.shotVantages.find((v) => v.name === 'a6-stair-head');
  if (shot) Object.assign(shot, { name: 'a6-gallery-east', feet: [55.5, A6_DECK.lip, 71.2] });
  p.shotVantages.push({ name: 'a6-pit', feet: [52.5, A6_PIT_Y, 64.6], cam: [50.3, 0.0, 65.7], target: [52.5, 4.4, 65.5] });

  // ---- A6-R8: dressing (visual skins): the gauge board, the bridge plate round the opening, the cage's faces, the pit, the north wall ----
  tally(b, p.register, 'A6-R8', "Dressing (visual skins, no collision): the gauge board's panel, gauges, lamp row and tag on the housing; the bridge's chequer plate and seams round the plate, the cover and the drop opening, a yellow band round the opening and the drop-out rail's sockets; the cage's outer east face round the culvert mouth and its inner kick band and rails at the pit floor; the north wall where the staff stair was (block, dado, plinth); the sump switch's box", () => {
    // the gauge board (the built board's dressing at its new place)
    const G = A6_GAUGE_REPLAN;
    const gn = G.z + G.t / 2;
    face('n', gn, G.x - G.w / 2, G.x + G.w / 2, 0, 0.1, LOOK.black);
    face('n', gn, G.x - G.w / 2 + 0.05, G.x + G.w / 2 - 0.05, 0.55, 1.45, LOOK.steelDark);
    for (const x of [G.x - 0.28, G.x, G.x + 0.28]) {
      face('n', gn, x - 0.11, x + 0.11, 1.0, 1.22, LOOK.white, 1);
      face('n', gn, x - 0.01, x + 0.01, 1.04, 1.18, LOOK.black, 2);
    }
    face('n', gn, G.x - 0.4, G.x + 0.4, 1.3, 1.4, LOOK.white, 1);
    for (const [x, color] of [[G.x - 0.28, LOOK.lampGreen], [G.x, LOOK.lampGreen], [G.x + 0.28, LOOK.red]] as const) face('n', gn, x - 0.03, x + 0.03, 0.7, 0.76, color, 1);
    face('n', gn, G.x + 0.45, G.x + 0.55, 0.78, 0.92, LOOK.tag, 1);
    skin(G.x - G.w / 2, G.x + G.w / 2, G.h, G.h + SKIN, G.z - G.t / 2, gn, LOOK.steel);
    // the bridge plate: the bridge less the plate's striped frame, the cover and the opening; seams every metre, clear of the holder's
    // spot, the frame and the opening
    const [bx0, bz0, bx1, bz1] = A6_BRIDGE;
    const frame: FloorHole = [51.125, 64.525, 51.875, 65.275];
    for (const [x0, z0, x1, z1] of subtractAll([[bx0, bz0, bx1, bz1]], [frame, A6_COVER, A6_DROP])) skin(x0, x1, deck, deck + 0.005, z0, z1, LOOK.plate);
    const seamCuts: FloorHole[] = [frame, A6_DROP, [A6_HOLDER.x - 0.5, A6_HOLDER.z - 0.5, A6_HOLDER.x + 0.5, A6_HOLDER.z + 0.5]];
    for (let x = bx0 + 1.0; x < bx1 - 0.1; x += 1.0) {
      for (const [x0, z0, x1, z1] of subtractAll([[x - 0.01, bz0, x + 0.01, bz1]], seamCuts)) if (x1 - x0 > 0.015) skin(x0, x1, deck + 0.005, deck + 0.009, z0, z1, LOOK.seam);
    }
    const [dx0, dz0, dx1, dz1] = A6_DROP;
    skin(dx0 - 0.1, dx1 + 0.1, deck + 0.005, deck + 0.012, dz0 - 0.1, dz0, LOOK.yellow);
    skin(dx1, dx1 + 0.1, deck + 0.005, deck + 0.012, dz0, dz1, LOOK.yellow);
    skin(dx0 - 0.1, dx0, deck + 0.005, deck + 0.012, dz0, dz1, LOOK.yellow);
    for (const z of [dz0 + 0.08, dz1 - 0.08]) skin(dx0 - 0.08, dx0 - 0.02, deck + 0.012, deck + 0.04, z - 0.03, z + 0.03, LOOK.black);
    // the cage's outer east face: louvred panels beside the housing, the strip over its roof
    const [cx0, cz0, cx1, cz1] = A6_CAGE;
    for (const [a, e] of [[cz0, H.south1], [H.north, cz1]] as const) {
      face('e', cx1, a, e, 0, 1.2, LOOK.steelDark);
      face('e', cx1, a, e, 1.14, 1.2, LOOK.yellow, 1);
      for (let y = 1.4; y < under - 0.2; y += 0.25) face('e', cx1, a + 0.02, e - 0.02, y, y + 0.07, LOOK.louvre, 1);
      face('e', cx1, a, e, under - 0.12, under, LOOK.frame, 1);
    }
    face('e', cx1, H.south1, H.north, H.h + H.roof, under, LOOK.steelDark);
    for (let y = H.h + H.roof + 0.2; y < under - 0.2; y += 0.25) face('e', cx1, H.south1 + 0.05, H.north - 0.05, y, y + 0.07, LOOK.louvre, 1);
    // inside the pit: a kick band from the pit floor and rails up the walls (the east face round the culvert mouth, the south face east
    // of the landing)
    const ky0 = A6_PIT_Y;
    const ky1 = A6_PIT_Y + 1.2;
    const rails = [ky1, ky1 + 1.2, ky1 + 2.4, ky1 + 3.6];
    const inner = [
      ['e', cx0 + P.t, cz0 + P.t, cz1 - P.t],
      ['s', cz1 - P.t, cx0 + P.t, cx1 - P.t],
      ['w', cx1 - P.t, cz0 + P.t, c1z0],
      ['w', cx1 - P.t, c1z1, cz1 - P.t],
      ['n', cz0 + P.t, A6_LANDING.x1 + A6_LANDING.t, cx1 - P.t],
    ] as const;
    for (const [side, at, a, e] of inner) {
      face(side, at, a, e, ky0, ky1, LOOK.steelDark);
      for (const y of rails) face(side, at, a, e, y, y + 0.06, LOOK.frame, 1);
    }
    face('w', cx1 - P.t, c1z0, c1z1, H.h, H.h + 0.06, LOOK.yellow);
    // the north wall where the staff stair was (x 56.0-63.75, under the gallery strip's kit panels from 4.4): plinth, dado, block
    const n = A6_SHELL.north;
    face('s', n, 56.0, A6_SHELL.east, 0, 0.3, LOOK.black);
    face('s', n, 56.0, A6_SHELL.east, 0.3, 1.2, LOOK.dado);
    face('s', n, 56.0, A6_SHELL.east, 1.2, A6_DECK.lip, LOOK.wall);
    // the sump switch's box on the south wall by the L5 door
    const s = A6_SHELL.south;
    face('n', s, 50.9, 51.1, 1.08, 1.32, LOOK.steel);
    face('n', s, 50.98, 51.02, 1.32, 4.2, LOOK.steelDark);
  });
}
