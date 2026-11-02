// (mission-framework NET3) The co-op client learns the Sector Ops mission from the host: `start` carries it as `sm`
// (absent / '' = none), the client's session keeps the host's (never its own `?mission=`), its start placement picks the
// host mission's start section, and the host puts a remote whose first state is outside the current section at the
// checkpoint (belt and braces). No mission: the start message and the placement as before.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { WeaponId } from '../src/weapons/weaponDefs';
import { NetSession, startMsg, type StartInfo } from '../src/net/session';
import type { Transport } from '../src/net/transport';
import { parseMessage, PROTOCOL_VERSION, sectorMissionId } from '../src/net/protocol';
import { clearRejoin } from '../src/core/rejoin';
import { flags } from '../src/core/flags';
import { CoopClient } from '../src/net/coopClient';
import { CoopHost } from '../src/net/coopHost';
import { JoinWatch } from '../src/net/joinWatch';
import { offSection, startSlotPoints } from '../src/game/spawnPlace';
import type { GameState } from '../src/game/gameState';
import type { SectorDef } from '../src/game/sectors';
import type { MissionDef } from '../src/game/mission/missionDef';
import type { SlotPoint } from '../src/game/spawnSlots';

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
const prof = (name: string) => ({ name, loadout: ['rifle', 'pistolSd'] as WeaponId[] });
const sessions: NetSession[] = [];
const sess = (...a: ConstructorParameters<typeof NetSession>): NetSession => {
  const s = new NetSession(...a);
  sessions.push(s);
  return s;
};
afterEach(async () => {
  for (const s of sessions.splice(0)) await s.leave();
  clearRejoin();
});

const base: StartInfo = { mode: 'sector', map: 'tallowWharf', seed: 7, difficulty: 'normal', mission: '', weather: 'clear', bay: 1 };
const wire = (m: unknown): unknown => parseMessage(JSON.parse(JSON.stringify(m)));

describe('NET3: the sector mission on the start message', () => {
  it('round-trips `sm`; absent or empty is no mission and the message is as before', () => {
    const withSm = wire(startMsg({ ...base, sectorMission: 'twoKeyLedger' }));
    expect(withSm).toMatchObject({ t: 'start', mode: 'sector', sm: 'twoKeyLedger', mission: '' });
    const none = wire(startMsg(base)) as Record<string, unknown>;
    expect('sm' in none).toBe(false);
    expect(none).toEqual({ t: 'start', mode: 'sector', map: 'tallowWharf', seed: 7, difficulty: 'normal', time: 0, mission: '', weather: 'clear', bay: 1 });
    expect('sm' in (startMsg({ ...base, sectorMission: '' }) as object)).toBe(false);
    expect('sm' in (wire({ ...startMsg(base), sm: '' }) as object)).toBe(false);
  });

  it('clamps `sm`: a mission id (camelCase, dashes, digits) passes; anything else is none', () => {
    expect(sectorMissionId('threeGreyCoats')).toBe('threeGreyCoats');
    expect(sectorMissionId('plain-test_2')).toBe('plain-test_2');
    for (const bad of ['a b', 'x'.repeat(65), 12, null, { id: 'x' }, '<script>']) {
      expect(sectorMissionId(bad)).toBe('');
      expect('sm' in (wire({ ...startMsg(base), sm: bad }) as object)).toBe(false);
    }
  });

  it("a host's sector start carries its mission; the client's session takes the host's, never its own", () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    // the client's own URL mission (another one) never counts
    cli.sectorMission = 'threeGreyCoats';
    let got: StartInfo | null = null;
    cli.events.on('start', (s) => (got = s));
    host.sectorMission = 'twoKeyLedger';
    host.setSettings('sector', 'tallowWharf', 'normal');
    expect(host.startMatch()?.sectorMission).toBe('twoKeyLedger');
    expect(got!.sectorMission).toBe('twoKeyLedger');
    expect(cli.sectorMission).toBe('twoKeyLedger');
  });

  // (mission-rules R4) a campaign match never starts alone, so the late join runs on a plain (non-campaign) Sector Ops mission id on the proving map
  it('a late joiner gets the running match with the same mission', () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.sectorMission = 'plainTest';
    host.setSettings('sector', 'kestrel', 'normal');
    expect(host.startMatch()?.sectorMission).toBe('plainTest');
    const late = sess(h.make('L'), 'client', 'ABCDE', prof('Late'));
    late.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Late', tag: {}, look: {} }, 'H');
    expect(late.sectorMission).toBe('plainTest');
  });

  // (mission-rules R4) Tallow with no mission is refused (a campaign map needs a campaign mission): a map with no campaign missions instead
  it('a host with no mission, or not in Sector Ops: no `sm`, and the client follows (none)', () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    cli.sectorMission = 'threeGreyCoats';
    let got: StartInfo | null = null;
    cli.events.on('start', (s) => (got = s));
    host.sectorMission = '';
    host.setSettings('sector', 'kestrel', 'normal');
    expect(host.startMatch()).not.toBeNull();
    expect('sectorMission' in got!).toBe(false);
    expect(cli.sectorMission).toBe('');
    host.backToLobby();
    // a course match never carries one, whatever the host's URL says
    host.sectorMission = 'twoKeyLedger';
    host.setSettings('course', 'ctcourse', 'normal');
    expect('sectorMission' in host.startMatch()!).toBe(false);
    expect('sectorMission' in got!).toBe(false);
    expect(cli.sectorMission).toBe('');
  });
});

const pose = (x: number): SlotPoint => ({ x, y: 0, z: 0, yaw: 0 });
/** W1 at x 0, W2 at x 100 (Two-Key Ledger's shape: the mission starts at W2). */
const sectors = [
  { id: 'W1', guards: [], start: pose(0), start2: pose(2) },
  { id: 'W2', guards: [], start: pose(100), start2: pose(102) },
] as unknown as SectorDef[];
const ledger = { id: 'twoKeyLedger', mode: 'sector', sections: ['W2'], start: 'W2', steps: [], rules: [] } as unknown as MissionDef;
/** A sector match's page (no physics: every line open, a floor everywhere); W1 and W2 apart by a locked door at x 50. */
function page(mode: 'sector' | 'course' = 'sector') {
  const teleport = vi.fn();
  const g = {
    opts: { mode },
    world: {
      map: { sectors, missions: [ledger] },
      layout: { playerSpawns: [{ pos: { x: -20, y: 0, z: 0 }, yaw: 0 }, { pos: { x: -20, y: 0, z: 2 }, yaw: 0 }] },
      level: { boxes: [], cylinders: [] },
      doors: { list: [{ open: 0, anchor: { locked: true, hinge: { x: 50, z: -5 }, yaw: 0, width: 10 } }] },
    },
    nav: { findPath: (_from: [number, number], to: [number, number]) => [[to[0], to[1]]] },
    ballistics: { clear: (a: { y: number }, b: { y: number }) => b.y > a.y - 0.5 },
    player: { controller: { teleport }, cam: { yaw: 0 }, position: { x: 100, y: 0, z: 0 } },
  };
  return { g: g as unknown as GameState, teleport };
}

describe('NET3: the client starts in the host mission\'s start section', () => {
  it('startSlotPoints: the given mission picks its start section; none (or unknown) is section 0 as before', () => {
    const { g } = page();
    expect(startSlotPoints(g, undefined, 'twoKeyLedger').map((p) => p.x)).toEqual([100, 102]);
    expect(startSlotPoints(g, undefined, null).map((p) => p.x)).toEqual([0, 2]);
    expect(startSlotPoints(g, undefined, 'nope').map((p) => p.x)).toEqual([0, 2]);
    // the default: this page's own `?mission=` (none in tests): section 0, unchanged
    expect(startSlotPoints(g).map((p) => p.x)).toEqual([0, 2]);
  });

  const client = (sm: string) => {
    const p = page();
    const c = Object.create(CoopClient.prototype) as CoopClient;
    const players = new Map([
      ['H', { id: 'H', host: true }],
      ['C', { id: 'C', host: false }],
    ]);
    Object.assign(c, { g: p.g, s: { selfId: 'C', players, sectorMission: sm } });
    (c as unknown as { placeStart(): void }).placeStart();
    return p.teleport;
  };

  it("CoopClient.placeStart: the host's mission (session) puts slot 1 at W2's partner point", () => {
    const t = client('twoKeyLedger');
    expect(t).toHaveBeenCalledTimes(1);
    expect(t.mock.calls[0]![0]).toMatchObject({ x: 102, z: 0 });
  });

  it('CoopClient.placeStart with no host mission: W1, as before', () => {
    const t = client('');
    expect(t.mock.calls[0]![0]).toMatchObject({ x: 2, z: 0 });
  });
});

describe('NET3: the host places a remote whose first state is outside the current section', () => {
  const cps = [pose(100), pose(102)];
  // (NET3 gate) the engine shipped the placement dark behind flags.missions; master's copy (campus-greybox A28 fix 1,
  // `placeEarly`) is live, and the merge keeps that one copy (tests/sectorStartCoop.test.ts)
  const savedMissions = flags.missions;
  beforeAll(() => {
    flags.missions = true;
  });
  afterAll(() => {
    flags.missions = savedMissions;
  });
  it('offSection: near the checkpoint, or a walk to it with no locked door, is in the section', () => {
    const { g } = page();
    expect(offSection(g, cps, 102, 0, 1)).toBe(false);
    expect(offSection(g, cps, 70, 0, 0)).toBe(false);
    // W1's partner point: the locked connector door at x 50 between
    expect(offSection(g, cps, 2, 0, 0)).toBe(true);
    expect(offSection(g, [], 2, 0, 0)).toBe(false);
  });

  const host = (modeId: string) => {
    const { g } = page();
    (g as unknown as { mode: unknown }).mode = { id: modeId, checkpointSpawns: () => cps.map((p) => ({ ...p })) };
    const h = Object.create(CoopHost.prototype) as CoopHost;
    const r = { id: 'c1', held: false, alive: true, feet: { x: 2, y: 0, z: 0 }, allowTeleport: vi.fn() };
    const joins = new JoinWatch();
    Object.assign(h, { g, joins, remotes: new Map([['c1', r]]), time: 5 });
    const place = (x: number): void => (h as unknown as { firstPlace(r: unknown, x: number, y: number, z: number): void }).firstPlace(r, x, 0, 0);
    return { joins, r, place };
  };

  it('Sector Ops: a first state in W1 while the run is at W2 is put on the checkpoint (slot 1), repeated as a restore', () => {
    const t = host('sector');
    t.place(2);
    expect(t.joins.restoring('c1')).toBe(true);
    expect(t.joins.restores.get('c1')).toMatchObject({ x: 102, z: 0 });
    expect(t.r.allowTeleport).toHaveBeenCalled();
    // the next state on the spot ends it
    expect(t.joins.restoreStep('c1', 102, 0, 5.1)).toBeNull();
    expect(t.joins.restoring('c1')).toBe(false);
  });

  it('a first state in the section, or any other mode: untouched', () => {
    const inSec = host('sector');
    inSec.place(102);
    expect(inSec.joins.restoring('c1')).toBe(false);
    const course = host('course');
    course.place(2);
    expect(course.joins.restoring('c1')).toBe(false);
    expect(course.r.allowTeleport).not.toHaveBeenCalled();
  });

  it('(campus-greybox A28) flags.missions off: a first state off the section is still moved (live on master)', () => {
    flags.missions = false;
    try {
      const t = host('sector');
      t.place(2);
      expect(t.joins.restoring('c1')).toBe(true);
      expect(t.r.allowTeleport).toHaveBeenCalledWith(3);
    } finally {
      flags.missions = true;
    }
  });
});

describe('FLG: the host sends a mission only with flags.missions on', () => {
  const saved = { missions: flags.missions, mission: flags.mission };
  afterEach(() => {
    flags.missions = saved.missions;
    flags.mission = saved.mission;
  });
  it('off: ?mission= is ignored, so no sm goes out and the client starts at section 1 like the host', () => {
    flags.mission = 'twoKeyLedger';
    flags.missions = false;
    const host = sess(hub().make('H'), 'host', 'ABCDE', prof('Host'));
    expect(host.sectorMission).toBe('');
    host.setSettings('sector', 'tallowWharf', 'normal');
    expect(host.startMatch()?.sectorMission ?? '').toBe('');
  });
  it('on: the host carries its URL mission', () => {
    flags.mission = 'twoKeyLedger';
    flags.missions = true;
    expect(sess(hub().make('H'), 'host', 'ABCDE', prof('Host')).sectorMission).toBe('twoKeyLedger');
  });
});
