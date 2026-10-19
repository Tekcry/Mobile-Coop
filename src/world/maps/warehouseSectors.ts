import type { SectorDef } from '../../game/sectors';
import type { SecurityData } from '../../security/data';
import type { LaserDef } from '../../game/jammer';

/**
 * Sector Ops on the Warehouse (feature/sector-ops PLAN A1, A2): four Warehouse areas played in order. Difficulty rises
 * sector by sector: more guards, then a camera, then lasers, then more light. 2 + 3 + 3 + 4 guards = the live cap (12)
 * when nobody goes down (a ghost run keeps every guard alive). Pure data: the map copy (`warehouseOps.ts`) adds the
 * devices and lamps, the mode (`sectorMode.ts`) the guards, objectives and exits. First cut: each "connector" is the
 * old exit zone (no room, no doors; its checkpoint is the next sector's start). Slice 2 step 2 rebuilds this data as
 * the three sections with connector rooms (M7).
 */
export const WAREHOUSE_SECTORS: SectorDef[] = [
  {
    id: 'dock',
    name: 'Dock',
    start: { x: -14.5, y: 0, z: -24, yaw: 0 },
    objective: { kind: 'hack', label: 'Hack the dispatch terminal', x: -1, y: 0, z: -14.2, yaw: 0 },
    connector: { label: 'Into the racking aisles', box: [-16, -6.9, -13, -4.6], checkpoint: { x: -14.5, y: 0, z: -5.2, yaw: 0 } },
    guards: [
      { kind: 'grunt', x: -19, z: -10.5, yaw: Math.PI, route: [[-19, -10.5], [-12.5, -8.6], [-16.5, -14.8]], wait: 3 },
      { kind: 'grunt', x: -7.5, z: -15.5, yaw: -2.4 },
    ],
    reinforce: [-14.5, -25.5],
  },
  {
    id: 'racking',
    name: 'Racking',
    start: { x: -14.5, y: 0, z: -5.2, yaw: 0 },
    objective: { kind: 'grab', label: 'Take the case at the far aisle', x: -22.8, y: 0, z: 14.5, yaw: 0 },
    connector: { label: 'Onto the factory floor', box: [-5.4, 7.5, -3, 9.6], checkpoint: { x: -3, y: 0, z: 8.5, yaw: Math.PI / 2 } },
    guards: [
      { kind: 'grunt', x: -18.5, z: 1, yaw: Math.PI },
      { kind: 'grunt', x: -10.5, z: 10, yaw: Math.PI, route: [[-10.5, 14.5], [-10.5, -3.5]], wait: 2 },
      { kind: 'runner', x: -14.5, z: 15.5, yaw: Math.PI },
    ],
    reinforce: [-14.5, -10],
  },
  {
    id: 'floor',
    name: 'Floor',
    start: { x: -3, y: 0, z: 8.5, yaw: Math.PI / 2 },
    objective: { kind: 'download', label: 'Download from the workshop terminal', x: 22.6, y: 0, z: -16.6, yaw: Math.PI },
    connector: { label: 'To the mezzanine stairs', box: [19.8, 4.4, 22.6, 6.4], checkpoint: { x: 21.2, y: 0, z: 5, yaw: 0 } },
    guards: [
      { kind: 'grunt', x: 7.5, z: -1.5, yaw: Math.PI, route: [[7.5, -1.5], [11.5, -6.2], [17, 1], [11.5, 7]] },
      { kind: 'grunt', x: 21, z: -9.9, yaw: -Math.PI / 2, route: [[21, -9.9], [1.5, -9.9]], wait: 4 },
      { kind: 'grunt', x: 20.5, z: -12.5, yaw: Math.PI, route: [[20.5, -12.5], [13, -12.2], [8.5, -16.5]] },
    ],
    reinforce: [18, -24.5],
  },
  {
    id: 'offices',
    name: 'Offices',
    start: { x: 21.2, y: 0, z: 5, yaw: 0 },
    objective: { kind: 'hack', label: "Hack the manager's terminal", x: 5.2, y: 0, z: 16.2, yaw: 0 },
    extract: { label: 'Extract from the east lot', box: [16, -25.5, 21, -21] },
    guards: [
      { kind: 'grunt', x: 13, z: 14.2, y: 2.6, yaw: Math.PI, route: [[13, 14.2], [21.5, 13.1]], wait: 3 },
      { kind: 'sniper', x: 22.5, z: 16.5, y: 2.6, yaw: Math.PI },
      { kind: 'officer', x: -2.5, z: 16.8, yaw: Math.PI },
      { kind: 'heavy', x: 6.2, z: 13.4, yaw: -1.6 },
    ],
    reinforce: [18, -24.5],
  },
];

/** The cameras: one in the racking, two on the floor and workshop, one on the mezzanine deck. */
export const WAREHOUSE_OPS_SECURITY: SecurityData = {
  levels: { ground: 0, mezz: 2.6 },
  devices: [
    { id: 'cam-racking', kind: 'camera', level: 'ground', at: [-23.6, 5.2], y: 2.6, facing: 90, sweep: [50, 130], reason: 'Sector 2: the cross aisle' },
    { id: 'cam-floor', kind: 'camera', level: 'ground', at: [10, -8.45], y: 2.6, facing: 0, sweep: [-40, 40], reason: 'Sector 3: the factory floor' },
    { id: 'cam-workshop', kind: 'camera', level: 'ground', at: [23.6, -11.4], y: 2.6, facing: 225, sweep: [195, 255], reason: 'Sector 3: the workshop benches' },
    { id: 'cam-mezz', kind: 'camera', level: 'mezz', at: [8.6, 17.6], y: 2.4, facing: 120, sweep: [95, 150], reason: 'Sector 4: the mezzanine deck' },
  ],
};

/** The laser bands: two across the service corridor (sector 3), one outside the office door (sector 4). */
export const WAREHOUSE_OPS_LASERS: LaserDef[] = [
  { id: 'laser-corridor-w', x1: 12.5, z1: -10.85, x2: 12.5, z2: -8.95, ys: [0.35, 0.9, 1.45], label: 'Corridor laser' },
  { id: 'laser-corridor-e', x1: 16, z1: -10.85, x2: 16, z2: -8.95, ys: [0.35, 0.9, 1.45], label: 'Corridor laser' },
  { id: 'laser-office', x1: -2.3, z1: 11.6, x2: 0.4, z2: 11.6, ys: [0.35, 0.9, 1.45], label: 'Office laser' },
];

/** Sector 4's tighter light: three more lamp strips lit over the mezzanine and the office approach. */
export const WAREHOUSE_OPS_LAMPS: [number, number][] = [
  [9, 15],
  [18, 9],
  [0, 9],
];
