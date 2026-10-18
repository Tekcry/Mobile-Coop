// Shared helpers for headless end-to-end tests (desktop Chromium + fake gamepad).
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

/** E2E_GPU=1 (Michael's PC only): the hardware GPU instead of software GL. Cloud runs leave it unset. */
export const GPU = process.env.E2E_GPU === '1';

/** The Chromium to launch: E2E_BROWSER, else the cloud's preinstalled one, else undefined (playwright-core's own install: `npx playwright-core install chromium`, the PC). */
export function browserExe() {
  return [process.env.E2E_BROWSER, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((c) => c && existsSync(c));
}

/** Chromium flags: software GL (SwiftShader) by default; E2E_GPU=1 the hardware GPU (Windows: ANGLE D3D11, GPU blocklist ignored). */
export function browserArgs() {
  const base = ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
  // E2E_UNCAP=1 (frame-time measurements): no display-rate limit on requestAnimationFrame, so a frame cost is not hidden by a 60 / 120 Hz cap
  if (process.env.E2E_UNCAP === '1') base.push('--disable-frame-rate-limit', '--disable-gpu-vsync');
  if (!GPU) return ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...base];
  const angle = process.platform === 'win32' ? 'd3d11' : process.platform === 'darwin' ? 'metal' : 'gl';
  return ['--use-gl=angle', `--use-angle=${angle}`, '--enable-gpu-rasterization', ...base];
}

/** Always headless: no window on the desktop. GPU runs use Chromium's new headless mode
 * (full chrome, ANGLE D3D11) - its hidden window still takes a real pointer lock, which grabbed the PC's cursor and threw it
 * to the top left mid-run (Michael, 2026-10-09): GPU runs fake pointer lock. E2E_HEADED=1 (debugging only) opens a window
 * parked off-screen and fakes it too. */
export const HEADED = process.env.E2E_HEADED === '1';
export function launchOptions() {
  // the runner sets E2E_RUNNER=1: a headed window there steals focus and the cursor, so it is an error, never a fallback
  if (HEADED && process.env.E2E_RUNNER === '1') {
    console.error('E2E ERROR: a suite tried to launch a HEADED browser (E2E_HEADED=1) under the runner. Headed is for single-suite debugging only: unset E2E_HEADED.');
    process.exit(1);
  }
  const args = browserArgs();
  const exe = browserExe();
  if (HEADED) return { headless: false, ...(exe ? { executablePath: exe } : {}), args: [...args, '--window-position=-32000,-32000', '--window-size=1280,720', '--no-startup-window-focus'] };
  return { headless: true, ...(exe ? { executablePath: exe } : GPU ? { channel: 'chromium' } : {}), args };
}

/** Every run, every page (the cursor grab came back when only headed / GPU runs had it): a page-side pointer lock that never touches the real cursor. */
export function fakePointerLock() {
  let locked = null;
  Object.defineProperty(Document.prototype, 'pointerLockElement', { get: () => locked, configurable: true });
  Element.prototype.requestPointerLock = function () {
    locked = this;
    setTimeout(() => document.dispatchEvent(new Event('pointerlockchange')), 0);
    return Promise.resolve();
  };
  Document.prototype.exitPointerLock = function () {
    locked = null;
    setTimeout(() => document.dispatchEvent(new Event('pointerlockchange')), 0);
  };
}


/** E2E_PROFILE=1: where a suite's time goes, printed when it exits: browser launch, page boot, match build (voxel + light
 * bake inside it), the first rendered frames of a match (the shaders compile there: warmup), later rendered frames, fixed
 * waits, in-page work (`stepHeadless` and the rest of `evaluate`), screenshots, and the rest. A bucket never counts inside another. */
export const PROFILE = process.env.E2E_PROFILE === '1';
const prof = { launch: 0, boot: 0, match: 0, warmup: 0, frames: 0, pauses: 0, evaluate: 0, screenshot: 0, bake: 0, step: 0, simSeconds: 0 };
let profDepth = 0;
async function timed(bucket, fn) {
  if (!PROFILE || profDepth) return fn();
  profDepth++;
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    prof[bucket] += performance.now() - t0;
    profDepth--;
  }
}
if (PROFILE) {
  process.on('exit', () => {
    const total = process.uptime() * 1000;
    const known = Object.entries(prof).reduce((a, [k, v]) => a + (k === 'bake' || k === 'step' || k === 'simSeconds' ? 0 : v), 0);
    const f = (k, v) => `${k} ${(v / 1000).toFixed(1)}s`;
    console.log(`[profile] total ${(total / 1000).toFixed(1)}s: ${Object.entries(prof).filter(([k]) => !['bake', 'step', 'simSeconds'].includes(k)).map(([k, v]) => f(k, v)).join(', ')}, ${f('other', total - known)}${prof.bake ? ` (bakes inside match: ${(prof.bake / 1000).toFixed(1)}s)` : ''}${prof.step ? ` (stepHeadless inside evaluate: ${(prof.step / 1000).toFixed(1)}s for ${prof.simSeconds.toFixed(0)} simulated s)` : ''}`);
  });
}
let warmed = true;

/** A desktop context (no touch, no mobile user agent): the game is desktop only (pad, keyboard and mouse). */
export async function launch({ url = 'http://localhost:4173/', params = '', viewport = { width: 1280, height: 640 }, args = [] } = {}) {
  // (`args`: extra Chromium switches, e.g. anim-audit's remote run keeps a background page's timers unthrottled)
  const lo = launchOptions();
  const browser = await timed('launch', () => chromium.launch({ ...lo, args: [...lo.args, ...args] }));
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  // context level: covers every page of the context, including ones a suite opens itself (ctx.newPage())
  await ctx.addInitScript(fakePointerLock);
  const { page, errors } = await openPage(ctx, url, params);
  return { browser, ctx, page, errors };
}

/** Open another page in an existing context (coop tests: pages share BroadcastChannel + IndexedDB). */
export async function openPage(ctx, url = 'http://localhost:4173/', params = '') {
  const page = await ctx.newPage();
  if (PROFILE) {
    for (const [name, bucket] of [['evaluate', 'evaluate'], ['waitForFunction', 'evaluate'], ['waitForTimeout', 'pauses'], ['screenshot', 'screenshot']]) {
      const orig = page[name].bind(page);
      page[name] = (...a) => timed(bucket, () => orig(...a));
    }
  }
  const errors = [];
  page.on('console', (m) => {
    // SwiftShader / ANGLE performance notes about its own command buffer are not the game's problems
    if (/GL Driver Message \(OpenGL, Performance/.test(m.text())) return;
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
    else if (process.env.VERBOSE || (NETSIM && /^NETSIM/.test(m.text()))) console.log(`[${m.type()}] ${m.text()}`);
  });
  if (NETSIM) await page.addInitScript(netsimProbe);
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}${process.env.STACK ? "\n" + e.stack : ""}`));
  await page.addInitScript(fakePointerLock);
  // Windows Chromium offers the OS share sheet (navigator.canShare true): the exports must take the download path in every run, never open a sheet on the PC
  await page.addInitScript(() => {
    Navigator.prototype.canShare = () => false;
  });
  // Fast-forward for a wait written as "wrap `state.fixedUpdate`, resolve when N simulated seconds passed": call `window.__ff()` right
  // after the wrapper is installed and the loop's headless stepper (`stepHeadless`) runs the steps now, until the wrapper takes itself
  // off (its own end condition, unchanged), instead of the wait costing N real seconds. The game does the same work per step (input
  // polled, sim, physics, frame update); only the rendering between steps is skipped. `max`: simulated seconds before giving up
  // (the real loop then carries on, as it always did).
  await page.addInitScript(() => {
    window.__ff = (max = 60) => {
      const st = window.__app.current;
      const wrapper = st.fixedUpdate;
      for (let i = 0, n = Math.round(max * 60); i < n && st.fixedUpdate === wrapper; i++) window.__app.loop.stepHeadless(1 / 60);
    };
  });
  // Fake standard-mapping gamepad, controllable via window.__pad.
  await page.addInitScript(() => {
    const pad = {
      id: 'Xbox Wireless Controller (STANDARD GAMEPAD)',
      index: 0,
      connected: false,
      mapping: 'standard',
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
      // (locomotion step 17) every rumble is recorded: window.__pad.effects = [{ type, strong, weak, ms, t }]
      vibrationActuator: { playEffect: async (type, p) => { window.__pad.effects.push({ type, strong: p?.strongMagnitude ?? 0, weak: p?.weakMagnitude ?? 0, ms: p?.duration ?? 0, t: performance.now() }); return 'complete'; } },
    };
    window.__pad = {
      effects: [],
      connect() {
        pad.connected = true;
      },
      disconnect() {
        pad.connected = false;
      },
      set(i, v) {
        pad.buttons[i] = { pressed: v > 0.5, touched: v > 0, value: v };
        pad.timestamp = performance.now();
      },
      axis(i, v) {
        pad.axes[i] = v;
        pad.timestamp = performance.now();
      },
    };
    navigator.getGamepads = () => [pad.connected ? pad : null, null, null, null];
  });
  // the PC renderer at Epic on headless software GL is too slow for real-time checks: tests run minimal graphics
  // unless they ask for a preset (?gfx=epic in e2e-desktop)
  const p = /(^|&)gfx=/.test(params) || /[?&]gfx=/.test(url) ? params : params ? `${params}&gfx=min` : 'gfx=min';
  // 3.2.0 speed gears: the operator spawns in gear 3 (2.0 m/s standing); suites written for the 2.x full-stick jog
  // (2.8 m/s) start in gear 4, which is that pace, unless they name a gear (`gear=none` keeps the real default)
  const g = /(^|&)gear=/.test(p) || /[?&]gear=/.test(url) ? p : `${p}&gear=4`;
  // 3.5: the parked modes and the economy are behind ?legacy=1 (`npm run e2e:legacy` sets LEGACY=1; a suite can name `legacy=1` itself)
  const q0 = process.env.LEGACY === '1' && !/(^|&)legacy=/.test(g) && !/[?&]legacy=/.test(url) ? `${g}&legacy=1` : g;
  // (locomotion step 20b, D11) E2E_NETSIM=typical: the ?net=local pages run the transport's network simulator
  const q = NETSIM && /(^|&)net=local/.test(q0) && !/(^|&)netsim=/.test(q0) ? `${q0}&netsim=${encodeURIComponent(NETSIM)}` : q0;
  await timed('boot', async () => {
  await page.goto(url + (url.includes('?') ? '&' : '?') + q);
  await page.waitForFunction(
    () => document.getElementById('boot')?.classList.contains('done') || /Failed/.test(document.getElementById('boot-status')?.textContent ?? ''),
    null,
    { timeout: 60000 },
  );
  });
  if (PROFILE) {
    // in-page `stepHeadless` time: the wrapped method reports each call (`evaluate` below it counts the same time, once)
    await page.exposeFunction('__profStep', (ms, sim) => { prof.step += ms; prof.simSeconds += sim; }).catch(() => {});
    await page.evaluate(() => {
      const proto = Object.getPrototypeOf(window.__app.loop);
      const orig = proto.stepHeadless;
      if (orig.__prof) return;
      proto.stepHeadless = function (...a) { const t = performance.now(); try { return orig.apply(this, a); } finally { window.__profStep(performance.now() - t, a[0] ?? 0); } };
      proto.stepHeadless.__prof = true;
    }).catch(() => {});
  }
  // autostart: the match itself (3.0: the voxel world builds in workers before it starts)
  if (/(^|&)autostart=/.test(params)) {
    await timed('match', () => page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 120000 }).catch(() => {}));
    warmed = false;
    if (PROFILE) prof.bake += await page.evaluate(() => { const w = window.__app?.current?.world; return (w?.lightInfo?.().ms ?? 0) + (w?.voxels?.stats?.ms ?? 0); }).catch(() => 0);
  }
  return { page, errors };
}

export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

/** Wait for n rendered frames (robust against slow software-GL frames). */
export function frames(page, n = 3) {
  const bucket = warmed ? 'frames' : 'warmup';
  warmed = true;
  return timed(bucket, () =>
    page.evaluate(
      (k) => new Promise((res) => { let c = 0; const f = () => (++c >= k ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }),
      n,
    ),
  );
}

export async function press(page, btn) {
  await page.evaluate((b) => window.__pad.set(b, 1), btn);
  await frames(page, 3);
  await page.evaluate((b) => window.__pad.set(b, 0), btn);
  await frames(page, 3);
}

export async function stick(page, axis, v) {
  await page.evaluate(([a, x]) => window.__pad.axis(a, x), [axis, v]);
  await frames(page, 3);
  await page.evaluate((a) => window.__pad.axis(a, 0), axis);
  await frames(page, 3);
}

export function focusedText(page) {
  return page.evaluate(() => document.querySelector('.focused')?.textContent?.trim() ?? '(none)');
}

/** Moves the pad focus to the visible `[data-focus]` element whose text matches `re` (grids: steps towards it). */
export async function focusTo(page, re, max = 12) {
  for (let i = 0; i < max; i++) {
    const dir = await page.evaluate((src) => {
      const r = new RegExp(src);
      const cur = document.querySelector('.focused');
      if (cur && r.test(cur.textContent ?? '')) return 'done';
      const els = Array.from(document.querySelectorAll('[data-focus]')).filter((e) => e.offsetParent && r.test(e.textContent ?? ''));
      const t = els[0];
      if (!cur || !t) return 'down';
      const a = cur.getBoundingClientRect();
      const b = t.getBoundingClientRect();
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      if (Math.abs(dy) > Math.min(a.height, b.height) / 2) return dy > 0 ? 'down' : 'up';
      return dx > 0 ? 'right' : 'left';
    }, re.source);
    if (dir === 'done') return true;
    await press(page, BTN[dir.toUpperCase()]);
  }
  return re.test(await focusedText(page));
}

export function assert(cond, msg) {
  if (!cond && NETSIM) {
    // (step 20b, D11) report mode: a check that fails under the simulator is a finding, not a stop
    netsimFails.push(msg);
    console.log('  NETSIM FAIL -', msg);
    return;
  }
  if (!cond) throw new Error('ASSERT: ' + msg);
  console.log('  ok -', msg);
}

/**
 * (locomotion step 20b, D11) `E2E_NETSIM=<preset>` (e.g. `typical`): the ?net=local pages get `&netsim=<preset>` (the
 * local transport's network conditions simulator), `assert` reports instead of stopping (REPORT mode, not a gate), and
 * every page runs `netsimProbe`. `E2E_NETSIM=off` keeps the network clean but runs the probe and report mode (the
 * baseline for the same numbers).
 */
export const NETSIM = process.env.E2E_NETSIM ?? '';
const netsimFails = [];
if (NETSIM) process.on('exit', () => console.log(`NETSIM REPORT (${NETSIM}): ${netsimFails.length} check(s) failed${netsimFails.length ? ':\n  ' + netsimFails.join('\n  ') : ''}`));

/**
 * In-page probe (init script): each frame, every drawn remote player's root (host: `net.remotes[*].avatar`, client:
 * `net.avatars`) is compared with its last frame. A pop = a frame step more than 25 cm beyond a 7 m/s pace (outside a
 * host teleport grace); clamps = the host's rubber-band count (`RemotePlayer.violations`). Logs each pop and a
 * `NETSIM-STAT` line every 5 s (pops, worst excess step, clamps, the simulator's sent / retransmitted / max delay).
 */
function netsimProbe() {
  const st = { pops: 0, worst: 0, clamps: 0 };
  window.__netsimProbe = st;
  const last = new Map();
  const vio = new Map();
  let lastT = 0;
  let statT = 0;
  const tick = (t) => {
    const dt = lastT ? (t - lastT) / 1000 : 0;
    lastT = t;
    const net = window.__app?.current?.net;
    const list = [];
    if (net?.remotes) for (const r of net.remotes.values()) list.push([r.avatar, r]);
    if (net?.avatars) for (const a of net.avatars.values()) list.push([a, null]);
    for (const [av, r] of list) {
      const p = av?.rig?.root?.position;
      if (!p) continue;
      const prev = last.get(av);
      const grace = r && r.teleportGrace > 0;
      if (prev && dt > 0 && !grace) {
        const j = Math.hypot(p.x - prev[0], p.y - prev[1], p.z - prev[2]);
        const ex = j - 7 * dt;
        if (ex > st.worst) st.worst = ex;
        if (ex > 0.25) {
          st.pops++;
          console.log(`NETSIM-POP ${r ? 'host' : 'client'} sees ${(j * 100).toFixed(0)} cm in ${(dt * 1000).toFixed(0)} ms (mode ${av.mode})`);
        }
      }
      last.set(av, [p.x, p.y, p.z]);
      if (r) {
        const v = r.violations ?? 0;
        if (v > (vio.get(r) ?? 0)) st.clamps += v - (vio.get(r) ?? 0);
        vio.set(r, v);
      }
    }
    if (t - statT > 5000) {
      statT = t;
      const s = globalThis.__netsim?.stats;
      if (list.length) console.log(`NETSIM-STAT pops ${st.pops} worst ${(st.worst * 100).toFixed(1)} cm clamps ${st.clamps}${s ? ` sent ${s.sent} retx ${s.retransmitted} maxDelay ${s.maxDelayMs.toFixed(0)} ms` : ''}`);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
