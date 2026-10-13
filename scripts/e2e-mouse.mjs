// PC keyboard + mouse: the mouse is captured (pointer lock) in a match. A click on the game captures it
// (that click never fires) and hides the "click to capture" hint; captured, moving looks, left fires,
// the wheel steps the speed gear (3.2.0; weapons are Q / X); losing the capture (Esc) pauses; clicking Resume
// captures it again.
import { launch, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving', touch: false });
let failed = false;

/** (locomotion step 10) A Hunter match on the Warehouse (guards), the loop stepped by hand, a strike harness. */
async function strikePage(launch, url, touch) {
  const S = await launch({ url, params: 'autostart=warehouse&mode=clear', touch });
  await S.page.waitForFunction(() => !!window.__app?.current?.enemyMgr, null, { timeout: 60000 });
  return S;
}
const STRIKE_HARNESS = () => {
  const a = window.__app;
  const g = a.current;
  a.loop.manual = true;
  g.target.health.invulnerable = true;
  g.mode.pending.length = 0;
  const em = g.enemyMgr;
  const V = g.player.position.constructor;
  window.__sk = {
    setup(kind, alerted, yaw) {
      em.clear();
      g.strike.reset();
      g.player.controller.teleport(new V(2, 0, -1.9), 0);
      g.player.cam.yaw = 0;
      g.player.cam.pitch = 0;
      const e = kind ? em.spawn(kind, new V(2, 0, -1), alerted, yaw) : null;
      if (e) e['stagger'] = 99;
      a.loop.stepHeadless(0.3, 120);
      if (e) e.yaw = yaw;
      return e;
    },
    step(n = 1) {
      for (let i = 0; i < n; i++) a.loop.stepHeadless(1 / 60, 120);
    },
    until(fn, max) {
      let t = 0;
      while (!fn() && t < max) {
        a.loop.stepHeadless(1 / 60, 120);
        t += 1 / 60;
      }
      return t;
    },
  };
};
const st = () =>
  page.evaluate(() => {
    const g = window.__app.current;
    return {
      locked: !!document.pointerLockElement,
      hint: !document.querySelector('.mouse-capture-hint').hidden,
      fire: window.__app.input.state.down('fire'),
      yaw: g.player.cam.yaw,
      weapon: g.weapons.index,
      gear: g.player.controller.gear,
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
  await page.waitForTimeout(200);
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
  await page.mouse.down({ button: 'right' });
  let drawn = false;
  // (a loaded VM runs the page at a few frames a second: poll up to 8 s for the 0.4 s draw and the aim framing)
  for (let i = 0; i < 160 && !drawn; i++) {
    await page.waitForTimeout(50);
    drawn = (await page.evaluate(() => { const g = window.__app.current; return g.weapons.drawPhase === 2 && g.player.cam.ads >= 0.9; }));
  }
  const dbg = await page.evaluate(() => { const g = window.__app.current; return { dw: g.weapons.drawPhase, cam: +g.player.cam.ads.toFixed(2), ads: g.player.ads }; });
  assert(drawn, `RMB draws and aims (${JSON.stringify(dbg)})`);
  // (software GL frames are slow: hold until a shot lands, up to 3 s)
  await page.mouse.down();
  for (let i = 0; i < 30 && (await mag()) >= magB; i++) await page.waitForTimeout(100);
  await page.mouse.up();
  await page.mouse.up({ button: 'right' });
  const magC = await mag();
  assert(magC < magB, `RMB held, LMB fires (${magB} -> ${magC})`);
  await page.waitForTimeout(600);
  const s0 = await st();
  // wheel up: a faster gear, wheel down: a slower one (one notch, one gear); the weapon stays
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(300);
  const up = await st();
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(300);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(300);
  const down = await st();
  assert(up.gear === Math.min(6, s0.gear + 1) && down.gear === Math.max(1, s0.gear - 1) && down.weapon === s0.weapon, `wheel steps the speed gear (${s0.gear} -> ${up.gear} -> ${down.gear}), not the weapon (${s0.weapon} -> ${down.weapon})`);
  // X swaps weapons now
  await page.keyboard.press('KeyX');
  await page.waitForTimeout(1200);
  s = await st();
  assert(s.weapon !== s0.weapon, `X swaps weapons (${s0.weapon} -> ${s.weapon})`);
  // = / - step the gear too
  const g0 = s.gear;
  // (the page runs at a few frames a second on software GL: poll up to 2 s for the step instead of a fixed 150 ms)
  const gearIs = async (want) => {
    let g = (await st()).gear;
    for (let i = 0; i < 40 && g !== want; i++) {
      await page.waitForTimeout(50);
      g = (await st()).gear;
    }
    return g;
  };
  await page.keyboard.press('Equal');
  const g1 = await gearIs(Math.min(6, g0 + 1));
  await page.keyboard.press('Minus');
  const g2 = await gearIs(g0);
  assert(g1 === Math.min(6, g0 + 1) && g2 === g0, `= / - step the gear (${g0} -> ${g1} -> ${g2})`);
  await page.evaluate(() => document.exitPointerLock());
  await page.waitForTimeout(300);
  s = await st();
  assert(!s.locked && s.paused, `losing the capture (Esc) pauses the match (${JSON.stringify(s)})`);
  await page.waitForTimeout(1200);
  await page.locator('.btn', { hasText: 'Resume' }).click();
  await page.waitForTimeout(300);
  s = await st();
  assert(s.locked && !s.paused && !s.hint, `clicking Resume captures the mouse again (${JSON.stringify(s)})`);

  console.log('elbow strike (LMB while holstered)');
  const S = await strikePage(launch, url, false);
  try {
    const P = S.page;
    await P.waitForTimeout(1200);
    await P.mouse.move(640, 320);
    // capture first (a capturing click never fires)
    if (!(await P.evaluate(() => !!document.pointerLockElement))) {
      await P.mouse.down();
      await P.waitForTimeout(100);
      await P.mouse.up();
      await P.waitForTimeout(300);
    }
    await P.evaluate(STRIKE_HARNESS);
    await P.evaluate(() => {
      window.__e = window.__sk.setup('grunt', false, 0);
    });
    await P.mouse.down();
    await P.evaluate(() => window.__sk.step(2));
    await P.mouse.up();
    const r = await P.evaluate(() => {
      const g = window.__app.current;
      const started = g.strike.count.started;
      const t = window.__sk.until(() => !window.__e.alive, 1.5);
      return { started, t, ko: !window.__e.alive && window.__e.ko, locked: !!document.pointerLockElement };
    });
    assert(r.started >= 1 && r.ko, `LMB holstered behind a guard: knocked out (${JSON.stringify(r)})`);
  } finally {
    await S.browser.close();
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
