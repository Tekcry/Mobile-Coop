import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GEARS, STICK_SPEED } from '../src/config/movement';
import { stickCurve, stickMagFor, stickSpeed } from '../src/player/speedGears';
import { applyRadialDeadzone } from '../src/input/stickMath';
import { defaultSettings } from '../src/core/settings';
import { PERCEPTION, fieldFactor } from '../src/ai/perception';
import { ARCHETYPE } from '../src/ai/archetypes';
import type { AlertLevel } from '../src/ai/alertState';
import { speedMoveMul } from '../src/player/speedTune';
import {
  ALERT_RANK, ARRIVE_M, RISE_DETECTION, RISE_NOTICE, readPace, riseClass, DOOR_LIMIT_S, GAME_SENSES, GAME_STICK, METRICS_FILE, PathProgress, STUCK_MIN_PROGRESS_M, STUCK_WINDOW_S, Steer, StuckWatch, TRAIL_M, Trail,
  WATCH_OK, WATCH_STALL, WATCH_STEP_TIMEOUT, inferCause, makePath, paceFor, pointAt, sightRange, stepLimit, stickToward,
  // @ts-expect-error plain .mjs script without types
} from '../scripts/route-run/progress.mjs';

type P3 = { x: number; y: number; z: number };
const DT = 0.05;
const hyp = (...a: number[]): number => Math.sqrt(a.reduce((s, v) => s + v * v, 0));
const metrics = JSON.parse(fs.readFileSync(path.resolve(METRICS_FILE), 'utf8'));
const SNEAK = paceFor('sneak', metrics);

/** The game's camera-relative wish direction (playerController.ts) from the stick: world (x, z). */
function worldFromStick(sx: number, sy: number, yaw: number): [number, number] {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  return [fz * sx + fx * sy, -fx * sx + fz * sy];
}

/** Walks a robot along `pts` with the steering, at `speed` m/s, until done or `maxT`; `block(x, z)` may pin it. */
function walk(pts: P3[], opts: { yaw?: number; speed?: number; maxT?: number; block?: (p: P3) => boolean } = {}) {
  const p = makePath(pts);
  const prog = new PathProgress(p);
  const steer = new Steer(p);
  const watch = new StuckWatch();
  const yaw = opts.yaw ?? 0.7;
  const speed = opts.speed ?? SNEAK.speed;
  const r = { ...pts[0]! };
  let maxOff = 0;
  let stop = '';
  let t = 0;
  watch.walk(0, 0);
  for (let i = 1; t < (opts.maxT ?? 120); i++) {
    t = i * DT;
    steer.update(r.x, r.y, r.z, prog.s, yaw, SNEAK.stick);
    if (steer.done) break;
    const m = hyp(steer.stickX, steer.stickY);
    const [wx, wz] = worldFromStick(steer.stickX / m, steer.stickY / m, yaw);
    const nx = r.x + wx * speed * DT;
    const nz = r.z + wz * speed * DT;
    if (!opts.block?.({ x: nx, y: r.y, z: nz })) {
      r.x = nx;
      r.z = nz;
    }
    prog.update(r.x, r.y, r.z);
    maxOff = Math.max(maxOff, prog.off);
    const w = watch.update(t, prog.s);
    if (w) {
      stop = w;
      break;
    }
  }
  return { done: steer.done, stop, t, r, s: prog.s, maxOff, length: p.length, firedAt: watch.firedAt, lastGainT: watch.anchorT };
}

describe('route-run progress: game numbers mirrored', () => {
  it('stick curve, pad dead zone and senses match the game tables', () => {
    expect(GAME_STICK.deadZone).toBe(GEARS.deadZone);
    expect(GAME_STICK.crouch).toEqual([...GEARS.crouch]);
    expect(GAME_STICK.stand).toEqual([...GEARS.stand]);
    expect(GAME_STICK.at).toEqual([...STICK_SPEED.at]);
    expect(GAME_STICK.minCrouch).toBe(STICK_SPEED.minCrouch);
    expect(GAME_STICK.minStand).toBe(STICK_SPEED.minStand);
    expect(GAME_STICK.padInner).toBe(defaultSettings().gamepad.deadzoneLeft);
    expect(applyRadialDeadzone(GAME_STICK.padOuter, 0, GAME_STICK.padInner).x).toBeCloseTo(1, 9);
    for (const k of ['focusHalf', 'focusRange', 'periphHalf', 'periphRange', 'edgeBlend', 'closeRange'] as const) expect(GAME_SENSES[k]).toBe(PERCEPTION[k]);
    expect(GAME_SENSES.dogSmell).toBe(ARCHETYPE.dog.smell);
    expect(GAME_SENSES.dogSmellCrouchMul).toBe(ARCHETYPE.dog.crouchMul);
    const out = [0];
    for (const a of [0, 0.3, 0.5, 0.6, 0.65, 1.2, 1.7, 1.75, 2.5]) {
      fieldFactor(a, out);
      expect(sightRange(a)).toBeCloseTo(out[0]!, 9);
    }
  });
});

describe('route-run progress: pace (A3)', () => {
  it('sneak is crouched at split_speed_mps from metrics.json, and the pad stick gives exactly that speed', () => {
    expect(metrics.rules.split_speed_mps).toBe(1.3);
    expect(SNEAK).toMatchObject({ pace: 'sneak', crouched: true, speed: 1.3, minGear: 2 });
    expect(SNEAK.gameMag).toBeCloseTo(stickMagFor(1.3, true), 12);
    for (const p of ['sneak', 'walk', 'run'] as const) {
      const pc = paceFor(p, metrics);
      const m = applyRadialDeadzone(pc.stick, 0, defaultSettings().gamepad.deadzoneLeft).x;
      expect(stickSpeed(stickCurve(m), pc.crouched)).toBeCloseTo(pc.speed, 9);
    }
    expect(paceFor('walk', metrics)).toMatchObject({ crouched: false, speed: 2.1, minGear: 3 });
    expect(paceFor('run', metrics)).toMatchObject({ crouched: false, speed: 4.0, minGear: 5 });
    // the tuner's pace multiplier is 1 at the sneak point, so the stick's speed is the walked speed
    expect(speedMoveMul(SNEAK.speed, 'crouch', 0, 1)).toBe(1);
  });
  it('readPace reads split_speed_mps from metrics.json', async () => {
    expect(METRICS_FILE).toBe('docs/design/metrics.json');
    expect(await readPace()).toEqual(SNEAK);
    expect(await readPace('walk', '.')).toEqual(paceFor('walk', metrics));
  });
  it('refuses a missing speed or an unknown pace', () => {
    expect(() => paceFor('sneak', { rules: {} })).toThrow(/split_speed_mps/);
    expect(() => paceFor('jog', metrics)).toThrow(/unknown pace/);
  });
});

describe('route-run progress: paths', () => {
  it('arc length and points along a 3D polyline', () => {
    const p = makePath([{ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 4 }, { x: 3, y: 2, z: 4 }]);
    expect(p.length).toBeCloseTo(7, 12);
    const o = { x: 0, y: 0, z: 0 };
    expect(pointAt(p, 2.5, o)).toMatchObject({ x: 1.5, y: 0, z: 2 });
    expect(pointAt(p, 6, o)).toMatchObject({ x: 3, y: 1, z: 4 });
    expect(pointAt(p, 99, o)).toMatchObject({ x: 3, y: 2, z: 4 });
  });
  it('progress is monotonic: walking back does not lower it', () => {
    const pr = new PathProgress(makePath([{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }]));
    expect(pr.update(4, 0, 0.3)).toBeCloseTo(4, 9);
    expect(pr.off).toBeCloseTo(0.3, 9);
    expect(pr.update(2, 0, 0)).toBeCloseTo(4, 9);
    expect(pr.update(5, 0, 0)).toBeCloseTo(5, 9);
  });
});

describe('route-run progress: steering and stuck watch (A4)', () => {
  it('a straight leg: arrives within the radius, never stops, stays on the line', () => {
    const run = walk([{ x: 0, y: 0, z: 0 }, { x: 20, y: 0, z: 5 }]);
    expect(run.stop).toBe('');
    expect(run.done).toBe(true);
    expect(hyp(run.r.x - 20, run.r.z - 5)).toBeLessThanOrEqual(ARRIVE_M);
    expect(run.maxOff).toBeLessThan(0.05);
    // at the sneak pace: ~20.6 m in ~15.9 s
    expect(run.t).toBeGreaterThan(run.length / 1.3 - 1);
    expect(run.t).toBeLessThan(run.length / 1.3 + 0.5);
  });
  it('corners are walked through the waypoint, not cut', () => {
    const run = walk([{ x: 0, y: 0, z: 0 }, { x: 6, y: 0, z: 0 }, { x: 6, y: 0, z: 6 }], { yaw: -2 });
    expect(run.done).toBe(true);
    expect(run.stop).toBe('');
    expect(run.maxOff).toBeLessThanOrEqual(ARRIVE_M);
  });
  it('the stick follows the camera: forward is (sin yaw, cos yaw), right is (cos yaw, -sin yaw)', () => {
    const o = { x: 0, y: 0 };
    stickToward(Math.sin(1.1), Math.cos(1.1), 1.1, o);
    expect(o.x).toBeCloseTo(0, 12);
    expect(o.y).toBeCloseTo(1, 12);
    stickToward(Math.cos(1.1), -Math.sin(1.1), 1.1, o);
    expect(o.x).toBeCloseTo(1, 12);
    expect(o.y).toBeCloseTo(0, 12);
    const st = new Steer(makePath([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 10 }]));
    st.update(0, 0, 0, 0, 0, 0.5);
    expect(st.axisX).toBeCloseTo(0, 12);
    expect(st.axisY).toBeCloseTo(-0.5, 12); // the pad's axis 1 is +down: pushed up
  });
  it('a robot pinned on a wall stops at 8 s, not 7.9', () => {
    expect(STUCK_WINDOW_S).toBe(8);
    expect(STUCK_MIN_PROGRESS_M).toBe(0.5);
    const run = walk([{ x: 0, y: 0, z: 0 }, { x: 20, y: 0, z: 0 }], { yaw: 1.2, block: (p) => p.x > 3 });
    expect(run.stop).toBe(WATCH_STALL);
    // it walked into the wall at x = 3 (~2.3 s); the stop comes 8 s after its last 0.5 m gain, not a poll sooner
    expect(run.r.x).toBeLessThanOrEqual(3);
    expect(run.lastGainT).toBeGreaterThan(1.5);
    expect(run.firedAt - run.lastGainT).toBeGreaterThanOrEqual(STUCK_WINDOW_S - 1e-9);
    expect(run.firedAt - run.lastGainT).toBeLessThan(STUCK_WINDOW_S + DT / 2);
    // pinned from the first poll: quiet at 7.9 s and 7.95 s, stopped at 8.0 s
    const w = new StuckWatch();
    w.walk(0, 0);
    for (let i = 1; i <= 158; i++) expect(w.update(i * DT, 0.1)).toBe(WATCH_OK);
    expect(w.update(7.9, 0.1)).toBe(WATCH_OK);
    expect(w.update(160 * DT, 0.1)).toBe(WATCH_STALL);
    expect(w.fired).toBe(WATCH_STALL);
    expect(w.firedAt).toBeCloseTo(8, 9);
    expect(w.update(8.05, 0.1)).toBe(WATCH_OK); // fires once
    // the driver's clock adds 0.05 s chunks (8 s sums to 7.99999...): still the 160th poll, not the 161st
    const v = new StuckWatch();
    v.walk(0, 0);
    let t = 0;
    let polls = 0;
    while (v.update((t += DT), 0) === WATCH_OK) polls++;
    expect(polls + 1).toBe(160);
  });
  it('a creep under 0.5 m in 8 s is stuck; each 0.5 m gained restarts the clock', () => {
    const w = new StuckWatch();
    w.walk(10, 0);
    expect(w.update(17.9, 0.45)).toBe(WATCH_OK);
    expect(w.update(18, 0.49)).toBe(WATCH_STALL);
    const v = new StuckWatch();
    v.walk(0, 0);
    expect(v.update(7, 0.5)).toBe(WATCH_OK);
    expect(v.update(14.9, 0.9)).toBe(WATCH_OK);
    expect(v.update(15, 0.9)).toBe(WATCH_STALL);
  });
  it('a door pause of 1.5 s is no stop, walking or as a door step', () => {
    const pts = [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }];
    const p = makePath(pts);
    const pr = new PathProgress(p);
    const w = new StuckWatch();
    w.walk(0, 0);
    let x = 0;
    for (let i = 1; i * DT <= 9; i++) {
      const t = i * DT;
      if (t < 3 || t > 4.5) x += SNEAK.speed * DT; // stands at the door 3.0-4.5 s
      expect(w.update(t, pr.update(x, 0, 0))).toBe(WATCH_OK);
    }
    expect(DOOR_LIMIT_S).toBe(5);
    w.step(20, stepLimit('door'));
    for (let t = 20; t <= 21.5; t += DT) expect(w.update(t, 0)).toBe(WATCH_OK);
    w.walk(21.5, pr.s);
    expect(w.update(25, pr.s + 1)).toBe(WATCH_OK);
  });
  it('a ladder over its limit is a step-timeout', () => {
    const lim = stepLimit('ladder', 4);
    expect(lim).toBe(19);
    const w = new StuckWatch();
    w.step(100, lim);
    expect(w.update(119, 0)).toBe(WATCH_OK);
    expect(w.update(119.05, 0)).toBe(WATCH_STEP_TIMEOUT);
    expect(w.fired).toBe(WATCH_STEP_TIMEOUT);
  });
  it('step limits (A4) and idle holds', () => {
    expect([stepLimit('door'), stepLimit('drop'), stepLimit('window'), stepLimit('hatch')]).toEqual([5, 5, 8, 8]);
    expect(stepLimit('ladder', 3.3)).toBeCloseTo(18.3, 12);
    expect(stepLimit('duct', 6)).toBe(12);
    expect(stepLimit('duct')).toBe(null); // no length: no limit, never an instant timeout
    expect(stepLimit('ladder')).toBe(15);
    expect(stepLimit('objective', 0, 4)).toBe(9);
    expect(stepLimit('coop_boost')).toBe(null);
    const w = new StuckWatch();
    w.idle();
    expect(w.update(1000, 0)).toBe(WATCH_OK);
  });
});

describe('route-run progress: storeys', () => {
  // an overlapping plan: east on the ground, a ladder up at x = 10, then a walkway straight back west right above it
  const over = [
    { x: 0, y: 0, z: 0 },
    { x: 10, y: 0, z: 0 },
    { x: 10, y: 3.3, z: 0 },
    { x: 0, y: 3.3, z: 0 },
  ];
  it('overlapping plan: the walkway counts on the walkway, never from the ground below it', () => {
    const pr = new PathProgress(makePath(over));
    const w = new StuckWatch();
    w.walk(0, 0);
    let t = 0;
    for (let x = 0; x <= 10; x += 0.25) expect(w.update((t += 0.2), pr.update(x, 0, 0))).toBe(WATCH_OK);
    for (let y = 0; y <= 3.3; y += 0.3) pr.update(10, y, 0);
    pr.update(10, 3.3, 0);
    expect(pr.s).toBeCloseTo(13.3, 6);
    pr.update(7, 3.3, 0);
    expect(pr.s).toBeCloseTo(16.3, 6);
    // a twin that fell off the top of the ladder and walks west on the ground under the walkway: no progress
    // (the walkway is 3.3 m straight up), so the watch stops it 8 s after its last gain
    const fell = new PathProgress(makePath(over));
    fell.resetTo(13.3);
    w.walk(t, 13.3);
    let stop = '';
    for (let x = 10; x >= -10 && !stop; x -= SNEAK.speed * DT) {
      t += DT;
      fell.update(x, 0, 0);
      expect(fell.s).toBeCloseTo(13.3, 9);
      stop = w.update(t, fell.s);
    }
    expect(fell.s).toBeCloseTo(13.3, 9);
    expect(stop).toBe(WATCH_STALL);
    expect(w.firedAt - w.anchorT).toBeCloseTo(STUCK_WINDOW_S, 6);
  });
  // ground floor east, a ladder up at x = 10, then a walkway back west on the floor above, over the same plan
  const pts = [
    { x: 0, y: 0, z: 0 },
    { x: 10, y: 0, z: 0 },
    { x: 10, y: 3.3, z: 0 },
    { x: 10, y: 3.3, z: 4 },
    { x: 0, y: 3.3, z: 4 },
  ];
  it('a robot on the ground under the walkway above never takes its progress', () => {
    const pr = new PathProgress(makePath(pts), { ahead: Infinity });
    pr.update(5, 0, 0);
    expect(pr.s).toBeCloseTo(5, 9);
    // wandered off the ground leg to under the walkway: the walkway is nearer in 3D (3.3 m) than the leg (4 m)
    pr.update(5, 0, 4);
    expect(pr.s).toBeCloseTo(5, 9);
    expect(pr.off).toBeCloseTo(4, 9);
  });
  it('climbing the ladder and walking the walkway count, at the right storey', () => {
    const pr = new PathProgress(makePath(pts));
    for (let x = 0; x <= 10; x += 0.5) pr.update(x, 0, 0);
    expect(pr.s).toBeCloseTo(10, 9);
    for (let i = 0; i <= 10; i++) pr.update(10, i * 0.3, 0);
    expect(pr.s).toBeCloseTo(13, 6);
    pr.update(10, 3.3, 0);
    expect(pr.s).toBeCloseTo(13.3, 6);
    pr.update(10, 3.3, 2);
    expect(pr.s).toBeCloseTo(15.3, 6);
    pr.update(10, 3.3, 4);
    pr.update(7, 3.3, 4);
    expect(pr.s).toBeCloseTo(20.3, 6);
    // the ground floor below the walkway point gives nothing back
    pr.update(7, 0, 4);
    expect(pr.s).toBeCloseTo(20.3, 6);
  });
});

describe('route-run progress: the follower trail', () => {
  it('2 m behind the leader on his walked path, through a corner', () => {
    expect(TRAIL_M).toBe(2);
    const tr = new Trail();
    let x = 0;
    let z = 0;
    // east 5 m, then north 1 m, sampled every poll at the sneak pace
    for (; x < 5; x += SNEAK.speed * DT) tr.push(x, 0, 0);
    x = 5;
    for (; z < 1; z += SNEAK.speed * DT) tr.push(5, 0, z);
    z = 1;
    tr.push(x, 0, z);
    tr.point(TRAIL_M, x, 0, z);
    // 2 m back along the walked path: 1 m down the north leg, 1 m back along the east leg (not the cut corner)
    expect(Math.abs(tr.tz)).toBeLessThan(0.1);
    expect(tr.tx).toBeGreaterThan(3.9);
    expect(tr.tx).toBeLessThan(4.15);
    const straight = hyp(x - tr.tx, z - tr.tz);
    expect(straight).toBeLessThan(TRAIL_M - 0.3); // the corner shortens the straight line
  });
  it('short walked path: the trail point is the oldest point kept', () => {
    const tr = new Trail();
    tr.push(1, 0, 1);
    tr.push(1.5, 0, 1);
    tr.point(2, 1.6, 0, 1);
    expect([tr.tx, tr.tz]).toEqual([1, 1]);
  });
  it('the ring wraps and keeps the newest points', () => {
    const tr = new Trail(8, 0.25);
    for (let i = 0; i <= 40; i++) tr.push(i * 0.5, 0, 0);
    expect(tr.count).toBe(8);
    tr.point(2, 20, 0, 0);
    expect(tr.tx).toBeCloseTo(18, 9);
    tr.point(100, 20, 0, 0);
    expect(tr.tx).toBeCloseTo(16.5, 9); // the oldest of the 8 kept
  });
});

describe('route-run progress: rises (detections and notices)', () => {
  it('alert is a detection, suspicious / investigating a notice, falls and searching nothing', () => {
    const game: AlertLevel[] = ['unaware', 'suspicious', 'investigating', 'searching', 'alert', 'cooldown'];
    expect(Object.keys(ALERT_RANK).sort()).toEqual([...game].sort());
    expect(riseClass('unaware', 'alert')).toBe(RISE_DETECTION);
    expect(riseClass('searching', 'alert')).toBe(RISE_DETECTION);
    expect(riseClass('unaware', 'suspicious')).toBe(RISE_NOTICE);
    expect(riseClass('suspicious', 'investigating')).toBe(RISE_NOTICE);
    expect(riseClass('cooldown', 'investigating')).toBe(RISE_NOTICE);
    expect(riseClass('alert', 'alert')).toBe('');
    expect(riseClass('alert', 'searching')).toBe('');
    expect(riseClass('investigating', 'suspicious')).toBe('');
    expect(riseClass('unaware', 'searching')).toBe('');
  });
});

describe('route-run progress: inferred cause (R7 fallback)', () => {
  const guard = { id: 'g1', kind: 'guard', x: 0, y: 1.55, z: 0, yaw: 0 }; // faces +z
  const robot = (x: number, z: number, o: Record<string, unknown> = {}) => ({ x, y: 1, z, crouched: true, speed: 1.3, light: 0.5, ...o });
  it('camera', () => {
    expect(inferCause({ guard: { id: 'cam3', kind: 'camera', x: 0, y: 4, z: 0, yaw: 0 }, robots: [robot(0, 5)], camera: 'cam3' })).toEqual({
      sense: 'camera', inferred: true, robot: 0, inputs: { camera: 'cam3' },
    });
  });
  it('sight: the nearest robot in field and range, with the inputs', () => {
    const c = inferCause({ guard, robots: [robot(0, 20), robot(1, 8, { light: 0.8, crouched: false, speed: 2.1 })] });
    expect(c.sense).toBe('sight');
    expect(c.inferred).toBe(true);
    expect(c.robot).toBe(1);
    expect(c.inputs.distance).toBeCloseTo(hyp(1, 0.55, 8), 9);
    expect(c.inputs.angle).toBeCloseTo(Math.atan2(1, 8), 9);
    expect(c.inputs).toMatchObject({ light: 0.8, stance: 'standing', speed: 2.1 });
    expect(Object.keys(c.inputs).sort()).toEqual(['angle', 'distance', 'light', 'speed', 'stance']);
  });
  it('sight needs the field, the range and a clear line', () => {
    expect(inferCause({ guard, robots: [robot(0, 24)] }).sense).toBe('sight'); // focus range 25
    expect(inferCause({ guard, robots: [robot(15, 1)] }).sense).toBe('unknown'); // 86 deg: periph range 12
    expect(inferCause({ guard, robots: [robot(10, 1)] }).sense).toBe('sight');
    expect(inferCause({ guard, robots: [robot(0, -5)] }).sense).toBe('unknown'); // behind
    expect(inferCause({ guard, robots: [robot(0, 5, { los: false })] }).sense).toBe('unknown');
  });
  it('close: a moving robot within close range behind him; a still one is not felt', () => {
    const c = inferCause({ guard, robots: [robot(0, -1.2)] });
    expect(c).toMatchObject({ sense: 'close', robot: 0, inputs: { stance: 'crouched', speed: 1.3 } });
    expect(c.inputs.distance).toBeCloseTo(hyp(0, 0.55, 1.2), 9);
    expect(inferCause({ guard, robots: [robot(0, -1.2, { speed: 0 })] }).sense).toBe('unknown');
  });
  it('smell: dogs only, crouched shortens it', () => {
    const dog = { ...guard, kind: 'dog' };
    expect(inferCause({ guard: dog, robots: [robot(0, -4)] }).sense).toBe('smell'); // 4.0 < 6 x 0.7
    expect(inferCause({ guard: dog, robots: [robot(0, -4.5)] }).sense).toBe('unknown'); // 4.5 > 4.2
    expect(inferCause({ guard: dog, robots: [robot(0, -4.5, { crouched: false })] }).sense).toBe('smell');
    expect(inferCause({ guard, robots: [robot(0, -4)] }).sense).toBe('unknown');
  });
  it('hearing: the loudest noise, made by the robot nearest its source', () => {
    const c = inferCause({
      guard,
      robots: [robot(0, -10), robot(6, -8)],
      heard: [{ x: 0, y: 0, z: -10, radius: 4, kind: 'step' }, { x: 6, y: 0, z: -8, radius: 12, kind: 'door' }],
    });
    expect(c).toMatchObject({ sense: 'hearing', inferred: true, robot: 1, inputs: { radius: 12, kind: 'door' } });
    expect(c.inputs.distance).toBeCloseTo(hyp(6, 1.55, 8), 9);
  });
  it('told, body, unknown', () => {
    expect(inferCause({ guard, robots: [robot(0, -10)], told: 'g2' })).toEqual({ sense: 'told', inferred: true, robot: -1, inputs: { by: 'g2' } });
    expect(inferCause({ guard, robots: [robot(0, -10)], body: true })).toMatchObject({ sense: 'body', robot: -1 });
    expect(inferCause({ guard, robots: [robot(0, -10)] })).toEqual({ sense: 'unknown', inferred: true, robot: -1, inputs: null });
  });
  it('order: sight before hearing and told', () => {
    expect(inferCause({ guard, robots: [robot(0, 6)], heard: [{ x: 0, y: 0, z: 6, radius: 8, kind: 'step' }], told: 'g2' }).sense).toBe('sight');
  });
});
