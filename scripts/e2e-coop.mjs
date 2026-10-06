// Coop: two pages in one browser context over the BroadcastChannel transport (?net=local).
// Lobby (host, join by typed code, ready-up by controller), match start, snapshot replication,
// host-validated client hits + kill credit, downed/revive, results with rewards, back to lobby,
// host leaving, malformed messages, and the offline state.
import { launch, openPage, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
const errs = [];

async function until(page, fn, arg, timeout = 15000, what = 'condition') {
  try {
    await page.waitForFunction(fn, arg, { timeout, polling: 100 });
  } catch {
    throw new Error(`timed out waiting for ${what}`);
  }
}

const { browser, ctx, page: A, errors: eA } = await launch({ url, params: 'net=local' });
let B = null;
try {
  const GA = (f, a) => A.evaluate(f, a);
  console.log('host opens a room');
  await A.click('.main-menu .btn:has-text("Co-op")');
  await A.click('.btn:has-text("Host a room")');
  await until(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 15000, 'host lobby');
  const code = await GA(() => window.__coop.session.code);
  assert(/^[A-Z0-9]{5}$/.test(code), `room code generated (${code})`);
  const link = await GA(() => document.querySelector('.lobby-screen .screen-title')?.textContent);
  assert(link?.includes(code), 'lobby shows the code');

  console.log('client joins by typing the code');
  const opened = await openPage(ctx, url, 'net=local');
  B = opened.page;
  errs.push(...opened.errors);
  const GB = (f, a) => B.evaluate(f, a);
  await B.click('.main-menu .btn:has-text("Co-op")');
  await B.click('.btn:has-text("Join with code")');
  await B.keyboard.type(code.toLowerCase());
  const typed = await GB(() => [...document.querySelectorAll('.code-slot')].map((s) => s.textContent).join(''));
  assert(typed === code, `keypad shows typed code (${typed})`);
  await B.keyboard.press('Enter');
  await until(B, () => window.__coop?.session.hostId && window.__coop.session.players.size === 2, null, 15000, 'client sees host lobby');
  await until(A, () => window.__coop.session.players.size === 2, null, 5000, 'host sees client');
  if (process.env.SHOTS) await B.screenshot({ path: `${process.env.SHOTS}/coop-lobby.png` });
  const startBlocked = await GA(() => document.querySelector('.lobby-actions .btn')?.classList.contains('blocked'));
  assert(startBlocked, 'start is blocked until everyone is ready');

  console.log('ready-up by controller');
  await GB(() => window.__pad.connect());
  await press(B, BTN.LS);
  await frames(B, 3);
  const focus = await GB(() => { const f = window.__app.nav.focused; return f ? f.textContent + '/' + f.isConnected + '/' + window.__app.screens.top?.el.className : 'none:' + window.__app.screens.top?.el.className; });
  assert(/Ready/.test(focus), `client focus starts on Ready (${focus})`);
  await press(B, BTN.A);
  await until(A, () => [...window.__coop.session.players.values()].every((p) => p.ready || p.host), null, 5000, 'ready state on host');
  await until(A, () => !document.querySelector('.lobby-actions .btn')?.classList.contains('blocked'), null, 5000, 'start unblocked');
  const bText = await GB(() => document.querySelector('.lobby-actions .btn')?.textContent ?? '');
  assert(/Not ready/.test(bText), 'client button toggles to Not ready');

  console.log('host starts a wave match');
  await A.click('.lobby-actions .btn:has-text("Start match")');
  await until(A, () => window.__app.current?.net && window.__app.current.enemyMgr, null, 30000, 'host match');
  await until(B, () => window.__app.current?.net && window.__app.current.puppet, null, 30000, 'client match');
  // host + client players invulnerable while we test hits
  await GA(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
  await until(A, () => window.__app.current.net.remotes.values().next().value?.state, null, 10000, 'client states reach host');
  // fast-forward the host to the first wave
  await GA(() => window.__app.loop.stepHeadless(7.5));
  await until(A, () => window.__app.current.enemyMgr.alive > 0, null, 10000, 'enemies spawn');
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
  await until(B, () => window.__app.current.net.puppets.size > 0, null, 10000, 'puppets on client');
  if (process.env.SHOTS) {
    await wait(800);
    await B.screenshot({ path: `${process.env.SHOTS}/coop-client.png` });
    await A.screenshot({ path: `${process.env.SHOTS}/coop-host.png` });
  }
  const counts = await Promise.all([GA(() => window.__app.current.enemyMgr.alive), GB(() => window.__app.current.net.puppets.size)]);
  assert(Math.abs(counts[0] - counts[1]) <= 1, `client mirrors host enemies (${counts})`);
  const info = await GB(() => document.querySelector('.hud-mode, .mode-info')?.textContent ?? window.__app.current.net.info);
  assert(/Wave/.test(info), `wave info replicated (${info})`);
  const avatar = await GB(() => window.__app.current.net.avatars.size);
  assert(avatar === 1, 'client renders the host avatar');
  const hostSeesClient = await GA(() => { const r = window.__app.current.net.remotes.values().next().value; return r.avatar.rig.root.isEnabled(); });
  assert(hostSeesClient, 'host renders the client avatar');
  // the client's whole loadout shows on its avatar: one in the hands, the rest carried in their slots
  const carried = await GA(() => {
    const av = window.__app.current.net.remotes.values().next().value.avatar;
    const ms = [...av['models'].values()];
    return { n: ms.length, held: ms.filter((m) => m.slot === null && m.node.isEnabled()).length, slotted: ms.filter((m) => m.slot !== null && m.node.isEnabled()).map((m) => m.slot), loadout: av.info.loadout };
  });
  assert(carried.loadout.length === 2 && carried.n === 2 && carried.held === 1 && carried.slotted.length === 1, `remote avatar carries its loadout (${JSON.stringify(carried)})`);

  console.log('client hit is validated by the host and credited');
  const victim = await GB(() => window.__app.current.net.puppets.keys().next().value);
  // a shot from far away must be rejected
  const bogus = await GB((id) => {
    const g = window.__app.current;
    const p = g.net.puppets.get(id);
    g.net.s.toHost({ t: 'shot', w: 'rifle', ox: p.pos.x + 80, oy: 1.5, oz: p.pos.z, dx: -1, dy: 0, dz: 0, target: id, part: 'body', rt: 0, dist: 80, dmg: 9999 });
    return id;
  }, victim);
  await wait(400);
  const v1 = await GA((id) => ({ alive: window.__app.current.enemyMgr.enemies.find((e) => e.id === id)?.alive ?? false, viol: window.__app.current.net.remotes.values().next().value.violations }), bogus);
  assert(v1.alive && v1.viol >= 1, `impossible shot rejected (${JSON.stringify(v1)})`);
  // move the client next to the enemy (host grants a teleport window, like a respawn) and shoot it
  // stand the victim on open floor (the default map is close quarters) so the client has a clear line
  await GA((id) => {
    const g = window.__app.current;
    for (const r of g.net.remotes.values()) r.allowTeleport(5);
    for (const e of g.enemyMgr.enemies) e['stagger'] = 99;
    const v = g.enemyMgr.enemies.find((e) => e.id === id);
    if (v && g.world.map.id === 'warehouse') v.pos.set(6, 0, -6);
  }, victim);
  await wait(400);
  await GB((id) => {
    const g = window.__app.current;
    const p = g.net.puppets.get(id);
    g.player.controller.teleport(p.pos.add(new p.pos.constructor(0, 0.2, -2.2)), 0);
  }, victim);
  await wait(500);
  let killed = false;
  for (let i = 0; i < 40 && !killed; i++) {
    await GB((id) => {
      const g = window.__app.current;
      const p = g.net.puppets.get(id);
      if (!p) return;
      const src = g.player.position.add(new p.pos.constructor(0, 1.58, 0));
      const pt = p.center(new p.pos.constructor());
      p.applyDamage({ amount: 40, point: pt, dir: pt.subtract(src).normalize(), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', weapon: 'rifle', sourcePos: src, impulse: 3 });
    }, victim);
    await wait(250);
    killed = await GA((id) => !window.__app.current.enemyMgr.enemies.some((e) => e.id === id && e.alive), victim);
  }
  assert(killed, 'client shots kill the host enemy');
  const selfB = await GB(() => window.__coop.session.selfId);
  const tally = await GA((id) => window.__app.current.net.tallies.get(id)?.kills ?? 0, selfB);
  assert(tally >= 1, `host credits the kill to the client (${tally})`);
  await until(B, (id) => !window.__app.current.net.puppets.has(id), victim, 5000, 'client removes the dead puppet');

  console.log('downed and revived');
  await GA(() => {
    const g = window.__app.current;
    const r = g.net.remotes.values().next().value;
    r.damageMul = 1;
    r.applyDamage({ amount: 9999, point: r.feet.clone(), dir: r.feet.clone(), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'x', sourcePos: r.feet.clone(), impulse: 0 });
  });
  await until(B, () => !window.__app.current.player.alive, null, 5000, 'client downed by host');
  const hostAlive = await GA(() => !window.__app.current.isEnded);
  assert(hostAlive, 'match continues while the host is up');
  await GA(() => window.__app.current.reviveAll());
  await until(B, () => window.__app.current.player.alive && window.__app.current.target.health.hp > 90, null, 5000, 'client revived');

  console.log('malformed messages are ignored');
  await GB(() => {
    const t = window.__coop.session.transport;
    for (const m of [null, 5, 'x', { t: 'snap' }, { t: 'shot', w: 'bfg' }, { t: 'pstate', s: { id: '<script>', x: 'NaN' } }, { t: 'lobby', players: 'x' }, { t: 'end', stats: 1 }]) t.send(m);
  });
  await wait(300);
  const stillOk = await GA(() => window.__app.current.net.remotes.size === 1 && !window.__app.current.isEnded);
  assert(stillOk, 'host unaffected by junk');

  console.log('team wipe ends the match; client gets results + rewards');
  await GA(() => {
    const g = window.__app.current;
    const r = g.net.remotes.values().next().value;
    const kill = (t, p) => { t.damageMul = 1; t.applyDamage({ amount: 9999, point: p.clone(), dir: p.clone(), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'x', sourcePos: p.clone(), impulse: 0 }); };
    kill(r, r.feet);
    kill(g.target, g.player.position);
  });
  await until(A, () => !!document.querySelector('.results-screen'), null, 15000, 'host results');
  await until(B, () => !!document.querySelector('.results-screen'), null, 15000, 'client results');
  const res = await GB(() => ({ kills: window.__app.current.stats.kills, title: document.querySelector('.results-title')?.textContent, rewards: !!document.querySelector('.results-screen .rewards, .results-screen .rewards-panel') }));
  assert(res.title === 'DEFEAT' && res.kills >= 1, `client results from host stats (${JSON.stringify(res)})`);
  assert(res.rewards, 'client earns rewards locally');

  console.log('back to lobby, then host leaves');
  await A.click('.results-screen .btn:has-text("Play again")');
  await until(A, () => !!document.querySelector('.lobby-screen') && window.__coop.session.phase === 'lobby', null, 15000, 'host back in lobby');
  await until(B, () => !!document.querySelector('.lobby-screen'), null, 15000, 'client follows host to lobby');
  const reset = await GA(() => [...window.__coop.session.players.values()].filter((p) => !p.host && p.ready).length);
  assert(reset === 0, 'returning to the lobby clears ready states');
  assert(true, 'client follows the host back to the lobby');
  await GA(() => window.__coop.leave(false));
  await until(B, () => /Host left/.test(document.querySelector('.dialog-title')?.textContent ?? ''), null, 8000, 'host-left dialog');
  assert(true, 'client is told when the host leaves');
  const menu = await GA(() => !!document.querySelector('.main-menu') && !document.querySelector('.lobby-screen'));
  assert(menu, 'host is back at the main menu');
} catch (e) {
  failed = true;
  console.error(String(e));
  await A.screenshot({ path: '/tmp/e2e-coop-A.png' }).catch(() => {});
  await B?.screenshot({ path: '/tmp/e2e-coop-B.png' }).catch(() => {});
} finally {
  errs.push(...eA);
  await browser.close();
}

console.log('offline state');
{
  const { browser: br, ctx: c2, page, errors } = await launch({ url, params: '' });
  try {
    await c2.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.click('.main-menu .btn:has-text("Co-op")');
    await page.waitForSelector('.coop-offline', { timeout: 8000 });
    assert(true, 'co-op shows an offline state');
    await press(page, BTN.B).catch(() => {});
    await c2.setOffline(false);
    await page.click('.btn:has-text("Retry")');
    await page.waitForSelector('.btn:has-text("Host a room")', { timeout: 5000 });
    assert(true, 'retry recovers when back online');
  } catch (e) {
    failed = true;
    console.error(String(e));
  } finally {
    errs.push(...errors);
    await br.close();
  }
}

const real = errs.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext|Failed to load resource/i.test(e));
if (real.length) {
  failed = true;
  console.error('console errors:\n' + real.join('\n'));
}
console.log(failed ? 'COOP E2E FAILED' : 'coop e2e passed');
process.exit(failed ? 1 : 0);
