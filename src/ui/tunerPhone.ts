/**
 * (marlow-bays item 26, the M21 exception for the animation tuner and the Anim Studio only; the game stays desktop
 * only) The tuner on a phone, the pure part (no DOM, no Babylon; unit-tested in `tests/tunerPhone.test.ts`):
 * - which layout the panel takes from the viewport, the pointer and the last input (`tunerPhoneLayout`): a phone (a
 *   touch screen as the main pointer, `flags.phone`, and a short side of at most `PHONE_MAX_SIDE`) in landscape gets a
 *   side drawer on the right (height is scarce, width is not: she keeps the left of the screen), in portrait a bottom
 *   sheet (she keeps the top); anything else keeps the desktop layout untouched. (26b, Michael: "Smaller buttons, more
 *   compact. Adjust smaller with controller connected also") Two densities: touch (targets `TOUCH_TARGET`) and, with a
 *   pad the last input, pad (rows `PAD_ROW`, no touch minimum, narrower again);
 * - the touch camera's gesture classification (`TouchGesture`): a tap (no drag) picks a part, one finger dragged orbits,
 *   two fingers either pinch (zoom) or drag together (pan), decided once per two-finger gesture. Allocation-free.
 */

/** The panel's layout: the desktop dock (unchanged), the phone's side drawer (landscape) or bottom sheet (portrait). */
export type TunerLayoutMode = 'desktop' | 'drawer' | 'sheet';

/** (26b) The phone's touch target (CSS px): tabs, buttons, chips, sliders, steppers, body map joints, the playback bar. */
export const TOUCH_TARGET = 34;
/** (26b) The phone's row height with a pad the last input (nothing is tapped: no touch minimum). */
export const PAD_ROW = 26;
/** A viewport whose short side is longer than this is not a phone (a tablet keeps the desktop layout). */
export const PHONE_MAX_SIDE = 600;
/** The phone panel's text size (CSS px), touch and pad, independent of the S / M / L desktop sizes. */
export const PHONE_FONT = 13;
export const PHONE_PAD_FONT = 11;
/** The body map's scale on a phone (CSS px per map unit), touch and pad. */
export const PHONE_MAP_SCALE = 1.2;
export const PHONE_PAD_MAP_SCALE = 1;

export interface TunerPhoneLayout {
  mode: TunerLayoutMode;
  /** (26b) A phone with a pad the last input: the pad density. */
  pad: boolean;
  /** The panel's font size (px; 0 on desktop: `tunerScale` decides). */
  font: number;
  /** The smallest control (px): `TOUCH_TARGET` by touch, `PAD_ROW` by pad; 0 on desktop. */
  target: number;
  /** The drawer's width (px; 0 otherwise). The canvas gives it up beside the drawer. */
  width: number;
  /** The sheet's height (px; 0 otherwise). The canvas gives it up above the sheet. */
  height: number;
  /** The body map's scale (px per unit) and its hit radius (units; 0 on desktop and by pad: the map's own). */
  mapScale: number;
  mapHitR: number;
}

export function emptyPhoneLayout(): TunerPhoneLayout {
  return { mode: 'desktop', pad: false, font: 0, target: 0, width: 0, height: 0, mapScale: 0, mapHitR: 0 };
}

/** The hit radius (map units) that gives a `target` px circle at `scale` px per unit. */
export function phoneMapHitRadius(scale = PHONE_MAP_SCALE, target = TOUCH_TARGET): number {
  return Math.ceil((target / 2 / scale) * 10) / 10;
}

/**
 * The layout for a viewport (`vw` x `vh` CSS px), whether the device is a phone (a touch screen as the main pointer) and
 * whether a pad was the last input (`pad`). Touch: the drawer about 38% of the width, the sheet about 45% of the
 * height; pad: about 34% and 40%. No allocation with `out`.
 */
export function tunerPhoneLayout(vw: number, vh: number, phone: boolean, pad = false, out?: TunerPhoneLayout): TunerPhoneLayout {
  const o = out ?? emptyPhoneLayout();
  o.mode = 'desktop';
  o.pad = false;
  o.font = o.target = o.width = o.height = o.mapScale = o.mapHitR = 0;
  if (!phone || !(vw > 0) || !(vh > 0) || Math.min(vw, vh) > PHONE_MAX_SIDE) return o;
  o.pad = pad;
  o.font = pad ? PHONE_PAD_FONT : PHONE_FONT;
  o.target = pad ? PAD_ROW : TOUCH_TARGET;
  o.mapScale = pad ? PHONE_PAD_MAP_SCALE : PHONE_MAP_SCALE;
  o.mapHitR = pad ? 0 : phoneMapHitRadius(o.mapScale, o.target);
  if (vw >= vh) {
    o.mode = 'drawer';
    o.width = Math.round(Math.max(Math.min(pad ? 240 : 270, vw * 0.5), Math.min(vw * (pad ? 0.34 : 0.38), pad ? 360 : 400)));
  } else {
    o.mode = 'sheet';
    o.height = Math.round(Math.max(Math.min(pad ? 220 : 240, vh * 0.55), Math.min(vh * (pad ? 0.4 : 0.45), vh - 200)));
  }
  return o;
}

/**
 * The map part nearest a tap (map units), within `r`: index into the parallel arrays (`px`, `py`, `n` entries), -1 none.
 * The phone's map targets overlap (34 px circles on joints 10 units apart); the nearest centre wins, so every target is
 * at least its own half of the gap and the whole circle where nothing else is near.
 */
export function nearestMapPart(px: ArrayLike<number>, py: ArrayLike<number>, n: number, x: number, y: number, r: number): number {
  let best = -1;
  let bd = r * r;
  for (let i = 0; i < n; i++) {
    const dx = px[i]! - x;
    const dy = py[i]! - y;
    const d = dx * dx + dy * dy;
    if (d <= bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

// ------------------------------------------------------------------------------------------
// The touch camera
// ------------------------------------------------------------------------------------------

/** What a touch gesture is: waiting to be decided, one finger orbiting, two pinching or panning, or spent (a finger of
 *  two lifted: nothing more until every finger is up, so the one left never jumps into an orbit). */
export type GestureKind = 'none' | 'pending' | 'orbit' | 'pending2' | 'pinch' | 'pan' | 'done';

export const GESTURE = {
  /** A finger moved this far (px) is a drag, not a tap. */
  tapSlop: 10,
  /** A tap is released within this (ms). */
  tapMs: 450,
  /** Two fingers: the spread change or the shared travel (px) that decides pinch or pan. */
  twoSlop: 12,
  /** Two fingers: a finger moved less than this (px) is still (waiting for it, or the pivot of a pinch). */
  stillPx: 3,
  /** One-finger orbit (rad per px). */
  orbitRadPerPx: 0.006,
} as const;

/**
 * One touch gesture on the scene (pointer ids, CSS px, ms). The panel feeds the canvas's touch pointers; each `move`
 * returns the kind it produced and fills the deltas: `dx`, `dy` (orbit, px), `zoom` (pinch: the log of the spread ratio,
 * + = fingers apart = in), `px`, `py` (pan: the two fingers' shared travel, px). `up` returns true for a tap (one finger,
 * never two, under `tapSlop` and `tapMs`; `tapX`, `tapY` where). No allocation.
 */
export class TouchGesture {
  kind: GestureKind = 'none';
  dx = 0;
  dy = 0;
  zoom = 0;
  px = 0;
  py = 0;
  tapX = 0;
  tapY = 0;
  private idA = -1;
  private idB = -1;
  private ax = 0;
  private ay = 0;
  private bx = 0;
  private by = 0;
  private sx = 0;
  private sy = 0;
  private t0 = 0;
  /** Two fingers: each finger's start, the start centroid and spread, the last spread. */
  private ax0 = 0;
  private ay0 = 0;
  private bx0 = 0;
  private by0 = 0;
  private cx0 = 0;
  private cy0 = 0;
  private d0 = 0;
  private dLast = 0;

  /** The number of fingers down. */
  get count(): number {
    return (this.idA >= 0 ? 1 : 0) + (this.idB >= 0 ? 1 : 0);
  }

  /** A finger went down. A third finger is ignored. */
  down(id: number, x: number, y: number, t: number): void {
    if (id === this.idA || id === this.idB) return;
    if (this.idA < 0 && this.idB < 0) {
      this.idA = id;
      this.ax = this.sx = x;
      this.ay = this.sy = y;
      this.t0 = t;
      this.kind = 'pending';
      return;
    }
    if (this.idB >= 0 && this.idA >= 0) return;
    if (this.idA < 0) {
      this.idA = id;
      this.ax = x;
      this.ay = y;
    } else {
      this.idB = id;
      this.bx = x;
      this.by = y;
    }
    // a second finger: a two-finger gesture (from an orbit too); after a spent gesture it stays spent
    if (this.kind === 'done') return;
    this.kind = 'pending2';
    this.ax0 = this.ax;
    this.ay0 = this.ay;
    this.bx0 = this.bx;
    this.by0 = this.by;
    this.cx0 = (this.ax + this.bx) * 0.5;
    this.cy0 = (this.ay + this.by) * 0.5;
    this.d0 = this.dLast = Math.sqrt((this.ax - this.bx) * (this.ax - this.bx) + (this.ay - this.by) * (this.ay - this.by));
  }

  /** A finger moved: the kind this move produced ('none' when it moved nothing) with the deltas filled. */
  move(id: number, x: number, y: number): GestureKind {
    this.dx = this.dy = this.zoom = this.px = this.py = 0;
    let lx: number;
    let ly: number;
    if (id === this.idA) {
      lx = this.ax;
      ly = this.ay;
      this.ax = x;
      this.ay = y;
    } else if (id === this.idB) {
      lx = this.bx;
      ly = this.by;
      this.bx = x;
      this.by = y;
    } else return 'none';
    const k = this.kind;
    if (k === 'pending' || k === 'orbit') {
      if (k === 'pending') {
        const tx = x - this.sx;
        const ty = y - this.sy;
        if (tx * tx + ty * ty <= GESTURE.tapSlop * GESTURE.tapSlop) return 'none';
        // past the slop: the orbit takes the whole way from the press (no lost start)
        this.kind = 'orbit';
        this.dx = tx;
        this.dy = ty;
        return 'orbit';
      }
      this.dx = x - lx;
      this.dy = y - ly;
      return 'orbit';
    }
    if (k !== 'pending2' && k !== 'pinch' && k !== 'pan') return 'none';
    if (this.idA < 0 || this.idB < 0) return 'none';
    const ddx = this.ax - this.bx;
    const ddy = this.ay - this.by;
    const d = Math.sqrt(ddx * ddx + ddy * ddy);
    if (k === 'pending2') {
      // pointer events come one finger at a time: decided once both fingers moved (the same way: a pan; opposite: a
      // pinch), or one moved far while the other stayed (a pinch about the still finger)
      const vax = this.ax - this.ax0;
      const vay = this.ay - this.ay0;
      const vbx = this.bx - this.bx0;
      const vby = this.by - this.by0;
      const ma = Math.sqrt(vax * vax + vay * vay);
      const mb = Math.sqrt(vbx * vbx + vby * vby);
      const hi = Math.max(ma, mb);
      const lo = Math.min(ma, mb);
      if (hi <= GESTURE.twoSlop) return 'none';
      if (lo < GESTURE.stillPx && hi <= 2 * GESTURE.twoSlop) return 'none';
      const cx = (this.ax + this.bx) * 0.5 - this.cx0;
      const cy = (this.ay + this.by) * 0.5 - this.cy0;
      if ((lo < GESTURE.stillPx || vax * vbx + vay * vby <= 0) && this.d0 > 1 && d > 1) {
        this.kind = 'pinch';
        this.zoom = Math.log(d / this.d0);
      } else {
        this.kind = 'pan';
        this.px = cx;
        this.py = cy;
      }
      this.dLast = d;
      return this.kind;
    }
    if (k === 'pinch') {
      if (this.dLast > 1 && d > 1) this.zoom = Math.log(d / this.dLast);
      this.dLast = d;
      return 'pinch';
    }
    // pan: one finger's move is half the centroid's
    this.px = (x - lx) * 0.5;
    this.py = (y - ly) * 0.5;
    return 'pan';
  }

  /** A finger lifted (or was cancelled: `tap` false). True when it ends a tap. */
  up(id: number, x: number, y: number, t: number, tap = true): boolean {
    if (id !== this.idA && id !== this.idB) return false;
    if (id === this.idA) this.idA = -1;
    else this.idB = -1;
    const was = this.kind;
    if (this.count === 0) {
      this.kind = 'none';
      if (!tap || was !== 'pending' || t - this.t0 > GESTURE.tapMs) return false;
      const tx = x - this.sx;
      const ty = y - this.sy;
      if (tx * tx + ty * ty > GESTURE.tapSlop * GESTURE.tapSlop) return false;
      this.tapX = x;
      this.tapY = y;
      return true;
    }
    // one of two lifted: spent until every finger is up
    this.kind = 'done';
    return false;
  }

  /** Every finger gone (the panel closed, the page hidden). */
  reset(): void {
    this.idA = this.idB = -1;
    this.kind = 'none';
    this.dx = this.dy = this.zoom = this.px = this.py = 0;
  }
}
