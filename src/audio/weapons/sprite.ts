/**
 * The weapon sprite: every gun take (CC0 recordings, `docs/audio-credits.md`) cut, levelled and laid end to end in one
 * mono MP3 (`src/assets/sfx/weapons.mp3`) with an index of where each take starts (`weapons.json`). Pure.
 *
 * - Shots: real guns recorded near and at mid distance (The Free Firearm Sound Library, Still North Media, CC0). Each
 *   gun in the game borrows the recording closest to it (`guns.ts`).
 * - Suppressed shots: made offline from the near takes (the blast and its tail cut away, the body low-passed, a puff of
 *   gas and the slide or bolt clack added), so every suppressed gun keeps its own character.
 * - Handling: magazine out and in, slide or charging handle, shell in, dry click (OpenGameArt CC0 reloads).
 * - Brass and shells hitting the floor, and the crossbow: modelled offline (no recording), per surface family.
 *
 * Alignment works as in the foley sprite (`../foley/sprite.ts`): the render records `mark`, the decoder's shift is found
 * at load with the same search.
 */
import { firstAbove, MARK_LEVEL, type Take } from '../foley/sprite';

export { firstAbove, MARK_LEVEL, type Take };

/** Recorded guns (near takes; `<id>Far` is the same gun at mid distance). */
export const SHOT_SOURCES = ['p1911', 'ppq', 'ruger', 'm45', 'ppsh', 'ar15', 'ak', 'sks', 'tikka', 'nova', 'model12', 'cd'] as const;
export type ShotSource = (typeof SHOT_SOURCES)[number];

/** Suppressed shot banks (made from the near takes). */
export const SD_BANKS = ['sdPistol', 'sdSmg', 'sdRifle', 'sdHeavy'] as const;
export type SdBank = (typeof SD_BANKS)[number];

export const MECH_BANKS = ['magOut', 'magIn', 'rifleMagIn', 'slideBack', 'slideFwd', 'shellIn', 'tick'] as const;
export type MechBank = (typeof MECH_BANKS)[number];

/** Casing families: pistol brass, rifle brass, shotgun shell. */
export type CaseKind = 'pistol' | 'rifle' | 'shell';
/** Floor families for brass: hard (concrete, gravel), metal (deck, grate), wood (boards; carpet muffled from it). */
export type CaseFloor = 'hard' | 'metal' | 'wood';
export const CASE_KINDS: readonly CaseKind[] = ['pistol', 'rifle', 'shell'];
export const CASE_FLOORS: readonly CaseFloor[] = ['hard', 'metal', 'wood'];
export type CaseBank = `case_${CaseKind}_${CaseFloor}`;
export const CASE_BANKS: readonly CaseBank[] = CASE_KINDS.flatMap((k) => CASE_FLOORS.map((f): CaseBank => `case_${k}_${f}`));

export type FarBank = `${ShotSource}Far`;
export type WeaponBank = ShotSource | FarBank | SdBank | MechBank | CaseBank | 'bow';

export const WEAPON_BANKS: readonly WeaponBank[] = [
  ...SHOT_SOURCES,
  ...SHOT_SOURCES.map((s): FarBank => `${s}Far`),
  ...SD_BANKS,
  ...MECH_BANKS,
  ...CASE_BANKS,
  'bow',
];

export interface WeaponIndex {
  rate: number;
  mark: number;
  length: number;
  banks: Record<WeaponBank, Take[]>;
}

/** The decoder's shift (s) to add to every take start, kept to a sane range. */
export function alignShift(decoded: ArrayLike<number>, rate: number, index: WeaponIndex): number {
  const t = firstAbove(decoded, rate, MARK_LEVEL);
  if (t < 0) return 0;
  return Math.max(-0.05, Math.min(0.1, t - index.mark));
}

/** Banks with no takes (the planner skips them; the tests require none). */
export function missingBanks(index: WeaponIndex): WeaponBank[] {
  return WEAPON_BANKS.filter((b) => !index.banks[b]?.length);
}
