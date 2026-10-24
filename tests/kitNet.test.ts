// (mission-framework NET) The kit moves on the wire: `pull` / `shutter` in tmove / tstart, the host's start (a pull-up
// request's catch point as `l`, a pair), its crouch read (the shutter's crawl), the pull-up verdict on the host's clock
// (only the holder claims; a late catch is a drop; the partner may drop), the shutter's ends, a death ending the pair,
// and the remote pose of a kit partner (never the leg-up's).
import { describe, expect, it, vi } from 'vitest';
import { parseMessage } from '../src/net/protocol';
import { CoopHost } from '../src/net/coopHost';
import { CoopClient } from '../src/net/coopClient';
import { kitEnd, kitPairOver, newKitPair, pullLag, PULL_PAIR_S } from '../src/net/kitNet';
import { PULL } from '../src/game/kit/pullUp';
import { SHUTTER } from '../src/game/kit/shutter';
import { PULL_SUB, SHUTTER_SUB, TEAM_KINDS } from '../src/game/teamMoves';
import { emptyMovePose, emptyMoveState, poseFromMoveState } from '../src/player/moveState';
import { newTeamPoseIn, teamPoseOfWire } from '../src/anim/clips/team';
import { teamRowOfWire } from '../src/anim/tuneMoveRows';
import { PF } from '../src/net/protocol';

const H = 4.4;

describe('kit NET: the wire kinds', () => {
  it('tmove / tstart take pull and shutter; a kit claim and start carry the point when given', () => {
    expect(TEAM_KINDS).toContain('pull');
    expect(TEAM_KINDS).toContain('shutter');
    expect(parseMessage({ t: 'tmove', kind: 'pull', partner: 'b1', target: -1, s: 0, gy: H, lx: 0.85, lz: 0 })).toEqual({ t: 'tmove', kind: 'pull', partner: 'b1', target: -1, s: 0, gy: H, lx: 0.85, lz: 0 });
    expect(parseMessage({ t: 'tmove', kind: 'shutter', partner: 'b1', target: -1, s: 0, gy: 0 })).toEqual({ t: 'tmove', kind: 'shutter', partner: 'b1', target: -1, s: 0, gy: 0 });
    expect(parseMessage({ t: 'tstart', kind: 'pull', a: 'a1', b: 'b1', target: -1, s: 0, t0: 3, l: [0.85, H, 0] })).toEqual({ t: 'tstart', kind: 'pull', a: 'a1', b: 'b1', target: -1, s: 0, t0: 3, l: [0.85, H, 0] });
    expect(parseMessage({ t: 'tstart', kind: 'shutter', a: 'a1', b: 'b1', target: -1, s: 0, t0: 3 })).toEqual({ t: 'tstart', kind: 'shutter', a: 'a1', b: 'b1', target: -1, s: 0, t0: 3 });
    expect(parseMessage({ t: 'tstart', kind: 'pull', a: 'a1', b: 'b1', target: -1, s: 0, t0: 3, l: [0, 'x', 0] })).toBeNull();
    expect(parseMessage({ t: 'tmove', kind: 'leap', partner: 'b1', target: -1, s: 0, gy: 0 })).toBeNull();
    // a throw still needs its landing
    expect(parseMessage({ t: 'tmove', kind: 'throw', partner: 'b1', target: -1, s: 0, gy: 0 })).toBeNull();
  });

  it("the client's request carries the claimed point for any kind", () => {
    const c = Object.create(CoopClient.prototype) as CoopClient;
    const sent: unknown[] = [];
    Object.assign(c, { s: { toHost: (m: unknown) => sent.push(m) } });
    c.teamRequest('pull', 'h', -1, 0, H, 0.85, 0);
    c.teamRequest('shutter', 'h', -1, 0, 0);
    expect(sent).toEqual([
      { t: 'tmove', kind: 'pull', partner: 'h', target: -1, s: 0, gy: H, lx: 0.85, lz: 0 },
      { t: 'tmove', kind: 'shutter', partner: 'h', target: -1, s: 0, gy: 0 },
    ]);
  });
});

describe('kit NET: the host verdict (kitNet)', () => {
  it('pull-up: only the holder b claims; inside the window (plus the lag) a catch, past it a drop', () => {
    const p = newKitPair('pull', 'a1', 'b1', 10);
    expect(kitEnd(p, 'a1', 'pull', 10.3, 0)).toBeNull();
    expect(kitEnd(p, 'x', 'pull', 10.3, 0)).toBeNull();
    expect(kitEnd(p, 'b1', 'pull', 10 + PULL.apexT, 0)).toBe('pull');
    // one verdict per attempt
    expect(kitEnd(p, 'b1', 'drop', 10.5, 0)).toBeNull();
    expect(kitPairOver(p, 'pull')).toBe(false);
    // a late catch (host clock) is a drop; a client holder's lag widens the end only
    const late = newKitPair('pull', 'a1', 'b1', 10);
    expect(kitEnd(late, 'b1', 'pull', 10 + PULL.catchClose + 0.05, pullLag(true))).toBe('drop');
    const lagged = newKitPair('pull', 'a1', 'b1', 10);
    expect(kitEnd(lagged, 'b1', 'pull', 10 + PULL.catchClose + 0.05, pullLag(false))).toBe('pull');
    const early = newKitPair('pull', 'a1', 'b1', 10);
    expect(kitEnd(early, 'b1', 'pull', 10 + PULL.catchOpen - 0.05, pullLag(false))).toBe('drop');
    expect(kitPairOver(early, 'drop')).toBe(true);
    // the latest catch the host takes is before a host partner's landing hold runs out
    expect(PULL.catchClose + PULL.claimLag).toBeLessThan(PULL.landT + PULL.verdictWait);
  });

  it('pull-up: the partner may drop (landed with no verdict, or after a catch it never saw)', () => {
    const p = newKitPair('pull', 'a1', 'b1', 10);
    expect(kitEnd(p, 'a1', 'drop', 10.9, 0)).toBe('drop');
    expect(kitEnd(p, 'b1', 'pull', 10.3, 0)).toBeNull();
    const q = newKitPair('pull', 'a1', 'b1', 10);
    expect(kitEnd(q, 'b1', 'pull', 10.4, 0.3)).toBe('pull');
    expect(kitEnd(q, 'a1', 'drop', 10.9, 0)).toBe('drop');
    expect(kitEnd(q, 'a1', 'drop', 11, 0)).toBeNull();
    expect(newKitPair('pull', 'a1', 'b1', 10).until).toBeCloseTo(10 + PULL_PAIR_S, 6);
  });

  it('shutter: only the crawler a says through; either side drops; the pair ends', () => {
    const p = newKitPair('shutter', 'a1', 'b1', 10);
    expect(p.until).toBe(Infinity);
    expect(kitEnd(p, 'b1', 'pull', 11, 0)).toBeNull();
    expect(kitEnd(p, 'a1', 'pull', 11, 0)).toBe('pull');
    expect(kitEnd(p, 'b1', 'drop', 11, 0)).toBe('drop');
    expect(kitEnd(p, 'a1', 'drop', 11, 0)).toBe('drop');
    expect(kitEnd(p, 'x', 'drop', 11, 0)).toBeNull();
    expect(kitPairOver(p, 'pull')).toBe(true);
  });
});

/** A host with two remote players (`c1` asks, `c2` holds) and itself (`h`) out of it. */
function host(c1: { x: number; y: number; z: number; m: string; sub?: number; s?: number; f?: number }, c2: { x: number; y: number; z: number; m: string; sub?: number; s?: number; f?: number }) {
  const h = Object.create(CoopHost.prototype) as CoopHost;
  const sent: Record<string, unknown>[] = [];
  const team = { begin: vi.fn(), ended: vi.fn(), denied: vi.fn() };
  const mode = { onTeamMove: vi.fn() };
  const rp = (id: string, p: typeof c1) => ({ id, alive: true, held: false, feet: { x: p.x, y: p.y, z: p.z }, state: { f: p.f ?? PF.grounded, mv: { ...emptyMoveState(), m: p.m, sub: p.sub ?? 0, s: p.s ?? 0 } } });
  const remotes = new Map([
    ['c1', rp('c1', c1)],
    ['c2', rp('c2', c2)],
  ]);
  Object.assign(h, {
    s: { selfId: 'h', send: (m: Record<string, unknown>) => sent.push(m) },
    g: { team, mode, player: { alive: true, controller: { crouched: false } }, world: { level: { anchors: { get: () => null } } } },
    remotes,
    teamPairs: new Map(),
    kitPairs: new Map(),
    teamLast: new Map(),
    time: 20,
  });
  const H_ = h as unknown as {
    onTeamMove(by: string, kind: string, partner: string, target: number, ss: number, gy: number, lx?: number, lz?: number): void;
    endPairOf(id: string): void;
    teamPairs: Map<string, string>;
    kitPairs: Map<string, unknown>;
    time: number;
    teamSide(id: string): { crouch?: boolean } | null;
  };
  return { h: H_, sent, team, mode, remotes };
}

describe('kit NET: the host starts and ends kit moves', () => {
  it('a pull-up request: checked with its claimed point, started at once with `l`, paired, the mode told', () => {
    const t = host({ x: 1.2, y: 0, z: 0, m: 'ground' }, { x: 0, y: H, z: 0, m: 'brace', sub: PULL_SUB });
    t.h.onTeamMove('c1', 'pull', 'c2', -1, 0, H, 0.85, 0);
    expect(t.sent).toEqual([{ t: 'tstart', kind: 'pull', a: 'c1', b: 'c2', target: -1, s: 0, t0: 20, l: [0.85, H, 0] }]);
    expect(t.h.teamPairs.get('c1')).toBe('c2');
    expect(t.h.teamPairs.get('c2')).toBe('c1');
    expect(t.mode.onTeamMove).toHaveBeenCalledWith('c1', 'c2');
    // without the point the rule denies it (noTarget)
    const u = host({ x: 1.2, y: 0, z: 0, m: 'ground' }, { x: 0, y: H, z: 0, m: 'brace', sub: PULL_SUB });
    u.h.onTeamMove('c1', 'pull', 'c2', -1, 0, H);
    expect(u.sent).toEqual([{ t: 'tdeny', a: 'c1', reason: 'noTarget' }]);
  });

  it('the pull-up verdict: only b claims, a late catch is relayed as drop, and the pair goes', () => {
    const t = host({ x: 1.2, y: 0, z: 0, m: 'ground' }, { x: 0, y: H, z: 0, m: 'brace', sub: PULL_SUB });
    t.h.onTeamMove('c1', 'pull', 'c2', -1, 0, H, 0.85, 0);
    t.sent.length = 0;
    // the partner's own "catch" is ignored
    t.h.time = 20 + PULL.apexT;
    t.h.onTeamMove('c1', 'hangEnd', '', 0, 0, 0);
    expect(t.sent).toEqual([]);
    // the holder's claim, late even with the client lag
    t.h.time = 20 + PULL.catchClose + PULL.claimLag + 0.05;
    t.h.onTeamMove('c2', 'hangEnd', '', 0, 0, 0);
    expect(t.sent).toEqual([{ t: 'tend', a: 'c1', b: 'c2', k: 'drop' }]);
    expect(t.h.teamPairs.size).toBe(0);
    expect(t.h.kitPairs.size).toBe(0);
  });

  it('a catch in time is relayed; the partner landing first answers drop to both', () => {
    const t = host({ x: 1.2, y: 0, z: 0, m: 'ground' }, { x: 0, y: H, z: 0, m: 'brace', sub: PULL_SUB });
    t.h.onTeamMove('c1', 'pull', 'c2', -1, 0, H, 0.85, 0);
    t.sent.length = 0;
    t.h.time = 20 + PULL.catchClose + 0.2;
    t.h.onTeamMove('c2', 'hangEnd', '', 0, 0, 0);
    expect(t.sent).toEqual([{ t: 'tend', a: 'c1', b: 'c2', k: 'pull' }]);
    t.h.onTeamMove('c1', 'hangEnd', '', 1, 0, 0);
    expect(t.sent[1]).toEqual({ t: 'tend', a: 'c1', b: 'c2', k: 'drop' });
    expect(t.h.kitPairs.size).toBe(0);
  });

  it("teamSide fills crouch from the host's view; the shutter's crawl needs it", () => {
    const holder = { x: 0, y: 0, z: 0, m: 'brace', sub: SHUTTER_SUB, s: SHUTTER.holdGap };
    const up = host({ x: 1, y: 0, z: 0, m: 'ground' }, holder);
    expect(up.h.teamSide('c1')?.crouch).toBe(false);
    up.h.onTeamMove('c1', 'shutter', 'c2', -1, 0, 0);
    expect(up.sent).toEqual([{ t: 'tdeny', a: 'c1', reason: 'tooHigh' }]);
    const low = host({ x: 1, y: 0, z: 0, m: 'ground', f: PF.grounded | PF.crouch }, holder);
    expect(low.h.teamSide('c1')?.crouch).toBe(true);
    low.h.onTeamMove('c1', 'shutter', 'c2', -1, 0, 0);
    expect(low.sent).toEqual([{ t: 'tstart', kind: 'shutter', a: 'c1', b: 'c2', target: -1, s: 0, t0: 20 }]);
  });

  it('the shutter ends: the holder cannot say through; the crawler through ends the pair', () => {
    const t = host({ x: 1, y: 0, z: 0, m: 'ground', f: PF.grounded | PF.crouch }, { x: 0, y: 0, z: 0, m: 'brace', sub: SHUTTER_SUB, s: SHUTTER.holdGap });
    t.h.onTeamMove('c1', 'shutter', 'c2', -1, 0, 0);
    t.sent.length = 0;
    t.h.onTeamMove('c2', 'hangEnd', '', 0, 0, 0);
    expect(t.sent).toEqual([]);
    t.h.onTeamMove('c1', 'hangEnd', '', 0, 0, 0);
    expect(t.sent).toEqual([{ t: 'tend', a: 'c1', b: 'c2', k: 'pull' }]);
    expect(t.h.teamPairs.size).toBe(0);
    // a holder's drop on a fresh pair ends it as a drop
    t.h.time = 30;
    t.h.onTeamMove('c1', 'shutter', 'c2', -1, 0, 0);
    t.sent.length = 0;
    t.h.onTeamMove('c2', 'hangEnd', '', 1, 0, 0);
    expect(t.sent).toEqual([{ t: 'tend', a: 'c1', b: 'c2', k: 'drop' }]);
  });

  it('a player down mid-move ends the pair (the partner told)', () => {
    const t = host({ x: 1, y: 0, z: 0, m: 'ground', f: PF.grounded | PF.crouch }, { x: 0, y: 0, z: 0, m: 'brace', sub: SHUTTER_SUB, s: SHUTTER.holdGap });
    t.h.onTeamMove('c1', 'shutter', 'c2', -1, 0, 0);
    t.sent.length = 0;
    t.h.endPairOf('c2');
    expect(t.sent).toEqual([{ t: 'tend', a: 'c2', b: 'c1' }]);
    expect(t.h.teamPairs.size).toBe(0);
    expect(t.h.kitPairs.size).toBe(0);
  });
});

describe('kit NET: a remote kit partner poses from its own move, never the leg-up', () => {
  it('teamPoseOfWire: boost + PULL_SUB / SHUTTER_SUB are role a of pull / shutter', () => {
    const o = newTeamPoseIn();
    teamPoseOfWire('boost', PULL_SUB, 0, 0.4, 'p', o);
    expect([o.move, o.role, o.k]).toEqual(['pull', 'a', 0.4]);
    teamPoseOfWire('boost', SHUTTER_SUB, 0, 0, 'p', o);
    expect([o.move, o.role]).toEqual(['shutter', 'a']);
    teamPoseOfWire('boost', 0, 0, 0.4, 'p', o);
    expect([o.move, o.role]).toEqual(['boost', 'a']);
  });

  it("poseFromMoveState and the tuner row skip the leg-up's climb-up", () => {
    const mv = (sub: number, ph: number) => ({ ...emptyMoveState(), m: 'boost' as const, sub, ph });
    const pose = (sub: number, ph: number) => poseFromMoveState(mv(sub, ph) as never, 0, emptyMovePose());
    expect(pose(PULL_SUB, 0).traverse).toBe('hang');
    expect(pose(PULL_SUB, 0.5).traverse).toBe('climbUp');
    expect(pose(SHUTTER_SUB, 0).traverse).toBe('none');
    expect(pose(0, 0.5).traverse).toBe('climbUp');
    expect(teamRowOfWire('boost', PULL_SUB)).toBe('');
    expect(teamRowOfWire('brace', SHUTTER_SUB)).toBe('');
    expect(teamRowOfWire('boost', 0)).toBe('team.boost.a');
  });
});
