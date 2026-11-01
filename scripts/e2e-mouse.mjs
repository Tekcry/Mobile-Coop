// PC keyboard + mouse: the mouse is captured (pointer lock) in a match. A click on the game captures it
// (that click never fires) and hides the "click to capture" hint; captured, moving looks, left fires,
// right holds the aim (anim-rework S1), the wheel no longer steps a speed; losing the capture (Esc) pauses; clicking Resume
// captures it again. Every KBM verb raises its action; Controls remap. (Gameplay behaviour lives in the system suites.)
import { launch, openPage, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=chamber' });
let failed = false;

const st = () =>
  page.evaluate(() => {
    const g = window.__app.current;
    return {
      locked: !!document.pointerLockElement,
      hint: !document.querySelector('.mouse-capture-hint').hidden,
      fire: window.__app.input.state.down('fire'),
      yaw: g.player.cam.yaw,
      weapon: g.weapons.index,
      gear: g.player.controller.maxGear,
      paused: !g.simulating,
      mode: window.__app.input.mode,
    };
  });

try {
  await page.waitForTimeout(1200);
  let s = await st();
  // the match starts with a lock request; headless Chromium may grant it without a gesture
  assert(s.mode === 'kbm' && (s.locked ? !s.hint : s.hint), `match start: captured, or free with the hint shown (${JSON.stringify(s)})`);
  await page.mouse.move(640, 320);
  if (!s.locked) {
    await page.mouse.down();
    await page.waitForTimeout(100);
    s = await st();
    assert(s.locked && !s.hint && !s.fire, `a click captures the mouse and does not fire (${JSON.stringify(s)})`);
    await page.mouse.up();
  }
  const yaw0 = s.yaw;
  await page.mouse.move(760, 320, { steps: 6 });
  // (load-audit) was a fixed 200 ms wall wait then one read: at 2-3 fps the frame applying the move may not have run.
  // Wait (up to 30 s) for the frames to turn the camera, then read; the assert's limit is unchanged
  await page.waitForFunction((y0) => Math.abs(window.__app.current.player.cam.yaw - y0) > 0.1, yaw0, { timeout: 30000, polling: 50 }).catch(() => {});
  s = await st();
  assert(Math.abs(s.yaw - yaw0) > 0.1, `captured mouse movement looks (yaw ${yaw0.toFixed(2)} -> ${s.yaw.toFixed(2)})`);
  const mag = () => page.evaluate(() => window.__app.current.weapons.current.mag);
  const dwNow = () => page.evaluate(() => window.__app.current.weapons.drawPhase);
  const magA = await mag();
  const carryNow = () => page.evaluate(() => { const p = window.__app.current.player; return { raise: p.carry.raise, aiming: p.aiming }; });
  const c0 = await carryNow();
  await page.mouse.down();
  await page.waitForTimeout(100);
  assert((await st()).fire, 'left button fires while captured');
  // (step 09 fix 1) LMB held while holstered never raises the carry or sets aiming
  let raiseMax = c0.raise;
  let aimed = false;
  for (let i = 0; i < 5; i++) {
    const c = await carryNow();
    raiseMax = Math.max(raiseMax, c.raise);
    aimed = aimed || c.aiming;
    await page.waitForTimeout(50);
  }
  assert(raiseMax - c0.raise < 0.01 && !aimed, `LMB held while holstered: carry.raise and aiming unchanged (${c0.raise.toFixed(3)} -> max ${raiseMax.toFixed(3)}, aiming ${aimed})`);
  await page.mouse.up();
  await page.waitForTimeout(100);
  assert(!(await st()).fire, 'releasing the button stops firing');
  // (step 09) no hip fire: LMB alone fires nothing; RMB draws, then LMB fires
  const magB = await mag();
  assert(magB === magA && (await dwNow()) === 0, `LMB alone (holstered) fires nothing (${magA} -> ${magB})`);
  // (anim-rework S1) RMB is the held aim: held from holstered it draws straight to the aim (the sling draw), LMB then
  // fires; let go, the gun drops to low ready; X holsters
  await page.mouse.down({ button: 'right' });
  // (load-latent-ui1) was a poll of up to 8 s wall time: under CPU load the page runs a few frames a second and the
  // draw + aim framing took longer. Poll per frame until drawn, or until 4 s of the match clock AND the old 8 s of wall
  // time have both run (never shorter than before), 60 s real-time cap
  const tDraw = await page.evaluate(() => [window.__app.current.time, performance.now()]);
  await page.waitForFunction(([t0, w0]) => {
    const g = window.__app.current;
    return (g.weapons.drawPhase === 2 && g.player.cam.ads >= 0.9) || (g.time - t0 >= 4 && performance.now() - w0 >= 8000);
  }, tDraw, { timeout: 60000, polling: 'raf' }).catch(() => {});
  const drawn = await page.evaluate(() => { const g = window.__app.current; return g.weapons.drawPhase === 2 && g.player.cam.ads >= 0.9; });
  const dbg = await page.evaluate(() => { const g = window.__app.current; return { dw: g.weapons.drawPhase, cam: +g.player.cam.ads.toFixed(2), ads: g.player.ads, st: g.player.weaponState }; });
  assert(drawn, `RMB held draws and aims (${JSON.stringify(dbg)})`);
  // (software GL frames are slow: hold until a shot lands, up to 3 s)
  await page.mouse.down();
  for (let i = 0; i < 30 && (await mag()) >= magB; i++) await page.waitForTimeout(100);
  await page.mouse.up();
  const magC = await mag();
  assert(magC < magB, `aiming, LMB fires (${magB} -> ${magC})`);
  await page.mouse.up({ button: 'right' });
  let low = null;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(50);
    low = await page.evaluate(() => { const g = window.__app.current; return { st: g.player.weaponState, dw: g.weapons.drawPhase, ads: g.player.ads }; });
    if (low.st === 'lowReady') break;
  }
  assert(low.st === 'lowReady' && low.dw === 2 && !low.ads, `RMB let go: low ready, the gun stays out (${JSON.stringify(low)})`);
  // A3: no fire from low ready
  const magD = await mag();
  await page.mouse.down();
  await page.waitForTimeout(400);
  await page.mouse.up();
  assert((await mag()) === magD, `low ready: LMB fires nothing (A3) (${magD} -> ${await mag()})`);
  await page.keyboard.press('KeyX');
  // (load-latent-ui1) was a poll of up to 5 s wall time: poll per frame until holstered, or until 3 s of the match
  // clock AND the old 5 s of wall time have both run (never shorter than before), 60 s real-time cap
  const tHol = await page.evaluate(() => [window.__app.current.time, performance.now()]);
  await page.waitForFunction(([t0, w0]) => {
    const g = window.__app.current;
    return g.weapons.drawPhase === 0 || (g.time - t0 >= 3 && performance.now() - w0 >= 5000);
  }, tHol, { timeout: 60000, polling: 'raf' }).catch(() => {});
  assert((await dwNow()) === 0, 'an X tap holsters');
  await page.waitForTimeout(600);
  const s0 = await st();
  // (anim-rework S1) the wheel no longer steps a speed (the held context menu's highlight only); the weapon stays
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(300);
  const up = await st();
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(300);
  const down = await st();
  assert(up.gear === s0.gear && down.gear === s0.gear && down.weapon === s0.weapon, `the wheel changes neither the speed (${s0.gear} -> ${up.gear} -> ${down.gear}) nor the weapon (${s0.weapon} -> ${down.weapon})`);
  // T swaps weapons
  await page.keyboard.press('KeyT');
  // (load-audit) was a fixed 1.2 s wall wait then one read: wait (up to 30 s) for the frames to apply the swap, then read
  await page.waitForFunction((w0) => window.__app.current.weapons.index !== w0, s0.weapon, { timeout: 30000, polling: 50 }).catch(() => {});
  s = await st();
  assert(s.weapon !== s0.weapon, `T swaps weapons (${s0.weapon} -> ${s.weapon})`);
  // (anim-rework S1, A1) WASD walk, Left Shift held runs, Left Alt held creeps (the asked speed; the test cap off); = / - do nothing
  {
    await page.evaluate(() => window.__app.current.player.controller.gears.set(5));
    const want = () => page.evaluate(() => window.__app.current.player.controller.wantSpeed);
    const paceWith = async (mods) => {
      for (const m of mods) await page.keyboard.down(m);
      await page.keyboard.down('KeyW');
      let v = 0;
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(50);
        v = await want();
        if (v > 0) break;
      }
      // (load-audit) was a fixed 150 ms wall wait: 0.15 s of the match clock instead (60 s real-time cap), so the held
      // modifier's frames have run however slow the page
      await page.evaluate(() => new Promise((res) => {
        const g = window.__app.current;
        const t0 = g.time;
        const w0 = performance.now();
        const tick = () => (g.time - t0 >= 0.15 || performance.now() - w0 > 60000 ? res() : requestAnimationFrame(tick));
        tick();
      }));
      v = await want();
      await page.keyboard.up('KeyW');
      for (const m of mods) await page.keyboard.up(m);
      await page.waitForTimeout(200);
      return v;
    };
    const walk = await paceWith([]);
    const run = await paceWith(['ShiftLeft']);
    const creep = await paceWith(['AltLeft']);
    assert(Math.abs(walk - 2.1) < 0.05 && Math.abs(run - 4.0) < 0.05 && Math.abs(creep - 0.75) < 0.05, `W walks ${walk.toFixed(2)}, Shift + W runs ${run.toFixed(2)}, Alt + W creeps ${creep.toFixed(2)} m/s`);
    const g0 = (await st()).gear;
    await page.keyboard.press('Equal');
    await page.keyboard.press('Minus');
    await page.waitForTimeout(300);
    assert((await st()).gear === g0, `= / - no longer step a speed (${g0} -> ${(await st()).gear})`);
    await page.evaluate(() => window.__app.current.player.controller.gears.set(4));
  }
  // (locomotion step 17, D1) every KBM verb in the binding table (docs/systems/input-and-loop.md) raises its action:
  // the input state is wrapped to record and swallow what each default key raises (no side effects in the match)
  {
    const KBM = [
      ['KeyW', 'move'], ['KeyS', 'move'], ['KeyA', 'move'], ['KeyD', 'move'], ['CapsLock', 'cover'], ['KeyC', 'crouch'], ['ControlLeft', 'crouch'],
      ['Space', 'jump'], ['KeyE', 'interact'], ['KeyR', 'reload'],
      ['KeyX', 'draw'], ['KeyZ', 'altFire'], ['KeyB', 'zoom'], ['KeyT', 'swapNext'], ['KeyQ', 'swapPrev'], ['KeyG', 'grenade'], ['Tab', 'gadgetWheel'], ['KeyV', 'shoulderSwap'],
      ['KeyN', 'vision'], ['KeyO', 'objective'], ['KeyF', 'coop'], ['PageDown', 'coop'], ['KeyP', 'pause'],
    ];
    await page.evaluate(() => {
      const s = window.__app.input.state;
      const acts = (window.__acts = new Set());
      window.__restore = { set: s.set, tap: s.tap, setMove: s.setMove };
      s.set = function (src, a, d) {
        if (d) acts.add(a);
      };
      s.tap = function (a) {
        acts.add(a);
      };
      s.setMove = function (src, x, y) {
        if (x || y) acts.add('move');
      };
    });
    const missed = [];
    for (const [code, ...want] of KBM) {
      await page.evaluate(() => window.__acts.clear());
      await page.keyboard.down(code);
      await page.waitForTimeout(40);
      await page.keyboard.up(code);
      const got = await page.evaluate(() => [...window.__acts]);
      if (!want.every((a) => got.includes(a))) missed.push(`${code}: ${got.join('+') || 'nothing'}`);
    }
    await page.evaluate(() => {
      const s = window.__app.input.state;
      delete s.set;
      delete s.tap;
      delete s.setMove;
      s.releaseAll();
    });
    assert(missed.length === 0, `every KBM verb raises its action (${KBM.length} keys; missed: ${missed.join(', ') || 'none'})`);
  }
  // (F1a, G181) the KBM vision key (N) toggles the mode picked on the wheel (night first), on then off; post.vk follows
  {
    const vis = () => page.evaluate(() => ({ mode: window.__app.current.vision.mode, shown: window.__app.current.vision.shown, vk: window.__app.current.post.visionKind }));
    const seq = [];
    for (const want of ['night', 'off']) {
      await page.keyboard.press('KeyN');
      let r = await vis();
      for (let i = 0; i < 60 && (r.mode !== want || r.shown !== want); i++) {
        await page.waitForTimeout(50);
        r = await vis();
      }
      seq.push(r);
    }
    const vks = seq.map((r) => `${r.mode}/${r.vk}`).join(' ');
    assert(vks === 'night/0 off/0', `N toggles the selected vision mode on and off, post.vk follows (${vks})`);
  }
  await page.evaluate(() => document.exitPointerLock());
  await page.waitForTimeout(300);
  s = await st();
  assert(!s.locked && s.paused, `losing the capture (Esc) pauses the match (${JSON.stringify(s)})`);
  await page.waitForTimeout(1200);
  await page.locator('.btn', { hasText: 'Resume' }).click();
  await page.waitForTimeout(300);
  s = await st();
  assert(s.locked && !s.paused && !s.hint, `clicking Resume captures the mouse again (${JSON.stringify(s)})`);

  // (process audit, 2026-10-19) the gameplay sections that each opened their own match (palm strike, wall medkit, back to
  // a wall, difficulty, wall edge verb, door menu, campaign loadout) are gone: every KBM key's action is checked above,
  // and the behaviour is the system suites' (e2e-takedown, e2e-coop, e2e-wall, e2e-menus, e2e-stealth-ai, e2e-park)
  console.log('remap (step 18, D7): Controls > Keyboard & mouse: crouch to U, a conflict warns, reset (confirm), 5 s timeout, play; sprint hold vs toggle');
  {
    const R = await launch({ url });
    try {
      const P = R.page;
      const G = (f, a) => P.evaluate(f, a);
      const click = (sel, text) => G(([s, t]) => [...document.querySelectorAll(s)].filter((e) => !e.closest('[hidden]')).find((e) => !t || new RegExp(t).test(e.textContent)).click(), [sel, text]);
      await P.waitForFunction(() => !!document.querySelector('.main-menu .btn'), null, { timeout: 60000 });
      await click('.main-menu .btn', 'Settings');
      await P.waitForTimeout(300);
      await click('.settings-screen .tab-panel.active .btn', '^Remap controls');
      await P.waitForTimeout(300);
      await click('.controls-screen .tab', 'Keyboard');
      await P.waitForTimeout(200);
      const panel = '.controls-screen .tab-panel.active';
      const slot = (b) => `${panel} .kb-key[data-bind="${b}"]`;
      const keys = () => G(() => window.__app.settings.get().keys);
      const view = () => G((p) => ({ rows: [...document.querySelectorAll(`${p} .bind-row.conflict`)].map((r) => r.dataset.row).sort().join(), sum: document.querySelector(`${p} .bind-summary`)?.hidden ? '' : document.querySelector(`${p} .bind-summary`)?.textContent, cap: window.__app.input.kbm.capturing }), panel);
      await click(slot('crouch:0'));
      await P.keyboard.press('KeyU');
      await P.waitForTimeout(200);
      assert((await keys()).crouch.join() === 'KeyU,ControlLeft', `crouch rebound to U (${(await keys()).crouch})`);
      await click(slot('reload:0'));
      await P.keyboard.press('KeyU');
      await P.waitForTimeout(200);
      let v = await view();
      assert(v.rows === 'crouch,reload' && /share U/.test(v.sum) && (await keys()).reload.join() === 'KeyU', `reload onto U warns on both rows, still saved (${JSON.stringify(v)})`);
      await click(`${panel} .bind-reset`);
      await P.waitForTimeout(200);
      await click('.dialog-screen .btn', '^Reset$');
      await P.waitForTimeout(200);
      let k = await keys();
      v = await view();
      assert(k.crouch.join() === 'KeyC,ControlLeft' && k.reload.join() === 'KeyR' && v.rows === '' && !v.sum, `reset (confirmed) restores the keys (${k.crouch}, ${k.reload})`);
      // a capture with no key gives up after 5 s. (flake-fix) The screen's timeout is a wall-clock `setTimeout`: on a
      // loaded machine a long frame held it past the old fixed 5.6 s look ("the capture times out after 5 s", E2E_JOBS=2).
      // Now the page itself times it: the click, a probe at 4.5 s (still capturing), the moment the screen's own timer
      // gives up, and a 5 s probe timer armed right after the click (the same delay armed later fires after it, so the
      // give-up must come at 5 s (10 ms for the clock's coarse grain) and no later than that probe, however late the page runs)
      const capT = await G((s) => {
        const kbm = window.__app.input.kbm;
        const r = { cancelAt: -1, at45: null, probe: -1 };
        window.__capT = r;
        const orig = kbm.cancelCapture;
        kbm.cancelCapture = function (...a) {
          if (r.cancelAt < 0) r.cancelAt = performance.now() - t0;
          kbm.cancelCapture = orig;
          return orig.apply(this, a);
        };
        const t0 = performance.now();
        [...document.querySelectorAll(s)].filter((e) => !e.closest('[hidden]'))[0].click();
        const listening = kbm.capturing;
        setTimeout(() => (r.at45 = kbm.capturing), 4500);
        setTimeout(() => (r.probe = performance.now() - t0), 5000);
        return { listening };
      }, slot('coop:0'));
      await P.waitForFunction(() => window.__capT.probe >= 0, null, { timeout: 60000, polling: 100 });
      v = await view();
      const pl = await G((s) => document.querySelector(s).classList.contains('listening'), slot('coop:0'));
      const ct = await G(() => window.__capT);
      const ctMsg = JSON.stringify({ ...capT, ...ct, cap: v.cap, listening: pl, coop: (await keys()).coop });
      assert(capT.listening && ct.at45 === true, `the capture listens until its 5 s timeout (${ctMsg})`);
      assert(!v.cap && !pl && (await keys()).coop.join() === 'KeyF,PageDown' && ct.cancelAt >= 4990 && ct.cancelAt <= ct.probe, `the capture times out after 5 s (${ctMsg})`);
      await click(slot('crouch:0'));
      await P.keyboard.press('KeyU');
      await P.waitForTimeout(800);
      const Q = await openPage(R.ctx, url, 'autostart=chamber');
      try {
        await Q.page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
        await Q.page.evaluate(() => {
          const a = window.__app;
          a.loop.manual = true;
          window.__rm = {
            step(n) {
              for (let i = 0; i < n; i++) a.loop.stepHeadless(1 / 60, 120);
            },
            st() {
              const c = a.current.player.controller;
              return { crouched: c.crouched, sprinting: c.sprinting };
            },
          };
          window.__rm.step(30);
        });
        const QP = Q.page;
        const tap = async (code) => {
          await QP.keyboard.down(code);
          await QP.evaluate(() => window.__rm.step(3));
          await QP.keyboard.up(code);
          await QP.evaluate(() => window.__rm.step(3));
        };
        await tap('KeyU');
        const u1 = await QP.evaluate(() => window.__rm.st());
        await tap('KeyU');
        const u2 = await QP.evaluate(() => window.__rm.st());
        await tap('KeyC');
        const c1 = await QP.evaluate(() => window.__rm.st());
        assert(u1.crouched && !u2.crouched && !c1.crouched, `in play U crouches (toggle), C no longer does (${u1.crouched} ${u2.crouched} ${c1.crouched})`);
        // (CT prototype M1: no sprint) the sprint hold / toggle check is gone
      } finally {
        await Q.page.close();
      }
    } finally {
      await R.browser.close();
    }
  }
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: '/tmp/e2e-mouse-fail.png' });
}
const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
if (real.length) {
  failed = true;
  console.error(real.join('\n'));
} else console.log('no console errors');
await browser.close();
process.exit(failed ? 1 : 0);
