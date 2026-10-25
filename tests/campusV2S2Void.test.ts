/**
 * (campus-greybox S2-G2, `docs/campus-greybox/briefs/S2.md` section 2) Section 2's atrium void and rings in the v2 layout,
 * flag on: the 14.5 m void (C2) through L1, L2 and the roof light, the balustrades and the 3.9 m strips, the re-cut CR2 lip
 * (C4) against a solo player (the live `tests/campusS2.test.ts` CR2 block ported, SPEC campus-wide rules 1-6), the roof-light
 * rim and the eight balcony downlights per circuit (BA3) in the one `S2_LIGHTS` block.
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { hyp2 } from '../src/core/mathx';
import { HANG, LEDGE, generateLedges } from '../src/world/anchors';
import { LIGHT, contribution } from '../src/world/lights';
import { soloJumpThreats, soloTopLandingThreats, MANTLE } from './helpers/soloJumpReach';


/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sections = await import('../src/world/maps/campusSections');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s2 = await import('../src/world/maps/campusV2/s2');
  const s2Dress = await import('../src/world/maps/campusV2/s2Dress');
  const live2Dress = await import('../src/world/maps/campusS2Dress');
  const dress = await import('../src/world/maps/campusDress');
  const { CampusDresser } = await import('../src/world/campusArt/dresser');
  const { CAMPUS_COOP_LIPS } = await import('../src/world/maps/campusLips');
  return { sections, buildCampus, LevelBuilder, s2, s2Dress, live2Dress, dress, CampusDresser, CAMPUS_COOP_LIPS };
}

const m = await loadCampus([2]);
const S2 = m.s2;
const b: LB = new m.LevelBuilder();
const lay = m.buildCampus(b, { dress: false });

/** The plain collision boxes (quarter turns swapped to plain; pitched pieces, the stair ramps and rails, left out). */
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}

const V = S2.S2_VOID;
const over = (p: BoxPiece, x0: number, x1: number, z0: number, z1: number): boolean => p.c[0] + p.s[0] / 2 > x0 && p.c[0] - p.s[0] / 2 < x1 && p.c[2] + p.s[2] / 2 > z0 && p.c[2] - p.s[2] / 2 < z1;
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
/** The feature stair's own pieces (the landing and its rails, x -19.3..-16.7 over z -18.5..-9.7). */
const stairPiece = (p: BoxPiece): boolean => p.c[0] - p.s[0] / 2 >= -19.31 && p.c[0] + p.s[0] / 2 <= -16.69 && p.c[2] - p.s[2] / 2 >= -18.51 && p.c[2] + p.s[2] / 2 <= -9.69;
/** The glass balustrade runs on floor y (1.1 x 0.1, noLedge) round the void. */
const rails = (y: number): BoxPiece[] => solid.filter((p) => Math.abs(bottom(p) - y) < 1e-6 && Math.abs(p.s[1] - 1.1) < 1e-6 && Math.min(p.s[0], p.s[2]) < 0.11 && over(p, V.x0 - 0.2, V.x1 + 0.2, V.z0 - 0.2, V.z1 + 0.2));

describe('S2-G2 the void (C2)', () => {
  it('S2_VOID is x -26..-11.5, z -18.5..-4 (14.5 x 14.5)', () => {
    expect(V).toEqual({ x0: -26, x1: -11.5, z0: -18.5, z1: -4 });
  });

  it('the void is clear of collision from G + 0.1 to the roof light (13.2): only the feature stair, the G furniture (1.2 or lower) and the balustrades by their 0.1 thickness', () => {
    const inside = solid.filter((p) => over(p, V.x0 + 0.2, V.x1 - 0.2, V.z0 + 0.2, V.z1 - 0.2) && top(p) > 0.1 && bottom(p) < 13.2);
    const bad = inside.filter((p) => !stairPiece(p) && !(bottom(p) < 0.05 && top(p) <= 1.2));
    expect(bad.map((p) => [p.c, p.s])).toEqual([]);
    // no slab piece over the void on L1, L2 or the roof
    for (const y of [4.4, 8.4, 12.3]) expect(solid.filter((p) => Math.abs(top(p) - y) < 1e-6 && p.s[1] >= 0.2 && over(p, V.x0 + 0.05, V.x1 - 0.05, V.z0 + 0.05, V.z1 - 0.05)).length, `slab at ${y}`).toBe(0);
  });

  it('the roof light rim: four 0.9 high, 0.4 thick noLedge pieces, outer box x -26.4..-11.1, z -18.9..-3.6; the lid is drawn, never collides', () => {
    const rim = solid.filter((p) => Math.abs(p.c[1] - (12.3 + 0.45)) < 1e-6 && Math.abs(p.s[1] - 0.9) < 1e-6 && over(p, -27, -10, -20, -3));
    expect(rim.length).toBe(4);
    expect(rim.every((p) => p.noLedge)).toBe(true);
    expect(Math.min(...rim.map((p) => p.c[0] - p.s[0] / 2))).toBeCloseTo(-26.4);
    expect(Math.max(...rim.map((p) => p.c[0] + p.s[0] / 2))).toBeCloseTo(-11.1);
    expect(Math.min(...rim.map((p) => p.c[2] - p.s[2] / 2))).toBeCloseTo(-18.9);
    expect(Math.max(...rim.map((p) => p.c[2] + p.s[2] / 2))).toBeCloseTo(-3.6);
    const lid = b.boxes.find((p) => p.c[1] === 13.2 && Math.abs(p.s[0] - 14.5) < 1e-6)!;
    expect(lid).toBeTruthy();
    expect(lid.collide).toBe(false);
    expect([lid.c[0], lid.c[2]]).toEqual([-18.75, -11.25]);
  });

  it('the pendants stay at (-22 / -18 / -14, 9.0, -17), inside the void', () => {
    expect(S2.PENDANTS).toEqual([[-22, -17], [-18, -17], [-14, -17]]);
    for (const [x, z] of S2.PENDANTS) {
      expect(x > V.x0 && x < V.x1 && z > V.z0 && z < V.z1).toBe(true);
      expect(b.lights.lights.some((l) => l.x === x && l.z === z && l.y === 9 && l.group === S2.S2_GROUPS.atrium)).toBe(true);
    }
  });
});

describe('S2-G2 balustrades and strips (C2)', () => {
  it('L1: west x -26.1, north z -4.1, south z -18.4 with the stair-head gap x -19.2..-16.8, east x -11.6 with the CR2 gap z -11..-5; 1.1 glass, noLedge', () => {
    const r = rails(4.4);
    expect(r.length).toBe(6);
    expect(r.every((p) => p.noLedge)).toBe(true);
    const south = r.filter((p) => Math.abs(p.c[2] + 18.4) < 1e-6).map((p) => [p.c[0] - p.s[0] / 2, p.c[0] + p.s[0] / 2]);
    expect(south.length).toBe(2);
    expect(south.some(([a, e]) => Math.abs(a! + 26) < 1e-6 && Math.abs(e! + 19.2) < 1e-6)).toBe(true);
    expect(south.some(([a, e]) => Math.abs(a! + 16.8) < 1e-6 && Math.abs(e! + 11.6) < 1e-6)).toBe(true);
    const east = r.filter((p) => Math.abs(p.c[0] + 11.6) < 1e-6).map((p) => [p.c[2] - p.s[2] / 2, p.c[2] + p.s[2] / 2]);
    expect(east.length).toBe(2);
    // nothing stands in the CR2 gap
    expect(east.some(([a, e]) => e! > -11 + 1e-6 && a! < -5 - 1e-6)).toBe(false);
    expect(r.some((p) => Math.abs(p.c[0] + 26.1) < 1e-6 && Math.abs(p.s[2] - 14.5) < 1e-6)).toBe(true);
    expect(r.some((p) => Math.abs(p.c[2] + 4.1) < 1e-6 && Math.abs(p.s[0] - 14.5) < 1e-6)).toBe(true);
  });

  it('L2: the same lines with no gap (one piece per side)', () => {
    const r = rails(8.4);
    expect(r.length).toBe(4);
    expect(r.every((p) => p.noLedge)).toBe(true);
    expect(r.some((p) => Math.abs(p.c[2] + 18.4) < 1e-6 && Math.abs(p.s[0] - 14.5) < 1e-6)).toBe(true);
    expect(r.some((p) => Math.abs(p.c[0] + 11.6) < 1e-6 && Math.abs(p.s[2] - 14.5) < 1e-6)).toBe(true);
  });

  it('the south and east strips are at least 3.9 m clear (wall face to balustrade face) on L1 and L2', () => {
    for (const y of [4.4, 8.4]) {
      const r = rails(y);
      const south = r.find((p) => Math.abs(p.c[2] + 18.4) < 1e-6)!;
      const east = r.find((p) => Math.abs(p.c[0] + 11.6) < 1e-6)!;
      // the south band wall at z -22.5 and the east wing wall at x -7.5 (0.2 thick) on this floor
      const sw = solid.find((p) => Math.abs(p.c[2] + 22.5) < 1e-6 && Math.abs(bottom(p) - y) < 1e-6 && p.s[2] < 0.25 && p.s[1] > 3)!;
      const ew = solid.find((p) => Math.abs(p.c[0] + 7.5) < 1e-6 && Math.abs(bottom(p) - y) < 1e-6 && p.s[0] < 0.25 && p.s[1] > 3)!;
      expect(sw && ew, `walls at ${y}`).toBeTruthy();
      expect(south.c[2] - south.s[2] / 2 - (sw.c[2] + sw.s[2] / 2), `south strip at ${y}`).toBeGreaterThanOrEqual(3.9);
      expect(ew.c[0] - ew.s[0] / 2 - (east.c[0] + east.s[0] / 2), `east strip at ${y}`).toBeGreaterThanOrEqual(3.9);
    }
  });
});

describe('S2-G2 CR2: the slab nose over the dark cafe against a solo player (C4; SPEC campus-wide rules 1-6)', () => {
  const CR2 = S2.CR2;
  const grip = { y: CR2.lip.y, a: { x: CR2.lip.x, z: CR2.lip.z0 }, b: { x: CR2.lip.x, z: CR2.lip.z1 }, n: CR2.lip.n };

  it('CR2 is in the v2 lip list: x -11.5, z -11..-5 (6 m), 4.3-4.5 over a floor-0 boost at (-12.1, -8); the top is the east strip; same id, section and solo text', () => {
    expect(m.CAMPUS_COOP_LIPS.some((l) => l.id === 'CR2' && l === CR2)).toBe(true);
    expect(S2.S2_COOP_LIPS).toEqual([CR2]);
    expect(CR2.lip).toEqual({ x: -11.5, z0: -11, z1: -5, y: 4.4, n: { x: -1, z: 0 } });
    expect(CR2.top).toEqual({ x0: -11.5, x1: -7.5, z0: -11, z1: -5, top: 4.4 });
    expect(CR2.boost).toEqual({ floor: 0, x: -12.1, z: -8 });
    expect(CR2.section).toBe(1);
    expect(CR2.solo).toBe('the SW fire stair (post room, stairs, the L1 open plan)');
    const lip = solid.find((p) => Math.abs(p.c[0] + 8.75) < 1e-6 && Math.abs(p.c[2] + 8) < 1e-6 && Math.abs(p.s[1] - 0.4) < 1e-6)!;
    expect(lip, 'the lip slab piece x -11.5..-6, z -11..-5').toBeTruthy();
    expect(lip.noLedge).toBeFalsy();
    expect(lip.c[0] - lip.s[0] / 2).toBeCloseTo(-11.5);
    expect(top(lip)).toBeGreaterThanOrEqual(4.3);
    expect(top(lip)).toBeLessThanOrEqual(4.5);
    // the ledge generator gives the lip piece its west edge, and no other S2 slab edge at 4.4 carries a ledge
    const gen = generateLedges(b.boxes);
    const s2 = (e: { a: { x: number; z: number } }): boolean => e.a.z > -30.5 && e.a.z < 6.5 && e.a.x > -44.5 && e.a.x < 4.5;
    const lips = gen.ledges.filter((e) => Math.abs(e.top - 4.4) < 1e-6 && Math.abs(e.a.x + 11.5) < 1e-3 && Math.abs(e.b.x + 11.5) < 1e-3 && e.nx < -0.99);
    expect(lips.length).toBeGreaterThan(0);
    expect(Math.min(...lips.map((e) => Math.min(e.a.z, e.b.z)))).toBeLessThanOrEqual(-10.5);
    expect(Math.max(...lips.map((e) => Math.max(e.a.z, e.b.z)))).toBeGreaterThanOrEqual(-5.5);
    expect(gen.ledges.filter((e) => Math.abs(e.top - 4.4) < 1e-6 && s2(e) && !lips.includes(e)).map((e) => [e.a, e.b])).toEqual([]);
  });

  it('the planter is gone and the cafe tables by the nose moved to x -14.5 (BA10)', () => {
    expect(solid.filter((p) => over(p, -11.5, -7.7, -11, -5) && bottom(p) > 4.3 && bottom(p) < 4.5).map((p) => [p.c, p.s])).toEqual([]);
    expect(S2.CAFE_TABLES).toEqual([[-14.5, -9], [-14.5, -6.5], [-22.5, -9.5]]);
    for (const [x, z] of S2.CAFE_TABLES) expect(solid.some((p) => p.c[0] === x && p.c[2] === z && Math.abs(p.s[1] - 0.75) < 1e-6)).toBe(true);
  });

  it('no solo running jump reaches the lip (0.5 m margin) and none lands on its top', () => {
    expect(soloJumpThreats(solid, grip, () => false, 0.5)).toEqual([]);
    expect(soloTopLandingThreats(solid, CR2.top, () => false, 0.5)).toEqual([]);
  });

  it('headroom (rule 5): clear air from the lip top + 0.1 over its face, 0.45 + HANG.out out and 0.4 in, along the gap, to the L2 slab', () => {
    const l = CR2.lip;
    const x0 = l.x - (0.45 + HANG.out);
    const x1 = l.x + 0.4;
    const hit = solid.filter((p) => over(p, x0, x1, l.z0, l.z1) && top(p) > l.y + 0.1 && bottom(p) < 8.1);
    expect(hit.map((p) => [p.c, p.s])).toEqual([]);
    expect(b.cylinders.filter((c) => c.collide && c.c[0] + c.r > x0 && c.c[0] - c.r < x1 && c.c[2] + c.r > l.z0 && c.c[2] - c.r < l.z1 && c.c[1] + c.h / 2 > l.y + 0.1).length).toBe(0);
  });

  it('rule 2: nothing solo-standable at 1.2 m or higher within 4 m in plan (the stair landing at 2.2 is 5.3 m off, AS11)', () => {
    const l = CR2.lip;
    const bad = solid.filter((p) => {
      const t = top(p);
      if (t < 1.2 || t >= l.y - 0.05) return false;
      if (Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth) return false;
      if (p.noLedge && t > MANTLE) return false;
      const gx = Math.max(0, Math.abs(p.c[0] - l.x) - p.s[0] / 2);
      const gz = Math.max(0, Math.max(l.z0 - (p.c[2] + p.s[2] / 2), p.c[2] - p.s[2] / 2 - l.z1));
      return hyp2(gx, gz) <= 4;
    });
    expect(bad.map((p) => [p.c, p.s])).toEqual([]);
    const L = S2.FEATURE_LANDING;
    expect(hyp2(Math.max(0, l.x - L.x1), Math.max(0, l.z0 - L.z1, L.z0 - l.z1))).toBeGreaterThanOrEqual(5.3 - 1e-9);
  });

  it('rule 3: nothing under the nose (no wall below the lip, nothing within 1 m of it below)', () => {
    const l = CR2.lip;
    const under = solid.filter((p) => top(p) >= 0.3 && bottom(p) <= 4.1 && top(p) <= 4.19 && over(p, l.x - 1, l.x + 1, l.z0 - 0.8, l.z1 + 0.8));
    expect(under.map((p) => [p.c, p.s])).toEqual([]);
  });

  it('rule 6: every box 1.9-4.2 high standing on an S2 floor is noLedge', () => {
    for (const p of solid) {
      const h = p.s[1];
      if (h < 1.9 || h > 4.2 || p.c[2] < -30.5 || p.c[2] > 6.5 || p.c[0] < -44.5 || p.c[0] > 4.5) continue;
      if (!S2.S2_FLOORS.some((f) => Math.abs(bottom(p) - f) < 0.01)) continue;
      expect(p.noLedge, `${JSON.stringify(p.c)} ${JSON.stringify(p.s)}`).toBe(true);
    }
  });

  it('the boost spot (-12.1, -8) is dark (under the shadow line)', () => {
    const [bx, bz] = [CR2.boost.x, CR2.boost.z];
    let level = b.lights.ambientAt(bx, 0.9, bz);
    for (const l of b.lights.lights) level += contribution(l, bx, 0.9, bz);
    expect(level).toBeLessThan(LIGHT.shadow);
  });

  it('the feature stair (its flights) is at least 5.3 m from the lip in plan (AS11, replacing the old 6 m)', () => {
    const l = CR2.lip;
    for (const f of S2.FEATURE_FLIGHTS) {
      const gx = Math.max(0, l.x - (f.cx + f.w / 2));
      const gz = Math.max(0, l.z0 - (f.cz + f.len / 2), f.cz - f.len / 2 - l.z1);
      expect(hyp2(gx, gz)).toBeGreaterThanOrEqual(5.3 - 1e-9);
    }
  });
});

describe('S2-G2 the balcony downlights (BA3) in the one S2_LIGHTS block', () => {
  it('eight lamps per balcony circuit (51 on L1 at 7.9, 52 on L2 at 11.9), the six as built plus (-18, -21.2) and (-10, -21.2)', () => {
    expect(S2.BALCONY_LAMPS.length).toBe(8);
    for (const p of [[-18, -21.2], [-10, -21.2], [-22, -2.8], [-14, -2.8], [-27.2, -12], [-8.8, -12], [-22, -21.2], [-14, -21.2]]) expect(S2.BALCONY_LAMPS).toContainEqual(p);
    const g = (n: number) => b.lights.lights.filter((l) => l.group === n);
    expect(g(S2.S2_GROUPS.l1Bal).length).toBe(8);
    expect(g(S2.S2_GROUPS.l2Bal).length).toBe(8);
    expect(g(S2.S2_GROUPS.l1Bal).every((l) => l.y === 7.9 && l.on && l.intensity === 0.8 && l.destructible && l.electric)).toBe(true);
    expect(g(S2.S2_GROUPS.l2Bal).every((l) => l.y === 11.9 && l.on && l.intensity === 0.8 && l.destructible && l.electric)).toBe(true);
  });

  it('every S2 lamp the map builds comes from S2_LIGHTS (one block), lit and destructible', () => {
    const s2 = b.lights.lights.filter((l) => l.group >= 50 && l.group <= 139 && l.x > -44.5 && l.x < 4.5 && l.z > -30.5 && l.z < 6.5);
    expect(s2.length).toBe(S2.S2_LIGHTS.length);
    for (const l of s2) {
      expect(S2.S2_LIGHTS.some((q) => q.x === l.x && q.y === l.y && q.z === l.z && q.group === l.group && q.i === l.intensity), `lamp (${l.x}, ${l.y}, ${l.z})`).toBe(true);
      expect(l.on && l.intensity > 0 && l.destructible && l.electric).toBe(true);
    }
  });
});

describe('S2-G2 the dressing', () => {
  it('the dress log gains no line (the CR2 planter skin is dropped with its box)', async () => {
    const run = (mm: typeof m, bb: LB, ll: typeof lay): string[] => {
      const ctx = mm.dress.sectionContext(bb, ll, 1, () => []);
      const d = new mm.CampusDresser(bb, ctx, mm.dress.sectionCatalogues(1));
      mm.sections.CAMPUS_PARTS[1]!.dress(d);
      return [...(mm.sections.CAMPUS_PARTS[1] === mm.sections.CAMPUS_V2_PARTS[1] ? mm.s2Dress.S2_DRESS_LOG : mm.live2Dress.S2_DRESS_LOG)];
    };
    const v2log = run(m, b, lay);
    expect(v2log.some((l) => l.startsWith('CR2 planter'))).toBe(false);
    const m0 = await loadCampus([]);
    const b0 = new m0.LevelBuilder();
    const live = run(m0, b0, m0.buildCampus(b0, { dress: false }));
    expect(v2log.filter((l) => !live.includes(l))).toEqual([]);
  }, 120_000);
});
