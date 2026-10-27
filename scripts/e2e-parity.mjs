// Light parity (J11 light-parity C1, G391 / bible L5, Q27 "Yes, every release"): on every carded map at Low and Epic, a matte 50%
// grey card at points whose field level matches a DARK_TARGETS row (0.12, 0.27, 0.40, 0.70) reads as display luminance inside the
// row's band, and the light meter equals the field there (0.02), with every moving light held still (`pinLights`).
// Carded: Saltmarsh Park (campusOps, each of S1-S5; v1 as it ships), ctcourse (Marlow Yard) and the Warehouse. Not carded: warehouseOps
// (frozen, Q26), provingGrounds, kestrel, seclab / courselab, bunker (J11 BRIEF A1, A5).
//   parts: 1 campusOps S1-S2, 2 campusOps S3-S5, 3 ctcourse, 4 warehouse (`--part=N`, none = all); each runs Low then Epic.
//   lines: `<look> <id> level <l> luma <v> band <min>-<max> ok|MISS|KNOWN MISS (...)`, `<look> <id> meter <m> field <f> ok|MISS`,
//   and per part `PARITY-SUMMARY {"part", "cards", "meter", "known", "misses", "s"}` (the walk card's "Light parity" source).
// (char-shadow-meter S4, J16) Part 4 also runs the character-shadow card on its own `charlight=1` pages (char shadows Off,
// Low, Epic): a parked guard between a lamp and a grey card, the card read with and without him against the field with
// the character contract; one `CHARSHADOW {..}` line after part 4's summary (`charShadowCard`, PLAN sections 3 and 5).
// Reads final pixels: E2E_GPU=1 only. Helpers and unit-tested pure parts: `parity-lib.mjs` / `tests/parityLib.test.ts`.
import { launch, frames, GPU } from './e2e-lib.mjs';
import { CAMPUS_RECTS, DARK_TARGETS, addCard, addMeter, cardId, expiredKnown, findCards, inBand, knownFor, measure, meterRow, newResults, pickCards, pinLights, rowFor, summaryLine, unpinLights } from './parity-lib.mjs';

if (!GPU) {
  console.log('E2E ERROR: e2e-parity reads final pixels: E2E_GPU=1 only');
  process.exit(1);
}

const url = process.argv[2] ?? 'http://localhost:4173/';
const PART = Number(process.argv.find((a) => a.startsWith('--part='))?.slice(7) ?? 0);
const want = (n) => PART === 0 || PART === n;
// one launch each, a fresh profile (every per-preset setting at its default); no `campusv2` param: what ships is carded (v1)
const LOOKS = [
  { name: 'low', params: 'gfx=low' },
  { name: 'epic', params: 'gfx=epic' },
];
const VIEWPORT = { width: 640, height: 360 };
const ROWS = DARK_TARGETS.map((t) => t.level);

/**
 * (A2) Known misses: a miss already measured and triaged may sit here while its fix lands; it prints `KNOWN MISS` on every run and
 * the run fails once its `until` passes. Entries `{ map, section, row, near: [x, z], r, conf, owner, until }` (section `S1`..`S5`,
 * `all` on ctcourse and warehouse; row 0.12 / 0.27 / 0.4 / 0.7; `until` an ISO date at most 7 days out). Added by the lead only,
 * from a measured run.
 */
const KNOWN = [];

const campus = (a, b) => CAMPUS_RECTS.slice(a, b).map((c) => ({ s: c.s, rect: c.rect, min: 3 }));
const PARTS = [
  { n: 1, map: 'campusOps', params: 'autostart=campusOps&mode=sector', sections: campus(0, 2), bake: true },
  { n: 2, map: 'campusOps', params: 'autostart=campusOps&mode=sector', sections: campus(2, 5), bake: true },
  { n: 3, map: 'ctcourse', params: 'autostart=ctcourse&mode=course', sections: [{ s: 'all', rect: null, min: 8 }], bake: false },
  { n: 4, map: 'warehouse', params: 'autostart=warehouse&mode=clear', sections: [{ s: 'all', rect: null, min: 4 }], bake: false },
];

const fmt = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const now = new Date();

/** Search and pick the cards of every section (printing the rows with no point and the sections under their minimum). */
async function pickAll(page, look, res, spec) {
  const out = [];
  for (const sec of spec.sections) {
    const cands = await findCards(page, { rect: sec.rect, rows: ROWS, perRow: 4, gap: 6 });
    const chosen = pickCards(cands, sec.min);
    for (const row of ROWS) if (!chosen.some((c) => c.row === row)) console.log(`  ${look.name} ${spec.map}:${sec.s}:${row} no point`);
    if (chosen.length < sec.min) {
      const msg = `${look.name} ${spec.map}:${sec.s} only ${chosen.length} cards (levels ${chosen.map((c) => fmt(c.level, 2)).join(', ') || 'none'})`;
      console.log(`  ${msg}`);
      res.fails.push(msg);
    }
    for (const c of chosen) out.push({ ...c, map: spec.map, section: sec.s, id: cardId(spec.map, sec.s, c.row, c.x, c.z) });
  }
  return out;
}

/** Render every card (the player parked 5 m off, out of the picture) and check its band. */
async function renderCards(page, look, res, cards) {
  for (const c of cards) {
    if (c.stand) await page.evaluate(([x, y, z]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, y, z), 0); }, [c.stand[0], c.floor, c.stand[1]]);
    const row = DARK_TARGETS.find((t) => t.level === c.row);
    const m = await measure(page, c, false);
    const ok = inBand(m.luma, row);
    const kn = ok ? null : knownFor(c, KNOWN, now);
    const tail = ok ? 'ok' : kn ? `KNOWN MISS (${kn.conf}, ${kn.owner}, ${kn.until})` : 'MISS';
    console.log(`  ${look.name} ${c.id} level ${fmt(c.level)} luma ${fmt(m.luma)} band ${row.min}-${row.max} ${tail}`);
    addCard(res, `${look.name}:${c.id}`, ok ? 'ok' : kn ? 'known' : 'miss');
  }
}

/** Every card's meter against the field (the world frozen, the player put on the card's floor point). */
async function meterRows(page, look, res, cards) {
  for (const c of cards) {
    const r = await meterRow(page, c);
    console.log(`  ${look.name} ${c.id} meter ${fmt(r.meter)} field ${fmt(r.field)} ${r.ok ? 'ok' : 'MISS'}`);
    addMeter(res, `${look.name}:${c.id}`, r.ok);
  }
}

/** Parts 1 to 3: the cards of every section, rendered first, then every meter row. */
async function partCards(page, look, res, spec) {
  const cards = await pickAll(page, look, res, spec);
  await renderCards(page, look, res, cards);
  await meterRows(page, look, res, cards);
}

/** Part 4: the Warehouse, one card per row (min 4 = every row). */
async function partWarehouse(page, look, res) {
  const spec = PARTS[3];
  const cards = await pickAll(page, look, res, spec);
  await renderCards(page, look, res, cards);
  // (char-shadow-meter S4) the character-shadow card runs after both looks, on its own pages: `charShadowCard`
  await meterRows(page, look, res, cards);
}

// ---- (char-shadow-meter S4, J16) the character-shadow card ---------------------------------------------------------------

/** Its own pages, one per preset: char shadows Off (round capsules from every lamp), Low (the nearest lamp's outline) and
 *  Epic (four lamps' outlines). `charlight=1` turns the character contract on (the meter and the picture read it). */
const CS_LOOKS = [
  { name: 'off', params: 'gfx=low&charlight=1', mode: 'off' },
  { name: 'low', params: 'gfx=low&charlight=1', mode: 'auto' },
  { name: 'epic', params: 'gfx=epic&charlight=1', mode: 'auto' },
];
/**
 * The pass rule (PLAN section 5, before J10's re-bake): the band check of the unshadowed card is report only
 * (`bandStrict` false until J10); the luma ratio inside / outside within `ratioTol` of the field ratio mapped through the
 * bands (`bandLuma`); the three inside reads within `agree` luma. Start values, set from the proof run.
 * The pick: the card `cardUp` m over the floor (low, so a guard `park` m off stands in the lamp's path), the camera 0.8 m
 * off, `camTurn` rad round from the lamp's direction (it sees the card past the guard), the player `standOff` m to the
 * other side. `fill`: a copy of `FILL` (src/game/charOccluderFill.ts), for the pick only; every read uses the live contract.
 */
const CS = { ratioTol: 0.1, agree: 0.03, bandStrict: false, cardUp: 0.6, park: [0.6, 0.8, 1.0], camTurn: 0.96, standOff: 2, minDrop: 0.08, fill: { r: 0.22, footLift: 0.25, topDrop: 0.2, minTop: 0.5 } };

/** A field level's expected display luma: straight lines through (0, 0), each `DARK_TARGETS` row's (level, band middle)
 *  and (1, 1). The "field ratio mapped through the bands" of PLAN section 5. */
function bandLuma(level) {
  const pts = [[0, 0], ...DARK_TARGETS.map((t) => [t.level, (t.min + t.max) / 2]), [1, 1]];
  const v = Math.max(0, Math.min(1, level));
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (v <= x1) return y0 + ((y1 - y0) * (v - x0)) / (x1 - x0);
  }
  return 1;
}

/**
 * Pick the card on a fresh page (the same on every page: the field never reads graphics): the map's guards out, one grunt
 * spawned and parked (his AI off), the player put `standOff` m to the side. Over every baked lamp, card points 1.5-7 m
 * off on the floor (`cardUp` m up) lit on the 0.40 or 0.70 row with that lamp giving at least half their light; the
 * guard `park` m toward the lamp; the camera 0.8 m along the lamp's direction turned `camTurn` round (free space, clear
 * of the guard). Best: the largest shadow share (field with the guard / without), the card's lamp the nearest to the
 * player first (the Low slot's lamp). Returns the card or `{ err }`.
 */
function csPick(page) {
  return page.evaluate(
    ({ C, rowSrc }) => {
      const rowFor = (0, eval)(`(${rowSrc})`);
      const g = window.__app.current;
      const w = g.world;
      const f = w.lightField;
      const nav = g.nav;
      const em = g.enemyMgr;
      const occl = g['lightOccluder'];
      const B = w.lightBake?.lamps;
      if (!g.charOccluders) return { err: 'no character contract (charlight=1 off?)' };
      if (!B || !em) return { err: 'no baked lamps or no guards on the Warehouse' };
      const L = B.baked.lights;
      const n = B.baked.ids.length;
      // the map's guards out (they patrol) and no more spawns; one grunt for the card (spawned at once: the mode never
      // sees an empty map), moved to his spot below
      if (Array.isArray(g.mode?.pending)) g.mode.pending.length = 0;
      em.clear();
      const e = em.spawn('grunt', g.player.position.clone(), false, 0);
      if (!e) return { err: 'no grunt spawned' };
      e.update = () => {};
      const H = e.def.height;
      const tmp = new g.charOccluders.constructor();
      const F = C.fill;
      const floorAt = (x, z, hint) => {
        const c = nav.cellOf(x, z, hint);
        return c >= 0 && nav.isWalkable(c) ? nav.height[c] : -1e9;
      };
      const near = (x, z) => {
        let best = -1;
        let bd = Infinity;
        for (let k = 0; k < n; k++) {
          const d = Math.hypot(L[k * 10] - x, L[k * 10 + 2] - z);
          if (d < bd) [bd, best] = [d, k];
        }
        return best;
      };
      let best = null;
      for (let i = 0; i < n; i++) {
        const lx = L[i * 10], ly = L[i * 10 + 1], lz = L[i * 10 + 2];
        for (let D = 1.5; D <= 7; D += 0.5) {
          for (let a = 0; a < 16; a++) {
            const ux = -Math.cos((a * Math.PI) / 8), uz = -Math.sin((a * Math.PI) / 8);
            const x = lx - ux * D, z = lz - uz * D;
            const floor = floorAt(x, z, 0);
            if (floor < -1e8) continue;
            const y = floor + C.cardUp;
            if (ly < y + 0.5) continue;
            const out = f.totalAt(x, y, z, occl);
            const row = rowFor(out);
            if (row === null || row < 0.4 || f.lampAt(i, x, y, z) < 0.5 * out) continue;
            let steady = true;
            for (const [dx, dz] of [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]]) if (Math.abs(f.totalAt(x + dx, y, z + dz, occl) - out) > 0.03) steady = false;
            if (!steady) continue;
            const dl = Math.hypot(lx - x, ly - y, lz - z);
            const nd = [(lx - x) / dl, (ly - y) / dl, (lz - z) / dl];
            for (const d of C.park) {
              const gx = x + ux * d, gz = z + uz * d;
              const gf = floorAt(gx, gz, floor);
              if (gf < -1e8 || Math.abs(gf - floor) > 0.3) continue;
              tmp.clear();
              tmp.add(2, 0, gx, gf + F.footLift, gz, gx, gf + Math.max(F.minTop, H - F.topDrop), gz, F.r);
              const inside = f.totalAt(x, y, z, occl, tmp, -1);
              if (out - inside < C.minDrop) continue;
              for (const sg of [1, -1]) {
                // the camera: the lamp's direction turned round the vertical by camTurn (the card still faces the lamp)
                const px = -uz * sg, pz = ux * sg;
                const ct = Math.cos(C.camTurn), st = Math.sin(C.camTurn);
                const v = [nd[0] * ct + px * st, nd[1] * ct, nd[2] * ct + pz * st];
                const vl = Math.hypot(v[0], v[1], v[2]);
                const cam = [x + (v[0] / vl) * 0.8, y + (v[1] / vl) * 0.8, z + (v[2] / vl) * 0.8];
                if (cam[1] >= floor + 2.2) continue;
                const cf = floorAt(cam[0], cam[2], floor);
                if (cf < -1e8 || Math.abs(cf - floor) > 0.3 || Math.abs(f.levelAt(cam[0], cam[1], cam[2]) - f.levelAt(x, y, z)) > 0.25) continue;
                // clear of the guard: his axis 0.5 m from the camera, 0.4 m from the camera-to-card line (horizontal)
                const sx = x - cam[0], sz = z - cam[2];
                const t = Math.max(0, Math.min(1, ((gx - cam[0]) * sx + (gz - cam[2]) * sz) / (sx * sx + sz * sz)));
                if (Math.hypot(gx - cam[0], gz - cam[2]) < 0.5 || Math.hypot(gx - cam[0] - sx * t, gz - cam[2] - sz * t) < 0.4) continue;
                // the player to the other side, off the lamp's path
                const sx2 = x - px * C.standOff, sz2 = z - pz * C.standOff;
                const sf = floorAt(sx2, sz2, floor);
                if (sf < -1e8 || Math.abs(sf - floor) > 0.3) continue;
                const nearest = near(sx2, sz2) === i;
                const score = (out - inside) / out + (nearest ? 1 : 0) + (row === 0.7 ? 0.05 : 0);
                if (best && score <= best.score) continue;
                best = { score, lamp: i, nearest, row, x, y, z, floor, out, pickIn: inside, dir: nd, cam, guard: [gx, gf, gz], stand: [sx2, sf, sz2] };
              }
            }
          }
        }
      }
      if (!best) return { err: 'no lit card with a guard spot in a lamp path' };
      const [gx, gf, gz] = best.guard;
      e.pos.set(gx, gf, gz);
      e['prevPos'].copyFrom(e.pos);
      // facing the card: the lamp sees his back (his full width)
      e.yaw = Math.atan2(best.x - gx, best.z - gz);
      e['prevYaw'] = e.yaw;
      e.vel?.set?.(0, 0, 0);
      const V = g.player.position.constructor;
      g.player.controller.teleport(new V(best.stand[0], best.stand[1], best.stand[2]), Math.atan2(best.x - best.stand[0], best.z - best.stand[2]));
      return best;
    },
    { C: CS, rowSrc: rowFor.toString() },
  );
}

/** The field at the card with the live contract (refilled now): the guard's capsule in it, or not. */
function csField(page, c) {
  return page.evaluate(({ x, y, z }) => {
    const g = window.__app.current;
    g['fillChars']();
    return g.world.lightField.totalAt(x, y, z, g['lightOccluder'], g.charOccluders, -1);
  }, c);
}

/** The guard out of the contract and the outline maps (`hide` true), or back. */
function csGuard(page, hide) {
  return page.evaluate((hide) => {
    const g = window.__app.current;
    const e = g.enemyMgr.enemies.find((x) => x.alive);
    if (hide) {
      window.__csVictims ??= g.takedownVictims;
      g.takedownVictims = () => [];
    } else if (window.__csVictims) {
      g.takedownVictims = window.__csVictims;
      window.__csVictims = null;
    }
    e?.bodyRig?.setEnabled(!hide);
    g['fillChars']();
  }, hide);
}

/** One preset's page: pick, render the card with the guard (inside) and without (outside), the field both ways, the meter. */
async function csLook(look) {
  const t0 = Date.now();
  const { browser, page, errors } = await launch({ url, params: `${PARTS[3].params}&${look.params}`, viewport: VIEWPORT });
  try {
    await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 240000 });
    if (look.mode !== 'auto') await page.evaluate((m) => window.__app.settings.update((d) => void (d.video.charShadows = m)), look.mode);
    await frames(page, 20);
    const c = await csPick(page);
    if (c.err) throw new Error(c.err);
    // the guard's figure at his spot and the contract refilled by the running sim, then the world frozen
    await frames(page, 10);
    await page.evaluate(() => {
      const g = window.__app.current;
      g.photoFreeze(true);
      document.body.classList.add('photo-mode');
      g.player.rig.setEnabled(false);
    });
    await pinLights(page);
    // this card reads the character shadows: the picture's capsules back on (pinLights takes them off for the grey cards)
    await page.evaluate(() => {
      const l = window.__app.current.world.lamps;
      if (l && window.__pin) l.capsules = window.__pin.capsules;
    });
    const slots = await page.evaluate(() => window.__app.current.world.charShadows?.stats?.().map((s) => s.lamp) ?? []);
    const inside = await measure(page, c, false);
    const fIn = await csField(page, c);
    await csGuard(page, true);
    const outside = await measure(page, c, false);
    const fOut = await csField(page, c);
    await csGuard(page, false);
    const m = await meterRow(page, c);
    await unpinLights(page);
    const bad = errors.filter((e) => !/favicon|net::ERR|WebSocket|webrtc|glGetProgramiv: Program object expected/i.test(e));
    return { look: look.name, card: c, slots, lumaIn: inside.luma, lumaOut: outside.luma, fIn, fOut, meter: m, errors: bad, s: Math.round((Date.now() - t0) / 1000) };
  } finally {
    await browser.close();
  }
}

/** Part 4's character-shadow card: the three pages, the pass rule, one `CHARSHADOW` line (into `extra`), misses into `res`. */
async function charShadowCard(res, extra) {
  const reads = [];
  for (const look of CS_LOOKS) {
    try {
      reads.push(await csLook(look));
    } catch (e) {
      console.error(String(e));
      res.fails.push(`charshadow ${look.name}: ${String(e).split('\n')[0]}`);
    }
  }
  const rows = [];
  for (const r of reads) {
    const c = r.card;
    const id = cardId('warehouse', 'all', c.row, c.x, c.z);
    const band = DARK_TARGETS.find((t) => t.level === rowFor(r.fOut));
    const bandOk = band ? inBand(r.lumaOut, band) : false;
    const ratio = r.lumaOut > 0 ? r.lumaIn / r.lumaOut : NaN;
    const want = bandLuma(r.fIn) / bandLuma(r.fOut);
    const shade = r.fIn < r.fOut;
    const ratioOk = Math.abs(ratio - want) <= CS.ratioTol;
    const ok = shade && ratioOk && r.meter.ok && (bandOk || !CS.bandStrict) && r.errors.length === 0;
    console.log(`  cs-${r.look} ${id} lamp ${c.lamp}${c.nearest ? ' (nearest)' : ''} slots [${r.slots.join(' ')}] field ${fmt(r.fIn)} / ${fmt(r.fOut)} luma ${fmt(r.lumaIn)} / ${fmt(r.lumaOut)} ratio ${fmt(ratio)} want ${fmt(want)} (field ${fmt(r.fIn / r.fOut)}) band ${band ? `${band.min}-${band.max} ${bandOk ? 'ok' : CS.bandStrict ? 'MISS' : 'off (report only)'}` : 'none'} meter ${fmt(r.meter.meter)} field ${fmt(r.meter.field)} ${ok ? 'ok' : 'MISS'} (${r.s} s)`);
    if (!shade) res.misses.push(`charshadow:${r.look}:${id}:no-shadow`);
    if (!ratioOk) res.misses.push(`charshadow:${r.look}:${id}:ratio`);
    if (!r.meter.ok) res.misses.push(`charshadow:${r.look}:${id}:meter`);
    if (CS.bandStrict && !bandOk) res.misses.push(`charshadow:${r.look}:${id}:band`);
    if (r.errors.length) res.fails.push(`charshadow ${r.look}: console errors: ${r.errors.slice(0, 3).join(' | ')}`);
    rows.push({ look: r.look, id, lamp: c.lamp, nearest: c.nearest, slots: r.slots, fIn: +r.fIn.toFixed(3), fOut: +r.fOut.toFixed(3), lumaIn: +r.lumaIn.toFixed(4), lumaOut: +r.lumaOut.toFixed(4), ratio: +ratio.toFixed(3), want: +want.toFixed(3), band: bandOk, meter: +r.meter.meter.toFixed(3), mfield: +r.meter.field.toFixed(3), ok, s: r.s });
  }
  // the same card on every page, and the three inside reads agree
  const ids = new Set(rows.map((r) => r.id));
  if (ids.size > 1) res.fails.push(`charshadow: the pages picked different cards (${[...ids].join(', ')})`);
  const ins = reads.map((r) => r.lumaIn);
  const spread = ins.length ? Math.max(...ins) - Math.min(...ins) : NaN;
  const agree = reads.length === CS_LOOKS.length && spread <= CS.agree;
  if (!agree) res.misses.push(`charshadow:agree:${fmt(spread)}`);
  console.log(`  cs inside reads ${ins.map((v) => fmt(v)).join(' / ')} spread ${fmt(spread)} (<= ${CS.agree}) ${agree ? 'ok' : 'MISS'}`);
  extra.push(`CHARSHADOW ${JSON.stringify({ looks: rows, spread: +spread.toFixed(4), agree, ok: agree && rows.length === CS_LOOKS.length && rows.every((r) => r.ok) && ids.size === 1 })}`);
}

/** One look of one part: launch, wait for the map (campus: every section's bake), freeze, pin the lights, read, unpin. */
async function runLook(spec, look, res) {
  const { browser, page, errors } = await launch({ url, params: `${spec.params}&${look.params}`, viewport: VIEWPORT });
  try {
    await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 240000 });
    await frames(page, 20);
    if (spec.bake) {
      const done = await page.evaluate(async () => {
        const sb = window.__app.current.world.lightBake?.sections;
        if (!sb) return 'cached';
        const all = (async () => { for (let k = 0; k < 5; k++) await sb.whenReady(k); return 'baked'; })();
        return Promise.race([all, new Promise((r) => setTimeout(() => r('timeout'), 240000))]);
      });
      if (done === 'timeout') throw new Error(`${look.name} ${spec.map}: the section bake did not finish in 240 s`);
      await frames(page, 10);
    }
    await page.evaluate(() => {
      const g = window.__app.current;
      g.photoFreeze(true);
      document.body.classList.add('photo-mode');
      g.player.rig.setEnabled(false);
      for (const e of g.enemyMgr?.enemies ?? []) e.bodyRig?.setEnabled(false);
    });
    await pinLights(page);
    if (spec.n === 4) await partWarehouse(page, look, res);
    else await partCards(page, look, res, spec);
    await unpinLights(page);
  } finally {
    // (the hardware driver warns about a program a disposed probe's material had in flight: as e2e-darkness)
    const bad = errors.filter((e) => !/favicon|net::ERR|WebSocket|webrtc|glGetProgramiv: Program object expected/i.test(e));
    if (bad.length) res.fails.push(`${look.name} ${spec.map}: console errors: ${bad.slice(0, 3).join(' | ')}`);
    await browser.close();
  }
}

const summaries = [];
let failed = false;
for (const spec of PARTS) {
  if (!want(spec.n)) continue;
  console.log(`parity part ${spec.n}: ${spec.map} ${spec.sections.map((s) => s.s).join(' ')}`);
  const res = { ...newResults(), fails: [] };
  const t0 = Date.now();
  for (const look of LOOKS) {
    const t1 = Date.now();
    try {
      await runLook(spec, look, res);
    } catch (e) {
      console.error(String(e));
      res.fails.push(`${look.name} ${spec.map}: ${String(e).split('\n')[0]}`);
    }
    console.log(`  ${look.name} part ${spec.n} took ${((Date.now() - t1) / 1000).toFixed(0)} s`);
  }
  // (char-shadow-meter S4) the character-shadow card, after the Warehouse's grey cards (its own pages)
  const extra = [];
  if (spec.n === 4) {
    const t2 = Date.now();
    try {
      await charShadowCard(res, extra);
    } catch (e) {
      console.error(String(e));
      res.fails.push(`charshadow: ${String(e).split('\n')[0]}`);
    }
    console.log(`  charshadow card took ${((Date.now() - t2) / 1000).toFixed(0)} s`);
  }
  res.s = Math.round((Date.now() - t0) / 1000);
  // (PLAN section 4) part 4 over 150 s with the card: the lead moves the card to its own part 5 (report only here)
  if (spec.n === 4 && res.s > 150) console.log(`  NOTE part 4 took ${res.s} s (over 150 s): move the character-shadow card to its own part`);
  for (const k of expiredKnown(KNOWN, now).filter((k) => k.map === spec.map)) res.fails.push(`KNOWN entry expired ${k.until}: ${k.map}:${k.section}:${k.row} near ${k.near} (${k.owner})`);
  summaries.push(summaryLine(spec.n, res), ...extra);
  if (res.misses.length || res.fails.length) {
    failed = true;
    for (const m of res.misses) console.log(`  MISS ${m}`);
    for (const f of res.fails) console.log(`  FAIL ${f}`);
  }
}
for (const s of summaries) console.log(s);
if (failed) {
  console.log('FAILED');
  process.exit(1);
}
