// (CT prototype G8) The keyed walk (scripts/anim-keys, src/anim/keyed.ts, G8-PLAN.md): the sampler, the clip against the
// footage numbers (G8-REPORT.md "Before"), the graph's weight and the rig playing it (NullEngine), owner and remote alike.
import { describe, expect, it } from 'vitest';
import { AnimGraph, defaultInput, IDLE_STANCE, KEYED_WALK_BAND } from '../src/anim/animGraph';
import { KA, KQ, mixKeyed, newKeyedPose, sampleKeyed } from '../src/anim/keyed';
import { KEYED_WALK } from '../src/anim/clips/keyed/walk';
import { KEYED_JOG } from '../src/anim/clips/keyed/jog';
import { KEYED_RUN } from '../src/anim/clips/keyed/run';
import { KEYED_IDLE } from '../src/anim/clips/keyed/idle';
import { proportions } from '../src/player/proportions';

const C = KEYED_WALK;

describe('keyed clip sampler', () => {
  it('hits the frames, wraps without a step, normalises, and amp 0 is the mean pose', () => {
    const o = newKeyedPose();
    for (let f = 0; f < C.frames; f++) {
      sampleKeyed(C, f / C.frames, 1, o);
      for (let c = 0; c < 3; c++) expect(o.pel[c]).toBeCloseTo(C.pel[f * 3 + c]!, 5);
      for (let c = 0; c < 12; c++) expect(o.arm[c]).toBeCloseTo(C.arm[f * 12 + c]!, 5);
      for (let s = 0; s < 16; s += 4) expect(Math.hypot(o.q[s]!, o.q[s + 1]!, o.q[s + 2]!, o.q[s + 3]!)).toBeCloseTo(1, 6);
    }
    const a = newKeyedPose();
    sampleKeyed(C, 0.99999, 1, a);
    sampleKeyed(C, 1.00001, 1, o);
    for (let c = 0; c < 12; c++) expect(Math.abs(a.arm[c]! - o.arm[c]!)).toBeLessThan(1e-3);
    for (let s = 0; s < 16; s += 4) expect(Math.abs(a.q[s]! * o.q[s]! + a.q[s + 1]! * o.q[s + 1]! + a.q[s + 2]! * o.q[s + 2]! + a.q[s + 3]! * o.q[s + 3]!)).toBeGreaterThan(0.99999);
    sampleKeyed(C, 0.3, 0, o);
    for (let c = 0; c < 12; c++) expect(o.arm[c]).toBeCloseTo(C.meanArm[c]!, 5);
    // negative and large phases wrap
    sampleKeyed(C, -0.75, 1, a);
    sampleKeyed(C, 2.25, 1, o);
    for (let c = 0; c < 12; c++) expect(a.arm[c]).toBeCloseTo(o.arm[c]!, 6);
  });
});

describe('the keyed walk against the footage (105509 @ 33-34, 105949 @ 12.0-12.5)', () => {
  const o = newKeyedPose();
  const at = (ph: number) => sampleKeyed(C, ph, 1, o);
  it('narrow track, hands close, counter-swinging arms, small bob and sway', () => {
    // track: the feet under the body (CT ~0.6-0.75 hip widths; ours was 0.98); (anim-rework S2, Michael 14:45 "wide
    // stance") the ankle centres about a foot width apart (>= 0.09 m: the lifted swing foot passes the planted one)
    expect(C.half * 2).toBeGreaterThanOrEqual(0.09);
    // (anim-run-half) the half is measured with the stride-locked pelvis yaw removed (the walk's +-2 deg pelvis yaw no
    // longer leaks the stride into it): the same keys measure 0.0519 (was 0.0466 in the world frame): was 0.05
    expect(C.half).toBeLessThanOrEqual(0.053);
    expect((C.half * 2) / (2 * proportions().hipHalf)).toBeLessThanOrEqual(0.75);
    expect(C.kneeOut).toBeLessThanOrEqual(0.05);
    let swingL = [9, -9];
    let swingR = [9, -9];
    let pelY = [9, -9];
    let pelX = [9, -9];
    for (let k = 0; k < 64; k++) {
      at(k / 64);
      // elbows within 4 cm out of the shoulder line (were 8, the jog 19), wrists from 5 cm inside it to 9.5 cm out:
      // (G8 round 2, 105949 / 105509) the arms carried forward with the hands in front of the thighs
      expect(-o.arm[KA.elbowL]!).toBeLessThanOrEqual(0.04);
      expect(o.arm[KA.elbowR]!).toBeLessThanOrEqual(0.04);
      expect(-o.arm[KA.wristL]!).toBeLessThanOrEqual(0.095);
      expect(o.arm[KA.wristR]!).toBeLessThanOrEqual(0.095);
      // and never in toward the body
      expect(-o.arm[KA.elbowL]!).toBeGreaterThanOrEqual(0);
      expect(o.arm[KA.wristR]!).toBeGreaterThanOrEqual(-0.05);
      // (anim-rework S2, M6 Michael: "arms go out in front of body when moving, it looks weird like a zombie. Arms should
      // stay parallel the body") the upper arms along the sides: the elbow within 8 cm fore or aft of the shoulder, the
      // hand at most 23 cm ahead of it at the front of its swing (the round 2 carry held the elbows 10+ cm forward all through)
      expect(Math.abs(o.arm[KA.elbowR + 2]!)).toBeLessThan(0.08);
      expect(Math.abs(o.arm[KA.elbowL + 2]!)).toBeLessThan(0.08);
      expect(o.arm[KA.wristR + 2]!).toBeLessThan(0.23);
      expect(o.arm[KA.wristL + 2]!).toBeLessThan(0.23);
      swingL = [Math.min(swingL[0]!, o.arm[KA.wristL + 2]!), Math.max(swingL[1]!, o.arm[KA.wristL + 2]!)];
      swingR = [Math.min(swingR[0]!, o.arm[KA.wristR + 2]!), Math.max(swingR[1]!, o.arm[KA.wristR + 2]!)];
      pelY = [Math.min(pelY[0]!, o.pel[1]!), Math.max(pelY[1]!, o.pel[1]!)];
      pelX = [Math.min(pelX[0]!, o.pel[0]!), Math.max(pelX[1]!, o.pel[0]!)];
    }
    // the wrist's fore-aft swing (CT about +-0.1-0.15 m)
    // (round 2: a small swing about the forward carry, CT 31-47 deg)
    expect(swingL[1]! - swingL[0]!).toBeGreaterThanOrEqual(0.08);
    // (anim-rework S2, M6: the arms swing naturally along the sides; a real walk swings the hand ~0.3 m)
    expect(swingL[1]! - swingL[0]!).toBeLessThanOrEqual(0.35);
    expect(swingR[1]! - swingR[0]!).toBeCloseTo(swingL[1]! - swingL[0]!, 2);
    // counter swing: the right hand forward at the left heel strike, the left at the right one
    at(0);
    expect(o.arm[KA.wristR + 2]!).toBeGreaterThan(o.arm[KA.wristL + 2]! + 0.05);
    at(0.5);
    expect(o.arm[KA.wristL + 2]!).toBeGreaterThan(o.arm[KA.wristR + 2]! + 0.05);
    // the pelvis: over the planted foot (left at 0.25, right at 0.75), a small keyed height shape (the legs' reach adds the rest)
    expect(pelX[1]! - pelX[0]!).toBeLessThanOrEqual(0.03);
    at(0.25);
    expect(o.pel[0]).toBeLessThan(-0.008);
    at(0.75);
    expect(o.pel[0]).toBeGreaterThan(0.008);
    expect(pelY[1]! - pelY[0]!).toBeLessThanOrEqual(0.012);
    // (round 3) lower and heavier: the pelvis held ~3-5 cm under its rest (round 2: ~7, read as a crouch), a little forward
    // (anim-rework S2, M6: upright, no lean: the pelvis over the feet, under 1 cm forward)
    expect(C.meanPel[1]!).toBeLessThan(-0.03);
    expect(C.meanPel[1]!).toBeGreaterThan(-0.07);
    expect(C.meanPel[2]!).toBeGreaterThan(0.005);
    // the hips and the shoulders turn against each other (pelvis yaw and chest yaw of opposite sign at the heel strike)
    at(0);
    const yaw = (s: number) => 2 * Math.atan2(o.q[s + 1]!, o.q[s + 3]!);
    // (anim-rework S2: 2 deg, was 4: a turned pelvis frame read the forward foot off the line)
    expect(yaw(KQ.pelvis)).toBeGreaterThan(0.025);
    expect(yaw(KQ.pelvis) + yaw(KQ.spine) + yaw(KQ.chest)).toBeLessThan(-0.03);
  });
});

describe('the graph plays the keyed walk', () => {
  const steady = (set: (i: ReturnType<typeof defaultInput>) => void, n = 60) => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    i.localZ = 1;
    i.keyedOk = true;
    set(i);
    let maxStep = 0;
    let last = 0;
    for (let k = 0; k < n; k++) {
      g.update(1 / 60, i);
      maxStep = Math.max(maxStep, Math.abs(g.out.keyW - last));
      last = g.out.keyW;
    }
    return { g, maxStep };
  };
  it('full at a walk, gone at a jog, on a wall, in the air, raised to aim, spinning; (S4) crouched the crouched set', () => {
    expect(steady((i) => (i.speed = 1.4)).g.out.keyW).toBeGreaterThan(0.95);
    expect(steady((i) => (i.speed = 0.75)).g.out.keyW).toBeGreaterThan(0.95);
    expect(steady((i) => (i.speed = 3)).g.out.keyW).toBe(0);
    // (anim-rework S4) crouched the crouched keyed set plays (sneak, crouch walk, crouch run)
    expect(steady((i) => ((i.speed = 1.4), (i.crouch = 1))).g.out.keyW).toBeGreaterThan(0.95);
    expect(steady((i) => ((i.speed = 1.4), (i.wall = true))).g.out.keyW).toBe(0);
    expect(steady((i) => ((i.speed = 1.4), (i.grounded = false))).g.out.keyW).toBe(0);
    expect(steady((i) => ((i.speed = 1.4), (i.raise = 1))).g.out.keyW).toBe(0);
    expect(steady((i) => ((i.speed = 0.1), (i.yawRate = 6))).g.out.keyW).toBeLessThan(0.05);
    expect(steady((i) => (i.speed = 0)).g.out.keyW).toBe(0);
    // (G8 fix) not when the rig says no (a held guard, a carried body, a guard's own rig)
    expect(steady((i) => ((i.speed = 1.4), (i.keyedOk = false))).g.out.keyW).toBe(0);
  });
  it('(anim-rework S2) holstered the keyed set covers the jog, the run and the idle; drawn it keeps the walk band', () => {
    const hol = (i: ReturnType<typeof defaultInput>) => ((i.ready = true), (i.armed = false));
    for (const v of [0, 0.75, 1.4, 2.1, 2.6, 3, 3.6, 4.5]) {
      expect(steady((i) => (hol(i), (i.speed = v)), 90).g.out.keyW, `holstered ${v} m/s`).toBeGreaterThan(0.95);
      expect(steady((i) => (hol(i), (i.speed = v)), 90).g.out.keyArmW, `holstered arms ${v} m/s`).toBeGreaterThan(0.95);
    }
    // the track narrows with the pace (the run lands nearer the line), and the idle stands about hip width
    const k = proportions().height / 1.75;
    const rX = (v: number) => steady((i) => (hol(i), (i.speed = v)), 120).g.out.stance.rX / k;
    expect(rX(3)).toBeCloseTo(KEYED_JOG.half, 2);
    expect(rX(4.5)).toBeCloseTo(KEYED_RUN.half, 2);
    expect(rX(0)).toBeCloseTo(KEYED_IDLE.half + IDLE_STANCE.extra, 2);
    // drawn (a lowered gun in the hands): the jog and the idle stay procedural, as before
    expect(steady((i) => ((i.armed = true), (i.speed = 3))).g.out.keyW).toBe(0);
    expect(steady((i) => ((i.armed = true), (i.speed = 0))).g.out.keyW).toBe(0);
  });
  it('(S2 fix round) the idle head scan reaches the head (keyScan) and the standing holstered weight (keyHol)', () => {
    const hol = (i: ReturnType<typeof defaultInput>) => ((i.ready = true), (i.armed = false));
    const scanMax = (set: (i: ReturnType<typeof defaultInput>) => void) => {
      const g = new AnimGraph(proportions());
      const i = defaultInput();
      i.localZ = 1;
      i.keyedOk = true;
      set(i);
      let m = 0;
      for (let k = 0; k < 60 * 13; k++) {
        g.update(1 / 60, i);
        m = Math.max(m, Math.abs(g.out.keyScan));
      }
      return { m, hol: g.out.keyHol };
    };
    // still and holstered: the scan turns the head 15-20 deg each way over the 12 s cycle
    const still = scanMax((i) => (hol(i), (i.speed = 0)));
    expect(still.m).toBeGreaterThan(0.2);
    expect(still.m).toBeLessThan(0.4);
    expect(still.hol).toBeGreaterThan(0.95);
    // walking or drawn: no scan; drawn: not the holstered weight (old hip follow, knee pole)
    expect(scanMax((i) => (hol(i), (i.speed = 1.4))).m).toBeLessThan(0.02);
    const drawn = scanMax((i) => ((i.armed = true), (i.speed = 0)));
    expect(drawn.m).toBe(0);
    expect(drawn.hol).toBe(0);
    // (anim-rework S4) crouched and still holstered: the keyed squat's own scan (16 / 13 deg) and the holstered weight
    const squat = scanMax((i) => (hol(i), (i.crouch = 1), (i.speed = 0)));
    expect(squat.hol).toBeGreaterThan(0.95);
    expect(squat.m).toBeGreaterThan(0.15);
    expect(squat.m).toBeLessThan(0.4);
  });
  it('(anim-rework S2) one continuous speed blend: no pop in the keyed pose from a creep to a run', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    i.localZ = 1;
    i.keyedOk = true;
    i.ready = true;
    i.phase = 0.25;
    let prev: Float64Array | null = null;
    let worst = 0;
    for (let n = 0; n < 60; n++) g.update(1 / 60, ((i.speed = 0.5), i));
    // the pace ramps 0.5 -> 4.5 m/s over 4 s at a fixed gait phase: only the blend changes the pose
    for (let n = 0; n <= 240; n++) {
      i.speed = 0.5 + (4 * n) / 240;
      g.update(1 / 60, i);
      const a = g.out.keyed.arm;
      if (prev) for (let c = 0; c < 12; c++) worst = Math.max(worst, Math.abs(a[c]! - prev[c]!));
      prev = Float64Array.from(a);
    }
    // an arm point moves under 2 cm a frame at this fast ramp (1 m/s a second; a gear pop moved the elbows ~10 cm at once)
    expect(worst).toBeLessThan(0.02);
  });
  it('(anim-rework S2) the jog and run keys: elbows bent and close to the ribs, the hands never across the midline', () => {
    const o = newKeyedPose();
    for (const clip of [KEYED_JOG, KEYED_RUN]) {
      const run = clip === KEYED_RUN;
      // (anim-bake-1022) Michael's 2026-10-22 run tune (arm abd 4 -> 19): measured elbow out 0.1000 m: was 0.05
      const outMax = run ? 0.11 : 0.05;
      // (anim-bake-1022) Michael's 2026-10-22 run tune: measured elbow flex min 61.6 deg: was 70
      const flexLo = run ? 55 : 70;
      let flexMin = 999;
      for (let f = 0; f < 32; f++) {
        sampleKeyed(clip, f / 32, 1, o);
        for (const side of [-1, 1]) {
          const e = side < 0 ? KA.elbowL : KA.elbowR;
          const w = side < 0 ? KA.wristL : KA.wristR;
          // the elbow at most 5 cm out from the shoulder (the chest frame; the METRICS elbow wing is 6 cm)
          expect(side * o.arm[e]!, `${clip.name} elbow out`).toBeLessThanOrEqual(outMax);
          // the hand inside the shoulder line but not across the midline (the shoulder joint is ~0.17 m out)
          expect(side * o.arm[w]!, `${clip.name} hand in`).toBeGreaterThan(-0.15);
          const ux = o.arm[e]!, uy = o.arm[e + 1]!, uz = o.arm[e + 2]!;
          const vx = o.arm[w]! - ux, vy = o.arm[w + 1]! - uy, vz = o.arm[w + 2]! - uz;
          const c = (ux * vx + uy * vy + uz * vz) / Math.hypot(ux, uy, uz) / Math.hypot(vx, vy, vz);
          flexMin = Math.min(flexMin, (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI);
        }
      }
      // elbows bent 70+ deg all through the cycle (the jog / run carriage, not a straight-arm swing)
      expect(flexMin, `${clip.name} elbow flex`).toBeGreaterThanOrEqual(flexLo);
      expect(clip.duty).toBeLessThan(0.5);
    }
  });
  it('eases in (no pop) and narrows the stance; free arms only when holstered', () => {
    const { g, maxStep } = steady((i) => (i.speed = 1.4));
    expect(maxStep).toBeLessThanOrEqual((1 / 60 / KEYED_WALK_BAND.tau) * 1.05);
    const k = proportions().height / 1.75;
    expect(g.out.stance.rX).toBeCloseTo(C.half * k, 2);
    // a remote copy (no driver phase: the graph's own clock) plays it too
    const r = steady((i) => ((i.speed = 1.4), (i.phase = -1)));
    expect(r.g.out.keyW).toBeGreaterThan(0.95);
    // ready (holstered, free hands): arms keyed too; armed (a lowered gun in the hands): body only
    expect(steady((i) => ((i.speed = 1.4), (i.ready = true), (i.armed = false))).g.out.keyArmW).toBeGreaterThan(0.5);
    expect(steady((i) => ((i.speed = 1.4), (i.armed = true))).g.out.keyArmW).toBe(0);
  });
});

describe('the rig plays the keyed walk (NullEngine)', () => {
  it('arms on the keyed points, knees apart, elbows out of the trunk, owner and remote alike', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    for (const remote of [false, true]) {
      const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
      rig.groundProbe = () => 0;
      rig.carrier = true;
      const pose: Parameters<typeof rig.animate>[1] = { speed: 1.4, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' };
      let z = 0;
      let phase = 0;
      let minKnee = 9;
      let maxArmErr = 0;
      let seen = 0;
      const o = newKeyedPose();
      const k = rig.p.height / 1.75;
      const W = (n: { parent: unknown; computeWorldMatrix(f: boolean): unknown; getAbsolutePosition(): { x: number; y: number; z: number } }) => {
        const chain: (typeof n)[] = [];
        for (let q: typeof n | null = n; q; q = q.parent as typeof n | null) chain.unshift(q);
        for (const q of chain) q.computeWorldMatrix(true);
        const p = n.getAbsolutePosition();
        return { x: p.x, y: p.y, z: p.z };
      };
      for (let n = 0; n < 240; n++) {
        z += 1.4 / 60;
        rig.root.position.set(0, 0, z);
        rig.root.rotation.y = 0;
        if (!remote) {
          phase = (phase + 1 / 60 / 0.82) % 1;
          pose.phase = phase;
          pose.velX = 0;
          pose.velZ = 1.4;
        }
        rig.animate(1 / 60, pose);
        if (n < 120) continue;
        expect(rig.keyedWalk).toBeGreaterThan(0.95);
        const kl = W(rig.kneeL);
        const kr = W(rig.kneeR);
        minKnee = Math.min(minKnee, Math.hypot(kl.x - kr.x, kl.y - kr.y, kl.z - kr.z));
        // the arm reaches the keyed wrist point (from the shoulder, the chest frame) within 2 cm unless the trunk
        // clearance swivelled it
        const t = rig.lastTargets!;
        sampleKeyed(C, t.gait.phase, 1, o);
        const sh = W(rig.shoulderR);
        const wr = W(rig.wristR);
        const want = { x: o.arm[KA.wristR]! * k, y: o.arm[KA.wristR + 1]! * k, z: o.arm[KA.wristR + 2]! * k };
        // chest frame -> world (the chest is near upright: its rotation from the rig)
        const q = rig.torso.absoluteRotationQuaternion;
        const { Vector3 } = await import('../src/core/babylon');
        const v = new Vector3(want.x, want.y, want.z).rotateByQuaternionToRef(q, new Vector3());
        maxArmErr = Math.max(maxArmErr, Math.hypot(sh.x + v.x - wr.x, sh.y + v.y - wr.y, sh.z + v.z - wr.z) * (t.keyArmW > 0.95 ? 1 : 0));
        seen++;
      }
      expect(seen).toBeGreaterThan(100);
      expect(minKnee, remote ? 'remote knees' : 'knees').toBeGreaterThanOrEqual(0.09);
      // within 3.5 cm (was 3; anim-rework S2: the arms hang along the sides, nearer the hips, so the trunk clearance swivels them a touch more)
      expect(maxArmErr, remote ? 'remote arm' : 'arm').toBeLessThanOrEqual(0.035);
      // (G8 fix) holding a guard (the close-quarters bend) the keyed walk lets go: the hostage walk keeps its own stance
      pose.bend = 0.08;
      for (let n = 0; n < 40; n++) {
        z += 0.7 / 60;
        rig.root.position.set(0, 0, z);
        rig.animate(1 / 60, pose);
      }
      expect(rig.keyedWalk, remote ? 'remote hold' : 'hold').toBeLessThan(0.01);
      rig.dispose();
    }
    scene.dispose();
  });
});

describe('(anim-rework S2) mixKeyed', () => {
  it('lerps offsets and arm points, nlerps quaternions on one hemisphere, in place', () => {
    const a = newKeyedPose();
    const b = newKeyedPose();
    sampleKeyed(KEYED_WALK, 0.1, 1, a);
    sampleKeyed(KEYED_JOG, 0.1, 1, b);
    // b's quaternions flipped to the other hemisphere: the same rotations
    for (let c = 0; c < 16; c++) b.q[c] = -b.q[c]!;
    const o = newKeyedPose();
    mixKeyed(a, b, 0, o);
    for (let c = 0; c < 12; c++) expect(o.arm[c]).toBeCloseTo(a.arm[c]!, 9);
    for (let c = 0; c < 16; c++) expect(o.q[c]).toBeCloseTo(a.q[c]!, 9);
    mixKeyed(a, b, 1, o);
    for (let c = 0; c < 3; c++) expect(o.pel[c]).toBeCloseTo(b.pel[c]!, 9);
    for (let s = 0; s < 16; s += 4) expect(Math.abs(o.q[s]! * b.q[s]! + o.q[s + 1]! * b.q[s + 1]! + o.q[s + 2]! * b.q[s + 2]! + o.q[s + 3]! * b.q[s + 3]!)).toBeCloseTo(1, 9);
    mixKeyed(a, b, 0.5, o);
    for (let c = 0; c < 12; c++) expect(o.arm[c]).toBeCloseTo((a.arm[c]! + b.arm[c]!) / 2, 9);
    for (let s = 0; s < 16; s += 4) expect(Math.hypot(o.q[s]!, o.q[s + 1]!, o.q[s + 2]!, o.q[s + 3]!)).toBeCloseTo(1, 9);
    // in place (out = a)
    const keep = Float64Array.from(b.arm);
    mixKeyed(a, b, 1, a);
    for (let c = 0; c < 12; c++) expect(a.arm[c]).toBeCloseTo(keep[c]!, 9);
  });
});
