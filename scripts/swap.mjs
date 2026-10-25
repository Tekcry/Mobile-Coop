// Swap gate (docs/systems/swaps.md; process audit 2026-10-24 finding 6): before an account swap, is everything on this
// machine saved? Scans every registered git worktree, the heavy locks, the laptop queue and the auto-train status, prints
// a table and a final "SAFE" or "NOT SAFE: <n> items", and writes <scratch>/swap-status.json.
// Usage:
//   node scripts/swap.mjs status [--all] [--no-fetch] [--stale-hours <h>]   report only (exit 0)
//   node scripts/swap.mjs save [--commit-wip] [--all]                       report; exit 0 SAFE, 1 NOT SAFE
//   node scripts/swap.mjs prune --dry-run|--yes [--idle-hours <h>]
// Flags: --repo <path> (repeatable; env SWAP_REPO: one path): any checkout of a clone, whose worktree list is read. With
// none, every clone under --root is found (`git rev-parse --git-common-dir` of each folder, deduped) and all are
// scanned; --root <path> (env NS_ROOT, default C:/NightShift: the heavy*.lock files live there), --scratch <path> (env
// SWAP_SCRATCH, default <root>/scratch: auto-train files, swap-status.json), --out <file>, --machine <desktop|laptop>
// (env SWAP_MACHINE or LQ_WORKER: marks this machine's laptop-queue claims), --jobs <n> (parallel git, default 6).
// States per worktree: dirty (uncommitted changes; stale-dirty when every dirty file is untouched --stale-hours, default
// 12, 0 off: old debris that already survived swaps on disk, reported, not an item), unpushed (branch commits on no origin ref; no upstream counts),
// detached-local (detached HEAD with commits on no origin ref), prunable (clean branch merged into origin/master or whose
// upstream is gone, nothing unpushed: skipped), missing (folder gone: `git worktree prune` territory), detached, clean.
// Local branches checked out nowhere are rows too: unpushed, or stale-branch (tip commit --stale-hours old, not an item).
// dirty / unpushed / detached-local count as items, and so does a heavy lock whose pid is dead on this host, and under
// --commit-wip a failed fetch.
// --commit-wip (save only, opt-in): each dirty worktree on a job branch gets `git add -A` + commit "WIP: swap save <iso>"
// (hooks run; a secret-looking path - .env*, *.pem, *.key, *.p12, *.pfx, id_rsa*, *credentials*, *secret*, .npmrc,
// *.token - a file over 10 MB or 50 MB in all aborts that worktree before staging), then every job branch with unpushed commits is pushed to
// origin under its own name (never master / dev / train/* / the queue branches, never --force).
// prune: removes (`git worktree remove`, no --force) clean worktrees whose branch is merged into origin/master and whose
// git dir has been idle --idle-hours (default 24); never the main worktree, a locked one, a protected branch, a detached
// HEAD, one that holds another registered worktree or a .claude/worktrees entry, any hop of another worktree's
// node_modules link chain (read from every worktree, one folder level down, and every clone), one with ignored files beyond node_modules / dist / test-results, or one in use (rename probe); never
// deletes a branch.
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

/** File names --commit-wip never commits (any path segment, case-insensitive): keys, tokens, env and credential files. */
export const SECRET_PATTERNS = [/^\.env$/, /^\.env\..+/, /\.pem$/, /\.key$/, /\.p12$/, /\.pfx$/, /^id_rsa/, /credentials/, /secret/, /^\.npmrc$/, /\.token$/];

/** True when a path has a segment on the secret deny list. */
export const secretPath = (file) => norm(file).toLowerCase().split('/').some((s) => SECRET_PATTERNS.some((re) => re.test(s)));

/** Per-file and per-WIP-commit size caps of --commit-wip. */
export const MAX_WIP_FILE = 10 * 1024 * 1024;
export const MAX_WIP_TOTAL = 50 * 1024 * 1024;

/**
 * Why --commit-wip must not stage these entries (null: fine): a path on the secret deny list, a file over 10 MB (new,
 * modified, renamed or copied) or over 50 MB in all. `sizeOf(file)`: bytes, null when absent. Deletions are fine.
 */
export function wipGuard(entries, sizeOf) {
  const live = entries.filter((e) => !e.file.endsWith('/') && !(/D/.test(e.xy) && !/[AMRCT?]/.test(e.xy)));
  const secrets = live.filter((e) => secretPath(e.file)).map((e) => e.file);
  if (secrets.length) return `has secret-looking paths ${secrets.slice(0, 4).join(', ')}${secrets.length > 4 ? ', ...' : ''}`;
  let total = 0;
  for (const e of live) {
    const n = sizeOf(e.file) ?? 0;
    if (n > MAX_WIP_FILE) return `would commit ${e.file} (over 10 MB)`;
    total += n;
  }
  return total > MAX_WIP_TOTAL ? `would commit ${Math.round(total / 1048576)} MB (over 50 MB in one WIP commit)` : null;
}

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
  const c = { dirty: 0, unpushed: 0, 'detached-local': 0, 'stale-dirty': 0, 'stale-branch': 0, prunable: 0, missing: 0, detached: 0, clean: 0 };
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

/** A path with forward slashes and no trailing slash. */
export const norm = (p) => String(p).replace(/\\/g, '/').replace(/\/+$/, '');

/** True when `inner` is `outer` or lies under it (case-insensitive: Windows paths). */
export const within = (inner, outer) => { const i = norm(inner).toLowerCase(), o = norm(outer).toLowerCase(); return i === o || i.startsWith(`${o}/`); };

/**
 * Clean worktrees prune may remove: merged branch (not protected), not main / locked / detached, idle >= idleHours, and
 * not holding another registered worktree (`registered`: every worktree path of every clone), which plain
 * `git worktree remove` would delete with it, uncommitted work included.
 */
export function pruneCandidates(rows, { idleHours = 24, registered = [] } = {}) {
  return rows.filter((r) => r.state === 'prunable' && r.merged && !r.main && !r.locked && !r.detached
    && !protectedBranch(r.branch) && r.idleHours !== null && r.idleHours >= idleHours
    && !registered.some((p) => norm(p).toLowerCase() !== norm(r.path).toLowerCase() && within(p, r.path)));
}

/** Ignored entries prune may delete with a worktree; anything else ignored (.mocap-cache, build/, ...) blocks it. */
export const DISPOSABLE_IGNORED = ['node_modules', 'dist', 'test-results'];

/** Ignored paths of `git status --porcelain -z --ignored` outside DISPOSABLE_IGNORED. */
export const keptIgnored = (entries) => entries.filter((e) => e.xy === '!!' && !e.file.split('/').some((s) => DISPOSABLE_IGNORED.includes(s))).map((e) => e.file);

/**
 * In-use probe: rename `p` to `<p>.swap-probe` and back. True (in use) on EBUSY / EPERM / EACCES. A failed rename back
 * throws "STOP", which ends the whole prune.
 */
export function probeInUse(p, fsx = fs) {
  const tmp = `${p}.swap-probe`;
  try { fsx.renameSync(p, tmp); } catch (e) { if (['EBUSY', 'EPERM', 'EACCES'].includes(e?.code)) return true; throw e; }
  let back = null;
  try { fsx.renameSync(tmp, p); } catch (e) { back = e; }
  if (back) throw new Error(`STOP: ${p} was renamed to ${tmp} and could not be renamed back (${back.code ?? back.message}); rename it by hand before anything else`);
  return false;
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
  '  common: --repo <path> (repeatable; none: every clone under --root) --root <path> --scratch <path> --out <file> --machine <name> --jobs <n>',
].join('\n');

/** argv (after `node script`) + env -> options; throws an Error carrying the usage text. */
export function parseArgs(argv, env = {}) {
  const bad = (why) => new Error(`${why}\n${USAGE}`);
  const o = {
    cmd: null, all: false, fetch: true, commitWip: false, dryRun: false, yes: false, idleHours: 24, staleHours: 12, jobs: 6,
    repos: [], root: env.NS_ROOT || 'C:/NightShift', scratch: env.SWAP_SCRATCH || null,
    out: null, machine: env.SWAP_MACHINE || env.LQ_WORKER || null,
  };
  const val = { '--root': 'root', '--scratch': 'scratch', '--out': 'out', '--machine': 'machine', '--jobs': 'jobs', '--idle-hours': 'idleHours', '--stale-hours': 'staleHours' };
  const flag = { '--all': 'all', '--commit-wip': 'commitWip', '--dry-run': 'dryRun', '--yes': 'yes' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--repo') {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw bad('--repo needs a value');
      o.repos.push(v);
    } else if (a in val) {
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
  if (!o.repos.length && env.SWAP_REPO) o.repos.push(env.SWAP_REPO);
  o.jobs = Math.max(1, Math.floor(o.jobs));
  o.scratch ??= path.join(o.root, 'scratch');
  o.out ??= path.join(o.scratch, 'swap-status.json');
  return o;
}

// ---------------------------------------------------------------- git / fs I/O

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
 * refuses before staging on wipGuard (secret deny list, 10 MB per file, 50 MB in all). Hooks run.
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
  const why = wipGuard(entries, (f) => { try { return fs.lstatSync(path.join(wt, f)).size; } catch { return null; } });
  if (why) return { committed: false, problem: `WIP skipped: ${wt} ${why}; commit, ignore or remove it by hand` };
  // literal: a file named `*.ts` or `:(exclude)x` stages only itself, never a glob or magic match
  await git(wt, ['--literal-pathspecs', 'add', '-A', '--pathspec-from-file=-', '--pathspec-file-nul'], { input: `${paths.join('\0')}\0` });
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

/**
 * Distinct clones of the checkouts `dirs`: [{ repo (absolute common git dir), label }], one per clone in first-seen
 * order. Folders that are no git checkout are skipped. The common dir serves as `git -C` for clone-wide commands.
 */
export async function resolveClones(dirs, jobs = 6) {
  const dirsOut = await mapLimit(dirs, jobs, async (d) => (await git(d, ['rev-parse', '--path-format=absolute', '--git-common-dir'], { soft: true }))?.trim() || null);
  const seen = new Map();
  for (const c of dirsOut) {
    if (!c || seen.has(norm(c).toLowerCase())) continue;
    const repo = norm(c);
    seen.set(repo.toLowerCase(), { repo, label: path.posix.basename(repo === '.git' || repo.endsWith('/.git') ? path.posix.dirname(repo) : repo) });
  }
  return [...seen.values()];
}

/** Folders directly under `root` (auto-discovery input). */
const subdirs = (root) => fs.readdirSync(root, { withFileTypes: true })
  .filter((d) => (d.isDirectory() || d.isSymbolicLink()) && !d.name.endsWith('.swap-probe')).map((d) => norm(path.join(root, d.name)));

/** Facts and state for every worktree of one clone, plus its local branches checked out nowhere. */
async function scanWorktrees(o, clone, list, registered, log) {
  const repo = clone.repo;
  const merged = new Set(((await git(repo, ['branch', '--format=%(refname:short)', '--merged', 'origin/master'], { soft: true })) ?? '').split('\n').map((s) => s.trim()).filter(Boolean));
  const gone = new Set();
  const branchTips = [];
  const inWorktree = new Set(list.map((w) => w.branch).filter(Boolean));
  for (const l of (await git(repo, ['for-each-ref', 'refs/heads', '--format=%(refname)\t%(objectname)\t%(committerdate:unix)\t%(upstream:short)\t%(upstream:track)'])).split('\n')) {
    const [ref, sha, ct, up, track] = l.split('\t');
    if (!ref) continue;
    const b = ref.replace(/^refs\/heads\//, '');
    if (up && /\bgone\b/.test(track ?? '')) gone.add(b);
    if (!inWorktree.has(b)) branchTips.push({ branch: b, head: sha, tipAt: Number(ct) * 1000 });
  }
  const heads = [...new Set([...list.filter((w) => w.head && !w.missing).map((w) => w.head), ...branchTips.map((t) => t.head)])];
  const local = await unpushedSet(repo, heads);
  const counts = new Map();
  await mapLimit(heads.filter((x) => local.has(x)), o.jobs, async (h) => counts.set(h, Number((await git(repo, ['rev-list', '--count', h, '--not', '--remotes=origin'])).trim())));
  const branchRows = branchTips.filter((t) => counts.has(t.head)).map((t) => ({
    repo, label: clone.label, path: `(branch only) ${clone.label}`, branchOnly: true, head: t.head, branch: t.branch, detached: false, bare: false,
    locked: false, missing: false, main: false, dirty: 0, unpushed: counts.get(t.head), merged: false, upstreamGone: gone.has(t.branch), sample: [], idleHours: null,
    state: o.staleHours > 0 && Date.now() - t.tipAt >= o.staleHours * 3_600_000 ? 'stale-branch' : 'unpushed',
  }));
  log(`  ${clone.label}: ${list.length} worktrees, ${counts.size} heads with local-only commits (${branchRows.length} on branches checked out nowhere); reading status (${o.jobs} at a time)...`);
  const rows = await mapLimit(list, o.jobs, async (w) => {
    const missing = w.missing || !fs.existsSync(w.path);
    let dirtyFiles = [];
    let error = null;
    if (!missing && !w.bare) {
      const entries = await readDirty(w.path, registered);
      if (entries === null) error = 'git status failed';
      else dirtyFiles = entries.map((e) => e.file);
    }
    const age = dirtyAge(dirtyFiles, (f) => { try { return fs.statSync(path.join(w.path, f)).mtimeMs; } catch { return null; } }, Date.now());
    const facts = {
      ...w, missing, dirty: error ? 1 : dirtyFiles.length, dirtyAgeHours: error ? null : age,
      unpushed: counts.get(w.head) ?? 0, merged: !!w.branch && merged.has(w.branch), upstreamGone: !!w.branch && gone.has(w.branch),
    };
    return { repo, label: clone.label, ...facts, state: classifyWorktree(facts, { staleHours: o.staleHours }), sample: error ? [error] : dirtyFiles.slice(0, 3), idleHours: missing ? null : idleHours(w, repo) };
  });
  return [...rows, ...branchRows];
}

/** Rows of every clone (worktree lists read first, so each status skips every clone's registered worktrees). */
export async function scanAll(o, clones, log = () => {}) {
  const lists = await Promise.all(clones.map(async (c) => parsePorcelain(await git(c.repo, ['worktree', 'list', '--porcelain']))));
  const registered = lists.flat().map((w) => norm(w.path));
  const rows = [];
  for (let i = 0; i < clones.length; i++) rows.push(...await scanWorktrees(o, clones[i], lists[i], registered, log));
  return { rows, registered };
}

/** A link text as a plain absolute path: no `\\?\` / `\??\` prefix, resolved against the link's folder. */
const linkPath = (link, text) => path.resolve(path.dirname(link), String(text).replace(/^\\\\\?\\|^\\\?\?\\/, ''));

/**
 * Every hop of one node_modules link chain (A -> B/node_modules -> C/node_modules ...): each readlink target, then the
 * realpath. Empty when `nm` is no link. A broken hop ends the chain; the hops read so far stay.
 */
export function linkHops(nm, fsx = fs) {
  const out = [];
  let cur = nm;
  for (let i = 0; i < 32; i++) {
    let isLink = false;
    try { isLink = fsx.lstatSync(cur).isSymbolicLink(); } catch { break; }
    if (!isLink) break;
    let next;
    try { next = linkPath(cur, fsx.readlinkSync(cur)); } catch { break; }
    out.push(norm(next));
    cur = next;
  }
  if (out.length) try { out.push(norm(fsx.realpathSync.native(nm))); } catch { /* broken chain */ }
  return out;
}

/**
 * Every path some node_modules link chain passes through (a session sharing another worktree's install, which may
 * itself be a link): links read from `<dir>/node_modules` and `<dir>/<child>/node_modules` of each dir in `dirs`
 * (every registered worktree plus each clone's work tree). Deduped case- and slash-insensitively.
 */
export function nodeModulesTargets(dirs, fsx = fs) {
  const seen = new Map();
  const add = (nm) => { for (const h of linkHops(nm, fsx)) if (!seen.has(h.toLowerCase())) seen.set(h.toLowerCase(), h); };
  for (const d of new Set(dirs.map((x) => norm(x)))) {
    add(path.join(d, 'node_modules'));
    let kids = [];
    try { kids = fsx.readdirSync(d, { withFileTypes: true }); } catch { /* gone */ }
    for (const k of kids) if (k.isDirectory() && !['node_modules', '.git'].includes(k.name)) add(path.join(d, k.name, 'node_modules'));
  }
  return [...seen.values()];
}

/**
 * Why prune must keep this candidate (null: removable): it holds another worktree's node_modules link target, its
 * .claude/worktrees has entries, or it has ignored files beyond node_modules / dist / test-results.
 */
export async function pruneBlocker(r, linkTargets = []) {
  const t = linkTargets.find((x) => within(x, r.path));
  if (t) return `holds ${t}, a hop of another worktree's node_modules link`;
  let nested = [];
  try { nested = fs.readdirSync(path.join(r.path, '.claude', 'worktrees')); } catch { /* none */ }
  if (nested.length) return `.claude/worktrees holds ${nested.length} entries`;
  const s = await git(r.path, ['--no-optional-locks', 'status', '--porcelain', '-z', '--ignored'], { soft: true });
  if (s === null) return 'git status failed';
  const kept = keptIgnored(parseStatusEntries(s));
  return kept.length ? `ignored files would be deleted: ${kept.slice(0, 4).join(', ')}${kept.length > 4 ? ', ...' : ''}` : null;
}

/**
 * The heavy lock files to check under root: the desktop slots (heavy.lock 4191, heavy2.lock 4192), the laptop slots
 * (heavy-4189.lock, heavy-4192.lock; laptop-queue service SLOTS) and any other `heavy*.lock` in `names` (root's
 * listing). All lock formats (heavy-lock.mjs, the service's "laptop-queue | <id> <sha> pid N | <iso>") carry "pid N".
 */
export const HEAVY_LOCKS = ['heavy.lock', 'heavy2.lock', 'heavy-4189.lock', 'heavy-4192.lock'];
export function heavyLockFiles(root, names = []) {
  const extra = names.filter((n) => /^heavy[\w-]*\.lock$/i.test(n) && !HEAVY_LOCKS.includes(n)).sort();
  return [...HEAVY_LOCKS, ...extra].map((n) => path.join(root, n));
}

export async function scanLocks(o) {
  let names = [];
  try { names = fs.readdirSync(o.root); } catch { /* root missing: the defaults read as free */ }
  const files = heavyLockFiles(o.root, names);
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
export async function catFiles(repo, refs) {
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

async function scanQueue(repo) {
  const ls = await git(repo, ['ls-tree', '-r', '--name-only', 'origin/laptop-queue', 'requests/'], { soft: true });
  if (ls === null) return { error: 'no origin/laptop-queue' };
  const ids = ls.split('\n').filter((n) => n.endsWith('.json')).map((n) => path.posix.basename(n, '.json'));
  const texts = await catFiles(repo,ids.map((id) => `origin/laptop-queue:claims/${id}.json`));
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

/**
 * --commit-wip: WIP commits in dirty job worktrees, then pushes (from the row's clone, no force) of every job branch
 * with local-only commits, whatever its row state (branch-only and stale rows included).
 */
export async function commitWip(o, rows, iso, log = () => {}, registered = rows.filter((x) => !x.branchOnly).map((x) => norm(x.path))) {
  const problems = [];
  const touched = [];
  for (const r of rows.filter((x) => x.state === 'dirty')) {
    if (!wipAllowed(r)) { log(`  skip WIP in ${r.path}: ${r.branch ? `protected branch ${r.branch}` : 'detached HEAD'}`); continue; }
    try {
      const res = await wipCommit(r.path, registered, iso);
      if (res.problem) { problems.push(res.problem); continue; }
      if (!res.committed) continue;
      log(`  WIP committed: ${r.branch} (${r.path})`);
      touched.push(r);
    } catch (e) { problems.push(`WIP commit failed: ${r.path}: ${e.message.split('\n')[0]}`); }
  }
  const toPush = new Map();
  for (const r of [...touched, ...rows.filter((x) => x.unpushed > 0)]) if (wipAllowed(r)) toPush.set(`${r.repo}\0${r.branch}`, r);
  for (const r of toPush.values()) {
    try {
      await git(r.repo, ['push', '-q', 'origin', `refs/heads/${r.branch}:refs/heads/${r.branch}`]);
      log(`  pushed ${r.branch}${r.label ? ` (${r.label})` : ''}`);
    } catch (e) { problems.push(`push failed (no force used): ${r.branch}: ${e.message.split('\n').slice(-1)[0]}`); }
  }
  return { problems, changed: [...new Set([...touched, ...toPush.values()].map((r) => r.path))] };
}

function printReport(o, rows, locks, queue, autoTrain, verdict, log) {
  const shown = o.all ? rows : rows.filter((r) => RISK_STATES.includes(r.state));
  if (shown.length) {
    log(table([['STATE', 'REPO', 'BRANCH', 'DIRTY', 'UNPUSHED', 'PATH / SAMPLE'],
      ...shown.map((r) => [r.state, r.label ?? '', r.branch ?? `(detached ${String(r.head).slice(0, 8)})`, r.dirty, r.unpushed,
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
  const clones = await resolveClones(o.repos.length ? o.repos : subdirs(o.root), o.jobs * 2);
  if (!clones.length) throw new Error(`no git clone found (${o.repos.length ? o.repos.join(', ') : `no folder under ${o.root} is a checkout`})`);
  log(`clones: ${clones.map((c) => `${c.label} (${c.repo})`).join(', ')}`);
  const extra = [];
  if (o.fetch) {
    for (const c of clones) {
      log(`fetching origin in ${c.label}...`);
      if (await git(c.repo, ['fetch', '-q', '--prune', 'origin'], { soft: true }) !== null) continue;
      log('  fetch failed: using the refs as they are');
      if (o.commitWip) extra.push(`fetch failed in ${c.repo}: unpushed counts and pushes are not trustworthy`);
    }
  }
  const scan = await scanAll(o, clones, log);
  const registered = scan.registered;
  let rows = scan.rows;
  if (o.cmd === 'prune') {
    const cands = pruneCandidates(rows, { idleHours: o.idleHours, registered });
    const cloneTrees = clones.map((c) => (c.repo.endsWith('/.git') ? path.posix.dirname(c.repo) : c.repo));
    const linkTargets = nodeModulesTargets([...registered, ...cloneTrees]);
    log(`  ${linkTargets.length} node_modules link hops read`);
    log(`${cands.length} prunable worktrees (clean, merged into origin/master, idle ${o.idleHours} h+)${o.dryRun ? ' - dry run' : ''}:`);
    let removed = 0, failed = 0, kept = 0;
    for (const r of cands) {
      const why = await pruneBlocker(r, linkTargets);
      if (why) { kept++; log(`  keep ${r.path}: ${why}`); continue; }
      if (o.dryRun) { log(`  would remove ${r.path} (${r.label} ${r.branch}, idle ${Math.round(r.idleHours)} h)`); continue; }
      if (probeInUse(r.path)) { kept++; log(`  keep ${r.path}: in use (rename probe refused)`); continue; }
      const nm = path.join(r.path, 'node_modules'); // a linked install: drop the link, never what it points at
      let linkTo = null;
      try { if (fs.lstatSync(nm).isSymbolicLink()) { linkTo = fs.readlinkSync(nm); fs.unlinkSync(nm); } } catch { /* none */ }
      const ok = await git(r.repo, ['worktree', 'remove', r.path], { soft: true });
      if (ok === null) {
        failed++;
        log(`  NOT removed (git refused): ${r.path}`);
        if (linkTo) try { fs.symlinkSync(linkTo, nm, 'junction'); } catch (e) { log(`  node_modules link not restored (${e.code ?? e.message}): was -> ${linkTo}`); }
      } else { removed++; log(`  removed ${r.path} (${r.branch}; branch kept)`); }
    }
    log(o.dryRun ? `kept ${kept}` : `removed ${removed}, refused ${failed}, kept ${kept}; branches untouched`);
    return 0;
  }
  const iso = new Date().toISOString();
  if (o.commitWip) {
    const r = await commitWip(o, rows, iso, log, registered);
    extra.push(...r.problems);
    if (r.changed.length) rows = (await scanAll(o, clones)).rows; // re-read after commits / pushes
  }
  const [locks, queue] = await Promise.all([scanLocks(o), scanQueue(clones[0].repo)]);
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
