// Sector Ops (feature/sector-ops slice 2): one solo walk through every Warehouse sector, objective then exit, to the
// result (a ghost run), and an alarm with its reinforcements and a kill that breaks the ghost.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
const all = [];
async function run(params, fn) {
  const { browser, page, errors } = await launch({ url, params });
  const G = (f, a) => page.evaluate(f, a);
  // headless fast-forward (no rendering), in chunks so the page stays responsive
  const sim = async (s) => { for (let t = 0; t < s; t += 0.5) await G((d) => window.__app.loop.stepHeadless(d), Math.min(0.5, s - t)); await frames(page, 1); };
  try {
    await G(() => window.__pad.connect());
    await press(page, BTN.LS);
    await fn({ page, G, sim });
  } catch (e) {
    failed = true;
    console.error(String(e));
    await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-sectorops-fail.png' });
  } finally {
    all.push(...errors);
    await browser.close();
  }
}

// (sector-ops slice 2) Sector Ops on the Warehouse: one solo walk through every sector, objective then exit, to the
// result; the AI and the cameras are held still so the walk is a ghost run (no kills, never spotted)
console.log('sector ops: every sector, ghost');
await run('autostart=warehouseOps&mode=sector', async ({ page, G, sim }) => {
  await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
  await sim(0.5);
  const defs = await G(() => window.__app.current.world.map.sectors.map((s) => ({ id: s.id, kind: s.objective.kind, exit: s.exit.box })));
  assert(defs.length >= 3, `the Warehouse has sectors (${defs.length})`);
  const d0 = await G(() => window.__sector.debug());
  assert(d0.index === 0 && d0.phase === 'objective', `the run starts on sector 1's objective (${JSON.stringify(d0)})`);
  const alive0 = await G(() => window.__app.current.enemyMgr.alive);
  assert(alive0 > 0 && alive0 <= 3, `only sector 1's guards are in (${alive0})`);
  for (let i = 0; i < defs.length; i++) {
    const s = defs[i];
    // the exit is shut until the objective is done
    await G((b) => { const g = window.__app.current; const P = g.player.position.constructor; g.player.controller.teleport(new P((b[0] + b[2]) / 2, 0, (b[1] + b[3]) / 2), 0); }, s.exit);
    await sim(1);
    assert((await G(() => window.__sector.debug().index)) === i, `sector ${i + 1}: the exit does nothing before the objective`);
    await G((id) => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === `${id}-obj`); const p = it.pos.clone(); p.x += 0.9; g.player.controller.teleport(p, 0); }, s.id);
    await sim(0.4);
    if (s.kind === 'hack') {
      await G(() => window.__pad.set(0, 1));
      await sim(3.4);
      await G(() => window.__pad.set(0, 0));
    } else {
      await press(page, BTN.A);
      if (s.kind === 'download') await sim(10.5);
    }
    await sim(0.3);
    const ph = await G(() => window.__sector.debug().phase);
    assert(ph === 'exit', `sector ${i + 1} (${s.id}): the ${s.kind} opens the exit (${ph})`);
    await G((b) => { const g = window.__app.current; const P = g.player.position.constructor; g.player.controller.teleport(new P((b[0] + b[2]) / 2, 0, (b[1] + b[3]) / 2), 0); }, s.exit);
    await sim(1);
    const d = await G(() => window.__sector.debug());
    if (i + 1 < defs.length) assert(d.index === i + 1 && d.phase === 'objective', `sector ${i + 1}: the exit starts sector ${i + 2} (${d.id})`);
    else assert(d.phase === 'done', 'the last exit ends the run');
  }
  const alive = await G(() => window.__app.current.enemyMgr.alive);
  assert(alive <= 12, `every sector's guards fit the live cap (${alive})`);
  await sim(6);
  await page.waitForSelector('.results-screen', { timeout: 15000 });
  const res = await G(() => ({ t: document.querySelector('.results-title')?.textContent, s: document.querySelector('.results-sub')?.textContent ?? '' }));
  assert(res.t === 'VICTORY' && /Time \d+:\d\d/.test(res.s) && /Kills 0/.test(res.s) && /Spotted 0/.test(res.s) && /GHOST/.test(res.s), `the result: time, kills, spotted, Ghost ("${res.s}")`);
});

console.log('sector ops: alarm and no ghost');
await run('autostart=warehouseOps&mode=sector', async ({ G, sim }) => {
  await G(() => { window.__app.current.target.damageMul = 0; });
  await sim(0.5);
  const a = await G(() => { const m = window.__sector; m.onAlarm(); return m.debug(); });
  assert(a.stage === 1 && a.reinforced === 2, `an alarm raises the stage and sends guards in (${JSON.stringify(a)})`);
  await sim(1);
  const hunting = await G(() => window.__app.current.enemyMgr.enemies.filter((e) => e.alive && e.alerted).length);
  assert(hunting >= 2, `the reinforcements come in hunting (${hunting})`);
  const k = await G(() => { const g = window.__app.current; const e = g.enemyMgr.enemies.find((q) => q.alive); e.applyDamage({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: 'head', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 }); return window.__sector.debug(); });
  assert(k.ghost === false && /Kills 1/.test(k.line), `a kill breaks the ghost (${k.line})`);
});

console.log(all.length ? 'console problems:\n' + all.join('\n') : 'no console errors');
process.exit(failed || all.length ? 1 : 0);
