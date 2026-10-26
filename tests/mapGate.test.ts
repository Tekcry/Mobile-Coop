import { describe, expect, it } from 'vitest';
import {
  ALWAYS,
  MAP_READY_CAP_MS,
  mapGateInput,
  mapGateStep,
  readyCapMs,
  runMapGate,
  STEPS,
  WARM_FRAMES,
  type MapGateInput,
  type MapGateProbe,
  type MapStep,
} from '../src/game/mapGate';

/** Every S2 step true but the warm count. */
function allIn(g: MapGateInput): void {
  g.bakeLive = g.quality = g.content = g.bodies = g.shaders = g.probe = g.bakeAll = g.audio = g.peers = true;
}

describe('map load gate: steps (map-ready S2)', () => {
  it('waits for each step in order, with its boot text', () => {
    const g = mapGateInput();
    expect(mapGateStep(g)).toMatchObject({ step: 'bake-live', text: 'Building lights' });
    g.bakeLive = true;
    expect(mapGateStep(g)).toMatchObject({ step: 'quality', text: 'Loading map…' });
    g.quality = true;
    expect(mapGateStep(g)).toMatchObject({ step: 'content', text: 'Loading map…' });
    g.content = true;
    expect(mapGateStep(g)).toMatchObject({ step: 'bodies', text: 'Loading Wren' });
    g.bodies = true;
    expect(mapGateStep(g)).toMatchObject({ step: 'shaders', text: 'Compiling shaders' });
    g.shaders = true;
    expect(mapGateStep(g)).toMatchObject({ step: 'probe', text: 'Compiling shaders' });
    g.probe = true;
    expect(mapGateStep(g)).toMatchObject({ step: 'bake-all', text: 'Building lights' });
    g.bakeAll = true;
    expect(mapGateStep(g)).toMatchObject({ step: 'audio', text: 'Loading sound' });
    g.audio = true;
    expect(mapGateStep(g)).toMatchObject({ step: 'warm', text: 'Final checks' });
    g.warmFrames = WARM_FRAMES - 1;
    expect(mapGateStep(g).step).toBe('warm');
    g.warmFrames = WARM_FRAMES;
    expect(mapGateStep(g)).toEqual({ step: 'ready', progress: 1, text: 'Ready' });
  });

  it('S3 inserts the audio step before warm (no peers step: S5 adds it); bake-live is the one step the cap never cuts', () => {
    expect(STEPS).toEqual(['bake-live', 'quality', 'content', 'bodies', 'shaders', 'probe', 'bake-all', 'audio', 'warm']);
    expect(ALWAYS).toEqual(['bake-live']);
    const g = mapGateInput();
    allIn(g);
    g.audio = false;
    g.warmFrames = WARM_FRAMES;
    expect(mapGateStep(g)).toMatchObject({ step: 'audio', text: 'Loading sound' });
    g.audio = true;
    g.peers = false;
    expect(mapGateStep(g).step).toBe('ready');
  });

  it('a later step done early does not skip an earlier one', () => {
    const g = mapGateInput();
    allIn(g);
    g.bodies = false;
    expect(mapGateStep(g).step).toBe('bodies');
  });

  it('progress only rises through the steps', () => {
    const g = mapGateInput();
    const seq: number[] = [];
    const push = (): void => void seq.push(mapGateStep(g).progress);
    push();
    for (const k of ['bakeLive', 'quality', 'content', 'bodies', 'shaders', 'probe', 'bakeAll', 'audio'] as const) {
      g[k] = true;
      push();
    }
    for (let i = 1; i <= WARM_FRAMES; i++) {
      g.warmFrames = i;
      push();
    }
    for (let i = 1; i < seq.length; i++) expect(seq[i]!).toBeGreaterThan(seq[i - 1]!);
    expect(seq[0]).toBe(0);
    expect(seq.at(-1)).toBe(1);
  });

  it('a custom steps list is honoured (S3 inserts audio before warm, S5 appends peers)', () => {
    const steps: MapStep[] = ['bake-live', 'quality', 'content', 'bodies', 'shaders', 'probe', 'bake-all', 'audio', 'warm', 'peers'];
    const g = mapGateInput();
    allIn(g);
    g.audio = false;
    g.peers = false;
    expect(mapGateStep(g, steps)).toMatchObject({ step: 'audio' });
    g.audio = true;
    expect(mapGateStep(g, steps).step).toBe('warm');
    g.warmFrames = WARM_FRAMES;
    expect(mapGateStep(g, steps)).toMatchObject({ step: 'peers', text: 'Waiting for partner' });
    g.peers = true;
    expect(mapGateStep(g, steps).step).toBe('ready');
    // a step dropped from the list (A1's undo) is not waited for
    const g2 = mapGateInput();
    allIn(g2);
    g2.probe = false;
    g2.warmFrames = WARM_FRAMES;
    expect(mapGateStep(g2, STEPS.filter((s) => s !== 'probe')).step).toBe('ready');
  });

  it('readyCapMs: ?readyCap=<s> within 5-600, else the 20 s cap', () => {
    expect(MAP_READY_CAP_MS).toBe(20_000);
    expect(readyCapMs('')).toBe(MAP_READY_CAP_MS);
    expect(readyCapMs('?mapready=1&readyCap=45')).toBe(45_000);
    expect(readyCapMs('?readyCap=5')).toBe(5_000);
    expect(readyCapMs('?readyCap=600')).toBe(600_000);
    expect(readyCapMs('?readyCap=4')).toBe(MAP_READY_CAP_MS);
    expect(readyCapMs('?readyCap=601')).toBe(MAP_READY_CAP_MS);
    expect(readyCapMs('?readyCap=abc')).toBe(MAP_READY_CAP_MS);
  });
});

/** A fake match for `runMapGate`: a fake clock moved by each tick, `fill` sets the input per turn. */
function fakeProbe(fill: (g: MapGateInput, turn: number) => void, opts: { tickMs?: number; closedAt?: number; rendered?: boolean } = {}): { probe: MapGateProbe; now: () => number; turns: () => number } {
  let t = 0;
  let turn = 0;
  const tickMs = opts.tickMs ?? 100;
  return {
    now: () => t,
    turns: () => turn,
    probe: {
      read: (g) => fill(g, turn++),
      tick: async () => {
        t += tickMs;
        return opts.rendered ?? true;
      },
      closed: () => opts.closedAt !== undefined && turn >= opts.closedAt,
      describe: () => 'fake',
    },
  };
}

describe('runMapGate: the hold always ends', () => {
  it('reaches ready after the warm frames, reporting each step once', async () => {
    const { probe, now } = fakeProbe((g, turn) => {
      g.bakeLive = turn >= 1;
      g.quality = g.content = turn >= 2;
      g.bodies = turn >= 3;
      g.shaders = g.probe = g.bakeAll = g.audio = turn >= 4;
    });
    const lines: string[] = [];
    const r = await runMapGate(probe, (_p, s) => void lines.push(s), MAP_READY_CAP_MS, STEPS, now);
    expect(r).toMatchObject({ status: 'ready', capStep: '' });
    expect(lines[0]).toBe('Building lights');
    expect(lines).toContain('Loading Wren');
    expect(lines).toContain('Compiling shaders');
    expect(lines.at(-1)).toBe('Ready');
    // (4 turns to get to warm, then WARM_FRAMES frames)
    expect(r.ms).toBe((4 + WARM_FRAMES) * 100);
  });

  it('warm needs WARM_FRAMES frames with the program count steady; a change mid-count restarts it', async () => {
    const { probe, now } = fakeProbe((g, turn) => {
      allIn(g);
      // a new program at turn 3 (three warm frames counted by then): the count starts again
      g.programs = turn >= 3 ? 41 : 40;
    });
    const r = await runMapGate(probe, () => {}, MAP_READY_CAP_MS, STEPS, now);
    expect(r.status).toBe('ready');
    expect(r.ms).toBe((3 + WARM_FRAMES) * 100);
  });

  it('a step falling back restarts the warm count', async () => {
    const { probe, now } = fakeProbe((g, turn) => {
      allIn(g);
      // a mesh not ready again at turn 3 (a material rebuilt)
      g.shaders = turn !== 3;
    });
    const r = await runMapGate(probe, () => {}, MAP_READY_CAP_MS, STEPS, now);
    expect(r.status).toBe('ready');
    expect(r.ms).toBe((4 + WARM_FRAMES) * 100);
  });

  it('a hidden tab (ticks with no frame) never counts warm frames', async () => {
    const { probe, now } = fakeProbe((g) => allIn(g), { rendered: false });
    const r = await runMapGate(probe, () => {}, 5_000, STEPS, now);
    expect(r).toMatchObject({ status: 'cap', capStep: 'warm' });
  });

  it('past the cap returns cap with the step it was on', async () => {
    const { probe, now } = fakeProbe((g) => {
      g.bakeLive = g.quality = g.content = g.bodies = true;
    });
    const r = await runMapGate(probe, () => {}, 20_000, STEPS, now);
    expect(r).toMatchObject({ status: 'cap', capStep: 'shaders' });
    expect(r.ms).toBeGreaterThan(20_000);
    expect(r.ms).toBeLessThanOrEqual(20_100);
  });

  it('the cap never cuts bake-live: it waits for the live lamps, then returns cap at once', async () => {
    const { probe, now } = fakeProbe((g, turn) => {
      // the live section's lamps land at 30 s (a cold bake with no shipped data, A3)
      g.bakeLive = turn >= 300;
      g.quality = g.content = true;
    });
    const r = await runMapGate(probe, () => {}, 20_000, STEPS, now);
    expect(r).toMatchObject({ status: 'cap', capStep: 'bodies' });
    expect(r.ms).toBe(30_000);
  });

  it('closed: the state went away', async () => {
    const { probe, now } = fakeProbe(() => {}, { closedAt: 3 });
    expect(await runMapGate(probe, () => {}, MAP_READY_CAP_MS, STEPS, now)).toMatchObject({ status: 'closed', capStep: '' });
  });

  it('a probe that throws resolves error (the boot screen never strands); so does a throwing report', async () => {
    const a = fakeProbe((_g, turn) => {
      if (turn === 2) throw new Error('isReady blew up');
    });
    await expect(runMapGate(a.probe, () => {}, MAP_READY_CAP_MS, STEPS, a.now)).resolves.toMatchObject({ status: 'error' });
    const b = fakeProbe(() => {});
    await expect(
      runMapGate(b.probe, () => {
        throw new Error('no boot element');
      }, MAP_READY_CAP_MS, STEPS, b.now),
    ).resolves.toMatchObject({ status: 'error' });
    const c: MapGateProbe = { read: () => {}, tick: () => Promise.reject(new Error('scene gone')), closed: () => false, describe: () => '' };
    await expect(runMapGate(c, () => {}, MAP_READY_CAP_MS)).resolves.toMatchObject({ status: 'error' });
  });

  it('a custom steps list runs to its own end (S5 peers after warm)', async () => {
    const steps: MapStep[] = [...STEPS, 'peers'];
    const { probe, now } = fakeProbe((g, turn) => {
      allIn(g);
      g.peers = turn >= 10;
    });
    const lines: string[] = [];
    const r = await runMapGate(probe, (_p, s) => void lines.push(s), MAP_READY_CAP_MS, steps, now);
    expect(r.status).toBe('ready');
    expect(r.ms).toBe(1000);
    expect(lines).toContain('Waiting for partner');
  });
});
