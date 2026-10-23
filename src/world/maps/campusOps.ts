import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import { buildCampusS1, S1_HIDESPOTS, S1_NAV_SEEDS, S1_PICKUPS, S1_ROOMS, S1_SPAWNS, S1_SWITCHES } from './campusS1';
import { buildCampusS2, S2_HIDESPOTS, S2_NAV_SEEDS, S2_PICKUPS, S2_ROOMS, S2_SWITCHES } from './campusS2';
import { CAMPUS_ALARMS, CAMPUS_SECTORS, CAMPUS_SECURITY } from './campusSectors';
import { buildCampusS3, S3_HIDESPOTS, S3_LASERS, S3_NAV_SEEDS, S3_PANELS, S3_PICKUPS, S3_ROOMS, S3_SWITCHES } from './campusS3';
import { buildCampusS4, S4_BOARDS, S4_HIDESPOTS, S4_LASERS, S4_NAV_SEEDS, S4_PANELS, S4_ROOMS, S4_SWITCHES } from './campusS4';
import { buildCampusS5, S5_BOARDS, S5_HIDESPOTS, S5_LASERS, S5_NAV_SEEDS, S5_PANELS, S5_ROOMS, S5_SWITCHES } from './campusS5';

const T = 0.3;
const WALL = '#a9a496';
const SLAB = '#7f8588';
const GROUND = '#3d4245';

/** The map's bounds (SPEC "Map structure decision"): x -70..70, z -84..70 (the ring road is the south edge). */
export const CAMPUS_BOUNDS = { minX: -70, maxX: 70, minZ: -84, maxZ: 70 } as const;

/** A stub connector room (a ground-level room between two shells, 3.0 high): walls on its two long sides and a roof, standby fill 0.30. */
function connector(b: LevelBuilder, o: { x0: number; x1: number; z0: number; z1: number; alongX: boolean }): void {
  const i0 = b.boxes.length;
  if (o.alongX) {
    b.wallX(o.z0, o.x0, o.x1, [], 3.0, WALL, T);
    b.wallX(o.z1, o.x0, o.x1, [], 3.0, WALL, T);
  } else {
    b.wallZ(o.x0, o.z0, o.z1, [], 3.0, WALL, T);
    b.wallZ(o.x1, o.z0, o.z1, [], 3.0, WALL, T);
  }
  b.box((o.x0 + o.x1) / 2, 3.1, (o.z0 + o.z1) / 2, o.x1 - o.x0 + T, 0.2, o.z1 - o.z0 + T, SLAB);
  b.boxes[b.boxes.length - 1]!.overhead = true;
  b.mark(i0, { noLedge: true });
  b.ambientZone(o.x0, o.x1, o.z0, o.z1, 0.3, -1, 3.2);
}

/**
 * The stub connector rooms between the buildings (SPEC "Map structure decision" footprints): S2 (the HQ), S3 (labs), S4
 * (data hall) and S5 (old house) are built in full by their own files (called from `build`); C2 is S2's glazed bridge on L1.
 */
function otherBuildings(b: LevelBuilder): void {
  // S2 / HQ and S3 / labs: built in full by `campusS2.ts` / `campusS3.ts` (called from `build`)
  // S4 / data hall: built in full by `campusS4.ts` (C3's far door south, C4's near door west)
  // S5 / old house: built in full by `campusS5.ts` (C4's far door east is its service lobby's)
  // the stub connectors: C3 (x 22..26, z 0..16), C4 (x -26..-10, z 26..32); C2 is S2's bridge
  connector(b, { x0: 22, x1: 26, z0: 0, z1: 16, alongX: false });
  connector(b, { x0: -26, x1: -10, z0: 26, z1: 32, alongX: true });
}

/** Extra nav flood seeds: every stub section's interior and connector (the stub run is joined by doorways, but seeds keep them kept). */
const STUB_NAV_SEEDS: Vector3[] = [
  new Vector3(24, 0, -14),
  new Vector3(24, 0, 8),
  new Vector3(-18, 0, 29),
];

/**
 * Saltmarsh Park (`feature/sector-redesign`, slice 1): the research campus of Orrin Systems on the estuary edge, five
 * buildings joined by quiet connectors, raided at 02:00 on key-ceremony night. One map, five sections (`campusSectors.ts`);
 * section 1 (the gatehouse, staff car park and forecourt, `campusS1.ts`) and section 2 (the HQ atrium and offices,
 * `campusS2.ts`) are built in full, the other three buildings are greybox shells with a stub section each. Registered in `MAPS`, not listed (slice 3 lists it).
 */
export const campusOps: MapDef = {
  id: 'campusOps',
  name: 'Saltmarsh Park - Sector Ops',
  description: 'A research campus raided in five sections: the gatehouse and car park, the HQ atrium, the labs, the data hall and the Old House.',
  modes: ['sector'],
  sectors: CAMPUS_SECTORS,
  navLayers: 5,
  // greybox: no generated skirting, vents or clutter (everything on a wall is placed on purpose)
  detail: false,
  theme: {
    sky: '#0b111b',
    horizon: '#2b3440',
    ground: '#4a4f50',
    fogStart: 40,
    fogEnd: 140,
    sunDir: [0.35, -1, 0.55],
    // night: moonlight on the site, dark inside but for the lamps that are on
    sunIntensity: 0.16,
    ambient: 0.3,
    lightLevel: 0.3,
    faction: 'urban',
    // cool sodium outside, a little desaturated
    grade: { tint: [1.0, 0.99, 1.04], saturation: 0.85, contrast: 1.08 },
  },
  build(b: LevelBuilder): MapLayout {
    // the ground (1 m thick under y 0) and the boundary walls (they set the map's bounds)
    b.floor(0, -7, 140, 154, GROUND, 0, 1);
    b.perimeter(CAMPUS_BOUNDS.minX, CAMPUS_BOUNDS.maxX, CAMPUS_BOUNDS.minZ, CAMPUS_BOUNDS.maxZ, 6, '#2c3033');
    buildCampusS1(b);
    buildCampusS2(b);
    otherBuildings(b);
    buildCampusS3(b);
    buildCampusS4(b);
    buildCampusS5(b);
    const alarms = CAMPUS_ALARMS.map((a) => ({ pos: new Vector3(a.at[0], a.y ?? 0, a.at[1]), yaw: a.yaw, section: a.section }));
    return {
      playerSpawns: S1_SPAWNS,
      // the sections' guards come from the mode, not the rooms
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [...S1_PICKUPS, ...S2_PICKUPS, ...S3_PICKUPS],
      hideSpots: [...S1_HIDESPOTS, ...S2_HIDESPOTS, ...S3_HIDESPOTS, ...S4_HIDESPOTS, ...S5_HIDESPOTS],
      switches: [...S1_SWITCHES, ...S2_SWITCHES, ...S3_SWITCHES, ...S4_SWITCHES, ...S5_SWITCHES],
      rooms: [...S1_ROOMS, ...S2_ROOMS, ...S3_ROOMS, ...S4_ROOMS, ...S5_ROOMS],
      navSeeds: [...S1_NAV_SEEDS, ...S2_NAV_SEEDS, ...STUB_NAV_SEEDS, ...S3_NAV_SEEDS, ...S4_NAV_SEEDS, ...S5_NAV_SEEDS],
      alarms,
      security: CAMPUS_SECURITY,
      lasers: [...S3_LASERS, ...S4_LASERS, ...S5_LASERS],
      laserPanels: [...S3_PANELS, ...S4_PANELS, ...S5_PANELS],
      boards: [...S4_BOARDS, ...S5_BOARDS],
    };
  },
};
