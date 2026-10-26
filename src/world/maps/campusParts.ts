import type { Vector3 } from '../../core/babylon';
import type { SectorDef } from '../../game/sectors';
import type { SecurityData } from '../../security/data';
import type { MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import type { ArtTag } from '../campusArt/artTags';
import type { PropCatalogue } from '../campusArt/catalogue';
import type { CampusDresser } from '../campusArt/dresser';
import type { CoopLip } from './campusS1';

/** An alarm panel on the campus: `at` (x, z), facing `yaw`, live only in `section` (0-based); `y` the floor (default 0). */
export interface CampusAlarm {
  at: [number, number];
  yaw: number;
  section: number;
  y?: number;
}

/**
 * (campus-greybox P0) Everything one campus section gives the map, in one object, so the map files (`campusOps.ts`,
 * `campusSectors.ts`, `campusLips.ts`, `campusDress.ts`) take each section's pieces from `CAMPUS_PARTS` (`campusSections.ts`:
 * the live v1 parts or the v2 parts per `flags.campusV2`) and never name a section's own exports. Each section's data
 * file builds its parts (`S<N>_PARTS`): the live ones in `campusS<N>Data.ts`, the v2 ones in `campusV2/s<N>Data.ts`.
 * Every list is present (empty when the section has none), so a lane may fill any of them without touching a shared file.
 */
export interface CampusSectionParts {
  /** Builds the section's greybox into the builder (walls, floors, lights, doors, anchors). */
  build: (b: LevelBuilder) => void;
  /** The map's player spawns: only section 1's are read (`CAMPUS_PARTS[0]`). */
  spawns: MapLayout['playerSpawns'];
  pickups: MapLayout['pickups'];
  hideSpots: NonNullable<MapLayout['hideSpots']>;
  switches: NonNullable<MapLayout['switches']>;
  rooms: RoomDef[];
  navSeeds: Vector3[];
  lasers: NonNullable<MapLayout['lasers']>;
  panels: NonNullable<MapLayout['laserPanels']>;
  boards: NonNullable<MapLayout['boards']>;
  /** The sector definition (guards, routes, objective, connector, crate, start, ...): `CAMPUS_SECTORS[k]`. */
  sector: SectorDef;
  /** The section's cameras (`CAMPUS_SECURITY.devices`, in section order). */
  cameras: SecurityData['devices'];
  /** The section's security desks (`CAMPUS_SECURITY.desks`, in section order). */
  desks: NonNullable<SecurityData['desks']>;
  /** Named camera levels the section adds to `CAMPUS_SECURITY.levels` (`ground` is shared). */
  levels: Readonly<Record<string, number>>;
  alarms: CampusAlarm[];
  /** The co-op lips (`CAMPUS_COOP_LIPS`, in section order). */
  coopLips: readonly CoopLip[];
  /** The art pass (`campusDress.ts`): the dresser, the room tags, the hero catalogue and the chimney stacks. */
  dress: (d: CampusDresser) => void;
  artTags: Readonly<Record<string, ArtTag>>;
  hero: PropCatalogue | null;
  chimneys?: readonly (readonly [number, number])[];
}
