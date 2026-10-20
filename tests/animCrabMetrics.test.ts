import { describe, expect, it } from 'vitest';
import { CRAB, CRAB_CROUCH, CRAB_GATES, crabRanges } from '../src/anim/audit/limits';
import { CRAB_JOINTS, crabFrame, elbowWing, footTrack, kneeBow, kneeSeparation, pelvisFrame, plantedSlide, type CrabNow } from '../src/anim/audit/metrics';

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

  it('crabFrame: one frame in place, the same numbers as the stream metrics', () => {
    // body turned 0.7 rad: hips 18 cm, knees 22 cm apart (bowed 2 cm past the ankles), ankles 6 cm off the line,
    // shoulders 36 cm, the left elbow 5 cm outside its shoulder
    const yaw = 0.7;
    const body: Record<(typeof CRAB_JOINTS)[number], [number, number, number]> = {
      hipL: [-0.09, 0.9, 0], hipR: [0.09, 0.9, 0], kneeL: [-0.11, 0.5, 0.05], kneeR: [0.11, 0.5, 0.05],
      ankleL: [-0.06, 0.08, 0], ankleR: [0.06, 0.08, 0], shoulderL: [-0.18, 1.4, 0], shoulderR: [0.18, 1.4, 0],
      elbowL: [-0.23, 1.15, 0], elbowR: [0.17, 1.15, 0],
    };
    const buf = CRAB_JOINTS.flatMap((k) => turned(1, body[k], yaw));
    const out: CrabNow = { kneeSep: 0, trackL: 0, trackR: 0, bowL: 0, bowR: 0, wingL: 0, wingR: 0, hipWidth: 0 };
    expect(crabFrame(buf, out)).toBe(out);
    expect(out.hipWidth).toBeCloseTo(0.18);
    expect(out.kneeSep).toBeCloseTo(0.22 / 0.18);
    expect(out.trackL).toBeCloseTo(0.06);
    expect(out.trackR).toBeCloseTo(0.06);
    expect(out.bowL).toBeCloseTo(0.05);
    expect(out.bowR).toBeCloseTo(0.05);
    expect(out.wingL).toBeCloseTo(0.05);
    expect(out.wingR).toBeCloseTo(-0.01);
    // no pelvis frame: only hipWidth changes
    const z = crabFrame(new Array(30).fill(0), out);
    expect(z.hipWidth).toBe(0);
    expect(z.kneeSep).toBeCloseTo(0.22 / 0.18);
  });

  it('the ranges follow human gait data; a crouch opens the knees and the track a little', () => {
    // step width 5-13 cm between the heel centres: at most 6.5 cm a foot, 7 cm with the ankle's own width
    expect(CRAB.trackHalf).toBe(0.07);
    expect(CRAB.kneeSep.max).toBe(1.1);
    expect(CRAB.kneeBow).toBe(0.03);
    expect(CRAB.elbowWing).toBe(0.06);
    expect(crabRanges(false)).toBe(CRAB);
    expect(crabRanges(true)).toBe(CRAB_CROUCH);
    expect(CRAB_CROUCH.kneeSep.max).toBeGreaterThan(CRAB.kneeSep.max);
    expect(CRAB_CROUCH.trackHalf).toBeGreaterThan(CRAB.trackHalf);
  });

  it('every gait is report-only until its slice lands', () => {
    expect(Object.keys(CRAB_GATES).sort()).toEqual(['crouch', 'jog', 'run', 'sneak', 'walk']);
    expect(Object.values(CRAB_GATES).every((v) => v === false)).toBe(true);
  });
});
