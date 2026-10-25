/**
 * (wheel-ui) Pure sizing for the selection wheel (no DOM, no Babylon). All values are CSS px inside the safe-area box
 * the wheel lives in (origin at its top left).
 */

export interface WheelFit {
  /** The safe-area box. */
  w: number;
  h: number;
  /** Height taken at the top (the top HUD: area label, objective), measured from the box top. */
  top: number;
  /** The hint box size (its text is set before the layout runs). */
  hintW: number;
  hintH: number;
}

export interface WheelLayout {
  /** Wheel diameter, centre. */
  d: number;
  cx: number;
  cy: number;
  /** Hint box top left; below = under the wheel (narrow screens), else at the left of it. */
  hintX: number;
  hintY: number;
  below: boolean;
}

/** Wanted diameter for a box height: 518 px at 1080 (was a 420 px ring with ~430 px of tiles), 270 px at 390. */
export function wheelWant(h: number): number {
  return 130 + 0.36 * h;
}

/** Room kept free along the bottom edge for the FPS banner (`.debug-overlay.compact`, bottom left). */
export const BOTTOM_BAND = 24;

/** Margin from the box edges and between the wheel and the hint / top HUD. */
export function wheelMargin(h: number): number {
  return Math.max(8, 0.02 * h);
}

/**
 * The wheel stays centred on the box; it shrinks so it never reaches the top HUD band, the box edges or the hint box.
 * The hint sits left of the wheel when there is room beside it, else centred under it (which costs height).
 * Writes into `out` (no allocation).
 */
export function fitWheel(f: WheelFit, out: WheelLayout): WheelLayout {
  const m = wheelMargin(f.h);
  const b = Math.max(m, BOTTOM_BAND);
  const want = wheelWant(f.h);
  const cx = f.w / 2;
  const cy = f.h / 2;
  const topR = Math.max(0, f.top) + m;
  // beside: the hint to the left, only the top band and the bottom edge limit the height
  let d = Math.min(want, 2 * (cy - Math.max(topR, m)), f.w - 2 * m);
  const below = (f.w - d) / 2 < f.hintW + 2 * m;
  if (below) d = Math.min(want, 2 * (cy - Math.max(topR, f.hintH + m + b)), f.w - 2 * m);
  d = Math.max(0, Math.floor(d));
  out.d = d;
  out.cx = cx;
  out.cy = cy;
  out.below = below;
  if (below) {
    out.hintX = Math.max(m, cx - f.hintW / 2);
    out.hintY = f.h - b - f.hintH;
  } else {
    out.hintX = m;
    out.hintY = Math.min(f.h - b - f.hintH, cy + d * 0.25);
  }
  return out;
}

/** SVG path of a ring sector (annulus slice) centred on 0,0; angles in radians, 0 = up, clockwise. */
export function sectorPath(r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number): string => `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)}A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
}
