// (mission-rules R4) Exactly two players for a campaign start (G2 "2 player coop campaign only, unable to be completed
// solo.", G48 "No bot anywhere"; BRIEF A9, A19): the host's session refuses a campaign start unless two are in the room,
// before the phase changes, so the room stays in the lobby and starts once the partner is in; a campaign room holds two
// whatever the mode's `capacity()` (coop4 takes Sector Ops to 4: `sectorCap` below plays that), while Sector Ops on
// other maps and Marlow Yard keep their capacity.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WeaponId } from '../src/weapons/weaponDefs';
import { CAMPAIGN_ROOM, NetSession, sectorStartOpts, type StartInfo } from '../src/net/session';
import type { Transport } from '../src/net/transport';
import { defaultLook } from '../src/cosmetics/avatarLook';
import { clearRejoin, loadRejoin, saveRejoin, type RejoinRecord } from '../src/core/rejoin';
import { CAMPAIGN_PICK_MISSION, CAMPAIGN_TWO_PLAYERS } from '../src/game/mission/campaign';
import type * as Protocol from '../src/net/protocol';
import { parseMessage } from '../src/net/protocol';
import { flags } from '../src/core/flags';
import { matchRevives } from '../src/net/coopHost';
import { ReviveClock } from '../src/game/reviveClock';
import type { CampaignSave } from '../src/save/campaignRecord';
import { campaignRating } from '../src/game/mission/campaignRating';
import type { MissionDef } from '../src/game/mission/missionDef';
import { MissionRunner } from '../src/game/mission/missionRunner';
import { applyMissionResume, applyMissionStart, boundMissionId, missionCarry, SectorMission, type SectorMissionHost } from '../src/game/mission/sectorMission';
import { SectorMode } from '../src/game/modes/sectorMode';
import { SectorRun, type SectorDef, type SectorPhase } from '../src/game/sectors';
import { sectorResumePoints, startSlotPoints } from '../src/game/spawnPlace';
import type { GameState } from '../src/game/gameState';
import { THREE_GREY_COATS, TWO_KEY_LEDGER, WHARF_MISSIONS } from '../src/world/maps/tallowWharfMissions';
import { WHARF_SECTORS } from '../src/world/maps/tallowWharfSectors';

/** Sector Ops' room capacity in this file: 2 (this branch) or 4 (coop4's `SECTOR_MAX`); other modes as they are. */
const cap = vi.hoisted(() => ({ sector: 2 }));
vi.mock('../src/net/protocol', async (importOriginal) => {
  const o = await importOriginal<typeof Protocol>();
  return { ...o, capacity: (m: Parameters<typeof o.capacity>[0]) => (m === 'sector' ? cap.sector : o.capacity(m)) };
});

function hub() {
  const peers = new Map<string, Transport & { deliver(m: unknown, from: string): void }>();
  const make = (id: string) => {
    const t = {
      selfId: id,
      onMessage: null as Transport['onMessage'],
      onPeerJoin: null as Transport['onPeerJoin'],
      onPeerLeave: null as Transport['onPeerLeave'],
      send(msg: unknown, to?: string) {
        const raw = JSON.parse(JSON.stringify(msg)) as unknown;
        for (const [pid, p] of peers) if (pid !== id && (!to || to === pid)) p.deliver(raw, id);
      },
      deliver(m: unknown, from: string) {
        t.onMessage?.(m, from);
      },
      peers: () => [...peers.keys()].filter((p) => p !== id),
      async leave() {
        peers.delete(id);
        for (const p of peers.values()) p.onPeerLeave?.(id);
      },
    };
    for (const p of peers.values()) p.onPeerJoin?.(id);
    peers.set(id, t);
    return t;
  };
  return { make };
}
const prof = (name: string) => ({ name, tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' }, look: defaultLook(), loadout: ['rifle', 'pistolSd'] as WeaponId[] });
const sessions: NetSession[] = [];
const sess = (...a: ConstructorParameters<typeof NetSession>): NetSession => {
  const s = new NetSession(...a);
  sessions.push(s);
  return s;
};
afterEach(async () => {
  for (const s of sessions.splice(0)) await s.leave();
  clearRejoin();
  cap.sector = 2;
});

/** A host room on `map` with `mission`; `joiners` clients join before the settings change to it (so a room can hold
 *  more than a campaign room takes: it is filled on the campus first). */
function room(map: string, mission: string, joiners: number) {
  const h = hub();
  const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
  host.setSettings('sector', 'campusOps', 'normal');
  const clients: NetSession[] = [];
  const starts: StartInfo[] = [];
  for (let i = 0; i < joiners; i++) {
    const c = sess(h.make(`C${i}`), 'client', 'ABCDE', prof(`Cli${i}`));
    c.events.on('start', (s) => starts.push(s));
    c.setReady(true);
    clients.push(c);
  }
  host.sectorMission = mission;
  host.setSettings('sector', map, 'normal');
  return { h, host, clients, starts };
}

describe('R4: a campaign mission starts only with exactly two players', () => {
  it('a host alone on Three Grey Coats is refused and stays in the lobby; the start goes once the partner is in', () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.sectorMission = 'threeGreyCoats';
    host.setSettings('sector', 'tallowWharf', 'normal');
    let hostStarts = 0;
    host.events.on('start', () => hostStarts++);
    expect(host.campaign).toBe(true);
    expect(host.campaignBlock).toBe(CAMPAIGN_TWO_PLAYERS);
    expect(host.startMatch()).toBeNull();
    expect(host.phase).toBe('lobby');
    expect(hostStarts).toBe(0);
    // the partner joins: the same room starts (A19: the blocked start left nothing behind)
    const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    let got: StartInfo | null = null;
    cli.events.on('start', (s) => (got = s));
    expect(cli.phase).toBe('lobby');
    expect(host.campaignBlock).toBeNull();
    const s = host.startMatch();
    expect(s?.sectorMission).toBe('threeGreyCoats');
    expect(host.phase).toBe('playing');
    expect(got!.sectorMission).toBe('threeGreyCoats');
    expect(cli.phase).toBe('playing');
  });

  for (const players of [3, 4]) {
    it(`${players} players (a room filled before the campaign was picked) are refused, the room stays in the lobby`, () => {
      cap.sector = 4;
      const r = room('tallowWharf', 'twoKeyLedger', players - 1);
      expect(r.host.players.size).toBe(players);
      expect(r.host.campaignBlock).toBe(CAMPAIGN_TWO_PLAYERS);
      expect(r.host.overCapacity).toBe(true);
      expect(r.host.startMatch()).toBeNull();
      expect(r.host.phase).toBe('lobby');
      expect(r.starts).toEqual([]);
      for (const c of r.clients) expect(c.phase).toBe('lobby');
    });
  }

  it('a campaign map with no campaign mission picked is refused, two players or not', () => {
    for (const mission of ['', 'campusMissionTest', 'nope']) {
      const r = room('tallowWharf', mission, 1);
      expect(r.host.campaignBlock).toBe(CAMPAIGN_PICK_MISSION);
      expect(r.host.startMatch()).toBeNull();
      expect(r.host.phase).toBe('lobby');
      expect(r.starts).toEqual([]);
    }
  });

  it('over capacity outside the campaign also leaves the room in the lobby (A19)', () => {
    cap.sector = 4;
    const r = room('campusOps', '', 2);
    // three in the room, then the host picks Marlow Yard (the course takes 2)
    r.host.setSettings('course', 'ctcourse', 'normal');
    expect(r.host.overCapacity).toBe(true);
    expect(r.host.campaignBlock).toBeNull();
    expect(r.host.startMatch()).toBeNull();
    expect(r.host.phase).toBe('lobby');
    expect(r.starts).toEqual([]);
  });
});

describe('R4: a campaign room holds two', () => {
  for (const sector of [2, 4]) {
    it(`a third join is refused on Tallow (Sector Ops capacity ${sector})`, () => {
      cap.sector = sector;
      const h = hub();
      const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
      host.sectorMission = 'threeGreyCoats';
      host.setSettings('sector', 'tallowWharf', 'normal');
      expect(host.cap).toBe(CAMPAIGN_ROOM);
      const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'));
      expect(cli.campaign).toBe(true); // the client's view: the map
      expect(cli.cap).toBe(CAMPAIGN_ROOM);
      // (the hub delivers at once: the host's "Room is full" bye reaches the third before any listener could)
      const third = sess(h.make('X'), 'client', 'ABCDE', prof('Third'));
      expect(third.hostId).toBeNull();
      expect([...host.players.keys()]).toEqual(['H', 'C']);
      expect(host.startMatch()).not.toBeNull();
    });
  }

  it('with coop4 capacity 4, a dropped partner\'s held slot is the only one a new connection can take (the room is full at 2)', () => {
    cap.sector = 4;
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.sectorMission = 'threeGreyCoats';
    host.setSettings('sector', 'tallowWharf', 'normal');
    const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    expect(host.startMatch()).not.toBeNull();
    void cli.leave();
    expect(host.players.get('C')?.away).toBe(true);
    // a tokenless hello (a tab closed with its token): the room is full, so it takes the only held slot
    sess(h.make('C2'), 'client', 'ABCDE', prof('Cli'));
    expect(host.players.size).toBe(2);
    expect(host.players.get('C')?.away).toBe(false);
  });
});

describe('R4: Sector Ops and Marlow Yard unchanged', () => {
  it('the campus test mission and plain Sector Ops start alone and take the mode\'s capacity (coop4: 4)', () => {
    for (const mission of ['campusMissionTest', '']) {
      cap.sector = 4;
      const h = hub();
      const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
      host.sectorMission = mission;
      host.setSettings('sector', 'campusOps', 'normal');
      expect(host.campaign).toBe(false);
      expect(host.campaignBlock).toBeNull();
      expect(host.cap).toBe(4);
      for (const id of ['C1', 'C2', 'C3']) sess(h.make(id), 'client', 'ABCDE', prof(id));
      expect(host.players.size).toBe(4);
      expect(host.overCapacity).toBe(false);
      expect(host.startMatch()?.sectorMission ?? '').toBe(mission);
      expect(host.phase).toBe('playing');
    }
    // a host alone on the campus starts as before
    const solo = sess(hub().make('S'), 'host', 'FGHJK', prof('Solo'));
    solo.sectorMission = 'campusMissionTest';
    solo.setSettings('sector', 'campusOps', 'normal');
    expect(solo.startMatch()).not.toBeNull();
  });

  it('Marlow Yard (course) stays 2 and starts alone; a mission id never makes a course room the campaign', () => {
    cap.sector = 4;
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.sectorMission = 'threeGreyCoats';
    host.setSettings('course', 'ctcourse', 'normal');
    expect(host.campaign).toBe(false);
    expect(host.campaignBlock).toBeNull();
    expect(host.cap).toBe(2);
    expect(host.startMatch()).not.toBeNull();
    expect(host.phase).toBe('playing');
  });
});

// (PR E fix) "Resume hosting" a campaign match: the host reopens the room alone (R4 refuses the lone start), the joiner
// that waited in its match (no Ready button) is back: the match starts on its own, once (`startWhenUnblocked`).
describe('PR E fix: a resumed campaign host starts once the partner is back, no ready needed', () => {
  const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

  /** A campaign match whose host dropped (its joiner waits in the match, `hostId` cleared), and the host's reopened
   *  room set up as `connect`'s resume branch does (fields set directly, no lobby broadcast). */
  async function resumed() {
    const h = hub();
    const h1 = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    h1.sectorMission = 'threeGreyCoats';
    h1.setSettings('sector', 'tallowWharf', 'normal');
    const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'), 'tokC');
    expect(h1.startMatch()).not.toBeNull();
    await h1.leave();
    expect(cli.hostId).toBeNull();
    expect(cli.phase).toBe('playing');
    const starts: StartInfo[] = [];
    cli.events.on('start', (s) => starts.push(s));
    const host = sess(h.make('H2'), 'host', 'ABCDE', prof('Host'));
    host.mode = 'sector';
    host.map = 'tallowWharf';
    host.sectorMission = 'threeGreyCoats';
    let hostStarts = 0;
    host.events.on('start', () => hostStarts++);
    // the resume branch: refused alone, then the auto start
    expect(host.startMatch()).toBeNull();
    expect(host.campaignBlock).toBe(CAMPAIGN_TWO_PLAYERS);
    host.startWhenUnblocked(() => host.campaignBlock);
    expect(host.phase).toBe('lobby');
    expect(host.autoStarting).toBe(true);
    // the host's side of the waiting joiner's connection (the test hub tells only the peers already in the room)
    const connect = (): void => host.transport.onPeerJoin?.('C');
    return { h, host, cli, starts, connect, hostStarts: () => hostStarts };
  }

  it('alone it stays in the lobby; the waiting joiner\'s hello starts the match for it with no Ready press', async () => {
    const r = await resumed();
    await tick();
    expect(r.host.phase).toBe('lobby');
    expect(r.hostStarts()).toBe(0);
    r.connect();
    expect(r.cli.hostId).toBe('H2');
    expect(r.host.players.get('C')?.ready).toBe(false);
    // the start goes on the next task (after the lobby handler that announced the partner)
    expect(r.host.phase).toBe('lobby');
    await tick();
    expect(r.host.phase).toBe('playing');
    expect(r.hostStarts()).toBe(1);
    expect(r.starts).toHaveLength(1);
    expect(r.starts[0]!.sectorMission).toBe('threeGreyCoats');
    expect(r.cli.phase).toBe('playing');
    expect(r.host.autoStarting).toBe(false);
  });

  it('fires once: back in the lobby with both in, the next match waits for the Ready press again', async () => {
    const r = await resumed();
    r.connect();
    await tick();
    expect(r.hostStarts()).toBe(1);
    r.host.backToLobby();
    r.host.broadcastLobby();
    await tick();
    expect(r.host.phase).toBe('lobby');
    expect(r.hostStarts()).toBe(1);
    expect(r.starts).toHaveLength(1);
    expect(r.host.allReady).toBe(false);
  });

  it('is gone after leave: a start queued before the leave never runs', async () => {
    const r = await resumed();
    r.connect();
    void r.host.leave();
    expect(r.host.autoStarting).toBe(false);
    await tick();
    expect(r.hostStarts()).toBe(0);
    expect(r.starts).toEqual([]);
    // and a host that leaves alone drops it too
    const q = await resumed();
    await q.host.leave();
    expect(q.host.autoStarting).toBe(false);
  });

  it('a partner that drops before the start keeps it pending; its rejoin from the menu starts the match', async () => {
    const r = await resumed();
    r.connect();
    await r.cli.leave();
    expect(r.host.players.has('C')).toBe(false);
    await tick();
    expect(r.host.phase).toBe('lobby');
    expect(r.host.autoStarting).toBe(true);
    const back = sess(r.h.make('C3'), 'client', 'ABCDE', prof('Cli'), 'tokC');
    let got: StartInfo | null = null;
    back.events.on('start', (s) => (got = s));
    expect(back.players.get(back.selfId)?.ready).toBe(false);
    await tick();
    expect(r.host.phase).toBe('playing');
    expect(r.hostStarts()).toBe(1);
    expect(got!.sectorMission).toBe('threeGreyCoats');
  });

  it('another mode or map drops it: a switch off the campaign never starts the host alone', async () => {
    const r = await resumed();
    r.host.setSettings('sector', 'tallowWharf', 'realistic');
    expect(r.host.autoStarting).toBe(true);
    r.host.setSettings('course', 'ctcourse', 'normal');
    expect(r.host.campaignBlock).toBeNull();
    expect(r.host.autoStarting).toBe(false);
    await tick();
    expect(r.host.phase).toBe('lobby');
    expect(r.hostStarts()).toBe(0);
  });
});

// ---- (campaign-mode CM3, PLAN 3.4) the mission in the session, resume at a section, rejoin ----

const flagSave = { campaign: flags.campaign, missions: flags.missions, mission: flags.mission };
function setFlags(campaign: boolean, missions = campaign): void {
  flags.campaign = campaign;
  flags.missions = missions;
  flags.mission = null;
}
afterEach(() => {
  flags.campaign = flagSave.campaign;
  flags.missions = flagSave.missions;
  flags.mission = flagSave.mission;
  vi.unstubAllGlobals();
});

const W = (id: string): number => WHARF_SECTORS.findIndex((s) => s.id === id);
const stepIdx = (def: MissionDef, id: string): number => def.steps.findIndex((s) => s.id === id);
/** The fact bits (`MissionWire.f`) of `gives` flags, in the runner's fact order. */
function factBits(def: MissionDef, gives: string[]): number {
  const facts = new MissionRunner(def, 2).facts;
  let f = 0;
  for (const g of gives) f |= 1 << facts.indexOf(g);
  return f;
}
/** Done bits for team 'all' steps (both Tallow missions are all-team). */
const doneBits = (def: MissionDef, ids: string[]): number => ids.reduce((b, id) => b | (1 << stepIdx(def, id)), 0);

/** Three Grey Coats saved at W3's begin after W1 and W2 (Teale questioned), a kill and an alarm on the way. */
function tgcSave(over: Partial<CampaignSave> = {}): CampaignSave {
  return {
    v: 1,
    key: 'threeGreyCoats',
    map: 'tallowWharf',
    mission: 'threeGreyCoats',
    difficulty: 'normal',
    section: W('W3'),
    st: [0, 0, doneBits(THREE_GREY_COATS, ['tgc-1', 'tgc-2', 'tgc-3'])],
    f: factBits(THREE_GREY_COATS, ['tgc-courier', 'tgc-chest']),
    revivesUsed: 1,
    breaks: 1,
    alarm: 2,
    tally: { kills: 1, knockouts: 2, alarms: 1, spotted: 3, bodies: 1, optional: 0 },
    time: 300,
    at: 1,
    ...over,
  };
}

/** A small fake SectorMode for the adapter (the real Tallow sections; no guards spawned). */
class Mode implements SectorMissionHost {
  idx = 0;
  ph: SectorPhase = 'objective';
  readonly codes = new Set<string>();
  readonly log: string[] = [];
  m!: SectorMission;
  constructor(readonly defs: readonly SectorDef[]) {}
  enter(i: number): void {
    this.idx = i;
    this.ph = 'objective';
    this.m.begin(i);
  }
  index = (): number => this.idx;
  phase = (): SectorPhase => this.ph;
  cycling = (): boolean => false;
  players = (): number => 2;
  slotOf = (id: string): number => (id === 'local' || id === '' ? 0 : 1);
  detections = (): number => 0;
  guards = (): readonly [] => [];
  slotGuard = (): null => null;
  hasCode = (f: string): boolean => this.codes.has(f);
  keypadOpen = (): boolean => false;
  gateOpen = (): boolean => false;
  boltOpen = (): boolean => false;
  regrant = (f: string): void => void this.codes.add(f);
  openExit(): void {
    if (this.m.gate()) return;
    this.log.push('exit');
    this.ph = this.idx === this.defs.length - 1 ? 'extract' : 'connector';
  }
  restart = (): void => undefined;
  finish(): void {
    this.log.push('finish');
    this.m.extracted();
  }
  say = (): void => undefined;
  banner = (): void => undefined;
  bolt = (): null => null;
  emit = (): void => undefined;
}
function mission(def: MissionDef): { mode: Mode; run: SectorRun; m: SectorMission } {
  const mode = new Mode(WHARF_SECTORS);
  mode.m = new SectorMission(def, mode);
  return { mode, run: new SectorRun(WHARF_SECTORS), m: mode.m };
}

/** Every message `s` sends from now on. */
function tap(s: NetSession): Record<string, unknown>[] {
  const sent: Record<string, unknown>[] = [];
  const send = s.transport.send.bind(s.transport);
  s.transport.send = (msg, to) => {
    sent.push(msg as Record<string, unknown>);
    send(msg, to);
  };
  return sent;
}

describe('CM3: the lobby pick sets the session mission; the lobby carries it as sm', () => {
  it("flags on: the host pick sets sectorMission, the partner's lobby shows it, its match mission still comes from start.sm", () => {
    setFlags(true);
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    host.setSettings('sector', 'tallowWharf', 'normal', '', 'clear', 'threeGreyCoats');
    expect(host.sectorMission).toBe('threeGreyCoats');
    expect(host.campaignPick).toBe('threeGreyCoats');
    expect(cli.campaignPick).toBe('threeGreyCoats');
    expect(cli.sectorMission).toBe('');
    host.setSettings('sector', 'tallowWharf', 'normal', '', 'clear', 'twoKeyLedger');
    expect(cli.campaignPick).toBe('twoKeyLedger');
    expect(host.startMatch()?.sectorMission).toBe('twoKeyLedger');
    expect(cli.sectorMission).toBe('twoKeyLedger');
    // junk is no mission; the prologue (course) shows none
    host.backToLobby();
    host.setSettings('sector', 'tallowWharf', 'normal', '', 'clear', '<b>');
    expect(host.sectorMission).toBe('');
    host.setSettings('course', 'ctcourse', 'normal', '', 'clear', 'threeGreyCoats');
    expect(host.campaignPick).toBe('');
    expect(cli.campaignPick).toBe('');
  });

  it('a new pick cancels a pending auto start; the same pick keeps it', () => {
    setFlags(true);
    const host = sess(hub().make('H'), 'host', 'ABCDE', prof('Host'));
    host.setSettings('sector', 'tallowWharf', 'normal', '', 'clear', 'threeGreyCoats');
    host.startWhenUnblocked(() => host.campaignBlock);
    host.setSettings('sector', 'tallowWharf', 'normal', '', 'clear', 'threeGreyCoats');
    expect(host.autoStarting).toBe(true);
    host.setSettings('sector', 'tallowWharf', 'normal', '', 'clear', 'twoKeyLedger');
    expect(host.autoStarting).toBe(false);
  });

  it('lobby sm parse: a mission id passes; junk is dropped; absent is the lobby as before', () => {
    const lobby = { t: 'lobby', players: [], mode: 'sector', map: 'tallowWharf', difficulty: 'normal', phase: 'lobby', mission: '', weather: 'clear' };
    expect(parseMessage({ ...lobby, sm: 'threeGreyCoats' })).toMatchObject({ t: 'lobby', sm: 'threeGreyCoats' });
    for (const bad of ['', 'a b', 'x'.repeat(65), 7, null, { id: 'x' }]) expect('sm' in (parseMessage({ ...lobby, sm: bad }) as object)).toBe(false);
    expect(parseMessage(lobby)).toEqual(lobby);
  });

  it('flags off: the pick is ignored, no sm on the lobby, no Continue; a sector start at bay 1 (campaign alone: plain Sector Ops at its section)', () => {
    for (const [c, m] of [
      [false, true],
      [true, false],
      [false, false],
    ] as const) {
      setFlags(c, m);
      const h = hub();
      const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
      const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'));
      const sent = tap(host);
      host.setSettings('sector', 'campusOps', 'normal', '', 'clear', 'threeGreyCoats');
      expect(host.sectorMission).toBe('');
      expect(host.campaignPick).toBe('');
      expect(cli.campaignPick).toBe('');
      expect(sent.some((x) => x.t === 'lobby' && 'sm' in x)).toBe(false);
      host.sectorBay = 3;
      host.resumeSector(3, 'threeGreyCoats', tgcSave());
      host.continueCampaign(tgcSave());
      expect([host.map, host.sectorMission]).toEqual(['campusOps', '']);
      const s = host.startMatch()!;
      expect(s.bay).toBe(c ? 3 : 1);
      expect('campaignResume' in s).toBe(false);
      expect(sectorStartOpts(s)).toEqual(c ? { sectorStart: 3 } : {});
    }
  });
});

describe('CM3: a sector campaign start carries the section in bay', () => {
  it("Continue: the start goes at the save's section (bay = section + 1) on both peers; the save stays on the host, used once", () => {
    setFlags(true);
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const save = tgcSave();
    host.continueCampaign(save);
    expect([host.mode, host.map, host.difficulty, host.sectorMission]).toEqual(['sector', 'tallowWharf', 'normal', 'threeGreyCoats']);
    const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    let got: StartInfo | null = null;
    cli.events.on('start', (s) => (got = s));
    const sent = tap(host);
    const s = host.startMatch()!;
    expect(s.bay).toBe(W('W3') + 1);
    expect(s.campaignResume).toBe(save);
    expect(got!).toMatchObject({ mode: 'sector', bay: W('W3') + 1, sectorMission: 'threeGreyCoats' });
    expect('campaignResume' in got!).toBe(false);
    const wireStart = sent.find((x) => x.t === 'start')!;
    expect(Object.keys(wireStart).sort()).toEqual(['bay', 'difficulty', 'map', 'mission', 'mode', 'seed', 'sm', 't', 'time', 'weather']);
    expect(sectorStartOpts(s)).toEqual({ sectorStart: 3, sectorMission: 'threeGreyCoats', campaignResume: save });
    expect(sectorStartOpts(got!)).toEqual({ sectorStart: 3, sectorMission: 'threeGreyCoats' });
    // used once: the room's next start is the mission from its own start
    host.backToLobby();
    expect(host.startMatch()!.bay).toBe(1);
  });

  it('a Continue is dropped by another mission or difficulty; a mission never takes its section from sectorBay', () => {
    setFlags(true);
    const host = sess(hub().make('H'), 'host', 'ABCDE', prof('Host'));
    host.continueCampaign(tgcSave());
    host.setSettings('sector', 'tallowWharf', 'realistic', '', 'clear', 'threeGreyCoats');
    expect(host.campaignResume).toBeNull();
    expect(host.sectorStartBay()).toBe(1);
    host.continueCampaign(tgcSave());
    host.setSettings('sector', 'tallowWharf', 'normal', '', 'rain', 'threeGreyCoats');
    expect(host.campaignResume).not.toBeNull();
    expect(host.sectorStartBay()).toBe(3);
    host.setSettings('sector', 'tallowWharf', 'normal', '', 'rain', 'twoKeyLedger');
    expect(host.campaignResume).toBeNull();
    // its earlier steps would be missing (PLAN risk 1)
    host.sectorBay = 3;
    expect(host.sectorStartBay()).toBe(1);
  });

  it("(A11) Resume hosting: plain Sector Ops at the record's section; a mission at its save's section, else its own start", () => {
    setFlags(true);
    const plain = sess(hub().make('H'), 'host', 'ABCDE', prof('Host'));
    plain.mode = 'sector';
    plain.map = 'campusOps';
    plain.resumeSector(3, undefined, null);
    expect(plain.sectorStartBay()).toBe(3);
    const m = sess(hub().make('H2'), 'host', 'FGHJK', prof('Host'));
    m.mode = 'sector';
    m.map = 'tallowWharf';
    m.resumeSector(3, 'threeGreyCoats', tgcSave());
    expect(m.sectorMission).toBe('threeGreyCoats');
    expect(m.sectorStartBay()).toBe(3);
    m.resumeSector(4, 'threeGreyCoats', null);
    expect(m.sectorStartBay()).toBe(1);
    m.resumeSector(4, 'threeGreyCoats', tgcSave({ mission: 'twoKeyLedger', key: 'twoKeyLedger' }));
    expect(m.sectorStartBay()).toBe(1);
  });
});

describe('CM3: resume at a section', () => {
  it('a Continue after a kill and an alarm: W3 at the saved alarm stage, earlier steps done, breaks back; it finishes with the carried tally, not perfect', () => {
    const { mode, run, m } = mission(THREE_GREY_COATS);
    const save = tgcSave();
    expect(applyMissionResume(run, m, save)).toBe(true);
    expect(run.index).toBe(W('W3'));
    const w3 = WHARF_SECTORS[W('W3')]!.start;
    expect(run.checkpoint).toMatchObject({ x: w3.x, z: w3.z });
    for (const id of ['tgc-1', 'tgc-2', 'tgc-3']) expect(m.runner.isDone(stepIdx(THREE_GREY_COATS, id))).toBe(true);
    expect(m.runner.isDone(stepIdx(THREE_GREY_COATS, 'tgc-opt'))).toBe(false);
    expect(m.runner.hasFlag('tgc-chest')).toBe(true);
    expect(m.tracker.breaks).toBe(1);
    expect([run.alarm, run.alarmAtStart, run.alarmsRaised]).toEqual([2, 2, 1]);
    const carried = missionCarry(save);
    expect(carried).toEqual({ kills: 1, knockouts: 2, spotted: 3, bodies: 1, time: 300 });
    // the section's begin snapshots the restored state; W4's objective, then the extraction, finish the mission
    mode.enter(W('W3'));
    mode.enter(W('W4'));
    mode.openExit();
    expect(mode.log).toContain('exit');
    expect(mode.ph).toBe('extract');
    mode.finish();
    expect(m.finished).toBe(true);
    // no kill and no alarm after the Continue: the rating still counts the run's (G146)
    const r = campaignRating({ kills: carried.kills + 0, alarms: run.alarmsRaised, optional: 0 });
    expect(r.perfect).toBe(false);
    expect(r.pct).toBeLessThanOrEqual(99);
  });

  it("(PLAN risk 1) without the save's steps the same start never opens W4's exit", () => {
    const { mode, run } = mission(THREE_GREY_COATS);
    applyMissionStart(run, W('W3'));
    mode.enter(W('W3'));
    mode.enter(W('W4'));
    mode.openExit();
    expect(mode.log).not.toContain('exit');
  });

  it("Two-Key Ledger resumed at W3 holds its W2 code again (heldCodes); its W2 start is unchanged with no save", () => {
    const { run, m } = mission(TWO_KEY_LEDGER);
    const save = tgcSave({ key: 'twoKeyLedger', mission: 'twoKeyLedger', st: [0, 0, doneBits(TWO_KEY_LEDGER, ['tkl-1'])], f: factBits(TWO_KEY_LEDGER, ['tkl-gate-code']) });
    expect(applyMissionResume(run, m, save)).toBe(true);
    expect(m.heldCodes([])).toEqual(['tkl-gate-code']);
    const fresh = mission(TWO_KEY_LEDGER);
    expect(fresh.m.heldCodes([])).toEqual([]);
    // a save of another mission, before the mission's start or off the run: not applied, the run untouched
    expect(applyMissionResume(fresh.run, fresh.m, tgcSave())).toBe(false);
    expect(applyMissionResume(fresh.run, fresh.m, { ...save, section: W('W1') })).toBe(false);
    expect(applyMissionResume(fresh.run, fresh.m, { ...save, section: WHARF_SECTORS.length })).toBe(false);
    expect([fresh.run.index, fresh.run.alarm, fresh.run.alarmsRaised, fresh.m.tracker.breaks]).toEqual([0, 0, 0, 0]);
    applyMissionStart(fresh.run, fresh.m.startIndex);
    expect(fresh.run.index).toBe(W('W2'));
    // a run that has moved takes no resume
    expect(applyMissionResume(fresh.run, fresh.m, save)).toBe(false);
  });

  it('revives used come back for that campaign mission only (G126: 2 per mission)', () => {
    const used = (missionId: string, resume: Parameters<typeof matchRevives>[5]): number => {
      const c = new ReviveClock();
      matchRevives(c, 'sector', 'normal', WHARF_MISSIONS, missionId, resume);
      return c.used;
    };
    expect(used('threeGreyCoats', tgcSave())).toBe(1);
    expect(used('threeGreyCoats', tgcSave({ revivesUsed: 2 }))).toBe(2);
    expect(used('twoKeyLedger', tgcSave())).toBe(0);
    expect(used('threeGreyCoats', null)).toBe(0);
    expect(used('', tgcSave())).toBe(0);
  });

  it('boundMissionId: the start\'s mission wins ("" none); absent: ?mission=; flags.missions off: none', () => {
    setFlags(true);
    flags.mission = 'twoKeyLedger';
    expect(boundMissionId({ sectorMission: 'threeGreyCoats' })).toBe('threeGreyCoats');
    expect(boundMissionId({ sectorMission: '' })).toBeNull();
    expect(boundMissionId({})).toBe('twoKeyLedger');
    flags.missions = false;
    expect(boundMissionId({ sectorMission: 'threeGreyCoats' })).toBeNull();
  });
});

describe('CM3: spawns at the section (spawnPlace)', () => {
  const page = (sectorStart: number | undefined) =>
    ({
      opts: { mode: 'sector', sectorStart },
      world: { map: { sectors: WHARF_SECTORS, missions: WHARF_MISSIONS }, layout: { playerSpawns: [] } },
    }) as unknown as GameState;
  const xs = (pts: readonly { x: number }[] | null): number[] | null => pts?.map((p) => p.x) ?? null;
  const start = (id: string): number[] => {
    const s = WHARF_SECTORS[W(id)]!;
    return s.start2 ? [s.start.x, s.start2.x] : [s.start.x];
  };

  it("a mission at a later section: that section's start; plain Sector Ops: the connector checkpoint before it", () => {
    expect(xs(sectorResumePoints(WHARF_SECTORS, WHARF_MISSIONS, 'threeGreyCoats', 3))).toEqual(start('W3'));
    const c = WHARF_SECTORS[W('W2')]!.connector!;
    expect(xs(sectorResumePoints(WHARF_SECTORS, WHARF_MISSIONS, null, 3))).toEqual(c.checkpoint2 ? [c.checkpoint.x, c.checkpoint2.x] : [c.checkpoint.x]);
    expect(sectorResumePoints(WHARF_SECTORS, WHARF_MISSIONS, 'threeGreyCoats', 1)).toBeNull();
    expect(sectorResumePoints(WHARF_SECTORS, WHARF_MISSIONS, 'threeGreyCoats', 9)).toBeNull();
    expect(sectorResumePoints([{ id: 'A' }, { id: 'B' }] as unknown as SectorDef[], undefined, null, 2)).toBeNull();
  });

  it("startSlotPoints follows the start's section with the flag on (host and client alike); off: the mission's start", () => {
    setFlags(true);
    expect(xs(startSlotPoints(page(3), undefined, 'threeGreyCoats'))).toEqual(start('W3'));
    expect(xs(startSlotPoints(page(1), undefined, 'twoKeyLedger'))).toEqual(start('W2'));
    expect(xs(startSlotPoints(page(undefined), undefined, 'threeGreyCoats'))).toEqual(start('W1'));
    setFlags(false, true);
    expect(xs(startSlotPoints(page(3), undefined, 'threeGreyCoats'))).toEqual(start('W1'));
  });
});

describe('CM3: rejoin (A11)', () => {
  it('SectorMode.resumeBay: the current section with flags.campaign; off: 1 (plain Sector Ops unchanged)', () => {
    const resumeBay = (SectorMode.prototype as unknown as { resumeBay(this: unknown): number }).resumeBay;
    const self = { run: { index: 2 } };
    setFlags(true);
    expect(resumeBay.call(self)).toBe(3);
    setFlags(false);
    expect(resumeBay.call(self)).toBe(1);
  });

  it('RejoinRecord keeps sm through tab storage; junk sm is dropped; absent as before', () => {
    const m = new Map<string, string>();
    vi.stubGlobal('sessionStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) });
    const rec: RejoinRecord = { code: 'ABCDE', role: 'host', at: Date.now(), mode: 'sector', map: 'tallowWharf', difficulty: 'normal', mission: '', weather: 'clear', bay: 3, sm: 'threeGreyCoats' };
    saveRejoin(rec);
    expect(loadRejoin()).toEqual(rec);
    saveRejoin({ ...rec, sm: 'a b<' });
    expect('sm' in loadRejoin()!).toBe(false);
    const { sm: _sm, ...old } = rec;
    saveRejoin(old);
    expect(loadRejoin()).toEqual(old);
  });
});
