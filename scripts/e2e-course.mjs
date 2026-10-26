// T1b: the training course in co-op. Two pages over ?net=local (the host and one client) start Course mode on the
// courselab debug map from the lobby: the airlock refuses one player (the client sees its own refusal), cycles with both
// and the near door stays locked; every gate kind (lever, bolt, hold, timed hold, pair, egress, mains, pickup / flag,
// anchor lock) opens when the host acts and, after a forced both-down restart (both respawn in the airlock, the bay's
// gates reset), when the client acts; the client sees door locks and the lamp group change within 0.5 s; friendly
// fire (D38): a host shot and a client grenade down the partner, who is revived (co-op rules: no frag, no restart).
// T1c: drills, both tick columns, markers; the client's door is its own verb on the host; the end device refuses while
// the last drill is open, LANTERN's radio reaches the client, results show the course panel on both pages, and a second
// lobby starts at bay 2 with both players in its entry airlock.
// T2: `?autostart=bunker&mode=course` boots the course solo; two pages at `?net=local&autostart=courselab&mode=course` host / join one
// course session with no clicks (the walk URLs; the second tab adds `&autojoin=1`, F28).
import { launch, openPage, assert, press, BTN } from './e2e-lib.mjs';
import { until, setSimPages, LOAD_MS, onHostStep, offHostStep, hostStepResult } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;

// (co-op test fix) `until` is e2e-net-lib's: polled from Node (G13), timed on both pages' sim clocks in a match. The
// fixed pauses (`wait`) stay wall time here: the suite passes, and its latency checks are measured in wall time.

// (the default window: the lobby is clicked; the menus need 1280 x 720 of layout, see e2e-coop)
const { browser, ctx, page: A, errors: eA } = await launch({ url, params: 'net=local' });
let B = null;
let eB = [];
const GA = (f, a) => A.evaluate(f, a);
const GB = (f, a) => B.evaluate(f, a);

// The host page is in the background once the client page opens: its rAF (and the game loop) stalls. A pump steps the
// host's sim headless in real time whenever its own rAF did not run since the last pump (never twice the speed).
let pumpOn = false;
let pumping = false;
const pump = setInterval(async () => {
  if (!pumpOn || pumping) return;
  pumping = true;
  try {
    await A.evaluate(() => {
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
    });
  } catch {}
  pumping = false;
}, 40);

/** Use an item through its own `onUse` (the host acts as P1; a client's mirrored item sends `use`, the host checks reach). */
const use = (P, id) =>
  P.evaluate((id) => {
    const it = window.__app.current.interactables?.items.find((i) => i.id === id);
    if (!it) return 'missing';
    if (!it.enabled) return 'disabled';
    // 'local' like the game's own prompt and menu (gameState.ts): the host's press is P1 (marlow-bays item 2)
    it.onUse(it, 'local');
    return 'ok';
  }, id);
const hostDebug = () => GA(() => window.__course.debug());
const gateOpen = (id) => GA((id) => window.__course.debug().gates[id], id);
async function moveHost(x, z, yaw = 0) {
  await GA(([x, z, yaw]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, 0.1, z), yaw); }, [x, z, yaw]);
  // the course has the host there (a fixed step ran)
  await until(A, ([x, z]) => { const f = window.__course.state.feet; return Math.hypot(f[0] - x, f[2] - z) < 0.4; }, [x, z], 15000, `course sees the host at ${x}, ${z}`);
}
async function moveClient(x, z, yaw = 0) {
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
  await GB(([x, z, yaw]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, 0.1, z), yaw); }, [x, z, yaw]);
  // the host has the client there (its own `use` reach check reads the host's copy)
  await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; const f = window.__course.state.feet; return Math.hypot(r.feet.x - x, r.feet.z - z) < 0.4 && Math.hypot(f[3] - x, f[5] - z) < 0.4; }, [x, z], 15000, `host sees the client at ${x}, ${z}`);
}
/** Door index (`Doors.list`) of a course door id. */
const doorIndex = (cid) => GA((cid) => { const g = window.__app.current; const aid = g.world.layout.course.doors[cid]; return g.world.doors.list.find((d) => d.anchor.id === aid).index; }, cid);
/** (test-speed) The client's sim clock (s): the latency checks count game time, not wall time, so a loaded machine
 * (frames slower than real time) does not read as network lag. */
const clientSim = () => GB(() => window.__app.current.time);
/** Game time (ms, the client's clock) from `t0` (`clientSim()`) until the client's course state satisfies `fn`. */
async function clientWithin(t0, fn, arg, what) {
  await until(B, fn, arg, 5000, what);
  return Math.round(((await clientSim()) - t0) * 1000);
}

try {
  console.log('host opens a room, client joins, Course on courselab');
  await A.click('.main-menu .btn:has-text("Co-op")');
  await A.click('.btn:has-text("Host a room")');
  await until(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 15000, 'host lobby');
  const code = await GA(() => window.__coop.session.code);
  const opened = await openPage(ctx, url, 'net=local');
  B = opened.page;
  eB = opened.errors;
  setSimPages([A, B]);
  await B.click('.main-menu .btn:has-text("Co-op")');
  await B.click('.btn:has-text("Join with code")');
  await B.keyboard.type(code.toLowerCase());
  await B.keyboard.press('Enter');
  await until(A, () => window.__coop.session.players.size === 2, null, 15000, 'host sees client');
  await GA(() => window.__coop.session.setSettings('course', 'courselab', 'normal', ''));
  await GB(() => window.__coop.session.setReady(true));
  await until(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready');
  await GA(() => window.__coop.session.startMatch());
  for (const P of [A, B]) await until(P, () => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && !window.__app.current.isEnded, null, LOAD_MS, 'course match on both pages');
  pumpOn = true;
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state) && !!window.__course?.state, null, 15000, 'host course running');
  await until(B, () => !!window.__course?.wire, null, 8000, 'client has the course state');
  const hostId = await GA(() => window.__coop.session.selfId);
  const clientId = await GB(() => window.__coop.session.selfId);

  console.log('objective list and automatic airlock (R5, R6)');
  const near = await doorIndex('A1-near');
  const far = await doorIndex('A1-far');
  await until(B, (far) => window.__course.wire.locks.includes(far), far, 5000, 'client sees the far door locked');
  assert(true, 'the far airlock door starts locked on the client');
  // R5: the objective list is on screen on both pages from spawn, before any action (named, a tick column per player)
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => { const el = document.querySelector('.course-hud'); return !!el && !el.hidden && el.offsetParent !== null && /objectives/.test(el.querySelector('.ch-bay')?.textContent ?? '') && document.querySelectorAll('.course-hud tr[data-drill]').length === 3 && !!document.querySelector('.course-hud tr[data-obj="exit"]'); }, null, 8000, `${tag} objective list at spawn`);
  }
  assert(true, 'the objective list shows on both pages at spawn (three drills and the airlock row)');
  // R6: no Cycle button anywhere (host and client)
  const cyc = [await GA(() => window.__app.current.interactables.items.some((i) => i.id === 'c-A1' || /cycle/i.test(i.label))), await GB(() => window.__app.current.interactables.items.some((i) => i.id === 'c-A1' || /cycle/i.test(i.label)))];
  assert(!cyc[0] && !cyc[1], `no airlock Cycle button on either page (${cyc})`);
  const airText = (P) => P.evaluate(() => { const e = document.querySelector('.course-hud .ch-air'); return e && !e.hidden ? e.textContent : ''; });
  await moveHost(11, 2.4);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => /Waiting for partner/.test(document.querySelector('.course-hud .ch-air')?.textContent ?? '') && !document.querySelector('.course-hud .ch-air').hidden, null, 8000, `${tag} shows "Waiting for partner"`);
  let d = await hostDebug();
  assert(d.air.A1 === 'waiting', `one player on the pad waits; both pages show "Waiting for partner" (${d.air.A1})`);
  await moveHost(3, 3.4);
  await moveClient(11, 2.4);
  await until(A, () => window.__course.debug().air.A1 === 'waiting', null, 5000, 'client alone on the pad: waiting');
  await until(B, () => /Waiting for partner/.test(document.querySelector('.course-hud .ch-air')?.textContent ?? ''), null, 5000, 'client sees "Waiting for partner" (client on the pad)');
  assert(true, 'the client alone on the pad waits too');
  console.log('drills (T1c): refusal, both tick columns, client tick, markers');
  await moveHost(11.6, 3.2);
  await until(A, () => window.__course.debug().air.A1 === 'ready', null, 5000, 'both on the pad, drills open: ready');
  await until(B, () => /pace/.test(document.querySelector('.course-hud .ch-air')?.textContent ?? ''), null, 5000, 'client HUD names the open objectives');
  const refA = await GA(() => window.__course.state.airlockStatus());
  const refB = await airText(B);
  d = await hostDebug();
  assert(/pace/.test(refA) && /vault/.test(refA) && /panel/.test(refA) && /pace/.test(refB) && d.air.A1 !== 'cycling', `both on the pad with drills open: no cycle; the HUD names the open objectives (host "${refA}", client "${refB}")`);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => document.querySelectorAll('.course-hud tr[data-drill] td[data-p="1"]').length === 3 && document.querySelectorAll('.course-hud tr[data-drill] td[data-p="2"]').length === 3, null, 8000, `${tag} HUD lists the drills`);
  }
  assert(true, 'both tick columns show on both pages');
  // markers (D19): on by default, hidden by the setting (the client page renders frames)
  await until(B, () => window.__app.current.hud.pings.markerShown, null, 8000, 'client marker shown');
  await GB(() => window.__app.settings.update((s) => void (s.gameplay.courseMarkers = false)));
  await until(B, () => !window.__app.current.hud.pings.markerShown, null, 8000, 'client marker hidden by the setting');
  await GB(() => window.__app.settings.update((s) => void (s.gameplay.courseMarkers = true)));
  assert(true, 'markers hide with the Course markers setting');
  // the client's gear change reaches the host as a tick (ctick, C10); the host's own gear change ticks P1
  await GB(() => { const gs = window.__app.current.player.controller.gears; gs.step(gs.gear > 1 ? -1 : 1); });
  await until(A, () => window.__course.log[1].includes('gear'), null, 8000, 'client gear tick on the host');
  await GA(() => { const gs = window.__app.current.player.controller.gears; gs.step(gs.gear > 1 ? -1 : 1); });
  await until(A, () => window.__course.log[0].includes('gear'), null, 8000, 'host gear tick');
  assert(true, "the client's gear change reaches the host as a tick");
  // the client vaults the low wall (a real traversal through the pad's Y)
  await GB(() => window.__pad.connect());
  await wait(300);
  let vaulted = false;
  for (let i = 0; i < 3 && !vaulted; i++) {
    await moveClient(2.9, 6.8, Math.PI / 2);
    await wait(400);
    await press(B, BTN.Y);
    try {
      await until(A, () => window.__course.log[1].includes('vault'), null, 4000, 'client vault tick');
      vaulted = true;
    } catch {}
  }
  assert(vaulted, 'the client vaults the low wall and the host ticks it');
  // the host presses the panel
  await moveHost(7, 1.6);
  assert((await use(A, 'c-sw-l1')) === 'ok' && (await GA(() => window.__course.log[0].includes('switch'))), 'the host presses the panel (switch drill)');
  await until(B, () => document.querySelectorAll('.course-hud td.done').length >= 4, null, 5000, 'client HUD shows the ticks');
  // the rear (near) door stands open (D48: it stayed open on the cycle in walk 1)
  await GA((n) => { const g = window.__app.current; g.world.doors.open(g.world.doors.list[n], 'quiet'); }, near);
  await until(B, (n) => window.__app.current.world.doors.list[n].target === 1, near, 5000, 'client sees the near door open');
  await moveClient(11, 2.4);
  await moveHost(11.6, 3.2);
  // automatic: both on the pad with the drills done cycles by itself (no button)
  await until(A, () => window.__course.debug().air.A1 === 'cycling', null, 3000, 'airlock cycling by itself');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => /cycling/i.test(document.querySelector('.course-hud .ch-air')?.textContent ?? ''), null, 5000, `${tag} HUD shows the cycle`);
  // the cycle's simulated seconds, at once (nobody moves meanwhile)
  await GA(() => window.__app.loop.stepHeadless(4.5));
  await until(A, () => window.__course.debug().bay === 1, null, 9000, 'airlock sealed, bay L2');
  await until(B, ([n, f]) => window.__course.wire.locks.includes(n) && !window.__course.wire.locks.includes(f) && window.__course.wire.s.bay === 1, [near, far], 5000, 'client sees the near door locked');
  d = await hostDebug();
  assert(d.checkpoint === 'A1', `cycles by itself with both on the pad (checkpoint ${d.checkpoint})`);
  // the rear door is shut (leaf closed, body back) and locked on both pages; the front door opened by itself (host)
  const doorOn = (P, n) => P.evaluate((n) => { const x = window.__app.current.world.doors.list[n]; return { target: x.target, open: +x.open.toFixed(2), body: !!x.body, locked: !!x.anchor.locked }; }, n);
  await until(B, (n) => { const x = window.__app.current.world.doors.list[n]; return x.target === 0 && x.open === 0 && !!x.body && x.anchor.locked; }, near, 5000, 'client: the rear door shut, body back, locked');
  const nA = await doorOn(A, near);
  const nB = await doorOn(B, near);
  const fA = await doorOn(A, far);
  assert(nA.target === 0 && nA.open === 0 && nA.body && nA.locked && nB.target === 0 && nB.body && nB.locked, `the rear door is shut and locked on both pages (host ${JSON.stringify(nA)}, client ${JSON.stringify(nB)})`);
  assert(fA.target === 1 && !fA.locked, `the front door opens by itself when the cycle ends (${JSON.stringify(fA)})`);
  // a locked door blocks the client: he walks into the shut rear door from 3 m inside the airlock and stays inside.
  // The stick is camera-relative: the walk sets the camera's yaw, not only the body's, and steps the client's own page
  // headless (as e2e-ct). Control: the same walk along the airlock (+z, clear floor) covers more than the 3 m.
  const walkClient = (yaw, secs) =>
    GB(([yaw, secs]) => {
      const g = window.__app.current;
      window.__pad.connect();
      g.player.cam.yaw = yaw;
      g.player.cam.pitch = 0;
      window.__pad.axis(1, -1);
      const tr = [];
      for (let t = 0; t < secs - 1e-6; t += 0.2) {
        window.__app.loop.stepHeadless(Math.min(0.2, secs - t), 120);
        const c = g.player.controller;
        const f2 = (v) => (typeof v === 'number' ? +v.toFixed(2) : v);
        tr.push([f2(g.player.position.x), f2(g.player.position.z), f2(g.player.cam.yaw), f2(c.yaw), f2(c.speed), f2(c.wishDir?.x), f2(c.wishDir?.z), !!c.override, f2(window.__pad.state?.axes?.[1])]);
      }
      window.__walkTrace = tr;
      window.__pad.axis(1, 0);
      window.__app.loop.stepHeadless(0.2, 120);
      return [g.player.position.x, g.player.position.z];
    }, [yaw, secs]);
  const [ndx, ndz] = await GA((n) => { const x = window.__app.current.world.doors.list[n]; return [x.cx, x.cz]; }, near);
  // the host steps clear of both walk lines first (he stood at (11.6, 3.2), beside them): the client page's hit boxes
  // of its partner (PartnerTarget, course friendly fire D38) block the client's body
  await moveHost(13, 6);
  await moveClient(ndx + 3, 1.7);
  const c0 = await walkClient(0, 2.8);
  const free = Math.hypot(c0[0] - (ndx + 3), c0[1] - 1.7);
  await moveClient(ndx + 3, ndz);
  const c1 = await walkClient(-Math.PI / 2, 2.8);
  assert(free >= 3, `control: the client walks ${free.toFixed(2)} m freely in the same time`);
  const blocked = c1[0] < ndx + 0.8 && c1[0] > ndx + 0.1 && Math.abs(c1[1] - ndz) < 0.6;
  if (!blocked) console.error('walk trace [x, z, camYaw, yaw, speed, wishX, wishZ, override, padY]', JSON.stringify(await GB(() => window.__walkTrace)));
  assert(c1[0] < ndx + 0.8 && c1[0] > ndx + 0.1 && Math.abs(c1[1] - ndz) < 0.6, `the locked rear door blocks the client: he walks up to it and stays on the airlock side (x ${(ndx + 3).toFixed(1)} -> ${c1[0].toFixed(2)}; door at x ${ndx.toFixed(1)})`);
  await moveClient(11, 2.4);

  /** Work every gate in the strip; `who` acts ('A' host / 'B' client), the other only does the pair gate's second half. */
  async function gates(who) {
    const P = who === 'A' ? A : B;
    const O = who === 'A' ? B : A;
    const move = who === 'A' ? moveHost : moveClient;
    const moveO = who === 'A' ? moveClient : moveHost;
    const tag = who === 'A' ? 'host' : 'client';
    const idx = {};
    for (let k = 0; k < 8; k++) idx[k] = await doorIndex(`d${k}`);
    // lever: the client sees the door unlock within 0.5 s
    await move(20.6, 1.5);
    let t0 = await clientSim();
    assert((await use(P, 'c-sw-lever')) === 'ok', `${tag}: lever pressed`);
    const msLock = await clientWithin(t0, (i) => !window.__course.wire.locks.includes(i), idx[0], 'client sees the lever door unlock');
    const limL = who === 'A' ? 500 : 1500;
    assert((await gateOpen('g-lever')) && msLock <= limL, `${tag}: lever opens its door; the client sees the lock change in ${msLock} ms (limit ${limL})`);
    // bolt: refused from the far side, works from the bolt side
    await move(26.8, 4);
    await use(P, 'c-g-bolt');
    const refused = !(await gateOpen('g-bolt'));
    await move(25.2, 4);
    await use(P, 'c-g-bolt');
    assert(refused && (await gateOpen('g-bolt')), `${tag}: bolt refuses the far side, opens from the bolt side`);
    // hold: open while braced, shut when the holder walks off
    await move(28.6, 1.5);
    await use(P, 'c-h-hold');
    const held = await gateOpen('g-hold');
    await move(25.2, 6);
    await until(A, () => !window.__course.debug().gates['g-hold'], null, 10000, 'hold released');
    assert(held, `${tag}: hold opens while braced and shuts on release`);
    // timed hold: stays open after release (TIMED_HOLD_AFTER)
    await move(32.6, 1.5);
    await use(P, 'c-h-timed');
    await move(29.5, 6);
    await wait(400);
    assert(await gateOpen('g-timed'), `${tag}: timed hold stays open after release`);
    // pair: both halves, two players, inside the window
    await move(36.6, 1.5);
    await moveO(36.6, 6.5);
    // (load-latent-net) the client presses its half from here; the host presses its half on its own fixed step that
    // first sees the client's press stamped on the gate (two presses from here could land outside the window under load)
    const cHalf = who === 'A' ? 'b' : 'a';
    const pairKey = await onHostStep(A, (g, c) => {
      const gt = window.__course.state.gates.find((x) => x.def.id === 'g-pair');
      if (!((c === 'a' ? gt.ta : gt.tb) >= 0 && (c === 'a' ? gt.pa : gt.pb) !== 0)) return undefined;
      const it = g.interactables?.items.find((i) => i.id === (c === 'a' ? 'c-sw-pb' : 'c-sw-pa'));
      if (!it) return 'missing';
      if (!it.enabled) return 'disabled';
      it.onUse(it, 'local');
      return 'ok';
    }, cHalf);
    const rc = await use(B, `c-sw-p${cHalf}`);
    const rh = rc === 'ok' ? await hostStepResult(A, pairKey, 8000, `${tag}: the host sees the client's pair half and presses its own`) : (await offHostStep(A, pairKey), 'client not pressed');
    assert(rc === 'ok' && rh === 'ok', `${tag}: both pair halves pressed (client ${rc}, host ${rh})`);
    await until(A, () => window.__course.debug().gates['g-pair'], null, 3000, 'pair open');
    assert(true, `${tag}: pair gate opens with both halves`);
    // egress
    await move(40.6, 1.5);
    await use(P, 'c-sw-egress');
    assert(await gateOpen('g-egress'), `${tag}: egress opens`);
    // mains: the wall switch cuts lamp group 7; the client sees the group change within 0.5 s
    await move(44.6, 1.5);
    // one press (after a restart too: the restart syncs the wall switch with the restored circuit, A15)
    t0 = await clientSim();
    await use(P, 'switch-0');
    const ms = await clientWithin(t0, () => window.__course.wire.lights.groups.some(([g, on]) => g === 7 && !on) && window.__app.current.world.level.lights.lights.filter((l) => l.group === 7).every((l) => !l.on), null, 'client sees the mains off after one press');
    await until(A, () => window.__course.debug().gates['g-mains'], null, 3000, 'mains gate open');
    // the host's own press: press to the client's lamps within 0.5 s. A client press adds its round trip through the host,
    // whose background page only steps on the suite's pump: a looser bound (A16)
    const lim = who === 'A' ? 500 : 1500;
    assert(ms <= lim, `${tag}: one press opens the mains; the client's lamp group goes off in ${ms} ms (limit ${lim})`);
    // pickup: the key flag opens the flag door and unlocks the ladder
    const ladder = await GA(() => window.__app.current.world.layout.course.anchors.ladder);
    assert(await GB((id) => window.__course.wire.anchors.includes(id), ladder), `${tag}: the ladder starts locked on the client`);
    await move(48.6, 1.5);
    await use(P, 'c-sw-key');
    await until(B, ([id, i]) => !window.__course.wire.anchors.includes(id) && !window.__course.wire.locks.includes(i), [ladder, idx[7]], 3000, 'client sees the key unlocks');
    assert((await gateOpen('g-key')) && (await gateOpen('g-flag')) && (await gateOpen('g-ladder')), `${tag}: the key opens the flag door and the ladder`);
    const clientAnchors = await GB(() => [...window.__app.current.traversal.attachCtl.disabled]);
    assert(!clientAnchors.includes(ladder), `${tag}: the client's own ladder anchor is unlocked`);
  }

  // (process audit, 2026-10-19) one gate walk, the client's (after the restart): the host acting on gates is
  // e2e-ctcourse's (the bolt from the far side, the plates), and the restart resets every gate either way
  console.log('forced both-down restart');
  await GA(() => {
    const g = window.__app.current;
    const V = g.player.position.constructor;
    const hit = () => ({ amount: 9999, point: new V(0, 1, 0), dir: new V(1, 0, 0), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'e2e', sourcePos: new V(0, 1, 0), impulse: 0 });
    g.target.applyDamage(hit());
    for (const r of g.net.remotes.values()) r.applyDamage(hit());
  });
  // RESTART_DELAY and the respawn's simulated seconds, at once
  await GA(() => window.__app.loop.stepHeadless(3.5));
  await until(A, () => window.__app.current.player.alive && [...window.__app.current.net.remotes.values()].every((r) => r.alive), null, 12000, 'both respawn');
  await until(B, () => window.__app.current.player.alive, null, 5000, 'client alive again');
  await wait(400);
  const inAir = (p) => p[0] > 8 && p[0] < 14 && p[1] > 1 && p[1] < 7;
  const hp = await GA(() => [window.__app.current.player.position.x, window.__app.current.player.position.z]);
  const cp = await GB(() => [window.__app.current.player.position.x, window.__app.current.player.position.z]);
  d = await hostDebug();
  const shut = ['g-lever', 'g-bolt', 'g-pair', 'g-egress', 'g-key', 'g-flag', 'g-ladder'].every((id) => !d.gates[id]);
  assert(inAir(hp) && inAir(cp) && d.bay === 1, `both respawn in the airlock (host ${hp.map((v) => v.toFixed(1))}, client ${cp.map((v) => v.toFixed(1))})`);
  assert(shut, `the restart resets the bay's gates (${JSON.stringify(d.gates)})`);
  // the mains circuit is back on and the host's wall switch agrees (A15: label "Lights off", the next press cuts it)
  const swA = await GA(() => { const g = window.__app.current; const it = g.interactables.items.find((i) => i.id === 'switch-0'); return { on: g.stealth.switchOn(7), label: it.label, lamps: g.world.level.lights.lights.filter((l) => l.group === 7).every((l) => l.on) }; });
  const lampsB = await GB(() => window.__app.current.world.level.lights.lights.filter((l) => l.group === 7).every((l) => l.on));
  assert(swA.on && swA.label === 'Lights off' && swA.lamps && lampsB, `the restart restores the mains and its switch (host ${JSON.stringify(swA)}, client lamps on ${lampsB})`);

  console.log('gates: the client acts');
  await gates('B');

  console.log('friendly fire');
  // one strip cell (walls at x 34 and 38)
  await moveHost(34.8, 4, Math.PI / 2);
  await moveClient(37.2, 4, -Math.PI / 2);
  await wait(400);
  // the host's own bullets through the partner's hit volumes (PlayerWeapons.resolveHit: the real hit path)
  // (the partner's hit volumes follow its interpolated avatar: aim at the body volume, retry while it settles)
  const shoot = () => GA(() => {
    const g = window.__app.current;
    const r = g.net.remotes.values().next().value;
    const bn = g.net.partnerBoxes.get(r.id)['bodyNode'];
    const V = g.player.position.constructor;
    const from = new V(35.3, 1.2, 4);
    let last = null;
    for (let i = 0; i < 40 && r.alive; i++) {
      const to = new V(bn.position.x, bn.position.y + 0.2, bn.position.z);
      const dir = to.subtract(from).normalize();
      const h = g.ballistics.ray(from, to.add(dir.scale(0.5)), 169);
      last = { hit: h.hit, target: h.target?.id ?? null, at: [bn.position.x, bn.position.y, bn.position.z].map((v) => +v.toFixed(2)), feet: [r.feet.x, r.feet.y, r.feet.z].map((v) => +v.toFixed(2)) };
      if (!h.hit || h.target !== r) break;
      g.weapons.resolveHit(h, dir, h.distance, g.weapons.current, from);
    }
    return { down: !r.alive, last };
  });
  let shotRes = await shoot();
  for (let k = 0; k < 16 && !shotRes.down; k++) {
    await wait(300);
    shotRes = await shoot();
  }
  assert(shotRes.down === true, `a host shot downs the client (${JSON.stringify(shotRes)})`);
  await until(B, () => !window.__app.current.player.alive, null, 5000, 'client sees itself down');
  await until(A, (id) => window.__app.current.interactables.items.some((i) => i.id === `revive-${id}` && i.enabled), clientId, 5000, 'revive point on the client');
  await GA((id) => { const it = window.__app.current.interactables.items.find((i) => i.id === `revive-${id}`); it.onUse(it); }, clientId);
  await until(B, () => window.__app.current.player.alive, null, 5000, 'client revived');
  d = await hostDebug();
  assert(d.bay === 1 && (await GA(() => window.__app.current.player.alive)), 'the host revives the client (co-op rules: no restart, no frag)');

  // the client's grenade: its local blast goes to the host as `blast`, the host's explosion hurts the host only
  await wait(1500);
  for (let i = 0; i < 12 && (await GA(() => window.__app.current.player.alive)); i++) {
    await GB(() => {
      const g = window.__app.current;
      const V = g.player.position.constructor;
      g.explosions.explode(new V(35.1, 0.3, 4), 5, 150, 4, 'player', 'local');
    });
    await wait(1400);
  }
  assert(!(await GA(() => window.__app.current.player.alive)), 'a client grenade downs the host');
  assert(await GB(() => window.__app.current.player.alive), 'the thrower is not hurt by its own grenade');
  await until(B, (id) => window.__app.current.interactables.items.some((i) => i.id === `revive-${id}` && i.enabled), hostId, 5000, 'client sees the host revive point');
  await moveClient(35.8, 4, -Math.PI / 2);
  const rv = await use(B, `revive-${hostId}`);
  await until(A, () => window.__app.current.player.alive, null, 5000, 'host revived by the client');
  assert(rv === 'ok' && (await hostDebug()).bay === 1, 'the client revives the host (no restart)');

  console.log('course end (T1c): host-side client verbs, LANTERN on the client, finish, results, Start at bay 2');
  // a plain door the client opens is the client's door verb (ticked on the host from its `use`), not the host's
  const plainDoor = await GA(() => { const d = window.__app.current.world.doors.list.find((x) => Math.abs(x.cx - 54) < 0.6); return `door-${d.anchor.id}`; });
  const hostDoors0 = await GA(() => window.__course.log[0].filter((v) => v === 'door').length);
  await moveClient(53.3, 4);
  assert((await use(B, plainDoor)) === 'ok', 'the client opens the ladder cell door');
  await until(A, () => window.__course.log[1].includes('door'), null, 5000, 'client door tick on the host');
  assert((await GA(() => window.__course.log[0].filter((v) => v === 'door').length)) === hostDoors0, "the client's door ticks P2 on the host, not P1");
  // the end device refuses while L2's ladder drill is open
  await moveHost(56.6, 1.5);
  assert((await use(A, 'c-end')) === 'ok', 'the end device is live in the last bay');
  d = await hostDebug();
  assert(/ladder/.test(d.refusal) && !(await GA(() => window.__app.current.isEnded)), `the end refuses while the ladder drill is open ("${d.refusal}")`);
  // the restart reset the key: take it again, then the client climbs the ladder (a real traversal through the pad's Y)
  await moveClient(48.6, 1.5);
  assert((await use(B, 'c-sw-key')) === 'ok', 'the client takes the key again');
  const rln0 = await GB(() => window.__course.wire.rln ?? 0);
  let climbed = false;
  for (let i = 0; i < 3 && !climbed; i++) {
    await moveClient(57.0, 6.5, Math.PI / 2);
    await wait(400);
    await press(B, BTN.Y);
    try {
      await until(A, () => window.__course.log[1].includes('ladder'), null, 4000, 'client ladder tick');
      climbed = true;
    } catch {}
  }
  assert(climbed, 'the client climbs the ladder and the host ticks it');
  // LANTERN's radio reaches the client (the drillDone line, said on the host, mirrored through the course message)
  await until(B, (n) => (window.__course.wire.rln ?? 0) > n && !!window.__course.wire.rl && document.body.textContent.includes(window.__course.wire.rl), rln0, 8000, 'client says the LANTERN line');
  assert(true, `LANTERN's radio is said on the client ("${await GB(() => window.__course.wire.rl)}")`);
  assert((await use(A, 'c-end')) === 'ok', 'the host presses Finish');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => !!document.querySelector('.results-screen .course-panel'), null, 15000, `${tag} results with the course panel`);
  const panelB = await GB(() => document.querySelector('.results-screen .course-panel')?.textContent ?? '');
  assert(/L1/.test(panelB) && /L2/.test(panelB) && /Team moves/.test(panelB), `results show the course panel on both pages (client: "${panelB.slice(0, 80)}")`);
  // back to the lobby: the finished bays are offered
  await A.click('.results-screen .btn:has-text("Play again")');
  await until(A, () => !!document.querySelector('.lobby-screen') && window.__coop.session.phase === 'lobby', null, 15000, 'host back in the lobby');
  await until(B, () => !!document.querySelector('.lobby-screen'), null, 15000, 'client back in the lobby');
  const startRow = '.lobby-opts .row-choice:has-text("Start at")';
  for (let i = 0; i < 4 && !/Bay 2/.test((await A.textContent(`${startRow} .choice-val`).catch(() => '')) ?? ''); i++) {
    await A.click(`${startRow} .choice-arrow >> nth=1`).catch(() => {});
    await wait(200);
  }
  const startVal = await A.textContent(`${startRow} .choice-val`).catch(() => '');
  assert(/Bay 2/.test(startVal ?? '') && (await GA(() => window.__coop.session.courseBay)) === 2, `a second lobby offers "Start at bay 2" ("${startVal}")`);
  pumpOn = false;
  await GB(() => window.__coop.session.setReady(true));
  await until(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready again');
  await GA(() => window.__coop.session.startMatch());
  for (const P of [A, B]) await until(P, () => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && !window.__app.current.isEnded && !document.querySelector('.results-screen'), null, LOAD_MS, 'second course match on both pages');
  pumpOn = true;
  await until(A, () => !!window.__course?.state && window.__course.debug().bay === 1, null, 15000, 'host course at bay 2');
  const inA1 = (p) => p.x > 8 && p.x < 14 && p.z > 1 && p.z < 7;
  await until(A, () => { const p = window.__app.current.player.position; return p.x > 8 && p.x < 14 && p.z > 1 && p.z < 7; }, null, 8000, 'host in the A1 airlock');
  await until(B, () => { const p = window.__app.current.player.position; return p.x > 8 && p.x < 14 && p.z > 1 && p.z < 7; }, null, 8000, 'client in the A1 airlock');
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.feet.x > 8 && r.feet.x < 14 && r.feet.z > 1 && r.feet.z < 7), null, 8000, 'host sees the client in the A1 airlock');
  d = await hostDebug();
  const posB = await GB(() => { const p = window.__app.current.player.position; return { x: p.x, z: p.z }; });
  assert(d.bay === 1 && d.checkpoint === 'A1' && inA1(posB), `the bay-2 start puts both players at bay 2's entry airlock (client at ${posB.x.toFixed(1)}, ${posB.z.toFixed(1)})`);

  const errs = [...eA, ...eB].filter((e) => !/WebGL|GPU stall|swiftshader|Trystero|Nostr|ERR_|favicon/i.test(e));
  assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
} catch (e) {
  console.error(e);
  try {
    console.error('host', JSON.stringify(await hostDebug()));
    if (B) console.error('client', JSON.stringify(await GB(() => window.__course?.debug?.())));
  } catch {}
  failed = true;
}
clearInterval(pump);
pumpOn = false;

// T2: Fallow (the training bunker) boots from `?autostart=bunker&mode=course` solo (no net): Course mode runs in bay
// B1, the player stands on the Upper level's y 16 floor there and the page logs no errors.
if (!failed) {
  try {
    await A.close().catch(() => {});
    if (B) await B.close().catch(() => {});
    const { page: F, errors: eF } = await openPage(ctx, url, 'autostart=bunker&mode=course&legacy=1');
    await until(F, () => !!window.__app?.current?.player && !!window.__course?.state, null, LOAD_MS, 'Fallow course match');
    await wait(1500);
    const st = await F.evaluate(() => ({ mode: window.__app.current.opts?.mode, map: window.__app.current.opts?.map?.id, net: !!window.__app.current.net, bay: window.__course.debug().bay }));
    assert(st.map === 'bunker' && st.mode === 'course' && !st.net, `Fallow: the URL boots Course mode on the bunker, single player (${JSON.stringify(st)})`);
    assert(st.bay === 0, `Fallow: the course starts in bay B1 (bay index ${st.bay})`);
    const p = await F.evaluate(() => { const q = window.__app.current.player.position; return { x: q.x, y: q.y, z: q.z }; });
    assert(Math.abs(p.y - 16) < 0.3 && p.x > 0 && p.x < 20 && p.z > 60 && p.z < 74.4, `Fallow: the player spawns on the y 16 floor in B1 (${p.x.toFixed(1)}, ${p.y.toFixed(2)}, ${p.z.toFixed(1)})`);
    // (T4 fix) the nav grid keeps every level (seeded per bay): A5 -> S6 and B5's floor (the SR) -> A5 have paths.
    // Closed doors are walkable on the grid; (guard-ai S28) a locked shut door is shut on it, so this read of the
    // level's own connectivity unlocks the course doors for the query and locks them back in the same evaluate (no
    // frame runs between: the course's lock state is untouched).
    const navp = await F.evaluate(() => {
      const g = window.__app.current;
      const nav = g.nav;
      const doors = g.world.doors;
      const held = doors.list.filter((d) => d.anchor.locked);
      for (const d of held) doors.setLocked(d, false);
      const pt = (id) => g.world.layout.debugPoints.find((d) => d.id === id).pos;
      const path = (a, b) => { const p = pt(a); const q = pt(b); return !!nav && nav.findPath([p.x, p.z], [q.x, q.z], 200000, p.y, q.y) !== null; };
      const r = { a5s6: path('A5', 'S6'), b5a5: path('B5-SR', 'A5'), hasNav: !!nav, locked: held.length };
      for (const d of held) doors.setLocked(d, true);
      return r;
    });
    assert(navp.hasNav && navp.a5s6 && navp.b5a5, `Fallow: nav paths A5 -> S6 and B5 floor -> A5 exist (${JSON.stringify(navp)})`);
    const errs = eF.filter((e) => !/WebGL|GPU stall|swiftshader|Trystero|Nostr|ERR_|favicon/i.test(e));
    assert(errs.length === 0, `Fallow: no console errors (${errs.slice(0, 3).join(' | ')})`);
    await F.close();
  } catch (e) {
    console.error(e);
    failed = true;
  }
}

// The walk URL (`?net=local&autostart=<map>&mode=course`, two tabs): the first page hosts the map's fixed local room,
// the second joins it, and both reach the same course session with no clicks.
if (!failed) {
  try {
    const q = 'net=local&autostart=courselab&mode=course';
    const { page: H, errors: eH } = await openPage(ctx, url, q);
    await until(H, () => window.__coop?.session?.isHost === true, null, 20000, 'first walk tab hosts');
    // (F28, as e2e-ctcourse F7) the second tab joins as a client with no probe deadline (`&autojoin=1`): a busy host
    // page that answered the 1.5 s probe late made it host too, and the two hosts never started (the boot deadlock)
    const { page: C, errors: eC } = await openPage(ctx, url, `${q}&autojoin=1`);
    try {
      for (const [P, tag] of [[H, 'host'], [C, 'client']]) await until(P, () => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && window.__app.current.opts.map?.id === 'courselab', null, LOAD_MS, `${tag} walk tab in the course`);
    } catch (e) {
      // both tabs' sessions: two hosts is the deadlock; a client with no hostId never heard the host
      const s = (P) => P.evaluate(() => { const x = window.__coop?.session; return x ? { isHost: x.isHost, phase: x.phase, players: x.players.size, hostId: x.hostId } : null; }).catch((err) => String(err));
      console.log(`  (boot timeout: host tab ${JSON.stringify(await s(H))}, client tab ${JSON.stringify(await s(C))})`);
      throw e;
    }
    const h = await H.evaluate(() => ({ code: window.__coop.session.code, id: window.__coop.session.selfId, n: window.__coop.session.players.size }));
    const c = await C.evaluate(() => ({ code: window.__coop.session.code, host: window.__coop.session.hostId, role: window.__coop.session.role }));
    assert(h.code === c.code && c.host === h.id && c.role === 'client' && h.n === 2, `two walk-URL tabs share one course session (${JSON.stringify({ h, c })})`);
    const errs = [...eH, ...eC].filter((e) => !/WebGL|GPU stall|swiftshader|Trystero|Nostr|ERR_|favicon/i.test(e));
    assert(errs.length === 0, `walk URL: no console errors (${errs.slice(0, 3).join(' | ')})`);
    await C.close();
    await H.close();
  } catch (e) {
    console.error(e);
    failed = true;
  }
}
await browser.close();
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-course OK');
