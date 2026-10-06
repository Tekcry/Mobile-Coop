// Combat performance probe on Warehouse with 10 enemies (120 Hz targets):
//  - CPU per display frame at a simulated 120 Hz (fixed 60 Hz sim + 2 interpolated frame updates), p50/p95/p99
//  - animation cost per character (rig evaluation, ms)
//  - allocations per simulated second (sampling heap profiler, incl. collected objects) + top allocators
//  - draw calls and real rendered frame pacing (SwiftShader: GPU timings are NOT representative)
// Usage: node scripts/perf.mjs [url] [--json] [--budget] (--budget exits 1 when a CPU-side budget is missed)
import { launch, frames } from './e2e-lib.mjs';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const asJson = args.includes('--json');
const enforce = args.includes('--budget');
// allocation budget: per display frame at 120 Hz. What remains is V8 boxing doubles passed to
// non-inlined calls and Havok's embind marshalling (young-generation churn, no retained objects).
const BUDGET = { cpuP95Ms: 3.5, animPerCharMs: 0.04, drawCalls: 80, kbPerFrame: 96 };

// STEALTH=1: the ten are unaware (stealth rules, patrols / posts, full perception with exposure rays)
const stealth = !!process.env.STEALTH;
// MAP=embassy: the embassy court (the same ten enemies)
const MAP = process.env.MAP ?? 'warehouse';
const { browser, page, errors } = await launch({ url, params: `autostart=${MAP}&mode=${stealth ? 'clear' : 'wave'}&debug=1${process.env.WARM ? '&warm=' + process.env.WARM : ''}` });
await frames(page, 10);
await page.evaluate((stealth) => {
  const app = window.__app;
  const g = app.current;
  g.target.damageMul = 0;
  if (stealth) {
    g.mode.pending.length = 0;
    g.enemyMgr.clear();
  }
  const V = g.player.position.constructor;
  // factory floor fight: player at the south door, ten enemies spread over the floor
  const emb = location.search.includes('autostart=embassy');
  g.player.controller.teleport(emb ? new V(0, 0, -19) : new V(3, 0, -7.5), 0);
  g.player.cam.yaw = 0;
  const spots = emb
    ? [[-6, -12], [-3, -6], [3, -6], [6, -12], [10, -3], [-10, -3], [-2, 4], [3, 7], [8, 4], [-7, 7]]
    : [[-1, -2], [4, -3], [8, -1], [12, 0.5], [16, -4], [-1, 4], [4, 6], [8, 3], [13, 7], [18, 4]];
  for (let i = 0; i < 10; i++) {
    const e = g.enemyMgr.spawn(['grunt', 'heavy', 'sniper', 'enforcer', 'dog', 'droneOp', 'officer', 'runner', 'grunt', 'grunt'][i % 10], new V(spots[i][0], 0, spots[i][1]), !stealth, i * 0.6);
    // stealth: half walk short beats, all keep looking; the player crouches in the dark doorway
    if (stealth && i % 2 === 0) e.setPatrol({ points: [[spots[i][0], spots[i][1]], [spots[i][0] + 2, spots[i][1] + 1.5]], wait: 1 });
  }
  if (stealth) g.player.controller['crouchToggled'] = true;
  // warm up long enough for the JIT to optimise the hot paths (boxed doubles in baseline code would
  // otherwise dominate the allocation profile)
  for (let i = 0; i < Number(new URLSearchParams(location.search).get("warm") ?? 16); i++) app.loop.stepHeadless(0.5, 120);
}, stealth);

// CPU per simulated 120 Hz display frame, sampled per frame
const cpu = await page.evaluate(() => {
  const app = window.__app;
  const g = app.current;
  const em = g.enemyMgr;
  let animMs = 0;
  let animCalls = 0;
  const orig = em.frameUpdate.bind(em);
  em.frameUpdate = (dt, a) => {
    const t = performance.now();
    orig(dt, a);
    animMs += performance.now() - t;
    animCalls++;
  };
  const per = [];
  // 600 frames: each 1/60 s step = fixed update + 2 frame updates; time every 60 Hz chunk, halve per frame
  for (let i = 0; i < 300; i++) {
    const t = performance.now();
    app.loop.stepHeadless(1 / 60, 120);
    const d = (performance.now() - t) / 2;
    per.push(d, d);
  }
  em.frameUpdate = orig;
  per.sort((a, b) => a - b);
  const pc = (p) => per[Math.min(per.length - 1, Math.floor(p * per.length))];
  return {
    frames: per.length,
    p50: pc(0.5),
    p95: pc(0.95),
    p99: pc(0.99),
    animPerCharMs: animMs / Math.max(1, animCalls) / Math.max(1, em.alive),
    alive: em.alive,
  };
});

// allocations: sampling heap profiler including objects already collected
const cdp = await page.context().newCDPSession(page);
await cdp.send('HeapProfiler.enable');
await page.evaluate(() => window.__app.loop.stepHeadless(0.5, 120));
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 256, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
const SIM_S = 4;
await page.evaluate((s) => window.__app.loop.stepHeadless(s, 120), SIM_S);
const { profile } = await cdp.send('HeapProfiler.stopSampling');
const byFn = new Map();
let total = 0;
// builtins and engine getters (no script url, or Babylon/Havok internals) are charged to their caller too
const label = (f) => `${f.functionName || '(anon)'} ${f.url.split('/').pop().replace(/\?.*$/, '')}:${f.lineNumber + 1}`;
const walk = (n, parent) => {
  const self = n.selfSize;
  total += self;
  const f = n.callFrame;
  const own = label(f);
  const key = !f.url || /chunk-|babylon/.test(f.url) ? `${own} <- ${parent}` : own;
  if (self) byFn.set(key, (byFn.get(key) ?? 0) + self);
  for (const c of n.children) walk(c, own);
};
walk(profile.head, '');
const top = [...byFn.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.TOP ?? 8)).map(([k, v]) => `${(v / 1024 / SIM_S).toFixed(1)} KB/s  ${k}`);

// optional CPU profile of the sim (PROFILE=1): self time per function
if (process.env.PROFILE) {
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  await cdp.send('Profiler.start');
  await page.evaluate(() => window.__app.loop.stepHeadless(4, 120));
  const { profile: cp } = await cdp.send('Profiler.stop');
  const self = new Map();
  const dt = new Map();
  for (let i = 0; i < cp.samples.length; i++) dt.set(cp.samples[i], (dt.get(cp.samples[i]) ?? 0) + (cp.timeDeltas[i] ?? 0));
  let all = 0;
  for (const n of cp.nodes) {
    const t = (dt.get(n.id) ?? 0) / 1000;
    all += t;
    const f = n.callFrame;
    const k = `${f.functionName || '(anon)'} ${f.url.split('/').pop().replace(/\?.*$/, '')}:${f.lineNumber + 1}`;
    self.set(k, (self.get(k) ?? 0) + t);
  }
  console.log(`CPU profile (4 simulated s @120 Hz, ${all.toFixed(0)} ms sampled), top self time:`);
  for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.PROFILE) > 1 ? Number(process.env.PROFILE) : 25)) console.log(`   ${v.toFixed(1)} ms  ${(v / all * 100).toFixed(1)}%  ${k}`);
}

// real frames (render included) for draw calls and pacing
const real = await page.evaluate(async () => {
  const app = window.__app;
  app.quality.stats.clear();
  await new Promise((res) => setTimeout(res, 2500));
  const p = app.quality.pacing();
  const dbg = document.querySelector('.debug-overlay pre')?.textContent ?? '';
  const draws = Number(/draws (\d+)/.exec(dbg)?.[1] ?? NaN);
  return { hz: p.hz, p50: p.p50, p95: p.p95, p99: p.p99, cpuP50: p.cpuP50, cpuP95: p.cpuP95, draws, meshes: app.current.scene.meshes.length };
});

const out = {
  map: 'warehouse',
  enemies: cpu.alive,
  cpu120: { frames: cpu.frames, p50: +cpu.p50.toFixed(3), p95: +cpu.p95.toFixed(3), p99: +cpu.p99.toFixed(3) },
  animPerCharMs: +cpu.animPerCharMs.toFixed(4),
  allocKBPerSimSecond: +(total / 1024 / SIM_S).toFixed(1),
  topAllocators: top,
  drawCalls: real.draws,
  rendered: { hz: real.hz, p50: +real.p50.toFixed(2), p95: +real.p95.toFixed(2), p99: +real.p99.toFixed(2), cpuP50: +real.cpuP50.toFixed(2), cpuP95: +real.cpuP95.toFixed(2) },
};
if (asJson) console.log(JSON.stringify(out));
else {
  console.log(`Warehouse, ${out.enemies} enemies (SwiftShader: GPU numbers not representative)`);
  console.log(`CPU per frame @120 Hz (sim + anim + camera, no render): p50 ${out.cpu120.p50} p95 ${out.cpu120.p95} p99 ${out.cpu120.p99} ms  [budget p95 <= ${BUDGET.cpuP95Ms}]`);
  console.log(`animation per character: ${out.animPerCharMs} ms  [budget <= ${BUDGET.animPerCharMs}]`);
  console.log(`allocations: ${out.allocKBPerSimSecond} KB per simulated second = ${(out.allocKBPerSimSecond / 120).toFixed(1)} KB per 120 Hz frame  [budget <= ${BUDGET.kbPerFrame} KB/frame]`);
  for (const t of top) console.log('   ' + t);
  console.log(`draw calls: ${out.drawCalls}  [budget <= ${BUDGET.drawCalls}]`);
  console.log(`rendered frames: display ${real.hz} Hz, interval p50 ${out.rendered.p50} p95 ${out.rendered.p95} p99 ${out.rendered.p99} ms, cpu p50 ${out.rendered.cpuP50} p95 ${out.rendered.cpuP95} ms`);
}
const real_errors = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
if (real_errors.length) console.log(real_errors.join('\n'));
await browser.close();
const missed = [
  out.cpu120.p95 > BUDGET.cpuP95Ms && 'cpu p95',
  out.animPerCharMs > BUDGET.animPerCharMs && 'anim per character',
  out.drawCalls > BUDGET.drawCalls && 'draw calls',
  out.allocKBPerSimSecond / 120 > BUDGET.kbPerFrame && 'allocations',
].filter(Boolean);
if (missed.length) console.log('over budget: ' + missed.join(', '));
process.exit(enforce && (missed.length || real_errors.length) ? 1 : 0);
