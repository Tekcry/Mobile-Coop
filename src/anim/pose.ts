/**
 * Pose channels (pure). A pose is a flat Float32Array of named scalar channels that clips key and
 * layers blend; the rig turns the final pose into joint rotations and IK targets. Fixed layout so
 * blending is allocation-free.
 */

export const CHANNELS = [
  // pelvis offset from rest (m, root space) and rotation (rad)
  'pelX',
  'pelY',
  'pelZ',
  'pelPitch',
  'pelRoll',
  'pelYaw',
  // spine (split over spine + chest by the rig) and head
  'spPitch',
  'spYaw',
  'spRoll',
  'hdPitch',
  'hdYaw',
  'hdRoll',
  // weapon pose relative to the aim pocket (m, rad); pitch + = muzzle down
  'wpX',
  'wpY',
  'wpZ',
  'wpPitch',
  'wpYaw',
  'wpRoll',
  // hands: grip weight (both hands on the weapon), off hand on the foregrip / cover surface
  'grip',
  'offGrip',
  'offCover',
  // off hand on the weapon's magazine well (reloads)
  'offMag',
  // free hand targets (root space, used when not gripping: swaps, grenade, free arms)
  'hLX',
  'hLY',
  'hLZ',
  'hRX',
  'hRY',
  'hRZ',
  // stance: per-foot offsets from the base stance (m, root space), heel raise (m) and pitch (rad)
  'fLX',
  'fLZ',
  'fLY',
  'fLPitch',
  'fRX',
  'fRZ',
  'fRY',
  'fRPitch',
  // swing lift scale and stance width scale
  'lift',
  'width',
] as const;

export type Channel = (typeof CHANNELS)[number];
export const NCH = CHANNELS.length;
export const CH = Object.fromEntries(CHANNELS.map((c, i) => [c, i])) as Record<Channel, number>;

export type Pose = Float32Array;

export function newPose(): Pose {
  const p = new Float32Array(NCH);
  p[CH.grip] = 1;
  p[CH.offGrip] = 1;
  p[CH.lift] = 1;
  p[CH.width] = 1;
  return p;
}

/** out = a + (b - a) * w */
export function lerpPose(out: Pose, a: Pose, b: Pose, w: number): Pose {
  for (let i = 0; i < NCH; i++) out[i] = a[i]! + (b[i]! - a[i]!) * w;
  return out;
}

export function copyPose(out: Pose, a: Pose): Pose {
  out.set(a);
  return out;
}

/** Joint groups and their inertialization settle times (s): heavier parts settle slower. */
export const GROUP_OF: readonly number[] = CHANNELS.map((c) => {
  if (c.startsWith('pel')) return 0.32;
  if (c.startsWith('sp')) return 0.26;
  if (c.startsWith('hd')) return 0.2;
  if (c.startsWith('wp')) return 0.24;
  if (c.startsWith('f') || c === 'lift' || c === 'width') return 0.35;
  return 0.18; // hands, grips
});

/**
 * Inertialization: when the source pose jumps (state switch, clip start, hand swap), the jump is
 * captured as an offset (with the current velocity) that decays to zero through a critically damped
 * curve over the channel group's settle time, so the output stays continuous in value and velocity.
 */
export class Inertializer {
  private off = new Float32Array(NCH);
  private vel = new Float32Array(NCH);
  private prevOut = new Float32Array(NCH);
  private prevOut2 = new Float32Array(NCH);
  private hasPrev = false;
  /** Largest live offset (debug overlay). */
  maxOffset = 0;
  /** Transitions triggered (debug overlay / tests). */
  count = 0;

  /**
   * Call before `apply` on the frame the source switches: `src` is the new source pose. The offset
   * starts at (last output - new source) and its velocity at the last output velocity.
   */
  trigger(src: Pose, dt: number): void {
    if (!this.hasPrev) return;
    this.count++;
    for (let i = 0; i < NCH; i++) {
      this.off[i] = this.prevOut[i]! - src[i]!;
      this.vel[i] = dt > 0 ? (this.prevOut[i]! - this.prevOut2[i]!) / dt : 0;
    }
  }

  /** out = src + decayed offset; remembers the output for the next trigger. */
  apply(src: Pose, out: Pose, dt: number): Pose {
    let mx = 0;
    for (let i = 0; i < NCH; i++) {
      let o = this.off[i]!;
      if (o !== 0 || this.vel[i] !== 0) {
        // critically damped decay (inlined: no tuple allocation in the per-frame loop)
        const omega = 9 / GROUP_OF[i]!;
        const e = Math.exp(-omega * dt);
        const v = this.vel[i]!;
        const t1 = (v + omega * o) * dt;
        const nx = (o + t1) * e;
        const nv = (v - omega * t1) * e;
        o = Math.abs(nx) < 1e-5 && Math.abs(nv) < 1e-4 ? 0 : nx;
        this.off[i] = o;
        this.vel[i] = o === 0 ? 0 : nv;
        mx = Math.max(mx, Math.abs(o));
      }
      out[i] = src[i]! + o;
    }
    this.maxOffset = mx;
    this.prevOut2.set(this.hasPrev ? this.prevOut : out);
    this.prevOut.set(out);
    this.hasPrev = true;
    return out;
  }

  reset(): void {
    this.off.fill(0);
    this.vel.fill(0);
    this.hasPrev = false;
  }
}
