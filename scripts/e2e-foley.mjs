// Movement foley (CC0 sprite): the sprite decodes and lines up, walking plays one step per real foot plant (not a
// timer), a sprint plants faster than a walk, a drop plays a landing, and the footstep noise guards hear is unchanged
// (the foley is cosmetic). Test Chamber (anim lane x 9 to 21 at z 20), fake gamepad, headless audio.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=chamber&gear=none' });
let failed = false;
const G = (f, a) => page.evaluate(f, a);
const tp = (x, y, z, yaw = 0) => G(([x, y, z, yaw]) => { const p = window.__app.current.player; p.controller.teleport(new p.controller.pos.constructor(x, y, z), yaw); p.cam.yaw = yaw; p.cam.pitch = 0; }, [x, y, z, yaw]);
/** Simulate `s` seconds holding the stick, counting foot plants, foley steps and the loudest footstep noise. */
const walk = (ax, ay, s) =>
  G(([ax, ay, s]) => new Promise((res) => {
    window.__pad.axis(0, ax);
    window.__pad.axis(1, ay);
    const app = window.__app;
    const st = app.current;
    const p0 = st.player.footPlants;
    const f0 = app.foley.stats.steps;
    let t = 0;
    let noise = 0;
    const orig = st.fixedUpdate.bind(st);
    st.fixedUpdate = (dt) => {
      orig(dt);
      t += dt;
      noise = Math.max(noise, st.noise);
      if (t >= s) {
        st.fixedUpdate = orig;
        window.__pad.axis(0, 0);
        window.__pad.axis(1, 0);
        res({ plants: st.player.footPlants - p0, steps: app.foley.stats.steps - f0, noise, speed: st.player.controller.speed });
      }
    };
  }), [ax, ay, s]);
try {
  await G(() => window.__pad.connect());
  await G(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
  await press(page, BTN.RS);
  // a key press is the user gesture that starts WebAudio (F8 is bound to nothing)
  await page.keyboard.press('F8');
  await page.waitForFunction(() => window.__app.foley.stats.loaded || window.__app.foley.stats.failed, null, { timeout: 30000 });
  const st = await G(() => ({ ...window.__app.foley.stats, running: window.__app.audio.running }));
  assert(st.loaded && !st.failed, `foley sprite decoded (${st.decodeMs} ms)`);
  assert(st.running, 'audio running');
  assert(Math.abs(st.shift) < 0.06, `sprite alignment shift ${(st.shift * 1000).toFixed(1)} ms is small`);

  // the move suite's open lane (sprint test): heading +x from (9, 0, 20)
  await tp(9, 0, 20, Math.PI / 2);
  await walk(0, 0, 0.5);
  // a walk (CT speed 3 = 2.0 m/s: the gear cap is set to 3 here, `gear=none` leaves the run; full stick)
  await G(() => window.__app.current.player.controller.gears.set(3));
  const w = await walk(0, -1, 2.5);
  console.log(`  walk: ${w.plants} plants, ${w.steps} foley steps, speed ${w.speed.toFixed(2)}, noise ${w.noise.toFixed(2)} m`);
  assert(w.plants >= 4, `walking plants feet (${w.plants})`);
  assert(Math.abs(w.steps - w.plants) <= 1, `one foley step per foot plant (${w.steps} / ${w.plants})`);
  await walk(0, 0, 2.6); // (CT M1: the frozen stance holds 1.7 s, then squares up with a step)
  // standing still: no steps at all after the settle
  const still = await walk(0, 0, 1.5);
  assert(still.steps === 0, `standing still is silent (${still.steps})`);
  // (CT prototype M1: no sprint) the top speed, 4.2 m/s: maximum gear 5, full stick
  await tp(9, 0, 20, Math.PI / 2);
  await walk(0, 0, 0.5);
  await G(() => window.__app.current.player.controller.gears.set(5));
  const s = await walk(0, -1, 2.5);
  await G(() => window.__app.current.player.controller.gears.set(3));
  console.log(`  sprint: ${s.plants} plants, ${s.steps} foley steps, speed ${s.speed.toFixed(2)}, noise ${s.noise.toFixed(2)} m`);
  // (G2b) the gait cadence is the same walking and running now (about 3.2 plants a second in both), so a run is a longer stride, not more plants
  assert(s.plants >= w.plants && s.speed > 3.6 && s.speed / s.plants > w.speed / w.plants, `a sprint (${s.speed.toFixed(1)} m/s) plants at least as often as a walk and strides further (${s.plants} / ${w.plants} plants)`);
  assert(Math.abs(s.steps - s.plants) <= 1, `one foley step per sprint plant (${s.steps} / ${s.plants})`);
  // noise rises with the speed (G40)
  assert(s.noise > w.noise, `noise rises with speed: run ${s.noise.toFixed(1)} m, walk ${w.noise.toFixed(1)} m`);
  await walk(0, 0, 1);

  // a drop from 1.5 m: a soft landing plays the landing foley
  const p = await G(() => { const c = window.__app.current.player.controller; return { x: c.pos.x, y: c.pos.y, z: c.pos.z }; });
  const l0 = await G(() => window.__app.foley.stats.landings);
  await tp(p.x, p.y + 1.5, p.z);
  await walk(0, 0, 1.2);
  const land = await G(() => ({ n: window.__app.foley.stats.landings, kind: window.__app.current.player.controller.lastLanding }));
  assert(land.n > l0, `a drop plays a landing (${land.kind})`);
  await frames(page, 3);
  assert(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
} catch (e) {
  console.error(e);
  failed = true;
}
await browser.close();
if (failed || process.exitCode) process.exit(1);
console.log('\nfoley e2e passed');
