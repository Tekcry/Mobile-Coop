// Route-run driver (J13 R4a, docs/route-runs/PLAN.md "R4a Harness core, one page"): the in-page robot and the Node
// side that runs one planned run with it.
//
// In the page (`pageDriver`, injected once with `install`; R3's progress.mjs injected beside it): the robot walks a leg
// with the virtual pad (`window.__pad`), stepping the game in `CHUNK_S` chunks with `loop.stepHeadless` while the real
// loop only renders (`loop.manual`), so every time is game time and a loaded laptop changes nothing. Per chunk it steers
// along a nav path (R3 `PathProgress`, `Steer`), keeps the A4 stuck clock (`StuckWatch`), taps A at a shut door it is
// stopped at, and every `POLL_S` of game time polls each guard's alert level and the camera alarms for rises (BRIEF
// "Detections"; noises through a wrapped `enemyMgr.hear` / `noise`). A detection is forgiven (BRIEF A2: the guard's alert
// machine back to `unaware`, `enemyMgr.resetAlarm()`) unless `--detections keep`. Hot path (`tick` and what it calls
// per chunk): no allocation (numbers, typed arrays and the R3 objects only); a rise, a leg's path and a placement may
// allocate (once each).
//
// On the Node side (`PageDriver`, `runOne`): each run starts from the section's checkpoint (`restartCheckpoint`: the
// guards back on their fixed patrols, calm), checks the guards (A15), then takes its steps: `walk` (a dead stop when the
// stuck clock fires: classed by a nav `findPath` probe, a screenshot, then the robot is placed past the link so the run
// reports every stop), `link` (`walk` and `door` here; every other action through steps.mjs), `objective` (Sector Ops:
// A at the section's objective until it is done: tapped, or held down for a hold objective such as a hack), and logs
// the run (the R2 log shape, scripts/route-run/report.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { stepLimit, TRAIL_M } from './progress.mjs';
import { readCauses } from './causes.mjs';
import { stepFor } from './steps.mjs';
import * as course from './course.mjs';

/** Game seconds per driver chunk (one stick update and stuck check each; the PLAN's 0.05 s). */
export const CHUNK_S = 0.05;
/** Guard levels and camera alarms are polled this often (game s; the PLAN's 0.1 s). */
export const POLL_S = 0.1;
/** Game seconds one `page.evaluate` runs before handing back to Node (the page stays responsive). */
export const EVAL_S = 2;
/** After a restart: the respawn (0.3 s) runs out first (its spawn protection's 2 s timer is real time: `tick` keeps
 *  `damageMul` 0 every chunk after `noDamage`). */
export const SETTLE_S = 2.4;
/** A placement settles this long (game s). */
export const PLACE_SETTLE_S = 0.2;
/** A robot stopped this long (game s) at a shut door taps A (and again every `DOOR_RETAP_S`). */
export const DOOR_STOP_S = 0.6;
export const DOOR_RETAP_S = 2.5;
/** A door this near (m) a stopped robot, or a door link's point, is the door it opens. */
export const DOOR_REACH_M = 1.6;
/** A shut door is open enough to walk through at this much of its swing. */
export const DOOR_OPEN_AT = 0.6;
/** A locked door this near (m) a stalled robot makes the stop `locked`. */
export const LOCKED_NEAR_M = 1.5;
/** A placement lands this far (m) past a link's point, toward the far space's centre. */
export const PAST_M = 1.2;
/** A download's hold (s; the page gives no length): its limit is `stepLimit('objective', null, OBJECTIVE_HOLD_S)`. */
export const OBJECTIVE_HOLD_S = 30;
/** The objective is tried this long (game s) from where the robot stands before it walks to the objective's point. */
export const OBJECTIVE_TRY_S = 1;
/** A run longer than this (game s) stops with a `step-timeout` (a safety net; a stuck robot stops at 8 s anyway). */
export const RUN_CAP_S = 1800;
/** A guard's eye above his feet (m), for the inferred sight inputs. */
export const EYE_M = 1.6;
/** Noises kept in the page's ring (the hearing inputs of the next rise). */
export const NOISE_RING = 64;
/** A noise this recent (game s) at a rise is one he may have heard. */
export const NOISE_WINDOW_S = 1;
/** Nav search budget for a leg (cells expanded), as e2e-sectorops' route check. */
export const NAV_EXPAND = 200000;
/** A floor zone holds feet this near its floor (m; src/game/sectors.ts `ZONE_Y_TOL`). */
export const ZONE_Y_M = 1.5;
/** (follower) The host's avatar moving this far (m) between two polls jumped (a placement): the trail starts afresh. */
export const TRAIL_JUMP_M = 3;

// ---------------------------------------------------------------------------------------------------------------
// The page side. `pageDriver` is serialised with `toString()` and run in the page: it may use only its arguments and
// the page's globals.
// ---------------------------------------------------------------------------------------------------------------

/* global window */
function pageDriver(P, o) {
  const app = window.__app;
  const pad = window.__pad;
  const BTN_A = 0;
  const BTN_B = 1;
  // D-pad up: free in play (no action outside a held context menu), so a tap wakes the pad without doing anything; in a
  // held context menu up / down move the highlight (`ctxUp` / `ctxDown`)
  const BTN_UP = 12;
  const BTN_DOWN = 13;
  const IDLE = 0;
  const WALK = 1;
  const HOLD = 2;
  const DOOR = 3;
  const OBJECTIVE = 4;
  const watch = new P.StuckWatch();
  const last = [];
  const rises = [];
  const nt = new Float64Array(o.noiseRing);
  const nx = new Float64Array(o.noiseRing);
  const ny = new Float64Array(o.noiseRing);
  const nz = new Float64Array(o.noiseRing);
  const nr = new Float64Array(o.noiseRing);
  const nk = new Array(o.noiseRing).fill('noise');
  const cell = [0, 0];
  const goal = new Float64Array(3);
  let nHead = 0;
  let nCount = 0;
  let mode = IDLE;
  let prog = null;
  let steer = null;
  let t0 = 0;
  let holdEnd = 0;
  let lastS = 0;
  let lastMoveT = 0;
  let doorTapT = -1e9;
  let crouchTapT = -1e9;
  let objTapT = -1e9;
  let objTryEnd = Infinity;
  let tapBtn = -1;
  let tapLeft = 0;
  let pollT = 0;
  let lastCam = 0;
  let lastCamAlarms = 0;
  let walked = 0;
  let door = null;
  let objIndex = -1;
  // a hold objective (a hack): its interactable, its hold time (s), A held down for it, when A went up, the last
  // highlight move in the held context menu
  let objItem = null;
  let objHold = 0;
  let objStarted = false;
  let aHeld = false;
  let aRelT = -1e9;
  let navT = -1e9;
  let wrapped = null;
  let noHurt = false;
  // (SR3) a course interrupt latched for the next `tick`; the placements made (`posN`)
  let intr = false;
  let placeN = 0;
  // (R4b pair) The leader (host) reads the guards; the follower (client) trails the host's avatar (R3 `Trail`, steered by
  // R3 `Steer` on a two-point path rebuilt in place), its stuck clock on `lw` (the leader's walked path) minus its
  // distance to the trail point. Its events never stop a tick: they are latched in `fev`.
  const TRAIL = 5;
  const leader = o.role !== 'follower';
  const trail = leader ? null : new P.Trail();
  const tPath = leader ? null : P.makePath([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]);
  const tSteer = leader ? null : new P.Steer(tPath);
  let trailOn = false;
  let avatar = null;
  let lw = 0;
  let ax = 0;
  let ay = 0;
  let az = 0;
  let fev = '';
  let leaderIdle = true;
  // host: the client's remote player (its feet for the rises), every remote (damage off each chunk)
  let remote = null;
  let remotes = [];

  const st = () => app.current;

  /** The walk goal for (x, y, z) into `goal`: the point itself, or the nearest walkable cell when it is not walkable (an
   *  objective on a desk); an unreachable walkable point (behind a locked door) stays as it is. */
  function goalOf(nav, x, y, z) {
    goal[0] = x;
    goal[1] = y;
    goal[2] = z;
    if (!nav) return;
    const c0 = nav.cellOf(x, z, y);
    if (c0 >= 0 && nav.isWalkable(c0)) return;
    const k = nav.nearestWalkable(x, z, 12, y);
    if (k < 0) return;
    nav.centerInto(k, cell);
    goal[0] = cell[0];
    goal[2] = cell[1];
    const h = nav.cellHeight(k);
    if (h === h) goal[1] = h;
  }
  const now = () => app.current.time - t0;

  /** Sector Ops: the live section's objective interactable (`<section id>-obj`), or null (allocates; once per use). */
  function objectiveItem(m) {
    const s = m.run.current;
    const ints = st().interactables;
    if (!s || !ints || !ints.items) return null;
    const id = `${s.id}-obj`;
    return ints.items.find((i) => i.id === id) ?? null;
  }

  function tap(btn) {
    if (tapLeft > 0) pad.set(tapBtn, 0);
    tapBtn = btn;
    tapLeft = 2;
    pad.set(btn, 1);
  }

  function stopStick() {
    pad.axis(0, 0);
    pad.axis(1, 0);
  }

  /** A held down (a hold objective) or let go; a tap of A still pending is let go first. */
  function holdA(on, t) {
    if (tapLeft > 0 && tapBtn === BTN_A) {
      pad.set(BTN_A, 0);
      tapLeft = 0;
      aRelT = t;
    }
    if (on === aHeld) return;
    aHeld = on;
    pad.set(BTN_A, on ? 1 : 0);
    if (on) objTapT = t;
    else aRelT = t;
  }

  /** A hold objective, each chunk: A stays down while the held context menu's highlight is on the item's row (a door set
   *  or a guard row may list first: D-pad down / up moves it); with no list, or no item row in it, A goes up and is
   *  pressed again a second later. The press waits one released step, so the game sees it go down. No allocation. */
  function holdStep(g, t) {
    if (!aHeld) {
      if (t - aRelT >= o.chunk - 1e-9 && t - objTapT > 1) holdA(true, t);
      return;
    }
    const cm = g.ctxMenu;
    if (cm && cm.state === 'active') {
      let row = -1;
      for (let k = 0; k < cm.count; k++) {
        if (cm.opts[k].kind === 'item') {
          row = k;
          break;
        }
      }
      if (row < 0) holdA(false, t);
      else if (cm.sel !== row && t - navT > 0.15) {
        tap(cm.sel < row ? BTN_DOWN : BTN_UP);
        navT = t;
      }
      return;
    }
    if (t - objTapT > 1) holdA(false, t);
  }

  /** (once per enemy manager) Noises into the ring. */
  function wrapNoise(em) {
    if (!em || wrapped === em) return;
    wrapped = em;
    const rec = (pos, reach, kind) => {
      const i = nHead;
      nt[i] = app.current.time;
      nx[i] = pos.x;
      ny[i] = pos.y;
      nz[i] = pos.z;
      nr[i] = reach;
      nk[i] = kind;
      nHead = (nHead + 1) % o.noiseRing;
      if (nCount < o.noiseRing) nCount++;
    };
    const hear = em.hear;
    em.hear = function (pos, reach, kind, ...rest) {
      if (pos) rec(pos, reach, kind ?? 'noise');
      return hear.call(this, pos, reach, kind, ...rest);
    };
    const noise = em.noise;
    if (typeof noise === 'function') {
      em.noise = function (pos, reach, ...rest) {
        if (pos) rec(pos, reach, 'noise');
        return noise.call(this, pos, reach, ...rest);
      };
    }
  }

  /** A rise: what the robot and the guard were at that poll (allocates; rare). */
  function rise(g, cls, level, e, camera) {
    const p = g.player.position;
    const c = g.player.controller;
    const heard = [];
    const tNow = g.time;
    for (let k = 1; k <= nCount; k++) {
      const j = (nHead - k + o.noiseRing) % o.noiseRing;
      if (tNow - nt[j] > o.noiseWindow) break;
      heard.push({ x: nx[j], y: ny[j], z: nz[j], radius: nr[j], kind: nk[j] });
    }
    const guard = e
      ? { id: e.id, kind: e.def?.kind ?? null, role: e.job || null, zone: e.zone || null, x: e.pos.x, y: e.pos.y + o.eye, z: e.pos.z, yaw: e.yaw }
      : { id: camera, kind: 'camera', role: null, zone: null };
    rises.push({
      t: tNow - t0,
      cls,
      level,
      camera: e ? null : camera,
      guard,
      robots: remote
        ? [{ x: p.x, y: p.y, z: p.z, crouched: !!c.crouched, speed: c.speed ?? 0, light: g.lightLevel ?? null }, { x: remote.feet.x, y: remote.feet.y, z: remote.feet.z, crouched: !!(remote.ref && remote.ref.crouched), speed: (remote.ref && remote.ref.speed) || 0, light: null }]
        : [{ x: p.x, y: p.y, z: p.z, crouched: !!c.crouched, speed: c.speed ?? 0, light: g.lightLevel ?? null }],
      heard,
      told: null,
      body: null,
    });
  }

  /** The camera most aware of a robot (the alarm's camera), from the devices' debug view (allocates; rare). */
  function alarmCamera() {
    const ct = window.__ctdev;
    if (!ct) return 'camera';
    let best = 'camera';
    let top = -1;
    for (const c of ct.debug().cams ?? []) {
      for (const m of c.meter ?? []) {
        if (m > top) {
          top = m;
          best = c.id;
        }
      }
    }
    return best;
  }

  /** Every `POLL_S`: each guard's level against the last poll (BRIEF "Detections", A12), then the camera alarms. */
  function poll(g) {
    const em = g.enemyMgr;
    if (em) {
      const es = em.enemies;
      for (let i = 0; i < es.length; i++) {
        const e = es[i];
        if (!e.alive) {
          last[i] = 'unaware';
          continue;
        }
        const lv = e.level;
        const from = last[i] === undefined ? 'unaware' : last[i];
        last[i] = lv;
        const cls = P.riseClass(from, lv);
        if (cls === '') continue;
        rise(g, cls, lv, e, null);
        if (cls === P.RISE_DETECTION && o.forgive) {
          // BRIEF A2: one sighting marks one place; it does not snowball into a chase or a lockdown
          e.aware.set('unaware');
          em.resetAlarm();
          last[i] = 'unaware';
        }
      }
    }
    const ct = window.__ctdev;
    const sec = window.__sector;
    const ca = ct ? ct.alarm : 0;
    const sa = sec ? sec.camAlarms : 0;
    if (ca > lastCam || sa > lastCamAlarms) rise(g, P.RISE_DETECTION, 'alarm', null, alarmCamera());
    lastCam = ca;
    lastCamAlarms = sa;
  }

  /** Sector Ops: 'connector' / 'extract' when the robot is in the open connector or the extraction (its hold would
   *  start the cycle or end the op, so the walk is over there), else ''. No allocation. */
  function exitAt(p) {
    const m = window.__sector;
    // (the leader's exit ends the run; the follower never ends it)
    if (!m || !leader) return '';
    const r = m.run;
    const ph = r.phase;
    if (ph !== 'connector' && ph !== 'extract') return '';
    if ((r.conn && r.conn.insideT > 0) || r.extractT > 0) return ph;
    const s = r.current;
    // the zone that ends the section, as the mode's `exitZone`
    const z = s ? s.connector ?? s.extract ?? null : null;
    if (!z) return '';
    const b = z.box;
    const inBox = p.x >= Math.min(b[0], b[2]) && p.x <= Math.max(b[0], b[2]) && p.z >= Math.min(b[1], b[3]) && p.z <= Math.max(b[1], b[3]);
    return inBox && Math.abs(p.y - (z.floorY ?? 0)) < o.zoneY ? ph : '';
  }

  /** Walking: the crouch tap, and A at a shut door the robot is stopped at (BRIEF: A near a shut door on the path). */
  function stanceAndDoor(g, p, t) {
    // (the toggle's intent, not the stance: a low ceiling may hold a stand back, and a tap would only flip it again)
    const c = g.player.controller;
    if ((c.crouchIntent ?? c.crouched) !== o.crouch && t - crouchTapT > 1) {
      tap(BTN_B);
      crouchTapT = t;
    }
    if (t - lastMoveT > o.doorStop && t - doorTapT > o.doorRetap) {
      const d = g.world.doors ? g.world.doors.nearest(p.x, p.z, o.doorReach) : null;
      if (d && d.open < 0.2 && !d.anchor.locked) {
        tap(BTN_A);
        doorTapT = t;
      }
    }
  }

  /** (follower) The host's avatar on this page (allocates an iterator; only while it is missing). */
  function findAvatar(g) {
    const av = g.net && g.net.avatars ? g.net.avatars.values().next().value : null;
    return av || null;
  }

  function startTrail(g) {
    mode = TRAIL;
    watch.idle();
    lastMoveT = g.time;
    if (!avatar) avatar = findAvatar(g);
  }

  /** (follower, every poll) The avatar's feet into the trail (a jump over `o.jumpM`, a placement, starts it afresh), its
   *  point `trailM` back, and the steer's two-point path from the follower's feet to it, rebuilt in place. */
  function trailPoll(g) {
    if (!avatar) avatar = findAvatar(g);
    if (!avatar) return;
    const ap = avatar.pos;
    const d = trail.count > 0 ? P.hyp3(ap.x - ax, ap.y - ay, ap.z - az) : 0;
    if (d > o.jumpM) trail.reset();
    else if (d >= trail.spacing) lw += d;
    if (trail.count === 0 || d >= trail.spacing) {
      ax = ap.x;
      ay = ap.y;
      az = ap.z;
    }
    trail.push(ap.x, ap.y, ap.z);
    trail.point(o.trailM, ap.x, ap.y, ap.z);
    const p = g.player.position;
    tPath.x[0] = p.x;
    tPath.y[0] = p.y;
    tPath.z[0] = p.z;
    tPath.x[1] = trail.tx;
    tPath.y[1] = trail.ty;
    tPath.z[1] = trail.tz;
    tPath.cum[1] = P.hyp3(trail.tx - p.x, trail.ty - p.y, trail.tz - p.z);
    tPath.length = tPath.cum[1];
    tSteer.reset();
  }

  /** Before a chunk: the stick, the stuck clock, the door and crouch taps. Returns an event ('' none). */
  function pre(g) {
    const t = g.time;
    if (mode === WALK) {
      const p = g.player.position;
      const s = prog.update(p.x, p.y, p.z);
      if (s > lastS + 0.05) {
        lastS = s;
        lastMoveT = t;
      }
      const ex = exitAt(p);
      if (ex !== '') {
        stopStick();
        walked += s;
        mode = IDLE;
        return ex;
      }
      steer.update(p.x, p.y, p.z, s, g.player.cam.yaw, o.stick);
      if (steer.done) {
        stopStick();
        walked += prog.path.length;
        mode = IDLE;
        return 'arrived';
      }
      if (watch.update(t - t0, s) === P.WATCH_STALL) {
        stopStick();
        walked += s;
        mode = IDLE;
        return 'stall';
      }
      pad.axis(0, steer.axisX);
      pad.axis(1, steer.axisY);
      stanceAndDoor(g, p, t);
      return '';
    }
    if (mode === TRAIL) {
      // (R4b follower) idle while the leader is idle and it is near him; else steer to the trail point
      const p = g.player.position;
      const a = avatar;
      if (!a) {
        stopStick();
        return '';
      }
      if (leaderIdle && P.hyp3(p.x - a.pos.x, p.y - a.pos.y, p.z - a.pos.z) <= o.trailM + 1) {
        stopStick();
        if (watch.mode !== 'idle') watch.idle();
        return '';
      }
      const s = lw - P.hyp3(p.x - trail.tx, p.y - trail.ty, p.z - trail.tz);
      if (watch.mode === 'idle') {
        watch.walk(t - t0, s);
        lastS = s;
        lastMoveT = t;
      }
      if (s > lastS + 0.05) {
        lastS = s;
        lastMoveT = t;
      }
      if (watch.update(t - t0, s) === P.WATCH_STALL) {
        stopStick();
        mode = IDLE;
        return 'stall';
      }
      tSteer.update(p.x, p.y, p.z, 0, g.player.cam.yaw, o.stick);
      if (tSteer.done) stopStick();
      else {
        pad.axis(0, tSteer.axisX);
        pad.axis(1, tSteer.axisY);
      }
      stanceAndDoor(g, p, t);
      return '';
    }
    if (mode === HOLD) {
      // (a placement or a stub's hold in the zone: no hold there either)
      const ex = exitAt(g.player.position);
      if (ex !== '') {
        mode = IDLE;
        return ex;
      }
      if (t >= holdEnd - 1e-9) {
        mode = IDLE;
        return 'held';
      }
      return '';
    }
    if (mode === DOOR) {
      if (door.open >= o.doorOpenAt) {
        mode = IDLE;
        return 'opened';
      }
      if (watch.update(t - t0, 0) === P.WATCH_STEP_TIMEOUT) {
        mode = IDLE;
        return 'timeout';
      }
      if (door.open < 0.05 && t - doorTapT > o.doorRetap) {
        tap(BTN_A);
        doorTapT = t;
      }
      return '';
    }
    if (mode === OBJECTIVE) {
      const m = window.__sector;
      if (!m || m.run.index !== objIndex || m.run.phase !== 'objective') {
        holdA(false, t);
        mode = IDLE;
        return 'done';
      }
      if (watch.update(t - t0, 0) === P.WATCH_STEP_TIMEOUT) {
        holdA(false, t);
        mode = IDLE;
        return 'timeout';
      }
      // the use started: a download runs; a hold (a hack) fills its interactable's progress
      if (!objStarted && (objHold > 0 ? objItem !== null && (objItem.progress > 0 || objItem.done === true) : m.run.downloading)) objStarted = true;
      // a try from where the robot stands: the use did not start here
      if (!objStarted && t >= objTryEnd - 1e-9) {
        holdA(false, t);
        mode = IDLE;
        return 'nostart';
      }
      if (objHold > 0) holdStep(g, t);
      else if (!m.run.downloading && t - objTapT > 3) {
        tap(BTN_A);
        objTapT = t;
      }
      return '';
    }
    return '';
  }

  /** After a chunk: the tap's release, the guard poll (the leader; guards are host-side) or the trail (the follower). */
  function post(g) {
    if (tapLeft > 0 && --tapLeft === 0) pad.set(tapBtn, 0);
    if (g.time >= pollT - 1e-9) {
      pollT = g.time + o.poll;
      if (leader) poll(g);
      else if (trailOn) trailPoll(g);
    }
  }

  return {
    /** Run up to `maxS` game seconds, or until an event: `{ ev, t, dt, walking, x, y, z }` ('' when the time ran out
     *  first; `dt` the game time stepped, `walking` the robot on a leg). The follower always steps all of `maxS` (Node
     *  steps both pages the same time) and reports its latched event; `lIdle` says the leader is not walking. */
    tick(maxS, lIdle) {
      const g = st();
      const loop = app.loop;
      const start = g.time;
      const end = g.time + maxS;
      let ev = '';
      if (!leader) leaderIdle = lIdle !== false;
      // (SR3) a course interrupt: the robot stops; the leader's tick ends at once with event 'course', the follower
      // latches it as its other events
      if (intr) {
        intr = false;
        stopStick();
        if (aHeld) holdA(false, g.time);
        if (mode === WALK) walked += lastS;
        if (leader || mode === WALK) mode = IDLE;
        if (leader) ev = 'course';
        else if (fev === '') fev = 'course';
      }
      while (ev === '' && g.time < end - 1e-9) {
        ev = pre(g);
        if (ev !== '') {
          if (leader) break;
          // (a stall outranks a hold's or a walk's end; back to trailing after those, a stall waits for Node's placement)
          if (fev === '' || ev === 'stall') fev = ev;
          if (mode === IDLE && trailOn && ev !== 'stall') startTrail(g);
          ev = '';
        }
        // every chunk: the respawn's spawn protection turns damage back on by a real-time timer (2 real s), which
        // fires between evaluates
        if (noHurt && g.target) {
          g.target.damageMul = 0;
          for (let i = 0; i < remotes.length; i++) remotes[i].damageMul = 0;
        }
        loop.stepHeadless(o.chunk);
        post(g);
      }
      if (!leader) {
        ev = fev;
        fev = '';
      }
      const p = g.player.position;
      return { ev, t: g.time - t0, dt: g.time - start, walking: mode === WALK, x: p.x, y: p.y, z: p.z };
    },

    /** The run's start: the clock, the rise and noise logs, each guard's level now (a rise is counted from here). */
    begin() {
      const g = st();
      app.loop.manual = true;
      pad.connect();
      wrapNoise(g.enemyMgr);
      t0 = g.time;
      intr = false;
      rises.length = 0;
      nCount = 0;
      walked = 0;
      last.length = 0;
      const es = g.enemyMgr ? g.enemyMgr.enemies : [];
      for (let i = 0; i < es.length; i++) last[i] = es[i].alive ? es[i].level : 'unaware';
      lastCam = window.__ctdev ? window.__ctdev.alarm : 0;
      lastCamAlarms = window.__sector ? window.__sector.camAlarms : 0;
      pollT = g.time + o.poll;
      mode = IDLE;
      // (pair) the host keeps the client's remote for the rises; the follower starts trailing a fresh trail
      const rs = leader && g.net && g.net.remotes ? Array.from(g.net.remotes.values()) : [];
      remote = rs.length ? rs[0] : null;
      if (!leader) {
        trailOn = true;
        trail.reset();
        lw = 0;
        avatar = findAvatar(g);
        startTrail(g);
      }
      return t0;
    },

    /** The section from its checkpoint (the guards back on their patrols), the pad live, the stick at rest. (The client's
     *  `restartCheckpoint` is refused: the host's restart reaches it over the wire.) */
    restart() {
      const g = st();
      app.loop.manual = true;
      pad.connect();
      stopStick();
      const ok = typeof g.restartCheckpoint === 'function' ? g.restartCheckpoint() : false;
      t0 = g.time;
      intr = false;
      holdEnd = g.time + o.settle;
      mode = HOLD;
      trailOn = false;
      tap(BTN_UP);
      return ok;
    },

    /** (pair) Both pages stepped from Node from now on (no frame loop), the pad live. */
    pairStart() {
      app.loop.manual = true;
      pad.connect();
      tap(BTN_UP);
      return true;
    },

    /** (pair) In the match: the host's remotes carry state; the client has the host's avatar. */
    pairReady() {
      const g = st();
      if (!g || !g.net) return false;
      if (leader) return g.net.remotes.size > 0 && Array.from(g.net.remotes.values()).every((r) => !!r.state);
      return !!findAvatar(g);
    },

    /** (pair, follower) Trail the leader (`on`), or stand still; returns whether it was trailing. */
    follow(on) {
      const g = st();
      const was = trailOn;
      trailOn = !!on;
      if (trailOn) {
        trail.reset();
        avatar = findAvatar(g);
        startTrail(g);
      } else if (mode === TRAIL) {
        stopStick();
        watch.idle();
        mode = IDLE;
      }
      return was;
    },

    trailAt() {
      return [trail.tx, trail.ty, trail.tz];
    },

    /** (pair, host) Let each remote jump for `s` (a placement of the client, as e2e-ctcourse `moveClient`). */
    allowTeleport(s) {
      for (const r of st().net.remotes.values()) r.allowTeleport(s);
    },

    /** (pair, host) The host sees the client's feet within `m` of (x, z). */
    remoteNear(x, z, m) {
      const r = remote ?? st().net.remotes.values().next().value;
      return !!r && Math.sqrt((r.feet.x - x) ** 2 + (r.feet.z - z) ** 2) < m;
    },

    /** (pair, host) Sector Ops section setup: the live section's objective done through the run (as `advanceSector`),
     *  then the live section index and its connector's checkpoint [x, y, z, yaw] (Node puts both robots there). */
    sectorSkip() {
      const m = window.__sector;
      if (!m) return null;
      if (m.run.phase === 'objective') {
        if (m.run.current.objective.kind === 'download') {
          m.run.downloading = true;
          m.run.download(999);
        } else m.run.objectiveDone();
      }
      const cp = st().world.map.sectors[m.run.index]?.connector?.checkpoint;
      return { index: m.run.index, cp: cp ? [cp.x, cp.y, cp.z, cp.yaw] : null };
    },

    /** Sector Ops: the live section (its index and id; -1 / null in other modes). */
    section() {
      const m = window.__sector;
      if (!m) return { index: -1, id: null };
      const s = (st().world.map.sectors ?? [])[m.run.index];
      return { index: m.run.index, id: s ? s.id : null };
    },

    /** (after the settle) No damage: the robots never fight and cannot be hurt (from now on, re-set every chunk). */
    noDamage() {
      const g = st();
      noHurt = true;
      if (g.target) g.target.damageMul = 0;
      // (pair, host) the client too, as e2e-net-lib `startMode`
      remotes = leader && g.net && g.net.remotes ? Array.from(g.net.remotes.values()) : [];
      for (let i = 0; i < remotes.length; i++) remotes[i].damageMul = 0;
    },

    /** A15: every guard the mode spawned, alive and above y -5. */
    guards() {
      const em = st().enemyMgr;
      const es = em ? em.enemies : [];
      let alive = 0;
      for (const e of es) if (e.alive && e.pos.y > -5) alive++;
      return { spawned: es.length, alive };
    },

    /** Walk to (x, y, z): a nav path from the robot (a straight line when there is none). */
    walkStart(x, y, z) {
      const g = st();
      const p = g.player.position;
      const nav = g.nav;
      const pts = [{ x: p.x, y: p.y, z: p.z }];
      let navOk = false;
      goalOf(nav, x, y, z);
      const gx = goal[0];
      const gy = goal[1];
      const gz = goal[2];
      if (nav) {
        const wps = nav.findPath([p.x, p.z], [gx, gz], o.navExpand, p.y, gy);
        if (wps) {
          navOk = true;
          let py = p.y;
          for (const w of wps) {
            const h = nav.heightAt(w[0], w[1], py);
            if (h === h) py = h;
            pts.push({ x: w[0], y: py, z: w[1] });
          }
        }
      }
      const lp = pts[pts.length - 1];
      if (Math.sqrt((lp.x - gx) ** 2 + (lp.z - gz) ** 2) > 0.3 || pts.length === 1) pts.push({ x: gx, y: gy, z: gz });
      const path = P.makePath(pts);
      prog = new P.PathProgress(path);
      steer = new P.Steer(path);
      lastS = 0;
      lastMoveT = g.time;
      watch.walk(g.time - t0, 0);
      mode = WALK;
      return { nav: navOk, length: path.length, since: g.time - t0 };
    },

    /** The stuck clock's last progress time (the stall's start). */
    stallSince() {
      return watch.anchorT;
    },

    /** Stand still for `s` game seconds (a stub's hold, a wait): no stuck clock. */
    holdStart(s) {
      stopStick();
      watch.idle();
      holdEnd = st().time + s;
      mode = HOLD;
    },

    /** A door link at (x, z): 'none' (no door there), 'open', 'locked', or 'started' (A tapped; tick until 'opened'). */
    doorStart(x, z, limit) {
      const g = st();
      stopStick();
      const d = g.world.doors ? g.world.doors.nearest(x, z, o.doorReach) : null;
      if (!d) return 'none';
      if (d.open >= o.doorOpenAt) return 'open';
      if (d.anchor.locked) return 'locked';
      door = d;
      tap(BTN_A);
      doorTapT = g.time;
      watch.step(g.time - t0, limit);
      mode = DOOR;
      return 'started';
    },

    /** Sector Ops: the live section's objective point, its kind and its hold (s: the interactable's `holdTime`, e.g. a
     *  hack's 3 s; 0 for a tap), or null. */
    objectivePoint() {
      const m = window.__sector;
      const ob = m && m.run.current ? m.run.current.objective : null;
      if (!ob) return null;
      const it = objectiveItem(m);
      return { x: ob.x, y: ob.y ?? 0, z: ob.z, kind: ob.kind ?? null, hold: it && it.holdTime > 0 ? it.holdTime : 0 };
    },

    /** Use the objective until the mode says it is done: a tap of A (again every 3 s while it has not started), or for a
     *  hold objective (a hack) A held down until the phase changes (`holdStep`). With `tryS` > 0 a try: event 'nostart'
     *  when the use has not started within `tryS` game seconds (a download not running; a hold not filling its item). */
    objectiveStart(limit, tryS) {
      const g = st();
      const m = window.__sector;
      stopStick();
      if (!m || m.run.phase !== 'objective') return 'none';
      objIndex = m.run.index;
      objItem = objectiveItem(m);
      objHold = objItem && objItem.holdTime > 0 ? objItem.holdTime : 0;
      objStarted = false;
      if (objHold > 0) {
        // pressed on the first chunk after at least one released step (`holdStep`)
        holdA(false, g.time);
        objTapT = -1e9;
      } else tap(BTN_A);
      if (objHold === 0) objTapT = g.time;
      objTryEnd = tryS > 0 ? g.time + tryS : Infinity;
      watch.step(g.time - t0, limit);
      mode = OBJECTIVE;
      return 'started';
    },

    /** Teleport the robot to the nearest walkable cell at (x, y, z), facing `yaw` (default: as it is). */
    place(x, y, z, yaw) {
      const g = st();
      const c = g.player.controller;
      stopStick();
      let px = x;
      let py = y;
      let pz = z;
      const nav = g.nav;
      if (nav) {
        const k = nav.nearestWalkable(x, z, 12, y);
        if (k >= 0) {
          nav.centerInto(k, cell);
          px = cell[0];
          pz = cell[1];
          const h = nav.cellHeight(k);
          if (h === h) py = h;
        }
      }
      const V = g.player.position.constructor;
      // (follower) out of any team move first, as e2e-ctcourse `moveClient`
      if (!leader && g.team && typeof g.team.end === 'function') g.team.end(true);
      c.teleport(new V(px, py, pz), yaw ?? c.yaw ?? g.player.cam.yaw);
      placeN++;
      holdEnd = g.time + o.placeSettle;
      watch.idle();
      mode = HOLD;
      return { x: px, y: py, z: pz };
    },

    /** Why a robot stalled walking to (x, y, z): `locked` (a locked door at it), `no-nav-path` (no nav path from here),
     *  else `could-not-follow`. */
    probe(x, y, z) {
      const g = st();
      const p = g.player.position;
      const d = g.world.doors ? g.world.doors.nearest(p.x, p.z, o.lockedNear) : null;
      if (d && d.anchor.locked && d.open < 0.2) return 'locked';
      const nav = g.nav;
      if (!nav) return 'could-not-follow';
      goalOf(nav, x, y, z);
      return nav.findPath([p.x, p.z], [goal[0], goal[2]], o.navExpand, p.y, goal[1]) ? 'could-not-follow' : 'no-nav-path';
    },

    pos() {
      const p = st().player.position;
      return [p.x, p.y, p.z];
    },

    /** (SR3) The feet and the placements made so far: a jump with no placement counted is the game's (a restart). */
    posN() {
      const p = st().player.position;
      return [p.x, p.y, p.z, placeN];
    },

    /** (SR3, course.mjs `onPoll` when it queues an action) Event 'course' on the next `tick`. */
    interrupt() {
      intr = true;
      return true;
    },

    /** The rises logged since index `since`. */
    rises(since) {
      return rises.slice(since);
    },

    walked() {
      return walked;
    },

    time() {
      return now();
    },

    /** Sector Ops: advance to section `target` (0-based) by the connector cycle, as e2e-sectorops part 6 does: each
     *  earlier section's objective done through the run, the robot at the connector's checkpoint, the cycle stepped. */
    advanceSector(target) {
      const m = window.__sector;
      const g = st();
      if (!m) return -1;
      app.loop.manual = true;
      for (let guard = 0; guard < 16 && m.run.index < target; guard++) {
        const idx = m.run.index;
        if (m.run.phase === 'objective') {
          if (m.run.current.objective.kind === 'download') {
            m.run.downloading = true;
            m.run.download(999);
          } else m.run.objectiveDone();
        }
        app.loop.stepHeadless(0.2);
        const cp = g.world.map.sectors[idx]?.connector?.checkpoint;
        if (!cp) break;
        const V = g.player.position.constructor;
        g.player.controller.teleport(new V(cp.x, cp.y, cp.z), cp.yaw);
        for (let k = 0; k < 150 && m.run.index === idx; k++) app.loop.stepHeadless(0.1);
        app.loop.stepHeadless(1);
      }
      return m.run.index;
    },

    /** Sector Ops: the live section index, the sections' ids and their routes (`--routes code`). */
    sectors() {
      const m = window.__sector;
      const secs = st().world.map.sectors ?? [];
      return { index: m ? m.run.index : -1, list: secs.map((s) => ({ id: s.id, routes: (s.routes ?? []).map((r) => ({ name: r.name, pts: r.pts.map((q) => [q[0], q[1], q[2] ?? 0]), obj: r.obj, climbs: r.climbs ?? [] })) })) };
    },

    /** Course: the bay ids in `CourseDef.bays` order, and whether a co-op host session still waits in its lobby. */
    course() {
      const def = st()?.world?.layout?.course?.def;
      const s = window.__coop?.session;
      const dbg = window.__course && typeof window.__course.debug === 'function' ? window.__course.debug() : null;
      return { bays: def ? def.bays.map((b) => b.id) : [], hostLobby: !!(s && s.isHost && s.phase === 'lobby'), bay: dbg && typeof dbg.bay === 'number' ? dbg.bay + 1 : 0 };
    },
  };
}

/** The in-page script: R3's progress.mjs (its exports made local) and the driver, bound to `window.__rr`. */
export function pageScript(opts) {
  const src = fs.readFileSync(new URL('./progress.mjs', import.meta.url), 'utf8').replace(/^export (?=(?:async )?(?:const|let|function|class) )/gm, '');
  const names = ['PathProgress', 'StuckWatch', 'Steer', 'Trail', 'makePath', 'hyp3', 'riseClass', 'RISE_DETECTION', 'WATCH_STALL', 'WATCH_STEP_TIMEOUT'];
  return `(() => {\n${src}\nconst P = { ${names.join(', ')} };\nwindow.__rr = (${pageDriver.toString()})(P, ${JSON.stringify(opts)});\nreturn true;\n})()`;
}

/** The page options from the run's settings (pace from R3 `paceFor`; `role` 'leader' (host, the default) or 'follower'). */
export function pageOptions({ pace, forgive, role = 'leader' }) {
  return {
    chunk: CHUNK_S, poll: POLL_S, settle: SETTLE_S, placeSettle: PLACE_SETTLE_S, doorStop: DOOR_STOP_S, doorRetap: DOOR_RETAP_S,
    doorReach: DOOR_REACH_M, doorOpenAt: DOOR_OPEN_AT, lockedNear: LOCKED_NEAR_M, eye: EYE_M, noiseRing: NOISE_RING,
    noiseWindow: NOISE_WINDOW_S, navExpand: NAV_EXPAND, zoneY: ZONE_Y_M, stick: pace.stick, crouch: pace.crouched, forgive,
    role, trailM: TRAIL_M, jumpM: TRAIL_JUMP_M,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Node side
// ---------------------------------------------------------------------------------------------------------------

/** The graph space holding a point (the points table's boxes, the nearest floor within 1.5 m), or null. Pure. */
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

/** The page's robot, driven from Node. `page` is the host page (the client's for `role: 'follower'`, R4b's pair.mjs);
 *  `hooks.onChunk()` runs after every evaluate. */
export class PageDriver {
  constructor(page, { pace, forgive, points = null, role = 'leader' }) {
    this.page = page;
    this.opts = pageOptions({ pace, forgive, role });
    this.points = points;
    this.onChunk = async () => {};
  }

  /** (R4b: the steps context's clock advance) Let `s` game seconds pass, whatever the robot is doing. */
  async advance(s) {
    for (let left = s; left > 1e-9; ) {
      const r = await this.call('tick', Math.min(EVAL_S, left));
      left -= r.dt ?? Math.min(EVAL_S, left);
      await this.onChunk();
    }
  }

  async install() {
    await this.page.evaluate(pageScript(this.opts));
  }

  call(name, ...args) {
    return this.page.evaluate(([n, a]) => window.__rr[n](...a), [name, args]);
  }

  /** Tick until an event (or `capS` game seconds pass: event 'cap'). */
  async until(capS = RUN_CAP_S) {
    let left = capS;
    for (;;) {
      const r = await this.call('tick', Math.min(EVAL_S, left));
      await this.onChunk();
      if (r.ev !== '') return r;
      left -= EVAL_S;
      if (left <= 0) return { ...r, ev: 'cap' };
    }
  }

  async hold(s) {
    if (!(s > 0)) return;
    await this.call('holdStart', s);
    await this.until(s + 1);
  }

  async place(pt) {
    if (!pt) return null;
    const at = await this.call('place', pt[0], pt[1], pt[2], null);
    await this.until(1);
    return at;
  }

  async rises(since) {
    const raw = await this.call('rises', since);
    for (const r of raw) r.space = spaceAt(this.points, r.robots[0].x, r.robots[0].y, r.robots[0].z);
    return raw;
  }
}

const r2 = (v) => Math.round(v * 100) / 100;

/**
 * One run on one page, or on the pair (R4b: `ctx.pair`, scripts/route-run/pair.mjs; `ctx.driver` is then the pair, whose
 * calls go to the leader's page and whose waits step both pages). `run` is a planned run (R1, or the code / selftest
 * builders in route-run.mjs) with `steps` whose link steps carry `past` (the placement past the link). `ctx`: `{ host,
 * client, pads, driver, pair?, shots, players, notes }`. Returns the run's log (R2's run shape plus `walkedLinks`, `links`
 * (each link's outcome, for the selftest), `objectives` and, for the pair, `robots` and `splits`).
 */
export async function runOne(ctx, run) {
  const d = ctx.driver;
  const pair = ctx.pair ?? null;
  const log = {
    id: run.id, section: run.section ?? null, kind: run.kind ?? null, ...(run.name ? { name: run.name } : {}), covers: run.covers ?? [],
    time_s: null, walked_m: 0, walkedLinks: 0, guards: { spawned: 0, alive: 0 }, deadStops: [], detections: [], notices: [],
    stubs: [], drills: [], restarts: [], objectives: [], links: [],
    ...(pair ? { robots: ['leader', 'follower'], splits: [] } : {}),
  };
  if (run.unplannable) {
    log.unplannable = run.unplannable;
    return log;
  }
  // (the last run's course hook stops here: this run's own restart is not its restart)
  d.onChunk = async () => {};
  // a run starts from the section's checkpoint; only a fresh page's first run may start without one (the boot's start)
  const restarted = await d.call('restart');
  if (!restarted && ctx.pageUsed) {
    log.unplannable = 'section restart failed (the robot would start where the last run ended)';
    return log;
  }
  await d.until(SETTLE_S + 1);
  await d.call('noDamage');
  // the restart is of this run's section (a connector cycle already running moves it on to the next)
  const sec = await d.call('section');
  if (sec && sec.index >= 0 && run.section && String(sec.id).toLowerCase() !== String(run.section).toLowerCase()) {
    log.unplannable = `restart moved to section ${sec.id ?? sec.index + 1} (the run is ${run.section})`;
    return log;
  }
  log.guards = await d.call('guards');
  if (log.guards.alive < log.guards.spawned) {
    // A15: no run is scored against a missing guard field
    log.unplannable = `guards missing (${log.guards.alive} of ${log.guards.spawned} alive and on the map)`;
    return log;
  }
  await d.call('begin');
  ctx.pageUsed = true;
  d.onChunk = () => course.onPoll(ctx, log);
  let shot = 0;
  // one robot is the host; the pair's are the leader and the follower (its picture from the client page)
  const stop = async (cls, step, res, robot = pair ? 'leader' : 'host') => {
    const name = `${run.id}-${++shot}.png`.replace(/[^\w.-]/g, '_');
    let file = null;
    const page = robot === 'follower' ? ctx.client : ctx.host;
    if (ctx.shots && page) {
      try {
        fs.mkdirSync(ctx.shots, { recursive: true });
        await page.screenshot({ path: path.join(ctx.shots, name), timeout: 30000 });
        file = `shots/${name}`;
      } catch {
        file = null;
      }
    }
    log.deadStops.push({ t: r2(res.t), robot, at: [r2(res.x), r2(res.y), r2(res.z)], space: spaceAt(d.points, res.x, res.y, res.z) ?? step.space ?? null, link: step.link ?? step.index ?? null, class: cls, shot: file, since: r2(res.since ?? res.t), ...(typeof res.step_t === 'number' ? { step_t: r2(res.step_t), limit_s: res.limit_s } : {}), ...(typeof res.phase === 'string' ? { phase: res.phase } : {}) });
  };
  if (pair) pair.beginRun(log, stop);
  await runSteps(ctx, log, pair ? run.steps ?? [] : flatSteps(run.steps, ctx.notes), stop);
  log.time_s = r2(await d.call('time'));
  log.walked_m = r2(await d.call('walked'));
  const { lines } = await readCauses(ctx, 0);
  // (pair) each line names the robot the guard rose on (pair.mjs `attributeRobot`)
  if (pair) await pair.nameRobots(lines);
  for (const l of lines) {
    const { kind, ...line } = l;
    (kind === 'detection' ? log.detections : log.notices).push(line);
  }
  // (SR4) the course hook's end of run: its restarts linked to these detection lines
  await course.onRunEnd?.(ctx, log);
  return log;
}

/** The steps of a run or of one split leg (`ctx.robot` names the robot of a leg; its `driver` drives that robot only).
 *  Returns 'exit' (the leader is in the section's open connector / extraction), 'cap', 'course' (a leg ended by a course
 *  interrupt) or ''. */
async function runSteps(ctx, log, steps, stop) {
  const d = ctx.driver;
  const skip = new Set();
  // (SR3) a wait ended by a course interrupt (a restart or retry): course.mjs's queued action, the robots placed (both,
  // `d.place`), the index to go on from (none queued: the same step again)
  const onCourse = async (i) => {
    skip.clear();
    const r = await course.onRestart(ctx, log, steps, i);
    if (!r) return i;
    if (r.place?.leader) await d.place(r.place.leader);
    if (r.place?.follower && ctx.pair) await ctx.pair.placeFollower(r.place.follower);
    return r.resume ?? i;
  };
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (skip.has(i)) continue;
    if (ctx.pair) ctx.pair.step = step;
    if ((await d.call('time')) > RUN_CAP_S) {
      const p = await d.call('tick', 0);
      await stop('step-timeout', step, p, ctx.robot);
      return 'cap';
    }
    if (step.type === 'walk') {
      const to = step.to;
      if (!to) continue;
      await d.call('walkStart', to[0], to[1], to[2]);
      const res = await d.until();
      if (res.ev === 'arrived') continue;
      if (res.ev === 'course') {
        if (ctx.robot) return 'course';
        i = (await onCourse(i)) - 1;
        continue;
      }
      if (res.ev === 'connector' || res.ev === 'extract') {
        // in the section's open connector / extraction: the walk is done there (not a stop), before its hold fires
        log.exit = res.ev;
        return 'exit';
      }
      // a dead stop (A4): its class from a nav probe, then the recovery past the link (logged; the run goes on)
      res.since = await d.call('stallSince');
      const cls = res.ev === 'stall' ? await d.call('probe', to[0], to[1], to[2]) : 'step-timeout';
      const next = steps[i + 1];
      // (J13) stalled at the locked door of the next step's door link: that step takes it (`doorStart` 'locked', then
      // `course.onLockedDoor` at a course lock; else its own `locked` stop, the same link, past it)
      if (cls === 'locked' && next?.type === 'link' && next.index === step.link && next.action === 'door') continue;
      await stop(cls, step, res, ctx.robot);
      if (step.link !== null && step.link !== undefined && next?.type === 'link' && next.index === step.link) {
        log.links.push({ index: next.index, kind: next.kind, outcome: cls, ...(ctx.robot ? { robot: ctx.robot } : {}) });
        skip.add(i + 1);
        await d.place(next.past ?? next.at);
      } else await d.place(to);
      continue;
    }
    if (step.type === 'link') {
      const outcome = await linkStep(ctx, log, step, stop);
      if (outcome === 'course') {
        if (ctx.robot) return 'course';
        i = (await onCourse(i)) - 1;
        continue;
      }
      log.links.push({ index: step.index, kind: step.kind, outcome, ...(ctx.robot ? { robot: ctx.robot } : {}) });
      if (outcome === 'walked') log.walkedLinks++;
      continue;
    }
    if (step.type === 'objective') {
      if ((await objectiveStep(ctx, log, step, stop)) === 'course') {
        if (ctx.robot) return 'course';
        i = (await onCourse(i)) - 1;
      }
      continue;
    }
    if (step.type === 'split' && ctx.pair && !ctx.robot) {
      // leader leg a, follower leg b at once; both wait at the rejoin (pair.mjs). (SR3) A course interrupt ends both legs
      // (the leader's ended: the follower's interrupted too), then the split step's queued action.
      let hit = false;
      const leg = async (c, legSteps) => {
        const out = await runSteps(c, log, legSteps, stop);
        if (out === 'course') {
          if (!hit && c.robot === 'leader') await ctx.pair.fcall('interrupt');
          hit = true;
        }
        return out;
      };
      if ((await ctx.pair.split(ctx, log, step, leg)) === 'exit') return 'exit';
      if (hit) i = (await onCourse(i)) - 1;
    }
  }
  return '';
}

/** Top-level steps with each split's leader leg (leg a) inline; at one player leg b is not walked (noted). */
function flatSteps(steps, notes) {
  const out = [];
  for (const s of steps ?? []) {
    if (s.type !== 'split') {
      out.push(s);
      continue;
    }
    out.push(...flatSteps(s.a, notes));
    const msg = `split ${s.id}: leg b is not walked at one player (the robot pair walks it: --players 2)`;
    if (notes && !notes.includes(msg)) notes.push(msg);
  }
  return out;
}

async function linkStep(ctx, log, step, stop) {
  const d = ctx.driver;
  if (step.action === 'walk') return 'walked';
  if (step.action === 'door') {
    const at = step.at;
    if (!at) return 'walked';
    const limit = step.limit_s ?? stepLimit('door');
    const how = await d.call('doorStart', at[0], at[2], limit);
    if (how === 'none' || how === 'open') return 'walked';
    if (how === 'locked') {
      if (await course.onLockedDoor(ctx, log, step)) return 'walked';
      const p = await d.call('tick', 0);
      await stop('locked', step, p, ctx.robot);
      await d.place(step.past ?? at);
      return 'locked';
    }
    const res = await d.until(limit + 2);
    if (res.ev === 'opened') return 'walked';
    if (res.ev === 'course') return 'course';
    await stop('step-timeout', step, res, ctx.robot);
    await d.place(step.past ?? at);
    return 'step-timeout';
  }
  const step_ = stepFor(step);
  // (pair, both robots) the follower to its near-side spot beside the leader first; both placed past it (pair.mjs)
  const both = !!ctx.pair && !ctx.robot;
  const r = both ? await ctx.pair.linkStep(ctx, step, step_) : await step_(ctx, step);
  if (r.stub) log.stubs.push(r.stub);
  if (r.outcome !== 'walked' && r.outcome !== 'stub') {
    // the robot the step names (a follower's own stop: its page's position), the step's own time and limit; then both
    // robots past the link (a follower's stop: the follower alone, the leader took the step)
    const who = r.robot === 'follower' ? 'follower' : ctx.robot;
    const p = both ? await ctx.pair.stopPos(who) : await d.call('tick', 0);
    await stop(r.outcome, step, { ...p, step_t: r.t, limit_s: r.limit_s ?? null, phase: r.phase ?? null }, who);
    if (both) await ctx.pair.recoverPast(step, who);
    else await d.place(step.past ?? step.at);
  }
  return r.outcome;
}

async function objectiveStep(ctx, log, step, stop) {
  const d = ctx.driver;
  const pt = await d.call('objectivePoint');
  if (!pt) {
    // no objective hook for this mode yet: the robot reached the space, the hold is not played
    log.objectives.push({ space: step.space, hold_s: 0, done: false, why: 'no objective hook for this mode (R4a: Sector Ops only)' });
    return;
  }
  // the limit is the objective's own hold + A4's extra: a hold objective's `holdTime` (a hack's 3 s), a download the
  // fallback hold (the page does not give its length), a tap none (R4a passed the hold as a length: a flat 5 s)
  const hold = pt.hold > 0 ? pt.hold : pt.kind === 'download' ? OBJECTIVE_HOLD_S : 0;
  const limit = stepLimit('objective', null, hold);
  // first from where the robot stands (a code route: its stand point pts[obj], e.g. S1's rear window); the walk to the
  // objective's own point only when the use does not start there
  let t0 = await d.call('time');
  let how = await d.call('objectiveStart', limit, OBJECTIVE_TRY_S);
  let res = how === 'started' ? await d.until(limit + 2) : null;
  let from = 'stand';
  if (res?.ev === 'nostart') {
    from = 'point';
    await d.call('walkStart', pt.x, pt.y, pt.z);
    const w = await d.until();
    if (w.ev === 'course') return 'course';
    if (w.ev !== 'arrived' && w.ev !== 'stall') return;
    t0 = await d.call('time');
    how = await d.call('objectiveStart', limit, 0);
    res = how === 'started' ? await d.until(limit + 2) : null;
  }
  if (res?.ev === 'course') return 'course';
  if (how !== 'started' || !res) {
    log.objectives.push({ space: step.space, hold_s: 0, done: true, why: 'already done' });
    return;
  }
  const held = r2((await d.call('time')) - t0);
  log.objectives.push({ space: step.space, kind: pt.kind, hold_s: held, done: res.ev === 'done', from });
  if (res.ev !== 'done') await stop('step-timeout', { ...step, link: null }, res);
}
