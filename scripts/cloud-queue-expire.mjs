// Cloud claim expiry (docs/systems/swaps.md; process audit 2026-10-24 finding 6): a cloud builder that dies at an account
// swap leaves its brief `status: claimed <title> <iso>` on origin/cloud-queue for good. Builders re-stamp their claim time
// every 30 min (the heartbeat, cloud-queue README); this script reopens (line 1 -> `status: open`) every brief whose claim
// is older than --max-min (default 90: three missed heartbeats) AND whose branch (the brief's "New branch `...`") has no
// commit newer than the claim on origin. A brief with no branch named expires on the claim age alone.
// Usage:
//   node scripts/cloud-queue-expire.mjs [--dry-run|--yes] [--max-min <n>] [--repo <path>] [--no-fetch]
// --dry-run (the default) lists what would reopen; --yes commits on top of origin/cloud-queue (temp index, no checkout)
// and pushes, never --force: a rejected push refetches and re-plans (a builder may have re-stamped meanwhile), 3 tries.
// --repo: any checkout of the repo (env SWAP_REPO, default C:/NightShift/Mobile-Coop). Exit 0 ok, 1 push failed, 2 usage.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------- pure helpers (tests/swap.test.ts)

/**
 * A brief's line 1 -> { kind: open | claimed | done | blocked | null, title, at (epoch ms, NaN when unreadable), rest }.
 * `status: claimed Night Shift | Cloud Builder 1 2026-10-24T10:37Z`: the title is everything before the last token.
 */
export function parseStatusLine(line) {
  const m = /^status:\s*(open|claimed|done|blocked)\b\s*(.*)$/.exec(String(line ?? '').trim());
  if (!m) return { kind: null, title: '', at: NaN, rest: '' };
  const rest = m[2].trim();
  if (m[1] !== 'claimed') return { kind: m[1], title: '', at: NaN, rest };
  const t = /^(.*?)\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)$/.exec(rest);
  if (!t) return { kind: 'claimed', title: rest, at: NaN, rest };
  const iso = /Z|[+-]\d{2}:?\d{2}$/.test(t[2]) ? t[2] : `${t[2]}Z`; // no zone: read as UTC, like the builders write it
  return { kind: 'claimed', title: t[1], at: Date.parse(iso), rest };
}

/** The brief's result branch: "New branch `feature/x`" or "New branch: `feature/x`"; null when none is named. */
export function briefBranch(text) {
  const m = /new branch:?\*{0,2}\s*`([^`\s]+)`/i.exec(String(text ?? ''));
  return m ? m[1] : null;
}

/** True when a claim at `claimAt` is `maxMin`+ old at `now` and the branch shows no commit after the claim. */
export function claimExpired({ claimAt, now, maxMin, lastPushAt = null }) {
  if (!Number.isFinite(claimAt)) return false;
  if (now - claimAt < maxMin * 60_000) return false;
  return !(Number.isFinite(lastPushAt) && lastPushAt > claimAt);
}

/** The brief text with line 1 set to `status: open` (the rest untouched, line endings kept). */
export function reopenText(text) {
  const s = String(text);
  const nl = s.indexOf('\n');
  return nl < 0 ? 'status: open\n' : `status: open${s[nl - 1] === '\r' ? '\r' : ''}${s.slice(nl)}`;
}

/**
 * Briefs to reopen: [{ path, title, at, branch, ageMin, lastPushAt }] from briefs [{ path, text }], branch tip times
 * (`pushTimes[branch]`: epoch ms or null), now and maxMin.
 */
export function planExpiry(briefs, { now, maxMin = 90, pushTimes = {} }) {
  const out = [];
  for (const b of briefs) {
    const st = parseStatusLine(String(b.text).split('\n')[0]);
    if (st.kind !== 'claimed') continue;
    const branch = briefBranch(b.text);
    const lastPushAt = branch ? pushTimes[branch] ?? null : null;
    if (!claimExpired({ claimAt: st.at, now, maxMin, lastPushAt })) continue;
    out.push({ path: b.path, title: st.title, at: new Date(st.at).toISOString(), branch, ageMin: Math.round((now - st.at) / 60_000), lastPushAt });
  }
  return out;
}

/** argv -> { yes, maxMin, repo, fetch }; throws on a bad flag. */
export function parseExpireArgs(argv, env = {}) {
  const o = { yes: false, maxMin: 90, repo: env.SWAP_REPO || 'C:/NightShift/Mobile-Coop', fetch: true };
  let dry = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--yes') o.yes = true;
    else if (a === '--dry-run') dry = true;
    else if (a === '--no-fetch') o.fetch = false;
    else if (a === '--max-min') { const v = argv[++i]; if (!/^\d+$/.test(v ?? '') || Number(v) < 1) throw new Error('--max-min needs a whole number of minutes'); o.maxMin = Number(v); }
    else if (a === '--repo') { const v = argv[++i]; if (!v) throw new Error('--repo needs a path'); o.repo = v; }
    else throw new Error(`unknown argument ${a}`);
  }
  if (dry && o.yes) throw new Error('pass --dry-run or --yes, not both');
  return o;
}

// ---------------------------------------------------------------- git I/O

function git(repo, args, { input, env, soft = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile('git', ['-C', repo, ...args], { maxBuffer: 64 * 1024 * 1024, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env } }, (err, stdout, stderr) => {
      if (err && !soft) reject(new Error(`git ${args.join(' ')}: ${String(stderr || err.message).trim()}`));
      else resolve(err ? null : stdout);
    });
    if (input !== undefined) child.stdin.end(input);
  });
}

async function readBriefs(repo) {
  const names = (await git(repo, ['ls-tree', '-r', '--name-only', 'origin/cloud-queue', 'briefs/'])).split('\n').filter((n) => n.endsWith('.md'));
  return Promise.all(names.map(async (p) => ({ path: p, text: (await git(repo, ['show', `origin/cloud-queue:${p}`])).replace(/\r\n/g, '\n') })));
}

async function plan(o) {
  const briefs = await readBriefs(o.repo);
  const pushTimes = {};
  for (const b of briefs) {
    if (parseStatusLine(b.text.split('\n')[0]).kind !== 'claimed') continue;
    const br = briefBranch(b.text);
    if (!br || br in pushTimes) continue;
    const ct = await git(o.repo, ['log', '-1', '--format=%ct', `refs/remotes/origin/${br}`], { soft: true });
    pushTimes[br] = ct && ct.trim() ? Number(ct.trim()) * 1000 : null;
  }
  return { briefs, list: planExpiry(briefs, { now: Date.now(), maxMin: o.maxMin, pushTimes }) };
}

/** One commit on top of origin/cloud-queue reopening `list`, pushed without force; true when pushed. */
async function pushReopen(o, briefs, list) {
  const parent = (await git(o.repo, ['rev-parse', 'origin/cloud-queue'])).trim();
  const idx = path.join(os.tmpdir(), `cq-expire-${process.pid}.index`);
  const env = { GIT_INDEX_FILE: idx };
  try {
    await git(o.repo, ['read-tree', parent], { env });
    for (const e of list) {
      const text = briefs.find((b) => b.path === e.path).text;
      const blob = (await git(o.repo, ['hash-object', '-w', '--stdin'], { input: reopenText(text) })).trim();
      await git(o.repo, ['update-index', '--cacheinfo', `100644,${blob},${e.path}`], { env });
    }
    const tree = (await git(o.repo, ['write-tree'], { env })).trim();
    const body = list.map((e) => `- ${e.path}: claimed by ${e.title} at ${e.at} (${e.ageMin} min, ${e.branch ? `no push to ${e.branch} since` : 'no branch named'})`).join('\n');
    const msg = `Reopen ${list.length} expired cloud claim${list.length > 1 ? 's' : ''} (no heartbeat ${o.maxMin} min, no push)\n\n${body}\n`;
    const commit = (await git(o.repo, ['commit-tree', tree, '-p', parent, '-F', '-'], { input: msg })).trim();
    return (await git(o.repo, ['push', '-q', 'origin', `${commit}:refs/heads/cloud-queue`], { soft: true })) !== null;
  } finally { fs.rmSync(idx, { force: true }); }
}

async function main(argv) {
  const o = parseExpireArgs(argv, process.env);
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (o.fetch || attempt > 1) await git(o.repo, ['fetch', '-q', 'origin'], { soft: true });
    const { briefs, list } = await plan(o);
    const claimed = briefs.filter((b) => parseStatusLine(b.text.split('\n')[0]).kind === 'claimed').length;
    console.log(`cloud-queue: ${briefs.length} briefs, ${claimed} claimed, ${list.length} expired (claim ${o.maxMin} min+, no push since)`);
    for (const e of list) console.log(`  ${e.path}: ${e.title} at ${e.at} (${e.ageMin} min)${e.branch ? `, ${e.branch} ${e.lastPushAt ? `last commit ${new Date(e.lastPushAt).toISOString()}` : 'not on origin'}` : ', no branch named'}`);
    if (!list.length || !o.yes) { if (list.length) console.log('dry run: pass --yes to reopen'); return 0; }
    if (await pushReopen(o, briefs, list)) { console.log(`reopened ${list.length} (pushed to origin/cloud-queue)`); return 0; }
    console.log(`push rejected (try ${attempt}/3): refetching`);
  }
  console.error('cloud-queue-expire: push kept failing; nothing forced');
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(`cloud-queue-expire: ${e.message}`); process.exit(2); });
}
