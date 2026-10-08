/**
 * The canonical light-bake shapes (3.6, pure): what the lamp and moon bakes see, identical on every device, preset
 * and detail tier (bible 5.1, L1). Built straight from the level's pieces - never from what a renderer draws:
 * every visible blockout box and cylinder at least `CANON_MIN_THICK` thick, plus the Medium box dressing the phone
 * look also draws. Anything that exists only at higher tiers (the voxel art layer's dressing, the fine layer's
 * props, the Ultra / Epic wall and floor clutter) is left out; gameplay never reads it either.
 */
import type { BoxPiece, CylPiece } from '../world/levelBuilder';
import { detailPieces } from '../world/detailPass';
import { packShapes, shapeBounds, SHAPE_STRIDE, type VoxelShape } from './shapes';

/** Thinner pieces (skirting, decals, wire) are left out: the bake grows every shape by half a cell anyway. */
export const CANON_MIN_THICK = 0.05;
/** The dressing tier every device agrees on (the phone look's). */
export const CANON_DRESSING = 'medium' as const;
/** Bump when the canonical set changes (part of the bake keys). */
export const CANON_VERSION = 1;

/** The canonical shapes: structure boxes, cylinders, then the Medium dressing (deterministic order). */
export function canonicalLightShapes(boxes: readonly BoxPiece[], cylinders: readonly CylPiece[], mapId: string): VoxelShape[] {
  const out: VoxelShape[] = [];
  const base = boxes.filter((b) => !b.detail);
  const add = (b: BoxPiece): void => {
    if (b.visible === false || Math.min(b.s[0], b.s[1], b.s[2]) < CANON_MIN_THICK) return;
    out.push({ kind: 'box', c: b.c, s: b.s, yaw: b.yaw, pitch: b.pitch, mat: 1 });
  };
  for (const b of base) add(b);
  for (const c of cylinders) {
    if (Math.min(c.r * 2, c.h) < CANON_MIN_THICK) continue;
    out.push({ kind: 'cyl', c: c.c, r: c.r, h: c.h, mat: 1 });
  }
  for (const b of detailPieces(base, mapId, CANON_DRESSING)) add(b);
  return out;
}

/** The bake's world box: the shapes' bounds grown by a metre and snapped out to whole metres (every grid lines up). */
export function canonicalBounds(packed: Float32Array): { lo: [number, number, number]; hi: [number, number, number] } {
  const n = packed.length / SHAPE_STRIDE;
  const lo: [number, number, number] = [Infinity, Infinity, Infinity];
  const hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const bb = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    shapeBounds(packed, i, bb);
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k]!, bb[k]!);
      hi[k] = Math.max(hi[k]!, bb[k + 3]!);
    }
  }
  if (n === 0) return { lo: [0, 0, 0], hi: [1, 1, 1] };
  for (let k = 0; k < 3; k++) {
    lo[k] = Math.floor(lo[k]! - 1);
    hi[k] = Math.ceil(hi[k]! + 1);
  }
  return { lo, hi };
}

/** FNV-1a over bytes (cache keys and the parity hash); `seed` chains calls. */
export function fnv(bytes: Uint8Array, seed = 2166136261): number {
  let h = seed;
  for (let i = 0; i < bytes.length; i++) h = Math.imul(h ^ bytes[i]!, 16777619);
  return h >>> 0;
}

/** The canonical shapes packed, with their bounds and content hash (base 36). */
export function canonicalLightSet(boxes: readonly BoxPiece[], cylinders: readonly CylPiece[], mapId: string): { shapes: Float32Array; lo: [number, number, number]; hi: [number, number, number]; hash: string } {
  const shapes = packShapes(canonicalLightShapes(boxes, cylinders, mapId));
  const { lo, hi } = canonicalBounds(shapes);
  return { shapes, lo, hi, hash: fnv(new Uint8Array(shapes.buffer, shapes.byteOffset, shapes.byteLength)).toString(36) };
}
