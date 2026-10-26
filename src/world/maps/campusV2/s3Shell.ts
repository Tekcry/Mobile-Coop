// (campus-greybox S3 R1) The v2 lab block's shell and ground floor (sub-lane r1; brief `docs/campus-greybox/briefs/S3.md`
// section 4 "R1"). Sources: D = `S3-detail.md`, P0 = `S3-plan-0.svg` (sector-redesign-signoff 7c021f01); S3 = the as-built
// `campusS3.ts` (6c3f4a87). The cores (walls, doors, flights) are R3's (`s3Stairs.ts`), L1 is R2's (`s3L1.ts`), the lamps
// and switches R4's (`s3Lights.ts`).
import { Vector3 } from '../../../core/babylon';
import type { LevelBuilder } from '../../levelBuilder';
import type { MapLayout } from '../../mapDef';
import type { RoomDef } from '../../rooms';
import {
  BENCH,
  BOTTLE,
  DESK,
  DOOR_W,
  L1_UNDER,
  PANEL_WHITE,
  RACK,
  ROOF,
  ROOF_TOP,
  S3_BOX,
  S3_DOORS,
  S3_DOOR_SWING,
  S3_L1,
  S3_OBS_HEAD,
  S3_OBS_SILL,
  S3_ROLLER_H,
  S3_ROOF,
  SLAB,
  STEEL,
  WALL_DARK,
  bx,
  doorAt,
  doorHole,
  slab,
  wall,
  type Hole,
  type S3DoorId,
} from './s3Kit';

/** The yard walls' height: the campus perimeter's 6 m (`campusOps.ts` `b.perimeter(..., 6, ...)`; D:55, G10). */
const YARD_WALL_H = 6;
/** The yard's east edge: the campus perimeter at x 70 (`CAMPUS_BOUNDS.maxX`; D:55 "x 64..70"). */
const YARD_X1 = 70;

/** A door's hinge along its wall: the centre less half a single door (`doorAt`, brief 3.2). */
const hingeX = (id: S3DoorId): number => S3_DOORS[id][0] - DOOR_W / 2;
const hingeZ = (id: S3DoorId): number => S3_DOORS[id][1] - DOOR_W / 2;
const swingOf = (id: S3DoorId): 1 | -1 => (S3_DOOR_SWING[id] < 0 ? -1 : 1);

/**
 * The G rooms (HUD tags; no squads; ids are the graph's, 7c021f01): the hall (x 14..52, full height) and its low aisle
 * under the landing (x 10..14, the same name; brief B6), the dock, the control room and the plant, each `maxY` 4.4 where
 * L1 is over it. The control room's box holds the north core's footprint (one rectangle per room; the core has no HUD room).
 */
export const S3_ROOMS_G: RoomDef[] = [
  { id: 's3-hall', name: 'Test Hall', minX: 14, maxX: 52, minZ: -30, maxZ: -11 },
  { id: 's3-hall-aisle', name: 'Test Hall', minX: 10, maxX: 14, minZ: -30, maxZ: -11, maxY: 4.4 },
  { id: 's3-dock', name: 'Goods-in Dock', minX: 10, maxX: 30, minZ: -11, maxZ: 0, maxY: 4.4 },
  { id: 's3-control', name: 'Test Control Room', minX: 30, maxX: 52, minZ: -11, maxZ: 0, maxY: 4.4 },
  { id: 's3-plant', name: 'Plant Room', minX: 52, maxX: 64, minZ: -30, maxZ: -7, maxY: 4.4 },
].map((r) => ({ ...r, squad: [] }));

/** The G nav seeds (derived: the AS12 middles, D:245-249): the hall, the low aisle, the dock, the control room, the plant. */
export const S3_NAV_SEEDS_G: Vector3[] = [
  new Vector3(31, 0, -25.5),
  new Vector3(12, 0, -25),
  new Vector3(16, 0, -8),
  new Vector3(42, 0, -5),
  new Vector3(56, 0, -20),
];

/**
 * Where a carried body can be hidden on G (derived; each on nav, >= 1.5 m from a door): the low aisle's SW corner (as built
 * S3:197), behind the gas cage's blast wall, the hall's south strip (as built S3:200), behind the EMC room, the plant's
 * north passage. Their light levels are left to R4's lamps and V6 (logged, not asserted dark: J17 Q2).
 */
export const S3_HIDESPOTS_G: NonNullable<MapLayout['hideSpots']> = [
  { pos: new Vector3(11, 0, -28.6) },
  { pos: new Vector3(14.2, 0, -1.0) },
  { pos: new Vector3(23.5, 0, -25.5) },
  { pos: new Vector3(49.3, 0, -23.5) },
  { pos: new Vector3(53.5, 0, -12) },
];

/** The shell, the G walls and rooms, the hall contents, the yard walls and the roller door (the trench waits on P14). */
export function buildS3Shell(b: LevelBuilder): void {
  const L1 = S3_L1;
  const R = S3_ROOF;

  // ---- 1. the shell as built (S3:323-329): walls to the roof top, the C3 dock door (z 0) and C2's far door (x 10, L1)
  wall(b, true, -30, 10, 64, 0, ROOF_TOP, []);
  wall(b, true, 0, 10, 64, 0, ROOF_TOP, [doorHole(hingeX('c3Near'), 0)]);
  wall(b, false, 10, -30, 0, 0, ROOF_TOP, [doorHole(hingeZ('c2Far'), L1)]);
  wall(b, false, 64, -30, 0, 0, ROOF_TOP, []);
  doorAt(b, true, 0, hingeX('c3Near'), 0, swingOf('c3Near'));
  doorAt(b, false, 10, hingeZ('c2Far'), L1, swingOf('c2Far'));
  slab(b, 10, 64, -30, 0, ROOF_TOP, ROOF);

  // ---- 2. the hall's north wall (z -11, x 10..52, G to the L1 underside): the goods roller door (an open 3.0 x 3.0 gap,
  // no leaf; the wall over it is the shutter box), the control-room door and the observation glass (D:47, P0:20-22, P0:60-61)
  const [rx] = S3_DOORS.roller;
  const roller: Hole = [rx - 1.5, rx + 1.5, 0, S3_ROLLER_H];
  const obs: Hole[] = [
    [34, 39, S3_OBS_SILL, S3_OBS_HEAD],
    [44, 50, S3_OBS_SILL, S3_OBS_HEAD],
  ];
  wall(b, true, -11, 10, 52, 0, L1_UNDER, [roller, doorHole(hingeX('ctlHall'), 0), ...obs]);
  doorAt(b, true, -11, hingeX('ctlHall'), 0, swingOf('ctlHall'));
  for (const [a, e, y0, y1] of obs) b.glass(a, -11, e, -11, y1 - y0, y0);

  // ---- 3. the dock (D:49): the gas cage in its NW corner (derived from the as-built cage S3:423-425 turned to its new
  // corner: a 2.4 blast wall on its east face, weldmesh on its south face, the bottles inside), the dock desk, the loading
  // pad under the hoist hatch (0.1, noLedge); its east wall x 30 between the hall wall and the north core (the core's west
  // wall is R3's)
  const [gx0, gz0, gx1, gz1] = S3_BOX.gasCage;
  bx(b, gx1 - 0.15, gx1 + 0.15, 0, 2.4, gz0, gz1 - 0.15, WALL_DARK, { noLedge: true });
  b.fence(gx0 + 0.15, gz0, gx1, gz0, 2.4);
  bx(b, gx0 + 0.3, gx1 - 1.0, 0, 1.6, gz0 + 0.4, gz1 - 0.5, BOTTLE);
  const [dx0, dz0, dx1, dz1] = S3_BOX.dockDesk;
  bx(b, dx0, dx1, 0, S3_BOX.dockDeskTop, dz0, dz1, DESK);
  const [px0, pz0, px1, pz1] = S3_BOX.loadingPad;
  bx(b, px0, px1, 0, S3_BOX.loadingPadTop, pz0, pz1, SLAB, { noLedge: true });
  wall(b, false, 30, -11, -7, 0, L1_UNDER, []);

  // ---- 4. the control room (D:51) and 5. the plant (D:52-53). x 52: the hall's east wall to the roof (z -30..-11, the
  // plant door), then to the L1 underside the control room's east wall (the plant door) and the LV room's west wall; the
  // plant's north wall z -7 to the L1 underside, x 52..58 (the LV room) and 61.5..64 (the riser): the sealed rooms have
  // no door; the east core between them (its walls and eStairG) is R3's
  wall(b, false, 52, -30, -11, 0, R, [doorHole(hingeZ('plantHall'), 0)]);
  doorAt(b, false, 52, hingeZ('plantHall'), 0, swingOf('plantHall'));
  wall(b, false, 52, -11, 0, 0, L1_UNDER, [doorHole(hingeZ('ctlPlant'), 0)]);
  doorAt(b, false, 52, hingeZ('ctlPlant'), 0, swingOf('ctlPlant'));
  const [, , lvx1] = S3_BOX.lvRoom;
  const [rsx0, , rsx1] = S3_BOX.riser;
  wall(b, true, -7, 52, lvx1, 0, L1_UNDER, []);
  wall(b, true, -7, rsx0, rsx1, 0, L1_UNDER, []);

  // ---- 6. the hall contents kept (D:56): the environmental chamber with its refrigeration plant on top (S3:386-387), the
  // shielded EMC room (S3:389), the burn-in racks, the benches (P8), the crane bay's board screen
  const [cx0, cz0, cx1, cz1] = S3_BOX.chamber;
  bx(b, cx0, cx1, 0, S3_BOX.chamberTop, cz0, cz1, PANEL_WHITE);
  bx(b, 33.5, 35.5, S3_BOX.chamberTop, 5.6, -21, -15, STEEL, { noLedge: true });
  const [ex0, ez0, ex1, ez1] = S3_BOX.emc;
  bx(b, ex0, ex1, 0, S3_BOX.emcTop, ez0, ez1, WALL_DARK, { noLedge: true });
  for (const [x0, z0, x1, z1] of S3_BOX.racks) bx(b, x0, x1, 0, S3_BOX.racksTop, z0, z1, RACK, { noLedge: true });
  for (const [x0, z0, x1, z1] of S3_BOX.benches) bx(b, x0, x1, 0, S3_BOX.benchTop, z0, z1, BENCH);
  const [qx0, qz0, qx1, qz1] = S3_BOX.screen;
  bx(b, qx0, qx1, 0, S3_BOX.screenTop, qz0, qz1, WALL_DARK, { noLedge: true });

  // ---- 7. the east yard sealed (D:55, G10): two 6 m walls x 64..70 at z 0 and z -30, noLedge (`wall`), to the perimeter
  wall(b, true, 0, 64, YARD_X1, 0, YARD_WALL_H, [], WALL_DARK);
  wall(b, true, -30, 64, YARD_X1, 0, YARD_WALL_H, [], WALL_DARK);

  // ---- 8. the chilled-water trench (D:54, P0:71): not built. P14: it needs the campus ground box (`campusOps.ts`, one
  // floor under all of S3) cut under x 10..64, z -30..0 (or under the trench), outside this lane; the lead has not split it
}
