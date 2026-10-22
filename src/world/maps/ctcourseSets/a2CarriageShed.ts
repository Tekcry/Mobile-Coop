/**
 * A2 the Carriage Shed (SPEC section 9 "A2 - Set 2, the Carriage Shed"; set doc `docs/marlow-final/sets/a2CarriageShed.md`;
 * PLAN slice 2, steps 2-4: greybox, lights, guard / objective steps / e2e). A night freight siding: three roads, two short
 * rakes of box vans, the shunting neck between them under four high-bays, the shunter's cabin and the carriage-cleaning
 * staging. It teaches timed light isolation (N2) and the lure that comes with it; the staging is the co-op leg-up.
 *
 * Ground, set box x 28-70, z 0-20, open to the 10 m hall roof (the walls on the box edges are `facility.ts`'s):
 * - roads 1, 2, 3 at z 5 / 10 / 15 with 2 m ballast strips (`gravel`, loud) and two rakes of one 10 m van per road (x 36-46 and
 *   56-66, 2.6 x 3.4 m, all `noLedge`, 2.4 m gaps: no split gap), 0.3 m wheel stops at the road ends;
 * - the neck x 46-56: 10 m open crossing under four high-bays on the isolator circuit 21;
 * - the shunter's cabin x 28-32, z 1-5 (every piece `noLedge`): a thick plant wall on the south side back to the shell (no
 *   gap behind it), the isolator cabinet 1 against it, the north door and the back door, a desk, the coat corner (dark pocket);
 * - the cleaning staging x 30-62, z 17.5-20 (`coopDeck`: a 4.4 m deck, the open loading edge x 31-35 is the co-op lip, 1.2 m
 *   screens on the rest of the edge, the east stair down at x 62-69.7), and the isolator cabinet 2 on the east wall.
 * Every other block 1.9 m or taller is `noLedge`: the only way onto the staging from the shed floor is a leg-up or a relay.
 * Nothing here stands within 4.7 m of the loading edge that a player alone could climb. Prototype starting values (G10).
 *
 * Lights (LIGHTING-PLAN 3, A2): shed general 20 (six strips over the rakes, short of the neck), neck 21 (four high-bays on
 * two isolators: 15 s dark, 3 s re-arm, N2), cabin 22 (one panel; the coat corner stays dark), staging 23 (four strips).
 */
import type { CourseDevice, IsolatorGate } from '../../../game/course/courseDef';
import { KIT_BOX_COLOR, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { circuitOf, marlowCourseGroups } from '../../lighting/marlowCircuits';
import { applyGreybox, coopDeck } from '../ctcourseGreybox';
import { emptyPart, tally, type SetPart } from './types';

/** The shunter's squad slot id and his patrol loop (set doc section 2). */
export const A2_SHUNTER = 'a2-shunter';
/** A walker pauses at a route point for its `waits` entry; a wait of 0 never advances (`PatrolWalker.step`), so the two
 *  pass-through points pause this long (s). */
export const A2_PASS_WAIT = 0.1;
export const A2_SHUNTER_ROUTE: [number, number][] = [[51, 10], [56, 7.5], [66, 7.5], [56, 7.5]];
export const A2_SHUNTER_WAITS = [4, A2_PASS_WAIT, 3, A2_PASS_WAIT];
/** At his post he looks west down road 2; at the east end he faces the east wall, his back to the neck (NaN: keep facing). */
export const A2_SHUNTER_FACES = [-Math.PI / 2, Number.NaN, Math.PI / 2, Number.NaN];

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

export function buildA2CarriageShed(b: LevelBuilder, _kit: FacilityKit): SetPart {
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
  tally(b, p.register, 'A2-10', 'Wheel stops 0.3 m at each road end (x 32.6-33.4 and 68.6-69.4, 1.6 m wide): low, so no solo jump top (A2-D2)', () => {
    for (const c of A2_ROADS) for (const [x0, x1] of [[32.6, 33.4], [68.6, 69.4]] as const) slab(x0, x1, c - 0.8, c + 0.8, 0, 0.3, STEEL);
  });
  p.register.push({ id: 'A2-11', element: 'North walkways z 16.3-17.5 behind road 3\'s vans and along the staging face (open floor, no pieces)' });

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
      b.light({ x, y: 6.8, z, radius: 11, intensity: 1.0, color: WHITE, group: 21, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.3, sz: 0.6, oy: 0.15 } });
    }
  });
  tally(b, p.register, 'A2-9', 'Shed general 20 (six strips under the tie, short of the neck, switch by the west door), cabin panel 22 (switch by the cabin door), staging strips 23 (switch at the stair head)', () => {
    for (const [x, z] of [[34, 11], [41, 7.5], [41, 12.5], [61, 7.5], [61, 12.5], [68, 11]] as const) strip(x, 6.5, z, 20, 7.5, 1.1);
    b.light({ x: 30.6, y: 2.45, z: 2.5, radius: 3.2, intensity: 0.6, color: WHITE, group: 22, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.05, sz: 0.6, oy: 0.025 } });
    for (const x of [36, 44, 52, 60]) strip(x, 7, 19, 23, 5, 0.8);
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
  p.bay.squad.push(A2_SHUNTER);
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
    { name: 'A2 neck crossing', kind: 'body', x: 51, y: 0, z: 16.9, band: 'pool' },
    { name: 'A2 neck centre cut', kind: 'body', x: 51, y: 0, z: 10, band: 'cut', off: [21] },
    { name: 'A2 neck crossing cut', kind: 'body', x: 51, y: 0, z: 16.9, band: 'cut', off: [21] },
    { name: 'A2 neck crossing west cut', kind: 'body', x: 46.5, y: 0, z: 16.9, band: 'cut', off: [21] },
    { name: 'A2 neck crossing east cut', kind: 'body', x: 55.5, y: 0, z: 16.9, band: 'cut', off: [21] },
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
  return p;
}
