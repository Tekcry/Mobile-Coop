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

/**
 * (T5b2) A jump between two states longer than `SNAP_MIN` metres is a teleport (bay start, checkpoint reset, respawn)
 * when it is faster than `SNAP_SPEED` m/s, or when it crosses a gap of more than `SNAP_GAP` s (a stalled sender) and
 * lands further from where the velocity before the gap (v) would have carried the partner than max(`SNAP_MIN`,
 * sqrt(2) * |v| * gap): the most a partner at that speed can deviate by turning up to 90 degrees during the gap. A
 * standing partner (v 0) teleported after a pause snaps; a runner who turns a corner during a stall runs on smoothly
 * (a moving partner teleported during a stall slides instead). The sample holds the old
 * spot until the new state's time, then shows the new one, instead of sliding through every point between (which
 * dragged a partner's blocker through other players).
 */
export const SNAP_MIN = 2;
export const SNAP_SPEED = 25;
export const SNAP_GAP = 0.3;

/**
 * `p` / `pt` is the state before `a` (or null): its velocity into `a` predicts `b` across a gap. A pre-gap pair that
 * was itself a fast jump predicts no motion. Allocation-free.
 */
function isJump(p: Pose | null, pt: number, a: Pose, at: number, b: Pose, span: number): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 <= SNAP_MIN * SNAP_MIN) return false;
  const v = SNAP_SPEED * span;
  if (d2 > v * v) return true;
  if (span <= SNAP_GAP) return false;
  let ex = dx;
  let ey = dy;
  let ez = dz;
  let lim2 = SNAP_MIN * SNAP_MIN;
  if (p) {
    const ps = Math.max(1e-6, at - pt);
    const vx = (a.x - p.x) / ps;
    const vy = (a.y - p.y) / ps;
    const vz = (a.z - p.z) / ps;
    const v2 = vx * vx + vy * vy + vz * vz;
    if (v2 <= SNAP_SPEED * SNAP_SPEED) {
      ex -= vx * span;
      ey -= vy * span;
      ez -= vz * span;
      // a turn of up to 90 degrees during the gap deviates at most sqrt(2) * |v| * span from the straight line
      const turn2 = 2 * v2 * span * span;
      if (turn2 > lim2) lim2 = turn2;
    }
  }
  return ex * ex + ey * ey + ez * ez > lim2;
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
      if (t >= a.t && t <= b.t) {
        const span = Math.max(1e-6, b.t - a.t);
        const k = (t - a.t) / span;
        const p = i > 1 ? this.buf[i - 2]! : null;
        const jump = isJump(p ? p.s : null, p ? p.t : 0, a.s, a.t, b.s, span);
        return set(o, a.s, b.s, jump ? (k >= 1 ? 1 : 0) : k);
      }
    }
    // past the newest: extrapolate from the last two, clamped
    const a = this.buf[n - 2]!;
    const b = this.buf[n - 1]!;
    const over = Math.min(t - b.t, this.maxExtrapolate);
    const span = Math.max(1e-6, b.t - a.t);
    const p = n > 2 ? this.buf[n - 3]! : null;
    set(o, a.s, b.s, isJump(p ? p.s : null, p ? p.t : 0, a.s, a.t, b.s, span) ? 1 : 1 + over / span);
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
