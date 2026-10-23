import { hyp2 } from '../core/mathx';

/**
 * (coop-rejoin) Two-slot spawn points (Michael's Marlow walk of 4.82.0, item 4: "players should spawn in different spawn
 * points in the same area so there's no overlap") and the host-decided spawn of a client that joins or reconnects
 * while a run is in progress (item 7). Pure and Babylon-free: the level checks come in as a `SpawnProbe`
 * (`spawnPlace.ts` builds the game's from the level pieces and the static physics; the tests build one from boxes).
 *
 * A spawn area (the course start, a checkpoint airlock, a Sector Ops section start or connector checkpoint) lists one or
 * two points in map data: slot 0 is the host's (P1), slot 1 the partner's (P2). A map with one point gives the partner a
 * safe spot beside it: the first of `SPAWN.rings` x 8 directions (the slot's side first) that is clear of the level, on
 * a floor, in a straight line from the point (never through a wall or a closed door) and clear of every other player.
 */

/** A spawn point on the floor (feet) and the way it faces. */
export interface SlotPoint {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/** A plan point a spawn keeps clear of (another player's feet). */
export interface SpawnBody {
  x: number;
  y: number;
  z: number;
}

/** The level checks a spawn spot needs (the game builds them from its level; tests from boxes). */
export interface SpawnProbe {
  /** A body standing at feet (x, y, z) overlaps level geometry. */
  blocked(x: number, y: number, z: number): boolean;
  /** Nothing solid on the straight line between two feet points, at body height (no wall or closed door between). */
  open(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean;
  /** A floor under feet (x, y, z), within a step. */
  floor(x: number, y: number, z: number): boolean;
}

export const SPAWN = {
  /** How far apart two players' spawns are when a map gives one point (m): a body width and a half of room. */
  sep: 1.2,
  /** The rings tried round the point, nearest first after `sep` (m). */
  rings: [1.2, 1.7, 2.3, 0.9] as readonly number[],
  /** No spawn closer than this to another player (m, plan): two capsules (0.3 m) never touch. */
  minGap: 0.9,
  /** Height band another player counts in (m): a player on the floor above is not in the way. */
  storey: 1.5,
} as const;

/**
 * Directions round a point, as angles from its facing: right, left, back, front, then the four diagonals (back ones
 * first). Slot 1 starts on the right, slot 2 on the left, and so on.
 */
const DIRS = [Math.PI / 2, -Math.PI / 2, Math.PI, 0, (3 * Math.PI) / 4, (-3 * Math.PI) / 4, Math.PI / 4, -Math.PI / 4] as const;

/** Is feet (x, y, z) clear of every other player (plan gap, same storey)? */
export function clearOfBodies(x: number, y: number, z: number, others: readonly SpawnBody[]): boolean {
  for (let i = 0; i < others.length; i++) {
    const o = others[i]!;
    if (Math.abs(o.y - y) < SPAWN.storey && hyp2(o.x - x, o.z - z) < SPAWN.minGap) return false;
  }
  return true;
}

/** Can a body stand at feet (x, y, z): out of the level, on a floor, and clear of the other players? */
export function spotFree(x: number, y: number, z: number, others: readonly SpawnBody[], probe: SpawnProbe): boolean {
  return clearOfBodies(x, y, z, others) && !probe.blocked(x, y, z) && probe.floor(x, y, z);
}

/**
 * A safe spot beside `at` (a single spawn point, or the host): the first ring x direction spot that is free
 * (`spotFree`) and in a straight open line from `at`. `side` (1-based slot, or 1 for "beside the host") picks which
 * side is tried first. Writes `out` (facing `at`'s way) and returns true; false when nothing round it is free.
 */
export function besideSpot(at: SlotPoint, side: number, others: readonly SpawnBody[], probe: SpawnProbe, out: SlotPoint): boolean {
  const flip = side % 2 === 0 ? -1 : 1;
  const rings = SPAWN.rings;
  for (let r = 0; r < rings.length; r++) {
    const d = rings[r]!;
    for (let k = 0; k < DIRS.length; k++) {
      const a = at.yaw + DIRS[k]! * flip;
      const x = at.x + Math.sin(a) * d;
      const z = at.z + Math.cos(a) * d;
      if (!spotFree(x, at.y, z, others, probe) || !probe.open(at.x, at.y, at.z, x, at.y, z)) continue;
      out.x = x;
      out.y = at.y;
      out.z = z;
      out.yaw = at.yaw;
      return true;
    }
  }
  return false;
}

/** How a slot's spawn was found: its own map point, beside the area's first point, or (nothing free) that point. */
export type SlotSpawnKind = 'slot' | 'beside' | 'base' | 'none';

/**
 * Player slot `slot`'s spawn in an area with `points` (slot 0, slot 1 from map data; one is fine): its own point when the
 * map gives one and it is free, else a safe spot beside the area's first point (`besideSpot`), else its own point (the
 * map's, so out of the level; the partner blocker parts two bodies), else, only while the physics is not up (no floor
 * found under the area's first point), a spot beside clear of the level pieces only (`besideLoose`), else the first
 * point itself. `others` are the players already placed. 'none' when the area has no point.
 */
export function slotSpawn(points: readonly SlotPoint[], slot: number, others: readonly SpawnBody[], probe: SpawnProbe, out: SlotPoint): SlotSpawnKind {
  const base = points[0];
  if (!base) return 'none';
  const own = points[slot];
  if (own && spotFree(own.x, own.y, own.z, others, probe)) {
    copyPoint(out, own);
    return 'slot';
  }
  if (besideSpot(base, Math.max(1, slot), others, probe, out)) return 'beside';
  if (own) {
    copyPoint(out, own);
    return 'base';
  }
  // (fix round, check B polish 1) the loose try only covers a match still loading: with the physics up, a spot that
  // failed the floor or line check is never used (it could be over a ledge or past a thin wall)
  if (!probe.floor(base.x, base.y, base.z) && besideLoose(base, Math.max(1, slot), others, probe, out)) return 'beside';
  copyPoint(out, base);
  return 'base';
}

/**
 * The last try before a shared spot: the first ring x direction spot clear of the level's solid pieces and of the other
 * players, with no floor or line check (those read the physics world, which may not be up yet as a match loads). A
 * map's own slot point never gets here.
 */
export function besideLoose(at: SlotPoint, side: number, others: readonly SpawnBody[], probe: SpawnProbe, out: SlotPoint): boolean {
  const flip = side % 2 === 0 ? -1 : 1;
  const rings = SPAWN.rings;
  for (let r = 0; r < rings.length; r++) {
    const d = rings[r]!;
    for (let k = 0; k < DIRS.length; k++) {
      const a = at.yaw + DIRS[k]! * flip;
      const x = at.x + Math.sin(a) * d;
      const z = at.z + Math.cos(a) * d;
      if (!clearOfBodies(x, at.y, z, others) || probe.blocked(x, at.y, z)) continue;
      out.x = x;
      out.y = at.y;
      out.z = z;
      out.yaw = at.yaw;
      return true;
    }
  }
  return false;
}

export function copyPoint(out: SlotPoint, p: SlotPoint): SlotPoint {
  out.x = p.x;
  out.y = p.y;
  out.z = p.z;
  out.yaw = p.yaw;
  return out;
}

/** A closed, locked door leaf in plan (hinge a to free edge b): a walk cannot pass it. */
export interface LeafSeg {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

/** Do plan segments p0-p1 and q0-q1 cross (touching ends count)? */
export function segsCross(p0x: number, p0z: number, p1x: number, p1z: number, q0x: number, q0z: number, q1x: number, q1z: number): boolean {
  const d1 = cross(q0x, q0z, q1x, q1z, p0x, p0z);
  const d2 = cross(q0x, q0z, q1x, q1z, p1x, p1z);
  const d3 = cross(p0x, p0z, p1x, p1z, q0x, q0z);
  const d4 = cross(p0x, p0z, p1x, p1z, q1x, q1z);
  return d1 * d2 <= 0 && d3 * d4 <= 0 && !(d1 === 0 && d2 === 0);
}

function cross(ax: number, az: number, bx: number, bz: number, px: number, pz: number): number {
  return (bx - ax) * (pz - az) - (bz - az) * (px - ax);
}

/**
 * Does the walk (plan points [x, z] from `from` through `path`) cross a locked door's closed leaf? The nav grid does not
 * model locks (a doorway is walkable for the guards), so a checkpoint the host walked away from through a door that
 * locked behind it (a timed gate, a hold point) reads as unreachable here.
 */
export function walkCrossesLocked(fromX: number, fromZ: number, path: readonly (readonly [number, number] | readonly number[])[], leaves: readonly LeafSeg[]): boolean {
  let px = fromX;
  let pz = fromZ;
  for (let i = 0; i < path.length; i++) {
    const w = path[i]!;
    const x = w[0]!;
    const z = w[1]!;
    for (let k = 0; k < leaves.length; k++) {
      const l = leaves[k]!;
      if (segsCross(px, pz, x, z, l.ax, l.az, l.bx, l.bz)) return true;
    }
    px = x;
    pz = z;
  }
  return false;
}

/** Where the host puts a client that joins or reconnects mid-run (coop-rejoin, host-authoritative). */
export type JoinSpawnKind = 'checkpoint' | 'beside' | 'held' | 'host';

/** What the host knows when it places a (re)joining client. */
export interface JoinSpawnWorld {
  /** Course and Sector Ops: the run has sections; a joiner goes to the current one (never the course start). */
  sectioned: boolean;
  /** The current checkpoint's slot points (slot 0, slot 1; empty: none known). */
  checkpoint: readonly SlotPoint[];
  /** Can a player at the checkpoint walk to the host (a path, no locked door on it)? */
  reachable(from: SlotPoint): boolean;
  /** The host's feet and facing. */
  host: SlotPoint;
  /** Every other player (the host included) the spawn keeps clear of. */
  others: readonly SpawnBody[];
  probe: SpawnProbe;
}

/**
 * (coop-rejoin, walk item 7) The spawn of a client that joins or reconnects while a run is in progress, decided by the
 * host. Course / Sector Ops: the host's current checkpoint, at the client's slot point (or a safe spot beside the
 * checkpoint), when a player there can reach the host; else beside the host. Never the course start (unless that is
 * still the checkpoint). Other modes: where its slot was held (a reconnect), else beside the host. The last resort is
 * the host's own spot (the partner blocker parts the two bodies). `slot` is the client's player slot (1 = P2).
 */
export function joinSpawn(w: JoinSpawnWorld, slot: number, held: SlotPoint | null, out: SlotPoint): JoinSpawnKind {
  if (w.sectioned) {
    const cp = w.checkpoint[0];
    if (cp && w.reachable(cp) && slotSpawn(w.checkpoint, slot, w.others, w.probe, out) !== 'none') return 'checkpoint';
  } else if (held) {
    copyPoint(out, held);
    return 'held';
  }
  if (besideSpot(w.host, slot, w.others, w.probe, out)) return 'beside';
  copyPoint(out, w.host);
  return 'host';
}

/** A spawn area from map data: an airlock-like plan box with optional slot points (`AirlockDef.spawns`). */
export interface SpawnArea {
  box: readonly [number, number, number, number];
  floorY: number;
  /** (coop-rejoin) Slot 0 / slot 1 points (plan x, z and facing; y = `floorY`). None or one: the partner goes beside. */
  spawns?: readonly { x: number; z: number; yaw?: number }[];
}

/**
 * An area's slot points: the map's (`spawns`), else its box middle as slot 0 (the course checkpoint before coop-rejoin:
 * a solo respawn is unchanged). Facing `yaw` where a point gives none.
 */
export function areaSlotPoints(a: SpawnArea, yaw = 0): SlotPoint[] {
  const y = a.floorY + 0.05;
  if (a.spawns?.length) return a.spawns.slice(0, 2).map((p) => ({ x: p.x, y, z: p.z, yaw: p.yaw ?? yaw }));
  return [{ x: (a.box[0] + a.box[2]) / 2, y, z: (a.box[1] + a.box[3]) / 2, yaw }];
}

/** (coop-rejoin) A client's state within this of its previous one (m) is the same match going on: no walk, vault or
 *  fall moves a body this far in one state (20 a second); only a teleport or a reloaded match does. */
export const JOIN_SAME_M = 3;
/** (coop-rejoin fix round) A reloaded match's first state stands within this of a point of its start area (m): the
 *  client's slot spot there is a map point or at most a ring (`SPAWN.rings`, 2.3 m) beside the first one. */
export const JOIN_START_M = 4;
/** (coop-rejoin fix round) A jump landing within this of a restore the host sent the client (m) is that restore. */
export const JOIN_RESTORE_M = 1.5;

/**
 * (coop-rejoin, walk item 7; fix round B1) Is a state at (x, z), from a client the match went to again (`late`), its
 * (re)loaded match? `prev` is its previous accepted state (null: none, a late join or a new host: yes). Otherwise only
 * a jump of `JOIN_SAME_M` or more counts, and only when it lands in the client's start area (`start`, the slot points
 * its match loads at: the current bay's airlock, Sector Ops' first section, the map spawns; empty: anywhere) and not on
 * a restore the host sent it (`restore`). States from its old match (its page stayed open while it waited for the host)
 * and a kept-up match that moved in a gap the host did not see are not reloads.
 */
export function joinIsReload(
  prev: { x: number; z: number } | null,
  x: number,
  z: number,
  start: readonly SlotPoint[],
  restore: { x: number; z: number } | null,
): boolean {
  if (!prev) return true;
  if (hyp2(x - prev.x, z - prev.z) < JOIN_SAME_M) return false;
  if (restore && hyp2(x - restore.x, z - restore.z) < JOIN_RESTORE_M) return false;
  if (start.length === 0) return true;
  for (let i = 0; i < start.length; i++) {
    const p = start[i]!;
    if (hyp2(x - p.x, z - p.z) < JOIN_START_M) return true;
  }
  return false;
}
