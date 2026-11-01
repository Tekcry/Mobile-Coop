// Character controller test on the Test Chamber (G2b) via the fake gamepad.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

// (anim-natural-n1, decision 5) the audit metrics and the foot's contact geometry for node (bundled as e2e-anim does)
const LIB = resolve('test-results/e2e-move/lib');
execFileSync(process.execPath, ['node_modules/esbuild/bin/esbuild', 'src/anim/audit/metrics.ts', 'src/anim/footGeom.ts', '--bundle', '--format=esm', '--entry-names=[name]', `--outdir=${LIB}`, '--log-level=warning'], { windowsHide: true, stdio: 'inherit' });
const M = await import(pathToFileURL(`${LIB}/metrics.js`).href);
const FG = await import(pathToFileURL(`${LIB}/footGeom.js`).href);
const FOOT = { back: FG.HEEL_BACK, down: FG.HEEL_DOWN, ball: FG.TOE_BALL };

const url = process.argv[2] ?? 'http://localhost:4173/';
// (gear=none: the real spawn cap, 5 = none; anim-rework S1)
const { browser, page, errors } = await launch({ url, params: 'autostart=studio&gear=none' });
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
    window.__ff();
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
  window.__ff();
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

  // (anim-rework S1, Michael 2026-10-20: "remove the speed toggle, and allow full speed control via the analogue stick
  // depending on how far you push the stick") no gears: the stick's deflection sets the speed through the STICK_SPEED
  // curve; the five named speeds sit at travel 0.15 / 0.45 / 0.8 / 0.9 / 0.97 past the dead zone. The internal cap
  // (tests only, `controller.gears`) spawns at 5 (none); D-pad up / down change nothing.
  const GEAR = () => page.evaluate(() => window.__app.current.player.controller.maxGear);
  assert((await GEAR()) === 5, `spawns with no speed cap (${await GEAR()})`);
  await press(page, BTN.DOWN);
  assert((await GEAR()) === 5, `D-pad down no longer steps a speed (${await GEAR()})`);
  const setGear = (n) => page.evaluate((n) => { const c = window.__app.current.player.controller; c.gears.set(n); return c.maxGear; }, n);
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
    window.__ff();
  }), s);
  // the five named speeds (creep / sneak / walk / jog / run) at their stick points (raw = (the dead zone 0.05 + 0.95 x travel) x 0.98)
  const STAND = [0.75, 1.4, 2.1, 3.0, 4.0]; // (anim-rework S2, M6: the run 4.5 -> 4.0)
  const CROUCH = [0.85, 1.3, 1.7, 2.15, 2.6];
  const AT = [0.15, 0.45, 0.8, 0.9, 0.985];
  for (const crouched of [false, true]) {
    for (let g = 1; g <= 5; g++) {
      await tp(9, 0, 20, Math.PI / 2);
      await settle(0.2);
      if (crouched && !(await P()).crouched) await press(page, BTN.B);
      if (!crouched && (await P()).crouched) await press(page, BTN.B);
      // (the pad's outer dead zone: 0.98 of the rim reads as full)
      const raw = (0.05 + 0.95 * AT[g - 1]) * 0.98;
      await page.evaluate((raw) => { window.__pad.axis(0, 0); window.__pad.axis(1, -raw); }, raw);
      await sim(0.6);
      const v = await meanSpeed(0.5);
      const g2 = await page.evaluate(() => window.__app.current.player.controller.gear);
      const want = (crouched ? CROUCH : STAND)[g - 1];
      assert(g2 === g && Math.abs(v - want) < want * 0.06 + 0.03, `stick ${raw.toFixed(2)} ${crouched ? 'crouched' : 'standing'}: ${v.toFixed(2)} m/s (named speed ${g}, ${want})`);
      await settle(0.2);
    }
  }
  if ((await P()).crouched) await press(page, BTN.B);
  // half stick: between the sneak and the walk (no snapping); the internal cap holds through stance changes
  await tp(9, 0, 20, Math.PI / 2);
  await setGear(4);
  await settle(0.2);
  const half = await speedAt(0, -0.5);
  assert(half > 1.3 && half < 1.6, `half stick: ~1.45 m/s, between the sneak and the walk (${half.toFixed(2)} m/s)`);
  await press(page, BTN.B);
  const keptCrouched = await GEAR();
  await press(page, BTN.B);
  assert(keptCrouched === 4 && (await GEAR()) === 4, 'crouching and standing keep the internal cap');
  await settle(0.3);
  // not aiming the body faces where it goes: sideways runs at the full gear pace
  await tp(9, 0, 20, Math.PI / 2);
  await settle(0.2);
  // (load-audit) measured in game time: the stick goes down inside the same step hook (no real frames between), a 0.5 s
  // game-time warm-up (the turn and the start), then the ground path walked over the next 0.3 s of the match clock
  // (`g.time`), positions and the clock read together in each step, speed = path / elapsed game time. Was the controller's
  // speed read after a wall-time round trip, which on a loaded page (sim at x0.3) read 0.00 m/s.
  const sidePace = await page.evaluate(([warm, win]) => new Promise((res) => {
    const st = window.__app.current;
    const c = st.player.controller;
    const orig = st.fixedUpdate.bind(st);
    window.__pad.axis(0, 1);
    window.__pad.axis(1, 0);
    const t0 = st.time;
    let tw = -1;
    let px = 0;
    let pz = 0;
    let path = 0;
    // (review) a stray pause stops `g.time` (fixedUpdate returns before it moves): 30 s real-time cap, resolving 0 m/s
    const w0 = performance.now();
    const cap = setInterval(() => {
      if (performance.now() - w0 < 30000) return;
      clearInterval(cap);
      st.fixedUpdate = orig;
      res({ v: 0, path, el: tw < 0 ? 0 : st.time - tw, spd: c.speed, crouched: c.crouched, move: [window.__app.input.state.move.x, window.__app.input.state.move.y] });
    }, 500);
    st.fixedUpdate = (dt) => {
      orig(dt);
      const t = st.time - t0;
      if (tw < 0) {
        if (t >= warm) { tw = st.time; px = c.pos.x; pz = c.pos.z; }
        return;
      }
      path += Math.hypot(c.pos.x - px, c.pos.z - pz);
      px = c.pos.x;
      pz = c.pos.z;
      const el = st.time - tw;
      if (el >= win) { clearInterval(cap); st.fixedUpdate = orig; res({ v: path / el, path, el, spd: c.speed, crouched: c.crouched, move: [window.__app.input.state.move.x, window.__app.input.state.move.y] }); }
    };
    window.__ff();
  }), [0.5, 0.3]);
  const side = sidePace.v;
  assert(side > 2.15 && sidePace.spd > 2.15, `pushing sideways turns and goes at the gear's pace, no strafe penalty when not aiming (${side.toFixed(2)} m/s: ${sidePace.path.toFixed(2)} m over ${sidePace.el.toFixed(2)} s game time after a 0.5 s warm-up; speed ${sidePace.spd.toFixed(2)}, crouched ${sidePace.crouched}, move ${sidePace.move.map((m) => m.toFixed(2)).join(',')})`);
  const faced = await page.evaluate(() => { const c = window.__app.current.player.controller; return Math.atan2(Math.sin(c.yaw - Math.atan2(c.motion.vx, c.motion.vz)), Math.cos(c.yaw - Math.atan2(c.motion.vx, c.motion.vz))); });
  assert(Math.abs(faced) < 0.1, `the body faces the travel direction (${faced.toFixed(2)} rad off)`);
  await settle(0.3);
  // aiming: strafe-locked, capped at 1.4 m/s, strafe x0.5 (anim-rework S3: the glide shuffle), backstep x0.75
  await tp(20, 0, 21, 0);
  await settle(0.3);
  await page.evaluate(() => window.__app.input.state.set('t', 'ads', true));
  const aimStrafe = await speedAt(1, 0, 1.0);
  const aimBack = await speedAt(0, 1, 1.0);
  await page.evaluate(() => window.__app.input.state.set('t', 'ads', false));
  // (anim-rework S1) the aim let go drops to low ready: an X tap holsters again
  await page.evaluate(() => window.__app.input.state.tap('draw'));
  assert(aimStrafe > 0.6 && aimStrafe < 0.78, `aiming: strafe 50% of 1.4 (${aimStrafe.toFixed(2)} m/s)`);
  assert(aimBack > 0.9 && aimBack < 1.12, `aiming: backstep 75% of 1.4 (${aimBack.toFixed(2)} m/s)`);
  await settle();

  // (step 22, M14 N6) a weighted stop: the pace eases to rest within CT.stopTime (0.25 s, + 2 steps); planted feet
  // stay put (< 2 cm)
  // (anim-natural-n1, decision 5) read at the contact points (metrics.ts contactSlide: the heel while the heel is down, the
  // ball while the ball is down), as e2e-anim's foot lock and turn block do: the planner holds a planted foot's contact
  // point (HOLD_CONTACT) and the heel-first roll moves the ankle round it (0.3 rad: 2.6 cm), which the planner's foot
  // (the ankle) read as slide. Limit unchanged (2 cm); stricter than before (master's planner reads 2.6 cm here).
  await tp(9, 0, 20, Math.PI / 2);
  await settle(0.3);
  await page.evaluate(() => { window.__pad.axis(0, 0); window.__pad.axis(1, -1); });
  await sim(0.83);
  const stop = await page.evaluate((F) => new Promise((res) => {
    const a = window.__app;
    const st = a.current;
    const c = st.player.controller;
    const pl = st.player.rig.planner;
    const orig = st.fixedUpdate.bind(st);
    const before = c.speed;
    let released = false;
    let after = -1;
    let motion = -1;
    let restT = -1;
    let relT = 0;
    let n = 0;
    // planted feet from the release on: how far a foot moves while it stays planted
    const feet = [pl.L, pl.R];
    const pin = feet.map((f) => ({ x: f.x, z: f.z, c: f.contact }));
    let slide = 0;
    let raf = 0;
    // the rendered heel / ball per frame and foot (footGeom's points under the ankle, along its own axes) and contact
    const pts = [0, 1].map(() => ({ heel: [], ball: [], contact: [] }));
    const ankles = [st.player.rig.ankleL, st.player.rig.ankleR];
    const watch = () => {
      for (let k = 0; k < 2; k++) {
        const f = feet[k];
        const p = pin[k];
        if (p.c && f.contact) slide = Math.max(slide, Math.hypot(f.x - p.x, f.z - p.z));
        if (!f.contact || !p.c) { p.x = f.x; p.z = f.z; }
        p.c = f.contact;
        const n = ankles[k];
        n.computeWorldMatrix(true);
        const m = n.getWorldMatrix().m;
        const ly = Math.hypot(m[4], m[5], m[6]) || 1;
        const lz = Math.hypot(m[8], m[9], m[10]) || 1;
        const pt = (y, z) => [m[12] + (m[4] / ly) * y + (m[8] / lz) * z, m[13] + (m[5] / ly) * y + (m[9] / lz) * z, m[14] + (m[6] / ly) * y + (m[10] / lz) * z];
        pts[k].heel.push(...pt(-F.down, -F.back));
        pts[k].ball.push(...pt(-F.down, F.ball));
        pts[k].contact.push(f.contact ? 1 : 0);
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
      if (released) {
        relT += dt;
        if (restT < 0 && c.speed < 1e-3) restT = relT;
      }
      if (released && ++n > 36) { st.fixedUpdate = orig; cancelAnimationFrame(raf); res({ before, after, motion, slide, restT, pts }); }
    };
  }), FOOT);
  assert(stop.before > 1.9 && stop.after < stop.before && stop.restT > 0.1 && stop.restT <= 0.25 + 2 / 60 + 1e-6, `weighted stop: ${stop.before.toFixed(2)} m/s eases to rest in ${stop.restT.toFixed(3)} s (${stop.after.toFixed(2)} m/s after the release step)`);
  const cs = stop.pts.map((q) => M.contactSlide(q.heel, q.ball, q.contact, 0.02));
  const cSlide = Math.max(cs[0].worst, cs[1].worst);
  assert(cs[0].plants + cs[1].plants >= 2 && cSlide < 0.02, `stopping: planted feet stay planted at the contact (${(cSlide * 100).toFixed(2)} cm, ankle ${(stop.slide * 100).toFixed(2)} cm, ${cs[0].plants + cs[1].plants} plants)`);
  // (step 22) after a stop the feet square up with at most a closing step, then stay put (the 3.2.0 stride hold is gone)
  const held = await page.evaluate(() => new Promise((res) => {
    const st = window.__app.current;
    const c = st.player.controller;
    const pl = st.player.rig.planner;
    let p0 = [pl.L.x, pl.L.z, pl.R.x, pl.R.z];
    const orig = st.fixedUpdate.bind(st);
    let t = 0;
    st.fixedUpdate = (dt) => {
      orig(dt);
      t += dt;
      if (t < 0.5) p0 = [pl.L.x, pl.L.z, pl.R.x, pl.R.z];
      if (t >= 1.2) {
        st.fixedUpdate = orig;
        res({ hold: c.stopHold, moved: Math.hypot(pl.L.x - p0[0], pl.L.z - p0[1]) + Math.hypot(pl.R.x - p0[2], pl.R.z - p0[3]) });
      }
    };
    window.__ff();
  }));
  await page.evaluate(() => window.__app.input.state.set('t', 'ads', true));
  await sim(0.3);
  const aimHold = false;
  await page.evaluate(() => window.__app.input.state.set('t', 'ads', false));
  // (CT prototype M1, G26 / G27) the frozen stance holds ~1.7 s after the stop, then eases to a feet-together idle; this window
  // may straddle the hold's end (prototype: revisit with a timed window), so: held feet stay put, else they squared up (< 30 cm)
  assert(!aimHold && (held.hold ? held.moved < 0.01 : held.moved < 0.3), `after the stop the feet stay frozen while the hold lasts, then square up (hold ${held.hold}, moved ${(held.moved * 100).toFixed(2)} cm)`);
  await settle(0.3);
  await tp(9, 0, 20, Math.PI / 2);
  await press(page, BTN.B);
  await page.evaluate(() => { window.__pad.axis(1, -1); });
  await sim(0.6);
  await page.evaluate(() => { window.__pad.axis(1, 0); });
  await sim(1.0);
  const ch = await page.evaluate(() => { const c = window.__app.current.player.controller; return { speed: c.speed, kneel: c.kneeling, crouched: c.crouched }; });
  assert(ch.crouched && ch.speed < 1e-3, `a crouched stop comes to rest crouched (${JSON.stringify(ch)})`);
  // ... from any pace: gear 1 crouched at half stick, and a stop out of a sprint
  await setGear(1);
  await page.evaluate(() => { window.__pad.axis(1, -0.5); });
  await sim(0.6);
  await page.evaluate(() => { window.__pad.axis(1, 0); });
  await sim(0.5);
  const slowHold = await page.evaluate(() => window.__app.current.player.controller.speed < 1e-3);
  await press(page, BTN.B);
  await setGear(5);
  await tp(9, 0, 20, Math.PI / 2);
  await settle(0.3);
  await page.evaluate(() => { window.__pad.axis(1, -1); });
  await sim(0.8);
  await page.evaluate(() => { window.__pad.axis(1, 0); });
  await sim(0.5);
  const sprintHold = await page.evaluate(() => { const c = window.__app.current.player.controller; return { hold: c.speed < 1e-3, pace: c.speed }; });
  assert(slowHold && sprintHold.hold, `a stop comes to rest from a crouched creep (${slowHold}) and out of a run within 0.5 s (${sprintHold.pace.toFixed(2)} m/s)`);
  if ((await P()).crouched) await press(page, BTN.B);
  // a pad stick springing back (through 0.6 / 0.25 / 0.08 over a few frames) is a release from the full pace
  await tp(9, 0, 20, Math.PI / 2);
  await settle(0.3);
  await page.evaluate(() => { window.__pad.axis(1, -1); });
  await sim(0.8);
  const spring = await page.evaluate(() => new Promise((res) => {
    const st = window.__app.current;
    const c = st.player.controller;
    const orig = st.fixedUpdate.bind(st);
    const seq = [-0.6, -0.25, -0.08, 0];
    let k = 0;
    let n = 0;
    const pace0 = c.speed;
    let minBefore = 99;
    st.fixedUpdate = (dt) => {
      if (k < seq.length) { window.__app.input.state.setMove('pad', 0, -seq[k]); window.__pad.axis(1, seq[k]); k++; }
      orig(dt);
      if (k < seq.length) minBefore = Math.min(minBefore, c.speed);
      if (++n > 30) { st.fixedUpdate = orig; res({ pace0, minBefore, hold: c.speed < 1e-3, pace: c.speed }); }
    };
    window.__ff();
  }));
  // (step 22) the release then eases to rest from the full pace (no early slow-down from the spring-back)
  assert(spring.hold && spring.minBefore > spring.pace0 * 0.85, `a stick springing back holds the full stride (${spring.pace0.toFixed(2)} -> held at ${spring.pace.toFixed(2)} m/s, never slowed under ${spring.minBefore.toFixed(2)})`);
  await settle(0.3);

  // forward roll (G32): crouch HELD standing at speed 5 while moving; ~2.3 m in 0.75 s, comes up crouched, a little noise
  await tp(9, 0, 20, Math.PI / 2);
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
      if (t > 0.3) window.__pad.set(1, 0);
      if (t0 < 0 && tr.kind === 'roll') { t0 = t - dt; x0 = c.prevPos.x; }
      if (t0 >= 0 && t1 < 0) noise = Math.max(noise, st.evNoise);
      if (t0 >= 0 && t1 < 0 && tr.kind !== 'roll') { t1 = t - dt; x1 = c.prevPos.x; }
      if (t > 1.6) { st.fixedUpdate = orig; res({ rolls: tr.forwardRolls - rolls0, dur: t1 - t0, len: x1 - x0, crouched: c.crouched, gear: c.gear, noise }); }
    };
    window.__ff();
  }));
  await page.evaluate(() => { window.__pad.axis(1, 0); });
  assert(roll.rolls === 1 && Math.abs(roll.dur - 0.75) < 0.06 && roll.len > 1.9 && roll.len < 2.7, `held crouch at speed 5: a forward roll (${roll.dur.toFixed(2)} s, ${roll.len.toFixed(2)} m)`);
  assert(roll.crouched && roll.gear === 5 && roll.noise >= 2 && roll.noise < 3, `the roll comes up crouched, keeps the gear, noise ${roll.noise.toFixed(1)} m`);
  await settle(0.3);
  await press(page, BTN.B);
  // at gear 3 crouch is just a crouch
  await tp(9, 0, 20, Math.PI / 2);
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
  await tp(9, 0, 20, Math.PI / 2);
  await settle(0.3);
  await press(page, BTN.B);
  await settle();
  // (CT prototype M1: no sprint) the top speed standing is the run: 4.0 m/s (G1 4.5, anim-rework S2 M6 4.0), standing, and it stops within 0.6 s of the release
  await press(page, BTN.B);
  await settle();
  await tp(9, 0, 20, Math.PI / 2);
  await setGear(5);
  await page.evaluate(() => { window.__pad.axis(1, -1); });
  await sim(0.6);
  let peak = 0;
  for (let i = 0; i < 8; i++) {
    await sim(0.1);
    peak = Math.max(peak, await SPD());
  }
  await page.evaluate(() => { window.__pad.axis(1, 0); });
  await sim(0.6);
  const after = await page.evaluate(() => { const c = window.__app.current.player.controller; return { speed: c.speed, crouched: c.crouched, hold: c.stopHold }; });
  // (anim-rework S2, M6 "full speed is too quick") the run 4.5 -> 4.0 m/s
  assert(peak > 3.75 && peak < 4.5, `the top speed reaches ~4.0 m/s (${peak.toFixed(2)} peak)`);
  assert(after.speed < 0.1 && !after.crouched && after.hold, `releasing the stick stops within 0.6 s, feet frozen in the stride (speed ${after.speed.toFixed(2)})`);
  await settle();

  // no free jump: jump in the open does nothing
  await tp(20, 0, 21, 0);
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
  // (G2b) the Test Chamber's pieces (spec 1.3): the low wall (x 4), the step row (z 0-1.2, blocks 0.42 / 0.6 / 0.9 at x 1 / 3 / 5),
  // the ledge wall (top 2.4)
  await traverse(5.2, 0, 17, -Math.PI / 2, 'jump at low cover vaults over it', 'vault', (q) => q.x < 3.6 && q.y < 0.1);
  await traverse(5.0, 0, 2.2, Math.PI, 'jump at a 0.9 m block climbs onto it', 'mantle', (q) => q.y > 0.85);
  await traverse(3.0, 0, 2.2, Math.PI, 'jump at a 0.6 m block steps up', 'step', (q) => q.y > 0.55);
  await traverse(4, 2.42, 25.6, Math.PI, 'jump at a ledge drops down', 'drop', (q) => q.y < 0.3 && q.z < 24.7);

  // step test row at z 0.6: blocks at x=1 (0.42) and x=3 (0.6); approach from z 2.5 walking -z
  const stepCase = async (x, h, expectUp) => {
    await tp(x, 0, 2.5, Math.PI);
    await settle(0.3);
    const peak = await hold(0, -1, 3.2);
    const up = peak > h - 0.05;
    assert(up === expectUp, `step ${h} m: ${expectUp ? 'climbed' : 'blocked'} (peak y=${peak.toFixed(2)})`);
  };
  await stepCase(1.0, 0.42, true);
  await stepCase(3.0, 0.6, false);

  // slopes rising toward +z from z 5.3: the 35 degree stairs (x 18) and the 55 degree ramp (x 20.2), both 2.5 m long
  const slopeCase = async (x, deg, expectUp) => {
    await tp(x, 0, 5.3, 0);
    await settle(0.3);
    const peak = await hold(0, -1, 6.5);
    const top = Math.tan((deg * Math.PI) / 180) * 2.5;
    const ok = expectUp ? peak > Math.min(top, 6) * 0.6 : peak < 1.2;
    assert(ok, `${deg}° slope: ${expectUp ? 'walkable' : 'too steep'} (peak y=${peak.toFixed(2)})`);
  };
  await slopeCase(18, 35, true);
  await slopeCase(20.2, 55, false);

  // stairs: walked to the top (1.75 m, less the 0.15 m nosing)
  await tp(18, 0, 5.3, 0);
  await settle(0.3);
  const sp = await hold(0, -1, 6.5);
  assert(sp > 1.6, `stairs reach their top (peak y=${sp.toFixed(2)})`);

  // crouch tunnel (roof at 1.4, z 11.5-14.5, the platform stands south of it): enter from the north, crouched, cannot stand inside
  await tp(1.2, 0, 15.6, Math.PI);
  await settle(0.3);
  await press(page, BTN.B);
  await hold(0, -0.5, 2.0);
  const pt = await P();
  assert(pt.z > 11.5 && pt.z < 14.5, `crouch-walks into tunnel (z=${pt.z.toFixed(2)})`);
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
