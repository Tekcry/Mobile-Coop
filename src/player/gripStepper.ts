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
  /**
   * (ct-prototype D2b) Extra lead (s) at the body's speed: a re-grip lands `|vel| * leadTime` further ahead, so slow,
   * one-at-a-time reaches keep up with the body at speed while one taken as it stops lands no further than its spot.
   */
  leadTime?: number;
  /**
   * (ct-prototype D2b) Strict alternation while moving: once a limb lands, the other may set off as soon as it trails its
   * spot by this much (m), not only past the slack, so one-at-a-time reaches run back to back at speed instead of a
   * waiting limb drifting a whole reach past its spot. A limb ahead of its spot never steps while moving. Unset: off.
   */
  alternate?: number;
  /**
   * (traverse-fix) Limbs either side of the body (a ledge's hands): a re-grip never lands nearer than this (m) to the
   * other limb's grip, nor past it. At a lip's end the leading hand sits clamped at `max`; the trailing hand's lead put it
   * onto (or through) that hand. Unset: off (a ladder's and a drainpipe's hands pass each other by design).
   */
  minGap?: number;
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
  /** (ct-prototype D2b) The limb that set off last (0 left, 1 right, -1 none since the grab). */
  private last = -1;
  /** (ct-prototype D2b) With `alternate`: the limb on the first reach since the grab, which runs at twice the pace (-1: none). */
  private quick = -1;

  constructor(public cfg: GripConfig) {}

  /** Grab at once at the wanted spots around `body` (snapped). */
  reset(body: number): void {
    this.L.at = snap(body + this.cfg.offL, this.cfg);
    this.R.at = snap(body + this.cfg.offR, this.cfg);
    this.L.swing = this.R.swing = -1;
    this.last = -1;
    this.quick = -1;
    this.L.from = this.L.at;
    this.R.from = this.R.at;
  }

  /** Advance swings and start a new one if a planted limb trails too far. `vel` = body rate (sign = direction). */
  update(dt: number, body: number, vel: number, decide = true): void {
    const c = this.cfg;
    for (let k = 0; k < 2; k++) {
      const g = k === 0 ? this.L : this.R;
      if (g.swing < 0) continue;
      g.swing += dt / (k === this.quick ? c.swingTime * 0.5 : c.swingTime);
      if (g.swing >= 1) {
        g.swing = -1;
        if (k === this.quick) this.quick = -1;
        g.from = g.at;
        this.steps++;
      }
    }
    // (`decide` false: only finish the swings under way - a remote following the owner's grips)
    if (!decide) return;
    // one limb at a time, but the next may set off once the other is half way (a quick hand-over-hand)
    for (let k = 0; k < 2; k++) {
      const g = k === 0 ? this.L : this.R;
      const o = k === 0 ? this.R : this.L;
      if (g.swing >= 0 || (o.swing >= 0 && (c.overlap === false || o.swing < 0.5))) continue;
      const off = k === 0 ? c.offL : c.offR;
      const e = body + off - g.at;
      const oe = body + (k === 0 ? c.offR : c.offL) - o.at;
      const ooff = k === 0 ? c.offR : c.offL;
      if (c.alternate !== undefined && Math.abs(vel) > 1e-3) {
        // (ct-prototype D2b) alternation: after the other limb's reach it is this one's turn; otherwise past the slack
        if (e * vel <= 0) continue;
        const turn = o.swing < 0 && this.last === 1 - k;
        if (!turn) {
          if (Math.abs(e) < c.slack || (o.swing < 0 && oe * vel > 0 && Math.abs(oe) > Math.abs(e))) continue;
          if (o.swing < 0 && oe * vel > 0 && Math.abs(oe) >= c.slack && Math.abs(Math.abs(oe) - Math.abs(e)) < 1e-3 && off * ooff < 0 && (off - ooff) * vel > 0) continue;
        } else if (Math.abs(e) < c.alternate) continue;
        if (!this.start(g, k, body + off + Math.sign(vel) * (c.slack * c.lead + Math.abs(vel) * (c.leadTime ?? 0)))) continue;
        return;
      }
      // the worse-off limb goes first
      if (Math.abs(e) < c.slack || (o.swing < 0 && Math.abs(oe) > Math.abs(e))) continue;
      // (ct-prototype D2) a tie (both let go together, as at the start of a shimmy): the trailing limb goes first (the
      // leading one going first left the trailing hand to wait a whole reach, drifting under the body). Leading = its spot
      // is further along the motion than the other's. Only for limbs either side of the body (a ledge's hands): (fix r1)
      // a drainpipe's hands and feet (offsets of one sign) both counted as leading and never let go; ladders keep the old order)
      if (o.swing < 0 && Math.abs(oe) >= c.slack && Math.abs(Math.abs(oe) - Math.abs(e)) < 1e-3 && off * ooff < 0 && (off - ooff) * vel > 0) continue;
      const dir = Math.abs(vel) > 1e-3 ? Math.sign(vel) : Math.sign(e);
      if (!this.start(g, k, body + off + dir * (c.slack * c.lead + Math.abs(vel) * (c.leadTime ?? 0)))) continue;
      return;
    }
  }

  /** Sets a limb off towards `want` (snapped); false when that is where it already is. */
  private start(g: GripLimb, k: number, want: number): boolean {
    const c = this.cfg;
    let to = snap(want, c);
    const gap = c.minGap;
    const off = k === 0 ? c.offL : c.offR;
    const ooff = k === 0 ? c.offR : c.offL;
    if (gap !== undefined && off * ooff < 0) {
      // (traverse-fix) stay this limb's side of the other one's grip (its landing spot while it swings)
      const o = k === 0 ? this.R : this.L;
      const lim = off < ooff ? o.at - gap : o.at + gap;
      const kept = off < ooff ? Math.min(to, lim) : Math.max(to, lim);
      // pinned back behind where it is now (the other hand clamped at the lip's end): no reach, it stays put
      if ((kept - g.at) * (to - g.at) <= 0 || kept < c.min || kept > c.max) return false;
      to = kept;
    }
    if (Math.abs(to - g.at) < 1e-6) return false;
    g.from = g.at;
    g.at = to;
    g.swing = 0;
    // (ct-prototype D2b) the first reach from a standing grip is quick: the other hand waits half as long for its turn
    if (this.cfg.alternate !== undefined && this.last === -1) this.quick = k;
    this.last = k;
    return true;
  }

  /**
   * (3.2.0) Step onto given grips (a co-op remote: the owner's planted contacts once it is still): a planted
   * limb off its grip swings to it, one limb at a time. NaN leaves a limb alone.
   */
  settleTo(atL: number, atR: number): void {
    if (this.L.swing >= 0 || this.R.swing >= 0) return;
    for (let k = 0; k < 2; k++) {
      const g = k === 0 ? this.L : this.R;
      const to = k === 0 ? atL : atR;
      if (Number.isNaN(to) || Math.abs(to - g.at) < 0.01) continue;
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
