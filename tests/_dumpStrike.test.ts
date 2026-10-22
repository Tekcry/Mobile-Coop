import { it, vi } from 'vitest';
import type { RigPose } from '../src/player/characterRig';
import { STRIKE_BODY_FOLLOW, strikeWarp } from '../src/anim/strikeBody';
import { STRIKE_DUR, strikePhase } from '../src/game/elbowStrike';

it('dump', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, Vector3, Matrix } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { WREN_HANDS } = await import('../src/operators/handFrame');
  const out: string[] = [];
  for (const rate of [7, 6.5]) for (const hz of [60, 30]) {
    STRIKE_BODY_FOLLOW.rate = rate;
    if (hz === 60) out.push('RATE ' + rate);
    const DT = 1 / hz;
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 1.75, 'dump', { build: 'average', style: 'detailed' });
    rig.groundProbe = () => 0;
    rig.carrier = true;
    rig.setHands(WREN_HANDS);
    rig.tuneRows = true;
    const settle = (): void => {
      rig.root.computeWorldMatrix(true);
      for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
    };
    const shOf = (): number => Math.atan2(-(rig.shoulderR.getAbsolutePosition().z - rig.shoulderL.getAbsolutePosition().z), rig.shoulderR.getAbsolutePosition().x - rig.shoulderL.getAbsolutePosition().x);
    const pose: RigPose = { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing', melee: -1 };
    for (let k = 0; k < 120; k++) rig.animate(DT, pose);
    settle();
    const inv = new Matrix();
    rig.torso.getWorldMatrix().invertToRef(inv);
    let prev = rig.wristR.getAbsolutePosition().clone();
    const r0 = Vector3.TransformCoordinates(prev, inv);
    out.push(`rest wx=${(r0.x * 100).toFixed(1)} wy=${(r0.y * 100).toFixed(1)} wz=${(r0.z * 100).toFixed(1)}`);
    let prevSh = shOf();
    const n = Math.ceil(STRIKE_DUR / DT);
    let maxStep = 0;
    let shMin = 1e9;
    let shAt = 0;
    const wxs: number[] = [];
    const steps: string[] = [];
    for (let k = 1; k <= n; k++) {
      const ph = strikePhase(k * DT);
      pose.melee = strikeWarp(ph);
      rig.animate(DT, pose);
      settle();
      const w = rig.wristR.getAbsolutePosition();
      rig.torso.getWorldMatrix().invertToRef(inv);
      const wl = Vector3.TransformCoordinates(w, inv);
      const sh = shOf();
      const st = Vector3.Distance(w, prev);
      maxStep = Math.max(maxStep, st);
      if (sh < shMin) [shMin, shAt] = [sh, k * DT];
      wxs.push(wl.x);
      if (k * DT < 0.13) steps.push(`${(st * 100).toFixed(1)}/${((sh - prevSh) * 57.3).toFixed(0)}`);
      prev = w.clone();
      prevSh = sh;
    }
    const m = Math.min(...wxs);
    const across = (wxs.findIndex((x) => x <= m + 0.01) + 1) * DT;
    out.push(`${hz}Hz max ${(maxStep * 100).toFixed(1)} cm; across ${(across * 1000).toFixed(0)} ms; shoulders through ${(shAt * 1000).toFixed(0)} ms; steps cm/shdeg ${steps.join(' ')}`);
    scene.dispose();
  }
  console.info('DUMP ' + out.join(' | '));
});
