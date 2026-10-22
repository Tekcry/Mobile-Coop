import type { SectorDef, SectorGuard } from '../../game/sectors';
import type { SecurityData } from '../../security/data';
import { C1_BOX, S1_DOORS } from './campusS1';

const PI = Math.PI;

/**
 * Saltmarsh Park (`campusOps`) sector data (`docs/sector-redesign/SPEC.md`): index 0 = section 1 in full (the gatehouse,
 * car park and forecourt: 8 armed Larchmont guards, 2 cameras, an alarm panel, the gatehouse PC download, C1); indices 1-4 =
 * STUBS of sections 2-5 (slice 1): one objective and the connector per section, no guards, so the run chains for testing.
 * Pure data; the mode places the guards and runs the connectors, `campusOps.ts` builds the rooms.
 *
 * Walk speeds (m/s) in the cycle arithmetic: a plain route walks at walkSpeed x 1.1 (grunt 0.99, officer 0.935, enforcer 0.88);
 * a timed `loop` at walkSpeed (grunt 0.9, officer 0.85). Each cycle is 25-45 s (`tests/campusS1.test.ts`).
 */

/** Section 1's guards (SPEC "S1" guard table; kinds and weapons as listed: officer = pistolSd, grunt = rifle). */
const S1_GUARDS: SectorGuard[] = [
  // 1 the gate officer: works the barrier, waits for the 03:00 courier; at the reception window, facing west onto the lane
  { kind: 'officer', x: 16, z: -76, yaw: -PI / 2, takedownSpot: [16, -76.4], role: 'gate', zone: 'gatehouse', squad: 0, reason: 'Works the barrier and waits for the 03:00 courier' },
  // 2 the CCTV officer: the monitors at his desk (28 s), the kettle (5 s) every ~39 s; alone at the kettle, facing the counter
  { kind: 'officer', x: 18.3, z: -74.8, yaw: 0, route: [[18.3, -74.8], [18.4, -77.65]], waits: [28, 5], faces: [0, PI], takedownSpot: [18.4, -77.65], role: 'cctv', zone: 'gatehouse', squad: 0, reason: 'Watches the cam-gate and cam-walk monitors; the kettle is on the other side of the room' },
  // 3-4 the car-park pair: a timed loop of the aisle (a 42 s master clock), side by side, facing each other at every stop
  {
    kind: 'grunt',
    x: -29,
    z: -66.2,
    yaw: 0,
    route: [[-29, -66.2], [-21, -66.2], [-21, -63.8], [-29, -63.8]],
    faces: [0, 0, 0, 0],
    loop: { period: 42, leave: [4.5, 18, 25, 38], t0: 0 },
    takedownSpot: [-29, -66.2],
    role: 'patrol',
    zone: 'carpark',
    squad: 1,
    pair: 3,
    reason: 'Two cars were broken into last month: they try door handles along the rows',
  },
  {
    kind: 'officer',
    x: -29,
    z: -65.2,
    yaw: PI,
    route: [[-29, -65.2], [-21, -65.2], [-21, -62.8], [-29, -62.8]],
    faces: [PI, PI, PI, PI],
    loop: { period: 42, leave: [4.5, 18, 25, 38], t0: 0 },
    takedownSpot: [-29, -65.2],
    role: 'patrol',
    zone: 'carpark',
    squad: 1,
    pair: 2,
    reason: 'Walks the rows with the grunt, as the break-in follow-up',
  },
  // 5 the doorman (K1, M12): posted under the canopy at the C1 badge door, facing south onto the walkway
  { kind: 'officer', x: -20, z: -35, yaw: PI, takedownSpot: [-20, -34.7], role: 'posted', zone: 'c1', squad: 2, reason: 'Badge check at the only staff door' },
  // 6 the smoker: on his break in the smoking shelter, facing the car park
  { kind: 'grunt', x: 8, z: -48.5, yaw: PI, takedownSpot: [8, -47.6], role: 'smoker', zone: 'smoking', squad: 2, reason: 'On his break; he can see the car park from the shelter' },
  // 7 the fence patrol: the west fence <-> the bin store mouth, 41 s; dark at the bin-store end; comes to the feeder board if it is cut
  { kind: 'grunt', x: -38, z: -66, yaw: PI, route: [[-38, -66], [-34, -50]], waits: [4, 4], faces: [PI, 0], takedownSpot: [-34, -50.6], role: 'patrol', zone: 'perimeter', squad: 3, reason: 'Fence-line check after the break-ins' },
  // 8 the delivery sentry: a sweep at the dock door, +-60 degrees, 12 s each way
  { kind: 'grunt', x: -34, z: -41.6, yaw: PI - 1.05, route: [[-34, -41.6], [-32, -41.6]], waits: [12, 12], faces: [PI - 1.05, PI + 1.05], takedownSpot: [-33, -42.2], role: 'sentry', zone: 'dock', squad: 3, reason: 'Waits for the courier with a cage trolley' },
];

/**
 * (M12, K1) Posted-guard data until guard-ai's `post` block lands on `SquadSlot`: keyed `s<section>#<guard, 1-based>`. It
 * moves onto the slot when guard-ai's `post` lands. `leash` m from the post, `guards` the choke it holds.
 */
export const CAMPUS_POSTS: Record<string, { leash: number; highSecurity?: boolean; guards: string }> = {
  's1#5': { leash: 5, guards: 'c1-door' },
};

/** The cameras (range 8-12, `aim` on the protected floor point, a `reason`); live only in their own section. */
export const CAMPUS_SECURITY: SecurityData = {
  levels: { ground: 0 },
  devices: [
    // fixed, faces south down the lane: the verge and the rear window are behind it
    { id: 'cam-gate', kind: 'camera', level: 'ground', at: [11, -77.9], y: 3.0, aim: 6, range: 10, facing: 180, reason: 'S1: the barrier and the gatehouse door (the insurer asks for an ANPR / tailgating camera)', section: 0 },
    // under the canopy soffit: sweeps 40 degrees south-west to south, 8 m out; cannot see the canopy top
    { id: 'cam-walk', kind: 'camera', level: 'ground', at: [-17, -34.5], y: 3.4, aim: 8, range: 10, facing: 205, sweep: [185, 225], reason: 'S1: the walkway from the car park to the staff door', section: 0 },
  ],
};

/** The alarm panels by section (only the live section's works): the gatehouse's, by its door, facing into the room. */
export const CAMPUS_ALARMS: { at: [number, number]; yaw: number; section: number }[] = [{ at: [15.0, -73.3], yaw: PI, section: 0 }];

/** A one-route stub: start -> the objective -> the exit. */
const stubRoute = (name: string, from: [number, number], obj: [number, number], out: [number, number]): SectorDef['routes'] => [{ name, pts: [from, obj, out], obj: 1 }];

/**
 * Section 1 in full and the S2-S5 stubs. The stubs sit in the greybox shells `campusOps.ts` builds; their connectors
 * are ground-level rooms between the shells (the glazed bridge C2 is on L1 in the SPEC: a later slice), the stub
 * objectives are plain grabs.
 */
export const CAMPUS_SECTORS: SectorDef[] = [
  {
    id: 's1',
    name: 'Gatehouse and car park',
    start: { x: 24, y: 0, z: -79, yaw: 0 },
    // download (10 s, within 4 m) at the gatehouse PC, through the open rear window from the dark verge: opens C1 (the cloned courier badge).
    // (builder L2) The SPEC's (18.5, -76) is 1.95 m from where a player stands at the window (the wall face x 20.15 + the 0.3 body):
    // the default interact reach is 1.8 (`Interactables.nearest`), so the download could not be started from the verge. The PC sits
    // on its desk at x 19.3 (0.8 m east, 1.15 m from the window).
    objective: { kind: 'download', label: "Download tonight's visitor list and the courier badge template", x: 19.3, y: 0, z: -76, yaw: PI / 2 },
    connector: {
      label: 'Into the staff entrance',
      box: [C1_BOX[0], C1_BOX[1], C1_BOX[2], C1_BOX[3]],
      nearAt: [S1_DOORS.c1Near[0], S1_DOORS.c1Near[1]],
      farAt: [S1_DOORS.c1Far[0], S1_DOORS.c1Far[1]],
      // E12: the delivery yard's dock door opens when C1 seals (a side door of section 2)
      sealUnlocks: [[S1_DOORS.dock[0], S1_DOORS.dock[1]]],
      checkpoint: { x: -20, y: 0, z: -32, yaw: 0 },
    },
    guards: S1_GUARDS,
    // stage 1: the lane and the dock door
    reinforce: [[11, -79], [-33, -41]],
    perStage: 2,
    dogs: 0,
    routes: [
      {
        // stealth (solo): the verge, the rear window, the dark east fence, behind the smoking shelter, the facade planters, the doorman from the east
        name: 'The verge, the rear window and the east side',
        pts: [[24, -79], [22.2, -76.2], [21, -70], [21, -58], [24, -52], [8, -45.2], [2, -37.2], [-12.8, -37.2], [-18.5, -35.1], [-20, -34], [-20, -32]],
        obj: 1,
      },
      {
        // shadow (made): the feeder board cuts the west half, the bin store, the delivery yard, the doorman from the west
        name: 'The feeder board, the bin store and the yard',
        pts: [[24, -79], [22.2, -76.2], [21, -70], [21, -64.5], [-30, -64.5], [-35.2, -64.5], [-35.2, -52], [-31.8, -48], [-31, -53], [-28.5, -50.5], [-26.8, -44], [-28, -41.5], [-24.5, -41.2], [-23.2, -36.5], [-21.6, -35.1], [-20, -34], [-20, -32]],
        obj: 1,
      },
      {
        // high (solo): the yard's caged ladder, the plant roof, the canopy (overwatch), the drop at its east lip, the doorman from the east
        name: 'The caged ladder, the plant roof and the canopy',
        pts: [[24, -79], [22.2, -76.2], [21, -70], [21, -64.5], [-30, -64.5], [-28.5, -50.5], [-26.8, -44], [-30.5, -41.3], [-38, -41.3], [-38, -38.5, 4.4], [-30, -37, 4.4], [-20, -37.5, 4.4], [-15, -36, 4.4], [-13, -37], [-18.6, -35.1], [-20, -34], [-20, -32]],
        obj: 1,
        climbs: [8, 12],
      },
    ],
  },
  // ---- S2-S5 stubs (slice 1): the objective and the connector only; real sections come with slices 2-5
  {
    id: 's2',
    name: 'HQ atrium (stub)',
    start: { x: -20, y: 0, z: -32, yaw: 0 },
    objective: { kind: 'grab', label: 'Reach the BMS terminal (stub)', x: -12, y: 0, z: -20, yaw: 0 },
    connector: {
      label: 'Over the bridge to the labs (stub)',
      box: [4, -16, 10, -12],
      nearAt: [4, -14],
      farAt: [10, -14],
      checkpoint: { x: 7, y: 0, z: -14, yaw: PI / 2 },
    },
    guards: [],
    reinforce: [[-12, -22]],
    perStage: 2,
    routes: stubRoute('Stub', [-20, -32], [-12, -20], [7, -14]),
  },
  {
    id: 's3',
    name: 'Lab block (stub)',
    start: { x: 7, y: 0, z: -14, yaw: PI / 2 },
    objective: { kind: 'grab', label: 'Take the prototype board (stub)', x: 24, y: 0, z: -14, yaw: 0 },
    connector: {
      label: 'Along the dock link (stub)',
      box: [22, 0, 26, 16],
      nearAt: [24, 0],
      farAt: [24, 16],
      checkpoint: { x: 24, y: 0, z: 8, yaw: 0 },
    },
    guards: [],
    reinforce: [[24, -12]],
    perStage: 2,
    routes: stubRoute('Stub', [7, -14], [24, -14], [24, 8]),
  },
  {
    id: 's4',
    name: 'Data hall (stub)',
    start: { x: 24, y: 0, z: 8, yaw: 0 },
    objective: { kind: 'grab', label: 'Copy the build logs (stub)', x: 24, y: 0, z: 30, yaw: 0 },
    connector: {
      label: 'Along the colonnade (stub)',
      box: [-26, 26, -10, 32],
      nearAt: [-10, 29],
      farAt: [-26, 29],
      checkpoint: { x: -18, y: 0, z: 29, yaw: -PI / 2 },
    },
    guards: [],
    reinforce: [[24, 22]],
    perStage: 2,
    routes: stubRoute('Stub', [24, 8], [24, 30], [-18, 29]),
  },
  {
    id: 's5',
    name: 'The Old House (stub)',
    start: { x: -18, y: 0, z: 29, yaw: -PI / 2 },
    objective: { kind: 'grab', label: 'Take the signing key (stub)', x: -46, y: 0, z: 33, yaw: 0 },
    extract: { label: 'Extract (stub)', box: [-54, 40, -48, 46] },
    guards: [],
    reinforce: [[-40, 30]],
    perStage: 2,
    routes: stubRoute('Stub', [-18, 29], [-46, 33], [-51, 43]),
  },
];
