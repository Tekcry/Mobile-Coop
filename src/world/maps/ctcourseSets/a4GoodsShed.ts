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
 */
import type { GuardInfo } from '../../../ai/guardInfo';
import type { EgressGate, PickupGate } from '../../../game/course/courseDef';
import type { CameraDevice } from '../../../security/data';
import { KIT_BOX_COLOR, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { marlowCourseGroups } from '../../lighting/marlowCircuits';
import { stairSteps } from '../ctcourseGreybox';
import { L4_EAST_DOOR } from './facility';
import { emptyPart, tally, type SetPart } from './types';

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

const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
const RACK = '#6a5a44';
const CRATE = '#7a6b52';
const STEEL = '#8d949b';
const PLATE = '#585d61';
const DESK = '#3a3226';

/** Lamp radius and intensity per circuit (prototype values, tuned with `CTLIGHT_WRITE=a4GoodsShed`). */
const LAMP = {
  room: { radius: 5, intensity: 0.8 },
  bay: { radius: 9, intensity: 1.15 },
  aisle: { radius: 5, intensity: 1.25 },
  mezz: { radius: 5.5, intensity: 0.9 },
} as const;

export function buildA4GoodsShed(b: LevelBuilder, kit: FacilityKit): SetPart {
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
    const rail = { y: mz.deck, h: mz.rail };
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
  tally(b, p.register, 'A4-10', "The kettle: a 0.9 m counter on the office's west wall (x 76.25-76.6, z 39.0-40.2); D2 stops at (76.95, 39.5) facing it", () => {
    slab(A4_FLOOR.x0, 76.6, 39.0, 40.2, 0, 0.9, DESK);
  });

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
    { at: 'enter', text: "The duty officer's console loops the floor cameras. Sixty seconds. Don't dawdle." },
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
  return p;
}
