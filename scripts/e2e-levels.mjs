// Multi-level AI: the layered nav grid (a storey per surface), ladder links both ways, chases across storeys.
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=warehouse&mode=wave' });
let failed = false;
try {
  await page.waitForFunction(() => window.__app.current?.enemyMgr, null, { timeout: 60000 });
  await frames(page, 10);
  const G = (f, a) => page.evaluate(f, a);

  console.log('layered grid');
  const nav = await G(() => {
    const n = window.__app.current.enemyMgr.nav;
    const ladders = n.links.filter((l) => l.kind === 'ladder' && n.walk[l.a] && n.walk[l.b]).length;
    return { layers: n.layers, ladders };
  });
  assert(nav.layers === 3, `the grid holds three storeys per column (${nav.layers})`);
  assert(nav.ladders >= 6, `every Warehouse ladder joins two storeys both ways (${nav.ladders} links)`);

  /** A runner chases the player across a ladder; returns its track. */
  const chase = (up) =>
    G((up) => {
      const a = window.__app;
      const g = a.current;
      const em = g.enemyMgr;
      em.clear();
      g.mode.update = () => {};
      g.target.damageMul = 0;
      const L = g.world.level.anchors.ladders[0];
      const fx = Math.sin(L.facing);
      const fz = Math.cos(L.facing);
      const V = g.player.position.constructor;
      const top = new V(L.top.x + fx * 1.2, L.top.y + 0.05, L.top.z + fz * 1.2);
      const floor = new V(L.base.x - fx * 6, 0.05, L.base.z - fz * 6);
      g.player.controller.teleport(up ? top : floor, up ? L.facing + Math.PI : L.facing);
      const e = em.spawn('runner', up ? floor : new V(top.x + fx * 0.4, L.top.y, top.z + fz * 0.4), true, 0);
      const y0 = e.pos.y;
      let t = 0;
      for (; t < 30; t += 0.25) {
        a.loop.stepHeadless(0.25);
        if (e.linksTaken && !e['link'] && Math.abs(e.pos.y - g.player.position.y) < 0.4) break;
      }
      return { y0, y: e.pos.y, links: e.linksTaken, t, py: g.player.position.y };
    }, up);

  console.log('up a ladder');
  const u = await chase(true);
  assert(u.links >= 1 && Math.abs(u.y - u.py) < 0.4, `a runner climbs the rack ladder to the player (${u.y0.toFixed(1)} -> ${u.y.toFixed(2)} m in ${u.t} s)`);
  console.log('down a ladder');
  const d = await chase(false);
  assert(d.links >= 1 && d.y < 0.4, `a runner on the rack climbs down to the player (${d.y0.toFixed(1)} -> ${d.y.toFixed(2)} m in ${d.t} s)`);

  const bad = errors.filter((e) => !/GL Driver|GPU stall/.test(e));
  assert(bad.length === 0, `no console errors${bad.length ? `: ${bad.join(' | ')}` : ''}`);
} catch (e) {
  console.error(e.message);
  failed = true;
}
await browser.close();
process.exit(failed ? 1 : 0);
