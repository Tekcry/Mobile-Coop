// Combat test on the Test Chamber (G2b; sandbox, the CT kit: rifle and suppressed pistol): hitscan, headshots, kills, reload, swap,
// grenades, explosive barrel chain, player damage and respawn.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=chamber' });
let failed = false;
const G = (fn, arg) => page.evaluate(fn, arg);
/** Run simulation for `s` seconds of game time while holding pad buttons/axes. */
async function sim(s, setup) {
  await G(([s, setup]) => new Promise((res) => {
    const st = window.__app.current; let t = 0;
    const orig = st.fixedUpdate.bind(st);
    if (setup) for (const [k, v] of setup) window.__pad.set(k, v);
    st.fixedUpdate = (dt) => { orig(dt); t += dt; if (t >= s) { st.fixedUpdate = orig; if (setup) for (const [k] of setup) window.__pad.set(k, 0); res(); } };
    window.__ff();
  }), [s, setup ?? null]);
  await frames(page, 2);
}
/** Point the camera at a world point (aim straight, no assist). */
const aimAt = (x, y, z) => G(([x, y, z]) => {
  // The camera is spring-driven (follow lag, shoulder offset follows the view): aim, snap the view and
  // let the rig settle a few times so the aim converges from the final camera position.
  const g = window.__app.current;
  const cam = g.player.cam;
  for (let i = 0; i < 4; i++) {
    const cp = cam.camera.position;
    const dx = x - cp.x, dy = y - cp.y, dz = z - cp.z;
    cam.yaw = Math.atan2(dx, dz);
    cam.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    cam.snap();
    window.__app.loop.stepHeadless(0.1);
  }
}, [x, y, z]);
try {
  await G(() => { window.__pad.connect(); });
  // (step 09) no hip fire: aim held (drawn) for the firing checks
  await G(() => { window.__app.current.player.forceAds = true; window.__app.loop.stepHeadless(0.8); });
  await press(page, BTN.LS);
  await sim(0.4);
  const w0 = await G(() => window.__app.current.weapons.current.def.id);
  assert(w0 === 'rifle', `sandbox starts with rifle (${w0})`);

  // dummy[0] stands at (8, 0, 12.5), still; dummy[1] at (8, 0, 15) strafes
  const dummyHp = () => G(() => window.__app.current.dummies[0].health.hp);
  await G(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(16.6, 0, 12.5), -Math.PI / 2); });
  await sim(0.3);
  await aimAt(8, 1.1, 12.5);
  await frames(page, 3);
  console.log('    aim probe:', await G(() => { const g = window.__app.current; const c = g.player.cam; const o = c.camera.position; const h = g.ballistics.ray(o, o.add(c.forward.scale(40)), 0xffff); return `${h.target?.id ?? 'none'} at ${h.distance.toFixed(1)}  yaw=${c.yaw.toFixed(3)} cam=${o.x.toFixed(2)},${o.z.toFixed(2)}`; }));
  const mag0 = await G(() => window.__app.current.weapons.current.mag);
  await sim(0.75, [[BTN.RT, 1]]);
  const mag1 = await G(() => window.__app.current.weapons.current.mag);
  assert(mag0 - mag1 >= 2, `RT fires automatic rifle (${mag0} -> ${mag1})`);
  console.log('    last shot:', await G(() => { const l = window.__app.current.weapons.lastShot; const f = (v) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`; return `${l.target} origin ${f(l.origin)} aim ${f(l.aim)} hit ${f(l.hit)}`; }));
  const hp1 = await dummyHp();
  assert(hp1 < 100, `bullets damage the dummy (hp ${hp1.toFixed(0)})`);
  await sim(1.5, [[BTN.RT, 1]]);
  const dead = await G(() => !window.__app.current.dummies[0].alive);
  const tally = await G(() => JSON.stringify([...window.__app.current.weapons.tally.entries()]));
  assert(dead, `sustained fire kills the dummy (${tally})`);
  await sim(3.4);
  assert(await G(() => window.__app.current.dummies[0].alive), 'dummy respawns');

  // headshot: aim at head height
  await aimAt(8, 1.68, 12.5);
  await G(() => window.__app.input.state.tap('swapPrev')); /* (F1a: no pad button for previous; LB tap is next) */ // swap prev -> the suppressed pistol (semi)
  await sim(1.1);
  assert((await G(() => window.__app.current.weapons.current.def.id)) === 'pistolSd', 'LB swaps to previous weapon');
  await G(() => window.__app.input.state.set('t', 'ads', true));
  await sim(0.5);
  // the ADS framing blend moves the camera: re-aim once it has settled, at the head volume's centre
  await sim(0.6);
  const head = await G(() => { const n = window.__app.current.dummies[0]['hitboxes']['headNode']; n.computeWorldMatrix(true); const v = n.getAbsolutePosition(); return [v.x, v.y, v.z]; });
  await aimAt(head[0], head[1], head[2]);
  await sim(0.15);
  await sim(0.05, [[BTN.RT, 1]]);
  await sim(0.2);
  await G(() => window.__app.input.state.set('t', 'ads', false));
  console.log('    head shot:', await G(() => { const g = window.__app.current; const l = g.weapons.lastShot; const f = (v) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`; return `spread ${g.weapons['currentSpread']().toFixed(2)} ads ${g.player.cam.ads.toFixed(2)} spd ${g.player.controller.speed.toFixed(2)} bloom ${g.weapons['bloom'].toFixed(2)} ${l.target} origin ${f(l.origin)} aim ${f(l.aim)} hit ${f(l.hit)} headNode ${f(g.dummies[0]['hitboxes']['headNode'].position)} alive ${g.dummies[0].alive}`; }));
  const heads = await G(() => window.__app.current.weapons.tally.get('pistolSd')?.heads ?? 0);
  assert(heads >= 1, `head hitbox registers headshots (${heads})`);
  // semi-auto: holding RT fires once
  const pm0 = await G(() => window.__app.current.weapons.current.mag);
  await sim(0.5, [[BTN.RT, 1]]);
  const pm1 = await G(() => window.__app.current.weapons.current.mag);
  assert(pm0 - pm1 === 1, `semi-auto fires once per pull (${pm0} -> ${pm1})`);

  // reload (anim-rework S1; Michael 2026-10-20 14:55 "Interact always"): A with the gun out does the context action or
  // nothing, never a reload; X held 0.4 s reloads (A2)
  await press(page, BTN.A);
  assert(!(await G(() => window.__app.current.weapons.reloading)), 'A (gun out, nothing in reach) does not reload');
  await sim(0.55, [[BTN.X, 1]]);
  assert(await G(() => window.__app.current.weapons.reloading), 'X held (gun out) starts the reload');
  await sim(2.1);
  assert((await G(() => window.__app.current.weapons.current.mag)) === 15, 'reload refills magazine');


  // grenade near dummy[1] (strafing about (8, 0, 15)) via d-pad right (3.2.0; was up); the preset may have picked another gadget
  const g0 = await G(() => {
    window.__app.current.weapons.gadgets.select('frag');
    return window.__app.current.weapons.grenades;
  });
  await aimAt(8, 2.5, 15);
  await press(page, BTN.RIGHT);
  assert((await G(() => window.__app.current.weapons.grenades)) === g0 - 1, 'd-pad right throws a grenade');
  await sim(2.8);
  // explosive barrel chain: shoot the barrel at (26.9, 0, 11.3); the other at (25.7, 0, 11.3) is 1.2 m away
  const barrels0 = await G(() => window.__app.current.world.props.props.filter((p) => p.kind === 'explosiveBarrel' && p.alive).length);
  await G(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(26.9, 0, 16.6), Math.PI); });
  await sim(0.3);
  await G(() => window.__app.input.state.tap('swapNext')); // pistol -> rifle
  await sim(1.3);
  const bp = await G(() => { const p = window.__app.current.world.props.props.filter((q) => q.kind === 'explosiveBarrel' && q.alive).sort((a, b) => Math.hypot(a.node.position.x - 26.9, a.node.position.z - 11.3) - Math.hypot(b.node.position.x - 26.9, b.node.position.z - 11.3))[0]; return [p.node.position.x, p.node.position.y, p.node.position.z]; });
  await aimAt(bp[0], bp[1], bp[2]);
  await sim(1.2, [[BTN.RT, 1]]);
  console.log('    barrel shot:', await G(() => { const g = window.__app.current; const l = g.weapons.lastShot; const f = (v) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`; return `${g.weapons.current.def.id} ${l.target} origin ${f(l.origin)} aim ${f(l.aim)} hit ${f(l.hit)} hp=${g.world.props.props.filter((q) => q.kind === 'explosiveBarrel').map((q) => q.hp.toFixed(0) + '@' + f(q.node.position)).join(' ')}`; }), JSON.stringify(bp));
  await sim(0.5);
  const barrels1 = await G(() => window.__app.current.world.props.props.filter((p) => p.kind === 'explosiveBarrel' && p.alive).length);
  assert(barrels1 < barrels0, `shooting an explosive barrel detonates it (${barrels0} -> ${barrels1})`);

  // player damage + death + respawn: blow a barrel next to the player
  const hpBefore = await G(() => window.__app.current.target.health.hp);
  await G(() => { const g = window.__app.current; g.explosions.explode(g.player.position.add(new g.player.position.constructor(1, 0.3, 0)), 6, 400, 50, 'neutral', ''); });
  await sim(0.2);
  const alive = await G(() => window.__app.current.target.alive);
  assert(!alive, `point-blank explosion downs the player (had ${hpBefore})`);
  await sim(3.5);
  assert(await G(() => window.__app.current.target.alive && window.__app.current.target.health.hp === 100), 'player respawns at full health');
  const hud = await G(() => ({ mag: document.querySelector('.w-mag')?.textContent, name: document.querySelector('.w-name')?.textContent }));
  assert(!!hud.mag && !!hud.name, `HUD shows weapon + ammo (${hud.name} ${hud.mag})`);
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-combat-fail.png' });
} finally {
  console.log(errors.length ? 'console problems:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
}
