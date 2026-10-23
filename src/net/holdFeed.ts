/**
 * (hostage-gait) The point the host feeds `Enemy.holdAt` for a hostage held by a client.
 *
 * The client's body on the host is drawn at render rate (`RemoteAvatar.update`, once per frame), but the seized loop runs
 * per fixed step (60 Hz) and `holdAt` sets the hostage's velocity from the per-step move. Below 60 fps a frame runs 2+
 * fixed steps against one drawn pose: one step sees the whole frame's move, the next sees none, and the hostage's measured
 * speed (his gait) flickers. This feed moves the point every fixed step instead:
 * - the velocity is estimated from distinct drawn poses over the render time between them (exact for the interpolated,
 *   piecewise linear body),
 * - the point is predicted to the render time matching the step's sim time (`HoldClock`: a smoothed render - sim offset),
 *   at most `HOLD_LEAD` ahead, then eased (`HOLD_EASE`) so a stop or a turn does not jerk him,
 * - a new frame with the same pose (or `HOLD_STALE` without a new pose) zeroes the velocity: a stopped holder stops him,
 * - a jump over `HOLD_SNAP` snaps (the caller places him there first, so `holdAt` sees no move: no speed spike).
 *
 * Pure (no Babylon), no allocation per step: the state lives on the host's seized record (`HoldFeed` fields).
 */

/** A move this large between drawn poses (m) is a teleport: snap, no velocity. */
export const HOLD_SNAP = 1;
/** Seconds of sim time without a new pose before the velocity is dropped (a fallback; a still frame drops it at once). */
export const HOLD_STALE = 0.15;
/** The prediction runs at most this far (s) past the newest pose. */
export const HOLD_LEAD = 0.1;
/** Velocity cap (m/s): a sprint is well under it. */
export const HOLD_VMAX = 9;
/** Per-step ease of the fed point toward the prediction (1 = no ease). */
export const HOLD_EASE = 0.5;

/** Render time vs the host's sim time: the render time a fixed step's sim time stands for. */
export class HoldClock {
  /** Render time of the newest frame (s). */
  t = 0;
  /** Smoothed render - sim offset (s). */
  off = 0;
  ready = false;

  /** Each frame, after the fixed steps: `renderT` the time the remote bodies were drawn at, `simT` the host's sim time. */
  frame(renderT: number, simT: number): void {
    const d = renderT - simT;
    // first frame, or a pause / hitch / dropped backlog: re-anchor
    if (!this.ready || Math.abs(d - this.off) > 0.1) {
      this.off = d;
      this.ready = true;
    } else this.off += (d - this.off) * 0.05;
    this.t = renderT;
  }

  /** The render time sim time `simT` stands for. */
  at(simT: number): number {
    return simT + this.off;
  }

  reset(): void {
    this.t = 0;
    this.off = 0;
    this.ready = false;
  }
}

/** Per-hostage feed state (fields on the host's seized record). */
export interface HoldFeed {
  /** Started (false: the next step starts it at the drawn point). */
  hfOn: boolean;
  /** The newest distinct drawn point. */
  hfPx: number;
  hfPz: number;
  /** Render time the drawn point was last known to be `hfP` (a new pose, or a still frame). */
  hfPt: number;
  /** Estimated velocity (m/s). */
  hfVx: number;
  hfVz: number;
  /** Sim seconds since the drawn point last changed. */
  hfSince: number;
  /** The point to feed `holdAt` (the output). */
  hfX: number;
  hfZ: number;
}

export function holdFeed(): HoldFeed {
  return { hfOn: false, hfPx: 0, hfPz: 0, hfPt: 0, hfVx: 0, hfVz: 0, hfSince: 0, hfX: 0, hfZ: 0 };
}

function start(f: HoldFeed, x: number, z: number, t: number): void {
  f.hfOn = true;
  f.hfPx = x;
  f.hfPz = z;
  f.hfPt = t;
  f.hfVx = 0;
  f.hfVz = 0;
  f.hfSince = 0;
  f.hfX = x;
  f.hfZ = z;
}

/**
 * One fixed step: (x, z) the hold point from the drawn body, `simT` the host's sim time after this step, `dt` the step.
 * Writes the point to feed into `f.hfX` / `f.hfZ`. Returns true when it snapped on a jump (not on the start, which keeps
 * the old first placement): the caller places the body there before `holdAt`, so no velocity spike reaches the gait.
 */
export function stepHoldFeed(f: HoldFeed, x: number, z: number, clock: HoldClock, simT: number, dt: number): boolean {
  if (!f.hfOn) {
    start(f, x, z, clock.t);
    return false;
  }
  const dx = x - f.hfPx;
  const dz = z - f.hfPz;
  if (dx !== 0 || dz !== 0) {
    if (dx * dx + dz * dz > HOLD_SNAP * HOLD_SNAP) {
      start(f, x, z, clock.t);
      return true;
    }
    const el = clock.t - f.hfPt;
    if (el > 1e-4) {
      let vx = dx / el;
      let vz = dz / el;
      const v2 = vx * vx + vz * vz;
      if (v2 > HOLD_VMAX * HOLD_VMAX) {
        const k = HOLD_VMAX / Math.sqrt(v2);
        vx *= k;
        vz *= k;
      }
      f.hfVx = vx;
      f.hfVz = vz;
    }
    f.hfPx = x;
    f.hfPz = z;
    f.hfPt = clock.t;
    f.hfSince = 0;
  } else if (clock.t !== f.hfPt) {
    // a new frame drew the same pose: the holder stopped
    f.hfVx = 0;
    f.hfVz = 0;
    f.hfPt = clock.t;
  }
  f.hfSince += dt;
  if (f.hfSince > HOLD_STALE) {
    f.hfVx = 0;
    f.hfVz = 0;
  }
  let lead = clock.ready ? clock.at(simT) - f.hfPt : 0;
  lead = lead < -0.05 ? -0.05 : lead > HOLD_LEAD ? HOLD_LEAD : lead;
  f.hfX += (f.hfPx + f.hfVx * lead - f.hfX) * HOLD_EASE;
  f.hfZ += (f.hfPz + f.hfVz * lead - f.hfZ) * HOLD_EASE;
  return false;
}
