// Menu UI screenshots for review (menu-ui slices 1 and 2): node scripts/menu-shots.mjs [outDir]
// Needs a server on E2E_PORT (default 4173) serving dist/, e.g. `node node_modules/vite/bin/vite.js preview --port 4191
// --strictPort --host 127.0.0.1`. 1920 x 1080 PNGs. Software GL is a layout check, not a visual quality result.
import { launch, frames } from './e2e-lib.mjs';
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
  await G(() => window.__app.input.setMode('kbm'));
  await frames(page, 90);
  await shot('title');

  await G(() => window.__app.screens.top.continue());
  await page.waitForSelector('.main-menu:not([hidden]) .ms-item.focused');
  await shot('main-first-kbm');

  for (let i = 0; i < 4; i++) await G(() => window.__app.nav.move('down'));
  await shot('main-lower-kbm');
  const kbm = await legendBoxes();

  await G(() => window.__app.input.setMode('gamepad'));
  await shot('main-lower-pad');
  const pad = await legendBoxes();
  const moved = kbm.filter((b, i) => b !== pad[i]).length;
  console.log(`legend and items keep their boxes across keyboard -> pad: ${moved === 0 ? 'yes' : `no (${moved} moved)`}`);

  // slice 2: settings tabs, a row with its description, the remap screen and a capture in progress
  await G(() => window.__app.input.setMode('kbm'));
  await G(() => [...document.querySelectorAll('.main-menu .ms-item')].find((b) => b.dataset.key === 'settings').click());
  await page.waitForSelector('.settings-screen');
  await shot('settings-controls', 'slice2');
  for (let i = 0; i < 12 && (await G(() => window.__app.nav.focused?.dataset.key)) !== 'look-sensitivity-horizontal'; i++) await G(() => window.__app.nav.move('down'));
  await shot('settings-row-desc', 'slice2');
  for (const t of ['video', 'access', 'data']) {
    await G((id) => document.querySelector(`.settings-screen .tab[data-tab="${id}"]`).click(), t);
    await shot(`settings-${t}`, 'slice2');
  }
  await G(() => document.querySelector('.settings-screen .tab[data-tab="controls"]').click());
  await G(() => [...document.querySelectorAll('.settings-screen .tab-panel.active .btn')].find((b) => /Remap controls/.test(b.textContent)).click());
  await page.waitForSelector('.controls-screen');
  await shot('remap-kbm', 'slice2');
  await G(() => window.__app.input.setMode('gamepad'));
  await G(() => document.querySelector('.controls-screen .tab[data-tab="pad"]').click());
  await shot('remap-pad', 'slice2');
  await G(() => document.querySelector('.controls-screen .tab-panel.active .pad-key[data-bind="reload:0"]').click());
  await shot('remap-capture', 'slice2');
  await G(() => window.__app.input.gamepad.cancelCapture());
  console.log(errors.length ? errors.join('\n') : 'no console errors');
} finally {
  await browser.close();
}
