// Claims check (intake gates, Michael 2026-10-24 ~21:50; process audit finding 3): every job PLAN carries a claims
// block (docs/templates/plan.md) naming the files / globs, maps, PROTOCOL (wire) messages and save shape it changes.
// This script reads the claims of every open PLAN and reports overlaps between branches, so two jobs never build on
// the same files, map or wire at once without the orchestrator knowing. The plan checker runs it (docs/templates/plan-check.md).
//
// Block format, in PLAN.md:
//   ```claims
//   files:
//     - src/world/maps/campus/**
//     - tests/campus*.test.ts
//   maps: campusOps
//   protocol: none            (or the message names, e.g. BodyCarry, CarryDrop)
//   save: none                (or the save fields)
//   ```
// A key takes a comma list on its line or `- item` lines below it; `none`, `-` or empty means no claim. A value with a
// template placeholder (`<...>`) is an error; an indented line that is not a `- item` is ignored with a warning.
// Shared files every job touches (SHARED_GLOBS: CHANGELOG.md, changes/**, package files, STATE / HANDOFF, ROADMAP)
// never overlap. PLANs in one folder (docs/<job>/PLAN*.md) are one job (its slice branches, a PLAN2) and never overlap
// each other.
//
// Usage:
//   node scripts/claims-check.mjs                                  scan origin/feature/* for PLANs changed vs origin/master
//   node scripts/claims-check.mjs origin/feature/a:docs/a/PLAN.md origin/feature/b:docs/b/PLAN.md
//   node scripts/claims-check.mjs --plan docs/<job>/PLAN.md [--name feature/<job>]   one local PLAN against the scan
//   options: --prefix origin/feature/ --base origin/master --since-days 7 --json
// Exit: 0 no overlap, 1 overlaps found, 2 an argument / git error, a --plan without a claims block or with placeholders
// (without --plan: any scanned plan with placeholders).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { globsOverlap, matchesAny, normalize } from './glob-match.mjs';

export const CLAIM_KEYS = ['files', 'maps', 'protocol', 'save'];
const NONE = new Set(['', 'none', '-', 'n/a', 'no']);
const clean = (s) => s.replace(/\s+#.*$/, '').trim().replace(/^[`'"]+|[`'"]+$/g, '').trim();
/** A template placeholder left in, e.g. `<src/area/**>` or `<map ids, or none>`. */
const PLACEHOLDER = /<[^<>]*>/;

/**
 * Files every job touches (changelog fragments, package files, STATE / HANDOFF, the roadmap): never a claim, so they
 * never make an overlap (docs/templates/plan.md says not to list them).
 */
export const SHARED_GLOBS = ['CHANGELOG.md', 'changes/**', 'package.json', 'package-lock.json', 'docs/**/STATE*.md',
  'docs/orchestrator/HANDOFF*.md', 'docs/ROADMAP.md'];
/** True when a claimed file or glob lies inside the shared list (`docs/x/STATE.md`, `changes/**`). */
export const isShared = (claim) => matchesAny(claim, SHARED_GLOBS);

/**
 * The claims block of a PLAN with its problems: `{ claims, errors, warnings }`, claims null when there is no block.
 * errors: template placeholders (`<...>`) left in a value (the value is dropped). warnings: an indented line under a
 * key that is not a `- item` (ignored), and shared files that were claimed (ignored in overlaps).
 */
export function lintClaims(text) {
  const errors = [];
  const warnings = [];
  const m = /^[ \t]*```+[ \t]*claims[ \t]*\r?\n([\s\S]*?)^[ \t]*```/m.exec(String(text));
  if (!m) return { claims: null, errors, warnings };
  const claims = { files: [], maps: [], protocol: [], save: [] };
  const add = (key, value) => {
    const v = clean(value);
    if (NONE.has(v.toLowerCase())) return;
    if (PLACEHOLDER.test(v)) { errors.push(`${key}: template placeholder "${v}" (fill it in or write none)`); return; }
    const item = key === 'files' ? normalize(v) : v;
    if (key === 'files' && isShared(item)) warnings.push(`files: "${item}" is a shared file (ignored; do not claim it)`);
    if (!claims[key].includes(item)) claims[key].push(item);
  };
  const lines = m[1].split(/\r?\n/).map((raw) => raw.replace(/\s+$/, '')).filter((l) => l.trim());
  const indent = (l) => /^\s*/.exec(l)[0].length;
  const base = lines.length ? indent(lines[0]) : 0; // the keys' indent (the whole block may sit in a list)
  let key = null;
  for (const line of lines) {
    const deeper = indent(line) > base;
    const kv = /^\s*([A-Za-z][\w -]*?)\s*:\s*(.*)$/.exec(line);
    const item = /^\s*[-*]\s+(.*)$/.exec(line);
    if (item && key) { add(key, item[1]); continue; }
    if (kv && !deeper) {
      const k = kv[1].toLowerCase().replace(/\s+/g, '');
      key = k === 'wire' ? 'protocol' : k === 'saveshape' ? 'save' : k === 'globs' ? 'files' : k;
      if (!CLAIM_KEYS.includes(key)) { key = null; continue; }
      // a placeholder may hold commas (`<map ids, or none>`): judge the whole value before splitting it
      for (const v of PLACEHOLDER.test(kv[2]) ? [kv[2]] : kv[2].split(',')) add(key, v);
      continue;
    }
    if (key && deeper) warnings.push(`${key}: "${line.trim()}" ignored (list items start with "- ")`);
  }
  return { claims, errors, warnings };
}

/** The claims block of a PLAN as `{ files, maps, protocol, save }` (arrays), or null when it has none. */
export function parseClaims(text) {
  return lintClaims(text).claims;
}

/**
 * Overlaps between two claim sets: `{ files: [[a, b]], maps: [], protocol: {a, b, shared} | null, save: ... }` or null.
 * Shared files (SHARED_GLOBS) never overlap.
 */
export function overlapOf(a, b) {
  const files = [];
  const own = (list) => list.filter((f) => !isShared(f));
  for (const x of own(a.files)) for (const y of own(b.files)) if (globsOverlap(x, y)) files.push([x, y]);
  const lower = new Set(b.maps.map((s) => s.toLowerCase()));
  const maps = a.maps.filter((s) => lower.has(s.toLowerCase()));
  const both = (key) => {
    if (!a[key].length || !b[key].length) return null;
    const other = new Set(b[key].map((s) => s.toLowerCase()));
    return { a: a[key], b: b[key], shared: a[key].filter((s) => other.has(s.toLowerCase())) };
  };
  const protocol = both('protocol');
  const save = both('save');
  return files.length || maps.length || protocol || save ? { files, maps, protocol, save } : null;
}

/**
 * The job a PLAN belongs to: its folder (`docs/coop4/PLAN.md` and `docs/coop4/PLAN2.md` -> `docs/coop4`); a PLAN directly
 * in docs/ is its own job.
 */
export function planJob(path) {
  const p = normalize(path);
  const dir = p.slice(0, Math.max(0, p.lastIndexOf('/')));
  return dir && dir !== 'docs' ? dir : p;
}

/**
 * Compares plans `[{ branch, path, text }]`. Plans of one branch never conflict with each other, and neither do plans
 * of one job (planJob): one job built on several slice branches (feature/coop4 and its coop4-* slices all carry
 * docs/coop4/PLAN.md), or a PLAN2 beside its PLAN. With `focus` (a branch), only pairs that include it are reported.
 * Returns `{ withClaims, withoutClaims, overlaps, problems }`; problems = [{ branch, path, errors, warnings }] (lintClaims).
 */
export function checkClaims(plans, { focus = null } = {}) {
  const withClaims = [];
  const withoutClaims = [];
  const problems = [];
  for (const p of plans) {
    const { claims, errors, warnings } = lintClaims(p.text);
    if (claims) withClaims.push({ branch: p.branch, path: p.path, claims });
    else withoutClaims.push({ branch: p.branch, path: p.path });
    if (errors.length || warnings.length) problems.push({ branch: p.branch, path: p.path, errors, warnings });
  }
  const overlaps = [];
  for (let i = 0; i < withClaims.length; i++) {
    for (let j = i + 1; j < withClaims.length; j++) {
      const a = withClaims[i];
      const b = withClaims[j];
      if (a.branch === b.branch || planJob(a.path) === planJob(b.path)) continue;
      if (focus && a.branch !== focus && b.branch !== focus) continue;
      const o = overlapOf(a.claims, b.claims);
      if (o) overlaps.push({ a: { branch: a.branch, path: a.path }, b: { branch: b.branch, path: b.path }, ...o });
    }
  }
  return { withClaims, withoutClaims, overlaps, problems };
}

export function formatReport(r) {
  const out = [`claims-check: ${r.withClaims.length} plan(s) with claims, ${r.overlaps.length} overlap(s)`];
  if (r.withoutClaims.length) out.push(`  no claims block: ${r.withoutClaims.map((p) => `${p.branch}:${p.path}`).join(', ')}`);
  for (const p of r.problems ?? []) {
    for (const e of p.errors) out.push(`ERROR ${p.branch}:${p.path}: ${e}`);
    for (const w of p.warnings) out.push(`  warning ${p.branch}:${p.path}: ${w}`);
  }
  for (const o of r.overlaps) {
    out.push(`OVERLAP ${o.a.branch} (${o.a.path}) x ${o.b.branch} (${o.b.path})`);
    if (o.files.length) out.push(`  files: ${o.files.map(([x, y]) => (x === y ? x : `${x} ~ ${y}`)).join('; ')}`);
    if (o.maps.length) out.push(`  maps: ${o.maps.join(', ')}`);
    for (const key of ['protocol', 'save']) {
      const w = o[key];
      if (!w) continue;
      const what = key === 'protocol' ? 'both change the wire (PROTOCOL)' : 'both change the save shape';
      out.push(`  ${key}: ${what}${w.shared.length ? `, same: ${w.shared.join(', ')}` : ''} (${o.a.branch}: ${w.a.join(', ')}; ${o.b.branch}: ${w.b.join(', ')})`);
    }
  }
  return out.join('\n');
}

export const PLAN_PATH = /^docs\/(?:.+\/)?PLAN\d*\.md$/;

/** `origin/feature/x:docs/x/PLAN.md` -> `{ branch, path }` (git refs cannot contain `:`). */
export function parsePair(s) {
  const i = s.indexOf(':');
  if (i <= 0 || i === s.length - 1) throw new Error(`expected branch:path, got "${s}"`);
  return { branch: s.slice(0, i), path: normalize(s.slice(i + 1)) };
}

export function parseArgs(argv) {
  const o = { pairs: [], plan: null, name: null, prefix: 'origin/feature/', base: 'origin/master', sinceDays: 7, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { const v = argv[++i]; if (v === undefined) throw new Error(`${a} needs a value`); return v; };
    if (a === '--plan') o.plan = next();
    else if (a === '--name') o.name = next();
    else if (a === '--prefix') o.prefix = next();
    else if (a === '--base') o.base = next();
    else if (a === '--since-days') o.sinceDays = Number(next());
    else if (a === '--json') o.json = true;
    else if (a.startsWith('--')) throw new Error(`unknown argument ${a}`);
    else o.pairs.push(parsePair(a));
  }
  return o;
}

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

/** Open PLANs: the PLAN files each recent branch under the prefix changed since its merge base with `base`. */
export function scanPlans({ prefix, base, sinceDays, now = Date.now() }) {
  const refs = git(['for-each-ref', '--format=%(refname:short)\t%(committerdate:unix)', `refs/remotes/${prefix.replace(/\/?$/, '/')}`])
    .split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'))
    .filter(([, t]) => !Number.isFinite(sinceDays) || now / 1000 - Number(t) <= sinceDays * 86400);
  const plans = [];
  for (const [ref] of refs) {
    let changed;
    try { changed = git(['diff', '--name-only', '--diff-filter=AMR', `${base}...${ref}`, '--', 'docs']); } catch { continue; }
    for (const path of changed.split(/\r?\n/).filter((f) => PLAN_PATH.test(f))) {
      plans.push({ branch: ref, path, text: git(['show', `${ref}:${path}`]) });
    }
  }
  return plans;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(`claims-check: ${e.message}`); process.exit(2); }
  let plans;
  let focus = null;
  try {
    plans = o.pairs.length ? o.pairs.map((p) => ({ ...p, text: git(['show', `${p.branch}:${p.path}`]) })) : scanPlans(o);
    if (o.plan) {
      focus = o.name ?? `local:${normalize(o.plan)}`;
      const text = fs.readFileSync(o.plan, 'utf8');
      const lint = lintClaims(text);
      if (!lint.claims) { console.error(`claims-check: ${o.plan} has no \`\`\`claims block (docs/templates/plan.md)`); process.exit(2); }
      if (lint.errors.length) { console.error(lint.errors.map((e) => `claims-check: ${o.plan}: ${e}`).join('\n')); process.exit(2); }
      // the job's own branches (its slice branches carry a PLAN in the same folder) are not other jobs
      const own = normalize(o.plan);
      plans = plans.filter((p) => p.branch !== focus && planJob(p.path) !== planJob(own) &&!(o.name && p.branch.endsWith(`/${o.name}`)));
      plans.push({ branch: focus, path: own, text });
    }
  } catch (e) { console.error(`claims-check: ${e.message}`); process.exit(2); }
  const r = checkClaims(plans, { focus });
  console.log(o.json ? JSON.stringify(r, null, 2) : formatReport(r));
  // without --plan, any plan with placeholders left in is an error; with --plan only the local plan counts (above)
  if (!focus && r.problems.some((p) => p.errors.length)) process.exit(2);
  process.exit(r.overlaps.length ? 1 : 0);
}
