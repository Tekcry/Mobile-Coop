import { describe, expect, it } from 'vitest';
import { emptyPlannerInput, FootPlanner } from '../src/anim/footPlanner';
import { emptyMotionInput, MotionDriver, stepLength } from '../src/anim/motion';
import { MOVEMENT } from '../src/config/movement';

/** Drive a planner from a MotionDriver at a render rate; returns per-frame records. */
function simulate(seconds: number, set: (i: ReturnType<typeof emptyMotionInput>, t: number) => void, hz = 120) {
  const d = new MotionDriver(0);
  const p = new FootPlanner();
  const pi = emptyPlannerInput();
  const mi = emptyMotionInput();
  let x = 0;
  let z = 0;
  const dt = 1 / hz;
  const frames: { lx: number; lz: number; rx: number; rz: number; lc: boolean; rc: boolean; latL: number; latR: number; landed: number; x: number; z: number }[] = [];
  let landings = 0;
  for (let t = 0; t < seconds; t += dt) {
    mi.vx = mi.vz = 0;
    mi.yaw = d.yaw;
    mi.aiming = false;
    set(mi, t);
    d.step(dt, mi);
    x += d.outX * dt;
    z += d.outZ * dt;
    const sp = d.speed;
    pi.dt = dt;
    pi.rootX = x;
    pi.rootZ = z;
    pi.yaw = d.yaw;
    pi.goalYaw = d.state === 'turn' ? mi.yaw : d.yaw;
    pi.velX = d.vx;
    pi.velZ = d.vz;
    pi.moving = sp > 0.05;
    pi.phase = d.phase;
    pi.duty = 0.63;
    pi.cycleTime = sp > 0.05 ? (2 * stepLength(sp)) / sp : 1;
    pi.liftH = 0.065;
    p.update(pi);
    if (p.L.landed) landings++;
    if (p.R.landed) landings++;
    const c = Math.cos(d.yaw);
    const s = Math.sin(d.yaw);
    frames.push({
      lx: p.L.x,
      lz: p.L.z,
      rx: p.R.x,
      rz: p.R.z,
      lc: p.L.contact,
      rc: p.R.contact,
      latL: (p.L.x - x) * c - (p.L.z - z) * s,
      latR: (p.R.x - x) * c - (p.R.z - z) * s,
      landed: landings,
      x,
      z,
    });
  }
  return { frames, planner: p, driver: d };
}

/** Largest movement of a planted foot between consecutive frames while it stays planted. */
function maxPlantedSlide(frames: ReturnType<typeof simulate>['frames']): number {
  let worst = 0;
  for (let k = 1; k < frames.length; k++) {
    const a = frames[k - 1]!;
    const b = frames[k]!;
    if (a.lc && b.lc) worst = Math.max(worst, Math.hypot(b.lx - a.lx, b.lz - a.lz));
    if (a.rc && b.rc) worst = Math.max(worst, Math.hypot(b.rx - a.rx, b.rz - a.rz));
  }
  return worst;
}

describe('foot planner', () => {
  it('walking: planted feet do not slide (< 1 cm), feet alternate and never cross', () => {
    const { frames, planner } = simulate(5, (i) => (i.vz = MOVEMENT.walkSpeed));
    expect(maxPlantedSlide(frames)).toBeLessThan(0.01);
    expect(planner.L.slide + planner.R.slide).toBeLessThan(0.01);
    expect(frames.at(-1)!.landed).toBeGreaterThan(5);
    for (const f of frames) expect(f.latL).toBeLessThan(f.latR);
  });
  it('brisk and dash: no sliding at speed', () => {
    for (const v of [MOVEMENT.briskSpeed, MOVEMENT.dashSpeed]) {
      const { frames, planner } = simulate(4, (i) => {
        i.vz = v;
        i.dashing = v > 2;
      });
      expect(maxPlantedSlide(frames)).toBeLessThan(0.01);
      expect(planner.L.slide + planner.R.slide).toBeLessThan(0.01);
    }
  });
  it('strafing: feet never cross', () => {
    const { frames } = simulate(4, (i) => (i.vx = MOVEMENT.walkSpeed * MOVEMENT.strafeMult));
    for (const f of frames) expect(f.latR - f.latL).toBeGreaterThan(0.1);
    expect(maxPlantedSlide(frames)).toBeLessThan(0.01);
  });
  it('stopping: settles with the feet under the body at the stop point', () => {
    const { frames, driver } = simulate(5, (i, t) => (i.vz = t < 3 ? MOVEMENT.walkSpeed : 0));
    const last = frames.at(-1)!;
    expect(driver.state).toBe('idle');
    // both feet within a stance of the body, roughly side by side
    expect(Math.abs((last.lz + last.rz) / 2 - last.z)).toBeLessThan(0.12);
    expect(last.lc && last.rc).toBe(true);
    expect(maxPlantedSlide(frames)).toBeLessThan(0.01);
  });
  it('turning 90 degrees on the spot plants at least two steps', () => {
    const { frames } = simulate(1.6, (i) => (i.yaw = Math.PI / 2));
    expect(frames.at(-1)!.landed).toBeGreaterThanOrEqual(2);
    expect(maxPlantedSlide(frames)).toBeLessThan(0.01);
  });
});
