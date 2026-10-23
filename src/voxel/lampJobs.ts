/**
 * Lamp bake jobs (3.2): the level's lights split across the voxel workers, the results joined in light order, cached
 * in IndexedDB (`kv`, `lamps:` keys, the newest two kept) so a map bakes once.
 */
import { dbDelete, dbGet, dbPut } from '../save/db';
import { BOX_STRIDE, LAMP_STRIDE, type LampResult } from './lampBake';
import { BOUNCE_BOX_STRIDE } from './lampBounce';
import { MOON_CELL, type MoonResult } from './skyBake';
import { WorkerPool } from './workerPool';

const KEEP = 2;
const INDEX = 'lamp-cache-index';
/**
 * Bump when the bake changes (old entries are never read again). (LR16e) 2: the contact-hardening penumbra.
 * (LR16-1) 3: the one-bounce fill joins the result; 4 (fix round): the bounce's wall bits join it and a receiver takes
 * its centre's side only. (lr16int merge-1) 5: the penumbra + bounce bake, one past both branches' numbers (LR16e 2,
 * LR16-1 4), so neither branch's caches are served: an LR16-1-alone v4 entry has the bounce and bits but no penumbra,
 * which `cacheOk` cannot see (the penumbra lives in the `vis` bytes, no field marks it); only the key can reject it.
 * (LR16-L) 6: the box grid aligned on the light point (`lampBox`): new origins and bytes.
 * (LR16-POLISH F) 7: the bounce's wall bits (`bounceBits`): a thin wall's code at its middle, a run's middle of its first
 * two sub-cells, no crossing from inside a hull past a second solid run.
 */
export const LAMP_VERSION = 7;

/** (LR16-1) A cached result holds every lamp's visibility and bounce (LR16e's penumbra: covered by `LAMP_VERSION`). */
function cacheOk(hit: LampResult | undefined, n: number): hit is LampResult {
  return (
    !!hit &&
    hit.boxes instanceof Float32Array &&
    hit.vis instanceof Uint8Array &&
    hit.boxes.length === n * BOX_STRIDE &&
    !!hit.bounce &&
    hit.bounce.boxes instanceof Int32Array &&
    hit.bounce.data instanceof Uint16Array &&
    // (LR16-1 fix round) the wall bits: a cache from before them is baked again
    hit.bounce.bits instanceof Uint16Array &&
    hit.bounce.bits.length === hit.bounce.data.length &&
    hit.bounce.boxes.length === n * BOUNCE_BOX_STRIDE
  );
}

export async function bakeLevelLamps(shapes: Float32Array, lights: Float32Array, lo: [number, number, number], hi: [number, number, number], key: string | null): Promise<LampResult> {
  if (key) {
    try {
      const hit = await dbGet<LampResult>('kv', key);
      if (cacheOk(hit, lights.length / LAMP_STRIDE)) return hit;
    } catch {
      /* no cache */
    }
  }
  const n = lights.length / LAMP_STRIDE;
  const pool = new WorkerPool();
  let parts: LampResult[];
  try {
    const per = Math.max(1, Math.ceil(n / Math.max(1, pool.size)));
    const jobs: Promise<LampResult>[] = [];
    for (let i = 0; i < n; i += per) {
      jobs.push(pool.lamps({ kind: 'lamps', id: i, shapes: shapes.slice(), lights: lights.slice(i * LAMP_STRIDE, Math.min(n, i + per) * LAMP_STRIDE), lo, hi }));
    }
    parts = await Promise.all(jobs);
  } finally {
    pool.dispose();
  }
  parts.sort((a, b) => a.id - b.id);
  const boxes = new Float32Array(n * BOX_STRIDE);
  let vlen = 0;
  for (const p of parts) vlen += p.vis.length;
  const vis = new Uint8Array(vlen);
  let bi = 0;
  let vi = 0;
  for (const p of parts) {
    boxes.set(p.boxes, bi);
    bi += p.boxes.length;
    vis.set(p.vis, vi);
    vi += p.vis.length;
  }
  // (LR16-1) the bounce, joined in light order as the visibility
  const bBoxes = new Int32Array(n * BOUNCE_BOX_STRIDE);
  let blen = 0;
  for (const p of parts) blen += p.bounce?.data.length ?? 0;
  const bData = new Uint16Array(blen);
  const bBits = new Uint16Array(blen);
  let bb = 0;
  let bd = 0;
  let msVis = 0;
  let msBounce = 0;
  for (const p of parts) {
    const pn = p.boxes.length / BOX_STRIDE;
    if (p.bounce) {
      bBoxes.set(p.bounce.boxes, bb);
      bData.set(p.bounce.data, bd);
      if (p.bounce.bits) bBits.set(p.bounce.bits, bd);
      bd += p.bounce.data.length;
    }
    bb += pn * BOUNCE_BOX_STRIDE;
    msVis += p.ms?.vis ?? 0;
    msBounce += p.ms?.bounce ?? 0;
  }
  const r: LampResult = { kind: 'lamps', id: 0, boxes, vis, bounce: { boxes: bBoxes, data: bData, bits: bBits }, ms: { vis: msVis, bounce: msBounce } };
  if (key) void saveLamps(key, r);
  return r;
}

async function saveLamps(key: string, r: LampResult): Promise<void> {
  try {
    await dbPut('kv', key, r);
    const idx = ((await dbGet<string[]>('kv', INDEX)) ?? []).filter((k) => k !== key);
    idx.unshift(key);
    for (const old of idx.slice(KEEP)) await dbDelete('kv', old);
    await dbPut('kv', INDEX, idx.slice(0, KEEP));
  } catch {
    /* a full or unavailable store just means no cache */
  }
}

const MOON_INDEX = 'moon-cache-index';
/** Bump when the moon bake changes. */
export const MOON_VERSION = 1;

/** The moon's visibility grid over [lo, hi] (whole metres; `MOON_CELL` cells), cached like the lamps. */
export async function bakeLevelMoon(shapes: Float32Array, lo: [number, number, number], hi: [number, number, number], dir: [number, number, number], key: string | null): Promise<MoonResult> {
  const n: [number, number, number] = [Math.max(1, Math.ceil((hi[0] - lo[0]) / MOON_CELL)), Math.max(1, Math.ceil((hi[1] - lo[1]) / MOON_CELL)), Math.max(1, Math.ceil((hi[2] - lo[2]) / MOON_CELL))];
  if (key) {
    try {
      const hit = await dbGet<MoonResult>('kv', key);
      if (hit && hit.vis instanceof Uint8Array && hit.vis.length === n[0] * n[1] * n[2]) return hit;
    } catch {
      /* no cache */
    }
  }
  const pool = new WorkerPool(1);
  let r: MoonResult;
  try {
    r = await pool.moon({ kind: 'moon', id: 0, origin: lo, n, shapes: shapes.slice(), dir });
  } finally {
    pool.dispose();
  }
  if (key) {
    try {
      await dbPut('kv', key, r);
      const idx = ((await dbGet<string[]>('kv', MOON_INDEX)) ?? []).filter((k) => k !== key);
      idx.unshift(key);
      for (const old of idx.slice(KEEP)) await dbDelete('kv', old);
      await dbPut('kv', MOON_INDEX, idx.slice(0, KEEP));
    } catch {
      /* a full or unavailable store just means no cache */
    }
  }
  return r;
}
