// (campus-greybox S3) The v2 lab block's security devices (sub-lane r4, slice R4; brief `docs/campus-greybox/briefs/S3.md`).
// R1a frame stub: empty lists; R4 fills it. `s3Data.ts` (R5) reads it into `S3_SECTOR` and `S3_PARTS`.
import type { SectorIntel, SectorKeypad } from '../../../game/sectors';
import type { SecurityDesk } from '../../../game/sectorDesks';
import type { SecurityData } from '../../../security/data';
import type { CampusAlarm } from '../campusParts';

/** The cameras (cam-view, cam-dock). */
export const S3_CAMERAS: SecurityData['devices'] = [];
/** The alarm panels. */
export const S3_ALARMS: CampusAlarm[] = [];
/** The security desk (sync-s3-camloop). */
export const S3_DESKS: SecurityDesk[] = [];
/** The keypads (kp-store, kp-sec; sync-s3-code-sink). */
export const S3_KEYPADS: SectorKeypad[] = [];
/** The intel (the sign-out board; sync-s3-code-src). */
export const S3_INTEL: SectorIntel[] = [];
