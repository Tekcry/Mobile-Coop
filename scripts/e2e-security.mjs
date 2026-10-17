// Kestrel S1: the CCTV cameras on the debug map seclab (`?autostart=seclab&mode=sandbox`).
// Part A (cameras): a player walking in the lit strip is detected within the S0 time (SN08 + 0.5 s) and standing still within
// the slowest lit case (SN09 + 0.5 s); a player crouched in the dark corner is not; the panning camera misses a player during its
// far pause and sees the same player at the near pause; a shot camera (the weapon ray hook) stops detecting.
// Part B adds the desk and panel checks (switch off at the panel, a manned desk alerts its guard).
// `node scripts/e2e-security.mjs [url]`
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'autostart=seclab&mode=sandbox' });
const G = (f, a) => page.evaluate(f, a);

// S0 section 5: SN08 lit detection walking at 10 m, SN09 crouched still lit at 10 m, SN67 test tolerance
const SN08 = 1.3;
const SN09 = 9;
const TOL = 0.5;
const LIT = 0.6; // F24
const SHADOW = 0.28; // F24

try {
  await page.waitForFunction(() => window.__app.current?.security, null, { timeout: 120000 });
  await frames(page, 10);
  await G(() => {
    const a = window.__app;
    const g = a.current;
    a.loop.manual = true;
    g.target.health.invulnerable = true;
    const c = g.player.controller;
    const V = g.player.position.constructor;
    const st = a.input.state;
    const sec = g.security;
    window.__s = {
      sec,
      reset() {
        st.releaseAll();
        st.setMove('t', 0, 0);
        c['crouchToggled'] = false;
        for (const cam of sec.cameras) {
          cam.mode = 'online';
          cam.clock = 0;
          cam.meters.clear();
        }
      },
      tp(x, z, yaw) {
        c.teleport(new V(x, 0, z), yaw);
        g.player.cam.yaw = yaw;
        g.player.cam.pitch = 0;
      },
      crouch(v) {
        c['crouchToggled'] = v;
      },
      step(s) {
        a.loop.stepHeadless(s, 120);
      },
      meter(id) {
        return sec.meterOf(id, 'local')?.meter ?? 0;
      },
      head() {
        const v = new V();
        g.target.headPoint(v);
        return v;
      },
      light: () => g.lightLevel,
    };
  });
  // run a function in the page with the helper object (window.__s) as its argument
  const S = (f) => page.evaluate(`(${f.toString()})(window.__s)`);

  // ---- boot ------------------------------------------------------------------------------------------------------------------------
  const boot = await G(() => {
    const g = window.__app.current;
    return { map: g.world.map.id, cams: g.security.cameras.map((c) => c.def.id), modes: g.security.cameras.map((c) => c.mode), enemies: g.enemyMgr === null };
  });
  assert(boot.map === 'seclab' && boot.cams.join() === 'cam-fixed,cam-pan', `seclab boots with the fixed and the panning camera (${JSON.stringify(boot)})`);
  assert(boot.modes.every((m) => m === 'online'), 'both cameras start online');

  // ---- lit strip, walking: detected within SN08 + 0.5 s ------------------------------------------------------------------------------
  console.log('lit strip, walking');
  await S((s) => {
    s.reset();
    s.tp(11, 7, -Math.PI / 2);
    s.step(0.6);
  });
  const lit = await S((s) => s.light());
  assert(lit > 0.6, `the lit strip reads lit (light ${lit.toFixed(2)} above ${LIT})`);
  const walk = await G(() => {
    const s = window.__s;
    s.sec.cameras[0].meters.clear();
    const st = window.__app.input.state;
    let t = 0;
    let covered = false;
    let reached = -1;
    st.setMove('t', 0, 1);
    for (let i = 0; i < 60; i++) {
      s.step(0.05);
      t += 0.05;
      const h = s.head();
      covered = covered || s.sec.cameras[0].covers(h.x, h.y, h.z);
      if (s.meter('cam-fixed') >= 1) {
        reached = t;
        break;
      }
    }
    st.setMove('t', 0, 0);
    return { reached, covered };
  });
  assert(walk.covered, 'the walker is inside the fixed camera frame');
  assert(walk.reached > 0 && walk.reached <= SN08 + TOL, `walking in the lit strip is detected in ${walk.reached.toFixed(2)} s (S0: ${SN08} s + ${TOL})`);

  // ---- lit strip, standing still ------------------------------------------------------------------------------------------------------
  console.log('lit strip, standing still');
  await S((s) => {
    s.reset();
    s.tp(11, 7, -Math.PI / 2);
    s.step(0.6);
  });
  const still = await G(() => {
    const s = window.__s;
    s.sec.cameras[0].meters.clear();
    let t = 0;
    let reached = -1;
    for (let i = 0; i < 400; i++) {
      s.step(0.05);
      t += 0.05;
      if (s.meter('cam-fixed') >= 1) {
        reached = t;
        break;
      }
    }
    return reached;
  });
  assert(still > 0 && still <= SN09 + TOL, `standing still in the lit strip is detected in ${still.toFixed(2)} s (slowest lit case ${SN09} s + ${TOL})`);

  // ---- dark corner, crouched ---------------------------------------------------------------------------------------------------------
  console.log('dark corner, crouched');
  await S((s) => {
    s.reset();
    s.tp(10, 1.5, -Math.PI / 2);
    s.crouch(true);
    s.step(1);
  });
  const dark = await G(() => {
    const s = window.__s;
    s.sec.cameras[0].meters.clear();
    let max = 0;
    let covered = false;
    for (let i = 0; i < 300; i++) {
      s.step(0.05);
      const h = s.head();
      covered = covered || s.sec.cameras[0].covers(h.x, h.y, h.z);
      max = Math.max(max, s.meter('cam-fixed'));
    }
    return { max, covered, light: s.light(), crouched: window.__app.current.player.controller.crouched };
  });
  assert(dark.crouched && dark.covered, 'the crouched player is inside the fixed camera frame');
  assert(dark.light < SHADOW, `the dark corner reads dark (light ${dark.light.toFixed(2)} below ${SHADOW})`);
  assert(dark.max < 0.05, `crouched in the dark corner for 15 s is not detected (meter max ${dark.max.toFixed(2)})`);

  // ---- the panning camera: far pause misses, near pause sees ------------------------------------------------------------------------
  console.log('panning camera');
  await S((s) => {
    s.reset();
    s.tp(14, 12, Math.PI / 2);
    s.step(0.6);
    // restart the sweep: the first pause (2 s) is at the far end (yaw 190), looking south of the pad
    const pan = s.sec.camera('cam-pan');
    pan.clock = 0;
    pan.meters.clear();
  });
  const far = await G(() => {
    const s = window.__s;
    const pan = s.sec.camera('cam-pan');
    const out = { cover: false, max: 0, yawDeg: 0 };
    for (let i = 0; i < 36; i++) {
      s.step(0.05);
      const h = s.head();
      out.cover = out.cover || pan.covers(h.x, h.y, h.z);
      out.max = Math.max(out.max, s.meter('cam-pan'));
      out.yawDeg = (pan.yaw * 180) / Math.PI;
    }
    return out;
  });
  assert(Math.abs(far.yawDeg - 190) < 1, `the far pause holds yaw 190 (${far.yawDeg.toFixed(1)})`);
  assert(!far.cover && far.max === 0, `the panning camera misses the player during its far pause (covered ${far.cover}, meter ${far.max.toFixed(2)})`);
  const near = await G(() => {
    const s = window.__s;
    const pan = s.sec.camera('cam-pan');
    // the sweep reaches yaw 270 at 2 + 80 / 15 s and holds it for 2 s
    pan.clock = 2 + 80 / 15 + 0.1;
    let cover = false;
    for (let i = 0; i < 38; i++) {
      s.step(0.05);
      const h = s.head();
      cover = cover || pan.covers(h.x, h.y, h.z);
    }
    return { cover, meter: s.meter('cam-pan'), yawDeg: (pan.yaw * 180) / Math.PI, light: s.light() };
  });
  assert(near.light > LIT, `the pad reads lit (light ${near.light.toFixed(2)})`);
  assert(near.cover && near.meter > 0.3, `at the near pause (yaw ${near.yawDeg.toFixed(0)}) the same player is seen (meter ${near.meter.toFixed(2)})`);

  // ---- a shot camera stops detecting --------------------------------------------------------------------------------------------------
  console.log('shot camera');
  const shot = await G(() => {
    const s = window.__s;
    s.reset();
    const g = window.__app.current;
    const V = g.player.position.constructor;
    // a ray that passes 0.35 m over the housing misses; one through it destroys the camera (the real weapon ray hook)
    g.weapons.onRay(new V(5, 3.35, 7), new V(-1, 3.35, 7));
    const missed = s.sec.camera('cam-fixed').mode;
    g.weapons.onRay(new V(5, 3, 7), new V(-1, 3, 7));
    return { missed, after: s.sec.camera('cam-fixed').mode, other: s.sec.camera('cam-pan').mode };
  });
  assert(shot.missed === 'online', 'a shot over the housing leaves the camera online');
  assert(shot.after === 'destroyed' && shot.other === 'online', 'a shot through the housing destroys that camera only');
  await S((s) => {
    s.tp(11, 7, -Math.PI / 2);
    s.step(0.6);
    s.sec.camera('cam-fixed').meters.clear();
  });
  const dead = await G(() => {
    const s = window.__s;
    const st = window.__app.input.state;
    let max = 0;
    st.setMove('t', 0, 1);
    for (let i = 0; i < 60; i++) {
      s.step(0.05);
      max = Math.max(max, s.meter('cam-fixed'));
    }
    st.setMove('t', 0, 0);
    return max;
  });
  assert(dead === 0, `a walker in the lit strip is not detected by the shot camera (meter ${dead.toFixed(2)})`);

  const errs = errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e));
  assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
} catch (e) {
  console.error(e);
  failed = true;
}
await browser.close();
if (failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-security OK');
