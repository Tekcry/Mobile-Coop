// slice 4 shots only: missions, briefing, issued kit, free roam. node scripts/archive/menu-shots4.mjs [outDir]
import { launch, frames } from '../e2e-lib.mjs';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'docs/menu-ui/shots';
mkdirSync(out, { recursive: true });
const url = process.env.URL ?? `http://127.0.0.1:${process.env.E2E_PORT ?? 4173}/`;
const { browser, page } = await launch({ url, viewport: { width: 1920, height: 1080 } });
const G = (f, a) => page.evaluate(f, a);
const shot = async (name) => {
  await frames(page, 20);
  await page.screenshot({ path: `${out}/slice4-${name}.png` });
  console.log(`saved ${out}/slice4-${name}.png`);
};
const open = async (key, sel) => {
  await G((k) => document.querySelector(`.main-menu [data-key="${k}"]`).click(), key);
  await page.waitForSelector(sel);
};
try {
  await page.waitForSelector('.main-menu:not([hidden]) .ms-item.focused');
  await open('missions', '.missions-screen .ms-item');
  await G(() => window.__app.nav.focus(document.querySelectorAll('.missions-screen .ms-item')[1]));
  await shot('missions');
  await G(() => document.querySelectorAll('.missions-screen .ms-item')[1].click());
  await page.waitForSelector('.briefing-screen');
  await G(() => window.__app.nav.focus(document.querySelector('.briefing-screen [data-key="difficulty"]')));
  await shot('briefing');
  await G(() => window.__app.screens.top.onAlt());
  await page.waitForSelector('.kit-screen');
  await shot('kit');
  await G(() => { while (!window.__app.screens.top.el.classList.contains('main-menu')) window.__app.screens.top.manager.back(window.__app.screens.top); });
  await open('freeroam', '.freeroam-screen .ms-item');
  await shot('freeroam');
} finally {
  await browser.close();
}
process.exit(0);
