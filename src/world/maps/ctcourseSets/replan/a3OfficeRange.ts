/**
 * J14 Marlow re-plan, A3 the Office Range (slice G-A3; PLAN section 2, STATIONS.md sections 3, 5, 6, 8, 9): the vent unlock
 * (station 6) and the jam relay (station 7), no guard and one camera. The set file builds the floor as built but for the
 * pieces the crawl passes through (its `opts.replan` guards); this file adds:
 * - the riser cupboard in the west lobby's south-west corner (x 76.25-78.75, z 0.25-1.4, full height; the crawl's mouth
 *   1.2 x 1.5 at the bottom of its north face, x 76.9-78.1, with the vent grille) and the player-only services crawl,
 *   1.2 wide x 1.5 high clear and sealed on every side (0.1 m walls, a 0.1 m lid): east along z 0.25-1.45 to x 81.4 (under
 *   the lobby wall at x 79.5 and along office 1's south wall), then north along x 80.2-81.4 to the corridor's south wall
 *   (z 8.7-9.0), out by a grille in that wall at x 80.2-81.4 (graph `duct`, 11.5 m along its path). One duct anchor, one
 *   way, the master's vent pieces (`b.duct`: a wall grate at each end, kicked or unscrewed, `ventOpen.ts`). The grille is
 *   15.3 m from the camera (its range is 14 m, x 82.6 on the corridor's line), so the crawl and the fire door are out of it;
 * - the corridor's west mouth (x 79.5, z 9-12.5) walled to the 3.0 m slab with the landlord's fire door `A3-fire` (1.2 x 2.1
 *   at z 10.15-11.35, graph `at` z 10.75), locked, gate `g-a3-fire` of the bolt kind: its push bar opens it only from the
 *   corridor side, so the crawler opens it for the partner (station 6's lesson);
 * - the lobby wall's south run and the corridor's south wall west of the recess cut round the crawl, office 1's north desk
 *   run trimmed to x 81.5 (its first desk is gone), and the skins and lobby kit panels the guards left out, cut round it;
 * - the offices closed for good (Q24): their five doors built locked and unbreachable, and each held shut by a flag gate on
 *   `a3-never`, a flag nothing sets (A7's never-open idiom; the course drives every course door's lock from its gates);
 * - no guard (Q11): the cleaner leaves the squad with his route and objective mention; the camera `cam-a3-hall` as built
 *   (IR, armoured, 14 m; no guard response, as the built training camera) and its jam relay with no `drillS` (SA6);
 * - no send-back: the A3 pass zones lose their `hall` rule (a camera's full detection is R1's `seen` station retry);
 * - stations 6 and 7 (STATIONS section 3, verbatim), the done flag `a3-fire` (section 8), LANTERN's retry lines (section 6)
 *   and the objective lines (one per station and the holding-room line, what and where).
 * No lamp and no circuit change: the cupboard and the crawl are unlit (a crawl, not a dead-light pocket). Only type imports
 * from `../` besides the set file's constants (the facility imports nothing from here).
 */
import { retryKey, type BoltGate, type FlagGate } from '../../../../game/course/courseDef';
import type { StationDef } from '../../../../game/course/stationDef';
import type { Grate } from '../../../anchors';
import { KIT_BOX_COLOR, KIT_PANEL_DEPTH, type FacilityKit } from '../../../kit/facilityKit';
import type { LevelBuilder } from '../../../levelBuilder';
import type { FloorHole } from '../../ctcourseGreybox';
import {
  A3_CAMERA,
  A3_CLEANER,
  A3_CORRIDOR,
  A3_DOOR_COMM1,
  A3_DOOR_COMM2,
  A3_DOOR_CORR,
  A3_DOOR_LOBBY,
  A3_DOOR_RECESS,
  A3_FAR_FLAG,
  A3_LOBBY_DOOR_Z,
  A3_LOBBY_WALL_X,
  A3_OFFICE_Z1,
  A3_OFFICES,
  A3_RECESS,
  A3_RUNS,
  A3_SOUTH_WALL_Z,
} from '../a3OfficeRange';
import { tally, type SetPart } from '../types';

/** Holes this set cuts in the site slab (world metres [x0, z0, x1, z1]); `ctcourse.ts` hands every set's table to the facility. */
export const FLOOR_HOLES: readonly FloorHole[] = [];

/** The ceiling (the set's 3.0 m slab), the set's 0.3 m walls and the corridor helper's wall grey. */
const CEIL = 3.0;
const WALL_T = 0.3;
const HALL_GREY = '#6a6f74';

/**
 * The riser cupboard (built): its plan box, full height to the slab, its north face's 0.1 m front panel and the crawl's
 * mouth in it (x span, 1.5 m high) where the vent grille sits.
 */
export const A3_RISER = { x0: 76.25, x1: 78.75, z0: 0.25, z1: 1.4, front: 0.1, mouth: [76.9, 78.1] as readonly [number, number] } as const;
/**
 * The services crawl (built, clear inside): 1.2 wide, 1.5 high, 0.1 m walls and lid. Leg 1 runs east along z 0.25-1.45 from
 * the cupboard to x 81.4; leg 2 north along x 80.2-81.4 to the corridor's south wall (its office face z 8.7); the grille is the
 * wall's opening x 80.2-81.4, 1.5 high, its corridor face z 9.0.
 */
export const A3_CRAWL = { h: 1.5, t: 0.1, leg1: { z0: 0.25, z1: 1.45, x1: 81.4 }, leg2: { x0: 80.2, x1: 81.4, z1: A3_OFFICE_Z1 } } as const;
export const A3_GRILLE = { x0: 80.2, x1: 81.4, h: 1.5, z: A3_SOUTH_WALL_Z, face: A3_SOUTH_WALL_Z + WALL_T / 2 } as const;
/** The duct's path (feet, crawl height 0) and its two wall grates: in at the cupboard's north face, out into the corridor. */
export const A3_DUCT_PATH: readonly { x: number; y: number; z: number }[] = [
  { x: 77.5, y: 0, z: 1.15 },
  { x: 77.5, y: 0, z: 0.85 },
  { x: 80.8, y: 0, z: 0.85 },
  { x: 80.8, y: 0, z: 8.75 },
];
export const A3_DUCT_IN: Grate = { pos: { x: 77.5, y: 0.75, z: A3_RISER.z1 }, nx: 0, ny: 0, nz: 1, where: 'wall' };
export const A3_DUCT_OUT: Grate = { pos: { x: 80.8, y: 0.75, z: A3_GRILLE.face }, nx: 0, ny: 0, nz: 1, where: 'wall' };

/** The fire door: course door id, its gate, the wall line, its opening on that line and height, the mouth it closes. */
export const A3_FIRE_DOOR = 'A3-fire';
export const A3_FIRE_GATE = 'g-a3-fire';
export const A3_FIRE = { x: A3_LOBBY_WALL_X, z0: 10.15, z1: 11.35, h: 2.1, mouth: [9.0, 12.5] as readonly [number, number] } as const;
/** The bolt: opened by a press from the corridor (+x) side, judged from the door's centre on the wall line. */
export const A3_FIRE_BOLT: BoltGate = { kind: 'bolt', id: A3_FIRE_GATE, doorId: A3_FIRE_DOOR, side: [1, 0], at: [A3_FIRE.x, 10.75] };

/** The offices' doors (all five, Q24) and the flag that never comes (their gates' flag; listed, set by nothing). */
export const A3_OFFICE_DOORS: readonly string[] = [A3_DOOR_LOBBY, A3_DOOR_COMM1, A3_DOOR_COMM2, A3_DOOR_RECESS, A3_DOOR_CORR];
export const A3_NEVER_FLAG = 'a3-never';
/** A shut office door's gate id (`g-a3-office1` for `A3-office1`). */
export const officeGate = (door: string): string => `g-a3-${door.slice(3)}`;

/** Station 6's done flag and its pass zone (STATIONS section 8): both through the fire door, west of the camera's 14 m. */
export const A3_FIRE_FLAG = 'a3-fire';
export const A3_FIRE_ZONE: [number, number, number, number] = [79.6, 9.2, 82, 12.3];

/** Stations 6 and 7 (STATIONS.md section 3, A3 block). */
export const A3_OFFICE_RANGE_STATIONS: readonly StationDef[] = [
  { n: 6, id: 'a3-vent', lesson: 'vent_unlock', retry: 'station', doneFlag: 'a3-fire',
    marks: [{ x: 77.5, z: 2.0, y: 0, yaw: Math.PI }, { x: 78.5, z: 10.5, y: 0, yaw: Math.PI / 2 }],
    guards: [], gates: ['g-a3-fire', 'cam-a3-hall'] },
  { n: 7, id: 'a3-jam', lesson: 'jam_relay', retry: 'station', doneFlag: 'a3-far',
    marks: [{ x: 80.0, z: 10.0, y: 0, yaw: Math.PI / 2 }, { x: 80.0, z: 11.5, y: 0, yaw: Math.PI / 2 }],
    guards: [], gates: ['cam-a3-hall'] },
];

/** LANTERN's lines when stations 6 and 7 retry (STATIONS section 6). */
export const A3_RETRY_LINES: Readonly<Record<'a3-vent' | 'a3-jam', string>> = {
  'a3-vent': 'The camera had you. Back to the west lobby.',
  'a3-jam': "The camera had you. Back to the corridor's west end.",
};

/** The built radio lines the re-plan drops: the send-back's and the cleaner's (and any keyed to a built step that is gone). */
const DROP_LINE = /send|back to the lobby|cleaner/i;
/** The objective steps (one per station, then the holding-room line). */
export const A3_STEPS: readonly string[] = ['a3-vent', 'a3-jam', 'a3-lock'];

/** The set's look for the re-plan's skins (the set file's own values). */
const LOOK = {
  plaster: '#b6b7b1',
  skirt: '#2b2e31',
  steel: '#9ea4aa',
  steelDark: '#3a3f44',
  frame: '#34383c',
  paper: '#ecece6',
  laminate: '#d8d8d2',
  louvre: '#6b7076',
  red: '#b5282d',
  green: '#2f7d4a',
  run: '#4a4337',
} as const;
/** A skin's thickness and the thinnest side a skin may have (under `CANON_MIN_THICK`: out of the light shapes). */
const SKIN = 0.03;
const THIN = 0.05;
/** The lobbies' circuit (the landlord's timer run): the kit panels follow it. */
const G_LOBBY = 34;

/** Add the re-plan's pieces to `b` and amend `part` (the merge reads it afterwards). */
export function replanA3OfficeRange(b: LevelBuilder, kit: FacilityKit, part: SetPart): void {
  /** A collidable `noLedge` box from x0 to x1, z0 to z1, y0 to y1. */
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string = KIT_BOX_COLOR): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
    b.mark(from, { noLedge: true });
  };
  /** A visual-only skin (no collision, `noLedge`, one side under `THIN`). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    if (Math.min(x1 - x0, y1 - y0, z1 - z0) >= THIN) throw new Error(`replan a3OfficeRange: the skin at (${x0}, ${y0}, ${z0}) is not thin`);
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
    b.mark(from, { noLedge: true });
  };
  /** A skin on a face: `side` its outward direction, `at` its plane, [a0, a1] the run along it, `layer` skins out. */
  const face = (side: 'n' | 's' | 'e' | 'w', at: number, a0: number, a1: number, y0: number, y1: number, color: string, layer = 0): void => {
    const o0 = layer * SKIN;
    const o1 = (layer + 1) * SKIN;
    if (side === 'n') skin(a0, a1, y0, y1, at + o0, at + o1, color);
    else if (side === 's') skin(a0, a1, y0, y1, at - o1, at - o0, color);
    else if (side === 'e') skin(at + o0, at + o1, y0, y1, a0, a1, color);
    else skin(at - o1, at - o0, y0, y1, a0, a1, color);
  };
  /** Plaster with a dark skirting under it (a strip starting over 0.12 m has none). */
  const plaster = (side: 'n' | 's' | 'e' | 'w', at: number, a0: number, a1: number, y0 = 0.12, y1 = CEIL): void => {
    face(side, at, a0, a1, y0, y1, LOOK.plaster);
    if (y0 <= 0.12) face(side, at, a0, a1, 0, 0.12, LOOK.skirt);
  };
  const h = WALL_T / 2;
  const R = A3_RISER;
  const C = A3_CRAWL;
  const t = C.t;
  const lx = A3_LOBBY_WALL_X;
  const recessX0 = A3_RECESS.x - A3_CORRIDOR.recessW / 2;

  // ---- A3-R1: the riser cupboard and the services crawl (sealed: walls and a lid, the grilles the only ways in) ----
  tally(b, part.register, 'A3-R1', 'Riser cupboard x 76.25-78.75, z 0.25-1.4 to the slab (front panel 0.1, crawl mouth x 76.9-78.1 under 1.5 m) and the player-only services crawl 1.2 x 1.5 clear, 0.1 m walls and lid: east along z 0.25-1.45 to x 81.4, north along x 80.2-81.4 to the corridor wall (z 8.7); all noLedge', () => {
    // the cupboard: its body over the crawl, the front panel either side of the mouth, a post where the crawl leaves it
    slab(R.x0, R.x1, R.z0, R.z1, C.h, CEIL);
    slab(R.x0, R.mouth[0], R.z1 - R.front, R.z1, 0, C.h);
    slab(R.mouth[1], R.x1, R.z1 - R.front, R.z1, 0, C.h);
    slab(R.x1 - t, R.x1, R.z1 - R.front, C.leg1.z1 + t, 0, C.h + t);
    // leg 1 (east): its north wall to leg 2's west wall, its lid to leg 2's east wall
    slab(R.x1, C.leg2.x0, C.leg1.z1, C.leg1.z1 + t, 0, C.h + t);
    slab(R.x1, C.leg2.x1 + t, C.leg1.z0, C.leg1.z1 + t, C.h, C.h + t);
    // leg 2 (north): its two walls and its lid to the corridor wall
    slab(C.leg2.x0 - t, C.leg2.x0, C.leg1.z1, C.leg2.z1, 0, C.h + t);
    slab(C.leg2.x1, C.leg2.x1 + t, C.leg1.z0, C.leg2.z1, 0, C.h + t);
    slab(C.leg2.x0 - t, C.leg2.x1 + t, C.leg1.z1 + t, C.leg2.z1, C.h, C.h + t);
  });

  // ---- A3-R2: the walls the crawl passes: the lobby wall's south run over it, the corridor's south wall with the grille ----
  tally(b, part.register, 'A3-R2', "The lobby wall's south run (x 79.5, 0.3 m) over the crawl (z 0.25-1.45 from 1.5 m) and north of it to office 1's door (z 1.45-4.0); the corridor's south wall west of the recess (z 8.85, x 79.5-87.55) with the grille's opening x 80.2-81.4 under 1.5 m", () => {
    slab(lx - h, lx + h, C.leg1.z0, C.leg1.z1, C.h, CEIL);
    slab(lx - h, lx + h, C.leg1.z1, A3_LOBBY_DOOR_Z[0], 0, CEIL);
    const z0 = A3_GRILLE.z - h;
    const z1 = A3_GRILLE.z + h;
    slab(A3_CORRIDOR.at.x, A3_GRILLE.x0, z0, z1, 0, CEIL, HALL_GREY);
    slab(A3_GRILLE.x0, A3_GRILLE.x1, z0, z1, A3_GRILLE.h, CEIL, HALL_GREY);
    slab(A3_GRILLE.x1, recessX0, z0, z1, 0, CEIL, HALL_GREY);
  });

  // ---- A3-R3: the fire door in the corridor's west mouth (station 6) ----
  tally(b, part.register, 'A3-R3', "The corridor's west mouth walled (x 79.5, z 9-12.5, 0.3 m, to the slab) with the landlord's fire door A3-fire 1.2 x 2.1 at z 10.15-11.35 (bolt gate g-a3-fire: the push bar opens it from the corridor side only)", () => {
    const [m0, m1] = A3_FIRE.mouth;
    slab(lx - h, lx + h, m0, A3_FIRE.z0, 0, CEIL);
    slab(lx - h, lx + h, A3_FIRE.z1, m1, 0, CEIL);
    slab(lx - h, lx + h, A3_FIRE.z0, A3_FIRE.z1, A3_FIRE.h, CEIL);
    // locked at build (the bolt holds it until the corridor-side press), opening into the lobby, away from the push bar
    part.doors[A3_FIRE_DOOR] = b.door(A3_FIRE.x, 0, A3_FIRE.z0, A3_FIRE.z1 - A3_FIRE.z0, 0, { height: A3_FIRE.h, swing: -1, locked: true, breachable: false }).id;
  });
  part.bay.gates.push({ ...A3_FIRE_BOLT, side: [A3_FIRE_BOLT.side[0], A3_FIRE_BOLT.side[1]], at: [A3_FIRE_BOLT.at[0], A3_FIRE_BOLT.at[1]] });

  // ---- A3-R4: office 1's north desk run, trimmed east of the crawl ----
  const run0 = A3_RUNS[0];
  const runX0 = C.leg2.x1 + t;
  tally(b, part.register, 'A3-R4', "Office 1's north desk run trimmed to x 81.5-85.35 (z 7.9-8.7, 0.9 m, noLedge): its west end stood in the crawl", () => {
    slab(runX0, run0.x1, run0.z0, run0.z1, 0, 0.9, LOOK.run);
  });

  // ---- A3-R5: the duct (the master's vent pieces): in at the cupboard's grille, out at the corridor's, one way ----
  tally(b, part.register, 'A3-R5', "Services crawl duct anchor (one way, 11.5 m): wall grate in the riser cupboard's north face at (77.5, 1.4), out by the wall grate in the corridor's south wall at (80.8, 9.0); kicked or unscrewed (ventOpen)", () => {
    b.duct(A3_DUCT_PATH.map((p) => ({ ...p })), { ...A3_DUCT_IN, pos: { ...A3_DUCT_IN.pos } }, { ...A3_DUCT_OUT, pos: { ...A3_DUCT_OUT.pos } });
  });

  // ---- A3-R6: dressing round the crawl (visual skins and the lobby's kit panels; no collision) ----
  tally(b, part.register, 'A3-R6', "Dressing round the crawl (visual): the lobby's kit panels on circuit 34 run from the cupboard and the crawl, plaster cut round the crawl on office 1's west and north faces and on the corridor's south face with its bumper rail, steel frames round both grilles and the fire door, the cupboard's riser door with louvres, a lock and a red label, a green plate over the fire door on the corridor side, the corridor print hung 0.5 m east", () => {
    const run = (x: number, z0: number, z1: number, yaw: number): void => {
      kit.wallPanel(x, (z0 + z1) / 2, z1 - z0, yaw, { h: CEIL, tone: 'warm', group: G_LOBBY });
      kit.skirting(x, (z0 + z1) / 2, z1 - z0, yaw, { tone: 'warm', group: G_LOBBY, standoff: KIT_PANEL_DEPTH });
    };
    // the lobby's panels: the outer wall from the cupboard's face, office 1's wall from the crawl's north wall to its door
    run(R.x0, R.z1 + 0.05, 8.9, Math.PI / 2);
    run(lx - h, C.leg1.z1 + t + 0.1, A3_LOBBY_DOOR_Z[0] - 0.1, -Math.PI / 2);
    // office 1 (locked; dressed as built): plaster on its west face round the crawl, on its north face round the crawl's end
    const lobbyFace = lx + h;
    plaster('e', lobbyFace, C.leg1.z0, C.leg1.z1 + t, C.h + t, CEIL);
    plaster('e', lobbyFace, C.leg1.z1 + t, A3_LOBBY_DOOR_Z[0]);
    plaster('s', A3_OFFICE_Z1, A3_OFFICES[0][0], C.leg2.x0 - t);
    plaster('s', A3_OFFICE_Z1, C.leg2.x0 - t, C.leg2.x1 + t, C.h + t, CEIL);
    plaster('s', A3_OFFICE_Z1, C.leg2.x1 + t, A3_OFFICES[0][1]);
    // the trimmed run's worktop
    skin(runX0, run0.x1, 0.9, 0.93, run0.z0, run0.z1, LOOK.laminate);
    // the corridor's south face: plaster, skirting and the bumper rail either side of the grille, plaster over it
    const zS = A3_GRILLE.face;
    for (const [a, e] of [[A3_CORRIDOR.at.x, A3_GRILLE.x0], [A3_GRILLE.x1, recessX0]] as const) {
      plaster('n', zS, a, e);
      face('n', zS, a, e, 0.9, 0.96, LOOK.steel, 1);
    }
    plaster('n', zS, A3_GRILLE.x0, A3_GRILLE.x1, A3_GRILLE.h, CEIL);
    // a steel frame round the grille's opening (corridor side) and round the cupboard's mouth (lobby side)
    face('n', zS, A3_GRILLE.x0 - 0.08, A3_GRILLE.x0, 0, A3_GRILLE.h + 0.08, LOOK.steelDark, 1);
    face('n', zS, A3_GRILLE.x1, A3_GRILLE.x1 + 0.08, 0, A3_GRILLE.h + 0.08, LOOK.steelDark, 1);
    face('n', zS, A3_GRILLE.x0, A3_GRILLE.x1, A3_GRILLE.h, A3_GRILLE.h + 0.08, LOOK.steelDark, 1);
    face('n', R.z1, R.mouth[0] - 0.08, R.mouth[0], 0, C.h + 0.08, LOOK.steelDark);
    face('n', R.z1, R.mouth[1], R.mouth[1] + 0.08, 0, C.h + 0.08, LOOK.steelDark);
    face('n', R.z1, R.mouth[0], R.mouth[1], C.h, C.h + 0.08, LOOK.steelDark);
    // the print that hung at x 81.2-82.0 (over the grille's corner), 0.5 m east
    face('n', zS, 81.7, 82.5, 1.4, 1.95, LOOK.frame, 1);
    face('n', zS, 81.73, 82.47, 1.43, 1.92, LOOK.paper, 2);
    // the cupboard's front over the mouth: the riser door (steel, louvres at the top, a lock and the red riser label)
    face('n', R.z1, R.x0 + 0.15, R.x1 - 0.15, C.h + 0.15, CEIL - 0.1, LOOK.steel);
    for (let k = 0; k < 5; k++) face('n', R.z1, R.x0 + 0.4, R.x1 - 0.4, 2.45 + k * 0.07, 2.48 + k * 0.07, LOOK.louvre, 1);
    face('n', R.z1, R.x1 - 0.4, R.x1 - 0.32, 2.0, 2.12, LOOK.steelDark, 1);
    face('n', R.z1, (R.x0 + R.x1) / 2 - 0.2, (R.x0 + R.x1) / 2 + 0.2, 2.2, 2.35, LOOK.red, 1);
    // the fire door's steel surround on both faces, and a green plate over it on the corridor side
    for (const [side, at] of [['w', lx - h], ['e', lx + h]] as const) {
      face(side, at, A3_FIRE.z0 - 0.1, A3_FIRE.z0, 0, A3_FIRE.h, LOOK.steel);
      face(side, at, A3_FIRE.z1, A3_FIRE.z1 + 0.1, 0, A3_FIRE.h, LOOK.steel);
      face(side, at, A3_FIRE.z0 - 0.1, A3_FIRE.z1 + 0.1, A3_FIRE.h, A3_FIRE.h + 0.08, LOOK.steel);
    }
    face('e', lx + h, 10.5, 11.0, 2.3, 2.5, LOOK.green, 1);
  });

  // ---- the offices closed for good (Q24): built locked and unbreachable, each held shut by a flag gate that never opens ----
  for (const door of A3_OFFICE_DOORS) {
    const aid = part.doors[door];
    const anchor = b.anchors.doors.find((d) => d.id === aid);
    if (aid === undefined || !anchor) throw new Error(`replan a3OfficeRange: no office door ${door}`);
    anchor.locked = true;
    anchor.breachable = false;
    part.bay.gates.push({ kind: 'flag', id: officeGate(door), flag: A3_NEVER_FLAG, doorId: door } satisfies FlagGate);
  }

  // ---- no guard: the cleaner goes with his route (Q11) ----
  delete part.squads[A3_CLEANER];
  part.bay.squad = part.bay.squad.filter((s) => s !== A3_CLEANER);
  // the camera as built; like the built send-back camera it brings no guard response (marlow-walk482 X6)
  part.cameras = part.cameras.map((c) => (c.id === A3_CAMERA ? { ...c, guardResponse: false } : c));

  // ---- no send-back: the pass zones lose their hallway rule (a full detection is the station's `seen` retry) ----
  part.passZones = part.passZones.map((z) => {
    if (!z.hall) return z;
    const c = { ...z };
    delete c.hall;
    return c;
  });
  part.passZones.push({ id: 'a3-p-fire', box: A3_FIRE_ZONE, flag: A3_FIRE_FLAG, floorY: 0 });
  part.externalFlags.push(A3_FIRE_FLAG, A3_NEVER_FLAG);

  // ---- the stations, the steps and LANTERN's lines ----
  part.bay.stations = A3_OFFICE_RANGE_STATIONS;
  part.objectives.length = 0;
  part.objectives.push(
    {
      id: 'a3-vent',
      bay: 'A3',
      text: 'Crawl through to open the fire door',
      done: { flag: A3_FIRE_FLAG },
    },
    {
      id: 'a3-jam',
      bay: 'A3',
      text: 'Take turns jamming the corridor camera',
      a: 'Jam the camera while your partner moves, then move on their jam.',
      b: 'Move on the jam to the east lobby, then jam for them.',
      done: { flag: A3_FAR_FLAG },
    },
    { id: 'a3-lock', bay: 'A3', text: 'Both of you into holding room three.' },
  );
  const keyed = (at: string): boolean => at === 'enter' || at === 'gate' || at === 'done' || A3_STEPS.includes(at);
  const kept = part.bay.radio.filter((r) => !DROP_LINE.test(r.text) && keyed(r.at));
  part.bay.radio.length = 0;
  part.bay.radio.push(
    { at: 'enter', text: 'The fire door is locked tonight. Crawl through from the riser cupboard and open it.' },
    ...kept,
    { at: 'a3-vent', text: 'Good, that is a vent unlock. Now jam that camera for each other.' },
    { at: retryKey('a3-vent'), text: A3_RETRY_LINES['a3-vent'] },
    { at: retryKey('a3-jam'), text: A3_RETRY_LINES['a3-jam'] },
  );

  // ---- map data the e2e and the debug menu read ----
  part.debugPoints.push(
    { id: 'A3-riser', label: 'Set 3 riser cupboard (station 6, mark A)', pos: { x: 77.5, y: 0, z: 2.0 }, yaw: Math.PI },
    { id: 'A3-fire', label: 'Set 3 fire door, corridor side (station 7)', pos: { x: 80.0, y: 0, z: 10.75 }, yaw: Math.PI / 2 },
  );
}
