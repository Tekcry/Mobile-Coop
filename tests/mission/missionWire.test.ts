import { describe, expect, it } from 'vitest';
import type { MissionDef } from '../../src/game/mission/missionDef';
import { MissionRunner } from '../../src/game/mission/missionRunner';
import { RuleTracker, SCOPE_A, SCOPE_B, SCOPE_MISSION } from '../../src/game/mission/ruleTracker';
import { applyMissionWire, MISSION_WIRE, packMission, parseMissionWire, wireDoneBits, wireKept } from '../../src/game/mission/missionWire';

// (mission-framework EN1) the `ms` pack: plain data, host-authoritative, clamped on parse (PLAN section 3; no protocol change)

function op(): MissionDef {
  return {
    id: 'testOp',
    mode: 'sector',
    players: [1, 2, 3, 4],
    sections: ['S1', 'S2'],
    briefing: [],
    steps: [
      { id: 'roof', section: 'S1', team: 'a', kind: 'reach', text: 'Reach the roof' },
      { id: 'board', section: 'S1', team: 'b', kind: 'intel', gives: 'code', text: 'Read the board' },
      { id: 'meet', section: 'S1', team: 'all', kind: 'reach', after: ['roof', 'board'], text: 'Meet at the stair' },
      { id: 'out', section: 'S2', team: 'all', kind: 'extract', text: 'Out' },
    ],
    rules: [
      { kind: 'ghost', scope: 'mission', text: 'Nobody sees you.' },
      { kind: 'noKills', scope: 'b', text: 'Team B kills nobody.' },
    ],
  };
}

function host(): { r: MissionRunner; t: RuleTracker } {
  const d = op();
  const r = new MissionRunner(d, 2);
  const t = new RuleTracker(d, 2, r);
  r.snapshot('S1', 0);
  r.setFlag('roof');
  r.setFlag('code');
  r.update(1);
  t.onKill(1, false);
  t.update(2);
  return { r, t };
}

describe('missionWire', () => {
  it('packs done bits per team, facts, the break counter, its line and the kept rules', () => {
    const { r, t } = host();
    const w = packMission(r, t);
    expect(w).toEqual({ id: 'testOp', st: [0b1, 0b10, 0], f: 1, rb: 1, rl: 'No kills broken. Back to the section checkpoint.', rk: [0b1, 0, 0] });
    expect(wireDoneBits(w)).toBe(0b11);
    expect(wireKept(w, SCOPE_MISSION, 0)).toBe(true);
    expect(wireKept(w, SCOPE_B, 1)).toBe(false);
    expect(wireKept(w, SCOPE_A, 1)).toBe(false);
  });

  it('round-trips through JSON and applies on the client runner', () => {
    const { r, t } = host();
    const w = parseMissionWire(JSON.parse(JSON.stringify(packMission(r, t))));
    expect(w).not.toBeNull();
    const client = new MissionRunner(op(), 2);
    client.snapshot('S1', 0);
    expect(applyMissionWire(client, w!)).toBe(true);
    for (let i = 0; i < r.count; i++) expect(client.stateOf(i)).toBe(r.stateOf(i));
    expect(client.hasFlag('code')).toBe(true);
    expect(applyMissionWire(client, { ...w!, id: 'other' })).toBe(false);
  });

  it('drops a done bit sent under the wrong team', () => {
    const client = new MissionRunner(op(), 2);
    client.snapshot('S1', 0);
    applyMissionWire(client, { id: 'testOp', st: [0b10, 0, 0], f: 0, rb: 0, rl: '', rk: [] });
    expect(client.isDone(1)).toBe(false);
  });

  it('rejects malformed input and clamps the rest', () => {
    const ok = { id: 'testOp', st: [1, 2, 4], f: 1, rb: 0, rl: '', rk: [3, 0, 0] };
    expect(parseMissionWire(ok)).toEqual(ok);
    expect(parseMissionWire(null)).toBeNull();
    expect(parseMissionWire('x')).toBeNull();
    expect(parseMissionWire({ ...ok, id: '' })).toBeNull();
    expect(parseMissionWire({ ...ok, id: 'x'.repeat(65) })).toBeNull();
    expect(parseMissionWire({ ...ok, st: [1, 2, 3, 4] })).toBeNull();
    expect(parseMissionWire({ ...ok, st: [1.5] })).toBeNull();
    expect(parseMissionWire({ ...ok, f: -1 })).toBeNull();
    expect(parseMissionWire({ ...ok, rb: 'x' })).toBeNull();
    expect(parseMissionWire({ ...ok, rl: 5 })).toBeNull();
    expect(parseMissionWire({ ...ok, rk: 'x' })).toBeNull();
    const big = parseMissionWire({ ...ok, st: [2 ** 40 + 3], rb: 1e12, rl: 'y'.repeat(500), rk: [0x1ff] })!;
    expect(big.st).toEqual([3 & MISSION_WIRE.bits, 0, 0]);
    expect(big.rb).toBe(MISSION_WIRE.rbMax);
    expect(big.rl.length).toBe(MISSION_WIRE.lineMax);
    expect(big.rk[0]).toBe(0xff);
  });
});
