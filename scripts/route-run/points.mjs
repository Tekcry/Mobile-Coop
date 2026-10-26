// route-run points (J13 R6, docs/route-runs/PLAN.md "R6 Points from the V6 port"): the points table R1's planner reads,
// checked against the graph it plans, and one way to make it. The table is J12's one resolver's output,
// `resolvePoints` (src/world/levelMeasure.ts), as `node scripts/level-measure.mjs <graphs> --points <out.json>` writes it:
//   `{ geom, spaces: [{ id, section, storey, floorY, boxes, centre, cells }], links: [{ from, to, kind, route, at, atFrom,
//      gaps, measured }] (merged index), errors: [] }`.
// Links are keyed by their merged index (`mergeGraphs`, the validator's file order), so a table made on other files, in
// another order or on an edited graph would put a point on the wrong link: `checkPoints` refuses it (geom, link count,
// each index's from / to / kind). No fallbacks: PLAN's fallbacks (J12's lower exports, then approximate points marked
// `approx`) apply only if J12 shipped no resolver; it shipped `resolvePoints`, so there are none here.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeGraphs } from '../level-validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** The level-measure call of `loadPoints(... src: 'auto')`: one map build and nav, no light (minutes, not hours). */
export const MEASURE_SCRIPT = 'scripts/level-measure.mjs';
const MEASURE_TIMEOUT_MS = 15 * 60 * 1000;
/** At most this many per-index link problems are listed; the rest are counted. */
const MAX_LINK_PROBLEMS = 5;

const linkText = (l) => `${l?.from} -> ${l?.to} (${l?.kind})`;

/**
 * Whether `table` belongs to the merged `graphs` (the parsed graph files in CLI order). Pure.
 * `problems`: the table cannot be used (one plain sentence each, naming the fix). `notes`: the table is usable, but some
 * runs will be `unplannable` (R1 says why per run; these say it up front), and the table's own `errors` lines.
 */
export function checkPoints(table, graphs) {
  const problems = [];
  const notes = [];
  if (!table || typeof table !== 'object' || !Array.isArray(table.spaces) || !Array.isArray(table.links)) {
    problems.push('the points file is not a level-measure --points table');
    return { problems, notes };
  }
  const graph = mergeGraphs(graphs);
  const geom = graph.meta?.measured?.geom;
  if (geom === undefined || geom === null) notes.push("the graph is not measured: the points table's geom was not checked");
  else if (geom !== table.geom) {
    problems.push(`the points table was made on another build of the map (geom ${table.geom}, the graph says ${geom}): run level-measure --points again`);
  }

  const n = table.links.length;
  const m = graph.links.length;
  if (n !== m) problems.push(`the points table has ${n} links, the merged graph ${m}: same files, same order?`);
  const wrong = [];
  for (let i = 0; i < Math.min(n, m); i++) {
    const t = table.links[i];
    const g = graph.links[i];
    if (t?.from !== g.from || t?.to !== g.to || t?.kind !== g.kind) wrong.push(`link ${i}: table ${linkText(t)}, graph ${linkText(g)}`);
  }
  problems.push(...wrong.slice(0, MAX_LINK_PROBLEMS));
  if (wrong.length > MAX_LINK_PROBLEMS) problems.push(`and ${wrong.length - MAX_LINK_PROBLEMS} more`);

  const tableSpaces = new Map(table.spaces.map((s) => [s?.id, s]));
  for (const s of graph.spaces) {
    if (s.area !== undefined && !tableSpaces.has(s.id)) notes.push(`space ${s.id} has an area but is not in the points table: runs through it are unplannable`);
  }
  for (const s of table.spaces) {
    if (!Array.isArray(s?.centre)) notes.push(`space ${s?.id} has no centre in the points table: runs through it are unplannable`);
  }
  table.links.forEach((l, i) => {
    if (l?.at === null) notes.push(`link ${i} (${linkText(l)}) has no point: runs through it are unplannable`);
  });
  if (Array.isArray(table.errors)) notes.push(...table.errors.map(String));
  return { problems, notes };
}

/**
 * The points table for a run: `src` a JSON path, or `'auto'` to make it with level-measure (`files`, the graph paths in
 * CLI order, into a temp file; through `run(cmd, args)`, default `execFileSync`, so a test needs no Vite). Either way
 * `checkPoints` runs against `graphs` (the parsed files): any problem throws an `Error` listing them (the harness
 * refuses the run, exit 2); the notes come back on `table.notes`.
 */
export function loadPoints({ graphs, files, src, run = defaultRun }) {
  let table;
  if (src === 'auto') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-run-points-'));
    const out = path.join(dir, 'points.json');
    try {
      run(process.execPath, [MEASURE_SCRIPT, ...files, '--points', out]);
      table = readTable(out);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } else table = readTable(src);
  const { problems, notes } = checkPoints(table, graphs);
  if (problems.length) throw new Error(`route-run: the points table ${src === 'auto' ? '(made by level-measure)' : src} does not fit the graph:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  table.notes = notes;
  return table;
}

function readTable(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`route-run: the points file ${file} could not be read: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function defaultRun(cmd, args) {
  execFileSync(cmd, args, { cwd: ROOT, windowsHide: true, timeout: MEASURE_TIMEOUT_MS, stdio: ['ignore', 'inherit', 'inherit'] });
}
