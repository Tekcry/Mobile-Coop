// Menu UI screenshots for review (menu-ui slice 1): node scripts/menu-shots.mjs [outDir]
// Needs a server on E2E_PORT (default 4173) serving dist/, e.g. `node node_modules/vite/bin/vite.js preview --port 4191
// --strictPort --host 127.0.0.1`. 1920 x 1080 PNGs. Software GL is a layout check, not a visual quality result.
import { launch, frames } from './e2e-lib.mjs';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'docs/menu-ui/shots';
mkdirSync(out, { recursive: true });
const url = process.env.URL ?? `http://127.0.0.1:${process.env.E2E_PORT ?? 4173}/`;
const { browser, page, errors } = await launch({ url, params: 'title=1', viewport: { width: 1920, height: 1080 } });
const G = (f, a) => page.evaluate(f, a);
const shot = async (name) => {
  await frames(page, 20);
  await page.screenshot({ path: `${out}/slice1-${name}.png` });
  console.log(`saved ${out}/slice1-${name}.png`);
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
  console.log(errors.length ? errors.join('\n') : 'no console errors');
} finally {
  await browser.close();
}
