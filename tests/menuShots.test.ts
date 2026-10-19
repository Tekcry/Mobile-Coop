import { describe, expect, it } from 'vitest';
import { CUT_S, IGNITE, IGNITE_S, SHOTS, XFADE_S, createDirector, easeInOut, goggleLevel, igniteGlow, igniteLit, parseShotHooks, type ShotDef } from '../src/world/menuShots';

const DT = 1 / 60;

/** The ids of the first n main shots for a seed. */
function sequence(seed: number, n: number): string[] {
  const d = createDirector({ seed, reducedMotion: false, context: 'main' });
  const out = [d.shot.id];
  let last = d.changes;
  for (let i = 0; out.length < n && i < 1e6; i++) {
    d.update(0.1);
    if (d.changes !== last) {
      last = d.changes;
      out.push(d.shot.id);
    }
  }
  return out;
}

describe('menu shot director', () => {
  it('is deterministic for a seed', () => {
    expect(sequence(42, 20)).toEqual(sequence(42, 20));
    expect(sequence(1, 30).join()).not.toEqual(sequence(2, 30).join());
  });

  it('starts on T2 (the title carried on) and never repeats a shot immediately (50 shots)', () => {
    for (const seed of [1, 7, 99]) {
      const s = sequence(seed, 50);
      expect(s[0]).toBe('T2');
      expect(s.slice(1)).not.toContain('T2');
      for (let i = 1; i < s.length; i++) expect(s[i]).not.toBe(s[i - 1]);
      expect(new Set(s)).toEqual(new Set(['T2', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'W1', 'W2']));
    }
  });

  it('keeps durations within 10-16 s', () => {
    for (const s of SHOTS) expect(s.durS >= 10 && s.durS <= 16).toBe(true);
  });

  it('crossfades through black inside the window when the light stays the same', () => {
    const a: ShotDef = { id: 'A', setup: 'a', durS: 10, move: { kind: 'static', amount: 0 }, light: 'w', contexts: ['main'], solo: true };
    const b: ShotDef = { ...a, id: 'B', setup: 'b' };
    const d = createDirector({ shots: [{ ...a, id: 'H1' }, b], seed: 3, reducedMotion: false, context: 'main' });
    d.update(10 - XFADE_S / 2 - 0.1);
    expect(d.fade).toBe(0);
    d.update(0.1 + XFADE_S / 4);
    expect(d.fade).toBeCloseTo(0.5, 1);
    expect(d.shot.id).toBe('H1');
    d.update(XFADE_S / 4 + 0.01);
    expect(d.shot.id).toBe('B');
    expect(d.fade).toBeGreaterThan(0.9);
    d.update(XFADE_S / 4);
    expect(d.fade).toBeCloseTo(0.5, 1);
    d.update(XFADE_S / 2);
    expect(d.fade).toBe(0);
  });

  it('cuts to black for 0.4 s when the light differs', () => {
    const a: ShotDef = { id: 'H1', setup: 'a', durS: 10, move: { kind: 'static', amount: 0 }, light: 'warm', contexts: ['main'], solo: true };
    const d = createDirector({ shots: [a, { ...a, id: 'B', light: 'cold' }, { ...a, id: 'C' }], seed: 5, reducedMotion: false, context: 'main' });
    // run to the first change between shots whose light differs
    let guard = 0;
    while (guard++ < 1e5) {
      const cut = d.shot.light !== d.next.light;
      if (cut) break;
      d.update(0.25);
    }
    const from = d.shot.id;
    const left = d.shot.durS * (1 - d.t);
    d.update(left - 0.05);
    expect(d.fade).toBe(0);
    d.update(0.1);
    expect(d.fade).toBe(1);
    expect(d.shot.id).toBe(from);
    d.update(CUT_S - 0.01);
    expect(d.fade).toBe(1);
    d.update(0.07);
    expect(d.shot.id).not.toBe(from);
    expect(d.fade).toBe(0);
  });

  it('reduced motion holds T2 static', () => {
    const d = createDirector({ seed: 1, reducedMotion: true, context: 'main' });
    for (let i = 0; i < 5000; i++) d.update(0.1);
    expect(d.shot.id).toBe('T2');
    expect(d.t).toBe(0);
    expect(d.fade).toBe(0);
    expect(d.changes).toBe(0);
  });

  it('holds one shot per sub-context and resumes the main cycle', () => {
    const d = createDirector({ seed: 1, reducedMotion: false, context: 'title' });
    expect(d.shot.id).toBe('T1');
    for (let i = 0; i < 600; i++) d.update(0.1);
    expect(d.shot.id).toBe('T1');
    expect(d.changes).toBe(0);
    // (menu-notes slice 4a) the title waits in the dark on its first frame
    expect(d.t).toBe(0);
    expect(d.titlePhase).toBe('dark');
    d.setContext('main');
    d.update(5);
    const mid = d.shot.id;
    d.setContext('loadout');
    expect(d.shot.id).toBe('S6');
    d.setContext('lobby');
    expect(d.shot.id).toBe('S7');
    d.setContext('main');
    expect(d.shot.id).toBe(mid);
  });

  // (menu-notes slice 4a, Michael's M1) full darkness until the press, then the goggle strikes in the dark on T1
  describe('the dark title and the goggle strike', () => {
    it('is black until the press: no light, no goggle, T1 on its first frame', () => {
      const d = createDirector({ seed: 1, reducedMotion: false, context: 'main' });
      d.setContext('title');
      for (let i = 0; i < 1200; i++) {
        d.update(DT * 10);
        expect(d.titlePhase).toBe('dark');
        expect(d.shot.id).toBe('T1');
        expect(d.lit).toBe(0);
        expect(d.glow).toBe(0);
        expect(d.t).toBe(0);
        expect(d.fade).toBe(0);
      }
    });

    it('the press flickers the goggle on in the dark, then the lights come up, then T2 opens the main menu', () => {
      const d = createDirector({ seed: 1, reducedMotion: false, context: 'title' });
      d.update(3);
      d.setContext('main');
      expect(d.titlePhase).toBe('ignite');
      let blips = 0;
      let prev = 0;
      let maxLitInFlicker = 0;
      let t = 0;
      while (t < IGNITE.flickerS + IGNITE.holdS - 0.02) {
        d.update(DT);
        t += DT;
        d.setContext('main');
        expect(d.shot.id).toBe('T1');
        expect(d.context).toBe('title');
        if (d.glow > 0.3 && prev <= 0.3) blips++;
        prev = d.glow;
        maxLitInFlicker = Math.max(maxLitInFlicker, d.lit);
      }
      // a flicker (several strikes), not a fade; the key and rims stay off through it
      expect(blips).toBeGreaterThanOrEqual(3);
      expect(maxLitInFlicker).toBe(0);
      expect(d.glow).toBe(1);
      // the lights rise
      d.update(IGNITE.riseS / 2);
      expect(d.lit).toBeGreaterThan(0.3);
      expect(d.lit).toBeLessThan(0.7);
      expect(d.t).toBeGreaterThan(0);
      const n = d.changes;
      d.update(IGNITE.riseS / 2 + 0.05);
      expect(d.titlePhase).toBe('done');
      expect(d.lit).toBe(1);
      expect(d.glow).toBe(-1);
      expect(d.shot.id).toBe('T2');
      expect(d.context).toBe('main');
      expect(d.changes).toBe(n + 1);
      expect(d.fade).toBe(0);
    });

    it('takes the whole strike in about 5 s and reads as pure levels', () => {
      expect(IGNITE_S).toBeGreaterThan(3);
      expect(IGNITE_S).toBeLessThan(6);
      expect(igniteGlow(0)).toBe(0);
      expect(igniteGlow(IGNITE.flickerS)).toBe(1);
      expect(igniteLit(IGNITE.flickerS + IGNITE.holdS)).toBe(0);
      expect(igniteLit(IGNITE_S)).toBe(1);
    });

    it('plays only with the title: no title (after a match, automation) is lit from the start', () => {
      const d = createDirector({ seed: 1, reducedMotion: false, context: 'main' });
      for (let i = 0; i < 100; i++) d.update(0.1);
      expect(d.titlePhase).toBe('none');
      expect(d.lit).toBe(1);
      expect(d.glow).toBe(-1);
    });

    it('reduced motion: dark until the press, then the lights straight up (no flicker)', () => {
      const d = createDirector({ seed: 1, reducedMotion: true, context: 'title' });
      d.update(1);
      expect(d.lit).toBe(0);
      d.setContext('main');
      d.update(DT);
      expect(d.titlePhase).toBe('done');
      expect(d.lit).toBe(1);
      expect(d.shot.id).toBe('T2');
    });

    it('another screen during the strike ends it at once', () => {
      const d = createDirector({ seed: 1, reducedMotion: false, context: 'title' });
      d.setContext('main');
      d.update(0.5);
      d.setContext('loadout');
      expect(d.titlePhase).toBe('done');
      expect(d.lit).toBe(1);
      expect(d.shot.id).toBe('S6');
    });
  });

  it('forces a shot with ?menuShot and runs fast with ?menuClock=fast', () => {
    const d = createDirector({ seed: 1, reducedMotion: false, context: 'main', force: 'H3' });
    for (let i = 0; i < 1000; i++) d.update(0.1);
    expect(d.shot.id).toBe('H3');
    expect(parseShotHooks('?menuShot=S2&menuClock=fast')).toEqual({ force: 'S2', clock: 8, freezeT: null });
    expect(parseShotHooks('')).toEqual({ force: null, clock: 1, freezeT: null });
    expect(parseShotHooks('?menuShot=H1&menuT=0.7').freezeT).toBe(0.7);
    const f = createDirector({ seed: 1, reducedMotion: false, context: 'main', force: 'H1', freezeT: 0.7 });
    for (let i = 0; i < 100; i++) f.update(0.5);
    expect(f.t).toBe(0.7);
  });

  it('does not allocate in update', () => {
    const d = createDirector({ seed: 9, reducedMotion: false, context: 'main' });
    for (let i = 0; i < 1e5; i++) d.update(DT);
    const gc = (globalThis as { gc?: () => void }).gc;
    gc?.();
    // the least growth over three runs (a GC between samples can only lower a run, never fake a pass for a real leak:
    // 1e6 updates allocating even 16 bytes each would grow 16 MB)
    let grew = Infinity;
    for (let r = 0; r < 3; r++) {
      const before = process.memoryUsage().heapUsed;
      for (let i = 0; i < 1e6; i++) d.update(DT);
      grew = Math.min(grew, process.memoryUsage().heapUsed - before);
    }
    expect(grew).toBeLessThan(2 * 1024 * 1024);
  });
});

describe('menu hero shots', () => {
  it('every director shot but the stage has a hero shot, and the idle sway stays small', async () => {
    const { HERO_SHOTS, idleSway } = await import('../src/world/menuSets');
    const ids = new Set(HERO_SHOTS.map((h) => h.id));
    for (const s of SHOTS) if (s.setup !== 'stage') expect(ids.has(s.setup)).toBe(true);
    for (let t = 0; t < 100; t += 0.37) expect(Math.abs(idleSway(t))).toBeLessThan(0.04);
  });
});

describe('menu shot passes', () => {
  it('plays every main shot once per round (a deck), never the same twice in a row', () => {
    // (menu-notes slice 3: W1 / W2 joined, n = 8)
    const n = SHOTS.filter((x) => x.contexts.includes('main') && !x.intro).length;
    expect(n).toBe(8);
    const s = sequence(11, 1 + n * 8).slice(1);
    // a round is the shot carried over plus n - 1 new ones: windows of n starting every (n - 1)th shot hold no repeat
    expect(new Set(s.slice(0, n)).size).toBe(n);
    for (let r = 0; r < 7; r++) expect(new Set(s.slice(n - 1 + r * (n - 1), n - 1 + r * (n - 1) + n)).size).toBe(n);
  });

  it('the equipment shots use at least four kinds of pass', () => {
    const main = SHOTS.filter((s) => s.contexts.includes('main'));
    expect(new Set(main.filter((s) => !s.intro).map((s) => s.move.kind)).size).toBeGreaterThanOrEqual(4);
  });

  it('eases in and out', () => {
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(2)).toBe(1);
    expect(easeInOut(0.1)).toBeLessThan(0.1);
  });

  it('powers the goggle on: off, a flickering ramp, then full', () => {
    expect(goggleLevel(0.1, 0.3, 0.5)).toBe(0);
    expect(goggleLevel(0.6, 0.3, 0.5)).toBe(1);
    let prevOn = 0;
    let dips = 0;
    for (let t = 0.3; t < 0.5; t += 0.001) {
      const k = goggleLevel(t, 0.3, 0.5);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(1);
      if (k < prevOn - 0.05) dips++;
      prevOn = k;
    }
    expect(dips).toBeGreaterThan(0);
  });

  it('hero shots: a real pass each, several lenses, no equipment shot straight on', async () => {
    const { HERO_SHOTS } = await import('../src/world/menuSets');
    const fovs = new Set<number>();
    for (const h of HERO_SHOTS) {
      fovs.add(Math.round(h.fov * 100));
      const moved = Math.abs(h.to.alpha - h.from.alpha) + Math.abs(h.to.beta - h.from.beta) + Math.abs(h.to.radius - h.from.radius) + Math.abs(h.to.target[1] - h.from.target[1]) + Math.abs(h.to.target[0] - h.from.target[0]);
      expect(moved).toBeGreaterThan(0.05);
    }
    expect(fovs.size).toBeGreaterThanOrEqual(3);
    for (const h of HERO_SHOTS) if (h.id.startsWith('H')) expect(Math.min(Math.abs(h.from.alpha), Math.abs(h.to.alpha))).toBeGreaterThan(0.3);
  });
});
