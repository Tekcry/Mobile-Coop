// Warehouse + Clear mode: room tags, squads holding rooms, room-clear stingers (slow beat, letterbox),
// rooms cleared counter, victory; doorway checks by chasing enemies; Proving Grounds mini room set;
// Warehouse as the default Mission / Wave map.
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
        banner: document.querySelector('.hud-banner')?.textContent ?? '',
      };
    },
  };
};

console.log('warehouse clear mode');
await run('autostart=warehouse&mode=clear', async ({ page, G, sim }) => {
  await G(HELPERS);
  await sim(0.5);
  const s0 = await G(() => {
    const g = window.__app.current;
    const em = g.enemyMgr;
    return {
      map: g.world.map.id,
      total: g.mode.tracker.total,
      alive: em.alive,
      held: em.enemies.filter((e) => e.alive && e.hold).length,
      alerted: em.enemies.filter((e) => e.alive && e.alerted).length,
      hud: window.__h.hud(),
      bars: g.post.barsTarget,
    };
  });
  assert(s0.map === 'warehouse' && s0.total === 9, `warehouse with 9 tagged rooms (${s0.map}, ${s0.total})`);
  assert(s0.alive >= 8 && s0.held === s0.alive, `squads spawned holding their rooms (${s0.held}/${s0.alive})`);
  assert(/Rooms cleared 0\/9/.test(s0.hud.mode), `HUD "Rooms cleared 0/9" (${s0.hud.mode})`);
  assert(s0.bars === 1, 'letterbox stinger at the start');
  assert(s0.hud.room === '', 'no room tag in the yard');

  // room tag follows the player
  await G(() => window.__h.tp(-12, -14, 0));
  await sim(0.6);
  let hud = await G(() => window.__h.hud());
  assert(hud.room === 'Loading Dock', `room tag "${hud.room}"`);

  await G(() => {
    window.__roomEvents = [];
    window.__app.current.events.on('roomCleared', (ev) => window.__roomEvents.push(ev));
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
  // the corridor has no squad: it cleared on entry
  hud = await G(() => window.__h.hud());
  const ev0 = await G(() => window.__roomEvents.map((e) => e.id));
  assert(ev0.join() === 'corridor' && /Rooms cleared 1\/9/.test(hud.mode), `empty corridor clears on entry (${ev0}, ${hud.mode})`);

  // clear the dock: visit + squad down -> stinger, slow beat, counter
  await G(() => window.__h.tp(-12, -14, 0));
  await sim(0.5);
  const beat = await G(() => {
    const g = window.__app.current;
    const squad = g.enemyMgr.enemies.filter((e) => e.alive && e.hold?.id === 'dock');
    for (const e of squad) window.__h.kill(e);
    return { killed: squad.length, scale: window.__app.loop.timeScale };
  });
  assert(beat.killed >= 1 && beat.scale < 1, `last kill in a room plays the slow-motion beat (x${beat.scale})`);
  await sim(0.5);
  hud = await G(() => window.__h.hud());
  const ev = await G(() => window.__roomEvents);
  assert(ev.length === 2 && ev[1].id === 'dock' && /Rooms cleared 2\/9/.test(hud.mode), `dock cleared: event + counter (${hud.mode})`);
  assert(/LOADING DOCK CLEAR/.test(hud.banner), `room-clear banner (${hud.banner})`);
  assert(hud.roomCleared, 'room tag marked cleared');
  assert((await G(() => window.__app.loop.timeScale)) === 1, 'time scale back to normal after the beat');


  // clear the rest: visit each room, put its squad down; later squads spawn as the cap frees up
  const order = ['dispatch', 'workshop', 'floor', 'racking', 'office', 'manager', 'mezz'];
  const at = { dispatch: [-2, -12.2], workshop: [8, -12.5], floor: [0, 0], racking: [-6.5, 0], office: [0.5, 16.8], manager: [3.2, 13.2], mezz: [10, 16] };
  for (let pass = 0; pass < 3; pass++) {
    for (const id of order) {
      const [x, z] = at[id];
      await G(([x, z]) => window.__h.tp(x, z, 0), [x, z]);
      await sim(0.6);
      await G((id) => {
        for (const e of window.__app.current.enemyMgr.enemies.filter((e) => e.alive && e.hold?.id === id)) window.__h.kill(e);
      }, id);
      await sim(0.6);
    }
    if (await G(() => window.__app.current.mode.tracker.done)) break;
  }
  const end = await G(() => ({ cleared: window.__app.current.mode.tracker.cleared, order: window.__app.current.mode.tracker.order.length }));
  assert(end.cleared === 9, `every room cleared (${end.cleared}/9)`);
  await sim(3.5);
  await page.waitForSelector('.results-screen', { timeout: 15000 });
  const res = await G(() => document.querySelector('.results-screen')?.textContent ?? '');
  assert(/Rooms cleared/.test(res) && /victory|all rooms cleared/i.test(res), 'results: victory with rooms cleared');
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
  assert((await G(() => window.__h.hud().room)) === 'Room A', 'mini room tag');
});
await run('', async ({ page, G }) => {
  // play screen: Warehouse is the default for Wave, Mission and Clear
  await page.locator('.btn', { hasText: 'Play' }).first().tap();
  await page.waitForSelector('.play-screen');
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const t = await G(() => [...document.querySelectorAll('.play-screen .choice-val')].map((e) => e.textContent));
    seen.push(t.join(' / '));
    await page.locator('.play-screen .row-choice').first().locator('.choice-arrow').last().tap();
  }
  const byMode = Object.fromEntries(seen.map((s) => s.split(' / ')));
  assert(byMode['Wave Survival'] === 'Warehouse' && byMode['Mission'] === 'Warehouse' && byMode['Clear'] === 'Warehouse', `Warehouse default for Wave / Mission / Clear (${seen.join('; ')})`);
  assert(byMode['Free Roam'] === 'Proving Grounds', 'Free Roam stays on Proving Grounds');
});

const real = all.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
console.log(real.length ? 'console problems:\n' + real.join('\n') : 'no console errors');
process.exit(failed || real.length ? 1 : 0);
