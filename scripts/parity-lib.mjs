// Light parity helpers (J11 light-parity, slice C1): shared by `e2e-parity.mjs` (the per-map grey-card suite) and
// `e2e-darkness.mjs` (night vision, thermal). Bible L5 / G391: a matte 50% grey card at points whose field level matches a
// `DARK_TARGETS` row reads as display luminance inside the row's band, and the light meter equals the field there.
// The pure helpers (no page) are unit-tested by `tests/parityLib.test.ts`, which also pins every copied constant to
// the game's own. The page helpers take a Playwright `page` on a running game (`window.__app.current`).
import { frames, GPU } from './e2e-lib.mjs';

/** Copy of `src/world/darkCurve.ts` `DARK_TARGETS` (tests/parityLib.test.ts keeps it equal). */
export const DARK_TARGETS = [
  { level: 0.12, band: 'dark', min: 0, max: 0.04 },
  { level: 0.27, band: 'dark', min: 0, max: 0.09 },
  { level: 0.4, band: 'mid', min: 0.12, max: 0.35 },
  { level: 0.7, band: 'lit', min: 0.45, max: 1 },
];

/** The first rect [x0, z0, x1, z1] of each `CAMPUS_BAKE.regions` entry (`src/world/maps/campusBake.ts`), S1..S5. */
export const CAMPUS_RECTS = [
  { s: 'S1', rect: [-40, -84, 26, -34] },
  { s: 'S2', rect: [-44, -30, 4, 6] },
  { s: 'S3', rect: [10, -30, 70, 0] },
  { s: 'S4', rect: [-10, 16, 40, 48] },
  { s: 'S5', rect: [-70, 18, -26, 70] },
];

/** Copy of `src/world/lampFlicker.ts` `FLICKER_FLASH`: the storm flash lights' mode (the pin leaves them to `setFlash`). */
export const FLICKER_FLASH = 3;

/**
 * The DARK_TARGETS row a field level falls in, else null. 0.12 / 0.40 / 0.70: within 0.03; 0.27: within 0.02 and under
 * the 0.28 meter threshold (A6). Self-contained on purpose: `findCards` sends its source into the page.
 */
export function rowFor(level) {
  const EPS = 1e-9;
  for (const row of [0.12, 0.4, 0.7]) if (Math.abs(level - row) <= 0.03 + EPS) return row;
  if (Math.abs(level - 0.27) <= 0.02 + EPS && level < 0.28) return 0.27;
  return null;
}

/** Is a display luma inside a row's band (a thousandth of slack, as the old e2e-darkness asserts)? */
export function inBand(luma, row) {
  return row.min - 1e-3 <= luma && luma <= row.max + 1e-3;
}

/**
 * Choose the cards to render from the candidates `[{ row, err, x, z, ... }]`: the lowest-err candidate of each row first,
 * then the rest by err, skipping any within `gap` m (x, z) of a chosen card, until `min` cards or none are left.
 * Returned in DARK_TARGETS row order (lowest err first inside a row).
 */
export function pickCards(cands, min, gap = 6) {
  const chosen = [];
  for (const t of DARK_TARGETS) {
    let best = null;
    for (const c of cands) if (c.row === t.level && (!best || c.err < best.err)) best = c;
    if (best) chosen.push(best);
  }
  const rest = cands.filter((c) => !chosen.includes(c)).sort((a, b) => a.err - b.err);
  for (const c of rest) {
    if (chosen.length >= min) break;
    if (chosen.some((k) => Math.hypot(k.x - c.x, k.z - c.z) < gap)) continue;
    chosen.push(c);
  }
  const order = (c) => DARK_TARGETS.findIndex((t) => t.level === c.row);
  return chosen.sort((a, b) => order(a) - order(b) || a.err - b.err);
}

/** A card's id: `campusOps:S1:0.12:-12.5,-60.0` (section `all` on the one-section maps). */
export function cardId(map, section, row, x, z) {
  return `${map}:${section}:${row}:${x.toFixed(1)},${z.toFixed(1)}`;
}

// an ISO date `until` runs to the end of that day (UTC)
const untilMs = (until) => Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(until) ? `${until}T23:59:59.999Z` : until);

/**
 * The KNOWN entry `{ map, section, row, near: [x, z], r, conf, owner, until }` covering a card `{ map, section, row, x, z }`
 * (same map, section and row, the card within `r` m of `near`, `until` not past `now`), else null.
 */
export function knownFor(card, known, now) {
  const t = +new Date(now);
  for (const k of known) {
    if (k.map !== card.map || k.section !== card.section || k.row !== card.row) continue;
    if (Math.hypot(card.x - k.near[0], card.z - k.near[1]) > k.r) continue;
    if (untilMs(k.until) >= t) return k;
  }
  return null;
}

/** The KNOWN entries past their `until` at `now` (a stale entry fails the run). */
export function expiredKnown(known, now) {
  const t = +new Date(now);
  return known.filter((k) => untilMs(k.until) < t);
}

/** The one line a part prints at its end: `PARITY-SUMMARY {"part":1,"cards":{"ok":..,"total":..},"meter":{..},"known":[..],"misses":[..],"s":..}`. */
export function summaryLine(part, r) {
  return `PARITY-SUMMARY ${JSON.stringify({ part, cards: { ok: r.cards.ok, total: r.cards.total }, meter: { ok: r.meter.ok, total: r.meter.total }, known: r.known, misses: r.misses, s: r.s })}`;
}

/** The counters `summaryLine` reads (`s`: the part's wall seconds, set by the caller). */
export function newResults() {
  return { cards: { ok: 0, total: 0 }, meter: { ok: 0, total: 0 }, known: [], misses: [], s: 0 };
}

/** Count a card: `kind` 'ok' | 'miss' | 'known' (a known miss is listed, not failed). */
export function addCard(res, id, kind) {
  res.cards.total++;
  if (kind === 'ok') res.cards.ok++;
  else if (kind === 'known') res.known.push(id);
  else res.misses.push(id);
}

/** Count a meter row; a miss is listed as `<id>:meter`. */
export function addMeter(res, id, ok) {
  res.meter.total++;
  if (ok) res.meter.ok++;
  else res.misses.push(`${id}:meter`);
}

// ---- page helpers ------------------------------------------------------------------------------------------------------

/**
 * (A7) Hold every moving light still for a read: the flicker and sway ticks do nothing, every flickering light (but the
 * storm flash lights, `FLICKER_FLASH`) sits at multiplier 1, the lightning level reads 0, the flash is cleared and the
 * picture draws no character shadows. `unpinLights` puts the four back. Gameplay code is untouched; the originals live on `window.__pin`.
 */
export function pinLights(page) {
  return page.evaluate((flash) => {
    const g = window.__app.current;
    const reg = g.world.level.lights;
    const lt = g.world.lightning;
    const lamps = g.world.lamps;
    if (!window.__pin) {
      window.__pin = { tickFlicker: reg.tickFlicker, tickSway: reg.tickSway, levelAt: lt ? lt.levelAt : null, capsules: lamps ? lamps.capsules : null };
    }
    reg.tickFlicker = () => {};
    reg.tickSway = () => {};
    // (check finding 1) no character shadow in the picture: the parked player and frozen guards may stand between a card
    // and its lamp (`BakedLamps.capsules` null = 0 capsules)
    if (lamps) lamps.capsules = null;
    for (const id of reg.flickering) if (reg.flickerMode(id) !== flash) reg.lights[id].flicker = 1;
    reg.flickerVersion++;
    if (lt) {
      lt.levelAt = () => 0;
      g.world.setFlash(0);
    }
  }, FLICKER_FLASH);
}

/** Put back what `pinLights` replaced and bump `flickerVersion` (the renderers re-write the flickering lights). */
export function unpinLights(page) {
  return page.evaluate(() => {
    const g = window.__app.current;
    const reg = g.world.level.lights;
    const pin = window.__pin;
    if (!pin) return;
    reg.tickFlicker = pin.tickFlicker;
    reg.tickSway = pin.tickSway;
    if (g.world.lightning && pin.levelAt) g.world.lightning.levelAt = pin.levelAt;
    if (g.world.lamps) g.world.lamps.capsules = pin.capsules;
    reg.flickerVersion++;
    window.__pin = null;
  });
}

/**
 * Candidate grey-card points (the e2e-darkness probe search, generalised). Scans `rect` [x0, z0, x1, z1] (null: the level
 * bounds) every `step` m. A point is a candidate when its nav cell is walkable, no character is within 4 m, the card
 * (`floor + 1.0` m) reads a DARK_TARGETS row in `rows` (`rowFor`), the spot is steady (the four neighbours at 0.2 m
 * within 0.03), a facing light exists (strongest lamp, else the moon, else an open walkable direction) and the camera
 * 0.8 m along it stands in free space (walkable, under `floor + 2.2`, its floor within 0.3 m of the card's, its level within
 * 0.25). Per row the `perRow` lowest-err candidates at least `gap` m apart are kept. Each also gets `stand`, a walkable
 * point 5 m off (or null) where the suite parks the player while the card renders (his capsule stays out of the picture).
 * Returns `[{ row, err, x, y, z, floor, level, dir, cam, light, stand }]`.
 */
export function findCards(page, { rect = null, rows, step = 0.5, perRow = 4, gap = 6 }) {
  return page.evaluate(
    ({ rect, rows, step, perRow, gap, rowSrc }) => {
      const rowFor = (0, eval)(`(${rowSrc})`);
      const g = window.__app.current;
      const w = g.world;
      const f = w.lightField;
      const nav = g.nav;
      const B = w.lightBake.lamps;
      const L = B ? B.baked.lights : new Float32Array(0);
      const n = B ? B.baked.ids.length : 0;
      const sun = w.map.theme.sunDir;
      const sl = Math.hypot(sun[0], sun[1], sun[2]);
      const moonDir = [-sun[0] / sl, -sun[1] / sl, -sun[2] / sl];
      const moonL = w.lightBake.moonLight;
      const bd = w.level.bounds;
      const [x0, z0, x1, z1] = rect ?? [bd.minX + 1, bd.minZ + 1, bd.maxX - 1, bd.maxZ - 1];
      // the walkable floor under (x, z) near height `hint` (NaN: any); -1e9 when none
      const floorAt = (x, z, hint) => {
        const c = nav.cellOf(x, z, hint);
        return c >= 0 && nav.isWalkable(c) ? nav.height[c] : -1e9;
      };
      const chars = [g.player.position, ...(g.enemyMgr?.enemies ?? []).filter((e) => e.alive).map((e) => e.pos)];
      const far = (x, z) => chars.every((c) => Math.hypot(c.x - x, c.z - z) > 4);
      const lists = new Map(rows.map((r) => [r, []]));
      for (let x = x0; x <= x1; x += step) {
        for (let z = z0; z <= z1; z += step) {
          const floor = floorAt(x, z, 0);
          if (floor < -1e8 || !far(x, z)) continue;
          const y = floor + 1.0;
          const lv = f.levelAt(x, y, z);
          const row = rowFor(lv);
          const list = row === null ? null : lists.get(row);
          if (!list) continue;
          const err = Math.abs(lv - row);
          // cheap rejections first: a nearer better card in the row, or the row's list full of better ones
          if (list.some((k) => Math.hypot(k.x - x, k.z - z) < gap && k.err <= err)) continue;
          if (list.length >= perRow && err >= list[list.length - 1].err && !list.some((k) => Math.hypot(k.x - x, k.z - z) < gap)) continue;
          let steady = true;
          for (const [dx, dz] of [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]]) if (Math.abs(f.levelAt(x + dx, y, z + dz) - lv) > 0.03) steady = false;
          if (!steady) continue;
          // the strongest light: a lamp, the moon, else an open direction (the fill)
          let dir = null;
          let top = 0.02;
          let light = 'fill';
          for (let i = 0; i < n; i++) {
            const c = f.lampAt(i, x, y, z);
            if (c <= top) continue;
            const lx = L[i * 10] - x, ly = L[i * 10 + 1] - y, lz = L[i * 10 + 2] - z;
            const d = Math.hypot(lx, ly, lz);
            top = c;
            dir = [lx / d, ly / d, lz / d];
            light = 'lamp';
          }
          if (moonL * f.moonAt(x, y, z) > top) {
            dir = moonDir;
            light = 'moon';
          }
          const open = (dx, dz, d) => floorAt(x + dx * d, z + dz * d, floor) > -1e8;
          if (!dir) {
            for (let a = 0; a < 8; a++) {
              const dx = Math.cos((a * Math.PI) / 4), dz = Math.sin((a * Math.PI) / 4);
              if (open(dx, dz, 0.8) && open(dx, dz, 0.4)) {
                dir = [dx, 0, dz];
                break;
              }
            }
            if (!dir) continue;
          }
          // the camera 0.8 m along it, in free space
          const cx = x + dir[0] * 0.8, cy = y + dir[1] * 0.8, cz = z + dir[2] * 0.8;
          if (cy >= floor + 2.2) continue;
          const cf = floorAt(cx, cz, floor);
          if (cf < -1e8 || Math.abs(cf - floor) > 0.3 || Math.abs(f.levelAt(cx, cy, cz) - lv) > 0.25) continue;
          // where the player waits while the card renders: walkable, 5 m off, the card's storey
          let stand = null;
          for (let a = 0; a < 8 && !stand; a++) {
            const sx = x + 5 * Math.cos((a * Math.PI) / 4), sz = z + 5 * Math.sin((a * Math.PI) / 4);
            const sf = floorAt(sx, sz, floor);
            if (sf > -1e8 && Math.abs(sf - floor) <= 0.3) stand = [sx, sz];
          }
          // keep the row's `perRow` lowest-err cards, `gap` m apart (a worse one within `gap` is replaced)
          for (let k = list.length - 1; k >= 0; k--) if (Math.hypot(list[k].x - x, list[k].z - z) < gap) list.splice(k, 1);
          list.push({ row, err, x, y, z, floor, level: lv, dir, cam: [cx, cy, cz], light, stand });
          list.sort((a, b) => a.err - b.err);
          if (list.length > perRow) list.length = perRow;
        }
      }
      const out = [];
      for (const r of rows) out.push(...lists.get(r));
      return out;
    },
    { rect, rows, step, perRow, gap, rowSrc: rowFor.toString() },
  );
}

/**
 * The light meter against the field at a card (the world frozen): the player is put on the card's floor point, the
 * meter's one step runs (`updateLight(0)`, the lightT timer cleared so it samples now), and `g.lightLevel` is compared
 * with `bodyLevel` at the same feet and body height (0.02). With the char-shadow flag on, the meter reads the
 * character contract `fillChars` fills: it is refilled here, and the field read takes the same contract.
 */
export function meterRow(page, card) {
  return page.evaluate(({ x, floor, z }) => {
    const g = window.__app.current;
    g.player.controller.teleport(new g.player.position.constructor(x, floor, z), 0);
    const occ = g.charOccluders ?? null;
    if (occ) g['fillChars']();
    g.lightT = 0;
    g['updateLight'](0);
    const meter = g.lightLevel;
    const field = g.world.lightField.bodyLevel(x, floor, z, g.player.rig.height, g['lightOccluder'], 0, 0, occ, occ ? g.charKeys[0] : -1);
    return { meter, field, ok: Math.abs(meter - field) <= 0.02 };
  }, card);
}

// ---- moved unchanged from e2e-darkness.mjs ------------------------------------------------------------------------------

/** Render the card at a probe and read the final pixels' display luminance (centre 10 x 10). */
export async function measure(page, p, nv) {
  await page.evaluate(([p, nv]) => {
    const g = window.__app.current;
    const w = g.world;
    window.__probe?.dispose();
    window.__probe = w.addLightProbe(p.x, p.y, p.z, p.dir[0], p.dir[1], p.dir[2]);
    const cam = g.photoCamera();
    cam.position.set(p.cam[0], p.cam[1], p.cam[2]);
    cam.setTarget(window.__probe.position);
    if (w.lamps) w.lamps.visionGain = nv ? w.lamps.visionGainMax : 1;
    g.post.setNightVision(nv ? 1 : 0);
  }, [p, nv]);
  // settle: the post stack (TAAU history, bloom) converges over wall-clock time, not frames: at 120 Hz 30 frames is a quarter second
  // (software GL took minutes for them). Read until three reads in a row agree within 0.5%, at least 30 frames, at most 8 s.
  // (software GL: a frame takes seconds, so 30 frames already outlast any convergence: one read, as before)
  // (a probe's card and a lamp's shadow maps use shaders the first time they are drawn here: a hardware driver compiles them for seconds
  // while the frames run on, and a read in that window is the unlit or half-lit card, never the converged one - wait until the scene is ready)
  for (let i = 0; i < 120 && !(await page.evaluate(() => window.__app.current.scene.isReady())); i++) await new Promise((r) => setTimeout(r, 250));
  await frames(page, 30);
  let last = await readLuma(page);
  let stable = GPU ? 0 : 3;
  for (let t0 = Date.now(); stable < 3 && Date.now() - t0 < 8000; ) {
    await frames(page, 10);
    const cur = await readLuma(page);
    stable = Math.abs(cur.luma - last.luma) < 0.005 ? stable + 1 : 0;
    last = cur;
  }
  return last;
}

export async function readLuma(page) {
  // the final image as the screen shows it (the HUD hidden), centre 10 x 10, decoded in the page
  const vp = page.viewportSize();
  const png = await page.screenshot({ clip: { x: Math.floor(vp.width / 2) - 5, y: Math.floor(vp.height / 2) - 5, width: 10, height: 10 } });
  return page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(img.width, img.height);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const px = x.getImageData(0, 0, img.width, img.height).data;
    const n = img.width * img.height;
    let s = 0;
    for (let i = 0; i < n; i++) s += 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2];
    return { luma: s / n / 255, rgb: [px[0], px[1], px[2]] };
  }, png.toString('base64'));
}

/** Mean sRGB (0..255) of a square of the final image: at `at` (page px, its centre), else the screen centre. */
export async function readRgb(page, size = 24, at = null) {
  const vp = page.viewportSize();
  const cx = at ? at.x : vp.width / 2;
  const cy = at ? at.y : vp.height / 2;
  const x = Math.max(0, Math.min(vp.width - size, Math.floor(cx - size / 2)));
  const y = Math.max(0, Math.min(vp.height - size, Math.floor(cy - size / 2)));
  const png = await page.screenshot({ clip: { x, y, width: size, height: size } });
  return page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(img.width, img.height);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const px = x.getImageData(0, 0, img.width, img.height).data;
    const n = img.width * img.height;
    const s = [0, 0, 0];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) s[k] += px[i * 4 + k];
    return s.map((v) => Math.round(v / n));
  }, png.toString('base64'));
}
