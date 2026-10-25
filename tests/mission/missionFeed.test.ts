import { describe, expect, it } from 'vitest';
import { spookFact, type MissionDef } from '../../src/game/mission/missionDef';
import { MissionRunner } from '../../src/game/mission/missionRunner';
import { MissionFeed, missionCurrentStep, missionDoneLine, missionObjectiveLines, missionViewerTeam } from '../../src/game/mission/missionFeed';
import { rulesLine } from '../../src/game/mission/missionText';
import { THREE_GREY_COATS } from '../../src/world/maps/tallowWharfMissions';
// (pauseScreen's `objectiveRowState` is not imported here: the screen pulls in the PWA hook, a Vite virtual module the
// node run lacks; R8's e2e reads the Objectives rows)

// (mission-rules R6, G343 / HG7 / HG8) the objective feed (the current step on the objective line, its hint) and the
// field menu's mission rows (the rules line, then the steps); the viewer team from the player slot (A9, moved here from
// the deleted missionHudMount)

function op(mode: MissionDef['mode'] = 'sector'): MissionDef {
  return {
    id: 'op',
    mode,
    players: mode === 'campaign' ? [2] : [1, 2, 3, 4],
    sections: ['s1', 's2'],
    briefing: [],
    steps: [
      { id: 'a', section: 's1', team: 'a', kind: 'reach', text: 'Reach the roof', hint: 'The fire stair.' },
      { id: 'b', section: 's1', team: 'b', kind: 'reach', text: 'Cut the power', hint: 'The plant room.' },
      { id: 'c', section: 's1', team: 'all', kind: 'reach', text: 'Meet at the lift', after: ['a', 'b'] },
      { id: 'out', section: 's2', team: 'all', kind: 'extract', text: 'Out through the loading bay', after: ['c'] },
    ],
    rules: [{ kind: 'noKills', scope: 'b', text: 'Team B kills nobody.' }],
  };
}

/** A runner in section `si` with `players` (1: solo carries both teams). */
function run(def: MissionDef, players = 2, si = 0): MissionRunner {
  const r = new MissionRunner(def, players);
  r.snapshot(si, 0);
  r.update(0);
  return r;
}

describe('missionViewerTeam (A9)', () => {
  it('solo carries both; slots 0 and 2 Team A, 1 and 3 Team B; the campaign is one team', () => {
    expect(missionViewerTeam(op(), 0, 1)).toBe('all');
    expect(missionViewerTeam(op(), 0, 2)).toBe('a');
    expect(missionViewerTeam(op(), 1, 2)).toBe('b');
    expect(missionViewerTeam(op(), 2, 3)).toBe('a');
    expect(missionViewerTeam(op(), 3, 4)).toBe('b');
    expect(missionViewerTeam(op('campaign'), 1, 2)).toBe('all');
  });
});

describe('MissionFeed (HG7)', () => {
  it('no mission: empty, and no change to report', () => {
    const f = new MissionFeed();
    expect(f.update(null, 'all', false)).toBe(false);
    expect(f.text).toBe('');
    expect(f.hint).toBeNull();
  });

  it("shows the viewer's own current step, changes only when it changes, then the next one", () => {
    const r = run(op());
    const f = new MissionFeed();
    expect(f.update(r, 'a', false)).toBe(true);
    expect(f.text).toBe('Team A: Reach the roof');
    // the same frame again, and a version bump that leaves A's step alone: nothing to write
    expect(f.update(r, 'a', false)).toBe(false);
    r.setFlag('b');
    r.update(1);
    expect(r.isDone(1)).toBe(true);
    expect(f.update(r, 'a', false)).toBe(false);
    expect(f.text).toBe('Team A: Reach the roof');
    r.setFlag('a');
    r.update(2);
    expect(f.update(r, 'a', false)).toBe(true);
    expect(f.text).toBe('Meet at the lift');
  });

  it("a team with nothing open waits on the other team's step; Team B's line carries its rule", () => {
    const r = run(op());
    r.setFlag('a');
    r.update(1);
    const f = new MissionFeed();
    f.update(r, 'a', true);
    expect(f.text).toBe('Team B - No kills: Cut the power');
    // not his own step: no hint
    expect(f.hint).toBeNull();
    const fb = new MissionFeed();
    fb.update(r, 'b', true);
    expect(fb.hint).toBe('The plant room.');
  });

  it('the hint shows only with the hint layer on; turning it on is a change', () => {
    const r = run(op(), 1);
    const f = new MissionFeed();
    f.update(r, 'all', false);
    expect(f.text).toBe('Team A: Reach the roof');
    expect(f.hint).toBeNull();
    expect(f.update(r, 'all', true)).toBe(true);
    expect(f.hint).toBe('The fire stair.');
    expect(f.update(r, 'all', false)).toBe(true);
    expect(f.hint).toBeNull();
  });

  it("the section's work done: no step (the exit's line stays); the mission gone: cleared", () => {
    const r = run(op(), 1);
    r.setFlag('a');
    r.setFlag('b');
    r.setFlag('c');
    r.update(1);
    expect(missionCurrentStep(r, 'all')).toBe(-1);
    const f = new MissionFeed();
    expect(f.update(r, 'all', false)).toBe(false);
    expect(f.text).toBe('');
    // the next section opens the extraction
    r.snapshot(1, 2);
    r.update(2);
    expect(f.update(r, 'all', true)).toBe(true);
    expect(f.text).toBe('Out through the loading bay');
    expect(f.update(null, 'all', true)).toBe(true);
    expect(f.text).toBe('');
  });

  it("Three Grey Coats: tgc-3's reading-room line, then the clock-mender's back loft once Teale has bolted (R1, A18)", () => {
    const d = THREE_GREY_COATS;
    const r = new MissionRunner(d, 2);
    r.snapshot(0, 0);
    r.setFlag('tgc-1');
    r.setFlag('tgc-tally');
    r.setFlag('tgc-tea');
    r.update(1);
    r.snapshot(1, 2);
    r.update(2);
    const f = new MissionFeed();
    f.update(r, 'all', false);
    expect(f.text).toBe('Take the grey coat with the black umbrella in the reading room loft');
    const tgc3 = d.steps.find((s) => s.id === 'tgc-3')!;
    expect(r.setFlag(spookFact(tgc3))).toBe(true);
    expect(f.update(r, 'all', false)).toBe(true);
    expect(f.text).toBe("Take the grey coat with the black umbrella in the clock-mender's back loft");
  });
});

describe('missionObjectiveLines (HG8)', () => {
  it('the rules line first (a note), then the steps of the sections so far: done / current / to do', () => {
    const r = run(op(), 2);
    r.setFlag('a');
    r.update(1);
    const rows = missionObjectiveLines(r, 'a', true);
    expect(rows[0]).toEqual({ label: rulesLine(op()), done: false, current: false, note: true });
    expect(rows.slice(1).map((o) => [o.label, o.done, o.current])).toEqual([
      ['Team A: Reach the roof', true, false],
      ['Team B - No kills: Cut the power', false, true],
      ['Meet at the lift', false, false],
    ]);
    // the current line is Team B's, not ours: no hint on it
    expect(rows.some((o) => o.hint !== undefined)).toBe(false);
    // section 2's extraction is not listed yet
    expect(rows.some((o) => o.label.startsWith('Out'))).toBe(false);
  });

  it("the current line carries its hint when hints are on (the viewer's own step)", () => {
    const r = run(op(), 1);
    expect(missionObjectiveLines(r, 'all', true).find((o) => o.current)?.hint).toBe('The fire stair.');
    expect(missionObjectiveLines(r, 'all', false).find((o) => o.current)?.hint).toBeUndefined();
  });

  it('a mission with no rules has no note; a later section lists the earlier steps as done', () => {
    const d = { ...op(), rules: [] };
    const r = run(d, 1);
    r.setFlag('a');
    r.setFlag('b');
    r.setFlag('c');
    r.update(1);
    r.snapshot(1, 2);
    r.update(2);
    const rows = missionObjectiveLines(r, 'all', false);
    expect(rows.some((o) => o.note)).toBe(false);
    expect(rows.map((o) => o.done)).toEqual([true, true, true, false]);
    expect(rows[3]).toMatchObject({ label: 'Out through the loading bay', current: true });
  });

  it('Three Grey Coats in W2: the rule, the W1 steps done, the moved tgc-3 line current, the optional open step listed', () => {
    const d = THREE_GREY_COATS;
    const r = new MissionRunner(d, 2);
    r.snapshot(0, 0);
    r.setFlag('tgc-1');
    r.setFlag('tgc-tally');
    r.setFlag('tgc-tea');
    r.update(1);
    r.snapshot(1, 2);
    r.update(2);
    r.setFlag(spookFact(d.steps.find((s) => s.id === 'tgc-3')!));
    const rows = missionObjectiveLines(r, 'all', false);
    expect(rows[0]!.note).toBe(true);
    expect(rows[0]!.label).toBe('Rules: Named target');
    expect(rows.filter((o) => o.done).length).toBe(2);
    expect(rows.find((o) => o.current)?.label).toBe("Take the grey coat with the black umbrella in the clock-mender's back loft");
    expect(rows.some((o) => o.label.startsWith('Optional'))).toBe(true);
    // W4's steps are not listed yet; no Sector Ops label anywhere
    expect(rows.some((o) => o.label.includes('shed three'))).toBe(false);
    expect(rows.some((o) => o.label.includes('ledger'))).toBe(false);
  });
});

describe('missionDoneLine (lead ruling 2)', () => {
  it("the section's last done step; none in this section (Three Grey Coats W3): no line", () => {
    const r = run(op(), 1);
    expect(missionDoneLine(r)).toBe('');
    r.setFlag('a');
    r.update(1);
    expect(missionDoneLine(r)).toBe('Team A: Reach the roof');
    const d = THREE_GREY_COATS;
    const t = new MissionRunner(d, 2);
    t.snapshot(0, 0);
    t.setFlag('tgc-1');
    t.setFlag('tgc-tally');
    t.setFlag('tgc-tea');
    t.update(1);
    expect(missionDoneLine(t)).toBe(d.steps[1]!.text);
    // W3 has no step: the "Take the ledger" Sector Ops label is never named
    t.snapshot(2, 2);
    expect(missionDoneLine(t)).toBe('');
  });
});
