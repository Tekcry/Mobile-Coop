/**
 * (CT prototype F1a, G181) The selection wheel (pure, unit-tested): a ring of segments, the vision modes stacked at the
 * top, then the guns, then the mission kit gadgets, clockwise. Held open over the live game (no time slow), the right
 * stick / mouse moves a cursor, release picks the highlighted item; on the vision slot A / E steps the mode (carousel). Layout reference: docs/ct-prototype/WHEEL-REF.md.
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

/** Cursor length below which nothing is highlighted. */
export const WHEEL_DEAD = 0.35;

/** The ring: the vision slot at the top (index 0), the guns, then the gadgets (every one the kit has, an empty one dimmed). */
export function buildWheel(guns: readonly WheelGun[], gadgets: readonly WheelGadget[]): WheelSeg[] {
  const out: WheelSeg[] = [{ kind: 'vision' }];
  for (const g of guns) out.push({ kind: 'gun', ...g });
  for (const g of gadgets) out.push({ kind: 'gadget', ...g });
  return out;
}

/** Segment from a direction (x right, y up): 0 at the top, clockwise, `n` equal sectors; -1 inside the dead zone. */
export function segmentAt(x: number, y: number, n: number, dead = WHEEL_DEAD): number {
  if (n <= 0 || hyp2(x, y) < dead) return -1;
  const k = Math.round((Math.atan2(x, y) / (Math.PI * 2)) * n);
  return ((k % n) + n) % n;
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
  /** Highlighted segment (-1 none) and the vision slot's mode (the carousel: A / E steps it while the slot is lit). */
  seg = -1;
  mode: WheelVision = 'night';

  /** Open on the selected vision mode (the carousel starts there). */
  begin(mode: WheelVision = 'night'): void {
    this.open = true;
    this.cx = this.cy = 0;
    this.seg = -1;
    this.mode = mode;
  }

  /** (nv-pass slice 3) A / E on the lit vision slot steps the mode; true when it did (the press is the wheel's). */
  cycle(ring: readonly WheelSeg[]): boolean {
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

  /** Put the cursor straight on a stick position. */
  place(x: number, y: number): void {
    this.cx = x;
    this.cy = y;
    this.clamp();
  }

  /** Recompute the highlight for a ring of `n` segments. */
  update(n: number): void {
    this.seg = segmentAt(this.cx, this.cy, n);
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
