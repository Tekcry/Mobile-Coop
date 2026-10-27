// Guard garment check (docs/guard-models/PLAN.md G2, SPEC 4 / 8): reads the garments/guard-<base>-<part>.json a garments
// job writes (scripts/operators/py/guard_garment.py) and lists every way it misses the contract. Pure (no fs) apart from
// the CLI at the bottom; the lead runs it on the laptop bake's outputs:
//   node scripts/operators/guardGarmentCheck.mjs <out>/garments/guard-*.json   (or the folder: <out>/garments)
// The CLI expands the `*` itself (cliFiles.mjs): cmd.exe, which runs the laptop bake's steps, passes it literally.
// Exit 1 when any report has a problem. Warnings (Wren's softer limits) print but do not fail.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandFileArgs } from './cliFiles.mjs';

/**
 * Limits. The seam gap is measured BEFORE build_garment.py's weld (every seam pair is merged to its mean,
 * build_garment.py:1308-1348), so it never reaches the GLB: it only warns, at Wren's check_garment.py limit (10 mm) and
 * as large (30 mm, check the gusset on the sheet). What can reach the GLB is the weld's move: the relax radius round a
 * moved seam is min(60 mm, 3 x the move) (build_garment.py:1343), so the cap binds from a 20 mm move and past it the
 * fabric round the join may keep a pinch. The garment's own `sim.weldMoveMaxMm` over `weldMoveWarnMm` (20) warns (check
 * for a pinch on a close view); over `weldMoveFailMm` (60) fails. 60 stays the fail line because no close view yet shows
 * a pinch between 20 and 60 mm (the bake's lean trousers move 49 mm): Michael's look check decides whether it comes
 * down. (G10a triage, 2026-10-25; PR #375 check.)
 */
export const LIMITS = {
  seamGapWarnMm: 10,
  seamGapLargeMm: 30,
  weldMoveWarnMm: 20,
  weldMoveFailMm: 60,
  bootTopGirthMin: 0.2, // m x s: a boot shaft's top girth (a guard ankle is ~0.25-0.3 m); 0 means nothing was measured
  hemOverBootMin: 1.0, // a trousers hem drafted over the boots is at least the boot's top girth (x boot girth)
};

/** The parts worn under `part` on `base` that its job rebuilds first (guard_garments.json `chains`). */
export const chainOf = (layers, base, part) => [...(layers.chains?.[base]?.[part] ?? [])];

/** The outfits that wear `part` (guard_garments.json `outfits`). */
export const outfitsWith = (layers, part) => Object.entries(layers.outfits ?? {}).filter(([, l]) => l.includes(part)).map(([o]) => o);

/** Height scale of a garment report (the drafted `height` over Wren's 1.68 m). */
const scaleOf = (r) => (r.drafted?.height ?? 1.68) / 1.68;

/** Each boot's measured top girth (a fitted boots report keeps the per-side measurements under `drafted`). */
export function bootTopGirths(r) {
  return Object.values(r.drafted ?? {}).filter((v) => v && typeof v === 'object' && 'topGirthM' in v).map((v) => v.topGirthM);
}

/**
 * Problems and warnings of one garment report against the layer data. `problems` fail the bake; `warnings` are Wren's
 * soft limits (a seam gap the weld closes, a cosmetic risk) for the look check.
 */
export function checkGarment(r, layers) {
  const problems = [];
  const warnings = [];
  const spec = layers.parts?.[r.part];
  if (!spec) return { problems: [`part "${r.part}" is not in guard_garments.json`], warnings };
  const op = `guard-${r.base}`;
  const stem = `${op}-${r.part}`;
  for (const k of ['module', 'method', 'layer', 'tint']) {
    if (r[k] !== spec[k]) problems.push(`${k} ${JSON.stringify(r[k])}, guard_garments.json says ${JSON.stringify(spec[k])}`);
  }
  if ((r.variant ?? null) !== (spec.variant ?? null)) problems.push(`variant ${r.variant}, guard_garments.json says ${spec.variant ?? null}`);
  const chain = chainOf(layers, r.base, r.part);
  if (JSON.stringify(r.chain ?? []) !== JSON.stringify(chain)) problems.push(`chain ${JSON.stringify(r.chain)}, want ${JSON.stringify(chain)}`);
  const wear = outfitsWith(layers, r.part);
  if (!r.outfits?.length) problems.push('no outfit on this base wears the part');
  for (const o of r.outfits ?? []) if (!wear.includes(o)) problems.push(`outfit ${o} does not list ${r.part}`);
  // objects: the part's own only, its hero shown, the sewn shell hidden
  const objs = r.objects ?? [];
  const foreign = objs.filter((o) => o.name !== stem && !o.name.startsWith(`${stem}-`)).map((o) => o.name);
  if (foreign.length) problems.push(`objects not named ${stem}[-...]: ${foreign.slice(0, 5).join(', ')}`);
  const hero = objs.find((o) => o.name === `${stem}-hero`);
  if (!hero) problems.push(`no ${stem}-hero`);
  else if (!hero.shown || !hero.tris) problems.push(`${stem}-hero is hidden or empty`);
  if (r.method === 'sewn') {
    const shell = objs.find((o) => o.name === stem);
    if (!shell) problems.push(`no shell ${stem}`);
    else if (shell.shown) problems.push(`shell ${stem} renders (it must be hidden)`);
  }
  if (!(r.shownTris > 0)) problems.push('no shown triangles');
  // the cloth: the pre-weld seam gap only warns (the weld closes it), for the part and every chain copy (a chain copy is
  // not this part's object: finish() deletes it, guard_garment.py:342-344); the part's own weld move past the relax cap
  // (20 mm) warns, past 60 mm fails
  const gaps = [[r.part, r.method === 'sewn' ? r.seamGapBeforeWeldMm : null], ...(r.steps ?? []).filter((s) => s.part !== r.part).map((s) => [`${s.part} (chain copy)`, s.seamGapBeforeWeldMm])];
  for (const [who, g] of gaps) {
    if (g == null) continue;
    if (g > LIMITS.seamGapLargeMm) warnings.push(`${who}: seam gap before the weld ${g} mm > ${LIMITS.seamGapLargeMm} mm (large, check the gusset on the sheet)`);
    else if (g > LIMITS.seamGapWarnMm) warnings.push(`${who}: seam gap before the weld ${g} mm > ${LIMITS.seamGapWarnMm} mm (Wren's limit)`);
  }
  const weldMove = r.sim?.weldMoveMaxMm;
  if (weldMove != null && weldMove > LIMITS.weldMoveFailMm) {
    problems.push(`${r.part}: weld moved a seam ${weldMove} mm > ${LIMITS.weldMoveFailMm} mm (relax capped, a pinch is likely, build_garment.py:1343)`);
  } else if (weldMove != null && weldMove > LIMITS.weldMoveWarnMm) {
    warnings.push(`${r.part}: weld moved a seam ${weldMove} mm > ${LIMITS.weldMoveWarnMm} mm (weld relax capped, check for a pinch on a close view)`);
  }
  const s = scaleOf(r);
  if (r.part === 'boots') {
    const g = bootTopGirths(r);
    if (g.length !== 2) problems.push(`boots: ${g.length} sides measured, want 2`);
    for (const v of g) if (!(v >= LIMITS.bootTopGirthMin * s)) problems.push(`boots: top girth ${v} m < ${(LIMITS.bootTopGirthMin * s).toFixed(3)} m (shaft top not measured)`);
  }
  if ('boot_top_girth' in (r.drafted ?? {}) && !(r.drafted.boot_top_girth >= LIMITS.bootTopGirthMin * s)) {
    problems.push(`drafted over boots whose top girth is ${r.drafted.boot_top_girth} m (a hem drafted round nothing)`);
  }
  if (spec.variant === 'rolled') {
    const cuts = (r.rolled?.rolls ?? []).reduce((n, [, k]) => n + k, 0);
    if (cuts !== 2) problems.push(`rolled: ${cuts} rolled cuff edges, want 2`);
  }
  return { problems, warnings };
}

/** One line of numbers for the report. */
export function summary(r) {
  const hero = (r.objects ?? []).find((o) => o.name.endsWith('-hero'));
  const gap = r.method === 'sewn' ? `, seam gap ${r.seamGapBeforeWeldMm} mm, weld move ${r.sim?.weldMoveMaxMm ?? '-'} mm` : '';
  const chain = r.chain?.length ? `, chain ${r.chain.join('+')}` : '';
  return `${r.base} ${r.part}: ${r.shownTris} tris shown (hero ${hero?.tris ?? '-'}), ${(r.objects ?? []).length} objects${gap}${chain}, ${r.seconds} s`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const usage = 'usage: guardGarmentCheck.mjs <garments/guard-<base>-<part>.json | garments/guard-*.json | garments folder>...';
  let files = [];
  try { files = expandFileArgs(process.argv.slice(2)); } catch (e) { console.error(`${e.message}\n${usage}`); process.exit(2); }
  if (!files.length) { console.error(usage); process.exit(2); }
  const here = path.dirname(fileURLToPath(import.meta.url));
  const layers = JSON.parse(readFileSync(path.join(here, 'py', 'guard_garments.json'), 'utf8'));
  let bad = 0;
  for (const f of files) {
    const r = JSON.parse(readFileSync(f, 'utf8'));
    const { problems, warnings } = checkGarment(r, layers);
    console.info(`${problems.length ? 'FAIL' : 'ok  '} ${summary(r)}`);
    for (const q of problems) console.info(`     ${q}`);
    for (const q of warnings) console.info(`     warn: ${q}`);
    if (problems.length) bad++;
  }
  process.exitCode = bad ? 1 : 0;
}
