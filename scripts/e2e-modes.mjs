// Game modes: wave progression + game over + retry, mission objectives to victory, enemy types, ragdolls.
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
    await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-modes-fail.png' });
  } finally {
    all.push(...errors);
    await browser.close();
  }
}

console.log('wave survival');
await run('autostart=warehouse&mode=wave', async ({ page, G, sim }) => {
  await G(() => { window.__app.current.target.damageMul = 0; });
  await sim(9);
  const alive = await G(() => window.__app.current.enemyMgr.alive);
  assert(alive > 0, `wave 1 spawns enemies (${alive} alive)`);
  // kill everything as it spawns until the wave clears
  let maxRag = 0;
  for (let i = 0; i < 40; i++) {
    if (i > 0) maxRag = Math.max(maxRag, await G(() => window.__app.current.enemyMgr.bodies.filter((b) => b.simulating).length));
    const done = await G((i) => { const g = window.__app.current; for (const e of [...g.enemyMgr.enemies]) if (e.alive) e.applyDamage({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: i % 2 ? 'head' : 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 5 }); return g.mode.wave >= 2; }, i);
    await sim(0.1);
    maxRag = Math.max(maxRag, await G(() => window.__app.current.enemyMgr.bodies.filter((b) => b.simulating).length));
    if (done) break;
    await sim(1);
  }
  const st = await G(() => ({ wave: window.__app.current.mode.wave, waves: window.__app.current.stats.waves, kills: window.__app.current.stats.kills, score: window.__app.current.stats.score }));
  assert(st.waves >= 1 && st.kills >= 6, `wave 1 cleared, bonus awarded (${JSON.stringify(st)})`);
  assert(maxRag > 0 && maxRag <= 4, `deaths spawn physics ragdolls within budget (peak ${maxRag})`);
  // die -> results
  await G(() => { const g = window.__app.current; g.target.damageMul = 1; g.target.applyDamage({ amount: 9999, point: g.player.position.clone(), dir: g.player.position.clone(), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'x', sourcePos: g.player.position.clone(), impulse: 0 }); });
  await page.waitForSelector('.results-screen', { timeout: 15000 });
  const title = await G(() => document.querySelector('.results-title')?.textContent);
  assert(title === 'DEFEAT', 'death ends the run with results');
  await press(page, BTN.A);
  await page.waitForFunction(() => !document.querySelector('.results-screen') && window.__app.current?.mode?.wave === 0, null, { timeout: 30000 });
  assert(true, 'Play again (A) restarts the mode');
});

console.log('mission');
await run('autostart=warehouse&mode=mission', async ({ page, G, sim }) => {
  await G(() => { window.__app.current.target.damageMul = 0; });
  await sim(0.5);
  const n = await G(() => window.__app.current.enemyMgr.alive);
  assert(n >= 10, `squads are pre-placed (${n})`);
  const idle = await G(() => window.__app.current.enemyMgr.enemies.filter((e) => !e.alerted).length);
  assert(idle > 0, `pre-placed squads start unaware (${idle} idle)`);
  const go = (id) => G((id) => { const g = window.__app.current; const it = g.interactables.items.find((i) => i.id === id); const p = it.pos.clone(); p.x += 0.9; g.player.controller.teleport(p, 0); }, id);
  for (const t of ['termA', 'termB']) {
    await go(t);
    await sim(0.3);
    const prompt = await G(() => document.querySelector('.hud-interact')?.textContent ?? '');
    assert(/Hack terminal/.test(prompt), `interact prompt near ${t} ("${prompt.trim()}")`);
    await G(() => window.__pad.set(3, 1));
    await sim(3.4);
    await G(() => window.__pad.set(3, 0));
    await sim(0.2);
    assert(await G((t) => window.__app.current.interactables.items.find((i) => i.id === t).done, t), `holding Y hacks ${t}`);
  }
  await go('cache');
  await sim(0.4);
  await press(page, BTN.Y);
  await sim(0.3);
  assert(await G(() => window.__app.current.interactables.items.find((i) => i.id === 'cache').done), 'Y grabs the intel');
  const obj = await G(() => document.querySelector('.hud-objective')?.textContent);
  assert(/extraction/i.test(obj), `objective advances to extraction ("${obj}")`);
  await G(() => { const g = window.__app.current; const it = g.interactables.items.find((i) => i.id === 'extract'); g.player.controller.teleport(it.pos.clone(), 0); });
  await sim(19);
  await page.waitForSelector('.results-screen', { timeout: 15000 });
  assert((await G(() => document.querySelector('.results-title')?.textContent)) === 'VICTORY', 'holding extraction wins the mission');
  const objectives = await G(() => document.querySelector('.stat-grid')?.textContent ?? '');
  assert(/Objectives4/.test(objectives), `results show 4 objectives (${objectives})`);
  await press(page, BTN.B);
  await page.waitForSelector('.main-menu', { timeout: 15000 });
  assert(true, 'B on results returns to the main menu');
});

console.log('enemy types');
await run('autostart=proving&mode=wave', async ({ G, sim }) => {
  await sim(0.3);
  const r = await G(() => { const g = window.__app.current; const P = g.player.position; const V = P.constructor;
    g.enemyMgr.spawn('runner', new V(P.x + 4, 0, P.z + 4), true);
    g.enemyMgr.spawn('heavy', new V(P.x - 10, 0, P.z + 6), true);
    return g.enemyMgr.alive; });
  assert(r >= 2, 'runner and heavy spawn');
  const hp0 = await G(() => window.__app.current.target.health.hp + window.__app.current.target.health.shield);
  await sim(4);
  const hp1 = await G(() => window.__app.current.target.health.hp + window.__app.current.target.health.shield);
  assert(hp1 < hp0, `runner closes in and deals melee damage (${hp0} -> ${hp1.toFixed(0)})`);
  // plates in front, an exposed back (a round from in front travels against the facing)
  const heavy = await G(() => {
    const e = window.__app.current.enemyMgr.enemies.find((q) => q.def.kind === 'heavy');
    const V = e.pos.constructor;
    const hit = (s) => { const h0 = e.health.hp; e.applyDamage({ amount: 40, point: e.pos.clone(), dir: new V(Math.sin(e.yaw) * s, 0, Math.cos(e.yaw) * s), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: e.pos.clone(), impulse: 0 }); return h0 - e.health.hp; };
    return [hit(-1), hit(1)];
  });
  assert(heavy[0] < 40 && heavy[1] > 40, `heavy armour: a frontal round is reduced, one in the back is not (${heavy[0]} / ${heavy[1]})`);
});

console.log(all.length ? 'console problems:\n' + all.join('\n') : 'no console errors');
process.exit(failed || all.length ? 1 : 0);
