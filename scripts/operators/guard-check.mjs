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
//  - every piece the kit gives triangles at LOD1 / LOD2 still has some there (a cluster at a large weld distance can
//    delete a small piece's lower LODs; hair caps have none at LOD2 by the kit);
//  - the neck seam ring was kept on every LOD and every head welded to it;
//  - a base's runtime data file lods/guard-<b>.json (G7 guardAssets.ts `GuardFileData`) exists, has the loader's shape,
//    says what the layout / report manifest say and passes the runtime's validateGuardManifest.
// Writes <out>/check/guard-<id>.check.report.json; exit 1 on any problem.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { guardLayout, pieceLayout } from './guardAtlas.mjs';
import { glbStats } from './guardGlb.mjs';
import { baseReport, fileDataFile, guardFileData, lodFile, pieceReport, reportDrift } from './guardLodReport.mjs';

const { checkGuardReport } = await import('../../src/operators/guards/guardBudget.ts');
const { validateGuardManifest } = await import('../../src/operators/guards/gearMask.ts');

/** (G10a D3) SPEC 8: fabric-tinted garment albedo averages the fabric neutral (linear); trousers at 0.78 of it. */
export const FABRIC_SLOTS = ['uniform', 'kit', 'headwear'];
export const LEGS_SHARE = 0.78;
export const LEG_PARTS = ['trousers', 'work_trousers'];
export const ALBEDO_TOL = 0.15;

/**
 * Problems of a base's garment albedo means (the bake JSON's `albedoMean`: { 'lod<n>.garment:<part>': [r, g, b] },
 * linear over the covered texels): every fabric-tinted part at every LOD within +-15 % of its neutral per channel; a
 * missing field or region is a problem. `none`-slot parts (boots, gloves) keep their own colour and are not checked.
 */
export function checkAlbedoMeans(kit, layout, albedoMean) {
  if (!layout.base) return [];
  const id = layout.base;
  if (!albedoMean || typeof albedoMean !== 'object') return [`${id}: no albedoMean in the bake (lods/guard-${id}.bake.json): the garment fabric neutral (SPEC 8) is unchecked`];
  const fabric = kit.tintNeutral?.fabric ?? 0.4;
  const out = [];
  for (const g of layout.garments ?? []) {
    if (!FABRIC_SLOTS.includes(g.partTint)) continue;
    const want = fabric * (LEG_PARTS.includes(g.part) ? LEGS_SHARE : 1);
    for (const lod of [0, 1, 2]) {
      const key = `lod${lod}.garment:${g.part}`;
      const m = albedoMean[key];
      if (!Array.isArray(m) || m.length < 3) { out.push(`${id} ${key}: no albedo mean`); continue; }
      const off = m.slice(0, 3).filter((v) => !(Math.abs(v - want) <= want * ALBEDO_TOL));
      if (off.length) out.push(`${id} ${key}: albedo mean ${m.slice(0, 3).map((v) => v.toFixed(3)).join(', ')} not within 15 % of the fabric neutral ${want.toFixed(3)} (SPEC 8)`);
    }
  }
  return out;
}

/** The base's heads whose kinds all wear the balaclava for good (`faceCovered`, SPEC A14: heavy, enforcer). */
export function faceCoveredHeads(kit, layout) {
  return (layout.heads ?? []).map((h) => h.id).filter((id) => {
    const kinds = (kit.kinds ?? []).filter((k) => (k.heads ?? []).includes(id));
    return kinds.length > 0 && kinds.every((k) => k.faceCovered === true);
  });
}

/**
 * (G10a D6) A face-covered head keeps only what the balaclava's eye slot shows: bake_guard.py drops the head triangles
 * the balaclava covers and writes `coveredHeadTris` ({ 'lod<n>': { <head>: { dropped, kept } } }) into the bake JSON.
 * Every face-covered head at every LOD must have dropped some; a missing field is a problem.
 */
export function checkCoveredHeads(kit, layout, covered) {
  const heads = layout.base ? faceCoveredHeads(kit, layout) : [];
  if (!heads.length) return [];
  if (!covered || typeof covered !== 'object') return [`${layout.base}: no coveredHeadTris in the bake (face-covered heads ${heads.join(', ')} not trimmed under the balaclava)`];
  const out = [];
  for (const h of heads) {
    for (const lod of [0, 1, 2]) {
      const c = covered[`lod${lod}`]?.[h];
      if (!c || typeof c.dropped !== 'number') out.push(`${layout.base} LOD${lod}: head ${h} has no coveredHeadTris entry`);
      else if (!(c.dropped > 0)) out.push(`${layout.base} LOD${lod}: head ${h} dropped no triangles under the balaclava (the face shows through)`);
    }
  }
  return out;
}

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

/**
 * Problems of a base's `guard-<b>.json` (`data`: parsed, or null when absent) against the layout, the written report's
 * manifest and the runtime's own validation (the loader's checks in G7 guardAssets.ts resolveGuardAsset).
 */
export function checkFileData(layout, data, written) {
  const f = fileDataFile(layout.base);
  if (!data) return [`${f} missing (the runtime falls back to the stand-in without it)`];
  if (!Array.isArray(data.pieces) || typeof data.tintSlots !== 'number' || typeof data.refHeight !== 'number') return [`${f} malformed (needs { pieces: string[], tintSlots: number, refHeight: number })`];
  const out = [];
  const want = guardFileData(layout);
  for (const k of ['pieces', 'tintSlots', 'refHeight']) if (JSON.stringify(data[k]) !== JSON.stringify(want[k])) out.push(`${f}: ${k} is not the layout's`);
  const m = written?.manifest;
  if (m) for (const k of ['pieces', 'tintSlots', 'refHeight']) if (JSON.stringify(data[k]) !== JSON.stringify(m[k])) out.push(`${f}: ${k} differs from the report manifest`);
  const urls = ['', ...[0, 1, 2].map((l) => lodFile(layout.base, l))];
  out.push(...validateGuardManifest({ id: `guard-${layout.base}`, base: layout.base, urls, pieces: data.pieces, tintSlots: data.tintSlots, refHeight: data.refHeight }).map((p) => `${f}: ${p}`));
  return out;
}

/** Every problem of one id's LOD files (pure: the parsed inputs in; `fileData`: the parsed guard-<b>.json or null). */
export function checkGuardFiles({ kit, layout, stats, written, fileData = null, seamVerts = SEAM_VERTS, bake = null }) {
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
    const capTris = Object.fromEntries((layout.caps ?? []).map((c) => [c.id, c.tris]));
    for (const [i, pid] of layout.pieces.entries()) {
      if (!(stats[0].pieceTris[i] > 0)) { problems.push(`${id} LOD0: piece ${pid} has no triangles (not built?)`); continue; }
      for (const lod of [1, 2]) {
        if (capTris[pid] && !(capTris[pid][lod] > 0)) continue; // hair caps: none at LOD2 by the kit
        if (!(stats[lod]?.pieceTris[i] > 0)) problems.push(`${id} LOD${lod}: piece ${pid} has no triangles (decimated away?)`);
      }
    }
    const seam = written?.bake?.seamKept;
    if (Array.isArray(seam)) {
      seam.forEach((sk, lod) => {
        if (!sk) return;
        if (sk.body !== seamVerts) problems.push(`${id} LOD${lod}: body seam ring ${sk.body} of ${seamVerts} vertices kept`);
        for (const h of layout.heads) if (sk[h.id] !== undefined && sk[h.id] < seamVerts) problems.push(`${id} LOD${lod}: head ${h.id} welded ${sk[h.id]} of ${seamVerts} seam vertices`);
      });
    }
    problems.push(...checkFileData(layout, fileData, written));
    problems.push(...checkAlbedoMeans(kit, layout, bake?.albedoMean ?? written?.bake?.albedoMean ?? null));
    problems.push(...checkCoveredHeads(kit, layout, bake?.coveredHeadTris ?? written?.bake?.coveredHeadTris ?? null));
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
    const dataPath = o.base ? path.join(out, fileDataFile(o.base)) : null;
    const fileData = dataPath && existsSync(dataPath) ? JSON.parse(readFileSync(dataPath, 'utf8')) : null;
    // (G10a D3 / D6) the garment albedo means and the trimmed face-covered heads: bake_guard.py writes them into the
    // bake JSON beside bakeCoverage
    const bakePath = o.base ? path.join(out, 'lods', `guard-${o.base}.bake.json`) : null;
    const bake = bakePath && existsSync(bakePath) ? JSON.parse(readFileSync(bakePath, 'utf8')) : null;
    result = checkGuardFiles({ kit, layout, stats, written, fileData, seamVerts, bake });
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
