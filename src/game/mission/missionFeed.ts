/**
 * (mission-rules R6, G343 / HG7 / HG8) The mission's objective feed (pure, Babylon-free, no net imports). The always-on
 * objective list HUD (EN3 / EN4) is gone: the HUD's objective line carries the viewer's current step (`MissionFeed`,
 * written only when it changes, so hud-guidance's popup fades in on a new objective), the hint line under it carries
 * that step's hint while the hint layer is on, and the full list lives in the field menu (Field Terminal > Objectives,
 * `missionObjectiveLines`, through hud-guidance B4's `objectiveLines` hook): the rules line first, then every step of
 * the mission's sections so far. The host / solo (`SectorMode`) feeds it from its runner, the co-op client from its
 * mission mirror with its own viewer (Sector Ops teams differ between the pages). An interrogate step whose target has
 * bolted shows its moved line (`boltText`, R1 / A18) on both pages (the spook fact rides `ms.f`).
 */
import type { ObjectiveLine } from '../../ui/screens/pauseScreen';
import { spookFact, teamForSlot, type MissionDef, type MissionStep, type TeamId } from './missionDef';
import { STEP_DONE, STEP_OPEN, type MissionRunner } from './missionRunner';
import { rulesLine, stepLine } from './missionText';

/** A9: the team whose objectives this machine's player sees: player slot -> team (slots 0, 2 A; 1, 3 B); solo or campaign 'all'. */
export function missionViewerTeam(def: MissionDef, slot: number, players: number): TeamId {
  return teamForSlot(slot, players, def.mode);
}

/** Step `s` (an interrogate step with a bolt) shows its moved line: its spook fact is held (R1, A18). */
function movedStep(runner: MissionRunner, s: MissionStep): boolean {
  return s.kind === 'interrogate' && !!s.bolt && !!s.boltText && runner.hasFlag(spookFact(s));
}

/** Step `s` is one `viewer` carries (his team's, or both teams'). */
function mine(s: MissionStep, viewer: TeamId): boolean {
  return viewer === 'all' || s.team === 'all' || s.team === viewer;
}

/**
 * The viewer's current step: the first open required step of the runner's section that is his (team 'all' or his own),
 * else the first open required step of the section of any team (the other team's work the viewer waits on), -1 when the
 * section has no open required step (its work is done: the exit is open). No allocation.
 */
export function missionCurrentStep(runner: MissionRunner, viewer: TeamId): number {
  const d = runner.def;
  const si = runner.section;
  if (si < 0) return -1;
  const sec = d.sections[si];
  let other = -1;
  for (let i = 0; i < d.steps.length; i++) {
    const s = d.steps[i]!;
    if (s.section !== sec || s.optional || runner.stateOf(i) !== STEP_OPEN) continue;
    if (mine(s, viewer)) return i;
    if (other < 0) other = i;
  }
  return other;
}

/**
 * The objective line and hint of one viewer, updated in place. `update` per frame: it compares the runner, its `version`,
 * the viewer and the hint flag and returns before any work when none changed; a change re-picks the current step and
 * rebuilds the text only when the step, its moved state or its hint changed. Allocation only then (the line string).
 */
export class MissionFeed {
  /** The viewer's current step line ('' none: no mission, or the section's work is done). */
  text = '';
  /** The current step's hint (the hint layer on, the viewer's own step), null none. */
  hint: string | null = null;
  /** The current step index (-1 none). */
  step = -1;
  private runner: MissionRunner | null = null;
  private version = -1;
  private viewer: TeamId = 'all';
  private hints = false;
  private moved = false;

  /**
   * Per frame: `runner` the mission running here (null: none, it is over, or the live section is not the mission's).
   * True only when `text` or `hint` changed (the caller writes the HUD then).
   */
  update(runner: MissionRunner | null, viewer: TeamId, hints: boolean): boolean {
    if (!runner) {
      this.runner = null;
      this.version = -1;
      return this.set(-1, false, '', null);
    }
    if (runner === this.runner && runner.version === this.version && viewer === this.viewer && hints === this.hints) return false;
    this.runner = runner;
    this.version = runner.version;
    this.viewer = viewer;
    this.hints = hints;
    const i = missionCurrentStep(runner, viewer);
    const s = i >= 0 ? runner.def.steps[i] : undefined;
    if (!s) return this.set(-1, false, '', null);
    const moved = movedStep(runner, s);
    const hint = hints && mine(s, viewer) ? (s.hint ?? null) : null;
    if (i === this.step && moved === this.moved && this.text !== '') return this.set(i, moved, this.text, hint);
    return this.set(i, moved, stepLine(runner.def, i, moved), hint);
  }

  /** Forget the last runner (the next `update` re-reads it; a new match). */
  reset(): void {
    this.runner = null;
    this.version = -1;
    this.set(-1, false, '', null);
  }

  private set(step: number, moved: boolean, text: string, hint: string | null): boolean {
    const changed = text !== this.text || hint !== this.hint;
    this.step = step;
    this.moved = moved;
    this.text = text;
    this.hint = hint;
    return changed;
  }
}

/**
 * (HG8) Field Terminal > Objectives rows of a mission: the rules line first (`note`, none when the mission has no
 * rules), then every step of the mission's sections up to the runner's (a later section's steps are not listed yet; a
 * done step always is), done / current (the feed's step) / to do; the current line carries its hint when `hints`.
 * An optional step is listed once it is open or done. Built when the menu opens (it allocates).
 */
export function missionObjectiveLines(runner: MissionRunner, viewer: TeamId, hints: boolean): ObjectiveLine[] {
  const d = runner.def;
  const out: ObjectiveLine[] = [];
  const rules = rulesLine(d);
  if (rules) out.push({ label: rules, done: false, current: false, note: true });
  const cur = missionCurrentStep(runner, viewer);
  for (let i = 0; i < d.steps.length; i++) {
    const s = d.steps[i]!;
    const st = runner.stateOf(i);
    const done = st === STEP_DONE;
    if (!done && d.sections.indexOf(s.section) > runner.section) continue;
    if (s.optional && st !== STEP_OPEN && !done) continue;
    const line: ObjectiveLine = { label: stepLine(d, i, movedStep(runner, s)), done, current: i === cur };
    if (i === cur && hints && s.hint && mine(s, viewer)) line.hint = s.hint;
    out.push(line);
  }
  return out;
}

/**
 * (mission-rules R6, lead ruling 2) The feed line's text when a mission section's work is done ("<this> - done"): the
 * mission's last done step when it is in the runner's section (on Three Grey Coats W3 the mission's step, never the
 * Sector Ops "Take the ledger" label), '' when none (no feed line). Allocates (a section end only).
 */
export function missionDoneLine(runner: MissionRunner): string {
  const i = runner.lastDone;
  const s = i >= 0 ? runner.def.steps[i] : undefined;
  if (!s || runner.section < 0 || runner.def.sections.indexOf(s.section) !== runner.section) return '';
  return stepLine(runner.def, i, movedStep(runner, s));
}
