// Character controller test on Proving Grounds via the fake gamepad.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
let failed = false;
const P = () => page.evaluate(() => { const c = window.__app.current.player.controller; return { x: c.pos.x, y: c.pos.y, z: c.pos.z, crouched: c.crouched, rolling: c.isRolling, grounded: c.grounded }; });
const tp = (x, y, z, yaw = 0) => page.evaluate(([x, y, z, yaw]) => { const p = window.__app.current.player; p.controller.teleport(new p.controller.pos.constructor(x, y, z), yaw); p.cam.yaw = yaw; p.cam.pitch = 0; }, [x, y, z, yaw]);
/** Hold the left stick for a duration measured in simulated time (fixed steps), robust to slow frames. */
async function hold(ax, ay, seconds) {
  await page.evaluate(([x, y]) => { window.__pad.axis(0, x); window.__pad.axis(1, y); }, [ax, ay]);
  const maxY = await page.evaluate((s) => new Promise((res) => {
    const st = window.__app.current; let t = 0; let maxY = -99;
    const orig = st.fixedUpdate.bind(st);
    st.fixedUpdate = (dt) => { orig(dt); t += dt; maxY = Math.max(maxY, st.player.controller.pos.y); if (t >= s) { st.fixedUpdate = orig; res(maxY); } };
  }), seconds);
  await page.evaluate(() => { window.__pad.axis(0, 0); window.__pad.axis(1, 0); });
  await frames(page, 3);
  return maxY;
}
const settle = (s = 0.6) => hold(0, 0, s);
try {
  await page.evaluate(() => window.__pad.connect());
  await press(page, BTN.LS); // reveal pad (sprint click is harmless)
  await settle(0.5);
  const p0 = await P();
  assert(p0.grounded && Math.abs(p0.y) < 0.1, `spawned on ground (y=${p0.y.toFixed(2)})`);

  await hold(0, -1, 1.0);
  const p1 = await P();
  const walked = p1.z - p0.z;
  assert(walked > 2.3 && walked < 3.6, `jogs ~3.5 m/s forward incl. ease-in (${walked.toFixed(2)} m in 1 s)`);

  // jump
  await settle();
  await page.evaluate(() => window.__pad.set(0, 1));
  let maxY = 0;
  for (let i = 0; i < 12; i++) { await frames(page, 1); maxY = Math.max(maxY, (await P()).y); }
  await page.evaluate(() => window.__pad.set(0, 0));
  await settle(1);
  assert(maxY > 0.3 && maxY < 0.7, `modest jump (peak ${maxY.toFixed(2)} m)`);
  assert((await P()).grounded, 'lands again');

  // crouch toggle (B while still)
  await press(page, BTN.B);
  await settle(0.3);
  assert((await P()).crouched, 'B crouches (toggle)');
  await press(page, BTN.B);
  await settle(0.3);
  assert(!(await P()).crouched, 'B again stands');

  // roll: B while moving
  await page.evaluate(() => { window.__pad.axis(1, -1); });
  await frames(page, 4);
  await page.evaluate(() => window.__pad.set(1, 1));
  let rolled = false;
  for (let i = 0; i < 10 && !rolled; i++) { await frames(page, 1); rolled = (await P()).rolling; }
  await page.evaluate(() => { window.__pad.set(1, 0); window.__pad.axis(1, 0); });
  assert(rolled, 'B while moving rolls');
  await settle(1);

  // step test row at x=-22, blocks at z=-14 (0.15) .. step z+3.2 each; approach from +x side moving -x
  const stepCase = async (z, h, expectUp) => {
    await tp(-19.5, 0, z, -Math.PI / 2);
    await settle(0.3);
    const peak = await hold(0, -1, 1.1);
    const up = peak > h - 0.05;
    assert(up === expectUp, `step ${h} m: ${expectUp ? 'climbed' : 'blocked'} (peak y=${peak.toFixed(2)})`);
  };
  await stepCase(-14, 0.15, true);
  await stepCase(-10.8, 0.3, true);
  await stepCase(-7.6, 0.42, true);
  await stepCase(-4.4, 0.6, false);

  // slopes at x=21 rising toward +z; ramps centred z=-12, -6, 0 with len 5
  const slopeCase = async (zc, deg, expectUp) => {
    await tp(21, 0, zc - 3.6, 0);
    await settle(0.3);
    const peak = await hold(0, -1, 1.8);
    const top = Math.tan((deg * Math.PI) / 180) * 5;
    const ok = expectUp ? peak > Math.min(top, 6) * 0.6 : peak < 1.2;
    assert(ok, `${deg}° slope: ${expectUp ? 'walkable' : 'too steep'} (peak y=${peak.toFixed(2)})`);
  };
  await slopeCase(4, 20, true);
  await slopeCase(12, 35, true);
  await slopeCase(20, 55, false);

  // stairs onto platform: stairs at x=8.2,z=16 descending toward +x (yaw -90 means rising toward -x)
  await tp(13, 0, 16, -Math.PI / 2);
  await settle(0.3);
  const sp = await hold(0, -1, 3.8);
  assert(sp > 2.45, `stairs reach platform (peak y=${sp.toFixed(2)})`);

  // crouch tunnel (roof at 1.4): walk in crouched, cannot stand inside
  await tp(-10.75, 0, -26, 0);
  await settle(0.3);
  await press(page, BTN.B);
  await hold(0, -1, 2.2);
  const pt = await P();
  assert(pt.z > -24.5, `crouch-walks into tunnel (z=${pt.z.toFixed(2)})`);
  await press(page, BTN.B);
  await settle(0.3);
  assert((await P()).crouched, 'stays crouched under the roof');

  // physics props: walking into a crate moves it
  const crate0 = await page.evaluate(() => { const p = window.__app.current.world.props.props.find((q) => q.kind === 'smallCrate'); return { x: p.node.position.x, z: p.node.position.z }; });
  await tp(crate0.x, 0, crate0.z - 2.5, 0);
  await settle(0.3);
  await hold(0, -1, 1.2);
  const crate1 = await page.evaluate(() => { const p = window.__app.current.world.props.props.find((q) => q.kind === 'smallCrate'); return { x: p.node.position.x, z: p.node.position.z }; });
  const moved = Math.hypot(crate1.x - crate0.x, crate1.z - crate0.z);
  assert(moved > 0.15, `player pushes props (${moved.toFixed(2)} m)`);
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-move-fail.png' });
} finally {
  console.log(errors.length ? 'console problems:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
}
