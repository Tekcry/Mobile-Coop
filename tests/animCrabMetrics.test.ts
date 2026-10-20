import { describe, expect, it } from 'vitest';
import { CRAB, CRAB_GATES } from '../src/anim/audit/limits';
import { elbowWing, footTrack, kneeBow, kneeSeparation, pelvisFrame, plantedSlide } from '../src/anim/audit/metrics';

/** A stream of `n` frames of the same point. */
const hold = (n: number, x: number, y: number, z: number): number[] => Array.from({ length: n }, () => [x, y, z]).flat();
/** The same body turned by `yaw` about Y (a point [x, y, z] in the body frame, x = right, to the world). */
function turned(n: number, p: [number, number, number], yaw: number): number[] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return hold(n, p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c);
}

describe('anti-crab metrics (anim-rework BRIEF 5)', () => {
  const N = 4;
  // hips 18 cm apart, knees over the hips, ankles a narrow 5 cm either side of the line
  const hipL = hold(N, -0.09, 0.9, 0);
  const hipR = hold(N, 0.09, 0.9, 0);

  it('the pelvis frame is the hip axis, its midpoint and width', () => {
    const f = pelvisFrame(hipL, hipR, 0)!;
    expect(f.ux).toBeCloseTo(1);
    expect(f.uz).toBeCloseTo(0);
    expect(f.mx).toBeCloseTo(0);
    expect(f.width).toBeCloseTo(0.18);
    expect(pelvisFrame(hold(1, 0, 0, 0), hold(1, 0, 1, 0), 0)).toBeNull();
  });

  it('knee separation: knees over the hips pass, bowed-out knees (the crab) fail', () => {
    const ok = kneeSeparation(hipL, hipR, hold(N, -0.08, 0.5, 0.05), hold(N, 0.08, 0.5, 0.05), CRAB.kneeSep.min, CRAB.kneeSep.max);
    expect(ok.mean).toBeCloseTo(0.16 / 0.18);
    expect(ok.pass).toBe(true);
    const crab = kneeSeparation(hipL, hipR, hold(N, -0.16, 0.5, 0), hold(N, 0.16, 0.5, 0), CRAB.kneeSep.min, CRAB.kneeSep.max);
    expect(crab.max).toBeCloseTo(0.32 / 0.18);
    expect(crab.pass).toBe(false);
    // knocked knees (touching) fail the low end
    expect(kneeSeparation(hipL, hipR, hold(N, -0.02, 0.5, 0), hold(N, 0.02, 0.5, 0), CRAB.kneeSep.min, CRAB.kneeSep.max).pass).toBe(false);
  });

  it('measures in the pelvis frame: the same pose turned reads the same', () => {
    const yaw = 1.1;
    const r = kneeSeparation(turned(N, [-0.09, 0.9, 0], yaw), turned(N, [0.09, 0.9, 0], yaw), turned(N, [-0.16, 0.5, 0.1], yaw), turned(N, [0.16, 0.5, 0.1], yaw), 0.6, 1.3);
    expect(r.mean).toBeCloseTo(0.32 / 0.18);
  });

  it('foot track: planted feet a few cm from the line pass; a wide track or a crossed foot shows', () => {
    const narrow = footTrack(hipL, hipR, hold(N, -0.05, 0.08, 0), hold(N, 0.05, 0.08, 0), CRAB.trackHalf);
    expect(narrow.max).toBeCloseTo(0.05);
    expect(narrow.pass).toBe(true);
    const wide = footTrack(hipL, hipR, hold(N, -0.2, 0.08, 0), hold(N, 0.2, 0.08, 0), CRAB.trackHalf);
    expect(wide.max).toBeCloseTo(0.2);
    expect(wide.pass).toBe(false);
    // only planted frames count: the left foot planted on frames 0-1 at 5 cm, swinging wide on 2-3
    const ankleL = [...hold(2, -0.05, 0.08, 0), ...hold(2, -0.3, 0.2, 0)];
    const r = footTrack(hipL, hipR, ankleL, hold(N, 0.05, 0.08, 0), CRAB.trackHalf, [1, 1, 0, 0], [1, 1, 1, 1]);
    expect(r.frames).toBe(6);
    expect(r.pass).toBe(true);
    // a foot over the line reads negative
    expect(footTrack(hipL, hipR, hold(N, 0.03, 0.08, 0), hold(N, 0.05, 0.08, 0), CRAB.trackHalf).min).toBeCloseTo(-0.03);
  });

  it('knee bow: a knee outside its ankle by more than the limit fails', () => {
    const over = kneeBow(hipL, hipR, hold(N, -0.06, 0.5, 0), hold(N, 0.06, 0.5, 0), hold(N, -0.05, 0.08, 0), hold(N, 0.05, 0.08, 0), CRAB.kneeBow);
    expect(over.max).toBeCloseTo(0.01);
    expect(over.pass).toBe(true);
    const bowed = kneeBow(hipL, hipR, hold(N, -0.14, 0.5, 0), hold(N, 0.06, 0.5, 0), hold(N, -0.05, 0.08, 0), hold(N, 0.05, 0.08, 0), CRAB.kneeBow);
    expect(bowed.max).toBeCloseTo(0.09);
    expect(bowed.pass).toBe(false);
  });

  it('planted slide: travel while planted, reset at each plant', () => {
    // planted 0-2 drifting 0.5 cm a frame, lifted, planted again at 4-5 still
    const ankle = [0, 0, 0, 0.005, 0, 0, 0.01, 0, 0, 0.3, 0.1, 0, 0.5, 0, 0, 0.5, 0, 0];
    const r = plantedSlide(ankle, [1, 1, 1, 0, 1, 1], CRAB.slide);
    expect(r.worst).toBeCloseTo(0.01);
    expect(r.plants).toBe(2);
    expect(r.pass).toBe(false);
    expect(plantedSlide(ankle, [1, 1, 0, 0, 1, 1], CRAB.slide).pass).toBe(true);
  });

  it('elbow wing: elbows close to the ribs pass, winged elbows fail', () => {
    const sL = hold(N, -0.18, 1.4, 0);
    const sR = hold(N, 0.18, 1.4, 0);
    expect(elbowWing(sL, sR, hold(N, -0.15, 1.1, 0.05), hold(N, 0.16, 1.1, 0.05), CRAB.elbowWing).pass).toBe(true);
    const wing = elbowWing(sL, sR, hold(N, -0.32, 1.25, 0), hold(N, 0.16, 1.1, 0), CRAB.elbowWing);
    expect(wing.max).toBeCloseTo(0.14);
    expect(wing.pass).toBe(false);
  });

  it('every gait is report-only until its slice lands', () => {
    expect(Object.keys(CRAB_GATES).sort()).toEqual(['crouch', 'jog', 'run', 'sneak', 'walk']);
    expect(Object.values(CRAB_GATES).every((v) => v === false)).toBe(true);
  });
});
