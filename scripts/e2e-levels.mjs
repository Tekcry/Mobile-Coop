// Multi-level AI: the layered nav grid (a storey per surface), ladder links both ways, chases across storeys.
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=warehouse&mode=mission' });
let failed = false;
/** (havok-stall) Math.random's seed for the ladder chases. */
const LADDER_SEED = 7919;
/** (guard-ai S13) Sim seconds the manual clock runs before the chases (the player's physics and the world settle). */
const SETTLE_S = 2;
/** (guard-ai S13) Wall-clock safety net per chase (ms); the sim budget below ends a chase long before it. */
const WALL_CAP_MS = 240000;
/** (guard-ai S13) The nav link walk's ladder speeds (`Enemy.runLink`: up 1.1, down 1.4 m/s) and the budget's margin. */
const CLIMB_UP = 1.1;
const CLIMB_DOWN = 1.4;
const BUDGET_MARGIN = 4;
const BUDGET_EXTRA_S = 30;
try {
  // (guard-ai S13) the manual clock takes over the moment the match exists, so the sim time before the chases does not
  // depend on how many real-time steps a loaded machine ran first (that world state moved the climb between 10 and
  // 30 s of game time); the settle below is sim time too.
  await page.waitForFunction(() => {
    if (!window.__app.current?.enemyMgr) return false;
    window.__app.loop.manual = true;
    return true;
  }, null, { timeout: 60000 });
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

  // (havok-stall) the chases are deterministic: the sim runs on the manual clock (no real-time frames move it between
  // the steps), and each chase draws its random numbers (the guard's think ticks) from a fixed seed. Unseeded, the
  // climb-up took 9-30 s of game time (the runner takes the ladder once sight breaks).
  // (guard-ai S13) The wait is sim time, never wall clock: the loop steps 0.25 s of game time at a time until the runner
  // has taken a link and stands on the player's storey (within 0.4 m), or the sim budget runs out. The budget comes from
  // the design: the run to the ladder at the runner's run speed plus the climb at the link walk's climb speed is the
  // ideal time (about 4.5 s up); solo runs read 10-15.5 s (think ticks and sight-break pauses), so the budget is
  // BUDGET_MARGIN x ideal + BUDGET_EXTRA_S (about 48 s up, 45 s down). The wall cap is only the hang guard.
  await G((s) => { window.__app.loop.stepHeadless(s); }, SETTLE_S);
  /** A runner chases the player across a ladder (`seed`: Math.random's for the chase); returns its track. */
  const chase = (up, seed) =>
    G(([up, seed, climb, margin, extra, wallCap]) => {
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
        // (guard-ai S24, A146/A148) one last known position per player, and an alerted guard with none for his intruder
        // never walks to the real feet: the player was seen where he stands (his slot; a stand-in ref, so the real one
        // is not marked spotted), and the runner spawned alerted is sent in by command on that intruder
        // (`EnemyManager.sendIn`); he chases its last known position across the ladder on its own flow field
        const p0 = up ? top : floor;
        const slot = em.ctx.reportSighting({ id: g.localRef.id, feet: new V(p0.x, p0.y, p0.z), spotted: false });
        const e = em.spawn('runner', up ? floor : new V(top.x + fx * 0.4, L.top.y, top.z + fz * 0.4), true, 0);
        const hunt = [slot, e.hunt];
        const y0 = e.pos.y;
        // the budget (sim s): the flat run to the ladder and across the top at the runner's run speed + the rise at the climb speed
        const run = e.def?.runSpeed ?? 4.2;
        const ideal = 7.2 / run + (L.top.y - L.base.y) / climb;
        const budget = Math.ceil(ideal * margin + extra);
        const wall0 = performance.now();
        let t = 0;
        let done = false;
        for (; t < budget && performance.now() - wall0 < wallCap; ) {
          a.loop.stepHeadless(0.25);
          t += 0.25;
          if (e.linksTaken && !e['link'] && Math.abs(e.pos.y - g.player.position.y) < 0.4) {
            done = true;
            break;
          }
        }
        return { y0, y: e.pos.y, links: e.linksTaken, t, py: g.player.position.y, budget, ideal, done, wallMs: performance.now() - wall0, linking: !!e['link'], state: String(e.state), hunt };
      } finally {
        Math.random = rnd;
      }
    }, [up, seed, up ? CLIMB_UP : CLIMB_DOWN, BUDGET_MARGIN, BUDGET_EXTRA_S, WALL_CAP_MS]);
  /** A chase's sim time and budget for an assert message (sim seconds, and the wall time it took). */
  const took = (r) => `${r.t.toFixed(2)} sim s of ${r.budget} s budget (ideal ${r.ideal.toFixed(1)} s), ${(r.wallMs / 1000).toFixed(0)} s wall${r.done ? '' : `, not done: state ${r.state}, links ${r.links}, linking ${r.linking}, player y ${r.py.toFixed(2)}, slot / hunt ${r.hunt.join(' / ')}`}`;

  console.log('up a ladder');
  const u = await chase(true, LADDER_SEED);
  assert(u.links >= 1 && Math.abs(u.y - u.py) < 0.4, `a runner climbs the rack ladder to the player (${u.y0.toFixed(1)} -> ${u.y.toFixed(2)} m in ${took(u)})`);
  console.log('down a ladder');
  const d = await chase(false, LADDER_SEED);
  assert(d.links >= 1 && d.y < 0.4, `a runner on the rack climbs down to the player (${d.y0.toFixed(1)} -> ${d.y.toFixed(2)} m in ${took(d)})`);

  const bad = errors.filter((e) => !/GL Driver|GPU stall/.test(e));
  assert(bad.length === 0, `no console errors${bad.length ? `: ${bad.join(' | ')}` : ''}`);
} catch (e) {
  console.error(e.message);
  failed = true;
}
await browser.close();
process.exit(failed ? 1 : 0);
