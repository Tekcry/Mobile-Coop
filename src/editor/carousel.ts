/**
 * The tool type carousel (Michael 2026-10-14), pure: while a placing tool is in hand, the strip over the tool bar shows
 * the current type centred and highlighted with its neighbours in the same group either side, wrapping, as many as fit,
 * fading at the edges. D-pad left / right, [ and ], the wheel over it or a click change the type. Babylon- and DOM-free
 * (tests/editor/carousel.test.ts); padControl.ts draws it.
 */

/** One shown item: its index in the list and its place from the centre (negative: left). */
export interface CarSlot {
  i: number;
  off: number;
}

/** An index wrapped into 0..len-1. */
export const wrapIndex = (i: number, len: number): number => (len > 0 ? ((i % len) + len) % len : 0);

/** The most items a row of `avail` pixels takes (always odd, so the current one is centred; at least 1, at most `max`). */
export function carouselSlots(avail: number, itemW: number, gap: number, max: number): number {
  let n = Math.max(1, Math.floor((avail + gap) / (itemW + gap)));
  n = Math.min(n, max);
  return n % 2 ? n : Math.max(1, n - 1);
}

/**
 * The items shown for a list of `len` with `index` current in `slots` places: the current one at offset 0 and its
 * neighbours either side, wrapping. A short list shows each item once (never twice): `len` items, the current one
 * centred where `len` is odd, one place left of centre where it is even.
 */
export function carouselWindow(len: number, index: number, slots: number): CarSlot[] {
  if (len <= 0) return [];
  const n = Math.max(1, Math.min(slots, len));
  const left = Math.floor((n - 1) / 2);
  const right = n - 1 - left;
  const cur = wrapIndex(index, len);
  const out: CarSlot[] = [];
  for (let off = left ? -left : 0; off <= right; off++) out.push({ i: wrapIndex(cur + off, len), off });
  return out;
}

/** An item's opacity by its place: 1 at the centre, fading toward the edges (never below 0.25). */
export function carouselFade(off: number, half: number): number {
  if (!off || half <= 0) return 1;
  return Math.max(0.25, 1 - (0.6 * Math.abs(off)) / half);
}
