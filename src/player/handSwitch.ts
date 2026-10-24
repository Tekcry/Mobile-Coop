/**
 * (rig-pose-fix S7, audit G15) The weapon changing hands (the open-left wall edge, D9, and the shoulder swap): one clock,
 * Babylon-free, no allocation. The sim owns one (`PlayerWeapons.hand`, stepped in the fixed step: the weapon swap holds
 * on it) and every rig eases its own copy toward the same target at the render rate (`CharacterRig`; a remote's target
 * is the wire flag), so the drawn switch is unchanged and gameplay never reads the rig's eased blend.
 */

/** Weapon changing hands at an open-left back-to-wall edge (s): inside D9's 0.2-0.3 s draw / lean-out step (12b);
 *  a smoothstep with the graph's `hands` clip entered through the Inertializer, never a pop. */
export const EDGE_HAND_TIME = 0.25;

export class HandSwitch {
  /** 0 the right hand, 1 the left (eased). */
  blend = 0;
  /** Progress 0..1 while changing hands, else -1. */
  swap = -1;
  private from = 0;
  /** The hand target the running switch eases toward (a reversal mid-switch restarts from the current blend). */
  private to = 0;
  /** Where the running switch's progress started (0, or the mirrored progress after a reversal). */
  private start = 0;
  /** Blend rate (1/s) on the last switch step, and the Hermite start tangent a reversal carries it into. */
  private rate = 0;
  private tan = 0;
  /** Duration (s) of the running switch: EDGE_HAND_TIME, or longer for a fast reversal. */
  private dur = EDGE_HAND_TIME;

  /** The hand holding the weapon now (1 right, -1 left). */
  get hand(): number {
    return this.blend > 0.5 ? -1 : 1;
  }

  /** The weapon is changing hands. */
  get switching(): boolean {
    return this.swap >= 0;
  }

  /**
   * One step toward `left` (the weapon to the left hand). A new switch, or the target reversing mid-switch: restart from
   * the current blend (no jump, 12b fix r1). A reversal rewinds: progress restarts at the mirrored point 1 - s (the
   * graph's tuck bump sin(pi * handSwap) stays continuous and retracts) and the blend keeps its velocity (a cubic Hermite
   * from the current blend and rate to the new target at rest), so the weapon never steps or snaps direction. The rewind
   * runs at least EDGE_HAND_TIME, longer when needed so its peak acceleration stays under a plain switch's (6 / T^2).
   */
  step(dt: number, left: boolean): void {
    const target = left ? 1 : 0;
    if (this.swap < 0 && target !== this.blend) {
      this.swap = 0;
      this.start = 0;
      this.from = this.blend;
      this.to = target;
      this.tan = 0;
      this.dur = EDGE_HAND_TIME;
    } else if (this.swap >= 0 && target !== this.to) {
      const s0 = Math.min(0.999, 1 - this.swap);
      this.swap = s0;
      this.start = s0;
      this.from = this.blend;
      this.to = target;
      const r = Math.abs(this.rate) * EDGE_HAND_TIME;
      const x = (4 * r + Math.sqrt(16 * r * r + 144 * Math.abs(target - this.blend))) / 12;
      this.dur = EDGE_HAND_TIME * Math.min(2, Math.max(1, x));
      this.tan = this.rate * this.dur;
    }
    if (this.swap >= 0) {
      const prev = this.blend;
      this.swap = Math.min(1, this.swap + ((1 - this.start) * dt) / this.dur);
      const u = Math.min(1, (this.swap - this.start) / (1 - this.start));
      const e = u * u * (3 - 2 * u);
      const v = 1 - u;
      this.blend = Math.min(1, Math.max(0, this.from + (target - this.from) * e + this.tan * u * v * v));
      this.rate = dt > 0 ? (this.blend - prev) / dt : 0;
      if (this.swap >= 1) {
        this.blend = target;
        this.swap = -1;
        this.rate = 0;
      }
    }
  }
}
