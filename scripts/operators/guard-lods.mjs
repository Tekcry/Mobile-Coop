// Guard bake stage `lods` (guard-models G4; docs/guard-models/PLAN.md section 3 G4): one job per base and one per
// own-GLB piece (the riot shield), run by guard-bake.mjs as a node job:
//   node --import ./scripts/operators/ts-resolve.mjs scripts/operators/guard-lods.mjs --stage lods --job lods-<b>
//        --base <b> | --piece shield_riot  --kit <guards.json> --out <dir>
// 1. the atlas / piece layout from the kit (guardAtlas.mjs, pure) -> <out>/lods/guard-<id>.layout.json;
// 2. Blender headless, BelowNormal, no window: bake_lods.py --guard (bake_guard.py) builds, bakes and exports the three
//    LOD GLBs and their PNG texture sets;
// 3. per LOD: `_PIECE` / `_TINT` to uint8 and the piece list into `extras.guard` (guardGlb.mjs), the PNGs to KTX2
//    (toktx UASTC + Zstd with mips, ktx2.mjs toktxArgs) and the GLB repacked with KHR_texture_basisu only;
// 4. the bake report measured from the finished files (guardLodReport.mjs) -> <out>/lods/guard-<id>.report.json, the
//    shape G4b's check reads (src/operators/guards/guardBudget.ts), with the runtime manifest and the bake's notes;
// 5. a base only: <out>/lods/guard-<b>.json, the runtime's `GuardFileData` (G7 src/operators/guards/guardAssets.ts:
//    { pieces, tintSlots: count, refHeight }), shipped with the three GLBs (guardLodReport.mjs guardFileData).
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { findBlender } from './blender.mjs';
import { guardLayout, pieceLayout } from './guardAtlas.mjs';
import { fixGuardGlb, glbStats } from './guardGlb.mjs';
import { baseReport, fileDataFile, guardFileData, pieceReport } from './guardLodReport.mjs';
import { repackGlb, toktxArgs } from './ktx2.mjs';
import { PY_DIR, SEED } from './paths.mjs';

const KTX_BIN = process.env.KTX_BIN ?? 'C:/Program Files/KTX-Software/bin';
const exe = (n) => path.join(KTX_BIN, process.platform === 'win32' ? `${n}.exe` : n);
const KINDS = ['albedo', 'normal', 'orm'];

export function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--stage', '--job', '--base', '--piece', '--kit', '--out', '--samples'].includes(a)) {
      if (argv[i + 1] === undefined) throw new Error(`${a} needs a value`);
      o[a.slice(2)] = argv[++i];
    } else if (a === '--skip-blender') o.skipBlender = true;
    else throw new Error(`unknown argument ${a}`);
  }
  if (!o.kit || !o.out) throw new Error('--kit and --out are required');
  if (Boolean(o.base) === Boolean(o.piece)) throw new Error('give exactly one of --base or --piece');
  return o;
}

function runBlender(args) {
  const { exe: blender } = findBlender();
  const argv = ['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '--python', path.join(PY_DIR, 'bake_lods.py'), '--', '--seed', String(SEED), ...args];
  return new Promise((resolve, reject) => {
    const child = spawn(blender, argv, { windowsHide: true, stdio: 'inherit', env: { ...process.env, PYTHONHASHSEED: String(SEED) } });
    if (child.pid) { try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* gone */ } }
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Blender bake_lods.py --guard exit ${code}`))));
  });
}

/** PNG set of one LOD -> KTX2 beside it; returns { imageName: bytes } for the repack (matched by the role suffix). */
function encodeKtx2(texDir, stem) {
  const out = {};
  for (const k of KINDS) {
    const png = path.join(texDir, `${stem}-${k}.png`);
    if (!existsSync(png)) throw new Error(`${png} missing (the Blender step writes it)`);
    const ktx = png.replace(/\.png$/, '.ktx2');
    execFileSync(exe('toktx'), toktxArgs(k, ktx, png), { windowsHide: true, stdio: 'pipe' });
    execFileSync(exe('ktx'), ['validate', ktx], { windowsHide: true, stdio: 'pipe' });
    out[k] = readFileSync(ktx);
  }
  return out;
}

export function ktxFor(byKind) {
  return (name) => {
    const k = KINDS.find((r) => String(name ?? '').endsWith(`-${r}`) || String(name ?? '').endsWith(`-${r}.png`));
    return k ? byKind[k] : undefined;
  };
}

export async function main(argv) {
  const o = parseArgs(argv);
  const kit = JSON.parse(readFileSync(o.kit, 'utf8'));
  const id = o.base ?? o.piece;
  const out = path.resolve(o.out);
  const lodsDir = path.join(out, 'lods');
  const texDir = path.join(lodsDir, 'textures');
  mkdirSync(texDir, { recursive: true });
  const layout = o.base ? guardLayout(kit, o.base) : pieceLayout(kit, o.piece);
  const layoutFile = path.join(lodsDir, `guard-${id}.layout.json`);
  writeFileSync(layoutFile, `${JSON.stringify(layout, null, 1)}\n`);
  console.info(`guard-lods ${id}: ${layout.pieces.length} pieces, left atlas scale ${layout.leftScale ?? 1}`);
  const glbs = [0, 1, 2].map((l) => path.join(lodsDir, `guard-${id}-lod${l}.glb`));
  const reportFile = path.join(lodsDir, `guard-${id}.report.json`);
  const dataFile = o.base ? path.join(out, fileDataFile(o.base)) : null;
  if (!o.skipBlender) {
    for (const f of [...glbs, reportFile, ...(dataFile ? [dataFile] : [])]) rmSync(f, { force: true });
    await runBlender(['--stage', o.stage ?? 'lods', '--job', o.job ?? `lods-${id}`, '--guard', ...(o.base ? ['--base', o.base] : ['--piece', o.piece]),
      '--layout', layoutFile, '--kit', path.resolve(o.kit), '--out', out, ...(o.samples ? ['--samples', o.samples] : [])]);
  }
  const stats = [];
  for (const [lod, glb] of glbs.entries()) {
    if (!existsSync(glb)) throw new Error(`${glb} missing after the Blender step`);
    const info = { ...(o.base ? { base: o.base } : { piece: o.piece }), lod, pieces: layout.pieces, tintSlots: layout.tintSlots, refHeight: layout.refHeight ?? null };
    const fixed = Buffer.from(fixGuardGlb(readFileSync(glb), info));
    const packed = repackGlb(fixed, ktxFor(encodeKtx2(texDir, `guard-${id}-lod${lod}`)));
    writeFileSync(glb, packed);
    stats.push(glbStats(packed));
  }
  const bakeFile = path.join(lodsDir, `guard-${id}.bake.json`);
  const bake = existsSync(bakeFile) ? JSON.parse(readFileSync(bakeFile, 'utf8')) : {};
  let report;
  if (o.base) {
    // own-GLB pieces (the enforcer's shield) count at their kit budget in the shown totals: an upper bound that does not
    // depend on which parallel lods job finished first (its own file is checked against that budget by check-shield_riot)
    report = baseReport(kit, layout, stats, {}, bake.notes ?? []);
  } else {
    report = pieceReport(layout, stats, bake.notes ?? []);
  }
  report.bake = { leftScale: layout.leftScale ?? 1, seconds: bake.seconds, device: bake.device, seamKept: bake.lods?.map((l) => l.seamKept),
    seamSnapMm: bake.lods?.map((l) => l.seamSnapMm), seamBy: bake.lods?.map((l) => l.seamBy), lodBonesFrom: bake.lodBonesFrom, coverage: bake.bakeCoverage,
    garmentsBuilt: bake.garmentsBuilt, gearBuilt: bake.gearBuilt, headsBuilt: bake.headsBuilt };
  writeFileSync(reportFile, `${JSON.stringify(report, null, 1)}\n`);
  if (dataFile) writeFileSync(dataFile, `${JSON.stringify(guardFileData(layout), null, 1)}\n`);
  for (const l of report.lods) console.info(`guard-lods ${id} LOD${l.lod}: ${l.bufferTris} tris, ${l.bones.length} bones, influences ${l.influences}, ${l.textures.map((t) => `${t.role} ${t.width}x${t.height} ${t.format}`).join(', ')}`);
  for (const n of report.notes) console.info(`guard-lods ${id} note: ${n}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { console.error(`guard-lods: ${e.message ?? e}`); process.exitCode = 1; });
}
