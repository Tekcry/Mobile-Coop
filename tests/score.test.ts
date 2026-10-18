import { describe, expect, it } from 'vitest';
import { alertPlan, HITS, hookShot, lowPlan, melodyShot, menuPlan, missionPlans, type LayerDef } from '../src/audio/score/arrange';
import { awareness } from '../src/audio/score/game/adapter';
import { DEFAULT_TIMES, Director, type DirectorAction } from '../src/audio/score/director';
import { gatedDb, makeHit, pluck, spiccato } from '../src/audio/score/synth';
import { SKETCHES, SKETCH_A, SKETCH_B } from '../src/audio/score/themes';
import { bars, harmonyBelow, midi, noteName, phrase, voicing } from '../src/audio/score/theory';
import { Rng } from '../src/audio/music/rng';

const loopSec = (l: { bars: number; bpm: number }): number => (l.bars * 4 * 60) / l.bpm;

describe('score theory', () => {
  it('parses note names and phrases', () => {
    expect(midi('C4')).toBe(60);
    expect(midi('D4')).toBe(62);
    expect(midi('Ab3')).toBe(56);
    expect(midi('C#4')).toBe(61);
    expect(noteName(62)).toBe('D4');
    const p = phrase('D4:1.5 F4:1.5 A4:1 | -:4');
    expect(p.map((n) => n.n)).toEqual([62, 65, 69, null]);
    expect(bars(p).length).toBe(2);
    expect(() => bars(phrase('D4:3 F4:2'))).toThrow();
  });

  it('voices chords inside their range and finds a harmony note below', () => {
    const tn = midi('D2');
    const v = voicing(tn, { root: 8, tones: [0, 4, 7], bass: 0 }, tn - 12, tn + 17, 4);
    expect(v[0]! % 12).toBe(tn % 12); // slash chord: D in the bass
    for (const n of v) expect(n).toBeLessThanOrEqual(tn + 17);
    for (let i = 1; i < v.length; i++) expect(v[i]! - v[i - 1]!).toBeGreaterThanOrEqual(3);
    expect(harmonyBelow(tn, { root: 0, tones: [0, 3, 7] }, midi('A4'))).toBe(midi('F4'));
  });
});

describe('the two themes', () => {
  for (const sk of SKETCHES) {
    it(`${sk.id} ${sk.name}: 8 bars of 4/4, singable range, a tritone, a 2-bar hook`, () => {
      const b = bars(sk.theme);
      expect(b.length).toBe(8);
      const pitches = sk.theme.flatMap((n) => (n.n === null ? [] : [n.n]));
      const range = Math.max(...pitches) - Math.min(...pitches);
      expect(range).toBeLessThanOrEqual(13);
      // the tritone above the key note appears in the theme and in the hook
      const tri = (sk.tonic + 6) % 12;
      expect(pitches.some((n) => n % 12 === tri)).toBe(true);
      expect(sk.hook.some((n) => n !== null && n % 12 === tri)).toBe(true);
      // starts and ends on the key note
      expect(pitches[0]! % 12).toBe(sk.tonic % 12);
      expect(pitches[pitches.length - 1]! % 12).toBe(sk.tonic % 12);
      expect(sk.hook.length).toBe(16);
      expect(sk.chords.length).toBe(8);
      expect(sk.alertBpm).toBeCloseTo(sk.lowBpm * 1.5, 6);
    });
  }

  it('the two themes are different in rhythm, not just pitch', () => {
    const rhythm = (sk: typeof SKETCH_A): string => sk.theme.map((n) => n.d).join(' ');
    expect(rhythm(SKETCH_A)).not.toBe(rhythm(SKETCH_B));
  });
});

function allLayers(): LayerDef[] {
  return SKETCHES.flatMap((sk) => {
    const m = missionPlans(sk);
    return [...menuPlan(sk).layers, ...m.low.layers, ...m.alert.layers, m.stinger, m.stingerShort, melodyShot(sk), hookShot(sk)];
  });
}

describe('arrangements', () => {
  it('every loop is at least 60 s before it repeats', () => {
    for (const sk of SKETCHES) {
      expect(loopSec(menuPlan(sk))).toBeGreaterThanOrEqual(60);
      expect(loopSec(lowPlan(sk))).toBeGreaterThanOrEqual(60);
      expect(loopSec(alertPlan(sk))).toBeGreaterThanOrEqual(60);
    }
  });

  it('events are finite, inside their loop and use known voices', () => {
    for (const l of allLayers()) {
      const beats = l.bars * 4;
      expect(l.events.length, l.id).toBeGreaterThan(0);
      for (const e of l.events) {
        expect(Number.isFinite(e.at) && Number.isFinite(e.dur) && Number.isFinite(e.vel), l.id).toBe(true);
        expect(e.at, l.id).toBeGreaterThanOrEqual(0);
        if (l.group !== 'shot') expect(e.at, `${l.id} ${e.v}`).toBeLessThan(beats + 1e-9);
        expect(e.vel).toBeGreaterThan(0);
        expect(e.p).toBeGreaterThan(0);
      }
    }
  });

  it('is deterministic', () => {
    expect(JSON.stringify(lowPlan(SKETCH_A))).toBe(JSON.stringify(lowPlan(SKETCH_A)));
    expect(JSON.stringify(alertPlan(SKETCH_B))).toBe(JSON.stringify(alertPlan(SKETCH_B)));
  });

  it('Calm keeps its pitched notes low (out of the footstep and voice band), apart from faint high glints', () => {
    for (const sk of SKETCHES) {
      const calm = lowPlan(sk).layers.filter((l) => l.mix.calm > 0);
      for (const l of calm) {
        for (const e of l.events) {
          if (e.n === 0 || e.v === 'harm') continue;
          expect(e.n, `${l.id} ${e.v} ${noteName(e.n)}`).toBeLessThanOrEqual(midi('Ab3'));
        }
      }
    }
  });

  it('Calm is sparse: silent heartbeat bars and the theme only a few times per loop', () => {
    for (const sk of SKETCHES) {
      const low = lowPlan(sk);
      const pulse = low.layers.find((l) => l.id.endsWith('-pulse'))!;
      for (const bar of [7, 15, 23, 31]) expect(pulse.events.some((e) => e.at >= bar * 4 && e.at < bar * 4 + 4)).toBe(false);
      const frag = low.layers.find((l) => l.id.endsWith('-frag'))!;
      const barsUsed = new Set(frag.events.map((e) => Math.floor(e.at / 4)));
      expect(barsUsed.size).toBeLessThanOrEqual(4);
      // calm layers are the only ones heard in Calm, and the Cautious layers are silent there
      for (const l of low.layers) expect(l.mix.alert).toBe(0);
      expect(low.layers.filter((l) => l.mix.calm === 0).length).toBe(4);
    }
  });

  it('Evasion drops the brass and the theme but keeps the drive', () => {
    for (const sk of SKETCHES) {
      const a = alertPlan(sk);
      const mix = (s: string): number => a.layers.find((l) => l.id.endsWith(`-${s}`))!.mix.evade;
      expect(mix('brass')).toBe(0);
      expect(mix('lead')).toBe(0);
      expect(mix('drums')).toBeGreaterThan(0.5);
      expect(mix('hook')).toBeGreaterThan(0.5);
    }
  });

  it('the Alert loop and the menu state the full theme', () => {
    for (const sk of SKETCHES) {
      const notes = sk.theme.filter((n) => n.n !== null).length;
      const lead = alertPlan(sk).layers.find((l) => l.id.endsWith('-lead'))!;
      // three statements on the horn section (three copies are made at render time, not here)
      expect(lead.events.length).toBe(notes * 3);
      const menuLead = menuPlan(sk).layers.find((l) => l.id.endsWith('-lead'))!;
      expect(menuLead.events.length).toBe(notes * 3);
      // the menu's last statement is lifted
      const last = menuLead.events[menuLead.events.length - 1]!;
      expect(last.n % 12).toBe((sk.tonic + sk.lift) % 12);
    }
  });

  it('the stinger hits at once and its roll leads two beats into the Alert downbeat', () => {
    for (const sk of SKETCHES) {
      const s = missionPlans(sk).stinger;
      expect(s.events.some((e) => e.at === 0 && e.v === 'brass')).toBe(true);
      const roll = s.events.filter((e) => e.v === 'snare' || e.v === 'ghost');
      expect(Math.max(...roll.map((e) => e.at))).toBeLessThan(2);
      expect(Math.max(...roll.map((e) => e.at))).toBeGreaterThan(1.7);
      const short = missionPlans(sk).stingerShort;
      expect(short.events.some((e) => e.v === 'snare')).toBe(false);
    }
  });
});

describe('game adapter', () => {
  const g = (level: string, alive = true) => ({ alive, aware: { level } }) as Parameters<typeof awareness>[0] extends readonly (infer W)[] | undefined ? W : never;
  it('folds the guards into calm, caution and alert, ignoring the dead', () => {
    expect(awareness(undefined)).toBe('calm');
    expect(awareness([])).toBe('calm');
    expect(awareness([g('unaware'), g('cooldown')])).toBe('calm');
    expect(awareness([g('unaware'), g('suspicious')])).toBe('caution');
    expect(awareness([g('investigating')])).toBe('caution');
    expect(awareness([g('searching')])).toBe('caution');
    expect(awareness([g('suspicious'), g('alert')])).toBe('alert');
    expect(awareness([g('alert', false), g('unaware')])).toBe('calm');
  });
});

describe('director', () => {
  const run = (d: Director, steps: [number, 'calm' | 'caution' | 'alert'][]): DirectorAction[] => {
    const out: DirectorAction[] = [];
    for (const [t, g] of steps) out.push(...d.update(t, g));
    return out;
  };
  const tick = (d: Director, from: number, to: number, g: 'calm' | 'caution' | 'alert'): DirectorAction[] => {
    const out: DirectorAction[] = [];
    for (let t = from; t <= to + 1e-9; t += 0.05) out.push(...d.update(Math.round(t * 100) / 100, g));
    return out;
  };

  it('ignores a glance, then turns Cautious after the debounce', () => {
    const d = new Director();
    d.reset(0);
    expect(run(d, [[1, 'caution'], [1.4, 'calm'], [2, 'calm']])).toEqual([]);
    expect(d.music).toBe('calm');
    const acts = tick(d, 3, 4, 'caution');
    expect(acts).toEqual([{ kind: 'state', from: 'calm', to: 'caution' }]);
    expect(d.heldFor(4)).toBeLessThan(1 - DEFAULT_TIMES.cautionRise + 0.06);
  });

  it('goes to Alert at once with a full stinger and a restart; a second spotting soon after is short', () => {
    const d = new Director();
    d.reset(0);
    const a = d.update(5, 'alert');
    expect(a[0]).toEqual({ kind: 'stinger', short: false, restart: true });
    expect(d.music).toBe('alert');
    // drop out, ladder to Evasion, spotted again: short stinger, no restart
    tick(d, 5.05, 18.5, 'caution');
    expect(d.music).toBe('evade');
    const again = d.update(19, 'alert');
    expect(again[0]).toEqual({ kind: 'stinger', short: true, restart: false });
  });

  it('steps down one rung at a time with its holds: Alert, Evasion, Cautious, Calm', () => {
    const d = new Director();
    d.reset(0);
    d.update(0, 'alert');
    const acts = tick(d, 0.05, 60, 'calm').filter((a) => a.kind === 'state');
    expect(acts.map((a) => (a.kind === 'state' ? a.to : ''))).toEqual(['evade', 'caution', 'calm']);
    const times: number[] = [];
    const d2 = new Director();
    d2.reset(0);
    d2.update(0, 'alert');
    for (let t = 0.05; t <= 60; t += 0.05) {
      const tt = Math.round(t * 100) / 100;
      if (d2.update(tt, 'calm').length) times.push(tt);
    }
    // Alert holds 10 s; Evasion 12 s; Cautious 8 s (the game has long been calm)
    expect(times[0]).toBeCloseTo(DEFAULT_TIMES.alertHold, 1);
    expect(times[1]).toBeCloseTo(DEFAULT_TIMES.alertHold + DEFAULT_TIMES.evadeHold, 1);
    expect(times[2]).toBeCloseTo(DEFAULT_TIMES.alertHold + DEFAULT_TIMES.evadeHold + DEFAULT_TIMES.cautionHold, 1);
  });

  it('never leaves Alert while the game is still alert', () => {
    const d = new Director();
    d.reset(0);
    d.update(0, 'alert');
    expect(tick(d, 0.05, 120, 'alert')).toEqual([]);
    expect(d.music).toBe('alert');
  });
});

describe('score synthesis (pure)', () => {
  it('makes every hit finite, non-silent and within full scale', () => {
    for (const rate of [24000, 32000]) {
      for (const h of HITS) {
        const d = makeHit(h, rate, new Rng(3));
        // one expect per hit, not per sample (millions of expects timed out under load)
        let pk = 0;
        let finite = true;
        for (const x of d) {
          if (!Number.isFinite(x)) finite = false;
          pk = Math.max(pk, Math.abs(x));
        }
        expect(finite, h).toBe(true);
        expect(pk, h).toBeGreaterThan(0.2);
        expect(pk, h).toBeLessThanOrEqual(1);
      }
    }
  }, 20000); // one expect per sample: past 5 s when the full suite runs in parallel

  it('plucks the bass in tune', () => {
    const rate = 24000;
    const f = 73.42; // D2
    const d = pluck(rate, f, new Rng(1));
    // autocorrelation peak near the period, measured after the attack
    const from = Math.round(rate * 0.2);
    const n = Math.round(rate * 0.3);
    let best = 0;
    let bestLag = 0;
    for (let lag = Math.round(rate / 90); lag < Math.round(rate / 60); lag++) {
      let s = 0;
      for (let i = from; i < from + n; i++) s += d[i]! * d[i + lag]!;
      if (s > best) {
        best = s;
        bestLag = lag;
      }
    }
    expect(rate / bestLag).toBeGreaterThan(f * 0.985);
    expect(rate / bestLag).toBeLessThan(f * 1.015);
  });

  it('short string notes are finite and decay', () => {
    const d = spiccato(24000, 146.8, new Rng(2));
    const early = Math.max(...Array.from(d.subarray(0, 2400), Math.abs));
    const late = Math.max(...Array.from(d.subarray(d.length - 2400), Math.abs));
    expect(early).toBeGreaterThan(0.05);
    expect(late).toBeLessThan(early * 0.05);
  });

  it('gated loudness ignores silence', () => {
    const rate = 8000;
    // 1.2 s of tone (three whole 0.4 s blocks), then silence
    const on = Math.round(rate * 1.2);
    const tone = new Float32Array(rate * 4);
    for (let i = 0; i < on; i++) tone[i] = 0.5 * Math.sin((2 * Math.PI * 200 * i) / rate);
    const full = tone.slice(0, on);
    expect(gatedDb([tone], rate)).toBeCloseTo(gatedDb([full], rate), 0);
  });
});
