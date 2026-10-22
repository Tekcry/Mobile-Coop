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
 * own circuit); the sump high-bay and the gallery's west fittings are tagged out (no lamp). Dressing is a later step.
 */
import type { CourseObjective, EgressGate, FlagGate, PickupGate } from '../../../game/course/courseDef';
import type { FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { marlowCourseGroups } from '../../lighting/marlowCircuits';
import { applyGreybox, coopDeck, hangPlate, type GreyBox } from '../ctcourseGreybox';
import { emptyPart, setExitDoor, tally, type SetPart } from './types';

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

export function buildA6PumpHouse(b: LevelBuilder, kit: FacilityKit): SetPart {
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
  tally(b, p.register, 'A6-12', "Gauge board between pumps 1 and 2 (the duty pumps' common panel, the attendant's G stop): 1.2 x 0.2 x 1.5 on its stand, noLedge", () => {
    const { x, z, w, t, h } = A6_GAUGE;
    slab(x - w / 2, x + w / 2, z - t / 2, z + t / 2, 0, h, STEEL);
  });
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
  tally(b, p.register, 'A6-9', "Staff stair: 27 risers of 0.163 m, x 56.0-63.7 along the north wall, rising west (foot by the desk, head at the gallery's east end); its underside closed by invisible noLedge fillers (0.5 m slices to just under the ramp's top: no walk-in space under the flight, S2-check should-fix 2)", () => {
    applyGreybox(b, { ...deck, boxes: [], ledges: [], doors: [] });
    for (let xa = xHead; xa < xFoot - 1e-9; xa += A6_STAIR_FILL.step) {
      const xb = Math.min(xa + A6_STAIR_FILL.step, xFoot);
      const hgt = lineAt(xb) - A6_STAIR_FILL.gap;
      if (hgt < 0.05) break;
      slab(xa, xb, zStairS, A6_SHELL.north, 0, hgt, STEEL, { visible: false });
    }
  });
  p.lips.push(...deck.lips);

  // ---- A6-4 / A6-5 / A6-6 / A6-7 / A6-13: the bridge, the gland plate, the drive cage, the drive cabinet, the handrails ----
  const hang = hangPlate({ id: 'a6', at: { x: A6_HANG.x, z: A6_HANG.z }, facing: '-z', deck: A6_HANG.deck, slab: A6_HANG.slab, cage: A6_HANG.cage, overhang: A6_HANG.overhang, hole: A6_HANG.hole, hold: A6_HOLD });
  // A6-D5 / the door rule: the SPEC's flag and an `A6-` course door id
  for (const d of hang.doors) if (d.id === 'a6-cage') d.id = A6_CAGE_DOOR;
  const tagged = (...tags: string[]): GreyBox[] => hang.boxes.filter((x) => tags.includes(x.tag));
  tally(b, p.register, 'A6-4', "Bridge over the drive bay x 49-54, z 61.6-69.6, deck 4.4 (slab 4.0-4.4): the hangPlate slab round the plate (overhang 0.4, A6-D1) and a hand slab north of it to the gallery, noLedge and overhead (headroom 4.0 under it); chequer plate (metal, loud)", () => {
    applyGreybox(b, { ...hang, boxes: tagged('bridge slab'), stairs: [], ledges: [], doors: [] });
    slab(A6_BRIDGE[0], A6_BRIDGE[2], A6_HANG.z + A6_HANG.cage[0] / 2 + A6_HANG.overhang, A6_BRIDGE[3], A6_HANG.deck - A6_HANG.slab, A6_HANG.deck, STEEL, { overhead: true });
    b.surface('metal', A6_BRIDGE[0], A6_BRIDGE[2], A6_BRIDGE[1], A6_BRIDGE[3], A6_HANG.deck);
  });
  tally(b, p.register, 'A6-5', "Cable gland plate 0.55 m at (51.5, 64.9) (under a body's width: nobody drops through), its striped frame, the lifted cover and the holder's striped spot (51.5, 4.4, 65.6) (paint, no collision)", () => {
    applyGreybox(b, { ...hang, boxes: tagged('plate frame', 'plate cover', 'mark hold'), stairs: [], ledges: [], doors: [] });
  });
  tally(b, p.register, 'A6-6', "Drive cage 4.2 x 4.2 (x 49.4-53.6, z 62-66.2): solid walls to the slab's underside (louvred sheet-steel panels, A6-C2), noLedge; the locked 1.2 x 2.1 door A6-cage on its south face (egress: the exit release inside only)", () => {
    const doors = applyGreybox(b, { ...hang, boxes: tagged('cage wall', 'cage door head'), stairs: [], ledges: [] });
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
  p.register.push({ id: 'A6-8', element: "Outfall door: the facility's L6 near door, locked by a flag gate on a6-drive (A6-C7); the red / green interlock lamp beside it is a device emissive (dressing)" });
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
    for (const [x, z] of [[61.0, 57.5], [61.0, 63.0], [61.0, 68.5]] as const) {
      b.light({ x, y: 8.4, z, radius: 11, intensity: 1.1, color: WHITE, group: 60, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.3, sz: 0.6, oy: 0.15 } });
    }
    // the gallery strip: a pendant over the bridge (the holder's spot reads lit; S6 deviation) and two bulkheads on the north wall
    b.light({ x: A6_HANG.x, y: 7.0, z: 67.6, radius: 5, intensity: 0.9, color: WHITE, group: 61, electric: true, destructible: true, fixture: { sx: 0.3, sy: 0.2, sz: 0.3, oy: 0.1 } });
    for (const x of [53.5, 59.5]) {
      b.light({ x, y: 6.6, z: A6_SHELL.north - 0.35, radius: 6.5, intensity: 0.9, color: WHITE, group: 61, electric: true, destructible: true, fixture: { sx: 0.3, sy: 0.2, sz: 0.15, oy: 0 } });
    }
    b.light({ x: 61.5, y: 1.0, z: 66.0, radius: 2, intensity: 0.6, color: WARM, group: 62, electric: true, destructible: true, fixture: { sx: 0.2, sy: 0.15, sz: 0.2, oy: 0.07 } });
    b.light({ x: A6_HANG.x, y: 3.4, z: 62.9, radius: 3.0, intensity: 1.3, color: WHITE, group: 63, electric: true, destructible: true, fixture: { sx: 0.4, sy: 0.1, sz: 0.15, oy: 0.05 } });
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
  return p;
}
