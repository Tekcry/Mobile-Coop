// slice 5 shots only (pause, objectives, quit confirm, results): node scripts/archive/menu-shots5.mjs [outDir]
// Needs a server on E2E_PORT serving dist/ (`node node_modules/vite/bin/vite.js preview --port 4191 --strictPort --host 127.0.0.1`).
// 1920 x 1080 PNGs, software GL: a layout check, not a visual quality result (the blur needs the GPU run).
import { launch, frames } from '../e2e-lib.mjs';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'docs/menu-ui/shots';
mkdirSync(out, { recursive: true });
const url = process.env.URL ?? `http://127.0.0.1:${process.env.E2E_PORT ?? 4173}/`;
const { browser, page, errors } = await launch({ url, params: 'autostart=warehouse&mode=infiltration&mission=warehouse-courier&insertion=lot', viewport: { width: 1920, height: 1080 } });
const G = (f, a) => page.evaluate(f, a);
const shot = async (name) => {
  await frames(page, 30);
  await page.screenshot({ path: `${out}/slice5-${name}.png` });
  console.log(`saved ${out}/slice5-${name}.png`);
};
try {
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 90000 });
  await frames(page, 60);
  await G(() => window.__app.input.setMode('kbm'));
  await G(() => window.__app.current.pause());
  await page.waitForSelector('.pause-screen');
  await frames(page, 40);
  await shot('pause');
  await G(() => document.querySelector('.pause-screen [data-key="objectives"]').click());
  await page.waitForSelector('.objectives-screen');
  await shot('objectives');
  await G(() => window.__app.screens.top.manager.back(window.__app.screens.top));
  await page.waitForSelector('.pause-screen');
  await G(() => document.querySelector('.pause-screen [data-key="quit"]').click());
  await page.waitForSelector('.dialog');
  await shot('quit-confirm');
  await G(() => window.__app.screens.top.onBack());
  await G(() => window.__app.screens.top.resume());
  await frames(page, 10);
  // results: a finished mission
  await G(() => {
    const g = window.__app.current;
    g.stats.missionId = 'warehouse-courier';
    g.stats.rating = 2;
    g.stats.bonuses = ['No alarms'];
    g.stats.objectives = 4;
    g.stats.kills = 0;
    g.endSession(true, 'Warehouse Courier complete');
  });
  await page.waitForSelector('.results-screen', { timeout: 15000 });
  await shot('results');
} catch (e) {
  console.error('FAILED', e);
  process.exitCode = 1;
}
if (errors.length) console.log('page errors:', errors.slice(0, 5));
await browser.close();
