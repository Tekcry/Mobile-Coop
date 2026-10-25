// slice 3 shots only (see menu-shots.mjs for 1 and 2)
// Menu UI screenshots for review (menu-ui slices 1 and 2): node scripts/menu-shots.mjs [outDir]
// Needs a server on E2E_PORT (default 4173) serving dist/, e.g. `node node_modules/vite/bin/vite.js preview --port 4191
// --strictPort --host 127.0.0.1`. 1920 x 1080 PNGs. Software GL is a layout check, not a visual quality result.
import { launch, frames } from '../e2e-lib.mjs';
import { hostAndJoin } from '../e2e-net-lib.mjs';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'docs/menu-ui/shots';
mkdirSync(out, { recursive: true });
const url = process.env.URL ?? `http://127.0.0.1:${process.env.E2E_PORT ?? 4173}/`;
const { browser, page, errors } = await launch({ url, params: 'title=1', viewport: { width: 1920, height: 1080 } });
const G = (f, a) => page.evaluate(f, a);
const shot = async (name, slice = 'slice1') => {
  await frames(page, 20);
  await page.screenshot({ path: `${out}/${slice}-${name}.png` });
  console.log(`saved ${out}/${slice}-${name}.png`);
};
const legendBoxes = () =>
  G(() => [...document.querySelectorAll('.main-menu .ms-lg, .main-menu .ms-item')].map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10).join(','); }));

try {
  await page.waitForSelector('.title-screen', { timeout: 60000 });
  // (menu-notes slice 4a) the title ignores continue() until the load gate opens (#boot.done)
  await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 120000 });
  await G(() => window.__app.screens.top.continue());
  await page.waitForSelector('.main-menu:not([hidden]) .ms-item.focused');
  // slice 3: co-op root, join with the on-screen keyboard (pad), then the lobby as host and client, an error dialog
  for (let i = 0; i < 4 && !(await G(() => window.__app.screens.top?.el.classList.contains('main-menu'))); i++) await G(() => window.__app.screens.top.manager.back(window.__app.screens.top));
  await page.waitForSelector('.main-menu:not([hidden])');
  await G(() => [...document.querySelectorAll('.main-menu .ms-item')].find((b) => b.dataset.key === 'coop').click());
  await page.waitForSelector('.coop-screen .ms-item');
  await shot('coop-root', 'slice3');
  await G(() => window.__app.input.setMode('gamepad'));
  await G(() => document.querySelector('.coop-screen [data-key="join"]').click());
  await page.waitForSelector('.join-screen .osk');
  await G(() => {
    for (const k of ['K', 'H', '7']) document.querySelector('.join-screen .osk [data-key="k-' + k + '"]').click();
  });
  await shot('join-osk', 'slice3');
  await browser.close();

  const net = await hostAndJoin(url, 2, { viewport: { width: 1920, height: 1080 } });
  try {
    for (const P of net.pages) await P.evaluate(() => window.__app.input.setMode('gamepad'));
    const sh = async (P, name) => {
      await frames(P, 20);
      await P.screenshot({ path: out + '/slice3-' + name + '.png' });
      console.log('saved ' + out + '/slice3-' + name + '.png');
    };
    await net.B.evaluate(() => window.__coop.session.setReady(true));
    await frames(net.A, 30);
    await sh(net.A, 'lobby-host');
    await sh(net.B, 'lobby-client');
    await net.A.evaluate(() => window.__coop.leave(false));
    await net.B.waitForSelector('.dialog-title', { timeout: 8000 });
    await sh(net.B, 'error-dialog');
  } finally {
    await net.browser.close();
  }
  process.exit(0);
} finally {
  await browser.close();
}
