import { Vector3 } from '../core/babylon';
import { hyp2 } from '../core/mathx';
import { MOVEMENT } from '../config/movement';
import { G } from '../physics/groups';
import type { GameState } from './gameState';
import { SightWorld } from './sectorCheck';
import { slotSpawn, walkCrossesLocked, type LeafSeg, type SlotPoint, type SlotSpawnKind, type SpawnBody, type SpawnProbe } from './spawnSlots';
import { courseSlotPoints, courseStartCheckpoint } from './modes/courseMode';
import { missionParam, missionStartSector } from './mission/sectorMission';

/**
 * (coop-rejoin) The game's spawn checks (`spawnSlots.ts` is the pure side): a body overlapping the level's solid pieces
 * (`SightWorld.blocked`, the blockout gameplay reads), a straight open line from the spawn area's point (static
 * physics: walls, closed door leaves, props, fences, glass), and a floor under the feet. Built once per level; a spawn
 * decision is a rare event (a start, a respawn, a join), never a per-step check.
 */

/** What stops a walk between two spots: the world, doors, props, fences and glass (not guards or the partner). */
const WALK_MASK = G.STATIC | G.PROP | G.FENCE | G.GLASS;
/** Heights above the feet the open line is traced at (m): a knee-high crate and a chest-high wall both block. */
const LINE_HEIGHTS = [0.5, 1.3] as const;

const sights = new WeakMap<object, SightWorld>();
const probes = new WeakMap<object, SpawnProbe>();

/** The spawn probe for this match's level (cached on the level). */
export function spawnProbe(g: GameState): SpawnProbe {
  const level = g.world.level;
  const known = probes.get(level);
  if (known) return known;
  let sw = sights.get(level);
  if (!sw) {
    sw = new SightWorld(level.boxes, level.cylinders);
    sights.set(level, sw);
  }
  const w = sw;
  const a = new Vector3();
  const b = new Vector3();
  const r = MOVEMENT.radius;
  const probe: SpawnProbe = {
    blocked: (x, y, z) => w.blocked(x, y, z, r),
    open: (ax, ay, az, bx, by, bz) => {
      const dx = bx - ax;
      const dz = bz - az;
      const d = hyp2(dx, dz);
      if (d < 1e-6) return true;
      // a body's radius past the spot, so a wall just beyond it counts
      const ex = bx + (dx / d) * r;
      const ez = bz + (dz / d) * r;
      for (let i = 0; i < LINE_HEIGHTS.length; i++) {
        const h = LINE_HEIGHTS[i]!;
        a.set(ax, ay + h, az);
        b.set(ex, by + h, ez);
        if (!g.ballistics.clear(a, b, WALK_MASK)) return false;
      }
      return true;
    },
    floor: (x, y, z) => {
      a.set(x, y + 0.4, z);
      b.set(x, y - 0.45, z);
      return !g.ballistics.clear(a, b, G.STATIC | G.PROP | G.GLASS);
    },
  };
  probes.set(level, probe);
  return probe;
}

/** The closed, locked door leaves (plan, hinge to free edge): a walk cannot pass them. */
export function lockedLeaves(g: GameState, out: LeafSeg[]): LeafSeg[] {
  out.length = 0;
  for (const d of g.world.doors.list) {
    const an = d.anchor;
    if (!an.locked || d.open > 0.5) continue;
    out.push({ ax: an.hinge.x, az: an.hinge.z, bx: an.hinge.x + Math.sin(an.yaw) * an.width, bz: an.hinge.z + Math.cos(an.yaw) * an.width });
  }
  return out;
}

/** Nav expansions a reach check may spend (a whole Marlow set, both storeys). */
const REACH_EXPAND = 40000;

/**
 * Can a player at `from` walk to `to`: a nav path (the guards' grid: doorways walkable) that crosses no locked, closed
 * door. True without a nav grid (nothing to judge by: the checkpoint is where a restart puts both players).
 */
export function canWalk(g: GameState, from: SlotPoint, to: { x: number; y: number; z: number }): boolean {
  const nav = g.nav;
  if (!nav) return true;
  const path = nav.findPath([from.x, from.z], [to.x, to.z], REACH_EXPAND, from.y, to.y);
  if (!path) return false;
  return !walkCrossesLocked(from.x, from.z, path, lockedLeaves(g, []));
}

/**
 * (coop-rejoin, walk item 4) The slot points of the area a match starts in: a course's start checkpoint (bay 1: the
 * map's spawns; a bay-N start: that bay's entry airlock), Sector Ops' first section start (`start`, `start2`), else the
 * map's first two player spawns. Slot 0 is the host's, slot 1 the partner's. `bay`: the course bay the match starts at
 * (default this match's; the host passes the bay a late `start` sent the client, `NetSession.lateBay`).
 */
export function startSlotPoints(g: GameState, bay = g.opts.courseBay ?? 1): SlotPoint[] {
  if (g.opts.mode === 'course' && g.world.layout.course) return courseSlotPoints(g, courseStartCheckpoint(g, bay));
  // (mission-framework EN4, A23) a `?mission=` that starts at a later section starts there
  const s = g.opts.mode === 'sector' ? missionStartSector(g.world.map.sectors, g.world.map.missions, missionParam()) : undefined;
  if (s) return s.start2 ? [{ ...s.start }, { ...s.start2 }] : [{ ...s.start }];
  return g.world.layout.playerSpawns.slice(0, 2).map((p) => ({ x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw }));
}

/** Player slot `slot`'s spot in an area (`slotSpawn` with this level's checks); `others` are the players placed. */
export function placeSlot(g: GameState, points: readonly SlotPoint[], slot: number, others: readonly SpawnBody[], out: SlotPoint): SlotSpawnKind {
  return slotSpawn(points, slot, others, spawnProbe(g), out);
}
