import { describe, expect, it } from 'vitest';
import type { MissionDef, TeamId } from '../../src/game/mission/missionDef';
import { MissionRunner } from '../../src/game/mission/missionRunner';
import { MissionHudMount, missionViewerTeam, type MissionHudView } from '../../src/ui/hud/missionHudMount';

// (mission-framework EN4) the objective list's mount (host / solo and client): show once per mission, update every
// frame, hide when none runs or it is over, dispose on exit; the viewer team from the player slot (A9)

function op(mode: MissionDef['mode'] = 'sector'): MissionDef {
  return {
    id: 'op',
    mode,
    players: mode === 'campaign' ? [2] : [1, 2, 3, 4],
    sections: ['s1'],
    briefing: [],
    steps: [
      { id: 'a', section: 's1', team: 'all', kind: 'reach', text: 'In' },
      { id: 'b', section: 's1', team: 'all', kind: 'reach', text: 'Up', after: ['a'] },
      { id: 'out', section: 's1', team: 'all', kind: 'extract', text: 'Out', after: ['b'] },
    ],
    rules: [],
  };
}

class FakeHud implements MissionHudView {
  readonly log: string[] = [];
  show(def: MissionDef): void {
    this.log.push(`show ${def.id}`);
  }
  update(_r: MissionRunner, viewer: TeamId, hints: boolean): void {
    this.log.push(`update ${viewer} ${hints}`);
  }
  hide(): void {
    this.log.push('hide');
  }
  dispose(): void {
    this.log.push('dispose');
  }
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

describe('MissionHudMount', () => {
  it('builds lazily, shows once per mission, updates every frame, hides when none runs, disposes', () => {
    let made = 0;
    const hud = new FakeHud();
    const m = new MissionHudMount(() => {
      made++;
      return hud;
    });
    // no mission yet: nothing built, nothing shown
    m.frame(null, 'all', false);
    expect(made).toBe(0);
    expect(m.visible).toBe(false);
    const r = new MissionRunner(op(), 1);
    r.snapshot(0, 0);
    m.frame(r, 'all', false);
    m.frame(r, 'all', true);
    expect(made).toBe(1);
    expect(m.visible).toBe(true);
    expect(hud.log).toEqual(['show op', 'update all false', 'update all true']);
    // over: hidden once; a new mission shows again on the same panel
    m.frame(null, 'all', false);
    m.frame(null, 'all', false);
    expect(hud.log.slice(3)).toEqual(['hide']);
    expect(m.visible).toBe(false);
    const r2 = new MissionRunner({ ...op(), id: 'op2' }, 1);
    m.frame(r2, 'b', false);
    expect(made).toBe(1);
    expect(hud.log.slice(4)).toEqual(['show op2', 'update b false']);
    m.dispose();
    expect(hud.log[hud.log.length - 1]).toBe('dispose');
    expect(m.visible).toBe(false);
  });
});
