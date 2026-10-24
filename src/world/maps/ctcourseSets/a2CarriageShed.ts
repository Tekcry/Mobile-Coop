/**
 * A2 the Carriage Shed (SPEC section 9 "A2 - Set 2, the Carriage Shed"; set doc `docs/marlow-final/sets/a2CarriageShed.md`;
 * PLAN slice 2, steps 2-4: greybox, lights, guard / objective steps / e2e). A night freight siding: three roads, two short
 * rakes of box vans, the shunting neck between them under four high-bays, the shunter's cabin and the carriage-cleaning
 * staging. It teaches timed light isolation (N2) and the lure that comes with it; the staging is the co-op leg-up.
 *
 * Ground, set box x 28-70, z 0-20, open to the 10 m hall roof (the walls on the box edges are `facility.ts`'s):
 * - roads 1, 2, 3 at z 5 / 10 / 15 with 2 m ballast strips (`gravel`, loud) and two rakes of one 10 m van per road (x 36-46 and
 *   56-66, 2.6 x 3.4 m, all `noLedge`, 2.4 m gaps: no split gap), 0.3 m wheel stops at the road ends (five: road 2's east end stays
 *   clear for the L2 door);
 * - the neck x 46-56: 10 m open crossing under four high-bays on the isolator circuit 21; two lanes lead into it (gap 1/2 z 6.3-8.7, the
 *   shunter's beat, and gap 2/3 z 11.3-13.7, the taught crossing): four `noLedge` closures at the rakes' neck ends (x 45.5-46.0 and
 *   56.0-56.5) shut the south cess (2.5 m) and the north walkway (to the deck's 4.4 m) (walk482 X2b);
 * - the shunter's cabin x 28-32, z 1-5 (every piece `noLedge`): a thick plant wall on the south side back to the shell (no
 *   gap behind it), the isolator cabinet 1 against it, the north door and the back door, a desk, the coat corner (dark pocket);
 * - the cleaning staging x 30-62, z 17.5-20 (`coopDeck`: a 4.4 m deck, the open loading edge x 31-35 is the co-op lip, 1.2 m
 *   screens on the rest of the edge, the east stair down at x 62-69.7), and the isolator cabinet 2 on the east wall.
 * Two overwatch guards stand on the deck over the neck (`a2-watch-w` / `a2-watch-e`, x 48 / 54, z 17.9, behind the 1.2 m screens, facing south,
 * a high-security post with a leash of 0), and being spotted fails the set (`BayDef.spotFail`, set in `ctcourse.ts`).
 * Every other block 1.9 m or taller is `noLedge`: the only way onto the staging from the shed floor is a leg-up or a relay.
 * Nothing here stands within 4.7 m of the loading edge that a player alone could climb. Prototype starting values (G10).
 *
 * Lights (LIGHTING-PLAN 3, A2): shed general 20 (six strips over the rakes, short of the neck), neck 21 (four high-bays on
 * two isolators: 15 s dark, 3 s re-arm, N2), cabin 22 (one panel; the coat corner stays dark), staging 23 (four strips).
 *
 * Dressing (slice 2 step 5, SPEC 6, M5: a freight siding mock-up inside the luxury hall, so it keeps its own materials - ballast and
 * rail, oxide-painted vans, shed sheeting, chequer plate, a railway-green hut - and only the hall above the set takes the kit's
 * charcoal panels):
 * - the greybox's boxes, lamps, doors and anchors are untouched; the dressing is appended after them (the stair fix first);
 * - everything built by hand is a thin visual skin (no collision, `noLedge`, one side under `CANON_MIN_THICK` so it is out of the
 *   canonical light shapes: the bake, the meter and the guards see the greybox as built): van detail, wheel-stop buffer faces, the
 *   cabin's cladding and fittings, the cabinets' faces, the staging's plate, face, screens, drop chain and closed-stair scar, the
 *   stair's handrails (visual; the open side also has a collision rail, below) and the same drawn rail on the deck's east end (P4-2), the shed walls' sheeting and frames, the roof ties, floor paint;
 * - the only new collision is invisible and `noLedge`: fifteen fillers under the east stair's flight (S2-check should-fix 2: nothing
 *   can stand inside the steps), the open side's collision rail (kit.handrail, invisible noLedge, twelve stepped 0.55 m segments from
 *   x 68.6 to the head, P3-2: no step-off the flight; the bottom treads stay open from the side), one more 1.1 m kit.handrail on the
 *   deck's east end beside the head (x 61.95, z 17.6 to the rail's line: no walk-off the staging there; the stair mouth stays open) and the props kit's own box
 *   (`FacilityProps.write`: the permit gate that closes the pocket where the removed west stair stood). The two push stations, twelve track panels (flush rails) and the gate are the set's props;
 * - kit panels with accent coves, every one on its circuit's group: the shed's south, west and east walls above 4.4 m (the shed
 *   general circuit, 20) and the north wall over the gallery glazing (the staging, 23). No lamp is added.
 */
import { hyp2 } from '../../../core/mathx';
import type { CourseDevice, IsolatorGate } from '../../../game/course/courseDef';
import { KIT_BOX_COLOR, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { makeCone } from '../../lights';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { circuitOf, marlowCourseGroups } from '../../lighting/marlowCircuits';
import { FacilityProps } from '../../props/facilityProps';
import type { SquadSlot } from '../../rooms';
import { applyGreybox, coopDeck } from '../ctcourseGreybox';
import { GAL_TOP, wallRuns } from './facility';
import { emptyPart, HALL_H, tally, type SetPart } from './types';

/** The shunter's squad slot id and his patrol loop (set doc section 2). */
export const A2_SHUNTER = 'a2-shunter';
/** A walker pauses at a route point for its `waits` entry; a wait of 0 never advances (`PatrolWalker.step`), so the two
 *  pass-through points pause this long (s). */
export const A2_PASS_WAIT = 0.1;
export const A2_SHUNTER_ROUTE: [number, number][] = [[51, 10], [56, 7.5], [66, 7.5], [56, 7.5]];
export const A2_SHUNTER_WAITS = [4, A2_PASS_WAIT, 3, A2_PASS_WAIT];
/** At his post he looks west down road 2; at the east end he faces the east wall, his back to the neck (NaN: keep facing). */
export const A2_SHUNTER_FACES = [-Math.PI / 2, Number.NaN, Math.PI / 2, Number.NaN];

/** The two overwatch guards on the staging deck (walk482 X2b): their squad slot ids and posts (x, z; y is the deck's lip), both facing south over the neck. */
export const A2_WATCH_W = 'a2-watch-w';
export const A2_WATCH_E = 'a2-watch-e';
export const A2_WATCH_AT = { w: { x: 48.0, z: 17.9 }, e: { x: 54.0, z: 17.9 } } as const;
/** The four neck closures (walk482 X2b): x spans at the rakes' neck ends, the south cess's and the north walkway's z spans and heights (the walkway's reaches the deck's 4.4 m). */
export const A2_CLOSE_X: readonly (readonly [number, number])[] = [[45.5, 46.0], [56.0, 56.5]];
export const A2_CLOSE_S = { z0: 0.25, z1: 3.7, h: 2.5 } as const;
export const A2_CLOSE_N = { z0: 16.3, z1: 17.5, h: 4.4 } as const;
/** The taught crossing's line (z): gap 2/3, the only lane into the neck that is not the shunter's beat. */
export const A2_CROSS_Z = 12.5;

/** The isolator gate (N2), its two cabinets (course devices), the circuit's groups key and the cabin's two course doors. */
export const A2_GATE = 'g-a2-neck';
export const A2_ISO_1 = 'a2-iso-1';
export const A2_ISO_2 = 'a2-iso-2';
export const A2_NECK_GROUP = 'a2-neck';
export const A2_CABIN_DOOR = 'A2-cabin';
export const A2_BACK_DOOR = 'A2-back';
/** Cabinet 1 stands on the cabin's plant wall facing +z; cabinet 2 on the east wall facing -x (the plan's hints, B2 moved 0.8 m off the road 3 wheel stop). */
export const A2_CAB1 = { x: 30.6, z: 1.6 } as const;
export const A2_CAB2 = { x: 69.4, z: 13.4 } as const;

/** The two pass-zone flags: one player east of x 56 (the first across), both east of x 56. The box is the east rake and apron. */
export const A2_EAST1_FLAG = 'a2-east1';
export const A2_EAST_FLAG = 'a2-east';
export const A2_EAST_ZONE: [number, number, number, number] = [56, 0.3, 70, 19.7];

/** The roads' centre lines (z), the rakes' van spans (x), the van's half width and height. */
export const A2_ROADS = [5, 10, 15] as const;
export const A2_RAKES = [[36, 46], [56, 66]] as const;
const VAN = { half: 1.3, h: 3.4 } as const;
/** The staging deck (`coopDeck` at the loading edge's centre), the open loading edge along x and the leg-up mark's spot. */
export const A2_DECK = { x: 46, z: 17.5, span: 32, depth: 2.5, lip: 4.4, open: [-15, -11] as [number, number] } as const;
export const A2_LIP_X: [number, number] = [31, 35];
export const A2_MARK = { x: 33, z: 17.0 } as const;
/** The cabin: its plan box (the doc's centre lines), wall thickness, heights and the coat corner pocket. */
export const A2_CABIN = { x0: 28, z0: 1, x1: 32, z1: 5, t: 0.2, wallH: 2.5, roofT: 0.1 } as const;
/** The south plant wall's inner face (the cabinet stands on it) and the shell's faces (`facility.ts`, 0.5 m walls). */
const PLANT_FACE = 1.1;
const SHELL = { west: 28.25, east: 69.75, south: 0.25, north: 19.75 } as const;
/** The cabin's north door (x 30.4-31.6) and back door (east wall z 2.0-3.2), 1.2 x 2.1. */
const DOOR_N = { x0: 30.4, x1: 31.6, h: 2.1 } as const;
const DOOR_E = { z0: 2.0, z1: 3.2, h: 2.1 } as const;

const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
const VAN_WEST = '#74807c';
const VAN_EAST = '#85796a';
const STEEL = '#5c6268';
const BALLAST = '#4a4640';
const CLOSURE = '#4d555b';

// ---- dressing (slice 2 step 5) ----
/** The circuits the kit's accent coves follow: the shed general run (20) for the walls round the shed, the staging (23) for the wall over its glazing. */
const G_SHED = 20;
const G_STAGING = 23;
/** A dressing skin's thickness (m) and the thinnest side a skin may have: under `CANON_MIN_THICK` (0.05, `voxel/lightShapes.ts`) the
 *  canonical light shapes leave it out, so dressing never moves the bake, the meter or what a guard sees. */
const SKIN = 0.03;
const THIN = 0.05;
/** The east stair's collider is `LevelBuilder.ramp`'s 0.3 m slab (its top is the nosing line). The fillers under the flight are `step` wide and
 *  stand to `gap` under that line at their low end, so their tops are inside the slab (0.35 m thick): no air under it, and no top above what a body walks on. */
export const STAIR_FILL = { step: 0.5, gap: 0.05 } as const;
/** The east stair's open-side rail (P3-2; A6's `A6_STAIR_RAIL` and A4's `A4_STAIR_RAIL` idiom): `kit.handrail` in stepped segments of `seg` m along x at
 *  z `z` (0.05 m outside the flight's open south edge z 18.8, so it never narrows the 1.2 m flight), from x `from` (0.63 m up the walking line: the foot
 *  sits 0.05 m off the east wall, so the only way onto the flight is from the side across the bottom treads, which stay open; at the third tread the gap
 *  to the wall would be one body width) to the head (x `to`, the deck's east end); each segment's collision box starts at the walking line at its low
 *  (east) end and stands `h` m over the line at its high end. Twelve segments. */
export const A2_STAIR_RAIL = { z: 18.75, seg: 0.55, h: 1.1, from: 68.6, to: 62 } as const;
/** The wheel stops' x spans and the train-facing face of each (the rails end against it); `side` is the shed end (w: x 33, e: x 69). */
const STOPS = [
  { side: 'w', at: 33.4, x0: 32.6, x1: 33.4 },
  { side: 'e', at: 68.6, x0: 68.6, x1: 69.4 },
] as const;
/** Road 2's east wheel stop stood in the L2 door's approach (door x 70, z 9.1-10.9): it is not built (walk482 X3), the other five are. */
const NO_STOP = (side: string, c: number): boolean => side === 'e' && c === A2_ROADS[1];
/** The track panels (10 m modules, x centres) on each road: rails from x 29.5 to 69.5, flush with the floor. */
export const A2_TRACK_X = [34.5, 44.5, 54.5, 64.5] as const;
/** The permit gate that closes the pocket x 28.25-30 where the west stair stood (A2-D3): 1.0 m across, a body (0.6 m) fits neither side. */
export const A2_GATE_AT = { x: 29.15, z: 17.6 } as const;
/** The staging switch's post (x centre) on the gallery wall's face, and the cabin switch's wall box. */
const SWITCH_POST_X = 61.7;
/** Own materials (oxide-painted vans, shed sheeting, rail and ballast, a railway-green hut, chequer plate). */
const LOOK = {
  under: '#202224',
  sole: '#34373a',
  wheel: '#16171a',
  hub: '#53575a',
  roof: '#33383b',
  stanch: '#2b2e30',
  buffer: '#4d5154',
  white: '#e5e5de',
  black: '#1d1f20',
  red: '#b5282d',
  yellow: '#c9a227',
  concrete: '#46453f',
  sheet: '#56626a',
  sheetRail: '#46515a',
  frame: '#3b4147',
  steel: '#6a7077',
  steelDark: '#3a3f44',
  pipe: '#7d8286',
  green: '#3f5a49',
  cream: '#cdc6b3',
  trim: '#d9d8cf',
  felt: '#2b2e30',
  wood: '#6b5a43',
  cork: '#a8763e',
  lino: '#4f433b',
  mat: '#34383b',
  plate: '#585d61',
  seam: '#2f3336',
  stain: '#222527',
  coatA: '#2a3345',
  coatB: '#4a4a35',
  vest: '#c9651c',
  scar: '#2d3032',
  tie: '#2a2d30',
} as const;
/** Each rake's own paint: the planking lines, the sliding door's panel and its tone. */
const VAN_LOOK = [
  { plank: '#656f6b', door: '#808e89' },
  { plank: '#74685a', door: '#908372' },
] as const;
/** The 7-segment strokes of the road numbers 1-3 stencilled on the vans' neck ends. */
const DIGITS = { 1: 'bc', 2: 'abged', 3: 'abgcd' } as const;

export function buildA2CarriageShed(b: LevelBuilder, kit: FacilityKit): SetPart {
  const p = emptyPart('a2CarriageShed');
  /** A box from x0 to x1, z0 to z1, y0 to y1; `noLedge` unless told otherwise. */
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string, opts: { overhead?: boolean; noLedge?: boolean } = {}): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
    b.mark(from, { noLedge: opts.noLedge ?? true, ...(opts.overhead ? { overhead: true } : {}) });
  };

  // ---- A2-1 / A2-2 / A2-10: the roads, the vans, the wheel stops ----
  tally(b, p.register, 'A2-1', 'Box vans 10 x 2.6 x 3.4: one per road per rake, west x 36-46 and east x 56-66 (noLedge, 2.4 m gaps, no split gap; A2-D1)', () => {
    for (const [i, [x0, x1]] of A2_RAKES.entries()) for (const c of A2_ROADS) slab(x0, x1, c - VAN.half, c + VAN.half, 0, VAN.h, i === 0 ? VAN_WEST : VAN_EAST);
  });
  tally(b, p.register, 'A2-2', 'Rails and ballast: three roads with a 2 m gravel strip each (loud x1.3), drawn flat (no collision)', () => {
    for (const c of A2_ROADS) {
      b.surface('gravel', SHELL.west, SHELL.east, c - 1, c + 1, 0);
      b.box((SHELL.west + SHELL.east) / 2, 0.006, c, SHELL.east - SHELL.west, 0.012, 2, BALLAST, 0, 0, false);
    }
  });
  tally(b, p.register, 'A2-10', 'Wheel stops 0.3 m at the road ends (x 32.6-33.4 and 68.6-69.4, 1.6 m wide), five: none at road 2\'s east end, which would stand in the L2 door\'s approach (walk482 X3): low, so no solo jump top (A2-D2)', () => {
    for (const c of A2_ROADS) {
      for (const [side, x0, x1] of [['w', 32.6, 33.4], ['e', 68.6, 69.4]] as const) if (!NO_STOP(side, c)) slab(x0, x1, c - 0.8, c + 0.8, 0, 0.3, STEEL);
    }
  });
  p.register.push({ id: 'A2-11', element: 'North walkway z 16.3-17.5 behind road 3\'s vans and along the staging face, west of x 45.5 and east of x 56.5 (open floor, no pieces; the neck ends are closed, A2-21)' });
  // ---- A2-21: the neck closures (walk482 X2b): four noLedge boards at the rakes' neck ends, so the neck has two lanes (gap 1/2, gap 2/3) ----
  tally(b, p.register, 'A2-21', 'Neck closures (walk482 X2b): four noLedge boards 0.5 m thick at the rakes\' neck ends (x 45.5-46.0 and 56.0-56.5): the south cess z 0.25-3.7 2.5 m tall and the north walkway z 16.3-17.5 up to the deck\'s 4.4 m; the neck keeps two lanes, gap 1/2 and gap 2/3', () => {
    for (const [x0, x1] of A2_CLOSE_X) {
      slab(x0, x1, A2_CLOSE_S.z0, A2_CLOSE_S.z1, 0, A2_CLOSE_S.h, CLOSURE);
      slab(x0, x1, A2_CLOSE_N.z0, A2_CLOSE_N.z1, 0, A2_CLOSE_N.h, CLOSURE);
    }
  });

  // ---- A2-5: the shunter's cabin: plant wall, walls, roof, two doors, desk ----
  const { x1: cx1, z1: cz1, t, wallH, roofT } = A2_CABIN;
  const h = t / 2;
  tally(b, p.register, 'A2-5', "Shunter's cabin 4 x 4: a 0.85 m plant wall on the south side back to the shell, 0.2 m walls, north door x 30.4-31.6, back door on the east wall, flat roof 2.6, desk; every piece noLedge", () => {
    slab(SHELL.west, cx1 + h, SHELL.south, PLANT_FACE, 0, wallH, KIT_BOX_COLOR);
    // north wall z 5 with the door gap and its lintel
    slab(SHELL.west, DOOR_N.x0, cz1 - h, cz1 + h, 0, wallH, KIT_BOX_COLOR);
    slab(DOOR_N.x1, cx1 + h, cz1 - h, cz1 + h, 0, wallH, KIT_BOX_COLOR);
    slab(DOOR_N.x0, DOOR_N.x1, cz1 - h, cz1 + h, DOOR_N.h, wallH, KIT_BOX_COLOR);
    // east wall x 32 with the back door's gap and lintel
    slab(cx1 - h, cx1 + h, PLANT_FACE, DOOR_E.z0, 0, wallH, KIT_BOX_COLOR);
    slab(cx1 - h, cx1 + h, DOOR_E.z1, cz1 - h, 0, wallH, KIT_BOX_COLOR);
    slab(cx1 - h, cx1 + h, DOOR_E.z0, DOOR_E.z1, DOOR_E.h, wallH, KIT_BOX_COLOR);
    // the flat roof (top 2.6) and the desk against the west wall, clear of the coat corner (z 3.6-4.9)
    slab(SHELL.west, cx1 + h, SHELL.south, cz1 + h, wallH, wallH + roofT, KIT_BOX_COLOR, { overhead: true });
    slab(SHELL.west, 28.95, 1.5, 3.1, 0, 0.75, '#3a3226');
    // the north door: hinge on the west jamb, the leaf along +x; the back door: hinge at z 2.0, the leaf along +z
    p.doors[A2_CABIN_DOOR] = b.door(DOOR_N.x0, 0, cz1, DOOR_N.x1 - DOOR_N.x0, Math.PI / 2, { height: DOOR_N.h }).id;
    p.doors[A2_BACK_DOOR] = b.door(cx1, 0, DOOR_E.z0, DOOR_E.z1 - DOOR_E.z0, 0, { height: DOOR_E.h }).id;
  });

  // ---- A2-4: the two isolator cabinets (bodies; the push stations are course devices) ----
  tally(b, p.register, 'A2-4', 'Isolator cabinets 1 (on the cabin plant wall, faces +z) and 2 (on the east wall, faces -x): 1.6 m bodies (noLedge) and the two course push stations', () => {
    slab(30.15, 31.05, PLANT_FACE, 1.55, 0, 1.6, STEEL);
    slab(69.45, SHELL.east, A2_CAB2.z - 0.45, A2_CAB2.z + 0.45, 0, 1.6, STEEL);
  });
  const timed = circuitOf(21)!.timed!;
  const device = (x: number, z: number, yaw: number, label: string): CourseDevice => ({ x, y: 0, z, yaw, label });
  p.devices[A2_ISO_1] = device(A2_CAB1.x, A2_CAB1.z, 0, 'Isolate neck lights');
  p.devices[A2_ISO_2] = device(A2_CAB2.x, A2_CAB2.z, -Math.PI / 2, 'Isolate neck lights');
  p.bay.gates.push({ kind: 'isolator', id: A2_GATE, switchIds: [A2_ISO_1, A2_ISO_2], group: A2_NECK_GROUP, seconds: timed.seconds, rearm: timed.rearm } satisfies IsolatorGate);

  // ---- A2-6 / A2-7 / A2-8: the cleaning staging (co-op lip), its screens and the east stair ----
  const deck = coopDeck({ id: 'a2-stage', at: { x: A2_DECK.x, z: A2_DECK.z }, facing: '+z', span: A2_DECK.span, depth: A2_DECK.depth, lip: A2_DECK.lip, open: A2_DECK.open, screen: 1.2, stair: 'end', stairW: 1.2 });
  tally(b, p.register, 'A2-6', 'Cleaning staging: a 4.4 m solid deck x 30-62 (noLedge), the open loading edge x 31-35 as its one co-op lip (leg-up mark at 33, 17.0), chequer plate (metal, loud x1.6)', () => {
    applyGreybox(b, { ...deck, boxes: deck.boxes.filter((x) => x.tag === 'deck' || x.tag.startsWith('mark')), stairs: [], doors: [] });
    b.surface('metal', 30, 62, A2_DECK.z, 20, A2_DECK.lip);
  });
  tally(b, p.register, 'A2-7', 'Staging screens 1.2 m, solid, on the rest of the front edge (x 30-31 and 35-62; noLedge)', () => {
    applyGreybox(b, { ...deck, boxes: deck.boxes.filter((x) => x.tag === 'edge screen'), stairs: [], ledges: [], doors: [] });
  });
  tally(b, p.register, 'A2-8', 'East stair down from the staging, 27 risers of 0.163 m, x 62-69.7 along the back wall (the west stair is removed for repair: A2-D3)', () => {
    applyGreybox(b, { ...deck, boxes: [], ledges: [], doors: [] });
  });
  p.lips.push(...deck.lips);

  // ---- A2-3 / A2-9: the lights (LIGHTING-PLAN 3, A2; the circuits are `MARLOW_CIRCUITS` 20-23) ----
  const strip = (x: number, y: number, z: number, group: number, radius: number, intensity: number): void => {
    b.light({ x, y, z, radius, intensity, color: WHITE, group, electric: true, destructible: true, fixture: { sx: 1.6, sy: 0.12, sz: 0.2, oy: 0.06 } });
  };
  tally(b, p.register, 'A2-3', 'Neck high-bays, group 21 (two isolators, 15 s dark, 3 s re-arm): four on the roof tie over the neck', () => {
    for (const [x, z] of [[48.5, 6], [53.5, 6], [48.5, 14], [53.5, 14]] as const) {
      b.light({ x, y: 6.8, z, radius: 11, intensity: 1.1, color: WHITE, group: 21, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.3, sz: 0.6, oy: 0.15 } });
    }
  });
  tally(b, p.register, 'A2-9', 'Shed general 20 (six strips under the tie, short of the neck, switch by the west door), cabin panel 22 (switch by the cabin door), staging strips 23 (switch at the stair head)', () => {
    // group 20 on a high-bay optic (LR16-M): the strips light the rakes under them, the neck cut points sit outside the cone
    for (const [x, z, i] of [[34, 11, 0.8], [41, 7.5, 0.8], [41, 12.5, 0.8], [61, 7.5, 0.8], [61, 12.5, 0.8], [68, 11, 0.95]] as const) {
      b.light({ kind: 'spot', x, y: 6.5, z, radius: 7.5, intensity: i, color: WHITE, cone: makeCone(0, -1, 0, 0.9), group: 20, electric: true, destructible: true, fixture: { sx: 1.6, sy: 0.12, sz: 0.2, oy: 0.06 } });
    }
    b.light({ x: 30.6, y: 2.45, z: 2.5, radius: 3.2, intensity: 0.075, color: WHITE, group: 22, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.05, sz: 0.6, oy: 0.025 } });
    for (const x of [36, 44, 52, 60]) strip(x, 7, 19, 23, 5, 0.27);
  });
  for (const [k, g] of Object.entries(marlowCourseGroups())) if (k.startsWith('a2-')) p.groups[k] = g;
  // wall switches: the shed's on the L1 wall by the west door, the cabin's inside by its door, the staging's on the stair head's wall
  p.switches.push({ id: 'a2-sw-shed', group: 20, pos: { x: 28.3, y: 1.2, z: 6.6 }, yaw: Math.PI / 2 });
  p.switches.push({ id: 'a2-sw-cabin', group: 22, pos: { x: 31.75, y: 1.2, z: cz1 - h - 0.05 }, yaw: Math.PI });
  p.switches.push({ id: 'a2-sw-staging', group: 23, pos: { x: 61.7, y: A2_DECK.lip + 1.2, z: SHELL.north - 0.05 }, yaw: Math.PI });
  // the set at its standby fill; the staging's upper level (SPEC 7)
  p.ambientZones.push({ id: 'A2', box: [28, 0, 70, 20], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 6.9 });
  p.ambientZones.push({ id: 'a2-staging', box: [30, 17.5, 62, 20], ambient: MARLOW_LEVEL.standby, minY: 3.9, maxY: 6.9 });

  // ---- the shunter, the steps, the claim, the pass zones, the radio ----
  p.squads[A2_SHUNTER] = { kind: 'grunt', x: 51, z: 10, yaw: -Math.PI / 2, route: A2_SHUNTER_ROUTE, waits: A2_SHUNTER_WAITS, faces: A2_SHUNTER_FACES };
  // the two overwatch guards on the staging deck (walk482 X2b): armed grunts facing south over the neck, a high-security post with a leash of 0 (they
  // turn on the spot and never leave the deck; a cut neck only lures them to look); the shunter stays first in the squad (the e2e helpers read the first live guard)
  const watch = (at: { x: number; z: number }): SquadSlot => ({ kind: 'grunt', x: at.x, y: A2_DECK.lip, z: at.z, yaw: Math.PI, post: { leash: 0, highSecurity: true, guards: A2_NECK_GROUP } });
  p.squads[A2_WATCH_W] = watch(A2_WATCH_AT.w);
  p.squads[A2_WATCH_E] = watch(A2_WATCH_AT.e);
  p.bay.squad.push(A2_SHUNTER, A2_WATCH_W, A2_WATCH_E);
  // the first player to press cabinet 1 takes A; until then the lead (P2 in this even set) reads the A lines
  p.bay.roles = [{ role: 'a', press: [A2_ISO_1] }];
  p.passZones.push({ id: 'a2-p-east1', box: A2_EAST_ZONE, flag: A2_EAST1_FLAG, floorY: 0, any: true });
  p.passZones.push({ id: 'a2-p-east', box: A2_EAST_ZONE, flag: A2_EAST_FLAG, floorY: 0 });
  p.externalFlags.push(A2_EAST1_FLAG, A2_EAST_FLAG);
  p.objectives.push(
    {
      id: 'a2-neck',
      bay: 'A2',
      text: 'Cut the neck lights and cross while the shunter checks.',
      a: 'Isolate the neck lights at cabinet one, then hide in the cabin corner.',
      b: 'Wait at the van ends, then cross the dark neck to cabinet two.',
      done: { flag: A2_EAST1_FLAG },
      timer: A2_GATE,
    },
    {
      id: 'a2-back',
      bay: 'A2',
      text: 'Now the other way round.',
      a: 'Cross behind the shunter while your partner isolates.',
      b: 'Isolate at cabinet two so your partner can cross.',
      done: { flag: A2_EAST_FLAG },
      timer: A2_GATE,
    },
    { id: 'a2-lock', bay: 'A2', text: 'Both of you into holding room two.' },
  );
  p.bay.radio.push(
    { at: 'enter', text: 'The neck is on two isolators. Fifteen seconds of dark each time. Use them well.' },
    { at: 'enter', text: "Press while the shunter stands at the neck, or he won't come and look." },
    { at: 'enter', text: 'Two spotters on the staging. Seen in the neck lights and we start again.' },
    { at: `warn:${A2_GATE}`, text: 'Lights back in five.' },
  );

  // ---- spaces, nav, debug points, light and shot spots ----
  p.camSpaces.push({ box: [28, 0, 70, 20], size: 'open' }, { box: [28, 1, 32, 5], size: 'tight' }, { box: [30, 17.5, 62, 20], size: 'tight' });
  p.navSeeds.push({ x: 30.5, y: 0, z: 11 }, { x: 51, y: 0, z: 10 }, { x: 67.5, y: 0, z: 12 }, { x: 46, y: A2_DECK.lip, z: 18.7 });
  p.debugPoints.push(
    { id: 'A2-entry', label: 'Set 2 entry (L1 door)', pos: { x: 30.5, y: 0, z: 11 }, yaw: Math.PI / 2 },
    { id: 'A2-vantage', label: 'Set 2 vantage (road 2 / 3 gap mouth)', pos: { x: 33.5, y: 0, z: 12.5 }, yaw: Math.PI / 2 },
    { id: 'A2-cabin', label: "Set 2 shunter's cabin (cabinet 1)", pos: { x: 30.6, y: 0, z: 2.6 }, yaw: Math.PI },
    { id: 'A2-mid', label: 'Set 2 middle (the neck)', pos: { x: 51, y: 0, z: 10 }, yaw: Math.PI / 2 },
    { id: 'A2-mark', label: 'Set 2 staging leg-up mark', pos: { x: A2_MARK.x, y: 0, z: A2_MARK.z }, yaw: 0 },
    { id: 'A2-east', label: 'Set 2 east apron (cabinet 2)', pos: { x: 68.4, y: 0, z: 12.4 }, yaw: Math.PI / 2 },
  );
  p.lightSpots.push(
    { name: 'A2 neck centre', kind: 'body', x: 51, y: 0, z: 10, band: 'pool' },
    { name: 'A2 neck crossing', kind: 'body', x: 51, y: 0, z: A2_CROSS_Z, band: 'pool' },
    { name: 'A2 neck centre cut', kind: 'body', x: 51, y: 0, z: 10, band: 'cut', off: [21] },
    { name: 'A2 neck crossing cut', kind: 'body', x: 51, y: 0, z: A2_CROSS_Z, band: 'cut', off: [21] },
    { name: 'A2 neck crossing west cut', kind: 'body', x: 46.5, y: 0, z: A2_CROSS_Z, band: 'cut', off: [21] },
    { name: 'A2 neck crossing east cut', kind: 'body', x: 55.5, y: 0, z: A2_CROSS_Z, band: 'cut', off: [21] },
    { name: 'A2 neck cess west cut', kind: 'body', x: 46.2, y: 0, z: 7.5, band: 'cut', off: [21] },
    { name: 'A2 neck cess east cut', kind: 'body', x: 55.8, y: 0, z: 7.5, band: 'cut', off: [21] },
    { name: 'A2 rake gap', kind: 'body', x: 41, y: 0, z: 12.5, band: 'read' },
    { name: 'A2 rake gap cut', kind: 'body', x: 38, y: 0, z: 12.5, band: 'cut', off: [20] },
    { name: 'A2 cess', kind: 'body', x: 41, y: 0, z: 7.5, band: 'read' },
    { name: 'A2 vantage', kind: 'body', x: 33.5, y: 0, z: 12.5, band: 'read' },
    { name: 'A2 cabinet 1', kind: 'body', x: 30.6, y: 0, z: 3.0, band: 'read' },
    { name: 'A2 cabin cut', kind: 'body', x: 30.6, y: 0, z: 3.0, band: 'cut', off: [22] },
    { name: 'A2 coat corner', kind: 'body', x: 28.95, y: 0, z: 4.25, band: 'pocket' },
    { name: 'A2 deck', kind: 'body', x: 46, y: A2_DECK.lip, z: 18.7, band: 'read' },
    { name: 'A2 cabinet 2', kind: 'body', x: 68.8, y: 0, z: A2_CAB2.z, band: 'read' },
    { name: 'A2 east rake gap', kind: 'body', x: 61, y: 0, z: 12.5, band: 'read' },
    { name: 'A2 neck floor', kind: 'surf', x: 51, y: 0.05, z: 10, band: 'any' },
    { name: 'A2 neck standby', kind: 'body', x: 51, y: 0, z: 10, band: 'standby' },
  );
  p.shotVantages.push(
    { name: 'a2-vantage', feet: [33.5, 0, 12.5], cam: [31.4, 1.7, 12.9], target: [52, 1.4, 12.3] },
    { name: 'a2-stair-head', feet: [61.5, A2_DECK.lip, 19], cam: [64.5, 6.0, 18.6], target: [38, 5.2, 18.8] },
  );
  // ---- dressing (slice 2 step 5; SPEC 6, PROPS.md 3 / 5, KIT.md): appended after the greybox, which it does not touch ----
  /** A visual-only skin [x0, x1] x [y0, y1] x [z0, z1]: no collision, `noLedge`, one side under `THIN` (out of the light shapes). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    if (Math.min(x1 - x0, y1 - y0, z1 - z0) >= THIN) throw new Error(`a2CarriageShed: the dressing skin at (${x0}, ${y0}, ${z0}) is not thin`);
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
    b.mark(from, { noLedge: true });
  };
  /** A skin on the face of an axis-aligned block: `side` is the face's outward direction ('s' -z, 'n' +z, 'w' -x, 'e' +x), `at` the face's
   *  plane (z for n / s, x for e / w), [a0, a1] the run along it (x for n / s, z for e / w), `layer` how many skins out (each `SKIN` thick). */
  const face = (side: 'n' | 's' | 'e' | 'w', at: number, a0: number, a1: number, y0: number, y1: number, color: string, layer = 0): void => {
    const o0 = layer * SKIN;
    const o1 = (layer + 1) * SKIN;
    if (side === 'n') skin(a0, a1, y0, y1, at + o0, at + o1, color);
    else if (side === 's') skin(a0, a1, y0, y1, at - o1, at - o0, color);
    else if (side === 'e') skin(at + o0, at + o1, y0, y1, a0, a1, color);
    else skin(at - o1, at - o0, y0, y1, a0, a1, color);
  };
  /** Floor paint (a few mm proud, no collision). */
  const paint = (x0: number, x1: number, z0: number, z1: number, color: string, top = 0.012): void => skin(x0, x1, 0, top, z0, z1, color);
  /** A road number 1-3 in 7-segment strokes (0.2 x 0.36 m) on a face: `centre` along the face, `dir` the way the reader's right runs along it. */
  const digit = (n: 1 | 2 | 3, side: 'n' | 's' | 'e' | 'w', at: number, centre: number, y0: number, dir: 1 | -1, color: string, layer: number): void => {
    const w = 0.2;
    const h = 0.36;
    const s = 0.045;
    const seg: Record<string, readonly [number, number, number, number]> = {
      a: [0, w, h - s, h],
      b: [w - s, w, h / 2, h],
      c: [w - s, w, 0, h / 2],
      d: [0, w, 0, s],
      e: [0, s, 0, h / 2],
      f: [0, s, h / 2, h],
      g: [0, w, (h - s) / 2, (h + s) / 2],
    };
    for (const k of DIGITS[n]) {
      const [u0, u1, v0, v1] = seg[k]!;
      const a = centre + dir * (u0 - w / 2);
      const e = centre + dir * (u1 - w / 2);
      face(side, at, Math.min(a, e), Math.max(a, e), y0 + v0, y0 + v1, color, layer);
    }
  };
  const north = SHELL.north;
  const flight = deck.stairs[0]!;
  const xFoot = flight.x + flight.len / 2;
  const xHead = flight.x - flight.len / 2;
  const zStairS = flight.z - flight.w / 2;
  /** The nosing line's height over x: the east stair's ramp collider's top. */
  const lineAt = (x: number): number => (flight.rise * (xFoot - x)) / flight.len;
  /** A rail along the east stair's slope (pitched like its collider), `lift` above the nosing line; thin in cross-section. */
  const slopeRail = (z0: number, z1: number, lift: number, color: string): void => {
    const from = b.boxes.length;
    b.box(flight.x, flight.rise / 2 + lift, (z0 + z1) / 2, z1 - z0, 0.04, hyp2(flight.len, flight.rise), color, flight.yaw, -Math.atan2(flight.rise, flight.len), false);
    b.mark(from, { noLedge: true });
  };

  // ---- S2-check should-fix 2: the east stair's underside is solid (A2-17) ----
  tally(b, p.register, 'A2-17', 'East stair: noLedge collision fillers under the flight (invisible, 0.5 m slices to just under the ramp slab top: nothing can stand in the steps), its handrails (visual skins) and the open side\'s 1.1 m collision rail (kit.handrail, invisible noLedge, twelve stepped segments of 0.55 m 0.05 m outside the flight from x 68.6 to the head; the bottom treads stay open from the side; accent on the staging strip 23), and one more 1.1 m kit.handrail on the deck\'s east end beside the head (x 61.95 on the deck, z 17.6 from the edge screen\'s back to the rail\'s line: no walk-off the staging there; the stair mouth stays open; drawn as two posts, a top rail and a mid rail, visual skins)', () => {
    for (let xa = xHead; xa < xFoot - 1e-9; xa += STAIR_FILL.step) {
      const xb = Math.min(xa + STAIR_FILL.step, xFoot);
      const hgt = lineAt(xb) - STAIR_FILL.gap;
      if (hgt < 0.05) break;
      const from = b.boxes.length;
      b.box((xa + xb) / 2, hgt / 2, (zStairS + north) / 2, xb - xa, hgt, north - zStairS, STEEL, 0, 0, true, false);
      b.mark(from, { noLedge: true });
    }
    // handrails (visual): a post every 1.5 m on the open south edge with a top and a mid rail, and a wall rail on the gallery wall's face
    for (const x of [69.4, 67.9, 66.4, 64.9, 63.4, 62.2]) {
      skin(x - 0.02, x + 0.02, lineAt(x), lineAt(x) + 1.0, zStairS + 0.02, zStairS + 0.06, LOOK.steelDark);
      skin(x - 0.02, x + 0.02, lineAt(x) + 0.82, lineAt(x) + 0.9, north - 0.06, north, LOOK.steelDark);
    }
    slopeRail(zStairS + 0.02, zStairS + 0.06, 1.0, LOOK.steel);
    slopeRail(zStairS + 0.02, zStairS + 0.06, 0.5, LOOK.steel);
    slopeRail(north - 0.04, north, 0.9, LOOK.steel);
    // the open side's collision rail: the kit's balustrade and its invisible noLedge box per segment, `h` over the walking line at the high end
    const { z: zRail, seg, h: hRail, from, to } = A2_STAIR_RAIL;
    const n = Math.round((from - to) / seg);
    for (let k = 0; k < n; k++) {
      const xa = from - k * seg;
      const xb = xa - seg;
      kit.handrail(xa, zRail, xb, zRail, { y: lineAt(xa), h: hRail + (lineAt(xb) - lineAt(xa)), group: G_STAGING });
    }
    // the deck's east end beside the head (P3-2 fix): coopDeck's stair:'end' leaves the deck's east face open from the edge screen's back
    // (z 17.6) to the rail's line, a 1.1 m wide, 4.4 m drop; one more balustrade on the deck, 0.05 m in from its east face, closes it and
    // meets the stair rail's head box, so the stair mouth (z 18.8 to the gallery wall) stays open
    kit.handrail(xHead - 0.05, 17.6, xHead - 0.05, zRail, { y: A2_DECK.lip, h: hRail, group: G_STAGING });
    // its drawn rail (P4-2; visual skins like the stair's, no collision): a post at each end, a top rail 1.0 m over the deck's lip and a mid rail at 0.5 m
    const xe = xHead - 0.05;
    for (const [z0, z1] of [[17.6, 17.64], [zRail - 0.04, zRail]] as const) skin(xe - 0.02, xe + 0.02, A2_DECK.lip, A2_DECK.lip + 1.0, z0, z1, LOOK.steelDark);
    for (const lift of [1.0, 0.5]) skin(xe - 0.02, xe + 0.02, A2_DECK.lip + lift - 0.02, A2_DECK.lip + lift + 0.02, 17.6, zRail, LOOK.steel);
  });

  // ---- A2-12: rails (the track panels are the props kit's, below) and the buffer faces on the wheel stops ----
  tally(b, p.register, 'A2-12', 'Wheel stops dressed as buffer stops (visual skins, no collision): red headstock face, white band, two buffer plates and a red cap on each of the five; the rails are track panels (A2-20)', () => {
    for (const c of A2_ROADS) {
      for (const { side, at, x0, x1 } of STOPS) {
        if (NO_STOP(side, c)) continue;
        face(side, at, c - 0.8, c + 0.8, 0.04, 0.3, LOOK.red);
        face(side, at, c - 0.8, c + 0.8, 0.16, 0.2, LOOK.white, 1);
        for (const dz of [-0.45, 0.45]) face(side, at, c + dz - 0.12, c + dz + 0.12, 0.08, 0.24, LOOK.buffer, 1);
        skin(x0, x1, 0.3, 0.33, c - 0.8, c + 0.8, LOOK.red);
      }
    }
  });

  // ---- A2-22: the neck closures' dressing (walk482 X2b): hoarding of sheet on a concrete plinth with frame stanchions, rails and a hazard board ----
  tally(b, p.register, 'A2-22', 'Neck closure dressing (visual skins, no collision): concrete plinth, sheeting, rails, frame stanchions and a cap on each of the four closures, a hazard band and a white board with red and black strokes on the neck faces', () => {
    for (const [i, [x0, x1]] of A2_CLOSE_X.entries()) {
      // west closures (x 45.5-46) face the neck on +x, the east ones (x 56-56.5) on -x; the back faces are dressed like the neck faces without the board
      const faces = i === 0 ? ([['e', x1, true], ['w', x0, false]] as const) : ([['w', x0, true], ['e', x1, false]] as const);
      for (const [cz0, cz1, hgt] of [[A2_CLOSE_S.z0, A2_CLOSE_S.z1, A2_CLOSE_S.h], [A2_CLOSE_N.z0, A2_CLOSE_N.z1, A2_CLOSE_N.h]] as const) {
        const mid = (cz0 + cz1) / 2;
        for (const [side, at, front] of faces) {
          face(side, at, cz0, cz1, 0, 0.9, LOOK.concrete);
          face(side, at, cz0, cz1, 0.9, hgt, LOOK.sheet);
          for (const y of [1.8, 2.7, 3.6]) if (y < hgt - 0.1) face(side, at, cz0, cz1, y, y + 0.08, LOOK.sheetRail, 1);
          for (const z of [cz0 + 0.15, mid, cz1 - 0.15]) face(side, at, z - 0.1, z + 0.1, 0, hgt - 0.12, LOOK.frame, 1);
          face(side, at, cz0, cz1, hgt - 0.12, hgt, LOOK.frame, 1);
          if (front) {
            face(side, at, cz0, cz1, 0.9, 1.0, LOOK.yellow, 2);
            face(side, at, mid - 0.45, mid + 0.45, 1.3, 1.85, LOOK.white, 2);
            face(side, at, mid - 0.35, mid + 0.35, 1.55, 1.65, LOOK.red, 3);
            face(side, at, mid - 0.25, mid + 0.25, 1.38, 1.46, LOOK.black, 3);
          }
        }
        skin(x0, x1, hgt, hgt + SKIN, cz0, cz1, LOOK.steelDark);
      }
    }
  });

  // ---- A2-13: the vans (the greybox's 10 x 2.6 x 3.4 boxes stay; the skins give each an underframe, wheels, stanchions, a sliding door) ----
  tally(b, p.register, 'A2-13', 'Box van detail (visual skins, no collision): dark underframe and solebars, wheelsets, planking lines, stanchions, sliding door, roof band and sheet, headstocks and buffer plates, road numbers 1-3 on the neck ends', () => {
    for (const [r, [x0, x1]] of A2_RAKES.entries()) {
      const xm = (x0 + x1) / 2;
      const look = VAN_LOOK[r]!;
      for (const [k, c] of A2_ROADS.entries()) {
        for (const side of ['s', 'n'] as const) {
          const at = side === 's' ? c - VAN.half : c + VAN.half;
          face(side, at, x0 + 0.05, x1 - 0.05, 0, 0.84, LOOK.under);
          face(side, at, x0 + 0.05, x1 - 0.05, 0.84, 1.12, LOOK.sole);
          face(side, at, x0, x1, 3.12, VAN.h, LOOK.roof);
          for (const a of [-2.6, 2.6]) {
            face(side, at, xm + a - 0.42, xm + a + 0.42, 0.17, 0.67, LOOK.wheel, 1);
            face(side, at, xm + a - 0.25, xm + a + 0.25, 0, 0.84, LOOK.wheel, 1);
            face(side, at, xm + a - 0.09, xm + a + 0.09, 0.33, 0.51, LOOK.hub, 2);
          }
          for (const [a, e] of [[x0 + 0.1, xm - 1.0], [xm + 1.0, x1 - 0.1]] as const) for (const y of [1.75, 2.45]) face(side, at, a, e, y, y + 0.02, look.plank);
          for (const o of [-4.45, -2.3, 2.3, 4.45]) face(side, at, xm + o - 0.05, xm + o + 0.05, 1.12, 3.12, LOOK.stanch, 1);
          face(side, at, xm - 0.95, xm + 0.95, 1.18, 3.0, look.door, 1);
          face(side, at, xm - 2.1, xm + 2.1, 1.12, 1.18, LOOK.stanch, 2);
          face(side, at, xm - 2.1, xm + 2.1, 3.0, 3.06, LOOK.stanch, 2);
          face(side, at, xm + 0.7, xm + 0.78, 1.9, 2.15, LOOK.black, 2);
          face(side, at, xm - 4.0, xm - 3.4, 1.3, 1.55, LOOK.white, 1);
        }
        for (const [side, at] of [['w', x0], ['e', x1]] as const) {
          face(side, at, c - 1.25, c + 1.25, 0.82, 1.15, LOOK.sole);
          for (const dz of [-0.875, 0.875]) face(side, at, c + dz - 0.19, c + dz + 0.19, 0.84, 1.22, LOOK.buffer, 1);
        }
        skin(x0, x1, VAN.h, VAN.h + SKIN, c - VAN.half, c + VAN.half, LOOK.roof);
        // the road number on the end that faces the neck: a white board and the stencil (1 / 2 / 3 from the south)
        const [side, at, dir] = r === 0 ? (['e', x1, 1] as const) : (['w', x0, -1] as const);
        face(side, at, c - 0.4, c + 0.4, 2.0, 2.65, LOOK.white, 1);
        digit((k + 1) as 1 | 2 | 3, side, at, c, 2.15, dir, LOOK.black, 2);
      }
    }
  });

  // ---- A2-14: the shunter's cabin: railway-green hut, trim, felt roof, sign; inside lining, switchgear wall, desk fittings, coat hooks ----
  tally(b, p.register, 'A2-14', "Shunter's cabin dressing (visual skins, no collision): green and cream boarding with battens, door surrounds, sign, fascia, felt roof and downpipe outside; lining, switchgear board and conduit, floor, door mat, desk top and fittings, notice board, coat hooks and coats inside", () => {
    const xe = cx1 + h;
    const zn = cz1 + h;
    const xi = cx1 - h;
    const zi = cz1 - h;
    const west = SHELL.west;
    const zs = PLANT_FACE;
    // outside: base course, green boards to 1.05, cream to the roof, battens; the doors' gaps and lintels as built
    const outside = (side: 'n' | 'e', at: number, runs: readonly (readonly [number, number])[], lintel: readonly [number, number], battens: readonly number[]): void => {
      for (const [a, e] of runs) {
        face(side, at, a, e, 0, 0.15, LOOK.steelDark);
        face(side, at, a, e, 0.15, 1.05, LOOK.green);
        face(side, at, a, e, 1.05, wallH, LOOK.cream);
      }
      face(side, at, lintel[0], lintel[1], DOOR_N.h, wallH, LOOK.cream);
      for (const x of battens) face(side, at, x - 0.025, x + 0.025, 0.15, wallH, LOOK.trim, 1);
    };
    outside('n', zn, [[west, DOOR_N.x0], [DOOR_N.x1, xe]], [DOOR_N.x0, DOOR_N.x1], [28.8, 29.4, 30.0, 32.0]);
    outside('e', xe, [[SHELL.south, DOOR_E.z0], [DOOR_E.z1, zn]], [DOOR_E.z0, DOOR_E.z1], [0.8, 1.5, 3.8, 4.4]);
    for (const [side, at, a0, a1] of [['n', zn, DOOR_N.x0, DOOR_N.x1], ['e', xe, DOOR_E.z0, DOOR_E.z1]] as const) {
      // the door's surround (white trim) and the lintel's head
      face(side, at, a0 - 0.06, a0, 0, DOOR_N.h + 0.06, LOOK.trim, 1);
      face(side, at, a1, a1 + 0.06, 0, DOOR_N.h + 0.06, LOOK.trim, 1);
      face(side, at, a0, a1, DOOR_N.h, DOOR_N.h + 0.06, LOOK.trim, 1);
    }
    face('n', zn, 30.55, 31.45, 2.2, 2.42, LOOK.white, 2);
    face('n', zn, 30.7, 31.3, 2.28, 2.34, LOOK.black, 3);
    face('n', zn, 29.3, 29.6, 1.7, 1.85, LOOK.white, 1);
    face('n', zn, xe - 0.1, xe - 0.02, 0.1, wallH, LOOK.pipe, 1);
    // fascia, felt roof (a skin's width past the edge) over the slab's top
    face('n', zn, west, xe, wallH, wallH + roofT, LOOK.trim);
    face('e', xe, SHELL.south, zn, wallH, wallH + roofT, LOOK.trim);
    skin(west, xe + SKIN, wallH + roofT, wallH + roofT + SKIN, SHELL.south, zn + SKIN, LOOK.felt);
    // inside: green lining under cream on the north, east and west walls (the switch boxes carry the two wall switches)
    const lining = (side: 's' | 'w' | 'e', at: number, runs: readonly (readonly [number, number])[]): void => {
      for (const [a, e] of runs) {
        face(side, at, a, e, 0, 1.1, LOOK.green);
        face(side, at, a, e, 1.1, wallH, LOOK.cream);
      }
    };
    lining('s', zi, [[west, DOOR_N.x0], [DOOR_N.x1, xi]]);
    lining('w', xi, [[zs, DOOR_E.z0], [DOOR_E.z1, zi]]);
    lining('e', west, [[zs, zi]]);
    face('s', zi, 31.65, 31.85, 1.1, 1.3, LOOK.steelDark, 1);
    face('e', west, 6.5, 6.7, 1.1, 1.3, LOOK.steelDark, 1);
    // the plant wall's face: a switchgear board with its breakers, a conduit run
    face('n', zs, west, 30.15, 0, 1.0, LOOK.frame);
    face('n', zs, 31.05, xi, 0, 1.0, LOOK.frame);
    face('n', zs, 28.45, 29.35, 1.2, 2.0, LOOK.steelDark, 1);
    for (const x of [28.55, 28.75, 28.95, 29.15]) face('n', zs, x, x + 0.1, 1.4, 1.7, LOOK.black, 2);
    face('n', zs, west, xi, 2.18, 2.24, LOOK.pipe, 1);
    // floor: lino, and a mat inside the north door
    paint(west, xi, zs, zi, LOOK.lino, 0.008);
    paint(DOOR_N.x0, DOOR_N.x1, zi - 0.6, zi, LOOK.mat, 0.014);
    // the desk (x 28.25-28.95, z 1.5-3.1): a worktop skin, logbook, phone, lamp base; a notice board, a clock and a shelf of hard hats on the west wall
    skin(west, 28.95, 0.75, 0.78, 1.5, 3.1, LOOK.wood);
    skin(28.45, 28.7, 0.78, 0.8, 1.7, 1.95, LOOK.white);
    skin(28.35, 28.5, 0.78, 0.82, 2.4, 2.55, LOOK.black);
    skin(28.35, 28.5, 0.78, 0.8, 2.8, 3.0, LOOK.steelDark);
    face('e', west, 1.7, 2.9, 1.25, 1.85, LOOK.cork, 1);
    for (const [a, e, y] of [[1.8, 2.0, 1.5], [2.15, 2.35, 1.4], [2.45, 2.65, 1.55]] as const) face('e', west, a, e, y, y + 0.2, LOOK.white, 2);
    face('e', west, 3.15, 3.45, 1.95, 2.25, LOOK.white, 1);
    skin(west, west + 0.2, 1.92, 1.95, 3.7, 4.6, LOOK.wood);
    for (const z of [3.85, 4.3]) skin(west + 0.04, west + 0.08, 1.95, 2.13, z, z + 0.22, LOOK.yellow);
    // the coat corner: a hook rail on the north wall and four coats hanging from it (skins: out of the light shapes, the pocket stays as tuned)
    face('s', zi, 28.35, 29.55, 1.6, 1.68, LOOK.wood, 1);
    for (const [x, color] of [[28.4, LOOK.coatA], [28.7, LOOK.coatB], [29.0, LOOK.vest], [29.3, LOOK.coatA]] as const) face('s', zi, x, x + 0.25, 0.75, 1.6, color, 2);
  });

  // ---- A2-15: the isolator cabinets' bodies (1.6 m, greybox) and the push stations (props, below) ----
  tally(b, p.register, 'A2-15', 'Isolator cabinet faces (visual skins, no collision): kick plates, louvres, door seams, caps, a danger plate, and the number plate on the wall above each; the push stations are props (A2-20)', () => {
    // cabinet 1: x 30.15-31.05, z 1.1-1.55, on the plant wall, front on +z
    face('n', 1.55, 30.15, 31.05, 0, 0.1, LOOK.under);
    for (const y of [0.17, 0.25, 0.33, 0.41]) face('n', 1.55, 30.3, 30.9, y, y + 0.04, LOOK.under);
    for (const x of [30.28, 30.92]) face('n', 1.55, x - 0.005, x + 0.005, 0.1, 1.6, LOOK.black);
    face('n', 1.55, 30.17, 30.26, 1.1, 1.4, LOOK.red);
    for (const [side, at] of [['w', 30.15], ['e', 31.05]] as const) for (const y of [0.9, 1.0, 1.1]) face(side, at, 1.2, 1.5, y, y + 0.05, LOOK.under);
    skin(30.15, 31.05, 1.6, 1.63, 1.1, 1.55, LOOK.roof);
    face('n', 1.1, 30.35, 30.85, 1.7, 1.95, LOOK.white);
    digit(1, 'n', 1.1, 30.6, 1.77, -1, LOOK.black, 1);
    // cabinet 2: x 69.45-69.75, z 12.95-13.85, on the east wall, front on -x
    face('w', 69.45, 12.95, 13.85, 0, 0.1, LOOK.under);
    for (const y of [0.17, 0.25, 0.33, 0.41]) face('w', 69.45, 13.05, 13.75, y, y + 0.04, LOOK.under);
    for (const z of [13.08, 13.72]) face('w', 69.45, z - 0.005, z + 0.005, 0.1, 1.6, LOOK.black);
    face('w', 69.45, 12.97, 13.05, 1.1, 1.4, LOOK.red);
    for (const [side, at] of [['s', 12.95], ['n', 13.85]] as const) for (const y of [0.9, 1.0, 1.1]) face(side, at, 69.5, 69.7, y, y + 0.05, LOOK.under);
    skin(69.45, 69.75, 1.6, 1.63, 12.95, 13.85, LOOK.roof);
    face('w', SHELL.east, 13.15, 13.65, 1.7, 1.95, LOOK.white);
    digit(2, 'w', SHELL.east, 13.4, 1.77, -1, LOOK.black, 1);
  });

  // ---- A2-16: the cleaning staging: chequer plate, the deck face, screens, the drop chain, the closed west stair's scar, the switch post ----
  tally(b, p.register, 'A2-16', 'Staging dressing (visual skins, no collision): chequer-plate sheet with seams and a yellow edge band, concrete plinth, pilasters, rails, water main and three signs on the deck face, screen caps and bands, the drop chain (P13) across the open edge, the permit board and stair scar on the west face, the staging switch post', () => {
    const lip = A2_DECK.lip;
    const zf = A2_DECK.z;
    // the deck's top: plate sheet, 1.2 m seams, two cross seams, the yellow edge band along the open loading edge
    skin(30, 62, lip, lip + 0.005, zf + 0.1, north, LOOK.plate);
    for (let k = 1; k <= 26; k++) skin(30 + 1.2 * k - 0.01, 30 + 1.2 * k + 0.01, lip + 0.005, lip + 0.01, zf + 0.1, north, LOOK.seam);
    for (const z of [18.4, 19.1]) skin(30, 62, lip + 0.005, lip + 0.01, z - 0.01, z + 0.01, LOOK.seam);
    skin(A2_LIP_X[0], A2_LIP_X[1], lip + 0.005, lip + 0.012, zf, zf + 0.25, LOOK.yellow);
    // the deck's face (z 17.5, over the walkway): plinth, hazard nosing, pilasters every 4 m from x 37, two rails, the water main, three signs
    face('s', zf, 30, 62, 0, 0.45, LOOK.concrete);
    face('s', zf, 30, 62, 4.28, lip, LOOK.yellow);
    for (const x of [37, 41, 45, 49, 53, 57, 61]) face('s', zf, x - 0.15, x + 0.15, 0.45, 4.28, LOOK.frame, 1);
    for (const y of [1.6, 3.0]) face('s', zf, 35.15, 61.85, y, y + 0.12, LOOK.steelDark, 2);
    face('s', zf, 36, 61, 3.86, 3.9, LOOK.pipe, 3);
    for (const [a, e] of [[38.0, 40.7], [49.2, 52.8], [57.2, 60.8]] as const) {
      face('s', zf, a, e, 3.2, 3.8, LOOK.white, 1);
      face('s', zf, a + 0.1, e - 0.1, 3.62, 3.72, LOOK.red, 2);
      face('s', zf, a + 0.2, e - 0.2, 3.35, 3.45, LOOK.black, 2);
    }
    // the screens (1.2 m, x 30-31 and 35-62): caps, a yellow band on both faces, a fall-hazard board on the deck side by the open edge
    for (const [a, e] of [[30, 31], [35, 62]] as const) {
      skin(a, e, lip + 1.2, lip + 1.2 + SKIN, zf, zf + 0.1, LOOK.steelDark);
      face('s', zf, a, e, 4.95, 5.05, LOOK.yellow);
      face('n', zf + 0.1, a, e, 4.95, 5.05, LOOK.yellow);
    }
    face('n', zf + 0.1, 35.3, 36.4, 4.65, 5.2, LOOK.white, 1);
    face('n', zf + 0.1, 35.4, 36.3, 4.95, 5.05, LOOK.red, 2);
    // the drop chain across the open edge (SPEC P13: visual, no collision): eye plates on the screens' ends and twenty-four links hanging in a swag
    for (const [side, at] of [['e', A2_LIP_X[0]], ['w', A2_LIP_X[1]]] as const) face(side, at, zf, zf + 0.1, 5.3, 5.4, LOOK.steelDark);
    const links = 24;
    const span = A2_LIP_X[1] - A2_LIP_X[0] - 0.2;
    for (let i = 0; i < links; i++) {
      const x = A2_LIP_X[0] + 0.1 + (span * (i + 0.5)) / links;
      const sag = 0.2 * (1 - ((x - (A2_LIP_X[0] + A2_LIP_X[1]) / 2) / 2) ** 2);
      const y = lip + 0.95 - sag;
      skin(x - 0.07, x + 0.07, y, y + 0.04, zf + 0.03, zf + 0.07, LOOK.pipe);
    }
    // the west face (x 30, the pocket where the west stair was taken out for repair, A2-D3): a permit board, the stair's scar, two stringer brackets with their bolts
    face('w', 30, 17.7, 19.7, 0, lip, LOOK.scar);
    face('w', 30, 17.85, 18.75, 1.95, 2.7, LOOK.white, 1);
    face('w', 30, 17.9, 18.7, 2.45, 2.57, LOOK.red, 2);
    face('w', 30, 18.0, 18.6, 2.15, 2.25, LOOK.black, 2);
    for (const z of [18.95, 19.45]) {
      face('w', 30, z, z + 0.12, 2.4, lip - 0.1, LOOK.steel, 1);
      for (const y of [2.55, 2.85, 3.15, 3.45]) face('w', 30, z + 0.03, z + 0.09, y, y + 0.06, LOOK.black, 2);
    }
    // the staging switch (61.7, 5.6, 19.7) floated in front of the glazing: a conduit post on the deck against the wall's face, with the switch's box
    face('s', north, SWITCH_POST_X - 0.15, SWITCH_POST_X + 0.15, lip, 6.1, LOOK.steelDark);
    for (const x of [SWITCH_POST_X - 0.15, SWITCH_POST_X + 0.11]) face('s', north, x, x + 0.04, lip, 6.1, LOOK.frame, 1);
    face('s', north, SWITCH_POST_X - 0.1, SWITCH_POST_X + 0.1, 5.45, 5.8, LOOK.steel, 1);
    face('s', north, SWITCH_POST_X - 0.12, SWITCH_POST_X + 0.12, 6.1, 6.13, LOOK.steel);
  });

  // ---- A2-18: the shed's own walls (sheeting on a concrete plinth, frame stanchions on the 6 m grid), the roof ties, floor paint and stains ----
  tally(b, p.register, 'A2-18', "Shed dressing (visual skins, no collision): concrete plinth, sheeting, rails, frame stanchions and a fascia under the hall's panels on the south, west and east walls (the door and glass slot left clear), the shed switch's conduit, a fire point, roof tie beams with the lamps' cables, the leg-up keep-clear box, the walkway kick line and oil stains", () => {
    const wall = (side: 'n' | 'e' | 'w', at: number, runs: readonly (readonly [number, number])[], posts: readonly number[]): void => {
      for (const [a, e] of runs) {
        face(side, at, a, e, 0, 0.9, LOOK.concrete);
        face(side, at, a, e, 0.9, 4.4, LOOK.sheet);
        for (const y of [1.8, 2.7, 3.6]) face(side, at, a, e, y, y + 0.08, LOOK.sheetRail, 1);
        face(side, at, a, e, 4.28, 4.4, LOOK.frame, 1);
        for (const q of posts) if (q - 0.15 >= a && q + 0.15 <= e) face(side, at, q - 0.15, q + 0.15, 0, 4.28, LOOK.frame, 1);
      }
    };
    wall('n', SHELL.south, [[cx1 + h, SHELL.east]], [36, 42, 48, 54, 60, 66]);
    wall('e', SHELL.west, wallRuns(5.2, 19.7, [[9.8, 13.7]]), [6, 18]);
    wall('w', SHELL.east, wallRuns(0.3, 19.7, [[8.9, 11.1]]), [6, 14, 18]);
    face('e', SHELL.west, 6.58, 6.62, 1.3, 2.4, LOOK.pipe, 2);
    face('n', SHELL.south, 43.85, 44.15, 0.9, 1.5, LOOK.red, 1);
    face('n', SHELL.south, 43.85, 44.15, 1.55, 1.85, LOOK.white, 1);
    // the roof ties: I-beams (a web and two flanges) over the lamps, the high-bays hung under the cross ties, the strips on cables
    const tie = (x0: number, x1: number, z0: number, z1: number, y0: number): void => {
      const alongX = x1 - x0 > z1 - z0;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const hx = alongX ? (x1 - x0) / 2 : 0.1;
      const hz = alongX ? 0.1 : (z1 - z0) / 2;
      skin(cx - (alongX ? hx : 0.015), cx + (alongX ? hx : 0.015), y0, y0 + 0.3, cz - (alongX ? 0.015 : hz), cz + (alongX ? 0.015 : hz), LOOK.tie);
      for (const y of [y0, y0 + 0.28]) skin(cx - hx, cx + hx, y, y + 0.02, cz - hz, cz + hz, LOOK.tie);
    };
    for (const z of [7.5, 12.5, 19.0]) tie(SHELL.west, SHELL.east, z, z, 7.55);
    for (const x of [48.5, 53.5]) tie(x, x, SHELL.south, SHELL.north, 7.15);
    for (const [x, z, y] of [[41, 7.5, 6.5], [41, 12.5, 6.5], [61, 7.5, 6.5], [61, 12.5, 6.5], [36, 19, 7], [44, 19, 7], [52, 19, 7], [60, 19, 7]] as const) {
      for (const dx of [-0.6, 0.6]) skin(x + dx - 0.01, x + dx + 0.01, y + 0.12, 7.55, z - 0.01, z + 0.01, LOOK.tie);
    }
    // floor paint: the leg-up's keep-clear box in front of the loading edge (its own stripes stay inside), the kick line along the deck face, oil stains
    paint(A2_LIP_X[0], A2_LIP_X[1], 16.35, 16.45, LOOK.yellow);
    paint(A2_LIP_X[0], A2_LIP_X[0] + 0.1, 16.35, 17.5, LOOK.yellow);
    paint(A2_LIP_X[1] - 0.1, A2_LIP_X[1], 16.35, 17.5, LOOK.yellow);
    paint(35.2, 61.8, 17.3, 17.4, LOOK.yellow);
    for (const [x0, x1, z0, z1] of [[50.2, 51.6, 9.4, 10.1], [48.3, 49.2, 12.4, 12.9], [52.6, 53.7, 4.9, 5.5], [54.0, 54.8, 14.0, 14.6], [40.2, 41.3, 7.2, 7.8], [60.5, 61.5, 8.0, 8.6], [34.6, 35.7, 16.7, 17.2], [47.2, 48.4, 8.4, 8.9]] as const) paint(x0, x1, z0, z1, LOOK.stain, 0.006);
  });

  // ---- A2-19: the hall above the set (kit panels with accent coves, each on its circuit; no lamp) ----
  tally(b, p.register, 'A2-19', "Kit panels above the shed (visual): the hall's charcoal panels and coves from 4.4 m to the roof on the south wall and both end walls (shed general 20, the door's 1.0 m frame left clear), and over the gallery glazing on the north wall (staging 23)", () => {
    const corner = 0.09;
    const top = A2_DECK.lip;
    const rise = HALL_H - top;
    kit.wallPanel((SHELL.west + SHELL.east) / 2, SHELL.south, SHELL.east - SHELL.west - 2 * corner, 0, { h: rise, y: top, tone: 'warm', group: G_SHED });
    for (const [a, e] of wallRuns(SHELL.south + corner, north - corner, [[10.0, 12.0]])) kit.wallPanel(SHELL.west, (a + e) / 2, e - a, Math.PI / 2, { h: rise, y: top, tone: 'warm', group: G_SHED });
    for (const [a, e] of wallRuns(SHELL.south + corner, north - corner, [[9.0, 11.0]])) kit.wallPanel(SHELL.east, (a + e) / 2, e - a, -Math.PI / 2, { h: rise, y: top, tone: 'warm', group: G_SHED });
    kit.wallPanel((SHELL.west + SHELL.east) / 2, north, SHELL.east - SHELL.west - 2 * corner, Math.PI, { h: HALL_H - GAL_TOP, y: GAL_TOP, tone: 'warm', group: G_STAGING });
  });

  // ---- A2-20: the props kit (PROPS.md 3 A2): twelve track panels (rails flush), two push stations, the permit gate. Collision is the props' own box via `write` ----
  const props = new FacilityProps();
  for (const c of A2_ROADS) for (const x of A2_TRACK_X) props.add('trackPanel', x, c, 0);
  props.add('pushStation', A2_CAB1.x, 1.55, 0, { y: 0.6 });
  props.add('pushStation', 69.45, A2_CAB2.z, -Math.PI / 2, { y: 0.6 });
  props.add('permitGate', A2_GATE_AT.x, A2_GATE_AT.z, Math.PI);
  tally(b, p.register, 'A2-20', 'Props kit: twelve track panels (rails and sleepers flush, no collision), the two push stations on the cabinets (device-owned, no collision) and the padlocked permit gate that closes the removed west stair pocket (its one see-through box via FacilityProps.write, noLedge)', () => {
    const from = b.boxes.length;
    props.write(b);
    b.mark(from, { noLedge: true });
  });
  p.props.push(...props.placements);

  return p;
}
