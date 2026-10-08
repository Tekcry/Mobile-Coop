/** Snapshot interpolation + clock sync. Pure (no Babylon/DOM). */

export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export interface Sampled<T> extends Pose {
  /** The newest state at or before the sample time (discrete fields come from here). */
  state: T;
  /** The states either side of the sample and the blend between them (extra continuous fields). */
  from: T;
  to: T;
  k: number;
}

/**
 * Time-ordered state buffer. `sample(t)` interpolates between the two states around `t`,
 * holds the oldest before the buffer, and extrapolates at most `maxExtrapolate` past the newest.
 */
export class SnapshotBuffer<T extends Pose> {
  private buf: { t: number; s: T }[] = [];
  private out: Sampled<T> | null = null;

  constructor(
    private cap = 30,
    private maxExtrapolate = 0.2,
  ) {}

  get size(): number {
    return this.buf.length;
  }

  push(t: number, s: T): void {
    const last = this.buf[this.buf.length - 1];
    if (last && t <= last.t) return; // drop out-of-order / duplicate
    this.buf.push({ t, s });
    if (this.buf.length > this.cap) this.buf.shift();
  }

  latest(): T | undefined {
    return this.buf[this.buf.length - 1]?.s;
  }

  latestTime(): number {
    return this.buf[this.buf.length - 1]?.t ?? -Infinity;
  }

  sample(t: number): Sampled<T> | null {
    const n = this.buf.length;
    if (!n) return null;
    const o = (this.out ??= { x: 0, y: 0, z: 0, yaw: 0, state: this.buf[0]!.s, from: this.buf[0]!.s, to: this.buf[0]!.s, k: 0 });
    const first = this.buf[0]!;
    if (n === 1 || t <= first.t) {
      return set(o, first.s, first.s, 0);
    }
    for (let i = n - 1; i > 0; i--) {
      const a = this.buf[i - 1]!;
      const b = this.buf[i]!;
      if (t >= a.t && t <= b.t) return set(o, a.s, b.s, (t - a.t) / Math.max(1e-6, b.t - a.t));
    }
    // past the newest: extrapolate from the last two, clamped
    const a = this.buf[n - 2]!;
    const b = this.buf[n - 1]!;
    const over = Math.min(t - b.t, this.maxExtrapolate);
    const span = Math.max(1e-6, b.t - a.t);
    set(o, a.s, b.s, 1 + over / span);
    o.state = b.s;
    return o;
  }
}

function set<T extends Pose>(o: Sampled<T>, a: T, b: T, k: number): Sampled<T> {
  o.x = a.x + (b.x - a.x) * k;
  o.y = a.y + (b.y - a.y) * k;
  o.z = a.z + (b.z - a.z) * k;
  o.yaw = lerpAngle(a.yaw, b.yaw, k);
  o.state = k >= 1 ? b : a;
  o.from = a;
  o.to = b;
  o.k = k;
  return o;
}

/**
 * Estimates the remote (host) clock from snapshot timestamps. Faster-than-expected packets pull the
 * estimate forward quickly; slower ones nudge it back gently, so jitter does not cause stutter.
 */
export class ClockSync {
  private offset: number | null = null;

  observe(remoteTime: number, localTime: number): void {
    const o = remoteTime - localTime;
    if (this.offset === null || Math.abs(o - this.offset) > 2) this.offset = o;
    else this.offset += (o - this.offset) * (o > this.offset ? 0.3 : 0.03);
  }

  get synced(): boolean {
    return this.offset !== null;
  }

  now(localTime: number): number {
    return localTime + (this.offset ?? 0);
  }
}
