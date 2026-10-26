// (campus-greybox S3) The v2 lab block's security devices (sub-lane r4, slice R4; brief `docs/campus-greybox/briefs/S3.md`
// section 4 "R4"; shapes of `campusSectors.ts` CS:255-266 and `campusS4Data.ts`). `s3Data.ts` (R5) reads them into
// `S3_SECTOR` and `S3_PARTS`. Sources: D = `S3-detail.md`, GR = the plan graph (sector-redesign-signoff 7c021f01).
import type { SectorIntel, SectorKeypad } from '../../../game/sectors';
import type { SecurityDesk } from '../../../game/sectorDesks';
import type { SecurityData } from '../../../security/data';
import type { CampusAlarm } from '../campusParts';
import { PI, S3_DOORS, S3_L1 } from './s3Kit';

/**
 * The cameras of section 3: cam-view on L1 at the corridor's store end on the north wall (P16: its as-built x 52 end-wall
 * mount is gone), facing west down the corridor, bulletproof (E8, A95); cam-dock over the C3 door facing in, as built.
 */
export const S3_CAMERAS: SecurityData['devices'] = [
  { id: 'cam-view', kind: 'camera', level: 's3-l1', at: [51.7, -7.3], y: 2.8, aim: 6, range: 10, facing: 270, reason: 'S3: the prototype store hatch and the viewing corridor', section: 2, bulletproof: true },
  { id: 'cam-dock', kind: 'camera', level: 'ground', at: [24, -0.4], y: 3.2, aim: 6, range: 10, facing: 180, reason: 'S3: the goods-in dock door', section: 2 },
];

/**
 * Section 3's alarm panels (P17, derived): alarm-dock 0.3 east of the dock desk on the north wall (as S3's 0.3 off the old
 * desk, CS:264); alarm-sec at the sec room's west wall midpoint on L1 (as built on its west wall, CS:265).
 */
export const S3_ALARMS: CampusAlarm[] = [
  { at: [25.8, -0.2], yaw: PI, section: 2 },
  { at: [53.2, -14.5], yaw: PI / 2, section: 2, y: S3_L1 },
];

/** #12's monitor stop in the sec room (L1) and his facing there (brief R5 table: (58, -15), faces PI / 2). */
const OPERATOR_AT: readonly [number, number] = [58, -15];
const OPERATOR_YAW = PI / 2;
/** The console stands 0.3 m in front of its operator along his facing (the S4 pattern: desk-sec4 vs its operator). */
const DESK_AHEAD = 0.3;

/**
 * The security desk (sync-s3-camloop, GR:861-867): the sec room's monitor wall loops cam-view and cam-dock (`DESK_LOOP_TIME`
 * 30 s) once its operator #12 (index 11) is down or at the kettle.
 */
export const S3_DESKS: SecurityDesk[] = [
  {
    id: 'desk-sec3',
    section: 2,
    at: [OPERATOR_AT[0] + Math.sin(OPERATOR_YAW) * DESK_AHEAD, OPERATOR_AT[1] + Math.cos(OPERATOR_YAW) * DESK_AHEAD],
    yaw: OPERATOR_YAW,
    y: S3_L1,
    cameras: ['cam-view', 'cam-dock'],
    operator: 11,
  },
];

/**
 * The keypads (B3, P15: one code flag `s3-codes`): kp-store on the store's staff door from the east core (sync-s3-code-sink,
 * GR:870-876) and kp-sec on the security room door (GR:706).
 */
export const S3_KEYPADS: SectorKeypad[] = [
  { at: [S3_DOORS.staff[0], S3_DOORS.staff[1]], code: 's3-codes' },
  { at: [S3_DOORS.sec[0], S3_DOORS.sec[1]], code: 's3-codes' },
];

/**
 * The intel (sync-s3-code-src, GR:852-858): the sample sign-out board on the control room's north wall; y 1.5 as the S4 / S5
 * boards; no code digits are invented.
 */
export const S3_INTEL: SectorIntel[] = [
  { kind: 'board', grants: 's3-codes', line: 'Sign-out board: store and security room codes.', at: [44, 1.5, -0.3], yaw: PI },
];
