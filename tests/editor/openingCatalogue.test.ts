import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardRows, cardWindow, stepCard } from '../../src/editor/card';
import { campusText, EditorModel } from '../../src/editor/model';
import { CATALOGUE, blocksSight, effective, familyTypes, oneWayFromSwing, shownSettings, typeDefaults, withOpeningType } from '../../src/editor/openingCatalogue';
import { newOpening, WALL_KINDS } from '../../src/editor/ops';
import type { Campus, Opening, Room, Wall } from '../../src/editor/types';
import { walkOpenings } from '../../src/world/maps/kestrelDoors';

// a wall along x from 0 to 10 on z 5: the stair below (south), the corridor above (north)
const wall: Wall = { id: 'W1', level: 'G', a: [0, 5], b: [10, 5], t: 0.3, h: 3.3, kind: 'interior' };
const stair: Room = { id: 'ST', level: 'G', name: 'Fire Stair', kind: 'stair', rect: [0, 0, 10, 5], ring: 2 };
const corr: Room = { id: 'CO', level: 'G', name: 'Corridor', kind: 'corridor', rect: [0, 5, 10, 10], ring: 3 };
const yard: Room = { id: 'YD', level: 'G', name: 'Yard', kind: 'yard', rect: [0, 0, 10, 5], ring: 0 };
const rooms = [stair, corr];
const op = (type: string, more: Partial<Opening> = {}): Opening => ({ id: 'O1', wall: 'W1', at: 5, w: 1.2, h: 2.1, sill: 0, type, between: ['CO', 'ST'], ...more });

describe('opening catalogue (ON9 decision 1)', () => {
  it('has every door and window type of the brief, each with a size and a source', () => {
    expect(familyTypes('door')).toEqual(['door', 'fire-door', 'double', 'glass-door', 'slide-auto', 'slide-card', 'slide', 'roller', 'gate', 'slide-gate', 'hatch', 'arch']);
    expect(familyTypes('window')).toEqual(['window', 'window-open', 'window-frosted', 'louvre', 'rooflight']);
    for (const c of CATALOGUE) {
      expect(c.w > 0 && c.h > 0 && c.sill >= 0 && c.src.length > 0, c.id).toBe(true);
      expect(['solid', 'glass', 'mesh', 'none']).toContain(c.leaf);
    }
    // sizes from the facts (scale sheet)
    expect(CATALOGUE.find((c) => c.id === 'door')).toMatchObject({ w: 1.2, h: 2.1 });
    expect(CATALOGUE.find((c) => c.id === 'roller')).toMatchObject({ w: 3, h: 3 });
  });

  it('shows only the settings a type has: no hinge on a sliding door, card level only with a card reader', () => {
    expect(shownSettings(op('slide-auto'), rooms)).not.toContain('hinge');
    expect(shownSettings(op('slide-auto'), rooms)).toContain('stack');
    expect(shownSettings(op('slide-card'), rooms)).toContain('level');
    expect(shownSettings(op('door'), rooms)).not.toContain('level');
    expect(shownSettings(op('door', { door: { reader: 'card' } }), rooms)).toContain('level');
    expect(shownSettings(op('arch'), rooms)).toEqual([]);
    expect(shownSettings(op('window-frosted'), rooms)).toEqual(['glass', 'blinds', 'breakable', 'opens']);
    expect(cardRows('openings', op('slide-card'), { rooms, wall }).map((r) => r.id)).toEqual(['type', 'name', 'w', 'h', 'sill', 'at', 'stack', 'oneWay', 'locked', 'reader', 'level', 'alarmed', 'glass', 'breakable', 'plate', 'id']);
  });

  it('realistic defaults per type', () => {
    const fire = typeDefaults('fire-door', ['CO', 'ST'], rooms);
    expect(fire.door).toMatchObject({ closer: true, oneWay: 'ST', swing: 'CO', alarmed: true });
    const card = typeDefaults('slide-card', ['YD', 'CO'], [yard, corr]);
    expect(card).toMatchObject({ locked: true, door: { reader: 'card', level: 3 }, glass: { kind: 'clear', breakable: true } });
    expect(typeDefaults('slide-auto', ['YD', 'CO'], [yard, corr]).door).toMatchObject({ reader: 'none' });
    expect(typeDefaults('window-frosted', [], []).glass).toEqual({ kind: 'frosted', breakable: true, blinds: 'none', opens: false });
    expect(typeDefaults('window-open', [], []).glass?.opens).toBe(true);
    expect(typeDefaults('roller', [], []).door?.reader).toBe('key-switch');
    expect(typeDefaults('arch', [], [])).toEqual({});
    // a fire door to the yard is free from the inside
    expect(typeDefaults('fire-door', ['YD', 'CO'], [yard, corr]).door).toMatchObject({ oneWay: 'CO', swing: 'YD' });
  });

  it('one-way: the free side is the side the leaf swings away from', () => {
    expect(oneWayFromSwing(['CO', 'ST'], 'CO')).toBe('ST');
    const fire = typeDefaults('fire-door', ['CO', 'ST'], rooms).door!;
    expect(fire.oneWay).toBe(oneWayFromSwing(['CO', 'ST'], fire.swing!));
  });

  it('frosted glass and closed blinds block sight (light passes)', () => {
    expect(blocksSight({ kind: 'frosted' })).toBe(true);
    expect(blocksSight({ kind: 'clear', blinds: 'closed' })).toBe(true);
    expect(blocksSight({ kind: 'clear', blinds: 'half' })).toBe(false);
  });

  it('the card steps settings and flips the type within its family', () => {
    const ctx = { step: 0.1, wallLen: 10, rooms, wall };
    let o = op('slide-card', typeDefaults('slide-card', ['CO', 'ST'], rooms));
    o = stepCard('openings', o, 'level', -1, ctx) as Opening;
    expect(effective(o, rooms).door.level).toBe(2);
    o = stepCard('openings', o, 'reader', 1, ctx) as Opening;
    expect(effective(o, rooms).door.reader).toBe('card-pin');
    expect((stepCard('openings', o, 'type', 1, ctx) as Opening).type).toBe('slide');
    expect((stepCard('openings', op('window'), 'type', -1, ctx) as Opening).type).toBe('rooflight');
    const w = stepCard('openings', op('window'), 'blinds', -1, ctx) as Opening;
    expect(w.glass).toMatchObject({ blinds: 'closed' });
    // swing flips to the other room; hinge left <-> right
    const d = op('door');
    expect((stepCard('openings', d, 'swing', 1, ctx) as Opening).door).toMatchObject({ swing: 'CO' });
    const h = cardRows('openings', d, { rooms, wall }).find((r) => r.id === 'hinge')!.value;
    expect((stepCard('openings', d, 'hinge', 1, ctx) as Opening).door).toMatchObject({ hinge: h === 'Left' ? 'right' : 'left' });
    // a fire door keeps its own one-way when a door flips to it
    expect(withOpeningType(op('door', { door: { swing: 'ST' } }), 'fire-door', rooms).door).toMatchObject({ oneWay: 'ST', swing: 'CO' });
  });

  it('the card shows a window of rows that follows the lit one', () => {
    expect(cardWindow(8, 3)).toEqual([0, 8]);
    expect(cardWindow(16, 0)).toEqual([0, 9]);
    expect(cardWindow(16, 10)).toEqual([6, 15]);
    expect(cardWindow(16, 15)).toEqual([7, 16]);
  });
});

describe('glass partitions (ON9 decision 4)', () => {
  it('a wall kind glass with glass and blinds rows', () => {
    expect(WALL_KINDS).toContain('glass');
    const g = stepCard('walls', { ...wall, kind: 'balustrade' }, 'type', 1, { step: 0.1 }) as Wall;
    expect(g.kind).toBe('glass');
    expect(g.glass).toEqual({ kind: 'clear', blinds: 'none', breakable: true });
    expect(cardRows('walls', g).map((r) => r.label)).toEqual(['Type', 'Name', 'Thickness', 'Height', 'Length', 'Glass', 'Blinds', 'Breakable', 'Id']);
    expect((stepCard('walls', g, 'blinds', -1, { step: 0.1 }) as Wall).glass).toMatchObject({ blinds: 'closed' });
    expect((stepCard('walls', g, 'type', 1, { step: 0.1 }) as Wall).glass).toBeUndefined();
  });
});

describe('schema round trip (ON9 decision 10)', () => {
  it('the campus text is byte-identical with no edits; a new door carries its settings', () => {
    const text = readFileSync('docs/kestrel/kestrel.campus.blocks.json', 'utf8');
    const m = new EditorModel(JSON.parse(text) as Campus);
    expect(campusText(m.data)).toBe(text);
    const w = m.data.walls.find((q) => q.level === 'G' && q.kind === 'exterior')!;
    const o = newOpening(m, w, 3, 'fire-door');
    expect(o.door).toMatchObject({ closer: true });
    expect(JSON.parse(JSON.stringify(o))).toEqual(o);
  });
});

describe('walk test openings (ON9 decision 8)', () => {
  const levels = [{ id: 'G', floor: 0 }];
  it('a hinged door hangs at its hinge end and swings into its room; windows are panes; sliders stay gaps', () => {
    const r = walkOpenings({ levels, rooms, walls: [wall], openings: [op('door'), op('window', { id: 'O2', at: 2, sill: 0.9, h: 1.2 }), op('slide-auto', { id: 'O3', at: 8 })] });
    expect(r.doors).toHaveLength(1);
    const d = r.doors[0]!;
    // absent hinge: the a end (x 4.4); toward ST (south, z < 5): the leaf turns so its tip heads to -z
    expect(d.hinge).toEqual([4.4, 0, 5]);
    expect(d.width).toBeCloseTo(1.2);
    const open = d.yaw + d.swing * 0.5;
    expect(Math.cos(open)).toBeLessThan(0);
    expect(r.panes).toEqual([{ id: 'O2', c: [2, 1.5, 5], w: 1.2, h: 1.2, yaw: -0, breakable: true }]);
    expect(r.drGaps).toBe(1);
    // the other hinge side; a double is two half leaves
    const right = walkOpenings({ levels, rooms, walls: [wall], openings: [op('door', { door: { hinge: 'left' } }), op('double', { id: 'O4', at: 8, w: 1.8 })] });
    expect(right.doors.map((q) => q.hinge[0])).toEqual([5.6, 7.1, 8.9]);
  });
});
