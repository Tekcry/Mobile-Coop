// Dead Line: main-thread cost per active guard on desktop (Epic, Warehouse, clear mode, every guard unaware and patrolling).
// For N guards (default 0, 4, 8, 10, 14, 16): sim p95 per 120 Hz display frame (same method as scripts/perf.mjs) plus the render's JS
// (active mesh evaluation), summed to the "main thread" figure. Writes map-dead-line-guard-cost.json next to this file.
// Run (needs dist/ built and `vite preview` on 4173): E2E_GPU=1 node docs/design/map-dead-line-guard-cost.mjs [url] [--counts=0,4,8,14,16]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, frames } from '../../scripts/e2e-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const counts = (args.find((a) => a.startsWith('--counts='))?.slice(9) ?? '0,4,8,10,12,13,14,16').split(',').map(Number);
const REPEATS = 3;
const MAP = args.find((a) => a.startsWith("--map="))?.slice(6) ?? "warehouse";

const { browser, page, errors } = await launch({
  url,
  params: `autostart=${MAP}&mode=clear&debug=1&gfx=epic&platform=desktop`,
  touch: false,
  viewport: { width: 640, height: 360 }
});
await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 300000 });
await frames(page, 10);

const results = [];
for (const n of counts) {
  const runs = [];
  for (let r = 0; r < REPEATS; r++) {
    await page.evaluate((n) => {
      const app = window.__app;
      const g = app.current;
      g.target.damageMul = 0;
      g.mode.pending.length = 0;
      g.enemyMgr.clear();
      const V = g.player.position.constructor;
      if (location.search.includes("autostart=warehouse")) g.player.controller.teleport(new V(3, 0, -7.5), 0);
      g.player.cam.yaw = 0;
      g.player.controller['crouchToggled'] = true;
      // 14 = 11 grunts, officer, sniper, heavy (the roster); fewer: the first n of the same order
      const order = ['grunt', 'grunt', 'grunt', 'grunt', 'officer', 'grunt', 'grunt', 'sniper', 'grunt', 'grunt', 'grunt', 'heavy', 'grunt', 'grunt', 'grunt', 'grunt'];
      const spots = [[-1, -2], [4, -3], [8, -1], [12, 0.5], [16, -4], [-1, 4], [4, 6], [8, 3], [13, 7], [18, 4], [10, -6], [14, 2], [2, 8], [6, 9], [-2, 1], [11, 5]];
      // the engine caps live enemies at MAX_ALIVE (10, ai/enemyManager.ts): the harness hides the count while spawning so 14 and 16 can be measured
      Object.defineProperty(g.enemyMgr, "alive", { get: () => 0, configurable: true });
      for (let i = 0; i < n; i++) {
        const [x, z] = spots[i];
        const e = g.enemyMgr.spawn(order[i], new V(x, 0, z), false, i * 0.6);
        if (e) e.setPatrol({ points: [[x, z], [x + 2.5, z + 1.5], [x + 2.5, z - 1.5]], wait: 1 });
      }
      delete g.enemyMgr.alive;
      for (let i = 0; i < 16; i++) app.loop.stepHeadless(0.5, 120);
    }, n);
    const cpu = await page.evaluate(() => {
      const app = window.__app;
      const per = [];
      for (let i = 0; i < 300; i++) {
        const t = performance.now();
        app.loop.stepHeadless(1 / 60, 120);
        const d = (performance.now() - t) / 2;
        per.push(d, d);
      }
      per.sort((a, b) => a - b);
      const pc = (p) => per[Math.min(per.length - 1, Math.floor(p * per.length))];
      return { p50: pc(0.5), p95: pc(0.95), alive: app.current.enemyMgr.alive };
    });
    const render = await page.evaluate(async () => {
      const app = window.__app;
      const scene = app.current.scene;
      let evalMs = 0;
      let evals = 0;
      let t0 = 0;
      const o1 = scene.onBeforeActiveMeshesEvaluationObservable.add(() => (t0 = performance.now()));
      const o2 = scene.onAfterActiveMeshesEvaluationObservable.add(() => {
        evalMs += performance.now() - t0;
        evals++;
      });
      await new Promise((res) => setTimeout(res, 2500));
      scene.onBeforeActiveMeshesEvaluationObservable.remove(o1);
      scene.onAfterActiveMeshesEvaluationObservable.remove(o2);
      return { evalMs: evalMs / Math.max(1, evals), evals };
    });
    runs.push({ alive: cpu.alive, p50: cpu.p50, p95: cpu.p95, renderJs: render.evalMs, main: cpu.p95 + render.evalMs });
  }
  const med = (k) => runs.map((q) => q[k]).sort((a, b) => a - b)[Math.floor(runs.length / 2)];
  results.push({ guards: n, alive: runs[0].alive, simP50: +med('p50').toFixed(3), simP95: +med('p95').toFixed(3), renderJs: +med('renderJs').toFixed(3), mainP95: +med('main').toFixed(3), runs: runs.map((q) => +q.main.toFixed(3)) });
  console.log(JSON.stringify(results[results.length - 1]));
}
const real = errors.filter((e) => e.startsWith('[pageerror]'));
fs.writeFileSync(path.join(here, 'map-dead-line-guard-cost.json'), JSON.stringify({ map: MAP, when: new Date().toISOString(), gpu: process.env.E2E_GPU === '1', repeats: REPEATS, results, pageErrors: real.slice(0, 5) }, null, 1));
await browser.close();
