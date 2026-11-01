#!/usr/bin/env node
// map-ready S1: the load baseline (report only; never asserts). Reads `window.__mapReady` (`src/core/mapReadyStats.ts`,
// written by GameState) after each load: seconds to the reveal, the load's steps and programs, what still builds in the
// 10 s after the reveal (programs, lamp landings, atlas uploads, materials, pop-ins, frame intervals), the bake source,
// the bake's ms and the heap. GPU numbers only with `E2E_GPU=1` (software GL otherwise: never quote it).
// Usage (repo root, a built dist/ served on E2E_PORT, default 4189):
//   node scripts/map-ready-measure.mjs [--out <file.json>] [--gated] [--maps ctcourse,warehouse]
//     [--runs cold] [--compile-order serial]
// (map-ready S14) `--runs cold`: only each map's cold run. `--compile-order serial`: the gate's S2 compile order
// (`compileorder=serial`; default parallel, cut A). After each run's after-window the script waits for the compile log
// (`window.__compileLog`, `src/core/compileLog.ts`) to close (up to 150 s more; a warning if it does not), keeps it in the
// row's `compile`, and prints per run its summary, peak in flight, the group start times and the 8 longest programs.
// Per map: a cold run (a new browser: fresh profile, no bake cache, no GPU program cache), 3 cached runs (reload in the
// same context), a repeat run in the same page (quit to the menu, `__play` the same map), then the next map in the list
// in that page (row `<next> | after <map>`; with one `--maps` entry the next from all maps).
// Output: the JSON (`--out`) and a markdown table on stdout. The lead runs it on the laptop (map-ready S1 step 6).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { GPU, launch } from './e2e-lib.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const has = (k) => argv.includes(k);

const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const GATED = has('--gated');
/** (S14) Only the cold run per map. */
const COLD_ONLY = arg('--runs', 'all') === 'cold';
/** (S14) The gate's compile order: 'serial' adds `compileorder=serial` (S2's order); default parallel. */
const SERIAL = arg('--compile-order', 'parallel') === 'serial';
/** (S14) ms after the after-window the compile log may take to close. */
const COMPILE_TIMEOUT = 150000;
const OUT = arg('--out', null);
/** ms past the reveal the after-window may take (it closes 10 s after the reveal on a rendering page). */
const AFTER_TIMEOUT = 60000;
/** ms a load may take to reach its reveal (a cold bake included). */
const LOAD_TIMEOUT = 300000;

const ALL = [
  { map: 'ctcourse', mode: 'course', params: 'autostart=ctcourse&mode=course&course=solo' },
  { map: 'warehouse', mode: 'clear', params: 'autostart=warehouse&mode=clear' },
];
const pick = arg('--maps', null)?.split(',');
const MAPS = pick ? ALL.filter((m) => pick.includes(m.map)) : ALL;
const extra = `${GATED ? '&mapready=1' : ''}${SERIAL ? '&compileorder=serial' : ''}`;
const paramsOf = (m) => `${m.params}&gfx=epic${extra}`;

/** Poll `fn(arg)` on `page` from here every 250 ms (a background page's in-page polling stops) until true. */
async function poll(page, fn, a, timeout, what) {
  const t0 = Date.now();
  for (;;) {
    if (await page.evaluate(`!!(${fn})(${JSON.stringify(a) ?? 'undefined'})`).catch(() => false)) return;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** The current load's record once its after-window closed (a record object copied out of the page), with (S14) the compile
 *  log in `compile` once it closed (or as it stands after COMPILE_TIMEOUT, with a warning; null when the page has none). */
async function record(page, what) {
  await poll(page, () => !!window.__mapReady && window.__mapReady.released, null, LOAD_TIMEOUT, `${what}: the reveal`);
  await poll(page, () => window.__mapReady.after.done, null, AFTER_TIMEOUT, `${what}: the after-window`);
  const r = await page.evaluate(() => JSON.parse(JSON.stringify(window.__mapReady)));
  try {
    await poll(page, () => !window.__compileLog || window.__compileLog.done, null, COMPILE_TIMEOUT, `${what}: the compile log`);
  } catch {
    console.log(`  warning: ${what}: the compile log did not close within ${COMPILE_TIMEOUT / 1000} s after the after-window (kept as it stands)`);
  }
  r.compile = await page.evaluate(() => (window.__compileLog ? JSON.parse(JSON.stringify(window.__compileLog)) : null));
  return r;
}

/** (S14) The compile log's summary line from its record (the same text as `CompileLog.summary`, with no pending clock). */
function compileSummary(c) {
  const s = (ms) => (ms / 1000).toFixed(1);
  let sum = 0;
  let first = Infinity;
  let last = -Infinity;
  let longest = null;
  for (const e of c.entries) {
    if (e.readyMs < 0) continue;
    sum += e.ms;
    first = Math.min(first, e.startMs);
    last = Math.max(last, e.readyMs);
    if (!longest || e.ms > longest.ms) longest = e;
  }
  let out = `${c.entries.length} programs, peak ${c.peakInFlight} at once`;
  out += longest ? `, longest ${longest.kind} ${s(longest.ms)} s, sum ${s(sum)} s over ${s(last - first)} s` : ', none finished';
  if (c.pending > 0) out += `, ${c.pending} pending`;
  return out;
}

/** (S14) The `n` longest programs, longest first, pending ones last. */
function compileTop(c, n) {
  const done = c.entries.filter((e) => e.readyMs >= 0).sort((a, b) => b.ms - a.ms);
  return [...done, ...c.entries.filter((e) => e.readyMs < 0)].slice(0, n);
}

const rows = [];
const fail = [];
function keep(map, run, r) {
  rows.push({ map, run, ...r });
  console.log(`  ${map} ${run}: reveal ${(r.revealMs / 1000).toFixed(1)} s, bake ${r.bakeSource}`);
  if (r.compile) console.log(`    compiles: ${compileSummary(r.compile)}`);
}

/** Quit to the menu and start `m` again in the same page (`__play`); the record is cleared first. */
async function repeat(page, m) {
  await page.evaluate(() => {
    window.__mapReady = null;
    window.__compileLog = null;
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
    if (COLD_ONLY) return;
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

/** (S14) Per run: the compile log's summary, peak in flight, group start times and the 8 longest programs. */
function compileTables() {
  const out = [];
  for (const r of rows) {
    const c = r.compile;
    out.push(`### ${r.map} ${r.run}`);
    if (!c) {
      out.push('no compile log\n');
      continue;
    }
    const groups = Object.entries(c.groups ?? {}).map(([k, v]) => `${k} ${f1(v)}`).join(', ') || '-';
    out.push(`${compileSummary(c)}; order ${c.order}; peak in flight ${c.peakInFlight}; groups (s): ${groups}${c.done ? '' : ' (log not closed)'}`);
    out.push('');
    out.push('| Kind | s | Frag chars | In flight | Early | Failed |');
    out.push('| --- | --- | --- | --- | --- | --- |');
    for (const e of compileTop(c, 8)) out.push(`| ${e.kind} | ${f1(e.ms)} | ${e.fragChars} | ${e.inFlight} | ${e.early ? 'yes' : ''} | ${e.failed ? 'yes' : ''} |`);
    out.push('');
  }
  return out.join('\n');
}

async function main() {
  console.log(`map-ready measure on ${URL}${GPU ? ' (E2E_GPU=1)' : ' (software GL: timings are not the GPU numbers)'}${GATED ? ', gated (mapready=1)' : ''}${SERIAL ? ', compile order serial' : ''}${COLD_ONLY ? ', cold runs only' : ''}`);
  for (const m of MAPS) await perMap(m);
  const res = { url: URL, gpu: GPU, gated: GATED, compileOrder: SERIAL ? 'serial' : 'parallel', runs: COLD_ONLY ? 'cold' : 'all', at: new Date().toISOString(), rows, failures: fail };
  if (OUT) {
    mkdirSync(dirname(resolve(OUT)), { recursive: true });
    writeFileSync(resolve(OUT), JSON.stringify(res, null, 1) + '\n');
  }
  console.log(`\n${table()}\n`);
  console.log(`## Compile logs (map-ready S14)\n\n${compileTables()}`);
  if (fail.length) console.log(`not measured (${fail.length}):\n${fail.map((f) => `- ${f}`).join('\n')}`);
  if (OUT) console.log(`wrote ${resolve(OUT)}`);
}

main().then(() => process.exit(0), (e) => {
  console.error(`map-ready-measure: ${String(e?.stack ?? e)}`);
  process.exit(2);
});
