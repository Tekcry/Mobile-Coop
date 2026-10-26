/**
 * (map-ready S4, fix (2)) The campus lamps shipped pre-built (`docs/map-ready/briefs/S4.md`, BRIEF A15); (piano SO2)
 * every map in `SHIPPED_BAKE_MAPS` the same way. `npm run build` bakes their lamps in Node first (`scripts/prebake.mjs`,
 * the same `bakeLamps` the workers run, one lamp per job) and the build ships them as `bakes/<map>.json` (the manifest)
 * and gzip files of packed lamps (`<map>-<h>-s<k>.bin.gz`). A load that misses the IndexedDB cache reads them (`readShippedLamps`) only when the
 * manifest's key is the game's own key (`lampKeyOf`): a stale file is never read (the PC bakes as today). The joined
 * result is the section baker's (`voxel/sectionJobs.ts` landing + `joinBounce`), byte for byte: the picture, the meter
 * and the guards read the same bytes (light parity).
 * Pure but for `readShippedLamps` (fetch, `crypto.subtle`, `DecompressionStream`); no Babylon. Load time only.
 *
 * Packed lamps (`packLamps`, little-endian, every array 4-byte aligned but the u16 tail, which is 2-byte aligned):
 * magic `NSLB`, u32 format, u32 lamp count; per lamp u32 id, `BOX_STRIDE` f32 box, u32 vis length,
 * `BOUNCE_BOX_STRIDE` i32 bounce box, u32 bounce length; then every vis (padded to 4 bytes), every bounce `data`, every
 * bounce `bits`.
 */
import { BOX_STRIDE, LAMP_STRIDE, type LampResult } from '../voxel/lampBake';
import { BOUNCE_BOX_STRIDE } from '../voxel/lampBounce';
import { LAMP_VERSION } from '../voxel/lampJobs';
import { CANON_VERSION } from '../voxel/lightShapes';
import { joinBounce, lampLayout, type BouncePart } from './sectionBake';

/** One shipped file: its gzip size and sha256 (hex), the packed bytes' size and sha256 (a server that decoded the
 *  gzip hands over those), and the lamps (bake indices) it holds. */
export interface ShippedFile {
  name: string;
  bytes: number;
  sha256: string;
  rawBytes: number;
  rawSha256: string;
  lampIds: number[];
}

/** `bakes/<map>.json`: read only when every field matches the game's own. */
export interface ShippedManifest {
  map: string;
  key: string;
  lampVersion: number;
  canonVersion: number;
  lamps: number;
  files: ShippedFile[];
}

/**
 * (piano SO2) The maps whose lamps ship pre-built: `scripts/prebake/plan.ts` bakes exactly these and the game reads
 * `bakes/<id>.json` for exactly these (`world/lightBake.ts`). A map with a section split (`sectionBakeFor`) ships one
 * file per section, a map without (thornbeckMill) one file.
 */
export const SHIPPED_BAKE_MAPS: readonly string[] = ['campusOps', 'thornbeckMill'];

/** Does the bake id `mapId` ship its lamps pre-built? (`?fullbright`'s own id never does.) */
export function shipsBake(mapId: string): boolean {
  return SHIPPED_BAKE_MAPS.includes(mapId);
}

/** `NSLB` */
const MAGIC = 0x424c534e;
export const SHIPPED_FORMAT = 1;
const HEAD = 12;
/** Per lamp: id, box, vis length, bounce box, bounce length. */
const PER_LAMP = 4 + BOX_STRIDE * 4 + 4 + BOUNCE_BOX_STRIDE * 4 + 4;
const LE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

const pad4 = (n: number): number => (n + 3) & ~3;

/** Pack single-lamp bake results (`bakeLamps` of one lamp each) under their bake indices. */
export function packLamps(ids: readonly number[], parts: readonly LampResult[]): Uint8Array {
  const n = ids.length;
  if (parts.length !== n) throw new Error(`packLamps: ${n} ids, ${parts.length} parts`);
  let visLen = 0;
  let bLen = 0;
  for (const p of parts) {
    if (p.boxes.length !== BOX_STRIDE) throw new Error('packLamps: one lamp per part');
    visLen += p.vis.length;
    bLen += p.bounce?.data.length ?? 0;
  }
  const visAt = HEAD + n * PER_LAMP;
  const dataAt = visAt + pad4(visLen);
  const bitsAt = dataAt + bLen * 2;
  const out = new Uint8Array(bitsAt + bLen * 2);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, MAGIC, true);
  dv.setUint32(4, SHIPPED_FORMAT, true);
  dv.setUint32(8, n, true);
  let o = HEAD;
  let v = visAt;
  let d = dataAt;
  let t = bitsAt;
  for (let k = 0; k < n; k++) {
    const p = parts[k]!;
    dv.setUint32(o, ids[k]!, true);
    o += 4;
    for (let j = 0; j < BOX_STRIDE; j++, o += 4) dv.setFloat32(o, p.boxes[j]!, true);
    dv.setUint32(o, p.vis.length, true);
    o += 4;
    const b = p.bounce;
    for (let j = 0; j < BOUNCE_BOX_STRIDE; j++, o += 4) dv.setInt32(o, b?.boxes[j] ?? 0, true);
    const len = b?.data.length ?? 0;
    dv.setUint32(o, len, true);
    o += 4;
    out.set(p.vis, v);
    v += p.vis.length;
    // (a bounce without its wall bits: zero bits, as `joinBounce` leaves them)
    const bits = b?.bits && b.bits.length === len ? b.bits : null;
    for (let j = 0; j < len; j++, d += 2, t += 2) {
      dv.setUint16(d, b!.data[j]!, true);
      dv.setUint16(t, bits ? bits[j]! : 0, true);
    }
  }
  return out;
}

/** `len` u16 values at byte `at` (little-endian). */
function readU16(bytes: Uint8Array, dv: DataView, at: number, len: number): Uint16Array {
  if (LE) return new Uint16Array(bytes.slice(at, at + len * 2).buffer);
  const out = new Uint16Array(len);
  for (let j = 0; j < len; j++) out[j] = dv.getUint16(at + j * 2, true);
  return out;
}

/** The lamps in packed bytes, or null (a bad magic, format or length). */
export function unpackLamps(bytes: Uint8Array): { ids: Int32Array; parts: LampResult[] } | null {
  if (bytes.length < HEAD) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== MAGIC || dv.getUint32(4, true) !== SHIPPED_FORMAT) return null;
  const n = dv.getUint32(8, true);
  const visAt = HEAD + n * PER_LAMP;
  if (visAt > bytes.length) return null;
  let visLen = 0;
  let bLen = 0;
  for (let k = 0, o = HEAD; k < n; k++, o += PER_LAMP) {
    visLen += dv.getUint32(o + 4 + BOX_STRIDE * 4, true);
    bLen += dv.getUint32(o + PER_LAMP - 4, true);
  }
  const dataAt = visAt + pad4(visLen);
  const bitsAt = dataAt + bLen * 2;
  if (bitsAt + bLen * 2 !== bytes.length) return null;
  const ids = new Int32Array(n);
  const parts: LampResult[] = [];
  let v = visAt;
  let d = dataAt;
  let t = bitsAt;
  for (let k = 0, o = HEAD; k < n; k++) {
    ids[k] = dv.getUint32(o, true);
    o += 4;
    const boxes = new Float32Array(BOX_STRIDE);
    for (let j = 0; j < BOX_STRIDE; j++, o += 4) boxes[j] = dv.getFloat32(o, true);
    const vl = dv.getUint32(o, true);
    o += 4;
    const bBox = new Int32Array(BOUNCE_BOX_STRIDE);
    for (let j = 0; j < BOUNCE_BOX_STRIDE; j++, o += 4) bBox[j] = dv.getInt32(o, true);
    const bl = dv.getUint32(o, true);
    o += 4;
    const vis = bytes.slice(v, v + vl);
    v += vl;
    const data = readU16(bytes, dv, d, bl);
    const bits = readU16(bytes, dv, t, bl);
    d += bl * 2;
    t += bl * 2;
    parts.push({ kind: 'lamps', id: ids[k]!, boxes, vis, bounce: { boxes: bBox, data, bits } });
  }
  return { ids, parts };
}

/**
 * The shipped lamps joined as the section baker joins its landings (`voxel/sectionJobs.ts` `landed` + `joinBounce`):
 * each lamp's `vis` at its `lampLayout` offset, its bounce part (or none). Null unless every lamp is there exactly once
 * with the layout's box and cell count.
 */
export function joinShipped(lights: Float32Array, lo: readonly number[], hi: readonly number[], ids: Int32Array, parts: readonly LampResult[]): LampResult | null {
  const n = lights.length / LAMP_STRIDE;
  if (ids.length !== n || parts.length !== n) return null;
  const lay = lampLayout(lights, lo, hi);
  const B = lay.boxes;
  const vis = new Uint8Array(lay.cells);
  const seen = new Uint8Array(n);
  const bp: (BouncePart | null)[] = new Array<BouncePart | null>(n).fill(null);
  for (let k = 0; k < n; k++) {
    const i = ids[k]!;
    const p = parts[k]!;
    if (i < 0 || i >= n || seen[i]) return null;
    seen[i] = 1;
    for (let j = 0; j < BOX_STRIDE; j++) if (p.boxes[j] !== B[i * BOX_STRIDE + j]) return null;
    if (p.vis.length !== B[i * BOX_STRIDE + 3]! * B[i * BOX_STRIDE + 4]! * B[i * BOX_STRIDE + 5]!) return null;
    vis.set(p.vis, lay.at[i]!);
    const b = p.bounce;
    bp[i] = b && b.data.length ? { box: b.boxes, data: b.data, bits: b.bits ?? new Uint16Array(0) } : null;
  }
  return { kind: 'lamps', id: 0, boxes: B, vis, bounce: joinBounce(bp) };
}

const GZIP = (b: Uint8Array): boolean => b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b;

async function sha256Hex(b: Uint8Array<ArrayBuffer>): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', b));
  let s = '';
  for (let i = 0; i < h.length; i++) s += h[i]!.toString(16).padStart(2, '0');
  return s;
}

async function gunzip(b: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const s = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

const FILE_NAME = /^[A-Za-z0-9._-]+$/;

/** A manifest that matches the game's map, key, versions and lamp count, with well-formed file entries. */
function manifestWhy(m: unknown, mapId: string, key: string, lamps: number): string | null {
  if (!m || typeof m !== 'object') return 'no manifest';
  const x = m as Partial<ShippedManifest>;
  if (x.map !== mapId) return 'another map';
  if (x.key !== key) return 'another key';
  if (x.lampVersion !== LAMP_VERSION) return `lamp version ${String(x.lampVersion)}`;
  if (x.canonVersion !== CANON_VERSION) return `canon version ${String(x.canonVersion)}`;
  if (x.lamps !== lamps) return `lamp count ${String(x.lamps)}`;
  if (!Array.isArray(x.files) || x.files.length === 0) return 'no files';
  let n = 0;
  for (const f of x.files) {
    if (!f || typeof f.name !== 'string' || !FILE_NAME.test(f.name) || typeof f.bytes !== 'number' || typeof f.sha256 !== 'string' || typeof f.rawBytes !== 'number' || typeof f.rawSha256 !== 'string' || !Array.isArray(f.lampIds)) return 'bad file entry';
    n += f.lampIds.length;
  }
  return n === lamps ? null : 'lamp ids';
}

/**
 * The shipped lamps of `mapId` under `key`, joined (`joinShipped`), or null with one `[bake] shipped miss: <why>` line
 * (no manifest, another key or version, a missing, short or changed file, a bad format). Same origin only: `base` is the
 * build's path (`import.meta.env.BASE_URL`; tests pass their own and a `fetchFn`).
 */
export async function readShippedLamps(o: {
  mapId: string;
  key: string;
  lights: Float32Array;
  lo: [number, number, number];
  hi: [number, number, number];
  base?: string;
  fetchFn?: typeof fetch;
}): Promise<LampResult | null> {
  const miss = (why: string): null => {
    console.info(`[bake] shipped miss: ${why}`);
    return null;
  };
  const base0 = o.base ?? import.meta.env.BASE_URL;
  // (never another host: a path on this origin only)
  if (!/^\.?\//.test(base0) || base0.startsWith('//')) return miss('base is not a path');
  const base = base0.endsWith('/') ? base0 : `${base0}/`;
  const get = o.fetchFn ?? ((u: string) => fetch(u));
  const lamps = o.lights.length / LAMP_STRIDE;
  try {
    const res = await get(`${base}bakes/${o.mapId}.json`);
    if (!res.ok) return miss(`manifest ${res.status}`);
    const m = (await res.json()) as ShippedManifest;
    const why = manifestWhy(m, o.mapId, o.key, lamps);
    if (why) return miss(why);
    const loaded = await Promise.all(
      m.files.map(async (f): Promise<{ ids: Int32Array; parts: LampResult[] } | string> => {
        const r = await get(`${base}bakes/${f.name}`);
        if (!r.ok) return `${f.name} ${r.status}`;
        let b = new Uint8Array(await r.arrayBuffer());
        if (GZIP(b)) {
          if (b.length !== f.bytes) return `${f.name} size ${b.length}`;
          if ((await sha256Hex(b)) !== f.sha256) return `${f.name} hash`;
          b = await gunzip(b);
        }
        // (a server that decoded the gzip hands over the packed bytes: checked against their own size and hash)
        if (b.length !== f.rawBytes) return `${f.name} unpacked size ${b.length}`;
        if ((await sha256Hex(b)) !== f.rawSha256) return `${f.name} unpacked hash`;
        const u = unpackLamps(b);
        if (!u) return `${f.name} format`;
        if (u.ids.length !== f.lampIds.length || u.ids.some((id, k) => id !== f.lampIds[k])) return `${f.name} lamp ids`;
        return u;
      }),
    );
    const ids = new Int32Array(lamps);
    const parts: LampResult[] = [];
    for (const u of loaded) {
      if (typeof u === 'string') return miss(u);
      ids.set(u.ids, parts.length);
      for (const p of u.parts) parts.push(p);
    }
    const r = joinShipped(o.lights, o.lo, o.hi, ids, parts);
    return r ?? miss('join');
  } catch (e) {
    return miss(e instanceof Error ? e.message : String(e));
  }
}
