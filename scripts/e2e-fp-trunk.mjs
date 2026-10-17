// First Playable T1: the Kestrel Trunk Annex greybox boots (`?autostart=trunk-annex&mode=infiltration`), the operator stands on a
// floor in the yard pocket, every space is walkable (teleport to each: a floor under the operator and the right room), the six
// guards spawn on their storeys and walk their master-clock loops (each of G1-G5 has moved after 10 s, the sniper holds the roof),
// the four insertions load, `&fullbright=1` lights the map (and without it nothing changes), no console errors.
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const BASE = 'autostart=trunk-annex&mode=infiltration';
let failed = false;

const info = (page) =>
  page.evaluate(() => {
    const g = window.__app.current;
    const c = g.player.controller;
    const rooms = g.world.layout.rooms ?? [];
    return { map: g.world.map.id, mode: g.opts.mode, room: rooms[g.currentRoom]?.id ?? null, x: c.pos.x, y: c.pos.y, z: c.pos.z, grounded: c.grounded, ids: rooms.map((r) => r.id) };
  });

{
  const { browser, page, errors } = await launch({ url, params: BASE });
  try {
    await page.waitForFunction(() => window.__app.current?.world, null, { timeout: 90000 });
    await frames(page, 30);
    const d = await info(page);
    // getMap() falls back to Proving Grounds for an unknown id, and a dev server on another checkout has no Annex: fail loudly
    assert(d.map === 'trunk-annex' && d.mode === 'infiltration', `autostart=trunk-annex loads the Annex (${d.map} / ${d.mode})`);
    for (const id of ['yard', 'goods', 'brk', 'hall', 'gen', 'fs', 'cage', 'test', 'ctl', 'gal', 'roof', 'fsR']) assert(d.ids.includes(id), `room ${id} is listed (${d.ids.join(',')})`);
    assert(d.room === 'yard' && d.grounded && Math.abs(d.y) < 0.2, `the operator stands on the yard floor (${d.room}, y ${d.y.toFixed(2)}, grounded ${d.grounded})`);

    // every space: a floor under the operator and the right room tag (stair spaces: any foot of the flight)
    const spots = [
      ['goods', -12, 0.1, -2], ['brk', -12, 0.1, 9], ['hall', 0, 0.1, 3], ['gen', 12, 0.1, 1], ['cage', 12, 0.1, 9],
      ['test', -12, 3.4, -2], ['ctl', -12, 3.4, 9], ['gal', -4.2, 3.4, 6], ['roof', 0, 6.7, -3], ['yard', -5, 0.1, -10], ['fs', 15.5, 0.1, -6.5],
    ];
    for (const [id, x, y, z] of spots) {
      await page.evaluate(([px, py, pz]) => {
        const c = window.__app.current.player.controller;
        c.teleport(new c.pos.constructor(px, py, pz), 0);
      }, [x, y, z]);
      await frames(page, 40);
      const at = await info(page);
      assert(at.room === id, `the operator is in the ${id} room (${at.room})`);
      assert(at.grounded && Math.abs(at.y - (y - 0.1)) < 1.5, `a floor under the operator in the ${id} room (y ${at.y.toFixed(2)}, grounded ${at.grounded})`);
    }

    // six guards on their storeys; advance the sim 40 s and check G1-G5 moved
    await page.evaluate(() => {
      const a = window.__app;
      const g = a.current;
      a.loop.manual = true;
      g.target.health.invulnerable = true;
      const c = g.player.controller;
      c.teleport(new c.pos.constructor(-16, 0.1, -12.5), 0);
    });
    await frames(page, 20);
    const before = await page.evaluate(() => {
      const em = window.__app.current.enemyMgr;
      return em.enemies.map((e) => ({ kind: e.def.kind, x: e.pos.x, y: e.pos.y, z: e.pos.z, alive: e.alive }));
    });
    assert(before.length === 6, `six guards spawn (${before.length})`);
    const kinds = before.map((e) => e.kind).sort().join(',');
    assert(kinds === 'grunt,grunt,grunt,heavy,officer,sniper', `three grunts, an officer, a heavy and a sniper (${kinds})`);
    const sniper = before.find((e) => e.kind === 'sniper');
    const officer = before.find((e) => e.kind === 'officer');
    assert(sniper.y > 6 && officer.y > 3, `the sniper is on the roof and the officer upstairs (${sniper.y.toFixed(1)}, ${officer.y.toFixed(1)})`);
    // (the clock already ran while the operator was teleported round, so a guard may be mid-pause: sample a whole 40 s loop)
    const moved = before.map(() => 0);
    let after = [];
    for (let k = 0; k < 20; k++) {
      await page.evaluate(() => window.__app.loop.stepHeadless(2, 60));
      after = await page.evaluate(() => window.__app.current.enemyMgr.enemies.map((e) => ({ kind: e.def.kind, x: e.pos.x, y: e.pos.y, z: e.pos.z, alive: e.alive, level: e.level })));
      after.forEach((a, i) => (moved[i] = Math.max(moved[i], Math.hypot(a.x - before[i].x, a.z - before[i].z))));
    }
    before.forEach((b, i) => {
      if (b.kind === 'sniper') assert(moved[i] < 1.5 && after[i].alive, 'the sniper holds the roof post');
      else assert(moved[i] > 0.5, `guard ${i} (${b.kind}) moved within a 40 s loop (${moved[i].toFixed(2)} m)`);
    });
    assert(after.every((e) => e.level === 'unaware'), `nobody was alerted by a quiet 40 s (${after.map((e) => e.level).join(',')})`);
    const errs = errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e));
    assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
  } catch (e) {
    console.error(e);
    failed = true;
  }
  await browser.close();
}

// the four insertions (co-op spawn points and solo starts): the operator starts on a floor in the pocket
for (const [ins, x, z] of [['s1', -17.5, -12.5], ['s2', -16, -12.5], ['s3', -14.5, -12.5], ['s4', -16.5, -11]]) {
  const run = await launch({ url, params: `${BASE}&insertion=${ins}` });
  try {
    await run.page.waitForFunction(() => window.__app.current?.world, null, { timeout: 90000 });
    await frames(run.page, 30);
    const d = await info(run.page);
    assert(Math.hypot(d.x - x, d.z - z) < 0.6 && d.grounded, `insertion ${ins} starts at ${x},${z} on a floor (${d.x.toFixed(2)},${d.z.toFixed(2)}, grounded ${d.grounded})`);
  } catch (e) {
    console.error(e);
    failed = true;
  }
  await run.browser.close();
}

// fullbright=1 lights the map; without the flag nothing changes
for (const [params, bright] of [['', false], ['&fullbright=1', true]]) {
  const run = await launch({ url, params: BASE + params });
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

// sandbox boots too (Free Roam: the map alone, no guards)
{
  const run = await launch({ url, params: 'autostart=trunk-annex&mode=sandbox&fullbright=1' });
  try {
    await run.page.waitForFunction(() => window.__app.current?.world, null, { timeout: 90000 });
    await frames(run.page, 20);
    const d = await info(run.page);
    assert(d.map === 'trunk-annex' && d.mode === 'sandbox', `sandbox autostart loads the Annex (${d.map} / ${d.mode})`);
    const errs = run.errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e));
    assert(errs.length === 0, `no console errors in sandbox (${errs.slice(0, 3).join(' | ')})`);
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
console.log('e2e-fp-trunk OK');
