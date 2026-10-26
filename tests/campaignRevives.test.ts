// (mission-rules R5, G126 "30-second revive, 2 per mission", BRIEF A7) The host's revive rules: a campaign mission has
// 2 revives at every difficulty and a 30 s window, never topped up by a rating's syringes (Q19 "None"), used revives
// kept across checkpoints; Sector Ops keeps its syringes per difficulty (G188); other modes (Marlow Yard's course) the
// clock's default 2.
import { describe, expect, it } from 'vitest';
import type { DifficultyPreset } from '../src/ai/archetypes';
import { CoopHost, matchRevives } from '../src/net/coopHost';
import { REVIVE_WINDOW, ReviveClock } from '../src/game/reviveClock';
import { CAMPAIGN } from '../src/game/mission/campaign';
import { SECTOR } from '../src/game/sectors';
import { THREE_GREY_COATS, TWO_KEY_LEDGER, WHARF_MISSIONS } from '../src/world/maps/tallowWharfMissions';
import { CAMPUS_MISSION_TEST } from '../src/world/maps/campusMissionTest';

const PRESETS: readonly DifficultyPreset[] = ['rookie', 'normal', 'realistic', 'perfectionist'];

/** A host as the constructor leaves its revive state (the rest of CoopHost is not built). */
function host(mode: Parameters<typeof matchRevives>[1], difficulty: DifficultyPreset, missions: Parameters<typeof matchRevives>[3], id: string) {
  const reviveClock = new ReviveClock();
  const campaign = matchRevives(reviveClock, mode, difficulty, missions, id);
  const h = Object.create(CoopHost.prototype) as CoopHost;
  Object.assign(h, { reviveClock, campaign });
  return h;
}

describe('campaign revives (mission-rules R5, G126)', () => {
  it('a campaign mission has 2 revives at every difficulty, 30 s window', () => {
    expect(CAMPAIGN.revives).toBe(2);
    for (const m of [THREE_GREY_COATS, TWO_KEY_LEDGER])
      for (const p of PRESETS) {
        const h = host('sector', p, WHARF_MISSIONS, m.id);
        expect(h.reviveClock.cap).toBe(2);
        expect(h.revivesLeft()).toBe(2);
        expect(h.reviveClock.window).toBe(REVIVE_WINDOW);
        expect(REVIVE_WINDOW).toBe(30);
      }
  });

  it('Sector Ops keeps its syringes per difficulty: 3 / 2 / 1 / 1 (no mission, a sector mission, an unknown id)', () => {
    const want = [3, 2, 1, 1];
    PRESETS.forEach((p, i) => {
      expect(SECTOR.syringes[p]).toBe(want[i]);
      expect(host('sector', p, undefined, '').reviveClock.cap).toBe(want[i]);
      expect(host('sector', p, [CAMPUS_MISSION_TEST], CAMPUS_MISSION_TEST.id).reviveClock.cap).toBe(want[i]);
      expect(host('sector', p, WHARF_MISSIONS, 'noSuchMission').reviveClock.cap).toBe(want[i]);
    });
  });

  it('other modes keep the clock default (2, 30 s): the course (Marlow Yard) and a campaign id outside Sector Ops', () => {
    for (const p of PRESETS) {
      const c = host('course', p, undefined, '');
      expect(c.reviveClock.cap).toBe(2);
      expect(c.reviveClock.window).toBe(30);
      expect(host('course', p, WHARF_MISSIONS, THREE_GREY_COATS.id).reviveClock.cap).toBe(2);
    }
  });

  it('addSyringes does nothing in a campaign mission', () => {
    for (const p of PRESETS) {
      const h = host('sector', p, WHARF_MISSIONS, THREE_GREY_COATS.id);
      h.addSyringes(2);
      h.addSyringes(9);
      expect(h.reviveClock.cap).toBe(2);
      expect(h.revivesLeft()).toBe(2);
    }
  });

  it('addSyringes still tops up Sector Ops and the course as before', () => {
    const s = host('sector', 'realistic', [CAMPUS_MISSION_TEST], CAMPUS_MISSION_TEST.id);
    s.addSyringes(2);
    expect(s.reviveClock.cap).toBe(3);
    const n = host('sector', 'normal', undefined, '');
    n.addSyringes(1);
    expect(n.revivesLeft()).toBe(3);
    const c = host('course', 'normal', undefined, '');
    c.addSyringes(1);
    expect(c.reviveClock.cap).toBe(3);
  });

  it('campaign revives used stay across a checkpoint (per mission); the third down is out at once', () => {
    const h = host('sector', 'rookie', WHARF_MISSIONS, TWO_KEY_LEDGER.id);
    const c = h.reviveClock;
    expect(c.down('a')).toBe(true);
    expect(c.revive('a')).toBe(true);
    c.checkpoint();
    h.addSyringes(3);
    expect(c.down('b')).toBe(true);
    expect(c.revive('b')).toBe(true);
    c.checkpoint();
    expect(h.revivesLeft()).toBe(0);
    expect(c.down('a')).toBe(false);
  });
});
