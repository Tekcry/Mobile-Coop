/**
 * (map-ready S4) The campus lamps shipped pre-built (`world/shippedBake.ts`, `scripts/prebake/`; brief
 * `docs/map-ready/briefs/S4.md`).
 * - Keys (A16): the match seed leaves the lamp and moon keys (the same bytes for every seed); a moved lamp is a new key;
 *   the prebake computes the game's own key (`lampKeyOf`, imported, never a copy).
 * - Parity (A15): the three-section strip of `sectionBake.test.ts` baked lamp by lamp (the prebake's path), packed,
 *   gzipped, served and read back (`readShippedLamps`) equals the section baker's joined result byte for byte.
 * - Misses: another key or version, a missing, short or changed file, a bad magic -> null (the PC bakes); a server that
 *   decoded the gzip still reads.
 * - (SB14) `markPlaying` caches a finished, not-yet-saved result once.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { canonicalLightSet, CANON_VERSION } from '../src/voxel/lightShapes';
import { bakeLamps, LAMP_STRIDE, type LampResult } from '../src/voxel/lampBake';
import { LAMP_VERSION, saveLamps } from '../src/voxel/lampJobs';
import { SectionBaker } from '../src/voxel/sectionJobs';
import { lampSectionMasks, type SectionBakeDef } from '../src/world/sectionBake';
import { joinShipped, packLamps, readShippedLamps, unpackLamps, type ShippedFile, type ShippedManifest } from '../src/world/shippedBake';
import { buildCampus } from '../scripts/prebake/plan';
import { bakedLights, bakeLevelLight, lampKeyOf, moonKeyOf } from '../src/world/lightBake';

// (the cache write is spied; everything else in lampJobs is the real module)
vi.mock('../src/voxel/lampJobs', async (orig) => ({ ...(await orig<typeof import('../src/voxel/lampJobs')>()), saveLamps: vi.fn(async () => undefined) }));
import { campusOps } from '../src/world/maps/campusOps';
import { applyMapFlicker } from '../src/world/lampFlicker';
import { applyMapSway } from '../src/world/lampSway';
import { dressingOn } from '../src/world/detailPass';

/** A small room with two lamps (a fast bake). */
function room() {
  const b = new LevelBuilder();
  b.box(4, -0.1, 4, 8, 0.2, 8, '#888');
  b.box(-0.1, 1.5, 4, 0.2, 3, 8, '#888');
  b.box(8.1, 1.5, 4, 0.2, 3, 8, '#888');
  b.box(4, 1.5, -0.1, 8, 3, 0.2, '#888');
  b.box(4, 1.5, 8.1, 8, 3, 0.2, '#888');
  b.box(4, 0.5, 4, 1, 1, 1, '#888');
  for (const [x, z] of [[2, 2], [6, 5]] as const) b.lights.add({ x, y: 2.6, z, radius: 3, intensity: 1 });
  b.lights.ambient = 0.2;
  const set = canonicalLightSet(b.boxes, b.cylinders, 'key-room', false);
  return { b, set };
}

/** campusOps' fixed lights as `World.create` builds them for `seed` (no Babylon: `prepare` is the light set's part). */
function campusKey(seed: number): string {
  const b = new LevelBuilder();
  campusOps.build(b, seed);
  applyMapFlicker(b.lights, 'campusOps', seed);
  applyMapSway(b, 'campusOps');
  const { light } = b.prepare('campusOps', { dressing: dressingOn(campusOps) });
  return lampKeyOf('campusOps', light.hash, bakedLights(b.lights).lights);
}

describe('shipped bake: keys (A16)', () => {
  it('two seeds of the same layout bake under one lamp key and one moon key', async () => {
    const keys: string[] = [];
    for (const seed of [1, 2]) {
      const { b, set } = room();
      const r = await bakeLevelLight({ mapId: 'key-room', seed, shapes: set.shapes, shapesHash: set.hash, lo: set.lo, hi: set.hi, reg: b.lights, sunDir: [0.3, -1, 0.2], moonLight: 0.1 });
      expect(r.source).toBe('baked');
      expect(r.lampKey).not.toContain(`:${seed}:`);
      keys.push(`${r.lampKey}|${r.moonKey}`);
    }
    expect(keys[0]).toBe(keys[1]);
  }, 120_000);

  it('a moved lamp gives a new lamp key; the moon key follows only the shapes and the direction', () => {
    const { b, set } = room();
    const L = bakedLights(b.lights).lights;
    const k0 = lampKeyOf('key-room', set.hash, L);
    const moved = L.slice();
    moved[LAMP_STRIDE] = moved[LAMP_STRIDE]! + 0.25;
    expect(lampKeyOf('key-room', set.hash, moved)).not.toBe(k0);
    expect(lampKeyOf('key-room', set.hash, L.slice())).toBe(k0);
    expect(lampKeyOf('other', set.hash, L)).not.toBe(k0);
    expect(moonKeyOf('key-room', set.hash, [0, 1, 0])).toBe(moonKeyOf('key-room', set.hash, [0, 1, 0]));
    expect(moonKeyOf('key-room', set.hash, [0, 1, 0])).not.toBe(moonKeyOf('key-room', set.hash, [0.1, 0.99, 0]));
  });

  it('a map without fixed lights has no lamp key and reads `none`', async () => {
    const b = new LevelBuilder();
    b.box(2, -0.1, 2, 4, 0.2, 4, '#888');
    b.lights.ambient = 0.3;
    const set = canonicalLightSet(b.boxes, b.cylinders, 'dark-room', false);
    const r = await bakeLevelLight({ mapId: 'dark-room', seed: 3, shapes: set.shapes, shapesHash: set.hash, lo: set.lo, hi: set.hi, reg: b.lights, sunDir: [0, -1, 0], moonLight: 0 });
    expect(r.lampKey).toBeNull();
    expect(r.source).toBe('none');
  }, 60_000);

  it('campusOps: a co-op match (any seed) and a solo restart (seed + 1) share the shipped lamp key', () => {
    expect(campusKey(2)).toBe(campusKey(1));
    expect(campusKey(987654)).toBe(campusKey(1));
  }, 120_000);
});

describe('shipped bake: the prebake uses the game key', () => {
  it('the plan module imports lampKeyOf from src/world/lightBake.ts (no copy) and builds the key the game builds', () => {
    const src = readFileSync(new URL('../scripts/prebake/plan.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/import \{[^}]*\blampKeyOf\b[^}]*\} from '\.\.\/\.\.\/src\/world\/lightBake';/);
    expect(src).not.toMatch(/function lampKeyOf|lamps:\$\{/);
    expect(buildCampus().key).toBe(campusKey(1));
  }, 120_000);
});

/** Three sections along x, walls with a doorway between them (`tests/sectionBake.test.ts`' strip). */
const DEF: SectionBakeDef = {
  regions: [[[0, 0, 18, 12]], [[18, 0, 36, 12]], [[36, 0, 54, 12]]],
};

function strip() {
  const b = new LevelBuilder();
  b.box(27, -0.1, 6, 56, 0.2, 14, '#888');
  b.box(-0.1, 1.5, 6, 0.2, 3, 12, '#888');
  b.box(54.1, 1.5, 6, 0.2, 3, 12, '#888');
  b.box(27, 1.5, -0.1, 54, 3, 0.2, '#888');
  b.box(27, 1.5, 12.1, 54, 3, 0.2, '#888');
  for (const x of [18, 36]) {
    b.box(x, 1.5, 2.7, 0.2, 3, 5.4, '#888');
    b.box(x, 1.5, 9.3, 0.2, 3, 5.4, '#888');
  }
  b.box(8, 1, 4, 3, 2, 0.6, '#888');
  b.box(44, 0.5, 8, 1, 1, 1, '#888');
  for (const [x, z] of [[5, 6], [12, 9], [17.6, 3], [24, 6], [31, 4], [36, 6], [42, 6], [50, 5]] as const) b.lights.add({ x, y: 2.8, z, radius: 4, intensity: 1 });
  b.lights.ambient = 0.2;
  const set = canonicalLightSet(b.boxes, b.cylinders, 'section-strip', false);
  return { set, baked: bakedLights(b.lights) };
}

const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
const KEY = 'lamps:strip:test';

/** The strip's lamps baked one by one (the prebake's shard path), grouped by lowest section as the join groups them. */
function shippedFiles() {
  const { set, baked } = strip();
  const L = baked.lights;
  const n = L.length / LAMP_STRIDE;
  const parts: LampResult[] = [];
  for (let i = 0; i < n; i++) parts.push(bakeLamps({ kind: 'lamps', id: i, shapes: set.shapes, lights: L.slice(i * LAMP_STRIDE, (i + 1) * LAMP_STRIDE), lo: set.lo, hi: set.hi }));
  const masks = lampSectionMasks(L, DEF);
  const groups: number[][] = [[], [], [], []];
  for (let i = 0; i < n; i++) groups[masks[i] ? 31 - Math.clz32(masks[i]! & -masks[i]!) : 3]!.push(i);
  const body = new Map<string, Uint8Array>();
  const files: ShippedFile[] = [];
  groups.forEach((ids, k) => {
    if (!ids.length) return;
    const raw = packLamps(ids, ids.map((i) => parts[i]!));
    const gz = new Uint8Array(gzipSync(raw, { level: 9 }));
    const name = `strip-abc-s${k}.bin.gz`;
    body.set(name, gz);
    files.push({ name, bytes: gz.length, sha256: sha(gz), rawBytes: raw.length, rawSha256: sha(raw), lampIds: ids });
  });
  const manifest: ShippedManifest = { map: 'strip', key: KEY, lampVersion: LAMP_VERSION, canonVersion: CANON_VERSION, lamps: n, files };
  return { set, baked, parts, body, manifest };
}

/** A same-origin server under `/b/`: the manifest and the files. */
function server(manifest: ShippedManifest, body: Map<string, Uint8Array>): { fetchFn: typeof fetch; urls: string[] } {
  const urls: string[] = [];
  const fetchFn = (async (u: string | URL | Request) => {
    const url = String(u);
    urls.push(url);
    if (url === '/b/bakes/strip.json') return new Response(JSON.stringify(manifest), { status: 200 });
    const m = /^\/b\/bakes\/([^/]+)$/.exec(url);
    const b = m ? body.get(m[1]!) : undefined;
    return b ? new Response(b.slice(), { status: 200 }) : new Response('', { status: 404 });
  }) as typeof fetch;
  return { fetchFn, urls };
}

describe('shipped bake: parity and misses', () => {
  const S = shippedFiles();
  const read = (manifest: ShippedManifest, body: Map<string, Uint8Array>, key = KEY) =>
    readShippedLamps({ mapId: 'strip', key, lights: S.baked.lights, lo: S.set.lo, hi: S.set.hi, base: '/b/', fetchFn: server(manifest, body).fetchFn });
  const clone = (): ShippedManifest => JSON.parse(JSON.stringify(S.manifest)) as ShippedManifest;

  it('packs and unpacks every lamp as baked', () => {
    const ids = [3, 0, 7];
    const u = unpackLamps(packLamps(ids, ids.map((i) => S.parts[i]!)))!;
    expect(Array.from(u.ids)).toEqual(ids);
    ids.forEach((i, k) => {
      const a = S.parts[i]!;
      const b = u.parts[k]!;
      expect(Array.from(b.boxes)).toEqual(Array.from(a.boxes));
      expect(Buffer.from(b.vis).equals(Buffer.from(a.vis))).toBe(true);
      expect(Array.from(b.bounce!.boxes)).toEqual(Array.from(a.bounce!.boxes));
      expect(Array.from(b.bounce!.data)).toEqual(Array.from(a.bounce!.data));
      expect(Array.from(b.bounce!.bits!)).toEqual(Array.from(a.bounce!.bits!));
    });
  });

  it('read back through the files equals the section baker joined result byte for byte', async () => {
    const sb = new SectionBaker({ shapes: S.set.shapes, lights: S.baked.lights, lo: S.set.lo, hi: S.set.hi, masks: lampSectionMasks(S.baked.lights, DEF), sections: 3, key: null });
    sb.start();
    await sb.finished;
    expect(sb.done).toBe(true);
    const r = (await read(S.manifest, S.body))!;
    expect(r).not.toBeNull();
    const want = sb.result;
    expect(Buffer.from(new Uint8Array(r.boxes.buffer)).equals(Buffer.from(new Uint8Array(want.boxes.buffer)))).toBe(true);
    expect(Buffer.from(r.vis).equals(Buffer.from(want.vis))).toBe(true);
    expect(Array.from(r.bounce!.boxes)).toEqual(Array.from(want.bounce!.boxes));
    expect(Array.from(r.bounce!.data)).toEqual(Array.from(want.bounce!.data));
    expect(Array.from(r.bounce!.bits!)).toEqual(Array.from(want.bounce!.bits!));
    expect(S.manifest.files.length).toBeGreaterThan(1);
  }, 120_000);

  it('null on another key, another LAMP_VERSION, a missing, short or changed file, a bad magic', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    expect(await read(S.manifest, S.body, `${KEY}x`)).toBeNull();
    const v = clone();
    v.lampVersion = LAMP_VERSION + 1;
    expect(await read(v, S.body)).toBeNull();
    const f0 = S.manifest.files[0]!.name;
    const gone = new Map(S.body);
    gone.delete(f0);
    expect(await read(S.manifest, gone)).toBeNull();
    const short = new Map(S.body);
    short.set(f0, S.body.get(f0)!.slice(0, -9));
    expect(await read(S.manifest, short)).toBeNull();
    const hash = clone();
    hash.files[0]!.sha256 = '0'.repeat(64);
    expect(await read(hash, S.body)).toBeNull();
    // a bad magic with matching sizes and hashes (the format check itself)
    const ids0 = S.manifest.files[0]!.lampIds;
    const raw = packLamps(ids0, ids0.map((i) => S.parts[i]!));
    raw[0] = 0x58;
    const gz = new Uint8Array(gzipSync(raw));
    const magic = clone();
    Object.assign(magic.files[0]!, { bytes: gz.length, sha256: sha(gz), rawBytes: raw.length, rawSha256: sha(raw) });
    const bad = new Map(S.body);
    bad.set(f0, gz);
    expect(await read(magic, bad)).toBeNull();
    expect(info.mock.calls.length).toBe(6);
    for (const c of info.mock.calls) expect(String(c[0])).toMatch(/^\[bake\] shipped miss: /);
    info.mockRestore();
  }, 60_000);

  it('a server that decoded the gzip (plain packed bytes) still reads; another host never', async () => {
    const plain = new Map<string, Uint8Array>();
    for (const f of S.manifest.files) plain.set(f.name, packLamps(f.lampIds, f.lampIds.map((i) => S.parts[i]!)));
    const r = await read(S.manifest, plain);
    expect(r).not.toBeNull();
    const all = Int32Array.from({ length: S.parts.length }, (_, i) => i);
    expect(Buffer.from(r!.vis).equals(Buffer.from(joinShipped(S.baked.lights, S.set.lo, S.set.hi, all, S.parts)!.vis))).toBe(true);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const srv = server(S.manifest, S.body);
    expect(await readShippedLamps({ mapId: 'strip', key: KEY, lights: S.baked.lights, lo: S.set.lo, hi: S.set.hi, base: 'https://cdn.example.com/', fetchFn: srv.fetchFn })).toBeNull();
    expect(srv.urls).toEqual([]);
    info.mockRestore();
  }, 60_000);

  it('unpackLamps: null on a bad magic, format or length; joinShipped: null on a missing or doubled lamp', () => {
    const p = packLamps([0, 1], [S.parts[0]!, S.parts[1]!]);
    expect(unpackLamps(p)).not.toBeNull();
    const m = p.slice();
    m[1] = 0;
    expect(unpackLamps(m)).toBeNull();
    const f = p.slice();
    f[4] = 2;
    expect(unpackLamps(f)).toBeNull();
    expect(unpackLamps(p.slice(0, -1))).toBeNull();
    expect(unpackLamps(new Uint8Array([...p, 0, 0]))).toBeNull();
    expect(unpackLamps(p.slice(0, 8))).toBeNull();
    const n = S.parts.length;
    const ids = Int32Array.from({ length: n }, (_, i) => i);
    expect(joinShipped(S.baked.lights, S.set.lo, S.set.hi, ids, S.parts)).not.toBeNull();
    const twice = ids.slice();
    twice[1] = 0;
    expect(joinShipped(S.baked.lights, S.set.lo, S.set.hi, twice, S.parts)).toBeNull();
    expect(joinShipped(S.baked.lights, S.set.lo, S.set.hi, ids.slice(0, -1), S.parts.slice(0, -1))).toBeNull();
  });
});

describe('shipped bake: the cache write at the release (SB14)', () => {
  it('markPlaying caches a finished, not-yet-saved result once', async () => {
    const save = vi.mocked(saveLamps);
    save.mockClear();
    const { set, baked } = strip();
    const sb = new SectionBaker({ shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi, masks: lampSectionMasks(baked.lights, DEF), sections: 3, key: 'lamps:release' });
    // (the match plays while the bake finishes: the write waits)
    sb.markPlaying();
    sb.start();
    await sb.finished;
    expect(sb.saveDue).toBe(true);
    expect(save).not.toHaveBeenCalled();
    // (the next release on the same bake: written now, once)
    sb.markPlaying();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]![0]).toBe('lamps:release');
    expect(sb.saveDue).toBe(false);
    sb.markPlaying();
    sb.setLive(1);
    sb.dispose();
    expect(save).toHaveBeenCalledTimes(1);
  }, 120_000);
});
