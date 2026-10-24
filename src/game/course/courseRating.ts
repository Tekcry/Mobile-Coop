/**
 * Course results and the finale's ghost rating (training course, T1c, D31 / D32; pure, Babylon-free).
 *
 * The drill bays are never rated (D31: kills and forced takedowns carry no penalty there). The finale (the course's
 * last bay, B9 on the bunker) gets a tier: Ghost (never seen, nobody touched, no body found), Silent (no alarm, no
 * kill: knock-outs only), else Loud. Within a tier, detections, alarms and bodies found lower the points; time breaks
 * ties.
 */
import type { CourseDef } from './courseDef';
import { newStats, type BayStats } from './courseState';

export type GhostTier = 'ghost' | 'silent' | 'loud';

export const TIER_LABEL: Record<GhostTier, string> = { ghost: 'Ghost', silent: 'Silent', loud: 'Loud' };
const TIER_RANK: Record<GhostTier, number> = { ghost: 2, silent: 1, loud: 0 };

/** Points lost per detection, alarm and body found (within the tier). */
export const RATING_COST = { detection: 100, alarm: 200, body: 150 } as const;
/** Points a run starts with in its tier. */
export const RATING_BASE = 1000;

export interface FinaleRating {
  tier: GhostTier;
  points: number;
  time: number;
}

export function rateFinale(s: BayStats): FinaleRating {
  const touched = s.knockouts > 0 || s.kills > 0;
  const tier: GhostTier =
    s.detections === 0 && s.alarms === 0 && s.bodies === 0 && !touched ? 'ghost' : s.alarms === 0 && s.kills === 0 ? 'silent' : 'loud';
  const points = Math.max(0, RATING_BASE - s.detections * RATING_COST.detection - s.alarms * RATING_COST.alarm - s.bodies * RATING_COST.body);
  return { tier, points, time: s.time };
}

/** > 0 when `a` is the better run: tier, then points, then the shorter time. */
export function compareRatings(a: FinaleRating, b: FinaleRating): number {
  const t = TIER_RANK[a.tier] - TIER_RANK[b.tier];
  if (t !== 0) return t;
  if (a.points !== b.points) return a.points - b.points;
  return b.time - a.time;
}

export interface CourseSummary {
  courseId: string;
  bays: { id: string; time: number }[];
  team: BayStats;
  /** P1, P2 (only what is attributed to a player). */
  players: [BayStats, BayStats];
  /** The finale's rating (null when the course has a single bay or the finale was not played). */
  finale: (FinaleRating & { bay: string }) | null;
}

/** The results panel's numbers from the course's stats (per bay, team and per player). */
export function summarise(def: CourseDef, stats: readonly BayStats[], pstats: readonly [BayStats, BayStats], startBay = 0): CourseSummary {
  const team: BayStats = newStats();
  const bays: { id: string; time: number }[] = [];
  def.bays.forEach((b, i) => {
    const s = stats[i];
    if (!s || i < startBay) return;
    bays.push({ id: b.id, time: s.time });
    for (const k of Object.keys(team) as (keyof BayStats)[]) team[k] += s[k] ?? 0;
  });
  const last = def.bays.length - 1;
  const fs = stats[last];
  const finale = last > 0 && fs ? { ...rateFinale(fs), bay: def.bays[last]!.id } : null;
  return { courseId: def.id, bays, team, players: [{ ...pstats[0] }, { ...pstats[1] }], finale };
}

/** m:ss (results, lobby). */
export function fmtCourseTime(s: number): string {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
