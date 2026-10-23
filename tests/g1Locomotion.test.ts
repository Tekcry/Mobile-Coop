// (CT prototype G1) Legs and gait against the Chaos Theory footage (docs/ct-prototype/audit/AUDIT-LOCOMOTION.md): the
// pure parts (step cap, tense trigger, graph layers) and the real rig on a NullEngine driven as player.ts drives it.
import { describe, expect, it } from 'vitest';
import { AnimGraph, BANK, defaultInput } from '../src/anim/animGraph';
import { emptyMotionInput, gaitRate, MotionDriver, stepLength } from '../src/anim/motion';
import { CT, ENEMY_MOTION, GEARS, MOVEMENT, TENSE } from '../src/config/movement';
import { TURN_FOLLOW } from '../src/anim/footPlanner';
import { unawareGuardNear } from '../src/player/tenseSneak';
import { proportions } from '../src/player/proportions';

describe('G1 gait numbers', () => {
  it('(row 7; anim-rework S2, M6) real-world steps: longer strides and fewer steps a second at the top end', () => {
    // (M6 Michael 2026-10-20: "the leg strides should be further apart with less steps") 0.3 + 0.24 v on foot, the walk
    // 0.3 + 0.2 v to 2.1 m/s (WALK_STEP; the CT 0.17 and the 0.95 m cap gone; crouched keeps 0.3 + 0.2 v): 0.58 m at
    // 1.4 m/s, 1.02 m at the jog, 1.26 m at the 4 m/s run
    expect(stepLength(1.4)).toBeCloseTo(0.58, 9);
    expect(stepLength(2.1)).toBeCloseTo(0.72, 9);
    // (afp AF3, walk 4.72 P2) crouched: CROUCH_STEP 0.3 + 0.115 v, + 0.35 a m/s past 1.9 (was 0.3 + 0.2 v: 0.7 at 2 m/s)
    expect(stepLength(2, MOVEMENT, 0, 0, 1)).toBeCloseTo(0.3 + 0.115 * 2 + 0.35 * (2 - 1.9), 9);
    expect(stepLength(GEARS.stand[3]!)).toBeCloseTo(0.3 + 0.24 * GEARS.stand[3]!, 9);
    // ~2.4 steps a second at a 1.4 m/s walk (was 2.6), ~2.9 at 2.1 m/s (was 3.2)
    expect(2 * gaitRate(1.4, 0)).toBeGreaterThan(2.2);
    expect(2 * gaitRate(1.4, 0)).toBeLessThan(2.5);
    expect(2 * gaitRate(2.1, 0)).toBeLessThan(3.0);
    // the run: ~3.2 steps a second (real-world running 2.7-3.1 at this pace; the CT cap ran 4.7)
    expect(stepLength(GEARS.stand[4]!)).toBeLessThanOrEqual(MOVEMENT.stepLenMax);
    const stepsPerS = 2 * gaitRate(GEARS.stand[4]!, 0);
    expect(stepsPerS).toBeGreaterThan(2.8);
    expect(stepsPerS).toBeLessThan(3.4);
    expect(stepLength(5, ENEMY_MOTION)).toBeCloseTo(0.27 + 0.22 * 5, 9);
  });
  it('(row 14; anim-rework S2, M6 "full speed is too quick") the run is 4.0 m/s', () => {
    expect(GEARS.stand[4]).toBe(4.0);
    expect(CT.turnSlowTo).toBe(4.0);
  });
  it('(row 26) the tense sneak steps TENSE.step long', () => {
    expect(stepLength(1.1, MOVEMENT, 0, 1)).toBeCloseTo(TENSE.step, 9);
    // ~1.3 steps/s at 1.1 m/s (112331 @ 12-15)
    expect(2 * gaitRate(1.1, 0, MOVEMENT, 0, 1)).toBeCloseTo(1.1 / TENSE.step, 6);
  });
  it('(row 26) an unaware, living guard within TENSE.radius sets it off', () => {
    const g = (x: number, z: number, alive = true, alerted = false) => ({ pos: { x, z }, alive, alerted });
    expect(unawareGuardNear([g(3, 3)], 0, 0)).toBe(true);
    expect(unawareGuardNear([g(4, 4)], 0, 0)).toBe(false);
    expect(unawareGuardNear([g(1, 0, false)], 0, 0)).toBe(false);
    expect(unawareGuardNear([g(1, 0, true, true)], 0, 0)).toBe(false);
    expect(unawareGuardNear([g(9, 9), g(0, 2)], 0, 0)).toBe(true);
    // (G1 fix) only an unaware guard: not one that is searching or suspicious, even out of combat
    expect(unawareGuardNear([{ ...g(1, 0), level: 'unaware' }], 0, 0)).toBe(true);
    for (const level of ['suspicious', 'investigating', 'searching', 'cooldown']) expect(unawareGuardNear([{ ...g(1, 0), level }], 0, 0)).toBe(false);
  });
});

describe('G1 graph layers', () => {
  const settle = (g: AnimGraph, i: ReturnType<typeof defaultInput>, s: number) => {
    for (let k = 0; k < s * 60; k++) g.update(1 / 60, i);
  };
  it('(row 12) a run turn banks into the turn (~10 deg at 12 m/s^2, up to BANK.max); a walk turn does not', () => {
    const roll = (speed: number, yawRate: number) => {
      const g = new AnimGraph(proportions());
      const i = defaultInput();
      i.speed = speed;
      i.localZ = 1;
      i.yawRate = yawRate;
      i.armed = false;
      settle(g, i, 1);
      // the chest's world roll: the rig carries 0.6 of the pelvis roll up the chain, plus the spine's own
      return g.out.pelvis.roll * 0.6 + g.out.spine.roll;
    };
    const swept = roll(4, 3);
    expect(swept).toBeLessThan(0);
    expect(-swept).toBeGreaterThan(0.12);
    expect(-swept).toBeLessThan(0.25);
    expect(-roll(4.5, 6)).toBeCloseTo(BANK.max, 1);
    expect(Math.abs(roll(1.4, 3))).toBeLessThan(0.09);
    // into the turn either way
    expect(roll(4, -3)).toBeCloseTo(-swept, 1);
  });
  it('(row 9) holding a stop the body comes back up out of the stride within ~0.15 s', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    settle(g, i, 1);
    const idle = g.out.pelvis.y;
    i.speed = 3;
    i.localZ = 1;
    settle(g, i, 1);
    i.speed = 0;
    i.holdSpeed = 3;
    i.quickStop = CT.stopBlend;
    settle(g, i, 0.2);
    expect(Math.abs(g.out.pelvis.y - idle)).toBeLessThan(0.012);
  });
  it('(row 4) from standing the kneel starts with the crouch (no wide squat first); it keeps the lead foot planted', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    settle(g, i, 0.5);
    i.kneel = true;
    let seen = false;
    for (let k = 0; k < 30; k++) {
      i.crouch = Math.min(1, (k + 1) / (0.22 * 60));
      g.update(1 / 60, i);
      if (i.crouch < 0.5 && (g.out.layers.kneel ?? 0) > 0.05) seen = true;
    }
    expect(seen).toBe(true);
    settle(g, i, 1);
    expect(g.out.stance.lZ).toBeGreaterThan(g.out.stance.rZ + 0.4);
    // a stop that left the right foot ahead kneels on the left knee: the right foot stays the front one
    // (afp AF4b, Michael P4 "pistol shifts between knees": an armed Wren rig kneels on the gun hand's knee whatever the lead;
    // holstered, and a guard, by the lead as here)
    const m = new AnimGraph(proportions());
    const j = defaultInput();
    j.armed = false;
    j.crouch = 1;
    settle(m, j, 0.5);
    m.setLead(-0.3);
    j.kneel = true;
    settle(m, j, 1);
    expect(m.out.stance.rZ).toBeGreaterThan(m.out.stance.lZ + 0.4);
    // armed (right hand) with the same lead: the right knee goes down, the left foot is the front one
    const a = new AnimGraph(proportions());
    const ja = defaultInput();
    ja.crouch = 1;
    settle(a, ja, 0.5);
    a.setLead(-0.3);
    ja.kneel = true;
    settle(a, ja, 1);
    expect(a.out.stance.lZ).toBeGreaterThan(a.out.stance.rZ + 0.4);
    // a guard (not a carrier, not a Wren rig) armed: by the lead as before
    const gd = new AnimGraph(proportions());
    const jg = defaultInput();
    jg.mocapOk = false;
    jg.crouch = 1;
    settle(gd, jg, 0.5);
    gd.setLead(-0.3);
    jg.kneel = true;
    settle(gd, jg, 1);
    expect(gd.out.stance.rZ).toBeGreaterThan(gd.out.stance.lZ + 0.4);
  });
  it('(row 26) crouched at a sneak pace with tense set: long steps, a high knee lift; off at a crouch run', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    i.crouch = 1;
    i.speed = 1.1;
    i.localZ = 1;
    settle(g, i, 1);
    const lift0 = g.out.gait.liftH;
    i.tense = true;
    settle(g, i, 1);
    expect(g.out.gait.cycleTime).toBeCloseTo(1 / gaitRate(1.1, 0, MOVEMENT, 0, 1), 1);
    expect(g.out.gait.liftH).toBeGreaterThan(lift0 * 2);
    i.speed = 2.6;
    settle(g, i, 1);
    expect(g.out.gait.cycleTime).toBeCloseTo(1 / gaitRate(2.6, 0, MOVEMENT, 0, 0, 1), 2);
  });
  it('(row 18) a drop of a metre lands deep (~0.4 m dip); a small one keeps the shallow landing', () => {
    const dip = (landing: number) => {
      const g = new AnimGraph(proportions());
      const i = defaultInput();
      settle(g, i, 0.5);
      const y0 = g.out.pelvis.y;
      i.landing = landing;
      let lo = 0;
      for (let k = 0; k < 30; k++) {
        g.update(1 / 60, i);
        i.landing = Math.max(0, i.landing - 2 / 60);
        lo = Math.min(lo, g.out.pelvis.y - y0);
      }
      return -lo;
    };
    expect(dip(1)).toBeGreaterThan(0.3);
    expect(dip(0.55)).toBeLessThan(0.2);
  });
});

/** The real rig, posed as player.ts poses it from a CT motion driver (stick: direction, pace; null released). */
async function rigRun(o: { seconds: number; from: number; crouch?: boolean; stick: (t: number) => { dir: number; speed: number } | null }) {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
  rig.groundProbe = () => 0;
  const d = new MotionDriver(0);
  const mi = emptyMotionInput();
  const dt = 1 / 60;
  let x = 0;
  let z = 0;
  let hold = false;
  let holdSpeed = 0;
  let stillT = 0;
  const W = (nd: { parent: unknown; computeWorldMatrix(f: boolean): unknown; getAbsolutePosition(): { x: number; y: number; z: number } }) => {
    const chain: (typeof nd)[] = [];
    for (let q: typeof nd | null = nd; q; q = q.parent as typeof nd | null) chain.unshift(q);
    for (const q of chain) q.computeWorldMatrix(true);
    const p = nd.getAbsolutePosition();
    return { x: p.x, y: p.y, z: p.z };
  };
  const flex = (h: Parameters<typeof W>[0], k: Parameters<typeof W>[0], a: Parameters<typeof W>[0]) => {
    const H = W(h);
    const K = W(k);
    const A = W(a);
    const ux = K.x - H.x, uy = K.y - H.y, uz = K.z - H.z;
    const vx = A.x - K.x, vy = A.y - K.y, vz = A.z - K.z;
    const c = (ux * vx + uy * vy + uz * vz) / Math.sqrt((ux * ux + uy * uy + uz * uz) * (vx * vx + vy * vy + vz * vz));
    return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  };
  const r = { kneeMid: 0, kneeIdle: 0, latMax: 0, headMin: 9, headMax: -9, kneeYMin: 9, split: 0, kneelAt: -1, firstLand: -1, feetApart: 0 };
  const pose: Parameters<typeof rig.animate>[1] = { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: o.crouch ? 1 : 0, aimPitch: 0, aim: 0, kick: 0, armed: false };
  for (let n = 0; n < o.seconds * 60; n++) {
    const t = n * dt;
    const s = o.stick(t);
    mi.ct = true;
    mi.faceTravel = true;
    mi.yaw = d.yaw;
    mi.vx = s ? Math.sin(s.dir) * s.speed : 0;
    mi.vz = s ? Math.cos(s.dir) * s.speed : 0;
    const was = d.state === 'move';
    const spB = d.speed;
    d.step(dt, mi);
    if (was && d.state !== 'move' && spB > 0.02) {
      hold = true;
      holdSpeed = spB;
    }
    if (s) hold = false;
    // the controller's kneel (KNEEL_STILL after the stop, crouched: the stop hold lets go for it)
    stillT = o.crouch && !s && d.state === 'idle' ? stillT + dt : 0;
    const kneel = stillT > 0.05;
    if (kneel) hold = false;
    x += d.outX * dt;
    z += d.outZ * dt;
    rig.root.position.set(x, 0, z);
    rig.root.rotation.y = d.yaw;
    pose.speed = d.speed;
    pose.phase = d.phase;
    pose.motion = d.state;
    pose.motionT = d.stateT;
    pose.velX = d.outX;
    pose.velZ = d.outZ;
    pose.yawRate = d.yawRate;
    pose.goalYaw = d.goalYaw;
    pose.faceGoal = d.faceGoal;
    pose.stride = 'facing';
    pose.quickStop = CT.stopBlend;
    pose.holdSpeed = hold ? holdSpeed : 0;
    pose.kneel = kneel;
    pose.accelFwd = d.ax * Math.sin(d.yaw) + d.az * Math.cos(d.yaw);
    pose.accelSide = d.ax * Math.cos(d.yaw) - d.az * Math.sin(d.yaw);
    rig.animate(dt, pose);
    if (t < o.from) continue;
    const L = rig.planner.L;
    const R = rig.planner.R;
    const c = Math.cos(d.yaw);
    const sn = Math.sin(d.yaw);
    for (const [f, h, k, a] of [[L, rig.hipL, rig.kneeL, rig.ankleL], [R, rig.hipR, rig.kneeR, rig.ankleR]] as const) {
      const fwd = (f.x - x) * sn + (f.z - z) * c;
      if (f.contact) {
        const fl = flex(h, k, a);
        if (Math.abs(fwd) < 0.05) r.kneeMid = Math.max(r.kneeMid, fl);
        if (!s) r.kneeIdle = Math.max(r.kneeIdle, fl);
        if (s) r.latMax = Math.max(r.latMax, Math.abs((f.x - x) * c - (f.z - z) * sn));
      }
      if (s) r.kneeYMin = Math.min(r.kneeYMin, W(k).y);
    }
    const hy = W(rig.headNode).y;
    if (s) {
      r.headMin = Math.min(r.headMin, hy);
      r.headMax = Math.max(r.headMax, hy);
    } else r.split = Math.max(r.split, Math.abs((L.x - R.x) * sn + (L.z - R.z) * c));
    if (kneel && r.kneelAt < 0) r.kneelAt = t;
    if (s && r.firstLand < 0 && (L.landed || R.landed)) r.firstLand = t;
    if (!s) r.feetApart = Math.hypot(L.x - R.x, L.z - R.z);
  }
  scene.dispose();
  return r;
}

describe('G1 rig: the gait against the footage (NullEngine)', () => {
  it('(rows 5 / 20 / 21) standing near straight, an upright walk with a smooth bob', async () => {
    const idle = await rigRun({ seconds: 2.5, from: 2, stick: () => null });
    expect(idle.kneeIdle, 'idle knee').toBeLessThanOrEqual(13);
    // (anim-rework S2) the rest stance: feet about hip width (BRIEF 3, the real-world standard; the CT 0.3-0.4 m read
    // 15 cm a foot off the line, METRICS.md), the left a little ahead: 0.16-0.24 m between the ankles
    expect(idle.feetApart).toBeGreaterThanOrEqual(0.16);
    expect(idle.feetApart).toBeLessThanOrEqual(0.24);
    const walk = await rigRun({ seconds: 4, from: 2, stick: () => ({ dir: 0, speed: 1.4 }) });
    // the stance knee at mid-stance (was ~60 deg; G1: CT near straight, <= 22). (CT prototype G8 round 2, Michael 10:55:
    // CT's walk keeps the knees softly bent all the way through, lower and heavier; G8-WALK.md measures 105949 at the
    // matched camera) the keyed walk holds the pelvis ~7 cm low: the stance knee bent, never locked, never a squat
    expect(walk.kneeMid, 'walk mid-stance knee').toBeGreaterThanOrEqual(25);
    expect(walk.kneeMid, 'walk mid-stance knee').toBeLessThanOrEqual(55);
    // the head's travel over the cycle (CT ~2-3 cm by eye)
    expect(walk.headMax - walk.headMin, 'walk head bob').toBeLessThanOrEqual(0.035);
  });
  it('(rows 1 / 2 / 6) a 90 deg walk turn: feet under the hips, no splay, no pelvis spike', async () => {
    const r = await rigRun({ seconds: 3, from: 1.5, stick: (t) => ({ dir: t < 1.5 ? 0 : Math.PI / 2, speed: 1.4 }) });
    expect(r.latMax).toBeLessThanOrEqual(TURN_FOLLOW.maxLateral + 0.03);
    expect(r.headMax - r.headMin, 'turn head bob').toBeLessThanOrEqual(0.04);
  });
  it('(rows 16 / 27) moving crouched the rear knee stays off the floor; the crouch run higher', async () => {
    const walk = await rigRun({ seconds: 4, crouch: true, from: 2, stick: () => ({ dir: 0, speed: 1.7 }) });
    expect(walk.kneeYMin).toBeGreaterThanOrEqual(0.11);
    const run = await rigRun({ seconds: 4, crouch: true, from: 2, stick: () => ({ dir: 0, speed: 2.6 }) });
    expect(run.kneeYMin).toBeGreaterThanOrEqual(0.15);
  });
  it('(row 9) a jog stop freezes in a small split (<= ~0.35 m), (row 3) a crouched stop kneels within ~0.3 s', async () => {
    const stop = await rigRun({ seconds: 4, from: 2.5, stick: (t) => (t < 2 ? { dir: 0, speed: 3 } : null) });
    expect(stop.split).toBeLessThanOrEqual(0.36);
    // (G1 fix, row 13) a run start lands its first step by ~0.3 s (CT a full stride by 0.25 s; was 0.40)
    const start = await rigRun({ seconds: 2, from: 1, stick: (t) => (t < 1 ? null : { dir: 0, speed: 3 }) });
    // (anim-rework S2, M6: longer steps, a lower cadence) the first landing within ~0.35 s (was 0.3)
    expect(start.firstLand - 1).toBeLessThanOrEqual(0.35);
    const c = await rigRun({ seconds: 3, crouch: true, from: 0, stick: (t) => (t < 2 ? { dir: 0, speed: 1.7 } : null) });
    expect(c.kneelAt - 2).toBeLessThanOrEqual(0.3);
  });
});
