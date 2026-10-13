// Controller-only navigation test: every step uses the fake gamepad, never the screen.
// Run against `npm run preview` (default http://localhost:4173/).
import { launch, press, stick, BTN, focusedText, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url });
const q = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const settings = () => page.evaluate(() => window.__app.settings.get());
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
// (locomotion step 11) back to a wall on Proving: find a free high face, stand 0.5 m out facing it (manual loop)
const WALL_HARNESS = () => {
  const a = window.__app;
  const g = a.current;
  a.loop.manual = true;
  const V = g.player.position.constructor;
  const clear = (x0, z0, x1, z1, y) => !g.ballistics.ray(new V(x0, y, z0), new V(x1, y, z1), 1).hit;
  const segs = g.world.level.coverSegments;
  let seg = -1;
  for (let i = 0; i < segs.length && seg < 0; i++) {
    const s = segs[i];
    if (s.low || Math.abs(s.y) > 0.3 || s.len < 4 || s.len > 14) continue;
    let ok = true;
    for (let k = 0.5; k < s.len && ok; k += 0.5) {
      const x = s.ax + s.tx * k + s.nx * 0.45;
      const z = s.az + s.tz * k + s.nz * 0.45;
      ok = clear(x, z, x + s.nx * 2.5, z + s.nz * 2.5, s.y + 1) && clear(x, z, x + s.nx * 2.5, z + s.nz * 2.5, s.y + 0.3);
    }
    if (ok) seg = i;
  }
  const s = segs[seg];
  const yaw = Math.atan2(-s.nx, -s.nz);
  g.player.controller.teleport(new V(s.ax + s.tx * s.len / 2 + s.nx * 0.85, s.y + 0.05, s.az + s.tz * s.len / 2 + s.nz * 0.85), yaw);
  g.player.cam.yaw = yaw;
  g.player.cam.pitch = 0;
  a.loop.stepHeadless(0.3, 120);
  window.__wl = {
    seg,
    step(n = 1) {
      for (let i = 0; i < n; i++) a.loop.stepHeadless(1 / 60, 120);
    },
    st: () => ({ phase: g.wallCore?.phase ?? 'none', s: g.wallCore?.s ?? 0, seg: g.wallCore?.seg ?? -1, last: g.wallCore?.lastLeave ?? '' }),
  };
};

try {
  console.log('hot-plug + iOS first-press detection');
  await page.evaluate(() => window.__pad.connect());
  await press(page, BTN.LB); // harmless on main menu; reveals the pad like iOS
  await page.waitForTimeout(250);
  const toast = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join('|'));
  assert(/Controller connected/.test(toast), `connect toast ("${toast}")`);
  assert(await page.evaluate(() => document.body.classList.contains('input-gamepad')), 'mode = gamepad');

  console.log('main menu');
  const first = await focusedText(page);
  assert(first.length > 0, `initial focus "${first}"`);
  await press(page, BTN.DOWN);
  let f = await focusedText(page);
  while (!/Settings/.test(f)) {
    await press(page, BTN.DOWN);
    const nf = await focusedText(page);
    if (nf === f) break;
    f = nf;
  }
  assert(/Settings/.test(f), 'd-pad reaches Settings');
  await press(page, BTN.A);
  assert(await q('.settings-screen'), 'A opens settings');
  const tab0 = await page.evaluate(() => document.querySelector('.tab.active')?.textContent);
  await press(page, BTN.RB);
  const tab1 = await page.evaluate(() => document.querySelector('.tab.active')?.textContent);
  assert(tab0 !== tab1 && tab1 === 'Controller', `RB switches tab (${tab0} -> ${tab1})`);
  // find the horizontal sensitivity slider
  for (let i = 0; i < 8 && !/Horizontal/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  assert(/Horizontal/.test(await focusedText(page)), 'focus on Horizontal sensitivity');
  const before = (await settings()).gamepad.lookSensitivityX;
  await press(page, BTN.RIGHT);
  await press(page, BTN.RIGHT);
  const after = (await settings()).gamepad.lookSensitivityX;
  assert(after > before, `d-pad right raises slider (${before} -> ${after})`);
  // left stick nav
  await stick(page, 1, 1);
  assert(/Vertical/.test(await focusedText(page)), 'left stick moves focus down');
  await press(page, BTN.LB);
  await press(page, BTN.LB);
  assert((await page.evaluate(() => document.querySelector('.tab.active')?.textContent)) === 'Data', 'LB wraps tabs backwards');
  // Accessibility: HUD size by d-pad, the Controls screen per input type (past Feedback)
  await press(page, BTN.LB);
  assert((await page.evaluate(() => document.querySelector('.tab.active')?.textContent)) === 'Feedback', 'the Feedback tab');
  await press(page, BTN.LB);
  assert((await page.evaluate(() => document.querySelector('.tab.active')?.textContent)) === 'Accessibility', 'Accessibility tab');
  assert(/Controls/.test(await focusedText(page)), `first focus on Controls ("${await focusedText(page)}")`);
  await press(page, BTN.DOWN);
  assert(/HUD size/.test(await focusedText(page)), 'focus HUD size');
  const hs0 = (await settings()).access.hudScale;
  await press(page, BTN.RIGHT);
  assert((await settings()).access.hudScale > hs0, 'd-pad right enlarges the HUD');
  await press(page, BTN.UP);
  await press(page, BTN.A);
  assert(await q('.controls-screen'), 'A opens the Controls screen');
  const ct0 = await page.evaluate(() => document.querySelector('.controls-screen .tab.active')?.textContent);
  await press(page, BTN.RB);
  const ct1 = await page.evaluate(() => document.querySelector('.controls-screen .tab.active')?.textContent);
  assert(ct0 === 'Controller' && ct1 !== ct0 && (await page.evaluate(() => document.querySelectorAll('.controls-screen .tab-panel.active .controls-row').length)) > 8, `controls per input type (${ct0} -> ${ct1})`);
  await press(page, BTN.B);
  assert(!(await q('.controls-screen')) && (await q('.settings-screen')), 'B returns to Settings');
  await press(page, BTN.B);
  assert(!(await q('.settings-screen')), 'B closes settings');
  assert(/Settings/.test(await focusedText(page)), 'focus restored to Settings');

  console.log('layout editor');
  await press(page, BTN.A);
  for (let i = 0; i < 24 && !/Edit button layout/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  await press(page, BTN.A);
  assert(await q('.layout-editor'), 'layout editor opens');
  const fx = (await settings()).touch.layout;
  const focusedCtl = await page.evaluate(() => document.querySelector('.le-handle.focused .le-label')?.textContent);
  await press(page, BTN.A); // grab
  await press(page, BTN.RIGHT);
  await press(page, BTN.RIGHT);
  await press(page, BTN.A); // drop
  const fx2 = (await settings()).touch.layout;
  const moved = Object.keys(fx).filter((k) => fx[k].x !== fx2[k].x);
  assert(moved.length === 1, `grab+move+drop moved one control (${focusedCtl}: ${moved})`);
  await press(page, BTN.RB);
  const fx3 = (await settings()).touch.layout;
  assert(Object.keys(fx).some((k) => fx3[k].scale > fx2[k].scale), 'RB enlarges selected control');
  await press(page, BTN.B);
  await press(page, BTN.B);
  await press(page, BTN.B);
  assert(await q('.main-menu') && !(await q('.settings-screen')), 'B backs out to main menu');

  console.log('play setup + in-game pause flow');
  for (let i = 0; i < 6 && !/^Play/.test(await focusedText(page)); i++) await press(page, BTN.UP);
  assert(/^Play/.test(await focusedText(page)), 'menu wraps / reaches Play');
  await press(page, BTN.A);
  assert(await q('.play-screen'), 'A opens the play setup');
  assert(/Mode/.test(await focusedText(page)), 'mode picker focused first');
  await press(page, BTN.LEFT);
  assert(/Free Roam/.test(await focusedText(page)), 'd-pad left cycles mode to Free Roam');
  for (let i = 0; i < 6 && !/Deploy/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  assert(/Deploy/.test(await focusedText(page)), 'focus Deploy');
  await press(page, BTN.A);
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 30000 });
  assert(await page.evaluate(() => document.querySelector('.touch-layer')?.hidden === true), 'touch controls hidden in gamepad mode');
  // 3.2.0 controls: D-pad up / down the speed gear, D-pad left held opens the gadget wheel (a tap does not), View tap
  // goggles, View held an emote
  const G = (f) => page.evaluate(f);
  const gear0 = await G(() => window.__app.current.player.controller.gear);
  await press(page, BTN.UP);
  const gearUp = await G(() => window.__app.current.player.controller.gear);
  await press(page, BTN.DOWN);
  await press(page, BTN.DOWN);
  const gearDown = await G(() => window.__app.current.player.controller.gear);
  assert(gearUp === gear0 + 1 && gearDown === gear0 - 1, `d-pad up / down step the speed gear (${gear0} -> ${gearUp} -> ${gearDown})`);
  const holdBtn = async (b, ms, until) => {
    await page.evaluate((b) => window.__pad.set(b, 1), b);
    await page.waitForTimeout(ms);
    // (the hold is read from the polls: on a slow software-GL frame it lands late)
    if (until) await page.waitForFunction(until, null, { timeout: 6000 }).catch(() => {});
    const r = await G(() => ({ wheel: window.__app.current.gadgets.wheelOpen, emote: !!window.__app.current.player.rig.emote }));
    await page.evaluate((b) => window.__pad.set(b, 0), b);
    await page.waitForTimeout(150);
    return r;
  };
  await press(page, BTN.LEFT);
  const tapWheel = await G(() => window.__app.current.gadgets.wheelOpen);
  const held = await holdBtn(BTN.LEFT, 700, () => window.__app.current.gadgets.wheelOpen);
  // (time runs slowed while the wheel is open: give the release a moment under software GL)
  await page.waitForFunction(() => !window.__app.current.gadgets.wheelOpen, null, { timeout: 5000 }).catch(() => {});
  const shut = await G(() => window.__app.current.gadgets.wheelOpen);
  assert(!tapWheel && held.wheel && !shut, `d-pad left: a tap leaves the wheel shut, held it opens, released it closes (${tapWheel} / ${held.wheel} / ${shut})`);
  const v0 = await G(() => window.__app.current.vision.mode);
  await press(page, BTN.SELECT);
  await page.waitForTimeout(150);
  const v1 = await G(() => window.__app.current.vision.mode);
  assert(v0 === 'off' && v1 === 'night', `View tap: goggles (${v0} -> ${v1})`);
  const vBefore = await G(() => window.__app.current.vision.mode);
  const em = await holdBtn(BTN.SELECT, 500, () => !!window.__app.current.player.rig.emote);
  const v2 = await G(() => window.__app.current.vision.mode);
  assert(em.emote && v2 === vBefore, `View held: an emote, goggles untouched (${em.emote}, ${vBefore} -> ${v2})`);
  // (step 09) holstered unless aiming: LT draws (<= 0.45 s), RT then fires; release holsters (<= 0.45 s); RT while
  // holstered does nothing (fixed steps, the pad polled every step)
  const dr = await G(() => {
    const g = window.__app.current;
    const L = window.__app.loop;
    const w = g.weapons;
    const shots = () => [...w.tally.values()].reduce((a, t) => a + t.shots, 0);
    const until = (fn, max) => {
      let t = 0;
      while (!fn() && t < max) {
        L.stepHeadless(1 / 60);
        t += 1 / 60;
      }
      return t;
    };
    const s0 = shots();
    // (fix 1) RT held while holstered never raises the carry (no aiming twist, no MoveState r, no turn rates)
    const raise0 = g.player.carry.raise;
    let raiseMax = raise0;
    let aimed = false;
    window.__pad.set(7, 1);
    for (let k = 0; k < 18; k++) {
      L.stepHeadless(1 / 60);
      raiseMax = Math.max(raiseMax, g.player.carry.raise);
      aimed = aimed || g.player.aiming;
    }
    window.__pad.set(7, 0);
    L.stepHeadless(0.1);
    // (step 10) that RT press was an elbow strike (a whiff, committed): the draw waits for it to end
    const struck = g.strike.count.started > 0;
    until(() => !g.strike.active, 2);
    const s1 = shots();
    window.__pad.set(6, 1);
    const tDraw = until(() => w.drawPhase === 2, 2);
    until(() => g.player.cam.ads >= 0.9, 2);
    window.__pad.set(7, 1);
    L.stepHeadless(0.3);
    window.__pad.set(7, 0);
    const s2 = shots();
    window.__pad.set(6, 0);
    const tHol = until(() => w.drawPhase === 0, 2);
    // (A43) releasing aim mid-reload finishes the reload, then holsters
    const tapX = () => {
      window.__pad.set(2, 1);
      L.stepHeadless(1 / 60);
      window.__pad.set(2, 0);
      L.stepHeadless(1 / 60);
    };
    const cur = w.current;
    cur.mag = Math.max(0, cur.stats.magSize - 3);
    if (cur.reserve < 10) cur.reserve = 60;
    window.__pad.set(6, 1);
    until(() => w.drawPhase === 2 && g.player.cam.ads >= 0.9, 2);
    tapX();
    const relReloading = w.reloading;
    L.stepHeadless(0.2);
    window.__pad.set(6, 0);
    let relDrop = false;
    const relT = until(() => {
      if (w.reloading && w.drawPhase !== 2) relDrop = true;
      return !w.reloading;
    }, 5);
    const relFull = cur.mag === cur.stats.magSize;
    const relHol = until(() => w.drawPhase === 0, 2);
    // (A43) reload pressed while holstered: draws to low ready, reloads, holsters; RT held throughout never fires
    cur.mag = Math.max(0, cur.stats.magSize - 3);
    const s3 = shots();
    // (step 10: RT pressed while holstered is the elbow strike, so RT goes down as the reload's draw starts)
    tapX();
    window.__pad.set(7, 1);
    const hDraw = until(() => w.reloading, 2);
    const hDrawn = w.drawPhase === 2 && !g.player.ads;
    const hT = until(() => !w.reloading, 5);
    const hFull = cur.mag === cur.stats.magSize;
    const hHol = until(() => w.drawPhase === 0, 2);
    window.__pad.set(7, 0);
    const s4 = shots();
    return { struck, s0, s1, s2, tDraw, tHol, cls: cur.def.class, raise0, raiseMax, aimed, relReloading, relDrop, relT, relFull, relHol, hDraw, hDrawn, hT, hFull, hHol, s3, s4 };
  });
  assert(dr.raiseMax - dr.raise0 < 0.01 && !dr.aimed, `RT while holstered: carry.raise and aiming unchanged (${dr.raise0.toFixed(3)} -> max ${dr.raiseMax.toFixed(3)}, aiming ${dr.aimed})`);
  assert(dr.relReloading && !dr.relDrop && dr.relFull && dr.relHol < 0.45, `LT released mid-reload: the reload finishes (${dr.relT.toFixed(2)} s, full ${dr.relFull}, stayed drawn ${!dr.relDrop}), then holsters (${dr.relHol.toFixed(2)} s)`);
  assert(dr.hDraw <= 0.5 && dr.hDrawn && dr.hFull && dr.hHol < 0.45 && dr.s4 === dr.s3, `reload while holstered: draws to low ready (${dr.hDraw.toFixed(2)} s), reloads (${dr.hT.toFixed(2)} s, full ${dr.hFull}), holsters (${dr.hHol.toFixed(2)} s), never fires (${dr.s3} -> ${dr.s4})`);
  assert(dr.struck, 'RT while holstered: an elbow strike (step 10)');
  assert(dr.s1 === dr.s0, `RT while holstered: shot tally unchanged (${dr.s0} -> ${dr.s1})`);
  assert(dr.tDraw <= 0.45, `LT draws within 0.45 s (${dr.tDraw.toFixed(2)} s, ${dr.cls})`);
  assert(dr.s2 > dr.s1, `drawn, RT fires (${dr.s1} -> ${dr.s2})`);
  assert(dr.tHol <= 0.45, `LT released holsters within 0.45 s (${dr.tHol.toFixed(2)} s)`);
  await press(page, BTN.START);
  assert(await q('.pause-screen'), 'Start opens pause');
  await press(page, BTN.B);
  assert(!(await q('.pause-screen')), 'B resumes');
  await press(page, BTN.START);
  await press(page, BTN.DOWN);
  await press(page, BTN.DOWN);
  assert(/Report feedback/.test(await focusedText(page)), 'focus Report feedback');
  await press(page, BTN.DOWN);
  assert(/Quit/.test(await focusedText(page)), 'focus Quit');
  await press(page, BTN.A);
  assert(await q('.dialog'), 'confirm dialog');
  assert(/Quit/.test(await focusedText(page)), 'dialog primary focused');
  await press(page, BTN.A);
  await page.waitForTimeout(400);
  assert(await q('.main-menu'), 'quit returns to main menu');

  console.log('elbow strike (RT while holstered)');
  {
    const S = await strikePage(launch, url, true);
    try {
      await S.page.evaluate(STRIKE_HARNESS);
      const r = await S.page.evaluate(() => {
        const g = window.__app.current;
        const k = window.__sk;
        window.__pad.connect();
        const rt = () => {
          window.__pad.set(7, 1);
          k.step(2);
          window.__pad.set(7, 0);
          k.step(1);
        };
        const out = {};
        // behind an unaware guard: knocked out within 0.6 s
        let e = k.setup('grunt', false, 0);
        rt();
        out.started = g.strike.active;
        out.tKo = 3 / 60 + k.until(() => !e.alive, 1.5);
        out.ko = !e.alive && e.ko;
        k.until(() => !g.strike.active, 1.5);
        // an aware guard facing: staggered; a second RT inside the stagger: knocked out
        e = k.setup('grunt', true, Math.PI);
        rt();
        k.until(() => g.strike.t >= 0.55 || !g.strike.active, 1);
        out.stag = { alive: e.alive, staggered: e.strikeStaggered };
        rt(); // (queued in the recovery: the next strike starts as this one ends)
        e.yaw = Math.PI;
        out.tKo2 = k.until(() => !e.alive, 2);
        out.ko2 = !e.alive && e.ko;
        k.until(() => !g.strike.active, 1.5);
        // a heavy from the front: staggered only
        e = k.setup('heavy', true, Math.PI);
        rt();
        k.until(() => !g.strike.active, 1.5);
        e.yaw = Math.PI;
        k.step(5);
        rt();
        k.until(() => !g.strike.active, 1.5);
        out.heavy = { alive: e.alive, ko: e.ko };
        // a whiff: the 0.4 s recovery stays exposed after contact time
        k.setup(null);
        rt();
        k.until(() => g.strike.t >= 0.5 || !g.strike.active, 1);
        out.whiffRecover = k.until(() => !g.strike.active, 2);
        out.miss = g.strike.count.miss;
        return out;
      });
      assert(r.started && r.ko && r.tKo <= 0.6, `RT holstered behind an unaware guard: knocked out in ${r.tKo.toFixed(2)} s (<= 0.6)`);
      assert(r.stag.alive && r.stag.staggered, `RT on an aware guard facing: staggered (${JSON.stringify(r.stag)})`);
      assert(r.ko2, `a second RT inside the stagger knocks him out (${r.tKo2.toFixed(2)} s)`);
      assert(r.heavy.alive && !r.heavy.ko, `a heavy from the front: staggered only (${JSON.stringify(r.heavy)})`);
      assert(r.whiffRecover >= 0.38 && r.miss >= 1, `a whiff: ${r.whiffRecover.toFixed(2)} s recovery after contact time (0.4 s, to the frame)`);
    } finally {
      await S.browser.close();
    }
  }
  console.log('back to a wall (A enters, stick slides, A leaves)');
  {
    const W = await launch({ url, params: 'autostart=proving' });
    try {
      await W.page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
      await W.page.evaluate(WALL_HARNESS);
      const r = await W.page.evaluate(() => {
        const k = window.__wl;
        const A = () => {
          window.__pad.set(0, 1);
          k.step(2);
          window.__pad.set(0, 0);
          k.step(1);
        };
        window.__pad.connect();
        k.step(2);
        A();
        k.step(20);
        const on = k.st();
        window.__pad.axis(0, 1);
        k.step(40);
        window.__pad.axis(0, 0);
        k.step(5);
        const slid = k.st();
        A();
        k.step(10);
        return { on, slid, off: k.st(), seg: k.seg };
      });
      assert(r.on.phase === 'on' && r.on.seg === r.seg, `pad A enters back-to-wall (${JSON.stringify(r.on)})`);
      assert(r.slid.phase === 'on' && Math.abs(r.slid.s - r.on.s) > 0.5, `the left stick slides along it (${r.on.s.toFixed(2)} -> ${r.slid.s.toFixed(2)})`);
      assert(r.off.phase !== 'on' && r.off.last === 'context', `pad A again leaves (${JSON.stringify(r.off)})`);
    } finally {
      await W.browser.close();
    }
  }
  console.log('disconnect');
  await page.evaluate(() => window.__pad.disconnect());
  // the pad is noticed on the next poll; under software GL a frame can take a while
  await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /disconnected/.test(t.textContent ?? '')), null, { timeout: 8000 }).catch(() => {});
  const t2 = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join('|'));
  assert(/disconnected/.test(t2), 'disconnect toast');
  assert(await page.evaluate(() => document.body.classList.contains('input-touch')), 'mode reverts to touch');
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-pad-fail.png' });
} finally {
  const bad = errors.filter((e) => !e.includes('GPU stall') && !e.includes('swiftshader'));
  console.log(bad.length ? 'console problems:\n' + bad.join('\n') : 'no console errors');
  await browser.close();
  process.exit(failed || bad.some((e) => e.startsWith('[error]') || e.startsWith('[pageerror]')) ? 1 : 0);
}
