import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BG_EXTERNAL_HOLD_MS, BG_TICK_MAX_S, bgStepSeconds, type BgTickInput } from '../src/core/bgTick';
import { GameLoop } from '../src/core/loop';
import type { Engine } from '../src/core/babylon';
import { OBJ_CONNECTING, OBJ_STALL_S, OBJ_WAITING, isNetNotice, objectiveOnSnap, objectiveOnStall, showMirrorLine, type MirrorLines } from '../src/net/objectiveMirror';

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

// (hud-guidance B3, HG9) the connection notices are net status, never the objective
/** The two HUD lines as `Hud` keeps them: the objective pops up only on a real change to a non-empty line (B1, A4). */
class FakeLines implements MirrorLines {
  net = '';
  obj = '';
  pops = 0;
  setNetStatus(t: string): void {
    this.net = t;
  }
  setObjective(t: string): void {
    if (t === this.obj) return;
    this.obj = t;
    if (t) this.pops++;
  }
}

/** The client's flow (coopClient: the attach clear, then every line through `showLine` -> `showMirrorLine`). */
function joiningClient(): { hud: FakeLines; snap(hostObj: string): void; stall(sinceSnap: number): void } {
  const hud = new FakeLines();
  let shown = OBJ_CONNECTING;
  const show = (t: string): void => {
    shown = t;
    showMirrorLine(hud, t);
  };
  hud.setObjective('');
  show(shown);
  return {
    hud,
    snap: (hostObj) => {
      const t = objectiveOnSnap(shown, hostObj);
      if (t !== null) show(t);
    },
    stall: (sinceSnap) => {
      const t = objectiveOnStall(shown, true, sinceSnap);
      if (t !== null) show(t);
    },
  };
}

describe('the net-status line (hud-guidance B3, HG9)', () => {
  it('isNetNotice: the two notices only', () => {
    expect(isNetNotice(OBJ_CONNECTING)).toBe(true);
    expect(isNetNotice(OBJ_WAITING)).toBe(true);
    for (const t of ['', 'Reach the vault', 'Connecting to host', 'Free roam - explore with every weapon']) expect(isNetNotice(t)).toBe(false);
  });
  it('a notice goes to the net-status line and leaves the objective alone', () => {
    const hud = new FakeLines();
    hud.obj = 'Reach the vault';
    expect(showMirrorLine(hud, OBJ_WAITING)).toBe(false);
    expect(hud.net).toBe(OBJ_WAITING);
    expect(hud.obj).toBe('Reach the vault');
  });
  it('a host objective clears the notice, then goes to the objective line', () => {
    const hud = new FakeLines();
    hud.net = OBJ_CONNECTING;
    expect(showMirrorLine(hud, 'Reach the vault')).toBe(true);
    expect(hud.net).toBe('');
    expect(hud.obj).toBe('Reach the vault');
  });
  it('joining: the notice on its own line until the first snapshot, then the host objective pops up', () => {
    const c = joiningClient();
    expect(c.hud.net).toBe(OBJ_CONNECTING);
    expect(c.hud.obj).toBe('');
    expect(c.hud.pops).toBe(0);
    c.snap('Reach the vault');
    expect(c.hud.net).toBe('');
    expect(c.hud.obj).toBe('Reach the vault');
    expect(c.hud.pops).toBe(1);
  });
  it('a stalled host: the waiting notice on its line, the objective keeps its text; no new pop-up on the same one', () => {
    const c = joiningClient();
    c.snap('Reach the vault');
    c.stall(OBJ_STALL_S);
    expect(c.hud.net).toBe(OBJ_WAITING);
    expect(c.hud.obj).toBe('Reach the vault');
    c.snap('Reach the vault');
    expect(c.hud.net).toBe('');
    expect(c.hud.obj).toBe('Reach the vault');
    expect(c.hud.pops).toBe(1);
    c.stall(OBJ_STALL_S);
    c.snap('Open the safe');
    expect(c.hud.net).toBe('');
    expect(c.hud.obj).toBe('Open the safe');
    expect(c.hud.pops).toBe(2);
  });
  it('an empty host objective (course mode) clears the notice and leaves the line empty', () => {
    const c = joiningClient();
    c.snap('');
    expect(c.hud.net).toBe('');
    expect(c.hud.obj).toBe('');
    expect(c.hud.pops).toBe(0);
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
  it('(hud-guidance B3) the client writes both lines only through showLine, after one clear at attach', () => {
    const src = readFileSync('src/net/coopClient.ts', 'utf8');
    expect(src.match(/\.setObjective\(/g) ?? []).toEqual(['.setObjective(']);
    expect(src).toMatch(/g\.hud\.setObjective\(''\);\r?\n\s*this\.showLine\(this\.obj\);/);
    expect(src).not.toMatch(/setNetStatus\(/);
    expect(src.match(/showMirrorLine\(/g) ?? []).toHaveLength(1);
  });
});
