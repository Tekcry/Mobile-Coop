// Character controller test on Proving Grounds via the fake gamepad.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
// (gear=none: the real spawn gear, 3)
const { browser, page, errors } = await launch({ url, params: 'autostart=proving&gear=none' });
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

  // 3.2.0 Chaos Theory speed gears: spawn in gear 3; D-pad up / down step one gear; full stick = the gear's cap
  const GEAR = () => page.evaluate(() => window.__app.current.player.controller.gear);
  assert((await GEAR()) === 3, `spawns in gear 3 (${await GEAR()})`);
  const setGear = async (n) => {
    for (let i = 0; i < 6 && (await GEAR()) > n; i++) await press(page, BTN.DOWN);
    for (let i = 0; i < 6 && (await GEAR()) < n; i++) await press(page, BTN.UP);
    return GEAR();
  };
  const speedAt = async (x, y, s = 0.8) => {
    await page.evaluate(([x, y]) => { window.__pad.axis(0, x); window.__pad.axis(1, y); }, [x, y]);
    await sim(s);
    return SPD();
  };
  /** Mean ground speed over `s` seconds of simulation (the stride swell averages out). */
  const meanSpeed = (s) => page.evaluate((s) => new Promise((res) => {
    const st = window.__app.current; let t = 0; let sum = 0; let n = 0;
    const orig = st.fixedUpdate.bind(st);
    st.fixedUpdate = (dt) => { orig(dt); t += dt; sum += st.player.controller.speed; n++; if (t >= s) { st.fixedUpdate = orig; res(sum / n); } };
  }), s);
  const STAND = [0.8, 1.3, 2.0, 2.8, 3.8, 5.0];
  const CROUCH = [0.5, 0.9, 1.3, 1.8, 2.3, 2.8];
  for (const crouched of [false, true]) {
    for (let g = 1; g <= 6; g++) {
      await tp(-10, 0, -14, Math.PI / 2);
      await settle(0.2);
      if (crouched && !(await P()).crouched) await press(page, BTN.B);
      if (!crouched && (await P()).crouched) await press(page, BTN.B);
      const got = await setGear(g);
      await page.evaluate(() => { window.__pad.axis(0, 0); window.__pad.axis(1, -1); });
      await sim(0.25);
      const v = await meanSpeed(0.5);
      const want = (crouched ? CROUCH : STAND)[g - 1];
      assert(got === g && Math.abs(v - want) < want * 0.06 + 0.03, `gear ${g} ${crouched ? 'crouched' : 'standing'}: ${v.toFixed(2)} m/s (cap ${want})`);
      await settle(0.2);
    }
  }
  if ((await P()).crouched) await press(page, BTN.B);
  // the stick scales the gear's cap (linear past a small dead zone); stance changes keep the gear
  await tp(-10, 0, -14, Math.PI / 2);
  await setGear(4);
  await settle(0.2);
  const half = await speedAt(0, -0.5);
  assert(half > 1.2 && half < 1.5, `half stick at gear 4: half the cap (${half.toFixed(2)} m/s)`);
  await press(page, BTN.B);
  const keptCrouched = await GEAR();
  await press(page, BTN.B);
  assert(keptCrouched === 4 && (await GEAR()) === 4, 'crouching and standing keep the gear');
  await settle(0.3);
  // not aiming the body faces where it goes: sideways runs at the full gear pace
  await tp(-10, 0, -14, Math.PI / 2);
  await settle(0.2);
  const side = await speedAt(1, 0);
  assert(side > 2.6, `pushing sideways turns and goes at the gear's pace, no strafe penalty when not aiming (${side.toFixed(2)} m/s)`);
  const faced = await page.evaluate(() => { const c = window.__app.current.player.controller; return Math.atan2(Math.sin(c.yaw - Math.atan2(c.motion.vx, c.motion.vz)), Math.cos(c.yaw - Math.atan2(c.motion.vx, c.motion.vz))); });
  assert(Math.abs(faced) < 0.1, `the body faces the travel direction (${faced.toFixed(2)} rad off)`);
  await settle(0.3);
  // aiming: strafe-locked, capped at 1.4 m/s, strafe x0.9, backstep x0.75
  await tp(0, 0, -2, 0);
  await settle(0.3);
  await page.evaluate(() => window.__pad.set(6, 1));
  const aimStrafe = await speedAt(1, 0, 1.0);
  const aimBack = await speedAt(0, 1, 1.0);
  await page.evaluate(() => window.__pad.set(6, 0));
  assert(aimStrafe > 1.1 && aimStrafe < 1.35, `aiming: strafe 90% of 1.4 (${aimStrafe.toFixed(2)} m/s)`);
  assert(aimBack > 0.9 && aimBack < 1.12, `aiming: backstep 75% of 1.4 (${aimBack.toFixed(2)} m/s)`);
  await settle();

  // instant stop: zero velocity on the step after the release; planted feet stay put (< 2 cm)
  await tp(-10, 0, -14, Math.PI / 2);
  await settle(0.3);
  await page.evaluate(() => { window.__pad.axis(0, 0); window.__pad.axis(1, -1); });
  await sim(0.83);
  const stop = await page.evaluate(() => new Promise((res) => {
    const a = window.__app;
    const st = a.current;
    const c = st.player.controller;
    const pl = st.player.rig.planner;
    const orig = st.fixedUpdate.bind(st);
    const before = c.speed;
    let released = false;
    let after = -1;
    let motion = -1;
    let n = 0;
    // planted feet from the release on: how far a foot moves while it stays planted
    const feet = [pl.L, pl.R];
    const pin = feet.map((f) => ({ x: f.x, z: f.z, c: f.contact }));
    let slide = 0;
    let raf = 0;
    const watch = () => {
      for (let k = 0; k < 2; k++) {
        const f = feet[k];
        const p = pin[k];
        if (p.c && f.contact) slide = Math.max(slide, Math.hypot(f.x - p.x, f.z - p.z));
        if (!f.contact || !p.c) { p.x = f.x; p.z = f.z; }
        p.c = f.contact;
      }
      raf = requestAnimationFrame(watch);
    };
    window.__pad.axis(1, 0);
    st.fixedUpdate = (dt) => {
      const zero = a.input.state.move.x === 0 && a.input.state.move.y === 0;
      orig(dt);
      if (zero && !released) {
        released = true;
        after = c.speed;
        motion = c.motion.speed;
        for (let k = 0; k < 2; k++) { pin[k].x = feet[k].x; pin[k].z = feet[k].z; pin[k].c = feet[k].contact; }
        watch();
      }
      if (released && ++n > 36) { st.fixedUpdate = orig; cancelAnimationFrame(raf); res({ before, after, motion, slide }); }
    };
  }));
  assert(stop.before > 2.5 && stop.after < 0.05 && stop.motion === 0, `instant stop: ${stop.before.toFixed(2)} m/s -> ${stop.after.toFixed(3)} m/s on the release step (driver ${stop.motion})`);
  assert(stop.slide < 0.02, `stopping: planted feet stay planted (${(stop.slide * 100).toFixed(2)} cm)`);
  // the stop holds the stride it stopped in until the next input: feet stay put, no kneel crouched; aiming lets go
  const held = await page.evaluate(() => new Promise((res) => {
    const st = window.__app.current;
    const c = st.player.controller;
    const pl = st.player.rig.planner;
    const p0 = [pl.L.x, pl.L.z, pl.R.x, pl.R.z];
    const orig = st.fixedUpdate.bind(st);
    let t = 0;
    st.fixedUpdate = (dt) => {
      orig(dt);
      t += dt;
      if (t >= 1.2) {
        st.fixedUpdate = orig;
        res({ hold: c.stopHold, moved: Math.hypot(pl.L.x - p0[0], pl.L.z - p0[1]) + Math.hypot(pl.R.x - p0[2], pl.R.z - p0[3]) });
      }
    };
  }));
  await page.evaluate(() => window.__pad.set(6, 1));
  await sim(0.3);
  const aimHold = await page.evaluate(() => window.__app.current.player.controller.stopHold);
  await page.evaluate(() => window.__pad.set(6, 0));
  assert(held.hold && held.moved < 0.01 && !aimHold, `the stop holds its stride for 1.2 s (feet moved ${(held.moved * 100).toFixed(2)} cm); aiming lets go (${aimHold})`);
  await settle(0.3);
  await tp(-10, 0, -14, Math.PI / 2);
  await press(page, BTN.B);
  await page.evaluate(() => { window.__pad.axis(1, -1); });
  await sim(0.6);
  await page.evaluate(() => { window.__pad.axis(1, 0); });
  await sim(1.0);
  const ch = await page.evaluate(() => { const c = window.__app.current.player.controller; return { hold: c.stopHold, kneel: c.kneeling, crouched: c.crouched }; });
  assert(ch.crouched && ch.hold && !ch.kneel, `a crouched stop holds the crouched stride (no kneel) (${JSON.stringify(ch)})`);
  await press(page, BTN.B);
  await settle(0.3);

  // forward roll: crouch tapped standing at gear 5-6 while moving; ~3 m in 0.7 s, comes up crouched, a little noise
  await tp(-10, 0, -14, Math.PI / 2);
  await setGear(5);
  await settle(0.3);
  await page.evaluate(() => { window.__pad.axis(0, 0); window.__pad.axis(1, -1); });
  await sim(0.4);
  const roll = await page.evaluate(() => new Promise((res) => {
    const st = window.__app.current;
    const c = st.player.controller;
    const tr = st.traversal;
    const orig = st.fixedUpdate.bind(st);
    const rolls0 = tr.forwardRolls;
    let t = 0;
    let t0 = -1;
    let t1 = -1;
    let x0 = 0;
    let x1 = 0;
    let noise = 0;
    window.__pad.set(1, 1);
    st.fixedUpdate = (dt) => {
      orig(dt);
      t += dt;
      if (t > 0.1) window.__pad.set(1, 0);
      if (t0 < 0 && tr.kind === 'roll') { t0 = t - dt; x0 = c.prevPos.x; }
      if (t0 >= 0 && t1 < 0) noise = Math.max(noise, st.evNoise);
      if (t0 >= 0 && t1 < 0 && tr.kind !== 'roll') { t1 = t - dt; x1 = c.prevPos.x; }
      if (t > 1.6) { st.fixedUpdate = orig; res({ rolls: tr.forwardRolls - rolls0, dur: t1 - t0, len: x1 - x0, crouched: c.crouched, gear: c.gear, noise }); }
    };
  }));
  await page.evaluate(() => { window.__pad.axis(1, 0); });
  assert(roll.rolls === 1 && Math.abs(roll.dur - 0.7) < 0.06 && roll.len > 2.6 && roll.len < 3.4, `crouch at gear 5: a forward roll (${roll.dur.toFixed(2)} s, ${roll.len.toFixed(2)} m)`);
  assert(roll.crouched && roll.gear === 5 && roll.noise >= 2 && roll.noise < 3, `the roll comes up crouched, keeps the gear, noise ${roll.noise.toFixed(1)} m`);
  await settle(0.3);
  await press(page, BTN.B);
  // at gear 3 crouch is just a crouch
  await tp(-10, 0, -14, Math.PI / 2);
  await setGear(3);
  await settle(0.2);
  await page.evaluate(() => { window.__pad.axis(1, -1); });
  await sim(0.4);
  const r0 = await page.evaluate(() => window.__app.current.traversal.forwardRolls);
  await press(page, BTN.B);
  await sim(0.2);
  const plain = await page.evaluate(() => ({ rolls: window.__app.current.traversal.forwardRolls, crouched: window.__app.current.player.controller.crouched }));
  await page.evaluate(() => { window.__pad.axis(1, 0); });
  assert(plain.rolls === r0 && plain.crouched, 'crouch at gear 3: crouches, no roll');
  await press(page, BTN.B);
  await setGear(4);
  await settle();

  // crouched set (open ground along z=-14)
  await tp(-10, 0, -14, Math.PI / 2);
  await settle(0.3);
  await press(page, BTN.B);
  await settle();
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
  // the step pulse (each footfall checks then pushes, rootDip 8%) lifts the peak a little over the 5 m/s mean
  assert(peak > 4.6 && peak < 5.5, `sprint reaches ~5 m/s (${peak.toFixed(2)} peak)`);
  assert(blocked && stood && still, `sprinting: weapon lowered, standing, still sprinting after 0.8 s (stamina-free)`);
  assert(!after.sprinting && after.speed < 0.1 && after.crouched, `releasing the stick ends the sprint, stops within 0.6 s, back in the crouch (speed ${after.speed.toFixed(2)})`);
  await press(page, BTN.B);
  await settle();

  // aiming while sprinting ends the sprint and raises the weapon (no need to release the stick)
  await tp(0, 0, -14, Math.PI / 2);
  await page.evaluate(() => { window.__pad.axis(1, -1); });
  await sim(0.3);
  await press(page, BTN.LS);
  await sim(0.5);
  const sprintBefore = await page.evaluate(() => window.__app.current.player.controller.sprinting);
  await page.evaluate(() => window.__pad.set(6, 1));
  await sim(0.5);
  const aimSprint = await page.evaluate(() => { const p = window.__app.current.player; return { sprinting: p.controller.sprinting, raise: p.carry.raise, speed: p.controller.speed }; });
  await page.evaluate(() => { window.__pad.set(6, 0); window.__pad.axis(1, 0); });
  await settle();
  assert(sprintBefore && !aimSprint.sprinting && aimSprint.raise > 0.85 && aimSprint.speed < 1.6, `aim while sprinting: sprint ends, weapon up (${aimSprint.raise.toFixed(2)}), aim pace (${aimSprint.speed.toFixed(2)} m/s)`);

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
    // sample the traversal kind every frame from the press on (a short drop can finish inside the press under load)
    await page.evaluate(() => {
      window.__kinds = new Set();
      window.__kindsT = setInterval(() => window.__kinds.add(window.__app.current.traversal.kind), 4);
    });
    await press(page, BTN.Y);
    for (let i = 0; i < 14; i++) { await sim(0.1); await page.evaluate(() => window.__kinds.add(window.__app.current.traversal.kind)); }
    const kinds = new Set(await page.evaluate(() => { clearInterval(window.__kindsT); return [...window.__kinds]; }));
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
