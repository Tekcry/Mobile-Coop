// Game modes: ragdolls (the mission and enemy-type parts left with the Warehouse and Proving Grounds in clean-up H; the archetypes are e2e-enemies).
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

// (clean-up G2c) the ragdoll part runs on the Test Chamber in the test mode with its five squad guards.
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

console.log(all.length ? 'console problems:\n' + all.join('\n') : 'no console errors');
process.exit(failed || all.length ? 1 : 0);
