// (campus-greybox S3) The v2 lab block's lights and their devices (sub-lane r4, slice R4; brief `docs/campus-greybox/briefs/S3.md`).
// R1a frame stub: empty lists, no build; R4 fills it.
import type { LevelBuilder } from '../../levelBuilder';
import type { MapLayout } from '../../mapDef';
import type { LaserDef } from '../../../game/jammer';
import type { LaserPanelDef } from '../../../game/laserPanels';
import type { BoardDef } from '../../../game/isolators';

/** The light switches. */
export const S3_SWITCHES: NonNullable<MapLayout['switches']> = [];
/** The isolator boards (sync-s3-isolator). */
export const S3_BOARDS: BoardDef[] = [];
/** The laser bands. */
export const S3_LASERS: LaserDef[] = [];
/** The lasers' power panels. */
export const S3_PANELS: LaserPanelDef[] = [];
/** The near-side points (feet) each panel is seen from. */
export const S3_PANEL_NEAR: Record<string, readonly (readonly [number, number, number])[]> = {};

/** The lamps, the laser emitters and the block's ambient. */
export function buildS3Lights(_b: LevelBuilder): void {}
