import type { SectorDef } from '../../game/sectors';

/**
 * Tallow Wharf's sector data (GB0 stub: GB5 replaces it with the four sections W1-W4). One minimal section so `mode=sector`
 * boots: start on the W1 canal steps, an objective in the market, an extraction box on the steps.
 */
export const WHARF_SECTORS: SectorDef[] = [
  {
    id: 'W1',
    name: 'Night market',
    start: { x: 7, y: 0, z: 10, yaw: 0 },
    objective: { kind: 'hack', label: 'Stub objective', x: 20, y: 0, z: 28, yaw: 0 },
    extract: { label: 'Canal steps', box: [6, 6, 12, 14] },
    guards: [],
    reinforce: [[20, 20]],
    perStage: 0,
    routes: [],
  },
];
