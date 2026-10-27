/**
 * Section rating (section-rating S1; pure, Babylon-free, no net imports).
 *
 * Four stealth marks per section (undetected, no kills, no alarms, bodies hidden) and a synced-takedown count turn into
 * an in-run top-up for the next section (BRIEF R1 + R4). Rewards top up what the player already carries: they never add
 * new kit. All numbers sit in the tables below.
 */
import type { GadgetId } from '../gadgets';
import { PLAYER_SLOTS, isPlayerSlot } from '../playerSlots';

/**
 * The gadgets a rating's charges top up, in order: the noisemaker first, then sleeping gas (the stealth tools; the
 * pistol jammer's charge is per use, not carried). Each is capped at its starting carry, on the host and the client.
 */
export const GRANT_GADGETS: readonly GadgetId[] = ['noise', 'gas'];

/** Marks bitmask. */
export const UNDETECTED = 1;
export const NO_KILLS = 2;
export const NO_ALARMS = 4;
export const BODIES_HIDDEN = 8;
export const ALL_MARKS = UNDETECTED | NO_KILLS | NO_ALARMS | BODIES_HIDDEN;

/** Two takedowns by two different players within this many seconds are one synced takedown (A6). */
export const SYNC_WINDOW = 1.5;
/** Synced takedowns that pay (more are counted and shown, not paid). */
export const SYNCED_PAID_MAX = 2;
/** Syringes may end at most this many over the preset. */
export const SYRINGE_OVER_PRESET = 2;

export interface SectionStats {
  /** Guard detections of a player. */
  detections: number;
  /** Camera alarms. */
  camAlarms: number;
  /** Alarms raised. */
  alarms: number;
  kills: number;
  knockouts: number;
  /** Bodies the players made (takedowns and kills). */
  bodiesMade: number;
  /** Bodies a guard found. */
  bodiesFound: number;
  /** Synced takedowns. */
  synced: number;
}

export function newSectionStats(): SectionStats {
  return { detections: 0, camAlarms: 0, alarms: 0, kills: 0, knockouts: 0, bodiesMade: 0, bodiesFound: 0, synced: 0 };
}

/** Zero every counter in place (no allocation). */
export function resetSectionStats(s: SectionStats): void {
  s.detections = 0;
  s.camAlarms = 0;
  s.alarms = 0;
  s.kills = 0;
  s.knockouts = 0;
  s.bodiesMade = 0;
  s.bodiesFound = 0;
  s.synced = 0;
}

/** The A2-A4 flags (BRIEF defaults in DEFAULT_RULES). */
export interface RatingRules {
  /** A2: a knock-out breaks No kills (default false). */
  knockoutsBreakNoKills: boolean;
  /** A3: a camera alarm breaks Undetected (default true). */
  cameraBreaksUndetected: boolean;
  /** A4: Bodies hidden needs at least one body made (default false: a clean section earns it). */
  bodiesHiddenNeedsBody: boolean;
}

export const DEFAULT_RULES: Readonly<RatingRules> = {
  knockoutsBreakNoKills: false,
  cameraBreaksUndetected: true,
  bodiesHiddenNeedsBody: false,
};

/** Marks bitmask for a section's stats. */
export function rateSection(s: SectionStats, rules: Readonly<RatingRules> = DEFAULT_RULES): number {
  let m = 0;
  if (s.detections === 0 && (!rules.cameraBreaksUndetected || s.camAlarms === 0)) m |= UNDETECTED;
  if (s.kills === 0 && (!rules.knockoutsBreakNoKills || s.knockouts === 0)) m |= NO_KILLS;
  if (s.alarms === 0) m |= NO_ALARMS;
  if (s.bodiesFound === 0 && (!rules.bodiesHiddenNeedsBody || s.bodiesMade > 0)) m |= BODIES_HIDDEN;
  return m;
}

/** Number of marks set. */
export function markCount(marks: number): number {
  let n = 0;
  for (let b = 1; b <= BODIES_HIDDEN; b <<= 1) if ((marks & b) !== 0) n++;
  return n;
}

/** What the next section gets. */
export interface Grant {
  gadget: number;
  syringe: number;
  medkit: number;
  /** Next section's first alarm stage is skipped this many steps (guard-ai interface). */
  alarmStep: number;
}

export interface RewardCtx {
  coop: boolean;
  /** Preset syringe count of the run. */
  preset: number;
  gadgetsAtStart: number;
  syringesAtStart: number;
}

/**
 * (S6 fix) Whether a rating pays the co-op column: a partner is in the match at rating time (`players` counts the local
 * player too), not merely a net session (a host alone in a co-op room is rated solo: medkits, not syringes).
 */
export function coopRating(hasNet: boolean, players: number): boolean {
  return hasNet && players > 1;
}

/** One row per mark (A1). Co-op column, then the solo column (A7: syringes become medkits, no revives solo). */
const MARK_REWARD: Record<number, { coop: Grant; solo: Grant }> = {
  [UNDETECTED]: { coop: { gadget: 1, syringe: 0, medkit: 0, alarmStep: 0 }, solo: { gadget: 1, syringe: 0, medkit: 0, alarmStep: 0 } },
  [NO_KILLS]: { coop: { gadget: 0, syringe: 0, medkit: 1, alarmStep: 0 }, solo: { gadget: 0, syringe: 0, medkit: 1, alarmStep: 0 } },
  [NO_ALARMS]: { coop: { gadget: 0, syringe: 1, medkit: 0, alarmStep: 0 }, solo: { gadget: 0, syringe: 0, medkit: 1, alarmStep: 0 } },
  [BODIES_HIDDEN]: { coop: { gadget: 0, syringe: 0, medkit: 0, alarmStep: 1 }, solo: { gadget: 0, syringe: 0, medkit: 0, alarmStep: 1 } },
};
const MARK_BITS: readonly number[] = [UNDETECTED, NO_KILLS, NO_ALARMS, BODIES_HIDDEN];

/** Per paid synced takedown (R4): more than any mark, and shooting gives nothing. Solo can only reach it via addSynced. */
const SYNCED_REWARD: { coop: Grant; solo: Grant } = {
  coop: { gadget: 1, syringe: 1, medkit: 0, alarmStep: 0 },
  solo: { gadget: 1, syringe: 0, medkit: 1, alarmStep: 0 },
};

export function emptyGrant(): Grant {
  return { gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 };
}

/** (marlow-polish P2-1) One results line per section: replaces the line with `v.sectionId` in place, else appends `v`. */
export function putRating<T extends { sectionId: string }>(list: T[], v: T): void {
  for (let i = 0; i < list.length; i++) {
    if (list[i]!.sectionId === v.sectionId) {
      list[i] = v;
      return;
    }
  }
  list.push(v);
}

function add(g: Grant, r: Readonly<Grant>, n: number): void {
  g.gadget += r.gadget * n;
  g.syringe += r.syringe * n;
  g.medkit += r.medkit * n;
  g.alarmStep += r.alarmStep * n;
}

/** The grant for a rating. Caps: gadgets never above the starting count; syringes at most preset + 2. */
export function rewardsFor(marks: number, synced: number, ctx: Readonly<RewardCtx>): Grant {
  const g = emptyGrant();
  for (const bit of MARK_BITS) {
    if ((marks & bit) === 0) continue;
    const row = MARK_REWARD[bit];
    if (row) add(g, ctx.coop ? row.coop : row.solo, 1);
  }
  const paid = Math.min(Math.max(0, Math.floor(synced)), SYNCED_PAID_MAX);
  add(g, ctx.coop ? SYNCED_REWARD.coop : SYNCED_REWARD.solo, paid);
  g.gadget = Math.min(g.gadget, Math.max(0, ctx.gadgetsAtStart));
  g.syringe = Math.min(g.syringe, Math.max(0, ctx.preset + SYRINGE_OVER_PRESET - ctx.syringesAtStart));
  return g;
}

export const RATING_LABEL = {
  [UNDETECTED]: 'Undetected',
  [NO_KILLS]: 'No kills',
  [NO_ALARMS]: 'No alarms',
  [BODIES_HIDDEN]: 'Bodies hidden',
  synced: 'Synced',
  title: 'Section rating',
} as const;

/** Mark label by bit, in card order. */
export const MARK_LABELS: readonly { bit: number; label: string }[] = [
  { bit: UNDETECTED, label: RATING_LABEL[UNDETECTED] },
  { bit: NO_KILLS, label: RATING_LABEL[NO_KILLS] },
  { bit: NO_ALARMS, label: RATING_LABEL[NO_ALARMS] },
  { bit: BODIES_HIDDEN, label: RATING_LABEL[BODIES_HIDDEN] },
];

/**
 * Detects two takedowns by two different players within SYNC_WINDOW. Fixed slots, no allocation. (coop4 A13) Over
 * `PLAYER_SLOTS`: a takedown by slot p pairs with the most recent unused one by any other slot within the window and
 * both are used; a third in the window starts a new pair. With slots 0 and 1 only (the course) it is the 2-player rule.
 */
export class SyncedDetector {
  /** Last unused takedown time per slot, -Infinity when none or used. */
  private readonly last: number[] = [];
  private count = 0;

  constructor() {
    for (let s = 0; s < PLAYER_SLOTS; s++) this.last.push(-Infinity);
  }

  /** Record a takedown by `player` (its slot 0..3; anything else reads as 1, as before) at time `t` (s). True when it completes a synced pair. */
  onTakedown(player: number, t: number): boolean {
    const me = isPlayerSlot(player) ? player : 1;
    let best = -1;
    let bt = -Infinity;
    for (let s = 0; s < PLAYER_SLOTS; s++) {
      if (s === me) continue;
      const o = this.last[s] ?? -Infinity;
      if (t >= o && t - o <= SYNC_WINDOW && o > bt) {
        bt = o;
        best = s;
      }
    }
    if (best >= 0) {
      this.last[best] = -Infinity;
      this.last[me] = -Infinity;
      this.count++;
      return true;
    }
    this.last[me] = t;
    return false;
  }

  /** A direct synced takedown (a future dual move). */
  addSynced(): void {
    this.count++;
  }

  get synced(): number {
    return this.count;
  }

  reset(): void {
    for (let s = 0; s < PLAYER_SLOTS; s++) this.last[s] = -Infinity;
    this.count = 0;
  }
}
