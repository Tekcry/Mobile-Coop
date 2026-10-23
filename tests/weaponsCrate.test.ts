/**
 * (E9-crate, A99-A109) The weapons crate: the once-per-player ledger, the top-up cap, restart, the client's per-player
 * state, and the placement data of campusOps and warehouseOps (rule + nav cells).
 */
import { describe, expect, it } from 'vitest';
import { CrateLedger, applyCrateEvent, crateItemId, crateReserve } from '../src/game/crateLedger';
import { checkSectorCrates } from '../src/world/mapCheck';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import type { SectorDef } from '../src/game/sectors';
import { runtimeNav } from './helpers/runtimeNav';

describe('once per player (A101)', () => {
  it('a crate is usable once per player; the ledger is per crate and player', () => {
    const l = new CrateLedger();
    expect(l.use('s1-crate', 'local')).toBe(true);
    expect(l.use('s1-crate', 'local')).toBe(false);
    expect(l.use('s1-crate', 'p2')).toBe(true);
    expect(l.use('s2-crate', 'p2')).toBe(true);
    expect(l.has('s1-crate', 'p2')).toBe(true);
    expect([...l.usedBy('p2')].sort()).toEqual(['s1-crate', 's2-crate']);
    expect(l.usedBy('local')).toEqual(['s1-crate']);
  });
  it('a restart resets the ledger (A105)', () => {
    const l = new CrateLedger();
    l.use('s1-crate', 'local');
    l.use('s1-crate', 'p2');
    l.reset();
    expect(l.usedBy('local')).toEqual([]);
    expect(l.use('s1-crate', 'local')).toBe(true);
    expect(l.use('s1-crate', 'p2')).toBe(true);
  });
});

describe('the top-up never goes above the starting loadout (A102)', () => {
  it('fills from below, never above, never lowers', () => {
    expect(crateReserve(0, 0, 30, 90)).toBe(120);
    expect(crateReserve(12, 40, 30, 90)).toBe(108);
    expect(crateReserve(30, 90, 30, 90)).toBe(90);
    expect(crateReserve(30, 150, 30, 90)).toBe(150);
  });
  it('property: result >= reserve; total reaches the start total only from below', () => {
    let seed = 12345;
    const rnd = (n: number): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed % n;
    };
    for (let i = 0; i < 2000; i++) {
      const magSize = 1 + rnd(40);
      const startReserve = rnd(200);
      const mag = rnd(magSize + 1);
      const reserve = rnd(300);
      const r = crateReserve(mag, reserve, magSize, startReserve);
      const start = magSize + startReserve;
      expect(r).toBeGreaterThanOrEqual(reserve);
      if (mag + reserve >= start) expect(r).toBe(reserve);
      else expect(mag + r).toBe(start);
    }
  });
});

describe('the client per-player state (A105, A106)', () => {
  it('another player\'s event changes nothing; my fill fills once; duplicates and late fills do not fill again', () => {
    const spent = new Set<string>();
    expect(applyCrateEvent(spent, 'me', { player: 'p2', id: 's1-crate', fill: true })).toBeNull();
    expect(spent.size).toBe(0);
    expect(applyCrateEvent(spent, 'me', { player: 'me', id: 's1-crate', fill: true })).toBe('fill');
    expect(applyCrateEvent(spent, 'me', { player: 'me', id: 's1-crate', fill: true })).toBeNull();
    expect(applyCrateEvent(spent, 'me', { player: 'me', id: 's1-crate', fill: false })).toBeNull();
  });
  it('a rejoin re-send marks only, and a later fill for a marked id does nothing', () => {
    const spent = new Set<string>();
    expect(applyCrateEvent(spent, 'me', { player: 'me', id: 's1-crate', fill: false })).toBe('mark');
    expect(spent.has('s1-crate')).toBe(true);
    expect(applyCrateEvent(spent, 'me', { player: 'me', id: 's1-crate', fill: true })).toBeNull();
  });
});

type SecMap = { id: string; sectors?: SectorDef[]; navLayers?: number; build: (b: LevelBuilder, n: number) => { playerSpawns: { pos: { x: number; z: number } }[]; navSeeds?: { x: number; y: number; z: number }[] } };

describe('placement data (A100, A109)', () => {
  const cases: [SecMap, number][] = [
    [campusOps as unknown as SecMap, 3],
    [warehouseOps as unknown as SecMap, 3],
  ];
  for (const [map, count] of cases) {
    it(`${map.id}: ${count} crates, one per section start, the rule passes, ids distinct, cells walkable`, () => {
      const b = new LevelBuilder();
      const lay = map.build(b, 0);
      // the S4 / S5 stubs live on another branch and get their crates at that merge
      const secs = (map.sectors ?? []).filter((s) => !s.name.endsWith('(stub)'));
      expect(checkSectorCrates(map.id, secs)).toEqual([]);
      const withCrate = secs.filter((s) => s.crate);
      expect(withCrate.length).toBe(count);
      expect(new Set(withCrate.map((s) => crateItemId(s.id))).size).toBe(count);
      const nav = runtimeNav(b, lay.playerSpawns[0]!.pos as { x: number; z: number }, map.navLayers ?? 3, lay.navSeeds ?? []);
      for (const s of withCrate) {
        const c = s.crate!;
        const ok = (x: number, z: number): boolean => nav.isWalkable(nav.cellOf(x, z, c.at[1])) && Math.abs(nav.heightAt(x, z, c.at[1]) - c.at[1]) < 0.6;
        expect(ok(c.at[0], c.at[2]), `${s.id} crate cell`).toBe(true);
        // the strip side (+z in the crate's frame) faces open floor
        expect(ok(c.at[0] + Math.sin(c.yaw) * 0.9, c.at[2] + Math.cos(c.yaw) * 0.9), `${s.id} crate faces open floor`).toBe(true);
      }
    });
  }
});

describe('checkSectorCrates on literal defs (A109)', () => {
  const mk = (id: string, start: [number, number, number], crate: SectorDef['crate'], far?: [number, number]): SectorDef =>
    ({ id, start: { x: start[0], y: start[1], z: start[2], yaw: 0 }, crate, connector: far ? { nearAt: [50, 50], farAt: far } : undefined }) as unknown as SectorDef;
  it('reports a missing crate, one too far, one on a farAt, one on the wrong floor', () => {
    expect(checkSectorCrates('x', [mk('a', [0, 0, 0], undefined)])).toEqual(['x: section a has no weapons crate']);
    expect(checkSectorCrates('x', [mk('a', [0, 0, 0], { at: [4, 0, 0], yaw: 0 })])).toEqual(['x: section a crate is 4.00 m from the start, must be 1.0-3.0 m']);
    expect(checkSectorCrates('x', [mk('a', [0, 0, 0], { at: [2, 0, 0], yaw: 0 }, [2, 0.5])])).toEqual(['x: section a crate is 0.50 m from a farAt (2, 0.5), must be at least 1.2 m']);
    expect(checkSectorCrates('x', [mk('a', [0, 0, 0], { at: [2, 3.3, 0], yaw: 0 })])).toEqual(['x: section a crate is at y 3.3, not on the start floor (y 0)']);
    expect(checkSectorCrates('x', [mk('a', [0, 0, 0], { at: [2, 0, 0], yaw: 0 })])).toEqual([]);
  });
});
