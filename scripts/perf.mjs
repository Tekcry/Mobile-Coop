// Combat performance probe on Warehouse with 10 enemies (120 Hz targets):
//  - CPU per display frame at a simulated 120 Hz (fixed 60 Hz sim + 2 interpolated frame updates), p50/p95/p99
//  - animation cost per character (rig evaluation, ms)
//  - allocations per simulated second (sampling heap profiler, incl. collected objects) + top allocators
//  - draw calls and real rendered frame pacing (SwiftShader: GPU timings are NOT representative)
// Usage: [EXTRA=baked=0] node scripts/perf.mjs [url] [--json] [--budget] [--desktop] [--preset=low|medium|high|ultra|epic [--mobile]]
//   (--budget exits 1 when a CPU-side budget is missed)
//   default: `?gfx=min` - the phone / test-path regression check (the 2.x numbers)
//   --desktop: `?gfx=epic` - the PC path (voxel characters and weapons, shadows, the post stack): main-thread CPU =
//   the sim + the render's JS (active mesh evaluation incl. skinning bones), draw calls and triangles over every pass
//   (shadow maps and post included). GPU time needs the laptop (Settings > Graphics > Benchmark).
//   --preset=<p> (3.1): that preset (`?gfx=<p>`, the governor off), its budget from the phone table below;
//   --mobile with it runs the phone platform (no Epic, no ray tracing).
import { launch, frames } from './e2e-lib.mjs';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const asJson = args.includes('--json');
const enforce = args.includes('--budget');
const preset = args.find((a) => a.startsWith('--preset='))?.slice(9) ?? null;
if (preset && !['low', 'medium', 'high', 'ultra', 'epic'].includes(preset)) throw new Error(`unknown preset ${preset}`);
const mobile = args.includes('--mobile');
const desktop = args.includes('--desktop') || (!!preset && !mobile);
// (the full renderer: slow to load on software GL)
const heavy = desktop || !!preset;
// 3.1 phone budgets per preset (the iPhone 17 Pro Max at Ultra: main thread <= 4 ms of 8.33, <= 250 draws, <= 2 M
// triangles; older phones on the lower presets). The sim's share is checked here, scaled by machine speed.
const PRESET_BUDGET = {
  low: { cpuP95Ms: 2, animPerCharMs: 0.04, drawCalls: 120, trisM: 0.8, kbPerSecond: 11520 },
  medium: { cpuP95Ms: 2, animPerCharMs: 0.04, drawCalls: 170, trisM: 1.2, kbPerSecond: 11520 },
  high: { cpuP95Ms: 2, animPerCharMs: 0.04, drawCalls: 230, trisM: 1.6, kbPerSecond: 11520 },
  ultra: { cpuP95Ms: 2, animPerCharMs: 0.04, drawCalls: 250, trisM: 2, kbPerSecond: 11520 },
  epic: null,
};
// allocations: per second (the same garbage whatever the refresh rate - 240 Hz must not double it). What remains is
// V8 boxing doubles passed to non-inlined calls and Havok's embind marshalling (young-generation churn, nothing kept).
const BUDGET = preset && PRESET_BUDGET[mobile && preset === 'epic' ? 'ultra' : preset]
  ? PRESET_BUDGET[mobile && preset === 'epic' ? 'ultra' : preset]
  : desktop
  ? // 3.0 PC: the main thread <= 3 ms of a 240 Hz frame's 4.17 ms - here the sim's share (<= 2 ms, leaving 1 ms for
    // the render's submission, which only the laptop can time: its benchmark prints the main thread p95; on
    // SwiftShader GL stalls land inside the render's JS). Draws / triangles: the regression check, measured 3.1.0
    // + ~15-25% (444 draws, 1.34 M triangles over every pass incl. shadows; the laptop's GPU budget is 600 / 8 M)
    { cpuP95Ms: 2, animPerCharMs: 0.04, drawCalls: 520, trisM: 1.7, kbPerSecond: 11520 }
  : // the phone-era / test-path check (gfx=min: no post stack, no voxel characters, 20 cm voxels); measured 3.1.0:
    // sim p95 1.5 ms, 43 draws, 0.14 M triangles
    { cpuP95Ms: 2.5, animPerCharMs: 0.04, drawCalls: 55, trisM: 0.2, kbPerSecond: 11520 };

// STEALTH=1: the ten are unaware (stealth rules, patrols / posts, full perception with exposure rays)
const stealth = !!process.env.STEALTH;
// MAP=embassy: the embassy court (the same ten enemies)
const MAP = process.env.MAP ?? 'warehouse';
const { browser, page, errors } = await launch({
  url,
  params: `autostart=${MAP}&mode=${stealth ? 'clear' : 'wave'}&debug=1${preset ? `&gfx=${preset}&platform=${mobile ? 'mobile' : 'desktop'}` : desktop ? '&gfx=epic&platform=desktop' : ''}${process.env.WARM ? '&warm=' + process.env.WARM : ''}${process.env.EXTRA ? '&' + process.env.EXTRA : ''}`,
  ...(desktop ? { touch: false, viewport: { width: 640, height: 360 } } : {}),
});
if (heavy) await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 300000 });
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

// machine speed: a fixed pure-JS workload (vector / quaternion maths over typed arrays, like the anim and nav
// loops). CPU budgets are in reference-machine ms (REF_MS: the workload on the VM the 2.3 budgets were set on) and
// scale by measured / REF_MS, so a slower or busier VM does not fail a build that did not change.
const REF_MS = 3.7;
const calibMs = await page.evaluate(() => {
  const n = 1 << 16;
  const a = new Float64Array(n * 4);
  for (let i = 0; i < a.length; i++) a[i] = Math.sin(i) * 0.5;
  let best = Infinity;
  for (let r = 0; r < 7; r++) {
    const t = performance.now();
    let acc = 0;
    for (let k = 0; k < 12; k++) {
      for (let i = 0; i < n - 1; i++) {
        const o = i * 4;
        const x = a[o], y = a[o + 1], z = a[o + 2], w = a[o + 3];
        const x2 = a[o + 4], y2 = a[o + 5], z2 = a[o + 6], w2 = a[o + 7];
        const qx = w * x2 + x * w2 + y * z2 - z * y2;
        const qw = w * w2 - x * x2 - y * y2 - z * z2;
        acc += Math.sqrt(qx * qx + qw * qw + 1e-9);
        a[o] = x + qx * 1e-6;
      }
    }
    best = Math.min(best, performance.now() - t);
    if (acc === -1) best = -1;
  }
  return best;
});
const speed = calibMs / REF_MS;

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

// real frames (render included): draw calls and triangles over every pass, the render's JS, pacing
const real = await page.evaluate(async (desktop) => {
  const app = window.__app;
  const scene = app.current.scene;
  const engine = app.engine;
  // every draw: triangles (indexed and plain, instanced counted per instance)
  let tris = 0;
  let draws = 0;
  const de = engine.drawElementsType.bind(engine);
  const da = engine.drawArraysType.bind(engine);
  // PASSES=1: draws per render target (shadow maps, post, the main pass)
  const passes = new Map();
  const pass = () => {
    const rt = engine._currentRenderTarget;
    const k = rt ? (rt.label || rt.texture?.name || rt.texture?.label || 'rt') : 'canvas';
    passes.set(k, (passes.get(k) ?? 0) + 1);
  };
  engine.drawElementsType = (fill, start, count, inst) => {
    draws++;
    pass();
    if (fill === 0) tris += (count / 3) * Math.max(1, inst ?? 1);
    return de(fill, start, count, inst);
  };
  engine.drawArraysType = (fill, start, count, inst) => {
    draws++;
    pass();
    if (fill === 0 || fill === 7) tris += (count / 3) * Math.max(1, inst ?? 1);
    return da(fill, start, count, inst);
  };
  // the render's JS: active mesh evaluation (LOD, culling, skeletons / voxel bones)
  let evalMs = 0;
  let evals = 0;
  const t0 = new Map();
  const o1 = scene.onBeforeActiveMeshesEvaluationObservable.add(() => t0.set('e', performance.now()));
  const o2 = scene.onAfterActiveMeshesEvaluationObservable.add(() => {
    evalMs += performance.now() - (t0.get('e') ?? performance.now());
    evals++;
  });
  let frames = 0;
  const o3 = scene.onAfterRenderObservable.add(() => frames++);
  app.quality.stats.clear();
  // (software GL at Epic takes seconds per frame: a few frames are enough)
  const want = desktop ? 3 : 0;
  const t = performance.now();
  await new Promise((res) => {
    const tick = () => (frames >= want && performance.now() - t > 2500 ? res() : setTimeout(tick, 100));
    tick();
  });
  scene.onBeforeActiveMeshesEvaluationObservable.remove(o1);
  scene.onAfterActiveMeshesEvaluationObservable.remove(o2);
  scene.onAfterRenderObservable.remove(o3);
  engine.drawElementsType = de;
  engine.drawArraysType = da;
  const p = app.quality.pacing();
  const n = Math.max(1, frames);
  // (the main pass's active meshes by name, digits stripped)
  const act = new Map();
  for (const m of scene.getActiveMeshes().data.slice(0, scene.getActiveMeshes().length)) {
    const k = m.name.replace(/[0-9]+/g, '#');
    act.set(k, (act.get(k) ?? 0) + 1);
  }
  const byPass = [...passes].map(([k, v]) => [k.replace(/[0-9]+/g, '#'), v]).reduce((m, [k, v]) => m.set(k, (m.get(k) ?? 0) + v), new Map());
  const top = (m) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 16).map(([k, v]) => `${k} ${Math.round(v / (m === byPass ? Math.max(1, frames) : 1))}`).join(', ');
  return { passes: top(byPass), active: top(act), hz: p.hz, p50: p.p50, p95: p.p95, p99: p.p99, cpuP50: p.cpuP50, cpuP95: p.cpuP95, draws: Math.round(draws / n), trisM: tris / n / 1e6, evalMs: evalMs / Math.max(1, evals), frames, meshes: scene.meshes.length };
}, heavy);

const out = {
  map: 'warehouse',
  profile: preset ? `preset ${preset} (${mobile ? 'phone' : 'desktop'})` : desktop ? 'desktop (gfx=epic)' : 'test path (gfx=min)',
  enemies: cpu.alive,
  cpu120: { frames: cpu.frames, p50: +cpu.p50.toFixed(3), p95: +cpu.p95.toFixed(3), p99: +cpu.p99.toFixed(3) },
  // the main thread per frame: the sim's p95 + the render's JS (mesh evaluation, bones)
  mainP95: +(cpu.p95 + real.evalMs).toFixed(3),
  renderJsMs: +real.evalMs.toFixed(3),
  trisM: +real.trisM.toFixed(2),
  animPerCharMs: +cpu.animPerCharMs.toFixed(4),
  allocKBPerSimSecond: +(total / 1024 / SIM_S).toFixed(1),
  topAllocators: top,
  drawCalls: real.draws,
  rendered: { hz: real.hz, p50: +real.p50.toFixed(2), p95: +real.p95.toFixed(2), p99: +real.p99.toFixed(2), cpuP50: +real.cpuP50.toFixed(2), cpuP95: +real.cpuP95.toFixed(2) },
};
if (asJson) console.log(JSON.stringify(out));
else {
  console.log(`Warehouse, ${out.enemies} enemies, ${out.profile} (SwiftShader: GPU numbers not representative)`);
  console.log(`machine speed: reference workload ${calibMs.toFixed(1)} ms vs ${REF_MS} -> CPU budgets x${speed.toFixed(2)}`);
  console.log(`CPU per frame @120 Hz (sim + anim + camera, no render): p50 ${out.cpu120.p50} p95 ${out.cpu120.p95} p99 ${out.cpu120.p99} ms`);
  console.log(`sim p95 ${out.cpu120.p95} ms  [budget <= ${(BUDGET.cpuP95Ms * speed).toFixed(2)} = ${BUDGET.cpuP95Ms} x speed]; render JS ${out.renderJsMs} ms (info: GPU stalls of software GL land in it; the laptop's benchmark gives the real main thread)`);
  console.log(`animation per character: ${out.animPerCharMs} ms  [budget <= ${(BUDGET.animPerCharMs * speed).toFixed(4)} = ${BUDGET.animPerCharMs} x speed]`);
  console.log(`allocations: ${out.allocKBPerSimSecond} KB per simulated second (${(out.allocKBPerSimSecond / 240).toFixed(1)} KB per 240 Hz frame)  [budget <= ${BUDGET.kbPerSecond} KB/s]`);
  for (const t of top) console.log('   ' + t);
  console.log(`draw calls (every pass): ${out.drawCalls}  [budget <= ${BUDGET.drawCalls}]`);
  if (process.env.PASSES) console.log(`  per pass: ${real.passes}\n  active meshes: ${real.active}`);
  console.log(`triangles (every pass): ${out.trisM} M  [budget <= ${BUDGET.trisM} M]`);
  console.log(`rendered frames: display ${real.hz} Hz, interval p50 ${out.rendered.p50} p95 ${out.rendered.p95} p99 ${out.rendered.p99} ms, cpu p50 ${out.rendered.cpuP50} p95 ${out.rendered.cpuP95} ms`);
}
const real_errors = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
if (real_errors.length) console.log(real_errors.join('\n'));
await browser.close();
const missed = [
  out.cpu120.p95 > BUDGET.cpuP95Ms * speed && 'sim p95',
  out.animPerCharMs > BUDGET.animPerCharMs * speed && 'anim per character',
  out.drawCalls > BUDGET.drawCalls && 'draw calls',
  out.trisM > BUDGET.trisM && 'triangles',
  out.allocKBPerSimSecond > BUDGET.kbPerSecond && 'allocations',
].filter(Boolean);
if (missed.length) console.log('over budget: ' + missed.join(', '));
process.exit(enforce && (missed.length || real_errors.length) ? 1 : 0);
