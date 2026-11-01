// Game modes: ragdolls, mission objectives to victory, enemy types.
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

// (clean-up G2c) the ragdoll part runs on the Test Chamber in the test mode with its five squad guards (was the Warehouse mission).
// The mission and enemy-type parts below stay on the Warehouse and the Proving Grounds: the Mission mode goes in stage H.
console.log('ragdolls');
await run('autostart=chamber&mode=test&guards=1', async ({ G, sim }) => {
  await G(() => { window.__app.current.target.damageMul = 0; });
  await sim(0.5);
  const alive = await G(() => window.__app.current.enemyMgr.alive);
  assert(alive > 0, `the test mode places its squad guards (${alive} alive)`);
  // kill everything at once, then watch the bodies
  let maxRag = 0;
  await G(() => { const g = window.__app.current; let i = 0; for (const e of [...g.enemyMgr.enemies]) if (e.alive) e.applyDamage({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: i++ % 2 ? 'head' : 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 5 }); });
  for (let i = 0; i < 10; i++) {
    await sim(0.1);
    maxRag = Math.max(maxRag, await G(() => window.__app.current.enemyMgr.bodies.filter((b) => b.simulating).length));
  }
  const kills = await G(() => window.__app.current.stats.kills);
  assert(kills >= alive, `every kill counted (${kills})`);
  assert(maxRag > 0 && maxRag <= 4, `deaths spawn physics ragdolls within budget (peak ${maxRag})`);
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
    // (runner-armed triage) since G5 (the hold-A action menu, d2bb25db9) the centre prompt is blank outside a team move
    // (`GameState.updateInteract`): the item in reach is a row of the context menu (`contextMenuStep`)
    const rows = await G(() => { const m = window.__app.current.ctxMenu; return m.opts.slice(0, m.count).map((o) => o.label).join(' / '); });
    assert(/Hack terminal/.test(rows), `the action menu lists the hack near ${t} ("${rows}")`);
    await G(() => window.__pad.set(0, 1));
    await sim(3.4);
    await G(() => window.__pad.set(0, 0));
    await sim(0.2);
    assert(await G((t) => window.__app.current.interactables.items.find((i) => i.id === t).done, t), `holding A hacks ${t}`);
  }
  await go('cache');
  await sim(0.4);
  await press(page, BTN.A);
  await sim(0.3);
  assert(await G(() => window.__app.current.interactables.items.find((i) => i.id === 'cache').done), 'A grabs the intel (Y is jump)');
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
await run('autostart=proving&mode=mission', async ({ G, sim }) => {
  await sim(0.3);
  const r = await G(() => { const g = window.__app.current; const P = g.player.position; const V = P.constructor;
    // the mission's squads out of the way; spawned enemies hunt (no stealth rules)
    g.enemyMgr.clear();
    g.enemyMgr.stealth = false;
    g.enemyMgr.spawn('runner', new V(P.x + 4, 0, P.z + 4), true);
    g.enemyMgr.spawn('heavy', new V(P.x - 10, 0, P.z + 6), true);
    return g.enemyMgr.alive; });
  assert(r >= 2, 'runner and heavy spawn');
  const hp0 = await G(() => window.__app.current.target.health.hp);
  // (guard-ai runner-armed, G298) the runner is armed: count any hand-to-hand strike
  await G(() => { const em = window.__app.current.enemyMgr; window.__runnerStrikes = 0; const prev = em.onEnemyMelee;
    em.onEnemyMelee = (x) => { if (x.def.kind === 'runner') window.__runnerStrikes++; prev?.(x); }; });
  await sim(4);
  const hp1 = await G(() => window.__app.current.target.health.hp);
  const runner = await G(() => ({ fired: window.__app.current.enemyMgr.enemies.find((q) => q.def.kind === 'runner')?.roundsFired ?? 0, strikes: window.__runnerStrikes }));
  assert(hp1 < hp0, `the runner and the heavy fire on the player (${hp0} -> ${hp1.toFixed(0)})`);
  assert(runner.fired > 0, `the runner fires (${runner.fired} rounds)`);
  assert(runner.strikes === 0, `the runner never strikes hand to hand (G298) (${runner.strikes})`);
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
