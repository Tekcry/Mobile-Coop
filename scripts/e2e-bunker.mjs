// T5b: Fallow (the training bunker) in co-op. Two pages on the walk URL (`?net=local&autostart=bunker&mode=course`: the
// first hosts the map's fixed local room, the second joins) start the course at B1. One section per bay; later steps
// (T8a / T8b) add their bays' sections here.
// B1: the objective list is on screen on both pages at spawn; every course prompt the host has (switches, levers,
// pickups, the whole bunker: more than the old 48-item cap, the client-prompt root cause) shows on the client; one player
// on the A1 pad shows "Waiting for partner" on both pages; both on it seal it (B1 has no drills yet, T7a: nothing to
// refuse); the rear door is shut and locked on both pages; the locked rear door blocks the client (a measured walk into
// it against a free walk of the same length).
// B2: the client pulls a lane lever through `use` and both pages see its doors unlock.
import { launch, openPage, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const Y = 16; // the Upper level floor
let failed = false;

async function until(page, fn, arg, timeout = 15000, what = 'condition') {
  try {
    await page.waitForFunction(fn, arg, { timeout, polling: 50 });
  } catch {
    throw new Error(`timed out waiting for ${what}`);
  }
}

const Q = 'net=local&autostart=bunker&mode=course';
const { browser, ctx, page: A, errors: eA } = await launch({ url, params: Q });
let B = null;
let eB = [];
const GA = (f, a) => A.evaluate(f, a);
const GB = (f, a) => B.evaluate(f, a);

// The host page is in the background once the client page opens: a pump steps its sim headless in real time whenever
// its own rAF did not run since the last pump (as e2e-course).
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

const use = (P, id) =>
  P.evaluate((id) => {
    const it = window.__app.current.interactables?.items.find((i) => i.id === id);
    if (!it) return 'missing';
    if (!it.enabled) return 'disabled';
    it.onUse(it);
    return 'ok';
  }, id);
const hostDebug = () => GA(() => window.__course.debug());
async function moveHost(x, z, yaw = 0, y = Y) {
  await GA(([x, y, z, yaw]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, y + 0.1, z), yaw); }, [x, y, z, yaw]);
  await until(A, ([x, z]) => { const f = window.__course.state.feet; return Math.hypot(f[0] - x, f[2] - z) < 0.4; }, [x, z], 15000, `course sees the host at ${x}, ${z}`);
}
async function moveClient(x, z, yaw = 0, y = Y) {
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
  await GB(([x, y, z, yaw]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, y + 0.1, z), yaw); }, [x, y, z, yaw]);
  await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; const f = window.__course.state.feet; return Math.hypot(r.feet.x - x, r.feet.z - z) < 0.4 && Math.hypot(f[3] - x, f[5] - z) < 0.4; }, [x, z], 15000, `host sees the client at ${x}, ${z}`);
}
/** Door index (`Doors.list`) of a course door id. */
const doorIndex = (cid) => GA((cid) => { const g = window.__app.current; const aid = g.world.layout.course.doors[cid]; return g.world.doors.list.find((d) => d.anchor.id === aid).index; }, cid);
/**
 * The client walks for `secs` simulated seconds with the stick full forward and the camera yawed to `yaw` (the stick is
 * camera-relative: set the camera, not only the body), stepped headless on its own page. Returns the feet [x, z].
 */
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
const airText = (P) => P.evaluate(() => { const e = document.querySelector('.course-hud .ch-air'); return e && !e.hidden ? e.textContent : ''; });
const courseItems = (P) => P.evaluate(() => window.__app.current.interactables.items.filter((i) => i.id.startsWith('c-')).map((i) => ({ id: i.id, label: i.label, on: i.enabled })));

try {
  console.log('walk URL: host and client on Fallow');
  await until(A, () => window.__coop?.session?.isHost === true, null, 30000, 'first tab hosts');
  const opened = await openPage(ctx, url, Q);
  B = opened.page;
  eB = opened.errors;
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && window.__app.current.opts.map?.id === 'bunker', null, 60000, `${tag} in the Fallow course`);
  pumpOn = true;
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state) && !!window.__course?.state, null, 20000, 'host course running');
  await until(B, () => !!window.__course?.wire, null, 30000, 'client has the course state');
  assert((await hostDebug()).bay === 0, 'the course starts at B1');

  console.log('B1: objective list at spawn (R5)');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => { const el = document.querySelector('.course-hud'); return !!el && !el.hidden && el.offsetParent !== null && /B1 - objectives/.test(el.querySelector('.ch-bay')?.textContent ?? '') && !!document.querySelector('.course-hud tr[data-obj="exit"]'); }, null, 10000, `${tag} objective list at spawn`);
  }
  assert(true, 'the objective list shows on both pages at spawn (B1, its airlock row)');

  console.log('B1: every course prompt shows on the client (D48, MAX_ITEMS)');
  await until(B, () => window.__app.current.interactables.items.some((i) => i.id.startsWith('c-')), null, 10000, 'client has course items');
  await wait(600);
  const total = await GA(() => window.__app.current.interactables.items.length);
  const iA = await courseItems(A);
  const iB = await courseItems(B);
  const byB = new Map(iB.map((i) => [i.id, i]));
  const missing = iA.filter((i) => !byB.has(i.id)).map((i) => i.id);
  const wrong = iA.filter((i) => byB.has(i.id) && (byB.get(i.id).label !== i.label || byB.get(i.id).on !== i.on)).map((i) => i.id);
  assert(total > 48 && iA.length > 10, `the host has ${total} items (${iA.length} course prompts): past the old 48-item cap`);
  assert(missing.length === 0 && wrong.length === 0 && iB.length === iA.length, `every course prompt shows on the client with its label and state (missing ${missing.slice(0, 5)}, differing ${wrong.slice(0, 5)})`);
  assert(!iA.some((i) => /cycle/i.test(i.label)) && !iB.some((i) => /cycle/i.test(i.label)), 'no airlock Cycle button on either page');

  console.log('B1: the A1 pad (R6)');
  const near = await doorIndex('A1-near');
  const far = await doorIndex('A1-far');
  const nearX = await GA((n) => window.__app.current.world.doors.list[n].cx, near);
  await until(B, (f) => window.__course.wire.locks.includes(f), far, 5000, 'client sees the far door locked');
  await moveClient(12, 84);
  await moveHost(27, 84);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => /Waiting for partner/.test(document.querySelector('.course-hud .ch-air')?.textContent ?? '') && !document.querySelector('.course-hud .ch-air').hidden, null, 8000, `${tag} shows "Waiting for partner"`);
  assert((await hostDebug()).air.A1 === 'waiting', `one player on the A1 pad: both pages show "Waiting for partner" (client "${await airText(B)}")`);
  // both on it: B1 has no drills yet (T7a), so nothing is open and it cycles by itself
  await moveClient(27, 85.5);
  await until(A, () => /^(cycling|sealed)$/.test(window.__course.debug().air.A1), null, 5000, 'A1 cycling by itself');
  await GA(() => window.__app.loop.stepHeadless(4.5));
  await until(A, () => window.__course.debug().bay === 1, null, 9000, 'A1 sealed, bay B2');
  assert((await hostDebug()).checkpoint === 'A1', 'both on the pad seal A1 (bay B2 starts)');
  await until(B, (n) => { const x = window.__app.current.world.doors.list[n]; return window.__course.wire.s.bay === 1 && x.target === 0 && x.open === 0 && !!x.body && x.anchor.locked; }, near, 5000, 'client: the rear door shut, body back, locked');
  const doorOn = (P, n) => P.evaluate((n) => { const x = window.__app.current.world.doors.list[n]; return { target: x.target, open: +x.open.toFixed(2), body: !!x.body, locked: !!x.anchor.locked }; }, n);
  const nA = await doorOn(A, near);
  const nB = await doorOn(B, near);
  const fA = await doorOn(A, far);
  assert(nA.target === 0 && nA.open === 0 && nA.body && nA.locked && nB.target === 0 && nB.body && nB.locked, `the rear door is shut and locked on both pages (host ${JSON.stringify(nA)}, client ${JSON.stringify(nB)})`);
  assert(fA.target === 1 && !fA.locked, `the front door opens when the cycle ends (${JSON.stringify(fA)})`);

  console.log('B1: a locked door blocks the client');
  // the host steps clear of both walk lines first: he stood at (27, 84), the rear walk's start, and the client page's
  // hit boxes of its partner (PvpTarget, course friendly fire D38) block the client's body there, so the client
  // teleported into the host and was pinned (x 27.0 -> 27.25 in failed runs, camera and stick correct)
  await moveHost(25.2, 82);
  // control: the same walk along the airlock (+z, clear floor) covers more than the 3 m to the door
  await moveClient(27, 81.7);
  const c0 = await walkClient(0, 2.8);
  const free = Math.hypot(c0[0] - 27, c0[1] - 81.7);
  // into the shut, locked rear door (-x) from 3 m inside the airlock
  const x0 = nearX + 3;
  await moveClient(x0, 84);
  const c1 = await walkClient(-Math.PI / 2, 2.8);
  assert(free >= 3, `control: the client walks ${free.toFixed(2)} m freely in the same time`);
  const blocked = c1[0] < nearX + 0.8 && c1[0] > nearX + 0.1 && Math.abs(c1[1] - 84) < 0.6;
  if (!blocked) console.error('walk trace [x, z, camYaw, yaw, speed, wishX, wishZ, override, padY]', JSON.stringify(await GB(() => window.__walkTrace)));
  assert(c1[0] < nearX + 0.8 && c1[0] > nearX + 0.1 && Math.abs(c1[1] - 84) < 0.6, `the locked rear door blocks the client: he walks up to it and stays on the airlock side (x ${x0.toFixed(1)} -> ${c1[0].toFixed(2)}, z ${c1[1].toFixed(2)}; door at x ${nearX.toFixed(1)})`);

  console.log('B2: the client pulls a lane lever through `use`');
  const lever = iA.find((i) => /lever/.test(i.id))?.id;
  assert(!!lever, `B2 has a lever prompt (${lever})`);
  const lp = await GA((id) => { const it = window.__app.current.interactables.items.find((i) => i.id === id); return [it.pos.x, it.pos.z, it.node.rotation.y]; }, lever);
  const gate = (await GA(() => Object.keys(window.__course.debug().gates))).filter((g) => /^g-(lane|exit)-/.test(g));
  const g0 = await hostDebug();
  // stand in front of the lever (its face is along its yaw), within reach
  let ok = false;
  for (const [dx, dz] of [[Math.sin(lp[2]), Math.cos(lp[2])], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
    await moveClient(lp[0] + dx * 0.8, lp[1] + dz * 0.8);
    if ((await use(B, lever)) !== 'ok') continue;
    try {
      await until(A, (gs) => gs.some((g) => window.__course.debug().gates[g]), gate, 3000, 'a lane gate opens');
      ok = true;
      break;
    } catch {}
  }
  const g1 = await hostDebug();
  const openedG = gate.filter((g) => g1.gates[g] && !g0.gates[g]);
  assert(ok && openedG.length === 2, `the client's lever opens its lane and walkway doors on the host (${openedG})`);
  const laneDoor = await doorIndex(openedG[0] === 'g-lane-n' || openedG[0] === 'g-exit-n' ? 'B2-lane-n' : 'B2-lane-s');
  await until(B, (i) => !window.__course.wire.locks.includes(i), laneDoor, 3000, 'client sees the lane door unlock');
  assert(true, 'the client sees the lane door unlock');

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
await browser.close();
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-bunker OK');
