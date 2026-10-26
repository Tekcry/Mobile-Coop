/**
 * (section-rating S6) Marlow Yard's rated sets (pure, Babylon-free): each set with guards (`BayDef.rated`, A5) is rated
 * on the four stealth marks at its exit, as a Sector Ops section. The course already counts every stat per bay
 * (`BayStats`, cumulative for the results panel); a set's rating reads the rise of its bay's stats since the set began
 * or last restarted (`begin`), so a restart starts the set's rating stats again and never re-rates (A8). Camera / laser
 * alarms break Undetected too (A3, counted here: `BayStats` folds them into `alarms`).
 *
 * Hot paths: `live`, `takedown` and `camera` allocate nothing.
 */
import type { BayDef } from './courseDef';
import { newStats, type BayStats } from './courseState';
import {
  DEFAULT_RULES,
  SyncedDetector,
  newSectionStats,
  rateSection,
  resetSectionStats,
  rewardsFor,
  type Grant,
  type RatingRules,
  type SectionStats,
} from '../rating/sectionRating';

/** Is bay `b` a rated set (A5)? */
export function bayRated(b: BayDef | undefined): boolean {
  return b?.rated === true;
}

/** The bay's name on the rating card and the results line. */
export function bayTitle(b: BayDef): string {
  return b.title ?? b.id;
}

/** Copy every `BayStats` field of `from` into `to` (no allocation). */
function copyStats(to: BayStats, from: BayStats): void {
  to.time = from.time;
  to.detections = from.detections;
  to.alarms = from.alarms;
  to.knockouts = from.knockouts;
  to.kills = from.kills;
  to.revives = from.revives;
  to.teamMoves = from.teamMoves;
  to.bodies = from.bodies;
  to.synced = from.synced;
}

/** A set's rating stats: the rise of the bay's stats `now` over `base`, plus the set's camera alarms. */
export function setStatsInto(out: SectionStats, now: BayStats, base: BayStats, camAlarms: number): SectionStats {
  resetSectionStats(out);
  out.detections = Math.max(0, now.detections - base.detections);
  out.camAlarms = camAlarms;
  out.alarms = Math.max(0, now.alarms - base.alarms);
  out.kills = Math.max(0, now.kills - base.kills);
  out.knockouts = Math.max(0, now.knockouts - base.knockouts);
  out.bodiesMade = out.kills + out.knockouts;
  out.bodiesFound = Math.max(0, now.bodies - base.bodies);
  out.synced = Math.max(0, now.synced - base.synced);
  return out;
}

/**
 * The grant a course rating earns (as Sector Ops, S2): the reward table (S1) with A9 applied (Bodies hidden's alarm
 * step is +1 gadget charge until guard-ai's stage API lands), gadgets capped at the starting carry `gadgetsAtStart`.
 * (J14 F1, conformance M3, G126) No syringe in Course mode, co-op or solo: the revives stay at 2 a mission, so the card,
 * the wire (`rt.syringe`) and the revive cap agree. Gadget and medkit grants are kept. Sector Ops calls `rewardsFor`.
 */
export function courseGrant(marks: number, synced: number, coop: boolean, preset: number, syringesLeft: number, gadgetsAtStart: number): Grant {
  const r = rewardsFor(marks, synced, { coop, preset, gadgetsAtStart, syringesAtStart: syringesLeft });
  r.gadget = Math.min(gadgetsAtStart, r.gadget + r.alarmStep);
  r.alarmStep = 0;
  r.syringe = 0;
  return r;
}

/** The host's per-set rating state: one per course run. */
export class CourseMarks {
  /** The current set's live rating stats (refreshed by `live`). */
  readonly stats: SectionStats = newSectionStats();
  /** Marks per bay: -1 not rated (yet, or an unrated bay). */
  readonly marks: number[];
  /** Synced takedowns per rated bay (0 otherwise). */
  readonly synced: number[];
  /** Camera / laser alarms in the current set since it began or restarted. */
  camAlarms = 0;
  private readonly base: BayStats = newStats();
  private readonly sync = new SyncedDetector();
  private bay = -1;

  constructor(bays: number) {
    this.marks = new Array<number>(bays).fill(-1);
    this.synced = new Array<number>(bays).fill(0);
  }

  /** The bay whose set is being counted (-1 before any). */
  get current(): number {
    return this.bay;
  }

  /** Set `bay` begins or restarts with its stats at `s`: its rating stats start from here (a restart never re-rates). */
  begin(bay: number, s: BayStats): void {
    this.bay = bay;
    copyStats(this.base, s);
    this.camAlarms = 0;
    this.sync.reset();
    resetSectionStats(this.stats);
  }

  /** A camera or laser alarm in the current set (A3: breaks Undetected). */
  camera(): void {
    this.camAlarms++;
  }

  /** A knock-out by player `p` at course time `t`: true when it completes a synced pair (A6; the caller records it). */
  takedown(p: number, t: number): boolean {
    return this.sync.onTakedown(p, t);
  }

  /** The current set's rating stats from its bay's stats `s` now (into `stats`). */
  live(s: BayStats): SectionStats {
    return setStatsInto(this.stats, s, this.base, this.camAlarms);
  }

  /**
   * Rate bay `bay` (its stats `s`) once: the marks, or -1 when the bay is unrated, already rated or not the set being
   * counted (a start-at skipped it).
   */
  rate(bay: number, def: BayDef | undefined, s: BayStats, rules: Readonly<RatingRules> = DEFAULT_RULES): number {
    if (!bayRated(def) || bay !== this.bay || (this.marks[bay] ?? 0) >= 0) return -1;
    const st = this.live(s);
    const m = rateSection(st, rules);
    this.marks[bay] = m;
    this.synced[bay] = st.synced;
    return m;
  }
}
