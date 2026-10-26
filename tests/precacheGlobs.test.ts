/**
 * (piano-escape S3) The Piano Escape scene's music (`src/assets/music/scene/piano-escape.mp3`, 4.3 MB) is never in the
 * service worker's precache: it is fetched only when the scene starts. The precache lists are globbed the way workbox
 * does (`glob`'s `globSync`, with `PRECACHE_IGNORES`), as in tests/guardAssetsOffline.test.ts, on a dist-shaped folder.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import { afterAll, describe, expect, it } from 'vitest';
import { PRECACHE_GLOBS, PRECACHE_IGNORES } from '../src/pwa/precacheGlobs';

const DIST = mkdtempSync(join(tmpdir(), 'ns-precache-piano-'));
const DIST_FILES = [
  'index.html',
  'assets/index-Q1w2E3r4.js',
  'assets/music-alert-Aa11Bb22.mp3',
  'assets/foley-Cc33Dd44.mp3',
  'assets/weapons-Ee55Ff66.mp3',
  'assets/piano-escape-Gg77Hh88.mp3',
];
for (const f of DIST_FILES) {
  mkdirSync(join(DIST, f, '..'), { recursive: true });
  writeFileSync(join(DIST, f), 'x');
}
afterAll(() => rmSync(DIST, { recursive: true, force: true }));

function precache(globs: readonly string[], ignore: readonly string[]): string[] {
  const out = new Set<string>();
  for (const g of globs) for (const f of globSync(g, { cwd: DIST, ignore: [...ignore] })) out.add(f.replace(/\\/g, '/'));
  return [...out].sort();
}

describe('piano escape music: not precached', () => {
  it('the bundled file is in the repo where the scene imports it', () => {
    expect(existsSync(fileURLToPath(new URL('../src/assets/music/scene/piano-escape.mp3', import.meta.url)))).toBe(true);
  });

  it('the precache takes the shell and the game tracks, not the piano', () => {
    const list = precache(PRECACHE_GLOBS, PRECACHE_IGNORES);
    expect(list).toContain('index.html');
    expect(list).toContain('assets/music-alert-Aa11Bb22.mp3');
    expect(list.some((f) => f.includes('piano-escape'))).toBe(false);
  });

  it('the ignore keeps it out even if a pattern took every mp3', () => {
    expect(precache(['**/*.mp3'], []).some((f) => f.includes('piano-escape'))).toBe(true);
    expect(precache(['**/*.mp3'], PRECACHE_IGNORES).some((f) => f.includes('piano-escape'))).toBe(false);
    expect(PRECACHE_IGNORES).toContain('**/piano-escape-*.mp3');
  });
});

describe('scene music A/B (piano-escape S5): no file of the scene folder is precached', () => {
  const dir = fileURLToPath(new URL('../src/assets/music/scene/', import.meta.url));
  const built = readdirSync(dir)
    .filter((f) => f.endsWith('.mp3'))
    .map((f) => `assets/${f.replace(/.mp3$/, '')}-Zz99Yy88.mp3`);
  for (const f of built) {
    mkdirSync(join(DIST, f, '..'), { recursive: true });
    writeFileSync(join(DIST, f), 'x');
  }

  it('the folder holds the twelve tracks', () => {
    expect(built.length).toBe(12);
  });

  it('the shell glob takes none, and the ignore drops each even if a pattern took every mp3', () => {
    const shell = precache(PRECACHE_GLOBS, PRECACHE_IGNORES);
    const every = precache(['**/*.mp3'], []);
    const kept = precache(['**/*.mp3'], PRECACHE_IGNORES);
    for (const f of built) {
      expect(shell, f).not.toContain(f);
      expect(every, f).toContain(f);
      expect(kept, f).not.toContain(f);
    }
    expect(kept).toContain('assets/music-alert-Aa11Bb22.mp3');
  });
});
