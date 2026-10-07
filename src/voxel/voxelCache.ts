/**
 * Voxel cache (3.0): chunk results (meshes + bricks) in IndexedDB (`kv`, keys `voxel:<map>:<seed>:<size>:<version>`),
 * so a map loads in about a second the second time. Only the newest few entries are kept.
 */
import { dbDelete, dbGet, dbKeys, dbPut } from '../save/db';
import type { ChunkResult } from './chunk';

const KEEP = 4;
const INDEX = 'voxel-cache-index';

export async function loadVoxelCache(key: string): Promise<ChunkResult[] | null> {
  try {
    const r = await dbGet<ChunkResult[]>('kv', key);
    return Array.isArray(r) && r.length ? r : null;
  } catch {
    return null;
  }
}

export async function saveVoxelCache(key: string, results: ChunkResult[]): Promise<void> {
  try {
    await dbPut('kv', key, results);
    const idx = ((await dbGet<string[]>('kv', INDEX)) ?? []).filter((k) => k !== key);
    idx.unshift(key);
    for (const old of idx.slice(KEEP)) await dbDelete('kv', old);
    await dbPut('kv', INDEX, idx.slice(0, KEEP));
    // (stray keys from an older index format)
    for (const k of await dbKeys('kv')) if (k.startsWith('voxel:') && !idx.slice(0, KEEP).includes(k)) await dbDelete('kv', k);
  } catch {
    /* a full or unavailable store just means no cache */
  }
}
