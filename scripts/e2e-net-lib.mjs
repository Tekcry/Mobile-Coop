// Shared co-op helpers for the two-page ?net=local suites (e2e-netmove, anim-audit --remote): the host (page A) opens a
// room, the clients join by code; a mode starts on every page; joint readers for the client's own pose and the host's
// copy of it.
import { launch, openPage } from './e2e-lib.mjs';

/**
 * (co-op test fix, process audit section 2) The two-page suites wait on the game's own clock. On software GL two pages
 * render a few frames a second and the loop advances at most 4 fixed steps (67 ms) per frame (`src/core/loop.ts`), so
 * the sim runs at a fraction of real time; a wall-clock timeout then expires while a game move is still under way.
 * `setSimPages(pages)` names the pages whose clocks count (the slower one decides); in a networked match a timeout is
 * sim time (`__app.current.time`), outside one (menus, the lobby) it is wall time. A wall cap (`SIM_WALL_CAP` x the
 * timeout, at least 60 s; `E2E_SIM_CAP`) stays as the hang guard.
 */
let simPages = [];
const SIM_WALL_CAP = Number(process.env.E2E_SIM_CAP ?? 10);
export function setSimPages(pages) {
  simPages = pages.filter(Boolean);
}
const simNow = (P) => P.evaluate(() => { const c = window.__app?.current; return c?.net && typeof c.time === 'number' ? c.time : null; }).catch(() => null);
async function simTimes(pages) {
  return Promise.all(pages.map(simNow));
}
/** The slowest page's sim seconds since `t0s` (null entries: no match there), or null when no page is in a match. */
function simElapsed(t0s, ts) {
  let e = null;
  for (let i = 0; i < ts.length; i++) {
    if (ts[i] === null || t0s[i] === null) continue;
    const d = ts[i] - t0s[i];
    e = e === null ? d : Math.min(e, d);
  }
  return e;
}
/** Each clock page's sim seconds and fps over a wait, for timeout messages. */
async function clockReport(pages, t0s, wall0) {
  const ts = await simTimes(pages);
  const wall = (Date.now() - wall0) / 1000;
  const fps = await Promise.all(pages.map((P) => P.evaluate(() => Math.round(window.__app?.engine?.getFps?.() ?? -1)).catch(() => -1)));
  return pages.map((_, i) => {
    const sim = ts[i] !== null && t0s[i] !== null ? ts[i] - t0s[i] : null;
    return `${i === 0 ? 'host' : `page ${i + 1}`}: sim ${sim === null ? 'n/a' : sim.toFixed(2) + ' s'} in ${wall.toFixed(1)} s wall (x${sim === null || !wall ? '?' : (sim / wall).toFixed(2)}), ${fps[i]} fps`;
  }).join('; ');
}

/**
 * Wait for `fn(arg)` to be truthy on `page` (polled from Node every 100 ms), else throw "timed out waiting for <what>"
 * with both sims' clocks. `timeout` (ms) is sim time in a match (above), wall time outside one.
 */
export async function until(page, fn, arg, timeout = 15000, what = 'condition') {
  // (G13) polled from here: on a desktop context the in-page polling of waitForFunction stops on a page in the
  // background (another page in front), so a condition that holds there was never seen
  const pages = simPages.length ? simPages : [page];
  const wall0 = Date.now();
  const t0s = await simTimes(pages);
  const cap = Math.max(timeout * SIM_WALL_CAP, 60000);
  for (;;) {
    if (await page.evaluate(`!!(${fn})(${JSON.stringify(arg) ?? 'undefined'})`).catch(() => false)) return;
    const wall = Date.now() - wall0;
    const sim = simElapsed(t0s, await simTimes(pages));
    if ((sim === null ? wall : sim * 1000) > timeout || wall > cap) {
      throw new Error(`timed out waiting for ${what} [${await clockReport(pages, t0s, wall0)}${wall > cap ? '; wall cap' : ''}]`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** Let `ms` of game time pass on every clock page (wall time outside a match; the same wall cap). */
export async function waitSim(ms) {
  const pages = simPages;
  const wall0 = Date.now();
  const t0s = pages.length ? await simTimes(pages) : [];
  const cap = Math.max(ms * SIM_WALL_CAP, 60000);
  for (;;) {
    const wall = Date.now() - wall0;
    const sim = pages.length ? simElapsed(t0s, await simTimes(pages)) : null;
    if ((sim === null ? wall : sim * 1000) >= ms || wall > cap) return;
    await new Promise((r) => setTimeout(r, 50));
  }
}

/**
 * (load-audit) Let `ms` of ONE page's game clock pass (the host's, for windows the host times: a jam, a hold, a lamp's
 * off time; a client's, for what its own frames do over a window). `waitSim` counts the slowest clock page, and under
 * load the client runs at x0.2-0.3 while the pumped host runs near real time, so a client-timed wait lets 3-5x more
 * host time pass. `sample()` (optional) runs every poll, to latch a state over the window. Returns the page's elapsed
 * game time (ms): short of `ms` when the wall cap ended the wait (a paused or stalled page), -1 at once when the page is
 * in no match (no clock). Every caller asserts the result is >= `ms`, so a window that never ran never passes.
 */
export async function waitHostSim(P, ms, sample) {
  const wall0 = Date.now();
  const t0 = await simNow(P);
  if (t0 === null) return -1;
  const cap = Math.max(ms * SIM_WALL_CAP, 60000);
  for (;;) {
    if (sample) await sample();
    const t = await simNow(P);
    if (t === null) return -1;
    const el = (t - t0) * 1000;
    if (el >= ms || Date.now() - wall0 > cap) return el;
    await new Promise((r) => setTimeout(r, 50));
  }
}

/**
 * (load-latent-net) Run `fn(g, arg, st)` on the host page after every fixed sim step (`g` = `__app.current`, `st` = a
 * per-hook object kept across steps) until it returns a value other than undefined / null / false; that value (cloned
 * on that step) is the result, read with `hostStepResult`. The host page is in the background and the suites' pump
 * steps it with `stepHeadless` when its rAF did not run, so a hook on its rAF misses steps: this one wraps the loop's
 * `fixedUpdate` hook (`__app.loop.hooks`, set per match; a new match drops the hooks), the way `watchTeam` turns
 * `team.state` into an accessor. A host action that must land inside a game-time window of a client action (a pair
 * press, a synced hack) or a state that lasts a few steps (a reboot) is then caught on the step it happens, not after
 * Node polls that took seconds of host time under load. `fn` is sent as source: it sees only the page and its args.
 * Returns the hook's key.
 */
const installStep = (fn, arg) => {
  const h = window.__app.loop.hooks;
  const S = (window.__hostStep ??= { n: 0, res: {} });
  if (!h.__steps) {
    const steps = (h.__steps = []);
    const f = h.fixedUpdate;
    h.fixedUpdate = (dt) => {
      f(dt);
      if (!steps.length) return;
      const g = window.__app.current;
      for (const s of steps.slice()) {
        let r;
        try {
          r = s.fn(g, s.arg, s.st);
        } catch (e) {
          r = { __error: String(e?.stack ?? e) };
        }
        if (r === undefined || r === null || r === false) continue;
        S.res[s.key] = JSON.parse(JSON.stringify({ v: r, t: +(g?.time ?? 0).toFixed(3) }));
        steps.splice(steps.indexOf(s), 1);
      }
    };
  }
  const key = ++S.n;
  h.__steps.push({ key, fn, arg, st: {} });
  return key;
};
export const onHostStep = (A, fn, arg) => A.evaluate(`(${installStep})(${fn}, ${JSON.stringify(arg) ?? 'undefined'})`);
/** Drop host step hook `key` if it has not fired (a path that will not read it), so it never fires late. */
export const offHostStep = (A, key) => A.evaluate((k) => {
  const s = window.__app?.loop?.hooks?.__steps;
  const i = s?.findIndex((x) => x.key === k) ?? -1;
  if (i >= 0) s.splice(i, 1);
  if (window.__hostStep) delete window.__hostStep.res[k];
}, key);
/** Wait (the `until` clocks) for host step hook `key`'s result and return it; logs the host sim time it fired at. On a
 * timeout the hook is dropped before the error is rethrown. */
export async function hostStepResult(A, key, timeout = 8000, what = 'host step hook') {
  try {
    await until(A, (k) => window.__hostStep?.res[k] !== undefined, key, timeout, what);
  } catch (e) {
    await offHostStep(A, key).catch(() => {});
    throw e;
  }
  const { v, t } = await A.evaluate((k) => { const r = window.__hostStep.res[k]; delete window.__hostStep.res[k]; return r; }, key);
  if (v && typeof v === 'object' && v.__error) throw new Error(`${what}: the host step hook threw: ${v.__error}`);
  console.log(`  (${what}: on the host step at ${t} s)`);
  return v;
}

/** (test-speed) A match load (map build, light bake, both pages joining) runs outside the sim clock, in wall time: on a
 * loaded machine two pages build at 2-3 frames/s and took over 50 s (e2e-coop, 2026-10-20). The load waits use this
 * (ms; `E2E_LOAD_MS`); a hang still ends there. */
export const LOAD_MS = Number(process.env.E2E_LOAD_MS ?? 120000);

/** (coop4 E2E) The same load wait for the 3-4 page parts (four pages build a map at once; the laptop GPU queue runs
 * them alone): `E2E_LOAD_MS`, default 240000. The two-page suites keep `LOAD_MS`. */
export const LOAD_MS_4 = Number(process.env.E2E_LOAD_MS ?? 240000);
const loadMs = (pages) => (pages.length > 2 ? LOAD_MS_4 : LOAD_MS);

/** The two-page suites' viewport where no lobby is clicked after the join (e2e-netmove, e2e-ctcourse): fewer pixels a
 * frame on software GL. The menus lay out at 1280 x 720 at least, so suites that click through the lobby (e2e-coop,
 * e2e-course) keep e2e-lib's default 1280 x 640. */
export const NET_VIEWPORT = { width: 960, height: 480 };

/** The wrists, ankles and head: the joints e2e-netmove compares (10 cm). */
export const JOINTS = ['wristL', 'wristR', 'ankleL', 'ankleR', 'headNode'];

/**
 * Launch a browser, host a room on page A and join it from `n - 1` more pages over ?net=local (the pages share the
 * context: BroadcastChannel + IndexedDB). Returns { browser, ctx, A, B, pages, errors: [eA, eB, ...], startMode }.
 * `launchOpts` goes to e2e-lib `launch` (e.g. `args`).
 */
export async function hostAndJoin(url, n = 2, launchOpts = {}) {
  const { browser, ctx, page: A, errors: eA } = await launch({ url, params: 'net=local', viewport: NET_VIEWPORT, ...launchOpts });
  const pages = [A];
  const errors = [eA];
  await A.click('.main-menu .btn:has-text("Co-op")');
  await A.click('.btn:has-text("Host a room")');
  await until(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 15000, 'host lobby');
  const code = await A.evaluate(() => window.__coop.session.code);
  // (coop4 E2E) a new room is Campaign (2 seats): a 3rd page would be refused. A 3-4 page room is hosted in a 4-seat
  // legacy mode and the caller's `startMode` switches it (e2e-coop's lobby caps block does the same)
  if (n > 2) await A.evaluate(() => window.__coop.session.setSettings('sandbox', 'warehouse', 'normal', ''));
  for (let i = 1; i < n; i++) {
    const { page, errors: e } = await openPage(ctx, url, 'net=local');
    await page.click('.main-menu .btn:has-text("Co-op")');
    await page.click('.btn:has-text("Join with code")');
    await page.keyboard.type(code.toLowerCase());
    await page.keyboard.press('Enter');
    await until(A, (k) => window.__coop.session.players.size === k, i + 1, n > 2 ? 30000 : 15000, 'host sees client');
    pages.push(page);
    errors.push(e);
  }
  setSimPages(pages);
  return { browser, ctx, A, B: pages[1] ?? null, pages, errors, startMode: (mode, map) => startMode(pages, mode, map) };
}

/** Host (pages[0]) sets the mode and map, every client readies, the match starts on every page; damage off. */
export async function startMode(pages, mode, map) {
  const [A, ...clients] = pages;
  await A.evaluate(([m, mp]) => window.__coop.session.setSettings(m, mp, 'normal', ''), [mode, map]);
  for (const P of clients) await P.evaluate(() => window.__coop.session.setReady(true));
  await until(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready');
  await A.evaluate(() => window.__coop.session.startMatch());
  for (const P of pages) await until(P, (m) => window.__app.current?.opts?.mode === m && !!window.__app.current.net && !window.__app.current.isEnded, mode, loadMs(pages), `${mode} match on every page`);
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state), null, 15000, 'client state reaches the host');
  await A.evaluate(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
}

/** World positions of `names` on the page's own player rig (the client's own pose). */
export const localJoints = (P, names = JOINTS) =>
  P.evaluate((names) => {
    const rig = window.__app.current.player.rig;
    return Object.fromEntries(names.map((n) => { rig[n].computeWorldMatrix(true); const p = rig[n].getAbsolutePosition(); return [n, [p.x, p.y, p.z]]; }));
  }, names);

/** The host's copy of its first remote player: its move mode and the world positions of `names`. */
export const remoteJoints = (A, names = JOINTS) =>
  A.evaluate((names) => {
    const r = window.__app.current.net.remotes.values().next().value;
    const rig = r.avatar.rig;
    return { mode: r.avatar.mode, j: Object.fromEntries(names.map((n) => { rig[n].computeWorldMatrix(true); const p = rig[n].getAbsolutePosition(); return [n, [p.x, p.y, p.z]]; })) };
  }, names);

/** Let the host's remotes jump (a teleport the next `n` snapshots) instead of reading it as rubber-banding. */
export const allowTeleport = (A, n = 3) => A.evaluate((n) => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(n); }, n);

/**
 * (flake-fix) Record every team-move state page P passes through (`team.state` turned into an accessor on that match's
 * controller: each change, from a fixed step or a network start, is logged with the page's sim time). A state that
 * lasts less than a poll on a loaded page (the leg-up's 0.9 s `assist`: "timed out waiting for client assists", the
 * client already back to `none`) is still seen. Call again to clear the log; `team.__log` holds it, `teamLog(P)` prints it.
 */
export const watchTeam = (P) =>
  P.evaluate(() => {
    const g = window.__app.current;
    const t = g.team;
    if (!t.__log) {
      let v = t.state;
      t.__log = [];
      Object.defineProperty(t, 'state', {
        configurable: true,
        enumerable: true,
        get: () => v,
        set: (x) => {
          if (x !== v) t.__log.push([+(window.__app.current?.time ?? 0).toFixed(2), x]);
          v = x;
        },
      });
    }
    t.__log.length = 0;
    t.__log.push([+(g.time ?? 0).toFixed(2), t.state]);
  });
/**
 * The page's team-move view for a failure message: the state log, counts, the last refusal and the offer it sees, and
 * (flake-fix) the gates that swallow the co-op press before `team.fixedUpdate` (GameState: `pistolAsk`, `wallWas`,
 * `busy`, `carrying`), so a press that never reached the team code says why.
 */
export const teamLog = (P) =>
  P.evaluate(() => {
    const g = window.__app.current;
    const t = g.team;
    const c = g.player.controller;
    const o = t.offer;
    const mates = g.net?.teamMates?.() ?? [];
    return JSON.stringify({
      time: +(g.time ?? 0).toFixed(2),
      log: t.__log ?? null,
      st: t.state,
      count: t.count,
      denied: t.lastDenied,
      room: t.lastThrowRoom,
      prompt: t.prompt,
      offer: o ? { toss: !!o.toss, boost: !!o.boost, relay: !!o.relay, mate: o.mate?.id } : null,
      me: { pos: [c.pos.x, c.pos.y, c.pos.z].map((v) => +v.toFixed(2)), yaw: +c.yaw.toFixed(2), grounded: c.grounded, crouched: c.crouched, ov: !!c.override },
      mates: mates.map((m) => ({ mode: m.mode, sub: m.sub, pos: [m.pos.x, m.pos.y, m.pos.z].map((v) => +v.toFixed(2)), yaw: +m.yaw.toFixed(2) })),
      busy: { td: !!g.takedown.active, strike: !!g.strike.active, attached: !!g.traversal.attached },
      gates: {
        wall: g.wallCore?.active ?? null,
        doorPeek: g.doorPeek?.active ?? null,
        doorOpen: g.doorOpen?.active ?? null,
        pistolAim: g.pistolAimWanted ?? null,
        weapon: g.weapons?.current?.def?.class ?? null,
        carrying: g.stealth?.carrying ?? null,
      },
    });
  });

// ---------------------------------------------------------------------------------------------------------------------
// (coop4 E2E) Helpers for the 3-4 page parts (e2e-sectorops parts 10-12). Slots are N1's: `GameState.localSlot` /
// `NetSession.selfSlot` for a page's own, `PlayerInfo.slot` in the lobby list. A build without them reads null.
// ---------------------------------------------------------------------------------------------------------------------

/** Each page's own player slot in the match (0 host, 1-3 joiners), null where the build has no slot hook yet. */
export const slotsOf = (pages) =>
  Promise.all(
    pages.map((P) =>
      P.evaluate(() => {
        const v = window.__app?.current?.localSlot ?? window.__coop?.session?.selfSlot;
        return typeof v === 'number' ? v : null;
      }).catch(() => null),
    ),
  );

/** Run `fn(page, index)` on every page at once; the results in page order. */
export const eachPage = (pages, fn) => Promise.all(pages.map((P, i) => fn(P, i)));

/** The room's player list as page `P` reads it: its own id, and each player's id, slot (null when the build has none), host / away flags. */
export const slotTable = (P) =>
  P.evaluate(() => {
    const s = window.__coop?.session;
    if (!s) return { selfId: null, players: [] };
    return { selfId: s.selfId, players: [...s.players.values()].map((p) => ({ id: p.id, slot: typeof p.slot === 'number' ? p.slot : null, host: !!p.host, away: !!p.away })) };
  });

/**
 * Pump every page in `getPages()` (a function, so a late joiner is included): a page whose rAF did not run since the
 * last pump (a background page) steps its sim headless, the e2e-ctcourse pattern, so every page but the one in front
 * keeps its clock going. Returns a stop function.
 */
export function pumpPages(getPages) {
  const busy = new WeakSet();
  const step = () => {
    if (window.__raf === undefined) {
      window.__raf = 0;
      const f = () => { window.__raf++; requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }
    const now = performance.now();
    const last = window.__pumpT ?? now;
    const idle = window.__pumpRaf === window.__raf;
    window.__pumpT = now;
    window.__pumpRaf = window.__raf;
    if (idle && window.__app.current) window.__app.loop.stepHeadless(Math.min(0.1, Math.max(1 / 60, (now - last) / 1000)));
  };
  const t = setInterval(() => {
    for (const P of getPages()) {
      if (busy.has(P)) continue;
      busy.add(P);
      P.evaluate(step).catch(() => {}).finally(() => busy.delete(P));
    }
  }, 40);
  return () => clearInterval(t);
}

/**
 * Open one more page and join the running room `code` (a late join: the match is already playing). Returns { page, errors };
 * the caller waits for the match on that page and adds it to its page list (`setSimPages`).
 */
export async function joinLate(ctx, url, code, params = 'net=local') {
  const { page, errors } = await openPage(ctx, url, params);
  await page.click('.main-menu .btn:has-text("Co-op")');
  await page.click('.btn:has-text("Join with code")');
  await page.keyboard.type(code.toLowerCase());
  await page.keyboard.press('Enter');
  return { page, errors };
}
