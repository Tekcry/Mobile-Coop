// (mixamo-chars, N53 slice d) Co-op in the Test Chamber, two pages over `?net=local`: the host plays Wren (X Bot) and the
// joiner Moth (Y Bot) on their own pages, and each page draws the partner with the partner's body (the host's page shows
// a Y Bot partner, the joiner's an X Bot); the partner's body plays a Mixamo move and walks with them; no console errors.
//   node scripts/e2e-mixamo-coop.mjs [url] [--shots=<dir>]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { assert } from './e2e-lib.mjs';
import { until, hostAndJoin, LOAD_MS } from './e2e-net-lib.mjs';

const url = process.argv.find((a) => /^https?:/.test(a)) ?? 'http://localhost:4173/';
const shots = process.argv.find((a) => a.startsWith('--shots='))?.slice(8) ?? '';
if (shots) mkdirSync(shots, { recursive: true });
let failed = false;
const { browser, A, B, pages, errors } = await hostAndJoin(url, 2, { params: 'net=local&practice=1' });
try {
  // the host picks the Test Chamber (the Mode row's next choice after the Campaign), both ready, start
  await A.evaluate(() => {
    const r = [...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === 'Mode');
    r.querySelectorAll('.choice-arrow')[1].click();
  });
  await until(A, () => window.__coop.session.map === 'chamber' && window.__coop.session.mode === 'test', null, 8000, 'the host picks the Test Chamber');
  await until(B, () => window.__coop.session.map === 'chamber', null, 8000, 'the partner hears the pick');
  await B.evaluate(() => window.__coop.session.setReady(true));
  await until(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready');
  await A.evaluate(() => window.__coop.session.startMatch());
  for (const P of pages) await until(P, () => window.__app.current?.opts?.map?.id === 'chamber' && !!window.__app.current.net, null, LOAD_MS, 'the Test Chamber match on both pages');
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state && r.avatar), null, 15000, 'the host has the partner');
  await until(B, () => window.__app.current.net.avatars.size > 0, null, 15000, 'the joiner has the host');
  // every Mixamo body in (own and partner), on both pages
  const partnerOf = (who) => (who === 'host' ? 'window.__app.current.net.remotes.values().next().value?.avatar' : 'window.__app.current.net.avatars.values().next().value');
  for (const [P, who] of [[A, 'host'], [B, 'joiner']])
    await until(P, (expr) => { const r = eval(expr); const m = window.__app.current.player.mixamo; return !!m?.ready && !!r?.mixamo?.ready; }, partnerOf(who), 60000, `both bodies loaded on the ${who}'s page`);
  const read = (P, who) =>
    P.evaluate((expr) => {
      const r = eval(expr);
      let best = '', bw = -1;
      for (const [n, v] of Object.entries(r.mixamo.weights())) if (v > bw) { bw = v; best = n; }
      return { own: window.__app.current.player.mixamo.model, partner: r.mixamo.model, partnerMove: best, wren: !window.__app.current.player.figure.renderMeshes.some((m) => m.isEnabled() && m.isVisible) };
    }, partnerOf(who));
  const a = await read(A, 'host');
  const b = await read(B, 'joiner');
  console.log('host page', JSON.stringify(a), 'joiner page', JSON.stringify(b));
  assert(a.own === 'xbot' && b.own === 'ybot', `the host plays Wren (X Bot), the joiner Moth (Y Bot) (${a.own}, ${b.own})`);
  assert(a.partner === 'ybot' && b.partner === 'xbot', `each page draws the partner's own body (${a.partner}, ${b.partner})`);
  assert(a.wren && b.wren, 'the old Wren figure is hidden on both pages');
  assert(a.partnerMove !== '' && b.partnerMove !== '', 'the partner plays a Mixamo move');
  if (shots) {
    await A.screenshot({ path: join(shots, 'co1-host.png') });
    await B.screenshot({ path: join(shots, 'co2-joiner.png') });
  }
  // (slice f) a downed partner lies by the Mixamo move (the rig root is not tipped on its side)
  await A.evaluate(() => {
    const av = window.__app.current.net.remotes.values().next().value.avatar;
    Object.defineProperty(av, 'dead', { get: () => true, configurable: true });
  });
  await until(A, () => { const av = window.__app.current.net.remotes.values().next().value.avatar; return (av.mixamo.weights().downed_lie ?? 0) > 0.95; }, null, 8000, 'the downed partner lies');
  const down = await A.evaluate(() => { const av = window.__app.current.net.remotes.values().next().value.avatar; return { tip: av.rig.root.rotation.z, w: av.mixamo.weights().downed_lie }; });
  console.log('downed partner', JSON.stringify(down));
  assert(Math.abs(down.tip) < 1e-6, `the downed partner's rig root is not tipped (${down.tip})`);
  if (shots) await A.screenshot({ path: join(shots, 'co3-partner-down.png') });
  await A.evaluate(() => { delete window.__app.current.net.remotes.values().next().value.avatar.dead; });
  // (errors holds one list per page; the GPU driver notes are not the game's, as e2e-coop-chamber)
  const bad = errors.flat().filter((e) => !/WebGL|GPU stall|swiftshader|favicon|GL Driver/i.test(e));
  if (bad.length) console.log('console errors:\n  ' + bad.join('\n  '));
  assert(bad.length === 0, `${bad.length} console errors`);
} catch (e) {
  failed = true;
  console.error('FAIL', e.message);
}
await browser.close();
console.log(failed ? 'e2e-mixamo-coop: FAIL' : 'e2e-mixamo-coop: PASS');
process.exit(failed ? 1 : 0);
