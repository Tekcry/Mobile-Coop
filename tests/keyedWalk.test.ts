// (CT prototype G8) The keyed walk (scripts/anim-keys, src/anim/keyed.ts, G8-PLAN.md): the sampler, the clip against the
// footage numbers (G8-REPORT.md "Before"), the graph's weight and the rig playing it (NullEngine), owner and remote alike.
import { describe, expect, it } from 'vitest';
import { AnimGraph, defaultInput, KEYED_WALK_BAND } from '../src/anim/animGraph';
import { KA, KQ, newKeyedPose, sampleKeyed } from '../src/anim/keyed';
import { KEYED_WALK } from '../src/anim/clips/keyed/walk';
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
    // track: the feet under the body (CT ~0.6-0.75 hip widths; ours was 0.98), the soles clear (>= 0.11 m apart)
    expect(C.half * 2).toBeGreaterThanOrEqual(0.11);
    expect((C.half * 2) / (2 * proportions().hipHalf)).toBeLessThanOrEqual(0.75);
    expect(C.kneeOut).toBeLessThanOrEqual(0.05);
    let swingL = [9, -9];
    let swingR = [9, -9];
    let pelY = [9, -9];
    let pelX = [9, -9];
    for (let k = 0; k < 64; k++) {
      at(k / 64);
      // elbows within 4 cm and wrists within 9.5 cm out of the shoulder line (were 8 / 10 cm, the jog 19 / 24): the hands
      // pass just outside her hips and the right thigh holster
      expect(-o.arm[KA.elbowL]!).toBeLessThanOrEqual(0.04);
      expect(o.arm[KA.elbowR]!).toBeLessThanOrEqual(0.04);
      expect(-o.arm[KA.wristL]!).toBeLessThanOrEqual(0.095);
      expect(o.arm[KA.wristR]!).toBeLessThanOrEqual(0.095);
      // and never in toward the body
      expect(-o.arm[KA.elbowL]!).toBeGreaterThanOrEqual(0.01);
      expect(o.arm[KA.wristR]!).toBeGreaterThanOrEqual(0.02);
      swingL = [Math.min(swingL[0]!, o.arm[KA.wristL + 2]!), Math.max(swingL[1]!, o.arm[KA.wristL + 2]!)];
      swingR = [Math.min(swingR[0]!, o.arm[KA.wristR + 2]!), Math.max(swingR[1]!, o.arm[KA.wristR + 2]!)];
      pelY = [Math.min(pelY[0]!, o.pel[1]!), Math.max(pelY[1]!, o.pel[1]!)];
      pelX = [Math.min(pelX[0]!, o.pel[0]!), Math.max(pelX[1]!, o.pel[0]!)];
    }
    // the wrist's fore-aft swing (CT about +-0.1-0.15 m)
    expect(swingL[1]! - swingL[0]!).toBeGreaterThanOrEqual(0.18);
    expect(swingL[1]! - swingL[0]!).toBeLessThanOrEqual(0.32);
    expect(swingR[1]! - swingR[0]!).toBeCloseTo(swingL[1]! - swingL[0]!, 2);
    // counter swing: the right hand forward at the left heel strike, the left at the right one
    at(0);
    expect(o.arm[KA.wristR + 2]!).toBeGreaterThan(o.arm[KA.wristL + 2]! + 0.15);
    at(0.5);
    expect(o.arm[KA.wristL + 2]!).toBeGreaterThan(o.arm[KA.wristR + 2]! + 0.15);
    // the pelvis: over the planted foot (left at 0.25, right at 0.75), a small keyed height shape (the legs' reach adds the rest)
    expect(pelX[1]! - pelX[0]!).toBeLessThanOrEqual(0.03);
    at(0.25);
    expect(o.pel[0]).toBeLessThan(-0.008);
    at(0.75);
    expect(o.pel[0]).toBeGreaterThan(0.008);
    expect(pelY[1]! - pelY[0]!).toBeLessThanOrEqual(0.012);
    // the hips and the shoulders turn against each other (pelvis yaw and chest yaw of opposite sign at the heel strike)
    at(0);
    const yaw = (s: number) => 2 * Math.atan2(o.q[s + 1]!, o.q[s + 3]!);
    expect(yaw(KQ.pelvis)).toBeGreaterThan(0.04);
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
  it('full at a walk, gone at a jog, crouched, on a wall, in the air, raised to aim, spinning', () => {
    expect(steady((i) => (i.speed = 1.4)).g.out.keyW).toBeGreaterThan(0.95);
    expect(steady((i) => (i.speed = 0.75)).g.out.keyW).toBeGreaterThan(0.95);
    expect(steady((i) => (i.speed = 3)).g.out.keyW).toBe(0);
    expect(steady((i) => ((i.speed = 1.4), (i.crouch = 1))).g.out.keyW).toBe(0);
    expect(steady((i) => ((i.speed = 1.4), (i.wall = true))).g.out.keyW).toBe(0);
    expect(steady((i) => ((i.speed = 1.4), (i.grounded = false))).g.out.keyW).toBe(0);
    expect(steady((i) => ((i.speed = 1.4), (i.raise = 1))).g.out.keyW).toBe(0);
    expect(steady((i) => ((i.speed = 0.1), (i.yawRate = 6))).g.out.keyW).toBeLessThan(0.05);
    expect(steady((i) => (i.speed = 0)).g.out.keyW).toBe(0);
    // (G8 fix) not when the rig says no (a held guard, a carried body, a guard's own rig)
    expect(steady((i) => ((i.speed = 1.4), (i.keyedOk = false))).g.out.keyW).toBe(0);
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
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
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
      expect(maxArmErr, remote ? 'remote arm' : 'arm').toBeLessThanOrEqual(0.02);
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
