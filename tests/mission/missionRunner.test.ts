import { describe, expect, it } from 'vitest';
import type { MissionDef } from '../../src/game/mission/missionDef';
import { INTERROGATE_DECOY, INTERROGATE_NONE, INTERROGATE_TARGET, MissionRunner, STEP_DONE, STEP_LOCKED, STEP_OPEN } from '../../src/game/mission/missionRunner';

// (mission-framework EN1) step states from the DAG and the flags; snapshot / restore per section (PLAN section 3)

function op(): MissionDef {
  return {
    id: 'testOp',
    mode: 'sector',
    players: [1, 2, 3, 4],
    sections: ['S1', 'S2'],
    briefing: [],
    steps: [
      { id: 'roof', section: 'S1', team: 'a', kind: 'reach', text: 'Reach the gatehouse roof' },
      { id: 'board', section: 'S1', team: 'b', kind: 'intel', gives: 'code-cage', text: 'Read the duty board' },
      { id: 'cut', section: 'S1', team: 'all', kind: 'sync', after: ['roof', 'board'], window: 3, soloWindow: 20, text: 'Cut the power together' },
      { id: 'cage', section: 'S2', team: 'a', kind: 'exploit', needs: 'code-cage', done: { all: [{ flag: 'cage-pad' }, { any: [{ flag: 'door-1' }, { flag: 'door-2' }] }] }, text: 'Open the cage keypad' },
      { id: 'ask', section: 'S2', team: 'b', kind: 'interrogate', target: 'officer', decoys: ['clerk'], bolt: [1, 0, 2], gives: 'route', text: 'Question the NOC officer' },
      { id: 'out', section: 'S2', team: 'all', kind: 'extract', after: ['cage', 'ask'], text: 'Out through the loading bay' },
    ],
    rules: [],
  };
}

const states = (r: MissionRunner): number[] => Array.from({ length: r.count }, (_, i) => r.stateOf(i));

describe('MissionRunner', () => {
  it('opens the section start steps; nothing outside the current section', () => {
    const r = new MissionRunner(op(), 2);
    expect(states(r)).toEqual([STEP_LOCKED, STEP_LOCKED, STEP_LOCKED, STEP_LOCKED, STEP_LOCKED, STEP_LOCKED]);
    expect(r.snapshot('S1', 5)).toBe(true);
    expect(states(r)).toEqual([STEP_OPEN, STEP_OPEN, STEP_LOCKED, STEP_LOCKED, STEP_LOCKED, STEP_LOCKED]);
    expect(r.openedAt(0)).toBe(5);
    expect(r.snapshot('S9', 6)).toBe(false);
    expect(r.section).toBe(-1);
    expect(states(r).every((s) => s === STEP_LOCKED)).toBe(true);
  });

  it('latches steps on their flags, gives facts, opens after-steps', () => {
    const r = new MissionRunner(op(), 2);
    r.snapshot('S1', 0);
    expect(r.setFlag('unknown-flag')).toBe(false);
    r.setFlag('roof');
    expect(r.update(1)).toBe(1);
    expect(r.isDone(0)).toBe(true);
    expect(r.isOpen(2)).toBe(false);
    r.setFlag('code-cage');
    r.update(2);
    expect(r.isDone(1)).toBe(true);
    expect(r.factBits).toBe(1);
    expect(r.isOpen(2)).toBe(true);
    expect(r.openedAt(2)).toBe(2);
    expect(r.sectionDone('S1')).toBe(false);
  });

  it('sync: both halves inside the window; one player gets soloWindow', () => {
    const r = new MissionRunner(op(), 2);
    r.snapshot('S1', 0);
    r.setFlag('roof');
    r.setFlag('code-cage');
    r.update(0);
    expect(r.syncHalf(2, 0, 10)).toBe(false);
    expect(r.syncHalf(2, 1, 14)).toBe(false); // 4 s apart: outside 3 s
    expect(r.syncHalf(2, 0, 16)).toBe(true); // 2 s after the other half
    expect(r.sectionDone('S1')).toBe(true);
    const solo = new MissionRunner(op(), 1);
    solo.snapshot('S1', 0);
    solo.setFlag('roof');
    solo.setFlag('code-cage');
    solo.update(0);
    solo.syncHalf(2, 0, 10);
    expect(solo.syncHalf(2, 1, 25)).toBe(true);
  });

  it('exploit opens only with its fact; nested all / any conditions', () => {
    const r = new MissionRunner(op(), 2);
    r.snapshot('S2', 0);
    expect(r.isOpen(3)).toBe(false);
    r.setFlag('cage-pad');
    r.setFlag('code-cage');
    r.update(1);
    expect(r.isOpen(3)).toBe(true);
    expect(r.isDone(3)).toBe(false);
    r.setFlag('door-2');
    r.update(2);
    expect(r.isDone(3)).toBe(true);
  });

  it('interrogation: decoy spooks, the target completes; extraction completes the mission', () => {
    const r = new MissionRunner(op(), 2);
    r.snapshot('S2', 0);
    expect(r.interrogated('porter')).toBe(INTERROGATE_NONE);
    expect(r.interrogated('clerk')).toBe(INTERROGATE_DECOY);
    expect(r.spookStep).toBe(4);
    expect(r.interrogated('officer')).toBe(INTERROGATE_TARGET);
    expect(r.isDone(4)).toBe(true);
    expect(r.hasFlag('route')).toBe(true);
    r.setFlag('code-cage');
    r.setFlag('cage-pad');
    r.setFlag('door-1');
    r.update(3);
    expect(r.sectionDone('S2')).toBe(true);
    expect(r.isOpen(5)).toBe(true);
    expect(r.finished).toBe(false);
    r.setFlag('out');
    r.update(4);
    expect(r.finished).toBe(true);
  });

  it('restore puts back the section (its steps and facts) and keeps earlier sections', () => {
    const r = new MissionRunner(op(), 2);
    r.snapshot('S1', 0);
    r.setFlag('roof');
    r.setFlag('code-cage');
    r.update(1);
    r.complete(2);
    r.snapshot('S2', 10);
    r.interrogated('officer');
    r.setFlag('cage-pad');
    r.update(11);
    expect(r.isDone(4)).toBe(true);
    expect(r.hasFlag('route')).toBe(true);
    expect(r.restore('S2', 20)).toBe(true);
    expect(r.isDone(4)).toBe(false);
    expect(r.hasFlag('route')).toBe(false);
    expect(r.hasFlag('cage-pad')).toBe(false);
    expect(r.isDone(0) && r.isDone(1) && r.isDone(2)).toBe(true);
    expect(r.hasFlag('code-cage')).toBe(true);
    expect(r.isOpen(3)).toBe(true);
    expect(r.openedAt(3)).toBe(20);
    expect(r.restore('S9')).toBe(false);
  });

  it('client applyWire: done bits and facts, no condition evaluated', () => {
    const host = new MissionRunner(op(), 2);
    const client = new MissionRunner(op(), 2);
    host.snapshot('S1', 0);
    client.snapshot('S1', 0);
    host.setFlag('roof');
    host.setFlag('code-cage');
    host.update(1);
    expect(client.applyWire(host.doneBits, host.factBits)).toBe(true);
    expect(states(client)).toEqual(states(host));
    expect(client.applyWire(host.doneBits, host.factBits)).toBe(false);
    expect(client.stateOf(2)).toBe(STEP_OPEN);
    expect(client.stateOf(0)).toBe(STEP_DONE);
  });

  it('bumps version on changes only', () => {
    const r = new MissionRunner(op(), 2);
    r.snapshot('S1', 0);
    const v = r.version;
    r.update(1);
    expect(r.version).toBe(v);
    r.setFlag('roof');
    r.update(2);
    expect(r.version).toBeGreaterThan(v);
    expect(r.lastDone).toBe(0);
  });
});
