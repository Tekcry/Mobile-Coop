/**
 * (guard-models G7b, G7-CHECK polish 4) `warmPlayLods`: a call whose urls are all asked already resolves with the run
 * that holds THEM, never the last run queued, so the menu's load screen (`loadMenuLods` waits for its warm) does not
 * wait behind the guards' LODs; a call with fresh urls queues behind every earlier run; a failed run forgets only its
 * own urls.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** One fetch held open until the test releases it. */
interface Gate {
  url: string;
  open(ok?: boolean): void;
}

let gates: Gate[] = [];
let fetched: string[] = [];

async function freshModule() {
  vi.resetModules();
  return import('../src/operators/runtime/offline');
}

beforeEach(() => {
  gates = [];
  fetched = [];
  vi.stubGlobal('navigator', { serviceWorker: { controller: {}, addEventListener: () => {} } });
  vi.stubGlobal('caches', { match: async () => undefined });
  vi.stubGlobal('fetch', (url: string) => {
    fetched.push(url);
    return new Promise<Response>((resolve) => {
      gates.push({ url, open: (ok = true) => resolve(new Response(new ArrayBuffer(4), { status: ok ? 200 : 503 })) });
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
const gateOf = (url: string): Gate => {
  const g = gates.find((x) => x.url === url);
  if (!g) throw new Error(`${url} not fetched yet`);
  return g;
};

describe('warmPlayLods queue (polish 4)', () => {
  it("the menu's second call resolves with its own run while the guards' run is still fetching", async () => {
    const { warmPlayLods } = await freshModule();
    const menu = warmPlayLods(['/wren-lod2.glb']);
    await flush();
    gateOf('/wren-lod2.glb').open();
    expect(await menu).toBe(1);
    // the guards' LODs: a run of their own, held open
    const guards = warmPlayLods(['/guard-average-lod2.glb', '/guard-average-lod0.glb']);
    let guardsDone = false;
    void guards.then(() => { guardsDone = true; });
    await flush();
    expect(fetched).toEqual(['/wren-lod2.glb', '/guard-average-lod2.glb']);
    // the menu again (loadMenuLods after a match): nothing new, so it settles with the menu's run at once
    let again = -1;
    void warmPlayLods(['/wren-lod2.glb']).then((n) => { again = n; });
    await flush();
    expect(again).toBe(1);
    expect(guardsDone).toBe(false);
    // the guards' urls asked again wait for the guards' run
    let guardsAgain = false;
    void warmPlayLods(['/guard-average-lod0.glb']).then(() => { guardsAgain = true; });
    await flush();
    expect(guardsAgain).toBe(false);
    gateOf('/guard-average-lod2.glb').open();
    await flush();
    gateOf('/guard-average-lod0.glb').open();
    expect(await guards).toBe(2);
    await flush();
    expect(guardsAgain).toBe(true);
  });

  it('a call with fresh urls queues behind every earlier run; nothing asked at all settles with 0', async () => {
    const { warmPlayLods } = await freshModule();
    expect(await warmPlayLods([])).toBe(0);
    const a = warmPlayLods(['/a.glb']);
    const b = warmPlayLods(['/a.glb', '/b.glb']);
    await flush();
    // b's fetch waits for a's run
    expect(fetched).toEqual(['/a.glb']);
    gateOf('/a.glb').open();
    expect(await a).toBe(1);
    await flush();
    expect(fetched).toEqual(['/a.glb', '/b.glb']);
    gateOf('/b.glb').open();
    expect(await b).toBe(1);
    expect(fetched).toEqual(['/a.glb', '/b.glb']);
  });

  it('a failed run forgets its own urls only (a later call fetches them again)', async () => {
    const { warmPlayLods } = await freshModule();
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const ok = warmPlayLods(['/ok.glb']);
    await flush();
    gateOf('/ok.glb').open();
    await ok;
    const bad = warmPlayLods(['/bad.glb']);
    await flush();
    gateOf('/bad.glb').open(false);
    expect(await bad).toBe(0);
    expect(info).toHaveBeenCalled();
    const again = warmPlayLods(['/ok.glb', '/bad.glb']);
    await flush();
    expect(fetched).toEqual(['/ok.glb', '/bad.glb', '/bad.glb']);
    gates[2]!.open();
    expect(await again).toBe(1);
    info.mockRestore();
  });
});
