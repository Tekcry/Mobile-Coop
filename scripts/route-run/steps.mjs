// Route-run link steps (J13 R5, docs/route-runs/PLAN.md "R5 Link steps"; the R4a seam, PLAN "Seams"): a table from a
// link step's action to the step the harness takes at it. Each step is a Node-side async call `step(ctx, link)`:
//   ctx  { host, client, pads, driver, ... } (R4a, scripts/route-run.mjs): both pages (`client` null at --players 1)
//        and the in-page driver (`driver.hold(s)`, `driver.place(point)`, `driver.points`, `driver.opts.stick`);
//        R4b adds `ctx.clock(dt)` (both pages stepped in lockstep): the steps use it when it is there.
//   link the planner's link step (`{ index, kind, from, to, at, past, action, limit_s, hold_s, holdFrom, reverse }`).
// It returns `{ outcome: 'walked' | 'stub' | 'step-timeout', stub?, robot?, limit_s?, t?, why?, phase? }`; the driver
// logs a stop and does the recovery past the link (R4a `linkStep`).
//
// R5 (pad only, the sequences of the game's own traversal suites, scripts/e2e-traverse.mjs and e2e-ct-warehouse.mjs):
// `ladder` (walk into the foot, Y, climb, step off at the top; down from the top), `drop` (walk off the edge; a hang
// and let go where the edge stops the walk), `window` (the vault the game offers; a glazed one shatters, loud),
// `hatch` (the climb-through the game offers), `duct` (Y then A held: the grate unscrews quietly, crawl, out past the
// far end), `rappel` (Y at the roof edge, hook on, descend). Each is a pure step machine (`machine.update(reading, t)
// -> { stick, press, hold, done, result }`, unit tested on scripted readings) driven by a thin page reader. The rare
// solo kinds (`ledge`, `pipe`, `wall_jump`, `split_jump`) stay stubs ("no step yet: <kind>"), the co-op kinds stay
// stubs (BRIEF A1; R9 takes them). `door` and `walk` links never come here: the driver walks them (R4a).
// Code-route climbs (`--routes code`: a `climbs` leg, kind `climb`) are classified from the page's anchors near the
// leg (`classifyClimb`) and taken by that kind's step, else stubbed.
//
// Limits: R3's `stepLimit` (scripts/route-run/progress.mjs, BRIEF A4) on the link's `limit_s` from R1 when set; a kind
// with no limit of its own (a rappel, a duct with no length) runs under the 8 s stall watch (R3 `StuckWatch`) on its 3D
// progress (R3 `PathProgress` along start -> stand point -> the move's far end). The timings below are sequence timings (how long a press waits for its effect), not A4 tolerances.
// Hot path: `update` and the page reader's `poll` / `read` allocate nothing (numbers, the machine's own arrays, the
// reader's one reading object); a step's set-up (anchors, geometry, the result) allocates once.
import { COOP_KINDS } from '../level-validate.mjs';
import { ARRIVE_M, STOREY_Y_TOL_M, PathProgress, StuckWatch, WATCH_STALL, WATCH_STEP_TIMEOUT, makePath, stepLimit, stickToward } from './progress.mjs';

/** Why a stub was taken, as the report prints it. */
export const STUB_WHY_COOP = 'co-op move stubbed (A1)';
export const STUB_WHY_SOLO = 'no link step for this kind yet (R5)';
/** A rare solo kind: `${STUB_WHY_RARE}: <kind>` (BRIEF "Solo off-nav links"). */
export const STUB_WHY_RARE = 'no step yet';
export const STUB_WHY_CLIMB = 'code climb: unclassified';

/** The pad buttons the steps press (`BTN` in scripts/e2e-lib.mjs, not imported here: it loads Playwright). */
export const BTN = { A: 0, B: 1, Y: 3 };
/** The kinds R5 walks, and the rare solo kinds it leaves stubbed (listed in the report). */
export const STEP_KINDS = ['ladder', 'drop', 'window', 'hatch', 'duct', 'rappel'];
export const RARE_KINDS = ['ledge', 'pipe', 'wall_jump', 'split_jump'];
/** A code route's `climbs` leg (scripts/route-run.mjs `codeRuns`). */
export const CODE_CLIMB = 'climb';

/** Game seconds per step poll (one reading, one machine update: R4a's guard poll `POLL_S`). */
export const STEP_POLL_S = 0.1;
/** The driver's course hook (`driver.onChunk`) runs this often during a step (game s; R4a's evaluate `EVAL_S`). */
export const HOOK_EVERY_S = 2;
/** A step runs at most this long (game s) whatever its limit (a safety net; the limit or the stall watch ends it). */
export const STEP_CAP_S = 120;
/** The stick while attached (a climb, a crawl, a descent), as the traversal suites hold it. */
export const CLIMB_STICK = 1;
/** The approach stick when the driver gives no pace (R3 `paceFor(...).stick` is in `driver.opts.stick`). */
export const DEFAULT_STICK = 0.6;

// Where the robot stands for the game to offer the move (src/world/anchors.ts `reach`: the ladder foot within 0.85 m,
// the ladder top within 0.9 m, a window 0.25-1.4 m from its frame, a duct mouth within 1.1 m, a rappel point within
// 0.9 m), and how far it pushes toward the move before it walks back to that point.
export const LADDER_FOOT_M = 0.5;
export const LADDER_TOP_M = 0.5;
export const WINDOW_STAND_M = 0.8;
export const DUCT_STAND_M = 0.6;
export const RAPPEL_STAND_M = 0.6;
export const PUSH_MAX_M = 1;
/** A graph link's anchor is the nearest of its kind within this (m) of the link's point (an `edge` point can sit some
 *  metres from the ladder: campus S1's ladder link is 5 m from its ladder). */
export const ANCHOR_NEAR_M = 6;
// Sequence timings (game s), from the traversal suites: Y with no effect is pressed again after `REPRESS_S`; the drop's
// walk-off has stalled at the edge after `EDGE_STALL_S` under `EDGE_STALL_M` of movement; B is held `HANG_HOLD_S` to
// lower into a hang (e2e-traverse:323) and the hang waited for `HANG_WAIT_S`; A is held at most `UNSCREW_MAX_S` for the
// grate (about 1.8 s, e2e-traverse:440-455) and the crawl-in waited for `ENTER_WAIT_S`; the rappel's hook is waited for
// `HOOK_WAIT_S` (RAPPEL.hookTime 1.8 s), and a descent with no `DESCEND_MIN_M` of drop in `DESCEND_STALL_S` lets go (B).
export const REPRESS_S = 1.2;
export const EDGE_STALL_S = 0.6;
export const EDGE_STALL_M = 0.1;
export const HANG_HOLD_S = 0.6;
export const HANG_WAIT_S = 1.5;
export const UNSCREW_MAX_S = 3;
export const ENTER_WAIT_S = 1;
export const HOOK_WAIT_S = 3;
export const DESCEND_MIN_M = 0.05;
export const DESCEND_STALL_S = 1;
/** Past a window's frame (or a link's point) by this much (m) is its far side. */
export const PAST_SIDE_M = 0.3;
/** With no far floor known, a storey change is a height change of this much (m). */
export const STOREY_MOVE_M = 1;
/** The code-climb classifier (this brief): an anchor within this (m, plan) of either end of the leg is the leg's. */
export const CLIMB_NEAR_M = 1.5;
/** ... and an end more than this (m) below the start with no anchor is a drop. */
export const CLIMB_DROP_M = 1;

const num = (v) => typeof v === 'number' && Number.isFinite(v);

function hyp2(x, y) {
  return Math.sqrt(x * x + y * y);
}

function unit2(x, z) {
  const l = hyp2(x, z);
  return l > 1e-9 ? [x / l, z / l] : [0, 0];
}

// ---------------------------------------------------------------------------------------------------------------
// Geometry (pure): where to stand, which way to push, the far floor, from the link and the anchor (if any)
// ---------------------------------------------------------------------------------------------------------------

function spaceOf(points, id) {
  if (!points?.spaces || id == null) return null;
  if (Array.isArray(points.spaces)) return points.spaces.find((s) => s.id === id) ?? null;
  return points.spaces[id] ?? null;
}

/** A space's floor height from the points table (`floorY`, else its centre's y), or null. */
export function floorOf(points, id) {
  const s = spaceOf(points, id);
  if (!s) return null;
  if (num(s.floorY)) return s.floorY;
  return Array.isArray(s.centre) && num(s.centre[1]) ? s.centre[1] : null;
}

/** A space's centre `[x, y, z]` from the points table, or null. */
export function centreOf(points, id) {
  const c = spaceOf(points, id)?.centre;
  return Array.isArray(c) ? c : null;
}

/** The key points of an anchor in the plain shape the page reader returns (`[x, y, z]` arrays). */
function keyPoints(kind, a) {
  if (kind === 'ladder') return [a.base, a.top];
  if (kind === 'window') return [a.c];
  if (kind === 'duct') return [a.entry.pos, a.exit.pos];
  if (kind === 'rappel') return [a.top];
  return [];
}

const LISTS = { ladder: 'ladders', window: 'windows', duct: 'ducts', rappel: 'rappels' };

function listOf(anchors, kind) {
  const k = LISTS[kind];
  return anchors && k && Array.isArray(anchors[k]) ? anchors[k] : [];
}

/** The plan distance (m) from (x, z) to an anchor's nearest key point. */
function anchorDist(kind, a, x, z) {
  let d = Infinity;
  for (const p of keyPoints(kind, a)) d = Math.min(d, hyp2(p[0] - x, p[2] - z));
  return d;
}

/** The nearest anchor of `kind` with a key point within `maxM` (plan) of (x, z), as `{ kind, ...anchor }`, or null. */
export function nearestAnchor(kind, anchors, x, z, maxM = ANCHOR_NEAR_M) {
  let best = null;
  let bd = Infinity;
  for (const a of listOf(anchors, kind)) {
    const d = anchorDist(kind, a, x, z);
    if (d <= maxM && d < bd) {
      bd = d;
      best = a;
    }
  }
  return best ? { kind, ...best } : null;
}

/**
 * The step's geometry: `stand` (the point the robot walks to for the offer), `face` (the plan direction it pushes,
 * unit), `want` (the hint that is the offer), `toY` (the far floor, or null), `down`, `sideC` (a point on the move's
 * plane: the far side is beyond it along `face`), `mouth` / `far` (a duct's two ends), `end` (the move's far end, for
 * the stall watch's progress). From the anchor when the page
 * has one; else the link's `at` and the way to its `past` (the prompt then never shows and the step runs to its limit).
 * `info`: `{ toY, fromC }` (the far floor and the near space's centre from the points table).
 */
export function geometry(kind, link, anchor, info = {}) {
  const at = Array.isArray(link.at) ? link.at : null;
  const past = Array.isArray(link.past) ? link.past : null;
  const g = {
    kind, found: !!anchor, stand: at ? [at[0], at[1], at[2]] : null, face: [0, 0], want: null, toY: num(info.toY) ? info.toY : null,
    down: false, sideC: at ? [at[0], at[2]] : null, mouth: null, far: null, end: past ? [past[0], past[1], past[2]] : null,
  };
  if (at && past) g.face = unit2(past[0] - at[0], past[2] - at[2]);
  switch (kind) {
    case 'ladder': {
      if (anchor) {
        const fx = Math.sin(anchor.facing);
        const fz = Math.cos(anchor.facing);
        const b = anchor.base;
        const t = anchor.top;
        g.down = g.toY !== null ? Math.abs(g.toY - b[1]) < Math.abs(g.toY - t[1]) : !!link.reverse;
        if (g.down) {
          g.stand = [t[0] + fx * LADDER_TOP_M, t[1], t[2] + fz * LADDER_TOP_M];
          g.face = [-fx, -fz];
        } else {
          g.stand = [b[0] - fx * LADDER_FOOT_M, b[1], b[2] - fz * LADDER_FOOT_M];
          g.face = [fx, fz];
        }
        if (g.toY === null) g.toY = g.down ? b[1] : t[1];
      } else g.down = g.toY !== null && at ? g.toY < at[1] : !!link.reverse;
      g.want = g.down ? 'ladder:top' : 'ladder:bottom';
      break;
    }
    case 'drop':
      g.down = true;
      break;
    case 'rappel':
      g.down = true;
      g.want = 'rappel:above';
      if (anchor) {
        const t = anchor.top;
        g.stand = [t[0] - anchor.nx * RAPPEL_STAND_M, t[1], t[2] - anchor.nz * RAPPEL_STAND_M];
        g.face = unit2(anchor.nx, anchor.nz);
        if (g.toY === null && num(anchor.length)) g.toY = t[1] - anchor.length;
        // the rope's foot
        if (g.toY !== null) g.end = [t[0] + g.face[0] * PAST_SIDE_M, g.toY, t[2] + g.face[1] * PAST_SIDE_M];
      }
      break;
    case 'window':
      if (anchor) {
        const c = anchor.c;
        const nx = Math.sin(anchor.yaw);
        const nz = Math.cos(anchor.yaw);
        // the near side: the near space's centre, else the link's point, else against the way to `past`
        const fc = Array.isArray(info.fromC) ? info.fromC : null;
        let s = fc ? Math.sign((fc[0] - c[0]) * nx + (fc[2] - c[2]) * nz) : 0;
        if (s === 0 && at) {
          const d = (at[0] - c[0]) * nx + (at[2] - c[2]) * nz;
          if (Math.abs(d) > 0.1) s = Math.sign(d);
        }
        if (s === 0) s = -Math.sign(g.face[0] * nx + g.face[1] * nz) || 1;
        g.stand = [c[0] + nx * s * WINDOW_STAND_M, at ? at[1] : c[1], c[2] + nz * s * WINDOW_STAND_M];
        g.face = [-nx * s, -nz * s];
        g.sideC = [c[0], c[2]];
      }
      break;
    case 'hatch':
      g.down = g.toY !== null && at ? g.toY < at[1] : false;
      break;
    case 'duct':
      g.want = 'duct:side';
      if (anchor) {
        const ref = at ?? anchor.entry.pos;
        const de = hyp2(anchor.entry.pos[0] - ref[0], anchor.entry.pos[2] - ref[2]);
        const dx = hyp2(anchor.exit.pos[0] - ref[0], anchor.exit.pos[2] - ref[2]);
        const m = de <= dx ? anchor.entry : anchor.exit;
        const f = de <= dx ? anchor.exit : anchor.entry;
        g.mouth = [m.pos[0], m.pos[2]];
        g.far = [f.pos[0], f.pos[2]];
        g.end = [f.pos[0], f.pos[1], f.pos[2]];
        if (m.where === 'wall' || m.where === undefined) {
          g.stand = [m.pos[0] + m.nx * DUCT_STAND_M, m.pos[1], m.pos[2] + m.nz * DUCT_STAND_M];
          g.face = unit2(-m.nx, -m.nz);
        } else {
          g.stand = [m.pos[0], m.pos[1], m.pos[2]];
          g.face = unit2(f.pos[0] - m.pos[0], f.pos[2] - m.pos[2]);
        }
      } else if (past) g.far = [past[0], past[2]];
      break;
    default:
      break;
  }
  return g;
}

/** The step's limit (s, null: none): the link's `limit_s` from R1 when set, else R3's `stepLimit` (a ladder by its
 *  `level_change`, a duct by its `length`; a rappel, or a duct with no length, has none: the stall watch). */
export function limitFor(kind, link) {
  if (num(link.limit_s)) return link.limit_s;
  const m = kind === 'ladder' ? link.level_change ?? link.length : link.length;
  return stepLimit(kind, num(m) ? m : null);
}

// ---------------------------------------------------------------------------------------------------------------
// The step machines (pure): `update(reading, t)` with `t` the game seconds since the step started
// ---------------------------------------------------------------------------------------------------------------

/**
 * The shared part: the output (`stick` [x right, y forward], `press` (buttons down for one poll), `hold` (down while
 * listed), `done`, `result`), the walk to the stand point and the push toward the move, the limit (R3 `StuckWatch`
 * step) or, with none, the 8 s stall watch on the 3D progress along start -> stand point -> far end (R3 `PathProgress`:
 * the nearest point, monotonic, so the push back and forth at the stand point is no progress).
 */
class StepMachine {
  constructor(geo, limit, opts = {}) {
    this.geo = geo;
    this.limit = num(limit) ? limit : null;
    this.mag = num(opts.stick) ? opts.stick : DEFAULT_STICK;
    this.out = { stick: [0, 0], press: [], hold: [], done: false, result: null };
    this.watch = new StuckWatch();
    this.phase = 'approach';
    this.since = 0;
    this.begun = false;
    this.arrived = false;
    this.x0 = 0;
    this.y0 = 0;
    this.z0 = 0;
    this.prog = null;
    this.sx = 0;
    this.sz = 0;
    this._d = { x: 0, y: 0 };
  }

  update(r, t) {
    const o = this.out;
    if (o.done) return o;
    o.stick[0] = 0;
    o.stick[1] = 0;
    o.press.length = 0;
    o.hold.length = 0;
    if (!this.begun) this.begin(r, t);
    this.step(r, t, o);
    if (!o.done) {
      if (this.limit !== null) {
        if (this.watch.update(t, 0) === WATCH_STEP_TIMEOUT) this.finish(t, WATCH_STEP_TIMEOUT, 'limit');
      } else if (this.watch.update(t, this.prog.update(r.x, r.y, r.z)) === WATCH_STALL) this.finish(t, WATCH_STEP_TIMEOUT, 'stall');
    }
    if (o.done) {
      o.stick[0] = 0;
      o.stick[1] = 0;
      o.press.length = 0;
      o.hold.length = 0;
    }
    return o;
  }

  begin(r, t) {
    this.begun = true;
    this.x0 = r.x;
    this.y0 = r.y;
    this.z0 = r.z;
    const s = this.geo.stand;
    this.sx = s ? s[0] : r.x;
    this.sz = s ? s[2] : r.z;
    if (this.limit !== null) this.watch.step(t, this.limit);
    else {
      // (once per step: the progress path start -> stand point -> far end)
      const pts = [{ x: r.x, y: r.y, z: r.z }];
      if (s) pts.push({ x: s[0], y: s[1], z: s[2] });
      const e = this.geo.end;
      if (e) pts.push({ x: e[0], y: e[1], z: e[2] });
      this.prog = new PathProgress(makePath(pts));
      this.watch.walk(t, 0);
    }
    this.since = t;
  }

  to(phase, t) {
    this.phase = phase;
    this.since = t;
  }

  finish(t, outcome, why) {
    const o = this.out;
    o.done = true;
    o.result = { outcome, t: Math.round(t * 100) / 100, phase: this.phase, why, limit_s: this.limit };
  }

  steer(o, r, dx, dz, mag) {
    stickToward(dx, dz, r.camYaw, this._d);
    o.stick[0] = this._d.x * mag;
    o.stick[1] = this._d.y * mag;
  }

  /** Push toward the move (the hint reads the stick's direction; src/player/traversal.ts `probeDir`). */
  push(o, r) {
    const f = this.geo.face;
    if (f[0] !== 0 || f[1] !== 0) this.steer(o, r, f[0], f[1], this.mag);
  }

  /** To the stand point, then the push; walked back to the point once the push has gone `PUSH_MAX_M` from it. */
  approach(r, o) {
    const dx = this.sx - r.x;
    const dz = this.sz - r.z;
    const d = hyp2(dx, dz);
    if (this.arrived && d > PUSH_MAX_M) this.arrived = false;
    if (!this.arrived && d > ARRIVE_M) {
      this.steer(o, r, dx, dz, this.mag);
      return;
    }
    this.arrived = true;
    this.push(o, r);
  }

  /** A storey change is expected (the far floor is known and on another storey than the start). */
  storeyChange() {
    const toY = this.geo.toY;
    return toY !== null && Math.abs(toY - this.y0) > STOREY_Y_TOL_M;
  }

  /** On the far floor (within R3's `STOREY_Y_TOL_M` of it), or with none known a storey up / down from the start. */
  onFar(r) {
    if (this.storeyChange()) return Math.abs(r.y - this.geo.toY) <= STOREY_Y_TOL_M;
    return this.geo.down ? r.y < this.y0 - STOREY_MOVE_M : r.y > this.y0 + STOREY_MOVE_M;
  }

  /** Past the move's plane (`sideC` along `face`) by `PAST_SIDE_M`. */
  pastSide(r) {
    const c = this.geo.sideC;
    const f = this.geo.face;
    if (!c || (f[0] === 0 && f[1] === 0)) return false;
    return (r.x - c[0]) * f[0] + (r.z - c[1]) * f[1] > PAST_SIDE_M;
  }
}

/** Ladder (e2e-traverse:152-218): at the foot (or the top, down) until the hint, Y, the stick up (down) while attached,
 *  done detached and grounded on the far floor. A top-out ends crouched; the walk after it stays crouched (sneak). */
export class LadderStep extends StepMachine {
  step(r, t, o) {
    const g = this.geo;
    switch (this.phase) {
      case 'approach':
        if (r.hint === g.want) {
          this.push(o, r);
          o.press.push(BTN.Y);
          this.to('mount', t);
          return;
        }
        this.approach(r, o);
        return;
      case 'mount':
        if (!r.attached) {
          if (t - this.since >= REPRESS_S - 1e-9) this.to('approach', t);
          return;
        }
        this.to('climb', t);
      // falls through
      case 'climb':
        if (r.attached) {
          o.stick[1] = g.down ? -CLIMB_STICK : CLIMB_STICK;
          return;
        }
        this.to('off', t);
      // falls through
      default:
        if (!r.grounded) return;
        if (this.onFar(r)) {
          this.finish(t, 'walked', null);
          return;
        }
        this.arrived = false;
        this.to('approach', t);
    }
  }
}

/** Drop (one way; e2e-traverse:319-332): to the link's point, then on past the edge toward the far side; done grounded
 *  on the lower floor. A walk-off that stalls at the edge with `ledge:above` offered: B held to lower into a hang, B
 *  tapped to let go. No height threshold of its own: the stall decides. */
export class DropStep extends StepMachine {
  constructor(geo, limit, opts) {
    super(geo, limit, opts);
    this.ex = 0;
    this.ez = 0;
    this.et = 0;
  }

  step(r, t, o) {
    if (!r.attached && r.grounded && this.onFar(r)) {
      this.finish(t, 'walked', null);
      return;
    }
    switch (this.phase) {
      case 'approach': {
        if (!r.grounded) {
          this.to('fall', t);
          return;
        }
        const dx = this.sx - r.x;
        const dz = this.sz - r.z;
        if (hyp2(dx, dz) > ARRIVE_M) {
          this.steer(o, r, dx, dz, this.mag);
          return;
        }
        this.to('off', t);
        this.ex = r.x;
        this.ez = r.z;
        this.et = t;
      }
      // falls through
      case 'off':
        if (!r.grounded) {
          this.to('fall', t);
          return;
        }
        this.push(o, r);
        if (hyp2(r.x - this.ex, r.z - this.ez) > EDGE_STALL_M) {
          this.ex = r.x;
          this.ez = r.z;
          this.et = t;
        } else if (t - this.et >= EDGE_STALL_S - 1e-9 && r.hint === 'ledge:above') {
          // the edge stops the walk: hold B to lower into a hang (e2e-traverse:319-332)
          this.to('lower', t);
          o.stick[0] = 0;
          o.stick[1] = 0;
          o.hold.push(BTN.B);
        }
        return;
      case 'lower':
        if (t - this.since < HANG_HOLD_S - 1e-9) o.hold.push(BTN.B);
        else this.to('hang', t);
        return;
      case 'hang':
        if (r.attached && r.kind === 'ledge') {
          o.press.push(BTN.B);
          this.to('fall', t);
        } else if (t - this.since >= HANG_WAIT_S - 1e-9) this.to('approach', t);
        return;
      default:
        // falling (or letting go): wait for the floor; still hanging after the wait, B again
        if (r.attached) {
          if (t - this.since >= HANG_WAIT_S - 1e-9) {
            o.press.push(BTN.B);
            this.since = t;
          }
          return;
        }
        if (r.grounded) this.to('approach', t);
    }
  }
}

/** Window (e2e-traverse:415-431): at the frame until the vault is offered, Y; done grounded past the sill. A glazed
 *  window shatters as the robot goes through (loud): that is the route. */
export class WindowStep extends StepMachine {
  offered(r) {
    return !!r.prompt || (r.hint !== null && r.hint.startsWith('window:'));
  }

  across(r) {
    return this.pastSide(r);
  }

  step(r, t, o) {
    if (this.phase === 'approach') {
      if (this.offered(r)) {
        this.push(o, r);
        o.press.push(BTN.Y);
        this.to('through', t);
        return;
      }
      this.approach(r, o);
      return;
    }
    // through: a climb-through the game attaches for is climbed on (stick forward)
    if (r.attached) {
      o.stick[1] = CLIMB_STICK;
      return;
    }
    const still = r.grounded && (r.tkind === null || r.tkind === 'none');
    if (still && this.across(r)) {
      this.finish(t, 'walked', null);
      return;
    }
    if (still && t - this.since >= REPRESS_S - 1e-9) {
      this.arrived = false;
      this.to('approach', t);
    }
  }
}

/** Hatch: as a window, through the climb-through the game offers there (any hint or prompt); done grounded on the far
 *  floor (or past the hatch when it joins one storey). Never offered by the limit: `step-timeout`. */
export class HatchStep extends WindowStep {
  offered(r) {
    return r.hint !== null || !!r.prompt;
  }

  across(r) {
    return this.storeyChange() ? this.onFar(r) : this.pastSide(r);
  }
}

/** Duct (e2e-traverse:433-502): at the mouth until `duct:side`, Y then A held until attached in the duct (the grate
 *  unscrews quietly), the stick forward while attached, done detached and grounded past the far end. */
export class DuctStep extends StepMachine {
  pastEnd(r) {
    const g = this.geo;
    if (this.storeyChange() && !this.onFar(r)) return false;
    if (g.mouth && g.far) return hyp2(r.x - g.far[0], r.z - g.far[1]) < hyp2(r.x - g.mouth[0], r.z - g.mouth[1]);
    return this.storeyChange() || this.pastSide(r);
  }

  step(r, t, o) {
    const inDuct = r.attached && r.kind === 'duct';
    switch (this.phase) {
      case 'approach':
        if (r.hint === this.geo.want) {
          this.push(o, r);
          o.press.push(BTN.Y);
          o.hold.push(BTN.A);
          this.to('unscrew', t);
          return;
        }
        this.approach(r, o);
        return;
      case 'unscrew':
        if (!inDuct) {
          if (t - this.since < UNSCREW_MAX_S - 1e-9) o.hold.push(BTN.A);
          else this.to('enter', t);
          return;
        }
        this.to('crawl', t);
        break;
      case 'enter':
        if (!inDuct) {
          if (t - this.since >= ENTER_WAIT_S - 1e-9) {
            this.arrived = false;
            this.to('approach', t);
          }
          return;
        }
        this.to('crawl', t);
        break;
      default:
        break;
    }
    if (this.phase === 'crawl') {
      if (r.attached) {
        o.stick[1] = CLIMB_STICK;
        return;
      }
      this.to('out', t);
    }
    if (!r.grounded) return;
    if (this.pastEnd(r)) {
      this.finish(t, 'walked', null);
      return;
    }
    this.arrived = false;
    this.to('approach', t);
  }
}

/** Rappel (e2e-ct-warehouse:125-146): at the roof edge until `rappel:above`, Y, wait for the hook (attached, `rappel`,
 *  phase `on`), the stick back to descend, done detached and grounded on the lower floor. A descent that stops short of
 *  the floor lets go (B). A window kick-through on the way is not part of this step. */
export class RappelStep extends StepMachine {
  constructor(geo, limit, opts) {
    super(geo, limit, opts);
    this.ly = 0;
    this.lt = 0;
  }

  step(r, t, o) {
    switch (this.phase) {
      case 'approach':
        if (r.hint === this.geo.want) {
          this.push(o, r);
          o.press.push(BTN.Y);
          this.to('hook', t);
          return;
        }
        this.approach(r, o);
        return;
      case 'hook':
        if (!(r.attached && r.kind === 'rappel' && r.phase === 'on')) {
          if (!r.attached && t - this.since >= HOOK_WAIT_S - 1e-9) {
            this.arrived = false;
            this.to('approach', t);
          }
          return;
        }
        this.to('descend', t);
        this.ly = r.y;
        this.lt = t;
      // falls through
      case 'descend':
        if (r.attached) {
          o.stick[1] = -CLIMB_STICK;
          if (r.y < this.ly - DESCEND_MIN_M) {
            this.ly = r.y;
            this.lt = t;
          } else if (t - this.lt >= DESCEND_STALL_S - 1e-9) {
            o.press.push(BTN.B);
            this.lt = t;
          }
          return;
        }
        this.to('off', t);
      // falls through
      default:
        if (!r.grounded) return;
        if (this.onFar(r)) {
          this.finish(t, 'walked', null);
          return;
        }
        this.arrived = false;
        this.to('approach', t);
    }
  }
}

const MACHINES = { ladder: LadderStep, drop: DropStep, window: WindowStep, hatch: HatchStep, duct: DuctStep, rappel: RappelStep };

/** The machine for a kind (null for a kind with no step). `opts.stick`: the approach stick (the run's pace). */
export function makeMachine(kind, geo, limit, opts = {}) {
  const M = MACHINES[kind];
  return M ? new M(geo, limit, opts) : null;
}

// ---------------------------------------------------------------------------------------------------------------
// The code-climb classifier (pure)
// ---------------------------------------------------------------------------------------------------------------

/**
 * A code route's `climbs` leg from `a` to `b` (`[x, y, z]`; `src/game/sectors.ts` SectorRoute) and the page's anchors
 * near it (`{ ladders, windows, ducts, rappels }` in the reader's plain shape): a ladder within `CLIMB_NEAR_M` of either
 * end -> ladder; else a window -> window; a duct -> duct; a rappel -> rappel; else the end more than `CLIMB_DROP_M`
 * below the start -> drop; else no kind (the leg stays a stub). Returns `{ kind, anchor, lengthM }`.
 */
export function classifyClimb(a, b, anchors) {
  if (!Array.isArray(a) || !Array.isArray(b)) return { kind: null, anchor: null, lengthM: null };
  for (const kind of ['ladder', 'window', 'duct', 'rappel']) {
    const na = nearestAnchor(kind, anchors, a[0], a[2], CLIMB_NEAR_M);
    const nb = nearestAnchor(kind, anchors, b[0], b[2], CLIMB_NEAR_M);
    const near = na && nb ? (anchorDist(kind, na, a[0], a[2]) <= anchorDist(kind, nb, b[0], b[2]) ? na : nb) : na ?? nb;
    if (!near) continue;
    let lengthM = null;
    if (kind === 'ladder') lengthM = Math.abs(near.top[1] - near.base[1]);
    else if (kind === 'duct' && num(near.length)) lengthM = near.length;
    return { kind, anchor: near, lengthM };
  }
  if (num(a[1]) && num(b[1]) && a[1] - b[1] > CLIMB_DROP_M) return { kind: 'drop', anchor: null, lengthM: a[1] - b[1] };
  return { kind: null, anchor: null, lengthM: null };
}

// ---------------------------------------------------------------------------------------------------------------
// The page reader. `stepPage` is serialised with `toString()` and run in the page: it may use only the page's globals.
// ---------------------------------------------------------------------------------------------------------------

/* global window */
function stepPage() {
  const app = window.__app;
  const pad = window.__pad;
  // the one reading, refilled every poll (the fields scripts/e2e-traverse.mjs `info()` reads)
  const R = {
    t: 0, x: 0, y: 0, z: 0, yaw: 0, camYaw: 0, grounded: false, crouched: false, attached: false, kind: null, phase: null, s: 0,
    hintKind: null, hintEntry: null, prompt: null, dropPrompt: null, vent: -1, tkind: null,
  };
  let down = 0;

  function read() {
    const g = app.current;
    const pl = g.player;
    const c = pl.controller;
    const p = pl.position;
    R.t = g.time;
    R.x = p.x;
    R.y = p.y;
    R.z = p.z;
    R.yaw = c.yaw ?? 0;
    R.camYaw = pl.cam ? pl.cam.yaw : 0;
    R.grounded = !!c.grounded;
    R.crouched = !!c.crouched;
    const tr = g.traversal;
    const ac = tr ? tr.attachCtl : null;
    const m = ac ? ac.m : null;
    const a = m ? m.anchor : null;
    R.attached = !!(ac && ac.active);
    R.kind = a ? a.kind : null;
    R.phase = m ? m.phase ?? null : null;
    R.s = m ? m.s ?? 0 : 0;
    const h = ac ? ac.hint || ac.lower : null;
    R.hintKind = h ? h.anchor.kind : null;
    R.hintEntry = h ? h.entry : null;
    const w = g.hud ? g.hud.world : null;
    R.prompt = w ? w.label('vault') || null : null;
    R.dropPrompt = w ? w.label('drop') || null : null;
    R.vent = ac && ac.vent ? ac.vent.progress : -1;
    R.tkind = tr ? tr.kind ?? null : null;
    return R;
  }

  /** Buttons as a bit mask (bit = the pad button index): only the changed ones are set. */
  function buttons(mask) {
    if (mask === down) return;
    for (let b = 0; b < 16; b++) {
      const bit = 1 << b;
      if ((mask & bit) !== (down & bit)) pad.set(b, mask & bit ? 1 : 0);
    }
    down = mask;
  }

  /** The stick (the game's frame, y forward; the pad's axis 1 is +down) and the buttons for the next advance. */
  function input(ax, ay, press, hold) {
    pad.axis(0, ax);
    pad.axis(1, -ay);
    buttons(press | hold);
  }

  /** After an advance: a press is released (down for one poll), a hold stays; the reading. */
  function after(press, hold) {
    buttons(hold);
    return read();
  }

  /** The game advanced through the route-run driver (its guard poll and no-damage run every chunk), else headless. */
  function advance(dt) {
    const rr = window.__rr;
    if (rr) rr.tick(dt);
    else app.loop.stepHeadless(dt);
  }

  const P = (v) => [v.x, v.y, v.z];
  const grate = (e) => ({ pos: P(e.pos), nx: e.nx, nz: e.nz, where: e.where });

  return {
    read,
    input,
    after,
    /** The step's start: the driver idle (no walk, no hold of its own on the pad), the pad at rest for one poll. */
    begin(dt) {
      const rr = window.__rr;
      app.loop.manual = true;
      if (rr) {
        // (a hold that ends at once: the next tick turns the driver idle without stepping)
        rr.holdStart(0);
        rr.tick(1);
      }
      input(0, 0, 0, 0);
      advance(dt);
      return read();
    },
    poll(ax, ay, press, hold, dt) {
      input(ax, ay, press, hold);
      advance(dt);
      return after(press, hold);
    },
    /** Every button up, the stick at rest. */
    release() {
      input(0, 0, 0, 0);
      return read();
    },
    /** The ladders, windows, ducts and rappel points with a key point within `r` (plan) of (ax, az) or (bx, bz), in
     *  plain shapes (once per step; allocates). */
    anchors(ax, az, bx, bz, r) {
      const w = app.current.world;
      const L = w && w.level ? w.level.anchors : null;
      const out = { ladders: [], windows: [], ducts: [], rappels: [] };
      if (!L) return out;
      const near = (v) => Math.min(Math.sqrt((v.x - ax) ** 2 + (v.z - az) ** 2), Math.sqrt((v.x - bx) ** 2 + (v.z - bz) ** 2)) <= r;
      for (const l of L.ladders ?? []) if (near(l.base) || near(l.top)) out.ladders.push({ id: l.id, base: P(l.base), top: P(l.top), facing: l.facing });
      for (const q of L.windows ?? []) if (near(q.c)) out.windows.push({ id: q.id, c: P(q.c), w: q.w, h: q.h, yaw: q.yaw, sill: q.sillHeight, open: q.open });
      for (const d of L.ducts ?? []) {
        if (!near(d.entry.pos) && !near(d.exit.pos)) continue;
        let length = 0;
        for (let i = 1; i < d.path.length; i++) {
          const u = d.path[i];
          const v = d.path[i - 1];
          length += Math.sqrt((u.x - v.x) ** 2 + (u.y - v.y) ** 2 + (u.z - v.z) ** 2);
        }
        out.ducts.push({ id: d.id, entry: grate(d.entry), exit: grate(d.exit), length });
      }
      for (const q of L.rappels ?? []) if (near(q.top)) out.rappels.push({ id: q.id, top: P(q.top), nx: q.nx, nz: q.nz, length: q.length });
      return out;
    },
  };
}

/** The in-page reader script (installed once per page as `window.__rrStep`). */
export function stepPageScript() {
  return `(() => {\nwindow.__rrStep = window.__rrStep || (${stepPage.toString()})();\nreturn true;\n})()`;
}

// ---------------------------------------------------------------------------------------------------------------
// Node side: one robot through one machine, then the steps of the table
// ---------------------------------------------------------------------------------------------------------------

const call = (page, name, ...args) => page.evaluate(([n, a]) => window.__rrStep[n](...a), [name, args]);

/** The reading as the machines read it: `hint` is `"<anchor kind>:<entry>"` (`attachCtl.hint`, else `.lower`) or null. */
export function withHint(r) {
  r.hint = r.hintKind == null ? null : `${r.hintKind}:${r.hintEntry}`;
  return r;
}

function maskOf(list) {
  let m = 0;
  for (let i = 0; i < list.length; i++) m |= 1 << list[i];
  return m;
}

/** R4b's both-pages clock (`ctx.clock(dt)` or `ctx.clock.step(dt)`), or null (R4a: the page's own driver ticks). */
function clockOf(ctx) {
  if (typeof ctx?.clock === 'function') return (dt) => ctx.clock(dt);
  if (typeof ctx?.clock?.step === 'function') return (dt) => ctx.clock.step(dt);
  return null;
}

/** Drive `machine` on `page` until it is done (or `STEP_CAP_S`): its result. */
export async function drive(ctx, page, machine) {
  const clock = clockOf(ctx);
  await page.evaluate(stepPageScript());
  let r = withHint(await call(page, 'begin', STEP_POLL_S));
  const t0 = r.t;
  let hookT = 0;
  for (;;) {
    const t = r.t - t0;
    const o = machine.update(r, t);
    if (o.done || t > STEP_CAP_S) {
      await call(page, 'release');
      return o.done ? o.result : { outcome: WATCH_STEP_TIMEOUT, t: Math.round(t * 100) / 100, phase: machine.phase, why: 'cap', limit_s: machine.limit };
    }
    const p = maskOf(o.press);
    const h = maskOf(o.hold);
    if (clock) {
      await call(page, 'input', o.stick[0], o.stick[1], p, h);
      await clock(STEP_POLL_S);
      r = await call(page, 'after', p, h);
    } else r = await call(page, 'poll', o.stick[0], o.stick[1], p, h, STEP_POLL_S);
    withHint(r);
    if (t - hookT >= HOOK_EVERY_S) {
      hookT = t;
      await ctx.driver?.onChunk?.();
    }
  }
}

/** One robot's take of a step on its page: the anchor (`anchor` given, else the nearest of the kind to the link's
 *  point), the geometry, the limit, the machine; the result with `robot`, `kind` and the anchor's id. */
async function oneRobot(ctx, page, robot, kind, link, anchor) {
  await page.evaluate(stepPageScript());
  const at = Array.isArray(link.at) ? link.at : null;
  let a = anchor ?? null;
  if (a === null && at && Object.hasOwn(LISTS, kind)) a = nearestAnchor(kind, await call(page, 'anchors', at[0], at[2], at[0], at[2], ANCHOR_NEAR_M), at[0], at[2]);
  const points = ctx.driver?.points ?? null;
  const toY = floorOf(points, link.to) ?? (Array.isArray(link.past) && num(link.past[1]) ? link.past[1] : null);
  const geo = geometry(kind, link, a, { toY, fromC: centreOf(points, link.from) });
  const machine = makeMachine(kind, geo, limitFor(kind, link), { stick: ctx.driver?.opts?.stick });
  const res = await drive(ctx, page, machine);
  return { ...res, robot, kind, anchor: a ? a.id ?? null : null };
}

/** The step for a kind: the leader (host) takes it, then (with `ctx.client`, R4b) the follower on its own page with its
 *  own machine and limit; the first that does not walk it is the result (a follower stop names `robot: 'follower'`). */
export function robotStep(kind) {
  return async function step(ctx, link, anchor = null) {
    const lead = await oneRobot(ctx, ctx.host, 'host', kind, link, anchor);
    if (lead.outcome !== 'walked' || !ctx.client) return lead;
    return oneRobot(ctx, ctx.client, 'follower', kind, link, anchor);
  };
}

export const ladder = robotStep('ladder');
export const drop = robotStep('drop');
export const windowStep = robotStep('window');
export const hatch = robotStep('hatch');
export const duct = robotStep('duct');
export const rappel = robotStep('rappel');

/** The hold and the placement past the link (BRIEF "Co-op links"), with the reason. */
async function holdStub(ctx, link, why) {
  const hold = typeof link.hold_s === 'number' && link.hold_s > 0 ? link.hold_s : 0;
  await ctx.driver.hold(hold);
  await ctx.driver.place(link.past ?? link.at);
  return { outcome: 'stub', stub: { link: link.index, kind: link.kind, hold_s: hold, why } };
}

/**
 * The stub (BRIEF "Co-op links"): the robots stand at the link's near side (the driver walked them to its `at` point),
 * crouched in the live guard field, for the link's hold; then they are placed on its far side (`past`). Logged by link
 * with its hold, never counted as walked.
 */
export async function stub(ctx, link) {
  return holdStub(ctx, link, COOP_KINDS.has(link.kind) ? STUB_WHY_COOP : STUB_WHY_SOLO);
}

/** A rare solo kind with no step yet (BRIEF "Solo off-nav links"): stubbed as R4a holds, listed by kind. */
export async function rareStub(ctx, link) {
  return holdStub(ctx, link, `${STUB_WHY_RARE}: ${link.kind}`);
}

/** A code route's climb leg (`--routes code`): classified from the page's anchors near it, then that kind's step; an
 *  unclassified leg stays a stub. The result carries `climb` (the kind it was taken as). */
export async function climb(ctx, link) {
  await ctx.host.evaluate(stepPageScript());
  const a = Array.isArray(link.at) ? link.at : null;
  const b = Array.isArray(link.past) ? link.past : null;
  const anchors = a && b ? await call(ctx.host, 'anchors', a[0], a[2], b[0], b[2], CLIMB_NEAR_M) : null;
  const c = classifyClimb(a, b, anchors);
  if (!c.kind) return holdStub(ctx, link, STUB_WHY_CLIMB);
  const leg = { ...link, kind: c.kind, action: c.kind, limit_s: stepLimit(c.kind, c.lengthM) };
  if (c.kind === 'ladder') leg.level_change = c.lengthM;
  else if (c.lengthM !== null) leg.length = c.lengthM;
  const r = await robotStep(c.kind)(ctx, leg, c.anchor);
  return { ...r, climb: c.kind };
}

/** Action -> step (R1's `action`: the kind's own name for every solo off-nav kind). */
export const STEPS = {
  ladder,
  drop,
  window: windowStep,
  hatch,
  duct,
  rappel,
  ledge: rareStub,
  pipe: rareStub,
  wall_jump: rareStub,
  split_jump: rareStub,
};

/** The step for a link step: a co-op kind `stub` (R9 takes them), a code climb `climb`, else the table by the step's
 *  `action`; a step with no action, or an action with no entry, `stub`. */
export function stepFor(link) {
  if (COOP_KINDS.has(link.kind)) return stub;
  if (link.kind === CODE_CLIMB) return climb;
  const a = link.action;
  return typeof a === 'string' && Object.hasOwn(STEPS, a) ? STEPS[a] : stub;
}
