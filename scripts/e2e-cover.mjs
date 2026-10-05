// Cover system on Proving Grounds (fake gamepad + keyboard): snap, strafe + edge stop, aim over low
// cover, blind fire, release, vault, high-cover edge peek with shoulder swap, outside-corner pivot,
// auto-snap setting, HUD prompt and touch button. Also the new movement speeds.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
let failed = false;
const G = (f, a) => page.evaluate(f, a);
const P = () => G(() => { const g = window.__app.current; const c = g.player.controller; return { x: c.pos.x, y: c.pos.y, z: c.pos.z, crouched: c.crouched, state: g.cover.state, low: g.cover.low, seg: g.cover.seg?.id ?? -1, shoulder: g.player.cam.shoulder, spread: g.weapons.spreadMul }; });
const tp = (x, z, yaw) => G(([x, z, yaw]) => { const g = window.__app.current; g.cover.reset(); const p = g.player; p.controller.teleport(new p.controller.pos.constructor(x, 0, z), yaw); p.cam.yaw = yaw; p.cam.pitch = 0; }, [x, z, yaw]);
/** Run simulated time with sticks/buttons set, then release them. */
async function sim(seconds, { lx = 0, ly = 0, buttons = [] } = {}) {
  await G(([lx, ly, b]) => { window.__pad.axis(0, lx); window.__pad.axis(1, ly); for (const i of b) window.__pad.set(i, 1); }, [lx, ly, buttons]);
  await G((s) => new Promise((res) => {
    const st = window.__app.current; let t = 0;
    const orig = st.fixedUpdate.bind(st);
    st.fixedUpdate = (dt) => { orig(dt); t += dt; if (t >= s) { st.fixedUpdate = orig; res(); } };
  }), seconds);
  await G((b) => { window.__pad.axis(0, 0); window.__pad.axis(1, 0); for (const i of b) window.__pad.set(i, 0); }, buttons);
  await frames(page, 2);
}
async function holdCover() {
  await G(() => window.__pad.set(1, 1));
  for (let i = 0; i < 60; i++) {
    await frames(page, 1);
    if ((await P()).state !== 'none') break;
  }
  await G(() => window.__pad.set(1, 0));
  await sim(0.4);
}
const near = (a, b, e) => Math.abs(a - b) <= e;
try {
  await G(() => window.__pad.connect());
  await press(page, BTN.LS);
  await sim(0.4);

  console.log('movement speeds');
  await tp(0, -30, 0);
  await sim(0.3);
  let a = await P();
  await sim(1.5, { ly: -1 });
  let b = await P();
  let v = (b.z - a.z) / 1.5;
  assert(v > 2.6 && v < 3.6, `full stick jogs ~3.5 m/s incl. ease-in (${v.toFixed(2)})`);
  await tp(0, -30, 0);
  await sim(0.3);
  a = await P();
  await sim(1.5, { ly: -0.55 });
  b = await P();
  v = (b.z - a.z) / 1.5;
  assert(v > 0.6 && v < 1.6, `light stick walks (${v.toFixed(2)} m/s)`);
  await tp(0, -30, 0);
  await sim(0.3);
  a = await P();
  await sim(2, { ly: -1, buttons: [BTN.LS] });
  b = await P();
  v = (b.z - a.z) / 2;
  assert(v > 4.2 && v < 5.6, `sprint ~5.5 m/s after wind-up (${v.toFixed(2)})`);
  const blocked = await G(() => window.__app.current.player.controller.weaponBlocked);
  assert(blocked, 'weapon lowered during sprint recovery');
  await sim(0.4);
  assert(!(await G(() => window.__app.current.player.controller.weaponBlocked)), 'weapon ready after recovery');

  console.log('low cover');
  // low cover at x=-5 (faces at x = -4.7 / -5.3), z -8..-4; stand east of it facing west
  await tp(-3.7, -6, -Math.PI / 2);
  await sim(0.3);
  const cand = await G(() => !!window.__app.current.cover.candidate);
  assert(cand, 'cover candidate found in reach');
  await frames(page, 3);
  const prompt = await G(() => document.querySelector('.hud-cover.show')?.textContent ?? '');
  assert(/cover/i.test(prompt), `HUD shows cover prompt (${prompt})`);
  await holdCover();
  let c = await P();
  assert(c.state === 'in' && c.low && c.crouched, `B-hold snaps into low cover crouched (${JSON.stringify(c)})`);
  assert(near(c.x, -4.7 + 0.35, 0.08), `flush with standoff (x=${c.x.toFixed(2)})`);
  const badge = await G(() => document.querySelector('.hud-cover-state.show')?.textContent ?? '');
  assert(/low cover/i.test(badge), `state badge (${badge})`);
  // strafe right on screen (camera faces -x, so right is +z) to the far edge
  await sim(2.5, { lx: 1 });
  c = await P();
  assert(c.state === "in" && near(c.z, -4.22, 0.12), `strafes along the face and stops at the edge (${JSON.stringify(c)}, ${await G(() => window.__app.current.cover.sm.reason)})`);
  assert(near(c.x, -4.35, 0.08), `keeps the standoff while moving (x=${c.x.toFixed(2)})`);
  await sim(1.2, { lx: -1 });
  c = await P();
  assert(c.z < -4.6, `strafes back (z=${c.z.toFixed(2)})`);
  // aim over the top
  await sim(0.5, { buttons: [BTN.LT] });
  await G(() => window.__pad.set(6, 1));
  await sim(0.3);
  c = await P();
  assert(c.state === 'peek' && !c.crouched, `aiming pops up over low cover (${c.state}, crouched ${c.crouched})`);
  await G(() => window.__pad.set(6, 0));
  await sim(0.3);
  c = await P();
  assert(c.state === 'in' && c.crouched, 'release drops back down');
  // blind fire
  await G(() => window.__pad.set(7, 1));
  await sim(0.3);
  c = await P();
  assert(c.state === 'blind' && c.spread === 3 && c.crouched, `fire without aiming = blind fire, crouched (${JSON.stringify(c)})`);
  await G(() => window.__pad.set(7, 0));
  await sim(0.5);
  c = await P();
  assert(c.state === 'in', 'blind fire ends when the trigger is released');
  // leave with B tap: no stray crouch toggle
  await press(page, BTN.B);
  await sim(0.4);
  c = await P();
  assert(c.state === 'none' && !c.crouched, `B leaves cover standing (${c.state}, crouched ${c.crouched})`);
  // vault
  await holdCover();
  await press(page, BTN.A);
  await sim(0.9);
  c = await P();
  assert(c.state === 'none' && c.x < -5.4 && Math.abs(c.y) < 0.15, `A vaults over low cover (x=${c.x.toFixed(2)} y=${c.y.toFixed(2)})`);

  console.log('high cover');
  // high cover at x=-10 (faces x = -9.75 / -10.25), z 0..4; stand east facing west
  await tp(-8.8, 2.5, -Math.PI / 2);
  await sim(0.3);
  await holdCover();
  c = await P();
  assert(c.state === 'in' && !c.low && !c.crouched, `snaps into high cover standing (${JSON.stringify(c)})`);
  await sim(1.5, { lx: 1 });
  c = await P();
  const sh0 = c.shoulder;
  await G(() => window.__pad.set(6, 1));
  await sim(0.8);
  c = await P();
  assert(c.state === 'peek' && c.z > 4.05, `aim at the edge leans out past it (z=${c.z.toFixed(2)})`);
  const peekShoulder = c.shoulder;
  await G(() => window.__pad.set(6, 0));
  await sim(0.8);
  c = await P();
  assert(c.state === 'in' && c.z < 4.0, `releasing aim returns into cover (z=${c.z.toFixed(2)})`);
  assert(c.shoulder === sh0, `shoulder restored after peeking (peek ${peekShoulder}, now ${c.shoulder})`);

  console.log('outside corner');
  // building 10 x 6 at (0,16): +x face at x=5 (z 13..19); corner to the +z face at z=19
  await tp(5.9, 17.5, -Math.PI / 2);
  await sim(0.3);
  await holdCover();
  c = await P();
  const seg0 = c.seg;
  assert(c.state === 'in' && !c.low, `snaps to the building wall (${JSON.stringify(c)})`);
  for (let i = 0; i < 20; i++) {
    await sim(0.35, { lx: 1 });
    c = await P();
    if (c.seg !== seg0) break;
  }
  await sim(0.5);
  c = await P();
  assert(c.state === 'in' && c.seg !== seg0 && near(c.z, 19.35, 0.1), `pushing past the edge pivots round the outside corner onto the next face (seg ${seg0}->${c.seg}, z=${c.z.toFixed(2)})`);

  console.log('auto snap + touch button');
  await G(() => window.__app.settings.update((s) => void (s.gameplay.autoCover = true)));
  await tp(-2.6, -6, -Math.PI / 2);
  await sim(1.2, { ly: -1 });
  c = await P();
  assert(c.state === 'in', `auto-snap on approach when enabled (${c.state})`);
  await G(() => window.__app.settings.update((s) => void (s.gameplay.autoCover = false)));
  const btn = await G(() => { const el = window.__app.input.touch.elements.get('cover'); return el ? !el.classList.contains('tc-hidden') : false; });
  assert(btn, 'touch cover button visible in cover');
  // keyboard C toggles out
  await page.keyboard.press('KeyC');
  await sim(0.3);
  assert((await P()).state === 'none', 'keyboard C leaves cover');
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: '/tmp/e2e-cover-fail.png' });
}
const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
if (real.length) {
  failed = true;
  console.error(real.join('\n'));
} else console.log('no console errors');
await browser.close();
process.exit(failed ? 1 : 0);
