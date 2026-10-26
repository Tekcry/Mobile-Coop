import type { CoopLip } from './campusS1';
import { CAMPUS_PARTS } from './campusSections';

// The one campus co-op lip list, in section order (each section's `coopLips`, `campusSections.ts`).
export const CAMPUS_COOP_LIPS: readonly CoopLip[] = CAMPUS_PARTS.flatMap((p) => p.coopLips);
