/**
 * (mission-framework EN1) Mission text for the objective list HUD, the briefing and the radio (PLAN section 3; pure,
 * Babylon-free, no net imports). Rows per team ("Team A - Ghost: reach the second-floor records room"), the rules line
 * under the title, done rows ticked, the hint line under the current row only when the hint layer is on (A10). Built
 * on a change (the runner's `version`), not per tick. (mission-rules R1) Every break line sends the team back to the
 * section checkpoint (G290: no rule ends a mission); the protected restart has its own line (`PROTECTED_LINE`); an
 * interrogate step whose target has bolted shows its `boltText` (A18, what and where, G336) while its spook fact is held.
 */
import { RATING_LABEL, NO_ALARMS, NO_KILLS } from '../rating/sectionRating';
import { spookFact, type MissionDef, type MissionRule, type RuleKind, type TeamId } from './missionDef';
import { STEP_DONE, STEP_OPEN, type MissionRunner } from './missionRunner';

/** Rule names (the four mark rules use section-rating's words where they mean the same). */
export const RULE_NAME: Readonly<Record<RuleKind, string>> = {
  ghost: 'Ghost',
  noKills: RATING_LABEL[NO_KILLS],
  noAlarms: RATING_LABEL[NO_ALARMS],
  noBodies: 'No bodies found',
  namedTarget: 'Named target',
  noGadgets: 'No gadgets',
  plantNotTake: 'Plant, do not take',
};
export const TEAM_NAME: Readonly<Record<TeamId, string>> = { a: 'Team A', b: 'Team B', all: '' };

/**
 * (mission-rules R1, A2 / A3, BRIEF M6) The radio line of the protected restart: an interrogation target knocked out
 * before he talks (or killed on a step no rule covers). Not a rule break.
 */
export const PROTECTED_LINE = 'The man you need is down. Back to the section checkpoint.';

/** A rule's short name ("Ghost", "Named target"). */
export function ruleName(r: MissionRule): string {
  return RULE_NAME[r.kind];
}

/** The rule names a team carries: the mission's, then its own scope's ('all': every rule). */
export function teamRules(d: MissionDef, team: TeamId): string[] {
  const out: string[] = [];
  for (const r of d.rules) if (r.scope === 'mission' || team === 'all' || r.scope === team) out.push(ruleName(r));
  return out;
}

/** The rules line under the title ("Rules: Ghost; Team B: No kills"); '' with no rules. */
export function rulesLine(d: MissionDef): string {
  const parts: string[] = [];
  const mission = d.rules.filter((r) => r.scope === 'mission').map(ruleName);
  if (mission.length > 0) parts.push(mission.join(', '));
  for (const t of ['a', 'b'] as const) {
    const own = d.rules.filter((r) => r.scope === t).map(ruleName);
    if (own.length > 0) parts.push(`${TEAM_NAME[t]}: ${own.join(', ')}`);
  }
  return parts.length > 0 ? `Rules: ${parts.join('; ')}` : '';
}

/**
 * One step's row text: "Team A - Ghost: reach ...", "Team A: reach ...", or the bare line for team 'all'. `moved`
 * (mission-rules R1, A18): the step's target has bolted, so a step with a `boltText` shows it instead of `text`.
 */
export function stepLine(d: MissionDef, i: number, moved = false): string {
  const s = d.steps[i];
  if (!s) return '';
  const text = moved && s.boltText ? s.boltText : s.text;
  if (s.team === 'all') return text;
  const own = d.rules.filter((r) => r.scope === s.team).map(ruleName);
  return own.length > 0 ? `${TEAM_NAME[s.team]} - ${own.join(', ')}: ${text}` : `${TEAM_NAME[s.team]}: ${text}`;
}

/** The radio line when a rule breaks: the team goes back to the section checkpoint (G290). */
export function breakLine(r: MissionRule): string {
  return `${ruleName(r)} broken. Back to the section checkpoint.`;
}

/** The briefing: its lines, then the rules (each rule's own signposted line, team-tagged). */
export function briefingLines(d: MissionDef): string[] {
  const out = d.briefing.slice();
  for (const r of d.rules) out.push(r.scope === 'mission' ? `${ruleName(r)}: ${r.text}` : `${TEAM_NAME[r.scope]} - ${ruleName(r)}: ${r.text}`);
  return out;
}

export interface MissionRow {
  /** Step index. */
  step: number;
  team: TeamId;
  text: string;
  done: boolean;
  optional: boolean;
  /** The hint line (hint layer on, the viewer's current row only), null otherwise. */
  hint: string | null;
}

/**
 * The objective list: the current section's open and done steps in step order (locked steps are not listed). `viewer`
 * is the local player's team ('all' solo / campaign): his first open required row carries its hint when `hints`.
 * (mission-rules R1, A18) An interrogate step with a `bolt` whose spook fact is held shows its `boltText`; the host and a
 * client (fact bits in `ms.f`) read the same fact, so both show the same line. Built on a change, not per tick (it
 * allocates the rows and the spook fact names).
 */
export function objectiveRows(runner: MissionRunner, viewer: TeamId, hints: boolean): MissionRow[] {
  const d = runner.def;
  const rows: MissionRow[] = [];
  let hinted = false;
  for (let i = 0; i < d.steps.length; i++) {
    const st = runner.stateOf(i);
    if (st !== STEP_OPEN && st !== STEP_DONE) continue;
    const s = d.steps[i]!;
    if (runner.section >= 0 && d.sections.indexOf(s.section) !== runner.section) continue;
    let hint: string | null = null;
    const mine = viewer === 'all' || s.team === 'all' || s.team === viewer;
    if (hints && !hinted && st === STEP_OPEN && mine && !s.optional) {
      hinted = true;
      hint = s.hint ?? null;
    }
    const moved = s.kind === 'interrogate' && !!s.bolt && runner.hasFlag(spookFact(s));
    rows.push({ step: i, team: s.team, text: stepLine(d, i, moved), done: st === STEP_DONE, optional: !!s.optional, hint });
  }
  return rows;
}
