import { describe, expect, it } from 'vitest';
import index from '../src/assets/sfx/foley.json';
import { dedupe, fadeOut, layout, normalize, onsets, peakOf, splitHeelToe, trim } from '../src/audio/foley/render/process';
import { alignShift, firstAbove, FOLEY_BANKS, missingBanks, type FoleyIndex } from '../src/audio/foley/sprite';
import { FOLEY_MIX, FoleyPlanner, GAITS, gaitOf, MAX_LAYERS, newPlan, RUN_FROM, SUIT, SURFACES, TakePicker, VARY, type FoleyPlan, type Gait } from '../src/audio/foley/steps';
import { Rng } from '../src/audio/music/rng';
import type { Surface } from '../src/world/surfaces';

const RATE = 48000;
const INDEX = index as unknown as FoleyIndex;
const SURF: Surface[] = ['concrete', 'metal', 'grate', 'wood', 'gravel', 'carpet'];
const GAIT_LIST: Gait[] = ['crouch', 'walk', 'run', 'sprint'];

/** A decaying click at `t` s (a stand-in for a heel or toe transient). */
function click(buf: Float32Array, t: number, amp: number, hz = 900, decay = 0.02): void {
  const a = Math.round(t * RATE);
  for (let i = 0; a + i < buf.length && i < RATE * 0.1; i++) buf[a + i] = buf[a + i]! + amp * Math.sin((2 * Math.PI * hz * i) / RATE) * Math.exp(-i / (decay * RATE));
}

const sumGain = (p: FoleyPlan): number => {
  let s = 0;
  for (let i = 0; i < p.n; i++) s += p.layers[i]!.gain;
  return s;
};

describe('foley sprite index (the shipped foley.json)', () => {
  it('has every bank the recipes use, with sane takes inside the sprite', () => {
    expect(missingBanks(INDEX)).toEqual([]);
    for (const b of FOLEY_BANKS) {
      for (const [start, dur] of INDEX.banks[b]) {
        expect(start).toBeGreaterThanOrEqual(0);
        expect(dur).toBeGreaterThan(0.01);
        expect(start + dur).toBeLessThanOrEqual(INDEX.length + 1e-3);
      }
    }
    // several takes per step bank (variation), and the boot steps really split into heel and toe
    for (const b of ['concrete', 'gravel', 'board', 'bootHeel', 'bootToe'] as const) expect(INDEX.banks[b].length).toBeGreaterThanOrEqual(5);
    expect(INDEX.mark).toBeGreaterThan(0);
  });

  it('every surface recipe names existing banks', () => {
    for (const s of SURF) {
      const r = SURFACES[s];
      for (const b of [r.heel, r.toe, ...r.extras.map((e) => e.bank)]) expect(FOLEY_BANKS).toContain(b);
    }
  });
});

describe('sprite alignment', () => {
  it('finds the decoder shift from the first loud sample', () => {
    const buf = new Float32Array(RATE);
    click(buf, 0.1, 0.9);
    const idx = { ...INDEX, mark: firstAbove(buf, RATE) };
    expect(alignShift(buf, RATE, idx)).toBeCloseTo(0, 6);
    // a decoder that adds 1105 samples of delay
    const late = new Float32Array(RATE);
    late.set(buf.subarray(0, RATE - 1105), 1105);
    expect(alignShift(late, RATE, idx)).toBeCloseTo(1105 / RATE, 4);
    // silence (a failed decode) never moves the takes
    expect(alignShift(new Float32Array(100), RATE, idx)).toBe(0);
  });
});

describe('render: cutting the takes', () => {
  it('trims to the sound with a pre-roll and a clean fade', () => {
    const buf = new Float32Array(RATE);
    click(buf, 0.2, 0.5);
    const t = trim(buf, RATE, 0.15);
    expect(t.length / RATE).toBeLessThanOrEqual(0.15 + 1e-6);
    expect(t.length / RATE).toBeGreaterThan(0.05);
    // starts just before the click (2 ms pre-roll), ends at zero
    expect(Math.abs(t[0]!)).toBeLessThan(0.02);
    expect(Math.abs(t[t.length - 1]!)).toBeLessThan(1e-3);
  });

  it('splits a heel-toe step at the toe and leaves a single hit alone', () => {
    const step = new Float32Array(Math.round(RATE * 0.3));
    click(step, 0.005, 0.9, 300, 0.015);
    click(step, 0.085, 0.6, 1200, 0.01);
    expect(onsets(step, RATE).length).toBeGreaterThanOrEqual(2);
    const s = splitHeelToe(step, RATE);
    expect(s).not.toBeNull();
    expect(s!.heel.length / RATE).toBeCloseTo(0.082, 2);
    expect(peakOf(s!.toe)).toBeGreaterThan(0.4);
    const one = new Float32Array(Math.round(RATE * 0.3));
    click(one, 0.005, 0.9);
    expect(splitHeelToe(one, RATE)).toBeNull();
  });

  it('levels, fades, drops duplicates and lays out without overlap', () => {
    const a = new Float32Array(1000).fill(0.2);
    normalize(a, 0.9);
    expect(peakOf(a)).toBeCloseTo(0.9, 6);
    fadeOut(a, RATE, 0.005);
    expect(a[a.length - 1]).toBeCloseTo(0, 6);
    const b = Float32Array.from(a);
    const c = new Float32Array(500).fill(0.1);
    expect(dedupe([a, b, c]).length).toBe(2);
    const { buf, at } = layout([a, c], RATE, 0.1, 0.08);
    expect(at[0]![0]).toBeCloseTo(0.1, 4);
    expect(at[1]![0]).toBeGreaterThanOrEqual(at[0]![0] + at[0]![1] + 0.08 - 1e-4);
    expect(buf.length / RATE).toBeCloseTo(at[1]![0] + at[1]![1] + 0.08, 3);
  });
});

describe('take picker', () => {
  it('never repeats a take back to back and spreads picks over the bank', () => {
    const p = new TakePicker(5, new Rng(7));
    const seen = new Array<number>(5).fill(0);
    let last = -1;
    for (let i = 0; i < 2000; i++) {
      const k = p.next();
      expect(k).not.toBe(last);
      seen[k]!++;
      last = k;
    }
    for (const n of seen) expect(n).toBeGreaterThan(300);
  });

  it('keeps the last half of the bank out (5 takes: none of the last 2 again)', () => {
    const p = new TakePicker(5, new Rng(3));
    const h: number[] = [];
    for (let i = 0; i < 500; i++) h.push(p.next());
    for (let i = 2; i < h.length; i++) expect([h[i - 1], h[i - 2]]).not.toContain(h[i]);
  });

  it('copes with banks of one and two takes', () => {
    expect(new TakePicker(1, new Rng(1)).next()).toBe(0);
    const two = new TakePicker(2, new Rng(1));
    const seq = Array.from({ length: 6 }, () => two.next());
    expect(seq).toEqual([seq[0], 1 - seq[0]!, seq[0], 1 - seq[0]!, seq[0], 1 - seq[0]!]);
  });
});

describe('step planner', () => {
  it('reads the gait from pace, stance and sprint', () => {
    expect(gaitOf(1.2, false, false)).toBe('walk');
    expect(gaitOf(RUN_FROM, false, false)).toBe('run');
    expect(gaitOf(1, true, false)).toBe('crouch');
    expect(gaitOf(5, false, true)).toBe('sprint');
  });

  it('a step is a heel then a toe from the surface banks, within MAX_LAYERS', () => {
    const fp = new FoleyPlanner(INDEX, new Rng(11));
    const plan = newPlan();
    for (const s of SURF) {
      for (const g of GAIT_LIST) {
        for (let k = 0; k < 20; k++) {
          fp.step(plan, s, g, GAITS[g].top, k % 2 ? 1 : -1);
          expect(plan.n).toBeGreaterThanOrEqual(2);
          expect(plan.n).toBeLessThanOrEqual(MAX_LAYERS);
          const heel = plan.layers[0]!;
          const toe = plan.layers[1]!;
          expect(heel.bank).toBe(SURFACES[s].heel);
          expect(toe.bank).toBe(SURFACES[s].toe);
          expect(heel.at).toBe(0);
          expect(toe.at).toBeGreaterThanOrEqual(GAITS[g].gap[0]);
          expect(toe.at).toBeLessThanOrEqual(GAITS[g].gap[1]);
          for (let i = 0; i < plan.n; i++) {
            const L = plan.layers[i]!;
            expect(L.take).toBeLessThan(INDEX.banks[L.bank].length);
            expect(L.dur).toBeGreaterThan(0);
            expect(L.dur * L.rate).toBeLessThanOrEqual(INDEX.banks[L.bank][L.take]![1] - L.offset + 1e-9);
            expect(L.rate).toBeGreaterThan(0.9);
            expect(L.rate).toBeLessThan(1.12);
          }
        }
      }
    }
  });

  it('crouch < walk < run < sprint in level, and the heel-toe gap shrinks with pace', () => {
    const avg = (g: Gait): number => {
      const fp = new FoleyPlanner(INDEX, new Rng(5));
      const plan = newPlan();
      let s = 0;
      for (let i = 0; i < 400; i++) {
        fp.step(plan, 'concrete', g, GAITS[g].top, i % 2 ? 1 : -1);
        s += plan.layers[0]!.gain;
      }
      return s / 400;
    };
    const lv = GAIT_LIST.map(avg);
    for (let i = 1; i < lv.length; i++) expect(lv[i]!).toBeGreaterThan(lv[i - 1]!);
    for (let i = 1; i < GAIT_LIST.length; i++) expect(GAITS[GAIT_LIST[i]!].gap[1]).toBeLessThanOrEqual(GAITS[GAIT_LIST[i - 1]!].gap[0]);
    // a soft-soled crouch is low-passed, a run is not
    expect(GAITS.crouch.lowpass).toBeGreaterThan(0);
    expect(GAITS.run.lowpass).toBe(0);
  });

  it('every step varies: consecutive heels differ in take, rate or level', () => {
    const fp = new FoleyPlanner(INDEX, new Rng(9));
    const plan = newPlan();
    let prev = { take: -1, rate: 0, gain: 0 };
    const rates: number[] = [];
    for (let i = 0; i < 200; i++) {
      fp.step(plan, 'concrete', 'walk', 1.4, i % 2 ? 1 : -1);
      const h = plan.layers[0]!;
      expect(h.take).not.toBe(prev.take);
      rates.push(h.rate);
      prev = { take: h.take, rate: h.rate, gain: h.gain };
    }
    const spread = Math.max(...rates) - Math.min(...rates);
    expect(spread).toBeGreaterThan(VARY.rate);
    expect(spread).toBeLessThan(2 * (VARY.rate + VARY.footRate) * 1.1 + 0.01);
  });

  it('the two feet are pitched and panned a touch apart', () => {
    const fp = new FoleyPlanner(INDEX, new Rng(2));
    const plan = newPlan();
    let l = 0;
    let r = 0;
    for (let i = 0; i < 400; i++) {
      fp.step(plan, 'concrete', 'walk', 1.4, -1);
      l += plan.layers[0]!.rate;
      expect(plan.layers[0]!.pan).toBeLessThan(0);
      fp.step(plan, 'concrete', 'walk', 1.4, 1);
      r += plan.layers[0]!.rate;
      expect(plan.layers[0]!.pan).toBeGreaterThan(0);
    }
    expect(r / 400 - l / 400).toBeGreaterThan(VARY.footRate);
  });

  it('surfaces add their character layers (metal rings, grate rattles, gravel crunches over a thud)', () => {
    const fp = new FoleyPlanner(INDEX, new Rng(4));
    const banks = (s: Surface): string[] => {
      const p = fp.step(newPlan(), s, 'run', 3, 1);
      return p.layers.slice(0, p.n).map((l) => l.bank);
    };
    expect(banks('metal')).toContain('plate');
    expect(banks('grate')).toContain('tin');
    expect(banks('gravel')[0]).toBe('gravel');
    expect(banks('wood')).toEqual(expect.arrayContaining(['bootHeel', 'bootToe', 'board']));
  });

  it('the suit is silent: no gear layer on any step', () => {
    const fp = new FoleyPlanner(INDEX, new Rng(6));
    const plan = newPlan();
    for (const g of GAIT_LIST) {
      for (let i = 0; i < 300; i++) {
        fp.step(plan, 'concrete', g, 3, 1);
        for (let k = 0; k < plan.n; k++) expect(plan.layers[k]!.bank).not.toBe('cloth');
      }
    }
  });

  it('the suit damps impacts: landings and moves are low-passed and short; the only fabric is a faint brush', () => {
    const fp = new FoleyPlanner(INDEX, new Rng(13));
    const plans: FoleyPlan[] = [];
    for (const k of ['soft', 'roll', 'heavy'] as const) plans.push(fp.landing(newPlan(), 'metal', k));
    for (const k of ['vault', 'mantle', 'hop', 'roll'] as const) plans.push(fp.move(newPlan(), 'metal', k, 0.7));
    for (const p of plans) {
      for (let i = 0; i < p.n; i++) {
        const L = p.layers[i]!;
        expect(L.lowpass).toBeGreaterThan(0);
        expect(L.lowpass).toBeLessThanOrEqual(SUIT.impactLowpass * 1.5);
        if (L.bank === 'cloth') {
          expect(L.gain).toBeLessThanOrEqual(FOLEY_MIX.move * SUIT.brushGain * (1 + VARY.gain) + 1e-9);
          expect(L.fadeIn > 0 || L.offset === 0).toBe(true);
        } else expect(L.dur * L.rate).toBeLessThanOrEqual(0.3 + 1e-9);
      }
    }
    // a landing is quieter than an undamped pair of run steps would be
    const land = fp.landing(newPlan(), 'concrete', 'soft');
    const steps = fp.step(newPlan(), 'concrete', 'run', 3.4, 1);
    expect(land.layers[0]!.gain).toBeLessThan(steps.layers[0]!.gain * (FOLEY_MIX.landing / FOLEY_MIX.step) * 1.1 * (1 + VARY.gain));
  });

  it('landings: two feet and a thump; a heavy one is louder', () => {
    const fp = new FoleyPlanner(INDEX, new Rng(8));
    const soft = fp.landing(newPlan(), 'concrete', 'soft');
    const sb = soft.layers.slice(0, soft.n).map((l) => l.bank);
    expect(sb.filter((b) => b === 'concrete').length).toBeGreaterThanOrEqual(4);
    expect(sb).toContain('thump');
    const heavy = fp.landing(newPlan(), 'concrete', 'heavy');
    const hb = heavy.layers.slice(0, heavy.n).map((l) => l.bank);
    expect(hb).toContain('thumpHeavy');
    expect(hb).not.toContain('cloth');
    expect(sumGain(heavy)).toBeGreaterThan(sumGain(soft));
  });

  it('moves: hands on a vault and a mantle, the roll tumbles, going over an edge is silent, all inside the move', () => {
    const fp = new FoleyPlanner(INDEX, new Rng(10));
    for (const [kind, dur] of [['vault', 0.7], ['mantle', 1], ['hop', 0.5], ['drop', 0.35], ['roll', 0.62]] as const) {
      const p = fp.move(newPlan(), 'concrete', kind, dur);
      if (kind === 'drop') {
        expect(p.n).toBe(0);
        continue;
      }
      expect(p.n).toBeGreaterThan(0);
      for (let i = 0; i < p.n; i++) expect(p.layers[i]!.at).toBeLessThanOrEqual(dur);
      const b = p.layers.slice(0, p.n).map((l) => l.bank);
      if (kind === 'vault' || kind === 'mantle') expect(b).toContain('hand');
      if (kind === 'roll') expect(b.filter((x) => x === 'thump').length).toBe(2);
      if (kind !== 'hop') expect(b).toContain('cloth');
    }
    expect(FOLEY_MIX.move).toBeGreaterThan(0);
  });

  it('nothing jingles: the only gear sound is fabric (no buckle, belt or leather takes)', () => {
    const fp = new FoleyPlanner(INDEX, new Rng(12));
    const plans: FoleyPlan[] = [];
    for (const s of SURF) {
      for (const g of GAIT_LIST) for (let i = 0; i < 50; i++) plans.push(fp.step(newPlan(), s, g, GAITS[g].top, 1));
      for (const k of ['soft', 'roll', 'heavy'] as const) plans.push(fp.landing(newPlan(), s, k));
      for (const k of ['vault', 'mantle', 'hop', 'drop', 'roll'] as const) plans.push(fp.move(newPlan(), s, k, 0.7));
    }
    const gear = new Set<string>();
    for (const p of plans) for (let i = 0; i < p.n; i++) if (!['concrete', 'carpet', 'board', 'gravel', 'bootHeel', 'bootToe', 'ring', 'plate', 'tin', 'thump', 'thumpHeavy', 'hand'].includes(p.layers[i]!.bank)) gear.add(p.layers[i]!.bank);
    expect([...gear]).toEqual(['cloth']);
    expect(Object.keys(INDEX.banks).sort()).toEqual([...FOLEY_BANKS].sort());
  });

  it('is deterministic for a seed (the variation is the RNG, nothing else)', () => {
    const run = (): number[] => {
      const fp = new FoleyPlanner(INDEX, new Rng(42));
      const out: number[] = [];
      const plan = newPlan();
      for (let i = 0; i < 30; i++) {
        fp.step(plan, 'metal', 'run', 3, i % 2 ? 1 : -1);
        out.push(plan.n, plan.layers[0]!.take, plan.layers[0]!.rate);
      }
      return out;
    };
    expect(run()).toEqual(run());
  });
});
