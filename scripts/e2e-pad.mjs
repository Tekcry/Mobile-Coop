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
  // F1a controls (CT pad, G181): D-pad up / down the max-speed rocker, LB held opens the selection wheel (a tap switches
  // weapon), D-pad left toggles the vision mode picked on the wheel
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
  const w0 = await G(() => window.__app.current.weapons.slotIndex);
  // (a tap at the input layer: down and up inside one frame, so a slow software-GL frame cannot turn it into a hold)
  await G(() => { const st = window.__app.input.state; st.set('t', 'gadgetWheel', true); st.set('t', 'gadgetWheel', false); });
  await page.waitForTimeout(600);
  const tapWheel = await G(() => window.__app.current.gadgets.wheelOpen);
  const w1 = await G(() => ({ i: window.__app.current.weapons.slotIndex, n: window.__app.current.weapons.slots.length }));
  assert(!tapWheel && (w1.n < 2 || w1.i !== w0), `LB tap switches weapon and leaves the wheel shut (${w0} -> ${w1.i} of ${w1.n})`);
  const held = await holdBtn(BTN.LB, 700, () => window.__app.current.gadgets.wheelOpen);
  await page.waitForFunction(() => !window.__app.current.gadgets.wheelOpen, null, { timeout: 5000 }).catch(() => {});
  const shut = await G(() => window.__app.current.gadgets.wheelOpen);
  assert(held.wheel && !shut, `LB held opens the selection wheel, released closes it (${held.wheel} / ${shut})`);
  // the wheel over the live game: LB held, right stick up pushes the cursor to the vision stack; release picks (the mode goes out to the rim: electro)
  {
    await page.evaluate(() => window.__pad.set(4, 1));
    await page.waitForFunction(() => window.__app.current.gadgets.wheelOpen, null, { timeout: 6000 });
    const ts = await G(() => window.__app.loop.timeScale);
    await page.evaluate(() => window.__pad.axis(3, -1));
    await page.waitForTimeout(700);
    const seen = await G(() => ({ seg: window.__app.current.gadgets.sel.seg, mode: window.__app.current.gadgets.sel.mode, dom: !!document.querySelector('.selection-wheel:not([hidden])'), tiles: document.querySelectorAll('.selection-wheel .sw-tile:not([hidden])').length, label: document.querySelector('.sw-label-name')?.textContent }));
    await page.evaluate(() => window.__pad.axis(3, 0));
    await page.evaluate(() => window.__pad.set(4, 0));
    await page.waitForFunction(() => !window.__app.current.gadgets.wheelOpen, null, { timeout: 5000 }).catch(() => {});
    const sel = await G(() => window.__app.current.vision.selected);
    assert(ts === 1 && seen.seg === 0 && seen.mode === 'electro' && seen.dom && seen.tiles >= 8 && sel === 'electro', `the wheel: no time slow (${ts}), cursor up = vision stack (${JSON.stringify(seen)}), release picks electro (${sel})`);
  }
  const v0 = await G(() => window.__app.current.vision.mode);
  await press(page, BTN.LEFT);
  await page.waitForTimeout(150);
  const v1 = await G(() => window.__app.current.vision.mode);
  await press(page, BTN.LEFT);
  await page.waitForTimeout(150);
  const v2 = await G(() => window.__app.current.vision.mode);
  assert(v0 === 'off' && v1 === 'electro' && v2 === 'off', `D-pad left toggles the vision picked on the wheel, on then off (${v0} -> ${v1} -> ${v2})`);
  // vision switched between modes (the wheel with the goggles on): no flip, no off in between
  {
    await press(page, BTN.LEFT);
    await G(() => window.__app.current.gadgets.applyPick({ kind: 'vision', mode: 'thermal' }));
    const sw = await G(() => ({ mode: window.__app.current.vision.mode, change: window.__app.current.vision.change }));
    await press(page, BTN.LEFT);
    assert(sw.mode === 'thermal' && sw.change === 'switch', `picking another mode while on switches live, never a flip (${JSON.stringify(sw)})`);
  }
  // (F1a) the legacy cycle-order block, now through the vision object's cycle (instant cuts)
  {
    const vis = () => G(() => ({ mode: window.__app.current.vision.mode, shown: window.__app.current.vision.shown, vk: window.__app.current.post.visionKind }));
    const until = async (want) => {
      let r = await vis();
      for (let i = 0; i < 160 && (r.mode !== want || r.shown !== want || r.vk !== (want === 'electro' ? 2 : 0)); i++) {
        await page.waitForTimeout(50);
        r = await vis();
      }
      return r;
    };
    const seq = [];
    // (let the held-View release settle before the next tap)
    await page.waitForTimeout(400);
    await G(() => window.__app.current.vision.set('thermal'));
    for (const want of ['electro', 'night', 'off']) {
      await G(() => window.__app.current.vision.cycle());
      seq.push(await until(want));
    }
    const ok = seq[0].mode === 'electro' && seq[0].vk === 2 && seq[1].mode === 'night' && seq[1].vk === 0 && seq[2].mode === 'off' && seq[2].vk === 0;
    assert(ok, `cycle x3 more: electro (vk 2) -> night (vk 0) -> off (vk 0) (${JSON.stringify(seq)})`);
  }
  // (F1a, CT) holstered unless drawn: X draws (a toggle), RT then fires, X again holsters; RT while holstered is the lethal
  // strike (fixed steps, the pad polled every step)
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
    const tapX = () => {
      window.__pad.set(2, 1);
      L.stepHeadless(1 / 60);
      window.__pad.set(2, 0);
      L.stepHeadless(1 / 60);
    };
    const tapA = () => {
      window.__pad.set(0, 1);
      L.stepHeadless(1 / 60);
      window.__pad.set(0, 0);
      L.stepHeadless(1 / 60);
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
    // (F1a, CT) X draws (a toggle: no held aim button); the draw is about half of G103's
    tapX();
    const tDraw = until(() => w.drawPhase === 2, 2);
    const adsAfterDraw = g.player.ads;
    until(() => g.player.cam.ads >= 0.9 && g.player.carry.raise >= 0.9, 2); // the carry raise gates the trigger
    window.__pad.set(7, 1);
    L.stepHeadless(0.3);
    window.__pad.set(7, 0);
    const s2 = shots();
    // LT drawn is the secondary fire: the held jammer (B3), it never fires a round
    L.stepHeadless(0.3);
    const s2b = shots();
    window.__pad.set(6, 1);
    L.stepHeadless(0.3);
    window.__pad.set(6, 0);
    const s2c = shots();
    tapX();
    const adsAfterHolster = g.player.ads;
    const tHol = until(() => w.drawPhase === 0, 2);
    // (A43) holstering mid-reload finishes the reload, then holsters
    const cur = w.current;
    cur.mag = Math.max(0, cur.stats.magSize - 3);
    if (cur.reserve < 10) cur.reserve = 60;
    tapX();
    until(() => w.drawPhase === 2 && g.player.cam.ads >= 0.9, 2);
    tapA(); // A while drawn reloads
    const relReloading = w.reloading;
    L.stepHeadless(0.2);
    tapX(); // holster mid-reload
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
    // (step 10: RT pressed while holstered is the strike, so RT goes down as the reload's draw starts; the reload is the key R on
    // the keyboard: the pad's A is interact while holstered)
    window.__app.input.state.tap('reload');
    window.__pad.set(7, 1);
    const hDraw = until(() => w.reloading, 2);
    const hDrawn = w.drawPhase === 2 && !g.player.ads;
    const hT = until(() => !w.reloading, 5);
    const hFull = cur.mag === cur.stats.magSize;
    const hHol = until(() => w.drawPhase === 0, 2);
    window.__pad.set(7, 0);
    const s4 = shots();
    return { struck, s0, s1, s2, s2b, s2c, adsAfterDraw, adsAfterHolster, tDraw, tHol, cls: cur.def.class, raise0, raiseMax, aimed, relReloading, relDrop, relT, relFull, relHol, hDraw, hDrawn, hT, hFull, hHol, s3, s4 };
  });
  assert(dr.raiseMax - dr.raise0 < 0.01 && !dr.aimed, `RT while holstered: carry.raise and aiming unchanged (${dr.raise0.toFixed(3)} -> max ${dr.raiseMax.toFixed(3)}, aiming ${dr.aimed})`);
  assert(dr.relReloading && !dr.relDrop && dr.relFull && dr.relHol < 0.65, // A2.1: holster 0.55 s (G103)
    `X (holster) mid-reload: the reload finishes (${dr.relT.toFixed(2)} s, full ${dr.relFull}, stayed drawn ${!dr.relDrop}), then holsters (${dr.relHol.toFixed(2)} s)`);
  assert(dr.hDraw <= 1.2 && dr.hDrawn && dr.hFull && dr.hHol < 0.65 && dr.s4 === dr.s3, `reload while holstered: draws to low ready (${dr.hDraw.toFixed(2)} s), reloads (${dr.hT.toFixed(2)} s, full ${dr.hFull}), holsters (${dr.hHol.toFixed(2)} s), never fires (${dr.s3} -> ${dr.s4})`);
  assert(!dr.struck, 'RT while holstered with no guard in reach: no strike (F1b: no swing at nothing)');
  assert(dr.s1 === dr.s0, `RT while holstered: shot tally unchanged (${dr.s0} -> ${dr.s1})`);
  assert(dr.tDraw <= 0.5 && dr.adsAfterDraw, `X draws within 0.5 s and stays drawn with no button held (F1a: 0.3 pistol / 0.4 rifle) (${dr.tDraw.toFixed(2)} s, ${dr.cls})`);
  assert(dr.s2 > dr.s1, `drawn, RT fires (${dr.s1} -> ${dr.s2})`);
  assert(dr.s2c === dr.s2b, `drawn, LT is the held jammer and fires no round (${dr.s2b} -> ${dr.s2c})`);
  assert(dr.tHol <= 0.65 && !dr.adsAfterHolster, `X again holsters within 0.65 s (G103: 0.55) (${dr.tHol.toFixed(2)} s)`);
  await press(page, BTN.START);
  assert(await q('.pause-screen'), 'Start opens pause');
  await press(page, BTN.B);
  assert(!(await q('.pause-screen')), 'B resumes');
  await press(page, BTN.START);
  for (let i = 0; i < 4; i++) await press(page, BTN.DOWN);
  assert(/Report feedback/.test(await focusedText(page)), 'focus Report feedback');
  await press(page, BTN.DOWN);
  assert(/Quit/.test(await focusedText(page)), 'focus Quit');
  await press(page, BTN.A);
  assert(await q('.dialog'), 'confirm dialog');
  assert(/Stay/.test(await focusedText(page)), 'dialog opens on the safe option (Stay)');
  await press(page, BTN.RIGHT);
  assert(/Quit/.test(await focusedText(page)), 'right moves to Quit');
  await press(page, BTN.A);
  await page.waitForTimeout(400);
  assert(await q('.main-menu'), 'quit returns to main menu');

  console.log('palm strike (RT while holstered: lethal; LT: knockout)');
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
        const lt = () => {
          window.__pad.set(6, 1);
          k.step(2);
          window.__pad.set(6, 0);
          k.step(1);
        };
        const out = {};
        // behind an unaware guard: killed at contact (about 0.12 s, F1a: RT is the lethal strike)
        let e = k.setup('grunt', false, 0);
        rt();
        out.started = g.strike.active;
        out.tKo = 3 / 60 + k.until(() => !e.alive, 1.5);
        out.ko = !e.alive && !e.ko;
        k.until(() => !g.strike.active, 2);
        // LT is the knockout
        e = k.setup('grunt', false, 0);
        lt();
        k.until(() => !e.alive, 1.5);
        out.ltKo = !e.alive && e.ko;
        k.until(() => !g.strike.active, 2);
        // (A4, G42) an aware guard facing: one hit, no stagger
        e = k.setup('grunt', true, Math.PI);
        rt();
        k.until(() => !e.alive, 1);
        out.facing = { ko: !e.alive, stag: g.strike.count.stagger };
        k.until(() => !g.strike.active, 2);
        // (G155) a heavy from the front: one hit too
        e = k.setup('heavy', true, Math.PI);
        rt();
        k.until(() => !e.alive, 1);
        out.heavy = { alive: e.alive, ko: e.ko };
        k.until(() => !g.strike.active, 2);
        // (F1b) no guard in reach: the press swings at nothing no more
        k.setup(null);
        rt();
        out.nothing = g.strike.active;
        k.until(() => g.strike.active, 0.3);
        out.nothingAfter = g.strike.active;
        return out;
      });
      assert(r.started && r.ko && r.tKo <= 0.3, `RT holstered behind an unaware guard: killed in ${r.tKo.toFixed(2)} s (<= 0.3)`);
      assert(r.ltKo, 'LT holstered: the knockout (the guard goes down knocked out, not killed)');
      assert(r.facing.ko && r.facing.stag === 0, `RT on an aware guard facing: one hit (${JSON.stringify(r.facing)})`);
      assert(!r.heavy.alive, `a heavy from the front: down too (${JSON.stringify(r.heavy)})`);
      assert(!r.nothing && !r.nothingAfter, 'RT with no guard in reach: no strike starts (F1b)');
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
        // the stick full: no sprint (CT prototype M1)
        k.step(30);
        out.sprint = { g: c.gear, sprinting: c.sprinting };
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
        // (F1a, CT) L3 swaps the shoulder only while aiming (X drew the weapon); R3 zooms (scoped weapons only); D-pad right held
        // aims the selected gadget
        out.rb = true;
        out.lb = true;
        const sh0 = g.player.cam.shoulder;
        btn(10); // not aiming, L3 is the wall button (no wall here) and swaps nothing
        const r3Idle = g.player.cam.shoulder === sh0;
        btn(2); // X draws
        k.step(60);
        btn(10);
        out.r3 = r3Idle && g.player.cam.shoulder === -sh0 && g.player.ads;
        out.leftHand = g.player.rig.openLeft;
        btn(10);
        btn(2); // X holsters
        k.step(40);
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
        btn(2); // X draws
        k.until(() => g.weapons.drawPhase === 2 && g.player.cam.ads >= 0.9 && g.player.carry.raise >= 0.9, 3); // F1a: draw 0.3-0.4 s
        out.shotDbg = { dw: g.weapons.drawPhase, ads: g.player.ads, cam: g.player.cam.ads, raise: g.player.carry.raise, cls: g.weapons.current.def.class, mag: g.weapons.current.mag, tr: g.player.pose.traverse };
        P.set(7, 1);
        k.step(3);
        P.set(7, 0);
        k.step(10);
        btn(2); // X holsters
        k.until(() => g.weapons.drawPhase === 0, 2);
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
        if (e2.alive && g.takedown.hostage !== null) {
          // (A4: the grab menu's Knock out, the first entry)
          k.step(3);
          g.grabMenu.sel = 0;
          btn(0);
        }
        k.until(() => !e2.alive, 4);
        k.step(10);
        out.takedown = fx();
        out.tdDone = !e2.alive;
        return out;
      });
      console.log(JSON.stringify(r));
      assert(r.max5 === 5, `D-pad up sets the maximum gear, capped at 5 (${r.max5})`);
      assert(r.a50.g === 3 && r.a80.g === 4 && r.a100.g === 5, `stick 50 / 80 / 100% -> speeds 3 / 4 / 5 (CT M1) (${r.a50.g} / ${r.a80.g} / ${r.a100.g})`);
      // (CT prototype M1) speeds 3 / 4 / 5 = 2.0 / 3.0 / 4.2 m/s
      assert(Math.abs(r.a50.v - 2.0) < 0.15 && Math.abs(r.a80.v - 3.0) < 0.2 && Math.abs(r.a100.v - 4.2) < 0.25, `speed = the snapped gear's cap (${r.a50.v} / ${r.a80.v} / ${r.a100.v})`);
      assert(!r.sprint.sprinting && r.sprint.g === 5, `a full stick: no sprint, still speed 5 (${JSON.stringify(r.sprint)})`);
      assert(r.max3 === 3 && r.cap.g === 3 && r.cap.v <= 2.1, `D-pad down x2: maximum 3 caps the full stick (${r.max3}, ${JSON.stringify(r.cap)})`);
      assert(r.crouch && r.stand, 'B crouches and stands');
      assert(r.r3, 'L3 swaps the shoulder while aiming (X drew), not otherwise');
      assert(r.leftHand, 'the weapon goes to the left hand on the left shoulder');
      assert(r.gadgetAim, 'D-pad right held aims the gadget');
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
  console.log('wall edge verb (step 12, D1; A3): stick-to-edge peek at once, X (draw) leaves the wall, A corner takedown');
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
        // X: drawing the weapon (aiming) leaves the wall
        P.set(2, 1);
        k.step(3);
        P.set(2, 0);
        k.step(20);
        const aim = k.st();
        P.set(2, 1);
        k.step(3);
        P.set(2, 0);
        k.step(30);
        return { on, peek, aim };
      });
      assert(r.on.phase === 'on', `pad L3 enters the doorway wall (${JSON.stringify(r.on)})`);
      assert(r.peek.peekOn && (r.peek.sub & 16) !== 0 && r.peek.cam === 1, `stick toward the edge: peek at once (${JSON.stringify(r.peek)})`);
      assert(r.aim.phase !== 'on' && r.aim.phase !== 'entering', `X (draw) leaves the wall (${r.aim.phase})`);
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
  console.log('remap (step 18, D7): Controls > Controller by pad: clear R3, draw X -> R3, play; onto B warns; reset; crouch and wall hold / toggle');
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
      // X on a slot clears it (menu-ui SPEC 7.12): R3 off Zoom
      await focusSlot('zoom:0');
      await press(P, BTN.X);
      assert((await pad()).zoom.length === 0, 'X clears the focused slot (R3 off Zoom)');
      // A, then R3: draw / holster moves from X to R3
      await focusSlot('draw:0');
      await press(P, BTN.A);
      const listening = await G((p) => document.querySelector(`${p} .pad-key[data-bind="draw:0"]`).classList.contains('listening'), panel);
      await press(P, BTN.RS);
      let v = await view();
      const lab = await G((p) => document.querySelector(`${p} .pad-key[data-bind="draw:0"]`).textContent, panel);
      assert(listening && JSON.stringify((await pad()).draw) === '[11]' && lab === 'R3' && v.rows === '' && !v.cap, `A then R3 rebinds draw (${lab}, conflicts "${v.rows}")`);
      // (G22, MD13) a capture is cancelled by Menu / Start (the screen stays, the overlay goes, nothing binds)
      await focusSlot('draw:1');
      await press(P, BTN.A);
      const ov = await G(() => ({ o: !!document.querySelector('.cap-overlay'), n: document.querySelector('.cap-overlay .cap-count')?.textContent }));
      await press(P, BTN.START);
      await P.waitForFunction(() => !window.__app.input.gamepad.capturing, null, { timeout: 8000 }).catch(() => {});
      await P.waitForTimeout(300);
      v = await view();
      const ovGone = await G(() => !document.querySelector('.cap-overlay'));
      assert(ov.o && ['5', '4'].includes(ov.n) && ovGone && !v.cap && v.screen && JSON.stringify((await pad()).draw) === '[11]', `Start cancels the capture; the overlay showed the 5 s countdown (5 or 4 on a slow frame) (${JSON.stringify({ ...v, ov, ovGone })})`);
      // play: the new button draws, X does not (settings persist through IndexedDB to a new page)
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
          const pl = a.current.player;
          btn(2);
          const x = pl.ads;
          btn(11);
          const r3 = pl.ads;
          btn(11);
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
          return { x, r3, t1, t2, h1, h2, pad: a.settings.get().pad.draw };
        });
        assert(r.r3 && !r.x && JSON.stringify(r.pad) === '[11]', `in play R3 draws, X does not (${JSON.stringify(r)})`);
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
      await focusSlot('draw:0');
      await press(P, BTN.A);
      await press(P, BTN.B);
      v = await view();
      assert(v.rows === 'crouch,draw' && /share B/.test(v.sum) && v.screen && JSON.stringify((await pad()).draw) === '[1]', `A then B binds B (G22), warned on both rows (${JSON.stringify(v)})`);
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
      assert(JSON.stringify(def.draw) === '[2]' && JSON.stringify(def.zoom) === '[11]' && v.rows === '' && v.screen, `reset restores the controller defaults (${JSON.stringify(def.draw)})`);
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
