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
 */
import type { CourseDevice, FlagGate, PickupGate } from '../../../game/course/courseDef';
import type { LaserPanelDef } from '../../../game/laserPanels';
import { KIT_BOX_COLOR, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { makeCone } from '../../lights';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { marlowCourseGroups } from '../../lighting/marlowCircuits';
import { applyGreybox, throwGateway, type ThrowGatewayOpts } from '../ctcourseGreybox';
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
/** The switchgear run against the west wall (inside), 2.3 m. */
const GEAR = { x0: 40.3, x1: 41.1, z0: 37, z1: 45, h: 2.3 } as const;
/** The cable trench's lids (flush, `metal`): along the north wall behind pen 2. */
export const A5_TRENCH: [number, number, number, number] = [46.15, 46.6, 57.85, 47.75];

/** The kiosk flood (group 52): a cone on a bracket 0.25 m off the switchroom's south face, aimed at the strip. */
export const A5_FLOOD = { x: 44.5, y: 4.2, z: 35.6, aim: [51.5, 0, 34] as const, outer: 0.55, radius: 10.5, intensity: 1.5 } as const;
/** The kiosk's panel light (group 53): in front of its keypad, small, so a body beside it stays under the cut band. */
export const A5_KIOSK_LAMP = { x: 47.5, y: 1.45, z: 33.0, radius: 1.2, intensity: 0.1 } as const;

const SODIUM: [number, number, number] = [1.0, 0.72, 0.36];
const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
const CONCRETE = '#6b6a63';
const TRANSFORMER = '#5f6b5c';
const DRUM = '#4a3a2a';
const STEEL = '#5c6268';

export function buildA5Substation(b: LevelBuilder, _kit: FacilityKit): SetPart {
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
  p.laserPanels.push({ ...A5_PANEL });
  p.register.push({ id: 'A5-3', element: 'Beam power panel panel-a5 high on the switchroom\'s south face (43.0, 3.2, 35.85), facing the gateway: jammable, shown in electro (a laser panel, no builder piece)' });

  // ---- A5-10: the cable drums on the apron ----
  tally(b, p.register, 'A5-10', 'Cable-drum stack 1.8 m, x 62.1-64.3, z 29.4-33.0 (one collide box, a solo-standable top 4.1 m off the beam line: BEAM_KEEP_CLEAR 4.0, A5-D1)', () => {
    slab(A5_DRUMS.x0, A5_DRUMS.x1, A5_DRUMS.z0, A5_DRUMS.z1, 0, A5_DRUMS.h, DRUM, { noLedge: false });
  });

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
    bulkhead(69.55, 29.5, 50, false, 9, 1.2);
    bulkhead(69.55, 38.5, 50, false, 9, 1.2);
    bulkhead(64.0, 47.55, 50, true, 9, 1.0);
    bulkhead(57.65, 27.0, 51, false, 9, 1.0);
    bulkhead(51.0, 24.45, 51, true, 9, 1.2);
    bulkhead(46.35, 44.5, 51, false, 7, 1.0);
    b.light({ x: 43.1, y: 3.7, z: 41.0, radius: 5, intensity: 0.8, color: WHITE, group: 51, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.05, sz: 0.6, oy: 0.025 } });
    const k = A5_KIOSK_LAMP;
    b.light({ x: k.x, y: k.y, z: k.z, radius: k.radius, intensity: k.intensity, color: WHITE, group: 53, electric: true, destructible: true, fixture: { sx: 0.06, sy: 0.08, sz: 0.2, oy: 0 } });
  });
  for (const [k, gr] of Object.entries(marlowCourseGroups())) if (k.startsWith('a5-')) p.groups[k] = gr;
  // wall switches: the apron's on the L4 wall north of the door's glass slot, the inner zone's inside the front door (the lure)
  p.switches.push({ id: 'a5-sw-apron', group: 50, pos: { x: 69.7, y: 1.2, z: 36.0 }, yaw: -Math.PI / 2 });
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
  return p;
}
