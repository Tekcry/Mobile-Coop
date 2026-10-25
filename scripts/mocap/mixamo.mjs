// (mixamo-retarget M1) Dumps the downloaded Mixamo FBX takes to JSON through a headless Blender (py/mixamo_dump.py), the
// input of the Mixamo take adapter (mixamoTake.mjs). Format: docs/mixamo-retarget/PLAN.md "Dump format".
//   node scripts/mocap/mixamo.mjs [--dir <fbx folder>] [--force] [--dry]
//     -> build/mocap/mixamo/raw/<slug>.json + build/mocap/mixamo/manifest.json
// The FBX folder is C:/NightShift/scratch/mixamo/clips/ (or MIXAMO_DIR / --dir): raw Mixamo files never enter the repo.
// File names keep their spaces and parentheses; they reach Blender inside a jobs JSON file, never on a command line.
// Blender runs at below-normal priority (the desktop CPU rule); the lead wraps the run in heavy.lock (RULES "Machines").
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DEFAULT_DIR = 'C:/NightShift/scratch/mixamo/clips';
export const MIXAMO_OUT = path.join(ROOT, 'build', 'mocap', 'mixamo');
export const DUMP_PY = path.join(ROOT, 'scripts', 'mocap', 'py', 'mixamo_dump.py');

/**
 * The Clip map's slug rule: the file name without `.fbx` and without any `(...)` note, lower case, every run of
 * characters other than letters and digits -> `_`, trimmed. The note is returned apart (the recipe keeps it).
 */
export function slugOf(file) {
  const base = file.replace(/\.fbx$/i, '');
  const notes = [...base.matchAll(/\(([^)]*)\)/g)].map((m) => m[1].trim()).filter(Boolean);
  const slug = base.replace(/\([^)]*\)/g, ' ').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!slug) throw new Error(`mixamo: "${file}" has no letters or digits left for a slug`);
  return { slug, note: notes.join('; ') || null };
}

/** The FBX files in `dir` with their slugs; stops on two files with the same slug. */
export function listClips(dir, { readdir = readdirSync } = {}) {
  const files = readdir(dir).filter((f) => /\.fbx$/i.test(f)).sort();
  const seen = new Map();
  return files.map((file) => {
    const { slug, note } = slugOf(file);
    const other = seen.get(slug);
    if (other) throw new Error(`mixamo: "${file}" and "${other}" both slug to "${slug}"; rename one`);
    seen.set(slug, file);
    return { file, slug, note, fbx: path.join(dir, file) };
  });
}

export function sha256File(file, { readFile = readFileSync } = {}) {
  return createHash('sha256').update(readFile(file)).digest('hex');
}

/**
 * Which clips need a dump: a dump is kept when it is newer than its FBX and records the same sha256.
 * `io` is injectable for tests: `{ exists, mtime, readDump, hash }`.
 */
export function planDumps(clips, outDir, { force = false, io = defaultIo } = {}) {
  const raw = path.join(outDir, 'raw');
  return clips.map((c) => {
    const dump = path.join(raw, `${c.slug}.json`);
    const sha256 = io.hash(c.fbx);
    let skip = false;
    if (!force && io.exists(dump) && io.mtime(dump) >= io.mtime(c.fbx)) {
      try {
        skip = io.readDump(dump).sha256 === sha256;
      } catch {
        skip = false;
      }
    }
    return { ...c, sha256, dump, skip };
  });
}

const defaultIo = {
  exists: existsSync,
  mtime: (p) => statSync(p).mtimeMs,
  readDump: (p) => JSON.parse(readFileSync(p, 'utf8')),
  hash: (p) => sha256File(p),
};

/** The Blender argv for one dump run over `jobsFile` (no shell; spaces in paths stay one argument each). */
export function blenderArgs(jobsFile) {
  return ['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '--python', DUMP_PY, '--', '--jobs', jobsFile];
}

/** Runs Blender once, below normal priority, hidden; resolves on exit code 0. */
export function runBlenderLow(exe, argv) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, argv, { windowsHide: true, stdio: 'inherit' });
    if (child.pid === undefined) {
      child.on('error', (e) => reject(new Error(`mixamo: could not start Blender at "${exe}": ${e.message}`)));
      return;
    }
    try {
      os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
    } catch (e) {
      child.kill();
      reject(new Error(`mixamo: could not lower Blender's priority: ${e.message}`));
      return;
    }
    child.on('error', reject);
    child.on('exit', (code, sig) => (code === 0 ? resolve() : reject(new Error(`mixamo: Blender exited ${code ?? sig}`))));
  });
}

/** Writes the manifest from the planned clips (every dump must exist by then). */
export function manifestOf(planned, { readDump = defaultIo.readDump } = {}) {
  return {
    version: 1,
    clips: planned.map((c) => {
      const d = readDump(c.dump);
      return { file: c.file, slug: c.slug, note: c.note, sha256: c.sha256, dump: path.relative(ROOT, c.dump).split(path.sep).join('/'), frames: d.frames, fps: d.fps };
    }),
  };
}

/**
 * The whole run. `deps` is injectable for tests: `{ io, findBlender, runBlender, readdir, writeFile, mkdir }`.
 * Returns `{ planned, ran, manifest }`.
 */
export async function dumpAll({ dir = DEFAULT_DIR, outDir = MIXAMO_OUT, force = false, dry = false, deps = {} } = {}) {
  const io = deps.io ?? defaultIo;
  const writeFile = deps.writeFile ?? writeFileSync;
  const mkdir = deps.mkdir ?? ((p) => mkdirSync(p, { recursive: true }));
  const clips = listClips(dir, { readdir: deps.readdir ?? readdirSync });
  if (!clips.length) throw new Error(`mixamo: no .fbx files in ${dir}`);
  const planned = planDumps(clips, outDir, { force, io });
  const todo = planned.filter((c) => !c.skip);
  if (dry) return { planned, ran: [], manifest: null };
  mkdir(path.join(outDir, 'raw'));
  if (todo.length) {
    const jobsFile = path.join(outDir, 'jobs.json');
    writeFile(jobsFile, JSON.stringify(todo.map((c) => ({ fbx: c.fbx, out: c.dump, file: c.file, slug: c.slug, sha256: c.sha256 })), null, 1));
    const findBlender = deps.findBlender ?? (await import('../operators/blender.mjs')).findBlender;
    const run = deps.runBlender ?? runBlenderLow;
    await run(findBlender().exe, blenderArgs(jobsFile));
  }
  const manifest = manifestOf(planned, { readDump: io.readDump });
  writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  return { planned, ran: todo, manifest };
}

function cli(argv) {
  const opt = { dir: process.env.MIXAMO_DIR || DEFAULT_DIR, force: false, dry: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') opt.dir = argv[++i];
    else if (a === '--force') opt.force = true;
    else if (a === '--dry') opt.dry = true;
    else throw new Error(`mixamo: unknown argument ${a}`);
  }
  return opt;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const opt = cli(process.argv.slice(2));
  dumpAll(opt).then(
    ({ planned, ran }) => {
      for (const c of planned) console.log(`${c.skip ? 'kept  ' : opt.dry ? 'to do ' : 'dumped'} ${c.slug.padEnd(30)} ${c.file}`);
      console.log(`mixamo: ${planned.length} clips, ${ran.length} dumped${opt.dry ? ' (dry run)' : ''} -> ${path.relative(ROOT, MIXAMO_OUT)}`);
    },
    (e) => {
      console.error(e.message);
      process.exit(1);
    },
  );
}
