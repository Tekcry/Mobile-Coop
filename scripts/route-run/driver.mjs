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
// A at the section's objective until it is done), and logs the run (the R2 log shape, scripts/route-run/report.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { stepLimit } from './progress.mjs';
import { readCauses } from './causes.mjs';
import { stepFor } from './steps.mjs';
import * as course from './course.mjs';

/** Game seconds per driver chunk (one stick update and stuck check each; the PLAN's 0.05 s). */
export const CHUNK_S = 0.05;
/** Guard levels and camera alarms are polled this often (game s; the PLAN's 0.1 s). */
export const POLL_S = 0.1;
/** Game seconds one `page.evaluate` runs before handing back to Node (the page stays responsive). */
export const EVAL_S = 2;
/** After a restart: the respawn (0.3 s) and the spawn protection (2 s, then `damageMul` 1) run out first. */
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
/** The objective's hold limit (s) when the mode gives none: `stepLimit('objective', OBJECTIVE_HOLD_S)`. */
export const OBJECTIVE_HOLD_S = 30;
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
  // D-pad up: free in play (no action outside a held context menu), so a tap wakes the pad without doing anything
  const BTN_UP = 12;
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
  let tapBtn = -1;
  let tapLeft = 0;
  let pollT = 0;
  let lastCam = 0;
  let lastCamAlarms = 0;
  let walked = 0;
  let door = null;
  let objIndex = -1;
  let wrapped = null;

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
      robots: [{ x: p.x, y: p.y, z: p.z, crouched: !!c.crouched, speed: c.speed ?? 0, light: g.lightLevel ?? null }],
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
    if (!m) return '';
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
      // (the toggle's intent, not the stance: a low ceiling may hold a stand back, and a tap would only flip it again)
      const c = g.player.controller;
      if ((c.crouchIntent ?? c.crouched) !== o.crouch && t - crouchTapT > 1) {
        tap(BTN_B);
        crouchTapT = t;
      }
      // a shut door in the way: the robot is stopped at it, so open it with A (BRIEF: A near a shut door on the path)
      if (t - lastMoveT > o.doorStop && t - doorTapT > o.doorRetap) {
        const d = g.world.doors ? g.world.doors.nearest(p.x, p.z, o.doorReach) : null;
        if (d && d.open < 0.2 && !d.anchor.locked) {
          tap(BTN_A);
          doorTapT = t;
        }
      }
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
        mode = IDLE;
        return 'done';
      }
      if (watch.update(t - t0, 0) === P.WATCH_STEP_TIMEOUT) {
        mode = IDLE;
        return 'timeout';
      }
      if (!m.run.downloading && t - objTapT > 3) {
        tap(BTN_A);
        objTapT = t;
      }
      return '';
    }
    return '';
  }

  /** After a chunk: the tap's release, the guard poll. */
  function post(g) {
    if (tapLeft > 0 && --tapLeft === 0) pad.set(tapBtn, 0);
    if (g.time >= pollT - 1e-9) {
      pollT = g.time + o.poll;
      poll(g);
    }
  }

  return {
    /** Run up to `maxS` game seconds, or until an event: `{ ev, t, x, y, z }` ('' when the time ran out first). */
    tick(maxS) {
      const g = st();
      const loop = app.loop;
      const end = g.time + maxS;
      let ev = '';
      while (g.time < end - 1e-9) {
        ev = pre(g);
        if (ev !== '') break;
        loop.stepHeadless(o.chunk);
        post(g);
      }
      const p = g.player.position;
      return { ev, t: g.time - t0, x: p.x, y: p.y, z: p.z };
    },

    /** The run's start: the clock, the rise and noise logs, each guard's level now (a rise is counted from here). */
    begin() {
      const g = st();
      app.loop.manual = true;
      pad.connect();
      wrapNoise(g.enemyMgr);
      t0 = g.time;
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
      return t0;
    },

    /** The section from its checkpoint (the guards back on their patrols), the pad live, the stick at rest. */
    restart() {
      const g = st();
      app.loop.manual = true;
      pad.connect();
      stopStick();
      const ok = typeof g.restartCheckpoint === 'function' ? g.restartCheckpoint() : false;
      t0 = g.time;
      holdEnd = g.time + o.settle;
      mode = HOLD;
      tap(BTN_UP);
      return ok;
    },

    /** Sector Ops: the live section (its index and id; -1 / null in other modes). */
    section() {
      const m = window.__sector;
      if (!m) return { index: -1, id: null };
      const s = (st().world.map.sectors ?? [])[m.run.index];
      return { index: m.run.index, id: s ? s.id : null };
    },

    /** (after the settle) No damage: the robots never fight and cannot be hurt. */
    noDamage() {
      st().target.damageMul = 0;
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

    /** Sector Ops: the live section's objective point, or null. */
    objectivePoint() {
      const m = window.__sector;
      const ob = m && m.run.current ? m.run.current.objective : null;
      return ob ? { x: ob.x, y: ob.y ?? 0, z: ob.z, kind: ob.kind ?? null } : null;
    },

    /** Use the objective (A, again every 3 s while it has not started) until the mode says it is done. */
    objectiveStart(limit) {
      const g = st();
      const m = window.__sector;
      stopStick();
      if (!m || m.run.phase !== 'objective') return 'none';
      objIndex = m.run.index;
      tap(BTN_A);
      objTapT = g.time;
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
      c.teleport(new V(px, py, pz), yaw ?? c.yaw ?? g.player.cam.yaw);
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
      return { bays: def ? def.bays.map((b) => b.id) : [], hostLobby: !!(s && s.isHost && s.phase === 'lobby') };
    },
  };
}

/** The in-page script: R3's progress.mjs (its exports made local) and the driver, bound to `window.__rr`. */
export function pageScript(opts) {
  const src = fs.readFileSync(new URL('./progress.mjs', import.meta.url), 'utf8').replace(/^export (?=(?:async )?(?:const|let|function|class) )/gm, '');
  const names = ['PathProgress', 'StuckWatch', 'Steer', 'makePath', 'riseClass', 'RISE_DETECTION', 'WATCH_STALL', 'WATCH_STEP_TIMEOUT'];
  return `(() => {\n${src}\nconst P = { ${names.join(', ')} };\nwindow.__rr = (${pageDriver.toString()})(P, ${JSON.stringify(opts)});\nreturn true;\n})()`;
}

/** The page options from the run's settings (pace from R3 `paceFor`). */
export function pageOptions({ pace, forgive }) {
  return {
    chunk: CHUNK_S, poll: POLL_S, settle: SETTLE_S, placeSettle: PLACE_SETTLE_S, doorStop: DOOR_STOP_S, doorRetap: DOOR_RETAP_S,
    doorReach: DOOR_REACH_M, doorOpenAt: DOOR_OPEN_AT, lockedNear: LOCKED_NEAR_M, eye: EYE_M, noiseRing: NOISE_RING,
    noiseWindow: NOISE_WINDOW_S, navExpand: NAV_EXPAND, zoneY: ZONE_Y_M, stick: pace.stick, crouch: pace.crouched, forgive,
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

/** The page's robot, driven from Node. `page` is the host page; `hooks.onChunk()` runs after every evaluate. */
export class PageDriver {
  constructor(page, { pace, forgive, points = null }) {
    this.page = page;
    this.opts = pageOptions({ pace, forgive });
    this.points = points;
    this.onChunk = async () => {};
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
 * One run on one page. `run` is a planned run (R1, or the code / selftest builders in route-run.mjs) with `steps` whose
 * link steps carry `past` (the placement past the link). `ctx`: `{ host, client, pads, driver, shots, players, notes }`.
 * Returns the run's log (R2's run shape plus `walkedLinks`, `links` (each link's outcome, for the selftest) and
 * `objectives`).
 */
export async function runOne(ctx, run) {
  const d = ctx.driver;
  const log = {
    id: run.id, section: run.section ?? null, kind: run.kind ?? null, ...(run.name ? { name: run.name } : {}), covers: run.covers ?? [],
    time_s: null, walked_m: 0, walkedLinks: 0, guards: { spawned: 0, alive: 0 }, deadStops: [], detections: [], notices: [],
    stubs: [], drills: [], restarts: [], objectives: [], links: [],
  };
  if (run.unplannable) {
    log.unplannable = run.unplannable;
    return log;
  }
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
  const steps = flatSteps(run.steps, ctx.notes);
  const skip = new Set();
  let shot = 0;
  const stop = async (cls, step, res) => {
    const name = `${run.id}-${++shot}.png`.replace(/[^\w.-]/g, '_');
    let file = null;
    if (ctx.shots) {
      try {
        fs.mkdirSync(ctx.shots, { recursive: true });
        await ctx.host.screenshot({ path: path.join(ctx.shots, name), timeout: 30000 });
        file = `shots/${name}`;
      } catch {
        file = null;
      }
    }
    log.deadStops.push({ t: r2(res.t), robot: 'host', at: [r2(res.x), r2(res.y), r2(res.z)], space: spaceAt(d.points, res.x, res.y, res.z) ?? step.space ?? null, link: step.link ?? step.index ?? null, class: cls, shot: file, since: r2(res.since ?? res.t) });
  };
  let capped = false;
  for (let i = 0; i < steps.length && !capped; i++) {
    const step = steps[i];
    if (skip.has(i)) continue;
    if ((await d.call('time')) > RUN_CAP_S) {
      capped = true;
      const p = await d.call('tick', 0);
      await stop('step-timeout', step, p);
      break;
    }
    if (step.type === 'walk') {
      const to = step.to;
      if (!to) continue;
      await d.call('walkStart', to[0], to[1], to[2]);
      const res = await d.until();
      if (res.ev === 'arrived') continue;
      if (res.ev === 'connector' || res.ev === 'extract') {
        // in the section's open connector / extraction: the walk is done there (not a stop), before its hold fires
        log.exit = res.ev;
        break;
      }
      // a dead stop (A4): its class from a nav probe, then the recovery past the link (logged; the run goes on)
      res.since = await d.call('stallSince');
      const cls = res.ev === 'stall' ? await d.call('probe', to[0], to[1], to[2]) : 'step-timeout';
      await stop(cls, step, res);
      const next = steps[i + 1];
      if (step.link !== null && step.link !== undefined && next?.type === 'link' && next.index === step.link) {
        log.links.push({ index: next.index, kind: next.kind, outcome: cls });
        skip.add(i + 1);
        await d.place(next.past ?? next.at);
      } else await d.place(to);
      continue;
    }
    if (step.type === 'link') {
      const outcome = await linkStep(ctx, log, step, stop);
      log.links.push({ index: step.index, kind: step.kind, outcome });
      if (outcome === 'walked') log.walkedLinks++;
      continue;
    }
    if (step.type === 'objective') {
      await objectiveStep(ctx, log, step, stop);
    }
  }
  log.time_s = r2(await d.call('time'));
  log.walked_m = r2(await d.call('walked'));
  const { lines } = await readCauses(ctx, 0);
  for (const l of lines) {
    const { kind, ...line } = l;
    (kind === 'detection' ? log.detections : log.notices).push(line);
  }
  return log;
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
    const msg = `split ${s.id}: leg b is not walked at one player (the robot pair is R4b)`;
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
      await stop('locked', step, p);
      await d.place(step.past ?? at);
      return 'locked';
    }
    const res = await d.until(limit + 2);
    if (res.ev === 'opened') return 'walked';
    await stop('step-timeout', step, res);
    await d.place(step.past ?? at);
    return 'step-timeout';
  }
  const step_ = stepFor(step);
  const r = await step_(ctx, step);
  if (r.stub) log.stubs.push(r.stub);
  if (r.outcome !== 'walked' && r.outcome !== 'stub') {
    const p = await d.call('tick', 0);
    await stop(r.outcome, step, p);
    await d.place(step.past ?? step.at);
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
  await d.call('walkStart', pt.x, pt.y, pt.z);
  const w = await d.until();
  if (w.ev !== 'arrived' && w.ev !== 'stall') return;
  const t0 = await d.call('time');
  const limit = stepLimit('objective', OBJECTIVE_HOLD_S);
  const how = await d.call('objectiveStart', limit);
  if (how !== 'started') {
    log.objectives.push({ space: step.space, hold_s: 0, done: true, why: 'already done' });
    return;
  }
  const res = await d.until(limit + 2);
  const held = r2((await d.call('time')) - t0);
  log.objectives.push({ space: step.space, kind: pt.kind, hold_s: held, done: res.ev === 'done' });
  if (res.ev !== 'done') await stop('step-timeout', { ...step, link: null }, res);
}
