// coop-fix diagnosis 2 (docs/archive/coop-fix/DIAGNOSIS-2.md): is the host's character drawn on the joiner after the REAL menu
// flow (no `?autostart`): title (`?title=1`, pressed) -> boot / load gate -> main menu -> Co-op -> Host a room / Join with
// code -> lobby -> Ready -> Start mission (Marlow Yard, Course mode). Transport: `?net=local` (the menu flow reads
// `flags.net` without autostart: coopUi.openTransport); WebRTC needs the public relays, so it is not run here.
//
// Two variants, each in its own headless browser:
//   shared   - both pages in ONE context (shared IndexedDB / localStorage / BroadcastChannel: two windows of one profile)
//   separate - one context per page (no shared storage); the local transport's BroadcastChannel is relayed through Node
// Both pages' sims are kept running (a pump steps a page headless whenever its rAF did not advance; the measured page is
// brought to front and rendered), so the background-page rAF stall is not the cause of what is measured.
//
// Serves dist/ itself (vite preview, 127.0.0.1, windowsHide). Needs a prior `npm run build`. Headless only, fake pointer
// lock (e2e-lib). Exit 0 with a JSON summary on stdout (last line); 2 on a setup failure.
// Usage (repo root): E2E_PORT=4191 timeout 900 node scripts/repro-coop-avatar.mjs [shared|separate|both] [outDir]
//   REPRO_GFX=min (default; LOD2 only) | high | epic (LOD0 / LOD1 / LOD2 load: the LOD bands are exercised; with E2E_GPU=1
//   on Michael's PC, port 4189).
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { launchOptions, fakePointerLock, openPage } from './e2e-lib.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const [which = 'both', outDir = ''] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4191);
const URL0 = `http://127.0.0.1:${PORT}/`;
const GFX = process.env.REPRO_GFX ?? 'min';
const PARAMS = `net=local&title=1&gfx=${GFX}`;
const VIEW = { width: 1280, height: 720 };
const DISTANCES = [3, 12, 30];

const log = (...a) => console.error('[repro]', ...a);
const server = spawn(process.execPath, [`${ROOT}node_modules/vite/bin/vite.js`, 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, windowsHide: true, stdio: 'ignore' });
const browsers = [];
const stop = () => { try { server.kill(); } catch { /* gone */ } };
process.on('exit', stop);
const fail = async (msg) => {
  console.error(`repro-coop-avatar: ${msg}`);
  for (const b of browsers) { try { await b.close(); } catch { /* gone */ } }
  stop();
  process.exit(2);
};
const kill = setTimeout(() => fail('timed out after 900 s'), 900_000);

let up = false;
for (let i = 0; i < 80 && !up; i++) {
  try { up = (await fetch(URL0)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
if (!up) await fail('preview server did not start (run `npm run build` first; is the port free?)');
if (outDir) mkdirSync(outDir, { recursive: true });

// ---- page-side helpers ----

/** (separate contexts) BroadcastChannel for the room (`ss-room-*`) relayed through Node; any other name stays native. */
function relayInit() {
  const Native = window.BroadcastChannel;
  const chans = new Map();
  window.__relayIn = (name, data) => {
    for (const c of chans.get(name) ?? []) { try { c.onmessage?.({ data }); } catch (e) { console.error('relay handler', e); } }
  };
  window.BroadcastChannel = class {
    constructor(name) {
      if (!String(name).startsWith('ss-room-')) return new Native(name);
      this.name = name;
      this.onmessage = null;
      if (!chans.has(name)) chans.set(name, new Set());
      chans.get(name).add(this);
    }
    postMessage(d) {
      // same page, other instances (a real channel delivers to them too)
      for (const c of chans.get(this.name) ?? []) if (c !== this) setTimeout(() => c.onmessage?.({ data: d }), 0);
      window.__relayOut(this.name, JSON.stringify(d));
    }
    close() { chans.get(this.name)?.delete(this); }
    addEventListener() {}
    removeEventListener() {}
  };
}

/** Counters and error traps on a page in a match (installed once per GameState). */
const instrument = (P, role) => P.evaluate((role) => {
  const app = window.__app;
  const w = window;
  w.__repro ??= { reported: [], snapsIn: 0, snapsOut: 0, snapErr: '', avatarErr: '', frameErr: '', lastSnapIds: [], snapPlayers: 0 };
  const R = w.__repro;
  if (!app.__reproReport) {
    const rep = app.report.bind(app);
    app.report = (e) => { R.reported.push(String(e?.stack ?? e).slice(0, 600)); rep(e); };
    app.__reproReport = true;
  }
  const g = app.current;
  const n = g?.net;
  if (!n || n.__repro) return !!n;
  n.__repro = true;
  if (role === 'host') {
    const snap = n.snapshot.bind(n);
    n.snapshot = () => { R.snapsOut++; return snap(); };
  } else {
    const on = n.onSnap.bind(n);
    n.onSnap = (m) => {
      R.snapsIn++;
      R.lastSnapIds = m.players.map((p) => p.id);
      R.snapPlayers = m.players.length;
      try { return on(m); } catch (e) { R.snapErr = String(e?.stack ?? e).slice(0, 800); throw e; }
    };
    const av = n.avatar.bind(n);
    n.avatar = (st) => { try { return av(st); } catch (e) { R.avatarErr = String(e?.stack ?? e).slice(0, 800); throw e; } };
  }
  const fu = n.frameUpdate.bind(n);
  n.frameUpdate = (dt) => { try { return fu(dt); } catch (e) { R.frameErr = String(e?.stack ?? e).slice(0, 800); throw e; } };
  return true;
}, role);

/** Is the partner (client: the host's avatar; host: the client's) drawn: per render mesh, as the task lists. */
const measure = (P, side) => P.evaluate(async (side) => {
  const g = window.__app.current;
  if (!g?.net) return { side, error: 'no match' };
  const out = { side, selfId: window.__coop?.session?.selfId ?? null, sessionIds: [...(window.__coop?.session?.players?.keys() ?? [])] };
  const a = side === 'client' ? g.net.avatars?.values().next().value : g.net.remotes?.values().next().value?.avatar;
  out.avatarCount = side === 'client' ? (g.net.avatars?.size ?? 0) : (g.net.remotes?.size ?? 0);
  if (!a) return out;
  const c = g.player.cam;
  const was = [c.yaw, c.pitch];
  if (side === 'client') {
    c.yaw = Math.atan2(a.pos.x - g.player.position.x, a.pos.z - g.player.position.z);
    c.pitch = 0;
  }
  let raf = 0;
  await new Promise((r) => {
    const t = setTimeout(r, 3000);
    requestAnimationFrame(() => { raf++; requestAnimationFrame(() => { raf++; clearTimeout(t); r(); }); });
  });
  if (raf < 2) {
    // no rendered frame (background page): one sim step (camera follows) and one explicit render
    try { window.__app.loop.stepHeadless(1 / 30); g.scene.render(); out.manualRender = true; } catch (e) { out.renderErr = String(e); }
  }
  const scene = g.scene;
  const cam = scene.activeCamera;
  const am = scene.getActiveMeshes();
  const act = new Set(am.data.slice(0, am.length));
  const meshInfo = (m) => {
    m.computeWorldMatrix(true);
    const bb = m.getBoundingInfo().boundingBox;
    const cw = bb.centerWorld;
    return {
      name: m.name, en: m.isEnabled(true), selfEn: m.isEnabled(false), isVisible: m.isVisible, visibility: m.visibility,
      layer: m.layerMask, camLayer: cam?.layerMask ?? null, layerOk: cam ? (m.layerMask & cam.layerMask) !== 0 : null,
      active: act.has(m), inFrustum: cam ? cam.isInFrustum(m) : null, size: +bb.extendSizeWorld.length().toFixed(3),
      center: [cw.x, cw.y, cw.z].map((v) => +v.toFixed(2)), finite: [cw.x, cw.y, cw.z].every(Number.isFinite),
      group: m.renderingGroupId, ready: m.isReady(true), always: m.alwaysSelectAsActiveMesh, skel: !!m.skeleton,
    };
  };
  const r = a.rig.root;
  r.computeWorldMatrix(true);
  const all = a.figure.renderMeshes;
  const shown = all.filter((m) => m.isEnabled(false));
  out.root = [r.position.x, r.position.y, r.position.z].map((v) => +v.toFixed(3));
  out.rootFinite = out.root.every(Number.isFinite);
  out.rootEnabled = r.isEnabled();
  out.placed = a.placed;
  out.buf = a.buf.size;
  out.lod = a.figure.current;
  out.loaded = a.figure.loaded;
  out.meshesBuilt = all.length;
  const cp = cam?.globalPosition;
  out.camDist = cp ? +Math.hypot(cp.x - r.position.x, cp.y - r.position.y, cp.z - r.position.z).toFixed(2) : null;
  out.camera = cam ? { name: cam.name, isPlayerCam: cam === c.camera } : null;
  out.meshes = shown.map(meshInfo);
  out.drawn = out.rootFinite && out.rootEnabled && shown.length > 0 && out.meshes.every((i) => i.en && i.isVisible && i.visibility > 0 && i.layerOk !== false && i.finite) && out.meshes.some((i) => i.size > 0.5);
  out.inView = out.meshes.some((i) => i.active && i.inFrustum);
  // control: this page's own body
  const own = g.player.figure.renderMeshes.filter((m) => m.isEnabled(false));
  out.ownLod = g.player.figure.current;
  out.ownDrawn = own.length > 0 && own.map(meshInfo).every((i) => i.en && i.isVisible && i.visibility > 0);
  if (side === 'client') [c.yaw, c.pitch] = was;
  return out;
}, side);

const repro = (P) => P.evaluate(() => {
  const R = window.__repro ?? {};
  const app = window.__app;
  return { ...R, fps: Math.round(app.engine.getFps?.() ?? -1), hidden: document.hidden, time: app.current?.time ?? null, obj: app.current?.hud?.objectiveText ?? null };
});

// ---- the menu flow ----

async function throughTitle(P) {
  await P.bringToFront();
  await P.waitForFunction(() => !!window.__app?.screens?.top, null, { timeout: 90000 });
  const onTitle = () => P.evaluate(() => !!window.__app.screens.top?.el.classList.contains('title-screen'));
  if (await onTitle()) {
    await P.click('.title-screen .ts-press', { timeout: 30000 }).catch(() => P.keyboard.press('Enter'));
    await P.waitForTimeout(600);
    // the second press skips the goggle strike (menu-notes A3)
    if (await onTitle()) await P.keyboard.press('Enter').catch(() => {});
    await P.waitForFunction(() => !window.__app.screens.top?.el.classList.contains('title-screen'), null, { timeout: 30000 });
  }
  await P.waitForSelector('.main-menu .btn:has-text("Co-op")', { state: 'visible', timeout: 30000 });
}

async function waitFor(P, fn, arg, ms, what) {
  const t0 = Date.now();
  for (;;) {
    if (await P.evaluate(`!!(${fn})(${JSON.stringify(arg) ?? 'undefined'})`).catch(() => false)) return true;
    if (Date.now() - t0 > ms) { log(`timeout: ${what}`); return false; }
    await new Promise((r) => setTimeout(r, 150));
  }
}

async function runVariant(kind) {
  log(`variant ${kind}: launching`);
  const browser = await chromium.launch(launchOptions());
  browsers.push(browser);
  const ctxA = await browser.newContext({ viewport: VIEW });
  const ctxB = kind === 'shared' ? ctxA : await browser.newContext({ viewport: VIEW });
  const ctxs = kind === 'shared' ? [ctxA] : [ctxA, ctxB];
  const pages = [];
  for (const ctx of ctxs) await ctx.addInitScript(fakePointerLock);
  if (kind === 'separate') {
    // the room's BroadcastChannel relayed through Node, in order per target page
    const queues = new Map();
    for (const ctx of ctxs) {
      await ctx.addInitScript(relayInit);
      await ctx.exposeBinding('__relayOut', ({ page }, name, json) => {
        for (const other of pages) {
          if (other === page) continue;
          const q = (queues.get(other) ?? Promise.resolve()).then(() => other.evaluate(([n, j]) => window.__relayIn?.(n, JSON.parse(j)), [name, json])).catch(() => {});
          queues.set(other, q);
        }
      });
    }
  }
  const res = { variant: kind, gfx: GFX, steps: [], ok: false };
  const step = (s) => { res.steps.push(s); log(`${kind}: ${s}`); };
  // keep both sims running once they are in the match: step a page headless whenever its rAF did not advance
  const pumpOn = new Set();
  let pumping = false;
  const pump = setInterval(async () => {
    if (pumping) return;
    pumping = true;
    for (const P of pages) {
      if (!pumpOn.has(P)) continue;
      await P.evaluate(() => {
        if (window.__raf === undefined) {
          window.__raf = 0;
          const f = () => { window.__raf++; requestAnimationFrame(f); };
          requestAnimationFrame(f);
        }
        const now = performance.now();
        const last = window.__pumpT ?? now;
        const idle = window.__pumpRaf === window.__raf;
        window.__pumpT = now;
        window.__pumpRaf = window.__raf;
        if (idle && window.__app.current?.net) window.__app.loop.stepHeadless(Math.min(0.1, Math.max(1 / 60, (now - last) / 1000)));
      }).catch(() => {});
    }
    pumping = false;
  }, 40);
  try {
    const { page: A, errors: eA } = await openPage(ctxA, URL0, PARAMS);
    pages.push(A);
    res.errorsHost = eA;
    step('host booted');
    await throughTitle(A);
    step('host on the main menu');
    await A.click('.main-menu .btn:has-text("Co-op")');
    await A.click('.btn:has-text("Host a room")');
    if (!(await waitFor(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 20000, 'host lobby'))) throw new Error('host lobby did not open');
    const code = await A.evaluate(() => window.__coop.session.code);
    res.code = code;
    step(`room ${code}`);

    const { page: B, errors: eB } = await openPage(ctxB, URL0, PARAMS);
    pages.push(B);
    res.errorsJoiner = eB;
    step('joiner booted');
    await throughTitle(B);
    await B.click('.main-menu .btn:has-text("Co-op")');
    await B.click('.btn:has-text("Join with code")');
    await B.keyboard.type(code.toLowerCase());
    await B.keyboard.press('Enter');
    if (!(await waitFor(B, () => window.__coop?.session.hostId && window.__coop.session.players.size === 2, null, 20000, 'joiner sees the host lobby'))) throw new Error('join failed');
    step('joined');
    await B.click('.lobby-actions .btn:has-text("Ready")', { timeout: 10000 }).catch(() => B.evaluate(() => window.__coop.session.setReady(true)));
    if (!(await waitFor(A, () => window.__coop.session.allReady, null, 10000, 'everyone ready'))) throw new Error('ready did not reach the host');
    await A.bringToFront();
    await A.click('.lobby-actions .btn:has-text("Start mission")', { timeout: 10000 });
    step('start mission clicked');
    pumpOn.add(A);
    pumpOn.add(B);
    for (const [P, who] of [[A, 'host'], [B, 'joiner']]) {
      if (!(await waitFor(P, () => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && !!window.__app.current.player, null, 180000, `${who} match`))) throw new Error(`${who} match did not start`);
    }
    await instrument(A, 'host');
    await instrument(B, 'client');
    step('both in Marlow Yard');
    res.ids = await Promise.all([A, B].map((P) => P.evaluate(() => window.__coop.session.selfId)));
    res.sameId = res.ids[0] === res.ids[1];
    await B.bringToFront();
    res.avatarCreated = await waitFor(B, () => window.__app.current.net.avatars.size === 1, null, 30000, 'joiner has the host avatar');
    res.lodShown = res.avatarCreated && (await waitFor(B, () => window.__app.current.net.avatars.values().next().value.figure.current >= 0, null, 120000, 'host figure LOD shown on the joiner'));
    res.joinerAtStart = await measure(B, 'client');
    res.joinerCounters = await repro(B);
    res.hostCounters = await repro(A);
    if (outDir) await B.screenshot({ path: `${outDir}/${kind}-joiner-start.png` }).catch(() => {});
    // the LOD bands: the host stands d m in front of the joiner's camera (LOD0 < 8 m, LOD1 8-25 m, LOD2 beyond)
    res.distances = [];
    if (res.avatarCreated) {
      for (const d of DISTANCES) {
        const at = await B.evaluate((d) => {
          const g = window.__app.current;
          const p = g.player.position;
          const y = g.player.cam.yaw;
          return [p.x + Math.sin(y) * d, p.y + 0.05, p.z + Math.cos(y) * d, y + Math.PI];
        }, d);
        await A.evaluate(([x, y, z, yaw]) => {
          const g = window.__app.current;
          g.team?.end?.(true);
          g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw);
        }, at);
        await new Promise((r) => setTimeout(r, 2500));
        await B.bringToFront();
        const m = await measure(B, 'client');
        res.distances.push({ d, lod: m.lod, camDist: m.camDist, drawn: m.drawn, inView: m.inView, root: m.root, meshes: m.meshes?.length ?? 0, ready: m.meshes?.every((i) => i.ready) ?? null });
        if (outDir) await B.screenshot({ path: `${outDir}/${kind}-joiner-${d}m.png` }).catch(() => {});
      }
    }
    await A.bringToFront();
    res.hostSeesJoiner = await measure(A, 'host');
    res.joinerCounters = await repro(B);
    res.hostCounters = await repro(A);
    res.hostVisible = !!res.joinerAtStart?.drawn;
    res.ok = true;
  } catch (e) {
    res.error = String(e?.stack ?? e).slice(0, 1200);
    for (const [P, k] of [[pages[0], 'hostCounters'], [pages[1], 'joinerCounters']]) if (P) res[k] = await repro(P).catch(() => null);
  } finally {
    clearInterval(pump);
    await browser.close().catch(() => {});
  }
  return res;
}

const kinds = which === 'both' ? ['shared', 'separate'] : [which];
const out = [];
for (const k of kinds) out.push(await runVariant(k));
clearTimeout(kill);
const setupFailed = out.some((r) => !r.ok);
const summary = {
  url: URL0,
  params: PARAMS,
  variants: out.map((r) => ({
    variant: r.variant,
    ok: r.ok,
    error: r.error,
    hostVisibleOnJoiner: r.hostVisible ?? null,
    avatarCreated: r.avatarCreated ?? null,
    lodShown: r.lodShown ?? null,
    ids: r.ids,
    sameId: r.sameId,
    snapsSentByHost: r.hostCounters?.snapsOut ?? null,
    snapsSeenByJoiner: r.joinerCounters?.snapsIn ?? null,
    joinerObjective: r.joinerCounters?.obj ?? null,
    traps: { snapErr: r.joinerCounters?.snapErr || '', avatarErr: r.joinerCounters?.avatarErr || '', frameErr: r.joinerCounters?.frameErr || '', joinerReported: r.joinerCounters?.reported ?? [], hostReported: r.hostCounters?.reported ?? [] },
  })),
  detail: out,
};
console.log(JSON.stringify(summary));
stop();
process.exit(setupFailed ? 2 : 0);
