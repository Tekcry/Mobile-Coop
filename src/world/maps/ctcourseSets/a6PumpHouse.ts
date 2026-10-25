/**
 * A6 the Pump House (SPEC section 9 "A6 - Set 6, the Pump House"; set doc `docs/marlow-final/sets/a6PumpHouse.md`, section 13
 * over SPEC; PLAN slice 6, steps 2-4: greybox, lights, guard / objective steps / e2e). A tidal-barrier pumping station: three
 * vertical pumps in a row, the plated old sump inside the entry, the motor gallery along the north wall, the bridge over the
 * drive cage, the attendant's desk and the staff stair at the lit east end. It teaches the hang-down onto a hold device (N4:
 * the drive panel's 3 s isolate key, buzzing to 6 m) and uses the two-person rope once, untimed (P10).
 *
 * Ground, set box x 40-64, z 54-72, open to the 10 m hall roof (the walls on the box edges are `facility.ts`'s):
 * - the sump bay x 48.2-57.8, z 54.2-58 inside the L5 door (`metal`, loud) behind a 1.2 m guard kerb along z 58 (x 49.4-56.6,
 *   1.2 m openings at both ends): the crouched entry vantage (51.0, 56.6) in the tagged-out dark;
 * - pumps 1, 2, 3 at (60, 61), (56, 61), (46, 61): 2.4 m plinths 1.2 high (low cover) and 1.2 m motors to 4.0 (`noLedge`;
 *   pump 3 at x 46, A6-D3); the gauge board between pumps 1 and 2; the attendant's desk x 60.6-62.4, z 65.6-66.4;
 * - the motor gallery x 40.3-56.0, z 69.6-71.775 (`coopDeck`, deck 4.4, depth 2.175 to the north wall's face, A6-D8): the open
 *   loading edge x 40.8-45.3 is the one co-op lip (leg-up mark (43.05, 69.1), the rescue line at (43.15, 4.4, 70.2)); 1.2 m
 *   edge screens on x 40.3-40.8, 45.3-49.0 and 54.0-56.0 (the screen split by hand for the bridge, A6-D4); the davit box;
 *   the staff stair x 56.0-63.7 against the north wall (27 risers, its underside closed by `noLedge` fillers);
 * - the bridge x 49-54, z 61.6-69.6 at 4.4 (`hangPlate` slab with its 0.55 m gland plate at (51.5, 64.9), a hand slab north
 *   of it, 1.1 m handrails on both sides and the south end, `noLedge` and `overhead`), over the drive cage x 49.4-53.6,
 *   z 62-66.2 (`hangPlate`: solid walls to the slab, locked door `A6-cage` on its south face, the drive cabinet with the panel
 *   `sw-a6-panel` facing the plate and the exit release `sw-a6-exit` on its back; A6-D1, A6-D2). The panel is out of reach
 *   from outside the cage and from the deck: the hang-down is the only way to it (or a drop into the cage, the fallback).
 * The outfall door is the facility's L6 near door: a `flag` gate on `a6-drive` (A6-C7). Every block 1.9 m or taller is
 * `noLedge`; nothing a player alone can stand on lies within 4.7 m of the loading edge. Prototype starting values (G10).
 *
 * Lights (LIGHTING-PLAN 3, A6; `MARLOW_CIRCUITS` 60-63, 69 dead): the pump floor high-bays 60 (the east third), the gallery
 * strip 61 (bulkheads over the bridge junction and the stair), the desk lamp 62, the cage work light 63 (the drive panel's
 * own circuit); the sump high-bay and the gallery's west fittings are tagged out (no lamp).
 *
 * Dressing (slice 6 step 5, SPEC 6, M5: a tidal-barrier pumping station mock-up inside the luxury hall, so it keeps its own materials -
 * poured concrete and green-dado block walls, machinery-blue motors with yellow guards, chequer plate, a louvred sheet-steel drive
 * cage, a timber desk - and only the hall above the set takes the kit's charcoal panels):
 * - the greybox's boxes, lamps, doors, devices and anchors are untouched; the dressing is appended after them;
 * - everything built by hand is a thin visual skin (no collision, `noLedge`, one side under `CANON_MIN_THICK` so it is out of the
 *   canonical light shapes: the bake, the meter and the guards see the greybox as built): the pumps' plinth and motor detail, the
 *   sump plate and kerb stripes, the gauge board and desk, the gallery plate, screens, drop chain and davit box, the stair's
 *   nosings and wall rail, the bridge plate and the lifting-point sign on its fascia, the cage's louvres, kick band and posts, the
 *   drive cabinet, the walls' plinth / dado / block, the tide gauge, the overhead crane, the tagged-out fittings and their tags;
 * - the only new collision is invisible or the props kit's own, all `noLedge`: the staff stair's open-side rail (`kit.handrail`, twelve
 *   stepped segments, S567-check polish 2) and the five `pipeRun` modules of the discharge main along the east wall;
 * - kit panels with accent coves above the set walls, every one on its circuit's group (60 floor, 61 gallery, 69 the tagged-out
 *   west end: dark with no lamp). No lamp is added.
 */
import { hyp2 } from '../../../core/mathx';
import type { CourseObjective, EgressGate, FlagGate, PickupGate } from '../../../game/course/courseDef';
import type { FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { makeCone } from '../../lights';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { marlowCourseGroups } from '../../lighting/marlowCircuits';
import { FacilityProps, PROP_LAMP_TINT } from '../../props/facilityProps';
import { applyGreybox, coopDeck, hangPlate, type GreyBox } from '../ctcourseGreybox';
import { GAL_TOP, wallRuns } from './facility';
import { emptyPart, HALL_H, setExitDoor, tally, type SetPart } from './types';

/** The attendant's squad slot id and his patrol loop (set doc section 2; one pass point added round the desk, A6 S6 note). */
export const A6_ATTENDANT = 'a6-attendant';
/** A walker pauses at a route point for its `waits` entry; a wait of 0 never advances (`PatrolWalker.step`), so the pass-through
 *  points pause this long (s), as A2's. */
export const A6_PASS_WAIT = 0.1;
/** D the desk (his post, facing south over the log), W round the desk's west end, G the gauge board (facing south), the gap
 *  between pump 2's plinth and the cage's south-east corner (north and south of it), P3 pump 3's east face (facing west). */
export const A6_ATTENDANT_ROUTE: [number, number][] = [
  [61.5, 67.1],
  [60.0, 67.0],
  [58.0, 63.1],
  [54.2, 62.9],
  [54.2, 61.2],
  [48.2, 61.0],
  [54.2, 61.2],
  [54.2, 62.9],
  [60.0, 67.0],
];
export const A6_ATTENDANT_WAITS = [4, A6_PASS_WAIT, 3, A6_PASS_WAIT, A6_PASS_WAIT, 4, A6_PASS_WAIT, A6_PASS_WAIT, A6_PASS_WAIT];
export const A6_ATTENDANT_FACES = [Math.PI, Number.NaN, Math.PI, Number.NaN, Number.NaN, -Math.PI / 2, Number.NaN, Number.NaN, Number.NaN];

/** The drive panel (N4 hold device, buzzer), the cage's exit release, their gates, the cage door, the outfall gate and the flags. */
export const A6_PANEL = 'sw-a6-panel';
export const A6_EXIT = 'sw-a6-exit';
export const A6_PANEL_GATE = 'g-a6-panel';
export const A6_EXIT_GATE = 'g-a6-exit';
export const A6_OUTFALL_GATE = 'g-a6-outfall';
export const A6_CAGE_DOOR = 'A6-cage';
/** The panel's flag (SPEC's name, A6-D5: the helper's is `a6-done`) and the hold (s) and buzzer radius (m, A6-D6). */
export const A6_DRIVE_FLAG = 'a6-drive';
/** (marlow-polish P3-1) The interlock lamp's device id (the pushStation beside the L6 door): red while `A6_DRIVE_FLAG` is
 *  clear, green once it is set (`CtDevices` flag lamps; render only). */
export const A6_INTERLOCK = 'a6-interlock';
export const A6_HOLD = 3;
export const A6_HOLD_NOISE = 6;
/** The outfall door: the facility's L6 near door (A6-C7). */
export const A6_OUTFALL_DOOR = setExitDoor('a6PumpHouse')!;

/** Both players on the motor gallery or the bridge (the `a6-up` step) and the zone that sets it (floor 4.4). */
export const A6_GAL_FLAG = 'a6-gal';
export const A6_GAL_ZONE: [number, number, number, number] = [40.3, 61.6, 63.7, 71.775];

/** The motor gallery (`coopDeck` at its front edge's centre), the open loading edge along x, the leg-up mark, the rope spot. */
export const A6_DECK = { x: 48.15, z: 69.6, span: 15.7, depth: 2.175, lip: 4.4, open: [-7.35, -2.85] as [number, number], rope: -5.0 } as const;
export const A6_LIP_X: [number, number] = [40.8, 45.3];
export const A6_MARK = { x: 43.05, z: 69.1 } as const;
export const A6_ROPE = { x: 43.15, y: 4.4, z: 70.2 } as const;
export const A6_RUNNER = { x: 43.15, z: 69.0 } as const;
/** The gallery's east edge screen is split for the bridge (A6-D4): screens on x 45.3-49.0 and 54.0-56.0. */
export const A6_SCREENS: readonly (readonly [number, number])[] = [[40.3, 40.8], [45.3, 49.0], [54.0, 56.0]];
/** The bridge and its drive cage (`hangPlate` at the cage centre, the holder facing south), the plate and the holder's spot. */
export const A6_HANG = { x: 51.5, z: 64.1, deck: 4.4, slab: 0.4, cage: [4.2, 4.2] as [number, number], overhang: 0.4, hole: 0.55 } as const;
export const A6_BRIDGE: [number, number, number, number] = [49.0, 61.6, 54.0, 69.6];
export const A6_CAGE: [number, number, number, number] = [49.4, 62.0, 53.6, 66.2];
export const A6_PLATE = { x: 51.5, z: 64.9 } as const;
export const A6_HOLDER = { x: 51.5, z: 65.6 } as const;
/** The bridge handrails (A6-13): 1.1 m, on the slab's edges (their 0.1 m boxes inside the slab). */
export const A6_RAIL = { h: 1.1, west: 49.05, east: 53.95, south: 61.65 } as const;
/** The pumps' centres (1, 2, 3), the plinth (2.4 m square, 1.2 high) and the motor (1.2 m square to 4.0). */
export const A6_PUMPS: readonly (readonly [number, number])[] = [[60, 61], [56, 61], [46, 61]];
export const A6_PUMP = { plinth: 2.4, plinthH: 1.2, motor: 1.2, top: 4.0 } as const;
/** The sump bay (plated, `metal`), its guard kerb along z 58 and the crouched entry vantage behind it. */
export const A6_SUMP: [number, number, number, number] = [48.2, 54.25, 57.8, 58.0];
export const A6_KERB = { x0: 49.4, x1: 56.6, z: 58, t: 0.3, h: 1.2 } as const;
export const A6_VANTAGE = { x: 51.0, z: 56.6 } as const;
/** The attendant's desk, the gauge board between pumps 1 and 2 (the board on its stand), the davit box on the gallery. */
export const A6_DESK: [number, number, number, number] = [60.6, 65.6, 62.4, 66.4];
export const A6_GAUGE = { x: 58.0, z: 62.4, w: 1.2, t: 0.2, h: 1.5 } as const;
export const A6_DAVIT = { x: 43.15, z: 71.2, s: 0.6 } as const;
/** The staff stair's underside fillers (as A2's: 0.5 m slices to just under the ramp collider's nosing line). */
export const A6_STAIR_FILL = { step: 0.5, gap: 0.05 } as const;
/** The shell's room-side faces (`facility.ts`, 0.5 m walls). */
export const A6_SHELL = { west: 40.25, east: 63.75, south: 54.25, north: 71.75 } as const;

const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
const WARM: [number, number, number] = [1.0, 0.84, 0.62];
const CONCRETE = '#5d5f5c';
const STEEL = '#5c6268';
const PUMP = '#4f6f8a';
const DESK = '#3a3226';

// ---- dressing (slice 6 step 5) ----
/** The circuits the kit's accent coves follow: the pump floor (60) round the south and east walls, the gallery strip (61) over the north wall, the
 *  tagged-out circuit (69: no lamp, so its LED lines stay dark) over the dark west end. */
export const A6_G_FLOOR = 60;
export const A6_G_GALLERY = 61;
export const A6_G_TAGGED = 69;
/** A dressing skin's thickness (m) and the thinnest side a skin may have: under `CANON_MIN_THICK` (0.05, `voxel/lightShapes.ts`) the
 *  canonical light shapes leave it out, so dressing never moves the bake, the meter or what a guard sees. */
const SKIN = 0.03;
const THIN = 0.05;
/** A kit wall panel's outer face stands this far off the wall's face (its fascia and cove, `build_kit.py`). */
const PANEL_OUT = 0.06;
/** The staff stair's open-side rail (S567-check polish 2): `kit.handrail` in stepped segments of `seg` m along x at z `z` (0.05 m outside the flight's
 *  open edge, so it never narrows the 1.2 m flight), from the flight's third tread (x `from`: the foot stays open to step on) to the head (x `to`);
 *  each segment's collision box starts at the floor line at its low (east) end and stands `h` m over the line at its high end. */
export const A6_STAIR_RAIL = { z: 70.5, from: 62.6, to: 56.0, seg: 0.55, h: 1.1 } as const;
/** The discharge main to the outfall: five `pipeRun` modules end to end along the east wall (centres z, one x), yawed to run along z. */
export const A6_PIPES = { x: 63.35, z: [54.75, 55.75, 56.75, 57.75, 58.75] as readonly number[] } as const;
/** The overhead crane: runway beams on the west and east walls (x centres, the beam's underside y) and the girder across at z. */
export const A6_CRANE = { runwayX: [40.55, 63.45] as readonly number[], y: 7.9, girderZ: 60.3, hoistX: 50.0 } as const;
/** The tagged-out fittings (circuit 69, no lamp): the sump high-bay and the two west gallery bulkheads (set doc 7). */
export const A6_DEAD_FITTINGS: readonly { x: number; y: number; z: number; sx: number; sy: number; sz: number }[] = [
  { x: 51.0, y: 8.55, z: 56.0, sx: 0.6, sy: 0.3, sz: 0.6 },
  { x: 42.5, y: 6.6, z: 71.4, sx: 0.3, sy: 0.2, sz: 0.15 },
  { x: 46.5, y: 6.6, z: 71.4, sx: 0.3, sy: 0.2, sz: 0.15 },
];
/** The north wall's recess in the kit panels round the gallery switch (x range): a steel riser column stands in it from 4.4 m to the roof. */
export const A6_SWITCH_COLUMN: [number, number] = [55.9, 56.9];
/** Own materials (concrete and block, machinery-blue motors, yellow guards, chequer plate, louvred steel, timber). */
const LOOK = {
  grout: '#3b3c39',
  plinth: '#55564f',
  cap: '#6f706a',
  iron: '#3d4145',
  yellow: '#c9a227',
  black: '#1d1f20',
  white: '#e5e5de',
  red: '#b5282d',
  wall: '#7d8588',
  dado: '#3b5445',
  frame: '#3b4147',
  steel: '#6a7077',
  steelDark: '#3a3f44',
  plate: '#585d61',
  seam: '#2f3336',
  rib: '#3d566b',
  cowl: '#2e3338',
  wood: '#6b5a43',
  drawer: '#4a3f30',
  stain: '#222527',
  louvre: '#6e757b',
  louvreDark: '#444a50',
  screen: '#27546e',
  amber: '#c98a1f',
  lampGreen: '#2f9e5a',
  tag: '#c0262b',
  conduit: '#7d8286',
} as const;
/** The 7-segment strokes of the numbers 1-3 stencilled on the pumps' plinths. */
const DIGITS = { 1: 'bc', 2: 'abged', 3: 'abgcd' } as const;

/** (J14) `opts.replan`: the re-planned yard, which closes the staff stair, sinks the drive pit, moves the gauge board and opens the
 *  bridge deck over the pit (`replan/a6PumpHouse.ts` builds them); its guards leave out the pieces it removes or rebuilds. */
export function buildA6PumpHouse(b: LevelBuilder, kit: FacilityKit, opts: { replan?: boolean } = {}): SetPart {
  const replan = opts.replan === true;
  const p = emptyPart('a6PumpHouse');
  /** A box from x0 to x1, z0 to z1, y0 to y1; `noLedge` unless told otherwise. */
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string, opts: { overhead?: boolean; noLedge?: boolean; visible?: boolean } = {}): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, true, opts.visible ?? true);
    b.mark(from, { noLedge: opts.noLedge ?? true, ...(opts.overhead ? { overhead: true } : {}) });
  };

  // ---- A6-1 / A6-11 / A6-12 / A6-14: the pumps, the sump kerb, the gauge board, the desk ----
  tally(b, p.register, 'A6-1', 'Pumps 1, 2, 3 at (60, 61), (56, 61), (46, 61): 2.4 m plinths 1.2 high (low cover) and 1.2 m motors to 4.0, every piece noLedge (pump 3 at x 46, A6-D3)', () => {
    const { plinth, plinthH, motor, top } = A6_PUMP;
    for (const [x, z] of A6_PUMPS) {
      slab(x - plinth / 2, x + plinth / 2, z - plinth / 2, z + plinth / 2, 0, plinthH, CONCRETE);
      slab(x - motor / 2, x + motor / 2, z - motor / 2, z + motor / 2, plinthH, top, PUMP);
    }
  });
  tally(b, p.register, 'A6-11', 'Sump bay x 48.2-57.8, z 54.25-58 plated over (metal, loud) behind a 1.2 m guard kerb along z 58 (x 49.4-56.6, 0.3 thick, noLedge) with 1.2 m openings at both ends', () => {
    const { x0, x1, z, t, h } = A6_KERB;
    slab(x0, x1, z - t / 2, z + t / 2, 0, h, CONCRETE);
    b.surface('metal', A6_SUMP[0], A6_SUMP[2], A6_SUMP[1], A6_SUMP[3], 0);
  });
  // (J14) on the re-plan the board moves to the outfall housing's north face (the housing covers its stand)
  if (!replan) {
    tally(b, p.register, 'A6-12', "Gauge board between pumps 1 and 2 (the duty pumps' common panel, the attendant's G stop): 1.2 x 0.2 x 1.5 on its stand, noLedge", () => {
      const { x, z, w, t, h } = A6_GAUGE;
      slab(x - w / 2, x + w / 2, z - t / 2, z + t / 2, 0, h, STEEL);
    });
  }
  tally(b, p.register, 'A6-14', "Attendant's desk x 60.6-62.4, z 65.6-66.4, 0.75 m (the log and the desk lamp); his post D north of it", () => {
    slab(A6_DESK[0], A6_DESK[2], A6_DESK[1], A6_DESK[3], 0, 0.75, DESK);
  });

  // ---- A6-2 / A6-3 / A6-9: the motor gallery (the co-op lip, the rope), its screens, the davit box, the staff stair ----
  const deck = coopDeck({ id: 'a6-gallery', at: { x: A6_DECK.x, z: A6_DECK.z }, facing: '+z', span: A6_DECK.span, depth: A6_DECK.depth, lip: A6_DECK.lip, open: A6_DECK.open, screen: 1.2, stair: 'end', stairW: 1.2, rope: A6_DECK.rope });
  // A6-D4: the east screen (x 45.3-56.0) split by hand to leave x 49.0-54.0 open for the bridge
  const screens: GreyBox[] = [];
  for (const s of deck.boxes.filter((x) => x.tag === 'edge screen')) {
    const x0 = s.c[0] - s.s[0] / 2;
    const x1 = s.c[0] + s.s[0] / 2;
    for (const [a, e] of A6_SCREENS) if (a >= x0 - 1e-6 && e <= x1 + 1e-6) screens.push({ ...s, c: [(a + e) / 2, s.c[1], s.c[2]], s: [e - a, s.s[1], s.s[2]] });
  }
  tally(b, p.register, 'A6-2', 'Motor gallery: a 4.4 m solid deck x 40.3-56.0, z 69.6-71.775 (noLedge, depth to the north wall, A6-D8), the open loading edge x 40.8-45.3 its one co-op lip (leg-up mark at 43.05, 69.1), 1.2 m edge screens on x 40.3-40.8, 45.3-49.0 and 54.0-56.0 (split for the bridge, A6-D4), chequer plate (metal, loud)', () => {
    applyGreybox(b, { ...deck, boxes: [...deck.boxes.filter((x) => x.tag === 'deck' || x.tag === 'mark legUp'), ...screens], stairs: [], doors: [] });
    b.surface('metal', 40.3, 56.0, A6_DECK.z, A6_SHELL.north, A6_DECK.lip);
  });
  tally(b, p.register, 'A6-3', "Davit box and rescue line: the box (0.6 m, noLedge) on the gallery's back wall at x 43.15, the rope's anchor plate and the holder's striped spot (43.15, 4.4, 70.2) on the open span (two-person rope, once, untimed)", () => {
    applyGreybox(b, { ...deck, boxes: deck.boxes.filter((x) => x.tag === 'mark rope' || x.tag === 'rope anchor plate'), stairs: [], ledges: [], doors: [] });
    const { x, z, s } = A6_DAVIT;
    slab(x - s / 2, x + s / 2, z - s / 2, z + s / 2, A6_DECK.lip, A6_DECK.lip + s, '#c9a227');
  });
  const flight = deck.stairs[0]!;
  const xFoot = flight.x + flight.len / 2;
  const xHead = flight.x - flight.len / 2;
  const zStairS = flight.z - flight.w / 2;
  /** The nosing line's height over x: the staff stair's ramp collider's top. */
  const lineAt = (x: number): number => (flight.rise * (xFoot - x)) / flight.len;
  // (J14, Q24) the re-plan closes the staff stair: no flight, no fillers (the gallery's east end gets a screen there)
  if (!replan) {
    tally(b, p.register, 'A6-9', "Staff stair: 27 risers of 0.163 m, x 56.0-63.7 along the north wall, rising west (foot by the desk, head at the gallery's east end); its underside closed by invisible noLedge fillers (0.5 m slices to just under the ramp's top: no walk-in space under the flight, S2-check should-fix 2)", () => {
      applyGreybox(b, { ...deck, boxes: [], ledges: [], doors: [] });
      for (let xa = xHead; xa < xFoot - 1e-9; xa += A6_STAIR_FILL.step) {
        const xb = Math.min(xa + A6_STAIR_FILL.step, xFoot);
        const hgt = lineAt(xb) - A6_STAIR_FILL.gap;
        if (hgt < 0.05) break;
        slab(xa, xb, zStairS, A6_SHELL.north, 0, hgt, STEEL, { visible: false });
      }
    });
  }
  p.lips.push(...deck.lips);

  // ---- A6-4 / A6-5 / A6-6 / A6-7 / A6-13: the bridge, the gland plate, the drive cage, the drive cabinet, the handrails ----
  const hang = hangPlate({ id: 'a6', at: { x: A6_HANG.x, z: A6_HANG.z }, facing: '-z', deck: A6_HANG.deck, slab: A6_HANG.slab, cage: A6_HANG.cage, overhang: A6_HANG.overhang, hole: A6_HANG.hole, hold: A6_HOLD });
  // A6-D5 / the door rule: the SPEC's flag and an `A6-` course door id
  for (const d of hang.doors) if (d.id === 'a6-cage') d.id = A6_CAGE_DOOR;
  const tagged = (...tags: string[]): GreyBox[] => hang.boxes.filter((x) => tags.includes(x.tag));
  tally(b, p.register, 'A6-4', "Bridge over the drive bay x 49-54, z 61.6-69.6, deck 4.4 (slab 4.0-4.4): the hangPlate slab round the plate (overhang 0.4, A6-D1) and a hand slab north of it to the gallery, noLedge and overhead (headroom 4.0 under it); chequer plate (metal, loud)", () => {
    // (J14) the re-plan cuts the drop opening into the slab round the plate (`replan/a6PumpHouse.ts` builds it)
    if (!replan) applyGreybox(b, { ...hang, boxes: tagged('bridge slab'), stairs: [], ledges: [], doors: [] });
    slab(A6_BRIDGE[0], A6_BRIDGE[2], A6_HANG.z + A6_HANG.cage[0] / 2 + A6_HANG.overhang, A6_BRIDGE[3], A6_HANG.deck - A6_HANG.slab, A6_HANG.deck, STEEL, { overhead: true });
    b.surface('metal', A6_BRIDGE[0], A6_BRIDGE[2], A6_BRIDGE[1], A6_BRIDGE[3], A6_HANG.deck);
  });
  tally(b, p.register, 'A6-5', "Cable gland plate 0.55 m at (51.5, 64.9) (under a body's width: nobody drops through), its striped frame, the lifted cover and the holder's striped spot (51.5, 4.4, 65.6) (paint, no collision)", () => {
    // (J14) the lifted cover lies over the re-plan's drop opening: the re-plan lays it west of the plate
    applyGreybox(b, { ...hang, boxes: replan ? tagged('plate frame', 'mark hold') : tagged('plate frame', 'plate cover', 'mark hold'), stairs: [], ledges: [], doors: [] });
  });
  tally(b, p.register, 'A6-6', "Drive cage 4.2 x 4.2 (x 49.4-53.6, z 62-66.2): solid walls to the slab's underside (louvred sheet-steel panels, A6-C2), noLedge; the locked 1.2 x 2.1 door A6-cage on its south face (egress: the exit release inside only)", () => {
    // (J14) the re-plan rebuilds the east wall round the outfall culvert's mouth
    const walls = tagged('cage wall', 'cage door head').filter((x) => !replan || Math.abs(x.c[0] - (A6_CAGE[2] - 0.05)) > 1e-6);
    const doors = applyGreybox(b, { ...hang, boxes: walls, stairs: [], ledges: [] });
    p.doors[A6_CAGE_DOOR] = doors[A6_CAGE_DOOR]!;
  });
  tally(b, p.register, 'A6-7', "Drive cabinet x 51.1-51.9, z 63.8-64.4, 1.6 m (noLedge): the drive panel sw-a6-panel facing the plate (hold 3 s, buzzer to 6 m, A6-D6) and the exit release sw-a6-exit on its back (A6-D2)", () => {
    applyGreybox(b, { ...hang, boxes: tagged('drive cabinet'), stairs: [], ledges: [], doors: [] });
  });
  tally(b, p.register, 'A6-13', 'Bridge handrails 1.1 m on both sides and the south end (kit.handrail: invisible noLedge collision, never a lip; accent on the gallery strip 61)', () => {
    const y = A6_HANG.deck;
    const { h, west, east, south } = A6_RAIL;
    kit.handrail(west, south, west, A6_BRIDGE[3], { y, h, group: 61 });
    kit.handrail(east, south, east, A6_BRIDGE[3], { y, h, group: 61 });
    kit.handrail(west, south, east, south, { y, h, group: 61 });
  });
  p.register.push({ id: 'A6-8', element: "Outfall door: the facility's L6 near door, locked by a flag gate on a6-drive (A6-C7); beside it the interlock station's lamp, red / green on a6-drive (device emissive, own supply, no collision)" });
  // the course devices and gates (the helper's, with the SPEC's flag, the door id and the buzzer)
  const panel = hang.devices[A6_PANEL]!;
  panel.label = 'Isolate drive';
  panel.holdNoise = A6_HOLD_NOISE;
  p.devices[A6_PANEL] = panel;
  p.devices[A6_EXIT] = hang.devices[A6_EXIT]!;
  p.bay.gates.push(
    { kind: 'pickup', id: A6_PANEL_GATE, switchId: A6_PANEL, flag: A6_DRIVE_FLAG, perPlayer: false } satisfies PickupGate,
    { kind: 'egress', id: A6_EXIT_GATE, switchId: A6_EXIT, doorIds: [A6_CAGE_DOOR] } satisfies EgressGate,
    { kind: 'flag', id: A6_OUTFALL_GATE, flag: A6_DRIVE_FLAG, doorId: A6_OUTFALL_DOOR } satisfies FlagGate,
  );

  // ---- A6-10: the lights (LIGHTING-PLAN 3, A6; the circuits are `MARLOW_CIRCUITS` 60-63, 69 dead) ----
  tally(b, p.register, 'A6-10', 'Lights: pump floor high-bays 60 (the east third), gallery strip 61 (bulkheads over the bridge junction and the stair), desk lamp 62, cage work light 63 (the drive panel\'s own circuit); the sump high-bay and the west gallery fittings (69) are tagged out: no lamp, the dark sump bay', () => {
    // one high-bay optic for the row (LR16-M): brighter over pumps 1-2 (the gauge board, the outfall approach), lower over the desk
    for (const [x, z, intensity] of [[61.0, 57.5, 2.8], [61.0, 63.0, 2.9], [61.0, 68.5, 1.2]] as const) {
      b.light({ kind: 'spot', x, y: 8.4, z, radius: 11, intensity, color: WHITE, cone: makeCone(0, -1, 0, 0.9), group: 60, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.3, sz: 0.6, oy: 0.15 } });
    }
    // the gallery strip: a pendant over the bridge (the holder's spot reads lit; S6 deviation) and two bulkheads on the north wall
    b.light({ x: A6_HANG.x, y: 7.0, z: 67.6, radius: 5, intensity: 0.28, color: WHITE, group: 61, electric: true, destructible: true, fixture: { sx: 0.3, sy: 0.2, sz: 0.3, oy: 0.1 } });
    for (const x of [53.5, 59.5]) {
      b.light({ x, y: 6.6, z: A6_SHELL.north - 0.35, radius: 6.5, intensity: 0.7, color: WHITE, group: 61, electric: true, destructible: true, fixture: { sx: 0.3, sy: 0.2, sz: 0.15, oy: 0 } });
    }
    b.light({ x: 61.5, y: 1.0, z: 66.0, radius: 2, intensity: 0.7, color: WARM, group: 62, electric: true, destructible: true, fixture: { sx: 0.2, sy: 0.15, sz: 0.2, oy: 0.07 } });
    b.light({ x: A6_HANG.x, y: 3.4, z: 62.9, radius: 3.0, intensity: 0.21, color: WHITE, group: 63, electric: true, destructible: true, fixture: { sx: 0.4, sy: 0.1, sz: 0.15, oy: 0.05 } });
  });
  for (const [k, g] of Object.entries(marlowCourseGroups())) if (k.startsWith('a6-')) p.groups[k] = g;
  // wall switches: the floor's by the outfall door, the gallery's at the stair head on the gallery (A6-C6), the desk lamp's on the desk
  p.switches.push({ id: 'a6-sw-floor', group: 60, pos: { x: A6_SHELL.east - 0.05, y: 1.2, z: 60.4 }, yaw: -Math.PI / 2 });
  p.switches.push({ id: 'a6-sw-gallery', group: 61, pos: { x: 56.4, y: A6_DECK.lip + 1.2, z: A6_SHELL.north - 0.05 }, yaw: Math.PI });
  p.switches.push({ id: 'a6-sw-desk', group: 62, pos: { x: 61.0, y: 0.85, z: 66.0 }, yaw: 0 });
  // the set at its standby fill; the gallery and bridge's upper level (SPEC 7)
  p.ambientZones.push({ id: 'A6', box: [40, 54, 64, 72], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 8.9 });
  p.ambientZones.push({ id: 'a6-gallery', box: [40.3, 61.6, 63.7, 71.775], ambient: MARLOW_LEVEL.standby, minY: 3.9, maxY: 8.9 });

  // ---- the attendant, the steps, the claim, the pass zone, the radio ----
  p.squads[A6_ATTENDANT] = { kind: 'grunt', x: 61.5, z: 67.1, yaw: Math.PI, route: A6_ATTENDANT_ROUTE, waits: A6_ATTENDANT_WAITS, faces: A6_ATTENDANT_FACES };
  p.bay.squad.push(A6_ATTENDANT);
  // the first player onto the motor gallery or the bridge takes B (the hanger); until then the lead (P2 in this even set) reads A
  p.bay.roles = [{ role: 'b', zone: { box: A6_GAL_ZONE, y0: 3.9 } }];
  p.passZones.push({ id: 'a6-p-gal', box: A6_GAL_ZONE, flag: A6_GAL_FLAG, floorY: A6_DECK.lip });
  p.externalFlags.push(A6_GAL_FLAG);
  const steps: CourseObjective[] = [
    {
      id: 'a6-up',
      bay: 'A6',
      text: 'Get both of you onto the motor gallery at the dark west end.',
      a: 'Boost your partner up, then climb the rescue line.',
      b: 'Drop the rescue line from the davit box for your partner.',
      done: { flag: A6_GAL_FLAG },
    },
    {
      id: 'a6-hang',
      bay: 'A6',
      text: 'Lower one of you through the gland plate to the drive panel.',
      a: 'Hold your partner over the drive cabinet. Watch the attendant.',
      b: 'Hold the isolate key on the drive panel while he is away.',
      done: { flag: A6_DRIVE_FLAG },
    },
    { id: 'a6-lock', bay: 'A6', text: 'The interlock is green. Out by the outfall door.' },
  ];
  p.objectives.push(...steps);
  p.bay.radio.push(
    { at: 'enter', text: 'The drive panel is inside the cage. The gland plate is your way in. Mind the attendant.' },
    { at: 'enter', text: 'The key buzzes while it is held. Lower him when the attendant is at his desk.' },
    { at: 'a6-hang', text: 'Pump is running down. Interlock is green.' },
  );

  // ---- spaces, nav, debug points, light and shot spots ----
  p.camSpaces.push({ box: [40, 54, 64, 72], size: 'open' }, { box: [40.3, 69.6, 56, 71.75], size: 'tight' }, { box: A6_CAGE, size: 'tight' });
  p.navSeeds.push({ x: 53, y: 0, z: 56 }, { x: 51, y: 0, z: 60 }, { x: 47, y: A6_DECK.lip, z: 70.6 }, { x: 51.5, y: A6_HANG.deck, z: 67.5 }, { x: 51.5, y: 0, z: 62.9 });
  p.debugPoints.push(
    { id: 'A6-entry', label: 'Set 6 entry (L5 door, the sump bay)', pos: { x: 53, y: 0, z: 55.5 }, yaw: 0 },
    { id: 'A6-vantage', label: 'Set 6 vantage (behind the sump kerb)', pos: { x: A6_VANTAGE.x, y: 0, z: A6_VANTAGE.z }, yaw: 0 },
    { id: 'A6-mid', label: 'Set 6 middle (the gauge board)', pos: { x: 58, y: 0, z: 63.6 }, yaw: Math.PI },
    { id: 'A6-mark', label: 'Set 6 gallery leg-up mark', pos: { x: A6_MARK.x, y: 0, z: A6_MARK.z }, yaw: 0 },
    { id: 'A6-holder', label: "Set 6 bridge, the holder's spot", pos: { x: A6_HOLDER.x, y: A6_HANG.deck, z: A6_HOLDER.z }, yaw: Math.PI },
    { id: 'A6-cage', label: 'Set 6 inside the drive cage', pos: { x: A6_HANG.x, y: 0, z: 62.9 }, yaw: 0 },
    { id: 'A6-exit', label: 'Set 6 outfall door (L6)', pos: { x: 62.6, y: 0, z: 62 }, yaw: Math.PI / 2 },
  );
  p.lightSpots.push(
    { name: 'A6 desk', kind: 'body', x: 62.5, y: 0, z: 69.5, band: 'pool' },
    { name: 'A6 gauge board', kind: 'body', x: 58, y: 0, z: 63.1, band: 'read' },
    { name: 'A6 outfall approach', kind: 'body', x: 63, y: 0, z: 62, band: 'read' },
    { name: 'A6 outfall cut', kind: 'body', x: 63, y: 0, z: 62, band: 'cut', off: [60] },
    { name: 'A6 gauge board cut', kind: 'body', x: 58, y: 0, z: 63.1, band: 'cut', off: [60] },
    { name: 'A6 vantage', kind: 'body', x: A6_VANTAGE.x, y: 0, z: A6_VANTAGE.z, band: 'pocket' },
    { name: 'A6 pump 3', kind: 'body', x: 48.2, y: 0, z: 61.0, band: 'pocket' },
    { name: 'A6 leg-up mark', kind: 'body', x: A6_MARK.x, y: 0, z: A6_MARK.z, band: 'pocket' },
    { name: 'A6 west floor', kind: 'body', x: 43, y: 0, z: 67.5, band: 'pocket' },
    { name: 'A6 rope spot', kind: 'body', x: A6_ROPE.x, y: A6_ROPE.y, z: A6_ROPE.z, band: 'pocket' },
    { name: 'A6 holder', kind: 'body', x: A6_HOLDER.x, y: A6_HANG.deck, z: A6_HOLDER.z, band: 'read' },
    { name: 'A6 holder cut', kind: 'body', x: A6_HOLDER.x, y: A6_HANG.deck, z: A6_HOLDER.z, band: 'cut', off: [61] },
    { name: 'A6 cage', kind: 'body', x: A6_HANG.x, y: 0, z: 63.2, band: 'pool' },
    { name: 'A6 floor standby', kind: 'body', x: 51, y: 0, z: 60, band: 'standby' },
    { name: 'A6 pump floor', kind: 'surf', x: 58, y: 0.05, z: 64, band: 'any' },
  );
  p.shotVantages.push(
    { name: 'a6-kerb', feet: [A6_VANTAGE.x, 0, A6_VANTAGE.z], cam: [50.2, 1.3, 55.6], target: [51.5, 3.2, 66] },
    { name: 'a6-holder', feet: [A6_HOLDER.x, A6_HANG.deck, A6_HOLDER.z], cam: [51.5, 6.4, 66.9], target: [51.5, 1.0, 64.4] },
    { name: 'a6-stair-head', feet: [56.0, A6_DECK.lip, 71.2], cam: [56.6, 6.5, 71.4], target: [52, 1.2, 60] },
  );

  // ---- dressing (slice 6 step 5; SPEC 6, PROPS.md 3 / 5, KIT.md): appended after the greybox, which it does not touch ----
  /** A visual-only skin [x0, x1] x [y0, y1] x [z0, z1]: no collision, `noLedge`, one side under `THIN` (out of the light shapes). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    if (Math.min(x1 - x0, y1 - y0, z1 - z0) >= THIN) throw new Error(`a6PumpHouse: the dressing skin at (${x0}, ${y0}, ${z0}) is not thin`);
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
  /** A number 1-3 in 7-segment strokes (0.2 k x 0.36 k m) on a face: `centre` along the face, `dir` the way the reader's right runs along it. */
  const digit = (n: 1 | 2 | 3, side: 'n' | 's' | 'e' | 'w', at: number, centre: number, y0: number, dir: 1 | -1, color: string, layer: number, k = 1): void => {
    const w = 0.2 * k;
    const h = 0.36 * k;
    const s = 0.045 * k;
    const seg: Record<string, readonly [number, number, number, number]> = {
      a: [0, w, h - s, h],
      b: [w - s, w, h / 2, h],
      c: [w - s, w, 0, h / 2],
      d: [0, w, 0, s],
      e: [0, s, 0, h / 2],
      f: [0, s, h / 2, h],
      g: [0, w, (h - s) / 2, (h + s) / 2],
    };
    for (const k2 of DIGITS[n]) {
      const [u0, u1, v0, v1] = seg[k2]!;
      const a = centre + dir * (u0 - w / 2);
      const e = centre + dir * (u1 - w / 2);
      face(side, at, Math.min(a, e), Math.max(a, e), y0 + v0, y0 + v1, color, layer);
    }
  };
  /** A hollow box of six thin plates (a fitting's housing): every plate is a skin. */
  const housing = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: string): void => {
    const t = 0.02;
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2] as const;
    skin(x0, x1, y0, y0 + t, z0, z1, color);
    skin(x0, x1, y1 - t, y1, z0, z1, color);
    skin(x0, x0 + t, y0, y1, z0, z1, color);
    skin(x1 - t, x1, y0, y1, z0, z1, color);
    skin(x0, x1, y0, y1, z0, z0 + t, color);
    skin(x0, x1, y0, y1, z1 - t, z1, color);
  };
  /** A board along the stair's slope (pitched like its collider), `lift` above the nosing line; thin in cross-section. */
  const slopeBoard = (z0: number, z1: number, lift: number, color: string): void => {
    const from = b.boxes.length;
    b.box(flight.x, flight.rise / 2 + lift, (z0 + z1) / 2, z1 - z0, 0.04, hyp2(flight.len, flight.rise), color, flight.yaw, -Math.atan2(flight.rise, flight.len), false);
    b.mark(from, { noLedge: true });
  };
  const north = A6_SHELL.north;
  const lip = A6_DECK.lip;
  /** The wall's base dressing (concrete plinth, green dado, painted block, a plate rail under the hall panels, frame posts on the 6 m grid) on `runs`. */
  const wallBase = (side: 'n' | 's' | 'e' | 'w', at: number, runs: readonly (readonly [number, number])[], posts: readonly number[], y1: number): void => {
    for (const [a, e] of runs) {
      face(side, at, a, e, 0, 0.5, LOOK.plinth);
      face(side, at, a, e, 0.5, 1.5, LOOK.dado);
      face(side, at, a, e, 1.5, 1.56, LOOK.white);
      face(side, at, a, e, 1.56, y1, LOOK.wall);
      face(side, at, a, e, y1 - 0.12, y1, LOOK.frame, 1);
      for (const q of posts) if (q - 0.15 >= a && q + 0.15 <= e) face(side, at, q - 0.15, q + 0.15, 0, y1, LOOK.frame, 1);
    }
  };

  // ---- A6-15: the pumps (the greybox's 2.4 m plinths and 1.2 m motor boxes stay; the skins give each its detail) ----
  tally(b, p.register, 'A6-15', 'Pump dressing (visual skins, no collision): grout course, cap band, sole plate, anchor bolts, yellow coupling guard with slots, flange ring, cooling ribs, fan cowl with vents and a cap, lifting eyes, terminal box and conduit, nameplate, a stencilled number 1 / 2 / 3 and a floor keep-clear line round each plinth', () => {
    const hp = A6_PUMP.plinth / 2;
    const hm = A6_PUMP.motor / 2;
    const ph = A6_PUMP.plinthH;
    const top = A6_PUMP.top;
    for (const [i, [px, pz]] of A6_PUMPS.entries()) {
      const n = (i + 1) as 1 | 2 | 3;
      for (const [side, at, c] of [['s', pz - hp, px], ['n', pz + hp, px], ['w', px - hp, pz], ['e', px + hp, pz]] as const) {
        face(side, at, c - hp, c + hp, 0, 0.14, LOOK.grout);
        face(side, at, c - hp, c + hp, ph - 0.12, ph, LOOK.cap);
      }
      // the number: a black board and white strokes on the plinth's south face (the face the entry vantage sees)
      face('s', pz - hp, px - 0.3, px + 0.3, 0.28, 1.0, LOOK.black, 0);
      digit(n, 's', pz - hp, px, 0.37, 1, LOOK.white, 1, 1.5);
      // the plinth top: a sole plate ring round the motor and eight anchor bolts
      skin(px - 0.75, px + 0.75, ph, ph + SKIN, pz - 0.75, pz - hm, LOOK.iron);
      skin(px - 0.75, px + 0.75, ph, ph + SKIN, pz + hm, pz + 0.75, LOOK.iron);
      skin(px - 0.75, px - hm, ph, ph + SKIN, pz - hm, pz + hm, LOOK.iron);
      skin(px + hm, px + 0.75, ph, ph + SKIN, pz - hm, pz + hm, LOOK.iron);
      for (const [dx, dz] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95], [-0.95, 0], [0.95, 0], [0, -0.95], [0, 0.95]] as const) skin(px + dx - 0.05, px + dx + 0.05, ph, ph + SKIN, pz + dz - 0.05, pz + dz + 0.05, LOOK.steel);
      // the motor: guard, flange ring, ribs, fan cowl
      for (const [side, at, c] of [['s', pz - hm, px], ['n', pz + hm, px], ['w', px - hm, pz], ['e', px + hm, pz]] as const) {
        face(side, at, c - hm, c + hm, ph, 1.9, LOOK.yellow);
        for (const o of [-0.3, 0, 0.3]) face(side, at, c + o - 0.03, c + o + 0.03, 1.35, 1.75, LOOK.black, 1);
        face(side, at, c - hm, c + hm, 1.9, 1.96, LOOK.steelDark, 1);
        for (const y of [2.25, 2.7, 3.15]) face(side, at, c - 0.55, c + 0.55, y, y + 0.05, LOOK.rib, 1);
        face(side, at, c - hm, c + hm, 3.72, top, LOOK.cowl);
        for (const o of [-0.35, -0.12, 0.12, 0.35]) face(side, at, c + o - 0.04, c + o + 0.04, 3.78, 3.94, LOOK.black, 1);
      }
      skin(px - 0.55, px + 0.55, top, top + SKIN, pz - 0.55, pz + 0.55, LOOK.cowl);
      for (const dx of [-0.35, 0.35]) skin(px + dx - 0.05, px + dx + 0.05, top + SKIN, top + 0.2, pz - 0.02, pz + 0.02, LOOK.yellow);
      // the terminal box (north face) with its cover and the conduit that drops to the plinth; the nameplate on the south face
      face('n', pz + hm, px - 0.2, px + 0.2, 2.85, 3.3, LOOK.steelDark, 1);
      face('n', pz + hm, px - 0.17, px + 0.17, 2.9, 3.25, LOOK.steel, 2);
      face('n', pz + hm, px + 0.12, px + 0.16, ph, 2.85, LOOK.conduit, 2);
      face('s', pz - hm, px - 0.2, px + 0.2, 2.0, 2.2, LOOK.white, 2);
      face('s', pz - hm, px - 0.16, px + 0.16, 2.08, 2.12, LOOK.black, 3);
      // the floor keep-clear line (0.25 m off the plinth, 0.1 m wide)
      const o = hp + 0.25;
      paint(px - o - 0.1, px + o + 0.1, pz - o - 0.1, pz - o, LOOK.yellow);
      paint(px - o - 0.1, px + o + 0.1, pz + o, pz + o + 0.1, LOOK.yellow);
      paint(px - o - 0.1, px - o, pz - o, pz + o, LOOK.yellow);
      paint(px + o, px + o + 0.1, pz - o, pz + o, LOOK.yellow);
    }
    // oil stains on the pump floor (clear of the keep-clear lines)
    for (const [x0, x1, z0, z1] of [[52.2, 53.3, 60.2, 60.8], [57.9, 58.7, 60.4, 61.1], [47.9, 49.1, 62.6, 63.2], [60.0, 61.2, 63.4, 64.0], [43.0, 44.1, 63.8, 64.5], [55.0, 55.9, 63.6, 64.2]] as const) paint(x0, x1, z0, z1, LOOK.stain, 0.006);
  });

  // ---- A6-16: the sump bay (plate sheet, hatches), the guard kerb (hazard stripes, caps) and the tagged-out fittings ----
  tally(b, p.register, 'A6-16', 'Sump bay and kerb dressing (visual skins, no collision): plate sheet with seams and two yellow-framed hatches, the kerb\'s yellow cap, hazard stripes, end posts and a notice board; the tagged-out fittings (circuit 69: no lamp) as dark housings on rods and arms with red lock-off tags', () => {
    const [sx0, sz0, sx1, sz1] = A6_SUMP;
    skin(sx0, sx1, 0, 0.008, sz0, sz1, LOOK.plate);
    for (let x = sx0 + 1.2; x < sx1 - 0.1; x += 1.2) skin(x - 0.01, x + 0.01, 0.008, 0.012, sz0, sz1, LOOK.seam);
    skin(sx0, sx1, 0.008, 0.012, 55.99, 56.01, LOOK.seam);
    for (const hx of [50.6, 55.4]) {
      skin(hx - 0.5, hx + 0.5, 0.008, 0.016, 54.7, 54.76, LOOK.yellow);
      skin(hx - 0.5, hx + 0.5, 0.008, 0.016, 55.64, 55.7, LOOK.yellow);
      skin(hx - 0.5, hx - 0.44, 0.008, 0.016, 54.76, 55.64, LOOK.yellow);
      skin(hx + 0.44, hx + 0.5, 0.008, 0.016, 54.76, 55.64, LOOK.yellow);
      skin(hx - 0.2, hx + 0.2, 0.008, 0.02, 55.17, 55.23, LOOK.steelDark);
    }
    const { x0, x1, z, t, h } = A6_KERB;
    skin(x0, x1, h, h + SKIN, z - t / 2, z + t / 2, LOOK.yellow);
    face('s', z - t / 2, x0, x1, h - 0.3, h, LOOK.yellow);
    for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.6) face('s', z - t / 2, x, x + 0.3, h - 0.3, h, LOOK.black, 1);
    face('n', z + t / 2, x0, x1, h - 0.3, h, LOOK.yellow);
    face('w', x0, z - t / 2, z + t / 2, 0, h, LOOK.yellow);
    face('e', x1, z - t / 2, z + t / 2, 0, h, LOOK.yellow);
    face('s', z - t / 2, 52.2, 53.8, 0.4, 0.8, LOOK.white, 1);
    face('s', z - t / 2, 52.3, 53.7, 0.68, 0.76, LOOK.red, 2);
    face('s', z - t / 2, 52.35, 53.65, 0.48, 0.56, LOOK.black, 2);
    // the tagged-out fittings: a housing, a hanging rod or a wall arm, a red tag on a wire ((J14) on the re-plan they are circuit 69's
    // live lamps, whose fixtures, rods and arms `replan/a6PumpHouse.ts` draws)
    for (const f of replan ? [] : A6_DEAD_FITTINGS) {
      housing(f.x, f.y, f.z, f.sx, f.sy, f.sz, LOOK.steelDark);
      if (f.z > 60) skin(f.x - 0.02, f.x + 0.02, f.y - 0.02, f.y + 0.02, f.z + f.sz / 2, north - PANEL_OUT, LOOK.steelDark);
      else skin(f.x - 0.02, f.x + 0.02, f.y + f.sy / 2, HALL_H, f.z - 0.02, f.z + 0.02, LOOK.steel);
      skin(f.x - 0.005, f.x + 0.005, f.y - f.sy / 2 - 0.3, f.y - f.sy / 2, f.z - 0.005, f.z + 0.005, LOOK.black);
      skin(f.x - 0.05, f.x + 0.05, f.y - f.sy / 2 - 0.46, f.y - f.sy / 2 - 0.3, f.z - 0.01, f.z + 0.01, LOOK.tag);
    }
    // the live fittings hang on rods and arms too (their lamps and fixtures are the greybox's): the three high-bays and the pendant on rods to the roof, the two bulkheads on arms to the panels
    for (const [lx, lz] of [[61.0, 57.5], [61.0, 63.0], [61.0, 68.5]] as const) skin(lx - 0.02, lx + 0.02, 8.7, HALL_H, lz - 0.02, lz + 0.02, LOOK.steel);
    skin(A6_HANG.x - 0.02, A6_HANG.x + 0.02, 7.2, HALL_H, 67.6 - 0.02, 67.6 + 0.02, LOOK.steel);
    for (const lx of [53.5, 59.5]) skin(lx - 0.02, lx + 0.02, 6.58, 6.62, north - 0.35 + 0.075, north - PANEL_OUT, LOOK.steelDark);
  });

  // ---- A6-17: the gauge board, the desk, the three switches' boxes ----
  tally(b, p.register, 'A6-17', "Gauge board and desk dressing (visual skins, no collision): the board's panel, three gauges with needles, a lamp row, title and lock-off tag, rear cover and cap; the desk's timber top, logbook, phone, lamp stand, drawers and kick board; the switches' boxes (floor, gallery riser, desk)", () => {
    const { x: gx, z: gz, w, t, h } = A6_GAUGE;
    const gn = gz + t / 2;
    // (J14) on the re-plan the board is on the outfall housing (`replan/a6PumpHouse.ts` dresses it there)
    if (!replan) {
      face('n', gn, gx - w / 2, gx + w / 2, 0, 0.1, LOOK.black);
      face('n', gn, gx - w / 2 + 0.05, gx + w / 2 - 0.05, 0.55, 1.45, LOOK.steelDark);
      for (const x of [gx - 0.28, gx, gx + 0.28]) {
        face('n', gn, x - 0.11, x + 0.11, 1.0, 1.22, LOOK.white, 1);
        face('n', gn, x - 0.01, x + 0.01, 1.04, 1.18, LOOK.black, 2);
      }
      face('n', gn, gx - 0.4, gx + 0.4, 1.3, 1.4, LOOK.white, 1);
      for (const [x, color] of [[gx - 0.28, LOOK.lampGreen], [gx, LOOK.lampGreen], [gx + 0.28, LOOK.red]] as const) face('n', gn, x - 0.03, x + 0.03, 0.7, 0.76, color, 1);
      face('n', gn, gx + 0.45, gx + 0.55, 0.78, 0.92, LOOK.tag, 1);
      face('s', gz - t / 2, gx - w / 2 + 0.05, gx + w / 2 - 0.05, 0.3, 1.2, LOOK.steelDark);
      skin(gx - w / 2, gx + w / 2, h, h + SKIN, gz - t / 2, gn, LOOK.steel);
    }
    const [dx0, dz0, dx1, dz1] = A6_DESK;
    skin(dx0, dx1, 0.75, 0.78, dz0, dz1, LOOK.wood);
    skin(61.85, 62.25, 0.78, 0.8, 65.7, 66.05, LOOK.white);
    skin(62.04, 62.06, 0.8, 0.81, 65.7, 66.05, LOOK.black);
    skin(60.7, 60.9, 0.78, 0.81, 65.7, 65.9, LOOK.black);
    skin(61.4, 61.6, 0.78, 0.8, 65.9, 66.1, LOOK.steelDark);
    skin(61.485, 61.515, 0.8, 0.97, 65.985, 66.015, LOOK.steelDark);
    face('n', dz1, dx0, dx1, 0, 0.1, LOOK.black);
    for (const [a, e] of [[60.65, 61.2], [61.25, 61.8], [61.85, 62.35]] as const) {
      face('n', dz1, a, e, 0.15, 0.65, LOOK.drawer);
      face('n', dz1, (a + e) / 2 - 0.1, (a + e) / 2 + 0.1, 0.45, 0.5, LOOK.steel, 1);
    }
    // the switches' boxes: the floor switch on the east wall by the door, the desk switch on a stand on the desk (the gallery's is on the riser column, below)
    face('w', A6_SHELL.east, 60.3, 60.5, 1.1, 1.35, LOOK.steel);
    face('w', A6_SHELL.east, 60.38, 60.42, 1.35, 4.2, LOOK.conduit);
    skin(60.94, 61.06, 0.78, 0.81, 65.93, 66.02, LOOK.steelDark);
    skin(60.94, 61.06, 0.78, 0.9, 65.93, 65.97, LOOK.steel);
  });

  // ---- A6-18: the motor gallery (plate, edge screens, the drop chain, the davit box) ----
  tally(b, p.register, 'A6-18', "Gallery dressing (visual skins, no collision): chequer-plate sheet with seams and a yellow band along the open loading edge, screen caps and yellow bands, a fall-hazard board by the edge, the drop chain (P13) across the open edge on eye plates, the davit box's red body, lid, label, latches and hinges", () => {
    skin(40.3, 56.0, lip, lip + 0.005, A6_DECK.z, A6_SHELL.north, LOOK.plate);
    // the plate's 1.2 m seams (a seam that crosses the rope holder's mark, x 42.65-43.65, z 69.7-70.7, stops short of it)
    for (let x = 40.3 + 1.2; x < 56.0 - 0.1; x += 1.2) {
      const crosses = x + 0.01 > A6_ROPE.x - 0.5 && x - 0.01 < A6_ROPE.x + 0.5;
      for (const [z0, z1] of crosses ? ([[A6_DECK.z, 69.7], [70.7, A6_SHELL.north]] as const) : ([[A6_DECK.z, A6_SHELL.north]] as const)) skin(x - 0.01, x + 0.01, lip + 0.005, lip + 0.009, z0, z1, LOOK.seam);
    }
    skin(A6_LIP_X[0], A6_LIP_X[1], lip + 0.005, lip + 0.012, A6_DECK.z, A6_DECK.z + 0.1, LOOK.yellow);
    for (const [a, e] of A6_SCREENS) {
      skin(a, e, lip + 1.2, lip + 1.2 + SKIN, A6_DECK.z, A6_DECK.z + 0.1, LOOK.steelDark);
      face('s', A6_DECK.z, a, e, 4.95, 5.05, LOOK.yellow);
      face('n', A6_DECK.z + 0.1, a, e, 4.95, 5.05, LOOK.yellow);
    }
    face('n', A6_DECK.z + 0.1, 45.4, 46.5, 4.65, 5.2, LOOK.white, 1);
    face('n', A6_DECK.z + 0.1, 45.5, 46.4, 4.95, 5.05, LOOK.red, 2);
    // the drop chain: eye plates on the screens' ends and twenty-four links hanging in a swag between them
    for (const [side, at] of [['e', A6_LIP_X[0]], ['w', A6_LIP_X[1]]] as const) face(side, at, A6_DECK.z, A6_DECK.z + 0.1, 5.3, 5.4, LOOK.steelDark);
    const links = 24;
    const span = A6_LIP_X[1] - A6_LIP_X[0] - 0.2;
    for (let i = 0; i < links; i++) {
      const x = A6_LIP_X[0] + 0.1 + (span * (i + 0.5)) / links;
      const sag = 0.2 * (1 - ((x - (A6_LIP_X[0] + A6_LIP_X[1]) / 2) / 2) ** 2);
      const y = lip + 0.95 - sag;
      skin(x - 0.07, x + 0.07, y, y + 0.04, A6_DECK.z + 0.03, A6_DECK.z + 0.07, LOOK.conduit);
    }
    // the davit box (the greybox's 0.6 m cube at x 42.85-43.45, z 70.9-71.5): red body, white lid, label with a cross, latches, hinges
    const { x: bx, z: bz, s: bs } = A6_DAVIT;
    const [bx0, bx1, bz0, bz1] = [bx - bs / 2, bx + bs / 2, bz - bs / 2, bz + bs / 2];
    for (const [side, at, a0, a1] of [['s', bz0, bx0, bx1], ['n', bz1, bx0, bx1], ['w', bx0, bz0, bz1], ['e', bx1, bz0, bz1]] as const) face(side, at, a0, a1, lip, lip + bs, LOOK.red);
    skin(bx0, bx1, lip + bs, lip + bs + SKIN, bz0, bz1, LOOK.white);
    face('s', bz0, bx0, bx1, lip + 0.38, lip + 0.4, LOOK.black, 1);
    face('s', bz0, bx - 0.15, bx + 0.15, lip + 0.15, lip + 0.3, LOOK.white, 1);
    face('s', bz0, bx - 0.08, bx + 0.08, lip + 0.2, lip + 0.23, LOOK.red, 2);
    face('s', bz0, bx - 0.015, bx + 0.015, lip + 0.17, lip + 0.28, LOOK.red, 2);
    for (const o of [-0.2, 0.2]) {
      face('s', bz0, bx + o - 0.03, bx + o + 0.03, lip + 0.36, lip + 0.44, LOOK.steelDark, 1);
      face('n', bz1, bx + o - 0.03, bx + o + 0.03, lip + 0.36, lip + 0.44, LOOK.steelDark, 1);
    }
  });

  // ---- A6-19: the staff stair (nosings, wall rail, the open side's collision rail: S567-check polish 2) ----
  // (J14, Q24) no staff stair on the re-plan: no nosings, slope rails or the open side's rail
  if (!replan) {
    tally(b, p.register, 'A6-19', "Staff stair dressing: yellow nosings on the 27 treads, a wall rail with brackets and a skirting board along the slope (visual skins), the wall above it, and the open side's 1.1 m rail (kit.handrail, invisible noLedge collision in twelve stepped segments 0.05 m outside the flight, from the third tread to the head; the foot stays open to step on; accent on the gallery strip 61)", () => {
      const sd = flight.len / flight.steps;
      const sh = flight.rise / flight.steps;
      for (let i = 0; i < flight.steps; i++) {
        const x1 = xFoot - sd * i;
        skin(x1 - 0.06, x1, sh * (i + 1), sh * (i + 1) + 0.012, zStairS, north, LOOK.yellow);
      }
      // the wall above the flight (below the hall panels): block, a dado and a plate rail, stepped with the slope in 0.5 m runs
      for (let x = 63.5; x > A6_STAIR_RAIL.to + 1e-6; x -= 0.5) {
        const xa = Math.max(x - 0.5, 56.9);
        if (x - xa < 0.1) break;
        face('s', north, xa, x, lineAt(xa) + 0.2, lip, LOOK.wall);
      }
      for (const x of [63.4, 61.9, 60.4, 58.9, 57.4]) face('s', north, x - 0.02, x + 0.02, lineAt(x) + 0.82, lineAt(x) + 0.9, LOOK.steelDark, 1);
      slopeBoard(north - 0.06, north - SKIN, 0.9, LOOK.steel);
      slopeBoard(zStairS + 0.0, zStairS + 0.04, 0.0, LOOK.steelDark);
      // the open side: the kit's balustrade and its collision box per segment, `h` over the walking line at the high end
      const { z, from, to, seg, h } = A6_STAIR_RAIL;
      const n = Math.round((from - to) / seg);
      for (let k = 0; k < n; k++) {
        const xa = from - k * seg;
        const xb = xa - seg;
        kit.handrail(xa, z, xb, z, { y: lineAt(xa), h: h + (lineAt(xb) - lineAt(xa)), group: A6_G_GALLERY });
      }
    });
  }

  // ---- A6-20: the bridge and the drive cage (plate, soffit ribs, the lifting-point sign; louvred panels, kick band, posts, the door's surround) ----
  tally(b, p.register, 'A6-20', "Bridge and cage dressing (visual skins, no collision): chequer-plate sheet round the gland plate, soffit ribs under the hand slab, the yellow lifting-point sign with its hook on the south fascia; the cage's louvred sheet-steel panels (A6-C2) with a 1.2 m kick band, posts and top rail outside, kick band and rails inside, the door's posts and authorised-only sign, the work light's conduit", () => {
    const [bx0, bz0, bx1, bz1] = A6_BRIDGE;
    const frame = { x0: 51.125, x1: 51.875, z0: 64.525, z1: 65.275 };
    // (J14) the re-plan's plate and seams leave its drop opening clear (`replan/a6PumpHouse.ts` lays them)
    if (!replan) {
      skin(bx0, bx1, A6_HANG.deck, A6_HANG.deck + 0.005, bz0, frame.z0, LOOK.plate);
      skin(bx0, bx1, A6_HANG.deck, A6_HANG.deck + 0.005, frame.z1, bz1, LOOK.plate);
      skin(bx0, frame.x0, A6_HANG.deck, A6_HANG.deck + 0.005, frame.z0, frame.z1, LOOK.plate);
      // east of the plate's frame: round the lifted cover (the greybox's, x 51.975-52.525, z 64.625-65.175, on the deck)
      skin(frame.x1, 51.975, A6_HANG.deck, A6_HANG.deck + 0.005, frame.z0, frame.z1, LOOK.plate);
      skin(51.975, 52.525, A6_HANG.deck, A6_HANG.deck + 0.005, frame.z0, 64.625, LOOK.plate);
      skin(51.975, 52.525, A6_HANG.deck, A6_HANG.deck + 0.005, 65.175, frame.z1, LOOK.plate);
      skin(52.525, bx1, A6_HANG.deck, A6_HANG.deck + 0.005, frame.z0, frame.z1, LOOK.plate);
      // (a seam that would cross the holder's striped spot, x 51-52, z 65.1-66.1, starts beyond it)
      for (let x = bx0 + 1.0; x < bx1 - 0.1; x += 1.0) {
        skin(x - 0.01, x + 0.01, A6_HANG.deck + 0.005, A6_HANG.deck + 0.009, bz0, frame.z0, LOOK.seam);
        skin(x - 0.01, x + 0.01, A6_HANG.deck + 0.005, A6_HANG.deck + 0.009, x + 0.01 > A6_HOLDER.x - 0.5 && x - 0.01 < A6_HOLDER.x + 0.5 ? A6_HOLDER.z + 0.5 : frame.z1, bz1, LOOK.seam);
      }
    }
    for (const z of [66.9, 67.5, 68.1, 68.7, 69.3]) skin(bx0, bx1, A6_HANG.deck - A6_HANG.slab - 0.04, A6_HANG.deck - A6_HANG.slab, z - 0.05, z + 0.05, LOOK.frame);
    // the lifting-point sign on the south fascia (the slab's face, z 61.6): a yellow plate with a black hook ring and stem
    face('s', bz0, 50.9, 52.1, 4.04, 4.36, LOOK.yellow);
    face('s', bz0, 51.48, 51.52, 4.06, 4.2, LOOK.black, 1);
    for (const [a, e, y0, y1] of [[51.42, 51.58, 4.33, 4.35], [51.42, 51.58, 4.19, 4.21], [51.42, 51.44, 4.19, 4.35], [51.56, 51.58, 4.19, 4.35]] as const) face('s', bz0, a, e, y0, y1, LOOK.black, 1);
    face('s', bz0, 50.95, 51.3, 4.1, 4.14, LOOK.black, 1);
    face('s', bz0, 51.7, 52.05, 4.1, 4.14, LOOK.black, 1);
    // the cage: outside faces (the south face is split by the door), inside faces
    const [cx0, cz0, cx1, cz1] = A6_CAGE;
    const under = A6_HANG.deck - A6_HANG.slab;
    const door: [number, number] = [50.9, 52.1];
    const outer = [['w', cx0, cz0, cz1], ['e', cx1, cz0, cz1], ['n', cz1, cx0, cx1]] as const;
    const panels = (side: 'n' | 's' | 'e' | 'w', at: number, runs: readonly (readonly [number, number])[], layer: number): void => {
      for (const [a, e] of runs) {
        face(side, at, a, e, 0, 1.2, LOOK.steelDark, layer);
        face(side, at, a, e, 1.14, 1.2, LOOK.yellow, layer + 1);
        for (let y = 1.4; y < under - 0.2; y += 0.25) face(side, at, a + 0.05, e - 0.05, y, y + 0.07, LOOK.louvre, layer + 1);
        face(side, at, a, e, under - 0.12, under, LOOK.frame, layer + 1);
      }
    };
    for (const [side, at, a, e] of outer) {
      // (J14) the re-plan dresses the east face round the outfall culvert's mouth
      if (replan && side === 'e') continue;
      panels(side, at, [[a, e]], 0);
      for (let q = a + 1.4; q < e - 0.2; q += 1.4) face(side, at, q - 0.05, q + 0.05, 0, under, LOOK.frame, 2);
    }
    // the south face: two runs under the door's head, the head above the opening
    panels('s', cz0, [[cx0, door[0]], [door[1], cx1]], 0);
    for (const q of [50.4, 52.6]) face('s', cz0, q - 0.05, q + 0.05, 0, under, LOOK.frame, 2);
    face('s', cz0, door[0], door[1], 2.1, under, LOOK.steelDark, 0);
    face('s', cz0, door[0], door[1], under - 0.12, under, LOOK.frame, 1);
    face('s', cz0, door[0] - 0.05, door[0], 0, 2.1, LOOK.yellow, 1);
    face('s', cz0, door[1], door[1] + 0.05, 0, 2.1, LOOK.yellow, 1);
    face('s', cz0, 50.95, 52.05, 2.2, 2.62, LOOK.white, 1);
    face('s', cz0, 51.0, 52.0, 2.5, 2.57, LOOK.red, 2);
    face('s', cz0, 51.0, 52.0, 2.3, 2.38, LOOK.black, 2);
    // (J14) inside: on the re-plan the floor is the pit's (-1.6), whose kick band and rails `replan/a6PumpHouse.ts` draws
    if (!replan) {
      for (const [side, at, a, e] of [['e', cx0 + 0.1, cz0 + 0.1, cz1 - 0.1], ['w', cx1 - 0.1, cz0 + 0.1, cz1 - 0.1], ['s', cz1 - 0.1, cx0 + 0.1, cx1 - 0.1]] as const) {
        face(side, at, a, e, 0, 1.2, LOOK.steelDark);
        for (const y of [1.2, 2.4, 3.6]) face(side, at, a, e, y, y + 0.06, LOOK.frame, 1);
      }
      face('n', cz0 + 0.1, cx0 + 0.1, door[0], 0, 1.2, LOOK.steelDark);
      face('n', cz0 + 0.1, door[1], cx1 - 0.1, 0, 1.2, LOOK.steelDark);
    }
    // the work light's conduit from the slab (the lamp is the greybox's, 51.5, 3.4, 62.9)
    skin(51.48, 51.52, 3.5, under, 62.88, 62.92, LOOK.conduit);
  });

  // ---- A6-21: the drive cabinet's faces (the greybox's 0.8 x 0.6 x 1.6 body; the panel and the exit release are the devices') ----
  tally(b, p.register, 'A6-21', "Drive cabinet dressing (visual skins, no collision): two doors with vents and handles, an HMI screen and three status lamps, kick plate and cap on the front; vent grilles on both sides, a back cover and a release label on the back; the centre of both faces left clear for the devices", () => {
    const [cx0, cx1, cz0, cz1, ch] = [51.1, 51.9, 63.8, 64.4, 1.6];
    face('n', cz1, cx0, cx1, 0, 0.1, LOOK.black);
    for (const [a, e] of [[cx0 + 0.02, 51.38], [51.62, cx1 - 0.02]] as const) {
      face('n', cz1, a, e, 0.12, ch - 0.02, LOOK.steel);
      for (const y of [0.2, 0.28, 0.36, 0.44]) face('n', cz1, a + 0.03, e - 0.03, y, y + 0.04, LOOK.black, 1);
    }
    face('n', cz1, 51.33, 51.36, 0.8, 1.1, LOOK.steelDark, 1);
    face('n', cz1, 51.64, 51.67, 0.8, 1.1, LOOK.steelDark, 1);
    face('n', cz1, 51.16, 51.34, 1.2, 1.45, LOOK.black, 1);
    face('n', cz1, 51.18, 51.32, 1.23, 1.42, LOOK.screen, 2);
    for (const [x, color] of [[51.7, LOOK.lampGreen], [51.77, LOOK.amber], [51.84, LOOK.red]] as const) face('n', cz1, x - 0.025, x + 0.025, 1.45, 1.5, color, 1);
    skin(cx0, cx1, ch, ch + SKIN, cz0, cz1, LOOK.steelDark);
    for (const [side, at] of [['w', cx0], ['e', cx1]] as const) {
      face(side, at, 63.85, 64.35, 0.1, 1.5, LOOK.steel);
      for (const y of [0.9, 1.0, 1.1, 1.2, 1.3]) face(side, at, 63.95, 64.25, y, y + 0.05, LOOK.black, 1);
    }
    for (const [a, e] of [[cx0 + 0.02, 51.38], [51.62, cx1 - 0.02]] as const) face('s', cz0, a, e, 0.12, ch - 0.02, LOOK.steel);
    face('s', cz0, 51.35, 51.65, 1.35, 1.5, LOOK.red, 1);
    face('s', cz0, 51.4, 51.6, 1.4, 1.45, LOOK.white, 2);
  });

  // ---- A6-22: the walls' base dressing (the set's own materials under the hall's panels), the tide gauge, the interlock's housing ----
  tally(b, p.register, 'A6-22', "Wall dressing (visual skins, no collision): concrete plinth, green dado, painted block, a plate rail and frame posts on the 6 m grid on the south wall (the L5 door and its plate left clear), the west wall and the east wall (the L6 door, the floor switch and the interlock lamp's housing left clear); a tide gauge board with 0.5 m marks and a flood line on the west wall; the interlock's housing, label and the outfall sign", () => {
    wallBase('n', A6_SHELL.south, wallRuns(A6_SHELL.west, A6_SHELL.east, [[52.0, 54.0]]), [46, 58], 4.5);
    wallBase('e', A6_SHELL.west, [[A6_SHELL.south, 69.55]], [60, 66], 4.4);
    wallBase('w', A6_SHELL.east, wallRuns(A6_SHELL.south, 70.5, [[60.2, 60.6], [61.0, 63.0], [63.7, 64.3]]), [60, 66], 4.4);
    // the tide gauge on the west wall: a white staff with a mark every 0.5 m and the flood line
    face('e', A6_SHELL.west, 56.0, 56.2, 0.3, 4.2, LOOK.white, 1);
    for (let y = 0.5; y <= 4.0 + 1e-9; y += 0.5) face('e', A6_SHELL.west, 56.0, 56.2, y, y + 0.04, LOOK.black, 2);
    face('e', A6_SHELL.west, 55.8, 56.6, 3.2, 3.26, LOOK.red, 2);
    // the outfall door's side of the east wall: the interlock lamp's housing and label (behind the interlock station's
    // cabinet, A6-25, which carries the lit lamp), the outfall sign over the door
    face('w', A6_SHELL.east, 63.8, 64.2, 2.1, 2.5, LOOK.steelDark);
    face('w', A6_SHELL.east, 63.85, 64.15, 1.85, 2.0, LOOK.white);
    face('w', A6_SHELL.east, 61.3, 62.7, 2.95, 3.35, LOOK.white);
    face('w', A6_SHELL.east, 61.4, 62.6, 3.2, 3.28, LOOK.red, 1);
    face('w', A6_SHELL.east, 61.4, 62.6, 3.05, 3.1, LOOK.black, 1);
  });

  // ---- A6-23: the overhead crane (runway beams on the walls, the girder across, a hoist with its chain and hook) ----
  tally(b, p.register, 'A6-23', 'Overhead crane (visual skins, no collision): two runway beams along the west and east walls at 7.9 m with brackets, the girder across at z 60.3 (clear of every lamp), a hoist trolley on it with its chain, hook block and hook', () => {
    const [z0, z1] = [A6_SHELL.south + 0.1, north - 0.1];
    const beam = (x: number): void => {
      skin(x - 0.015, x + 0.015, A6_CRANE.y, A6_CRANE.y + 0.3, z0, z1, LOOK.frame);
      for (const y of [A6_CRANE.y, A6_CRANE.y + 0.28]) skin(x - 0.1, x + 0.1, y, y + 0.02, z0, z1, LOOK.frame);
    };
    for (const x of A6_CRANE.runwayX) beam(x);
    for (const q of [58.0, 64.0, 70.0]) {
      skin(A6_SHELL.west + PANEL_OUT, A6_CRANE.runwayX[0]! - 0.1, 7.86, 7.9, q - 0.02, q + 0.02, LOOK.steelDark);
      skin(A6_CRANE.runwayX[1]! + 0.1, A6_SHELL.east - PANEL_OUT, 7.86, 7.9, q - 0.02, q + 0.02, LOOK.steelDark);
    }
    const gy = A6_CRANE.y + 0.32;
    const gz = A6_CRANE.girderZ;
    skin(A6_CRANE.runwayX[0]!, A6_CRANE.runwayX[1]!, gy, gy + 0.5, gz - 0.015, gz + 0.015, LOOK.rib);
    for (const y of [gy, gy + 0.48]) skin(A6_CRANE.runwayX[0]!, A6_CRANE.runwayX[1]!, y, y + 0.02, gz - 0.2, gz + 0.2, LOOK.rib);
    housing(A6_CRANE.hoistX, gy - 0.3, gz, 1.0, 0.5, 0.6, LOOK.yellow);
    skin(A6_CRANE.hoistX - 0.01, A6_CRANE.hoistX + 0.01, 6.4, gy - 0.55, gz - 0.01, gz + 0.01, LOOK.steelDark);
    skin(A6_CRANE.hoistX - 0.1, A6_CRANE.hoistX + 0.1, 6.15, 6.4, gz - 0.02, gz + 0.02, LOOK.red);
    skin(A6_CRANE.hoistX - 0.01, A6_CRANE.hoistX + 0.01, 5.95, 6.15, gz - 0.01, gz + 0.01, LOOK.steel);
  });

  // ---- A6-24: the hall's panels over the set walls (kit, accent coves each on its circuit: no lamp) and the north wall's switch riser ----
  tally(b, p.register, 'A6-24', "Kit panels above the set (visual): the hall's charcoal panels and coves from 7.5 m (over the glazing) to the roof on the south wall (pump floor 60) and from 4.4 m on the east wall (60), the west wall (69: tagged out, dark) and the north wall (gallery 61, split by a steel riser column round the gallery switch)", () => {
    const corner = 0.09;
    const rise = HALL_H - lip;
    const zRun = A6_SHELL.north - A6_SHELL.south - 2 * corner;
    const zMid = (A6_SHELL.south + A6_SHELL.north) / 2;
    kit.wallPanel((A6_SHELL.west + A6_SHELL.east) / 2, A6_SHELL.south, A6_SHELL.east - A6_SHELL.west - 2 * corner, 0, { h: HALL_H - GAL_TOP, y: GAL_TOP, tone: 'warm', group: A6_G_FLOOR });
    kit.wallPanel(A6_SHELL.east, zMid, zRun, -Math.PI / 2, { h: rise, y: lip, tone: 'warm', group: A6_G_FLOOR });
    kit.wallPanel(A6_SHELL.west, zMid, zRun, Math.PI / 2, { h: rise, y: lip, tone: 'warm', group: A6_G_TAGGED });
    for (const [a, e] of wallRuns(A6_SHELL.west + corner, A6_SHELL.east - corner, [A6_SWITCH_COLUMN])) kit.wallPanel((a + e) / 2, north, e - a, Math.PI, { h: rise, y: lip, tone: 'warm', group: A6_G_GALLERY });
    // the riser column the gallery switch is mounted on (a recess in the panels: its face is 0.03 m behind theirs) and its conduit down to the deck
    face('s', north, A6_SWITCH_COLUMN[0], A6_SWITCH_COLUMN[1], lip, HALL_H, LOOK.steelDark);
    face('s', north, 56.38, 56.42, lip, 5.4, LOOK.conduit, 1);
  });

  // ---- A6-25: the props kit (PROPS.md 3 A6): the discharge main, five pipeRun modules along the east wall, and the interlock station. Collision is the props' own boxes via `write` ----
  const props = new FacilityProps();
  for (const z of A6_PIPES.z) props.add('pipeRun', A6_PIPES.x, z, Math.PI / 2);
  tally(b, p.register, 'A6-25', "Props kit: the discharge main to the outfall, five pipeRun modules end to end along the east wall (x 63.0-63.7, z 54.25-59.25, 0.7 m tall; a solid 0.4 m pipe and a see-through flange envelope each, boxes via FacilityProps.write, noLedge); the interlock station beside the L6 door (a pushStation hung on the east wall at z 64.0, y 1.41-2.41, no collision; its lamp red until a6-drive is set, green after: device emissive on the device's own supply, P3-1)", () => {
    const from = b.boxes.length;
    props.write(b);
    b.mark(from, { noLedge: true });
  });
  // (marlow-polish P3-1) the interlock lamp, after `write` (the pushStation has no box either way): its lamp's centre at about
  // (63.44, 2.30, 64.0), in the east wall base's gap z 63.7-64.3, over the housing and label skins (A6-22)
  props.add('pushStation', A6_SHELL.east, 64.0, -Math.PI / 2, { y: 1.41, device: A6_INTERLOCK, flag: A6_DRIVE_FLAG, lamp: PROP_LAMP_TINT.default, lampOff: [1.0, 0.12, 0.08] });
  p.props.push(...props.placements);

  return p;
}
