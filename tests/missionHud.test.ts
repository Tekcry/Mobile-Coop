import { describe, expect, it } from 'vitest';
import type { MissionDef } from '../src/game/mission/missionDef';
import { MissionRunner } from '../src/game/mission/missionRunner';
import { missionHudKey } from '../src/ui/hud/missionHud';

// (mission-framework EN3) the HUD's change key: the DOM part needs a browser, the key is pure

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
    rules: [],
  };
}

describe('missionHudKey', () => {
  it('is stable while nothing changes and moves with the hint flag, the viewer and the runner state', () => {
    const r = new MissionRunner(op(), 2);
    r.snapshot('S1', 0);
    const k = missionHudKey(r, 'a', false);
    expect(missionHudKey(r, 'a', false)).toBe(k);
    expect(missionHudKey(r, 'a', true)).not.toBe(k);
    expect(missionHudKey(r, 'b', false)).not.toBe(k);
    expect(missionHudKey(r, 'all', false)).not.toBe(missionHudKey(r, 'b', false));
    r.setFlag('code');
    r.update(1);
    expect(missionHudKey(r, 'a', false)).not.toBe(k);
  });

  it('differs per section at the same version', () => {
    const r = new MissionRunner(op(), 2);
    r.snapshot('S1', 0);
    const k1 = missionHudKey(r, 'all', true);
    r.section = 1;
    expect(missionHudKey(r, 'all', true)).not.toBe(k1);
  });
});
