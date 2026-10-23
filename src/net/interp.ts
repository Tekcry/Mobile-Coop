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
/**
 * (afp AF6) How far (s) each end renders its remotes behind the newest state: two send intervals plus the jitter (typical:
 * 20 ms) and a frame. The host renders the joiner (20 Hz states: was 0.1, about one interval of margin, then up to 0.25 s
 * of extrapolation and a snap back); a joiner renders the host's world (15 Hz snapshots: was 0.12).
 */
export const HOST_INTERP_DELAY = 0.13;
export const CLIENT_INTERP_DELAY = 0.16;
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
  /** (afp AF6) Seconds between `from` and `to` (>= 1e-6) and past the newest state (0 inside the buffer); `jump`: the
   *  span is a teleport. */
  span: number;
  over: number;
  jump: boolean;
  /** (afp AF6) The velocity at the sample time (m/s, rad/s): each span's mean velocity sits at its middle and is blended
   *  linearly to the neighbouring span's middle (continuous; the span's own velocity steps at 15-20 Hz); 0 across a
   *  teleport. */
  vx: number;
  vy: number;
  vz: number;
  vyaw: number;
}

/**
 * Time-ordered state buffer. `sample(t)` interpolates between the two states around `t`,
 * holds the oldest before the buffer, and extrapolates at most `maxExtrapolate` past the newest.
 */
export class SnapshotBuffer<T extends Pose> {
  private buf: { t: number; s: T }[] = [];
  private out: Sampled<T> | null = null;
  /** (afp AF6) Scratch of `spanVel` (no allocation). */
  private sv = { x: 0, y: 0, z: 0, yaw: 0 };

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
    const o = (this.out ??= { x: 0, y: 0, z: 0, yaw: 0, state: this.buf[0]!.s, from: this.buf[0]!.s, to: this.buf[0]!.s, k: 0, span: 1e-6, over: 0, jump: false, vx: 0, vy: 0, vz: 0, vyaw: 0 });
    const first = this.buf[0]!;
    o.over = 0;
    o.jump = false;
    o.vx = o.vy = o.vz = o.vyaw = 0;
    if (n === 1 || t <= first.t) {
      o.span = 1e-6;
      if (n === 1 && t > first.t) o.over = Math.min(t - first.t, this.maxExtrapolate);
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
        o.span = span;
        o.jump = jump;
        if (!jump && this.spanVel(i)) {
          // from this span's middle toward the neighbouring span's middle on the sample's side
          const v = this.sv;
          o.vx = v.x;
          o.vy = v.y;
          o.vz = v.z;
          o.vyaw = v.yaw;
          const j = k < 0.5 ? i - 1 : i + 1;
          if (j >= 1 && j < n && this.spanVel(j)) {
            const w = k < 0.5 ? 0.5 - k : k - 0.5;
            o.vx += (v.x - o.vx) * w;
            o.vy += (v.y - o.vy) * w;
            o.vz += (v.z - o.vz) * w;
            o.vyaw += (v.yaw - o.vyaw) * w;
          }
        }
        return set(o, a.s, b.s, jump ? (k >= 1 ? 1 : 0) : k);
      }
    }
    // past the newest: extrapolate from the last two, clamped
    const a = this.buf[n - 2]!;
    const b = this.buf[n - 1]!;
    const over = Math.min(t - b.t, this.maxExtrapolate);
    const span = Math.max(1e-6, b.t - a.t);
    const p = n > 2 ? this.buf[n - 3]! : null;
    const jump = isJump(p ? p.s : null, p ? p.t : 0, a.s, a.t, b.s, span);
    o.span = span;
    o.over = over > 0 ? over : 0;
    o.jump = jump;
    if (!jump && this.spanVel(n - 1)) {
      o.vx = this.sv.x;
      o.vy = this.sv.y;
      o.vz = this.sv.z;
      o.vyaw = this.sv.yaw;
    }
    set(o, a.s, b.s, jump ? 1 : 1 + over / span);
    o.state = b.s;
    return o;
  }

  /** The mean velocity of the span into state `i` (i >= 1), into `sv`; false (zeroed) across a teleport. */
  private spanVel(i: number): boolean {
    const v = this.sv;
    const a = this.buf[i - 1]!;
    const b = this.buf[i]!;
    const span = Math.max(1e-6, b.t - a.t);
    const p = i > 1 ? this.buf[i - 2]! : null;
    if (isJump(p ? p.s : null, p ? p.t : 0, a.s, a.t, b.s, span)) {
      v.x = v.y = v.z = v.yaw = 0;
      return false;
    }
    v.x = (b.s.x - a.s.x) / span;
    v.y = (b.s.y - a.s.y) / span;
    v.z = (b.s.z - a.s.z) / span;
    v.yaw = lerpAngle(0, b.s.yaw - a.s.yaw, 1) / span;
    return true;
  }
}

/**
 * (afp AF6, the "jumpy" partner) Blends the shown pose back after an extrapolation instead of snapping it: past its
 * newest state the sample guesses ahead (up to the buffer's `maxExtrapolate`); the next state lands it somewhere else,
 * which one frame showed as a step. The step becomes an offset on the sample that decays over `tau` (s). A
 * teleport-sized step (`SNAP_MIN` or more) is not blended. Allocation-free.
 */
export const EXTRAP_BLEND_TAU = 0.12;
export class ExtrapBlend {
  ox = 0;
  oy = 0;
  oz = 0;
  oyaw = 0;
  private px = 0;
  private py = 0;
  private pz = 0;
  private pyaw = 0;
  private lastOver = 0;
  private on = false;

  constructor(private tau = EXTRAP_BLEND_TAU) {}

  reset(): void {
    this.ox = this.oy = this.oz = this.oyaw = 0;
    this.lastOver = 0;
    this.on = false;
  }

  /** The frame's sample, moved in place by the offset; its velocity carries the last shown pose on over `dt`. */
  apply(o: Pose & { over: number; jump: boolean; vx: number; vy: number; vz: number; vyaw: number }, dt: number): void {
    if (o.jump) this.ox = this.oy = this.oz = this.oyaw = 0;
    else if (this.on && this.lastOver > 0 && o.over < this.lastOver) {
      // a new state arrived while extrapolating: the shown pose goes on from where it was
      const ex = this.px + o.vx * dt - o.x;
      const ey = this.py + o.vy * dt - o.y;
      const ez = this.pz + o.vz * dt - o.z;
      if (ex * ex + ey * ey + ez * ez < SNAP_MIN * SNAP_MIN) {
        this.ox = ex;
        this.oy = ey;
        this.oz = ez;
        this.oyaw = lerpAngle(0, this.pyaw + o.vyaw * dt - o.yaw, 1);
      }
    }
    this.lastOver = o.over;
    const k = dt > 0 ? Math.exp(-dt / this.tau) : 1;
    this.ox *= k;
    this.oy *= k;
    this.oz *= k;
    this.oyaw *= k;
    o.x += this.ox;
    o.y += this.oy;
    o.z += this.oz;
    o.yaw += this.oyaw;
    this.px = o.x;
    this.py = o.y;
    this.pz = o.z;
    this.pyaw = o.yaw;
    this.on = true;
  }
}

/** (afp AF6) A pace field (`speed`) blended across the sample's span (held at the newest past the buffer). */
export function sampleSpeed(o: Sampled<Pose & { speed: number }>): number {
  const k = o.k < 0 ? 0 : o.k > 1 ? 1 : o.k;
  return o.from.speed + (o.to.speed - o.from.speed) * k;
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
 * (afp AF6) A joiner's state's send clock (s): the wall clock, but never closer to the last state's than the sim time
 * between them (two catch-up steps in one frame shared the frame's clock and bent the host's span: 6 cm in 1 ms; the sim
 * time alone drifted from the wall clock when a slow page dropped its backlog, and the host's ClockSync lagged it).
 */
export function sendClock(lastWall: number, lastSim: number, wall: number, sim: number): number {
  return Math.max(wall, lastWall + Math.max(0, sim - lastSim));
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

  /** (afp AF6) The local time a remote time stands for (the inverse of `now`). */
  toLocal(remoteTime: number): number {
    return remoteTime - (this.offset ?? 0);
  }
}
