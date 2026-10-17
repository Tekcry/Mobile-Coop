import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import type { Surface } from '../surfaces';
import geo from './deadLineV2.geo.json';

/**
 * Dead Line v2, Area 1 (Cable Lane) greybox (G1). The geometry is generated from the design JSON
 * (`docs/design/map-dead-line-v2.json`) by `scripts/gen-dead-line-v2.mjs` into `deadLineV2.geo.json`: an ordered op list of boxes, ladders,
 * downpipes, doors and windows, plus the rooms, the floor surfaces, the flat debug markers and the teleport points. Nothing here is placed by
 * hand; a test regenerates the file and fails when it is stale. Flat debug light, no lamps, no guards. The old Dead Line (`deadLine.ts`) is untouched.
 * Levels: B -4.4 (cable tunnel), G 0, U 3.3 (lean-to roofs), R 12.6 (A block roof, context).
 */
export const DEAD_LINE_V2_Y = geo.levels as Record<'B' | 'G' | 'U' | 'R', number>;

type Level = keyof typeof DEAD_LINE_V2_Y;
interface BoxOp { t: 'box'; c: number[]; s: number[]; k: string; collide?: boolean; f?: 'noLedge' | 'overhead' }
interface LadderOp { t: 'ladder'; x: number; z: number; y0: number; y1: number; facing: number }
interface PipeOp { t: 'pipeV'; x: number; z: number; y0: number; y1: number; side: number }
interface DoorOp { t: 'door'; x: number; y: number; z: number; w: number; h: number; yaw: number }
interface WindowOp { t: 'window'; c: number[]; w: number; h: number; yaw: number; sill: number }
type Op = BoxOp | LadderOp | PipeOp | DoorOp | WindowOp;
interface Marker { kind: string; id: string; level: Level; x: number; z: number; w: number; d: number; y: number; color: string }
interface SurfaceDef { kind: Surface; minX: number; maxX: number; minZ: number; maxZ: number; top: number }
export interface DebugPointV2 { group: 'Encounter' | 'Checkpoint' | 'Spawn'; id: string; label: string; level: Level; x: number; y: number; z: number }

const STEEL = '#55606a';
const PIPE = '#6d7378';
const OPS = geo.ops as unknown as Op[];
const MARKERS = geo.markers as unknown as Marker[];

/** Where the debug menu teleports to: every encounter start, every checkpoint and every spawn (all from the design JSON). */
export const DEAD_LINE_V2_DEBUG = geo.debug as unknown as DebugPointV2[];
/** Nav surfaces per column (the tunnel, the lane and the lean-to roofs never stack beyond 3; the A block's storeys come with Area 3). */
export const DEAD_LINE_V2_NAV_LAYERS = 5;

/** Replay the generated ops into the builder. */
export function buildDeadLineV2(b: LevelBuilder): void {
  b.perimeter(geo.bounds.minX, geo.bounds.maxX, geo.bounds.minZ, geo.bounds.maxZ, 9, '#5d646b');
  for (const o of OPS) {
    const from = b.boxes.length;
    switch (o.t) {
      case 'box':
        b.box(o.c[0]!, o.c[1]!, o.c[2]!, o.s[0]!, o.s[1]!, o.s[2]!, o.k, 0, 0, o.collide !== false, true);
        break;
      case 'ladder':
        b.ladder(o.x, o.z, o.y0, o.y1, o.facing, STEEL);
        break;
      case 'pipeV':
        b.pipeV(o.x, o.z, o.y0, o.y1, o.side, PIPE);
        break;
      case 'door':
        b.door(o.x, o.y, o.z, o.w, o.yaw, { locked: false, breachable: true, height: o.h });
        break;
      case 'window':
        b.windowAt(o.c[0]!, o.c[1]!, o.c[2]!, o.w, o.h, o.yaw, { sill: o.sill, breakable: true, open: false });
        break;
    }
    if (o.t === 'box' && o.f) b.mark(from, { [o.f]: true });
  }
  for (const s of geo.surfaces as unknown as SurfaceDef[]) b.surface(s.kind, s.minX, s.maxX, s.minZ, s.maxZ, s.top);
  // flat debug markers: a pad on the floor, a post over it for the point markers (never collide)
  for (const m of MARKERS) {
    b.box(m.x, m.y + 0.04, m.z, m.w, 0.08, m.d, m.color, 0, 0, false, true);
    if (m.kind !== 'hide') b.box(m.x, m.y + 0.8, m.z, 0.12, 1.5, 0.12, m.color, 0, 0, false, true);
  }
}

function rooms(): RoomDef[] {
  return geo.rooms.map((r) => ({ id: r.id, name: r.name, minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, minY: r.minY, maxY: r.maxY }));
}

export const deadLineV2: MapDef = {
  id: 'dead-line-v2',
  name: 'Dead Line v2 (Area 1 greybox)',
  description: 'Mission 1 v2, Area 1 at night: Cable Lane under the viaduct, the lean-to roofs, the cable tunnel and the substation. Greybox, flat light, no guards.',
  modes: ['sandbox', 'infiltration'],
  navLayers: DEAD_LINE_V2_NAV_LAYERS,
  theme: {
    sky: '#0b111b',
    horizon: '#2b3440',
    ground: '#5f6364',
    fogStart: 120,
    fogEnd: 400,
    sunDir: [0.35, -1, 0.55],
    sunIntensity: 0.5,
    ambient: 0.9,
    lightLevel: 0.95,
    faction: 'urban',
  },
  build(b: LevelBuilder): MapLayout {
    buildDeadLineV2(b);
    const spawns = (geo.markers as unknown as Marker[]).filter((m) => m.kind === 'spawn');
    return {
      // the van drops the team north of the railway bridge: facing south, towards the bridge and the lane mouth
      playerSpawns: spawns.map((s) => ({ pos: new Vector3(s.x, 0, s.z), yaw: Math.PI })),
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      rooms: rooms(),
      debugPoints: DEAD_LINE_V2_DEBUG.map((p) => ({ group: p.group, id: p.id, label: p.label, pos: new Vector3(p.x, p.y, p.z), yaw: p.group === 'Spawn' ? Math.PI : Math.PI / 2 })),
    };
  },
};
