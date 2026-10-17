import { describe, expect, it } from 'vitest';
import { MEDKIT, stationHeal } from '../src/game/medkit';
import { CDENY_REASONS, CKINDS } from '../src/game/committedMoves';
import { MOVE_MODES, sanitizeMoveState } from '../src/player/moveState';
import { BUTTON_ACTIONS } from '../src/input/actions';
import { parseMessage } from '../src/net/protocol';

describe('wall medkit stations (G20 / G98)', () => {
  it('a station heals 40, capped at full health', () => {
    expect(MEDKIT.heal).toBe(40);
    expect(stationHeal(30, 100, true)).toBe(70);
    expect(stationHeal(75, 100, true)).toBe(100);
  });
  it('cannot be used at full health or down', () => {
    expect(stationHeal(100, 100, true)).toBeNull();
    expect(stationHeal(0, 100, false)).toBeNull();
  });
});

describe('carried medkits are gone (G98)', () => {
  it('no medkit action, move state, committed move or deny reasons', () => {
    expect((BUTTON_ACTIONS as readonly string[]).includes('medkit')).toBe(false);
    expect((MOVE_MODES as readonly string[]).includes('medkit')).toBe(false);
    expect((CKINDS as readonly string[]).includes('medkit')).toBe(false);
    expect((CDENY_REASONS as readonly string[]).includes('none')).toBe(false);
    expect((CDENY_REASONS as readonly string[]).includes('full')).toBe(false);
  });
  it('the wire refuses a medkit request and a medkit move state', () => {
    expect(parseMessage({ t: 'cmove', kind: 'medkit', id: 1, target: '' })).toBeNull();
    expect(sanitizeMoveState({ m: 'medkit', ph: 0.5 })).toBeNull();
  });
});
