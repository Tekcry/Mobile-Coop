// Guard bake stage `prep` (docs/guard-models/PLAN.md G1; GB open item "bodies needs joints.json"): one node job, run by
// guard-bake.mjs before `bodies`. Writes, under --out:
//   joints/guard-<base>.json  each kit base's skeleton (guardJoints.mjs: the game rig at the base's reference height and
//                             build, export-joints.mjs' file shape)
//   mpfb2/...                 the CC0 MakeHuman data the Blender jobs read (fetch-base-body.mjs' file list, copied out of
//                             the repo cache so every bake slot that shares --out has it; MPFB2_ZIP, else the downloads
//                             zip guard-bake --probe checks, else the pinned download)
//   prep/prep.json            what was written
// Usage (the driver adds --kit / --out): node --import ./scripts/operators/ts-resolve.mjs scripts/operators/guard-prep.mjs
//   --stage prep --job prep --kit <guards.json> --out <dir>
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchBaseBody, MPFB2_DIR } from './fetch-base-body.mjs';
import { guardJointsFile, jointsRel } from './guardJoints.mjs';
import { ROOT } from './paths.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const MPFB2_ZIP_DEFAULT = 'C:/NightShift/downloads/mpfb2-2.0.18/add-on-mpfb-v2.0.18.zip';

function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i];
    if (!k?.startsWith('--') || argv[i + 1] === undefined) throw new Error(`bad argument ${k}`);
    o[k.slice(2)] = argv[i + 1];
  }
  if (!o.kit || !o.out) throw new Error('--kit and --out are required');
  return o;
}

const listed = () => readFileSync(path.join(HERE, 'data', 'mpfb2-files.txt'), 'utf8').split(/\r?\n/).map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#') && !l.startsWith('/'));

/** The listed MPFB2 data files into <out>/mpfb2 (a file already there with the same size is kept). */
async function mpfbInto(dest) {
  const files = listed();
  if (files.some((f) => !existsSync(path.join(MPFB2_DIR, f)))) {
    if (!process.env.MPFB2_ZIP && existsSync(MPFB2_ZIP_DEFAULT)) process.env.MPFB2_ZIP = MPFB2_ZIP_DEFAULT;
    const r = await fetchBaseBody();
    console.info(`prep: MPFB2 cache ${r.dir}: ${r.fetched} of ${r.files} files fetched${process.env.MPFB2_ZIP ? ` from ${process.env.MPFB2_ZIP}` : ''}`);
  }
  let copied = 0;
  for (const f of files) {
    const src = path.join(MPFB2_DIR, f);
    const dst = path.join(dest, f);
    if (existsSync(dst) && statSync(dst).size === statSync(src).size) continue;
    mkdirSync(path.dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    copied++;
  }
  return { files: files.length, copied };
}

export async function main(argv) {
  const o = args(argv);
  const out = path.resolve(o.out);
  const kit = JSON.parse(readFileSync(path.resolve(o.kit), 'utf8'));
  const clav = JSON.parse(readFileSync(path.join(ROOT, 'scripts', 'anim-skeleton', 'skeleton.json'), 'utf8')).clavicle;
  if (!Array.isArray(kit.bases) || !kit.bases.length) throw new Error('kit has no bases');
  const joints = [];
  for (const b of kit.bases) {
    const rel = jointsRel(b.id);
    const file = path.join(out, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(guardJointsFile(b, clav), null, 2)}\n`);
    joints.push(rel);
    console.info(`prep: ${b.id} (${b.refHeight} m, ${b.build}) joints -> ${rel}`);
  }
  const mpfb = await mpfbInto(path.join(out, 'mpfb2'));
  console.info(`prep: MPFB2 data ${mpfb.files} files in ${path.join(out, 'mpfb2')} (${mpfb.copied} copied)`);
  mkdirSync(path.join(out, 'prep'), { recursive: true });
  writeFileSync(path.join(out, 'prep', 'prep.json'), `${JSON.stringify({ joints, mpfb2: { dir: 'mpfb2', ...mpfb } }, null, 2)}\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { console.error(e.message ?? e); process.exitCode = 1; });
}
