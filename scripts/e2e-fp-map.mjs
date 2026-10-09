// First Playable S1a, S1b: the Kestrel Exchange boots (`?autostart=exchange&mode=sandbox`) with all nine rooms (cable, mdf, power,
// well, switchroom, offices, servers, roof, yard), the operator in the cable room with a floor under it, a floor under the
// operator in the server hall and in the yard, and no console errors. Extended in S1c.
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
  for (const id of ['cable', 'mdf', 'power', 'well', 'switchroom', 'offices', 'servers', 'roof', 'yard']) assert(info.ids.includes(id), `room ${id} is listed (${info.ids.join(',')})`);
  assert(info.room === 'cable', `the operator stands in the cable room (${info.room})`);
  assert(info.grounded && Math.abs(info.y - -3.3) < 0.2, `a floor under the operator (y ${info.y.toFixed(2)}, grounded ${info.grounded})`);
  // teleport to the server hall (first floor) and the yard: a floor under the operator and the right room
  for (const [id, x, y, z] of [['servers', 14, 4.6, 7], ['yard', -5, 0.1, -27], ['roof', 0, 9.1, 0]]) {
    await page.evaluate(([px, py, pz]) => {
      const c = window.__app.current.player.controller;
      c.teleport(new c.pos.constructor(px, py, pz), 0);
    }, [x, y, z]);
    await frames(page, 40);
    const at = await page.evaluate(() => {
      const g = window.__app.current;
      const c = g.player.controller;
      return { room: (g.world.layout.rooms ?? [])[g.currentRoom]?.id ?? null, y: c.pos.y, grounded: c.grounded };
    });
    assert(at.room === id, `the operator is in the ${id} room (${at.room})`);
    assert(at.grounded && Math.abs(at.y - (y - 0.1)) < 0.3, `a floor under the operator in the ${id} room (y ${at.y.toFixed(2)}, grounded ${at.grounded})`);
  }
  const errs = errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e));
  assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
} catch (e) {
  console.error(e);
  failed = true;
}
await browser.close();

// Infiltration (the First Playable's mode): the mission loads the Exchange, not another map.
{
  const run = await launch({ url, params: 'autostart=exchange&mode=infiltration' });
  try {
    await run.page.waitForFunction(() => window.__app.current?.world, null, { timeout: 90000 });
    await frames(run.page, 30);
    const d0 = await run.page.evaluate(() => ({ map: window.__app.current.world.map.id, mode: window.__app.current.opts.mode }));
    assert(d0.map === 'exchange' && d0.mode === 'infiltration', `infiltration autostart loads the Exchange (${d0.map} / ${d0.mode})`);
  } catch (e) {
    console.error(e);
    failed = true;
  }
  await run.browser.close();
}

// fullbright=1 lights the map; without the flag nothing changes
for (const [params, bright] of [['', false], ['&fullbright=1', true]]) {
  const run = await launch({ url, params: 'autostart=exchange&mode=infiltration' + params });
  try {
    await run.page.waitForFunction(() => window.__app.current?.world, null, { timeout: 90000 });
    await frames(run.page, 20);
    const lv = await run.page.evaluate(() => {
      const g = window.__app.current;
      return { ambient: g.world.level.lights.ambient, light: g.lightLevel, theme: g.world.map.theme.lightLevel };
    });
    assert(bright ? lv.ambient > 0.9 && lv.theme > 0.9 : lv.ambient === 0.1 && lv.theme === 0.1, `fullbright ${bright ? 'lights' : 'is off: leaves'} the map (${JSON.stringify(lv)})`);
  } catch (e) {
    console.error(e);
    failed = true;
  }
  await run.browser.close();
}

if (failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-fp-map OK');
