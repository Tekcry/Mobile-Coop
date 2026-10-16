import { describe, expect, it } from 'vitest';
import index from '../src/assets/sfx/weapons.json';
import { Rng } from '../src/audio/music/rng';
import { encodeWav } from '../src/audio/music/wav';
import { caseFloor, CLASS_GUN, GUARD_GUN, gunOf, GUNS, MAX_WLAYERS, NEAR_FAR, newWeaponPlan, WEAPON_MIX, WeaponPlanner, type WeaponPlan } from '../src/audio/weapons/guns';
import { bodyRms, bow, CASE_SPECS, casing, cut, pickShots, readWav, resample, SD_SPECS, suppress } from '../src/audio/weapons/render/dsp';
import { missingBanks, SHOT_SOURCES, WEAPON_BANKS, type WeaponIndex } from '../src/audio/weapons/sprite';
import { peakOf } from '../src/audio/foley/render/process';
import { WEAPON_IDS } from '../src/weapons/weaponDefs';
import enemies from '../src/config/enemies.json';
import type { Surface } from '../src/world/surfaces';

const RATE = 48000;
const INDEX = index as unknown as WeaponIndex;
const SURF: Surface[] = ['concrete', 'metal', 'grate', 'wood', 'gravel', 'carpet'];

/** A gunshot stand-in: a loud noise crack at `t` decaying over `decay` s. */
function shot(buf: Float32Array, t: number, amp: number, decay = 0.08, seed = 1): void {
  const r = new Rng(seed);
  const a = Math.round(t * RATE);
  for (let i = 0; a + i < buf.length && i < RATE * 0.6; i++) buf[a + i] = buf[a + i]! + amp * (r.next() * 2 - 1) * Math.exp(-i / (decay * RATE));
}

const banksOf = (p: WeaponPlan): string[] => {
  const out: string[] = [];
  for (let i = 0; i < p.n; i++) out.push(p.layers[i]!.bank);
  return out;
};

describe('weapon sprite index (the shipped weapons.json)', () => {
  it('has every bank, with takes inside the sprite', () => {
    expect(missingBanks(INDEX)).toEqual([]);
    for (const b of WEAPON_BANKS) {
      for (const [start, dur] of INDEX.banks[b]) {
        expect(start).toBeGreaterThanOrEqual(0);
        expect(dur).toBeGreaterThan(0.02);
        expect(start + dur).toBeLessThanOrEqual(INDEX.length + 1e-3);
      }
    }
    // at least two takes per gun, near and far, so a shot never repeats back to back
    for (const s of SHOT_SOURCES) {
      expect(INDEX.banks[s].length).toBeGreaterThanOrEqual(2);
      expect(INDEX.banks[`${s}Far`].length).toBeGreaterThanOrEqual(2);
    }
    expect(INDEX.mark).toBeGreaterThan(0);
    // the sprite stays small (bible S7 budget: all audio within about 8 MB)
    expect(INDEX.length).toBeLessThan(120);
  });
});

describe('gun table', () => {
  it('gives every weapon in the game a sound, and every guard and co-op class a gun', () => {
    for (const id of WEAPON_IDS) expect(GUNS[id], id).toBeDefined();
    for (const g of Object.values(GUNS)) if (g.shot) expect(SHOT_SOURCES).toContain(g.shot);
    for (const id of Object.values(CLASS_GUN)) expect(GUNS[id]).toBeDefined();
    for (const id of Object.values(GUARD_GUN)) expect(GUNS[id]).toBeDefined();
    // every armed guard archetype is mapped
    for (const [kind, e] of Object.entries(enemies as Record<string, { weapon: unknown }>)) if (e.weapon) expect(GUARD_GUN[kind], kind).toBeDefined();
    expect(gunOf('nonsense')).toBe(GUNS.rifle);
    expect(gunOf('heavy')).toBe(GUNS.lmg);
  });
  it('maps floors to brass families', () => {
    expect(caseFloor('metal')).toBe('metal');
    expect(caseFloor('grate')).toBe('metal');
    expect(caseFloor('wood')).toBe('wood');
    expect(caseFloor('carpet')).toBe('wood');
    expect(caseFloor('concrete')).toBe('hard');
    expect(caseFloor('gravel')).toBe('hard');
  });
});

describe('weapon planner', () => {
  const planner = (seed = 7): WeaponPlanner => new WeaponPlanner(INDEX, new Rng(seed));

  it("plays the gun's own near take for the player, never the same take twice in a row", () => {
    const p = planner();
    const plan = newWeaponPlan();
    let last = -1;
    for (let i = 0; i < 40; i++) {
      p.shot(plan, 'pistol', false);
      expect(banksOf(plan)).toEqual(['p1911']);
      const L = plan.layers[0]!;
      expect(L.take).not.toBe(last);
      last = L.take;
      expect(L.rate).toBeGreaterThan(0.94);
      expect(L.rate).toBeLessThan(1.06);
      expect(L.lowpass).toBe(0);
    }
  });

  it('a suppressed shot uses the suppressed bank, well under the open one', () => {
    const p = planner();
    const plan = newWeaponPlan();
    let open = 0;
    let sd = 0;
    for (let i = 0; i < 50; i++) {
      open += p.shot(plan, 'smg', false).layers[0]!.gain;
      p.shot(plan, 'smg', true);
      expect(banksOf(plan)).toEqual(['sdSmg']);
      sd += plan.layers[0]!.gain;
    }
    expect(sd / open).toBeCloseTo(WEAPON_MIX.sd, 1);
    expect(sd / open).toBeLessThan(0.5);
    // the integral suppressor pistol uses the pistol bank
    expect(banksOf(p.shot(plan, 'pistolSd', true))).toEqual(['sdPistol']);
  });

  it('crossfades a remote shot from the near take to the far take with distance, darker further away', () => {
    const p = planner();
    const plan = newWeaponPlan();
    expect(banksOf(p.shot(plan, 'ak', false, NEAR_FAR[0] - 1, 1))).toEqual(['ak']);
    expect(banksOf(p.shot(plan, 'ak', false, (NEAR_FAR[0] + NEAR_FAR[1]) / 2, 1))).toEqual(['ak', 'akFar']);
    expect(banksOf(p.shot(plan, 'ak', false, NEAR_FAR[1] + 5, 1))).toEqual(['akFar']);
    const lp = (d: number): number => p.shot(plan, 'ak', false, d, 1).layers[0]!.lowpass;
    expect(lp(40)).toBeLessThan(lp(10));
    expect(lp(200)).toBeGreaterThanOrEqual(1400);
    // the distance gain scales the shot
    const g1 = p.shot(plan, 'ak', false, 5, 1).layers[0]!.gain;
    const g2 = p.shot(plan, 'ak', false, 5, 0.25).layers[0]!.gain;
    expect(g2).toBeLessThan(g1 * 0.4);
  });

  it('the crossbow plays its own release', () => {
    const plan = newWeaponPlan();
    expect(banksOf(planner().shot(plan, 'crossbow', false))).toEqual(['bow']);
    expect(banksOf(planner().shot(plan, 'crossbow', true))).toEqual(['bow']);
  });

  it('drops brass on the floor family of the surface; carpet is barely there', () => {
    const p = planner();
    const plan = newWeaponPlan();
    for (const s of SURF) {
      p.casing(plan, 'rifle', s, 0.5);
      expect(plan.n).toBe(1);
      expect(plan.layers[0]!.bank).toBe(`case_rifle_${caseFloor(s)}`);
      expect(plan.layers[0]!.at).toBeCloseTo(0.5);
    }
    let carpet = 0;
    let concrete = 0;
    for (let i = 0; i < 30; i++) {
      carpet += p.casing(plan, 'pistol', 'carpet', 0).layers[0]!.gain;
      concrete += p.casing(plan, 'pistol', 'concrete', 0).layers[0]!.gain;
    }
    expect(carpet).toBeLessThan(concrete * 0.5);
  });

  it('pumps the shotgun and works the sniper bolt after a shot, with the case after; self-loaders do nothing', () => {
    const p = planner();
    const plan = newWeaponPlan();
    expect(banksOf(p.action(plan, 'shotgun', 'concrete'))).toEqual(['slideBack', 'slideFwd', 'case_shell_hard']);
    expect(banksOf(p.action(plan, 'sniper', 'metal'))).toEqual(['slideBack', 'slideFwd', 'case_rifle_metal']);
    expect(p.action(plan, 'rifle', 'concrete').n).toBe(0);
  });

  it('lays a reload out over its time, in order; an empty reload adds the slide or handle', () => {
    const p = planner();
    const plan = newWeaponPlan();
    for (const id of WEAPON_IDS) {
      for (const empty of [false, true]) {
        p.reload(plan, id, 2, empty, 4);
        expect(plan.n, id).toBeGreaterThan(0);
        let prev = -1;
        for (let i = 0; i < plan.n; i++) {
          const L = plan.layers[i]!;
          expect(L.at).toBeGreaterThanOrEqual(prev);
          expect(L.at).toBeLessThan(2.2);
          prev = L.at;
        }
      }
    }
    expect(banksOf(p.reload(plan, 'pistol', 1.2, false))).toEqual(['magOut', 'magIn']);
    expect(banksOf(p.reload(plan, 'pistol', 1.2, true))).toEqual(['magOut', 'magIn', 'slideFwd']);
    expect(banksOf(p.reload(plan, 'rifle', 2, true))).toEqual(['magOut', 'rifleMagIn', 'slideBack', 'slideFwd']);
    // the tube shotgun loads shell by shell (at most five heard)
    expect(banksOf(p.reload(plan, 'shotgun', 2.6, false, 3))).toEqual(['shellIn', 'shellIn', 'shellIn']);
    expect(banksOf(p.reload(plan, 'shotgun', 2.6, false, 9)).length).toBe(5);
    expect(banksOf(p.reload(plan, 'shotgun', 2.6, false, 0))).toEqual(['shellIn']);
  });

  it('reuses one plan without growing it', () => {
    const p = planner();
    const plan = newWeaponPlan();
    for (let i = 0; i < 200; i++) {
      p.shot(plan, WEAPON_IDS[i % WEAPON_IDS.length]!, i % 3 === 0, i % 50);
      expect(plan.n).toBeLessThanOrEqual(MAX_WLAYERS);
    }
    expect(plan.layers.length).toBe(MAX_WLAYERS);
  });
});

describe('weapon render (offline cutting and making)', () => {
  it('reads back a WAV it wrote (16 bit) as mono', () => {
    const l = new Float32Array(480).map((_, i) => Math.sin(i / 10) * 0.5);
    const r = l.map((x) => -x * 0);
    const { s, rate } = readWav(encodeWav([l, r], RATE));
    expect(rate).toBe(RATE);
    expect(s.length).toBe(480);
    expect(s[100]!).toBeCloseTo(l[100]! / 2, 3);
  });

  it('resamples to the right length', () => {
    expect(resample(new Float32Array(96000), 96000, 48000).length).toBe(48000);
    expect(resample(new Float32Array(44100), 44100, 48000).length).toBe(48000);
  });

  it('takes the first onset of a single shot (not its echo) and the last round of a burst', () => {
    const single = new Float32Array(RATE * 4);
    shot(single, 0.5, 0.9);
    shot(single, 0.62, 0.3, 0.05, 2); // the echo off a berm
    shot(single, 2.5, 0.9, 0.08, 3);
    const s = pickShots(single, RATE, false, 0.9);
    expect(s.length).toBe(2);
    expect(s[0]![0]).toBeCloseTo(0.5, 1);
    expect(s[1]![0]).toBeCloseTo(2.5, 1);
    const burst = new Float32Array(RATE * 3);
    for (let i = 0; i < 4; i++) shot(burst, 0.4 + i * 0.1, 0.9, 0.03, 10 + i);
    const b = pickShots(burst, RATE, true, 0.9);
    expect(b.length).toBe(1);
    expect(b[0]![0]).toBeCloseTo(0.7, 1);
  });

  it('cuts a take to its sound', () => {
    const x = new Float32Array(RATE * 2);
    shot(x, 0.1, 0.9, 0.05);
    const t = cut(x, RATE, 0.09, 1.9);
    expect(t.length / RATE).toBeLessThan(0.7);
    expect(Math.abs(t[t.length - 1]!)).toBeLessThan(1e-3);
  });

  it('a suppressed shot is short, dull and keeps the action clack', () => {
    const x = new Float32Array(RATE);
    shot(x, 0.003, 0.9, 0.2);
    const mech = new Float32Array(RATE * 0.05);
    shot(mech, 0, 0.5, 0.005, 5);
    const sd = suppress(x, mech, SD_SPECS.sdPistol, new Rng(1));
    expect(sd.length / RATE).toBeLessThanOrEqual(0.33);
    // the open shot's ring at 150 ms is gone
    const tail = (s: Float32Array): number => bodyRms(s.slice(Math.round(0.15 * RATE)), RATE, 0.1) / peakOf(s);
    expect(tail(sd)).toBeLessThan(tail(x) * 0.25);
  });

  it('brass bounces are deterministic from the seed and die out', () => {
    const a = casing(CASE_SPECS.pistol, 'hard', new Rng(3));
    const b = casing(CASE_SPECS.pistol, 'hard', new Rng(3));
    expect(a).toEqual(b);
    expect(a.length / RATE).toBeLessThan(1.1);
    expect(Math.abs(a[a.length - 1]!)).toBeLessThan(1e-3);
    // metal rings longer than wood
    const m = casing(CASE_SPECS.rifle, 'metal', new Rng(4));
    const w = casing(CASE_SPECS.rifle, 'wood', new Rng(4));
    const ring = (s: Float32Array): number => bodyRms(s.slice(Math.round(0.02 * RATE)), RATE, 0.05) / peakOf(s);
    expect(ring(m)).toBeGreaterThan(ring(w));
    expect(bow(new Rng(1)).length).toBeGreaterThan(RATE * 0.3);
  });
});
