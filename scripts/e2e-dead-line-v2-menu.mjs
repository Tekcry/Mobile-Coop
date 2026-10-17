// Dead Line v2 from the main menu (the path a player takes, not ?autostart): Play, the "Dead Line v2" mission card, Deploy.
// The operator must spawn on the v2 Area 1 greybox at S1, on Viaduct Road north of the railway bridge (x 5, z 52, outdoor, y 0). The older Dead Line
// card (map `dead-line`, spawns in the old lane yard far away) and the Trunk Annex card are other maps: a menu entry that loads the wrong map fails here.
import fs from 'node:fs';
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const D = JSON.parse(fs.readFileSync(new URL('../docs/design/map-dead-line-v2.json', import.meta.url), 'utf8'));
const s1 = D.spawns.find((s) => s.id === 'S1');
let failed = false;
const { browser, page, errors } = await launch({ url, params: '' });
try {
  await frames(page, 30);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^\W*Play/i.test(b.textContent.trim()))?.click());
  await frames(page, 20);
  const cards = await page.evaluate(() => [...document.querySelectorAll('.mission-card .mc-name')].map((e) => e.textContent));
  assert(cards.filter((c) => c === 'Dead Line v2').length === 1, `one "Dead Line v2" mission card (${cards.join(' | ')})`);
  assert(cards.filter((c) => c === 'Dead Line').length === 1, `the old "Dead Line" card is still there (${cards.join(' | ')})`);
  await page.evaluate(() => [...document.querySelectorAll('.mission-card')].find((c) => c.querySelector('.mc-name')?.textContent === 'Dead Line v2')?.click());
  await frames(page, 10);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Deploy')?.click());
  await page.waitForFunction(() => window.__app.current?.world, null, { timeout: 120000 });
  await frames(page, 40);
  const d = await page.evaluate(() => {
    const g = window.__app.current;
    const c = g.player.controller;
    const rooms = g.world.layout.rooms ?? [];
    return { map: g.world.map.id, mode: g.opts.mode, x: c.pos.x, y: c.pos.y, z: c.pos.z, grounded: c.grounded, room: rooms[g.currentRoom]?.id ?? null, name: g.world.map.name };
  });
  assert(d.map === 'dead-line-v2' && d.mode === 'infiltration', `the Dead Line v2 card loads the v2 map, not the old one (${d.map} / ${d.mode})`);
  assert(Math.hypot(d.x - s1.x, d.z - s1.z) < 0.8 && Math.abs(d.y) < 0.3 && d.grounded, `the operator spawns at the Area 1 start S1 (${s1.x}, ${s1.z}) on y 0 (${d.x.toFixed(2)}, ${d.y.toFixed(2)}, ${d.z.toFixed(2)})`);
  assert(d.room === 'road', `S1 is on Viaduct Road under the railway (outdoor) (${d.room})`);
  const errs = errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e));
  assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
} catch (e) {
  console.error(e);
  failed = true;
}
await browser.close();
if (failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-dead-line-v2-menu OK');
