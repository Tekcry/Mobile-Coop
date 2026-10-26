// (campus-greybox S3 R1a) The v2 lab block: a thin assembler, frozen after the frame. Brief `docs/campus-greybox/briefs/S3.md`
// section 2: the build and the lists come from the sub-files, each owned by one sub-lane (s3Shell R1, s3L1 R2a / R2b,
// s3Stairs R3, s3Lights and s3Devices R4, s3Lips R6); the shared constants, boxes, doors and helpers from `s3Kit.ts`.
import type { Vector3 } from '../../../core/babylon';
import type { LevelBuilder } from '../../levelBuilder';
import type { RoomDef } from '../../rooms';
import type { MapLayout } from '../../mapDef';
import { buildS3Shell, S3_HIDESPOTS_G, S3_NAV_SEEDS_G, S3_ROOMS_G } from './s3Shell';
import { buildS3L1, S3_HIDESPOTS_L1, S3_NAV_SEEDS_L1, S3_ROOMS_L1 } from './s3L1';
import { buildS3Stairs, S3_ROOMS_STAIRS } from './s3Stairs';
import { buildS3Lights } from './s3Lights';

/**
 * Saltmarsh Park (`campusOps`) section 3 - the lab block, re-laid to the signed plan (sector-redesign-signoff 7c021f01,
 * `S3-detail.md`, "Re-plan as drawn, 20 guards"). Footprint x 10..64, z -30..0; G 0, L1 4.5, roof 9.0 (top 9.2). G: the
 * test hall (x 10..52, z -30..-11, with the low aisle under the landing), the goods-in dock, the test control room, the
 * plant room, the sealed LV room and riser; L1: the bridge landing, the viewing corridor and east lobby, the north rooms
 * (goods landing, write-up, gowning, clean room, prototype store), the security room over the plant, the gallery, the
 * crane walkway (6.0) and the ceiling void (7.5); three fire stairs (west, north, east).
 */

export { S3_BOX, S3_DOORS, S3_DOOR_SWING, S3_GROUPS, S3_HIGH_BAYS, S3_L1, S3_ROOF, S3_VIEW_SPANDREL_TOP } from './s3Kit';
export type { S3Box, S3Door, S3DoorId } from './s3Kit';
export { S3_FLIGHTS } from './s3Stairs';
export type { S3Flight } from './s3Stairs';
export { S3_BOARDS, S3_LASERS, S3_PANEL_NEAR, S3_PANELS, S3_SWITCHES } from './s3Lights';
export { S3_DESKS } from './s3Devices';
export { S3_COOP_LIPS } from './s3Lips';

/** Section 3's rooms (HUD tags; no squads): G, L1, then the stair cores. Stacked rooms carry their storey; none overlap but the
 *  stair cores (smallest room wins in `roomAt`). */
export const S3_ROOMS: RoomDef[] = [...S3_ROOMS_G, ...S3_ROOMS_L1, ...S3_ROOMS_STAIRS];

/** Nav seeds: G then L1. */
export const S3_NAV_SEEDS: Vector3[] = [...S3_NAV_SEEDS_G, ...S3_NAV_SEEDS_L1];

/** Where a carried body can be hidden: G then L1. */
export const S3_HIDESPOTS: NonNullable<MapLayout['hideSpots']> = [...S3_HIDESPOTS_G, ...S3_HIDESPOTS_L1];

export const S3_PICKUPS: NonNullable<MapLayout['pickups']> = [];

/** Everything of section 3: the shell and G, L1, the three stairs, then the lamps and laser housings. */
export function buildCampusS3(b: LevelBuilder): void {
  buildS3Shell(b);
  buildS3L1(b);
  buildS3Stairs(b);
  buildS3Lights(b);
}
