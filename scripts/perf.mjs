// Combat performance probe: draw calls, active meshes, CPU time per fixed step, allocation churn.
// SwiftShader GPU timings are not representative; CPU-side numbers and draw calls are.
import { launch, frames } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=depot&mode=wave&debug=1' });
await frames(page, 10);
const r = await page.evaluate(async () => {
  const app = window.__app;
  const g = app.current;
  g.target.damageMul = 0;
  const V = g.player.position.constructor;
  for (let i = 0; i < 10; i++) g.enemyMgr.spawn(['grunt', 'runner', 'heavy'][i % 3], new V(-18 + (i % 5) * 2.5, 0, -10 + Math.floor(i / 5) * 3), true);
  app.loop.stepHeadless(2);
  // CPU per fixed step (sim + physics + frame logic, no render)
  const t0 = performance.now();
  app.loop.stepHeadless(5);
  const cpuPerStep = (performance.now() - t0) / 300;
  // allocation churn over 3 s of headless sim
  const m0 = performance.memory?.usedJSHeapSize ?? 0;
  app.loop.stepHeadless(3);
  const m1 = performance.memory?.usedJSHeapSize ?? 0;
  // draw calls in a real rendered frame
  await new Promise((res) => setTimeout(res, 600));
  const dbg = document.querySelector('.debug-overlay pre')?.textContent ?? '';
  return { cpuPerStepMs: cpuPerStep.toFixed(2), heapDeltaKB: ((m1 - m0) / 1024).toFixed(0), alive: g.enemyMgr.alive, meshes: g.scene.meshes.length, dbg };
});
console.log(JSON.stringify({ ...r, dbg: undefined }, null, 1));
console.log(r.dbg);
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
