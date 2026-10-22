/**
 * (marlow-bays item 26; item 29 tuner v3) The tuner on a small screen, the pure part (no DOM, no Babylon; unit-tested in
 * `tests/tunerPhone.test.ts`):
 * - which layout the panel takes (`tunerPhoneLayout`), from the viewport size ONLY (item 29, Michael: "It should only
 *   adapt to different screen sizes"; never from touch or pointer detection, so a touchscreen laptop at desktop size
 *   keeps the dock): landscape with a short side of at most `PHONE_MAX_SIDE` gets a side drawer on the right (height is
 *   scarce, width is not: she keeps the left); portrait up to `SHEET_MAX_WIDTH` wide (phones, a portrait tablet: the dock
 *   would take most of the width) a bottom sheet (she keeps the top); anything else the desktop dock. One density per
 *   size, whatever the input (item 26b's pad density is gone: the input only changes the hint glyphs);
 * - the touch camera's gesture classification (`TouchGesture`): a tap (no drag) picks a part, one finger dragged orbits,
 *   two fingers either pinch (zoom) or drag together (pan), decided once per two-finger gesture. Allocation-free. It
 *   works in every layout.
 */

/** The panel's layout: the desktop dock, the side drawer (a short landscape screen) or the bottom sheet (portrait). */
export type TunerLayoutMode = 'desktop' | 'drawer' | 'sheet';

/** The small screen's smallest control (CSS px): tabs, buttons, sliders, steppers, the playback bar (touch-sized, compact). */
export const TOUCH_TARGET = 30;
/** Landscape with a short side longer than this keeps the dock (a landscape tablet, a laptop). */
export const PHONE_MAX_SIDE = 600;
/** Portrait up to this wide gets the bottom sheet (a phone, a portrait tablet such as an 820 x 1180 iPad). */
export const SHEET_MAX_WIDTH = 900;
/** The small screen's text size (CSS px) on a phone-sized screen; a larger sheet (a tablet) uses the desktop scale. */
export const PHONE_FONT = 12;

export interface TunerPhoneLayout {
  mode: TunerLayoutMode;
  /** The panel's font size (px; 0: `tunerScale` decides, as on desktop). */
  font: number;
  /** The smallest control (px; 0 on desktop). */
  target: number;
  /** The drawer's width (px; 0 otherwise). The canvas gives it up beside the drawer. */
  width: number;
  /** The sheet's height (px; 0 otherwise). The canvas gives it up above the sheet. */
  height: number;
}

export function emptyPhoneLayout(): TunerPhoneLayout {
  return { mode: 'desktop', font: 0, target: 0, width: 0, height: 0 };
}

/**
 * The layout for a viewport (`vw` x `vh` CSS px; the size alone decides). The drawer about 36% of the width (250-380
 * px), the sheet about 42% of the height (at least 200 px left above it). No allocation with `out`.
 */
export function tunerPhoneLayout(vw: number, vh: number, out?: TunerPhoneLayout): TunerPhoneLayout {
  const o = out ?? emptyPhoneLayout();
  o.mode = 'desktop';
  o.font = o.target = o.width = o.height = 0;
  if (!(vw > 0) || !(vh > 0)) return o;
  if (vw >= vh) {
    if (vh > PHONE_MAX_SIDE) return o;
    o.mode = 'drawer';
    o.width = Math.round(Math.max(Math.min(250, vw * 0.5), Math.min(vw * 0.36, 380)));
  } else {
    if (vw > SHEET_MAX_WIDTH) return o;
    o.mode = 'sheet';
    o.height = Math.round(Math.max(Math.min(220, vh * 0.55), Math.min(vh * 0.42, vh - 200)));
  }
  o.target = TOUCH_TARGET;
  // a phone-sized screen: compact text; a larger sheet (a tablet) keeps the desktop's scaled text
  o.font = Math.min(vw, vh) <= PHONE_MAX_SIDE ? PHONE_FONT : 0;
  return o;
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
