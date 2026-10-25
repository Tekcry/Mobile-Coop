// (campus-greybox S3) The v2 lab block's L1 (sub-lane r2, slices R2a / R2b; brief `docs/campus-greybox/briefs/S3.md`).
// R1a frame stub: empty lists, no build; R2a / R2b fill it.
import type { Vector3 } from '../../../core/babylon';
import type { LevelBuilder } from '../../levelBuilder';
import type { MapLayout } from '../../mapDef';
import type { RoomDef } from '../../rooms';

/** The L1 rooms (HUD tags; no squads; minY 4.5). */
export const S3_ROOMS_L1: RoomDef[] = [];
/** The L1 nav seeds (and the walkway, gallery and chamber roof). */
export const S3_NAV_SEEDS_L1: Vector3[] = [];
/** The L1 hide spots. */
export const S3_HIDESPOTS_L1: NonNullable<MapLayout['hideSpots']> = [];

/** The L1 slabs, rooms, glass, gallery, walkway, hoist hatch, void and ceilings. */
export function buildS3L1(_b: LevelBuilder): void {}
