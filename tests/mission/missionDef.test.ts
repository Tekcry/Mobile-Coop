import { describe, expect, it } from 'vitest';
import { checkMission, condFlags, factsOf, stepCond, teamForSlot, type MissionDef } from '../../src/game/mission/missionDef';

// (mission-framework EN1) the data model's structural checks (PLAN section 2)

const GUARDS = new Set(['officer', 'clerk', 'porter']);

function op(): MissionDef {
  return {
    id: 'testOp',
    mode: 'sector',
    players: [1, 2, 3, 4],
    sections: ['S1', 'S2'],
    briefing: ['Two teams in, one code out.'],
    steps: [
      { id: 'roof', section: 'S1', team: 'a', kind: 'reach', text: 'Reach the gatehouse roof' },
      { id: 'board', section: 'S1', team: 'b', kind: 'intel', gives: 'code-cage', text: 'Read the duty board in the guard hut' },
      { id: 'cut', section: 'S1', team: 'all', kind: 'sync', after: ['roof', 'board'], window: 3, soloWindow: 20, text: 'Cut the power together' },
      { id: 'cage', section: 'S2', team: 'a', kind: 'exploit', needs: 'code-cage', text: 'Open the cage keypad' },
      { id: 'ask', section: 'S2', team: 'b', kind: 'interrogate', target: 'officer', decoys: ['clerk'], bolt: [1, 0, 2], text: 'Question the NOC officer' },
      { id: 'out', section: 'S2', team: 'all', kind: 'extract', after: ['cage', 'ask'], text: 'Out through the loading bay' },
    ],
    rules: [
      { kind: 'ghost', scope: 'mission', text: 'Nobody sees you.' },
      { kind: 'noKills', scope: 'b', text: 'Team B kills nobody.' },
    ],
    tracks: [
      { team: 'a', zones: ['secure'], boxes: [[0, 0, 10, 10]] },
      { team: 'b', zones: ['lobby'], boxes: [[20, 0, 30, 10]] },
    ],
  };
}

describe('checkMission', () => {
  it('passes a well-formed Sector Ops mission', () => {
    expect(checkMission(op(), GUARDS)).toEqual([]);
  });

  it('passes a campaign mission (players [2], team all, mission rules)', () => {
    const d = op();
    d.mode = 'campaign';
    d.players = [2];
    delete d.tracks;
    for (const s of d.steps) {
      s.team = 'all';
      delete s.soloWindow;
    }
    d.rules = [{ kind: 'ghost', scope: 'mission', text: 'Nobody sees you.' }];
    expect(checkMission(d, GUARDS)).toEqual([]);
  });

  it('rejects campaign shapes outside co-op: players, teams, team rules, tracks', () => {
    const d = op();
    d.mode = 'campaign';
    const e = checkMission(d, GUARDS).join('\n');
    expect(e).toMatch(/players \[2\]/);
    expect(e).toMatch(/campaign steps are team all/);
    expect(e).toMatch(/campaign rules are mission scope/);
    expect(e).toMatch(/tracks are Sector Ops only/);
  });

  it('finds a cycle through after and needs', () => {
    const d = op();
    d.steps[0]!.after = ['cut'];
    expect(checkMission(d, GUARDS).join('\n')).toMatch(/cycle/);
    const e = op();
    e.steps[1]!.needs = 'code-x';
    e.steps[3]!.gives = 'code-x';
    expect(checkMission(e, GUARDS).join('\n')).toMatch(/given in a later section/);
  });

  it('needs every needs given by another step', () => {
    const d = op();
    d.steps[3]!.needs = 'code-vault';
    expect(checkMission(d, GUARDS).join('\n')).toMatch(/needs code-vault, no step gives it/);
  });

  it('holds 3-6 steps, one extraction, last, in the last section', () => {
    const d = op();
    d.steps = d.steps.slice(0, 2);
    const e = checkMission(d, GUARDS).join('\n');
    expect(e).toMatch(/2 steps/);
    expect(e).toMatch(/0 extract steps/);
    const f = op();
    f.steps.push({ id: 'late', section: 'S2', team: 'a', kind: 'reach', text: 'One more' });
    expect(checkMission(f, GUARDS).join('\n')).toMatch(/last step is not the extraction/);
  });

  it('caps rules at 2 per team scope, the mission rules counted in', () => {
    const d = op();
    d.rules.push({ kind: 'noAlarms', scope: 'b', text: 'No alarms on the ground floor.' });
    expect(checkMission(d, GUARDS).join('\n')).toMatch(/team b carries 3 rules/);
    d.rules = [
      { kind: 'ghost', scope: 'mission', text: 'x' },
      { kind: 'noKills', scope: 'a', text: 'y' },
      { kind: 'noKills', scope: 'b', text: 'z' },
    ];
    expect(checkMission(d, GUARDS)).toEqual([]);
  });

  it('checks rule steps: named target on an interrogate step, window with seconds', () => {
    const d = op();
    d.rules = [
      { kind: 'namedTarget', scope: 'mission', text: 'Only the officer.', step: 'cage' },
      { kind: 'window', scope: 'a', text: 'Thirty seconds.', step: 'cage' },
    ];
    const e = checkMission(d, GUARDS).join('\n');
    expect(e).toMatch(/namedTarget\): needs an interrogate step/);
    expect(e).toMatch(/window\): needs seconds > 0/);
  });

  it('checks interrogate, sync, text length and optional steps', () => {
    const d = op();
    d.steps[4]!.decoys = ['nobody', 'officer'];
    d.steps[2]!.soloWindow = 0;
    d.steps[0]!.text = 'x'.repeat(91);
    d.steps[0]!.optional = { reward: 'medkit' };
    const e = checkMission(d, GUARDS).join('\n');
    expect(e).toMatch(/decoy nobody is not a guard/);
    expect(e).toMatch(/decoy officer is the target/);
    expect(e).toMatch(/soloWindow > 0/);
    expect(e).toMatch(/over 90 characters/);
    expect(e).toMatch(/a required step after the optional roof/);
  });
});

describe('mission helpers', () => {
  it('stepCond: done, the intel fact, sync none, else the step id', () => {
    const d = op();
    expect(stepCond(d.steps[0]!)).toEqual({ flag: 'roof' });
    expect(stepCond(d.steps[1]!)).toEqual({ flag: 'code-cage' });
    expect(stepCond(d.steps[2]!)).toBeNull();
    d.steps[0]!.done = { any: [{ flag: 'a' }, { all: [{ flag: 'b' }, { flag: 'c' }] }] };
    expect(condFlags(stepCond(d.steps[0]!)!)).toEqual(['a', 'b', 'c']);
  });

  it('factsOf lists each gives once in step order', () => {
    expect(factsOf(op())).toEqual(['code-cage']);
  });

  it('teamForSlot (A9): 0 / 2 Team A, 1 / 3 Team B, solo and campaign carry both', () => {
    expect([0, 1, 2, 3].map((s) => teamForSlot(s, 4, 'sector'))).toEqual(['a', 'b', 'a', 'b']);
    expect(teamForSlot(2, 3, 'sector')).toBe('a');
    expect(teamForSlot(0, 1, 'sector')).toBe('all');
    expect(teamForSlot(1, 2, 'campaign')).toBe('all');
  });
});
