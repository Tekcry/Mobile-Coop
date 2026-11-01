// (clean-up G1) e2e-coop part `chamber` (run-e2e: `e2e-coop:chamber`; PART_SCRIPT, its own script): two players share the Test
// Chamber (map `chamber`) from the co-op lobby, two pages over `?net=local`.
// Lobby: the host's Mode row offers Test Chamber after Campaign; picking it sets the room to the `test` mode (G2a; it was Free
// Roam) on `chamber`, the Map row reads Test Chamber and is locked, the partner's lobby shows the same. Start: both pages load the
// `chamber` map in `test` mode with a net session (the host runs `TestMode`: nav, enemy manager, `g.mode.id === 'test'`; the
// client has the mirrored items and no mode), the host stands on the map's first spawn and the client on the second
// (2 m apart), the single-player chamber stage (`__chamberStage`) is off on both, each sees the other. The animation tuner
// opens there (it opens in the Test Chamber only) for the local player with its co-op time lock, and the partner stays in
// sync while it is open.
// (clean-up G2c, decision N17) The room has three passive practice guards (grunts; two side by side with their backs to the spawns, one
// facing them): the host runs them, the client mirrors them, none notices a player, a guard taken down comes back at his spot 10 s later once
// nobody stands within 2.5 m of it.
import { assert } from './e2e-lib.mjs';
import { until, hostAndJoin, waitHostSim, LOAD_MS } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;

/** The lobby options row `label`'s value text (a choice's or a locked row's), null when there is no such row. */
const rowText = (P, label) => P.evaluate((label) => {
  const r = [...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === label);
  return r ? (r.querySelector('.choice-val') ?? r.querySelector('.locked-val'))?.textContent ?? '' : null;
}, label);
const rowLocked = (P, label) => P.evaluate((label) => !!([...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === label)?.classList.contains('row-locked')), label);

console.log('host opens a room, client joins');
// (G2c, N17) the room starts with its three passive practice guards (the tests' pages carry practice=0; this one asks for them)
const { browser, A, B, pages, errors } = await hostAndJoin(url, 2, { params: 'net=local&practice=1' });
try {
  // ---- the lobby ----
  assert((await rowText(A, 'Mode')) === 'Campaign', `the host's room opens on the Campaign (${await rowText(A, 'Mode')})`);
  await A.evaluate(() => {
    const r = [...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === 'Mode');
    r.querySelectorAll('.choice-arrow')[1].click();
  });
  await until(A, () => window.__coop.session.map === 'chamber' && window.__coop.session.mode === 'test', null, 8000, 'the host picks the Test Chamber');
  assert((await rowText(A, 'Mode')) === 'Test Chamber', `the host's Mode row reads Test Chamber (${await rowText(A, 'Mode')})`);
  assert((await rowText(A, 'Map')) === 'Test Chamber' && (await rowLocked(A, 'Map')), 'the host\'s Map row reads Test Chamber, locked');
  await until(B, () => window.__coop.session.map === 'chamber' && window.__coop.session.mode === 'test', null, 8000, 'the partner hears the pick');
  await until(B, () => [...document.querySelectorAll('.lobby-opts .row')].some((x) => x.querySelector('.row-label')?.textContent === 'Mode' && x.querySelector('.locked-val')?.textContent === 'Test Chamber'), null, 8000, 'the partner\'s Mode row');
  assert((await rowText(B, 'Map')) === 'Test Chamber', `the partner's Map row reads Test Chamber (${await rowText(B, 'Map')})`);
  // the choice goes back and forth: Campaign again, then the chamber (the map list never swallows the dev map)
  await A.evaluate(() => {
    const r = [...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === 'Mode');
    r.querySelectorAll('.choice-arrow')[0].click();
  });
  await until(A, () => window.__coop.session.mode === 'course' && window.__coop.session.map !== 'chamber', null, 8000, 'the host goes back to the Campaign');
  await A.evaluate(() => {
    const r = [...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === 'Mode');
    r.querySelectorAll('.choice-arrow')[1].click();
  });
  await until(A, () => window.__coop.session.map === 'chamber' && window.__coop.session.mode === 'test', null, 8000, 'the host picks the Test Chamber again');

  // ---- the match ----
  await B.evaluate(() => window.__coop.session.setReady(true));
  await until(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready');
  await A.evaluate(() => window.__coop.session.startMatch());
  for (const P of pages) await until(P, () => window.__app.current?.opts?.map?.id === 'chamber' && window.__app.current.opts.mode === 'test' && !!window.__app.current.net && !window.__app.current.isEnded, null, LOAD_MS, 'the Test Chamber match on both pages');
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state), null, 15000, 'the partner\'s state reaches the host');
  const host = await A.evaluate(() => { const g = window.__app.current; return { mode: g.mode?.id ?? null, nav: !!g.nav, em: !!g.enemyMgr, ammo: g.weapons.infiniteAmmo, cap: g.net.reviveClock.cap }; });
  assert(host.mode === 'test' && host.nav && host.em && host.ammo, `the host runs the test mode (${JSON.stringify(host)})`);
  assert(host.cap >= 99, `the revives never run out in the test mode (cap ${host.cap})`);
  const client = await B.evaluate(() => { const g = window.__app.current; return { mode: g.mode?.id ?? null, ammo: g.weapons.infiniteAmmo, ints: !!g.net.ints }; });
  assert(client.mode === null && client.ammo && client.ints, `the client has no mode of its own, infinite ammo and the host's mirrored items (${JSON.stringify(client)})`);
  const spot = (P) => P.evaluate(() => { const c = window.__app.current.player.controller.pos; return { x: c.x, z: c.z }; });
  const seen = (P, who) => P.evaluate((who) => {
    const n = window.__app.current.net;
    const r = who === 'client' ? n.remotes.values().next().value?.avatar : n.avatars.values().next().value;
    const p = r?.rig.root.position;
    return p ? { x: p.x, z: p.z } : null;
  }, who);
  const a = await spot(A);
  const b = await spot(B);
  console.log(`  host at (${a.x.toFixed(2)}, ${a.z.toFixed(2)}), client at (${b.x.toFixed(2)}, ${b.z.toFixed(2)})`);
  assert(Math.hypot(a.x - 14, a.z - 14) < 0.6, `the host spawns at the first spot (${a.x.toFixed(2)}, ${a.z.toFixed(2)})`);
  assert(Math.hypot(b.x - 16, b.z - 14) < 0.6, `the client spawns at the second spot, 2 m beside (${b.x.toFixed(2)}, ${b.z.toFixed(2)})`);
  const stage = await Promise.all(pages.map((P) => P.evaluate(() => ({ stage: !!window.__chamberStage, open: window.__app.debug.animTune.isOpen, can: window.__app.debug.animTune.canOpen }))));
  assert(stage.every((s) => !s.stage), `no chamber stage on either page (${JSON.stringify(stage)})`);
  assert(stage.every((s) => s.can && !s.open), `the tuner may open in the room and starts shut (${JSON.stringify(stage)})`);
  // (G2a) the figures are placed on the first frames after the load: read again until they stand beside the partner (a read
  // the instant the match loaded saw the rig at its origin once)
  const settle = async (P, who, to) => {
    let s = await seen(P, who);
    for (let i = 0; i < 40 && !(s && Math.hypot(s.x - to.x, s.z - to.z) < 0.8); i++) {
      await P.waitForTimeout(250);
      s = await seen(P, who);
    }
    return s;
  };
  const hSeen = await settle(A, 'client', b);
  const cSeen = await settle(B, 'host', a);
  assert(hSeen && Math.hypot(hSeen.x - b.x, hSeen.z - b.z) < 0.8, `the host sees the client beside it (${JSON.stringify(hSeen)})`);
  assert(cSeen && Math.hypot(cSeen.x - a.x, cSeen.z - a.z) < 0.8, `the client sees the host beside it (${JSON.stringify(cSeen)})`);

  // ---- the practice guards (G2c, N17): three passive grunts on their spots, mirrored on the client, taken down, back after 10 s ----
  const SPOTS = [[12.75, 16.75], [15.25, 16.75], [19.75, 16.25]];
  const HIT = { amount: 9999, part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', impulse: 1 };
  const hostGuards = () => A.evaluate(() => window.__app.current.enemyMgr.enemies.filter((e) => e.alive).map((e) => ({ id: e.id, kind: e.def.kind, passive: e.passive, x: +e.pos.x.toFixed(2), z: +e.pos.z.toFixed(2) })));
  const at = (g, s) => Math.hypot(g.x - s[0], g.z - s[1]) < 0.6;
  const g0 = await hostGuards();
  assert(g0.length === 3 && g0.every((g) => g.kind === 'grunt' && g.passive), `the host has three passive practice grunts (${JSON.stringify(g0)})`);
  assert(SPOTS.every((s) => g0.some((g) => at(g, s))), `they stand on the three spots outside the open middle (${g0.map((g) => `${g.x},${g.z}`).join(' ')})`);
  await until(B, (n) => [...window.__app.current.net.puppets.values()].filter((p) => p.alive).length === n, 3, 10000, 'the client mirrors the three guards');
  // none notices a player: the host walks up behind the first pair and stays; nothing leaves "unaware" in 4 s
  await A.evaluate(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(14, 0, 15.2), 0); });
  await waitHostSim(A, 4000);
  const calm = await A.evaluate(() => window.__app.current.enemyMgr.enemies.every((e) => e.level === 'unaware' && !e.alerted));
  assert(calm, 'a player right behind them: the practice guards stay unaware (passive: they see and hear nothing)');
  // one taken down comes back at his spot ~10 s later (nobody within 2.5 m of it: the host is 1.6 m from the pair's mid-point, 3 m from each spot)
  const killOn = (i) => A.evaluate(([i, HIT]) => {
    const g = window.__app.current;
    const e = g.enemyMgr.enemies.filter((q) => q.alive).sort((a, b) => a.pos.x - b.pos.x)[i];
    e.applyDamage({ ...HIT, point: e.pos.clone(), dir: e.pos.clone().normalize(), sourcePos: g.player.position.clone() });
    return e.id;
  }, [i, HIT]);
  await A.evaluate(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(14, 0, 14), 0); });
  const killed = await killOn(0);
  assert((await hostGuards()).length === 2, 'a practice guard taken down: two are left');
  await waitHostSim(A, 9000);
  assert((await hostGuards()).length === 2, 'still down after 9 s');
  await until(A, () => window.__app.current.enemyMgr.enemies.filter((e) => e.alive).length === 3, null, 6000, 'the guard comes back');
  const g1 = await hostGuards();
  assert(g1.length === 3 && g1.every((g) => g.passive) && SPOTS.every((s) => g1.some((g) => at(g, s))) && !g1.some((g) => g.id === killed), `back on his spot, a fresh passive guard (${JSON.stringify(g1)})`);
  await until(B, (n) => [...window.__app.current.net.puppets.values()].filter((p) => p.alive).length === n, 3, 10000, 'the client mirrors the three guards again');
  // while a player stands on the spot he stays away; once the player steps off he is back
  await A.evaluate(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(15.25, 0, 16.75), 0); });
  await killOn(1);
  await waitHostSim(A, 12000);
  assert((await hostGuards()).length === 2, 'nobody leaves the spot: after 12 s he is still not back');
  await A.evaluate(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(14, 0, 14), 0); });
  await until(A, () => window.__app.current.enemyMgr.enemies.filter((e) => e.alive).length === 3, null, 6000, 'the guard comes back once the spot is clear');
  assert(true, 'a player off the spot: he is back at once');
  // ---- the tuner in the room: local, with the co-op time lock; the partner stays in sync ----
  await A.evaluate(() => window.__app.debug.animTune.show());
  const t = await A.evaluate(() => ({ open: window.__app.debug.animTune.isOpen, shown: !document.querySelector('.anim-tune').hidden, coop: window.__app.debug.animTune.coop(), chamber: !!document.querySelector('.chamber-play') && !document.querySelector('.chamber-play').closest('[hidden]') }));
  assert(t.open && t.shown && t.coop, `the tuner opens for the host in the room, co-op locked (${JSON.stringify(t)})`);
  assert(!t.chamber, 'the loop player is not in the panel in a room');
  // the client walks forward; the host's copy of it follows
  const x0 = b.x;
  await B.evaluate(() => window.__app.input.setMode?.('keyboard'));
  await B.keyboard.down('KeyD');
  await until(A, (x0) => { const r = window.__app.current.net.remotes.values().next().value; return !!r && Math.abs(r.feet.x - x0) > 0.5; }, x0, 8000, 'the host sees the client walk with the tuner open');
  await B.keyboard.up('KeyD');
  await A.evaluate(() => window.__app.debug.animTune.hide());
  const bad = errors.flat().filter((e) => !/WebGL|GPU stall|swiftshader|favicon|GL Driver/i.test(e));
  assert(bad.length === 0, `no console errors (${bad.slice(0, 2).join(' | ')})`);
} catch (e) {
  failed = true;
  console.error(String(e?.stack ?? e));
} finally {
  await browser.close();
}
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-coop-chamber OK');
