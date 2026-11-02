import { describe, expect, it } from 'vitest';

/**
 * (P1b) Crouch depth and wall arms. Torso pitch = hips -> neck from vertical (deg), measured on the real rig (armed,
 * low ready: the carriage hunch stacked on the crouch lean made a 80-90 deg quadruped); wall stance hands hang below
 * the hips (the off hand sat on the hip, elbow out).
 */
async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/player/avatarLook');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
  rig.carrier = true;
  return rig;
}
type Rig = Awaited<ReturnType<typeof setup>>;
type Pose = Parameters<Rig['animate']>[1];

function settle(rig: Rig, pose: Pose, seconds: number, onFrame?: (k: number) => void): void {
  for (let k = 0; k < seconds * 60; k++) {
    rig.root.position.z += pose.speed / 60;
    rig.animate(1 / 60, pose);
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
    onFrame?.(k);
  }
}
function torsoPitch(rig: Rig): number {
  const h = rig.hips.getAbsolutePosition();
  const n = rig.neck.getAbsolutePosition();
  const f = rig.root.getDirection(rig.root.forward.clone()).normalizeToNew();
  const dx = n.x - h.x;
  const dy = n.y - h.y;
  const dz = n.z - h.z;
  const fwd = dx * f.x + dz * f.z;
  return (Math.atan2(fwd, dy) * 180) / Math.PI;
}

describe('crouch depth and run lean (P1b)', () => {
  const cases: [string, number, number, boolean, number, number][] = [
    ['crouch idle armed', 1, 0, true, 35, 45],
    ['crouch walk armed', 1, 0.85, true, 35, 45],
    ['crouch idle holstered', 1, 0, false, 35, 45],
    ['crouch walk holstered', 1, 0.85, false, 35, 45],
    ['run armed', 0, 4.2, true, 18, 28],
    ['run holstered', 0, 4.2, false, 18, 28],
  ];
  for (const [name, crouch, speed, armed, lo, hi] of cases) {
    it(`${name}: torso ${lo}-${hi} deg`, async () => {
      const rig = await setup();
      const pose: Pose = { speed, localX: 0, localZ: speed > 0 ? 1 : 0, grounded: true, crouch, aimPitch: 0, aim: 0, kick: 0, armed, kneel: false };
      let a = 0;
      let n = 0;
      settle(rig, pose, 3, (k) => {
        if (k >= 120) {
          a += torsoPitch(rig);
          n++;
        }
      });
      const deg = a / n;
      expect(deg, `${name} ${deg.toFixed(1)}`).toBeGreaterThanOrEqual(lo);
      expect(deg, `${name} ${deg.toFixed(1)}`).toBeLessThanOrEqual(hi);
    });
  }
  it('(F3) crouch kneeling (idle for 0.5 s+) is upright: torso 0-20 deg', async () => {
    const rig = await setup();
    const pose: Pose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 1, aimPitch: 0, aim: 0, kick: 0, armed: true, kneel: true };
    settle(rig, pose, 3);
    const deg = torsoPitch(rig);
    expect(deg, `kneel ${deg.toFixed(1)}`).toBeGreaterThanOrEqual(0);
    expect(deg, `kneel ${deg.toFixed(1)}`).toBeLessThanOrEqual(20);
  });
});

describe('back to wall arms (P1b)', () => {
  for (const [name, armed] of [['unarmed', false], ['armed', true]] as const) {
    it(`${name}: both hands hang below the hips`, async () => {
      const rig = await setup();
      const pose: Pose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed, wall: true, wallSide: 1, wallNx: 0, wallNz: -1, wallFace: 0 };
      settle(rig, pose, 3);
      const hipY = (rig.hipL.getAbsolutePosition().y + rig.hipR.getAbsolutePosition().y) / 2;
      const root = rig.root.position;
      const out: string[] = [];
      for (const [side, w, e] of [['L', rig.wristL, rig.elbowL], ['R', rig.wristR, rig.elbowR]] as const) {
        const wp = w.getAbsolutePosition();
        const ep = e.getAbsolutePosition();
        out.push(`${side} wristY ${wp.y.toFixed(3)} wristX ${Math.abs(wp.x - root.x).toFixed(3)} elbowX ${Math.abs(ep.x - root.x).toFixed(3)}`);
        // hands hang at the hips or lower (the rig's arms are short: the hang ends at hip height), not up on the hip
        expect(wp.y, `${name} ${side} wrist ${out.join(' | ')}`).toBeLessThan(hipY);
        // elbows tucked (hand on hip puts the elbow out ~0.3 m from the centre line)
        expect(Math.abs(ep.x - root.x), `${name} ${side} elbow ${out.join(' | ')}`).toBeLessThan(0.27);
      }
    });
  }
});
