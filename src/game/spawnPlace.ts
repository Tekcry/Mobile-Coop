import { Vector3 } from '../core/babylon';
import { hyp2 } from '../core/mathx';
import { MOVEMENT } from '../config/movement';
import { G } from '../physics/groups';
import type { GameState } from './gameState';
import { SightWorld } from './sectorCheck';
import { JOIN_START_M, slotSpawn, walkCrossesLocked, type LeafSeg, type SlotPoint, type SlotSpawnKind, type SpawnBody, type SpawnProbe } from './spawnSlots';
import { courseSlotPoints, courseStartCheckpoint } from './modes/courseMode';
import { boundMissionId, missionStartIndex, missionStartSector, pickMission } from './mission/sectorMission';
import type { MissionDef } from './mission/missionDef';
import type { SectorDef } from './sectors';
import { sectorStartIndex } from './sectorStart';
import { flags } from '../core/flags';

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
 * (mission-framework NET3) A player at (x, y, z) is outside the current section: farther than `JOIN_START_M` from every
 * point of the `checkpoint` slot points and unable to walk to the first (`canWalk`: a locked connector door between, or
 * no path). The host's check on a remote's first state in Sector Ops (a client that started in another section).
 */
export function offSection(g: GameState, checkpoint: readonly SlotPoint[], x: number, y: number, z: number): boolean {
  const cp = checkpoint[0];
  if (!cp) return false;
  for (const p of checkpoint) if (hyp2(p.x - x, p.z - z) < JOIN_START_M) return false;
  return !canWalk(g, { x, y, z, yaw: 0 }, cp);
}

/**
 * (coop-rejoin, walk item 4) The slot points of the area a match starts in: a course's start checkpoint (bay 1: the
 * map's spawns; a bay-N start: that bay's entry airlock), Sector Ops' first section start (`start`, `start2`), else the
 * map's first two player spawns. Slot 0 is the host's, slot 1 the partner's. `bay`: the course bay the match starts at
 * (default this match's; the host passes the bay a late `start` sent the client, `NetSession.lateBay`). `mission`: the
 * Sector Ops mission whose start section it is (default this page's `?mission=`; (NET3) a co-op client passes the one
 * the host's `start` carried, null for none).
 */
export function startSlotPoints(g: GameState, bay = g.opts.courseBay ?? 1, mission: string | null = boundMissionId(g.opts)): SlotPoint[] {
  if (g.opts.mode === 'course' && g.world.layout.course) return courseSlotPoints(g, courseStartCheckpoint(g, bay));
  if (g.opts.mode === 'sector') {
    // (campaign-mode CM3) a co-op start at a later section (the start's `bay`, `flags.campaign`) starts there
    const at = flags.campaign ? sectorResumePoints(g.world.map.sectors, g.world.map.missions, mission, g.opts.sectorStart ?? 1) : null;
    if (at) return at;
    // (mission-framework EN4, A23) a `?mission=` that starts at a later section starts there
    const s = missionStartSector(g.world.map.sectors, g.world.map.missions, mission);
    if (s) return s.start2 ? [{ ...s.start }, { ...s.start2 }] : [{ ...s.start }];
  }
  return g.world.layout.playerSpawns.slice(0, 2).map((p) => ({ x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw }));
}

/**
 * (campaign-mode CM3, plan check polish 1) The slot points of a Sector Ops start at section `start` (1-based, past 1),
 * where the host's run puts its checkpoint: with a mission, the section's own start (`applyMissionResume` through
 * `applyMissionStart`; not before the mission's start section); plain Sector Ops, the checkpoint of the connector before
 * it (the start-at-section path, `applySectorStart`). Null: start 1, a section the run cannot start at, or no sectors.
 */
export function sectorResumePoints(sectors: readonly SectorDef[] | undefined, missions: readonly MissionDef[] | undefined, mission: string | null, start: number): SlotPoint[] | null {
  if (!sectors || !Number.isInteger(start) || start < 2) return null;
  const i = start - 1;
  const def = pickMission(missions, mission);
  if (def) {
    const s = sectors[i];
    if (!s || i < missionStartIndex(def, sectors)) return null;
    return s.start2 ? [{ ...s.start }, { ...s.start2 }] : [{ ...s.start }];
  }
  if (sectorStartIndex(sectors, start) !== i) return null;
  const c = sectors[i - 1]!.connector!;
  return c.checkpoint2 ? [{ ...c.checkpoint }, { ...c.checkpoint2 }] : [{ ...c.checkpoint }];
}

/** Player slot `slot`'s spot in an area (`slotSpawn` with this level's checks); `others` are the players placed. */
export function placeSlot(g: GameState, points: readonly SlotPoint[], slot: number, others: readonly SpawnBody[], out: SlotPoint): SlotSpawnKind {
  return slotSpawn(points, slot, others, spawnProbe(g), out);
}
