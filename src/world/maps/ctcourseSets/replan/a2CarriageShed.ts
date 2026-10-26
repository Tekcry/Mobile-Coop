/**
 * J14 Marlow re-plan, A2 the Carriage Shed (slice G-A2; PLAN section 2, STATIONS.md sections 3, 5, 6, 8, 9): one forced route
 * stores bay -> roller door -> the road 2 / 3 lane -> the neck -> the wheel-drop pit, three stations and one guard. Built into
 * `b` after the set's own builder (which, with `{ replan: true }`, leaves out the staging deck, its stair, screens, dressing
 * and lip, the permit gate, the east wheel stops, the east track panels, the ballast strips and cabinet 2's east-wall body):
 * - the shunter alone (`a2-watch-w` / `a2-watch-e` out): post (51, 10) facing east down the neck, round to (65.5, 7.5) and back
 *   (the built (66, 7.5) is the pit's edge), the built waits;
 * - the strip behind the removed deck is closed: the A2-21 north closures (x 45.5-46.0 and 56.0-56.5) run on to the north
 *   wall's face (z 19.75) at full height;
 * - station 3 (`shutter_hold`): a wall at x 33 to the roof from the cabin's north-east corner to the north wall closes the
 *   stores bay; in it the roller door `A2-shutter` (z 11.0-14.0) on the course `hold` gate `g-a2-shutter` (one holds it up at
 *   the south jamb, from either side, the other goes under crouched). The cabin's back door `A2-back` is locked for good
 *   (taken off the course doors, locked and not breachable). Once station 3 passes the roller door latches open for good
 *   (`g-a2-shutter-open`, station 4's stand-in: lead answer 3), so station 4's presser walks from the cabin to the lane. Gap 1/2's neck mouth (x 45.5-46.0, z 6.3-8.7) is closed with the
 *   A2-21 closer idiom, so the lane is the one way into the neck;
 * - station 4 (`timed_light_cut`, 15 s): the built isolator `g-a2-neck`; cabinet 2 moves to the pit's near side on the road 2
 *   east van's north face (`A2_CAB2_REPLAN`), off station 5's marks; the drill window is `src/game/course/replan/a2Ticks.ts`;
 * - station 5 (`plank_bridge`, stand-in): an open wheel-drop pit x 66.0-69.0, wall to wall (z 0.25-19.75), floor at y -1.6
 *   (`FLOOR_HOLES` cuts the site slab); step irons on the near face only; on the far edge a 1.1 m site barrier (the engine's
 *   mantle reaches 1.8 m and a running hop 3.2 m, so a noLedge edge alone would stop neither); the stand-in is a hoarded
 *   maintenance walkway over the pit (door `A2-walkway`, flag gate `g-a2-walkway`, opened by `CourseState`'s stand-in rule
 *   while `plankBridge` is off); a stack of scaffold boards at the east end (dressing); (marlow-kit-geo Q1) the barrier's
 *   board slot opposite the lane strip (`A2_BOARD_SLOT`), where a laid board bears on the far landing under a raised panel;
 * - the stations (STATIONS section 3, verbatim), the pass zones `a2-lane` and `a2-across`, LANTERN's retry lines, the
 *   objective lines (what and where), the coat corner's wall lamp on circuit 22 (the re-plan table's second lamp).
 * - (marlow-kit-wire) the Plank Bridge kit spot `a2-plank` on the board stack (`A2_BOARD_STACK`), placed unconditionally
 *   (inert while `plankBridge` is off); with it on, the objective names the board.
 * Value imports only from the set file, `../types` and two pure course modules (`kitApi`, `stationDef`) (the facility
 * imports nothing from here: no cycle).
 */
import type { EgressGate, FlagGate, HoldGate } from '../../../../game/course/courseDef';
import { kitMoveOn, type StationDef } from '../../../../game/course/stationDef';
import { addKitSpot } from '../../../../game/kit/kitApi';
import type { FacilityKit } from '../../../kit/facilityKit';
import type { LevelBuilder } from '../../../levelBuilder';
import { FacilityProps } from '../../../props/facilityProps';
import type { FloorHole } from '../../ctcourseGreybox';
import { makeCone } from '../../../lights';
import { A2_BACK_DOOR, A2_ISO_2, A2_ROADS, A2_SHUNTER, A2_SHUNTER_FACES, A2_SHUNTER_WAITS, A2_WATCH_E, A2_WATCH_W } from '../a2CarriageShed';
import { HALL_H, tally, type SetPart } from '../types';

/** The wheel-drop pit (SA9: x 66.0-69.0, far landing 0.75 m; wall to wall in z; floor 1.6 m down). */
export const A2_PIT = { x0: 66.0, x1: 69.0, z0: 0.25, z1: 19.75, depth: 1.6 } as const;
/** Holes this set cuts in the site slab (world metres [x0, z0, x1, z1]); `ctcourse.ts` hands every set's table to the facility. */
export const FLOOR_HOLES: readonly FloorHole[] = [[A2_PIT.x0, A2_PIT.z0, A2_PIT.x1, A2_PIT.z1]];
/** The pit's liners (outside the hole, under the slab) and its floor slab's thickness. */
const LINER = 0.2;
const PIT_FLOOR_T = 0.3;
/** The far edge's site barrier (on the far landing, x0-x1, `h` over the floor), broken only where the walkway lands. (marlow-play
 *  B3) 0.04 m thick: the strip from the walkway to the L2 door, between it and the L2 wall's face (x 69.75), is 0.71 m, over a
 *  body's 2 x (radius 0.3 + keepDistance 0.04) = 0.68 m (at 0.1 m it was 0.65 m). It still runs wall to wall: stopping it short
 *  of the door would let the pit be mantled out onto the landing. */
export const A2_PIT_BARRIER = { x0: 69.0, x1: 69.04, h: 1.1 } as const;
/**
 * (marlow-kit-geo Q1) The board slot: the barrier's panel opposite the lane strip (z 12.7-13.7, between the walkway's north
 * hoarding board and the road 3 van's south face) stands on raised feet, its bottom rail `y0` over the landing, so a laid
 * 3.9 m board slides under it and bears on the far landing (pit 3.0 m: 0.45 m bearing each end, the band 1.0-3.3 m).
 * The panel still stops a player alone: it covers the running hop's clear line (0.9 m over the feet,
 * `src/player/traversal.ts:224`) and the mantle's top-clear line (0.5 m over the landing, `traversal.ts:261`), and nothing
 * passes the 0.25 m slot. An open slot cannot do both: the board spans at most 3.3 m, a running hop reaches 3.2 m from the
 * feet (`traversal.ts:220`) plus up to 0.23 m of body past the edge (the 50 deg support slope, `playerController.ts:232`).
 * The crosser climbs the panel off the board's end: its face stands out over the pit (`x0`) so it is 0.19 m deep, enough
 * for the climb probe's top sample 0.12 m past the face (`traversal.ts:239`), and its back is the barrier's (`x1`), so the
 * strip behind it keeps 0.71 m.
 */
export const A2_BOARD_SLOT = { x0: 68.85, x1: 69.04, z0: 12.7, z1: 13.7, y0: 0.25, h: 1.1 } as const;
/** (marlow-play B3) The L2 wall's face on the far landing. */
export const A2_L2_FACE_X = 69.75;
/** The step irons (ladders on the near face, base on the pit floor): one each side of the walkway. */
export const A2_STEP_IRONS_Z = [6.8, 13.2] as const;
export const A2_STEP_IRONS_X = A2_PIT.x0 + 0.35;

/** The stores bay's wall (x 33, 0.3 m, to the roof) from the cabin's north-east corner (32.1, 4.9-5.1) to the north wall. */
export const A2_STORES_WALL = { x: 33, t: 0.3, z0: 4.9, z1: 19.75 } as const;
/** The cabin's north-east corner (its north wall is 0.2 m on the z 5 line, to x 32.1). */
const CABIN_NE = { x: 32.1, z0: 4.9, z1: 5.1 } as const;
/** The running shed's roller door in the stores wall, centred on the lane: z 11.0-14.0; it lifts this far (m: the engine has no
 *  roll-under move, so the opening is a crouched body's (1.15 m) with margin, not the graph's 0.9 m). */
export const A2_SHUTTER = { z0: 11.0, z1: 14.0, lift: 1.25 } as const;
export const A2_SHUTTER_DOOR = 'A2-shutter';
export const A2_SHUTTER_GATE = 'g-a2-shutter';
/** The hold point on the stores face at the south jamb: within `Interactable` reach (1.4 m) of a body on either side of the door. */
export const A2_SHUTTER_HOLD = 'a2-shutter-hold';
export const A2_SHUTTER_HOLD_AT = { x: 32.8, z: 10.6 } as const;
/**
 * The roller door's latch (lead answer 3, 2026-10-26): open for good once station 3 passes. A course door is unlocked only when
 * every gate on it is open unless an `egress` gate on it is open (`CourseState.locked`), so the latch is an egress gate (a flag
 * gate beside the hold gate would keep the door locked until both opened, and station 3 could never pass). It is station 4's
 * stand-in: the base opens it as station 4 goes live (station 3's done flag `a2-lane` set) and keeps it open through station 4's
 * retries; a bay restart shuts it with the rest. Its switch is the hold point, whose item is the hold gate's braced one (added
 * first), so no press ever opens it by hand.
 */
export const A2_SHUTTER_OPEN_GATE = 'g-a2-shutter-open';

/** The closers (the A2-21 idiom: noLedge boards at the rakes' neck ends): gap 1/2's neck mouth, and the north closures run on
 *  from the removed deck's face (z 17.5) to the north wall at full height. */
export const A2_GAP12_CLOSE = { x0: 45.5, x1: 46.0, z0: 6.3, z1: 8.7, h: 3.4 } as const;
export const A2_NORTH_CLOSE = { xs: [[45.5, 46.0], [56.0, 56.5]] as const, z0: 17.5, z1: 19.75, h: HALL_H } as const;

/** Cabinet 2 (isolator 2) on the pit's near side: on the road 2 east van's north face (z 11.3), front on +z, pressed from the
 *  lane gap 2/3; its body x 63.05-63.95, z 11.3-11.6, 1.6 m. */
export const A2_CAB2_REPLAN = { x: 63.5, z: 11.6 } as const;

/** The plank stand-in: a hoarded maintenance walkway over the pit, deck flush with the floor (y 0), 1.2 m clear between its
 *  boards, from the lane gap 2/3's east end to the far landing (road 2's east van ends on the pit's near edge at z 8.7-11.3,
 *  so the drawn z 9.4-10.6 has no near-side floor to board from). */
export const A2_WALKWAY = { z0: 11.4, z1: 12.6, board: 0.1, h: 2.2, deck: 0.2 } as const;
/** (marlow-kit-wire) The scaffold board stack at the lane's east end (dressing; the Plank Bridge spot is its middle): eight
 *  0.04 m boards in two 0.22 m columns against the road 3 van's south face, four layers to `top`. */
export const A2_BOARD_STACK = { x0: 60.9, x1: 64.8, z0: 13.23, z1: 13.68, top: 0.16 } as const;
/** (marlow-kit-wire) Station 5's objective while `plankBridge` is on (the built text is the walkway's). */
export const A2_PLANK_KIT_TEXT = 'Lay a board from the stack over the pit by the east vans, then cross to the L2 door.';
export const A2_WALKWAY_DOOR = 'A2-walkway';
export const A2_WALKWAY_GATE = 'g-a2-walkway';
export const A2_WALKWAY_FLAG = 'a2-walkway';

/** The two new done flags (STATIONS section 8) and their zones. */
export const A2_LANE_FLAG = 'a2-lane';
export const A2_LANE_ZONE: [number, number, number, number] = [36, 11.3, 46, 13.7];
export const A2_ACROSS_FLAG = 'a2-across';
export const A2_ACROSS_ZONE: [number, number, number, number] = [69, 8.5, 69.75, 11.5];

/** The shunter on the re-plan: his post faces east down the neck; the east stop is short of the pit's edge. */
export const A2_SHUNTER_ROUTE_REPLAN: [number, number][] = [[51, 10], [56, 7.5], [65.5, 7.5], [56, 7.5]];
export const A2_SHUNTER_YAW_REPLAN = Math.PI / 2;

/** The coat corner's wall lamp over the hooks (circuit 22, the cabin's switch). */
export const A2_COAT_LAMP = { x: 28.95, y: 2.05, z: 4.7, radius: 2.4, intensity: 0.06 } as const;
/** The stores bay's strip (lead answer 4): one more shed general strip (circuit 20, the west door switch) under the tie over the
 *  bay, which the x 33 wall cuts off from the shed's other strips; the bay reads at least 0.30 (transit, LR7). */
export const A2_STORES_LAMP = { x: 30.6, y: 6.5, z: 12.5, radius: 7.5, intensity: 0.42 } as const;

/** Stations 3, 4 and 5 (STATIONS.md section 3, A2 block, verbatim, but for station 4's latch: lead answer 3 lists it in station 4's
 *  gates, and it is station 4's stand-in so the base opens it as station 4 goes live). */
const a2CarriageShedStations: StationDef[] = [
  { n: 3, id: 'a2-shutter', lesson: 'shutter_hold', retry: 'station', doneFlag: 'a2-lane',
    marks: [{ x: 31.0, z: 11.5, y: 0, yaw: Math.PI / 2 }, { x: 31.0, z: 13.0, y: 0, yaw: Math.PI / 2 }],
    guards: ['a2-shunter'], gates: ['g-a2-shutter'] },
  { n: 4, id: 'a2-lights', lesson: 'timed_light_cut', retry: 'station', doneFlag: 'a2-east', drillS: 15,
    marks: [{ x: 30.5, z: 2.5, y: 0, yaw: Math.PI }, { x: 45.5, z: 12.5, y: 0, yaw: Math.PI / 2 }],
    guards: ['a2-shunter'], gates: ['g-a2-neck', 'g-a2-shutter-open'], standIn: 'g-a2-shutter-open' },
  { n: 5, id: 'a2-plank', lesson: 'plank_bridge', retry: 'station', doneFlag: 'a2-across', kit: 'plankBridge', standIn: 'g-a2-walkway',
    marks: [{ x: 65.5, z: 12.0, y: 0, yaw: Math.PI / 2 }, { x: 65.5, z: 13.0, y: 0, yaw: Math.PI / 2 }],
    guards: ['a2-shunter'], gates: ['g-a2-walkway'] },
];
export const A2_STATIONS: readonly StationDef[] = a2CarriageShedStations;

/** LANTERN's retry lines (STATIONS section 6, verbatim). */
export const A2_RETRY_LINES: readonly { at: string; text: string }[] = [
  { at: 'retry:a2-shutter', text: 'Seen at the roller door. Back to the stores bay.' },
  { at: 'retry:a2-lights', text: 'The shunter saw you in the neck. Back to the cabin and the lane.' },
  { at: 'retry:a2-lights:timer', text: 'Lights came back with you in the neck. Back to the cabin and the lane.' },
  { at: 'retry:a2-plank', text: 'The shunter saw the board. Back to the board stack at the east end.' },
];
/** The built entry line the re-plan drops (no spotters, no staging); nothing replaces it (the stations' own lines carry the retries). */
export const A2_BUILT_STAGING_LINE = 'Two spotters on the staging. Seen in the neck lights and we start again.';
/** (marlow-play C2) The built neck lines the re-plan drops too: the re-plan's isolator lures nobody (`courseMode` `isolatorLures`),
 *  so "press while the shunter stands at the neck" would send the presser to wait on a lure that never comes. */
export const A2_BUILT_NECK_LINES: readonly string[] = [
  'The neck is on two isolators. Fifteen seconds of dark each time. Use them well.',
  "Press while the shunter stands at the neck, or he won't come and look.",
];
/** The built objective steps the re-plan replaces. */
const BUILT_STEPS = ['a2-neck', 'a2-back', 'a2-lock'];
/** Built map data the re-plan's geometry retires: the deck's leg-up mark, the old cabinet 2 spot, the deck and coat corner
 *  pocket spots (the coat corner is lit now), the stair head's shot. */
const DROP_DEBUG = ['A2-mark', 'A2-east'];
const DROP_SPOTS = ['A2 deck', 'A2 cabinet 2', 'A2 coat corner'];
const DROP_SHOTS = ['a2-stair-head'];

const WALL_C = '#5a6168';
const CLOSURE_C = '#4d555b';
const PIT_C = '#4a4d50';
const HOARD_C = '#8c8f86';
const BARRIER_C = '#c9a227';
const STEEL = '#5c6268';
const BALLAST = '#4a4640';
const BOARD_C = '#9a7b52';
const BLACK = '#1d1f20';
const WHITE: [number, number, number] = [0.96, 0.97, 1.0];

/** Add the re-plan's pieces to `b` and amend `part` (the merge reads it afterwards). */
export function replanA2CarriageShed(b: LevelBuilder, _kit: FacilityKit, part: SetPart): void {
  const p = part;
  /** A collidable, `noLedge` box from x0 to x1, z0 to z1, y0 to y1. */
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
    b.mark(from, { noLedge: true });
  };
  /** A visual-only skin (no collision, `noLedge`; one side under the canonical light shapes' 0.05 m). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
    b.mark(from, { noLedge: true });
  };
  const half = A2_STORES_WALL.t / 2;
  const wx0 = A2_STORES_WALL.x - half;
  const wx1 = A2_STORES_WALL.x + half;

  // ---- guards (Q11): the shunter alone, his post turned east, his east stop short of the pit ----
  delete p.squads[A2_WATCH_W];
  delete p.squads[A2_WATCH_E];
  p.bay.squad = p.bay.squad.filter((s) => s !== A2_WATCH_W && s !== A2_WATCH_E);
  const shunter = p.squads[A2_SHUNTER]!;
  const faces = [...(shunter.faces ?? A2_SHUNTER_FACES)];
  faces[0] = A2_SHUNTER_YAW_REPLAN;
  p.squads[A2_SHUNTER] = { ...shunter, yaw: A2_SHUNTER_YAW_REPLAN, route: A2_SHUNTER_ROUTE_REPLAN, waits: [...A2_SHUNTER_WAITS], faces };

  // ---- the closers: gap 1/2's neck mouth, the north closures on to the north wall (Q24) ----
  tally(b, p.register, 'A2-31', "Re-plan closers (A2-21 idiom, noLedge): gap 1/2's neck mouth x 45.5-46.0, z 6.3-8.7 to the vans' 3.4 m (the lane is the one way into the neck), and the two north closures run on from z 17.5 to the north wall's face z 19.75 at full height (the deck is gone)", () => {
    const g = A2_GAP12_CLOSE;
    slab(g.x0, g.x1, g.z0, g.z1, 0, g.h, CLOSURE_C);
    for (const [x0, x1] of A2_NORTH_CLOSE.xs) slab(x0, x1, A2_NORTH_CLOSE.z0, A2_NORTH_CLOSE.z1, 0, A2_NORTH_CLOSE.h, CLOSURE_C);
  });

  // ---- station 3: the stores bay wall, the roller door, the cabin's back door locked for good ----
  tally(b, p.register, 'A2-32', "Stores bay wall x 33 (0.3 m, noLedge, to the roof) from the cabin's north-east corner to the north wall; the 3.0 m roller door A2-shutter (z 11.0-14.0) under a header at its lift height, on the hold gate g-a2-shutter", () => {
    slab(CABIN_NE.x, wx0, CABIN_NE.z0, CABIN_NE.z1, 0, HALL_H, WALL_C);
    slab(wx0, wx1, A2_STORES_WALL.z0, A2_SHUTTER.z0, 0, HALL_H, WALL_C);
    slab(wx0, wx1, A2_SHUTTER.z1, A2_STORES_WALL.z1, 0, HALL_H, WALL_C);
    slab(wx0, wx1, A2_SHUTTER.z0, A2_SHUTTER.z1, A2_SHUTTER.lift, HALL_H, WALL_C);
    // hinge on the north jamb, the leaf along -z (yaw PI); it swings into the stores bay's north half, clear of the hold point
    p.doors[A2_SHUTTER_DOOR] = b.door(A2_STORES_WALL.x, 0, A2_SHUTTER.z1, A2_SHUTTER.z1 - A2_SHUTTER.z0, Math.PI, { height: A2_SHUTTER.lift, breachable: false }).id;
  });
  p.devices[A2_SHUTTER_HOLD] = { x: A2_SHUTTER_HOLD_AT.x, y: 0, z: A2_SHUTTER_HOLD_AT.z, yaw: -Math.PI / 2, label: 'Hold the roller door up' };
  p.bay.gates.push({ kind: 'hold', id: A2_SHUTTER_GATE, holdId: A2_SHUTTER_HOLD, doorId: A2_SHUTTER_DOOR } satisfies HoldGate);
  // the latch after the hold gate: the mode builds the hold point's braced item first and the latch shares it (never a press)
  p.bay.gates.push({ kind: 'egress', id: A2_SHUTTER_OPEN_GATE, switchId: A2_SHUTTER_HOLD, doorIds: [A2_SHUTTER_DOOR] } satisfies EgressGate);
  // the back door: off the course's doors (the course unlocks a course door no gate names), locked and not breachable for good
  const backId = p.doors[A2_BACK_DOOR];
  const back = backId === undefined ? undefined : b.anchors.doors.find((d) => d.id === backId);
  if (back) {
    back.locked = true;
    back.breachable = false;
  }
  delete p.doors[A2_BACK_DOOR];

  // ---- station 4: cabinet 2 on the pit's near side ----
  tally(b, p.register, 'A2-33', "Cabinet 2 on the pit's near side: a 1.6 m body (noLedge) on the road 2 east van's north face x 63.05-63.95, z 11.3-11.6, front on +z, pressed from the lane gap 2/3", () => {
    slab(A2_CAB2_REPLAN.x - 0.45, A2_CAB2_REPLAN.x + 0.45, 11.3, A2_CAB2_REPLAN.z, 0, 1.6, STEEL);
  });
  p.devices[A2_ISO_2] = { x: A2_CAB2_REPLAN.x, y: 0, z: A2_CAB2_REPLAN.z, yaw: 0, label: 'Isolate neck lights' };
  // its push station (the built one hung on the east wall; a prop with no collision: nothing to write)
  const props = new FacilityProps();
  props.add('pushStation', A2_CAB2_REPLAN.x, A2_CAB2_REPLAN.z, 0, { y: 0.6 });
  p.props.push(...props.placements);

  // ---- station 5: the pit, its step irons, the far barrier, the walkway stand-in ----
  const { x0: px0, x1: px1, z0: pz0, z1: pz1, depth } = A2_PIT;
  const yb = -depth;
  tally(b, p.register, 'A2-34', 'Wheel-drop pit x 66.0-69.0 wall to wall (z 0.25-19.75), 1.6 m deep: 0.2 m liners on all four sides under the slab and its floor (all noLedge); step irons on the near face only', () => {
    slab(px0 - LINER, px0, pz0, pz1, yb, 0, PIT_C);
    slab(px1, px1 + LINER, pz0, pz1, yb, 0, PIT_C);
    slab(px0 - LINER, px1 + LINER, pz0 - LINER, pz0, yb, 0, PIT_C);
    slab(px0 - LINER, px1 + LINER, pz1, pz1 + LINER, yb, 0, PIT_C);
    slab(px0 - LINER, px1 + LINER, pz0 - LINER, pz1 + LINER, yb - PIT_FLOOR_T, yb, PIT_C);
    for (const z of A2_STEP_IRONS_Z) b.ladder(A2_STEP_IRONS_X, z, yb, 0, -Math.PI / 2, STEEL, 0.5);
  });
  const w = A2_WALKWAY;
  tally(b, p.register, 'A2-35', "Far edge site barrier (1.1 m, noLedge, on the far landing x 69.0-69.04) wall to wall but for the walkway's landing and the board slot's raised panel (A2-40): no mantle out of the pit and no running hop over it onto the far side", () => {
    slab(A2_PIT_BARRIER.x0, A2_PIT_BARRIER.x1, pz0, w.z0 - w.board, 0, A2_PIT_BARRIER.h, BARRIER_C);
    slab(A2_PIT_BARRIER.x0, A2_PIT_BARRIER.x1, A2_BOARD_SLOT.z1, pz1, 0, A2_PIT_BARRIER.h, BARRIER_C);
  });
  const bs = A2_BOARD_SLOT;
  tally(b, p.register, 'A2-40', "(marlow-kit-geo Q1) The barrier's board slot opposite the lane strip (z 12.7-13.7): its panel on raised feet, 0.25-1.1 m over the landing (noLedge), face out over the pit at x 68.85, back on the barrier's line (x 69.04): a laid board slides under it and bears on the far landing; the crosser climbs it off the board's end; a player alone can neither hop nor mantle past it", () => {
    slab(bs.x0, bs.x1, bs.z0, bs.z1, bs.y0, bs.h, BARRIER_C);
  });
  tally(b, p.register, 'A2-36', 'Plank stand-in: a hoarded maintenance walkway over the pit (deck x 66-69, z 11.4-12.6, top flush at y 0; hoarding boards 2.2 m from the pit floor on both sides, all noLedge, so the space under the deck is shut), its door A2-walkway at the near end on the flag gate g-a2-walkway', () => {
    slab(px0, px1, w.z0, w.z1, -w.deck, 0, HOARD_C);
    slab(px0, px1, w.z0 - w.board, w.z0, yb, w.h, HOARD_C);
    slab(px0, px1, w.z1, w.z1 + w.board, yb, w.h, HOARD_C);
    p.doors[A2_WALKWAY_DOOR] = b.door(px0, 0, w.z0, w.z1 - w.z0, 0, { height: 2.1, breachable: false }).id;
  });
  p.bay.gates.push({ kind: 'flag', id: A2_WALKWAY_GATE, flag: A2_WALKWAY_FLAG, doorId: A2_WALKWAY_DOOR } satisfies FlagGate);
  // (marlow-kit-wire) the Plank Bridge spot: the board stack's middle, the boards along x (inert while `plankBridge` is off)
  const stack = A2_BOARD_STACK;
  addKitSpot(b.anchors, { id: 'a2-plank', kind: 'plankBridge', x: (stack.x0 + stack.x1) / 2, y: 0, z: (stack.z0 + stack.z1) / 2, yaw: Math.PI / 2, w: stack.x1 - stack.x0 });

  // ---- dressing (visual skins): the ballast short of the pit, the scaffold boards, hazard bands ----
  tally(b, p.register, 'A2-37', 'Re-plan dressing (visual skins, no collision): the three ballast strips stopping at the pit, a stack of scaffold boards at the east end of the lane gap 2/3 against the road 3 van (KS5 lays them later), hazard bands on the walkway boards and the barrier', () => {
    for (const c of A2_ROADS) skin(28.25, px0, 0, 0.012, c - 1, c + 1, BALLAST);
    // eight 0.04 m boards, 3.9 m long, in two columns of 0.22 m, against the road 3 van's south face (z 13.7)
    for (let k = 0; k < 8; k++) {
      const col = k % 2;
      const y = Math.floor(k / 2) * 0.04;
      const z0 = A2_BOARD_STACK.z1 - 0.22 - col * 0.23;
      skin(A2_BOARD_STACK.x0, A2_BOARD_STACK.x1, y, y + 0.04, z0, z0 + 0.22, BOARD_C);
    }
    for (const z of [w.z0 - w.board - 0.01, w.z1 + w.board]) skin(px0, px1, 0.9, 1.0, z, z + 0.01, BARRIER_C);
    skin(A2_PIT_BARRIER.x0 - 0.01, A2_PIT_BARRIER.x0, A2_PIT_BARRIER.h - 0.1, A2_PIT_BARRIER.h, pz0, pz1, BLACK);
  });
  tally(b, p.register, 'A2-41', "(marlow-kit-geo Q1) Board slot dressing (visual skins, no collision): the hazard band on the panel's face and its two feet down to the landing", () => {
    skin(bs.x0 - 0.01, bs.x0, bs.h - 0.1, bs.h, bs.z0, bs.z1, BLACK);
    for (const z of [bs.z0 + 0.1, bs.z1 - 0.14]) skin(bs.x1 - 0.04, bs.x1, 0, bs.y0, z, z + 0.04, STEEL);
  });

  // ---- the lamp: the coat corner (Q2 every light works), circuit 22 with the cabin panel ----
  tally(b, p.register, 'A2-38', "Coat corner wall lamp over the hooks on the cabin circuit 22 (the re-plan table's second lamp): the cabin switch darkens both", () => {
    const l = A2_COAT_LAMP;
    b.light({ x: l.x, y: l.y, z: l.z, radius: l.radius, intensity: l.intensity, color: WHITE, group: 22, electric: true, destructible: true, fixture: { sx: 0.3, sy: 0.12, sz: 0.12, oy: 0.06 } });
  });

  // ---- the stores bay's strip (lead answer 4): circuit 20, the shed general, its seventh lamp ----
  tally(b, p.register, 'A2-39', "Stores bay strip on the shed general circuit 20 (the re-plan table's seventh lamp): under the tie over the bay the x 33 wall cuts off, so the bay reads 0.30 or more (transit, LR7)", () => {
    const l = A2_STORES_LAMP;
    b.light({ kind: 'spot', x: l.x, y: l.y, z: l.z, radius: l.radius, intensity: l.intensity, color: WHITE, cone: makeCone(0, -1, 0, 0.9), group: 20, electric: true, destructible: true, fixture: { sx: 1.6, sy: 0.12, sz: 0.2, oy: 0.06 } });
  });

  // ---- the staging switch comes down from the removed deck: on the north wall in the strip west of the closures ----
  const sw = p.switches.find((s) => s.id === 'a2-sw-staging');
  if (sw) sw.pos = { x: 40.0, y: 1.2, z: 19.7 };

  // ---- stations, done flags, the stand-in's flag ----
  p.bay.stations = A2_STATIONS;
  p.passZones.push(
    { id: 'a2-p-lane', box: A2_LANE_ZONE, flag: A2_LANE_FLAG, floorY: 0 },
    { id: 'a2-p-across', box: A2_ACROSS_ZONE, flag: A2_ACROSS_FLAG, floorY: 0 },
  );
  p.externalFlags.push(A2_LANE_FLAG, A2_ACROSS_FLAG, A2_WALKWAY_FLAG);

  // ---- objective lines (#441's rule: what and where), LANTERN's lines ----
  for (let i = p.objectives.length - 1; i >= 0; i--) if (BUILT_STEPS.includes(p.objectives[i]!.id)) p.objectives.splice(i, 1);
  p.objectives.push(
    {
      id: 'a2-shutter',
      bay: 'A2',
      text: 'Roller door off the stores bay: one holds it up, the other goes under.',
      // (marlow-play C6) holding only unlocks the roller door: someone still opens it, so the lines say who
      a: 'Hold the roller door up at the south jamb; your partner opens it and goes under. Follow.',
      b: 'Open the roller door, crouch under into the lane, then hold it up for your partner.',
      done: { flag: A2_LANE_FLAG },
    },
    {
      id: 'a2-lights',
      bay: 'A2',
      text: 'Cut the neck lights at a cabinet, then cross the dark neck from the lane.',
      a: 'Isolate at cabinet one in the cabin, then cross when cabinet two goes dark.',
      b: 'Cross the dark neck from the lane, then isolate at cabinet two by the pit.',
      done: { flag: 'a2-east' },
      timer: 'g-a2-neck',
    },
    {
      id: 'a2-plank',
      bay: 'A2',
      text: kitMoveOn('plankBridge') ? A2_PLANK_KIT_TEXT : 'Cross the pit by the east vans on the hoarded walkway to the L2 door.',
      done: { flag: A2_ACROSS_FLAG },
    },
    { id: 'a2-lock', bay: 'A2', text: 'Both of you into holding room two.' },
  );
  p.bay.radio = p.bay.radio.filter((r) => r.text !== A2_BUILT_STAGING_LINE && !A2_BUILT_NECK_LINES.includes(r.text));
  p.bay.radio.push(...A2_RETRY_LINES);

  // ---- map data: debug points, nav seeds, spaces, light spots, shots ----
  p.debugPoints = p.debugPoints.filter((d) => !DROP_DEBUG.includes(d.id));
  p.debugPoints.push(
    { id: 'A2-east', label: 'Set 2 east end (lane gap 2/3, cabinet 2, the pit)', pos: { x: 64.5, y: 0, z: 12.6 }, yaw: Math.PI / 2 },
    { id: 'A2-across', label: "Set 2 pit's far landing (L2 door)", pos: { x: 69.4, y: 0, z: 10.0 }, yaw: Math.PI / 2 },
  );
  p.navSeeds = p.navSeeds.filter((s) => s.y < 1 && !(s.x > px0 && s.x < px1));
  p.navSeeds.push({ x: 69.4, y: 0, z: 10.0 }, { x: 67.5, y: yb, z: 5.0 });
  p.camSpaces = p.camSpaces.filter((c) => !(c.box[1] === 17.5 && c.box[3] === 20));
  p.camSpaces.push({ box: [28, 5, 33, 20], size: 'tight' });
  p.lightSpots = p.lightSpots.filter((s) => !DROP_SPOTS.includes(s.name));
  p.lightSpots.push(
    { name: 'A2 cabinet 2', kind: 'body', x: A2_CAB2_REPLAN.x, y: 0, z: 12.2, band: 'read' },
    { name: 'A2 coat corner lamp', kind: 'body', x: 28.95, y: 0, z: 4.25, band: 'read' },
    { name: 'A2 coat corner cut', kind: 'body', x: 28.95, y: 0, z: 4.25, band: 'cut', off: [22] },
    { name: 'A2 stores bay', kind: 'body', x: 31.0, y: 0, z: 12.0, band: 'any' },
    { name: 'A2 walkway', kind: 'body', x: 67.5, y: 0, z: 12.0, band: 'any' },
    { name: 'A2 far landing', kind: 'body', x: 69.4, y: 0, z: 12.4, band: 'any' },
    { name: 'A2 pit floor', kind: 'body', x: 67.5, y: yb, z: 5.0, band: 'any' },
  );
  p.shotVantages = p.shotVantages.filter((v) => !DROP_SHOTS.includes(v.name));
  p.shotVantages.push({ name: 'a2-pit', feet: [64.5, 0, 12.6], cam: [62.6, 1.7, 13.2], target: [68.5, 0.4, 10.5] });
}
