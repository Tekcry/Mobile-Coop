// (clean-up G1) e2e-coop part `chamber` (run-e2e: `e2e-coop:chamber`; PART_SCRIPT, its own script): two players share the Test
// Chamber (map `studio`, Free Roam) from the co-op lobby, two pages over `?net=local`.
// Lobby: the host's Mode row offers Test Chamber after Campaign; picking it sets the room to Free Roam on `studio` (no new
// wire value), the Map row reads Test Chamber and is locked, the partner's lobby shows the same. Start: both pages load the
// `studio` map in `sandbox` mode with a net session, the host stands on the map's first spawn and the client on the second
// (2 m apart), the single-player studio stage (`__studioStage`) is off on both, each sees the other. The animation tuner
// opens there (it opens in the Test Chamber only) for the local player with its co-op time lock, and the partner stays in
// sync while it is open.
import { assert } from './e2e-lib.mjs';
import { until, hostAndJoin, LOAD_MS } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;

/** The lobby options row `label`'s value text (a choice's or a locked row's), null when there is no such row. */
const rowText = (P, label) => P.evaluate((label) => {
  const r = [...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === label);
  return r ? (r.querySelector('.choice-val') ?? r.querySelector('.locked-val'))?.textContent ?? '' : null;
}, label);
const rowLocked = (P, label) => P.evaluate((label) => !!([...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === label)?.classList.contains('row-locked')), label);

console.log('host opens a room, client joins');
const { browser, A, B, pages, errors } = await hostAndJoin(url, 2);
try {
  // ---- the lobby ----
  assert((await rowText(A, 'Mode')) === 'Campaign', `the host's room opens on the Campaign (${await rowText(A, 'Mode')})`);
  await A.evaluate(() => {
    const r = [...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === 'Mode');
    r.querySelectorAll('.choice-arrow')[1].click();
  });
  await until(A, () => window.__coop.session.map === 'studio' && window.__coop.session.mode === 'sandbox', null, 8000, 'the host picks the Test Chamber');
  assert((await rowText(A, 'Mode')) === 'Test Chamber', `the host's Mode row reads Test Chamber (${await rowText(A, 'Mode')})`);
  assert((await rowText(A, 'Map')) === 'Test Chamber' && (await rowLocked(A, 'Map')), 'the host\'s Map row reads Test Chamber, locked');
  await until(B, () => window.__coop.session.map === 'studio' && window.__coop.session.mode === 'sandbox', null, 8000, 'the partner hears the pick');
  await until(B, () => [...document.querySelectorAll('.lobby-opts .row')].some((x) => x.querySelector('.row-label')?.textContent === 'Mode' && x.querySelector('.locked-val')?.textContent === 'Test Chamber'), null, 8000, 'the partner\'s Mode row');
  assert((await rowText(B, 'Map')) === 'Test Chamber', `the partner's Map row reads Test Chamber (${await rowText(B, 'Map')})`);
  // the choice goes back and forth: Campaign again, then the chamber (the map list never swallows the dev map)
  await A.evaluate(() => {
    const r = [...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === 'Mode');
    r.querySelectorAll('.choice-arrow')[0].click();
  });
  await until(A, () => window.__coop.session.mode === 'course' && window.__coop.session.map !== 'studio', null, 8000, 'the host goes back to the Campaign');
  await A.evaluate(() => {
    const r = [...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === 'Mode');
    r.querySelectorAll('.choice-arrow')[1].click();
  });
  await until(A, () => window.__coop.session.map === 'studio' && window.__coop.session.mode === 'sandbox', null, 8000, 'the host picks the Test Chamber again');

  // ---- the match ----
  await B.evaluate(() => window.__coop.session.setReady(true));
  await until(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready');
  await A.evaluate(() => window.__coop.session.startMatch());
  for (const P of pages) await until(P, () => window.__app.current?.opts?.map?.id === 'studio' && window.__app.current.opts.mode === 'sandbox' && !!window.__app.current.net && !window.__app.current.isEnded, null, LOAD_MS, 'the Test Chamber match on both pages');
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state), null, 15000, 'the partner\'s state reaches the host');
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
  const stage = await Promise.all(pages.map((P) => P.evaluate(() => ({ stage: !!window.__studioStage, open: window.__app.debug.animTune.isOpen, can: window.__app.debug.animTune.canOpen }))));
  assert(stage.every((s) => !s.stage), `no studio stage on either page (${JSON.stringify(stage)})`);
  assert(stage.every((s) => s.can && !s.open), `the tuner may open in the room and starts shut (${JSON.stringify(stage)})`);
  const hSeen = await seen(A, 'client');
  const cSeen = await seen(B, 'host');
  assert(hSeen && Math.hypot(hSeen.x - b.x, hSeen.z - b.z) < 0.8, `the host sees the client beside it (${JSON.stringify(hSeen)})`);
  assert(cSeen && Math.hypot(cSeen.x - a.x, cSeen.z - a.z) < 0.8, `the client sees the host beside it (${JSON.stringify(cSeen)})`);

  // ---- the tuner in the room: local, with the co-op time lock; the partner stays in sync ----
  await A.evaluate(() => window.__app.debug.animTune.show());
  const t = await A.evaluate(() => ({ open: window.__app.debug.animTune.isOpen, shown: !document.querySelector('.anim-tune').hidden, coop: window.__app.debug.animTune.coop(), studio: !!document.querySelector('.studio-play') && !document.querySelector('.studio-play').closest('[hidden]') }));
  assert(t.open && t.shown && t.coop, `the tuner opens for the host in the room, co-op locked (${JSON.stringify(t)})`);
  assert(!t.studio, 'the loop player is not in the panel in a room');
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
