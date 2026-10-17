// Dead Line G1: frame time with the whole map loaded, at six spots (spawn, coke yard, basement, hall, upper corridor, roof).
//   E2E_GPU=1 node scripts/g1-perf.mjs [url] [--gfx=epic|ultra|high] [--json]
// Real rendered frames (requestAnimationFrame intervals over 400 frames per spot, after 120 warm-up frames), hardware GPU with E2E_GPU=1.
// Cloud runs (software GL) must mark this "pending PC run".
import { launch, frames, GPU } from './e2e-lib.mjs';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:/.test(a)) ?? 'http://127.0.0.1:4179/';
const gfx = (args.find((a) => a.startsWith('--gfx=')) ?? '--gfx=epic').slice(6);
const asJson = args.includes('--json');
const spots = [
  ['spawn (yard, west)', 'G', -55.5, -25.5, Math.PI / 2],
  ['coke yard', 'G', -22, -8, Math.PI / 2],
  ['plant basement', 'B', 20, -7, Math.PI / 2],
  ['switch hall', 'G', 40, -3, Math.PI / 2],
  ['upper corridor', 'U', 4, -13, Math.PI / 2],
  ['roof east', 'R', 40, 0, Math.PI / 2],
];
const Y = { B: -3.3, G: 0, U: 3.3, R: 6.6 };
const t0 = Date.now();
const { browser, page, errors } = await launch({ url, params: `autostart=dead-line&mode=sandbox&gfx=${gfx}&platform=desktop`, viewport: { width: 1920, height: 1080 }, touch: false });
await page.waitForFunction(() => window.__app.current?.world, null, { timeout: 180000 });
const loadMs = Date.now() - t0;
await frames(page, 120);
const out = { gpu: GPU, gfx, loadMs, spots: [] };
for (const [name, lv, x, z, yaw] of spots) {
  await page.evaluate(([lv, x, z, yaw, Y]) => {
    const g = window.__app.current;
    const c = g.player.controller;
    c.teleport(new c.pos.constructor(x, Y[lv] + 0.05, z), yaw);
    g.player.cam.yaw = yaw;
  }, [lv, x, z, yaw, Y]);
  await frames(page, 120);
  const r = await page.evaluate(
    () =>
      new Promise((res) => {
        const ts = [];
        const eng = window.__app.engine ?? null;
        const draws0 = performance.now();
        void draws0;
        const f = (t) => {
          ts.push(t);
          if (ts.length < 401) requestAnimationFrame(f);
          else {
            const d = [];
            for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
            d.sort((a, b) => a - b);
            const p = (q) => d[Math.min(d.length - 1, Math.floor(d.length * q))];
            const sc = window.__app.current.scene;
            res({ p50: p(0.5), p95: p(0.95), p99: p(0.99), max: d[d.length - 1], fps: 1000 / (d.reduce((a, b) => a + b, 0) / d.length), meshes: sc.meshes.length, active: sc.getActiveMeshes().length, eng: !!eng });
          }
        };
        requestAnimationFrame(f);
      }),
  );
  out.spots.push({ name, ...r });
}
out.errors = errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e));
await browser.close();
if (asJson) console.log(JSON.stringify(out, null, 1));
else {
  console.log(`G1 frame time (gfx=${gfx}, ${GPU ? 'hardware GPU' : 'software GL: NOT representative, pending PC run'}), map loaded in ${(loadMs / 1000).toFixed(1)} s`);
  for (const s of out.spots) console.log(`  ${s.name.padEnd(22)} p50 ${s.p50.toFixed(2)} ms  p95 ${s.p95.toFixed(2)} ms  p99 ${s.p99.toFixed(2)} ms  max ${s.max.toFixed(1)} ms  ${s.fps.toFixed(0)} fps  active meshes ${s.active}`);
  console.log(out.errors.length ? 'console errors: ' + out.errors.slice(0, 3).join(' | ') : 'no console errors');
}
