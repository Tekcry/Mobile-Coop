// Doc lint (doc-guard, Michael 2026-10-25 ~11:00: "Doc lint in CI"). Keeps the docs from going stale, repeating each
// other or pointing at things that are gone. Run by `npm run lint` (so CI's `lint` job and `npm run check` run it).
// Checks (each finding: `ERROR|WARN <check> <file>:<line> <message>`; errors exit 1, warnings only print):
//   stale-terms  docs/stale-terms.json: old names and replaced rules in the current docs (scope in the file); job
//                STATE resume blocks as WARN.
//   citations    every G<n> cited exists in docs/DECISIONS.md; a fully replaced G cited as current in VISION, RULES,
//                the bible, level-design or docs/systems/*.md is an error unless the line also cites a replacement.
//   links        relative markdown links and backticked repo paths resolve (archive and fenced code skipped).
//   owners       docs/doc-owners.json: a key rule restated outside its owner file (WARN).
//   sizes        docs/doc-lint.json budgets: VISION words (body and with header), RULES / CLAUDE / testing-tools lines
//                (ERROR); job STATE resume blocks over 40 lines and ROADMAP "Decided" before today (WARN).
//   bible-notes  a "Note 2026-..." line appended in docs/design-bible.md (ERROR: folds rewrite in place).
//   headers      G344: each current doc names its owner and status in its first lines: `Owner: <who>. Status: current.`
//                (or `history`; also inside `<!-- ... -->`). ERROR for the core set (docs/doc-lint.json), WARN for the rest.
// Scope: the current docs (CLAUDE.md, README.md, TESTING.md, docs/*.md, docs/systems/, docs/templates/; docs/doc-lint.json).
// Job docs (docs/<job>/) are the job's record and move to docs/archive/ with its final PR (`Job-done:`), so only their
// STATE resume block size is checked. docs/doc-lint.json `known` lists stale lines another PR fixes (printed as WARN).
// Usage: node scripts/doc-lint.mjs [--root <dir>] [--config-root <dir>] [--today YYYY-MM-DD] [--quiet] [--json]
//   --config-root reads the three JSON files from another checkout (default: --root).
//   --quiet prints errors and the summary only; --json prints the findings as JSON.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---- globs and small helpers ----------------------------------------------------------------------------------------

/** A glob (`**` any depth, `*` one segment, `?` one char) as a RegExp over posix repo paths. */
export function globRe(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      i++;
      if (glob[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

const globCache = new Map();
/** True when `file` matches any of `globs`. */
export function matchAny(file, globs = []) {
  return globs.some((g) => {
    let re = globCache.get(g);
    if (!re) { re = globRe(g); globCache.set(g, re); }
    return re.test(file);
  });
}

/** The lines of a text, with `fenced[i]` true inside a ``` / ~~~ code fence (the fence lines included). */
export function splitLines(text) {
  const lines = text.split(/\r?\n/);
  const fenced = new Array(lines.length).fill(false);
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*(```+|~~~+)/.exec(lines[i]);
    if (open) { fenced[i] = true; if (m && m[1][0] === open[0] && m[1].length >= open.length) open = null; } else if (m) {
      fenced[i] = true; open = m[1];
    }
  }
  return { lines, fenced };
}

const finding = (level, check, file, line, msg) => ({ level, check, file, line, msg });

/** Words of a markdown text: tokens holding a letter or digit (table pipes, rules and bullets do not count). */
export function wordCount(text) {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

// History markers: a line that says it is history may name an old term or a replaced G.
export const HISTORY_RE = /\b(old|older|formerly|replaced|replaces|replacing|loosens|lifted|history|historic|no longer|used to|renamed|was|were|superseded|void|retired)\b/i;

// ---- stale terms ------------------------------------------------------------------------------------------------

/**
 * Stale terms (docs/stale-terms.json): `terms[]` = { id, term | regex, flags?, why, replacement, allow?: globs,
 * allowLine?: regex (on the line and the lines before and after it: a wrapped qualifier), history?: false (history markers do not
 * excuse it), level?: "warn" }. `scope` globs say which files are current docs; `allow` globs apply to every term.
 * `resumeScope` globs (job STATE.md files, job-owned) are checked in their resume block only, as WARN.
 * Known stale lines are listed in docs/doc-lint.json `known` (match: the term id).
 */
export function checkStaleTerms(files, cfg) {
  const out = [];
  const terms = (cfg.terms ?? []).map((t) => ({
    ...t,
    re: new RegExp(t.regex ?? t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), t.flags ?? 'i'),
    allowRe: t.allowLine ? new RegExp(t.allowLine, 'i') : null,
  }));
  for (const [file, text] of files) {
    if (matchAny(file, cfg.allow ?? [])) continue;
    const resumeOnly = !matchAny(file, cfg.scope ?? ['**/*.md']) && matchAny(file, cfg.resumeScope ?? []);
    if (!resumeOnly && !matchAny(file, cfg.scope ?? ['**/*.md'])) continue;
    const { lines } = splitLines(text);
    let from = 0, to = lines.length;
    if (resumeOnly) {
      const b = resumeBlock(text);
      if (!b) continue;
      from = b.line; to = b.line + b.length;
    }
    for (const t of terms) {
      if (matchAny(file, t.allow)) continue;
      for (let i = from; i < to; i++) {
        const line = lines[i];
        const m = t.re.exec(line);
        if (!m) continue;
        if (t.history !== false && HISTORY_RE.test(line)) continue;
        if (t.allowRe && t.allowRe.test(`${lines[i - 1] ?? ''} ${line} ${lines[i + 1] ?? ''}`)) continue;
        const fix = t.replacement ? ` -> ${t.replacement}` : '';
        const level = resumeOnly || t.level === 'warn' ? 'WARN' : 'ERROR';
        out.push(finding(level, 'stale-terms', file, i + 1, `"${m[0]}" (${t.id}): ${t.why}${fix}${resumeOnly ? ' (job STATE resume block)' : ''}`));
      }
    }
  }
  return out;
}

// ---- citations ----------------------------------------------------------------------------------------------------

/**
 * The G entries of docs/DECISIONS.md: Map n -> { line, replacedBy: number[] | null }. An entry is fully replaced when
 * its heading's "(Replaced by G..., date[: ...])" note names the replacements before any "for" / "where" / "in part"
 * qualifier; "(Replaced for Sector Ops by ...)" and "(Replaced by G150 for movement ...)" are partial: still current.
 */
export function parseDecisions(text) {
  const { lines } = splitLines(text);
  const map = new Map();
  for (let i = 0; i < lines.length; i++) {
    const m = /^\*\*G(\d+)\.\s/.exec(lines[i]);
    if (!m) continue;
    const n = Number(m[1]);
    const next = lines[i + 1] ?? '';
    const head = /^\*\*G\d+\./.test(next) ? lines[i] : `${lines[i]} ${next}`;
    let replacedBy = null;
    const r = /\(Replaced\b([^)]*)/.exec(head);
    if (r) {
      const before = r[1].split(':')[0];
      const partial = /^\s*(for|in part)\b/i.test(before) || /\b(for|where|in part|in the|on the)\b/i.test(before);
      const gs = [...before.matchAll(/\bG(\d+)\b/g)].map((x) => Number(x[1]));
      if (!partial && /^\s*by\b/i.test(before) && gs.length) replacedBy = gs;
    }
    map.set(n, { line: i + 1, replacedBy });
  }
  return map;
}

// A G citation: not inside a word or path (`G4-REPORT.md`, `vg6`), but both ends of a range (`G103-G105`).
export const G_RE = /(?<![\w/]|[A-Za-z]-)G(\d{1,4})(?!\w|-(?!G\d)[A-Za-z])/g;

/**
 * Citations: every G<n> in `scope` files must exist in DECISIONS; in `ownerDocs` a fully replaced G needs one of its
 * replacements on the same line or the line before or after (one wrapped sentence), or a history word on the line
 * ("replaced", "older", "was"). `ignore[]` = { file, text }: a line holding `text` is not a citation (a job's slice
 * named G<n>, e.g. "walk 4.72 G4").
 */
export function checkCitations(files, decisions, cfg) {
  const out = [];
  const max = Math.max(0, ...decisions.keys());
  const gs = (line) => new Set([...(line ?? '').matchAll(G_RE)].map((x) => Number(x[1])));
  for (const [file, text] of files) {
    if (!matchAny(file, cfg.scope ?? ['**/*.md']) || matchAny(file, cfg.skip ?? [])) continue;
    const owner = matchAny(file, cfg.ownerDocs ?? []);
    const ignore = (cfg.ignore ?? []).filter((x) => x.file === file).map((x) => x.text);
    const { lines } = splitLines(text);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const set = gs(line);
      if (!set.size || ignore.some((t) => line.includes(t))) continue;
      for (const n of set) {
        const d = decisions.get(n);
        if (!d) {
          out.push(finding('ERROR', 'citations', file, i + 1, `G${n} is not in docs/DECISIONS.md (highest G${max})`));
          continue;
        }
        if (!owner || !d.replacedBy || HISTORY_RE.test(line)) continue;
        const near = new Set([...set, ...gs(lines[i - 1]), ...gs(lines[i + 1])]);
        if (d.replacedBy.some((r) => near.has(r))) continue;
        out.push(finding('ERROR', 'citations', file, i + 1,
          `G${n} is replaced by ${d.replacedBy.map((r) => `G${r}`).join(', ')} (DECISIONS.md:${d.line}); cite the replacement on this line`));
      }
    }
  }
  return out;
}

// ---- links --------------------------------------------------------------------------------------------------------

const MD_LINK_RE = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const CODE_RE = /`([^`\n]+)`/g;
const REPO_ROOTS = /^(docs|scripts|src|tests|public|changes|\.github)\//;
const ROOT_FILES = new Set(['CLAUDE.md', 'README.md', 'TESTING.md', 'CHANGELOG.md', 'package.json', 'tsconfig.json',
  'vite.config.ts', 'vitest.config.ts', 'eslint.config.js', 'index.html', 'editor.html']);

/** A backticked text that names a repo path (`docs/x.md`, `scripts/a.mjs:12`), as the path to check, else null. */
export function codePath(code) {
  let p = code.trim();
  if (!p || /[\s<>*{}$|"'\\]|\.\.\.|^-/.test(p)) return null; // commands, placeholders, globs, ellipses
  p = p.replace(/[#?].*$/, '').replace(/:\d+(?:[-,]\d+)*$/, '').replace(/[.,;:)]+$/, '');
  if (ROOT_FILES.has(p)) return p;
  if (!REPO_ROOTS.test(p)) return null;
  if (/:/.test(p)) return null; // origin/<branch>:path, a symbol after a colon
  return p;
}

/** A markdown link target as a repo path relative to `file`, or null when it is external, an anchor or a placeholder. */
export function linkPath(file, target) {
  if (/^([a-z][a-z0-9+.-]*:|#|\/|\{|<)/i.test(target) || /[<>*{}$]/.test(target)) return null;
  let t = target.replace(/[#?].*$/, '');
  try { t = decodeURIComponent(t); } catch { /* keep */ }
  if (!t) return null;
  const joined = path.posix.normalize(path.posix.join(path.posix.dirname(file), t));
  return joined.startsWith('../') ? null : joined.replace(/\/$/, '');
}

// A line whose backticked paths are not current repo pointers: another branch, an external URL, git-ignored or
// generated files, a planned file, a removed one.
export const SKIP_PATHS_RE = new RegExp([
  /\borigin\/(?!master\b)[\w./-]+/.source,
  /\bon (?:the )?(?:branch )?`?(?:feature|cloud-queue|laptop-queue|train)\b/.source,
  /https?:\/\//.source,
  /git-?ignored|\bgenerated\b|\bnot committed\b/.source,
  /\b(?:new|planned|to be (?:added|written|built)|not built)\b/.source,
  /\b(?:removed|gone|deleted|retired|was|were|formerly|renamed|closed)\b/.source,
].join('|'), 'i');

const EXTS = ['.ts', '.tsx', '.mjs', '.js', '.json', '.md'];
/** True when the repo has `p` as a file or folder, or as a module path with one of EXTS. */
export const resolves = (p, exists) => exists(p) || (!/\.[a-z0-9]+$/i.test(p) && EXTS.some((e) => exists(p + e)));

/**
 * Links: relative markdown links and backticked repo paths in `scope` files resolve in the repo (`exists(path)` covers
 * files and folders). Fenced code is skipped; `offBranch` globs are paths that live on another branch
 * (docs/orchestrator/** on feature/menu). Backticked paths are skipped on a line that names another branch
 * (`origin/<b>`, "on feature/..."), an external URL, a git-ignored or generated path, a planned file ("new", "planned")
 * or a removed one ("removed", "gone", "was"). A module path without an extension (`src/save/ratingRecord`) resolves to
 * .ts / .tsx / .mjs / .js / .json / .md. `errorScope` globs give ERROR; other files in `scope` and `warnScope` ones
 * (history: DECISIONS) give WARN.
 */
export function checkLinks(files, exists, cfg) {
  const out = [];
  for (const [file, text] of files) {
    if (!matchAny(file, cfg.scope ?? ['**/*.md']) || matchAny(file, cfg.skip ?? [])) continue;
    const level = matchAny(file, cfg.errorScope ?? ['**']) && !matchAny(file, cfg.warnScope ?? []) ? 'ERROR' : 'WARN';
    const { lines, fenced } = splitLines(text);
    for (let i = 0; i < lines.length; i++) {
      if (fenced[i]) continue;
      const line = lines[i];
      const seen = new Set();
      for (const m of line.matchAll(MD_LINK_RE)) {
        const p = linkPath(file, m[1]);
        if (!p || seen.has(p) || matchAny(p, cfg.offBranch) || resolves(p, exists)) continue;
        seen.add(p);
        out.push(finding(level, 'links', file, i + 1, `link target ${m[1]} -> ${p} does not exist`));
      }
      if (SKIP_PATHS_RE.test(line.replace(CODE_RE, ''))) continue;
      const stripped = line.replace(MD_LINK_RE, '');
      for (const m of stripped.matchAll(CODE_RE)) {
        const p = codePath(m[1]);
        if (!p || seen.has(p) || matchAny(p, cfg.offBranch) || resolves(p, exists)) continue;
        seen.add(p);
        out.push(finding(level, 'links', file, i + 1, `repo path \`${m[1]}\` does not exist`));
      }
    }
  }
  return out;
}

// ---- owners -------------------------------------------------------------------------------------------------------

/**
 * Owner numbers (docs/doc-owners.json `owners[]` = { id, owner, pattern, flags?, rule, allow?: globs }): a key rule
 * restated in a `scope` file other than its owner is a WARN ("one home per rule, others link").
 */
export function checkOwners(files, cfg) {
  const out = [];
  const owners = (cfg.owners ?? []).map((o) => ({ ...o, re: new RegExp(o.pattern, o.flags ?? '') }));
  for (const [file, text] of files) {
    if (!matchAny(file, cfg.scope ?? ['**/*.md']) || matchAny(file, cfg.skip ?? [])) continue;
    const { lines } = splitLines(text);
    for (const o of owners) {
      if (file === o.owner || matchAny(file, o.allow)) continue;
      for (let i = 0; i < lines.length; i++) {
        const m = o.re.exec(lines[i]);
        if (m) out.push(finding('WARN', 'owners', file, i + 1, `"${m[0]}" restates ${o.rule} (${o.id}); its home is ${o.owner}: link to it`));
      }
    }
  }
  return out;
}

// ---- sizes --------------------------------------------------------------------------------------------------------

/** The ROADMAP "## Decided" lines dated before `today` (a bullet's first date). -> [{ line, date }]. */
export function staleDecided(text, today) {
  const { lines } = splitLines(text);
  const out = [];
  let inDecided = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^## /.test(lines[i])) { inDecided = /^## Decided\b/i.test(lines[i]); continue; }
    if (!inDecided || !/^\s*[-*] /.test(lines[i])) continue;
    const d = /\b(20\d\d-\d\d-\d\d)\b/.exec(lines[i]);
    if (d && d[1] < today) out.push({ line: i + 1, date: d[1] });
  }
  return out;
}

/** A STATE.md's resume block: the "Resume" section when there is one, else the first `## ` section. -> { line, length }. */
export function resumeBlock(text) {
  const { lines } = splitLines(text);
  const heads = [];
  for (let i = 0; i < lines.length; i++) if (/^## /.test(lines[i])) heads.push(i);
  if (!heads.length) return null;
  const pick = heads.find((h) => /resume/i.test(lines[h])) ?? heads[0];
  const next = heads.find((h) => h > pick) ?? lines.length;
  let end = next;
  while (end > pick + 1 && !lines[end - 1].trim()) end--;
  return { line: pick + 1, length: end - pick - 1 };
}

/**
 * Size budgets (docs/doc-lint.json `sizes`): `words` { file: max } (the body, header line out), `wordsRaw` (the whole
 * file) and `lines` { file: max } are ERRORs; `stateResume`
 * (glob, max lines) is a WARN; `roadmap` (Decided today only, WARN) is optional and unset (ROADMAP is the
 * orchestrator's).
 */
export function checkSizes(files, cfg, today) {
  const out = [];
  for (const [file, max] of Object.entries(cfg.words ?? {})) {
    const text = files.get(file);
    if (text == null) continue;
    const n = wordCount(stripHeader(text));
    if (n > max) out.push(finding('ERROR', 'sizes', file, 1, `${n} words, budget ${max}: cut, link to the owner doc instead`));
  }
  for (const [file, max] of Object.entries(cfg.wordsRaw ?? {})) {
    const text = files.get(file);
    if (text == null) continue;
    const n = wordCount(text);
    if (n > max) out.push(finding('ERROR', 'sizes', file, 1, `${n} words with the header, budget ${max}`));
  }
  for (const [file, max] of Object.entries(cfg.lines ?? {})) {
    const text = files.get(file);
    if (text == null) continue;
    const n = splitLines(text.replace(/\n$/, '')).lines.length;
    if (n > max) out.push(finding('ERROR', 'sizes', file, 1, `${n} lines, budget ${max}: move detail to the owner doc`));
  }
  if (cfg.roadmap && files.has(cfg.roadmap) && today) {
    for (const s of staleDecided(files.get(cfg.roadmap), today)) {
      out.push(finding('WARN', 'sizes', cfg.roadmap, s.line, `"Decided" entry from ${s.date}: Decided holds today only; fold it into DECISIONS.md`));
    }
  }
  if (cfg.stateResume) {
    for (const [file, text] of files) {
      if (!matchAny(file, [cfg.stateResume.glob]) || matchAny(file, cfg.stateResume.skip ?? [])) continue;
      const b = resumeBlock(text);
      if (b && b.length > cfg.stateResume.max) {
        out.push(finding('WARN', 'sizes', file, b.line, `resume block ${b.length} lines, budget ${cfg.stateResume.max}: move the rest below it`));
      }
    }
  }
  return out;
}

// ---- bible notes --------------------------------------------------------------------------------------------------

export const NOTE_RE = /(?:^|[\s(*_>-])Note 20\d\d-\d\d-\d\d/;

/** An appended "Note 2026-..." in the bible (folds rewrite the sentence in place instead). */
export function checkBibleNotes(files, file = 'docs/design-bible.md') {
  const text = files.get(file);
  if (text == null) return [];
  const out = [];
  splitLines(text).lines.forEach((l, i) => {
    if (NOTE_RE.test(l)) out.push(finding('ERROR', 'bible-notes', file, i + 1, 'appended "Note <date>": rewrite the rule in place (DECISIONS keeps the history)'));
  });
  return out;
}

// ---- headers ------------------------------------------------------------------------------------------------------

export const OWNER_RE = /^\s*(?:<!--\s*)?Owner:\s*\S/;
export const STATUS_RE = /\bStatus:\s*(current|history)\b/;

/** The header lines (G344): -> { owner, status } line numbers within the first `n` lines (1-based; 0 = none). */
export function readHeader(text, n = 10) {
  const lines = splitLines(text).lines.slice(0, n);
  return { owner: lines.findIndex((l) => OWNER_RE.test(l)) + 1, status: lines.findIndex((l) => STATUS_RE.test(l)) + 1 };
}

/** The text without its Owner header line (budgets count the content, not the header). */
export function stripHeader(text) {
  const { owner } = readHeader(text);
  if (!owner) return text;
  const lines = text.split(/\r?\n/);
  lines.splice(owner - 1, 1);
  return lines.join('\n');
}

/**
 * Owner / status headers (docs/doc-lint.json `headers` = { error: globs, warn: globs, skip: globs, lines }): a doc in
 * `error` without both lines in its first `lines` (10) is an ERROR, one in `warn` a WARN.
 */
export function checkHeaders(files, cfg) {
  const out = [];
  const n = cfg.lines ?? 10;
  for (const [file, text] of files) {
    if (matchAny(file, cfg.skip ?? [])) continue;
    const level = matchAny(file, cfg.error ?? []) ? 'ERROR' : matchAny(file, cfg.warn ?? []) ? 'WARN' : null;
    if (!level) continue;
    const h = readHeader(text, n);
    const miss = [h.owner ? null : 'Owner', h.status ? null : 'Status (current | history)'].filter(Boolean);
    if (miss.length) {
      out.push(finding(level, 'headers', file, 1, `no ${miss.join(' / ')} line in the first ${n} lines (G344): add "Owner: <who>. Status: current."`));
    }
  }
  return out;
}

// ---- all ----------------------------------------------------------------------------------------------------------

/**
 * Every check over `files` (Map repo path -> text, the docs to lint plus DECISIONS) with `exists(path)` for links.
 * `config` = { staleTerms, owners, lint } (the three JSON files). -> findings sorted by file and line.
 */
export function lintDocs({ files, exists, config, today }) {
  const lint = config.lint ?? {};
  const decisions = parseDecisions(files.get('docs/DECISIONS.md') ?? '');
  const all = [
    ...checkStaleTerms(files, config.staleTerms ?? {}),
    ...checkCitations(files, decisions, lint.citations ?? {}),
    ...checkLinks(files, exists, lint.links ?? {}),
    ...checkOwners(files, { scope: lint.owners?.scope, skip: lint.owners?.skip, owners: config.owners?.owners ?? [] }),
    ...checkSizes(files, lint.sizes ?? {}, today),
    ...checkBibleNotes(files),
    ...checkHeaders(files, lint.headers ?? {}),
  ];
  return applyKnown(all, lint.known ?? []).sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));
}

/**
 * Known stale (docs/doc-lint.json `known[]` = { check, file, match?, note }): an ERROR of that check in that file (whose
 * message holds `match`, when given) is printed as a WARN with the note, until the doc is fixed and the entry removed.
 * Only for docs another PR or the orchestrator fixes; a new stale line anywhere else still fails.
 */
export function applyKnown(findings, known) {
  const used = new Set();
  const out = findings.map((f) => {
    if (f.level !== 'ERROR') return f;
    const k = known.find((x) => x.check === f.check && x.file === f.file && (!x.match || f.msg.includes(x.match)));
    if (k) used.add(k);
    return k ? { ...f, level: 'WARN', msg: `${f.msg} [known stale: ${k.note}]` } : f;
  });
  for (const k of known) {
    if (!used.has(k)) out.push(finding('WARN', 'known', k.file, 1, `docs/doc-lint.json known entry (${k.check}${k.match ? ` "${k.match}"` : ''}) no longer matches: remove it`));
  }
  return out;
}

/** Counts per level and check: { ERROR: { check: n }, WARN: { ... } }. */
export function summarise(findings) {
  const s = { ERROR: {}, WARN: {} };
  for (const f of findings) s[f.level][f.check] = (s[f.level][f.check] ?? 0) + 1;
  return s;
}

export const formatFinding = (f) => `${f.level === 'ERROR' ? 'ERROR' : 'WARN '} ${f.check} ${f.file}:${f.line} ${f.msg}`;

// ---- CLI ----------------------------------------------------------------------------------------------------------

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Reads the repo at `root`: tracked files (git ls-files), the markdown texts, the three config files. */
export function loadRepo(root, configRoot = root) {
  let tracked;
  try {
    tracked = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 256 << 20 })
      .split('\0').filter(Boolean);
  } catch { tracked = []; }
  const paths = new Set(tracked);
  const dirs = new Set();
  for (const p of tracked) {
    let d = path.posix.dirname(p);
    while (d && d !== '.' && !dirs.has(d)) { dirs.add(d); d = path.posix.dirname(d); }
  }
  const exists = (p) => paths.has(p) || dirs.has(p) || fs.existsSync(path.join(root, p));
  const readJson = (p) => JSON.parse(fs.readFileSync(path.join(configRoot, p), 'utf8'));
  const config = { staleTerms: readJson('docs/stale-terms.json'), owners: readJson('docs/doc-owners.json'), lint: readJson('docs/doc-lint.json') };
  const include = config.lint.include ?? ['**/*.md'];
  const exclude = config.lint.exclude ?? [];
  const files = new Map();
  for (const p of tracked) {
    if (!p.endsWith('.md') || !matchAny(p, include) || matchAny(p, exclude)) continue;
    if (!fs.existsSync(path.join(root, p))) continue; // deleted in the worktree
    files.set(p, fs.readFileSync(path.join(root, p), 'utf8'));
  }
  return { files, exists, config };
}

export function main(argv = process.argv.slice(2)) {
  const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const root = path.resolve(arg('--root') ?? process.cwd());
  const today = arg('--today') ?? localToday();
  const { files, exists, config } = loadRepo(root, path.resolve(arg('--config-root') ?? root));
  const findings = lintDocs({ files, exists, config, today });
  const errors = findings.filter((f) => f.level === 'ERROR');
  if (argv.includes('--json')) console.log(JSON.stringify(findings, null, 1));
  else {
    for (const f of argv.includes('--quiet') ? errors : findings) console.log(formatFinding(f));
    const s = summarise(findings);
    const fmt = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';
    console.log(`doc-lint: ${files.size} docs, ${errors.length} errors (${fmt(s.ERROR)}), ${findings.length - errors.length} warnings (${fmt(s.WARN)})`);
  }
  return errors.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = main();
