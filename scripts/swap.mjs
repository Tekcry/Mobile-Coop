// Swap gate (docs/systems/swaps.md; process audit 2026-10-24 finding 6): before an account swap, is everything on this
// machine saved? Scans every registered git worktree, the heavy locks, the laptop queue and the auto-train status, prints
// a table and a final "SAFE" or "NOT SAFE: <n> items", and writes <scratch>/swap-status.json.
// Usage:
//   node scripts/swap.mjs status [--all] [--no-fetch] [--stale-hours <h>]   report only (exit 0)
//   node scripts/swap.mjs save [--commit-wip] [--all]                       report; exit 0 SAFE, 1 NOT SAFE
//   node scripts/swap.mjs prune --dry-run|--yes [--idle-hours <h>]
// Flags: --repo <path> (env SWAP_REPO, default C:/NightShift/Mobile-Coop: any checkout of the repo; its worktree list is
// read), --root <path> (env NS_ROOT, default C:/NightShift: heavy.lock / heavy2.lock live there), --scratch <path> (env
// SWAP_SCRATCH, default <root>/scratch: auto-train files, swap-status.json), --out <file>, --machine <desktop|laptop>
// (env SWAP_MACHINE or LQ_WORKER: marks this machine's laptop-queue claims), --jobs <n> (parallel git, default 6).
// States per worktree: dirty (uncommitted changes; stale-dirty when every dirty file is untouched --stale-hours, default
// 12, 0 off: old debris that already survived swaps on disk, reported, not an item), unpushed (branch commits on no origin ref; no upstream counts),
// detached-local (detached HEAD with commits on no origin ref), prunable (clean branch merged into origin/master or whose
// upstream is gone, nothing unpushed: skipped), missing (folder gone: `git worktree prune` territory), detached, clean.
// dirty / unpushed / detached-local count as items, and so does a heavy lock whose pid is dead on this host.
// --commit-wip (save only, opt-in): each dirty worktree on a job branch gets `git add -A` + commit "WIP: swap save <iso>"
// (hooks run; a staged new file over 10 MB aborts that worktree), then every job branch with unpushed commits is pushed to
// origin under its own name (never master / dev / train/* / the queue branches, never --force).
// prune: removes (`git worktree remove`, no --force) clean worktrees whose branch is merged into origin/master and whose
// git dir has been idle --idle-hours (default 24); never the main worktree, a locked one, a protected branch or a
// detached HEAD, and never deletes a branch.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------- pure helpers (tests/swap.test.ts)

/** `git worktree list --porcelain` -> [{ path, head, branch, detached, bare, locked, missing, main }]. */
export function parsePorcelain(text) {
  const out = [];
  for (const block of String(text).replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = block.split('\n').filter(Boolean);
    if (!lines.length || !lines[0].startsWith('worktree ')) continue;
    const w = { path: lines[0].slice(9), head: null, branch: null, detached: false, bare: false, locked: false, missing: false, main: false };
    for (const l of lines.slice(1)) {
      if (l.startsWith('HEAD ')) w.head = l.slice(5);
      else if (l.startsWith('branch ')) w.branch = l.slice(7).replace(/^refs\/heads\//, '');
      else if (l === 'detached') w.detached = true;
      else if (l === 'bare') w.bare = true;
      else if (l === 'locked' || l.startsWith('locked ')) w.locked = true;
      else if (l === 'prunable' || l.startsWith('prunable ')) w.missing = true;
    }
    out.push(w);
  }
  if (out[0]) out[0].main = true;
  return out;
}

/** Branches a swap script never commits to, pushes or prunes. */
export function protectedBranch(branch) {
  if (!branch) return true;
  return ['master', 'main', 'dev', 'ct-movement', 'cloud-queue', 'laptop-queue', 'gh-pages'].includes(branch) || branch.startsWith('train/');
}

/** True when --commit-wip may commit / push this worktree's branch. */
export const wipAllowed = (w) => !!w.branch && !w.detached && !protectedBranch(w.branch);

/** Items that block a swap. */
export const RISK_STATES = ['dirty', 'unpushed', 'detached-local'];

/**
 * One worktree's state from its facts: { missing, bare, detached, branch, dirty (count), dirtyAgeHours (hours since the
 * newest dirty file changed, null unknown), unpushed (count), merged, upstreamGone }, and staleHours (0: off). Order:
 * missing, dirty (also when merged: new work after a merge), unpushed, detached-local, stale-dirty (every dirty file
 * untouched staleHours+: old debris that survived earlier swaps on disk, reported, not an item), prunable, detached, clean.
 */
export function classifyWorktree(f, { staleHours = 0 } = {}) {
  if (f.missing) return 'missing';
  if (f.bare) return 'clean';
  const stale = f.dirty > 0 && staleHours > 0 && f.dirtyAgeHours != null && f.dirtyAgeHours >= staleHours;
  if (f.dirty > 0 && !stale) return 'dirty';
  if (f.unpushed > 0) return f.detached || !f.branch ? 'detached-local' : 'unpushed';
  if (stale) return 'stale-dirty';
  if (f.detached || !f.branch) return 'detached';
  if (!protectedBranch(f.branch) && (f.merged || f.upstreamGone)) return 'prunable';
  return 'clean';
}

/**
 * `git status --porcelain -z` -> [{ xy, file }] (the new name of a rename / copy), minus untracked entries that hold a
 * registered worktree (`others`: absolute paths with forward slashes), e.g. the main checkout's .claude/worktrees/.
 * Under -uall an untracked entry ending in "/" is a nested repository (git does not descend into it).
 */
export function parseStatusEntries(text, root = '', others = []) {
  const parts = String(text).split('\0');
  const out = [];
  const base = String(root).replace(/\\/g, '/').replace(/\/+$/, '');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p || p.length < 4) continue;
    const xy = p.slice(0, 2);
    const file = p.slice(3);
    if (/[RC]/.test(xy)) i++; // the original path follows a rename / copy
    if (xy === '??') {
      const abs = `${base}/${file}`.replace(/\/+$/, '');
      if (others.some((o) => o === abs || o.startsWith(`${abs}/`))) continue;
    }
    out.push({ xy, file });
  }
  return out;
}

/** The changed paths of `git status --porcelain -z` (parseStatusEntries without the codes). */
export const parseStatusZ = (text, root = '', others = []) => parseStatusEntries(text, root, others).map((e) => e.file);

/** True when status shows an unmerged path (a conflict mid merge / rebase / cherry-pick). */
export const hasUnmerged = (entries) => entries.some((e) => /U/.test(e.xy) || e.xy === 'AA' || e.xy === 'DD');

/** Paths --commit-wip may stage: every entry except nested repositories (dir entries), so no gitlink is ever added. */
export const stagePaths = (entries) => entries.map((e) => e.file).filter((f) => !f.endsWith('/'));

/** Git operation files that mean a worktree is mid merge / cherry-pick / revert / rebase. */
export const OP_MARKERS = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply'];

/** The first operation marker that exists (`exists(name)`), or null. */
export const opInProgress = (exists) => OP_MARKERS.find((m) => exists(m)) ?? null;

/**
 * Hours since the newest dirty path changed at `now`: `mtime(file)` gives epoch ms, or null for a deleted path (counts
 * as fresh: 0). Null when there are no paths.
 */
export function dirtyAge(files, mtime, now) {
  if (!files.length) return null;
  let newest = 0;
  for (const f of files) { const t = mtime(f); newest = Math.max(newest, t === null ? now : t); }
  return Math.max(0, (now - newest) / 3_600_000);
}

/** Counts by state, every state present (0 when none). */
export function countStates(rows) {
  const c = { dirty: 0, unpushed: 0, 'detached-local': 0, 'stale-dirty': 0, prunable: 0, missing: 0, detached: 0, clean: 0 };
  for (const r of rows) c[r.state] = (c[r.state] ?? 0) + 1;
  return c;
}

/** "pid 4484" anywhere in a lock text, plus "host <h>" when the text names one: { pid, host } (nulls when absent). */
export function parseLockHolder(text) {
  const pid = /\bpid (\d+)\b/.exec(String(text ?? ''));
  const host = /\|\s*host ([^|\r\n]+?)\s*(?:\||$)/.exec(String(text ?? '').trim());
  return { pid: pid ? Number(pid[1]) : null, host: host ? host[1] : null };
}

/**
 * A lock's state: free (no file), held (pid alive here), stale (pid dead here: an item), elsewhere (another host's
 * pid), unknown (no pid in the text). A lock with no host is read as this machine's (lock files are per machine).
 */
export function lockState(text, { host, alive }) {
  if (text === null || text === undefined) return 'free';
  const h = parseLockHolder(text);
  if (h.pid === null) return 'unknown';
  if (h.host && h.host !== host) return 'elsewhere';
  return alive(h.pid) ? 'held' : 'stale';
}

/**
 * Laptop-queue view from request ids and their claims ({ worker, done } or null): queued (no claim), running (open
 * claim, with its worker), done count.
 */
export function summarizeQueue(ids, claims) {
  const queued = [], running = [];
  let done = 0;
  for (const id of [...ids].sort()) {
    const c = claims[id] ?? null;
    if (!c) queued.push(id);
    else if (c.done) done++;
    else running.push({ id, worker: c.worker, at: c.at });
  }
  return { queued, running, done };
}

/**
 * The verdict: { safe, items, line }. Items: each risk worktree, each stale lock, each extra problem string (a failed WIP
 * commit or push).
 */
export function safeVerdict(rows, locks = [], extra = []) {
  const items = [];
  for (const r of rows) {
    if (!RISK_STATES.includes(r.state)) continue;
    const what = r.state === 'dirty' ? `${r.dirty} uncommitted` : `${r.unpushed} unpushed`;
    items.push(`${r.state}: ${r.branch ?? `(detached ${String(r.head).slice(0, 8)})`} ${what} - ${r.path}`);
  }
  for (const l of locks) if (l.state === 'stale') items.push(`stale lock: ${l.path} names dead pid ${l.pid} (${l.text})`);
  items.push(...extra);
  return { safe: items.length === 0, items, line: items.length ? `NOT SAFE: ${items.length} items` : 'SAFE' };
}

/** Clean worktrees prune may remove: merged branch (not protected), not main / locked / detached, idle >= idleHours. */
export function pruneCandidates(rows, { idleHours = 24 } = {}) {
  return rows.filter((r) => r.state === 'prunable' && r.merged && !r.main && !r.locked && !r.detached
    && !protectedBranch(r.branch) && r.idleHours !== null && r.idleHours >= idleHours);
}

/** Fixed-width table: rows of string cells, the first row the header. */
export function table(rows) {
  const w = [];
  for (const r of rows) r.forEach((c, i) => { w[i] = Math.max(w[i] ?? 0, String(c).length); });
  return rows.map((r) => r.map((c, i) => (i === r.length - 1 ? String(c) : String(c).padEnd(w[i]))).join('  ')).join('\n');
}

const USAGE = [
  'usage:',
  '  node scripts/swap.mjs status [--all] [--no-fetch] [--stale-hours <h>]',
  '  node scripts/swap.mjs save [--commit-wip] [--all] [--no-fetch] [--stale-hours <h>]',
  '  node scripts/swap.mjs prune --dry-run|--yes [--idle-hours <h>]',
  '  common: --repo <path> --root <path> --scratch <path> --out <file> --machine <name> --jobs <n>',
].join('\n');

/** argv (after `node script`) + env -> options; throws an Error carrying the usage text. */
export function parseArgs(argv, env = {}) {
  const bad = (why) => new Error(`${why}\n${USAGE}`);
  const o = {
    cmd: null, all: false, fetch: true, commitWip: false, dryRun: false, yes: false, idleHours: 24, staleHours: 12, jobs: 6,
    repo: env.SWAP_REPO || 'C:/NightShift/Mobile-Coop', root: env.NS_ROOT || 'C:/NightShift', scratch: env.SWAP_SCRATCH || null,
    out: null, machine: env.SWAP_MACHINE || env.LQ_WORKER || null,
  };
  const val = { '--repo': 'repo', '--root': 'root', '--scratch': 'scratch', '--out': 'out', '--machine': 'machine', '--jobs': 'jobs', '--idle-hours': 'idleHours', '--stale-hours': 'staleHours' };
  const flag = { '--all': 'all', '--commit-wip': 'commitWip', '--dry-run': 'dryRun', '--yes': 'yes' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a in val) {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw bad(`${a} needs a value`);
      const num = ['--jobs', '--idle-hours', '--stale-hours'].includes(a);
      if (num && !/^\d+(\.\d+)?$/.test(v)) throw bad(`${a} needs a number`);
      o[val[a]] = num ? Number(v) : v;
    } else if (a in flag) o[flag[a]] = true;
    else if (a === '--no-fetch') o.fetch = false;
    else if (a.startsWith('--')) throw bad(`unknown flag ${a}`);
    else if (o.cmd) throw bad(`unexpected argument "${a}"`);
    else o.cmd = a;
  }
  if (!['status', 'save', 'prune'].includes(o.cmd)) throw bad(o.cmd ? `unknown command "${o.cmd}"` : 'no command');
  if (o.commitWip && o.cmd !== 'save') throw bad('--commit-wip applies to save only');
  if (o.cmd === 'prune' && o.dryRun === o.yes) throw bad('prune needs exactly one of --dry-run or --yes');
  if (o.cmd !== 'prune' && (o.dryRun || o.yes)) throw bad('--dry-run / --yes apply to prune only');
  o.jobs = Math.max(1, Math.floor(o.jobs));
  o.scratch ??= path.join(o.root, 'scratch');
  o.out ??= path.join(o.scratch, 'swap-status.json');
  return o;
}

// ---------------------------------------------------------------- git / fs I/O

const MAX_NEW_FILE = 10 * 1024 * 1024;

function git(cwd, args, { input, soft = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile('git', ['-C', cwd, ...args], { maxBuffer: 64 * 1024 * 1024, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }, (err, stdout, stderr) => {
      if (err && !soft) reject(new Error(`git ${args.join(' ')} (${cwd}): ${String(stderr || err.message).trim()}`));
      else resolve(err ? null : stdout);
    });
    if (input !== undefined) { child.stdin.end(input); }
  });
}

async function mapLimit(list, n, fn) {
  const out = new Array(list.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (next < list.length) { const i = next++; out[i] = await fn(list[i], i); }
  }));
  return out;
}

const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e?.code === 'EPERM'; } };
const readText = (f) => { try { return fs.readFileSync(f, 'utf8').trim(); } catch { return null; } };

/** Hours since the worktree's git dir last changed (HEAD, index, logs/HEAD); null when unknown. */
function idleHours(w, repoGitDir) {
  let gitDir = null;
  if (w.main) gitDir = repoGitDir;
  else {
    const t = readText(path.join(w.path, '.git'));
    const m = t && /^gitdir:\s*(.+)$/m.exec(t);
    if (m) gitDir = path.resolve(w.path, m[1].trim());
  }
  if (!gitDir) return null;
  let newest = 0;
  for (const f of ['HEAD', 'index', path.join('logs', 'HEAD')]) {
    try { newest = Math.max(newest, fs.statSync(path.join(gitDir, f)).mtimeMs); } catch { /* absent */ }
  }
  return newest ? (Date.now() - newest) / 3_600_000 : null;
}

/**
 * A worktree's dirty entries (parseStatusEntries), null when git status fails. -uall lists every untracked file, so a
 * fresh file inside an old untracked folder keeps the worktree fresh (no false stale-dirty); nested repos stay one entry.
 */
export async function readDirty(wt, others = []) {
  const s = await git(wt, ['--no-optional-locks', 'status', '--porcelain', '-z', '-uall'], { soft: true });
  return s === null ? null : parseStatusEntries(s, wt, others);
}

/**
 * One --commit-wip commit in worktree `wt`: { committed, problem }. Refuses mid merge / cherry-pick / revert / rebase or
 * with unmerged paths; stages only the paths status listed (never nested repos or registered worktrees as gitlinks);
 * unstages and refuses when a new file is over 10 MB. Hooks run.
 */
export async function wipCommit(wt, others, iso) {
  const out = (await git(wt, ['rev-parse', ...OP_MARKERS.flatMap((m) => ['--git-path', m])])).split('\n').map((s) => s.trim()).filter(Boolean);
  const op = opInProgress((m) => { const p = out[OP_MARKERS.indexOf(m)]; return !!p && fs.existsSync(path.resolve(wt, p)); });
  if (op) return { committed: false, problem: `WIP skipped: ${wt} is mid ${op} (finish or abort it by hand)` };
  const entries = await readDirty(wt, others);
  if (entries === null) return { committed: false, problem: `WIP skipped: git status failed in ${wt}` };
  if (hasUnmerged(entries)) return { committed: false, problem: `WIP skipped: ${wt} has unmerged paths` };
  const paths = stagePaths(entries);
  if (!paths.length) return { committed: false, problem: null };
  await git(wt, ['add', '-A', '--pathspec-from-file=-', '--pathspec-file-nul'], { input: `${paths.join('\0')}\0` });
  const added = (await git(wt, ['diff', '--cached', '--name-only', '--diff-filter=A', '-z'])).split('\0').filter(Boolean);
  const big = added.find((f) => { try { return fs.statSync(path.join(wt, f)).size > MAX_NEW_FILE; } catch { return false; } });
  if (big) {
    await git(wt, ['reset', '-q']);
    return { committed: false, problem: `WIP skipped: ${wt} would add ${big} (over 10 MB); commit or ignore it by hand` };
  }
  await git(wt, ['commit', '-q', '-m', `WIP: swap save ${iso}`]);
  return { committed: true, problem: null };
}

/** Commit shas reachable from `heads` but from no origin ref (chunked to keep the command line short). */
async function unpushedSet(repo, heads) {
  const set = new Set();
  for (let i = 0; i < heads.length; i += 150) {
    const out = await git(repo, ['rev-list', ...heads.slice(i, i + 150), '--not', '--remotes=origin']);
    for (const s of out.split('\n')) if (s) set.add(s);
  }
  return set;
}

/** Facts and state for every worktree. */
async function scanWorktrees(o, log) {
  const list = parsePorcelain(await git(o.repo, ['worktree', 'list', '--porcelain']));
  const repoGitDir = path.resolve(o.repo, (await git(o.repo, ['rev-parse', '--git-common-dir'])).trim());
  const merged = new Set((await git(o.repo, ['branch', '--format=%(refname:short)', '--merged', 'origin/master'])).split('\n').map((s) => s.trim()).filter(Boolean));
  const gone = new Set();
  for (const l of (await git(o.repo, ['for-each-ref', 'refs/heads', '--format=%(refname:short)\t%(upstream:short)\t%(upstream:track)'])).split('\n')) {
    const [b, up, track] = l.split('\t');
    if (b && up && /\bgone\b/.test(track ?? '')) gone.add(b);
  }
  const heads = [...new Set(list.filter((w) => w.head && !w.missing).map((w) => w.head))];
  const local = await unpushedSet(o.repo, heads);
  const counts = new Map();
  for (const h of heads.filter((x) => local.has(x))) counts.set(h, Number((await git(o.repo, ['rev-list', '--count', h, '--not', '--remotes=origin'])).trim()));
  log(`  ${list.length} worktrees, ${counts.size} heads with local-only commits; reading status (${o.jobs} at a time)...`);
  const all = list.map((w) => w.path.replace(/\\/g, '/'));
  return mapLimit(list, o.jobs, async (w) => {
    const missing = w.missing || !fs.existsSync(w.path);
    let dirtyFiles = [];
    let error = null;
    if (!missing && !w.bare) {
      const entries = await readDirty(w.path, all);
      if (entries === null) error = 'git status failed';
      else dirtyFiles = entries.map((e) => e.file);
    }
    const age = dirtyAge(dirtyFiles, (f) => { try { return fs.statSync(path.join(w.path, f)).mtimeMs; } catch { return null; } }, Date.now());
    const facts = {
      ...w, missing, dirty: error ? 1 : dirtyFiles.length, dirtyAgeHours: error ? null : age,
      unpushed: counts.get(w.head) ?? 0, merged: !!w.branch && merged.has(w.branch), upstreamGone: !!w.branch && gone.has(w.branch),
    };
    return { ...facts, state: classifyWorktree(facts, { staleHours: o.staleHours }), sample: error ? [error] : dirtyFiles.slice(0, 3), idleHours: missing ? null : idleHours(w, repoGitDir) };
  });
}

async function scanLocks(o) {
  const files = [path.join(o.root, 'heavy.lock'), path.join(o.root, 'heavy2.lock')];
  const out = files.map((f) => {
    const text = readText(f);
    const h = parseLockHolder(text);
    return { path: f, text, pid: h.pid, state: lockState(text, { host: os.hostname(), alive: pidAlive }) };
  });
  const at = path.join(o.scratch, 'auto-train.lock'); // touch lock: stale by mtime (30 min), not by pid
  const text = readText(at);
  if (text !== null) {
    let ageMin = null;
    try { ageMin = Math.round((Date.now() - fs.statSync(at).mtimeMs) / 60_000); } catch { /* gone */ }
    out.push({ path: at, text, pid: parseLockHolder(text).pid, state: ageMin !== null && ageMin >= 30 ? 'old' : 'held', ageMin });
  }
  return out;
}

/** Blob texts for `refs` (rev:path) in one `git cat-file --batch`; missing ones are null. */
async function catFiles(repo, refs) {
  if (!refs.length) return {};
  const out = await git(repo, ['cat-file', '--batch'], { input: `${refs.join('\n')}\n` });
  const buf = Buffer.from(out, 'utf8');
  const res = {};
  let pos = 0;
  for (const ref of refs) {
    const nl = buf.indexOf(10, pos);
    const header = buf.subarray(pos, nl).toString('utf8');
    pos = nl + 1;
    const m = /^[0-9a-f]+ \w+ (\d+)$/.exec(header);
    if (!m) { res[ref] = null; continue; }
    const size = Number(m[1]);
    res[ref] = buf.subarray(pos, pos + size).toString('utf8');
    pos += size + 1;
  }
  return res;
}

async function scanQueue(o) {
  const ls = await git(o.repo, ['ls-tree', '-r', '--name-only', 'origin/laptop-queue', 'requests/'], { soft: true });
  if (ls === null) return { error: 'no origin/laptop-queue' };
  const ids = ls.split('\n').filter((n) => n.endsWith('.json')).map((n) => path.posix.basename(n, '.json'));
  const texts = await catFiles(o.repo, ids.map((id) => `origin/laptop-queue:claims/${id}.json`));
  const claims = {};
  for (const id of ids) {
    try { const c = JSON.parse(texts[`origin/laptop-queue:claims/${id}.json`] ?? 'null'); claims[id] = c && typeof c.worker === 'string' ? c : null; } catch { claims[id] = null; }
  }
  return summarizeQueue(ids, claims);
}

function scanAutoTrain(o) {
  const parse = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const status = parse(path.join(o.scratch, 'auto-train-status.json'));
  const building = parse(path.join(o.scratch, 'auto-train-building.json'));
  if (building?.pid) building.alive = pidAlive(Number(building.pid));
  return { status, building };
}

/** --commit-wip: WIP commits in dirty job worktrees, then pushes of every job branch with local-only commits. */
async function commitWip(o, rows, iso, log) {
  const problems = [];
  const touched = [];
  const others = rows.map((x) => x.path.replace(/\\/g, '/'));
  for (const r of rows.filter((x) => x.state === 'dirty')) {
    if (!wipAllowed(r)) { log(`  skip WIP in ${r.path}: ${r.branch ? `protected branch ${r.branch}` : 'detached HEAD'}`); continue; }
    try {
      const res = await wipCommit(r.path, others, iso);
      if (res.problem) { problems.push(res.problem); continue; }
      if (!res.committed) continue;
      log(`  WIP committed: ${r.branch} (${r.path})`);
      touched.push(r);
    } catch (e) { problems.push(`WIP commit failed: ${r.path}: ${e.message.split('\n')[0]}`); }
  }
  const toPush = new Map();
  for (const r of [...touched, ...rows.filter((x) => x.state === 'unpushed')]) if (wipAllowed(r)) toPush.set(r.branch, r);
  for (const [branch, r] of toPush) {
    try {
      await git(r.path, ['push', '-q', 'origin', `HEAD:refs/heads/${branch}`]);
      log(`  pushed ${branch}`);
    } catch (e) { problems.push(`push failed (no force used): ${branch}: ${e.message.split('\n').slice(-1)[0]}`); }
  }
  return { problems, changed: [...new Set([...touched, ...toPush.values()].map((r) => r.path))] };
}

function printReport(o, rows, locks, queue, autoTrain, verdict, log) {
  const shown = o.all ? rows : rows.filter((r) => RISK_STATES.includes(r.state));
  if (shown.length) {
    log(table([['STATE', 'BRANCH', 'DIRTY', 'UNPUSHED', 'PATH / SAMPLE'],
      ...shown.map((r) => [r.state, r.branch ?? `(detached ${String(r.head).slice(0, 8)})`, r.dirty, r.unpushed,
        `${r.path}${r.sample?.length ? `  [${r.sample.join(', ')}${r.dirty > r.sample.length ? ', ...' : ''}]` : ''}`])]));
  }
  const c = countStates(rows);
  log(`worktrees: ${rows.length} (${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  for (const l of locks) log(`lock ${path.basename(l.path)}: ${l.state}${l.text ? ` - ${l.text}` : ''}${l.ageMin !== undefined ? ` (${l.ageMin} min since touch)` : ''}`);
  if (queue.error) log(`laptop-queue: ${queue.error}`);
  else {
    const mine = o.machine ? queue.running.filter((r) => r.worker === o.machine).length : null;
    log(`laptop-queue: ${queue.queued.length} queued, ${queue.running.length} claimed / running (${[...new Set(queue.running.map((r) => r.worker))].map((w) => `${w} ${queue.running.filter((r) => r.worker === w).length}`).join(', ') || 'none'})${mine !== null ? `, this machine (${o.machine}) ${mine}` : ''}, ${queue.done} done`);
    for (const r of queue.running) log(`  claimed: ${r.id} by ${r.worker} at ${r.at}`);
    for (const id of queue.queued) log(`  queued: ${id}`);
  }
  const s = autoTrain.status;
  log(`auto-train: ${s ? [s.state, s.train ? `train ${s.train}` : '', s.version ?? '', `at ${s.time ?? '?'}`].filter(Boolean).join(' ') + (s.reason ? ` - ${s.reason}` : '') : 'no status file'}`);
  if (autoTrain.building) log(`  building: train ${autoTrain.building.train} pid ${autoTrain.building.pid} ${autoTrain.building.alive ? 'alive' : 'DEAD'} since ${autoTrain.building.at}`);
  for (const i of verdict.items.filter((x) => !RISK_STATES.some((st) => x.startsWith(`${st}:`)))) log(`  - ${i}`);
  log(verdict.line);
}

async function main(argv) {
  const o = parseArgs(argv, process.env);
  const log = (s) => console.log(s);
  if (o.fetch) {
    log(`fetching origin in ${o.repo}...`);
    await git(o.repo, ['fetch', '-q', 'origin'], { soft: true }) ?? log('  fetch failed: using the refs as they are');
  }
  let rows = await scanWorktrees(o, log);
  if (o.cmd === 'prune') {
    const cands = pruneCandidates(rows, { idleHours: o.idleHours });
    log(`${cands.length} prunable worktrees (clean, merged into origin/master, idle ${o.idleHours} h+)${o.dryRun ? ' - dry run' : ''}:`);
    let removed = 0, failed = 0;
    for (const r of cands) {
      if (o.dryRun) { log(`  would remove ${r.path} (${r.branch}, idle ${Math.round(r.idleHours)} h)`); continue; }
      const ok = await git(o.repo, ['worktree', 'remove', r.path], { soft: true });
      if (ok === null) { failed++; log(`  NOT removed (git refused): ${r.path}`); } else { removed++; log(`  removed ${r.path} (${r.branch}; branch kept)`); }
    }
    if (!o.dryRun) log(`removed ${removed}, refused ${failed}; branches untouched`);
    return 0;
  }
  const iso = new Date().toISOString();
  let extra = [];
  if (o.commitWip) {
    const r = await commitWip(o, rows, iso, log);
    extra = r.problems;
    if (r.changed.length) rows = await scanWorktrees({ ...o }, () => {}); // re-read after commits / pushes
  }
  const [locks, queue] = await Promise.all([scanLocks(o), scanQueue(o)]);
  const autoTrain = scanAutoTrain(o);
  const verdict = safeVerdict(rows, locks, extra);
  printReport(o, rows, locks, queue, autoTrain, verdict, log);
  fs.mkdirSync(path.dirname(o.out), { recursive: true });
  fs.writeFileSync(o.out, `${JSON.stringify({ at: iso, host: os.hostname(), machine: o.machine, cmd: o.cmd, verdict, counts: countStates(rows), locks, queue, autoTrain, worktrees: rows }, null, 1)}\n`);
  log(`wrote ${o.out}`);
  return o.cmd === 'save' && !verdict.safe ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(`swap: ${e.message}`); process.exit(2); });
}
