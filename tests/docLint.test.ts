import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  applyKnown, checkBibleNotes, checkCitations, checkLinks, checkOwners, checkSizes, checkStaleTerms, codePath, globRe, linkPath,
  lintDocs, parseDecisions, resumeBlock, splitLines, staleDecided, summarise, wordCount, G_RE,
  // @ts-expect-error plain .mjs script without types
} from '../scripts/doc-lint.mjs';

type F = { level: string; check: string; file: string; line: number; msg: string };
const map = (o: Record<string, string>) => new Map(Object.entries(o));
const has = (set: string[]) => (p: string) => set.includes(p);

describe('globs and lines', () => {
  it('matches ** across folders and * within one', () => {
    expect(globRe('docs/**').test('docs/a/b.md')).toBe(true);
    expect(globRe('docs/*.md').test('docs/a/b.md')).toBe(false);
    expect(globRe('docs/*.md').test('docs/VISION.md')).toBe(true);
    expect(globRe('docs/**/STATE.md').test('docs/STATE.md')).toBe(true);
  });
  it('marks fenced code', () => {
    const { fenced } = splitLines('a\n```\nb\n```\nc');
    expect(fenced).toEqual([false, true, true, true, false]);
  });
  it('counts words with letters or digits only', () => {
    expect(wordCount('| a | b |\n| --- | --- |\n- one 2')).toBe(4);
  });
});

describe('stale terms', () => {
  const cfg = {
    scope: ['docs/*.md'],
    allow: ['docs/DECISIONS.md'],
    terms: [
      { id: 'old', term: 'CT Core Build', why: 'old name', replacement: 'Player Build', allow: ['docs/RULES.md'] },
      { id: 'dark', regex: 'darkened at least two ways', why: 'G333', allowLine: 'harden' },
    ],
  };
  it('flags a term with file:line and the replacement', () => {
    const out: F[] = checkStaleTerms(map({ 'docs/a.md': 'x\nask CT Core Build now' }), cfg);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ level: 'ERROR', check: 'stale-terms', file: 'docs/a.md', line: 2 });
    expect(out[0]!.msg).toContain('Player Build');
  });
  it('allows history lines, allowed files, out-of-scope files and wrapped qualifiers', () => {
    const files = map({
      'docs/a.md': 'Old names: CT Core Build = Player Build',
      'docs/RULES.md': 'CT Core Build',
      'docs/DECISIONS.md': 'CT Core Build',
      'docs/job/STATE.md': 'CT Core Build',
      'docs/b.md': 'can be darkened at least two ways (switch), or is\nhardened with a route around',
    });
    expect(checkStaleTerms(files, cfg)).toEqual([]);
  });
});

const DECISIONS = [
  '**G1. Pure CT.** text',
  '**G4. Prototype first.** (Replaced by G288, 2026-10-24: refining is allowed.)',
  '**G2. Two players.** (Replaced for Sector Ops by G308, 2026-10-23.)',
  '**G11. Ideas.** (Replaced by G150 for movement, 2026-10-18.)',
  '**G46. Awake.** (Replaced by G187, G254 and G289: caps.)',
  '**G150. x.**', '**G187. x.**', '**G254. x.**', '**G288. x.**', '**G289. x.**', '**G308. x.**',
].join('\n');

describe('citations', () => {
  it('parses full and partial replacements', () => {
    const d = parseDecisions(DECISIONS);
    expect(d.get(4).replacedBy).toEqual([288]);
    expect(d.get(46).replacedBy).toEqual([187, 254, 289]);
    expect(d.get(2).replacedBy).toBeNull();
    expect(d.get(11).replacedBy).toBeNull();
    expect(d.get(1).replacedBy).toBeNull();
  });
  it('reads ranges and skips paths and slice names', () => {
    const gs = (s: string) => [...s.matchAll(G_RE)].map((m) => Number(m[1]));
    expect(gs('G103-G105 and (G4)')).toEqual([103, 105, 4]);
    expect(gs('`docs/ct-prototype/G4-REPORT.md`, VG6, G10a')).toEqual([]);
  });
  const cfg = { scope: ['docs/**'], ownerDocs: ['docs/VISION.md'], ignore: [{ file: 'docs/VISION.md', text: 'walk 4.72 G4' }] };
  const d = parseDecisions(DECISIONS);
  it('fails a missing G anywhere in scope', () => {
    const out: F[] = checkCitations(map({ 'docs/x.md': 'see G999' }), d, cfg);
    expect(out[0]!.msg).toContain('G999 is not in docs/DECISIONS.md');
  });
  it('fails a replaced G cited as current in an owner doc, unless the replacement or history is near', () => {
    const files = map({ 'docs/VISION.md': ['Prototype first (G4).', '', 'Refining allowed (G4, G288).', 'G4 was the old rule.',
      'Awake cap (G46;', 'G289 caps it).', 'guard-ai walk 4.72 G4'].join('\n'), 'docs/job/BRIEF.md': 'Prototype first (G4).' });
    const out: F[] = checkCitations(files, d, cfg);
    expect(out.map((f) => `${f.file}:${f.line}`)).toEqual(['docs/VISION.md:1']);
    expect(out[0]!.msg).toContain('replaced by G288');
  });
});

describe('links', () => {
  const exists = has(['docs/VISION.md', 'docs/systems', 'src/save/ratingRecord.ts', 'scripts/a.mjs']);
  const cfg = { scope: ['docs/**'], errorScope: ['docs/*.md'], offBranch: ['docs/orchestrator/**'] };
  it('resolves link targets relative to the file', () => {
    expect(linkPath('docs/systems/ai.md', '../VISION.md#x')).toBe('docs/VISION.md');
    expect(linkPath('docs/a.md', 'https://x.y')).toBeNull();
    expect(linkPath('docs/a.md', '#top')).toBeNull();
  });
  it('reads backticked repo paths and skips commands and placeholders', () => {
    expect(codePath('scripts/a.mjs:12')).toBe('scripts/a.mjs');
    expect(codePath('docs/<job>/STATE.md')).toBeNull();
    expect(codePath('node scripts/a.mjs')).toBeNull();
    expect(codePath('docs/x/*.md')).toBeNull();
    expect(codePath('CLAUDE.md')).toBe('CLAUDE.md');
    expect(codePath('git show origin/master:docs/RULES.md')).toBeNull();
  });
  it('flags missing links and paths, skips fences, other branches, removed files and module paths', () => {
    const text = [
      '[v](VISION.md) [s](systems/) [m](MISSING.md)',
      '`src/save/ratingRecord` and `scripts/gone.mjs`',
      '```', '`scripts/example.mjs`', '```',
      '`docs/orchestrator/STATE.md`',
      'on origin/feature/menu: `docs/x/Y.md`',
      'the voxel body was removed (`src/voxel/body.ts`)',
    ].join('\n');
    const out: F[] = checkLinks(map({ 'docs/a.md': text, 'docs/job/PLAN.md': '[m](NONE.md)' }), exists, cfg);
    expect(out.map((f) => `${f.level} ${f.file}:${f.line}`)).toEqual(['ERROR docs/a.md:1', 'ERROR docs/a.md:2', 'WARN docs/job/PLAN.md:1']);
    expect(out[1]!.msg).toContain('scripts/gone.mjs');
  });
});

describe('owners', () => {
  it('warns when a rule is restated outside its owner', () => {
    const cfg = { scope: ['docs/**'], owners: [{ id: 'save', owner: 'docs/RULES.md', rule: 'the save', pattern: 'save at ~92%' }] };
    const out: F[] = checkOwners(map({ 'docs/RULES.md': 'save at ~92%', 'docs/systems/swaps.md': 'x\nsave at ~92% here' }), cfg);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ level: 'WARN', file: 'docs/systems/swaps.md', line: 2 });
  });
});

describe('sizes', () => {
  it('finds Decided entries older than today', () => {
    const t = '## Now\n- 2026-10-20 x\n## Decided\n- 2026-10-24 ~10:00 a\n- 2026-10-25 b\n  wrapped 2026-10-01\n## Done\n- 2026-10-01';
    expect(staleDecided(t, '2026-10-25')).toEqual([{ line: 4, date: '2026-10-24' }]);
  });
  it('measures the resume block (a Resume section, else the first section)', () => {
    expect(resumeBlock('# t\n## Now\na\nb\n\n## Done\nc')).toEqual({ line: 2, length: 2 });
    expect(resumeBlock('# t\n## Done\nx\n## Resume prompt\na\nb\nc')).toEqual({ line: 4, length: 3 });
  });
  it('errors on word and line budgets, warns on ROADMAP and STATE', () => {
    const cfg = { words: { 'docs/VISION.md': 3 }, lines: { 'CLAUDE.md': 2 }, roadmap: 'docs/ROADMAP.md', stateResume: { glob: 'docs/*/STATE.md', max: 1 } };
    const files = map({
      'docs/VISION.md': 'one two three four', 'CLAUDE.md': 'a\nb\nc\n', 'docs/ROADMAP.md': '## Decided\n- 2026-10-24 x',
      'docs/job/STATE.md': '# s\n## Now\na\nb',
    });
    const out: F[] = checkSizes(files, cfg, '2026-10-25');
    expect(out.map((f) => `${f.level} ${f.file}`)).toEqual(['ERROR docs/VISION.md', 'ERROR CLAUDE.md', 'WARN docs/ROADMAP.md', 'WARN docs/job/STATE.md']);
  });
});

describe('bible notes and known stale', () => {
  it('fails an appended Note 2026- line in the bible only', () => {
    const out: F[] = checkBibleNotes(map({ 'docs/design-bible.md': 'rule.\n  Note 2026-10-24: changed\nNotes 2026 fine\n- (Note 2026-10-25: x)' }));
    expect(out.map((f) => f.line)).toEqual([2, 4]);
  });
  it('turns a listed error into a WARN with its note', () => {
    const f = [{ level: 'ERROR', check: 'citations', file: 'docs/a.md', line: 1, msg: 'G4 is replaced by G288' },
      { level: 'ERROR', check: 'citations', file: 'docs/a.md', line: 2, msg: 'G9 is not in docs/DECISIONS.md' }];
    const out: F[] = applyKnown(f, [{ check: 'citations', file: 'docs/a.md', match: 'G4 is replaced', note: 'bible pass' }]);
    expect(out.map((x) => x.level)).toEqual(['WARN', 'ERROR']);
    expect(out[0]!.msg).toContain('known stale: bible pass');
  });
});

describe('the repo config', () => {
  const read = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));
  const config = { staleTerms: read('docs/stale-terms.json'), owners: read('docs/doc-owners.json'), lint: read('docs/doc-lint.json') };
  it('compiles every pattern', () => {
    for (const t of config.staleTerms.terms) expect(() => new RegExp(t.regex ?? 'x', 'i')).not.toThrow();
    for (const o of config.owners.owners) expect(() => new RegExp(o.pattern)).not.toThrow();
  });
  it('flags each seeded stale term in a current doc', () => {
    const lines = ['Ask CT Core Build.', 'Menu Notes Build', 'Course Ready Build', 'Character Build', 'no 3-4 player test',
      'the minimap shows guards', 'Fallow is the training course', 'the desktop is the main test machine',
      'Current goal (2026-10-19)', 'see CLAUDE.md "Sessions"', 'at most one hard rule', 'can be darkened at least two ways'];
    const files = map({ 'docs/systems/x.md': lines.join('\n'), 'docs/DECISIONS.md': '' });
    const out: F[] = lintDocs({ files, exists: () => true, config, today: '2026-10-25' }).filter((f: F) => f.check === 'stale-terms');
    expect(out.map((f) => f.line)).toEqual(lines.map((_, i) => i + 1));
    expect(summarise(out).ERROR['stale-terms']).toBe(lines.length);
  });
});
