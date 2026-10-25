/**
 * (CT prototype F1a, G181) The selection wheel (pure, unit-tested): a ring of segments, the vision modes stacked at the
 * top, then the guns, then the mission kit gadgets, clockwise. Held open over the live game (no time slow), the right
 * stick / mouse moves a cursor, release picks the highlighted item; on the vision slot A / E steps the mode (carousel).
 * (sector-fixes W) The vision slot is the default: lit on open and whenever the cursor is back in the centre. Layout reference: docs/ct-prototype/WHEEL-REF.md.
 * Babylon-free; the DOM lives in `ui/hud/gadgetWheel.ts`, the open / close and the picks in `gadgetSystem.ts`.
 */
import { hyp2 } from '../core/mathx';
import type { GadgetId } from './gadgets';
import { VISION_WHEEL, type VisionMode } from './vision';

export type WheelVision = Exclude<VisionMode, 'off'>;

export interface WheelGun {
  index: number;
  name: string;
  /** Rounds in the magazine / in reserve. */
  loaded: number;
  reserve: number;
}

export interface WheelGadget {
  id: GadgetId;
  name: string;
  count: number;
}

export type WheelSeg =
  | { kind: 'vision' }
  | ({ kind: 'gun' } & WheelGun)
  | ({ kind: 'gadget' } & WheelGadget);

export type WheelPick =
  | { kind: 'vision'; mode: WheelVision }
  | { kind: 'gun'; index: number }
  | { kind: 'gadget'; id: GadgetId };

/** Cursor length below which no direction is read (the cursor is back on the vision slot, sector-fixes W). */
export const WHEEL_DEAD = 0.35;
/** (sector-fixes W, Michael item 8) The default slot: the goggles / vision slot, lit when the wheel opens and whenever
 *  the cursor is back in the dead zone (stick let go), so hold LB + A cycles the vision modes with no stick. */
export const WHEEL_HOME = 0;
/** (sector-fixes W) Pad let-go grace (s): a stick back in the dead zone keeps its slot lit this long before the vision
 *  slot, so a stick and LB let go together still pick the slot (a spring stick reaches the centre a frame or two before
 *  the finger leaves LB). Too short to read as a held pick; 0 turns it off. A / E with the stick centred skips it. */
export const WHEEL_LETGO_S = 0.08;

/** The ring: the vision slot at the top (index 0), the guns, then the gadgets (every one the kit has, an empty one dimmed). */
export function buildWheel(guns: readonly WheelGun[], gadgets: readonly WheelGadget[]): WheelSeg[] {
  const out: WheelSeg[] = [{ kind: 'vision' }];
  for (const g of guns) out.push({ kind: 'gun', ...g });
  for (const g of gadgets) out.push({ kind: 'gadget', ...g });
  return out;
}

/** (player-hygiene S4) Refresh the gun at ring slot `at` in place: false when that slot is not this gun (index and
 *  name), so the caller rebuilds. */
export function setWheelGun(ring: WheelSeg[], at: number, index: number, name: string, loaded: number, reserve: number): boolean {
  const s = ring[at];
  if (!s || s.kind !== 'gun' || s.index !== index || s.name !== name) return false;
  s.loaded = loaded;
  s.reserve = reserve;
  return true;
}

/** (player-hygiene S4) The same for a gadget slot (id and name; the count changes in place). */
export function setWheelGadget(ring: WheelSeg[], at: number, id: GadgetId, name: string, count: number): boolean {
  const s = ring[at];
  if (!s || s.kind !== 'gadget' || s.id !== id || s.name !== name) return false;
  s.count = count;
  return true;
}

/** Segment from a direction (x right, y up): 0 at the top, clockwise, `n` equal sectors; -1 inside the dead zone. */
export function segmentAt(x: number, y: number, n: number, dead = WHEEL_DEAD): number {
  if (n <= 0 || hyp2(x, y) < dead) return -1;
  const k = Math.round((Math.atan2(x, y) / (Math.PI * 2)) * n);
  return ((k % n) + n) % n;
}

/** (sector-fixes W) The lit segment for a cursor: its direction's segment, or the vision slot (`WHEEL_HOME`) inside the
 *  dead zone; the wheel never holds a previous pick. -1 only for an empty ring. */
export function wheelSegment(x: number, y: number, n: number): number {
  if (n <= 0) return -1;
  const s = segmentAt(x, y, n);
  return s < 0 ? WHEEL_HOME : s;
}

/** (nv-pass slice 3) The carousel's next mode: night -> thermal -> electro -> night (the stack's order, G181). */
export function nextVision(m: WheelVision): WheelVision {
  const i = VISION_WHEEL.indexOf(m);
  return VISION_WHEEL[(i + 1) % VISION_WHEEL.length] ?? 'night';
}

/** The two label lines of a highlighted item (name, mode). */
export function wheelLabel(seg: WheelSeg | undefined, mode: WheelVision): [string, string] {
  if (!seg) return ['', ''];
  if (seg.kind === 'vision') return [mode === 'night' ? 'Night vision' : mode === 'thermal' ? 'Thermal vision' : 'Electro vision', 'Vision mode'];
  if (seg.kind === 'gun') return [seg.name, `Weapon ${seg.loaded} / ${seg.reserve}`];
  return [seg.name, `Gadget x${seg.count}`];
}

/** The wheel's cursor and highlight (one per player; no allocation per call). */
export class SelectionWheel {
  open = false;
  /** Cursor, x right / y up, length <= 1. */
  cx = 0;
  cy = 0;
  /** Highlighted segment (the vision slot by default; -1 only shut / empty) and the vision slot's mode (the carousel: A / E steps it while the slot is lit). */
  seg = -1;
  mode: WheelVision = 'night';
  /** Seconds the pad cursor has been in the dead zone (`settle`). */
  private idle = 0;

  /** Open on the selected vision mode (the carousel starts there), the vision slot lit (sector-fixes W). */
  begin(mode: WheelVision = 'night'): void {
    this.open = true;
    this.cx = this.cy = 0;
    this.seg = WHEEL_HOME;
    this.mode = mode;
    this.idle = WHEEL_LETGO_S;
  }

  /** (nv-pass slice 3) A / E on the lit vision slot steps the mode; true when it did (the press is the wheel's). */
  cycle(ring: readonly WheelSeg[]): boolean {
    // (sector-fixes W) the cursor in the centre is the vision slot now, even inside the pad's let-go grace
    if (ring.length > 0 && hyp2(this.cx, this.cy) < WHEEL_DEAD) this.seg = WHEEL_HOME;
    const s = this.seg >= 0 ? ring[this.seg] : undefined;
    if (s?.kind !== 'vision') return false;
    this.mode = nextVision(this.mode);
    return true;
  }

  end(): void {
    this.open = false;
  }

  private clamp(): void {
    const l = hyp2(this.cx, this.cy);
    if (l > 1) {
      this.cx /= l;
      this.cy /= l;
    }
  }

  /** Move the cursor by a look delta (radians; right stick or mouse). */
  look(dx: number, dy: number): void {
    this.cx += dx / 0.12;
    this.cy += dy / 0.12;
    this.clamp();
  }

  /** Put the cursor straight on a stick position (the pad drives it absolutely: let go = the centre = the vision slot). */
  place(x: number, y: number): void {
    this.cx = x;
    this.cy = y;
    this.clamp();
  }

  /** Recompute the highlight for a ring of `n` segments (the dead zone lights the vision slot, sector-fixes W). */
  update(n: number): void {
    this.seg = wheelSegment(this.cx, this.cy, n);
  }

  /** (sector-fixes W) The pad's highlight after `place`: the stick's segment, or back on the vision slot once the stick
   *  has stayed in the dead zone `WHEEL_LETGO_S` (no pick is held). */
  settle(n: number, dt: number): void {
    const s = segmentAt(this.cx, this.cy, n);
    if (s >= 0) {
      this.seg = s;
      this.idle = 0;
      return;
    }
    this.idle += dt;
    if (this.seg < 0 || this.idle >= WHEEL_LETGO_S) this.seg = wheelSegment(0, 0, n);
  }

  /** What release picks (null: nothing highlighted). */
  pick(ring: readonly WheelSeg[]): WheelPick | null {
    const s = this.seg >= 0 ? ring[this.seg] : undefined;
    if (!s) return null;
    if (s.kind === 'vision') return { kind: 'vision', mode: this.mode };
    if (s.kind === 'gun') return { kind: 'gun', index: s.index };
    return { kind: 'gadget', id: s.id };
  }
}
