// Kestrel Exchange (3.2.x): the blockout's set pieces engage from their intended approach, in Free Roam
// (`?autostart=exchange&mode=sandbox`), by pad; the split, pipe, fence and wall jump also by the touch action button.
// Phase 2: S0 culvert (light and noise meters, roll, plinth, valve housing, duct kick / unscrew), S1 (shelf tops, the
// chute hopper jump grab, window), S2 (split, pipe, wall jump to the perch, perch window, high glazed window), S3
// (ladder, catwalk wall jump, boilers, drainpipe, cage fence, grate noise, stairs, doorway).
// `node scripts/e2e-exchange.mjs [url]`
import { launch, frames, BTN } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = 0;
const check = (cond, msg) => {
  if (cond) console.log('  ok -', msg);
  else {
    failed++;
    console.log('  FAIL -', msg);
  }
};
const f2 = (v) => (+v).toFixed(2);

/** The in-page harness: `window.__ex` (teleport, stepping, buttons, a state snapshot). `manual`: headless stepping. */
async function install(page, manual) {
  await page.evaluate((manual) => {
    const H = {
      st: () => window.__app.current,
      tp(x, y, z, yaw) {
        const st = H.st();
        st.traversal.reset();
        st.cover.reset();
        const p = st.player;
        p.controller.teleport(new p.controller.pos.constructor(x, y, z), yaw);
        p.cam.yaw = yaw;
        p.cam.pitch = 0;
      },
      run(s, sx = 0, sy = 0, btns = []) {
        const pad = window.__pad;
        pad.axis(0, sx);
        pad.axis(1, -sy);
        for (const b of btns) pad.set(b, 1);
        window.__app.loop.stepHeadless(s, 120);
        pad.axis(0, 0);
        pad.axis(1, 0);
        for (const b of btns) pad.set(b, 0);
      },
      tap(b) {
        window.__pad.set(b, 1);
        window.__app.loop.stepHeadless(2 / 60, 120);
        window.__pad.set(b, 0);
        window.__app.loop.stepHeadless(2 / 60, 120);
      },
      /** Stick held for `s` seconds, button `b` tapped `at` seconds in. */
      runTap(s, sx, sy, b, at) {
        const pad = window.__pad;
        pad.axis(0, sx);
        pad.axis(1, -sy);
        window.__app.loop.stepHeadless(at, 120);
        pad.set(b, 1);
        window.__app.loop.stepHeadless(2 / 60, 120);
        pad.set(b, 0);
        window.__app.loop.stepHeadless(Math.max(0, s - at), 120);
        pad.axis(0, 0);
        pad.axis(1, 0);
      },
      hold(b, s) {
        window.__pad.set(b, 1);
        window.__app.loop.stepHeadless(s, 120);
        window.__pad.set(b, 0);
        window.__app.loop.stepHeadless(2 / 60, 120);
      },
      gear(n) {
        H.st().player.controller.gears.gear = n;
      },
      info() {
        const st = H.st();
        const c = st.player.controller;
        const ac = st.traversal.attachCtl;
        const a = ac.m.anchor;
        const w = st.hud.world;
        return {
          x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw, grounded: c.grounded,
          attached: ac.active, kind: a?.kind ?? null, id: a?.id ?? -1, phase: ac.m.phase, entry: ac.m.entry, top: a?.top ?? 0,
          pipe: ac.pipe.mode, hint: ac.hint ? `${ac.hint.anchor.kind}:${ac.hint.entry}` : null,
          split: !!ac.split, prompt: w.label('vault'), cover: w.label('cover'), drop: w.label('drop'),
          tkind: st.traversal.kind, hintWin: st.traversal.hintWindow ? st.traversal.hintWindow.id : -1,
          noise: st.noise, light: st.lightLevel, landing: c.lastLanding, landings: c.landings, rolls: st.traversal.forwardRolls,
          vent: !!ac.vent, ventP: ac.vent ? ac.vent.progress : 0, plantL: [...ac.player.rig.plantL.asArray?.() ?? []],
        };
      },
    };
    window.__ex = H;
    if (manual) window.__app.loop.manual = true;
  }, manual);
}

const mk = (page) => ({
  I: async () => {
    await frames(page, 2);
    await page.evaluate(() => window.__app.loop.stepHeadless(1 / 60, 120));
    return page.evaluate(() => window.__ex.info());
  },
  run: (s, sx = 0, sy = 0, b = []) => page.evaluate(([s, sx, sy, b]) => window.__ex.run(s, sx, sy, b), [s, sx, sy, b]),
  tap: (b) => page.evaluate((b) => window.__ex.tap(b), b),
  runTap: (s, sx, sy, b, at) => page.evaluate(([s, sx, sy, b, at]) => window.__ex.runTap(s, sx, sy, b, at), [s, sx, sy, b, at]),
  hold: (b, s) => page.evaluate(([b, s]) => window.__ex.hold(b, s), [b, s]),
  tp: (x, y, z, yaw) => page.evaluate(([x, y, z, yaw]) => window.__ex.tp(x, y, z, yaw), [x, y, z, yaw]),
  gear: (n) => page.evaluate((n) => window.__ex.gear(n), n),
});

const PI = Math.PI;
const EAST = PI / 2;
const WEST = -PI / 2;
const SOUTH = PI;
const NORTH = 0;

async function main() {
  const { browser, page, errors } = await launch({ url, params: 'autostart=exchange&mode=sandbox' });
  const { I, run, tap, hold, tp, gear, runTap } = mk(page);
  try {
    const spawn = await page.evaluate(() => { const c = window.__app.current.player.controller; return { x: c.pos.x, y: c.pos.y, z: c.pos.z, map: window.__app.current.world.map.id }; });
    console.log('spawn and shell');
    check(spawn.map === 'exchange' && Math.abs(spawn.x + 28) < 0.5 && Math.abs(spawn.z + 18) < 0.5 && spawn.y < 0.5, `spawn in the culvert (${f2(spawn.x)}, ${f2(spawn.y)}, ${f2(spawn.z)})`);
    await install(page, true);
    await page.evaluate(() => window.__pad.connect());
    await page.evaluate(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
    await run(0.5);
    const shell = await page.evaluate(() => {
      const L = window.__app.current.world.level;
      const A = L.anchors;
      return { splits: A.splits.length, ducts: A.ducts.length, ladders: A.ladders.length, pipesH: A.pipesH.length, pipesV: A.pipesV.length, fences: A.fences.length, windows: A.windows.length, doors: A.doors.length, lights: L.lights.lights.filter((l) => l.kind !== 'flashlight').length };
    });
    check(shell.splits === 1 && shell.ducts === 1 && shell.ladders === 1 && shell.pipesH === 1 && shell.pipesV === 1 && shell.fences === 2, `anchors: ${JSON.stringify(shell)}`);

    // --- S0 Culvert
    console.log('S0 culvert');
    await tp(-28, 0.02, -18, NORTH);
    await run(0.8);
    let i = await I();
    check(i.light < 0.4, `the spawn is dim (light ${f2(i.light)})`);
    await tp(-29.4, 0.02, -13.5, NORTH);
    await run(0.8);
    i = await I();
    check(i.light > 0.6, `lit under the maintenance lamp (light ${f2(i.light)})`);
    await page.evaluate(() => window.__app.current.world.level.lights.setGroup(0, false));
    await run(0.8);
    i = await I();
    check(i.light < 0.2, `circuit 0 off: the culvert is dark (light ${f2(i.light)})`);
    await page.evaluate(() => window.__app.current.world.level.lights.setGroup(0, true));

    // noise: the grate strip across the channel reacts above gear 2 standing, silent at gear 2
    await gear(2);
    await tp(-26.3, 0.02, -15.2, NORTH);
    await run(0.15, 0, 1);
    let quiet = 0;
    for (let k = 0; k < 6; k++) {
      await run(0.12, 0, 1);
      quiet = Math.max(quiet, (await I()).noise);
    }
    check(quiet === 0, `gear 2 on the grate strip is silent (noise ${f2(quiet)})`);
    await gear(4);
    await tp(-26.3, 0.02, -15.2, NORTH);
    await run(0.15, 0, 1);
    let loud = 0;
    for (let k = 0; k < 6; k++) {
      await run(0.12, 0, 1);
      loud = Math.max(loud, (await I()).noise);
    }
    check(loud > 3, `gear 4 on the grate strip is heard (noise ${f2(loud)})`);

    // forward roll down the channel
    await gear(5);
    await tp(-26.3, 0.02, -18.8, NORTH);
    const r0 = (await I()).rolls;
    await runTap(1.6, 0, 1, BTN.B, 0.5);
    await run(0.4);
    i = await I();
    check(i.rolls === r0 + 1 && i.z > -17 && Math.abs(i.x + 26.3) < 0.8, `the roll runs the channel (rolls ${r0} -> ${i.rolls}, z ${f2(i.z)}, x ${f2(i.x)})`);
    await gear(3);

    // the plinth: grab from below, climb up, hold B to lower into a hang, drop the back side (roll band)
    await tp(-29.8, 0.02, -10.7, NORTH);
    await run(0.4);
    i = await I();
    check(i.hint === 'ledge:below', `plinth lip offered from the floor (${i.hint})`);
    await tap(BTN.Y);
    await run(0.5);
    i = await I();
    check(i.attached && i.kind === 'ledge', `hanging from the plinth (${i.kind} ${i.phase})`);
    await tap(BTN.Y);
    await run(1.6);
    i = await I();
    check(!i.attached && i.y > 2.4 && i.z > -10.2, `Y climbs up onto the plinth (y ${f2(i.y)}, z ${f2(i.z)})`);
    await tp(-29.8, 2.62, -9.6, SOUTH);
    await run(0.3);
    await run(1.4, 0, 1);
    await run(0.8);
    i = await I();
    check(i.landing === 'soft' && i.y < 0.3, `walking off the plinth's side is a soft fall (${i.landing}, y ${f2(i.y)})`);
    await tp(-29.8, 2.92, -8.5, NORTH);
    await run(0.3);
    await run(1.2, 0, 1);
    await run(0.8);
    i = await I();
    check(i.landing === 'roll' && i.y < 0.3, `walking off the motor housing is a roll-band fall (${i.landing}, y ${f2(i.y)})`);
    await tp(-29.8, 2.62, -10.1, SOUTH);
    await run(0.3);
    await hold(BTN.B, 0.5);
    await run(0.8);
    i = await I();
    check(i.attached && i.kind === 'ledge', `hold B at the lip lowers into a hang (${i.kind} ${i.phase})`);

    // the valve housing: a 1.3 m mantle
    await tp(-28.9, 0.02, -16.3, NORTH);
    await run(0.4);
    i = await I();
    check(i.prompt !== '' || i.hint !== null, `valve housing offers a climb ("${i.prompt}" ${i.hint})`);
    await run(0.1, 0, 1);
    await tap(BTN.Y);
    await run(1.2);
    i = await I();
    check(i.y > 1.15 && i.z > -15.8, `up on the valve housing (y ${f2(i.y)}, z ${f2(i.z)})`);

    // the duct: unscrew (hold, silent), crawl to S1's pocket
    await tp(-25.0, 0.02, -9.5, EAST);
    await run(0.4);
    i = await I();
    check(i.hint === 'duct:side', `the entry vent is offered (${i.hint})`);
    await page.evaluate(() => { window.__app.current.world.level.lights.setGroup(0, true); });
    const n0 = (await I()).noise;
    await hold(BTN.Y, 1.9);
    await run(0.8);
    i = await I();
    check(i.attached && i.kind === 'duct' && i.noise <= n0 + 0.01, `unscrewing opens it silently and enters the duct (${i.kind}, noise ${f2(i.noise)})`);
    for (let k = 0; k < 20; k++) {
      await run(1.5, 1, 0);
      i = await I();
      if (!i.attached) break;
    }
    i = await I();
    check(!i.attached && i.x > -23.6 && i.z < -18.4, `crawled out in S1's south-west pocket (x ${f2(i.x)}, z ${f2(i.z)})`);

    // --- S1 Sorting Room
    console.log('S1 sorting room');
    await tp(-18.4, 0.02, -17.4, SOUTH);
    await run(0.4);
    i = await I();
    check(i.hint === 'ledge:below', `a shelf top is a standing grab (${i.hint})`);
    await tap(BTN.Y);
    await run(0.6);
    i = await I();
    check(i.attached && i.kind === 'ledge' && Math.abs(i.top - 2.6) < 0.05, `hanging from the shelf (top ${f2(i.top)})`);
    await tap(BTN.Y);
    await run(1.6);
    i = await I();
    check(i.y > 2.4 && !i.attached, `Y climbs onto the shelf top (y ${f2(i.y)})`);
    await tp(-19.0, 0.02, -7.35, NORTH);
    await run(0.4);
    await tap(BTN.Y);
    await run(0.7);
    i = await I();
    check(i.attached && i.kind === 'ledge' && Math.abs(i.top - 2.9) < 0.05, `a manual jump grabs the chute hopper lip (top ${f2(i.top)})`);
    await tp(-8.85, 0.02, -13.4, EAST);
    await run(0.4);
    i = await I();
    check(i.hintWin >= 0, `the exit window is offered (${i.hintWin})`);
    await tap(BTN.Y);
    await run(1.2);
    i = await I();
    check(i.x > -7.9, `vaulted through the window into S2 (x ${f2(i.x)})`);
    await tp(-12.0, 0.02, -13.2, SOUTH);
    await run(0.5);
    i = await I();
    check(i.cover !== '', `the table is cover ("${i.cover}")`);

    // --- S2 Switchboard Hall
    console.log('S2 switchboard hall');
    await tp(0, 0.02, -10.075, EAST);
    await run(0.4);
    i = await I();
    check(i.split, 'the split is offered facing along the lane');
    await tap(BTN.Y);
    await run(0.08);
    await tap(BTN.Y);
    await run(0.8);
    i = await I();
    check(i.attached && i.kind === 'split' && i.phase === 'on', `a double jump braces in the split (${i.kind} ${i.phase})`);
    await tap(BTN.B);
    await run(1.0);
    i = await I();
    check(!i.attached && i.y < 0.3, `B drops from the split (y ${f2(i.y)})`);
    await tp(6.0, 2.62, -7.6, SOUTH);
    await run(0.4);
    i = await I();
    check(i.hint === 'pipeH:below', `from the cabinet top the pipe is a standing grab (${i.hint})`);
    await tap(BTN.Y);
    await run(0.7);
    i = await I();
    check(i.attached && i.kind === 'pipeH' && i.pipe === 'hands', `hanging by the hands (${i.kind} ${i.pipe})`);
    await tap(BTN.Y);
    await run(0.9);
    i = await I();
    check(i.pipe === 'legsUp', `Y pulls the legs up (${i.pipe})`);
    await tap(BTN.Y);
    await run(1.0);
    i = await I();
    check(i.pipe === 'inverted', `Y again hangs inverted (${i.pipe})`);
    await tp(10.4, 0.02, -16.5, EAST);
    await run(0.4);
    i = await I();
    check(i.hint === 'ledge:wall', `the relay bank is a wall jump (${i.hint}, "${i.prompt}")`);
    await tap(BTN.Y);
    await run(1.2);
    i = await I();
    check(i.attached && i.kind === 'ledge' && Math.abs(i.top - 3.3) < 0.05, `wall jumped onto the perch lip (top ${f2(i.top)})`);
    await tap(BTN.Y);
    await run(1.8);
    i = await I();
    check(!i.attached && i.y > 3.1 && i.x > 10.8, `climbed up on the perch (y ${f2(i.y)}, x ${f2(i.x)})`);
    await tp(11.0, 3.32, -16.5, EAST);
    await run(0.5);
    i = await I();
    check(i.hintWin >= 0, `the perch window is offered (${i.hintWin})`);
    await tap(BTN.Y);
    await run(1.4);
    i = await I();
    check(i.x > 12.2 && i.y > 3.0, `through the window onto S3's catwalk (x ${f2(i.x)}, y ${f2(i.y)})`);
    await tp(-7.0, 0.02, -6.9, NORTH);
    await run(0.5);
    i = await I();
    check(i.hintWin < 0, 'the high glazed window is not a vault from the floor');
    const high = await page.evaluate(() => { const w = window.__app.current.world.level.anchors.windows.find((w) => Math.abs(w.sillHeight - 3.8) < 0.01); return w ? { open: w.open, y: w.c.y } : null; });
    check(!!high && !high.open, `the S2 high window is glazed (sill 3.8, ${JSON.stringify(high)})`);

    // --- S3 Boiler Room
    console.log('S3 boiler room');
    await tp(14.2, 0.02, -17.5, WEST);
    await run(0.4);
    i = await I();
    check(i.hint === 'ladder:bottom', `the south-west ladder is offered (${i.hint})`);
    await tap(BTN.Y);
    await run(0.8);
    await run(3.5, 0, 1);
    i = await I();
    check(i.y > 3.1 && i.x > 12.1 && i.x < 13.3, `up the ladder onto the catwalk (y ${f2(i.y)}, x ${f2(i.x)})`);
    await tp(14.0, 0.02, -12.0, WEST);
    await run(0.4);
    i = await I();
    check(i.hint === 'ledge:wall', `the catwalk lip is a wall jump from the floor (${i.hint})`);
    await tap(BTN.Y);
    await run(1.2);
    i = await I();
    check(i.attached && i.kind === 'ledge' && Math.abs(i.top - 3.3) < 0.05, `hanging from the catwalk lip (top ${f2(i.top)})`);
    await tp(24.05, 0.02, -16.0, EAST);
    await run(0.4);
    i = await I();
    check(i.hint === 'pipeV:side', `the drainpipe to boiler B is offered (${i.hint})`);
    await tap(BTN.Y);
    await run(0.8);
    for (let k = 0; k < 10 && (await I()).y < 1.6; k++) await run(1.0, 0, 1);
    await tap(BTN.Y);
    await run(1.6);
    i = await I();
    check(i.y > 3.2 && i.x > 24.2, `up the drainpipe and Y onto boiler B (y ${f2(i.y)}, x ${f2(i.x)})`);
    await tp(18.5, 3.32, -6.65, SOUTH);
    await run(0.5);
    i = await I();
    await tap(BTN.Y);
    await run(1.2);
    i = await I();
    check(i.y > 4.2 && i.z < -7.2, `up on boiler A (y ${f2(i.y)}, z ${f2(i.z)})`);
    // the cage fence: grab, climb, flip over (west to east); rattle only above gear 3
    await tp(26.4, 0.02, -8.0, EAST);
    await run(0.4);
    i = await I();
    check(i.hint === 'fence:side', `the cage fence is offered (${i.hint})`);
    await gear(5);
    await tap(BTN.Y);
    await run(0.8);
    let rattle = 0;
    for (let k = 0; k < 6; k++) {
      await run(0.15, 0, 1);
      rattle = Math.max(rattle, (await I()).noise);
    }
    i = await I();
    check(i.attached && i.kind === 'fence' && rattle > 3, `climbing at gear 5 rattles (noise ${f2(rattle)})`);
    await run(1.6, 0, 1);
    await tap(BTN.Y);
    await run(1.6);
    i = await I();
    check(!i.attached && i.x > 27.2, `flipped over the fence (x ${f2(i.x)})`);
    await gear(3);
    // grate noise on the catwalk
    await gear(4);
    await tp(15.0, 0.02, -12.0, EAST);
    await run(0.15, 0, 1);
    let floorN = 0;
    for (let k = 0; k < 5; k++) {
      await run(0.12, 0, 1);
      floorN = Math.max(floorN, (await I()).noise);
    }
    await tp(15.0, 3.32, -6.65, EAST);
    await run(0.15, 0, 1);
    let grate = 0;
    for (let k = 0; k < 5; k++) {
      await run(0.12, 0, 1);
      grate = Math.max(grate, (await I()).noise);
    }
    check(grate > floorN * 1.25, `gear 4 on the grate catwalk is louder than on the floor (${f2(grate)} vs ${f2(floorN)})`);
    await gear(2);
    await tp(15.0, 3.32, -6.65, EAST);
    await run(0.15, 0, 1);
    let silent = 0;
    for (let k = 0; k < 5; k++) {
      await run(0.12, 0, 1);
      silent = Math.max(silent, (await I()).noise);
    }
    check(silent === 0, `gear 2 on the catwalk is silent (noise ${f2(silent)})`);
    await gear(3);
    // the stairs and the doorway at 3.3
    await tp(22.0, 0.02, -13.6, NORTH);
    await run(0.3);
    await run(3.6, 0, 1);
    i = await I();
    check(i.y > 3.1 && i.z > -7.9, `up the metal stairs to the catwalk (y ${f2(i.y)}, z ${f2(i.z)})`);
    await tp(12.65, 3.32, -8.5, NORTH);
    await run(0.3);
    await run(1.9, 0, 1);
    i = await I();
    check(i.z > -5.7, `the west catwalk runs through the doorway into S4 (z ${f2(i.z)})`);

    // --- the kick: a fresh page (the first one unscrewed the grate)
    console.log('S0 duct kick');
    const b2 = await launch({ url, params: 'autostart=exchange&mode=sandbox' });
    await install(b2.page, true);
    await b2.page.evaluate(() => window.__pad.connect());
    const k = mk(b2.page);
    await k.run(0.5);
    await k.tp(-25.0, 0.02, -9.5, EAST);
    await k.run(0.4);
    await k.tap(BTN.Y);
    await k.run(0.6);
    i = await k.I();
    check(i.noise >= 9, `a kick is loud (noise ${f2(i.noise)})`);
    check(i.attached && i.kind === 'duct', `and enters the duct (${i.kind})`);
    await b2.browser.close();

    // --- touch: the action button at the prompts
    console.log('touch: the action button');
    const t = await launch({ url, params: 'autostart=exchange&mode=sandbox' });
    await install(t.page, false);
    const T = t.page;
    await frames(T, 10);
    const tapAction = async (done) => {
      for (let n = 0; n < 8; n++) {
        const b = await T.evaluate(() => { const r = document.querySelector('.tc-action')?.getBoundingClientRect(); return r && r.width > 0 ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
        if (b) {
          await T.touchscreen.tap(b.x, b.y);
          await T.waitForTimeout(700);
          if (await done()) return true;
        } else await frames(T, 2);
      }
      return false;
    };
    const attachedKind = (kind) => () => T.evaluate((k) => { const ac = window.__app.current.traversal.attachCtl; return ac.active && ac.m.anchor?.kind === k; }, kind);
    const tpT = async (x, y, z, yaw) => {
      await T.evaluate(([x, y, z, yaw]) => window.__ex.tp(x, y, z, yaw), [x, y, z, yaw]);
      await T.waitForTimeout(900);
    };
    await tpT(0, 0.02, -10.075, EAST);
    check(await tapAction(attachedKind('split')), 'touch: the action button at the split prompt jumps into it');
    await tpT(6.0, 2.62, -7.6, SOUTH);
    check(await tapAction(attachedKind('pipeH')), 'touch: the action button grabs the pipe from the cabinet');
    await tpT(26.4, 0.02, -8.0, EAST);
    check(await tapAction(attachedKind('fence')), 'touch: the action button grabs the cage fence');
    await tpT(10.4, 0.02, -16.5, EAST);
    // (standing still the button takes cover; the stick pushed at the wall picks the wall jump)
    await T.evaluate(() => window.__app.input.state.setMove('touch-test', 0, 1));
    await frames(T, 4);
    check(await tapAction(attachedKind('ledge')), 'touch: the action button wall jumps onto the relay perch');
    const real2 = t.errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
    check(real2.length === 0, `touch page: no console errors (${real2.join(' | ')})`);
    await t.browser.close();
  } catch (e) {
    failed++;
    console.error('ERROR', String(e).slice(0, 600));
  }
  const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
  check(real.length === 0, `no console errors (${real.join(' | ')})`);
  await browser.close();
}

await main();
if (failed) {
  console.log(`\ne2e-exchange: ${failed} check(s) failed`);
  process.exit(1);
}
console.log('e2e-exchange OK');
