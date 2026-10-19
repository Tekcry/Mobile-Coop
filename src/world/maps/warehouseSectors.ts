import type { SectorDef } from '../../game/sectors';
import type { SecurityData } from '../../security/data';
import type { LaserDef } from '../../game/jammer';

/**
 * Sector Ops on the Warehouse (feature/sector-ops A12, M7, M8): three sections in a row from the Warehouse's own
 * geometry, sealed from each other but for their connector rooms (`warehouseOps.ts` builds the walls, rooms and the
 * M8 cover). Pure data: the mode (`sectorMode.ts`) spawns the guards, places the objectives and runs the connectors.
 *
 * M8 (Michael: "room to maneuver and take them out silently away from others"): every guard holds its own pocket
 * (an aisle half, a room, a lane behind the trailer) and has a `takedownSpot` that no other guard's post or route sees
 * within 15 m at eye height (Vitest `sectors.test.ts` traces it through the level's pieces). Room comes before the
 * count (A13): 10, 10 and 11 guards. Every section has three routes to its objective and on to its exit.
 */
export const WAREHOUSE_SECTORS: SectorDef[] = [
  {
    id: 'service',
    name: 'Service entrance',
    start: { x: -14.5, y: 0, z: -24, yaw: 0 },
    objective: { kind: 'download', label: 'Download from the workshop terminal', x: 22.6, y: 0, z: -16.6, yaw: Math.PI },
    connector: {
      label: 'Into the dock vestibule',
      box: [-15.75, -8.75, -13.25, -6.25],
      nearAt: [-14.5, -9],
      farAt: [-14.5, -6],
      checkpoint: { x: -14.5, y: 0, z: -7.2, yaw: 0 },
    },
    guards: [
      // the yard: the lanes behind the container and the trailer, the gatehouse in the east lot
      { kind: 'grunt', x: 6, z: -25.2, yaw: Math.PI / 2, route: [[6, -25.2], [12, -25.2]], wait: 3, takedownSpot: [6, -25] },
      { kind: 'grunt', x: -6.5, z: -25, yaw: Math.PI / 2, route: [[-6.5, -25], [0, -25]], wait: 4, takedownSpot: [-6.5, -25] },
      { kind: 'grunt', x: 23, z: -20.8, yaw: -Math.PI / 2, takedownSpot: [23.5, -21.5] },
      // the dock: west bay, the east roller door, the north-east corner by the corridor
      { kind: 'grunt', x: -21, z: -15.5, yaw: 0, route: [[-21, -15.5], [-21, -10]], wait: 3, takedownSpot: [-21, -13] },
      { kind: 'heavy', x: -7.5, z: -15.5, yaw: -2.4, takedownSpot: [-8, -15.5] },
      { kind: 'grunt', x: -6.5, z: -7.5, yaw: -Math.PI / 2, route: [[-6.5, -7.5], [-11, -7.5]], wait: 3, takedownSpot: [-11, -7.5] },
      // dispatch, the workshop (both ends of the tool rack), the corridor's east end
      { kind: 'officer', x: 2.5, z: -16.5, yaw: -1.2, takedownSpot: [2.5, -16.5] },
      { kind: 'enforcer', x: 11, z: -16.8, yaw: 0.6, takedownSpot: [11.5, -17.5] },
      { kind: 'grunt', x: 20.5, z: -12.5, yaw: Math.PI, route: [[20.5, -12.5], [20.5, -16]], wait: 3, takedownSpot: [20, -16] },
      { kind: 'grunt', x: 21, z: -9.9, yaw: -Math.PI / 2, route: [[21, -9.9], [18.5, -9.9]], wait: 4, takedownSpot: [18.5, -10] },
    ],
    reinforce: [[-20, -24.5], [13, -19.5]],
    perStage: 2,
    routes: [
      {
        name: 'Dock and corridor',
        pts: [[-14.5, -24], [-10.5, -19.5], [-10.5, -16], [-5, -13], [-5, -9.9], [-3, -10.3], [13.5, -10.3], [14.55, -11.8], [22.3, -11.8], [22.3, -13.5], [22.3, -11.8], [14.55, -11.8], [14.55, -10.3], [-3, -10.3], [-4.6, -9.9], [-5.2, -8.4], [-12.4, -8.4], [-12.4, -9.6], [-14.5, -9.6], [-14.5, -7.5]],
        obj: 9,
      },
      {
        name: 'Yard, workshop door, out through dispatch',
        pts: [[-14.5, -24], [-10, -20.2], [16, -20.2], [17.55, -19.2], [17.55, -17], [17.6, -13.3], [22.3, -13.5], [17.6, -13.3], [8, -13.5], [6.6, -15.45], [5.4, -15.45], [3, -15], [1, -13.6], [-3, -14], [-5, -14.45], [-11.8, -14.2], [-12.2, -12.4], [-12.4, -9.6], [-14.5, -9.6], [-14.5, -7.5]],
        obj: 6,
      },
      {
        name: 'Roof walkway, rappel to the dispatch window, out the workshop window',
        pts: [[-14.5, -24], [-21.6, -18.8], [-21.6, -16, 6.275], [1.2, -16, 6.275], [1.2, -18.8], [1.2, -16.5], [5.4, -15.45], [6.6, -15.45], [8, -13.5], [17.6, -13.3], [22.3, -13.5], [13.5, -13.5], [11.5, -16.5], [11.5, -19], [-10.5, -19.5], [-10.5, -16], [-11.8, -14.2], [-12.2, -12.4], [-12.4, -9.6], [-14.5, -9.6], [-14.5, -7.5]],
        obj: 10,
        climbs: [1, 2, 3, 4, 12],
      },
    ],
  },
  {
    id: 'racking',
    name: 'Racking aisles',
    start: { x: -14.5, y: 0, z: -7.2, yaw: 0 },
    objective: { kind: 'grab', label: 'Take the case at the far aisle', x: -22.8, y: 0, z: 14.5, yaw: 0 },
    connector: {
      label: 'Into the office',
      box: [-3.6, 12.4, 1.6, 17.6],
      nearAt: [-4, 14.55],
      farAt: [-0.95, 12],
      sealUnlocks: [[2, 16.05]],
      checkpoint: { x: -1.2, y: 0, z: 14.8, yaw: Math.PI },
    },
    guards: [
      // the west aisle either side of its chicane (the case is at its north end)
      { kind: 'grunt', x: -22.2, z: -1.8, yaw: Math.PI, route: [[-22.2, -1.8], [-22.2, -3.2]], wait: 4, takedownSpot: [-22, -3] },
      { kind: 'grunt', x: -21.6, z: 3, yaw: 0, route: [[-21.6, 3], [-21.6, 9], [-22, 13]], wait: 3, takedownSpot: [-22, 13] },
      // the dead-end aisle halves either side of the loads parked in the cross aisle
      { kind: 'grunt', x: -18.5, z: 3, yaw: Math.PI, route: [[-18.5, 3], [-18.5, -3.5]], wait: 3, takedownSpot: [-18.5, -3.5] },
      { kind: 'runner', x: -18.5, z: 7.2, yaw: 0, route: [[-18.5, 7.2], [-18.5, 15.5]], wait: 3, takedownSpot: [-18.5, 7.5] },
      { kind: 'grunt', x: -14.5, z: 10.5, yaw: Math.PI, route: [[-14.5, 10.5], [-14.5, 7]], wait: 4, takedownSpot: [-14.5, 7] },
      { kind: 'grunt', x: -10.5, z: 3, yaw: Math.PI, route: [[-10.5, 3], [-10.5, -3.5]], wait: 3, takedownSpot: [-10.5, -3.5] },
      { kind: 'enforcer', x: -10.5, z: 7.2, yaw: 0, route: [[-10.5, 7.2], [-10.5, 15.5]], wait: 3, takedownSpot: [-10.5, 7.5] },
      // the east aisle either side of its stack, and the north aisle
      { kind: 'grunt', x: -6.4, z: -3.2, yaw: 0, route: [[-6.4, -3.2], [-6.4, 3.6]], wait: 3, takedownSpot: [-6.5, -3] },
      { kind: 'heavy', x: -6.2, z: 11, yaw: 0, route: [[-6.2, 11], [-6.2, 16.6]], wait: 4, takedownSpot: [-6, 11] },
      { kind: 'officer', x: -14.5, z: 17.3, yaw: Math.PI, takedownSpot: [-14.5, 16.5] },
    ],
    reinforce: [[-22.6, -5], [-6.2, -5]],
    perStage: 2,
    routes: [
      {
        name: 'West aisle',
        pts: [[-14.5, -7.2], [-14.5, -5.1], [-21.6, -5.1], [-21.6, -1], [-21.6, 0.7], [-23.4, 0.7], [-23.4, 3], [-21.6, 3.4], [-21.6, 7], [-22, 9], [-22, 14.5], [-22, 17.2], [-5.5, 17.2], [-4.8, 14.55], [-1, 15]],
        obj: 10,
      },
      {
        name: 'Centre aisle and the north aisle, out by the south and east aisles',
        pts: [[-14.5, -7.2], [-14.5, -5.1], [-14.5, 8], [-13.6, 10.5], [-13.6, 12.5], [-15.4, 12.5], [-15.4, 17.2], [-21.8, 17.2], [-22, 14.5], [-21.8, 17.2], [-15.4, 17.2], [-15.4, 12.5], [-13.6, 12.5], [-13.6, 10.5], [-14.5, 5.2], [-14.5, -5.1], [-6.2, -5.1], [-4.8, 4], [-5, 11.8], [-6, 12.4], [-6, 14.55], [-4.8, 14.55], [-1, 15]],
        obj: 8,
      },
      {
        name: 'Over the racks',
        pts: [[-14.5, -7.2], [-14.5, -5.1], [-20.5, -4.8], [-20.5, -3.6, 2.8], [-20.5, 4, 2.8], [-20.5, 6.5, 2.8], [-20.5, 16.2, 2.8], [-20.5, 17.2], [-22, 14.5], [-20.5, 17.2], [-20.5, 16.2, 2.8], [-20.5, 11, 2.8], [-16.5, 11, 2.8], [-12.5, 11, 2.8], [-8.5, 11, 2.8], [-8.5, 16.2, 2.8], [-8.5, 17.2], [-4.8, 14.55], [-1, 15]],
        obj: 8,
        climbs: [2, 4, 6, 9, 11, 12, 13, 15],
      },
    ],
  },
  {
    id: 'floor',
    name: 'Factory floor',
    start: { x: -1.2, y: 0, z: 14.8, yaw: Math.PI },
    objective: { kind: 'hack', label: 'Hack the terminal on the mezzanine', x: 14.6, y: 2.6, z: 17.6, yaw: Math.PI },
    extract: { label: 'Extract by the freight lift', box: [21.4, -8.5, 23.7, -5.2] },
    guards: [
      // the stores cage and the plant room (the freight lift), the south bay between them
      { kind: 'officer', x: 1.5, z: -7.5, yaw: -Math.PI / 2, route: [[1.5, -7.5], [0, -4]], wait: 4, takedownSpot: [1.5, -7.5] },
      { kind: 'grunt', x: 22.8, z: -3, yaw: -Math.PI / 2, route: [[22.8, -3], [18.5, -3.5], [18.5, -5.5]], wait: 3, takedownSpot: [18.5, -5.5] },
      { kind: 'grunt', x: 6, z: -7.5, yaw: Math.PI / 2, route: [[6, -7.5], [13, -7.5]], wait: 3, takedownSpot: [7.5, -8] },
      // the west bays either side of the short wall, the east wall, the north strip
      { kind: 'grunt', x: -2.5, z: -1.2, yaw: 0, route: [[-2.5, -1.2], [-2.5, 1.8], [0.5, 1.8]], wait: 3, takedownSpot: [-2.5, -1] },
      { kind: 'runner', x: -2.5, z: 4.5, yaw: 0, route: [[-2.5, 4.5], [3, 6.5]], wait: 4, takedownSpot: [-3, 4.5] },
      { kind: 'heavy', x: 23.1, z: 0.4, yaw: -Math.PI / 2, takedownSpot: [23, 0.5] },
      { kind: 'grunt', x: 13.5, z: 10.3, yaw: Math.PI / 2, route: [[13.5, 10.3], [16.2, 10.3]], wait: 3, takedownSpot: [16, 10.5] },
      // the deck: the west end, the terminal, the sniper over the stairs
      { kind: 'grunt', x: 9.5, z: 13.5, y: 2.6, yaw: Math.PI / 2, route: [[9.5, 13.5], [12.3, 13.5]], wait: 3, takedownSpot: [12, 14] },
      { kind: 'enforcer', x: 16.5, z: 16.3, y: 2.6, yaw: Math.PI, takedownSpot: [15.5, 17] },
      { kind: 'sniper', x: 22.5, z: 16.5, y: 2.6, yaw: Math.PI, takedownSpot: [22.5, 16.5] },
      // the manager's office
      { kind: 'heavy', x: 6.2, z: 13.4, yaw: -1.6, takedownSpot: [6.5, 12.5] },
    ],
    reinforce: [[-2.5, 10.5], [22.5, 6.5], [13, -7.5]],
    perStage: 3,
    routes: [
      {
        name: 'Floor and the stairs, down the zipline',
        pts: [[-1.2, 14.8], [-0.95, 12.6], [-0.95, 11], [3, 10.2], [8.5, 11.6], [10.4, 11.6], [10.4, 10.2], [13, 9.8], [18, 8.6], [21.2, 5.5], [21.2, 12.5, 2.6], [19.2, 13.2, 2.6], [16, 13.2, 2.6], [14.8, 16.7, 2.6], [14.2, 14.1, 2.6], [12.3, 14.1, 2.6], [12, 12.9, 2.6], [12, 1.4], [11.5, -4], [15, -7.95], [16.5, -7.95], [19.5, -8.3], [21.5, -8.3], [22.5, -6.8]],
        obj: 13,
        climbs: [16],
      },
      {
        name: 'Ladder to the deck, out along the pipe',
        pts: [[-1.2, 14.8], [-0.95, 12.6], [-0.95, 11], [3, 10.2], [8.9, 11.4], [8.9, 12.7, 2.6], [11, 14.1, 2.6], [14.5, 14.1, 2.6], [14.8, 16.7, 2.6], [16.2, 13, 2.6], [17, 13.2, 2.6], [17, -0.2], [12, -0.8], [11.5, -4], [15, -7.95], [16.5, -7.95], [19.5, -8.3], [21.5, -8.3], [22.5, -6.8]],
        obj: 8,
        climbs: [4, 10],
      },
      {
        name: "Manager's office and the crates, down the stairs",
        pts: [[-1.2, 14.8], [1, 16.05], [3, 16.05], [3.2, 14.3], [5.15, 13], [5.15, 11], [8, 11.5], [10.4, 11.6], [10.4, 10.2], [12, 9.9], [12, 11.2, 1.4], [12, 12.7, 2.6], [12, 14.1, 2.6], [14.5, 14.1, 2.6], [14.8, 16.7, 2.6], [16, 13.2, 2.6], [19.2, 13.2, 2.6], [21.2, 12.5, 2.6], [21.2, 5.5], [22, 3], [19.3, 2.2], [17.5, -0.8], [12, -0.8], [11.5, -4], [15, -7.95], [16.5, -7.95], [19.5, -8.3], [21.5, -8.3], [22.5, -6.8]],
        obj: 14,
        climbs: [9, 10],
      },
    ],
  },
];

/** The cameras, by section (`section`: live only while that section is). */
export const WAREHOUSE_OPS_SECURITY: SecurityData = {
  levels: { ground: 0, mezz: 2.6 },
  devices: [
    { id: 'cam-dock', kind: 'camera', level: 'ground', at: [-14.5, -17.6], y: 2.6, facing: 0, sweep: [-45, 45], reason: 'Section 1: the dock floor and the vestibule door', section: 0 },
    { id: 'cam-workshop', kind: 'camera', level: 'ground', at: [23.6, -11.4], y: 2.6, facing: 225, sweep: [195, 255], reason: 'Section 1: the workshop terminal', section: 0 },
    { id: 'cam-rack-sw', kind: 'camera', level: 'ground', at: [-23.6, -5.6], y: 2.6, facing: 20, sweep: [0, 45], reason: 'Section 2: up the west aisle', section: 1 },
    { id: 'cam-rack-ne', kind: 'camera', level: 'ground', at: [-4.4, 17.6], y: 2.6, facing: 225, sweep: [195, 255], reason: 'Section 2: the north aisle and the office door', section: 1 },
    { id: 'cam-floor', kind: 'camera', level: 'ground', at: [10, -8.45], y: 2.6, facing: 0, sweep: [-40, 40], reason: 'Section 3: the south bay', section: 2 },
    { id: 'cam-stairs', kind: 'camera', level: 'ground', at: [23.6, 11.6], y: 2.6, facing: 225, sweep: [200, 250], reason: 'Section 3: the stairs and the north strip', section: 2 },
    { id: 'cam-mezz', kind: 'camera', level: 'mezz', at: [8.6, 17.6], y: 2.4, facing: 120, sweep: [95, 150], reason: 'Section 3: the mezzanine deck', section: 2 },
  ],
};

/** The laser bands, by section: the corridor (1), the north aisle (2), the deck's stair and west approaches (3). */
export const WAREHOUSE_OPS_LASERS: LaserDef[] = [
  { id: 'laser-corridor-w', x1: 12.5, z1: -10.85, x2: 12.5, z2: -8.95, ys: [0.35, 0.9, 1.45], label: 'Corridor laser', section: 0 },
  { id: 'laser-corridor-e', x1: 16, z1: -10.85, x2: 16, z2: -8.95, ys: [0.35, 0.9, 1.45], label: 'Corridor laser', section: 0 },
  { id: 'laser-north-aisle', x1: -12.5, z1: 16.7, x2: -12.5, z2: 17.85, ys: [0.35, 0.9, 1.45], label: 'Aisle laser', section: 1 },
  { id: 'laser-deck-stairs', x1: 20.1, z1: 12.5, x2: 22.3, z2: 12.5, ys: [0.35, 0.9, 1.45], floorY: 2.6, label: 'Deck laser', section: 2 },
  { id: 'laser-deck-west', x1: 8.2, z1: 12.6, x2: 12.7, z2: 12.6, ys: [0.35, 0.9, 1.45], floorY: 2.6, label: 'Deck laser', section: 2 },
];

/**
 * The alarm panels, by section (fix round, checker item 1): a guard can raise only the live section's panel (the others
 * are off). Sections 1 and 3 keep the Warehouse's two panels on the x -4 wall (the dock side, the floor side); section 2
 * gets a placeholder panel on the same wall's racking side, at the east aisle's south half. `at` [x, z], `yaw` faces
 * out of the wall into the section.
 */
export const WAREHOUSE_OPS_ALARMS: { at: [number, number]; yaw: number; section: number }[] = [
  { at: [-4.15, -8.2], yaw: -Math.PI / 2, section: 0 },
  { at: [-4.15, 1], yaw: -Math.PI / 2, section: 1 },
  { at: [-3.85, 6], yaw: Math.PI / 2, section: 2 },
];

/** Section 3's brighter light: three more lamp strips lit over the mezzanine and the floor's north strip. */
export const WAREHOUSE_OPS_LAMPS: [number, number][] = [
  [9, 15],
  [18, 9],
  [0, 9],
];
