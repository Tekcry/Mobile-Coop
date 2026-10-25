/**
 * (section-bake robust, polish3) `bakeLevelLight`: the moon failing while the section lamp job still awaits the cache
 * read must not leave a `SectionBaker` started that nobody stops.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LampResult } from '../src/voxel/lampBake';
import type { MoonResult } from '../src/voxel/skyBake';
import { LightRegistry, makeCone } from '../src/world/lights';
import type * as LampJobs from '../src/voxel/lampJobs';
import type * as SectionBakeMod from '../src/world/sectionBake';

const h = vi.hoisted(() => ({
  made: 0,
  started: 0,
  disposed: 0,
  last: null as unknown,
  /** Resolves the pending `readLampCache` call. */
  resolveCache: null as ((r: LampResult | null) => void) | null,
  moon: null as (() => Promise<MoonResult>) | null,
}));

vi.mock('../src/voxel/lampJobs', async (importOriginal) => ({
  ...(await importOriginal<typeof LampJobs>()),
  readLampCache: () =>
    new Promise<LampResult | null>((res) => {
      h.resolveCache = res;
    }),
  bakeLevelMoon: () => h.moon!(),
}));

vi.mock('../src/world/sectionBake', async (importOriginal) => ({
  ...(await importOriginal<typeof SectionBakeMod>()),
  // one region covering the test box (PlanRect: x0, z0, x1, z1)
  sectionBakeFor: () => ({ regions: [[[-4, -4, 4, 4]]] }),
}));

vi.mock('../src/voxel/sectionJobs', () => ({
  SectionBaker: class {
    readonly result = { fake: 'lamp result' } as unknown as LampResult;
    constructor() {
      h.made++;
      h.last = this;
    }
    start(): void {
      h.started++;
    }
    dispose(): void {
      h.disposed++;
    }
  },
}));

const { bakeLevelLight } = await import('../src/world/lightBake');

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function input(): Parameters<typeof bakeLevelLight>[0] {
  const reg = new LightRegistry();
  reg.add({ kind: 'spot', x: 0, y: 3, z: 0, radius: 7.5, intensity: 0.9, color: [0.9, 0.95, 1], cone: makeCone(0, -1, 0, 0.7) });
  reg.ambient = 0.3;
  return {
    mapId: 'polish3-test',
    seed: 1,
    shapes: new Float32Array(0),
    shapesHash: 'polish3',
    lo: [-4, 0, -4],
    hi: [4, 4, 4],
    reg,
    sunDir: [0, -1, 0],
    moonLight: 0.1,
  };
}

describe('bakeLevelLight: the moon failing beside a section bake (section-bake robust, polish3)', () => {
  beforeEach(() => {
    h.made = 0;
    h.started = 0;
    h.disposed = 0;
    h.last = null;
    h.resolveCache = null;
  });

  it('A: the moon rejects while the lamp job awaits the cache read -> no SectionBaker is made or started after', async () => {
    h.moon = () => Promise.reject(new Error('moon'));
    await expect(bakeLevelLight(input())).rejects.toThrow('moon');
    expect(h.resolveCache).not.toBeNull(); // the lamp job is still waiting on the cache
    h.resolveCache!(null); // a cache miss
    await flush();
    expect(h.made).toBe(0);
    expect(h.started).toBe(0);
  });

  it('B (no regression): the moon resolves and the cache misses -> one SectionBaker, started once, returned as sections', async () => {
    h.moon = () => Promise.resolve({ kind: 'moon', id: 0, vis: new Uint8Array(64) });
    const p = bakeLevelLight(input());
    await flush();
    expect(h.resolveCache).not.toBeNull();
    h.resolveCache!(null);
    const bake = await p;
    expect(h.made).toBe(1);
    expect(h.started).toBe(1);
    expect(h.disposed).toBe(0);
    expect(bake.sections).toBe(h.last);
  });
});
