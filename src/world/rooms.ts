/**
 * Room tags for close-quarters maps (pure). A room is an axis-aligned rectangle on the floor plan with a
 * display name; maps may give each room a squad that holds it. Used by the HUD room tag, the Clear mode
 * tracker and enemies holding a room.
 */
import type { EnemyKind } from '../ai/enemyDefs';

export interface RoomRect {
  id: string;
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface SquadSlot {
  kind: EnemyKind;
  x: number;
  z: number;
  /** Facing while holding (radians, 0 = +Z). */
  yaw: number;
}

export interface RoomDef extends RoomRect {
  /** Enemies that hold this room in Clear mode (positions inside the room). */
  squad?: SquadSlot[];
}

export function inRoom(r: RoomRect, x: number, z: number, margin = 0): boolean {
  return x >= r.minX - margin && x <= r.maxX + margin && z >= r.minZ - margin && z <= r.maxZ + margin;
}

/** Index of the room containing (x, z), the smallest one when rooms overlap; -1 outside every room. */
export function roomAt(rooms: readonly RoomRect[], x: number, z: number): number {
  let best = -1;
  let bestArea = Infinity;
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i]!;
    if (!inRoom(r, x, z)) continue;
    const a = (r.maxX - r.minX) * (r.maxZ - r.minZ);
    if (a < bestArea) {
      bestArea = a;
      best = i;
    }
  }
  return best;
}

/** Clamp a point into a room, `inset` metres from its walls (writes to out). */
export function clampToRoom(r: RoomRect, x: number, z: number, inset: number, out: [number, number]): [number, number] {
  const ix = Math.min(inset, (r.maxX - r.minX) / 2);
  const iz = Math.min(inset, (r.maxZ - r.minZ) / 2);
  out[0] = Math.min(r.maxX - ix, Math.max(r.minX + ix, x));
  out[1] = Math.min(r.maxZ - iz, Math.max(r.minZ + iz, z));
  return out;
}

export function roomCentre(r: RoomRect): [number, number] {
  return [(r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2];
}
