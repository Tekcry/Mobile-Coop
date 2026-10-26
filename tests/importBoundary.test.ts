// Hard rule 10 (H9): gameplay never imports graphics settings. Scans src/ai, src/game, src/player, src/net.
// Type-only imports erase and are allowed (`import type`, or `import { type X }` with nothing else in the braces).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const DIRS = ['src/ai', 'src/game', 'src/player', 'src/net'];

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const FILES = DIRS.flatMap((d) => walk(join(ROOT, d), [])).map((p) => relative(ROOT, p).replaceAll('\\', '/'));

interface Imp {
  file: string;
  /** The module specifier. */
  spec: string;
  /** True when every binding is type-only (the import erases). */
  typeOnly: boolean;
}

const STATIC = /\b(import|export)\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]/g;
const SIDE = /\bimport\s*['"]([^'"]+)['"]/g;
const DYN = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function importsOf(file: string): Imp[] {
  const src = readFileSync(join(ROOT, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const out: Imp[] = [];
  for (const m of src.matchAll(STATIC)) {
    let typeOnly = !!m[2];
    const clause = (m[3] ?? '').trim();
    if (!typeOnly) {
      const named = /^\{([\s\S]*)\}$/.exec(clause);
      if (named) {
        const items = (named[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
        typeOnly = items.length > 0 && items.every((s) => /^type\s/.test(s));
      }
    }
    out.push({ file, spec: m[4] ?? '', typeOnly });
  }
  for (const m of src.matchAll(SIDE)) out.push({ file, spec: m[1] ?? '', typeOnly: false });
  for (const m of src.matchAll(DYN)) out.push({ file, spec: m[1] ?? '', typeOnly: false });
  return out;
}

const ALL = FILES.flatMap(importsOf);
const mod = (spec: string) => spec.replace(/^(\.\.?\/)+/, '').replace(/^src\//, '');

const BANNED = /^core\/(quality|qualityManager|governor)$/;

/** Runtime importers of the banned modules, each with a reason. */
const QUALITY_ALLOW: Record<string, string> = {
  'src/game/benchmark.ts': 'the graphics benchmark is render-side; Guard AI and Player never import it',
};

/** The `core/display` readers (resolution and field of view maths); a new one fails until reviewed. */
const DISPLAY_READERS: Record<string, string> = {
  'src/player/shoulderCamera.ts': 'vfovFor',
  'src/game/gameState.ts': 'shownResolution',
  'src/game/benchmark.ts': 'desktopResolutions, resolutionScale',
};

describe('H9 import boundary', () => {
  it('scans real files', () => {
    expect(FILES.length).toBeGreaterThan(20);
    expect(FILES).toContain('src/game/gameState.ts');
  });

  it('no non-type import of core/quality, core/qualityManager or core/governor', () => {
    const bad = ALL.filter((i) => BANNED.test(mod(i.spec)) && !i.typeOnly && !(i.file in QUALITY_ALLOW)).map(
      (i) => `${i.file} imports ${i.spec}`,
    );
    expect(bad).toEqual([]);
  });

  it('the quality allowlist has no stale rows', () => {
    for (const f of Object.keys(QUALITY_ALLOW)) {
      expect(ALL.some((i) => i.file === f && BANNED.test(mod(i.spec)) && !i.typeOnly), f).toBe(true);
    }
  });

  it('core/display readers are the known list', () => {
    const readers = [...new Set(ALL.filter((i) => mod(i.spec) === 'core/display' && !i.typeOnly).map((i) => i.file))];
    expect(readers.sort()).toEqual(Object.keys(DISPLAY_READERS).sort());
  });
});
