#!/usr/bin/env node
// validate:levels - runs the validator over every committed graph set in docs/level-validator/graph-sets.json and
// exits 1 when a set's error or warning count differs from the manifest. `--write` reruns every set, rewrites each
// set's saved `run` file (the level-validate CLI's exact text) and the counts in the manifest.
//
// Manifest entry: { name, files: [graph paths, merged in order], flags: [e.g. "--require-measured"], errors, warns,
// run: saved run path or null (the examples keep counts only) }. Paths are relative to the repo root.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEFAULT_METRICS, mergeGraphs, validate } from './level-validate.mjs';

export const MANIFEST = 'docs/level-validator/graph-sets.json';

const FLAGS = new Set(['--require-measured']);
const USAGE = 'usage: node scripts/level-graphs.mjs [--write]';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The level-validate CLI's text for one report: one line per finding, a blank line, then the counts line. */
export function reportText(report) {
  let text = '';
  for (const e of report.errors) text += `ERROR: ${e}\n`;
  for (const w of report.warns) text += `WARN:  ${w}\n`;
  for (const i of report.infos) text += `INFO:  ${i}\n`;
  return `${text}\n${report.errors.length} error(s), ${report.warns.length} warning(s).\n`;
}

/** Validates one manifest set. Returns { errors, warns, text } (the CLI's exact output). Throws on a bad entry. */
export function runSet(set, root = defaultRoot) {
  for (const f of set.flags ?? []) {
    if (!FLAGS.has(f)) throw new Error(`set ${set.name}: unknown flag ${f}`);
  }
  if (!Array.isArray(set.files) || !set.files.length) throw new Error(`set ${set.name}: no files`);
  const graphs = set.files.map((f) => {
    try {
      return JSON.parse(fs.readFileSync(path.resolve(root, f), 'utf8'));
    } catch (e) {
      throw new Error(`set ${set.name}: cannot read ${f}: ${e.message}`);
    }
  });
  const metricsPath = path.join(root, DEFAULT_METRICS);
  const metrics = fs.existsSync(metricsPath) ? JSON.parse(fs.readFileSync(metricsPath, 'utf8')) : null;
  const report = validate(mergeGraphs(graphs), { metrics, metricsPath: DEFAULT_METRICS,
    requireMeasured: (set.flags ?? []).includes('--require-measured') });
  return { errors: report.errors.length, warns: report.warns.length, text: reportText(report) };
}

/** The CLI: one line per set through `log`; returns the exit code (0 all counts match or `--write`, 1 a count
 *  differs, 2 bad usage or an unreadable manifest or graph). */
export function run(argv, { log = console.log, root = defaultRoot } = {}) {
  const bad = argv.filter((a) => a !== '--write');
  if (bad.length) {
    log(`level-graphs: unknown argument ${bad[0]}\n${USAGE}`);
    return 2;
  }
  const write = argv.includes('--write');
  const manifestPath = path.join(root, MANIFEST);
  let sets;
  try {
    sets = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!Array.isArray(sets)) throw new Error('not an array');
  } catch (e) {
    log(`level-graphs: cannot read ${MANIFEST}: ${e.message}`);
    return 2;
  }
  let exit = 0;
  for (const set of sets) {
    let r;
    try {
      r = runSet(set, root);
    } catch (e) {
      log(`level-graphs: ${e.message}`);
      return 2;
    }
    const same = r.errors === set.errors && r.warns === set.warns;
    const counts = `${r.errors} error(s), ${r.warns} warning(s)`;
    if (write) {
      set.errors = r.errors;
      set.warns = r.warns;
      if (set.run) {
        const file = path.resolve(root, set.run);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, r.text);
      }
      log(`${set.name}: ${counts} (written)`);
    } else {
      log(same ? `${set.name}: ${counts} ok` : `${set.name}: ${counts}, manifest says ${set.errors} / ${set.warns}: DIFFERS`);
      if (!same) exit = 1;
    }
  }
  if (write) fs.writeFileSync(manifestPath, `${JSON.stringify(sets, null, 2)}\n`);
  return exit;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run(process.argv.slice(2)));
}
