import { describe, expect, it } from 'vitest';
import { emptyPlannerInput, FootPlanner, GLIDE_GAP, PLANNER, STOP_CLOSE, STOP_SPLIT } from '../src/anim/footPlanner';
import { emptyMotionInput, MotionDriver, stepLength } from '../src/anim/motion';
import { CT, MOVEMENT } from '../src/config/movement';

/** Drive a planner from a MotionDriver at a render rate; returns per-frame records. */
function simulate(seconds: number, set: (i: ReturnType<typeof emptyMotionInput>, t: number) => void, hz = 120, quickStop = 0, hold?: (t: number) => boolean, glide = false) {
  const d = new MotionDriver(0);
  const p = new FootPlanner();
  const pi = emptyPlannerInput();
  const mi = emptyMotionInput();
  let x = 0;
  let z = 0;
  const dt = 1 / hz;
  const frames: { lx: number; lz: number; rx: number; rz: number; lc: boolean; rc: boolean; latL: number; latR: number; landed: number; mv: boolean; x: number; z: number }[] = [];
  let landings = 0;
  for (let t = 0; t < seconds; t += dt) {
    mi.vx = mi.vz = 0;
    mi.yaw = d.yaw;
    mi.aiming = glide;
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
    // (step 22) as the graph's gait: a stop hands the last step to idle stepping under 0.3 m/s
    pi.moving = sp > (d.state === 'stop' ? 0.3 : 0.05);
    pi.phase = d.phase;
    pi.duty = 0.63;
    // (anim-rework S3) the aimed glide strafe: its short side-step (GLIDE_STEP) and close (GLIDE_GAP)
    pi.glide = glide;
    pi.cycleTime = sp > 0.05 ? (2 * (glide ? stepLength(sp, MOVEMENT, 1, 0, 0, 0, 1) : stepLength(sp))) / sp : 1;
    pi.liftH = 0.065;
    pi.quickStop = quickStop;
    pi.hold = hold ? hold(t) : false;
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
      mv: pi.moving,
      x,
      z,
    });
  }
  return { frames, planner: p, driver: d };
}

/** (step 22) First frame from `k` where the planner's moving flag clears (the graph's 0.3 m/s in a stop). */
function stopFrame(frames: ReturnType<typeof simulate>['frames'], k: number): number {
  for (let j = Math.max(1, k); j < frames.length; j++) if (!frames[j]!.mv) return j;
  return frames.length - 1;
}
/** (step 22) First frame from `k` where the root no longer moves. */
function restFrame(frames: ReturnType<typeof simulate>['frames'], k: number): number {
  for (let j = Math.max(1, k); j < frames.length; j++) if (Math.hypot(frames[j]!.x - frames[j - 1]!.x, frames[j]!.z - frames[j - 1]!.z) < 1e-6) return j;
  return frames.length - 1;
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

describe('foot planner: Chaos Theory instant stop (3.2.0)', () => {
  it('a swing left over from moving lands within CT.stopBlend, or closes up under the body within an idle step; planted feet stay locked (< 1 cm)', () => {
    let swinging = 0;
    for (const release of [1.0, 1.07, 1.13, 1.21]) {
      let releasedAt = -1;
      const { frames } = simulate(
        2,
        (i, t) => {
          i.ct = true;
          i.faceTravel = true;
          if (t < release) i.vz = MOVEMENT.jogSpeed;
          else if (releasedAt < 0) releasedAt = t;
        },
        120,
        CT.stopBlend,
      );
      // (step 22, M14 momentum) the root eases to rest within CT.stopTime of the release; the feet stop stepping
      // once the pace is under 0.05 m/s (k0)
      const k0 = stopFrame(frames, Math.round(releasedAt * 120));
      expect((k0 - Math.round(releasedAt * 120)) / 120).toBeLessThanOrEqual(CT.stopTime + 2 / 120);
      const kr = restFrame(frames, k0);
      // the leftover swing is the one in the air on the last moving frame (an idle settling step may start on the next)
      const kM = k0 - 1;
      expect((kr - Math.round(releasedAt * 120)) / 120).toBeLessThanOrEqual(CT.stopTime + 2 / 120);
      // the foot in the air at the release lands within the blend, or (step 22, M14) still behind its stance spot under
      // the stopping body, carries on to it as the closing step within an idle step time
      const f0 = frames[kM]!;
      if (!f0.lc || !f0.rc) {
        swinging++;
        let down = -1;
        for (let k = kM + 1; k < frames.length; k++) {
          if (frames[k]!.landed > frames[kM]!.landed) {
            down = (k - kM) / 120;
            break;
          }
        }
        expect(down).toBeGreaterThanOrEqual(0);
        expect(down).toBeLessThanOrEqual(Math.max(CT.stopBlend, PLANNER.idleStepTime) + 2 / 120);
      }
      expect(maxPlantedSlide(frames)).toBeLessThan(0.01);
    }
    expect(swinging).toBeGreaterThan(0);
  });
});

describe('foot planner: Chaos Theory stop hold (3.2.0)', () => {
  it('a foot in the air sets straight down where it is (a trailing one drawn in to STOP_SPLIT); a lunge closes in once; then the feet stay put', () => {
    let tested = 0;
    for (const release of [1.0, 1.04, 1.09, 1.13, 1.17, 1.21]) {
      let releasedAt = -1;
      const { frames } = simulate(
        2.5,
        (i, t) => {
          i.ct = true;
          i.faceTravel = true;
          if (t < release) i.vz = MOVEMENT.jogSpeed;
          else if (releasedAt < 0) releasedAt = t;
        },
        120,
        CT.stopBlend,
        (t) => t >= release,
      );
      const k0 = stopFrame(frames, Math.round(releasedAt * 120));
      const f0 = frames[k0]!;
      const last = frames[frames.length - 1]!;
      // the foot that was in the air lands within a centimetre of where it was (horizontally); (G1, audit row 9) one just off
      // the ground behind is drawn in to STOP_SPLIT of the planted foot (travel along +z here). (G1 fix) A stop frozen wider
      // than STOP_CLOSE front to back closes the rear foot in once under the body (CT stands in a small split)
      const at = (fz: number, oz: number): number => oz + Math.max(-STOP_SPLIT, fz - oz);
      const wide = (lz: number, rz: number): boolean => Math.abs(lz - rz) > STOP_CLOSE;
      if (!f0.lc) {
        tested++;
        const lz = at(f0.lz, f0.rz);
        if (lz !== f0.lz) expect(last.lz - f0.rz).toBeGreaterThanOrEqual(-STOP_CLOSE);
        else if (!wide(lz, f0.rz)) expect(Math.hypot(last.lx - f0.lx, last.lz - lz)).toBeLessThan(0.01);
      }
      if (!f0.rc) {
        tested++;
        const rz = at(f0.rz, f0.lz);
        // (drawn in: to STOP_SPLIT behind the planted foot or on to its stance spot under the stopped body)
        if (rz !== f0.rz) expect(last.rz - f0.lz).toBeGreaterThanOrEqual(-STOP_CLOSE);
        else if (!wide(f0.lz, rz)) expect(Math.hypot(last.rx - f0.rx, last.rz - rz)).toBeLessThan(0.01);
      }
      expect(Math.abs(last.lz - last.rz)).toBeLessThanOrEqual(STOP_CLOSE + 0.01);
      // two landings at most (the foot in the air, a closing step), then nothing moves for over a second
      expect(last.landed - f0.landed).toBeLessThanOrEqual(2);
      const k1 = k0 + Math.ceil((CT.stopBlend + 0.05 + 0.2 + PLANNER.idleStepTime) * 120);
      expect(last.lc && last.rc).toBe(true);
      expect(Math.hypot(last.lx - frames[k1]!.lx, last.lz - frames[k1]!.lz) + Math.hypot(last.rx - frames[k1]!.rx, last.rz - frames[k1]!.rz)).toBeLessThan(1e-6);
    }
    expect(tested).toBeGreaterThan(0);
  });
});

describe('foot planner', () => {
  it('walking: planted feet do not slide (< 1 cm), feet alternate and never cross', () => {
    const { frames, planner } = simulate(5, (i) => (i.vz = MOVEMENT.walkSpeed));
    expect(maxPlantedSlide(frames)).toBeLessThan(0.01);
    expect(planner.L.slide + planner.R.slide).toBeLessThan(0.01);
    expect(frames.at(-1)!.landed).toBeGreaterThan(5);
    for (const f of frames) expect(f.latL).toBeLessThan(f.latR);
  });
  it('jog and sprint: no sliding at speed', () => {
    for (const v of [MOVEMENT.jogSpeed, MOVEMENT.sprintSpeed]) {
      const { frames, planner } = simulate(4, (i) => {
        i.vz = v;
        i.faceTravel = true;
        i.sprinting = v > 3;
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
  it('(anim-rework S3) the aimed glide strafe: the closing foot comes in to GLIDE_GAP, never crossing', () => {
    const { frames } = simulate(4, (i) => (i.vx = MOVEMENT.adsSpeed * MOVEMENT.strafeMult), 120, 0, undefined, true);
    let least = Infinity;
    let most = 0;
    for (const f of frames.slice(frames.length >> 1)) {
      least = Math.min(least, f.latR - f.latL);
      most = Math.max(most, f.latR - f.latL);
    }
    expect(least).toBeGreaterThan(GLIDE_GAP - 0.01);
    // a short step: the feet open to about shoulder width at the widest (the crab spread them up to 1 m)
    expect(most).toBeLessThan(0.42);
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
  it('an early toe-off keeps its progress when the clock opens the swing window (no snap back)', () => {
    const p = new FootPlanner();
    const i = emptyPlannerInput();
    i.dt = 1 / 120;
    i.moving = true;
    i.velZ = 2.3;
    i.duty = 0.62;
    i.cycleTime = 0.6;
    i.phase = 0.3;
    p.update(i);
    // the body pulls ahead of the planted left foot: it toes off early (contact window still open)
    i.rootZ = 0.6;
    let prev = p.L.z;
    let back = 0;
    for (let k = 0; k < 60; k++) {
      i.phase = (i.phase + i.dt / i.cycleTime) % 1;
      i.rootZ += i.velZ * i.dt;
      p.update(i);
      if (!p.L.contact) back = Math.max(back, prev - p.L.z);
      prev = p.L.z;
    }
    expect(back).toBeLessThan(0.002);
  });
});

describe('foot planner: turns (A1.1)', () => {
  it('a tight walking circle: feet never cross and no planted foot is dragged past the reach limit', () => {
    for (const speed of [0.75, 2.0, 3.0]) {
      const { frames } = simulate(4, (i, t) => {
        i.ct = true;
        i.faceTravel = true;
        const a = t * 7;
        i.vx = Math.sin(a) * speed;
        i.vz = Math.cos(a) * speed;
      });
      let crossed = 0;
      for (const f of frames) {
        // both planted: the left foot is left of the right one in the body frame (an airborne foot may be mid-swing)
        if (f.lc && f.rc && f.latL > f.latR + 0.02) crossed++;
      }
      expect(crossed, `speed ${speed}`).toBe(0);
      expect(maxPlantedSlide(frames)).toBeLessThan(0.03);
    }
  });
});

describe('(anim-natural N1) still: the idle step tie', () => {
  it('a crouch re-step from a square stance: the foot planted longer steps first (turnRule 0: the left, as before)', () => {
    for (const rule of [1, 0])
      for (const longer of [-1, 1] as const) {
        const p = new FootPlanner();
        const i = emptyPlannerInput();
        i.dt = 1 / 120;
        i.stride = 'facing';
        i.turnRule = rule;
        i.lX = -0.06;
        i.rX = 0.06;
        i.lZ = i.rZ = 0;
        for (let k = 0; k < 60; k++) p.update(i);
        expect(p.L.contact && p.R.contact).toBe(true);
        // this foot has stood longer (the other one stepped last)
        (longer < 0 ? p.L : p.R).plantT += 1;
        // crouched: the stance widens by 2.5 cm a side, the stance change's re-step
        i.crouch = 1;
        i.lX = -0.085;
        i.rX = 0.085;
        p.update(i);
        const first = rule === 0 ? p.L : longer < 0 ? p.L : p.R;
        expect(first.contact, `rule ${rule} longer ${longer}`).toBe(false);
        expect((first === p.L ? p.R : p.L).contact, `rule ${rule} longer ${longer}`).toBe(true);
      }
  });
});
