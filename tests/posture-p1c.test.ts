import { describe, expect, it } from 'vitest';

/**
 * (P1c) Standing idle is upright with the hands hanging below the hips (holstered); crouch idle holds a two-foot
 * squat (no kneel: the footage has none).
 */
async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
  rig.carrier = true;
  return rig;
}
type Rig = Awaited<ReturnType<typeof setup>>;
type Pose = Parameters<Rig['animate']>[1];

function settle(rig: Rig, pose: Pose, seconds: number): void {
  for (let k = 0; k < seconds * 60; k++) {
    rig.animate(1 / 60, pose);
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
  }
}
function torsoPitch(rig: Rig): number {
  const h = rig.hips.getAbsolutePosition();
  const n = rig.neck.getAbsolutePosition();
  const f = rig.root.getDirection(rig.root.forward.clone()).normalizeToNew();
  return (Math.atan2((n.x - h.x) * f.x + (n.z - h.z) * f.z, n.y - h.y) * 180) / Math.PI;
}
const idle = (crouch: number, kneel: boolean): Pose => ({ speed: 0, localX: 0, localZ: 0, grounded: true, crouch, aimPitch: 0, aim: 0, kick: 0, armed: false, kneel });

describe('idle posture (P1c)', () => {
  it('standing idle holstered: torso under 10 deg, hands below the hips', async () => {
    const rig = await setup();
    settle(rig, idle(0, false), 3);
    const deg = torsoPitch(rig);
    const hipY = (rig.hipL.getAbsolutePosition().y + rig.hipR.getAbsolutePosition().y) / 2;
    expect(deg).toBeLessThan(10);
    for (const w of [rig.wristL, rig.wristR]) expect(w.getAbsolutePosition().y).toBeLessThan(hipY);
  });
  it('crouch idle with kneel requested: both feet planted, no knee on the ground', async () => {
    const rig = await setup();
    settle(rig, idle(1, true), 3);
    const deg = torsoPitch(rig);
    const ky = [rig.kneeL.getAbsolutePosition().y, rig.kneeR.getAbsolutePosition().y];
    const ay = [rig.ankleL.getAbsolutePosition().y, rig.ankleR.getAbsolutePosition().y];
    for (const y of ky) expect(y).toBeGreaterThan(0.25);
    for (const y of ay) expect(y).toBeLessThan(0.2);
    expect(deg).toBeGreaterThanOrEqual(35);
    expect(deg).toBeLessThanOrEqual(45);
  });
});
