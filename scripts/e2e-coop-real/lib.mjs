// e2e-coop-real harness (coop-real H1): the input-only two-page co-op suite's shared helpers. BRIEF "The input line":
// the suite DRIVES only through the devices (`__pad`, `page.keyboard` / `page.mouse`), the boot URL and page life
// (CDP lifecycle, reload, close, a new page), and steps a page with `stepHeadless` only where that page stands for a
// visible window whose rAF stalled (the host pump). It READS anything, and its taps are pass-through wrappers that count
// calls (`events.emit`, `weaponAudio.shot` / `remoteShot`, `input.poll`) without changing what they do. No teleports,
// `onUse`, `takedown.start`, `applyDamage`, `input.state.set`, `weapons.switchTo`, camera writes or session writes here.
//
// Who drives (BRIEF A3): the host is on keyboard + mouse ('kbm'), the client on the pad ('pad'); every input helper takes
// `who` so a case can swap them.
import * as E from '../e2e-lib.mjs';
import { until, waitSim, waitHostSim, setSimPages, NET_VIEWPORT, LOAD_MS } from '../e2e-net-lib.mjs';

export { until, waitSim, waitHostSim, LOAD_MS };
export const BTN = E.BTN;
/** The boot query (BRIEF A2): the first tab hosts Marlow Yard in Course mode, the second joins over ?net=local. */
export const Q = 'net=local&autostart=ctcourse&mode=course';
/** Prompt watchdog window (BRIEF A8): sim seconds for a row to move a hash or log an event. */
export const PROMPT_S = 3;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * (PLAN-CHECK 11) The one way a part file reads a page: `fn(arg)` runs in the page and must only read (K1 greps the part
 * files for `.evaluate(`; every write goes through a lib `drive*` / device helper). Returns `fn`'s value.
 */
export const read = (P, fn, arg) => P.evaluate(fn, arg);

// ------------------------------------------------------------------------------------------- results and KNOWN BUG

/** The run's verdict: `fail(msg)` marks it failed and logs; the entry exits 1 on `failed`. */
export const run = { failed: false, known: [], unexpected: [] };
export function fail(msg) {
  run.failed = true;
  console.error(`  FAIL - ${msg}`);
}

/** A gate whatever E2E_NETSIM / E2E_NETSIM_GATE say (e2e-lib's `assert` only reports under netsim without the gate):
 *  throws on false, so `knownBug` and the part's try / catch see every failure. */
export function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT: ' + msg);
  console.log('  ok -', msg);
}

// ------------------------------------------------------------------------------------------------------- boot

/**
 * Start a host pump on page P: while P's rAF is idle (a background page whose frames stalled), step its sim with
 * `stepHeadless` by the wall time since the last pump (as e2e-ctcourse.mjs:52-76). P stands for Michael's visible host
 * window. `pause()` / `resume()` stop it for a lifecycle case, `stop()` ends it. A page that is closed or navigating
 * is skipped silently.
 */
export function startPump(P) {
  let on = true;
  let busy = false;
  const iv = setInterval(async () => {
    if (!on || busy || P.isClosed()) return;
    busy = true;
    try {
      await P.evaluate(() => {
        if (window.__raf === undefined) {
          window.__raf = 0;
          const f = () => {
            window.__raf++;
            requestAnimationFrame(f);
          };
          requestAnimationFrame(f);
        }
        const now = performance.now();
        const last = window.__pumpT ?? now;
        const idle = window.__pumpRaf === window.__raf;
        window.__pumpT = now;
        window.__pumpRaf = window.__raf;
        if (idle && window.__app?.current) window.__app.loop.stepHeadless(Math.min(0.1, Math.max(1 / 60, (now - last) / 1000)));
      });
    } catch {
      /* closed / navigating */
    }
    busy = false;
  }, 40);
  return {
    pause: () => (on = false),
    resume: () => (on = true),
    stop: () => clearInterval(iv),
  };
}

/** Page P is in the ctcourse match (any role). */
export const inMatch = (P, tag, timeout = LOAD_MS) =>
  until(P, () => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && window.__app.current.opts.map?.id === 'ctcourse', null, timeout, `${tag} in the ctcourse match`);

/**
 * Boot the pair by URL (BRIEF A2): page A hosts, page B joins, both in the Marlow Yard match, the host pumped, the
 * client's pad connected. `netdrop` (s, A6): the local transport's drop limit. `hideAutomation` (A7): navigator.webdriver
 * false, so the hidden-page bgTick worker runs. `realBackground` (PLAN-CHECK 6): none of e2e-lib's BACKGROUND_FLAGS, so a
 * hidden page throttles as in Michael's Chrome. Returns the harness `h`: { browser, ctx, A, B, eA, eB, url, q, pump,
 * close() }; `h.B` / `h.eB` change on `reopenClient`.
 */
export async function bootPair(url, { netdrop = 0, hideAutomation = true, realBackground = false, args = [], viewport = NET_VIEWPORT } = {}) {
  const q = netdrop ? `${Q}&netdrop=${netdrop}` : Q;
  // (triage 2026-10-25) `autostart` rides in the URL, not in `params`: e2e-lib's launch / openPage wait up to 120 s for a
  // match whenever `params` names autostart, and the host's local course starts only once the client joins, so the host
  // launch sat out the whole 120 s (laptop runs: pair boot 146-151 s). bootPair waits for the match itself (inMatch).
  const auto = q.split('&').filter((p) => p.startsWith('autostart='));
  const rest = q.split('&').filter((p) => !p.startsWith('autostart=')).join('&');
  const bootUrl = url + (url.includes('?') ? '&' : '?') + auto.join('&');
  const { browser, ctx, page: A, errors: eA } = await E.launch({ url: bootUrl, params: rest, viewport, hideAutomation, realBackground, args });
  await until(A, () => window.__coop?.session?.isHost === true, null, 30000, 'first tab hosts');
  const { page: B, errors: eB } = await E.openPage(ctx, bootUrl, rest);
  const h = { browser, ctx, A, B, eA, eB, url, q, pump: null };
  setSimPages([A, B]);
  await inMatch(A, 'host');
  await inMatch(B, 'client');
  h.pump = startPump(A);
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state) && !!window.__course?.state, null, 20000, 'host course running');
  await until(B, () => !!window.__course?.wire, null, 30000, 'client has the course state');
  await until(B, () => window.__app.current.net.avatars.size === 1, null, 10000, 'client has the host avatar');
  await padReady(B);
  h.close = async () => {
    h.pump?.stop();
    await browser.close().catch(() => {});
  };
  return h;
}

/** The pad is connected and at rest (the client's device, A3). */
export const padReady = (P) =>
  P.evaluate(() => {
    window.__pad.connect();
    for (let i = 0; i < 4; i++) window.__pad.axis(i, 0);
    for (let i = 0; i < 17; i++) window.__pad.set(i, 0);
  });

/** Console errors of both pages that are the game's (the e2e-ctcourse filter). */
export const gameErrors = (h) => [...h.eA, ...(h.eOld ?? []), ...h.eB].filter((e) => !/WebGL|GPU stall|swiftshader|Trystero|Nostr|ERR_|favicon/i.test(e));

// ------------------------------------------------------------------------------------------------- reads

/** The page's own player: feet, camera yaw / pitch, speed, sim time, alive. */
export const me = (P) =>
  P.evaluate(() => {
    const g = window.__app.current;
    const p = g.player.position;
    return { x: p.x, y: p.y, z: p.z, yaw: g.player.cam.yaw, pitch: g.player.cam.pitch, speed: g.player.controller.speed ?? 0, t: g.time, alive: g.player.alive };
  });

/** A map debug point by id ('A1-mid', 'L1', ...) on page P: [x, y, z, yaw], or null. */
export const point = (P, id) => P.evaluate((id) => { const p = window.__app.current.world.layout.debugPoints?.find((d) => d.id === id); return p ? [p.pos.x, p.pos.y, p.pos.z, p.yaw] : null; }, id);

/** Every debug point id on page P (to pick route stops). */
export const pointIds = (P) => P.evaluate(() => (window.__app.current.world.layout.debugPoints ?? []).map((d) => d.id));

/** The context menu on page P: { state, sel, count, version, rows: [{ kind, opt, label, hold }] }, plus the team prompt. */
export const ctxRows = (P) =>
  P.evaluate(() => {
    const g = window.__app.current;
    const m = g.ctxMenu;
    const rows = [];
    for (let i = 0; i < m.count; i++) {
      const o = m.opts[i];
      rows.push({ kind: o.kind, opt: o.opt, ref: o.ref, label: o.label, hold: o.hold });
    }
    return { state: m.state, sel: m.sel, count: m.count, version: m.version, rows, team: g.team?.prompt ?? null };
  });

// ------------------------------------------------------------------------------------------------- devices

const PAD_OF = { interact: BTN.A, crouch: BTN.B, jump: BTN.Y, holster: BTN.X, coop: BTN.RB, wheel: BTN.LB, pause: BTN.START, up: BTN.UP, down: BTN.DOWN, left: BTN.LEFT, right: BTN.RIGHT };
const KEY_OF = { interact: 'KeyE', crouch: 'KeyC', jump: 'Space', coop: 'KeyF', pause: 'KeyP', reload: 'KeyR', swap: 'KeyT', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', confirm: 'Enter', back: 'Escape' };

/** Mouse buttons the suite holds down per page ('left' / 'right'): `mouseAim` must know (see there). */
const mouseHeld = new WeakMap();
const heldOf = (P) => {
  let s = mouseHeld.get(P);
  if (!s) mouseHeld.set(P, (s = new Set()));
  return s;
};
async function mouseButton(P, button, on) {
  if (on) {
    await P.mouse.down({ button });
    heldOf(P).add(button);
  } else {
    await P.mouse.up({ button });
    heldOf(P).delete(button);
  }
}

/** Hold (true) or release (false) a named action on `who`'s device: pad buttons / triggers, or keys and mouse buttons. */
export async function hold(P, who, action, on) {
  if (who === 'pad') {
    if (action === 'fire') return P.evaluate((v) => window.__pad.set(7, v), on ? 1 : 0);
    if (action === 'ads') return P.evaluate((v) => window.__pad.set(6, v), on ? 1 : 0);
    const b = PAD_OF[action === 'confirm' ? 'interact' : action === 'back' ? 'crouch' : action];
    if (b === undefined) throw new Error(`no pad button for ${action}`);
    return P.evaluate(([b, v]) => window.__pad.set(b, v), [b, on ? 1 : 0]);
  }
  if (action === 'fire') return mouseButton(P, 'left', on);
  if (action === 'ads') return mouseButton(P, 'right', on);
  const k = KEY_OF[action];
  if (!k) throw new Error(`no key for ${action}`);
  return on ? P.keyboard.down(k) : P.keyboard.up(k);
}

/**
 * Hold `action` until `cond` (in-page source, `arg`) holds, then let go: a press the page has surely polled (a short press
 * can fall between polls on a slow page). Throws "<what>" on a timeout (sim ms), the button released first.
 */
export async function holdUntil(P, who, action, cond, arg, what, timeout = 8000) {
  await hold(P, who, action, true);
  try {
    await until(P, cond, arg, timeout, what);
  } finally {
    await hold(P, who, action, false);
  }
}

/** A tap: down for exactly one input poll (pad, e2e-lib `press`), or a key press (keyboard taps are latched by the game). */
export async function tap(P, who, action) {
  if (who === 'pad') {
    const b = PAD_OF[action === 'confirm' ? 'interact' : action === 'back' ? 'crouch' : action];
    if (b === undefined) throw new Error(`no pad button for ${action}`);
    return E.press(P, b);
  }
  const k = KEY_OF[action];
  if (!k) throw new Error(`no key for ${action}`);
  await P.keyboard.press(k);
  await E.frames(P, 2).catch(() => {});
}

// --- the poll driver: a pass-through wrapper on `__app.input.poll` that runs page-side controllers right before each
// poll reads the devices. A controller writes only the fake pad (`__pad`) and reads the game; it returns undefined to go
// on or a result to finish (the sticks it used are zeroed). It runs on every poll however the loop is driven (rAF or the
// host pump's `stepHeadless`), so a closed loop never misses a step.
const installDriver = () => {
  const inp = window.__app?.input;
  if (!inp) return false;
  const D = (window.__drv ??= { n: 0, ctl: [], res: {} });
  if (!inp.poll.__drv) {
    const orig = inp.poll;
    const wrap = function (...a) {
      const g = window.__app.current;
      for (const c of D.ctl.slice()) {
        let r;
        try {
          r = c.fn(g, c.arg, c.st, window.__pad);
        } catch (e) {
          r = { __error: String(e?.stack ?? e) };
        }
        if (r === undefined) continue;
        for (const ax of c.st.axes ?? []) window.__pad.axis(ax, 0);
        D.res[c.key] = JSON.parse(JSON.stringify(r));
        D.ctl.splice(D.ctl.indexOf(c), 1);
      }
      return orig.apply(this, a);
    };
    wrap.__drv = true;
    inp.poll = wrap;
  }
  return true;
};
const addCtl = (fn, arg) => {
  const D = window.__drv;
  const key = ++D.n;
  D.ctl.push({ key, fn, arg, st: { axes: [] } });
  return key;
};

/** Run controller `fn(g, arg, st, pad)` on page P's polls until it returns a result; returns it (sim `timeout` ms). */
export async function drive(P, fn, arg, timeout, what) {
  await P.evaluate(`(${installDriver})()`);
  const key = await P.evaluate(`(${addCtl})(${fn}, ${JSON.stringify(arg) ?? 'undefined'})`);
  try {
    await until(P, (k) => window.__drv?.res[k] !== undefined, key, timeout, what);
  } catch (e) {
    await P.evaluate((k) => {
      const D = window.__drv;
      const i = D?.ctl.findIndex((c) => c.key === k) ?? -1;
      if (i >= 0) {
        for (const ax of D.ctl[i].st.axes) window.__pad.axis(ax, 0);
        D.ctl.splice(i, 1);
      }
    }, key).catch(() => {});
    throw e;
  }
  const r = await P.evaluate((k) => { const v = window.__drv.res[k]; delete window.__drv.res[k]; return v; }, key);
  if (r && r.__error) throw new Error(`${what}: the controller threw: ${r.__error}`);
  return r;
}

// ------------------------------------------------------------------------------------------------- walkTo

/** Page-side: steer the left stick at (x, z) in the camera frame (move.y forward = (sin yaw, cos yaw)); slow inside
 *  `creep` m; done when inside `tol` and nearly stopped; 'stuck' after 3 sim s without 0.2 m of progress. */
function padWalkCtl(g, a, st, pad) {
  const p = g.player.position;
  const dx = a.x - p.x;
  const dz = a.z - p.z;
  const d = Math.hypot(dx, dz);
  st.axes = [0, 1];
  if (st.t0 === undefined) {
    st.t0 = g.time;
    st.best = d;
    st.bestT = g.time;
  }
  if (d < st.best - 0.2) {
    st.best = d;
    st.bestT = g.time;
  }
  const res = (r) => ({ r, d: +d.toFixed(2), x: +p.x.toFixed(2), z: +p.z.toFixed(2), t: +(g.time - st.t0).toFixed(2) });
  if (d < a.tol) {
    pad.axis(0, 0);
    pad.axis(1, 0);
    if ((g.player.controller.speed ?? 0) < 0.3) return res('ok');
    return undefined;
  }
  if (g.time - st.bestT > 3) return res('stuck');
  if (g.time - st.t0 > a.maxS) return res('timeout');
  const cy = g.player.cam.yaw;
  const wx = dx / d;
  const wz = dz / d;
  const mx = Math.cos(cy) * wx - Math.sin(cy) * wz;
  const my = Math.sin(cy) * wx + Math.cos(cy) * wz;
  const mag = d < a.creep ? Math.max(0.35, d / a.creep) : 1;
  pad.axis(0, mx * mag);
  pad.axis(1, -my * mag);
  return undefined;
}

/**
 * Walk `who`'s player on page P to (x, z) by input: the pad's left stick (a page-side closed loop on each poll) or WASD
 * (a Node closed loop, camera-relative 8 directions, Left Alt creeps near the end). `tol` m, `maxS` sim s. Returns
 * { r: 'ok', d, x, z, t }; throws on 'stuck' / 'timeout' (the message names where it stopped).
 */
export async function walkTo(P, who, [x, z], { tol = 0.4, maxS = 30, creep = 1.2, what = '' } = {}) {
  const label = what || `${who} walks to ${x.toFixed(1)}, ${z.toFixed(1)}`;
  let r;
  if (who === 'pad') r = await drive(P, padWalkCtl, { x, z, tol, maxS, creep }, (maxS + 10) * 1000, label);
  else r = await kbmWalk(P, x, z, tol, maxS, creep);
  if (r.r !== 'ok') throw new Error(`${label}: ${r.r} at ${r.x}, ${r.z} (${r.d} m short after ${r.t} s)`);
  return r;
}

/** Walk a list of [x, z] points in order (each but the last with a looser `via` tolerance). */
export async function walkPath(P, who, pts, opts = {}) {
  let r = null;
  for (let i = 0; i < pts.length; i++) r = await walkTo(P, who, pts[i], i < pts.length - 1 ? { ...opts, tol: opts.via ?? 0.8, creep: 0 } : opts);
  return r;
}

async function kbmWalk(P, x, z, tol, maxS, creep) {
  const held = new Set();
  const set = async (want) => {
    for (const k of [...held]) if (!want.has(k)) { await P.keyboard.up(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { await P.keyboard.down(k); held.add(k); }
  };
  let t0 = null;
  let best = Infinity;
  let bestT = 0;
  try {
    for (;;) {
      const s = await me(P);
      if (t0 === null) { t0 = s.t; bestT = s.t; }
      const dx = x - s.x;
      const dz = z - s.z;
      const d = Math.hypot(dx, dz);
      const res = (r) => ({ r, d: +d.toFixed(2), x: +s.x.toFixed(2), z: +s.z.toFixed(2), t: +(s.t - t0).toFixed(2) });
      if (d < best - 0.2) { best = d; bestT = s.t; }
      if (d < tol) {
        await set(new Set());
        if (s.speed < 0.3) return res('ok');
      } else if (s.t - bestT > 3) {
        return res('stuck');
      } else if (s.t - t0 > maxS) {
        return res('timeout');
      } else {
        const mx = Math.cos(s.yaw) * (dx / d) - Math.sin(s.yaw) * (dz / d);
        const my = Math.sin(s.yaw) * (dx / d) + Math.cos(s.yaw) * (dz / d);
        const want = new Set();
        if (my > 0.38) want.add('KeyW');
        if (my < -0.38) want.add('KeyS');
        if (mx > 0.38) want.add('KeyD');
        if (mx < -0.38) want.add('KeyA');
        if (d < creep) want.add('AltLeft');
        await set(want);
      }
      await sleep(30);
    }
  } finally {
    await set(new Set());
  }
}

// ------------------------------------------------------------------------------------------------- aimAt

/** Page-side: the camera ray's yaw / pitch error to the target (rad, wrapped). */
function aimErr(g, a) {
  const cam = g.scene.activeCamera;
  const o = cam.globalPosition ?? cam.position;
  const f = g.player.cam.forward;
  const dx = a.x - o.x;
  const dy = a.y - o.y;
  const dz = a.z - o.z;
  let ey = Math.atan2(dx, dz) - Math.atan2(f.x, f.z);
  ey = Math.atan2(Math.sin(ey), Math.cos(ey));
  const ep = Math.atan2(dy, Math.hypot(dx, dz)) - Math.asin(Math.max(-1, Math.min(1, f.y)));
  return [ey, ep];
}

function padAimCtl(g, a, st, pad) {
  const cam = g.scene.activeCamera;
  const o = cam.globalPosition ?? cam.position;
  const f = g.player.cam.forward;
  const dx = a.x - o.x;
  const dy = a.y - o.y;
  const dz = a.z - o.z;
  let ey = Math.atan2(dx, dz) - Math.atan2(f.x, f.z);
  ey = Math.atan2(Math.sin(ey), Math.cos(ey));
  const ep = Math.atan2(dy, Math.hypot(dx, dz)) - Math.asin(Math.max(-1, Math.min(1, f.y)));
  st.axes = [2, 3];
  if (st.t0 === undefined) {
    st.t0 = g.time;
    st.gy = 3;
    st.gp = 3;
    st.ok = 0;
  }
  const res = (r) => ({ r, ey: +ey.toFixed(4), ep: +ep.toFixed(4), t: +(g.time - st.t0).toFixed(2) });
  if (Math.abs(ey) < a.tol && Math.abs(ep) < a.tol) {
    pad.axis(2, 0);
    pad.axis(3, 0);
    if (++st.ok >= 3) return res('ok');
    return undefined;
  }
  st.ok = 0;
  if (g.time - st.t0 > a.maxS) return res('timeout');
  // a sign flip overshot: halve that axis's gain
  if (st.ly !== undefined && Math.sign(ey) !== Math.sign(st.ly) && Math.abs(st.ly) > a.tol) st.gy *= 0.5;
  if (st.lp !== undefined && Math.sign(ep) !== Math.sign(st.lp) && Math.abs(st.lp) > a.tol) st.gp *= 0.5;
  st.ly = ey;
  st.lp = ep;
  const stickOf = (e, gain) => (Math.abs(e) < a.tol ? 0 : Math.sign(e) * Math.min(1, Math.max(a.min, Math.abs(e) * gain)));
  pad.axis(2, stickOf(ey, st.gy));
  // stick up (negative) looks up (pitch +)
  pad.axis(3, -stickOf(ep, st.gp));
  return undefined;
}

/**
 * Turn `who`'s camera on page P until its ray points at world point [x, y, z] (`tol` rad on yaw and pitch): the right
 * stick (page-side closed loop) or the mouse (Node loop, gain measured from each move). Returns { r: 'ok', ey, ep };
 * throws on a timeout.
 */
export async function aimAt(P, who, [x, y, z], { tol = 0.012, maxS = 8, min = 0.22, what = '' } = {}) {
  const label = what || `${who} aims at ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`;
  const r = who === 'pad' ? await drive(P, padAimCtl, { x, y, z, tol, maxS, min }, (maxS + 10) * 1000, label) : await mouseAim(P, [x, y, z], tol, maxS);
  if (r.r !== 'ok') throw new Error(`${label}: ${r.r} (yaw off ${r.ey}, pitch off ${r.ep} rad after ${r.t} s${r.why ? `; ${r.why}` : ''})`);
  return r;
}

/** The mouse position the suite last moved to, per page (a move's `movementX` is the step from it). */
const mousePos = new WeakMap();

/** Page-side, pass-through: count the window `mousemove` events the page gets (and their |movementX| + |movementY|), so
 *  a mouse aim that turns nothing says whether the moves reached the page at all. Never cancels or changes an event. */
const installMoveTap = () => {
  const t = (window.__mtap ??= { n: 0, px: 0 });
  if (!t.on) {
    t.on = true;
    window.addEventListener('mousemove', (e) => { t.n++; t.px += Math.abs(e.movementX) + Math.abs(e.movementY); }, { capture: true, passive: true });
  }
  return { n: t.n, px: t.px };
};
const mouseState = () => {
  const k = window.__app.input.kbm;
  const t = window.__mtap ?? { n: 0, px: 0 };
  return { locked: !!document.pointerLockElement, want: !!k.wantPointerLock, mode: window.__app.input.mode, moves: t.n, px: Math.round(t.px) };
};
const aimedInNow = () => { const g = window.__app.current; return g.weapons.drawPhase === 2 && g.player.cam.ads >= 0.9; };

/**
 * The mouse look on page P (keyboard / mouse player). Facts from the laptop runs and a two-page Chromium check
 * (triage 2026-10-25): a background tab gets mouse moves with movementX; but while a mouse button is held whose
 * pointerdown the engine cancelled (the canvas: RMB aim, LMB fire), the page gets NO `mousemove` (Pointer Events compat
 * rule), and the game's look reads `mousemove` only (keyboardMouseSource.ts:165-167). So an aim under a held button
 * lets the button go, turns, and presses it again, measuring the error in the aimed view each time (the camera sits
 * elsewhere while aiming). A page whose mouse is not captured in play gets one click first (it captures, never fires:
 * keyboardMouseSource.ts:122-126), as a player does.
 */
async function mouseAim(P, tgt, tol, maxS) {
  const tj = JSON.stringify({ x: tgt[0], y: tgt[1], z: tgt[2] });
  const err = () => P.evaluate(`(() => { const g = window.__app.current; const r = (${aimErr})(g, ${tj}); return { ey: r[0], ep: r[1], t: g.time, s: window.__app.settings.get().mouse, ads: !!(g.player.ads || g.player.adsWanted) }; })()`);
  await P.evaluate(`(${installMoveTap})()`);
  const held = [...heldOf(P)];
  let pos = mousePos.get(P) ?? null;
  if (!pos) {
    const vp = P.viewportSize() ?? { width: 960, height: 480 };
    pos = [vp.width / 2, vp.height / 2];
    // a first move with the buttons up (with one held it would never reach the page)
    for (const b of held) await mouseButton(P, b, false);
    await P.mouse.move(pos[0], pos[1]);
    for (const b of held) await mouseButton(P, b, true);
  }
  let ms = await P.evaluate(`(${mouseState})()`);
  if (ms.want && !ms.locked) {
    for (const b of held) await mouseButton(P, b, false);
    await P.mouse.down({ button: 'left' });
    await P.mouse.up({ button: 'left' });
    await until(P, () => !!document.pointerLockElement, null, 3000, 'the click captures the mouse').catch(() => {});
    for (const b of held) await mouseButton(P, b, true);
    console.log(`  (mouse aim: the page had no mouse capture in play (${JSON.stringify(ms)}); one click captured it: ${(await P.evaluate(`(${mouseState})()`)).locked})`);
  }
  let e = await err();
  const t0 = e.t;
  // first guess: e2e has MOUSE_RAD_PER_PX 0.0024 x sensitivity (keyboardMouseSource.ts:10); measured after each free move.
  const k0 = 0.0024 * (e.s.sensitivity ?? 1);
  let ky = k0 * (e.ads ? e.s.adsMultiplier ?? 1 : 1);
  let kp = ky * (e.s.invertY ? 1 : -1);
  let moved = 0;
  let regrips = 0;
  const camYP = () => P.evaluate(() => { const c = window.__app.current.player.cam; return [c.yaw, c.pitch]; });
  const step = async (mx, my) => {
    const next = [pos[0] + mx, pos[1] + my];
    await P.mouse.move(next[0], next[1], { steps: 2 });
    pos = next;
  };
  try {
    for (let i = 0; i < 40; i++) {
      if (Math.abs(e.ey) < tol && Math.abs(e.ep) < tol) return { r: 'ok', ey: +e.ey.toFixed(4), ep: +e.ep.toFixed(4), t: +(e.t - t0).toFixed(2), regrips };
      if (e.t - t0 > maxS) break;
      if (held.length) {
        // a held button blocks the look: let go, turn by the aimed view's error at the plain gain (no aim multiplier once
        // `player.ads` is off), press again, read the error in the aimed view
        regrips++;
        for (const b of held) await mouseButton(P, b, false);
        await until(P, () => !window.__app.current.player.ads, null, 2000, 'the aim let go').catch(() => {});
        await sleep(60);
        const c0 = await camYP();
        await step(Math.max(-300, Math.min(300, e.ey / k0)), Math.max(-200, Math.min(200, e.ep / (k0 * (e.s.invertY ? 1 : -1)))));
        const w0 = Date.now();
        let c1 = c0;
        do {
          await sleep(30);
          c1 = await camYP();
        } while (Math.abs(c1[0] - c0[0]) < 1e-5 && Math.abs(c1[1] - c0[1]) < 1e-5 && Date.now() - w0 < 1500);
        if (Math.abs(c1[0] - c0[0]) > 1e-5 || Math.abs(c1[1] - c0[1]) > 1e-5) moved++;
        for (const b of held) await mouseButton(P, b, true);
        if (held.includes('right')) await until(P, aimedInNow, null, 4000, 'aimed in again after the turn').catch(() => {});
        e = await err();
        continue;
      }
      const mx = Math.max(-300, Math.min(300, e.ey / ky));
      const my = Math.max(-200, Math.min(200, e.ep / kp));
      const before = e;
      await step(mx, my);
      // the frames apply the look at render rate: wait until the error moved (or 1.5 s wall)
      const w0 = Date.now();
      do {
        await sleep(30);
        e = await err();
      } while (Math.abs(e.ey - before.ey) < 1e-5 && Math.abs(e.ep - before.ep) < 1e-5 && Date.now() - w0 < 1500);
      if (Math.abs(e.ey - before.ey) > 1e-5 || Math.abs(e.ep - before.ep) > 1e-5) moved++;
      if (Math.abs(mx) > 2 && Math.abs(before.ey - e.ey) > 1e-4) ky = Math.max(1e-4, Math.min(0.02, (before.ey - e.ey) / mx));
      if (Math.abs(my) > 2 && Math.abs(before.ep - e.ep) > 1e-4) kp = (before.ep - e.ep) / my;
    }
  } finally {
    mousePos.set(P, pos);
  }
  ms = await P.evaluate(`(${mouseState})()`);
  return { r: 'timeout', ey: +e.ey.toFixed(4), ep: +e.ep.toFixed(4), t: +(e.t - t0).toFixed(2), why: `look moved on ${moved} move(s); page mouse ${JSON.stringify(ms)}; held ${JSON.stringify(held)}` };
}

/** Rounds the page's own player fired (`PlayerWeapons.shotCount`, the wire's `sc`). */
export const shotCount = (P) => P.evaluate(() => window.__app.current.weapons.shotCount);

/** Fire one round on `who`'s device: hold the trigger / left button until `shotCount` steps (sim `timeout`). Returns
 *  { before, after, t, ads } (t: the page's sim time at the step). `ads`: aim first (LT / right button held until
 *  `player.ads`, released after the shot), as a player fires a pistol. */
export async function fireOne(P, who, timeout = 4000, { ads = false } = {}) {
  const before = await shotCount(P);
  if (ads) await hold(P, who, 'ads', true);
  let aimed = false;
  try {
    if (ads) {
      await until(P, () => window.__app.current.player.ads === true, null, 3000, `${who} aims down sights`);
      aimed = true;
    }
    // (triage 2026-10-25) a pull whose press edge the game used up before the gun was ready (a semi-auto needs a fresh
    // press) never fires however long it is held (laptop rerun: "pad fires one round" timed out once, aimed in): pull
    // again after 1 s of sim time without a round, as a player would, until `timeout`
    const fired = (n) => window.__app.current.weapons.shotCount > n;
    const t0 = (await me(P)).t;
    let pulls = 0;
    for (;;) {
      pulls++;
      try {
        await holdUntil(P, who, 'fire', fired, before, `${who} fires one round`, 1000);
        break;
      } catch (e) {
        const now = (await me(P)).t;
        if ((now - t0) * 1000 + 1000 > timeout) {
          const d = await P.evaluate(() => { const g = window.__app.current; const w = g.weapons; return { drawPhase: w.drawPhase, camAds: +g.player.cam.ads.toFixed(2), ads: g.player.ads, gun: w.current?.def?.id, mag: w.current?.mag, fireDown: window.__app.input.state.down('fire'), mode: window.__app.input.mode }; }).catch(() => null);
          throw new Error(`${e.message.split(' [')[0]} (${pulls} pulls over ${(now - t0).toFixed(1)} sim s; ${JSON.stringify(d)})`);
        }
        await waitHostSim(P, 150);
      }
    }
  } finally {
    if (ads) await hold(P, who, 'ads', false);
  }
  const after = await shotCount(P);
  const t = await P.evaluate(() => window.__app.current.time);
  return { before, after, t, ads: aimed };
}

// ------------------------------------------------------------------------------------------------- pickRow

/**
 * Run a context-menu row by input on page P: wait (sim `timeout`) for a row whose label matches `re` in the list, hold
 * interact (A / E; the list opens on row 1), step the highlight to it (D-pad / arrow keys, one step each seen), then let
 * go (a hold row: keep A held until it runs). Returns { label, kind, opt, index, t } (t: sim time of the release).
 */
export async function pickRow(P, who, re, { timeout = 6000 } = {}) {
  const find = (src) => {
    const m = window.__app.current.ctxMenu;
    const r = new RegExp(src, 'i');
    for (let i = 0; i < m.count; i++) if (r.test(m.opts[i].label)) return i;
    return -1;
  };
  try {
    await until(P, `(src) => (${find})(src) >= 0`, re.source, timeout, `a "${re.source}" row on the ${who} page`);
  } catch (e) {
    const rows = await ctxRows(P).catch(() => null);
    throw new Error(`${e.message}; rows: ${JSON.stringify(rows?.rows?.map((r) => r.label) ?? null)}`);
  }
  // A down: the list opens active on row 1 the step it is polled. (triage 2026-10-25) The list opens only on the press
  // edge while it is 'passive' (contextMenu.ts:192-198); a press that lands while the rows are briefly gone is lost and
  // holding on never opens it (laptop run 1, part 2 "client door": "the pad list opens on interact" timed out). Let go
  // and press again, as a player would, up to 3 presses.
  let row = null;
  for (let n = 1; ; n++) {
    await hold(P, who, 'interact', true);
    try {
      await until(P, () => window.__app.current.ctxMenu.state === 'active', null, 1500, `the ${who} list opens on interact`);
      break;
    } catch (e) {
      // opened just after the wait: keep holding (a release now would run row 1)
      if (await P.evaluate(() => window.__app.current.ctxMenu.state === 'active').catch(() => false)) break;
      await hold(P, who, 'interact', false);
      if (n >= 3) {
        const rows = await ctxRows(P).catch(() => null);
        throw new Error(`${e.message.split(' [')[0]} (${n} presses; menu ${JSON.stringify(rows && { state: rows.state, count: rows.count, rows: rows.rows.map((r) => r.label) })})`);
      }
      await waitHostSim(P, 150);
    }
  }
  try {
    for (let n = 0; n < 10; n++) {
      const s = await P.evaluate(`((src) => { const m = window.__app.current.ctxMenu; return { at: (${find})(src), sel: m.sel, state: m.state }; })(${JSON.stringify(re.source)})`);
      if (s.state !== 'active') throw new Error(`the ${who} list closed before "${re.source}" was reached`);
      if (s.at < 0) throw new Error(`the "${re.source}" row left the ${who} list`);
      if (s.sel === s.at) break;
      const dir = s.at > s.sel ? 'down' : 'up';
      if (who === 'pad') await holdUntil(P, who, dir, (sel) => window.__app.current.ctxMenu.sel !== sel, s.sel, `the ${who} highlight steps ${dir}`, 4000);
      else {
        await P.keyboard.press(KEY_OF[dir]);
        await until(P, (sel) => window.__app.current.ctxMenu.sel !== sel || window.__app.current.ctxMenu.state !== 'active', s.sel, 4000, `the ${who} highlight steps ${dir}`);
      }
    }
    row = await P.evaluate(() => { const m = window.__app.current.ctxMenu; const o = m.opts[m.sel]; return o ? { label: o.label, kind: o.kind, opt: o.opt, ref: o.ref, hold: o.hold, index: m.sel } : null; });
    if (!row || !re.test(row.label)) throw new Error(`the ${who} highlight is not on "${re.source}" (${JSON.stringify(row)})`);
    if (row.hold > 0) await until(P, () => window.__app.current.ctxMenu.state !== 'active', null, (row.hold + 4) * 1000, `the ${who} hold row "${row.label}" fills and runs`);
  } finally {
    await hold(P, who, 'interact', false);
  }
  await until(P, () => window.__app.current.ctxMenu.state !== 'active', null, 4000, `the ${who} row "${row.label}" runs on release`);
  row.t = await P.evaluate(() => window.__app.current.time);
  return row;
}

// ------------------------------------------------------------------------------------------------- menus

/** Focus the menu element matching CSS `sel` on page P by nav input (down, then up), then return its text. */
export async function menuFocus(P, who, sel, max = 14) {
  const at = () => P.evaluate((s) => { const t = document.querySelector(s); const f = window.__app.nav.focused; return { has: !!t, on: !!t && f === t, f: f?.textContent?.trim().slice(0, 40) ?? '' }; }, sel);
  for (const dir of ['down', 'up']) {
    for (let i = 0; i < max; i++) {
      const s = await at();
      if (!s.has) throw new Error(`menu: no ${sel} on the ${who} page`);
      if (s.on) return s.f;
      await tap(P, who, dir);
      await sleep(60);
    }
  }
  const s = await at();
  if (s.on) return s.f;
  throw new Error(`menu: the ${who} focus never reached ${sel} (on "${s.f}")`);
}

/**
 * (PLAN "Sweep") The host's pause-menu "Restart at checkpoint" by input: pause (Start / P), focus the row, confirm, the
 * dialog (opens on Stay) to Restart, confirm. Waits until the pause screen is gone.
 */
export async function pauseRestart(P, who) {
  await holdUntil(P, who, 'pause', () => !!document.querySelector('.pause-screen'), null, `the ${who} pause menu opens`, 6000);
  await menuFocus(P, who, '.pause-screen [data-key="restart-checkpoint"]');
  await tap(P, who, 'confirm');
  await until(P, () => !!window.__app.screens.top?.el.classList.contains('dialog-screen'), null, 4000, 'the restart confirm opens');
  for (let i = 0; i < 4 && !/Restart/.test(await P.evaluate(() => window.__app.nav.focused?.textContent ?? '')); i++) await tap(P, who, 'right');
  const f = await P.evaluate(() => window.__app.nav.focused?.textContent ?? '');
  if (!/Restart/.test(f)) throw new Error(`the restart confirm's Restart button never took the focus (on "${f}")`);
  await tap(P, who, 'confirm');
  await until(P, () => !document.querySelector('.pause-screen') && !window.__app.screens.top, null, 6000, 'the pause menu closes after the restart');
}

// ------------------------------------------------------------------------------------------------- page life

const cdps = new WeakMap();
/** The page's CDP session (one per page). */
export async function cdp(P) {
  let s = cdps.get(P);
  if (!s) {
    s = await P.context().newCDPSession(P);
    cdps.set(P, s);
  }
  return s;
}

/** CDP `Page.setWebLifecycleState`: 'frozen' (timers, workers, rAF and BroadcastChannel all stop, as a phone app
 *  switch / a discarded-soon tab) or 'active'. Do not `evaluate` on a frozen page: it waits until it is resumed. */
export async function lifecycle(P, state) {
  await (await cdp(P)).send('Page.setWebLifecycleState', { state });
}

/**
 * Hide page P behind page `front` the way the lifecycle probe chose (H1-REPORT "Lifecycle probe"): focus emulation off on
 * P and `front` brought to the front. Returns the restore function (P back in front, focus emulation back on).
 */
export async function hideBehind(P, front) {
  const s = await cdp(P);
  await s.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  await front.bringToFront();
  return async () => {
    await P.bringToFront();
    await s.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  };
}

/** The e2e-offline fallback (scripts/e2e-offline.mjs:108-121): `document.hidden` / `visibilityState` redefined and a
 *  `visibilitychange` dispatched. Page-side only (rAF and timers run on); the probe records how it compares. */
export const spoofHidden = (P, hidden) =>
  P.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);

/** The client page's URL with the autostart taken out (`menu`: Michael's path back in, the main menu's Rejoin / Join). */
const menuUrl = (u) => {
  const x = new URL(u);
  x.searchParams.delete('autostart');
  x.searchParams.delete('mode');
  return x.toString();
};
const booted = (P) => P.waitForFunction(() => document.getElementById('boot')?.classList.contains('done') || /Failed/.test(document.getElementById('boot-status')?.textContent ?? ''), null, { timeout: 60000 });

/**
 * Reload the client page (a discarded tab coming back). `menu` false: the same boot URL (autostart: `autoLocalCourse`
 * rejoins by token), waits for the match; true (PLAN-CHECK 5): the URL without autostart, waits for the boot only (the
 * main menu: the case picks "Rejoin <code>" by pad). Reconnects the pad. The caller reinstalls its taps.
 */
export async function reloadClient(h, { menu = false } = {}) {
  cdps.delete(h.B);
  if (menu) await h.B.goto(menuUrl(h.B.url()));
  else await h.B.reload();
  await booted(h.B);
  if (!menu) await inMatch(h.B, 'reloaded client');
  await padReady(h.B);
}

/**
 * Close the client page and open a new one (a closed tab, then the link again; a new tab has no sessionStorage).
 * `menu` as `reloadClient`. Updates `h.B` / `h.eB` (the old page's errors stay in `h.eOld`).
 */
export async function reopenClient(h, { menu = false } = {}) {
  const url = h.B.url();
  await h.B.close().catch(() => {});
  (h.eOld ??= []).push(...h.eB);
  // the old URL already carries gfx / gear / netsim / netdrop: openPage adds nothing (no autostart in params: no match wait)
  const { page, errors } = await E.openPage(h.ctx, menu ? menuUrl(url) : url, '');
  h.B = page;
  h.eB = errors;
  setSimPages([h.A, h.B]);
  if (!menu) await inMatch(h.B, 'new client');
  await padReady(h.B);
}

/** The host's session view: players, held slots and the host's remotes (who the host still runs). */
export const hostSession = (A) =>
  A.evaluate(() => {
    const s = window.__coop?.session;
    const net = window.__app.current?.net;
    return { players: s ? [...s.players.keys()] : [], remotes: net?.remotes ? [...net.remotes.keys()] : [], held: s?.held ? [...(s.held.keys?.() ?? [])] : null };
  });
