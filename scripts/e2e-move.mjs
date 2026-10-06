// Character controller test on Proving Grounds via the fake gamepad.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
let failed = false;
const P = () => page.evaluate(() => { const c = window.__app.current.player.controller; return { x: c.pos.x, y: c.pos.y, z: c.pos.z, crouched: c.crouched, grounded: c.grounded }; });
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
/** Simulate seconds with whatever the stick currently holds. */
const sim = (s) => page.evaluate((s) => new Promise((res) => {
  const st = window.__app.current; let t = 0;
  const orig = st.fixedUpdate.bind(st);
  st.fixedUpdate = (dt) => { orig(dt); t += dt; if (t >= s) { st.fixedUpdate = orig; res(); } };
}), s);
const SPD = () => page.evaluate(() => window.__app.current.player.controller.speed);
try {
  await page.evaluate(() => window.__pad.connect());
  // raw stick values map straight to magnitude (no dead zone or response curve) for exact speed bands
  await page.evaluate(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
  await press(page, BTN.RS); // reveal pad
  await settle(0.5);
  const p0 = await P();
  assert(p0.grounded && Math.abs(p0.y) < 0.1, `spawned on ground (y=${p0.y.toFixed(2)})`);

  // stealth speeds (analog): standing walk -> jog; crouched sneak -> crouch walk -> crouch run
  await hold(0, -1, 1.0);
  const p1 = await P();
  const ran = p1.z - p0.z;
  assert(ran > 2.3 && ran < 2.85, `full stick: a jog straight away (${ran.toFixed(2)} m in 1 s, 2.8 m/s target)`);
  const speedAt = async (x, y, s = 0.8) => {
    await page.evaluate(([x, y]) => { window.__pad.axis(0, x); window.__pad.axis(1, y); }, [x, y]);
    await sim(s);
    return SPD();
  };
  const walk = await speedAt(0, -0.5);
  assert(walk > 1.25 && walk < 1.5, `half stick walks (${walk.toFixed(2)} m/s)`);
  const slow = await speedAt(0, -0.28);
  assert(slow > 0.5 && slow < 0.95, `light stick: a slow walk (${slow.toFixed(2)} m/s)`);
  // not aiming the body faces where it goes: sideways and backwards run at full pace
  const side = await speedAt(1, 0);
  assert(side > 2.6, `pushing sideways turns and jogs, no strafe penalty when not aiming (${side.toFixed(2)} m/s)`);
  const faced = await page.evaluate(() => { const c = window.__app.current.player.controller; return Math.atan2(Math.sin(c.yaw - (c.pos.x !== undefined ? Math.atan2(c.motion.vx, c.motion.vz) : 0)), Math.cos(c.yaw - Math.atan2(c.motion.vx, c.motion.vz))); });
  assert(Math.abs(faced) < 0.1, `the body faces the travel direction (${faced.toFixed(2)} rad off)`);
  // aiming: strafe-locked, strafe x0.9, backstep x0.75 of 1.4
  await tp(0, 0, -2, 0);
  await settle(0.3);
  await page.evaluate(() => window.__pad.set(6, 1));
  const aimStrafe = await speedAt(1, 0, 1.0);
  const aimBack = await speedAt(0, 1, 1.0);
  await page.evaluate(() => window.__pad.set(6, 0));
  assert(aimStrafe > 1.1 && aimStrafe < 1.35, `aiming: strafe 90% of 1.4 (${aimStrafe.toFixed(2)} m/s)`);
  assert(aimBack > 0.9 && aimBack < 1.12, `aiming: backstep 75% of 1.4 (${aimBack.toFixed(2)} m/s)`);
  await settle();
  // crouched set (open ground along z=-14)
  await tp(-10, 0, -14, Math.PI / 2);
  await settle(0.3);
  await press(page, BTN.B);
  const crun = await speedAt(0, -1);
  const cwalk = await speedAt(0, -0.62);
  const sneak = await speedAt(0, -0.38);
  await settle();
  assert(crun > 2.4 && crun < 2.7, `crouched full stick: crouch run (${crun.toFixed(2)} m/s)`);
  assert(cwalk > 1.0 && cwalk < 1.9, `crouched mid stick: crouch walk (${cwalk.toFixed(2)} m/s)`);
  assert(sneak > 0.55 && sneak < 0.85, `crouched light stick: sneak (${sneak.toFixed(2)} m/s)`);

  // sprint: LS click while moving, immediate, stamina-free, stands you up; ends on releasing the stick
  // and returns to the crouch it interrupted
  await tp(0, 0, -14, Math.PI / 2);
  await page.evaluate(() => { window.__pad.axis(1, -1); });
  await sim(0.3);
  await press(page, BTN.LS);
  let peak = 0;
  let blocked = false;
  let stood = true;
  for (let i = 0; i < 8; i++) {
    await sim(0.1);
    peak = Math.max(peak, await SPD());
    blocked ||= await page.evaluate(() => window.__app.current.player.controller.weaponBlocked);
    stood &&= !(await P()).crouched;
  }
  const still = await page.evaluate(() => window.__app.current.player.controller.sprinting);
  await page.evaluate(() => { window.__pad.axis(1, 0); });
  await sim(0.6);
  const after = await page.evaluate(() => { const c = window.__app.current.player.controller; return { sprinting: c.sprinting, speed: c.speed, crouched: c.crouched }; });
  assert(peak > 4.6 && peak < 5.1, `sprint reaches ~5 m/s (${peak.toFixed(2)})`);
  assert(blocked && stood && still, `sprinting: weapon lowered, standing, still sprinting after 0.8 s (stamina-free)`);
  assert(!after.sprinting && after.speed < 0.1 && after.crouched, `releasing the stick ends the sprint, stops within 0.6 s, back in the crouch (speed ${after.speed.toFixed(2)})`);
  await press(page, BTN.B);
  await settle();

  // no free jump: jump in the open does nothing
  await tp(0, 0, -2, 0);
  await settle(0.3);
  await page.evaluate(() => window.__pad.set(0, 1));
  let maxY = 0;
  for (let i = 0; i < 12; i++) { await frames(page, 1); maxY = Math.max(maxY, (await P()).y); }
  await page.evaluate(() => window.__pad.set(0, 0));
  await settle(0.5);
  assert(maxY < 0.08, `no free jump in the open (peak ${maxY.toFixed(2)} m)`);

  // crouch toggle (B)
  await press(page, BTN.B);
  await settle(0.5);
  assert((await P()).crouched, 'B crouches (toggle)');
  const kneel = await page.evaluate(() => window.__app.current.player.controller.kneeling);
  assert(kneel, 'crouched and still: kneels');
  await press(page, BTN.B);
  await settle(0.4);
  assert(!(await P()).crouched, 'B again stands');

  // contextual traversal: vault low cover, climb onto a block, step onto a low block, drop off a ledge
  const traverse = async (x, y, z, yaw, label, expectKind, check) => {
    await tp(x, y, z, yaw);
    await settle(0.5);
    const hint = await page.evaluate(() => window.__app.current.traversal.hint?.kind ?? 'none');
    await press(page, BTN.A);
    const kinds = new Set();
    for (let i = 0; i < 14; i++) { await sim(0.1); kinds.add(await page.evaluate(() => window.__app.current.traversal.kind)); }
    await settle(0.8);
    const q = await P();
    assert(hint === expectKind && kinds.has(expectKind) && check(q), `${label} (hint ${hint}, at ${q.x.toFixed(2)},${q.y.toFixed(2)},${q.z.toFixed(2)})`);
  };
  await traverse(-3.8, 0, -6, -Math.PI / 2, 'jump at low cover vaults over it', 'vault', (q) => q.x < -5.4 && q.y < 0.1);
  await traverse(-19.9, 0, -1.2, -Math.PI / 2, 'jump at a 0.9 m block climbs onto it', 'mantle', (q) => q.y > 0.85);
  await traverse(-19.9, 0, -4.4, -Math.PI / 2, 'jump at a 0.6 m block steps up', 'step', (q) => q.y > 0.55);
  await traverse(0, 2.62, 18.4, 0, 'jump at a ledge drops down', 'drop', (q) => q.y < 0.3 && q.z > 19.3);

  // step test row at x=-22, blocks at z=-14 (0.15) .. step z+3.2 each; approach from +x side moving -x
  const stepCase = async (z, h, expectUp) => {
    await tp(-19.5, 0, z, -Math.PI / 2);
    await settle(0.3);
    const peak = await hold(0, -1, 3.2);
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
    const peak = await hold(0, -1, 6.5);
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
  const sp = await hold(0, -1, 10.5);
  assert(sp > 2.45, `stairs reach platform (peak y=${sp.toFixed(2)})`);

  // crouch tunnel (roof at 1.4): walk in crouched, cannot stand inside
  await tp(-10.75, 0, -26, 0);
  await settle(0.3);
  await press(page, BTN.B);
  await hold(0, -0.5, 3.0);
  const pt = await P();
  assert(pt.z > -24.5 && pt.z < -19.5, `crouch-walks into tunnel (z=${pt.z.toFixed(2)})`);
  await press(page, BTN.B);
  await settle(0.3);
  assert((await P()).crouched, 'stays crouched under the roof');

  // physics props: walking into a crate moves it
  const crate0 = await page.evaluate(() => { const p = window.__app.current.world.props.props.find((q) => q.kind === 'smallCrate'); return { x: p.node.position.x, z: p.node.position.z }; });
  await tp(crate0.x, 0, crate0.z - 2.5, 0);
  await settle(0.3);
  await hold(0, -1, 3.6);
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
