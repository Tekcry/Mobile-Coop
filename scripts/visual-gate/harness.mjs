/** @typedef {import('./viewpoints.mjs').View} View */ // shapes per briefs/VG3.md Contract (Vec3, Quad, MapCfg, Rig, Preset)
/** @typedef {[number, number, number]} Vec3 */
/** @typedef {[Vec3, Vec3, Vec3, Vec3]} Quad */
/** @typedef {[number, number]} Pt2 */ // briefs/VG1.md: screen px, x right, y down, origin top-left
/** @typedef {{ query: string, label: string }} MapCfg */
/** @typedef {{ browser: any, ctx: any, page: any, errors: string[], renderer: string, chrome: string, bootMs: number, torchCount: number }} Boot */
/** @typedef {{ feet: Vec3, rig: null | { guard: { pos: Vec3, yaw: number }, torch: boolean, doorAt: Vec3 | null }, minSimS?: number, wallCapMs?: number }} SettleSpec */
/** @typedef {{ meter: number, field: number, fieldFeet: number, pos: Vec3, drift: number, simS: number, ms: number, guards: number, torch: null | { want: boolean, has: boolean }, othersLit: number, door: null | { shut: boolean, dist: number }, flickering: number, flickeringAll: number, alarm: null | { before: { stage: unknown, reinforced: number | null }, after: { stage: unknown, reinforced: number | null }, raised: boolean } }} SettleResult */
/** @typedef {{ flickers: number, swayed: boolean, bars: number }} PinResult */
/** @typedef {{ ok: boolean, noisy: boolean, frames: number, reads: number, lastDelta: number, lastQ: number, ms: number }} ConvergeResult */
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

/** The `q` quantile (nearest rank, 0..1) of the cell differences of two grids: q 0.9 of 144 cells ignores the 14 that
 * move most (vg5t: TAAU shimmer on a sub-pixel bright line moves a few cells by 0.01-0.02 for ever). */
export function gridDeltaQ(a, b, q = 0.9) {
  if (a.length !== b.length) throw new Error(`gridDeltaQ: length ${a.length} vs ${b.length}`);
  if (!a.length) return 0;
  const d = a.map((v, i) => Math.abs(v - b[i])).sort((x, y) => x - y);
  return d[Math.min(d.length - 1, Math.max(0, Math.ceil(q * d.length) - 1))];
}

/** Converged when the last `need` deltas are all under `tol`. */
export function isConverged(deltas, tol = 0.004, need = 3) {
  if (deltas.length < need) return false;
  for (let i = deltas.length - need; i < deltas.length; i++) if (!(deltas[i] < tol)) return false;
  return true;
}

/** Converge defaults: `tol` per cell, `need` deltas in a row; the noisy-steady path (vg5t) takes the `q` quantile under
 * `tol` while the worst cell stays under `maxTol` (a shimmer, not a frame still settling). */
export const CONVERGE = Object.freeze({ tol: 0.004, need: 3, q: 0.9, maxTol: 0.03 });

/** 'steady' (every cell under tol for `need` reads), 'noisy' (the q quantile under tol and every cell under maxTol for
 * `need` reads: a few cells shimmer for ever under TAAU jitter, e.g. a railing at Epic), else null (still settling). */
export function convergeState(maxDeltas, qDeltas, o = CONVERGE) {
  const { tol, need, maxTol } = { ...CONVERGE, ...o };
  if (isConverged(maxDeltas, tol, need)) return 'steady';
  if (isConverged(qDeltas, tol, need) && isConverged(maxDeltas, maxTol, need)) return 'noisy';
  return null;
}

/** Flickering lights that reach the body at `(x, y, z)` (feet) with head height `h`: a light whose `radius` (+0.5 m)
 * covers the chest (0.6 h) or head (0.95 h) sample of `bodyLevel` (src/world/lightField.ts). A light with no radius
 * counts. Self-contained (it runs in the page from its source text). */
export function flickerNear(reg, x, y, z, h) {
  let n = 0;
  for (const id of reg?.flickering ?? []) {
    const l = reg.lights?.[id];
    if (!l) continue;
    const r = typeof l.radius === 'number' ? l.radius + 0.5 : Infinity;
    const dx = l.x - x;
    const dz = l.z - z;
    const dc = Math.sqrt(dx * dx + (l.y - (y + 0.6 * h)) ** 2 + dz * dz);
    const dh = Math.sqrt(dx * dx + (l.y - (y + 0.95 * h)) ** 2 + dz * dz);
    if (Math.min(dc, dh) <= r) n++;
  }
  return n;
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

// Guard placement (pure over the page's enemy objects; each is self-contained and also runs in the page from its source
// text, like gridMeans). Every guard the harness places carries the tag `__vgPlaced`; a guard without it spawned after
// the settle began (SectorMode.fill every 0.5 s of sim time once the player is >= 7 m from a slot, alarm
// reinforcements at any distance) and must be parked before a shot.

/** The rig guard: the first alive non-quadruped enemy, or null. */
export function pickRigGuard(enemies) {
  for (const e of enemies ?? []) if (e.alive && !e.def?.quadruped) return e;
  return null;
}

/** Stub (no brain: `update` only holds the position, e2e-darkness place), place and tag every enemy in `list`: the rig
 * guard at `rig.guard.pos` / `yaw` with `torchOverride = rig.torch`; every other one (quadrupeds too) parked at park
 * slot k = `[minX + 1 + k * 0.5, feet y - 40, minZ + 1]` with `torchOverride = false`. Returns the next free slot. */
export function placeGuards(list, rigGuard, rig, bd, feet, k) {
  for (const e of list) {
    e.update = () => e.prevPos.copyFrom(e.pos);
    if (rigGuard && e === rigGuard) {
      e.pos.set(rig.guard.pos[0], rig.guard.pos[1], rig.guard.pos[2]);
      e.yaw = rig.guard.yaw;
      e.torchOverride = rig.torch;
    } else {
      e.pos.set(bd.minX + 1 + k * 0.5, feet[1] - 40, bd.minZ + 1);
      e.torchOverride = false;
      k++;
    }
    e.prevPos.copyFrom(e.pos);
    e.__vgPlaced = true;
  }
  return k;
}

/** Alive enemies the harness has not placed (no `__vgPlaced` tag): spawned since the last placement. */
export function unplaced(enemies) {
  const out = [];
  for (const e of enemies ?? []) if (e.alive && !e.__vgPlaced) out.push(e);
  return out;
}

/** Extra park-and-wait rounds `settle` allows for late spawns before it throws. */
export const LATE_ROUNDS = 3;

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

/** The settle, run in the page from its source text (self-contained: the placement helpers come in as arguments). */
async function settleInPage({ feet, rig, minS, cap, lateRounds }, pickRigGuard, placeGuards, unplaced, flickerNear) {
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
  // (VG2 polish 2) the alarm stage and reinforcements before the settle: a camera or laser that sees the teleported
  // player raises them (lockdown doors, reinforcements); recorded, not asserted (VG5 WARNs)
  const alarmOf = () => {
    const m = g.mode;
    if (!m || (m.run?.alarm === undefined && m.reinforced === undefined)) return null;
    return { stage: m.run?.alarm ?? null, reinforced: typeof m.reinforced === 'number' ? m.reinforced : null };
  };
  const alarm0 = alarmOf();
  // re-read every call: a section change can spawn new guards. Everyone alive is stubbed, placed and tagged (quadrupeds
  // parked too: a dog walks into frame and pushes doors); the rig guard is the first alive non-quadruped.
  const es = (em?.enemies ?? []).filter((e) => e.alive);
  const rigGuard = rig ? pickRigGuard(es) : null;
  if (rig && !rigGuard) throw new Error('settle: rig has no guard (no alive non-quadruped enemy on this map)');
  let k = placeGuards(es, rigGuard, rig, bd, feet, 0);
  let placed = es.length;
  // 2. settle: >= minS of sim time and >= one fixed step per torch slot + 1 (mirror of harness settleTarget, with the
  // live torch count). Guards spawned during the wait (sector fill, reinforcements) are parked and the wait runs
  // again, at most `lateRounds` times.
  const t0 = g.time;
  for (let round = 0; ; round++) {
    const target = Math.max(minS, ((em?.torches?.length ?? 0) + 1) / 60);
    const tR = g.time;
    while (g.time - tR < target) {
      if (performance.now() - w0 > cap) throw new Error(`settle timed out: ${(g.time - tR).toFixed(3)} of ${target.toFixed(3)} s sim (round ${round}) in ${cap} ms`);
      await new Promise((res) => setTimeout(res, 50));
    }
    const late = unplaced(em?.enemies);
    if (!late.length) break;
    if (round >= lateRounds) throw new Error(`settle: guards still spawning (${late.length} unplaced after ${lateRounds} late round(s))`);
    k = placeGuards(late, null, rig, bd, feet, k);
    placed += late.length;
  }
  // 3. meter and field, the same tick. (vg5t) The field is read where the meter samples, the player's feet as they
  // stand (a teleport into a collider leaves the body pushed aside), and at the view's feet too; `drift` is the gap.
  const meter = g.lightLevel;
  const lf = g.world.lightField;
  const p = g.player.position;
  const pos = [p.x, p.y, p.z];
  const drift = Math.sqrt((p.x - feet[0]) ** 2 + (p.y - feet[1]) ** 2 + (p.z - feet[2]) ** 2);
  const field = lf.bodyLevel(p.x, p.y, p.z, 1.7);
  const fieldFeet = drift > 1e-3 ? lf.bodyLevel(feet[0], feet[1], feet[2], 1.7) : field;
  const simS = g.time - t0;
  // (vg5t) every map has a flickering light somewhere; only one that reaches the body can move the meter between its
  // 10 Hz sample and this read, so `flickering` counts those (A22's WARN), `flickeringAll` the map's
  const reg = g.world.level.lights;
  const flickeringAll = reg?.flickering?.length ?? 0;
  const flickering = flickerNear(reg, p.x, p.y, p.z, 1.7);
  const alarm1 = alarmOf();
  const alarm = alarm0 || alarm1
    ? {
      before: alarm0 ?? { stage: null, reinforced: null },
      after: alarm1 ?? { stage: null, reinforced: null },
      raised: String(alarm0?.stage) !== String(alarm1?.stage) || alarm0?.reinforced !== alarm1?.reinforced,
    }
    : null;
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
  return { meter, field, fieldFeet, pos, drift, simS, ms: Math.round(performance.now() - w0), guards: placed, torch, othersLit, door, flickering, flickeringAll, alarm };
}

/** PLAN section 3 steps 1-3 in one page evaluate: sim running, place everyone, settle, assert, read meter and field.
 * Every alive enemy is stubbed, placed and tagged (`placeGuards`); one spawned during the wait is parked and the wait
 * repeated (at most LATE_ROUNDS times, then it throws). `guards` counts every enemy placed, late ones included. */
export async function settle(page, spec) {
  const arg = {
    feet: spec.feet,
    rig: spec.rig ?? null,
    minS: spec.minSimS ?? 0.3,
    cap: spec.wallCapMs ?? 20000,
    lateRounds: LATE_ROUNDS,
  };
  return page.evaluate(`(${settleInPage})(${JSON.stringify(arg)}, ${pickRigGuard}, ${placeGuards}, ${unplaced}, ${flickerNear})`);
}

/** The pin, run in the page from its source text (synchronous: nothing awaits between its steps). */
function pinInPage(unplaced) {
  const app = window.__app;
  const g = app.current;
  // a guard spawned between the settle and here was never placed: fail the shot instead of shooting it
  const un = unplaced(g.enemyMgr?.enemies);
  if (un.length) throw new Error(`pin: unplaced guard(s) ${un.length}`);
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
  // (vg5t) the cinematic letterbox off: sector and clear modes open with `g.letterbox(2.8)` (a section change 2.6), it
  // counts down in sim time only (the pin stops it), so its bars (11% of the height, top and bottom) were in every shot
  // of a boot's first ~3 s of settles, their height set by the view order. `bars` = the amount it had.
  let bars = 0;
  const post = g.post;
  if (post && typeof post.bars === 'number') {
    bars = post.bars;
    post.barsTarget = 0;
    post.bars = 0;
  }
  if (typeof g.letterboxT === 'number') g.letterboxT = 0;
  g.photoFreeze(true);
  document.body.classList.add('photo-mode');
  g.player.rig.setEnabled(false);
  for (const e of g.enemyMgr?.enemies ?? []) e.bodyRig?.setEnabled(false);
  return { flickers, swayed, bars };
}

/** PLAN section 3 step 4, ONE synchronous evaluate: sim pinned, flicker 1, pendants at rest, photo mode, rigs hidden.
 * Throws first (nothing pinned) when an alive enemy is not tagged by the settle (`pin: unplaced guard(s) N`). */
export async function pin(page) {
  return page.evaluate(`(${pinInPage})(${unplaced})`);
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

/** Render until a full-frame cols x rows grid holds still: 30 frames, then a read every 10 frames until `convergeState`
 * says steady (the last 3 max-cell deltas under `tol`) or noisy (vg5t: the 0.9 quantile under `tol`, the max under
 * `maxTol`), at most `maxMs` (8 s) of reads. TAAU jitters every frame even pinned (C0 P3); on a sub-pixel bright line
 * (a railing at Epic) it never stops, which cost the 8 s cap on 4-6 Epic renders a run (M0, VG5 laptop runs). */
export async function converge(page, opts = {}) {
  const { tol = CONVERGE.tol, need = CONVERGE.need, q = CONVERGE.q, maxTol = CONVERGE.maxTol, maxMs = 8000, warm = 30, every = 10, cols = 16, rows = 9 } = opts;
  const { frames } = await lib();
  const t0 = now();
  await frames(page, warm);
  let n = warm;
  let prev = await readGrid(page, cols, rows);
  let reads = 1;
  const deltas = [];
  const qDeltas = [];
  const o = { tol, need, maxTol };
  const r0 = now();
  while (!convergeState(deltas, qDeltas, o) && now() - r0 < maxMs) {
    await frames(page, every);
    n += every;
    const cur = await readGrid(page, cols, rows);
    reads++;
    deltas.push(gridDelta(prev, cur));
    qDeltas.push(gridDeltaQ(prev, cur, q));
    prev = cur;
  }
  const state = convergeState(deltas, qDeltas, o);
  const last = (a) => (a.length ? a[a.length - 1] : NaN);
  return { ok: state !== null, noisy: state === 'noisy', frames: n, reads, lastDelta: last(deltas), lastQ: last(qDeltas), ms: Math.round(now() - t0) };
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

/** A `width` px wide webp of a PNG (decoded and scaled in the page, `OffscreenCanvas.convertToBlob`, quality 0.8);
 * height = round(width x h / w). null when the browser's blob is not `image/webp` (the caller WARNs once). */
export async function thumb(page, png, width = 320) {
  const b64 = await page.evaluate(`(async () => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + ${JSON.stringify(png.toString('base64'))})).blob());
    const w = ${Number(width)};
    const h = Math.max(1, Math.round(w * img.height / img.width));
    const c = new OffscreenCanvas(w, h);
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await c.convertToBlob({ type: 'image/webp', quality: 0.8 });
    if (blob.type !== 'image/webp') return null;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  })()`);
  return b64 ? Buffer.from(b64, 'base64') : null;
}

/** The grey card's direction at one point, run in the page after the pin (e2e-darkness `findProbes` :52-83 at that
 * point; flicker is held at 1 by the pin): the strongest baked lamp by `lampAt` (lights stride 10), the moon when
 * stronger (`moonLight x moonAt`, direction = -sunDir), else the first of 8 horizontal directions open at 0.4 and 0.8 m.
 * The camera sits 0.8 m along it, refused when its y > 2.2, its cell is not walkable or |level(cam) - level(at)| >
 * 0.25; on a refusal the 8 horizontal directions are tried with the same camera test. None: null. */
export async function cardSpot(page, at) {
  return page.evaluate((at) => {
    const g = window.__app.current;
    const w = g.world;
    const f = w.lightField;
    const nav = g.nav;
    const [x, y, z] = at;
    const baked = w.lightBake?.lamps?.baked;
    const L = baked?.lights ?? [];
    const n = baked?.ids?.length ?? 0;
    const walk = (px, pz) => {
      const c = nav.cellOf(px, pz, 0);
      return c >= 0 && nav.isWalkable(c) && Math.abs(nav.height[c]) < 0.3;
    };
    const lv = f.levelAt(x, y, z);
    const camFor = (dir) => {
      const cam = [x + dir[0] * 0.8, y + dir[1] * 0.8, z + dir[2] * 0.8];
      if (cam[1] > 2.2 || !walk(cam[0], cam[2]) || Math.abs(f.levelAt(cam[0], cam[1], cam[2]) - lv) > 0.25) return null;
      return cam;
    };
    const flat = [];
    for (let a = 0; a < 8; a++) flat.push([Math.cos((a * Math.PI) / 4), 0, Math.sin((a * Math.PI) / 4)]);
    let dir = null;
    let light = 'fill';
    let top = 0.02;
    for (let i = 0; i < n; i++) {
      const c = f.lampAt(i, x, y, z);
      if (c <= top) continue;
      const lx = L[i * 10] - x;
      const ly = L[i * 10 + 1] - y;
      const lz = L[i * 10 + 2] - z;
      const d = Math.hypot(lx, ly, lz) || 1;
      top = c;
      dir = [lx / d, ly / d, lz / d];
      light = 'lamp';
    }
    const sun = w.map?.theme?.sunDir;
    if (sun && w.lightBake?.moonLight !== undefined && f.moonAt) {
      const moon = w.lightBake.moonLight * f.moonAt(x, y, z);
      if (moon > top) {
        const sl = Math.hypot(sun[0], sun[1], sun[2]) || 1;
        dir = [-sun[0] / sl, -sun[1] / sl, -sun[2] / sl];
        light = 'moon';
      }
    }
    if (!dir) {
      for (const d of flat) {
        if (walk(x + d[0] * 0.8, z + d[2] * 0.8) && walk(x + d[0] * 0.4, z + d[2] * 0.4)) {
          dir = d;
          light = 'fill';
          break;
        }
      }
    }
    let cam = dir ? camFor(dir) : null;
    if (!cam) {
      for (const d of flat) {
        cam = camFor(d);
        if (cam) {
          dir = d;
          light = 'fill';
          break;
        }
      }
    }
    return cam && dir ? { dir, cam, light } : null;
  }, at);
}

/** One grey card under the pin: a probe at `at` facing `spot.dir`, the camera at `spot.cam` looking at it, converge,
 * capture; `level` = the light field at `at` read after the pin (flicker 1, the image's state; VG2 polish 3). The probe
 * is disposed in a `finally`. */
export async function card(page, at, spot) {
  const t0 = now();
  try {
    await page.evaluate(([at, dir]) => {
      window.__vgProbe?.dispose();
      window.__vgProbe = window.__app.current.world.addLightProbe(at[0], at[1], at[2], dir[0], dir[1], dir[2]);
    }, [at, spot.dir]);
    const aimed = await aim(page, spot.cam, at);
    const conv = await converge(page);
    const cap = await capture(page);
    const level = await page.evaluate((at) => window.__app.current.world.lightField.levelAt(at[0], at[1], at[2]), at);
    return { level, aimReady: aimed.ready, converge: conv, capture: cap, ms: Math.round(now() - t0) };
  } finally {
    await page.evaluate(() => {
      window.__vgProbe?.dispose();
      window.__vgProbe = null;
    }).catch(() => {});
  }
}

/** One shot of a view (rigState null) or a rig state: settle, pin, aim, converge, still pinned, project, capture.
 * A rig is shot 'on' then 'off': the second settle unpins, so it is a full redo (C0 M1), never a toggle under the pin.
 * Returns ShotRaw plus `aimReady` (scene.isReady() within the aim cap; false = shot on an unready scene, polish 1).
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
  const aimed = await aim(page, item.cam, item.target);
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
  return { id: item.id, rigState, settle: settled, pin: pinned, aimReady: aimed.ready, converge: conv, regions, capture: cap, ms };
}

/** Close a boot's browser. */
export async function closeBoot(boot) {
  await boot?.browser?.close().catch(() => {});
}
