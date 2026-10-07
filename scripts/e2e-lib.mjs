// Shared helpers for headless end-to-end tests (mobile-emulated Chromium + fake gamepad).
import { chromium, devices } from 'playwright-core';
import { existsSync } from 'node:fs';

export async function launch({ url = 'http://localhost:4173/', params = '', touch = true, viewport = { width: 1280, height: 640 } } = {}) {
  const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(existsSync);
  const browser = await chromium.launch({
    executablePath: exe,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
  const dev = devices['Pixel 7 landscape'] ?? devices['Pixel 5 landscape'];
  const ctx = await browser.newContext({ ...(touch ? { ...dev } : { viewport }), acceptDownloads: true });
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
  await page.goto(url + (url.includes('?') ? '&' : '?') + p);
  await page.waitForFunction(
    () => document.getElementById('boot')?.classList.contains('done') || /Failed/.test(document.getElementById('boot-status')?.textContent ?? ''),
    null,
    { timeout: 60000 },
  );
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
