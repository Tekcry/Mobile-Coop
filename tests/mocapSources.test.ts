/**
 * (mixamo-retarget M5) The motion-capture source table (`src/anim/mocapSources.ts`) against the clip modules and the
 * credits: every clip module under `src/anim/clips/mocap/` (CMU) and `src/anim/clips/mixamo/` (Mixamo, M3 / M4) has a
 * row with the right source, every row its module; the Mixamo rows sit only in their generators' marker blocks; every
 * Mixamo row has its `docs/art-credits.md` row (repo path, clip name, source URL, licence); every CMU row's take is in
 * `docs/mocap-trial/SOURCES.md`. With no Mixamo module yet the Mixamo checks pass on zero rows, but the credits parser is
 * proved on the 21 rows M6 already wrote, so the check is real the moment M3 / M4 commit a clip.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MOCAP_SOURCE_NAMES, MOCAP_SOURCES, mocapSource, mocapSourceTag } from '../src/anim/mocapSources';
import { BODY_GROUPS } from '../src/anim/tune';
import { TRAV_ENTRIES } from '../src/anim/studioTraversal';

const CMU_DIR = 'src/anim/clips/mocap';
const MIXAMO_DIR = 'src/anim/clips/mixamo';
const TABLE = 'src/anim/mocapSources.ts';

interface Module {
  path: string;
  dir: 'cmu' | 'mixamo';
  /** Keyed (`keyedClip`) or channel (`makeClip`, a `trav_<slug>.ts` file). */
  kind: 'keyed' | 'trav';
  names: string[];
}

/** Every clip module of a directory and the clip names it defines (`name: 'mocap_...'`). */
function modules(dir: string, src: 'cmu' | 'mixamo'): Module[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => {
      const path = `${dir}/${f}`;
      const s = readFileSync(path, 'utf8');
      const names = [...s.matchAll(/\bname:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]!);
      return { path, dir: src, kind: f.startsWith('trav_') ? ('trav' as const) : ('keyed' as const), names };
    });
}

// (mixamo-retarget I9) the Anim Studio only Mixamo clips sit one folder down (`place` studio, BATCH2-PLAN I7)
const MODS = [...modules(CMU_DIR, 'cmu'), ...modules(MIXAMO_DIR, 'mixamo'), ...modules(`${MIXAMO_DIR}/studio`, 'mixamo')];
/** (I9) The pack folders and their names as the Mixamo site gives them (BATCH2-PLAN "(4) Art-credits rows"). */
const PACKS: Record<string, string> = {
  'pack-pistol': 'Pistol/Handgun Locomotion Pack', 'pack-rifle': 'Pro Rifle Pack', 'pack-shooter': 'Shooter Pack', 'pack-action-adventure': 'Action Adventure Pack',
};

/** The Mixamo section's table rows of docs/art-credits.md: cells per row (header and rule skipped). */
function mixamoCredits(): string[][] {
  const doc = readFileSync('docs/art-credits.md', 'utf8').replace(/\r\n/g, '\n');
  const at = doc.indexOf('## Motion capture (Mixamo');
  expect(at, 'docs/art-credits.md has the Mixamo section').toBeGreaterThan(0);
  const end = doc.indexOf('\n## ', at + 4);
  const sec = doc.slice(at, end < 0 ? undefined : end);
  const rows: string[][] = [];
  for (const line of sec.split('\n')) {
    if (!line.startsWith('|') || line.startsWith('| ---') || line.startsWith('| Files')) continue;
    rows.push(line.split('|').slice(1, -1).map((c) => c.trim()));
  }
  return rows;
}

describe('mocap sources: the table against the clip modules', () => {
  it('every clip module has a row with its source, and every row its module', () => {
    expect(MODS.filter((m) => m.dir === 'cmu').length, 'the CMU modules are found').toBe(12);
    const inModules = new Map<string, Module>();
    for (const m of MODS) {
      expect(m.names.length, `${m.path} defines one clip`).toBe(1);
      const name = m.names[0]!;
      expect(name.startsWith('mocap_'), `${m.path}: a capture is named mocap_<name> (${name})`).toBe(true);
      expect(inModules.has(name), `${name} defined once`).toBe(false);
      inModules.set(name, m);
      const r = mocapSource(name);
      expect(r, `${m.path}: ${name} has a row in ${TABLE}`).not.toBeNull();
      expect(r!.source, `${name}: the source follows the folder`).toBe(m.dir);
      expect(r!.studio.kind, `${name}: a ${m.kind} module`).toBe(m.kind);
      if (m.dir === 'mixamo') {
        // the slug rule (PLAN "Clip map"): mocap_<slug> in <slug>.ts (keyed) or trav_<slug>.ts (channel)
        const slug = name.slice(6);
        expect(m.path.replace('/studio/', '/')).toBe(`${MIXAMO_DIR}/${m.kind === 'trav' ? 'trav_' : ''}${slug}.ts`);
      }
    }
    for (const name of MOCAP_SOURCE_NAMES) expect(inModules.has(name), `${name}: the row's module exists`).toBe(true);
    expect(MOCAP_SOURCE_NAMES.length).toBe(inModules.size);
  });

  it('every row is complete: title, credit, a Studio play the Studio can use', () => {
    const loops = new Set(TRAV_ENTRIES.map((t) => t.id));
    for (const name of MOCAP_SOURCE_NAMES) {
      const r = MOCAP_SOURCES[name]!;
      expect(r.title.trim(), name).not.toBe('');
      expect(r.credit, name).toMatch(r.source === 'cmu' ? /mocap\.cs\.cmu\.edu/ : /mixamo\.com/);
      expect(mocapSourceTag(name), name).toBe(r.source === 'cmu' ? 1 : 2);
      const st = r.studio;
      if (st.kind === 'keyed') {
        expect((BODY_GROUPS as readonly string[]).includes(st.body), `${name}: body state ${st.body}`).toBe(true);
        expect(st.cycle, name).toBeGreaterThan(0.2);
      } else expect(loops.has(st.loop), `${name}: Studio loop ${st.loop}`).toBe(true);
    }
    expect(mocapSourceTag('walk')).toBe(0);
    expect(mocapSource('walk')).toBeNull();
  });

  it('the marker blocks: once each, in order, after the CMU rows; Mixamo rows only inside them, of their kind', () => {
    const lines = readFileSync(TABLE, 'utf8').replace(/\r\n/g, '\n').split('\n');
    const at = (m: string): number => {
      const i = lines.findIndex((l) => l.trim().startsWith(`// ${m}`));
      expect(lines.filter((l) => l.trim().startsWith(`// ${m}`)).length, `${m} once`).toBe(1);
      return i;
    };
    const kb = at('@mixamo-keyed-begin');
    const ke = at('@mixamo-keyed-end');
    const tb = at('@mixamo-trav-begin');
    const te = at('@mixamo-trav-end');
    expect(kb < ke && ke < tb && tb < te).toBe(true);
    const rowRe = /^\s*(mocap_[a-z0-9_]+):\s*\{/;
    let rows = 0;
    lines.forEach((l, i) => {
      const m = rowRe.exec(l);
      if (!m) return;
      rows++;
      const r = mocapSource(m[1]!)!;
      expect(r, `${m[1]} parses as a row`).not.toBeNull();
      const inKeyed = i > kb && i < ke;
      const inTrav = i > tb && i < te;
      if (r.source === 'cmu') expect(i < kb, `${m[1]}: a CMU row sits above the Mixamo blocks`).toBe(true);
      else {
        expect(inKeyed || inTrav, `${m[1]}: a Mixamo row sits inside a marker block`).toBe(true);
        expect(r.studio.kind === 'keyed' ? inKeyed : inTrav, `${m[1]}: in its own block (M3 keyed, M4 channel)`).toBe(true);
      }
    });
    // one row a line, every row seen (the generators write and rewrite whole lines)
    expect(rows).toBe(MOCAP_SOURCE_NAMES.length);
  });
});

describe('mocap sources: the credits', () => {
  it('every Mixamo row has its art-credits row: repo path, clip name, source URL and licence', () => {
    const credits = mixamoCredits();
    // the parser reads M6's rows (21 clips planned; proves the check is live before any clip lands)
    expect(credits.length).toBeGreaterThanOrEqual(21);
    for (const c of credits) expect(c.length, c.join(' | ')).toBe(7);
    const doc = readFileSync('docs/art-credits.md', 'utf8');
    for (const name of MOCAP_SOURCE_NAMES) {
      const r = MOCAP_SOURCES[name]!;
      if (r.source !== 'mixamo') continue;
      const row = credits.find((c) => c[2] === `\`${name}\``);
      expect(row, `${name}: a row in docs/art-credits.md "Motion capture (Mixamo, mixamo-retarget)"`).toBeDefined();
      const [file, title, , url, terms, date, used] = row!;
      const mod = MODS.find((m) => m.names.includes(name))!;
      expect(file, `${name}: the repo path`).toBe(`\`${mod.path}\``);
      expect(title, `${name}: the Mixamo title`).toContain(r.title);
      expect(url, `${name}: the source URL`).toMatch(/^https:\/\/www\.mixamo\.com\//);
      expect(terms, `${name}: the licence`).toMatch(/royalty-free/i);
      expect(date, name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(used, name).not.toBe('');
      // (I9) a pack clip's title cell starts with its pack's name and names the file in its folder; an Anim Studio only
      // module says so
      const pack = /^(pack-[a-z-]+)\//.exec(r.take ?? '')?.[1];
      if (pack) {
        expect(PACKS[pack], `${name}: a known pack`).toBeDefined();
        expect(title!.startsWith(`${PACKS[pack]}: `), `${name}: the title cell starts with the pack name`).toBe(true);
        expect(r.title.startsWith(`${PACKS[pack]}: `), `${name}: the row title too`).toBe(true);
      }
      if (r.take) expect(title, `${name}: the file as downloaded`).toContain(`(\`${r.take}\`)`);
      if (mod.path.includes('/studio/')) expect(used, name).toMatch(/^Anim Studio only/);
    }
    // the section's licence line (A11; the orchestrator's credits line, verbatim)
    if (MOCAP_SOURCE_NAMES.some((n) => MOCAP_SOURCES[n]!.source === 'mixamo')) {
      expect(doc).toContain('Animations from Mixamo (mixamo.com, Adobe), royalty-free for commercial use; retargeted onto the game\'s own rigs; raw files not redistributed.');
    }
  });

  it('every CMU row\'s take is in docs/mocap-trial/SOURCES.md and the CMU credits row', () => {
    const sources = readFileSync('docs/mocap-trial/SOURCES.md', 'utf8');
    const credits = readFileSync('docs/art-credits.md', 'utf8');
    expect(credits).toContain('http://mocap.cs.cmu.edu/');
    for (const name of MOCAP_SOURCE_NAMES) {
      const r = MOCAP_SOURCES[name]!;
      if (r.source !== 'cmu') continue;
      const take = /^(\d+_\d+)/.exec(r.take ?? '')?.[1];
      expect(take, `${name}: the take`).toBeDefined();
      expect(sources, `${name}: take ${take} in SOURCES.md`).toContain(take!);
      // the module header names the same take
      const mod = MODS.find((m) => m.names.includes(name))!;
      expect(readFileSync(mod.path, 'utf8'), `${name}: the module's header`).toContain(`take ${take}`);
    }
  });
});
