// (campus-greybox S3) The v2 lab block's L1 (sub-lane r2, slices R2a / R2b; brief `docs/campus-greybox/briefs/S3.md`
// section 4 "R2"). Sources: D = `S3-detail.md`, P45 = `S3-plan-4.5.svg` (sector-redesign-signoff 7c021f01); S3 = the
// as-built `campusS3.ts` (6c3f4a87). The cores (their walls, landings, doors nStairL1 / eStairL1 / wStairL1 / staff) are
// R3's (`s3Stairs.ts`), the shell and G R1's (`s3Shell.ts`), the lamps, lasers and panels R4's (`s3Lights.ts`).
import type { Vector3 } from '../../../core/babylon';
import type { LevelBuilder } from '../../levelBuilder';
import type { MapLayout } from '../../mapDef';
import type { RoomDef } from '../../rooms';
import {
  DESK,
  DOOR_H,
  DOOR_W,
  PANEL_WHITE,
  PI,
  S3_BOX,
  S3_CEIL_TOP,
  S3_DOORS,
  S3_DOOR_SWING,
  S3_L1,
  S3_ROOF,
  S3_VIEW_SPANDREL_TOP,
  STEEL,
  T,
  bx,
  doorAt,
  doorHole,
  rail,
  slab,
  wall,
  type S3Box,
  type S3DoorId,
} from './s3Kit';

/** The L1 rooms (HUD tags; no squads; minY 4.5). */
export const S3_ROOMS_L1: RoomDef[] = [];
/** The L1 nav seeds (and the walkway, gallery and chamber roof). */
export const S3_NAV_SEEDS_L1: Vector3[] = [];
/** The L1 hide spots. */
export const S3_HIDESPOTS_L1: NonNullable<MapLayout['hideSpots']> = [];

/** A door's hinge along its wall: the centre less half a single door (`doorAt`, brief 3.2). */
const hingeX = (id: S3DoorId): number => S3_DOORS[id][0] - DOOR_W / 2;
const hingeZ = (id: S3DoorId): number => S3_DOORS[id][1] - DOOR_W / 2;
const swingOf = (id: S3DoorId): 1 | -1 => (S3_DOOR_SWING[id] < 0 ? -1 : 1);

/** The L1 slab's areas (R2a step 1): the landing, the corridor / east lobby / north rooms band, the part over the plant. */
export const S3_L1_SLABS: readonly S3Box[] = [
  [10, -30, 14, -11],
  [10, -11, 64, 0],
  [52, -18, 64, -11],
];

/** The sec room's escape hatch (1.0 x 1.0, the SS 3 ladder shaft) and its ladder foot, centred at (54, -17) (D:72). */
export const S3_SEC_HATCH: S3Box = [53.5, -17.5, 54.5, -16.5];

/**
 * The L1 slab's only holes (LD 16.5.2; R2a step 1): the north and east cores' wells inside their walls (the core box less
 * half a wall; R3 lays their landings; the west core lies east of the landing slab, so it cuts nothing), the hoist hatch to
 * the x 21 wall face (P9) and the sec room's ladder hatch.
 */
export const S3_L1_HOLES: readonly S3Box[] = [
  [S3_BOX.nCore[0] + T / 2, S3_BOX.nCore[1] + T / 2, S3_BOX.nCore[2] - T / 2, S3_BOX.nCore[3] - T / 2],
  [S3_BOX.eCore[0] + T / 2, S3_BOX.eCore[1] + T / 2, S3_BOX.eCore[2] - T / 2, S3_BOX.eCore[3] - T / 2],
  [S3_BOX.hoistHatch[0], S3_BOX.hoistHatch[1], S3_BOX.hoistHatch[2] - T / 2, S3_BOX.hoistHatch[3]],
  S3_SEC_HATCH,
];

/** The corridor's sample cases against the z -7 wall: centres x (D:64), 1.2 long, 0.8 deep, 1.0 high (derived), noLedge. */
export const S3_SAMPLE_CASES: readonly number[] = [18, 26, 34, 46];
const CASE_LEN = 1.2;
const CASE_DEEP = 0.8;
const CASE_H = 1.0;

/** The ship ladder's 6.0 platform inside the walkway door: the walkway deck carried west through the door (derived). */
export const S3_SHIP_PLATFORM: S3Box = [12.5, -29.85, 14, -28.35];

/**
 * The security room's counters (S3:458-459 re-placed round #12's two stops, derived): the monitor counter 0.6 in front of
 * his monitor stop (58, -15) along his facing +x, 2.0 long and 0.65 deep as built (top 0.75); the kettle counter 0.3 in
 * front of his kettle stop (62.8, -12.5) along +z, against the east wall, as built (x 62.4..63.85, 0.55 deep, top 0.9).
 */
export const S3_SEC_COUNTERS: readonly { box: S3Box; top: number }[] = [
  { box: [58.6, -16, 59.25, -14], top: 0.75 },
  { box: [62.4, -12.2, 63.85, -11.65], top: 0.9 },
];

/** A floor slab over `r` (top `top`, 0.2 thick) with rectangular holes: cut into strips between the holes' x edges. */
function slabCut(b: LevelBuilder, r: S3Box, top: number, holes: readonly S3Box[]): void {
  const [x0, z0, x1, z1] = r;
  const cuts = new Set<number>([x0, x1]);
  for (const h of holes) for (const x of [h[0], h[2]]) if (x > x0 && x < x1) cuts.add(x);
  const xs = [...cuts].sort((p, q) => p - q);
  for (let i = 0; i + 1 < xs.length; i++) {
    const p = xs[i]!;
    const q = xs[i + 1]!;
    const over = holes.filter((h) => h[0] <= p + 1e-6 && h[2] >= q - 1e-6 && h[3] > z0 && h[1] < z1).map((h) => [Math.max(z0, h[1]), Math.min(z1, h[3])] as const);
    over.sort((u, v) => u[0] - v[0]);
    let z = z0;
    for (const [u, v] of over) {
      if (u > z + 1e-6) slab(b, p, q, z, u, top);
      z = Math.max(z, v);
    }
    if (z1 > z + 1e-6) slab(b, p, q, z, z1, top);
  }
}

/** A suspended ceiling deck (top 7.5, 0.1 thick; P19), overhead and noLedge. */
function ceiling(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number): void {
  bx(b, x0, x1, S3_CEIL_TOP - 0.1, S3_CEIL_TOP, z0, z1, PANEL_WHITE, { overhead: true, noLedge: true });
}

/** The L1 slabs, rooms, glass, gallery, walkway, hoist hatch, void and ceilings. */
export function buildS3L1(b: LevelBuilder): void {
  const L1 = S3_L1;
  const R = S3_ROOF;
  const C = S3_CEIL_TOP;

  // ---- 1. the L1 slab (top 4.5, 0.2), complete but for the listed holes (LD 16.5.2); x 52..53, z -18..-11 is the sealed
  // chase between the hall's east wall and the sec room (P22)
  for (const r of S3_L1_SLABS) slabCut(b, r, L1, S3_L1_HOLES);

  // ---- 2. the landing (D:62): its east face x 14 is glass from the floor to the roof over the hall (P45:18-20), z -30..-21
  // and -14.5..-11 (the west core between is R3's), with a 1.1 rail inside and the walkway door at 6.0 in it; the fire
  // double door to the corridor; the suspended ceiling at 7.5 but over the 2 m crane bay (z -30..-28, open to 9.0); the
  // ship ladder (rise 1.5) in the crane bay to the 6.0 platform inside the walkway door
  const wz = hingeZ('walkway');
  const wy = S3_DOORS.walkway[2];
  const inner = -30 + T / 2;
  b.glass(14, inner, 14, wz, R - L1, L1);
  b.glass(14, wz, 14, wz + DOOR_W, wy - L1, L1);
  b.glass(14, wz, 14, wz + DOOR_W, R - wy - DOOR_H, wy + DOOR_H);
  b.glass(14, wz + DOOR_W, 14, S3_BOX.wCore[1], R - L1, L1);
  b.glass(14, S3_BOX.wCore[3], 14, -11, R - L1, L1);
  doorAt(b, false, 14, wz, wy, swingOf('walkway'));
  rail(b, 14 - T / 2 - 0.1, 14 - T / 2, inner, S3_BOX.wCore[1], L1);
  rail(b, 14 - T / 2 - 0.1, 14 - T / 2, S3_BOX.wCore[3], -11 - T / 2, L1);
  const [px0, pz0, px1, pz1] = S3_SHIP_PLATFORM;
  slab(b, px0, px1, pz0, pz1, wy, STEEL);
  // the ship ladder on the platform's west edge, 0.45 off it as the as-built walkway ladders (S3: `ladder(x, edge + 0.45)`)
  b.ladder(px0 - 0.45, (pz0 + pz1) / 2, L1, wy, PI / 2);
  ceiling(b, 10, 14, -28, -11);
  // the fire double door (1.8, x 11.1..12.9): two 0.9 leaves hinged at the jambs, both opening north into the corridor
  const [fx] = S3_DOORS.landingFire;
  wall(b, true, -11, 10, 14, L1, R, [[fx - 0.9, fx + 0.9, L1, L1 + DOOR_H]]);
  b.door(fx - 0.9, L1, -11, 0.9, PI / 2, { swing: -1 });
  b.door(fx + 0.9, L1, -11, 0.9, -PI / 2, { swing: 1 });

  // ---- 3. the viewing corridor and the east lobby (D:64-65): z -11 x 14..52 glass on the 1.1 spandrel (top 5.6, AS2) to
  // the roof over the hall, with the gallery door; x 52..64 the lobby's wall with the sec door; no wall at x 52 between
  // corridor and lobby (GR:661-666). z -7 x 10..64 to the ceiling: the room doors of 3.2, the write-up's glass front, the
  // rest solid; the north and east cores' south walls (x 30..33.5, 58..61.5) are R3's
  const gx = hingeX('gallery');
  wall(b, true, -11, 14, 52, L1, R, [[14, gx, S3_VIEW_SPANDREL_TOP, R], [gx, gx + DOOR_W, L1, L1 + DOOR_H], [gx + DOOR_W, 52, S3_VIEW_SPANDREL_TOP, R]]);
  b.glass(14, -11, gx, -11, R - S3_VIEW_SPANDREL_TOP, S3_VIEW_SPANDREL_TOP);
  b.glass(gx, -11, gx + DOOR_W, -11, R - L1 - DOOR_H, L1 + DOOR_H);
  b.glass(gx + DOOR_W, -11, 52, -11, R - S3_VIEW_SPANDREL_TOP, S3_VIEW_SPANDREL_TOP);
  doorAt(b, true, -11, gx, L1, swingOf('gallery'));
  wall(b, true, -11, 52, 64, L1, C, [doorHole(hingeX('sec'), L1)]);
  doorAt(b, true, -11, hingeX('sec'), L1, swingOf('sec'));
  const [hx0, , hx1] = S3_BOX.hoist;
  const [wrx0, , wrx1] = S3_BOX.writeup;
  wall(b, true, -7, hx0, hx1, L1, C, [doorHole(hingeX('hoist'), L1)]);
  doorAt(b, true, -7, hingeX('hoist'), L1, swingOf('hoist'));
  const wd = hingeX('writeup');
  b.glass(wrx0, -7, wd, -7, C - L1, L1);
  b.glass(wd, -7, wd + DOOR_W, -7, C - L1 - DOOR_H, L1 + DOOR_H);
  b.glass(wd + DOOR_W, -7, wrx1, -7, C - L1, L1);
  doorAt(b, true, -7, wd, L1, swingOf('writeup'));
  wall(b, true, -7, S3_BOX.nCore[2], S3_BOX.eCore[0], L1, C, [doorHole(hingeX('gown'), L1), doorHole(hingeX('storeHatch'), L1)]);
  doorAt(b, true, -7, hingeX('gown'), L1, swingOf('gown'));
  doorAt(b, true, -7, hingeX('storeHatch'), L1, swingOf('storeHatch'));
  wall(b, true, -7, S3_BOX.eCore[2], 64, L1, C, []);
  // the sample cases (cover) against the z -7 wall's corridor face
  for (const x of S3_SAMPLE_CASES) bx(b, x - CASE_LEN / 2, x + CASE_LEN / 2, L1, L1 + CASE_H, -7 - T / 2 - CASE_DEEP, -7 - T / 2, STEEL, { noLedge: true });

  // ---- 4. the north rooms (D:66-70): partitions 4.5..7.5 at x 21, 37.5 (passThrough), 47 (airlock); at x 30, 33.5 and 58
  // the cores' walls are R3's, so only the strips from their north walls (z -0.5) to the shell close the slots behind them;
  // the store's shelving partition at x 53 (2.4, the aisle gap z -4..-2.8), the board shelf against x 58, the write-up desk
  wall(b, false, 21, -7, 0, L1, C, []);
  wall(b, false, 37.5, -7, 0, L1, C, [doorHole(hingeZ('passThrough'), L1)]);
  doorAt(b, false, 37.5, hingeZ('passThrough'), L1, swingOf('passThrough'));
  wall(b, false, 47, -7, 0, L1, C, [doorHole(hingeZ('airlock'), L1)]);
  doorAt(b, false, 47, hingeZ('airlock'), L1, swingOf('airlock'));
  for (const [x, z0] of [[S3_BOX.nCore[0], S3_BOX.nCore[3]], [S3_BOX.nCore[2], S3_BOX.nCore[3]], [S3_BOX.eCore[0], S3_BOX.eCore[3]]] as const) wall(b, false, x, z0, 0, L1, C, []);
  bx(b, 53 - T / 2, 53 + T / 2, L1, L1 + 2.4, -7 + T / 2, -4, STEEL, { noLedge: true });
  bx(b, 53 - T / 2, 53 + T / 2, L1, L1 + 2.4, -2.8, -T / 2, STEEL, { noLedge: true });
  bx(b, 57.35 - 0.15, 58 - 0.15, L1, L1 + 1.8, -5.0, -2.6, STEEL, { noLedge: true });
  bx(b, 24.2, 25.8, L1, L1 + 0.75, -5.45, -4.75, DESK);

  // ---- 5. the security room over the plant (D:72): its west wall x 53 and south wall z -18 to the roof (the sealed chase
  // x 52..53 closed at both ends; the chiller bay is open to 9.0 south of it); the counters; the escape hatch with its
  // cover (open, standing on the hatch's south edge) and rails on its west and east edges, the ladder to the plant floor
  const [, sz0, , sz1] = S3_BOX.sec;
  wall(b, false, 53, sz0, sz1, L1, R, []);
  wall(b, true, sz0, 52, 64, L1, R, []);
  for (const { box, top } of S3_SEC_COUNTERS) bx(b, box[0], box[2], L1, L1 + top, box[1], box[3], DESK);
  const [hhx0, hhz0, hhx1, hhz1] = S3_SEC_HATCH;
  bx(b, hhx0, hhx1, L1, L1 + (hhx1 - hhx0), hhz0 - 0.05, hhz0, STEEL, { noLedge: true });
  rail(b, hhx0 - 0.1, hhx0, hhz0, hhz1, L1);
  rail(b, hhx1, hhx1 + 0.1, hhz0, hhz1, L1);
  b.ladder((hhx0 + hhx1) / 2, (hhz0 + hhz1) / 2, 0, L1, 0);
}
