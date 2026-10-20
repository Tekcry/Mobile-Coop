// (anim-rework S3) The drawn keyed set (src/anim/animGraph.ts keyedDrawnSet, S3-KEYS.md): the mirror, the glide steps and
// the graph's drawn share, trunk share and leg values.
import { describe, expect, it } from 'vitest';
import { AnimGraph, defaultInput, GLIDE } from '../src/anim/animGraph';
import { mirrorKeyed, newKeyedPose, sampleKeyed } from '../src/anim/keyed';
import { GLIDE_STEP, stepLength } from '../src/anim/motion';
import { KEYED_GLIDE_STRAFE } from '../src/anim/clips/keyed/glide_strafe';
import { KEYED_READY_STANCE } from '../src/anim/clips/keyed/ready_stance';
import { MOVEMENT } from '../src/config/movement';
import { proportions } from '../src/player/proportions';

describe('mirrorKeyed', () => {
  it('negates the pelvis sway and the yaw / roll, keeps the pitch, swaps the arms; twice is the pose', () => {
    const a = newKeyedPose();
    const b = newKeyedPose();
    sampleKeyed(KEYED_GLIDE_STRAFE, 0.3, 1, a);
    sampleKeyed(KEYED_GLIDE_STRAFE, 0.3, 1, b);
    mirrorKeyed(b);
    expect(b.pel[0]).toBeCloseTo(-a.pel[0]!, 9);
    expect(b.pel[1]).toBeCloseTo(a.pel[1]!, 9);
    for (let s = 0; s < 16; s += 4) {
      expect(b.q[s]).toBeCloseTo(a.q[s]!, 9);
      expect(b.q[s + 1]).toBeCloseTo(-a.q[s + 1]!, 9);
      expect(b.q[s + 2]).toBeCloseTo(-a.q[s + 2]!, 9);
    }
    expect(b.arm[0]).toBeCloseTo(-a.arm[6]!, 9);
    expect(b.arm[7]).toBeCloseTo(a.arm[1]!, 9);
    mirrorKeyed(b);
    for (let c = 0; c < 12; c++) expect(b.arm[c]).toBeCloseTo(a.arm[c]!, 9);
    for (let c = 0; c < 16; c++) expect(b.q[c]).toBeCloseTo(a.q[c]!, 9);
  });
});

describe('the glide steps (GLIDE_STEP)', () => {
  it('aimed only: the side-step is short, the back-step and the forward step shorter; nothing else changes', () => {
    const v = 0.7;
    expect(stepLength(v, MOVEMENT, 1, 0, 0, 0, 1)).toBeCloseTo(GLIDE_STEP.lat0 + GLIDE_STEP.latK * v, 9);
    expect(stepLength(v, MOVEMENT, 1, 0, 0, 0, 0)).toBeCloseTo(stepLength(v) * 0.6, 9);
    expect(stepLength(1.05, MOVEMENT, 0, 0, 0, 1, 1)).toBeLessThan(0.36);
    expect(stepLength(1.4, MOVEMENT, 0, 0, 0, 0, 1)).toBeCloseTo(GLIDE_STEP.fwd0 + GLIDE_STEP.fwdK * 1.4, 9);
    // crouched aiming keeps the old steps (slice 4)
    expect(stepLength(0.6, MOVEMENT, 1, 0, 1, 0, 1)).toBeCloseTo(stepLength(0.6, MOVEMENT, 1, 0, 1), 9);
    // the aimed full-stick strafe keeps a believable cadence (steps a second)
    const sp = MOVEMENT.adsSpeed * MOVEMENT.strafeMult;
    expect(sp / stepLength(sp, MOVEMENT, 1, 0, 0, 0, 1)).toBeLessThan(7);
  });
});

describe('the graph plays the drawn set', () => {
  const steady = (set: (i: ReturnType<typeof defaultInput>) => void, n = 90) => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    i.localZ = 1;
    i.keyedOk = true;
    i.keyedDrawn = true;
    i.armed = true;
    i.ready = false;
    set(i);
    let maxStep = 0;
    let last = 0;
    for (let k = 0; k < n; k++) {
      g.update(1 / 60, i);
      maxStep = Math.max(maxStep, Math.abs(g.out.keyed.pel[0]! - last));
      last = g.out.keyed.pel[0]!;
    }
    return { g, maxStep };
  };
  it('drawn still: the ready stance, its trunk at low ready, none aiming', () => {
    const low = steady((i) => (i.speed = 0)).g.out;
    expect(low.keyW).toBeGreaterThan(0.95);
    expect(low.keyDrawn).toBeGreaterThan(0.95);
    expect(low.keyTrunk).toBeGreaterThan(0.95);
    expect(low.keyArmW).toBe(0);
    const aim = steady((i) => ((i.speed = 0), (i.raise = 1))).g.out;
    expect(aim.keyW).toBeGreaterThan(0.95);
    expect(aim.keyTrunk).toBeLessThan(0.05);
    // the ready stance's support foot ahead (READY_STANCE.lead)
    expect(aim.stance.lZ - aim.stance.rZ).toBeGreaterThan(0.15);
    expect(aim.keyKneeOut).toBeCloseTo(KEYED_READY_STANCE.kneeOut, 3);
  });
  it('aiming the strafe: the glide strafe values, mirrored to the left without a jump; crouched or holstered: not the drawn set', () => {
    const r = steady((i) => ((i.speed = 0.7), (i.raise = 1), (i.localX = 1), (i.localZ = 0)));
    expect(r.g.out.keyDrawn).toBeGreaterThan(0.95);
    expect(r.g.out.keyKneeOut).toBeCloseTo(GLIDE.kneeOutSide, 2);
    const l = steady((i) => ((i.speed = 0.7), (i.raise = 1), (i.localX = -1), (i.localZ = 0)));
    expect(l.g.out.keyDrawn).toBeGreaterThan(0.95);
    expect(l.maxStep).toBeLessThan(0.01);
    expect(steady((i) => ((i.speed = 0.7), (i.raise = 1), (i.crouch = 1))).g.out.keyW).toBe(0);
    expect(steady((i) => ((i.speed = 0.7), (i.keyedDrawn = false), (i.armed = false), (i.ready = true))).g.out.keyDrawn).toBe(0);
  });
});
