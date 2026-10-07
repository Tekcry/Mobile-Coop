/**
 * Hand-over-hand contact stepping (pure: no Babylon/DOM), unit-tested.
 *
 * Two limbs (left, right) hold contacts on a 1D axis (a ledge lip or pipe: metres along it; a ladder or
 * drainpipe: height). Each contact stays locked where it was gripped while the body moves; once a limb trails
 * too far from where it wants to be, it lets go and swings to a new grip ahead (one limb at a time, the
 * one that is worse off), landing on the axis's snap grid (rungs) if there is one. Locked contacts never
 * slide, so hands and feet stay put on rungs and lips (the < 1 cm contact bar).
 */

export interface GripLimb {
  /** Locked contact parameter (or the swing's landing spot while swinging). */
  at: number;
  /** Swing: from-parameter and progress 0..1 (< 0 = planted). */
  from: number;
  swing: number;
}

export interface GripConfig {
  /** Where each limb wants to be relative to the body parameter (left, right). */
  offL: number;
  offR: number;
  /** A planted limb lets go once it is this far from where it wants to be. */
  slack: number;
  /** Swing duration (s). */
  swingTime: number;
  /** Lead past the wanted spot when re-gripping while moving (fraction of slack, along the motion). */
  lead: number;
  /** Snap grid (rung spacing; 0 = continuous) and its origin. */
  grid: number;
  gridOrigin: number;
  /** Allowed range of grips. */
  min: number;
  max: number;
  /** The next limb may set off once the other is half way (a quick hand-over-hand); off = strictly one at a time
   *  (feet on rungs: two swinging legs would cross). */
  overlap?: boolean;
}

const snap = (v: number, c: GripConfig): number => {
  let x = c.grid > 0 ? c.gridOrigin + Math.round((v - c.gridOrigin) / c.grid) * c.grid : v;
  if (x < c.min) x = c.grid > 0 ? x + c.grid * Math.ceil((c.min - x) / c.grid) : c.min;
  if (x > c.max) x = c.grid > 0 ? x - c.grid * Math.ceil((x - c.max) / c.grid) : c.max;
  return x;
};

const smooth = (t: number): number => t * t * (3 - 2 * t);

export class GripStepper {
  readonly L: GripLimb = { at: 0, from: 0, swing: -1 };
  readonly R: GripLimb = { at: 0, from: 0, swing: -1 };
  /** Swings completed (cadence / audio). */
  steps = 0;

  constructor(public cfg: GripConfig) {}

  /** Grab at once at the wanted spots around `body` (snapped). */
  reset(body: number): void {
    this.L.at = snap(body + this.cfg.offL, this.cfg);
    this.R.at = snap(body + this.cfg.offR, this.cfg);
    this.L.swing = this.R.swing = -1;
    this.L.from = this.L.at;
    this.R.from = this.R.at;
  }

  /** Advance swings and start a new one if a planted limb trails too far. `vel` = body rate (sign = direction). */
  update(dt: number, body: number, vel: number): void {
    const c = this.cfg;
    for (let k = 0; k < 2; k++) {
      const g = k === 0 ? this.L : this.R;
      if (g.swing < 0) continue;
      g.swing += dt / c.swingTime;
      if (g.swing >= 1) {
        g.swing = -1;
        g.from = g.at;
        this.steps++;
      }
    }
    // one limb at a time, but the next may set off once the other is half way (a quick hand-over-hand)
    for (let k = 0; k < 2; k++) {
      const g = k === 0 ? this.L : this.R;
      const o = k === 0 ? this.R : this.L;
      if (g.swing >= 0 || (o.swing >= 0 && (c.overlap === false || o.swing < 0.5))) continue;
      const off = k === 0 ? c.offL : c.offR;
      const e = body + off - g.at;
      const oe = body + (k === 0 ? c.offR : c.offL) - o.at;
      // the worse-off limb goes first
      if (Math.abs(e) < c.slack || (o.swing < 0 && Math.abs(oe) > Math.abs(e))) continue;
      const dir = Math.abs(vel) > 1e-3 ? Math.sign(vel) : Math.sign(e);
      const to = snap(body + off + dir * c.slack * c.lead, c);
      if (Math.abs(to - g.at) < 1e-6) continue;
      g.from = g.at;
      g.at = to;
      g.swing = 0;
      return;
    }
  }

  /** Current parameter of a limb (eased along its swing) and its lift 0..1 (peaks mid-swing). */
  pos(g: GripLimb): number {
    if (g.swing < 0) return g.at;
    return g.from + (g.at - g.from) * smooth(g.swing);
  }

  lift(g: GripLimb): number {
    return g.swing < 0 ? 0 : Math.sin(Math.PI * g.swing);
  }
}
