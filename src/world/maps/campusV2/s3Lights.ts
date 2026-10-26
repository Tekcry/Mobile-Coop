// (campus-greybox S3) The v2 lab block's lights and their devices (sub-lane r4, slice R4; brief `docs/campus-greybox/briefs/S3.md`
// section 4 "R4"). Sources: D = `S3-detail.md`, GR = the plan graph (sector-redesign-signoff 7c021f01); S3 = the as-built
// `campusS3.ts` (6c3f4a87). Every lamp comes from `S3_LIGHTS` (one block); the cores' ambient is R3's (`s3Stairs.ts`).
import { Vector3 } from '../../../core/babylon';
import type { LevelBuilder } from '../../levelBuilder';
import type { MapLayout } from '../../mapDef';
import { makeCone } from '../../lights';
import type { LaserDef } from '../../../game/jammer';
import type { LaserPanelDef } from '../../../game/laserPanels';
import type { BoardDef } from '../../../game/isolators';
import { PI, ROOF_TOP, S3_GROUPS, S3_HIGH_BAYS, S3_L1, lamp } from './s3Kit';

const L1 = S3_L1;

/** One S3 lamp fitting: its role, position, radius, intensity, circuit, an optional cone (dx, dy, dz, angle) and the
 *  fitting's width (the as-built `lamp()` options, S3:230). */
export interface S3Lamp {
  readonly role: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly r: number;
  readonly i: number;
  readonly group: number;
  readonly cone?: readonly [number, number, number, number];
  readonly w?: number;
}

/** The as-built fittings (S3:470-476): the high bay (cone straight down, 1.15), the burn-in task light (aimed 0.5 / -0.85). */
const DOWN: readonly [number, number, number, number] = [0, -1, 0, 1.15];
const TASK: readonly [number, number, number, number] = [0.5, -0.85, 0, 1.0];
/** The fitting values reused by kind (brief R4 lamp table). */
const HIGH_BAY = { r: 12, i: 0.9, cone: DOWN, w: 0.7 } as const;
const CORRIDOR = { r: 6, i: 0.7, w: 0.5 } as const;
const DOCK = { r: 7, i: 0.8, cone: DOWN, w: 0.5 } as const;
const BURN = { r: 4, i: 0.7, cone: TASK, w: 0.4 } as const;
const STAIR = { r: 4, i: 0.7, w: 0.3 } as const;

/** A fire-stair core's two fittings (J17, B8): over its half landing at y 4.4 and its L1 landing at y 6.9, the landing
 *  centres of R3's table (x, half-landing z, L1-landing z). */
function stairLamps(role: string, group: number, x: number, halfZ: number, l1Z: number): S3Lamp[] {
  return [
    { role, x, y: 4.4, z: halfZ, group, ...STAIR },
    { role, x, y: 6.9, z: l1Z, group, ...STAIR },
  ];
}

/**
 * (S3 R4, J17 Q2 "Never", 2026-10-25 ~16:40) Every S3 lamp, in one block: PROVISIONAL, light-realism retunes.
 * `buildS3Lights` builds every lamp from this block and from nowhere else; every fitting is on, destructible and electric
 * on a cuttable circuit; no fitting is built off or dead, none of the as-built kinds is dimmed. L1 lamps hang at y 7.4,
 * under the 7.5 ceiling (derived). TODO(light-realism): calibration replaces these values (today's engine values x1).
 */
export const S3_LIGHTS: readonly S3Lamp[] = [
  // the five high bays at 8.5 (3.3 points; hb1 south pair, hb2 crane bay, hb3 north pair), S3:471
  ...S3_HIGH_BAYS.map(([x, z, group]): S3Lamp => ({ role: 'high-bay', x, y: 8.5, z, group, ...HIGH_BAY })),
  // the viewing corridor's downlights (x as built S3:473, z the new centre line), the goal lamp at the store hatch (P12)
  // and the gowning room's night light (S3:474's smallest fitting, no cone), all on `view` (B2: the isolator cuts them)
  ...([27, 37, 47] as const).map((x): S3Lamp => ({ role: 'corridor', x, y: 7.4, z: -9, group: S3_GROUPS.view, ...CORRIDOR })),
  { role: 'goal', x: 49.6, y: 7.4, z: -6.6, group: S3_GROUPS.view, ...CORRIDOR },
  { role: 'gown-night', x: 35.5, y: 7.4, z: -3.5, group: S3_GROUPS.view, r: 4, i: 0.7, w: 0.4 },
  // the burn-in task lights over the racks, as built (S3:474)
  ...([-23.5, -17.5, -12.2] as const).map((z): S3Lamp => ({ role: 'burn-in', x: 50.2, y: 2.6, z, group: S3_GROUPS.burn, ...BURN })),
  // the dock work lamps: over the desk and inside the roller door (P13), S3:475
  { role: 'dock', x: 24.5, y: 4.0, z: -2.2, group: S3_GROUPS.dock, ...DOCK },
  { role: 'dock', x: 21.5, y: 4.0, z: -10, group: S3_GROUPS.dock, ...DOCK },
  // the write-up desk lamp (S3:476) and the security room (S3:477)
  { role: 'office', x: 25, y: 7.4, z: -3, group: S3_GROUPS.office, ...CORRIDOR },
  { role: 'sec', x: 58.5, y: 7.4, z: -14.5, group: S3_GROUPS.sec, r: 7, i: 0.7, w: 0.5 },
  // the control room: the consoles at the observation windows' centres (derived) and the sign-out board's lamp (the burn-in
  // fitting turned to face its board on the north wall, derived)
  { role: 'control', x: 36.5, y: 4.0, z: -10, group: S3_GROUPS.ctl, ...DOCK },
  { role: 'control', x: 47, y: 4.0, z: -10, group: S3_GROUPS.ctl, ...DOCK },
  { role: 'sign-out', x: 44, y: 2.6, z: -0.6, group: S3_GROUPS.ctl, r: 4, i: 0.7, cone: [0, -0.85, 0.5, 1.0], w: 0.4 },
  // the plant: the chiller bay (a high bay) and the north passage under L1 (a dock lamp; J17, B8)
  { role: 'chiller', x: 58, y: 8.5, z: -24, group: S3_GROUPS.plant, ...HIGH_BAY },
  { role: 'plant-passage', x: 55, y: 4.0, z: -12.5, group: S3_GROUPS.plant, ...DOCK },
  // ---- J17 (Q2): the rooms first listed as dark, lit on cuttable circuits (B8, B9)
  { role: 'gas-cage', x: 11.75, y: 2.6, z: -1.75, group: S3_GROUPS.dock, r: 4, i: 0.7, w: 0.3 },
  { role: 'emc', x: 45, y: 3.6, z: -20, group: S3_GROUPS.emc, r: 5, i: 0.8, cone: DOWN, w: 0.4 },
  { role: 'clean', x: 42.25, y: 7.4, z: -3.5, group: S3_GROUPS.clean, ...CORRIDOR },
  { role: 'goods-landing', x: 14, y: 7.4, z: -3.5, group: S3_GROUPS.hoist, ...CORRIDOR },
  ...stairLamps('west-stair', S3_GROUPS.wStair, 15.75, -15.35, -20.15),
  ...stairLamps('north-stair', S3_GROUPS.nStair, 31.75, -1.35, -6.15),
  ...stairLamps('east-stair', S3_GROUPS.eStair, 59.75, -1.35, -6.15),
];

/**
 * Light switches (LD 5.1 "by a door"; derived from the as-built switches S3:209-219: on the wall face, 0.5 off the latch
 * edge of the space's main door, yawed into the space). The high-bay bank (three, 0.4 apart, as S3:210-212) on the west
 * core's west face north of wStairG, facing the low aisle (the hall's new entry; e2e part 6's lure near #16).
 */
export const S3_SWITCHES: NonNullable<MapLayout['switches']> = [
  { pos: new Vector3(13.85, 0, -18.95), yaw: -PI / 2, group: S3_GROUPS.hb1 },
  { pos: new Vector3(13.85, 0, -18.55), yaw: -PI / 2, group: S3_GROUPS.hb2 },
  { pos: new Vector3(13.85, 0, -18.15), yaw: -PI / 2, group: S3_GROUPS.hb3 },
  // the corridor: at the landing's fire door (corridor side) and at the east lobby's end wall (as built, two)
  { pos: new Vector3(13.4, L1, -10.85), yaw: 0, group: S3_GROUPS.view },
  { pos: new Vector3(63.85, L1, -9), yaw: -PI / 2, group: S3_GROUPS.view },
  // the burn-in lights: on the hall side of the control-room door, the nearest door to the log desk
  { pos: new Vector3(41.7, 0, -11.15), yaw: PI, group: S3_GROUPS.burn },
  // inside each room's main door: the dock (the roller door), the write-up, the sec room, the control room, the plant
  { pos: new Vector3(23.5, 0, -10.85), yaw: 0, group: S3_GROUPS.dock },
  { pos: new Vector3(25.7, L1, -6.85), yaw: 0, group: S3_GROUPS.office },
  { pos: new Vector3(59.7, L1, -11.15), yaw: PI, group: S3_GROUPS.sec },
  { pos: new Vector3(41.7, 0, -10.85), yaw: 0, group: S3_GROUPS.ctl },
  { pos: new Vector3(52.15, 0, -25.7), yaw: PI / 2, group: S3_GROUPS.plant },
  // J17: the EMC room is a closed box (R1, as built), so its switch is on its north face by #17's door post (45, -16);
  // the clean room on the clean side of the passThrough; the goods landing inside its door; each stair inside its G door
  { pos: new Vector3(46.1, 0, -15.85), yaw: 0, group: S3_GROUPS.emc },
  { pos: new Vector3(37.65, L1, -1.9), yaw: PI / 2, group: S3_GROUPS.clean },
  { pos: new Vector3(13.7, L1, -6.85), yaw: 0, group: S3_GROUPS.hoist },
  { pos: new Vector3(14.15, 0, -18.95), yaw: PI / 2, group: S3_GROUPS.wStair },
  { pos: new Vector3(30.15, 0, -4.9), yaw: PI / 2, group: S3_GROUPS.nStair },
  { pos: new Vector3(60.8, 0, -6.85), yaw: 0, group: S3_GROUPS.eStair },
];

/**
 * The isolator board (sync-s3-isolator, GR:843-849): on the LV room's south wall in the plant, facing the plant; a timed
 * isolator that cuts `view` (the corridor, the gowning room and the hatch, B2) for 45 s (AS8 D:240, not `ISOLATOR_WINDOW`).
 */
export const S3_BOARDS: BoardDef[] = [{ pos: new Vector3(56, 0, -7.3), yaw: PI, groups: [S3_GROUPS.view], window: 45, section: 2 }];

/**
 * The laser bands (R5 SPEC: an alarm stage, never damage): las-gown, three beams across the gowning room's pass-through into
 * the clean room (D:68, P45:67; S3:155 moved to the new pass-through); las-store, two beams across the store's aisle gap
 * in the x 53 shelving partition (D:70, P45:65; S3:156).
 */
export const S3_LASERS: LaserDef[] = [
  { id: 'las-gown', x1: 37.5, z1: -3.6, x2: 37.5, z2: -2.4, ys: [0.35, 0.9, 1.45], floorY: L1, label: 'Clean room beam curtain', section: 2 },
  { id: 'las-store', x1: 53, z1: -4, x2: 53, z2: -2.8, ys: [0.5, 1.1], floorY: L1, label: 'Prototype store beams', section: 2 },
];

/**
 * The lasers' power panels (one each): panel-gown on the gowning room's north wall facing its door (derived: as built
 * S3:167, opposite the room door); panel-store on the shelving partition's front-bay (west) face, 0.6 south of the aisle
 * gap (derived: S3:168).
 */
export const S3_PANELS: LaserPanelDef[] = [
  { id: 'panel-gown', lasers: ['las-gown'], x: 35.5, y: L1 + 1.4, z: -0.15, yaw: PI, section: 2, label: 'Clean room beam curtain power' },
  { id: 'panel-store', lasers: ['las-store'], x: 52.85, y: L1 + 1.4, z: -4.6, yaw: -PI / 2, section: 2, label: 'Prototype store beams reset' },
];

/** The near-side points (feet) each panel is seen from: panel-gown through and inside the gowning door (derived: the
 *  as-built offsets S3:173 from the door); panel-store from the front bay's three entries (the hatch, the airlock, the tile). */
export const S3_PANEL_NEAR: Record<string, readonly (readonly [number, number, number])[]> = {
  'panel-gown': [[35.5, L1, -8], [35.7, L1, -6], [35.3, L1, -4]],
  'panel-store': [[49.6, L1, -6.2], [47.8, L1, -3], [49.5, L1, -3]],
};

/** The block's standby fill (S3:480): true dark with a circuit cut. */
const BLOCK_AMBIENT = 0.14;

/** The lamps (from `S3_LIGHTS` only), the laser emitters and the block's ambient. */
export function buildS3Lights(b: LevelBuilder): void {
  for (const l of S3_LIGHTS) {
    const cone = l.cone ? makeCone(l.cone[0], l.cone[1], l.cone[2], l.cone[3]) : null;
    lamp(b, l.x, l.y, l.z, { r: l.r, i: l.i, group: l.group, cone, w: l.w });
  }
  // every band a visible emitter box at each end (as built S3:462-465)
  for (const l of S3_LASERS) {
    const top = Math.max(...l.ys) + 0.15;
    for (const [x, z] of [[l.x1, l.z1], [l.x2, l.z2]] as const) b.box(x, l.floorY! + top / 2, z, 0.12, top, 0.12, '#3a3d40', 0, 0, false);
  }
  b.ambientZone(10, 64, -30, 0, BLOCK_AMBIENT, -1, ROOF_TOP);
}
