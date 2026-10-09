// First Playable S1a: the Kestrel Exchange boots (`?autostart=exchange&mode=sandbox`) with the rooms cable, mdf, power and
// well, the operator in the cable room with a floor under it, and no console errors. Extended in S1b and S1c.
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=exchange&mode=sandbox' });
let failed = false;
try {
  await page.waitForFunction(() => window.__app.current?.world, null, { timeout: 90000 });
  await frames(page, 30);
  const info = await page.evaluate(() => {
    const g = window.__app.current;
    const c = g.player.controller;
    const rooms = g.world.layout.rooms ?? [];
    return {
      map: g.world.map.id,
      ids: rooms.map((r) => r.id),
      room: rooms[g.currentRoom]?.id ?? null,
      x: c.pos.x, y: c.pos.y, z: c.pos.z, grounded: c.grounded,
    };
  });
  // getMap() falls back to Proving Grounds for an unknown id, and a dev server on another checkout has no Exchange: fail loudly
  assert(info.map === 'exchange', `autostart=exchange loads the Exchange, not ${info.map}`);
  for (const id of ['cable', 'mdf', 'power', 'well']) assert(info.ids.includes(id), `room ${id} is listed (${info.ids.join(',')})`);
  assert(info.room === 'cable', `the operator stands in the cable room (${info.room})`);
  assert(info.grounded && Math.abs(info.y - -3.3) < 0.2, `a floor under the operator (y ${info.y.toFixed(2)}, grounded ${info.grounded})`);
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
console.log('e2e-fp-map OK');
