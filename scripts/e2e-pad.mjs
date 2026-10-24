// Controller-only navigation test: every step uses the fake gamepad, never the screen.
// Run against `npm run preview` (default http://localhost:4173/).
import { launch, openPage, press, pressPair, stick, frames, BTN, focusedText, focusTo, assert } from './e2e-lib.mjs';

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
  g.player.controller.teleport(new V(s.ax + s.tx * s.len / 2 + s.nx * 0.75, s.y + 0.05, s.az + s.tz * s.len / 2 + s.nz * 0.75), yaw);
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
  // (test-speed) the toast is noticed on a frame: wait for it (as the disconnect toast) instead of a fixed 250 ms
  await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /Controller connected/.test(t.textContent ?? '')), null, { timeout: 8000 }).catch(() => {});
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
  // (test-speed) the toast shows on a frame: wait for it (8 s cap) instead of reading it at once (failed under load, run 5)
  await page.waitForFunction(() => /always on/.test(document.querySelector('.toasts')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {});
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
  // (sector-ops slice 1: the main menu starts on Sector Ops, which opens its briefing)
  for (let i = 0; i < 8 && !/^Sector Ops/.test(await focusedText(page)); i++) await press(page, BTN.UP);
  assert(/^Sector Ops/.test(await focusedText(page)), 'menu wraps / reaches Sector Ops');
  await press(page, BTN.A);
  // (sector-ops M7) the op list first, on the Warehouse
  assert(await q('.sectorops-screen'), 'A on Sector Ops opens the op list');
  await press(page, BTN.A);
  assert(await q('.briefing-screen'), 'A on the op opens its briefing');
  assert(/^Start/.test(await focusedText(page)), 'the briefing opens on Start');
  // difficulty by pad (G106: CT's fixed levels, no sliders): d-pad up to Difficulty, right = Normal -> Realistic
  for (let i = 0; i < 6 && !/Difficulty/.test(await focusedText(page)); i++) await press(page, BTN.UP);
  assert(/Difficulty/.test(await focusedText(page)), `the pad reaches the Difficulty row (${await focusedText(page)})`);
  await press(page, BTN.RIGHT);
  const cd = await page.evaluate(() => ({ choice: document.querySelector('.briefing-screen [data-diff="choice"]')?.textContent ?? '', sliders: document.querySelectorAll('.briefing-screen [data-diff]:not([data-diff="choice"])').length }));
  assert(/Realistic/.test(cd.choice) && cd.sliders === 0, `d-pad right picks Realistic; no custom sliders (${JSON.stringify(cd)})`);
  await press(page, BTN.B);
  assert(await q('.sectorops-screen'), 'B returns to the op list');
  await press(page, BTN.B);
  assert(await q('.main-menu'), 'B returns to the main menu');
  // the checks below need an empty map (Free roam, only behind ?legacy=1 now): the test hook starts it at the level picked
  await page.evaluate(() => window.__play('warehouse', 'sandbox', 'realistic'));
  // (marlow-bays item 29) the warehouse match builds its voxel world in workers first: under a loaded run (E2E_JOBS=2) that
  // took over 30 s on the laptop; the match start is the real condition, waited for as e2e-lib waits for an autostart
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 120000 });
  const rd = await page.evaluate(() => ({ p: window.__app.current.diff.perception, l: window.__app.current.diff.label, m: window.__app.current.enemyMgr?.diff?.perception ?? null }));
  assert(rd.p === 1.3 && rd.l === 'Realistic' && (rd.m === null || rd.m === 1.3), `the match runs Realistic (${JSON.stringify(rd)})`);
  // (anim-rework S1) the pad: D-pad up / down no longer step a speed (the stick sets it), LB held opens the selection
  // wheel (a tap switches weapon), D-pad left toggles the vision mode picked on the wheel
  const G = (f) => page.evaluate(f);
  const gear0 = await G(() => window.__app.current.player.controller.maxGear);
  await press(page, BTN.UP);
  const gearUp = await G(() => window.__app.current.player.controller.maxGear);
  await press(page, BTN.DOWN);
  await press(page, BTN.DOWN);
  const gearDown = await G(() => window.__app.current.player.controller.maxGear);
  assert(gearUp === gear0 && gearDown === gear0, `d-pad up / down no longer step a speed (anim-rework S1: no gears) (${gear0} -> ${gearUp} -> ${gearDown})`);
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
  // (test-speed) wait for the switch, not a fixed 600 ms: under load the game had not run the frames yet ("0 -> 0")
  await page.waitForFunction((w0) => window.__app.current.weapons.slots.length < 2 || window.__app.current.weapons.slotIndex !== w0, w0, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(150);
  const tapWheel = await G(() => window.__app.current.gadgets.wheelOpen);
  const w1 = await G(() => ({ i: window.__app.current.weapons.slotIndex, n: window.__app.current.weapons.slots.length }));
  assert(!tapWheel && (w1.n < 2 || w1.i !== w0), `LB tap switches weapon and leaves the wheel shut (${w0} -> ${w1.i} of ${w1.n})`);
  const held = await holdBtn(BTN.LB, 700, () => window.__app.current.gadgets.wheelOpen);
  await page.waitForFunction(() => !window.__app.current.gadgets.wheelOpen, null, { timeout: 5000 }).catch(() => {});
  const shut = await G(() => window.__app.current.gadgets.wheelOpen);
  assert(held.wheel && !shut, `LB held opens the selection wheel, released closes it (${held.wheel} / ${shut})`);
  // the wheel over the live game: LB held, right stick up lights the vision slot; (nv-pass slice 3) A steps the mode
  // like a carousel from the selected one (night -> thermal -> electro), never reaching the context menu; release picks
  {
    const s0 = await G(() => window.__app.current.vision.selected);
    await page.evaluate(() => window.__pad.set(4, 1));
    await page.waitForFunction(() => window.__app.current.gadgets.wheelOpen, null, { timeout: 6000 });
    const ts = await G(() => window.__app.loop.timeScale);
    // (sector-fixes W, item 8) the stick right lights another slot; let go and it is back on the vision slot, so A
    // cycles the mode with no stick. (pad-wheel-wait) 0.3 s of the match's own clock, not 300 ms of wall time: under
    // load (E2E_JOBS=2) the game had not polled the stick yet when the wall wait ran out
    const simWait = (sec) => page.evaluate((sec) => new Promise((r) => window.__afterSim(sec, r)), sec);
    await page.evaluate(() => window.__pad.axis(2, 1));
    await simWait(0.3);
    const segOut = await G(() => window.__app.current.gadgets.sel.seg);
    await page.evaluate(() => window.__pad.axis(2, 0));
    await simWait(0.3);
    const segBack = await G(() => window.__app.current.gadgets.sel.seg);
    const m0 = await G(() => window.__app.current.gadgets.sel.mode);
    await press(page, BTN.A);
    await press(page, BTN.A);
    await page.waitForTimeout(150);
    const ctx = await G(() => window.__app.current.ctxMenu.state);
    const seen = await G(() => ({ seg: window.__app.current.gadgets.sel.seg, mode: window.__app.current.gadgets.sel.mode, dom: !!document.querySelector('.selection-wheel:not([hidden])'), tiles: document.querySelectorAll('.selection-wheel .sw-tile:not([hidden])').length, label: document.querySelector('.sw-label-name')?.textContent }));
    await page.evaluate(() => window.__pad.set(4, 0));
    await page.waitForFunction(() => !window.__app.current.gadgets.wheelOpen, null, { timeout: 5000 }).catch(() => {});
    const sel = await G(() => window.__app.current.vision.selected);
    assert(segOut > 0 && segBack === 0, `(sector-fixes W) the stick right lights a slot (${segOut}); let go, the wheel is back on the vision slot (${segBack})`);
    assert(ts === 1 && s0 === 'night' && m0 === 'night' && seen.seg === 0 && seen.mode === 'electro' && ctx !== 'active' && seen.dom && seen.tiles >= 8 && sel === 'electro', `the wheel: no time slow (${ts}), opens on the selected mode (${s0} / ${m0}), no stick = vision slot, A x2 steps to electro (${JSON.stringify(seen)}), no context menu (${ctx}), release picks electro (${sel})`);
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
  // (anim-rework S1, BRIEF section 1) the three weapon states: X taps holster <-> low ready, LT held aims (release: low
  // ready), RT fires only while aiming (A3), X held reloads with the gun out (A2), LT from holstered is the slower sling
  // draw (M2); RT while holstered is the strike (tap knockout, hold kill; no guard: nothing). Fixed steps, the pad polled
  // every step.
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
    // (step 10, F1b) no guard in reach: the RT tap swings at nothing, so no strike
    const struck = g.strike.count.started > 0;
    until(() => !g.strike.active, 2);
    const s1 = shots();
    // X tap draws to low ready (the explore camera, no aim)
    tapX();
    const tDraw = until(() => w.drawPhase === 2, 2);
    const lowState = g.player.weaponState;
    const adsAfterDraw = g.player.ads;
    // A3: RT at low ready fires nothing
    window.__pad.set(7, 1);
    L.stepHeadless(0.3);
    window.__pad.set(7, 0);
    L.stepHeadless(0.1);
    const s1b = shots();
    // LT held aims; RT then fires; LT let go: low ready again (the gun stays out)
    window.__pad.set(6, 1);
    until(() => g.player.cam.ads >= 0.9 && g.player.carry.raise >= 0.9, 2); // the carry raise gates the trigger
    const aimState = g.player.weaponState;
    window.__pad.set(7, 1);
    L.stepHeadless(0.3);
    window.__pad.set(7, 0);
    const s2 = shots();
    window.__pad.set(6, 0);
    L.stepHeadless(0.3);
    const afterLt = { st: g.player.weaponState, dw: w.drawPhase, ads: g.player.ads };
    tapX();
    const adsAfterHolster = g.player.ads;
    const tHol = until(() => w.drawPhase === 0, 2);
    // (A43) holstering mid-reload finishes the reload, then holsters
    const cur = w.current;
    cur.mag = Math.max(0, cur.stats.magSize - 3);
    if (cur.reserve < 10) cur.reserve = 60;
    tapX();
    until(() => w.drawPhase === 2, 2);
    // (Michael 14:55 "Interact always") A at low ready never reloads; X held does (A2)
    tapA();
    const aNoReload = !w.reloading;
    window.__pad.set(2, 1);
    until(() => w.reloading, 1);
    window.__pad.set(2, 0);
    L.stepHeadless(1 / 60);
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
    // (A2) X held with the gun out reloads; held again with a full magazine it holsters
    cur.mag = Math.max(0, cur.stats.magSize - 3);
    tapX();
    until(() => w.drawPhase === 2, 2);
    window.__pad.set(2, 1);
    const xHoldT = until(() => w.reloading, 1);
    window.__pad.set(2, 0);
    L.stepHeadless(1 / 60);
    const xHoldStill = w.drawPhase === 2;
    until(() => !w.reloading, 5);
    const xFull = cur.mag === cur.stats.magSize;
    window.__pad.set(2, 1);
    L.stepHeadless(0.6);
    window.__pad.set(2, 0);
    // (anim-natural N3) the deliberate holster: 1.0 s rifle / 0.9 s pistol
    const xFullHol = until(() => w.drawPhase === 0, 2) < 1.5 && !w.reloading;
    L.stepHeadless(0.2);
    // (M2) LT from holstered: straight to the aim through the sling draw, slower than X's draw
    window.__pad.set(6, 1);
    L.stepHeadless(1 / 60);
    const slingState = g.player.weaponState;
    const tSling = until(() => w.drawPhase === 2, 2);
    until(() => g.player.cam.ads >= 0.9, 2);
    const slingAim = g.player.ads;
    window.__pad.set(6, 0);
    L.stepHeadless(0.2);
    const slingLow = g.player.weaponState === 'lowReady' && w.drawPhase === 2;
    tapX();
    until(() => w.drawPhase === 0, 2);
    // (A43) reload pressed while holstered: draws to low ready, reloads, holsters; RT held throughout never fires
    cur.mag = Math.max(0, cur.stats.magSize - 3);
    const s3 = shots();
    // (step 10: RT pressed while holstered is the strike, so RT goes down as the reload's draw starts; the reload is the key R on
    // the keyboard: the pad's A is interact while holstered)
    window.__app.input.state.tap('reload');
    window.__pad.set(7, 1);
    const hDraw = until(() => w.reloading, 2);
    const hDrawn = w.drawPhase === 2 && !g.player.ads && g.player.weaponState === 'lowReady';
    const hT = until(() => !w.reloading, 5);
    const hFull = cur.mag === cur.stats.magSize;
    // (anim-rework S1) the state follows the gun: low ready, and it stays out after the reload
    L.stepHeadless(0.5);
    const hHol = w.drawPhase === 2 && g.player.weaponState === 'lowReady';
    window.__pad.set(7, 0);
    const s4 = shots();
    return { aNoReload, struck, s0, s1, s1b, s2, lowState, aimState, afterLt, adsAfterDraw, adsAfterHolster, tDraw, tHol, cls: cur.def.class, raise0, raiseMax, aimed, relReloading, relDrop, relT, relFull, relHol, xHoldT, xHoldStill, xFull, xFullHol, slingState, tSling, slingAim, slingLow, hDraw, hDrawn, hT, hFull, hHol, s3, s4 };
  });
  assert(dr.aNoReload, 'A at low ready does not reload (Michael: "Interact always")');
  assert(dr.raiseMax - dr.raise0 < 0.01 && !dr.aimed, `RT while holstered: carry.raise and aiming unchanged (${dr.raise0.toFixed(3)} -> max ${dr.raiseMax.toFixed(3)}, aiming ${dr.aimed})`);
  // (anim-natural N3, docs/anim-natural/n3/DRAW-TIMES.md) X draws to low ready in 1.1 s (rifle) / 0.75 s (pistol), the
  // holster takes 1.0 / 0.9 s, the LT sling draw 1.5 / 1.2 s (undo: 0.3 / 0.5 s draws, 0.15 s holster)
  const drawT = dr.cls === 'pistol' ? 0.75 : 1.1;
  const holT = dr.cls === 'pistol' ? 0.9 : 1.0;
  assert(dr.relReloading && !dr.relDrop && dr.relFull && dr.relHol < holT + 0.1,
    `X (holster) mid-reload: the reload finishes (${dr.relT.toFixed(2)} s, full ${dr.relFull}, stayed drawn ${!dr.relDrop}), then holsters (${dr.relHol.toFixed(2)} s)`);
  assert(dr.hDraw <= drawT + 0.3 && dr.hDrawn && dr.hFull && dr.hHol && dr.s4 === dr.s3, `reload while holstered (R): draws to low ready (${dr.hDraw.toFixed(2)} s, state low ready ${dr.hDrawn}), reloads (${dr.hT.toFixed(2)} s, full ${dr.hFull}), stays at low ready (${dr.hHol}), never fires (${dr.s3} -> ${dr.s4})`);
  assert(!dr.struck, 'RT while holstered with no guard in reach: no strike (F1b: no swing at nothing)');
  assert(dr.s1 === dr.s0, `RT while holstered: shot tally unchanged (${dr.s0} -> ${dr.s1})`);
  assert(dr.tDraw <= drawT + 0.1 && dr.lowState === 'lowReady' && !dr.adsAfterDraw, `X draws to low ready within ${drawT} s, no aim (anim-rework S1, M1; N3) (${dr.tDraw.toFixed(2)} s, ${dr.cls}, ${dr.lowState})`);
  assert(dr.s1b === dr.s1, `low ready: RT fires nothing (A3) (${dr.s1} -> ${dr.s1b})`);
  assert(dr.aimState === 'aiming' && dr.s2 > dr.s1b, `LT held aims and RT fires (${dr.aimState}, ${dr.s1b} -> ${dr.s2})`);
  assert(dr.afterLt.st === 'lowReady' && dr.afterLt.dw === 2 && !dr.afterLt.ads, `LT let go: low ready, the gun stays out (${JSON.stringify(dr.afterLt)})`);
  assert(dr.tHol <= holT + 0.1 && !dr.adsAfterHolster, `X again holsters within ${holT} s (N3) (${dr.tHol.toFixed(2)} s)`);
  assert(dr.xHoldT >= 0.35 && dr.xHoldT <= 0.6 && dr.xHoldStill && dr.xFull, `X held 0.4 s with the gun out reloads (A2) and stays drawn (${dr.xHoldT.toFixed(2)} s, full ${dr.xFull})`);
  assert(dr.xFullHol, 'X held with nothing to reload holsters');
  assert(dr.slingState === 'slingDraw' && dr.slingAim && dr.tSling > dr.tDraw * 1.25 && dr.slingLow, `LT from holstered: the sling draw straight to the aim, slower (M2: ${dr.tSling.toFixed(2)} s vs X ${dr.tDraw.toFixed(2)} s); let go: low ready (${dr.slingLow})`);
  // (marlow-bays item 29) the on-screen pause button is a touch thing: never shown in pad play
  assert(!(await page.evaluate(() => document.body.classList.contains('touch-play') || getComputedStyle(document.querySelector('.touch-pause')).display !== 'none')), 'pad play: no on-screen pause button');
  await press(page, BTN.START);
  assert(await q('.pause-screen'), 'Start opens pause');
  await press(page, BTN.B);
  assert(!(await q('.pause-screen')), 'B resumes');
  await press(page, BTN.START);
  for (let i = 0; i < 3; i++) await press(page, BTN.DOWN); // Resume, Objectives, Settings, Report feedback (menu-notes A2: no Controls item)
  assert(/Report feedback/.test(await focusedText(page)), 'focus Report feedback');
  await press(page, BTN.DOWN);
  assert(/Animation tuner/.test(await focusedText(page)), 'focus Animation tuner (dev)'); // (anim-tuner: before Quit)
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

  // (process audit, 2026-10-19) the gameplay sections that each opened their own match (palm strike, back to a wall,
  // door menu, wall edge verb) are gone: the pad verb table below checks every button's action, and the behaviour is
  // the system suites' (e2e-takedown, e2e-wall, e2e-stealth-ai)
  console.log('analogue speed (anim-rework S1), the internal cap, rumble, pad verbs (step 17)');
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
        // (anim-rework S1) no rocker: D-pad up / down leave the speed cap alone; the cap (tests only) off for the curve
        const cap0 = c.maxGear;
        for (let i = 0; i < 3; i++) btn(12);
        btn(13);
        out.capKept = c.maxGear === cap0;
        c.gears.set(5);
        // analogue: raw stick 50 / 80 / 100% forward -> sneak / walk / run (the STICK_SPEED curve)
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
        // the internal cap (tests, ?gear=3) holds the full stick at gear 3's speed
        c.gears.set(3);
        out.max3 = c.maxGear;
        out.cap = at(1);
        c.gears.set(5);
        P.axis(1, 0);
        k.step(20);
        // B crouches (toggle), B again stands
        btn(1);
        out.crouch = c.crouched;
        btn(1);
        out.stand = !c.crouched;
        // (F1a, CT; anim-rework S1) L3 swaps the shoulder only while aiming (X drew the weapon, LT held aims); R3 zooms (scoped
        // weapons only); D-pad right held aims the selected gadget
        out.rb = true;
        out.lb = true;
        const sh0 = g.player.cam.shoulder;
        btn(10); // not aiming, L3 is the wall button (no wall here) and swaps nothing
        const r3Idle = g.player.cam.shoulder === sh0;
        btn(2); // X draws to low ready
        P.set(6, 1); // LT held aims
        k.step(60);
        btn(10);
        out.r3 = r3Idle && g.player.cam.shoulder === -sh0 && g.player.ads;
        out.leftHand = g.player.rig.openLeft;
        btn(10);
        P.set(6, 0);
        k.step(2);
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
        P.set(6, 1); // LT held aims
        k.until(() => g.weapons.drawPhase === 2 && g.player.cam.ads >= 0.9 && g.player.carry.raise >= 0.9, 3); // F1a: draw 0.3-0.4 s
        out.shotDbg = { dw: g.weapons.drawPhase, ads: g.player.ads, cam: g.player.cam.ads, raise: g.player.carry.raise, cls: g.weapons.current.def.class, mag: g.weapons.current.mag, tr: g.player.pose.traverse };
        P.set(7, 1);
        k.step(3);
        P.set(7, 0);
        k.step(10);
        P.set(6, 0);
        k.step(2);
        btn(2); // X holsters
        k.until(() => g.weapons.drawPhase === 0, 2);
        out.shot = fx();
        P.effects.length = 0;
        const e = k.setup('grunt', false, 0);
        btn(7, 2); // (M3) an RT tap: the knockout palm strike
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
      assert(r.capKept, 'D-pad up / down leave the speed alone (anim-rework S1: no rocker)');
      // (anim-rework S1, Michael: "full speed control via the analogue stick depending on how far you push the stick")
      // raw 50 / 80 / 100% = ~1.4 sneak / ~2.0 walk / 4.0 run (anim-rework S2, M6: was 4.5) (the STICK_SPEED curve; x the weapon's handling)
      assert(r.a50.g === 2 && r.a80.g === 3 && r.a100.g === 5, `stick 50 / 80 / 100% -> sneak / walk / run (${r.a50.g} / ${r.a80.g} / ${r.a100.g})`);
      assert(r.a50.v > 1.1 && r.a50.v < 1.6 && r.a80.v > 1.7 && r.a80.v < 2.25 && r.a100.v > 3.5, `speed follows the stick (${r.a50.v} / ${r.a80.v} / ${r.a100.v} m/s)`);
      assert(!r.sprint.sprinting && r.sprint.g === 5, `a full stick: no sprint, the run (${JSON.stringify(r.sprint)})`);
      assert(r.max3 === 3 && r.cap.g === 3 && r.cap.v <= 2.1, `the internal cap 3 (tests) holds the full stick at the walk (${r.max3}, ${JSON.stringify(r.cap)})`);
      assert(r.crouch && r.stand, 'B crouches and stands');
      assert(r.r3, 'L3 swaps the shoulder while aiming (LT held), not otherwise');
      assert(r.leftHand, 'the weapon goes to the left hand on the left shoulder');
      assert(r.gadgetAim, 'D-pad right held aims the gadget');
      assert(r.land.some((s) => ['0.15/0.25/60', '0.35/0.45/110', '0.80/0.80/200'].includes(s)), `rumble on landing (${r.land})`);
      assert(r.shot.some((s) => ['0.12/0.20/45', '0.40/0.55/80'].includes(s)), `rumble on a shot (${r.shot})`);
      assert(r.elbow.includes('0.50/0.30/90'), `rumble on an elbow hit (${r.elbow})`);
      assert(r.tdDone && r.takedown.includes('0.60/0.40/150'), `rumble on a takedown (${r.tdDone}, offer ${r.tdOffer}, pad ${r.tdViaPad}, ${r.takedown})`);
      // (process audit) every default pad verb (src/input/padBinds.ts, the CT pad) raises its action, as e2e-mouse's KBM
      // table: the input state is wrapped to record and swallow what each button raises (no side effects in the match).
      // The behaviour behind the verbs is the system suites' (e2e-wall, e2e-stealth-ai, e2e-takedown, e2e-ct).
      const missed = await S.page.evaluate(() => {
        const s = window.__app.input.state;
        const P = window.__pad;
        const k = window.__sk;
        const acts = new Set();
        s.set = function (src, a, d) {
          if (d) acts.add(a);
        };
        s.tap = function (a) {
          acts.add(a);
        };
        // [button, any of these actions]: L3 swaps the shoulder while aiming; (anim-rework S1) A interacts, LT is
        // the held aim, D-pad up / down only the held context menu's highlight
        const PADV = [[0, 'interact'], [1, 'crouch'], [2, 'draw'], [3, 'jump'], [4, 'gadgetWheel'], [5, 'coop'], [6, 'ads'], [7, 'fire'], [9, 'pause'], [10, 'cover', 'shoulderSwap'], [11, 'zoom'], [12, 'ctxUp'], [13, 'ctxDown'], [14, 'vision'], [15, 'grenade']];
        const out = [];
        for (const [b, ...want] of PADV) {
          acts.clear();
          P.set(b, 1);
          k.step(2);
          P.set(b, 0);
          k.step(2);
          if (!want.some((a) => acts.has(a))) out.push(`${b}: ${[...acts].join('+') || 'nothing'}`);
        }
        delete s.set;
        delete s.tap;
        s.releaseAll();
        return out;
      });
      assert(missed.length === 0, `every pad verb raises its action (missed: ${missed.join(', ') || 'none'})`);
    } finally {
      await S.browser.close();
    }
  }
  console.log('vent by pad (vent-kick M1: the pad matches the keyboard): Y held then A held unscrews, a Y tap kicks');
  {
    const V = await launch({ url, params: 'autostart=proving' });
    try {
      await V.page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
      const r = await V.page.evaluate(() => {
        const a = window.__app;
        const g = a.current;
        const ac = g.traversal.attachCtl;
        const P = window.__pad;
        a.loop.manual = true;
        P.connect();
        const step = (n) => {
          for (let i = 0; i < n; i++) a.loop.stepHeadless(1 / 60, 120);
        };
        const key = `grate:${g.world.level.anchors.ducts[0].id}:entry`;
        // the Proving duct mouth (e2e-traverse's spot), facing the grate
        const atVent = () => {
          const c = g.player.controller;
          c.teleport(new c.pos.constructor(21.75, 3.2, -5), Math.PI / 2);
          c.clearCrouchToggle();
          g.player.cam.yaw = Math.PI / 2;
          g.player.cam.pitch = 0;
          step(24);
          return { prompt: ac.hint?.anchor.kind ?? null, closed: !g.world.breakables.isOpen(key) };
        };
        const out = {};
        // 1. a fresh (never opened) grate: Y held 100 ms (past the old 33 ms kick window), then A held, Y let go; A
        // let go part way stops it, so the grate stays closed (no kick, no unscrew) for the kick below
        out.at1 = atVent();
        P.set(3, 1);
        step(6);
        out.yHeld = { vent: !!ac.vent, open: g.world.breakables.isOpen(key) };
        P.set(0, 1);
        step(2);
        P.set(3, 0);
        let p = -1;
        let noise = 0;
        for (let k = 0; k < 60 && p < 0.2; k++) {
          step(1);
          p = Math.max(p, ac.vent ? ac.vent.progress : -1);
          noise = Math.max(noise, g.noise);
        }
        out.unscrew = { p, noise, open: g.world.breakables.isOpen(key), att: ac.active };
        P.set(0, 0);
        step(4);
        out.stop = { vent: !!ac.vent, att: ac.active, open: g.world.breakables.isOpen(key) };
        // 2. the same grate, still closed: a Y tap (2 steps) kicks it in, quick and loud
        out.at2 = atVent();
        P.set(3, 1);
        step(2);
        P.set(3, 0);
        let t = 2 / 60;
        let kn = g.noise;
        for (let k = 0; k < 60 && !ac.active; k++) {
          step(1);
          t += 1 / 60;
          kn = Math.max(kn, g.noise);
        }
        out.kick = { att: ac.active, open: g.world.breakables.isOpen(key), t: +t.toFixed(2), noise: kn };
        return out;
      });
      console.log(JSON.stringify(r));
      assert(r.at1.prompt === 'duct' && r.at1.closed, `at the duct mouth: the vent is offered, its grate closed (${JSON.stringify(r.at1)})`);
      assert(r.yHeld.vent && !r.yHeld.open, `Y held 100 ms: the vent is open, no kick (${JSON.stringify(r.yHeld)})`);
      assert(r.unscrew.p > 0.2 && !r.unscrew.open && !r.unscrew.att && r.unscrew.noise < 3, `Y then A held unscrews: progress, quiet, no kick (${JSON.stringify(r.unscrew)})`);
      assert(!r.stop.vent && !r.stop.att && !r.stop.open, `A let go part way stops the unscrew, no kick (${JSON.stringify(r.stop)})`);
      assert(r.at2.prompt === 'duct' && r.at2.closed, `the grate is still closed before the kick (${JSON.stringify(r.at2)})`);
      assert(r.kick.att && r.kick.open && r.kick.t < 0.3 && r.kick.noise >= 10, `a Y tap kicks the grate in: quick, loud (${JSON.stringify(r.kick)})`);
    } finally {
      await V.browser.close();
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
      // (test-speed) a mark that a reload would clear: the remap flake (full run 2, 4.6.3) found the Controls screen gone
      await G(() => (window.__remapMark = 1));
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
      // (optic-coop M2, Michael 2026-10-24 "contextual") Zoom and Ping share R3 by default as an allowed pair: no conflict
      const v0 = await view();
      assert(v0.rows === '' && !v0.sum, `the defaults show no conflict (Zoom / Ping on R3 allowed; "${v0.rows}")`);
      // X on a slot clears it (menu-ui SPEC 7.12): R3 off Zoom
      await focusSlot('zoom:0');
      await press(P, BTN.X);
      assert((await pad()).zoom.length === 0, 'X clears the focused slot (R3 off Zoom)');
      // (optic-coop M2) R3 is also Ping by default: clear it too, so R3 is free for the draw (draw on Ping's R3 would be
      // the player's own conflict, still reported)
      await focusSlot('ping:0');
      await press(P, BTN.X);
      assert((await pad()).ping.length === 0, 'X clears the focused slot (R3 off Ping)');
      // A, then R3: draw / holster moves from X to R3
      await focusSlot('draw:0');
      // (load-latent-ui1) A and R3 in one evaluate (pressPair): the capture's 5 s timeout is wall clock and under CPU load
      // press(A) + a read + press(R3) ran past it. The listening state is the one recorded the frame after A
      const pr = await pressPair(P, BTN.A, BTN.RS, () => document.querySelector('.controls-screen .tab-panel.active .pad-key[data-bind="draw:0"]')?.classList.contains('listening') ?? false);
      const listening = pr.first === true;
      let v = await view();
      const lab = await G((p) => document.querySelector(`${p} .pad-key[data-bind="draw:0"]`).textContent, panel);
      assert(listening && JSON.stringify((await pad()).draw) === '[11]' && lab === 'R3' && v.rows === '' && !v.cap, `A then R3 rebinds draw (${lab}, conflicts "${v.rows}"${pr.polled ? '' : ', no input poll'})`);
      // (G22, MD13) a capture is cancelled by Menu / Start (the screen stays, the overlay goes, nothing binds)
      await focusSlot('draw:1');
      // (load-latent-ui1) A and Start in one evaluate: the overlay's countdown is wall clock and a read after press(A)
      // came seconds late under CPU load; the overlay is the one recorded the frame after A
      const prS = await pressPair(P, BTN.A, BTN.START, () => ({ o: !!document.querySelector('.cap-overlay'), n: document.querySelector('.cap-overlay .cap-count')?.textContent }));
      const ov = prS.first ?? {};
      await P.waitForFunction(() => !window.__app.input.gamepad.capturing, null, { timeout: 8000 }).catch(() => {});
      await P.waitForTimeout(300);
      v = await view();
      const ovGone = await G(() => !document.querySelector('.cap-overlay'));
      assert(ov.o && ['5', '4'].includes(ov.n) && ovGone && !v.cap && v.screen && JSON.stringify((await pad()).draw) === '[11]', `Start cancels the capture; the overlay showed the 5 s countdown (5 or 4 on a slow frame) (${JSON.stringify({ ...v, ov, ovGone, polled: prS.polled })})`);
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
          // (anim-rework S1) the draw verb draws to low ready
          btn(2);
          const x = pl.drawWanted;
          btn(11);
          const r3 = pl.drawWanted;
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
      // (test-speed) the play page was in front: this page is in front again and still on the Controls screen before the
      // next press (a B with no capture listening is Back, which closed the screen in the flake), and the capture is on
      await P.bringToFront();
      await frames(P, 3);
      const here = await G(() => ({ mark: window.__remapMark === 1, screen: !!document.querySelector('.controls-screen'), top: window.__app.screens.top?.el.className ?? '' }));
      assert(here.mark && here.screen, `after the play page the remap page is still on the Controls screen (${JSON.stringify(here)})`);
      // onto B (crouch): the conflict shows on both rows and in the summary; reset (confirm) restores the defaults
      await focusSlot('draw:0');
      // (load-latent-ui1) A and B in one evaluate (pressPair), B only when the capture is on (a B with no capture is
      // Back): the capture's 5 s timeout is wall clock and press(A) + a wait + press(B) ran past it under CPU load
      const capRead = () => ({ cap: window.__app.input.gamepad.capturing, mode: window.__app.input.mode, focused: window.__app.nav.focused?.dataset?.bind ?? window.__app.nav.focused?.className });
      let prB = await pressPair(P, BTN.A, BTN.B, capRead, { onlyIf: 'capturing' });
      // (the first pad press after the page came back to the front can be taken as the input-mode switch: one more A)
      if (!prB.pressed2) {
        console.log(`  (no capture after the first A: ${JSON.stringify(prB.first)}; A again)`);
        await focusSlot('draw:0');
        prB = await pressPair(P, BTN.A, BTN.B, capRead, { onlyIf: 'capturing' });
      }
      v = await view();
      assert(v.rows === 'crouch,draw' && /share B/.test(v.sum) && v.screen && JSON.stringify((await pad()).draw) === '[1]', `A then B binds B (G22), warned on both rows (${JSON.stringify({ ...v, polled: prB.polled })})`);
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
      // (optic-coop M2, "contextual") the defaults share R3 between Zoom and Ping as an allowed pair: no conflict after the reset
      assert(JSON.stringify(def.draw) === '[2]' && JSON.stringify(def.zoom) === '[11]' && JSON.stringify(def.ping) === '[11]' && v.rows === '' && v.screen, `reset restores the controller defaults (${JSON.stringify(def.draw)}, conflicts "${v.rows}")`);
    } finally {
      await R.browser.close();
    }
  }

  console.log('title press by pad (menu-notes slice 4c, M3 / A3): A strikes the goggle with no menu, a second A skips to the lit menu');
  {
    const T = await launch({ url, params: 'title=1' });
    try {
      const P = T.page;
      const G = (f, a) => P.evaluate(f, a);
      await P.waitForFunction(() => document.getElementById('boot')?.classList.contains('done') && window.__app.screens.top?.el.classList.contains('title-screen'), null, { timeout: 90000 });
      await G(() => window.__pad.connect());
      await press(P, BTN.A);
      const s1 = await G(() => ({ top: window.__app.screens.top?.el.classList[1], seq: window.__app.screens.top?.seqPhase, menu: document.querySelector('.main-menu')?.hidden }));
      assert(s1.top === 'title-screen' && s1.seq === 'seq' && s1.menu === true, `A on the title starts the strike, no menu yet, the press is not a skip (${JSON.stringify(s1)})`);
      await P.waitForTimeout(400);
      await press(P, BTN.A);
      await P.waitForFunction(() => window.__app.screens.top?.el.classList.contains('main-menu'), null, { timeout: 10000 }).catch(() => {});
      await P.waitForFunction(() => window.__app.current?.titleLight?.phase === 'done', null, { timeout: 10000 }).catch(() => {});
      const s2 = await G(() => ({ top: window.__app.screens.top?.el.classList[1], phase: window.__app.current?.titleLight?.phase, lit: window.__app.current?.titleLight?.lit, f: window.__app.nav.focused?.dataset.key, depth: window.__app.screens.depth }));
      assert(s2.top === 'main-menu' && s2.phase === 'done' && s2.lit === 1 && s2.f === 'sectorops' && s2.depth === 1, `a second A skips to the lit main menu, nothing selected (${JSON.stringify(s2)})`);
    } finally {
      await T.browser.close();
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
