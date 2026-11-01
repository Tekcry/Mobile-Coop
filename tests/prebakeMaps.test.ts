/**
 * (piano SO2) The prebake takes a list of maps (`SHIPPED_BAKE_MAPS`: empty since Saltmarsh Park left, clean-up F; the mechanism stays)
 * and the game reads `bakes/<map>.json` for each of them the same way:
 * - the prebake builds exactly the shipped maps (none today), each with the game's own key (checked on Tallow Wharf);
 * - the build's emit plugin ships every map's files from its own `<h>` folder (and still reads the one-map shape);
 * - `bakeLevelLight` reads the shipped files for a shipped map with no section split (a test map put on the list here),
 *   byte for byte the bake a PC makes; a map not on the list never asks for one.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flags } from '../src/core/flags';
import { LevelBuilder } from '../src/world/levelBuilder';
import { canonicalLightSet, CANON_VERSION } from '../src/voxel/lightShapes';
import { bakeLamps, LAMP_STRIDE, type LampResult } from '../src/voxel/lampBake';
import { LAMP_VERSION } from '../src/voxel/lampJobs';
import type * as LampJobs from '../src/voxel/lampJobs';
import type * as ShippedBake from '../src/world/shippedBake';
import { sectionBakeFor } from '../src/world/sectionBake';
import { packLamps, SHIPPED_BAKE_MAPS, shipsBake, type ShippedManifest } from '../src/world/shippedBake';
import { bakedLights, bakeLevelLight, lampKeyOf } from '../src/world/lightBake';
import { tallowWharf } from '../src/world/maps/tallowWharf';
import type { MapDef } from '../src/world/mapDef';
import { buildMapLights } from '../src/world/mapLights';
import { dressingOn } from '../src/world/detailPass';
import { buildMap, PREBAKE_MAPS } from '../scripts/prebake/plan';
import { currentMaps, shippedBakes } from '../scripts/prebake/emit';

// (the cache write is spied; everything else in lampJobs is the real module)
vi.mock('../src/voxel/lampJobs', async (orig) => ({ ...(await orig<typeof LampJobs>()), saveLamps: vi.fn(async () => undefined) }));
// (a shipped map with no section split: a test map on the list; the real list is empty)
vi.mock('../src/world/shippedBake', async (orig) => {
  const m = await orig<typeof ShippedBake>();
  return { ...m, shipsBake: (id: string): boolean => id === 'so2-shipped' || m.shipsBake(id) };
});
const SPLITLESS = 'so2-shipped';

/** A map's lamp key as `World.create` builds it (`buildMapLights`, the game's own call; seed 3: the key never reads
 *  the seed). */
function gameKey(def: MapDef): string {
  const b = new LevelBuilder();
  buildMapLights(b, def, 3);
  const { light } = b.prepare(def.id, { dressing: dressingOn(def) });
  return lampKeyOf(def.id, light.hash, bakedLights(b.lights).lights);
}

const src = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('prebake and game build one light set (piano SO2)', () => {
  it('World.create and the prebake both call buildMapLights, and neither runs a light pass of its own', () => {
    for (const p of ['src/world/world.ts', 'scripts/prebake/plan.ts']) {
      const s = src(p);
      expect(s, p).toMatch(/buildMapLights\(b, \w+, [\w.]+\)/);
      for (const pass of ['applyMapFlicker(', 'applyMapSway(', '.build(b,']) expect(s.includes(pass), `${p}: ${pass}`).toBe(false);
    }
  });
});

describe('prebake: the shipped maps', () => {
  it('bakes exactly SHIPPED_BAKE_MAPS (none), and the prebake builds a map under the game key', () => {
    expect(SHIPPED_BAKE_MAPS).toEqual([]);
    expect(PREBAKE_MAPS.map((d) => d.id)).toEqual([...SHIPPED_BAKE_MAPS]);
    expect(shipsBake('tallowWharf')).toBe(false);
    expect(shipsBake('warehouse')).toBe(false);
    expect(sectionBakeFor('tallowWharf')).toBeNull();
    const wharf = buildMap(tallowWharf);
    expect(wharf.map).toBe('tallowWharf');
    expect(wharf.key).toBe(gameKey(tallowWharf));
  }, 120_000);
});
describe('prebake: the build emits every map (scripts/prebake/emit.ts)', () => {
  type Hook = (this: { emitFile: (f: { type: string; fileName: string; source: Uint8Array }) => string }) => void;
  const run = (root: string): string[] => {
    const plugin = shippedBakes();
    const out: string[] = [];
    (plugin.configResolved as unknown as (c: { root: string }) => void)({ root });
    (plugin.generateBundle as unknown as Hook).call({ emitFile: (f) => { out.push(`${f.fileName}=${Buffer.from(f.source).toString()}`); return f.fileName; } });
    return out;
  };

  it('each map from its own folder; the one-map shape still reads', () => {
    const root = mkdtempSync(join(tmpdir(), 'prebake-maps-'));
    try {
      const c = join(root, '.prebake-cache');
      for (const [h, map] of [['ha', 'tallowWharf'], ['hb', 'otherMap']] as const) {
        mkdirSync(join(c, h), { recursive: true });
        writeFileSync(join(c, h, `${map}.json`), h);
        writeFileSync(join(c, h, `${map}-${h}-s0.bin.gz`), `${h}0`);
      }
      const cur = { maps: [{ map: 'tallowWharf', h: 'ha', files: ['tallowWharf.json', 'tallowWharf-ha-s0.bin.gz'] }, { map: 'otherMap', h: 'hb', files: ['otherMap.json', 'otherMap-hb-s0.bin.gz'] }] };
      writeFileSync(join(c, 'current.json'), JSON.stringify(cur));
      expect(run(root)).toEqual(['bakes/tallowWharf.json=ha', 'bakes/tallowWharf-ha-s0.bin.gz=ha0', 'bakes/otherMap.json=hb', 'bakes/otherMap-hb-s0.bin.gz=hb0']);
      expect(currentMaps({ h: 'ha', files: ['x'] })).toEqual([{ h: 'ha', files: ['x'] }]);
      expect(currentMaps({})).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

/** A small room with three lamps (a fast bake). */
function room() {
  const b = new LevelBuilder();
  b.box(5, -0.1, 4, 10, 0.2, 8, '#888');
  b.box(-0.1, 1.5, 4, 0.2, 3, 8, '#888');
  b.box(10.1, 1.5, 4, 0.2, 3, 8, '#888');
  b.box(5, 1.5, -0.1, 10, 3, 0.2, '#888');
  b.box(5, 1.5, 8.1, 10, 3, 0.2, '#888');
  b.box(5, 1.5, 4, 0.2, 3, 4, '#888');
  for (const [x, z] of [[2, 2], [7, 5], [8, 2]] as const) b.lights.add({ x, y: 2.6, z, radius: 4, intensity: 1 });
  b.lights.ambient = 0.2;
  return { b, set: canonicalLightSet(b.boxes, b.cylinders, 'so2-room', false) };
}

const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');

describe('the game reads a shipped map with no section split (lightBake.ts)', () => {
  const saved = flags.mapReady;
  afterEach(() => {
    flags.mapReady = saved;
    vi.unstubAllGlobals();
  });

  it('a shipped map with no section split: its bakes/<map>.json read, byte for byte the PC bake; a map off the list never fetches', async () => {
    const { b, set } = room();
    const baked = bakedLights(b.lights);
    const L = baked.lights;
    const n = L.length / LAMP_STRIDE;
    // the prebake's path: each lamp alone, one file (no section split)
    const parts: LampResult[] = [];
    for (let i = 0; i < n; i++) parts.push(bakeLamps({ kind: 'lamps', id: i, shapes: set.shapes, lights: L.slice(i * LAMP_STRIDE, (i + 1) * LAMP_STRIDE), lo: set.lo, hi: set.hi }));
    const ids = Array.from({ length: n }, (_, i) => i);
    const raw = packLamps(ids, parts);
    const gz = new Uint8Array(gzipSync(raw, { level: 9 }));
    const name = `${SPLITLESS}-abc-s0.bin.gz`;
    const key = lampKeyOf(SPLITLESS, set.hash, L);
    const man: ShippedManifest = { map: SPLITLESS, key, lampVersion: LAMP_VERSION, canonVersion: CANON_VERSION, lamps: n, files: [{ name, bytes: gz.length, sha256: sha(gz), rawBytes: raw.length, rawSha256: sha(raw), lampIds: ids }] };
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (u: string) => {
      urls.push(u);
      if (u === `/bakes/${SPLITLESS}.json`) return new Response(JSON.stringify(man), { status: 200 });
      if (u === `/bakes/${name}`) return new Response(gz.slice(), { status: 200 });
      return new Response('', { status: 404 });
    });
    flags.mapReady = true;
    const inp = (mapId: string) => ({ mapId, seed: 1, shapes: set.shapes, shapesHash: set.hash, lo: set.lo, hi: set.hi, reg: b.lights, sunDir: [0.3, -1, 0.2] as [number, number, number], moonLight: 0 });
    const shipped = await bakeLevelLight(inp(SPLITLESS));
    expect(shipped.source).toBe('shipped');
    expect(shipped.sections).toBeNull();
    expect(urls).toEqual([`/bakes/${SPLITLESS}.json`, `/bakes/${name}`]);
    urls.length = 0;
    // a map off the list: no fetch, the PC bakes in full
    const pc = await bakeLevelLight(inp('so2-room'));
    expect(pc.source).toBe('baked');
    expect(urls).toEqual([]);
    const a = shipped.lamps!.r;
    const p = pc.lamps!.r;
    expect(Array.from(a.boxes)).toEqual(Array.from(p.boxes));
    expect(Buffer.from(a.vis).equals(Buffer.from(p.vis))).toBe(true);
    expect(Array.from(a.bounce!.boxes)).toEqual(Array.from(p.bounce!.boxes));
    expect(Array.from(a.bounce!.data)).toEqual(Array.from(p.bounce!.data));
    expect(Array.from(a.bounce!.bits ?? [])).toEqual(Array.from(p.bounce!.bits ?? []));
    // the flag off (the live game today): no fetch
    flags.mapReady = false;
    expect((await bakeLevelLight(inp(SPLITLESS))).source).toBe('baked');
    expect(urls).toEqual([]);
  }, 120_000);
});
