/**
 * (anim-natural-n2 A11) The anti-crab facing frame. The gated planted-foot track and knee-out (metrics.ts footTrack /
 * kneeBow) read lateral offsets along the hip axis; Wren's body motion layer (src/anim/bodyMotion.ts) adds a hip yaw
 * that turns that axis with the pelvis, so the pelvis frame reads the layer's twist as a crab. These helpers build the
 * facing frame through the hip midpoint: two synthetic hip points at the midpoint +- half the horizontal hip width along
 * the root's right axis, which footTrack / kneeBow then take in place of the hip joints (their limits unchanged).
 * Engine-free and offline (the e2e-anim harness; not a hot path). Undo: pass the hip joints again (the pelvis frame).
 */
import { hyp2 } from '../../core/mathx';

type Arr = ArrayLike<number>;

/**
 * Facing-frame hips: for each frame i, the hip midpoint +- half the horizontal hip width along the root's right axis
 * (Babylon root `rotation.y` = yaw[i]: local +x is world (cos yaw, 0, -sin yaw)). Streams are flat x, y, z per frame.
 */
export function facingHips(hipL: Arr, hipR: Arr, yaw: Arr): { hipL: number[]; hipR: number[] } {
  const n = Math.min(Math.floor(hipL.length / 3), Math.floor(hipR.length / 3), yaw.length);
  const L: number[] = new Array<number>(n * 3);
  const R: number[] = new Array<number>(n * 3);
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    const lx = hipL[k] ?? 0;
    const ly = hipL[k + 1] ?? 0;
    const lz = hipL[k + 2] ?? 0;
    const rx = hipR[k] ?? 0;
    const ry = hipR[k + 1] ?? 0;
    const rz = hipR[k + 2] ?? 0;
    const mx = (lx + rx) / 2;
    const my = (ly + ry) / 2;
    const mz = (lz + rz) / 2;
    const hw = hyp2(rx - lx, rz - lz) / 2;
    const y = yaw[i] ?? 0;
    const ux = Math.cos(y) * hw;
    const uz = -Math.sin(y) * hw;
    L[k] = mx - ux;
    L[k + 1] = my;
    L[k + 2] = mz - uz;
    R[k] = mx + ux;
    R[k + 1] = my;
    R[k + 2] = mz + uz;
  }
  return { hipL: L, hipR: R };
}
