/**
 * The canonical light bake (3.6): every device bakes the same lamp visibility, moon visibility and ambient grid from
 * the same canonical shapes (`voxel/lightShapes.ts`), whatever the renderer, preset or detail tier. Its keys depend
 * only on the map, seed, canonical shapes, lights and moon direction. `LightField` (gameplay) and the renderers read
 * this one thing (bible 5.1).
 */
import { bakeLevelLamps, bakeLevelMoon, LAMP_VERSION, MOON_VERSION } from '../voxel/lampJobs';
import { CANON_VERSION, fnv } from '../voxel/lightShapes';
import { MOON_CELL } from '../voxel/skyBake';
import { buildAmbientGrid, type AmbientGrid } from './ambientGrid';
import type { LightRegistry } from './lights';
import { LAMP_STRIDE, type LampResult } from '../voxel/lampBake';

/** Pure: the lights that are baked (every fixed one; flashlights move) packed for the bake (`LAMP_STRIDE`). */
export function bakedLights(reg: LightRegistry): { lights: Float32Array; ids: number[] } {
  const ids: number[] = [];
  for (const l of reg.lights) if (l.kind !== 'flashlight') ids.push(l.id);
  const lights = new Float32Array(ids.length * LAMP_STRIDE);
  ids.forEach((id, i) => {
    const l = reg.lights[id]!;
    const f = l.fixture;
    lights.set([l.x, l.y, l.z, l.reach ?? l.radius, l.cone?.dx ?? 0, l.cone?.dy ?? -1, l.cone?.dz ?? 0, l.cone ? l.cone.cosOuter : -2, f?.sx ?? 0, f?.sz ?? 0], i * LAMP_STRIDE);
  });
  return { lights, ids };
}

export interface MoonGrid {
  /** Minimum corner of cell (0, 0, 0). */
  origin: [number, number, number];
  n: [number, number, number];
  cell: number;
  /** n[0] * n[1] * n[2] bytes, x fastest. */
  vis: Uint8Array;
  /** Unit vector from the ground towards the moon. */
  dir: [number, number, number];
}

export interface LightBake {
  /** The canonical box (whole metres) every grid covers. */
  lo: [number, number, number];
  hi: [number, number, number];
  /** Cache key of the lamp bake; null when the map has no fixed lights. */
  lampKey: string | null;
  moonKey: string | null;
  /** The fixed lights as baked (`bakedLights`) and their visibility boxes; null without lights. */
  lamps: { baked: ReturnType<typeof bakedLights>; r: LampResult } | null;
  moon: MoonGrid | null;
  ambient: AmbientGrid;
  /** Load time of the lamp and moon bakes together (ms; a cache hit reads in a few). */
  ms: number;
}

export interface LightBakeInput {
  mapId: string;
  seed: number;
  shapes: Float32Array;
  shapesHash: string;
  lo: [number, number, number];
  hi: [number, number, number];
  reg: LightRegistry;
  /** The theme's light travel direction (the moon shines along it). */
  sunDir: readonly [number, number, number];
}

function hashFloats(a: Float32Array): string {
  return fnv(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)).toString(36);
}

/** Bake everything the light field reads. Needs `reg.ambient` set (the zones are read as they are). */
export async function bakeLevelLight(inp: LightBakeInput): Promise<LightBake> {
  const t0 = performance.now();
  const baked = inp.reg.lights.length ? bakedLights(inp.reg) : null;
  const ambient = buildAmbientGrid(inp.reg, inp.lo, inp.hi);
  let lampKey: string | null = null;
  let moonKey: string | null = null;
  let lamps: LightBake['lamps'] = null;
  let moon: MoonGrid | null = null;
  if (baked && baked.ids.length) {
    lampKey = `lamps:${inp.mapId}:${inp.seed}:v${LAMP_VERSION}:c${CANON_VERSION}:${inp.shapesHash}:${hashFloats(baked.lights)}`;
    const l = Math.sqrt(inp.sunDir[0] ** 2 + inp.sunDir[1] ** 2 + inp.sunDir[2] ** 2) || 1;
    const dir: [number, number, number] = [-inp.sunDir[0] / l, -inp.sunDir[1] / l, -inp.sunDir[2] / l];
    moonKey = `moon:${inp.mapId}:${inp.seed}:v${MOON_VERSION}:c${CANON_VERSION}:${inp.shapesHash}:${dir.map((v) => v.toFixed(4)).join(',')}`;
    const [r, m] = await Promise.all([bakeLevelLamps(inp.shapes, baked.lights, inp.lo, inp.hi, lampKey), bakeLevelMoon(inp.shapes, inp.lo, inp.hi, dir, moonKey)]);
    lamps = { baked, r };
    moon = { origin: [inp.lo[0], inp.lo[1], inp.lo[2]], n: [Math.max(1, Math.ceil((inp.hi[0] - inp.lo[0]) / MOON_CELL)), Math.max(1, Math.ceil((inp.hi[1] - inp.lo[1]) / MOON_CELL)), Math.max(1, Math.ceil((inp.hi[2] - inp.lo[2]) / MOON_CELL))], cell: MOON_CELL, vis: m.vis, dir };
  }
  return { lo: inp.lo, hi: inp.hi, lampKey, moonKey, lamps, moon, ambient, ms: performance.now() - t0 };
}

/** A content hash of everything baked (the parity checks compare it across renderers; base 36). */
export function lightBakeHash(b: LightBake): string {
  let h = 2166136261;
  if (b.lamps) {
    h = fnv(new Uint8Array(b.lamps.r.boxes.buffer, b.lamps.r.boxes.byteOffset, b.lamps.r.boxes.byteLength), h);
    h = fnv(b.lamps.r.vis, h);
  }
  if (b.moon) h = fnv(b.moon.vis, h);
  h = fnv(b.ambient.data, h);
  return h.toString(36);
}
