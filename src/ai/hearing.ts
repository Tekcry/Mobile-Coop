/**
 * Hearing maths (pure: no Babylon / DOM), unit-tested (guard-ai S1, design section 2).
 *
 * Loudness stays a reach in metres (every call site passes one: steps, glass 15, suppressed shot 9.8, impact 4,
 * door 2 / 10, gadget 16). The loss terms are in dB, folded into an effective reach once per listener:
 * `reachEff = reach * 10^(-(walls * wallDb + ambientDb) / 20)`. In a quiet place with no wall `reachEff = reach`, so a
 * guard hears exactly where he did before; one wall cuts the reach to 0.45 (`wallDb` 6.9 = the old `MUFFLE`), and a
 * noisy thing near the LISTENER (machinery, a generator, a vent: `NoisySource`) masks quieter sounds the same way:
 * 6 dB halves the reach, 12 dB quarters it.
 *
 * Tiers by where the listener sits inside his effective reach: beyond it nothing; inside it he turns to look (tier 1);
 * inside half of it (`investigateDb` 6) he may be sent to investigate (tier 2); loud gunfire inside a quarter of it
 * (`combatDb` 12) is straight combat (tier 3). Who of the tier-2 hearers actually walks over is the incident board's
 * call (`incidents.ts`, guard-ai S2); the rest only turn.
 *
 * Allocation-free: every function reads numbers and typed arrays and returns a number.
 */
import { hyp2, hyp3 } from '../core/mathx';

export const HEARING = {
  /** dB lost through one wall between the noise and the listener (head-height ray): 10^(-6.9/20) = 0.45 of the reach. */
  wallDb: 6.9,
  /** Margin (dB) at which a listener turns to look (0: anywhere inside the effective reach). */
  turnDb: 0,
  /** Margin (dB) at which a listener may be sent to investigate (6: inside half the effective reach). */
  investigateDb: 6,
  /** Margin (dB) at which loud gunfire is straight combat (12: inside a quarter of the effective reach). */
  combatDb: 12,
  /** A listener who only turns (tier 1, or a tier-2 hearer not sent) gets the noise's meter floor capped here: he may
   *  look suspicious, never reaches the investigate level (`PERCEPTION.investigate` 0.6) from a sound alone. */
  turnMax: 0.45,
} as const;

/** 0 ignore | 1 turn (look, no walk) | 2 investigate-eligible | 3 combat (loud gunfire only). */
export type HearTier = 0 | 1 | 2 | 3;

/** A noisy thing (map data): masks quieter sounds near it. Level in dB above the quiet floor at its centre. */
export interface NoisySource {
  id: string;
  x: number;
  z: number;
  /** Height of its centre (m); with a listener height given, the distance is 3D. */
  y?: number;
  /** Radius (m) at which its masking fades to 0 (linear from `db` at the centre). */
  radius: number;
  /** Masking level at its centre (dB): 6 halves a listener's hearing reach, 12 quarters it. */
  db: number;
  /** Section index (Sector Ops) or zone it belongs to; none = always on. */
  section?: number;
  /** 'generator' | 'vent' | 'press' ... for barks / debug. */
  label?: string;
}

/** Reach factor for a loss of `db` dB: 10^(-db/20). */
export function dbFactor(db: number): number {
  return db === 0 ? 1 : Math.pow(10, -db / 20);
}

const K_WALL = dbFactor(HEARING.wallDb);
const K_TURN = dbFactor(HEARING.turnDb);
const K_INVESTIGATE = dbFactor(HEARING.investigateDb);
const K_COMBAT = dbFactor(HEARING.combatDb);

/** Reach factor of one wall (0.45). */
export const WALL_FACTOR = K_WALL;

/** Ambient masking (dB) at a listener at (x, z) (and height y): the loudest source there, each fading linearly from
 *  its `db` at the centre to 0 at its radius. 0 with no sources. */
export function ambientDb(src: readonly NoisySource[], x: number, z: number, y?: number): number {
  let best = 0;
  for (let i = 0; i < src.length; i++) {
    const s = src[i]!;
    if (s.radius <= 0 || s.db <= 0) continue;
    const d = y !== undefined && s.y !== undefined ? hyp3(s.x - x, s.y - y, s.z - z) : hyp2(s.x - x, s.z - z);
    if (d >= s.radius) continue;
    const a = s.db * (1 - d / s.radius);
    if (a > best) best = a;
  }
  return best;
}

/** Effective reach (m) of a noise of `reach` after `walls` walls and `ambient` dB of masking at the listener. */
export function effectiveReach(reach: number, walls: number, ambient: number): number {
  const loss = walls * HEARING.wallDb + ambient;
  return loss <= 0 ? reach : reach * Math.pow(10, -loss / 20);
}

/** The tier of a listener `dist` m from a noise whose effective reach at him is `reachEff`; `loud` (unsuppressed
 *  gunfire) adds the combat tier. */
export function hearTier(dist: number, reachEff: number, loud: boolean): HearTier {
  if (!(dist < reachEff * K_TURN)) return 0;
  if (loud && dist < reachEff * K_COMBAT) return 3;
  if (dist < reachEff * K_INVESTIGATE) return 2;
  return 1;
}

/** Could one wall change this listener's tier? Then (and only then) the wall ray is worth casting. */
export function wallMatters(dist: number, reachEff: number, loud: boolean): boolean {
  return hearTier(dist, reachEff, loud) !== hearTier(dist, reachEff * K_WALL, loud);
}

/** (guard-ai S26) Hearing in a fight and a search. `tier`: the lowest hearing tier that counts (1 = anywhere inside the
 *  effective reach; A156). `gap`: s between two re-aims of one guard. `reportGap` / `reportMove`: a heard report of one
 *  intruder at most this often (s) unless it moved this far (m). `switchAfter`: s since his own intruder was last
 *  seen or located before a heard other one takes over (G139, A158). `searchLures`: lures pull searchers (A159).
 *  `bark`: s between two "I heard something." of one guard. `enabled` false: today's deaf rule (A155). */
export const COMBAT_HEAR = {
  enabled: true,
  tier: 1,
  gap: 1.5,
  reportGap: 1,
  reportMove: 1.5,
  switchAfter: 8,
  searchLures: true,
  bark: 6,
} as const;

/** What a guard does with a noise: 0 nothing, 1 look (a searcher walks to it), 2 locate (report its maker's position
 *  as heard; a searcher also walks to it, a guard in combat turns his hunt to it). Pure, no allocation.
 *  state: 0 calm (not handled here: 0), 1 searching, 2 combat. body: a player's own noise (`by` set). lure: a
 *  distraction (bottle, noise maker, camera ping). */
export function combatHearAct(state: 0 | 1 | 2, sees: boolean, tier: HearTier, body: boolean, lure: boolean): 0 | 1 | 2 {
  if (state === 0 || tier < COMBAT_HEAR.tier) return 0;
  if (state === 2) return sees || lure || !body ? 0 : 2;
  if (body) return 2;
  if (lure) return COMBAT_HEAR.searchLures ? 1 : 0;
  return 1;
}
