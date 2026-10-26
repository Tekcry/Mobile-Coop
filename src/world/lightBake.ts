/**
 * The canonical light bake (3.6): every device bakes the same lamp visibility, moon visibility and ambient grid from
 * the same canonical shapes (`voxel/lightShapes.ts`), whatever the renderer, preset or detail tier. Its keys depend
 * only on the map, canonical shapes, lights and moon direction (map-ready A16: never the match seed, which changes no
 * baked byte). `LightField` (gameplay) and the renderers read this one thing (bible 5.1).
 */
import { bakeLevelLamps, bakeLevelMoon, LAMP_VERSION, MOON_VERSION, readLampCache } from '../voxel/lampJobs';
import { SectionBaker } from '../voxel/sectionJobs';
import { flags } from '../core/flags';
import { readShippedLamps, shipsBake } from './shippedBake';
import { lampSectionMasks, sectionBakeFor } from './sectionBake';
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
  moonKey: string;
  /** The fixed lights as baked (`bakedLights`) and their visibility boxes; null without lights. */
  lamps: { baked: ReturnType<typeof bakedLights>; r: LampResult } | null;
  moon: MoonGrid;
  /** The sky fill without the moon's share (zones as authored, the open sky's level less `moonLight`). */
  ambient: AmbientGrid;
  /** Gameplay level the moon adds where it reaches (`lampMath.moonLight`). */
  moonLight: number;
  /** Load time of the lamp and moon bakes together (ms; a cache hit reads in a few). */
  ms: number;
  /**
   * (map-ready S4) Where the lamps came from: `shipped` the build's pre-baked files (`shippedBake.ts`), `cache` the
   * IndexedDB cache, `baked` this PC (a section or full bake), `none` no fixed lights. Always set by `bakeLevelLight`;
   * absent only on hand-made test bakes.
   */
  source?: 'shipped' | 'cache' | 'baked' | 'none';
  /**
   * (section-bake) A Sector Ops map baking per section (`sectionBake.ts`, SB1) on a cache miss: `lamps.r` fills as its
   * lamps land, the live section first (`GameState.create` waits for it); null or absent for a full or cached bake.
   */
  sections?: SectionBaker | null;
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
  /** The moon's gameplay level (`lampMath.moonLight`); the global ambient gives up this much to it. */
  moonLight: number;
}

function hashFloats(a: Float32Array): string {
  return fnv(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)).toString(36);
}

/** (map-ready A16) The lamp bake's cache key: the map, the bake versions, the shapes and the lights; no seed (the same
 *  bytes for every seed). The game and the prebake (`scripts/prebake/`) both use this one. */
export function lampKeyOf(mapId: string, shapesHash: string, lights: Float32Array): string {
  return `lamps:${mapId}:v${LAMP_VERSION}:c${CANON_VERSION}:${shapesHash}:${hashFloats(lights)}`;
}

/** (map-ready A16) The moon bake's cache key (`dir`: the unit vector towards the moon); no seed. */
export function moonKeyOf(mapId: string, shapesHash: string, dir: readonly [number, number, number]): string {
  return `moon:${mapId}:v${MOON_VERSION}:c${CANON_VERSION}:${shapesHash}:${dir.map((v) => v.toFixed(4)).join(',')}`;
}

/** Bake everything the light field reads. Needs `reg.ambient` set (the zones are read as they are). */
export async function bakeLevelLight(inp: LightBakeInput): Promise<LightBake> {
  const t0 = performance.now();
  const reg = inp.reg;
  const baked = reg.lights.length ? bakedLights(reg) : null;
  // (zones are rooms as authored; the open sky's level splits into the fill and the moon, which the bake shades)
  const sky = Math.max(0, reg.ambient - inp.moonLight);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, inp.lo, inp.hi);
  const l = Math.sqrt(inp.sunDir[0] ** 2 + inp.sunDir[1] ** 2 + inp.sunDir[2] ** 2) || 1;
  const dir: [number, number, number] = [-inp.sunDir[0] / l, -inp.sunDir[1] / l, -inp.sunDir[2] / l];
  const moonKey = moonKeyOf(inp.mapId, inp.shapesHash, dir);
  let lampKey: string | null = null;
  let lamps: LightBake['lamps'] = null;
  const hasLamps = !!baked && baked.ids.length > 0;
  if (hasLamps) lampKey = lampKeyOf(inp.mapId, inp.shapesHash, baked.lights);
  // (section-bake, SB1 / SB2) an opted-in map on a cache miss: the result is laid out in full now and fills as the lamps
  // land, the live section first (`GameState.create` waits for it), the others in the background
  const def = hasLamps ? sectionBakeFor(inp.mapId) : null;
  // (a holder: the job below sets it after an await, which a plain `let` would narrow away; `dead`: the bake already
  // failed, so a job still awaiting the cache read starts nothing (section-bake robust, polish3))
  // (map-ready S4) `source`: where the lamps came from (`LightBake.source`)
  const held: { sb: SectionBaker | null; dead: boolean; source: NonNullable<LightBake['source']> } = { sb: null, dead: false, source: hasLamps ? 'baked' : 'none' };
  const lampJob = async (): Promise<LampResult | null> => {
    if (!baked || !hasLamps) return null;
    const hit = await readLampCache(lampKey, baked.ids.length);
    if (held.dead) return null;
    if (hit) {
      held.source = 'cache';
      return hit;
    }
    // (map-ready S4) the build's pre-baked lamps under this exact key: no baker, no workers; the file is the cache, so
    // nothing is written. A miss (another key, no file, a dev build) bakes on this PC as before. (piano SO2) every
    // shipped map (`SHIPPED_BAKE_MAPS`), with a section split (campusOps) or without (thornbeckMill: one file)
    if (flags.mapReady && lampKey && shipsBake(inp.mapId)) {
      const shipped = await readShippedLamps({ mapId: inp.mapId, key: lampKey, lights: baked.lights, lo: inp.lo, hi: inp.hi });
      if (held.dead) return null;
      if (shipped) {
        held.source = 'shipped';
        return shipped;
      }
    }
    // (a full bake: `bakeLevelLamps` reads the cache once more first, a cheap miss)
    if (!def) return bakeLevelLamps(inp.shapes, baked.lights, inp.lo, inp.hi, lampKey);
    const sb = new SectionBaker({ shapes: inp.shapes, lights: baked.lights, lo: inp.lo, hi: inp.hi, masks: lampSectionMasks(baked.lights, def), sections: def.regions.length, key: lampKey });
    held.sb = sb;
    sb.start();
    return sb.result;
  };
  let r: LampResult | null;
  let m: Awaited<ReturnType<typeof bakeLevelMoon>>;
  try {
    [r, m] = await Promise.all([lampJob(), bakeLevelMoon(inp.shapes, inp.lo, inp.hi, dir, moonKey)]);
  } catch (e) {
    // (section-bake robust, check A P8) the moon failed beside a started section bake: its workers stop here; one not
    // yet started (the job still awaits the cache read) never starts (polish3)
    held.dead = true;
    held.sb?.dispose();
    throw e;
  }
  const sections = held.sb;
  if (r && baked) lamps = { baked, r };
  const moon: MoonGrid = { origin: [inp.lo[0], inp.lo[1], inp.lo[2]], n: [Math.max(1, Math.ceil((inp.hi[0] - inp.lo[0]) / MOON_CELL)), Math.max(1, Math.ceil((inp.hi[1] - inp.lo[1]) / MOON_CELL)), Math.max(1, Math.ceil((inp.hi[2] - inp.lo[2]) / MOON_CELL))], cell: MOON_CELL, vis: m.vis, dir };
  return { lo: inp.lo, hi: inp.hi, lampKey, moonKey, lamps, moon, ambient, moonLight: inp.moonLight, ms: performance.now() - t0, source: held.source, sections };
}

/** A content hash of everything baked (the parity checks compare it across renderers; base 36). */
export function lightBakeHash(b: LightBake): string {
  let h = 2166136261;
  if (b.lamps) {
    h = fnv(new Uint8Array(b.lamps.r.boxes.buffer, b.lamps.r.boxes.byteOffset, b.lamps.r.boxes.byteLength), h);
    h = fnv(b.lamps.r.vis, h);
  }
  h = fnv(b.moon.vis, h);
  h = fnv(b.ambient.data, h);
  h = fnv(new Uint8Array(new Float32Array([b.moonLight]).buffer), h);
  return h.toString(36);
}
