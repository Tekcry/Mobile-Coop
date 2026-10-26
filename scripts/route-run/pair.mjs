// Route-run robot pair (J13 R4b, docs/route-runs/PLAN.md "R4b The robot pair"; BRIEF "Two players", "Co-op links",
// A1, A6, A12): two pages on `?net=local`, the leader on the host (R4a's walker) and the follower on the client, both
// stepped from Node on the host's clock. Boot: `openPair`; runs: `PairDriver` (splits, stubs, the trailing stall). Clock: both pages run `loop.manual`; each lockstep tick (`lockTick`) steps the host `PAIR_TICK_S` of game time in the
// driver's 0.05 s chunks, then the client the same, then Node awaits once so BroadcastChannel delivers both ways (a single
// long evaluate delivers no net messages). A client more than `CLOCK_DRIFT_S` behind is one `clock` note per run.
// Pure parts (tests/routeRunPair.test.ts) load no browser: Playwright and e2e-net-lib are imported inside `openPair`.
import { bootUrl, centreOf } from '../route-run.mjs';
import { PageDriver, RUN_CAP_S, spaceAt } from './driver.mjs';
import { sightRange } from './progress.mjs';

/** Game seconds per lockstep tick (each page in the driver's 0.05 s chunks; the remote lags at most one tick). */
export const PAIR_TICK_S = 0.2;
/** A client this far (game s) behind the host is noted once per run (report only). */
export const CLOCK_DRIFT_S = 1;
/** The follower stands this far (m) beside the leader at a stub, a placement and the rejoin. */
export const PAIR_SIDE_M = 1;
/** After a placement of the client the host sees its feet this near (m) within `PLACE_SEE_S` game s (`moveClient`). */
export const SEE_M = 0.4;
export const PLACE_SEE_S = 5;
/** The host's remote state and the client's host avatar arrive within this much game time after the boot. */
export const READY_S = 20;
/** The follower's walk to a stub's near side gets this long (game s) before it is placed there. */
export const NEAR_WALK_S = 30;
/** `?net=local` autostart covers these modes (src/main.ts `localMode`); any other boots the lobby. */
export const AUTOSTART_MODES = ['course', 'sector'];
/** The host page's section bake is waited for this long (wall ms) after the match starts. */
export const BAKE_WAIT_MS = 120000;
/** Robot names by page slot (0 host, 1 client). */
export const ROBOT_NAMES = ['leader', 'follower'];

const r2 = (v) => Math.round(v * 100) / 100;
/** Page calls that start a robot doing something new (a pending event from before one is stale). */
const STARTS = new Set(['walkStart', 'holdStart', 'doorStart', 'objectiveStart', 'place', 'restart', 'begin', 'follow']);

// ---------------------------------------------------------------------------------------------------------------
// Pure parts
// ---------------------------------------------------------------------------------------------------------------

/** How a mode's pair boots: 'autostart' (course, Sector Ops) or 'lobby' (`hostAndJoin` + `startMode`). */
export function bootPath(mode) {
  return AUTOSTART_MODES.includes(mode) ? 'autostart' : 'lobby';
}

/** Both pages' boot from one `bootUrl` call (route-run.mjs): the caller's params kept, `net=local` added, `autostart` /
 *  `mode` only on the autostart path. The course bay is the host session's `courseBay`, never a URL param. (The lobby
 *  path's client is opened by e2e-net-lib with `net=local` only.) */
export function pairBoot(url, own, mode) {
  const p = new URLSearchParams(own);
  p.set('net', 'local');
  if (bootPath(mode) === 'lobby') {
    p.delete('autostart');
    p.delete('mode');
  }
  const boot = bootUrl(url, p.toString());
  return { host: boot, client: boot };
}

/** A split's legs: leg a the leader's, leg b the follower's. */
export function splitRoles(step) {
  return [{ side: 'a', robot: 'leader', steps: step.a ?? [] }, { side: 'b', robot: 'follower', steps: step.b ?? [] }];
}

/** The rejoin: the first robot to arrive waits ('wait') until the other arrives ('go'); `waited()` names who waited and
 *  how long. */
export class RejoinWait {
  constructor() {
    this.at = { leader: null, follower: null };
  }

  arrive(robot, t) {
    if (this.at[robot] === null) this.at[robot] = t;
    return this.done ? 'go' : 'wait';
  }

  get done() {
    return this.at.leader !== null && this.at.follower !== null;
  }

  waited() {
    if (!this.done) return null;
    return { robot: this.at.leader <= this.at.follower ? 'leader' : 'follower', s: r2(Math.abs(this.at.leader - this.at.follower)) };
  }
}

function unitXZ(from, to) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const len = Math.sqrt(dx * dx + dz * dz);
  return len < 1e-6 ? [1, 0] : [dx / len, dz / len];
}

/** `m` metres to the left of `p` across the direction `u` ([x, z] unit). */
function sideOf(p, u, m) {
  return [p[0] - u[1] * m, p[1], p[2] + u[0] * m];
}

/** The point `m` beside `to`, across the way from `from` to `to`. */
export function besideOf(from, to, m = PAIR_SIDE_M) {
  return sideOf(to, unitXZ(from, to), m);
}

/** A stub's spots: the near side at the link's `at` (the leader on it, the follower `PAIR_SIDE_M` beside, across the
 *  approach from `at` toward `past`), the far side at `past` (the same side). */
export function stubSpots(at, past, m = PAIR_SIDE_M) {
  const u = unitXZ(at, past);
  return { leaderNear: [at[0], at[1], at[2]], followerNear: sideOf(at, u, m), leaderFar: [past[0], past[1], past[2]], followerFar: sideOf(past, u, m) };
}

/**
 * Which robot a rise is on (BRIEF "Detections", A12): the cause record's target `slot` when the reader gives one (0 the
 * host, 1 the client); else the robot inside the guard's view cone (R3 `sightRange` at its angle off his yaw); else, both
 * or neither in it, the nearer. A camera (no guard position) names the leader. Returns 0 or 1.
 */
export function attributeRobot(rise, slot = null) {
  if (slot === 0 || slot === 1) return slot;
  const g = rise.guard;
  const rs = rise.robots ?? [];
  if (rs.length < 2 || !g || typeof g.x !== 'number') return 0;
  const fx = Math.sin(g.yaw ?? 0);
  const fz = Math.cos(g.yaw ?? 0);
  const cone = [];
  const dist = [];
  for (let i = 0; i < 2; i++) {
    const dx = rs[i].x - g.x;
    const dy = rs[i].y - g.y;
    const dz = rs[i].z - g.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const a = Math.abs(Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz));
    cone.push(d < sightRange(a));
    dist.push(d);
  }
  if (cone[0] !== cone[1]) return cone[0] ? 0 : 1;
  return dist[0] <= dist[1] ? 0 : 1;
}

/** The clock check: a client more than `limit` game s behind the host gives one note per run (after `arm`). */
export class ClockWatch {
  constructor(limit = CLOCK_DRIFT_S) {
    this.limit = limit;
    this.armed = false;
    this.fired = false;
  }

  arm() {
    this.armed = true;
    this.fired = false;
  }

  check(hostT, clientT, id = null) {
    if (!this.armed || this.fired || !(hostT - clientT > this.limit)) return null;
    this.fired = true;
    return `clock: ${id ? `run ${id}: ` : ''}the client was ${r2(hostT - clientT)} s behind the host at ${r2(hostT)} s (report only)`;
  }
}

/** One lockstep tick: the host steps `tickS` (less when its robot's event ends the tick), then the client the same game
 *  time (told whether the leader walks), then one macrotask so BroadcastChannel delivers both ways. */
export async function lockTick(host, client, tickS) {
  const h = await host.tick(tickS);
  const c = await client.tick(h.dt ?? tickS, !h.walking);
  await new Promise((r) => setTimeout(r, 0));
  return { h, c };
}

// ---------------------------------------------------------------------------------------------------------------
// The pair driver
// ---------------------------------------------------------------------------------------------------------------

/**
 * Both robots for `runOne`. `host` / `client`: `PageDriver`s (roles leader / follower). Waits (`until`, the robot
 * drivers' `until`) register a waiter and one pump steps both pages tick by tick until each waiter has its robot's event
 * (or its cap); a follower trailing stall with no waiter is handled in the pump (`trailStall`). Ticks are serialised.
 */
export class PairDriver {
  constructor(host, client, { points = null, notes = [] } = {}) {
    this.host = host;
    this.client = client;
    this.points = points;
    this.notes = notes;
    this.onChunk = async () => {};
    this.clock = new ClockWatch();
    this.elapsed = 0;
    this.epoch = { leader: 0, follower: 0 };
    this.waiters = { leader: null, follower: null };
    this.pending = { leader: null, follower: null };
    // (J13 hold restart) a split leg's follower course event a hold or a placement's settle took (the leader's lives on
    // the host driver: `PageDriver.courseHit`)
    this.fcourse = null;
    this.free = [];
    this.pumping = false;
    this.lock = Promise.resolve();
    this.farSpot = null;
    this.step = null;
    this.log = null;
    this.stopFn = null;
    this.hostTicker = { tick: (s) => this.host.call('tick', s) };
    this.clientTicker = { tick: (s, idle) => this.client.call('tick', s, idle) };
  }

  /** A leader page call; `restart` and `begin` go to both pages (the host's result). */
  async call(name, ...a) {
    if (name !== 'restart' && name !== 'begin') return this.lcall(name, ...a);
    this.epoch.follower++;
    this.fcourse = null;
    const r = await this.lcall(name, ...a);
    await this.client.call(name, ...a);
    if (name === 'begin') this.clock.arm();
    return r;
  }

  lcall(name, ...a) {
    if (STARTS.has(name)) this.epoch.leader++;
    return this.host.call(name, ...a);
  }

  fcall(name, ...a) {
    if (STARTS.has(name)) this.epoch.follower++;
    return this.client.call(name, ...a);
  }

  tickPair() {
    const p = this.lock.then(() => this.tickOnce());
    this.lock = p.catch(() => {});
    return p;
  }

  async tickOnce() {
    const eL = this.epoch.leader;
    const eF = this.epoch.follower;
    const { h, c } = await lockTick(this.hostTicker, this.clientTicker, PAIR_TICK_S);
    this.elapsed += h.dt ?? PAIR_TICK_S;
    const note = this.clock.check(h.t, c.t, this.log?.id ?? null);
    if (note) this.notes.push(note);
    if (h.ev) this.post('leader', h, eL);
    if (c.ev) this.post('follower', c, eF);
    await this.onChunk();
    return { h, c };
  }

  post(robot, r, epoch) {
    r.epoch = epoch;
    const w = this.waiters[robot];
    // (J13 hold restart) the leader's course event is no start call's: any leader waiter takes it; with none (a clock
    // advance under a steps.mjs machine, a placement of the follower) it stays pending on the host driver, whose tick
    // recorded it, for the next wait or a step's `takeCourse`
    if (robot === 'leader' && r.ev === 'course') {
      if (w) {
        this.waiters.leader = null;
        this.host.takeCourse?.();
        w.resolve(r);
      }
      return;
    }
    if (w && w.epoch === epoch) {
      this.waiters[robot] = null;
      w.resolve(r);
    } else if (robot === 'follower' && r.ev === 'stall' && !w) this.free.push(r);
    else this.pending[robot] = r;
  }

  /** The robot's next event since its last start call (or 'cap' after `capS` game s); a pending course event at once. */
  wait(robot, capS = RUN_CAP_S) {
    const c = this.takeCourse(robot);
    if (c) return Promise.resolve(c);
    const p = this.pending[robot];
    this.pending[robot] = null;
    if (p && p.epoch === this.epoch[robot]) return Promise.resolve(p);
    return new Promise((resolve, reject) => {
      this.waiters[robot] = { resolve, reject, epoch: this.epoch[robot], end: this.elapsed + capS };
      this.pump();
    });
  }

  async pump() {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.waiters.leader || this.waiters.follower) {
        const { h, c } = await this.tickPair();
        for (const [robot, r] of [['leader', h], ['follower', c]]) {
          const w = this.waiters[robot];
          if (w && this.elapsed >= w.end - 1e-9) {
            this.waiters[robot] = null;
            w.resolve({ ...r, ev: 'cap' });
          }
        }
        while (this.free.length) await this.trailStall(this.free.shift());
      }
    } catch (e) {
      for (const k of ['leader', 'follower']) {
        const w = this.waiters[k];
        this.waiters[k] = null;
        if (w) w.reject(e);
      }
    } finally {
      this.pumping = false;
    }
  }

  until(capS = RUN_CAP_S) {
    return this.wait('leader', capS);
  }

  /** (J13 hold restart) The robot's pending course event (cleared), or null: the leader's on the host driver; a split
   *  leg's follower's from its latest start (its interrupt echo, SR3) or kept by a settle. */
  takeCourse(robot = 'leader') {
    if (robot !== 'follower') return this.host.takeCourse?.() ?? null;
    const p = this.pending.follower;
    if (p && p.ev === 'course' && p.epoch === this.epoch.follower) {
      this.pending.follower = null;
      return p;
    }
    const f = this.fcourse;
    this.fcourse = null;
    return f;
  }

  coursePending(robot) {
    if (robot !== 'follower') return !!this.host.courseHit;
    const p = this.pending.follower;
    return !!this.fcourse || (!!p && p.ev === 'course' && p.epoch === this.epoch.follower);
  }

  /** A wait inside a hold or a placement's settle: a course event (pending before or arriving in it) stays pending. */
  async settle(robot, capS) {
    const kept = this.takeCourse(robot);
    const r = await this.wait(robot, capS);
    const c = r.ev === 'course' ? r : kept;
    if (c) {
      if (robot === 'follower') this.fcourse = c;
      else this.host.courseHit = c;
    }
    return r;
  }

  /** Both robots stand still for `s` game seconds (a stub's hold; no stuck clock); a course event ends it, pending. */
  async hold(s) {
    if (!(s > 0) || this.coursePending('leader')) return;
    await this.lcall('holdStart', s);
    await this.fcall('holdStart', s);
    await this.settle('leader', s + 1);
  }

  /** The leader placed at `pt` (as R4a), the follower beside it (the stub's far spot when one is set). */
  async place(pt) {
    if (!pt) return null;
    const before = await this.host.call('pos');
    const at = await this.lcall('place', pt[0], pt[1], pt[2], null);
    await this.placeFollower(this.farSpot ?? besideOf(before, [at.x, at.y, at.z]));
    await this.settle('leader', 1);
    return at;
  }

  /** The follower placed at `pt` as e2e-ctcourse `moveClient`: the host's remotes may jump, the client out of any team
   *  move and teleported, then the host sees it within `SEE_M` (stepped; else one note). Trailing resumes after. */
  async placeFollower(pt) {
    const was = await this.fcall('follow', false);
    await this.host.call('allowTeleport', 3);
    const at = await this.fcall('place', pt[0], pt[1], pt[2], null);
    let seen = false;
    for (let k = 0; k < Math.ceil(PLACE_SEE_S / PAIR_TICK_S) && !seen; k++) {
      await this.tickPair();
      seen = await this.host.call('remoteNear', at.x, at.z, SEE_M);
    }
    if (!seen) this.noteOnce(`the host did not see the follower within ${SEE_M} m of a placement in ${PLACE_SEE_S} s`);
    if (was) await this.fcall('follow', true);
    return at;
  }

  noteOnce(n) {
    if (!this.notes.includes(n)) this.notes.push(n);
  }

  /** (the steps context's clock advance) Both pages step `s` game seconds. */
  async advance(s) {
    const end = this.elapsed + s;
    while (this.elapsed < end - 1e-9) await this.tickPair();
  }

  rises(since) {
    return this.host.rises(since);
  }

  /** One robot's driver for a split leg (the `runOne` driver shape: call, until, hold, place, points). */
  robotDriver(robot) {
    const lead = robot === 'leader';
    const call = (n, ...a) => (lead ? this.lcall(n, ...a) : this.fcall(n, ...a));
    return {
      points: this.points,
      call,
      until: (cap) => this.wait(robot, cap),
      hold: async (s) => {
        if (!(s > 0) || this.coursePending(robot)) return;
        await call('holdStart', s);
        await this.settle(robot, s + 1);
      },
      place: async (pt) => {
        if (!pt) return null;
        if (!lead) return this.placeFollower(pt);
        const at = await this.lcall('place', pt[0], pt[1], pt[2], null);
        await this.settle('leader', 1);
        return at;
      },
      takeCourse: () => this.takeCourse(robot),
      rises: (since) => this.rises(since),
      advance: (s) => this.advance(s),
    };
  }

  /** (runOne) The run's log and its dead-stop writer (a trailing follower's stall is logged through it). */
  beginRun(log, stop) {
    this.log = log;
    this.stopFn = stop;
    this.free.length = 0;
    this.step = null;
  }

  /** A trailing follower stalled (A4): a dead stop with `robot: 'follower'` on the leader's current link, classed by a
   *  nav probe to its trail point, then placed beside the leader. */
  async trailStall(c) {
    const step = this.step ?? {};
    const tp = await this.client.call('trailAt');
    const cls = await this.client.call('probe', tp[0], tp[1], tp[2]);
    c.since = await this.client.call('stallSince');
    if (this.stopFn) await this.stopFn(cls, { ...step, link: step.link ?? step.index ?? null }, c, 'follower');
    await this.placeFollower(besideOf(tp, await this.host.call('pos')));
  }

  /** A link step for both robots (a stub): the follower walks to its near spot beside the leader (placed there when it
   *  cannot), then the step (steps.mjs) holds both and places both, the follower at its far spot. */
  async linkStep(ctx, step, step_) {
    if (!step.at || !step.past) return step_(ctx, step);
    const sp = stubSpots(step.at, step.past);
    await this.fcall('follow', false);
    await this.fcall('walkStart', sp.followerNear[0], sp.followerNear[1], sp.followerNear[2]);
    const r = await this.wait('follower', NEAR_WALK_S);
    if (r.ev !== 'arrived') {
      r.since = await this.client.call('stallSince');
      const cls = r.ev === 'stall' ? await this.client.call('probe', sp.followerNear[0], sp.followerNear[1], sp.followerNear[2]) : 'step-timeout';
      if (this.stopFn) await this.stopFn(cls, step, r, 'follower');
      await this.placeFollower(sp.followerNear);
    }
    this.farSpot = sp.followerFar;
    let res;
    try {
      res = await step_(ctx, step);
    } finally {
      this.farSpot = null;
    }
    await this.fcall('follow', true);
    if (res.stub) res.stub.robots = [...ROBOT_NAMES];
    return res;
  }

  /** (driver linkStep) Where a link step's stopped robot stands (`tick` 0 on its own page). */
  stopPos(robot) {
    return robot === 'follower' ? this.fcall('tick', 0) : this.lcall('tick', 0);
  }

  /** (driver linkStep) The recovery past a link after a step's dead stop: the follower at the stub's far spot beside
   *  `past`, and the leader placed on `past` too unless only the follower stopped (the leader took the step). */
  async recoverPast(step, robot) {
    const past = step.past ?? step.at;
    if (!past) return;
    const far = step.at && step.past ? stubSpots(step.at, step.past).followerFar : null;
    if (robot === 'follower' && far) {
      await this.placeFollower(far);
      return;
    }
    this.farSpot = far;
    try {
      await this.place(past);
    } finally {
      this.farSpot = null;
    }
  }

  /** A split: leg a the leader's, leg b the follower's, at once (`runLeg(ctx, steps)` is driver.mjs `runSteps`); each leg
   *  ends at the rejoin (the leader on its centre, the follower beside); the first there waits idle. Logged in
   *  `log.splits`. Returns 'exit' when the leader's leg ended in the section's exit. */
  async split(ctx, log, step, runLeg) {
    await this.fcall('follow', false);
    this.fcourse = null;
    const t0 = await this.host.call('time');
    const rec = { id: step.id, fork: step.fork, rejoin: step.rejoin, start_s: r2(t0), legs: [], waited: null };
    const wait = new RejoinWait();
    const rc = centreOf(this.points, step.rejoin);
    let exit = false;
    await Promise.all(splitRoles(step).map(async ({ side, robot, steps }) => {
      const leg = [...steps];
      const last = steps.filter((s) => s.type === 'link').pop();
      const end = rc ? (robot === 'leader' ? rc : besideOf(last?.at ?? rc, rc)) : last?.past ?? null;
      if (end) leg.push({ type: 'walk', to: end, space: step.rejoin, link: null });
      const c = { ...ctx, driver: this.robotDriver(robot), robot };
      const out = await runLeg(c, leg);
      if (out === 'exit') exit = true;
      const t = await c.driver.call('time');
      const at = await c.driver.call('pos');
      const space = spaceAt(this.points, at[0], at[1], at[2]);
      rec.legs.push({ side, robot, links: steps.filter((s) => s.type === 'link').map((s) => s.index), start_s: r2(t0), end_s: r2(t), space, reached: out === '' && (!this.points || space === step.rejoin) });
      if (wait.arrive(robot, t) === 'wait' && out === '') await c.driver.call('holdStart', 1e9);
    }));
    rec.legs.sort((x, y) => (x.side < y.side ? -1 : 1));
    rec.waited = wait.waited();
    log.splits.push(rec);
    this.fcourse = null;
    await this.fcall('follow', true);
    return exit ? 'exit' : '';
  }

  /** Lines (causes.mjs) named by robot (`attributeRobot` on the raw rises, read again in the same order). */
  async nameRobots(lines) {
    const raw = await this.host.call('rises', 0);
    for (let i = 0; i < lines.length; i++) {
      const r = raw[i];
      if (!r) continue;
      const k = attributeRobot(r, typeof lines[i].slot === 'number' ? lines[i].slot : null);
      lines[i].robot = ROBOT_NAMES[k];
      const at = r.robots?.[k];
      if (at) {
        lines[i].robotAt = [r2(at.x), r2(at.y), r2(at.z)];
        lines[i].space = spaceAt(this.points, at.x, at.y, at.z);
      }
    }
  }

  /** Both pages stepped from Node; then stepped until the host's remotes carry state and the client has the host avatar. */
  async ready() {
    await this.host.call('pairStart');
    await this.client.call('pairStart');
    for (let k = 0; k * PAIR_TICK_S < READY_S; k++) {
      if ((await this.host.call('pairReady')) && (await this.client.call('pairReady'))) return;
      await this.tickPair();
    }
    throw new Error(`route-run pair: no remote state on the host or no host avatar on the client after ${READY_S} s of game time`);
  }

  /** Sector Ops section setup for the pair: each earlier section's objective done, both robots at its connector's
   *  checkpoint (the cycle needs both inside), stepped until the next section starts. Returns the live index. */
  async advanceSector(target) {
    for (let guard = 0; guard < 16; guard++) {
      const live = (await this.host.call('section')).index;
      if (live < 0 || live >= target) return live;
      const s = await this.host.call('sectorSkip');
      if (!s) return -1;
      if (s.index >= target || !s.cp) return s.index;
      await this.advance(0.2);
      const [x, y, z, yaw] = s.cp;
      await this.lcall('place', x, y, z, yaw);
      await this.placeFollower(besideOf([x - Math.sin(yaw), y, z - Math.cos(yaw)], [x, y, z]));
      for (let t = 0; t < 15 && (await this.host.call('section')).index === s.index; t += PAIR_TICK_S) await this.tickPair();
      await this.advance(1);
    }
    return (await this.host.call('section')).index;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The two pages
// ---------------------------------------------------------------------------------------------------------------

const padOn = (P) => ({
  set: (b, v) => P.evaluate(([b, v]) => window.__pad.set(b, v), [b, v]),
  axis: (i, v) => P.evaluate(([i, v]) => window.__pad.axis(i, v), [i, v]),
});

/**
 * Boot the pair: `{ url, own, mode, map, courseBay, pace, forgive, points, notes }` (own: route-run.mjs `ownParams`).
 * Returns `{ browser, pair, host, client, pads, errors }` (errors: each page's live console-error list); the pages in
 * the match, both stepped from Node, damage off.
 */
export async function openPair({ url, own, mode, map, courseBay = 0, pace, forgive, points = null, notes = [] }) {
  const lib = await import('../e2e-lib.mjs');
  const net = await import('../e2e-net-lib.mjs');
  const boot = pairBoot(url, own, mode);
  let browser, A, B, errors;
  if (bootPath(mode) === 'autostart') {
    const h = await lib.launch({ url: boot.host.url, params: boot.host.params, viewport: net.NET_VIEWPORT });
    ({ browser, page: A } = h);
    await net.until(A, () => window.__coop?.session?.isHost === true, null, 30000, 'first tab hosts');
    // (the match starts once the client joins: a later course set is the host session's start bay, set before)
    if (mode === 'course' && courseBay > 1) await A.evaluate((n) => (window.__coop.session.courseBay = n), courseBay);
    const c = await lib.openPage(h.ctx, boot.client.url, boot.client.params);
    [B, errors] = [c.page, [h.errors, c.errors]];
    net.setSimPages([A, B]);
    for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
      await net.until(P, (m) => window.__app.current?.opts?.mode === m && !!window.__app.current.net, mode, net.LOAD_MS, `${tag} in the ${mode} match`);
    }
    // (a map baking its lamps per section: the host's boot returned at the lobby, so its bake is waited for here; polled
    // from Node on the wall clock, as the background host's sim clock may not move before Node steps it)
    const baked = () => A.evaluate(() => { const s = window.__app.current?.world?.lightBake?.sections; return !s || s.done || s.disposed; }).catch(() => false);
    const t0 = Date.now();
    while (!(await baked()) && Date.now() - t0 < BAKE_WAIT_MS) await new Promise((r) => setTimeout(r, 250));
    if (!(await baked())) notes.push(`the host page started with its section bake unfinished (${BAKE_WAIT_MS / 1000} s cap)`);
  } else {
    const r = await net.hostAndJoin(boot.host.url, 2, { params: boot.host.params });
    ({ browser, A, B, errors } = r);
    await net.startMode(r.pages, mode, map);
  }
  const host = new PageDriver(A, { pace, forgive, points, role: 'leader' });
  const client = new PageDriver(B, { pace, forgive, points, role: 'follower' });
  await host.install();
  await client.install();
  const pair = new PairDriver(host, client, { points, notes });
  await pair.ready();
  await host.call('noDamage');
  return { browser, pair, host: A, client: B, pads: { host: padOn(A), client: padOn(B) }, errors };
}
