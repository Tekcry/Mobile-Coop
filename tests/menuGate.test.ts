import { describe, expect, it } from 'vitest';
import { GATE_LIMITS, GATE_LIMITS_AUTOMATION, gateInput, gateLimits, gateStep, runGate, WARM_FRAMES, type GateInput, type GateProbe } from '../src/world/menuGate';
import { LOD_0, LOD_2, LOD_HERO } from '../src/operators/runtime/manifest';
import { pickLod } from '../src/operators/runtime/lodPick';

describe('menu load screen gate (menu-notes note 2)', () => {
  it('waits for Wren, the weapons, the shaders and the warm-up frames, in order', () => {
    const g = gateInput();
    g.closeUp = LOD_HERO;
    expect(gateStep(g).step).toBe('wren');
    // LOD2 and LOD0 in (the progressive chain): still waiting for the hero
    g.loaded = (1 << LOD_2) | (1 << LOD_0);
    expect(gateStep(g)).toMatchObject({ step: 'wren', text: 'Loading Wren…' });
    g.loaded |= 1 << LOD_HERO;
    // the chain (LOD1 parse, offline cache) still running: nothing is parsed after the reveal
    expect(gateStep(g).step).toBe('wren');
    g.chainDone = true;
    expect(gateStep(g)).toMatchObject({ step: 'weapons', text: 'Loading weapons…' });
    g.weaponsPending = false;
    expect(gateStep(g)).toMatchObject({ step: 'shaders', text: 'Preparing shaders…' });
    g.drawReady = true;
    // the hero must be the LOD drawn, not only loaded
    expect(gateStep(g).step).toBe('shaders');
    g.onScreen = true;
    expect(gateStep(g).step).toBe('warm');
    g.warmFrames = WARM_FRAMES - 1;
    expect(gateStep(g).step).toBe('warm');
    g.warmFrames = WARM_FRAMES;
    expect(gateStep(g)).toEqual({ step: 'ready', progress: 1, text: 'Ready' });
  });

  it('progress only rises through the steps', () => {
    const g = gateInput();
    g.closeUp = LOD_HERO;
    const seq: number[] = [];
    const push = (): void => void seq.push(gateStep(g).progress);
    push();
    g.loaded = 1 << LOD_2;
    push();
    g.loaded |= 1 << LOD_0;
    push();
    g.loaded |= 1 << LOD_HERO;
    push();
    g.chainDone = true;
    push();
    g.weaponsPending = false;
    push();
    g.drawReady = true;
    g.onScreen = true;
    push();
    for (let i = 1; i <= WARM_FRAMES; i++) {
      g.warmFrames = i;
      push();
    }
    for (let i = 1; i < seq.length; i++) expect(seq[i]!).toBeGreaterThanOrEqual(seq[i - 1]!);
    expect(seq.at(-1)).toBe(1);
  });

  it('a failed hero load does not strand the load screen (the lower LOD stays on screen)', () => {
    const g = gateInput();
    g.closeUp = LOD_HERO;
    g.loaded = (1 << LOD_2) | (1 << LOD_0);
    g.closeUpFailed = true;
    g.chainDone = true;
    g.weaponsPending = false;
    g.drawReady = true;
    g.warmFrames = WARM_FRAMES;
    expect(gateStep(g).step).toBe('ready');
  });

  it('`?gfx=min` waits for LOD2 only', () => {
    const g = gateInput();
    g.closeUp = LOD_2;
    g.loaded = 1 << LOD_2;
    g.chainDone = true;
    expect(gateStep(g).step).toBe('weapons');
  });
});

/** A fake menu for `runGate`: a fake clock moved by each tick, `fill` sets the input per turn. */
function fakeProbe(fill: (g: GateInput, turn: number) => number, tickMs = 100): { probe: GateProbe; now: () => number } {
  let t = 0;
  let turn = 0;
  return {
    now: () => t,
    probe: {
      read: (g) => fill(g, turn++),
      tick: async () => {
        t += tickMs;
        return true;
      },
      closed: () => false,
      describe: () => 'fake',
    },
  };
}

function readyAll(g: GateInput): void {
  g.closeUp = LOD_HERO;
  g.loaded = (1 << LOD_HERO) | (1 << LOD_0) | (1 << LOD_2);
  g.chainDone = true;
  g.weaponsPending = false;
  g.onScreen = true;
  g.drawReady = true;
}

describe('runGate: the load screen always ends', () => {
  it('reaches ready after the warm-up frames', async () => {
    const { probe, now } = fakeProbe((g) => (readyAll(g), 0));
    const lines: string[] = [];
    expect(await runGate(probe, (_p, s) => void lines.push(s), GATE_LIMITS, now)).toBe('ready');
    expect(lines.at(-1)).toBe('Ready');
  });

  it('a check that throws resolves with the error (the menu is revealed, never a stranded boot screen)', async () => {
    const { probe, now } = fakeProbe((_g, turn) => {
      if (turn === 3) throw new Error('isReady blew up');
      return 0;
    });
    await expect(runGate(probe, () => {}, GATE_LIMITS, now)).resolves.toBe('error: isReady blew up');
    // a throwing status report too
    const b = fakeProbe(() => 0);
    await expect(runGate(b.probe, () => { throw new Error('no boot element'); }, GATE_LIMITS, b.now)).resolves.toBe('error: no boot element');
  });

  it('keeps waiting while bytes arrive, shows the megabytes, and gives up after a stall', async () => {
    // 1 MB per 100 ms tick for 40 s (past the 12 s stall), then nothing
    const lines: string[] = [];
    const { probe, now } = fakeProbe((g, turn) => {
      g.closeUp = LOD_HERO;
      g.loaded = 1 << LOD_2;
      return Math.min(turn, 400) * 1e6;
    });
    const why = await runGate(probe, (_p, s) => void lines.push(s), GATE_LIMITS, now);
    expect(why).toMatch(/^timeout: wren, no progress for 12 s/);
    // it ran past 40 s of downloading (no fixed 20 s cap) and ended about 12 s after the last byte
    expect(now()).toBeGreaterThan(40000 + 12000);
    expect(now()).toBeLessThan(40000 + 12000 + 500);
    expect(lines).toContain('Loading Wren… 34 MB');
  });

  it('a download that never stops ends at the hard cap', async () => {
    const { probe, now } = fakeProbe((_g, turn) => turn * 1e5, 1000);
    expect(await runGate(probe, () => {}, GATE_LIMITS, now)).toMatch(/^timeout: wren, cap of 120 s/);
  });

  it('automation: a 12 s cap that reads as the cap; `?bootCap=` overrides it', async () => {
    const { probe, now } = fakeProbe(() => 0);
    expect(await runGate(probe, () => {}, GATE_LIMITS_AUTOMATION, now)).toMatch(/^timeout: wren, cap of 12 s/);
    expect(gateLimits('', true)).toEqual(GATE_LIMITS_AUTOMATION);
    expect(gateLimits('', false)).toEqual(GATE_LIMITS);
    expect(gateLimits('?title=1&bootCap=60&gfx=high', true)).toEqual({ stallMs: 12000, capMs: 60000 });
    expect(gateLimits('?bootCap=abc', true)).toEqual(GATE_LIMITS_AUTOMATION);
    expect(gateLimits('?bootCap=1', false)).toEqual(GATE_LIMITS);
  });
});

describe('menu close-ups draw the hero (menu-notes note 4)', () => {
  it('a close-up camera draws the hero at any distance once it is loaded, whatever else is loaded', () => {
    const all = (1 << LOD_HERO) | (1 << LOD_0) | (1 << 2) | (1 << LOD_2);
    for (const cur of [-1, LOD_HERO, LOD_0, 2, LOD_2]) for (const d of [0.5, 3, 30, 200]) expect(pickLod(cur, d, true, all)).toBe(LOD_HERO);
    // before the hero is in: LOD0 (or what is loaded) stands in; the load screen covers this
    expect(pickLod(-1, 1, true, 1 << LOD_2)).toBe(LOD_2);
    expect(pickLod(LOD_2, 1, true, (1 << LOD_2) | (1 << LOD_0))).toBe(LOD_0);
  });
});
