/**
 * (gm-polish) The menu warms every guard file play fetches into the offline cache (`warmGuardFiles`, menuScene.ts after
 * Wren's chain), so a first offline play of a base no map has used yet draws the guard figures, not the merged body:
 * - full: each of the three bases' play LODs (every LOD2 first, then LOD0, LOD1) and the shield's LOD1 (the one LOD the
 *   enforcer draws), 10 files, each fetched once through the worker (the helmet drop's LOD1 is among them);
 * - `?gfx=min`: the three LOD2 files, the shield's LOD1 and the helmet drop's LOD1 (the average base's, guardHelmet.ts);
 * - `?guardmodels=0`: no fetch at all;
 * - a second call (the menu rebuilds its preview on every look change) fetches nothing more.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let fetched: string[] = [];

beforeEach(() => {
  fetched = [];
  vi.stubGlobal('navigator', { serviceWorker: { controller: {}, addEventListener: () => {} } });
  vi.stubGlobal('caches', { match: async () => undefined });
  vi.stubGlobal('fetch', async (url: string) => {
    fetched.push(url);
    return new Response(new ArrayBuffer(4), { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function fresh(search = '') {
  vi.stubGlobal('location', { search, origin: 'http://localhost' });
  vi.resetModules();
  return import('../src/operators/guards/guardAssets');
}

const name = (u: string): string => u.slice(u.lastIndexOf('/') + 1).replace(/\?.*$/, '');

describe('warmGuardFiles (the menu warm)', () => {
  it('full: the three bases\' play LODs (LOD2 first) and the shield\'s LOD1, each once', async () => {
    const { warmGuardFiles, guardAsset, shieldUrls, helmetManifestOf } = await fresh();
    for (const b of ['average', 'lean', 'broad'] as const) expect(guardAsset(b).standIn).toBe(false);
    expect(await warmGuardFiles(false)).toBe(10);
    expect(fetched.map(name)).toEqual([
      'guard-average-lod2.glb', 'guard-lean-lod2.glb', 'guard-broad-lod2.glb',
      'guard-average-lod0.glb', 'guard-lean-lod0.glb', 'guard-broad-lod0.glb',
      'guard-average-lod1.glb', 'guard-lean-lod1.glb', 'guard-broad-lod1.glb',
      'guard-shield_riot-lod1.glb',
    ]);
    expect(fetched).toContain(shieldUrls()![2]);
    expect(fetched).toContain(helmetManifestOf(guardAsset)!.urls[2]);
    // the menu calls again on every preview rebuild: nothing more is fetched
    expect(await warmGuardFiles(false)).toBe(10);
    expect(fetched.length).toBe(10);
  });

  it('?gfx=min: the LOD2 files, the shield\'s LOD1 and the helmet drop\'s LOD1 only', async () => {
    const { warmGuardFiles, guardAsset, helmetManifestOf } = await fresh();
    expect(await warmGuardFiles(true)).toBe(5);
    expect(fetched.map(name)).toEqual([
      'guard-average-lod2.glb', 'guard-lean-lod2.glb', 'guard-broad-lod2.glb', 'guard-shield_riot-lod1.glb',
      'guard-average-lod1.glb',
    ]);
    // the exact file the helmet drop loads (guardHelmet.ts, `helmetDropSource`)
    expect(fetched).toContain(helmetManifestOf(guardAsset)!.urls[2]);
  });

  it('a file already in the cache is not fetched again', async () => {
    const { warmGuardFiles } = await fresh();
    vi.stubGlobal('caches', { match: async (u: string) => (/lod2/.test(u) ? new Response('x') : undefined) });
    expect(await warmGuardFiles(false)).toBe(7);
    expect(fetched.some((u) => /lod2/.test(u))).toBe(false);
  });

  it('?guardmodels=0: nothing is fetched', async () => {
    const { warmGuardFiles } = await fresh('?guardmodels=0');
    expect(await warmGuardFiles(false)).toBe(0);
    expect(fetched).toEqual([]);
  });

  it('no worker controlling the page yet: nothing now, the warm runs at its controllerchange', async () => {
    let change: (() => void) | null = null;
    const sw: { controller: object | null; addEventListener: (t: string, f: () => void) => void } = {
      controller: null,
      addEventListener: (_t, f) => { change = f; },
    };
    vi.stubGlobal('navigator', { serviceWorker: sw });
    const { warmGuardFiles } = await fresh();
    expect(await warmGuardFiles(false)).toBe(0);
    expect(fetched).toEqual([]);
    sw.controller = {};
    change!();
    await vi.waitFor(() => expect(fetched.length).toBe(10));
  });
});
