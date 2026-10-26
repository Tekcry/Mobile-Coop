import { flags } from '../../core/flags';
import type { CampusSectionParts } from './campusParts';
import { S1_PARTS } from './campusS1Data';
import { S2_PARTS } from './campusS2Data';
import { S3_PARTS } from './campusS3Data';
import { S4_PARTS } from './campusS4Data';
import { S5_PARTS } from './campusS5Data';
import { S1_PARTS as V2_S1_PARTS } from './campusV2/s1Data';
import { S2_PARTS as V2_S2_PARTS } from './campusV2/s2Data';
import { S3_PARTS as V2_S3_PARTS } from './campusV2/s3Data';
import { S4_PARTS as V2_S4_PARTS } from './campusV2/s4Data';
import { S5_PARTS as V2_S5_PARTS } from './campusV2/s5Data';

/**
 * (campus-greybox P0) The campus section selector. Each section is built from its live parts (`campusS<N>Data.ts`) or,
 * when `flags.campusV2` names it (1-5), from its v2 parts (`campusV2/s<N>Data.ts`, the lane's greybox in progress). The
 * map files read `CAMPUS_PARTS` only, so a v2 section merges dark: with the flag off (the default) the map is exactly
 * the live one. Read once at load (flags are fixed for the page).
 */
export const CAMPUS_V1_PARTS: readonly CampusSectionParts[] = [S1_PARTS, S2_PARTS, S3_PARTS, S4_PARTS, S5_PARTS];
export const CAMPUS_V2_PARTS: readonly CampusSectionParts[] = [V2_S1_PARTS, V2_S2_PARTS, V2_S3_PARTS, V2_S4_PARTS, V2_S5_PARTS];

/** True when section `n` (1-5) is built from its v2 layout on this page. */
export function campusV2On(n: number): boolean {
  return flags.campusV2.includes(n);
}

/** The five sections' parts in section order (index 0 = section 1), each the v1 or the v2 parts by the flag. */
export const CAMPUS_PARTS: readonly CampusSectionParts[] = CAMPUS_V1_PARTS.map((p, k) => (campusV2On(k + 1) ? CAMPUS_V2_PARTS[k]! : p));
