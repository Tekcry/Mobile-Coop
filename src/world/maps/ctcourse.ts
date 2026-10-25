import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import { LevelBuilder } from '../levelBuilder';
import { FacilityKit } from '../kit/facilityKit';
import { marlowCourseGroups } from '../lighting/marlowCircuits';
import { registerCourse, type BayDef, type CourseDef, type CourseDevice } from '../../game/course/courseDef';
import type { SecurityConsole } from '../../game/course/securityRoom';
import type { SquadSlot } from '../rooms';
import type { CoopLip } from './ctcourseGreybox';
import { buildFacility, type FacilityPart } from './ctcourseSets/facility';
import { buildA1Gate } from './ctcourseSets/a1Gate';
import { buildA2CarriageShed } from './ctcourseSets/a2CarriageShed';
import { buildA3OfficeRange } from './ctcourseSets/a3OfficeRange';
import { buildA4GoodsShed } from './ctcourseSets/a4GoodsShed';
import { buildA5Substation } from './ctcourseSets/a5Substation';
import { buildA6PumpHouse } from './ctcourseSets/a6PumpHouse';
import { buildA7DataHall } from './ctcourseSets/a7DataHall';
import { buildA8Strongroom } from './ctcourseSets/a8Strongroom';
import { armourCameras, pieceCount, pieceDelta, SET_IDS, SET_LINKS, SET_NAME, setBay, SPAWNS, type LightSpot, type PieceCount, type Pt, type SetId, type SetPart, type ShotVantage } from './ctcourseSets/types';

/**
 * Marlow Yard (map `ctcourse`, Course mode; marlow-final, `docs/marlow-final/SPEC.md`): Vellan & Rook's rehearsal centre,
 * eight full-size mock-up sets (A1-A8) joined by seven holding rooms (L1-L7, the course airlocks) under an instructor
 * gallery, ending at the cash dock. This module is the merge (PLAN.md section 2, slice 0d): the facility shell
 * (`ctcourseSets/facility.ts`) and each set's part (`ctcourseSets/<set>.ts`, the `SetPart` contract in
 * `ctcourseSets/types.ts`) become one map layout and one course definition (bays A1-A8, the chain
 * start -> L1 .. L7 -> end, the exit zone in the dock). Reached by `?autostart=ctcourse&mode=course` (not listed).
 * Prototype starting values (G10). The old bunker bays (CT prototype B1, `docs/ct-prototype/CTCOURSE-SPEC.md`) are
 * retired.
 */

/** The set builders in route order (each `build<Set>(b, kit): SetPart`). */
export const SET_BUILDERS: Readonly<Record<SetId, (b: LevelBuilder, kit: FacilityKit) => SetPart>> = {
  a1Gate: buildA1Gate,
  a2CarriageShed: buildA2CarriageShed,
  a3OfficeRange: buildA3OfficeRange,
  a4GoodsShed: buildA4GoodsShed,
  a5Substation: buildA5Substation,
  a6PumpHouse: buildA6PumpHouse,
  a7DataHall: buildA7DataHall,
  a8Strongroom: buildA8Strongroom,
};

/** One build of the map: the layout plus the parts it was merged from and what each part added to the builder. */
export interface CtcourseBuild {
  layout: MapLayout;
  facility: FacilityPart;
  parts: SetPart[];
  /** Builder pieces each part added (the element register count, SPEC 18). */
  counts: { facility: PieceCount; sets: Record<SetId, PieceCount> };
  /** Index ranges [start, end) each set added to `b.boxes` and `b.anchors.all` (the set-box geometry test reads them). */
  ranges: Record<SetId, { boxes: [number, number]; anchors: [number, number] }>;
}

/**
 * (marlow-walk482 X2a) LANTERN's line for the sets where being spotted fails the set (`BayDef.spotFail`): the set restarts
 * from its start. Kept here, not in the set's part, so the set slices never touch this rule.
 */
export const SPOT_FAIL: Partial<Record<SetId, string>> = {
  a2CarriageShed: 'Spotted. Back to the start of the set.',
};

const v3 = (p: Pt): Vector3 => new Vector3(p.x, p.y, p.z);

/** Merge `src` into `dst`, throwing on an id two parts both use (parallel set builders must never collide). */
function into<T>(dst: Record<string, T>, src: Record<string, T>, what: string): void {
  for (const [k, v] of Object.entries(src)) {
    if (k in dst) throw new Error(`ctcourse: ${what} '${k}' is defined twice`);
    dst[k] = v;
  }
}

/** Build the facility and every set into `b` and merge them (the map's `build`). */
export function buildCtcourse(b: LevelBuilder): CtcourseBuild {
  const kit = new FacilityKit(b);
  const c0 = pieceCount(b);
  const facility = buildFacility(b, kit);
  const cf = pieceDelta(c0, pieceCount(b));
  const parts: SetPart[] = [];
  const sets = {} as Record<SetId, PieceCount>;
  const ranges = {} as CtcourseBuild['ranges'];
  for (const id of SET_IDS) {
    const a = pieceCount(b);
    const nb = b.boxes.length;
    const na = b.anchors.all.length;
    const p = SET_BUILDERS[id](b, kit);
    if (p.id !== id) throw new Error(`ctcourse: the ${id} builder returned part '${p.id}'`);
    sets[id] = pieceDelta(a, pieceCount(b));
    ranges[id] = { boxes: [nb, b.boxes.length], anchors: [na, b.anchors.all.length] };
    parts.push(p);
  }
  // light: each set's standby zone (and its upper levels), the facility's (SPEC 7); the holding rooms, the gallery and
  // the dock take the theme's 0.30
  for (const z of [...facility.ambientZones, ...parts.flatMap((p) => p.ambientZones)]) b.ambientZone(z.box[0], z.box[2], z.box[1], z.box[3], z.ambient, z.minY, z.maxY);

  const bays: BayDef[] = parts.map((p) => ({
    id: setBay(p.id),
    entry: SET_LINKS[p.id].entry,
    exit: SET_LINKS[p.id].exit,
    squad: p.bay.squad,
    gates: p.bay.gates,
    radio: p.bay.radio,
    drills: p.bay.drills,
    elements: [],
    ...(p.bay.roles?.length ? { roles: p.bay.roles } : {}),
    stations: p.bay.stations,
    // (section-rating S6, A5) a set with a guard who can see is rated (A1's passive checker is not)
    rated: p.bay.squad.some((s) => !p.squads[s]?.passive),
    title: `${setBay(p.id)} ${SET_NAME[p.id].replace(/^the /, '')}`,
    ...(SPOT_FAIL[p.id] ? { spotFail: SPOT_FAIL[p.id] } : {}),
  }));
  const def: CourseDef = {
    id: 'ctcourse',
    bays,
    airlocks: facility.airlocks,
    objectives: parts.flatMap((p) => p.objectives),
    exitZone: facility.exitZone,
    externalFlags: parts.flatMap((p) => p.externalFlags),
  };
  const doors: Record<string, number> = {};
  into(doors, facility.doors, 'door');
  const devices: Record<string, CourseDevice> = {};
  const squads: Record<string, SquadSlot> = {};
  const anchors: Record<string, number> = {};
  // every circuit the table names (N12, LIGHTING-PLAN 4 step 1): a group left out never reaches the client
  const groups: Record<string, number> = { ...marlowCourseGroups() };
  const consoles: SecurityConsole[] = [];
  for (const p of parts) {
    into(doors, p.doors, 'door');
    into(devices, p.devices, 'device');
    into(squads, p.squads, 'squad slot');
    into(anchors, p.anchors, 'anchor');
    Object.assign(groups, p.groups);
    consoles.push(...p.consoles);
  }
  const all = <T>(f: (p: SetPart) => T[]): T[] => parts.flatMap(f);
  const layout: MapLayout = {
    playerSpawns: SPAWNS.map((s) => ({ pos: new Vector3(s.x, 0, s.z), yaw: s.yaw })),
    enemySpawns: [],
    props: [],
    objectives: [],
    pickups: [],
    medkitWalls: [...facility.medkitWalls, ...all((p) => p.medkitWalls)].map((m) => ({ pos: v3(m.pos), yaw: m.yaw })),
    switches: all((p) => p.switches).map((s) => ({ pos: v3(s.pos), yaw: s.yaw, group: s.group })),
    hideSpots: all((p) => p.hideSpots).map((h) => ({ pos: v3(h) })),
    navSeeds: [...facility.navSeeds, ...all((p) => p.navSeeds)].map(v3),
    debugPoints: [
      ...facility.debugPoints.map((d) => ({ group: 'Facility', id: d.id, label: d.label, pos: v3(d.pos), yaw: d.yaw })),
      ...parts.flatMap((p) => p.debugPoints.map((d) => ({ group: setBay(p.id), id: d.id, label: d.label, pos: v3(d.pos), yaw: d.yaw }))),
    ],
    // (marlow-final S10) A3 on: armoured cameras (`armourCameras`)
    security: { devices: parts.flatMap((p) => armourCameras(p.id, p.cameras)), levels: Object.assign({}, ...parts.map((p) => p.levels ?? {})) as Record<string, number> },
    lasers: all((p) => p.lasers),
    laserPanels: all((p) => p.laserPanels),
    passZones: all((p) => p.passZones),
    scanners: all((p) => p.scanners),
    course: { def, doors, anchors, groups, devices, squads, consoles },
    // (SPEC 13, ENGINE-ANSWERS Q13) each part declares its spaces: halls open, holding rooms and small rooms tight
    camSize: 'open',
    camSpaces: [...facility.camSpaces, ...all((p) => p.camSpaces)],
    kit: kit.layout,
    facilityProps: [...facility.props, ...all((p) => p.props)],
  };
  return { layout, facility, parts, counts: { facility: cf, sets }, ranges };
}

export const ctcourse: MapDef = {
  id: 'ctcourse',
  name: 'Marlow Yard',
  description: "Vellan & Rook's rehearsal centre: eight mock-up sets for two, under the instructors' gallery (prototype).",
  // indoor and windowless (sets need controlled light): no moon, no weather; the 0.30 fill is the lounge, holding rooms
  // and dock (G225), each set's standby zone 0.14 under its circuits (SPEC 7, 13)
  theme: {
    sky: '#050608',
    horizon: '#0b0d10',
    ground: '#2a2d30',
    fogStart: 60,
    fogEnd: 180,
    sunDir: [-0.3, -1, -0.2],
    sunIntensity: 0,
    ambient: 0.3,
    lightLevel: 0.3,
    floor: 'concrete',
    grade: { tint: [1.0, 0.98, 0.96], saturation: 0.8, contrast: 1.08 },
  },
  modes: ['course'],
  // (marlow-final 0e) the kit and props dress every wall on purpose: no generated skirting, conduits or clutter
  detail: false,
  build(b): MapLayout {
    return buildCtcourse(b).layout;
  },
};

/**
 * (N8, the slice 0 check finding 3) One data build at load: the course registers itself so the lobby's "Start at"
 * (`?course=all`) counts its bays before the course has run, and the lists below are read without a game.
 */
const LOAD = buildCtcourse(new LevelBuilder());
registerCourse('ctcourse', LOAD.layout.course!.def);

/** Every planned co-op lip of the map (SPEC 12, LD 11.3): each 0.5 m or more over the solo reach and within the boost. */
export const COOP_LIPS: readonly CoopLip[] = LOAD.parts.flatMap((p) => p.lips);
/** The light-test spots: the facility's and each set's (`tests/ctcourseLight.test.ts`). */
export const LIGHT_SPOTS: Readonly<Record<SetId | 'facility', readonly LightSpot[]>> = Object.fromEntries([['facility', LOAD.facility.lightSpots], ...LOAD.parts.map((p) => [p.id, p.lightSpots] as const)]) as Record<SetId | 'facility', LightSpot[]>;
/** The GPU shot vantages: the facility's and each set's (`scripts/shots-ctcourse.mjs`). */
export const SHOT_VANTAGES: readonly ShotVantage[] = [...LOAD.facility.shotVantages, ...LOAD.parts.flatMap((p) => p.shotVantages)];
