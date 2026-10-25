import type { SectorBolt, SectorDef } from '../../game/sectors';
import type { SecurityData } from '../../security/data';
import type { LaserDef } from '../../game/jammer';
import { S1_BOLTS } from './warehouseS1';
import { S2_BOLTS, S2_THROUGH_BAY } from './warehouseS2';
import { S3_BOLTS, S3_COOP } from './warehouseS3';
import type { LaserPanelDef } from '../../game/laserPanels';

/** (sector-fixes-r2) A section file's team doors with their door width (the unbolt reach spans the door, `inBoltReach`). */
const withW = (bolts: readonly { at: readonly [number, number]; side: readonly [number, number] }[], w: number): SectorBolt[] => bolts.map((b) => ({ ...b, w }));

/**
 * Sector Ops on the Warehouse (feature/sector-ops A12, M7, M8): three sections in a row from the Warehouse's own
 * geometry, sealed from each other but for their connector rooms (`warehouseOps.ts` builds the walls, rooms and the
 * M8 cover). Pure data: the mode (`sectorMode.ts`) spawns the guards, places the objectives and runs the connectors.
 *
 * M8 (Michael: "room to maneuver and take them out silently away from others"): every guard holds its own pocket
 * (an aisle half, a room, a lane behind the trailer) and has a `takedownSpot` that no other guard's post or route sees
 * within 15 m at eye height (Vitest `sectors.test.ts` traces it through the level's pieces). Room comes before the
 * count (A13): 8, 8 and 9 guards. Every section has three routes to its objective and on to its exit.
 */
export const WAREHOUSE_SECTORS: SectorDef[] = [
  {
    id: 'service',
    name: 'Goods-in and trade offices',
    // the yard's dark south-west corner (A4); the DVR in the security office is the objective (SPEC 2.1 / 5.6)
    start: { x: -20.0, y: 0, z: -24.6, yaw: 0.5 },
    // weapons crate (E9): the yard south wall, strip to the yard
    crate: { at: [-21.8, 0, -25], yaw: 0 },
    objective: { kind: 'download', label: 'Download the security DVR', x: 3.95, y: 0, z: -16.0, yaw: Math.PI / 2 },
    connector: {
      label: 'Into the fire lobby',
      box: [-16.25, -8.55, -12.75, -6.25],
      nearAt: [-14.5, -8.8],
      farAt: [-14.5, -6],
      checkpoint: { x: -14.5, y: 0, z: -7.2, yaw: 0 },
    },
    // Eight guards with jobs (A6, SPEC 2.1); `?sectorGuards=4` takes the first four. Each passes M8 on its timed patrol
    // (isolation in time, A2): none of them needs filler cover.
    guards: [
      // 1 the gate officer: gate control for the 03:00 delivery
      { kind: 'officer', x: 9.0, z: -22.4, yaw: -2.53, takedownSpot: [9.0, -22.4] },
      // 2 the yard patrol: gatehouse to the front entrance, checking the entrance lock and the security window
      { kind: 'grunt', x: 10.5, z: -21.0, yaw: Math.PI, route: [[10.5, -21.0], [-6.5, -19.6]], wait: 3, waits: [4, 4], faces: [Math.PI, 0], takedownSpot: [-6.5, -19.9] },
      // 3 the goods-in checker: staged pallets against the delivery notes (desk, east lane, the office door)
      { kind: 'officer', x: -21.6, z: -15.6, yaw: -Math.PI / 2, route: [[-21.6, -15.6], [-11.2, -15.4], [-19.0, -9.9]], wait: 4, waits: [5, 4, 4], faces: [-Math.PI / 2, 0, 0], takedownSpot: [-11.2, -15.4] },
      // 4 the CCTV operator: the monitors, the corridor, the kettle in the mess (under hatch h2)
      { kind: 'officer', x: 7.3, z: -17.2, yaw: -Math.PI / 2, route: [[7.3, -17.2], [3.6, -12.3], [2.6, -9.9]], wait: 5, waits: [6, 1, 6], faces: [-Math.PI / 2, -Math.PI / 2, 0], takedownSpot: [2.6, -9.9] },
      // 5 the forklift driver: charger to the west lane
      { kind: 'grunt', x: -9.6, z: -9.4, yaw: 0, route: [[-9.6, -9.4], [-18.2, -11.9]], wait: 5, faces: [0, Math.PI], takedownSpot: [-9.6, -9.6] },
      // 6 the smoker: a break in the shelter, waiting for the delivery
      { kind: 'grunt', x: -13.4, z: -20.5, yaw: 0.6, takedownSpot: [-13.4, -20.5] },
      // 7 the clerk: paperwork at the goods-in office window
      { kind: 'grunt', x: -22.6, z: -7.0, yaw: 2.6, takedownSpot: [-22.6, -7.0] },
      // 8 the office patrol: a night tour clocking the two corridor fire doors (starts and is taken at the east end: the west end is in the bay's line of sight, so its isolation window would not survive patrol drift)
      { kind: 'grunt', x: 7.0, z: -12.3, yaw: Math.PI / 2, route: [[7.0, -12.3], [-7.0, -12.3]], wait: 4, faces: [Math.PI / 2, -Math.PI / 2], takedownSpot: [7.0, -12.3] },
    ],
    // alarm reinforcements come in at the vehicle gate
    reinforce: [[5.0, -25.0], [8.0, -25.0]],
    // (sector-fixes-r RT) team doors: bolted from one side (warehouseS1.ts builds the doors locked)
    bolts: withW(S1_BOLTS, 1.2), // the mess back door (warehouseS1.ts MESS_DOOR.w)
    perStage: 2,
    routes: [
      {
        // ground and shadow: crouch under shutter W, the bay, reception, the corridor, the security office, back out the corridor's west door
        name: 'Under the shutter, reception and the corridor',
        pts: [[-20, -24.6], [-19, -20], [-19, -18.9], [-19, -17], [-16, -16.2], [-9, -15.8], [-7.3, -15.8], [-7.2, -14.4], [-4.5, -14.4], [-4.5, -13], [4.4, -13.0], [4.4, -14.5], [4.8, -16], [4.4, -13.0], [-7, -12.3], [-9.2, -12.3], [-10, -10], [-14.5, -10], [-14.5, -9.4], [-14.5, -7.4]],
        obj: 12,
        climbs: [2],
      },
      {
        // high: the drainpipe, the roof, the roof hatch to the plant deck, the security ceiling hatch; back up and west to the smoke vent
        name: 'Drainpipe, roof and the ceiling hatch',
        pts: [[-20, -24.6], [-20.4, -19.6], [-22.4, -18.75], [-22, -17.2, 6], [5, -13.5, 6], [5, -14.9, 3.3], [7.4, -14.6, 3.3], [6.45, -16.3], [4.8, -16], [6.4, -16.5], [7.4, -14.6, 3.3], [5, -14.9, 3.3], [5, -13.5, 6], [-20, -9.6, 6], [-20, -7.4, 3.2], [-15.5, -8.4, 3.2], [-14.5, -9.6], [-14.5, -7.4]],
        obj: 8,
        climbs: [2, 4, 6, 9, 11, 13, 15],
      },
      {
        // service: the lane behind the trailer, the workshop, the catwalk, the office void, the mess hatch, the corridor
        name: 'Behind the trailer, the catwalk and the void',
        pts: [[-20, -24.6], [-12.5, -25.3], [2.8, -25.3], [9.5, -19.2], [11, -18.9], [11, -17.2], [23.4, -12.4], [23.3, -10.4], [22.6, -9.55, 3], [8.6, -9.55, 3], [7, -9.6, 3], [2.6, -9.95, 3], [2.6, -10.2], [2.5, -11.2], [4.4, -13.0], [4.4, -14.5], [4.8, -16], [4.4, -13.0], [-7, -12.3], [-9.2, -12.3], [-11, -10], [-14.5, -9.6], [-14.5, -7.4]],
        obj: 16,
        climbs: [7, 9, 10, 11],
      },
    ],
  },
  {
    id: 'racking',
    name: 'Storage hall',
    start: { x: -14.5, y: 0, z: -7.2, yaw: 0 },
    // weapons crate (E9): the fire lobby west wall, strip into the lobby
    crate: { at: [-15.8, 0, -7.2], yaw: Math.PI / 2 },
    // the high-value cage (SPEC 2.2): the case on the shelving by the west wall; the e2e stand point (x + 0.9) is free floor
    objective: { kind: 'grab', label: 'Take the case from the cage', x: -23.0, y: 0, z: 15.0, yaw: -Math.PI / 2 },
    connector: {
      label: 'Into the office',
      box: [-3.6, 12.4, 1.6, 17.6],
      nearAt: [-4, 14.55],
      farAt: [-0.95, 12],
      sealUnlocks: [[2, 16.05]],
      checkpoint: { x: -1.2, y: 0, z: 14.8, yaw: Math.PI },
    },
    // (BUILD-S2.md 8.3: the checker, driver, stocktaker and tour guard waits, the stocktaker's south end and the tour guard's lane point are the M8 ladder's adjustments; docs/archive/warehouse-s23/step-s2-report.md)
    guards: [
      // 1 the checker (team leader): the staged delivery against the put-away list, along the marshalling lane
      { kind: 'grunt', x: -21.6, z: -5.0, yaw: 0, route: [[-21.6, -5.0], [-9.6, -5.0]], wait: 5, waits: [8, 2], faces: [0, 0], takedownSpot: [-21.6, -5.0] },
      // 2 the reach driver: puts the staged pallets away into A3's north locations
      { kind: 'grunt', x: -11.6, z: 10.5, yaw: Math.PI / 2, route: [[-11.6, 10.5], [-11.6, -4.2]], wait: 5, waits: [8, 7], faces: [Math.PI / 2, Math.PI / 2], takedownSpot: [-11.6, 10.5] },
      // 3 the stocktaker: cycle count of W0 and R1 bays from A1
      { kind: 'officer', x: -21.4, z: 2.0, yaw: -Math.PI / 2, route: [[-21.4, 2.0], [-21.4, 11.0]], wait: 5, waits: [2, 8], faces: [-Math.PI / 2, Math.PI / 2], takedownSpot: [-21.4, 11.0] },
      // 4 the cage officer: keyholder, issues high-value stock at the east gate (static)
      { kind: 'officer', x: -17.0, z: 16.8, yaw: -Math.PI / 2, takedownSpot: [-17.0, 16.8] },
      // 5 the picker: the 06:00 trade orders from R3's east face to the goods-out corner
      { kind: 'grunt', x: -7.4, z: 14.6, yaw: Math.PI, route: [[-7.4, 14.6], [-7.4, 0.5]], wait: 4, waits: [4, 4], faces: [Math.PI / 2, -Math.PI / 2], takedownSpot: [-7.4, 0.5] },
      // 6 the tour guard (a loop): clocks the west fire exit and the C2 lobby door, checks the VNA barrier; paused at (-14.6, 5.5) facing A2
      { kind: 'grunt', x: -23.2, z: 5.5, yaw: -Math.PI / 2, route: [[-23.2, 5.5], [-12.6, 5.5], [-12.6, -3.2], [-12.6, 5.5], [-14.6, 5.5]], wait: 4, waits: [4, 0, 2, 0, 12], faces: [-Math.PI / 2, 0, -2.4, 0, -Math.PI / 2], takedownSpot: [-14.6, 5.5] },
      // 7 the charge hand: night battery change for the reach and picking trucks (static)
      { kind: 'grunt', x: -5.3, z: -5.2, yaw: Math.PI / 2, takedownSpot: [-5.3, -5.2] },
      // 8 the loader: wraps and labels the picked orders for C3, facing the wrapper (static)
      { kind: 'grunt', x: -6.0, z: 16.2, yaw: 0, takedownSpot: [-6.0, 16.2] },
    ],
    // alarm reinforcements: the west fire exit and the charge bay
    reinforce: [[-22.5, 5.5], [-6.2, -5.0]],
    // (sector-fixes-r RT) team doors (warehouseS2.ts)
    bolts: withW(S2_BOLTS, S2_THROUGH_BAY.z1 - S2_THROUGH_BAY.z0),
    perStage: 2,
    routes: [
      {
        // ground and shadow: behind the staged pallets, up A1, over the cage's south fence, out along the cross aisle and the north gangway
        name: 'West behind the pallets, up A1 and over the cage fence',
        pts: [[-14.5, -7.2], [-14.5, -5.4], [-22.1, -5.4], [-22.2, -3.6], [-22.4, 11.2], [-22.4, 12.7], [-22.1, 15.0], [-22.4, 12.7], [-22.4, 11.2], [-21.6, 5.5], [-12.0, 5.5], [-12.0, 15.5], [-5.2, 15.5], [-4.8, 14.55], [-1.0, 15.0]],
        obj: 6,
        climbs: [4, 7],
      },
      {
        // high: the R2N ladder, the rack tops into the cage, out along the sprinkler mains (LR16-W S2: the A3 corner on the strip's rim, the A2 jump from nearer the rack edges, the drop 1 m south along the main)
        name: 'Rack tops into the cage, out along the sprinkler mains',
        pts: [[-14.5, -7.2], [-14.5, -5.4], [-12.0, -5.4], [-12.6, 5.4], [-14.65, 6.3], [-14.65, 7.6, 4.0], [-15.2, 10.0, 4.0], [-18.6, 10.0, 4.0], [-18.75, 13.5, 4.0], [-20.4, 13.5], [-22.1, 15.0], [-22.6, 12.8], [-23.45, 12.7], [-23.45, 11.4, 4.0], [-23.45, 7.4, 4.0], [-23.45, 6.4, 5.0], [-6.2, 6.4, 5.0], [-6.0, 14.2, 5.0], [-6.0, 14.2], [-4.8, 14.55], [-1.0, 15.0]],
        obj: 10,
        climbs: [4, 6, 8, 12, 13, 14, 15, 16, 17],
      },
      {
        // service (VNA): up the VNA aisle, the A2 ladder over the beam, R1N's top, the hang-drop and in at the issue gate (LR16-W S2: the ladder foot at the ladder, R1N's top walked on its centre line, the drop off its north end nearer A2, back past the desk on the pool's rim)
        name: 'Up the VNA aisle, over the beam and in at the issue gate',
        pts: [[-14.5, -7.2], [-14.5, -5.4], [-16.7, -4.0], [-17.1, 13.4], [-18.75, 13.4, 4.0], [-18.75, 14.6, 4.0], [-18.0, 15.5], [-19.2, 16.5], [-20.6, 16.5], [-22.1, 15.0], [-20.6, 16.5], [-19.2, 16.5], [-17.0, 14.9], [-12.0, 15.5], [-5.2, 15.5], [-4.8, 14.55], [-1.0, 15.0]],
        obj: 9,
        climbs: [3, 5],
      },
    ],
  },
  {
    id: 'floor',
    name: 'Assembly hall and mezzanine',
    start: { x: -1.2, y: 0, z: 14.8, yaw: Math.PI },
    // weapons crate (E9): the office west wall, strip into the office
    crate: { at: [-3.2, 0, 16.4], yaw: Math.PI / 2 },
    objective: { kind: 'hack', label: 'Hack the production terminal', x: 22.4, y: 3.3, z: 17.3, yaw: Math.PI / 2 },
    extract: { label: 'Extract by the east fire exit', box: [21.4, -8.5, 23.7, -5.9] },
    // Nine guards with jobs (BUILD-S3.md 6.1, SPEC 2.3), in this order so `?sectorGuards=4` takes the porter (the entry), the loader
    // (the deck), the clerk (the objective) and the tour guard (the exit). Deck guards carry y 3.3.
    guards: [
      // 1 the kit porter: pallet-trucks finished kits from the packing end to C3
      { kind: 'grunt', x: 8.0, z: 9.7, yaw: Math.PI / 2, route: [[8.0, 9.7], [-1.5, 9.8]], wait: 5, waits: [5, 5], faces: [Math.PI / 2, 0], takedownSpot: [-1.5, 9.8] },
      // 2 the deck loader: lifts kit parts in at the pallet gate and stages them on the deck
      { kind: 'grunt', x: 13.5, z: 13.2, y: 3.3, yaw: Math.PI, route: [[13.5, 13.2], [3.0, 13.2]], wait: 5, waits: [5, 4], faces: [Math.PI, 0], takedownSpot: [3.0, 13.2] },
      // 3 the clerk: writes up the shift's job cards at his desk on the production office's north wall (static)
      { kind: 'officer', x: 18.6, z: 17.1, y: 3.3, yaw: 0, takedownSpot: [18.6, 17.1] },
      // 4 the tour guard (a loop): the stair foot, down the plant room's west side, clocks the east fire exit
      { kind: 'grunt', x: 21.5, z: 4.4, yaw: 0, route: [[21.5, 4.4], [14.9, 0.0], [15.0, -6.3], [23.0, -7.9], [15.0, -6.3], [14.9, 0.0]], wait: 4, waits: [4, 0, 0, 5, 0, 0], faces: [0, Math.PI, Math.PI / 2, Math.PI / 2, -Math.PI / 2, Math.PI / 2], takedownSpot: [23.0, -7.9] },
      // 5 the line supervisor: checks the CNC cell, pulls parts from the store for the next kit
      { kind: 'officer', x: 12.5, z: 4.9, yaw: Math.PI, route: [[12.5, 4.9], [17.0, 12.8], [15.6, 14.9], [12.0, 15.0], [15.6, 14.9], [17.0, 12.8]], wait: 5, waits: [5, 0, 0, 4, 0, 0], faces: [Math.PI, 0, -Math.PI / 2, -Math.PI / 2, Math.PI / 2, Math.PI], takedownSpot: [12.0, 15.0] },
      // 6 the fitter: runs the press (static); the press and its three screens hide him
      { kind: 'grunt', x: 7.6, z: 1.0, yaw: -Math.PI / 2, takedownSpot: [7.6, 1.0] },
      // 7 the crane operator: moves dies from the die rack to the press with the pendant
      { kind: 'grunt', x: 7.3, z: -7.5, yaw: 0, route: [[7.3, -7.5], [14.0, -6.8]], wait: 7, waits: [7, 7], faces: [0, Math.PI], takedownSpot: [7.3, -7.5] },
      // 8 the stores officer: issues parts at the cage counter, restocks the back shelves
      { kind: 'officer', x: 4.7, z: -5.0, yaw: 0, route: [[4.7, -5.0], [0.6, -7.6]], wait: 8, waits: [8, 8], faces: [0, Math.PI], takedownSpot: [0.6, -7.6] },
      // 9 the plant engineer: the hourly plant check, the AHU panel, both doors, the valve set
      { kind: 'grunt', x: 19.4, z: -3.0, yaw: Math.PI, route: [[19.4, -3.0], [20.0, 0.6], [14.9, 0.6], [15.0, -3.3]], wait: 6, waits: [6, 2, 2, 2], faces: [Math.PI, 0, -Math.PI / 2, Math.PI / 2], takedownSpot: [19.4, -3.0] },
    ],
    reinforce: [[-2.5, 10.5], [20.8, 6.5], [13, -7.0]],
    // (sector-fixes-r RT) team doors (warehouseS3.ts)
    bolts: withW(S3_BOLTS, S3_COOP.lobbyDoor.w),
    perStage: 3,
    routes: [
      {
        // ground and ledge: along the packing line, up the forklift to the deck, along the deck lip, out over the east bay
        name: 'Along the packing line, the forklift and the deck lip, out over the east bay',
        pts: [[-1.2, 14.8], [-0.95, 12.6], [-0.95, 11.2], [-1.6, 7.6], [10.2, 7.6], [10.4, 12.6], [12.4, 10.8], [13.5, 10.8, 2.2], [13.6, 12.3, 3.3], [16.6, 12.4, 3.3], [17.0, 13.8, 3.3], [17.0, 15.3, 3.3], [23.5, 15.35, 3.3], [23.3, 17.3, 3.3], [23.5, 15.35, 3.3], [17.0, 15.3, 3.3], [17.0, 13.8, 3.3], [20.0, 12.3, 3.3], [20.0, 11.2], [18.6, 4.0], [14.9, -0.3], [14.9, -6.3], [17.8, -6.6], [22.5, -7.2]],
        obj: 13,
        climbs: [6, 7, 8, 17],
      },
      {
        // high: the west strip, the crane walkway and the roofs, along the main to the window
        name: 'The west strip, the crane walkway and the roofs, along the main to the window',
        pts: [[-1.2, 14.8], [-0.95, 12.6], [-0.95, 11.2], [-3.0, 8.2], [-3.0, -6.6], [-3.4, -6.9], [-3.2, -8.0, 3.0], [4.0, -8.0, 3.0], [12.0, -8.0, 3.0], [16.6, -6.6, 3.2], [17.0, -1.4, 3.8], [17.0, -1.4, 5.8], [17.0, -0.5, 5.0], [17.0, 12.4, 5.0], [17.0, 12.4, 3.3], [19.6, 13.9, 3.3], [19.6, 15.2, 3.3], [23.5, 15.35, 3.3], [23.3, 17.3, 3.3], [23.5, 15.35, 3.3], [19.6, 15.2, 3.3], [19.6, 13.9, 3.3], [17.0, 12.4, 3.3], [17.0, 12.4, 5.0], [17.0, -0.5, 5.0], [17.0, -1.4, 5.8], [17.0, -1.4, 3.8], [16.6, -6.6, 3.2], [21.7, -7.2, 3.2], [22.5, -7.2]],
        obj: 18,
        climbs: [5, 9, 10, 11, 12, 13, 15, 20, 22, 23, 24, 25, 26, 28],
      },
      {
        // service (duct): the manager's office, past the press, the plant room and the supply duct
        name: "The manager's office, past the press, the plant room and the supply duct",
        pts: [[-1.2, 14.8], [1.0, 16.05], [3.0, 16.05], [3.2, 13.0], [5.15, 12.6], [5.15, 11.2], [9.6, 10.4], [10.6, 4.0], [10.0, -4.6], [14.9, -3.6], [15.2, -3.3], [16.9, -3.3], [22.4, -1.8], [23.65, 15.42, 3.3], [23.3, 17.3, 3.3], [23.65, 15.3, 3.3], [22.4, -1.8], [16.9, -3.3], [15.2, -3.3], [14.9, -6.3], [17.8, -6.6], [22.5, -7.2]],
        obj: 14,
        climbs: [12, 15],
      },
    ],
  },
];

/**
 * The cameras, by section (`section`: live only while that section is). (sector-fixes C, item 3) Each pitches down to the
 * floor point `aim` m in front of its mount and sees `range` m: a patch of floor and route in front of it, not the
 * ceiling or the far walls.
 */
export const WAREHOUSE_OPS_SECURITY: SecurityData = {
  levels: { ground: 0, mezz: 3.3 },
  devices: [
    { id: 'cam-yard', kind: 'camera', level: 'ground', at: [-8.4, -18.35], y: 3.5, aim: 5, range: 10, facing: 180, sweep: [140, 220], reason: 'Section 1: the entrance and the shutters from the facade', section: 0 },
    { id: 'cam-bay', kind: 'camera', level: 'ground', at: [-23.6, -9.4], y: 2.8, aim: 6, range: 12, facing: 135, sweep: [110, 165], reason: 'Section 1: the west lane and the crawl landing in the bay', section: 0 },
    { id: 'cam-rack-sw', kind: 'camera', level: 'ground', at: [-23.6, -5.6], y: 2.8, aim: 6, range: 12, facing: 15, sweep: [0, 40], reason: 'Section 2: up the west aisle', section: 1 },
    { id: 'cam-rack-ne', kind: 'camera', level: 'ground', at: [-4.4, 17.6], y: 2.8, aim: 6, range: 12, facing: 255, sweep: [235, 285], reason: 'Section 2: the north gangway to the office door', section: 1 },
    { id: 'cam-floor', kind: 'camera', level: 'ground', at: [23.6, 1.2], y: 3.5, aim: 7, range: 14, facing: 260, sweep: [230, 290], reason: 'Section 3: the east bay and the plant room doors', section: 2 },
    { id: 'cam-stairs', kind: 'camera', level: 'ground', at: [23.6, 11.6], y: 2.6, aim: 6, range: 12, facing: 225, sweep: [200, 250], reason: 'Section 3: the stair and the parts store front', section: 2 },
    { id: 'cam-mezz', kind: 'camera', level: 'mezz', at: [-3.6, 17.6], y: 2.4, aim: 6, range: 12, facing: 100, sweep: [80, 120], reason: 'Section 3: along the mezzanine deck from its west end', section: 2 },
  ],
};

/** The laser bands, by section: the workshop and the plant deck (1), the VNA aisle (2), the deck's stair head and the line across its west half (3). */
export const WAREHOUSE_OPS_LASERS: LaserDef[] = [
  { id: 'laser-workshop', x1: 9.8, z1: -17.7, x2: 9.8, z2: -9.1, ys: [0.35, 0.9, 1.45], label: 'Workshop laser', section: 0 },
  { id: 'laser-deck', x1: -1.0, z1: -17.7, x2: -1.0, z2: -13.95, ys: [0.35, 0.9, 1.45], floorY: 3.3, label: 'Plant deck laser', section: 0 },
  { id: 'laser-north-aisle', x1: -17.55, z1: 14.8, x2: -15.85, z2: 14.8, ys: [0.35, 0.9, 1.45], label: 'VNA aisle sensor', section: 1 },
  { id: 'laser-deck-stairs', x1: 22.1, z1: 12.3, x2: 23.3, z2: 12.3, ys: [0.35, 0.9, 1.45], floorY: 3.3, label: 'Stair head laser', section: 2 },
  { id: 'laser-deck-west', x1: 15.5, z1: 12.05, x2: 15.5, z2: 17.85, ys: [0.35, 0.9, 1.45], floorY: 3.3, label: 'Deck laser', section: 2 },
];

/**
 * (sector-fixes P, item 6) The lasers' power panels, by section: each near its band but out of plain sight and hard to
 * reach; the jammer cuts every band a panel powers (`game/laserPanels.ts`). `tests/laserPanels.test.ts` traces each one
 * through the level's pieces: hidden from the floor round its band, jammable from the vantage named here.
 * - workshop: in the office void (the crawl over the corridor), on its north wall 4.5 m in from the catwalk opening.
 *   The void's east wall hides it from the workshop floor; it is jammed from the catwalk (the east ladder) through the
 *   opening, about (10.5, 3.0, -9.55), or from inside the void.
 * - plant deck: in the 0.75 m slot behind the AHU, on the facade's inner face. The AHU hides it from the open deck; it
 *   is jammed round the corner from the deck's south-west corner, about (-3.6, 3.3, -17.2), west of the band
 *   (re-merge with sector-fixes R: just west of R1's plant-room sill, x -3.2 to -2.0, which took the old spot).
 * - VNA aisle: on top of R2N's north end (4 m up). The rack hides it from the aisle and the gangway; it is jammed from
 *   R1N's top across the aisle (its ladder at the aisle's north end), about (-18.75, 4.0, 12.5).
 * - mezzanine deck (both deck bands): under the deck, low on the north wall behind the parts store's back shelving
 *   row. The deck and the shelving hide it; it is jammed along the slot behind the row from under the deck's east
 *   half, about (19, 0, 17.4).
 */
export const WAREHOUSE_OPS_PANELS: LaserPanelDef[] = [
  { id: 'panel-workshop', lasers: ['laser-workshop'], x: 3.5, y: 3.5, z: -8.95, yaw: Math.PI, section: 0, label: 'Workshop laser power' },
  { id: 'panel-deck', lasers: ['laser-deck'], x: 2.5, y: 4.3, z: -17.85, yaw: 0, section: 0, label: 'Plant deck laser power' },
  { id: 'panel-vna', lasers: ['laser-north-aisle'], x: -14.9, y: 4.33, z: 14.3, yaw: -Math.PI / 2, section: 1, label: 'VNA aisle sensor power' },
  { id: 'panel-mezz', lasers: ['laser-deck-stairs', 'laser-deck-west'], x: 12, y: 1.4, z: 18, yaw: Math.PI, section: 2, label: 'Deck lasers power' },
];

/**
 * The alarm panels, by section (fix round, checker item 1): a guard can raise only the live section's panel (the others
 * are off). Sections 1 and 3 keep the Warehouse's two panels on the x -4 wall (the dock side, the floor side); section 2
 * gets a panel on the same wall's storage-hall side, at the east gangway's south half. `at` [x, z], `yaw` faces
 * out of the wall into the section.
 */
export const WAREHOUSE_OPS_ALARMS: { at: [number, number]; yaw: number; section: number }[] = [
  { at: [-4.15, -8.2], yaw: -Math.PI / 2, section: 0 },
  { at: [-4.15, 1], yaw: -Math.PI / 2, section: 1 },
  { at: [-3.85, 6], yaw: Math.PI / 2, section: 2 },
];

