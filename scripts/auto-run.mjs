// The automated run (docs/RULES.md rule 7; build-first queue item 1): one quick hidden check of the playable game, run on
// every change to the game before its pull request merges. Built from the existing play tests (e2e-net-lib's lobby
// join, e2e-ctcourse's leg-up and avatar checks, the A2 spotted restart, perf.mjs's frame reads):
//   1. loads: a fresh build (`npm run build`, skipped with --no-build) served by `vite preview`, two pages reach the menu;
//   2. join: the host opens a co-op room through the menus, the partner joins by its code, Marlow Yard starts on both
//      pages, each page draws the other player;
//   3. looks: lights on, shadow maps live, screenshots of both players' views (textured materials are counted, report
//      only until the textures step makes them a check);
//   4. team move: in A1 the partner crouches and offers a leg-up, the host takes it, hangs on the 4.4 m lip and climbs up;
//   5. spotted and retry: back to the lobby, the match restarts at A2 (station 3); the partner steps into the lit neck in
//      front of the guard, who sees them, and the station retries (both pages count it, both players back on the station's
//      marks, LANTERN's line on both, the guard calm at his post), then the retry plays on: nobody is seen again and the
//      host holds the roller door up;
//   6. frame rate: each page's frames per second and frame times in A1 and A2, compared with the last run on this PC.
// Laptop defaults (N8): hidden, on the GPU through Edge (`E2E_GPU=1`, `E2E_BROWSER`), the frame-rate cap off
// (`E2E_UNCAP=1`) so the number is the real rate; never a visible window. Any env var already set wins.
// Output: <out>/<date>-<sha>/ (report.md for the pull request, report.json, screenshots); <out>/history.jsonl keeps every
// run's numbers for the comparison. <out> defaults to `auto-run` beside the checkout (shared by the worktrees).
// Usage: npm run auto-run [-- --no-build] [--url=http://127.0.0.1:4173/] [--out=<dir>]
// Exit code: 0 every check passed, 1 a check failed (blocks the merge), 2 the run could not start.
import { spawn, spawnSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve, relative } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
// (set before e2e-lib loads: it reads them at import)
if (process.platform === 'win32') {
  process.env.E2E_GPU ??= '1';
  if (!process.env.E2E_BROWSER && existsSync(EDGE)) process.env.E2E_BROWSER = EDGE;
}
process.env.E2E_UNCAP ??= '1';
delete process.env.E2E_HEADED;
const { launch, openPage, GPU } = await import('./e2e-lib.mjs');
const { until, waitSim, setSimPages, LOAD_MS } = await import('./e2e-net-lib.mjs');

const args = process.argv.slice(2);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const PORT = Number(process.env.E2E_PORT ?? 4191);
const URL0 = opt('url') ?? `http://127.0.0.1:${PORT}/`;
const OUT_ROOT = resolve(opt('out') ?? join(ROOT, '..', 'auto-run'));
const PARAMS = 'net=local&ctxprompts=0&gfx=high';
const VIEW = { width: 1280, height: 720 };
/** Marlow Yard (the co-op prologue): the lobby's map; a room on it always opens the re-planned yard (`roomMap`, stage J). */
const MAP = 'ctcourse';
const MAP_ID = 'ctcourseReplan';
/** A1 the Gate: the striped mark under the yard wall (e2e-ctcourse/replan/a1Gate.mjs, station 1). */
const MARK = [10.8, 6];
/** A2 the Carriage Shed (e2e-ctcourse/replan/a2CarriageShed.mjs): station 3's marks (host, partner), in front of the shunter
 *  in the lit neck (seen), the roller door's hold point and its stores-side standing spot. */
const MARK3 = [[31.0, 11.5], [31.0, 13.0]];
const SEEN = [54, 10];
const HOLD = 'c-a2-shutter-hold';
const HOLD_STORES = [32.2, 10.6];
const GATE_SHUTTER = 'g-a2-shutter';
/** Frame-rate drop (vs the last run) that the report flags: identical runs differ by about 10% (2026-11-02, four runs). */
const DROP_FLAG = 0.2;

const git = (cmd) => { try { return execSync(`git ${cmd}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'unknown'; } };
const sha = git('rev-parse --short HEAD');
const branch = git('rev-parse --abbrev-ref HEAD');
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
const RUN_DIR = join(OUT_ROOT, `${stamp}-${sha}`);
mkdirSync(RUN_DIR, { recursive: true });

const log = (...a) => console.log('[auto-run]', ...a);
const t0 = Date.now();
/** Every check: stage, what, ok, detail. */
const checks = [];
/** Frame-rate samples by place. */
const frames = {};
/** Render proof numbers by place. */
const looks = {};
const shots = [];
let stage = 'start';
function check(ok, what, detail = '') {
  checks.push({ stage, what, ok: !!ok, detail });
  console.log(`  ${ok ? 'ok' : 'FAIL'} - ${what}${detail ? ` (${detail})` : ''}`);
  if (!ok) throw new Error(`${what}${detail ? ` (${detail})` : ''}`);
}
/** Runs a stage; a failure is recorded and the run carries on unless `critical`. */
async function runStage(name, fn, critical = false) {
  stage = name;
  log(`-- ${name}`);
  const s = Date.now();
  try {
    await fn();
    return true;
  } catch (e) {
    const msg = String(e?.message ?? e).split('\n')[0];
    if (!checks.some((c) => c.stage === name && !c.ok)) checks.push({ stage: name, what: 'stage ran to the end', ok: false, detail: msg });
    console.log(`  FAIL - ${name}: ${msg}`);
    if (critical) throw new Error(`stopped: ${name} failed`);
    return false;
  } finally {
    log(`   ${name}: ${((Date.now() - s) / 1000).toFixed(1)} s`);
  }
}

// ---- build and serve ----
if (!args.includes('--no-build') && !opt('url')) {
  log('building (npm run build) ...');
  const b = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32', windowsHide: true });
  if (b.status !== 0) {
    console.error('auto-run: the build failed');
    process.exit(2);
  }
}
if (!opt('url') && !existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('auto-run: no dist/ (run without --no-build, or `npm run build` first)');
  process.exit(2);
}
const server = opt('url') ? null : spawn(process.execPath, [join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, windowsHide: true, stdio: 'ignore' });
let browser = null;
const stop = () => { try { server?.kill(); } catch { /* gone */ } };
process.on('exit', stop);
const killer = setTimeout(async () => {
  console.error('auto-run: timed out after 15 min');
  try { await browser?.close(); } catch { /* gone */ }
  stop();
  process.exit(2);
}, 15 * 60_000);
let up = false;
for (let i = 0; i < 80 && !up; i++) {
  try { up = (await fetch(URL0)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
if (!up) {
  console.error(`auto-run: the server at ${URL0} did not answer`);
  process.exit(2);
}

// ---- page helpers ----
let A = null;
let B = null;
let eA = [];
let eB = [];
const GA = (f, a) => A.evaluate(f, a);
const GB = (f, a) => B.evaluate(f, a);
const pages = () => [A, B];

/** The host sets the mode, map and start set, the partner readies, the match starts on both pages; damage off. */
async function startMatch(bay) {
  await GA(([m, mp, bay]) => { const s = window.__coop.session; s.setSettings(m, mp, 'normal'); s.courseBay = bay; }, ['course', MAP, bay]);
  await GB(() => window.__coop.session.setReady(true));
  await until(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready');
  await GA(() => window.__coop.session.startMatch());
  for (const [P, tag] of [[A, 'host'], [B, 'partner']]) await until(P, (id) => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && window.__app.current.opts.map?.id === id && !window.__app.current.isEnded, MAP_ID, LOAD_MS, `Marlow Yard running on the ${tag}'s page`);
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state) && !!window.__course?.state, null, 20000, 'the host runs the course with the partner in it');
  await until(B, () => !!window.__course?.wire, null, 30000, 'the partner has the course state');
  // the spawn's 2 s protection ends at damageMul 1: wait it out, then nobody can be hurt (the run checks the flow, not the damage)
  await waitSim(2200);
  await noDamage();
}
const noDamage = () => GA(() => { const g = window.__app.current; g.target.damageMul = 0; for (const r of g.net.remotes.values()) r.damageMul = 0; });
async function toLobby() {
  await GA(() => window.__coop.backToLobby());
  for (const P of pages()) await until(P, () => !!document.querySelector('.lobby-screen') && !window.__coop.inGame, null, 15000, 'both back in the lobby');
}
async function moveHost(x, z, y = 0.1, yaw = Math.PI / 2) {
  await GA(([x, z, y, yaw]) => { const g = window.__app.current; g.team.end(true); g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw); }, [x, z, y, yaw]);
  await until(A, ([x, z]) => { const f = window.__course.state.feet; return Math.hypot(f[0] - x, f[2] - z) < 0.4; }, [x, z], 15000, `the course sees the host at ${x}, ${z}`);
}
async function moveClient(x, z, y = 0.1, yaw = Math.PI / 2) {
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
  await GB(([x, z, y, yaw]) => { const g = window.__app.current; g.team.end(true); g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw); }, [x, z, y, yaw]);
  await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; const f = window.__course.state.feet; return Math.hypot(r.feet.x - x, r.feet.z - z) < 0.4 && Math.hypot(f[3] - x, f[5] - z) < 0.4; }, [x, z], 15000, `the host sees the partner at ${x}, ${z}`);
}
// real pad buttons (e2e-ctcourse B2): RB the co-op action, B crouch, Y climb; held until the page saw it
const RB = 5;
async function holdUntil(P, btn, cond, what, arg, timeout = 20000) {
  await P.evaluate((b) => window.__pad.set(b, 1), btn);
  try {
    await until(P, cond, arg, timeout, what);
  } finally {
    await P.evaluate((b) => window.__pad.set(b, 0), btn);
  }
}
/** (e2e-ctcourse use) Use a course item on page P as its own player would. */
const use = (P, id) =>
  P.evaluate((id) => {
    const it = window.__app.current.interactables?.items.find((i) => i.id === id);
    if (!it) return 'missing';
    if (!it.enabled) return 'disabled';
    it.onUse(it, 'local');
    return 'ok';
  }, id);
const padReady = (P) => P.evaluate(() => { window.__pad.connect(); for (let i = 0; i < 4; i++) window.__pad.axis(i, 0); for (let i = 0; i < 17; i++) window.__pad.set(i, 0); window.__app.current.player.controller.clearCrouchToggle(); });

/** (e2e-ctcourse avatarDrawn) Is the other player's character drawn on page P: meshes enabled and visible with real bounds. */
const avatarDrawn = (P, side) =>
  P.evaluate(async (side) => {
    const g = window.__app.current;
    const a = side === 'partner' ? g.net.avatars.values().next().value : g.net.remotes.values().next().value.avatar;
    const c = g.player.cam;
    const was = [c.yaw, c.pitch];
    if (side === 'partner') {
      c.yaw = Math.atan2(a.pos.x - g.player.position.x, a.pos.z - g.player.position.z);
      c.pitch = 0;
      await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 3000); });
    }
    const cam = g.scene.activeCamera;
    const r = a.rig.root;
    r.computeWorldMatrix(true);
    const ms = a.figure.renderMeshes.filter((m) => m.isEnabled());
    const act = new Set(g.scene.getActiveMeshes().data);
    const info = ms.map((m) => {
      m.computeWorldMatrix(true);
      return { vis: m.isVisible && m.visibility > 0, active: act.has(m), inFrustum: cam.isInFrustum(m), size: m.getBoundingInfo().boundingBox.extendSizeWorld.length() };
    });
    if (side === 'partner') [c.yaw, c.pitch] = was;
    const ok = [r.position.x, r.position.y, r.position.z].every(Number.isFinite) && r.isEnabled() && ms.length > 0 && info.every((i) => i.vis) && info.some((i) => i.size > 0.5);
    return { ok, meshes: ms.length, inView: info.some((i) => i.inFrustum && i.active) };
  }, side);

/** Turn page P's camera (level) toward the other player (a little to one side, so the near player's own body does not
 *  hide them), or toward `at` ([x, z]), let it draw, save a screenshot. */
async function shot(P, name, at = null) {
  await P.evaluate(async (at) => {
    const g = window.__app.current;
    const o = at ? { x: at[0], z: at[1] } : g.net.avatars?.size ? g.net.avatars.values().next().value.pos : g.net.remotes.values().next().value.feet;
    const c = g.player.cam;
    c.yaw = Math.atan2(o.x - g.player.position.x, o.z - g.player.position.z) + (at ? 0 : 0.35);
    c.pitch = 0;
    await new Promise((r) => { let n = 0; const f = () => (++n >= 10 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); setTimeout(r, 3000); });
  }, at);
  const file = `${name}.png`;
  await P.screenshot({ path: join(RUN_DIR, file) });
  shots.push(file);
  console.log(`  shot ${file}`);
}

/** Lights, shadow maps and surface textures in page P's scene (the render proof numbers). The character shadow maps fill
 *  their caster lists per frame (`charShadows.ts`), so the casters are counted as each map renders, over about a second. */
const renderProof = (P) =>
  P.evaluate(async () => {
    const scene = window.__app.current.scene;
    const lights = scene.lights.filter((l) => l.isEnabled() && l.intensity > 0);
    const gens = scene.lights.map((l) => l.getShadowGenerator?.()).filter(Boolean);
    let casters = 0;
    let rendered = 0;
    const obs = gens.map((sg) => {
      const map = sg.getShadowMap();
      // (charShadows / torchShadows hand their casters through `getCustomRenderList`; the lamp rig fills `renderList`)
      return [map, map?.onBeforeRenderObservable.add(() => { rendered++; casters = Math.max(casters, (map.getCustomRenderList?.(0, map.renderList, map.renderList?.length ?? 0) ?? map.renderList)?.length ?? 0); })];
    });
    await new Promise((r) => setTimeout(r, 1200));
    for (const [map, o] of obs) if (map && o) map.onBeforeRenderObservable.remove(o);
    const mats = new Set();
    for (const m of scene.getActiveMeshes().data.slice(0, scene.getActiveMeshes().length)) if (m.material) mats.add(m.material);
    // (textures N51) a material is textured when it wears the generated surfaces (`SurfacePlugin`, 'Surfaces') or an image
    const gen = (m) => { const p = m.pluginManager?.getPlugin?.('Surfaces'); return !!p && p._isEnabled !== false; };
    const surface = (m) => gen(m) || !!(m.albedoTexture || m.diffuseTexture || m.baseTexture || m.subMaterials?.some((s) => s && (s.albedoTexture || s.diffuseTexture)));
    const textured = [...mats].filter(surface).length;
    const levelTextured = [...mats].some((m) => /^levelMat-/.test(m.name) && gen(m));
    return { lights: lights.length, shadowMaps: gens.length, shadowRenders: rendered, shadowCasters: casters, levelTextured, materials: mats.size, texturedMaterials: textured, meshes: scene.meshes.length };
  });

/** Frames per second and frame times on page P over `ms` of real time (its own frame stats, perf.mjs's draw count). */
async function sampleFrames(P, tag, ms = 4000) {
  await P.bringToFront();
  await new Promise((r) => setTimeout(r, 600));
  const f = await P.evaluate(async (ms) => {
    const app = window.__app;
    const scene = app.current.scene;
    const engine = app.engine;
    let draws = 0;
    const de = engine.drawElementsType.bind(engine);
    const da = engine.drawArraysType.bind(engine);
    engine.drawElementsType = (...a) => { draws++; return de(...a); };
    engine.drawArraysType = (...a) => { draws++; return da(...a); };
    let n = 0;
    const o = scene.onAfterRenderObservable.add(() => n++);
    app.quality.stats.clear();
    const t = performance.now();
    await new Promise((r) => setTimeout(r, ms));
    const el = performance.now() - t;
    scene.onAfterRenderObservable.remove(o);
    engine.drawElementsType = de;
    engine.drawArraysType = da;
    const p = app.quality.pacing();
    return { fps: +(n / (el / 1000)).toFixed(1), frameP50: +p.p50.toFixed(2), frameP95: +p.p95.toFixed(2), cpuP95: +p.cpuP95.toFixed(2), draws: Math.round(draws / Math.max(1, n)) };
  }, ms);
  frames[tag] = f;
  console.log(`  ${tag}: ${f.fps} fps, frame p50 ${f.frameP50} ms, p95 ${f.frameP95} ms, cpu p95 ${f.cpuP95} ms, ${f.draws} draws`);
}

// ---- the run ----
const realErr = (es) => es.filter((e) => !/GPU stall|swiftshader|Automatic fallback|AudioContext|Failed to load resource|GL Driver Message/i.test(e));
try {
  await runStage('Loads', async () => {
    const l = await launch({ url: URL0, params: PARAMS, viewport: VIEW });
    browser = l.browser;
    A = l.page;
    eA = l.errors;
    const o = await openPage(l.ctx, URL0, PARAMS);
    B = o.page;
    eB = o.errors;
    for (const [P, tag] of [[A, 'host'], [B, 'partner']]) {
      await until(P, () => !!document.querySelector('.main-menu .btn'), null, LOAD_MS, `the main menu on the ${tag}'s page`);
      check(true, `the game loads to the main menu (${tag})`);
    }
    const gl = await GA(() => { const e = window.__app.engine; const gl = e._gl; const x = gl?.getExtension('WEBGL_debug_renderer_info'); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : e.getGlInfo?.().renderer ?? '?'; });
    looks.gpu = gl;
    check(!GPU || !/swiftshader/i.test(gl), 'drawn on the graphics card, not software', gl);
  }, true);

  await runStage('Join', async () => {
    await A.click('.main-menu .btn:has-text("Co-op")');
    await A.click('.btn:has-text("Host a room")');
    await until(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 15000, 'the host lobby');
    const code = await GA(() => window.__coop.session.code);
    await B.click('.main-menu .btn:has-text("Co-op")');
    await B.click('.btn:has-text("Join with code")');
    await B.keyboard.type(code.toLowerCase());
    await B.keyboard.press('Enter');
    await until(A, () => window.__coop.session.players.size === 2, null, 15000, 'the host sees the partner in the room');
    check(true, `the partner joins the host's room by its code (${code})`);
    setSimPages([A, B]);
    await startMatch(1);
    check(true, 'Marlow Yard starts on both pages (A1, the Gate)');
    await until(B, () => window.__app.current.net.avatars.size === 1 && window.__app.current.net.avatars.values().next().value.figure.current >= 0, null, 20000, 'the host character on the partner page');
    await until(A, () => window.__app.current.net.remotes.values().next().value.avatar.figure.current >= 0, null, 20000, 'the partner character on the host page');
    // both in the lounge, two metres apart, facing the yard
    await moveHost(2, 10);
    await moveClient(2, 12);
    const onB = await avatarDrawn(B, 'partner');
    check(onB.ok && onB.inView, 'the partner sees the host', JSON.stringify(onB));
    const onA = await avatarDrawn(A, 'host');
    check(onA.ok, 'the host sees the partner', JSON.stringify(onA));
    const obj = await GB(() => window.__app.current.hud.objectiveText);
    check(!/Connecting to host|Waiting for host/.test(obj), 'the partner is in the game, not waiting', obj);
  }, true);

  await runStage('Looks', async () => {
    const p = await renderProof(A);
    looks.a1 = p;
    console.log(`  A1 (host view): ${JSON.stringify(p)}`);
    check(p.lights >= 1, 'lights are on', `${p.lights} lights`);
    check(p.shadowMaps >= 1 && p.shadowRenders > 0 && p.shadowCasters > 0, 'shadow maps draw the characters', `${p.shadowMaps} maps, ${p.shadowRenders} renders, up to ${p.shadowCasters} casters`);
    check(p.levelTextured, 'the level wears its textures', `${p.texturedMaterials} of ${p.materials} materials in view textured`);
    await shot(A, 'a1-host-view');
    await shot(B, 'a1-partner-view');
    await sampleFrames(A, 'A1 host');
    await sampleFrames(B, 'A1 partner');
  });

  await runStage('Team move', async () => {
    // (e2e-ctcourse legUp) the partner on the striped mark crouches and offers, the host 0.8 m behind takes the leg-up
    await moveClient(MARK[0], MARK[1]);
    await moveHost(MARK[0] - 0.8, MARK[1]);
    await waitSim(500);
    await padReady(B);
    await padReady(A);
    await until(B, () => !window.__app.current.player.controller.crouched, null, 3000, 'the partner stands first').catch(() => {});
    await holdUntil(B, 1, () => window.__app.current.player.controller.crouched, 'the partner crouches');
    await waitSim(150);
    await holdUntil(B, RB, () => window.__app.current.team.state === 'offer', 'the partner offers a leg-up');
    check(true, 'the partner crouches and offers a leg-up');
    await until(A, () => !!window.__app.current.team.offer?.boost, null, 8000, 'the host is offered the leg-up');
    const boosts0 = await GA(() => window.__app.current.team.count.boosts);
    await holdUntil(A, RB, (n) => window.__app.current.team.count.boosts > n, 'the host takes the leg-up', boosts0);
    await until(A, () => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.kind === 'ledge', null, 12000, 'the host hangs on the ledge');
    const top = await GA(() => window.__app.current.traversal.attach.anchor.top);
    check(top >= 4.3 && top <= 4.5, 'the leg-up lifts the host to the 4.4 m wall lip', `${top.toFixed(2)} m`);
    await until(B, () => window.__app.current.team.state === 'none', null, 20000, 'the partner is free again');
    await holdUntil(A, 3, () => !window.__app.current.traversal.attached, 'the host pulls up');
    await until(A, () => window.__app.current.player.controller.grounded, null, 30000, 'the host stands on the wall top');
    const y = await GA(() => window.__app.current.player.controller.pos.y);
    check(y > 4.2, 'the host climbs onto the wall top', `${y.toFixed(2)} m`);
    await shot(B, 'a1-after-leg-up-partner-view');
  });

  await runStage('Spotted and retry', async () => {
    await toLobby();
    await startMatch(2);
    check((await GA(() => window.__course.debug().bay)) === 1, 'the match restarts at A2, the Carriage Shed');
    // (e2e-ctcourse/replan/a2CarriageShed.mjs steps 0-2) station 3: one calm guard (the shunter) at his post in the lit neck
    const shunter = () => GA(() => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive); return e ? { x: +e.pos.x.toFixed(2), z: +e.pos.z.toFixed(2), alerted: !!e.alerted, passive: !!e.passive } : null; });
    const restarts = (P) => P.evaluate(() => window.__course.restarts);
    await moveHost(MARK3[0][0], MARK3[0][1]);
    await moveClient(MARK3[1][0], MARK3[1][1]);
    for (const [P, tag] of [[A, 'host'], [B, 'partner']]) await until(P, () => window.__course.station() === 3, null, 15000, `station 3 live on the ${tag}'s page`);
    const g0 = await shunter();
    check(!!g0 && !g0.alerted && !g0.passive && Math.hypot(g0.x - 51, g0.z - 10) < 2.5, 'a calm armed guard at his post in the lit neck', JSON.stringify(g0));
    // (the stores bay is dark: the views face the guard in the lit neck)
    await shot(B, 'a2-start-partner-view', [51, 10]);
    await sampleFrames(A, 'A2 host');
    await sampleFrames(B, 'A2 partner');
    looks.a2 = await renderProof(A);
    await noDamage();
    const r0 = await restarts(A);
    // the partner steps into the lit neck in front of the guard
    await moveClient(SEEN[0], SEEN[1], 0.1, -Math.PI / 2);
    await until(A, (r0) => window.__course.restarts === r0 + 1, r0, 45000, 'the guard sees the partner and the station retries (host)');
    await until(B, (r0) => window.__course.restarts === r0 + 1, r0, 15000, 'the partner counts the retry');
    const lr = [await GA(() => window.__course.lastRetry), await GB(() => window.__course.lastRetry)];
    check(lr.every((l) => l?.st === 3 && l?.cause === 'seen'), 'the guard sees the partner in the lit neck: a retry of station 3 on both pages', JSON.stringify(lr));
    await until(A, (m) => { const f = window.__course.state.feet; return m.every(([x, z]) => [0, 1].some((p) => Math.hypot(f[p * 3] - x, f[p * 3 + 2] - z) < 1.2)); }, MARK3, 20000, "the retry puts both players on station 3's marks");
    check(true, "both players are back on station 3's marks");
    await until(A, () => /Seen at the roller door/.test(window.__course.radioLine ?? ''), null, 15000, "the radio line on the host");
    await until(B, () => /Seen at the roller door/.test(window.__course.wire.rl ?? ''), null, 15000, 'the radio line on the partner');
    check(true, "both players hear LANTERN's line ('Seen at the roller door')");
    await waitSim(1500);
    await noDamage();
    await until(A, () => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive); return !!e && !e.alerted && Math.hypot(e.pos.x - 51, e.pos.z - 10) < 2.5; }, null, 15000, 'the guard fresh at his post');
    check(true, 'the retry starts with the guard calm at his post again');
    await shot(B, 'a2-after-retry-partner-view', [51, 10]);
    // the retry plays on: nobody is seen again, and the host holds the roller door up (the station's two-person job)
    await waitSim(3000);
    check((await restarts(A)) === r0 + 1, 'the retry plays on: nobody is seen again', `retries ${r0} -> ${await restarts(A)}`);
    await moveHost(HOLD_STORES[0], HOLD_STORES[1]);
    check((await use(A, HOLD)) === 'ok', 'after the retry the host can hold the roller door');
    await until(A, (id) => window.__course.state.isGateOpen(id), GATE_SHUTTER, 10000, 'the roller door gate opens while held');
    const door = await GA(() => { const g = window.__app.current; const aid = g.world.layout.course.doors['A2-shutter']; return { aid, i: g.world.doors.list.find((d) => d.anchor.id === aid).index }; });
    check((await use(A, `door-${door.aid}`)) === 'ok', 'the host lifts the held roller door');
    for (const [P, tag] of [[A, 'host'], [B, 'partner']]) await until(P, (i) => window.__app.current.world.doors.list[i].open > 0.5, door.i, 15000, `the roller door open on the ${tag}'s page`);
    check(true, 'the roller door opens on both pages while the host holds it');
    await shot(B, 'a2-door-held-partner-view', [51, 10]);
  });

  await runStage('No errors', async () => {
    const ea = realErr(eA).filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
    const eb = realErr(eB).filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
    check(ea.length === 0, 'no errors on the host page', ea.slice(0, 3).join(' | '));
    check(eb.length === 0, 'no errors on the partner page', eb.slice(0, 3).join(' | '));
  });
} catch (e) {
  console.log(`  ${e.message}`);
}
try { await browser?.close(); } catch { /* gone */ }
stop();
clearTimeout(killer);

// ---- report ----
const failed = checks.filter((c) => !c.ok);
const histFile = join(OUT_ROOT, 'history.jsonl');
/** Per place, the last run that measured it: { fps, sha }. */
const prev = {};
if (existsSync(histFile)) {
  const lines = readFileSync(histFile, 'utf8').trim().split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const h = JSON.parse(lines[i]);
      for (const [k, f] of Object.entries(h.frames ?? {})) prev[k] ??= { fps: f.fps, sha: h.sha };
    } catch { /* a bad line */ }
  }
}
const seconds = Math.round((Date.now() - t0) / 1000);
const run = { date: new Date().toISOString(), sha, branch, gpu: looks.gpu ?? '?', passed: failed.length === 0, seconds, frames, looks: { a1: looks.a1, a2: looks.a2 }, checks: checks.length, failed: failed.length };
appendFileSync(histFile, JSON.stringify(run) + '\n');
writeFileSync(join(RUN_DIR, 'report.json'), JSON.stringify({ ...run, checks }, null, 2));

const pct = (now, was) => (was ? `${now >= was ? '+' : ''}${(((now - was) / was) * 100).toFixed(0)}%` : 'n/a');
const md = [];
md.push(`## Automated run: ${failed.length === 0 ? 'PASSED' : `FAILED (${failed.length} of ${checks.length} checks)`}`);
md.push('');
md.push(`Commit \`${sha}\` (${branch}), ${run.date.slice(0, 16).replace('T', ' ')} UTC, ${seconds} s, ${looks.gpu ?? 'unknown GPU'}, hidden.`);
md.push('');
md.push('| Stage | Check | Result |');
md.push('|---|---|---|');
for (const c of checks) md.push(`| ${c.stage} | ${c.what}${c.detail && !c.ok ? `: ${c.detail.replace(/\|/g, '/')}` : ''} | ${c.ok ? 'pass' : '**FAIL**'} |`);
md.push('');
md.push('Frame rate, compared with the last run that measured each place. Both players\' games run at once on this one PC with');
md.push(`the frame cap off, so these are numbers to compare builds, not what a player sees; identical runs differ by about 10%,`);
md.push(`so only a drop over ${DROP_FLAG * 100}% is flagged.`);
md.push('');
md.push('| Place | fps | last run | change | frame p95 ms | cpu p95 ms | draws |');
md.push('|---|---|---|---|---|---|---|');
const flagged = [];
for (const [k, f] of Object.entries(frames)) {
  const was = prev[k];
  const ch = was ? pct(f.fps, was.fps) : 'first run';
  if (was && f.fps < was.fps * (1 - DROP_FLAG)) flagged.push(k);
  md.push(`| ${k} | ${f.fps} | ${was ? `${was.fps} (\`${was.sha}\`)` : '-'} | ${ch} | ${f.frameP95} | ${f.cpuP95} | ${f.draws} |`);
}
if (flagged.length) md.push('', `**Frame-rate drop over ${DROP_FLAG * 100}%:** ${flagged.join(', ')}.`);
md.push('');
if (looks.a1) md.push(`Render proof (host view): A1 ${looks.a1.lights} lights, ${looks.a1.shadowMaps} shadow maps (${looks.a1.shadowCasters} casters), ${looks.a1.texturedMaterials} of ${looks.a1.materials} materials textured${looks.a2 ? `; A2 ${looks.a2.lights} lights, ${looks.a2.shadowMaps} shadow maps (${looks.a2.shadowCasters} casters), ${looks.a2.texturedMaterials} of ${looks.a2.materials} materials textured` : ''}.`);
md.push('');
md.push(`Screenshots (${relative(ROOT, RUN_DIR) || RUN_DIR}): ${shots.join(', ') || 'none'}.`);
writeFileSync(join(RUN_DIR, 'report.md'), md.join('\n') + '\n');
console.log('\n' + md.join('\n'));
log(`report: ${join(RUN_DIR, 'report.md')}`);
process.exit(failed.length === 0 && checks.length > 0 ? 0 : 1);
