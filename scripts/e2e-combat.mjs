// Combat test on Proving Grounds (sandbox): hitscan, headshots, kills, reload, swap, projectile sniper,
// grenades, explosive barrel chain, player damage and respawn.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
let failed = false;
const G = (fn, arg) => page.evaluate(fn, arg);
/** Run simulation for `s` seconds of game time while holding pad buttons/axes. */
async function sim(s, setup) {
  await G(([s, setup]) => new Promise((res) => {
    const st = window.__app.current; let t = 0;
    const orig = st.fixedUpdate.bind(st);
    if (setup) for (const [k, v] of setup) window.__pad.set(k, v);
    st.fixedUpdate = (dt) => { orig(dt); t += dt; if (t >= s) { st.fixedUpdate = orig; if (setup) for (const [k] of setup) window.__pad.set(k, 0); res(); } };
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
  await G(() => { window.__pad.connect(); window.__app.settings.update((s) => { s.gamepad.aimAssist = 'off'; }); });
  await press(page, BTN.LS);
  await sim(0.4);
  const w0 = await G(() => window.__app.current.weapons.current.def.id);
  assert(w0 === 'rifle', `sandbox starts with rifle (${w0})`);

  // dummy[0] stands at (-4, 0, 8)
  const dummyHp = () => G(() => window.__app.current.dummies[0].health.hp);
  await G(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(-4.6, 0, 0), 0); });
  await sim(0.3);
  await aimAt(-4, 1.1, 8);
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
  await aimAt(-4, 1.68, 8);
  await press(page, BTN.LB); // swap prev -> pistol (semi)
  await sim(1.1);
  assert((await G(() => window.__app.current.weapons.current.def.id)) === 'pistol', 'LB swaps to previous weapon');
  await G(() => window.__pad.set(6, 1));
  await sim(0.5);
  // the ADS framing blend moves the camera: re-aim once it has settled, at the head volume's centre
  await sim(0.6);
  const head = await G(() => { const n = window.__app.current.dummies[0]['hitboxes']['headNode']; n.computeWorldMatrix(true); const v = n.getAbsolutePosition(); return [v.x, v.y, v.z]; });
  await aimAt(head[0], head[1], head[2]);
  await sim(0.15);
  await sim(0.05, [[BTN.RT, 1]]);
  await sim(0.2);
  await G(() => window.__pad.set(6, 0));
  console.log('    head shot:', await G(() => { const g = window.__app.current; const l = g.weapons.lastShot; const f = (v) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`; return `spread ${g.weapons['currentSpread']().toFixed(2)} ads ${g.player.cam.ads.toFixed(2)} spd ${g.player.controller.speed.toFixed(2)} bloom ${g.weapons['bloom'].toFixed(2)} ${l.target} origin ${f(l.origin)} aim ${f(l.aim)} hit ${f(l.hit)} headNode ${f(g.dummies[0]['hitboxes']['headNode'].position)} alive ${g.dummies[0].alive}`; }));
  const heads = await G(() => window.__app.current.weapons.tally.get('pistol')?.heads ?? 0);
  assert(heads >= 1, `head hitbox registers headshots (${heads})`);
  // semi-auto: holding RT fires once
  const pm0 = await G(() => window.__app.current.weapons.current.mag);
  await sim(0.5, [[BTN.RT, 1]]);
  const pm1 = await G(() => window.__app.current.weapons.current.mag);
  assert(pm0 - pm1 === 1, `semi-auto fires once per pull (${pm0} -> ${pm1})`);

  // reload
  await press(page, BTN.X);
  assert(await G(() => window.__app.current.weapons.reloading), 'X starts reload');
  await sim(2.1);
  assert((await G(() => window.__app.current.weapons.current.mag)) === 12, 'reload refills magazine');

  // sniper projectile (slot order rifle, smg, shotgun, sniper, pistol): pistol -> LB -> sniper
  await press(page, BTN.LB);
  await sim(1.1);
  assert((await G(() => window.__app.current.weapons.current.def.id)) === 'sniper', 'swap to sniper');
  await G(() => window.__app.current.dummies[3].health.reset());
  const d2 = await G(() => { const d = window.__app.current.dummies[3]; const v = d.aimPoint(d['pos'].clone()); return [v.x, v.y, v.z]; });
  await aimAt(d2[0], d2[1], d2[2]);
  await G(() => window.__pad.set(6, 1)); // ADS for accuracy
  await sim(0.7);
  await aimAt(d2[0], d2[1], d2[2]);
  await sim(0.15);
  if (process.env.DBG) console.log('    sniper pre:', await G((d2) => { const g = window.__app.current; const c = g.player.cam; const o = c.camera.position; const h = g.ballistics.ray(o, o.add(c.forward.scale(60)), 0xffff); return `spread ${g.weapons['currentSpread']().toFixed(2)} ads ${c.ads.toFixed(2)} raise ${g.player.carry.raise.toFixed(2)} canFire ${g.player.carry.canFire} ray ${h.target?.id ?? 'none'} ${h.distance.toFixed(1)} body ${g.player.controller.yaw.toFixed(2)} cam ${c.yaw.toFixed(2)} blocked ${g.player.controller.weaponBlocked}`; }, d2));
  // LT stays held (pad.set above): `sim` would release the buttons it is given at the end
  await sim(0.05, [[BTN.RT, 1]]);
  await sim(0.3);
  await G(() => window.__pad.set(6, 0));
  const shots = await G(() => window.__app.current.weapons.tally.get('sniper'));
  assert(shots.shots === 1 && shots.hits === 1, `sniper projectile travels and hits (${JSON.stringify(shots)})`);

  // grenade near dummy[1] at (3, 0, 10) via d-pad up (quick1)
  const g0 = await G(() => window.__app.current.weapons.grenades);
  await aimAt(3, 2.5, 10);
  await press(page, BTN.UP);
  assert((await G(() => window.__app.current.weapons.grenades)) === g0 - 1, 'd-pad up throws a grenade');
  await sim(2.8);
  // explosive barrel chain: shoot barrel at (-3, 0, -9); other barrel at (3, 0, -9) is 6 m away
  const barrels0 = await G(() => window.__app.current.world.props.props.filter((p) => p.kind === 'explosiveBarrel' && p.alive).length);
  await G(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(-3, 0, -3), Math.PI); });
  await sim(0.3);
  await press(page, BTN.RB); // sniper -> pistol
  await press(page, BTN.RB); // pistol -> rifle
  await sim(1.3);
  const bp = await G(() => { const p = window.__app.current.world.props.props.filter((q) => q.kind === 'explosiveBarrel' && q.alive).sort((a, b) => Math.hypot(a.node.position.x + 3, a.node.position.z + 9) - Math.hypot(b.node.position.x + 3, b.node.position.z + 9))[0]; return [p.node.position.x, p.node.position.y, p.node.position.z]; });
  await aimAt(bp[0], bp[1], bp[2]);
  await sim(1.2, [[BTN.RT, 1]]);
  console.log('    barrel shot:', await G(() => { const g = window.__app.current; const l = g.weapons.lastShot; const f = (v) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`; return `${g.weapons.current.def.id} ${l.target} origin ${f(l.origin)} aim ${f(l.aim)} hit ${f(l.hit)} hp=${g.world.props.props.filter((q) => q.kind === 'explosiveBarrel').map((q) => q.hp.toFixed(0) + '@' + f(q.node.position)).join(' ')}`; }), JSON.stringify(bp));
  await sim(0.5);
  const barrels1 = await G(() => window.__app.current.world.props.props.filter((p) => p.kind === 'explosiveBarrel' && p.alive).length);
  assert(barrels1 < barrels0, `shooting an explosive barrel detonates it (${barrels0} -> ${barrels1})`);

  // player damage + death + respawn: blow a barrel next to the player
  const hpBefore = await G(() => window.__app.current.target.health.hp + window.__app.current.target.health.shield);
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
