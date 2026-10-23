// node scripts/operators/check-guards.mjs [dir] [--kit file] [--json] - the guard budget check (guard-models G4b,
// docs/guard-models/PLAN.md section 5). Reads every `<dir>/lods/guard-*.report.json` that bake_lods.py guard mode wrote
// (default dir: the GB bake out dir, guard-bake.mjs DEFAULT_OUT), checks each against section 5 and the kit's piece caps
// (src/operators/guards/guardBudget.ts `checkGuardReport`) and prints the problems. An expected report that is absent
// (one per base, one per own-GLB piece) is listed as a note, not a problem, so a partial bake (`--only`) can be checked;
// tests/guardAssets.test.ts requires the full set once the GLBs are bundled. Exit 0 when every report found is within
// budget, 1 on any problem, 2 when there is nothing to check (no lods folder, no report) or on a bad argument.
// --json prints one JSON object instead of the lines: { dir, kit, reports: [{ file, problems }], missing, problems, pass }.
import './ts-resolve.mjs';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_OUT } from './guard-bake.mjs';
import { ROOT } from './paths.mjs';

// TypeScript through Node's type stripping; ts-resolve.mjs (imported above) resolves guardBudget.ts's extensionless imports
const { checkGuardReport, guardReportFiles } = await import('../../src/operators/guards/guardBudget.ts');

const REPORT = /^guard-.+\.report\.json$/;

function parseArgs(argv) {
  const o = { dir: DEFAULT_OUT, kit: path.join(ROOT, 'scripts/operators/data/guards.json'), json: false };
  let dirSet = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--kit') {
      if (argv[i + 1] === undefined) throw new Error('--kit needs a file');
      o.kit = argv[++i];
    } else if (a === '--help' || a === '-h') o.help = true;
    else if (a.startsWith('-')) throw new Error(`unknown option ${a}`);
    else if (dirSet) throw new Error(`one dir only (got ${o.dir} and ${a})`);
    else { o.dir = a; dirSet = true; }
  }
  return o;
}

/** Runs the check; returns { exit, result } (result is the --json object). */
export function run(opts) {
  const dir = path.resolve(opts.dir);
  const lods = path.join(dir, 'lods');
  const result = { dir, kit: opts.kit, reports: [], missing: [], problems: 0, pass: false };
  const kit = JSON.parse(readFileSync(opts.kit, 'utf8'));
  const files = existsSync(lods) ? readdirSync(lods).filter((f) => REPORT.test(f)).sort() : [];
  if (!files.length) {
    result.error = existsSync(lods) ? `no guard-*.report.json in ${lods}` : `no lods folder: ${lods}`;
    return { exit: 2, result };
  }
  for (const f of files) {
    let problems;
    try {
      problems = checkGuardReport(JSON.parse(readFileSync(path.join(lods, f), 'utf8')), kit);
    } catch (e) {
      problems = [`not readable JSON: ${String(e?.message ?? e).split('\n')[0]}`];
    }
    result.reports.push({ file: `lods/${f}`, problems });
    result.problems += problems.length;
  }
  result.missing = guardReportFiles(kit).filter((rel) => !files.includes(path.basename(rel)));
  result.pass = result.problems === 0;
  return { exit: result.pass ? 0 : 1, result };
}

function print(result, log = console.info) {
  if (result.error) {
    log(`guard check: ${result.error}`);
    return;
  }
  for (const r of result.reports) {
    log(`guard check: ${r.file} ${r.problems.length ? `FAIL (${r.problems.length})` : 'PASS'}`);
    for (const p of r.problems) log(`  ${p}`);
  }
  for (const m of result.missing) log(`guard check: ${m} not found (note: not baked here; the full bake writes one per base and per own-GLB piece)`);
  log(`guard check: ${result.reports.length} reports, ${result.problems} problems: ${result.pass ? 'PASS' : 'FAIL'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`check-guards: ${e.message}\nusage: node scripts/operators/check-guards.mjs [dir] [--kit file] [--json]`);
    process.exit(2);
  }
  if (opts.help) {
    console.info('usage: node scripts/operators/check-guards.mjs [dir (default the guard bake out dir)] [--kit file] [--json]');
    process.exit(0);
  }
  const { exit, result } = run(opts);
  if (opts.json) console.info(JSON.stringify(result, null, 1));
  else print(result);
  process.exit(exit);
}
