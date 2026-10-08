/**
 * Lamp bake jobs (3.2): the level's lights split across the voxel workers, the results joined in light order, cached
 * in IndexedDB (`kv`, `lamps:` keys, the newest two kept) so a map bakes once.
 */
import { dbDelete, dbGet, dbPut } from '../save/db';
import { BOX_STRIDE, LAMP_STRIDE, type LampResult } from './lampBake';
import { WorkerPool } from './workerPool';

const KEEP = 2;
const INDEX = 'lamp-cache-index';
/** Bump when the bake changes (old entries are never read again). */
export const LAMP_VERSION = 1;

export async function bakeLevelLamps(shapes: Float32Array, lights: Float32Array, lo: [number, number, number], hi: [number, number, number], key: string | null): Promise<LampResult> {
  if (key) {
    try {
      const hit = await dbGet<LampResult>('kv', key);
      if (hit && hit.boxes instanceof Float32Array && hit.vis instanceof Uint8Array && hit.boxes.length === (lights.length / LAMP_STRIDE) * BOX_STRIDE) return hit;
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
  const r: LampResult = { kind: 'lamps', id: 0, boxes, vis };
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
