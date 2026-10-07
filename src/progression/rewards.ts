import type { SessionStats } from '../game/modes/gameMode';
import { DIFFICULTY, type Difficulty } from '../ai/archetypes';
import { ENEMIES, ENEMY_KINDS, type EnemyKind } from '../ai/enemyDefs';
import { styleLines } from './suit';

/** Kill rewards per kind (from the enemy defs). */
export const XP_PER_KILL: Record<EnemyKind, number> = Object.fromEntries(ENEMY_KINDS.map((k) => [k, ENEMIES[k].xp])) as Record<EnemyKind, number>;
export const CREDITS_PER_KILL: Record<EnemyKind, number> = Object.fromEntries(ENEMY_KINDS.map((k) => [k, ENEMIES[k].credits])) as Record<EnemyKind, number>;

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
  // the training course pays a small one-off-sized thank-you each time (nothing to farm)
  if (s.mode === 'training') return s.won ? { lines: [{ label: 'Training complete', xp: 300, credits: 50 }], xp: 300, credits: 50 } : { lines: [], xp: 0, credits: 0 };
  // PvP: eliminations, headshots, the result (no difficulty)
  if (s.mode === 'tdm' || s.mode === 'ffa') {
    const k = Math.min(nn(s.kills), 300);
    const hs = Math.min(nn(s.headshots), k);
    if (k) lines.push({ label: `Eliminations (${k})`, xp: k * 120, credits: k * 15 });
    if (hs) lines.push({ label: 'Headshots', xp: hs * 40, credits: hs * 4 });
    lines.push(s.won ? { label: 'Match won', xp: 800, credits: 150 } : { label: 'Match played', xp: 300, credits: 60 });
    return { lines, xp: lines.reduce((a, l) => a + l.xp, 0), credits: lines.reduce((a, l) => a + l.credits, 0) };
  }
  const kinds = ENEMY_KINDS;
  let kxp = 0;
  let kcr = 0;
  for (const k of kinds) {
    const n = Math.min(nn(s.byKind[k] ?? 0), 500);
    kxp += n * XP_PER_KILL[k];
    kcr += n * CREDITS_PER_KILL[k];
  }
  if (kxp) lines.push({ label: 'Kills', xp: kxp, credits: kcr });
  const hs = Math.min(nn(s.headshots), 500);
  if (hs) lines.push({ label: 'Headshots', xp: hs * 25, credits: hs * 3 });
  if (s.mode === 'wave') {
    const w = Math.min(nn(s.waves), 100);
    if (w) lines.push({ label: `Waves survived (${w})`, xp: 150 * w + 25 * w * w, credits: 30 * w });
  } else if (s.mode !== 'clear') {
    const o = Math.min(nn(s.objectives), 10);
    if (o) lines.push({ label: `Objectives (${o})`, xp: 300 * o, credits: 50 * o });
  }
  // Clear mode: no per-room rewards, one reward for completing the operation; Infiltration pays the mission
  // and each bonus rule kept
  if (s.won) lines.push(s.mode === 'clear' ? { label: 'Operation complete', xp: 2000, credits: 400 } : s.mode === 'infiltration' ? { label: 'Mission complete', xp: 1800, credits: 350 } : { label: 'Victory', xp: 500, credits: 150 });
  if (s.won && s.mode === 'infiltration') for (const b of (s.bonuses ?? []).slice(0, 3)) lines.push({ label: `Bonus: ${b}`, xp: 400, credits: 80 });
  // play style pays (stealth modes): Ghost / Panther / Assault cash
  if (s.mode === 'clear' || s.mode === 'infiltration') for (const l of styleLines(s.style)) lines.push(l);
  const shots = nn(s.shots);
  const acc = shots >= 20 ? nn(s.hits) / shots : 0;
  if (acc >= 0.4) lines.push({ label: `Accuracy ${Math.round(acc * 100)}%`, xp: Math.round(acc * 300), credits: Math.round(acc * 40) });
  const m = DIFFICULTY[difficulty]?.reward ?? 1;
  if (m !== 1) {
    const bx = lines.reduce((a, l) => a + l.xp, 0);
    const bc = lines.reduce((a, l) => a + l.credits, 0);
    lines.push({ label: `Difficulty x${m}`, xp: Math.round(bx * (m - 1)), credits: Math.round(bc * (m - 1)) });
  }
  return { lines, xp: lines.reduce((a, l) => a + l.xp, 0), credits: lines.reduce((a, l) => a + l.credits, 0) };
}
