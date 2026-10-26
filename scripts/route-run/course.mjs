// Route-run course hooks (J13 R4c, docs/route-runs/PLAN.md "R4c Course mode"; BRIEF "Marlow Yard drill gates",
// "Restarts and retries", A2, A5, A13, A14): what the harness does in course mode (Marlow Yard) beyond walking. Node side;
// the driver calls both hooks on every run, any mode (a page with no `window.__course` costs one read per run).
//   onPoll(ctx, run)             after every driver chunk (one page: every evaluate, up to 2 s of game time; the pair:
//                                every 0.2 s, inside the pair's tick lock). Page reads, page calls and log writes only:
//                                never a wait, a placement or `ctx.advance` (in the pair those deadlock the lock).
//   onLockedDoor(ctx, run, step) at a locked door on the path, between steps (may wait): true when it opened (drill
//                                stubs, an airlock cycle), false when it did not (the driver logs a `locked` dead stop)
// and, for the R4b seams (SR3-SR5, wired by the lead): `onRestart(ctx, run, steps, i)`, `onRunEnd(ctx, run)`,
// `checkCourseExpect(block, log)`.
// `ctx` is the steps context (steps.mjs: `host`, `client`, `driver`, `advance`, `clock`, `shots`, `notes`, `players`;
// SR2 adds `graphs` and `selftest`); `run` the run log being written (its `drills`, `restarts`, `detections`, `stubs`,
// `deadStops`). Per-run state lives in a WeakMap keyed by the run log.
//
// Drill gate (`onLockedDoor`): the course door at the step's point (courseMode's own course-door -> world-door lookup,
// `layout.doors` matched by anchor id, src/game/modes/courseMode.ts:252-256, applied by `applyLocks` :1032-1047). A door
// not in `debug().locks` is locked for good. An airlock cycling is waited for. Else the A13 hold and every drill still
// open for either player done through the host's hooks (each a drill stub), both robots put on the airlock's pad when the
// door is an airlock's far door (the cycle needs both on it, as e2e-ctcourse `throughHoldingRoom`), and the lock polled.
// Restart watcher (`onPoll`): a rise of `__course.restarts` (or, with SR3's `posN`, a robot moved over `JUMP_M` with no
// harness placement) is a restart; its cause (`classify`) and what follows (`follow`) per BRIEF A14.
// Page access goes through `coursePage(ctx)` (tests: `ctx.coursePage`). J14's hooks (`lastRetry`, `station()`,
// `retryOff(n)`; origin/feature/marlow-replan-base src/game/modes/courseMode.ts:330-360) are feature-detected.
import fs from 'node:fs';
import path from 'node:path';
import { mergeGraphs } from '../level-validate.mjs';
import { lineOf } from './causes.mjs';

/** A14: the cause window (game s) before a restart in which a guard or camera rise, or a timed gate closing, names it.
 *  The window opens this long before the last poll (the restart happened somewhere in the poll gap). */
export const CAUSE_WINDOW_S = 2;
/** A14: restarts of one cause from one place before the harness breaks the loop (push past, drill stubs, the stop). */
export const PER_PLACE = 2;
/** A13: the drill hold (s) when the set has no `teach` link to take the time from (a `teach` on a space, none, no graph). */
export const DRILL_HOLD_S = 10;
/** BRIEF "Marlow Yard drill gates": a door still locked this long (game s) after its drills is a `locked` stop. */
export const UNLOCK_WAIT_S = 5;
/** The airlock cycle: src/config/course.ts:7 `AIRLOCK_CYCLE` (4 s), read by src/game/course/courseState.ts:13 and :1227. */
export const AIRLOCK_CYCLE_S = 4;
/** An airlock is waited for its cycle plus 5 s (the far door unlocks when the cycle seals). */
export const AIRLOCK_WAIT_S = AIRLOCK_CYCLE_S + 5;
/** BRIEF "Restarts and retries": a robot moved more than this (m) between two polls with no harness placement... */
export const JUMP_M = 3;
/** ...or more than this speed (m/s) times the poll gap when that is longer (a 2 s single-page gap at a run is up to
 *  ~12 m of honest movement). */
export const JUMP_SPEED_MPS = 6;
/** Page actions per player at one drill gate (a safety cap: a verb that ticks nothing never loops). */
export const VERB_CAP = 16;
/** The lock is polled this often (game s) while waiting for it. */
export const LOCK_POLL_S = 0.2;
/** A door this near (m) the step's point is the door (driver.mjs `DOOR_REACH_M`). */
export const DOOR_REACH_M = 1.6;
/** A step this far (m) above or below the robot's feet is on another storey: never the rejoin point. */
export const STOREY_M = 1.5;
/** The spotted rule off on master: the bay's hold that keeps `spotFailed` from firing (courseMode.ts:591-595). */
export const SPOT_OFF = 1e9;
/** A guard's eye above his feet (m; driver.mjs `EYE_M`), for a captured rise's sight inputs. */
export const EYE_M = 1.6;
/** The `flag:<name>` drill verb (src/game/course/courseDef.ts `FLAG_VERB`). */
export const FLAG_VERB = 'flag:';
/** J14 `RetryCause` -> the watcher's class (marlow-replan PLAN "Retry-off switch and cause names for R4c"). */
export const J14_CAUSE = { seen: 'seen', caught: 'seen', timer: 'timer', out: 'other', down: 'other', other: 'other' };

const r2 = (v) => Math.round(v * 100) / 100;
const hyp2 = (x, z) => Math.sqrt(x * x + z * z);
const hyp3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);

// ---------------------------------------------------------------------------------------------------------------
// Pure parts (tests/routeRunCourse.test.ts)
// ---------------------------------------------------------------------------------------------------------------

/** The graph space holding a point (driver.mjs `spaceAt`'s rule, copied: driver.mjs imports this file). Pure. */
export function spaceAt(points, x, y, z) {
  const list = !points?.spaces ? [] : Array.isArray(points.spaces) ? points.spaces : Object.entries(points.spaces).map(([id, p]) => ({ id, ...p }));
  let best = null;
  let bd = Infinity;
  for (const s of list) {
    if (!Array.isArray(s.boxes)) continue;
    const fy = typeof s.floorY === 'number' ? s.floorY : Array.isArray(s.centre) ? s.centre[1] : 0;
    const dy = Math.abs(fy - y);
    if (dy > 1.5 || dy >= bd) continue;
    if (s.boxes.some(([x0, z0, x1, z1]) => x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && z >= Math.min(z0, z1) && z <= Math.max(z0, z1))) {
      best = s.id;
      bd = dy;
    }
  }
  return best;
}

/**
 * Open drills -> the page actions that complete them: `[{ id, player, verb, left }]` (player 0 / 1, `left` the ticks
 * still owed, default 1) -> `{ kind: 'verb', id, player, verb }` `left` times each, or one `{ kind: 'flag', id, player,
 * verb, flag }` for a `flag:<name>` verb (setting the flag ticks the drill for every player it is open for).
 */
export function drillActions(openDrills) {
  const out = [];
  for (const d of openDrills ?? []) {
    if (!d || typeof d.verb !== 'string') continue;
    if (d.verb.startsWith(FLAG_VERB)) {
      out.push({ kind: 'flag', id: d.id, player: d.player, verb: d.verb, flag: d.verb.slice(FLAG_VERB.length) });
      continue;
    }
    const n = Math.max(1, Math.floor(d.left ?? 1));
    for (let k = 0; k < n; k++) out.push({ kind: 'verb', id: d.id, player: d.player, verb: d.verb });
  }
  return out;
}

const sameSection = (a, b) => a !== undefined && a !== null && b !== undefined && b !== null && String(a).toLowerCase() === String(b).toLowerCase();

/**
 * A13: the drill hold (s) for set `section`: the time of the set's link that carries `teach` (a link whose `from` or `to`
 * space is in the set; its measured time, else its `time_s`), 0 when that link (its merged index) is already in `stubs`
 * this run (it was held there), else `DRILL_HOLD_S` (also for a `teach` on a space, no teach, or no graphs).
 */
export function drillHold(graphs, section, stubs = []) {
  const list = Array.isArray(graphs) ? graphs : graphs ? [graphs] : [];
  if (!list.length) return DRILL_HOLD_S;
  const g = mergeGraphs(list);
  const inSet = new Set(g.spaces.filter((s) => sameSection(s.section, section)).map((s) => s.id));
  const i = g.links.findIndex((l) => !!l.teach && (inSet.has(l.from) || inSet.has(l.to)));
  if (i < 0) return DRILL_HOLD_S;
  if ((stubs ?? []).some((s) => String(s.link) === String(i))) return 0;
  const l = g.links[i];
  if (typeof l.measured?.time_s === 'number') return l.measured.time_s;
  return typeof l.time_s === 'number' ? l.time_s : DRILL_HOLD_S;
}

/** The cause window for a restart seen at `nowT` with the last poll at `lastT`: `[lastT - CAUSE_WINDOW_S, nowT]`. */
export function causeWindow(lastT, nowT) {
  return { from: lastT - CAUSE_WINDOW_S, to: nowT };
}

/**
 * A14: a restart's cause. `retry` J14's `lastRetry` when it is new with this restart (else null); `rises` `[{ t, cls }]`
 * (the driver's rises and the watcher's captured ones); `closes` `[{ id, t }]` (a timed gate seen going open -> closed);
 * `lastT` / `nowT` the last poll and this one. Returns `{ cause: 'seen' | 'timer' | 'other', restart, from }`:
 * J14 seen / caught -> seen `retry`, timer -> timer `timer`, out / down / other -> other `other`; else (master) a
 * detection rise (a guard alert or a camera alarm) in the window -> seen `set`, a timed gate closed in it -> timer
 * `timer`, else other `other`.
 */
export function classify({ retry = null, rises = [], closes = [], lastT, nowT }) {
  if (retry && typeof retry.cause === 'string') {
    const cause = J14_CAUSE[retry.cause] ?? 'other';
    return { cause, restart: cause === 'seen' ? 'retry' : cause, from: 'retry' };
  }
  const w = causeWindow(lastT, nowT);
  const inW = (t) => typeof t === 'number' && t >= w.from - 1e-9 && t <= w.to + 1e-9;
  if ((rises ?? []).some((r) => r.cls === 'detection' && inW(r.t))) return { cause: 'seen', restart: 'set', from: 'rise' };
  if ((closes ?? []).some((c) => inW(c.t))) return { cause: 'timer', restart: 'timer', from: 'gate' };
  return { cause: 'other', restart: 'other', from: 'none' };
}

/** A robot jumped between two polls: `prev` / `now` `{ x, y, z, n }` (`n` the page's placement count, SR3 `posN`), no
 *  placement counted between them and moved over `max(JUMP_M, dt * JUMP_SPEED_MPS)` (the larger: 3.1 m in a 0.05 s pair
 *  gap is a jump, 6 m in a 2 s single-page gap is a walk). */
export function jumped(prev, now, dt) {
  if (!prev || !now || typeof prev.n !== 'number' || typeof now.n !== 'number' || now.n !== prev.n) return false;
  return hyp3(now.x - prev.x, now.y - prev.y, now.z - prev.z) > Math.max(JUMP_M, dt * JUMP_SPEED_MPS);
}

/** A fresh `follow` state (the per-place counts). */
export function followState() {
  return { counts: {} };
}

/**
 * A14: what follows a restart of class `cause` ('seen' | 'timer' | 'other') from `place` (`{ space, step, t }`; timer
 * restarts count per step, the others per space). Updates `state`'s counts. Returns `{ then, actions, n, since }`:
 * the first `PER_PLACE - 1` -> `rejoined` (`['rejoin']`); then seen -> `pushed-past` (`['ruleOff', 'pushPast']`), timer ->
 * `drill-stub` (`['timerDrills', 'rejoin']`), other -> `dead-stop` (`['deadStop', 'pushPast']`). `since` is the first
 * one's time.
 */
export function follow(state, cause, place) {
  const where = cause === 'timer' ? place?.step ?? place?.space : place?.space;
  const key = `${cause}|${where ?? '?'}`;
  const c = state.counts[key] ?? { n: 0, since: place?.t ?? null };
  c.n++;
  state.counts[key] = c;
  if (c.n < PER_PLACE) return { then: 'rejoined', actions: ['rejoin'], n: c.n, since: c.since };
  if (cause === 'seen') return { then: 'pushed-past', actions: ['ruleOff', 'pushPast'], n: c.n, since: c.since };
  if (cause === 'timer') return { then: 'drill-stub', actions: ['timerDrills', 'rejoin'], n: c.n, since: c.since };
  return { then: 'dead-stop', actions: ['deadStop', 'pushPast'], n: c.n, since: c.since };
}

const pointOf = (s) => (s?.type === 'walk' ? s.to : s?.type === 'link' ? s.at : null);

/**
 * Rejoin (A14): the step nearest the robot's `feet` among steps `0..i` on its storey (a step's point within `STOREY_M`
 * of the feet in y); a link's own walk when that walk comes just before it; `i` when none is on the storey.
 */
export function rejoinIndex(steps, i, feet) {
  let best = -1;
  let bd = Infinity;
  const last = Math.min(i, (steps?.length ?? 0) - 1);
  for (let j = 0; j <= last; j++) {
    const p = pointOf(steps[j]);
    if (!Array.isArray(p) || Math.abs(p[1] - feet[1]) > STOREY_M) continue;
    const d = hyp2(p[0] - feet[0], p[2] - feet[2]);
    if (d < bd - 1e-9) {
      bd = d;
      best = j;
    }
  }
  if (best < 0) return i;
  const s = steps[best];
  const w = steps[best - 1];
  if (s.type === 'link' && w?.type === 'walk' && w.link === s.index) return best - 1;
  return best;
}

/**
 * Push past (A14): the link step `i` walks to (`step.link`), else step `i` when it is a link, else the next link step.
 * Returns `{ link, past, resume }` (`link` that step's index in `steps`, `past` the point past it, `resume` the step after
 * it); with no link left, the last walk's own point (`link` null); null when there is nothing to push past.
 */
export function pushPastTarget(steps, i) {
  const s = steps?.[i];
  if (!s) return null;
  let k = -1;
  if (s.type === 'walk' && s.link !== null && s.link !== undefined) k = steps.findIndex((q, j) => j > i && q.type === 'link' && q.index === s.link);
  if (k < 0 && s.type === 'link') k = i;
  if (k < 0) k = steps.findIndex((q, j) => j > i && q.type === 'link');
  if (k >= 0) {
    const l = steps[k];
    const past = l.past ?? l.at ?? null;
    return past ? { link: k, past, resume: k + 1 } : null;
  }
  return s.type === 'walk' && Array.isArray(s.to) ? { link: null, past: s.to, resume: i + 1 } : null;
}

/** A restart line (R2's shape, scripts/route-run/report.mjs `normRun`). */
export function restartLine(t, space, set, restart, then) {
  return { t: r2(t), space: space ?? null, set: set ?? null, restart, detection: null, then };
}

/**
 * At a run's end (SR4): each seen restart (`restart` 'set' | 'retry') gets `detection`, the index of the latest
 * `run.detections` line with `t` in its window (`meta[k]`: `{ from, to, captured }`; default `[t - CAUSE_WINDOW_S, t]`),
 * and that line gets the restart's value. With none logged, the watcher's captured rise (`captured`: the guard alerted at
 * the restart; the driver's 0.1 s guard poll misses a spotted-rule restart, which drops the squad in the same game step)
 * becomes the line (causes.mjs `lineOf`; `names` the robot names by page slot); with neither, a note. Returns the notes.
 */
export function linkRestarts(run, meta = [], names = ['host', 'client']) {
  const notes = [];
  const dets = run.detections ?? (run.detections = []);
  (run.restarts ?? []).forEach((x, k) => {
    if (x.restart !== 'set' && x.restart !== 'retry') return;
    const m = meta?.[k] ?? {};
    const from = typeof m.from === 'number' ? m.from : x.t - CAUSE_WINDOW_S;
    const to = typeof m.to === 'number' ? m.to : x.t;
    let idx = -1;
    for (let j = 0; j < dets.length; j++) {
      const t = dets[j].t;
      if (typeof t === 'number' && t >= from - 1e-9 && t <= to + 1e-9 && (idx < 0 || t >= dets[idx].t)) idx = j;
    }
    if (idx < 0 && m.captured) {
      const { kind: _kind, ...line } = lineOf(m.captured);
      line.robot = names[line.robot === 'client' ? 1 : 0] ?? line.robot;
      dets.push(line);
      idx = dets.length - 1;
    }
    if (idx >= 0) {
      x.detection = idx;
      dets[idx].restart = x.restart;
    } else notes.push(`seen ${x.restart === 'set' ? 'set restart' : 'retry'} at ${x.space ?? 'an unknown place'} with no guard or camera rise logged`);
  });
  return notes;
}

/**
 * The selftest's course lines (SR5): `block` a fixture run's `course` block against its run log. Keys: `drills`
 * (`{ why, hold_s, ids, players, count }`: every drill stub has `why`; their holds sum to `hold_s`; each id stubbed for
 * each player (1-based, default [1, 2]); `count` stubs), `restarts` (`[{ space, set, restart, then, linked }]` in order:
 * that many lines, each field as given; `linked: true` a detection whose `restart` matches), `detections`
 * (`{ restart, count }`: that many detection lines with that `restart`). `raise` is the page hook's, not a check.
 * Returns the problems ([] = pass).
 */
export function checkCourseExpect(block, log) {
  const problems = [];
  if (!block || !log) return problems;
  const id = log.id ?? 'run';
  const d = block.drills;
  if (d) {
    const drills = log.drills ?? [];
    if (d.why) for (const x of drills) if (x.why !== d.why) problems.push(`${id}: drill stub ${x.id} (P${x.player}) why ${x.why}, expected ${d.why}`);
    if (typeof d.hold_s === 'number') {
      const sum = drills.reduce((a, x) => a + (typeof x.hold_s === 'number' ? x.hold_s : 0), 0);
      if (Math.abs(sum - d.hold_s) > 1e-6) problems.push(`${id}: drill holds sum to ${r2(sum)} s, expected ${d.hold_s}`);
    }
    for (const did of d.ids ?? []) for (const p of d.players ?? [1, 2]) if (!drills.some((x) => x.id === did && x.player === p)) problems.push(`${id}: drill ${did} not stubbed for P${p}`);
    if (typeof d.count === 'number' && drills.length !== d.count) problems.push(`${id}: ${drills.length} drill stubs, expected ${d.count}`);
  }
  if (Array.isArray(block.restarts)) {
    const got = log.restarts ?? [];
    if (got.length !== block.restarts.length) problems.push(`${id}: ${got.length} restarts ${JSON.stringify(got.map((x) => [x.restart, x.space, x.then]))}, expected ${block.restarts.length}`);
    block.restarts.forEach((w, k) => {
      const x = got[k];
      if (!x) return;
      for (const key of ['space', 'set', 'restart', 'then']) if (w[key] !== undefined && x[key] !== w[key]) problems.push(`${id}: restart ${k + 1} ${key} ${x[key]}, expected ${w[key]}`);
      if (w.linked === true) {
        const det = typeof x.detection === 'number' ? log.detections?.[x.detection] : null;
        if (!det) problems.push(`${id}: restart ${k + 1} not linked to a detection`);
        else if (det.restart !== x.restart) problems.push(`${id}: restart ${k + 1}'s detection says restart ${det.restart}, expected ${x.restart}`);
      }
    });
  }
  const dl = block.detections;
  if (dl && typeof dl.count === 'number') {
    const n = (log.detections ?? []).filter((x) => dl.restart === undefined || x.restart === dl.restart).length;
    if (n !== dl.count) problems.push(`${id}: ${n} detection(s)${dl.restart !== undefined ? ` with restart ${dl.restart}` : ''}, expected ${dl.count}`);
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------------------------
// The page (one small object; tests replace it with `ctx.coursePage`)
// ---------------------------------------------------------------------------------------------------------------

/* global window */

/** (in the host page) One poll's read: game time on the driver's clock, the restart count, J14's `lastRetry` and
 *  station, the bay, the spotted rule's hold, the timed gates' open state, the leader's feet and placement count (SR3
 *  `posN`), the driver's rises since `since` and the alerted guards captured at each restart since the last read
 *  (allocates; once per poll). The capture wraps `__course.restartCheckpoint` once (the spotted rule's restart,
 *  courseMode.ts:595-599, and the pause menu's): called on restarts only, never per frame. */
function hostRead({ since, eye }) {
  const c = window.__course;
  const g = window.__app && window.__app.current;
  if (!c || !g || typeof c.debug !== 'function' || !c.state) return null;
  const rr = window.__rr;
  const t0 = rr && typeof rr.time === 'function' ? g.time - rr.time() : 0;
  if (!c.__rrSeen) {
    const seen = [];
    c.__rrSeen = seen;
    const orig = c.restartCheckpoint;
    if (typeof orig === 'function') {
      c.restartCheckpoint = function (...a) {
        const gg = window.__app.current;
        const em = gg.enemyMgr;
        if (em && seen.length < 32) {
          const p = gg.player.position;
          const pc = gg.player.controller;
          const rem = gg.net && gg.net.remotes ? gg.net.remotes.values().next().value : null;
          for (const e of em.enemies) {
            if (!e.alive || e.passive || !e.alerted) continue;
            const robots = [{ x: p.x, y: p.y, z: p.z, crouched: !!pc.crouched, speed: pc.speed ?? 0, light: gg.lightLevel ?? null }];
            if (rem && rem.feet) robots.push({ x: rem.feet.x, y: rem.feet.y, z: rem.feet.z, crouched: !!(rem.ref && rem.ref.crouched), speed: (rem.ref && rem.ref.speed) || 0, light: null });
            seen.push({ abs: gg.time, cls: 'detection', level: 'alert', camera: null, guard: { id: e.id, kind: e.def ? e.def.kind ?? null : null, role: e.job || null, zone: e.zone || null, x: e.pos.x, y: e.pos.y + eye, z: e.pos.z, yaw: e.yaw }, robots, heard: [], told: null, body: null });
          }
        }
        return orig.apply(this, a);
      };
    }
  }
  if (!c.__rrTimed) {
    // the timed gates: isolators, timed holds, and a pickup whose console has a loop time (N2 / N3)
    const consoles = (c.layout && c.layout.consoles) || [];
    const timed = [];
    for (const b of c.state.def.bays) {
      for (const x of b.gates) {
        if (x.kind === 'isolator' || x.kind === 'timedHold' || (x.kind === 'pickup' && consoles.some((k) => k.id === x.switchId && k.seconds > 0))) timed.push(x.id);
      }
    }
    c.__rrTimed = timed;
  }
  const d = c.debug();
  const gates = {};
  for (const id of c.__rrTimed) gates[id] = !!(d.gates && d.gates[id]);
  const caught = c.__rrSeen.splice(0).map((r) => ({ ...r, t: r.abs - t0 }));
  const lr = c.lastRetry;
  const p = g.player.position;
  const raw = rr && typeof rr.rises === 'function' ? rr.rises(since) : [];
  return {
    t: g.time - t0,
    restarts: typeof c.restarts === 'number' ? c.restarts : 0,
    lastRetry: lr && typeof lr === 'object' ? { st: lr.st, cause: lr.cause } : null,
    station: typeof c.station === 'function' ? c.station() : null,
    bay: typeof d.bay === 'number' ? d.bay : null,
    spotHold: typeof c.spotHold === 'number' ? c.spotHold : null,
    gates,
    feet: [p.x, p.y, p.z],
    posN: rr && typeof rr.posN === 'function' ? rr.posN()[3] : null,
    rises: raw.map((r) => ({ t: r.t, cls: r.cls, camera: r.camera ?? null })),
    caught,
  };
}

/** (in the client page) The follower's feet and placement count (SR3 `posN`), or null. */
function clientRead() {
  const rr = window.__rr;
  if (!rr || typeof rr.posN !== 'function') return null;
  const q = rr.posN();
  return { feet: [q[0], q[1], q[2]], posN: q[3] };
}

/** (in the host page) The course door nearest (x, z): its course id (courseMode's lookup: `layout.doors` by the door's
 *  anchor id, courseMode.ts:252-256), locked by the course (`debug().locks`), its airlock (phase, whether this is its far
 *  door, the pad's middle as e2e-ctcourse `throughHoldingRoom`). */
function hostDoor([x, z, reach]) {
  const c = window.__course;
  const g = window.__app && window.__app.current;
  if (!c || !g || !c.layout || !c.state || !g.world.doors) return null;
  const dr = g.world.doors.nearest(x, z, reach);
  if (!dr) return null;
  let cid = null;
  for (const [k, aid] of Object.entries(c.layout.doors || {})) {
    if (aid === dr.anchor.id) {
      cid = k;
      break;
    }
  }
  if (!cid) return { cid: null, locked: false, airlock: null };
  const d = c.debug();
  const a = (c.state.def.airlocks || []).find((q) => q.farDoor === cid || q.nearDoor === cid);
  const airlock = a ? { id: a.id, phase: (d.air || {})[a.id] ?? null, far: a.farDoor === cid, pad: [(a.box[0] + a.box[2]) / 2, a.floorY ?? 0, (a.box[1] + a.box[3]) / 2] } : null;
  return { cid, locked: (d.locks || []).includes(cid), airlock };
}

const defaultPages = new WeakMap();

/** The page access for course mode: the default reads `window.__course` / `__app` / `__rr` on `ctx.host` (and
 *  `ctx.client`); `ctx.coursePage` replaces it (tests). */
export function coursePage(ctx) {
  if (ctx.coursePage) return ctx.coursePage;
  let p = defaultPages.get(ctx);
  if (p) return p;
  const host = (fn, arg) => ctx.host.evaluate(fn, arg);
  p = {
    async read(since, withClient) {
      const r = await host(hostRead, { since, eye: EYE_M });
      if (r && withClient && ctx.client) r.follower = await ctx.client.evaluate(clientRead);
      return r;
    },
    door: (x, z) => host(hostDoor, [x, z, DOOR_REACH_M]),
    locked: (cid) => host((id) => { const c = window.__course; return !!c && (c.debug().locks || []).includes(id); }, cid),
    nextDrill: (pl) => host((k) => {
      const st = window.__course && window.__course.state;
      const d = st ? st.nextDrill(k) : null;
      return d ? { id: d.id, verb: d.verb, count: d.count ?? 1, left: (d.count ?? 1) - st.drillTicks(d.id, k) } : null;
    }, pl),
    act: (a) => host((x) => {
      const c = window.__course;
      if (!c) return false;
      if (x.kind === 'flag') c.state.setFlag(x.flag);
      else c.verb(x.player, x.verb);
      return true;
    }, a),
    pos: () => host(() => { const q = window.__app.current.player.position; return [q.x, q.y, q.z]; }),
    setSpotHold: (v) => host((h) => { const c = window.__course; if (c) c.spotHold = h; return !!c; }, v),
    retryOff: (n) => host((k) => { const c = window.__course; return c && typeof c.retryOff === 'function' ? !!c.retryOff(k) : null; }, n),
    raise: (guard) => host((id) => {
      const c = window.__course;
      const g = window.__app && window.__app.current;
      if (!c || !g) return false;
      let e = typeof c.squadOf === 'function' ? c.squadOf(id) : null;
      if (!e && g.enemyMgr) e = g.enemyMgr.enemies.find((q) => q.id === id) ?? null;
      if (!e || !e.alive || !e.aware) return false;
      // spotFailed reads `alerted` (src/game/course/spotFail.ts), the alert machine's level (src/ai/alertState.ts)
      e.aware.set('alert');
      return true;
    }, guard),
    interrupt: () => host(() => { const rr = window.__rr; if (!rr || typeof rr.interrupt !== 'function') return false; rr.interrupt(); return true; }),
    async shot(file) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await ctx.host.screenshot({ path: file, timeout: 30000 });
      return true;
    },
  };
  defaultPages.set(ctx, p);
  return p;
}

// ---------------------------------------------------------------------------------------------------------------
// Page glue
// ---------------------------------------------------------------------------------------------------------------

const states = new WeakMap();

/** The run's watcher state. */
function stateOf(run) {
  let s = states.get(run);
  if (!s) {
    s = {
      base: false, off: false, ended: false, t: 0, restarts: 0, bay: null, gates: {}, feet: null, posN: null, follower: null,
      space: null, riseIdx: 0, rises: [], caught: [], closes: [], follow: followState(), meta: [], queue: null,
      timerDrills: false, ruleOff: null, raised: {}, inside: {}, shots: 0,
    };
    states.set(run, s);
  }
  return s;
}

const robotName = (ctx) => (ctx.pair || ctx.players === 2 ? 'leader' : 'host');

/** Every drill still open for either player done through the host's hooks, each a drill stub (one per drill and player;
 *  the first carries `hold`, held first by both robots when > 0). Returns the number of stubs logged. */
async function doDrills(ctx, run, page, why, hold) {
  if (!(await page.nextDrill(0)) && !(await page.nextDrill(1))) return 0;
  if (hold > 0) await ctx.driver.hold(hold);
  const done = new Set();
  let n = 0;
  for (const p of [0, 1]) {
    let used = 0;
    while (used < VERB_CAP) {
      const d = await page.nextDrill(p);
      if (!d) break;
      for (const a of drillActions([{ ...d, player: p }])) {
        if (used >= VERB_CAP) break;
        await page.act(a);
        used++;
      }
      const key = `${d.id}|${p}`;
      if (done.has(key)) continue;
      done.add(key);
      run.drills.push({ id: d.id, player: p + 1, verb: d.verb, hold_s: n === 0 ? r2(hold) : 0, why });
      n++;
    }
  }
  return n;
}

/** Polls the course lock every `LOCK_POLL_S` (every page stepped) for up to `limit` s: true once it opens. */
async function waitOpen(ctx, page, cid, limit) {
  if (!(await page.locked(cid))) return true;
  for (let waited = 0; waited < limit - 1e-9; waited += LOCK_POLL_S) {
    await ctx.advance(LOCK_POLL_S);
    if (!(await page.locked(cid))) return true;
  }
  return false;
}

/**
 * A locked door on the path (BRIEF "Marlow Yard drill gates", A13): false at once when it is not a course lock (or an
 * airlock's sealed near door: locked for good); an airlock cycling is waited for (`AIRLOCK_WAIT_S`, no stubs); else the
 * drill hold and the drill stubs, both robots onto the pad of an airlock whose far door this is unless both stand on it
 * already (`ready`), then the lock polled (`AIRLOCK_WAIT_S` for an airlock, else `UNLOCK_WAIT_S`). True: it opened.
 */
export async function onLockedDoor(ctx, run, step) {
  const at = step?.at;
  if (!Array.isArray(at)) return false;
  const page = coursePage(ctx);
  const door = await page.door(at[0], at[2]);
  if (!door || !door.cid || !door.locked) return false;
  const air = door.airlock;
  if (air && !air.far && air.phase === 'sealed') return false;
  if (air && air.phase === 'cycling') return waitOpen(ctx, page, door.cid, AIRLOCK_WAIT_S);
  await doDrills(ctx, run, page, 'gate', drillHold(ctx.graphs ?? null, run.section, run.stubs));
  if (air && air.far && Array.isArray(air.pad) && air.phase !== 'ready') await ctx.driver.place(air.pad);
  return waitOpen(ctx, page, door.cid, air ? AIRLOCK_WAIT_S : UNLOCK_WAIT_S);
}

const asPos = (feet, n) => (Array.isArray(feet) ? { x: feet[0], y: feet[1], z: feet[2], n } : null);

/**
 * After every driver chunk (BRIEF "Restarts and retries", A14): the first poll of a run is its baseline (the run's own
 * start restart has fired by then); later polls log each restart with its cause and what follows, keep the spotted rule
 * off for the rest of the set once turned off, do queued timer drill stubs, and (selftest, SR2) raise a guard. Page
 * reads and calls only: no wait, no placement, no clock advance.
 */
export async function onPoll(ctx, run) {
  const s = stateOf(run);
  if (s.off || s.ended) return;
  const page = coursePage(ctx);
  const r = await page.read(s.riseIdx, s.posN !== null && !!ctx.client);
  if (!r) {
    // not a course page (no `window.__course`): nothing to watch this run
    if (!s.base) s.off = true;
    return;
  }
  // the driver's clock went back: the next run's restart (this run is over)
  if (s.base && r.t < s.t - 1e-6) {
    s.ended = true;
    return;
  }
  s.riseIdx += r.rises.length;
  const points = ctx.driver?.points ?? null;
  const space = spaceAt(points, r.feet[0], r.feet[1], r.feet[2]);
  if (!s.base) {
    s.base = true;
    Object.assign(s, { t: r.t, restarts: r.restarts, bay: r.bay, gates: r.gates ?? {}, feet: r.feet, posN: r.posN ?? null, follower: r.follower ?? null, space });
    await raiseHook(ctx, run, s, page, space);
    return;
  }
  // a timer restart's drills, queued on the poll that saw it (the restart has settled since)
  if (s.timerDrills) {
    s.timerDrills = false;
    await doDrills(ctx, run, page, 'timer', 0);
  }
  // the spotted rule stays off for the rest of the set (a later restart sets the bay's hold back); the next set has it
  if (s.ruleOff) {
    if (r.bay !== s.ruleOff.bay) {
      await page.setSpotHold(0);
      s.ruleOff = null;
    } else if (typeof r.spotHold === 'number' && r.spotHold < SPOT_OFF / 2) await page.setSpotHold(SPOT_OFF);
  }
  for (const id of Object.keys(r.gates ?? {})) if (s.gates[id] && !r.gates[id]) s.closes.push({ id, t: r.t });
  for (const x of r.rises) s.rises.push({ t: x.t, cls: x.cls });
  for (const x of r.caught ?? []) s.caught.push({ ...x, space: x.robots?.[0] ? spaceAt(points, x.robots[0].x, x.robots[0].y, x.robots[0].z) : null });
  const keep = r.t - 4 * CAUSE_WINDOW_S;
  s.closes = s.closes.filter((x) => x.t >= keep);
  s.rises = s.rises.filter((x) => x.t >= keep);
  s.caught = s.caught.filter((x) => x.t >= keep);

  const rose = typeof r.restarts === 'number' && r.restarts > s.restarts ? Math.min(4, r.restarts - s.restarts) : 0;
  const dt = r.t - s.t;
  const jump = !rose && (jumped(asPos(s.feet, s.posN), asPos(r.feet, r.posN ?? null), dt) || (!!s.follower && !!r.follower && jumped(asPos(s.follower.feet, s.follower.posN), asPos(r.follower.feet, r.follower.posN), dt)));
  const n = rose || (jump ? 1 : 0);
  for (let k = 0; k < n; k++) await restartSeen(ctx, run, s, page, r, rose > 0);

  await raiseHook(ctx, run, s, page, space);
  Object.assign(s, { t: r.t, restarts: typeof r.restarts === 'number' ? r.restarts : s.restarts, bay: r.bay, gates: r.gates ?? {}, feet: r.feet, posN: r.posN ?? null, follower: r.follower ?? null, space });
}

/** One restart: its cause, its line, and what follows (the queued rejoin / push past, the rule off, the timer drills,
 *  the `restart-loop` stop). */
async function restartSeen(ctx, run, s, page, r, rose) {
  const retry = rose && r.lastRetry ? r.lastRetry : null;
  const cls = classify({ retry, rises: [...s.rises, ...s.caught], closes: s.closes, lastT: s.t, nowT: r.t });
  const st = retry && retry.st > 0 ? retry.st : r.station > 0 ? r.station : null;
  const place = { space: s.space, step: st !== null ? `station ${st}` : s.space, t: r.t };
  const f = follow(s.follow, cls.cause, place);
  run.restarts.push(restartLine(r.t, s.space, run.section, cls.restart, f.then));
  const w = causeWindow(s.t, r.t);
  const captured = cls.cause === 'seen' ? [...s.caught].reverse().find((x) => x.t >= w.from - 1e-9 && x.t <= w.to + 1e-9) ?? null : null;
  s.meta[run.restarts.length - 1] = { from: w.from, to: w.to, captured };
  let queued = false;
  for (const a of f.actions) {
    if (a === 'rejoin' || a === 'pushPast') {
      s.queue = { type: a };
      queued = true;
    } else if (a === 'timerDrills') s.timerDrills = true;
    else if (a === 'ruleOff') {
      if (retry) {
        const ok = await page.retryOff(retry.st);
        if (ok !== true && ctx.notes) ctx.notes.push(`run ${run.id}: retryOff(${retry.st}) refused at ${s.space ?? 'an unknown place'} (the retry rule stays on)`);
      } else {
        await page.setSpotHold(SPOT_OFF);
        s.ruleOff = { bay: r.bay };
      }
    } else if (a === 'deadStop') {
      let shot = null;
      if (ctx.shots) {
        const name = `${run.id}-course-${++s.shots}.png`.replace(/[^\w.-]/g, '_');
        try {
          await page.shot(path.join(ctx.shots, name));
          shot = `shots/${name}`;
        } catch {
          shot = null;
        }
      }
      const at = s.feet ?? r.feet;
      const step = ctx.pair?.step ?? null;
      run.deadStops.push({ t: r2(r.t), robot: robotName(ctx), at: [r2(at[0]), r2(at[1]), r2(at[2])], space: s.space, link: step ? step.link ?? step.index ?? null : null, class: 'restart-loop', shot, since: r2(f.since ?? r.t) });
    }
  }
  // (SR3) the driver's next tick hands back event `course`, so `onRestart` takes the queued action
  if (queued) await page.interrupt();
}

/** (selftest, SR2) The fixture run's `course.raise` `[{ guard, space, times }]`: on entering `space` (the leader's feet),
 *  that guard raised to alert in the host page while he has been raised fewer than `times` times this run. Logs
 *  nothing: the rise and the restart log themselves. */
async function raiseHook(ctx, run, s, page, space) {
  const er = Array.isArray(ctx.selftest?.runs) ? ctx.selftest.runs.find((x) => x.id === run.id) : null;
  const list = er?.course?.raise;
  if (!Array.isArray(list)) return;
  for (let k = 0; k < list.length; k++) {
    const e = list[k];
    const inside = space !== null && space === e.space;
    const entered = inside && !s.inside[k];
    s.inside[k] = inside;
    if (!entered || (s.raised[k] ?? 0) >= (e.times ?? 1)) continue;
    if (await page.raise(e.guard)) s.raised[k] = (s.raised[k] ?? 0) + 1;
  }
}

/**
 * (SR3) After a wait handed back event `course`: the queued action for step `i` of `steps`, or null (none queued).
 * Rejoin: `{ resume: rejoinIndex(steps, i, the leader's feet), place: null }`. Push past: `{ resume, place: { leader:
 * the link's past, follower: null } }` (the driver puts the follower beside).
 */
export async function onRestart(ctx, run, steps, i) {
  const s = states.get(run);
  const q = s?.queue;
  if (!q) return null;
  s.queue = null;
  if (q.type === 'pushPast') {
    const tgt = pushPastTarget(steps, i);
    if (tgt) return { resume: tgt.resume, place: { leader: tgt.past, follower: null } };
  }
  const feet = await coursePage(ctx).pos();
  return { resume: rejoinIndex(steps, i, feet), place: null };
}

/** (SR4) At the run's end: the seen restarts linked to their detections (`linkRestarts`), its notes into `ctx.notes`. */
export async function onRunEnd(ctx, run) {
  const s = states.get(run);
  if (s) s.ended = true;
  const names = ctx.pair || ctx.players === 2 ? ['leader', 'follower'] : ['host', 'client'];
  const notes = linkRestarts(run, s?.meta ?? [], names);
  for (const n of notes) if (ctx.notes) ctx.notes.push(`run ${run.id}: ${n}`);
  return notes;
}
