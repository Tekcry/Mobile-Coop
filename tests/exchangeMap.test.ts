import { describe, expect, it } from 'vitest';
import { generateLedges } from '../src/world/anchors';
import { buildCoverSegments } from '../src/cover/coverData';
import { findSplitGaps } from '../src/player/splitJump';
import { WALL_JUMP, TEAM } from '../src/config/movement';

/**
 * Kestrel Exchange (docs/prompts/exchange-map-plan.md): what the blockout must keep true for the movement systems.
 * The map is built without a scene (the builder only collects pieces), like the other map tests.
 */
describe('Kestrel Exchange blockout', async () => {
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const { exchange } = await import('../src/world/maps/exchange');
  const b = new LevelBuilder();
  const layout = exchange.build(b, 1);
  const segs = buildCoverSegments(b.boxes, b.cylinders);
  const ledges = generateLedges(b.boxes).ledges.filter((l) => l.canHang);

  it('has the nine rooms of the plan, none overlapping, the spawn in the culvert', () => {
    expect((layout.rooms ?? []).map((r) => r.id)).toEqual(['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's6g', 's7']);
    const sp = layout.playerSpawns[0]!;
    expect(sp.pos.x).toBe(-28);
    expect(sp.pos.z).toBe(-18);
  });

  it('splits only where the plan puts them (the S2 banks; S7 follows in phase 3)', () => {
    const gaps = findSplitGaps(segs);
    const where = gaps.map((g) => [Math.round((g.a.x + g.b.x) / 2), Math.round((g.a.z + g.b.z) / 2)]);
    expect(where).toEqual([[0, -10]]);
    expect(gaps[0]!.width).toBeGreaterThan(1.8);
    expect(gaps[0]!.width).toBeLessThan(1.9);
    expect(gaps[0]!.len).toBeGreaterThan(5);
  });

  it('no lip anywhere is higher than a wall jump / boost can use except the planned ones', () => {
    // walls, headers, the perimeter and the split banks make no lips at all
    const tall = ledges.filter((l) => l.top > TEAM.boostMax + 0.2);
    expect(tall).toEqual([]);
    // lips 3.75-4.5 m up: only boiler A's top (route C1; the S2 pipe is a pipe, not a lip)
    const band = ledges.filter((l) => l.top >= WALL_JUMP.maxUp - 0.05 && l.top <= TEAM.boostMax + 0.05);
    expect(band.length).toBeGreaterThan(0);
    for (const l of band) {
      expect(l.top).toBeCloseTo(4.4, 2);
      expect(l.a.x).toBeGreaterThan(16.9);
      expect(l.a.x).toBeLessThan(20.1);
      expect(l.a.z).toBeGreaterThan(-10.2);
      expect(l.a.z).toBeLessThan(-7.1);
    }
  });

  it('the catwalk, relay perch and shelf tops are wall-jump / grab lips at their planned heights', () => {
    const tops = new Set(ledges.map((l) => Math.round(l.top * 10) / 10));
    for (const t of [2.6, 3.3, 3.5, 4.4]) expect(tops.has(t), `a lip at ${t}`).toBe(true);
  });

  it('no fence, door or anchor sits outside the footprint', () => {
    const a = b.anchors;
    for (const f of a.fences) for (const p of [f.a, f.b]) expect(Math.abs(p.x) <= 32 && Math.abs(p.z) <= 20).toBe(true);
    for (const d of a.doors) expect(Math.abs(d.hinge.x) <= 32 && Math.abs(d.hinge.z) <= 20).toBe(true);
    expect(a.ducts.length).toBeGreaterThanOrEqual(1);
    expect(a.ladders.length).toBeGreaterThanOrEqual(1);
  });
});
