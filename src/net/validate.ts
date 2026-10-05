/**
 * Host-side checks for client claims (shots, grenades, end-of-match stats). Pure and unit-tested:
 * no Babylon or DOM, so the rules can be reasoned about in isolation.
 */
import type { WeaponDef } from '../weapons/weaponDefs';
import { computeStats, damageAt, MAX_UPGRADE } from '../weapons/weaponStats';
import { killScore, waveClearBonus } from '../game/modes/waveLogic';
import type { EndStats } from './protocol';
import type { SessionStats } from '../game/modes/gameMode';
import { ENEMY_KINDS } from '../ai/enemyDefs';
import { hyp2, hyp3 } from '../core/mathx';

export interface V3 {
  x: number;
  y: number;
  z: number;
}

/** Token bucket: `capacity` burst, refilled at `perSecond`. */
export class RateLimiter {
  private tokens: number;
  private last = -Infinity;

  constructor(
    private capacity: number,
    private perSecond: number,
  ) {
    this.tokens = capacity;
  }

  take(now: number, n = 1): boolean {
    if (this.last > -Infinity) this.tokens = Math.min(this.capacity, this.tokens + (now - this.last) * this.perSecond);
    this.last = now;
    if (this.tokens < n) return false;
    this.tokens -= n;
    return true;
  }
}

/** Hits per second a weapon can legitimately land (every pellet hitting), with 30% slack for jitter. */
export function shotLimiter(def: WeaponDef): RateLimiter {
  return new RateLimiter(def.pellets * 3, ((def.rpm / 60) * def.pellets) * 1.3);
}

/** Highest per-hit damage possible with full upgrades and no falloff. */
export function maxHitDamage(def: WeaponDef, head: boolean): number {
  const st = computeStats(def, { damage: MAX_UPGRADE, magazine: MAX_UPGRADE, recoil: MAX_UPGRADE, reload: MAX_UPGRADE });
  return damageAt(def, st, 0, head) * 1.02;
}

/** Distance of point p from the ray o + d*t (t >= 0), and t. */
export function rayPointDistance(o: V3, d: V3, p: V3): { along: number; perp: number } {
  const px = p.x - o.x;
  const py = p.y - o.y;
  const pz = p.z - o.z;
  const along = Math.max(0, px * d.x + py * d.y + pz * d.z);
  const cx = o.x + d.x * along - p.x;
  const cy = o.y + d.y * along - p.y;
  const cz = o.z + d.z * along - p.z;
  return { along, perp: hyp3(cx, cy, cz) };
}

export interface ShotClaim {
  origin: V3;
  dir: V3;
  part: 'head' | 'body';
}

export type ShotVerdict = { ok: true; distance: number } | { ok: false; reason: 'origin' | 'range' | 'miss' };

/**
 * Geometry check against the (lag-compensated) target position.
 * - the shot must start near the shooter (camera boom / muzzle offset, plus movement since the last state);
 * - it must pass within `tolerance` of the target's body centre (or head for headshots);
 * - and be within weapon range.
 */
export function checkShot(c: ShotClaim, shooterFeet: V3, targetBody: V3, targetHead: V3, range: number, tolerance = 1.1): ShotVerdict {
  const dx = c.origin.x - shooterFeet.x;
  const dz = c.origin.z - shooterFeet.z;
  const dy = c.origin.y - shooterFeet.y;
  if (hyp2(dx, dz) > 3.5 || dy < -1 || dy > 3) return { ok: false, reason: 'origin' };
  const aim = c.part === 'head' ? targetHead : targetBody;
  const r = rayPointDistance(c.origin, c.dir, aim);
  if (r.along > range + 2) return { ok: false, reason: 'range' };
  if (r.perp > (c.part === 'head' ? tolerance * 0.7 : tolerance)) return { ok: false, reason: 'miss' };
  return { ok: true, distance: r.along };
}

/** Grenade detonations must be near the thrower (throw range + roll) and rate-limited. */
export function checkBlast(p: V3, shooterFeet: V3): boolean {
  return hyp2(p.x - shooterFeet.x, p.z - shooterFeet.z) < 38 && Math.abs(p.y - shooterFeet.y) < 15;
}

type PlayerEnd = EndStats['players'][string];

/**
 * Clamp a host-reported result to what is physically possible in `time` seconds: kill rate,
 * headshots <= kills, per-kind/per-weapon totals <= kills, waves by minimum wave length, and a
 * score bounded by the best possible kill scores plus wave bonuses.
 */
export function clampEnd(stats: EndStats, time: number): EndStats {
  const t = Math.max(0, time);
  const waves = Math.min(stats.waves, Math.floor(t / 10) + 1);
  const players: EndStats['players'] = {};
  let totalKills = 0;
  for (const [id, p] of Object.entries(stats.players)) {
    const kills = Math.min(p.kills, Math.ceil(t * 1.5) + 2);
    totalKills += kills;
    const headshots = Math.min(p.headshots, kills);
    const byKind = { ...p.byKind };
    let sum = 0;
    for (const k of ENEMY_KINDS) {
      byKind[k] = Math.max(0, Math.min(byKind[k], kills - sum));
      sum += byKind[k];
    }
    const weaponKills: Record<string, number> = {};
    let wsum = 0;
    for (const [w, n] of Object.entries(p.weaponKills)) {
      const c = Math.max(0, Math.min(n, kills - wsum));
      weaponKills[w] = c;
      wsum += c;
    }
    players[id] = { kills, headshots, byKind, weaponKills } satisfies PlayerEnd;
  }
  let bonus = 0;
  for (let w = 1; w <= waves; w++) bonus += waveClearBonus(w);
  const maxScore = totalKills * killScore('heavy', true, waves + 1) + bonus;
  return { ...stats, waves, score: Math.min(stats.score, maxScore), players };
}

/** Build the local SessionStats for rewards from the host's (clamped) end report. */
export function coopSessionStats(base: SessionStats, end: EndStats, selfId: string): SessionStats {
  const me = end.players[selfId];
  return {
    ...base,
    won: end.won,
    waves: end.waves,
    score: end.score,
    kills: me?.kills ?? 0,
    headshots: me?.headshots ?? 0,
    byKind: me ? { ...me.byKind } : { grunt: 0, runner: 0, heavy: 0 },
    weaponKills: me ? { ...me.weaponKills } : {},
  };
}
