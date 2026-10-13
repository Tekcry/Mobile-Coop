/**
 * ON7 light preview, the pure part (Babylon-free, tests/editor/lightPreview.test.ts): the lights preview modes (which
 * lamps are on), the light bands at the game's thresholds (`LIGHT`, bible L6), the darkness map's cells and contours,
 * the guard view's cell classes from the AI's own field of view (`perception.ts`), and the quick light of a lamp being
 * dragged (the game's `contribution`, `lampMath`, without occlusion). Every light value comes from the game's light
 * code (bible 5.1); nothing here is a second formula.
 */
import facts from '../../scripts/kestrel/facts.json';
import { fieldFactor } from '../ai/perception';
import { lampOnNormally, type LampRecord } from '../world/maps/kestrelLights';
import { contribution, LIGHT, type LightDef } from '../world/lights';
import type { Rect } from './types';

/** The lights preview modes (View tab): none changes the saved data. */
export type LightModeKind = 'normal' | 'mains' | 'switched' | 'motion' | 'shot';
export interface LightMode {
  kind: LightModeKind;
  /** Switched off: the circuit turned off. */
  circuit?: string;
  /** Lamp shot out: the lamp. */
  lamp?: string;
}

export const LIGHT_MODES: readonly LightModeKind[] = ['normal', 'mains', 'switched', 'motion', 'shot'];
const MODE_WORDS: Record<LightModeKind, string> = { normal: 'Normal', mains: 'Mains off', switched: 'Switched off', motion: 'Motion lights on', shot: 'Lamp shot out' };
export const modeName = (k: LightModeKind): string => MODE_WORDS[k];

/** The mode in words ("Switched off: C3"). */
export function modeWords(m: LightMode): string {
  if (m.kind === 'switched') return `${MODE_WORDS.switched}: ${m.circuit ?? 'pick a circuit'}`;
  if (m.kind === 'shot') return `${MODE_WORDS.shot}: ${m.lamp ?? 'select a breakable lamp'}`;
  return MODE_WORDS[m.kind];
}

/**
 * Is the lamp lit in this mode? Normal: as the game builds it (`lampOnNormally`). Mains off: only emergency fittings
 * (maintained and non-maintained, exit signs among them) on their own batteries. Switched off: its circuit off, the rest
 * normal. Motion lights on: PIR lamps lit as if triggered. Lamp shot out: that lamp out (a breakable one), the rest normal.
 */
export function lampOnIn(l: Pick<LampRecord, 'id' | 'circuit' | 'emergency' | 'motion' | 'params' | 'breakable'>, m: LightMode): boolean {
  if (m.kind === 'mains') return l.emergency === 'maintained' || l.emergency === 'non-maintained';
  if (m.kind === 'switched' && m.circuit && l.circuit === m.circuit) return false;
  if (m.kind === 'motion' && l.motion) return l.params.on !== false;
  if (m.kind === 'shot' && m.lamp === l.id && l.breakable) return false;
  return lampOnNormally(l);
}

/** The three bands of the light meter: under `LIGHT.shadow` hidden, over `LIGHT.lit` lit, between them grey. */
export type Band = 'hidden' | 'grey' | 'lit';
export function band(v: number): Band {
  return v < LIGHT.shadow ? 'hidden' : v > LIGHT.lit ? 'lit' : 'grey';
}

/** "0.21 hidden": the meter and its band, as the dot's words give it. */
export function meterWords(v: number): string {
  return `${v.toFixed(2)} ${band(v)}`;
}

/** The darkness map's cell (facts light.mapCell). */
export const MAP_CELL: number = facts.light.mapCell.value;
/** The light meter's body height (facts player.standHeight, F01; the game's meter samples a 1.75 m body). */
export const BODY_HEIGHT: number = facts.player.standHeight.value;

/** A level's cells: a grid of `MAP_CELL` cells over its rooms; `walk` 1 where a cell's centre is on a room's floor
 *  and not over a floor hole. */
export interface CellGrid {
  x0: number;
  z0: number;
  nx: number;
  nz: number;
  cell: number;
  walk: Uint8Array;
}

/** The walkable cells of a level: inside a room on it, not inside a floor hole on it. */
export function levelCells(rooms: readonly { level: string; rect: Rect }[], voids: readonly { level: string; rect: Rect }[], level: string, cell = MAP_CELL): CellGrid | null {
  const rs = rooms.filter((r) => r.level === level);
  if (!rs.length) return null;
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  for (const r of rs) {
    x0 = Math.min(x0, r.rect[0], r.rect[2]);
    z0 = Math.min(z0, r.rect[1], r.rect[3]);
    x1 = Math.max(x1, r.rect[0], r.rect[2]);
    z1 = Math.max(z1, r.rect[1], r.rect[3]);
  }
  x0 = Math.floor(x0 / cell) * cell;
  z0 = Math.floor(z0 / cell) * cell;
  const nx = Math.max(1, Math.ceil((x1 - x0) / cell - 1e-9));
  const nz = Math.max(1, Math.ceil((z1 - z0) / cell - 1e-9));
  const walk = new Uint8Array(nx * nz);
  const inside = (r: Rect, x: number, z: number): boolean => x > Math.min(r[0], r[2]) && x < Math.max(r[0], r[2]) && z > Math.min(r[1], r[3]) && z < Math.max(r[1], r[3]);
  const holes = voids.filter((v) => v.level === level);
  for (let j = 0; j < nz; j++) {
    const z = z0 + (j + 0.5) * cell;
    for (let i = 0; i < nx; i++) {
      const x = x0 + (i + 0.5) * cell;
      if (rs.some((r) => inside(r.rect, x, z)) && !holes.some((v) => inside(v.rect, x, z))) walk[j * nx + i] = 1;
    }
  }
  return { x0, z0, nx, nz, cell, walk };
}

/** The cell centre of index `k`. */
export function cellCentre(g: CellGrid, k: number): [number, number] {
  return [g.x0 + ((k % g.nx) + 0.5) * g.cell, g.z0 + (Math.floor(k / g.nx) + 0.5) * g.cell];
}

/** The cell index at a plan point, or -1 outside the grid. */
export function cellIndex(g: CellGrid, x: number, z: number): number {
  const i = Math.floor((x - g.x0) / g.cell);
  const j = Math.floor((z - g.z0) / g.cell);
  return i < 0 || j < 0 || i >= g.nx || j >= g.nz ? -1 : j * g.nx + i;
}

/** Samples every walkable cell's centre (`sample` is the game's light field; NaN off the floor). */
export function sampleCells(g: CellGrid, sample: (x: number, z: number) => number): Float32Array {
  const out = new Float32Array(g.nx * g.nz).fill(NaN);
  for (let k = 0; k < out.length; k++) {
    if (!g.walk[k]) continue;
    const [x, z] = cellCentre(g, k);
    out[k] = sample(x, z);
  }
  return out;
}

/**
 * A threshold's contour: the cell edges between a walkable cell under `t` and one at or over it (plan segments, x z).
 * Edges to cells off the floor are not drawn (a wall is not a contour).
 */
export function contour(g: CellGrid, v: Float32Array, t: number): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const c = g.cell;
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nx; i++) {
      const k = j * g.nx + i;
      const a = v[k]!;
      if (a !== a) continue;
      const x = g.x0 + i * c;
      const z = g.z0 + j * c;
      if (i + 1 < g.nx) {
        const b = v[k + 1]!;
        if (b === b && a < t !== b < t) out.push([x + c, z, x + c, z + c]);
      }
      if (j + 1 < g.nz) {
        const b = v[k + g.nx]!;
        if (b === b && a < t !== b < t) out.push([x, z + c, x + c, z + c]);
      }
    }
  }
  return out;
}

/** The guard view's classes: noticed at once (lit) red, slowly (between the thresholds) amber, unseen clear. */
export type GuardClass = 'red' | 'amber' | 'clear';

const rangeOut = [0];

/**
 * One cell as a guard sees it: out of the AI's field of view or range (`fieldFactor`: the focused cone to its range,
 * the peripheral cone to its shorter range), or out of line of sight, clear; else by the light on the body there.
 * `angle` is the bearing off the guard's facing (rad), as `Enemy.perceive` measures it.
 */
export function guardClass(dist: number, angle: number, los: boolean, level: number): GuardClass {
  const mul = fieldFactor(angle, rangeOut);
  if (mul <= 0 || dist >= rangeOut[0]!) return 'clear';
  if (!los) return 'clear';
  const b = band(level);
  return b === 'lit' ? 'red' : b === 'grey' ? 'amber' : 'clear';
}

/** Can a cell at this distance and bearing be in sight at all (cheap test before the light and the ray)? */
export function inView(dist: number, angle: number): boolean {
  return fieldFactor(angle, rangeOut) > 0 && dist < rangeOut[0]!;
}

/** Bearing of (dx, dz) off a facing `yaw` (atan2(x, z), as the AI measures it), wrapped to -pi..pi. */
export function bearing(dx: number, dz: number, yaw: number): number {
  let a = Math.atan2(dx, dz) - yaw;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * The quick light of a lamp being dragged (or stepped): the game's gameplay contribution of one light at a point
 * (`lights.ts` `contribution`: gain x intensity x the `lampMath` formula), with no occlusion. The 3D view's quick light
 * draws it; the darkness map and the meter never read it.
 */
export function quickLevel(l: LightDef, x: number, y: number, z: number): number {
  return contribution(l, x, y, z);
}
