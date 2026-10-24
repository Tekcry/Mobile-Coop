/** @typedef {import('./viewpoints.mjs').View} View */ // shapes per briefs/VG3.md Contract (Vec3, Quad, MapCfg, Rig, Preset)
/** @typedef {[number, number, number]} Vec3 */
/** @typedef {[Vec3, Vec3, Vec3, Vec3]} Quad */
/** @typedef {[number, number]} Pt2 */ // briefs/VG1.md: screen px, x right, y down, origin top-left
/** @typedef {{ query: string, label: string }} MapCfg */
/** @typedef {{ browser: any, ctx: any, page: any, errors: string[], renderer: string, chrome: string, bootMs: number, torchCount: number }} Boot */
/** @typedef {{ feet: Vec3, rig: null | { guard: { pos: Vec3, yaw: number }, torch: boolean, doorAt: Vec3 | null }, minSimS?: number, wallCapMs?: number }} SettleSpec */
/** @typedef {{ meter: number, field: number, simS: number, ms: number, guards: number, torch: null | { want: boolean, has: boolean }, othersLit: number, door: null | { shut: boolean, dist: number } }} SettleResult */
/** @typedef {{ flickers: number, swayed: boolean }} PinResult */
/** @typedef {{ ok: boolean, frames: number, reads: number, lastDelta: number, ms: number }} ConvergeResult */
/** @typedef {{ pts: Pt2[], behind: boolean }} Projection */ // behind: a corner with clip w <= 0 (VG5 skips that region)
/** @typedef {{ w: number, h: number, rgba: Uint8Array, png: Buffer, ms: number }} Capture */
/** @typedef {{ id: string, rigState: 'on' | 'off' | null, settle: SettleResult, pin: PinResult, converge: ConvergeResult, regions: Record<string, Projection>, capture: Capture, ms: { settle: number, pin: number, aim: number, converge: number, capture: number, total: number } }} ShotRaw */
/** @typedef {import('./viewpoints.mjs').Rig} Rig */

// visual-gate VG2: the shot harness (docs/visual-gate/PLAN.md section 3, briefs/VG2.md). Boots a map at a preset, settles
// the sim at a viewpoint (player teleported, guards stubbed and parked, a rig guard's torch on / off), reads the meter and
// the light field, pins the sim from the page (`__app.loop.timeScale = 0`, src/core/loop.ts: no fixed step runs while the
// photo path still renders), puts flickering lights at 1 and pendants at rest, aims the photo camera, waits for a
// full-frame grid to converge (TAAU jitters every frame even pinned) and captures the viewport.
// No Babylon import here: Babylon objects are only touched inside page callbacks, through the page's own classes.
// The Playwright helpers (../e2e-lib.mjs) are imported lazily, so the unit test loads the pure part without playwright.

/** A6: 960 x 540 at device scale 1 (the Playwright default). */
export const VIEWPORT = { width: 960, height: 540 };

/** The boot query: the map's own query, the preset, clear weather, then any proof flags (`falloff=photo`). */
export function mapQuery(map, preset, extra = '') {
  return `${map.query}&gfx=${preset}&weather=clear${extra ? `&${extra}` : ''}`;
}

/** Seconds of sim time to settle: >= minSimS, and >= one fixed step per torch slot + 1 (the torch round robin,
 * enemyManager.ts updateTorches: each torch's wall-stopped reach is computed once per `torches.length` steps). */
export function settleTarget(torchCount, minSimS = 0.3) {
  return Math.max(minSimS, (torchCount + 1) / 60);
}

/** Mean Rec. 709 luma (0..1) per cell of a cols x rows grid, row-major from the top-left cell. Self-contained (no
 * reference to module scope): the harness also runs it in the page from its source text. */
export function gridMeans(rgba, w, h, cols = 16, rows = 9) {
  const out = new Array(cols * rows).fill(0);
  for (let r = 0; r < rows; r++) {
    const y0 = Math.floor((r * h) / rows);
    const y1 = Math.floor(((r + 1) * h) / rows);
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor((c * w) / cols);
      const x1 = Math.floor(((c + 1) * w) / cols);
      let s = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        let i = (y * w + x0) * 4;
        for (let x = x0; x < x1; x++, i += 4) {
          s += 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
          n++;
        }
      }
      out[r * cols + c] = n ? s / n / 255 : 0;
    }
  }
  return out;
}

/** The largest cell difference of two grids. */
export function gridDelta(a, b) {
  if (a.length !== b.length) throw new Error(`gridDelta: length ${a.length} vs ${b.length}`);
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

/** Converged when the last `need` deltas are all under `tol`. */
export function isConverged(deltas, tol = 0.004, need = 3) {
  if (deltas.length < need) return false;
  for (let i = deltas.length - need; i < deltas.length; i++) if (!(deltas[i] < tol)) return false;
  return true;
}

/** A world point to screen px through a row-vector matrix (Babylon `view.multiply(projection).toArray()`):
 * clip = [p, 1] x M; x = (clip.x / w + 1) / 2 x W, y = (1 - clip.y / w) / 2 x H. `w` <= 0: behind the camera. */
export function projectPoint(m, p, W, H) {
  const [px, py, pz] = p;
  const cx = px * m[0] + py * m[4] + pz * m[8] + m[12];
  const cy = px * m[1] + py * m[5] + pz * m[9] + m[13];
  const cw = px * m[3] + py * m[7] + pz * m[11] + m[15];
  return { x: ((cx / cw + 1) / 2) * W, y: ((1 - cy / cw) / 2) * H, w: cw };
}

/** Every region quad to screen px; `behind` when any corner has clip w <= 1e-6 (VG5 skips that region). */
export function projectQuads(m, quads, W, H) {
  /** @type {Record<string, Projection>} */
  const out = {};
  for (const [k, q] of Object.entries(quads ?? {})) {
    let behind = false;
    const pts = q.map((p) => {
      const s = projectPoint(m, p, W, H);
      if (!(s.w > 1e-6)) behind = true;
      return /** @type {Pt2} */ ([s.x, s.y]);
    });
    out[k] = { pts, behind };
  }
  return out;
}

// ---------- page side (Playwright) ----------

let libP = null;
/** ../e2e-lib.mjs, loaded on first use only (it imports playwright-core). */
function lib() {
  libP ??= import('../e2e-lib.mjs');
  return libP;
}

const now = () => performance.now();

/** Boot a map at a preset in a fresh browser: the match, the whole section bake, film grain off. */
export async function bootMap({ url, map, preset, extra = '' }) {
  const { launch } = await lib();
  const t0 = now();
  const { browser, ctx, page, errors } = await launch({ url, params: mapQuery(map, preset, extra), viewport: VIEWPORT });
  try {
    const info = await page.evaluate(() => {
      const app = window.__app;
      const g = app?.current;
      const s = g?.world?.lightBake?.sections;
      const v = app?.settings?.get?.()?.video;
      return {
        match: !!g?.player,
        bake: !s || !!s.done,
        grain: v ? v.filmGrain : undefined,
        renderer: String(app?.engine?.getGlInfo?.()?.renderer ?? ''),
        torchCount: g?.enemyMgr?.torches?.length ?? 0,
      };
    });
    const tag = `${map.label}@${preset}`;
    if (!info.match) throw new Error(`no match: ${tag}`);
    // e2e-lib waits for the section bake but swallows its timeout (C0 P3)
    if (!info.bake) throw new Error(`bake not done: ${tag}`);
    if (info.grain !== undefined && info.grain !== false) throw new Error(`film grain on: ${tag} (filmGrain ${info.grain})`);
    return { browser, ctx, page, errors, renderer: info.renderer, chrome: browser.version(), bootMs: Math.round(now() - t0), torchCount: info.torchCount };
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

/** PLAN section 3 steps 1-3 in one page evaluate: sim running, place everyone, settle, assert, read meter and field. */
export async function settle(page, spec) {
  const arg = {
    feet: spec.feet,
    rig: spec.rig ?? null,
    minS: spec.minSimS ?? 0.3,
    cap: spec.wallCapMs ?? 20000,
  };
  return page.evaluate(async ({ feet, rig, minS, cap }) => {
    const w0 = performance.now();
    const app = window.__app;
    const g = app.current;
    const V = g.player.position.constructor;
    // 1. the sim running
    app.loop.timeScale = 1;
    g.photoFreeze(false);
    document.body.classList.remove('photo-mode');
    g.team?.end?.(true);
    g.player.controller.teleport(new V(feet[0], feet[1], feet[2]), 0);
    g.vision.set('off');
    const em = g.enemyMgr;
    const bd = g.world.level.bounds;
    // re-read every call: a section change can spawn new guards
    const es = (em?.enemies ?? []).filter((e) => e.alive && !e.def?.quadruped);
    const rigGuard = rig ? es[0] ?? null : null;
    if (rig && !rigGuard) throw new Error('settle: rig has no guard (no alive non-quadruped enemy on this map)');
    es.forEach((e, k) => {
      // still, no brain (e2e-darkness.mjs place)
      e.update = () => e.prevPos.copyFrom(e.pos);
      if (e === rigGuard) {
        e.pos.set(rig.guard.pos[0], rig.guard.pos[1], rig.guard.pos[2]);
        e.yaw = rig.guard.yaw;
        e.torchOverride = rig.torch;
      } else {
        e.pos.set(bd.minX + 1 + k * 0.5, feet[1] - 40, bd.minZ + 1);
        e.torchOverride = false;
      }
      e.prevPos.copyFrom(e.pos);
    });
    // 2. settle: >= minS of sim time and >= one fixed step per torch slot + 1 (mirror of harness settleTarget, with the
    // live torch count)
    const torchCount = em?.torches?.length ?? 0;
    const target = Math.max(minS, (torchCount + 1) / 60);
    const t0 = g.time;
    while (g.time - t0 < target) {
      if (performance.now() - w0 > cap) throw new Error(`settle timed out: ${(g.time - t0).toFixed(3)} of ${target.toFixed(3)} s sim in ${cap} ms`);
      await new Promise((res) => setTimeout(res, 50));
    }
    // 3. meter and field, the same tick
    const meter = g.lightLevel;
    const field = g.world.lightField.bodyLevel(feet[0], feet[1], feet[2], 1.7);
    const simS = g.time - t0;
    // checks
    if (app.loop.timeScale !== 1) throw new Error(`settle: timeScale ${app.loop.timeScale} after the settle (want 1)`);
    let torch = null;
    if (rig) {
      const has = !!em.hasTorch(rigGuard);
      torch = { want: rig.torch, has };
      if (has !== rig.torch) throw new Error(`settle: rig guard torch ${has ? 'on' : 'off'}, want ${rig.torch ? 'on' : 'off'}`);
    }
    let othersLit = 0;
    for (const e of em?.enemies ?? []) if (e.alive && e !== rigGuard && em.hasTorch?.(e)) othersLit++;
    if (othersLit) throw new Error(`settle: ${othersLit} other guard(s) hold a torch (want 0)`);
    let door = null;
    if (rig?.doorAt) {
      const [dx, , dz] = rig.doorAt;
      let best = null;
      let bestD = Infinity;
      for (const d of g.world.doors?.list ?? []) {
        const dd = Math.sqrt((d.cx - dx) * (d.cx - dx) + (d.cz - dz) * (d.cz - dz));
        if (dd < bestD) {
          bestD = dd;
          best = d;
        }
      }
      if (!best) throw new Error(`settle: no door on this map near ${rig.doorAt}`);
      door = { shut: best.target === 0 && best.open === 0, dist: bestD };
      if (bestD > 1.5) throw new Error(`settle: nearest door ${bestD.toFixed(2)} m from doorAt ${rig.doorAt} (max 1.5)`);
      if (!door.shut) throw new Error(`settle: rig door not shut (target ${best.target}, open ${best.open})`);
    }
    return { meter, field, simS, ms: Math.round(performance.now() - w0), guards: es.length, torch, othersLit, door };
  }, arg);
}

/** PLAN section 3 step 4, ONE synchronous evaluate: sim pinned, flicker 1, pendants at rest, photo mode, rigs hidden. */
export async function pin(page) {
  return page.evaluate(() => {
    const app = window.__app;
    const g = app.current;
    app.loop.timeScale = 0;
    const reg = g.world.level.lights;
    let flickers = 0;
    for (const id of reg.flickering ?? []) {
      const l = reg.lights[id];
      if (!l) continue;
      l.flicker = 1;
      flickers++;
    }
    if (flickers) reg.flickerVersion++;
    let swayed = false;
    if (reg.sway) {
      for (const l of reg.lights) {
        if (!l || !(l.swx || l.swy || l.swz)) continue;
        l.swx = 0;
        l.swy = 0;
        l.swz = 0;
        swayed = true;
      }
      reg.swayVersion++;
    }
    g.photoFreeze(true);
    document.body.classList.add('photo-mode');
    g.player.rig.setEnabled(false);
    for (const e of g.enemyMgr?.enemies ?? []) e.bodyRig?.setEnabled(false);
    return { flickers, swayed };
  });
}

/** The photo camera at `cam` looking at `target`; then wait for `scene.isReady()` (250 ms polls, max 30 s). */
export async function aim(page, cam, target) {
  await page.evaluate(([cam, target]) => {
    const g = window.__app.current;
    const V = g.player.position.constructor;
    const c = g.photoCamera();
    c.position.set(cam[0], cam[1], cam[2]);
    c.setTarget(new V(target[0], target[1], target[2]));
  }, [cam, target]);
  const t0 = now();
  let ready = false;
  for (let i = 0; i < 120 && !(ready = await page.evaluate(() => window.__app.current.scene.isReady())); i++) await new Promise((r) => setTimeout(r, 250));
  return { ready, ms: Math.round(now() - t0) };
}

/** Decode a PNG (base64) in the page and run `body` (source text of an expression over `px`, `w`, `h`). */
function decodeExpr(b64, body) {
  return `(async () => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + ${JSON.stringify(b64)})).blob());
    const c = new OffscreenCanvas(img.width, img.height);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const w = img.width, h = img.height;
    const px = x.getImageData(0, 0, w, h).data;
    return ${body};
  })()`;
}

/** One full-viewport screenshot reduced to the grid of cell means (decoded and reduced in the page). */
async function readGrid(page, cols, rows) {
  const png = await page.screenshot();
  return page.evaluate(decodeExpr(png.toString('base64'), `(${gridMeans.toString()})(px, w, h, ${cols}, ${rows})`));
}

/** Render until a full-frame cols x rows grid holds still: 30 frames, then a read every 10 frames until the last 3
 * deltas are all under `tol`, at most `maxMs` (8 s) of reads. TAAU jitters every frame even pinned (C0 P3). */
export async function converge(page, opts = {}) {
  const { tol = 0.004, need = 3, maxMs = 8000, warm = 30, every = 10, cols = 16, rows = 9 } = opts;
  const { frames } = await lib();
  const t0 = now();
  await frames(page, warm);
  let n = warm;
  let prev = await readGrid(page, cols, rows);
  let reads = 1;
  const deltas = [];
  const r0 = now();
  while (!isConverged(deltas, tol, need) && now() - r0 < maxMs) {
    await frames(page, every);
    n += every;
    const cur = await readGrid(page, cols, rows);
    reads++;
    deltas.push(gridDelta(prev, cur));
    prev = cur;
  }
  return { ok: isConverged(deltas, tol, need), frames: n, reads, lastDelta: deltas.length ? deltas[deltas.length - 1] : NaN, ms: Math.round(now() - t0) };
}

/** The photo camera's view x projection, row-vector order (Babylon `toArray()`). */
export async function matrix(page) {
  return page.evaluate(() => {
    const c = window.__app.current.photoCamera();
    return Array.from(c.getViewMatrix(true).multiply(c.getProjectionMatrix(true)).toArray());
  });
}

/** One full-viewport PNG, decoded in the page to RGBA bytes. */
export async function capture(page) {
  const t0 = now();
  const png = await page.screenshot();
  const r = await page.evaluate(decodeExpr(png.toString('base64'), `(() => {
    let s = '';
    for (let i = 0; i < px.length; i += 0x8000) s += String.fromCharCode.apply(null, px.subarray(i, i + 0x8000));
    return { w, h, b64: btoa(s) };
  })()`));
  const rgba = new Uint8Array(Buffer.from(r.b64, 'base64'));
  if (rgba.length !== r.w * r.h * 4) throw new Error(`capture: ${rgba.length} bytes for ${r.w} x ${r.h}`);
  return { w: r.w, h: r.h, rgba, png, ms: Math.round(now() - t0) };
}

/** One shot of a view (rigState null) or a rig state: settle, pin, aim, converge, still pinned, project, capture.
 * A rig is shot 'on' then 'off': the second settle unpins, so it is a full redo (C0 M1), never a toggle under the pin.
 * `boot` is kept for VG5 (renderer key, the boot's torch count); the settle reads the live torch count itself. */
export async function shoot(page, item, rigState, boot) {
  void boot;
  const t0 = now();
  const ms = { settle: 0, pin: 0, aim: 0, converge: 0, capture: 0, total: 0 };
  let t = now();
  /** @type {SettleSpec} */
  const spec = {
    feet: item.feet,
    rig: rigState ? { guard: item.guard, torch: rigState === 'on', doorAt: item.door?.at ?? null } : null,
  };
  const settled = await settle(page, spec);
  ms.settle = Math.round(now() - t);
  t = now();
  const pinned = await pin(page);
  ms.pin = Math.round(now() - t);
  t = now();
  await aim(page, item.cam, item.target);
  ms.aim = Math.round(now() - t);
  t = now();
  const conv = await converge(page);
  ms.converge = Math.round(now() - t);
  // a slowBeat restore (gameState.ts) would have unpinned the sim under the converge
  const ts = await page.evaluate(() => window.__app.loop.timeScale);
  if (ts !== 0) throw new Error(`unpinned after converge: timeScale ${ts} (want 0)`);
  const regions = projectQuads(await matrix(page), item.regions ?? {}, VIEWPORT.width, VIEWPORT.height);
  t = now();
  const cap = await capture(page);
  ms.capture = Math.round(now() - t);
  ms.total = Math.round(now() - t0);
  return { id: item.id, rigState, settle: settled, pin: pinned, converge: conv, regions, capture: cap, ms };
}

/** Close a boot's browser. */
export async function closeBoot(boot) {
  await boot?.browser?.close().catch(() => {});
}
