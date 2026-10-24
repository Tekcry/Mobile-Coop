// visual-gate VG7 noise CLI (docs/visual-gate/briefs/VG7.md; BRIEF A13, A24, A30). Pure work lives in noiseLib.mjs.
//   node scripts/visual-gate/noise.mjs spread <run1.json> <run2.json> <run3.json> [--out scripts/visual-gate/tolerances.mjs] [--md <file>]
//   node scripts/visual-gate/noise.mjs proof --fn F1..F8|F5b --bad <result.json> [--fixed <result.json>] [--bad-label x] [--fixed-label y]
// spread: refuses (exit 1) fewer than 2 runs or runs whose sha / renderer differ; prints the runs, the keys measured /
// missing, the self-compare (floors vs tolerances) and the noisy findings; --out writes tolerances.mjs, --md the same
// printout as markdown. proof: prints the proof table (exit 0, a report); usage errors exit 2.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PROOF_TARGETS, noisy, parityFor, proofRows, renderProof, renderTolerances, selfCompare, spreadOf, tolerancesFrom } from './noiseLib.mjs';

/** @typedef {import('./noiseLib.mjs').Run} Run */
/** @typedef {import('./metrics.mjs').Flag} Flag */

const USAGE = [
  'usage: node scripts/visual-gate/noise.mjs spread <run1.json> <run2.json> [<run3.json> ...] [--out <tolerances.mjs>] [--md <file>]',
  '       node scripts/visual-gate/noise.mjs proof --fn F1..F8|F5b --bad <result.json> [--fixed <result.json>] [--bad-label x] [--fixed-label y]',
].join('\n');

const VALUE_FLAGS = new Set(['--out', '--md', '--fn', '--bad', '--fixed', '--bad-label', '--fixed-label']);

/**
 * @param {string[]} argv
 * @returns {{ cmd: string, files: string[], opts: Record<string, string>, error: string | null }}
 */
export function parseArgs(argv) {
  const [cmd = '', ...rest] = argv;
  /** @type {string[]} */
  const files = [];
  /** @type {Record<string, string>} */
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const a = /** @type {string} */ (rest[i]);
    if (VALUE_FLAGS.has(a)) {
      const v = rest[i + 1];
      if (v === undefined || v.startsWith('--')) return { cmd, files, opts, error: `${a} needs a value` };
      opts[a.slice(2)] = v;
      i++;
    } else if (a.startsWith('--')) return { cmd, files, opts, error: `unknown option ${a}` };
    else files.push(a);
  }
  return { cmd, files, opts, error: null };
}

/** @param {string} file @returns {Run} */
function readRun(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** @param {number | null | undefined} v */
const f4 = (v) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(4) : '-');
/** @param {Flag} f */
const flagLine = (f) => `${f.key} ${f.region}.${f.metric} base ${f4(f.base)} now ${f4(f.cur)} tol ${f4(f.tol)}`;

/**
 * The spread report as sections of lines (printed plain, or as markdown for --md).
 * @param {Run[]} runs @param {string[]} names
 */
export function spreadReport(runs, names) {
  const spread = spreadOf(runs);
  const tolerances = tolerancesFrom(spread);
  const sc = selfCompare(runs, tolerances);
  const findings = noisy(spread, tolerances);
  /** @type {[string, string[]][]} */
  const sections = [];
  sections.push(['Runs', runs.map((r, i) => {
    const s = r.summary ?? {};
    const wall = typeof s.wallS === 'number' ? s.wallS : typeof (/** @type {any} */ (r).ms) === 'number' ? Math.round(/** @type {any} */ (r).ms / 100) / 10 : null;
    const errors = typeof s.errors === 'number' ? s.errors : (r.runErrors ?? []).length;
    return `run${i + 1} ${String(r.sha ?? '').slice(0, 8)} ${r.version ?? '-'} ${s.verdict ?? /** @type {any} */ (r).verdict ?? '-'} wall ${wall ?? '-'} s notRun ${(r.notRun ?? []).length} errors ${errors} (${names[i] ?? ''})`;
  })]);
  sections.push(['Keys', [
    `keys measured ${Object.keys(spread.keys).length}, missing ${spread.missing.length}; parity measured ${Object.keys(spread.parity).length}`,
    ...spread.missing.map((m) => `missing ${m}`),
  ]]);
  const fieldsWritten = Object.values(tolerances).reduce((n, t) => n + Object.keys(t).length, 0);
  sections.push(['Tolerances', [`${Object.keys(tolerances).length} keys with a field above floor (${fieldsWritten} fields)`]]);
  sections.push(['Self-compare', [
    `${sc.pairs} ordered pairs: floors ${sc.floors.length} flags, tolerances ${sc.tol.length} flags`,
    ...sc.floors.slice(0, 20).map((f) => `floors ${flagLine(f)}`),
    ...(sc.floors.length > 20 ? [`floors ... ${sc.floors.length - 20} more`] : []),
    ...sc.tol.slice(0, 20).map((f) => `tolerances ${flagLine(f)}`),
    ...(sc.tol.length > 20 ? [`tolerances ... ${sc.tol.length - 20} more`] : []),
  ]]);
  sections.push(['Noisy (findings for VG8)', findings.length ? findings : ['none']]);
  return { spread, tolerances, sections };
}

/** @param {[string, string[]][]} sections */
const plain = (sections) => sections.map(([h, ls]) => [`== ${h}`, ...ls].join('\n')).join('\n');
/** @param {[string, string[]][]} sections */
const markdown = (sections) => `${sections.map(([h, ls]) => [`### ${h}`, '', ...ls.map((l) => `- ${l}`)].join('\n')).join('\n\n')}\n`;

/** @param {string[]} files @param {Record<string, string>} opts @returns {number} */
function spreadCmd(files, opts) {
  if (files.length < 2) {
    console.error(`noise spread: needs at least 2 runs, got ${files.length}`);
    return 1;
  }
  const runs = files.map(readRun);
  const shas = [...new Set(runs.map((r) => String(r.sha ?? '')))];
  if (shas.length > 1) { console.error(`noise spread: runs of different shas: ${shas.join(' ')}`); return 1; }
  const rs = [...new Set(runs.map((r) => String(r.renderer ?? '').trim().replace(/\s+/g, ' ')))];
  if (rs.length > 1) { console.error(`noise spread: runs of different renderers: ${rs.join(' | ')}`); return 1; }
  const { spread, tolerances, sections } = spreadReport(runs, files);
  console.info(plain(sections));
  const first = /** @type {Run} */ (runs[0]);
  if (opts.out) {
    const text = renderTolerances({ spread, tolerances, source: { sha: first.sha, version: first.version, renderer: first.renderer, runs: runs.length, at: new Date().toISOString() } });
    writeFileSync(opts.out, text);
    console.info(`wrote ${opts.out}`);
  }
  if (opts.md) {
    writeFileSync(opts.md, markdown(sections));
    console.info(`wrote ${opts.md}`);
  }
  return 0;
}

/** @param {string} rel the module next to this file */
const sibling = (rel) => new URL(rel, import.meta.url);

/** @param {string[]} files @param {Record<string, string>} opts @returns {Promise<number>} */
async function proofCmd(files, opts) {
  const fn = opts.fn ?? '';
  if (!Object.prototype.hasOwnProperty.call(PROOF_TARGETS, fn)) {
    console.error(`noise proof: --fn must be one of ${Object.keys(PROOF_TARGETS).join(', ')}\n${USAGE}`);
    return 2;
  }
  if (!opts.bad || files.length) {
    console.error(`noise proof: ${opts.bad ? `unexpected argument ${files[0]}` : '--bad <result.json> is required'}\n${USAGE}`);
    return 2;
  }
  for (const f of [opts.bad, opts.fixed]) {
    if (f && !existsSync(f)) { console.error(`noise proof: no such file ${f}`); return 2; }
  }
  const vp = await import(sibling('./viewpoints.mjs').href);
  const items = [...vp.VIEWS, ...vp.RIGS];
  /** @type {Record<string, any>} */
  let tolerances = {};
  /** @type {any} */
  let spread = null;
  const tolUrl = sibling('./tolerances.mjs');
  if (existsSync(fileURLToPath(tolUrl))) {
    const m = await import(tolUrl.href);
    tolerances = m.TOLERANCES ?? {};
    spread = m.SPREAD ?? null;
  } else {
    console.info('WARN tolerances.mjs absent (VG7 phase 2 not run): floors used, sd null');
  }
  const bad = readRun(opts.bad);
  const fixed = opts.fixed ? readRun(opts.fixed) : null;
  const rows = proofRows(fn, bad, fixed, { spread, tolerances, items });
  const badLabel = opts['bad-label'] ?? 'bad';
  const fixedLabel = opts['fixed-label'] ?? 'fixed';
  console.info(renderProof(rows, { bad: parityFor(fn, bad, items), fixed: parityFor(fn, fixed, items) }, { fn, badLabel, fixedLabel }));
  return 0;
}

/** @param {string[]} [argv] @returns {Promise<number>} the exit code */
export async function main(argv = process.argv.slice(2)) {
  const { cmd, files, opts, error } = parseArgs(argv);
  if (error) { console.error(`noise: ${error}\n${USAGE}`); return 2; }
  try {
    if (cmd === 'spread') return spreadCmd(files, opts);
    if (cmd === 'proof') return await proofCmd(files, opts);
  } catch (e) {
    console.error(`noise ${cmd}: ${/** @type {Error} */ (e).message ?? String(e)}`);
    return 1;
  }
  console.error(USAGE);
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then((code) => { process.exitCode = code; });
}
