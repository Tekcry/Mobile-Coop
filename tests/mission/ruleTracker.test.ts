import { describe, expect, it } from 'vitest';
import type { MissionDef, MissionRule } from '../../src/game/mission/missionDef';
import { breakLine, PROTECTED_LINE } from '../../src/game/mission/missionText';
import { RULE_HOLD, RULE_OK, RULE_RESTART, RuleTracker, SCOPE_A, SCOPE_B, SCOPE_MISSION, TEAM_A_BIT, TEAM_B_BIT, TEAM_BOTH, ruleMark } from '../../src/game/mission/ruleTracker';
import { NO_ALARMS, NO_KILLS, UNDETECTED, ALL_MARKS } from '../../src/game/rating/sectionRating';

// (mission-framework EN1) rules read section-rating's marks per scope; attribution by slot, zone and track box (A8, A9)

function op(rules: MissionRule[]): MissionDef {
  return {
    id: 'testOp',
    mode: 'sector',
    players: [1, 2, 3, 4],
    sections: ['S1', 'S2'],
    briefing: [],
    steps: [
      { id: 'roof', section: 'S1', team: 'a', kind: 'reach', text: 'Reach the roof' },
      { id: 'ask', section: 'S1', team: 'b', kind: 'interrogate', target: 'officer', decoys: ['clerk'], bolt: [0, 0, 0], text: 'Question the officer' },
      { id: 'out', section: 'S2', team: 'all', kind: 'extract', text: 'Out' },
    ],
    rules,
    tracks: [
      { team: 'a', zones: ['secure'], boxes: [[0, 0, 10, 10]] },
      { team: 'b', zones: ['lobby'], boxes: [[20, 0, 30, 10]] },
    ],
  };
}

const ghost: MissionRule = { kind: 'ghost', scope: 'mission', text: 'Nobody sees you.' };

describe('RuleTracker', () => {
  it('maps the four mark rules to section-rating bits', () => {
    expect(ruleMark('ghost')).toBe(UNDETECTED);
    expect(ruleMark('noKills')).toBe(NO_KILLS);
    expect(ruleMark('noAlarms')).toBe(NO_ALARMS);
    expect(ruleMark('namedTarget')).toBe(0);
  });

  it('mission ghost breaks on a detection or a camera alarm: restart, line, counter; then latched', () => {
    const t = new RuleTracker(op([ghost]), 2);
    expect(t.update(0)).toBe(RULE_OK);
    t.onDetections(1);
    expect(t.update(1)).toBe(RULE_RESTART);
    expect(t.breaks).toBe(1);
    expect(t.lastRule).toBe(0);
    expect(t.line).toBe('Ghost broken. Back to the section checkpoint.');
    expect(t.update(2)).toBe(RULE_OK);
    t.resetSection(3);
    expect(t.held).toBe(true);
    t.onCameraAlarm(5, 5);
    t.onDetections(2);
    expect(t.update(3 + RULE_HOLD - 0.1)).toBe(RULE_OK);
    expect(t.marks(SCOPE_MISSION)).toBe(ALL_MARKS);
    expect(t.update(3 + RULE_HOLD)).toBe(RULE_OK);
    t.onCameraAlarm(5, 5);
    expect(t.update(6)).toBe(RULE_RESTART);
    expect(t.breaks).toBe(2);
    expect(t.kept(SCOPE_MISSION)).toBe(0);
    expect(t.brokenCount(0)).toBe(2);
  });

  it('team no kills: by slot (0 / 2 Team A, 1 / 3 Team B); a knock-out is not a kill; solo carries both', () => {
    const rules: MissionRule[] = [{ kind: 'noKills', scope: 'b', text: 'Team B kills nobody.' }];
    const t = new RuleTracker(op(rules), 2);
    t.onKill(0, false);
    t.onKill(1, true);
    expect(t.update(0)).toBe(RULE_OK);
    expect(t.marks(SCOPE_A) & NO_KILLS).toBe(0);
    expect(t.marks(SCOPE_B) & NO_KILLS).toBe(NO_KILLS);
    t.onKill(3, false);
    expect(t.update(1)).toBe(RULE_RESTART);
    expect(t.kept(SCOPE_B)).toBe(0);
    const solo = new RuleTracker(op(rules), 1);
    solo.onKill(0, false);
    expect(solo.update(0)).toBe(RULE_RESTART);
  });

  it('alarms and bodies by track box, else both teams', () => {
    const rules: MissionRule[] = [{ kind: 'noAlarms', scope: 'a', text: 'No alarms upstairs.' }];
    const t = new RuleTracker(op(rules), 2);
    expect(t.teamsAt(5, 5)).toBe(TEAM_A_BIT);
    expect(t.teamsAt(25, 5)).toBe(TEAM_B_BIT);
    expect(t.teamsAt(50, 50)).toBe(TEAM_BOTH);
    expect(t.teamsAt(NaN, 0)).toBe(TEAM_BOTH);
    t.onAlarm(25, 5);
    t.onBodyFound(25, 5);
    expect(t.update(0)).toBe(RULE_OK);
    expect(t.stats[SCOPE_B].alarms).toBe(1);
    expect(t.stats[SCOPE_B].bodiesFound).toBe(1);
    expect(t.stats[SCOPE_MISSION].alarms).toBe(1);
    t.onAlarm(NaN, NaN);
    expect(t.update(1)).toBe(RULE_RESTART);
  });

  it('team ghost: an alerted live, non-passive guard of the track zones (spotFail per track)', () => {
    const rules: MissionRule[] = [{ kind: 'ghost', scope: 'a', text: 'Upstairs, nobody sees you.' }];
    const t = new RuleTracker(op(rules), 2);
    t.scanGuards([
      { alive: true, alerted: true, passive: false, zone: 'lobby' },
      { alive: false, alerted: true, passive: false, zone: 'secure' },
      { alive: true, alerted: true, passive: true, zone: 'secure' },
      { alive: true, alerted: true, passive: false },
    ]);
    expect(t.update(0)).toBe(RULE_OK);
    t.scanGuards([{ alive: true, alerted: true, passive: false, zone: 'secure' }]);
    expect(t.update(1)).toBe(RULE_RESTART);
  });

  it('no gadgets and named target by slot; plant-not-take', () => {
    const t = new RuleTracker(op([{ kind: 'noGadgets', scope: 'a', text: 'No gadgets.' }, { kind: 'namedTarget', scope: 'b', step: 'ask', text: 'Only the officer.' }]), 2);
    t.onGadget(1);
    t.onInterrogate(1, false);
    expect(t.update(0)).toBe(RULE_OK);
    t.onInterrogate(1, true, 1);
    expect(t.update(1)).toBe(RULE_RESTART);
    expect(t.lastRule).toBe(1);
    t.resetSection(2, false);
    t.onGadget(2);
    expect(t.update(2)).toBe(RULE_RESTART);
    expect(t.lastRule).toBe(0);
    const p = op([{ kind: 'plantNotTake', scope: 'mission', text: 'Plant it.' }]);
    p.steps[0]!.kind = 'plant';
    const pt = new RuleTracker(p, 2);
    pt.onTake(0);
    expect(pt.update(0)).toBe(RULE_RESTART);
  });

  it('per-team reset (M1): a team rule break resets and holds only that team; the other team and the mission keep counting', () => {
    const rules: MissionRule[] = [
      { kind: 'noKills', scope: 'a', text: 'Team A kills nobody.' },
      { kind: 'noKills', scope: 'b', text: 'Team B kills nobody.' },
    ];
    const t = new RuleTracker(op(rules), 2);
    expect(t.restartTeam).toBeUndefined();
    t.onKill(0, true); // a knock-out: counted on A, not a kill
    t.onKill(1, false);
    expect(t.update(1)).toBe(RULE_RESTART);
    expect(t.lastScope).toBe('b');
    expect(t.restartTeam).toBe('b');
    t.resetSection(2, true, t.restartTeam);
    expect(t.stats[SCOPE_B].kills).toBe(0);
    expect(t.stats[SCOPE_A].knockouts).toBe(1);
    expect(t.stats[SCOPE_MISSION].kills).toBe(1);
    expect(t.isHeld(SCOPE_B)).toBe(true);
    expect(t.isHeld(SCOPE_A)).toBe(false);
    expect(t.held).toBe(false);
    // team B's hold swallows its kill; team A still breaks at once
    t.onKill(1, false);
    expect(t.update(2.5)).toBe(RULE_OK);
    expect(t.stats[SCOPE_B].kills).toBe(0);
    t.onKill(2, false);
    expect(t.update(3)).toBe(RULE_RESTART);
    expect(t.restartTeam).toBe('a');
  });

  it('per-team reset clears only the event hits of that team; solo and no scope reset everyone', () => {
    const rules: MissionRule[] = [
      { kind: 'noGadgets', scope: 'a', text: 'Team A, no gadgets.' },
      { kind: 'noGadgets', scope: 'b', text: 'Team B, no gadgets.' },
    ];
    const t = new RuleTracker(op(rules), 2);
    t.onGadget(0);
    t.onGadget(1);
    expect(t.update(0)).toBe(RULE_RESTART);
    expect(t.lastRule).toBe(0);
    t.resetSection(1, true, 'a');
    // team B's hit was left alone: it fires next
    expect(t.update(1.5)).toBe(RULE_RESTART);
    expect(t.lastRule).toBe(1);
    t.resetSection(2, false);
    expect(t.update(2)).toBe(RULE_OK);
    const solo = new RuleTracker(op(rules), 1);
    solo.onGadget(0);
    expect(solo.update(0)).toBe(RULE_RESTART);
    expect(solo.restartTeam).toBeUndefined();
    solo.resetSection(1, true, 'a');
    expect(solo.isHeld(SCOPE_A) && solo.isHeld(SCOPE_B) && solo.held).toBe(true);
    expect(solo.update(5)).toBe(RULE_OK);
  });

  it('(mission-rules R1) no rule ends a mission: every break is a section restart with the checkpoint line', () => {
    const t = new RuleTracker(op([ghost]), 2);
    t.onDetections(1);
    expect(t.update(0)).toBe(RULE_RESTART);
    expect(t.outcome).toBe(RULE_RESTART);
    expect(t.line).toBe(breakLine(ghost));
    expect(t.line.endsWith('Back to the section checkpoint.')).toBe(true);
  });

  it('(mission-rules R1, A2 / A3) the protected restart: RULE_RESTART once, its own line, everyone, never a rule break', () => {
    const rules: MissionRule[] = [
      { kind: 'noKills', scope: 'a', text: 'Team A kills nobody.' },
      { kind: 'namedTarget', scope: 'mission', step: 'ask', text: 'Only the officer.' },
    ];
    const t = new RuleTracker(op(rules), 2);
    // a team rule's break first: its restart sends only that team back
    t.onKill(0, false);
    expect(t.update(0)).toBe(RULE_RESTART);
    expect(t.restartTeam).toBe('a');
    t.resetSection(1, false);
    const keptM = t.kept(SCOPE_MISSION);
    const keptA = t.kept(SCOPE_A);
    t.onProtected();
    expect(t.update(1)).toBe(RULE_RESTART);
    expect(t.outcome).toBe(RULE_RESTART);
    expect(t.line).toBe(PROTECTED_LINE);
    expect(t.lastRule).toBe(-1);
    expect(t.restartTeam).toBeUndefined();
    expect(t.breaks).toBe(1);
    expect(t.protectedBreaks).toBe(1);
    expect(t.kept(SCOPE_MISSION)).toBe(keptM);
    expect(t.kept(SCOPE_A)).toBe(keptA);
    expect(t.brokenCount(1)).toBe(0);
    // latched until the reset
    t.onProtected();
    expect(t.update(1.1)).toBe(RULE_OK);
    // ignored while the mission scope is held after the restart
    t.resetSection(2);
    t.onProtected();
    expect(t.update(2 + RULE_HOLD / 2)).toBe(RULE_OK);
    expect(t.update(2 + RULE_HOLD + 0.1)).toBe(RULE_OK);
    // a pending one is dropped by a reset (a section begin)
    t.onProtected();
    t.resetSection(10, false);
    expect(t.update(10)).toBe(RULE_OK);
    expect(t.protectedBreaks).toBe(1);
    expect(t.breaks).toBe(1);
  });

  it("(mission-rules R1) onTargetKilled breaks the step's named-target rule the normal way; held or another step: nothing", () => {
    const d = op([{ kind: 'namedTarget', scope: 'mission', step: 'ask', text: 'Only the officer.' }]);
    d.steps.push({ id: 'ask2', section: 'S1', team: 'all', kind: 'interrogate', target: 'boss', text: 'Question the boss' });
    const t = new RuleTracker(d, 2);
    // another step's target: the rule names 'ask' only
    expect(t.onTargetKilled(3)).toBe(false);
    expect(t.update(0)).toBe(RULE_OK);
    expect(t.onTargetKilled(1)).toBe(true);
    expect(t.update(0.1)).toBe(RULE_RESTART);
    expect(t.line).toBe(breakLine(d.rules[0]!));
    expect(t.lastRule).toBe(0);
    expect(t.breaks).toBe(1);
    expect(t.brokenCount(0)).toBe(1);
    expect(t.kept(SCOPE_MISSION) & 1).toBe(0);
    expect(t.protectedBreaks).toBe(0);
    expect(t.restartTeam).toBeUndefined();
    // held after the restart: nothing is hit
    t.resetSection(1);
    expect(t.onTargetKilled(1)).toBe(false);
    expect(t.update(1.5)).toBe(RULE_OK);
    expect(t.update(1 + RULE_HOLD + 0.1)).toBe(RULE_OK);
    expect(t.onTargetKilled(1)).toBe(true);
    expect(t.update(1 + RULE_HOLD + 0.2)).toBe(RULE_RESTART);
    expect(t.breaks).toBe(2);
    // a step-less named-target rule covers every interrogate step
    const any = new RuleTracker(op([{ kind: 'namedTarget', scope: 'mission', text: 'Only the right man.' }]), 2);
    expect(any.onTargetKilled(1)).toBe(true);
    expect(any.update(0)).toBe(RULE_RESTART);
    // no named-target rule at all: nothing to hit
    expect(new RuleTracker(op([ghost]), 2).onTargetKilled(1)).toBe(false);
  });
});
