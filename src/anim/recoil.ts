/**
 * (anim-n3b, anim-natural PASS2 row 25) Wren's per-shot body recoil (pure, Babylon-free, no allocation).
 *
 * Each shot (a rising edge of the rig's `kick`, which the shooter sets to 1 per shot and lets fall at 8 / s: the local
 * player `playerWeapons.shoot`, the co-op partner `remoteAvatar.fireVisuals` from its firing flag, so no wire change)
 * gives two critically damped springs a velocity impulse sized so each peaks at 1:
 * - the gun spring (`omega`, peak at 1 / omega s): the weapon and the hands kick back and up, the muzzle rises;
 * - the body spring (`bodyOmega`, a little slower: the trunk takes the push after the hands): the chest gives back and
 *   blades the shooting shoulder, the pelvis a touch.
 * The rifle is braced in the shoulder (more chest, little wrist); the pistol is held out in the hands (more muzzle flip and
 * lift at the wrists and elbows, little chest). Blended by the graph's pistol weight. Visual only: the camera, the
 * reticle and the shot ray never read the pose (the shot ray starts at the muzzle but points at the camera's aim point).
 *
 * Starting values (Michael fine-tunes with the Gun section's `recoilMul`): rifle about 3 cm back at the hands (2 cm on
 * the gun + the chest's give), 1.5 deg muzzle rise, 1.5 deg chest; pistol 1.5 cm back, 1.2 cm up, 4.5 deg flip. Settles
 * under 3 % within 0.3 s of the last shot. The guards keep the CT prototype G2 recoil (`RECOIL` in animGraph.ts).
 */
import { Spring } from './rigMath';

/** Per-shot peaks: `back` / `up` m on the weapon (aim frame), `flip` rad muzzle up, `spine` rad chest back, `yaw` rad
 *  the shooting shoulder back (mirrored with the hand), `pelvis` rad; `omega` / `bodyOmega` the springs (rad/s). */
export const WREN_RECOIL_RIFLE = { back: 0.02, up: 0.003, flip: 0.026, spine: 0.026, yaw: 0.012, pelvis: 0.004, omega: 28, bodyOmega: 22 };
export const WREN_RECOIL_PISTOL = { back: 0.015, up: 0.012, flip: 0.08, spine: 0.007, yaw: 0.003, pelvis: 0, omega: 34, bodyOmega: 24 };

/**
 * Raised, the rig holds the sight line at the eye (`sightToEye`), which would take the kick's lift straight back out: the
 * graph lets the sight rise by the lift plus the flip times this lever (m, the sight about this far ahead of the grip).
 */
export const RECOIL_SIGHT_ARM = 0.15;

/** A kick rising by more than this between two frames is a new shot (the kick falls at 8 / s: shots 25 ms apart and more). */
const SHOT_EDGE = 0.2;

export class BodyRecoil {
  /** This frame's offsets (see WREN_RECOIL_RIFLE for the units and signs). */
  back = 0;
  up = 0;
  flip = 0;
  spine = 0;
  yaw = 0;
  pelvis = 0;
  private readonly gun = new Spring();
  private readonly body = new Spring();
  private prevKick = 0;

  /**
   * One frame: `kick` the rig's kick 0..1, `pistolW` 0 rifle .. 1 pistol, `mul` the tuner's scale (1 = the table),
   * `dt` s. No allocation.
   */
  step(kick: number, pistolW: number, mul: number, dt: number): void {
    const R = WREN_RECOIL_RIFLE;
    const P = WREN_RECOIL_PISTOL;
    const w = pistolW < 0 ? 0 : pistolW > 1 ? 1 : pistolW;
    const om = R.omega + (P.omega - R.omega) * w;
    const omB = R.bodyOmega + (P.bodyOmega - R.bodyOmega) * w;
    if (kick > this.prevKick + SHOT_EDGE) {
      // critically damped x(t) = v0 t e^(-omega t) peaks at v0 / (omega e): v0 = omega e gives a unit peak
      this.gun.kick(om * Math.E);
      this.body.kick(omB * Math.E);
    }
    this.prevKick = kick;
    const g = this.gun.step(0, om, dt) * mul;
    const b = this.body.step(0, omB, dt) * mul;
    this.back = g * (R.back + (P.back - R.back) * w);
    this.up = g * (R.up + (P.up - R.up) * w);
    this.flip = g * (R.flip + (P.flip - R.flip) * w);
    this.spine = b * (R.spine + (P.spine - R.spine) * w);
    this.yaw = b * (R.yaw + (P.yaw - R.yaw) * w);
    this.pelvis = b * (R.pelvis + (P.pelvis - R.pelvis) * w);
  }

  /** Back to rest (no kick in flight). */
  reset(): void {
    this.gun.reset();
    this.body.reset();
    this.prevKick = 0;
    this.back = this.up = this.flip = this.spine = this.yaw = this.pelvis = 0;
  }
}
