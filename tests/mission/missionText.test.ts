import { describe, expect, it } from 'vitest';
import type { MissionDef } from '../../src/game/mission/missionDef';
import { MissionRunner } from '../../src/game/mission/missionRunner';
import { breakLine, briefingLines, objectiveRows, ruleName, rulesLine, stepLine, teamRules } from '../../src/game/mission/missionText';

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
      { kind: 'window', scope: 'mission', step: 'roof', seconds: 30, text: 'Thirty seconds once the lights go.' },
    ],
  };
}

describe('missionText', () => {
  it('rule names and the rules line', () => {
    const d = op();
    expect(ruleName(d.rules[0]!)).toBe('Ghost');
    expect(ruleName(d.rules[1]!)).toBe('Window 30 s');
    expect(rulesLine(d)).toBe('Rules: Window 30 s; Team A: Ghost');
    expect(rulesLine({ ...d, rules: [] })).toBe('');
    expect(teamRules(d, 'a')).toEqual(['Ghost', 'Window 30 s']);
    expect(teamRules(d, 'b')).toEqual(['Window 30 s']);
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
    expect(breakLine(d.rules[0]!, false)).toBe('Ghost broken. Back to the section checkpoint.');
    expect(breakLine(d.rules[0]!, true)).toBe('Ghost broken. The mission is over.');
    expect(briefingLines(d)).toEqual(['Two teams in, one code out.', 'Team A - Ghost: Upstairs, nobody sees you.', 'Window 30 s: Thirty seconds once the lights go.']);
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
});
