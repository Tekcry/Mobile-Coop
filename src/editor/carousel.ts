/**
 * The tool type carousel (Michael 2026-10-14), pure: while a placing tool is in hand, one compact row over the tool's
 * place shows the current item centred and lit (full size, its whole name) with same-width neighbours either side,
 * smaller and greyed, wrapping, fading toward the ends. Items are families: entries of a catalogue that share a `series`
 * (troffer 600 x 300 and 1200 x 300) are one item with versions. D-pad left / right, [ and ], the wheel over it or a
 * click change the item; D-pad up / down, Shift+[ and Shift+], Shift+wheel the version (or the group where the item has
 * one version and the tool has groups). Babylon- and DOM-free (tests/editor/carousel.test.ts); padControl.ts draws it.
 */

/** One shown item: its index in the list and its place from the centre (negative: left). */
export interface CarSlot {
  i: number;
  off: number;
}

/** An index wrapped into 0..len-1. */
export const wrapIndex = (i: number, len: number): number => (len > 0 ? ((i % len) + len) % len : 0);

/**
 * The most items a row of `avail` pixels takes: the current one `selW` wide and the same number of `itemW` neighbours
 * either side (always odd, so the current one is centred; at least 1, at most `max`).
 */
export function carouselSlots(avail: number, itemW: number, gap: number, max: number, selW = itemW): number {
  const side = Math.max(0, Math.floor((avail - selW) / (2 * (itemW + gap))));
  let n = 1 + 2 * side;
  if (n > max) n = max % 2 ? max : max - 1;
  return Math.max(1, n);
}

/**
 * The items shown for a list of `len` with `index` current in `slots` places: the current one at offset 0 and as many
 * neighbours on the left as on the right, wrapping, so it is always centred. An odd short list shows each item once; an
 * even short list shows the item opposite the current one at both ends (it is next both ways round).
 */
export function carouselWindow(len: number, index: number, slots: number): CarSlot[] {
  if (len <= 0) return [];
  const fit = len % 2 ? len : len + 1;
  const n = Math.max(1, Math.min(slots % 2 ? slots : slots - 1, fit));
  const half = (n - 1) / 2;
  const cur = wrapIndex(index, len);
  const out: CarSlot[] = [];
  for (let off = half ? -half : 0; off <= half; off++) out.push({ i: wrapIndex(cur + off, len), off });
  return out;
}

/** An item's opacity by its place: 1 at the centre, 0.8 beside it, fading to 0.3 at the ends. */
export function carouselFade(off: number, half: number): number {
  const a = Math.abs(off);
  if (!a) return 1;
  if (half <= 1) return 0.8;
  return Math.max(0.3, +(0.8 - (0.5 * (a - 1)) / (half - 1)).toFixed(3));
}

/**
 * The families of a list by series key, in first-appearance order; each family's members are list indices in list
 * order. An entry with no key is a family of its own.
 */
export function carFamilies(keys: readonly (string | undefined)[]): number[][] {
  const out: number[][] = [];
  const at = new Map<string, number>();
  keys.forEach((k, i) => {
    const f = k === undefined ? undefined : at.get(k);
    if (f !== undefined) out[f]!.push(i);
    else {
      if (k !== undefined) at.set(k, out.length);
      out.push([i]);
    }
  });
  return out;
}

/** Where list index `index` sits: its family `f` and its version `v` in that family (the first family if absent). */
export function carWhere(fams: readonly (readonly number[])[], index: number): { f: number; v: number } {
  for (let f = 0; f < fams.length; f++) {
    const v = fams[f]!.indexOf(index);
    if (v >= 0) return { f, v };
  }
  return { f: 0, v: 0 };
}

/** The list index `dir` families on from `index` (its first version), wrapping. */
export function carNextFamily(fams: readonly (readonly number[])[], index: number, dir: number): number {
  if (!fams.length) return index;
  const { f } = carWhere(fams, index);
  return fams[wrapIndex(f + dir, fams.length)]![0]!;
}

/** The list index `dir` versions on from `index` in its family, wrapping (itself where the family has one version). */
export function carNextVersion(fams: readonly (readonly number[])[], index: number, dir: number): number {
  if (!fams.length) return index;
  const { f, v } = carWhere(fams, index);
  const m = fams[f]!;
  return m[wrapIndex(v + dir, m.length)]!;
}

/**
 * What D-pad up / down does on the carousel: the version where the current item has more than one, else the group where
 * the tool has groups, else nothing (the hint bar's word follows).
 */
export function carAxis(versions: number, groups: number): 'version' | 'group' | null {
  return versions > 1 ? 'version' : groups > 1 ? 'group' : null;
}
