// npm run operators:check [wren|moth] [--only <item,item>] - the automatic checks on every built operator item (RUNBOOK step 03b).
// Per item (a garment and the kit sewn onto it): py/check_garment.py measures the build in Blender (seam gaps,
// divergence, edge length, solidify spikes, measured albedo and roughness); this script adds the kit check (every
// built item names a kit item that exists, and validateKit passes) and writes build/operators/<id>/<id>-<item>-check.json.
// Exits non-zero on any failure, or when nothing is built.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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

// --only <item,item> checks just those built items (the per-item tuning loop, step 08): the same checks, thresholds
// and views; the full check (no --only) still runs at the end of every step and fix round.
const argv = process.argv.slice(2);
const onlyIdx = argv.indexOf('--only');
const onlyItems = onlyIdx >= 0 ? new Set((argv[onlyIdx + 1] ?? '').split(',').filter(Boolean)) : null;
const only = argv.filter((a, i) => !a.startsWith('-') && (onlyIdx < 0 || i !== onlyIdx + 1));
const blender = findBlender();
let failed = 0;
let items = 0;
for (const id of only.length ? only : Object.keys(KITS)) {
  const out = path.join(OUT_DIR, id);
  if (!existsSync(out)) continue;
  const built = readdirSync(out).filter((f) => f.endsWith('-sim.json')).map((f) => f.slice(id.length + 1, -'-sim.json'.length))
    .filter((item) => !onlyItems || onlyItems.has(item));
  // A52: check each item after the items under it (its sim report's `under` list), so a covered material's owner
  // report is this run's, not a stale one (covered.py also fails an owner report older than its sim JSON).
  const under = new Map(built.map((item) => [item, JSON.parse(readFileSync(path.join(out, `${id}-${item}-sim.json`), 'utf8')).under ?? []]));
  built.sort((a, b) => under.get(a).length - under.get(b).length || (under.get(b).includes(a) ? -1 : under.get(a).includes(b) ? 1 : 0));
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
// Step 10: the baked LODs (npm run operators:lods), when built: anchors on their joints in every LOD file, game joints
// only below the hero, tangents with every normal map, SPEC 6.4 costs flagged (an overrun prints FLAG and does not
// fail); against the hero (fix round 1, FAIL): visible back faces per view and the open edge length.
// Fix round 2 (A76, FAIL): bake errors inside the outline, each LOD's Cycles render against the hero's per view
// (largest new-dark patch); written to report.json as bakeDiff.
// Fix round 3: shells (LOD1, LOD2, phone) 24 px in every view, LOD0's loose limits named in A76; a `holster` view; a
// render older than its LOD's GLB FAILs "stale".
const { glbJson, lodChecks, lodReportChecks, bakeDiffCheck, staleViews, BACKFACE_VIEWS } = await import('../../src/operators/lodChecks.ts');
const { decodePng, darkPatches } = await import('../../src/operators/bakeDiff.ts');
const { inflateSync } = await import('node:zlib');
/** Each LOD's new-dark patches per view, from the renders in `dir` (missing renders are left out: "not measured"). */
function measureBakeDiff(id, dir, lods) {
  const png = (f) => decodePng(new Uint8Array(readFileSync(f)), (b) => new Uint8Array(inflateSync(b)));
  const out = {};
  for (const v of BACKFACE_VIEWS) {
    const hf = path.join(dir, `${id}-${v}-hero.png`);
    if (!existsSync(hf)) continue;
    const hero = png(hf);
    for (const lod of lods) {
      const f = path.join(dir, `${id}-${v}-${lod}.png`);
      if (lod === 'hero' || !existsSync(f)) continue;
      (out[lod] ??= {})[v] = darkPatches(hero, png(f));
    }
  }
  return out;
}
/** Per LOD: the views whose render (`suffix`: '' or '-backfaces') is older than the LOD's GLB, or the hero's. */
function staleFor(id, dir, lods, suffix) {
  const mt = (f) => (existsSync(f) ? statSync(f).mtimeMs : undefined);
  const renders = (lod) => Object.fromEntries(BACKFACE_VIEWS.map((v) => [v, mt(path.join(dir, `${id}-${v}-${lod}${suffix}.png`))]).filter(([, t]) => t !== undefined));
  // step 11: a KTX2 repack (ktx2.mjs) rewrites the file but not its geometry: judge by the Blender export's time it kept,
  // unless the file changed after the repack
  const glb = (lod) => {
    const t = mt(path.join(OUT_DIR, id, 'export', lods[lod].glb)) ?? Infinity;
    const k = lods[lod].ktx2;
    return k && t <= k.repackedMs + 1000 ? k.sourceGlbMs : t;
  };
  const hero = renders('hero');
  return Object.fromEntries(Object.keys(lods).map((lod) => [lod, staleViews(glb(lod), glb('hero'), renders(lod), hero)]));
}
for (const id of only.length ? only : Object.keys(KITS)) {
  const rep = path.join(OUT_DIR, id, 'export', 'report.json');
  if (onlyItems || !existsSync(path.join(OUT_DIR, id))) continue;
  if (!existsSync(rep)) {
    console.info(`operators check: ${id} FLAG lods: not built (no export/report.json; npm run operators:lods -- ${id} --render)`);
    continue;
  }
  const report = JSON.parse(readFileSync(rep, 'utf8'));
  const rdir = path.join(OUT_DIR, id, 'export', 'renders');
  report.bakeDiff = measureBakeDiff(id, rdir, Object.keys(report.lods));
  const staleRender = staleFor(id, rdir, report.lods, '');
  const staleBack = staleFor(id, rdir, report.lods, '-backfaces');
  writeFileSync(rep, JSON.stringify(report, null, 1));
  for (const [lod, r] of Object.entries(report.lods)) {
    const cs = [
      ...lodChecks(lod, glbJson(new Uint8Array(readFileSync(path.join(OUT_DIR, id, 'export', r.glb)))), r.triangles),
      ...lodReportChecks(lod, r, report.lods.hero ?? {}, report.backFacePx, staleBack[lod]),
      ...bakeDiffCheck(lod, report.bakeDiff[lod], staleRender[lod]),
    ];
    for (const c of cs) {
      console.info(`operators check: ${id} ${lod} ${c.pass ? 'PASS' : c.flag ? 'FLAG' : 'FAIL'} ${c.name}: ${JSON.stringify(c.value)} (${c.limit})`);
      if (!c.pass && !c.flag) failed++;
    }
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
