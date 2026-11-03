// (walk-test round 1, checklist 1) Foot slide of the Mixamo body: runs each gait in the Test Chamber headless, tracks
// both toe bones in the world at 60 Hz and reports how fast a planted foot moves (its slowest 30% of frames) and how
// high it is then. 0 = no slide; the body speed is printed beside it.
//   node scripts/foot-slide.mjs [gait,...]   (URL / E2E_PORT, E2E_BROWSER, E2E_GPU as the other e2e scripts)
// Gaits: walk jog run sneak crouchrun lowready aimwalk.
import { launch, waitOperator } from './e2e-lib.mjs';

const GAITS = {
  walk: { y: 0.5 },
  jog: { y: 1 },
  run: { y: 1, params: 'autostart=chamber&gear=5' },
  sneak: { y: 0.4, crouch: true },
  crouchrun: { y: 1, crouch: true },
  lowready: { y: 0.5, draw: true },
  aimwalk: { y: 0.6, ads: true },
};
const want = (process.argv[2] ?? Object.keys(GAITS).join(',')).split(',');
const url = process.env.URL ?? `http://localhost:${process.env.E2E_PORT ?? 4173}/`;
const rows = [];
for (const name of want) {
  const gt = GAITS[name];
  if (!gt) throw new Error(`unknown gait ${name}`);
  const { browser, page } = await launch({ url, params: gt.params ?? 'autostart=chamber' });
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 300000 });
  await waitOperator(page);
  const res = await page.evaluate((gt) => {
    const a = window.__app;
    const g = a.current;
    const p = g.player;
    a.loop.manual = true;
    const V = p.controller.pos.constructor;
    p.controller.teleport(new V(8, 0, 21), Math.PI / 2);
    p.cam.yaw = Math.PI / 2;
    const s = a.input.state;
    if (gt.crouch) s.tap('crouch');
    if (gt.draw) s.tap('draw');
    const scene = p.cam.camera.getScene();
    const nodes = scene.transformNodes.concat(scene.meshes);
    const find = (end) => nodes.find((n) => n.name.endsWith(end) && n.getWorldMatrix);
    const toes = [find('LeftToeBase'), find('RightToeBase')];
    if (!toes[0] || !toes[1]) return { error: 'no toe bones' };
    const samples = [];
    const total = 4.5;
    for (let f = 0; f < total * 60; f++) {
      s.move.x = 0;
      s.move.y = gt.y;
      s.set('slide-ads', 'ads', !!gt.ads);
      a.loop.stepHeadless(1 / 60, 120);
      // the clips' weighted blend lands on the bones only in the scene's animate pass (a render)
      scene.render();
      if (f < 90) continue; // 1.5 s to settle into the gait
      const c = p.controller.pos;
      samples.push({ body: [c.x, c.z], toes: toes.map((t) => { const ch = []; for (let q = t; q; q = q.parent) ch.unshift(q); for (const q of ch) q.computeWorldMatrix(true); const w = t.getAbsolutePosition(); return [w.x, w.y, w.z]; }) });
    }
    const n = samples.length;
    const speed = Math.hypot(samples[n - 1].body[0] - samples[0].body[0], samples[n - 1].body[1] - samples[0].body[1]) / ((n - 1) / 60);
    // a planted foot is the slowest part of its cycle: the mean ground speed over its slowest 30% of frames (a stance
    // is ~30-60% of a cycle), and its height then above its lowest
    const feet = [0, 1].map((k) => {
      const ys = samples.map((q) => q.toes[k][1]);
      const lo = Math.min(...ys);
      const v = [];
      for (let i = 1; i < n; i++) {
        const A = samples[i - 1].toes[k];
        const B = samples[i].toes[k];
        v.push({ s: Math.hypot(B[0] - A[0], B[2] - A[2]) * 60, h: (A[1] + B[1]) / 2 - lo });
      }
      v.sort((x, y) => x.s - y.s);
      const slow = v.slice(0, Math.max(1, Math.round(v.length * 0.3)));
      return { slide: slow.reduce((t, q) => t + q.s, 0) / slow.length, planted: slow.reduce((t, q) => t + q.h, 0) / slow.length };
    });
    return { speed, feet };
  }, gt);
  await browser.close();
  if (res.error) throw new Error(`${name}: ${res.error}`);
  const sl = Math.max(res.feet[0].slide, res.feet[1].slide);
  const lift = Math.max(res.feet[0].planted, res.feet[1].planted);
  rows.push({ name, speed: res.speed, slide: sl, ratio: sl / res.speed, lift });
  console.log(`${name.padEnd(10)} body ${res.speed.toFixed(2)} m/s  planted foot moves ${sl.toFixed(2)} m/s (${(100 * sl / res.speed).toFixed(0)}% of body), ${(100 * lift).toFixed(1)} cm off its lowest`);
}
