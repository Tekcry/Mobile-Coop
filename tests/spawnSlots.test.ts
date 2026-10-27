import { describe, expect, it } from 'vitest';
import {
  areaSlotPoints,
  besideLoose,
  besideSpot,
  clearOfBodies,
  joinIsReload,
  joinSpawn,
  JOIN_RESTORE_M,
  JOIN_SAME_M,
  JOIN_START_M,
  segsCross,
  slotSpawn,
  SPAWN,
  walkCrossesLocked,
  type JoinSpawnWorld,
  type SlotPoint,
  type SpawnProbe,
} from '../src/game/spawnSlots';
import { hyp2 } from '../src/core/mathx';
import { SightWorld } from '../src/game/sectorCheck';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCtcourse } from '../src/world/maps/ctcourse';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';

/** (coop-rejoin, walk items 4 and 7) Two-slot spawn points, the fallback offset slot and the host's join spawn. */

/** Plan walls as axis boxes [minX, minZ, maxX, maxZ]; a body (r 0.3) overlaps one, a line through one is shut. */
function probeOf(walls: [number, number, number, number][], floorOk: (x: number, z: number) => boolean = () => true): SpawnProbe {
  const inBox = (x: number, z: number, w: [number, number, number, number], r: number): boolean => x > w[0] - r && x < w[2] + r && z > w[1] - r && z < w[3] + r;
  return {
    blocked: (x, _y, z) => walls.some((w) => inBox(x, z, w, 0.3)),
    open: (ax, _ay, az, bx, _by, bz) => {
      for (let k = 0; k <= 20; k++) {
        const t = k / 20;
        if (walls.some((w) => inBox(ax + (bx - ax) * t, az + (bz - az) * t, w, 0))) return false;
      }
      return true;
    },
    floor: (x, _y, z) => floorOk(x, z),
  };
}
const pt = (x: number, z: number, yaw = 0, y = 0): SlotPoint => ({ x, y, z, yaw });
const out = (): SlotPoint => pt(0, 0);
const open = probeOf([]);

describe('slot spawns (walk item 4)', () => {
  it('two map points: each slot takes its own, never the same spot', () => {
    const pts = [pt(0, 0), pt(1.5, 0)];
    const a = out();
    const b = out();
    expect(slotSpawn(pts, 0, [], open, a)).toBe('slot');
    expect(slotSpawn(pts, 1, [a], open, b)).toBe('slot');
    expect(a).toEqual(pts[0]);
    expect(b).toEqual(pts[1]);
    expect(hyp2(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(SPAWN.minGap);
  });

  it('one map point: the partner gets the fallback offset slot beside it (its right first, sep away, facing the same way)', () => {
    const o = out();
    expect(slotSpawn([pt(0, 0)], 1, [pt(0, 0)], open, o)).toBe('beside');
    expect(o.x).toBeCloseTo(SPAWN.sep, 5);
    expect(o.z).toBeCloseTo(0, 5);
    expect(o.yaw).toBe(0);
    // a facing turns the side with it (yaw pi/2: the right is -z)
    expect(slotSpawn([pt(0, 0, Math.PI / 2)], 1, [pt(0, 0)], open, o)).toBe('beside');
    expect(o.x).toBeCloseTo(0, 5);
    expect(o.z).toBeCloseTo(-SPAWN.sep, 5);
    // slot 2 starts on the other side
    expect(slotSpawn([pt(0, 0)], 2, [pt(0, 0)], open, o)).toBe('beside');
    expect(o.x).toBeCloseTo(-SPAWN.sep, 5);
  });

  it('the fallback slot is free of the level: a wall on the right sends it left; a wall between is never crossed', () => {
    const o = out();
    // a wall standing on the right-hand spot
    expect(slotSpawn([pt(0, 0)], 1, [pt(0, 0)], probeOf([[0.9, -1, 1.6, 1]]), o)).toBe('beside');
    expect(o.x).toBeCloseTo(-SPAWN.sep, 5);
    // a thin wall at x 0.6 between the point and every right-hand spot: the spot past it is clear but shut off
    const p = probeOf([[0.55, -5, 0.65, 5]]);
    expect(slotSpawn([pt(0, 0)], 1, [pt(0, 0)], p, o)).toBe('beside');
    expect(o.x).toBeLessThan(0.3);
    expect(p.open(0, 0, 0, o.x, 0, o.z)).toBe(true);
  });

  it('no floor (a drop beside the point): that spot is skipped', () => {
    const o = out();
    expect(besideSpot(pt(0, 0), 1, [pt(0, 0)], probeOf([], (x) => x < 0.5), o)).toBe(true);
    expect(o.x).toBeLessThan(0.5);
  });

  it('a slot point taken by another player gives way to a spot beside the area point', () => {
    const o = out();
    const pts = [pt(0, 0), pt(1.5, 0)];
    expect(slotSpawn(pts, 1, [pt(0, 0), pt(1.5, 0.2)], open, o)).toBe('beside');
    expect(clearOfBodies(o.x, o.y, o.z, [pt(0, 0), pt(1.5, 0.2)])).toBe(true);
  });

  it('a player on the floor above is not in the way; one on the same floor is', () => {
    expect(clearOfBodies(0, 0, 0, [pt(0.2, 0, 0, 3)])).toBe(true);
    expect(clearOfBodies(0, 0, 0, [pt(0.2, 0, 0, 0.5)])).toBe(false);
  });

  it('physics not up yet (no floor anywhere): a map slot point still stands; one point gets a spot clear of the level pieces', () => {
    const none = probeOf([[0.9, -1, 1.6, 1]], () => false);
    const o = out();
    expect(slotSpawn([pt(0, 0), pt(2, 0)], 1, [pt(0, 0)], none, o)).toBe('base');
    expect(o).toEqual(pt(2, 0));
    expect(slotSpawn([pt(0, 0)], 1, [pt(0, 0)], none, o)).toBe('beside');
    expect(none.blocked(o.x, 0, o.z)).toBe(false);
    expect(hyp2(o.x, o.z)).toBeGreaterThanOrEqual(SPAWN.minGap);
    expect(besideLoose(pt(0, 0), 1, [pt(0, 0)], probeOf([[-5, -5, 5, 5]]), o)).toBe(false);
  });

  it('(check B polish 1) physics up (a floor under the point): a spot that failed the floor or line check is never used', () => {
    // a 1 m platform: no floor round the point (a ledge), nothing in the way
    const ledge = probeOf([], (x, z) => hyp2(x, z) < 0.5);
    const o = out();
    expect(slotSpawn([pt(0, 0)], 1, [pt(0, 0)], ledge, o)).toBe('base');
    expect(o).toEqual(pt(0, 0));
    // a wall all round from 0.6 m: the line check shuts every ring, the loose try would cross it
    const ring = probeOf([[-3, 0.6, 3, 0.9], [-3, -0.9, 3, -0.6], [0.6, -3, 0.9, 3], [-0.9, -3, -0.6, 3]]);
    expect(besideLoose(pt(0, 0), 1, [pt(0, 0)], ring, out())).toBe(true);
    expect(slotSpawn([pt(0, 0)], 1, [pt(0, 0)], ring, o)).toBe('base');
    expect(o).toEqual(pt(0, 0));
  });

  it('nothing free round a single point: that point (the partner blocker parts the bodies); no point: none', () => {
    const o = out();
    expect(slotSpawn([pt(0, 0)], 1, [], probeOf([[-5, -5, -0.4, 5], [0.4, -5, 5, 5], [-5, -5, 5, -0.4], [-5, 0.4, 5, 5]]), o)).toBe('base');
    expect(o).toEqual(pt(0, 0));
    expect(slotSpawn([], 1, [], open, o)).toBe('none');
  });

  it('an area with map spawns lists them (y on its floor); without, its box middle is slot 0', () => {
    expect(areaSlotPoints({ box: [0, 0, 6, 6], floorY: 2, spawns: [{ x: 2, z: 3, yaw: 1 }, { x: 4, z: 3 }] }, 0.5)).toEqual([pt(2, 3, 1, 2.05), pt(4, 3, 0.5, 2.05)]);
    expect(areaSlotPoints({ box: [0, 0, 6, 6], floorY: 0 }, 0.5)).toEqual([pt(3, 3, 0.5, 0.05)]);
  });
});

describe('locked doors on a walk', () => {
  it('segments cross; a walk through a locked leaf is shut', () => {
    expect(segsCross(0, 0, 2, 0, 1, -1, 1, 1)).toBe(true);
    expect(segsCross(0, 0, 2, 0, 3, -1, 3, 1)).toBe(false);
    const leaf = { ax: 5, az: -0.5, bx: 5, bz: 0.5 };
    expect(walkCrossesLocked(0, 0, [[4, 0], [6, 0]], [leaf])).toBe(true);
    expect(walkCrossesLocked(0, 0, [[4, 0], [4, 3]], [leaf])).toBe(false);
  });
});

describe('join spawn (walk item 7): where the host puts a client joining or reconnecting mid-run', () => {
  const world = (over: Partial<JoinSpawnWorld> = {}): JoinSpawnWorld => ({
    sectioned: true,
    checkpoint: [pt(100, 0), pt(101.5, 0)],
    reachable: () => true,
    host: pt(140, 20, 0.3),
    others: [pt(140, 20)],
    probe: open,
    ...over,
  });

  it('Course / Sector Ops: the current checkpoint at its slot point, never the level start or the held spot', () => {
    const o = out();
    expect(joinSpawn(world(), 1, pt(5, 5), o)).toBe('checkpoint');
    expect(o).toEqual(pt(101.5, 0));
  });

  it('(coop4 p8-rejoin-fix) slots 2 and 3 rejoining: the checkpoint ring beside slot 0, never the held spot', () => {
    for (const slot of [2, 3]) {
      const o = out();
      expect(joinSpawn(world(), slot, pt(5, 5), o)).toBe('checkpoint');
      expect(hyp2(o.x - 100, o.z)).toBeLessThanOrEqual(2.3 + 1e-6);
      expect(hyp2(o.x - 5, o.z - 5)).toBeGreaterThan(50);
    }
  });

  it('a one-point checkpoint: the fallback slot beside it', () => {
    const o = out();
    expect(joinSpawn(world({ checkpoint: [pt(100, 0)] }), 1, null, o)).toBe('checkpoint');
    expect(hyp2(o.x - 100, o.z)).toBeCloseTo(SPAWN.sep, 5);
  });

  it('a checkpoint that cannot reach the host (a door locked behind it): beside the host instead', () => {
    const o = out();
    expect(joinSpawn(world({ reachable: () => false }), 1, null, o)).toBe('beside');
    expect(hyp2(o.x - 140, o.z - 20)).toBeCloseTo(SPAWN.sep, 5);
    expect(clearOfBodies(o.x, o.y, o.z, [pt(140, 20)])).toBe(true);
    // no checkpoint known: the same
    expect(joinSpawn(world({ checkpoint: [] }), 1, null, o)).toBe('beside');
  });

  it('other modes: a held slot comes back where it was held; a fresh join goes beside the host', () => {
    const o = out();
    expect(joinSpawn(world({ sectioned: false }), 1, pt(7, 8, 1), o)).toBe('held');
    expect(o).toEqual(pt(7, 8, 1));
    expect(joinSpawn(world({ sectioned: false }), 1, null, o)).toBe('beside');
  });

  it('placed only when its match (re)loaded: no state before, or a jump into its start area that is not a restore', () => {
    const start = [pt(2, 10), pt(2, 12)];
    expect(joinIsReload(null, 0, 0, start, null)).toBe(true);
    // a jump from where it stood to its start area: its reload
    expect(joinIsReload({ x: 140, z: 20 }, 2, 12, start, null)).toBe(true);
    expect(joinIsReload({ x: 140, z: 20 }, 2 + JOIN_START_M - 0.1, 10, start, null)).toBe(true);
    // the same match going on (under 3 m)
    expect(joinIsReload({ x: 140, z: 20 }, 141, 21, start, null)).toBe(false);
    expect(joinIsReload({ x: 0, z: 0 }, JOIN_SAME_M, 0, [], null)).toBe(true);
    // (check A P1) a kept-up match that moved 3 m or more in a gap, away from its start area: not a reload
    expect(joinIsReload({ x: 140, z: 20 }, 145, 20, start, null)).toBe(false);
    // a jump onto a restore the host sent: that restore, not a reload (even inside the start area)
    expect(joinIsReload({ x: 140, z: 20 }, 2, 12, start, { x: 2 + JOIN_RESTORE_M - 0.2, z: 12 })).toBe(false);
  });

  it('nothing free round the host: the host spot itself', () => {
    const o = out();
    expect(joinSpawn(world({ sectioned: false, probe: probeOf([], () => false) }), 1, null, o)).toBe('host');
    expect(o).toEqual(pt(140, 20, 0.3));
  });
});

describe('map data: the fallback slot clears the level in every spawn area', () => {
  const near = (w: SightWorld): SpawnProbe => ({ blocked: (x, y, z) => w.blocked(x, y, z, 0.3), open: () => true, floor: () => true });

  it('Marlow Yard: the start spawns are two slots apart; each airlock gives slot 1 a clear spot inside it', () => {
    const b = new LevelBuilder();
    const lay = buildCtcourse(b).layout;
    const w = new SightWorld(b.boxes, b.cylinders);
    const s = lay.playerSpawns;
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(hyp2(s[0]!.pos.x - s[1]!.pos.x, s[0]!.pos.z - s[1]!.pos.z)).toBeGreaterThanOrEqual(SPAWN.minGap);
    for (const a of lay.course!.def.airlocks) {
      const pts = areaSlotPoints(a);
      const o = out();
      const k = slotSpawn(pts, 1, [pts[0]!], near(w), o);
      expect(k, a.id).not.toBe('base');
      expect(w.blocked(o.x, o.y, o.z, 0.3), a.id).toBe(false);
      expect(o.x, a.id).toBeGreaterThan(Math.min(a.box[0], a.box[2]));
      expect(o.x, a.id).toBeLessThan(Math.max(a.box[0], a.box[2]));
      expect(o.z, a.id).toBeGreaterThan(Math.min(a.box[1], a.box[3]));
      expect(o.z, a.id).toBeLessThan(Math.max(a.box[1], a.box[3]));
    }
  });

  it('Sector Ops (warehouse): every section start and connector checkpoint has a clear slot 1', () => {
    const b = new LevelBuilder();
    warehouseOps.build(b, 0);
    const w = new SightWorld(b.boxes, b.cylinders);
    for (const s of WAREHOUSE_SECTORS) {
      const areas = [[s.start, s.start2], [s.connector?.checkpoint, s.connector?.checkpoint2]] as const;
      for (const [p0, p1] of areas) {
        if (!p0) continue;
        const pts = p1 ? [{ ...p0 }, { ...p1 }] : [{ ...p0 }];
        const o = out();
        expect(slotSpawn(pts, 1, [pts[0]!], near(w), o), s.id).not.toBe('base');
        expect(w.blocked(o.x, o.y, o.z, 0.3), s.id).toBe(false);
      }
    }
  });
});
