// (campus-greybox S3) The v2 lab block's shell and ground floor (sub-lane r1, slice R1; brief `docs/campus-greybox/briefs/S3.md`).
// R1a frame stub: empty lists, no build; R1 fills it.
import type { Vector3 } from '../../../core/babylon';
import type { LevelBuilder } from '../../levelBuilder';
import type { MapLayout } from '../../mapDef';
import type { RoomDef } from '../../rooms';

/** The G rooms (HUD tags; no squads). */
export const S3_ROOMS_G: RoomDef[] = [];
/** The G nav seeds. */
export const S3_NAV_SEEDS_G: Vector3[] = [];
/** The G hide spots. */
export const S3_HIDESPOTS_G: NonNullable<MapLayout['hideSpots']> = [];

/** The shell, the G walls and rooms, the hall contents, the yard walls, the roller door and the trench. */
export function buildS3Shell(_b: LevelBuilder): void {}
