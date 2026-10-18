import { describe, expect, it } from 'vitest';
import { campusText, EditorModel } from '../../src/editor/model';
import { autoPlates, placeSign, plateColour, plateDefault, platePlace, signId, signRows, signTexts, stepSign, walkPanels } from '../../src/editor/signs';
import type { SignRecord } from '../../src/editor/signs';
import { SIGN_KINDS, signFace } from '../../src/editor/signCatalogue';
import { levelColour } from '../../src/editor/securityCatalogue';
import type { Campus, Opening, Room, Wall } from '../../src/editor/types';

function site(): Campus {
  const room = (id: string, rect: [number, number, number, number], name: string, kind = 'room'): Room => ({ id, level: 'G', name, kind, rect, ring: 2 });
  const wall = (id: string, a: [number, number], b: [number, number], level = 'G'): Wall => ({ id, level, a, b, t: 0.3, h: 4.2, kind: 'interior' });
  const door = (id: string, w: string, at: number, between: string[], extra: Partial<Opening> = {}): Opening => ({ id, wall: w, at, w: 1, h: 2.1, sill: 0, type: 'door', between, ...extra });
  return {
    meta: { id: 't', buildings: [{ id: 'A', name: 'Building A', footprint: [-1, -5, 20, 10] }, { id: 'B', name: 'Building B', footprint: [30, 0, 50, 10] }] },
    levels: [{ id: 'G', name: 'Ground', floor: 0, height: 4.2 }, { id: 'F', name: 'First', floor: 4.2, height: 4.2 }],
    rooms: [room('OF', [0, 0, 4, 3], 'Duty Office'), room('CO', [0, -2, 12, 0], 'Corridor', 'corridor'), room('ST', [4, 0, 8, 3], 'Store'), room('F1', [0, 0, 4, 3], 'Upper')],
    walls: [wall('S', [0, 0], [12, 0]), wall('M', [4, 0], [4, 3]), wall('U', [0, 0], [4, 0], 'F')],
    openings: [door('D1', 'S', 2, ['OF', 'CO']), door('D2', 'S', 6, ['ST', 'CO'], { door: { level: 3 }, plate: 'Store' } as Partial<Opening>), door('D3', 'M', 1.5, ['OF', 'ST'], { door: { swing: 'ST' } } as Partial<Opening>), { id: 'WN', wall: 'S', at: 10, w: 1, h: 1, sill: 1, type: 'window', between: ['', 'CO'] }, door('D4', 'U', 2, ['F1', ''])],
    stairs: [],
    ladders: [],
    voids: [],
  } as Campus;
}

describe('ON14 door name plates (decisions 5, 9, 10)', () => {
  it('a plate names the room the door opens into: not the corridor; between two rooms, where it swings', () => {
    const d = site();
    expect(plateDefault(d, d.openings[0]!)).toBe('Duty Office');
    expect(plateDefault(d, d.openings[2]!)).toBe('Store');
    expect(plateDefault(d, { ...d.openings[2]!, door: {} })).toBe('Store');
    expect(plateDefault(d, { ...d.openings[2]!, between: ['OF', 'ST'], door: { swing: 'OF' } })).toBe('Duty Office');
  });

  it('the plate shows the card level colour, on the corridor face beside the latch at 1.5 m', () => {
    const d = site();
    expect(plateColour(d.openings[1]!)).toBe(levelColour(3));
    expect(plateColour(d.openings[0]!)).toBe(levelColour(0));
    const p = platePlace(d, d.openings[0]!)!;
    expect(p.y).toBe(1.5);
    // the corridor is south (z < 0): the plate faces south, beside the latch (the b end, east)
    expect(p.facing).toBe(180);
    expect(p.at[1]).toBeLessThan(0);
    expect(p.at[0]).toBeGreaterThan(2.5);
  });

  it('auto plates: every door on a level without one, windows and plated doors skipped, one edit', () => {
    const d = site();
    const r = autoPlates(d, { level: 'G' });
    expect(r.added).toBe(2);
    expect(r.had).toBe(1);
    const m = new EditorModel(d);
    m.commit('plates', r.changes);
    expect((m.get('openings', 'D1') as Opening).plate).toBe('Duty Office');
    expect((m.get('openings', 'WN') as Opening).plate).toBeUndefined();
    expect(autoPlates(m.data, { level: 'G' }).added).toBe(0);
    expect(autoPlates(site(), { building: 'A' }).added).toBe(3);
    expect(autoPlates(site(), { building: 'B' }).added).toBe(0);
  });
});

describe('ON14 signs (decisions 6, 7)', () => {
  it('the text list comes from the buildings and rooms, never the corridors', () => {
    const t = signTexts(site());
    expect(t.slice(0, 3)).toEqual(['Building A', 'Building B', 'Exit']);
    expect(t).toContain('Duty Office');
    expect(t).not.toContain('Corridor');
    expect(signFace('Building B', 'right')).toBe('Building B →');
  });

  it('places on a wall face, or hangs under the ceiling; a safety sign only goes on a wall', () => {
    const d = site();
    const w = placeSign(d, 'direction', 'G', 6, -0.4, 0.1, 0);
    expect(w.sign?.wall).toBe('S');
    expect(w.sign?.facing).toBe(180);
    expect(w.sign?.y).toBe(1.8);
    const h = placeSign(d, 'direction', 'G', 6, -1.5, 0.1, 0, 'Building B', 'right');
    expect(h.sign?.hang).toBe(true);
    expect(h.sign?.text).toBe('Building B');
    // ceiling 4.2 - 0.3 slab = 3.9, less 0.1, less half of 0.2
    expect(h.sign!.y).toBeCloseTo(3.7, 3);
    expect(placeSign(d, 'cctv', 'G', 6, -1.5, 0.1, 0).why).toMatch(/wall/);
  });

  it('a sign record round-trips through the file and steps on its card', () => {
    const d = site();
    const s = { ...placeSign(d, 'direction', 'G', 6, -1.5, 0.1, 0, 'Building B', 'right').sign!, id: signId(d) } as SignRecord;
    expect(s.id).toBe('SG-1');
    d.signs = [s];
    const back = JSON.parse(campusText(d)) as Campus;
    expect(back.signs).toEqual([s]);
    expect(signRows(s).map((r) => r.id)).toEqual(['type', 'text', 'arrow', 'y', 'width', 'id']);
    expect(stepSign(d, s, 'arrow', 1, 0.1)!.arrow).toBe('ahead');
    const t = stepSign(d, s, 'type', 1, 0.1)!;
    expect(t.kind).toBe('room-sign');
    expect(signRows({ ...s, kind: 'cctv' }).map((r) => r.id)).not.toContain('text');
    expect(SIGN_KINDS.every((k) => k.src.length > 0)).toBe(true);
  });

  it('the walk test gets every plate and sign as a thin panel at its height', () => {
    const d = site();
    d.signs = [{ ...placeSign(d, 'exit', 'G', 6, -0.4, 0.1, 0).sign!, id: 'SG-1' }];
    const p = walkPanels(d);
    expect(p).toHaveLength(2);
    expect(p[0]!.s[2]).toBe(0.02);
    expect(p[0]!.c[1]).toBe(1.5);
    expect(p[1]!.colour).toBe('#1b8a3a');
  });
});
