/**
 * Route-runs R3 (J13, docs/route-runs/PLAN.md): the robots' pure math. Progress along the planned path, the stuck
 * watch, the stick that steers to the next waypoint at the run's pace, the follower's trail point and the inferred
 * cause of a guard's rise (the pure part of R7's fallback). Babylon-free and import-free, so the CLI (Node) and the
 * in-page driver (R4a) can both use it.
 *
 * Hot path: `PathProgress.update`, `StuckWatch.update`, `Steer.update`, `Trail.push` and `Trail.point` run every poll
 * in the harness and allocate nothing (typed arrays and numeric fields only; `hyp2` / `hyp3`, never `Math.hypot`).
 * `makePath`, `paceFor` and `inferCause` run once per leg, run or rise and may allocate.
 *
 * Conventions (the game's): y is up; a yaw faces (sin yaw, cos yaw) on x / z (`playerController.ts` wish direction);
 * the game's stick is x right, y forward; a standard pad's axis 1 is +down (`gamepadMapping.ts`).
 */

// ---------------------------------------------------------------------------------------------------------------
// A4 (docs/route-runs/BRIEF.md): stuck limits. These are tool tolerances, not level numbers: they live here as named
// constants (as `DRIFT_S` does in scripts/level-measure.mjs) and are documented in docs/systems/testing-tools.md
// "Route-runs" (R8). docs/level-design.md carries only Q7's pass rule ("never stuck"); moving these numbers into the
// standard or scale-sheet 8 as level numbers needs Michael's approval first. Undo: change them here (a tool change).
// 8 s is about four times the longest normal pause (a door swing and a ladder mount).
// ---------------------------------------------------------------------------------------------------------------
/** A walking robot is stuck when its progress along the planned path grows by less than this (m) ... */
export const STUCK_MIN_PROGRESS_M = 0.5;
/** ... in this much game time (s). */
export const STUCK_WINDOW_S = 8;
/** Link step limits (s): a step that runs past its limit is a `step-timeout` dead stop. */
export const DOOR_LIMIT_S = 5;
export const LADDER_LIMIT_S = 15;
/** Plus this per metre of ladder. */
export const LADDER_LIMIT_PER_M_S = 1;
export const DROP_LIMIT_S = 5;
export const WINDOW_LIMIT_S = 8;
export const HATCH_LIMIT_S = 8;
/** Per metre of duct. */
export const DUCT_LIMIT_PER_M_S = 2;
/** An objective: its own hold plus this. */
export const OBJECTIVE_EXTRA_S = 5;

// Steering and progress (tool constants; the PLAN names the 0.4 m arrival and the 2 m trail, the rest are R3's).
/** A waypoint (and the leg's end) is reached within this horizontal distance (m). */
export const ARRIVE_M = 0.4;
/** The steering target runs this far ahead of the robot's progress (m), never past the next unreached waypoint. */
export const LOOK_AHEAD_M = 1;
/** The follower walks this far behind the leader on the leader's walked path (m). */
export const TRAIL_M = 2;
/** The leader's walked path is kept as points at least this far apart (m) ... */
export const TRAIL_SPACING_M = 0.25;
/** ... in a ring of this many (512 x 0.25 m = 128 m of history; the trail needs 2). */
export const TRAIL_CAP = 512;
/** A path point counts for progress only within this height of the robot's feet (m, under half a 3.3 m storey). */
export const STOREY_Y_TOL_M = 1.5;
/** Progress looks for the nearest path point this far ahead of / behind its current arc length (m). */
export const PROGRESS_AHEAD_M = 6;
export const PROGRESS_BACK_M = 2;
/** Game time compares within this (s), so 160 polls of 0.05 s reach 8 s. */
const EPS_T = 1e-6;

/** Where the pace's speed is read from (the graph's stealth pace, `rules.split_speed_mps`). */
export const METRICS_FILE = 'docs/design/metrics.json';

// Game numbers mirrored here (this module imports nothing); tests/routeRunProgress.test.ts checks each against the
// game's own table, so a change there fails the test instead of drifting.
/** `GEARS` and `STICK_SPEED` (src/config/movement.ts), the pad's left dead zone default (src/core/settings.ts) and the
 *  radial dead zone's outer edge (src/input/stickMath.ts). */
export const GAME_STICK = {
  deadZone: 0.05,
  at: [0, 0.15, 0.45, 0.8, 0.9, 0.97],
  crouch: [0.85, 1.3, 1.7, 2.15, 2.6],
  stand: [0.75, 1.4, 2.1, 3.0, 4.0],
  minCrouch: 0.4,
  minStand: 0.4,
  padInner: 0.15,
  padOuter: 0.98,
};
/** `PERCEPTION` (src/ai/perception.ts) and the dog's smell (`ARCHETYPE.dog`, src/ai/archetypes.ts). */
export const GAME_SENSES = {
  focusHalf: (55 / 2) * (Math.PI / 180),
  focusRange: 25,
  periphHalf: 100 * (Math.PI / 180),
  periphRange: 12,
  edgeBlend: 0.18,
  closeRange: 1.8,
  /** A body slower than this (m/s) is "still" (`motionFactor`): not felt close by. */
  closeMinSpeed: 0.15,
  dogSmell: 6,
  dogSmellCrouchMul: 0.7,
};

function hyp2(x, y) {
  return Math.sqrt(x * x + y * y);
}

function hyp3(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z);
}

// ---------------------------------------------------------------------------------------------------------------
// Pace
// ---------------------------------------------------------------------------------------------------------------

/** The game's stick magnitude (after the pad dead zone) for speed `v` (m/s): `stickMagFor` in speedGears.ts. */
export function gameMagFor(v, crouched) {
  const S = GAME_STICK;
  const caps = crouched ? S.crouch : S.stand;
  let a = 0;
  let va = crouched ? S.minCrouch : S.minStand;
  let u = 1;
  if (v <= va) u = 1e-4;
  else {
    for (let i = 1; i < S.at.length; i++) {
      const b = S.at[i];
      const vb = caps[i - 1];
      if (v <= vb) {
        u = a + (b - a) * ((v - va) / (vb - va));
        break;
      }
      a = b;
      va = vb;
    }
  }
  return S.deadZone + (1 - S.deadZone) * u;
}

/** The raw pad axis magnitude that the pad's radial dead zone turns into game magnitude `m`. */
export function padMagFor(m, inner = GAME_STICK.padInner, outer = GAME_STICK.padOuter) {
  return inner + Math.max(0, Math.min(1, m)) * (outer - inner);
}

/**
 * The run's pace (A3): `sneak` (the default) is crouched at the graph's `split_speed_mps`; `walk` and `run` are the
 * standing walk and run speeds (`GEARS.stand` walk and run points) for comparison runs. `metrics` is the parsed
 * metrics.json (the caller reads `METRICS_FILE`). Returns the stance, the speed, the pad stick magnitude to hold and
 * the least `?gear=` the page must allow (e2e-lib boots at gear 4, which caps the standing speed at 3.0 m/s).
 */
export function paceFor(pace, metrics, padInner = GAME_STICK.padInner) {
  let crouched;
  let speed;
  if (pace === 'sneak' || pace === undefined) {
    const v = metrics && metrics.rules ? metrics.rules.split_speed_mps : undefined;
    if (typeof v !== 'number' || !(v > 0)) throw new Error(`route-run: ${METRICS_FILE} has no rules.split_speed_mps`);
    crouched = true;
    speed = v;
  } else if (pace === 'walk') {
    crouched = false;
    speed = GAME_STICK.stand[2];
  } else if (pace === 'run') {
    crouched = false;
    speed = GAME_STICK.stand[4];
  } else throw new Error(`route-run: unknown pace "${pace}" (sneak, walk or run)`);
  const caps = crouched ? GAME_STICK.crouch : GAME_STICK.stand;
  let minGear = caps.length;
  for (let g = 1; g <= caps.length; g++) {
    if (caps[g - 1] >= speed - 1e-9) {
      minGear = g;
      break;
    }
  }
  const gameMag = gameMagFor(speed, crouched);
  return { pace: pace ?? 'sneak', crouched, speed, gameMag, stick: padMagFor(gameMag, padInner), minGear };
}

/** Node only: `paceFor` with the speed read from `METRICS_FILE` under the repo root (dynamic imports keep this module
 *  import-free for the in-page driver). */
export async function readPace(pace = 'sneak', root = '.', padInner = GAME_STICK.padInner) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const metrics = JSON.parse(fs.readFileSync(path.resolve(root, METRICS_FILE), 'utf8'));
  return paceFor(pace, metrics, padInner);
}

// ---------------------------------------------------------------------------------------------------------------
// Paths and progress
// ---------------------------------------------------------------------------------------------------------------

/**
 * A polyline from points `{ x, y, z }` (floor points, y = the floor height): typed arrays and the cumulative arc
 * length `cum` (3D, so a ladder's height counts). Built once per leg.
 */
export function makePath(points) {
  const n = points.length;
  if (n < 1) throw new Error('route-run: a path needs at least one point');
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const z = new Float64Array(n);
  const cum = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    x[i] = p.x;
    y[i] = p.y;
    z[i] = p.z;
    if (i > 0) cum[i] = cum[i - 1] + hyp3(x[i] - x[i - 1], y[i] - y[i - 1], z[i] - z[i - 1]);
  }
  return { n, x, y, z, cum, length: cum[n - 1] };
}

/** The index of the segment holding arc length `s` (0 .. n-2; 0 for a one-point path). */
function segAt(path, s) {
  const c = path.cum;
  let lo = 0;
  let hi = path.n - 1;
  if (hi <= 0) return 0;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (c[mid] <= s) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Writes the point at arc length `s` (clamped to the path) into `out.x / y / z`; returns `out`. */
export function pointAt(path, s, out) {
  const n = path.n;
  if (n === 1 || s <= 0) {
    out.x = path.x[0];
    out.y = path.y[0];
    out.z = path.z[0];
    return out;
  }
  if (s >= path.length) {
    out.x = path.x[n - 1];
    out.y = path.y[n - 1];
    out.z = path.z[n - 1];
    return out;
  }
  const i = segAt(path, s);
  const len = path.cum[i + 1] - path.cum[i];
  const t = len > 0 ? (s - path.cum[i]) / len : 0;
  out.x = path.x[i] + (path.x[i + 1] - path.x[i]) * t;
  out.y = path.y[i] + (path.y[i + 1] - path.y[i]) * t;
  out.z = path.z[i] + (path.z[i + 1] - path.z[i]) * t;
  return out;
}

/**
 * Progress along a path: the arc length of the nearest path point (3D), searched only from `back` behind to `ahead`
 * of the current progress, and only on points within `STOREY_Y_TOL_M` of the robot's feet (storey-aware: a walkway
 * above or a floor below never counts). Monotonic: `s` never goes down. `off` is the distance to the chosen point
 * (Infinity when no point qualified this poll; `s` then stays). `resetTo(s)` after a harness placement.
 */
export class PathProgress {
  constructor(path, opts = {}) {
    this.path = path;
    this.ahead = opts.ahead ?? PROGRESS_AHEAD_M;
    this.back = opts.back ?? PROGRESS_BACK_M;
    this.yTol = opts.yTol ?? STOREY_Y_TOL_M;
    this.s = 0;
    this.off = Infinity;
  }

  resetTo(s = 0) {
    this.s = Math.max(0, Math.min(this.path.length, s));
    this.off = Infinity;
  }

  /** The robot's feet at (px, py, pz); returns the progress (m). */
  update(px, py, pz) {
    const p = this.path;
    const n = p.n;
    const lo = this.s - this.back;
    const hi = this.s + this.ahead;
    let best = Infinity;
    let bestS = -1;
    if (n === 1) {
      const d = hyp3(p.x[0] - px, p.y[0] - py, p.z[0] - pz);
      if (Math.abs(p.y[0] - py) <= this.yTol) {
        best = d;
        bestS = 0;
      }
    }
    for (let i = n > 1 ? segAt(p, Math.max(0, lo)) : n; i < n - 1; i++) {
      const c0 = p.cum[i];
      if (c0 > hi) break;
      const ax = p.x[i];
      const ay = p.y[i];
      const az = p.z[i];
      const ex = p.x[i + 1] - ax;
      const ey = p.y[i + 1] - ay;
      const ez = p.z[i + 1] - az;
      const len = p.cum[i + 1] - c0;
      let t = 0;
      if (len > 1e-9) t = ((px - ax) * ex + (py - ay) * ey + (pz - az) * ez) / (len * len);
      // the window clips the segment
      let tMin = 0;
      let tMax = 1;
      if (len > 1e-9) {
        if (c0 < lo) tMin = (lo - c0) / len;
        if (c0 + len > hi) tMax = (hi - c0) / len;
      }
      if (t < tMin) t = tMin;
      if (t > tMax) t = tMax;
      // Known limit: the storey check tests only this nearest point of the segment. On a long sloped segment (a stair
      // run) the nearest point can fail the height check while another point inside the window would pass, which
      // reads as a stall. If a stair run shows false stalls, test every point inside [tMin, tMax] instead.
      const qy = ay + ey * t;
      if (Math.abs(qy - py) > this.yTol) continue;
      const d = hyp3(ax + ex * t - px, qy - py, az + ez * t - pz);
      if (d < best) {
        best = d;
        bestS = c0 + len * t;
      }
    }
    this.off = best;
    if (bestS > this.s) this.s = bestS;
    return this.s;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Stuck watch
// ---------------------------------------------------------------------------------------------------------------

/** The limit (s) of a link step of `kind`; `lengthM` for a ladder or duct, `holdS` for an objective. Null: no limit
 *  of its own (a walked kind, or a stub the harness holds), or a duct with no length (R1 does the same; never an
 *  instant timeout). A ladder with no length gets the base limit. */
export function stepLimit(kind, lengthM, holdS = 0) {
  switch (kind) {
    case 'door':
      return DOOR_LIMIT_S;
    case 'ladder':
      return LADDER_LIMIT_S + LADDER_LIMIT_PER_M_S * (lengthM ?? 0);
    case 'drop':
      return DROP_LIMIT_S;
    case 'window':
      return WINDOW_LIMIT_S;
    case 'hatch':
      return HATCH_LIMIT_S;
    case 'duct':
      return lengthM == null ? null : DUCT_LIMIT_PER_M_S * lengthM;
    case 'objective':
      return holdS + OBJECTIVE_EXTRA_S;
    default:
      return null;
  }
}

/** `StuckWatch.update` results: nothing, a walking stall (R4a names its class from a nav probe: `no-nav-path` or
 *  `could-not-follow`), a link step past its limit. */
export const WATCH_OK = '';
export const WATCH_STALL = 'stall';
export const WATCH_STEP_TIMEOUT = 'step-timeout';

/**
 * A4's dead-stop clock, in game seconds. `walk(t, s)` while the robot walks a leg: stuck when the progress has not
 * grown by `STUCK_MIN_PROGRESS_M` within `STUCK_WINDOW_S` of the last time it did (a pinned robot stops at 8 s, not
 * 7.9). `step(t, limit)` during a link step: stuck when the step runs past its limit. `idle()` while the harness holds
 * the robot on purpose (a stub, an objective it times itself, a wait at a rejoin): no clock. `update` returns the
 * result on the poll it fires, then `WATCH_OK` until the next `walk` / `step`; `fired` keeps it, `firedAt` its time.
 */
export class StuckWatch {
  constructor(opts = {}) {
    this.minProgress = opts.minProgress ?? STUCK_MIN_PROGRESS_M;
    this.window = opts.window ?? STUCK_WINDOW_S;
    this.mode = 'idle';
    this.anchorT = 0;
    this.anchorS = 0;
    this.t0 = 0;
    this.limit = 0;
    this.fired = WATCH_OK;
    this.firedAt = -1;
  }

  walk(t, s) {
    this.mode = 'walk';
    this.anchorT = t;
    this.anchorS = s;
    this.fired = WATCH_OK;
    this.firedAt = -1;
  }

  step(t, limitS) {
    this.mode = 'step';
    this.t0 = t;
    this.limit = limitS;
    this.fired = WATCH_OK;
    this.firedAt = -1;
  }

  idle() {
    this.mode = 'idle';
    this.fired = WATCH_OK;
    this.firedAt = -1;
  }

  /** Game time `t` (s) and the progress `s` (m; ignored during a step). */
  update(t, s) {
    if (this.fired !== WATCH_OK || this.mode === 'idle') return WATCH_OK;
    if (this.mode === 'walk') {
      if (s - this.anchorS >= this.minProgress) {
        this.anchorT = t;
        this.anchorS = s;
        return WATCH_OK;
      }
      if (t - this.anchorT >= this.window - EPS_T) {
        this.fired = WATCH_STALL;
        this.firedAt = t;
        return WATCH_STALL;
      }
      return WATCH_OK;
    }
    if (this.limit !== null && t - this.t0 > this.limit + EPS_T) {
      this.fired = WATCH_STEP_TIMEOUT;
      this.firedAt = t;
      return WATCH_STEP_TIMEOUT;
    }
    return WATCH_OK;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Steering
// ---------------------------------------------------------------------------------------------------------------

/**
 * The stick for world direction (dx, dz) with the camera at `camYaw`: the inverse of the game's camera-relative wish
 * direction (forward = (sin yaw, cos yaw), right = (cos yaw, -sin yaw)). Writes the unit stick into `out.x` (right)
 * and `out.y` (forward); zero for a zero direction. Returns `out`.
 */
export function stickToward(dx, dz, camYaw, out) {
  const len = hyp2(dx, dz);
  if (len < 1e-9) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const ux = dx / len;
  const uz = dz / len;
  const fx = Math.sin(camYaw);
  const fz = Math.cos(camYaw);
  out.x = ux * fz - uz * fx;
  out.y = ux * fx + uz * fz;
  return out;
}

/**
 * Steers a robot along a path: the target is `lookAhead` past its progress but never past the next unreached
 * waypoint (corners are walked, not cut); a waypoint is reached within `arrive` (horizontal, same storey) or when the
 * progress passes it; the leg is `done` within `arrive` of its last point. `update` writes `stickX` / `stickY` (the
 * direction in the game's stick frame, right and forward, at length `mag`), `axisX` / `axisY` (the same as the pad's
 * axes 0 and 1 for `window.__pad.axis`, axis 1 +down) and the target `tx / ty / tz`. `mag` is the raw pad magnitude
 * from `paceFor(...).stick` (the pad's radial dead zone keeps the direction and maps the length to the pace).
 */
export class Steer {
  constructor(path, opts = {}) {
    this.path = path;
    this.arrive = opts.arrive ?? ARRIVE_M;
    this.lookAhead = opts.lookAhead ?? LOOK_AHEAD_M;
    this.yTol = opts.yTol ?? STOREY_Y_TOL_M;
    this.wp = path.n > 1 ? 1 : 0;
    this.done = false;
    this.stickX = 0;
    this.stickY = 0;
    this.axisX = 0;
    this.axisY = 0;
    this.tx = 0;
    this.ty = 0;
    this.tz = 0;
    this._dir = { x: 0, y: 0 };
    this._pt = { x: 0, y: 0, z: 0 };
  }

  reset() {
    this.wp = this.path.n > 1 ? 1 : 0;
    this.done = false;
    this.stickX = this.stickY = this.axisX = this.axisY = 0;
  }

  _stop() {
    this.stickX = this.stickY = this.axisX = this.axisY = 0;
  }

  /** The robot's feet (px, py, pz), its progress `s` (`PathProgress.s`), the camera yaw and the pad magnitude. */
  update(px, py, pz, s, camYaw, mag) {
    const p = this.path;
    const last = p.n - 1;
    if (this.done) {
      this._stop();
      return this;
    }
    while (this.wp < last) {
      const i = this.wp;
      const near = hyp2(p.x[i] - px, p.z[i] - pz) <= this.arrive && Math.abs(p.y[i] - py) <= this.yTol;
      if (near || s >= p.cum[i]) this.wp++;
      else break;
    }
    if (hyp2(p.x[last] - px, p.z[last] - pz) <= this.arrive && Math.abs(p.y[last] - py) <= this.yTol) {
      this.done = true;
      this.tx = p.x[last];
      this.ty = p.y[last];
      this.tz = p.z[last];
      this._stop();
      return this;
    }
    const target = Math.min(s + this.lookAhead, p.cum[this.wp]);
    const q = pointAt(p, target, this._pt);
    let dx = q.x - px;
    let dz = q.z - pz;
    if (hyp2(dx, dz) < 1e-3) {
      // on the target already (progress at the waypoint while still outside its radius): head for the waypoint
      dx = p.x[this.wp] - px;
      dz = p.z[this.wp] - pz;
    }
    this.tx = q.x;
    this.ty = q.y;
    this.tz = q.z;
    const d = stickToward(dx, dz, camYaw, this._dir);
    this.stickX = d.x * mag;
    this.stickY = d.y * mag;
    this.axisX = this.stickX;
    this.axisY = -this.stickY;
    return this;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The follower's trail
// ---------------------------------------------------------------------------------------------------------------

/**
 * The leader's walked path (a ring of points at least `spacing` apart) and the follower's trail point `back` metres
 * behind the leader along it (3D arc length). `push` the leader's feet every poll; `point(back, lx, ly, lz)` writes
 * `tx / ty / tz` (the oldest kept point when the walked path is shorter than `back`). `reset()` after a placement.
 */
export class Trail {
  constructor(cap = TRAIL_CAP, spacing = TRAIL_SPACING_M) {
    this.cap = cap;
    this.spacing = spacing;
    this.xs = new Float64Array(cap);
    this.ys = new Float64Array(cap);
    this.zs = new Float64Array(cap);
    this.head = 0;
    this.count = 0;
    this.tx = 0;
    this.ty = 0;
    this.tz = 0;
  }

  reset() {
    this.head = 0;
    this.count = 0;
  }

  push(x, y, z) {
    if (this.count > 0) {
      const j = (this.head - 1 + this.cap) % this.cap;
      if (hyp3(x - this.xs[j], y - this.ys[j], z - this.zs[j]) < this.spacing) return;
    }
    this.xs[this.head] = x;
    this.ys[this.head] = y;
    this.zs[this.head] = z;
    this.head = (this.head + 1) % this.cap;
    if (this.count < this.cap) this.count++;
  }

  point(back, lx, ly, lz) {
    let cx = lx;
    let cy = ly;
    let cz = lz;
    let left = back;
    for (let k = 1; k <= this.count; k++) {
      const j = (this.head - k + this.cap) % this.cap;
      const nx = this.xs[j];
      const ny = this.ys[j];
      const nz = this.zs[j];
      const len = hyp3(nx - cx, ny - cy, nz - cz);
      if (len >= left && len > 0) {
        const t = left / len;
        this.tx = cx + (nx - cx) * t;
        this.ty = cy + (ny - cy) * t;
        this.tz = cz + (nz - cz) * t;
        return this;
      }
      left -= len;
      cx = nx;
      cy = ny;
      cz = nz;
    }
    this.tx = cx;
    this.ty = cy;
    this.tz = cz;
    return this;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Inferred cause (R7 fallback, pure part)
// ---------------------------------------------------------------------------------------------------------------

/** The senses a line can name: Guard AI's cause kinds (PLAN G1) plus `camera` and `unknown`. Inference never names
 *  `shadowCue` (only J16's record can) or `shot` (the robots never fight). */
export const SENSES = ['sight', 'close', 'hearing', 'shadowCue', 'camera', 'told', 'body', 'smell', 'shot', 'unknown'];

/** The game's alert levels (`AlertLevel`, src/ai/alertState.ts) ranked by how aware the guard is; `cooldown` is the
 *  calm-down after a search, so it ranks with `unaware`. */
export const ALERT_RANK = { unaware: 0, cooldown: 0, suspicious: 1, investigating: 2, searching: 3, alert: 4 };
export const RISE_DETECTION = 'detection';
export const RISE_NOTICE = 'notice';

/**
 * What a guard's level change between two polls is (BRIEF "Detections"): a rise to `alert` is a detection; a rise to
 * `suspicious` or `investigating` is a notice (report only); anything else (a fall, the same level, `searching`) is
 * no line (''). A guard who rises again later counts again (A12): the caller keeps each guard's last polled level.
 */
export function riseClass(from, to) {
  const a = ALERT_RANK[from] ?? 0;
  const b = ALERT_RANK[to];
  if (b === undefined || b <= a) return '';
  if (to === 'alert') return RISE_DETECTION;
  if (to === 'suspicious' || to === 'investigating') return RISE_NOTICE;
  return '';
}

function smooth(t) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/** The sight range (m) at horizontal angle `a` (rad) off the guard's facing: `fieldFactor`'s range; 0 outside. */
export function sightRange(a) {
  const P = GAME_SENSES;
  const x = Math.abs(a);
  if (x <= P.focusHalf) return P.focusRange;
  if (x <= P.focusHalf + P.edgeBlend) return P.focusRange + (P.periphRange - P.focusRange) * smooth((x - P.focusHalf) / P.edgeBlend);
  if (x <= P.periphHalf) return P.periphRange;
  return 0;
}

/**
 * Names the sense behind one rise (a guard's alert level going up, or a camera alarm) from what the harness saw at
 * that poll; every result has `inferred: true`. `rise`:
 * - `guard`: `{ id, kind, x, y, z, yaw }` (eye position; `kind` 'dog' enables smell),
 * - `robots`: `[{ x, y, z, crouched, speed, light, los }]` (`los` false when the guard's line of sight is blocked;
 *   missing means not tested, which does not rule sight out),
 * - `camera`: the camera id when a camera alarm fired, else null,
 * - `heard`: noises this guard heard since the last poll, `[{ x, y, z, radius, kind }]`,
 * - `told`: the id of the guard who radioed or shouted to him, else null,
 * - `body`: true when he found a body.
 * Order, first that holds: camera, sight (a robot in his field and range, line of sight not blocked: the nearest),
 * close (a moving robot within `closeRange`), smell (a dog, within the smell radius), hearing, told, body, unknown.
 * Returns `{ sense, inferred, robot (index or -1), inputs }`, inputs by sense: sight `{ distance, angle, light, stance,
 * speed }`, close / smell `{ distance, stance, speed }`, hearing `{ radius, kind, distance }`, camera `{ camera }`, told
 * `{ by }`, else null. Names match the guard cause record (G1) and R2's report: `distance` in metres (3D, eye to feet
 * or to the noise source), `angle` in radians off his facing (0 to pi), `light` as the harness read it, `stance`
 * 'crouched' | 'standing', `speed` in m/s.
 */
export function inferCause(rise) {
  const P = GAME_SENSES;
  const g = rise.guard;
  const robots = rise.robots ?? [];
  if (rise.camera != null) return { sense: 'camera', inferred: true, robot: nearestRobot(robots, g.x, g.y, g.z), inputs: { camera: rise.camera } };
  const fx = Math.sin(g.yaw ?? 0);
  const fz = Math.cos(g.yaw ?? 0);
  let sight = -1;
  let sightD = Infinity;
  let sightA = 0;
  let close = -1;
  let closeD = Infinity;
  let smell = -1;
  let smellD = Infinity;
  for (let i = 0; i < robots.length; i++) {
    const r = robots[i];
    const dx = r.x - g.x;
    const dz = r.z - g.z;
    const d = hyp3(dx, r.y - g.y, dz);
    const a = Math.abs(Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz));
    if (r.los !== false && d < sightRange(a) && d < sightD) {
      sight = i;
      sightD = d;
      sightA = a;
    }
    if (d < P.closeRange && (r.speed ?? 0) > P.closeMinSpeed && d < closeD) {
      close = i;
      closeD = d;
    }
    if (g.kind === 'dog' && d < P.dogSmell * (r.crouched ? P.dogSmellCrouchMul : 1) && d < smellD) {
      smell = i;
      smellD = d;
    }
  }
  if (sight >= 0) {
    const r = robots[sight];
    return { sense: 'sight', inferred: true, robot: sight, inputs: { distance: sightD, angle: sightA, light: r.light ?? null, stance: stanceOf(r), speed: r.speed ?? 0 } };
  }
  if (close >= 0) {
    const r = robots[close];
    return { sense: 'close', inferred: true, robot: close, inputs: { distance: closeD, stance: stanceOf(r), speed: r.speed ?? 0 } };
  }
  if (smell >= 0) {
    const r = robots[smell];
    return { sense: 'smell', inferred: true, robot: smell, inputs: { distance: smellD, stance: stanceOf(r), speed: r.speed ?? 0 } };
  }
  const heard = rise.heard ?? [];
  if (heard.length > 0) {
    // the loudest noise he heard; the robot nearest its source made it
    let k = 0;
    for (let i = 1; i < heard.length; i++) if (heard[i].radius > heard[k].radius) k = i;
    const n = heard[k];
    return {
      sense: 'hearing',
      inferred: true,
      robot: nearestRobot(robots, n.x, n.y ?? g.y, n.z),
      inputs: { radius: n.radius, kind: n.kind ?? null, distance: hyp3(n.x - g.x, (n.y ?? g.y) - g.y, n.z - g.z) },
    };
  }
  if (rise.told != null) return { sense: 'told', inferred: true, robot: -1, inputs: { by: rise.told } };
  if (rise.body) return { sense: 'body', inferred: true, robot: -1, inputs: null };
  return { sense: 'unknown', inferred: true, robot: -1, inputs: null };
}

function stanceOf(r) {
  return r.crouched ? 'crouched' : 'standing';
}

function nearestRobot(robots, x, y, z) {
  let best = -1;
  let bd = Infinity;
  for (let i = 0; i < robots.length; i++) {
    const r = robots[i];
    const d = hyp3(r.x - x, r.y - y, r.z - z);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}
