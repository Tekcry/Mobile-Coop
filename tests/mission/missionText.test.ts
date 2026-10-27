import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MISSION, spookFact, type MissionDef } from '../../src/game/mission/missionDef';
import { MissionRunner } from '../../src/game/mission/missionRunner';
import { breakLine, briefingLines, objectiveRows, PROTECTED_LINE, RULE_NAME, ruleName, rulesLine, stepLine, teamRules } from '../../src/game/mission/missionText';
import { applyMissionWire, packMission } from '../../src/game/mission/missionWire';
import { RuleTracker } from '../../src/game/mission/ruleTracker';
import { THREE_GREY_COATS } from '../../src/world/maps/tallowWharfMissions';

// (mission-framework EN1) objective list rows, the rules line, the briefing and the radio line (PLAN section 3, A10)

function op(): MissionDef {
  return {
    id: 'testOp',
    mode: 'sector',
    players: [1, 2, 3, 4],
    sections: ['S1', 'S2'],
    briefing: ['Two teams in, one code out.'],
    steps: [
      { id: 'roof', section: 'S1', team: 'a', kind: 'reach', text: 'reach the second-floor records room', hint: 'The stairs past the atrium desk.' },
      { id: 'board', section: 'S1', team: 'b', kind: 'intel', gives: 'code', text: 'read the duty board in the guard hut', hint: 'The hut by the barrier.' },
      { id: 'tip', section: 'S1', team: 'b', kind: 'reach', text: 'find the spare keycard', optional: { reward: 'medkit' }, hint: 'Lockers.' },
      { id: 'out', section: 'S2', team: 'all', kind: 'extract', after: ['roof'], text: 'Out through the loading bay' },
    ],
    rules: [
      { kind: 'ghost', scope: 'a', text: 'Upstairs, nobody sees you.' },
      { kind: 'noAlarms', scope: 'mission', text: 'No alarms once the lights go.' },
    ],
  };
}

describe('missionText', () => {
  it('rule names and the rules line', () => {
    const d = op();
    expect(ruleName(d.rules[0]!)).toBe('Ghost');
    expect(ruleName(d.rules[1]!)).toBe('No alarms');
    expect(rulesLine(d)).toBe('Rules: No alarms; Team A: Ghost');
    expect(rulesLine({ ...d, rules: [] })).toBe('');
    expect(teamRules(d, 'a')).toEqual(['Ghost', 'No alarms']);
    expect(teamRules(d, 'b')).toEqual(['No alarms']);
  });

  it('step rows: team label, the team rules, the line', () => {
    const d = op();
    expect(stepLine(d, 0)).toBe('Team A - Ghost: reach the second-floor records room');
    expect(stepLine(d, 1)).toBe('Team B: read the duty board in the guard hut');
    expect(stepLine(d, 3)).toBe('Out through the loading bay');
    expect(stepLine(d, 9)).toBe('');
  });

  it('break line and briefing', () => {
    const d = op();
    expect(breakLine(d.rules[0]!)).toBe('Ghost broken. Back to the section checkpoint.');
    expect(breakLine(d.rules[1]!)).toBe('No alarms broken. Back to the section checkpoint.');
    expect(briefingLines(d)).toEqual(['Two teams in, one code out.', 'Team A - Ghost: Upstairs, nobody sees you.', 'No alarms: No alarms once the lights go.']);
  });

  it('objective rows: current section, open and done, hint on the viewer current row only when on', () => {
    const r = new MissionRunner(op(), 2);
    r.snapshot('S1', 0);
    const off = objectiveRows(r, 'b', false);
    expect(off.map((x) => x.step)).toEqual([0, 1, 2]);
    expect(off.every((x) => x.hint === null)).toBe(true);
    const on = objectiveRows(r, 'b', true);
    expect(on.map((x) => x.hint)).toEqual([null, 'The hut by the barrier.', null]);
    expect(on[2]!.optional).toBe(true);
    r.setFlag('code');
    r.update(1);
    const after = objectiveRows(r, 'all', true);
    expect(after[1]!.done).toBe(true);
    expect(after.map((x) => x.hint)).toEqual(['The stairs past the atrium desk.', null, null]);
  });

  // (mission-rules R1) no window rule, the protected restart's line, the moved line (A18)
  it('(mission-rules R1) every rule kind has a plain name; no window or one-chance name is left', () => {
    expect(Object.keys(RULE_NAME)).not.toContain('window');
    expect(Object.keys(RULE_NAME)).not.toContain('oneChance');
    expect(PROTECTED_LINE).toBe('The man you need is down. Back to the section checkpoint.');
    expect(PROTECTED_LINE.length).toBeLessThanOrEqual(MISSION.textMax);
  });

  it('(mission-rules R1, A18) stepLine(.., moved) gives the boltText; without one the text', () => {
    const i = THREE_GREY_COATS.steps.findIndex((s) => s.id === 'tgc-3');
    expect(stepLine(THREE_GREY_COATS, i)).toBe('Take the grey coat with the black umbrella in the reading room loft');
    expect(stepLine(THREE_GREY_COATS, i, true)).toBe("Take the grey coat with the black umbrella in the clock-mender's back loft");
    expect(stepLine(op(), 0, true)).toBe('Team A - Ghost: reach the second-floor records room');
  });

  it("(mission-rules R1, A18) a client runner fed the host's wire shows the moved row once the spook fact is held", () => {
    const d = THREE_GREY_COATS;
    const i = d.steps.findIndex((s) => s.id === 'tgc-3');
    const host = new MissionRunner(d, 2);
    const tracker = new RuleTracker(d, 2, host);
    host.snapshot('W1', 0);
    host.setFlag('tgc-1');
    host.setFlag('tgc-tally');
    host.setFlag('tgc-tea');
    host.update(1);
    host.snapshot('W2', 2);
    host.update(3);
    const client = new MissionRunner(d, 2);
    client.snapshot('W2', 0);
    applyMissionWire(client, packMission(host, tracker));
    expect(objectiveRows(client, 'all', false).find((r) => r.step === i)?.text).toBe(d.steps[i]!.text);
    // the host holds the spook fact (a decoy read or his kill: SectorMission sets it); the client reads its bit
    expect(host.setFlag(spookFact(d.steps[i]!))).toBe(true);
    expect(host.factBits).not.toBe(0);
    expect(applyMissionWire(client, packMission(host, tracker))).toBe(true);
    expect(objectiveRows(client, 'all', false).find((r) => r.step === i)?.text).toBe(d.steps[i]!.boltText);
    expect(objectiveRows(host, 'all', false).find((r) => r.step === i)?.text).toBe(d.steps[i]!.boltText);
  });

  it('(mission-rules R1) THREE_GREY_COATS tgc-3 boltText is the graph.json boltText', () => {
    const g = JSON.parse(readFileSync(new URL('../../docs/missions/prototypes/three-grey-coats/graph.json', import.meta.url), 'utf8')) as { objectives: { id: string; boltText?: string; text: string }[] };
    const o = g.objectives.find((x) => x.id === 'tgc-3');
    const s = THREE_GREY_COATS.steps.find((x) => x.id === 'tgc-3');
    expect(o?.boltText).toBeDefined();
    expect(s?.boltText).toBe(o?.boltText);
    expect(s!.boltText!.length).toBe(74);
    const t2 = g.objectives.find((x) => x.id === 'tgc-2');
    expect(THREE_GREY_COATS.steps.find((x) => x.id === 'tgc-2')?.text).toBe(t2?.text);
    expect(t2!.text.length).toBe(88);
  });
});
