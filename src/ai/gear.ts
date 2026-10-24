/**
 * Stealth over shooting: gear, response teams and the section sweep (pure: no Babylon / DOM), unit-tested (guard-ai
 * S11; `docs/guard-ai/research/stealth-over-shooting.md` items 2, 3, 4, 11, 13 and "Shared numbers"). Data and pure
 * functions only: `Enemy` / `EnemyManager` read them in S12 / S13 / S14. Every number is a prototype starting value (G4).
 *
 * Gear: a guard may wear a helmet (the first bullet to the head is soaked and knocks it off) and body armour (bullets to
 * the body only stagger). Takedowns, grabs, sleep bolts, melee and explosions ignore both. Gear comes from a slot tag, a
 * section default, or the alarm stage (`GEAR_BY_STAGE`).
 *
 * Allocation-free per call: every function writes into the caller's `out`. `sweepPoints` runs at load time (once per
 * team) and may allocate a temporary index array.
 */
import type { HitInfo, HitPart } from '../game/damage';
import type { EnemyKind } from './enemyDefs';

/** Gear numbers: a helmet soaks `helmetHits` head hits; stagger (s) on a knock-off / a vest hit (vest at most every `staggerCd` s); `armourMult` = damage multiplier of a vest-stopped body hit. */
export const GEAR = { helmetHits: 1, helmetStagger: 0.9, armourStagger: 0.5, staggerCd: 1.5, armourMult: 0 } as const;

/** The gear a tag names (`GuardSlotTags.gear`, `SectorDef.gear`). */
export type GearTag = 'helmet' | 'armour' | 'both';

/** What one guard wears. */
export interface GuardGear {
  helmet: boolean;
  armour: boolean;
}

/** Gear every guard gets by alarm stage (index = stage 0..3): none, none, armour, armour + helmet (CT's order). */
export const GEAR_BY_STAGE: readonly GuardGear[] = [
  { helmet: false, armour: false },
  { helmet: false, armour: false },
  { helmet: false, armour: true },
  { helmet: true, armour: true },
];

/** Response team shape: the shield guard leads and always wears a helmet; `liveTeam` = shield + 2 guards outside Sector Ops. */
export const RESPONSE = { shieldLead: true, shieldHelmet: true, liveTeam: 3 } as const;

/** Sweep numbers: thin route / post points to one per `thin` m, look `dwell` s at each, followers stack `gap` m behind the leader.
 *  (guard-ai sweep fix) A leader held short of his point (his way still to go along his route not cut by `stallGain` m in
 *  `stall` s: a jam at a door, another team on his way, a wall corner, a shuffle at a jam) replans once, then gives the
 *  point up (`SweepTeam.lead`). A new route `stallJump` m longer than his best restarts the count (a replan's detour). */
export const SWEEP = { enabled: true, thin: 8, dwell: 6, gap: 2.5, stall: 5, stallGain: 0.5, stallJump: 2 } as const;

/** A missed check-in makes the section cautious for `cautious` s (S13). */
export const MISSING = { sectionCaution: true, cautious: 180 } as const;

/** A loud shot starts a section call; the section is cautious for `cautious` s and a pair is sent (S14). */
export const SHOTS = { sectionCall: true, cautious: 120, pair: true } as const;

/** A breaker cut is reset after `resetT` s; a second cut of the same circuit within `repeatT` s is tampering (S14). */
export const BREAKER = { reset: true, resetT: 2, repeatT: 60 } as const;

/** Late discovery: a calm guard who sees a dead fixture within `range` m reacts as a witness would (S14). */
export const LATE = { enabled: true, range: 12 } as const;

/**
 * (guard-ai S17, Michael's walk of 4.72 G1: "change it so they come to look where the laser is and search the room") A
 * tripped device (a laser beam broken, a camera's alarm) is an incident at the device, never the player's live
 * position: `want` calm guards within `callR` m (best by path) go to the spot and search its room; nobody in range, the
 * report waits `wait` s for one, then lapses. Alarm reinforcements that come in within `fresh` s of it, with no
 * sighting since, search the spot too instead of going to combat. `enabled` false: the old way (no incident;
 * reinforcements in combat, where a missing last known position leaves them on the player).
 */
export const DEVICE = { enabled: true, want: 2, callR: 30, wait: 20, fresh: 90 } as const;

/**
 * (guard-ai S18, Michael's walk of 4.72 G2: "guards investigating dead bodies give up too easily") A dead body found
 * (S4: the finder and the guard who hears his shout; S7: the guards a camera sent, the second one too) is searched
 * `ALERT.searchTime` x `timeMul` s before the held caution, over a denser ring (`r0`, then every `step` m) out to `max`
 * m round the body (a plain search: 2 m, 2.5 m steps, 11 m), `look` s at each point (`response.ts` `SEARCH`).
 * `timeMul` 1, `r0` 2, `step` 2.5, `max` 11: the plain search again.
 */
export const BODY_SEARCH = { timeMul: 3, r0: 1.5, step: 1.5, max: 15, look: 2.5 } as const;

/**
 * (guard-ai S19, Michael's walk of 4.72 G3: "guards should rush to any triggered alarms or bodies reported, they need a
 * sense of urgency when it makes logical sense") Urgent responders (a tripped device, an alarm's reinforcement, a body a
 * camera or the radio reported, a shots call, a missing man) jog there at the run speed x `PACE.rush` (`response.ts`)
 * until they first reach the spot, then search at the search pace; calm checks (a noise, a lure, a light, a breaker)
 * keep their pace. `bodyHelpers`: calm guards the board sends to a dead body once its finder's radio report gets
 * through. `enabled` false: everyone at the calm paces, no helpers.
 */
export const URGENT = { enabled: true, bodyHelpers: 1 } as const;


/** The gear a tag names into `out` (undefined = none). Returns `out`. */
export function gearFromTag(tag: GearTag | undefined, out: GuardGear): GuardGear {
  out.helmet = tag === 'helmet' || tag === 'both';
  out.armour = tag === 'armour' || tag === 'both';
  return out;
}

/** `a` OR `b` into `out` (`out` may be `a` or `b`). Returns `out`. */
export function mergeGear(a: GuardGear, b: GuardGear, out: GuardGear): GuardGear {
  const helmet = a.helmet || b.helmet;
  const armour = a.armour || b.armour;
  out.helmet = helmet;
  out.armour = armour;
  return out;
}

/** The gear of alarm stage `stage` into `out`; the stage clamps to 0..3 (NaN and negatives are 0). Returns `out`. */
export function stageGear(stage: number, out: GuardGear): GuardGear {
  const last = GEAR_BY_STAGE.length - 1;
  const s = stage >= 0 ? Math.min(Math.floor(stage), last) : 0;
  const g = GEAR_BY_STAGE[s]!;
  out.helmet = g.helmet;
  out.armour = g.armour;
  return out;
}

/** What gear does to one hit: damage multiplier (1 = unchanged), helmet knocked off, stagger seconds (0 = none). */
export interface GearHit {
  mult: number;
  knockOff: boolean;
  stagger: number;
}

/**
 * How `gear` changes one hit into `out`. Only a lethal bullet is affected (melee, explosions and `nonLethal` sleep bolts
 * are not). Head + helmet: no damage, the helmet comes off, stagger `helmetStagger` (always: the knock-off is its own
 * event). Head, no helmet: unchanged (the caller kills as before). Body + armour: no damage (`armourMult`), stagger
 * `armourStagger` only when `sinceStagger` (s since his last stagger) is at least `staggerCd`. Body, no armour: unchanged.
 * Returns `out`.
 */
export function gearHit(part: HitPart, kind: HitInfo['kind'], nonLethal: boolean, gear: GuardGear, sinceStagger: number, out: GearHit): GearHit {
  out.mult = 1;
  out.knockOff = false;
  out.stagger = 0;
  if (kind !== 'bullet' || nonLethal) return out;
  if (part === 'head') {
    if (gear.helmet) {
      out.mult = 0;
      out.knockOff = true;
      out.stagger = GEAR.helmetStagger;
    }
  } else if (gear.armour) {
    out.mult = GEAR.armourMult;
    out.stagger = sinceStagger >= GEAR.staggerCd ? GEAR.armourStagger : 0;
  }
  return out;
}

/**
 * The response team for alarm stage `stage` into `out` (kinds): `perStage` guards, a shield guard (`enforcer`) first when
 * `RESPONSE.shieldLead`, the rest `grunt`. Stage < 1 or `perStage` < 1 = no team (`out` emptied). Returns the count.
 */
export function responseTeam(stage: number, perStage: number, out: EnemyKind[]): number {
  if (!(stage >= 1) || !(perStage >= 1)) {
    out.length = 0;
    return 0;
  }
  const n = Math.floor(perStage);
  out.length = n;
  for (let i = 0; i < n; i++) out[i] = i === 0 && RESPONSE.shieldLead ? 'enforcer' : 'grunt';
  return n;
}

/** Push (x, z) onto the flat `keep` list unless a kept point is closer than sqrt(t2) (load-time helper of `sweepPoints`). */
function keepIfFar(keep: number[], x: number, z: number, t2: number): void {
  for (let k = 0; k < keep.length; k += 2) {
    const dx = keep[k]! - x;
    const dz = keep[k + 1]! - z;
    if (dx * dx + dz * dz < t2) return;
  }
  keep.push(x, z);
}

/**
 * A section's sweep points into `out` as flat x, z pairs (`out.length` = 2 x count); returns the count. Gathers every
 * route point, then every post, keeps a point only when no kept point is closer than `thin` m (greedy, in gather order;
 * points exactly `thin` apart are both kept), then orders the kept points nearest to (`lkpX`, `lkpZ`) first (ties keep
 * gather order). Load-time (once per team): allocates temporary arrays, never call it per step.
 */
export function sweepPoints(
  routes: readonly (readonly (readonly [number, number])[])[],
  posts: readonly (readonly [number, number])[],
  lkpX: number,
  lkpZ: number,
  thin: number,
  out: number[],
): number {
  const keep: number[] = [];
  const t2 = thin * thin;
  for (let r = 0; r < routes.length; r++) {
    const pts = routes[r]!;
    for (let i = 0; i < pts.length; i++) keepIfFar(keep, pts[i]![0], pts[i]![1], t2);
  }
  for (let i = 0; i < posts.length; i++) keepIfFar(keep, posts[i]![0], posts[i]![1], t2);
  const n = keep.length >> 1;
  const idx: number[] = new Array<number>(n);
  const d2: number[] = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    idx[i] = i;
    const dx = keep[2 * i]! - lkpX;
    const dz = keep[2 * i + 1]! - lkpZ;
    d2[i] = dx * dx + dz * dz;
  }
  // insertion sort: stable (ties keep gather order), n is small
  for (let i = 1; i < n; i++) {
    const v = idx[i]!;
    const dv = d2[v]!;
    let j = i - 1;
    while (j >= 0 && d2[idx[j]!]! > dv) {
      idx[j + 1] = idx[j]!;
      j--;
    }
    idx[j + 1] = v;
  }
  out.length = 2 * n;
  for (let i = 0; i < n; i++) {
    out[2 * i] = keep[2 * idx[i]!]!;
    out[2 * i + 1] = keep[2 * idx[i]! + 1]!;
  }
  return n;
}

/** Team `team`'s first sweep point (an index into `count` points): teams start about a third of the loop apart; count <= 0 = 0. */
export function sweepStart(team: number, count: number): number {
  if (!(count > 0)) return 0;
  const t = team >= 0 ? Math.floor(team) : 0;
  return (t * Math.max(1, Math.ceil(count / 3))) % count;
}
