// Gadgets on the night Warehouse (Clear rules): the wheel (hold opens it, time slows, the stick picks, release
// selects; touch taps a slot), the held gadget button's predicted arc, sleeping gas (knock-out), flashbang (blind
// then alert, white-out when facing it), EMP (lights out, back after), noisemaker (lure), sticky cam (feed view,
// lure ping, gas, exit), tri-rotor drone (flies, dart knock-out, battery), proximity mine.
// `node scripts/e2e-gadgets.mjs [url] [--only=name]`
import { launch, assert } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '';
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'autostart=warehouse&mode=clear' });
const G = (f, a) => page.evaluate(f, a);
try {
  await page.waitForTimeout(800);
  await G(() => {
    const a = window.__app;
    const g = a.current;
    a.loop.manual = true;
    g.target.health.invulnerable = true;
    g.mode.pending.length = 0;
    const em = g.enemyMgr;
    const V = g.player.position.constructor;
    const st = a.input.state;
    const c = g.player.controller;
    window.__t = {
      V,
      reset() {
        g.gadgets.clearWorld();
        em.clear();
        g.cover.reset();
        g.traversal.reset();
        st.releaseAll();
        st.setMove('t', 0, 0);
        for (const k of ['grenade', 'gadgetWheel', 'fire', 'interact', 'crouch']) st.set('t', k, false);
        g.weapons.gadgets.restock();
        g.weapons.gadgets.select('frag');
        a.loop.timeScale = 1;
        a.loop.stepHeadless(0.9, 120);
      },
      tp(x, y, z, yaw, pitch = 0) {
        c.teleport(new V(x, y, z), yaw);
        g.player.cam.yaw = yaw;
        g.player.cam.pitch = pitch;
      },
      spawn(x, z, yaw, y = 0) {
        return em.spawn('grunt', new V(x, y, z), false, yaw);
      },
      step(s) {
        a.loop.stepHeadless(s, 120);
      },
      tap(k) {
        st.set('t', k, true);
        a.loop.stepHeadless(1 / 60, 120);
        st.set('t', k, false);
        a.loop.stepHeadless(1 / 60, 120);
      },
      /** A gadget of `kind` going off at (x, y, z) now (thrown with no speed, short fuse). */
      blast(kind, x, y, z) {
        g.grenades.throw(new V(x, y, z), new V(0, 0, 0), 'player', 'local', undefined, true, kind, '#fff', 0.05);
      },
    };
  });
  const scen = async (name, f) => {
    if (only && !name.includes(only)) return;
    console.log(name);
    await G(() => window.__t.reset());
    await f();
  };

  await scen('wheel', async () => {
    const r = await G(() => {
      const t = window.__t;
      const a = window.__app;
      const g = a.current;
      const st = a.input.state;
      // pad / keyboard: held open, the stick picks
      a.input.setMode('gamepad');
      t.tp(2, 0, -2.2, 0);
      t.step(0.3);
      const p0 = g.player.position.clone();
      st.set('t', 'gadgetWheel', true);
      t.step(0.25);
      const open = g.gadgets.wheelOpen;
      const slow = a.loop.timeScale;
      const shown = document.querySelector('.gadget-wheel:not([hidden])') !== null;
      // right on the stick: slot 2 (flashbang); the operator does not walk meanwhile
      st.setMove('t', 1, 0);
      t.step(0.4);
      const slot = g.gadgets.wheelSlot;
      const hl = document.querySelector('.gw-slot.hl')?.dataset.id ?? '';
      const moved = Math.hypot(g.player.position.x - p0.x, g.player.position.z - p0.z);
      st.set('t', 'gadgetWheel', false);
      t.step(0.05);
      st.setMove('t', 0, 0);
      const sel = g.weapons.gadgets.selected;
      const closed = !g.gadgets.wheelOpen && document.querySelector('.gadget-wheel:not([hidden])') === null;
      const back = a.loop.timeScale;
      // a tap (no hold) does not open it
      st.set('t', 'gadgetWheel', true);
      t.step(1 / 60);
      st.set('t', 'gadgetWheel', false);
      t.step(0.1);
      const tapOpen = g.gadgets.wheelOpen;
      // touch: the wheel opens on a press and a tapped slot selects
      a.input.setMode('touch');
      g.gadgets.openWheel();
      g.gadgets.wheelSlot = -1;
      g.frameUpdate(0, 1);
      document.querySelector('.gw-slot[data-id="emp"]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      const touchSel = g.weapons.gadgets.selected;
      const touchClosed = !g.gadgets.wheelOpen;
      return { open, slow, shown, slot, hl, moved, sel, closed, back, tapOpen, touchSel, touchClosed };
    });
    assert(r.open && r.shown && r.slow < 0.5, `holding the wheel button opens the wheel and slows time (x${r.slow})`);
    assert(r.slot === 2 && r.hl === 'flash' && r.moved < 0.05, `the stick picks a slot (${r.slot} ${r.hl}); the operator stays put (${r.moved.toFixed(2)} m)`);
    assert(r.sel === 'flash' && r.closed && r.back === 1, `releasing selects it (${r.sel}), closes and restores time (x${r.back})`);
    assert(!r.tapOpen, 'a quick tap does not open the wheel');
    assert(r.touchSel === 'emp' && r.touchClosed, `touch: tapping a slot selects it (${r.touchSel})`);
  });

  await scen('arc', async () => {
    const r = await G(() => {
      const t = window.__t;
      const a = window.__app;
      const g = a.current;
      const st = a.input.state;
      t.tp(2, 0, -2.2, 0, 0.2);
      t.step(0.3);
      const n0 = g.weapons.gadgets.counts.frag;
      st.set('t', 'grenade', true);
      t.step(0.3);
      g.frameUpdate(1 / 120, 1);
      const dots = g.gadgets['arcDots'].filter((d) => d.isVisible).length;
      const ring = g.gadgets['arcRing']?.isVisible ?? false;
      const aiming = g.gadgets.aiming;
      st.set('t', 'grenade', false);
      t.step(0.05);
      g.frameUpdate(1 / 120, 1);
      const hidden = g.gadgets['arcDots'].every((d) => !d.isVisible);
      t.step(1.4);
      const n1 = g.weapons.gadgets.counts.frag;
      return { dots, ring, aiming, hidden, n0, n1 };
    });
    assert(r.aiming && r.dots >= 10 && r.ring, `holding the gadget button shows the predicted arc (${r.dots} dots, landing ring ${r.ring})`);
    assert(r.hidden && r.n1 === r.n0 - 1, `releasing throws (frags ${r.n0} -> ${r.n1}) and hides the arc`);
  });

  await scen('gas', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      t.tp(2, 0, -6, 0);
      const e = t.spawn(2, 0.5, 0);
      const far = t.spawn(9, 0.5, 0);
      t.step(0.3);
      t.blast('gas', 2.3, 0.2, 0.8);
      t.step(2.2);
      const ko = !e.alive && em.bodies.some((b) => !b.lethal);
      return { ko, farAlive: far.alive, gassed: g.gadgets.stats.gassed };
    });
    assert(r.ko && r.gassed >= 1, `sleeping gas knocks a guard out (non-lethal, ${r.gassed})`);
    assert(r.farAlive, 'a guard outside the cloud is untouched');
  });

  await scen('flash', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      // the operator looks at it; the guard faces it
      t.tp(2, 0, -4, 0, 0);
      const e = t.spawn(2, 2, Math.PI);
      t.step(0.3);
      const calm = !e.alerted;
      t.blast('flash', 2, 0.6, -0.5);
      t.step(0.15);
      const blind = e.blindT;
      const white = g.post['flash'];
      t.step(blind + 0.3);
      return { calm, blind, white, alerted: e.alerted, level: e.level, bt: e.blindT, alive: e.alive, blinded: g.gadgets.stats.blinded };
    });
    assert(r.calm && r.blind > 1.5, `a flashbang blinds a guard facing it (${r.blind.toFixed(2)} s)`);
    assert(r.alerted, `once his eyes clear he is alert (${JSON.stringify(r)})`);
    assert(r.white > 0.3, `the operator looking at it is whited out (${r.white.toFixed(2)})`);
  });

  await scen('emp', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const reg = g.world.level.lights;
      const l = reg.lights.find((q) => q.electric && q.on && !q.destroyed && q.kind !== 'flashlight');
      t.tp(l.x, 0, l.z - 3, 0);
      t.step(0.2);
      const on0 = reg.countOn();
      t.blast('emp', l.x, Math.max(0.5, l.y - 1.5), l.z);
      t.step(0.2);
      const on1 = reg.countOn();
      const off = !l.on;
      t.step(9);
      return { on0, on1, off, back: l.on, n: g.gadgets.stats.empLights };
    });
    assert(r.off && r.on1 < r.on0, `an EMP puts the lights round it out (${r.on0} -> ${r.on1})`);
    assert(r.back, 'they come back after its duration');
  });

  await scen('noise', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.tp(2, 0, -6, 0);
      // (facing away from the operator: only the noise reaches him)
      const e = t.spawn(9, 4, Math.PI / 2);
      t.step(0.3);
      // thrown at the floor a few metres ahead
      g.weapons.onThrow('noise', new t.V(2, 1.5, -5.5), new t.V(0, 2, 5));
      t.step(2.5);
      return { stuck: g.gadgets.noisers.length, pulses: g.gadgets.stats.pulses, level: e.level };
    });
    assert(r.stuck === 1 && r.pulses >= 1, `a noisemaker sticks and pulses (${r.pulses})`);
    assert(r.level === 'suspicious' || r.level === 'investigating', `a guard in earshot comes to check it (${r.level}), not to a fight`);
  });

  await scen('sticky cam', async () => {
    const r = await G(() => {
      const t = window.__t;
      const a = window.__app;
      const g = a.current;
      const st = a.input.state;
      t.tp(2, 0, -6, 0);
      const e = t.spawn(4, 3, Math.PI);
      t.step(0.3);
      const p0 = g.player.position.clone();
      g.weapons.onThrow('stickyCam', new t.V(2, 1.5, -5.5), new t.V(0, 2, 5));
      t.step(1);
      const view = g.gadgets.remote;
      g.frameUpdate(1 / 120, 1);
      const cam = g.gadgets.cams[0];
      const camAt = cam ? Math.hypot(g.player.cam.camera.position.x - cam.p.x, g.player.cam.camera.position.z - cam.p.z) : 99;
      const feed = document.querySelector('.gadget-feed:not([hidden])') !== null;
      // the stick does not walk the operator
      st.setMove('t', 0, 1);
      t.step(0.5);
      st.setMove('t', 0, 0);
      const moved = Math.hypot(g.player.position.x - p0.x, g.player.position.z - p0.z);
      t.tap('fire');
      const pings = g.gadgets.stats.pings;
      t.tap('interact');
      t.step(2);
      const gasKo = !e.alive || g.gadgets.clouds.length > 0;
      t.tap('crouch');
      t.step(0.1);
      g.frameUpdate(1 / 120, 1);
      const back = g.gadgets.remote === null && document.querySelector('.gadget-feed:not([hidden])') === null;
      return { view, camAt, feed, moved, pings, gasKo, back, cams: g.gadgets.cams.length };
    });
    assert(r.cams === 1 && r.view === 'cam' && r.feed && r.camAt < 0.3, `a sticky cam sticks and its feed opens (camera ${r.camAt.toFixed(2)} m from it)`);
    assert(r.moved < 0.1, `the operator stays put while watching (${r.moved.toFixed(2)} m)`);
    assert(r.pings === 1 && r.gasKo, `fire pings a lure (${r.pings}), Y releases its gas`);
    assert(r.back, 'B returns to the operator');
  });

  await scen('drone', async () => {
    const r = await G(() => {
      const t = window.__t;
      const a = window.__app;
      const g = a.current;
      const st = a.input.state;
      t.tp(2, 0, -6, 0);
      t.step(0.3);
      g.weapons.gadgets.select('drone');
      const p0 = g.player.position.clone();
      t.tap('grenade');
      const view = g.gadgets.remote;
      const d = g.gadgets.drone;
      const s0 = { x: d.s.x, z: d.s.z };
      d.pitch = 0;
      st.setMove('t', 0, 1);
      t.step(0.8);
      st.setMove('t', 0, 0);
      t.step(0.3);
      const flew = Math.hypot(d.s.x - s0.x, d.s.z - s0.z);
      const moved = Math.hypot(g.player.position.x - p0.x, g.player.position.z - p0.z);
      // a guard ahead: look at him and dart
      const e = t.spawn(d.s.x, d.s.z + 4, Math.PI);
      t.step(0.3);
      const dx = e.pos.x - d.s.x;
      const dz = e.pos.z - d.s.z;
      const dy = e.pos.y + 1.2 - d.s.y;
      d.s.yaw = Math.atan2(dx, dz);
      d.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      t.tap('fire');
      t.step(0.2);
      const darted = !e.alive;
      // flat battery: it drops, the view comes back
      d.s.battery = 0.05;
      t.step(0.2);
      return { view, flew, moved, darted, gone: g.gadgets.drone === null, back: g.gadgets.remote === null, darts: g.gadgets.stats.darts };
    });
    assert(r.view === 'drone', 'the drone launches into its view');
    assert(r.flew > 2.5 && r.moved < 0.1, `it flies on the stick (${r.flew.toFixed(2)} m), the operator stays (${r.moved.toFixed(2)} m)`);
    assert(r.darted && r.darts === 1, 'a stun dart knocks a guard out');
    assert(r.gone && r.back, 'a flat battery drops it and returns to the operator');
  });

  await scen('mine', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.tp(2, 0, -6, 0);
      t.step(0.3);
      g.weapons.gadgets.select('mine');
      t.tap('grenade');
      const placed = g.gadgets.mines.length;
      const m = g.gadgets.mines[0];
      t.tp(2, 0, -12, 0);
      t.step(1.7);
      const e = t.spawn(m.p.x + 0.6, m.p.z, 0);
      t.step(0.3);
      return { placed, dead: !e.alive, left: g.gadgets.mines.length };
    });
    assert(r.placed === 1, 'a mine is placed at the feet');
    assert(r.dead && r.left === 0, 'once armed a guard stepping near sets it off');
  });

  const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
  assert(real.length === 0, `no console errors (${real.join(' | ')})`);
} catch (e) {
  failed = true;
  console.error(String(e));
}
await browser.close();
process.exit(failed ? 1 : 0);
