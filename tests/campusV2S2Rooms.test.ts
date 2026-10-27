/**
 * (campus-greybox S2-G5c-0, `docs/campus-greybox/checks/s2-build.md` "S2-G5c-0", the lead's answer to the G5c block, option 1)
 * Section 2's rooms re-cut so every enclosed space is a RoomDef of its own: meeting rooms 1-3 (L1), the L2 executive suite,
 * offices A / B, the board room, the L2 balcony strips (twins of l1west / l1south / l1east) and the roof plant room. Pure data
 * (no level build): the boxes are the plan graph's `area`s, they nest in their parents (smallest box wins, `roomAt`), the void,
 * the mail-lift shaft and the cores have no RoomDef, and every new id is dress-tagged.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { roomAt, type RoomRect } from '../src/world/rooms';
import { S2_ROOMS } from '../src/world/maps/campusV2/s2';
import { S2_ART_TAGS } from '../src/world/maps/campusV2/s2Dress';

const graph = JSON.parse(readFileSync(path.resolve(__dirname, '../docs/sector-redesign/graph/v2/campusOps-S2.json'), 'utf8')) as { spaces: { id: string; storey: number; area: [number, number, number, number] }[] };
const room = (id: string) => S2_ROOMS.find((r) => r.id === id)!;
const box = (r: RoomRect): [number, number, number, number] => [r.minX, r.minZ, r.maxX, r.maxZ];
const NEW = ['s2-l1-mr1', 's2-l1-mr2', 's2-l1-mr3', 's2-l2-exec', 's2-l2-offa', 's2-l2-offb', 's2-l2-board', 's2-l2-west', 's2-l2-south', 's2-l2-east', 's2-roof-plant'];
/** Do the two rooms share a storey (more than a boundary)? */
const sameStorey = (a: RoomRect, c: RoomRect): boolean => Math.min(a.maxY ?? Infinity, c.maxY ?? Infinity) - Math.max(a.minY ?? -Infinity, c.minY ?? -Infinity) > 0.01;
const inside = (a: RoomRect, c: RoomRect): boolean => a.minX >= c.minX - 1e-9 && a.maxX <= c.maxX + 1e-9 && a.minZ >= c.minZ - 1e-9 && a.maxZ <= c.maxZ + 1e-9;

describe('S2-G5c-0 the re-cut rooms (A-J17-S2-1)', () => {
  it('the eleven new RoomDefs exist once, with no squads, and none is the void, the mail-lift shaft or a core', () => {
    const ids = S2_ROOMS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of NEW) expect(ids.filter((i) => i === id).length, id).toBe(1);
    for (const r of S2_ROOMS) expect(r.squad ?? [], r.id).toEqual([]);
    for (const id of ids) expect(/void|shaft|core/.test(id), id).toBe(false);
    expect(ids.length).toBe(26 + NEW.length);
  });

  it('each box is its plan graph area: meeting rooms 1-3, the executive suite, offices A / B, the board room, the roof plant room', () => {
    const pairs: [string, string][] = [
      ['s2-l1-mr1', 's2-l1-mr1'], ['s2-l1-mr2', 's2-l1-mr2'], ['s2-l1-mr3', 's2-l1-mr3'], ['s2-l2-exec', 's2-l2-exec'], ['s2-l2-offa', 's2-l2-offa'],
      ['s2-l2-offb', 's2-l2-offb'], ['s2-l2-board', 's2-l2-board'], ['s2-roof-plant', 's2-roof-plant'],
    ];
    for (const [id, sp] of pairs) {
      const s = graph.spaces.find((q) => q.id === sp)!;
      const r = room(id);
      expect(box(r), id).toEqual(s.area);
      expect(r.minY, id).toBe(s.storey);
    }
    // the floors: L1 meeting rooms 4.4..8.4, L2 rooms 8.4..12.3, the roof plant room 12.3..16.5 (the walls 4.0 and the roof box)
    for (const id of ['s2-l1-mr1', 's2-l1-mr2', 's2-l1-mr3']) expect([room(id).minY, room(id).maxY], id).toEqual([4.4, 8.4]);
    for (const id of ['s2-l2-exec', 's2-l2-offa', 's2-l2-offb', 's2-l2-board', 's2-l2-west', 's2-l2-south', 's2-l2-east']) expect([room(id).minY, room(id).maxY], id).toEqual([8.4, 12.3]);
    expect([room('s2-roof-plant').minY, room('s2-roof-plant').maxY]).toEqual([12.3, 16.5]);
  });

  it('the L2 strips are the L1 strips\' twins (the same x / z boxes, one floor up)', () => {
    for (const [l2, l1] of [['s2-l2-west', 'l1west'], ['s2-l2-south', 'l1south'], ['s2-l2-east', 'l1east']] as const) expect(box(room(l2)), l2).toEqual(box(room(l1)));
  });

  it('rooms on one storey overlap only by nesting (a box wholly inside another), and the nested set is exactly the new rooms in their parents', () => {
    const nested: string[] = [];
    const straddle: string[] = [];
    for (let i = 0; i < S2_ROOMS.length; i++)
      for (let j = i + 1; j < S2_ROOMS.length; j++) {
        const a = S2_ROOMS[i]!;
        const c = S2_ROOMS[j]!;
        if (!sameStorey(a, c)) continue;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        if (!(ox > 0.01 && oz > 0.01)) continue;
        // the office boxes straddle the l2sw / l2north line (offa x -28.5..-13): a partial overlap of two parents, the office inside neither
        if (inside(a, c)) nested.push(`${a.id}<${c.id}`);
        else if (inside(c, a)) nested.push(`${c.id}<${a.id}`);
        else if (a.id === 's2-l2-offa' || c.id === 's2-l2-offa') straddle.push(a.id === 's2-l2-offa' ? c.id : a.id);
        else throw new Error(`${a.id} and ${c.id} overlap without nesting`);
      }
    // office A (PG area x -28.5..-13) straddles the l2sw / l2north line at x -26: the smallest box wins, so it is office A's either way
    expect(straddle.sort()).toEqual(['l2north', 'l2sw']);
    // every new room nests in an older one (its parent), and no older room nests in a new one
    for (const n of nested) {
      const [child, parent] = n.split('<');
      expect(NEW.includes(child!), n).toBe(true);
      expect(NEW.includes(parent!) && parent !== 's2-roof-plant', n).toBe(false);
    }
    const children = new Set(nested.map((n) => n.split('<')[0]!));
    // the three L2 strips and the roof plant room are the only new ones that may nest nowhere but in an L2 / roof parent; offa straddles l2sw and l2north
    for (const id of NEW) expect(children.has(id) || id === 's2-l2-offa', id).toBe(true);
    // parents: meeting rooms in l1sw / l1north, the L2 rooms in l2sw / l2north / l2wing, the roof plant room in the roof
    expect(nested).toContain('s2-l1-mr1<l1sw');
    expect(nested).toContain('s2-l1-mr2<l1sw');
    expect(nested).toContain('s2-l1-mr3<l1north');
    expect(nested).toContain('s2-l2-exec<l2sw');
    expect(nested).toContain('s2-l2-offb<l2north');
    expect(nested).toContain('s2-l2-board<l2wing');
    expect(nested).toContain('s2-roof-plant<roof');
  });

  it('roomAt: a point inside a new room is that room\'s, the open plan keeps the rest, and the strips and offices take their ground from the parents', () => {
    const at = (x: number, z: number, y: number): string => S2_ROOMS[roomAt(S2_ROOMS, x, z, y)]?.id ?? '';
    expect(at(-40, -17, 4.5)).toBe('s2-l1-mr1');
    expect(at(-39, 3, 4.5)).toBe('s2-l1-mr2');
    expect(at(-21, 3, 4.5)).toBe('s2-l1-mr3');
    expect(at(-33, -8, 4.5)).toBe('l1sw');
    expect(at(-22, -2, 4.5)).toBe('l1north');
    expect(at(-37, 1, 8.5)).toBe('s2-l2-exec');
    expect(at(-20, -26, 8.5)).toBe('s2-l2-offa');
    expect(at(-27, -26, 8.5)).toBe('s2-l2-offa');
    expect(at(-10, -26, 8.5)).toBe('s2-l2-offb');
    expect(at(-4, 3, 8.5)).toBe('s2-l2-board');
    expect(at(-28, -12, 8.5)).toBe('s2-l2-west');
    expect(at(-18, -20.5, 8.5)).toBe('s2-l2-south');
    expect(at(-9, -12, 8.5)).toBe('s2-l2-east');
    expect(at(-35, -9, 8.5)).toBe('l2sw');
    expect(at(-22, 2, 8.5)).toBe('l2north');
    expect(at(-2, -12, 8.5)).toBe('l2wing');
    expect(at(-16, 3, 12.4)).toBe('s2-roof-plant');
    expect(at(-30, 0, 12.4)).toBe('roof');
    // the void has no RoomDef: on L1 it is in no room, on L2 it stays inside its parent's box (l2north)
    expect(at(-18.75, -11.25, 4.5)).toBe('');
    expect(at(-18.75, -11.25, 8.5)).toBe('l2north');
  });

  it('every new id is dress-tagged as its L1 twin (meeting rooms, offices and the board room office-cell, strips office-open, the roof plant room plant), and the tag table covers every room', () => {
    expect(Object.keys(S2_ART_TAGS).sort()).toEqual(S2_ROOMS.map((r) => r.id).sort());
    for (const id of ['s2-l1-mr1', 's2-l1-mr2', 's2-l1-mr3', 's2-l2-exec', 's2-l2-offa', 's2-l2-offb', 's2-l2-board']) expect(S2_ART_TAGS[id], id).toBe('office-cell');
    for (const id of ['s2-l2-west', 's2-l2-south', 's2-l2-east']) expect(S2_ART_TAGS[id], id).toBe('office-open');
    expect(S2_ART_TAGS['s2-roof-plant']).toBe('plant');
  });
});
