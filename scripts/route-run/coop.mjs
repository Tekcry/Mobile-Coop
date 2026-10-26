// Route-run co-op moves (J13 R9, docs/route-runs/PLAN.md "R9 Real co-op moves"; BRIEF "Co-op links", A1, Q1): the
// co-op kinds' link steps (steps.mjs `stepFor` sends every co-op kind here). Two kinds are real two-robot moves, the
// sequences of the game's own co-op suites (scripts/e2e-ctcourse.mjs `legUp` / `pullUp`, scripts/e2e-sectorops.mjs parts
// 3-5 `legUp` / `relay` / `pullUp`), pressed on both pages' pads:
//   coop_boost   the leg-up: the follower (the client) crouches at the link's point facing the move and offers (B, then
//                RB), the leader (the host) 0.8 m behind takes it (RB), hangs on the lip and pulls up (Y). A boost lifts
//                one robot: the follower is then placed beside the leader's far spot (pair.mjs `recoverPast`), noted.
//   human_ladder the leg-up, then the ledge relay: the hanging leader offers (RB), the follower climbs it (RB) onto the
//                same lip, the leader pulls up, then the follower. Both robots really cross.
// Every other co-op kind stays a stub (`STUB_KINDS`, BRIEF A1): no helper in those suites scripts it (team_pull, shutter
// and pair_gate have none in e2e-sectorops parts 3-5; team_rope, team_throw, team_hang, vent_unlock and the A25 moves
// are out of R9's brief). A real kind is stubbed too at one robot, inside a split leg (one robot of the pair), with no
// link point or far point, or when the run asks for stubs (`ctx.coop === 'stub'`, or a selftest fixture's
// `expect.coop: "stub"`: the pair selftest keeps A1's stub path).
//
// Limits: each phase waits at most its cap (game s, `PHASE_CAPS`: the suites' waits, tool tolerances like BRIEF A4's);
// a phase past its cap is a `step-timeout` stop naming the phase and why (a leg-up with no lip in reach: phase `take`).
// The robots' placing phases (`back`, `in`, `face`, `close`, `stand`) go on at their caps (the take shows it). A course
// restart during the move (`ctx.driver.takeCourse()`, J13 hold restart) ends it with outcome 'course', both pads let go.
// Hot path: `update` allocates nothing (the machine's own output arrays); the page reader refills one reading.
import { COOP_KINDS } from '../level-validate.mjs';
import { STOREY_Y_TOL_M, stickToward } from './progress.mjs';
import { STEP_CAP_S, STEP_MAX_POLLS, STEP_POLL_S, floorOf, stickOf, stub } from './steps.mjs';

/** The pad buttons the moves press (scripts/e2e-ctcourse.mjs: B crouches, RB is the Co-op action, Y pulls up). */
export const PAD = { B: 1, Y: 3, RB: 5 };
/** The co-op kinds walked as real moves, and the ones that stay stubs (listed in the report's co-op stubs). */
export const REAL_KINDS = ['coop_boost', 'human_ladder'];
export const STUB_KINDS = [...COOP_KINDS].filter((k) => !REAL_KINDS.includes(k));

/** The climber stands this far (m) behind the booster (e2e-ctcourse `legUp`: the host 0.8 m behind). */
export const CLIMBER_BACK_M = 0.8;
/** A robot is on its spot within this (m, plan), steered there at this stick. */
export const SPOT_M = 0.2;
export const SPOT_STICK = 0.4;
/** The booster's last push toward the move (so it faces it: the boost target is looked for that way first). */
export const FACE_S = 0.3;
export const FACE_STICK = 0.3;
/** With no far floor known, a lift is a rise of this much (m) over the start. */
export const LIFT_MIN_M = 1;

/** Each phase's cap (game s) and, for a phase that is a stop at its cap, why. From the suites' waits: the offer seen in
 *  8 s, the hang in 12 s, the booster free in 20 s; a held button's effect in 5 s; a pull-up or a relay climb in 10 s. */
export const PHASE_CAPS = {
  back: { cap: 8 },
  in: { cap: 8 },
  face: { cap: FACE_S },
  close: { cap: 8 },
  stand: { cap: 3 },
  crouch: { cap: 5, why: 'the booster did not crouch' },
  offer: { cap: 5, why: 'the booster did not offer the leg-up' },
  take: { cap: 8, why: 'no lip in reach of the leg-up' },
  boost: { cap: 5, why: 'the climber did not take the leg-up' },
  hang: { cap: 12, why: 'the climber did not hang on a lip' },
  free: { cap: 20, why: 'the booster was not free again' },
  relayOffer: { cap: 5, why: 'the hanging leader did not offer the relay' },
  relaySee: { cap: 8, why: 'the follower was not offered the relay' },
  relayTake: { cap: 5, why: 'the follower did not take the relay' },
  relayHang: { cap: 10, why: 'the follower did not hang on the same lip' },
  relayFree: { cap: 8, why: 'the leader was not free and hanging after the relay' },
  pullLead: { cap: 10, why: 'the leader did not pull up onto the top' },
  pullFollow: { cap: 10, why: 'the follower did not pull up onto the top' },
};
const LEG_UP = ['back', 'in', 'face', 'close', 'stand', 'crouch', 'offer', 'take', 'boost', 'hang', 'free'];
const RELAY = ['relayOffer', 'relaySee', 'relayTake', 'relayHang', 'relayFree'];
/** The phases of each real kind, in order. */
export const PHASES = {
  coop_boost: [...LEG_UP, 'pullLead'],
  human_ladder: [...LEG_UP, ...RELAY, 'pullLead', 'pullFollow'],
};

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const r2 = (v) => Math.round(v * 100) / 100;

function hyp2(x, y) {
  return Math.sqrt(x * x + y * y);
}

/** The move's geometry from the link: `at` (the booster's spot), `face` (unit plan way from `at` to `past`), `toY` (the
 *  far floor, or null). Null when the link has no point or no far point. */
export function coopGeometry(link, toY = null) {
  const at = Array.isArray(link.at) ? link.at : null;
  const past = Array.isArray(link.past) ? link.past : null;
  if (!at || !past) return null;
  const dx = past[0] - at[0];
  const dz = past[2] - at[2];
  const l = hyp2(dx, dz);
  if (l < 1e-6) return null;
  return { at: [at[0], at[1], at[2]], face: [dx / l, dz / l], toY: num(toY) ? toY : null };
}

// ---------------------------------------------------------------------------------------------------------------
// The machine (pure): `update(L, F, t)` with the leader's and the follower's readings, `t` game s since the start
// ---------------------------------------------------------------------------------------------------------------

/**
 * One leg-up (and with `kind` 'human_ladder' the relay). Output per poll: each robot's `stick` ([x right, y forward])
 * and `mask` (pad buttons held down, bit = button index), `done`, `result` (`{ outcome, t, phase, why, limit_s, robot }`).
 * A phase whose condition holds moves on with every button up for that poll (a held button is let go as its effect
 * shows, as e2e `holdUntil`), so an offer is never cancelled by the press that made it.
 */
export class CoopMachine {
  constructor(kind, geo, opts = {}) {
    this.kind = kind;
    this.geo = geo;
    this.order = PHASES[kind];
    this.mag = num(opts.stick) ? Math.min(opts.stick, SPOT_STICK) : SPOT_STICK;
    this.out = { lead: { stick: [0, 0], mask: 0 }, follow: { stick: [0, 0], mask: 0 }, done: false, result: null };
    this.i = 0;
    this.phase = this.order[0];
    this.since = 0;
    this.begun = false;
    this.y0 = 0;
    this.n0 = 0;
    this.offered = false;
    this._d = { x: 0, y: 0 };
  }

  update(L, F, t) {
    const o = this.out;
    if (o.done) return o;
    this.clear();
    if (!this.begun) {
      this.begun = true;
      this.y0 = L.y;
      this.since = t;
    }
    if (L.offerAny) this.offered = true;
    const was = this.i;
    if (this.met(L, F)) this.next(L, F, t);
    else {
      this.act(L, F, o);
      const c = PHASE_CAPS[this.phase];
      if (t - this.since >= c.cap - 1e-9) {
        if (c.why) this.fail(t, this.whyOf(c));
        else this.next(L, F, t);
      }
    }
    if (o.done || this.i !== was) this.clear();
    return o;
  }

  clear() {
    const o = this.out;
    o.lead.stick[0] = 0;
    o.lead.stick[1] = 0;
    o.follow.stick[0] = 0;
    o.follow.stick[1] = 0;
    o.lead.mask = 0;
    o.follow.mask = 0;
  }

  /** The leader's spot behind a point (the booster's spot, or where the booster stands). */
  behind(x, z, axis) {
    const f = this.geo.face;
    return axis === 0 ? x - f[0] * CLIMBER_BACK_M : z - f[1] * CLIMBER_BACK_M;
  }

  near(r, x, z) {
    return hyp2(r.x - x, r.z - z) <= SPOT_M;
  }

  /** The phase's condition on this poll's readings. */
  met(L, F) {
    const g = this.geo;
    switch (this.phase) {
      case 'back':
        return this.near(L, this.behind(g.at[0], g.at[2], 0), this.behind(g.at[0], g.at[2], 2));
      case 'in':
        return this.near(F, g.at[0], g.at[2]);
      case 'close':
        return this.near(L, this.behind(F.x, F.z, 0), this.behind(F.x, F.z, 2));
      case 'stand':
        return !F.crouched;
      case 'crouch':
        return F.crouched;
      case 'offer':
        return F.team === 'offer';
      case 'take':
        return L.offerBoost;
      case 'boost':
        return L.boosts > this.n0;
      case 'hang':
        return L.attached && L.aphase === 'on' && L.akind === 'ledge';
      case 'free':
        return F.team === 'none';
      case 'relayOffer':
        return L.team === 'relayOffer';
      case 'relaySee':
        return F.offerRelay;
      case 'relayTake':
        return F.ladders > this.n0;
      case 'relayHang':
        return F.attached && F.aphase === 'on' && F.aid === L.aid;
      case 'relayFree':
        return L.team === 'none' && L.attached;
      case 'pullLead':
        return !L.attached && L.grounded;
      case 'pullFollow':
        return !F.attached && F.grounded;
      default:
        return false;
    }
  }

  /** The phase's pads while its condition does not hold. */
  act(L, F, o) {
    const g = this.geo;
    switch (this.phase) {
      case 'back':
        this.steer(o.lead, L, this.behind(g.at[0], g.at[2], 0) - L.x, this.behind(g.at[0], g.at[2], 2) - L.z, this.mag);
        return;
      case 'in':
        this.steer(o.follow, F, g.at[0] - F.x, g.at[2] - F.z, this.mag);
        return;
      case 'face':
        this.steer(o.follow, F, g.face[0], g.face[1], FACE_STICK);
        return;
      case 'close':
        this.steer(o.lead, L, this.behind(F.x, F.z, 0) - L.x, this.behind(F.x, F.z, 2) - L.z, this.mag);
        return;
      case 'crouch':
        o.follow.mask = 1 << PAD.B;
        return;
      case 'offer':
      case 'relayTake':
        o.follow.mask = 1 << PAD.RB;
        return;
      case 'boost':
      case 'relayOffer':
        o.lead.mask = 1 << PAD.RB;
        return;
      case 'pullLead':
        if (L.attached) o.lead.mask = 1 << PAD.Y;
        return;
      case 'pullFollow':
        if (F.attached) o.follow.mask = 1 << PAD.Y;
        return;
      default:
        return;
    }
  }

  steer(out, r, dx, dz, mag) {
    stickToward(dx, dz, r.camYaw, this._d);
    out.stick[0] = this._d.x * mag;
    out.stick[1] = this._d.y * mag;
  }

  next(L, F, t) {
    this.i++;
    if (this.i >= this.order.length) {
      this.end(L, F, t);
      return;
    }
    this.phase = this.order[this.i];
    this.since = t;
    if (this.phase === 'boost') this.n0 = L.boosts;
    else if (this.phase === 'relayTake') this.n0 = F.ladders;
  }

  /** On the far floor: within R3's `STOREY_Y_TOL_M` of it when known and on another storey, else lifted. */
  onFar(r) {
    const toY = this.geo.toY;
    if (toY !== null && Math.abs(toY - this.y0) > STOREY_Y_TOL_M) return Math.abs(r.y - toY) <= STOREY_Y_TOL_M;
    return r.y > this.y0 + LIFT_MIN_M;
  }

  end(L, F, t) {
    this.phase = 'top';
    if (!this.onFar(L)) {
      this.fail(t, 'the leader is not on the far floor', 'leader');
      return;
    }
    if (this.kind === 'human_ladder' && !this.onFar(F)) {
      this.fail(t, 'the follower is not on the far floor', 'follower');
      return;
    }
    const o = this.out;
    o.done = true;
    o.result = { outcome: 'walked', t: r2(t), phase: 'done', why: null, limit_s: null, robot: 'leader' };
  }

  whyOf(c) {
    if (this.phase === 'take' && !this.offered) return 'the climber was not offered the leg-up';
    return c.why;
  }

  /** A stop: the robot is the leader until it is up (both robots then placed past), then the follower. */
  fail(t, why, robot = null) {
    const o = this.out;
    o.done = true;
    const who = robot ?? (this.phase === 'pullFollow' ? 'follower' : 'leader');
    o.result = { outcome: 'step-timeout', t: r2(t), phase: this.phase, why, limit_s: PHASE_CAPS[this.phase]?.cap ?? null, robot: who };
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The page reader (each page: its own robot). Serialised with `toString()`: only the page's globals.
// ---------------------------------------------------------------------------------------------------------------

/* global window */
function coopPage() {
  const app = window.__app;
  const pad = window.__pad;
  const R = {
    t: 0, x: 0, y: 0, z: 0, camYaw: 0, grounded: false, crouched: false, attached: false, akind: null, aphase: null, aid: null,
    team: 'none', offerAny: false, offerBoost: false, offerRelay: false, boosts: 0, ladders: 0,
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
    R.camYaw = pl.cam ? pl.cam.yaw : 0;
    R.grounded = !!c.grounded;
    R.crouched = !!c.crouched;
    const tr = g.traversal;
    const at = tr ? tr.attach : null;
    const an = at ? at.anchor : null;
    R.attached = !!(tr && tr.attached);
    R.akind = an ? an.kind ?? null : null;
    R.aphase = at ? at.phase ?? null : null;
    R.aid = an ? an.id ?? null : null;
    const tm = g.team;
    const of = tm ? tm.offer : null;
    R.team = tm ? tm.state : 'none';
    R.offerAny = !!of;
    R.offerBoost = !!(of && of.boost);
    R.offerRelay = !!(of && of.relay);
    R.boosts = tm && tm.count ? tm.count.boosts : 0;
    R.ladders = tm && tm.count ? tm.count.ladders : 0;
    return R;
  }

  /** The stick (the game's frame, y forward; the pad's axis 1 is +down) and the buttons held (each set every poll: a
   *  pending driver tap cannot let one go). */
  function input(ax, ay, mask) {
    pad.axis(0, ax);
    pad.axis(1, -ay);
    for (let b = 0; b < 17; b++) {
      const bit = 1 << b;
      if (mask & bit) pad.set(b, 1);
      else if (down & bit) pad.set(b, 0);
    }
    down = mask;
  }

  return {
    read,
    input(ax, ay, mask) {
      input(ax, ay, mask);
      return true;
    },
    /** The move's start: the page's driver idle (a hold that ends at once), every button up, the crouch toggle cleared
     *  (both stand, as e2e `padReady`). */
    begin() {
      const rr = window.__rr;
      app.loop.manual = true;
      if (rr) rr.holdStart(0);
      down = (1 << 17) - 1;
      input(0, 0, 0);
      const c = app.current.player.controller;
      if (typeof c.clearCrouchToggle === 'function') c.clearCrouchToggle();
      return read();
    },
    release() {
      input(0, 0, 0);
      return read();
    },
    /** A move that did not finish (a stop, a restart): out of the team move and off the lip, as e2e `leg`'s cleanup. */
    abort() {
      input(0, 0, 0);
      const g = app.current;
      if (g.team && typeof g.team.end === 'function') g.team.end(true);
      if (g.traversal && typeof g.traversal.reset === 'function') g.traversal.reset();
      return read();
    },
  };
}

/** The in-page reader script (installed once per page as `window.__rrCoop`). */
export function coopPageScript() {
  return `(() => {\nwindow.__rrCoop = window.__rrCoop || (${coopPage.toString()})();\nreturn true;\n})()`;
}

const call = (page, name, ...args) => page.evaluate(([n, a]) => window.__rrCoop[n](...a), [name, args]);

// ---------------------------------------------------------------------------------------------------------------
// Node side
// ---------------------------------------------------------------------------------------------------------------

/**
 * Drive `machine` on both pages until it is done (or `STEP_CAP_S` game s, or `STEP_MAX_POLLS` polls). The game advances
 * only through `ctx.advance` (the pair's lockstep, the course hook each tick). A course event pending on the driver
 * (`ctx.driver.takeCourse()`) ends the move at once with outcome 'course'. A move that did not walk is aborted on both
 * pages (no team move, no hang left for the placement past the link).
 */
export async function driveCoop(ctx, machine) {
  const take = typeof ctx?.driver?.takeCourse === 'function' ? () => ctx.driver.takeCourse() : () => null;
  const pages = [ctx.host, ctx.client];
  for (const P of pages) await P.evaluate(coopPageScript());
  let L = await call(ctx.host, 'begin');
  let F = await call(ctx.client, 'begin');
  const t0 = L.t;
  const finish = async (res) => {
    for (const P of pages) await call(P, res.outcome === 'walked' ? 'release' : 'abort');
    return res;
  };
  for (let n = 0; ; n++) {
    const t = L.t - t0;
    if (take()) return finish({ outcome: 'course', t: r2(t), phase: machine.phase, why: 'course', limit_s: null });
    const o = machine.update(L, F, t);
    if (o.done) return finish(o.result);
    if (t > STEP_CAP_S || n >= STEP_MAX_POLLS) return finish({ outcome: 'step-timeout', t: r2(t), phase: machine.phase, why: 'cap', limit_s: STEP_CAP_S, robot: 'leader' });
    await call(ctx.host, 'input', o.lead.stick[0], o.lead.stick[1], o.lead.mask);
    await call(ctx.client, 'input', o.follow.stick[0], o.follow.stick[1], o.follow.mask);
    await ctx.advance(STEP_POLL_S);
    L = await call(ctx.host, 'read');
    F = await call(ctx.client, 'read');
  }
}

/** Whether this run walks a real kind here: two robots together (the pair, not inside a split leg), the run not asking
 *  for stubs (`ctx.coop`, else a selftest fixture's `expect.coop`). */
export function realHere(ctx) {
  const mode = ctx?.coop ?? ctx?.selftest?.coop ?? 'real';
  return mode !== 'stub' && !!ctx?.client && !!ctx?.pair && !ctx?.robot && typeof ctx?.advance === 'function';
}

/** One real kind's step: the machine on both pages; a boost's follower then placed beside the far spot (noted once). */
export function coopStep(kind) {
  return async function step(ctx, link) {
    const points = ctx.driver?.points ?? null;
    const toY = floorOf(points, link.to) ?? (Array.isArray(link.past) && num(link.past[1]) ? link.past[1] : null);
    const geo = coopGeometry(link, toY);
    if (!realHere(ctx) || !geo) return stub(ctx, link);
    const res = await driveCoop(ctx, new CoopMachine(kind, geo, { stick: stickOf(ctx) }));
    const out = { ...res, kind, move: kind === 'human_ladder' ? 'leg-up and relay' : 'leg-up' };
    if (res.outcome !== 'walked' || kind !== 'coop_boost') return out;
    // a boost lifts one robot: the follower beside the leader's far spot (pair.mjs, as after a follower's stop)
    await ctx.pair.recoverPast(link, 'follower');
    const note = `link ${link.index} (coop_boost): the leg-up lifted the leader; the follower was placed beside it (a boost lifts one robot)`;
    if (Array.isArray(ctx.notes) && !ctx.notes.includes(note)) ctx.notes.push(note);
    return { ...out, placed: ['follower'] };
  };
}

export const coopBoost = coopStep('coop_boost');
export const humanLadder = coopStep('human_ladder');

/** Co-op kind -> step (steps.mjs `stepFor`); a co-op kind with no entry is A1's stub. */
export const COOP_STEPS = { coop_boost: coopBoost, human_ladder: humanLadder };
