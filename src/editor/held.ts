/**
 * Holding a selection (Michael's editor fix-up, 2026-10-14), pure: raising and lowering what is held (RT / LT, the
 * wheel, Page Up / Page Down), the Move / Resize mode (Y, T) with the corner opposite the dot fixed, and handles a
 * constant size on screen. Babylon- and DOM-free (tests/editor/held.test.ts); main.ts and padControl.ts feed it.
 */
import facts from '../../scripts/kestrel/facts.json';
import { snap } from './geometry';
import type { Coll, Pt, Rect } from './types';
import { ridgeResize } from './roofGeometry';
import type { RoofData } from './roofGeometry';

/** Feel numbers for holding (editor defaults; Michael tunes them after his pad test). */
export const HELD = {
  /** Metres a second at a full trigger. */
  RATE: 1.0,
  /** LB held (precision): this share of RATE. */
  FINE: 0.25,
  /** Keyboard: Page Up / Page Down one grid step; Shift this many metres. */
  BIG: 1,
  /** A trigger counts as pressed (for the one-off "Stays on its level" words) above this. */
  PRESS: 0.3,
} as const;

/** Handles keep this size on screen, pixels (facts render.handlePx). */
export const HANDLE_PX: number = facts.render.handlePx.value;

/** A handle's world size (metres) for a perspective camera `dist` metres away (vertical fov in radians, viewport height in px). */
export function handleWorld(px: number, fov: number, dist: number, viewH: number): number {
  if (viewH <= 0) return 0;
  return (px * 2 * dist * Math.tan(fov / 2)) / viewH;
}

/** A plan handle's size in SVG units (the viewBox fitted into the box with "meet"). */
export function planHandleUnits(px: number, vbW: number, vbH: number, cw: number, ch: number): number {
  const k = Math.min(cw / Math.max(vbW, 1e-9), ch / Math.max(vbH, 1e-9));
  return k > 0 ? px / k : px;
}

/** Trigger lift: the raw (unsnapped) lift after one frame; `fine` is LB held. */
export function liftStep(raw: number, rt: number, lt: number, dt: number, fine: boolean): number {
  return raw + (rt - lt) * HELD.RATE * (fine ? HELD.FINE : 1) * dt;
}

/** The lift as applied: snapped to the step (0.1 m). */
export const liftSnap = (raw: number, step: number): number => +snap(raw, step).toFixed(3);

const r3 = (v: number): number => +v.toFixed(3);

/** What has a height field the vertical move changes (rooms, walls and the rest stay on their level). */
export const LIFTS: readonly Coll[] = ['objects', 'lamps', 'signs', 'devices', 'exterior', 'openings', 'roofs'];
export const canLift = (c: Coll): boolean => LIFTS.includes(c);

type Any = Record<string, unknown>;
const xyz = (p: unknown): [number, number, number] => p as [number, number, number];

/** The element raised by `dy` metres (lowest 0 above the floor where a base is measured from the floor). */
export function liftElem<T>(coll: Coll, e: T, dy: number, wallH?: number): T {
  if (!dy) return e;
  const o = { ...(e as Any) };
  switch (coll) {
    case 'objects':
      o.y = r3(Math.max(0, (o.y as number) + dy));
      break;
    case 'signs':
      o.y = r3(Math.max(0, (o.y as number) + dy));
      break;
    case 'lamps': {
      const a = xyz(o.at);
      const y = r3(Math.max(0, a[1] + dy));
      o.at = [a[0], y, a[2]];
      if (o.b) {
        const b = xyz(o.b);
        o.b = [b[0], r3(Math.max(0, b[1] + dy)), b[2]];
      }
      break;
    }
    case 'devices':
      if (o.a && o.b) {
        const a = xyz(o.a);
        const b = xyz(o.b);
        const d = Math.max(-a[1], -b[1], dy);
        o.a = [a[0], r3(a[1] + d), a[2]];
        o.b = [b[0], r3(b[1] + d), b[2]];
      } else if (typeof o.y === 'number') o.y = r3(Math.max(0, o.y + dy));
      break;
    case 'exterior':
      o.y0 = r3((o.y0 as number) + dy);
      o.y1 = r3((o.y1 as number) + dy);
      break;
    case 'openings': {
      const h = o.h as number;
      const top = wallH ?? Infinity;
      o.sill = r3(Math.min(Math.max(0, (o.sill as number) + dy), Math.max(0, top - h)));
      break;
    }
    case 'roofs':
      o.base = r3(Math.max(0, (o.base as number) + dy));
      break;
    default:
      return e;
  }
  return o as T;
}

/** The height words the dot and the status line show while holding (null: no height field). */
export function heightWords(coll: Coll, e: unknown): string | null {
  const o = e as Any;
  const f = (v: number): string => `${r3(v)} m`;
  switch (coll) {
    case 'objects':
      return `base ${f(o.y as number)}, ${f(o.h as number)} high`;
    case 'signs':
      return `${f(o.y as number)} up`;
    case 'lamps':
      return `${f(xyz(o.at)[1])} up`;
    case 'devices':
      return o.a ? `${f(xyz(o.a)[1])} up` : typeof o.y === 'number' ? `${f(o.y)} up` : null;
    case 'exterior':
      return `${f(o.y0 as number)} to ${f(o.y1 as number)}`;
    case 'openings':
      return `sill ${f(o.sill as number)}, ${f(o.h as number)} high`;
    case 'roofs':
      return `base ${f(o.base as number)}`;
    case 'walls':
      return `${f(o.h as number)} high`;
    default:
      return null;
  }
}

/** Min sizes for Resize: objects one object grid step, wall and opening heights; the rest as their edge handles. */
export interface Mins {
  plan: number;
  h: number;
}

/** What grows taller in Resize (RT / LT): objects, walls, openings (to the wall top), exterior pieces. */
export const GROWS: readonly Coll[] = ['objects', 'walls', 'openings', 'exterior'];

/** The element `dh` metres taller (at least `min` high). */
export function growElem<T>(coll: Coll, e: T, dh: number, min: number, wallH?: number): T {
  if (!dh) return e;
  const o = { ...(e as Any) };
  switch (coll) {
    case 'objects':
    case 'walls':
      o.h = r3(Math.max(min, (o.h as number) + dh));
      break;
    case 'openings': {
      const room = (wallH ?? Infinity) - (o.sill as number);
      o.h = r3(Math.min(Math.max(min, (o.h as number) + dh), Math.max(min, room)));
      break;
    }
    case 'exterior':
      o.y1 = r3(Math.max((o.y0 as number) + min, (o.y1 as number) + dh));
      break;
    default:
      return e;
  }
  return o as T;
}

export type Corner = 'SW' | 'SE' | 'NW' | 'NE';
export const CORNERS: readonly string[] = ['SW', 'SE', 'NW', 'NE'];

/** A rect's corner point. */
export function cornerPt(r: Rect, c: Corner): Pt {
  return [c.endsWith('W') ? r[0] : r[2], c.startsWith('S') ? r[1] : r[3]];
}

/** The corner of a rect nearest (x, z). */
export function nearestCorner(r: Rect, x: number, z: number): Corner {
  const w = Math.abs(x - r[0]) <= Math.abs(x - r[2]) ? 'W' : 'E';
  const s = Math.abs(z - r[1]) <= Math.abs(z - r[3]) ? 'S' : 'N';
  return `${s}${w}` as Corner;
}

/**
 * Resize with the corner opposite `c` fixed: corner `c` goes to (x, z) (snapped to `g`), never closer than `min` to
 * the fixed corner on either axis (it does not flip over).
 */
export function cornerResize(r: Rect, c: Corner, x: number, z: number, g: number, min: number): Rect {
  const sx = snap(x, g);
  const sz = snap(z, g);
  const west = c.endsWith('W');
  const south = c.startsWith('S');
  const x0 = west ? Math.min(sx, r[2] - min) : r[0];
  const x1 = west ? r[2] : Math.max(sx, r[0] + min);
  const z0 = south ? Math.min(sz, r[3] - min) : r[1];
  const z1 = south ? r[3] : Math.max(sz, r[1] + min);
  return [r3(x0), r3(z0), r3(x1), r3(z1)];
}

/** The end of a segment nearest (x, z): 'a' or 'b'. */
export function nearestEnd(a: Pt, b: Pt, x: number, z: number): 'a' | 'b' {
  return (x - a[0]) ** 2 + (z - a[1]) ** 2 <= (x - b[0]) ** 2 + (z - b[1]) ** 2 ? 'a' : 'b';
}

/** Michael 2026-10-14: the top and bottom handles (centre of the top face and of the bottom face), in 3D only. */
export type VSide = 'top' | 'bot';
export const isVert = (h: string | null | undefined): h is VSide => h === 'top' || h === 'bot';
/**
 * What takes a top handle (its height, the bottom fixed) and a bottom one (its base or sill, the top fixed). A roof's top
 * handle is its ridge (not on a flat roof); a lamp's or a security device's single bottom handle is its mounting height
 * (they have no height to size: the whole fitting moves).
 */
export const VERT_TOP: readonly Coll[] = ['objects', 'walls', 'openings', 'exterior', 'signs', 'roofs'];
export const VERT_BOT: readonly Coll[] = ['objects', 'openings', 'exterior', 'signs', 'roofs', 'lamps', 'devices'];

/**
 * The element with its top moved by `dy` (the bottom stays) or its bottom moved by `dy` (the top stays), never under
 * `min` tall, a base never under the floor and an opening never over its wall's top (`wallH`). A roof's bottom is its
 * eaves (base): the whole roof goes up or down; its top is the ridge (`ridgeResize`: the pitch or the rise). A lamp's or
 * device's bottom is its mounting height (never under the floor).
 */
export function vertResize<T>(coll: Coll, e: T, side: VSide, dy: number, min: number, wallH?: number): T {
  if (!dy) return e;
  const o = { ...(e as Any) };
  const top = side === 'top';
  switch (coll) {
    case 'objects': {
      const y = o.y as number;
      const h = o.h as number;
      if (top) o.h = r3(Math.max(min, h + dy));
      else {
        const y1 = y + h;
        const y0 = Math.min(Math.max(0, y + dy), y1 - min);
        o.y = r3(Math.max(0, y0));
        o.h = r3(y1 - (o.y as number));
      }
      break;
    }
    case 'walls':
      if (!top) return e;
      o.h = r3(Math.max(min, (o.h as number) + dy));
      break;
    case 'openings': {
      const sill = o.sill as number;
      const h = o.h as number;
      // the head stays under the wall's top
      if (top) o.h = r3(Math.max(min, Math.min(h + dy, (wallH ?? Infinity) - sill)));
      else {
        const y1 = sill + h;
        o.sill = r3(Math.min(Math.max(0, sill + dy), y1 - min));
        o.h = r3(y1 - (o.sill as number));
      }
      break;
    }
    case 'exterior':
      if (top) o.y1 = r3(Math.max((o.y0 as number) + min, (o.y1 as number) + dy));
      else o.y0 = r3(Math.min((o.y1 as number) - min, (o.y0 as number) + dy));
      break;
    case 'signs': {
      const [w, h] = o.size as [number, number];
      const y0 = (o.y as number) - h / 2;
      const y1 = (o.y as number) + h / 2;
      const nb = top ? y0 : Math.min(y1 - min, Math.max(0, y0 + dy));
      const nt = top ? Math.max(y0 + min, y1 + dy) : y1;
      o.size = [w, r3(nt - nb)];
      o.y = r3((nt + nb) / 2);
      break;
    }
    case 'roofs':
      if (top) return ridgeResize(e as RoofData, dy) as T;
      o.base = r3(Math.max(0, (o.base as number) + dy));
      break;
    case 'lamps':
    case 'devices':
      return top ? e : liftElem(coll, e, dy);
    default:
      return e;
  }
  return o as T;
}
