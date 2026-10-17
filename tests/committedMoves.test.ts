import { describe, expect, it } from 'vitest';
import { checkCommitted, COMMIT_RATE, type CRequest } from '../src/game/committedMoves';
import { STRIKE } from '../src/game/elbowStrike';

const req = (o: Partial<CRequest> = {}): CRequest => ({ kind: 'strike', alive: true, downed: false, mode: 'ground', active: false, sinceLast: 5, target: null, slack: STRIKE.lagSlack, ...o });
const tgt = (o = {}) => ({ alive: true, seized: false, ko: false, dist: 1, ...o });

describe('committed moves: host check (A5)', () => {
  it('allows a whiff and a strike in reach', () => {
    expect(checkCommitted(req())).toBeNull();
    expect(checkCommitted(req({ target: tgt() }))).toBeNull();
    // the requester's own predicted strike mode is not busy
    expect(checkCommitted(req({ mode: 'strike', target: tgt() }))).toBeNull();
  });
  it('rate window: 0.3 s per player', () => {
    expect(checkCommitted(req({ sinceLast: COMMIT_RATE - 0.01 }))).toBe('rate');
    expect(checkCommitted(req({ sinceLast: COMMIT_RATE }))).toBeNull();
  });
  it('dead', () => {
    expect(checkCommitted(req({ alive: false }))).toBe('dead');
  });
  it('busy: attached, committed traversal, takedown, team move, downed, a running strike', () => {
    for (const mode of ['ladder', 'pipeH', 'ledge', 'vault', 'mantle', 'roll', 'takedown', 'grab', 'brace', 'boost', 'stacked']) expect(checkCommitted(req({ mode }))).toBe('busy');
    expect(checkCommitted(req({ downed: true }))).toBe('busy');
    expect(checkCommitted(req({ active: true }))).toBe('busy');
  });
  it('noTarget: dead, seized, knocked out, unknown', () => {
    expect(checkCommitted(req({ target: tgt({ alive: false }) }))).toBe('noTarget');
    expect(checkCommitted(req({ target: tgt({ seized: true }) }))).toBe('noTarget');
    expect(checkCommitted(req({ target: tgt({ ko: true }) }))).toBe('noTarget');
    expect(checkCommitted(req({ target: { alive: false, seized: false, ko: false, dist: Infinity } }))).toBe('noTarget');
  });
  it('far: past reach plus the lag slack (clients), past reach (host own)', () => {
    expect(checkCommitted(req({ target: tgt({ dist: STRIKE.reach + 0.5 }) }))).toBeNull();
    expect(checkCommitted(req({ target: tgt({ dist: STRIKE.reach + 0.7 }) }))).toBe('far');
    expect(checkCommitted(req({ slack: 0, target: tgt({ dist: STRIKE.reach + 0.1 }) }))).toBe('far');
  });
  it('host own path: the same function with no slack', () => {
    expect(checkCommitted(req({ slack: 0, target: tgt({ dist: 1.1 }) }))).toBeNull();
    expect(checkCommitted(req({ slack: 0, sinceLast: 0.1 }))).toBe('rate');
  });
});
