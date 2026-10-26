// Piano escape (piano-escape S2, solo): the intro on the stub mill (`?piano=1&autostart=thornbeckMill&mode=sector`),
// the skip to the EMP prompt (hold Start 1 s), the press (pad A) -> every lamp dead, the lightning t0 set, the meter
// dark, input on at the cut; a checkpoint restart never replays the intro, the lamps stay dead and the scene music plays
// on. The sim is driven with `loop.stepHeadless` (input polled each step).
// (S4) Then the two-tab co-op run (`?net=local&piano=1` on both pages, PLAN S4): the client presses the EMP, both pages
// go dark, a flash at the same scene t on both (within 100 ms), the survivable start (both reach the low sacks within
// 4 s, no guard past suspicious), a restart keeps the lamps off, a co-op knife kill on G1 + G2 (a dual), a solo kill
// each, the rest down, both on the hoist platform: the end fades both pages to the lobby, no results screen. Waits from
// the measured knife timings (PR #620: contact 1.05 s, limp 1.57 s, operator free 1.87 s).
// Hooks: window.__piano (the scene's debug()), window.__sector, window.__app, window.__coop.
import { launch, openPage, frames, press, BTN, assert } from './e2e-lib.mjs';
import { LOAD_MS, NET_VIEWPORT, hostStepResult, onHostStep, offHostStep, setSimPages, startMode, until, waitHostSim, waitSim } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const PARAMS = 'piano=1&autostart=thornbeckMill&mode=sector';
/** The meter's dark band (`LIGHT.shadow`, src/world/lights.ts). */
const SHADOW = 0.28;

let ok = true;
console.log('piano escape: solo intro, skip, EMP, cut, restart');
const { browser, page, errors } = await launch({ url, params: PARAMS });
const G = (f, a) => page.evaluate(f, a);
const sim = async (s) => {
  for (let t = 0; t < s; t += 0.5) await G((d) => window.__app.loop.stepHeadless(d), Math.min(0.5, s - t));
  await frames(page, 1);
};
const dbg = () => G(() => window.__piano.debug());
try {
  await page.waitForFunction(() => !!window.__app?.current?.player && !!window.__piano && !!window.__sector, null, { timeout: 120000 });
  assert(await G(() => window.__app.current.world.map.id === 'thornbeckMill' && window.__app.current.world.map.scene === 'piano'), 'the stub mill loads as the piano scene');
  // audio unlocked (the piano starts from the intro's 0 s), the pad in
  const vp = page.viewportSize() ?? { width: 1280, height: 640 };
  await page.mouse.click(vp.width / 2, vp.height / 2);
  await G(() => window.__pad.connect());
  await press(page, BTN.LS);
  await sim(0.5);

  // ---- the intro: input held, no guard, no objective yet, the music in the scene
  let d = await dbg();
  assert(d.shot === 'black' || d.shot === 'fadeIn', `the intro starts black (${d.shot}, t ${Number(d.t).toFixed(2)})`);
  assert(d.holdsSpawn && !d.inPlay && !d.pressed, 'guards held and the objective waits until the EMP');
  assert(await G(() => window.__app.current.sceneView?.holdsInput === true && window.__app.current.sceneView?.ownsPause === true), 'the intro holds the input and owns the pause button (its skip)');
  assert(await G(() => window.__app.current.enemyMgr.alive === 0), 'no guard is up in the intro');
  assert(await G(() => window.__app.music.sceneActive === true), 'the scene owns the music (the director muted)');
  const p0 = await G(() => { const p = window.__app.current.player.position; return [p.x, p.z]; });
  await G(() => window.__pad.axis(1, -1));
  await sim(0.6);
  await G(() => window.__pad.axis(1, 0));
  const p1 = await G(() => { const p = window.__app.current.player.position; return [p.x, p.z]; });
  assert(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 0.05, 'the stick moves nobody in the intro');

  // ---- the skip: hold Start 1 s -> the prompt (38 s), not the pause menu
  await G(() => window.__pad.set(9, 1));
  await sim(1.3);
  await G(() => window.__pad.set(9, 0));
  await sim(0.2);
  d = await dbg();
  assert(d.skipped && d.prompt && d.shot === 'prompt', `the Start hold skips to the prompt (${d.shot}, t ${Number(d.t).toFixed(2)})`);
  assert(await G(() => !window.__app.current.menuPaused), 'the hold never opened the pause menu');
  // the prompt has no timer
  await sim(3);
  assert((await dbg()).prompt, 'the prompt waits with no timer');

  // ---- the press: the EMP beat
  await press(page, BTN.A);
  await sim(0.1);
  d = await dbg();
  assert(d.pressed && d.pressedBy === 'local', 'pad A sets off the EMP');
  assert(d.t0 >= 0, `the lightning t0 is the press time (${d.t0})`);
  assert(d.dark, 'the scene dark is on (em.sceneDark)');
  assert(await G(() => window.__app.current.enemyMgr.sceneDark === true), 'the guards are in the scene dark (torches on)');
  assert(d.knife, 'the knife scene is on from the EMP');
  // the mains cut ripples out nearest first over EMP_OUT_S (0.8 s): every lamp is dead once it has run
  await sim(0.8);
  assert(await G(() => window.__app.current.world.level.lights.lights.filter((l) => l.electric && l.on && !l.destroyed).length === 0), `every lamp is dead (${d.lampsCut} cut)`);
  assert(await G(() => window.__app.current.sceneView?.holdsInput === true), 'input still held in the black-out beat');
  // (S8) the glide from the hero shot into the shoulder camera runs press + 2.3-3.5 s; input comes on as it settles
  await sim(1.7); // press + 0.1 + 0.8 (the ripple) + 1.7 = press + 2.6 s
  d = await dbg();
  assert(d.shot === 'glide' && !d.inPlay, `the glide into the shoulder camera at press + 2.6 s (${d.shot})`);
  assert(await G(() => window.__app.current.sceneView?.holdsInput === true), 'input still held in the glide');
  await sim(1.3);
  d = await dbg();
  assert(d.inPlay && d.shot === 'play', `the cut to play at press + 3.5 s, the glide settled (${d.shot})`);
  assert(await G(() => window.__app.current.sceneView?.holdsInput === false), 'input on at the cut');
  await sim(0.5);
  const lv = await G(() => window.__app.current.lightLevel);
  assert(lv < SHADOW, `the meter reads dark (${lv.toFixed(3)} < ${SHADOW})`);
  const q0 = await G(() => { const p = window.__app.current.player.position; return [p.x, p.z]; });
  // the cut leaves him on the wall (knife S4b: on the bins, facing west): the stick slides him along it
  // (the camera may look along the wall or off it: sideways first, then forward if that was into the wall)
  await G(() => window.__pad.axis(0, 1));
  await sim(1);
  await G(() => window.__pad.axis(0, 0));
  let q1 = await G(() => { const p = window.__app.current.player.position; return [p.x, p.z]; });
  if (Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) <= 0.3) {
    await G(() => window.__pad.axis(1, -1));
    await sim(1);
    await G(() => window.__pad.axis(1, 0));
    q1 = await G(() => { const p = window.__app.current.player.position; return [p.x, p.z]; });
  }
  assert(Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) > 0.3, 'the stick moves the operator after the cut');

  // ---- a restart: no intro, the lamps stay dead, the music plays on
  const r0 = await G(() => window.__sector.restarts);
  assert(await G(() => window.__sector.restartCheckpoint()), 'the checkpoint restart runs');
  await sim(1.5);
  assert((await G(() => window.__sector.restarts)) === r0 + 1, 'one restart');
  d = await dbg();
  assert(d.shot === 'play' && d.inPlay && !d.holdsSpawn, `the restart never replays the intro (${d.shot})`);
  assert(await G(() => window.__app.current.sceneView?.holdsInput === false), 'input on after the restart');
  assert(await G(() => window.__app.current.world.level.lights.lights.filter((l) => l.electric && l.on && !l.destroyed).length === 0), 'the lamps stay dead after the restart');
  assert(await G(() => window.__app.music.sceneActive === true), 'the scene music plays on through the restart');

  const errs = errors.filter((e) => !/GPU stall|GL Driver/.test(e));
  assert(errs.length === 0, `no console errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
} catch (e) {
  ok = false;
  console.error(e);
}
await browser.close();

// ================================================================================== (S4) co-op: two tabs, ?net=local
/** The measured knife timings (knife S2, PR #620), from the press: contact, guard limp, operator free (s). */
const KNIFE = { contact: 1.05, limp: 1.57, free: 1.87 };
/** Two kills started within this (s) are a co-op (dual) kill (`DUAL_WINDOW`, src/game/dualTakedown.ts). */
const DUAL_WINDOW = 1.5;
/** The lightning timetable's first strike (s after the EMP, `THORNBECK_FLASH_TIMES`). */
const FIRST_FLASH = 6;
/** The survivable start: just north of the low sacks (PLAN section 3, Sa: x 1.5-3.9, z 1-2.2), within this (s). */
const SACKS = [2.7, 2.7];
const SACKS_S = 4;
/** Alert levels past suspicious (`AlertLevel`, src/ai/alertState.ts). */
const PAST_SUSPICIOUS = ['investigating', 'searching', 'alert'];
/** Kill spots (the pins): the guard faces west, his attacker 0.8 m east of him, facing west; clear of the start bay's cover. */
const WEST = -Math.PI / 2;
const PIN = { G1: [7.5, 8.9], G2: [7.5, 7.9], G3: [8.0, 2.0], G4: [3.0, 8.4] };
const SLOT = { G1: 0, G2: 1, G3: 2, G4: 3 };
/** Two spots on the hoist platform (the exit zone, x -2.4..0, z 15.5..17.7, on the deck at 4.2 m). */
const PLATFORM = [
  [-1.6, 4.25, 16.2],
  [-0.8, 4.25, 17.0],
];

if (ok) {
  console.log('piano escape: co-op (two tabs, ?net=local&piano=1)');
  const NETQ = 'net=local&piano=1';
  const { browser: nb, ctx, page: A, errors: eA } = await launch({ url, params: NETQ, viewport: NET_VIEWPORT });
  let B = null;
  let eB = [];
  const GA = (f, a) => A.evaluate(f, a);
  const GB = (f, a) => B.evaluate(f, a);
  const both = (f, a) => Promise.all([GA(f, a), GB(f, a)]);
  // a page in the background stops its frames: a pump steps a page whose frames stopped (as e2e-ctcourse)
  let pumpOn = false;
  let pumping = false;
  const pumpPage = (P) =>
    P.evaluate(() => {
      if (window.__raf === undefined) {
        window.__raf = 0;
        const f = () => {
          window.__raf++;
          requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      }
      const now = performance.now();
      const last = window.__pumpT ?? now;
      const idle = window.__pumpRaf === window.__raf;
      window.__pumpT = now;
      window.__pumpRaf = window.__raf;
      if (idle && window.__app.current) window.__app.loop.stepHeadless(Math.min(0.1, Math.max(1 / 60, (now - last) / 1000)));
    }).catch(() => {});
  const pump = setInterval(async () => {
    if (!pumpOn || pumping) return;
    pumping = true;
    await pumpPage(A);
    if (B) await pumpPage(B);
    pumping = false;
  }, 40);
  const dA = () => GA(() => window.__piano.debug());
  const dB = () => GB(() => window.__piano.debug());
  /** Electric lamps still lit on a page (guard torches and the window lights are not electric). */
  const lampsOn = (P) => P.evaluate(() => window.__app.current.world.level.lights.lights.filter((l) => l.electric && l.on && !l.destroyed).length);
  /** The client to (x, y, z) facing `yaw` (the host grants the teleport first). */
  const moveClient = async (x, y, z, yaw) => {
    await GA(() => {
      for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3);
    });
    await GB(([x, y, z, yaw]) => {
      const g = window.__app.current;
      g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw);
      g.player.cam.yaw = yaw;
    }, [x, y, z, yaw]);
    await waitSim(400);
  };
  const moveHost = (x, y, z, yaw) =>
    GA(([x, y, z, yaw]) => {
      const g = window.__app.current;
      g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw);
      g.player.cam.yaw = yaw;
    }, [x, y, z, yaw]);
  /** Host step hook: the guards `pins` [{ k, x, z }] held on their kill spots facing west (brain off until taken), all calm. */
  const PIN_FN = (g, a) => {
    const em = g.enemyMgr;
    for (const p of a.pins) {
      const e = em['slotGuard'][p.k];
      if (!e || !e.alive || e.taken) continue;
      e.update = () => {};
      e['stagger'] = 99;
      e.pos.set(p.x, 0, p.z);
      e.yaw = a.yaw;
    }
    for (const r of g.net.remotes.values()) r.ref.spotted = false;
    for (const e of em.enemies) if (e.alive && !e.taken) e.aware.set('unaware');
    return window.__pinsOff === a.gen;
  };
  let pinGen = 0;
  const pinOn = async (names) => {
    pinGen++;
    return onHostStep(A, PIN_FN, { gen: pinGen, yaw: WEST, pins: names.map((n) => ({ k: SLOT[n], x: PIN[n][0], z: PIN[n][1] })) });
  };
  const pinOff = async (key) => {
    await GA((n) => {
      window.__pinsOff = n;
    }, pinGen);
    await offHostStep(A, key);
  };
  /** The host's guard in slot k: id, alive. */
  const slotGuard = (k) =>
    GA((k) => {
      const e = window.__app.current.enemyMgr['slotGuard'][k];
      return e ? { id: e.id, alive: e.alive } : null;
    }, k);
  const hostAlive = (id) => GA((id) => window.__app.current.enemyMgr.enemies.some((e) => e.id === id && e.alive), id);
  /** Host step hook: the host starts its takedown the step its offer is on slot k's guard; result: the host sim time. */
  const HOST_KILL = (g, a) => {
    const e = g.enemyMgr['slotGuard'][a.k];
    if (g.takedown.offer?.e === e && !g.takedown.active) g.takedown.start();
    return g.takedown.active ? g.time + 1e-9 : false;
  };
  /** The client starts its takedown the frame its offer is on puppet `id`; resolves with its sim time (-1: none in 4 s). */
  const clientKill = (id) =>
    GB(
      (id) =>
        new Promise((res) => {
          const g = window.__app.current;
          const t0 = g.time;
          const w0 = performance.now();
          const tick = () => {
            if (g.takedown.offer?.e.id === id && !g.takedown.active) g.takedown.start();
            if (g.takedown.active) res(g.time);
            else if (g.time - t0 > 4 || performance.now() - w0 > 90000) res(-1);
            else requestAnimationFrame(tick);
          };
          tick();
        }),
      id,
    );
  /** Host step hook: walk the host to (x, z) (the camera faces it, the stick forward); result: { t } s taken (-1: over `cap`). */
  const HOST_WALK = (g, a, st) => {
    // the cut leaves him on the wall (knife S4b): off it first, as a player would
    if (g.wallCore?.active) g.wallCore.leave('e2e walk');
    const p = g.player.position;
    const dx = a.x - p.x;
    const dz = a.z - p.z;
    st.t0 ??= g.time;
    if (Math.sqrt(dx * dx + dz * dz) < 0.5) {
      window.__pad.axis(1, 0);
      return { t: g.time - st.t0 };
    }
    g.player.cam.yaw = Math.atan2(dx, dz);
    window.__pad.axis(1, -1);
    return g.time - st.t0 > a.cap ? { t: -1 } : false;
  };
  /** The client walks the same way on its own frames. */
  const clientWalk = (x, z, cap) =>
    GB(
      ([x, z, cap]) =>
        new Promise((res) => {
          const g = window.__app.current;
          const t0 = g.time;
          const tick = () => {
            if (g.wallCore?.active) g.wallCore.leave('e2e walk');
            const p = g.player.position;
            const dx = x - p.x;
            const dz = z - p.z;
            if (Math.sqrt(dx * dx + dz * dz) < 0.5) {
              window.__pad.axis(1, 0);
              res({ t: g.time - t0 });
              return;
            }
            g.player.cam.yaw = Math.atan2(dx, dz);
            window.__pad.axis(1, -1);
            if (g.time - t0 > cap) res({ t: -1 });
            else requestAnimationFrame(tick);
          };
          tick();
        }),
      [x, z, cap],
    );
  /** Host step hook: over `s` s, every guard's level; G1 + G2's scripted blackout search (searchKind 3) is no sighting. */
  const WATCH = (g, a, st) => {
    st.t0 ??= g.time;
    const em = g.enemyMgr;
    for (let k = 0; k < em.enemies.length; k++) {
      const e = em.enemies[k];
      if (!e.alive) continue;
      const lvl = e.level;
      const scripted = lvl === 'searching' && e.searchKind === 3 && (em['slotGuard'][0] === e || em['slotGuard'][1] === e);
      if (a.past.includes(lvl) && !scripted) (st.bad ??= []).push(`${e.id} ${lvl}`);
    }
    return g.time - st.t0 >= a.s ? { bad: st.bad ?? [] } : false;
  };

  try {
    // ---- the room: the host on A, the client joins on B, both with the flag; Sector Ops on Thornbeck Mill
    await A.click('.main-menu .btn:has-text("Co-op")');
    await A.click('.btn:has-text("Host a room")');
    await until(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 15000, 'host lobby');
    const code = await GA(() => window.__coop.session.code);
    ({ page: B, errors: eB } = await openPage(ctx, url, NETQ));
    await B.click('.main-menu .btn:has-text("Co-op")');
    await B.click('.btn:has-text("Join with code")');
    await B.keyboard.type(code.toLowerCase());
    await B.keyboard.press('Enter');
    await until(A, () => window.__coop.session.players.size === 2, null, 15000, 'host sees the client');
    setSimPages([A, B]);
    pumpOn = true;
    await startMode([A, B], 'sector', 'thornbeckMill');
    for (const P of [A, B]) await until(P, () => !!window.__piano && window.__app.current.world.map.id === 'thornbeckMill', null, LOAD_MS, 'the scene on both pages');
    assert((await dB()).client && !(await dA()).client, 'the client page runs its own scene, the host the SectorMode one');
    for (const P of [A, B]) {
      const vp = P.viewportSize() ?? NET_VIEWPORT;
      await P.mouse.click(vp.width / 2, vp.height / 2);
      await P.evaluate(() => window.__pad.connect());
    }

    // ---- both intros: input held, no lightning yet; both skip to the prompt (hold Start 1 s on each page)
    for (const P of [A, B])
      assert(await P.evaluate(() => window.__app.current.sceneView?.holdsInput === true && !(window.__app.current.world.lightning.t0 < Infinity)), 'each page plays its own intro, no lightning before the EMP');
    for (const P of [A, B]) await P.evaluate(() => window.__pad.set(9, 1));
    await waitSim(1400);
    for (const P of [A, B]) await P.evaluate(() => window.__pad.set(9, 0));
    for (const P of [A, B]) await until(P, () => window.__piano.debug().prompt, null, 5000, 'the prompt on both pages');
    // the flash recorder on both pages: the first sim step a strike lights, its scene t and the wall clock
    await both(() => {
      const h = window.__app.loop.hooks;
      const f = h.fixedUpdate;
      window.__flash = null;
      h.fixedUpdate = (dt) => {
        f(dt);
        const g = window.__app.current;
        const lt = g?.world?.lightning;
        if (!lt || window.__flash || !(lt.t0 < Infinity)) return;
        const now = g.net?.simTime?.() ?? g.time;
        if (lt.levelAt(now) > 0) window.__flash = { t: now - lt.t0, wall: Date.now() };
      };
    });

    // ---- the client presses the EMP: the host's beat; the client's intro ends on the host's press time (`ep`)
    const det0 = await GA(() => window.__app.current.style.detections);
    await press(B, BTN.A);
    await until(A, () => window.__piano.debug().pressed, null, 5000, 'the host takes the client EMP press');
    const ha = await dA();
    assert(ha.pressedBy !== 'local' && ha.pressedBy !== '', `the client set it off (pressed by ${ha.pressedBy})`);
    await until(B, () => window.__piano.debug().pressed, null, 3000, "the host's press reaches the client (ep)");
    const hb = await dB();
    assert(hb.t0 === ha.t0, `one t0 on both pages (host ${ha.t0}, client ${hb.t0})`);
    const lt0 = await both(() => window.__app.current.world.lightning.t0);
    assert(lt0[0] === ha.t0 && lt0[1] === ha.t0, `the lightning t0 is the host's press on both pages (${lt0.join(', ')})`);
    assert(ha.knife && hb.knife, 'the knife scene is on on both pages');
    await waitSim(1200);
    const on = [await lampsOn(A), await lampsOn(B)];
    assert(on[0] === 0 && on[1] === 0, `both pages dark: no electric lamp lit (host ${on[0]}, client ${on[1]})`);
    for (const P of [A, B]) assert(await P.evaluate(() => window.__app.music.sceneActive === true), 'the scene music on both pages');

    // ---- the cut on both pages, then the survivable start: both reach the low sacks within 4 s, no guard past suspicious
    for (const P of [A, B]) await until(P, () => window.__piano.debug().inPlay && window.__app.current.sceneView?.holdsInput === false, null, 4000, 'the cut to play on both pages');
    const wKey = await onHostStep(A, WATCH, { past: PAST_SUSPICIOUS, s: SACKS_S });
    const hKey = await onHostStep(A, HOST_WALK, { x: SACKS[0], z: SACKS[1], cap: SACKS_S + 2 });
    const cw = await clientWalk(SACKS[0] + 0.6, SACKS[1] + 0.4, SACKS_S + 2);
    const hw = await hostStepResult(A, hKey, (SACKS_S + 3) * 1000, 'host walk');
    const watch = await hostStepResult(A, wKey, (SACKS_S + 3) * 1000, 'guard watch');
    assert(hw.t >= 0 && hw.t <= SACKS_S, `the host reaches the low sacks within ${SACKS_S} s (${hw.t.toFixed(2)} s)`);
    assert(cw.t >= 0 && cw.t <= SACKS_S, `the client reaches the low sacks within ${SACKS_S} s (${cw.t.toFixed(2)} s)`);
    assert(watch.bad.length === 0, `no guard past suspicious on the way (${watch.bad.slice(0, 6).join(', ')})`);
    assert((await GA(() => window.__app.current.style.detections)) === det0, 'no detection at the start');

    // ---- the first flash: the same scene t on both pages (within 100 ms), at the timetable's first strike
    await until(A, () => !!window.__flash, null, 9000, 'the first flash on the host');
    await until(B, () => !!window.__flash, null, 9000, 'the first flash on the client');
    const [fa, fb] = await both(() => window.__flash);
    console.log(`  first flash: host t ${fa.t.toFixed(3)} s, client t ${fb.t.toFixed(3)} s, wall gap ${Math.abs(fa.wall - fb.wall)} ms`);
    assert(Math.abs(fa.t - fb.t) <= 0.1, `a flash at the same t on both pages (host ${fa.t.toFixed(3)}, client ${fb.t.toFixed(3)})`);
    assert(Math.abs(fa.t - FIRST_FLASH) <= 0.1, `the first flash at the timetable's ${FIRST_FLASH} s (${fa.t.toFixed(3)})`);

    // ---- a restart (the host's checkpoint restart): no intro on either page, the lamps stay off on both
    const r0 = await GA(() => window.__sector.restarts);
    assert(await GA(() => window.__sector.restartCheckpoint()), 'the checkpoint restart runs');
    await until(A, (r) => window.__sector.restarts === r + 1 && !window.__piano.debug().holdsSpawn, r0, 6000, 'the restart and its spawn');
    await waitSim(800);
    const on2 = [await lampsOn(A), await lampsOn(B)];
    assert(on2[0] === 0 && on2[1] === 0, `a restart keeps the lamps off on both pages (host ${on2[0]}, client ${on2[1]})`);
    const [ra, rb] = [await dA(), await dB()];
    assert(ra.shot === 'play' && rb.shot === 'play' && ra.inPlay && rb.inPlay, `the restart replays no intro (host ${ra.shot}, client ${rb.shot})`);
    for (const k of [0, 1, 2, 3]) await until(A, (k) => window.__app.current.enemyMgr['slotGuard'][k]?.alive === true, k, 5000, `slot ${k} up again`);

    // ---- a co-op kill on G1 + G2: both start inside the dual window; both dead (lethal), one dual, both free by 1.87 s
    const g1 = await slotGuard(SLOT.G1);
    const g2 = await slotGuard(SLOT.G2);
    await until(B, (id) => window.__app.current.net.puppets.get(id)?.alive === true, g2.id, 5000, 'the client has G2');
    const duals0 = await GA(() => window.__app.current.net.duals);
    const lethal0 = await GA(() => window.__app.current.enemyMgr.bodies.filter((x) => x.lethal).length);
    let pin = await pinOn(['G1', 'G2']);
    await moveHost(PIN.G1[0] + 0.8, 0.05, PIN.G1[1], WEST);
    await moveClient(PIN.G2[0] + 0.8, 0.05, PIN.G2[1], WEST);
    const hk = await onHostStep(A, HOST_KILL, { k: SLOT.G1 });
    const ct = await clientKill(g2.id);
    const ht = await hostStepResult(A, hk, 5000, 'host knife kill on G1');
    assert(ct >= 0, 'the client starts its knife kill on G2');
    await waitSim((KNIFE.free + 0.4) * 1000);
    await pinOff(pin);
    const pair = await GA(() => {
      const g = window.__app.current;
      return { lethal: g.enemyMgr.bodies.filter((x) => x.lethal).length, duals: g.net.duals, busy: g.takedown.active !== null };
    });
    assert(!(await hostAlive(g1.id)) && !(await hostAlive(g2.id)), `G1 + G2 down (the host's kill began at ${Number(ht).toFixed(2)} s)`);
    assert(pair.lethal >= lethal0 + 2, `knife kills: two lethal bodies (${lethal0} -> ${pair.lethal})`);
    assert(pair.duals === duals0 + 1, `a co-op (dual) kill: begun inside ${DUAL_WINDOW} s (duals ${duals0} -> ${pair.duals})`);
    assert(!pair.busy && !(await GB(() => window.__app.current.takedown.active !== null)), `both operators free by ${KNIFE.free} s`);

    // ---- a solo kill each: G3 by the host, then (past the dual window) G4 by the client; no dual
    const g3 = await slotGuard(SLOT.G3);
    const g4 = await slotGuard(SLOT.G4);
    pin = await pinOn(['G3', 'G4']);
    await moveHost(PIN.G3[0] + 0.8, 0.05, PIN.G3[1], WEST);
    const hk3 = await onHostStep(A, HOST_KILL, { k: SLOT.G3 });
    await hostStepResult(A, hk3, 5000, 'host knife kill on G3');
    const ran = await waitHostSim(A, (KNIFE.limp + 0.1) * 1000);
    assert(ran >= (KNIFE.limp + 0.1) * 1000, `the host clock ran past the limp (${Math.round(ran)} ms)`);
    assert(!(await hostAlive(g3.id)), `G3 down by the limp (${KNIFE.limp} s)`);
    await waitSim((DUAL_WINDOW + 0.3) * 1000);
    await until(B, (id) => window.__app.current.net.puppets.get(id)?.alive === true, g4.id, 5000, 'the client has G4');
    await moveClient(PIN.G4[0] + 0.8, 0.05, PIN.G4[1], WEST);
    assert((await clientKill(g4.id)) >= 0, 'the client starts its knife kill on G4');
    await waitSim((KNIFE.free + 0.4) * 1000);
    await pinOff(pin);
    assert(!(await hostAlive(g4.id)), 'G4 down (the client kill)');
    assert((await GA(() => window.__app.current.net.duals)) === duals0 + 1, 'the two solo kills are no dual');

    // ---- the rest down: the hoist door opens; both on the hoist platform: the end on both pages, no results screen
    await GA(() => {
      const g = window.__app.current;
      for (const e of g.enemyMgr.enemies.filter((q) => q.alive)) {
        e.applyDamage({ amount: 99999, point: e.pos.clone(), dir: new e.pos.constructor(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'test', sourcePos: e.pos.clone(), impulse: 1 });
      }
    });
    await until(A, () => window.__sector.debug().phase !== 'objective', null, 6000, 'the clear objective done (the hoist door unlocks)');
    await moveHost(...PLATFORM[0], Math.PI / 2);
    await moveClient(...PLATFORM[1], Math.PI / 2);
    await until(A, () => window.__piano.debug().finished, null, 6000, 'the end begins on the host (both on the platform)');
    await until(B, () => window.__piano.debug().finished, null, 4000, 'the end reaches the client (its page fades too)');
    for (const P of [A, B]) assert(await P.evaluate(() => !document.querySelector('.results-screen')), 'no results screen while it fades');
    pumpOn = false;
    for (const P of [A, B]) await until(P, () => !!document.querySelector('.lobby-screen') && !window.__app.current?.net && !window.__piano, null, 20000, 'back in the room lobby');
    for (const P of [A, B]) assert(await P.evaluate(() => !document.querySelector('.results-screen')), 'the lobby, never the results screen');

    const errs = [...eA, ...eB].filter((e) => !/GPU stall|GL Driver/.test(e));
    assert(errs.length === 0, `no console errors on either page${errs.length ? ': ' + errs.join(' | ') : ''}`);
  } catch (e) {
    ok = false;
    console.error(e);
    console.log('  host:', await dA().catch(() => null), ' client:', B ? await dB().catch(() => null) : null);
  }
  clearInterval(pump);
  await nb.close();
}
if (ok) console.log('piano e2e passed');
process.exit(ok ? 0 : 1);
