// Visual gate baseline CLI (docs/visual-gate/PLAN.md section 5, BRIEF A9). Reads and writes the `visual-baselines`
// data branch on origin through store.mjs (git plumbing only; the working tree, index and HEAD are never touched).
//   node scripts/visual-gate/baseline.mjs list
//   node scripts/visual-gate/baseline.mjs show <sha>
//   node scripts/visual-gate/baseline.mjs accept --sha <sha> --by <name> --why <text> [--only k,k] [--dry-run]
// accept: the run is found by full sha or a unique prefix (7+ hex); refuses an unrecorded run, a blank --why / --by
// and an --only key the run does not have (exit 1).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { acceptPath, acceptRecord, cmpSemver, parseArgs } from './storeLib.mjs';
import { fetchStore, readRecords, recordAccept } from './store.mjs';

/** @typedef {import('./storeLib.mjs').Records} Records */
/** @typedef {import('./storeLib.mjs').RunRecord} RunRecord */

const USAGE = 'usage: node scripts/visual-gate/baseline.mjs list | show <sha> | accept --sha <sha> --by <name> --why <text> [--only k,k] [--dry-run]';

/**
 * The run with that full sha or unique prefix (7+ hex); null when none; throws when the prefix is ambiguous.
 * @param {Records} records @param {string | null} sha @returns {RunRecord | null}
 */
export function findRun(records, sha) {
  const s = String(sha ?? '').toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(s)) return null;
  const hits = records.runs.filter((r) => typeof r.sha === 'string' && r.sha.startsWith(s));
  if (hits.length > 1) throw new Error(`sha prefix ${s} matches ${hits.length} runs: ${hits.map((r) => r.sha.slice(0, 12)).join(' ')}`);
  return hits[0] ?? null;
}

/** @param {RunRecord} a @param {RunRecord} b */
function byVersionThenAt(a, b) {
  let c = 0;
  try { c = cmpSemver(a.version, b.version); } catch { c = String(a.version).localeCompare(String(b.version)); }
  return c || String(a.at).localeCompare(String(b.at));
}

/** @param {string[]} argv @returns {number} the exit code */
export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.cmd === 'help') {
    console.info(USAGE);
    return argv.length === 0 || ['help', '--help', '-h'].includes(argv[0] ?? '') ? 0 : 1;
  }
  try {
    fetchStore();
    const records = readRecords();
    const acceptsOf = (/** @type {string} */ sha) => records.accepted.filter((a) => a.sha === sha);
    if (args.cmd === 'list') {
      if (!records.runs.length) console.error('no recorded runs (origin/visual-baselines absent or empty)');
      for (const r of [...records.runs].sort(byVersionThenAt)) {
        const bys = [...new Set(acceptsOf(r.sha).map((a) => a.by))];
        console.info(`${r.version}  ${String(r.sha).slice(0, 8)}  ${r.verdict}  ${r.renderer}  ${r.at}${bys.length ? `  accepted by ${bys.join(', ')}` : ''}`);
      }
      return 0;
    }
    if (args.cmd === 'show') {
      const r = findRun(records, args.sha);
      if (!r) { console.error(`no recorded run for that sha: ${args.sha}`); return 1; }
      console.info(`run ${r.sha}  ${r.version}  ${r.branch ?? ''}${r.train != null ? `  train ${r.train}` : ''}  ${r.at}`);
      console.info(`renderer ${r.renderer}`);
      console.info(`verdict ${r.verdict}  flags ${(r.flags ?? []).length}  shots ${(r.shots ?? []).length}  rigs ${(r.rigs ?? []).length}`);
      const accepts = acceptsOf(r.sha);
      if (!accepts.length) console.info('accepted: no');
      for (const a of accepts) console.info(`accepted by ${a.by} at ${a.at} (${a.only ? `only ${a.only.join(',')}` : 'all keys'}): ${a.why}`);
      return 0;
    }
    // accept
    const run = findRun(records, args.sha);
    const rec = acceptRecord({ run, by: args.by ?? '', why: args.why ?? '', only: args.only, at: new Date().toISOString() });
    const commit = recordAccept(rec, { dryRun: args.dryRun });
    console.info(`${acceptPath(rec)}\n${commit}`);
    return 0;
  } catch (e) {
    console.error(/** @type {Error} */ (e).message ?? String(e));
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = main();
