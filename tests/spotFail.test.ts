/**
 * (marlow-walk482 X2a) The per-set "spotted fails the set" rule: `spotFailed(bay, squad)` is true only for a bay with
 * `spotFail` and a live, non-passive squad guard in combat.
 */
import { describe, expect, it } from 'vitest';
import { CAUGHT_HOLD, inCombat, spotFailed, stationRetryCause, type CaughtClock, type SpotGuard } from '../src/game/course/spotFail';

const guard = (o: Partial<SpotGuard> = {}): SpotGuard => ({ alive: true, alerted: false, passive: false, ...o });
const RULE = { spotFail: 'Spotted. Back to the start of the set.' };

describe('spotFailed', () => {
  it('a bay without the rule never fails, even with an alerted guard', () => {
    expect(spotFailed({}, [guard({ alerted: true })])).toBe(false);
    expect(spotFailed({ spotFail: '' }, [guard({ alerted: true })])).toBe(false);
  });
  it('an empty or calm squad does not fail', () => {
    expect(spotFailed(RULE, [])).toBe(false);
    expect(spotFailed(RULE, [guard(), guard(), guard()])).toBe(false);
  });
  it('one alerted guard fails the set, wherever he is in the squad', () => {
    expect(spotFailed(RULE, [guard({ alerted: true })])).toBe(true);
    expect(spotFailed(RULE, [guard(), guard(), guard({ alerted: true })])).toBe(true);
  });
  it('a dead or passive alerted guard does not fail the set', () => {
    expect(spotFailed(RULE, [guard({ alerted: true, alive: false })])).toBe(false);
    expect(spotFailed(RULE, [guard({ alerted: true, passive: true })])).toBe(false);
    expect(spotFailed(RULE, [guard({ alerted: true, alive: false }), guard({ alerted: true, passive: true }), guard()])).toBe(false);
  });
});

describe('stationRetryCause (J14 R1)', () => {
  it('a station (A1-A7): a guard in combat or a camera full on a player is seen; nothing else', () => {
    const c: CaughtClock = { t: 0 };
    expect(stationRetryCause('station', false, false, c, 0.1)).toBeNull();
    expect(stationRetryCause('station', true, false, c, 0.1)).toBe('seen');
    expect(stationRetryCause('station', false, true, c, 0.1)).toBe('seen');
  });
  it('caught (A8): combat held CAUGHT_HOLD s; a break restarts the count; cameras play out', () => {
    const c: CaughtClock = { t: 0 };
    expect(CAUGHT_HOLD).toBe(2);
    for (let i = 0; i < 15; i++) expect(stationRetryCause('caught', true, true, c, 0.1)).toBeNull();
    expect(stationRetryCause('caught', false, true, c, 0.1)).toBeNull();
    expect(c.t).toBe(0);
    let at = 0;
    for (let i = 1; i <= 25 && !at; i++) if (stationRetryCause('caught', true, false, c, 0.1) === 'caught') at = i;
    expect(at).toBe(20);
  });
  it('none (or a station switched off) never retries and holds no count', () => {
    const c: CaughtClock = { t: 1.5 };
    expect(stationRetryCause('none', true, true, c, 0.1)).toBeNull();
    expect(c.t).toBe(0);
  });
  it('inCombat: a live, non-passive alerted guard', () => {
    expect(inCombat([guard(), guard({ alerted: true, passive: true }), guard({ alerted: true, alive: false })])).toBe(false);
    expect(inCombat([guard(), guard({ alerted: true })])).toBe(true);
  });
});
