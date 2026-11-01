// (clean-up G2a) The Test Chamber's test mode, single player: `?autostart=chamber&mode=test` is a match with the guards'
// systems (nav, enemy manager, interactables) and a real `g.mode` (`TestMode`), nothing queued, infinite ammo, no
// progression. A guard spawned by the test walks its route, a solo death respawns (no DEFEAT with `lives` at Infinity),
// `?guards=1` is accepted (the chamber has no room squads yet). Then `mode=sandbox` on the same map is unchanged (no nav,
// no mode) and the chamber in the test mode lists its two dummies from the layout (the second revive / co-op side:
// e2e-coop, e2e-coop:chamber).
// (clean-up G2c) ?guards=1 places the five room-squad guards of the annex; the three passive practice guards (decision N17) come with
// ?practice=1 or from the main menu's Test Chamber row (the tests' pages carry practice=0): passive, outside the open middle, a
// guard taken down comes back at his spot 10 s later once nobody stands within 2.5 m of it.
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
const errors = [];
const NOISE = /GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext|GL Driver/i;
// (G2c) the practice guards' spots (CHAMBER_PROPS.practice): two side by side with their backs to the spawns, one facing them
const SPOTS = [[12.75, 16.75], [15.25, 16.75], [19.75, 16.25]];
/** The practice guards' checks on a page whose match has them: three passive grunts on their spots, a downed one back 10 s later, never on a player. */
async function practiceChecks(G, label) {
  const guards = () => G(() => window.__app.current.enemyMgr.enemies.filter((e) => e.alive).map((e) => ({ id: e.id, kind: e.def.kind, passive: e.passive, x: +e.pos.x.toFixed(2), z: +e.pos.z.toFixed(2) })));
  const sim = (s) => G((s) => window.__app.loop.stepHeadless(s), s);
  const down = (i) => G((i) => {
    const g = window.__app.current;
    const e = g.enemyMgr.enemies.filter((q) => q.alive).sort((a, b) => a.pos.x - b.pos.x)[i];
    e.applyDamage({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 });
    return e.id;
  }, i);
  const on = (g, s) => Math.hypot(g.x - s[0], g.z - s[1]) < 0.6;
  const g0 = await guards();
  assert(g0.length === 3 && g0.every((g) => g.kind === 'grunt' && g.passive), `${label}: three passive practice grunts (${JSON.stringify(g0)})`);
  assert(SPOTS.every((s) => g0.some((g) => on(g, s))), `${label}: on their three spots (${g0.map((g) => `${g.x},${g.z}`).join(' ')})`);
  // the player stands behind the first pair for a while: nothing notices (passive: they see and hear nothing)
  await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.player.controller.teleport(new g.player.position.constructor(14, 0, 15.2), 0); });
  await sim(4);
  assert(await G(() => window.__app.current.enemyMgr.enemies.every((e) => e.level === 'unaware' && !e.alerted)), `${label}: a player right behind them: all unaware`);
  await G(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(14, 0, 14), 0); });
  const first = await down(0);
  assert((await guards()).length === 2, `${label}: one taken down, two left`);
  await sim(9);
  assert((await guards()).length === 2, `${label}: still down after 9 s`);
  await sim(1.6);
  const g1 = await guards();
  assert(g1.length === 3 && g1.every((g) => g.passive) && SPOTS.every((s) => g1.some((g) => on(g, s))) && !g1.some((g) => g.id === first), `${label}: back on his spot after about 10 s, a fresh passive guard (${JSON.stringify(g1)})`);
  // a player on the spot keeps him away: down while standing there, 12 s later still not back, then back once the player steps off
  await G(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(15.25, 0, 16.75), 0); });
  await down(1);
  await sim(12);
  assert((await guards()).length === 2, `${label}: nobody leaves the spot: not back after 12 s`);
  await G(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(14, 0, 14), 0); });
  await sim(1);
  assert((await guards()).length === 3, `${label}: the player steps off: he is back`);
}

async function boot(params, fn) {
  const { browser, page, errors: errs } = await launch({ url, params });
  try {
    await fn(page, (f, a) => page.evaluate(f, a));
  } finally {
    errors.push(...errs.filter((e) => !NOISE.test(e)));
    await browser.close();
  }
}

try {
  console.log('chamber, test mode');
  await boot('autostart=chamber&mode=test', async (page, G) => {
    await frames(page, 3);
    const s = await G(() => {
      const g = window.__app.current;
      return {
        map: g.opts.map.id,
        mode: g.opts.mode,
        modeId: g.mode?.id ?? null,
        nav: !!g.nav,
        em: !!g.enemyMgr,
        stealth: g.enemyMgr?.stealth,
        coordinated: g.enemyMgr?.coordinated,
        ammo: g.weapons.infiniteAmmo,
        dummies: g.dummies.length,
        alive: g.enemyMgr?.alive,
        lives: g.mode?.lives,
        pending: g.mode?.pending?.length,
        ints: !!g.interactables,
      };
    });
    assert(s.map === 'chamber' && s.mode === 'test', `the Test Chamber boots in the test mode (${s.map} / ${s.mode})`);
    assert(s.modeId === 'test', `g.mode is the test mode (${s.modeId})`);
    assert(s.nav && s.em && s.ints, `the guards' systems are up: nav ${s.nav}, enemy manager ${s.em}, interactables ${s.ints}`);
    assert(s.stealth === true && s.coordinated === true, `stealth rules and the coordinated hearing (${s.stealth} / ${s.coordinated})`);
    assert(s.ammo === true, 'infinite ammo');
    assert(s.alive === 0 && s.pending === 0 && s.dummies === 2, `nothing queued, no guards, the chamber's two dummies (G2b) (alive ${s.alive}, pending ${s.pending}, dummies ${s.dummies})`);
    assert(s.lives === Infinity || s.lives === null, `no lose flow (lives ${s.lives})`);

    // a guard the test spawns walks its route: (6, 8) to (22, 8) and back, 16 m a leg
    const w = await G(() => {
      const a = window.__app;
      const g = a.current;
      const em = g.enemyMgr;
      g.target.damageMul = 0;
      em.clear();
      const P = g.player.position.constructor;
      const e = em.spawn('grunt', new P(6, 0, 8), false, Math.PI / 2);
      if (!e) return { spawned: false };
      e.setPatrol({ points: [[22, 8], [6, 8]], wait: 0.5 });
      const x0 = e.pos.x;
      const z0 = e.pos.z;
      let path = 0;
      let px = x0;
      let pz = z0;
      let far = 0;
      for (let i = 0; i < 20 * 4; i++) {
        a.loop.stepHeadless(0.25);
        path += Math.hypot(e.pos.x - px, e.pos.z - pz);
        px = e.pos.x;
        pz = e.pos.z;
        far = Math.max(far, Math.hypot(e.pos.x - x0, e.pos.z - z0));
      }
      return { spawned: true, alive: e.alive, path, far, level: e.level, x: e.pos.x, z: e.pos.z };
    });
    assert(w.spawned, 'the enemy manager spawns a grunt in the chamber');
    assert(w.alive && w.path > 8 && w.far > 5, `the grunt walks its route (${w.path.toFixed(1)} m walked, ${w.far.toFixed(1)} m out, at ${w.x.toFixed(1)}, ${w.z.toFixed(1)}, ${w.level})`);
    assert(w.x > -1 && w.x < 29 && w.z > -1 && w.z < 29, 'and stays inside the room');

    // a solo death respawns: no DEFEAT, full health, a few seconds
    const d = await G(() => {
      const a = window.__app;
      const g = a.current;
      g.enemyMgr.clear();
      g.target.damageMul = 1;
      const P = g.player.position.constructor;
      g.explosions.explode(g.player.position.add(new P(1, 0.3, 0)), 6, 400, 50, 'neutral', '');
      a.loop.stepHeadless(0.2);
      const down = !g.target.alive;
      a.loop.stepHeadless(2.5);
      const stillDown = !g.target.alive;
      a.loop.stepHeadless(1.6);
      return { down, stillDown, up: g.target.alive, hp: g.target.health.hp, ended: g.isEnded, lives: g.mode.lives };
    });
    assert(d.down, 'a point-blank explosion downs the player');
    assert(d.stillDown, 'still down after 2.7 s (the respawn takes about 3.5 s)');
    assert(d.up && d.hp === 100 && !d.ended, `the player respawns at full health, no DEFEAT (alive ${d.up}, hp ${d.hp}, ended ${d.ended})`);
    assert(d.lives === Infinity, `lives stay at Infinity (${d.lives})`);
  });

  console.log('chamber, test mode with ?guards=1');
  // (0b) with the load gate on (the default): the five annex guards placed at the match start once threw a render error in the first frames (`reading 'world'`; fixed in `GameState.gateCompile`)
  await boot('autostart=chamber&mode=test&guards=1', async (page, G) => {
    await frames(page, 2);
    const s = await G(() => { const g = window.__app.current; return { mode: g.mode?.id, alive: g.enemyMgr?.alive }; });
    assert(s.mode === 'test' && s.alive === 5, `?guards=1 places the map's room squads: five guards in the annex (${s.mode}, ${s.alive} guards)`);
    assert(await G(() => window.__app.current.enemyMgr.enemies.every((e) => !e.passive && e.pos.x > 28)), 'all of them in the annex, none passive (the practice guards come with ?practice=1)');
  });

  console.log('chamber, test mode with ?practice=1 (G2c, N17)');
  await boot('autostart=chamber&mode=test&practice=1', async (page, G) => {
    await frames(page, 2);
    await practiceChecks(G, 'practice=1');
  });

  console.log('the main menu Test Chamber row (G2c, N17): the animation stage in the test mode with the practice guards');
  for (const [params, guards] of [['practice=1', 3], ['practice=0', 0]]) {
    const { browser, page, errors: errs } = await launch({ url, params });
    try {
      await page.waitForSelector('.main-menu [data-key="test-chamber"]', { timeout: 90000 });
      await page.click('.main-menu [data-key="test-chamber"]');
      // (one-game) map-ready is on by default: the sim is held until its load gate releases it (__mapReady.released)
      await page.waitForFunction(() => window.__app.current?.player && window.__app.current.opts?.map?.id === 'chamber' && window.__mapReady?.released, null, { timeout: 180000 });
      await frames(page, 3);
      const G = (f, a) => page.evaluate(f, a);
      const s = await G(() => { const g = window.__app.current; return { mode: g.opts.mode, modeId: g.mode?.id ?? null, stage: !!g.chamber, hook: !!window.__chamberStage, dummies: g.dummies.length, alive: g.enemyMgr?.alive, practice: g.opts.practice }; });
      assert(s.mode === 'test' && s.modeId === 'test' && s.stage && s.hook && s.dummies === 0, `${params}: the menu row starts the test mode with the animation stage (${JSON.stringify(s)})`);
      assert(s.alive === guards, `${params}: ${guards} practice guards stand in the match (${s.alive})`);
      if (guards) await practiceChecks(G, `menu start ${params}`);
      const poll = await G(() => { const t = window.__app.debug.animTune; return { open: t.isOpen, can: t.canOpen, row: t.pauseRow }; });
      assert(poll.can && poll.row, `${params}: with the stage on the tuner may open and the pause menu lists its row (${JSON.stringify(poll)})`);
    } finally {
      errors.push(...errs.filter((e) => !NOISE.test(e)));
      await browser.close();
    }
  }
  console.log('chamber, sandbox mode (unchanged)');
  await boot('autostart=chamber&mode=sandbox', async (page, G) => {
    await frames(page, 2);
    const s = await G(() => {
      const g = window.__app.current;
      return { mode: g.opts.mode, modeObj: g.mode, nav: !!g.nav, em: !!g.enemyMgr, ammo: g.weapons.infiniteAmmo, dummies: g.dummies.length, obj: g.hud.objectiveText };
    });
    assert(s.mode === 'sandbox' && s.modeObj === null && !s.nav && !s.em, `the sandbox mode on the chamber has no mode, nav or guards (${s.mode}, ${s.modeObj}, ${s.nav}, ${s.em})`);
    assert(s.ammo === true && s.dummies === 2, `infinite ammo, the chamber's two dummies (G2b) (${s.ammo}, ${s.dummies})`);
    assert((s.obj ?? '') === '', `the sandbox mode has no objective (${s.obj})`);
  });

  console.log('chamber, the animation stage (?stage=1)');
  await boot('autostart=chamber&stage=1&mode=sandbox', async (page, G) => {
    await frames(page, 2);
    const s = await G(() => { const g = window.__app.current; return { stage: !!g.chamber, dummies: g.dummies.length, entry: window.__chamberStage ? 'hook' : '' }; });
    assert(s.stage && s.dummies === 0, `the stage starts with ?stage=1 and has no dummies in its room (stage ${s.stage}, dummies ${s.dummies})`);
  });

  console.log('chamber, free roam has no stage');
  await boot('autostart=chamber&mode=sandbox', async (page, G) => {
    await frames(page, 2);
    const s = await G(() => { const g = window.__app.current; return { stage: !!g.chamber, hook: !!window.__chamberStage }; });
    assert(!s.stage && !s.hook, `plain autostart=chamber is the normal game: no animation stage (${s.stage}, ${s.hook})`);
  });

  console.log('chamber, test mode: the dummies come from the layout');
  await boot('autostart=chamber&mode=test', async (page, G) => {
    await frames(page, 2);
    const s = await G(() => {
      const g = window.__app.current;
      const l = g.world.layout;
      return { mode: g.mode?.id, ammo: g.weapons.infiniteAmmo, dummies: g.dummies.length, layout: l.dummies?.length, alive: g.enemyMgr?.alive };
    });
    assert(s.mode === 'test' && s.ammo === true, `the chamber takes the test mode (${s.mode})`);
    assert(s.dummies === 2 && s.layout === 2, `its two training dummies come from the layout (${s.dummies} built, ${s.layout} listed)`);
    assert(s.alive === 0, `and no guards (${s.alive})`);
  });
} catch (e) {
  failed = true;
  console.error(String(e?.stack ?? e));
}
if (errors.length) {
  failed = true;
  console.error('console problems:\n' + errors.join('\n'));
} else console.log('no console errors');
if (failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-testmode OK');
