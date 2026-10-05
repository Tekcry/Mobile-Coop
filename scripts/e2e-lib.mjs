// Shared helpers for headless end-to-end tests (mobile-emulated Chromium + fake gamepad).
import { chromium, devices } from 'playwright-core';
import { existsSync } from 'node:fs';

export async function launch({ url = 'http://localhost:4173/', params = '', touch = true } = {}) {
  const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(existsSync);
  const browser = await chromium.launch({
    executablePath: exe,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
  const dev = devices['Pixel 7 landscape'] ?? devices['Pixel 5 landscape'];
  const ctx = await browser.newContext({ ...(touch ? { ...dev } : { viewport: { width: 1280, height: 640 } }), acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
    else if (process.env.VERBOSE) console.log(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
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
  await page.goto(url + (url.includes('?') ? '&' : '?') + params);
  await page.waitForFunction(
    () => document.getElementById('boot')?.classList.contains('done') || /Failed/.test(document.getElementById('boot-status')?.textContent ?? ''),
    null,
    { timeout: 60000 },
  );
  return { browser, ctx, page, errors };
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
