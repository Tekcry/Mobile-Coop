/**
 * (marlow-walk482 X2a) The per-set "spotted fails the set" rule: `spotFailed(bay, squad)` is true only for a bay with
 * `spotFail` and a live, non-passive squad guard in combat.
 */
import { describe, expect, it } from 'vitest';
import { spotFailed, type SpotGuard } from '../src/game/course/spotFail';

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
