// T5b: Fallow (the training bunker) in co-op. Two pages on the walk URL (`?net=local&autostart=bunker&mode=course`: the
// first hosts the map's fixed local room, the second joins with `&autojoin=1`, F28) start the course at B1. One section per bay; later steps
// (T8a / T8b) add their bays' sections here.
// B1: the objective list is on screen on both pages at spawn; every course prompt the host has (switches, levers,
// pickups, the whole bunker: more than the old 48-item cap, the client-prompt root cause) shows on the client; one player
// on the A1 pad shows "Waiting for partner" on both pages; both on it seal it (B1 has no drills yet, T7a: nothing to
// refuse); the rear door is shut and locked on both pages; the locked rear door blocks the client (a measured walk into
// it against a free walk of the same length); partners block each other (D49): the host walking into the standing client
// and the client walking into the standing host both stop short of him (traced: never closer than the two radii, never
// past him); a partner teleported across the other's standing spot does not move him (T5b2: no sweep between spots).
// Client use (was B2's lane lever; BAYS v2 B2 has no gate): the client takes card A (B6) through `use` and both pages
// see the reader doors it opens unlock.
import { launch, openPage, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const Y = 16; // the Upper level floor
let failed = false;

// (G13) polled from here: on a desktop context the in-page polling of waitForFunction does not run on the host page
// once it is in the background (the client page in front), so a condition that holds was never seen
async function until(page, fn, arg, timeout = 15000, what = 'condition') {
  const t0 = Date.now();
  for (;;) {
    if (await page.evaluate(`!!(${fn})(${JSON.stringify(arg) ?? 'undefined'})`).catch(() => false)) return;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

// (CT prototype B1) Fallow is parked behind ?legacy=1; this suite is in the LEGACY list
const Q = 'net=local&autostart=bunker&mode=course&legacy=1';
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
const walkOn = (P, yaw, secs) =>
  P.evaluate(([yaw, secs]) => {
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
const walkClient = (yaw, secs) => walkOn(B, yaw, secs);
const walkHost = (yaw, secs) => walkOn(A, yaw, secs);
const airText = (P) => P.evaluate(() => { const e = document.querySelector('.course-hud .ch-air'); return e && !e.hidden ? e.textContent : ''; });
const courseItems = (P) => P.evaluate(() => window.__app.current.interactables.items.filter((i) => i.id.startsWith('c-')).map((i) => ({ id: i.id, label: i.label, on: i.enabled })));

try {
  console.log('walk URL: host and client on Fallow');
  await until(A, () => window.__coop?.session?.isHost === true, null, 30000, 'first tab hosts');
  // (F28, as e2e-ctcourse F7) the second tab joins as a client with no probe deadline (`&autojoin=1`): a busy host page
  // that answered the 1.5 s probe late made it host too, and the two hosts never started (the boot deadlock)
  const opened = await openPage(ctx, url, `${Q}&autojoin=1`);
  B = opened.page;
  eB = opened.errors;
  try {
    for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && window.__app.current.opts.map?.id === 'bunker', null, 60000, `${tag} in the Fallow course`);
  } catch (e) {
    // both tabs' sessions: two hosts is the deadlock; a client with no hostId never heard the host
    const s = (P) => P.evaluate(() => { const x = window.__coop?.session; return x ? { isHost: x.isHost, phase: x.phase, players: x.players.size, hostId: x.hostId } : null; }).catch((err) => String(err));
    console.log(`  (boot timeout: host tab ${JSON.stringify(await s(A))}, client tab ${JSON.stringify(await s(B))})`);
    throw e;
  }
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
  const nearZ = await GA((n) => window.__app.current.world.doors.list[n].cz, near);
  await until(B, (f) => window.__course.wire.locks.includes(f), far, 5000, 'client sees the far door locked');
  // T5d (BAYS v2): A1 is x 1..7, z 54..60 (pad x 2..6, z 55..59); the near door in its north wall (z 60, x 3.4..4.6)
  await moveClient(4, 63);
  await moveHost(4, 57);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => /Waiting for partner/.test(document.querySelector('.course-hud .ch-air')?.textContent ?? '') && !document.querySelector('.course-hud .ch-air').hidden, null, 8000, `${tag} shows "Waiting for partner"`);
  assert((await hostDebug()).air.A1 === 'waiting', `one player on the A1 pad: both pages show "Waiting for partner" (client "${await airText(B)}")`);
  // both on it: B1 has no drills yet (T7a), so nothing is open and it cycles by itself
  await moveClient(4, 58.5);
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
  // the host steps clear of both walk lines first: he stood at (4, 57), the rear walk's start, and the client page's
  // partner body (PartnerBlocker, D49; before T5b2 the partner hit boxes) blocks the client's body there, so the client
  // teleported into the host and was pinned (x 27.0 -> 27.25 in failed runs, camera and stick correct)
  await moveHost(2.2, 55);
  // control: the same walk along the airlock (+z, clear floor from the south wall) covers more than 3 m
  await moveClient(4, 54.7);
  const c0 = await walkClient(0, 2.8);
  const free = Math.hypot(c0[0] - 4, c0[1] - 54.7);
  // into the shut, locked rear door (+z, the north wall) from 3 m inside the airlock
  const z0 = nearZ - 3;
  await moveClient(4, z0);
  const c1 = await walkClient(0, 2.8);
  assert(free >= 3, `control: the client walks ${free.toFixed(2)} m freely in the same time`);
  const blocked = c1[1] > nearZ - 0.8 && c1[1] < nearZ - 0.1 && Math.abs(c1[0] - 4) < 0.6;
  if (!blocked) console.error('walk trace [x, z, camYaw, yaw, speed, wishX, wishZ, override, padY]', JSON.stringify(await GB(() => window.__walkTrace)));
  assert(blocked, `the locked rear door blocks the client: he walks up to it and stays on the airlock side (z ${z0.toFixed(1)} -> ${c1[1].toFixed(2)}, x ${c1[0].toFixed(2)}; door at z ${nearZ.toFixed(1)})`);

  console.log('B1: partners block each other (D49)');
  // in the sealed airlock (clear floor along x 4, the control walk above): one stands 2.3 m ahead on the walk line, the
  // other walks dead-centre into him for 2.8 s; a control walk with the partner off the line covers more than 2.3 m.
  // Sliding round a round capsule on contact is accepted physics (REVIEW-NOTES), so the check bounds it from the trace:
  // the walker never comes closer than the two radii (less a tolerance) and never ends past the partner
  const lineZ = 54.7;
  const standZ = 57;
  const WALK_R = 0.3; // MOVEMENT.radius, the local player's controller capsule
  /** The walker's page: the partner's shown feet, whether its blocker is solid, and its radius. */
  const partnerOn = (P) =>
    P.evaluate(() => {
      const n = window.__app.current.net;
      const e = n.remotes ? [...n.remotes.values()].map((r) => ({ a: r.avatar, b: r.blocker }))[0] : n.blockers.map((x) => ({ a: x.a, b: x.b }))[0];
      return { x: e.a.pos.x, z: e.a.pos.z, blocking: e.b.blocking, r: e.b.radius };
    });
  /** Waits until the walker's page shows the partner standing at (x, z), solid, and still there 300 ms later. */
  const settled = async (P, tag, x, z) => {
    const ok = ([x, z]) => {
      const n = window.__app.current.net;
      const e = n.remotes ? [...n.remotes.values()].map((r) => ({ a: r.avatar, b: r.blocker }))[0] : n.blockers.map((q) => ({ a: q.a, b: q.b }))[0];
      return !!e && e.b.blocking && Math.hypot(e.a.pos.x - x, e.a.pos.z - z) < 0.1;
    };
    await until(P, ok, [x, z], 15000, `the ${tag} page shows the partner settled at ${x}, ${z}`);
    await wait(300);
    await until(P, ok, [x, z], 3000, `the ${tag} page still shows the partner at ${x}, ${z}`);
  };
  const walkInto = async (tag, place, placePartner, walk) => {
    const P = tag === 'host' ? A : B;
    await placePartner(2.2, 55);
    await place(4, lineZ);
    const f = await walk(0, 2.8);
    const freeW = Math.hypot(f[0] - 4, f[1] - lineZ);
    await placePartner(4, standZ);
    await settled(P, tag, 4, standZ);
    // dead-centre: the walker starts on the line through the partner's shown feet
    const pt = await partnerOn(P);
    await place(pt.x, lineZ);
    await settled(P, tag, 4, standZ);
    const w = await walk(0, 2.8);
    const tr = await P.evaluate(() => window.__walkTrace);
    let near = Infinity;
    for (const q of tr) near = Math.min(near, Math.hypot(q[0] - pt.x, q[1] - pt.z));
    near = Math.min(near, Math.hypot(w[0] - pt.x, w[1] - pt.z));
    const minGap = WALK_R + pt.r - 0.08;
    const ok = near >= minGap && w[1] < pt.z;
    if (!ok) console.error(`${tag} walk trace`, JSON.stringify(tr));
    assert(freeW >= 2.6, `control: the ${tag} walks ${freeW.toFixed(2)} m freely along the line`);
    assert(ok, `the ${tag} walking into his standing partner is blocked: closest ${near.toFixed(2)} m (limit ${minGap.toFixed(2)}), ends at (${w[0].toFixed(2)}, ${w[1].toFixed(2)}) short of the partner at z ${pt.z.toFixed(2)}`);
  };
  /**
   * A teleported partner appears at the new spot: its shown body and blocker never sweep through the points between
   * (interp snap and the blocker's jump park, T5b2), so the walker standing on that line is not moved.
   */
  const teleportPast = async (tag, place, placePartner) => {
    const P = tag === 'host' ? A : B;
    await placePartner(4, 54.6);
    await place(4, 55.9);
    await settled(P, tag, 4, 54.6);
    const s0 = await P.evaluate(() => { const p = window.__app.current.player.position; return [p.x, p.z]; });
    let moved = 0;
    const watch = (async () => {
      const t0 = Date.now();
      while (Date.now() - t0 < 2500) {
        const p = await P.evaluate(() => { const p = window.__app.current.player.position; return [p.x, p.z]; });
        moved = Math.max(moved, Math.hypot(p[0] - s0[0], p[1] - s0[1]));
        await wait(30);
      }
    })();
    // grow the walker page's partner buffer for the replay so it always still holds the old spot however long the
    // new spot takes to settle (40 states is under 3 s of sends); trimmed back after the replay
    const avatarOf = () => {
      const n = window.__app.current.net;
      const e = n.remotes ? [...n.remotes.values()].map((r) => ({ a: r.avatar, b: r.blocker }))[0] : n.blockers[0];
      return e.a ?? e.avatar;
    };
    await P.evaluate(`{ const b = (${avatarOf})().buf; window.__capWas = b.cap; b.cap = 100000; }`);
    await placePartner(4, 57.3);
    await settled(P, tag, 4, 57.3);
    // replay the walker page's buffered partner states at 60 fps through the real avatar and blocker (the live page
    // samples too few frames in software GL to catch a 50 ms sweep): solid and where at each frame
    const log = await P.evaluate(() => {
      const n = window.__app.current.net;
      const e = n.remotes ? [...n.remotes.values()].map((r) => ({ a: r.avatar, b: r.blocker }))[0] : n.blockers[0];
      const a = e.a ?? e.avatar;
      const t0 = a.buf.buf[0].t;
      const t1 = a.buf.latestTime();
      const out = [];
      a.update(0, t0);
      e.b.sync(a.pos, false, true);
      for (let t = t0; t <= t1 + 1e-6; t += 1 / 60) {
        a.update(1 / 60, t);
        e.b.sync(a.pos, false, true);
        out.push([+a.pos.z.toFixed(2), e.b.blocking]);
      }
      a.buf.cap = window.__capWas;
      if (a.buf.buf.length > a.buf.cap) a.buf.buf.splice(0, a.buf.buf.length - a.buf.cap);
      return out;
    });
    await watch;
    // from the last frame the partner shows at the old spot (earlier buffered moves are not the teleport)
    let from = -1;
    for (let i = 0; i < log.length; i++) if (Math.abs(log[i][0] - 54.6) < 0.15) from = i;
    const after = from < 0 ? [] : log.slice(from);
    const between = after.filter(([z, solid]) => solid && z > 54.9 && z < 57.0);
    const spans = after.some(([z]) => z > 57.1);
    if (between.length || !spans) console.error(`${tag} blocker log [z, solid]`, JSON.stringify(after.length ? after : log));
    assert(spans && between.length === 0, `the partner teleported across the ${tag}'s spot is never solid between the two spots on the ${tag}'s page (${log.length} frames replayed from the old spot to the new: ${spans}, ${between.length} between)`);
    assert(moved < 0.05, `the partner teleported across the ${tag}'s spot (z 54.6 -> 57.3, ${tag} at z 55.9) does not move him (moved ${moved.toFixed(3)} m)`);
  };
  await teleportPast('host', moveHost, moveClient);
  await teleportPast('client', moveClient, moveHost);
  await walkInto('host', moveHost, moveClient, walkHost);
  await walkInto('client', moveClient, moveHost, walkClient);
  // the blocked walker was not pushed through anything: still on the airlock floor
  const hy = await GA(() => window.__app.current.player.position.y);
  assert(Math.abs(hy - Y) < 0.3, `the host stays on the airlock floor after the contact (y ${hy.toFixed(2)})`);
  await moveHost(2.2, 55);

  console.log('Client use: the client takes card A (B6) through `use`');
  const lever = iA.find((i) => /pk-card-a/.test(i.id))?.id;
  assert(!!lever, `the course has a card A prompt (${lever})`);
  const lp = await GA((id) => { const it = window.__app.current.interactables.items.find((i) => i.id === id); return [it.pos.x, it.pos.z, it.node.rotation.y, it.pos.y]; }, lever);
  const gate = (await GA(() => Object.keys(window.__course.debug().gates))).filter((g) => /^g-(card-a-\d|rd[12])$/.test(g));
  const g0 = await hostDebug();
  // stand in front of the lever (its face is along its yaw), within reach
  let ok = false;
  for (const [dx, dz] of [[Math.sin(lp[2]), Math.cos(lp[2])], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
    // the card stands on the Plant level (B6, y 6): stand on its floor
    await moveClient(lp[0] + dx * 0.8, lp[1] + dz * 0.8, 0, Math.round(lp[3]));
    if ((await use(B, lever)) !== 'ok') continue;
    try {
      await until(A, (gs) => gs.some((g) => window.__course.debug().gates[g]), gate, 3000, 'a reader gate opens');
      ok = true;
      break;
    } catch {}
  }
  await until(A, (gs) => gs.every((g) => window.__course.debug().gates[g]), gate, 3000, 'every card A gate open').catch(() => {});
  const g1 = await hostDebug();
  const openedG = gate.filter((g) => g1.gates[g] && !g0.gates[g]);
  assert(ok && openedG.includes('g-rd1') && openedG.includes('g-rd2'), `the client's card A opens both reader doors on the host (${openedG})`);
  for (const id of ['B6-rd1', 'B6-rd2']) {
    const rd = await doorIndex(id);
    await until(B, (i) => !window.__course.wire.locks.includes(i), rd, 3000, `client sees ${id} unlock`);
  }
  assert(true, 'the client sees both reader doors unlock');

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
