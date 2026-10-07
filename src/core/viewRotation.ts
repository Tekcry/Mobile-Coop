/**
 * Forced landscape (3.1.6). iOS browsers cannot lock the orientation, so a touch device held upright gets the page
 * turned 90 degrees clockwise (`body.rotated`, styles.css) instead of a "rotate your device" screen: hold the phone
 * turned left. Layout, the canvas and the DOM work in the turned (landscape) space; pointer positions and bounding
 * boxes arrive in screen space - `vx` / `vy` / `viewRect` map them in.
 */
let rotated = false;

/** The page is turned (a touch device held upright). */
export function isRotated(): boolean {
  return rotated;
}

/** A pointer's x / y in the page's (landscape) space. */
export function vx(e: { clientX: number; clientY: number }): number {
  return rotated ? e.clientY : e.clientX;
}
export function vy(e: { clientX: number; clientY: number }): number {
  return rotated ? window.innerWidth - e.clientX : e.clientY;
}

/** The page's width / height as laid out (the window's, swapped while turned). */
export function viewWidth(): number {
  return rotated ? window.innerHeight : window.innerWidth;
}
export function viewHeight(): number {
  return rotated ? window.innerWidth : window.innerHeight;
}

export interface ViewRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/** An element's box in the page's space (getBoundingClientRect is the screen's). */
export function viewRect(el: Element): ViewRect {
  const r = el.getBoundingClientRect();
  if (!rotated) return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  const left = r.top;
  const top = window.innerWidth - r.right;
  return { left, top, width: r.height, height: r.width, right: left + r.height, bottom: top + r.width };
}

/** Pure: whether to turn the page - a coarse pointer (touch) in a portrait window. */
export function wantsRotation(portrait: boolean, coarse: boolean): boolean {
  return portrait && coarse;
}

/**
 * Turn the page while a touch device is held upright; `onChange` after each change (resize the engine, re-measure).
 * Called before anything else listens to `resize`, so the page is turned before they measure.
 */
export function setupForcedLandscape(onChange: () => void): void {
  const coarse = window.matchMedia('(pointer: coarse)');
  const apply = (): void => {
    const on = wantsRotation(window.innerHeight > window.innerWidth, coarse.matches);
    const s = document.documentElement.style;
    s.setProperty('--scr-w', `${window.innerWidth}px`);
    s.setProperty('--scr-h', `${window.innerHeight}px`);
    if (on === rotated) return;
    rotated = on;
    document.body.classList.toggle('rotated', on);
    onChange();
  };
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', () => setTimeout(apply, 100));
  apply();
}
