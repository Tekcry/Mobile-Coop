// Coop: two pages in one browser context over the BroadcastChannel transport (?net=local).
// Lobby (host, join by typed code, ready-up by controller), match start, snapshot replication,
// host-validated client hits + kill credit, downed/revive, results, back to lobby, guards and doors in co-op,
// difficulty, a door peek and a wall medkit in Free Roam, host leaving, malformed messages, and the offline state.
// (co-op test fix, process audit section 2) The pages open legacy-off: the matches are Infiltration (the Ledger
// mission on the Warehouse: guards, and detection costs only a bonus) and Free Roam, no Hunter. Two players only (G2).
// Waits are e2e-net-lib's, on both pages' sim clocks: the sim runs slower than real time on software GL.
import { launch, openPage, frames, press, BTN, assert } from './e2e-lib.mjs';
import { until as untilNet, waitSim, setSimPages } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => waitSim(ms);
let failed = false;
const errs = [];
// the Infiltration mission the matches run (bonuses only: detection does not end it)
const MISSION = ['infiltration', 'warehouse', 'warehouse-ledger'];

// (coop-fix) Is the partner's character drawn on page P: its meshes enabled and visible with real bounds and a finite
// root. On the client the camera first faces the host and two frames render, so it is also in the active meshes and
// the camera frustum (the camera is turned back after).
const avatarDrawn = (P, side) =>
  P.evaluate(async (side) => {
    const g = window.__app.current;
    const a = side === 'client' ? g.net.avatars.values().next().value : g.net.remotes.values().next().value.avatar;
    const c = g.player.cam;
    const was = [c.yaw, c.pitch];
    if (side === 'client') {
      c.yaw = Math.atan2(a.pos.x - g.player.position.x, a.pos.z - g.player.position.z);
      c.pitch = 0;
      await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 3000); });
    }
    const cam = g.scene.activeCamera;
    const r = a.rig.root;
    r.computeWorldMatrix(true);
    const ms = a.figure.renderMeshes.filter((m) => m.isEnabled());
    const act = new Set(g.scene.getActiveMeshes().data);
    const info = ms.map((m) => {
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      return { en: m.isEnabled(), vis: m.isVisible && m.visibility > 0, active: act.has(m), inFrustum: cam.isInFrustum(m), size: bb.extendSizeWorld.length() };
    });
    const root = [r.position.x, r.position.y, r.position.z];
    if (side === 'client') [c.yaw, c.pitch] = was;
    const ok = root.every(Number.isFinite) && r.isEnabled() && ms.length > 0 && info.every((i) => i.en && i.vis) && info.some((i) => i.size > 0.5); // the body (about 1 m); small parts such as the lens are a few cm
    return { ok, root, lod: a.figure.current, n: ms.length, info };
  }, side);

async function until(page, fn, arg, timeout = 15000, what = 'condition') {
  try {
    await untilNet(page, fn, arg, timeout, what);
  } catch (e) {
    const st = await page.evaluate(() => { const c = window.__app.current; return { state: c?.constructor?.name, mode: c?.opts?.mode, map: c?.opts?.map, net: !!c?.net, ended: c?.isEnded, inGame: window.__coop?.inGame, screens: [...document.querySelectorAll('.screens > *')].map((e) => e.className).join('|') }; }).catch((x) => String(x));
    throw new Error(`${e.message} (${JSON.stringify(st)})`);
  }
}

// (the default 1280 x 640 window: the lobby is clicked, and the menus lay out at 1280 x 720 at least, so a smaller
// window puts "Start mission" outside it)
const { browser, ctx, page: A, errors: eA } = await launch({ url, params: 'net=local' });
let B = null;
let eB = [];
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
  setSimPages([A, B]);
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

  console.log('host starts an Infiltration match (the Ledger, on the Warehouse)');
  await GA((m) => window.__coop.session.setSettings(m[0], m[1], 'normal', m[2]), MISSION);
  await A.click('.lobby-actions .btn:has-text("Start mission")');
  await until(A, () => window.__app.current?.net && window.__app.current.enemyMgr, null, 60000, 'host match');
  await until(B, () => window.__app.current?.net && window.__app.current.puppet, null, 60000, 'client match');
  // host + client players invulnerable while we test hits
  await GA(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
  await until(A, () => window.__app.current.net.remotes.values().next().value?.state, null, 10000, 'client states reach host');
  // fast-forward the host a little (the squads fill in)
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
  await until(B, () => (window.__app.current.interactables?.items ?? []).some((i) => i.kind !== 'door' && i.kind !== 'revive'), null, 10000, 'the mission objectives reach the client');
  const modeB = await GB(() => window.__app.current.opts.mode);
  assert(modeB === 'infiltration', `the client runs the host's Infiltration match (${modeB})`);
  const avatar = await GB(() => window.__app.current.net.avatars.size);
  assert(avatar === 1, 'client renders the host avatar');
  // (coop-fix) the host's character is drawn on the joiner's screen, and the objective line left "Connecting to host"
  await until(B, () => window.__app.current.net.avatars.values().next().value.figure.current >= 0, null, 20000, 'host figure LOD shown on the client');
  const visB = await avatarDrawn(B, 'client');
  assert(visB.ok, `host avatar drawn on the client (${JSON.stringify(visB)})`);
  assert(visB.info.some((i) => i.inFrustum && i.active), `host avatar in the client camera's view (${JSON.stringify(visB)})`);
  const objIn = await GB(() => window.__app.current.hud.objectiveText);
  assert(!/Connecting to host/.test(objIn), `connecting label gone once in game (${objIn})`);
  const hostSeesClient = await GA(() => { const r = window.__app.current.net.remotes.values().next().value; return r.avatar.rig.root.isEnabled(); });
  assert(hostSeesClient, 'host renders the client avatar');
  // (G135) each player's goggle is their own colour, the same on both screens: the host green (the lens's own), the
  // partner cyan; once a LOD shows, its lens emissive carries the hue
  const glowOf = (f) => {
    const l = f.current >= 0 ? f['lods'][f.current] : null;
    const e = l?.glowMat?.emissiveColor;
    return { tint: f['glowTint'] ? [f['glowTint'].r, f['glowTint'].g, f['glowTint'].b] : null, shown: e ? [e.r, e.g, e.b] : null };
  };
  const glowA = await GA((src) => { const fn = new Function(`return ${src}`)(); const g = window.__app.current; return { own: fn(g.player.figure), partner: fn(g.net.remotes.values().next().value.avatar.figure) }; }, glowOf.toString());
  const glowB = await GB((src) => { const fn = new Function(`return ${src}`)(); const g = window.__app.current; return { own: fn(g.player.figure), partner: fn(g.net.avatars.values().next().value.figure) }; }, glowOf.toString());
  const cyan = (c) => !!c && c[2] > c[0] + 0.5 && c[1] > 0.5;
  const shownOk = (s, want) => s.shown === null || (want === 'cyan' ? s.shown[2] > s.shown[0] : s.shown[1] > s.shown[2]);
  assert(glowA.own.tint === null && cyan(glowA.partner.tint) && glowB.own.tint !== null && cyan(glowB.own.tint) && glowB.partner.tint === null
    && shownOk(glowA.own, 'green') && shownOk(glowA.partner, 'cyan') && shownOk(glowB.own, 'cyan') && shownOk(glowB.partner, 'green'),
    `goggle colour per player: host green, partner cyan on both screens (G135) (${JSON.stringify({ glowA, glowB })})`);
  // the client's whole loadout shows on its avatar: (step 09) holstered unless aiming, so every weapon in its slot
  const carried = await GA(() => {
    const av = window.__app.current.net.remotes.values().next().value.avatar;
    const ms = [...av['models'].values()];
    return { n: ms.length, held: ms.filter((m) => m.slot === null && m.node.isEnabled()).length, slotted: ms.filter((m) => m.slot !== null && m.node.isEnabled()).map((m) => m.slot), loadout: av.info.loadout };
  });
  assert(carried.loadout.length === 2 && carried.n === 2 && carried.held === 0 && carried.slotted.length === 2, `remote avatar carries its loadout (${JSON.stringify(carried)})`);

  console.log('client hit is validated by the host and credited');
  // a humanoid on the ground (dogs and drones vary with the squads)
  const victim = await GB(() => {
    const ps = [...window.__app.current.net.puppets.values()];
    return (ps.find((p) => p.def.kind === 'grunt' || p.def.kind === 'runner') ?? ps[0]).id;
  });
  // a shot from far away must be rejected (step 09: drawn, so the host's validation, not the holster gate, refuses it)
  await GB(() => { window.__app.current.player.forceAds = true; });
  await until(A, () => [...window.__app.current.net.remotes.values()].some((r) => r.state?.mv?.dw === 2), null, 5000, 'host sees the client drawn');
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
  // (step 09, D8) no hip fire on the host: a client shot while holstered is refused (the host enemy keeps its hp)
  await GB(() => { window.__app.current.player.forceAds = false; });
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state?.mv?.dw === 0), null, 5000, 'host sees the client holstered').catch(async (e) => {
    // (anim-cleanup) which side holds the draw: the client's own draw state and sim, or the host's copy of it
    const cl = await GB(() => { const g = window.__app.current; const w = g.weapons; return { dw: w.drawPhase, prog: w.draw.progress, ads: g.player.ads, alive: g.player.alive, swapT: w['swapT'], swapPhase: w['swapPhase'], reloadT: w['reloadT'], stowed: w.isStowed, lock: w['drawLock'], busy: w.handsBusy, hand: g.player.rig.weaponHand }; }).catch((x) => String(x));
    const ho = await GA(() => [...window.__app.current.net.remotes.values()].map((r) => ({ mv: r.state?.mv ? { m: r.state.mv.m, dw: r.state.mv.dw, sub: r.state.mv.sub } : null, alive: r.alive, viol: r.violations }))).catch((x) => String(x));
    // is each sim stepping at all: its clock half a second apart, and anything that stops it (paused, ended, a menu,
    // the loop's manual mode, a hidden page)
    const live = async (page) => {
      const snap = () => page.evaluate(() => { const g = window.__app.current; const l = window.__app.loop; return { t: g.time, paused: g['paused'], menu: g['menuOpen'], ended: g['ended'], exited: g['exited'], loopPaused: l.paused, manual: l.manual, steps: l.stats?.steps, vis: document.visibilityState, screens: [...document.querySelectorAll('.screens > *')].map((el) => el.className).join('|') }; });
      const a = await snap();
      await wait(500);
      const b = await snap();
      return { ...b, t0: a.t, t1: b.t };
    };
    const lc = await live(B).catch((x) => String(x));
    const lh = await live(A).catch((x) => String(x));
    console.log(`    client ${JSON.stringify(cl)}\n    host ${JSON.stringify(ho)}\n    client sim ${JSON.stringify(lc)}\n    host sim ${JSON.stringify(lh)}\n    client errors ${JSON.stringify(eB.slice(-5))}\n    host errors ${JSON.stringify(eA.slice(-5))}`);
    throw e;
  });
  {
    await GA(() => {
      for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(2);
    });
    const hostHp = (id) => GA((v) => window.__app.current.enemyMgr.enemies.find((e) => e.id === v)?.health.hp ?? -1, id);
    const hp0 = await hostHp(victim);
    const dw = await GB((id) => {
      const g = window.__app.current;
      const p = g.net.puppets.get(id);
      if (!p) return -1;
      const src = g.player.position.add(new p.pos.constructor(0, 1.58, 0));
      const pt = p.center(new p.pos.constructor());
      p.applyDamage({ amount: 40, point: pt, dir: pt.subtract(src).normalize(), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', weapon: 'rifle', sourcePos: src, impulse: 3 });
      return g.weapons.drawPhase;
    }, victim);
    await wait(600);
    const hp1 = await hostHp(victim);
    assert(dw === 0 && hp1 === hp0, `a client shot while holstered is refused by the host (dw ${dw}, hp ${hp0} -> ${hp1})`);
  }
  // aim (drawn) for the shots that count
  await GB(() => { window.__app.current.player.forceAds = true; });
  await until(A, () => [...window.__app.current.net.remotes.values()].some((r) => r.state?.mv?.dw === 2), null, 5000, 'host sees the client drawn');
  await until(A, () => { const av = window.__app.current.net.remotes.values().next().value.avatar; const ms = [...av['models'].values()]; return ms.filter((m) => m.slot === null && m.node.isEnabled()).length === 1 && ms.filter((m) => m.slot !== null && m.node.isEnabled()).length === 1; }, null, 3000, 'drawn: one weapon in the remote avatar\'s hands, the other slotted');
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
  await GB(() => { window.__app.current.player.forceAds = false; });
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

  console.log('team wipe ends the match; client gets results');
  await GA(() => {
    const g = window.__app.current;
    const r = g.net.remotes.values().next().value;
    // the mission's last life: the wipe fails it
    g.mode.lives = 1;
    const kill = (t, p) => { t.damageMul = 1; t.applyDamage({ amount: 9999, point: p.clone(), dir: p.clone(), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'x', sourcePos: p.clone(), impulse: 0 }); };
    kill(r, r.feet);
    kill(g.target, g.player.position);
  });
  await until(A, () => !!document.querySelector('.results-screen'), null, 15000, 'host results');
  await until(B, () => !!document.querySelector('.results-screen'), null, 15000, 'client results');
  const res = await GB(() => ({ kills: window.__app.current.stats.kills, title: document.querySelector('.results-title')?.textContent, rewards: !!document.querySelector('.results-screen .rewards, .results-screen .rewards-panel') }));
  assert(res.title === 'DEFEAT' && res.kills >= 1, `client results from host stats (${JSON.stringify(res)})`);
  assert(!res.rewards, 'no rewards panel: the economy is parked (legacy off)');

  console.log('back to lobby');
  await A.click('.results-screen .btn:has-text("Play again")');
  await until(A, () => !!document.querySelector('.lobby-screen') && window.__coop.session.phase === 'lobby', null, 15000, 'host back in lobby');
  await until(B, () => !!document.querySelector('.lobby-screen'), null, 15000, 'client follows host to lobby');
  const reset = await GA(() => [...window.__coop.session.players.values()].filter((p) => !p.host && p.ready).length);
  assert(reset === 0, 'returning to the lobby clears ready states');
  assert(true, 'client follows the host back to the lobby');

  const pages = () => [A, B];
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

  console.log('co-op on the guards: calm puppets, doors, mirrored items, a client takedown, a client revive');
  await startMode(...MISSION);
  await GA(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
  await until(B, () => window.__app.current.net.puppets.size > 0, null, 15000, 'guard puppets on the client');
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
  // (locomotion step 10) a client elbow strike: approved by the host, the knock-out applied on the host's guard and
  // the client's puppet; a strike on a guard the host already holds is refused (cdeny), no knock-out
  const skv = await GB((no) => [...window.__app.current.net.puppets.values()].find((p) => p.alive && p.id !== no && p.def.kind === 'grunt')?.id ?? '', tdv);
  assert(!!skv, `a second calm guard for the strike (${skv})`);
  const pinSk = (id) => GA((id) => {
    const g = window.__app.current;
    for (const e of g.enemyMgr.enemies) e['stagger'] = 99;
    for (const r of g.net.remotes.values()) r.allowTeleport(1);
    const v = g.enemyMgr.enemies.find((e) => e.id === id);
    if (v?.alive && !v.taken) {
      v.pos.set(8, 0, -6);
      v.yaw = 0;
    }
  }, id);
  await pinSk(skv);
  await wait(600);
  await moveClient(B, 8, 0.1, -6.9, 0);
  let skKo = false;
  let skInfo = '';
  for (let attempt = 0; attempt < 6 && !skKo; attempt++) {
    // (step 10 check) a retry only after the client's strike ended and the host's record of it cleared
    if (attempt > 0) {
      await until(B, () => !window.__app.current.strike.active, null, 5000, 'client strike ended').catch(() => {});
      await until(A, () => window.__app.current.net['strikes'].size === 0, null, 10000, 'host strike record cleared').catch(() => {});
    }
    await pinSk(skv);
    skInfo = await GB((id) => {
      const g = window.__app.current;
      g.player.cam.yaw = 0;
      if (g.strike.active) return `busy ${JSON.stringify(g.strike.count)} ${g.strike.lastDenied} t ${g.strike.t.toFixed(2)} ok ${g.strike.approved}`;
      const t = g.strike.pickTarget();
      g.strike.begin();
      return `target ${t || 'none'} want ${id} ${JSON.stringify(g.strike.count)} ${g.strike.lastDenied}`;
    }, skv);
    for (let i = 0; i < 8 && !skKo; i++) {
      await wait(300);
      await pinSk(skv);
      skKo = await GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return !e || (!e.alive && e.ko); }, skv);
    }
  }
  const hostSk = await GA(() => ({ last: window.__app.current.net.lastCommit, n: window.__app.current.strike.count }));
  assert(skKo, `a client elbow strike knocks the host's guard out (${skInfo}; host ${JSON.stringify(hostSk)})`);
  await until(B, (id) => { const p = window.__app.current.net.puppets.get(id); return !p || !p.alive; }, skv, 8000, 'client puppet down');
  assert(true, 'the strike knock-out reaches the client puppet');
  // denied: the host seizes the target first
  const skd = await GB((no) => [...window.__app.current.net.puppets.values()].find((p) => p.alive && !no.includes(p.id) && p.def.kind === 'grunt')?.id ?? '', [tdv, skv]);
  if (skd) {
    await GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); e.pos.set(8, 0, -6); e.yaw = 0; e.taken = true; }, skd);
    await wait(1200);
    // (the host's sim runs slow under software GL: its record of the last strike ends 0.9 s of host time after t0)
    await until(A, () => window.__app.current.net['strikes'].size === 0, null, 10000, 'host strike record ends');
    const d0 = await GB(() => window.__app.current.strike.count.denied);
    await GB((id) => window.__app.current.strike.begin(id), skd);
    await until(B, (n) => window.__app.current.strike.count.denied > n && !window.__app.current.strike.active, d0, 5000, 'client strike denied');
    const dn = await GB(() => ({ why: window.__app.current.strike.lastDenied, back: window.__app.current.strike.lastBackT }));
    const alive = await GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); e.taken = false; return e.alive; }, skd);
    const hl = await GA(() => window.__app.current.net.lastCommit);
    assert(dn.why === 'noTarget' && alive && dn.back <= 0.3, `a strike on a guard the host holds: refused (${dn.why}; host ${hl}), no knock-out, back in ${dn.back.toFixed(2)} s`);
  }
  // pings: the client marks a spot, the host shows it in the client's colour
  const clientId = await GB(() => window.__coop.session.selfId);
  await GB(() => window.__app.current.net.ping(6, 0.5, -3, ''));
  await until(A, (id) => window.__app.current.pings.some((p) => p.by === id), clientId, 5000, 'host shows the client ping');
  assert(true, 'a client ping reaches the host');
  await GA(() => window.__app.current.net.ping(4, 0.5, -3, ''));
  await until(B, (id) => window.__app.current.pings.some((p) => p.by === id), hostId0, 5000, 'client shows the host ping');
  assert(true, 'a host ping reaches the client');
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
  // (3.2.0 phase 4) a client grab: the host holds its guard in front of the client (a shield there), then a tap
  // knocks him out. (3.6: the gas cloud above is cleared first on both sides - the grab spot is inside its 3.6 m, a
  // guard breathing it is knocked out in 0.8 s, racing the grab; the cloud lasts 6 s of sim time, far longer than
  // that in wall time at software-GL frame rates)
  for (const P of [A, B]) {
    await P.evaluate(() => {
      const g = window.__app.current;
      g.gadgets.clouds.length = 0;
      for (const e of g.enemyMgr?.enemies ?? []) e.gas = 0;
    });
  }
  // (3.6: the guard is chosen on the host - the client's puppets can still show one the host has just removed, the
  // gassed guard knocked out a moment ago - then the client waits for its puppet)
  // (diagnosis: every host kill / knock-out from here on, dumped if the grab fails)
  await GA(() => {
    const em = window.__app.current.enemyMgr;
    const prev = em.onKilled;
    window.__kills = [];
    em.onKilled = (e, h) => {
      window.__kills.push({ id: e.id, ko: !!e.ko, kind: h.kind, part: h.part, by: h.attackerId, team: h.attackerTeam, t: window.__app.current.net?.time });
      prev?.(e, h);
    };
  });
  // (a plain grunt, never the guard the gas cloud above is putting to sleep: the match's guards are a different mix each run, and a drone
  // operator or an enforcer is taken differently - the grab from behind is the grunt's)
  const gg = await GA((gv) => {
    const guards = window.__app.current.enemyMgr.enemies.filter((e) => e.alive && !e.taken && !e.ko && !e.dog && e.def.kind !== 'dog' && e.id !== gv);
    return (guards.find((e) => e.def.kind === 'grunt') ?? guards[0])?.id ?? '';
  }, gv);
  if (gg) await until(B, (id) => { const p = window.__app.current.net.puppets.get(id); return !!p && p.alive; }, gg, 15000, 'the client has the chosen guard');
  if (gg) {
    let grabbed = false;
    for (let attempt = 0; attempt < 6 && !grabbed; attempt++) {
      await GA((id) => {
        const g = window.__app.current;
        for (const r of g.net.remotes.values()) r.allowTeleport(2);
        // (3.6: the checks above - a gas cloud - can leave guards in combat having spotted the client, and a
        // guard in combat who knows an operator is there cannot be taken by surprise (by design): calm the host first)
        for (const e of g.enemyMgr.enemies) e.aware.set('unaware');
        for (const r of g.net.remotes.values()) r.ref.spotted = false;
        const v = g.enemyMgr.enemies.find((e) => e.id === id);
        if (v?.alive && !v.taken) {
          // (a statue while the client lines up: the guard's brain is off - the match's guards re-alert at once after the steps above, turn round
          // and offer the front takedown, which is a race the test cannot win by calming them. The grab, the hold and the knock-out are
          // the real code: his brain is back on as soon as the grab is held)
          v.update = () => {};
          v['stagger'] = 99;
          v.pos.set(6, 0, -6);
          v.yaw = 0;
        }
      }, gg);
      await moveClient(B, 6, 0.1, -7.1, 0);
      for (let i = 0; i < 30 && !grabbed; i++) {
        grabbed = await GB((id) => {
          const g = window.__app.current;
          // (only the offer from behind is taken: a guard who turned round in the instant before offers the front takedown, a knock-out, not a grab)
          if (g.takedown.offer?.e.id === id && g.takedown.offer.plan.kind === 'behind' && !g.takedown.active) g.takedown.start();
          return g.takedown.hostage?.id === id;
        }, gg);
        if (!grabbed) await wait(150);
      }
    }
    if (!grabbed) {
      console.log('    host:', await GA((id) => { const g = window.__app.current; const e = g.enemyMgr.enemies.find((x) => x.id === id); const r = g.net.remotes.values().next().value; return JSON.stringify({ found: !!e, alive: e?.alive, taken: e?.taken, ko: e?.ko, level: e?.level, gas: e?.gas, stagger: e?.['stagger'], pos: e && [e.pos.x, e.pos.z], yaw: e?.yaw, client: [r.feet.x, r.feet.z], mv: r.state?.mv?.m }); }, gg));
      console.log('    host kills since the pick:', gg, await GA(() => JSON.stringify(window.__kills)));
      console.log('    client:', await GB((id) => { const g = window.__app.current; const p = g.net.puppets.get(id); const o = g.takedown.offer; return JSON.stringify({ puppet: p && { pos: [p.pos.x, p.pos.z], yaw: p.yaw, alive: p.alive, taken: p.taken, level: p.level }, me: [g.player.position.x, g.player.position.z], yaw: g.player.cam.yaw, offer: o ? { id: o.e.id, kind: o.plan?.kind } : null, active: g.takedown.active, hostage: g.takedown.hostage?.id ?? null, alive: g.player.alive, move: g.player.controller.motion.state }); }, gg));
    }
    await GA((id) => { const v = window.__app.current.enemyMgr.enemies.find((e) => e.id === id); if (v) delete v.update; }, gg);
    assert(grabbed, 'client grabs a host guard from behind');
    await until(A, (id) => { const g = window.__app.current; const r = [...g.net.remotes.values()][0]; return r.state?.mv?.m === 'grab' && r.ref.shield?.id === id; }, gg, 8000, 'host sees the grab');
    const held = await GA((id) => {
      const g = window.__app.current;
      const r = [...g.net.remotes.values()][0];
      const e = g.enemyMgr.enemies.find((x) => x.id === id);
      const yaw = r.state.yaw;
      return Math.hypot(e.pos.x - (r.feet.x + Math.sin(yaw) * 0.42), e.pos.z - (r.feet.z + Math.cos(yaw) * 0.42));
    }, gg);
    assert(held < 0.25, `the host holds its guard in front of the client (${held.toFixed(2)} m)`);
    // (A4: the CT grab menu opens on the client; Knock out is the first entry, A picks it)
    await until(B, () => window.__app.current.grabMenu.open, null, 4000, 'the client grab menu opens');
    await GB(() => { window.__app.current.grabMenu.sel = 0; window.__app.input.state.tap('interact'); });
    await until(A, (id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return !e || (!e.alive && e.ko); }, gg, 8000, 'host knocks the grabbed guard out');
    assert(true, "the grab menu's Knock out knocks the client's hostage out on the host");
  }
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
  console.log("difficulty (G106: fixed levels): the host's level reaches the client lobby read-only and runs the match on both");
  {
    await GA((m) => window.__coop.session.setSettings(m[0], m[1], 'realistic', m[2]), MISSION);
    await until(B, () => window.__coop.session.difficulty === 'realistic', null, 8000, 'the level reaches the client');
    await until(B, () => /Realistic/.test(document.querySelector('.lobby-screen')?.textContent ?? ''), null, 8000, 'the client lobby row shows the host level');
    const ro = await GB(() => !document.querySelector('.lobby-screen [data-diff]'));
    assert(ro, 'the client lobby shows the host level read-only');
    for (const P of pages().slice(1)) await P.evaluate(() => window.__coop.session.setReady(true));
    await until(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready');
    await GA(() => window.__coop.session.startMatch());
    await until(A, () => !!window.__app.current?.enemyMgr && !!window.__app.current.net, null, 40000, 'host match up');
    await until(B, () => !!window.__app.current?.net, null, 40000, 'client match up');
    const hd = await GA(() => { const d = window.__app.current.enemyMgr.diff; return { p: d.perception, t: d.reaction, l: d.label }; });
    assert(hd.p === 1.3 && hd.t === 0.8 && hd.l === 'Realistic', `the host's manager runs Realistic (${JSON.stringify(hd)})`);
    const cd = await GB(() => ({ p: window.__app.current.diff.perception, l: window.__app.current.diff.label }));
    assert(cd.p === 1.3 && cd.l === 'Realistic', `the client's match takes the host's level (${JSON.stringify(cd)})`);
    await toLobby();
    await GA((m) => window.__coop.session.setSettings(m[0], m[1], 'normal', m[2]), MISSION);
  }

  console.log('infiltration co-op: the mission and its objectives reach the client');
  await startMode('infiltration', 'warehouse', 'warehouse-ledger');
  const inf = await GB(() => ({ map: window.__app.current.world.map.id, mode: window.__app.current.opts.mode }));
  assert(inf.map === 'warehouse' && inf.mode === 'infiltration', `client on the mission's map (${JSON.stringify(inf)})`);
  await until(B, () => (window.__app.current.interactables?.items ?? []).some((i) => i.kind !== 'door' && i.kind !== 'revive'), null, 10000, 'objective items on the client');
  // (coop-fix) the host's mission objective, not the connecting placeholder (polled: a stalled host shows the waiting notice until its next snapshot)
  await until(B, () => { const t = window.__app.current.hud.objectiveText; return t.length > 0 && !/Connecting to host|Waiting for host/.test(t); }, null, 10000, 'the mission objective on the client');
  const obj = await GB(() => window.__app.current.hud.objectiveText);
  assert(!/Connecting to host/.test(obj) && obj.length > 0, `client sees the mission's objectives (${obj})`);
  await toLobby();

  // (co-op test fix) no third player: co-op is two players (G2); the door peek is checked on the host
  // (locomotion step 13) a client's door crack is host-authoritative: it shows on the host (the snapshot's dcr), and its
  // close clears it
  console.log('door peek: a client crack shows on the host; close clears it');
  await startMode('sandbox', 'proving');
  // (coop-fix) Free Roam sets its objective before the host's HUD hook: the hook's seed carries it to the client
  await until(B, () => /Free roam/.test(window.__app.current.hud.objectiveText), null, 10000, 'the Free Roam objective on the client');
  assert(true, 'the client shows the Free Roam objective');
  const dpos = await GB(() => {
    const d = window.__app.current.world.doors.list[0];
    if (!d) return null;
    const an = d.anchor;
    const nx = Math.cos(an.yaw);
    const nz = -Math.sin(an.yaw);
    return [an.hinge.x + Math.sin(an.yaw) * an.width * 0.5 + nx * 0.7, an.hinge.y + 0.05, an.hinge.z + Math.cos(an.yaw) * an.width * 0.5 + nz * 0.7, Math.atan2(-nx, -nz)];
  });
  assert(!!dpos, 'Proving has a door');
  await moveClient(B, dpos[0], dpos[1], dpos[2], dpos[3]);
  await GB((yaw) => { const c = window.__app.current.player.cam; c.yaw = yaw; c.pitch = 0; const tap = (a) => window.__app.input.state.tap(a); /* (A3) door menu: A, one down, A = Stealth open */ setTimeout(() => tap('interact'), 400); setTimeout(() => tap('uiDown'), 900); setTimeout(() => tap('interact'), 1400); }, dpos[3]);
  await until(B, () => window.__app.current.doorPeek.phase !== 'off', null, 5000, 'client starts the peek');
  const cracked = (P) => until(P, () => { const d = window.__app.current.world.doors.list[0]; return d.cracked && d.target === 0 && d.ajar > 0.06; }, null, 10000, 'the door cracked');
  await cracked(A);
  const dcA = await GA(() => { const d = window.__app.current.world.doors.list[0]; return { cracked: d.cracked, ajar: d.ajar, target: d.target }; });
  assert(dcA.cracked && dcA.target === 0, `the client's crack shows on the host (${JSON.stringify(dcA)})`);
  await until(B, () => window.__app.current.doorPeek.phase === 'peek', null, 5000, 'client peeking');
  await GB(() => { window.__pad.connect(); window.__pad.axis(1, 1); });
  await until(B, () => window.__app.current.doorPeek.phase !== 'peek', null, 5000, 'client closes the crack (stick back)');
  await GB(() => window.__pad.axis(1, 0));
  const shut = (P) => until(P, () => { const d = window.__app.current.world.doors.list[0]; return !d.cracked && d.ajar < 0.01; }, null, 10000, 'the crack closed');
  await shut(A);
  assert(true, 'closing clears the crack on the host');
  // wall medkit stations (G20 / G98; carried kits are gone): a client uses the host's station, the host heals its
  // host-authoritative health (G119 / G180: by difficulty, full on Normal; `stationHeal`), the client mirrors it and both
  // pages show the station spent. (co-op test fix: the check read +40, the number before G180)
  console.log('wall medkit station: the host heals a client, shown spent on both pages');
  {
    // (the remote the host runs for this client, by its id)
    await GA((id) => { window.__bid = id; }, await GB(() => window.__app.current.net.s.selfId));
    await GA(() => { const r = window.__app.current.net.remotes.get(window.__bid); r.health.hp = 50; });
    await until(B, () => Math.abs(window.__app.current.target.health.hp - 50) < 0.01, null, 8000, 'client mirrors 50 hp');
    // a wall medkit next to the client (the station Proving places, added on this map by hand)
    await GA(() => {
      const g = window.__app.current;
      const r = g.net.remotes.get(window.__bid);
      const it = g.interactables.add('medkit-e2e', 'medkitWall', r.feet.clone().addInPlaceFromFloats(0.5, 0, 0), 'Medkit station', 0.6, 0);
      g.interactables.setEnabled(it, true);
      it.onUse = (x, who) => g['useWallMedkit'](x, who ?? 'local');
    });
    await until(B, () => !!window.__app.current.interactables?.items.find((i) => i.id === 'medkit-e2e' && i.enabled), null, 8000, 'client mirrors the wall medkit');
    await GB(() => window.__app.current.interactables.items.find((i) => i.id === 'medkit-e2e').onUse());
    await until(A, () => { const g = window.__app.current; const r = g.net.remotes.get(window.__bid); const it = g.interactables.items.find((i) => i.id === 'medkit-e2e'); return r.health.hp >= r.health.maxHp - 0.01 && it.done && !it.enabled; }, null, 8000, 'host: the client healed to full (Normal), the station spent');
    await until(B, () => { const g = window.__app.current; const it = g.interactables.items.find((i) => i.id === 'medkit-e2e'); const h = g.target.health; return h.hp >= h.maxHp - 0.01 && (!it || !it.enabled); }, null, 8000, 'client: full health, the station shown spent');
    await GA(() => { const r = window.__app.current.net.remotes.get(window.__bid); r.health.hp = 100; });
    assert(true, 'a client at a wall medkit is healed by the host (full on Normal, mirrored) and the station shows spent on both pages');
  }

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
  errs.push(...eA, ...eB);
  await browser.close();
}

console.log('offline state');
{
  const { browser: br, ctx: c2, page, errors } = await launch({ url, params: '' });
  try {
    // (operators 11e, A104) an offline player has the service worker from an earlier online visit: the co-op screen is a
    // lazy chunk only the worker can serve offline. Wait for it to control the page (the old player body's build used
    // to delay the menu past the worker's claim; Wren loads async and the menu is up ~200 ms before it)
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      for (let i = 0; i < 200 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 50));
    });
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
