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
// (locomotion step 12) the Proving doorway (1.1 m gap): stand 0.5 m out from its high wall 0.8 m from the edge, facing it
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
    if (L.gB[i] >= 0 && Math.abs(L.gapB[i] - 1.1) < 0.05) d = { i, end: 1, to: L.gB[i], len: s.len };
    else if (L.gA[i] >= 0 && Math.abs(L.gapA[i] - 1.1) < 0.05) d = { i, end: -1, to: L.gA[i], len: s.len };
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
    st: () => { const w = g.wallCore; return { phase: w.phase, seg: w.seg, edge: w.edge, peekOn: w.peekOn, peek: w.peek, lk: w.lk, lean: w.lean, swat: w.count.swat, sub: w.sub(), mag: g.weapons.current.mag, cam: g.player.cam.wallPeek }; },
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
    step(60);
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
  // (menu-ui slice 2) GAME / SETTINGS: Controls first, Remap controls focused; LB / RB switch tabs with focus memory
  const tabT = () => page.evaluate(() => document.querySelector('.settings-screen .tab.active')?.textContent);
  assert((await tabT()) === 'Controls' && /Remap controls/.test(await focusedText(page)), `Controls tab first, Remap focused (${await tabT()}, "${await focusedText(page)}")`);
  // find the horizontal sensitivity slider
  for (let i = 0; i < 12 && !/horizontal/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  assert(/horizontal/.test(await focusedText(page)), 'focus on Look sensitivity (horizontal)');
  const before = (await settings()).gamepad.lookSensitivityX;
  await press(page, BTN.RIGHT);
  await press(page, BTN.RIGHT);
  const after = (await settings()).gamepad.lookSensitivityX;
  assert(after > before, `d-pad right raises slider (${before} -> ${after})`);
  // left stick nav
  await stick(page, 1, 1);
  assert(/vertical/.test(await focusedText(page)), 'left stick moves focus down');
  await press(page, BTN.RB);
  assert((await tabT()) === 'Gameplay', 'RB: the Gameplay tab');
  await press(page, BTN.LB);
  assert((await tabT()) === 'Controls' && /vertical/.test(await focusedText(page)), `LB back to Controls restores its focus ("${await focusedText(page)}")`);
  await press(page, BTN.LB);
  assert((await tabT()) === 'Data', 'LB wraps tabs backwards');
  // Accessibility: Subtitles locked first, HUD size by d-pad, then the Remap screen per input type
  await press(page, BTN.LB);
  assert((await tabT()) === 'Feedback', 'the Feedback tab');
  await press(page, BTN.LB);
  assert((await tabT()) === 'Accessibility', 'Accessibility tab');
  assert(/Subtitles/.test(await focusedText(page)), `first focus on the locked Subtitles row ("${await focusedText(page)}")`);
  await press(page, BTN.A);
  assert((await settings()).access.subtitles && /always on/.test(await page.evaluate(() => document.querySelector('.toasts')?.textContent ?? '')), 'the locked row toasts its reason');
  for (let i = 0; i < 4 && !/HUD size/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  assert(/HUD size/.test(await focusedText(page)), 'focus HUD size');
  const hs0 = (await settings()).access.hudScale;
  await press(page, BTN.RIGHT);
  assert((await settings()).access.hudScale > hs0, 'd-pad right enlarges the HUD');
  for (let i = 0; i < 4; i++) await press(page, BTN.LB);
  assert((await tabT()) === 'Controls', 'back on Controls');
  for (let i = 0; i < 12 && !/Remap controls/.test(await focusedText(page)); i++) await press(page, BTN.UP);
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

  console.log('issued kit (slice 4, D-11; G76 CT kit): the pad reads the kit, nothing is selectable');
  {
    const key = () => page.evaluate(() => window.__app.nav.focused?.dataset.key ?? '');
    const ctr = (k) => page.evaluate((kk) => document.querySelector(`.kit-screen [data-key="${kk}"] .ms-ctr`)?.textContent ?? '', k);
    assert(await focusTo(page, /Loadout/), 'focus Loadout');
    await press(page, BTN.A);
    assert(await q('.kit-screen'), 'A opens the issued kit');
    assert((await key()) === 'primary', 'focus starts on Primary');
    assert((await ctr('primary')) === 'Heron Carbine' && (await ctr('secondary')) === 'Hush 9 SD', `the kit: Heron Carbine + Hush 9 SD (${await ctr('primary')} / ${await ctr('secondary')})`);
    const seen = [await key()];
    for (let i = 0; i < 2; i++) {
      await press(page, BTN.DOWN);
      seen.push(await key());
    }
    assert(JSON.stringify(seen) === JSON.stringify(['primary', 'secondary', 'gadget']), `the d-pad walks the three issued items (${seen})`);
    const lo = await page.evaluate(() => JSON.stringify(window.__app.save.get().loadout));
    await press(page, BTN.A);
    assert((await page.evaluate(() => JSON.stringify(window.__app.save.get().loadout))) === lo && (await q('.kit-screen')), 'A on an issued item changes nothing');
    await press(page, BTN.B);
    assert(await q('.main-menu') && !(await q('.kit-screen')), 'B backs out to the main menu');
  }

  console.log('play setup + in-game pause flow');
  // (menu-ui slice 1: the flat main menu; Missions opens the play setup on Infiltration)
  for (let i = 0; i < 8 && !/^Missions/.test(await focusedText(page)); i++) await press(page, BTN.UP);
  assert(/^Missions/.test(await focusedText(page)), 'menu wraps / reaches Missions');
  await press(page, BTN.A);
  assert(await q('.missions-screen'), 'A opens the missions list');
  await press(page, BTN.A);
  assert(await q('.briefing-screen'), 'A on a mission opens its briefing');
  assert(/Start mission/.test(await focusedText(page)), 'the briefing opens on Start');
  // difficulty by pad (G106: CT's fixed levels, no sliders): d-pad up to Difficulty, right = Normal -> Realistic
  for (let i = 0; i < 6 && !/Difficulty/.test(await focusedText(page)); i++) await press(page, BTN.UP);
  assert(/Difficulty/.test(await focusedText(page)), `the pad reaches the Difficulty row (${await focusedText(page)})`);
  await press(page, BTN.RIGHT);
  const cd = await page.evaluate(() => ({ choice: document.querySelector('.briefing-screen [data-diff="choice"]')?.textContent ?? '', sliders: document.querySelectorAll('.briefing-screen [data-diff]:not([data-diff="choice"])').length }));
  assert(/Realistic/.test(cd.choice) && cd.sliders === 0, `d-pad right picks Realistic; no custom sliders (${JSON.stringify(cd)})`);
  // back out, then Free roam (the level picked carries over) and Start
  await press(page, BTN.B);
  await press(page, BTN.B);
  assert(await q('.main-menu'), 'B twice returns to the main menu');
  assert(await focusTo(page, /Free roam/), 'focus Free roam');
  await press(page, BTN.A);
  assert(await q('.freeroam-screen'), 'A opens the free roam list');
  await press(page, BTN.A);
  assert(await q('.briefing-screen') && /^Start/.test(await focusedText(page)), 'A on a map opens its briefing on Start');
  await press(page, BTN.A);
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 30000 });
  const rd = await page.evaluate(() => ({ p: window.__app.current.diff.perception, l: window.__app.current.diff.label, m: window.__app.current.enemyMgr?.diff?.perception ?? null }));
  assert(rd.p === 1.3 && rd.l === 'Realistic' && (rd.m === null || rd.m === 1.3), `the match runs Realistic (${JSON.stringify(rd)})`);
  // 3.2.0 controls: D-pad up / down the speed gear, D-pad left held opens the gadget wheel (a tap does not), View tap
  // goggles, View held nothing (emotes deleted, G24)
  const G = (f) => page.evaluate(f);
  const gear0 = await G(() => window.__app.current.player.controller.maxGear);
  await press(page, BTN.UP);
  const gearUp = await G(() => window.__app.current.player.controller.maxGear);
  await press(page, BTN.DOWN);
  await press(page, BTN.DOWN);
  const gearDown = await G(() => window.__app.current.player.controller.maxGear);
  assert(gearUp === gear0 + 1 && gearDown === gear0 - 1, `d-pad up / down step the maximum gear (${gear0} -> ${gearUp} -> ${gearDown})`);
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
  // (wait until the source has read the hold: its tap / hold detector fired, so the release is no tap)
  await holdBtn(BTN.SELECT, 500, () => window.__app.input.gamepad.viewBtn?.fired === true);
  const v2 = await G(() => window.__app.current.vision.mode);
  assert(v2 === vBefore, `View held: goggles untouched (${vBefore} -> ${v2})`);
  // (step 14) View cycles off -> night -> thermal -> electro -> off; the post pass's vision kind follows at mid-flip
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
      await press(page, BTN.SELECT);
      seq.push(await until(want));
    }
    const ok = seq[0].mode === 'thermal' && seq[0].vk === 1 && seq[1].mode === 'electro' && seq[1].vk === 2 && seq[2].mode === 'off' && seq[2].vk === 0;
    assert(ok, `View x3 more: thermal (vk 1) -> electro (vk 2) -> off (vk 0) (${JSON.stringify(seq)})`);
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
        for (let i = 0; i < 5; i++) btn(12);
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
        // L3 with the stick full: sprint, gear 6
        P.set(10, 1);
        k.step(30);
        out.sprint = { g: c.gear, sprinting: c.sprinting };
        P.set(10, 0);
        P.axis(1, 0);
        k.step(40);
        // rocker down twice: maximum 3 caps the full stick at gear 3's 1.65 m/s (step 22, M14)
        btn(13);
        btn(13);
        out.max3 = c.maxGear;
        out.cap = at(1);
        P.axis(1, 0);
        k.step(20);
        // B crouches (toggle), B again stands
        btn(1);
        out.crouch = c.crouched;
        btn(1);
        out.stand = !c.crouched;
        // RB / LB swap, R3 swaps the shoulder, D-pad right held aims the gadget
        const w0 = g.weapons.index;
        btn(5, 2);
        k.step(40);
        out.rb = g.weapons.index !== w0;
        btn(4, 2);
        k.step(40);
        out.lb = g.weapons.index === w0;
        const sh0 = g.player.cam.shoulder;
        btn(11);
        out.r3 = g.player.cam.shoulder === -sh0;
        P.set(15, 1);
        k.step(20);
        out.gadgetAim = g.gadgets.aiming;
        g.gadgets.aiming = false;
        P.set(15, 0);
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
        k.step(40);
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
        btn(3);
        out.tdViaPad = !!g.takedown.active || g.takedown.hostage !== null;
        // (pad Y on a takedown is covered by the corner check below; here only the rumble on completion matters)
        if (!out.tdViaPad && g.takedown.offer) g.takedown.start(false);
        k.until(() => g.takedown.hostage !== null || !e2.alive, 1);
        if (e2.alive && g.takedown.hostage !== null) btn(3);
        k.until(() => !e2.alive, 4);
        k.step(10);
        out.takedown = fx();
        out.tdDone = !e2.alive;
        return out;
      });
      console.log(JSON.stringify(r));
      assert(r.max5 === 5, `D-pad up sets the maximum gear, capped at 5 (${r.max5})`);
      assert(r.a50.g === 2 && r.a80.g === 4 && r.a100.g === 5, `stick 50 / 80 / 100% -> gears 2 / 4 / 5 (A63) (${r.a50.g} / ${r.a80.g} / ${r.a100.g})`);
      // (step 22, M14 N6) the slower caps: gears 2 / 4 / 5 = 1.1 / 2.3 / 3.15 m/s
      assert(Math.abs(r.a50.v - 1.1) < 0.1 && Math.abs(r.a80.v - 2.3) < 0.15 && Math.abs(r.a100.v - 3.15) < 0.2, `speed = the snapped gear's cap (${r.a50.v} / ${r.a80.v} / ${r.a100.v})`);
      assert(r.sprint.sprinting && r.sprint.g === 6, `L3 with a full stick: sprint, gear 6 (${JSON.stringify(r.sprint)})`);
      assert(r.max3 === 3 && r.cap.g === 3 && r.cap.v <= 1.75, `D-pad down x2: maximum 3 caps the full stick (${r.max3}, ${JSON.stringify(r.cap)})`);
      assert(r.crouch && r.stand, 'B crouches and stands');
      assert(r.rb && r.lb, 'RB next weapon, LB previous');
      assert(r.r3, 'R3 swaps the shoulder');
      assert(r.gadgetAim, 'D-pad right held aims the gadget');
      assert(r.land.some((s) => ['0.15/0.25/60', '0.35/0.45/110', '0.80/0.80/200'].includes(s)), `rumble on landing (${r.land})`);
      assert(r.shot.some((s) => ['0.12/0.20/45', '0.40/0.55/80'].includes(s)), `rumble on a shot (${r.shot})`);
      assert(r.elbow.includes('0.50/0.30/90'), `rumble on an elbow hit (${r.elbow})`);
      assert(r.tdDone && r.takedown.includes('0.60/0.40/150'), `rumble on a takedown (${r.tdDone}, offer ${r.tdOffer}, pad ${r.tdViaPad}, ${r.takedown})`);
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
        k.step(75);
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
  console.log('door peek (step 13, D1): A cracks, right stick looks, A closes; stick forward opens quietly');
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
        g.player.controller.teleport(new V(mx + nx * 0.7, an.hinge.y + 0.05, mz + nz * 0.7), yaw);
        g.player.cam.yaw = yaw;
        g.player.cam.pitch = 0;
        a.loop.stepHeadless(0.3, 120);
        const step = (n) => { for (let i = 0; i < n; i++) a.loop.stepHeadless(1 / 60, 120); };
        const P = window.__pad;
        const press = (b) => { P.set(b, 1); step(2); P.set(b, 0); step(1); };
        const st = () => ({ phase: g.doorPeek.phase, cracked: d.cracked, ajar: d.ajar, target: d.target, body: !!d.body, view: g.player.cam.doorPeek, look: Math.atan2(Math.sin(g.player.cam.yaw - g.player.cam.doorYaw), Math.cos(g.player.cam.yaw - g.player.cam.doorYaw)) });
        P.connect();
        step(2);
        press(0);
        step(60);
        const peek = st();
        P.axis(2, 1);
        step(40);
        P.axis(2, 0);
        step(2);
        const looked = st();
        press(0);
        step(30);
        const closed = st();
        // (fix r1) an abandoned crack: LT ends the peek with the door left cracked; A resumes the peek, A closes it
        press(0);
        step(60);
        P.set(6, 1);
        step(6);
        P.set(6, 0);
        step(45);
        const left = st();
        press(0);
        step(30);
        const resumed = st();
        press(0);
        step(30);
        const shut = st();
        press(0);
        step(60);
        const again = st();
        P.axis(1, -1);
        step(10);
        P.axis(1, 0);
        step(5);
        return { peek, looked, closed, left, resumed, shut, again, opened: st() };
      });
      assert(!!r, 'Proving has a door');
      assert(r.peek.phase === 'peek' && r.peek.cracked && Math.abs(r.peek.ajar - 0.12) < 0.01 && r.peek.target === 0 && r.peek.body && r.peek.view === 1, `pad A cracks the shed door 0.12 and peeks (body kept) (${JSON.stringify(r.peek)})`);
      assert(Math.abs(r.looked.look) > 0.3 && Math.abs(r.looked.look) <= (35 * Math.PI) / 180 + 1e-3 && r.looked.phase === 'peek', `the right stick looks, within +-35 deg (${JSON.stringify(r.looked)})`);
      assert(r.closed.phase === 'off' && !r.closed.cracked && r.closed.ajar === 0 && r.closed.body, `pad A closes the crack (${JSON.stringify(r.closed)})`);
      assert(r.left.phase === 'off' && r.left.cracked && r.resumed.phase === 'peek' && r.resumed.cracked && r.resumed.view === 1 && r.shut.phase === 'off' && !r.shut.cracked && r.shut.ajar === 0, `an abandoned crack (LT ended the peek) resumes on A and A closes it (${JSON.stringify({ left: r.left, resumed: r.resumed, shut: r.shut })})`);
      assert(r.again.phase === 'peek' && r.opened.target === 1 && !r.opened.cracked && r.opened.phase === 'off', `the stick forward opens it quietly and ends the peek (${JSON.stringify(r.opened)})`);
    } finally {
      await W.browser.close();
    }
  }
  console.log('wall edge verbs (step 12, D1): stick-to-edge peek, LT lean-out, RT fire, A SWAT, Y corner takedown');
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
        press(0);
        k.step(30);
        const on = k.st();
        P.axis(0, k.sx);
        for (let i = 0; i < 120 && k.st().edge !== k.d.end; i++) k.step(1);
        k.step(10);
        P.axis(0, 0);
        k.step(18);
        // peek: the stick held toward the edge 0.2 s
        P.axis(0, k.sx);
        k.step(36);
        const peek = k.st();
        P.axis(0, 0);
        k.step(30);
        // LT: lean out past the edge, drawn; RT fires from the lean; release: back in
        P.set(6, 1);
        k.step(40);
        const lean = k.st();
        P.set(7, 1);
        k.step(18);
        P.set(7, 0);
        k.step(2);
        const fired = lean.mag - k.st().mag;
        P.set(6, 0);
        k.step(30);
        const back = k.st();
        // A with the stick toward the gap: the SWAT turn to the far wall
        P.axis(0, k.sx);
        k.step(6);
        P.set(0, 1);
        k.step(2);
        P.set(0, 0);
        const swat = k.st();
        P.axis(0, 0);
        k.step(60);
        return { on, peek, lean, fired, back, swat, end: k.st(), to: k.d.to };
      });
      assert(r.on.phase === 'on', `pad A enters the doorway wall (${JSON.stringify(r.on)})`);
      assert(r.peek.peekOn && (r.peek.sub & 16) !== 0 && r.peek.cam === 1, `stick toward the edge held: peek (${JSON.stringify(r.peek)})`);
      assert(r.lean.lk === 1 && r.lean.lean === 1 && (r.lean.sub & 32) !== 0, `LT at the edge: lean-out (lk ${r.lean.lk}, lean ${r.lean.lean})`);
      assert(r.fired > 0, `RT fires from the lean (${r.fired} rounds)`);
      assert(r.back.lk === 0 && r.back.lean === 0, `LT released: back in (lk ${r.back.lk})`);
      assert(r.swat.phase === 'swat' && r.end.phase === 'on' && r.end.seg === r.to, `A with the stick toward the gap: SWAT to the far wall (${r.swat.phase} -> ${r.end.phase}, seg ${r.end.seg} / ${r.to})`);
    } finally {
      await W.browser.close();
    }
    const C = await launch({ url, params: 'autostart=warehouse&mode=clear' });
    try {
      await C.page.waitForFunction(() => !!window.__app?.current?.enemyMgr, null, { timeout: 60000 });
      const kind = await C.page.evaluate(CORNER_SETUP);
      const r = await C.page.evaluate(() => { const k = window.__cn; window.__pad.set(3, 1); k.step(2); window.__pad.set(3, 0); k.step(1); return k.st(); });
      assert(kind === 'corner' && r.td, `pad Y: the corner takedown from the wall edge runs (${kind}, ${JSON.stringify(r)})`);
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
      await click('.settings-screen .tab-panel.active .btn', '^Remap controls');
      await P.waitForTimeout(300);
      const panel = '.controls-screen .tab-panel.active';
      const focusSlot = (b) => G(([p, x]) => window.__app.nav.focus(document.querySelector(`${p} ${x}`)), [panel, b.includes('.') ? b : `.pad-key[data-bind="${b}"]`]);
      const pad = () => G(() => window.__app.settings.get().pad);
      const view = () => G((p) => ({ tab: document.querySelector('.controls-screen .tab.active')?.textContent, rows: [...document.querySelectorAll(`${p} .bind-row.conflict`)].map((r) => r.dataset.row).sort().join(), sum: document.querySelector(`${p} .bind-summary`)?.hidden ? '' : document.querySelector(`${p} .bind-summary`)?.textContent, cap: window.__app.input.gamepad.capturing, screen: !!document.querySelector('.controls-screen') }), panel);
      assert((await view()).tab === 'Controller', `the Controller tab first (${(await view()).tab})`);
      // X on a slot clears it (menu-ui SPEC 7.12): R3 off Swap shoulder
      await focusSlot('shoulder:0');
      await press(P, BTN.X);
      assert((await pad()).shoulder.length === 0, 'X clears the focused slot (R3 off Swap shoulder)');
      // A, then R3: reload moves from X to R3
      await focusSlot('reload:0');
      await press(P, BTN.A);
      const listening = await G((p) => document.querySelector(`${p} .pad-key[data-bind="reload:0"]`).classList.contains('listening'), panel);
      await press(P, BTN.RS);
      let v = await view();
      const lab = await G((p) => document.querySelector(`${p} .pad-key[data-bind="reload:0"]`).textContent, panel);
      assert(listening && JSON.stringify((await pad()).reload) === '[11]' && lab === 'R3' && v.rows === '' && !v.cap, `A then R3 rebinds reload (${lab}, conflicts "${v.rows}")`);
      // (G22, MD13) a capture is cancelled by Menu / Start (the screen stays, the overlay goes, nothing binds)
      await focusSlot('reload:1');
      await press(P, BTN.A);
      const ov = await G(() => ({ o: !!document.querySelector('.cap-overlay'), n: document.querySelector('.cap-overlay .cap-count')?.textContent }));
      await press(P, BTN.START);
      await P.waitForFunction(() => !window.__app.input.gamepad.capturing, null, { timeout: 8000 }).catch(() => {});
      await P.waitForTimeout(300);
      v = await view();
      const ovGone = await G(() => !document.querySelector('.cap-overlay'));
      assert(ov.o && ov.n === '5' && ovGone && !v.cap && v.screen && JSON.stringify((await pad()).reload) === '[11]', `Start cancels the capture; the overlay showed a 5 s countdown (${JSON.stringify({ ...v, ov, ovGone })})`);
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
        // back to a wall: hold mode stays while A is held, toggle mode stays after the release
        await Q.page.evaluate(WALL_HARNESS);
        const w = await Q.page.evaluate(() => {
          const a = window.__app;
          const k = window.__wl;
          const out = {};
          for (const toggle of [false, true]) {
            a.settings.update((d) => void (d.gameplay.wallToggle = toggle));
            window.__pad.set(0, 1);
            k.step(30);
            const held = k.st().phase;
            window.__pad.set(0, 0);
            k.step(20);
            const rel = k.st().phase;
            out[toggle ? 'toggle' : 'hold'] = [held, rel];
            // leave (toggle: a press) and settle
            if (toggle) {
              window.__pad.set(0, 1);
              k.step(2);
              window.__pad.set(0, 0);
            }
            k.step(40);
          }
          return out;
        });
        assert(w.hold[0] === 'on' && w.hold[1] !== 'on' && w.toggle[0] === 'on' && w.toggle[1] === 'on', `back to wall hold / toggle (${JSON.stringify(w)})`);
      } finally {
        await Q.page.close();
      }
      // onto B (crouch): the conflict shows on both rows and in the summary; reset (confirm) restores the defaults
      await focusSlot('reload:0');
      await press(P, BTN.A);
      await press(P, BTN.B);
      v = await view();
      assert(v.rows === 'crouch,reload' && /share B/.test(v.sum) && v.screen && JSON.stringify((await pad()).reload) === '[1]', `A then B binds B (G22), warned on both rows (${JSON.stringify(v)})`);
      // Y: Reset all asks first, Cancel focused (MD18); right then A resets
      await press(P, BTN.Y);
      await P.waitForFunction(() => !!document.querySelector('.dialog-screen'), null, { timeout: 3000 }).catch(() => {});
      const dg = await G(() => ({ d: !!document.querySelector('.dialog-screen'), f: window.__app.nav.focused?.className, t: window.__app.nav.focused?.textContent, cap: window.__app.input.gamepad.capturing, mode: window.__app.input.mode }));
      assert(dg.d && /Cancel/.test(dg.t), `Y Reset all asks first, Cancel focused (${JSON.stringify(dg)})`);
      await press(P, BTN.RIGHT);
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
