// e2e-coop-real part 1 (coop-real C1, brief docs/coop-real/briefs/C1.md): Marlow Yard A1, scripted, input only.
// P7 (one suppressed round, both directions), P6a / P6b (the team takedown by the partner of the one who holds), the
// checker's body (pick up / drop by the client). Host = keyboard + mouse (page A), client = pad (page B). Every action
// is a lib device helper; every read goes through `L.read` / `L.until` and the sweep readers.
import * as L from './lib.mjs';
import * as S from './sweep.mjs';

export const NAME = 'A1 scripted: P7 audio, P6a / P6b team takedowns, body';
export const BOOT = {};

const MS = L.PROMPT_S * 1000;
const LOUNGE_DOOR = [6, 11];
const CABIN_DOOR = [8.6, 15.0];
/** A wait that ends in an assert: true when it held in time. */
const ok = (p) => p.then(() => true, () => false);
const T0 = Date.now();

async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    console.log(`  [${name}] done ${((Date.now() - t) / 1000).toFixed(1)} s (part ${((Date.now() - T0) / 1000).toFixed(1)} s)`);
  } catch (e) {
    L.fail(`${name}: ${String(e?.message ?? e).split('\n')[0]}`);
  }
}
const hashes = (h) => Promise.all([S.hashState(h.A), S.hashState(h.B)]);
async function diffNote(h, [a0, b0]) {
  const [a1, b1] = await hashes(h);
  return `host keys ${JSON.stringify(S.diffKeys(a0, a1))}, client keys ${JSON.stringify(S.diffKeys(b0, b1))}`;
}

// ------------------------------------------------------------------------------------------ page functions (read only)

function pgDoor(c) {
  const g = window.__app.current;
  const d = g.world.doors.list.find((q) => Math.hypot(q.cx - c[0], q.cz - c[1]) < 0.2);
  return d ? { i: d.index, target: d.target, locked: d.anchor.locked } : null;
}
function pgDoorTarget(a) {
  const g = window.__app.current;
  return g.world.doors.list[a[0]].target === a[1];
}
function pgAimedIn() {
  const g = window.__app.current;
  return { phase: g.weapons.drawPhase, ads: g.player.cam.ads, gun: g.weapons.current.def.id };
}
function pgAimedInOk() {
  const g = window.__app.current;
  return g.weapons.drawPhase === 2 && g.player.cam.ads >= 0.9;
}
function pgChecker() {
  const g = window.__app.current;
  const e = g.enemyMgr.enemies.find((x) => x.alive && !x.ko && !x.taken && Math.hypot(x.pos.x - 9.0, x.pos.z - 16.5) < 0.6);
  return e ? e.id : null;
}
function pgPuppetAlive(id) {
  const g = window.__app.current;
  const p = g.net.puppets.get(id);
  return !!p && p.alive;
}
function pgInLounge() {
  const g = window.__app.current;
  const p = g.player.position;
  return g.player.alive && p.x > 0.3 && p.x < 5.7 && p.z > 8.3 && p.z < 13.7;
}
function pgHolding(id) {
  const g = window.__app.current;
  const td = g.takedown;
  return td.menuReady && !!td.hostage && td.hostage.id === id;
}
function pgPartnerHeld(id) {
  const g = window.__app.current;
  const p = g.net.puppets.get(id);
  return !!p && p.partnerHeld;
}
function pgHostSeesHold(id) {
  const g = window.__app.current;
  const e = g.enemyMgr.enemies.find((x) => x.id === id);
  return !!e && g.net.partnerHolds(e);
}
function pgGuardDown(id) {
  const g = window.__app.current;
  const e = g.enemyMgr.enemies.find((x) => x.id === id);
  return !e || e.ko || !e.alive;
}
function pgEnemyPos(id) {
  const g = window.__app.current;
  const e = g.enemyMgr.enemies.find((x) => x.id === id);
  return e ? [e.pos.x, e.pos.z] : null;
}
function pgBody(id) {
  const g = window.__app.current;
  const b = g.enemyMgr.bodies.find((x) => x.enemyId === id);
  return b ? { x: b.pos.x, z: b.pos.z, present: b.present, carried: b.carried, hidden: b.hidden } : null;
}
function pgBodyPresent(id) {
  const g = window.__app.current;
  const b = g.enemyMgr.bodies.find((x) => x.enemyId === id);
  return !!b && b.present;
}
function pgBodyCarried(a) {
  const g = window.__app.current;
  const b = g.enemyMgr.bodies.find((x) => x.enemyId === a[0]);
  return !!b && b.carried === a[1];
}
function pgBodyItem() {
  const g = window.__app.current;
  const it = g.interactables.items.find((i) => i.id.startsWith('body-') && i.enabled);
  return it ? [it.pos.x, it.pos.z] : null;
}
function pgCarrying() {
  const g = window.__app.current;
  return !!g.carrier && g.carrier.carrying && !g.carrier.busy;
}
function pgHasRemote(n) {
  return (window.__tap?.au ?? []).slice(n).some((e) => e.k === 'remote');
}

// ------------------------------------------------------------------------------------------------------ node helpers

/** Open the door whose centre is `c` by input, unless the host has it open already; returns its index. */
async function openDoor(h, P, who, c, tag) {
  const d = await L.read(h.A, pgDoor, c);
  L.assert(!!d, `${tag}: the door at (${c}) exists on the host`);
  if (d.target === 1) return d.i;
  await L.aimAt(P, who, [c[0], 1.2, c[1]], { tol: 0.05, maxS: 4 });
  await L.pickRow(P, who, /^Open door$/);
  const got = await ok(L.until(h.A, pgDoorTarget, [d.i, 1], MS, `${tag}: the door opens on the host`));
  L.assert(got, `${tag}: the ${P === h.A ? 'host' : 'client'}'s Open door row opens the door at (${c}) on the host within ${L.PROMPT_S} s`);
  return d.i;
}

async function waitChecker(h, tag) {
  await L.until(h.A, pgChecker, null, 10000, `${tag}: a live checker at his desk on the host`);
  const id = await L.read(h.A, pgChecker);
  await L.until(h.B, pgPuppetAlive, id, 10000, `${tag}: the client has the checker's puppet`);
  return id;
}

async function restart(h, tag) {
  await L.pauseRestart(h.A, 'kbm');
  await L.until(h.A, pgInLounge, null, 10000, `${tag}: the host is back in the lounge`);
  await L.until(h.B, pgInLounge, null, 15000, `${tag}: the client is back in the lounge`);
  const id = await waitChecker(h, tag);
  await L.waitHostSim(h.A, 1500);
  await S.installTaps(h.A);
  await S.installTaps(h.B);
  return id;
}

async function hostToCabin(h, tag) {
  await L.walkTo(h.A, 'kbm', [4.8, 10.6], { tol: 0.3, maxS: 10 });
  await openDoor(h, h.A, 'kbm', LOUNGE_DOOR, tag);
  await L.walkPath(h.A, 'kbm', [[7.2, 11.6], [8.6, 13.9]], { via: 0.6, tol: 0.3, maxS: 15 });
  await openDoor(h, h.A, 'kbm', CABIN_DOOR, tag);
}

async function clientToCabinFront(h) {
  await L.walkPath(h.B, 'pad', [[5.0, 11.2], [7.2, 11.6], [8.6, 13.9]], { via: 0.6, tol: 0.3, maxS: 15 });
}

async function grab(h, P, who, id, tag) {
  const side = P === h.A ? 'host' : 'client';
  await L.walkPath(P, who, [[8.6, 15.5], [7.9, 16.5]], { via: 0.5, tol: 0.25, maxS: 12 });
  await L.pickRow(P, who, /^Grab character$/);
  L.assert(await ok(L.until(P, pgHolding, id, 4000, `${tag}: the ${side} holds the checker`)), `${tag}: the ${side} holds the checker (Grab character)`);
}

// ------------------------------------------------------------------------------------------------------------- P7

/** P7: one suppressed round from `P` (shooter) is heard once on `other` (remote) and not echoed to the shooter. */
async function p7(h, P, who, other, dir, target) {
  const shooter = P === h.A ? 'host' : 'client';
  const listener = other === h.A ? 'host' : 'client';
  await L.hold(P, who, 'ads', true);
  let aS = [];
  let aO = [];
  let d = null;
  try {
    L.assert(await ok(L.until(P, pgAimedInOk, null, 4000, `${dir} setup: aimed in`)), `${dir} setup: aimed in (drawn, ads >= 0.9)`);
    const a = await L.read(P, pgAimedIn);
    L.assert(a.gun === 'pistolSd', `${dir} setup: the pistolSd is in hand (${a.gun})`);
    await L.aimAt(P, who, target, { tol: 0.03, maxS: 6 });
    const mS = await S.tapMark(P);
    const mO = await S.tapMark(other);
    await L.fireOne(P, who);
    const tO = (await S.tapMark(other)).t;
    await ok(L.until(other, pgHasRemote, mO.au, 2000, `${dir}: the ${listener} hears the round`));
    await L.waitHostSim(h.A, 1000);
    aS = await S.audioLog(P, mS.au);
    aO = await S.audioLog(other, mO.au);
    const rem0 = aO.filter((e) => e.k === 'remote');
    d = rem0.length ? +(rem0[0].t - tO).toFixed(2) : null;
  } finally {
    await L.hold(P, who, 'ads', false);
  }
  const shots = aS.filter((e) => e.k === 'shot');
  const echo = aS.filter((e) => e.k === 'remote');
  const rem = aO.filter((e) => e.k === 'remote');
  L.assert(
    shots.length === 1 && shots[0].gun === 'pistolSd' && shots[0].suppressed && echo.length === 0 && rem.length === 1 && rem[0].gun === 'pistolSd' && rem[0].suppressed && d !== null && d <= 0.5,
    `${dir}: one round: ${shooter} 1 shot (pistolSd, suppressed) and 0 remote, ${listener} 1 remote (pistolSd, suppressed) within 0.5 s (${shooter} ${JSON.stringify(aS)}, ${listener} ${JSON.stringify(aO)}, delay ${d} s)`,
  );
}

// ------------------------------------------------------------------------------------------------------------ P6a / P6b

/** P6a effect: the client's team takedown knocks out the host's hostage on the host within 6 s of the strike. */
async function p6aEffect(h, id, h0) {
  const got = await ok(L.until(h.A, pgGuardDown, id, 6700, 'P6a: the checker goes down on the host'));
  L.assert(got, `P6a: the client's team takedown knocks out the host's hostage on the host within 6 s of the strike (${await diffNote(h, h0)})`);
}

/** P6b: the host beside the client's hostage is offered the team takedown, runs it, the hostage goes down. */
async function p6bCheck(h, id) {
  await S.expectPrompt(h.A, /^Team takedown$/, "P6b: the host beside the client's hostage is offered the team takedown", 4000);
  const h0 = await hashes(h);
  await L.pickRow(h.A, 'kbm', /^Team takedown$/);
  const got = await ok(L.until(h.A, pgGuardDown, id, 6700, 'P6b: the checker goes down on the host'));
  L.assert(got, `P6b: the host's team takedown knocks out the client's hostage on the host within 6 s of the strike (${await diffNote(h, h0)})`);
}

// ------------------------------------------------------------------------------------------------------------- run

export async function run(h) {
  let id = null;

  await step('setup', async () => {
    id = await waitChecker(h, 'setup');
  });

  await step('P7 host->client', () => p7(h, h.A, 'kbm', h.B, 'P7 host->client', [5.85, 1.0, 9.0]));
  await step('P7 client->host', () => p7(h, h.B, 'pad', h.A, 'P7 client->host', [5.85, 1.0, 13.0]));

  await step('P6a', async () => {
    await hostToCabin(h, 'P6a setup');
    await grab(h, h.A, 'kbm', id, 'P6a setup');
    L.assert(await ok(L.until(h.B, pgPartnerHeld, id, 4000, 'P6a setup: the client sees the hold')), 'P6a setup: the client sees the host hold the checker (puppet partnerHeld)');
    await clientToCabinFront(h);
    await L.walkTo(h.B, 'pad', [8.6, 15.4], { tol: 0.25, maxS: 6 });
    await S.expectPrompt(h.B, /^Team takedown$/, "P6a setup: the client beside the host's hostage is offered the team takedown", 4000);
    const h0 = await hashes(h);
    await L.pickRow(h.B, 'pad', /^Team takedown$/);
    await p6aEffect(h, id, h0);
  });

  await step('restart 1', async () => {
    id = await restart(h, 'restart 1');
  });

  await step('P6b', async () => {
    await hostToCabin(h, 'P6b setup');
    await L.walkTo(h.A, 'kbm', [9.9, 13.3], { tol: 0.3, maxS: 6 });
    await clientToCabinFront(h);
    await grab(h, h.B, 'pad', id, 'P6b setup');
    L.assert(await ok(L.until(h.A, pgHostSeesHold, id, 4000, "P6b setup: the host sees the client's hold")), "P6b setup: the host sees the client's hold (partnerHolds)");
    await L.walkPath(h.B, 'pad', [[8.6, 15.6], [8.6, 13.2]], { via: 0.5, tol: 0.4, maxS: 15 });
    const hp = await L.read(h.A, pgEnemyPos, id);
    L.assert(!!hp, 'P6b setup: the checker exists on the host');
    const me = await L.me(h.A);
    const dd = Math.hypot(me.x - hp[0], me.z - hp[1]);
    if (dd > 1.5) {
      await L.walkTo(h.A, 'kbm', [hp[0] + (1.2 * (me.x - hp[0])) / dd, hp[1] + (1.2 * (me.z - hp[1])) / dd], { tol: 0.25, maxS: 8 });
    }
    await p6bCheck(h, id);
  });

  let src = '';
  await step('body source', async () => {
    const b = await L.read(h.A, pgBody, id);
    if (b && b.present) {
      src = 'P6b';
    } else if (await L.read(h.B, pgHolding, id)) {
      // P6b did nothing and the client still holds him: his RT tap knocks him out
      await L.hold(h.B, 'pad', 'fire', true);
      await L.waitHostSim(h.B, 120);
      await L.hold(h.B, 'pad', 'fire', false);
      src = 'client RT';
    } else {
      id = await restart(h, 'body restart');
      await hostToCabin(h, 'body setup');
      await grab(h, h.A, 'kbm', id, 'body setup');
      await L.walkPath(h.A, 'kbm', [[8.6, 15.6], [8.6, 13.2]], { via: 0.5, tol: 0.4, maxS: 15 });
      await h.A.keyboard.press('KeyZ');
      await ok(L.until(h.A, pgBodyPresent, id, 6000, 'body setup: the knocked-out checker lies'));
      await L.walkTo(h.A, 'kbm', [9.9, 13.3], { tol: 0.3, maxS: 6 });
      await L.walkPath(h.B, 'pad', [[5.0, 11.2], [7.2, 11.6], [7.6, 12.6]], { via: 0.6, tol: 0.4, maxS: 15 });
      src = 'host solo';
    }
    L.assert(await ok(L.until(h.A, pgBodyPresent, id, 6000, 'body setup: a body of the checker lies')), `body setup: a body of the checker lies on the host (source: ${src})`);
  });

  await step('body', async () => {
    const bi = await L.read(h.B, pgBodyItem);
    L.assert(!!bi, 'body setup: the client is offered a body to pick up');
    const me = await L.me(h.B);
    const dd = Math.hypot(me.x - bi[0], me.z - bi[1]);
    if (!(dd >= 0.5 && dd <= 1.0)) {
      await L.walkTo(h.B, 'pad', [bi[0] + (0.8 * (me.x - bi[0])) / dd, bi[1] + (0.8 * (me.z - bi[1])) / dd], { tol: 0.25, maxS: 8 });
    }
    let h0 = await hashes(h);
    await L.pickRow(h.B, 'pad', /^Pick up body$/);
    L.assert(
      await ok(L.until(h.A, pgBodyCarried, [id, true], MS, 'body: the host marks the body carried')),
      `body: the client's Pick up body row marks the host's body carried within ${L.PROMPT_S} s (${await diffNote(h, h0)})`,
    );
    await L.until(h.B, pgCarrying, null, 5000, 'body setup: the lift ends');
    await L.walkTo(h.B, 'pad', [7.6, 12.2], { tol: 0.4, maxS: 12 });
    h0 = await hashes(h);
    await L.pickRow(h.B, 'pad', /^Drop body$/);
    L.assert(
      await ok(L.until(h.A, pgBodyCarried, [id, false], MS + 800, 'body: the host marks the body put down')),
      `body: the client's Drop body row puts the host's body down (carried 0) within ${L.PROMPT_S + 0.8} s (${await diffNote(h, h0)})`,
    );
    console.log('  body: hide skipped - A1 has no hide spot (a1Gate.ts pushes no hideSpots; nearest a4GoodsShed.ts:423)');
  });

  console.log(`part 1 run ${((Date.now() - T0) / 1000).toFixed(1)} s (boot excluded)`);
}
