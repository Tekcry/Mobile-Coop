import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs module (the editor server imports it the same way)
import { expandLayout, loadModules } from '../../scripts/kestrel/expand.mjs';
import { fitProblems, KIT_LEVELS, kitPreset, levelMap, mineId, mineText, originAt, placedItems, presetFromSelection, readMine, START_PRESETS, stampChanges } from '../../src/editor/presets';
import type { KitArch, RoomPreset } from '../../src/editor/presets';
import type { Campus, Opening, Room, Wall } from '../../src/editor/types';
import { keyOf } from '../../src/editor/types';
import { stairwellLink } from '../../src/editor/vertical';

function base(): Campus {
  return {
    meta: { id: 't', grid: 0.5, objectGrid: 0.1 },
    levels: [
      { id: 'G', name: 'Ground', floor: 0, height: 4.2 },
      { id: 'F', name: 'First', floor: 4.2, height: 4.2 },
    ],
    rooms: [],
    walls: [],
    openings: [],
    stairs: [],
    ladders: [],
    voids: [],
    objects: [],
  } as Campus;
}
const corridor = (d: Campus): void => {
  // a corridor along z = 0 .. 3, its north wall on z = 3 from x 0 to 20
  d.rooms.push({ id: 'G-COR', level: 'G', name: 'Corridor', kind: 'corridor', rect: [0, 0, 20, 3] } as Room);
  d.walls.push({ id: 'WC1', level: 'G', a: [0, 3], b: [20, 3], t: 0.3, h: 4.2, kind: 'interior' } as Wall);
};
const preset = (id: string): RoomPreset => START_PRESETS.find((p) => p.id === `start.${id}`)!;
const apply = (d: Campus, changes: { coll: string; after: unknown }[]): void => {
  for (const c of changes) ((d as unknown as Record<string, unknown[]>)[c.coll] ??= []).push(c.after);
};

describe('ON11 start set', () => {
  it('has the sixteen rooms of the brief, each object inside its room and every door on its wall', () => {
    expect(START_PRESETS.map((p) => p.id.slice(6))).toEqual(['office-4', 'office-8', 'meeting-8', 'manager', 'wc-block', 'kitchenette', 'security-control', 'reception', 'locker-room', 'comms-room', 'store', 'plant-room', 'stair-core', 'lift-lobby', 'data-hall-bay', 'goods-in']);
    for (const p of START_PRESETS) {
      expect(p.src.length).toBeGreaterThan(10);
      for (const o of p.items.objects) {
        const r = p.items.rooms.find((q) => q.level === o.level && o.rect[0] >= q.rect[0] + 0.15 - 1e-6 && o.rect[1] >= q.rect[1] + 0.15 - 1e-6 && o.rect[2] <= q.rect[2] - 0.15 + 1e-6 && o.rect[3] <= q.rect[3] - 0.15 + 1e-6);
        expect(r, `${p.id} ${o.name} inside a room`).toBeTruthy();
      }
      for (const o of p.items.openings) {
        const w = p.items.walls.find((q) => q.id === o.wall)!;
        const len = Math.abs(w.b[0] - w.a[0]) + Math.abs(w.b[1] - w.a[1]);
        expect(o.at - o.w / 2).toBeGreaterThanOrEqual(-1e-6);
        expect(o.at + o.w / 2).toBeLessThanOrEqual(len + 1e-6);
      }
    }
  });

  it('builds shared edges as one wall (the WC block has one wall between male and female)', () => {
    const wc = preset('wc-block');
    expect(wc.items.walls.filter((w) => w.a[0] === 3.5 && w.b[0] === 3.5)).toHaveLength(1);
    expect(wc.items.rooms).toHaveLength(3);
  });
});

describe('ON11 stamping', () => {
  it('stamps an office against a corridor wall: that wall reused, fresh ids, one change list', () => {
    const d = base();
    corridor(d);
    const p = preset('office-4');
    const { items } = placedItems(p, [4, 3], 0);
    const r = stampChanges(d, p, items, 'G');
    if ('why' in r) throw new Error(r.why);
    expect(r.reused).toBe(1);
    const walls = r.changes.filter((c) => c.coll === 'walls').map((c) => c.after as Wall);
    expect(walls).toHaveLength(3);
    expect(walls.some((w) => w.a[1] === 3 && w.b[1] === 3)).toBe(false);
    const door = r.changes.find((c) => c.coll === 'openings')!.after as Opening;
    expect(door.wall).toBe('WC1');
    expect(door.at).toBeCloseTo(5.5);
    const room = r.changes.find((c) => c.coll === 'rooms')!.after as Room;
    expect(room.id).toBe('G-NEW1');
    expect([...(door.between ?? [])].sort()).toEqual(['G-COR', 'G-NEW1']);
    expect(walls.every((w) => w.h === 4.2 && /^WG-NEW\d$/.test(w.id))).toBe(true);
    expect(r.changes.filter((c) => c.coll === 'objects').map((c) => c.id)).toEqual(['O001', 'O002', 'O003', 'O004', 'O005', 'O006', 'O007', 'O008']);
    expect(r.words).toContain('1 wall reused');
    // a second stamp next to it reuses the shared side wall too, with new ids
    apply(d, r.changes);
    const s2 = stampChanges(d, p, placedItems(p, [10, 3], 0).items, 'G');
    if ('why' in s2) throw new Error(s2.why);
    expect(s2.reused).toBe(2);
    expect((s2.changes.find((c) => c.coll === 'rooms')!.after as Room).id).toBe('G-NEW2');
    expect(s2.changes.filter((c) => c.coll === 'objects')[0]!.id).toBe('O009');
  });

  it('turns a WC block a quarter: footprint swaps, every room and object turned, still inside', () => {
    const p = preset('wc-block');
    const { items, size } = placedItems(p, [0, 0], 1);
    expect(size).toEqual([p.size[1], p.size[0]]);
    const male = items.rooms.find((r) => r.name === 'Male WC')!;
    // the male WC (west end, x 0..3.5, z 0..4.5) turns clockwise to the north end
    expect(male.rect).toEqual([0, 6, 4.5, 9.5]);
    for (const o of items.objects) {
      const inside = items.rooms.some((r) => o.rect[0] >= r.rect[0] && o.rect[2] <= r.rect[2] && o.rect[1] >= r.rect[1] && o.rect[3] <= r.rect[3]);
      expect(inside).toBe(true);
    }
    const four = placedItems(p, [0, 0], 4).items;
    expect(four.rooms.map((r) => r.rect)).toEqual(p.items.rooms.map((r) => r.rect));
  });

  it('stamps the stair core over two levels with its risers from the rule and its well from the link', () => {
    const d = base();
    const p = preset('stair-core');
    const r = stampChanges(d, p, placedItems(p, [30, 30], 0).items, 'G');
    if ('why' in r) throw new Error(r.why);
    const stair = r.changes.find((c) => c.coll === 'stairs')!.after as { from: string; to: string; risers: number };
    expect([stair.from, stair.to, stair.risers]).toEqual(['G', 'F', 26]);
    expect(r.changes.filter((c) => c.coll === 'rooms').map((c) => (c.after as Room).level)).toEqual(['G', 'F']);
    expect(stairwellLink(d, r.changes).filter((c) => c.coll === 'voids')).toHaveLength(1);
    expect(stampChanges(d, p, placedItems(p, [30, 30], 0).items, 'F')).toEqual({ why: 'Stair core (main dogleg) needs a level above this one' });
  });

  it('centres the footprint on the dot, on the grid', () => {
    expect(originAt([6, 5], 10, 10, 0.5)).toEqual([7, 7.5]);
  });
});

describe('ON11 fit check', () => {
  it('names the room a stamp overlaps and by how much, and refuses it', () => {
    const d = base();
    corridor(d);
    d.rooms.push({ id: 'G-ADMIN', level: 'G', name: 'Admin Office', kind: 'zone', rect: [8, 3, 14, 8] } as Room);
    const p = preset('office-4');
    const { items } = placedItems(p, [4, 3], 0);
    const bad = fitProblems(d, items, levelMap(d, 'G'));
    expect(bad.map((b) => b.words)).toEqual(['overlaps Admin Office by 2 m']);
    const r = stampChanges(d, p, items, 'G');
    expect('why' in r && r.why).toBe('Cannot stamp 4-desk office here: overlaps Admin Office by 2 m');
  });

  it('flags a wall running through a stamped room; yards are outside ground', () => {
    const d = base();
    d.rooms.push({ id: 'Y', level: 'G', name: 'Yard', kind: 'yard', rect: [0, 0, 40, 40] } as Room);
    d.walls.push({ id: 'WX', level: 'G', a: [7, 0], b: [7, 20], t: 0.3, h: 4.2, kind: 'interior' } as Wall);
    const p = preset('office-4');
    const bad = fitProblems(d, placedItems(p, [4, 3], 0).items, levelMap(d, 'G'));
    expect(bad.map((b) => b.words)).toEqual(['wall WX runs through Office for 5 m']);
    expect(fitProblems(d, placedItems(p, [10, 3], 0).items, levelMap(d, 'G'))).toEqual([]);
  });
});

describe('ON11 module kit and own presets', () => {
  it('reads every module of modules.json as a preset (expanded, not copied)', () => {
    const mods = loadModules() as Map<string, { id: string; name: string; source?: string }>;
    const kit: RoomPreset[] = [];
    for (const m of mods.values()) {
      const res = expandLayout({ layout: { meta: { grid: 0.5, objectGrid: 0.1 }, levels: KIT_LEVELS, placements: [{ id: 'K', module: m.id, level: 'P0', at: [0, 0] }] }, modules: mods }) as { arch: KitArch; errors: string[] };
      expect(res.errors).toEqual([]);
      kit.push(kitPreset(m, res.arch));
    }
    expect(kit.length).toBe(mods.size);
    const wc = kit.find((p) => p.id === 'kit.staff-wc')!;
    expect(wc.items.rooms[0]!.level).toBe('+0');
    expect(JSON.stringify(wc)).not.toContain('"gen"');
    const stair = kit.find((p) => p.id === 'kit.main-stair')!;
    expect(stair.items.stairs[0]).toMatchObject({ from: '+0', to: '+1' });
    const d = base();
    const r = stampChanges(d, stair, placedItems(stair, [50, 50], 0).items, 'G');
    if ('why' in r) throw new Error(r.why);
    // the module's own well is left to the stairwell link: no double
    expect(r.changes.filter((c) => c.coll === 'voids')).toHaveLength(0);
  });

  it('saves a box-selected group as a preset, writes and reads the file, and stamps it elsewhere', () => {
    const d = base();
    corridor(d);
    const p = preset('office-4');
    const r = stampChanges(d, p, placedItems(p, [4, 3], 0).items, 'G');
    if ('why' in r) throw new Error(r.why);
    apply(d, r.changes);
    const keys = r.keys.filter((k) => k.startsWith('rooms:') || k.startsWith('walls:'));
    const mine = presetFromSelection(d, keys, 'G', 'My office', mineId([]))!;
    expect(mine.id).toBe('mine.1');
    expect(mine.size).toEqual([6, 5]);
    // the group's three walls; the reused corridor wall was not selected, so its door stays behind
    expect(mine.items.walls).toHaveLength(3);
    expect(mine.items.objects).toHaveLength(8);
    expect(mine.items.rooms[0]!.rect).toEqual([0, 0, 6, 5]);
    const back = readMine(mineText([mine]));
    expect(back).toEqual([mine]);
    expect(readMine('not json')).toEqual([]);
    const s = stampChanges(d, back[0]!, placedItems(back[0]!, [30, 30], 0).items, 'G');
    if ('why' in s) throw new Error(s.why);
    expect(s.changes.filter((c) => c.coll === 'objects')).toHaveLength(8);
  });

  it('saves one picked room with walls made along its edges and its doors', () => {
    const d = base();
    corridor(d);
    const p = preset('office-4');
    const r = stampChanges(d, p, placedItems(p, [4, 3], 0).items, 'G');
    if ('why' in r) throw new Error(r.why);
    apply(d, r.changes);
    const mine = presetFromSelection(d, [keyOf('rooms', 'G-NEW1')], 'G', 'Office copy', 'mine.1')!;
    expect(mine.size).toEqual([6, 5]);
    expect(mine.items.walls).toHaveLength(4);
    expect(mine.items.openings).toHaveLength(1);
    expect(mine.items.openings[0]!.at).toBeCloseTo(1.5);
  });
});

describe('ON11 origin at the dot', () => {
  it('rounds half an odd size down on the 0.1 grid (no ties)', () => {
    expect(originAt([9.5, 4.5], 13.7, 11.2, 0.1)).toEqual([9, 9]);
    expect(originAt([9.5, 4.5], 13.75, 11.25, 0.1)).toEqual([9.1, 9.1]);
  });
});
