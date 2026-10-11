/**
 * The level editor's radial menu (ED2 Part C3), pure: stick vector to slot with a dead zone and hysteresis, the menu
 * tree with submenus and a breadcrumb, hold timing (dwell to enter a submenu) and the last pick per ring.
 * Babylon- and DOM-free (tests/editor/editorPad.test.ts). The view (padControl.ts) draws what this says.
 */
import { hyp2 } from '../core/mathx';

export interface RadialNode {
  id: string;
  name: string;
  /** One line shown in the centre while highlighted. */
  desc?: string;
  children?: RadialNode[];
  /** Hidden slots are left out of the ring (parts not built yet). */
  hidden?: boolean;
}

export const DEADZONE = 0.35;
export const HYSTERESIS_DEG = 8;
/** Seconds a stick must rest on a submenu slot to enter it. */
export const DWELL = 0.25;

const TAU = Math.PI * 2;

/**
 * The slot a stick points at: 0 at the top, clockwise; -1 inside the dead zone. Stick y is +down (the Gamepad API).
 * Within `hyst` degrees past the edge of the previous slot, the previous slot is kept, so a border does not flicker.
 */
export function slotAt(x: number, y: number, n: number, prev = -1, dead = DEADZONE, hystDeg = HYSTERESIS_DEG): number {
  if (n <= 0 || hyp2(x, y) < dead) return -1;
  const a = (Math.atan2(x, -y) + TAU) % TAU;
  const w = TAU / n;
  if (prev >= 0 && prev < n) {
    let d = Math.abs(a - prev * w) % TAU;
    if (d > Math.PI) d = TAU - d;
    if (d <= w / 2 + (hystDeg * Math.PI) / 180) return prev;
  }
  return Math.round(a / w) % n;
}

export const visible = (ring: readonly RadialNode[]): RadialNode[] => ring.filter((n) => !n.hidden);

export interface RadialInput {
  /** Stick (or mouse offset scaled to the ring radius), y +down. */
  x: number;
  y: number;
  /** Seconds, any clock. */
  now: number;
  /** The open button (Y, or Space) is down. */
  held: boolean;
  /** A (or a click) pressed this frame. */
  a: boolean;
  /** B (or Esc) pressed this frame. */
  b: boolean;
}

export type RadialResult = { kind: 'pick'; node: RadialNode; path: string[] } | { kind: 'close' } | null;

/** One open radial menu: a stack of rings from the root. */
export class Radial {
  private stack: { node: RadialNode; ring: RadialNode[] }[] = [];
  /** Slot the stick points at now (-1: centred). */
  pointed = -1;
  private pointedAt = 0;
  /** After entering a submenu, dwell waits until the stick moves to another slot or recentres. */
  private dwellArmed = true;
  private dwellBlock = -1;
  /** The open button has been held since opening (release-to-pick still works). */
  private heldSinceOpen = true;
  /** Last picked slot per ring id, pre-highlighted next time. */
  readonly last = new Map<string, number>();

  constructor(private readonly root: RadialNode) {}

  get isOpen(): boolean {
    return this.stack.length > 0;
  }

  open(): void {
    this.stack = [{ node: this.root, ring: visible(this.root.children ?? []) }];
    this.pointed = -1;
    this.dwellArmed = true;
    this.heldSinceOpen = true;
  }

  close(): void {
    this.stack = [];
    this.pointed = -1;
  }

  /** The ring on screen. */
  get ring(): RadialNode[] {
    return this.stack[this.stack.length - 1]?.ring ?? [];
  }

  get ringId(): string {
    return this.stack[this.stack.length - 1]?.node.id ?? '';
  }

  /** "Build > Door". */
  get breadcrumb(): string[] {
    return this.stack.slice(1).map((s) => s.node.name);
  }

  /** The highlighted slot: where the stick points, else the ring's last pick. */
  get highlight(): number {
    if (this.pointed >= 0) return this.pointed;
    const l = this.last.get(this.ringId);
    return l !== undefined && l < this.ring.length ? l : -1;
  }

  private enter(i: number): void {
    const node = this.ring[i]!;
    this.last.set(this.ringId, i);
    this.stack.push({ node, ring: visible(node.children ?? []) });
    this.dwellArmed = false;
    this.dwellBlock = this.pointed;
    this.pointed = -1;
  }

  private act(i: number): RadialResult {
    const node = this.ring[i];
    if (!node) return null;
    if (node.children) {
      this.enter(i);
      return null;
    }
    this.last.set(this.ringId, i);
    const path = [...this.breadcrumb, node.name];
    this.close();
    return { kind: 'pick', node, path };
  }

  update(inp: RadialInput): RadialResult {
    if (!this.isOpen) return null;
    const p = slotAt(inp.x, inp.y, this.ring.length, this.pointed);
    if (p !== this.pointed) this.pointedAt = inp.now;
    this.pointed = p;
    if (!this.dwellArmed && (p < 0 || p !== this.dwellBlock)) this.dwellArmed = true;
    if (inp.b) {
      if (this.stack.length > 1) {
        this.stack.pop();
        this.pointed = -1;
        return null;
      }
      this.close();
      return { kind: 'close' };
    }
    if (inp.a) {
      const h = this.highlight;
      return h >= 0 ? this.act(h) : null;
    }
    if (this.heldSinceOpen && !inp.held) {
      this.heldSinceOpen = false;
      if (p >= 0) return this.act(p);
      if (this.stack.length === 1) {
        this.close();
        return { kind: 'close' };
      }
      return null; // in a submenu the menu stays open until a pick or B
    }
    const node = p >= 0 ? this.ring[p] : undefined;
    if (node?.children && this.dwellArmed && inp.now - this.pointedAt >= DWELL) this.enter(p);
    return null;
  }
}
