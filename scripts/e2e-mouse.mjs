// PC keyboard + mouse: the mouse is captured (pointer lock) in a match. A click on the game captures it
// (that click never fires) and hides the "click to capture" hint; captured, moving looks, left fires,
// the wheel steps the speed gear (3.2.0; weapons are Q / X); losing the capture (Esc) pauses; clicking Resume
// captures it again.
import { launch, openPage, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
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
  assert(up.gear === Math.min(5, s0.gear + 1) && down.gear === Math.max(1, s0.gear - 1) && down.weapon === s0.weapon, `wheel steps the maximum gear (${s0.gear} -> ${up.gear} -> ${down.gear}), not the weapon (${s0.weapon} -> ${down.weapon})`);
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
  const g1 = await gearIs(Math.min(5, g0 + 1));
  await page.keyboard.press('Minus');
  const g2 = await gearIs(g0);
  assert(g1 === Math.min(5, g0 + 1) && g2 === g0, `= / - step the gear (${g0} -> ${g1} -> ${g2})`);
  // (locomotion step 17, D1) every KBM verb in the binding table (docs/systems/input-and-loop.md) raises its action:
  // the input state is wrapped to record and swallow what each default key raises (no side effects in the match)
  {
    const KBM = [
      ['KeyW', 'move'], ['KeyS', 'move'], ['KeyA', 'move'], ['KeyD', 'move'], ['Space', 'cover'], ['KeyC', 'crouch'], ['ControlLeft', 'crouch'],
      ['ShiftLeft', 'dash'], ['Equal', 'speedUp'], ['Minus', 'speedDown'], ['KeyE', 'jump', 'interact'], ['KeyF', 'interact'], ['KeyR', 'reload'],
      ['KeyX', 'swapNext'], ['KeyQ', 'swapPrev'], ['KeyG', 'grenade'], ['Tab', 'gadgetWheel'], ['KeyV', 'shoulderSwap'],
      ['KeyN', 'vision'], ['KeyZ', 'ping'], ['KeyP', 'pause'],
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
  // (step 14) the KBM vision key (N) cycles off -> night -> thermal -> electro -> off; post.vk follows
  {
    const vis = () => page.evaluate(() => ({ mode: window.__app.current.vision.mode, shown: window.__app.current.vision.shown, vk: window.__app.current.post.visionKind }));
    const seq = [];
    for (const want of ['night', 'thermal', 'electro', 'off']) {
      await page.keyboard.press('KeyN');
      let r = await vis();
      for (let i = 0; i < 60 && (r.mode !== want || r.shown !== want); i++) {
        await page.waitForTimeout(50);
        r = await vis();
      }
      seq.push(r);
    }
    const vks = seq.map((r) => `${r.mode}/${r.vk}`).join(' ');
    assert(vks === 'night/0 thermal/1 electro/2 off/0', `N cycles the vision modes, post.vk follows (${vks})`);
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

  console.log('elbow strike (LMB while holstered)');
  const S = await strikePage(launch, url);
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
  console.log('wall medkit station (G20 / G98, the only healing): +40 hp, single use, refused at full health');
  {
    const M = await launch({ url, params: 'autostart=proving' });
    try {
      const P = M.page;
      await P.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
      const r = await P.evaluate(() => {
        const a = window.__app;
        a.loop.manual = true;
        a.loop.stepHeadless(0.3, 120);
        const g = a.current;
        const it = g.interactables?.items.find((i) => i.kind === 'medkitWall');
        if (!it) return { found: false };
        const kits = 'medkit' in g;
        // at full health it is left for later
        it.onUse(it);
        const fullDone = it.done;
        g.target.health.hp = 50;
        it.onUse(it);
        return { found: true, kits, fullDone, hp: g.target.health.hp, done: it.done, enabled: it.enabled };
      });
      console.log('  ', JSON.stringify(r));
      assert(r.found && !r.kits, `Proving has a wall medkit station and no carried kits (${JSON.stringify(r)})`);
      assert(!r.fullDone && Math.abs(r.hp - 90) < 0.01 && r.done && !r.enabled, `full health leaves it; at 50 hp it heals to ${r.hp} and shows spent`);
    } finally {
      await M.browser.close();
    }
  }

  console.log('back to a wall (the context key enters, WASD slides, the key leaves)');
  const W = await launch({ url, params: 'autostart=proving' });
  try {
    const P = W.page;
    await P.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
    await P.evaluate(WALL_HARNESS);
    const key = async (code) => {
      await P.keyboard.down(code);
      await P.evaluate(() => window.__wl.step(2));
      await P.keyboard.up(code);
      await P.evaluate(() => window.__wl.step(1));
    };
    await key('Space');
    await P.evaluate(() => window.__wl.step(20));
    const on = await P.evaluate(() => window.__wl.st());
    await P.keyboard.down('KeyD');
    await P.evaluate(() => window.__wl.step(75));
    await P.keyboard.up('KeyD');
    await P.evaluate(() => window.__wl.step(5));
    const slid = await P.evaluate(() => window.__wl.st());
    await key('Space');
    await P.evaluate(() => window.__wl.step(10));
    const off = await P.evaluate(() => window.__wl.st());
    assert(on.phase === 'on', `the KBM context key (Space) enters back-to-wall (${JSON.stringify(on)})`);
    assert(slid.phase === 'on' && Math.abs(slid.s - on.s) > 0.5, `D slides along it (${on.s.toFixed(2)} -> ${slid.s.toFixed(2)})`);
    assert(off.phase !== 'on' && off.last === 'context', `the context key again leaves (${JSON.stringify(off)})`);
  } finally {
    await W.browser.close();
  }
  console.log('difficulty (G106: fixed levels, no sliders): a mouse click on the row picks the next level, the match runs it');
  {
    const D = await launch({ url, params: '' });
    try {
      const P = D.page;
      await P.waitForFunction(() => !!document.querySelector('.main-menu'), null, { timeout: 60000 });
      const box = (sel) => P.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      }, sel);
      const playBtn = await P.evaluate(() => {
        const b = [...document.querySelectorAll('.main-menu button')].find((x) => /^\s*Missions/.test(x.textContent ?? ''));
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      assert(!!playBtn, 'the main menu has Missions');
      await P.mouse.click(playBtn.x, playBtn.y);
      await P.waitForSelector('.missions-screen .ms-item');
      await P.locator('.missions-screen .ms-item').first().click();
      await P.waitForFunction(() => !!document.querySelector('.briefing-screen [data-diff="choice"]'), null, { timeout: 10000 });
      const st = () => P.evaluate(() => ({ choice: document.querySelector('.briefing-screen [data-diff="choice"] .choice-val')?.textContent ?? '', sliders: document.querySelectorAll('.briefing-screen [data-diff]:not([data-diff="choice"])').length }));
      const a = await st();
      assert(a.choice === 'Normal' && a.sliders === 0, `Normal by default, no custom sliders (${JSON.stringify(a)})`);
      await P.evaluate(() => document.querySelector('.briefing-screen [data-diff="choice"]')?.scrollIntoView({ block: 'center' }));
      const cb = await box('.briefing-screen [data-diff="choice"] .choice-val');
      await P.mouse.click(cb.x + cb.w / 2, cb.y + cb.h / 2);
      const b = await st();
      assert(b.choice === 'Realistic', `a click picks the next level (${JSON.stringify(b)})`);
      // a level reaches a match (Proving, mission: guards on): the manager's resolved def
      const Q = await openPage(D.ctx, url, 'autostart=proving&mode=mission&difficulty=rookie');
      await Q.page.waitForFunction(() => !!window.__app?.current?.enemyMgr, null, { timeout: 60000 });
      const r = await Q.page.evaluate(() => {
        const d = window.__app.current.enemyMgr.diff;
        return { p: d.perception, a: d.accuracy, t: d.reaction, l: d.label };
      });
      assert(r.p === 0.7 && r.a === 0.7 && r.t === 1.35 && r.l === 'Rookie', `the match's manager resolves Rookie (${JSON.stringify(r)})`);
    } finally {
      await D.browser.close();
    }
  }
  console.log('wall edge verbs (step 12, D1): D / A to the edge peeks, RMB lean-out, LMB fire, Space SWAT, E corner takedown');
  {
    const E = await launch({ url, params: 'autostart=proving' });
    try {
      const P = E.page;
      await P.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
      // capture the mouse first on the real loop (as the mouse ADS case: headless grants the lock to a click the
      // running page handles, not under the manual loop; a capturing click never fires)
      await P.waitForTimeout(1200);
      await P.mouse.move(640, 320);
      for (let i = 0; i < 4 && !(await P.evaluate(() => !!document.pointerLockElement)); i++) {
        await P.mouse.down();
        await P.waitForTimeout(100);
        await P.mouse.up();
        await P.waitForTimeout(300);
      }
      const locked = await P.evaluate(() => !!document.pointerLockElement);
      assert(locked, 'a click captures the mouse on the Proving');
      const d = await P.evaluate(EDGE_HARNESS);
      assert(!!d, `the Proving doorway (${JSON.stringify(d)})`);
      const step = (n) => P.evaluate((n) => window.__ed.step(n), n);
      const st = () => P.evaluate(() => window.__ed.st());
      const key = async (code) => {
        await P.keyboard.down(code);
        await step(2);
        await P.keyboard.up(code);
        await step(1);
      };
      // capture the mouse first (a click that only captures)
      await key('Space');
      await step(30);
      const on = await st();
      const toward = d.end > 0 ? 'KeyD' : 'KeyA';
      await P.keyboard.down(toward);
      for (let i = 0; i < 12 && (await st()).edge !== d.end; i++) await step(10);
      await step(10);
      await P.keyboard.up(toward);
      await step(18);
      await P.keyboard.down(toward);
      await step(36);
      const peek = await st();
      await P.keyboard.up(toward);
      await step(30);
      await P.mouse.down({ button: 'right' });
      await step(40);
      const lean = await st();
      await P.mouse.down();
      await step(18);
      await P.mouse.up();
      await step(2);
      const fired = lean.mag - (await st()).mag;
      await P.mouse.up({ button: 'right' });
      await step(30);
      const back = await st();
      await P.keyboard.down(toward);
      await step(6);
      await P.keyboard.down('Space');
      await step(2);
      await P.keyboard.up('Space');
      const swat = await st();
      await P.keyboard.up(toward);
      await step(60);
      const end = await st();
      assert(on.phase === 'on', `Space enters the doorway wall (${JSON.stringify(on)})`);
      assert(peek.peekOn && (peek.sub & 16) !== 0 && peek.cam === 1, `${toward} held at the edge: peek (${JSON.stringify(peek)})`);
      assert(lean.lk === 1 && lean.lean === 1 && (lean.sub & 32) !== 0, `RMB at the edge: lean-out (lk ${lean.lk}, lean ${lean.lean}, locked ${locked}, ${JSON.stringify(lean)})`);
      assert(fired > 0, `LMB fires from the lean (${fired} rounds)`);
      assert(back.lk === 0 && back.lean === 0, `RMB released: back in (lk ${back.lk})`);
      assert(swat.phase === 'swat' && end.phase === 'on' && end.seg === d.to, `Space with ${toward} toward the gap: SWAT to the far wall (${swat.phase} -> ${end.phase}, seg ${end.seg} / ${d.to})`);
    } finally {
      await E.browser.close();
    }
    console.log('door peek (step 13, D1): Space cracks the Proving shed door, the mouse looks within +-35 deg, Space closes');
    const DP = await launch({ url, params: 'autostart=proving' });
    try {
      const P = DP.page;
      await P.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
      await P.waitForTimeout(1200);
      await P.mouse.move(640, 320);
      for (let i = 0; i < 4 && !(await P.evaluate(() => !!document.pointerLockElement)); i++) {
        await P.mouse.down();
        await P.waitForTimeout(100);
        await P.mouse.up();
        await P.waitForTimeout(300);
      }
      assert(await P.evaluate(() => !!document.pointerLockElement), 'a click captures the mouse on the Proving');
      const ok = await P.evaluate(() => {
        const a = window.__app;
        const g = a.current;
        a.loop.manual = true;
        const d = g.world.doors.list[0];
        if (!d) return false;
        const an = d.anchor;
        const nx = Math.cos(an.yaw);
        const nz = -Math.sin(an.yaw);
        const mx = an.hinge.x + Math.sin(an.yaw) * an.width * 0.5;
        const mz = an.hinge.z + Math.cos(an.yaw) * an.width * 0.5;
        const yaw = Math.atan2(-nx, -nz);
        g.player.controller.teleport(new g.player.position.constructor(mx + nx * 0.7, an.hinge.y + 0.05, mz + nz * 0.7), yaw);
        g.player.cam.yaw = yaw;
        g.player.cam.pitch = 0;
        a.loop.stepHeadless(0.3, 120);
        window.__dp = {
          step: (n) => { for (let i = 0; i < n; i++) a.loop.stepHeadless(1 / 60, 120); },
          st: () => { const c = g.player.cam; return { phase: g.doorPeek.phase, cracked: d.cracked, ajar: d.ajar, target: d.target, view: c.doorPeek, look: Math.atan2(Math.sin(c.yaw - c.doorYaw), Math.cos(c.yaw - c.doorYaw)) }; },
        };
        return true;
      });
      assert(ok, 'Proving has a door');
      const step = (n) => P.evaluate((n) => window.__dp.step(n), n);
      const st = () => P.evaluate(() => window.__dp.st());
      const key = async (code) => {
        await P.keyboard.down(code);
        await step(2);
        await P.keyboard.up(code);
        await step(1);
      };
      await key('Space');
      await step(60);
      const peek = await st();
      for (let i = 1; i <= 8; i++) {
        await P.mouse.move(640 + i * 60, 320);
        await step(2);
      }
      await step(4);
      const looked = await st();
      await key('Space');
      await step(30);
      const closed = await st();
      assert(peek.phase === 'peek' && peek.cracked && Math.abs(peek.ajar - 0.12) < 0.01 && peek.target === 0 && peek.view === 1, `Space cracks the shed door 0.12 and peeks (${JSON.stringify(peek)})`);
      assert(looked.phase === 'peek' && Math.abs(looked.look) > 0.3 && Math.abs(looked.look) <= (35 * Math.PI) / 180 + 1e-3, `the mouse looks, clamped within +-35 deg (${JSON.stringify(looked)})`);
      assert(closed.phase === 'off' && !closed.cracked && closed.ajar === 0 && closed.target === 0, `Space again closes the crack (${JSON.stringify(closed)})`);
    } finally {
      await DP.browser.close();
    }
    const C = await launch({ url, params: 'autostart=warehouse&mode=clear' });
    try {
      const P = C.page;
      await P.waitForFunction(() => !!window.__app?.current?.enemyMgr, null, { timeout: 60000 });
      const kind = await P.evaluate(CORNER_SETUP);
      await P.keyboard.down('KeyE');
      await P.evaluate(() => window.__cn.step(2));
      await P.keyboard.up('KeyE');
      const r = await P.evaluate(() => { window.__cn.step(1); return window.__cn.st(); });
      assert(kind === 'corner' && r.td, `E: the corner takedown from the wall edge runs (${kind}, ${JSON.stringify(r)})`);
    } finally {
      await C.browser.close();
    }
  }

  console.log('campaign loadout (G76, the CT kit): the lists hold the rifle and the suppressed pistol; Infiltration starts on the kit');
  {
    const LO = await launch({ url });
    try {
      const P = LO.page;
      const ctr = (k) => P.evaluate((kk) => document.querySelector(`.kit-screen [data-key="${kk}"] .ms-ctr`)?.textContent ?? '', k);
      // (a row clicked within 350 ms of gaining focus only previews: click, wait it out, click again)
      // (the second click only when the first one only previewed: a second click on an equipped row opens Customize)
      const pick = async (sel, done) => {
        await P.locator(sel).first().click();
        await P.waitForTimeout(450);
        if (!(await done())) await P.locator(sel).first().click();
        await P.waitForTimeout(150);
      };
      const title = () => P.evaluate(() => document.querySelector('.lo-title')?.textContent ?? '');
      await P.waitForSelector('.main-menu');
      await P.locator('.main-menu .btn', { hasText: 'Loadout' }).first().click();
      await P.waitForSelector('.kit-screen .ms-item');
      assert((await ctr('primary')) === 'Heron Carbine' && (await ctr('secondary')) === 'Hush 9 SD', `the issued kit: Heron Carbine + Hush 9 SD (${await ctr('primary')} / ${await ctr('secondary')})`);
      const lo0 = await P.evaluate(() => JSON.stringify(window.__app.save.get().loadout));
      await P.locator('.kit-screen [data-key="secondary"]').first().click();
      await P.waitForTimeout(300);
      assert((await P.evaluate(() => JSON.stringify(window.__app.save.get().loadout))) === lo0, 'a click on an issued item changes nothing (read only)');
      // the kit in the other order (rifle in hand): Infiltration issues the same two guns
      await P.evaluate(async () => {
        window.__app.save.update((d) => {
          d.loadout.primary = 'rifle';
          d.loadout.secondary = 'pistolSd';
        });
        await window.__app.save.flush();
      });
      // close the menu tab first (the save is flushed): a second tab opened while the first was live sometimes stalled its autostart (fix round 2)
      await LO.page.close();
      const M = await openPage(LO.ctx, url, 'autostart=warehouse&mode=infiltration&mission=warehouse-ledger&insertion=yard');
      try {
        await M.page.waitForFunction(() => window.__app?.current?.weapons?.slots?.length > 0, null, { timeout: 60000 });
      } catch (err) {
        console.error(`Infiltration autostart timed out; page errors:\n${M.errors.join('\n') || '(none)'}`);
        throw err;
      }
      const ids = await M.page.evaluate(() => window.__app.current.weapons.slots.map((s) => s.def.id));
      assert(JSON.stringify([...ids].sort()) === JSON.stringify(['pistolSd', 'rifle']), `Infiltration starts with the campaign defaults (${ids})`);
    } finally {
      await LO.browser.close();
    }
  }
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
      // a capture with no key gives up after 5 s
      await click(slot('ping:0'));
      await P.waitForTimeout(5600);
      v = await view();
      const pl = await G((s) => document.querySelector(s).classList.contains('listening'), slot('ping:0'));
      assert(!v.cap && !pl && (await keys()).ping.join() === 'KeyZ', 'the capture times out after 5 s');
      await click(slot('crouch:0'));
      await P.keyboard.press('KeyU');
      await P.waitForTimeout(800);
      const Q = await openPage(R.ctx, url, 'autostart=proving');
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
        // sprint: hold, then toggle (W held throughout)
        const out = {};
        for (const hold of [true, false]) {
          await QP.evaluate((h) => window.__app.settings.update((d) => void (d.gameplay.sprintHold = h)), hold);
          await QP.keyboard.down('KeyW');
          await QP.evaluate(() => window.__rm.step(10));
          if (hold) {
            await QP.keyboard.down('ShiftLeft');
            await QP.evaluate(() => window.__rm.step(20));
            const on = (await QP.evaluate(() => window.__rm.st())).sprinting;
            await QP.keyboard.up('ShiftLeft');
            await QP.evaluate(() => window.__rm.step(10));
            out.hold = [on, (await QP.evaluate(() => window.__rm.st())).sprinting];
          } else {
            await tap('ShiftLeft');
            await QP.evaluate(() => window.__rm.step(20));
            const on = (await QP.evaluate(() => window.__rm.st())).sprinting;
            await tap('ShiftLeft');
            await QP.evaluate(() => window.__rm.step(5));
            out.toggle = [on, (await QP.evaluate(() => window.__rm.st())).sprinting];
          }
          await QP.keyboard.up('KeyW');
          await QP.evaluate(() => window.__rm.step(30));
        }
        assert(out.hold[0] && !out.hold[1] && out.toggle[0] && !out.toggle[1], `sprint hold (held / released) vs toggle (press / press) (${JSON.stringify(out)})`);
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
