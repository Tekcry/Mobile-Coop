import { describe, expect, it } from 'vitest';
import { checkMission, condFlags, factsOf, RULE_KINDS, spookFact, stepCond, teamForSlot, type MissionDef, type MissionRule } from '../../src/game/mission/missionDef';

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
    expect(e).toMatch(/team a has 1 steps/);
    expect(e).toMatch(/0 extract steps/);
    const f = op();
    f.steps.push({ id: 'late', section: 'S2', team: 'a', kind: 'reach', text: 'One more' });
    expect(checkMission(f, GUARDS).join('\n')).toMatch(/last step is not the extraction/);
  });

  it('step budget: Sector Ops per team (its steps + the shared ones), the campaign over the whole mission', () => {
    // 5 per team with the shared ones, 8 in all: fine in Sector Ops (the solo sum is not an error)
    const d = op();
    d.steps.splice(5, 0, { id: 'vent', section: 'S2', team: 'a', kind: 'reach', text: 'Into the vent' }, { id: 'desk', section: 'S2', team: 'b', kind: 'reach', text: 'Past the desk' });
    expect(d.steps.length).toBe(8);
    expect(checkMission(d, GUARDS)).toEqual([]);
    // team a at 7 with the shared ones: over
    d.steps.splice(5, 0, { id: 'a1', section: 'S2', team: 'a', kind: 'reach', text: 'One' }, { id: 'a2', section: 'S2', team: 'a', kind: 'reach', text: 'Two' });
    const e = checkMission(d, GUARDS).join('\n');
    expect(e).toMatch(/team a has 7 steps with the shared ones \(3-6\)/);
    expect(e).not.toMatch(/team b has/);
    // team b at 2 with the shared ones: under
    const u = op();
    u.steps = u.steps.filter((s) => s.id !== 'ask' && s.id !== 'board');
    u.steps[1]!.after = ['roof'];
    delete u.steps[2]!.needs;
    u.steps[3]!.after = ['cage'];
    expect(checkMission(u, GUARDS).join('\n')).toMatch(/team b has 2 steps/);
    // the campaign counts every step: 7 is over
    const c = op();
    c.mode = 'campaign';
    c.players = [2];
    delete c.tracks;
    c.rules = [];
    for (const s of c.steps) s.team = 'all';
    c.steps.splice(5, 0, { id: 'extra', section: 'S2', team: 'all', kind: 'reach', text: 'One more' });
    expect(checkMission(c, GUARDS).join('\n')).toMatch(/: 7 steps \(3-6\)/);
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

  it('checks rule steps: named target on an interrogate step', () => {
    const d = op();
    d.rules = [{ kind: 'namedTarget', scope: 'mission', text: 'Only the officer.', step: 'cage' }];
    expect(checkMission(d, GUARDS).join('\n')).toMatch(/namedTarget\): needs an interrogate step/);
  });

  it('(mission-rules R1, G290 / G334) oneChance and window are unknown rule kinds', () => {
    for (const kind of ['oneChance', 'window']) {
      const d = op();
      d.rules = [{ kind, scope: 'mission', text: 'Old rule.', step: 'cage' } as unknown as MissionRule];
      expect(checkMission(d, GUARDS).join('\n')).toContain(`rule 0 (${kind}): unknown kind`);
      expect(RULE_KINDS).not.toContain(kind);
    }
  });

  it('(mission-rules R1, A18) boltText: an interrogate step with a bolt, 1-90 characters', () => {
    const d = op();
    d.steps[4]!.boltText = 'Question the NOC officer in the back office';
    expect(checkMission(d, GUARDS)).toEqual([]);
    d.steps[4]!.boltText = 'x'.repeat(91);
    expect(checkMission(d, GUARDS).join('\n')).toMatch(/boltText empty or over 90 characters/);
    d.steps[4]!.boltText = '';
    expect(checkMission(d, GUARDS).join('\n')).toMatch(/boltText empty/);
    const nb = op();
    delete nb.steps[4]!.bolt;
    delete nb.steps[4]!.decoys;
    nb.steps[4]!.boltText = 'Somewhere else';
    expect(checkMission(nb, GUARDS).join('\n')).toMatch(/boltText needs an interrogate step with a bolt/);
    const ni = op();
    ni.steps[0]!.boltText = 'Somewhere else';
    expect(checkMission(ni, GUARDS).join('\n')).toMatch(/roof.*boltText needs an interrogate step with a bolt/);
  });

  it('(mission-rules R1, Q19 "None") a campaign optional step with a reward is an error; Sector Ops may reward', () => {
    const d = op();
    d.steps.splice(5, 0, { id: 'bonus', section: 'S2', team: 'a', kind: 'reach', text: 'Optional: the roof safe', optional: { reward: 'medkit' } });
    expect(checkMission(d, GUARDS)).toEqual([]);
    const c = op();
    c.mode = 'campaign';
    c.players = [2];
    delete c.tracks;
    c.rules = [];
    for (const s of c.steps) {
      s.team = 'all';
      delete s.soloWindow;
    }
    c.steps = c.steps.filter((s) => s.id !== 'cut');
    c.steps.splice(4, 0, { id: 'bonus', section: 'S2', team: 'all', kind: 'reach', text: 'Optional: the roof safe', optional: { reward: 'medkit' } });
    expect(checkMission(c, GUARDS).join('\n')).toMatch(/bonus.*campaign optional objectives give no reward \(rating only\)/);
    c.steps[4]!.optional = {};
    expect(checkMission(c, GUARDS)).toEqual([]);
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

  it('factsOf lists each gives once in step order, then (mission-rules R1) the spook facts of interrogate steps with a bolt', () => {
    expect(factsOf(op())).toEqual(['code-cage', 'ask-spooked']);
    const d = op();
    d.steps[4]!.gives = 'code-z';
    // every gives first, so the existing fact bits keep their order
    expect(factsOf(d)).toEqual(['code-cage', 'code-z', 'ask-spooked']);
    expect(spookFact(d.steps[4]!)).toBe('ask-spooked');
    delete d.steps[4]!.bolt;
    delete d.steps[4]!.decoys;
    expect(factsOf(d)).toEqual(['code-cage', 'code-z']);
  });

  it('teamForSlot (A9): 0 / 2 Team A, 1 / 3 Team B, solo and campaign carry both', () => {
    expect([0, 1, 2, 3].map((s) => teamForSlot(s, 4, 'sector'))).toEqual(['a', 'b', 'a', 'b']);
    expect(teamForSlot(2, 3, 'sector')).toBe('a');
    expect(teamForSlot(0, 1, 'sector')).toBe('all');
    expect(teamForSlot(1, 2, 'campaign')).toBe('all');
  });
});
