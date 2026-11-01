// (clean-up G2a) The Test Chamber's test mode, single player: `?autostart=studio&mode=test` is a match with the guards'
// systems (nav, enemy manager, interactables) and a real `g.mode` (`TestMode`), nothing queued, infinite ammo, no
// progression. A guard spawned by the test walks its route, a solo death respawns (no DEFEAT with `lives` at Infinity),
// `?guards=1` is accepted (the chamber has no room squads yet). Then `mode=sandbox` on the same map is unchanged (no nav,
// no mode) and Proving Grounds in the test mode lists its four dummies from the layout (the second revive / co-op side:
// e2e-coop, e2e-coop:chamber).
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
const errors = [];
const NOISE = /GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext|GL Driver/i;

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
  console.log('studio, test mode');
  await boot('autostart=studio&mode=test', async (page, G) => {
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
    assert(s.map === 'studio' && s.mode === 'test', `the Test Chamber boots in the test mode (${s.map} / ${s.mode})`);
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

  console.log('studio, test mode with ?guards=1');
  await boot('autostart=studio&mode=test&guards=1', async (page, G) => {
    await frames(page, 2);
    const s = await G(() => { const g = window.__app.current; return { mode: g.mode?.id, alive: g.enemyMgr?.alive }; });
    assert(s.mode === 'test' && s.alive === 0, `?guards=1 is accepted; it populates the map's room squads, and the chamber has none (${s.mode}, ${s.alive} guards)`);
  });

  console.log('studio, free roam (unchanged)');
  await boot('autostart=studio&mode=sandbox', async (page, G) => {
    await frames(page, 2);
    const s = await G(() => {
      const g = window.__app.current;
      return { mode: g.opts.mode, modeObj: g.mode, nav: !!g.nav, em: !!g.enemyMgr, ammo: g.weapons.infiniteAmmo, dummies: g.dummies.length, obj: g.hud.objectiveText };
    });
    assert(s.mode === 'sandbox' && s.modeObj === null && !s.nav && !s.em, `free roam on the chamber has no mode, nav or guards (${s.mode}, ${s.modeObj}, ${s.nav}, ${s.em})`);
    assert(s.ammo === true && s.dummies === 2, `infinite ammo, the chamber's two dummies (G2b) (${s.ammo}, ${s.dummies})`);
    assert(/try every weapon/.test(s.obj ?? ''), `the free roam objective for a map with targets (${s.obj})`);
  });

  console.log('studio, the animation stage (?stage=1)');
  await boot('autostart=studio&stage=1&mode=sandbox', async (page, G) => {
    await frames(page, 2);
    const s = await G(() => { const g = window.__app.current; return { stage: !!g.studio, dummies: g.dummies.length, entry: window.__studioStage ? 'hook' : '' }; });
    assert(s.stage && s.dummies === 0, `the stage starts with ?stage=1 and has no dummies in its room (stage ${s.stage}, dummies ${s.dummies})`);
  });

  console.log('studio, free roam has no stage');
  await boot('autostart=studio&mode=sandbox', async (page, G) => {
    await frames(page, 2);
    const s = await G(() => { const g = window.__app.current; return { stage: !!g.studio, hook: !!window.__studioStage }; });
    assert(!s.stage && !s.hook, `plain autostart=studio is the normal game: no animation stage (${s.stage}, ${s.hook})`);
  });

  console.log('proving grounds, test mode');
  await boot('autostart=proving&mode=test', async (page, G) => {
    await frames(page, 2);
    const s = await G(() => {
      const g = window.__app.current;
      const l = g.world.layout;
      return { mode: g.mode?.id, ammo: g.weapons.infiniteAmmo, dummies: g.dummies.length, layout: l.dummies?.length, alive: g.enemyMgr?.alive };
    });
    assert(s.mode === 'test' && s.ammo === true, `Proving Grounds takes the test mode (${s.mode})`);
    assert(s.dummies === 4 && s.layout === 4, `its four training dummies come from the layout (${s.dummies} built, ${s.layout} listed)`);
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
