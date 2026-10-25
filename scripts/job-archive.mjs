// Auto-archive of a finished job's docs (doc-guard, Michael 2026-10-25 ~11:00: "Auto-archive job docs"). A job's final
// PR carries a line `Job-done: <job>` in its body; the train's version commit (scripts/merge-train.mjs build, on git
// objects) then moves docs/<job>/ to docs/archive/<job>/ and rewrites the links to it, so the doc lint stays green.
// Pure helpers (unit tested in tests/jobArchive.test.ts): merge-train `build` does the git reads and index writes;
// archiveInWorktree does the same on disk for merge-train `single` (a lone-PR release).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Folders under docs/ that are never a job's (a Job-done line naming one is ignored). */
export const NOT_JOBS = new Set(['archive', 'systems', 'templates', 'orchestrator', 'design', 'research', 'reviews', 'prompts', 'audio']);

/** The jobs a PR body names on `Job-done: <job>` lines (case-insensitive key, backticks allowed), deduplicated. */
export function jobDoneJobs(body) {
  const out = [];
  for (const m of String(body ?? '').matchAll(/^[ \t>*-]*Job-done:[ \t]*`?([A-Za-z0-9][\w.-]*)`?[ \t]*$/gim)) {
    const job = m[1].replace(/\.+$/, '');
    if (!NOT_JOBS.has(job.toLowerCase()) && !job.includes('..') && !out.includes(job)) out.push(job);
  }
  return out;
}

/**
 * The moves for one job: `files` are the tree paths under docs/<job>/ (from `git ls-tree -r`), `taken(prefix)` says
 * whether docs/archive/<name>/ already holds files. The target is docs/archive/<job>/, else docs/archive/<job>-<date>/
 * (then -2, -3, ...). -> { from: 'docs/<job>', to: 'docs/archive/<name>', moves: [{ from, to }] } or null (no files).
 */
export function archiveMoves(job, files, taken, date) {
  const from = `docs/${job}`;
  const inside = files.filter((f) => f.startsWith(`${from}/`));
  if (!inside.length) return null;
  let to = `docs/archive/${job}`;
  for (let k = 1; taken(to); k++) to = `docs/archive/${job}-${date}${k > 1 ? `-${k}` : ''}`;
  return { from, to, moves: inside.map((f) => ({ from: f, to: `${to}${f.slice(from.length)}` })) };
}

/** `p` (a repo path) after the moves (`plans`: archiveMoves results), or `p` itself. */
export function movedPath(p, plans) {
  for (const pl of plans) if (p === pl.from || p.startsWith(`${pl.from}/`)) return `${pl.to}${p.slice(pl.from.length)}`;
  return p;
}

const LINK_RE = /(\]\(\s*<?)([^)\s>]+)(>?(?:\s+"[^"]*")?\s*\))/g;

/**
 * The text of the markdown file at `file` (its path before the moves) with every pointer fixed for the moves:
 * relative links are re-resolved from the file's new folder to their target's new path (so links out of a moved folder
 * and links into it both keep working), and literal repo paths `docs/<job>/...` become `docs/archive/<name>/...`.
 */
export function rewriteArchiveLinks(text, file, plans) {
  const newFile = movedPath(file, plans);
  const dirOld = path.posix.dirname(file);
  const dirNew = path.posix.dirname(newFile);
  let out = text.replace(LINK_RE, (all, pre, target, post) => {
    if (/^([a-z][a-z0-9+.-]*:|#|\/|<|\{)/i.test(target)) return all;
    const cut = target.search(/[#?]/);
    const bare = cut >= 0 ? target.slice(0, cut) : target;
    const rest = cut >= 0 ? target.slice(cut) : '';
    if (!bare) return all;
    const resolved = path.posix.normalize(path.posix.join(dirOld, bare));
    if (resolved.startsWith('../')) return all;
    const dest = movedPath(resolved.replace(/\/$/, ''), plans);
    if (dest === resolved.replace(/\/$/, '') && dirNew === dirOld) return all;
    let rel = path.posix.relative(dirNew, dest) || '.';
    if (bare.endsWith('/') && !rel.endsWith('/')) rel += '/';
    if (bare.startsWith('./') && !rel.startsWith('.')) rel = `./${rel}`;
    return `${pre}${rel}${rest}${post}`;
  });
  for (const pl of plans) {
    const esc = pl.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(?<![\\w./-])${esc}(?=/|\`|\\s|$|[),.;:])`, 'g'), pl.to);
  }
  return out;
}

/**
 * The same archive in a checked-out worktree (merge-train `single`, which commits from a worktree): for each job with
 * tracked files under docs/<job>/, the markdown files that point at it (outside docs/archive/, changes/ and
 * CHANGELOG.md) and the moved ones get their links rewritten on disk, then `git mv` moves the folder. Nothing is staged
 * beyond the moves; the caller adds `rewritten` (and docs/) to its commit.
 * -> [{ job, from, to, files, rewritten: [paths after the move] }].
 */
export function archiveInWorktree({ root, jobs, date }) {
  const git = (args) => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20 });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${(r.stderr || r.stdout || '').trim()}`);
    return r.stdout;
  };
  const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean);
  const plans = [];
  for (const job of jobs) {
    const plan = archiveMoves(job, tracked, (to) => tracked.some((f) => f.startsWith(`${to}/`)) || plans.some((p) => p.to === to), date);
    if (plan) plans.push({ ...plan, job });
  }
  if (!plans.length) return [];
  const moved = new Map(plans.flatMap((p) => p.moves).map((m) => [m.from, m.to]));
  const rewritten = [];
  for (const file of tracked) {
    if (!file.endsWith('.md')) continue;
    if (!moved.has(file) && (/^docs\/archive\//.test(file) || /^changes\//.test(file) || file === 'CHANGELOG.md')) continue;
    const abs = path.join(root, file);
    const text = fs.readFileSync(abs, 'utf8');
    if (!moved.has(file) && !plans.some((p) => text.includes(`${p.job}/`))) continue;
    const next = rewriteArchiveLinks(text, file, plans);
    if (next === text) continue;
    fs.writeFileSync(abs, next);
    rewritten.push(moved.get(file) ?? file);
  }
  for (const p of plans) {
    fs.mkdirSync(path.join(root, path.posix.dirname(p.to)), { recursive: true });
    git(['mv', p.from, p.to]);
  }
  return plans.map((p) => ({ job: p.job, from: p.from, to: p.to, files: p.moves.length,
    rewritten: rewritten.filter((f) => !f.startsWith(`${p.to}/`)) }));
}
