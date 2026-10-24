import type { SectorDef } from '../../game/sectors';
import type { SecurityData } from '../../security/data';
import type { CampusAlarm } from './campusParts';
import { CAMPUS_PARTS } from './campusSections';

/**
 * The campus screen cap (BRIEF A99, lifts A64's 6): no walkable player point, at any of 32 facings, sees more than this
 * many guards (every guard counts, `dormant` or not: no code sleeps a guard) on their posts and routes in the view with a
 * clear line within 40 m. From guard-render's measured budget: the merged-body run (`docs/guard-render/run-s1`, laptop
 * 4090, Epic 1920x1080) holds 24 alive / 12 in sight on Sector Ops at frame CPU p95 11.1 ms, GPU p95 7.2 ms (60 Hz line:
 * 12 / 15). The campus scene itself is not measured yet (GPU perf pass). Undo: 6 here and the awake-only filter in the
 * campus S2-S5 screen-count tests.
 */
export const CAMPUS_SCREEN_CAP = 12;

/**
 * Saltmarsh Park (`campusOps`) sector data (`docs/sector-redesign/SPEC.md`): the map-wide tables, put together from the
 * five sections' parts in section order (`campusSections.ts`: the live `campusS<N>Data.ts`, or a section's v2 layout
 * under `flags.campusV2`). Each section's guards, routes, cameras, desks, alarms and sector definition live in its own
 * data file. Pure data; the mode places the guards and runs the connectors, `campusOps.ts` builds the rooms.
 */

/** The cameras (range 8-12, `aim` on the protected floor point, a `reason`); live only in their own section. `ground` is
 *  every section's level; a section adds its own named storeys (`levels` in its parts). */
export const CAMPUS_SECURITY: SecurityData = {
  levels: Object.assign({ ground: 0 }, ...CAMPUS_PARTS.map((p) => p.levels)) as Record<string, number>,
  devices: CAMPUS_PARTS.flatMap((p) => p.cameras),
  desks: CAMPUS_PARTS.flatMap((p) => p.desks),
};

/** The alarm panels by section (only the live section's works). `y`: the floor (default 0). */
export const CAMPUS_ALARMS: CampusAlarm[] = CAMPUS_PARTS.flatMap((p) => p.alarms);

/** The five sections (index k = section k + 1). The connectors are ground-level rooms between the buildings (C2 is S2's glazed bridge on L1). */
export const CAMPUS_SECTORS: SectorDef[] = CAMPUS_PARTS.map((p) => p.sector);
