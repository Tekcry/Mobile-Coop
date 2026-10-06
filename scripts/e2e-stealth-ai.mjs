// Stealth AI on the night Warehouse (Clear mode, stealth rules): shadow vs light detection, the awareness arc
// warning before detection, no sight through walls, noise -> suspicious -> investigating, the squad radio,
// LKP set + ghost + search that converges and ends, patrols walking their routes.
// `node scripts/e2e-stealth-ai.mjs [url] [--only=name]`
import { launch, assert } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '';
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'autostart=warehouse&mode=clear' });
const G = (f, a) => page.evaluate(f, a);
try {
  await page.waitForTimeout(800);
  await G(() => {
    const a = window.__app;
    const g = a.current;
    a.loop.manual = true;
    g.target.health.invulnerable = true;
    g.mode.pending.length = 0;
    const em = g.enemyMgr;
    em.clear();
    const V = g.player.position.constructor;
    const st = a.input.state;
    const c = g.player.controller;
    // helpers kept on window for the scenarios
    window.__t = {
      V,
      reset() {
        em.clear();
        em.lkpValid = false;
        em.sightT = 99;
        g.cover.reset();
        g.traversal.reset();
        st.releaseAll();
        st.setMove('t', 0, 0);
        c['crouchToggled'] = false;
        g.player.light = undefined;
        delete g.localRef.lightOverride;
      },
      tp(x, z, yaw) {
        c.teleport(new V(x, 0, z), yaw);
        g.player.cam.yaw = yaw;
        g.player.cam.pitch = 0;
      },
      spawn(kind, x, z, yaw) {
        return em.spawn(kind, new V(x, 0, z), false, yaw);
      },
      crouch(v) {
        c['crouchToggled'] = v;
      },
      /** Pin the player's light level (else it is sampled from the lamps). */
      light(v) {
        g['updateLight'] = v === null ? Object.getPrototypeOf(g)['updateLight'] : () => (g.localRef.light = g.lightLevel = v);
      },
      step(s) {
        a.loop.stepHeadless(s, 120);
      },
    };
  });
  const scen = async (name, f) => {
    if (only && !name.includes(only)) return;
    console.log(name);
    await G(() => window.__t.reset());
    await f();
  };

  await scen('shadow', async () => {
    // dark racking aisle: a crouched sneak past behind a guard, and crouched still in front at 8 m
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(null);
      const e = t.spawn('grunt', -14.5, 10, 0);
      t.crouch(true);
      t.tp(-15.2, 6.2, Math.PI / 2);
      t.step(0.6);
      const light = g.lightLevel;
      let max = 0;
      const st = window.__app.input.state;
      st.setMove('t', 0, 0.5);
      for (let k = 0; k < 40; k++) {
        t.step(0.1);
        max = Math.max(max, e.meter);
      }
      st.setMove('t', 0, 0);
      // in front, crouched and still in the dark
      t.tp(-14.5, 17.5, Math.PI);
      e.yaw = 0;
      let front = 0;
      for (let k = 0; k < 40; k++) {
        t.step(0.1);
        front = Math.max(front, e.meter);
      }
      return { light, max, front, level: e.level };
    });
    assert(r.light < 0.28, `the aisle is in shadow (light ${r.light.toFixed(2)})`);
    assert(r.max < 0.3, `a crouched sneak behind a guard in shadow stays unnoticed (meter max ${r.max.toFixed(2)})`);
    assert(r.front < 0.3, `crouched still in the dark in front at ~7 m stays unnoticed (meter max ${r.front.toFixed(2)}, ${r.level})`);
  });

  await scen('light', async () => {
    // lit factory floor: a walker in a lamp pool is seen; the arc warns first
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(null);
      const e = t.spawn('grunt', 0, 5, Math.PI);
      t.tp(-0.5, -3, 0);
      t.step(0.4);
      const light = g.lightLevel;
      const st = window.__app.input.state;
      let firstArc = -1;
      let alertAt = -1;
      for (let k = 0; k < 240 && alertAt < 0; k++) {
        st.setMove('t', k % 60 < 30 ? 0.6 : -0.6, 0);
        t.step(1 / 60);
        window.__app.current.frameUpdate(1 / 60, 1);
        if (firstArc < 0 && g.hud.arcs.shown > 0) firstArc = k / 60;
        if (e.alerted) alertAt = k / 60;
      }
      st.setMove('t', 0, 0);
      return { light, firstArc, alertAt, red: g.hud.arcs.anyRed };
    });
    assert(r.light > 0.6, `the lamp pool lights the player (${r.light.toFixed(2)})`);
    assert(r.alertAt > 0 && r.alertAt < 3, `walking in the light in view at 8 m is detected (${r.alertAt.toFixed(2)} s)`);
    assert(r.firstArc >= 0 && r.alertAt - r.firstArc > 0.25, `the awareness arc shows first (arc at ${r.firstArc.toFixed(2)} s, detected at ${r.alertAt.toFixed(2)} s)`);
  });

  await scen('walls', async () => {
    const r = await G(() => {
      const t = window.__t;
      // dispatch guard facing the corridor wall; the player lit, walking, right behind the wall
      t.light(1);
      const e = t.spawn('grunt', -2, -13, 0);
      t.tp(-2, -9.9, Math.PI);
      const st = window.__app.input.state;
      let max = 0;
      for (let k = 0; k < 30; k++) {
        st.setMove('t', k % 10 < 5 ? 0.7 : -0.7, 0);
        t.step(0.1);
        // sight only (footsteps are heard through the wall, rightly)
        max = Math.max(max, e.rate);
      }
      st.setMove('t', 0, 0);
      t.light(null);
      return { max, level: e.level };
    });
    assert(r.max === 0, `no sight through walls (sight rate ${r.max.toFixed(2)}, ${r.level})`);
  });

  await scen('noise', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(0);
      const e = t.spawn('grunt', -14.5, 10, 0);
      t.tp(-14.5, 4, 0);
      t.step(0.3);
      g.enemyMgr.hear(g.player.position, 9);
      t.step(0.2);
      const l1 = e.level;
      const z0 = e.pos.z;
      for (let k = 0; k < 6; k++) {
        g.enemyMgr.hear(g.player.position, 9);
        t.step(0.25);
      }
      const l2 = e.level;
      t.tp(-22, -24, 0);
      t.step(2);
      t.light(null);
      return { l1, l2, moved: z0 - e.pos.z };
    });
    assert(r.l1 === 'suspicious', `a noise makes a guard suspicious (${r.l1})`);
    assert(r.l2 === 'investigating', `more noise: it investigates (${r.l2})`);
    assert(r.moved > 1, `it walks over to the noise (${r.moved.toFixed(2)} m)`);
  });

  await scen('radio', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(1);
      const a = t.spawn('grunt', 0, 5, Math.PI);
      const b = t.spawn('grunt', 10, 9, Math.PI);
      const far = t.spawn('grunt', -21, 17, Math.PI);
      t.tp(-0.5, 0, 0);
      let k = 0;
      while (!a.alerted && k++ < 300) t.step(1 / 60);
      const bBefore = b.alerted;
      t.step(1.5);
      t.light(null);
      return { a: a.alerted, bBefore, b: b.alerted, far: far.level, lkp: g.enemyMgr.lkpValid };
    });
    assert(r.a, 'the guard who sees the player is alerted');
    assert(r.b && !r.bBefore, 'a squadmate within radio range joins after a short delay');
    assert(r.far !== 'alert', `a guard out of radio range is not told (${r.far})`);
    assert(r.lkp, 'the sighting sets the last known position');
  });

  await scen('lkp', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      t.light(1);
      const e = t.spawn('grunt', 0, 5, Math.PI);
      t.tp(-0.5, 0, 0);
      let k = 0;
      while (!(e.alerted && em.sightT < 0.1) && k++ < 400) {
        t.step(1 / 60);
        g.frameUpdate(1 / 60, 1);
      }
      const seenAt = { x: em.lkp.x, z: em.lkp.z };
      // vanish behind the dispatch wall (out of sight, far from the last known position)
      t.light(0);
      t.tp(-2, -15, 0);
      let ghost = false;
      let searching = false;
      let closest = 99;
      let wallhack = false;
      for (let i = 0; i < 500; i++) {
        t.step(0.05);
        g.frameUpdate(0.05, 1);
        if (g.ghost.visible) ghost = true;
        if (e.level === 'searching') searching = true;
        closest = Math.min(closest, Math.hypot(e.pos.x - seenAt.x, e.pos.z - seenAt.z));
        if (e.level === 'alert' && e.sinceSeen > 1 && Math.hypot(e.pos.x + 2, e.pos.z + 15) < 2) wallhack = true;
      }
      const lkpNear = Math.hypot(em.lkp.x - seenAt.x, em.lkp.z - seenAt.z);
      // the search ends
      for (let i = 0; i < 50; i++) t.step(1);
      for (let i = 0; i < 5; i++) g.frameUpdate(0.2, 1);
      t.light(null);
      return { lkpNear, ghost, searching, closest, wallhack, end: e.level, lkpAfter: em.lkpValid, ghostAfter: g.ghost.visible };
    });
    assert(r.lkpNear < 1.5, `the last known position stays where the player was seen (${r.lkpNear.toFixed(2)} m off)`);
    assert(r.ghost, 'the LKP ghost shows once they lose sight');
    assert(r.closest < 2.5, `they converge on the last known position (closest ${r.closest.toFixed(2)} m)`);
    assert(r.searching, 'they search from it');
    assert(!r.wallhack, 'they never home in on the hidden player');
    assert(r.end === 'cooldown' || r.end === 'unaware', `the search ends (${r.end})`);
    assert(!r.lkpAfter && !r.ghostAfter, 'the LKP and its ghost clear afterwards');
  });

  await scen('patrol', async () => {
    const r = await G(() => {
      const t = window.__t;
      t.light(0);
      const e = t.spawn('grunt', -19, -10.5, Math.PI);
      e.setPatrol({ points: [[-19, -10.5], [-12.5, -8.6], [-16.5, -14.8]], wait: 1 });
      t.tp(-22, 16, 0);
      const pts = [];
      for (let i = 0; i < 64; i++) {
        t.step(0.5);
        pts.push([e.pos.x, e.pos.z]);
      }
      t.light(null);
      const near = (x, z) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < 0.8);
      return { a: near(-12.5, -8.6), b: near(-16.5, -14.8), level: e.level };
    });
    assert(r.a && r.b, `an unaware guard walks its route (${r.a} ${r.b})`);
    assert(r.level === 'unaware', `and stays unaware (${r.level})`);
  });

  const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
  assert(real.length === 0, `no console errors (${real.join(' | ')})`);
} catch (e) {
  failed = true;
  console.error(String(e));
}
await browser.close();
process.exit(failed ? 1 : 0);
