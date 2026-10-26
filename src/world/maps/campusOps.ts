import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { CampusSectionParts } from './campusParts';
import { CAMPUS_PARTS } from './campusSections';
import { CAMPUS_ALARMS, CAMPUS_SECTORS, CAMPUS_SECURITY } from './campusSectors';
import { dressCampus } from './campusDress';
import { CAMPUS_MISSION_TEST } from './campusMissionTest';

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

/**
 * (sector-redesign cap fix) Tags the items of one section's file with its section: the co-op host mirrors a section's
 * switches, boards, hide spots and doors only while it is live (`Interactables.scope`; all five sections register 196
 * items, over the wire's `MAX_ITEMS`). The connector doors are untagged again by the mode (always mirrored).
 */
function inSection<T extends object>(list: readonly T[], section: number): (T & { section: number })[] {
  return list.map((x) => ({ ...x, section }));
}

/** Runs one section file's build and tags the doors it made with that section (ART-KIT: and records its box range). */
function buildSection(b: LevelBuilder, section: number, build: (b: LevelBuilder) => void, ranges: [number, number][]): void {
  const n0 = b.anchors.doors.length;
  const i0 = b.boxes.length;
  build(b);
  for (let i = n0; i < b.anchors.doors.length; i++) b.anchors.doors[i]!.section = section;
  // (ART-KIT) the section's [i0, i1) box range: its finishes recolour only its own boxes
  ranges[section] = [i0, b.boxes.length];
}

/** (campus-greybox P0) The order the sections' boards are listed in (0-based): S4, S5, S2 as live, then S1, S3. */
const BOARD_ORDER: readonly number[] = [3, 4, 1, 0, 2];

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
  missions: [CAMPUS_MISSION_TEST],
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
    // (fog triage, Michael 4.95.0 "Campus lights look very foggy, can't see through them") the 76 cone fittings scatter
    // a short haze under their shade like a lamp, not a torch's 14 m beam (docs/sector-redesign/checks/fog-triage.md)
    lampBeams: false,
  },
  // (ART-KIT) the greybox plus the campus art; `buildCampus(b, { dress: false })` is the bare greybox
  build: (b: LevelBuilder): MapLayout => buildCampus(b, { dress: true }),
};

/**
 * The campus build (the body `campusOps.build` had before ART-KIT). With `dress` (sector-redesign ART-KIT), once the layout
 * is made the five sections are dressed (`dressCampus`: finishes, skins, heroes, the base pass, the solid / see boxes) and
 * the placements ride on `layout.campusArt` for the renderer; without, the greybox exactly as before.
 */
export function buildCampus(b: LevelBuilder, o: { dress: boolean }): MapLayout {
  const ranges: [number, number][] = [];
  // the ground (1 m thick under y 0) and the boundary walls (they set the map's bounds)
  b.floor(0, -7, 140, 154, GROUND, 0, 1);
  b.perimeter(CAMPUS_BOUNDS.minX, CAMPUS_BOUNDS.maxX, CAMPUS_BOUNDS.minZ, CAMPUS_BOUNDS.maxZ, 6, '#2c3033');
  // (campus-greybox P0) each section from its live or v2 parts (`campusSections.ts`, `flags.campusV2`)
  const [p1, p2, p3, p4, p5] = CAMPUS_PARTS as readonly [CampusSectionParts, CampusSectionParts, CampusSectionParts, CampusSectionParts, CampusSectionParts];
  buildSection(b, 0, p1.build, ranges);
  buildSection(b, 1, p2.build, ranges);
  otherBuildings(b);
  buildSection(b, 2, p3.build, ranges);
  buildSection(b, 3, p4.build, ranges);
  buildSection(b, 4, p5.build, ranges);
  const alarms = CAMPUS_ALARMS.map((a) => ({ pos: new Vector3(a.at[0], a.y ?? 0, a.at[1]), yaw: a.yaw, section: a.section }));
  const layout: MapLayout = {
    playerSpawns: p1.spawns,
    // the sections' guards come from the mode, not the rooms
    enemySpawns: [],
    props: [],
    objectives: [],
    pickups: CAMPUS_PARTS.flatMap((p) => p.pickups),
    hideSpots: CAMPUS_PARTS.flatMap((p, k) => inSection(p.hideSpots, k)),
    switches: CAMPUS_PARTS.flatMap((p, k) => inSection(p.switches, k)),
    rooms: CAMPUS_PARTS.flatMap((p) => p.rooms),
    navSeeds: [...p1.navSeeds, ...p2.navSeeds, ...STUB_NAV_SEEDS, ...p3.navSeeds, ...p4.navSeeds, ...p5.navSeeds],
    alarms,
    security: CAMPUS_SECURITY,
    lasers: CAMPUS_PARTS.flatMap((p) => p.lasers),
    laserPanels: CAMPUS_PARTS.flatMap((p) => p.panels),
    // the live board order (S4, S5, S2), then S1 and S3: a new board appends, so the others keep their index
    boards: BOARD_ORDER.flatMap((k) => inSection(CAMPUS_PARTS[k]!.boards, k)),
  };
  if (o.dress) layout.campusArt = dressCampus(b, layout, ranges);
  return layout;
}
