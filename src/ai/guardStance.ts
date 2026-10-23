/**
 * (guard-ai S9) How high a guard holds his weapon (the rig's `aim` 0..1), pure and shared: the host's `Enemy.frame`
 * reads his own state, the co-op client's `EnemyPuppet` the wire (`EnemyState.st`, the alert level, `AL_CAUTION`), so
 * both screens pose him alike. Cautious and calm (S4 / S14 caution: a death he knows of, a knockout, a missed check,
 * shots called in) he carries it at low ready (research/ct-behaviour.md "What cautious changes": weapon at low ready).
 * Prototype values (G4).
 */
import type { AlertLevel } from './alertState';

/** Aim weights: firing or in cover, investigating / searching, suspicious, cautious and calm (low ready), at rest. */
export const GUARD_AIM = { fire: 1, search: 0.7, suspicious: 0.4, caution: 0.4, rest: 0.2 } as const;

/** The host's weight: `firing` (attacking, in cover, mid burst, winding up), his level, his caution (> 0 = cautious). */
export function guardAim(firing: boolean, level: AlertLevel, cautious: boolean): number {
  if (firing) return GUARD_AIM.fire;
  if (level === 'investigating' || level === 'searching') return GUARD_AIM.search;
  if (level === 'suspicious') return GUARD_AIM.suspicious;
  if (cautious && (level === 'unaware' || level === 'cooldown')) return GUARD_AIM.caution;
  return GUARD_AIM.rest;
}

/**
 * The client's weight from the wire: `st` 1 aiming / 2 crouched in cover, the wire level 0-3 (`EnemyState.al & 3`: 1 is
 * suspicious or investigating, shown as investigating, the longer of the two) and the caution bit.
 */
export function wireGuardAim(st: number, level: number, cautious: boolean): number {
  if (st === 1 || st === 2) return GUARD_AIM.fire;
  if (level === 1 || level === 2) return GUARD_AIM.search;
  if (level === 0 && cautious) return GUARD_AIM.caution;
  return GUARD_AIM.rest;
}
