import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import { buildCampusS1, S1_HIDESPOTS, S1_NAV_SEEDS, S1_PICKUPS, S1_ROOMS, S1_SPAWNS, S1_SWITCHES } from './campusS1';
import { buildCampusS2, S2_HIDESPOTS, S2_NAV_SEEDS, S2_PICKUPS, S2_ROOMS, S2_SWITCHES } from './campusS2';
import { CAMPUS_ALARMS, CAMPUS_SECTORS, CAMPUS_SECURITY } from './campusSectors';
import { buildCampusS3, S3_HIDESPOTS, S3_LASERS, S3_NAV_SEEDS, S3_PANELS, S3_PICKUPS, S3_ROOMS, S3_SWITCHES } from './campusS3';

const PI = Math.PI;
const T = 0.3;
const WALL = '#a9a496';
const SLAB = '#7f8588';
const GROUND = '#3d4245';

/** The map's bounds (SPEC "Map structure decision"): x -70..70, z -84..70 (the ring road is the south edge). */
export const CAMPUS_BOUNDS = { minX: -70, maxX: 70, minZ: -84, maxZ: 70 } as const;

/** A doorway in a shell wall: `a`..`e` along the wall, a door anchor unless `own` (another file builds the door). */
type Gap = readonly [a: number, e: number, own?: boolean];

interface Shell {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Wall and roof height (m); `slabs` = the floors' tops (the last is the roof). */
  h: number;
  slabs: readonly number[];
  /** Gaps by side: south (z0), north (z1), west (x0), east (x1). */
  s?: readonly Gap[];
  n?: readonly Gap[];
  w?: readonly Gap[];
  e?: readonly Gap[];
}

/**
 * One building's greybox shell (slice 1: the whole map's build, nav and bake cost is measured): four 0.3 walls with
 * their doorways, a head over each, and a 0.2 slab per floor with the roof last. Nothing inside; every piece is
 * `noLedge`, the slabs and heads overhead (the ground floor stays open to the nav grid).
 */
function shell(b: LevelBuilder, o: Shell): void {
  const i0 = b.boxes.length;
  const gaps = (g: readonly Gap[] | undefined): [number, number][] => (g ?? []).map((q) => [q[0], q[1]]);
  b.wallX(o.z0, o.x0, o.x1, gaps(o.s), o.h, WALL, T);
  b.wallX(o.z1, o.x0, o.x1, gaps(o.n), o.h, WALL, T);
  b.wallZ(o.x0, o.z0, o.z1, gaps(o.w), o.h, WALL, T);
  b.wallZ(o.x1, o.z0, o.z1, gaps(o.e), o.h, WALL, T);
  const side = (g: readonly Gap[] | undefined, along: 'x' | 'z', at: number): void => {
    for (const [a, e, own] of g ?? []) {
      const w = e - a;
      const mid = (a + e) / 2;
      if (along === 'x') b.box(mid, (2.1 + o.h) / 2, at, w, o.h - 2.1, T, WALL);
      else b.box(at, (2.1 + o.h) / 2, mid, T, o.h - 2.1, w, WALL);
      b.boxes[b.boxes.length - 1]!.overhead = true;
      if (own) continue;
      if (along === 'x') b.door(a, 0, at, w, PI / 2, { swing: at === o.z0 ? 1 : -1 });
      else b.door(at, 0, a, w, 0, { swing: at === o.x0 ? 1 : -1 });
    }
  };
  side(o.s, 'x', o.z0);
  side(o.n, 'x', o.z1);
  side(o.w, 'z', o.x0);
  side(o.e, 'z', o.x1);
  const cx = (o.x0 + o.x1) / 2;
  const cz = (o.z0 + o.z1) / 2;
  for (const y of o.slabs) {
    b.box(cx, y - 0.1, cz, o.x1 - o.x0, 0.2, o.z1 - o.z0, SLAB);
    b.boxes[b.boxes.length - 1]!.overhead = true;
  }
  b.mark(i0, { noLedge: true });
}

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
 * The three other buildings as greybox shells (SPEC "Map structure decision" footprints, heights from the storey table),
 * with the stub connector rooms between them (S2, the HQ x -44..4, z -30..6, is built in full by `campusS2.ts`, and C2 is its
 * glazed bridge on L1). S3 (labs) x 10..64, z -30..0, 9.5; S4 (data hall) x -10..40, z 16..48, 7.5; S5 (old house) x -66..-26,
 * z 18..48, 8.4. The doorways are the connectors' near and far doors (SPEC route table), at ground level in this slice.
 */
function otherBuildings(b: LevelBuilder): void {
  // S2 / HQ and S3 / labs: built in full by `campusS2.ts` / `campusS3.ts` (called from `build`)
  // S4 / data hall: C3's far door south, C4's near door west
  shell(b, { x0: -10, x1: 40, z0: 16, z1: 48, h: 7.5, slabs: [7.5], s: [[23.4, 24.6]], w: [[28.4, 29.6]] });
  // S5 / old house: C4's far door east
  shell(b, { x0: -66, x1: -26, z0: 18, z1: 48, h: 8.4, slabs: [4.2, 8.4], e: [[28.4, 29.6]] });
  // the stub connectors: C3 (x 22..26, z 0..16), C4 (x -26..-10, z 26..32); C2 is S2's bridge
  connector(b, { x0: 22, x1: 26, z0: 0, z1: 16, alongX: false });
  connector(b, { x0: -26, x1: -10, z0: 26, z1: 32, alongX: true });
}

/** Extra nav flood seeds: every stub section's interior and connector (the stub run is joined by doorways, but seeds keep them kept). */
const STUB_NAV_SEEDS: Vector3[] = [
  new Vector3(24, 0, -14),
  new Vector3(24, 0, 8),
  new Vector3(24, 0, 30),
  new Vector3(-18, 0, 29),
  new Vector3(-46, 0, 33),
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
    const alarms = CAMPUS_ALARMS.map((a) => ({ pos: new Vector3(a.at[0], a.y ?? 0, a.at[1]), yaw: a.yaw, section: a.section }));
    return {
      playerSpawns: S1_SPAWNS,
      // the sections' guards come from the mode, not the rooms
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [...S1_PICKUPS, ...S2_PICKUPS, ...S3_PICKUPS],
      hideSpots: [...S1_HIDESPOTS, ...S2_HIDESPOTS, ...S3_HIDESPOTS],
      switches: [...S1_SWITCHES, ...S2_SWITCHES, ...S3_SWITCHES],
      rooms: [...S1_ROOMS, ...S2_ROOMS, ...S3_ROOMS],
      navSeeds: [...S1_NAV_SEEDS, ...S2_NAV_SEEDS, ...STUB_NAV_SEEDS, ...S3_NAV_SEEDS],
      alarms,
      security: CAMPUS_SECURITY,
      lasers: S3_LASERS,
      laserPanels: S3_PANELS,
    };
  },
};
