// Controller-only navigation test: every step uses the fake gamepad, never the screen.
// Run against `npm run preview` (default http://localhost:4173/).
import { launch, openPage, press, stick, BTN, focusedText, focusTo, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url });
const q = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const settings = () => page.evaluate(() => window.__app.settings.get());
let failed = false;

/** (locomotion step 10) A Hunter match on the Warehouse (guards), the loop stepped by hand, a strike harness. */
async function strikePage(launch, url) {
  const S = await launch({ url, params: 'autostart=warehouse&mode=clear' });
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
// (locomotion step 12; A3: a free wall end by the Proving doorway) stand 0.5 m out from its high wall 0.8 m from the edge, facing it
// (manual loop). `sx` is the stick x toward the edge (+t is the camera's right facing the wall).
const EDGE_HARNESS = () => {
  const a = window.__app;
  const g = a.current;
  a.loop.manual = true;
  const V = g.player.position.constructor;
  a.loop.stepHeadless(0.1, 120);
  const L = g.wallCore.links;
  const segs = g.world.level.coverSegments;
  let d = null;
  for (let i = 0; i < segs.length && !d; i++) {
    const s = segs[i];
    if (s.low || Math.abs(Math.abs(s.az) - 8) > 0.4 || Math.abs(s.nz) < 0.99) continue;
    if (s.len < 1.5) continue;
    if (L.kB[i] === 0) d = { i, end: 1, len: s.len };
    else if (L.kA[i] === 0) d = { i, end: -1, len: s.len };
  }
  const s = segs[d.i];
  const k = d.end > 0 ? d.len - 0.8 : 0.8;
  const yaw = Math.atan2(-s.nx, -s.nz);
  g.player.controller.teleport(new V(s.ax + s.tx * k + s.nx * 0.85, s.y + 0.05, s.az + s.tz * k + s.nz * 0.85), yaw);
  g.player.cam.yaw = yaw;
  g.player.cam.pitch = 0;
  a.loop.stepHeadless(0.3, 120);
  window.__ed = {
    d,
    sx: d.end,
    step(n = 1) {
      for (let i = 0; i < n; i++) a.loop.stepHeadless(1 / 60, 120);
    },
    st: () => { const w = g.wallCore; return { phase: w.phase, seg: w.seg, edge: w.edge, peekOn: w.peekOn, peek: w.peek, sub: w.sub(), mag: g.weapons.current.mag, cam: g.player.cam.wallPeek }; },
  };
  return d;
};

// (locomotion step 12) Warehouse (clear mode, guards cleared): back to a high wall at an outside edge with a guard round
// it, until the takedown on offer is `corner` (manual loop). Returns the offer kind or null.
const CORNER_SETUP = () => {
  const a = window.__app;
  const g = a.current;
  a.loop.manual = true;
  const step = (n) => { for (let k = 0; k < n; k++) a.loop.stepHeadless(1 / 60, 120); };
  const V = g.player.position.constructor;
  g.target.health.invulnerable = true;
  g.mode.pending.length = 0;
  g.enemyMgr.clear();
  step(6);
  window.__cn = { step, st: () => ({ td: !!g.takedown.active, kind: g.takedown.offer?.plan.kind ?? null }) };
  const segs = g.world.level.coverSegments;
  const L = g.wallCore.links;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.low || s.len < 2 || L.kB[i] !== 0 || Math.abs(s.y - g.player.position.y) > 3) continue;
    const yaw = Math.atan2(-s.nx, -s.nz);
    if (g.wallCore.active) g.wallCore.leave('test');
    step(20);
    g.player.controller.clearCrouchToggle();
    g.player.controller.teleport(new V(s.ax + s.tx * (s.len - 0.7) + s.nx * 0.85, s.y + 0.05, s.az + s.tz * (s.len - 0.7) + s.nz * 0.85), yaw);
    g.player.cam.yaw = yaw;
    g.player.cam.pitch = 0;
    step(18);
    window.__app.input.state.tap('cover');
    step(36);
    if (g.wallCore.phase !== 'on' || g.wallCore.seg !== i) continue;
    // slide to the edge at b (the camera's right), then release the stick
    window.__pad.connect();
    window.__pad.axis(0, 1);
    step(200);
    window.__pad.axis(0, 0);
    step(4);
    if (g.wallCore.edge !== 1) continue;
    const x = s.bx + s.tx * 0.7 - s.nx * 0.45;
    const z = s.bz + s.tz * 0.7 - s.nz * 0.45;
    const e = g.enemyMgr.spawn('grunt', new V(x, s.y, z), false, Math.atan2(s.tx, s.tz));
    step(2);
    if (!g.takedown.offer || g.takedown.offer.e !== e) {
      g.enemyMgr.clear();
      continue;
    }
    return g.takedown.offer.plan.kind;
  }
  return null;
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

  console.log('campaign loadout (G76, the CT kit): pad lists only the rifle and the suppressed pistol, defaults Heron Carbine + Hush 9 SD');
  {
    const key = () => page.evaluate(() => window.__app.nav.focused?.dataset.key ?? '');
    const labels = () => page.evaluate(() => [...document.querySelectorAll('.lo-list .lo-label')].map((e) => e.textContent));
    const value = (k) => page.evaluate((kk) => document.querySelector(`.lo-list .lo-row[data-key="${kk}"] .lo-val`)?.textContent ?? '', k);
    assert(await focusTo(page, /Loadout/), 'focus Loadout');
    await press(page, BTN.A);
    assert(await q('.loadout-screen'), 'A opens the Loadout');
    const root = await labels();
    assert(JSON.stringify(root) === JSON.stringify(['Loadout', 'Primary', 'Sidearm', 'Gadget']), `the root: loadout, primary, sidearm, gadget (${root})`);
    assert((await value('primary')) === 'Heron Carbine' && (await value('secondary')) === 'Hush 9 SD', `defaults: Heron Carbine + Hush 9 SD (${await value('primary')} / ${await value('secondary')})`);
    for (let i = 0; i < 4 && (await key()) !== 'primary'; i++) await press(page, BTN.DOWN);
    await press(page, BTN.A);
    const prim = await labels();
    assert(JSON.stringify(prim) === JSON.stringify(['Heron Carbine']), `the primary list is the CT kit rifle (${prim})`);
    const seen = new Set([await key()]);
    for (let i = 0; i < 2; i++) {
      await press(page, BTN.DOWN);
      seen.add(await key());
    }
    assert(seen.has('w-rifle') && seen.size === 1, `the d-pad reaches the rifle and nothing else (${[...seen]})`);
    const lo = await page.evaluate(() => window.__app.save.get().loadout);
    assert(lo.secondary === 'rifle' && lo.primary === 'pistolSd', `the rifle is the primary, the sidearm in hand (${JSON.stringify(lo)})`);
    await press(page, BTN.B);
    assert((await value('primary')) === 'Heron Carbine', `B returns to the root with it (${await value('primary')})`);
    for (let i = 0; i < 4 && (await key()) !== 'secondary'; i++) await press(page, BTN.DOWN);
    await press(page, BTN.A);
    const side = await labels();
    assert(JSON.stringify(side) === JSON.stringify(['Hush 9 SD']), `the sidearm list is the CT kit pistol (${side})`);
    await press(page, BTN.B);
    await press(page, BTN.B);
    assert(await q('.main-menu') && !(await q('.loadout-screen')), 'B backs out to the main menu');
  }

  console.log('play setup + in-game pause flow');
  for (let i = 0; i < 6 && !/^Play/.test(await focusedText(page)); i++) await press(page, BTN.UP);
  assert(/^Play/.test(await focusedText(page)), 'menu wraps / reaches Play');
  await press(page, BTN.A);
  assert(await q('.play-screen'), 'A opens the play setup');
  assert(/Mode/.test(await focusedText(page)), 'mode picker focused first');
  // difficulty by pad (G106: CT's fixed levels, no sliders): d-pad down to Difficulty, right = Normal -> Realistic
  for (let i = 0; i < 14 && !/Difficulty/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  assert(/Difficulty/.test(await focusedText(page)), `the pad reaches the Difficulty row (${await focusedText(page)})`);
  await press(page, BTN.RIGHT);
  const cd = await page.evaluate(() => ({ choice: document.querySelector('.play-screen [data-diff="choice"]')?.textContent ?? '', sliders: document.querySelectorAll('.play-screen [data-diff]:not([data-diff="choice"])').length }));
  assert(/Realistic/.test(cd.choice) && cd.sliders === 0, `d-pad right picks Realistic; no custom sliders (${JSON.stringify(cd)})`);
  for (let i = 0; i < 14 && !/Mode/.test(await focusedText(page)); i++) await press(page, BTN.UP);
  await press(page, BTN.LEFT);
  assert(/Free Roam/.test(await focusedText(page)), 'd-pad left cycles mode to Free Roam');
  for (let i = 0; i < 6 && !/Deploy/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  assert(/Deploy/.test(await focusedText(page)), 'focus Deploy');
  await press(page, BTN.A);
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 30000 });
  const rd = await page.evaluate(() => ({ p: window.__app.current.diff.perception, l: window.__app.current.diff.label, m: window.__app.current.enemyMgr?.diff?.perception ?? null }));
  assert(rd.p === 1.3 && rd.l === 'Realistic' && (rd.m === null || rd.m === 1.3), `the match runs Realistic (${JSON.stringify(rd)})`);
  // A3 controls (G96): D-pad right / left the speed gear, LB held opens the gadget wheel (a tap does not), D-pad up
  // cycles the goggles
  const G = (f) => page.evaluate(f);
  const gear0 = await G(() => window.__app.current.player.controller.maxGear);
  await press(page, BTN.RIGHT);
  const gearUp = await G(() => window.__app.current.player.controller.maxGear);
  await press(page, BTN.LEFT);
  await press(page, BTN.LEFT);
  const gearDown = await G(() => window.__app.current.player.controller.maxGear);
  assert(gearUp === gear0 + 1 && gearDown === gear0 - 1, `d-pad right / left step the maximum gear (${gear0} -> ${gearUp} -> ${gearDown})`);
  const holdBtn = async (b, ms, until) => {
    await page.evaluate((b) => window.__pad.set(b, 1), b);
    await page.waitForTimeout(ms);
    // (the hold is read from the polls: on a slow software-GL frame it lands late)
    if (until) await page.waitForFunction(until, null, { timeout: 6000 }).catch(() => {});
    const r = await G(() => ({ wheel: window.__app.current.gadgets.wheelOpen }));
    await page.evaluate((b) => window.__pad.set(b, 0), b);
    await page.waitForTimeout(150);
    return r;
  };
  await press(page, BTN.LB);
  const tapWheel = await G(() => window.__app.current.gadgets.wheelOpen);
  const held = await holdBtn(BTN.LB, 700, () => window.__app.current.gadgets.wheelOpen);
  // (time runs slowed while the wheel is open: give the release a moment under software GL)
  await page.waitForFunction(() => !window.__app.current.gadgets.wheelOpen, null, { timeout: 5000 }).catch(() => {});
  const shut = await G(() => window.__app.current.gadgets.wheelOpen);
  assert(!tapWheel && held.wheel && !shut, `LB (quick inventory): a tap leaves the wheel shut, held it opens, released it closes (${tapWheel} / ${held.wheel} / ${shut})`);
  const v0 = await G(() => window.__app.current.vision.mode);
  await press(page, BTN.UP);
  await page.waitForTimeout(150);
  const v1 = await G(() => window.__app.current.vision.mode);
  assert(v0 === 'off' && v1 === 'night', `D-pad up: goggles (${v0} -> ${v1})`);
  // (step 14) D-pad up cycles off -> night -> thermal -> electro -> off; the post pass's vision kind follows at mid-flip
  {
    const vis = () => G(() => ({ mode: window.__app.current.vision.mode, shown: window.__app.current.vision.shown, vk: window.__app.current.post.visionKind }));
    const until = async (want) => {
      let r = await vis();
      for (let i = 0; i < 60 && (r.mode !== want || r.shown !== want); i++) {
        await page.waitForTimeout(50);
        r = await vis();
      }
      return r;
    };
    const seq = [];
    // (let the held-View release settle before the next tap)
    await page.waitForTimeout(400);
    const start = (await vis()).mode;
    if (start !== 'night') throw new Error(`vision start ${start}`);
    for (const want of ['thermal', 'electro', 'off']) {
      await press(page, BTN.UP);
      seq.push(await until(want));
    }
    const ok = seq[0].mode === 'thermal' && seq[0].vk === 1 && seq[1].mode === 'electro' && seq[1].vk === 2 && seq[2].mode === 'off' && seq[2].vk === 0;
    assert(ok, `D-pad up x3 more: thermal (vk 1) -> electro (vk 2) -> off (vk 0) (${JSON.stringify(seq)})`);
  }
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
    until(() => g.player.cam.ads >= 0.9 && g.player.carry.raise >= 0.9, 2); // A2.1: the carry raise (~0.7 s) gates the trigger
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
  assert(dr.relReloading && !dr.relDrop && dr.relFull && dr.relHol < 0.65, // A2.1: holster 0.55 s (G103)
    `LT released mid-reload: the reload finishes (${dr.relT.toFixed(2)} s, full ${dr.relFull}, stayed drawn ${!dr.relDrop}), then holsters (${dr.relHol.toFixed(2)} s)`);
  assert(dr.hDraw <= 0.9 && dr.hDrawn && dr.hFull && dr.hHol < 0.65 && dr.s4 === dr.s3, `reload while holstered: draws to low ready (${dr.hDraw.toFixed(2)} s), reloads (${dr.hT.toFixed(2)} s, full ${dr.hFull}), holsters (${dr.hHol.toFixed(2)} s), never fires (${dr.s3} -> ${dr.s4})`);
  assert(dr.struck, 'RT while holstered: an elbow strike (step 10)');
  assert(dr.s1 === dr.s0, `RT while holstered: shot tally unchanged (${dr.s0} -> ${dr.s1})`);
  assert(dr.tDraw <= 0.85, `LT draws within 0.85 s (G103: 0.6 pistol, 0.75 rifle) (${dr.tDraw.toFixed(2)} s, ${dr.cls})`);
  assert(dr.s2 > dr.s1, `drawn, RT fires (${dr.s1} -> ${dr.s2})`);
  assert(dr.tHol <= 0.65, `LT released holsters within 0.65 s (G103: 0.55) (${dr.tHol.toFixed(2)} s)`);
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
    const S = await strikePage(launch, url);
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
  console.log('analog gear, rocker cap, rumble, pad verbs (step 17)');
  {
    const S = await strikePage(launch, url);
    try {
      await S.page.evaluate(STRIKE_HARNESS);
      const r = await S.page.evaluate(() => {
        const g = window.__app.current;
        const c = g.player.controller;
        const k = window.__sk;
        const P = window.__pad;
        P.connect();
        const btn = (i, n = 2) => {
          P.set(i, 1);
          k.step(n);
          P.set(i, 0);
          k.step(2);
        };
        const out = {};
        k.setup(null);
        // the rocker: up to the maximum gear 5 (it never reaches 6)
        for (let i = 0; i < 5; i++) btn(15);
        out.max5 = c.maxGear;
        // analog: raw stick 50 / 80 / 100% forward (A63) -> gears 2 / 4 / 5
        // (each from the same spot, facing open floor: 0.5 s of travel)
        const V0 = g.player.position.constructor;
        const at = (v) => {
          c.teleport(new V0(2, 0, -1.9), 0);
          g.player.cam.yaw = 0;
          P.axis(1, -v);
          k.step(30);
          return { g: c.gear, v: +c.speed.toFixed(2) };
        };
        out.a50 = at(0.5);
        out.a80 = at(0.8);
        out.a100 = at(1);
        // the stick full: no sprint (CT prototype M1)
        k.step(30);
        out.sprint = { g: c.gear, sprinting: c.sprinting };
        P.axis(1, 0);
        k.step(40);
        // rocker down twice: maximum 3 caps the full stick at gear 3's 1.65 m/s (step 22, M14)
        btn(14);
        btn(14);
        out.max3 = c.maxGear;
        out.cap = at(1);
        P.axis(1, 0);
        k.step(20);
        // B crouches (toggle), B again stands
        btn(1);
        out.crouch = c.crouched;
        btn(1);
        out.stand = !c.crouched;
        // (A3, G96) RB is the co-op action and LB the quick inventory now: no pad weapon-swap buttons. R3 swaps the shoulder,
        // D-pad down held aims the gadget
        out.rb = true;
        out.lb = true;
        const sh0 = g.player.cam.shoulder;
        btn(11); // A2.1 (G17): not aiming, R3 does nothing
        const r3Idle = g.player.cam.shoulder === sh0;
        P.set(6, 1);
        k.step(60);
        btn(11);
        out.r3 = r3Idle && g.player.cam.shoulder === -sh0;
        btn(11);
        P.set(6, 0);
        k.step(40);
        P.set(13, 1);
        k.step(20);
        out.gadgetAim = g.gadgets.aiming;
        g.gadgets.aiming = false;
        P.set(13, 0);
        k.step(5);
        g.gadgets.aiming = false;
        // rumble: a landing (2 m drop), a shot, an elbow hit, a takedown; the fake pad records every playEffect
        const fx = () => P.effects.map((e) => `${e.strong.toFixed(2)}/${e.weak.toFixed(2)}/${e.ms}`);
        P.effects.length = 0;
        const V = g.player.position.constructor;
        const l0 = c.landings;
        c.teleport(new V(2, 2.0, -1.9), 0);
        k.until(() => c.landings > l0, 3);
        k.step(10);
        out.land = fx();
        P.effects.length = 0;
        P.set(6, 1);
        k.step(75); // A2.1: draw 0.6-0.75 s (G103)
        P.set(7, 1);
        k.step(3);
        P.set(7, 0);
        k.step(10);
        P.set(6, 0);
        k.step(40);
        out.shot = fx();
        P.effects.length = 0;
        const e = k.setup('grunt', false, 0);
        btn(7, 2);
        k.until(() => !e.alive || !g.strike.active, 1.5);
        out.elbow = fx();
        k.until(() => !g.strike.active, 1.5);
        P.effects.length = 0;
        const e2 = k.setup('grunt', false, 0);
        e2['stagger'] = 0;
        k.until(() => !!g.takedown.offer, 1);
        out.tdOffer = g.takedown.offer?.plan?.kind ?? (g.takedown.offer ? "yes" : null);
        btn(0);
        out.tdViaPad = !!g.takedown.active || g.takedown.hostage !== null;
        // (pad A on a takedown is covered by the corner check below; here only the rumble on completion matters)
        if (!out.tdViaPad && g.takedown.offer) g.takedown.start(false);
        k.until(() => g.takedown.hostage !== null || !e2.alive, 1);
        if (e2.alive && g.takedown.hostage !== null) btn(0);
        k.until(() => !e2.alive, 4);
        k.step(10);
        out.takedown = fx();
        out.tdDone = !e2.alive;
        return out;
      });
      console.log(JSON.stringify(r));
      assert(r.max5 === 5, `D-pad right sets the maximum gear, capped at 5 (${r.max5})`);
      assert(r.a50.g === 3 && r.a80.g === 4 && r.a100.g === 5, `stick 50 / 80 / 100% -> speeds 3 / 4 / 5 (CT M1) (${r.a50.g} / ${r.a80.g} / ${r.a100.g})`);
      // (CT prototype M1) speeds 3 / 4 / 5 = 2.0 / 3.0 / 4.2 m/s
      assert(Math.abs(r.a50.v - 2.0) < 0.15 && Math.abs(r.a80.v - 3.0) < 0.2 && Math.abs(r.a100.v - 4.2) < 0.25, `speed = the snapped gear's cap (${r.a50.v} / ${r.a80.v} / ${r.a100.v})`);
      assert(!r.sprint.sprinting && r.sprint.g === 5, `a full stick: no sprint, still speed 5 (${JSON.stringify(r.sprint)})`);
      assert(r.max3 === 3 && r.cap.g === 3 && r.cap.v <= 2.1, `D-pad left x2: maximum 3 caps the full stick (${r.max3}, ${JSON.stringify(r.cap)})`);
      assert(r.crouch && r.stand, 'B crouches and stands');
      assert(r.r3, 'R3 swaps the shoulder');
      assert(r.gadgetAim, 'D-pad down held aims the gadget');
      assert(r.land.some((s) => ['0.15/0.25/60', '0.35/0.45/110', '0.80/0.80/200'].includes(s)), `rumble on landing (${r.land})`);
      assert(r.shot.some((s) => ['0.12/0.20/45', '0.40/0.55/80'].includes(s)), `rumble on a shot (${r.shot})`);
      assert(r.elbow.includes('0.50/0.30/90'), `rumble on an elbow hit (${r.elbow})`);
      assert(r.tdDone && r.takedown.includes('0.60/0.40/150'), `rumble on a takedown (${r.tdDone}, offer ${r.tdOffer}, pad ${r.tdViaPad}, ${r.takedown})`);
    } finally {
      await S.browser.close();
    }
  }
  console.log('back to a wall (L3 enters, stick slides, L3 leaves; A does not)');
  {
    const W = await launch({ url, params: 'autostart=proving' });
    try {
      await W.page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
      await W.page.evaluate(WALL_HARNESS);
      const r = await W.page.evaluate(() => {
        const k = window.__wl;
        const A = () => {
          window.__pad.set(10, 1);
          k.step(2);
          window.__pad.set(10, 0);
          k.step(1);
        };
        window.__pad.connect();
        k.step(2);
        // A is the interact button: it does not enter the wall
        window.__pad.set(0, 1);
        k.step(2);
        window.__pad.set(0, 0);
        k.step(10);
        const aNo = k.st();
        A();
        k.step(20);
        const on = k.st();
        window.__pad.axis(0, 1);
        k.step(240);
        window.__pad.axis(0, 0);
        k.step(5);
        const slid = k.st();
        A();
        k.step(10);
        return { aNo, on, slid, off: k.st(), seg: k.seg };
      });
      assert(r.aNo.phase === 'off', `pad A does not enter the wall (${r.aNo.phase})`);
      assert(r.on.phase === 'on' && r.on.seg === r.seg, `pad L3 enters back-to-wall (${JSON.stringify(r.on)})`);
      assert(r.slid.phase === 'on' && Math.abs(r.slid.s - r.on.s) > 0.4, `the left stick slides along it at the CT shuffle (${r.on.s.toFixed(2)} -> ${r.slid.s.toFixed(2)})`);
      assert(r.off.phase !== 'on' && r.off.last === 'context', `pad L3 again leaves (${JSON.stringify(r.off)})`);
    } finally {
      await W.browser.close();
    }
  }
  console.log('door menu (A3, G19, G97): A at a door opens the menu; Stealth open peeks (right stick looks, stick back closes, forward opens); Open; Bash');
  {
    const W = await launch({ url, params: 'autostart=proving' });
    try {
      await W.page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
      const r = await W.page.evaluate(() => {
        const a = window.__app;
        const g = a.current;
        a.loop.manual = true;
        const V = g.player.position.constructor;
        const d = g.world.doors.list[0];
        if (!d) return null;
        const an = d.anchor;
        // the leaf's middle, 0.7 m out on the normal's side, facing it
        const nx = Math.cos(an.yaw);
        const nz = -Math.sin(an.yaw);
        const mx = an.hinge.x + Math.sin(an.yaw) * an.width * 0.5;
        const mz = an.hinge.z + Math.cos(an.yaw) * an.width * 0.5;
        const yaw = Math.atan2(-nx, -nz);
        const place = () => {
          g.player.controller.teleport(new V(mx + nx * 0.7, an.hinge.y + 0.05, mz + nz * 0.7), yaw);
          g.player.cam.yaw = yaw;
          g.player.cam.pitch = 0;
          a.loop.stepHeadless(0.3, 120);
        };
        place();
        const step = (n) => { for (let i = 0; i < n; i++) a.loop.stepHeadless(1 / 60, 120); };
        const P = window.__pad;
        const press = (b) => { P.set(b, 1); step(2); P.set(b, 0); step(1); };
        // one menu step down: the left stick pushed down for a few frames (the D-pad would aim the gadget)
        const down = () => { P.axis(1, 0.9); step(4); P.axis(1, 0); step(12); };
        const st = () => ({ phase: g.doorPeek.phase, cracked: d.cracked, ajar: d.ajar, target: d.target, body: !!d.body, view: g.player.cam.doorPeek, look: Math.atan2(Math.sin(g.player.cam.yaw - g.player.cam.doorYaw), Math.cos(g.player.cam.yaw - g.player.cam.doorYaw)) });
        P.connect();
        step(2);
        const closedAtStart = d.target === 0;
        press(0);
        step(6);
        const menu = { open: g.doorMenu.open, opts: [...g.doorMenu.opts], sel: g.doorMenu.sel, ui: document.querySelector('.hud-doormenu')?.classList.contains('show') };
        // B cancels it
        press(1);
        step(6);
        const cancelled = !g.doorMenu.open && d.target === 0;
        // stealth open (second entry): the peek
        press(0);
        step(6);
        down();
        const sel = g.doorMenu.sel;
        press(0);
        step(60);
        const peek = st();
        P.axis(2, 1);
        step(40);
        P.axis(2, 0);
        step(2);
        const looked = st();
        // the stick pulled back (toward the body) closes the crack
        P.axis(1, 1);
        step(30);
        P.axis(1, 0);
        step(20);
        const closed = st();
        // the first entry: Open (the quiet creak)
        press(0);
        step(6);
        press(0);
        step(90);
        const opened = st();
        // Bash: shut the door, stand there again, the third entry (stealth is on offer, so two steps down)
        g.world.doors.close(d, () => false);
        step(90);
        place();
        step(10);
        g.noise = 0;
        press(0);
        step(6);
        down();
        down();
        const bashSel = g.doorMenu.opts[g.doorMenu.sel];
        press(0);
        step(6);
        const noise = g.noise;
        step(20);
        return { closedAtStart, menu, cancelled, sel, peek, looked, closed, opened, bashSel, bash: st(), noise };
      });
      assert(!!r && r.closedAtStart, 'Proving has a closed door');
      assert(r.menu.open && r.menu.opts.join() === 'open,stealth,bash,optic' && r.menu.sel === 0 && r.menu.ui, `A at a closed door opens the door menu (open, stealth open, bash, optic cable) (${JSON.stringify(r.menu)})`);
      assert(r.cancelled, 'B cancels the menu, the door stays shut');
      assert(r.sel === 1 && r.peek.phase === 'peek' && r.peek.cracked && Math.abs(r.peek.ajar - 0.12) < 0.01 && r.peek.target === 0 && r.peek.body && r.peek.view === 1, `Stealth open: the door peek, cracked 0.12, body kept (${JSON.stringify(r.peek)})`);
      assert(Math.abs(r.looked.look) > 0.3 && Math.abs(r.looked.look) <= (35 * Math.PI) / 180 + 1e-3 && r.looked.phase === 'peek', `the right stick looks, within +-35 deg (${JSON.stringify(r.looked)})`);
      assert(r.closed.phase === 'off' && !r.closed.cracked && r.closed.ajar === 0 && r.closed.body, `the stick pulled back closes the crack (${JSON.stringify(r.closed)})`);
      assert(r.opened.target === 1 && !r.opened.cracked, `Open: the door swings open (${JSON.stringify(r.opened)})`);
      // (the noise and the guard behind the door are checked in e2e-stealth-ai: this sandbox map has no guards or door noise)
      assert(r.bashSel === 'bash' && r.bash.target === 1, `Bash: the door is bashed open (${r.bashSel}, target ${r.bash.target})`);
    } finally {
      await W.browser.close();
    }
  }
  console.log('wall edge verb (step 12, D1; A3): stick-to-edge peek at once, LT leaves the wall, A corner takedown');
  {
    const W = await launch({ url, params: 'autostart=proving' });
    try {
      await W.page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
      const d = await W.page.evaluate(EDGE_HARNESS);
      assert(!!d, `the Proving doorway (${JSON.stringify(d)})`);
      const r = await W.page.evaluate(() => {
        const k = window.__ed;
        const P = window.__pad;
        const press = (b) => { P.set(b, 1); k.step(2); P.set(b, 0); k.step(1); };
        P.connect();
        k.step(2);
        press(10);
        k.step(30);
        const on = k.st();
        P.axis(0, k.sx);
        // slide to the very end of the wall (the shuffle is slow), then release
        for (let i = 0; i < 900 && !window.__app.current.wallCore.atEnd; i++) k.step(1);
        P.axis(0, 0);
        k.step(40);
        // peek: the stick pushed toward the edge, at once
        P.axis(0, k.sx);
        k.step(8);
        const peek = k.st();
        P.axis(0, 0);
        k.step(30);
        // LT: aiming leaves the wall
        P.set(6, 1);
        k.step(20);
        const aim = k.st();
        P.set(6, 0);
        k.step(30);
        return { on, peek, aim };
      });
      assert(r.on.phase === 'on', `pad L3 enters the doorway wall (${JSON.stringify(r.on)})`);
      assert(r.peek.peekOn && (r.peek.sub & 16) !== 0 && r.peek.cam === 1, `stick toward the edge: peek at once (${JSON.stringify(r.peek)})`);
      assert(r.aim.phase !== 'on' && r.aim.phase !== 'entering', `LT (aim) leaves the wall (${r.aim.phase})`);
    } finally {
      await W.browser.close();
    }
    const C = await launch({ url, params: 'autostart=warehouse&mode=clear' });
    try {
      await C.page.waitForFunction(() => !!window.__app?.current?.enemyMgr, null, { timeout: 60000 });
      const kind = await C.page.evaluate(CORNER_SETUP);
      const r = await C.page.evaluate(() => { const k = window.__cn; window.__pad.set(0, 1); k.step(2); window.__pad.set(0, 0); k.step(1); return k.st(); });
      assert(kind === 'corner' && r.td, `pad A: the corner takedown from the wall edge runs (${kind}, ${JSON.stringify(r)})`);
    } finally {
      await C.browser.close();
    }
  }
  console.log('remap (step 18, D7): Controls > Controller by pad: clear R3, reload X -> R3, play; onto B warns; reset; crouch and wall hold / toggle');
  {
    const R = await launch({ url });
    try {
      const P = R.page;
      const G = (f, a) => P.evaluate(f, a);
      const click = (sel, text) => G(([s, t]) => [...document.querySelectorAll(s)].filter((e) => !e.closest('[hidden]')).find((e) => !t || new RegExp(t).test(e.textContent)).click(), [sel, text]);
      await P.waitForFunction(() => !!document.querySelector('.main-menu .btn'), null, { timeout: 60000 });
      await G(() => window.__pad.connect());
      await press(P, BTN.DOWN);
      await click('.main-menu .btn', 'Settings');
      await P.waitForTimeout(300);
      await click('.settings-screen .tab', 'Accessibility');
      await P.waitForTimeout(200);
      await click('.settings-screen .tab-panel.active .btn', '^Controls');
      await P.waitForTimeout(300);
      const panel = '.controls-screen .tab-panel.active';
      const focusSlot = (b) => G(([p, x]) => window.__app.nav.focus(document.querySelector(`${p} ${x}`)), [panel, b.includes('.') ? b : `.pad-key[data-bind="${b}"]`]);
      const pad = () => G(() => window.__app.settings.get().pad);
      const view = () => G((p) => ({ tab: document.querySelector('.controls-screen .tab.active')?.textContent, rows: [...document.querySelectorAll(`${p} .bind-row.conflict`)].map((r) => r.dataset.row).sort().join(), sum: document.querySelector(`${p} .bind-summary`)?.hidden ? '' : document.querySelector(`${p} .bind-summary`)?.textContent, cap: window.__app.input.gamepad.capturing, screen: !!document.querySelector('.controls-screen') }), panel);
      assert((await view()).tab === 'Controller', `the Controller tab first (${(await view()).tab})`);
      // Y on a slot clears it: R3 off Swap shoulder
      await focusSlot('shoulder:0');
      await press(P, BTN.Y);
      assert((await pad()).shoulder.length === 0, 'Y clears the focused slot (R3 off Swap shoulder)');
      // A, then R3: reload moves from X to R3
      await focusSlot('reload:0');
      await press(P, BTN.A);
      const listening = await G((p) => document.querySelector(`${p} .pad-key[data-bind="reload:0"]`).classList.contains('listening'), panel);
      await press(P, BTN.RS);
      let v = await view();
      const lab = await G((p) => document.querySelector(`${p} .pad-key[data-bind="reload:0"]`).textContent, panel);
      assert(listening && JSON.stringify((await pad()).reload) === '[11]' && lab === 'R3' && v.rows === '' && !v.cap, `A then R3 rebinds reload (${lab}, conflicts "${v.rows}")`);
      // a capture is cancelled by holding B 1 s (the screen stays)
      await focusSlot('reload:1');
      await press(P, BTN.A);
      await G(() => window.__pad.set(1, 1));
      // hold B until the capture ends (a fixed 1.5 s hold was stale: the cancel hold can outlast it on a slow frame)
      await P.waitForFunction(() => !window.__app.input.gamepad.capturing, null, { timeout: 8000 });
      await G(() => window.__pad.set(1, 0));
      await P.waitForTimeout(300);
      v = await view();
      assert(!v.cap && v.screen && JSON.stringify((await pad()).reload) === '[11]', `B held 1 s cancels the capture (${JSON.stringify(v)})`);
      // play: the new button reloads, X does not (settings persist through IndexedDB to a new page)
      await P.waitForTimeout(600);
      const Q = await openPage(R.ctx, url, 'autostart=proving');
      try {
        await Q.page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
        const r = await Q.page.evaluate(() => {
          const a = window.__app;
          const c = a.current.player.controller;
          a.loop.manual = true;
          const s = a.input.state;
          const acts = new Set();
          const tap0 = s.tap.bind(s);
          s.tap = (x) => {
            acts.add(x);
            tap0(x);
          };
          const step = (n) => {
            for (let i = 0; i < n; i++) a.loop.stepHeadless(1 / 60, 120);
          };
          window.__pad.connect();
          step(30);
          const btn = (b) => {
            window.__pad.set(b, 1);
            step(3);
            window.__pad.set(b, 0);
            step(3);
          };
          acts.clear();
          btn(2);
          const x = acts.has('reload');
          acts.clear();
          btn(11);
          const r3 = acts.has('reload');
          s.tap = tap0;
          // crouch: toggle (default), then hold
          btn(1);
          const t1 = c.crouched;
          btn(1);
          const t2 = c.crouched;
          a.settings.update((d) => void (d.gameplay.crouchToggle = false));
          window.__pad.set(1, 1);
          step(10);
          const h1 = c.crouched;
          window.__pad.set(1, 0);
          step(10);
          const h2 = c.crouched;
          return { x, r3, t1, t2, h1, h2, pad: a.settings.get().pad.reload };
        });
        assert(r.r3 && !r.x && JSON.stringify(r.pad) === '[11]', `in play R3 reloads, X does not (${JSON.stringify(r)})`);
        assert(r.t1 && !r.t2 && r.h1 && !r.h2, `crouch toggle (B, B) and hold (held, released) (${JSON.stringify(r)})`);
        // back to a wall: hold mode stays while L3 is held, toggle mode stays after the release
        await Q.page.evaluate(WALL_HARNESS);
        const w = await Q.page.evaluate(() => {
          const a = window.__app;
          const k = window.__wl;
          const out = {};
          for (const toggle of [false, true]) {
            a.settings.update((d) => void (d.gameplay.wallToggle = toggle));
            window.__pad.set(10, 1);
            k.step(30);
            const held = k.st().phase;
            window.__pad.set(10, 0);
            k.step(20);
            const rel = k.st().phase;
            out[toggle ? 'toggle' : 'hold'] = [held, rel];
            // leave (toggle: a press) and settle
            if (toggle) {
              window.__pad.set(10, 1);
              k.step(2);
              window.__pad.set(10, 0);
            }
            k.step(40);
          }
          return out;
        });
        assert(w.hold[0] === 'on' && w.hold[1] !== 'on' && w.toggle[0] === 'on' && w.toggle[1] === 'on', `back to wall (L3) hold / toggle (${JSON.stringify(w)})`);
      } finally {
        await Q.page.close();
      }
      // onto B (crouch): the conflict shows on both rows and in the summary; reset (confirm) restores the defaults
      await focusSlot('reload:0');
      await press(P, BTN.A);
      await press(P, BTN.B);
      v = await view();
      assert(v.rows === 'crouch,reload' && /share B/.test(v.sum) && v.screen, `reload onto B warns on both rows (${JSON.stringify(v)})`);
      await focusSlot('.bind-reset');
      await press(P, BTN.A);
      await P.waitForFunction(() => !!document.querySelector('.dialog-screen'), null, { timeout: 3000 }).catch(() => {});
      const dg = await G(() => ({ d: !!document.querySelector('.dialog-screen'), f: window.__app.nav.focused?.className, t: window.__app.nav.focused?.textContent, cap: window.__app.input.gamepad.capturing, mode: window.__app.input.mode }));
      assert(dg.d, `reset asks first (${JSON.stringify(dg)})`);
      await press(P, BTN.A);
      await P.waitForTimeout(200);
      v = await view();
      const def = await pad();
      assert(JSON.stringify(def.reload) === '[2]' && JSON.stringify(def.shoulder) === '[11]' && v.rows === '' && v.screen, `reset restores the controller defaults (${JSON.stringify(def.reload)})`);
    } finally {
      await R.browser.close();
    }
  }

  console.log('disconnect');
  await page.evaluate(() => window.__pad.disconnect());
  // the pad is noticed on the next poll; under software GL a frame can take a while
  await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /disconnected/.test(t.textContent ?? '')), null, { timeout: 8000 }).catch(() => {});
  const t2 = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join('|'));
  assert(/disconnected/.test(t2), 'disconnect toast');
  assert(await page.evaluate(() => document.body.classList.contains('input-kbm')), 'mode reverts to keyboard and mouse');
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
