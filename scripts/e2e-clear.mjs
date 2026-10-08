// Warehouse + Clear mode: the HUD shows only "Enemies left N" (alive + still to spawn): no room names,
// room counts, lives, score, objective or enemy blips; squads hold their rooms; clearing a room gives no
// feedback (no banner, stinger, slow beat, feed or XP); going down shows "DOWN" with no lives counter;
// the last hostile down completes the operation (OPERATION COMPLETE banner, stinger, slow beat,
// letterbox); results have no rooms row and one completion reward. Room tags still show in Wave mode;
// doorway checks by chasing enemies; Proving Grounds mini room set; Warehouse as the default map.
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
const all = [];
async function run(params, fn) {
  const { browser, page, errors } = await launch({ url, params });
  const G = (f, a) => page.evaluate(f, a);
  const sim = async (s) => {
    for (let t = 0; t < s; t += 0.5) await G((d) => window.__app.loop.stepHeadless(d), Math.min(0.5, s - t));
    await frames(page, 1);
  };
  try {
    await G(() => { const t = window.__app.current?.target; if (t) t.damageMul = 0; });
    await fn({ page, G, sim });
  } catch (e) {
    failed = true;
    console.error(String(e));
    await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-clear-fail.png' });
  } finally {
    all.push(...errors);
    await browser.close();
  }
}

// page helpers (installed once per page)
const HELPERS = () => {
  const a = window.__app;
  const g = a.current;
  window.__h = {
    tp(x, z, yaw = 0) {
      const p = g.player;
      p.controller.teleport(new p.controller.pos.constructor(x, 0, z), yaw);
      p.cam.yaw = yaw;
    },
    kill(e) {
      const P = e.pos.constructor;
      e.applyDamage({ amount: 99999, point: e.pos.clone(), dir: new P(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'test', sourcePos: e.pos.clone(), impulse: 1 });
    },
    roomOf(e) {
      return g.mode.rooms.indexOf(e.hold);
    },
    hud() {
      return {
        room: document.querySelector('.hud-room')?.textContent ?? '',
        roomCleared: document.querySelector('.hud-room')?.classList.contains('cleared') ?? false,
        mode: document.querySelector('.hud-mode')?.textContent ?? '',
        objective: document.querySelector('.hud-objective')?.textContent ?? '',
        banner: document.querySelector('.hud-banner')?.textContent ?? '',
        feed: [...document.querySelectorAll('.hud-feed > *')].map((e) => e.textContent).join(' | '),
      };
    },
  };
};

console.log('warehouse clear mode');
await run('autostart=warehouse&mode=clear', async ({ page, G, sim }) => {
  await G(HELPERS);
  await sim(0.5);
  const left = () => G(() => {
    const g = window.__app.current;
    return { n: g.mode.enemiesLeft, alive: g.enemyMgr.enemies.filter((e) => e.alive).length, pending: g.mode['pending'].length };
  });
  const s0 = await G(() => {
    const g = window.__app.current;
    const em = g.enemyMgr;
    return {
      map: g.world.map.id,
      total: g.mode.tracker.total,
      alive: em.alive,
      held: em.enemies.filter((e) => e.alive && e.hold).length,
      hud: window.__h.hud(),
      bars: g.post.barsTarget,
      blips: g.mode.blips().length + g.enemyBlips,
    };
  });
  let L = await left();
  assert(s0.map === 'warehouse' && s0.total === 9, `warehouse with 9 tagged rooms (${s0.map}, ${s0.total})`);
  assert(s0.alive >= 8 && s0.held === s0.alive, `squads spawned holding their rooms (${s0.held}/${s0.alive})`);
  assert(L.n === L.alive + L.pending && L.pending > 0, `enemies left counts alive + still to spawn (${L.n} = ${L.alive} + ${L.pending})`);
  assert(s0.hud.mode.trim() === `Enemies left ${L.n}`, `HUD shows only "Enemies left ${L.n}" (${s0.hud.mode})`);
  assert(!/room|lives|score/i.test(s0.hud.mode + s0.hud.objective), `no room counts, lives, score or objective (${s0.hud.mode} / ${s0.hud.objective})`);
  assert(!/\d+ rooms/i.test(s0.hud.banner), `opening banner has no room count (${s0.hud.banner})`);
  assert(s0.bars === 1, 'letterbox at the start');
  assert(s0.blips === 0, 'no enemy blips');

  // no room names, even inside a tagged room
  await G(() => window.__h.tp(-12, -14, 0));
  await sim(0.6);
  let hud = await G(() => window.__h.hud());
  assert(hud.room === '', `no room tag inside the Loading Dock (${hud.room})`);

  await G(() => {
    window.__ops = 0;
    window.__app.current.events.on('operationComplete', () => window.__ops++);
  });
  // holding: an alerted squad member with the target outside its room stays inside it
  const hold = await G(() => {
    const g = window.__app.current;
    const e = g.enemyMgr.enemies.find((x) => x.alive && x.hold?.id === 'racking');
    if (!e) return null;
    e.alert();
    return e.id;
  });
  await G(() => window.__h.tp(14, -10, Math.PI / 2)); // corridor, out of sight
  await sim(6);
  const held = await G((id) => {
    const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id);
    const r = e.hold;
    return { alive: e.alive, x: e.pos.x, z: e.pos.z, inside: e.pos.x >= r.minX - 0.6 && e.pos.x <= r.maxX + 0.6 && e.pos.z >= r.minZ - 0.6 && e.pos.z <= r.maxZ + 0.6 };
  }, hold);
  assert(hold && held.inside, `alerted squad holds its room instead of chasing (${held.x.toFixed(1)}, ${held.z.toFixed(1)})`);

  // clear the dock: no feedback at all, the counter just drops
  await G(() => window.__h.tp(-12, -14, 0));
  await sim(0.5);
  const before = (await left()).n;
  const beat = await G(() => {
    const g = window.__app.current;
    const xp0 = g.stats.score;
    const squad = g.enemyMgr.enemies.filter((e) => e.alive && e.hold?.id === 'dock');
    for (const e of squad) window.__h.kill(e);
    return { killed: squad.length, scale: window.__app.loop.timeScale, xp0 };
  });
  await sim(0.5);
  hud = await G(() => window.__h.hud());
  L = await left();
  const after = await G(() => ({ ops: window.__ops, score: window.__app.current.stats.score, bars: window.__app.current.post.barsTarget }));
  assert(beat.killed >= 1 && L.n === before - beat.killed, `dock squad down: enemies left ${before} -> ${L.n}`);
  assert(beat.scale === 1 && after.ops === 0, `no slow beat or stinger for a room (x${beat.scale}, ${after.ops} stingers)`);
  assert(!/dock|room|cleared/i.test(hud.banner) && !/clear|room|dock/i.test(hud.feed), `no room banner or feed item (${hud.banner} / ${hud.feed})`);
  assert(after.score === beat.xp0, `no per-room score (${beat.xp0} -> ${after.score})`);
  assert(hud.mode.trim() === `Enemies left ${L.n}`, `counter updated (${hud.mode})`);

  // going down: "DOWN", no lives counter
  await G(() => {
    const g = window.__app.current;
    g.target.damageMul = 1;
    g.player.health?.damage?.(99999);
    g.target.applyDamage?.({ amount: 99999, point: g.player.position.clone(), dir: new g.player.position.constructor(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'test', sourcePos: g.player.position.clone(), impulse: 1 });
  });
  await sim(0.4);
  hud = await G(() => window.__h.hud());
  assert(/DOWN/.test(hud.banner) && !/li(fe|ves)|\d/i.test(hud.banner.replace('DOWN', '')), `"DOWN" with no lives counter (${hud.banner})`);
  await sim(3.5);
  await G(() => (window.__app.current.target.damageMul = 0));

  // clear the rest: visit each room, put its squad down; later squads spawn as the cap frees up
  const order = ['dispatch', 'workshop', 'corridor', 'floor', 'racking', 'office', 'manager', 'mezz', '-'];
  const at = { dispatch: [-2, -12.2], workshop: [8, -12.5], corridor: [2, -9.9], floor: [0, 0], racking: [-6.5, 0], office: [0.5, 16.8], manager: [3.2, 13.2], mezz: [10, 16], '-': [0, 0] };
  let lastKill = null;
  for (let pass = 0; pass < 4; pass++) {
    for (const id of order) {
      const [x, z] = at[id];
      await G(([x, z]) => window.__h.tp(x, z, 0), [x, z]);
      await sim(0.6);
      lastKill = await G((id) => {
        let scale = null;
        // ('-': anyone holding no room - reinforcements after an alarm)
        for (const e of window.__app.current.enemyMgr.enemies.filter((e) => e.alive && (e.hold?.id ?? '-') === id)) {
          window.__h.kill(e);
          scale = window.__app.loop.timeScale;
        }
        return scale;
      }, id) ?? lastKill;
      await sim(0.6);
      if ((await left()).n === 0) break;
    }
    if ((await left()).n === 0) break;
  }
  L = await left();
  hud = await G(() => window.__h.hud());
  const fin = await G(() => ({ ops: window.__ops, bars: window.__app.current.post.barsTarget, scale: window.__app.loop.timeScale }));
  const why = L.n === 0 ? '' : JSON.stringify(await G(() => { const g = window.__app.current; const m = g.mode; return { pending: m.pending?.length, current: m.current, alive: g.enemyMgr.alive, down: !g.player.alive, pos: [g.player.position.x, g.player.position.z].map((v) => v.toFixed(1)), holds: g.enemyMgr.enemies.filter((e) => e.alive).map((e) => e.hold?.id ?? '-') }; }));
  assert(L.n === 0, `every hostile down (${L.n} left) ${why}`);
  assert(fin.ops === 1 && /OPERATION COMPLETE/.test(hud.banner), `completion: OPERATION COMPLETE banner + stinger (${hud.banner}, ${fin.ops})`);
  assert(lastKill !== null && lastKill < 1 && fin.bars === 1, `completion: slow beat (x${lastKill}) and letterbox`);
  await sim(3.5);
  await page.waitForSelector('.results-screen', { timeout: 15000 });
  const res = await G(() => document.querySelector('.results-screen')?.textContent ?? '');
  assert(/victory/i.test(res) && !/rooms cleared/i.test(res), 'results: victory, no rooms row');
  assert(/Operation complete/.test(res) && !/Room/.test(res), 'results: one completion reward, no per-room rewards');
});

console.log('wave mode keeps its HUD (room tags)');
await run('autostart=warehouse&mode=wave', async ({ G, sim }) => {
  await G(HELPERS);
  await sim(0.5);
  await G(() => window.__h.tp(-12, -14, 0));
  await sim(0.6);
  const hud = await G(() => window.__h.hud());
  assert(hud.room === 'Loading Dock' && /wave/i.test(hud.mode), `room tag and wave info in Wave mode (${hud.room}, ${hud.mode})`);
});

console.log('chasing enemies check doorways');
await run('autostart=warehouse&mode=wave', async ({ G, sim }) => {
  await G(HELPERS);
  const r = await G(() => {
    const g = window.__app.current;
    const e = g.enemyMgr.spawn('grunt', new g.player.position.constructor(-12, 0, -14), true, 0);
    window.__h.tp(3.2, 16.8, Math.PI);
    return e.id;
  });
  let paused = false;
  for (let i = 0; i < 120 && !paused; i++) {
    await G(() => window.__app.loop.stepHeadless(0.25));
    paused = await G((id) => {
      const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id);
      return e.doorCheck > 0;
    }, r);
  }
  assert(paused, 'an enemy moving into a new room unseen stops to check it');
});

console.log('default maps and mini room set');
await run('autostart=proving&mode=clear', async ({ G, sim }) => {
  await G(HELPERS);
  await sim(0.5);
  const s = await G(() => {
    const g = window.__app.current;
    return { total: g.mode.tracker.total, alive: g.enemyMgr.alive };
  });
  assert(s.total === 3 && s.alive === 3, `Proving Grounds mini room set: 3 rooms, 3 holders (${s.total}, ${s.alive})`);
  await G(() => window.__h.tp(-26, 13, 0));
  await sim(0.6);
  assert((await G(() => window.__h.hud().room)) === '', 'no room tag in Clear mode on the mini set');
});
await run('', async ({ page, G }) => {
  // play screen (3.0): Warehouse is the default for every mode but Training; only its missions are offered
  await page.locator('.btn', { hasText: 'Play' }).first().tap();
  await page.waitForSelector('.play-screen');
  const seen = [];
  for (let i = 0; i < 6; i++) {
    // Infiltration lists the missions as cards (their names stand in for the map)
    const t = await G(() => [...document.querySelectorAll('.play-screen .choice-val')].slice(0, 1).map((e) => e.textContent).concat([...document.querySelectorAll('.play-screen .mission-card .mc-name')].map((e) => e.textContent).join(', ') || [...document.querySelectorAll('.play-screen .choice-val')][1]?.textContent));
    seen.push(t.join(' / '));
    await page.locator('.play-screen .row-choice').first().locator('.choice-arrow').last().tap();
  }
  const byMode = Object.fromEntries(seen.map((s) => s.split(' / ')));
  assert(byMode['Wave Survival'] === 'Warehouse' && byMode['Mission'] === 'Warehouse' && byMode['Hunter'] === 'Warehouse', `Warehouse default for Wave / Mission / Hunter (${seen.join('; ')})`);
  assert(/Cold Storage.*Ledger.*Courier.*Blackout/.test(byMode['Infiltration'] ?? '') && !/Pouch|Vault|Manifest|Flare/.test(byMode['Infiltration'] ?? ''), `Infiltration lists the Warehouse missions only (${byMode['Infiltration']})`);
  assert(byMode['Free Roam'] === 'Warehouse', `Free Roam defaults to Warehouse (${byMode['Free Roam']})`);
  assert(byMode['Training'] === 'Proving Grounds', 'Training stays on Proving Grounds');
});

const real = all.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
console.log(real.length ? 'console problems:\n' + real.join('\n') : 'no console errors');
process.exit(failed || real.length ? 1 : 0);
