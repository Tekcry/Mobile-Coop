// Close-quarters and combat checks on the Test Chamber (G2b): hit volumes following crouch, and in a fight:
// suppression, exposure HUD, and footstep noise investigation. (Player cover checks left with step 05.)
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
let browser;
let errors = [];
try {
  ({ browser, page: globalThis.page, errors } = await launch({ url, params: 'autostart=studio' }));
  const page = globalThis.page;
  const G = (f, a) => page.evaluate(f, a);
  const tp = (x, z, yaw) => G(([x, z, yaw]) => { const g = window.__app.current; const p = g.player; p.controller.teleport(new p.controller.pos.constructor(x, 0, z), yaw); p.cam.yaw = yaw; p.cam.pitch = 0; }, [x, z, yaw]);
  /** Simulate seconds headless with the move stick and ADS held as given; returns per-step samples of `probe`. */
  const run = (seconds, mx, my, ads, probe) => G(([s, mx, my, ads, probe]) => {
    const a = window.__app;
    const g = a.current;
    const f = probe ? new Function('g', `return (${probe})`) : null;
    const out = [];
    const orig = g.player.fixedUpdate.bind(g.player);
    g.player.fixedUpdate = (dt, i) => { orig(dt, i); if (ads) g.player.ads = true; };
    for (let t = 0; t < s; t += 1 / 60) {
      a.input.state.move.x = mx;
      a.input.state.move.y = my;
      a.loop.stepHeadless(1 / 60);
      if (f) out.push(f(g));
    }
    a.input.state.move.x = a.input.state.move.y = 0;
    g.player.fixedUpdate = orig;
    return out;
  }, [seconds, mx, my, ads, probe ?? null]);

  console.log('hit volumes');
  await tp(20, 21, 0);
  await run(0.3, 0, 0, false);
  const stand = await G(() => { const g = window.__app.current; return g.target.headPoint(new g.player.position.constructor()).y; });
  await G(() => window.__app.input.state.tap('crouch'));
  await run(0.8, 0, 0, false);
  const crouch = await G(() => { const g = window.__app.current; return g.target.headPoint(new g.player.position.constructor()).y; });
  // the standing carriage is hunched over the gun (head ~1.47 m), the crouch drops it ~0.45 m from there
  assert(stand > 1.4 && crouch < stand - 0.3, `head volume lowers when crouched (${stand.toFixed(2)} -> ${crouch.toFixed(2)})`);
  await G(() => window.__app.input.state.tap('crouch'));
  await run(0.5, 0, 0, false);
} catch (e) {
  failed = true;
  console.error(String(e));
}
await browser?.close();

// a fight: suppression, exposure and noise (alerted grunts at the chamber's five enemy spawns)
try {
  const l = await launch({ url, params: 'autostart=studio&mode=test' });
  browser = l.browser;
  errors = errors.concat(l.errors);
  const page = l.page;
  const G = (f, a) => page.evaluate(f, a);
  console.log('combat around cover');
  const r = await G(() => {
    const a = window.__app;
    const g = a.current;
    const p = g.player;
    g.target.damageMul = 0;
    // what Wave mode did: hunters, no stealth rules, five alerted grunts at the enemy spawns
    g.enemyMgr.clear();
    g.enemyMgr.stealth = false;
    const sp = g.world.layout.enemySpawns;
    for (let i = 0; i < 5 && sp.length; i++) g.enemyMgr.spawn('grunt', sp[i % sp.length].clone(), true);
    p.controller.teleport(new p.controller.pos.constructor(2.7, 0, 17), Math.PI / 2);
    p.cam.yaw = -Math.PI / 2;
    a.loop.stepHeadless(0.3);
    let maxS = 0;
    let maxE = 0;
    for (let i = 0; i < 160; i++) {
      a.loop.stepHeadless(0.25);
      maxS = Math.max(maxS, g.suppression.value);
      maxE = Math.max(maxE, g.exposure);
    }
    return { maxS, maxE };
  });
  await frames(page, 4);
  const hud = await G(() => !!document.querySelector('.tac-exposure.show'));
  assert(r.maxS > 0.3, `near misses suppress the player (${r.maxS.toFixed(2)})`);
  assert(r.maxE > 0, `exposure is sampled against threats (${r.maxE.toFixed(2)})`);
  assert(hud, 'HUD exposure meter shows with threats around');

  console.log('noise');
  const n = await G(() => {
    const a = window.__app;
    const g = a.current;
    const m = g.enemyMgr;
    m.clear();
    const p = g.player;
    p.controller.teleport(new p.controller.pos.constructor(8, 0, 11), 0);
    const e = m.spawn('grunt', new p.controller.pos.constructor(8, 0, 1), false, Math.PI);
    // a crouched sneak: near silent; a sprint carries
    p.controller['crouchToggled'] = true;
    a.input.state.move.y = 0.3;
    a.loop.stepHeadless(1.5);
    const creepNoise = g.noise;
    p.controller['crouchToggled'] = false;
    const z0 = e.pos.z;
    const x0 = e.pos.x;
    a.input.state.move.y = 0;
    g.noise = 0;
    // through the door wall (z 4) between them a 16 m noise is muffled (not heard at 10 m); a louder one is.
    // (G2b) the test mode's coordinated hearing makes a wall x0.45, and walking over needs 10 < R x 0.45 x 0.5, so R > 44.4: 45
    m.hear(p.position, 16);
    a.loop.stepHeadless(3);
    const muffled = e.level;
    m.hear(p.position, 45);
    a.loop.stepHeadless(7);
    return { creepNoise, moved: Math.hypot(e.pos.x - x0, e.pos.z - z0), alerted: e.alerted, level: e.level, muffled };
  });
  assert(n.creepNoise < 1, `a crouched sneak is near silent (${n.creepNoise.toFixed(1)} m)`);
  assert(n.moved > 1, `a heard footstep draws an unalerted enemy to investigate (${n.moved.toFixed(2)} m, ${n.level})`);
  assert(n.muffled === 'unaware', `a wall muffles a noise (${n.muffled})`);
} catch (e) {
  failed = true;
  console.error(String(e));
}
await browser?.close();
const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
if (real.length) {
  failed = true;
  console.error(real.join('\n'));
} else console.log('no console errors');
process.exit(failed ? 1 : 0);
