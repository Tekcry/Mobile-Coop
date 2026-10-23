/**
 * Weapon sound planner (pure, allocation-free per call, unit-tested). Which recording each gun borrows, how loud it
 * is, and the layers a shot, a reload, a dry click, a pump or bolt cycle and the falling brass play from the weapon
 * sprite (`sprite.ts`).
 *
 * - A shot is one take of its gun (near, far, or both crossfaded by distance; the suppressed bank when the gun is
 *   suppressed) with a little rate and level jitter, no take twice in a row.
 * - Brass lands about half a second after the shot on the player's floor; a shotgun's shell drops on the pump.
 * - A reload is laid out over its real duration (magazine out, magazine in, slide or charging handle on an empty
 *   reload; shell by shell for the tube shotguns).
 *
 * Purely cosmetic: guards hear the noise model (`GameState`, the weapon's `noise` stat), never this.
 */
import type { Surface } from '../../world/surfaces';
import type { Rng } from '../music/rng';
import { TakePicker } from '../foley/steps';
import type { CaseBank, CaseFloor, CaseKind, FarBank, SdBank, ShotSource, WeaponBank, WeaponIndex } from './sprite';

export type ReloadKind = 'pistol' | 'rifle' | 'lmg' | 'shotgun' | 'bolt' | 'crossbow';
export type Action = 'none' | 'pump' | 'bolt';

export interface GunSound {
  /** The recording (near; far is `<shot>Far`). Null: the crossbow (`bow`). */
  shot: ShotSource | null;
  /** Playback rate of the recording (a smaller calibre a touch higher, a heavier one lower). */
  rate: number;
  /** Level against the other guns. */
  gain: number;
  /** The suppressed bank this gun uses with a suppressor (or built in). */
  sd: SdBank;
  casing: CaseKind | 'none';
  /** Cycled by hand after each shot. */
  action: Action;
  reload: ReloadKind;
}

/**
 * The two CT kit guns in `weapons.json` (rifle, pistolSd) and the guns the guards sound like (`GUARD_GUN`; the guards
 * keep their sounds, G115). Live-tunable by ear (Michael). The recordings are real guns of the same type and calibre
 * where the library has one (.45 pistol, 9 mm SMG, 5.56 and 7.62 rifles, 12 gauge semi-auto, .30-06 bolt rifle).
 */
export const GUNS: Record<string, GunSound> = {
  pistol: { shot: 'p1911', rate: 1, gain: 1, sd: 'sdPistol', casing: 'pistol', action: 'none', reload: 'pistol' },
  pistolSd: { shot: 'ruger', rate: 1, gain: 0.9, sd: 'sdPistol', casing: 'pistol', action: 'none', reload: 'pistol' },
  smg: { shot: 'm45', rate: 1.03, gain: 0.9, sd: 'sdSmg', casing: 'pistol', action: 'none', reload: 'rifle' },
  rifle: { shot: 'ar15', rate: 1, gain: 1, sd: 'sdRifle', casing: 'rifle', action: 'none', reload: 'rifle' },
  ak: { shot: 'ak', rate: 1, gain: 1.05, sd: 'sdRifle', casing: 'rifle', action: 'none', reload: 'rifle' },
  lmg: { shot: 'ak', rate: 0.93, gain: 1.1, sd: 'sdRifle', casing: 'rifle', action: 'none', reload: 'lmg' },
  sniper: { shot: 'tikka', rate: 1, gain: 1, sd: 'sdHeavy', casing: 'rifle', action: 'bolt', reload: 'bolt' },
  semiShotgun: { shot: 'model12', rate: 1.02, gain: 1.1, sd: 'sdHeavy', casing: 'shell', action: 'none', reload: 'shotgun' },
};

/** A weapon class (a guard's tracer carries only the class) to its gun. The CT kit has the rifle and pistol classes only. */
export const CLASS_GUN: Record<string, string> = { pistol: 'pistol', rifle: 'rifle', heavy: 'lmg' };

/** Guard archetypes to the gun they sound like (`enemies.json`). */
export const GUARD_GUN: Record<string, string> = { grunt: 'ak', heavy: 'lmg', sniper: 'sniper', enforcer: 'semiShotgun', droneOp: 'smg', officer: 'pistol' };

/** (coop-walk-fixes P7) The gun a remote shot sounds like: the partner's weapon id when it has a sound (`pistolSd`, `rifle`),
 *  else its class's (`CLASS_GUN`; a guard's tracer has only the class). */
export function remoteGun(cls: string, gun?: string): string {
  return gun !== undefined && GUNS[gun] !== undefined ? gun : (CLASS_GUN[cls] ?? 'rifle');
}

export function gunOf(id: string): GunSound {
  return GUNS[id] ?? GUNS[CLASS_GUN[id] ?? 'rifle']!;
}

/**
 * Master levels into the sfx bus (Michael tunes by ear). Measured against the foley (loudest 50 ms, in game): a running
 * step on concrete about -33 dB; an open pistol about -21 dB (the loudest thing the player makes; the master
 * compressor keeps it from flattening the mix); a suppressed pistol about -31 dB; reload handling about -30 dB; brass
 * about -42 dB; a dry click about -33 dB; the crossbow about -30 dB.
 */
export const WEAPON_MIX = {
  shot: 0.5,
  /** Suppressed shot level against the open one (about a running footstep). */
  sd: 0.42,
  /** Guards' and teammates' shots before distance. */
  remote: 0.75,
  /** Reload and pump handling (a little above a walking step). */
  mech: 0.22,
  /** Brass on the floor: a tinkle under the steps. */
  casing: 0.07,
  dry: 0.3,
  /** The crossbow is the quietest weapon. */
  bow: 0.12,
};

/** Distance (m) where a remote shot is all near take, and where it is all far take. */
export const NEAR_FAR = [8, 30] as const;

/** Random variation per shot. */
export const SHOT_VARY = { rate: 0.035, gain: 0.12 };

export interface WLayer {
  bank: WeaponBank;
  take: number;
  at: number;
  gain: number;
  rate: number;
  /** Longest it plays (s, real time); 0 = the whole take. */
  dur: number;
  lowpass: number;
  pan: number;
}

export const MAX_WLAYERS = 12;

export interface WeaponPlan {
  layers: WLayer[];
  n: number;
}

export function newWeaponPlan(): WeaponPlan {
  const layers: WLayer[] = [];
  for (let i = 0; i < MAX_WLAYERS; i++) layers.push({ bank: 'tick', take: 0, at: 0, gain: 0, rate: 1, dur: 0, lowpass: 0, pan: 0 });
  return { layers, n: 0 };
}

/** The brass floor family for a surface (carpet: wood, muffled by the caller's low-pass). */
export function caseFloor(s: Surface): CaseFloor {
  return s === 'metal' || s === 'grate' ? 'metal' : s === 'wood' || s === 'carpet' ? 'wood' : 'hard';
}

/** Brass on carpet is barely there; on gravel it is dulled. */
const CASE_SURFACE: Record<Surface, { gain: number; lowpass: number }> = {
  concrete: { gain: 1, lowpass: 0 },
  metal: { gain: 1, lowpass: 0 },
  grate: { gain: 0.8, lowpass: 0 },
  wood: { gain: 0.85, lowpass: 0 },
  gravel: { gain: 0.6, lowpass: 3500 },
  carpet: { gain: 0.3, lowpass: 1800 },
};

/** The case bank for a kind and floor (a fixed table: no string building on the hot path). */
const CASE_BANK: Record<CaseKind, Record<CaseFloor, CaseBank>> = {
  pistol: { hard: 'case_pistol_hard', metal: 'case_pistol_metal', wood: 'case_pistol_wood' },
  rifle: { hard: 'case_rifle_hard', metal: 'case_rifle_metal', wood: 'case_rifle_wood' },
  shell: { hard: 'case_shell_hard', metal: 'case_shell_metal', wood: 'case_shell_wood' },
};

const FAR: Record<ShotSource, FarBank> = {
  p1911: 'p1911Far',
  ppq: 'ppqFar',
  ruger: 'rugerFar',
  m45: 'm45Far',
  ppsh: 'ppshFar',
  ar15: 'ar15Far',
  ak: 'akFar',
  sks: 'sksFar',
  tikka: 'tikkaFar',
  nova: 'novaFar',
  model12: 'model12Far',
  cd: 'cdFar',
};

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export class WeaponPlanner {
  private pickers = new Map<WeaponBank, TakePicker>();

  constructor(
    private index: WeaponIndex,
    private rng: Rng,
  ) {}

  /** A rate with a little jitter. */
  private jit(x: number): number {
    return x * this.rng.jitter(0.03);
  }

  private pick(bank: WeaponBank): number {
    let p = this.pickers.get(bank);
    if (!p) {
      p = new TakePicker(this.index.banks[bank]?.length ?? 0, this.rng);
      this.pickers.set(bank, p);
    }
    return p.next();
  }

  /** Append a layer (dropped past MAX_WLAYERS, or when the bank is empty or silent). Returns its index or -1. */
  private add(plan: WeaponPlan, bank: WeaponBank, at: number, gain: number, rate = 1, dur = 0, lowpass = 0, pan = 0, take = -1): number {
    if (plan.n >= MAX_WLAYERS || !this.index.banks[bank]?.length || gain <= 0) return -1;
    const L = plan.layers[plan.n]!;
    L.bank = bank;
    L.take = take >= 0 ? take : this.pick(bank);
    L.at = Math.max(0, at);
    L.gain = gain;
    L.rate = rate;
    L.dur = dur;
    L.lowpass = lowpass;
    L.pan = pan;
    return plan.n++;
  }

  /**
   * One shot. `dist` 0 is the player's own gun; > 0 a guard or teammate at that distance (near and far takes
   * crossfaded, low-passed with distance). `level` is the caller's distance gain (1 for the player).
   */
  shot(plan: WeaponPlan, gunId: string, suppressed: boolean, dist = 0, level = 1, pan = 0): WeaponPlan {
    plan.n = 0;
    const g = gunOf(gunId);
    const rate = g.rate * this.rng.jitter(SHOT_VARY.rate);
    const gain = level * g.gain * this.rng.jitter(SHOT_VARY.gain) * (dist > 0 ? WEAPON_MIX.remote : WEAPON_MIX.shot);
    if (!g.shot) {
      this.add(plan, 'bow', 0, level * WEAPON_MIX.bow * this.rng.jitter(SHOT_VARY.gain), this.rng.jitter(0.03), 0, dist > 0 ? Math.max(1200, 7000 - dist * 150) : 0, pan);
      return plan;
    }
    if (suppressed) {
      this.add(plan, g.sd, 0, gain * WEAPON_MIX.sd, rate, 0, dist > 0 ? Math.max(1000, 5000 - dist * 120) : 0, pan);
      return plan;
    }
    if (dist <= 0) {
      this.add(plan, g.shot, 0, gain, rate);
      return plan;
    }
    // remote: near and far takes crossfaded by distance (equal power), the far side darker the further it is
    const x = clamp01((dist - NEAR_FAR[0]) / (NEAR_FAR[1] - NEAR_FAR[0]));
    const lp = Math.max(1400, 12000 - dist * 140);
    const near = Math.cos((x * Math.PI) / 2);
    const far = Math.sin((x * Math.PI) / 2);
    if (near > 0.05) this.add(plan, g.shot, 0, gain * near, rate, 0, lp, pan);
    if (far > 0.05) this.add(plan, FAR[g.shot], 0, gain * far, rate, 0, lp, pan);
    return plan;
  }

  /** The brass (or shell) landing on the player's floor, `at` s from now. */
  casing(plan: WeaponPlan, kind: CaseKind, surface: Surface, at: number): WeaponPlan {
    plan.n = 0;
    const s = CASE_SURFACE[surface];
    this.add(plan, CASE_BANK[kind][caseFloor(surface)], at, WEAPON_MIX.casing * s.gain * this.rng.jitter(0.25), this.rng.jitter(0.05), 0, s.lowpass);
    return plan;
  }

  /** The hand cycle after a shot: a pump (and its shell) or a bolt. Empty for self-loading guns. */
  action(plan: WeaponPlan, gunId: string, surface: Surface): WeaponPlan {
    plan.n = 0;
    const g = gunOf(gunId);
    const m = WEAPON_MIX.mech;
    if (g.action === 'pump') {
      this.add(plan, 'slideBack', 0.32, m * 1.1, 0.62);
      this.add(plan, 'slideFwd', 0.47, m * 1.2, 0.6);
      const s = CASE_SURFACE[surface];
      this.add(plan, CASE_BANK.shell[caseFloor(surface)], 0.9, WEAPON_MIX.casing * s.gain, this.rng.jitter(0.05), 0, s.lowpass);
    } else if (g.action === 'bolt') {
      this.add(plan, 'slideBack', 0.55, m, 0.72);
      this.add(plan, 'slideFwd', 0.78, m * 1.1, 0.75);
      const s = CASE_SURFACE[surface];
      this.add(plan, CASE_BANK.rifle[caseFloor(surface)], 1.15, WEAPON_MIX.casing * s.gain, this.rng.jitter(0.05), 0, s.lowpass);
    }
    return plan;
  }

  dry(plan: WeaponPlan): WeaponPlan {
    plan.n = 0;
    this.add(plan, 'tick', 0, WEAPON_MIX.dry, this.rng.jitter(0.04));
    return plan;
  }

  /**
   * A reload over `seconds`. `empty`: the longer reload that also works the slide or charging handle. `rounds`: shells to
   * load for the tube shotguns (at most 5 are heard).
   */
  reload(plan: WeaponPlan, gunId: string, seconds: number, empty: boolean, rounds = 4): WeaponPlan {
    plan.n = 0;
    const g = gunOf(gunId);
    const T = Math.max(0.4, seconds);
    const m = WEAPON_MIX.mech;
    switch (g.reload) {
      case 'pistol':
        this.add(plan, 'magOut', 0.06 * T, m, this.jit(1.05));
        this.add(plan, 'magIn', 0.5 * T, m, this.jit(1.05));
        if (empty) this.add(plan, 'slideFwd', 0.82 * T, m * 1.1, this.jit(1.05));
        break;
      case 'rifle':
      case 'lmg': {
        const k = g.reload === 'lmg' ? 0.78 : 0.9;
        this.add(plan, 'magOut', 0.1 * T, m, this.jit(k));
        this.add(plan, 'rifleMagIn', 0.52 * T, m * 1.1, this.jit(k));
        if (empty) {
          this.add(plan, 'slideBack', 0.78 * T, m, this.jit(0.82 * k));
          this.add(plan, 'slideFwd', 0.78 * T + 0.13, m * 1.1, this.jit(0.82 * k));
        }
        break;
      }
      case 'shotgun': {
        const n = Math.max(1, Math.min(5, rounds));
        for (let i = 0; i < n; i++) this.add(plan, 'shellIn', T * (0.14 + (n > 1 ? (0.62 * i) / (n - 1) : 0)), m, this.jit(0.9));
        if (empty) {
          this.add(plan, 'slideBack', 0.86 * T, m * 1.1, this.jit(0.62));
          this.add(plan, 'slideFwd', 0.86 * T + 0.15, m * 1.2, this.jit(0.6));
        }
        break;
      }
      case 'bolt':
        this.add(plan, 'slideBack', 0.06 * T, m, this.jit(0.72));
        this.add(plan, 'magOut', 0.22 * T, m * 0.9, this.jit(0.9));
        this.add(plan, 'rifleMagIn', 0.58 * T, m, this.jit(0.95));
        this.add(plan, 'slideFwd', 0.84 * T, m * 1.1, this.jit(0.75));
        break;
      case 'crossbow':
        // the string drawn back and caught, the bolt seated
        this.add(plan, 'slideBack', 0.25 * T, m * 0.8, this.jit(0.5));
        this.add(plan, 'tick', 0.62 * T, m * 1.2, this.jit(0.7));
        this.add(plan, 'shellIn', 0.8 * T, m * 0.7, this.jit(1.1));
        break;
    }
    return plan;
  }
}
