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
// A key takes a comma list on its line or `- item` lines below it; `none`, `-` or empty means no claim.
//
// Usage:
//   node scripts/claims-check.mjs                                  scan origin/feature/* for PLANs changed vs origin/master
//   node scripts/claims-check.mjs origin/feature/a:docs/a/PLAN.md origin/feature/b:docs/b/PLAN.md
//   node scripts/claims-check.mjs --plan docs/<job>/PLAN.md [--name feature/<job>]   one local PLAN against the scan
//   options: --prefix origin/feature/ --base origin/master --since-days 7 --json
// Exit: 0 no overlap, 1 overlaps found, 2 an argument / git error or a --plan without a claims block.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { globsOverlap, normalize } from './glob-match.mjs';

export const CLAIM_KEYS = ['files', 'maps', 'protocol', 'save'];
const NONE = new Set(['', 'none', '-', 'n/a', 'no']);
const clean = (s) => s.replace(/\s+#.*$/, '').trim().replace(/^[`'"]+|[`'"]+$/g, '').trim();

/** The claims block of a PLAN as `{ files, maps, protocol, save }` (arrays), or null when it has none. */
export function parseClaims(text) {
  const m = /^[ \t]*```+[ \t]*claims[ \t]*\r?\n([\s\S]*?)^[ \t]*```/m.exec(String(text));
  if (!m) return null;
  const claims = { files: [], maps: [], protocol: [], save: [] };
  let key = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;
    const kv = /^\s*([A-Za-z][\w -]*?)\s*:\s*(.*)$/.exec(line);
    const item = /^\s*[-*]\s+(.*)$/.exec(line);
    if (item && key) { add(claims, key, item[1]); continue; }
    if (kv) {
      const k = kv[1].toLowerCase().replace(/\s+/g, '');
      key = k === 'wire' ? 'protocol' : k === 'saveshape' ? 'save' : k === 'globs' ? 'files' : k;
      if (!CLAIM_KEYS.includes(key)) { key = null; continue; }
      for (const v of kv[2].split(',')) add(claims, key, v);
    }
  }
  return claims;
}

function add(claims, key, value) {
  const v = clean(value);
  if (NONE.has(v.toLowerCase())) return;
  const item = key === 'files' ? normalize(v) : v;
  if (!claims[key].includes(item)) claims[key].push(item);
}

/** Overlaps between two claim sets: `{ files: [[a, b]], maps: [], protocol: {a, b, shared} | null, save: ... }` or null. */
export function overlapOf(a, b) {
  const files = [];
  for (const x of a.files) for (const y of b.files) if (globsOverlap(x, y)) files.push([x, y]);
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
 * Compares plans `[{ branch, path, text }]`. Plans of one branch never conflict with each other. With `focus` (a
 * branch), only pairs that include it are reported. Returns `{ withClaims, withoutClaims, overlaps }`.
 */
export function checkClaims(plans, { focus = null } = {}) {
  const withClaims = [];
  const withoutClaims = [];
  for (const p of plans) {
    const claims = parseClaims(p.text);
    if (claims) withClaims.push({ branch: p.branch, path: p.path, claims });
    else withoutClaims.push({ branch: p.branch, path: p.path });
  }
  const overlaps = [];
  for (let i = 0; i < withClaims.length; i++) {
    for (let j = i + 1; j < withClaims.length; j++) {
      const a = withClaims[i];
      const b = withClaims[j];
      if (a.branch === b.branch) continue;
      if (focus && a.branch !== focus && b.branch !== focus) continue;
      const o = overlapOf(a.claims, b.claims);
      if (o) overlaps.push({ a: { branch: a.branch, path: a.path }, b: { branch: b.branch, path: b.path }, ...o });
    }
  }
  return { withClaims, withoutClaims, overlaps };
}

export function formatReport(r) {
  const out = [`claims-check: ${r.withClaims.length} plan(s) with claims, ${r.overlaps.length} overlap(s)`];
  if (r.withoutClaims.length) out.push(`  no claims block: ${r.withoutClaims.map((p) => `${p.branch}:${p.path}`).join(', ')}`);
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
      if (!parseClaims(text)) { console.error(`claims-check: ${o.plan} has no \`\`\`claims block (docs/templates/plan.md)`); process.exit(2); }
      plans = plans.filter((p) => p.branch !== focus && !(o.name && p.branch.endsWith(`/${o.name}`)));
      plans.push({ branch: focus, path: normalize(o.plan), text });
    }
  } catch (e) { console.error(`claims-check: ${e.message}`); process.exit(2); }
  const r = checkClaims(plans, { focus });
  console.log(o.json ? JSON.stringify(r, null, 2) : formatReport(r));
  process.exit(r.overlaps.length ? 1 : 0);
}
