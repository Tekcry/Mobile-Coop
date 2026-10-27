import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import type { PlayerRef } from '../src/ai/enemy';
import { SectorMode } from '../src/game/modes/sectorMode';
import { CONN_UNLOCK_FAR, SECTOR, SectorRun, type SectorDef } from '../src/game/sectors';
import { OUT_LINE, OutFollow, followPick, isOutRef, outMask, outWaits, slotOut } from '../src/game/sectorOut';
import { newSectionStats, SyncedDetector } from '../src/game/rating/sectionRating';
import { SectorDesks } from '../src/game/sectorDesks';
import { CoopHost } from '../src/net/coopHost';
import { JoinWatch } from '../src/net/joinWatch';
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

  it('(round fix) an OUT operator who leaves for good: off the OUT list and the wire mask at once; others stay', () => {
    const ps = [player('local', 0), player('b', 1), player('c', 2), player('d', 3)];
    const { m, mi, g, down } = host(ps);
    down('c');
    m.onPlayerOut('c');
    down('d');
    m.onPlayerOut('d');
    expect(mi.netExtra({ liveSection: 0, destroyedIds: () => [] }).ot).toBe(12);
    const sec = mi as unknown as { secT: number };
    sec.secT = 1;
    m.onPlayerLeft('b'); // not out: nothing changes
    expect(sec.secT).toBe(1);
    expect(mi.outs.size).toBe(2);
    m.onPlayerLeft('c');
    expect([...mi.outs.keys()]).toEqual(['d']);
    expect([...g.outIds]).toEqual(['d']);
    expect(sec.secT).toBe(0); // the sector message goes now
    expect(mi.netExtra({ liveSection: 0, destroyedIds: () => [] }).ot).toBe(8);
    m.onPlayerLeft('d');
    expect(g.outIds.size).toBe(0);
    expect(mi.netExtra({ liveSection: 0, destroyedIds: () => [] }).ot).toBeUndefined();
  });

  it('(round fix) restartSection clears OUT (the list, outIds and the wire mask) before the respawn', () => {
    const ps = [player('local', 0), player('b', 1), player('c', 2)];
    const { m, mi, g, down } = host(ps);
    down('c');
    m.onPlayerOut('c');
    expect(g.outIds.has('c')).toBe(true);
    // the restart's other work, stubbed: only the OUT state is read here
    const g2 = g as unknown as Record<string, unknown>;
    Object.assign(g2, {
      enemyMgr: null,
      checkpointReset: vi.fn(),
      world: { doors: { list: [] }, level: { lights: {} } },
      player: { cam: { yaw: 0 } },
      scheduleRespawn: vi.fn(),
    });
    let outAtRespawn = -1;
    (g2.scheduleRespawn as ReturnType<typeof vi.fn>).mockImplementation(() => (outAtRespawn = g.outIds.size));
    Object.assign(m, {
      restarts: 0,
      team: { reset: vi.fn() },
      rekey: vi.fn(),
      unloadSection: vi.fn(),
      freshCounters: vi.fn(),
      loadSection: vi.fn(),
      beginSection: vi.fn(),
      startState: { apply: () => ({ lights: 0, doors: 0 }), take: vi.fn() },
      ct: null,
      checkpoint: new Vector3(),
    });
    m.restartSection();
    expect(mi.outs.size).toBe(0);
    expect(g.outIds.size).toBe(0);
    expect(outAtRespawn).toBe(0);
    expect(mi.netExtra({ liveSection: 0, destroyedIds: () => [] }).ot).toBeUndefined();
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

  it('(round fix, checks A / B) a held (dropped) OUT player comes back too: revived on its slot, its hold re-pointed there', () => {
    const h = Object.create(CoopHost.prototype) as CoopHost;
    const cp = { x: 50, y: 0, z: 0, yaw: 0.5 };
    const remotes = new Map([
      ['b', { id: 'b', alive: true, held: false, ref: { slot: 1 }, feet: new Vector3(51, 0, 0) }],
      ['c', { id: 'c', alive: false, held: true, ref: { slot: 2 }, feet: new Vector3(10, 0, 0) }],
      ['d', { id: 'd', alive: false, held: false, ref: { slot: 3 }, feet: new Vector3(12, 0, 0) }],
    ]);
    const revived: [string, Vector3][] = [];
    const joins = new JoinWatch();
    joins.hold('c', { x: 10, y: 0, z: 0, yaw: 0 }); // where it dropped (the previous section)
    const respawned = vi.spyOn(joins, 'respawned');
    Object.assign(h, {
      g: { mode: { checkpointSpawns: () => [cp] }, player: { position: new Vector3(50, 0, 0), alive: true, cam: { yaw: 0 } } },
      s: { selfId: 'host' },
      remotes,
      time: 3,
      joins,
      reviveOne: (id: string, at: Vector3) => revived.push([id, at.clone()]),
    });
    h.returnOut(['c', 'd']);
    expect(revived.map((r) => r[0])).toEqual(['c', 'd']);
    const c = revived[0]![1];
    expect(Math.hypot(c.x - cp.x, c.z - cp.z)).toBeLessThan(3);
    // the held one keeps a restore, now at its new spot (its rejoin's `resume` sends it there), not dropped
    expect(respawned).toHaveBeenCalledTimes(1);
    expect(respawned).toHaveBeenCalledWith('d', 3);
    const at = joins.restores.get('c')!;
    expect([at.x, at.z]).toEqual([c.x, c.z]);
    // its rejoin: the restore repeats to the new checkpoint spot
    joins.late('c', [], 4);
    expect(joins.heldSpot('c')).toMatchObject({ x: c.x, z: c.z });
    joins.resume('c', 5);
    expect(joins.restoreStep('c', 10, 0, 5)).toMatchObject({ x: c.x, z: c.z });
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

describe('OUT and leaving (CoopHost hold / removeRemote, round fix)', () => {
  /** A host stub with remotes `ps` (id, slot, alive) for `hold` and `removeRemote`. */
  function net(ps: [string, number, boolean][], out: string[], mode: Record<string, unknown>) {
    const h = Object.create(CoopHost.prototype) as CoopHost;
    const remotes = new Map(ps.map(([id, slot, alive]) => [id, { id, alive, held: false, ref: { slot }, feet: new Vector3(slot, 0, 0), state: null, dispose: vi.fn() }]));
    const remoteRefs = [...remotes.values()].map((r) => r.ref);
    const outIds = new Set(out);
    const g = {
      outIds,
      mode,
      enemyMgr: null,
      player: { alive: false },
      hud: { setNetNotice: vi.fn() },
      app: { toasts: { show: vi.fn() } },
      // the connected players up: the host (down here) and the remotes not held
      anyPlayerAlive: () => [...remotes.values()].some((r) => r.alive && !r.held && !outIds.has(r.id)),
    };
    Object.assign(h, {
      g,
      s: { code: 'ABCD', selfId: 'host' },
      remotes,
      remoteRefs,
      rejoining: new Set<string>(),
      seized: new Map(),
      teamPairs: new Map(),
      partnerBoxes: new Map(),
      joins: new JoinWatch(),
      teamClear: vi.fn(),
      dropRevive: vi.fn(),
      // (merge 4.95.0) master's coop-carry and joint-interrogation maps (a hold / leave drops the carry and the bluff)
      carries: new Map(),
      bluffs: new Map(),
    });
    const hi = h as unknown as { hold(id: string, name: string): void; removeRemote(id: string): void };
    return { h: hi, remotes, g };
  }

  it('an OUT leaver is dropped from the mode\'s OUT list at once (removeRemote -> onPlayerLeft)', () => {
    const mode = { onPlayerLeft: vi.fn(), onPlayerDeath: vi.fn() };
    const { h } = net([['b', 1, true], ['c', 2, false]], ['c'], mode);
    h.removeRemote('c');
    expect(mode.onPlayerLeft).toHaveBeenCalledWith('c');
    expect(mode.onPlayerDeath).not.toHaveBeenCalled(); // b is still up
  });

  it('team 3+: everyone else OUT or down and the last one up drops (held): the section restarts now', () => {
    const mode = { onPlayerDeath: vi.fn() };
    const { h, remotes } = net([['b', 1, true], ['c', 2, false]], ['c'], mode);
    h.hold('b', 'B');
    expect(remotes.get('b')!.held).toBe(true);
    expect(mode.onPlayerDeath).toHaveBeenCalledTimes(1);
  });

  it('nobody OUT (1-2 players, or nobody out yet): a drop restarts nothing (unchanged)', () => {
    const mode = { onPlayerDeath: vi.fn() };
    const { h } = net([['b', 1, true]], [], mode);
    h.hold('b', 'B');
    expect(mode.onPlayerDeath).not.toHaveBeenCalled();
  });

  it('someone still up: a drop restarts nothing', () => {
    const mode = { onPlayerDeath: vi.fn() };
    const { h } = net([['b', 1, true], ['c', 2, false], ['d', 3, true]], ['c'], mode);
    h.hold('b', 'B');
    expect(mode.onPlayerDeath).not.toHaveBeenCalled();
  });
});
