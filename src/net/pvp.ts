/**
 * PvP rules (pure, unit-tested): team deathmatch (4v4, first to 30) and free-for-all (up to 8, first to 15),
 * eight minutes each. The host keeps the score; spawns go where no opponent is near.
 */
import { hyp2 } from '../core/mathx';
import { TEAM_MAX, type ScoreLine } from './protocol';

export type PvpMode = 'tdm' | 'ffa';

export const PVP = {
  tdm: { limit: 30, time: 480, label: 'Team Deathmatch' },
  ffa: { limit: 15, time: 480, label: 'Free-for-all' },
  /** Seconds before a respawn, then seconds of spawn protection. */
  respawn: 4,
  protect: 2,
} as const;

export const TEAM_NAMES = ['Blue', 'Red'] as const;
export const TEAM_COLORS = ['#3fa2ff', '#ff4b3e'] as const;

/** The side with fewer players (ties: 0). */
export function balanceTeam(teams: readonly number[]): 0 | 1 {
  let a = 0;
  let b = 0;
  for (const t of teams) {
    if (t === 1) b++;
    else a++;
  }
  return b < a ? 1 : 0;
}

/** May a player move to `team`? (the side has room) */
export function canJoinTeam(teams: readonly number[], team: number): boolean {
  let n = 0;
  for (const t of teams) if (t === team) n++;
  return n < TEAM_MAX;
}

export interface V2 {
  x: number;
  z: number;
}

/**
 * Index of the spawn furthest from every opponent (the minimum distance maximised); in a team match a spawn near
 * a living team-mate wins a near tie. `cands` must not be empty.
 */
export function pickSpawn(cands: readonly V2[], foes: readonly V2[], allies: readonly V2[] = [], rnd = 0): number {
  let best = 0;
  let bs = -Infinity;
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i]!;
    let near = 60;
    for (const f of foes) near = Math.min(near, hyp2(f.x - c.x, f.z - c.z));
    let ally = 0;
    for (const a of allies) if (hyp2(a.x - c.x, a.z - c.z) < 12) ally = 3;
    // a little spread so two respawns at once do not stack
    const s = near + ally + ((i * 7 + Math.floor(rnd * 13)) % 5) * 0.2;
    if (s > bs) {
      bs = s;
      best = i;
    }
  }
  return best;
}

/** Kills, deaths and team scores; the host owns it and sends `lines()` in snapshots. */
export class PvpScore {
  private rows = new Map<string, ScoreLine>();
  readonly teams = [0, 0];
  elapsed = 0;

  constructor(readonly mode: PvpMode) {}

  add(id: string, team: number): void {
    const r = this.rows.get(id);
    if (r) r.team = team === 1 ? 1 : 0;
    else this.rows.set(id, { id, k: 0, d: 0, team: team === 1 ? 1 : 0 });
  }

  remove(id: string): void {
    this.rows.delete(id);
  }

  has(id: string): boolean {
    return this.rows.has(id);
  }

  team(id: string): number {
    return this.rows.get(id)?.team ?? 0;
  }

  /** Can `a` hurt `b`? (never yourself; in a team match never a team-mate) */
  hostile(a: string, b: string): boolean {
    if (a === b) return false;
    return this.mode === 'ffa' || this.team(a) !== this.team(b);
  }

  /** `victim` eliminated by `by` (by === victim or unknown: a death with no kill). */
  frag(victim: string, by: string): void {
    const v = this.rows.get(victim);
    if (v) v.d++;
    const k = this.rows.get(by);
    if (!k || by === victim || !this.hostile(by, victim)) return;
    k.k++;
    this.teams[k.team]!++;
  }

  lines(): ScoreLine[] {
    return [...this.rows.values()].map((r) => ({ ...r }));
  }

  get limit(): number {
    return PVP[this.mode].limit;
  }

  get timeLeft(): number {
    return Math.max(0, PVP[this.mode].time - this.elapsed);
  }

  /** The leader ('team0' / 'team1' / a player id) and their score; '' on a tie. */
  leader(): { id: string; score: number } {
    if (this.mode === 'tdm') {
      const [a, b] = this.teams as [number, number];
      return a === b ? { id: '', score: a } : a > b ? { id: 'team0', score: a } : { id: 'team1', score: b };
    }
    let id = '';
    let top = -1;
    let tie = false;
    for (const r of this.rows.values()) {
      if (r.k > top) {
        top = r.k;
        id = r.id;
        tie = false;
      } else if (r.k === top) tie = true;
    }
    return { id: tie ? '' : id, score: Math.max(0, top) };
  }

  /** Over: the score limit reached or the time up. */
  get over(): boolean {
    return this.leader().score >= this.limit || this.timeLeft <= 0;
  }

  /** Did `id` win? */
  won(id: string): boolean {
    const w = this.leader().id;
    return w !== '' && (w === id || w === `team${this.team(id)}`);
  }
}

/** HUD line: TDM "Blue 12 Red 9 7:12", FFA "You 4 Lead 9 7:12" (HTML spans like the other modes). */
export function pvpInfo(mode: PvpMode, lines: readonly ScoreLine[], me: string, timeLeft: number): string {
  const t = Math.ceil(timeLeft);
  const clock = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  if (mode === 'tdm') {
    const s = [0, 0];
    for (const l of lines) s[l.team]! += l.k;
    const mine = lines.find((l) => l.id === me)?.team ?? 0;
    const a = `<span class="pvp-team t${mine}">${TEAM_NAMES[mine]} <b>${s[mine]}</b></span>`;
    const b = `<span class="pvp-team t${1 - mine}">${TEAM_NAMES[1 - mine]} <b>${s[1 - mine]}</b></span>`;
    return `${a}${b}<span>${clock}</span>`;
  }
  let lead = 0;
  for (const l of lines) lead = Math.max(lead, l.k);
  const you = lines.find((l) => l.id === me)?.k ?? 0;
  return `<span>You <b>${you}</b></span><span>Lead <b>${lead}</b></span><span>${clock}</span>`;
}
