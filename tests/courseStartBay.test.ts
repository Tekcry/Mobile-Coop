import { describe, expect, it } from 'vitest';
import { lobbyStartBay, startableBays } from '../src/save/courseRecord';

// (marlow-play B4) "Resume hosting" sets the bay, then the lobby builds while the course record is still loading
describe('lobby start bay', () => {
  it('keeps a resumed bay while the record loads', () => {
    expect(lobbyStartBay(6, startableBays(undefined), false)).toBe(6);
  });
  it('clamps to bay 1 once the record has loaded without it', () => {
    expect(lobbyStartBay(6, startableBays(undefined), true)).toBe(1);
    expect(lobbyStartBay(2, [1, 2], true)).toBe(2);
  });
});
