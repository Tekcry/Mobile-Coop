/**
 * A8 the Strongroom (SPEC section 9 "A8 - Set 8, the Strongroom"; set doc `docs/marlow-final/sets/a8Strongroom.md`, section 13 over
 * SPEC; PLAN slice 8, steps 2-4: greybox, lights, guards / devices / objective steps / e2e). A Victorian bank's banking hall at night:
 * the graduation set, everything in sync. The leg-up split onto the public gallery, the cross-level jam on C2, the security office loop
 * (N3, 60 s), the timed light and lock isolation at the lighting board (N2, 25 s, the `mains` grille), the partner throw over the inner
 * beam curtain, the paired hack of the two time locks (N6, second pair) and the walk out through the vault to the cash dock.
 *
 * Ground, set box x 106-150, z 50-78 (the walls on the box edges are `facility.ts`'s, 0.5 m on the lines; plan faces are 0.25 m in):
 * - the banking hall x 106.25-133.85, z 50.25-77.75 under a 9.0 m ceiling slab: marble floor, oak counters (main run x 114-126, return
 *   x 125.26-126 down to z 58.3, 1.2 m), the night desk (x 127.3-129.7, z 70-70.9, 0.75 m), the public stair x 130.5-131.7 (27 risers
 *   rising north to the gallery), the east wall x 134 with the public grille gate (`A8-grille`, x 134, z 61.1-62.9, 3.0 m);
 * - the public gallery (hand slab 4.0-4.4 on columns, A8-D1): the north run x 106.25-133.85, z 75-77.75 and the west return x 106.25-109,
 *   z 56-75, a 1.2 m solid balustrade on every front edge but the public stair head and the return's open loading edge (x 109, z 66-70.5:
 *   the one co-op lip, a manual ledge at 4.4); under the return the vestibule (no fitting), under the north run the strip with the
 *   lighting board `a8-board` on the north wall at (127, 0.9, 77.6);
 * - the security office x 134-144, z 71.4-78 at gallery level (floor 4.4 on a solid block, ceiling 7.4), door `A8-office` on its west wall,
 *   the console on the east wall, the medkit on the north wall; its stair: an enclosed stairwell along the lobby's north side (flight
 *   x 134.5-142.2, z 70-71.2, 27 risers rising east, the strip south of it a closed block) down to the foot door `A8-stair-foot` (push bar
 *   on the stair side) into the lobby's outer zone;
 * - the vault lobby x 134.15-145.85, z 56.15-67.85 (5.5 m, steel plate): the beam curtain at x 140 (`throwGateway`, header 4.8, beams
 *   switched off by `a8-sync`), the time locks T1 (north wall) and T2 (east wall beside the vault door) and its power panel, the
 *   vault door `A8-vault` on x 146 (z 61.3-62.7, a flag gate on `a8-sync`) into the vault x 146.15-149.75, z 58.15-65.85, open at its back to
 *   the cash dock (the facility's);
 * - closed solid blocks (back offices, plant): no doors.
 * Every collidable block 1.9 m or taller is `noLedge`; the only lip in the co-op band is the return's open edge (`COOP_LIPS`). Prototype
 * values (G10).
 *
 * Lights (LIGHTING-PLAN 3, A8; `MARLOW_CIRCUITS` 81-84): the hall night circuit 81 (three chandeliers, three counter lamps, the desk lamp;
 * the board is its isolator, the grille reads it), gallery wall lights 82 (switch at the stair head), office 83 (switch by its door), vault
 * lobby 84 (the time lock's circuit, no switch). The vestibule and the west bays have no fitting.
 */
import type { GuardInfo } from '../../../ai/guardInfo';
import type { EgressGate, FlagGate, IsolatorGate, MainsGate, PickupGate } from '../../../game/course/courseDef';
import type { LaserPanelDef } from '../../../game/laserPanels';
import type { CameraDevice } from '../../../security/data';
import { KIT_BOX_COLOR, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { circuitOf, marlowCourseGroups } from '../../lighting/marlowCircuits';
import { applyGreybox, COOP_LIP, stairSteps, syncStation, throwGateway, type CoopLip, type ThrowGatewayOpts } from '../ctcourseGreybox';
import { emptyPart, tally, type SetPart } from './types';

/** The three guards: N1 the night desk clerk, N2 the hall patrol, the duty officer in the security office. */
export const A8_N1 = 'a8-night1';
export const A8_N2 = 'a8-night2';
export const A8_OFFICER = 'a8-officer';
/** A walker pauses at a route point for its `waits` entry; a wait of 0 never advances (`PatrolWalker.step`, S2), so the pass-through
 *  points pause this long (s). */
export const A8_PASS_WAIT = 0.1;
/** N1: a post with head turns (south-west, then south-east, 6 s each). */
export const A8_N1_POST = { x: 128.5, z: 71.6 } as const;
export const A8_N1_ROUTE: [number, number][] = [[128.5, 71.6], [128.5, 71.6]];
export const A8_N1_WAITS = [6, 6];
export const A8_N1_FACES = [Math.PI + 0.6, Math.PI - 0.6];
/** N2: TALK (west of the desk, facing N1), W1 (past the public stair's foot), G the grille, SE the south-east floor, W2 the counters' east end. */
export const A8_N2_ROUTE: [number, number][] = [[126.4, 71.2], [129.6, 66.5], [133.2, 62.0], [131.0, 58.5], [127.0, 66.9]];
export const A8_N2_WAITS = [5, A8_PASS_WAIT, 5, A8_PASS_WAIT, A8_PASS_WAIT];
export const A8_N2_FACES = [Math.PI / 2, Number.NaN, Math.PI / 2, Number.NaN, Number.NaN];
/** The officer's post (seated at the console, his back to the door) and what he gives up when held (set doc section 2, G206, P14). */
export const A8_OFFICER_POST = { x: 142.9, z: 74.7, y: 4.4 } as const;
export const A8_OFFICER_INFO: GuardInfo = {
  lines: ['The board under the gallery kills the hall lights. The grille is on the same circuit.', 'Both time locks turn together. The beams in the lobby drop with them.'],
};

/** The console (course device and N3 console), its pickup gate, the flag the cameras name, the timed loop, the three cameras. */
export const A8_CONSOLE = 'a8-console';
export const A8_CONSOLE_GATE = 'g-a8-console';
export const A8_LOOP_FLAG = 'a8-loop';
export const A8_LOOP = { seconds: 60, rearm: 20 } as const;
export const A8_CAMERAS = ['a8-cam1', 'a8-cam2', 'a8-cam3'] as const;
/** The gallery level the cross-level camera C2 hangs over (`SecurityData.levels`, A8-C13) and its floor. */
export const A8_GALLERY_LEVEL = 'a8-gallery';
export const A8_LEVELS: Readonly<Record<string, number>> = { [A8_GALLERY_LEVEL]: 4.4 };
/** The part with the camera levels it needs (`MapLayout.security.levels`): `SetPart` has no field for it, so the merge reads this one (S8 request). */
export type A8Part = SetPart & { levels: Record<string, number> };

/** The night circuit's isolator (the lighting board), the grille's two gates (mains, request-to-exit), the stair foot's, the vault's. */
export const A8_BOARD = 'a8-board';
export const A8_NIGHT_GROUP = 'a8-night';
export const A8_NIGHT_GATE = 'g-a8-night';
export const A8_GRILLE = 'A8-grille';
export const A8_GRILLE_GATE = 'g-a8-grille';
export const A8_RTE = 'a8-rte';
export const A8_RTE_GATE = 'g-a8-rte';
/** The request-to-exit's device and egress gate on the grille: off until `CourseState.locked` opens a door on any open gate (S8 request 1). */
export const A8_RTE_GATE_ON: boolean = false;
/** Where the request-to-exit stands when it is on: the lobby's south wall (136.3, 1.1, 56.15), 2.75 m from a body at the hall wall and out of the stairs' reach (A8-D13). */
export const A8_RTE_AT = { x: 136.3, y: 1.1, z: 56.15, yaw: 0 } as const;
export const A8_STAIR_BAR = 'a8-stair-bar';
export const A8_STAIR_GATE = 'g-a8-stair';
export const A8_VAULT = 'A8-vault';
export const A8_VAULT_GATE = 'g-a8-vault';
export const A8_OFFICE_DOOR = 'A8-office';
export const A8_STAIR_TOP = 'A8-stair-top';
export const A8_STAIR_FOOT = 'A8-stair-foot';
/** The time locks (SPEC-style ids, A8-D5), the scanner pair and the flag a synced hack sets. */
export const A8_T1 = 'a8-t1';
export const A8_T2 = 'a8-t2';
export const A8_SCANNER = 'sc-a8';
export const A8_SYNC_FLAG = 'a8-sync';
/** The devices stand 0.1 m off the wall faces (z 67.85 / x 145.85): the scanner glow sits 0.1 m behind the device (`SCAN_GLOW.back`), so a device on the face would put its lamps in the wall (A8-D16). */
export const A8_T1_AT = { x: 137.0, z: 67.75, yaw: Math.PI } as const;
export const A8_T2_AT = { x: 145.75, z: 59.6, yaw: -Math.PI / 2 } as const;
export const A8_PANEL_Y = 1.2;
export const A8_T1_SPOT: [number, number] = [137.0, 67.15];
export const A8_T2_SPOT: [number, number] = [145.15, 59.6];
/** The pass-zone flags and the claim. */
export const A8_GAL_FLAG = 'a8-gal1';
export const A8_LOBBY_FLAG = 'a8-lobby';
export const A8_INNER_FLAG = 'a8-inner1';
export const A8_GAL_ZONE: [number, number, number, number] = [106.2, 56, 134, 77.775];
export const A8_LOBBY_ZONE: [number, number, number, number] = [134.3, 56.3, 145.7, 67.7];
export const A8_INNER_ZONE: [number, number, number, number] = [140.4, 56.6, 145.7, 67.4];

/** The throw gateway (set doc 1.3), kept whole so the tests rebuild the same piece; its release is dropped (A8-D4). */
export const A8_GATEWAY: ThrowGatewayOpts = { id: 'a8', at: { x: 140, z: 62 }, facing: '+x', gap: 11, span: 12, wallH: 5.5, header: 4.8, thick: 0.3, beams: [0.35, 0.9, 1.45], stand: 1.2 };
export const A8_LASER = 'laser-a8';
export const A8_THROW = { x: 138.8, z: 62 } as const;
export const A8_RUNNER = { x: 137.8, z: 62 } as const;
export const A8_LANDING = { x: 142.0, z: 62 } as const;
/** The beams' power panel (high on the lobby's east wall, north of the vault door: `checkPanels` wants one per laser; A8-D11). */
export const A8_PANEL: LaserPanelDef = { id: 'panel-a8', lasers: [A8_LASER], x: 145.75, y: 4.2, z: 66.0, yaw: -Math.PI / 2, label: 'Lobby beams' };

/** The leg-up mark (feet), the gallery's open loading edge (the one co-op lip) and the cross-level jam spot (set doc section 1). */
export const A8_LEGUP = { x: 109.5, z: 68.25 } as const;
export const A8_LIP: CoopLip = { id: 'a8-gallery-lip', y: COOP_LIP, floor: 0, a: { x: 109, z: 66.0 }, b: { x: 109, z: 70.5 }, n: { x: 1, z: 0 } };
export const A8_JAM = { x: 118.0, z: 67.2 } as const;
export const A8_PIER = { x: 125, z: 76.4 } as const;
export const A8_BOARD_WEST = { x: 126.4, z: 76.5 } as const;
export const A8_GRILLE_SPOT = { x: 133.0, z: 62.0 } as const;

/** The hall's faces and heights. */
export const A8_SHELL = { west: 106.25, east: 149.75, south: 50.25, north: 77.75 } as const;
export const A8_H = { hall: 9.0, gallery: 4.4, slab: 4.0, office: 7.4, lobby: 5.5, vault: 3.0, stairwell: 7.4, balustrade: 1.2 } as const;
/** The gallery's slab and the open edge of the return. */
export const A8_RETURN = { x0: 106.25, x1: 109.0, z0: 56.0, z1: 75.0 } as const;
export const A8_NORTH = { x0: 106.25, x1: 133.85, z0: 75.0, z1: 77.75 } as const;
export const A8_OPEN_EDGE: [number, number] = [66.0, 70.5];
export const A8_COLUMNS_N: readonly number[] = [115, 121, 127, 133];
/** The return's columns (z at x 109): the doc's (56.2, 62, 68) with the third moved off the open span (A8-D9). */
export const A8_COLUMNS_W: readonly number[] = [56.2, 62, 65.6, 71.0];
/** The public stair (foot z 67.3, rising north) and the office stair (foot x 134.5, rising east). */
export const A8_PUBLIC_STAIR = { x0: 130.5, x1: 131.7, foot: 67.3 } as const;
export const A8_OFFICE_STAIR = { z0: 70.0, z1: 71.2, foot: 134.5 } as const;
/** The closed block south of the flight starts here (x): the foot landing is x 134.15-135.2, so a body there is 2.18 m from T1 (A8-D13). */
export const A8_STAIR_BLOCK_X0 = 135.2;
/** The counters (plan boxes) and the night desk. */
export const A8_COUNTER_MAIN = { x0: 114.0, x1: 126.0, z0: 65.5, z1: 66.24, h: 1.2 } as const;
export const A8_COUNTER_RETURN = { x0: 125.26, x1: 126.0, z0: 58.3, z1: 65.5, h: 1.2 } as const;
export const A8_DESK = { x0: 127.3, x1: 129.7, z0: 70.0, z1: 70.9, h: 0.75 } as const;

const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
const WARM: [number, number, number] = [1.0, 0.86, 0.62];
const BRASS: [number, number, number] = [1.0, 0.8, 0.5];
const OAK = '#5a4130';
const COUNTER = '#4a3324';
const STONE = '#6e6a63';
const PLATE = '#585d61';
const STEEL = '#8d949b';
const CONCRETE = '#5b5e61';

/** Lamp radius and intensity per circuit (prototype values, tuned with `CTLIGHT_WRITE=a8Strongroom`). */
const LAMP = {
  chandelier: { radius: 9, intensity: 1.5 },
  counter: { radius: 2.2, intensity: 0.6 },
  desk: { radius: 2.0, intensity: 0.5 },
  gallery: { radius: 3.5, intensity: 0.9 },
  office: { radius: 5, intensity: 0.9 },
  lobby: { radius: 6.0, intensity: 1.0 },
  lock: { radius: 3.4, intensity: 0.7 },
} as const;

export function buildA8Strongroom(b: LevelBuilder, _kit: FacilityKit): A8Part {
  const p = emptyPart('a8Strongroom');
  /** A box from x0 to x1, z0 to z1, y0 to y1; `noLedge` unless told otherwise. */
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string, opts: { overhead?: boolean; noLedge?: boolean; visible?: boolean } = {}): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, true, opts.visible ?? true);
    b.mark(from, { noLedge: opts.noLedge ?? true, ...(opts.overhead ? { overhead: true } : {}) });
  };
  /** The collision fillers under a flight (A2-17, S2-check should-fix 2): 0.5 m slices of invisible solid to 0.05 m under the ramp's
   *  nosing line at each slice's low end, so nothing can stand in the steps. `axis` is the run's axis, `sign` its direction. */
  const fillFlight = (axis: 'x' | 'z', sign: 1 | -1, foot: number, len: number, rise: number, c0: number, c1: number): void => {
    for (let a0 = 0; a0 < len - 1e-9; a0 += 0.5) {
      const a1 = Math.min(a0 + 0.5, len);
      const hgt = (rise * a0) / len - 0.05;
      if (hgt < 0.05) continue;
      const u0 = sign === 1 ? foot + a0 : foot - a1;
      const u1 = sign === 1 ? foot + a1 : foot - a0;
      if (axis === 'x') slab(u0, u1, c0, c1, 0, hgt, STEEL, { visible: false });
      else slab(c0, c1, u0, u1, 0, hgt, STEEL, { visible: false });
    }
  };

  const S = A8_SHELL;
  const T = 0.3;
  const HE = 134; // the hall's east wall centre line
  const heW = HE - T / 2;
  const heE = HE + T / 2;
  const DOOR_H = 2.1;
  const grille = { z0: 61.1, z1: 62.9, h: 3.0 };

  // ---- A8-1: the hall's ceiling and east wall (the grille gate's opening and lintel) ----
  tally(b, p.register, 'A8-1', "Banking hall: a 9.0 m ceiling slab (overhead, noLedge) x 106.25-133.85, z 50.25-77.75; the east wall x 134 (0.3, 9.0 m) with the public grille's opening z 61.1-62.9 (lintel 3.0-9.0); oak boards on the gallery", () => {
    slab(S.west, heW, S.south, S.north, A8_H.hall, A8_H.hall + 0.2, KIT_BOX_COLOR, { overhead: true });
    slab(heW, heE, S.south, grille.z0, 0, A8_H.hall, KIT_BOX_COLOR);
    slab(heW, heE, grille.z1, 71.4, 0, A8_H.hall, KIT_BOX_COLOR);
    slab(heW, heE, grille.z0, grille.z1, grille.h, A8_H.hall, KIT_BOX_COLOR);
    b.surface('wood', A8_NORTH.x0, A8_NORTH.x1, A8_NORTH.z0, A8_NORTH.z1, A8_H.gallery);
    b.surface('wood', A8_RETURN.x0, A8_RETURN.x1, A8_RETURN.z0, A8_RETURN.z1, A8_H.gallery);
  });

  // ---- A8-2: the public gallery: the slab on columns, the balustrade, the open loading edge (A8-D1) ----
  const r = A8_RETURN;
  const n = A8_NORTH;
  const bal = A8_H.balustrade;
  tally(b, p.register, 'A8-2', 'Public gallery: a hand slab 4.0-4.4 (overhead, noLedge) on the north run x 106.25-133.85, z 75-77.75 and the west return x 106.25-109, z 56-75; 0.4 m columns (noLedge) at x 115 / 121 / 127 / 133 on z 75 and at z 56.2 / 62 / 65.6 / 71 on x 109; the 1.2 m solid balustrade (noLedge) on every front edge but the public stair head and the open loading edge z 66-70.5; the one manual ledge (the co-op lip, 4.4)', () => {
    slab(n.x0, n.x1, n.z0, n.z1, A8_H.slab, A8_H.gallery, OAK, { overhead: true });
    slab(r.x0, r.x1, r.z0, r.z1, A8_H.slab, A8_H.gallery, OAK, { overhead: true });
    for (const x of A8_COLUMNS_N) slab(x - 0.2, x + 0.2, 74.8, 75.2, 0, A8_H.slab, STONE);
    for (const z of A8_COLUMNS_W) slab(108.8, 109.2, z - 0.2, z + 0.2, 0, A8_H.slab, STONE);
    const top = A8_H.gallery + bal;
    // the north front (z 75.0-75.2), x 108.8 round the corner to the stair head x 130.5, then 131.7 to the east wall
    slab(108.8, 130.5, 75.0, 75.2, A8_H.gallery, top, STONE);
    slab(131.7, n.x1, 75.0, 75.2, A8_H.gallery, top, STONE);
    // the return's front (x 108.8-109.0): z 56.2 to the open edge, and from it to the corner; and the return's south end
    slab(108.8, 109.0, 56.2, A8_OPEN_EDGE[0], A8_H.gallery, top, STONE);
    slab(108.8, 109.0, A8_OPEN_EDGE[1], 75.0, A8_H.gallery, top, STONE);
    slab(r.x0, 109.0, 56.0, 56.2, A8_H.gallery, top, STONE);
    // the open loading edge: the one manual ledge, a -> b with the floor on its right (normal +x)
    b.ledge(109, A8_OPEN_EDGE[0], 109, A8_OPEN_EDGE[1], A8_H.gallery);
  });
  p.lips.push(A8_LIP);

  // ---- A8-3: the public stair (27 risers, rising north) with its underside filled ----
  const ps = A8_PUBLIC_STAIR;
  const st = stairSteps(A8_H.gallery);
  tally(b, p.register, 'A8-3', 'Public stair x 130.5-131.7, z 67.3-75 (27 risers of 0.163, run 0.285, rising north to the gallery): step boxes and the ramp collider, noLedge fillers under the flight (invisible, 0.5 m slices)', () => {
    b.stairs((ps.x0 + ps.x1) / 2, ps.foot + st.len / 2, ps.x1 - ps.x0, st.len, A8_H.gallery, st.steps, OAK, 0, 0);
    fillFlight('z', 1, ps.foot, st.len, A8_H.gallery, ps.x0, ps.x1);
  });

  // ---- A8-4: the oak counters and the night desk (low cover) ----
  tally(b, p.register, 'A8-4', 'Oak counters 1.2 m (main run x 114-126, z 65.5-66.24, from x 114: A8-D2; return x 125.26-126, z 58.3-65.5) and the night desk 0.75 m, x 127.3-129.7, z 70-70.9: low cover, solo-standable tops', () => {
    for (const c of [A8_COUNTER_MAIN, A8_COUNTER_RETURN]) slab(c.x0, c.x1, c.z0, c.z1, 0, c.h, COUNTER, { noLedge: false });
    slab(A8_DESK.x0, A8_DESK.x1, A8_DESK.z0, A8_DESK.z1, 0, A8_DESK.h, COUNTER, { noLedge: false });
  });

  // ---- A8-5: the security office (floor block 4.4, walls, ceiling 7.4, the door, the stair-top door) ----
  const OF = { x0: 134, x1: 144 } as const;
  const ofE = OF.x1 + T / 2;
  const officeDoor = { z0: 76.0, z1: 77.2 };
  const topDoor = { x0: 142.6, x1: 143.8 };
  const floorY = A8_H.gallery;
  tally(b, p.register, 'A8-5', 'Security office x 134-144, z 71.4-78: floor a solid block to 4.4 (noLedge, closed rooms below), walls to the hall roof with the door A8-office on the west wall (z 76.0-77.2, 1.2 x 2.1) and the stair-top door A8-stair-top on the south wall (x 142.6-143.8), roof 7.4-7.5; carpet; the console desk on the east wall', () => {
    slab(heW, ofE - T, 71.25, S.north, 0, floorY, KIT_BOX_COLOR);
    // west wall (above the floor block), door gap and lintel
    slab(heW, heE, 71.4, officeDoor.z0, floorY, A8_H.hall, KIT_BOX_COLOR);
    slab(heW, heE, officeDoor.z1, S.north, floorY, A8_H.hall, KIT_BOX_COLOR);
    slab(heW, heE, officeDoor.z0, officeDoor.z1, floorY + DOOR_H, A8_H.hall, KIT_BOX_COLOR);
    // east wall
    slab(OF.x1 - T / 2, ofE, 71.25, S.north, floorY, A8_H.hall, KIT_BOX_COLOR);
    // south wall with the stair-top door
    slab(heE, topDoor.x0, 71.25, 71.55, floorY, A8_H.hall, KIT_BOX_COLOR);
    slab(topDoor.x1, OF.x1 - T / 2, 71.25, 71.55, floorY, A8_H.hall, KIT_BOX_COLOR);
    slab(topDoor.x0, topDoor.x1, 71.25, 71.55, floorY + DOOR_H, A8_H.hall, KIT_BOX_COLOR);
    // the roof (over the office and the stairwell)
    slab(heE, ofE, 68.15, S.north, A8_H.office, A8_H.office + 0.1, KIT_BOX_COLOR, { overhead: true });
    b.surface('carpet', heE, OF.x1 - T / 2, 71.55, S.north, floorY);
    p.doors[A8_OFFICE_DOOR] = b.door(HE, floorY, officeDoor.z0, officeDoor.z1 - officeDoor.z0, 0, { height: DOOR_H }).id;
    p.doors[A8_STAIR_TOP] = b.door(topDoor.x0, floorY, 71.4, topDoor.x1 - topDoor.x0, Math.PI / 2, { height: DOOR_H }).id;
    // the console desk (0.75 m) under the console on the east wall
    slab(143.3, OF.x1 - T / 2, 73.7, 75.7, floorY, floorY + 0.75, COUNTER);
  });

  // ---- A8-6: the office stair: an enclosed stairwell along the lobby's north side ----
  const os = A8_OFFICE_STAIR;
  const stO = stairSteps(floorY);
  const foot = { x0: 134.4, x1: 135.6 };
  tally(b, p.register, 'A8-6', "Office stair: the stairwell x 134.15-144.15, z 68.15-71.25 (7.4 m, roof above) with the flight x 134.5-142.2, z 70-71.2 (27 risers rising east, noLedge fillers under it), the closed block south of it (x 135.2-142.2, z 68.15-70, noLedge: T1 is out of reach from the stair), the head landing x 142.2-144.15 (4.4 block), the lobby wall's foot door A8-stair-foot (x 134.4-135.6, 1.2 x 2.1, locked: an egress gate, push bar on the stair side)", () => {
    // the lobby's north wall (z 68, 7.4 m) with the foot door's gap and lintel
    slab(134.15, foot.x0, 67.85, 68.15, 0, A8_H.stairwell, KIT_BOX_COLOR);
    slab(foot.x1, 146.15, 67.85, 68.15, 0, A8_H.stairwell, KIT_BOX_COLOR);
    slab(foot.x0, foot.x1, 67.85, 68.15, DOOR_H, A8_H.stairwell, KIT_BOX_COLOR);
    p.doors[A8_STAIR_FOOT] = b.door(foot.x0, 0, 68.0, foot.x1 - foot.x0, Math.PI / 2, { height: DOOR_H, locked: true }).id;
    // the block south of the flight (T1's wall must not be reachable from the stairs) and the head landing
    slab(A8_STAIR_BLOCK_X0, 142.2, 68.15, os.z0, 0, A8_H.stairwell, STONE);
    slab(142.2, 144.15, 68.15, 71.25, 0, floorY, STONE);
    b.stairs(os.foot + stO.len / 2, (os.z0 + os.z1) / 2, os.z1 - os.z0, stO.len, floorY, stO.steps, PLATE, Math.PI / 2, 0);
    fillFlight('x', 1, os.foot, stO.len, floorY, os.z0, os.z1);
  });

  // ---- A8-7: the vault lobby: ceiling, east wall with the vault door's opening, floor plate ----
  const vd = { z0: 61.3, z1: 62.7, h: 2.2 };
  tally(b, p.register, 'A8-7', 'Vault lobby x 134.15-145.85, z 56.15-67.85: a 5.5 m ceiling slab (overhead, noLedge), the east wall x 146 (5.5 m) with the vault door A8-vault (x 146, z 61.3-62.7, 1.4 x 2.2, locked, flag gate on a8-sync); the steel plate floor (metal, loud)', () => {
    slab(134.15, 145.85, 56.15, 67.85, A8_H.lobby, A8_H.lobby + 0.1, KIT_BOX_COLOR, { overhead: true });
    slab(145.85, 146.15, 56.15, vd.z0, 0, A8_H.lobby, KIT_BOX_COLOR);
    slab(145.85, 146.15, vd.z1, 67.85, 0, A8_H.lobby, KIT_BOX_COLOR);
    slab(145.85, 146.15, vd.z0, vd.z1, vd.h, A8_H.lobby, KIT_BOX_COLOR);
    b.surface('metal', 134.15, 145.85, 56.15, 67.85, 0);
    p.doors[A8_VAULT] = b.door(146, 0, vd.z0, vd.z1 - vd.z0, 0, { height: vd.h, locked: true }).id;
  });

  // ---- A8-8: the public grille (a mains gate) and its request-to-exit button ----
  tally(b, p.register, 'A8-8', "Public grille: the gate A8-grille on x 134, z 61.1-62.9 (1.8 m wide, 3.0 m, built locked, swinging into the lobby): a mains gate on the night circuit, opaque while shut; the request-to-exit button a8-rte on the lobby's south wall (a course device, no piece)", () => {
    p.doors[A8_GRILLE] = b.door(HE, 0, grille.z0, grille.z1 - grille.z0, 0, { height: grille.h, locked: true }).id;
  });

  // ---- A8-9: the inner beam curtain (`throwGateway`), its beams on `a8-sync`, its power panel ----
  const g = throwGateway(A8_GATEWAY);
  tally(b, p.register, 'A8-9', "Inner beam curtain x 140: piers z 56-56.5 and 67.5-68 (5.5 m, noLedge), the header over z 56.5-67.5 at 4.8-5.5 (overhead), three IR beams laser-a8 at 0.35 / 0.9 / 1.45 switched off by a8-sync (A8-D4: the helper's release removed), the striped throw mark 1.2 m behind the line", () => {
    applyGreybox(b, { ...g, stairs: [], ledges: [], doors: [] });
  });
  for (const l of g.lasers) p.lasers.push({ ...l, label: 'Lobby beams', offFlag: A8_SYNC_FLAG });
  p.laserPanels.push({ ...A8_PANEL });
  p.register.push({ id: 'A8-10', element: "Beam power panel panel-a8 high on the lobby's east wall north of the vault door (145.75, 4.2, 66.0), facing west: jammable, shown in electro (a laser panel, no builder piece)" });

  // ---- A8-11: the time locks (`syncStation`, scan): T1 on the lobby's north wall, T2 on its east wall ----
  const station = syncStation({ id: 'a8', kind: 'scan', a: A8_T1_AT, b: A8_T2_AT, y: A8_PANEL_Y });
  tally(b, p.register, 'A8-11', 'Time locks T1 (north wall, (137, 67.75), faces south) and T2 (east wall beside the vault door, (145.75, 59.6), faces west) 12 m apart (syncStation, scan): housings (visual), scanner pair sc-a8 on a8-sync', () => {
    applyGreybox(b, station);
  });
  const dev = (d: { x: number; z: number; yaw: number }, label: string) => ({ x: d.x, y: 0, z: d.z, yaw: d.yaw, label });
  p.devices[A8_T1] = dev(station.devices['sw-a8-a']!, 'Time lock one (hack with your partner)');
  p.devices[A8_T2] = dev(station.devices['sw-a8-b']!, 'Time lock two (hack with your partner)');
  p.scanners.push({ id: A8_SCANNER, a: A8_T1, b: A8_T2, flag: A8_SYNC_FLAG });

  // ---- A8-12: the closed areas: back offices, the plant, the vault's roof and flanks (solid, no doors) ----
  tally(b, p.register, 'A8-12', "Closed areas (solid, noLedge, no doors): the back offices x 134.15-149.75, z 50.25-56.15 (the lobby's south wall); the vault's flanks z 56.15-58.15 and z 65.85-77.75 (x 146.15-149.75) and the plant x 144.15-146.15, z 68.15-77.75; the vault x 146.15-149.75, z 58.15-65.85 under a solid 3.0 m roof (open at its back to the cash dock)", () => {
    slab(134.15, S.east, S.south, 56.15, 0, A8_H.hall, CONCRETE);
    slab(146.15, S.east, 56.15, 58.15, 0, A8_H.hall, CONCRETE);
    slab(146.15, S.east, 65.85, S.north, 0, A8_H.hall, CONCRETE);
    slab(144.15, 146.15, 68.15, S.north, 0, A8_H.hall, CONCRETE);
    slab(146.15, S.east, 58.15, 65.85, A8_H.vault, A8_H.hall, CONCRETE);
    b.surface('metal', 146.15, S.east, 58.15, 65.85, 0);
  });

  // ---- the console, the board, the gates ----
  p.register.push({ id: 'A8-13', element: "Course devices (no pieces): the lighting board a8-board under the gallery at (127, 0.9, 77.6) (the night circuit's isolator, 25 s, re-arm 5 s), the console a8-console on the office's east wall (143.7, 5.6, 74.7) with its pickup gate, the stair's push bar a8-stair-bar at the flight's foot (135.8, 1.1, 71.2) (an egress gate), the vault's flag gate; the grille's request-to-exit a8-rte (lobby south wall) is off (A8_RTE_GATE_ON, S8 request 1)" });
  const night = circuitOf(81)!.timed!;
  p.devices[A8_BOARD] = { x: 127.0, y: 0.9, z: 77.6, yaw: Math.PI, label: 'Isolate the hall lights' };
  p.devices[A8_CONSOLE] = { x: 143.7, y: 5.6, z: 74.7, yaw: -Math.PI / 2, label: 'Loop the cameras' };
  p.devices[A8_STAIR_BAR] = { x: 135.8, y: 1.1, z: 71.2, yaw: Math.PI, label: 'Push the bar' };
  // the request-to-exit (SPEC: the player inside opens the grille for good): a second gate on a door locks it until BOTH are open (`CourseState.locked`), so
  // with the mains gate the board could never open the grille. Off until that rule is any-open (S8 request 1); then the device and the gate go in.
  if (A8_RTE_GATE_ON) {
    p.devices[A8_RTE] = { ...A8_RTE_AT, label: 'Request to exit' };
    p.bay.gates.push({ kind: 'egress', id: A8_RTE_GATE, switchId: A8_RTE, doorIds: [A8_GRILLE] } satisfies EgressGate);
  }
  p.consoles.push({ id: A8_CONSOLE, guard: A8_OFFICER, flag: A8_LOOP_FLAG, seconds: A8_LOOP.seconds, rearm: A8_LOOP.rearm });
  p.bay.gates.push(
    { kind: 'isolator', id: A8_NIGHT_GATE, switchIds: [A8_BOARD], group: A8_NIGHT_GROUP, seconds: night.seconds, rearm: night.rearm } satisfies IsolatorGate,
    { kind: 'mains', id: A8_GRILLE_GATE, group: A8_NIGHT_GROUP, doorId: A8_GRILLE } satisfies MainsGate,
    { kind: 'egress', id: A8_STAIR_GATE, switchId: A8_STAIR_BAR, doorIds: [A8_STAIR_FOOT] } satisfies EgressGate,
    { kind: 'flag', id: A8_VAULT_GATE, flag: A8_SYNC_FLAG, doorId: A8_VAULT } satisfies FlagGate,
    { kind: 'pickup', id: A8_CONSOLE_GATE, switchId: A8_CONSOLE, flag: A8_LOOP_FLAG, perPlayer: false } satisfies PickupGate,
  );

  // ---- the three cameras (all on the console's flag; C2 hangs over the gallery level) ----
  p.register.push({ id: 'A8-14', element: "Cameras C1-C3 on the console flag a8-loop (layout data): C1 on the hall's south wall over the public floor, C2 on its east wall over the gallery level (y 3.0 over 4.4), C3 in the lobby's south-west corner" });
  const cam = (id: string, at: [number, number], y: number, facing: number, aim: number, range: number, reason: string, level = 'ground'): CameraDevice => ({ id, kind: 'camera', level, at, y, facing, aim, range, room: 'A8', reason, offFlag: A8_LOOP_FLAG });
  p.cameras.push(
    cam(A8_CAMERAS[0], [120.0, 50.4], 3.2, 0, 8, 14, 'Bank CCTV over the public floor south of the counters'),
    cam(A8_CAMERAS[1], [133.75, 73.0], 3.0, 323, 6, 10, "Bank CCTV on the hall's east wall: the gallery's last 8 m and the office door", A8_GALLERY_LEVEL),
    cam(A8_CAMERAS[2], [134.45, 56.45], 3.2, 45, 8, 14, 'Vault lobby CCTV over both time locks, the throw spot and the beam curtain'),
  );

  // ---- A8-15: the lights (LIGHTING-PLAN 3, A8; the circuits are `MARLOW_CIRCUITS` 81-84) ----
  tally(b, p.register, 'A8-15', 'Lamps on groups 81-84: hall night circuit 81 (three chandeliers y 7.5, three counter lamps, the desk lamp), gallery wall lights 82 (three on the north wall over the east bays), office panels 83 (two), vault lobby panels 84 (two) and a status lamp over each time lock (A8-D12)', () => {
    const lamp = (x: number, y: number, z: number, group: number, radius: number, intensity: number, color: [number, number, number], fx: [number, number, number]): void => {
      b.light({ x, y, z, radius, intensity, color, group, electric: true, destructible: true, fixture: { sx: fx[0], sy: fx[1], sz: fx[2], oy: fx[1] / 2 } });
    };
    for (const [x, z] of [[130.0, 62.0], [124.0, 58.0], [128.0, 69.5]] as const) lamp(x, 7.5, z, 81, LAMP.chandelier.radius, LAMP.chandelier.intensity, WARM, [0.8, 0.4, 0.8]);
    for (const [x, z] of [[121.0, 65.9], [124.8, 65.9], [125.6, 61.5]] as const) lamp(x, 1.4, z, 81, LAMP.counter.radius, LAMP.counter.intensity, WARM, [0.2, 0.2, 0.2]);
    lamp(128.5, 1.0, 70.4, 81, LAMP.desk.radius, LAMP.desk.intensity, WARM, [0.2, 0.2, 0.2]);
    for (const x of [126.0, 129.5, 133.0]) lamp(x, 6.6, 77.6, 82, LAMP.gallery.radius, LAMP.gallery.intensity, BRASS, [0.2, 0.3, 0.15]);
    for (const x of [137.5, 141.5]) lamp(x, 7.2, 74.7, 83, LAMP.office.radius, LAMP.office.intensity, WHITE, [0.6, 0.05, 0.6]);
    for (const x of [137.0, 143.0]) lamp(x, 5.3, 62.0, 84, LAMP.lobby.radius, LAMP.lobby.intensity, WHITE, [0.6, 0.05, 0.6]);
    // a status lamp over each time lock (A8-D12): the panels' own pools, so the locks read lit without the ceiling panels spilling out of the open grille
    lamp(A8_T1_AT.x, 2.2, A8_T1_AT.z - 0.4, 84, LAMP.lock.radius, LAMP.lock.intensity, WHITE, [0.3, 0.05, 0.2]);
    lamp(A8_T2_AT.x - 0.4, 2.2, A8_T2_AT.z + 0.4, 84, LAMP.lock.radius, LAMP.lock.intensity, WHITE, [0.2, 0.05, 0.3]);
  });
  for (const [k, gr] of Object.entries(marlowCourseGroups())) if (k.startsWith('a8-')) p.groups[k] = gr;
  // wall switches: the gallery's on the stair head's east balustrade end, the office's inside its door
  p.switches.push({ id: 'a8-sw-gallery', group: 82, pos: { x: 131.65, y: 5.6, z: 75.1 }, yaw: -Math.PI / 2 });
  p.switches.push({ id: 'a8-sw-office', group: 83, pos: { x: 134.25, y: 5.6, z: 75.6 }, yaw: Math.PI / 2 });
  // the set at its standby fill by level (SPEC 7; the doc's four zones: the set, the gallery, the office, the lobby)
  const sb = MARLOW_LEVEL.standby;
  p.ambientZones.push(
    { id: 'A8', box: [106, 50, 150, 78], ambient: sb, minY: -1, maxY: 8.9 },
    { id: 'a8-gallery', box: [106, 56, 134, 78], ambient: sb, minY: 3.9, maxY: 8.9 },
    { id: 'a8-office', box: [134, 71, 144, 78], ambient: sb, minY: 3.9, maxY: 7.3 },
    { id: 'a8-lobby', box: [134, 56, 146, 68], ambient: sb, minY: -1, maxY: 5.4 },
  );
  p.medkitWalls.push({ pos: { x: 138.5, y: floorY, z: 77.35 }, yaw: Math.PI });

  // ---- the guards, the steps, the claim, the pass zones, the radio ----
  p.squads[A8_N1] = { kind: 'grunt', x: A8_N1_POST.x, z: A8_N1_POST.z, yaw: Math.PI, route: A8_N1_ROUTE, waits: A8_N1_WAITS, faces: A8_N1_FACES };
  p.squads[A8_N2] = { kind: 'grunt', x: A8_N2_ROUTE[0]![0], z: A8_N2_ROUTE[0]![1], yaw: Math.PI / 2, route: A8_N2_ROUTE, waits: A8_N2_WAITS, faces: A8_N2_FACES };
  p.squads[A8_OFFICER] = { kind: 'grunt', x: A8_OFFICER_POST.x, z: A8_OFFICER_POST.z, yaw: Math.PI / 2, y: A8_OFFICER_POST.y, info: A8_OFFICER_INFO };
  p.bay.squad.push(A8_N1, A8_N2, A8_OFFICER);
  // the first player onto the public gallery takes A; the other is B. Until then the lead (P2 in this even set) reads A
  p.bay.roles = [{ role: 'a', zone: { box: A8_GAL_ZONE, y0: 3.9 } }];
  p.passZones.push(
    { id: 'a8-p-gal1', box: A8_GAL_ZONE, flag: A8_GAL_FLAG, floorY: A8_H.gallery, any: true },
    { id: 'a8-p-lobby', box: A8_LOBBY_ZONE, flag: A8_LOBBY_FLAG, floorY: 0 },
    { id: 'a8-p-inner1', box: A8_INNER_ZONE, flag: A8_INNER_FLAG, floorY: 0, any: true },
  );
  p.externalFlags.push(A8_GAL_FLAG, A8_LOBBY_FLAG, A8_INNER_FLAG, A8_SYNC_FLAG);
  p.objectives.push(
    {
      id: 'a8-split',
      bay: 'A8',
      text: 'Split up: one onto the gallery, one stays on the floor.',
      a: 'Take the boost to the gallery at the dark west end.',
      b: 'Boost your partner up, then keep to the counters.',
      done: { flag: A8_GAL_FLAG },
    },
    {
      id: 'a8-office',
      bay: 'A8',
      text: 'Get to the security office unseen and loop the cameras.',
      a: "Reach the office on your partner's jam, then take the officer.",
      b: 'Jam the gallery camera from the floor for your partner.',
      done: { flag: A8_LOOP_FLAG },
    },
    {
      id: 'a8-grille',
      bay: 'A8',
      text: 'Kill the hall lights to open the grille. Sixty seconds on the loop.',
      a: 'Come down the office stair into the vault lobby.',
      b: 'Isolate the hall lights at the board, then slip through the grille.',
      done: { flag: A8_LOBBY_FLAG },
      timer: A8_CONSOLE_GATE,
    },
    {
      id: 'a8-beams',
      bay: 'A8',
      text: 'Over the beam curtain to the second time lock.',
      a: 'Throw your partner over the beams.',
      b: 'Land by the vault door and take time lock two.',
      done: { flag: A8_INNER_FLAG },
      timer: A8_CONSOLE_GATE,
    },
    {
      id: 'a8-sync',
      bay: 'A8',
      text: 'Both time locks together, on the ready lamps.',
      a: "Hack time lock one on your partner's count.",
      b: "Hack time lock two on your partner's count.",
      done: { flag: A8_SYNC_FLAG },
      timer: A8_CONSOLE_GATE,
    },
    { id: 'a8-out', bay: 'A8', text: 'The vault is open. Both of you out to the cash dock.' },
  );
  p.bay.radio.push(
    { at: 'enter', text: "Last one. Everything you've done tonight, in one room. Take your time." },
    { at: `warn:${A8_NIGHT_GATE}`, text: 'Lights back in five.' },
    { at: `warn:${A8_NIGHT_GATE}`, text: "Grille's locking again." },
    { at: `warn:${A8_CONSOLE_GATE}`, text: 'Cameras back in five.' },
    { at: 'a8-sync', text: 'Vault open. Well done, both of you.' },
  );
  // bodies are dragged to these: the vestibule, the west bays behind the main counter, the board's west side
  p.hideSpots.push({ x: 107.6, y: 0, z: 64.5 }, { x: 116.0, y: 0, z: 70.0 }, { x: A8_BOARD_WEST.x, y: 0, z: A8_BOARD_WEST.z });

  // ---- spaces, nav, debug points, light and shot spots ----
  p.camSpaces.push(
    { box: [106, 50, 134, 78], size: 'open' },
    { box: [134, 56, 146, 68], size: 'open' },
    { box: [146, 58, 150, 66], size: 'tight' },
    { box: [134, 68, 144, 71.4], size: 'tight' },
    { box: [134, 71.4, 144, 78], y: [3.9, 8], size: 'tight' },
  );
  p.navSeeds.push(
    { x: 107.6, y: 0, z: 62 },
    { x: 120, y: 0, z: 62 },
    { x: 120, y: A8_H.gallery, z: 76.4 },
    { x: 139, y: A8_H.gallery, z: 74.7 },
    { x: 134.8, y: 0, z: 69.3 },
    { x: 137, y: 0, z: 62 },
    { x: 143, y: 0, z: 62 },
    { x: 148, y: 0, z: 62 },
  );
  p.debugPoints.push(
    { id: 'A8-entry', label: 'Set 8 entry (the vestibule vantage)', pos: { x: 107.4, y: 0, z: 64.5 }, yaw: Math.PI / 2 },
    { id: 'A8-mid', label: 'Set 8 middle (the front, by the desk)', pos: { x: 124, y: 0, z: 69 }, yaw: Math.PI / 2 },
    { id: 'A8-legup', label: 'Set 8 leg-up mark', pos: { x: A8_LEGUP.x, y: 0, z: A8_LEGUP.z }, yaw: -Math.PI / 2 },
    { id: 'A8-jam', label: 'Set 8 cross-level jam spot', pos: { x: A8_JAM.x, y: 0, z: A8_JAM.z }, yaw: Math.PI / 2 },
    { id: 'A8-pier', label: 'Set 8 gallery pier (under C2)', pos: { x: A8_PIER.x, y: A8_H.gallery, z: A8_PIER.z }, yaw: Math.PI / 2 },
    { id: 'A8-board', label: 'Set 8 lighting board (west side)', pos: { x: A8_BOARD_WEST.x, y: 0, z: A8_BOARD_WEST.z }, yaw: 0 },
    { id: 'A8-grille', label: 'Set 8 grille approach', pos: { x: A8_GRILLE_SPOT.x, y: 0, z: A8_GRILLE_SPOT.z }, yaw: Math.PI / 2 },
    { id: 'A8-console', label: 'Set 8 console (behind the officer)', pos: { x: 142.0, y: A8_H.gallery, z: 74.7 }, yaw: Math.PI / 2 },
    { id: 'A8-throw', label: 'Set 8 throw mark', pos: { x: A8_THROW.x, y: 0, z: A8_THROW.z }, yaw: Math.PI / 2 },
    { id: 'A8-t1', label: 'Set 8 time lock one', pos: { x: A8_T1_SPOT[0], y: 0, z: A8_T1_SPOT[1] }, yaw: 0 },
    { id: 'A8-t2', label: 'Set 8 time lock two', pos: { x: A8_T2_SPOT[0], y: 0, z: A8_T2_SPOT[1] }, yaw: -Math.PI / 2 },
    { id: 'A8-vault', label: 'Set 8 vault', pos: { x: 148, y: 0, z: 62 }, yaw: Math.PI / 2 },
  );
  p.lightSpots.push(
    { name: 'A8 front', kind: 'body', x: 128, y: 0, z: 66.5, band: 'pool' },
    { name: 'A8 front cut', kind: 'body', x: 128, y: 0, z: 66.5, band: 'cut', off: [81] },
    { name: 'A8 grille approach', kind: 'body', x: A8_GRILLE_SPOT.x, y: 0, z: A8_GRILLE_SPOT.z, band: 'pool' },
    { name: 'A8 grille approach cut', kind: 'body', x: A8_GRILLE_SPOT.x, y: 0, z: A8_GRILLE_SPOT.z, band: 'cut', off: [81] },
    { name: 'A8 board', kind: 'body', x: A8_BOARD_WEST.x, y: 0, z: A8_BOARD_WEST.z, band: 'any' },
    { name: 'A8 board cut', kind: 'body', x: A8_BOARD_WEST.x, y: 0, z: A8_BOARD_WEST.z, band: 'cut', off: [81] },
    { name: 'A8 jam spot', kind: 'body', x: A8_JAM.x, y: 0, z: A8_JAM.z, band: 'pocket' },
    { name: 'A8 leg-up mark', kind: 'body', x: A8_LEGUP.x, y: 0, z: A8_LEGUP.z, band: 'pocket' },
    { name: 'A8 vestibule', kind: 'body', x: 107.6, y: 0, z: 64.5, band: 'pocket' },
    { name: 'A8 gallery east', kind: 'body', x: 130, y: A8_H.gallery, z: 76.4, band: 'read' },
    { name: 'A8 gallery east cut', kind: 'body', x: 130, y: A8_H.gallery, z: 76.4, band: 'cut', off: [82] },
    { name: 'A8 gallery west', kind: 'body', x: 112, y: A8_H.gallery, z: 76.4, band: 'pocket' },
    { name: 'A8 office', kind: 'body', x: 139, y: A8_H.gallery, z: 74.7, band: 'read' },
    { name: 'A8 office cut', kind: 'body', x: 139, y: A8_H.gallery, z: 74.7, band: 'cut', off: [83] },
    { name: 'A8 T1', kind: 'body', x: A8_T1_SPOT[0], y: 0, z: A8_T1_SPOT[1], band: 'read' },
    { name: 'A8 T2', kind: 'body', x: A8_T2_SPOT[0], y: 0, z: A8_T2_SPOT[1], band: 'read' },
    { name: 'A8 hall floor', kind: 'surf', x: 124, y: 0.05, z: 69, band: 'any' },
    { name: 'A8 hall standby', kind: 'body', x: 124, y: 0, z: 69, band: 'standby' },
  );
  p.shotVantages.push(
    { name: 'a8-vestibule', feet: [107.4, 0, 64.5], cam: [106.8, 1.7, 64.0], target: [126, 1.4, 66] },
    { name: 'a8-pier', feet: [A8_PIER.x, A8_H.gallery, A8_PIER.z], cam: [123.6, 6.0, 76.2], target: [134, 6.0, 76.6] },
    { name: 'a8-outer', feet: [137.0, 0, 64], cam: [135.0, 1.7, 63.5], target: [146, 1.3, 62] },
  );
  return Object.assign(p, { levels: { ...A8_LEVELS } });
}
