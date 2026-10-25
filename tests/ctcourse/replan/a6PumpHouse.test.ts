/**
 * Marlow re-plan, A6 the Pump House (J14 slice G-A6; PLAN section 2, STATIONS.md sections 3, 6, 8, 9; BRIEF A6): the set on
 * `ctcourseReplan`. Step 1, the noise case: does an uncaught 6 m drop into the drive pit reach the attendant's re-routed
 * round, through the game's own hearing rule (`EnemyManager.hear` / `tierOf`: the landing band's radius, the 3D distance,
 * the wall ray over the hearing mask's collision pieces only where a wall changes the tier, `hearTier`)?
 */
import { describe, expect, it } from 'vitest';
import { hyp3 } from '../../../src/core/mathx';
import { effectiveReach, hearTier, wallMatters, WALL_FACTOR, ambientDb, type HearTier } from '../../../src/ai/hearing';
import { LANDING, landingKind, landingNoise } from '../../../src/player/movement';
import { LANDING_NOISE_RADIUS } from '../../../src/config/noise';
import { LevelBuilder, type BoxPiece } from '../../../src/world/levelBuilder';
import { buildCtcourse } from '../../../src/world/maps/ctcourse';
import { A6_CAGE } from '../../../src/world/maps/ctcourseSets/a6PumpHouse';
import { A6_ATTENDANT_ROUTE_REPLAN, A6_PIT_LANDING } from '../../../src/world/maps/ctcourseSets/replan/a6PumpHouse';

const b = new LevelBuilder();
const built = buildCtcourse(b, { replan: true });
const lay = built.layout;

type V3 = [number, number, number];
/** Does the segment p -> q pass through an axis-aligned box (strictly inside, 1 mm in)? Slab clip in 3D. */
const segHits = (p: V3, q: V3, o: BoxPiece): boolean => {
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 3; i++) {
    const lo = o.c[i]! - o.s[i]! / 2 + 1e-3;
    const hi = o.c[i]! + o.s[i]! / 2 - 1e-3;
    const d = q[i]! - p[i]!;
    if (Math.abs(d) < 1e-12) {
      if (p[i]! < lo || p[i]! > hi) return false;
      continue;
    }
    let a = (lo - p[i]!) / d;
    let c = (hi - p[i]!) / d;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return false;
  }
  return true;
};
/** The hearing mask's pieces (`MASK.HEARING` = G.STATIC | G.GLASS: every collision box, a quarter-turned one folded; doors and fences are no box). */
const hearingSolids = b.boxes.filter((p) => p.collide && Math.abs(p.pitch) < 1e-3).map((p) => (Math.abs(Math.sin(p.yaw)) > 0.5 ? { ...p, s: [p.s[2], p.s[1], p.s[0]] as [number, number, number], yaw: 0 } : p));
/** `ballistics.clear(earA, earB, MASK.HEARING)` on these pieces. */
const clear = (a: V3, c: V3): boolean => !hearingSolids.some((o) => segHits(a, c, o));
/**
 * `EnemyManager.tierOf` for an unalerted, coordinated guard whose feet are at (x, 0, z) and a noise of `reach` at `pos`:
 * the map's noisy things mask at the guard, the wall ray (noise + 1.5 -> guard + 1.6) only where one wall changes the tier.
 */
function tierAt(pos: V3, reach: number, x: number, z: number): { d: number; reachEff: number; wall: boolean; tier: HearTier } {
  const d = hyp3(x - pos[0], 0 - pos[1], z - pos[2]);
  const noisy = lay.guardAi?.noisy ?? [];
  let r = effectiveReach(reach, 0, noisy.length ? ambientDb(noisy, x, z, 0) : 0);
  let wall = false;
  if (d < reach && wallMatters(d, r, false) && !clear([pos[0], pos[1] + 1.5, pos[2]], [x, 1.6, z])) {
    r *= WALL_FACTOR;
    wall = true;
  }
  return { d, reachEff: r, wall, tier: d < reach ? hearTier(d, r, false) : 0 };
}
/** The round's points, its legs sampled every 0.25 m. */
function roundSamples(route: readonly [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < route.length; i++) {
    const a = route[i]!;
    const c = route[(i + 1) % route.length]!;
    const n = Math.max(1, Math.ceil(hyp3(c[0] - a[0], 0, c[1] - a[1]) / 0.25));
    for (let k = 0; k < n; k++) out.push([a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
  }
  return out;
}

describe('Marlow re-plan A6 (G-A6) step 1: the 6 m landing in the drive pit and the attendant (BRIEF A6)', () => {
  const fall = 4.4 - A6_PIT_LANDING.y;
  const reach = landingNoise(landingKind(fall));
  const pos: V3 = [A6_PIT_LANDING.x, A6_PIT_LANDING.y, A6_PIT_LANDING.z];

  it('the drop from the bridge deck (4.4) to the pit floor (-1.6) is 6.0 m: a heavy landing, radius 11 m', () => {
    expect(fall).toBeCloseTo(6.0, 9);
    expect(fall).toBeGreaterThan(LANDING.heavy);
    expect(landingKind(fall)).toBe('heavy');
    expect(reach).toBe(LANDING_NOISE_RADIUS.heavy);
    expect(reach).toBe(11);
    // the landing spot is in the pit, inside the cage footprint (the cage's walls stand between it and the floor)
    expect(pos[0] > A6_CAGE[0] && pos[0] < A6_CAGE[2] && pos[2] > A6_CAGE[1] && pos[2] < A6_CAGE[3]).toBe(true);
  });

  it('heard from part of his round (tier 1: he turns to look, never sent): pump 3 and the leg north of the cage; silent at the desk, the gauge board and the round east of x 54', () => {
    const at = (x: number, z: number) => tierAt(pos, reach, x, z);
    // the stops
    const [D, , G, N1, N2, P3] = A6_ATTENDANT_ROUTE_REPLAN;
    expect(at(D![0], D![1]).tier).toBe(0);
    expect(at(G![0], G![1]).tier).toBe(0);
    expect(at(N1![0], N1![1]).tier).toBe(0);
    expect(at(N2![0], N2![1]).tier).toBe(0);
    const p3 = at(P3![0], P3![1]);
    expect(p3.tier).toBe(1);
    expect(p3.wall).toBe(true);
    expect(p3.d).toBeCloseTo(4.44, 2);
    // every sample of the round: never tier 2 or more (nobody is sent to the pit by the sound alone); the heard samples
    const samples = roundSamples(A6_ATTENDANT_ROUTE_REPLAN).map(([x, z]) => ({ x, z, ...at(x, z) }));
    expect(samples.length).toBeGreaterThan(100);
    expect(samples.filter((s) => s.tier >= 2)).toEqual([]);
    const heard = samples.filter((s) => s.tier === 1);
    expect(heard.length).toBeGreaterThan(0);
    for (const s of heard) {
      // through the cage's walls (one wall: reach 11 x 0.45 = 4.95 m), within it in 3D
      expect(s.wall).toBe(true);
      expect(s.d).toBeLessThan(11 * WALL_FACTOR);
      expect(s.x).toBeLessThan(54);
    }
    // the north leg's heard stretch and the pump-3 leg's
    const north = heard.filter((s) => Math.abs(s.z - 67.5) < 1e-6).map((s) => s.x);
    expect(Math.min(...north)).toBeGreaterThan(48.5);
    expect(Math.max(...north)).toBeLessThan(54.5);
    expect(heard.some((s) => s.x < 48.6 && s.z < 64)).toBe(true);
  });

  it('the check has teeth: with no wall between (the cage gone from the ray), pump 3 would send him to investigate (tier 2)', () => {
    const d = hyp3(48.2 - pos[0], -pos[1], 61.0 - pos[2]);
    expect(hearTier(d, reach, false)).toBe(2);
    expect(hearTier(d, reach * WALL_FACTOR, false)).toBe(1);
  });
});
