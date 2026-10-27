/**
 * A4 the Goods Shed (SPEC section 9 "A4 - Set 4, the Goods Shed"; set doc `docs/marlow-final/sets/a4GoodsShed.md`; PLAN slice 4,
 * steps 2-4: greybox, lights, guards / objective steps / e2e). A port warehouse with its CCTV office. It teaches the security
 * room's timed camera loop (N3: take the duty officer, loop the three floor cameras for 60 s) and, optionally, the dual takedown on
 * the talking pair at the dock; the dock wicket is L4's own east door, held by an `egress` gate on a push bar.
 *
 * Ground, three set boxes (the walls on the box edges are `facility.ts`'s; plan faces are the wall faces, 0.25 m in from a centre line):
 * - the security room x 100-106.6, z 13-19.6 (3.0 m ceiling slab, every piece `noLedge`): the officer's post, the console desk on the north
 *   wall, the room switch by L3's door, and the passage door in the wall infill at x 101.7-102.9 (the facility leaves x 101-104 open);
 * - the staff passage x 101-104, z 19.6-24 (the facility's side walls, the gallery's underside the ceiling at 4.2): dark, open to the floor;
 * - the goods floor x 76-112, z 24-48 (10 m to the roof): the back aisle (z 24.25-27.3, the dark pocket), racking R1 (z 27.3-29.7) and R2
 *   (z 33.2-35.6) in two runs each (x 86-95 and 98.5-108), 5.4 m, solid, `noLedge`; aisle 2 between them; the cross aisle x 95-98.5; the
 *   east lane x 108-111.75; the 8.4 m main aisle z 35.6-44; the pick mezzanine x 86-106, z 44-47.75 (a solid 3.3 m block, chequer plate,
 *   `noLedge` all round, a rail on every open edge) with a stair at each end along the north wall (20 risers of 0.165, 1.2 m wide, the
 *   west stair rising east from x 80.3, the east stair rising west from x 111.7); the dispatch office x 76-82.6, z 38-44 (2.9 m clear, clear
 *   glazing on its south and east faces, the door on the south face, the kettle counter on the west wall, no lamp); the dock at the west end
 *   (the desk, two pallet stacks, the push bar at the wicket).
 * Every block 1.9 m or taller is `noLedge`: nothing in A4 is climbable alone (no co-op lip; the mezzanine's 3.3 m edge is in the solo
 * wall-jump band, so it has no lip and the stairs are the only way up). Prototype starting values (G10).
 *
 * Devices: the console (N3, 60 s loop, 20 s re-arm) and its pickup gate `g-a4-console`; cameras C1-C3 on the console's flag; the push bar and
 * the egress gate `g-a4-wicket` on L4's east door. Lights (LIGHTING-PLAN 3, A4): security room 40, floor high-bays 41, aisle strips 42,
 * mezzanine strips 43 (two-way), the bulk-store row 49 is dead (no lamp: the back aisle stays dark).
 *
 * Dressing (slice 4 step 5, SPEC 6, M5: a port warehouse and its CCTV office inside the luxury hall, so it keeps its own materials - profiled
 * sheeting on a concrete plinth, blue and orange pallet racking, chequer plate, a painted dispatch hut, a 1970s foreman's office - and only the
 * hall above the set takes the kit's charcoal panels and coves):
 * - the greybox's boxes, lamps, doors, devices, guards and steps are untouched; the dressing is appended after them (the one edit inside the
 *   greybox is the mezzanine rails' circuit: their LED line now sits on group 43, no box moved);
 * - everything built by hand is a thin visual skin (no collision, `noLedge`, one side under `CANON_MIN_THICK`, so it is out of the canonical light
 *   shapes: the bake, the meter and the guards see the greybox as built): the room's, the passage's and the hut's linings, floor paint, the racking's
 *   backing, end guards and aisle boards, the deck's plate, the stairs' rails (visual; the open south side also has a collision rail, below), the stacks' pallets and wrap, the dock desk, the roller shutter, the push
 *   bar's housing, the walls' sheeting and stanchions, roof ties and cables, the dead bulk-store fittings, camera brackets, oil stains;
 * - the one collision the stairs' rails add: the open south side's collision rail (kit.handrail, invisible noLedge, nine 0.55 m segments a flight from the
 *   third tread to the deck face, S34-check polish 4), so a body cannot step off the flights; the foot, the flights and the strip south of them stay open;
 * - the props kit's two areas are budgeted apart (the security room, the warehouse floor): the room takes the CCTV wall and the console desk, the floor
 *   takes 24 racking bays with their 8 closing frames and one parked reach truck. The racking and the desk stand over greybox solids (their boxes are
 *   the greybox's: nothing written); the video wall and the truck have their own boxes, written `noLedge` and kept off every tested line;
 * - kit panels with accent coves above 7.5 m on the four floor walls, each on its circuit's group (floor 41; over the deck 43). No lamp is added.
 */
import type { GuardInfo } from '../../../ai/guardInfo';
import type { EgressGate, PickupGate } from '../../../game/course/courseDef';
import type { CameraDevice } from '../../../security/data';
import { KIT_BOX_COLOR, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { marlowCourseGroups } from '../../lighting/marlowCircuits';
import { stairSteps } from '../ctcourseGreybox';
import { FacilityProps } from '../../props/facilityProps';
import { L4_EAST_DOOR } from './facility';
import { emptyPart, HALL_H, tally, type SetPart } from './types';

/** The three guards' squad slot ids: the duty officer, and the loaders by the dispatch desk (D1 the man nearest the office, D2 the kettle man). */
export const A4_OFFICER = 'a4-officer';
export const A4_DOCK1 = 'a4-dock1';
export const A4_DOCK2 = 'a4-dock2';
/** What the officer gives up when held (set doc section 2, P14). */
export const A4_OFFICER_INFO: GuardInfo = {
  lines: ['The console loops the floor cameras. Sixty seconds, then they reboot.', 'Those two at the dock only split when the kettle boils.'],
};

/** The console (course device and N3 console), its pickup gate, the flag the cameras name, the timed loop, the three cameras. */
export const A4_CONSOLE = 'a4-console';
export const A4_GATE = 'g-a4-console';
export const A4_LOOP_FLAG = 'a4-loop';
export const A4_LOOP = { seconds: 60, rearm: 20 } as const;
export const A4_CAMERAS = ['cam-a4-c1', 'cam-a4-c2', 'cam-a4-c3'] as const;
/** The push bar on the dock wall and the egress gate on L4's east door (A4-D3). */
export const A4_PUSHBAR = 'a4-pushbar';
export const A4_WICKET_GATE = 'g-a4-wicket';
/** The two course doors the set builds: the room's passage door and the dispatch office door. */
export const A4_PASSAGE_DOOR = 'A4-passage';
export const A4_OFFICE_DOOR = 'A4-office';
/** The flag both players west of x 84 set, its pass zone's box (floor level only: the mezzanine does not count). */
export const A4_WEST_FLAG = 'a4-west';
export const A4_WEST_ZONE: [number, number, number, number] = [76.3, 24.3, 84, 47.7];

/** The facility's wall faces round the floor (walls are 0.5 m on the box edges): the walkable floor x 76.25-111.75, z 24.25-47.75. */
export const A4_FLOOR = { x0: 76.25, x1: 111.75, z0: 24.25, z1: 47.75 } as const;
/** The security room's inner faces (the facility's 0.5 m walls on x 100 / 106.6 and z 13 / 19.6). */
export const A4_ROOM = { x0: 100.25, x1: 106.35, z0: 13.25, z1: 19.35, ceilY: 3.0 } as const;
/** The officer's post, his console and the console's standing point (the press spot is reach 1.4 from it). */
export const A4_POST = { x: 104.8, z: 17.6 } as const;
export const A4_CONSOLE_AT = { x: 105.6, z: 18.25 } as const;
/** The passage door (hinge on its west jamb, leaf along +x) in the infill of the wall's opening x 101-104. */
export const A4_PASSAGE = { x0: 101.7, x1: 102.9, h: 2.1, wallZ: 19.6, open: [101, 104] as [number, number], top: 4.2 } as const;

/** The rack runs (two blocks in each of two rows), their height and the aisles between them. */
export const A4_RACK_X: readonly (readonly [number, number])[] = [[86, 95], [98.5, 108]];
export const A4_RACK_Z: readonly (readonly [number, number])[] = [[27.3, 29.7], [33.2, 35.6]];
export const A4_RACK_H = 5.4;
/** The pick mezzanine: its plan (x0, x1, z0, z1 against the north wall's face), deck height, the rail's inset and height. */
export const A4_MEZZ = { x0: 86, x1: 106, z0: 44, z1: 47.75, deck: 3.3, rail: 1.1, inset: 0.2 } as const;
/** The two stairs: width, the strip along the north wall they stand in, their feet and the direction each rises (+1 east, -1 west). */
export const A4_STAIR = { w: 1.2, z0: 46.55, z1: 47.75, westFoot: 80.3, eastFoot: 111.7 } as const;
/** The stairs' open-side rail (S34-check polish 4; A6's `A6_STAIR_RAIL` idiom): `kit.handrail` in stepped segments of `seg` m along x at z `z` (0.05 m outside
 *  the flights' open south edge z0, so it never narrows the 1.2 m flight), from each flight's third tread (x `west.from` / `east.from`: the foot stays open to
 *  step on) to the deck face (x `west.to` / `east.to`, where the deck's rail ends); each segment's collision box starts at the floor line at its low end and
 *  stands `h` m over the line at its high end. Nine segments a flight. */
export const A4_STAIR_RAIL = { z: A4_STAIR.z0 - 0.05, seg: 0.55, h: 1.1, west: { from: 81.05, to: 86 }, east: { from: 110.95, to: 106 } } as const;
/** The dispatch office (wall centre lines, 0.2 m walls, 2.9 m clear), its door, glazing band and the kettle counter and standing point. */
export const A4_OFFICE = { x0: 76, z0: 38, x1: 82.6, z1: 44, t: 0.2, wallH: 2.9, roofT: 0.1, sill: 0.9, head: 2.5 } as const;
export const A4_OFFICE_DOOR_X: [number, number] = [77.7, 78.9];
/** The solid pier east of the door that carries the floor switch; the glazing starts at x 80. */
export const A4_PIER_X = 80.0;
export const A4_KETTLE = { x: 76.95, z: 39.5 } as const;
/** The dock: the desk (1.0 m), the stacks (1.2 m) and the loaders' posts. */
export const A4_DESK = { x0: 79.2, x1: 80.8, z0: 32.6, z1: 33.4, h: 1.0 } as const;
export const A4_STACK_N = { x0: 79.8, x1: 81.0, z0: 35.1, z1: 35.9, h: 1.2 } as const;
export const A4_STACK_S = { x0: 79.0, x1: 80.2, z0: 30.1, z1: 30.9, h: 1.2 } as const;
export const A4_D1 = { x: 80.0, z: 34.4 } as const;
export const A4_D2 = { x: 80.0, z: 31.6 } as const;
/** The crouch spots: feet 0.3 m off each stack's far face, back to it (the `wallLow` state), 1.84 m from the man the stack stands behind - inside
 *  the over-cover takedown reach (`TAKEDOWN.coverReach` 1.9). The doc's stacks 1.4 m behind each man left the far face 2.2 m out (set doc A4-C7). */
export const A4_SPOT_N = { x: 80.4, z: 36.2 } as const;
export const A4_SPOT_S = { x: 79.6, z: 29.8 } as const;

/**
 * D2's timed loop (a master clock of 40 s, `PatrolRoute.loop`): he stands at the desk until loop time 17, walks round the desk and up
 * x 78.3 to the office door and the kettle, stops 5 s there facing west (his back to the door), and walks back. A walker that arrives
 * early waits for `leave`, so the clock never drifts. The leave times allow the walker's 0.45 m arrival radius at 0.9 m/s.
 */
export const A4_DOCK2_ROUTE: [number, number][] = [[80, 31.6], [78.4, 31.8], [78.3, 37.3], [78.3, 38.5], [76.95, 39.5], [78.3, 38.5], [78.3, 37.3], [78.4, 31.8]];
export const A4_DOCK2_LOOP = { period: 40, leave: [17, 18.4, 24.0, 24.9, 31.3, 32.7, 33.6, 39.3], t0: 0 } as const;
/** At the desk he faces north across it at D1; at the kettle west at the counter (NaN: look along the next leg). */
export const A4_DOCK2_FACES = [0, Number.NaN, Number.NaN, Number.NaN, -Math.PI / 2, Number.NaN, Number.NaN, Number.NaN];

// ---- dressing (slice 4 step 5) ----
/** The circuits the kit's accent coves follow: the floor high-bays (41) for the hall walls, the mezzanine strips (43) over the deck and on its rails. */
const G_FLOOR = 41;
const G_MEZZ = 43;
/** A dressing skin's thickness (m) and the thinnest side a skin may have: under `CANON_MIN_THICK` (0.05, `voxel/lightShapes.ts`) the canonical light
 *  shapes leave it out, so dressing never moves the bake, the meter or what a guard sees. */
const SKIN = 0.03;
const THIN = 0.05;
/** Where the props kit's pieces stand. The video wall is on the room's east wall (the north wall's 3.7 m would cross the passage door's swing), the
 *  console desk over the greybox desk (0.02 m up, its skin 5 cm proud of the greybox box at the front: no coplanar face), the reach truck parked
 *  nose north in the east lane's south end (out of C1's frame, the shadow route and every tested line). */
export const A4_PROPS = {
  monitorWall: { x: 106.35, z: 15.2, yaw: -Math.PI / 2 },
  securityDesk: { x: 105.15, z: 19.0, y: 0.02, yaw: Math.PI },
  reachTruck: { x: 110.6, z: 25.85, yaw: -Math.PI / 2 },
} as const;
/** Each racking row's centre line (z) and fronts (the south rows face the aisle south of them): back to back, 0.2 m flue between the two 1.1 m bays. */
export const A4_RACK_ROWS: readonly { z: number; flip: boolean }[] = [
  { z: 27.85, flip: true },
  { z: 29.15, flip: false },
  { z: 33.75, flip: true },
  { z: 35.05, flip: false },
];
/** The roller shutter on the dock's west face (the doc's z 37-40 straddles the office's south wall at z 38: moved south of it), the push bar's housing. */
export const A4_SHUTTER = { z0: 35.0, z1: 37.8, h: 3.0 } as const;
/** The hall walls' panel height line: the gallery glazing's top, the roof tie's height. */
const EAVE = 7.5;
/** Own materials (a warehouse's sheeting and racking, chequer plate, a painted dispatch hut, a foreman's office). */
const LOOK = {
  black: '#1d1f20',
  white: '#e5e5de',
  red: '#b5282d',
  yellow: '#c9a227',
  green: '#3f5a49',
  cream: '#cdc6b3',
  trim: '#d9d8cf',
  concrete: '#46453f',
  sheet: '#56626a',
  sheetRail: '#46515a',
  frame: '#3b4147',
  steel: '#6a7077',
  steelDark: '#3a3f44',
  pipe: '#7d8286',
  plate: '#585d61',
  seam: '#2f3336',
  stain: '#222527',
  tie: '#2a2d30',
  wood: '#6b5a43',
  timber: '#8a6a43',
  cork: '#a8763e',
  carpet: '#38404a',
  mat: '#2a2d30',
  tile: '#d4d4cb',
  vinyl: '#5d675f',
  lino: '#4f433b',
  rackBack: '#16181a',
  rackTop: '#24272a',
  rackBlue: '#27508c',
  rackOrange: '#c0561a',
  wrap: '#cfd6dc',
  hut: '#d8d9d2',
  hutBase: '#3a3f44',
  door: '#4a6a8a',
  shutter: '#7c858c',
  coatA: '#2a3345',
  coatB: '#4a4a35',
  vest: '#c9651c',
  laminate: '#8a7355',
} as const;
/** The 7-segment strokes of the aisle numbers 1-3 on the rack ends. */
const DIGITS = { 1: 'bc', 2: 'abged', 3: 'abgcd' } as const;

const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
const RACK = '#6a5a44';
const CRATE = '#7a6b52';
const STEEL = '#8d949b';
const PLATE = '#585d61';
const DESK = '#3a3226';

/** Lamp radius and intensity per circuit (night levels re-tuned under the LR16 light model in LR16-M to the levels tuned with `CTLIGHT_WRITE=a4GoodsShed`). */
const LAMP = {
  room: { radius: 5, intensity: 0.21 },
  bay: { radius: 9, intensity: 1.05 },
  aisle: { radius: 5, intensity: 0.22 },
  mezz: { radius: 5.5, intensity: 0.33 },
} as const;

/** (J14) `opts.replan`: the re-planned yard (`ctcourseReplan`); the pieces the re-plan removes are guarded, the rest is in `replan/a4GoodsShed.ts`. */
export function buildA4GoodsShed(b: LevelBuilder, kit: FacilityKit, opts: { replan?: boolean } = {}): SetPart {
  const p = emptyPart('a4GoodsShed');
  /** A box from x0 to x1, z0 to z1, y0 to y1; `noLedge` unless told otherwise. */
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string, opts: { overhead?: boolean; noLedge?: boolean } = {}): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
    b.mark(from, { noLedge: opts.noLedge ?? true, ...(opts.overhead ? { overhead: true } : {}) });
  };

  // ---- A4-1 / A4-2: the security room (ceiling, desk) and the passage's infill and door ----
  const room = A4_ROOM;
  tally(b, p.register, 'A4-1', "Security room: a 3.0 m ceiling slab under the hall's roof (overhead, noLedge), the console desk on the north wall (0.75 m); the walls are the facility's", () => {
    slab(room.x0, room.x1, room.z0, room.z1, room.ceilY, room.ceilY + 0.2, KIT_BOX_COLOR, { overhead: true });
    slab(104.0, room.x1, 18.6, room.z1, 0, 0.75, DESK);
  });
  const pg = A4_PASSAGE;
  tally(b, p.register, 'A4-2', "Staff passage: the infill of the room wall's opening (x 101-104, to the gallery's underside at 4.2), the 1.2 x 2.1 passage door at x 101.7-102.9 with its lintel; the side walls are the facility's", () => {
    const t = 0.5;
    slab(pg.open[0], pg.x0, pg.wallZ - t / 2, pg.wallZ + t / 2, 0, pg.top, KIT_BOX_COLOR);
    slab(pg.x1, pg.open[1], pg.wallZ - t / 2, pg.wallZ + t / 2, 0, pg.top, KIT_BOX_COLOR);
    slab(pg.x0, pg.x1, pg.wallZ - t / 2, pg.wallZ + t / 2, pg.h, pg.top, KIT_BOX_COLOR);
    p.doors[A4_PASSAGE_DOOR] = b.door(pg.x0, 0, pg.wallZ, pg.x1 - pg.x0, Math.PI / 2, { height: pg.h }).id;
  });

  // ---- A4-3: the pallet racking: two rows of two runs, 5.4 m, solid, noLedge ----
  tally(b, p.register, 'A4-3', 'Pallet racking 5.4 m: R1 (z 27.3-29.7) and R2 (z 33.2-35.6), each in two runs x 86-95 and 98.5-108; solid, noLedge (never climbable; aisles 3.0 / 3.5 / 3.5 / 4 m, no split gap)', () => {
    for (const [z0, z1] of A4_RACK_Z) for (const [x0, x1] of A4_RACK_X) slab(x0, x1, z0, z1, 0, A4_RACK_H, RACK);
  });

  // ---- A4-4: the pick mezzanine: a solid deck block, the two stairs with their undersides filled, the rails, the chequer plate ----
  const mz = A4_MEZZ;
  const st = stairSteps(mz.deck);
  const stairLen = st.len;
  tally(b, p.register, 'A4-4', 'Pick mezzanine: a solid 3.3 m block x 86-106, z 44-47.75 (noLedge, closed store below), chequer plate (metal, loud x1.6), 1.1 m rails on the three open edges; the two stairs (20 risers) with their ramp colliders and noLedge fillers under the flights', () => {
    slab(mz.x0, mz.x1, mz.z0, mz.z1, 0, mz.deck, PLATE);
    b.surface('metal', mz.x0, mz.x1, mz.z0, mz.z1, mz.deck);
    const rail = { y: mz.deck, h: mz.rail, group: G_MEZZ };
    kit.handrail(mz.x0 + mz.inset, mz.z0 + mz.inset, mz.x1 - mz.inset, mz.z0 + mz.inset, rail);
    kit.handrail(mz.x0 + mz.inset, mz.z0 + mz.inset, mz.x0 + mz.inset, A4_STAIR.z0 - 0.1, rail);
    kit.handrail(mz.x1 - mz.inset, mz.z0 + mz.inset, mz.x1 - mz.inset, A4_STAIR.z0 - 0.1, rail);
    const zc = (A4_STAIR.z0 + A4_STAIR.z1) / 2;
    // west stair: foot at x 80.3, rising east to the deck's west face; east stair: foot at x 111.7, rising west to its east face
    const flights = [
      { foot: A4_STAIR.westFoot, up: 1, yaw: Math.PI / 2 },
      { foot: A4_STAIR.eastFoot, up: -1, yaw: -Math.PI / 2 },
    ] as const;
    for (const f of flights) {
      b.stairs(f.foot + (f.up * stairLen) / 2, zc, A4_STAIR.w, stairLen, mz.deck, st.steps, PLATE, f.yaw, 0);
      // the underside: 0.5 m slices of invisible solid up to 0.05 m under the ramp collider's nosing line at each slice's low end
      for (let k = 0; k < Math.ceil(stairLen / 0.5 - 1e-9); k++) {
        const a0 = Math.min(k * 0.5, stairLen);
        const a1 = Math.min(a0 + 0.5, stairLen);
        const hgt = (mz.deck * a0) / stairLen - 0.05;
        if (hgt < 0.05) continue;
        const xa = f.up === 1 ? f.foot + a0 : f.foot - a1;
        const xb = f.up === 1 ? f.foot + a1 : f.foot - a0;
        const from = b.boxes.length;
        b.box((xa + xb) / 2, hgt / 2, zc, xb - xa, hgt, A4_STAIR.w, STEEL, 0, 0, true, false);
        b.mark(from, { noLedge: true });
      }
      // chequer plate on the flight, a surface per metre of its slope
      for (let a0 = 0; a0 < stairLen - 1e-9; a0 += 1) {
        const a1 = Math.min(a0 + 1, stairLen);
        const xa = f.up === 1 ? f.foot + a0 : f.foot - a1;
        const xb = f.up === 1 ? f.foot + a1 : f.foot - a0;
        b.surface('metal', xa, xb, A4_STAIR.z0, A4_STAIR.z1, (mz.deck * (a0 + a1)) / 2 / stairLen);
      }
    }
  });

  // ---- A4-5 / A4-10: the dispatch office (walls, clear glazing, door, roof) and the kettle counter ----
  const of = A4_OFFICE;
  const hw = of.t / 2;
  const xe = of.x1 + hw;
  tally(b, p.register, 'A4-5', 'Dispatch office x 76-82.6, z 38-44: 0.2 m walls to 2.9 m, clear glazing (collision-only, light passes) on the south face x 80-82.6 and the east face above a 0.9 m sill, the 1.2 x 2.1 door at x 77.7-78.9 on the south face, a flat roof to 3.0 (overhead, noLedge); no lamp tonight', () => {
    const west = A4_FLOOR.x0;
    // south wall z 38: the west pier, the door's lintel, the pier east of the door (the floor switch), then base / glass / head
    slab(west, A4_OFFICE_DOOR_X[0], of.z0 - hw, of.z0 + hw, 0, of.wallH, KIT_BOX_COLOR);
    slab(A4_OFFICE_DOOR_X[0], A4_OFFICE_DOOR_X[1], of.z0 - hw, of.z0 + hw, 2.1, of.wallH, KIT_BOX_COLOR);
    slab(A4_OFFICE_DOOR_X[1], A4_PIER_X, of.z0 - hw, of.z0 + hw, 0, of.wallH, KIT_BOX_COLOR);
    slab(A4_PIER_X, xe, of.z0 - hw, of.z0 + hw, 0, of.sill, KIT_BOX_COLOR);
    slab(A4_PIER_X, xe, of.z0 - hw, of.z0 + hw, of.head, of.wallH, KIT_BOX_COLOR);
    kit.glass(A4_PIER_X, of.z0, of.x1, of.z0, of.head - of.sill, { y: of.sill });
    // east wall x 82.6 between the south and north walls: base, glass, head
    slab(of.x1 - hw, xe, of.z0 + hw, of.z1 - hw, 0, of.sill, KIT_BOX_COLOR);
    slab(of.x1 - hw, xe, of.z0 + hw, of.z1 - hw, of.head, of.wallH, KIT_BOX_COLOR);
    kit.glass(of.x1, of.z0 + hw, of.x1, of.z1 - hw, of.head - of.sill, { y: of.sill });
    // north wall z 44 (behind it the strip to the west stair), the flat roof
    slab(west, xe, of.z1 - hw, of.z1 + hw, 0, of.wallH, KIT_BOX_COLOR);
    slab(west, xe, of.z0 - hw, of.z1 + hw, of.wallH, of.wallH + of.roofT, KIT_BOX_COLOR, { overhead: true });
    // the door: hinge on the west jamb, the leaf along +x
    p.doors[A4_OFFICE_DOOR] = b.door(A4_OFFICE_DOOR_X[0], 0, of.z0, A4_OFFICE_DOOR_X[1] - A4_OFFICE_DOOR_X[0], Math.PI / 2, { height: 2.1 }).id;
  });
  // (J14) the re-plan removes the kettle loop (PLAN section 2): no counter, D2 stays at the desk
  if (!opts.replan) {
    tally(b, p.register, 'A4-10', "The kettle: a 0.9 m counter on the office's west wall (x 76.25-76.6, z 39.0-40.2); D2 stops at (76.95, 39.5) facing it", () => {
      slab(A4_FLOOR.x0, 76.6, 39.0, 40.2, 0, 0.9, DESK);
    });
  }

  // ---- A4-11 / A4-12 / A4-13: the dock's stacks, desk and shutter ----
  tally(b, p.register, 'A4-11', "Pallet stacks 1.2 m at the dock (tonight's dispatch waiting): N x 79.8-81, z 35.1-35.9 behind D1, S x 79-80.2, z 30.1-30.9 behind D2; low cover, each 0.7 m behind its man so a crouched body against its far face is inside the over-cover takedown reach", () => {
    for (const s of [A4_STACK_N, A4_STACK_S]) slab(s.x0, s.x1, s.z0, s.z1, 0, s.h, CRATE, { noLedge: false });
  });
  tally(b, p.register, 'A4-12', "Dock desk 1.0 m, x 79.2-80.8, z 32.6-33.4 (the loaders' booking desk: not low cover)", () => {
    slab(A4_DESK.x0, A4_DESK.x1, A4_DESK.z0, A4_DESK.z1, 0, A4_DESK.h, DESK, { noLedge: false });
  });
  p.register.push({ id: 'A4-13', element: 'Dock roller shutter x 76 face, z 37-40, closed (dressing, no opening)' });

  // ---- the push bar, the egress gate on L4's east door (A4-D3), the console and its gate, the three cameras ----
  tally(b, p.register, 'A4-6', "Dock wicket: L4's east door (the facility's, built locked) released from the floor side by the push bar at (76.5, 34.6): an `egress` gate, a course device, no piece of its own", () => {});
  p.devices[A4_PUSHBAR] = { x: 76.5, y: 0, z: 34.6, yaw: Math.PI / 2, label: 'Push the bar' };
  p.bay.gates.push({ kind: 'egress', id: A4_WICKET_GATE, switchId: A4_PUSHBAR, doorIds: [L4_EAST_DOOR] } satisfies EgressGate);
  p.devices[A4_CONSOLE] = { x: A4_CONSOLE_AT.x, y: 0, z: A4_CONSOLE_AT.z, yaw: Math.PI, label: 'Loop the cameras' };
  p.consoles.push({ id: A4_CONSOLE, guard: A4_OFFICER, flag: A4_LOOP_FLAG, seconds: A4_LOOP.seconds, rearm: A4_LOOP.rearm });
  p.bay.gates.push({ kind: 'pickup', id: A4_GATE, switchId: A4_CONSOLE, flag: A4_LOOP_FLAG, perPlayer: false } satisfies PickupGate);
  const cam = (id: string, at: [number, number], facing: number, half: number, aim: number, reason: string): CameraDevice => ({
    id,
    kind: 'camera',
    level: 'ground',
    at,
    y: 3.0,
    facing,
    sweep: [facing - half, facing + half],
    aim,
    range: 14,
    room: 'A4',
    reason,
    offFlag: A4_LOOP_FLAG,
  });
  tally(b, p.register, 'A4-7', 'Cameras C1-C3 on the console flag `a4-loop`: C1 on the east wall down the main aisle, C2 on the mezzanine face down the cross aisle, C3 over the wicket on the dock (mounts 3.0 m, under the 3.3 m deck)', () => {});
  p.cameras.push(
    cam(A4_CAMERAS[0], [111.5, 39.8], 270, 15, 11, "Warehouse CCTV: the main aisle's east half and the east lane's north end"),
    cam(A4_CAMERAS[1], [96.75, 43.6], 180, 10, 12, "Warehouse CCTV: the cross aisle and its crossings of the back aisle and aisle 2"),
    cam(A4_CAMERAS[2], [76.4, 33.0], 90, 20, 8, "Warehouse CCTV: the dock, the loaders' desk and the main aisle's west end"),
  );

  // ---- A4-8 / A4-9: the lights (LIGHTING-PLAN 3, A4; the circuits are `MARLOW_CIRCUITS` 40-43, 49 is dead) ----
  const panel = (x: number, z: number): void => {
    b.light({ x, y: 2.95, z, radius: LAMP.room.radius, intensity: LAMP.room.intensity, color: WHITE, group: 40, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.05, sz: 0.6, oy: 0.025 } });
  };
  const bay = (x: number, z: number): void => {
    b.light({ x, y: 7.2, z, radius: LAMP.bay.radius, intensity: LAMP.bay.intensity, color: WHITE, group: 41, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.3, sz: 0.6, oy: 0.15 } });
  };
  const strip = (x: number, y: number, z: number, group: number, radius: number, intensity: number): void => {
    b.light({ x, y, z, radius, intensity, color: WHITE, group, electric: true, destructible: true, fixture: { sx: 1.6, sy: 0.12, sz: 0.2, oy: 0.06 } });
  };
  tally(b, p.register, 'A4-8', 'Lights: security room panels 40 (2, switch by the L3 door), floor high-bays 41 (8: the dock, the main aisle, the east lane; switch at the dispatch office), aisle strips 42 (6 over aisle 2, switch at the west end), mezzanine strips 43 (4, two-way at both stair heads)', () => {
    for (const [x, z] of [[102, 16.3], [105, 16.3]] as const) panel(x, z);
    for (const [x, z] of [[79.5, 33], [80, 39.8], [86, 39.8], [92, 39.8], [98, 39.8], [104, 39.8], [110, 39.8], [110, 35]] as const) bay(x, z);
    for (const x of [87.5, 90.5, 93.5, 100, 103, 106]) strip(x, 5.6, 31.45, 42, LAMP.aisle.radius, LAMP.aisle.intensity);
    for (const x of [89, 94, 99, 104]) strip(x, 6.3, 46, 43, LAMP.mezz.radius, LAMP.mezz.intensity);
  });
  p.register.push({ id: 'A4-9', element: 'South back aisle (z 24.25-27.3, x 84-110): the bulk-store row on motion sensors, off tonight (group 49, dead: no lamp), the dark pocket `a4-back`' });
  for (const [k, g] of Object.entries(marlowCourseGroups())) if (k.startsWith('a4-')) p.groups[k] = g;
  // wall switches: the room's by L3's door, the floor's on the pier at the office door, the aisles' at the west end, the mezzanine's two (both stair heads, on the north wall)
  p.switches.push({ id: 'a4-sw-sec', group: 40, pos: { x: 101.2, y: 1.2, z: room.z0 + 0.05 }, yaw: 0 });
  p.switches.push({ id: 'a4-sw-floor', group: 41, pos: { x: 79.4, y: 1.2, z: of.z0 - hw - 0.05 }, yaw: Math.PI });
  p.switches.push({ id: 'a4-sw-aisles', group: 42, pos: { x: A4_FLOOR.x0 + 0.05, y: 1.2, z: 28.0 }, yaw: Math.PI / 2 });
  p.switches.push({ id: 'a4-sw-mezz-w', group: 43, pos: { x: 87.0, y: mz.deck + 1.2, z: A4_FLOOR.z1 - 0.05 }, yaw: Math.PI });
  p.switches.push({ id: 'a4-sw-mezz-e', group: 43, pos: { x: 105.0, y: mz.deck + 1.2, z: A4_FLOOR.z1 - 0.05 }, yaw: Math.PI });
  // the set at its standby fill by level (SPEC 7; the doc's four zones: the room, the passage, the floor, the mezzanine deck)
  p.ambientZones.push({ id: 'A4', box: [76, 24, 112, 48], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 7.4 });
  p.ambientZones.push({ id: 'a4-secroom', box: [100, 13, 107, 20], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 2.9 });
  p.ambientZones.push({ id: 'a4-passage', box: [101, 20, 104, 24], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 4.1 });
  p.ambientZones.push({ id: 'a4-mezz', box: [86, 44, 106, 48], ambient: MARLOW_LEVEL.standby, minY: 2.8, maxY: 7.4 });

  // ---- the guards, the steps, the claim, the pass zone, the radio ----
  p.squads[A4_OFFICER] = { kind: 'officer', x: A4_POST.x, z: A4_POST.z, yaw: 0, info: A4_OFFICER_INFO };
  p.squads[A4_DOCK1] = { kind: 'grunt', x: A4_D1.x, z: A4_D1.z, yaw: Math.PI };
  p.squads[A4_DOCK2] = { kind: 'grunt', x: A4_D2.x, z: A4_D2.z, yaw: 0, route: A4_DOCK2_ROUTE, faces: A4_DOCK2_FACES, loop: { period: A4_DOCK2_LOOP.period, leave: [...A4_DOCK2_LOOP.leave], t0: A4_DOCK2_LOOP.t0 } };
  p.bay.squad.push(A4_OFFICER, A4_DOCK1, A4_DOCK2);
  // the first player to press the console takes B (a press refused while the officer is up claims nothing); until then the lead (P2 in this even set) reads A
  p.bay.roles = [{ role: 'b', press: [A4_CONSOLE] }];
  p.passZones.push({ id: 'a4-p-west', box: A4_WEST_ZONE, flag: A4_WEST_FLAG, floorY: 0 });
  p.externalFlags.push(A4_WEST_FLAG);
  p.objectives.push(
    {
      id: 'a4-room',
      bay: 'A4',
      text: 'Take the duty officer quietly, then loop the floor cameras from his desk.',
      a: 'Take the officer from behind while your partner waits.',
      b: 'Use the console once the officer is down.',
      done: { flag: A4_LOOP_FLAG },
    },
    {
      id: 'a4-floor',
      bay: 'A4',
      text: 'The cameras are blind for sixty seconds. Cross to the dock.',
      a: 'Main aisle: move fast while the cameras are looped.',
      b: 'Back aisle or mezzanine: keep out of the lit rows.',
      done: { flag: A4_WEST_FLAG },
      timer: A4_GATE,
    },
    {
      id: 'a4-dock',
      bay: 'A4',
      text: 'Two at the dock desk. Take one each, together, or wait for the kettle.',
      a: 'Take the man nearest the office when your partner is set.',
      b: 'Take the man nearest the racking when your partner is set.',
      done: { gate: A4_WICKET_GATE },
      timer: A4_GATE,
    },
    { id: 'a4-lock', bay: 'A4', text: 'Both of you into holding room four. There is a medkit there.' },
  );
  p.bay.radio.push(
    { at: 'enter', text: "The duty officer's console loops the floor cameras for sixty seconds. Don't dawdle." },
    { at: A4_GATE, text: 'Cameras looped. Go.' },
    { at: `warn:${A4_GATE}`, text: 'Cameras back in five.' },
  );
  // bodies are dragged to these: the office's west corner, the passage, the end bay beside R1's west run
  p.hideSpots.push({ x: 76.95, y: 0, z: 43.2 }, { x: 102.5, y: 0, z: 22.6 }, { x: 85.1, y: 0, z: 28.5 });

  // ---- spaces, nav, debug points, light and shot spots ----
  p.camSpaces.push(
    { box: [100, 13, 106.6, 19.6], size: 'tight' },
    { box: [101, 19.6, 104, 24], size: 'tight' },
    { box: [76, 24, 112, 48], size: 'open' },
    { box: [76, 24, 112, 27.3], size: 'tight' },
    { box: [86, 29.7, 108, 33.2], size: 'tight' },
    { box: [95, 24, 98.5, 44], size: 'tight' },
    { box: [108, 24, 112, 44], size: 'tight' },
    { box: [76, 38, 82.6, 44], size: 'tight' },
    { box: [76, 44, 86, 48], size: 'tight' },
    { box: [86, 44, 106, 48], y: [2.8, 8], size: 'tight' },
  );
  p.navSeeds.push(
    { x: 103, y: 0, z: 15.4 },
    { x: 102.5, y: 0, z: 22 },
    { x: 92, y: 0, z: 25.8 },
    { x: 97, y: 0, z: 31.4 },
    { x: 92, y: 0, z: 39.8 },
    { x: 82, y: 0, z: 33 },
    { x: 79, y: 0, z: 41 },
    { x: 83, y: 0, z: 45.3 },
    { x: 110, y: 0, z: 30 },
    { x: 96, y: mz.deck, z: 46 },
  );
  p.debugPoints.push(
    { id: 'A4-entry', label: 'Set 4 entry (L3 door)', pos: { x: 103, y: 0, z: 14.4 }, yaw: 0 },
    { id: 'A4-behind', label: 'Set 4 behind the officer', pos: { x: 104.8, y: 0, z: 15.8 }, yaw: 0 },
    { id: 'A4-console', label: 'Set 4 console', pos: { x: 105.6, y: 0, z: 17.3 }, yaw: 0 },
    { id: 'A4-mouth', label: 'Set 4 passage mouth (the back aisle)', pos: { x: 102.5, y: 0, z: 24.6 }, yaw: -Math.PI / 2 },
    { id: 'A4-west', label: 'Set 4 back aisle west end', pos: { x: 84.5, y: 0, z: 25.8 }, yaw: -0.64 },
    { id: 'A4-mid', label: 'Set 4 middle (the main aisle)', pos: { x: 92, y: 0, z: 39.8 }, yaw: -Math.PI / 2 },
    { id: 'A4-spotN', label: 'Set 4 crouch spot behind stack N', pos: { x: A4_SPOT_N.x, y: 0, z: A4_SPOT_N.z }, yaw: Math.PI },
    { id: 'A4-spotS', label: 'Set 4 crouch spot behind stack S', pos: { x: A4_SPOT_S.x, y: 0, z: A4_SPOT_S.z }, yaw: 0 },
    { id: 'A4-pushbar', label: 'Set 4 push bar (the wicket)', pos: { x: 77.6, y: 0, z: 34.6 }, yaw: -Math.PI / 2 },
  );
  p.lightSpots.push(
    { name: 'A4 secroom', kind: 'body', x: 103.3, y: 0, z: 16.3, band: 'read' },
    { name: 'A4 secroom cut', kind: 'body', x: 103.3, y: 0, z: 16.3, band: 'cut', off: [40] },
    { name: 'A4 passage', kind: 'body', x: 102.5, y: 0, z: 22, band: 'pocket' },
    { name: 'A4 mouth', kind: 'body', x: 102.5, y: 0, z: 24.6, band: 'pocket' },
    { name: 'A4 back aisle', kind: 'body', x: 90, y: 0, z: 25.8, band: 'pocket' },
    { name: 'A4 back aisle west end', kind: 'body', x: 84.5, y: 0, z: 25.8, band: 'pocket' },
    { name: 'A4 crossing', kind: 'body', x: 96.75, y: 0, z: 25.8, band: 'pocket' },
    { name: 'A4 main aisle', kind: 'body', x: 92, y: 0, z: 39.8, band: 'pool' },
    { name: 'A4 main aisle east', kind: 'body', x: 104, y: 0, z: 39.8, band: 'pool' },
    { name: 'A4 dock', kind: 'body', x: 80, y: 0, z: 33, band: 'pool' },
    { name: 'A4 aisle 2', kind: 'body', x: 90.5, y: 0, z: 31.45, band: 'read' },
    { name: 'A4 aisle 2 east', kind: 'body', x: 103, y: 0, z: 31.45, band: 'read' },
    { name: 'A4 east lane', kind: 'body', x: 110, y: 0, z: 33, band: 'read' },
    { name: 'A4 mezzanine', kind: 'body', x: 96, y: mz.deck, z: 46, band: 'read' },
    { name: 'A4 main aisle cut', kind: 'body', x: 92, y: 0, z: 39.8, band: 'cut', off: [41] },
    { name: 'A4 dock cut', kind: 'body', x: 80, y: 0, z: 33, band: 'cut', off: [41] },
    { name: 'A4 kettle cut', kind: 'body', x: 77.5, y: 0, z: 39.5, band: 'cut', off: [41] },
    { name: 'A4 aisle 2 cut', kind: 'body', x: 90.5, y: 0, z: 31.45, band: 'cut', off: [42] },
    { name: 'A4 mezzanine cut', kind: 'body', x: 96, y: mz.deck, z: 46, band: 'cut', off: [41, 43] },
    { name: 'A4 kettle', kind: 'body', x: 77.5, y: 0, z: 39.5, band: 'cut', off: [] },
    { name: 'A4 floor', kind: 'surf', x: 92, y: 0.05, z: 39.8, band: 'any' },
    { name: 'A4 standby', kind: 'body', x: 92, y: 0, z: 39.8, band: 'standby' },
  );
  p.shotVantages.push(
    { name: 'a4-room-door', feet: [103, 0, 14.4], cam: [102.2, 1.7, 14.0], target: [104.8, 1.4, 17.6] },
    { name: 'a4-mouth', feet: [102.5, 0, 24.6], cam: [103.6, 1.7, 25.4], target: [84, 1.2, 26.0] },
    { name: 'a4-main-aisle-east', feet: [110, 0, 40], cam: [110.8, 1.8, 40.6], target: [78, 1.5, 35.0] },
  );
  // ---- dressing (slice 4 step 5; SPEC 6, PROPS.md 3 / 5, KIT.md): appended after the greybox, which it does not touch ----
  /** A visual-only skin [x0, x1] x [y0, y1] x [z0, z1]: no collision, `noLedge`, one side under `THIN` (out of the light shapes). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    if (Math.min(x1 - x0, y1 - y0, z1 - z0) >= THIN) throw new Error(`a4GoodsShed: the dressing skin at (${x0}, ${y0}, ${z0}) is not thin`);
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
    b.mark(from, { noLedge: true });
  };
  type Side = 'n' | 's' | 'e' | 'w';
  type Runs = readonly (readonly [number, number])[];
  /** A skin on the face of an axis-aligned block: `side` is the face's outward direction ('s' -z, 'n' +z, 'w' -x, 'e' +x), `at` the face's plane (z for
   *  n / s, x for e / w), [a0, a1] the run along it (x for n / s, z for e / w), `layer` how many skins out (each `SKIN` thick). */
  const face = (side: Side, at: number, a0: number, a1: number, y0: number, y1: number, color: string, layer = 0): void => {
    const o0 = layer * SKIN;
    const o1 = (layer + 1) * SKIN;
    if (side === 'n') skin(a0, a1, y0, y1, at + o0, at + o1, color);
    else if (side === 's') skin(a0, a1, y0, y1, at - o1, at - o0, color);
    else if (side === 'e') skin(at + o0, at + o1, y0, y1, a0, a1, color);
    else skin(at - o1, at - o0, y0, y1, a0, a1, color);
  };
  /** Floor paint (a few mm proud, no collision). */
  const paint = (x0: number, x1: number, z0: number, z1: number, color: string, top = 0.012): void => skin(x0, x1, 0, top, z0, z1, color);
  /** A thin post (4 cm square) from y0 to y1 at (x, z). */
  const post = (x: number, y0: number, y1: number, z: number, color: string): void => skin(x - 0.02, x + 0.02, y0, y1, z - 0.02, z + 0.02, color);
  /** An aisle number 1-3 in 7-segment strokes (0.2 x 0.36 m) on a face: `centre` along the face, `dir` the way the reader's right runs along it. */
  const digit = (n: 1 | 2 | 3, side: Side, at: number, centre: number, y0: number, dir: 1 | -1, color: string, layer: number): void => {
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
  /** A white sign plate with a dark text bar (text waits for a texture, KIT.md 6) on a face. */
  const sign = (side: Side, at: number, a0: number, a1: number, y0: number, y1: number, bar: string, layer = 0): void => {
    face(side, at, a0, a1, y0, y1, LOOK.white, layer);
    face(side, at, a0 + 0.08, a1 - 0.08, (y0 + y1) / 2 - 0.03, (y0 + y1) / 2 + 0.03, bar, layer + 1);
  };
  /** A wall's lining over each run: a skirting, a dado panel in `lower` to `dado`, a rail, then `upper` to `top`. */
  const lining = (side: Side, at: number, runs: Runs, top: number, lower: string, upper: string, dado = 1.1): void => {
    for (const [a, e] of runs) {
      face(side, at, a, e, 0, 0.1, LOOK.frame);
      face(side, at, a, e, 0.1, dado, lower);
      face(side, at, a, e, dado, dado + 0.04, LOOK.trim, 1);
      face(side, at, a, e, dado + 0.04, top, upper);
    }
  };
  /** The two stairs' ramp colliders (the greybox's), west then east: the rails below are pitched like them. */
  const ramps = b.boxes.filter((q) => q.collide && Math.abs(q.pitch) > 1e-3 && q.c[2] > 46 && q.c[0] > 76 && q.c[0] < 112).sort((q, r) => q.c[0] - r.c[0]);
  /** A rail along a flight's slope (pitched like its collider), `lift` above the nosing line, [z0, z1] wide; thin in cross-section. */
  const slopeRail = (ramp: (typeof ramps)[number], z0: number, z1: number, lift: number, color: string): void => {
    const from = b.boxes.length;
    b.box(ramp.c[0], mz.deck / 2 + lift, (z0 + z1) / 2, z1 - z0, 0.04, ramp.s[2], color, ramp.yaw, ramp.pitch, false);
    b.mark(from, { noLedge: true });
  };
  const fl = A4_FLOOR;

  // ---- A4-14: the security room: foreman's office lining, ceiling tiles, carpet, the notice boards, a chair ----
  tally(b, p.register, 'A4-14', "Security room dressing (visual skins, no collision): carpet and door mat, green dado and cream upper walls with skirting and rail, ceiling tiles on a T-bar grid, the passage door's architrave and a plate over it, cable trunking, a whiteboard, notice board, clock, key cabinet, first-aid box, extinguisher and the room switch's back plate, the officer's chair beside the desk", () => {
    const r = A4_ROOM;
    paint(r.x0, r.x1, r.z0, r.z1, LOOK.carpet, 0.008);
    paint(102.2, 103.8, r.z0, r.z0 + 0.7, LOOK.mat, 0.014);
    paint(104.1, 106.2, 17.95, 18.45, LOOK.mat, 0.012);
    lining('e', r.x0, [[r.z0, r.z1]], r.ceilY, LOOK.green, LOOK.cream);
    lining('w', r.x1, [[17.1, r.z1]], r.ceilY, LOOK.green, LOOK.cream);
    face('w', r.x1, r.z0, 17.1, 2.6, r.ceilY, LOOK.cream);
    lining('n', r.z0, [[r.x0, 101.8], [105.65, r.x1]], r.ceilY, LOOK.green, LOOK.cream);
    lining('s', r.z1, [[r.x0, A4_PASSAGE.x0], [A4_PASSAGE.x1, r.x1]], r.ceilY, LOOK.green, LOOK.cream);
    // the passage door: architrave on the room side and a plate over it
    face('s', r.z1, A4_PASSAGE.x0 - 0.06, A4_PASSAGE.x0, 0, A4_PASSAGE.h + 0.06, LOOK.trim, 1);
    face('s', r.z1, A4_PASSAGE.x1, A4_PASSAGE.x1 + 0.06, 0, A4_PASSAGE.h + 0.06, LOOK.trim, 1);
    face('s', r.z1, A4_PASSAGE.x0 - 0.06, A4_PASSAGE.x1 + 0.06, A4_PASSAGE.h, A4_PASSAGE.h + 0.06, LOOK.trim, 1);
    sign('s', r.z1, 101.8, 102.8, 2.3, 2.55, LOOK.black, 1);
    // the ceiling: tiles under the slab on a T-bar grid (the two panels stand flush in it)
    skin(r.x0, r.x1, r.ceilY - 0.012, r.ceilY, r.z0, r.z1, LOOK.tile);
    for (let x = r.x0 + 0.6; x < r.x1 - 0.1; x += 0.6) skin(x - 0.01, x + 0.01, r.ceilY - 0.022, r.ceilY - 0.012, r.z0, r.z1, LOOK.seam);
    for (let z = r.z0 + 0.6; z < r.z1 - 0.1; z += 0.6) skin(r.x0, r.x1, r.ceilY - 0.022, r.ceilY - 0.012, z - 0.01, z + 0.01, LOOK.seam);
    // the north wall: a trunking run and its drop behind the desk, the camera schedule board
    face('s', r.z1, r.x0, r.x1, 2.5, 2.58, LOOK.pipe, 1);
    face('s', r.z1, 104.0, 104.1, 0.78, 2.58, LOOK.pipe, 1);
    face('s', r.z1, 104.4, 105.9, 1.55, 2.15, LOOK.white, 1);
    for (const [e, y] of [[105.3, 1.7], [105.6, 1.85], [105.3, 2.0]] as const) face('s', r.z1, 104.5, e, y, y + 0.04, LOOK.black, 2);
    // the west wall: whiteboard with its frame, notice board with notes, clock, key cabinet, extinguisher
    face('e', r.x0, 14.0, 15.4, 1.25, 2.1, LOOK.white, 1);
    for (const [a, e, y0, y1] of [[14.0, 15.4, 2.07, 2.1], [14.0, 15.4, 1.25, 1.28], [14.0, 14.03, 1.25, 2.1], [15.37, 15.4, 1.25, 2.1]] as const) face('e', r.x0, a, e, y0, y1, LOOK.steel, 2);
    for (const [a, e, y] of [[14.15, 14.9, 1.8], [14.15, 15.1, 1.6], [14.15, 14.6, 1.4]] as const) face('e', r.x0, a, e, y, y + 0.03, y === 1.4 ? LOOK.red : LOOK.rackBlue, 2);
    face('e', r.x0, 16.2, 17.4, 1.3, 2.0, LOOK.cork, 1);
    for (const [a, e, y] of [[16.3, 16.55, 1.7], [16.7, 16.95, 1.45], [17.0, 17.25, 1.75], [16.75, 17.0, 1.85]] as const) face('e', r.x0, a, e, y, y + 0.2, LOOK.white, 2);
    face('e', r.x0, 17.7, 17.98, 2.4, 2.68, LOOK.white, 1);
    face('e', r.x0, 17.83, 17.85, 2.5, 2.62, LOOK.black, 2);
    face('e', r.x0, 17.83, 17.92, 2.5, 2.52, LOOK.black, 2);
    face('e', r.x0, 18.2, 18.9, 1.4, 2.0, LOOK.steel, 1);
    face('e', r.x0, 18.54, 18.56, 1.4, 2.0, LOOK.seam, 2);
    face('e', r.x0, 18.6, 18.66, 1.65, 1.75, LOOK.black, 2);
    face('e', r.x0, 13.5, 13.7, 0.5, 1.0, LOOK.red, 1);
    face('e', r.x0, 13.52, 13.68, 0.62, 0.8, LOOK.white, 2);
    // the south wall: first-aid box with its cross, the room switch's back plate (the switch stands 5 cm off the face)
    face('n', r.z0, 100.4, 100.85, 1.4, 1.8, LOOK.green, 1);
    face('n', r.z0, 100.58, 100.67, 1.45, 1.75, LOOK.white, 2);
    face('n', r.z0, 100.46, 100.79, 1.57, 1.63, LOOK.white, 2);
    face('n', r.z0, 101.1, 101.3, 1.1, 1.3, LOOK.white, 1);
    // the officer's chair beside the desk, turned to it (no seated pose in the engine: SPEC says seated, set doc self-critique 9)
    const cx = 103.4;
    const cz = 18.2;
    skin(cx - 0.23, cx + 0.23, 0.46, 0.5, cz - 0.22, cz + 0.22, LOOK.black);
    skin(cx - 0.22, cx + 0.22, 0.52, 1.0, cz - 0.24, cz - 0.2, LOOK.black);
    post(cx, 0.08, 0.46, cz, LOOK.steel);
    skin(cx - 0.28, cx + 0.28, 0.05, 0.08, cz - 0.02, cz + 0.02, LOOK.steelDark);
    skin(cx - 0.02, cx + 0.02, 0.05, 0.08, cz - 0.28, cz + 0.28, LOOK.steelDark);
    for (const [dx, dz] of [[-0.28, 0], [0.28, 0], [0, -0.28], [0, 0.28]] as const) skin(cx + dx - 0.02, cx + dx + 0.02, 0, 0.05, cz + dz - 0.02, cz + dz + 0.02, LOOK.black);
  });

  // ---- A4-15: the staff passage: vinyl floor, green and cream walls, a coat rail, extinguisher, signs, the mouth's header plate ----
  tally(b, p.register, 'A4-15', 'Staff passage dressing (visual skins, no collision): vinyl floor with a hazard strip at the mouth, green dado and cream walls with a hi-vis band, a coat rail with four coats, an extinguisher and a notice on the east wall, a staff-only plate on the header over the mouth (both faces)', () => {
    const x0 = 101.25;
    const x1 = 103.75;
    paint(x0, x1, 19.85, 24.25, LOOK.vinyl, 0.008);
    paint(x0, x1, 23.9, 24.0, LOOK.yellow, 0.012);
    lining('e', x0, [[19.85, 23.95]], 4.2, LOOK.green, LOOK.cream, 1.2);
    lining('w', x1, [[19.85, 23.95]], 4.2, LOOK.green, LOOK.cream, 1.2);
    face('e', x0, 19.85, 23.95, 1.3, 1.36, LOOK.yellow, 1);
    face('w', x1, 19.85, 23.95, 1.3, 1.36, LOOK.yellow, 1);
    face('e', x0, 21.0, 22.4, 1.75, 1.83, LOOK.wood, 1);
    for (const [z, color] of [[21.05, LOOK.coatA], [21.4, LOOK.coatB], [21.75, LOOK.vest], [22.1, LOOK.coatA]] as const) face('e', x0, z, z + 0.25, 0.8, 1.75, color, 2);
    face('w', x1, 20.4, 20.6, 0.5, 1.2, LOOK.red, 1);
    face('w', x1, 20.42, 20.58, 0.7, 0.9, LOOK.white, 2);
    sign('w', x1, 20.9, 21.9, 1.7, 2.1, LOOK.black, 1);
    sign('n', 24.25, 101.4, 103.6, 4.22, 4.48, LOOK.black);
    sign('s', 23.75, 101.4, 103.6, 4.22, 4.48, LOOK.black);
  });

  // ---- A4-16: the racking: dark backing on the greybox runs, end frames with beams and guards, aisle boards, a cap (the bays are props, A4-22) ----
  tally(b, p.register, 'A4-16', "Racking dressing (visual skins, no collision) on the four 5.4 m runs: dark backing over the greybox brown on every face and a cap on top, the end frames' blue uprights and orange beams at 1.5 / 3.0 / 4.5 m, a yellow end guard with four hazard bars, a white aisle board with its number (1 on the R1 ends, 2 on R2); floor edge lines along the aisles", () => {
    for (const [i, [z0, z1]] of A4_RACK_Z.entries()) {
      for (const [x0, x1] of A4_RACK_X) {
        face('s', z0, x0, x1, 0, A4_RACK_H, LOOK.rackBack);
        face('n', z1, x0, x1, 0, A4_RACK_H, LOOK.rackBack);
        skin(x0, x1, A4_RACK_H, A4_RACK_H + 0.01, z0, z1, LOOK.rackTop);
        for (const [side, at, dir] of [['w', x0, -1], ['e', x1, 1]] as const) {
          face(side, at, z0, z1, 0, A4_RACK_H, LOOK.rackBack);
          for (const z of [z0, z1 - 0.1]) face(side, at, z, z + 0.1, 0, A4_RACK_H, LOOK.rackBlue, 1);
          for (const y of [1.5, 3.0, 4.5]) face(side, at, z0, z1, y, y + 0.14, LOOK.rackOrange, 1);
          face(side, at, z0 + 0.1, z1 - 0.1, 0, 0.45, LOOK.yellow, 2);
          for (let k = 0; k < 4; k++) face(side, at, z0 + 0.3 + k * 0.5, z0 + 0.42 + k * 0.5, 0.05, 0.4, LOOK.black, 3);
          face(side, at, (z0 + z1) / 2 - 0.45, (z0 + z1) / 2 + 0.45, 2.55, 3.05, LOOK.white, 2);
          digit((i + 1) as 1 | 2, side, at, (z0 + z1) / 2, 2.63, dir, LOOK.black, 3);
        }
      }
    }
    // floor edge lines (yellow, 10 cm) 0.15 m off each rack face, broken at the cross aisle
    for (const [z0, z1] of A4_RACK_Z) {
      for (const [x0, x1] of A4_RACK_X) {
        paint(x0, x1, z0 - 0.25, z0 - 0.15, LOOK.yellow, 0.01);
        paint(x0, x1, z1 + 0.15, z1 + 0.25, LOOK.yellow, 0.01);
      }
    }
    paint(95.15, 95.25, 24.4, 44.0, LOOK.yellow, 0.01);
    paint(98.25, 98.35, 24.4, 44.0, LOOK.yellow, 0.01);
  });

  // ---- A4-17: the pick mezzanine: plate sheet, fascia, the closed store below, the stairs' rails, the two switches' posts ----
  const stN = fl.z1;
  const stS = A4_STAIR.z0;
  tally(b, p.register, 'A4-17', "Mezzanine dressing (visual skins; the one collision is the open side's rail): the deck's chequer-plate sheet with 1.2 m seams and a yellow edge band inside the rail, the fascia with a yellow stripe, the closed store below (plinth, sheeting, posts, a roller door and a steel door with keypad), its west and east faces, the stairs' rails (posts and a top and mid rail on the open south side, a wall rail) pitched with the flights, and the open side's 1.1 m collision rail (kit.handrail, invisible noLedge, nine stepped segments of 0.55 m a flight 0.05 m outside the flight, from the third tread to the deck face; the foot stays open to step on; accent on the mezzanine strip 43), the C2 bracket, the switches' conduit posts", () => {
    const deck = mz.deck;
    skin(mz.x0, mz.x1, deck, deck + 0.005, mz.z0, mz.z1, LOOK.plate);
    for (let x = mz.x0 + 1.2; x < mz.x1 - 0.1; x += 1.2) skin(x - 0.01, x + 0.01, deck + 0.005, deck + 0.01, mz.z0, mz.z1, LOOK.seam);
    for (const z of [45.3, 46.5]) skin(mz.x0, mz.x1, deck + 0.005, deck + 0.01, z - 0.01, z + 0.01, LOOK.seam);
    skin(mz.x0 + 0.3, mz.x1 - 0.3, deck + 0.005, deck + 0.012, mz.z0 + 0.3, mz.z0 + 0.45, LOOK.yellow);
    // the south face (the store's front): plinth, sheeting with two rails, fascia, posts
    face('s', mz.z0, mz.x0, mz.x1, 0, 0.9, LOOK.concrete);
    face('s', mz.z0, mz.x0, mz.x1, 0.9, 3.0, LOOK.sheet);
    for (const y of [1.6, 2.3]) face('s', mz.z0, mz.x0, mz.x1, y, y + 0.08, LOOK.sheetRail, 1);
    face('s', mz.z0, mz.x0, mz.x1, 3.0, deck, LOOK.frame, 1);
    face('s', mz.z0, mz.x0, mz.x1, 3.2, 3.26, LOOK.yellow, 2);
    for (const x of [86.2, 93, 99, 105.8]) face('s', mz.z0, x - 0.15, x + 0.15, 0, 3.0, LOOK.frame, 1);
    // the roller door (shut) with its hood, a sign, and a steel door with a keypad
    face('s', mz.z0, 88.2, 91.2, 0, 2.6, LOOK.shutter, 1);
    for (let y = 0.26; y < 2.55; y += 0.26) face('s', mz.z0, 88.2, 91.2, y, y + 0.03, LOOK.sheetRail, 2);
    face('s', mz.z0, 88.0, 91.4, 2.6, 2.85, LOOK.frame, 1);
    face('s', mz.z0, 88.0, 88.2, 0, 2.6, LOOK.frame, 2);
    face('s', mz.z0, 91.2, 91.4, 0, 2.6, LOOK.frame, 2);
    sign('s', mz.z0, 91.6, 92.4, 1.9, 2.2, LOOK.red, 1);
    face('s', mz.z0, 99.4, 100.5, 0, 2.1, LOOK.door, 1);
    face('s', mz.z0, 99.34, 99.4, 0, 2.16, LOOK.trim, 2);
    face('s', mz.z0, 100.5, 100.56, 0, 2.16, LOOK.trim, 2);
    face('s', mz.z0, 99.34, 100.56, 2.1, 2.16, LOOK.trim, 2);
    face('s', mz.z0, 100.38, 100.46, 1.0, 1.1, LOOK.steel, 2);
    face('s', mz.z0, 100.6, 100.75, 1.1, 1.3, LOOK.steelDark, 1);
    face('s', mz.z0, 100.64, 100.71, 1.18, 1.22, LOOK.red, 2);
    // C2's bracket (the camera hangs at (96.75, 3.0, 43.6), 0.4 m off the face)
    face('s', mz.z0, 96.6, 96.9, 2.85, 3.15, LOOK.steelDark, 1);
    skin(96.72, 96.78, 2.9, 2.94, mz.z0 - 0.4, mz.z0 - 0.06, LOOK.steelDark);
    // the deck block's west and east faces (the strips' side): plinth and sheeting, an extinguisher on each
    for (const [side, at] of [['w', mz.x0], ['e', mz.x1]] as const) {
      face(side, at, mz.z0, stS, 0, 0.9, LOOK.concrete);
      face(side, at, mz.z0, stS, 0.9, deck, LOOK.sheet);
      face(side, at, mz.z0, stS, 1.6, 1.68, LOOK.sheetRail, 1);
      face(side, at, mz.z0, stS, 2.4, 2.48, LOOK.sheetRail, 1);
      face(side, at, 45.0, 45.2, 0.6, 1.3, LOOK.red, 1);
      face(side, at, 45.02, 45.18, 0.9, 1.1, LOOK.white, 2);
    }
    // the stairs' rails: five posts on the open south side with a top and a mid rail, a wall rail with brackets on the north wall
    for (const [k, f] of [
      { foot: A4_STAIR.westFoot, up: 1 },
      { foot: A4_STAIR.eastFoot, up: -1 },
    ].entries()) {
      const ramp = ramps[k]!;
      const lineAt = (x: number): number => (deck * (f.up === 1 ? x - f.foot : f.foot - x)) / stairLen;
      for (let i = 0; i < 5; i++) {
        const x = f.foot + f.up * (0.2 + 1.35 * i);
        post(x, lineAt(x), lineAt(x) + 1.0, stS + 0.04, LOOK.steelDark);
        skin(x - 0.02, x + 0.02, lineAt(x) + 0.82, lineAt(x) + 0.9, stN - 0.06, stN, LOOK.steelDark);
      }
      slopeRail(ramp, stS + 0.02, stS + 0.06, 1.0, LOOK.steel);
      slopeRail(ramp, stS + 0.02, stS + 0.06, 0.5, LOOK.steel);
      slopeRail(ramp, stN - 0.04, stN, 0.9, LOOK.steel);
      // the open side's collision rail: the kit's balustrade and its invisible noLedge box per segment, `h` over the walking line at the high end
      const { z, seg, h } = A4_STAIR_RAIL;
      const { from, to } = f.up === 1 ? A4_STAIR_RAIL.west : A4_STAIR_RAIL.east;
      const n = Math.round(Math.abs(to - from) / seg);
      for (let k = 0; k < n; k++) {
        const xa = from + f.up * k * seg;
        const xb = xa + f.up * seg;
        kit.handrail(xa, z, xb, z, { y: lineAt(xa), h: h + (lineAt(xb) - lineAt(xa)), group: G_MEZZ });
      }
    }
    // the mezzanine switches float 5 cm off the north wall at 4.5 m: a conduit post from the deck and a back plate each
    for (const x of [87.0, 105.0]) {
      face('s', stN, x - 0.05, x + 0.05, deck, 4.65, LOOK.steelDark);
      face('s', stN, x - 0.1, x + 0.1, 4.38, 4.62, LOOK.steel, 1);
    }
  });

  // ---- A4-18: the dispatch office: painted hut outside, lining and the kettle counter inside (dark, behind its glazing) ----
  tally(b, p.register, 'A4-18', "Dispatch office dressing (visual skins, no collision): outside, a dark base course and white panel cladding on the piers, lintel and north wall, sill and head bands round the glazing, door architrave and a sign, a roof edge and felt; inside (unlit), lino, green and cream lining, the kettle counter's top, front and a shelf with the kettle and mugs, a notice board, a clock, the floor switch's back plate", () => {
    const o = A4_OFFICE;
    const hw = o.t / 2;
    const xe = o.x1 + hw;
    const zs = o.z0 - hw;
    const zn = o.z1 + hw;
    const west = fl.x0;
    // the south face z 37.9: west pier, lintel, east pier, then sill and head round the glazing
    for (const [a, e] of [[west, A4_OFFICE_DOOR_X[0]], [A4_OFFICE_DOOR_X[1], A4_PIER_X]] as const) {
      face('s', zs, a, e, 0, 0.15, LOOK.hutBase);
      face('s', zs, a, e, 0.15, o.wallH, LOOK.hut);
    }
    face('s', zs, A4_OFFICE_DOOR_X[0], A4_OFFICE_DOOR_X[1], 2.1, o.wallH, LOOK.hut);
    face('s', zs, A4_PIER_X, xe, 0, 0.15, LOOK.hutBase);
    face('s', zs, A4_PIER_X, xe, 0.15, o.sill, LOOK.hut);
    face('s', zs, A4_PIER_X, xe, o.head, o.wallH, LOOK.hut);
    face('s', zs, A4_OFFICE_DOOR_X[0] - 0.06, A4_OFFICE_DOOR_X[0], 0, 2.16, LOOK.trim, 1);
    face('s', zs, A4_OFFICE_DOOR_X[1], A4_OFFICE_DOOR_X[1] + 0.06, 0, 2.16, LOOK.trim, 1);
    face('s', zs, A4_OFFICE_DOOR_X[0] - 0.06, A4_OFFICE_DOOR_X[1] + 0.06, 2.1, 2.16, LOOK.trim, 1);
    sign('s', zs, 77.85, 78.75, 2.3, 2.6, LOOK.black, 1);
    // the east face x 82.7 and the north face z 44.1
    face('e', xe, o.z0 + hw, o.z1 - hw, 0, 0.15, LOOK.hutBase);
    face('e', xe, o.z0 + hw, o.z1 - hw, 0.15, o.sill, LOOK.hut);
    face('e', xe, o.z0 + hw, o.z1 - hw, o.head, o.wallH, LOOK.hut);
    face('n', zn, west, xe, 0, 0.15, LOOK.hutBase);
    face('n', zn, west, xe, 0.15, o.wallH, LOOK.hut);
    sign('n', zn, 78.0, 79.4, 2.2, 2.6, LOOK.black, 1);
    // the roof: an edge band all round the slab's 10 cm and a felt skin over it
    face('s', zs, west, xe, o.wallH, o.wallH + o.roofT, LOOK.trim, 1);
    face('n', zn, west, xe, o.wallH, o.wallH + o.roofT, LOOK.trim, 1);
    face('e', xe, zs, zn, o.wallH, o.wallH + o.roofT, LOOK.trim, 1);
    skin(west, xe, o.wallH + o.roofT, o.wallH + o.roofT + 0.005, zs, zn, LOOK.tie);
    // inside: lino, lining on the west and north walls and the south piers, the kettle counter (x 76.25-76.6, z 39-40.2, 0.9 m)
    paint(west, xe - hw, o.z0 + hw, o.z1 - hw, LOOK.lino, 0.008);
    lining('e', west, [[o.z0 + hw, o.z1 - hw]], o.wallH, LOOK.green, LOOK.cream);
    lining('s', o.z1 - hw, [[west, xe - hw]], o.wallH, LOOK.green, LOOK.cream);
    lining('n', o.z0 + hw, [[west, A4_OFFICE_DOOR_X[0]], [A4_OFFICE_DOOR_X[1], A4_PIER_X]], o.wallH, LOOK.green, LOOK.cream);
    skin(west, 76.65, 0.9, 0.915, 39.0, 40.2, LOOK.laminate);
    face('e', 76.6, 39.0, 40.2, 0.1, 0.9, LOOK.steelDark);
    face('e', 76.6, 39.6, 39.62, 0.12, 0.88, LOOK.black, 1);
    for (const z of [39.2, 39.8]) face('e', 76.6, z, z + 0.12, 0.78, 0.82, LOOK.steel, 1);
    // the kettle (crossed plates and a lid), two mugs, a tea tin, a shelf with four mugs above
    skin(76.3, 76.5, 0.915, 1.1, 39.46, 39.5, LOOK.steel);
    skin(76.38, 76.42, 0.915, 1.1, 39.38, 39.58, LOOK.steel);
    skin(76.3, 76.5, 1.1, 1.13, 39.4, 39.56, LOOK.black);
    for (const z of [39.75, 39.95]) skin(76.35, 76.43, 0.915, 1.0, z, z + 0.04, LOOK.white);
    skin(76.33, 76.45, 0.915, 1.0, 39.15, 39.19, LOOK.red);
    skin(west, 76.5, 1.5, 1.53, 39.0, 40.2, LOOK.wood);
    for (const z of [39.1, 39.4, 39.7, 40.0]) skin(76.3, 76.38, 1.53, 1.61, z, z + 0.04, LOOK.white);
    face('e', west, 40.6, 41.6, 1.2, 1.9, LOOK.cork, 1);
    for (const [a, e, y] of [[40.7, 40.95, 1.6], [41.05, 41.3, 1.35], [41.15, 41.4, 1.6]] as const) face('e', west, a, e, y, y + 0.2, LOOK.white, 2);
    face('e', west, 42.0, 42.28, 2.3, 2.58, LOOK.white, 1);
    face('e', west, 42.13, 42.15, 2.4, 2.52, LOOK.black, 2);
    // the floor switch's back plate on the pier (the switch stands 5 cm off the face)
    face('s', zs, 79.32, 79.48, 1.1, 1.3, LOOK.white, 1);
  });

  // ---- A4-19: the dock: the two stacks' pallets and wrap, the booking desk, the roller shutter, the push bar's housing and exit sign, floor markings ----
  tally(b, p.register, 'A4-19', "Dock dressing (visual skins, no collision): both 1.2 m stacks as a timber pallet under stretch wrap with strap bands, a label and a cap; the booking desk's laminate top, drawers and desk fittings (paper, clipboard, mugs, phone, a flat screen and keyboard); the closed roller shutter on the west face (slats, guides, hood) at z 35-37.8; the push bar's back plate and bar, a fire-exit sign over it; the wicket's keep-clear outline, and the dock's yellow lines", () => {
    for (const s of [A4_STACK_N, A4_STACK_S]) {
      for (const [side, at, a0, a1] of [['s', s.z0, s.x0, s.x1], ['n', s.z1, s.x0, s.x1], ['w', s.x0, s.z0, s.z1], ['e', s.x1, s.z0, s.z1]] as const) {
        face(side, at, a0, a1, 0, 0.14, LOOK.timber);
        for (const f of [0.3, 0.7]) face(side, at, a0 + (a1 - a0) * f - 0.06, a0 + (a1 - a0) * f + 0.06, 0.04, 0.1, LOOK.black, 1);
        face(side, at, a0, a1, 0.14, s.h, LOOK.wrap);
        for (const y of [0.5, 0.95]) face(side, at, a0, a1, y, y + 0.04, LOOK.black, 1);
      }
      skin(s.x0, s.x1, s.h, s.h + 0.01, s.z0, s.z1, LOOK.wrap);
      face(s.z0 < 33 ? 's' : 'n', s.z0 < 33 ? s.z0 : s.z1, (s.x0 + s.x1) / 2 - 0.2, (s.x0 + s.x1) / 2 + 0.2, 0.6, 0.85, LOOK.white, 2);
    }
    // the booking desk (x 79.2-80.8, z 32.6-33.4, 1.0 m): laminate top, drawers on the south face, fittings on top
    const d = A4_DESK;
    skin(d.x0, d.x1, d.h, d.h + 0.006, d.z0, d.z1, LOOK.laminate);
    face('s', d.z0, d.x0, d.x1, 0, 0.1, LOOK.black);
    for (const [a, e] of [[d.x0 + 0.1, d.x0 + 0.7], [d.x0 + 0.85, d.x1 - 0.1]] as const) {
      face('s', d.z0, a, e, 0.5, 0.95, LOOK.steelDark, 1);
      face('s', d.z0, (a + e) / 2 - 0.08, (a + e) / 2 + 0.08, 0.86, 0.88, LOOK.steel, 2);
    }
    face('n', d.z1, d.x0, d.x1, 0.1, d.h, LOOK.steelDark);
    skin(79.3, 79.6, 1.006, 1.026, 32.7, 32.92, LOOK.white);
    skin(79.7, 79.95, 1.006, 1.016, 33.0, 33.2, LOOK.cork);
    skin(79.72, 79.92, 1.016, 1.02, 33.03, 33.17, LOOK.white);
    for (const x of [80.15, 80.3]) skin(x, x + 0.07, 1.006, 1.09, 32.7, 32.74, LOOK.white);
    skin(80.4, 80.6, 1.006, 1.026, 32.75, 32.9, LOOK.steelDark);
    skin(79.6, 80.0, 1.006, 1.016, 33.2, 33.32, LOOK.black);
    skin(79.7, 79.9, 1.016, 1.3, 33.28, 33.31, LOOK.black);
    skin(79.78, 79.82, 1.016, 1.1, 33.28, 33.34, LOOK.steelDark);
    // the closed roller shutter on the west face (slats, guides, hood), south of the office
    const sh = A4_SHUTTER;
    face('e', fl.x0, sh.z0, sh.z1, 0, sh.h, LOOK.shutter, 1);
    for (let y = 0.3; y < sh.h - 0.05; y += 0.3) face('e', fl.x0, sh.z0, sh.z1, y, y + 0.03, LOOK.sheetRail, 2);
    for (const z of [sh.z0 - 0.12, sh.z1]) face('e', fl.x0, z, z + 0.12, 0, sh.h + 0.4, LOOK.frame, 1);
    face('e', fl.x0, sh.z0 - 0.12, sh.z1 + 0.12, sh.h, sh.h + 0.4, LOOK.frame, 1);
    face('e', fl.x0 + 0.15, sh.z0 - 0.12, sh.z1 + 0.12, sh.h, sh.h + 0.4, LOOK.frame);
    skin(fl.x0 + 0.06, fl.x0 + 0.21, sh.h + 0.4, sh.h + 0.43, sh.z0 - 0.12, sh.z1 + 0.12, LOOK.frame);
    face('e', fl.x0, sh.z0 + 0.1, sh.z0 + 0.5, 0.9, 1.0, LOOK.black, 2);
    sign('e', fl.x0, sh.z0 + 0.9, sh.z1 - 0.9, 3.55, 3.85, LOOK.red, 2);
    // the push bar at (76.5, 1.0, 34.6): a back plate, the bar itself, a fire-exit sign above (the device draws its own button)
    face('e', fl.x0, 34.3, 34.9, 0.85, 1.15, LOOK.steelDark, 1);
    skin(fl.x0 + 0.06, fl.x0 + 0.1, 0.97, 1.03, 34.34, 34.86, LOOK.red);
    face('e', fl.x0, 34.3, 34.9, 2.2, 2.45, LOOK.green, 1);
    face('e', fl.x0, 34.4, 34.8, 2.3, 2.35, LOOK.white, 2);
    // the wicket's keep-clear outline (the door's swing) and the dock's yellow lines
    for (const [x0, x1, z0, z1] of [[fl.x0, 78.2, 31.1, 31.2], [fl.x0, 78.2, 34.8, 34.9], [78.1, 78.2, 31.1, 34.9]] as const) paint(x0, x1, z0, z1, LOOK.yellow, 0.01);
    paint(78.1, 78.2, 24.5, 31.1, LOOK.yellow, 0.01);
    paint(78.1, 78.2, 34.9, 37.9, LOOK.yellow, 0.01);
  });

  // ---- A4-20: the hall's own walls (sheeting on a concrete plinth, stanchions on the 6 m grid), roof ties and cables, the dead bulk-store fittings, camera brackets, floor paint and stains ----
  tally(b, p.register, 'A4-20', "Warehouse shell dressing (visual skins, no collision): concrete plinth, profiled sheeting, rails and frame stanchions on the south, west, east and north walls (4.5 m under the gallery glazing, 7.5 m on the east and north-east walls; the passage mouth, L4's door gap and the push bar left clear), the three camera brackets, a fire point, roof ties over the aisle strips, the high-bays and the back aisle with the strips' cables, six dead bulk-store fittings over the back aisle (group 49: no lamp, no light), oil stains", () => {
    const wall = (side: Side, at: number, runs: Runs, y0: number, y1: number, posts: readonly number[]): void => {
      const rails = [1.8, 2.7, 3.6, 4.5, 5.4, 6.3].filter((y) => y > y0 + 0.3 && y < y1 - 0.4);
      for (const [a, e] of runs) {
        if (y0 === 0) face(side, at, a, e, 0, 0.9, LOOK.concrete);
        face(side, at, a, e, Math.max(y0, 0.9), y1, LOOK.sheet);
        for (const y of rails) face(side, at, a, e, y, y + 0.08, LOOK.sheetRail, 1);
        face(side, at, a, e, y1 - 0.12, y1, LOOK.frame, 1);
        for (const q of posts) if (q - 0.15 >= a && q + 0.15 <= e) face(side, at, q - 0.15, q + 0.15, y0, y1 - 0.12, LOOK.frame, 1);
      }
    };
    wall('n', fl.z0, [[fl.x0, 100.75], [104.25, fl.x1]], 0, 4.5, [78, 84, 90, 96, 108]);
    wall('e', fl.x0, [[fl.z0, 31.0], [35.0, 37.9], [44.1, fl.z1]], 0, 4.5, [30, 36, 46]);
    wall('e', fl.x0, [[31.0, 35.0]], 2.5, 4.5, []);
    wall('w', fl.x1, [[fl.z0, fl.z1]], 0, EAVE, [30, 36, 42]);
    wall('s', fl.z1, [[fl.x0, 86]], 0, 4.5, [78, 84]);
    wall('s', fl.z1, [[86, 106]], A4_MEZZ.deck, 4.5, [90, 96, 102]);
    wall('s', fl.z1, [[106, fl.x1]], 0, EAVE, [108]);
    // a fire point on the south wall, camera brackets for C1 (east wall) and C3 (west wall above the wicket)
    face('n', fl.z0, 79.85, 80.15, 0.9, 1.5, LOOK.red, 2);
    face('n', fl.z0, 79.85, 80.15, 1.55, 1.85, LOOK.white, 2);
    face('w', fl.x1, 39.65, 39.95, 2.85, 3.15, LOOK.steelDark, 2);
    skin(111.5, fl.x1 - 0.06, 2.9, 2.94, 39.77, 39.83, LOOK.steelDark);
    // the aisle switch's back plate on the west wall (the switch stands 5 cm off the face at z 28.0)
    face('e', fl.x0, 27.9, 28.1, 1.1, 1.3, LOOK.white, 2);
    face('e', fl.x0, 32.85, 33.15, 2.85, 3.15, LOOK.steelDark, 2);
    skin(fl.x0 + 0.06, 76.4, 2.9, 2.94, 32.97, 33.03, LOOK.steelDark);
    // the roof ties (I-beams over the lamps' lines) and the cables the strips and the dead fittings hang on
    for (const z of [25.8, 31.45, 39.8, 46]) {
      skin(fl.x0, fl.x1, 7.55, 7.85, z - 0.015, z + 0.015, LOOK.tie);
      for (const y of [7.55, 7.83]) skin(fl.x0, fl.x1, y, y + 0.02, z - 0.1, z + 0.1, LOOK.tie);
    }
    const hung: [number, number, number][] = [
      ...[87.5, 90.5, 93.5, 100, 103, 106].map((x): [number, number, number] => [x, 5.72, 31.45]),
      ...[89, 94, 99, 104].map((x): [number, number, number] => [x, 6.42, 46]),
    ];
    for (const [x, y, z] of hung) for (const dx of [-0.7, 0.7]) post(x + dx, y, 7.55, z, LOOK.tie);
    for (const x of [86, 90, 94, 98, 102, 106]) {
      skin(x - 0.75, x + 0.75, 5.6, 5.64, 25.71, 25.89, LOOK.steelDark);
      skin(x - 0.05, x + 0.05, 5.56, 5.6, 25.75, 25.85, LOOK.white);
      for (const dx of [-0.6, 0.6]) post(x + dx, 5.64, 7.55, 25.8, LOOK.tie);
    }
    // floor paint: oil stains on the main aisle, the dock, the cross aisle
    for (const [x0, x1, z0, z1] of [[88.2, 89.4, 38.4, 39.1], [94.6, 95.8, 41.2, 41.9], [101.2, 102.4, 37.1, 37.7], [83.0, 84.1, 40.2, 40.8], [80.6, 81.7, 33.6, 34.2], [96.0, 97.2, 30.8, 31.5], [106.8, 107.9, 42.0, 42.6], [90.2, 91.3, 31.0, 31.6]] as const) paint(x0, x1, z0, z1, LOOK.stain, 0.006);
  });

  // ---- A4-21: the hall above the set (kit panels with accent coves, each on its circuit; no lamp) ----
  tally(b, p.register, 'A4-21', "Kit panels above the floor (visual): the hall's charcoal panels and coves from 7.5 m (the gallery glazing's top, the roof tie) to the roof on the south, west and east walls and the north wall's two ends (the floor high-bays, 41) and over the deck (the mezzanine strips, 43)", () => {
    const c = 0.09;
    const rise = HALL_H - EAVE;
    kit.wallPanel((fl.x0 + fl.x1) / 2, fl.z0, fl.x1 - fl.x0 - 2 * c, 0, { h: rise, y: EAVE, tone: 'warm', group: G_FLOOR });
    kit.wallPanel(fl.x0, (fl.z0 + fl.z1) / 2, fl.z1 - fl.z0 - 2 * c, Math.PI / 2, { h: rise, y: EAVE, tone: 'warm', group: G_FLOOR });
    kit.wallPanel(fl.x1, (fl.z0 + fl.z1) / 2, fl.z1 - fl.z0 - 2 * c, -Math.PI / 2, { h: rise, y: EAVE, tone: 'warm', group: G_FLOOR });
    for (const [a, e, g] of [[fl.x0 + c, 86, G_FLOOR], [86, 106, G_MEZZ], [106, fl.x1 - c, G_FLOOR]] as const) kit.wallPanel((a + e) / 2, fl.z1, e - a, Math.PI, { h: rise, y: EAVE, tone: 'warm', group: g });
  });

  // ---- A4-22: the props kit (PROPS.md 3 A4). Two areas, one budget each: the security room, the warehouse floor ----
  const roomProps = new FacilityProps();
  // (S3-7 S1) the room's screens and lamps are on the security room's panels (40), the truck's beacon on the floor high-bays (41)
  roomProps.add('monitorWall', A4_PROPS.monitorWall.x, A4_PROPS.monitorWall.z, A4_PROPS.monitorWall.yaw, { group: 40 });
  roomProps.add('securityDesk', A4_PROPS.securityDesk.x, A4_PROPS.securityDesk.z, A4_PROPS.securityDesk.yaw, { y: A4_PROPS.securityDesk.y, group: 40 });
  const floorProps = new FacilityProps();
  for (const row of A4_RACK_ROWS) for (const [x0, x1] of A4_RACK_X) floorProps.row('palletRackBay', x0, row.z, x1, row.z, { flip: row.flip });
  floorProps.add('reachTruck', A4_PROPS.reachTruck.x, A4_PROPS.reachTruck.z, A4_PROPS.reachTruck.yaw, { group: G_FLOOR });
  tally(b, p.register, 'A4-22', "Props kit: the CCTV video wall (3 x 3 screens, its plinth and frame boxes against the room's east wall) and the console desk over the greybox desk (its box is the greybox's); in the warehouse 24 racking bays in eight back-to-back rows with their closing frames over the four greybox runs (the runs' boxes are the collision) and one reach truck parked in the east lane's south end (chassis solid, envelope see-through, both noLedge). The prop boxes written are the video wall's and the truck's only", () => {
    const own = new FacilityProps();
    own.placements.push(...roomProps.placements.filter((q) => q.prop === 'monitorWall'), ...floorProps.placements.filter((q) => q.prop === 'reachTruck'));
    const from = b.boxes.length;
    own.write(b);
    b.mark(from, { noLedge: true });
  });
  p.props.push(...roomProps.placements, ...floorProps.placements);

  return p;
}
