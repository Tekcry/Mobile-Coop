// Guard bake stage `check` (guard-models G4; PLAN section 3 G4 "Budgets enforced by operators:check (guardBudget)"):
// one job per base and per own-GLB piece, run by guard-bake.mjs as a node job:
//   node --import ./scripts/operators/ts-resolve.mjs scripts/operators/guard-check.mjs --stage check --job check-<b>
//        --base <b> | --piece shield_riot  --kit <guards.json> --out <dir>
// Measures the three LOD GLBs themselves (guardGlb.mjs), rebuilds the bake report from them (guardLodReport.mjs) and
// runs G4b's `checkGuardReport` (src/operators/guards/guardBudget.ts: visible and buffer tris per LOD, head tris,
// bones, influences, texture sizes, KTX2 only, `_PIECE` / `_TINT`) on that, plus:
//  - the written report says what the files hold (no drift);
//  - `_PIECE` is uint8, no triangle spans two pieces (G5 groups by a triangle's first vertex), the file's piece list
//    (`extras.guard.pieces`) is the layout's, every piece of the base has triangles at LOD0;
//  - the neck seam ring was kept on every LOD and every head welded to it.
// Writes <out>/check/guard-<id>.check.report.json; exit 1 on any problem.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { guardLayout, pieceLayout } from './guardAtlas.mjs';
import { glbStats } from './guardGlb.mjs';
import { baseReport, lodFile, pieceReport, reportDrift } from './guardLodReport.mjs';

const { checkGuardReport } = await import('../../src/operators/guards/guardBudget.ts');

/** Seam ring size (G1: 42 hm08 vertices) when the body report is not at hand. */
const SEAM_VERTS = 42;

export function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--stage', '--job', '--base', '--piece', '--kit', '--out'].includes(a)) {
      if (argv[i + 1] === undefined) throw new Error(`${a} needs a value`);
      o[a.slice(2)] = argv[++i];
    } else throw new Error(`unknown argument ${a}`);
  }
  if (!o.kit || !o.out) throw new Error('--kit and --out are required');
  if (Boolean(o.base) === Boolean(o.piece)) throw new Error('give exactly one of --base or --piece');
  return o;
}

/** Every problem of one id's LOD files (pure: the parsed inputs in). */
export function checkGuardFiles({ kit, layout, stats, written, seamVerts = SEAM_VERTS }) {
  const measured = layout.base ? baseReport(kit, layout, stats) : pieceReport(layout, stats);
  const problems = [...checkGuardReport(measured, kit)];
  if (written) problems.push(...reportDrift(written, measured).map((p) => `report drift: ${p}`));
  else problems.push('no bake report (lods/guard-<id>.report.json)');
  const id = layout.base ?? layout.piece;
  stats.forEach((s, lod) => {
    const tag = `${id} LOD${lod}`;
    if (!s.pieceAttrUint8) problems.push(`${tag}: _PIECE is not UNSIGNED_BYTE`);
    if (s.mixedTris) problems.push(`${tag}: ${s.mixedTris} triangles span two pieces (split the vertices at piece seams)`);
    if (JSON.stringify(s.extras?.pieces ?? null) !== JSON.stringify(layout.pieces)) problems.push(`${tag}: extras.guard.pieces is not the layout's piece list`);
  });
  if (layout.base) {
    const t0 = measured.lods[0];
    for (const [i, pid] of layout.pieces.entries()) if (!(stats[0].pieceTris[i] > 0)) problems.push(`${id} LOD0: piece ${pid} has no triangles (not built?)`);
    const seam = written?.bake?.seamKept;
    if (Array.isArray(seam)) {
      seam.forEach((sk, lod) => {
        if (!sk) return;
        if (sk.body !== seamVerts) problems.push(`${id} LOD${lod}: body seam ring ${sk.body} of ${seamVerts} vertices kept`);
        for (const h of layout.heads) if (sk[h.id] !== undefined && sk[h.id] < seamVerts) problems.push(`${id} LOD${lod}: head ${h.id} welded ${sk[h.id]} of ${seamVerts} seam vertices`);
      });
    }
    for (const n of written?.notes ?? []) problems.push(`bake note: ${n}`);
    return { problems, measured, summary: { bufferTris: measured.lods.map((l) => l.bufferTris), shownTris: measured.lods.map((l) => l.shownTris), bodyTris: t0.bodyTris } };
  }
  return { problems, measured, summary: { bufferTris: measured.lods.map((l) => l.bufferTris) } };
}

export function main(argv) {
  const o = parseArgs(argv);
  const kit = JSON.parse(readFileSync(o.kit, 'utf8'));
  const id = o.base ?? o.piece;
  const out = path.resolve(o.out);
  const layout = o.base ? guardLayout(kit, o.base) : pieceLayout(kit, o.piece);
  const missing = [0, 1, 2].map((l) => lodFile(id, l)).filter((f) => !existsSync(path.join(out, f)));
  let result;
  if (missing.length) {
    result = { problems: missing.map((f) => `${f} missing`), summary: null };
  } else {
    const stats = [0, 1, 2].map((l) => glbStats(readFileSync(path.join(out, lodFile(id, l)))));
    const rep = path.join(out, 'lods', `guard-${id}.report.json`);
    const written = existsSync(rep) ? JSON.parse(readFileSync(rep, 'utf8')) : null;
    let seamVerts = SEAM_VERTS;
    const bodyJson = o.base ? path.join(out, 'bodies', `guard-${o.base}-body.json`) : null;
    if (bodyJson && existsSync(bodyJson)) seamVerts = JSON.parse(readFileSync(bodyJson, 'utf8')).neckSeam?.bodyVerts?.length ?? SEAM_VERTS;
    result = checkGuardFiles({ kit, layout, stats, written, seamVerts });
  }
  const dir = path.join(out, 'check');
  mkdirSync(dir, { recursive: true });
  const pass = result.problems.length === 0;
  writeFileSync(path.join(dir, `guard-${id}.check.report.json`), `${JSON.stringify({ id, pass, problems: result.problems, summary: result.summary, measured: result.measured ?? null }, null, 1)}\n`);
  console.info(`guard-check ${id}: ${pass ? 'PASS' : `FAIL (${result.problems.length})`}`);
  for (const p of result.problems) console.info(`  ${p}`);
  return pass ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { console.error(`guard-check: ${e.message ?? e}`); process.exitCode = 1; }
}
