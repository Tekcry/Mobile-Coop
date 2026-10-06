// Close-quarters and combat-around-cover checks on Proving Grounds: doorway check + compressed ready,
// contextual lean at a wall end (shoulder swap and restore), slicing-the-pie standoff, split hit volumes
// following crouch/lean, and in a wave match: suppression, exposure HUD, grenades against static cover,
// a flanker, and footstep noise investigation.
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
let browser;
let errors = [];
try {
  ({ browser, page: globalThis.page, errors } = await launch({ url, params: 'autostart=proving' }));
  const page = globalThis.page;
  const G = (f, a) => page.evaluate(f, a);
  const tp = (x, z, yaw) => G(([x, z, yaw]) => { const g = window.__app.current; g.cover.reset(); g.corners.reset(); const p = g.player; p.controller.teleport(new p.controller.pos.constructor(x, 0, z), yaw); p.cam.yaw = yaw; p.cam.pitch = 0; }, [x, z, yaw]);
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

  console.log('doorway');
  // wall along z=8 with a 1.1 m doorway at x=-20
  await tp(-20, 5.6, 0);
  await run(0.3, 0, 0, false);
  const door = await run(4, 0, 1, false, 'g.player.coverPose.check + "|" + g.player.carry.w.compressed.toFixed(2) + "|" + g.player.position.z.toFixed(2)');
  const checks = door.filter((s) => Number(s.split('|')[0]) >= 0).length;
  const comp = Math.max(...door.map((s) => Number(s.split('|')[1])));
  const z = Number(door.at(-1).split('|')[2]);
  assert(z > 9, `walks through the doorway (z=${z})`);
  assert(comp > 0.9, `compressed ready near the doorway (${comp})`);
  assert(checks > 20, `stepping through plays the doorway check sweep (${checks} steps)`);

  console.log('contextual lean');
  // free-standing wall x=-16, z 0.5..5; stand behind its north end looking south, aim
  await tp(-16, 5.9, Math.PI);
  await run(0.3, 0, 0, false);
  const sh0 = await G(() => window.__app.current.player.cam.shoulder);
  const leanRun = await run(1.2, 0, 0, true, `JSON.stringify({ lean: g.corners.lean, sh: g.player.cam.shoulder, head: g.target.headPoint(new g.player.position.constructor()).x, x: g.player.position.x })`);
  // read inside the simulated run: between evaluate calls real frames tick without the forced aim
  const lean = JSON.parse(leanRun.at(-1));
  assert(Math.abs(lean.lean) > 0.95, `aiming with the wall end blocking the aim line leans out (${lean.lean.toFixed(2)})`);
  assert(Math.abs(lean.head - lean.x) > 0.3, `head hit volume moves out with the lean (${(lean.head - lean.x).toFixed(2)} m)`);
  const speedLean = await run(0.8, 1, 0, true, 'g.player.controller.speed');
  assert(Math.max(...speedLean) < 0.6, `hips planted while leaning: only a shuffle (${Math.max(...speedLean).toFixed(2)} m/s)`);
  await run(0.8, 0, 0, false);
  const back = await G(() => ({ lean: window.__app.current.corners.lean, sh: window.__app.current.player.cam.shoulder }));
  assert(back.lean === 0 && back.sh === sh0, `releasing aim leans back and restores the shoulder (${JSON.stringify(back)})`);

  console.log('slicing the pie');
  // walk north along the wall's east face (x=-15.8) towards its end at z=5, starting close to the wall
  await tp(-15.4, 1.6, 0);
  await run(0.3, 0, 0, false);
  const pie = await run(2.6, 0, 1, false, 'g.player.position.x');
  assert(pie.at(-1) - pie[0] > 0.2, `approaching the corner eases out to a standoff (x ${pie[0].toFixed(2)} -> ${pie.at(-1).toFixed(2)})`);

  console.log('hit volumes');
  await tp(0, -2, 0);
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

// wave match: hold low cover and let the squad work
try {
  const l = await launch({ url, params: 'autostart=proving&mode=wave' });
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
    p.controller.teleport(new p.controller.pos.constructor(-3.7, 0, -6), -Math.PI / 2);
    p.cam.yaw = -Math.PI / 2;
    a.loop.stepHeadless(0.3);
    a.input.state.tap('cover');
    let maxS = 0;
    let maxE = 0;
    let flankSeen = false;
    let inCoverT = 0;
    for (let i = 0; i < 160; i++) {
      a.loop.stepHeadless(0.25);
      if (g.cover.inCover) inCoverT += 0.25;
      maxS = Math.max(maxS, g.suppression.value);
      maxE = Math.max(maxE, g.exposure);
      flankSeen ||= !!g.enemyMgr.flanker || g.enemyMgr.enemies.some((e) => e.flanking);
    }
    return { maxS, maxE, flankSeen, inCoverT, grenades: g.enemyMgr.grenadesThrown };
  });
  await frames(page, 4);
  const hud = await G(() => !!document.querySelector('.tac-exposure.show'));
  assert(r.inCoverT > 30, `held cover (${r.inCoverT} s)`);
  assert(r.maxS > 0.3, `near misses suppress the player (${r.maxS.toFixed(2)})`);
  assert(r.maxE > 0, `exposure is sampled against threats (${r.maxE.toFixed(2)})`);
  assert(hud, 'HUD exposure meter shows with threats around');
  assert(r.grenades >= 1, `grenades flush a player holding static cover (${r.grenades})`);
  assert(r.flankSeen, 'an enemy is assigned to flank');

  console.log('noise');
  const n = await G(() => {
    const a = window.__app;
    const g = a.current;
    const m = g.enemyMgr;
    m.clear();
    g.cover.reset();
    const p = g.player;
    p.controller.teleport(new p.controller.pos.constructor(0, 0, -14), 0);
    const e = m.spawn('grunt', new p.controller.pos.constructor(0, 0, -24), false, Math.PI);
    // a crouched sneak: near silent; a sprint carries
    p.controller['crouchToggled'] = true;
    a.input.state.move.y = 0.3;
    a.loop.stepHeadless(1.5);
    const creepNoise = g.noise;
    p.controller['crouchToggled'] = false;
    const z0 = e.pos.z;
    a.input.state.move.y = 0;
    g.noise = 0;
    m.hear(p.position, 16);
    a.loop.stepHeadless(3);
    return { creepNoise, moved: Math.hypot(e.pos.x - 0, e.pos.z - z0), alerted: e.alerted };
  });
  assert(n.creepNoise < 1, `a crouched sneak is near silent (${n.creepNoise.toFixed(1)} m)`);
  assert(n.moved > 1, `a heard footstep draws an unalerted enemy to investigate (${n.moved.toFixed(2)} m)`);
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
