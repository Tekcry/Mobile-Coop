import type { SessionStats } from '../game/modes/gameMode';
import type { Difficulty } from '../ai/enemyDefs';

export const XP_PER_KILL = { grunt: 100, runner: 80, heavy: 260 } as const;
export const CREDITS_PER_KILL = { grunt: 15, runner: 12, heavy: 40 } as const;
const REWARD_MULT: Record<Difficulty, number> = { easy: 0.8, normal: 1, hard: 1.35 };

export interface RewardLine {
  label: string;
  xp: number;
  credits: number;
}

export interface SessionRewards {
  lines: RewardLine[];
  xp: number;
  credits: number;
}

/** Converts session stats into XP and credits. Pure, clamped against nonsense input. */
export function computeRewards(s: SessionStats, difficulty: Difficulty): SessionRewards {
  const lines: RewardLine[] = [];
  const nn = (v: number): number => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  if (s.mode === 'sandbox') return { lines: [], xp: 0, credits: 0 };
  const kinds = ['grunt', 'runner', 'heavy'] as const;
  let kxp = 0;
  let kcr = 0;
  for (const k of kinds) {
    const n = Math.min(nn(s.byKind[k]), 500);
    kxp += n * XP_PER_KILL[k];
    kcr += n * CREDITS_PER_KILL[k];
  }
  if (kxp) lines.push({ label: 'Kills', xp: kxp, credits: kcr });
  const hs = Math.min(nn(s.headshots), 500);
  if (hs) lines.push({ label: 'Headshots', xp: hs * 25, credits: hs * 3 });
  if (s.mode === 'wave') {
    const w = Math.min(nn(s.waves), 100);
    if (w) lines.push({ label: `Waves survived (${w})`, xp: 150 * w + 25 * w * w, credits: 30 * w });
  } else {
    const o = Math.min(nn(s.objectives), s.mode === 'clear' ? 20 : 10);
    if (o && s.mode === 'clear') lines.push({ label: `Rooms cleared (${o})`, xp: 180 * o, credits: 30 * o });
    else if (o) lines.push({ label: `Objectives (${o})`, xp: 300 * o, credits: 50 * o });
  }
  if (s.won) lines.push({ label: 'Victory', xp: 500, credits: 150 });
  const shots = nn(s.shots);
  const acc = shots >= 20 ? nn(s.hits) / shots : 0;
  if (acc >= 0.4) lines.push({ label: `Accuracy ${Math.round(acc * 100)}%`, xp: Math.round(acc * 300), credits: Math.round(acc * 40) });
  const m = REWARD_MULT[difficulty];
  if (m !== 1) {
    const bx = lines.reduce((a, l) => a + l.xp, 0);
    const bc = lines.reduce((a, l) => a + l.credits, 0);
    lines.push({ label: `Difficulty x${m}`, xp: Math.round(bx * (m - 1)), credits: Math.round(bc * (m - 1)) });
  }
  return { lines, xp: lines.reduce((a, l) => a + l.xp, 0), credits: lines.reduce((a, l) => a + l.credits, 0) };
}
