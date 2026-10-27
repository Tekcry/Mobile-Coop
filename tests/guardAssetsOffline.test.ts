/**
 * (guard-models PR) The guard figures' files (`src/operators/assets/guards/`, ~29 MB of GLBs) are off by default: never
 * in the service worker's precache, and never fetched with `?guardmodels=0` (the flag is on by default since gm-flip).
 *
 * - Precache: the bundled guard files, named as the build emits them (`assets/<name>-<hash>.glb`), are globbed with the
 *   worker's own lists (`src/pwa/precacheGlobs.ts`, what vite.config.ts hands workbox) through `glob`'s `globSync`, the
 *   call workbox-build makes (`get-file-details.js`): none is precached, the app shell still is; the ignores keep them
 *   out even if a pattern took every `.glb`.
 * - Runtime: the `guards` cache rule matches a built guard file and no other asset.
 * - The default (no query) is on and builds figures for human guards; `?guardmodels=0`: no guard figure is built
 *   (`guardModelsFor`), and resolving a base's files or the shield's yields URL strings only (Vite `?url`), with no fetch.
 */
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { GUARD_ASSET_URL, PRECACHE_GLOBS, PRECACHE_IGNORES } from '../src/pwa/precacheGlobs';

const GUARD_DIR = fileURLToPath(new URL('../src/operators/assets/guards/', import.meta.url));
const GUARD_GLBS = readdirSync(GUARD_DIR).filter((f) => f.endsWith('.glb'));

/** A dist-shaped folder: the shell, Wren's and the weapons' GLBs, and every bundled guard GLB with a build hash. */
const DIST = mkdtempSync(join(tmpdir(), 'ns-precache-'));
const hashed = (f: string): string => `assets/${f.replace(/\.glb$/, '')}-Ab12_cD3.glb`;
const DIST_FILES = [
  'index.html',
  'manifest.webmanifest',
  'assets/index-Q1w2E3r4.js',
  'assets/babylon-Zx9Yw8Vu.js',
  'assets/index-Aa11Bb22.css',
  'assets/HavokPhysics-Cc33Dd44.wasm',
  'assets/BarlowCondensed-Ee55.ttf',
  'assets/music-ledger-Ff66.mp3',
  'assets/wren-lod0-Gg77Hh88.glb',
  'assets/rifle-Ii99Jj00.glb',
  ...GUARD_GLBS.map(hashed),
];
for (const f of DIST_FILES) {
  mkdirSync(join(DIST, f, '..'), { recursive: true });
  writeFileSync(join(DIST, f), 'x');
}
afterAll(() => rmSync(DIST, { recursive: true, force: true }));

/** Workbox's precache list: each pattern globbed with the ignores (get-file-details.js), merged. */
function precache(globs: readonly string[]): string[] {
  const out = new Set<string>();
  for (const g of globs) for (const f of globSync(g, { cwd: DIST, ignore: [...PRECACHE_IGNORES] })) out.add(f.replace(/\\/g, '/'));
  return [...out].sort();
}

describe('guard assets: never precached', () => {
  it('the bundled guard GLBs are all there (12: three bases and the shield, LOD0-2)', () => {
    expect(GUARD_GLBS.length).toBe(12);
    expect(GUARD_GLBS.every((f) => f.startsWith('guard-'))).toBe(true);
  });

  it('the precache lists take the app shell and no guard file', () => {
    const list = precache(PRECACHE_GLOBS);
    expect(list).toContain('index.html');
    expect(list).toContain('assets/index-Q1w2E3r4.js');
    expect(list).toContain('assets/HavokPhysics-Cc33Dd44.wasm');
    expect(list.filter((f) => /(^|\/)guard-/.test(f))).toEqual([]);
    // no GLB at all today (Wren's and the weapons' are runtime-cached too)
    expect(list.filter((f) => f.endsWith('.glb'))).toEqual([]);
  });

  it('the ignores keep the guard GLBs out even if a pattern took every .glb', () => {
    const list = precache([...PRECACHE_GLOBS, '**/*.glb']);
    expect(list).toContain('assets/wren-lod0-Gg77Hh88.glb');
    expect(list.filter((f) => /(^|\/)guard-/.test(f))).toEqual([]);
  });

  it('the guards runtime rule matches a built guard file and nothing else', () => {
    for (const f of GUARD_GLBS) expect(GUARD_ASSET_URL.test(`/Mobile-Coop/${hashed(f)}`)).toBe(true);
    expect(GUARD_ASSET_URL.test('/assets/wren-lod0-Gg77Hh88.glb')).toBe(false);
    expect(GUARD_ASSET_URL.test('/assets/rifle-Ii99Jj00.glb')).toBe(false);
    expect(GUARD_ASSET_URL.test('/assets/guard-x.json')).toBe(false);
  });
});

describe('guard assets: the flag default, and no fetch when resolving', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('the default (no ?guardmodels) is on for human guards, never the dog', async () => {
    vi.resetModules();
    const { flags } = await import('../src/core/flags');
    expect(flags.guardModels).toBe(true);
    const { guardModelsFor } = await import('../src/ai/guardBody');
    expect(guardModelsFor({ quadruped: false })).toBe(true);
    expect(guardModelsFor({ quadruped: true })).toBe(false);
  });

  it('?guardmodels=0 is off and builds no figure', async () => {
    vi.stubGlobal('location', { search: '?guardmodels=0', origin: 'http://localhost' });
    vi.resetModules();
    const { flags } = await import('../src/core/flags');
    expect(flags.guardModels).toBe(false);
    const { guardModelsFor } = await import('../src/ai/guardBody');
    expect(guardModelsFor({ quadruped: false })).toBe(false);
  });

  it('resolving the bases and the shield yields URL strings only, no fetch', async () => {
    const fetched: unknown[] = [];
    vi.stubGlobal('fetch', (u: unknown) => {
      fetched.push(u);
      return Promise.reject(new Error('no fetch expected'));
    });
    vi.resetModules();
    const { guardAsset, shieldUrls } = await import('../src/operators/guards/guardAssets');
    for (const b of ['average', 'lean', 'broad'] as const) {
      const a = guardAsset(b);
      expect(a.standIn).toBe(false);
      for (const u of a.manifest.urls.slice(1)) expect(typeof u === 'string' && u.length > 0).toBe(true);
    }
    expect(shieldUrls()).not.toBeNull();
    expect(fetched).toEqual([]);
  });
});
