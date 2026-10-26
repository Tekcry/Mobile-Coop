// (campus-greybox S3) The v2 lab block's three fire stairs (sub-lane r3, slice R3; brief `docs/campus-greybox/briefs/S3.md`).
// R1a frame stub: empty lists, no build; R3 fills it.
import type { LevelBuilder } from '../../levelBuilder';

/** A stair flight (`LevelBuilder.stairs` arguments): the tests' nav reads the ramps from here (as built `campusS3.ts`). */
export interface S3Flight {
  x: number;
  z: number;
  w: number;
  len: number;
  rise: number;
  yaw: number;
  y: number;
}

/** The flights of the three cores. */
export const S3_FLIGHTS: readonly S3Flight[] = [];

/** The three cores: flights, stair doors, landings, rails and the cores' ambient zones. */
export function buildS3Stairs(_b: LevelBuilder): void {}
