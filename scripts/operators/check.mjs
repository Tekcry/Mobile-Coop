// npm run operators:check [wren|moth] - the automatic checks on every built operator item (RUNBOOK step 03b).
// Per item (a garment and the kit sewn onto it): py/check_garment.py measures the build in Blender (seam gaps,
// divergence, edge length, solidify spikes, measured albedo and roughness); this script adds the kit check (every
// built item names a kit item that exists, and validateKit passes) and writes build/operators/<id>/<id>-<item>-check.json.
// Exits non-zero on any failure, or when nothing is built.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { findBlender, runBlender } from './blender.mjs';
import { OUT_DIR } from './paths.mjs';

const { KITS, kitCoverage } = await import('../../src/operators/kit.ts');

/** The kit checks for one built item, from its simulation report: [{ name, pass, value, limit, detail }]. */
function kitChecks(operator, simReport) {
  const claimed = [...new Set([simReport.kit, ...(simReport.details?.patches ?? []).map((p) => p.kit)])].map((id) => id ?? '(none)');
  const { missing, errors } = KITS[operator] ? kitCoverage(KITS[operator], claimed) : { missing: claimed, errors: [`no kit for ${operator}`] };
  return [
    { name: 'kitItems', pass: missing.length === 0, value: claimed, limit: 'every built item names an item in the kit data', detail: missing.length ? `not in the kit: ${missing.join(', ')}` : '' },
    { name: 'validateKit', pass: errors.length === 0, value: errors, limit: 'validateKit returns no errors', detail: '' },
  ];
}

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const blender = findBlender();
let failed = 0;
let items = 0;
for (const id of only.length ? only : Object.keys(KITS)) {
  const out = path.join(OUT_DIR, id);
  if (!existsSync(out)) continue;
  const built = readdirSync(out).filter((f) => f.endsWith('-sim.json')).map((f) => f.slice(id.length + 1, -'-sim.json'.length));
  for (const item of built) {
    items++;
    runBlender('check_garment.py', ['--operator', id, '--garment', item, '--out', out], { blender });
    const file = path.join(out, `${id}-${item}-check.json`);
    const report = JSON.parse(readFileSync(file, 'utf8'));
    const sim = JSON.parse(readFileSync(path.join(out, `${id}-${item}-sim.json`), 'utf8'));
    const kc = kitChecks(id, sim);
    for (const c of kc) console.info(`operators check: ${id} ${item} ${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${JSON.stringify(c.value)} (${c.limit}) ${c.detail}`);
    report.checks.push(...kc);
    report.pass = report.checks.every((c) => c.pass);
    writeFileSync(file, JSON.stringify(report, null, 1) + '\n');
    const bad = report.checks.filter((c) => !c.pass);
    failed += bad.length;
    console.info(`operators check: ${id} ${item}: ${report.pass ? 'PASS' : `FAIL (${bad.map((c) => c.name).join(', ')})`} -> ${path.relative(process.cwd(), file)}`);
  }
}
if (!items) {
  console.error('operators check: nothing built (run npm run operators:build first)');
  process.exit(1);
}
if (failed) {
  console.error(`operators check: ${failed} failed check(s)`);
  process.exit(1);
}
console.info(`operators check: ${items} item(s), all checks pass`);
