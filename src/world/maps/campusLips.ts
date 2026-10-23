import type { CoopLip } from './campusS1';
import { S1_COOP_LIPS } from './campusS1';
import { S2_COOP_LIPS } from './campusS2';
import { S3_COOP_LIPS } from './campusS3';
import { S4_COOP_LIPS } from './campusS4';

// The one campus co-op lip list; each new section appends its list here.
export const CAMPUS_COOP_LIPS: readonly CoopLip[] = [...S1_COOP_LIPS, ...S2_COOP_LIPS, ...S3_COOP_LIPS, ...S4_COOP_LIPS];
