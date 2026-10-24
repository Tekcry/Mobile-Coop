// Guard bake driver (docs/guard-models/PLAN.md slice GB): runs one stage of the guard-model bake as parallel
// `blender -b` jobs, skips jobs whose input hash is unchanged, and can push the shippable outputs to the branch
// bake/guard-models with git plumbing. The pure parts (stage graph, job split, hashes, scheduler) are in
// guardBakePlan.mjs.
//
//   node scripts/operators/guard-bake.mjs --probe
//   node scripts/operators/guard-bake.mjs --stage <bodies|heads|garments|gear|lods|check|sheet> [--only a,b] [--par N]
//        [--out C:/NightShift/scratch/guard-bake] [--kit file] [--dry-run] [--push [--remote origin]]
//
// Every job's script gets, after `--`: `--seed <SEED> <job.args> --kit <guards.json> --out <out dir>`, and writes the
// outputs the job declares (job.outputs, relative to `--out`). Upstream outputs are read from the same `--out` dir.
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { findBlender } from './blender.mjs';
import { PY_DIR, ROOT, SEED } from './paths.mjs';
import { contractKit, filesToHash, inputHash, jobsFor, KIT_FILE, parallelPlan, pickNext, scriptFile, shippable, STAGE_NAMES, stagesBefore, unknownOnly } from './guardBakePlan.mjs';

export const DEFAULT_OUT = 'C:/NightShift/scratch/guard-bake';
export const PUSH_BRANCH = 'bake/guard-models';
// ktx2.mjs does not export its KTX_BIN; same default and override
const KTX_BIN = process.env.KTX_BIN ?? 'C:/Program Files/KTX-Software/bin';
const MPFB2_DEFAULT = 'C:/NightShift/downloads/mpfb2-2.0.18/add-on-mpfb-v2.0.18.zip';
const exe = (n) => path.join(KTX_BIN, process.platform === 'win32' ? `${n}.exe` : n);

// ---------------------------------------------------------------------------------------------------------------- probe

/** Prints what the bake needs and whether each is there. Returns the process exit code (1 if anything is missing). */
export function probe(log = console.info) {
  let missing = 0;
  const line = (ok, what, detail) => { if (!ok) missing++; log(`${ok ? 'ok     ' : 'MISSING'} ${what}${detail ? `: ${detail}` : ''}`); };
  try {
    const b = findBlender();
    line(true, 'blender', `${b.exe} (${b.version})`);
  } catch (e) {
    line(false, 'blender', String(e.message).split('\n')[0]);
  }
  const toktx = exe('toktx');
  line(existsSync(toktx), 'toktx', `${toktx} (KTX_BIN ${process.env.KTX_BIN ? 'from env' : 'default'})`);
  const zips = [process.env.MPFB2_ZIP, MPFB2_DEFAULT].filter(Boolean);
  const zip = zips.find((z) => existsSync(z));
  line(Boolean(zip), 'MPFB2 zip', zip ?? `none of ${zips.join(', ')}`);
  const cores = os.cpus().length;
  log(`info    cpu cores ${cores}, default --par ${defaultPar()}, kit data ${existsSync(path.join(ROOT, KIT_FILE)) ? 'present' : 'not yet written (slice G0)'}`);
  log(missing ? `probe: ${missing} missing` : 'probe: all present');
  return missing ? 1 : 0;
}

/** 6 on the laptop (24 cores), 2 on a smaller machine (the desktop fallback); GUARD_BAKE_PAR overrides. */
export function defaultPar() {
  const env = Number(process.env.GUARD_BAKE_PAR);
  if (env >= 1) return Math.floor(env);
  return os.cpus().length >= 20 ? 6 : 2;
}

// ---------------------------------------------------------------------------------------------------------------- hashing

const sha256File = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function hashFiles(rels) {
  const out = {};
  for (const rel of rels) {
    const abs = path.join(ROOT, rel);
    if (existsSync(abs)) out[rel] = sha256File(abs);
  }
  return out;
}

const hashFile = (outDir, id) => path.join(outDir, `${id}.hash`);
const readStored = (outDir, id) => {
  try { return readFileSync(hashFile(outDir, id), 'utf8').trim(); } catch { return ''; }
};

/**
 * Decides each job's fate: hash it, compare with the stored hash and check its script and upstream exist.
 * status: 'skip' (hash matches and every declared output is there), 'run', or 'blocked' with `reason`.
 */
export function assess(jobs, outDir) {
  const fileHashes = hashFiles(filesToHash(jobs));
  const upstream = {};
  for (const j of jobs) for (const u of j.needs) if (!(u in upstream)) upstream[u] = readStored(outDir, u);
  const known = Object.fromEntries(Object.entries(upstream).filter(([, v]) => v));
  return jobs.map((job) => {
    const hash = inputHash(job, fileHashes, known);
    const base = { job, hash };
    if (!existsSync(path.join(ROOT, scriptFile(job)))) return { ...base, status: 'blocked', reason: `script ${scriptFile(job)} does not exist yet (a later slice writes it)` };
    const lacking = job.needs.filter((u) => !known[u]);
    if (lacking.length) return { ...base, status: 'blocked', reason: `upstream not built: ${lacking.slice(0, 4).join(', ')}${lacking.length > 4 ? `, +${lacking.length - 4} more` : ''} (run their stage first)` };
    const outputsThere = job.outputs.every((o) => existsSync(path.join(outDir, o)));
    return { ...base, status: readStored(outDir, job.id) === hash && outputsThere ? 'skip' : 'run' };
  });
}

// ---------------------------------------------------------------------------------------------------------------- running

function lowerPriority(pid) {
  // BelowNormal on Windows (PRIORITY_BELOW_NORMAL is 10), nice 10 elsewhere; failure is not fatal
  try { os.setPriority(pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* process already gone */ }
}

/** The command line of a job: [command, argv, cwd, env]. */
export function commandFor(job, { blender, kitPath, outDir }) {
  const tail = ['--kit', kitPath, '--out', outDir];
  if (job.runner === 'node') {
    return [process.execPath, ['--import', './scripts/operators/ts-resolve.mjs', scriptFile(job), ...job.args, ...tail], ROOT, { ...process.env, ...job.env }];
  }
  const py = path.join(PY_DIR, job.script);
  const argv = ['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '--python', py, '--', '--seed', String(SEED), ...job.args, ...tail];
  return [blender.exe, argv, ROOT, { ...process.env, ...job.env, PYTHONHASHSEED: String(SEED) }];
}

/** Runs one job to the end; resolves { ok, code, ms, message }. Never rejects. */
function runJob(a, ctx) {
  const { job, hash } = a;
  const log = path.join(ctx.outDir, 'logs', `${job.id}.log`);
  mkdirSync(path.dirname(log), { recursive: true });
  rmSync(hashFile(ctx.outDir, job.id), { force: true });
  const fd = openSync(log, 'w');
  const t0 = Date.now();
  return new Promise((resolve) => {
    const done = (r) => { try { closeSync(fd); } catch { /* closed */ } resolve({ ms: Date.now() - t0, ...r }); };
    const [cmd, argv, cwd, env] = commandFor(job, ctx);
    let child;
    try {
      child = spawn(cmd, argv, { cwd, env, windowsHide: true, stdio: ['ignore', fd, fd] });
    } catch (e) { done({ ok: false, message: `could not start: ${e.message}` }); return; }
    if (child.pid) lowerPriority(child.pid);
    child.on('error', (e) => done({ ok: false, message: `could not start: ${e.message}` }));
    child.on('close', (code, signal) => {
      if (code !== 0) { done({ ok: false, message: `exit ${code ?? signal}` }); return; }
      const lost = job.outputs.filter((o) => !existsSync(path.join(ctx.outDir, o)));
      if (lost.length) { done({ ok: false, message: `finished but did not write: ${lost.join(', ')}` }); return; }
      writeFileSync(hashFile(ctx.outDir, job.id), `${hash}\n`);
      done({ ok: true });
    });
  });
}

function tail(file, n = 12) {
  try { return readFileSync(file, 'utf8').trimEnd().split(/\r?\n/).slice(-n).join('\n'); } catch { return '(no log)'; }
}

/** Runs the 'run' jobs with at most `par` at once and 2 GPU-bound ones; returns the results by job id. */
export async function runAll(todo, ctx, { par, maxGpu = 2 }) {
  const pending = todo.map((a) => a.job);
  const byId = new Map(todo.map((a) => [a.job.id, a]));
  const running = new Map();
  const results = {};
  await new Promise((resolve) => {
    const pump = () => {
      for (let j = pickNext(pending, [...running.keys()], { par, maxGpu }); j; j = pickNext(pending, [...running.keys()], { par, maxGpu })) {
        pending.splice(pending.indexOf(j), 1);
        console.info(`start   ${j.id}${j.gpuBound ? ' (gpu)' : ''} [${running.size + 1}/${par}]`);
        const p = runJob(byId.get(j.id), ctx).then((r) => {
          running.delete(j);
          results[j.id] = r;
          console.info(`${r.ok ? 'done   ' : 'FAILED '} ${j.id} ${(r.ms / 1000).toFixed(0)} s${r.ok ? '' : `: ${r.message}\n${tail(path.join(ctx.outDir, 'logs', `${j.id}.log`))}`}`);
          pump();
        });
        running.set(j, p);
      }
      if (!running.size && !pending.length) resolve();
    };
    pump();
  });
  return results;
}

// ---------------------------------------------------------------------------------------------------------------- push

const git = (cwd, args, { env = {}, input, soft = false } = {}) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...env }, input, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, timeout: 300_000, maxBuffer: 1 << 28 }).trim();
  } catch (e) {
    if (soft) return '';
    throw e;
  }
};

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

/** The files a stage ships: every GLB, KTX2, PNG and `*.report.json` under `<out>/<stage>/`, as paths relative to out. */
export function shippableFiles(outDir, stage) {
  return walk(path.join(outDir, stage)).map((f) => path.relative(outDir, f).replace(/\\/g, '/')).filter(shippable).sort();
}

/**
 * Commits `rels` (under outDir) on top of origin/<branch> (an orphan commit the first time) in a temp index and pushes
 * it; never touches the working tree, the index or HEAD of `cwd`. Retries 3 times, refetching on a reject.
 * Returns { commit, files } or { commit: null } when the branch already holds exactly these files.
 */
export function pushShippable({ outDir, rels, message, cwd = ROOT, remote = 'origin', branch = PUSH_BRANCH, tries = 3 }) {
  const tmpIndex = path.join(os.tmpdir(), `gb-index-${process.pid}-${randomBytes(2).toString('hex')}`);
  const idEnv = git(cwd, ['config', 'user.email'], { soft: true }) ? {} : { GIT_AUTHOR_NAME: 'guard-bake', GIT_AUTHOR_EMAIL: 'guard-bake@localhost', GIT_COMMITTER_NAME: 'guard-bake', GIT_COMMITTER_EMAIL: 'guard-bake@localhost' };
  const tracking = `refs/remotes/${remote}/${branch}`;
  const fetch = () => git(cwd, ['fetch', '-q', remote, `+refs/heads/${branch}:${tracking}`], { soft: true });
  const build = () => {
    const parent = git(cwd, ['rev-parse', '--verify', '-q', `${tracking}^{commit}`], { soft: true });
    const env = { GIT_INDEX_FILE: tmpIndex, ...idEnv };
    rmSync(tmpIndex, { force: true });
    if (parent) git(cwd, ['read-tree', parent], { env }); else git(cwd, ['read-tree', '--empty'], { env });
    const blobs = git(cwd, ['hash-object', '-w', '--stdin-paths'], { input: `${rels.map((r) => path.join(outDir, r)).join('\n')}\n` }).split(/\r?\n/);
    git(cwd, ['update-index', '--add', '--index-info'], { env, input: rels.map((r, i) => `100644 ${blobs[i]}\t${r}\n`).join('') });
    const tree = git(cwd, ['write-tree'], { env });
    if (parent && git(cwd, ['rev-parse', `${parent}^{tree}`]) === tree) return null;
    return git(cwd, ['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', message], { env });
  };
  try {
    fetch();
    for (let attempt = 1; ; attempt++) {
      const commit = build();
      if (!commit) return { commit: null, files: rels.length };
      try {
        git(cwd, ['push', '-q', remote, `${commit}:refs/heads/${branch}`]);
        fetch();
        return { commit, files: rels.length };
      } catch (e) {
        if (attempt >= tries) throw new Error(`push to ${remote} ${branch} failed after ${tries} tries: ${String(e.stderr ?? e.message).split('\n')[0]}`);
        fetch();
      }
    }
  } finally {
    rmSync(tmpIndex, { force: true });
  }
}

// ---------------------------------------------------------------------------------------------------------------- CLI

function parseArgs(argv) {
  const o = { par: null, out: DEFAULT_OUT, remote: 'origin' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--probe' || a === '--dry-run' || a === '--push') o[a.slice(2).replace('-run', 'Run')] = true;
    else if (['--stage', '--only', '--par', '--out', '--kit', '--remote'].includes(a)) {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      o[a.slice(2)] = v;
    } else throw new Error(`unknown argument ${a}`);
  }
  if (o.par !== null) {
    o.par = Number(o.par);
    if (!(o.par >= 1) || !Number.isInteger(o.par)) throw new Error('--par must be a whole number of at least 1');
  }
  return o;
}

const USAGE = `usage: guard-bake.mjs --probe
       guard-bake.mjs --stage <${STAGE_NAMES.join('|')}> [--only a,b] [--par N] [--out dir] [--kit file] [--dry-run] [--push [--remote name]]`;

function loadKit(opts) {
  const file = opts.kit ? path.resolve(opts.kit) : path.join(ROOT, KIT_FILE);
  if (existsSync(file)) return { kit: JSON.parse(readFileSync(file, 'utf8')), file, note: '' };
  if (opts.dryRun) return { kit: contractKit(), file, note: `${file} not found (slice G0 writes it): planning from the id contract` };
  throw new Error(`kit data ${file} not found (slice G0 writes scripts/operators/data/guards.json)`);
}

export async function main(argv) {
  let opts;
  try { opts = parseArgs(argv); } catch (e) { console.error(`${e.message}\n${USAGE}`); return 2; }
  if (opts.probe) return probe();
  if (!opts.stage || !STAGE_NAMES.includes(opts.stage)) { console.error(`--stage must be one of ${STAGE_NAMES.join(', ')}\n${USAGE}`); return 2; }
  const outDir = path.resolve(opts.out);
  const par = opts.par ?? defaultPar();
  const { kit, file: kitPath, note } = loadKit(opts);
  if (note) console.warn(`warning: ${note}`);
  const bad = unknownOnly(opts.stage, kit, opts.only);
  if (bad.length) { console.error(`--only: no ${opts.stage} job matches ${bad.join(', ')}`); return 2; }
  const jobs = jobsFor(opts.stage, kit, { only: opts.only });
  if (!jobs.length) { console.error(`stage ${opts.stage} has no jobs for this kit`); return 2; }
  const plan = assess(jobs, outDir);
  const count = (s) => plan.filter((a) => a.status === s).length;
  const before = stagesBefore(opts.stage);
  console.info(`stage ${opts.stage}: ${jobs.length} jobs (${count('run')} to run, ${count('skip')} unchanged, ${count('blocked')} blocked), par ${par}, out ${outDir}${before.length ? `, needs stages ${before.join(', ')}` : ''}`);

  if (opts.dryRun) {
    for (const a of plan) console.info(`  ${a.status.padEnd(7)} ${a.job.id}${a.job.gpuBound ? ' [gpu]' : ''}  ${a.job.runner === 'node' ? 'node ' : ''}${a.job.script} ${a.job.args.join(' ')}${a.reason ? `\n          ${a.reason}` : ''}`);
    const waves = parallelPlan(plan.filter((a) => a.status !== 'skip').map((a) => a.job), { par });
    console.info(`schedule if every job ran: ${waves.length} wave(s) of ${waves.map((w) => w.length).join(', ') || '0'} (at most ${par} at once, 2 gpu)`);
    return 0;
  }

  let failed = 0;
  const results = {};
  for (const a of plan.filter((x) => x.status === 'blocked')) {
    failed++;
    results[a.job.id] = { ok: false, message: a.reason };
    console.error(`FAILED  ${a.job.id}: ${a.reason}`);
  }
  const todo = plan.filter((a) => a.status === 'run');
  if (todo.length) {
    let blender;
    try { blender = findBlender(); } catch (e) { console.error(e.message); return 1; }
    mkdirSync(outDir, { recursive: true });
    Object.assign(results, await runAll(todo, { blender, kitPath, outDir }, { par }));
  }
  for (const a of plan.filter((x) => x.status === 'skip')) results[a.job.id] = { ok: true, skipped: true };
  failed = Object.values(results).filter((r) => !r.ok).length;
  mkdirSync(path.join(outDir, 'logs'), { recursive: true });
  writeFileSync(path.join(outDir, 'logs', `stage-${opts.stage}.json`), `${JSON.stringify({ stage: opts.stage, finished: new Date().toISOString(), par, jobs: results }, null, 2)}\n`);
  console.info(`stage ${opts.stage}: ${jobs.length - failed} ok (${count('skip')} unchanged), ${failed} failed`);
  if (failed) return 1;

  if (opts.push) {
    const rels = shippableFiles(outDir, opts.stage);
    if (!rels.length) { console.info(`push: stage ${opts.stage} has no shippable outputs (glb, ktx2, png, report.json, guard-<base>.json)`); return 0; }
    try {
      const r = pushShippable({ outDir, rels, remote: opts.remote, message: `guard-bake ${opts.stage}: ${rels.length} files` });
      console.info(r.commit ? `push: ${r.files} files to ${opts.remote} ${PUSH_BRANCH} as ${r.commit.slice(0, 10)}` : `push: ${PUSH_BRANCH} already holds these ${r.files} files`);
    } catch (e) { console.error(`push: ${e.message}`); return 1; }
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => { console.error(e.message ?? e); process.exitCode = 1; });
}
