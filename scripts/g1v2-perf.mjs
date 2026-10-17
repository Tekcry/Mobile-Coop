// Dead Line v2 G1 (Area 1): frame time with the whole map loaded, at the lane mouth, the printworks bay and the turning head (plus the lean-to
// roof and the cable tunnel).
//   E2E_GPU=1 E2E_UNCAP=1 node scripts/g1v2-perf.mjs [url] [--gfx=epic|ultra|high] [--json]
// Real rendered frames (requestAnimationFrame intervals over 600 frames per spot, after 150 warm-up frames), hardware GPU with E2E_GPU=1.
// E2E_UNCAP=1 removes the display-rate limit (`--disable-frame-rate-limit --disable-gpu-vsync`), so the 120 fps cap of the first G1 run does not
// hide the margin: the frame rate is whatever the machine delivers. Cloud runs (software GL) must mark this "pending PC run".
import { launch, frames, GPU } from './e2e-lib.mjs';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:/.test(a)) ?? 'http://127.0.0.1:4179/';
const gfx = (args.find((a) => a.startsWith('--gfx=')) ?? '--gfx=epic').slice(6);
const asJson = args.includes('--json');
const UNCAP = process.env.E2E_UNCAP === '1';
// [name, level, x, z, yaw] (yaw 0 = +z; PI/2 = east)
const spots = [
  ['lane mouth (looking east)', 'G', 14.5, 13.5, Math.PI / 2],
  ['printworks bay', 'G', 89, 14, Math.PI],
  ['turning head (to the gate)', 'G', 178, 15, Math.PI / 2],
  ['lean-to roof (A8)', 'U', 76, 22, Math.PI / 2],
  ['cable tunnel', 'B', 30, 16.3, Math.PI / 2],
];
const Y = { B: -4.4, G: 0, U: 3.3, R: 12.6 };
const t0 = Date.now();
const { browser, page, errors } = await launch({ url, params: `autostart=dead-line-v2&mode=sandbox&gfx=${gfx}&platform=desktop`, viewport: { width: 1920, height: 1080 }, touch: false });
await page.waitForFunction(() => window.__app.current?.world, null, { timeout: 180000 });
const loadMs = Date.now() - t0;
await frames(page, 150);
const out = { gpu: GPU, uncap: UNCAP, gfx, loadMs, spots: [] };
for (const [name, lv, x, z, yaw] of spots) {
  await page.evaluate(([lv, x, z, yaw, Y]) => {
    const g = window.__app.current;
    const c = g.player.controller;
    c.teleport(new c.pos.constructor(x, Y[lv] + 0.05, z), yaw);
    g.player.cam.yaw = yaw;
  }, [lv, x, z, yaw, Y]);
  await frames(page, 150);
  const r = await page.evaluate(
    () =>
      new Promise((res) => {
        const ts = [];
        const f = (t) => {
          ts.push(t);
          if (ts.length < 601) requestAnimationFrame(f);
          else {
            const d = [];
            for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
            d.sort((a, b) => a - b);
            const p = (q) => d[Math.min(d.length - 1, Math.floor(d.length * q))];
            const sc = window.__app.current.scene;
            res({ p50: p(0.5), p95: p(0.95), p99: p(0.99), min: d[0], max: d[d.length - 1], fps: 1000 / (d.reduce((a, b) => a + b, 0) / d.length), meshes: sc.meshes.length, active: sc.getActiveMeshes().length });
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
  console.log(`Dead Line v2 G1 frame time (gfx=${gfx}, ${GPU ? 'hardware GPU' : 'software GL: NOT representative, pending PC run'}, ${UNCAP ? 'uncapped (no display-rate limit)' : 'display-capped'}), map loaded in ${(loadMs / 1000).toFixed(1)} s`);
  for (const s of out.spots) console.log(`  ${s.name.padEnd(28)} p50 ${s.p50.toFixed(2)} ms  p95 ${s.p95.toFixed(2)} ms  p99 ${s.p99.toFixed(2)} ms  min ${s.min.toFixed(2)}  max ${s.max.toFixed(1)} ms  ${s.fps.toFixed(0)} fps  active meshes ${s.active}`);
  console.log(out.errors.length ? 'console errors: ' + out.errors.slice(0, 3).join(' | ') : 'no console errors');
}
