// Changelog assembler (merge-tools): turns the changes/ fragments (one per PR, format in changes/README.md) into ONE
// released section at the top of CHANGELOG.md, then deletes the consumed fragments. Legacy "## Unreleased - <job>"
// blocks above the newest released heading are folded in too (branches cut before the switch), their headings removed.
// Run it by hand at the version step (G183).
// Usage: node scripts/changelog-assemble.mjs <version> <title> <date> <prPrimary> [memberPRs...]
//   e.g. node scripts/changelog-assemble.mjs 4.56.0 "Train 5: lamps, wheel" 2026-10-23 130 125 127
// Exit: 0 written, 1 nothing to assemble or a bad fragment / argument.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const num = (pr) => String(pr).replace(/^#/, '');

/** "## 4.56.0 - <title> (2026-10-23, PR #130; #125, #127)"; no "; ..." without members. */
export function releaseHeading(version, title, date, pr, members = []) {
  const m = members.map((x) => `#${num(x)}`).join(', ');
  return `## ${version} - ${title} (${date}, PR #${num(pr)}${m ? `; ${m}` : ''})`;
}

/** Drops leading and trailing blank lines. */
function trimBlank(lines) {
  let a = 0, b = lines.length;
  while (a < b && lines[a].trim() === '') a++;
  while (b > a && lines[b - 1].trim() === '') b--;
  return lines.slice(a, b);
}

/** A fragment's text -> { title, kind, body }: "# <title>", an optional "kind: minor|patch" line, then the entries. */
export function parseFragment(text, name = 'fragment') {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const head = /^# (\S.*)$/.exec(lines.shift() ?? '');
  if (!head) throw new Error(`${name}: the first line must be "# <short title>"`);
  let rest = trimBlank(lines), kind = 'minor';
  const k = /^kind:\s*(\S*)\s*$/i.exec(rest[0] ?? '');
  if (k) {
    kind = k[1].toLowerCase();
    if (kind !== 'minor' && kind !== 'patch') throw new Error(`${name}: kind must be minor or patch, not "${k[1]}"`);
    rest = trimBlank(rest.slice(1));
  }
  if (!rest.length) throw new Error(`${name}: no entries under the title`);
  return { title: head[1].trim(), kind, body: rest };
}

/**
 * Splits CHANGELOG text at the newest released heading ("## <digit>..."): `head` ends with "# Changelog", `keep` is
 * any other text above the released sections, `legacy` the "## Unreleased - <job>" blocks there, `rest` the released
 * sections (from the newest heading to the end).
 */
export function splitChangelog(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const top = lines.findIndex((l) => /^# Changelog\s*$/.test(l));
  if (top < 0) throw new Error('CHANGELOG.md: no "# Changelog" line');
  let rel = lines.findIndex((l, i) => i > top && /^## \d/.test(l));
  if (rel < 0) rel = lines.length;
  const keep = [], legacy = [];
  let cur = null;
  for (const l of lines.slice(top + 1, rel)) {
    const u = /^## Unreleased\b\s*-?\s*(.*)$/.exec(l);
    if (u) { cur = { title: u[1].trim() || 'Unreleased', lines: [] }; legacy.push(cur); continue; }
    if (l.startsWith('## ')) cur = null; // some other heading: kept where it is
    (cur ? cur.lines : keep).push(l);
  }
  return {
    head: lines.slice(0, top + 1), keep: trimBlank(keep), rest: lines.slice(rel),
    legacy: legacy.map((b) => ({ title: b.title, body: trimBlank(b.lines) })),
  };
}

/** Whitespace-normalised text: runs of whitespace (newlines included) become one space, ends trimmed. */
const norm = (s) => s.replace(/\s+/g, ' ').trim();

/**
 * Splits lines into blocks: an entry ("- " or "* " bullet with its indented wrapped lines) or a run of loose lines.
 */
function blocksOf(lines) {
  const blocks = [];
  for (const l of lines) {
    const last = blocks[blocks.length - 1];
    if (/^\s*[-*] /.test(l)) blocks.push({ entry: true, lines: [l] });
    else if (last && last.entry && /^\s+\S/.test(l)) last.lines.push(l);
    else if (last && !last.entry) last.lines.push(l);
    else blocks.push({ entry: false, lines: [l] });
  }
  return blocks;
}

/** The body without the entries already in `known` (normalised CHANGELOG entries); each dropped one goes to `skipped`. */
function dropKnown(body, known, skipped) {
  const kept = [];
  for (const b of blocksOf(body)) {
    const key = norm(b.lines.join('\n'));
    if (b.entry && known.has(key)) { skipped.push(key.replace(/^[-*] /, '')); continue; }
    kept.push(...b.lines);
  }
  return trimBlank(kept);
}

/**
 * Pure assembly: the new CHANGELOG text from its old text and parsed fragments ({ name, title, kind, body }). Returns
 * null when there is nothing to read. A legacy block whose every line is already in a released section (a member
 * released it before) is dropped, not repeated. A fragment entry whose normalised text already appears as an entry
 * in CHANGELOG.md is skipped; a fragment with no entries left adds no block. `text` is null when nothing is new (every
 * fragment skipped); the fragments are still consumed. `bump` is "minor" when any part is minor.
 */
export function assemble(changelog, fragments, { version, title, date, pr, members = [] }) {
  const { head, keep, legacy, rest } = splitChangelog(changelog);
  const released = new Set(rest.map((l) => l.trim()).filter(Boolean));
  const known = new Set(blocksOf(changelog.replace(/\r\n/g, '\n').split('\n'))
    .filter((b) => b.entry).map((b) => norm(b.lines.join('\n'))));
  const skipped = [];
  const parts = [];
  for (const f of fragments) {
    const body = dropKnown(f.body, known, skipped);
    if (body.length) parts.push({ title: f.title, body, from: f.name, kind: f.kind });
  }
  const dropped = [];
  for (const b of legacy) {
    const lines = b.body.filter((l) => l.trim());
    if (lines.every((l) => released.has(l.trim()))) { dropped.push(b.title); continue; }
    parts.push({ title: b.title, body: b.body, from: `## Unreleased - ${b.title}`, kind: 'minor' });
  }
  const consumed = fragments.map((f) => f.name);
  if (!parts.length) return skipped.length ? { text: null, parts, dropped, skipped, consumed, bump: null } : null;
  const out = [...head, ''];
  if (keep.length) out.push(...keep, '');
  out.push(releaseHeading(version, title, date, pr, members));
  if (parts.length === 1) out.push(...parts[0].body);
  // several parts: one "###" each; a part's own "###" subsections drop a level so they stay inside it
  else for (const p of parts) out.push('', `### ${p.title}`, ...p.body.map((l) => (l.startsWith('### ') ? `#${l}` : l)));
  if (rest.length) out.push('', ...rest);
  let text = out.join('\n');
  if (!text.endsWith('\n')) text += '\n';
  return { text, parts, dropped, skipped, consumed, bump: parts.some((p) => p.kind === 'minor') ? 'minor' : 'patch' };
}

/** Fragment files in `<root>/changes` (every .md but README.md), sorted by name. */
export function fragmentNames(root) {
  const dir = path.join(root, 'changes');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => n.endsWith('.md') && n.toLowerCase() !== 'readme.md').sort();
}

/** Assembles `<root>/CHANGELOG.md` from `<root>/changes/`; writes and deletes the fragments unless `write` is false. */
export function assembleDir(root, opts, write = true) {
  const names = fragmentNames(root);
  const fragments = names.map((n) => ({
    name: `changes/${n}`, ...parseFragment(fs.readFileSync(path.join(root, 'changes', n), 'utf8'), `changes/${n}`),
  }));
  const file = path.join(root, 'CHANGELOG.md');
  const r = assemble(fs.readFileSync(file, 'utf8'), fragments, opts);
  if (r && write) {
    if (r.text) fs.writeFileSync(file, r.text);
    for (const n of names) fs.unlinkSync(path.join(root, 'changes', n));
  }
  return r;
}

/** One line per part and skipped entry for the console. */
export function summary(r, heading) {
  return [heading, ...r.parts.map((p) => `  + ${p.title} (${p.from}, ${p.kind}, ${p.body.length} lines)`),
    ...r.dropped.map((t) => `  - dropped "Unreleased - ${t}" (already released)`),
    ...r.skipped.map((s) => `  - skipped (already in CHANGELOG.md): ${s.slice(0, 60)}`),
    ...(r.bump ? [`  fragments ask for a ${r.bump} step`] : [])].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [version, title, date, pr, ...members] = process.argv.slice(2);
  if (!version || !title || !date || !pr) {
    console.error('usage: node scripts/changelog-assemble.mjs <version> <title> <date> <prPrimary> [memberPRs...]');
    process.exit(1);
  }
  if (!/^\d+\.\d+\.\d+$/.test(version) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`changelog-assemble: version must be X.Y.Z and date YYYY-MM-DD (got "${version}", "${date}")`);
    process.exit(1);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const opts = { version, title, date, pr, members };
  let r;
  try { r = assembleDir(root, opts); } catch (e) { console.error(`changelog-assemble: ${e.message}`); process.exit(1); }
  if (!r) {
    console.error('changelog-assemble: nothing to assemble (no changes/*.md fragment, no "## Unreleased - ..." block on top)');
    process.exit(1);
  }
  if (!r.text) {
    console.log(summary(r, 'CHANGELOG.md: nothing new'));
    console.log(`  ${r.consumed.length} fragment file(s) deleted`);
    console.error('changelog-assemble: nothing new to release: every fragment entry is already in CHANGELOG.md');
    process.exit(1);
  }
  console.log(summary(r, `CHANGELOG.md: ${releaseHeading(version, title, date, pr, members)}`));
  console.log(`  ${r.consumed.length} fragment file(s) deleted`);
}
