/**
 * J14 Marlow re-plan, A4 the Goods Shed (slice G-A4; PLAN section 2, STATIONS.md A4): the re-plan's own pieces, called from
 * `ctcourse.ts` right after the set builder when the map is built with `{ replan: true }`. It imports the set file's constants
 * and the pure `types.ts` (the facility imports nothing from here), so there is no cycle.
 *
 * What it adds to the built set (the set file only drops the kettle counter, `if (!opts.replan)`):
 * - one floor route (Q24, M4): the passage, the back aisle's east part and the cross aisle (`a4-cross`), the main aisle, the
 *   dock. Pallet-rack end frames (5.4 m, the racks' height, solid, `noLedge`) close the back aisle west of x 95 (at x 95 and at
 *   its dock mouth x 86) and its east end (x 108), aisle 2's mouths (x 95 and x 98.5 on the cross aisle, x 86 on the dock) and
 *   the east lane across its north mouth (z 35.6, x 108-111.75); a locked hoarding (2.4 m, `noLedge`) closes each mezzanine
 *   stair's foot; the dispatch office door is locked for good (a flag gate whose key nothing hands out);
 * - station 9 (deadweight, stand-in): the counterweighted lift grille `A4-grille` across the passage mouth (x 101-104, in the
 *   wall's opening at z 24), its header to the gallery's underside, the motor button `a4-grille-motor` on the passage side.
 *   Gates: the stand-in `g-a4-grille-motor` (a lever: the button as its switch, the grille as its door; the base opens it as
 *   station 9 goes live while `deadweight` is not playable, R1 fix 7) and KS1's `g-a4-grille` (an egress gate on the same door,
 *   so either one opens it; today on the same button, so the grille opens only through the stand-in; KS1 re-points it);
 * - stations 9, 8, 10 (STATIONS section 3, verbatim), the done-flag pass zones `a4-grille` and `a4-wicket`, LANTERN's retry
 *   lines, one objective line per station and the holding-room line;
 * - the kettle loop out: `a4-dock2` stands at the desk (a static slot), the officer's second line is about the pair;
 * - C3 fixed down the wicket line (its 40 degree sweep reached both station 10 marks with the loop off: SA12), and off for good once
 *   `a4-grille` is set (marlow-play B2: past the loop it saw every takedown at the desk);
 * - the lamps of Q2: group 49 (three strips over the back aisle), group 44 (the dispatch office's panel, its switch inside).
 * The drill windows of stations 8 and 10 are the set's tick, `src/game/course/replan/a4Ticks.ts`.
 */
import type { GuardInfo } from '../../../../ai/guardInfo';
import type { EgressGate, FlagGate, LeverGate } from '../../../../game/course/courseDef';
import type { StationDef } from '../../../../game/course/stationDef';
import type { CameraDevice } from '../../../../security/data';
import type { FacilityKit } from '../../../kit/facilityKit';
import type { LevelBuilder } from '../../../levelBuilder';
import { MARLOW_CIRCUITS_REPLAN, marlowCourseGroups } from '../../../lighting/marlowCircuits';
import type { FloorHole } from '../../ctcourseGreybox';
import { A4_CAMERAS, A4_D2, A4_DOCK2, A4_GATE, A4_OFFICE, A4_OFFICE_DOOR, A4_OFFICER, A4_OFFICER_INFO, A4_PASSAGE, A4_RACK_H, A4_STAIR, A4_WEST_FLAG } from '../a4GoodsShed';
import { tally, type LightSpot, type SetPart } from '../types';

/** Holes this set cuts in the site slab (world metres [x0, z0, x1, z1]); `ctcourse.ts` hands every set's table to the facility. */
export const FLOOR_HOLES: readonly FloorHole[] = [];

/** Station 9: the lift grille (course door), its two gates, the motor button (a course device). */
export const A4_GRILLE_DOOR = 'A4-grille';
export const A4_GRILLE_GATE = 'g-a4-grille';
export const A4_GRILLE_MOTOR_GATE = 'g-a4-grille-motor';
export const A4_GRILLE_MOTOR = 'a4-grille-motor';
/** The grille in the passage mouth: the wall's opening x 101-104 on the line z 24 (faces 23.75 / 24.25, 0.5 m), the leaf's height, the
 *  header above it to the gallery's underside (`A4_PASSAGE.top`); a sliding leaf (a lift grille does not swing across the back aisle). */
export const A4_GRILLE = { x0: 101, x1: 104, z: 24, t: 0.5, h: 2.4 } as const;
/** The motor button on the passage's east wall (face x 103.75) beside the mouth, facing west into the passage. */
export const A4_GRILLE_MOTOR_AT = { x: 103.55, z: 23.3 } as const;
/** The done flags this set adds (STATIONS section 8, both players): under the grille in the back aisle, at the dock wicket. */
export const A4_GRILLE_FLAG = 'a4-grille';
export const A4_GRILLE_ZONE: [number, number, number, number] = [98.5, 24.3, 104.5, 27.2];
export const A4_WICKET_FLAG = 'a4-wicket';
export const A4_WICKET_ZONE: [number, number, number, number] = [76.3, 33, 78, 36];
/** The dispatch office's door: a flag gate on a key nobody hands out tonight, so `CourseState.locked` keeps it locked on both pages (a
 *  plain locked anchor would be unlocked by the course's lock pass). */
export const A4_OFFICE_GATE = 'g-a4-office';
export const A4_OFFICE_KEY = 'a4-office-key';

/** The pallet-rack end frames (plan boxes [x0, z0, x1, z1], 0.2 m thick, the racks' 5.4 m, solid, `noLedge`). */
export const A4_FRAMES: readonly { id: string; box: readonly [number, number, number, number]; why: string }[] = [
  { id: 'back-x95', box: [94.8, 24.25, 95.0, 27.3], why: 'the back aisle west of x 95, from the cross aisle' },
  { id: 'back-x86', box: [86.0, 24.25, 86.2, 27.3], why: "the back aisle's west part, from the dock" },
  { id: 'back-x108', box: [107.8, 24.25, 108.0, 27.3], why: "the back aisle's east end (the east lane)" },
  { id: 'aisle2-x95', box: [94.8, 29.7, 95.0, 33.2], why: "aisle 2's west mouth on the cross aisle" },
  { id: 'aisle2-x98', box: [98.5, 29.7, 98.7, 33.2], why: "aisle 2's east mouth on the cross aisle" },
  { id: 'aisle2-x86', box: [86.0, 29.7, 86.2, 33.2], why: "aisle 2's west end, from the dock" },
  { id: 'lane-north', box: [108.0, 35.4, 111.75, 35.6], why: "the east lane's north mouth on the main aisle" },
];
/** The locked hoardings at the mezzanine stairs' feet (2.4 m, `noLedge`): the west foot's end and its open side up to the stair rail's
 *  first segment (x 81.05), the east foot's open side up to the rail (x 110.95; its end is the east wall). */
export const A4_HOARD_H = 2.4;
export const A4_HOARDS: readonly { id: string; box: readonly [number, number, number, number] }[] = [
  { id: 'west-end', box: [80.1, A4_STAIR.z0 - 0.2, A4_STAIR.westFoot, A4_STAIR.z1] },
  { id: 'west-side', box: [80.1, A4_STAIR.z0 - 0.2, 81.1, A4_STAIR.z0] },
  { id: 'east-side', box: [110.9, A4_STAIR.z0 - 0.2, 111.75, A4_STAIR.z0] },
];

/** Group 49's strips over the back aisle (between the old dead fittings at x 94 / 98 / 102 / 106) and group 44's office panel. */
export const A4_BULK_STRIPS: readonly number[] = [96, 100, 104];
export const A4_BULK = { y: 5.6, z: 25.8, radius: 5, intensity: 0.38 } as const;
export const A4_DISPATCH_PANEL = { x: 79.3, y: 2.84, z: 41.0, radius: 5, intensity: 0.21 } as const;
/** The two switches the re-plan places (each within 1 m of its `MARLOW_CIRCUITS_REPLAN` spot): the back aisle's on the south wall west
 *  of the grille (on the one route, out of C2's 14 m), the office's on the pier inside its door. */
export const A4_SW_BULK = { x: 99.0, y: 1.2, z: 24.3, yaw: 0 } as const;
export const A4_SW_DISPATCH = { x: 79.4, y: 1.2, z: A4_OFFICE.z0 + A4_OFFICE.t / 2 + 0.05, yaw: 0 } as const;

/** C3 fixed on the wicket line (the built camera swept 70-110 degrees: both station 10 marks were in its frame at the sweep's ends). */
export const A4_C3_FACING = 90;

/** The officer's lines on the re-plan: the kettle line becomes the pair's (they never split now). */
export const A4_OFFICER_INFO_REPLAN: GuardInfo = {
  lines: [A4_OFFICER_INFO.lines[0]!, 'Those two at the dock never split up. Take them both at once.'],
};

/** STATIONS.md section 3, A4 block (play order 9, 8, 10; SA7). */
export const A4_STATIONS: StationDef[] = [
  { n: 9, id: 'a4-deadweight', lesson: 'deadweight', retry: 'station', doneFlag: 'a4-grille', kit: 'deadweight', standIn: 'g-a4-grille-motor',
    marks: [{ x: 102.5, z: 14.0, y: 0, yaw: 0 }, { x: 103.5, z: 14.0, y: 0, yaw: 0 }],
    guards: ['a4-officer'], gates: ['g-a4-grille', 'g-a4-grille-motor'] },
  { n: 8, id: 'a4-camloop', lesson: 'camera_loop', retry: 'station', doneFlag: 'a4-west', drillS: 60,
    marks: [{ x: 104.5, z: 14.0, y: 0, yaw: 0 }, { x: 105.5, z: 14.0, y: 0, yaw: 0 }],
    guards: ['a4-officer', 'a4-dock1', 'a4-dock2'], gates: ['g-a4-console', 'cam-a4-c1', 'cam-a4-c2', 'cam-a4-c3'] },
  { n: 10, id: 'a4-takedown', lesson: 'synced_takedown', retry: 'station', doneFlag: 'a4-wicket', drillS: 1.5,
    marks: [{ x: 80.5, z: 36.5, y: 0, yaw: Math.PI }, { x: 79.5, z: 29.5, y: 0, yaw: 0 }],
    guards: ['a4-dock1', 'a4-dock2'], gates: ['g-a4-wicket'] },
];

/** LANTERN's retry lines (STATIONS section 6, verbatim; keys `retryKey`). */
export const A4_RETRY_LINES: readonly { at: string; text: string }[] = [
  { at: 'retry:a4-deadweight', text: 'The duty officer saw you. Back to the security room door.' },
  { at: 'retry:a4-camloop', text: 'Seen on the shop floor. Back to the security room; loop it again.' },
  { at: 'retry:a4-camloop:timer', text: 'The cameras came back. Back to the security room; loop it again.' },
  { at: 'retry:a4-takedown', text: 'The loaders saw you. Back behind the pallet stacks at the dock.' },
  { at: 'retry:a4-takedown:timer', text: 'Both loaders at once, or the other one sees. Back behind the stacks.' },
];

const FRAME = '#6a5a44';
const HOARD = '#8a6a43';
const GRILLE_HEAD = '#17191b';
const LOOK = { blue: '#27508c', orange: '#c0561a', ply: '#a8875a', steel: '#6a7077', steelDark: '#3a3f44', yellow: '#c9a227', black: '#1d1f20', tie: '#2a2d30', white: '#e5e5de' } as const;
const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
/** A dressing skin's thickness (under `CANON_MIN_THICK` 0.05: out of the light shapes). */
const SKIN = 0.03;

/** Add the re-plan's pieces to `b` and amend `part` (the merge reads it afterwards). */
export function replanA4GoodsShed(b: LevelBuilder, _kit: FacilityKit, part: SetPart): void {
  const p = part;
  /** A solid box x0-x1, z0-z1, y0-y1, `noLedge` (never climbable). */
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
    b.mark(from, { noLedge: true });
  };
  /** A visual skin (no collision, `noLedge`, one side under 5 cm). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
    b.mark(from, { noLedge: true });
  };

  // ---- A4-30 / A4-31: one floor route (Q24, M4): the end frames and the stairs' hoardings ----
  tally(b, p.register, 'A4-30', "(J14) Pallet-rack end frames 5.4 m, solid, noLedge: the back aisle at x 95 and x 86 and its east end x 108, aisle 2's mouths at x 95, x 98.5 and x 86, the east lane across its north mouth (z 35.6): one floor route", () => {
    for (const f of A4_FRAMES) slab(f.box[0], f.box[2], f.box[1], f.box[3], 0, A4_RACK_H, FRAME);
  });
  tally(b, p.register, 'A4-31', "(J14) Locked hoardings 2.4 m (noLedge) at both mezzanine stairs: the west foot and its open side to the rail, the east foot's open side to the rail", () => {
    for (const h of A4_HOARDS) slab(h.box[0], h.box[2], h.box[1], h.box[3], 0, A4_HOARD_H, HOARD);
  });

  // ---- A4-32: the lift grille (station 9), its header, the motor button and the gates; A4-33 the office locked ----
  const gr = A4_GRILLE;
  tally(b, p.register, 'A4-32', "(J14) The counterweighted lift grille A4-grille across the passage mouth (x 101-104, z 24, 2.4 m, built locked, a sliding leaf) and its header to the gallery's underside (4.2, noLedge); the motor button a4-grille-motor on the passage's east wall (a course device, no piece)", () => {
    slab(gr.x0, gr.x1, gr.z - gr.t / 2, gr.z + gr.t / 2, gr.h, A4_PASSAGE.top, GRILLE_HEAD);
    p.doors[A4_GRILLE_DOOR] = b.door(gr.x0, 0, gr.z, gr.x1 - gr.x0, Math.PI / 2, { height: gr.h, locked: true, leaf: 'slide' }).id;
  });
  p.devices[A4_GRILLE_MOTOR] = { x: A4_GRILLE_MOTOR_AT.x, y: 0, z: A4_GRILLE_MOTOR_AT.z, yaw: -Math.PI / 2, label: 'Run the grille motor' };
  p.bay.gates.push(
    { kind: 'lever', id: A4_GRILLE_MOTOR_GATE, switchId: A4_GRILLE_MOTOR, doorId: A4_GRILLE_DOOR } satisfies LeverGate,
    { kind: 'egress', id: A4_GRILLE_GATE, switchId: A4_GRILLE_MOTOR, doorIds: [A4_GRILLE_DOOR] } satisfies EgressGate,
    { kind: 'flag', id: A4_OFFICE_GATE, flag: A4_OFFICE_KEY, doorId: A4_OFFICE_DOOR } satisfies FlagGate,
  );
  p.register.push({ id: 'A4-33', element: '(J14) The dispatch office door A4-office locked for good: the flag gate g-a4-office on the key a4-office-key, which nothing sets (no piece)' });

  // ---- A4-34: the lamps of Q2 (groups 49 and 44 of `MARLOW_CIRCUITS_REPLAN`; their counts are the budget: A4 at 24) ----
  tally(b, p.register, 'A4-34', "(J14, Q2) Lamps: the bulk-store row 49 live, three strips over the back aisle at x 96 / 100 / 104 (5.6 m); the dispatch office 44, one ceiling panel; their switches on the back aisle's south wall west of the grille and on the office pier inside its door", () => {
    for (const x of A4_BULK_STRIPS) b.light({ x, y: A4_BULK.y, z: A4_BULK.z, radius: A4_BULK.radius, intensity: A4_BULK.intensity, color: WHITE, group: 49, electric: true, destructible: true, fixture: { sx: 1.6, sy: 0.12, sz: 0.2, oy: 0.06 } });
    const d = A4_DISPATCH_PANEL;
    b.light({ x: d.x, y: d.y, z: d.z, radius: d.radius, intensity: d.intensity, color: WHITE, group: 44, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.05, sz: 0.6, oy: 0.025 } });
  });
  for (const [k, g] of Object.entries(marlowCourseGroups(MARLOW_CIRCUITS_REPLAN))) if (k === 'a4-bulk' || k === 'a4-dispatch') p.groups[k] = g;
  p.switches.push({ id: 'a4-sw-bulk', group: 49, pos: { x: A4_SW_BULK.x, y: A4_SW_BULK.y, z: A4_SW_BULK.z }, yaw: A4_SW_BULK.yaw });
  p.switches.push({ id: 'a4-sw-dispatch', group: 44, pos: { x: A4_SW_DISPATCH.x, y: A4_SW_DISPATCH.y, z: A4_SW_DISPATCH.z }, yaw: A4_SW_DISPATCH.yaw });

  // ---- A4-35: dressing (visual skins, no collision) ----
  tally(b, p.register, 'A4-35', "(J14) Dressing (visual skins, no collision): blue uprights and orange beams on both faces of every end frame, plywood boards, no-entry plates and a padlocked gate on the hoardings, the grille's bars and bottom rail, its counterweight chain, the new strips' cables, the motor button's and the two switches' back plates", () => {
    const S = SKIN;
    for (const f of A4_FRAMES) {
      const [x0, z0, x1, z1] = f.box;
      const alongX = x1 - x0 > z1 - z0;
      for (const side of [-1, 1] as const) {
        if (alongX) {
          const z = side < 0 ? z0 - S : z1;
          for (const x of [x0, x1 - 0.1]) skin(x, x + 0.1, 0, A4_RACK_H, z, z + S, LOOK.blue);
          for (const y of [1.5, 3.0, 4.5]) skin(x0, x1, y, y + 0.14, z, z + S, LOOK.orange);
        } else {
          const x = side < 0 ? x0 - S : x1;
          for (const z of [z0, z1 - 0.1]) skin(x, x + S, 0, A4_RACK_H, z, z + 0.1, LOOK.blue);
          for (const y of [1.5, 3.0, 4.5]) skin(x, x + S, y, y + 0.14, z0, z1, LOOK.orange);
        }
      }
    }
    // the hoardings: boards on their open faces, a no-entry plate on each side panel, the west foot's padlocked gate
    const hz = A4_STAIR.z0 - 0.2;
    skin(80.1 - S, 80.1, 0, A4_HOARD_H, hz, A4_STAIR.z1, LOOK.ply);
    for (const [x0, x1] of [[80.1, 81.1], [110.9, 111.75]] as const) {
      skin(x0, x1, 0, A4_HOARD_H, hz - S, hz, LOOK.ply);
      skin(x0 + 0.15, x0 + 0.45, 1.5, 1.8, hz - 2 * S, hz - S, LOOK.white);
    }
    skin(80.1 - 2 * S, 80.1 - S, 0.05, 2.1, 46.7, 47.6, LOOK.steel);
    skin(80.1 - 3 * S, 80.1 - 2 * S, 1.0, 1.12, 47.0, 47.06, LOOK.steelDark);
    // the grille: bars on its floor face (z 24.25) to the leaf's top and a bottom rail; the counterweight chain in the passage's west corner
    for (let x = gr.x0 + 0.15; x < gr.x1 - 0.05; x += 0.3) skin(x - 0.015, x + 0.015, 0.05, gr.h - 0.05, gr.z + gr.t / 2, gr.z + gr.t / 2 + S, LOOK.steelDark);
    skin(gr.x0, gr.x1, 0.05, 0.15, gr.z + gr.t / 2, gr.z + gr.t / 2 + S, LOOK.yellow);
    skin(101.3, 101.33, 0.6, A4_PASSAGE.top - 0.1, 23.55, 23.58, LOOK.steel);
    skin(101.27, 101.36, 0.6, 1.2, 23.45, 23.48, LOOK.black);
    // the motor button's back plate (the device draws its own button)
    skin(103.75 - S, 103.75, 0.95, 1.35, A4_GRILLE_MOTOR_AT.z - 0.15, A4_GRILLE_MOTOR_AT.z + 0.15, LOOK.yellow);
    // the new strips hang from the back aisle's roof tie (7.55 m) on two cables each
    for (const x of A4_BULK_STRIPS) for (const dx of [-0.7, 0.7]) skin(x + dx - 0.02, x + dx + 0.02, A4_BULK.y + 0.12, 7.55, A4_BULK.z - 0.02, A4_BULK.z + 0.02, LOOK.tie);
    // the switches' back plates (each switch stands 5 cm off its wall)
    skin(A4_SW_BULK.x - 0.1, A4_SW_BULK.x + 0.1, 1.1, 1.3, 24.25, 24.25 + S, LOOK.white);
    skin(A4_SW_DISPATCH.x - 0.08, A4_SW_DISPATCH.x + 0.08, 1.1, 1.3, A4_OFFICE.z0 + A4_OFFICE.t / 2, A4_OFFICE.z0 + A4_OFFICE.t / 2 + S, LOOK.white);
  });

  // ---- the kettle loop out (PLAN :59, :118-126, :308-310, :382, :409): D2 stands at the desk; the officer's kettle line is the pair's ----
  p.squads[A4_DOCK2] = { kind: 'grunt', x: A4_D2.x, z: A4_D2.z, yaw: 0 };
  p.squads[A4_OFFICER] = { ...p.squads[A4_OFFICER]!, info: A4_OFFICER_INFO_REPLAN };

  // ---- C3 on the wicket line (SA12): fixed east, so the crouch spots behind both stacks are out of its frame with the loop off ----
  // (marlow-play B2) and off for the rest of the set once station 9 is done (its offFlag is `a4-grille`, not the console's loop flag):
  // with the 60 s loop run out it saw every synced takedown at the desk, and station 10's retry never re-runs the loop
  p.cameras = p.cameras.map((c): CameraDevice => {
    if (c.id !== A4_CAMERAS[2]) return c;
    const { sweep: _sweep, ...fixed } = c;
    return { ...fixed, facing: A4_C3_FACING, offFlag: A4_GRILLE_FLAG, reason: "Warehouse CCTV: the wicket line, the loaders' desk and the main aisle's west end (fixed; off once the grille is passed)" };
  });

  // ---- stations, done flags, the retry lines, the objective lines (#441's rule: what and where, one per station, then the room) ----
  p.bay.stations = A4_STATIONS;
  p.passZones.push({ id: 'a4-p-grille', box: A4_GRILLE_ZONE, flag: A4_GRILLE_FLAG, floorY: 0 }, { id: 'a4-p-wicket', box: A4_WICKET_ZONE, flag: A4_WICKET_FLAG, floorY: 0 });
  p.externalFlags.push(A4_GRILLE_FLAG, A4_WICKET_FLAG, A4_OFFICE_KEY);
  p.bay.radio.push(...A4_RETRY_LINES);
  p.objectives = [
    { id: 'a4-s9', bay: 'A4', text: 'Past the duty officer, down the staff passage and under the lift grille to the back aisle.', done: { flag: A4_GRILLE_FLAG } },
    {
      id: 'a4-s8',
      bay: 'A4',
      text: 'Loop the cameras at the security console, then cross the main aisle to the dock in 60 s.',
      // (marlow-play C7) the job line is all the HUD shows: each one names the run to the dock and its 60 s
      a: 'Down the officer, then run: back aisle, cross aisle, main aisle west to the dock - 60 s',
      b: 'Use the console once the officer is down, then run west to the dock - 60 s',
      done: { flag: A4_WEST_FLAG },
      timer: A4_GATE,
    },
    {
      id: 'a4-s10',
      bay: 'A4',
      text: 'Two loaders at the dock desk: take both at once from behind the pallet stacks.',
      // (marlow-play C7) A's mark is the north crouch spot (D1), B's the south (D2); the step ends at the push bar (`a4-wicket`)
      a: 'Take the north man: count down and go together, then both to the push bar by the L4 door.',
      b: 'Take the south man: count down and go together, then both to the push bar by the L4 door.',
      done: { flag: A4_WICKET_FLAG },
    },
    { id: 'a4-lock', bay: 'A4', text: 'Push the bar at the dock wicket, then both into holding room four. Medkit inside.' },
  ];

  // ---- light spots: the back aisle and the office are lit now (Q2); the kettle's dark spots go with the kettle ----
  const added: LightSpot[] = [
    { name: 'A4 back aisle lit', kind: 'body', x: 100, y: 0, z: 25.8, band: 'read' },
    { name: 'A4 back aisle cut', kind: 'body', x: 100, y: 0, z: 25.8, band: 'cut', off: [49] },
    { name: 'A4 dispatch office', kind: 'body', x: 79.3, y: 0, z: 41.0, band: 'read' },
    { name: 'A4 dispatch office cut', kind: 'body', x: 79.3, y: 0, z: 41.0, band: 'cut', off: [44] },
  ];
  const relit: Record<string, LightSpot['band']> = { 'A4 mouth': 'read', 'A4 crossing': 'read' };
  p.lightSpots = [...p.lightSpots.filter((s) => s.name !== 'A4 kettle' && s.name !== 'A4 kettle cut').map((s) => (relit[s.name] ? { ...s, band: relit[s.name]! } : s)), ...added];

  // the office's hide spot is behind a locked door now: the body goes to the strip north of the office, on the dock side
  p.hideSpots = p.hideSpots.map((h) => (h.x < A4_OFFICE.x1 && h.z > A4_OFFICE.z0 && h.z < A4_OFFICE.z1 ? { x: 77.0, y: 0, z: 46.4 } : h));
}
