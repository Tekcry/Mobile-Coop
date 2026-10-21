// Multi-level AI: the layered nav grid (a storey per surface), ladder links both ways, chases across storeys.
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=warehouse&mode=mission' });
let failed = false;
/** (havok-stall) Math.random's seed for the ladder chases. */
const LADDER_SEED = 7919;
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

  // (havok-stall) the chases are deterministic: the sim runs on the manual clock from here (no real-time frames move it
  // between the steps), and each chase draws its random numbers (the guard's think ticks) from a fixed seed. Unseeded,
  // the climb-up took 9-30 s of game time against its 30 s budget (the runner takes the ladder once sight breaks).
  await G(() => { window.__app.loop.manual = true; });
  /** A runner chases the player across a ladder (`seed`: Math.random's for the chase); returns its track. */
  const chase = (up, seed) =>
    G(([up, seed]) => {
      const rnd = Math.random;
      let sd = seed;
      Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      try {
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
      } finally {
        Math.random = rnd;
      }
    }, [up, seed]);

  console.log('up a ladder');
  const u = await chase(true, LADDER_SEED);
  assert(u.links >= 1 && Math.abs(u.y - u.py) < 0.4, `a runner climbs the rack ladder to the player (${u.y0.toFixed(1)} -> ${u.y.toFixed(2)} m in ${u.t} s)`);
  console.log('down a ladder');
  const d = await chase(false, LADDER_SEED);
  assert(d.links >= 1 && d.y < 0.4, `a runner on the rack climbs down to the player (${d.y0.toFixed(1)} -> ${d.y.toFixed(2)} m in ${d.t} s)`);

  const bad = errors.filter((e) => !/GL Driver|GPU stall/.test(e));
  assert(bad.length === 0, `no console errors${bad.length ? `: ${bad.join(' | ')}` : ''}`);
} catch (e) {
  console.error(e.message);
  failed = true;
}
await browser.close();
process.exit(failed ? 1 : 0);
