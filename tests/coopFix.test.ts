import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BG_EXTERNAL_HOLD_MS, BG_TICK_MAX_S, bgStepSeconds, type BgTickInput } from '../src/core/bgTick';
import { GameLoop } from '../src/core/loop';
import type { Engine } from '../src/core/babylon';
import { OBJ_CONNECTING, OBJ_STALL_S, OBJ_WAITING, objectiveOnSnap, objectiveOnStall } from '../src/net/objectiveMirror';

// (coop-fix) the hidden-page tick (bug 1: a covered host window stopped sending snapshots) and the client's
// objective mirror (bug 2: "Connecting to host" never cleared in course mode)

const base = (o: Partial<BgTickInput> = {}): BgTickInput => ({ enabled: true, hidden: true, manual: false, sinceExternalMs: Infinity, elapsedMs: 33, ...o });

describe('bgStepSeconds (hidden-page co-op tick)', () => {
  it('a hidden page in a co-op match steps the elapsed time', () => {
    expect(bgStepSeconds(base())).toBeCloseTo(0.033, 6);
  });
  it('caps a long gap at the frame cap', () => {
    expect(bgStepSeconds(base({ elapsedMs: 5000 }))).toBe(BG_TICK_MAX_S);
  });
  it('a visible page never steps from the tick (rAF runs it: no double speed)', () => {
    expect(bgStepSeconds(base({ hidden: false }))).toBe(0);
  });
  it('outside co-op (not enabled) never steps', () => {
    expect(bgStepSeconds(base({ enabled: false }))).toBe(0);
  });
  it('manual mode and a recent external driver (the e2e pumps) own the sim', () => {
    expect(bgStepSeconds(base({ manual: true }))).toBe(0);
    expect(bgStepSeconds(base({ sinceExternalMs: 40 }))).toBe(0);
    expect(bgStepSeconds(base({ sinceExternalMs: BG_EXTERNAL_HOLD_MS + 1 }))).toBeCloseTo(0.033, 6);
  });
  it('no time, no step', () => {
    expect(bgStepSeconds(base({ elapsedMs: 0 }))).toBe(0);
    expect(bgStepSeconds(base({ elapsedMs: -5 }))).toBe(0);
    expect(bgStepSeconds(base({ elapsedMs: NaN }))).toBe(0);
  });
});

describe('GameLoop.holdBackgroundTicks', () => {
  it('counts holders: the next match can take it before the last one releases it', () => {
    const loop = new GameLoop({} as Engine);
    const on = (): boolean => (loop as unknown as { bgIn: BgTickInput }).bgIn.enabled;
    expect(on()).toBe(false);
    const a = loop.holdBackgroundTicks();
    const b = loop.holdBackgroundTicks();
    a();
    a();
    expect(on()).toBe(true);
    b();
    expect(on()).toBe(false);
  });
});

describe('the client objective mirror', () => {
  it('the first snapshot replaces the placeholder, an empty host objective (course mode) included', () => {
    expect(objectiveOnSnap(OBJ_CONNECTING, '')).toBe('');
    expect(objectiveOnSnap(OBJ_CONNECTING, 'Reach the vault')).toBe('Reach the vault');
  });
  it('an unchanged objective is left alone', () => {
    expect(objectiveOnSnap('Reach the vault', 'Reach the vault')).toBeNull();
    expect(objectiveOnSnap('', '')).toBeNull();
  });
  it('snapshots stopping shows the waiting notice once; the next snapshot restores the host objective', () => {
    expect(objectiveOnStall('', true, OBJ_STALL_S - 0.1)).toBeNull();
    expect(objectiveOnStall('', true, OBJ_STALL_S)).toBe(OBJ_WAITING);
    expect(objectiveOnStall(OBJ_WAITING, true, OBJ_STALL_S + 5)).toBeNull();
    expect(objectiveOnSnap(OBJ_WAITING, '')).toBe('');
  });
  it('before the first snapshot the connecting placeholder stays', () => {
    expect(objectiveOnStall(OBJ_CONNECTING, false, 30)).toBeNull();
  });
});

describe('wiring', () => {
  it('src/core never imports src/net; the co-op classes turn the tick on', () => {
    expect(readFileSync('src/core/loop.ts', 'utf8')).not.toMatch(/from '\.\.\/net\//);
    expect(readFileSync('src/core/bgTick.ts', 'utf8')).not.toMatch(/from '\.\.\//);
    for (const f of ['src/net/coopHost.ts', 'src/net/coopClient.ts']) expect(readFileSync(f, 'utf8')).toMatch(/this\.offs\.push\(keepSimInBackground\(g\)\)/);
  });
  it('the client seeds its mirror with the placeholder; the host seeds its copy from the HUD', () => {
    expect(readFileSync('src/net/coopClient.ts', 'utf8')).toMatch(/private obj = OBJ_CONNECTING;/);
    expect(readFileSync('src/net/coopHost.ts', 'utf8')).toMatch(/this\.obj = hud\.objectiveText;/);
  });
});
