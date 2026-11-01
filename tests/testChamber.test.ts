import { describe, expect, it } from 'vitest';
import { animTuneAllowed } from '../src/ui/tunerGate';
import { MAPS, DEV_MAPS, getMap } from '../src/world/maps';
import { STUDIO_MAP_ID } from '../src/anim/studio';
import { STUDIO_MAP_ID as TINY_ID } from '../src/anim/studioMapId';
import { LevelBuilder } from '../src/world/levelBuilder';
import { studio } from '../src/world/maps/studio';
import { STUDIO_PROPS } from '../src/anim/studioProps';
import { TRAV_ENTRIES } from '../src/anim/studioTraversal';

/** (G1) The Test Chamber: the animation tuner opens there only; the map is a dev scene with a spot for each of two players. */
describe('Test Chamber: the animation tuner gate', () => {
  it('opens on the studio map only', () => {
    expect(animTuneAllowed('studio')).toBe(true);
    expect(animTuneAllowed(STUDIO_MAP_ID)).toBe(true);
  });

  it('is shut on every playable map, in a menu (no map) and on an unknown id', () => {
    for (const m of MAPS) expect(animTuneAllowed(m.id)).toBe(false);
    expect(animTuneAllowed(undefined)).toBe(false);
    expect(animTuneAllowed(null)).toBe(false);
    expect(animTuneAllowed('')).toBe(false);
    expect(animTuneAllowed('Studio')).toBe(false);
    expect(animTuneAllowed('proving')).toBe(false);
  });

  it('the studio id is one constant, kept as the internal id (scripts, saves and ?autostart=studio use it)', () => {
    expect(TINY_ID).toBe('studio');
    expect(STUDIO_MAP_ID).toBe(TINY_ID);
  });
});

describe('Test Chamber: the map', () => {
  it('is named Test Chamber, keeps the id studio, and stays out of MAPS (in DEV_MAPS; getMap finds it)', () => {
    expect(studio.id).toBe('studio');
    expect(studio.name).toBe('Test Chamber');
    expect(studio.description).not.toMatch(/anim studio/i);
    expect(MAPS.some((m) => m.id === 'studio')).toBe(false);
    expect(DEV_MAPS).toContain(studio);
    expect(getMap('studio')).toBe(studio);
  });

  it('has a spawn for each of the two players: 2 m apart, clear of every solid prop', () => {
    const b = new LevelBuilder();
    const lay = studio.build(b, 0);
    expect(lay.playerSpawns).toHaveLength(2);
    const [a, p] = lay.playerSpawns;
    expect(Math.hypot(p!.pos.x - a!.pos.x, p!.pos.z - a!.pos.z)).toBeCloseTo(2, 6);
    expect(p!.pos.y).toBe(a!.pos.y);
    for (const s of lay.playerSpawns) {
      // a solid box standing on the floor (not the roof slab) within 1 m of the spot (footprint grown by 1 m) would crowd the player
      const crowded = b.boxes.some((x) => x.collide && x.c[1] + x.s[1] / 2 > 0.3 && x.c[1] - x.s[1] / 2 < 2 && Math.abs(s.pos.x - x.c[0]) < x.s[0] / 2 + 1 && Math.abs(s.pos.z - x.c[2]) < x.s[2] / 2 + 1);
      expect(crowded).toBe(false);
    }
  });

  it('(G2b) has five enemy spawns, two dummies and the props clear of every solid box, a nav seed on the ledge wall and tight cam spaces for the booth and the tunnel', () => {
    const b = new LevelBuilder();
    const lay = studio.build(b, 0);
    expect(lay.enemySpawns).toHaveLength(5);
    expect(lay.dummies).toHaveLength(2);
    expect(lay.dummies![1]!.strafe).toBeGreaterThan(0);
    expect(lay.props.map((p) => p.kind)).toEqual(['smallCrate', 'crate', 'barrel', 'explosiveBarrel', 'explosiveBarrel']);
    // (a sloped slab's footprint is shorter than its length: its true footprint is the 2.5 m run, so the slopes are left out here)
    const solid = b.boxes.filter((x) => x.collide && x.pitch === 0 && x.c[1] + x.s[1] / 2 > 0.3 && x.c[1] - x.s[1] / 2 < 2);
    const inside = (px: number, pz: number, m: number): boolean => solid.some((x) => Math.abs(px - x.c[0]) < x.s[0] / 2 + m && Math.abs(pz - x.c[2]) < x.s[2] / 2 + m);
    for (const e of lay.enemySpawns) expect(inside(e.x, e.z, 0.5), `enemy spawn ${e.x}, ${e.z}`).toBe(false);
    for (const d of lay.dummies!) expect(inside(d.pos.x, d.pos.z, 0.5), `dummy ${d.pos.x}, ${d.pos.z}`).toBe(false);
    for (const p of lay.props) expect(inside(p.pos.x, p.pos.z, 0.3), `prop ${p.kind}`).toBe(false);
    expect(lay.navSeeds).toHaveLength(1);
    expect(lay.navSeeds![0]!.y).toBeCloseTo(2.4, 6);
    // (G2c) the booth and the tunnel, then the annex's store and aisle
    expect(lay.camSpaces!.map((c) => c.size)).toEqual(['tight', 'tight', 'tight', 'tight']);
    expect(lay.camSize).toBe('open');
  });
});

/** Is (px, pz) within `m` of a solid box standing on the floor (a wall piece turned a quarter is read the right way round)? */
function solidAt(b: LevelBuilder, px: number, pz: number, m: number): boolean {
  return b.boxes.some((x) => {
    if (!x.collide || x.pitch !== 0 || !(x.c[1] + x.s[1] / 2 > 0.3 && x.c[1] - x.s[1] / 2 < 2)) return false;
    const turned = Math.abs(Math.sin(x.yaw)) > 0.7;
    const hx = (turned ? x.s[2] : x.s[0]) / 2;
    const hz = (turned ? x.s[0] : x.s[2]) / 2;
    return Math.abs(px - x.c[0]) < hx + m && Math.abs(pz - x.c[2]) < hz + m;
  });
}

/** (G2c) The dark side room off the east wall (docs/plan/TEST-CHAMBER-SPEC.md 1.4). */
describe('Test Chamber: the annex (G2c)', () => {
  const build = () => {
    const b = new LevelBuilder();
    const lay = studio.build(b, 0);
    return { b, lay };
  };
  const has = (b: LevelBuilder, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): boolean => b.boxes.some((x) => [cx, cy, cz, sx, sy, sz].every((v, i) => Math.abs((i < 3 ? x.c[i]! : x.s[i - 3]!) - v) < 1e-6));

  it('the bounds grow from x 0..28 to 0..36.3; the old east wall is the divider, its main-room face still at x 28', () => {
    const { b } = build();
    expect(b.bounds).toEqual({ minX: 0, maxX: 36.3, minZ: 0, maxZ: 28 });
    // the divider: 0.3 m thick, x 28-28.3, 8 m tall, in two pieces round the annex door (z 19.4-20.6)
    expect(has(b, 28.15, 4, 9.7, 0.3, 8, 19.4)).toBe(true);
    expect(has(b, 28.15, 4, 24.3, 0.3, 8, 7.4)).toBe(true);
    expect(has(b, 28.15, (2.1 + 8) / 2, 20, 0.3, 8 - 2.1, 1.2)).toBe(true);
    // nothing else of the main room moved: the rappel booth still ends at x 28
    expect(STUDIO_PROPS.booth.x1).toBe(28);
  });

  it('three doors in order: the old door wall, the annex door (leaf along +z) and partition A\'s (leaf along +x)', () => {
    const { b } = build();
    const d = b.anchors.doors;
    expect(d).toHaveLength(3);
    expect([d[0]!.hinge.x, d[0]!.hinge.z]).toEqual([9.4, 4]);
    expect(d[1]).toMatchObject({ hinge: { x: 28.15, y: 0, z: 19.4 }, width: 1.2, yaw: 0, swing: 1, height: 2.1, locked: false });
    expect(d[2]).toMatchObject({ hinge: { x: 34.8, y: 0, z: 14.15 }, width: 1.2, yaw: Math.PI / 2, swing: 1, height: 2.1, locked: false });
  });

  it('nine lamps: the seven of the old room keep their ids, L0 (the switch\'s circuit) and L1 (the store strip) follow', () => {
    const { b } = build();
    const l = b.lights.lights;
    expect(l).toHaveLength(9);
    expect(l.slice(0, 7).every((x) => x.group === -1)).toBe(true);
    expect([l[7]!.x, l[7]!.y, l[7]!.z, l[7]!.group]).toEqual([32.3, 5, 23.5, 1]);
    expect([l[8]!.x, l[8]!.y, l[8]!.z, l[8]!.group]).toEqual([29.4, 3.2, 12.2, 2]);
    expect(l[8]!.fixture).toMatchObject({ sx: 0.25, sz: 2.4 });
    // the annex is its own zone, 0.12; the main room has none
    expect(b.lights.zones).toHaveLength(1);
    expect(b.lights.zones[0]).toMatchObject({ minX: 28.3, maxX: 36.3, minZ: 0, maxZ: 28, ambient: 0.12 });
  });

  it('the layout fields: the dumpster hide spot, L0\'s switch, two alarm panels facing +x, a reinforcement entry, five squad guards in four rooms', () => {
    const { lay, b } = build();
    expect(lay.hideSpots!.map((h) => [h.pos.x, h.pos.z])).toEqual([[30.3, 6.05]]);
    expect(lay.switches).toHaveLength(1);
    expect(lay.switches![0]!.group).toBe(b.lights.lights[7]!.group);
    expect(lay.alarms!.map((a) => [a.pos.x, a.pos.z, a.yaw])).toEqual([[28.45, 24.5, Math.PI / 2], [28.45, 17, Math.PI / 2]]);
    expect(lay.reinforce!.map((r) => [r.x, r.z])).toEqual([[35.3, 1.5]]);
    const rooms = lay.rooms!;
    expect(rooms.map((r) => r.id)).toEqual(['chamber', 'hall', 'store', 'aisle', 'darkbay']);
    expect(rooms.map((r) => r.squad?.length ?? 0)).toEqual([0, 2, 1, 0, 2]);
    expect(rooms.flatMap((r) => r.squad ?? []).some((s) => s.passive)).toBe(false);
  });

  it('every squad guard, switch, alarm and hide spot stands in free floor of the annex, clear of the solid boxes', () => {
    const { lay, b } = build();
    const inside = (px: number, pz: number, m: number): boolean => solidAt(b, px, pz, m);
    for (const s of lay.rooms!.flatMap((r) => r.squad ?? [])) expect(inside(s.x, s.z, 0.3), `squad ${s.x}, ${s.z}`).toBe(false);
    for (const h of lay.hideSpots!) expect(inside(h.pos.x, h.pos.z, 0.2), `hide ${h.pos.x}, ${h.pos.z}`).toBe(false);
  });

  it('the practice guards: three passive grunts, two side by side facing +z (their backs to the spawns), one facing the spawns', () => {
    const { lay } = build();
    const p = lay.practice!;
    expect(p).toHaveLength(3);
    expect(p.every((s) => s.kind === 'grunt' && s.passive === true && !s.route)).toBe(true);
    expect([p[0]!.yaw, p[1]!.yaw]).toEqual([0, 0]);
    expect(p[1]!.x - p[0]!.x).toBeCloseTo(2.5, 6);
    // the third looks at the spawns' middle (15, 14)
    const want = Math.atan2(15 - p[2]!.x, 14 - p[2]!.z);
    expect(Math.abs(p[2]!.yaw - want)).toBeLessThan(0.2);
    // none is a room squad guard: ?guards=1 stays at five
    expect(lay.rooms!.flatMap((r) => r.squad ?? []).length).toBe(5);
  });

  it('the practice guards stand outside the open middle: the 2 m circle, the animation lane, the loop walk-ins and every solid box', () => {
    const { lay, b } = build();
    const inside = (px: number, pz: number, m: number): boolean => solidAt(b, px, pz, m);
    for (const s of lay.practice!) {
      // the loop's circle (radius 2 round (14, 14)) and the body of the walker on it (0.4)
      expect(Math.hypot(s.x - 14, s.z - 14), `circle ${s.x}, ${s.z}`).toBeGreaterThan(2 + 0.4 + 0.4);
      // the lane (x 8-26, z 18-24) with a body's width at each side
      const inLane = s.x > 8 - 0.8 && s.x < 26 + 0.8 && s.z > 18 - 0.8 && s.z < 24 + 0.8;
      expect(inLane, `lane ${s.x}, ${s.z}`).toBe(false);
      expect(inside(s.x, s.z, 0.45), `solid ${s.x}, ${s.z}`).toBe(false);
      // 1.5 m from both spawns' line is not needed: they stand 2.5 m or more from each spawn
      for (const sp of lay.playerSpawns) expect(Math.hypot(s.x - sp.pos.x, s.z - sp.pos.z)).toBeGreaterThan(2.4);
    }
    for (const t of TRAV_ENTRIES) {
      const ex = t.start.x + Math.sin(t.start.yaw) * t.walk;
      const ez = t.start.z + Math.cos(t.start.yaw) * t.walk;
      for (const s of lay.practice!) {
        // distance from the guard to the walk-in segment
        const dx = ex - t.start.x;
        const dz = ez - t.start.z;
        const len2 = dx * dx + dz * dz;
        const u = len2 ? Math.max(0, Math.min(1, ((s.x - t.start.x) * dx + (s.z - t.start.z) * dz) / len2)) : 0;
        expect(Math.hypot(s.x - (t.start.x + u * dx), s.z - (t.start.z + u * dz)), `${t.id} walk-in vs ${s.x}, ${s.z}`).toBeGreaterThan(1.0);
      }
    }
  });
});
