import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import type { PlayerRef } from '../src/ai/enemy';
import { SectorMode } from '../src/game/modes/sectorMode';
import { CONN_UNLOCK_FAR, SECTOR, SectorRun, type SectorDef } from '../src/game/sectors';
import { OUT_LINE, OutFollow, followPick, isOutRef, outMask, outWaits, slotOut } from '../src/game/sectorOut';
import { newSectionStats, SyncedDetector } from '../src/game/rating/sectionRating';
import { SectorDesks } from '../src/game/sectorDesks';
import { CoopHost } from '../src/net/coopHost';
import type * as SpawnPlace from '../src/game/spawnPlace';

// (coop4 OUT, M1 b) Sector Ops at 3-4 players: an operator out (no syringe left, or the revive window over) waits for the
// next connector: no restart, out of the player list (guards, connector count), back at the next connector's checkpoint
// on their slot; the section restarts only when nobody is left up. 1-2 players: one out restarts (unchanged).

vi.mock('../src/game/spawnPlace', async (orig) => ({
  ...(await orig<typeof SpawnPlace>()),
  spawnProbe: () => ({ blocked: () => false, open: () => true, floor: () => true }),
}));

describe('OUT: the pure rules', () => {
  it('waits from SECTOR.outWaitsMin (3) players; 1-2 restart as before', () => {
    expect(SECTOR.outWaitsMin).toBe(3);
    expect([1, 2, 3, 4].map(outWaits)).toEqual([false, false, true, true]);
    expect(outWaits(Number.NaN)).toBe(false);
  });

  it('isOutRef: marked and down only (a marked player up again, e.g. a rejoin, counts)', () => {
    const s = new Set(['b']);
    expect(isOutRef(s, 'b', false)).toBe(true);
    expect(isOutRef(s, 'b', true)).toBe(false);
    expect(isOutRef(s, 'c', false)).toBe(false);
    expect(isOutRef(new Set(), 'b', false)).toBe(false);
  });

  it('the wire mask: bit per slot, junk ignored', () => {
    expect(outMask([2])).toBe(4);
    expect(outMask([0, 3])).toBe(9);
    expect(outMask([-1, 4, 1.5])).toBe(0);
    expect(slotOut(4, 2)).toBe(true);
    expect(slotOut(4, 1)).toBe(false);
    expect(slotOut(15, 4)).toBe(false);
  });

  it('followPick: keeps a target up, moves on with the switch input or when it goes, wraps, -1 for nobody', () => {
    const up = [true, false, true, true];
    expect(followPick(up, -1, 0)).toBe(0);
    expect(followPick(up, 0, 0)).toBe(0);
    expect(followPick(up, 0, 1)).toBe(2);
    expect(followPick(up, 3, 1)).toBe(0);
    expect(followPick([true, false, false, false], 2, 0)).toBe(0);
    expect(followPick([false, false, false, false], 1, 0)).toBe(-1);
  });

  it('OutFollow: the followed teammate\'s live point; the next one on the switch input', () => {
    const f = new OutFollow();
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 2, y: 0, z: 0 };
    f.begin();
    f.set(0, a);
    f.set(3, b);
    expect(f.pick(0)).toBe(a);
    expect(f.pick(1)).toBe(b);
    expect(f.slot).toBe(3);
    f.begin();
    f.set(0, a);
    expect(f.pick(0)).toBe(a);
    f.begin();
    expect(f.pick(0)).toBeNull();
    expect(f.slot).toBe(-1);
  });
});

const pose = (x: number) => ({ x, y: 0, z: 0, yaw: 0 });
function sec(id: string, i: number): SectorDef {
  return {
    id,
    name: id,
    start: pose(i * 100),
    objective: { kind: 'hack', label: 'x', x: 0, y: 0, z: 0, yaw: 0 },
    connector: { label: 'on', box: [2, 2, 4, 4], nearAt: [2, 3], checkpoint: pose(i * 100 + 50) },
    guards: [],
    reinforce: [[60, 0]],
    perStage: SECTOR.perStage,
    routes: [],
  };
}

/** A player as `GameState.playerRefsInto` lists it (slot, feet, alive). */
function player(id: string, slot: number, x = 3, z = 3) {
  return { id, slot, feet: new Vector3(x, 0, z), target: { alive: true }, speed: 0, crouched: false, mv: null };
}
type P = ReturnType<typeof player>;

interface Internals {
  restartT: number;
  outs: Map<string, number>;
  connIn: { allInside: boolean; doorwayClear: boolean };
  exitStep(dt: number, s: SectorDef, refs: readonly PlayerRef[]): void;
  connEvents(ev: number, prev: number): void;
  netExtra(ct: unknown): { ot?: number };
  giveGrant(): void;
  beginSection(): void;
}

/** A Sector Ops host mode on a stub game of `ps` (connected players, slot order); `team` the session's team size. */
function host(ps: P[], team = ps.length) {
  const m = Object.create(SectorMode.prototype) as SectorMode;
  const outIds = new Set<string>();
  const net = { returnOut: vi.fn(), revivesLeft: () => 2 };
  const g = {
    outIds,
    net,
    teamSize: () => team,
    hud: { banner: vi.fn(), setDownTimer: vi.fn(), feedItem: vi.fn() },
    weapons: { restoreCheckpoint: vi.fn() },
    events: { emit: vi.fn() },
    world: { doors: { list: [] } },
    playerRefsInto: (o: PlayerRef[]) => {
      o.length = 0;
      for (const p of ps) if (!isOutRef(outIds, p.id, p.target.alive)) o.push(p as unknown as PlayerRef);
      return o;
    },
    anyPlayerAlive: () => ps.some((p) => p.target.alive),
  };
  Object.assign(m, {
    g,
    run: new SectorRun([sec('s1', 0), sec('s2', 1)]),
    refs: [],
    outs: new Map(),
    restartT: -1,
    endT: -1,
    secT: 1,
    connIn: { allInside: false, doorwayClear: true },
    doors: [],
    secStats: newSectionStats(),
    syncDet: new SyncedDetector(),
    desks: new SectorDesks([]),
    rt: { sec: -1, marks: 0, synced: 0, gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 },
  });
  const mi = m as unknown as Internals;
  const down = (id: string) => {
    const p = ps.find((q) => q.id === id)!;
    p.target.alive = false;
  };
  return { m, mi, g, net, down };
}

describe('OUT in SectorMode (host)', () => {
  it('team 3: one out -> no restart; they leave the player list and the connector count; the wire carries their slot', () => {
    const ps = [player('local', 0), player('b', 1), player('c', 2, 30, 30)];
    const { m, mi, g, down } = host(ps);
    down('c');
    m.onPlayerOut('c');
    expect(mi.restartT).toBe(-1);
    expect(g.hud.banner).not.toHaveBeenCalled();
    expect([...mi.outs]).toEqual([['c', 2]]);
    expect(g.playerRefsInto([]).map((r) => r.id)).toEqual(['local', 'b']);
    expect(mi.netExtra({ liveSection: 0, destroyedIds: () => [] }).ot).toBe(4);
    // the connector: the two up inside count as everyone (the OUT one, lying outside, neither blocks nor counts)
    m.run.phase = 'connector';
    mi.exitStep(0.01, m.run.current!, g.playerRefsInto([]));
    expect(mi.connIn.allInside).toBe(true);
  });

  it('a downed (revivable) teammate outside still blocks the connector (A7 unchanged)', () => {
    const ps = [player('local', 0), player('b', 1), player('c', 2, 30, 30)];
    const { m, mi, g, down } = host(ps);
    down('c');
    m.run.phase = 'connector';
    mi.exitStep(0.01, m.run.current!, g.playerRefsInto([]));
    expect(mi.connIn.allInside).toBe(false);
  });

  it('the next connector cycle brings them back (the net places them on their slot), OUT cleared, the wire empty', () => {
    const ps = [player('local', 0), player('b', 1), player('c', 2), player('d', 3)];
    const { m, mi, g, net, down } = host(ps);
    down('c');
    m.onPlayerOut('c');
    down('d');
    m.onPlayerOut('d');
    expect(mi.outs.size).toBe(2);
    mi.giveGrant = vi.fn();
    mi.beginSection = vi.fn();
    mi.connEvents(CONN_UNLOCK_FAR, 0);
    expect(net.returnOut).toHaveBeenCalledWith(['c', 'd']);
    // the return lands before the grant and the new section's loadout record
    expect(net.returnOut.mock.invocationCallOrder[0]!).toBeLessThan((mi.giveGrant as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]!);
    expect(mi.outs.size).toBe(0);
    expect(g.outIds.size).toBe(0);
    expect(mi.netExtra({ liveSection: 1, destroyedIds: () => [] }).ot).toBeUndefined();
  });

  it('the host out: the OUT line, its section loadout put back at once', () => {
    const ps = [player('local', 0), player('b', 1), player('c', 2)];
    const { m, g, down } = host(ps);
    down('local');
    m.onPlayerOut('local');
    expect(g.hud.setDownTimer).toHaveBeenCalledWith(OUT_LINE);
    expect(g.weapons.restoreCheckpoint).toHaveBeenCalledTimes(1);
    expect(g.playerRefsInto([]).map((r) => r.id)).toEqual(['b', 'c']);
  });

  it('everyone down or out: the section restarts', () => {
    const ps = [player('local', 0), player('b', 1), player('c', 2)];
    const { m, mi, g, down } = host(ps);
    down('c');
    m.onPlayerOut('c');
    expect(mi.restartT).toBe(-1);
    down('local');
    down('b');
    m.onPlayerOut('b');
    expect(mi.restartT).toBeGreaterThan(0);
    expect(g.hud.banner).toHaveBeenCalledWith('OPERATOR OUT', 'Restarting from checkpoint', 2200);
  });

  it('team 2 (and a call without an id): one out restarts the section, nobody marked (unchanged)', () => {
    const two = host([player('local', 0), player('b', 1)]);
    two.down('b');
    two.m.onPlayerOut('b');
    expect(two.mi.restartT).toBeGreaterThan(0);
    expect(two.mi.outs.size).toBe(0);
    expect(two.g.outIds.size).toBe(0);
    const three = host([player('local', 0), player('b', 1), player('c', 2)]);
    three.m.onPlayerOut();
    expect(three.mi.restartT).toBeGreaterThan(0);
  });

  it('the team size is the session\'s (connected plus held), not the list: a 3-player session with one held still waits', () => {
    const ps = [player('local', 0), player('b', 1)];
    const { m, mi, down } = host(ps, 3);
    down('b');
    m.onPlayerOut('b');
    expect(mi.restartT).toBe(-1);
    expect(mi.outs.has('b')).toBe(true);
  });
});

describe('OUT return placement (CoopHost.returnOut)', () => {
  it('each OUT player at the checkpoint on its slot (slot point, else beside), clear of the players up, full revive', () => {
    const h = Object.create(CoopHost.prototype) as CoopHost;
    const cp = { x: 50, y: 0, z: 0, yaw: 0 };
    const remote = (id: string, slot: number, alive: boolean, x = 50) => ({ id, alive, held: false, ref: { slot }, feet: new Vector3(x, 0, 0) });
    const remotes = new Map([
      ['b', remote('b', 1, true, 51)],
      ['c', remote('c', 2, false, 10)],
      ['d', remote('d', 3, false, 12)],
    ]);
    const revived: [string, Vector3][] = [];
    Object.assign(h, {
      g: { mode: { checkpointSpawns: () => [cp] }, player: { position: new Vector3(50, 0, 0), alive: true, cam: { yaw: 0 } } },
      s: { selfId: 'host' },
      remotes,
      time: 3,
      joins: { respawned: vi.fn() },
      reviveOne: (id: string, at: Vector3) => revived.push([id, at.clone()]),
    });
    h.returnOut(['d', 'c']);
    expect(revived.map((r) => r[0])).toEqual(['c', 'd']);
    const all = [new Vector3(50, 0, 0), new Vector3(51, 0, 0), ...revived.map((r) => r[1])];
    for (const [, p] of revived) expect(Math.hypot(p.x - cp.x, p.z - cp.z)).toBeLessThan(3);
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) expect(Math.hypot(all[i]!.x - all[j]!.x, all[i]!.z - all[j]!.z)).toBeGreaterThan(0.5);
  });

  it('the host itself out: back on slot 0 (the checkpoint point when free)', () => {
    const h = Object.create(CoopHost.prototype) as CoopHost;
    const cp = { x: 50, y: 0, z: 0, yaw: 1 };
    const revived: [string, Vector3][] = [];
    const cam = { yaw: 0 };
    Object.assign(h, {
      g: { mode: { checkpointSpawns: () => [cp] }, player: { position: new Vector3(10, 0, 0), alive: false, cam } },
      s: { selfId: 'host' },
      remotes: new Map([['b', { id: 'b', alive: true, held: false, ref: { slot: 1 }, feet: new Vector3(52, 0, 0) }]]),
      time: 3,
      joins: { respawned: vi.fn() },
      reviveOne: (id: string, at: Vector3) => revived.push([id, at.clone()]),
    });
    h.returnOut(['local']);
    expect(revived.length).toBe(1);
    expect(revived[0]![0]).toBe('host');
    expect(revived[0]![1].x).toBeCloseTo(50);
    expect(cam.yaw).toBe(1);
  });
});
