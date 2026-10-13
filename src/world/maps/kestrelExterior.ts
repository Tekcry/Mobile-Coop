/**
 * ON5 (pure, no Babylon): the one copy of the floor finishes and of how the campus file's climb pieces and exterior
 * features (`exterior[]`) build in the walk test, shared by the editor (src/editor/climb.ts, finishes.ts) and the walk
 * test (kestrel.ts `buildDraft`). Nothing here is a rule: the editor decides `climbable` from the reach facts and writes
 * it; this file only turns each piece into the engine's own builder call (LevelBuilder.pipeV, pipeH, fence, duct,
 * stairs, pillar, boxes whose tops give ledges, as the map builders do) or, where the piece is not climbable, plain
 * collision (a box with no ledge).
 */
import { hyp2 } from '../../core/mathx';
import type { Surface } from '../surfaces';
import type { Grate, P3 } from '../anchors';

type Pt2 = readonly [number, number];

/**
 * Floor finishes (ON5 decision 5) and the game's own floor surface each one sounds as (src/world/surfaces.ts
 * `Surface`; the game has six). `tint` is the editor's finish view colour (drawing only).
 */
export interface Finish {
  id: string;
  name: string;
  surface: Surface;
  tint: string;
  src: string;
}

export const FINISHES: readonly Finish[] = [
  { id: 'carpet', name: 'Carpet', surface: 'carpet', tint: '#8e6fc1', src: 'ON5 brief decision 5; game surface carpet' },
  { id: 'vinyl', name: 'Vinyl', surface: 'concrete', tint: '#7fb6d9', src: 'ON5 brief decision 5; the game has no vinyl surface: a hard floor on a slab sounds as concrete' },
  { id: 'ceramic', name: 'Ceramic tile', surface: 'concrete', tint: '#e8e2c8', src: 'ON5 brief decision 5; tiles on a slab sound as concrete' },
  { id: 'concrete', name: 'Sealed concrete', surface: 'concrete', tint: '#a9adb2', src: 'ON5 brief decision 5; game surface concrete' },
  { id: 'grating', name: 'Steel grating', surface: 'grate', tint: '#d9822b', src: 'ON5 brief decision 5; game surface grate' },
  { id: 'raised', name: 'Raised access floor', surface: 'wood', tint: '#5c8f8a', src: "ON5 brief decision 5; hollow panels on pedestals: the game's hollow knock (wood)" },
  { id: 'gravel', name: 'Gravel', surface: 'gravel', tint: '#b59a6a', src: 'ON5 brief decision 5; game surface gravel' },
  { id: 'grass', name: 'Grass', surface: 'carpet', tint: '#5f9e4f', src: 'ON5 brief decision 5; the game has no grass surface: soft underfoot, as carpet' },
  { id: 'asphalt', name: 'Asphalt', surface: 'concrete', tint: '#4b4f55', src: 'ON5 brief decision 5; a hard outside floor sounds as concrete' },
];

/** Older words for a finish (level-design 16.8.3 says linoleum). */
const ALIASES: Readonly<Record<string, string>> = { linoleum: 'vinyl', tile: 'ceramic', grate: 'grating' };

export const finishOf = (id: string | undefined): Finish | undefined => (id ? (FINISHES.find((f) => f.id === id) ?? FINISHES.find((f) => f.id === ALIASES[id])) : undefined);

/** A room's floor surface for the walk test's footsteps (`LevelBuilder.surface`), from its finish. */
export interface FinishArea {
  kind: Surface;
  rect: readonly [number, number, number, number];
  top: number;
}

export function finishAreas(rooms: readonly { level: string; rect: readonly [number, number, number, number]; finish?: string }[], floorOf: (level: string) => number): FinishArea[] {
  const out: FinishArea[] = [];
  for (const r of rooms) {
    const f = finishOf(r.finish);
    if (f) out.push({ kind: f.surface, rect: r.rect, top: floorOf(r.level) });
  }
  return out;
}

/** The fields of an `exterior[]` piece the walk test reads (schema.md). */
export interface ExtPiece {
  id: string;
  kind: string;
  a: Pt2;
  b: Pt2;
  y0: number;
  y1: number;
  climbable: boolean;
  facing?: string;
  depth?: number;
  size?: readonly [number, number];
}

/** One builder call for a piece (kestrel.ts runs them). */
export type ExtBuild =
  | { t: 'pipeV'; id: string; x: number; z: number; y0: number; y1: number; side: number }
  | { t: 'pipeH'; id: string; a: Pt2; b: Pt2; y: number }
  | { t: 'fence'; id: string; a: Pt2; b: Pt2; h: number; y: number }
  | { t: 'duct'; id: string; path: P3[]; entry: Grate; exit: Grate }
  | { t: 'stairs'; id: string; x: number; z: number; w: number; len: number; rise: number; steps: number; yaw: number; y: number }
  | { t: 'pillar'; id: string; x: number; z: number; r: number; h: number; y: number }
  | { t: 'box'; id: string; c: [number, number, number]; s: [number, number, number]; yaw: number; collide: boolean; noLedge: boolean };

/** Compass letter to yaw (north = +Z = 0, east = +X), as kestrelCampus.ts FACING_YAW. */
const YAW: Readonly<Record<string, number>> = { N: 0, E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 };

/** The thickness of a duct's sides, floor and lid, and of a vent grille (drawing; the walk test only). */
const SKIN = 0.05;

/** A box along a -> b (centreline), `across` wide, from y0 to y1. */
function lineBox(id: string, a: Pt2, b: Pt2, across: number, y0: number, y1: number, collide: boolean, noLedge: boolean): ExtBuild {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = hyp2(dx, dz);
  return { t: 'box', id, c: [(a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2], s: [across, Math.max(SKIN, y1 - y0), Math.max(SKIN, len)], yaw: Math.atan2(dx, dz), collide, noLedge };
}

/**
 * Every piece as builder calls. Climbable pieces use the engine's own anchors: a downpipe is `pipeV`, a horizontal pipe
 * `pipeH`, a fence `fence`, a duct its hollow plus a `duct` anchor with grates at both ends; a ledge, sill or coping is a
 * box whose top the builder turns into a ledge (F09). A piece that is not climbable is plain collision (a box with no
 * ledge). A fire escape is the builder's stairs (walked), a lamp post a pillar, a vent grille a thin plate (no collision).
 */
export function exteriorPieces(list: readonly ExtPiece[]): ExtBuild[] {
  const out: ExtBuild[] = [];
  for (const e of list) {
    const pt = e.a[0] === e.b[0] && e.a[1] === e.b[1];
    switch (e.kind) {
      case 'downpipe': {
        if (e.climbable) out.push({ t: 'pipeV', id: e.id, x: e.a[0], z: e.a[1], y0: e.y0, y1: e.y1, side: YAW[e.facing ?? 'N'] ?? 0 });
        else out.push({ t: 'box', id: e.id, c: [e.a[0], (e.y0 + e.y1) / 2, e.a[1]], s: [0.12, e.y1 - e.y0, 0.12], yaw: 0, collide: true, noLedge: true });
        break;
      }
      case 'pipe':
        if (pt) break;
        if (e.climbable) out.push({ t: 'pipeH', id: e.id, a: e.a, b: e.b, y: e.y0 });
        else out.push(lineBox(e.id, e.a, e.b, 0.12, e.y0 - 0.06, e.y0 + 0.06, true, true));
        break;
      case 'ledge':
      case 'stringcourse':
      case 'sill':
      case 'parapet':
        if (pt) break;
        out.push(lineBox(e.id, e.a, e.b, e.depth ?? 0.2, e.y0, e.y1, true, !e.climbable));
        break;
      case 'vent': {
        const [w, h] = e.size ?? [0.6, 0.6];
        const ns = e.facing === 'N' || e.facing === 'S';
        out.push({ t: 'box', id: e.id, c: [e.a[0], e.y0 + h / 2, e.a[1]], s: [ns ? w : SKIN, h, ns ? SKIN : w], yaw: 0, collide: false, noLedge: true });
        break;
      }
      case 'duct': {
        if (pt) break;
        const [w, h] = e.size ?? [1.2, 1.5];
        const dx = e.b[0] - e.a[0];
        const dz = e.b[1] - e.a[1];
        const len = hyp2(dx, dz);
        const nx = dz / len;
        const nz = -dx / len;
        const side = (k: 1 | -1): Pt2[] => [
          [e.a[0] + (nx * k * (w + SKIN)) / 2, e.a[1] + (nz * k * (w + SKIN)) / 2],
          [e.b[0] + (nx * k * (w + SKIN)) / 2, e.b[1] + (nz * k * (w + SKIN)) / 2],
        ];
        for (const k of [1, -1] as const) {
          const [p, q] = side(k);
          out.push(lineBox(`${e.id}.side`, p!, q!, SKIN, e.y0, e.y0 + h, true, true));
        }
        out.push(lineBox(`${e.id}.lid`, e.a, e.b, w + SKIN * 2, e.y0 + h, e.y0 + h + SKIN, true, true));
        if (e.y0 > SKIN) out.push(lineBox(`${e.id}.floor`, e.a, e.b, w + SKIN * 2, e.y0 - SKIN, e.y0, true, true));
        if (e.climbable) {
          const ux = dx / len;
          const uz = dz / len;
          out.push({
            t: 'duct',
            id: e.id,
            path: [
              { x: e.a[0], y: e.y0, z: e.a[1] },
              { x: e.b[0], y: e.y0, z: e.b[1] },
            ],
            entry: { pos: { x: e.a[0], y: e.y0 + h / 2, z: e.a[1] }, nx: -ux, ny: 0, nz: -uz, where: 'wall' },
            exit: { pos: { x: e.b[0], y: e.y0 + h / 2, z: e.b[1] }, nx: ux, ny: 0, nz: uz, where: 'wall' },
          });
        }
        break;
      }
      case 'fire-escape': {
        if (pt) break;
        const dx = e.b[0] - e.a[0];
        const dz = e.b[1] - e.a[1];
        const len = hyp2(dx, dz);
        const [w, n] = e.size ?? [1.3, 0];
        const rise = e.y1 - e.y0;
        out.push({ t: 'stairs', id: e.id, x: (e.a[0] + e.b[0]) / 2, z: (e.a[1] + e.b[1]) / 2, w, len, rise, steps: Math.max(1, Math.round(n)), yaw: Math.atan2(dx, dz), y: e.y0 });
        break;
      }
      case 'lamp-post': {
        const [w] = e.size ?? [0.15, 0.15];
        out.push({ t: 'pillar', id: e.id, x: e.a[0], z: e.a[1], r: w / 2, h: e.y1 - e.y0, y: e.y0 });
        break;
      }
      case 'fence':
        if (pt) break;
        if (e.climbable) out.push({ t: 'fence', id: e.id, a: e.a, b: e.b, h: e.y1 - e.y0, y: e.y0 });
        else out.push(lineBox(e.id, e.a, e.b, SKIN, e.y0, e.y1, true, true));
        break;
      default:
        break;
    }
  }
  return out;
}
