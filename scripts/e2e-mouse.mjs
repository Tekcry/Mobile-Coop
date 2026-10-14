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
    await P.evaluate(() => window.__wl.step(40));
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
  console.log('wall edge verbs (step 12, D1): D / A to the edge peeks, RMB lean-out, LMB fire, Space SWAT, E corner takedown');
  {
    const E = await launch({ url, params: 'autostart=proving', touch: false });
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
    const C = await launch({ url, params: 'autostart=warehouse&mode=clear', touch: false });
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
