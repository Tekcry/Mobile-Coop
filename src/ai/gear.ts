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
import { COOP4 } from './intruders';

/** Gear numbers: a helmet soaks `helmetHits` head hits; stagger (s) on a knock-off / a vest hit (vest at most every `staggerCd` s); `armourMult` = damage multiplier of a vest-stopped body hit.
 *  (guard-rules S1, A2, G350) `lockHelmets`: a locked helmet (`GuardGear.helmetLocked`, Perfectionist) is never shot off;
 *  it soaks the first headshot (a stagger, no knock-off) and the second headshot kills (G307 (2)). Undo: false (a locked
 *  helmet comes off on the first headshot, as on Realistic). */
export const GEAR = { helmetHits: 1, helmetStagger: 0.9, armourStagger: 0.5, staggerCd: 1.5, armourMult: 0, lockHelmets: true } as const;

/** The gear a tag names (`GuardSlotTags.gear`, `SectorDef.gear`). (guard-rules S1, A15) Sector Ops data may only name
 *  `armour` (late armour, G307 (13)): helmets come from the difficulty and the alarm stage (`checkSectorGuards`). */
export type GearTag = 'helmet' | 'armour' | 'both';

/** What one guard wears. */
export interface GuardGear {
  helmet: boolean;
  armour: boolean;
  /** (guard-rules S1, A2) His helmet cannot be shot off (Perfectionist); absent = unchanged by `setGear`. */
  helmetLocked?: boolean;
  /** (guard-rules S1, A2) His locked helmet has soaked its one headshot (the next kills); absent = unchanged. */
  helmetSoaked?: boolean;
}

/** Gear every guard gets by alarm stage (index = stage 0..3): none, none, armour + helmet, armour + helmet.
 *  (guard-rules S1, A3) Stage 2 gives the helmet too (bible 5.7 "Level 2: more guards wear helmets and armour"); undo:
 *  `GEAR_BY_STAGE[2].helmet` false (CT's order: armour at 2, the helmet at 3). */
export const GEAR_BY_STAGE: readonly GuardGear[] = [
  { helmet: false, armour: false },
  { helmet: false, armour: false },
  { helmet: true, armour: true },
  { helmet: true, armour: true },
];

/** Response team shape: the shield guard leads when asked (`responseTeam`'s `shield`; Sector Ops: `SectorDef.shieldTeams`) and always wears a helmet; `liveTeam` = the team outside Sector Ops (3 armed guards, no shield lead: guard-rules A14). */
export const RESPONSE = { shieldLead: true, shieldHelmet: true, liveTeam: 3 } as const;

/** Sweep numbers: thin route / post points to one per `thin` m, look `dwell` s at each, followers stack `gap` m behind the leader.
 *  (guard-ai sweep fix) A leader held short of his point (his way still to go along his route not cut by `stallGain` m in
 *  `stall` s: a jam at a door, another team on his way, a wall corner, a shuffle at a jam) replans once, then gives the
 *  point up (`SweepTeam.lead`). A new route `stallJump` m longer than his best restarts the count (a replan's detour). */
export const SWEEP = { enabled: true, thin: 8, dwell: 6, gap: 2.5, stall: 5, stallGain: 0.5, stallJump: 2 } as const;

/** (coop4 AI5) From `COOP4.from` 3 players: `own` (A176) a team sweeps from its own intruder's last known position
 *  (`SweepTeam.hunt`; unknown: the freshest, A150); `dedupe` (A177) a team skips a point another sweeping team of the
 *  section heads for or looks at within `SWEEP.thin` (`pointBusy`; all busy: it goes anyway). Undo: false. */
export const SWEEP4: { readonly own: boolean; readonly dedupe: boolean } = { own: true, dedupe: true };

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

/** What gear does to one hit: damage multiplier (1 = unchanged), helmet knocked off, stagger seconds (0 = none), and
 *  (guard-rules S1) `soak`: a locked helmet took its one headshot (the caller records `helmetSoaked`). */
export interface GearHit {
  mult: number;
  knockOff: boolean;
  stagger: number;
  soak: boolean;
}

/**
 * How `gear` changes one hit into `out`. Only a lethal bullet is affected (melee, explosions and `nonLethal` sleep bolts
 * are not). Head + helmet: no damage, the helmet comes off, stagger `helmetStagger` (always: the knock-off is its own
 * event). (guard-rules S1, A2) Head + locked helmet (`helmetLocked`, `GEAR.lockHelmets`): not yet soaked = no damage, no
 * knock-off, stagger `helmetStagger`, `soak`; soaked = the bare-head result (the caller kills), the helmet stays on.
 * Head, no helmet: unchanged (the caller kills as before). Body + armour: no damage (`armourMult`), stagger
 * `armourStagger` only when `sinceStagger` (s since his last stagger) is at least `staggerCd`. Body, no armour: unchanged.
 * Returns `out`.
 */
export function gearHit(part: HitPart, kind: HitInfo['kind'], nonLethal: boolean, gear: GuardGear, sinceStagger: number, out: GearHit): GearHit {
  out.mult = 1;
  out.knockOff = false;
  out.stagger = 0;
  out.soak = false;
  if (kind !== 'bullet' || nonLethal) return out;
  if (part === 'head') {
    if (gear.helmet && gear.helmetLocked === true && GEAR.lockHelmets) {
      if (gear.helmetSoaked !== true) {
        out.mult = 0;
        out.stagger = GEAR.helmetStagger;
        out.soak = true;
      }
    } else if (gear.helmet) {
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
 * `shield` (default `RESPONSE.shieldLead`), the rest `grunt`. (guard-rules S1, A4, A14, M2) Every caller names it:
 * Sector Ops passes `SectorDef.shieldTeams` (S4 / S5 only; the campaign never), the live maps (Marlow Yard) false. Stage < 1 or `perStage` < 1 = no team
 * (`out` emptied). Returns the count.
 */
export function responseTeam(stage: number, perStage: number, out: EnemyKind[], shield: boolean = RESPONSE.shieldLead): number {
  if (!(stage >= 1) || !(perStage >= 1)) {
    out.length = 0;
    return 0;
  }
  const n = Math.floor(perStage);
  out.length = n;
  for (let i = 0; i < n; i++) out[i] = i === 0 && shield ? 'enforcer' : 'grunt';
  return n;
}

/**
 * (coop4 AI5, A175) The response's size by player count: `extraPerPlayer` guards more per player past 2, and two teams
 * once a stage sends `splitAt` or more (from `COOP4.from` 3 players only). Undo: `extraPerPlayer: 0`, `splitAt:
 * Infinity`. A section overrides either (`ResponseShapeOverride`, Sector Ops' `SectorDef`).
 */
export const RESPONSE_N: { readonly extraPerPlayer: number; readonly splitAt: number } = { extraPerPlayer: 1, splitAt: 4 };

/** (coop4 AI5) A section's own response numbers (Sector Ops: `SectorDef.responseShape`); a field left out: `RESPONSE_N`'s. */
export interface ResponseShapeOverride {
  readonly extraPerPlayer?: number;
  readonly splitAt?: number;
}

/** (coop4 AI5) What a stage sends: `size` guards in all, in `teams` response teams (0: no team, as `responseTeam`). */
export interface ResponseShape {
  teams: number;
  size: number;
}

/**
 * (coop4 AI5, A175) The response of alarm stage `stage` into `out`: `perStage` (the section's count) plus
 * `extraPerPlayer` x (`players` - 2) from 3 players, the extras clamped to `headroom` (the live cap's room, `maxAlive -
 * alive`) beyond `perStage` (the base is never cut: under the cap today's guards wait for room as before); `teams` 2
 * when 3+ players and `size >= splitAt`, else 1 (0 when stage < 1 or no guard: `responseTeam`'s rule). 1-2 players:
 * `size = perStage`, one team: today exactly. `over`: the section's override. Members split evenly (`responseTeamSize`),
 * a shield lead per team (`responseTeam` per team). No allocation. Returns `out`.
 */
export function responseShape(stage: number, perStage: number, players: number, headroom: number, out: ResponseShape, over: ResponseShapeOverride | null = null): ResponseShape {
  const base = perStage >= 1 ? Math.floor(perStage) : 0;
  out.size = base;
  out.teams = stage >= 1 && base >= 1 ? 1 : 0;
  if (!(players >= COOP4.from) || base < 1) return out;
  const per = over?.extraPerPlayer ?? RESPONSE_N.extraPerPlayer;
  const split = over?.splitAt ?? RESPONSE_N.splitAt;
  const want = per > 0 ? Math.floor(per * (Math.floor(players) - 2)) : 0;
  const room = headroom > base ? Math.floor(headroom) - base : 0;
  out.size = base + Math.min(want, room);
  if (out.teams === 1 && out.size >= split && out.size >= 2) out.teams = 2;
  return out;
}

/** (coop4 AI5) How many of `size` guards go to team `k` of `teams`: evenly, the first teams one more on a remainder. */
export function responseTeamSize(k: number, size: number, teams: number): number {
  if (!(teams >= 1) || !(size >= 1) || k < 0 || k >= teams) return 0;
  const q = Math.floor(size / teams);
  return q + (k < size % teams ? 1 : 0);
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

/**
 * Team `team`'s first sweep point (an index into `count` points): teams start about a third of the loop apart; count <=
 * 0 = 0. (coop4 AI5, A177) `spread`: how many teams a section may hold (Sector Ops: `SECTOR.alarmMax` x teams per
 * stage); above 3 the teams start `count / spread` apart (`floor(team x count / spread) % count`), so team 3+ no longer
 * lands on team 0's point. 3 or less: today's thirds exactly (undo: pass 3).
 */
export function sweepStart(team: number, count: number, spread = 3): number {
  if (!(count > 0)) return 0;
  const t = team >= 0 ? Math.floor(team) : 0;
  if (spread > 3) return Math.floor((t * count) / Math.floor(spread)) % count;
  return (t * Math.max(1, Math.ceil(count / 3))) % count;
}
