// T1b: the training course in co-op. Two pages over ?net=local (the host and one client) start Course mode on the
// courselab debug map from the lobby: the airlock refuses one player (the client sees its own refusal), cycles with both
// and the near door stays locked; every gate kind (lever, bolt, hold, timed hold, pair, egress, mains, pickup / flag,
// anchor lock) opens when the host acts and, after a forced both-down restart (both respawn in the airlock, the bay's
// gates reset), when the client acts; the client sees door locks and the lamp group change within 0.5 s; friendly
// fire (D38): a host shot and a client grenade down the partner, who is revived (co-op rules: no frag, no restart).
import { launch, openPage, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;

async function until(page, fn, arg, timeout = 15000, what = 'condition') {
  try {
    await page.waitForFunction(fn, arg, { timeout, polling: 50 });
  } catch {
    throw new Error(`timed out waiting for ${what}`);
  }
}

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
    it.onUse(it);
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
/** Time (ms) from `t0` until the client's course state satisfies `fn`. */
async function clientWithin(t0, fn, arg, what) {
  await until(B, fn, arg, 5000, what);
  return Date.now() - t0;
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
  await B.click('.main-menu .btn:has-text("Co-op")');
  await B.click('.btn:has-text("Join with code")');
  await B.keyboard.type(code.toLowerCase());
  await B.keyboard.press('Enter');
  await until(A, () => window.__coop.session.players.size === 2, null, 15000, 'host sees client');
  await GA(() => window.__coop.session.setSettings('course', 'courselab', 'normal', ''));
  await GB(() => window.__coop.session.setReady(true));
  await until(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready');
  await GA(() => window.__coop.session.startMatch());
  for (const P of [A, B]) await until(P, () => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && !window.__app.current.isEnded, null, 40000, 'course match on both pages');
  pumpOn = true;
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state) && !!window.__course?.state, null, 15000, 'host course running');
  await until(B, () => !!window.__course?.wire, null, 8000, 'client has the course state');
  const hostId = await GA(() => window.__coop.session.selfId);
  const clientId = await GB(() => window.__coop.session.selfId);
  assert((await GA(() => window.__app.current.net.score)) === null, 'course mode is co-op (no PvP score)');

  console.log('airlock');
  const near = await doorIndex('A1-near');
  const far = await doorIndex('A1-far');
  await until(B, (far) => window.__course.wire.locks.includes(far), far, 5000, 'client sees the far door locked');
  assert(true, 'the far airlock door starts locked on the client');
  await moveHost(11, 2.4);
  const r1 = await use(A, 'c-A1');
  let d = await hostDebug();
  assert(r1 === 'ok' && /partner/i.test(d.refusal) && d.air.A1 !== 'cycling', `the airlock refuses one player (${r1}: "${d.refusal}", ${d.air.A1})`);
  await moveHost(3, 3.4);
  await moveClient(11, 2.4);
  const rn0 = await GB(() => window.__course.wire.rn);
  const r2 = await use(B, 'c-A1');
  await until(B, (n) => window.__course.wire.rn > n && /partner/i.test(window.__course.wire.ref), rn0, 5000, 'client refusal');
  const banner = await GB(() => document.body.innerText.includes(window.__course.wire.ref));
  assert(r2 === 'ok' && banner, `the client's own refusal is shown on the client ("${await GB(() => window.__course.wire.ref)}")`);
  await moveHost(11.6, 3.2);
  const r3 = await use(B, 'c-A1');
  await until(A, () => window.__course.debug().air.A1 === 'cycling', null, 3000, 'airlock cycling');
  // the cycle's simulated seconds, at once (nobody moves meanwhile)
  await GA(() => window.__app.loop.stepHeadless(4.5));
  await until(A, () => window.__course.debug().bay === 1, null, 9000, 'airlock sealed, bay L2');
  await until(B, ([n, f]) => window.__course.wire.locks.includes(n) && !window.__course.wire.locks.includes(f) && window.__course.wire.s.bay === 1, [near, far], 5000, 'client sees the near door locked');
  d = await hostDebug();
  assert(r3 === 'ok' && d.checkpoint === 'A1', `cycles with both inside (client pressed), the near door stays locked, the far door opens`);

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
    let t0 = Date.now();
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
    await Promise.all([use(P, 'c-sw-pa'), use(O, 'c-sw-pb')]);
    await until(A, () => window.__course.debug().gates['g-pair'], null, 3000, 'pair open');
    assert(true, `${tag}: pair gate opens with both halves`);
    // egress
    await move(40.6, 1.5);
    await use(P, 'c-sw-egress');
    assert(await gateOpen('g-egress'), `${tag}: egress opens`);
    // mains: the wall switch cuts lamp group 7; the client sees the group change within 0.5 s
    await move(44.6, 1.5);
    // one press (after a restart too: the restart syncs the wall switch with the restored circuit, A15)
    t0 = Date.now();
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

  console.log('gates: the host acts');
  await gates('A');

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
    const bn = g.net.pvpBoxes.get(r.id)['bodyNode'];
    const V = g.player.position.constructor;
    const from = new V(35.3, 1.2, 4);
    let last = null;
    for (let i = 0; i < 40 && r.alive; i++) {
      const to = new V(bn.position.x, bn.position.y + 0.2, bn.position.z);
      const dir = to.subtract(from).normalize();
      const h = g.ballistics.ray(from, to.add(dir.scale(0.5)), 169);
      last = { hit: h.hit, target: h.target?.id ?? null, at: [bn.position.x, bn.position.y, bn.position.z].map((v) => +v.toFixed(2)), feet: [r.feet.x, r.feet.y, r.feet.z].map((v) => +v.toFixed(2)) };
      if (!h.hit || h.target !== r) break;
      g.weapons.resolveHit(h, dir, h.distance, g.weapons.current);
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
await browser.close();
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-course OK');
