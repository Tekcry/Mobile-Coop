// Shared helpers for headless end-to-end tests (mobile-emulated Chromium + fake gamepad).
import { chromium, devices } from 'playwright-core';
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
  if (!GPU) return ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...base];
  const angle = process.platform === 'win32' ? 'd3d11' : process.platform === 'darwin' ? 'metal' : 'gl';
  return ['--use-gl=angle', `--use-angle=${angle}`, '--enable-gpu-rasterization', ...base];
}

/** Always headless: no window on the desktop and no real pointer lock. GPU runs use Chromium's new headless mode
 * (full chrome, ANGLE D3D11). E2E_HEADED=1 (debugging only) opens a window parked off-screen and fakes pointer lock. */
export const HEADED = process.env.E2E_HEADED === '1';
export function launchOptions() {
  const args = browserArgs();
  const exe = browserExe();
  if (HEADED) return { headless: false, ...(exe ? { executablePath: exe } : {}), args: [...args, '--window-position=-32000,-32000', '--window-size=1280,720', '--no-startup-window-focus'] };
  return { headless: true, ...(exe ? { executablePath: exe } : GPU ? { channel: 'chromium' } : {}), args };
}

/** Headed runs only: a page-side pointer lock that never touches the real cursor. */
function fakePointerLock() {
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

export async function launch({ url = 'http://localhost:4173/', params = '', touch = true, viewport = { width: 1280, height: 640 }, touchViewport = null } = {}) {
  const browser = await chromium.launch(launchOptions());
  const dev = devices['Pixel 7 landscape'] ?? devices['Pixel 5 landscape'];
  // (`touchViewport`: the phone held another way, e.g. upright)
  const ctx = await browser.newContext({ ...(touch ? { ...dev, ...(touchViewport ? { viewport: touchViewport, screen: touchViewport } : {}) } : { viewport }), acceptDownloads: true });
  const { page, errors } = await openPage(ctx, url, params);
  return { browser, ctx, page, errors };
}

/** Open another page in an existing context (coop tests: pages share BroadcastChannel + IndexedDB). */
export async function openPage(ctx, url = 'http://localhost:4173/', params = '') {
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    // SwiftShader / ANGLE performance notes about its own command buffer are not the game's problems
    if (/GL Driver Message \(OpenGL, Performance/.test(m.text())) return;
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
    else if (process.env.VERBOSE) console.log(`[${m.type()}] ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}${process.env.STACK ? "\n" + e.stack : ""}`));
  if (HEADED) await page.addInitScript(fakePointerLock);
  // Windows Chromium offers the OS share sheet (navigator.canShare true): the exports must take the download path in every run, never open a sheet on the PC
  await page.addInitScript(() => {
    Navigator.prototype.canShare = () => false;
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
      vibrationActuator: { playEffect: async () => 'complete' },
    };
    window.__pad = {
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
  const q = process.env.LEGACY === '1' && !/(^|&)legacy=/.test(g) && !/[?&]legacy=/.test(url) ? `${g}&legacy=1` : g;
  await page.goto(url + (url.includes('?') ? '&' : '?') + q);
  await page.waitForFunction(
    () => document.getElementById('boot')?.classList.contains('done') || /Failed/.test(document.getElementById('boot-status')?.textContent ?? ''),
    null,
    { timeout: 60000 },
  );
  // autostart: the match itself (3.0: the voxel world builds in workers before it starts)
  if (/(^|&)autostart=/.test(params)) await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 120000 }).catch(() => {});
  return { page, errors };
}

export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

/** Wait for n rendered frames (robust against slow software-GL frames). */
export function frames(page, n = 3) {
  return page.evaluate(
    (k) => new Promise((res) => { let c = 0; const f = () => (++c >= k ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }),
    n,
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
  if (!cond) throw new Error('ASSERT: ' + msg);
  console.log('  ok -', msg);
}

/** Multi-touch via CDP. points: [{x,y,id}] */
export async function touch(page, type, points) {
  const cdp = page.__cdp ?? (page.__cdp = await page.context().newCDPSession(page));
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id ?? 0, radiusX: 5, radiusY: 5, force: 1 })),
  });
}

export async function drag(page, from, to, steps = 6, id = 0) {
  await touch(page, 'touchStart', [{ ...from, id }]);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await touch(page, 'touchMove', [{ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, id }]);
    await frames(page, 1);
  }
  return async () => touch(page, 'touchEnd', []);
}
