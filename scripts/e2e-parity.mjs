// Light parity (J11 light-parity C1, G391 / bible L5, Q27 "Yes, every release"): on every carded map at Low and Epic, a matte 50%
// grey card at points whose field level matches a DARK_TARGETS row (0.12, 0.27, 0.40, 0.70) reads as display luminance inside the
// row's band, and the light meter equals the field there (0.02), with every moving light held still (`pinLights`).
// Carded: ctcourse (Marlow Yard). Not carded: kestrel, seclab / courselab (J11 BRIEF A1, A5).
//   parts: 3 ctcourse (`--part=N`, none = all; parts 1-2, Saltmarsh Park, left in clean-up F; part 4, the Warehouse and the
//   character-shadow card on it, in clean-up H); each runs Low then Epic.
//   lines: `<look> <id> level <l> luma <v> band <min>-<max> ok|MISS|KNOWN MISS (...)`, `<look> <id> meter <m> field <f> ok|MISS`,
//   and per part `PARITY-SUMMARY {"part", "cards", "meter", "known", "misses", "s"}` (the walk card's "Light parity" source).
// Reads final pixels: E2E_GPU=1 only. Helpers and unit-tested pure parts: `parity-lib.mjs` / `tests/parityLib.test.ts`.
import { launch, frames, GPU } from './e2e-lib.mjs';
import { DARK_TARGETS, addCard, addMeter, cardId, expiredKnown, findCards, inBand, knownFor, measure, meterRow, newResults, pickCards, pinLights, rowFor, summaryLine, unpinLights } from './parity-lib.mjs';

if (!GPU) {
  console.log('E2E ERROR: e2e-parity reads final pixels: E2E_GPU=1 only');
  process.exit(1);
}

const url = process.argv[2] ?? 'http://localhost:4173/';
const PART = Number(process.argv.find((a) => a.startsWith('--part='))?.slice(7) ?? 0);
const want = (n) => PART === 0 || PART === n;
// one launch each, a fresh profile (every per-preset setting at its default)
const LOOKS = [
  { name: 'low', params: 'gfx=low' },
  { name: 'epic', params: 'gfx=epic' },
];
const VIEWPORT = { width: 640, height: 360 };
const ROWS = DARK_TARGETS.map((t) => t.level);

/**
 * (A2) Known misses: a miss already measured and triaged may sit here while its fix lands; it prints `KNOWN MISS` on every run and
 * the run fails once its `until` passes. Entries `{ map, section, row, near: [x, z], r, conf, owner, until }` (section `S1`..`S5`,
 * `all` on ctcourse; row 0.12 / 0.27 / 0.4 / 0.7; `until` an ISO date at most 7 days out). Added by the lead only,
 * from a measured run.
 */
const KNOWN = [];

const PARTS = [
  { n: 3, map: 'ctcourse', params: 'autostart=ctcourse&mode=course', sections: [{ s: 'all', rect: null, min: 8 }], bake: false },
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
    // (char-shadow-meter S4 triage) the part's measured level -> luma transfer: the character-shadow card's reference
    (res.curve ??= []).push({ look: look.name, level: c.level, luma: m.luma });
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
    await partCards(page, look, res, spec);
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
  res.s = Math.round((Date.now() - t0) / 1000);
  for (const k of expiredKnown(KNOWN, now).filter((k) => k.map === spec.map)) res.fails.push(`KNOWN entry expired ${k.until}: ${k.map}:${k.section}:${k.row} near ${k.near} (${k.owner})`);
  summaries.push(summaryLine(spec.n, res));
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
