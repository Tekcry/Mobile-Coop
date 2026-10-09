import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import geo from './deadLine.geo.json';

/**
 * Mission 1 DEAD LINE, the campus greybox (G1). The whole level is generated from the design JSON
 * (`docs/design/map-dead-line.json`) by `scripts/gen-dead-line.mjs` into `deadLine.geo.json`: an ordered op list of boxes,
 * stairs, ladders, doors, windows, fences and ducts, plus the rooms, the flat debug markers and the teleport points. Nothing
 * here is placed by hand; a test regenerates the file and fails when it is stale. Flat debug light, no lamps, no guards.
 * Levels: B -3.3 (basement and tunnel), T -1.4 (trench and culvert, crawl), G 0, U 3.3, R 6.6.
 */
export const DEAD_LINE_Y = geo.levels as Record<'B' | 'T' | 'G' | 'U' | 'R', number>;

type Level = keyof typeof DEAD_LINE_Y;
type Flags = 'noLedge' | 'overhead';
interface BoxOp { t: 'box'; c: number[]; s: number[]; k: string; yaw?: number; pitch?: number; collide?: boolean; visible?: boolean; f?: Flags }
interface StairsOp { t: 'stairs'; x: number; z: number; w: number; len: number; rise: number; steps: number; k: string; yaw: number; y: number; f?: Flags }
interface LadderOp { t: 'ladder'; x: number; z: number; y0: number; y1: number; facing: number }
interface DoorOp { t: 'door'; x: number; y: number; z: number; w: number; yaw: number }
interface WindowOp { t: 'window'; c: number[]; w: number; h: number; yaw: number; sill: number }
interface FenceOp { t: 'fence'; a: number[]; b: number[]; h: number; y: number }
interface Grate { pos: { x: number; y: number; z: number }; nx: number; ny: number; nz: number; where: 'wall' | 'ceiling' | 'floor' }
interface DuctOp { t: 'duct'; path: { x: number; y: number; z: number }[]; entry: Grate; exit: Grate }
type Op = BoxOp | StairsOp | LadderOp | DoorOp | WindowOp | FenceOp | DuctOp;
interface Marker { kind: string; id: string; level: Level; x: number; z: number; w: number; d: number; y: number; color: string }
export interface DebugPoint { group: 'Chapter' | 'Spawn' | 'Objective'; id: string; label: string; level: Level; x: number; y: number; z: number }

const STEEL = '#55606a';
const OPS = geo.ops as unknown as Op[];
const MARKERS = geo.markers as unknown as Marker[];

/** Where the debug menu teleports to: chapter starts, spawns S1-S4, objectives (all from the design JSON). */
export const DEAD_LINE_DEBUG = geo.debug as unknown as DebugPoint[];

/** Replay the generated ops into the builder. */
export function buildDeadLine(b: LevelBuilder): void {
  b.perimeter(geo.bounds.minX, geo.bounds.maxX, geo.bounds.minZ, geo.bounds.maxZ, 9, '#5d646b');
  for (const o of OPS) {
    const from = b.boxes.length;
    switch (o.t) {
      case 'box':
        b.box(o.c[0]!, o.c[1]!, o.c[2]!, o.s[0]!, o.s[1]!, o.s[2]!, o.k, o.yaw ?? 0, o.pitch ?? 0, o.collide !== false, o.visible !== false);
        break;
      case 'stairs':
        b.stairs(o.x, o.z, o.w, o.len, o.rise, o.steps, o.k, o.yaw, o.y);
        break;
      case 'ladder':
        b.ladder(o.x, o.z, o.y0, o.y1, o.facing, STEEL);
        break;
      case 'door':
        b.door(o.x, o.y, o.z, o.w, o.yaw, { locked: false, breachable: true });
        break;
      case 'window':
        b.windowAt(o.c[0]!, o.c[1]!, o.c[2]!, o.w, o.h, o.yaw, { sill: o.sill, breakable: true, open: false });
        break;
      case 'fence':
        b.fence(o.a[0]!, o.a[1]!, o.b[0]!, o.b[1]!, o.h, o.y);
        break;
      case 'duct':
        b.duct(o.path, o.entry, o.exit);
        break;
    }
    if ((o.t === 'box' || o.t === 'stairs') && o.f) b.mark(from, { [o.f]: true });
  }
  // flat debug markers: a pad on the floor, a post over it for the point markers (never collide)
  for (const m of MARKERS) {
    b.box(m.x, m.y + 0.04, m.z, m.w, 0.08, m.d, m.color, 0, 0, false, true);
    if (m.kind !== 'hide') b.box(m.x, m.y + 0.8, m.z, 0.12, 1.5, 0.12, m.color, 0, 0, false, true);
  }
}

function rooms(): RoomDef[] {
  return geo.rooms.map((r) => ({ id: r.id, name: r.name, minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, minY: r.minY, maxY: r.maxY }));
}

export const deadLine: MapDef = {
  id: 'dead-line',
  name: 'Dead Line (campus greybox)',
  description: 'Mission 1 campus at night, generated from the design JSON: the lane yard, coke yard, service tunnel, plant basement, switch hall, upper floors, cage and roof. Greybox, flat light, no guards.',
  modes: ['sandbox'],
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
    buildDeadLine(b);
    const spawns = (geo.markers as unknown as Marker[]).filter((m) => m.kind === 'spawn');
    return {
      playerSpawns: spawns.map((s) => ({ pos: new Vector3(s.x, 0, s.z), yaw: Math.PI / 2 })),
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      rooms: rooms(),
      debugPoints: DEAD_LINE_DEBUG.map((p) => ({ group: p.group, id: p.id, label: p.label, pos: new Vector3(p.x, p.y, p.z), yaw: Math.PI / 2 })),
    };
  },
};
