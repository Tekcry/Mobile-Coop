#!/usr/bin/env node
// map-ready S1: the load baseline (report only; never asserts). Reads `window.__mapReady` (`src/core/mapReadyStats.ts`,
// written by GameState) after each load: seconds to the reveal, the load's steps and programs, what still builds in the
// 10 s after the reveal (programs, lamp landings, atlas uploads, materials, pop-ins, frame intervals), the bake source,
// the bake's ms and the heap. GPU numbers only with `E2E_GPU=1` (software GL otherwise: never quote it).
// Usage (repo root, a built dist/ served on E2E_PORT, default 4189):
//   node scripts/map-ready-measure.mjs [--out <file.json>] [--gated] [--maps campusOps,ctcourse,warehouse] [--skip-a16]
// Per map: a cold run (a new browser: fresh profile, no bake cache, no GPU program cache), 3 cached runs (reload in the
// same context), a repeat run in the same page (quit to the menu, `__play` the same map), then the next map in the list
// in that page (row `<next> | after <map>`; with one `--maps` entry the next from all maps). Then the A16 rows on campusOps:
// (a) a solo restart (`cb.restart()`, seed + 1) and (b) a co-op start after a solo bake (net=local, two pages).
// Output: the JSON (`--out`) and a markdown table on stdout. The lead runs it on the laptop (map-ready S1 step 6).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { GPU, launch, openPage } from './e2e-lib.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const has = (k) => argv.includes(k);

const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const GATED = has('--gated');
const OUT = arg('--out', null);
/** ms past the reveal the after-window may take (it closes 10 s after the reveal on a rendering page). */
const AFTER_TIMEOUT = 60000;
/** ms a load may take to reach its reveal (a cold campus bake included). */
const LOAD_TIMEOUT = 300000;

const ALL = [
  { map: 'campusOps', mode: 'sector', params: 'autostart=campusOps&mode=sector' },
  { map: 'ctcourse', mode: 'course', params: 'autostart=ctcourse&mode=course&course=solo' },
  { map: 'warehouse', mode: 'clear', params: 'autostart=warehouse&mode=clear' },
];
const pick = arg('--maps', null)?.split(',');
const MAPS = pick ? ALL.filter((m) => pick.includes(m.map)) : ALL;
const paramsOf = (m) => `${m.params}&gfx=epic${GATED ? '&mapready=1' : ''}`;

/** Poll `fn(arg)` on `page` from here every 250 ms (a background page's in-page polling stops) until true. */
async function poll(page, fn, a, timeout, what) {
  const t0 = Date.now();
  for (;;) {
    if (await page.evaluate(`!!(${fn})(${JSON.stringify(a) ?? 'undefined'})`).catch(() => false)) return;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** The current load's record once its after-window closed (a record object copied out of the page). */
async function record(page, what) {
  await poll(page, () => !!window.__mapReady && window.__mapReady.released, null, LOAD_TIMEOUT, `${what}: the reveal`);
  await poll(page, () => window.__mapReady.after.done, null, AFTER_TIMEOUT, `${what}: the after-window`);
  return page.evaluate(() => JSON.parse(JSON.stringify(window.__mapReady)));
}

const rows = [];
const fail = [];
function keep(map, run, r) {
  rows.push({ map, run, ...r });
  console.log(`  ${map} ${run}: reveal ${(r.revealMs / 1000).toFixed(1)} s, bake ${r.bakeSource}`);
}

/** Quit to the menu and start `m` again in the same page (`__play`); the record is cleared first. */
async function repeat(page, m) {
  await page.evaluate(() => {
    window.__mapReady = null;
    window.__app.current.cb.quit();
  });
  await poll(page, () => !!document.querySelector('.main-menu'), null, 60000, 'the main menu');
  await page.evaluate(([map, mode]) => window.__play(map, mode), [m.map, m.mode]);
}

async function perMap(m) {
  console.log(`map-ready measure: ${m.map} (${paramsOf(m)})`);
  const { browser, page, errors } = await launch({ url: URL, params: paramsOf(m) });
  try {
    keep(m.map, 'cold', await record(page, `${m.map} cold`));
    for (let k = 1; k <= 3; k++) {
      await page.reload();
      keep(m.map, `cached ${k}`, await record(page, `${m.map} cached ${k}`));
    }
    await repeat(page, m);
    keep(m.map, 'repeat', await record(page, `${m.map} repeat`));
    // the next map in the same warm page (map to map, the baseline for keeping actors and shaders between maps)
    const list = MAPS.length > 1 ? MAPS : ALL;
    const next = list[(list.findIndex((x) => x.map === m.map) + 1) % list.length];
    if (next.map !== m.map) {
      await repeat(page, next);
      keep(next.map, `after ${m.map}`, await record(page, `${next.map} after ${m.map}`));
    }
  } catch (e) {
    fail.push(`${m.map}: ${String(e?.message ?? e)}`);
  } finally {
    if (errors.length) console.log(`  (${errors.length} console errors on ${m.map}; first: ${errors[0]})`);
    await browser.close();
  }
}

/** A16 (a): after a cold campus load and its section bake, a solo restart (seed + 1) reads its bake source. */
async function a16Restart() {
  const m = ALL[0];
  console.log('map-ready measure: A16 (a) campusOps solo restart');
  const { browser, page } = await launch({ url: URL, params: paramsOf(m) });
  try {
    await record(page, 'A16 (a) first load');
    await poll(page, () => { const s = window.__app.current?.world.lightBake?.sections; return !s || s.done; }, null, LOAD_TIMEOUT, 'the section bake');
    await page.evaluate(() => {
      window.__mapReady = null;
      window.__app.current.cb.restart();
    });
    keep(m.map, 'A16 solo restart', await record(page, 'A16 (a) restart'));
  } catch (e) {
    fail.push(`A16 (a): ${String(e?.message ?? e)}`);
  } finally {
    await browser.close();
  }
}

/**
 * A16 (b): page A plays campus solo until its section bake is written, quits, hosts; page B joins; the host starts
 * Sector Ops on campusOps; both pages' bake source. (The steps of `hostAndJoin` / `startMode`, scripts/e2e-net-lib.mjs,
 * copied: that file is not imported.)
 */
async function a16Coop() {
  console.log('map-ready measure: A16 (b) campusOps co-op start');
  const q = `net=local&gfx=epic${GATED ? '&mapready=1' : ''}`;
  const { browser, ctx, page: A } = await launch({ url: URL, params: q });
  try {
    await poll(A, () => typeof window.__play === 'function', null, 60000, 'the menu');
    await A.evaluate(() => window.__play('campusOps', 'sector'));
    await poll(A, () => !!window.__mapReady && window.__mapReady.released, null, LOAD_TIMEOUT, 'A16 (b) solo load');
    await poll(A, () => { const s = window.__app.current?.world.lightBake?.sections; return !s || s.done; }, null, LOAD_TIMEOUT, 'the section bake');
    await A.evaluate(() => window.__app.current.cb.quit());
    await poll(A, () => !!document.querySelector('.main-menu'), null, 60000, 'the main menu');
    // host a room, B joins with the code (hostAndJoin)
    await A.click('.main-menu .btn:has-text("Co-op")');
    await A.click('.btn:has-text("Host a room")');
    await poll(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 15000, 'host lobby');
    const code = await A.evaluate(() => window.__coop.session.code);
    const { page: B } = await openPage(ctx, URL, q);
    await B.click('.main-menu .btn:has-text("Co-op")');
    await B.click('.btn:has-text("Join with code")');
    await B.keyboard.type(code.toLowerCase());
    await B.keyboard.press('Enter');
    await poll(A, (k) => window.__coop.session.players.size === k, 2, 15000, 'host sees client');
    // start the match (startMode)
    for (const P of [A, B]) await P.evaluate(() => { window.__mapReady = null; });
    await A.evaluate(([m, mp]) => window.__coop.session.setSettings(m, mp, 'normal', ''), ['sector', 'campusOps']);
    await B.evaluate(() => window.__coop.session.setReady(true));
    await poll(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready');
    await A.evaluate(() => window.__coop.session.startMatch());
    for (const [P, who] of [[A, 'host'], [B, 'client']]) {
      await poll(P, () => !!window.__mapReady && window.__mapReady.released, null, LOAD_TIMEOUT, `A16 (b) ${who} load`);
      keep('campusOps', `A16 co-op ${who}`, await P.evaluate(() => JSON.parse(JSON.stringify(window.__mapReady))));
    }
  } catch (e) {
    fail.push(`A16 (b): ${String(e?.message ?? e)}`);
  } finally {
    await browser.close();
  }
}

const f1 = (v) => (typeof v === 'number' && v >= 0 ? (v / 1000).toFixed(1) : '-');
const f0 = (v) => (typeof v === 'number' ? Math.round(v).toString() : '-');

function table() {
  const out = [];
  out.push('| Map | Run | Reveal s | Steps (s) | Load programs | After: programs / shader frames / landings / uploads / materials / pop-ins | Frame p50 / p95 / max ms | Bake | Bake ms | Heap MB |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    const a = r.after ?? {};
    const steps = Object.entries(r.steps ?? {}).map(([k, v]) => `${k} ${f1(v)}`).join(', ');
    const after = a.done ? `${a.programs} / ${a.shaderFrames} / ${a.landings} / ${a.tileUploads} / ${a.materials} / ${a.popIns}` : '- (window not closed)';
    const fr = a.done ? `${f0(a.p50)} / ${f0(a.p95)} / ${f0(a.max)}` : '-';
    out.push(`| ${r.map} | ${r.run} | ${f1(r.revealMs)} | ${steps} | ${r.loadPrograms} | ${after} | ${fr} | ${r.bakeSource} | ${f0(r.bakeMs)} | ${f0(r.heapMb)} |`);
  }
  return out.join('\n');
}

async function main() {
  console.log(`map-ready measure on ${URL}${GPU ? ' (E2E_GPU=1)' : ' (software GL: timings are not the GPU numbers)'}${GATED ? ', gated (mapready=1)' : ''}`);
  for (const m of MAPS) await perMap(m);
  if (!has('--skip-a16')) {
    await a16Restart();
    await a16Coop();
  }
  const res = { url: URL, gpu: GPU, gated: GATED, at: new Date().toISOString(), rows, failures: fail };
  if (OUT) {
    mkdirSync(dirname(resolve(OUT)), { recursive: true });
    writeFileSync(resolve(OUT), JSON.stringify(res, null, 1) + '\n');
  }
  console.log(`\n${table()}\n`);
  if (fail.length) console.log(`not measured (${fail.length}):\n${fail.map((f) => `- ${f}`).join('\n')}`);
  if (OUT) console.log(`wrote ${resolve(OUT)}`);
}

main().then(() => process.exit(0), (e) => {
  console.error(`map-ready-measure: ${String(e?.stack ?? e)}`);
  process.exit(2);
});
