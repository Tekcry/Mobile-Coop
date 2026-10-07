// Soak test: plays a Warehouse wave fight in real time for N minutes (default 10) with the full render
// loop and reports, per interval, frame pacing, CPU per frame, adaptive quality / resolution, heap and
// enemy count. Fails on page errors, a heap that keeps growing (leak) or CPU per frame creeping up.
// SwiftShader cannot show thermal throttling; on a phone use the debug overlay (F3 / 3-finger tap)
// pacing graph for the 10-minute thermal soak (TESTING.md).
//   node scripts/soak.mjs [minutes=10] [url]
import { launch } from './e2e-lib.mjs';

const minutes = Number(process.argv[2] ?? 10);
const url = process.argv[3] ?? 'http://localhost:4173/';
const INTERVAL = Math.min(30, Math.max(10, (minutes * 60) / 10));
// MAP / MODE: any map and mode (default the Warehouse in Wave)
const { browser, page, errors } = await launch({ url, params: `autostart=${process.env.MAP ?? 'warehouse'}&mode=${process.env.MODE ?? 'wave'}` });
await page.evaluate(() => {
  const g = window.__app.current;
  g.target.damageMul = 0;
  window.__soak = { kills: 0 };
});
const rows = [];
const t0 = Date.now();
while (Date.now() - t0 < minutes * 60_000) {
  await new Promise((r) => setTimeout(r, INTERVAL * 1000));
  const r = await page.evaluate(() => {
    const app = window.__app;
    const g = app.current;
    // keep the fight going: walk the player around the floor so AI, nav and animation stay busy
    const t = performance.now() / 1000;
    app.input.state.move.x = Math.sin(t * 0.3);
    app.input.state.move.y = Math.cos(t * 0.21);
    const p = app.quality.pacing();
    const heap = performance.memory?.usedJSHeapSize ?? 0;
    return {
      p50: p.p50,
      p95: p.p95,
      cpu: p.cpuP50,
      cpu95: p.cpuP95,
      q: app.quality.level.name,
      res: app.quality.res.scale,
      heapMB: heap / 1048576,
      alive: g.enemyMgr?.alive ?? 0,
      wave: g.mode?.wave ?? 0,
    };
  });
  rows.push(r);
  const m = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`${m.padStart(5)} min  frame p50 ${r.p50.toFixed(1)} p95 ${r.p95.toFixed(1)} ms  cpu p50 ${r.cpu.toFixed(2)} p95 ${r.cpu95.toFixed(2)} ms  ${r.q} x${r.res.toFixed(2)}  heap ${r.heapMB.toFixed(1)} MB  wave ${r.wave} alive ${r.alive}`);
}
const real = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
await browser.close();
let fail = real.length > 0;
if (rows.length >= 4) {
  const early = rows.slice(1, 3);
  const late = rows.slice(-2);
  const avg = (a, k) => a.reduce((s, r) => s + r[k], 0) / a.length;
  const heapGrowth = avg(late, 'heapMB') - avg(early, 'heapMB');
  const cpuRatio = avg(late, 'cpu') / Math.max(0.01, avg(early, 'cpu'));
  console.log(`heap growth ${heapGrowth.toFixed(1)} MB, cpu late/early x${cpuRatio.toFixed(2)}`);
  if (heapGrowth > 25) {
    console.log('FAIL: heap keeps growing');
    fail = true;
  }
  if (cpuRatio > 1.5) {
    console.log('FAIL: CPU per frame creeps up');
    fail = true;
  }
}
if (real.length) console.log(real.join('\n'));
console.log(fail ? 'SOAK FAILED' : 'soak passed');
process.exit(fail ? 1 : 0);
