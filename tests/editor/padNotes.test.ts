import { describe, expect, it } from 'vitest';
import { CTXS, hintItems, PAD_HINT_MAX } from '../../src/editor/actions';
import { cardWords, describeChange, slotDoorName } from '../../src/editor/ops';
import type { Campus, Opening, Room, Wall } from '../../src/editor/types';

// ED3-pad1: Michael's first pad test (hint bar, card words, wall change words)
const d: Campus = {
  meta: { id: 't', grid: 0.5 },
  levels: [{ id: 'G', name: 'Ground', floor: 0, height: 4.2 }],
  rooms: [{ id: 'R1', level: 'G', name: 'Office', kind: 'zone', rect: [0, 0, 10, 5], ring: 2 }],
  walls: [{ id: 'W1', level: 'G', a: [0, 0], b: [10, 0], t: 0.3, h: 4.2, kind: 'interior' }],
  openings: [{ id: 'O1', wall: 'W1', at: 2, w: 1.2, h: 2.1, sill: 0, type: 'door' }],
  stairs: [],
  ladders: [],
  voids: [],
} as Campus;
const w = d.walls[0] as Wall;
const words = (after: Partial<Wall>): string => describeChange(d, { coll: 'walls', id: 'W1', before: w, after: { ...w, ...after } });

describe('pad hint bar', () => {
  it('shows at most 5 short prompts in every context, each one or two words', () => {
    for (const c of CTXS) {
      const items = hintItems(c, 'pad');
      expect(items.length).toBeLessThanOrEqual(PAD_HINT_MAX);
      for (const i of items) expect(i.name.split(' ').length).toBeLessThanOrEqual(3);
    }
    expect(hintItems('idle', 'pad').map((i) => `${i.keys} ${i.name}`)).toEqual(['A Select', 'Y Menu', 'X Undo', 'LS click Walk', 'Menu Hub']);
    expect(hintItems('drag', 'pad').map((i) => i.keys)).toEqual(['A', 'D-pad', 'RB', 'LB', 'B']);
  });

  it('keeps the full words for the keyboard', () => {
    expect(hintItems('idle', 'keys').find((i) => i.id === 'save')?.name).toMatch(/save the file/);
  });
});

describe('selection card and tool bar words', () => {
  it('titles a wall by its kind, capitalised, once; the id is not in the title', () => {
    expect(cardWords('walls', w)).toEqual({ title: 'Interior wall', size: '10 m long, 0.3 m thick' });
    expect(cardWords('openings', d.openings[0] as Opening)).toEqual({ title: 'Door', size: '1.2 m wide, 2.1 m high' });
    expect(cardWords('rooms', d.rooms[0] as Room)).toEqual({ title: 'Office', size: 'Zone, 10 x 5 m' });
  });

  it('names the door type under the Door slot in words', () => {
    expect(['door', 'double', 'fire-door', 'roller', 'gate'].map(slotDoorName)).toEqual(['Single', 'Double', 'Fire door', 'Roller shutter', 'Gate']);
  });
});

describe('wall change words', () => {
  it('a stretch says the new length', () => {
    expect(words({ b: [12, 0] })).toBe('Moved its end 2 m east; now 12 m long: interior wall (W1, Ground)');
  });
  it('a move says only the move', () => {
    expect(words({ a: [0, 2], b: [10, 2] })).toBe('Moved 2 m north: interior wall (W1, Ground)');
  });
  it('a turn about its middle says turned, not two moves, and no length', () => {
    expect(words({ a: [5, -5], b: [5, 5] })).toBe('Turned 90 degrees: interior wall (W1, Ground)');
  });
  it('a turn about another point says turned and moved', () => {
    expect(words({ a: [0, 0], b: [0, 10] })).toBe('Turned 90 degrees and moved 5 m west, 5 m north: interior wall (W1, Ground)');
  });
});

describe('field changes in plain words (ED3-3a)', () => {
  const ch = (coll: 'walls' | 'openings' | 'rooms', before: object, after: object): string => describeChange(d, { coll, id: (before as { id: string }).id, before: before as Wall, after: after as Wall });
  const o = d.openings[0] as Opening;
  const r = d.rooms[0] as Room;
  it('kind and type changes', () => {
    expect(ch('walls', w, { ...w, kind: 'balustrade' })).toBe('Changed to balustrade wall: balustrade wall (W1, Ground)');
    expect(ch('openings', o, { ...o, type: 'double' })).toBe('Changed to double door: double (O1, Ground)');
    expect(ch('rooms', r, { ...r, kind: 'corridor' })).toBe('Changed to corridor: Office (R1, Ground)');
  });
  it('numbers, flags and names', () => {
    expect(ch('walls', w, { ...w, h: 3.6 })).toBe('Height 4.2 m to 3.6 m: interior wall (W1, Ground)');
    expect(ch('rooms', r, { ...r, ring: 3 })).toBe('Access level 2 to 3: Office (R1, Ground)');
    expect(ch('openings', o, { ...o, locked: true })).toBe('Now locked: door (O1, Ground)');
    expect(ch('openings', { ...o, locked: true }, { ...o, locked: false })).toBe('Now unlocked: door (O1, Ground)');
    expect(ch('rooms', r, { ...r, name: 'Server Room' })).toBe('Name "Office" to "Server Room": Server Room (R1, Ground)');
    expect(ch('walls', w, { ...w, kind: 'parapet' })).not.toMatch(/"/);
  });
});
