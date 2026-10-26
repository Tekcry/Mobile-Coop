/**
 * A5 the Substation (SPEC section 9 "A5 - Set 5, the Substation"; set doc `docs/marlow-final/sets/a5Substation.md`, section 13
 * over SPEC; PLAN slice 5, steps 2-4: greybox, lights, guard / objective steps / e2e). An urban grid substation built indoors
 * as a switchgear hall: it teaches the partner throw with a far-side release and combines the held jammer on a light.
 *
 * Ground, set box x 40-70, z 24-48, open to the 10 m hall roof (the walls on the box edges are `facility.ts`'s):
 * - the apron x 58.15-70 inside L4's far door, with tonight's cable drums (one 1.8 m stack at x 62.1-64.3, z 29.4-33.0:
 *   `BEAM_KEEP_CLEAR` 4.0 m off the beam line, A5-D1);
 * - the inner security wall at x 58 (`throwGateway`: 6 m to the set's top, `noLedge`, the 6 m cable gateway z 33-39 under a
 *   4.8 m header, three IR beams `laser-a5` at 0.35 / 0.9 / 1.45 switched off for good by the far-side release);
 * - the inner zone: pen 1 (bund x 42-48, z 24.3-29.3 against the south wall, A5-D4) and pen 2 (bund x 50-56, z 40.5-45.5,
 *   A5-D5), each a 1.2 m bund round a 3.5 m `noLedge` transformer unit; the switchroom x 40.25-46, z 36-46 (6 x 10, two doors,
 *   4.0 m, every piece `noLedge`, A5-C2, A5-D2) with the switchgear run on its west wall; the zone control kiosk at (47, 33)
 *   (the release `sw-a5-release`); the cable trench's chequer-plate lids along the north wall (loud).
 * Every block 1.9 m or taller is `noLedge`; no lip in the co-op band. No player alone jumps or climbs past the beams (no
 * solo-standable top within `BEAM_KEEP_CLEAR` on the apron): the throw takes two. Prototype starting values (G10).
 *
 * Lights (LIGHTING-PLAN 3, A5; `MARLOW_CIRCUITS` 50-53): apron 50 (three bulkheads, switch by the L4 door), inner zone 51 (three
 * bulkheads and the switchroom panel, switch inside the switchroom's front door: the lure), the kiosk flood 52 (a sodium cone
 * on the switchroom's south face, photocell: jam or shoot only), the kiosk panel light 53 (emergency supply). Nine lamps.
 *
 * Dressing (slice 5 step 5, SPEC 6, M5: an indoor grid substation mock-up inside the luxury hall, so it keeps its own materials -
 * painted blockwork, precast security panels, transformer grey-green, brown porcelain, timber drums, chequer plate, gravel - and only
 * the hall above the set takes the kit's charcoal panels):
 * - the greybox's boxes, lamps, doors and devices are untouched, bar one deliberate edit (S567-check polish 3): the switchgear run
 *   ends at z 44.6 so the back door's open leaf clears it, and an invisible `noLedge` filler keeps the old footprint's collision;
 *   the dressing is appended after the greybox;
 * - everything built by hand is a thin visual skin (no collision, `noLedge`, one side under `CANON_MIN_THICK` so it is out of the
 *   canonical light shapes: the bake, the meter and the guards see the greybox as built): the hall walls' plinth, blockwork and
 *   pilasters, the lamps' brackets, the inner security wall's precast panels, hazard header and parked gate, the drum stack's
 *   flanges and lagging, the transformers' radiators, bushings and conservators, the bunds' copings, the switchroom's rendering,
 *   roof, louvres, door trims, signs, interior lining, switchgear fronts and rubber mat, the kiosk's keypad and hood, the trench
 *   lids and the floor paint;
 * - the only new collision is the invisible filler above. The two beam towers are visual props (their poles' collision boxes are
 *   not written: the greybox's posts and beam line are the gateway, and a 0.26 m tower's skin 3 cm off a post's end face made the
 *   voxel fit read air where the art is solid). No greybox box is covered by a prop: the 13 props are the two towers and the
 *   cable trays hung over the trench;
 * - kit panels with accent coves, every one on its circuit's group: the hall's west wall above 4.4 m and the south, north and
 *   east walls over the gallery glazing (inner zone 51 west of the security wall, apron 50 east of it). No lamp is added.
 */
import { hyp2 } from '../../../core/mathx';
import type { CourseDevice, FlagGate } from '../../../game/course/courseDef';
import type { LaserPanelDef } from '../../../game/laserPanels';
import { KIT_BOX_COLOR, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { makeCone } from '../../lights';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { marlowCourseGroups } from '../../lighting/marlowCircuits';
import { FacilityProps } from '../../props/facilityProps';
import { applyGreybox, throwGateway, type ThrowGatewayOpts } from '../ctcourseGreybox';
import { GAL_TOP, wallRuns } from './facility';
import { emptyPart, HALL_H, holdDoorId, tally, type SetPart } from './types';

/** The patrol's squad slot id and his loop (set doc section 2): K the kiosk, R2 the gap mouth behind pen 1, W north of the
 *  kiosk, R4 the gateway's north tower. */
export const A5_PATROL = 'a5-patrol';
/** A walker pauses at a route point for its `waits` entry; a wait of 0 never advances (`PatrolWalker.step`, S2), so the
 *  pass-through point W pauses this long (s). */
export const A5_PASS_WAIT = 0.1;
export const A5_PATROL_ROUTE: [number, number][] = [[47.9, 33.4], [41.3, 31.0], [47.0, 34.6], [56.5, 37.6]];
export const A5_PATROL_WAITS = [4, 3, A5_PASS_WAIT, 3];
/** At K he reads the kiosk log (west), at R2 the sump gauge (south), at R4 he looks east through the gateway (NaN: keep facing). */
export const A5_PATROL_FACES = [-Math.PI / 2, Math.PI, Number.NaN, Math.PI / 2];

/** The throw gateway (set doc 1.3): the helper's call, kept whole so the tests rebuild the same piece. */
export const A5_GATEWAY: ThrowGatewayOpts = {
  id: 'a5',
  at: { x: 58, z: 36 },
  facing: '-x',
  gap: 6,
  span: 24,
  wallH: 6,
  header: 4.8,
  thick: 0.3,
  beams: [0.35, 0.9, 1.45],
  stand: 1.2,
  release: { u: 11, v: -3 },
};
/** The helper's ids: the beams, the release switch (the kiosk), its pickup gate and flag (A5-D7), and the L5 door's flag gate. */
export const A5_LASER = 'laser-a5';
export const A5_RELEASE = 'sw-a5-release';
export const A5_RELEASE_GATE = 'g-a5-release';
export const A5_RELEASE_FLAG = 'a5-release';
export const A5_L5_GATE = 'g-a5-l5';
/** The beams' power panel (high on the switchroom's south face, facing the gateway: electro shows it, the jammer reaches it). */
export const A5_PANEL: LaserPanelDef = { id: 'panel-a5', lasers: [A5_LASER], x: 43.0, y: 3.2, z: 35.85, yaw: Math.PI, label: 'Gateway beams' };
/** The marked spots (the helper's): the thrower's mark, the runner's start, the landing, the kiosk's press spot. */
export const A5_THROW = { x: 59.2, z: 36 } as const;
export const A5_RUNNER = { x: 60.2, z: 36 } as const;
export const A5_LANDING = { x: 56, z: 36 } as const;
export const A5_PRESS = { x: 47.6, z: 33.0 } as const;
/** Where A stands to jam the flood and the panel through the gateway (feet; the tests trace the jammer's line from an eye
 *  cloud round 1.6 m over them). The doc's panel spot (60.5, 36.5) grazes the switchroom's east end: 1.5 m south of it. */
export const A5_FLOOD_JAM = { x: 60, z: 36 } as const;
export const A5_PANEL_JAM = { x: 60.5, z: 35.0 } as const;
/** Where both wait on the apron out of the patrol's sight while he walks his loop (behind the inner wall's south run; the
 *  second player 1 m north of it). */
export const A5_HIDE = { x: 59.0, z: 25.4 } as const;

/** One player in the inner zone ticks the throw step (the first one through, by the throw or the panel jam); the zone is
 *  also the B claim (the thrown player takes B). */
export const A5_IN1_FLAG = 'a5-in1';
export const A5_INNER_ZONE: [number, number, number, number] = [40.3, 24.3, 57.8, 47.7];

/** The inner wall's faces (x), the cable drums, the kiosk body, the pens (bund and unit plan boxes), the switchroom. */
export const A5_WALL = { x: 58, near: 58.15, far: 57.85 } as const;
export const A5_DRUMS = { x0: 62.1, x1: 64.3, z0: 29.4, z1: 33.0, h: 1.8 } as const;
/** The kiosk faces +x: the `zoneKiosk` footprint (0.8 wide, 0.5 deep) turned a quarter, so its face (x 47.25) stands 0.35 m
 *  from the press spot (the doc's x 46.6-47.4 box would leave a body 0.2 m there). */
export const A5_KIOSK = { x0: 46.75, x1: 47.25, z0: 32.6, z1: 33.4, h: 1.5 } as const;
export const A5_PENS = [
  { bund: [42, 24.3, 48, 29.3], unit: [43.2, 25.4, 46.8, 28.2] },
  { bund: [50, 40.5, 56, 45.5], unit: [51.2, 41.6, 54.8, 44.4] },
] as const;
export const A5_BUND = { h: 1.2, t: 0.25 } as const;
export const A5_UNIT_H = 3.5;
/** The switchroom (A5-C2): the facility's west wall face, the 0.3 m walls' centre lines (east x 46, south z 36, north z 46),
 *  the walls to 3.9 and the roof slab to 4.0 (`noLedge`: 4.0 is in the co-op band, A5-D2). */
export const A5_ROOM = { x0: 40.25, x1: 46, z0: 36, z1: 46, t: 0.3, wallH: 3.9, roofT: 0.1 } as const;
/** The front door on the east face (z 41.0-42.2) and the back door on the north face (x 41.0-42.2), 1.2 x 2.1. */
export const A5_FRONT_DOOR = 'A5-front';
export const A5_BACK_DOOR = 'A5-back';
const DOOR_F = { z0: 41.0, z1: 42.2, h: 2.1 } as const;
const DOOR_B = { x0: 41.0, x1: 42.2, h: 2.1 } as const;
/** The switchgear run against the west wall (inside), 2.3 m. It ends at z 44.6 (S567-check polish 3): the back door's leaf, swung open,
 *  lies along x 41.0 down to z 44.8, so a run to z 45 was clipped by it. The old footprint (to z 45.0) keeps its collision as an invisible
 *  filler (the dressing's A5-22): where a body can stand is unchanged. */
export const A5_GEAR = { x0: 40.3, x1: 41.1, z0: 37, z1: 44.6, h: 2.3, fill: 45 } as const;
const GEAR = A5_GEAR;
/** The cable trench's lids (flush, `metal`): along the north wall behind pen 2. */
export const A5_TRENCH: [number, number, number, number] = [46.15, 46.6, 57.85, 47.75];

/** The kiosk flood (group 52): a cone on a bracket 0.25 m off the switchroom's south face, aimed at the strip. Its reach stops short of
 *  the landing (the A5 sheet: "the flood's cone and radius stop short"; LR16-M: radius 6.9, the registry's reach 11.0 m, the landing mark
 *  11.9 m out and closer to the axis than the kiosk, so only the reach separates them), brighter to light the strip at that reach. */
export const A5_FLOOD = { x: 44.5, y: 4.2, z: 35.6, aim: [51.5, 0, 34] as const, outer: 0.55, radius: 6.9, intensity: 3.0 } as const;
/** The kiosk's panel light (group 53): a hooded gooseneck task light in front of its keypad (LR16-M), its cone aimed down and back at the
 *  keypad on the kiosk's east face (`aim` is the cone's direction); the operator stands behind the hood, outside the cone, so a body
 *  beside it stays under the cut band. */
export const A5_KIOSK_LAMP = { x: 47.5, y: 1.45, z: 33.0, aim: [-0.3, -0.35, 0] as const, outer: 0.5, radius: 1.2, intensity: 0.1 } as const;

const SODIUM: [number, number, number] = [1.0, 0.72, 0.36];
const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
const CONCRETE = '#6b6a63';
const TRANSFORMER = '#5f6b5c';
const DRUM = '#4a3a2a';
const STEEL = '#5c6268';

// ---- dressing (slice 5 step 5) ----
/** The circuits the kit's accent coves follow: the apron (50) east of the security wall, the inner zone (51) west of it. */
const G_APRON = 50;
const G_INNER = 51;
/** A dressing skin's thickness (m) and the thinnest side a skin may have: under `CANON_MIN_THICK` (0.05, `voxel/lightShapes.ts`) the
 *  canonical light shapes leave it out, so dressing never moves the bake, the meter or what a guard sees. */
const SKIN = 0.03;
const THIN = 0.05;
/** The hall's wall faces round the set (`facility.ts`: the walls on the box edges are 0.5 m thick) and how far a run stops short of a corner. */
export const A5_SHELL = { west: 40.25, east: 69.75, south: 24.25, north: 47.75 } as const;
const CORNER = 0.09;
/** The wall dressing's top (just under the gallery floor's underside, 4.2 m, and the glazing's sill, 4.5 m). */
const WALL_TOP = 4.4;
/** The two beam towers (props kit, visual only): at the gateway's posts, facing each other across the opening. Each stands 0.07 m
 *  off its post's end face (z 33 / 39): the tower's 0.26 m skin must stay clear of the 3 cm probe the voxel fit makes off that
 *  end face (`voxelFit.test.ts`: the cover face there is air outside it). */
export const A5_TOWERS = [
  { x: 58, z: 33.2, yaw: 0 },
  { x: 58, z: 38.8, yaw: Math.PI },
] as const;
/** The cable-tray run over the trench (hung props, 1 m modules, bottom edge at `y`, centre line `z` on the north wall's face). */
export const A5_TRAY = { x0: 46.5, x1: 57.5, z: 47.55, y: 3.0 } as const;
/** The greybox bulkheads hang 0.1 m off their wall: each wall face (the side it faces, its plane) and the fixture's centre along it. */
export const A5_BULKHEADS = [
  { side: 'w', at: 69.75, c: 29.5 },
  { side: 'w', at: 69.75, c: 38.5 },
  { side: 's', at: 47.75, c: 64.0 },
  { side: 'w', at: 57.85, c: 27.0 },
  { side: 'n', at: 24.25, c: 51.0 },
  { side: 'e', at: 46.15, c: 44.5 },
] as const;
/** The drum stack's four drums (axis along x, two end to end, two side by side): flange discs show on the stack's two end faces. */
export const A5_DRUM_ROWS = [30.3, 32.1] as const;
/** The cable laid in from the drums through the gateway to the landing's pocket (floor level, 4 cm): the delivery in progress. */
export const A5_CABLE: readonly (readonly [number, number])[] = [[62.1, 32.1], [61.0, 32.1], [60.0, 34.2], [58.6, 34.2], [56.2, 34.4], [54.2, 35.4]];
/** The kiosk's operator mat and the keep-clear outline in front of it (x 47.3 east of the face, z about the press spot). */
export const A5_MAT = { x0: 47.3, x1: 48.1, z0: 32.5, z1: 33.5 } as const;
/** The floor seams' plan runs [x0, z0, x1, z1] (6 m grid, each stopping at a bund or the switchroom). */
const JOINTS: readonly (readonly [number, number, number, number])[] = [
  [64, 24.25, 64, 47.75],
  [58.15, 30, 69.75, 30],
  [58.15, 36, 69.75, 36],
  [58.15, 42, 69.75, 42],
  [52, 24.25, 52, 40.45],
  [46, 29.35, 46, 35.8],
  [40.25, 30, 57.85, 30],
  [46.2, 36, 57.85, 36],
  [46.2, 42, 49.95, 42],
  [56.05, 42, 57.85, 42],
];
/** Own materials (painted blockwork on a concrete plinth, precast security panels, transformer paint, porcelain, timber drums, chequer plate). */
const LOOK = {
  plinth: '#4a4943',
  paint: '#8d8f88',
  course: '#767972',
  pilaster: '#7b7e78',
  trim: '#55595c',
  copper: '#a8693a',
  steel: '#6a7077',
  steelDark: '#3a3f44',
  galv: '#8e9499',
  pipe: '#7d8286',
  yellow: '#c9a227',
  red: '#b5282d',
  white: '#e5e5de',
  black: '#1d1f20',
  precast: '#82857f',
  joint: '#5f625d',
  bitumen: '#1e1f20',
  coping: '#9a9a92',
  bundPaint: '#8a8a82',
  tank: '#66735f',
  tankLid: '#576552',
  radiator: '#58654f',
  fin: '#71806a',
  porcelain: '#7b4b2a',
  shed: '#8d5c38',
  conservator: '#6c7a66',
  timber: '#8d6e47',
  timberDark: '#6a5232',
  cable: '#1b1c1e',
  render: '#8f9089',
  dado: '#5e6e6a',
  lining: '#cfd0c6',
  felt: '#2c2e30',
  rubber: '#222527',
  lid: '#575c60',
  lidDark: '#464b4f',
  stain: '#222527',
  gear: '#78808a',
  gearDark: '#4c535a',
  lampG: '#3f9b5a',
  lampA: '#d99a2b',
  lampR: '#c4393a',
  screen: '#1c3a4a',
  keypad: '#2a2d30',
  seam: '#2f3336',
  louvre: '#41464a',
} as const;

/** (J14) `opts.replan`: the re-planned yard, whose new and moved pieces (the drums, the beam panel, the apron bulkheads and switch)
 *  are `replan/a5Substation.ts`'s; the guards below leave out what it removes or moves. */
export function buildA5Substation(b: LevelBuilder, kit: FacilityKit, opts: { replan?: boolean } = {}): SetPart {
  const p = emptyPart('a5Substation');
  /** A box from x0 to x1, z0 to z1, y0 to y1; `noLedge` unless told otherwise. */
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string, opts: { overhead?: boolean; noLedge?: boolean } = {}): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
    b.mark(from, { noLedge: opts.noLedge ?? true, ...(opts.overhead ? { overhead: true } : {}) });
  };

  // ---- A5-1 / A5-2: the inner security wall, the gateway, its beams and the thrower's mark (`throwGateway`) ----
  const g = throwGateway(A5_GATEWAY);
  tally(b, p.register, 'A5-1', 'Inner security wall x 58, 0.3 m, 6 m to the set top (noLedge, no lip: security wall) with the 4.8 m gateway header over z 33-39 (noLedge, overhead)', () => {
    applyGreybox(b, { ...g, boxes: g.boxes.filter((x) => !x.tag.startsWith('mark')), stairs: [], ledges: [], doors: [] });
  });
  tally(b, p.register, 'A5-2', 'Cable gateway 6 m (z 33-39): three IR beams laser-a5 at 0.35 / 0.9 / 1.45 (night vision only, offFlag a5-release), the striped throw mark 1.2 m behind the line (paint, no collision)', () => {
    applyGreybox(b, { ...g, boxes: g.boxes.filter((x) => x.tag.startsWith('mark')), stairs: [], ledges: [], doors: [] });
  });
  for (const l of g.lasers) p.lasers.push({ ...l, label: 'Gateway beams' });
  for (const [k, d] of Object.entries(g.devices)) p.devices[k] = { ...d, label: 'Key the beam release' } satisfies CourseDevice;
  p.bay.gates.push(...g.gates);
  p.bay.gates.push({ kind: 'flag', id: A5_L5_GATE, flag: A5_RELEASE_FLAG, doorId: holdDoorId('L5', 'near') } satisfies FlagGate);
  // (J14) on the re-plan the panel moves into the switchroom, out of jam reach from the apron
  if (!opts.replan) {
    p.laserPanels.push({ ...A5_PANEL });
    p.register.push({ id: 'A5-3', element: 'Beam power panel panel-a5 high on the switchroom\'s south face (43.0, 3.2, 35.85), facing the gateway: jammable, shown in electro (a laser panel, no builder piece)' });
  }

  // ---- A5-10: the cable drums on the apron ((J14) on the re-plan they stand on the west strip: the trench is here) ----
  if (!opts.replan) {
    tally(b, p.register, 'A5-10', 'Cable-drum stack 1.8 m, x 62.1-64.3, z 29.4-33.0 (one collide box, a solo-standable top 4.1 m off the beam line: BEAM_KEEP_CLEAR 4.0, A5-D1)', () => {
      slab(A5_DRUMS.x0, A5_DRUMS.x1, A5_DRUMS.z0, A5_DRUMS.z1, 0, A5_DRUMS.h, DRUM, { noLedge: false });
    });
  }

  // ---- A5-4: the transformer pens (1.2 m bunds, low cover; 3.5 m units, noLedge; gravel inside the bunds) ----
  tally(b, p.register, 'A5-4', 'Transformer pens 1 (x 42-48, z 24.3-29.3, against the south wall: A5-D4) and 2 (x 50-56, z 40.5-45.5: A5-D5): 0.25 m bund walls 1.2 m (low cover), 3.5 m units (noLedge), gravel inside the bunds (loud)', () => {
    const { h, t } = A5_BUND;
    for (const { bund, unit } of A5_PENS) {
      const [x0, z0, x1, z1] = bund;
      slab(x0, x1, z0, z0 + t, 0, h, CONCRETE, { noLedge: false });
      slab(x0, x1, z1 - t, z1, 0, h, CONCRETE, { noLedge: false });
      slab(x0, x0 + t, z0 + t, z1 - t, 0, h, CONCRETE, { noLedge: false });
      slab(x1 - t, x1, z0 + t, z1 - t, 0, h, CONCRETE, { noLedge: false });
      slab(unit[0], unit[2], unit[1], unit[3], 0, A5_UNIT_H, TRANSFORMER);
      b.surface('gravel', x0 + t, x1 - t, z0 + t, z1 - t, 0);
    }
  });
  p.register.push({ id: 'A5-11', element: "Pen 1's sump gauge on the bund's west end: the patrol's R2 job (41.3, 31.0), the isolation moment (no builder piece)" });

  // ---- A5-5 / A5-12: the switchroom (6 x 10, two doors: the HV switchroom exit rule, A5-C2), every piece noLedge ----
  const { x0: rx0, x1: rx1, z0: rz0, z1: rz1, t: rt, wallH: rh, roofT } = A5_ROOM;
  const h = rt / 2;
  tally(b, p.register, 'A5-5', 'Switchroom 6 x 10 (x 40.25-46, z 36-46) on the west wall: 0.3 m walls to 3.9, flat roof to 4.0 (noLedge, overhead: A5-D2), the front door on the east face (z 41.0-42.2), the switchgear run on the west wall (2.3 m); every piece noLedge', () => {
    // south wall (the flood and the beam panel hang on its face) and the east wall with the front door's gap and lintel
    slab(rx0, rx1 + h, rz0 - h, rz0 + h, 0, rh, KIT_BOX_COLOR);
    slab(rx1 - h, rx1 + h, rz0 + h, DOOR_F.z0, 0, rh, KIT_BOX_COLOR);
    slab(rx1 - h, rx1 + h, DOOR_F.z1, rz1 - h, 0, rh, KIT_BOX_COLOR);
    slab(rx1 - h, rx1 + h, DOOR_F.z0, DOOR_F.z1, DOOR_F.h, rh, KIT_BOX_COLOR);
    // the roof (top 4.0) over the walls, and the switchgear run (inside, against the west wall)
    slab(rx0, rx1 + h, rz0 - h, rz1 + h, rh, rh + roofT, KIT_BOX_COLOR, { overhead: true });
    slab(GEAR.x0, GEAR.x1, GEAR.z0, GEAR.z1, 0, GEAR.h, STEEL);
    // the front door: hinge on the south jamb, the leaf along +z
    p.doors[A5_FRONT_DOOR] = b.door(rx1, 0, DOOR_F.z0, DOOR_F.z1 - DOOR_F.z0, 0, { height: DOOR_F.h }).id;
  });
  tally(b, p.register, 'A5-12', "Switchroom back door on the north face (x 41.0-42.2): the second exit and the secret route's way in; the north wall either side and its lintel (noLedge)", () => {
    slab(rx0, DOOR_B.x0, rz1 - h, rz1 + h, 0, rh, KIT_BOX_COLOR);
    slab(DOOR_B.x1, rx1 + h, rz1 - h, rz1 + h, 0, rh, KIT_BOX_COLOR);
    slab(DOOR_B.x0, DOOR_B.x1, rz1 - h, rz1 + h, DOOR_B.h, rh, KIT_BOX_COLOR);
    p.doors[A5_BACK_DOOR] = b.door(DOOR_B.x0, 0, rz1, DOOR_B.x1 - DOOR_B.x0, Math.PI / 2, { height: DOOR_B.h }).id;
  });

  // ---- A5-7: the zone control kiosk (the release); A5-8: the cable trench lids ----
  tally(b, p.register, 'A5-7', 'Zone control kiosk 0.5 x 0.8 x 1.5 at (47, 33), facing +x (noLedge): the release sw-a5-release, 1.0 m clear in front', () => {
    slab(A5_KIOSK.x0, A5_KIOSK.x1, A5_KIOSK.z0, A5_KIOSK.z1, 0, A5_KIOSK.h, STEEL);
  });
  tally(b, p.register, 'A5-8', 'Cable trench along the north wall behind pen 2 and the switchroom (x 46.15-57.85, z 46.6-47.75): chequer-plate lids, flush (metal, loud: the secret route\'s price)', () => {
    b.surface('metal', A5_TRENCH[0], A5_TRENCH[2], A5_TRENCH[1], A5_TRENCH[3], 0);
  });

  // ---- A5-6 / A5-9: the lights (LIGHTING-PLAN 3, A5; the circuits are `MARLOW_CIRCUITS` 50-53) ----
  const bulkhead = (x: number, z: number, group: number, alongX: boolean, radius: number, intensity: number): void => {
    b.light({ x, y: 3.5, z, radius, intensity, color: WHITE, group, electric: true, destructible: true, fixture: alongX ? { sx: 0.34, sy: 0.16, sz: 0.2, oy: 0.06 } : { sx: 0.2, sy: 0.16, sz: 0.34, oy: 0.06 } });
  };
  tally(b, p.register, 'A5-6', 'Kiosk floodlight, group 52 (photocell: jam or shoot only): a sodium cone on a bracket off the switchroom\'s south face, aimed at the strip in front of the kiosk', () => {
    const f = A5_FLOOD;
    b.light({ kind: 'spot', x: f.x, y: f.y, z: f.z, radius: f.radius, intensity: f.intensity, color: SODIUM, cone: makeCone(f.aim[0] - f.x, f.aim[1] - f.y, f.aim[2] - f.z, f.outer), group: 52, electric: true, destructible: true, fixture: { sx: 0.4, sy: 0.16, sz: 0.3, oy: 0.06 } });
  });
  tally(b, p.register, 'A5-9', 'Apron 50 (three bulkheads on the east and north walls, switch by the L4 door), inner zone 51 (bulkheads on the inner wall, the south wall and the switchroom\'s east face, the switchroom panel; switch inside the front door), kiosk panel light 53 (its emergency supply)', () => {
    // (J14) on the re-plan these two hang in the gap and its dead space: they move to the new wall's inside face
    if (!opts.replan) {
      bulkhead(69.55, 29.5, 50, false, 9, 1.2);
      bulkhead(69.55, 38.5, 50, false, 9, 1.2);
    }
    bulkhead(64.0, 47.55, 50, true, 9, 1.0);
    bulkhead(57.65, 27.0, 51, false, 9, 1.0);
    bulkhead(51.0, 24.45, 51, true, 9, 1.2);
    bulkhead(46.35, 44.5, 51, false, 7, 1.0);
    b.light({ x: 43.1, y: 3.7, z: 41.0, radius: 5, intensity: 0.23, color: WHITE, group: 51, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.05, sz: 0.6, oy: 0.025 } });
    const k = A5_KIOSK_LAMP;
    b.light({ kind: 'spot', x: k.x, y: k.y, z: k.z, radius: k.radius, intensity: k.intensity, color: WHITE, cone: makeCone(k.aim[0], k.aim[1], k.aim[2], k.outer), group: 53, electric: true, destructible: true, fixture: { sx: 0.06, sy: 0.08, sz: 0.2, oy: 0 } });
  });
  for (const [k, gr] of Object.entries(marlowCourseGroups())) if (k.startsWith('a5-')) p.groups[k] = gr;
  // wall switches: the apron's on the L4 wall north of the door's glass slot, the inner zone's inside the front door (the lure)
  // (J14) on the re-plan the apron switch moves to the new wall's inside face
  if (!opts.replan) p.switches.push({ id: 'a5-sw-apron', group: 50, pos: { x: 69.7, y: 1.2, z: 36.0 }, yaw: -Math.PI / 2 });
  p.switches.push({ id: 'a5-sw-inner', group: 51, pos: { x: rx1 - h - 0.05, y: 1.2, z: 40.7 }, yaw: -Math.PI / 2 });
  // the set at its standby fill, open to the hall roof
  p.ambientZones.push({ id: 'A5', box: [40, 24, 70, 48], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: HALL_H - 0.1 });

  // ---- the patrol, the steps, the claim, the pass zone, the radio ----
  p.squads[A5_PATROL] = { kind: 'grunt', x: 47.9, z: 33.4, yaw: -Math.PI / 2, route: A5_PATROL_ROUTE, waits: A5_PATROL_WAITS, faces: A5_PATROL_FACES };
  p.bay.squad.push(A5_PATROL);
  // the first player into the inner zone (the thrown one) takes B; until then the lead (P1 in this odd set) reads A
  p.bay.roles = [{ role: 'b', zone: { box: A5_INNER_ZONE } }];
  p.passZones.push({ id: 'a5-p-in1', box: A5_INNER_ZONE, flag: A5_IN1_FLAG, floorY: 0, any: true });
  p.externalFlags.push(A5_IN1_FLAG);
  p.objectives.push(
    {
      id: 'a5-throw',
      bay: 'A5',
      text: 'Throw one of you over the beams. The release is at the kiosk.',
      a: 'Stand by the drums at the gateway and throw your partner over.',
      b: 'Land in the dark behind the transformer and wait for the jam.',
      done: { flag: A5_IN1_FLAG },
    },
    {
      id: 'a5-kiosk',
      bay: 'A5',
      text: 'Kill the floodlight so the kiosk can be reached unseen.',
      a: 'Jam the floodlight through the gateway for your partner.',
      b: 'Cross under the jam and key the release at the kiosk.',
      done: { flag: A5_RELEASE_FLAG },
    },
    { id: 'a5-lock', bay: 'A5', text: 'Beams are off. Both of you into holding room five.' },
  );
  p.bay.radio.push(
    { at: 'enter', text: 'Those beams cover the whole gateway. One of you goes over, the other stays put.' },
    { at: 'enter', text: 'The patrol reads the kiosk log. Throw while his back is to the gateway.' },
    { at: A5_RELEASE_GATE, text: 'Beams are down. Both of you, out by holding room five.' },
  );

  // ---- spaces, nav, debug points, light and shot spots ----
  p.camSpaces.push({ box: [40, 24, 70, 48], size: 'open' }, { box: [rx0, rz0, rx1, rz1], size: 'tight' });
  p.navSeeds.push({ x: 67.5, y: 0, z: 33 }, { x: 51, y: 0, z: 29 }, { x: 43.5, y: 0, z: 41 });
  p.debugPoints.push(
    { id: 'A5-entry', label: 'Set 5 entry (L4 door)', pos: { x: 67.5, y: 0, z: 33 }, yaw: -Math.PI / 2 },
    { id: 'A5-vantage', label: 'Set 5 vantage (the drums)', pos: { x: 64.9, y: 0, z: 34.0 }, yaw: -Math.PI / 2 },
    { id: 'A5-throw', label: 'Set 5 throw mark', pos: { x: A5_THROW.x, y: 0, z: A5_THROW.z }, yaw: -Math.PI / 2 },
    { id: 'A5-landing', label: 'Set 5 landing (dark pocket)', pos: { x: A5_LANDING.x, y: 0, z: A5_LANDING.z }, yaw: -Math.PI / 2 },
    { id: 'A5-mid', label: 'Set 5 middle (the kiosk strip)', pos: { x: 50.5, y: 0, z: 33.5 }, yaw: -Math.PI / 2 },
    { id: 'A5-kiosk', label: 'Set 5 kiosk (the release)', pos: { x: A5_PRESS.x, y: 0, z: A5_PRESS.z }, yaw: -Math.PI / 2 },
    { id: 'A5-switchroom', label: 'Set 5 switchroom', pos: { x: 43.5, y: 0, z: 41 }, yaw: Math.PI / 2 },
    { id: 'A5-exit', label: 'Set 5 trench path (L5 door)', pos: { x: 53, y: 0, z: 46.8 }, yaw: 0 },
  );
  p.lightSpots.push(
    { name: 'A5 strip centre', kind: 'body', x: 50.5, y: 0, z: 33.5, band: 'pool' },
    { name: 'A5 strip centre cut', kind: 'body', x: 50.5, y: 0, z: 33.5, band: 'cut', off: [52] },
    { name: 'A5 strip east cut', kind: 'body', x: 54.0, y: 0, z: 34.5, band: 'cut', off: [52] },
    { name: 'A5 kiosk', kind: 'body', x: A5_PRESS.x, y: 0, z: A5_PRESS.z, band: 'pool' },
    { name: 'A5 kiosk cut', kind: 'body', x: A5_PRESS.x, y: 0, z: A5_PRESS.z, band: 'cut', off: [52] },
    { name: 'A5 landing', kind: 'body', x: 55.6, y: 0, z: 36.8, band: 'pocket' },
    { name: 'A5 landing mark', kind: 'body', x: A5_LANDING.x, y: 0, z: A5_LANDING.z, band: 'pocket' },
    { name: 'A5 pen 1 gap', kind: 'body', x: 41.3, y: 0, z: 31.0, band: 'pocket' },
    { name: 'A5 inner zone', kind: 'body', x: 51, y: 0, z: 29, band: 'read' },
    { name: 'A5 inner zone cut', kind: 'body', x: 51, y: 0, z: 29, band: 'cut', off: [51] },
    { name: 'A5 switchroom', kind: 'body', x: 43.5, y: 0, z: 41, band: 'read' },
    { name: 'A5 switchroom cut', kind: 'body', x: 43.5, y: 0, z: 41, band: 'cut', off: [51] },
    { name: 'A5 apron', kind: 'body', x: 66, y: 0, z: 36, band: 'read' },
    { name: 'A5 apron cut', kind: 'body', x: 66, y: 0, z: 36, band: 'cut', off: [50] },
    { name: 'A5 vantage', kind: 'body', x: 64.9, y: 0, z: 34.0, band: 'any' },
    { name: 'A5 throw mark', kind: 'body', x: A5_THROW.x, y: 0, z: A5_THROW.z, band: 'any' },
    { name: 'A5 strip floor', kind: 'surf', x: 50.5, y: 0.05, z: 33.5, band: 'any' },
    { name: 'A5 strip standby', kind: 'body', x: 50.5, y: 0, z: 33.5, band: 'standby' },
  );
  p.shotVantages.push(
    { name: 'a5-vantage', feet: [64.9, 0, 34.0], cam: [66.6, 1.4, 34.6], target: [47, 1.2, 33.5] },
    { name: 'a5-kiosk', feet: [48.5, 0, 33.2], cam: [47.3, 1.8, 31.6], target: [58, 1.2, 36] },
    { name: 'a5-trench', feet: [56.5, 0, 47], cam: [57.3, 1.8, 47.3], target: [48, 1.2, 40.5] },
  );

  // ---- dressing (slice 5 step 5; SPEC 6, PROPS.md 3 / 5, KIT.md): appended after the greybox, which it does not touch ----
  /** A visual-only skin [x0, x1] x [y0, y1] x [z0, z1]: no collision, `noLedge`, one side under `THIN` (out of the light shapes). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    if (Math.min(x1 - x0, y1 - y0, z1 - z0) >= THIN) throw new Error(`a5Substation: the dressing skin at (${x0}, ${y0}, ${z0}) is not thin`);
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
    b.mark(from, { noLedge: true });
  };
  /** A skin on the face of an axis-aligned block, `o0` to `o1` m off it: `side` is the face's outward direction ('s' -z, 'n' +z, 'w' -x,
   *  'e' +x), `at` the face's plane (z for n / s, x for e / w), [a0, a1] the run along it (x for n / s, z for e / w). */
  const rect = (side: 'n' | 's' | 'e' | 'w', at: number, a0: number, a1: number, y0: number, y1: number, o0: number, o1: number, color: string): void => {
    if (side === 'n') skin(a0, a1, y0, y1, at + o0, at + o1, color);
    else if (side === 's') skin(a0, a1, y0, y1, at - o1, at - o0, color);
    else if (side === 'e') skin(at + o0, at + o1, y0, y1, a0, a1, color);
    else skin(at - o1, at - o0, y0, y1, a0, a1, color);
  };
  /** The same on a layer: how many skins out (each `SKIN` thick). */
  const face = (side: 'n' | 's' | 'e' | 'w', at: number, a0: number, a1: number, y0: number, y1: number, color: string, layer = 0): void => rect(side, at, a0, a1, y0, y1, layer * SKIN, (layer + 1) * SKIN, color);
  /** Floor paint (a few mm proud, no collision). */
  const paint = (x0: number, x1: number, z0: number, z1: number, color: string, top = 0.012): void => skin(x0, x1, 0, top, z0, z1, color);
  /** A thin strip on the floor from (x0, z0) to (x1, z1): a cable, `w` wide and `h` high (both under `THIN`). */
  const strip = (x0: number, z0: number, x1: number, z1: number, y0: number, w: number, h: number, color: string): void => {
    if (Math.min(w, h) >= THIN) throw new Error('a5Substation: the dressing strip is not thin');
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2, w, h, hyp2(x1 - x0, z1 - z0), color, Math.atan2(x1 - x0, z1 - z0), 0, false);
    b.mark(from, { noLedge: true });
  };
  /** A regular octagon (apothem `p`, `t` thick) in the plane x = `cx` round (yc, zc): four bars crossing at 0, 45, 90 and 135 degrees
   *  (length 2p, width 2p tan 22.5), each turned about x. */
  const octagon = (cx: number, yc: number, zc: number, ap: number, t: number, color: string): void => {
    if (t >= THIN) throw new Error('a5Substation: the dressing octagon is not thin');
    for (let k = 0; k < 4; k++) {
      const from = b.boxes.length;
      b.box(cx, yc, zc, t, 2 * ap * Math.tan(Math.PI / 8), 2 * ap, color, 0, (k * Math.PI) / 4, false);
      b.mark(from, { noLedge: true });
    }
  };
  /** A warning board on a face: white with a red head band and two stencil bars, `w` x `hgt` centred at `c`. */
  const sign = (side: 'n' | 's' | 'e' | 'w', at: number, c: number, y0: number, w: number, hgt: number): void => {
    face(side, at, c - w / 2, c + w / 2, y0, y0 + hgt, LOOK.white, 1);
    face(side, at, c - w / 2, c + w / 2, y0 + hgt - 0.12, y0 + hgt, LOOK.red, 2);
    face(side, at, c - w / 2 + 0.08, c + w / 2 - 0.08, y0 + hgt * 0.42, y0 + hgt * 0.42 + 0.05, LOOK.black, 2);
    face(side, at, c - w / 2 + 0.08, c + w / 2 - 0.2, y0 + hgt * 0.22, y0 + hgt * 0.22 + 0.05, LOOK.black, 2);
  };
  const S = A5_SHELL;
  const wx0 = S.west + CORNER;
  const wx1 = S.east - CORNER;
  const wz0 = S.south + CORNER;
  const wz1 = S.north - CORNER;

  // ---- A5-13: the hall's walls round the set (blockwork on a plinth, pilasters, earth tape) and the lamps' brackets ----
  tally(b, p.register, 'A5-13', "Hall wall dressing (visual skins, no collision): concrete plinth, painted blockwork with courses, pilasters on the 6 m grid, earth tape and a cap under the gallery on the south, west, north and east walls (the L4 and L5 doors and the glass slot left clear), brackets and conduit for the six wall bulkheads, switch back boxes, warning boards and a fire point", () => {
    /** One wall face: plinth to 0.45, paint to the cap, courses, earth tape, cap, pilasters. `y0` / `y1` clip it (over a door, round a slot). */
    const sheet = (side: 'n' | 's' | 'e' | 'w', at: number, runs: readonly (readonly [number, number])[], posts: readonly number[], y0 = 0, y1 = WALL_TOP): void => {
      for (const [a, e] of runs) {
        if (y0 < 0.45) face(side, at, a, e, y0, Math.min(0.45, y1), LOOK.plinth);
        face(side, at, a, e, Math.max(y0, 0.45), y1, LOOK.paint);
        for (let y = 1.05; y < y1 - 0.05; y += 0.6) if (y >= y0) face(side, at, a, e, y, y + 0.02, LOOK.course, 1);
        if (y0 < 0.2 && y1 > 0.23) face(side, at, a, e, 0.2, 0.23, LOOK.copper, 1);
        if (y1 >= WALL_TOP) face(side, at, a, e, WALL_TOP - 0.12, WALL_TOP, LOOK.trim, 2);
        for (const q of posts) if (q - 0.15 >= a && q + 0.15 <= e) face(side, at, q - 0.15, q + 0.15, y0, Math.min(y1, WALL_TOP - 0.12), LOOK.pilaster, 2);
      }
    };
    const L4 = [31.95, 34.05] as const;
    const SLOT = [34.85, 35.55] as const;
    const L5 = [51.95, 54.05] as const;
    sheet('n', S.south, wallRuns(wx0, wx1, []), [46, 52, 64]);
    sheet('s', S.north, wallRuns(wx0, wx1, [L5]), [46, 64]);
    sheet('s', S.north, [L5], [], 2.55, WALL_TOP);
    sheet('e', S.west, [[S.south, rz0 - h], [rz1 + h, S.north]], [30]);
    sheet('w', S.east, wallRuns(S.south, S.north, [L4, SLOT]), [30, 42]);
    sheet('w', S.east, [L4], [], 2.9, WALL_TOP);
    sheet('w', S.east, [SLOT], [], 0, 0.95);
    sheet('w', S.east, [SLOT], [], 2.3, WALL_TOP);
    // each bulkhead hangs 0.1 m off its wall: a back plate, two arms to the fixture, a conduit stub below
    for (const { side, at, c } of A5_BULKHEADS) {
      // (J14) the two east-wall bulkheads move on the re-plan (their brackets go with them)
      if (opts.replan && side === 'w' && at === S.east) continue;
      rect(side, at, c - 0.16, c + 0.16, 3.36, 3.68, 0.03, 0.06, LOOK.steelDark);
      rect(side, at, c - 0.1, c + 0.1, 3.5, 3.54, 0.06, 0.1, LOOK.steel);
      rect(side, at, c - 0.1, c + 0.1, 3.58, 3.62, 0.06, 0.1, LOOK.steel);
      rect(side, at, c - 0.02, c + 0.02, 3.0, 3.36, 0.03, 0.06, LOOK.pipe);
    }
    // the apron's wall switch (69.7, 1.2, 36.0) and the inner zone's inside the front door (45.8, 1.2, 40.7): a back box each, 1 cm behind the plate
    if (!opts.replan) rect('w', S.east, 35.85, 36.15, 1.05, 1.35, 0.02, 0.04, LOOK.steelDark);
    rect('w', rx1 - h, 40.55, 40.85, 1.05, 1.35, 0.02, 0.04, LOOK.steelDark);
    // warning boards, and the fire point on the east wall
    sign('n', S.south, 50.2, 1.8, 0.7, 0.5);
    sign('n', S.south, 63.0, 1.8, 0.7, 0.5);
    sign('s', S.north, 47.6, 1.8, 0.7, 0.5);
    sign('s', S.north, 62.0, 1.8, 0.7, 0.5);
    sign('w', S.east, 26.4, 1.8, 0.7, 0.5);
    sign('e', S.west, 33.0, 1.8, 0.7, 0.5);
    face('w', S.east, 45.15, 45.4, 0.7, 1.3, LOOK.red, 2);
    face('w', S.east, 45.2, 45.35, 1.3, 1.38, LOOK.black, 3);
    face('w', S.east, 45.0, 45.55, 1.55, 1.95, LOOK.white, 1);
    face('w', S.east, 45.05, 45.5, 1.85, 1.95, LOOK.red, 2);
  });

  // ---- A5-14: the inner security wall (precast panels, plinth, cap), the gateway's posts and hazard header, the parked gate ----
  tally(b, p.register, 'A5-14', "Inner security wall dressing (visual skins, no collision): plinth, precast panels with joints, earth tape and a cap on both faces of the 6 m wall (x 58), steel jamb plates on the gateway's posts, the header's paint, yellow and black hazard band, underside and board, a sliding palisade gate parked open on the apron face (tonight's delivery) and warning boards", () => {
    const runs = [[wz0, 33.0], [39.0, wz1]] as const;
    for (const [side, at] of [['e', A5_WALL.near], ['w', A5_WALL.far]] as const) {
      for (const [a, e] of runs) {
        face(side, at, a, e, 0, 0.45, LOOK.plinth);
        face(side, at, a, e, 0.45, 5.9, LOOK.precast);
        face(side, at, a, e, 5.9, 6.0, LOOK.trim, 1);
        face(side, at, a, e, 0.2, 0.23, LOOK.copper, 1);
        for (let z = a + 1.5; z < e - 0.2; z += 1.5) face(side, at, z - 0.01, z + 0.01, 0.45, 5.9, LOOK.joint, 1);
      }
      // the header (z 33-39, 4.8-6.0): paint over a 0.35 m hazard band, cap, a board
      face(side, at, 33.0, 39.0, 5.15, 5.9, LOOK.precast);
      face(side, at, 33.0, 39.0, 5.9, 6.0, LOOK.trim, 1);
      for (let k = 0; k < 12; k++) face(side, at, 33 + 0.5 * k, 33 + 0.5 * (k + 1), 4.8, 5.15, k % 2 === 0 ? LOOK.yellow : LOOK.black);
      face(side, at, 35.1, 36.9, 5.3, 5.75, LOOK.white, 1);
      face(side, at, 35.1, 36.9, 5.63, 5.75, LOOK.red, 2);
      face(side, at, 35.25, 36.75, 5.42, 5.47, LOOK.black, 2);
    }
    skin(A5_WALL.far, A5_WALL.near, 4.77, 4.8, 33.0, 39.0, LOOK.yellow);
    // the posts' jamb plates, facing into the gateway (the beam towers stand in front of them)
    face('n', 33.0, A5_WALL.far, A5_WALL.near, 0, 4.8, LOOK.steel);
    face('s', 39.0, A5_WALL.far, A5_WALL.near, 0, 4.8, LOOK.steel);
    // the sliding palisade gate parked open on the apron face south of the gateway: a guide rail, three rails, 28 bars, two wheels
    const gate = A5_WALL.near;
    rect('e', gate, 26.9, 33.0, 3.05, 3.12, 0.03, 0.06, LOOK.steel);
    rect('e', gate, 27.1, 32.9, 0.2, 0.32, 0.075, 0.105, LOOK.steelDark);
    rect('e', gate, 27.1, 32.9, 1.5, 1.58, 0.075, 0.105, LOOK.steelDark);
    rect('e', gate, 27.1, 32.9, 2.9, 3.02, 0.075, 0.105, LOOK.steelDark);
    for (let i = 0; i < 28; i++) rect('e', gate, 27.3 + i * 0.2 - 0.015, 27.3 + i * 0.2 + 0.015, 0.32, 2.9, 0.045, 0.075, LOOK.galv);
    for (const z of [27.5, 32.5]) rect('e', gate, z - 0.08, z + 0.08, 0.05, 0.2, 0.075, 0.105, LOOK.black);
    sign('e', gate, 41.25, 2.0, 1.0, 0.7);
    sign('w', A5_WALL.far, 28.0, 2.0, 0.8, 0.55);
  });

  // ---- A5-15: the cable-drum stack: four timber drums on their sides (flange discs on the end faces, lagging on the sides), the cable laid in ----
  // ((J14) the re-plan dresses its moved stack itself)
  if (!opts.replan) tally(b, p.register, 'A5-15', 'Cable-drum stack dressing (visual skins, no collision): four drums with octagonal timber flanges, wound black cable, hubs and tags on the two end faces, flange edges, wound cable and cable lines on the sides, strapping over the top, the laydown outline in yellow, and the cable laid in through the gateway to the landing', () => {
    const { x0, x1, z0, z1, h: dh } = A5_DRUMS;
    for (const zc of A5_DRUM_ROWS) {
      for (const [side, at, dir] of [['e', x1, 1], ['w', x0, -1]] as const) {
        octagon(at + dir * 0.015, 0.9, zc, 0.9, SKIN, LOOK.timber);
        octagon(at + dir * 0.045, 0.9, zc, 0.62, SKIN, LOOK.cable);
        face(side, at, zc - 0.14, zc + 0.14, 0.76, 1.04, LOOK.steel, 2);
        face(side, at, zc - 0.25, zc + 0.25, 1.56, 1.68, LOOK.white, 1);
        face(side, at, zc - 0.2, zc + 0.2, 1.6, 1.62, LOOK.black, 2);
      }
    }
    for (const [side, at] of [['s', z0], ['n', z1]] as const) {
      for (const [a, e] of [[x0, x0 + 1.1], [x0 + 1.1, x1]] as const) {
        face(side, at, a, a + 0.1, 0, dh, LOOK.timber);
        face(side, at, e - 0.1, e, 0, dh, LOOK.timber);
        face(side, at, a + 0.1, e - 0.1, 0.12, dh - 0.12, LOOK.cable);
        for (const y of [0.5, 0.9, 1.3]) face(side, at, a + 0.1, e - 0.1, y, y + 0.02, LOOK.seam, 1);
      }
    }
    // the top: wound cable between the flange lines, two steel straps over
    skin(x0, x1, dh, dh + SKIN, z0, z1, LOOK.cable);
    for (const [a, e] of [[x0, x0 + 0.1], [x0 + 1.0, x0 + 1.2], [x1 - 0.1, x1]] as const) skin(a, e, dh + SKIN, dh + 2 * SKIN, z0, z1, LOOK.timber);
    for (const z of [30.3, 32.1]) skin(x0, x1, dh + 2 * SKIN, dh + 3 * SKIN, z - 0.03, z + 0.03, LOOK.steelDark);
    // the laydown outline (0.2 m off the stack) and the cable run
    paint(x0 - 0.2, x1 + 0.2, z0 - 0.2, z0 - 0.1, LOOK.yellow);
    paint(x0 - 0.2, x1 + 0.2, z1 + 0.1, z1 + 0.2, LOOK.yellow);
    paint(x0 - 0.2, x0 - 0.1, z0 - 0.1, z1 + 0.1, LOOK.yellow);
    paint(x1 + 0.1, x1 + 0.2, z0 - 0.1, z1 + 0.1, LOOK.yellow);
    for (let i = 1; i < A5_CABLE.length; i++) strip(A5_CABLE[i - 1]![0], A5_CABLE[i - 1]![1], A5_CABLE[i]![0], A5_CABLE[i]![1], 0, 0.04, 0.04, LOOK.cable);
    const end = A5_CABLE[A5_CABLE.length - 1]!;
    skin(end[0] - 0.1, end[0] + 0.1, 0, 0.012, end[1] - 0.1, end[1] + 0.1, LOOK.yellow);
  });

  // ---- A5-16: the two transformer pens: bund copings, coatings and bands; the units' plinth, tank, radiators, bushings, conservator, boxes ----
  tally(b, p.register, 'A5-16', "Transformer pen dressing (visual skins, no collision): on each 1.2 m bund a coping, bitumen inside, painted outside with a yellow band and a drain valve; on each 3.5 m unit a plinth, tank paint and lid joint, two radiator banks of twelve fins, an HV and an LV bushing row with porcelain sheds, a conservator, lifting lugs, gauges and an end marshalling box each side; pen 1's sump gauge on the bund's west end (the patrol's R2 job)", () => {
    const { h: bh, t } = A5_BUND;
    for (const [i, { bund, unit }] of A5_PENS.entries()) {
      const [bx0, bz0, bx1, bz1] = bund;
      const [ux0, uz0, ux1, uz1] = unit;
      // the bund: copings on the four walls, bitumen on the inner faces, paint and a yellow band on the outer (pen 1's south wall stands against the hall wall)
      skin(bx0, bx1, bh, bh + SKIN, bz0, bz0 + t, LOOK.coping);
      skin(bx0, bx1, bh, bh + SKIN, bz1 - t, bz1, LOOK.coping);
      skin(bx0, bx0 + t, bh, bh + SKIN, bz0 + t, bz1 - t, LOOK.coping);
      skin(bx1 - t, bx1, bh, bh + SKIN, bz0 + t, bz1 - t, LOOK.coping);
      face('n', bz0 + t, bx0 + t, bx1 - t, 0, bh, LOOK.bitumen);
      face('s', bz1 - t, bx0 + t, bx1 - t, 0, bh, LOOK.bitumen);
      face('e', bx0 + t, bz0 + t, bz1 - t, 0, bh, LOOK.bitumen);
      face('w', bx1 - t, bz0 + t, bz1 - t, 0, bh, LOOK.bitumen);
      const outer: [('n' | 's' | 'e' | 'w'), number, number, number][] = [['n', bz1, bx0, bx1], ['w', bx0, bz0, bz1], ['e', bx1, bz0, bz1]];
      if (i === 1) outer.push(['s', bz0, bx0, bx1]);
      for (const [side, at, a0, a1] of outer) {
        face(side, at, a0, a1, 0, bh, LOOK.bundPaint);
        face(side, at, a0, a1, 1.0, 1.1, LOOK.yellow, 1);
      }
      // the drain valve on the east face: a box, a red handwheel, an outlet stub
      face('e', bx1, bz0 + 0.8, bz0 + 1.2, 0.2, 0.6, LOOK.steelDark, 1);
      face('e', bx1, bz0 + 0.9, bz0 + 1.1, 0.4, 0.5, LOOK.red, 2);
      face('e', bx1, bz0 + 0.95, bz0 + 1.05, 0.05, 0.2, LOOK.pipe, 1);
      // the unit: plinth, tank paint, lid joint on all four faces
      const zc = (uz0 + uz1) / 2;
      const faces: [('n' | 's' | 'e' | 'w'), number, number, number][] = [['n', uz1, ux0, ux1], ['s', uz0, ux0, ux1], ['e', ux1, uz0, uz1], ['w', ux0, uz0, uz1]];
      for (const [side, at, a0, a1] of faces) {
        face(side, at, a0, a1, 0, 0.18, LOOK.steelDark);
        face(side, at, a0, a1, 0.18, A5_UNIT_H, LOOK.tank);
        face(side, at, a0, a1, 2.3, 2.34, LOOK.tankLid, 1);
      }
      // two radiator banks (the long faces): a plate, twelve fins, the headers
      for (const [side, at] of [['n', uz1], ['s', uz0]] as const) {
        face(side, at, ux0 + 0.3, ux1 - 0.3, 0.35, 2.2, LOOK.radiator, 1);
        for (let k = 0; k < 12; k++) face(side, at, ux0 + 0.3 + 0.25 * k + 0.04, ux0 + 0.3 + 0.25 * k + 0.2, 0.4, 2.15, LOOK.fin, 2);
        face(side, at, ux0 + 0.3, ux1 - 0.3, 0.3, 0.4, LOOK.steelDark, 2);
        face(side, at, ux0 + 0.3, ux1 - 0.3, 2.15, 2.25, LOOK.steelDark, 2);
      }
      // a marshalling box on each end face, with a rating plate
      for (const [side, at] of [['e', ux1], ['w', ux0]] as const) {
        face(side, at, zc - 0.4, zc + 0.4, 0.9, 2.0, LOOK.steel, 1);
        face(side, at, zc - 0.01, zc + 0.01, 0.92, 1.98, LOOK.seam, 2);
        face(side, at, zc + 0.5, zc + 0.9, 1.4, 1.65, LOOK.white, 1);
        face(side, at, zc + 0.55, zc + 0.85, 1.45, 1.5, LOOK.black, 2);
      }
      // gauges high on the north face
      face('n', uz1, ux0 + 0.05, ux0 + 0.25, 2.5, 2.7, LOOK.white, 1);
      face('n', uz1, ux0 + 0.14, ux0 + 0.16, 2.54, 2.66, LOOK.red, 2);
      // the top: three HV bushings (tall, four sheds) and three LV (short, two sheds), a conservator tank and four lifting lugs
      for (let k = 1; k <= 3; k++) {
        const x = ux0 + 0.9 * k;
        for (const [z, top, sheds] of [[zc - 0.55, 4.35, 4], [zc + 0.1, 3.95, 2]] as const) {
          skin(x - 0.0225, x + 0.0225, A5_UNIT_H, top, z - 0.0225, z + 0.0225, LOOK.porcelain);
          for (let s = 0; s < sheds; s++) skin(x - 0.11, x + 0.11, A5_UNIT_H + 0.15 + 0.2 * s, A5_UNIT_H + 0.195 + 0.2 * s, z - 0.11, z + 0.11, LOOK.shed);
        }
      }
      const cz0 = zc + 0.6;
      skin(ux0 + 0.5, ux1 - 0.5, A5_UNIT_H, A5_UNIT_H + 0.45, cz0, cz0 + 0.04, LOOK.conservator);
      skin(ux0 + 0.5, ux1 - 0.5, A5_UNIT_H, A5_UNIT_H + 0.45, cz0 + 0.5, cz0 + 0.54, LOOK.conservator);
      skin(ux0 + 0.5, ux1 - 0.5, A5_UNIT_H + 0.45, A5_UNIT_H + 0.49, cz0, cz0 + 0.54, LOOK.conservator);
      for (const x of [ux0 + 0.5, ux1 - 0.54]) skin(x, x + 0.04, A5_UNIT_H, A5_UNIT_H + 0.45, cz0, cz0 + 0.54, LOOK.conservator);
      for (const [x, z] of [[ux0 + 0.05, uz0 + 0.1], [ux1 - 0.15, uz0 + 0.1], [ux0 + 0.05, uz1 - 0.1], [ux1 - 0.15, uz1 - 0.1]] as const) skin(x, x + 0.1, A5_UNIT_H, A5_UNIT_H + 0.14, z, z + 0.04, LOOK.yellow);
    }
    // pen 1's sump gauge on the bund's west end (the patrol's R2 job: he faces south at (41.3, 31.0)): a plate, a dial and its needle, a standpipe
    const g0 = A5_PENS[0].bund;
    face('w', g0[0], 28.45, 28.95, 0.55, 1.1, LOOK.white, 1);
    face('w', g0[0], 28.55, 28.85, 0.75, 1.0, LOOK.black, 2);
    face('w', g0[0], 28.69, 28.71, 0.82, 1.0, LOOK.red, 3);
    face('w', g0[0], 28.68, 28.72, 0.05, 0.55, LOOK.pipe, 1);
  });

  // ---- A5-17: the switchroom: render, roof, louvres, door trims and signs outside; lining, switchgear fronts, rubber mat inside ----
  tally(b, p.register, 'A5-17', "Switchroom dressing (visual skins, no collision): render on a plinth with a fascia, two louvred vents, the beam panel's label and conduit, the flood's outrigger on the roof edge, door trims and HV signs on the east and north faces, the roof's felt, upstands, vent, hatch and finial; inside a dado and lining, ceiling trunking, the lamp's hangers, the switchgear run's ten fronts (breaker doors, relay windows, lamps, mimic lines, nameplates) with an end panel, a rubber mat with a yellow keep-clear edge, boards and a fire point", () => {
    const roofTop = rh + roofT;
    const sx0 = rx0 + CORNER;
    const sx1 = rx1 + h - CORNER;
    const sz0 = rz0 - h + CORNER;
    const sz1 = rz1 + h - CORNER;
    /** Outside render on a face: plinth, render to the roof edge, fascia over the slab's edge (3.9-4.0). */
    const render = (side: 'n' | 's' | 'e' | 'w', at: number, runs: readonly (readonly [number, number])[], y0 = 0): void => {
      for (const [a, e] of runs) {
        if (y0 < 0.45) face(side, at, a, e, y0, 0.45, LOOK.plinth);
        face(side, at, a, e, Math.max(y0, 0.45), rh, LOOK.render);
        face(side, at, a, e, rh, roofTop, LOOK.trim);
        if (y0 < 0.2) face(side, at, a, e, 0.2, 0.23, LOOK.copper, 1);
      }
    };
    // south face (the flood and the beam panel): x 40.34-46.06
    render('s', rz0 - h, [[sx0, sx1]]);
    for (const [vx0, vx1] of [[41.2, 42.0], [44.6, 45.4]] as const) {
      face('s', rz0 - h, vx0, vx1, 3.0, 3.55, LOOK.louvre, 1);
      for (let k = 0; k < 6; k++) face('s', rz0 - h, vx0 + 0.04, vx1 - 0.04, 3.05 + 0.085 * k, 3.075 + 0.085 * k, LOOK.steelDark, 2);
    }
    // the beam panel (43.0, 3.2, 35.85, 0.42 x 0.56 x 0.12): a label under it, a conduit from its top to the roof edge
    if (!opts.replan) {
      face('s', rz0 - h, 42.85, 43.15, 2.55, 2.85, LOOK.yellow, 1);
      face('s', rz0 - h, 42.9, 43.1, 2.65, 2.7, LOOK.black, 2);
      face('s', rz0 - h, 42.98, 43.02, 3.48, rh, LOOK.pipe, 1);
    }
    // the flood's outrigger (the fixture box is x 44.3-44.7, y 4.18-4.34, z 35.45-35.75): two uprights on the roof edge, two arms under it
    for (const x of [44.32, 44.64]) {
      skin(x, x + 0.04, roofTop, 4.14, 35.88, 35.92, LOOK.steel);
      skin(x, x + 0.04, 4.14, 4.18, 35.5, 35.92, LOOK.steel);
    }
    // east face (the front door x 46, z 41.0-42.2, opening outwards): hinge-side trim 4 cm off the open leaf's line
    render('e', rx1 + h, [[sz0, 40.9], [42.26, sz1]]);
    face('e', rx1 + h, 40.9, 42.26, 2.16, rh, LOOK.render);
    face('e', rx1 + h, 40.9, 42.26, rh, roofTop, LOOK.trim);
    face('e', rx1 + h, 40.9, 40.96, 0, 2.16, LOOK.trim, 1);
    face('e', rx1 + h, 42.2, 42.26, 0, 2.16, LOOK.trim, 1);
    face('e', rx1 + h, 40.9, 42.26, 2.1, 2.16, LOOK.trim, 1);
    sign('e', rx1 + h, 42.85, 1.5, 0.6, 0.6);
    // north face (the back door x 41.0-42.2, opening into the room)
    render('n', rz1 + h, [[sx0, 40.9], [42.26, sx1]]);
    face('n', rz1 + h, 40.9, 42.26, 2.16, rh, LOOK.render);
    face('n', rz1 + h, 40.9, 42.26, rh, roofTop, LOOK.trim);
    face('n', rz1 + h, 40.9, 40.96, 0, 2.16, LOOK.trim, 1);
    face('n', rz1 + h, 42.2, 42.26, 0, 2.16, LOOK.trim, 1);
    face('n', rz1 + h, 40.9, 42.26, 2.1, 2.16, LOOK.trim, 1);
    sign('n', rz1 + h, 43.0, 1.5, 0.6, 0.6);
    // the door sills
    skin(rx1 - h, rx1 + h, 0, 0.02, 41.0, 42.2, LOOK.steel);
    skin(41.0, 42.2, 0, 0.02, rz1 - h, rz1 + h, LOOK.steel);
    // the roof: felt, upstands (the flood's span left open), a vent pipe with a cowl, an access hatch outline, a lightning finial on a plate
    skin(rx0, rx1 + h, roofTop, roofTop + 0.012, rz0 - h, rz1 + h, LOOK.felt);
    skin(rx0, 44.15, roofTop, roofTop + 0.2, rz0 - h + 0.01, rz0 - h + 0.04, LOOK.trim);
    skin(44.85, rx1 + h, roofTop, roofTop + 0.2, rz0 - h + 0.01, rz0 - h + 0.04, LOOK.trim);
    skin(rx1 + h - 0.04, rx1 + h - 0.01, roofTop, roofTop + 0.2, rz0 - h + 0.04, rz1 + h - 0.04, LOOK.trim);
    skin(rx0, rx1 + h - 0.01, roofTop, roofTop + 0.2, rz1 + h - 0.04, rz1 + h - 0.01, LOOK.trim);
    skin(43.98, 44.02, roofTop, 4.6, 44.78, 44.82, LOOK.pipe);
    skin(43.9, 44.1, 4.6, 4.64, 44.7, 44.9, LOOK.steelDark);
    for (const [hx0, hx1, hz0, hz1] of [[41.4, 42.6, 38.2, 38.23], [41.4, 42.6, 39.37, 39.4], [41.4, 41.43, 38.2, 39.4], [42.57, 42.6, 38.2, 39.4]] as const) skin(hx0, hx1, roofTop + 0.012, roofTop + 0.03, hz0, hz1, LOOK.yellow);
    skin(40.3, 40.6, roofTop + 0.012, roofTop + 0.04, 45.4, 45.7, LOOK.steelDark);
    skin(40.44, 40.46, roofTop + 0.04, 5.4, 45.54, 45.56, LOOK.steel);
    // inside: the lining (a dado under a light upper wall, a rail and a cornice) on the four walls, the doors' trims
    const lining = (side: 'n' | 's' | 'e' | 'w', at: number, runs: readonly (readonly [number, number])[]): void => {
      for (const [a, e] of runs) {
        face(side, at, a, e, 0, 1.2, LOOK.dado);
        face(side, at, a, e, 1.2, rh, LOOK.lining);
        face(side, at, a, e, 1.2, 1.25, LOOK.steel, 1);
        face(side, at, a, e, rh - 0.06, rh, LOOK.trim, 1);
      }
    };
    const ix0 = rx0 + CORNER;
    const ix1 = rx1 - h - CORNER;
    const iz0 = rz0 + h + CORNER;
    const iz1 = rz1 - h - CORNER;
    lining('n', rz0 + h, [[ix0, ix1]]);
    lining('s', rz1 - h, [[ix0, 40.9], [42.26, ix1]]);
    lining('w', rx1 - h, [[iz0, 40.9], [42.26, iz1]]);
    lining('e', rx0, [[iz0, iz1]]);
    for (const [side, at, a0, a1, a2, a3] of [['w', rx1 - h, 40.9, 40.96, 42.2, 42.26], ['s', rz1 - h, 40.9, 40.96, 42.2, 42.26]] as const) {
      face(side, at, a0, a1, 0, 2.16, LOOK.trim, 2);
      face(side, at, a2, a3, 0, 2.16, LOOK.trim, 2);
      face(side, at, a0, a3, 2.1, 2.16, LOOK.trim, 2);
    }
    // the floor: a resin coat, the insulating mat in front of the switchgear (1.0 m: LD 16.4.2) with a yellow keep-clear edge
    paint(rx0 + 0.05, rx1 - h, rz0 + h, rz1 - h, LOOK.dado, 0.006);
    paint(GEAR.x1, GEAR.x1 + 1.0, GEAR.z0, GEAR.z1, LOOK.rubber, 0.014);
    paint(GEAR.x1 + 1.0, GEAR.x1 + 1.08, GEAR.z0, GEAR.z1, LOOK.yellow, 0.016);
    paint(GEAR.x1, GEAR.x1 + 1.08, GEAR.z0 - 0.08, GEAR.z0, LOOK.yellow, 0.016);
    paint(GEAR.x1, GEAR.x1 + 1.08, GEAR.z1, GEAR.z1 + 0.08, LOOK.yellow, 0.016);
    // the ceiling: two trunking runs and four hangers for the panel light (43.1, 3.7, 41.0; the fixture is 0.6 x 0.6)
    skin(41.2, rx1 - h, rh - 0.04, rh, 38.9, 39.2, LOOK.steel);
    skin(41.2, rx1 - h, rh - 0.04, rh, 43.8, 44.1, LOOK.steel);
    for (const [x, z] of [[42.82, 40.72], [43.38, 40.72], [42.82, 41.28], [43.38, 41.28]] as const) skin(x - 0.015, x + 0.015, 3.75, rh, z - 0.015, z + 0.015, LOOK.steel);
    // the switchgear run (x 40.3-41.1, z 37-44.6, 2.3 m): nine 0.8 m cubicles and a blank end cubicle, fronts facing +x
    const gx = GEAR.x1;
    for (let m = 0; m < 9; m++) {
      const za = GEAR.z0 + 0.8 * m;
      const zb = za + 0.8;
      face('e', gx, za - 0.01, za + 0.01, 0, GEAR.h, LOOK.seam, 1);
      for (const [y0, y1] of [[0.05, 0.75], [0.78, 1.58], [1.62, 2.25]] as const) face('e', gx, za + 0.04, zb - 0.04, y0, y1, LOOK.gear);
      face('e', gx, za + 0.1, zb - 0.1, 1.82, 2.1, LOOK.screen, 1);
      [LOOK.lampG, LOOK.lampA, LOOK.lampR].forEach((c, k) => face('e', gx, za + 0.12 + 0.1 * k, za + 0.18 + 0.1 * k, 1.68, 1.72, c, 2));
      face('e', gx, (za + zb) / 2 - 0.015, (za + zb) / 2 + 0.015, 0.82, 1.55, LOOK.red, 1);
      for (const y of [0.3, 1.1]) face('e', gx, zb - 0.2, zb - 0.14, y, y + 0.15, LOOK.keypad, 1);
      face('e', gx, za + 0.2, zb - 0.2, 2.15, 2.2, LOOK.white, 1);
    }
    face('e', gx, GEAR.z0 + 7.2 - 0.01, GEAR.z0 + 7.2 + 0.01, 0, GEAR.h, LOOK.seam, 1);
    face('e', gx, GEAR.z0 + 7.2 + 0.04, GEAR.z1 - 0.04, 0.05, 2.25, LOOK.gearDark);
    skin(GEAR.x0, GEAR.x1, GEAR.h, GEAR.h + SKIN, GEAR.z0, GEAR.z1, LOOK.steelDark);
    face('e', gx, GEAR.z0, GEAR.z1, 0, 0.05, LOOK.steelDark);
    // the run's end panel (the visual end: z 44.6, clear of the back door's open leaf, which lies along x 41.0 to z 44.8): a plate, a seam, a warning board
    face('n', GEAR.z1, GEAR.x0, GEAR.x1, 0, GEAR.h, LOOK.gearDark);
    face('n', GEAR.z1, GEAR.x0 + 0.1, GEAR.x1 - 0.1, 1.1, 1.5, LOOK.yellow, 1);
    face('n', GEAR.z1, GEAR.x0 + 0.2, GEAR.x1 - 0.2, 1.25, 1.3, LOOK.black, 2);
    // boards: the single-line diagram and the safety rules on the south wall, the fire point and a first-aid board on the east wall
    face('n', rz0 + h, 43.0, 44.5, 1.35, 2.35, LOOK.white, 1);
    for (const [a, e, y] of [[43.1, 44.4, 1.9], [43.1, 43.7, 1.7], [43.8, 44.4, 1.5], [43.75, 43.8, 1.5]] as const) face('n', rz0 + h, a, e, y, y + 0.04, LOOK.black, 2);
    face('n', rz0 + h, 44.7, 45.3, 1.5, 2.1, LOOK.white, 1);
    face('n', rz0 + h, 44.7, 45.3, 1.95, 2.1, LOOK.yellow, 2);
    face('w', rx1 - h, 38.9, 39.15, 0.7, 1.3, LOOK.red, 2);
    face('w', rx1 - h, 38.95, 39.1, 1.3, 1.38, LOOK.black, 3);
    face('w', rx1 - h, 38.7, 39.35, 1.55, 1.95, LOOK.white, 1);
    face('w', rx1 - h, 43.2, 43.8, 1.4, 2.0, LOOK.white, 1);
    face('w', rx1 - h, 43.4, 43.6, 1.55, 1.85, LOOK.lampG, 2);
  });

  // ---- A5-18: the zone control kiosk: plinth, cap, keypad, display, three lamps, a hood and the panel light's gooseneck, label, vents, the operator's mat ----
  tally(b, p.register, 'A5-18', "Kiosk dressing (visual skins, no collision): plinth, cap, keypad, display, three status lamps, label and vents on the 0.5 x 0.8 x 1.5 body, a visor over the keypad with the panel light's gooseneck (the light's fixture hangs 0.25 m off the face), a conduit down the back, the operator's rubber mat and its yellow keep-clear outline", () => {
    const k = A5_KIOSK;
    const zc = (k.z0 + k.z1) / 2;
    for (const [side, at, a0, a1] of [['e', k.x1, k.z0, k.z1], ['w', k.x0, k.z0, k.z1], ['n', k.z1, k.x0, k.x1], ['s', k.z0, k.x0, k.x1]] as const) face(side, at, a0, a1, 0, 0.1, LOOK.steelDark);
    skin(k.x0 - 0.02, k.x1 + 0.02, k.h, k.h + SKIN, k.z0 - 0.02, k.z1 + 0.02, LOOK.steelDark);
    face('e', k.x1, zc - 0.13, zc + 0.13, 1.0, 1.25, LOOK.keypad, 1);
    for (const [dz, y] of [[-0.07, 1.04], [0, 1.04], [0.07, 1.04], [-0.07, 1.12], [0, 1.12], [0.07, 1.12]] as const) face('e', k.x1, zc + dz - 0.025, zc + dz + 0.025, y, y + 0.04, LOOK.steel, 2);
    face('e', k.x1, zc - 0.11, zc + 0.11, 1.28, 1.38, LOOK.screen, 1);
    [LOOK.lampG, LOOK.lampA, LOOK.lampR].forEach((c, i) => face('e', k.x1, zc - 0.15 + 0.15 * i - 0.02, zc - 0.15 + 0.15 * i + 0.02, 1.4, 1.43, c, 1));
    face('e', k.x1, zc - 0.25, zc + 0.25, 0.6, 0.78, LOOK.white, 1);
    face('e', k.x1, zc - 0.25, zc + 0.25, 0.7, 0.78, LOOK.red, 2);
    face('e', k.x1, zc - 0.2, zc + 0.2, 0.64, 0.67, LOOK.black, 2);
    for (const [side, at] of [['n', k.z1], ['s', k.z0]] as const) for (let i = 0; i < 4; i++) face(side, at, k.x0 + 0.1, k.x1 - 0.1, 0.35 + 0.08 * i, 0.38 + 0.08 * i, LOOK.louvre, 1);
    // the visor and the gooseneck out to the panel light (the fixture: x 47.47-47.53, y 1.41-1.49, z 32.9-33.1)
    skin(k.x1, k.x1 + 0.13, 1.46, 1.49, zc - 0.2, zc + 0.2, LOOK.steelDark);
    skin(k.x1 + 0.13, A5_KIOSK_LAMP.x - 0.03, 1.44, 1.47, zc - 0.015, zc + 0.015, LOOK.steel);
    // the cable down the back (west) face to the floor
    face('w', k.x0, zc - 0.02, zc + 0.02, 0.05, k.h, LOOK.pipe, 1);
    face('w', k.x0, zc - 0.08, zc + 0.08, 0.0, 0.06, LOOK.steelDark, 1);
    // the operator's mat in front (the press spot (47.6, 33.0) is on it) with a yellow outline
    paint(A5_MAT.x0, A5_MAT.x1, A5_MAT.z0, A5_MAT.z1, LOOK.rubber, 0.014);
    paint(A5_MAT.x0 - 0.1, A5_MAT.x1 + 0.1, A5_MAT.z0 - 0.1, A5_MAT.z0, LOOK.yellow, 0.016);
    paint(A5_MAT.x0 - 0.1, A5_MAT.x1 + 0.1, A5_MAT.z1, A5_MAT.z1 + 0.1, LOOK.yellow, 0.016);
    paint(A5_MAT.x1, A5_MAT.x1 + 0.1, A5_MAT.z0, A5_MAT.z1, LOOK.yellow, 0.016);
  });

  // ---- A5-19: the cable trench's chequer-plate lids, the floor's seams and stains (concrete is the level floor) ----
  tally(b, p.register, 'A5-19', 'Trench and floor dressing (visual skins, no collision, a few mm proud): ten chequer-plate lids with angle frames, ribs and lifting eyes over the trench (x 46.15-57.85, z 46.6-47.72), expansion seams on the 6 m grid across the apron and the inner zone, and eight oil stains', () => {
    const [tx0, tz0, tx1] = A5_TRENCH;
    const tz1 = A5_SHELL.north - SKIN;
    const lids = 10;
    const lw = (tx1 - tx0) / lids;
    skin(tx0, tx1, 0, 0.014, tz0, tz0 + 0.06, LOOK.steel);
    skin(tx0, tx1, 0, 0.014, tz1 - 0.06, tz1, LOOK.steel);
    for (let i = 0; i < lids; i++) {
      const lx0 = tx0 + lw * i;
      paint(lx0, lx0 + lw, tz0 + 0.06, tz1 - 0.06, i % 2 === 0 ? LOOK.lid : LOOK.lidDark, 0.01);
      skin(lx0 - 0.01, lx0 + 0.01, 0, 0.014, tz0 + 0.06, tz1 - 0.06, LOOK.seam);
      for (let r = 1; r <= 5; r++) skin(lx0 + 0.15 + 0.14 * r - 0.01, lx0 + 0.15 + 0.14 * r + 0.01, 0.01, 0.016, tz0 + 0.12, tz1 - 0.12, LOOK.steel);
      for (const z of [tz0 + 0.3, tz1 - 0.36]) skin(lx0 + lw / 2 - 0.04, lx0 + lw / 2 + 0.04, 0.01, 0.014, z, z + 0.06, LOOK.seam);
    }
    // (J14) on the re-plan no seam or stain floats over the cable trench (x 62.35-65.85)
    const overTrench = (x0: number, x1: number): boolean => opts.replan === true && x1 > 62.35 && x0 < 65.85;
    for (const [x0, z0, x1, z1] of JOINTS) if (!overTrench(x0, x1)) paint(x0 - (x0 === x1 ? 0.01 : 0), x1 + (x0 === x1 ? 0.01 : 0), z0 - (z0 === z1 ? 0.01 : 0), z1 + (z0 === z1 ? 0.01 : 0), LOOK.seam, 0.005);
    for (const [x0, x1, z0, z1] of [[66.2, 67.4, 28.4, 29.1], [60.4, 61.3, 38.4, 39.0], [49.3, 50.4, 31.0, 31.7], [53.2, 54.0, 28.1, 28.7], [47.0, 47.9, 38.0, 38.8], [65.0, 66.0, 44.0, 44.7], [44.2, 45.2, 30.6, 31.2], [54.9, 55.6, 45.9, 46.4]] as const) if (!overTrench(x0, x1)) paint(x0, x1, z0, z1, LOOK.stain, 0.006);
  });

  // ---- A5-20: the hall above the set (kit panels with accent coves, each on its circuit; no lamp) ----
  tally(b, p.register, 'A5-20', "Kit panels above the set (visual): the hall's charcoal panels and coves on the west wall from 4.4 m to the roof (inner zone 51) and over the gallery glazing on the south and north walls (51 west of the security wall, apron 50 east of it) and the east wall (50)", () => {
    const rise = HALL_H - GAL_TOP;
    const run = (xa: number, xb: number, z: number, yaw: number, group: number): void => {
      kit.wallPanel((xa + xb) / 2, z, xb - xa, yaw, { h: rise, y: GAL_TOP, tone: 'warm', group });
    };
    for (const [z, yaw] of [[S.south, 0], [S.north, Math.PI]] as const) {
      run(wx0, A5_WALL.x, z, yaw, G_INNER);
      run(A5_WALL.x, wx1, z, yaw, G_APRON);
    }
    kit.wallPanel(S.east, (wz0 + wz1) / 2, wz1 - wz0, -Math.PI / 2, { h: rise, y: GAL_TOP, tone: 'warm', group: G_APRON });
    kit.wallPanel(S.west, (wz0 + wz1) / 2, wz1 - wz0, Math.PI / 2, { h: HALL_H - WALL_TOP, y: WALL_TOP, tone: 'warm', group: G_INNER });
  });

  // ---- A5-21: the props kit (PROPS.md 3 A5): the two beam towers at the gateway's posts (visual only, no collision written), eleven cable trays over the trench ----
  const props = new FacilityProps();
  // (S3-7 S1) the lenses are the beams' emitters, not lamps of a light circuit: they follow the laser's own state (`PropPlacement.device`: dark while the panel is jammed or the beams are off)
  for (const t of A5_TOWERS) props.add('beamTower', t.x, t.z, t.yaw, { device: A5_LASER });
  props.row('cableTray', A5_TRAY.x0, A5_TRAY.z, A5_TRAY.x1, A5_TRAY.z, { y: A5_TRAY.y });
  tally(b, p.register, 'A5-21', "Props kit: the two beam towers at (58, 33.2) and (58, 38.8) facing each other across the gateway, visual only (no collision written: the greybox's posts, beam line and 6 m gap are untouched; each tower's skin stands 0.07 m off its post's end face so the voxel fit's 3 cm probe there stays air), and eleven cable trays hung 3.0 m up on the north wall over the trench (no collision). The transformers, drums, switchgear and kiosk props are not placed: the greybox's visible boxes would hide them (skins instead, A5-15 to A5-18)", () => {
    // (placements only: `props.write(b)` is deliberately not called)
  });
  p.props.push(...props.placements);

  // ---- A5-22: the switchgear run's old footprint (z 44.6-45.0) keeps its collision as an invisible filler: only the visible run was shortened (S567-check polish 3) ----
  tally(b, p.register, 'A5-22', "Switchgear run's old end (z 44.6-45.0, x 40.3-41.1, 2.3 m): an invisible noLedge filler, so a body stands exactly where it did when the run reached z 45 and the back door's open leaf no longer clips a visible box", () => {
    const from = b.boxes.length;
    b.box((GEAR.x0 + GEAR.x1) / 2, GEAR.h / 2, (GEAR.z1 + GEAR.fill) / 2, GEAR.x1 - GEAR.x0, GEAR.h, GEAR.fill - GEAR.z1, STEEL, 0, 0, true, false);
    b.mark(from, { noLedge: true });
  });
  return p;
}
