// (mixamo-retarget M1) Dumps the downloaded Mixamo FBX takes to JSON through a headless Blender (py/mixamo_dump.py), the
// input of the Mixamo take adapter (mixamoTake.mjs). Format: docs/mixamo-retarget/PLAN.md "Dump format".
//   node scripts/mocap/mixamo.mjs [--dir <fbx folder>] [--only <slug,slug,...>] [--force] [--dry]
//     (--only: those files alone; the manifest keeps its other entries. mixamo-retarget I6)
//     -> build/mocap/mixamo/raw/<slug>.json + build/mocap/mixamo/manifest.json
//     (I7: the root files plus the `pack-*` subfolders, one level; dumps stay flat, by slug. BATCH2-PLAN "(2)")
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
 * (mixamo-retarget I7) The pack subfolders (`pack-*`, one level under the clip folder): their slug prefixes and their
 * names as the Mixamo site gives them (BATCH2-PLAN "(2) Driver change"). An unknown `pack-<x>` gets the prefix `<x>`
 * (`-` -> `_`) and its folder name as its pack name.
 */
export const PACK_PREFIX = { 'pack-pistol': 'pistol', 'pack-rifle': 'rifle', 'pack-shooter': 'shooter', 'pack-action-adventure': 'aa' };
export const PACK_NAME = {
  'pack-pistol': 'Pistol/Handgun Locomotion Pack',
  'pack-rifle': 'Pro Rifle Pack',
  'pack-shooter': 'Shooter Pack',
  'pack-action-adventure': 'Action Adventure Pack',
};
const PACK_RE = /^pack-[^/\\]+$/i;

/** The pack folder of a clip path relative to the clip folder (`pack-rifle/walk forward.fbx` -> `pack-rifle`), or null. */
export function packOf(file) {
  const parts = file.split(/[/\\]/);
  return parts.length > 1 && PACK_RE.test(parts[0]) ? parts[0] : null;
}

/** A pack folder's slug prefix (`pack-rifle` -> `rifle`). */
export function packPrefix(pack) {
  return PACK_PREFIX[pack] ?? pack.replace(/^pack-/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/** The Mixamo title of a file: its name without folder, `.fbx` and any `(...)` note. */
export function titleOf(file) {
  return path.posix.basename(file.replace(/\\/g, '/')).replace(/\.fbx$/i, '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * The Clip map's slug rule: the file name without `.fbx` and without any `(...)` note, lower case, every run of
 * characters other than letters and digits -> `_`, trimmed. The note is returned apart (the recipe keeps it).
 * (mixamo-retarget I6) A note that starts with "Mirror" (the site's Mirror box, e.g. "Walking Left Turn (Mirror = right
 * turn).fbx") is another take of the same title: its slug gets `_mirror`, so the two do not collide.
 * (I7) A digits-only note (`idle (2).fbx`, the site's numbered twins) gives `_<n>`. A file in a pack folder (`file`
 * relative to the clip folder, or `pack` given) gets the pack prefix (`idle.fbx` in pack-rifle -> `rifle_idle`) unless
 * its slug already starts with it (`pistol idle.fbx` -> `pistol_idle`). Root files slug as before.
 */
export function slugOf(file, pack = packOf(file)) {
  const base = path.posix.basename(file.replace(/\\/g, '/')).replace(/\.fbx$/i, '');
  const notes = [...base.matchAll(/\(([^)]*)\)/g)].map((m) => m[1].trim()).filter(Boolean);
  let slug = base.replace(/\([^)]*\)/g, ' ').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!slug) throw new Error(`mixamo: "${file}" has no letters or digits left for a slug`);
  if (pack) {
    const pre = packPrefix(pack);
    if (pre && slug !== pre && !slug.startsWith(`${pre}_`)) slug = `${pre}_${slug}`;
  }
  if (notes.some((n) => /^mirror\b/i.test(n))) slug += '_mirror';
  const num = notes.find((n) => /^\d+$/.test(n));
  if (num !== undefined) slug += `_${num}`;
  return { slug, note: notes.join('; ') || null };
}

/** A readdir entry's name, and whether it is a folder (a test's mocked readdir may hand plain names: files). */
const entryName = (e) => (typeof e === 'string' ? e : e.name);
const isDir = (e) => typeof e !== 'string' && e.isDirectory();

/**
 * The FBX files in `dir` and in its `pack-*` subfolders (one level) with their slugs, sorted by path; stops on two files
 * with the same slug. (I7) `file` is the path relative to `dir` with `/` (`pack-rifle/walk forward.fbx`), `pack` the
 * folder or null, `title` the credits title cell's text ("Pro Rifle Pack: walk forward"; a root file its title alone).
 */
export function listClips(dir, { readdir = readdirSync } = {}) {
  const files = [];
  for (const e of readdir(dir, { withFileTypes: true })) {
    const name = entryName(e);
    if (isDir(e)) {
      if (!PACK_RE.test(name)) continue;
      for (const f of readdir(path.join(dir, name), { withFileTypes: true })) {
        if (!isDir(f) && /\.fbx$/i.test(entryName(f))) files.push(`${name}/${entryName(f)}`);
      }
    } else if (/\.fbx$/i.test(name)) files.push(name);
  }
  files.sort();
  const seen = new Map();
  return files.map((file) => {
    const pack = packOf(file);
    const { slug, note } = slugOf(file, pack);
    const other = seen.get(slug);
    if (other) throw new Error(`mixamo: "${file}" and "${other}" both slug to "${slug}"; rename one`);
    seen.set(slug, file);
    const title = pack ? `${PACK_NAME[pack] ?? pack}: ${titleOf(file)}` : titleOf(file);
    return { file, slug, note, pack, title, fbx: path.join(dir, file) };
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
      return { file: c.file, slug: c.slug, note: c.note, pack: c.pack ?? null, title: c.title ?? null, sha256: c.sha256, dump: path.relative(ROOT, c.dump).split(path.sep).join('/'), frames: d.frames, fps: d.fps };
    }),
  };
}

/**
 * The whole run. `deps` is injectable for tests: `{ io, findBlender, runBlender, readdir, writeFile, mkdir }`.
 * Returns `{ planned, ran, manifest }`.
 */
export async function dumpAll({ dir = DEFAULT_DIR, outDir = MIXAMO_OUT, force = false, dry = false, only = null, deps = {} } = {}) {
  const io = deps.io ?? defaultIo;
  const writeFile = deps.writeFile ?? writeFileSync;
  const mkdir = deps.mkdir ?? ((p) => mkdirSync(p, { recursive: true }));
  let clips = listClips(dir, { readdir: deps.readdir ?? readdirSync });
  if (!clips.length) throw new Error(`mixamo: no .fbx files in ${dir}`);
  if (only) {
    const missing = only.filter((s) => !clips.some((c) => c.slug === s));
    if (missing.length) throw new Error(`mixamo: --only names no file for ${missing.join(', ')}`);
    clips = clips.filter((c) => only.includes(c.slug));
  }
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
  const mPath = path.join(outDir, 'manifest.json');
  if (only && io.exists(mPath)) {
    // (I6) a partial run keeps the other clips' entries
    const kept = (io.readDump(mPath).clips ?? []).filter((c) => !only.includes(c.slug));
    manifest.clips = [...kept, ...manifest.clips].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  }
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
    else if (a === '--only') opt.only = (argv[++i] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
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
