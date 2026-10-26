// (mission-framework NET) The mission on the co-op wire: `ms` rides the `sector` message (parse through `sectorExtra`), the
// client applies it to its own runner (never evaluating), shows the rule line only to a late joiner, the client's
// interrogation reaches the mission adapter with the guard's id and the client's id, and a client's frag / mine /
// sticky cam use reaches the host's mode (`gused`).
import { describe, expect, it, vi } from 'vitest';
import { parseMessage, USE_ONLY_GADGETS, type Msg } from '../src/net/protocol';
import { MissionMirror } from '../src/net/missionMirror';
import { CoopClient } from '../src/net/coopClient';
import { CoopHost } from '../src/net/coopHost';
import { MissionRunner } from '../src/game/mission/missionRunner';
import { RuleTracker } from '../src/game/mission/ruleTracker';
import { packMission, type MissionWire } from '../src/game/mission/missionWire';
import type { MissionDef } from '../src/game/mission/missionDef';
import { revealIntel } from '../src/game/intelReveal';
import { INTEL } from '../src/game/intel';

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

/** The host's runner and tracker: roof and board done, the code fact, one rule broken. */
function hostWire(): MissionWire {
  const d = op();
  const r = new MissionRunner(d, 2);
  const t = new RuleTracker(d, 2, r);
  r.snapshot('S1', 0);
  r.setFlag('roof');
  r.setFlag('code');
  r.update(1);
  t.onKill(1, false);
  t.update(2);
  return packMission(r, t);
}

/** A `sector` message as a client receives it (through JSON and the parser). */
function received(extra: Record<string, unknown>): Extract<Msg, { t: 'sector' }> {
  const m = parseMessage(JSON.parse(JSON.stringify({ t: 'sector', ls: 0, ...extra })));
  if (!m || m.t !== 'sector') throw new Error('not a sector message');
  return m;
}

describe('mission NET: ms on the sector message', () => {
  it('round-trips through sectorExtra; a malformed ms is dropped, the rest kept', () => {
    const w = hostWire();
    const m = received({ ms: w });
    expect(m.ms).toEqual(w);
    expect(m.ls).toBe(0);
    const bad = received({ ms: { id: '', st: [1], f: 0, rb: 0, rl: '', rk: [] } });
    expect(bad.ms).toBeUndefined();
    expect(bad.ls).toBe(0);
    expect(received({}).ms).toBeUndefined();
  });

  it('the client applies it to a runner built from the map missions by id (no evaluation)', () => {
    const mm = new MissionMirror();
    const w = received({ ms: hostWire() }).ms!;
    mm.take([op()], w);
    const r = mm.runner!;
    expect(r.def.id).toBe('testOp');
    expect([r.isDone(0), r.isDone(1), r.isDone(2)]).toEqual([true, true, false]);
    expect(r.hasFlag('code')).toBe(true);
    expect(mm.kept).toEqual(w.rk);
    // a mission this map does not have: no runner
    const other = new MissionMirror();
    expect(other.take([op()], { ...w, id: 'nope' })).toBeNull();
    expect(other.runner).toBeNull();
    expect(new MissionMirror().take(undefined, w)).toBeNull();
  });

  it('rl is shown only to a late joiner (its first ms has breaks); a live client had the radio line', () => {
    const w = hostWire();
    expect(w.rb).toBe(1);
    // late joiner: the first ms already counts a break
    const late = new MissionMirror();
    expect(late.take([op()], w)).toBe(w.rl);
    expect(late.take([op()], w)).toBeNull();
    // a further break later: the host's radioLine (feed event) said it; no second line here
    expect(late.take([op()], { ...w, rb: 2, rl: 'Ghost broken.' })).toBeNull();
    expect(late.line).toBe('Ghost broken.');
    // a client there from the start: rb 0 first, then the break: never shown by the mirror
    const live = new MissionMirror();
    expect(live.take([op()], { ...w, rb: 0, rl: '' })).toBeNull();
    expect(live.take([op()], w)).toBeNull();
    expect(live.line).toBe(w.rl);
  });

  it('CoopClient.onSector applies ms and feeds the late line once', () => {
    const c = Object.create(CoopClient.prototype) as CoopClient;
    const feed: string[] = [];
    Object.assign(c, {
      g: { world: { map: { missions: [op()] } }, hud: { feedItem: (t: string) => feed.push(t) } },
      mission: new MissionMirror(),
      sawSector: false,
      sec: null,
    });
    const on = (m: Extract<Msg, { t: 'sector' }>): void => (c as unknown as { onSector(m: unknown): void }).onSector(m);
    const w = hostWire();
    on(received({ ms: w }));
    on(received({ ms: w }));
    expect(feed).toEqual([w.rl]);
    expect(c.mission.runner?.isDone(0)).toBe(true);
  });

  it("(wharf e2e fix) the mirror enters the host's live section, so its steps open and the objective list has rows", () => {
    const start = { id: 'testOp', st: [0, 0, 0], f: 0, rb: 0, rl: '', rk: [0, 0, 0] };
    // no section: the runner stays at -1 and nothing opens (the old client: an empty objective list)
    const none = new MissionMirror();
    none.take([op()], start);
    expect(none.runner!.section).toBe(-1);
    expect(none.runner!.isOpen(0)).toBe(false);
    // the live section S1: roof and board open, meet waits for both
    const mm = new MissionMirror();
    mm.take([op()], start, 'S1');
    const r = mm.runner!;
    expect(r.section).toBe(0);
    expect([r.isOpen(0), r.isOpen(1), r.isOpen(2), r.isOpen(3)]).toEqual([true, true, false, false]);
    // the host's done bits: meet opens; then the host moves on to S2
    mm.take([op()], hostWire(), 'S1');
    expect(r.isOpen(2)).toBe(true);
    mm.take([op()], { ...hostWire(), st: [1, 2, 4] }, 'S2');
    expect(r.section).toBe(1);
    expect(r.isOpen(3)).toBe(true);
  });

  it('(wharf e2e fix) CoopClient.onSector passes the map sector of ls to the mirror', () => {
    const c = Object.create(CoopClient.prototype) as CoopClient;
    Object.assign(c, {
      g: { world: { map: { missions: [op()], sectors: [{ id: 'S1' }, { id: 'S2' }] } }, hud: { feedItem: () => {} } },
      mission: new MissionMirror(),
      sawSector: false,
      sec: null,
    });
    const on = (m: Extract<Msg, { t: 'sector' }>): void => (c as unknown as { onSector(m: unknown): void }).onSector(m);
    on(received({ ms: { ...hostWire(), rb: 0, rl: '' } }));
    expect(c.mission.runner?.section).toBe(0);
    expect(c.mission.runner?.isOpen(2)).toBe(true);
    on(received({ ls: 1, ms: { ...hostWire(), rb: 0, rl: '', st: [1, 2, 4] } }));
    expect(c.mission.runner?.section).toBe(1);
  });
});

describe('mission NET: a client interrogation reaches the adapter with the guard id and the client id', () => {
  it('revealIntel emits eid and by', () => {
    const got: unknown[] = [];
    const g = { security: null, enemyMgr: null, hud: { feedItem: () => {} }, mode: null, events: { emit: (_t: string, p: unknown) => got.push(p) } };
    revealIntel(g as never, { x: 0, y: 0, z: 0 }, { lines: ['The guard talks.'] }, 'e7', 'c1');
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ eid: 'e7', by: 'c1' });
  });

  it("the host's client-interrogation path passes the guard's id and the holder's id", () => {
    // (NET2) driven through the host: client c1 reads guard e7 (its MoveState sub 2 up to the done phase), then lets go
    const h = Object.create(CoopHost.prototype) as CoopHost;
    const got: Record<string, unknown>[] = [];
    const g = { security: null, enemyMgr: null, hud: { feedItem: () => {} }, mode: null, events: { emit: (t: string, p: Record<string, unknown>) => got.push({ t, ...p }) } };
    Object.assign(h, { g, interPh: new Map(), bluffs: new Map(), time: 5 });
    const e = { id: 'e7', pos: { x: 0, y: 0, z: 0 }, info: { lines: ['The guard talks.'] } as { lines: string[] } | null };
    const read = (sub: number, ph: number): void => (h as unknown as { clientRead(e: unknown, by: string, sub: number, ph: number): void }).clientRead(e, 'c1', sub, ph);
    read(2, 0.2);
    read(2, INTEL.donePh);
    expect(got).toEqual([]);
    read(0, 0);
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ t: 'intel', eid: 'e7', by: 'c1' });
    // spent: a second read gives nothing
    read(2, INTEL.donePh);
    read(0, 0);
    expect(got).toHaveLength(1);
    expect(e.info).toBeNull();
  });
});

describe('mission NET: every client gadget use reaches the host mode', () => {
  it('gused parses for frag / mine / sticky cam only', () => {
    expect(USE_ONLY_GADGETS).toEqual(['frag', 'mine', 'stickyCam']);
    for (const kind of USE_ONLY_GADGETS) expect(parseMessage({ t: 'gused', kind })).toEqual({ t: 'gused', kind });
    expect(parseMessage({ t: 'gused', kind: 'gas' })).toBeNull();
    expect(parseMessage({ t: 'gused', kind: 'x' })).toBeNull();
  });

  it('the host calls onRemoteGadget for a gused (4 a second at most per kind, alive only)', () => {
    const h = Object.create(CoopHost.prototype) as CoopHost;
    const onRemoteGadget = vi.fn();
    const r = { id: 'c1', alive: true, held: false, feet: { x: 0, y: 0, z: 0 } };
    Object.assign(h, { g: { mode: { onRemoteGadget } }, gusedAt: new Map(), time: 10, remotes: new Map([['c1', r]]) });
    const recv = (msg: unknown): void => (h as unknown as { receive(m: unknown, from: string): void }).receive(msg, 'c1');
    recv(parseMessage({ t: 'gused', kind: 'mine' }));
    recv(parseMessage({ t: 'gused', kind: 'mine' }));
    // (NET2) a different gadget inside the window still counts
    recv(parseMessage({ t: 'gused', kind: 'frag' }));
    expect(onRemoteGadget.mock.calls).toEqual([['c1', 'mine'], ['c1', 'frag']]);
    (h as unknown as { time: number }).time = 10.2;
    recv(parseMessage({ t: 'gused', kind: 'frag' }));
    recv(parseMessage({ t: 'gused', kind: 'stickyCam' }));
    expect(onRemoteGadget.mock.calls).toEqual([['c1', 'mine'], ['c1', 'frag'], ['c1', 'stickyCam']]);
    (h as unknown as { time: number }).time = 10.3;
    recv(parseMessage({ t: 'gused', kind: 'mine' }));
    expect(onRemoteGadget).toHaveBeenCalledTimes(4);
    r.alive = false;
    (h as unknown as { time: number }).time = 11;
    recv(parseMessage({ t: 'gused', kind: 'frag' }));
    expect(onRemoteGadget).toHaveBeenCalledTimes(4);
  });
});
