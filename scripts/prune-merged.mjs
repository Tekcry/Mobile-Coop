// Weekly prune of merged worktrees and branches (doc-guard; Michael 2026-10-25 ~11:00, merged branches: "Yes, weekly").
// Dry run by default: it lists what it would remove; --apply removes it. Based on scratch/doc-clarity/prune-worktrees.sh.
//   Worktrees: a linked worktree (never the main one, never a locked or service worktree in KEEP_WORKTREES) whose HEAD is
//     in origin/master, with a clean `git status --porcelain` and no commit or checkout (HEAD / its reflog) for
//     --worktree-hours (24): `git worktree remove <dir>` (no --force: a dirty one is refused by git too).
//   Branches: remote (origin) and local branches whose tip is in origin/master and older than --branch-days (7) by
//     committer date: `git push origin --delete` and `git branch -D` (only after this script's own merged check).
//     Never: an unmerged branch, master / main / dev / ct-movement / laptop-queue / cloud-queue / feature/menu /
//     feature/kestrel, train/*, a branch with an open PR (no gh answer = no remote deletes), a branch checked out in a
//     worktree that stays.
// Log: <log-dir>/<YYYY-MM-DD>.txt (appended; default C:/NightShift/scratch/prune-log).
// Usage: node scripts/prune-merged.mjs [--apply] [--clone C:/NightShift/Mobile-Coop] [--log-dir <dir>]
//          [--worktree-hours 24] [--branch-days 7] [--no-fetch]
// Weekly task: scripts/prune-task.ps1 (the orchestrator installs it). Exit 0 done, 1 an error (logged).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PROTECTED_BRANCHES = new Set(['master', 'main', 'dev', 'ct-movement', 'laptop-queue', 'cloud-queue', 'feature/menu', 'feature/kestrel', 'HEAD']);
/** Worktree folder names that are services or long-lived checkouts (never removed, whatever their HEAD). */
export const KEEP_WORKTREES = /^Mobile-Coop(?:-(?:menu|autotrain|train|laptop-queue-svc|laptop-queue|locomotion|integration|doc-integration))?$/i;

/** True for a branch name the prune never deletes. */
export function isProtectedBranch(name) {
  return PROTECTED_BRANCHES.has(name) || /^train\//.test(name) || /^(?:origin\/)?HEAD$/.test(name);
}

/** `git worktree list --porcelain` -> [{ path, head, branch (short or null), locked, prunable, main }]. */
export function parseWorktrees(text) {
  const out = [];
  for (const block of String(text).split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/).filter(Boolean);
    if (!lines.length || !lines[0].startsWith('worktree ')) continue;
    const w = { path: lines[0].slice(9), head: null, branch: null, locked: false, prunable: false, main: out.length === 0 };
    for (const l of lines.slice(1)) {
      if (l.startsWith('HEAD ')) w.head = l.slice(5);
      else if (l.startsWith('branch ')) w.branch = l.slice(7).replace(/^refs\/heads\//, '');
      else if (l === 'locked' || l.startsWith('locked ')) w.locked = true;
      else if (l === 'prunable' || l.startsWith('prunable ')) w.prunable = true;
    }
    out.push(w);
  }
  return out;
}

/**
 * Which worktrees go (pure). `facts(w)` -> { exists, merged (HEAD in origin/master), clean, idleHours }.
 * -> { remove: [{ ...w, idleHours }], keep: [{ ...w, why }] }.
 */
export function selectWorktrees(list, facts, { hours = 24 } = {}) {
  const remove = [], keep = [];
  for (const w of list) {
    const why = (() => {
      if (w.main) return 'main worktree';
      if (KEEP_WORKTREES.test(path.basename(w.path))) return 'service worktree';
      if (w.locked) return 'locked';
      const f = facts(w);
      if (!f.exists) return 'folder missing (git worktree prune clears it)';
      if (!f.merged) return 'HEAD not in origin/master';
      if (!f.clean) return 'uncommitted changes';
      if (!(f.idleHours >= hours)) return `active ${Math.round(f.idleHours)} h ago`;
      w.idleHours = f.idleHours;
      return null;
    })();
    if (why) keep.push({ ...w, why }); else remove.push(w);
  }
  return { remove, keep };
}

/**
 * Which branches go (pure). `refs` = [{ name (short, no origin/), sha, time (unix s), remote: bool }]; `merged(sha)`;
 * `openPrHeads` a Set of branch names with an open PR (null: unknown -> no remote deletes); `inUse` a Set of branches
 * checked out in worktrees that stay. -> { remove: [ref], keep: [{ ...ref, why }] }.
 */
export function selectBranches(refs, { merged, now, days = 7, openPrHeads, inUse = new Set() }) {
  const remove = [], keep = [];
  for (const r of refs) {
    const why = (() => {
      if (isProtectedBranch(r.name)) return 'protected';
      if (inUse.has(r.name)) return 'checked out in a worktree';
      if (r.remote && openPrHeads == null) return 'open PRs unknown (gh failed)';
      if (openPrHeads?.has(r.name)) return 'open PR';
      if (!merged(r.sha)) return 'not merged into origin/master';
      const age = (now - r.time) / 86400;
      if (!(age >= days)) return `tip ${age.toFixed(1)} days old`;
      return null;
    })();
    if (why) keep.push({ ...r, why }); else remove.push(r);
  }
  return { remove, keep };
}

/** "n reason, m reason" for a kept list (reasons with a number, like "active 3 h ago", are grouped by their words). */
export function reasons(kept) {
  const n = new Map();
  for (const k of kept) { const key = k.why.replace(/\d+(?:\.\d+)?/g, 'N'); n.set(key, (n.get(key) ?? 0) + 1); }
  return [...n].sort((a, b) => b[1] - a[1]).map(([w, c]) => `${c} ${w}`).join(', ') || 'none';
}

/** Splits a list into chunks of `n` (one `git push --delete` per chunk). */
export const chunks = (xs, n) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

// ---- CLI ----------------------------------------------------------------------------------------------------------

function sh(args, cwd, timeout = 120_000) {
  const r = spawnSync(args[0], args.slice(1), { cwd, encoding: 'utf8', timeout, windowsHide: true, maxBuffer: 64 << 20 });
  return { status: r.error ? -1 : (r.status ?? -1), out: (r.stdout ?? '').trim(), err: (r.stderr ?? (r.error ? String(r.error.message) : '')).trim() };
}

function parseArgs(argv) {
  const val = (name, d) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
  return {
    apply: argv.includes('--apply'),
    fetch: !argv.includes('--no-fetch'),
    clone: val('--clone', 'C:/NightShift/Mobile-Coop'),
    logDir: val('--log-dir', 'C:/NightShift/scratch/prune-log'),
    hours: Number(val('--worktree-hours', '24')),
    days: Number(val('--branch-days', '7')),
  };
}

export function main(argv = process.argv.slice(2), now = Date.now()) {
  const o = parseArgs(argv);
  const date = new Date(now).toLocaleDateString('en-CA');
  const lines = [];
  const log = (s) => { lines.push(s); console.log(s); };
  const git = (...a) => sh(['git', '-C', o.clone, ...a]);
  let code = 0;
  try {
    log(`prune-merged ${new Date(now).toISOString()} ${o.apply ? 'APPLY' : 'dry run'} clone=${o.clone} worktrees idle>=${o.hours} h, branches >=${o.days} days`);
    if (o.fetch) {
      const f = sh(['git', '-C', o.clone, 'fetch', '-q', 'origin'], undefined, 600_000);
      if (f.status !== 0) throw new Error(`git fetch failed: ${f.err}`);
    }
    const master = git('rev-parse', '--verify', 'origin/master^{commit}');
    if (master.status !== 0) throw new Error('no origin/master');
    const mergedCache = new Map();
    const merged = (sha) => {
      if (!mergedCache.has(sha)) mergedCache.set(sha, git('merge-base', '--is-ancestor', sha, master.out).status === 0);
      return mergedCache.get(sha);
    };

    // worktrees
    const list = parseWorktrees(git('worktree', 'list', '--porcelain').out);
    const facts = (w) => {
      if (!fs.existsSync(w.path) || !w.head) return { exists: false };
      const gd = sh(['git', '-C', w.path, 'rev-parse', '--absolute-git-dir']).out;
      const mt = ['HEAD', 'logs/HEAD'].map((f) => { try { return fs.statSync(path.join(gd, f)).mtimeMs; } catch { return 0; } });
      const st = sh(['git', '-C', w.path, 'status', '--porcelain']);
      return { exists: true, merged: merged(w.head), clean: st.status === 0 && st.out === '', idleHours: (now - Math.max(...mt)) / 3_600_000 };
    };
    const wt = selectWorktrees(list, facts, { hours: o.hours });
    log(`\nworktrees: ${list.length}, remove ${wt.remove.length}, keep ${wt.keep.length}`);
    for (const w of wt.remove) {
      log(`  REMOVE ${w.path} [${w.branch ?? 'detached'}] idle ${Math.round(w.idleHours)} h`);
      if (o.apply) {
        const r = git('worktree', 'remove', w.path);
        if (r.status !== 0) { log(`    ERR ${r.err}`); w.failed = true; }
      }
    }
    log(`  kept: ${reasons(wt.keep)}`);
    const removedPaths = new Set(wt.remove.filter((w) => !w.failed && o.apply).map((w) => w.path));
    const inUse = new Set(list.filter((w) => w.branch && !removedPaths.has(w.path)).map((w) => w.branch));

    // branches
    const pr = sh(['gh', 'pr', 'list', '--state', 'open', '--limit', '500', '--json', 'headRefName', '--jq', '.[].headRefName'], o.clone);
    const openPrHeads = pr.status === 0 ? new Set(pr.out.split('\n').filter(Boolean)) : null;
    if (!openPrHeads) log(`\ngh pr list failed (${pr.err.slice(0, 200)}): no remote branch is deleted this run`);
    const refs = git('for-each-ref', '--format=%(refname)%09%(objectname)%09%(committerdate:unix)', 'refs/remotes/origin', 'refs/heads').out
      .split('\n').filter(Boolean).map((l) => {
        const [ref, sha, time] = l.split('\t');
        const remote = ref.startsWith('refs/remotes/origin/');
        return { name: ref.replace(/^refs\/remotes\/origin\/|^refs\/heads\//, ''), sha, time: Number(time), remote };
      }).filter((r) => r.name !== 'HEAD');
    const br = selectBranches(refs, { merged, now: now / 1000, days: o.days, openPrHeads, inUse });
    const rem = br.remove.filter((r) => r.remote), loc = br.remove.filter((r) => !r.remote);
    log(`\nbranches: ${refs.length} refs, delete ${rem.length} remote + ${loc.length} local, keep ${br.keep.length}`);
    log(`  kept: ${reasons(br.keep)}`);
    for (const r of rem) log(`  DELETE origin/${r.name} ${r.sha.slice(0, 9)} ${new Date(r.time * 1000).toLocaleDateString('en-CA')}`);
    for (const r of loc) log(`  DELETE ${r.name} (local) ${r.sha.slice(0, 9)} ${new Date(r.time * 1000).toLocaleDateString('en-CA')}`);
    if (o.apply) {
      for (const c of chunks(rem.map((r) => r.name), 40)) {
        const r = git('push', '-q', 'origin', '--delete', ...c);
        if (r.status !== 0) log(`  ERR push --delete ${c.join(' ')}: ${r.err}`);
      }
      for (const c of chunks(loc.map((r) => r.name), 40)) {
        const r = git('branch', '-D', ...c);
        if (r.status !== 0) log(`  ERR branch -D ${c.join(' ')}: ${r.err}`);
      }
    }
    if (!o.apply) log('\ndry run: nothing removed (rerun with --apply)');
  } catch (e) {
    log(`ERROR ${e.message}`);
    code = 1;
  }
  try {
    fs.mkdirSync(o.logDir, { recursive: true });
    fs.appendFileSync(path.join(o.logDir, `${date}.txt`), `${lines.join('\n')}\n\n`);
  } catch (e) { console.error(`could not write the log: ${e.message}`); }
  return code;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = main();
