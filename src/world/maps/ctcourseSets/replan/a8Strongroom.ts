/**
 * J14 Marlow re-plan, A8 the Strongroom (slice G-A8; PLAN section 2, STATIONS.md sections 3, 5, 6, 8, 9): the graduation set keeps
 * its side routes (the public stair, the loop round the counters, the request-to-exit in the lobby) and its three guards; the
 * re-plan retries a step when a guard holds combat for `CAUGHT_HOLD` 2 s or a timed step runs out. The set file builds the
 * banking hall as built but for the pieces this file replaces (its `opts.replan` guards); this file adds:
 * - the public stair 2.4 m (graph `open_stair`, a real banking hall's width): x 130.5-132.9 from the foot at z 67.3 to the gallery,
 *   its open-side rails on x 130.45 / 132.95, the gallery's east balustrade starting at the widened head (x 132.9), and the fourth
 *   north column (x 133) not built (it stood in the flight's way; the east wall carries the slab's last bay). The night desk keeps
 *   0.7 m between its east face and the west rail, the east wall 0.85 m past the east rail;
 * - the security office's west wall above the gallery floor a glazed screen (`kit.glass`, 3.0 m from the office floor, collision-only:
 *   it stops bodies, bullets, guard and camera sight and passes light) from z 71.25 to the door, under a solid head (7.4-9.0); the
 *   door `A8-office` and the wall north of it as built; the office switch moves to that north jamb (z 77.5);
 * - lamps (Q2): group 85 the vestibule (2 ceiling panels under the gallery return, switch `a8-sw-vestibule` by the L7 door) and group
 *   86 the west bays behind the counters (a counter lamp on the main run's west half and a brass wall light on a new 0.4 m column
 *   at x 112 under the gallery front, which also carries the switch `a8-sw-west`);
 * - stations 18-21 (STATIONS section 3, verbatim: all `caught`, 20 with `drillS` 25 and 21 with 60, the windows run by
 *   `src/game/course/replan/a8Ticks.ts`), the done flags `a8-office-in` and `a8-grille-in` (section 8), LANTERN's retry lines
 *   (section 6), the objective lines where the re-plan changes what is there.
 * The three guards, the three cameras, the console, the board, the grille and its request-to-exit are as built. Only type imports
 * from `../` besides the set file's constants (the facility imports nothing from here).
 */
import { retryKey } from '../../../../game/course/courseDef';
import type { StationDef } from '../../../../game/course/stationDef';
import { KIT_BOX_COLOR, type FacilityKit } from '../../../kit/facilityKit';
import type { LevelBuilder } from '../../../levelBuilder';
import { MARLOW_CIRCUITS_REPLAN, marlowCourseGroups } from '../../../lighting/marlowCircuits';
import { stairSteps, type FloorHole } from '../../ctcourseGreybox';
import { A8_H, A8_NORTH, A8_PUBLIC_STAIR, A8_RAIL_LIFT, A8_REPLAN_STAIR_X1, A8_STAIR_RAIL } from '../a8Strongroom';
import { tally, type SetPart } from '../types';

/** Holes this set cuts in the site slab (world metres [x0, z0, x1, z1]); `ctcourse.ts` hands every set's table to the facility. */
export const FLOOR_HOLES: readonly FloorHole[] = [];

/** Station 18's done flag: its pass zone `a8-office-in`, one player inside the security office door. */
export const A8_OFFICE_IN_FLAG = 'a8-office-in';
/** Station 20's done flag: its pass zone `a8-grille-in` (STATIONS section 8), one player through the public grille. */
export const A8_GRILLE_IN_FLAG = 'a8-grille-in';
/** The two new pass zones [x0, z0, x1, z1] (STATIONS section 8; any one player): inside the office door (floor 4.4) and just through the grille (floor 0). */
export const A8_OFFICE_IN_ZONE: [number, number, number, number] = [134.25, 75.5, 136, 77.75];
export const A8_GRILLE_IN_ZONE: [number, number, number, number] = [134.3, 60.5, 136, 63.5];

/** Stations 18-21 (STATIONS.md section 3, A8 block, verbatim): badge 18's four `caught` steps. */
export const A8_STATIONS: readonly StationDef[] = [
  { n: 18, id: 'a8-c2run', lesson: 'jam_relay', retry: 'caught', doneFlag: 'a8-office-in',
    marks: [{ x: 107.5, z: 64.0, y: 0, yaw: Math.PI / 2 }, { x: 107.5, z: 65.5, y: 0, yaw: Math.PI / 2 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['a8-cam1', 'a8-cam2', 'a8-cam3'] },
  { n: 19, id: 'a8-loopset', lesson: 'camera_loop', retry: 'caught', doneFlag: 'a8-loop',
    marks: [{ x: 135.0, z: 76.5, y: 4.4, yaw: Math.PI / 2 }, { x: 126.5, z: 76.5, y: 0, yaw: 0 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-console'] },
  // (marlow-play-2 C13) 20 / 21's A mark by the office door (137.5, 76.5), 5.6 m behind the seated officer, was (141.5, 73.5) at 1.8 m
  { n: 20, id: 'a8-isolate', lesson: 'timed_light_cut', retry: 'caught', doneFlag: 'a8-grille-in', drillS: 25,
    marks: [{ x: 137.5, z: 76.5, y: 4.4, yaw: Math.PI / 2 }, { x: 126.5, z: 76.5, y: 0, yaw: 0 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-night', 'g-a8-grille'] },
  { n: 21, id: 'a8-locks', lesson: 'synced_hack', retry: 'caught', doneFlag: 'a8-sync', drillS: 60,
    marks: [{ x: 137.5, z: 76.5, y: 4.4, yaw: Math.PI / 2 }, { x: 135.5, z: 66.5, y: 0, yaw: Math.PI / 2 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-console', 'g-a8-vault', 'laser-a8'] },
];

/** LANTERN's lines when a step retries (STATIONS section 6; `retryKey`: `retry:<id>` for caught, `retry:<id>:timer` for a window). */
export const A8_RETRY_LINES: Readonly<Record<string, string>> = {
  [retryKey('a8-c2run')]: 'Caught in the banking hall. Back to the vestibule.',
  [retryKey('a8-loopset')]: 'Caught at the security office. Back to the office door and the board.',
  [retryKey('a8-isolate')]: 'Caught at the lighting board. Back to the board.',
  [retryKey('a8-isolate', true)]: 'The hall lights came back. Back to the lighting board.',
  [retryKey('a8-locks')]: 'Caught in the vault lobby. Back to the office console and the lobby.',
  [retryKey('a8-locks', true)]: 'The cameras came back. Loop them again from the office console.',
};

/** The re-plan's public stair: 2.4 m wide (x 130.5-132.9), foot z 67.3, rising north to the gallery as the built flight does. */
export const A8_STAIR = { x0: A8_PUBLIC_STAIR.x0, x1: A8_REPLAN_STAIR_X1, foot: A8_PUBLIC_STAIR.foot } as const;
/** Its open-side collision rails (the built idiom, `A8_STAIR_RAIL`): 0.05 m outside each open edge, from the fourth tread to the gallery. */
export const A8_STAIR_RAILS = { ...A8_STAIR_RAIL, x: [A8_STAIR.x0 - 0.05, A8_STAIR.x1 + 0.05] as readonly number[] } as const;
/** The glazed office screen on the wall line x 134: z from the office's south wall to the door's south jamb, from the floor (4.4) 3.0 m up (the head over it is solid to the 9.0 slab). */
export const A8_GLASS = { x: 134, z0: 71.25, z1: 76.0, y0: 4.4, h: 3.0 } as const;
/** The office switch's new place on the west wall's jamb strip north of the door (the glass took its old spot at z 75.6). */
export const A8_OFFICE_SWITCH_Z = 77.5;
/** The new column under the gallery front at x 112 (0.4 m square, to the slab): it carries the west bays' switch and wall light. */
export const A8_WEST_COLUMN = { x: 112, z: 75, w: 0.4 } as const;
/** Group 85 (the vestibule): two ceiling panels under the return slab (underside 4.0) between its soffit beams; the switch by the L7 door on the west wall. */
export const A8_VESTIBULE_LAMPS: readonly (readonly [number, number, number])[] = [[107.5, 3.8, 62.1], [107.5, 3.8, 67.6]];
export const A8_VESTIBULE_SWITCH = { id: 'a8-sw-vestibule', group: 85, pos: { x: 106.35, y: 1.2, z: 62.5 }, yaw: Math.PI / 2 } as const;
/** Group 86 (the west bays behind the counters): a counter lamp on the main run's west half and a brass wall light on the new column; the switch on the same column. */
export const A8_WEST_COUNTER_LAMP = { x: 117.6, y: 1.6, z: 65.9 } as const;
export const A8_WEST_WALL_LAMP = { x: 112.0, y: 2.3, z: 74.65 } as const;
export const A8_WEST_SWITCH = { id: 'a8-sw-west', group: 86, pos: { x: 112.0, y: 1.2, z: 74.75 }, yaw: Math.PI } as const;
/** The lamp radius and intensity per new fitting (tuned with the light file `tests/ctcourse/replan/a8Strongroom.light.json`). */
export const A8_LAMP = {
  vestibule: { radius: 4.5, intensity: 0.3 },
  counter: { radius: 3.5, intensity: 0.5 },
  wall: { radius: 6.0, intensity: 0.45 },
} as const;

const OAK = '#5a4130';
const STONE = '#6e6a63';
const STEEL = '#8d949b';
const WARM: [number, number, number] = [1.0, 0.86, 0.62];
const BRASS: [number, number, number] = [1.0, 0.8, 0.5];
/** The set's look for the re-plan's skins (the set file's own values). */
const LOOK = {
  stone: '#a39d8e',
  stoneDark: '#6f6a5f',
  brass: '#b58f3d',
  brassDark: '#7f6226',
  steel: '#7b838a',
  steelDark: '#3b4045',
  oakDark: '#46301f',
} as const;
/** A skin's thickness and the thinnest side a skin may have (under `CANON_MIN_THICK`: out of the light shapes). */
const SKIN = 0.03;
const THIN = 0.05;
/** Light groups the re-plan's pieces follow: the gallery's accent (82), the vestibule (85), the west bays (86). */
const G_GALLERY = 82;
const G_VESTIBULE = 85;
const G_WEST = 86;

/** Add the re-plan's pieces to `b` and amend `part` (the merge reads it afterwards). */
export function replanA8Strongroom(b: LevelBuilder, kit: FacilityKit, part: SetPart): void {
  /** A collidable `noLedge` box from x0 to x1, z0 to z1, y0 to y1 (`visible: false` for a filler). */
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string, visible = true): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, true, visible);
    b.mark(from, { noLedge: true });
  };
  /** A visual-only skin (no collision, `noLedge`, one side under `THIN`). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    if (Math.min(x1 - x0, y1 - y0, z1 - z0) >= THIN) throw new Error(`replan a8Strongroom: the skin at (${x0}, ${y0}, ${z0}) is not thin`);
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
    b.mark(from, { noLedge: true });
  };
  /** A skin on a face: `side` its outward direction ('s' -z, 'n' +z, 'w' -x, 'e' +x), `at` its plane, [a0, a1] the run along it, `layer` skins out. */
  const face = (side: 'n' | 's' | 'e' | 'w', at: number, a0: number, a1: number, y0: number, y1: number, color: string, layer = 0): void => {
    const o0 = layer * SKIN;
    const o1 = (layer + 1) * SKIN;
    if (side === 'n') skin(a0, a1, y0, y1, at + o0, at + o1, color);
    else if (side === 's') skin(a0, a1, y0, y1, at - o1, at - o0, color);
    else if (side === 'e') skin(at + o0, at + o1, y0, y1, a0, a1, color);
    else skin(at - o1, at - o0, y0, y1, a0, a1, color);
  };
  /** A thin box pitched like the flight (`b.ramp`'s pitch): `across` wide, `thick` high, `len` long along z, centred at (cx, cy, cz). Visual, `noLedge`. */
  const slope = (cx: number, cy: number, cz: number, across: number, thick: number, len: number, pitch: number, color: string): void => {
    if (Math.min(across, thick) >= THIN) throw new Error(`replan a8Strongroom: the pitched skin at (${cx}, ${cy}, ${cz}) is not thin`);
    const from = b.boxes.length;
    b.box(cx, cy, cz, across, thick, len, color, 0, pitch, false);
    b.mark(from, { noLedge: true });
  };
  /** A lamp as the set file's: electric, destructible, its fixture box centred `fx[1] / 2` over the light point. */
  const lamp = (x: number, y: number, z: number, group: number, radius: number, intensity: number, color: [number, number, number], fx: [number, number, number]): void => {
    b.light({ x, y, z, radius, intensity, color, group, electric: true, destructible: true, fixture: { sx: fx[0], sy: fx[1], sz: fx[2], oy: fx[1] / 2 } });
  };

  const T = 0.3;
  const HE = 134;
  const heW = HE - T / 2;
  const heE = HE + T / 2;
  const gallery = A8_H.gallery;
  const top = gallery + A8_H.balustrade;
  const st = stairSteps(gallery);
  const stair = A8_STAIR;
  const lineAt = (z: number): number => (gallery * (z - stair.foot)) / st.len;
  const stairPitch = -Math.atan2(gallery, st.len);
  const stairLen = Math.sqrt(st.len * st.len + gallery * gallery);

  // ---- A8-R1: the public stair, 2.4 m: 27 risers, the ramp collider, the underside filled in 0.5 m invisible slices ----
  tally(b, part.register, 'A8-R1', 'Public stair on the re-plan, x 130.5-132.9 (2.4 m, graph open_stair), z 67.3-75 (27 risers of 0.163, run 0.285, rising north to the gallery): step boxes and the ramp collider, noLedge fillers under the flight (invisible, 0.5 m slices)', () => {
    b.stairs((stair.x0 + stair.x1) / 2, stair.foot + st.len / 2, stair.x1 - stair.x0, st.len, gallery, st.steps, OAK, 0, 0);
    for (let a0 = 0; a0 < st.len - 1e-9; a0 += 0.5) {
      const a1 = Math.min(a0 + 0.5, st.len);
      const hgt = (gallery * a0) / st.len - 0.05;
      if (hgt < 0.05) continue;
      slab(stair.x0, stair.x1, stair.foot + a0, stair.foot + a1, 0, hgt, STEEL, false);
    }
  });

  // ---- A8-R2: the gallery front's east piece from the widened stair head (x 132.9) to the east wall, and the new column at x 112 ----
  tally(b, part.register, 'A8-R2', "Gallery front east piece x 132.9-133.85, z 75-75.2 (1.2 m solid balustrade, noLedge): the stair head's gap is x 130.5-132.9; the fourth north column (x 133) is not built; a new 0.4 m column at x 112 (z 75, to the slab, noLedge) under the gallery front carries the west bays' switch and wall light", () => {
    slab(stair.x1, A8_NORTH.x1, 75.0, 75.2, gallery, top, STONE);
    slab(A8_WEST_COLUMN.x - A8_WEST_COLUMN.w / 2, A8_WEST_COLUMN.x + A8_WEST_COLUMN.w / 2, A8_WEST_COLUMN.z - 0.2, A8_WEST_COLUMN.z + 0.2, 0, A8_H.slab, STONE);
  });

  // ---- A8-R3: the stair's open sides: the kit's balustrade and its collision rail (invisible noLedge), thirteen stepped segments a side ----
  tally(b, part.register, 'A8-R3', "Public stair rails (the open sides' 1.1 m collision rail: kit.handrail, invisible noLedge, thirteen stepped segments of 0.55 m a side 0.05 m outside the 2.4 m flight, from the fourth tread to the gallery where they meet the balustrade's ends; the foot stays open to step on; accent on the gallery strip 82)", () => {
    const { x: rx, from, to, seg, h } = A8_STAIR_RAILS;
    const n = Math.ceil((to - from) / seg - 1e-9);
    for (const x of rx) {
      for (let k = 0; k < n; k++) {
        const za = from + k * seg;
        const zb = Math.min(za + seg, to);
        kit.handrail(x, za, x, zb, { y: lineAt(za), h: h + (lineAt(zb) - lineAt(za)), group: G_GALLERY });
      }
    }
  });

  // ---- A8-R4: the office's west wall: a glazed screen over the gallery floor, a solid head, the door as built ----
  const glass = A8_GLASS;
  tally(b, part.register, 'A8-R4', "Security office west wall on the re-plan: a glazed screen (kit.glass, collision-only, 3.0 m from the office floor 4.4 to 7.4) on x 134 from z 71.25 to the door's south jamb (76.0), under a solid head 7.4-9.0 (noLedge); the door A8-office (z 76.0-77.2) and the wall north of it as built", () => {
    kit.glass(glass.x, glass.z0, glass.x, glass.z1, glass.h, { y: glass.y0 });
    slab(heW, heE, glass.z0, glass.z1, glass.y0 + glass.h, A8_H.hall, KIT_BOX_COLOR);
  });

  // ---- A8-R5: the vestibule's two ceiling panels (group 85) and the west bays' counter lamp and brass wall light (group 86) ----
  tally(b, part.register, 'A8-R5', 'Lamps on the re-plan: vestibule circuit 85 (two warm ceiling panels at 3.8 under the return slab, between its soffit beams), west bays circuit 86 (a counter lamp over the main run at (117.6, 1.6, 65.9) and a brass wall light on the x 112 column at (112, 2.3, 74.65)); each circuit on its own wall switch', () => {
    for (const [x, y, z] of A8_VESTIBULE_LAMPS) lamp(x, y, z, G_VESTIBULE, A8_LAMP.vestibule.radius, A8_LAMP.vestibule.intensity, WARM, [0.6, 0.05, 0.6]);
    const c = A8_WEST_COUNTER_LAMP;
    lamp(c.x, c.y, c.z, G_WEST, A8_LAMP.counter.radius, A8_LAMP.counter.intensity, WARM, [0.2, 0.2, 0.2]);
    const w = A8_WEST_WALL_LAMP;
    lamp(w.x, w.y, w.z, G_WEST, A8_LAMP.wall.radius, A8_LAMP.wall.intensity, BRASS, [0.2, 0.3, 0.15]);
  });

  // ---- A8-R6: dressing the re-plan's pieces (visual skins, no collision) ----
  tally(b, part.register, 'A8-R6', "Dressing of the re-plan's pieces (visual skins, no collision): the 2.4 m stair's rails (a post every 1.5 m, balusters every 0.4 m under a brass top rail and a mid rail, a stringer along the nosings, foot newels), the east balustrade piece's coping, panel, base moulding, frieze and newel, the x 112 column's base, capital, wall-light plate and switch plate, steel rails and posts round the glazed screen on both faces, the vestibule panels' hangers, the counter lamp's stem", () => {
    // the stair's rails
    for (const x of [stair.x0 - 0.03, stair.x1 + 0.03]) {
      const mid = stair.foot + st.len / 2;
      slope(x, gallery / 2 + A8_RAIL_LIFT.top, mid, 0.05, 0.04, stairLen, stairPitch, LOOK.brass);
      slope(x, gallery / 2 + A8_RAIL_LIFT.mid, mid, 0.03, 0.04, stairLen, stairPitch, LOOK.steelDark);
      slope(x, gallery / 2 - 0.1, mid, 0.03, 0.3, stairLen, stairPitch, LOOK.oakDark);
      for (let z = stair.foot + 0.4; z < stair.foot + st.len - 0.1; z += 0.4) {
        const hgt = A8_RAIL_LIFT.top - 0.02;
        skin(x - 0.01, x + 0.01, lineAt(z) + 0.05, lineAt(z) + hgt, z - 0.01, z + 0.01, LOOK.steelDark);
      }
      for (let z = stair.foot + 0.4; z < stair.foot + st.len; z += 1.5) skin(x - 0.02, x + 0.02, lineAt(z), lineAt(z) + A8_RAIL_LIFT.top + 0.04, z - 0.02, z + 0.02, LOOK.brassDark);
      skin(x - 0.05, x + 0.05, 0, 1.1, stair.foot - 0.115, stair.foot - 0.085, LOOK.oakDark);
      skin(x - 0.015, x + 0.015, 0, 1.1, stair.foot - 0.15, stair.foot - 0.05, LOOK.oakDark);
      skin(x - 0.06, x + 0.06, 1.1, 1.13, stair.foot - 0.16, stair.foot - 0.04, LOOK.brass);
    }
    // the east balustrade piece (the built idiom: coping over the thickness, a base moulding and a raised panel on both faces, the frieze with its brass line, a newel at the gap's end)
    const x0 = stair.x1;
    const x1 = A8_NORTH.x1;
    skin(x0 - 0.04, x1, top, top + SKIN, 74.96, 75.24, LOOK.stone);
    for (const [side, at] of [['s', 75.0], ['n', 75.2]] as const) {
      face(side, at, x0, x1, gallery, gallery + 0.16, LOOK.stoneDark, 1);
      const c = (x0 + x1) / 2;
      const w = Math.min(1.4, x1 - x0 - 0.4);
      face(side, at, c - w / 2, c + w / 2, 4.65, 5.35, LOOK.stoneDark, 1);
      face(side, at, c - w / 2 + 0.07, c + w / 2 - 0.07, 4.72, 5.28, LOOK.stone, 2);
    }
    face('s', 75.0, x0, x1, 4.05, 4.35, LOOK.stoneDark, 1);
    face('s', 75.0, x0, x1, 4.18, 4.22, LOOK.brass, 2);
    skin(x0, x0 + SKIN, top, top + 0.35, 75.0, 75.2, LOOK.stone);
    skin(x0 + 0.2 - SKIN, x0 + 0.2, top, top + 0.35, 75.0, 75.2, LOOK.stone);
    skin(x0, x0 + 0.2, top, top + 0.35, 75.0, 75.0 + SKIN, LOOK.stone);
    skin(x0, x0 + 0.2, top, top + 0.35, 75.2 - SKIN, 75.2, LOOK.stone);
    skin(x0 - 0.02, x0 + 0.22, top + 0.35, top + 0.35 + SKIN, 74.98, 75.22, LOOK.stoneDark);
    // the x 112 column: base and capital on its four faces, the wall light's plate and the switch's plate on its south face
    const { x: cx, z: cz } = A8_WEST_COLUMN;
    face('s', cz - 0.2, cx - 0.2, cx + 0.2, 0, 0.35, LOOK.stoneDark, 1);
    face('n', cz + 0.2, cx - 0.2, cx + 0.2, 0, 0.35, LOOK.stoneDark, 1);
    face('w', cx - 0.2, cz - 0.2, cz + 0.2, 0, 0.35, LOOK.stoneDark, 1);
    face('e', cx + 0.2, cz - 0.2, cz + 0.2, 0, 0.35, LOOK.stoneDark, 1);
    for (const [side, at, a0, a1] of [['s', cz - 0.2, cx - 0.2, cx + 0.2], ['n', cz + 0.2, cx - 0.2, cx + 0.2], ['w', cx - 0.2, cz - 0.2, cz + 0.2], ['e', cx + 0.2, cz - 0.2, cz + 0.2]] as const) {
      face(side, at, a0, a1, 3.62, 4.0, LOOK.stone, 1);
      face(side, at, a0, a1, 3.82, 4.0, LOOK.stoneDark, 2);
    }
    face('s', cz - 0.2, cx - 0.14, cx + 0.14, 2.22, 2.8, LOOK.brassDark, 0);
    face('s', cz - 0.2, cx - 0.08, cx + 0.08, 2.3, 2.75, LOOK.brass, 1);
    face('s', cz - 0.2, cx - 0.07, cx + 0.07, 1.1, 1.3, LOOK.steel, 0);
    // the glazed screen: a steel sill and head rail and a post at each end on both faces (the kit draws the panes and their mullions)
    for (const [side, at] of [['w', heW], ['e', heE]] as const) {
      face(side, at, glass.z0, glass.z1, glass.y0, glass.y0 + 0.12, LOOK.steelDark, 1);
      face(side, at, glass.z0, glass.z1, glass.y0 + glass.h - 0.1, glass.y0 + glass.h, LOOK.steelDark, 1);
      face(side, at, glass.z0, glass.z0 + 0.06, glass.y0, glass.y0 + glass.h, LOOK.steel, 2);
      face(side, at, glass.z1 - 0.06, glass.z1, glass.y0, glass.y0 + glass.h, LOOK.steel, 2);
    }
    // the vestibule's two panels hang on four short rods each (as the office's)
    for (const [x, y, z] of A8_VESTIBULE_LAMPS) for (const dx of [-0.27, 0.27]) for (const dz of [-0.27, 0.27]) skin(x + dx - 0.01, x + dx + 0.01, y + 0.05, A8_H.slab - 0.03, z + dz - 0.01, z + dz + 0.01, LOOK.steelDark);
    // the counter lamp's base plate and brass stem (from the marble top at 1.21 to the light point)
    const cl = A8_WEST_COUNTER_LAMP;
    skin(cl.x - 0.07, cl.x + 0.07, 1.21, 1.23, cl.z - 0.07, cl.z + 0.07, LOOK.brassDark);
    skin(cl.x - 0.02, cl.x + 0.02, 1.23, cl.y, cl.z - 0.02, cl.z + 0.02, LOOK.brass);
  });

  // ---- the office switch moves to the jamb strip north of the door; the gallery switch to the widened stair head's east end ----
  for (const sw of part.switches) {
    if (sw.id === 'a8-sw-office') sw.pos = { ...sw.pos, z: A8_OFFICE_SWITCH_Z };
    if (sw.id === 'a8-sw-gallery') sw.pos = { ...sw.pos, x: stair.x1 - 0.05 };
  }
  // ---- the two new circuits: their groups and wall switches (`MARLOW_CIRCUITS_REPLAN` 85 and 86) ----
  const groups = marlowCourseGroups(MARLOW_CIRCUITS_REPLAN);
  for (const k of ['a8-vestibule', 'a8-west']) {
    const g = groups[k];
    if (g === undefined) throw new Error(`replan a8Strongroom: the circuit table has no '${k}'`);
    part.groups[k] = g;
  }
  part.switches.push(
    { id: A8_VESTIBULE_SWITCH.id, group: A8_VESTIBULE_SWITCH.group, pos: { ...A8_VESTIBULE_SWITCH.pos }, yaw: A8_VESTIBULE_SWITCH.yaw },
    { id: A8_WEST_SWITCH.id, group: A8_WEST_SWITCH.group, pos: { ...A8_WEST_SWITCH.pos }, yaw: A8_WEST_SWITCH.yaw },
  );

  // ---- the stations, the pass zones, the steps and LANTERN's lines ----
  part.bay.stations = A8_STATIONS;
  part.passZones.push(
    { id: 'a8-p-office-in', box: [...A8_OFFICE_IN_ZONE], flag: A8_OFFICE_IN_FLAG, floorY: gallery, any: true },
    { id: 'a8-p-grille-in', box: [...A8_GRILLE_IN_ZONE], flag: A8_GRILLE_IN_FLAG, floorY: 0, any: true },
  );
  part.externalFlags.push(A8_OFFICE_IN_FLAG, A8_GRILLE_IN_FLAG);
  // the built chain stays where it matches the four steps; two lines change: the west end is no longer dark, and the jam names where it is made from
  const line = (id: string, f: (o: SetPart['objectives'][number]) => void): void => {
    const o = part.objectives.find((q) => q.id === id);
    if (!o) throw new Error(`replan a8Strongroom: no objective '${id}'`);
    f(o);
  };
  line('a8-split', (o) => {
    o.a = 'Take the boost to the gallery at the west end, over the vestibule.';
  });
  line('a8-office', (o) => {
    o.b = 'Jam the gallery camera from behind the counters for your partner.';
  });
  // (marlow-play C5) the grille step is done on station 20's own flag (one through the grille), not A's lobby zone: that
  // ticked while 21 was live, so a 21 retry took the step back
  line('a8-grille', (o) => {
    o.done = { flag: A8_GRILLE_IN_FLAG };
  });
  for (const [at, text] of Object.entries(A8_RETRY_LINES)) part.bay.radio.push({ at, text });

  // ---- the re-plan's light spots: the vestibule and the jam spot are lit now, and each new switch cuts its circuit ----
  const spot = (name: string): SetPart['lightSpots'][number] => {
    const s = part.lightSpots.find((q) => q.name === name);
    if (!s) throw new Error(`replan a8Strongroom: no light spot '${name}'`);
    return s;
  };
  spot('A8 vestibule').band = 'read';
  spot('A8 jam spot').band = 'read';
  spot('A8 leg-up mark').band = 'any';
  part.lightSpots.push(
    { name: 'A8 vestibule cut', kind: 'body', x: 107.6, y: 0, z: 64.5, band: 'cut', off: [85] },
    { name: 'A8 jam spot cut', kind: 'body', x: 118.0, y: 0, z: 67.2, band: 'cut', off: [86] },
    { name: 'A8 west bay', kind: 'body', x: 112.8, y: 0, z: 72.8, band: 'read' },
    { name: 'A8 west bay cut', kind: 'body', x: 112.8, y: 0, z: 72.8, band: 'cut', off: [86] },
  );

  // ---- map data the e2e and the debug menu read ----
  part.debugPoints.push(
    { id: 'A8-stair', label: 'Set 8 public stair foot (2.4 m)', pos: { x: 131.7, y: 0, z: 66.6 }, yaw: 0 },
    { id: 'A8-glass', label: 'Set 8 gallery, the glazed office wall', pos: { x: 132.4, y: gallery, z: 76.4 }, yaw: Math.PI / 2 },
    { id: 'A8-west', label: 'Set 8 west bays (switch column)', pos: { x: 112.0, y: 0, z: 73.6 }, yaw: 0 },
  );
}
