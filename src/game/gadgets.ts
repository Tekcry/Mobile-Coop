/**
 * Gadgets (pure), unit-tested: what each does and carries, the inventory and selection (the wheel), the
 * predicted throw arc.
 */
import { hyp2, hyp3 } from '../core/mathx';

/** `emp` is no longer carried (G152: the held pistol jammer replaced it); its code stays for the maps and tests that blast it. */
export type GadgetId = 'frag' | 'gas' | 'flash' | 'emp' | 'noise' | 'stickyCam' | 'mine';

/** Wheel order (clockwise from the top). */
export const GADGET_IDS: readonly GadgetId[] = ['frag', 'gas', 'flash', 'noise', 'stickyCam', 'mine'];

export interface GadgetDef {
  id: GadgetId;
  name: string;
  /** Carried at the start / at most. */
  carry: number;
  max: number;
  /** How it is used: thrown on the fuse (bounces), thrown to stick / land at the first hit, or placed at the feet. */
  use: 'throw' | 'stick' | 'place';
  /** Fuse (s) for thrown ones; effect radius (m); effect length (s). */
  fuse: number;
  radius: number;
  duration: number;
  /** Lethal (frag, mine) or not. */
  lethal: boolean;
  /** Icon colour (HUD, model accent). */
  color: string;
}

export const GADGETS: Record<GadgetId, GadgetDef> = {
  frag: { id: 'frag', name: 'Frag', carry: 2, max: 4, use: 'throw', fuse: 2.2, radius: 6, duration: 0, lethal: true, color: '#9bb06b' },
  gas: { id: 'gas', name: 'Sleeping gas', carry: 2, max: 4, use: 'throw', fuse: 1.4, radius: 3.6, duration: 6, lethal: false, color: '#9fd8b4' },
  flash: { id: 'flash', name: 'Flashbang', carry: 2, max: 4, use: 'throw', fuse: 1.4, radius: 9, duration: 4, lethal: false, color: '#f1f1f1' },
  emp: { id: 'emp', name: 'EMP (removed, G152)', carry: 0, max: 0, use: 'throw', fuse: 1.4, radius: 9, duration: 8, lethal: false, color: '#6fb6ff' },
  noise: { id: 'noise', name: 'Noisemaker', carry: 2, max: 4, use: 'stick', fuse: 0.6, radius: 13, duration: 6, lethal: false, color: '#ffcf5a' },
  stickyCam: { id: 'stickyCam', name: 'Sticky cam', carry: 2, max: 3, use: 'stick', fuse: 0, radius: 3.6, duration: 0, lethal: false, color: '#c47bff' },
  mine: { id: 'mine', name: 'Prox mine', carry: 1, max: 3, use: 'place', fuse: 0, radius: 5, duration: 0, lethal: true, color: '#ff6b5a' },
};

/** Carried gadgets and the selected one. */
export class GadgetInventory {
  readonly counts = {} as Record<GadgetId, number>;
  selected: GadgetId = 'frag';

  constructor(carry?: Partial<Record<GadgetId, number>>) {
    this.counts.emp = 0;
    for (const id of GADGET_IDS) this.counts[id] = carry?.[id] ?? GADGETS[id].carry;
  }

  get count(): number {
    return this.counts[this.selected];
  }

  select(id: GadgetId): void {
    this.selected = id;
  }

  /** Next / previous gadget that is carried (skips empty ones; stays put if none). */
  cycle(dir: 1 | -1): GadgetId {
    const n = GADGET_IDS.length;
    const k = GADGET_IDS.indexOf(this.selected);
    for (let i = 1; i <= n; i++) {
      const id = GADGET_IDS[(k + dir * i + n * 2) % n]!;
      if (this.counts[id] > 0) {
        this.selected = id;
        break;
      }
    }
    return this.selected;
  }

  /** Use one of the selected; false when out. */
  take(): boolean {
    if (this.counts[this.selected] <= 0) return false;
    this.counts[this.selected]--;
    return true;
  }

  add(id: GadgetId, n = 1): void {
    this.counts[id] = Math.min(GADGETS[id].max, this.counts[id] + n);
  }

  /** Back to the starting carry (tests and the e2e suites top the kit up with it). */
  restock(): void {
    for (const id of GADGET_IDS) this.counts[id] = Math.max(this.counts[id], GADGETS[id].carry);
  }
}

/** Wheel slot from a direction (x right, y up; length >= `dead`), or -1 inside the dead zone. */
export function wheelSlot(x: number, y: number, slots = GADGET_IDS.length, dead = 0.35): number {
  if (hyp2(x, y) < dead) return -1;
  // 0 at the top, clockwise
  const a = Math.atan2(x, y);
  const k = Math.round((a / (Math.PI * 2)) * slots);
  return ((k % slots) + slots) % slots;
}

/**
 * Predicted throw path: positions every `dt` s from `p` with velocity `v` under gravity `g` (m/s^2, positive
 * down), `n` points written into `out` (x, y, z triples). Returns the count written.
 */
export function predictArc(px: number, py: number, pz: number, vx: number, vy: number, vz: number, g: number, dt: number, n: number, out: Float32Array): number {
  const m = Math.min(n, Math.floor(out.length / 3));
  for (let i = 0; i < m; i++) {
    const t = i * dt;
    out[i * 3] = px + vx * t;
    out[i * 3 + 1] = py + vy * t - 0.5 * g * t * t;
    out[i * 3 + 2] = pz + vz * t;
  }
  return m;
}

/** Within a gadget effect's radius (3D). */
export function inRadius(cx: number, cy: number, cz: number, x: number, y: number, z: number, r: number): boolean {
  return hyp3(x - cx, y - cy, z - cz) <= r;
}
