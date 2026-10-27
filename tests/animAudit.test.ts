import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as L from '../src/anim/audit/limits';
import * as M from '../src/anim/audit/metrics';
import { DRAW_TIME_PRIMARY, DRAW_TIME_SIDEARM } from '../src/weapons/drawState';

const DT = 1 / 60;
/** Quaternion stream rotating about Y by `degPerFrame` each frame. */
function spinY(n: number, degPerFrame: number): number[] {
  const q: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i * degPerFrame) / 2) * (Math.PI / 180);
    q.push(0, Math.sin(a), 0, Math.cos(a));
  }
  return q;
}
/** Heel strikes every `every` frames. */
function strikes(n: number, every: number): number[] {
  return Array.from({ length: n }, (_, i) => (i % every === 0 ? 1 : 0));
}

describe('anim audit limits', () => {
  it('pelvis jump limits follow speed x dt + 2 cm and the gear caps', () => {
    const s60 = L.pelvisJumpByGear('stand', 60).map((v) => +(v * 100).toFixed(2));
    // (CT prototype M1) the five CT speeds
    // (G1, audit row 14) the run 4.2 -> 4.5 m/s
    // (anim-rework S2, M6) the run 4.5 -> 4.0 m/s
    expect(s60).toEqual([3.25, 4.33, 5.5, 7, 8.67]);
    const c120 = L.pelvisJumpByGear('crouch', 120).map((v) => +(v * 100).toFixed(2));
    expect(c120).toEqual([2.71, 3.08, 3.42, 3.79, 4.17]);
  });
  it('D2 gait bands (A7)', () => {
    expect([1, 2, 3, 4, 5].map((g) => L.gaitBand('stand', g))).toEqual(['walk', 'walk', 'walk', 'run', 'run']);
    expect(L.gaitBand('crouch', 5)).toBe('crouch');
    expect(Object.keys(L.PELVIS_P2P)).toEqual(['crouch', 'walk', 'run']);
  });
  it('(J19 S5, R30) bible 5.12.2 item 6: the flick turn, the draw per class and the takedown', () => {
    expect(L.MIN_DURATION.turn180).toBe(0.4);
    expect(L.raiseMin('pistol')).toBe(0.75);
    expect(L.raiseMin('pistol')).toBe(DRAW_TIME_SIDEARM);
    for (const cls of ['rifle', 'smg']) {
      expect(L.raiseMin(cls)).toBe(1.1);
      expect(L.raiseMin(cls)).toBe(DRAW_TIME_PRIMARY);
    }
    expect(L.MIN_DURATION.takedown).toBe(1.0);
    expect('raise' in L.MIN_DURATION).toBe(false);
  });
  it('(J19 S5, R19 / R30) anim-audit: no gear 6, sprint or dash rows; the takedown row; the draw row per class', () => {
    const src = readFileSync('scripts/anim-audit.mjs', 'utf8');
    expect(src).not.toMatch(/\bsprint\b/i);
    expect(src).not.toMatch(/'dash'/);
    expect(src).not.toMatch(/\['stand', 6\]/);
    expect(src).not.toMatch(/MIN_DURATION\.raise\b/);
    expect(src).toMatch(/kind: 'takedown'/);
    expect(src).toMatch(/L\.MIN_DURATION\.takedown/);
    expect(src).toMatch(/L\.raiseMin\(/);
    expect(src).toMatch(/'drawPh'/);
  });
});

describe('anim audit metrics', () => {
  it('jointRate / pelvisJump with measured frame times scale each step to the nominal frame (remote poses)', () => {
    // 20 deg in a frame that took 2 / 60 s reads 10 deg at 60 Hz (pass); 20 deg in 1 / 120 s reads 40 (fail, one pop)
    const q = spinY(3, 20);
    expect(M.jointRate(q, 60, undefined, undefined, [0, 2 / 60, 2 / 60]).worst).toBeCloseTo(10);
    const r = M.jointRate(q, 60, undefined, undefined, [0, 1 / 60, 1 / 120]);
    expect(r.worst).toBeCloseTo(40);
    expect(r.over).toBe(1);
    expect(r.pass).toBe(false);
    // pelvis: 6 cm in a 2-frame gap vs a 5 cm per-frame limit passes; in a nominal frame it fails
    const p = [0, 0, 0, 0.06, 0, 0];
    expect(M.pelvisJump(p, 0.05, undefined, [0, 2 / 60], 60).pass).toBe(true);
    expect(M.pelvisJump(p, 0.05, undefined, [0, 1 / 60], 60).over).toBe(1);
  });
  it('jointRate scales with the frame rate (25 deg at 60 Hz, 12.5 deg at 120 Hz)', () => {
    expect(M.jointRate(spinY(30, 24), 60).pass).toBe(true);
    expect(M.jointRate(spinY(30, 26), 60).pass).toBe(false);
    const r = M.jointRate(spinY(30, 12.4), 120);
    expect(r.limit).toBeCloseTo(12.5);
    expect(r.pass).toBe(true);
    expect(M.jointRate(spinY(30, 12.6), 120).pass).toBe(false);
    // an exempt frame (hit reaction) is skipped
    const q = spinY(10, 1);
    q.splice(5 * 4, 4, 0, Math.sin(0.5), 0, Math.cos(0.5));
    expect(M.jointRate(q, 60).pass).toBe(false);
    expect(M.jointRate(q, 60, [0, 0, 0, 0, 0, 1, 1]).pass).toBe(true);
  });

  it('pelvisJump and teleports', () => {
    const p: number[] = [];
    for (let i = 0; i < 60; i++) p.push(i * (2 / 60), 1, 0);
    expect(M.pelvisJump(p, L.pelvisJumpLimit(2, 60)).pass).toBe(true);
    p[30 * 3] = p[30 * 3]! + 1;
    expect(M.pelvisJump(p, L.pelvisJumpLimit(2, 60)).pass).toBe(false);
    const t = M.teleports(p);
    expect(t.pass).toBe(false);
    expect(t.worst).toBe(2);
  });

  it('pelvisPerStride: a clean sine passes, a double bounce fails', () => {
    const n = 240;
    const step = 30;
    const clean = Array.from({ length: n }, (_, i) => 0.015 * Math.sin((2 * Math.PI * i) / step));
    const r = M.pelvisPerStride(clean, strikes(n, step), L.PELVIS_P2P.walk);
    expect(r.pass).toBe(true);
    expect(r.badSteps).toBe(0);
    expect(r.worst).toBeCloseTo(0.03, 3);
    const dbl = Array.from({ length: n }, (_, i) => 0.015 * Math.sin((4 * Math.PI * i) / step));
    const d = M.pelvisPerStride(dbl, strikes(n, step), L.PELVIS_P2P.walk);
    expect(d.pass).toBe(false);
    expect(d.badSteps).toBeGreaterThan(0);
    // over the limit
    const big = clean.map((v) => v * 3);
    expect(M.pelvisPerStride(big, strikes(n, step), L.PELVIS_P2P.walk).pass).toBe(false);
  });

  it('footContact: a 2.1 cm slide fails, a locked foot passes', () => {
    const n = 40;
    const ankle: number[] = [];
    const ground: number[] = [];
    const contact: number[] = [];
    for (let i = 0; i < n; i++) {
      ankle.push(1, 0.08, 2);
      ground.push(0);
      contact.push(i < 30 ? 1 : 0);
    }
    expect(M.footContact(ankle, ground, contact, 0.08).pass).toBe(true);
    for (let i = 0; i < 30; i++) ankle[i * 3] = 1 + (0.021 * i) / 29;
    const r = M.footContact(ankle, ground, contact, 0.08);
    expect(r.pass).toBe(false);
    expect(r.worst).toBeCloseTo(0.021, 4);
    // float 3 cm fails, sink 0.5 cm passes
    ankle[10 * 3 + 1] = 0.11;
    ankle[11 * 3 + 1] = 0.075;
    const h = M.footContact(ankle, ground, contact, 0.08);
    expect(h.float.pass).toBe(false);
    expect(h.sink.pass).toBe(true);
  });

  it('handContact: absolute distance; a constant 3 cm offset fails, only while the grip IK is on', () => {
    const w: number[] = [];
    const g: number[] = [];
    const on: number[] = [];
    for (let i = 0; i < 20; i++) {
      w.push(0, 1, 0.015);
      g.push(0, 1, 0);
      on.push(1);
    }
    expect(M.handContact(w, g, on).pass).toBe(true);
    const off = w.map((v, i) => (i % 3 === 2 ? 0.03 : v));
    const r = M.handContact(off, g, on);
    expect(r.pass).toBe(false);
    expect(r.worst).toBeCloseTo(0.03, 6);
    // grip IK weight <= 0.5 (free hands): not measured
    expect(M.handContact(off, g, on.map(() => 0.4)).frames).toBe(0);
  });

  it('romAngles: a knee at 156 deg fails, 140 passes; hyperextension is caught', () => {
    const knee = (deg: number): number[][] => {
      // hip above the knee, the shank swung back from straight down by `deg`
      const f = (deg * Math.PI) / 180;
      return [
        [0, 1, 0],
        [0, 0.5, 0],
        [0, 0.5 - 0.5 * Math.cos(f), -0.5 * Math.sin(f)],
      ];
    };
    const at = (deg: number): ReturnType<typeof M.romAngles> => {
      const [a, b, c] = knee(deg);
      return M.romAngles(a!, b!, c!);
    };
    expect(at(140).pass).toBe(true);
    expect(at(156).pass).toBe(false);
    expect(at(156).worst).toBeCloseTo(156, 1);
    // knee bulging backward (against the body forward +Z) by 8 deg: hyperextension
    const r = M.romAngles([0, 1, 0], [0, 0.5, -0.035], [0, 0, 0], [0, 0, 1]);
    expect(r.hyper.pass).toBe(false);
    expect(M.romLimit([10, -30, 75], L.ROM.wristFlex).pass).toBe(false);
    expect(M.romLimit([10, -30, 60], L.ROM.wristFlex).pass).toBe(true);
  });

  it('balanceMargin: COM outside the hull of the planted soles', () => {
    // feet facing +Z (yaw 0), 30 cm apart; soles 0.2 x 0.1 m reaching 0.05 behind the ankle -> hull x -0.05..0.35, z -0.05..0.15
    const foot = { len: 0.2, width: 0.1 };
    const back = L.FOOT_BACK;
    expect(back).toBeCloseTo(0.22, 6);
    const feet = [0, 0, 0, 0.3, 0, 0];
    const both = [1, 1];
    const toe = (1 - back) * 0.2;
    expect(M.balanceMargin([0.15, toe - 0.01], feet, both, foot).worst).toBe(0);
    expect(M.balanceMargin([0.15, toe + 0.09], feet, both, foot).pass).toBe(true);
    const r = M.balanceMargin([0.15, toe + 0.11], feet, both, foot);
    expect(r.pass).toBe(false);
    expect(r.worst).toBeCloseTo(0.11, 5);
    // one planted foot turned 90 deg (yaw PI / 2: toe toward +X)
    const one = M.balanceMargin([toe + 0.05, 0], [0, 0, Math.PI / 2, 9, 9, 0], [1, 0], foot);
    expect(one.worst).toBeCloseTo(0.05, 5);
    expect(M.balanceMargin([0.15, toe + 0.11], feet, both, foot, [1]).frame).toBe(-1);
  });

  it('centerOfMass: a symmetric T-pose has its COM on the midline', () => {
    const P = (x: number, y: number): [number, number, number] => [x, y, 0];
    const c = M.centerOfMass({
      hips: P(0, 1), neck: P(0, 1.5), head: P(0, 1.65),
      shoulderL: P(-0.2, 1.45), shoulderR: P(0.2, 1.45), elbowL: P(-0.5, 1.45), elbowR: P(0.5, 1.45),
      wristL: P(-0.75, 1.45), wristR: P(0.75, 1.45), hipL: P(-0.1, 0.95), hipR: P(0.1, 0.95),
      kneeL: P(-0.1, 0.5), kneeR: P(0.1, 0.5), ankleL: P(-0.1, 0.08), ankleR: P(0.1, 0.08),
    });
    expect(c[0]).toBeCloseTo(0, 6);
    expect(c[1]).toBeGreaterThan(0.85);
    expect(c[1]).toBeLessThan(1.15);
  });

  it('segmentDistance: crossing shanks penetrate', () => {
    const r = M.segmentDistance([0, 0.5, 0], [0, 0, 0], [0.05, 0.5, 0], [0.05, 0, 0], 0.1, L.CLIP_SELF);
    expect(r.worst).toBeCloseTo(0.05, 5);
    expect(r.pass).toBe(false);
    expect(M.segmentDistance([0, 0.5, 0], [0, 0, 0], [0.2, 0.5, 0], [0.2, 0, 0], 0.1, L.CLIP_SELF).pass).toBe(true);
    // a forearm crossing 4 cm into the torso capsule (hips -> neck) fails; one in front of the chest passes
    const R = L.LIMB_RADIUS;
    const torso = [[0, 1, 0], [0, 1.5, 0]] as const;
    const cross = M.segmentDistance([-0.2, 1.3, R.torso + R.forearm - 0.04], [0.2, 1.3, R.torso + R.forearm - 0.04], torso[0], torso[1], R.forearm + R.torso, L.CLIP_SELF);
    expect(cross.worst).toBeCloseTo(0.04, 6);
    expect(cross.pass).toBe(false);
    expect(M.segmentDistance([-0.2, 1.3, 0.25], [0.2, 1.3, 0.25], torso[0], torso[1], R.forearm + R.torso, L.CLIP_SELF).pass).toBe(true);
  });

  it('oscP2P detrends; lateralSway and headVsPelvis', () => {
    const ramp = Array.from({ length: 120 }, (_, i) => i * 0.01 + 0.002 * Math.sin(i / 5));
    const r = M.oscP2P(ramp, L.CAMERA_P2P);
    expect(r.pass).toBe(true);
    expect(r.worst).toBeLessThan(0.0045);
    const pel: number[] = [];
    const cap: number[] = [];
    const yaw: number[] = [];
    for (let i = 0; i < 120; i++) {
      pel.push(0.02 * Math.sin(i / 10), 1, i * 0.02);
      cap.push(0, 0, i * 0.02);
      yaw.push(0);
    }
    expect(M.lateralSway(pel, cap, yaw, L.WALK_SWAY).worst).toBeGreaterThan(0.035);
    expect(M.lateralSway(pel, cap, yaw, L.WALK_SWAY).pass).toBe(false);
    const py = Array.from({ length: 120 }, (_, i) => 0.01 * Math.sin(i / 5));
    const hy = py.map((v) => v * 0.8);
    const flat = py.map(() => 0);
    expect(M.headVsPelvis(hy, py, flat, flat).pass).toBe(true);
    expect(M.headVsPelvis(py.map((v) => v * 1.5), py, flat, flat).pass).toBe(false);
    expect(M.headVsPelvis(hy, py, py.map((v) => v * 300), flat).pass).toBe(false);
  });

  it('settleTime: 0.15 s passes, a settle at 0.25 s fails, a second excursion fails', () => {
    const mk = (t: number): number[] => Array.from({ length: 60 }, (_, i) => (i * DT < t ? 0.01 : 0));
    expect(M.settleTime(mk(0.15), 0, DT).pass).toBe(true);
    const r = M.settleTime(mk(0.25), 0, DT);
    expect(r.pass).toBe(false);
    expect(r.worst).toBeCloseTo(0.25, 2);
    const wob = mk(0.1);
    wob[20] = 0.004;
    const w = M.settleTime(wob, 0, DT);
    expect(w.second).toBe(true);
    expect(w.pass).toBe(false);
    // slow breathing drift (1 cm over 4 s) after a 0.1 s settle: filtered out, a 4 mm rebound still caught
    const br = Array.from({ length: 120 }, (_, i) => (i * DT < 0.1 ? 0.01 : 0) + 0.005 * Math.sin((2 * Math.PI * i * DT) / 4));
    expect(M.settleTime(br, 0, DT, L.SETTLE_TIME, L.SETTLE_EPS, 0, 60).second).toBe(false);
    br[40] = br[40]! + 0.004;
    expect(M.settleTime(br, 0, DT, L.SETTLE_TIME, L.SETTLE_EPS, 0, 60).second).toBe(true);
  });

  it('landingDip: one damped dip passes; a rebound or a second dip fails', () => {
    const n = 90;
    const one = Array.from({ length: n }, (_, i) => -0.03 * Math.exp(-i / 6) * (i / 6));
    expect(M.landingDip(one, 0).pass).toBe(true);
    // A35: no dip passes for the camera (min 0), fails for the pelvis (exactly 1)
    const none = Array.from({ length: n }, () => 0);
    expect(M.landingDip(none, 0, 0).pass).toBe(true);
    expect(M.landingDip(none, 0, 1).pass).toBe(false);
    const bounce = Array.from({ length: n }, (_, i) => -0.03 * Math.exp(-i / 15) * Math.sin(i / 4));
    const b = M.landingDip(bounce, 0);
    expect(b.pass).toBe(false);
    expect(b.dips).toBeGreaterThan(1);
  });

  it('rootOvershoot: against the commanded cap through the acceleration; a backward step after a stop fails', () => {
    const sp = Array.from({ length: 60 }, () => 2.0);
    expect(M.rootOvershoot(sp, 2).pass).toBe(true);
    sp[20] = 2.1;
    expect(M.rootOvershoot(sp, 2).pass).toBe(false);
    // plateau 1% under the cap passes; a 3% overshoot during the acceleration fails
    const cap = 2.8;
    const acc = Array.from({ length: 90 }, (_, i) => (i < 30 ? (cap * 0.99 * i) / 30 : cap * 0.99));
    expect(M.rootOvershoot(acc, cap, undefined, 0, 90).pass).toBe(true);
    const ovs = acc.map((v, i) => (i >= 25 && i < 35 ? cap * 1.03 : v));
    expect(M.rootOvershoot(ovs, cap, undefined, 0, 90).pass).toBe(false);
    // per-frame target (frames with no target skipped)
    expect(M.rootOvershoot(ovs, ovs.map((_, i) => (i >= 25 && i < 35 ? 0 : cap)), undefined, 0, 90).pass).toBe(true);
    const pos: number[] = [];
    for (let i = 0; i < 20; i++) pos.push(0, 0, i < 10 ? i * 0.01 : 0.09 - (i - 10) * 0.001);
    const r = M.rootOvershoot(Array.from({ length: 20 }, () => 1), 1, pos, 0, 5, 0, 1);
    expect(r.backstep).toBeGreaterThan(0.005);
    expect(r.pass).toBe(false);
  });

  it('stairsPelvisDrop, durationOf, blendTimes', () => {
    const y = Array.from({ length: 30 }, (_, i) => i * 0.01);
    expect(M.stairsPelvisDrop(y, 0.0333).pass).toBe(true);
    y[15] = y[15]! + 0.1;
    expect(M.stairsPelvisDrop(y, 0.0333).pass).toBe(false);
    const f = Array.from({ length: 60 }, (_, i) => (i >= 5 && i < 17 ? 1 : 0));
    expect(M.durationOf(f, DT, L.MIN_DURATION.raisePistol).worst).toBeCloseTo(0.2, 5);
    expect(M.durationOf(f, DT, L.MIN_DURATION.swap).pass).toBe(false);
    const st = [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const w = [1, 1, 0.3, 0.6, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const b = M.blendTimes(st, w, DT);
    expect(b.blends).toBe(1);
    expect(b.worst).toBeCloseTo(4 * DT, 5);
    expect(b.pass).toBe(false);
    const w2 = w.map((v, i) => (i >= 2 && i < 10 ? 0.5 : v));
    expect(M.blendTimes(st, w2, DT).pass).toBe(true);
  });

  it('reachTime: from the last frame before the input until within tol of the target', () => {
    // crouchBlend easing 0 -> 1 over 15 frames after an input at frame 10 (last frame before: 9)
    const cb = Array.from({ length: 60 }, (_, i) => (i < 10 ? 0 : Math.min(1, (i - 9) / 15)));
    const r = M.reachTime(cb, 9, DT, L.MIN_DURATION.crouch, 1, L.STANCE_DONE_TOL);
    expect(r.worst).toBeCloseTo(0.25, 6);
    expect(r.pass).toBe(true);
    // the open band (0.001-0.999) would miss the first and last frames; never reached: fail
    expect(M.reachTime(cb.map((v) => v * 0.9), 9, DT, 0.1, 1, L.STANCE_DONE_TOL).reached).toBe(false);
    expect(L.RAISE_DONE).toBe(0.95);
  });
});

describe('anim audit round 2 fixes', () => {
  it('F1 footContact: exactly-2 cm float and 1 cm sink recorded in float32 pass; 2.02 cm fails', () => {
    const f = Math.fround;
    const ankle = [0, f(0.1), 0, 0, f(0.1), 0];
    const r = M.footContact(ankle, [0, 0], [1, 1], f(0.08));
    expect(r.float.worst).toBeGreaterThan(0.02 - 1e-6);
    expect(r.float.pass).toBe(true);
    const s = M.footContact([0, f(0.07), 0], [0], [1], f(0.08));
    expect(s.sink.pass).toBe(true);
    expect(M.footContact([0, 0.1002, 0], [0], [1], 0.08).float.pass).toBe(false);
  });

  it('F2 soleLowY: a foot on its toes (pitched 68.8 deg) reads its toe on the ground, not a raised ankle', () => {
    const depth = 0.08;
    const len = 0.27;
    const th = (68.8 * Math.PI) / 180;
    const q = [Math.sin(th / 2), 0, 0, Math.cos(th / 2)];
    const ay = depth * Math.cos(th) + (1 - L.FOOT_BACK) * len * Math.sin(th);
    const ankle = [0, ay, 0];
    const sole = M.soleLowY(ankle, q, [0, 0, 1], [0, 1, 0], len, L.FOOT_BACK, depth);
    expect(sole[0]).toBeCloseTo(0, 6);
    expect(M.footContact(ankle, [0], [1], depth).float.pass).toBe(false);
    const r = M.footContact(ankle, [0], [1], depth, undefined, sole);
    expect(r.float.pass).toBe(true);
    expect(r.sink.pass).toBe(true);
    // flat foot: the sole sits `depth` below the ankle; a toe pushed 2 cm into the ground is a sink
    expect(M.soleLowY([0, depth, 0], [0, 0, 0, 1], [0, 0, 1], [0, 1, 0], len, L.FOOT_BACK, depth)[0]).toBeCloseTo(0, 9);
    const sunk = M.footContact([0, ay - 0.02, 0], [0], [1], depth, undefined, M.soleLowY([0, ay - 0.02, 0], q, [0, 0, 1], [0, 1, 0], len, L.FOOT_BACK, depth));
    expect(sunk.sink.worst).toBeCloseTo(0.02, 6);
    expect(sunk.sink.pass).toBe(false);
  });

  it('F2b soleLowY ground: a horizontal foot on a 35 deg plane sinks its uphill point, read per point', () => {
    const depth = 0.08;
    const len = 0.27;
    const slope = Math.tan((35 * Math.PI) / 180);
    const plane = (z: number) => z * slope;
    // ankle above the plane at its own x / z, foot level (identity quat): the ankle-ground reading passes
    const ankle = [0, depth, 0];
    const q = [0, 0, 0, 1];
    expect(M.footContact(ankle, [plane(0)], [1], depth).sink.pass).toBe(true);
    const [heel, toe] = M.solePoints([0, 0, 1], [0, 1, 0], len, L.FOOT_BACK, depth);
    expect(heel[2]).toBeCloseTo(-L.FOOT_BACK * len, 9);
    expect(toe[2]).toBeCloseTo((1 - L.FOOT_BACK) * len, 9);
    const ground = { heel: [plane(heel[2])], toe: [plane(toe[2])] };
    const sole = M.soleLowY(ankle, q, [0, 0, 1], [0, 1, 0], len, L.FOOT_BACK, depth, ground);
    // the toe is (1 - back) x len x tan 35 below the plane under it
    expect(sole[0]).toBeCloseTo(-(1 - L.FOOT_BACK) * len * slope, 9);
    const r = M.footContact(ankle, [0], [1], depth, undefined, sole);
    expect(r.sink.pass).toBe(false);
    expect(r.sink.worst).toBeGreaterThan(0.1);
    // the same foot on flat ground passes; a point with no ground hit is skipped, none at all is not measured
    const flat = M.soleLowY(ankle, q, [0, 0, 1], [0, 1, 0], len, L.FOOT_BACK, depth, { heel: [0], toe: [0] });
    expect(flat[0]).toBeCloseTo(0, 9);
    expect(M.soleLowY(ankle, q, [0, 0, 1], [0, 1, 0], len, L.FOOT_BACK, depth, { heel: [plane(heel[2])], toe: [NaN] })[0]).toBeCloseTo(-plane(heel[2]), 9);
    expect(Number.isNaN(M.soleLowY(ankle, q, [0, 0, 1], [0, 1, 0], len, L.FOOT_BACK, depth, { heel: [NaN], toe: [NaN] })[0])).toBe(true);
  });

  it('F3 localQuats: a child carried rigidly by a fast-turning parent has no local joint rate', () => {
    const parent = spinY(20, 40);
    const child: number[] = [];
    const off = [Math.sin(0.3), 0, 0, Math.cos(0.3)];
    for (let i = 0; i < 20; i++) {
      const [px, py, pz, pw] = parent.slice(i * 4, i * 4 + 4) as [number, number, number, number];
      const [ox, oy, oz, ow] = off as [number, number, number, number];
      child.push(pw * ox + px * ow + py * oz - pz * oy, pw * oy - px * oz + py * ow + pz * ox, pw * oz + px * oy - py * ox + pz * ow, pw * ow - px * ox - py * oy - pz * oz);
    }
    expect(M.jointRate(child, 60).pass).toBe(false);
    const loc = M.jointRate(M.localQuats(parent, child), 60);
    expect(loc.worst).toBeLessThan(1e-3);
    expect(M.localQuats(spinY(20, 0), spinY(20, 30)).length).toBe(80);
    expect(M.jointRate(M.localQuats(spinY(20, 0), spinY(20, 30)), 60).pass).toBe(false);
  });

  it('F4 reachTime: a sim-rate signal sampled at 120 Hz rounds up to its sim step end', () => {
    const dt = 1 / 120;
    // reached on the 29th 120 Hz frame (mid sim step 15): 0.2417 s raw, 0.250 s at the sim step end
    const cb = Array.from({ length: 80 }, (_, i) => (i < 10 ? 0 : i - 9 >= 29 ? 1 : 0.5));
    expect(M.reachTime(cb, 9, dt, L.MIN_DURATION.crouch, 1, L.STANCE_DONE_TOL).worst).toBeCloseTo(29 / 120, 6);
    const r = M.reachTime(cb, 9, dt, L.MIN_DURATION.crouch, 1, L.STANCE_DONE_TOL, 1 / 60);
    expect(r.worst).toBeCloseTo(0.25, 9);
    expect(r.pass).toBe(true);
    // at 60 Hz the step equals the frame: unchanged
    expect(M.reachTime(cb, 9, 1 / 60, 0, 1, L.STANCE_DONE_TOL, 1 / 60).worst).toBeCloseTo(29 / 60, 9);
  });

  it('F5 settleTime: a rebound > 2 mm after a decline counts from the stop, before the band is entered', () => {
    // 15 mm -> 5.5 mm -> 9.8 mm -> 0 (as flat-stand4-60 frames 200-220), never inside the 2 mm band before the rebound
    const x: number[] = [];
    for (let i = 0; i <= 10; i++) x.push(0.015 - (0.0095 * i) / 10);
    for (let i = 1; i <= 10; i++) x.push(0.0055 + (0.0043 * i) / 10);
    for (let i = 1; i <= 30; i++) x.push(Math.max(0, 0.0098 * (1 - i / 15)));
    for (let i = 0; i < 40; i++) x.push(0);
    const r = M.settleTime(x, 0, DT, L.SETTLE_TIME, L.SETTLE_EPS, 0, 60);
    expect(r.second).toBe(true);
    expect(r.pass).toBe(false);
    // a small decline then a 5.6 mm swing back (flat-stand4-60 after the stop): a rebound
    const sw = [2.9, 2.7, 2.6, 2.5, 2.4, 4.4, 6.7, 8.0, 7.0, 5.3, 3.5, 2.2, 1.4, 1.1, ...Array<number>(40).fill(0)].map((v) => v / 1000);
    expect(M.settleTime(sw, 0, DT, L.SETTLE_TIME, L.SETTLE_EPS, 0, 60).second).toBe(true);
    // an initial rise before the decline, and a 1.5 mm wobble, are not rebounds
    const ok = [0.004, 0.008, 0.012, 0.009, 0.006, 0.0075, 0.005, 0.003, 0.001, ...Array<number>(60).fill(0)];
    expect(M.settleTime(ok, 0, DT, L.SETTLE_TIME, L.SETTLE_EPS, 0, 60).second).toBe(false);
  });
});

describe('anim audit wrist angles', () => {
  const rot = (ax: number[], deg: number): number[] => {
    const h = (deg * Math.PI) / 360;
    return [ax[0]! * Math.sin(h), ax[1]! * Math.sin(h), ax[2]! * Math.sin(h), Math.cos(h)];
  };
  const mul = (a: number[], b: number[]): number[] => [
    a[3]! * b[0]! + a[0]! * b[3]! + a[1]! * b[2]! - a[2]! * b[1]!,
    a[3]! * b[1]! - a[0]! * b[2]! + a[1]! * b[3]! + a[2]! * b[0]!,
    a[3]! * b[2]! + a[0]! * b[1]! - a[1]! * b[0]! + a[2]! * b[3]!,
    a[3]! * b[3]! - a[0]! * b[0]! - a[1]! * b[1]! - a[2]! * b[2]!,
  ];
  it('a constant grip convention offset reads 0; a 30 deg side bend from neutral fails', () => {
    const parent = rot([0.3, 0.8, 0.52], 50);
    // the rig's grip offset (as characterRig solveArm: pitch 0.25 rad and a roll) as the neutral
    const neutral = mul(rot([1, 0, 0], 14.3), rot([0, 0, 1], -23));
    const child = mul(parent, neutral);
    const [f0, s0] = M.relFlexSide(parent, 0, child, 0, M.relQuat(parent, 0, child, 0));
    expect(Math.abs(f0)).toBeLessThan(1e-6);
    expect(Math.abs(s0)).toBeLessThan(1e-6);
    // without the neutral the offset would read as a bend
    expect(Math.abs(M.relFlexSide(parent, 0, child, 0)[1])).toBeGreaterThan(20);
    const bent = mul(child, rot([0, 0, 1], 30));
    const [f1, s1] = M.relFlexSide(parent, 0, bent, 0, neutral);
    expect(f1).toBeCloseTo(0, 4);
    expect(s1).toBeCloseTo(30, 4);
    expect(M.romLimit([s1], L.ROM.wristSide).pass).toBe(false);
    // combined: flex 20 + side 10 split by the swing axis
    const both = mul(child, rot([2 / Math.sqrt(5), 0, 1 / Math.sqrt(5)], 22.36));
    const [f2, s2] = M.relFlexSide(parent, 0, both, 0, neutral);
    expect(f2).toBeCloseTo(20, 1);
    expect(s2).toBeCloseTo(10, 1);
  });

  it('relFlexSide ignores the twist about the bone and reads the swing', () => {
    const id = [0, 0, 0, 1];
    const [f0, s0] = M.relFlexSide(id, 0, rot([0, 1, 0], 170), 0);
    expect(Math.abs(f0)).toBeLessThan(1e-6);
    expect(Math.abs(s0)).toBeLessThan(1e-6);
    const [f1] = M.relFlexSide(id, 0, rot([1, 0, 0], 40), 0);
    expect(f1).toBeCloseTo(40, 4);
    const [, s2] = M.relFlexSide(id, 0, rot([0, 0, 1], -20), 0);
    expect(s2).toBeCloseTo(-20, 4);
  });
});

describe('anim audit step 21 (holstered arms gate, M14)', () => {
  it('flexBand: an elbow inside the band passes, a straight or folded arm fails by its distance out', () => {
    // shoulder at the origin, elbow 0.3 m down, wrist 0.27 m from the elbow at the given flexion (deg)
    const arm = (deg: number[]): [number[], number[], number[]] => {
      const a: number[] = [];
      const b: number[] = [];
      const c: number[] = [];
      for (const d of deg) {
        const r = (d * Math.PI) / 180;
        a.push(0, 0, 0);
        b.push(0, -0.3, 0);
        c.push(0, -0.3 - 0.27 * Math.cos(r), 0.27 * Math.sin(r));
      }
      return [a, b, c];
    };
    // M14: relaxed at the sides standing (8-30), softly bent crouched (15-50)
    const st = L.readyElbowBand('stand');
    expect(st).toEqual({ min: 8, max: 30 });
    expect(L.readyElbowBand('crouch')).toEqual({ min: 15, max: 50 });
    expect(Object.keys(L.READY_ELBOW)).toEqual(['stand', 'crouch']);
    const ok = M.flexBand(...arm([12, 18, 25]), st.min, st.max);
    expect(ok.pass).toBe(true);
    expect(ok.min).toBeCloseTo(12, 3);
    expect(ok.max).toBeCloseTo(25, 3);
    const cr = L.readyElbowBand('crouch');
    const straight = M.flexBand(...arm([30, 5.1]), cr.min, cr.max);
    expect(straight.pass).toBe(false);
    expect(straight.worst).toBeCloseTo(9.9, 3);
    // A42's old hands-in-front carriage now fails standing
    const folded = M.flexBand(...arm([75]), st.min, st.max);
    expect(folded.worst).toBeCloseTo(45, 3);
  });
});
