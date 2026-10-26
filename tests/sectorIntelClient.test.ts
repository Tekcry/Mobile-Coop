import { describe, expect, it } from 'vitest';
import { markIntel, parseMessage, type EnemyState } from '../src/net/protocol';
import { HOST_INFO, hasInfo, takeInfo, type GuardInfo, type HasInfo } from '../src/ai/guardInfo';
import { EnemyPuppet } from '../src/net/enemyPuppet';

// (stealth-pays client intel) the host's `EnemyState.in` flag: a co-op client offers INTERROGATE on a guard with
// unspent intel in both modes (Sector Ops slots, revived guards, a rejoin), and the spent state follows the host

const base = (): EnemyState => ({ id: 'e1', k: 'grunt', x: 1, y: 0, z: 2, yaw: 0, st: 0, hp: 1, al: 0 });
const INFO: GuardInfo = { lines: ['The keypad code is on the board.'] };

function snapEnemy(e: unknown): EnemyState | undefined {
  const m = parseMessage({ t: 'snap', time: 1, players: [], enemies: [e], obj: '', info: '' });
  return m?.t === 'snap' ? m.enemies[0] : undefined;
}

/** A puppet's intel state without its rig (Babylon): `setIntel` reads and writes only these. */
interface IntelPuppet {
  info: GuardInfo | null;
  spawnInfo: GuardInfo | null;
  intel: boolean;
}
const puppet = (spawnInfo: GuardInfo | null = null): IntelPuppet => ({ info: null, spawnInfo, intel: false });
const setIntel = (p: IntelPuppet, on: boolean): void => EnemyPuppet.prototype.setIntel.call(p as unknown as EnemyPuppet, on);

describe('EnemyState.in on the wire', () => {
  it('round-trips 1 and drops everything else', () => {
    expect(snapEnemy({ ...base(), in: 1 })?.in).toBe(1);
    const none = snapEnemy(base());
    expect(none).toBeDefined();
    expect(none && 'in' in none).toBe(false);
    for (const bad of [0, 2, true, '1', -1, 0.5, null]) {
      const e = snapEnemy({ ...base(), in: bad });
      expect(e).toBeDefined();
      expect(e && 'in' in e).toBe(false);
    }
  });

  it('costs nothing for a guard without intel', () => {
    expect(JSON.stringify(markIntel(base(), false))).toBe(JSON.stringify(base()));
    expect(JSON.stringify(markIntel(base(), true)).length - JSON.stringify(base()).length).toBe(',"in":1'.length);
  });
});

describe('host writer', () => {
  it('sets the flag for a guard with info, clears it once spent, never for one without', () => {
    const g: HasInfo = { info: INFO };
    expect(markIntel(base(), hasInfo(g)).in).toBe(1);
    expect(takeInfo(g)).toEqual(INFO.lines);
    expect('in' in markIntel(base(), hasInfo(g))).toBe(false);
    expect('in' in markIntel(base(), hasInfo({}))).toBe(false);
    expect('in' in markIntel(base(), hasInfo({ info: { lines: [] } }))).toBe(false);
    const s = markIntel(base(), true);
    expect('in' in markIntel(s, false)).toBe(false);
  });
});

describe('puppet offer follows the flag', () => {
  it('Marlow Yard: the course slot lines, offered and spent as before', () => {
    const p = puppet(INFO);
    setIntel(p, true);
    expect(p.info).toBe(INFO);
    expect(hasInfo(p)).toBe(true);
    expect(takeInfo(p)).toEqual(INFO.lines);
    // the host has not heard yet: the still-set flag does not bring the menu back
    setIntel(p, true);
    expect(hasInfo(p)).toBe(false);
    setIntel(p, false);
    expect(hasInfo(p)).toBe(false);
  });

  it('no host flag: no offer even when a course slot has lines (the host spent them, or he never had them)', () => {
    const p = puppet(INFO);
    setIntel(p, false);
    expect(hasInfo(p)).toBe(false);
  });

  it('Sector Ops / revived / rejoined: no local lines, the offer still shows and the host answers', () => {
    const p = puppet(null);
    setIntel(p, true);
    expect(p.info).toBe(HOST_INFO);
    expect(hasInfo(p)).toBe(true);
    // the client says nothing itself (the host's intel arrives as feed lines)
    expect(takeInfo(p)).toBeNull();
    expect(hasInfo(p)).toBe(false);
    setIntel(p, true);
    expect(hasInfo(p)).toBe(false);
  });

  it('the host spends it (its own interrogation): the next snapshot clears the offer', () => {
    const p = puppet(null);
    setIntel(p, true);
    setIntel(p, false);
    expect(p.info).toBeNull();
    // a rise again (e.g. a revive under the same id) offers again
    setIntel(p, true);
    expect(hasInfo(p)).toBe(true);
  });

  it('HOST_INFO is frozen and empty (never said, never mutated)', () => {
    expect(HOST_INFO.lines.length).toBe(0);
    expect(Object.isFrozen(HOST_INFO)).toBe(true);
    expect(hasInfo({ info: HOST_INFO })).toBe(true);
  });
});
