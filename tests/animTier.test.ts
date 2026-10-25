import { describe, expect, it } from 'vitest';
import {
  ANIM_TIER_FAR,
  ANIM_TIER_FAR_PERIOD,
  ANIM_TIER_FROZEN,
  ANIM_TIER_FROZEN_CARRY_MAX,
  ANIM_TIER_NEAR_PLAYER,
  ANIM_TIER_OFFSCREEN,
  animTierPeriod,
  animTierStep,
  animTierThaw,
  newAnimTierIn,
  newAnimTierState,
  type AnimTierIn,
} from '../src/ai/animTier';
import { ANIM_LOD_DISTANCE } from '../src/player/characterRig';

/** A guard on screen, rendered, near the camera, far from every player. */
function base(over: Partial<AnimTierIn> = {}): AnimTierIn {
  return { ...newAnimTierIn(), on: true, pinned: false, rendered: true, seen: true, camDist2: 10 * 10, playerDist2: 20 * 20, ...over };
}
const FAR2 = (ANIM_TIER_FAR + 1) ** 2;
const OFF = { seen: false };

describe('animTierPeriod', () => {
  it('far distance is the rig anim LOD distance, unscaled', () => {
    expect(ANIM_TIER_FAR).toBe(ANIM_LOD_DISTANCE);
    expect(ANIM_TIER_OFFSCREEN).toBe(8);
    expect(ANIM_TIER_FAR_PERIOD).toBe(2);
  });

  it('near and on screen: every frame', () => {
    expect(animTierPeriod(base())).toBe(1);
    expect(animTierPeriod(base({ camDist2: ANIM_TIER_FAR ** 2 }))).toBe(1);
  });

  it('far: every 2nd frame', () => {
    expect(animTierPeriod(base({ camDist2: FAR2 }))).toBe(2);
    expect(animTierPeriod(base({ camDist2: Infinity }))).toBe(2);
  });

  it('off-screen: every ANIM_TIER_OFFSCREEN th frame, near or far', () => {
    expect(animTierPeriod(base(OFF))).toBe(ANIM_TIER_OFFSCREEN);
    expect(animTierPeriod(base({ ...OFF, camDist2: FAR2 }))).toBe(ANIM_TIER_OFFSCREEN);
    // (guard-cap T1-SHADOW) the period is an input (`?animoff=N` A/B runs on one build); the constant by default
    expect(newAnimTierIn().offPeriod).toBe(ANIM_TIER_OFFSCREEN);
    expect(animTierPeriod(base({ seen: false, offPeriod: 4 }))).toBe(4);
  });

  it('no render since the last update (headless): visibility unknown, counts as seen', () => {
    expect(animTierPeriod(base({ ...OFF, rendered: false }))).toBe(1);
    expect(animTierPeriod(base({ ...OFF, rendered: false, camDist2: FAR2 }))).toBe(2);
  });

  it('pinned (takedown / held / emote / climb): every frame', () => {
    expect(animTierPeriod(base({ ...OFF, pinned: true }))).toBe(1);
    expect(animTierPeriod(base({ camDist2: FAR2, pinned: true }))).toBe(1);
  });

  it('within a few metres of any player: every frame', () => {
    const near = (ANIM_TIER_NEAR_PLAYER - 0.01) ** 2;
    expect(animTierPeriod(base({ ...OFF, playerDist2: near }))).toBe(1);
    expect(animTierPeriod(base({ camDist2: FAR2, playerDist2: near }))).toBe(1);
    expect(animTierPeriod(base({ ...OFF, playerDist2: ANIM_TIER_NEAR_PLAYER ** 2 }))).toBe(ANIM_TIER_OFFSCREEN);
  });

  it('off (?animtier=0): every frame', () => {
    expect(animTierPeriod(base({ ...OFF, on: false }))).toBe(1);
    expect(animTierPeriod(base({ camDist2: FAR2, on: false }))).toBe(1);
  });
});

function solves(slot: number, period: number, frames: number): number[] {
  const st = newAnimTierState(slot);
  animTierStep(st, 1, 0); // the first update (always solves)
  const out: number[] = [];
  for (let f = 1; f <= frames; f++) if (animTierStep(st, period, 1 / 60) >= 0) out.push(f);
  return out;
}

describe('animTierStep', () => {
  it('the first update always solves', () => {
    for (let slot = 0; slot < 4; slot++) expect(animTierStep(newAnimTierState(slot), 4, 0.01)).toBeCloseTo(0.01, 12);
  });

  it('period 1 solves every frame', () => {
    expect(solves(3, 1, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('period 4 solves every 4th frame, period 2 every 2nd', () => {
    const a = solves(0, 4, 16);
    expect(a.length).toBe(4);
    for (let i = 1; i < a.length; i++) expect(a[i]! - a[i - 1]!).toBe(4);
    const b = solves(0, 2, 16);
    expect(b.length).toBe(8);
    for (let i = 1; i < b.length; i++) expect(b[i]! - b[i - 1]!).toBe(2);
  });

  it('staggers by slot: 4 guards off-screen solve on 4 different frames, each frame one guard', () => {
    const per = new Array<number>(17).fill(0);
    for (let slot = 0; slot < 4; slot++) for (const f of solves(slot, 4, 16)) per[f]!++;
    expect(per.slice(1)).toEqual(new Array<number>(16).fill(1));
    // 8 guards: two a frame
    const per8 = new Array<number>(17).fill(0);
    for (let slot = 0; slot < 8; slot++) for (const f of solves(slot, 4, 16)) per8[f]!++;
    expect(per8.slice(1)).toEqual(new Array<number>(16).fill(2));
    // far: half the guards each frame
    const per2 = new Array<number>(17).fill(0);
    for (let slot = 0; slot < 6; slot++) for (const f of solves(slot, 2, 16)) per2[f]!++;
    expect(per2.slice(1)).toEqual(new Array<number>(16).fill(3));
  });

  it('carries the skipped time into the next solve (lodDt), none lost', () => {
    const st = newAnimTierState(1);
    animTierStep(st, 1, 0);
    const dts = [0.016, 0.017, 0.015, 0.02, 0.018, 0.016, 0.019, 0.017, 0.016];
    let total = 0;
    let solved = 0;
    let skipped = 0;
    for (const dt of dts) {
      const r = animTierStep(st, 4, dt);
      if (r < 0) {
        skipped += dt;
        continue;
      }
      expect(r).toBeCloseTo(dt + skipped, 12);
      skipped = 0;
      total += r;
      solved++;
    }
    expect(solved).toBe(2);
    expect(total + st.carry).toBeCloseTo(dts.reduce((a, b) => a + b, 0), 12);
  });

  it('dropping to period 1 solves at once with the carried time', () => {
    const st = newAnimTierState(0);
    animTierStep(st, 1, 0);
    expect(animTierStep(st, 4, 0.01)).toBe(-1);
    expect(animTierStep(st, 4, 0.02)).toBe(-1);
    expect(animTierStep(st, 1, 0.03)).toBeCloseTo(0.06, 12);
    expect(st.carry).toBe(0);
  });

  it('(guard-cap T1) off-screen period: 8 frames apart, the slots spread one solve on every frame', () => {
    const a = solves(0, ANIM_TIER_OFFSCREEN, 32);
    expect(a.length).toBe(4);
    for (let i = 1; i < a.length; i++) expect(a[i]! - a[i - 1]!).toBe(8);
    const per = new Array<number>(33).fill(0);
    for (let slot = 0; slot < 8; slot++) for (const f of solves(slot, ANIM_TIER_OFFSCREEN, 32)) per[f]!++;
    expect(per.slice(1)).toEqual(new Array<number>(32).fill(1));
    const per16 = new Array<number>(33).fill(0);
    for (let slot = 0; slot < 16; slot++) for (const f of solves(slot, ANIM_TIER_OFFSCREEN, 32)) per16[f]!++;
    expect(per16.slice(1)).toEqual(new Array<number>(32).fill(2));
  });

  it('(guard-cap T1) off-screen carry: none lost over several periods, no solve takes more than a period of dt', () => {
    const st = newAnimTierState(5);
    animTierStep(st, 1, 0);
    let sum = 0;
    let solved = 0;
    let n = 0;
    for (let f = 0; f < ANIM_TIER_OFFSCREEN * 4; f++) {
      const dt = 0.015 + (f % 5) * 0.001;
      sum += dt;
      const r = animTierStep(st, ANIM_TIER_OFFSCREEN, dt);
      if (r < 0) continue;
      expect(r).toBeLessThanOrEqual(ANIM_TIER_OFFSCREEN * 0.019 + 1e-12);
      solved += r;
      n++;
    }
    expect(n).toBe(4);
    expect(solved + st.carry).toBeCloseTo(sum, 12);
  });
});

// (sector-redesign perfg, folded in from `animFrozen.ts` at the #226 master merge) The FROZEN tier: a render-frozen
// guard skips the solve, the skipped time is carried (capped) into the thaw solve, which comes at once.
describe('animTier FROZEN (perfg fold)', () => {
  it('frozen is the first rule: over pinned, a near player and the tiers being off', () => {
    expect(ANIM_TIER_FROZEN).toBe(0);
    const near = (ANIM_TIER_NEAR_PLAYER - 1) ** 2;
    expect(animTierPeriod(base({ frozen: true }))).toBe(ANIM_TIER_FROZEN);
    expect(animTierPeriod(base({ frozen: true, pinned: true, playerDist2: near }))).toBe(ANIM_TIER_FROZEN);
    expect(animTierPeriod(base({ frozen: true, on: false }))).toBe(ANIM_TIER_FROZEN);
    expect(newAnimTierIn().frozen).toBe(false);
  });

  it('drawn: solves every frame with its own dt (period 1)', () => {
    const st = newAnimTierState(0);
    for (let i = 0; i < 5; i++) expect(animTierStep(st, 1, 1 / 60)).toBeCloseTo(1 / 60, 9);
    expect(st.carry).toBe(0);
  });

  it('frozen: skips and carries; the thaw solve gets dt plus the carry, then the carry is cleared', () => {
    const st = newAnimTierState(0);
    animTierStep(st, 1, 0);
    for (let i = 0; i < 3; i++) expect(animTierStep(st, ANIM_TIER_FROZEN, 0.02)).toBe(-1);
    expect(st.carry).toBeCloseTo(0.06, 9);
    expect(st.thaw).toBe(true);
    expect(animTierStep(st, 1, 0.01)).toBeCloseTo(0.07, 9);
    expect(st.carry).toBe(0);
    expect(st.thaw).toBe(false);
    expect(animTierStep(st, 1, 0.01)).toBeCloseTo(0.01, 9);
  });

  it('a long freeze caps the carry at ANIM_TIER_FROZEN_CARRY_MAX; one big frame is capped too', () => {
    expect(ANIM_TIER_FROZEN_CARRY_MAX).toBeCloseTo(0.1, 9);
    const st = newAnimTierState(0);
    animTierStep(st, 1, 0);
    for (let i = 0; i < 600; i++) expect(animTierStep(st, ANIM_TIER_FROZEN, 1 / 60)).toBe(-1);
    expect(st.carry).toBe(ANIM_TIER_FROZEN_CARRY_MAX);
    expect(animTierStep(st, 1, 1 / 60)).toBeCloseTo(1 / 60 + ANIM_TIER_FROZEN_CARRY_MAX, 9);
    const big = newAnimTierState(0);
    animTierStep(big, ANIM_TIER_FROZEN, 0.5);
    expect(big.carry).toBe(ANIM_TIER_FROZEN_CARRY_MAX);
  });

  it('the thaw frame is never skipped by the far or off-screen tier, whatever the stagger', () => {
    for (const period of [ANIM_TIER_FAR_PERIOD, ANIM_TIER_OFFSCREEN]) {
      for (let slot = 0; slot < 4; slot++) {
        for (let frozenFrames = 1; frozenFrames <= 4; frozenFrames++) {
          const st = newAnimTierState(slot);
          animTierStep(st, 1, 0);
          for (let i = 0; i < frozenFrames; i++) animTierStep(st, ANIM_TIER_FROZEN, 0.01);
          expect(animTierStep(st, period, 0.01)).toBeCloseTo(0.01 * (frozenFrames + 1), 9);
        }
      }
    }
  });

  it('(artnext C7 / C9) animTierThaw: a forced solve takes dt plus the carry and ends the thaw', () => {
    const st = newAnimTierState(2);
    animTierStep(st, 1, 0);
    animTierStep(st, ANIM_TIER_FROZEN, 0.03);
    animTierStep(st, ANIM_TIER_FROZEN, 0.03);
    expect(animTierThaw(st, 0)).toBeCloseTo(0.06, 9);
    expect(st.carry).toBe(0);
    expect(st.thaw).toBe(false);
    // the next frame is a plain tier step again (period 1: its own dt)
    expect(animTierStep(st, 1, 0.02)).toBeCloseTo(0.02, 9);
  });
});
