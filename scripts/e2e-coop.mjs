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
    const st = await page.evaluate(() => { const c = window.__app.current; return { state: c?.constructor?.name, mode: c?.opts?.mode, map: c?.opts?.map, net: !!c?.net, ended: c?.isEnded, inGame: window.__coop?.inGame, screens: [...document.querySelectorAll('.screens > *')].map((e) => e.className).join('|') }; }).catch((e) => String(e));
    throw new Error(`timed out waiting for ${what} (${JSON.stringify(st)})`);
  }
}

const { browser, ctx, page: A, errors: eA } = await launch({ url, params: 'net=local' });
let B = null;
let C = null;
let eB = [];
let eC = [];
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
  eB = opened.errors;
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
  await until(A, () => window.__app.current?.net && window.__app.current.enemyMgr, null, 60000, 'host match');
  await until(B, () => window.__app.current?.net && window.__app.current.puppet, null, 60000, 'client match');
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
  // a humanoid on the ground (dogs and drones vary with the wave's draw)
  const victim = await GB(() => {
    const ps = [...window.__app.current.net.puppets.values()];
    return (ps.find((p) => p.def.kind === 'grunt' || p.def.kind === 'runner') ?? ps[0]).id;
  });
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
    if (v && g.world.map.id === 'warehouse') v.pos.set(13, 0, -6.5);
  }, victim);
  // the client's copy follows over the next snapshots: stand beside it once it is there
  await until(B, (id) => { const p = window.__app.current.net.puppets.get(id); return !!p && Math.hypot(p.pos.x - 13, p.pos.z + 6.5) < 1.5; }, victim, 15000, 'puppet moved');
  await GB((id) => {
    const g = window.__app.current;
    const p = g.net.puppets.get(id);
    // north of it on the open factory floor (the corridor wall is just south)
    g.player.controller.teleport(p.pos.add(new p.pos.constructor(0, 0.2, 2.2)), Math.PI);
  }, victim);
  await wait(500);
  let killed = false;
  for (let i = 0; i < 40 && !killed; i++) {
    // keep the host's teleport grace open until the client's moved state arrives (slow under a loaded
    // machine); shot validation itself is unchanged
    await GA(() => {
      for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(2);
    });
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
  if (!killed) {
    console.log('    host:', await GA((id) => { const g = window.__app.current; const e = g.enemyMgr.enemies.find((x) => x.id === id); const r = g.net.remotes.values().next().value; return JSON.stringify({ kind: e?.def.kind, pos: e && [e.pos.x, e.pos.y, e.pos.z].map((n) => n.toFixed(2)), hp: e?.health.hp, client: [r.feet.x, r.feet.y, r.feet.z].map((n) => n.toFixed(2)), viol: r.violations }); }, victim));
    console.log('    client:', await GB((id) => { const g = window.__app.current; const p = g.net.puppets.get(id); return JSON.stringify({ puppet: p && [p.pos.x, p.pos.y, p.pos.z].map((n) => n.toFixed(2)), me: [g.player.position.x, g.player.position.y, g.player.position.z].map((n) => n.toFixed(2)) }); }, victim));
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

  console.log('back to lobby');
  await A.click('.results-screen .btn:has-text("Play again")');
  await until(A, () => !!document.querySelector('.lobby-screen') && window.__coop.session.phase === 'lobby', null, 15000, 'host back in lobby');
  await until(B, () => !!document.querySelector('.lobby-screen'), null, 15000, 'client follows host to lobby');
  const reset = await GA(() => [...window.__coop.session.players.values()].filter((p) => !p.host && p.ready).length);
  assert(reset === 0, 'returning to the lobby clears ready states');
  assert(true, 'client follows the host back to the lobby');

  const pages = () => [A, B, C].filter(Boolean);
  /** Host picks the mode, everyone readies, the match starts on every page. */
  async function startMode(mode, map, mission = '') {
    await GA(([m, mp, mi]) => window.__coop.session.setSettings(m, mp, 'normal', mi), [mode, map, mission]);
    for (const P of pages().slice(1)) await P.evaluate(() => window.__coop.session.setReady(true));
    await until(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready');
    await GA(() => window.__coop.session.startMatch());
    for (const P of pages()) await until(P, (m) => window.__app.current?.opts?.mode === m && !!window.__app.current.net && !window.__app.current.isEnded, mode, 40000, `${mode} match on every page`);
    await until(A, (n) => window.__app.current.net.remotes.size === n && [...window.__app.current.net.remotes.values()].every((r) => r.state), pages().length - 1, 15000, 'client states reach the host');
  }
  async function toLobby() {
    await GA(() => window.__coop.backToLobby());
    for (const P of pages()) await until(P, () => !!document.querySelector('.lobby-screen') && !window.__coop.inGame, null, 15000, 'back in the lobby');
  }
  /** Move a client (the host grants a teleport window first). */
  async function moveClient(P, x, y, z, yaw) {
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
    await P.evaluate(([x, y, z, yaw]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw); }, [x, y, z, yaw]);
    await wait(500);
  }

  console.log('hunter co-op: calm puppets, doors, mirrored items, a client takedown, a client revive');
  await startMode('clear', 'warehouse');
  await GA(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
  await until(B, () => window.__app.current.net.puppets.size > 0, null, 15000, 'hunter puppets');
  const hostId0 = await GA(() => window.__coop.session.selfId);
  const calm = await GB(() => [...window.__app.current.net.puppets.values()].filter((p) => p.level === 'unaware').length);
  assert(calm > 0, `puppets carry the host's alert levels (${calm} calm)`);
  const door = await GA(() => {
    const g = window.__app.current;
    const d = g.world.doors.list.find((x) => !x.anchor.locked && x.target === 0);
    g.world.doors.open(d, 'quiet');
    return d.index;
  });
  await until(B, (i) => window.__app.current.world.doors.list[i].target === 1, door, 5000, 'client door follows the host');
  assert(true, 'a door opened on the host opens on the client');
  const items = await GB(() => (window.__app.current.interactables?.items ?? []).map((i) => i.kind));
  assert(items.includes('door'), `client mirrors usable items (${[...new Set(items)].join(',')})`);
  // the client opens another door through its mirrored item
  const di = await GB(() => {
    const g = window.__app.current;
    const d = g.world.doors.list.find((x) => !x.anchor.locked && x.target === 0);
    const it = g.interactables.items.find((i) => i.id === `door-${d.anchor.id}`);
    return { id: it.id, x: it.pos.x, y: it.pos.y, z: it.pos.z, idx: d.index };
  });
  await moveClient(B, di.x + 0.6, di.y + 0.1, di.z, 0);
  // (retried: the host checks reach against the client's latest state, which can lag under load)
  for (let i = 0; i < 10 && !(await GA((k) => window.__app.current.world.doors.list[k].target === 1, di.idx)); i++) {
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(2); });
    await GB((id) => { const it = window.__app.current.interactables.items.find((i) => i.id === id); it.onUse(it); }, di.id);
    await wait(400);
  }
  await until(A, (i) => window.__app.current.world.doors.list[i].target === 1, di.idx, 5000, 'host opens the door the client used');
  assert(true, 'client uses a door through the host (reach checked)');
  // takedown: a calm guard on open floor, the client right behind it
  const tdv = await GB(() => [...window.__app.current.net.puppets.values()].find((p) => p.def.kind === 'grunt')?.id ?? [...window.__app.current.net.puppets.keys()][0]);
  await GA((id) => {
    const g = window.__app.current;
    for (const e of g.enemyMgr.enemies) e['stagger'] = 99;
    const v = g.enemyMgr.enemies.find((e) => e.id === id);
    v.pos.set(6, 0, -6);
    v.yaw = 0;
  }, tdv);
  await wait(600);
  await moveClient(B, 6, 0.1, -7.1, 0);
  // (the guard is held on its spot while the client's offer comes round: a calm patrol would walk it off; the host
  // checks reach against the client's latest state, which can lag under load - a denied start is retried)
  let tdStarted = 'offer none';
  let knocked = false;
  for (let attempt = 0; attempt < 6 && !knocked; attempt++) {
    tdStarted = 'offer none';
    for (let i = 0; i < 40 && tdStarted !== true; i++) {
      await GA((id) => {
        const g = window.__app.current;
        for (const r of g.net.remotes.values()) r.allowTeleport(1);
        const v = g.enemyMgr.enemies.find((e) => e.id === id);
        if (v?.alive && !v.taken) {
          v.pos.set(6, 0, -6);
          v.yaw = 0;
        }
      }, tdv);
      tdStarted = await GB((id) => {
        const g = window.__app.current;
        if (g.takedown.offer?.e.id === id && !g.takedown.active) {
          g.takedown.start(false);
          return true;
        }
        return `offer ${g.takedown.offer?.e.id ?? 'none'}`;
      }, tdv);
      if (tdStarted !== true) await wait(150);
    }
    for (let i = 0; i < 20 && !knocked; i++) {
      await wait(400);
      knocked = await GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return !e || (!e.alive && e.ko); }, tdv);
      if (!knocked && (await GB(() => !window.__app.current.takedown.active))) break;
    }
  }
  assert(tdStarted === true, `client takedown offered on the host's guard (${tdStarted})`);
  await until(A, (id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return !e || (!e.alive && e.ko); }, tdv, 8000, 'host knocks the guard out');
  assert(true, 'client takedown knocks the host enemy out');
  // the knocked-out guard lies on the client as long as the host has the body
  await until(B, (id) => window.__app.current.net.kept.has(id), tdv, 6000, 'client keeps the body');
  assert(true, 'client keeps the body the host has lying');
  await GA((id) => { const b = window.__app.current.enemyMgr.bodies.find((x) => x.enemyId === id); if (b) b.hidden = true; }, tdv);
  await until(B, (id) => !window.__app.current.net.kept.has(id), tdv, 8000, 'client drops the hidden body');
  assert(true, 'a body hidden on the host leaves the client');
  // pings: the client marks a spot, the host shows it in the client's colour
  const clientId = await GB(() => window.__coop.session.selfId);
  await GB(() => window.__app.current.net.ping(6, 0.5, -3, ''));
  await until(A, (id) => window.__app.current.pings.some((p) => p.by === id), clientId, 5000, 'host shows the client ping');
  assert(true, 'a client ping reaches the host');
  await GA(() => window.__app.current.net.ping(4, 0.5, -3, ''));
  await until(B, (id) => window.__app.current.pings.some((p) => p.by === id), hostId0, 5000, 'client shows the host ping');
  assert(true, 'a host ping reaches the client');
  // Mark & Execute: the client's takedown earned it a charge; an execute shot downs a guard outright
  const charges = await GA(() => [...window.__app.current.net.remotes.values()][0].execCharges);
  assert(charges >= 1, `a client takedown earns an execute charge (${charges})`);
  const exv = await GA(() => {
    const g = window.__app.current;
    const e = g.enemyMgr.enemies.find((x) => x.alive && x.def.kind === 'grunt') ?? g.enemyMgr.enemies.find((x) => x.alive && !x.def.quadruped && x.def.kind !== 'heavy' && x.def.kind !== 'enforcer');
    e.pos.set(6, 0, -3.8);
    return e.id;
  });
  await wait(600);
  let executed = false;
  for (let i = 0; i < 30 && !executed; i++) {
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(2); });
    await GB((id) => {
      const g = window.__app.current;
      const p = g.net.puppets.get(id);
      if (!p) return;
      const src = g.player.position.add(new p.pos.constructor(0, 1.58, 0));
      const pt = p.center(new p.pos.constructor());
      p.applyDamage({ amount: 5, point: pt, dir: pt.subtract(src).normalize(), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', weapon: 'rifle', sourcePos: src, impulse: 3, execute: true });
    }, exv);
    await wait(250);
    executed = await GA((id) => !window.__app.current.enemyMgr.enemies.some((e) => e.id === id && e.alive), exv);
  }
  if (!executed) {
    console.log('    host:', await GA((id) => { const g = window.__app.current; const e = g.enemyMgr.enemies.find((x) => x.id === id); const r = g.net.remotes.values().next().value; return JSON.stringify({ kind: e?.def.kind, pos: e && [e.pos.x, e.pos.z], hp: e?.health.hp, client: [r.feet.x, r.feet.z], viol: r.violations, ch: r.execCharges, left: r.execLeft, until: r.execUntil, t: g.net.time }); }, exv));
    console.log('    client:', await GB((id) => { const g = window.__app.current; const p = g.net.puppets.get(id); return JSON.stringify({ puppet: p && [p.pos.x, p.pos.z], me: [g.player.position.x, g.player.position.z] }); }, exv));
  }
  assert(executed, 'a client execute shot downs the guard (host checks the charge)');
  // gadgets: a client's gas cloud acts on the host's guards
  const gv = await GA(() => {
    const g = window.__app.current;
    const e = g.enemyMgr.enemies.find((x) => x.alive);
    e.pos.set(8, 0, -7);
    return e?.id;
  });
  await wait(400);
  await GB(() => { const g = window.__app.current; g.gadgets['detonate']('gas', new g.player.position.constructor(8, 0.3, -7)); });
  await until(A, (id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return !e || !e.alive || e.gas > 0; }, gv, 6000, 'host guard breathes the client gas');
  assert(true, "a client's gas cloud reaches the host's guards");
  // dual takedown: two players finishing takedowns together
  await GA(([a, b]) => { const n = window.__app.current.net; n['takedownDone'](a); n['takedownDone'](b); }, [hostId0, clientId]);
  assert((await GA(() => window.__app.current.net.duals)) === 1, 'two takedowns together count as a dual takedown');
  await until(B, () => /DUAL TAKEDOWN/.test(document.querySelector('.hud')?.textContent ?? document.body.textContent), null, 4000, 'client sees the dual takedown');
  assert(true, 'the dual takedown banner reaches the client');
  // the host goes down: a team-mate can revive (the client, through its mirrored revive point)
  await GA(() => {
    const g = window.__app.current;
    g.target.damageMul = 1;
    g.target.applyDamage({ amount: 9999, point: g.player.position.clone(), dir: g.player.position.clone(), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'x', sourcePos: g.player.position.clone(), impulse: 0 });
  });
  const hostId = await GA(() => window.__coop.session.selfId);
  await until(B, (id) => window.__app.current.interactables.items.some((i) => i.id === `revive-${id}` && i.enabled), hostId, 5000, 'client sees the revive point');
  const hp = await GA(() => { const p = window.__app.current.player.position; return [p.x, p.y, p.z]; });
  assert(await GA(() => !window.__app.current.player.alive && !window.__app.current.isEnded), 'host down, the match goes on');
  await moveClient(B, hp[0] + 0.7, hp[1] + 0.1, hp[2], 0);
  // (retried: the host checks reach against the client's latest state, which can lag under load)
  for (let i = 0; i < 12 && !(await GA(() => window.__app.current.player.alive)); i++) {
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(2); });
    await GB((id) => { const it = window.__app.current.interactables.items.find((i) => i.id === `revive-${id}`); if (it?.enabled) it.onUse(it); }, hostId);
    await wait(400);
  }
  await until(A, () => window.__app.current.player.alive, null, 5000, 'host revived by the client');
  assert(true, 'client revives the downed host');
  await toLobby();

  console.log('infiltration co-op: the mission and its objectives reach the client');
  await startMode('infiltration', 'warehouse', 'warehouse-ledger');
  const inf = await GB(() => ({ map: window.__app.current.world.map.id, mode: window.__app.current.opts.mode }));
  assert(inf.map === 'warehouse' && inf.mode === 'infiltration', `client on the mission's map (${JSON.stringify(inf)})`);
  await until(B, () => (window.__app.current.interactables?.items ?? []).some((i) => i.kind !== 'door' && i.kind !== 'revive'), null, 10000, 'objective items on the client');
  const obj = await GB(() => window.__app.current.hud['objective']?.textContent ?? '');
  assert(true, `client sees the mission's objectives (${obj})`);
  await toLobby();

  console.log('pvp: team deathmatch and free-for-all with three');
  const opened3 = await openPage(ctx, url, 'net=local');
  C = opened3.page;
  eC = opened3.errors;
  await C.click('.main-menu .btn:has-text("Co-op")');
  await C.click('.btn:has-text("Join with code")');
  await C.keyboard.type(code.toLowerCase());
  await C.keyboard.press('Enter');
  await until(A, () => window.__coop.session.players.size === 3, null, 15000, 'third player joins');
  await startMode('tdm', 'warehouse');
  const ids = await Promise.all(pages().map((P) => P.evaluate(() => window.__coop.session.selfId)));
  const teams = await GA((ids) => ids.map((id) => window.__coop.session.players.get(id).team), ids);
  assert(teams[0] === teams[2] && teams[0] !== teams[1], `teams split 2v1 (${teams})`);
  for (const P of pages()) await until(P, () => window.__app.current.net.avatars?.size === 2 || window.__app.current.net.remotes?.size === 2, null, 20000, 'every avatar seen');
  const tB = await GB(() => [...window.__app.current.net.targets.keys()].length);
  const tC = await C.evaluate(() => [...window.__app.current.net.targets.keys()].length);
  const boxes = await GA(() => window.__app.current.net.pvpBoxes.size);
  assert(tB === 2 && tC === 1 && boxes === 1, `only opponents have hit volumes (B ${tB}, C ${tC}, host ${boxes})`);
  const ff = await GA(([b, c]) => {
    const g = window.__app.current;
    const hit = (r) => r.applyDamage({ amount: 20, point: r.feet.clone(), dir: r.feet.clone(), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: r.feet.clone(), impulse: 0 }).dealt;
    return { mate: hit(g.net.remotes.get(c)), foe: hit(g.net.remotes.get(b)) };
  }, [ids[1], ids[2]]);
  assert(ff.mate === 0 && ff.foe > 0, `no friendly fire; opponents take damage (${JSON.stringify(ff)})`);
  // B eliminates the host with validated shots
  // stand B 2.5 m from the host where the line between them is clear of the level
  const hpos = await GA(() => {
    const g = window.__app.current;
    const p = g.player.position;
    const V = p.constructor;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const at = new V(p.x + Math.sin(a) * 2.5, p.y, p.z + Math.cos(a) * 2.5);
      const h1 = g.ballistics.ray(p.add(new V(0, 1.2, 0)), at.add(new V(0, 1.2, 0)), 1);
      const h2 = g.ballistics.ray(at.add(new V(0, 0.5, 0)), at.add(new V(0, -0.6, 0)), 1);
      if (!h1.hit && h2.hit) return [at.x, at.y, at.z];
    }
    return [p.x, p.y, p.z - 2.5];
  });
  await moveClient(B, hpos[0], hpos[1] + 0.1, hpos[2], 0);
  let down = false;
  for (let i = 0; i < 40 && !down; i++) {
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(2); });
    await GB((id) => {
      const g = window.__app.current;
      const t = g.net.targets.get(id);
      const src = g.player.position.add(new g.player.position.constructor(0, 1.58, 0));
      const pt = t.center(new g.player.position.constructor());
      t.applyDamage({ amount: 40, point: pt, dir: pt.subtract(src).normalize(), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', weapon: 'rifle', sourcePos: src, impulse: 3 });
    }, ids[0]);
    await wait(200);
    down = await GA(() => (window.__app.current.stats.deaths ?? 0) >= 1);
  }
  assert(down, 'client shots eliminate the host (validated, rewound)');
  const sc = await GA((b) => window.__app.current.net.score.lines().find((l) => l.id === b), ids[1]);
  assert(sc?.k === 1, `the elimination is scored (${JSON.stringify(sc)})`);
  await until(B, () => /1/.test(document.querySelector('.hud-mode')?.textContent ?? ''), null, 5000, 'client HUD shows the score');
  // (three SwiftShader pages render slowly: the host's real-time sim lags, so step it)
  await GA(() => window.__app.loop.stepHeadless(5));
  await until(A, () => window.__app.current.player.alive, null, 10000, 'host respawns');
  assert(true, 'eliminated players respawn');
  await GA(() => (window.__app.current.net.score.elapsed = 1e5));
  for (const P of pages()) await until(P, () => !!document.querySelector('.results-screen'), null, 15000, 'pvp results');
  const titles = await Promise.all(pages().map((P) => P.evaluate(() => document.querySelector('.results-title')?.textContent)));
  assert(titles[1] === 'VICTORY' && titles[0] === 'DEFEAT' && titles[2] === 'DEFEAT', `team result on every page (${titles})`);
  const elim = await GB(() => document.querySelector('.results-screen .stat-grid')?.textContent ?? '');
  assert(/Eliminations1/.test(elim.replace(/\s/g, '')), `PvP results show eliminations (${elim})`);
  await toLobby();
  await startMode('ffa', 'warehouse');
  for (const P of pages()) await until(P, () => window.__app.current.net.avatars?.size === 2 || window.__app.current.net.remotes?.size === 2, null, 20000, 'every avatar seen');
  const ffa = await Promise.all([GA(() => window.__app.current.net.pvpBoxes.size), GB(() => window.__app.current.net.targets.size), C.evaluate(() => window.__app.current.net.targets.size)]);
  assert(ffa.every((n) => n === 2), `free-for-all: everyone is an opponent (${ffa})`);
  await GA(() => (window.__app.current.net.score.elapsed = 1e5));
  for (const P of pages()) await until(P, () => !!document.querySelector('.results-screen'), null, 15000, 'ffa results');
  assert(true, 'free-for-all ends on time');
  await toLobby();

  console.log('host leaves');
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
  errs.push(...eA, ...eB, ...eC);
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
