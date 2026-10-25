// Coop: two pages in one browser context over the BroadcastChannel transport (?net=local).
// Lobby (host, join by typed code, ready-up by controller), match start, snapshot replication,
// a host guard's flashlight on, then off, on the client (coop-torches), host-validated client hits + kill credit,
// downed/revive, results, back to lobby, guards and doors in co-op,
// difficulty, (hang-down) the hanging joiner's pistol, grab and neck snap, a course restart at the checkpoint while a guard
// is held (Marlow Yard), a door peek and a wall medkit in Free Roam, host leaving, malformed messages, and the offline
// state. (guard-ai S9) The guard-ai state on the client: alarm stage gear, a bark, caution, a shield-led response team
// and a client deflect (helmet off on both screens). (guard-ai S23) Every player is seen: a calm guard spots the client
// in his light while the host hides nearer behind a wall, and in combat keeps his target and line on the client.
// (guard-ai S24) Two intruders: two guard pairs each hunt the player they saw, and close on his last known position only.
// (coop4 AI6) Four pages: three intruders (each guard pair hunts the player it saw, a client leaves and rejoins into his slot, a crouch-walk is silent and a run is heard), reading guard-ai #319's hooks (SKIP when absent).
// (guard-models G9, M3) A guard's look seed (and, with E2E_GUARDMODELS=1, his visible pieces) is equal on the host and
// the client; after a course bay restart the same slot has the same seed on both; the helmet bit drops on both.
// (co-op test fix, process audit section 2) The pages open legacy-off: the matches are Infiltration (the Ledger
// mission on the Warehouse: guards, and detection costs only a bonus) and Free Roam, no Hunter. Two players only (G2).
// Waits are e2e-net-lib's, on both pages' sim clocks: the sim runs slower than real time on software GL.
import { launch, openPage, frames, press, BTN, assert } from './e2e-lib.mjs';
import { until as untilNet, waitSim, waitHostSim, setSimPages, hostAndJoin, LOAD_MS, LOAD_MS_4, eachPage, pumpPages, onHostStep, offHostStep } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
// (guard-models G9) `E2E_GUARDMODELS=1` runs both pages with `?guardmodels=1` (the flag is default off until G8): the guard figures
// exist, so the visible-piece asserts run. Without it only the look seed asserts run (the seed rides the wire either way).
const GM = process.env.E2E_GUARDMODELS === '1';
const NET = GM ? 'net=local&guardmodels=1' : 'net=local';
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
    const st = await page.evaluate(() => { const c = window.__app.current; return { state: c?.constructor?.name, mode: c?.opts?.mode, map: c?.opts?.map, net: !!c?.net, ended: c?.isEnded, inGame: window.__coop?.inGame, screens: [...document.querySelectorAll('.screens > *')].map((e) => e.className).join('|'), dialog: document.querySelector('.dialog-screen .dialog')?.textContent ?? '' }; }).catch((x) => String(x));
    throw new Error(`${e.message} (${JSON.stringify(st)})`);
  }
}

// (the default 1280 x 640 window: the lobby is clicked, and the menus lay out at 1280 x 720 at least, so a smaller
// window puts "Start mission" outside it)
const { browser, ctx, page: A, errors: eA } = await launch({ url, params: NET });
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
  const opened = await openPage(ctx, url, NET);
  B = opened.page;
  eB = opened.errors;
  setSimPages([A, B]);
  const GB = (f, a) => B.evaluate(f, a);
  await B.click('.main-menu .btn:has-text("Co-op")');
  // (server browser, prototype) the host's Room row (default Private) set Public lists the room under Browse rooms, live,
  // on the same relays (here the local test relay); full, it leaves the list
  console.log('server browser: a public room shows in Browse rooms; full, it leaves the list');
  const roomRow = '.lobby-opts .row-choice:has-text("Room")';
  const rv0 = (await A.textContent(`${roomRow} .choice-val`)) ?? '';
  assert(/Private/.test(rv0) && (await GA(() => !window.__coop.isPublic)), `a new room is Private (${rv0})`);
  await A.click(`${roomRow} .choice-arrow >> nth=1`);
  await until(A, () => window.__coop.isPublic && !!window.__coop.dir?.posted, null, 15000, 'the public room posts its notice');
  await B.click('.btn:has-text("Browse rooms")');
  await until(B, (c) => /1 \/ 2/.test(document.querySelector(`.browse-screen [data-key="room-${c}"]`)?.textContent ?? ''), code, 20000, 'Browse rooms lists the public room (1 / 2)');
  const listed = await GB((c) => document.querySelector(`.browse-screen [data-key="room-${c}"]`)?.textContent ?? '', code);
  assert(listed.includes(code) && /Marlow Yard|ctcourse/.test(listed), `the listed room names its code and map (${listed})`);
  await B.keyboard.press('Escape');
  await until(B, () => !!document.querySelector('.coop-screen:not(.browse-screen) [data-key="join"]'), null, 8000, 'back to the co-op menu');
  await B.click('.btn:has-text("Join with code")');
  await B.keyboard.type(code.toLowerCase());
  const typed = await GB(() => [...document.querySelectorAll('.code-slot')].map((s) => s.textContent).join(''));
  assert(typed === code, `keypad shows typed code (${typed})`);
  await B.keyboard.press('Enter');
  await until(B, () => window.__coop?.session.hostId && window.__coop.session.players.size === 2, null, 15000, 'client sees host lobby');
  await until(A, () => window.__coop.session.players.size === 2, null, 5000, 'host sees client');
  await until(A, () => window.__coop.isPublic && window.__coop.dir?.posted === '', null, 8000, 'the full room leaves the list (gone)');
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
  await until(A, () => window.__app.current?.net && window.__app.current.enemyMgr, null, LOAD_MS, 'host match');
  await until(B, () => window.__app.current?.net && window.__app.current.puppet, null, LOAD_MS, 'client match');
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

  // (guard-models G9, M3) a guard's look seed (the 7 bits of `al`) is the host's `Enemy.look` on the client's puppet, and
  // with the figures on the same pieces are visible on both
  console.log("guard-models: a guard's look seed and visible pieces are equal on host and client");
  {
    const hostList = await GA(() => window.__app.current.enemyMgr.enemies.filter((e) => e.alive && !e.def.quadruped)
      .map((e) => ({ id: e.id, look: e.look, pieces: e['gbody']?.shownPieces().slice().sort() ?? null })));
    assert(hostList.length > 0 && hostList.every((h) => Number.isInteger(h.look) && h.look >= 0 && h.look <= 127), `every host guard has a 7-bit look seed (${hostList.length})`);
    if (hostList.length >= 3) assert(new Set(hostList.map((h) => h.look)).size > 1, `the seeds differ between the host's guards (${hostList.map((h) => h.look)})`);
    // matched by id; a puppet not built yet is skipped, and at least one must match
    const cmp = (list) => {
      const nets = window.__app.current.net.puppets;
      let n = 0;
      const bad = [];
      for (const h of list) {
        const q = nets.get(h.id);
        if (!q) continue;
        n++;
        if (q.look !== h.look) bad.push(`${h.id} seed ${h.look} / ${q.look}`);
        else if (h.pieces && JSON.stringify(q.shownPieces?.slice().sort() ?? null) !== JSON.stringify(h.pieces)) bad.push(`${h.id} pieces ${h.pieces} / ${q.shownPieces}`);
      }
      return { n, bad, ok: n > 0 && bad.length === 0 };
    };
    const ok = await until(B, `(l) => (${cmp})(l).ok`, hostList, 10000, 'client puppets carry the host look seeds').then(() => true, () => false);
    const res = await B.evaluate(`(${cmp})(${JSON.stringify(hostList)})`);
    assert(ok && res.n > 0 && res.bad.length === 0, `the client's puppets carry the host's look seeds${hostList.some((h) => h.pieces) ? ' and the same visible pieces' : ''} (${res.n} compared; ${res.bad.slice(0, 3).join('; ')})`);
    if (GM) assert(hostList.some((h) => h.pieces), 'guardmodels=1: the host guards have figures (shown pieces are tracked)');
  }

  // (coop-torches) a guard's flashlight crosses the wire: the host's test hook forces one guard's torch rule on, the
  // client lights a slot at his shown head, aimed where he faces (its light field lit along the beam), then the hook
  // forces it off and the client's slot goes dark
  console.log("a host guard's torch shows on the client, then goes off");
  const slotsB = await GB(() => window.__app.current.net.torches.slots.length);
  assert(slotsB > 0, `the dark Warehouse has flashlight slots on the client (${slotsB})`);
  const lamp = await GA(() => {
    const em = window.__app.current.enemyMgr;
    const e = em.enemies.find((x) => x.alive && !x.def.quadruped);
    if (!e) return '';
    e.torchOverride = true;
    return e.id;
  });
  assert(lamp !== '', 'a human guard to light');
  if (lamp) {
    const onA = await until(A, (id) => { const em = window.__app.current.enemyMgr; const e = em.enemies.find((x) => x.id === id); return !!e && em.hasTorch(e); }, lamp, 5000, 'host torch on').then(() => true, () => false);
    const onB = await until(B, (id) => window.__app.current.net.torches.slotOf(id)?.on === true, lamp, 10000, 'client torch on').then(() => true, () => false);
    const shown = await GB((id) => {
      const g = window.__app.current;
      const p = g.net.puppets.get(id);
      const l = g.net.torches.slotOf(id);
      if (!p || !l || !l.cone) return null;
      const c = l.cone;
      const lit = g.world.lightField.dynamicAt(l.x + c.dx * 2, l.y + c.dy * 2, l.z + c.dz * 2);
      return { d: Math.hypot(l.x - p.pos.x, l.z - p.pos.z), dy: l.y - p.pos.y, yaw: Math.atan2(c.dx, c.dz) - p.yaw, lit, on: l.on };
    }, lamp);
    const yawOk = shown && Math.abs(Math.atan2(Math.sin(shown.yaw), Math.cos(shown.yaw))) < 0.05;
    assert(onA && onB && !!shown && shown.d < 0.6 && shown.dy > 0.8 && yawOk && shown.lit > 0.05, `the client lights the guard's torch at his head, aimed where he faces (${JSON.stringify({ onA, onB, shown })})`);
    await GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); if (e) e.torchOverride = false; }, lamp);
    const offA = await until(A, (id) => { const em = window.__app.current.enemyMgr; const e = em.enemies.find((x) => x.id === id); return !e || !em.hasTorch(e); }, lamp, 5000, 'host torch off').then(() => true, () => false);
    const offB = await until(B, (id) => window.__app.current.net.torches.slotOf(id) === null, lamp, 10000, 'client torch off').then(() => true, () => false);
    assert(offA && offB, `the guard's torch goes off on the client when the host's does (host ${offA}, client ${offB})`);
    // back to the torch rule for the rest of the run
    await GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); if (e) e.torchOverride = null; }, lamp);
  }
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
  assert(!/Connecting to host|Waiting for host/.test(objIn), `connecting label gone once in game (${objIn})`);
  // (hud-guidance B3, HG9) the notice rode its own net-status line and is gone (polled: a stall shows "Waiting for host")
  await until(B, () => window.__app.current.hud.netStatusText === '', null, 10000, 'net-status line empty once in game (HG9)');
  // (G339) the partner dot lived on the minimap: the client draws no minimap or compass
  assert(await GB(() => !document.querySelector('.hud-minimap, .minimap, .hud-compass')), 'no minimap or compass (G339)');
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

  // (guard-ai S9, protocol 41) the guard-ai state reaches the client: the alarm stage's gear (armour + helmet) on the
  // puppets, a host guard's radio line shown on the client word for word, a cautious guard's caution bit, a shield-led
  // response team with the shield and the lead's helmet, and a client round on a helmet: predicted and confirmed as a
  // deflect, the helmet off his head and on the floor on both screens
  console.log('guard-ai S9: stage gear, a bark, caution, a shield-led team and a deflect on the client');
  {
    const geared = await GA(() => {
      const em = window.__app.current.enemyMgr;
      em.setAlarmStage(3);
      const e = em.enemies.find((x) => x.alive && !x.def.quadruped && x.def.kind !== 'heavy' && x.def.kind !== 'enforcer');
      return e ? { id: e.id, helmet: e.helmet, armour: e.armour, key: e.key } : null;
    });
    assert(!!geared && geared.helmet && geared.armour, `alarm stage 3 puts armour and a helmet on the host's guard (${JSON.stringify(geared)})`);
    const gid = geared?.id ?? '';
    const gearB = await until(B, (id) => { const s = window.__app.current.net.puppets.get(id)?.gearShown; return !!s && s.helmet && s.armour; }, gid, 10000, 'client puppet wears the stage gear').then(() => true, () => false);
    assert(gearB, `the client's puppet shows the stage gear (${JSON.stringify(await GB((id) => window.__app.current.net.puppets.get(id)?.gearShown ?? null, gid))})`);

    // a radio line (the missed check naming unit three): the client shows the host's exact text
    const said = await GA((id) => {
      const g = window.__app.current;
      g.enemyMgr.enemies.find((x) => x.id === id)?.bark('missed', 3);
      return g.hud.barks.shown.find((l) => l.includes('three')) ?? '';
    }, gid);
    assert(said !== '', `the host shows the guard's line (${said})`);
    const heard = await until(B, (l) => window.__app.current.hud.barks.shown.includes(l) || window.__app.current.hud.barks.subtitle.endsWith(l), said, 5000, 'client shows the bark').then(() => true, () => false);
    assert(heard, `the client shows the host guard's radio line (${JSON.stringify({ said, client: await GB(() => ({ shown: window.__app.current.hud.barks.shown, sub: window.__app.current.hud.barks.subtitle, n: window.__app.current.net.barksShown })) })})`);

    // caution (S14's timed section alert on one guard): the caution bit reaches his puppet (calm: the low ready)
    const cid = await GA(() => {
      const em = window.__app.current.enemyMgr;
      const e = em.enemies.find((x) => x.alive && x.key >= 0 && !x.def.quadruped);
      if (!e) return '';
      em.awareness.timedHold(e.key, 60, 2);
      em['syncCaution']();
      return e.caution > 0 ? e.id : '';
    });
    if (cid) {
      const cautB = await until(B, (id) => window.__app.current.net.puppets.get(id)?.cautious === true, cid, 5000, 'client puppet cautious').then(() => true, () => false);
      const pose = await GB((id) => { const p = window.__app.current.net.puppets.get(id); return p ? { aim: p['aim'], level: p.level } : null; }, cid);
      assert(cautB, `a cautious host guard is cautious on the client (${JSON.stringify(pose)})`);
    } else console.log('    (no keyed guard to make cautious: skipped)');

    // a response team: the enforcer first (always helmeted), two behind; the client builds his shield by kind
    const team = await GA(() => {
      const g = window.__app.current;
      const em = g.enemyMgr;
      const V = g.player.position.constructor;
      const t = em.newTeam(0, null, [], []);
      const out = [];
      // (S9-CHECK) the Ledger keeps 9 alive and the live cap is 12: room for the three even after an alarm's reinforcements
      em['s9Cap'] = em.maxAlive;
      em.maxAlive = Math.max(em.maxAlive, em.alive + 3);
      const kinds = ['enforcer', 'grunt', 'grunt'];
      for (let i = 0; i < kinds.length; i++) {
        const e = em.spawnReinforcement(kinds[i], new V(12 + i * 1.2, 0, -6.5), 0, 0);
        if (!e) continue;
        em.joinTeam(e, t);
        e['stagger'] = 99;
        out.push({ id: e.id, kind: e.def.kind, helmet: e.helmet });
      }
      return out;
    });
    const lead = team.find((m) => m.kind === 'enforcer');
    assert(!!lead && lead.helmet && team.length === 3, `a shield-led team spawns on the host (${JSON.stringify(team)})`);
    if (lead) {
      const shieldB = await until(B, (id) => { const s = window.__app.current.net.puppets.get(id)?.gearShown; return !!s && s.shield && s.helmet; }, lead.id, 10000, 'client shows the shield lead').then(() => true, () => false);
      assert(shieldB, `the client's enforcer carries his shield and the lead's helmet (${JSON.stringify(await GB((id) => window.__app.current.net.puppets.get(id)?.gearShown ?? null, lead.id))})`);
    }
    await GA((ids) => {
      const em = window.__app.current.enemyMgr;
      for (const id of ids) { const e = em.enemies.find((x) => x.id === id); if (e) em.despawn(e); }
      em.teams.length = 0;
      if (em['s9Cap'] !== undefined) em.maxAlive = em['s9Cap'];
      // later spawns in this match carry no stage gear
      em.setAlarmStage(0, false);
    }, team.map((m) => m.id));

    // a client round to the helmeted guard's head: no damage, a deflect at once on the client, the host's confirm, his
    // helmet off on both screens and dropped on both floors
    await GA((id) => {
      const g = window.__app.current;
      for (const r of g.net.remotes.values()) r.allowTeleport(5);
      const v = g.enemyMgr.enemies.find((e) => e.id === id);
      if (v) {
        v['stagger'] = 99;
        if (g.world.map.id === 'warehouse') v.pos.set(13, 0, -6.5);
      }
    }, gid);
    await until(B, (id) => { const p = window.__app.current.net.puppets.get(id); return !!p && Math.hypot(p.pos.x - 13, p.pos.z + 6.5) < 1.5; }, gid, 15000, 'geared puppet moved');
    await GB((id) => {
      const g = window.__app.current;
      const p = g.net.puppets.get(id);
      g.player.controller.teleport(p.pos.add(new p.pos.constructor(0, 0.2, 2.2)), Math.PI);
      g.player.forceAds = true;
    }, gid);
    await until(A, () => [...window.__app.current.net.remotes.values()].some((r) => r.state?.mv?.dw === 2), null, 5000, 'host sees the client drawn (deflect)');
    let deflected = false;
    let pred = null;
    for (let i = 0; i < 20 && !deflected; i++) {
      await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(2); });
      pred = await GB((id) => {
        const g = window.__app.current;
        const p = g.net.puppets.get(id);
        if (!p) return null;
        const V = p.pos.constructor;
        const src = g.player.position.add(new V(0, 1.58, 0));
        const pt = p.pos.add(new V(0, 1.62 * p.def.scale, 0));
        const res = p.applyDamage({ amount: 40, point: pt, dir: pt.subtract(src).normalize(), part: 'head', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', weapon: 'rifle', sourcePos: src, impulse: 3 });
        return { dealt: res.dealt, deflect: res.deflect === true };
      }, gid);
      // (S9-CHECK) wait for the host's verdict before the next round: a second round after the knock-off is a kill
      await until(A, (id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return !e || !e.alive || !e.helmet; }, gid, 800, 'host verdict').catch(() => {});
      deflected = await GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return !!e && e.alive && !e.helmet; }, gid);
    }
    const hostSide = await GA((id) => { const em = window.__app.current.enemyMgr; const e = em.enemies.find((x) => x.id === id); return { alive: e?.alive, helmet: e?.helmet, armour: e?.armour, drops: em.helmetDrops.shown }; }, gid);
    assert(!!pred && pred.deflect && pred.dealt === 0, `the client predicts the deflect on the helmeted puppet (${JSON.stringify(pred)})`);
    assert(deflected && hostSide.alive && hostSide.drops >= 1, `the host's guard lives, his helmet knocked off and on the floor (${JSON.stringify(hostSide)})`);
    const confirmed = await until(B, () => window.__app.current.net.deflectConfirms >= 1, null, 5000, 'client deflect confirm').then(() => true, () => false);
    assert(confirmed, `the host confirms the client's deflect (hitConfirm deflect) (${await GB(() => window.__app.current.net.deflectConfirms)})`);
    const fell = await until(B, (id) => { const g = window.__app.current; const s = g.net.puppets.get(id)?.gearShown; return !!s && !s.helmet && s.armour && (g.net.helmetDrops?.shown ?? 0) >= 1; }, gid, 5000, 'client helmet falls').then(() => true, () => false);
    assert(fell, `the client's puppet loses the helmet and it lies on the client's floor too (${JSON.stringify(await GB((id) => ({ gear: window.__app.current.net.puppets.get(id)?.gearShown ?? null, drops: window.__app.current.net.helmetDrops?.shown ?? 0 }), gid))})`);
    // (guard-models G9) the helmet bit is gone on both: the host guard's `helmet`, the client's wire `al` bit (AL_HELMET = 32),
    // and with the figures on neither side shows a helmet piece, while the vest (the armour bit) stays on both
    const [hb, cb] = await Promise.all([
      GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return { helmet: !!e?.helmet, armour: !!e?.armour, pieces: e?.['gbody']?.shownPieces() ?? null }; }, gid),
      GB((id) => { const q = window.__app.current.net.puppets.get(id); return { bit: !!q && (q['al'] & 32) !== 0, armourBit: !!q && (q['al'] & 64) !== 0, pieces: q?.shownPieces ?? null }; }, gid),
    ]);
    assert(!hb.helmet && !cb.bit && hb.armour && cb.armourBit, `the helmet bit dropped on both, the armour bit stayed (${JSON.stringify({ hb, cb })})`);
    if (hb.pieces && cb.pieces) {
      assert(!hb.pieces.some((x) => x.startsWith('helmet_')) && !cb.pieces.some((x) => x.startsWith('helmet_')), `no helmet piece shown on either screen (${hb.pieces} / ${cb.pieces})`);
      assert(hb.pieces.includes('vest_soft') && cb.pieces.includes('vest_soft'), 'the vest stays on both screens');
    }
    await GB(() => { window.__app.current.player.forceAds = false; });
  }

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

  // (E9-crate, A101-A106) a weapons crate beside the client (added by hand, as the medkit leg does): the client mirrors
  // it, drains and uses it (topped up exactly, its prompt gone); a second use after a drain is refused; the host's own
  // use tops the host up. The rejoin leg below checks the client's mirror stays spent with its ammo untouched.
  console.log('weapons crate: a client uses it once and is topped up; the host uses it for itself');
  const crateTot = (P) => P.evaluate(() => { const w = window.__app.current.weapons; return { eq: w.slots.every((s) => s.mag + s.reserve === s.stats.magSize + s.def.reserve), dry: w.slots.every((s) => s.reserve === 0), sum: w.slots.map((s) => s.mag + s.reserve).join() }; });
  const crateDrain = (P) => P.evaluate(() => { for (const s of window.__app.current.weapons.slots) { s.mag = Math.min(3, s.stats.magSize); s.reserve = 0; } });
  let crateSumB = '';
  {
    await GA(() => { window.__cbid = [...window.__app.current.net.remotes.keys()][0]; });
    await GA(() => {
      const g = window.__app.current;
      const r = g.net.remotes.get(window.__cbid);
      g.crates.add('crate-e2e', r.feet.clone().addInPlaceFromFloats(0.5, 0, 0), 0);
      g.crates.setLive('crate-e2e');
    });
    await until(B, () => { const it = window.__app.current.interactables?.items.find((i) => i.id === 'crate-e2e'); return !!it && it.enabled && it.kind === 'crate'; }, null, 8000, 'client mirrors the weapons crate');
    await crateDrain(B);
    assert((await GB(() => window.__app.current.interactables.nearest(window.__app.current.player.position)?.id ?? null)) === 'crate-e2e', 'the client is offered the crate');
    await GB(() => window.__app.current.interactables.items.find((i) => i.id === 'crate-e2e').onUse());
    await until(B, () => window.__app.current.weapons.atLoadout(), null, 8000, 'the client is topped up to its loadout');
    assert((await crateTot(B)).eq, 'the client totals equal its loadout exactly');
    await until(B, () => window.__app.current.interactables.nearest(window.__app.current.player.position) === null, null, 5000, 'the client prompt is gone');
    crateSumB = (await crateTot(B)).sum;
    await crateDrain(B);
    await GB(() => window.__app.current.interactables.items.find((i) => i.id === 'crate-e2e').onUse());
    await wait(1200);
    assert((await crateTot(B)).dry, 'a second client use after a drain is refused (still drained)');
    await GB(() => { const g = window.__app.current; for (const s of g.weapons.slots) { s.mag = s.stats.magSize; s.reserve = s.def.reserve; } });
    await crateDrain(A);
    await GA(() => { const g = window.__app.current; const it = g.interactables.items.find((i) => i.id === 'crate-e2e'); it.onUse(it, 'local'); });
    assert((await crateTot(A)).eq, 'the host use tops the host up too');
    assert(await GA(() => { const d = window.__app.current.crates.debug().find((c) => c.id === 'crate-e2e'); return d.used.includes('local') && d.used.includes(window.__cbid); }), 'the host ledger lists both players');
  }

  // (marlow-bays R1-R2) the joiner drops mid-match (leaves to its menu): the host holds its place (frozen, unhurt, out
  // of the guards' list, a "reconnecting" line); the joiner's main menu offers "Rejoin <code>", which takes the same
  // player back where it stood, with the health the host kept
  console.log('rejoin: the joiner drops, its place is held, it rejoins from the main menu where it stood');
  {
    const code0 = await GA(() => window.__coop.session.code);
    const pid0 = await GB(() => window.__coop.session.selfId);
    await GB(() => window.__app.current.pause());
    const room = await GB(() => document.querySelector('.pause-screen .ps-room')?.textContent ?? '');
    assert(room.includes(code0), `the pause menu shows the room code (${room})`);
    await GB(() => window.__app.screens.top.resume());
    await GA((id) => { window.__app.current.net.remotes.get(id).health.hp = 60; }, pid0);
    await until(B, () => Math.abs(window.__app.current.target.health.hp - 60) < 0.01, null, 8000, 'client mirrors 60 hp');
    const held0 = await GA((id) => { const r = window.__app.current.net.remotes.get(id); return [r.feet.x, r.feet.y, r.feet.z]; }, pid0);
    await GB(() => window.__coop.leave());
    await until(A, (id) => window.__coop.session.players.get(id)?.away === true, pid0, 20000, 'the host holds the dropped joiner');
    const hold = await GA((id) => { const g = window.__app.current; const r = g.net.remotes.get(id); const n = document.querySelector('.hud-net-notice'); return { held: !!r?.held, inRefs: g.remotePlayers().some((x) => x.id === id), notice: n?.textContent ?? '', shown: !!n && n.style.display !== 'none' }; }, pid0);
    assert(hold.held && !hold.inRefs && hold.shown && /reconnecting/.test(hold.notice) && hold.notice.includes(code0), `the host holds the joiner's place: frozen, out of the guards' list, a reconnecting line (${JSON.stringify(hold)})`);
    await until(B, (c) => (document.querySelector('.main-menu [data-key="rejoin"]')?.textContent ?? '').includes(`Rejoin ${c}`), code0, 60000, 'the joiner main menu offers Rejoin <code>');
    await GB(() => document.querySelector('.main-menu [data-key="rejoin"]').click());
    await until(B, () => !!window.__app.current?.net && !!window.__app.current.puppet, null, LOAD_MS, 'the joiner is back in the match');
    const pid1 = await GB(() => window.__coop.session.selfId);
    assert(pid1 === pid0, `the rejoin takes the same player back (${pid0} -> ${pid1})`);
    await until(B, (p) => { const q = window.__app.current.player.position; return Math.hypot(q.x - p[0], q.z - p[2]) < 1.2; }, held0, 30000, 'the rejoined joiner is put back where it was held');
    await until(B, () => Math.abs(window.__app.current.target.health.hp - 60) < 0.01, null, 8000, 'the rejoined joiner keeps the health the host held (60)');
    await until(A, (id) => { const g = window.__app.current; const r = g.net.remotes.get(id); const n = document.querySelector('.hud-net-notice'); return !!r && !r.held && g.remotePlayers().some((x) => x.id === id) && (!n || n.style.display === 'none'); }, pid0, 10000, 'the host has the joiner back in play');
    // (E9-crate, A106) the rejoin re-send hides the prompt only: the client's crate mirror is spent, its ammo is not changed
    await until(B, () => { const it = window.__app.current.interactables?.items.find((i) => i.id === 'crate-e2e'); return !!it && it.spent === true; }, null, 15000, 'the rejoined client\'s crate mirror is spent');
    assert((await crateTot(B)).sum === crateSumB, `the crate re-send does not change the rejoined client's ammo (${crateSumB} -> ${(await crateTot(B)).sum})`);
    await GA((id) => { const r = window.__app.current.net.remotes.get(id); r.health.hp = 100; r.damageMul = 0; }, pid0);
    assert(true, 'a dropped joiner rejoins from its main menu as the same player, where it stood, with its health');
  }

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
    for (const P of pages()) await until(P, (m) => window.__app.current?.opts?.mode === m && !!window.__app.current.net && !window.__app.current.isEnded, mode, LOAD_MS, `${mode} match on every page`);
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
    // (e2e-coop-takedown, as the grab step below: on a slow page the match's guards alert or turn between the pin
    // and the client's read - a spotted client skips an alert guard, and a guard turned to the side offers only
    // while calm - so the host is calmed and the picked guard is a statue until the takedown starts; the start, the
    // reach check and the knock-out are the real code, `knockOut` does not need his brain)
    // (coop-offer-load) the pin holds on every host frame, not only between polls: under load the host ran frames
    // between two polls in which the guard alerted again
    await GA((id) => {
      const g = window.__app.current;
      const v = g.enemyMgr.enemies.find((e) => e.id === id);
      window.__tdPinOn = true;
      const pin = () => {
        if (!window.__tdPinOn) return;
        for (const r of g.net.remotes.values()) {
          r.allowTeleport(1);
          r.ref.spotted = false;
        }
        for (const e of g.enemyMgr.enemies) if (!e.taken) e.aware.set('unaware');
        if (v?.alive && !v.taken) {
          v.update = () => {};
          v.pos.set(6, 0, -6);
          v.yaw = 0;
        }
        requestAnimationFrame(pin);
      };
      pin();
    }, tdv);
    // (coop-offer-load) the client starts the takedown in the frame its offer comes up (latched: the offer can come and go
    // between two polls), within 6 s of the client's match clock (was 40 polls 150 ms apart in real time, which a loaded
    // page spent in a fraction of that game time); 90 s real-time cap
    tdStarted = await GB((id) => new Promise((res) => {
      const g = window.__app.current;
      const t0 = g.time;
      const w0 = performance.now();
      const tick = () => {
        if (g.takedown.offer?.e.id === id && !g.takedown.active) {
          g.takedown.start(false);
          res(true);
        } else if (g.time - t0 > 6 || performance.now() - w0 > 90000) res(`offer ${g.takedown.offer?.e.id ?? 'none'}`);
        else requestAnimationFrame(tick);
      };
      tick();
    }), tdv);
    await GA(() => { window.__tdPinOn = false; });
    for (let i = 0; i < 20 && !knocked; i++) {
      await wait(400);
      knocked = await GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return !e || (!e.alive && e.ko); }, tdv);
      if (!knocked && (await GB(() => !window.__app.current.takedown.active))) {
        // (load-audit) the client's takedown ended, but its 'done' can still be on its way to the host: under load the
        // next attempt started first, the late knock-out removed the guard, and the retry found no guard (host
        // found:false, client offer null) and overwrote the start. Before a retry the host settles on its match clock:
        // the knock-out, or the guard free (not held) for 1.5 s of host time (a denied start); 30 s real-time cap.
        // (polled from here, as waitHostSim: the host page is in the background, where rAF stops but its clock runs on)
        const hostTd = (id) => GA((id) => { const g = window.__app.current; const e = g.enemyMgr.enemies.find((x) => x.id === id); return { t: g.time, ko: !e || (!e.alive && e.ko), taken: !!e?.taken }; }, id);
        const w0 = Date.now();
        let lastTakenT = (await hostTd(tdv)).t;
        for (;;) {
          const s = await hostTd(tdv);
          if (s.ko) {
            knocked = true;
            break;
          }
          if (s.taken) lastTakenT = s.t;
          else if (s.t - lastTakenT > 1.5) break;
          if (Date.now() - w0 > 30000) break;
          await new Promise((r) => setTimeout(r, 50));
        }
        break;
      }
    }
  }
  if (tdStarted !== true) {
    console.log('    host:', await GA((id) => { const g = window.__app.current; const e = g.enemyMgr.enemies.find((x) => x.id === id); const r = g.net.remotes.values().next().value; return JSON.stringify({ found: !!e, alive: e?.alive, taken: e?.taken, ko: e?.ko, level: e?.level, pos: e && [e.pos.x, e.pos.z], yaw: e?.yaw, spotted: r?.ref.spotted, client: r && [r.feet.x, r.feet.z] }); }, tdv));
    console.log('    client:', await GB((id) => { const g = window.__app.current; const p = g.net.puppets.get(id); const o = g.takedown.offer; return JSON.stringify({ puppet: p && { pos: [p.pos.x, p.pos.z], yaw: p.yaw, alive: p.alive, taken: p.taken, level: p.level }, me: [g.player.position.x, g.player.position.z], spotted: g.net.spotted?.(), offer: o ? { id: o.e.id, kind: o.plan?.kind } : null, active: g.takedown.active }); }, tdv));
  }
  await GA((id) => { const v = window.__app.current.enemyMgr.enemies.find((e) => e.id === id); if (v) delete v.update; }, tdv);
  assert(tdStarted === true, `client takedown offered on the host's guard (${tdStarted})`);
  await until(A, (id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return !e || (!e.alive && e.ko); }, tdv, 8000, 'host knocks the guard out');
  assert(true, 'client takedown knocks the host enemy out');
  // the knocked-out guard lies on the client as long as the host has the body
  await until(B, (id) => window.__app.current.net.kept.has(id), tdv, 6000, 'client keeps the body');
  assert(true, 'client keeps the body the host has lying');
  // (coop-carry) the client carries the body: its mirrored "Pick up body" item asks the host, the host lifts it (carried:
  // no guard finds it) and both pages show it on the client's shoulder after the lift; then the client hides it at the
  // map's nearest hiding spot (or, with none, puts it down) and no guard ever finds a hidden body. Sim-time waits only.
  // (fix round) Every other live guard on the host is frozen for the block (nobody finds and wakes him before the lift;
  // the takedown pin runs on rAF, which stops on the backgrounded host), and each client teleport is allowed on the host
  // and waited for there (its copy of the client's feet otherwise walks ~0.8 m a state and the hide is out of reach).
  {
    const cid = await GA(() => window.__app.current.net.remotes.values().next().value?.id ?? '');
    const bodyItemId = await GA((id) => { const b = window.__app.current.enemyMgr.bodies.find((x) => x.enemyId === id); return b && b.present ? `body-${b.id}` : ''; }, tdv);
    assert(!!cid && !!bodyItemId, `a lying body and the client (${bodyItemId}, ${cid})`);
    await GA(() => {
      const em = window.__app.current.enemyMgr;
      window.__carryFrozen = [];
      for (const e of em.enemies) {
        if (!e.alive || Object.prototype.hasOwnProperty.call(e, 'update')) continue;
        e.update = () => {};
        window.__carryFrozen.push(e);
      }
    });
    /** The client stands at (x, y, z) facing yaw: allowed on the host, then the host's copy of its feet is there. */
    const tp = async (x, y, z, yaw) => {
      await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
      await GB(([x, y, z, yaw]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw); }, [x, y, z, yaw]);
      await until(A, ([c, x, z]) => { const r = window.__app.current.net.remotes.get(c); return !!r && Math.hypot(r.feet.x - x, r.feet.z - z) < 0.6; }, [cid, x, z], 6000, 'the host has the client where it teleported');
    };
    /** The guard is still down (never woken) and his body is off the floor list (carried or hidden). */
    const stillDownOffFloor = () => GA((id) => {
      const g = window.__app.current;
      const e = g.enemyMgr.enemies.find((x) => x.id === id);
      const b = g.enemyMgr.bodies.find((x) => x.enemyId === id);
      return (!e || !e.alive) && !!b && !b.present;
    }, tdv);
    try {
      await until(B, (iid) => !!window.__app.current.interactables.items.find((i) => i.id === iid && i.enabled), bodyItemId, 6000, 'client mirrors the body item');
      const at = await GB((iid) => { const it = window.__app.current.interactables.items.find((i) => i.id === iid); return [it.pos.x, it.pos.y, it.pos.z]; }, bodyItemId);
      // stand the client beside the host's body (both pages read the host's spot for the reach)
      await tp(at[0] + 0.9, at[1] + 0.1, at[2], -Math.PI / 2);
      await GB((iid) => window.__app.current.interactables.items.find((i) => i.id === iid)?.onUse?.(undefined, 'local'), bodyItemId);
      await until(A, ([id, c]) => { const g = window.__app.current; const b = g.enemyMgr.bodies.find((x) => x.enemyId === id); return !!b && b.carried && g.net.carries.has(c); }, [tdv, cid], 6000, 'host lifts the body for the client');
      assert(true, 'the host takes the client pick up (body carried, off the floor list)');
      await until(B, () => window.__app.current.carrier?.carrying === true, null, 6000, 'client starts its lift');
      await waitHostSim(A, 2600);
      await until(B, () => { const c = window.__app.current.carrier; return !!c && c.carrying && !c.busy; }, null, 8000, 'client lift done (carrying)');
      await until(A, (c) => window.__app.current.net.carries.get(c)?.onShoulder === true, cid, 6000, 'host shows the body on the client');
      assert(true, 'both pages show the client carrying the body');
      assert(await stillDownOffFloor(), 'a carried body: the guard still down, his body off the floor list (never found)');
      const hide = await GB(() => {
        const g = window.__app.current;
        const hs = g.world.layout.hideSpots ?? [];
        const p = g.player.position;
        let k = -1;
        let bd = Infinity;
        hs.forEach((h, i) => { const d = Math.hypot(h.pos.x - p.x, h.pos.z - p.z); if (d < bd && Math.abs(h.pos.y - p.y) < 2) { bd = d; k = i; } });
        return k < 0 ? null : [hs[k].pos.x, hs[k].pos.y, hs[k].pos.z];
      });
      if (hide) {
        await tp(hide[0] + 0.6, hide[1] + 0.1, hide[2], 0);
        await GB(() => { const g = window.__app.current; g.carrier.carryTarget(g.player.position)?.onUse?.(undefined, 'local'); });
        await until(A, (id) => window.__app.current.enemyMgr.bodies.find((x) => x.enemyId === id)?.hidden === true, tdv, 6000, 'host hides the client body');
        await until(B, () => !window.__app.current.carrier.carrying, null, 6000, 'client carry ends at the hide');
        await waitHostSim(A, 3000);
        assert(await stillDownOffFloor(), 'a body the client hid: the guard still down, never found');
      } else {
        await GB(() => { const g = window.__app.current; g.carrier.carryTarget(g.player.position)?.onUse?.(undefined, 'local'); });
        await until(A, (id) => { const b = window.__app.current.enemyMgr.bodies.find((x) => x.enemyId === id); return !!b && !b.carried && b.present; }, tdv, 6000, 'host puts the client body down');
        await until(B, () => !window.__app.current.carrier.carrying, null, 6000, 'client put down ends');
        assert(true, 'the client puts the body down on both pages (no hiding spot on this map)');
      }
    } finally {
      await GA(() => { for (const e of window.__carryFrozen ?? []) delete e.update; window.__carryFrozen = []; });
    }
  }
  await GA((id) => { const b = window.__app.current.enemyMgr.bodies.find((x) => x.enemyId === id); if (b) b.hidden = true; }, tdv);
  await until(B, (id) => !window.__app.current.net.kept.has(id), tdv, 8000, 'client drops the hidden body');
  assert(true, 'a body hidden on the host leaves the client');
  // (locomotion step 10) a client elbow strike: approved by the host, the knock-out applied on the host's guard and
  // the client's puppet; a strike on a guard the host already holds is refused (cdeny), no knock-out
  const skv = await GB((no) => [...window.__app.current.net.puppets.values()].find((p) => p.alive && p.id !== no && p.def.kind === 'grunt')?.id ?? '', tdv);
  assert(!!skv, `a second calm guard for the strike (${skv})`);
  // (load-latent) the guard is placed once, then each attempt pins him on every host sim step (the host page is in the
  // background and a pump steps it when its rAF did not run, so the pin wraps the loop's fixedUpdate hook, not rAF): the
  // host calm, the client unspotted, the guard a statue on his spot (his brain off - the strike's approval, reach check
  // and knock-out are the real code, `applyHit` does not need his brain). Each attempt's pin carries its own generation,
  // so an earlier attempt's pin stops when the next starts, and the finally below always ends it
  const placeSk = (id) => GA((id) => {
    const g = window.__app.current;
    for (const e of g.enemyMgr.enemies) e['stagger'] = 99;
    const v = g.enemyMgr.enemies.find((e) => e.id === id);
    if (v?.alive && !v.taken) {
      v.pos.set(8, 0, -6);
      v.yaw = 0;
    }
  }, id);
  await placeSk(skv);
  await wait(600);
  await moveClient(B, 8, 0.1, -6.9, 0);
  let skKo = false;
  let skInfo = '';
  const skKoNow = () => GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return !e || (!e.alive && e.ko); }, skv);
  // (the guard's brain is restored in the finally: a throw in an attempt never leaves him brainless)
  try {
    for (let attempt = 0; attempt < 6 && !skKo; attempt++) {
      // (step 10 check) a retry only after the client's strike ended and the host's record of it cleared
      if (attempt > 0) {
        await until(B, () => !window.__app.current.strike.active, null, 5000, 'client strike ended').catch(() => {});
        await until(A, () => window.__app.current.net['strikes'].size === 0, null, 10000, 'host strike record cleared').catch(() => {});
        // (a late knock-out of the last attempt: no new strike on a guard who is already down)
        if ((skKo = await skKoNow())) break;
      }
      // (the teleport window once per attempt, before the client strikes: a grant every step would keep the host's reach
      // check open for the whole wait)
      await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(1); });
      await GA((id) => {
        const g = window.__app.current;
        const v = g.enemyMgr.enemies.find((e) => e.id === id);
        const gen = (window.__skPinGen = (window.__skPinGen ?? 0) + 1);
        const pin = () => {
          for (const r of g.net.remotes.values()) r.ref.spotted = false;
          for (const e of g.enemyMgr.enemies) {
            e['stagger'] = 99;
            if (e.alive && !e.taken) e.aware.set('unaware');
          }
          if (v?.alive && !v.taken) {
            v.update = () => {};
            v.pos.set(8, 0, -6);
            v.yaw = 0;
          }
        };
        const hooks = window.__app.loop['hooks'];
        const orig = hooks.fixedUpdate;
        const step = (dt) => {
          if (window.__skPinGen !== gen || window.__app.current !== g) {
            // (ended: unwrapped when no later wrapper sits on top, else a pass-through)
            if (hooks.fixedUpdate === step) hooks.fixedUpdate = orig;
            orig(dt);
            return;
          }
          pin();
          orig(dt);
          pin();
        };
        hooks.fixedUpdate = step;
        pin();
      }, skv);
      try {
        // (load-latent) the client strikes in the frame its pick is the pinned guard (latched: the pick can come and go
        // between two polls), within 6 s of the client's match clock (was one read per attempt, 300 ms polls in real
        // time); 90 s real-time cap, also as a timer (resolves if the client's rAF stalls; it starts no strike, so the
        // knock-out wait below finds none and the assert fails)
        skInfo = await GB((id) => new Promise((resolve) => {
          const g = window.__app.current;
          const t0 = g.time;
          const w0 = performance.now();
          let done = false;
          const res = (s) => {
            if (done) return;
            done = true;
            clearTimeout(cap);
            resolve(s);
          };
          const cap = setTimeout(() => res('wall cap 90 s: ' + JSON.stringify(g.strike.count) + ' ' + g.strike.lastDenied), 90000);
          const tick = () => {
            if (done) return;
            g.player.cam.yaw = 0;
            const t = g.strike.active ? '' : g.strike.pickTarget();
            if (t === id && g.strike.begin()) res(`target ${t} want ${id} ${JSON.stringify(g.strike.count)} ${g.strike.lastDenied}`);
            else if (g.time - t0 > 6 || performance.now() - w0 > 90000) {
              res(g.strike.active
                ? `busy ${JSON.stringify(g.strike.count)} ${g.strike.lastDenied} t ${g.strike.t.toFixed(2)} ok ${g.strike.approved}`
                : `target ${g.strike.pickTarget() || 'none'} want ${id} ${JSON.stringify(g.strike.count)} ${g.strike.lastDenied} can ${g.strike.canStart()}`);
            } else requestAnimationFrame(tick);
          };
          tick();
        }), skv);
        // (load-latent) the knock-out within 3 s of the host's match clock (the host runs the strike: contact 0.5 s, done
        // 0.9 s after its start; was 8 polls 300 ms apart in real time); 30 s real-time cap
        const h0 = await GA(() => window.__app.current.time);
        const w0 = Date.now();
        while (!(skKo = await skKoNow())) {
          if ((await GA(() => window.__app.current.time)) - h0 > 3 || Date.now() - w0 > 30000) break;
          await wait(100);
        }
      } finally {
        await GA(() => { window.__skPinGen = (window.__skPinGen ?? 0) + 1; }).catch(() => {});
      }
    }
  } finally {
    await GA((id) => { const v = window.__app.current.enemyMgr.enemies.find((e) => e.id === id); if (v) delete v.update; }, skv).catch(() => {});
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
    // (load-latent) the client's own strike can still be running (its clock runs slow under load) or its body not yet
    // free: the request is sent only once a strike can start, and the start is asserted (a refused `begin` sent nothing,
    // and the wait below timed out on a denial that never came)
    const skFree = () => { const g = window.__app.current; return !g.strike.active && g.strike.canStart(); };
    const skWhy = () => GB(() => { const g = window.__app.current; const tr = g.traversal; return JSON.stringify({ active: g.strike.active, t: g.strike.t, alive: g.player.alive, draw: g.weapons.drawPhase, reload: g.weapons.reloadBusy, grounded: g.player.controller.grounded, attached: tr.attached, committed: tr.committed, takedown: g.takedown.active, team: g.team.active, carrying: g.stealth?.carrying ?? false }); });
    await until(B, skFree, null, 10000, 'client strike can start').catch(() => {});
    const d0 = await GB(() => window.__app.current.strike.count.denied);
    const skWhy0 = await skWhy();
    const skBegan = await GB((id) => window.__app.current.strike.begin(id), skd);
    assert(skBegan, `the client starts a strike on the held guard (${skBegan ? 'ok' : skWhy0})`);
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
  // (spare 9) interrogation intel: the host's feed lines reach the client
  await GA(() => window.__app.current.events.emit('intel', { lines: ['Code: e2e relay'], codes: [] }));
  await until(B, () => (document.querySelector('.hud-feed')?.textContent ?? '').includes('Code: e2e relay'), null, 4000, 'client sees the intel line');
  assert(true, 'interrogation intel reaches the client');
  // (hud-guidance B5, R12, A9) and Field Terminal > Notes on both pages (the client's from the host's feed, no wire change)
  const noteIn = (P) => P.evaluate(() => window.__app.current.notes.lines().includes('Code: e2e relay'));
  assert((await noteIn(A)) && (await noteIn(B)), 'the intel line is in the field notes on the host and the client (A9)');
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
      // (load-audit, as coop-offer-load's takedown fix) the pin holds on every host frame until the grab starts, not once
      // per attempt: under load the host ran frames between the pin and the client's read in which the guard alerted or
      // turned again. (load-audit review) The teleport window is granted once per attempt, by moveClient (a grant every
      // frame kept the host's reach check open for the whole wait); each attempt's pin carries its own generation, so a
      // pin from an earlier attempt stops when the next one starts, and the finally below always ends it
      await GA((id) => {
        const g = window.__app.current;
        const v = g.enemyMgr.enemies.find((e) => e.id === id);
        const gen = (window.__grabPinGen = (window.__grabPinGen ?? 0) + 1);
        const pin = () => {
          // (stops once the guard is taken: his brain is back on as soon as the grab is held)
          if (window.__grabPinGen !== gen || v?.taken) return;
          for (const r of g.net.remotes.values()) r.ref.spotted = false;
          // (3.6: the checks above - a gas cloud - can leave guards in combat having spotted the client, and a
          // guard in combat who knows an operator is there cannot be taken by surprise (by design): calm the host first)
          for (const e of g.enemyMgr.enemies) e.aware.set('unaware');
          if (v?.alive && !v.taken) {
            // (a statue while the client lines up: the guard's brain is off - the match's guards re-alert at once after the steps above, turn round
            // and offer the front takedown, which is a race the test cannot win by calming them. The grab, the hold and the knock-out are
            // the real code: his brain is back on as soon as the grab is held)
            v.update = () => {};
            v['stagger'] = 99;
            v.pos.set(6, 0, -6);
            v.yaw = 0;
          }
          requestAnimationFrame(pin);
        };
        pin();
      }, gg);
      try {
        await moveClient(B, 6, 0.1, -7.1, 0);
        // (load-audit) the client starts the grab in the frame its offer from behind comes up (latched: the offer can come and go
        // between two polls), then waits for the hostage, within 4.5 s of the client's match clock (was 30 polls 150 ms apart,
        // 4.5 s of real time, which a loaded page spent in a fraction of that game time); 90 s real-time cap
        grabbed = await GB((id) => new Promise((res) => {
          const g = window.__app.current;
          const t0 = g.time;
          const w0 = performance.now();
          const tick = () => {
            // (only the offer from behind is taken: a guard who turned round in the instant before offers the front takedown, a knock-out, not a grab)
            if (g.takedown.offer?.e.id === id && g.takedown.offer.plan.kind === 'behind' && !g.takedown.active) g.takedown.start();
            if (g.takedown.hostage?.id === id) res(true);
            else if (g.time - t0 > 4.5 || performance.now() - w0 > 90000) res(false);
            else requestAnimationFrame(tick);
          };
          tick();
        }), gg);
      } finally {
        // (a crashed page's own error is the one reported)
        await GA(() => { window.__grabPinGen = (window.__grabPinGen ?? 0) + 1; }).catch(() => {});
      }
    }
    if (!grabbed) {
      console.log('    host:', await GA((id) => { const g = window.__app.current; const e = g.enemyMgr.enemies.find((x) => x.id === id); const r = g.net.remotes.values().next().value; return JSON.stringify({ found: !!e, alive: e?.alive, taken: e?.taken, ko: e?.ko, level: e?.level, gas: e?.gas, stagger: e?.['stagger'], pos: e && [e.pos.x, e.pos.z], yaw: e?.yaw, client: [r.feet.x, r.feet.z], mv: r.state?.mv?.m }); }, gg));
      console.log('    host kills since the pick:', gg, await GA(() => JSON.stringify(window.__kills)));
      console.log('    client:', await GB((id) => { const g = window.__app.current; const p = g.net.puppets.get(id); const o = g.takedown.offer; return JSON.stringify({ puppet: p && { pos: [p.pos.x, p.pos.z], yaw: p.yaw, alive: p.alive, taken: p.taken, level: p.level }, me: [g.player.position.x, g.player.position.z], yaw: g.player.cam.yaw, offer: o ? { id: o.e.id, kind: o.plan?.kind } : null, active: g.takedown.active, hostage: g.takedown.hostage?.id ?? null, alive: g.player.alive, move: g.player.controller.motion.state }); }, gg));
    }
    await GA((id) => { const v = window.__app.current.enemyMgr.enemies.find((e) => e.id === id); if (v) delete v.update; }, gg);
    assert(grabbed, 'client grabs a host guard from behind');
    // (optic-coop merge triage) the other guards stay calm on the host until the team takedown below has landed: the
    // grab pin above stops once he is taken, and a guard re-alerted by the earlier steps shoots at the client, whose
    // hostage is his shield (`Enemy.shoot`, `shieldHit`): he died to that fire before the team takedown landed, the host's
    // takedown aborted (`!e.alive`) and no dual was counted (laptop GPU run after the master merge, the joint block below
    // stretching the window). The held guard's own brain, the hold, the bluff, the read and the team takedown are real.
    await GA((id) => {
      const g = window.__app.current;
      const gen = (window.__calmGen = (window.__calmGen ?? 0) + 1);
      const calm = () => {
        if (window.__calmGen !== gen || !g.enemyMgr.enemies.some((e) => e.id === id && e.alive)) return;
        for (const r of g.net.remotes.values()) r.ref.spotted = false;
        for (const e of g.enemyMgr.enemies) if (e.id !== id) e.aware.set('unaware');
        requestAnimationFrame(calm);
      };
      calm();
    }, gg);
    await until(A, (id) => { const g = window.__app.current; const r = [...g.net.remotes.values()][0]; return r.state?.mv?.m === 'grab' && r.ref.shield?.id === id; }, gg, 8000, 'host sees the grab');
    const held = await GA((id) => {
      const g = window.__app.current;
      const r = [...g.net.remotes.values()][0];
      const e = g.enemyMgr.enemies.find((x) => x.id === id);
      const yaw = r.state.yaw;
      return Math.hypot(e.pos.x - (r.feet.x + Math.sin(yaw) * 0.42), e.pos.z - (r.feet.z + Math.cos(yaw) * 0.42));
    }, gg);
    assert(held < 0.25, `the host holds its guard in front of the client (${held.toFixed(2)} m)`);
    // (marlow-bays item 1) the client's own hostage is not solid there (as the host's guard): its controller is not shoved
    const solid = await GB((id) => { const p = window.__app.current.net.puppets.get(id); const cap = p?.hitboxes?.shapes?.[0]; return cap ? cap.filterMembershipMask : -1; }, gg);
    assert(solid >= 0 && (solid & 0x4) === 0, `the client's held guard is not solid to bodies there (membership ${solid})`);
    // (A4: the CT grab menu opens on the client; Knock out is the first entry, A picks it)
    await until(B, () => window.__app.current.grabMenu.open, null, 4000, 'the client grab menu opens');
    // (joint-interrogation, G148) host bluffs, client reads: the guard gets solo and joint information on both pages (the
    // host's enemy, the client's puppet); the host beside the client's hostage holds A, the BLUFF row is first (above TEAM
    // TAKEDOWN) and its release sends the bluff; the client holds A on its INTERROGATE row and lets go: the read ends on the
    // host with the bluff live, so both feeds show the joint line and the host counts one joint read. The client still
    // holds him (the team takedown below). Real input (`input.state` interact) and the real menu rows on both pages.
    console.log('joint interrogation: host bluffs, client reads');
    {
      const JI = { lines: ['e2e solo'], joint: { lines: ['e2e joint'], flag: 'e2e-joint' } };
      await GA(([id, info]) => { window.__app.current.enemyMgr.enemies.find((x) => x.id === id).info = info; }, [gg, JI]);
      await GB(([id, info]) => { window.__app.current.net.puppets.get(id).info = info; }, [gg, JI]);
      const j0 = await GA(() => window.__app.current.net.joints);
      await GA((id) => {
        const g = window.__app.current;
        const e = g.enemyMgr.enemies.find((x) => x.id === id);
        const yaw = [...g.net.remotes.values()][0].state.yaw;
        // 1.1 m to the hostage's side (off the holder's line), facing him (as the team takedown below)
        const x = e.pos.x + Math.cos(yaw) * 1.1;
        const z = e.pos.z - Math.sin(yaw) * 1.1;
        g.player.controller.teleport(new g.player.position.constructor(x, e.pos.y + 0.05, z), Math.atan2(e.pos.x - x, e.pos.z - z));
      }, gg);
      await until(A, (id) => { const g = window.__app.current; const o = g.takedown.offer; return o?.plan.kind === 'assist' && o.e.id === id && g.ctxMenu.count >= 2; }, gg, 6000, "joint: the host is offered the team takedown on the client's hostage");
      const rows = await GA(() => { const m = window.__app.current.ctxMenu; return m.opts.slice(0, m.count).map((o) => `${o.kind}:${o.opt}:${o.label}`); });
      assert(rows[0] === 'joint:bluff:Bluff' && rows[1]?.endsWith(':Team takedown'), `joint: the host's list has BLUFF above TEAM TAKEDOWN (${rows.join(' / ')})`);
      // the host holds A: the list opens on its first row, BLUFF; the release runs it
      await GA(() => window.__app.input.state.set('e2e', 'interact', true));
      try {
        await until(A, () => { const m = window.__app.current.ctxMenu; return m.state === 'active' && m.opts[m.sel]?.opt === 'bluff'; }, null, 6000, 'joint: hold A on the host highlights BLUFF');
      } finally {
        await GA(() => window.__app.input.state.set('e2e', 'interact', false));
      }
      await until(A, (id) => { const b = window.__app.current.net.bluffs.values().next().value; return !!b && b.eid === id; }, gg, 4000, 'joint: the host stores its bluff on the guard');
      // the client holds A on its hostage: the list opens on INTERROGATE (he has information); the release runs the read.
      // (flake fix) The bluff lives JOINT.window (6 s) of host time until the read ENDS: the hold starts at once and the
      // client's bluff line is checked alongside, so sequential Node polls under load do not spend the window (a 28 fps
      // host timed out here on the joint count).
      await GB(() => window.__app.input.state.set('e2e', 'interact', true));
      try {
        await Promise.all([
          until(B, () => (document.querySelector('.hud-feed')?.textContent ?? '').includes('Bluff on'), null, 4000, 'joint: the client sees the bluff line'),
          until(B, () => { const m = window.__app.current.ctxMenu; return m.state === 'active' && m.opts[m.sel]?.opt === 'interrogate'; }, null, 6000, 'joint: hold A on the client highlights INTERROGATE'),
        ]);
      } finally {
        await GB(() => window.__app.input.state.set('e2e', 'interact', false));
      }
      try {
        await until(A, (n) => window.__app.current.net.joints === n + 1, j0, 10000, 'joint: the host counts the joint read');
      } catch (err) {
        // name the cause next time: a bluff aged past JOINT.window (6 s host time) is dropped at the read's end
        const why = await GA(() => { const n = window.__app.current.net; const b = n.bluffs.values().next().value; return { bluffs: n.bluffs.size, age: b ? +(n.time - b.t0).toFixed(2) : null }; }).catch(() => null);
        throw new Error(`${err.message} (host bluff state ${JSON.stringify(why)})`);
      }
      for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
        await until(P, () => (document.querySelector('.hud-feed')?.textContent ?? '').includes('e2e joint'), null, 5000, `joint: the ${tag} feed shows the joint line`);
      }
      const after = await GA((id) => { const g = window.__app.current; const e = g.enemyMgr.enemies.find((x) => x.id === id); return { bluffs: g.net.bluffs.size, info: e.info ?? null }; }, gg);
      assert(after.bluffs === 0 && after.info === null, `joint: the bluff is spent and the guard has nothing left (${JSON.stringify(after)})`);
      assert(await GB((id) => window.__app.current.takedown.hostage?.id === id, gg), 'joint: the client still holds him after the read');
      assert(true, 'joint interrogation: host bluffs, client reads, both see the joint line');
      // a bluff on a guard nobody holds (he has joint information on the host): denied, nothing stored
      const free = await GB((gid) => { for (const [id, p] of window.__app.current.net.puppets) if (id !== gid && p.alive && !p.taken && !p.partnerHeld) return id; return ''; }, gg);
      const marked = free ? await GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id && x.alive && !x.taken); if (e) e.info = { lines: ['e2e free'], joint: { lines: ['e2e free joint'] } }; return !!e; }, free) : false;
      if (marked) {
        await GB((id) => { const g = window.__app.current; g.net.jointBluff(g.net.puppets.get(id)); }, free);
        await wait(800);
        assert((await GA(() => window.__app.current.net.bluffs.size)) === 0, 'joint: a bluff on a guard nobody holds is denied (nothing stored)');
        await GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); if (e) e.info = null; }, free);
      } else console.log('    joint: no free guard on both pages for the denial check (skipped)');
    }
    // (coop-walk-fixes P6, Michael 4.72: "if coop partner holds guard, host doesnt have option for takedown.") the host
    // beside the client's hostage is offered the team takedown, and it knocks him out there: the hold ends, a dual takedown.
    // (The client's own finisher from the hold goes the same td done path as the client takedown above.)
    const d0 = await GA(() => window.__app.current.net.duals);
    await GA((id) => {
      const g = window.__app.current;
      const e = g.enemyMgr.enemies.find((x) => x.id === id);
      const yaw = [...g.net.remotes.values()][0].state.yaw;
      // 1.1 m to the hostage's side (off the holder's line), facing him
      const x = e.pos.x + Math.cos(yaw) * 1.1;
      const z = e.pos.z - Math.sin(yaw) * 1.1;
      g.player.controller.teleport(new g.player.position.constructor(x, e.pos.y + 0.05, z), Math.atan2(e.pos.x - x, e.pos.z - z));
    }, gg);
    // (started in the poll that sees the offer: it can come and go between two polls)
    await until(A, (id) => { const td = window.__app.current.takedown; const o = td.offer; if (td.active?.plan.kind === 'assist') return true; if (o?.plan.kind !== 'assist' || o.e.id !== id) return false; td.start(false); return true; }, gg, 6000, "the host is offered the team takedown on the client's hostage");
    await until(A, (id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return !e || (!e.alive && e.ko); }, gg, 8000, "the team takedown knocks the client's hostage out on the host");
    await until(B, () => !window.__app.current.takedown.active, null, 4000, "the client's hold ends with him");
    // (optic-coop merge triage) he went down to the host's team takedown (a knockout by the host's player), not to fire
    // (the until above also passes on any death: a dead guard leaves the host's list)
    const down = await GA((id) => JSON.stringify((window.__kills ?? []).filter((k) => k.id === id)), gg);
    const dk = JSON.parse(down)[0];
    assert(!!dk && dk.ko && dk.team === 'player' && dk.by === 'local' && dk.kind === 'melee', `the host's team takedown is what knocks him out (${down})`);
    assert((await GA(() => window.__app.current.net.duals)) === d0 + 1, 'the team takedown counts as a dual (co-op) takedown');
    await GA(() => { window.__calmGen = (window.__calmGen ?? 0) + 1; });
    // (fix round 1) empty the client's HUD banner, so the dual step below proves its own banner reaches the client
    await GB(() => { const b = document.querySelector('.hud-banner'); if (b) b.innerHTML = ''; });
  }
  // dual takedown: two players finishing takedowns together (clock cleared first: the client's takedowns above would else pair with the host's)
  // (fix round 1) counts relative to here: the team takedown above is already one dual takedown
  const { k0, nd0, sd0 } = await GA(() => { const g = window.__app.current; g.net['dualClock'].reset(); window.__duals = []; g.events.on('dualTakedown', (e) => window.__duals.push(e)); return { k0: g.style.knockouts, nd0: g.net.duals, sd0: g.style.duals }; });
  await GA(([a, b]) => { const n = window.__app.current.net; n['takedownDone'](a); n['takedownDone'](b); }, [hostId0, clientId]);
  assert((await GA(() => window.__app.current.net.duals)) === nd0 + 1, 'two takedowns together count as a dual takedown');
  const dv = await GA(() => { const g = window.__app.current; const d = window.__duals; return { n: g.style.duals, k: g.style.knockouts, ev: d.length, a: d[0]?.a, b: d[0]?.b }; });
  assert(dv.n === sd0 + 1 && dv.ev === 1 && dv.a === hostId0 && dv.b === clientId, `the dual takedown is counted and evented for section-rating (${JSON.stringify(dv)} h=${hostId0} c=${clientId})`);
  assert(dv.k === k0, `a dual takedown adds no knockout of its own (${k0} -> ${dv.k})`);
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
    await until(A, () => !!window.__app.current?.enemyMgr && !!window.__app.current.net, null, LOAD_MS, 'host match up');
    await until(B, () => !!window.__app.current?.net, null, LOAD_MS, 'client match up');
    const hd = await GA(() => { const d = window.__app.current.enemyMgr.diff; return { p: d.perception, t: d.reaction, l: d.label }; });
    assert(hd.p === 1.3 && hd.t === 0.8 && hd.l === 'Realistic', `the host's manager runs Realistic (${JSON.stringify(hd)})`);
    const cd = await GB(() => ({ p: window.__app.current.diff.perception, l: window.__app.current.diff.label }));
    assert(cd.p === 1.3 && cd.l === 'Realistic', `the client's match takes the host's level (${JSON.stringify(cd)})`);
    await toLobby();
    await GA((m) => window.__coop.session.setSettings(m[0], m[1], 'normal', m[2]), MISSION);
  }

  // (guard-ai S23, A143 / A144) every player is seen: a calm grunt on the Warehouse factory floor (9, -6) faces the
  // client standing still under the lit lamp strip (9, 3), 9 m in front of him; the host stands 4 m away behind him in the
  // service corridor, the z -8.8 wall between them (no line). Before S23 the guard perceived only the nearest player (the
  // hidden host) and never saw the client. His meter fills on the client and his target is the client's ref; once he
  // is in combat the host walks nearer behind the wall and the guard keeps his target and his line on the client.
  // A match of its own (its guard alerted, the others statues): the AI runs on the host as in every co-op match; the
  // test guard is pinned on his spot on every host sim step (the loop's fixedUpdate hook, as the strike pin above; facing
  // the client while calm), his brain on; the other guards and the recon drone are statues (their brains off), so
  // nothing else alerts him. Both players invulnerable (damageMul 0).
  console.log('guard-ai S23: every player is seen (a calm guard spots the client in his light while the host hides nearer)');
  {
    await startMode(...MISSION);
    await GA(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
    const S23 = { guard: [9, -6], client: [9, 3], host: [9, -10.3] };
    const cid = await GB(() => window.__coop.session.selfId);
    // the host in the corridor behind the wall, facing it (+z); the client under the lamp strip
    await GA(([x, z]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, 0.05, z), 0); g.player.cam.yaw = 0; g.player.cam.pitch = 0; }, S23.host);
    await moveClient(B, S23.client[0], 0.1, S23.client[1], Math.PI);
    await until(A, ([x, z]) => { const r = window.__app.current.remotePlayers()[0]; return !!r && Math.hypot(r.feet.x - x, r.feet.z - z) < 0.6 && r.speed < 0.15; }, S23.client, 15000, 'S23: the host has the client still under the lamp');
    let gid = '';
    try {
      const setup = await GA(([sp, cl, cid]) => {
        const g = window.__app.current;
        const em = g.enemyMgr;
        const V = g.player.position.constructor;
        // (S9 pattern) room for one more guard; restored below
        em['s23Cap'] = em.maxAlive;
        em.maxAlive = Math.max(em.maxAlive, em.alive + 1);
        // the others statues and calm (and the recon drone), before the test guard is there
        for (const x of em.enemies) {
          x.update = () => {};
          if (x.alive && !x.taken) x.aware.set('unaware');
        }
        for (const d of em.drones) d.update = () => true;
        for (const r of g.net.remotes.values()) r.ref.spotted = false;
        g.localRef.spotted = false;
        const yaw0 = Math.atan2(cl[0] - sp[0], cl[1] - sp[1]);
        const e = em.spawn('grunt', new V(sp[0], 0, sp[1]), false, yaw0);
        if (!e) return null;
        // his spot as the nav placed him, facing the client
        const P = { x: e.pos.x, y: e.pos.y, z: e.pos.z, yaw: Math.atan2(cl[0] - e.pos.x, cl[1] - e.pos.z) };
        e.yaw = P.yaw;
        e.meter = 0;
        const refs = g.playerRefs();
        const hd = Math.hypot(refs[0].feet.x - P.x, refs[0].feet.z - P.z);
        const cd = Math.hypot(refs[1].feet.x - P.x, refs[1].feet.z - P.z);
        const gen = (window.__s23Gen = (window.__s23Gen ?? 0) + 1);
        const s = (window.__s23 = { phase: 'calm', t0: g.time, t: 0, meter: 0, rise: '', tid: '', los: false, alertT: -1, alertTid: '', seen0: 0, seen1: 0, combat: 0, offTarget: 0, noLos: 0, hostStart: hd, hostMin: hd, off: '' });
        const pin = () => {
          if (!e.alive) return;
          e.pos.set(P.x, P.y, P.z);
          if (!e.alerted) e.yaw = P.yaw;
        };
        const hooks = window.__app.loop['hooks'];
        const orig = hooks.fixedUpdate;
        const step = (dt) => {
          if (window.__s23Gen !== gen || window.__app.current !== g) {
            if (hooks.fixedUpdate === step) hooks.fixedUpdate = orig;
            orig(dt);
            return;
          }
          pin();
          orig(dt);
          pin();
          if (!e.alive) return;
          // what he perceived this step (the last think's): his meter while calm, his target, who is in sight
          const tid = e['target']?.id ?? '';
          s.t = g.time - s.t0;
          s.tid = tid;
          s.los = e['los'] === true;
          if (!e.alerted) {
            if (e.meter > s.meter) s.meter = e.meter;
            if (e.meter > 0 && !s.rise) s.rise = tid || '(none)';
          } else if (s.alertT < 0) {
            s.alertT = s.t;
            s.alertTid = tid;
          }
          if (e.seesIndex(0)) s.seen0++;
          if (e.seesIndex(1)) s.seen1++;
          if (s.phase === 'combat') {
            s.combat++;
            if (tid !== cid || !s.los) {
              if (tid !== cid) s.offTarget++;
              if (!s.los) s.noLos++;
              if (!s.off) s.off = `t ${s.t.toFixed(2)} target ${tid || '(none)'} los ${s.los}`;
            }
            const h = g.player.position;
            const d = Math.hypot(h.x - P.x, h.z - P.z);
            if (d < s.hostMin) s.hostMin = d;
          }
        };
        hooks.fixedUpdate = step;
        pin();
        return { id: e.id, P, hd, cd, ids: refs.map((r) => r.id), light: refs[1].light ?? null, hostLight: refs[0].light ?? null };
      }, [S23.guard, S23.client, cid]);
      assert(!!setup, 'S23: a calm grunt spawns on the factory floor');
      gid = setup.id;
      assert(setup.ids[1] === cid && setup.hd < setup.cd - 3, `S23: the host is the nearer player, the client is players()[1] (host ${setup.hd.toFixed(2)} m, client ${setup.cd.toFixed(2)} m, refs ${setup.ids.join(',')}, client ${cid})`);

      // calm: until his meter reaches 0.6 (or he goes to combat), at most 6 s of the host's sim
      await until(A, () => { const s = window.__s23; return s.meter >= 0.6 || s.alertT >= 0 || s.t > 6; }, null, 20000, 'S23: the guard notices the client (or 6 s)').catch(() => {});
      const calm = await GA(() => ({ ...window.__s23 }));
      const why = JSON.stringify({ calm, light: setup.light, guard: setup.P });
      assert(calm.meter > 0.05 && calm.rise === cid, `S23: the calm guard's meter fills on the client in his light, the hidden host nearer (meter ${calm.meter.toFixed(2)} in ${calm.t.toFixed(2)} s; ${why})`);
      assert(calm.tid === cid && calm.seen1 > 0 && calm.seen0 === 0, `S23: his target is the client's ref; he sees player 1, never the host behind the wall (seesIndex) (${why})`);

      // combat on the client: his own alert (meter 1), else forced (the combat case is what is checked next)
      const alertedSelf = await until(A, () => window.__s23.alertT >= 0, null, 8000, 'S23: the guard goes to combat').then(() => true, () => false);
      if (!alertedSelf) {
        console.log('    (S23: not in combat by himself within 8 s; alerted by hand)');
        await GA((id) => window.__app.current.enemyMgr.enemies.find((x) => x.id === id)?.alert(), gid);
      }
      await until(A, (cid) => { const s = window.__s23; return s.alertT >= 0 && s.tid === cid && s.los; }, cid, 8000, 'S23: in combat on the client, with a line to him').catch(() => {});
      const c0 = await GA(() => ({ ...window.__s23 }));
      assert(c0.alertT >= 0 && c0.tid === cid && c0.los, `S23: in combat his target is the client, in sight (${JSON.stringify(c0)})`);

      // the host walks nearer behind the wall (into it, ~4.3 m -> ~3.2 m): the guard keeps his target and his line
      await GA(() => {
        const g = window.__app.current;
        window.__s23.phase = 'combat';
        g.player.cam.yaw = 0;
        g.player.cam.pitch = 0;
        window.__app.input.state.setMove('t', 0, 0.6);
      });
      const walked = await waitHostSim(A, 2000);
      await GA(() => window.__app.input.state.setMove('t', 0, 0));
      const held = await waitHostSim(A, 1000);
      const c1 = await GA(() => ({ ...window.__s23 }));
      const why1 = JSON.stringify({ walked: Math.round(walked), held: Math.round(held), c1 });
      assert(walked >= 2000 && held >= 1000 && c1.combat > 60, `S23: 3 s of the host's sim in combat (${why1})`);
      assert(c1.hostMin < c1.hostStart - 0.5, `S23: the host walked nearer behind the wall (${c1.hostStart.toFixed(2)} -> ${c1.hostMin.toFixed(2)} m)`);
      assert(c1.offTarget === 0 && c1.noLos === 0 && c1.seen0 === 0, `S23: the nearer hidden host does not blind him: target and line stay on the client every step (${why1})`);
    } finally {
      await GA((id) => {
        window.__s23Gen = (window.__s23Gen ?? 0) + 1;
        window.__app.input.state.setMove('t', 0, 0);
        const em = window.__app.current?.enemyMgr;
        if (!em) return;
        for (const x of em.enemies) delete x.update;
        for (const d of em.drones) delete d.update;
        const e = em.enemies.find((x) => x.id === id);
        if (e) em.despawn(e);
        if (em['s23Cap'] !== undefined) em.maxAlive = em['s23Cap'];
      }, gid).catch(() => {});
    }
    await toLobby();
  }

  // (guard-ai S24, G139, A146-A148) two intruders: four calm grunts in two pairs ~23 m apart, a wall and the racks
  // between them (the S9 team-spawn pattern: `em.maxAlive` raised and restored; both players invulnerable). Pair 1 in the
  // racking hall's aisle (x -14.5) faces the host 7.7 m north in the cross aisle; pair 2 on the factory floor faces the
  // client 9 m north under the lamp strip (S23's spot). Both players are lit by a pinned light (the host's sampler is
  // replaced for the block, as e2e-stealth-ai's `t.light`); the mission's own guards and the drone are statues with their
  // hitboxes parked (no ray stops on them), the alarm panels off. Once both pairs are in combat: two valid intruder
  // slots, pair 1 hunts the host's and pair 2 the client's. Then both players go dark and leave, out through the south
  // facade into the dark yard lane (z -24.75; S24 coop triage: no walkable cell inside the building has a line to either
  // spot, door leaves left out; the old service-corridor and dispatch spots were in sight of pair 2's own cover picks
  // against the client's spot, the corridor side of the z -8.8 wall and through the glazed dispatch window): each guard
  // works from his own player's last known position, never the other's, and no guard of either pair ever hunts the
  // other pair's player.
  console.log('guard-ai S24: two intruders (each pair hunts the player it saw, never the other)');
  {
    await startMode(...MISSION);
    await GA(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
    const S24 = { pair1: [[-15, -2.5], [-14, -2.5]], host: [-14.5, 5.2], pair2: [[8, -6], [9.2, -6]], client: [9, 3], hostHide: [-3.75, -24.75], clientHide: [8.75, -24.75] };
    const cid = await GB(() => window.__coop.session.selfId);
    const hostSpot = await GA(([x, z]) => { const g = window.__app.current; const nav = g.enemyMgr.nav; const c = nav.nearestWalkable(x, z, 2, 0); const [cx, cz] = c >= 0 ? nav.center(c) : [x, z]; g.player.controller.teleport(new g.player.position.constructor(cx, 0.05, cz), Math.PI); g.player.cam.pitch = 0; return [cx, cz]; }, S24.host);
    await moveClient(B, S24.client[0], 0.1, S24.client[1], Math.PI);
    await until(A, ([x, z]) => { const r = window.__app.current.remotePlayers()[0]; return !!r && Math.hypot(r.feet.x - x, r.feet.z - z) < 0.6 && r.speed < 0.15; }, S24.client, 15000, 'S24: the host has the client still under the lamp');
    let ids = [];
    try {
      const setup = await GA(([S, hs, cid]) => {
        const g = window.__app.current;
        const em = g.enemyMgr;
        const V = g.player.position.constructor;
        // (S9 pattern) room for four more guards; restored below
        em['s24Cap'] = em.maxAlive;
        em.maxAlive = Math.max(em.maxAlive, em.alive + 4);
        // the mission's guards statues, calm, out of every ray; the drone a statue; no alarm panel
        for (const x of em.enemies) {
          x.update = () => {};
          if (x.alive && !x.taken) x.aware.set('unaware');
          if (x.alive) {
            x['hitboxes']?.setEnabled(false);
            x['s24Parked'] = true;
          }
        }
        for (const d of em.drones) d.update = () => true;
        window.__s24Panels = em.alarms.map((p) => p.disabled);
        for (const p of em.alarms) p.disabled = true;
        // both players lit (a pinned level) until they hide; the light sampler restored below
        window.__s24Light = 1;
        g['updateLight'] = () => {
          g.localRef.light = g.lightLevel = window.__s24Light;
          for (const r of g.remotePlayers()) r.light = window.__s24Light;
        };
        const out = [];
        const face = (p, t) => Math.atan2(t[0] - p[0], t[1] - p[1]);
        for (const p of S.pair1) out.push(em.spawn('grunt', new V(p[0], 0, p[1]), false, face(p, hs)));
        for (const p of S.pair2) out.push(em.spawn('grunt', new V(p[0], 0, p[1]), false, face(p, S.client)));
        if (out.some((e) => !e)) return null;
        for (const e of out) e.meter = 0;
        const sHost = em.intruders.slotFor(g.localRef.id);
        const sClient = em.intruders.slotFor(cid);
        const gen = (window.__s24Gen = (window.__s24Gen ?? 0) + 1);
        // per guard (pair 1 then pair 2): his own pair's slot, the other's, closest approaches once hiding
        const s = (window.__s24 = { phase: 'seen', t0: g.time, t: 0, hideT: -1, sHost, sClient, own: [Infinity, Infinity, Infinity, Infinity], other: [Infinity, Infinity, Infinity, Infinity], wrong: [0, 0, 0, 0], seen: [0, 0, 0, 0], kOwn: [0, 0, 0, 0], kOther: [Infinity, Infinity, Infinity, Infinity], hunts: [], levels: [], spots: null });
        const hooks = window.__app.loop['hooks'];
        const orig = hooks.fixedUpdate;
        const step = (dt) => {
          if (window.__s24Gen !== gen || window.__app.current !== g) {
            if (hooks.fixedUpdate === step) hooks.fixedUpdate = orig;
            orig(dt);
            return;
          }
          orig(dt);
          s.t = g.time - s.t0;
          s.hunts = out.map((e) => e.hunt);
          s.levels = out.map((e) => (e.alive ? e.level : 'down'));
          if (s.phase !== 'hide') return;
          for (let i = 0; i < out.length; i++) {
            const e = out[i];
            const mine = i < 2 ? sHost : sClient;
            const theirs = i < 2 ? sClient : sHost;
            if (e.hunt === theirs) s.wrong[i]++;
            if (e.seesIndex(0) || e.seesIndex(1)) s.seen[i]++;
            const a = em.lkpOf(mine);
            if (a) s.own[i] = Math.min(s.own[i], Math.hypot(e.pos.x - a.x, e.pos.z - a.z));
            const b = s.spots[i < 2 ? 1 : 0];
            s.other[i] = Math.min(s.other[i], Math.hypot(e.pos.x - b[0], e.pos.z - b[1]));
            // the point he works from (enemy.ts knownPt, set each combat think): his own player's spot, never the other's
            const k = e.knownPt;
            if (a && k) s.kOwn[i] = Math.max(s.kOwn[i], Math.hypot(k[0] - a.x, k[1] - a.z));
            if (k) s.kOther[i] = Math.min(s.kOther[i], Math.hypot(k[0] - b[0], k[1] - b[1]));
          }
        };
        hooks.fixedUpdate = step;
        return { ids: out.map((e) => e.id), sHost, sClient, ref: g.playerRefs().map((r) => r.id) };
      }, [S24, hostSpot, cid]);
      assert(!!setup, 'S24: four calm grunts spawn in two pairs');
      ids = setup?.ids ?? [];
      assert(setup.sHost >= 0 && setup.sClient >= 0 && setup.sHost !== setup.sClient, `S24: one intruder slot per player (host ${setup.sHost}, client ${setup.sClient}; refs ${setup.ref.join(',')}, client ${cid})`);

      // both pairs in combat on their own player (their own sight; by hand after 12 s: they see him then)
      const ready = () => { const s = window.__s24; return s.levels.length === 4 && s.levels.every((l) => l === 'alert') && s.hunts[0] === s.sHost && s.hunts[1] === s.sHost && s.hunts[2] === s.sClient && s.hunts[3] === s.sClient; };
      const self = await until(A, ready, null, 30000, 'S24: both pairs in combat on their own player').then(() => true, () => false);
      if (!self) {
        console.log(`    (S24: not both pairs in combat by themselves: ${JSON.stringify(await GA(() => ({ lv: window.__s24.levels, h: window.__s24.hunts, t: window.__s24.t })))}; alerted by hand)`);
        await GA((ids) => { for (const e of window.__app.current.enemyMgr.enemies) if (ids.includes(e.id) && !e.alerted) e.alert(); }, ids);
        await until(A, ready, null, 15000, 'S24: both pairs in combat on their own player (by hand)').catch(() => {});
      }
      const c0 = await GA(() => {
        const em = window.__app.current.enemyMgr;
        const s = window.__s24;
        const b = em.intruders;
        const at = (k) => { const v = em.lkpOf(k); return v ? [v.x, v.z] : null; };
        return { levels: s.levels, hunts: s.hunts, valid: [b.valid[s.sHost], b.valid[s.sClient]], nValid: [...b.valid].filter((v) => v === 1).length, spots: [at(s.sHost), at(s.sClient)], t: s.t };
      });
      const why0 = JSON.stringify(c0);
      assert(c0.levels.every((l) => l === 'alert'), `S24: both pairs in combat (${why0})`);
      assert(c0.valid[0] === 1 && c0.valid[1] === 1 && c0.nValid === 2, `S24: two valid last known positions, one per player (${why0})`);
      assert(c0.hunts[0] === setup.sHost && c0.hunts[1] === setup.sHost, `S24: pair 1 hunts the host's slot (${why0})`);
      assert(c0.hunts[2] === setup.sClient && c0.hunts[3] === setup.sClient, `S24: pair 2 hunts the client's slot (${why0})`);

      // both go dark and leave: out into the dark yard lane, walled off from every cell inside (snapped to the nav)
      const hide = await GA(([hh, ch]) => {
        const g = window.__app.current;
        const em = g.enemyMgr;
        const nav = em.nav;
        const snap = (p) => { const c = nav.nearestWalkable(p[0], p[1], 2, 0); return c >= 0 ? nav.center(c) : p; };
        const s = window.__s24;
        const at = (k) => { const v = em.lkpOf(k); return v ? [v.x, v.z] : null; };
        s.spots = [at(s.sHost), at(s.sClient)];
        window.__s24Light = 0;
        const h = snap(hh);
        g.player.controller.teleport(new g.player.position.constructor(h[0], 0.05, h[1]), 0);
        return { spots: s.spots, client: snap(ch) };
      }, [S24.hostHide, S24.clientHide]);
      assert(!!hide.spots[0] && !!hide.spots[1], `S24: both last known positions held when they hide (${JSON.stringify(hide)})`);
      await moveClient(B, hide.client[0], 0.1, hide.client[1], 0);
      await GA(() => { const s = window.__s24; s.hideT = s.t; s.phase = 'hide'; });
      const hid = await waitHostSim(A, 10000);
      const c1 = await GA(() => ({ ...window.__s24 }));
      const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : String(v));
      const why1 = JSON.stringify({ hid: Math.round(hid), own: c1.own.map(f2), other: c1.other.map(f2), kOwn: c1.kOwn.map(f2), kOther: c1.kOther.map(f2), seen: c1.seen, wrong: c1.wrong, hunts: c1.hunts, levels: c1.levels, spots: c1.spots });
      assert(hid >= 10000, `S24: 10 s of the host's sim with both players hidden (${why1})`);
      const own1 = Math.min(c1.own[0], c1.own[1]);
      const own2 = Math.min(c1.own[2], c1.own[3]);
      const oth1 = Math.min(c1.other[0], c1.other[1]);
      const oth2 = Math.min(c1.other[2], c1.other[3]);
      // setup guard: both hide spots are walled off from both pairs (in combat sight is geometry only, no light / range)
      assert(c1.seen.every((n) => n === 0), `S24: no pair guard sees a player during the hide (setup: hide spots walled off) (${why1})`);
      // deterministic: each guard works from his own player's last known position, never the other's (roles may hold
      // a pair in cover past 10 s, so distance closed is logged, not asserted)
      assert(c1.kOwn.every((d) => d <= 0.5), `S24: every guard works from his own player's last known position (${why1})`);
      assert(c1.kOther.every((d) => d > 10), `S24: no guard works from the other player's last known position (G139) (${why1})`);
      assert(oth1 > own1 && oth2 > own2, `S24: each pair moves toward its own player's spot, not the other's (pair 1 ${f2(own1)} / ${f2(oth1)} m, pair 2 ${f2(own2)} / ${f2(oth2)} m) (${why1})`);
      console.log(`    (S24: closest to own last known position: pair 1 ${f2(own1)} m, pair 2 ${f2(own2)} m in 10 s)`);
      assert(c1.wrong.every((n) => n === 0), `S24: no guard of either pair ever hunts the other pair's player (G139) (${why1})`);
    } finally {
      await GA((ids) => {
        window.__s24Gen = (window.__s24Gen ?? 0) + 1;
        const g = window.__app.current;
        if (g) g['updateLight'] = Object.getPrototypeOf(g)['updateLight'];
        const em = g?.enemyMgr;
        if (!em) return;
        for (const x of em.enemies) {
          delete x.update;
          if (x['s24Parked']) {
            x['hitboxes']?.setEnabled(true);
            delete x['s24Parked'];
          }
        }
        for (const d of em.drones) delete d.update;
        if (window.__s24Panels) em.alarms.forEach((p, i) => (p.disabled = window.__s24Panels[i] ?? p.disabled));
        for (const id of ids) { const e = em.enemies.find((x) => x.id === id); if (e) em.despawn(e); }
        if (em['s24Cap'] !== undefined) em.maxAlive = em['s24Cap'];
      }, ids).catch(() => {});
    }
    await toLobby();
  }

  // (guard-ai S26, G139, A155, A157, A158) the partner is heard: the S24 setup with one guard (the factory floor pair's
  // spot, facing the client 9 m north under the lamp; the mission's guards statues, `em.maxAlive` raised and restored,
  // both players invulnerable, the alarm panels off, a pinned light). The host stays dark in the yard lane the whole
  // time. The guard sees the lit client (by hand after 30 s if he does not), the client goes dark out into the yard lane,
  // the guard goes to the last known position (the lamp) and searches. (S26 coop triage: both hides are S24's dark yard
  // lane spots, walled off from every cell inside; the old corridor hide was in sight of this guard's own combat cover
  // picks, so he saw the client hide and searched the hide itself, and the dispatch hide is seen through its window.)
  // Then, the moment the searcher arrives at a search spot and starts his 3 s look round, the host picks a short straight
  // leg 2.2 m behind his look (else beside him) from the nav (walkable) and the game's own hearing (`tierOf`: no wall in
  // the way) and holds the guard still (his brain off, as the statues) while the client is put on the leg; the guard is
  // let go and the client RUNS for real (full stick: the host's `remoteNoise` reads his speed from his states at 4 Hz, a
  // teleport is not a footstep) there and back. Every leg point is past the 1.8 m close range and the client is dark, so
  // he can be heard, not seen. On the host, within 6 s of the host's sim: the client's slot `locT` < 1 with `seenT` > 1
  // (located, not seen), the guard re-aimed on a noise since the run started and his `searchSpot` moved off his look
  // spot to within 2 m of the client, he still hunts the client; and the host's own slot never held a position (G139:
  // the client's noise locates the client only). A real run is a jog (CT has no sprint): its reach is ~3.4 m.
  console.log('guard-ai S26: the partner is heard (a searcher hears the client run behind him; only the client is located)');
  {
    await startMode(...MISSION);
    await GA(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
    const S26 = { guard: [8, -6], client: [9, 3], hostHide: [-3.75, -24.75], clientHide: [8.75, -24.75] };
    const cid = await GB(() => window.__coop.session.selfId);
    // the host dark in the yard lane from the start, the client lit under the lamp
    await GA(([x, z]) => { const g = window.__app.current; const nav = g.enemyMgr.nav; const c = nav.nearestWalkable(x, z, 2, 0); const [cx, cz] = c >= 0 ? nav.center(c) : [x, z]; g.player.controller.teleport(new g.player.position.constructor(cx, 0.05, cz), 0); g.player.cam.pitch = 0; }, S26.hostHide);
    await moveClient(B, S26.client[0], 0.1, S26.client[1], Math.PI);
    await until(A, ([x, z]) => { const r = window.__app.current.remotePlayers()[0]; return !!r && Math.hypot(r.feet.x - x, r.feet.z - z) < 0.6 && r.speed < 0.15; }, S26.client, 15000, 'S26: the host has the client still under the lamp');
    let gid = '';
    try {
      const setup = await GA(([S, cid]) => {
        const g = window.__app.current;
        const em = g.enemyMgr;
        const V = g.player.position.constructor;
        // (S9 pattern) room for one more guard; restored below
        em['s26Cap'] = em.maxAlive;
        // (S26 coop triage r2) no alarm run (as e2e-stealth-ai's no-alarm runs): the panels are off, but the contact call
        // still owes the radio alarm (`RADIO_ALARM`), whose response team comes in at the entry furthest from the host,
        // (18, -24.5) in the yard lane 9 m from the client's hide; alerted, its guards report him from a bare line of sight
        // (`takeSighting`, dark or not), his last known position moves into the yard and the searcher follows it there
        em['s26Alarm'] = em.alarmRaised;
        em.alarmRaised = true;
        em.maxAlive = Math.max(em.maxAlive, em.alive + 1);
        // the mission's guards statues, calm, out of every ray; the drone a statue; no alarm panel
        for (const x of em.enemies) {
          x.update = () => {};
          if (x.alive && !x.taken) x.aware.set('unaware');
          if (x.alive) {
            x['hitboxes']?.setEnabled(false);
            x['s26Parked'] = true;
          }
        }
        for (const d of em.drones) d.update = () => true;
        window.__s26Panels = em.alarms.map((p) => p.disabled);
        for (const p of em.alarms) p.disabled = true;
        // the host always dark, the client lit (a pinned level) until he hides; the light sampler restored below
        window.__s26Light = 1;
        g['updateLight'] = () => {
          g.localRef.light = g.lightLevel = 0;
          for (const r of g.remotePlayers()) r.light = window.__s26Light;
        };
        const e = em.spawn('grunt', new V(S.guard[0], 0, S.guard[1]), false, Math.atan2(S.client[0] - S.guard[0], S.client[1] - S.guard[1]));
        if (!e) return null;
        e.meter = 0;
        const sHost = em.intruders.slotFor(g.localRef.id);
        const sClient = em.intruders.slotFor(cid);
        const gen = (window.__s26Gen = (window.__s26Gen ?? 0) + 1);
        const tmp = [0, 0];
        const s = (window.__s26 = { phase: 'seen', hopT0: -1, level: '', hunt: -1, sHost, sClient, hostValid: 0, loc0: -1, spot0: [0, 0], hPrev: 99, locMin: 99, tLoc: -1, seenAtLoc: -1, tSpot: -1, spotMin: 99, heard: false, t: 0, leg: null, tried: [1e9, 1e9], picks: 0, nSeen: 0, nLoc: 0, pSeen: 99, pLoc: 99 });
        // (S26 coop triage) the leg, picked on the step a searcher starts his look round at a spot: 2.2 m behind his look
        // (else beside him), 3 m long, walkable, every point in a jog's reach with no wall in the way (`tierOf`, reach 3 of
        // ~3.4) and past the 1.8 m close range; then he is held still (his brain off) until the client stands on it
        const pickLeg = () => {
          const nav = em.nav;
          const y0 = e.pos.y;
          const spot = e.searchSpot([0, 0]);
          const base = e['lookBase'];
          const walk = (x, z) => { const c = nav.cellOf(x, z, y0); return c >= 0 && nav.isWalkable(c) && Math.abs(nav.cellHeight(c) - y0) <= 1; };
          const i = em.enemies.indexOf(e);
          const heard = (x, z) => {
            em['hearRoom'](em.enemies.length);
            const d = Math.hypot(e.pos.x - x, e.pos.z - z);
            return d > 1.9 && em['tierOf'](e, i, new V(x, y0, z), 3, d, false) >= 1;
          };
          for (const th of [Math.PI, 0.75 * Math.PI, -0.75 * Math.PI, 0.5 * Math.PI, -0.5 * Math.PI]) {
            const ux = Math.sin(base + th);
            const uz = Math.cos(base + th);
            const mx = e.pos.x + 2.2 * ux;
            const mz = e.pos.z + 2.2 * uz;
            for (const sg of [1, -1]) {
              const dx = sg * uz;
              const dz = -sg * ux;
              const ax = mx - 1.5 * dx;
              const az = mz - 1.5 * dz;
              const bx = mx + 1.5 * dx;
              const bz = mz + 1.5 * dz;
              let clear = true;
              for (let k = 0; k <= 12 && clear; k++) clear = walk(ax + (bx - ax) * (k / 12), az + (bz - az) * (k / 12));
              if (!clear || !heard(ax, az) || !heard(mx, mz) || !heard(bx, bz)) continue;
              return { a: [ax, az], b: [bx, bz], yaw: Math.atan2(dx, dz), y: nav.cellHeight(nav.cellOf(ax, az, y0)), guard: [e.pos.x, e.pos.z], look: base, spot: [spot[0], spot[1]], loc0: em.intruders.locT[sClient], lookT: e['spotLookT'] };
            }
          }
          return null;
        };
        const hooks = window.__app.loop['hooks'];
        const orig = hooks.fixedUpdate;
        const step = (dt) => {
          if (window.__s26Gen !== gen || window.__app.current !== g) {
            if (hooks.fixedUpdate === step) hooks.fixedUpdate = orig;
            orig(dt);
            return;
          }
          orig(dt);
          const b = em.intruders;
          s.level = e.alive ? e.level : 'down';
          s.hunt = e.hunt;
          s.hostValid = Math.max(s.hostValid, b.valid[sHost]);
          // the client's reports (diagnostics): seen (`seenT` reset) or located only (`locT` reset)
          if (b.seenT[sClient] < s.pSeen) s.nSeen++;
          else if (b.locT[sClient] < s.pLoc) s.nLoc++;
          s.pSeen = b.seenT[sClient];
          s.pLoc = b.locT[sClient];
          if (s.phase === 'pick') {
            // at a spot (the search branch's 1.1 m), his look round just started, the client not located for 1.5 s; one
            // try per spot
            if (!e.alive || e.level !== 'searching') return;
            e.searchSpot(tmp);
            const lt = e['spotLookT'];
            if (Math.hypot(tmp[0] - e.pos.x, tmp[1] - e.pos.z) >= 1.1 || !(lt > 0 && lt < 0.5) || b.locT[sClient] <= 1.5) return;
            if (Math.hypot(tmp[0] - s.tried[0], tmp[1] - s.tried[1]) < 0.3) return;
            s.tried = [tmp[0], tmp[1]];
            s.picks++;
            const leg = pickLeg();
            if (!leg) return;
            s.leg = leg;
            // held still while the client is put on the leg (the statues' way; let go before the run)
            e.update = () => {};
            s.phase = 'held';
            return;
          }
          if (s.phase !== 'walk') return;
          const r = g.remotePlayers()[0];
          if (!r) return;
          s.t = g.time - s.hopT0;
          // his re-aim clock (`heardAt`) only grows unless he re-aims on a noise
          if (e.heardAt < s.hPrev) s.heard = true;
          s.hPrev = e.heardAt;
          e.searchSpot(tmp);
          const d = Math.hypot(tmp[0] - r.feet.x, tmp[1] - r.feet.z);
          if (d < s.spotMin) s.spotMin = d;
          if (s.tSpot < 0 && d <= 2 && s.heard && Math.hypot(tmp[0] - s.spot0[0], tmp[1] - s.spot0[1]) > 0.5) s.tSpot = s.t;
          const loc = b.locT[sClient];
          if (loc < s.locMin) s.locMin = loc;
          if (s.tLoc < 0 && loc < 1) {
            s.tLoc = s.t;
            s.seenAtLoc = b.seenT[sClient];
          }
        };
        hooks.fixedUpdate = step;
        return { id: e.id, sHost, sClient };
      }, [S26, cid]);
      assert(!!setup, 'S26: the guard spawns');
      gid = setup?.id ?? '';
      assert(setup.sHost >= 0 && setup.sClient >= 0 && setup.sHost !== setup.sClient, `S26: one intruder slot per player (host ${setup.sHost}, client ${setup.sClient})`);

      // the guard in combat on the client (his own sight; by hand after 30 s)
      const ready = () => { const s = window.__s26; return s.level === 'alert' && s.hunt === s.sClient; };
      const self = await until(A, ready, null, 30000, 'S26: the guard in combat on the client').then(() => true, () => false);
      if (!self) {
        console.log(`    (S26: not in combat by himself: ${JSON.stringify(await GA(() => ({ level: window.__s26.level, hunt: window.__s26.hunt })))}; alerted by hand)`);
        await GA((id) => window.__app.current.enemyMgr.enemies.find((x) => x.id === id)?.alert(), gid);
        await until(A, ready, null, 15000, 'S26: the guard in combat on the client (by hand)').catch(() => {});
      }
      const c0 = await GA(() => { const s = window.__s26; const b = window.__app.current.enemyMgr.intruders; return { level: s.level, hunt: s.hunt, validClient: b.valid[s.sClient], validHost: b.valid[s.sHost] }; });
      assert(c0.level === 'alert' && c0.validClient === 1 && c0.validHost === 0, `S26: in combat with a last known position for the client and none for the host (${JSON.stringify(c0)})`);

      // the client goes dark and leaves (out into the yard lane, snapped to the nav); the guard goes to the last known
      // position and searches
      const hide = await GA((ch) => {
        const nav = window.__app.current.enemyMgr.nav;
        const c = nav.nearestWalkable(ch[0], ch[1], 2, 0);
        window.__s26Light = 0;
        return c >= 0 ? nav.center(c) : ch;
      }, S26.clientHide);
      await moveClient(B, hide[0], 0.1, hide[1], 0);
      const searching = await until(A, () => window.__s26.level === 'searching', null, 60000, 'S26: the guard searches').then(() => true, () => false);
      const st0 = await GA(() => { const { leg, ...s } = window.__s26; return s; });
      assert(searching, `S26: after losing the client the guard searches (${JSON.stringify(st0)})`);

      // the leg, picked by the host's step hook at his next look round with room behind him (he is held still then)
      await GA(() => { window.__s26.phase = 'pick'; });
      const picked = await until(A, () => !!window.__s26.leg || window.__s26.level !== 'searching', null, 40000, 'S26: a leg behind the searcher').then(() => true, () => false);
      const leg = await GA(() => {
        const s = window.__s26;
        if (s.leg) return s.leg;
        const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive && !x['s26Parked']);
        const sp = e ? e.searchSpot([0, 0]) : [NaN, NaN];
        return { err: `level ${s.level}, ${s.picks} spot(s) tried, guard ${e ? `${e.pos.x.toFixed(1)}, ${e.pos.z.toFixed(1)}` : 'none'}, spot ${sp[0].toFixed(1)}, ${sp[1].toFixed(1)}, locT ${window.__app.current.enemyMgr.intruders.locT[s.sClient].toFixed(2)}, client seen ${s.nSeen} / located ${s.nLoc} times, alarm ${window.__app.current.enemyMgr.alarmRaised}, ${window.__app.current.enemyMgr.enemies.filter((x) => x.alive && !x['s26Parked']).length} live guard(s)` };
      });
      assert(picked && !leg.err, `S26: a searcher looking round at a spot with a straight leg behind him in a jog's reach (${leg.err ?? JSON.stringify(leg)})`);
      assert(leg.loc0 > 1.5, `S26: before the run the client was last located more than 1.5 s ago (locT ${leg.loc0}; ${JSON.stringify(leg)})`);
      // the client on the leg (a teleport: no step), seen there by the host, then the guard let go and the run starts
      await moveClient(B, leg.a[0], leg.y + 0.1, leg.a[1], leg.yaw);
      await until(A, ([x, z]) => { const r = window.__app.current.remotePlayers()[0]; return !!r && Math.hypot(r.feet.x - x, r.feet.z - z) < 0.6; }, leg.a, 10000, 'S26: the host has the client on the leg');
      await GA(() => {
        const g = window.__app.current;
        const s = window.__s26;
        const e = g.enemyMgr.enemies.find((x) => x.alive && !x['s26Parked']);
        if (e) {
          delete e.update;
          e.searchSpot(s.spot0);
          s.hPrev = e.heardAt;
        }
        s.loc0 = g.enemyMgr.intruders.locT[s.sClient];
        s.hopT0 = g.time;
        s.phase = 'walk';
      });
      const heardDone = () => GA(() => { const s = window.__s26; return s.tLoc >= 0 && s.tSpot >= 0; });
      for (let k = 0; k < 4 && !(await heardDone()); k++) {
        // there (k even) and back (k odd): the full stick along the leg
        await GB(([yaw]) => { const g = window.__app.current; g.player.cam.yaw = yaw; g.player.cam.pitch = 0; window.__app.input.state.setMove('t', 0, 1); }, [leg.yaw + (k % 2 ? Math.PI : 0)]);
        await waitHostSim(A, 1300);
      }
      await GB(() => window.__app.input.state.setMove('t', 0, 0));
      const c1 = await GA(() => ({ ...window.__s26 }));
      const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : String(v));
      const why = JSON.stringify({ leg, tLoc: f2(c1.tLoc), seenAtLoc: f2(c1.seenAtLoc), tSpot: f2(c1.tSpot), spotMin: f2(c1.spotMin), locMin: f2(c1.locMin), heard: c1.heard, hunt: c1.hunt, level: c1.level, hostValid: c1.hostValid, sHost: c1.sHost, sClient: c1.sClient });
      assert(c1.tLoc >= 0 && c1.tLoc <= 6, `S26: the client's noise locates him on the host within 6 s of the host's sim (locT < 1 at ${f2(c1.tLoc)} s; ${why})`);
      assert(c1.seenAtLoc > 1, `S26: heard, not seen: his seenT was ${f2(c1.seenAtLoc)} s when he was located (${why})`);
      assert(c1.heard && c1.tSpot >= 0 && c1.tSpot <= 6, `S26: he re-aims on the noise: his search spot moves off his look spot to within 2 m of the client within 6 s (at ${f2(c1.tSpot)} s, closest ${f2(c1.spotMin)} m; ${why})`);
      assert(c1.hunt === c1.sClient, `S26: he still hunts the client (${why})`);
      assert(c1.hostValid === 0, `S26: the host's own slot never held a position (G139: the client's noise locates the client only) (${why})`);
      console.log(`    (S26: located after ${f2(c1.tLoc)} s, his spot within 2 m of the client after ${f2(c1.tSpot)} s, closest ${f2(c1.spotMin)} m)`);
    } finally {
      await GB(() => window.__app.input.state.setMove('t', 0, 0)).catch(() => {});
      await GA((id) => {
        window.__s26Gen = (window.__s26Gen ?? 0) + 1;
        const g = window.__app.current;
        if (g) g['updateLight'] = Object.getPrototypeOf(g)['updateLight'];
        const em = g?.enemyMgr;
        if (!em) return;
        for (const x of em.enemies) {
          delete x.update;
          if (x['s26Parked']) {
            x['hitboxes']?.setEnabled(true);
            delete x['s26Parked'];
          }
        }
        for (const d of em.drones) delete d.update;
        if (window.__s26Panels) em.alarms.forEach((p, i) => (p.disabled = window.__s26Panels[i] ?? p.disabled));
        const e = em.enemies.find((x) => x.id === id);
        if (e) em.despawn(e);
        if (em['s26Cap'] !== undefined) em.maxAlive = em['s26Cap'];
        if (em['s26Alarm'] !== undefined) em.alarmRaised = em['s26Alarm'];
      }, gid).catch(() => {});
    }
    await toLobby();
  }

  console.log('infiltration co-op: the mission and its objectives reach the client');
  await startMode('infiltration', 'warehouse', 'warehouse-ledger');
  const inf = await GB(() => ({ map: window.__app.current.world.map.id, mode: window.__app.current.opts.mode }));
  assert(inf.map === 'warehouse' && inf.mode === 'infiltration', `client on the mission's map (${JSON.stringify(inf)})`);
  await until(B, () => (window.__app.current.interactables?.items ?? []).some((i) => i.kind !== 'door' && i.kind !== 'revive'), null, 10000, 'objective items on the client');
  // (coop-fix) the host's mission objective, not the connecting placeholder (hud-guidance B3, HG9: the notices ride the
  // net-status line, never the objective)
  await until(B, () => { const t = window.__app.current.hud.objectiveText; return t.length > 0 && !/Connecting to host|Waiting for host/.test(t); }, null, 10000, 'the mission objective on the client');
  const obj = await GB(() => window.__app.current.hud.objectiveText);
  assert(!/Connecting to host|Waiting for host/.test(obj) && obj.length > 0, `client sees the mission's objectives (${obj})`);
  await until(B, () => window.__app.current.hud.netStatusText === '', null, 10000, 'net-status line empty in the mission (HG9)');

  // (hang-down) The joiner hangs head-first from the host's hands over the Warehouse's mezzanine lip. The offer and the
  // request are made by their own calls (the drop search is skipped: a railing post can stand in its waist ray; the host
  // still checks the request), the rest is the game: hanging, the client draws the pistol (LT; the host lets it hold it),
  // grabs a guard with the hold-A menu and knocks him out (KBM Z), neck-snaps a second (RT held), grabs a third and the
  // host pulls it up: the held guard is knocked out by default. The guards are statues on their spots (their brains off,
  // as the takedown steps above: the start, the reach check and the outcome are the real code).
  console.log('hang-down: the hanging joiner draws the pistol, grabs, neck-snaps; the pull-up knocks the held guard out');
  {
    await GA(() => { const g = window.__app.current; g.target.damageMul = 0; for (const r of g.net.remotes.values()) r.damageMul = 0; });
    const lip = await GA(() => {
      const g = window.__app.current;
      const L = g.world.level.anchors.ledges.filter((l) => l.canHang && Math.abs(l.top - 2.6) < 0.1 && Math.abs(l.a.z - 12) < 0.25 && Math.abs(l.b.z - 12) < 0.25).sort((p, q) => q.len - p.len)[0];
      return L ? { x: L.a.x + L.tx * (L.len / 2), y: L.top } : null;
    });
    assert(!!lip, `hang-down: the mezzanine lip (${JSON.stringify(lip)})`);
    const HZ = 11.6;
    const spot = { x: lip.x + 0.3, z: HZ - 0.3 };
    const hdIds = await GB(() => [...window.__app.current.net.puppets.values()].filter((p) => p.alive && p.def.kind === 'grunt').slice(0, 3).map((p) => p.id));
    assert(hdIds.length === 3, `hang-down: three calm guards (${hdIds.join(',')})`);
    const hdState = (P) => P.evaluate(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify({ st: g.team.state, why: g.team.endWhy, denied: g.team.lastDenied, cnt: g.team.count, depth: g.team.hang.depth, pos: [c.pos.x, c.pos.y, c.pos.z].map((n) => n.toFixed(2)), offer: g.takedown.offer ? { id: g.takedown.offer.e.id, kind: g.takedown.offer.plan.kind } : null, td: !!g.takedown.active, hostage: g.takedown.hostage?.id ?? null, draw: g.weapons.drawPhase }); });
    // the guards: the one in play at the spot under the hang, the others well off it; all calm, the client unspotted
    // (every host sim step, the loop's fixedUpdate hook, as the strike pin above)
    const pinHd = (live) => GA(([ids, live, sp]) => {
      const g = window.__app.current;
      const gen = (window.__hdPinGen = (window.__hdPinGen ?? 0) + 1);
      const vs = ids.map((id) => g.enemyMgr.enemies.find((e) => e.id === id));
      const pin = () => {
        for (const r of g.net.remotes.values()) r.ref.spotted = false;
        for (const e of g.enemyMgr.enemies) {
          e['stagger'] = 99;
          if (e.alive && !e.taken) e.aware.set('unaware');
        }
        vs.forEach((v, i) => {
          if (!v?.alive || v.taken) return;
          v.update = () => {};
          if (v.id === live) v.pos.set(sp.x, 0, sp.z);
          else v.pos.set(sp.x - 6 - i * 1.5, 0, sp.z - 4);
          v.yaw = 0;
        });
      };
      const hooks = window.__app.loop['hooks'];
      const orig = hooks.fixedUpdate;
      const step = (dt) => {
        if (window.__hdPinGen !== gen || window.__app.current !== g) {
          if (hooks.fixedUpdate === step) hooks.fixedUpdate = orig;
          orig(dt);
          return;
        }
        pin();
        orig(dt);
        pin();
      };
      hooks.fixedUpdate = step;
      pin();
    }, [hdIds, live, spot]);
    // (fix round) every host kill / knock-out from here on: a guard killed or knocked out leaves `enemyMgr.enemies` (the
    // manager drops dead entries the same step), so the outcome is read from this log, not from the list
    await GA(() => {
      const em = window.__app.current.enemyMgr;
      const prev = em.onKilled;
      window.__hdKills = [];
      window.__hdKillsPrev = prev;
      em.onKilled = (e, h) => {
        window.__hdKills.push({ id: e.id, ko: !!e.ko, kind: h.kind, by: h.attackerId, pos: [e.pos.x, e.pos.y, e.pos.z].map((n) => +n.toFixed(2)) });
        prev?.(e, h);
      };
    });
    const hostKo = (id) => GA((id) => window.__hdKills.some((k) => k.id === id && k.ko), id);
    const hostKilled = (id) => GA((id) => window.__hdKills.some((k) => k.id === id && !k.ko), id);
    // (fix round) why a guard is not offered: the client's offer search on his puppet, the host's guard and its log
    const hdWhy = async (id) => {
      const c = await GB((id) => {
        const g = window.__app.current;
        const p = g.net.puppets.get(id);
        const o = p ? g.takedown['tryVictim'](p) : null;
        const i = g.takedown['inp'];
        return JSON.stringify({ sent: g.team.hang.sent, spotted: g.spottedLocal, puppet: p ? { pos: [p.pos.x, p.pos.y, p.pos.z].map((n) => +n.toFixed(2)), alive: p.alive, taken: p.taken, level: p.level } : null, plan: o?.plan.kind ?? null, ay: +i.ay.toFixed(2), los: i.los });
      }, id).catch((e) => String(e));
      const h = await GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return JSON.stringify({ found: !!e, pos: e && [e.pos.x, e.pos.y, e.pos.z].map((n) => +n.toFixed(2)), taken: e?.taken, level: e?.level, log: window.__hdKills }); }, id);
      console.log('    client:', c, '\n    host:', h);
    };
    try {
      await pinHd('');
      for (const P of [A, B]) await P.evaluate(() => { window.__pad.connect(); for (let i = 0; i < 4; i++) window.__pad.axis(i, 0); for (let i = 0; i < 17; i++) window.__pad.set(i, 0); });
      // the host on the mezzanine facing the lip, the client beside it
      await GA(([x, y]) => { const g = window.__app.current; g.team.end(true); g.player.controller.teleport(new g.player.position.constructor(x, y + 0.05, 12.4), Math.PI); }, [lip.x, lip.y]);
      await moveClient(B, lip.x + 0.8, lip.y + 0.05, 12.4, Math.PI);
      await until(A, () => window.__app.current.player.controller.grounded, null, 8000, 'hang-down: the host stands on the mezzanine');
      await until(A, ([x, y]) => { const r = window.__app.current.net.remotes.values().next().value; return Math.hypot(r.feet.x - x, r.feet.z - 12.4) < 0.4 && Math.abs(r.feet.y - y) < 0.4; }, [lip.x + 0.8, lip.y], 15000, 'hang-down: the host sees the client beside it');
      const hostId = await GA(() => window.__coop.session.selfId);
      let hanging = false;
      for (let attempt = 0; attempt < 4 && !hanging; attempt++) {
        // the host offers the hang-down at the lip (its own state, as the crouch + RB facing the drop sets it)
        await GA(([x, y, z]) => {
          const t = window.__app.current.team;
          if (t.state === 'hangOffer' || t.state === 'hangHold') return;
          t.end(true);
          Object.assign(t.hang, { x, z, edgeY: y, floorY: 0, max: 2.3, sent: false, lostT: 0 });
          t.state = 'hangOffer';
          t['t'] = 0;
          t.partner = '';
        }, [lip.x, lip.y, HZ]);
        await until(B, () => window.__app.current.net.teamMates().some((m) => m.mode === 'brace' && (m.sub & 2) !== 0), null, 8000, 'hang-down: the client sees the host offering');
        await GB(([id, y, x, z]) => { const g = window.__app.current; g.team.partner = id; g.net.teamRequest('hang', id, -1, 0, y, x, z); }, [hostId, lip.y, lip.x, HZ]);
        hanging = await until(B, () => window.__app.current.team.state === 'hanging', null, 15000, 'hang-down: the client hangs head-first').then(() => true, async () => { console.log('    client:', await hdState(B), 'host:', await hdState(A)); return false; });
      }
      assert(hanging, 'hang-down: the client hangs head-first from the host over the lip');
      await until(A, () => window.__app.current.team.state === 'hangHold', null, 8000, 'hang-down: the host holds');
      // the holder raises the client so the head is at a standing guard's neck (the stick's own depth, set)
      await GA(() => { window.__app.current.team.hang.depth = 1.2; });
      await until(B, () => Math.abs(window.__app.current.team.hang.depth - 1.2) < 0.02 && window.__app.current.team.hangActs, null, 10000, 'hang-down: the client follows the holder to 1.2 m');

      // the pistol: LT draws it one-handed, aimed inverted; the host lets the hanging client hold it (no forced holster)
      await B.evaluate(() => window.__pad.set(6, 1));
      try {
        await until(B, () => { const g = window.__app.current; return g.player.attachAim?.inverted === true && g.weapons.drawPhase === 2 && g.weapons.current.def.class === 'pistol'; }, null, 10000, 'hang-down: the hanging client draws the pistol (LT)');
        await until(A, () => { const mv = window.__app.current.net.remotes.values().next().value.state?.mv; return mv?.m === 'boost' && (mv.sub & 2) !== 0 && mv.dw === 2; }, null, 8000, 'hang-down: the host sees the hanging client with the pistol drawn');
        assert(true, 'hang-down: the hanging client aims the pistol, held as drawn on the host');
      } finally {
        await B.evaluate(() => window.__pad.set(6, 0));
      }
      await until(B, () => window.__app.current.weapons.drawPhase === 0 && !window.__app.current.player.adsWanted, null, 10000, 'hang-down: the pistol goes away');

      // the grab: the guard by the head, the hold-A menu's GRAB CHARACTER (A held opens it, the release runs it)
      const g1 = hdIds[0];
      await pinHd(g1);
      await until(B, (id) => window.__app.current.takedown.offer?.e.id === id && window.__app.current.takedown.offer.plan.kind === 'hangDown', g1, 15000, 'hang-down: the guard under the hang is offered').catch(async (e) => { console.log('    client:', await hdState(B)); throw e; });
      await B.evaluate(() => window.__pad.set(0, 1));
      try {
        await until(B, () => { const m = window.__app.current['ctxMenu']; return m.state === 'active' && m.opts[m.sel]?.opt === 'grab'; }, null, 8000, 'hang-down: hold A lists GRAB CHARACTER');
      } finally {
        await B.evaluate(() => window.__pad.set(0, 0));
      }
      await until(B, (id) => window.__app.current.takedown.hostage?.id === id && window.__app.current.takedown.menuReady, g1, 8000, 'hang-down: the client holds the guard, lifted');
      assert(await GB(() => window.__app.current.team.state === 'hanging'), 'hang-down: still hanging while holding');
      // the host keeps the client's guard (no let-go after TD_MAX) under the hanging head
      await wait(1500);
      const near = await GA((id) => { const g = window.__app.current; const e = g.enemyMgr.enemies.find((x) => x.id === id); const r = g.net.remotes.values().next().value; return { taken: !!e?.taken, d: e ? Math.hypot(e.pos.x - r.feet.x, e.pos.z - r.feet.z) : -1 }; }, g1);
      assert(near.taken && near.d >= 0 && near.d < 0.9, `hang-down: the host holds the guard under the hanging client (${JSON.stringify(near)})`);
      // KBM Z (the knockout)
      await GB(() => window.__app.input.state.tap('altFire'));
      await until(A, (id) => window.__hdKills.some((k) => k.id === id && k.ko), g1, 10000, 'hang-down: the held guard knocked out on the host');
      assert(await hostKo(g1), 'hang-down: grab and knock out from the hang');

      // the neck snap: RT held on the next guard in reach (no menu row needed)
      const g2 = hdIds[1];
      await pinHd(g2);
      await until(B, () => !window.__app.current.takedown.active, null, 5000, 'hang-down: the grab finished');
      let snapped = false;
      for (let attempt = 0; attempt < 3 && !snapped; attempt++) {
        await until(B, (id) => window.__app.current.takedown.offer?.e.id === id, g2, 15000, 'hang-down: the second guard offered').catch(async (e) => { console.log('    client:', await hdState(B)); await hdWhy(g2).catch((x) => console.log('    (no diag)', x)); throw e; });
        await B.evaluate(() => window.__pad.set(7, 1));
        try {
          snapped = await until(A, (id) => window.__hdKills.some((k) => k.id === id && !k.ko), g2, 12000, 'hang-down: RT held neck-snaps the guard').then(() => true, async () => { console.log('    client:', await hdState(B)); return false; });
        } finally {
          await B.evaluate(() => window.__pad.set(7, 0));
        }
      }
      assert(snapped && (await hostKilled(g2)), 'hang-down: RT held from the hang kills (the neck snap)');

      // KO by default: a third guard grabbed, the host pulls the client up (RB): the client's hold ends as a knockout
      const g3 = hdIds[2];
      await pinHd(g3);
      await until(B, () => !window.__app.current.takedown.active, null, 5000, 'hang-down: the neck snap finished');
      await until(B, (id) => window.__app.current.takedown.offer?.e.id === id, g3, 15000, 'hang-down: the third guard offered').catch(async (e) => { await hdWhy(g3).catch(() => {}); throw e; });
      await B.evaluate(() => window.__pad.set(0, 1));
      try {
        await until(B, () => { const m = window.__app.current['ctxMenu']; return m.state === 'active' && m.opts[m.sel]?.opt === 'grab'; }, null, 8000, 'hang-down: hold A lists GRAB CHARACTER again');
      } finally {
        await B.evaluate(() => window.__pad.set(0, 0));
      }
      await until(B, (id) => window.__app.current.takedown.hostage?.id === id, g3, 8000, 'hang-down: the client holds the third guard');
      await A.evaluate(() => window.__pad.set(5, 1));
      try {
        await until(A, () => window.__app.current.team.state === 'none', null, 10000, 'hang-down: the host pulls the client up (RB)');
      } finally {
        await A.evaluate(() => window.__pad.set(5, 0));
      }
      await until(A, (id) => window.__hdKills.some((k) => k.id === id && k.ko), g3, 10000, 'hang-down: the held guard knocked out by default');
      assert(await hostKo(g3), 'hang-down: the hang ending while holding knocks the guard out (no let-go)');
      await until(B, () => { const g = window.__app.current; return g.team.state === 'none' && g.player.pose.tumble === 0 && !g.takedown.active; }, null, 10000, 'hang-down: the client is back up, upright');
      assert(true, 'hang-down: the client is pulled back onto the mezzanine');
    } finally {
      await GA(() => { const em = window.__app.current?.enemyMgr; if (em) em.onKilled = window.__hdKillsPrev; }).catch(() => {});
      await GA((ids) => { window.__hdPinGen = (window.__hdPinGen ?? 0) + 1; for (const e of window.__app.current.enemyMgr.enemies) if (ids.includes(e.id)) delete e.update; }, hdIds).catch(() => {});
      for (const P of [A, B]) await P.evaluate(() => { for (let i = 0; i < 17; i++) window.__pad?.set(i, 0); window.__app.current?.team?.end(true); }).catch(() => {});
      // (the host had no pad before: back to keyboard and mouse there)
      await GA(() => window.__pad?.disconnect()).catch(() => {});
    }
  }
  // (marlow-bays item 4, A1) "Return to lobby" from the host's pause menu takes both players back to the room lobby; the
  // client's row is disabled ("Host only") and it keeps its own Quit
  console.log('pause: return to lobby (host only) takes both players back to the lobby');
  await GB(() => window.__app.current.pause());
  await until(B, () => !!document.querySelector('.pause-screen'), null, 5000, 'client pause open');
  const cRow = await GB(() => { const b = document.querySelector('.pause-screen [data-key="return-lobby"]'); return b ? { blocked: b.classList.contains('blocked'), sub: b.querySelector('.btn-sub')?.textContent ?? '', quit: !!document.querySelector('.pause-screen [data-key="quit"]'), restart: !!document.querySelector('.pause-screen [data-key="restart-checkpoint"]') } : null; });
  assert(!!cRow && cRow.blocked && cRow.sub === 'Host only' && cRow.quit && !cRow.restart, `the client's Return to lobby is disabled, Host only; its Quit stays; no restart row in infiltration (${JSON.stringify(cRow)})`);
  await GA(() => window.__app.current.pause());
  await until(A, () => !!document.querySelector('.pause-screen [data-key="return-lobby"]:not(.blocked)'), null, 5000, 'host pause has a live Return to lobby');
  await GA(() => { const b = document.querySelector('.pause-screen [data-key="return-lobby"]'); window.__app.nav.focus(b); b.click(); });
  await until(A, () => /Stay/.test(window.__app.nav.focused?.textContent ?? '') && !!window.__app.screens.top?.el.classList.contains('dialog-screen'), null, 5000, 'the lobby confirm opens on Stay');
  await GA(() => [...document.querySelectorAll('.dialog-buttons .btn')].find((b) => /Return/.test(b.textContent)).click());
  for (const P of pages()) await until(P, () => !!document.querySelector('.lobby-screen') && !window.__coop.inGame, null, 15000, 'back in the lobby from the pause menu');
  assert(true, 'the host returns both players to the lobby from the pause menu');

  // (course-restart-hold) "Restart at checkpoint" in the course while a guard is held: the hold is let go before the
  // squad respawns (the client's puppet of the old guard is disposed; reading its rig crashed the client every frame).
  // Marlow Yard station 1's training guard (passive): first the client holds him, then the host's own player does.
  console.log('course: restart at checkpoint while the client, then the host, holds the guard');
  {
    await startMode('course', 'ctcourse');
    await until(A, () => !!window.__course?.state && window.__app.current.enemyMgr.enemies.some((e) => e.alive), null, 15000, 'host course guard');
    const realErr = (es) => es.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext|Failed to load resource/i.test(e));
    const guard = () => GA(() => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive); return { id: e.id, x: e.pos.x, y: e.pos.y, z: e.pos.z, yaw: e.yaw }; });
    /** Holds the guard from behind on page P (the client goes through the host's teleport window). */
    const grabOn = async (P, tag) => {
      const gd = await guard();
      await until(B, (id) => !!window.__app.current.net.puppets.get(id)?.alive, gd.id, 15000, 'the client has the guard');
      const bx = gd.x - Math.sin(gd.yaw) * 1.1;
      const bz = gd.z - Math.cos(gd.yaw) * 1.1;
      let held = false;
      for (let i = 0; i < 40 && !held; i++) {
        if (i % 10 === 0) {
          if (P === B) await moveClient(B, bx, gd.y + 0.1, bz, gd.yaw);
          else await GA(([x, y, z, yaw]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw); }, [bx, gd.y + 0.1, bz, gd.yaw]);
        }
        held = await P.evaluate((id) => {
          const g = window.__app.current;
          if (g.takedown.offer?.e.id === id && g.takedown.offer.plan.kind === 'behind' && !g.takedown.active) g.takedown.start();
          return g.takedown.hostage?.id === id;
        }, gd.id);
        if (!held) await wait(150);
      }
      assert(held, `${tag} holds the course guard`);
      return gd.id;
    };
    for (const [P, tag] of [[B, 'the client'], [A, 'the host']]) {
      const old = await grabOn(P, tag);
      const n0 = [eA.length, eB.length];
      // (guard-models G9, M3) the held guard's kind and look seed: his slot (the authored point) must give the new guard the same seed
      const was = await GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return { kind: e.def.kind, look: e.look }; }, old);
      assert(await GA(() => window.__course.restartCheckpoint()), `the host restarts at the checkpoint (${tag} holding)`);
      await until(A, (id) => window.__app.current.enemyMgr.enemies.some((e) => e.alive && e.id !== id), old, 8000, 'the squad respawns on the host');
      // frames on both pages past the client's stale-puppet drop (0.5 s) and the respawn
      await wait(3000);
      const errsNow = [...realErr(eA.slice(n0[0])), ...realErr(eB.slice(n0[1]))];
      const free = await GB((id) => { const g = window.__app.current; return { active: !!g.takedown.active, hostage: g.takedown.hostage?.id ?? null, old: g.net.puppets.has(id) }; }, old);
      const hostFree = await GA(() => { const g = window.__app.current; return { active: !!g.takedown.active, seized: g.net.seized.size, taken: g.enemyMgr.enemies.filter((e) => e.taken).length }; });
      assert(errsNow.length === 0, `no errors on either page after the restart (${tag} holding)${errsNow.length ? ': ' + errsNow.slice(0, 3).join(' | ') : ''}`);
      assert(!free.active && !free.hostage && !free.old, `the client holds nothing and the old guard's puppet is gone (${JSON.stringify(free)})`);
      assert(!hostFree.active && hostFree.seized === 0 && hostFree.taken === 0, `the host holds nothing and no guard is taken (${JSON.stringify(hostFree)})`);
      const re = await GA((o) => window.__app.current.enemyMgr.enemies.filter((e) => e.alive && e.id !== o.id && e.def.kind === o.kind).map((e) => ({ id: e.id, look: e.look })), { id: old, kind: was.kind });
      assert(re.some((r) => r.look === was.look), `after the restart the same slot has the same look seed on the host (${was.look} -> ${JSON.stringify(re)}) (${tag} holding)`);
      await until(B, (l) => l.some((r) => window.__app.current.net.puppets.get(r.id)), re, 10000, 'the client has a respawned guard').catch(() => {});
      const reB = await GB((l) => l.map((r) => ({ id: r.id, look: window.__app.current.net.puppets.get(r.id)?.look ?? -1 })), re);
      const seen = reB.filter((r) => r.look >= 0);
      assert(seen.length > 0 && seen.every((r) => r.look === re.find((h) => h.id === r.id).look), `the client's puppets of the respawned guards carry the same seeds (${JSON.stringify({ re, reB })}) (${tag} holding)`);
      assert(seen.some((r) => r.look === was.look), `the client's respawned guard of that slot has the same seed as before the restart (${was.look}) (${tag} holding)`);
    }
    await toLobby();
  }

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
  await GB((yaw) => { const c = window.__app.current.player.cam; c.yaw = yaw; c.pitch = 0; const tap = (a) => window.__app.input.state.tap(a); /* (A3) door menu: A, one down, A = Stealth open */ window.__afterSim(0.4, () => tap('interact')); window.__afterSim(0.9, () => tap('uiDown')); window.__afterSim(1.4, () => tap('interact')); }, dpos[3]);
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

  // (marlow-bays R1, R3) the host drops mid-match: the joiner stays in the match with "Host disconnected - waiting
  // (code)"; the host's main menu offers "Resume hosting <code>", which reopens the room and starts the match again from
  // its checkpoint, and the waiting joiner takes it
  console.log('rejoin: the host drops, the joiner waits on the code, Resume hosting brings both back');
  {
    const code1 = await GA(() => window.__coop.session.code);
    const mode1 = await GA(() => window.__app.current.opts.mode);
    await GA(() => window.__coop.leave());
    await until(B, (c) => { const n = document.querySelector('.hud-net-notice'); return !!n && n.style.display !== 'none' && n.textContent.includes(`waiting (${c})`); }, code1, 20000, 'the joiner waits on the code');
    assert(await GB(() => !!window.__app.current?.net && window.__coop.waiting && !document.querySelector('.dialog-screen')), 'the joiner stays in the match (no Host left dialog)');
    await until(A, (c) => (document.querySelector('.main-menu [data-key="rejoin"]')?.textContent ?? '').includes(`Resume hosting ${c}`), code1, 60000, 'the host main menu offers Resume hosting <code>');
    await GA(() => document.querySelector('.main-menu [data-key="rejoin"]').click());
    await until(A, ([m, c]) => !!window.__app.current?.net && window.__app.current.opts.mode === m && window.__coop.session.code === c && window.__coop.session.isHost, [mode1, code1], LOAD_MS, 'the host reopens the room in the same mode');
    await until(B, () => !window.__coop.waiting && !!window.__app.current?.net && !window.__app.current.isEnded, null, LOAD_MS, 'the waiting joiner takes the resumed match');
    await until(A, () => { const rs = [...window.__app.current.net.remotes.values()]; return rs.length === 1 && !!rs[0].state; }, null, LOAD_MS, 'the joiner is back on the host');
    const n = await GB(() => { const e = document.querySelector('.hud-net-notice'); return !e || e.style.display === 'none'; });
    assert(n, 'the waiting line is gone once the match resumes');
    assert(true, 'a dropped host resumes the room from its main menu and the joiner is back in');
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

// (coop4 L1) Lobby caps. A mode's seats are `capacity(mode)`: Sector Ops up to 4 (after slice N1; 2 until then), the
// campaign (Marlow Yard) 2. The room is hosted in a legacy 4-seat mode so a 3rd page can join now, then switched.
console.log('lobby caps: slots by mode, Start blocked over the cap, Room full, Marlow lobby for 2');
{
  let lb = null;
  /** Live error arrays (each page's, filled as errors come), flattened at the end. */
  const lerrs = [];
  try {
    const H = await hostAndJoin(url, 1, { viewport: { width: 1280, height: 640 } });
    lb = H.browser;
    lerrs.push(...H.errors);
    const LA = H.A;
    const LG = (f, a) => LA.evaluate(f, a);
    const rows = (P) => P.evaluate(() => ({ all: document.querySelectorAll('.lobby-screen .lobby-player').length, empty: document.querySelectorAll('.lobby-screen .lobby-player.empty').length }));
    const lcode = await LG(() => window.__coop.session.code);
    /** Open a page and join the room by its code (the Join with code screen). */
    const joinPage = async () => {
      const o = await openPage(H.ctx, url, 'net=local');
      lerrs.push(o.errors);
      await o.page.click('.main-menu .btn:has-text("Co-op")');
      await o.page.click('.btn:has-text("Join with code")');
      await o.page.keyboard.type(lcode.toLowerCase());
      await o.page.keyboard.press('Enter');
      return o.page;
    };

    // Marlow Yard (Campaign), one player: two slots, one open; the host is told Marlow needs two and to invite teammates (J14 F1)
    assert((await LG(() => window.__coop.session.mode)) === 'course', 'lobby caps: a new room is Campaign');
    const r1 = await rows(LA);
    assert(r1.all === 2 && r1.empty === 1, `lobby caps: Campaign lobby with one player shows 2 slots, 1 open (${JSON.stringify(r1)})`);
    const st1 = await LG(() => document.querySelector('.lobby-screen .lobby-status')?.textContent ?? '');
    assert(st1 === 'Marlow Yard needs two players. Share the code to invite your partner.', `lobby caps: host status line (${st1})`);

    // a 2nd page joins: Marlow's lobby for 2 is full, no open slot
    const LB = await joinPage();
    await until(LA, () => window.__coop.session.players.size === 2, null, 15000, 'lobby caps: host sees page 2');
    await until(LB, () => window.__coop.session.hostId && window.__coop.session.players.size === 2, null, 15000, 'lobby caps: page 2 sees the lobby');
    for (const [n, P] of [['host', LA], ['joiner', LB]]) {
      const r = await rows(P);
      assert(r.all === 2 && r.empty === 0, `lobby caps: Campaign lobby for 2 shows 2 players, no open slot, on the ${n} (${JSON.stringify(r)})`);
    }

    // a 3rd page joining a Campaign room is refused: Room full, with the cap
    const LX = await joinPage();
    await until(LX, () => /Room full/.test(document.querySelector('.dialog-screen .dialog-title')?.textContent ?? ''), null, 15000, 'lobby caps: the 3rd page gets Room full');
    const fullMsg = await LX.evaluate(() => document.querySelector('.dialog-screen .dialog-msg')?.textContent ?? '');
    assert(/2 players/.test(fullMsg), `lobby caps: Room full names the cap (${fullMsg})`);
    assert((await LG(() => window.__coop.session.players.size)) === 2, 'lobby caps: the full room still has its 2 players');
    await LX.close();

    // a 4-seat room (Free Roam) takes a 3rd page; then the host switches the room to Campaign, then Sector Ops
    await LG(() => window.__coop.session.setSettings('sandbox', 'warehouse', 'normal', ''));
    const LC = await joinPage();
    const trio = [LA, LB, LC];
    setSimPages(trio);
    await until(LA, () => window.__coop.session.players.size === 3, null, 15000, 'lobby caps: host sees page 3');
    for (const P of trio.slice(1)) await until(P, () => window.__coop.session.hostId && window.__coop.session.players.size === 3, null, 15000, 'lobby caps: pages see 3 players');

    await LG(() => window.__coop.session.setSettings('course', 'ctcourse', 'normal', ''));
    await until(LA, () => window.__coop.session.overCapacity && document.querySelector('.lobby-actions [data-key="start"]')?.classList.contains('blocked'), null, 10000, 'lobby caps: Start blocked with 3 in a Campaign room');
    const lock = await LG(() => document.querySelector('.lobby-actions [data-key="start"]').dataset.locked);
    assert(lock === 'Too many players for this mode (2)', `lobby caps: Campaign blocks Start with 3 players (${lock})`);
    await LA.click('.lobby-actions [data-key="start"]');
    await LA.waitForTimeout(500);
    assert(await LG(() => window.__coop.session.phase === 'lobby' && !window.__coop.inGame), 'lobby caps: Start does nothing while blocked');

    await LG(() => window.__coop.session.setSettings('sector', 'warehouseOps', 'normal', ''));
    for (const P of trio) await until(P, () => window.__coop.session.mode === 'sector', null, 10000, 'lobby caps: the room shows Sector Ops');
    // the page's own capacity('sector'): 3 players over the cap means 2 (before N1), else the 4 seats
    const sectorCap = (await LG(() => window.__coop.session.overCapacity)) ? 2 : 4;
    if (sectorCap !== 4) {
      console.log(`  SKIP until N1: capacity('sector') is ${sectorCap}, not 4 (the 4-slot lobby and the 3-page Sector Ops start are not asserted)`);
    } else {
      for (const [n, P] of [['host', LA], ['page 2', LB], ['page 3', LC]]) {
        await until(P, () => document.querySelectorAll('.lobby-screen .lobby-player').length === 4, null, 10000, `lobby caps: ${n} shows 4 slots`);
        const r = await rows(P);
        assert(r.all === 4 && r.empty === 1, `lobby caps: Sector Ops lobby shows 4 slots, 1 open, on ${n} (${JSON.stringify(r)})`);
      }
      for (const P of trio.slice(1)) await P.evaluate(() => window.__coop.session.setReady(true));
      await until(LA, () => window.__coop.session.allReady && !document.querySelector('.lobby-actions [data-key="start"]')?.classList.contains('blocked'), null, 10000, 'lobby caps: Start unblocked for 3 ready players');
      await LA.click('.lobby-actions [data-key="start"]');
      for (const P of trio) await until(P, () => window.__app.current?.opts?.mode === 'sector' && !!window.__app.current.net && !window.__app.current.isEnded, null, LOAD_MS, 'lobby caps: Sector Ops match on every page');
      assert(true, 'lobby caps: a 3-page Sector Ops room starts');
    }
  } catch (e) {
    failed = true;
    console.error(String(e));
  } finally {
    errs.push(...lerrs.flat());
    await lb?.close();
  }
}

// (coop4 AI6, guard-ai #319, docs/coop4/briefs/AI6-E2E-SPEC.md "e2e-coop with 3 clients") Four pages (host A, clients B, C, D)
// over ?net=local in the Ledger mission on the Warehouse, the mission's guards statues (the S24 staging: hitboxes parked,
// panels off, a pinned light per player). (1) Three rooms with no line between them, two calm grunts each facing his room's
// player (host, B, C; D far away, dark, never seen): each guard hunts the slot of the player he saw while all three hide,
// no guard walks to another room's last known position, rays per guard per think stay <= 9. (2) B closes his game and
// rejoins with his token: same slot, last known position kept until his first report; a hold that runs out
// (`NetSession.expireAway`, the host's `removeRemote`) marks the slot gone. (3) C behind a calm guard: a crouch-walk is
// silent, a standing run is heard and locates C's slot (never the host's), a noisy hold's pulse (`em.hear(item, r, .., id)`,
// what coopHost's `onHoldPulse` calls) locates C at the item. Every read of a guard-ai #319 hook is guarded: a build
// without it prints "SKIP: guard-ai #319 hook <name> missing" and the rest runs (on feature/coop4 alone the block only
// proves four pages start the mission with four players in the guards' list).
// Deviations from the spec, with the reason: (a) the net layer holds a dropped joiner (`r.held`, out of `remotePlayers()`),
// `removeRemote` runs only when the hold ends, so (2) drops B with `__coop.leave()` + `Rejoin` and the `gone` / `removeRemote`
// read is its own step (2c); (b) CT has no sprint, a standing run is a jog (reach ~3 m, S26), so (3) runs C 2.6 m behind the
// guard (past the 1.8 m close range), not 4-6 m.
console.log('coop4 guard AI (AI6): three intruders over four pages - each pair hunts its own player, a client leaves and rejoins into its slot, a crouch-walk is silent and a run is heard');
{
  let ab = null;
  const aerrs = [];
  let stopPump = () => {};
  /** Every guard the block spawned. */
  let spawned = [];
  let hookKey = 0;
  try {
    const H = await hostAndJoin(url, 4);
    ab = H.browser;
    aerrs.push(...H.errors);
    const HA = H.A;
    const P4 = H.pages;
    stopPump = pumpPages(() => P4);
    const GH = (f, a) => HA.evaluate(f, a);
    const ids4 = await eachPage(P4, (P) => P.evaluate(() => window.__coop.session.selfId));
    const [idB, idC, idD] = [ids4[1], ids4[2], ids4[3]];
    const skipped = new Set();
    const skip = (hook) => {
      if (skipped.has(hook)) return;
      skipped.add(hook);
      console.log(`  SKIP: guard-ai #319 hook ${hook} missing`);
    };
    // ---- start: the Ledger mission, four pages ----
    await GH(([m, mp, mi]) => window.__coop.session.setSettings(m, mp, 'normal', mi), MISSION);
    for (const P of P4.slice(1)) await P.evaluate(() => window.__coop.session.setReady(true));
    await until(HA, () => window.__coop.session.allReady, null, 8000, 'AI6: everyone ready');
    await GH(() => window.__coop.session.startMatch());
    for (const P of P4) await until(P, (m) => window.__app.current?.opts?.mode === m && !!window.__app.current.net && !window.__app.current.isEnded, MISSION[0], LOAD_MS_4, 'AI6: the Ledger mission on every page');
    await until(HA, () => { const rs = [...window.__app.current.net.remotes.values()]; return rs.length === 3 && rs.every((r) => r.state); }, null, 30000, 'AI6: the three client states reach the host');
    await GH(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
    const idHost = await GH(() => window.__app.current.localRef?.id ?? 'local');
    const nPl = await GH(() => { const em = window.__app.current.enemyMgr; return typeof em.players === 'function' ? em.players().length : window.__app.current.teamRefsInto([]).length; });
    assert(nPl === 4, `AI6: four players are in the guards' list (${nPl})`);

    // ---- which #319 hooks this build has ----
    const hooks = await GH(() => {
      const em = window.__app.current.enemyMgr;
      return { coop4: typeof em.coop4 === 'function', find: typeof em.intruders?.find === 'function', ghostOf: typeof em.ghostOf === 'function', rays: typeof em.raysThisStep === 'number', idOf: typeof em.intruders?.idOf === 'function' };
    });
    if (!hooks.coop4) skip('em.coop4');
    if (!hooks.find) skip('em.intruders.find');
    if (hooks.coop4) assert(await GH(() => window.__app.current.enemyMgr.coop4() === true), 'AI6: em.coop4() is on with four players');
    if (!hooks.coop4 || !hooks.find) {
      console.log('  SKIP: guard-ai #319 AI6 blocks (1)-(3) not run without em.coop4 / em.intruders.find (they run on the train head)');
    } else {
      const jl = (v) => JSON.stringify(v);
      const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : String(v));
      /** Snap (x, z) to the nav (host). */
      const snap = (x, z) => GH(([x, z]) => { const nav = window.__app.current.enemyMgr.nav; const c = nav.nearestWalkable(x, z, 2, 0); return c >= 0 ? nav.center(c) : [x, z]; }, [x, z]);
      /** Page i to (x, z) facing yaw; returns when the host has it there, still. */
      const teleP = async (i, x, z, yaw, y = 0.1) => {
        const tp = ([x, y, z, w]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, y, z), w); g.player.cam.yaw = w; g.player.cam.pitch = 0; };
        if (i === 0) {
          await HA.evaluate(tp, [x, 0.05, z, yaw]);
          await until(HA, ([x, z]) => { const p = window.__app.current.player.controller.pos; return Math.hypot(p.x - x, p.z - z) < 0.5; }, [x, z], 15000, `AI6: the host at ${f2(x)}, ${f2(z)}`);
          return;
        }
        await GH(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
        await P4[i].evaluate(tp, [x, y, z, yaw]);
        await until(HA, ([id, x, z]) => { const r = window.__app.current.net.remotes.get(id); return !!r && Math.hypot(r.feet.x - x, r.feet.z - z) < 0.6 && r.ref.speed < 0.15; }, [ids4[i], x, z], 15000, `AI6: the host sees page ${i} at ${f2(x)}, ${f2(z)}`);
      };
      const lit = (map) => GH((m) => { window.__ai6Lit = m; }, map);

      // ---- the staging (the S24 pattern): mission guards statues, panels off, light pinned per player, room for 8 more guards ----
      await GH(() => {
        const g = window.__app.current;
        const em = g.enemyMgr;
        em.maxAlive = Math.max(em.maxAlive, em.alive + 8);
        for (const x of em.enemies) {
          x.update = () => {};
          x['ai6Statue'] = true;
          if (x.alive && !x.taken) x.aware.set('unaware');
          if (x.alive) x['hitboxes']?.setEnabled(false);
        }
        for (const d of em.drones) d.update = () => true;
        for (const p of em.alarms) p.disabled = true;
        // (ai6 triage 3) no radio alarm either (the S26 coop triage r2 staging, line ~1620): the panels are off, but a
        // contact call still owes the command call (`RADIO_ALARM`); its response team (3 guards, `RESPONSE.liveTeam`)
        // spawns alerted at the reinforce point furthest from the host, (18, -24.5) in the yard lane, sees every lane
        // hide (B's is 9.25 m west) and reports that player there (`takeSighting`), and it fills the block's 8-guard
        // headroom (6 in (1) + 2 of the team), so (3)'s grunt never spawned
        em.alarmRaised = true;
        window.__ai6Lit = {};
        g['updateLight'] = () => {
          const L = window.__ai6Lit;
          g.localRef.light = g.lightLevel = L[g.localRef.id] ? 1 : 0;
          for (const r of g.remotePlayers()) r.light = L[r.id] ? 1 : 0;
        };
      });
      /** Spawn calm grunts [x, z, yaw] on the host; returns their ids (null: one did not spawn). */
      const spawnGuards = (list) => GH((list) => {
        const g = window.__app.current;
        const em = g.enemyMgr;
        const V = g.player.position.constructor;
        const out = [];
        for (const [x, z, yaw] of list) {
          const e = em.spawn('grunt', new V(x, 0, z), false, yaw);
          if (!e) return null;
          e.meter = 0;
          out.push(e.id);
        }
        return out;
      }, list);
      const despawn = (ids) => GH((ids) => { const em = window.__app.current?.enemyMgr; if (!em) return; for (const id of ids) { const e = em.enemies.find((x) => x.id === id); if (e) em.despawn(e); } }, ids);
      /** Install a host step hook (`onHostStep`): `fn(g, arg, st)` runs every fixed step; `st` is `window.__ai6s`. */
      const hook = async (fn, arg) => {
        hookKey = await onHostStep(HA, fn, arg);
      };
      const unhook = async () => {
        if (hookKey) await offHostStep(HA, hookKey).catch(() => {});
        hookKey = 0;
      };
      const faceTo = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
      // the three rooms: the host's and B's are S24's (racking hall aisle, factory floor); C's the Warehouse corner with
      // the fewest lines to either (`hitDistance` between every body point of two rooms; a count of 0 is asserted).
      // (ai6-lkp triage) The workshop's hide is in the dark lane west of the x 14.5 fence (2.75, -24.75): a SightWorld
      // probe finds 0 of 4468 interior points with a line to it. The old east-lot spot (20, -24.75) is seen from 41 of
      // 330 workshop points (through the facade door x 17..18.1 and the open window x 11.5), so the pair saw C hide there.
      const R0 = { player: [-14.5, 5.2], guards: [[-15, -2.5], [-14, -2.5]] };
      const R1 = { player: [9, 3], guards: [[8, -6], [9.2, -6]] };
      const R2S = [
        { name: 'workshop', player: [21, -14.5], guards: [[14, -14.5], [14, -13.3]], lane: [2.75, -24.75] },
        { name: 'dock', player: [-21, -14], guards: [[-14, -14], [-14, -12.8]], lane: [-16, -24.75] },
        { name: 'mezzanine', player: [22, 15], guards: [[15, 15], [15, 16.2]], lane: [20, -24.75] },
      ];
      const LANE = { host: [-3.75, -24.75], b: [8.75, -24.75] };
      R0.player = await snap(R0.player[0], R0.player[1]);
      const pick = await GH(([R0, R1, C]) => {
        const g = window.__app.current;
        const V = g.player.position.constructor;
        const pts = (R) => [R.player, ...R.guards].map((p) => new V(p[0], 1.6, p[1]));
        const unblocked = (A, B) => { let n = 0; for (const a of A) for (const b of B) if (g.ballistics.hitDistance(a, b, 1) >= V.Distance(a, b) - 0.35) n++; return n; };
        const p0 = pts(R0);
        const p1 = pts(R1);
        return { base: unblocked(p0, p1), res: C.map((c) => { const pc = pts(c); return { name: c.name, open: unblocked(pc, p0) + unblocked(pc, p1) }; }) };
      }, [R0, R1, R2S]);
      const best = pick.res.reduce((a, b) => (b.open < a.open ? b : a));
      const R2 = R2S.find((c) => c.name === best.name);
      console.log(`    (AI6: rooms host / B: ${pick.base} unblocked body-point lines; room 3 = ${R2.name}, unblocked lines ${jl(pick.res)})`);
      assert(best.open === 0, `AI6 setup: three rooms with no line between any two (room 3 ${R2.name}; unblocked lines ${jl(pick.res)}; host / B ${pick.base})`);
      const laneD = R2.lane[0] > 0 ? [-16, -24.75] : [20, -24.75];
      const snapped = { hostHide: await snap(...LANE.host), bHide: await snap(...LANE.b), cHide: await snap(...R2.lane), dHide: await snap(...laneD) };

      // ============ (1) each guard pair hunts the player it saw ============
      console.log('  AI6 (1): three rooms, each pair hunts the player it saw (D unseen)');
      let sB = -1;
      let lkpB = null;
      try {
        // D far away in the dark, still; the three lit in their rooms
        await teleP(3, snapped.dHide[0], snapped.dHide[1], 0);
        await teleP(0, R0.player[0], R0.player[1], Math.PI);
        await teleP(1, R1.player[0], R1.player[1], Math.PI);
        await teleP(2, R2.player[0], R2.player[1], faceTo(R2.player, R2.guards[0]));
        await lit({ [idHost]: 1, [idB]: 1, [idC]: 1 });
        const gl = [...R0.guards.map((p) => [p[0], p[1], faceTo(p, R0.player)]), ...R1.guards.map((p) => [p[0], p[1], faceTo(p, R1.player)]), ...R2.guards.map((p) => [p[0], p[1], faceTo(p, R2.player)])];
        const gids = await spawnGuards(gl);
        assert(!!gids, 'AI6 (1): six calm grunts spawn, two per room');
        spawned.push(...gids);
        const room = [0, 0, 1, 1, 2, 2];
        const hasThink = await GH((ids) => window.__app.current.enemyMgr.enemies.filter((e) => ids.includes(e.id)).every((e) => 'raysThink' in e), gids);
        if (!hasThink) skip('Enemy.raysThink');
        if (!hooks.rays) skip('em.raysThisStep');
        await hook((g, a, st) => {
          window.__ai6s = st;
          try {
            const em = g.enemyMgr;
            const b = em.intruders;
            if (!st.init) {
              st.init = true;
              st.guards = em.enemies.filter((e) => a.gids.includes(e.id));
              Object.assign(st, { next: 0, n: 0, hide: false, badSlots: 0, badHunt: 0, lkpMax: 0, lkpWorst: null, minPos: 1e9, minKnown: 1e9, dSeen: 0, maxRays: 0, maxThink: 0, lv: [], hunts: [], slots: [], err: '', extraMax: 0, extra: null, per: null, firstOff: null, offReports: [] });
              // (ai6 triage 3) every board report that puts a player's slot more than 2 m off his room spot: when, where,
              // sight or a located noise, before or after the hide (removed after the block's reads: `delete b.report`)
              const orig = b.report;
              b.report = function (slot, x, y, z, seen) {
                try {
                  const i = a.ids.indexOf(b.idOf(slot));
                  if (i >= 0 && Math.hypot(x - a.stand[i][0], z - a.stand[i][1]) > 2 && st.offReports.length < 20) st.offReports.push({ t: +g.time.toFixed(2), p: ['host', 'B', 'C'][i], slot, at: [+x.toFixed(2), +z.toFixed(2)], seen, hide: st.hide });
                } catch {}
                return orig.call(this, slot, x, y, z, seen);
              };
            }
            const gs = st.guards;
            // (ai6 triage 3) any live guard that is neither a statue nor one of the six (a response team, a reinforcement):
            // it perceives and reports like the six but is in none of the per-guard reads below
            const live = () => em.enemies.filter((x) => x.alive && !x['ai6Statue']);
            const pIdx = () => { const ps = em.players(); return a.ids.map((id) => { const j = ps.findIndex((r) => r.id === id); return j < 0 ? -1 : (ps[j].slot ?? j); }); };
            const guardRow = (x, idx) => ({ id: x.id, six: gs.indexOf(x), kind: x.def?.kind, at: [+x.pos.x.toFixed(1), +x.pos.z.toFixed(1)], lv: x.level, hunt: x.hunt, sees: idx.map((j) => (j >= 0 && typeof x.seesIndex === 'function' ? +x.seesIndex(j) : -1)) });
            {
              const ex = live().filter((x) => !a.gids.includes(x.id));
              if (ex.length > st.extraMax) {
                st.extraMax = ex.length;
                const idx = pIdx();
                st.extra = { t: +g.time.toFixed(2), hide: st.hide, guards: ex.map((x) => guardRow(x, idx)) };
              }
            }
            st.lv = gs.map((e) => (e.alive ? e.level : 'down'));
            st.hunts = gs.map((e) => e.hunt);
            st.slots = a.ids.map((id) => b.find(id));
            if (b.find(a.idD) !== -1) st.dSeen++;
            if (typeof em.raysThisStep === 'number') st.maxRays = Math.max(st.maxRays, em.raysThisStep / gs.length);
            for (const e of gs) if (typeof e.raysThink === 'number') st.maxThink = Math.max(st.maxThink, e.raysThink);
            if (!st.hide || g.time < st.next) return;
            st.next = g.time + 0.25;
            st.n++;
            const s = st.slots;
            if (!(new Set(s).size === 3 && s.every((v) => v >= 0 && b.valid[v] === 1))) st.badSlots++;
            for (let i = 0; i < 3; i++) {
              if (s[i] < 0) continue;
              const dk = Math.hypot(b.x[s[i]] - a.stand[i][0], b.z[s[i]] - a.stand[i][1]);
              if (dk > st.lkpMax) {
                st.lkpMax = dk;
                st.lkpWorst = { player: i, at: [+b.x[s[i]].toFixed(2), +b.z[s[i]].toFixed(2)], seenT: +b.seenT[s[i]].toFixed(2), locT: +b.locT[s[i]].toFixed(2) };
              }
            }
            // (ai6 triage 3) per player: where he stood when seen (his room spot), where he hides, his slot's LKP and
            // clocks; the first sample with an LKP off its spot also keeps every live guard (who could have reported it)
            st.per = [0, 1, 2].map((i) => {
              const v = s[i];
              if (v < 0) return { p: ['host', 'B', 'C'][i], slot: v };
              const lx = b.x[v];
              const lz = b.z[v];
              return { p: ['host', 'B', 'C'][i], slot: v, valid: b.valid[v], stand: a.stand[i], hide: a.hide[i], lkp: [+lx.toFixed(2), +lz.toFixed(2)], dStand: +Math.hypot(lx - a.stand[i][0], lz - a.stand[i][1]).toFixed(2), dHide: +Math.hypot(lx - a.hide[i][0], lz - a.hide[i][1]).toFixed(2), seenT: +b.seenT[v].toFixed(2), locT: +b.locT[v].toFixed(2) };
            });
            if (!st.firstOff && st.per.some((r) => r.dStand > 2)) {
              const idx = pIdx();
              st.firstOff = { n: st.n, t: +g.time.toFixed(2), per: st.per, guards: live().map((x) => guardRow(x, idx)) };
            }
            for (let k = 0; k < gs.length; k++) {
              const e = gs[k];
              const r = a.room[k];
              if (e.hunt !== s[r]) st.badHunt++;
              for (let j = 0; j < 3; j++) {
                if (j === r || s[j] < 0) continue;
                st.minPos = Math.min(st.minPos, Math.hypot(e.pos.x - b.x[s[j]], e.pos.z - b.z[s[j]]));
                const kp = e.knownPt;
                if (kp) st.minKnown = Math.min(st.minKnown, Math.hypot(kp[0] - b.x[s[j]], kp[1] - b.z[s[j]]));
              }
            }
          } catch (e) {
            st.err = String(e?.stack ?? e);
          }
        }, { gids, room, ids: [idHost, idB, idC], idD, stand: [R0.player, R1.player, R2.player], hide: [snapped.hostHide, snapped.bHide, snapped.cHide] });
        // in combat on their own player (their own sight; by hand after 10 s of the host's sim)
        const ready = () => { const s = window.__ai6s; return s.lv.length === 6 && s.lv.every((l) => l === 'alert') && s.slots.every((v) => v >= 0) && s.hunts.every((h, k) => h === s.slots[[0, 0, 1, 1, 2, 2][k]]); };
        const self = await until(HA, ready, null, 10000, 'AI6 (1): all three pairs in combat on their own player').then(() => true, () => false);
        if (!self) {
          console.log(`    (AI6 (1): not all in combat by themselves: ${jl(await GH(() => ({ lv: window.__ai6s.lv, h: window.__ai6s.hunts, s: window.__ai6s.slots })))}; alerted by hand)`);
          await GH((ids) => { for (const e of window.__app.current.enemyMgr.enemies) if (ids.includes(e.id) && !e.alerted) e.alert(); }, gids);
          await until(HA, ready, null, 15000, 'AI6 (1): all three pairs in combat on their own player (by hand)').catch(() => {});
        }
        const c0 = await GH(() => { const s = window.__ai6s; return { lv: s.lv, hunts: s.hunts, slots: s.slots, err: s.err }; });
        assert(!c0.err, `AI6 (1): the sampling hook ran (${c0.err})`);
        assert(c0.lv.every((l) => l === 'alert'), `AI6 (1): all six guards in combat (${jl(c0)})`);
        assert(new Set(c0.slots).size === 3 && c0.slots.every((v) => v >= 0), `AI6 (1): three distinct slots, one per player (${jl(c0.slots)})`);
        assert(c0.hunts.every((h, k) => h === c0.slots[room[k]]), `AI6 (1): every guard hunts the slot of the player in his room (${jl(c0)})`);
        sB = c0.slots[1];
        // the three hide: each 6 m or more away behind a wall (the dark yard lane, S24's spots), unlit
        await lit({});
        await teleP(0, snapped.hostHide[0], snapped.hostHide[1], 0);
        await teleP(1, snapped.bHide[0], snapped.bHide[1], 0);
        await teleP(2, snapped.cHide[0], snapped.cHide[1], 0);
        lkpB = await GH((id) => { const b = window.__app.current.enemyMgr.intruders; const s = b.find(id); return s >= 0 ? [b.x[s], b.z[s]] : null; }, idB);
        await GH(() => { const s = window.__ai6s; s.hide = true; s.next = window.__app.current.time; });
        const hid = await waitHostSim(HA, 6000);
        const c1 = await GH(() => ({ ...window.__ai6s, guards: undefined }));
        await GH(() => { delete window.__app.current.enemyMgr.intruders.report; });
        const why = jl({ hid: Math.round(hid), n: c1.n, badSlots: c1.badSlots, badHunt: c1.badHunt, lkpMax: f2(c1.lkpMax), lkpWorst: c1.lkpWorst, minPos: f2(c1.minPos), minKnown: f2(c1.minKnown), dSeen: c1.dSeen, maxRays: f2(c1.maxRays), maxThink: c1.maxThink, lv: c1.lv, hunts: c1.hunts, slots: c1.slots, err: c1.err });
        assert(hid >= 6000, `AI6 (1): 6 s of the host's sim with all three hidden (${why})`);
        assert(!c1.err && c1.n >= 20, `AI6 (1): sampled every 0.25 s (${c1.n} samples) (${why})`);
        assert(c1.badSlots === 0, `AI6 (1): the three slots stay distinct and valid at every sample (${why})`);
        // (ai6 triage 3) the per-player table (stand / hide / LKP / clocks, last sample), the first sample off its spot with
        // every live guard then (`six` -1: not one of the six; `sees` per player host / B / C), and any extra guard
        const whyLkp = jl({ lkpMax: f2(c1.lkpMax), lkpWorst: c1.lkpWorst, per: c1.per, offReports: c1.offReports, firstOff: c1.firstOff, extra: c1.extra, hunts: c1.hunts, slots: c1.slots, lv: c1.lv });
        assert(c1.extraMax === 0, `AI6 (1): no live guard but the six and the statues (no response team, no reinforcement) (${c1.extraMax} more) (${whyLkp})`);
        assert(c1.lkpMax <= 2, `AI6 (1): each last known position within 2 m of where its player stood when last seen (worst ${f2(c1.lkpMax)} m) (${whyLkp})`);
        assert(c1.badHunt === 0, `AI6 (1): every guard hunts the player in his room at every sample (${why})`);
        assert(c1.minPos > 3 && c1.minKnown > 3, `AI6 (1): no guard's position or working point comes within 3 m of another room's last known position (A148) (${f2(c1.minPos)} / ${f2(c1.minKnown)} m)`);
        assert(c1.dSeen === 0, `AI6 (1): D (never seen or reported) has no slot throughout (${c1.dSeen} steps with one)`);
        if (hooks.rays && hasThink) {
          assert(c1.maxRays <= 9, `AI6 (1): em.raysThisStep per update per guard <= 9 (worst ${f2(c1.maxRays)})`);
          assert(c1.maxThink <= 9, `AI6 (1): rays per guard per think <= 9 (worst ${c1.maxThink})`);
        }
      } catch (e) {
        failed = true;
        console.error(`  AI6 (1) FAIL: ${String(e)}`);
      }

      // ============ (2) B leaves and rejoins: the same slot, the last known position kept ============
      console.log('  AI6 (2): a client closes his game and rejoins: same slot, last known position kept');
      try {
        if (sB < 0 || !lkpB) throw new Error('(1) left no slot for B; (2) not run');
        const code = await GH(() => window.__coop.session.code);
        const others0 = await GH(([ids]) => { const b = window.__app.current.enemyMgr.intruders; return ids.map((id) => b.find(id)); }, [[idHost, idC, idD]]);
        await P4[1].evaluate(() => window.__coop.leave());
        await until(HA, (id) => { const r = window.__app.current.net.remotes.get(id); return !r || r.held === true; }, idB, 30000, 'AI6 (2): the host holds (or removes) the dropped client');
        const d1 = await GH((id) => {
          const g = window.__app.current;
          const em = g.enemyMgr;
          const b = em.intruders;
          const r = g.net.remotes.get(id);
          const s = b.find(id);
          return { removed: !r, held: !!r?.held, s, gone: s >= 0 ? b.gone[s] : -1, valid: s >= 0 ? b.valid[s] : -1, lkp: s >= 0 ? [b.x[s], b.z[s]] : null, players: typeof em.players === 'function' ? em.players().length : -1, coop4: em.coop4(), hunting: em.enemies.some((e) => e.alive && e.hunt === s) };
        }, idB);
        const why = jl(d1);
        assert(d1.s === sB && d1.valid === 1, `AI6 (2): while he is away his slot is kept and still valid (slot ${d1.s} / ${sB}) (${why})`);
        assert(d1.lkp && Math.hypot(d1.lkp[0] - lkpB[0], d1.lkp[1] - lkpB[1]) < 0.01, `AI6 (2): his last known position is unchanged (${why})`);
        assert(d1.players === 3 && d1.coop4, `AI6 (2): three players in the guards' list, coop4 still on (${why})`);
        if (d1.removed) assert(d1.gone === 1, `AI6 (2): removeRemote marked the slot gone (${why})`);
        else console.log(`    (AI6 (2): the net layer HOLDS a dropped joiner (held, in remotes); removeRemote and intruderLeft run when the hold ends: gone[sB] ${d1.gone}; see (2c))`);
        // back in with the same id
        await until(P4[1], (c) => (document.querySelector('.main-menu [data-key="rejoin"]')?.textContent ?? '').includes(`Rejoin ${c}`), code, 60000, 'AI6 (2): the dropped page offers Rejoin <code>');
        await P4[1].evaluate(() => document.querySelector('.main-menu [data-key="rejoin"]').click());
        await until(P4[1], () => !!window.__app.current?.net && !!window.__app.current.puppet, null, LOAD_MS_4, 'AI6 (2): the dropped page is back in the match');
        assert((await P4[1].evaluate(() => window.__coop.session.selfId)) === idB, 'AI6 (2): the rejoin is the same player id');
        await until(HA, (id) => { const r = window.__app.current.net.remotes.get(id); return !!r && !r.held && !!r.state; }, idB, 60000, 'AI6 (2): the host has him back in play');
        await P4[1].evaluate(() => { window.__app.current.target.damageMul = 0; });
        await GH(() => { for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
        const d2 = await GH((id) => {
          const b = window.__app.current.enemyMgr.intruders;
          const s = b.find(id);
          return { s, gone: s >= 0 ? b.gone[s] : -1, lkp: s >= 0 ? [b.x[s], b.z[s]] : null };
        }, idB);
        assert(d2.s === sB && d2.gone === 0, `AI6 (2): rejoined into the same slot, no longer gone (${jl(d2)})`);
        assert(d2.lkp && Math.hypot(d2.lkp[0] - lkpB[0], d2.lkp[1] - lkpB[1]) < 0.01, `AI6 (2): before his first report the last known position is still the old one (${jl(d2)})`);
        // he reports once: one loud shot by his id (what coopHost's remoteNoise calls)
        const pos = await GH((id) => { const r = window.__app.current.net.remotes.get(id); return [r.feet.x, r.feet.y, r.feet.z]; }, idB);
        await GH(([id, p]) => { const g = window.__app.current; g.enemyMgr.noise(new g.player.position.constructor(p[0], p[1], p[2]), 60, id); }, [idB, pos]);
        await until(HA, ([id, p]) => { const b = window.__app.current.enemyMgr.intruders; const s = b.find(id); return s >= 0 && Math.hypot(b.x[s] - p[0], b.z[s] - p[2]) < 2.5; }, [idB, pos], 5000, 'AI6 (2): his shot locates his slot at his new position');
        const d3 = await GH(([id, others]) => {
          const g = window.__app.current;
          const em = g.enemyMgr;
          const b = em.intruders;
          const V = g.player.position.constructor;
          const s = b.find(id);
          const gh = typeof em.ghostOf === 'function' ? em.ghostOf(id, new V(0, 0, 0)) : null;
          return { s, gone: b.gone[s], ghost: gh, others: others.map((o) => b.find(o)) };
        }, [idB, [idHost, idC, idD]]);
        assert(d3.s === sB && d3.gone === 0, `AI6 (2): after his report the same slot, not gone (${jl(d3)})`);
        if (hooks.ghostOf) assert(d3.ghost >= 1, `AI6 (2): em.ghostOf(B) >= 1 on the host (${d3.ghost})`);
        else skip('em.ghostOf');
        assert(d3.others.every((v, i) => v === others0[i]), `AI6 (2): no other slot changed (${jl(d3.others)} vs ${jl(others0)})`);

        // (2c) a hold that runs out: removeRemote -> intruderLeft -> gone, the position kept
        const s0 = await GH((id) => { const b = window.__app.current.enemyMgr.intruders; const s = b.find(id); return { s, lkp: [b.x[s], b.z[s]], valid: b.valid[s] }; }, idB);
        await P4[1].evaluate(() => window.__coop.leave());
        await until(HA, (id) => window.__coop.session.players.get(id)?.away === true, idB, 30000, 'AI6 (2c): the host holds the dropped slot');
        await GH(() => window.__coop.session.expireAway(Date.now() + 3600e3));
        await until(HA, (id) => !window.__app.current.net.remotes.has(id), idB, 15000, 'AI6 (2c): the host removed him (removeRemote)');
        const d4 = await GH((id) => {
          const em = window.__app.current.enemyMgr;
          const b = em.intruders;
          const s = b.find(id);
          return { s, gone: s >= 0 ? b.gone[s] : -1, valid: s >= 0 ? b.valid[s] : -1, lkp: s >= 0 ? [b.x[s], b.z[s]] : null, players: typeof em.players === 'function' ? em.players().length : -1, coop4: em.coop4() };
        }, idB);
        assert(d4.s === s0.s && d4.gone === 1, `AI6 (2c): removeRemote marks his slot gone, same slot (${jl(d4)})`);
        assert(!(s0.valid === 1 && d4.valid === 1) || Math.hypot(d4.lkp[0] - s0.lkp[0], d4.lkp[1] - s0.lkp[1]) < 0.01, `AI6 (2c): his last known position is kept while valid (${jl([s0, d4])})`);
        assert(d4.players === 3 && d4.coop4, `AI6 (2c): three players left, coop4 still on (${jl(d4)})`);
      } catch (e) {
        failed = true;
        console.error(`  AI6 (2) FAIL: ${String(e)}`);
      }
      await unhook();
      await despawn(spawned);
      spawned = [];

      // ============ (3) a crouch-walk is silent, a run is heard and located by id ============
      console.log("  AI6 (3): C behind a calm guard: crouch-walk silent, run heard and located on C's slot, a noisy hold too");
      try {
        // (ai6 triage 3) "one calm grunt" (spec (3)): (1)'s six guards (searching B's and the host's rooms, the leg is in
        // B's) and any other live non-statue guard leave first, so nobody else hears or sees C and the live cap has room
        await despawn(spawned);
        spawned = [];
        await GH(() => { const em = window.__app.current.enemyMgr; for (const x of [...em.enemies]) if (x.alive && !x['ai6Statue']) em.despawn(x); });
        // (ai6 triage 5) the statues' section radio goes quiet for (3): fix4's grunt went unaware -> cooldown 4.5 s after his
        // spawn with meter 0 (no sight, no hearing), i.e. `AlertInput.cautious` (`alertState.ts:162`): a section alert
        // reached him. His key is a clean slate at spawn (`resetKey`, enemyManager.ts:1872-1873) and the radio queues only
        // guards alive when a call completes (radioNet.ts header), so a call completed after his spawn: the statues still
        // run the manager-level section checks (squad radio checks every 40 +- 8 s, `radioCheckNow`; talking pairs,
        // `pairStep` -> `pairMissing`, a partner that never walks to the meet), whose `missing` call makes every receiver
        // cautious 180 s (`radioDeliver` -> `alertHold`). Open calls and queued receivers dropped, no check, no pair.
        await GH(() => {
          const em = window.__app.current.enemyMgr;
          window.__ai6Quiet = { radioT: em['radioT'], pairs: em.pairs.splice(0) };
          em['radioT'] = 1e9;
          em.radioNet.clear();
        });
        // fresh slots: nothing known about anybody (the board's public fields)
        await GH(() => { const b = window.__app.current.enemyMgr.intruders; for (let s = 0; s < b.valid.length; s++) { b.forget(s); b.seenT[s] = 99; b.locT[s] = 99; } });
        await lit({});
        await teleP(0, snapped.hostHide[0], snapped.hostHide[1], 0);
        await teleP(3, snapped.dHide[0], snapped.dHide[1], 0);
        // the guard at the first spot facing the z -8.8 wall with a walkable leg 2.6 m behind him (in a jog's reach, past the close range)
        // (ai6 triage 4) The leg is built round the guard's SPAWNED feet (em.spawn snaps (gx, gz) to the nav cell centre, enemyManager.ts:1866-1868,
        // (gx + 0.25, gz - 0.15)), and the hearing check uses a jog's step reach, `noiseRadius(GEARS.stand[3] 3.0, false)`
        // = 1.2 + (3.0 - 1.4) * 1.6 = 3.76 m (`src/player/movement.ts:152`, `src/config/movement.ts` GEARS; C's full-stick
        // run is 4.0 m/s, 5.36 m). It was a fixed 3 m round (gx, gz): the leg ends sat 3.0 m off before the snap and 3.26 m
        // after, never inside a 3 m reach, so every spot failed the check with cell, leg and cap fine.
        const GS = [[9, -7.6], [14, -7.6], [4, -7.6], [-8, -7.6]];
        const JOG_REACH = 1.2 + (3.0 - 1.4) * 1.6;
        let legWhy = null;
        const leg = await GH(([GS, R]) => {
          const g = window.__app.current;
          const em = g.enemyMgr;
          const nav = em.nav;
          const V = g.player.position.constructor;
          const walk = (x, z) => { const c = nav.cellOf(x, z, 0); return c >= 0 && nav.isWalkable(c); };
          const legClear = (a, b) => { let ok = true; for (let k = 0; k <= 12 && ok; k++) ok = walk(a[0] + (b[0] - a[0]) * (k / 12), a[1] + (b[1] - a[1]) * (k / 12)); return ok; };
          // (ai6 triage 3) why each spot was skipped: the guard cell, the leg, the live cap, the hearing check
          const tried = [];
          for (const [gx, gz] of GS) {
            const row = { g: [gx, gz], cell: walk(gx, gz), leg: true, cap: [em.alive, em.maxAlive] };
            tried.push(row);
            row.leg = row.cell && legClear([gx - 1.5, gz + 2.6], [gx + 1.5, gz + 2.6]);
            if (!row.leg) continue;
            const e = em.spawn('grunt', new V(gx, 0, gz), false, Math.PI);
            if (!e) {
              row.spawn = 'null (live cap or no floor)';
              return { tried };
            }
            e.meter = 0;
            row.at = [+e.pos.x.toFixed(2), +e.pos.z.toFixed(2)];
            // the leg round where he really stands
            const mx = e.pos.x;
            const mz = e.pos.z + 2.6;
            const a = [mx - 1.5, mz];
            const b = [mx + 1.5, mz];
            if (!legClear(a, b)) { row.legAt = false; em.despawn(e); continue; }
            let heard = true;
            try {
              em['hearRoom'](em.enemies.length);
              const i = em.enemies.indexOf(e);
              // (ai6 triage 4) per leg point: distance, tier, effective reach (masking / wall), so a miss names its cause
              row.pts = [a, [mx, mz], b].map((p) => { const d = Math.hypot(e.pos.x - p[0], e.pos.z - p[1]); const t = em['tierOf'](e, i, new V(p[0], 0, p[1]), R, d, false); return { d: +d.toFixed(2), tier: t, r: +em['hearR'][i].toFixed(2) }; });
              heard = row.pts.every((p) => p.d > 1.9 && p.tier >= 1);
            } catch (x) {
              row.hearErr = String(x);
            }
            row.heard = heard;
            if (!heard) { em.despawn(e); continue; }
            return { id: e.id, g: [gx, gz], at: row.at, a, b, tried };
          }
          return { tried, reach: R };
        }, [GS, JOG_REACH]).then((r) => (r && r.id ? r : (legWhy = r, null)));
        assert(!!leg, `AI6 (3): a calm grunt facing the wall with a walkable leg behind him spawns (${jl(legWhy)})`);
        spawned.push(leg.id);
        // C's index in the guards' list (the bit `seesIndex` reads: the ref's slot when it has one)
        const idxC = await GH((id) => { const ps = window.__app.current.enemyMgr.players(); const i = ps.findIndex((r) => r.id === id); return i < 0 ? -1 : (ps[i].slot ?? i); }, idC);
        await hook((g, a, st) => {
          window.__ai6s = st;
          try {
            const em = g.enemyMgr;
            const b = em.intruders;
            const e = em.enemies.find((x) => x.id === a.gid);
            if (!st.init) { st.init = true; Object.assign(st, { phase: 'crouch', maxMeter: 0, nonCalm: 0, cautionSteps: 0, turnSteps: 0, cValid: 0, hostSlot: 0, tTurn: -1, turnBy: '', loc: null, sawC: false, err: '', runT0: -1, searchT0: -1, searchSteps: 0, minHeardAt: 99, cSpd: { crouch: 0, run: 0, search: 0 }, dMin: { crouch: 99, run: 99, search: 99 }, levels: [], lastLv: '' }); }
            if (!e) return;
            const s = b.find(a.idC);
            st.maxMeter = Math.max(st.maxMeter, e.meter);
            // (ai6 triage 4) per phase: C's sent speed as the host hears it (`clientStepNoise` reads it), his least distance
            // to the guard, and the guard's level changes (time, level, meter), so a miss in a never-run leg names its cause
            const rC = g.net?.remotes?.get(a.idC);
            if (rC?.state) {
              st.cSpd[st.phase] = Math.max(st.cSpd[st.phase] ?? 0, rC.state.speed ?? 0);
              st.dMin[st.phase] = Math.min(st.dMin[st.phase] ?? 99, Math.hypot(rC.feet.x - e.pos.x, rC.feet.z - e.pos.z));
            }
            // (ai6 triage 5) and what could have caused each change: his caution (0 / 1 timed / 2 held), his timed section
            // alert (kind 1 missing / 2 shots, s left), his board incident, the section's radio counters and open calls
            if (e.level !== st.lastLv && st.levels.length < 24) {
              st.lastLv = e.level;
              const aw = em.awareness;
              st.levels.push([st.phase, +g.time.toFixed(2), e.level, +e.meter.toFixed(2), { caution: e.caution, alert: e.key >= 0 ? aw.alertOf(e.key) : -1, alertLeft: e.key >= 0 ? +aw.alertLeft(e.key).toFixed(1) : -1, inc: e.incident, turnT: +(e.turnT ?? 0).toFixed(2), checks: em.radioChecks, misses: em.radioMisses, pairMisses: em.pairMisses, calls: em.radioNet.openCalls, bodiesFound: em.bodiesFound, cam: em.camReports }]);
            }
            // calm = the alert machine's own `calmNow` (unaware or cooldown, `alertState.ts:127`): a cautious guard is on
            // edge but calm by design (docs/systems/ai.md "Caution per guard"); counted apart so a stray caution shows
            const calm = e.level === 'unaware' || e.level === 'cooldown';
            if (e.level === 'cooldown') st.cautionSteps++;
            if ((e.turnT ?? 0) > 0) st.turnSteps++;
            if (a.idxC >= 0 && e.seesIndex(a.idxC)) st.sawC = true;
            const hs = b.find(a.idHost);
            if (hs >= 0 && b.valid[hs] === 1) st.hostSlot++;
            if (st.phase === 'crouch') {
              if (!calm) st.nonCalm++;
              if (s >= 0 && b.valid[s] === 1) st.cValid++;
            } else {
              // (ai6 triage 5) "turns / investigates": a heard step at tier 1 only turns him (`Enemy.hearTurn`: `turnT`
              // set, meter capped under `suspicious`, the level kept), tier 2 gets him sent (investigating); either counts
              if (st.phase === 'run' && st.tTurn < 0 && (!calm || (e.turnT ?? 0) > 0)) { st.tTurn = g.time - st.runT0; st.turnBy = !calm ? e.level : 'turn'; }
              // (ai6 triage 7) the search leg: his level and his re-aim clock (`heardAt`, 99 none) per step
              if (st.phase === 'search') {
                if (e.level === 'searching') st.searchSteps++;
                st.minHeardAt = Math.min(st.minHeardAt, e.heardAt ?? 99);
              }
              if (!st.loc && s >= 0 && b.valid[s] === 1 && b.locT[s] < 1) {
                const x0 = a.a[0], z0 = a.a[1], x1 = a.b[0], z1 = a.b[1];
                const t = Math.max(0, Math.min(1, ((b.x[s] - x0) * (x1 - x0) + (b.z[s] - z0) * (z1 - z0)) / ((x1 - x0) ** 2 + (z1 - z0) ** 2)));
                st.loc = { s, owner: b.idOf ? b.idOf(s) : null, locT: b.locT[s], seenT: b.seenT[s], dPath: Math.hypot(b.x[s] - (x0 + (x1 - x0) * t), b.z[s] - (z0 + (z1 - z0) * t)), phase: st.phase, t: g.time - (st.phase === 'search' ? st.searchT0 : st.runT0), level: e.level, sawC: st.sawC };
              }
            }
          } catch (e) {
            st.err = String(e?.stack ?? e);
          }
        }, { gid: leg.id, idC, idHost, idxC, a: leg.a, b: leg.b });
        // C at the leg's start, dark, then the pad: crouch, left stick forward along the leg, back and forth
        await teleP(2, leg.a[0], leg.a[1], faceTo(leg.a, leg.b));
        const padReady = (P) => P.evaluate(() => { window.__pad.connect(); for (let i = 0; i < 4; i++) window.__pad.axis(i, 0); for (let i = 0; i < 17; i++) window.__pad.set(i, 0); window.__app.current.player.controller.clearCrouchToggle(); });
        // (ai6 triage 6) `padReady` clears the crouch toggle, which by itself stands a crouched C up on his NEXT frame
        // (`crouchWanted` -> `applyCrouch`, playerController.ts:537-541 / :745-751). Read before that frame, `crouched` was
        // still true, so the press re-toggled him crouched (:525) and "C stands" waited 6 s on a crouch that held. Let a
        // few of C's frames run after the clear, then press only if still not there; up to 3 tries (each press flips)
        const crouchSt = (P) => P.evaluate(() => { const c = window.__app.current.player.controller; let head = null; try { head = c['hasHeadroom'](); } catch { /* private */ } return { crouched: c.crouched, toggled: c['crouchToggled'], intent: c.crouchIntent, pend: c.crouchPend, auto: c.autoCrouch, frozen: c.frozen, grounded: c.grounded, head, pos: [+c.pos.x.toFixed(2), +c.pos.y.toFixed(2), +c.pos.z.toFixed(2)] }; });
        const setCrouch = async (want) => {
          await padReady(P4[2]);
          const tries = [];
          for (let k = 0; k < 3; k++) {
            await waitSim(150);
            if ((await P4[2].evaluate(() => window.__app.current.player.controller.crouched)) === want) break;
            await P4[2].evaluate(() => window.__pad.set(1, 1));
            try {
              await until(P4[2], (w) => window.__app.current.player.controller.crouched === w, want, 3000, `AI6 (3): C ${want ? 'crouches' : 'stands'}`);
            } catch (x) {
              tries.push({ k, ...(await crouchSt(P4[2])), err: String(x).slice(0, 400) });
            } finally {
              await P4[2].evaluate(() => window.__pad.set(1, 0));
            }
          }
          const st = await crouchSt(P4[2]);
          if (st.crouched !== want) throw new Error(`AI6 (3): C ${want ? 'crouches' : 'stands'}: still ${st.crouched ? 'crouched' : 'standing'} after 3 presses (${jl({ st, tries })})`);
          await waitSim(200);
        };
        const stop = () => P4[2].evaluate(() => { for (let i = 0; i < 4; i++) window.__pad.axis(i, 0); });
        let tgt = leg.b;
        /** One steering poll: face the target end of the leg and hold the stick forward; the other end once there. */
        const steer = async (mag = 1) => {
          const r = await P4[2].evaluate(([t, mag]) => {
            const g = window.__app.current;
            const p = g.player.controller.pos;
            const dx = t[0] - p.x;
            const dz = t[1] - p.z;
            g.player.cam.yaw = Math.atan2(dx, dz);
            g.player.cam.pitch = 0;
            window.__pad.axis(1, -mag);
            return { d: Math.hypot(dx, dz), crouched: g.player.controller.crouched, speed: g.player.controller.speed };
          }, [tgt, mag]);
          if (r.d < 0.5) tgt = tgt === leg.b ? leg.a : leg.b;
          return r;
        };
        // crouch-walk 4 s
        // (ai6 triage 4) at a crouch WALK: a full stick crouched is the crouch run, 2.6 m/s (`GEARS.crouch[4]`), whose steps
        // carry 1 + (2.6 - 1.8) * 1.5 = 2.2 m (`noiseRadius`, NOISE_QUIET.crouch 1.9), 0.5 m short of the leg's nearest point.
        // Raw axis 0.78 -> radial dead zone 0.15 / 0.98 -> 0.76 -> past the 0.05 dead zone u 0.75 -> ~1.64 m/s crouched
        // (`stickSpeed`, between the sneak 1.3 at 0.45 and the walk 1.7 at 0.8): silent (<= 1.9) with any dead zone 0..0.15.
        const CROUCH_MAG = 0.78;
        await setCrouch(true);
        let cMoved = 0;
        let cCrouch = 0;
        let cN = 0;
        const hc = await waitHostSim(HA, 4000, async () => { const r = await steer(CROUCH_MAG); cN++; if (r.crouched) cCrouch++; cMoved = Math.max(cMoved, r.speed); });
        await stop();
        const c2 = await GH(() => ({ ...window.__ai6s }));
        const why = jl({ hc: Math.round(hc), cN, cCrouch, cMoved: f2(cMoved), idxC, ...c2 });
        assert(hc >= 4000 && cCrouch >= cN * 0.8 && cMoved > 0.3, `AI6 (3): C crouch-walked 4 s of the host's sim (${why})`);
        assert(!c2.err && c2.maxMeter < 0.3, `AI6 (3): the guard's meter stays under 0.3 over the crouch-walk (${f2(c2.maxMeter)}) (${why})`);
        assert(c2.nonCalm === 0, `AI6 (3): the guard stays calm over the crouch-walk (${c2.nonCalm} steps not calm) (${why})`);
        assert(c2.cValid === 0, `AI6 (3): C has no valid slot after the crouch-walk (${c2.cValid} steps) (${why})`);
        // the standing run, the same path
        await setCrouch(false);
        await GH(() => { const s = window.__ai6s; s.phase = 'run'; s.runT0 = window.__app.current.time; });
        const hr = await waitHostSim(HA, 10000, async () => { await steer(); });
        await stop();
        const c3 = await GH(() => ({ ...window.__ai6s }));
        const loc = c3.loc;
        const why3 = jl({ hr: Math.round(hr), tTurn: f2(c3.tTurn), turnBy: c3.turnBy, turnSteps: c3.turnSteps, cautionSteps: c3.cautionSteps, loc, sawC: c3.sawC, hostValidSteps: c3.hostSlot, err: c3.err, cSpd: c3.cSpd, dMin: c3.dMin, levels: c3.levels, at: leg.at });
        assert(c3.tTurn >= 0 && c3.tTurn <= 2.5, `AI6 (3): within 2 s the guard turns / investigates (not calm after ${f2(c3.tTurn)} s of the run) (${why3})`);
        // (ai6 triage 7) "once in a search or fight a heard step locates C" (AI6-E2E-SPEC (3)): a calm guard never locates
        // by ear. `EnemyManager.hear` sends only an alerted or searching guard to `hearFight` -> `reportHeard`
        // (enemyManager.ts:2724-2727, :2777); a calm one turns (tier 1) or goes to the board (tier 2, investigating, still
        // no locate) (:2728-2743). The run above gave tier 1 only: C peaked at 3.07 m/s (the 3 m leg turns him round
        // before full speed), a 1.2 + (3.07 - 1.4) * 1.6 = 3.87 m reach (`noiseRadius`, movement.ts:152), and tier 2 is
        // inside half of it (`investigateDb` 6, hearing.ts:26), 1.94 m; he came no closer than 2.33 m. So the locate gets its
        // own leg, as the spec stages it: the guard searches round his own feet (`Enemy.searchAt`, the plain search a
        // body or a cut light starts; `searching` at his next step, alertState.ts:155) and C runs the same leg. In a
        // search any body noise from tier 1 locates its maker (`combatHearAct`, hearing.ts:122-127), and C's run steps
        // already reached tier 1 here (he turned).
        await GH(([gid, idc]) => {
          const em = window.__app.current.enemyMgr;
          const b = em.intruders;
          const s = b.find(idc);
          if (s >= 0) { b.forget(s); b.seenT[s] = 99; b.locT[s] = 99; }
          const e = em.enemies.find((x) => x.id === gid);
          if (e) e.searchAt(e.pos.x, e.pos.z);
        }, [leg.id, idC]);
        await until(HA, (gid) => window.__app.current.enemyMgr.enemies.find((x) => x.id === gid)?.level === 'searching', leg.id, 5000, 'AI6 (3): the guard searches (searchAt)');
        await GH(() => { const s = window.__ai6s; s.phase = 'search'; s.searchT0 = window.__app.current.time; s.loc = null; });
        const hsr = await waitHostSim(HA, 8000, async () => { await steer(); });
        await stop();
        const c4 = await GH(() => ({ ...window.__ai6s }));
        const loc4 = c4.loc;
        const why4 = jl({ hs: Math.round(hsr), loc: loc4, sawC: c4.sawC, searchSteps: c4.searchSteps, minHeardAt: f2(c4.minHeardAt), hostValidSteps: c4.hostSlot, err: c4.err, cSpd: c4.cSpd, dMin: c4.dMin, levels: c4.levels, stealth: await GH(() => window.__app.current.enemyMgr.stealth), at: leg.at });
        assert(!!loc4 && loc4.locT < 1, `AI6 (3): searching, a heard step locates C's slot (locT < 1) (${why4})`);
        if (loc4) {
          assert(loc4.dPath <= 2.5, `AI6 (3): the located position is within 2.5 m of C's run path (${f2(loc4.dPath)} m) (${why4})`);
          if (hooks.idOf) assert(loc4.owner === idC, `AI6 (3): the located slot is C's (owner ${loc4.owner}) (${why4})`);
          else skip('IntruderBoard.idOf');
          if (!loc4.sawC) assert(loc4.seenT === 99, `AI6 (3): located, not seen: seenT of C's slot is 99 (${loc4.seenT}) (${why4})`);
          else console.log('    (AI6 (3): the guard saw C, seenT not asserted)');
        }
        assert(c4.hostSlot === 0, `AI6 (3): the host never has a valid slot (${c4.hostSlot} steps) (${why4})`);
        // a noisy hold: the pulse coopHost's onHoldPulse makes (`em.hear(item, r, 'noise', null, id)`), in a fight
        // (ai6 triage 5) the holder stands at his item: C (wherever the run left him, 0-3 m along the leg) goes to the leg's
        // end and the item is there (walkable, checked). The guard in a fight needs no light, so if he sees C the sighting
        // puts C's slot at C's feet: before, up to 4.5 m from an item 1.6 m past the leg's end, failing `dItem < 2.5`
        // whether or not the hold was heard. The teleport also outlasts the 1.5 s re-aim gap (`COMBAT_HEAR.gap`).
        const item = [leg.b[0], leg.b[1]];
        await teleP(2, item[0], item[1], faceTo(leg.a, leg.b));
        await GH((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); if (e && !e.alerted) e.alert(); }, leg.id);
        await GH((id) => { const b0 = window.__app.current.enemyMgr.intruders; const s = b0.find(id); if (s >= 0) { b0.forget(s); b0.seenT[s] = 99; b0.locT[s] = 99; } }, idC);
        await GH(([id, it]) => { const g = window.__app.current; g.enemyMgr.hear(new g.player.position.constructor(it[0], 0.1, it[1]), 8, 'noise', null, id); }, [idC, item]);
        await waitHostSim(HA, 600);
        const d5 = await GH(([idc, idh, it, gid]) => {
          const b = window.__app.current.enemyMgr.intruders;
          const s = b.find(idc);
          const hs = b.find(idh);
          const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === gid);
          return { s, valid: s >= 0 ? b.valid[s] : -1, locT: s >= 0 ? b.locT[s] : 99, seenT: s >= 0 ? b.seenT[s] : 99, dItem: s >= 0 ? Math.hypot(b.x[s] - it[0], b.z[s] - it[1]) : 99, hostValid: hs >= 0 ? b.valid[hs] : 0, level: e?.level, sees: e?.seesTarget, heardAt: e?.heardAt };
        }, [idC, idHost, item, leg.id]);
        assert(d5.s >= 0 && d5.valid === 1 && d5.dItem < 2.5 && d5.hostValid === 0, `AI6 (3): in a fight a noisy hold by C is located on C's slot at the item, never the host's (${jl(d5)})`);
      } catch (e) {
        failed = true;
        console.error(`  AI6 (3) FAIL: ${String(e)}`);
      }
      await unhook();
      await despawn(spawned);
      spawned = [];
      await GH(() => { const em = window.__app.current?.enemyMgr; const q = window.__ai6Quiet; if (!em || !q) return; em['radioT'] = q.radioT; em.pairs.push(...q.pairs); window.__ai6Quiet = null; }).catch(() => {});
    }
  } catch (e) {
    failed = true;
    console.error(String(e));
  } finally {
    stopPump();
    errs.push(...aerrs.flat());
    await ab?.close().catch(() => {});
  }
}

console.log('offline state');
{
  const { browser: br, ctx: c2, page, errors } = await launch({ url, params: '' });
  try {
    // (operators 11e, A104) an offline player has the service worker from an earlier online visit: the co-op screen is a
    // lazy chunk only the worker can serve offline. Wait for it to control the page (the old player body's build used
    // to delay the menu past the worker's claim; Wren loads async and the menu is up ~200 ms before it).
    // (load-latent) waited for, not polled 10 s and passed on: under load the worker claimed the page later and the
    // offline click then had no co-op chunk; 120 s, a timeout throws; polled every 100 ms, not on rAF,
    // which stops on a hidden page
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 120000, polling: 100 });
    await c2.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.click('.main-menu .btn:has-text("Co-op")');
    await page.waitForSelector('.coop-offline', { timeout: 30000 });
    assert(true, 'co-op shows an offline state');
    await press(page, BTN.B).catch(() => {});
    await c2.setOffline(false);
    await page.click('.btn:has-text("Retry")');
    await page.waitForSelector('.btn:has-text("Host a room")', { timeout: 30000 });
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
