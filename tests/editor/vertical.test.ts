import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { campusText, EditorModel } from '../../src/editor/model';
import { deleteChanges } from '../../src/editor/ops';
import { addLevel, deleteLevel, duplicateLevel, idProblem, levelIdFor, outlineWarnings, refCount, renameChanges, storeyChange, wallsAtHeight, moveBuildingEdge } from '../../src/editor/levels';
import { fitStair, levelAbove, proposeLadder, proposeStair, stairFit, STAIR_FACTS, stairwellLink, turnClimb, wellOf, withStairType } from '../../src/editor/vertical';
import type { Campus, Stair, Void } from '../../src/editor/types';
import { stairLayout, stairSize, stairSplit } from '../../src/world/maps/stairs';

const CAMPUS = 'docs/kestrel/kestrel.campus.blocks.json';
const load = (): Campus => JSON.parse(readFileSync(CAMPUS, 'utf8')) as Campus;
const facts = JSON.parse(readFileSync('scripts/kestrel/facts.json', 'utf8')) as Record<string, Record<string, { value: number }>>;
const fact = (g: string, k: string): number => facts[g]![k]!.value;

/** A model with the stairwell link, as the editor runs it. */
function model(d: Campus): EditorModel {
  const m = new EditorModel(d);
  m.link = stairwellLink;
  return m;
}

describe('stair sizing (shared A11 function)', () => {
  it('reads every size from facts.json', () => {
    expect(STAIR_FACTS.riserHeight).toBe(fact('stair', 'riserHeight'));
    expect(STAIR_FACTS.going).toBe(fact('stair', 'going'));
    expect(STAIR_FACTS.midLanding).toBe(fact('stair', 'midLanding'));
    expect(STAIR_FACTS.fireLanding).toBe(fact('stair', 'fireLanding'));
    expect(STAIR_FACTS.mainWidth).toBe(fact('stair', 'mainWidth'));
  });

  it('a 4.2 m storey is 25 risers (progress.md Decisions), 13 + 12 in a dogleg', () => {
    const main = stairSize({ rise: 4.2, kind: 'main', layout: 'dogleg' }, STAIR_FACTS);
    expect(main.risers).toBe(25);
    expect(main.perFlight).toBe(13);
    expect(stairSplit(25, 'dogleg', STAIR_FACTS.maxRisersPerFlight)).toEqual([13, 12]);
    // A11: (ceil(risers / 2) - 1) * going + landing long, two flights wide
    expect(main.length).toBeCloseTo(12 * STAIR_FACTS.going + STAIR_FACTS.midLanding, 6);
    expect(main.across).toBeCloseTo(2 * STAIR_FACTS.mainWidth, 6);
    const fire = stairSize({ rise: 4.2, kind: 'fire', layout: 'dogleg' }, STAIR_FACTS);
    expect(fire.length).toBeCloseTo(12 * STAIR_FACTS.going + STAIR_FACTS.fireLanding, 6);
    expect(fire.across).toBeCloseTo(2 * STAIR_FACTS.fireWidth, 6);
  });

  it('a straight run takes the fewest flights under the per-flight maximum, with mid landings', () => {
    const s = stairSize({ rise: 4.2, kind: 'main', layout: 'straight' }, STAIR_FACTS);
    expect(s.flights).toBe(2);
    expect(s.perFlight).toBeLessThanOrEqual(STAIR_FACTS.maxRisersPerFlight);
    expect(s.length).toBeCloseTo((25 - 2) * STAIR_FACTS.going + STAIR_FACTS.midLanding, 6);
    expect(s.across).toBe(STAIR_FACTS.mainWidth);
    const low = stairSize({ rise: 2.4, kind: 'main', layout: 'straight' }, STAIR_FACTS);
    expect(low.flights).toBe(1);
    expect(low.landing).toBe(0);
  });

  it('the campus stairs all fit their rects by the rule the checker uses', () => {
    const d = load();
    for (const s of d.stairs) {
      const f = stairFit(d, s);
      expect(f.size?.risers, s.id).toBe(s.risers);
      if (s.layout === 'dogleg') expect(f.ok, `${s.id} ${f.words}`).toBe(true);
    }
  });
});

describe('the Stair tool', () => {
  it('proposes the smallest legal dogleg from the corner, the way the dot points, to the level above', () => {
    const d = load();
    const p = proposeStair(d, 'G', [10, 10], [10.2, 14], 'main-dogleg', 'V-STAIR1', 0.1);
    if ('why' in p) throw new Error(p.why);
    expect(p.stair.from).toBe('G');
    expect(p.stair.to).toBe('F');
    expect(p.stair.up).toBe('N');
    expect(p.stair.layout).toBe('dogleg');
    expect(p.stair.risers).toBe(25);
    const [x0, z0, x1, z1] = p.stair.rect;
    expect([x0, z0]).toEqual([10, 10]);
    expect(z1 - z0).toBeGreaterThanOrEqual(p.size.length - 1e-9);
    expect(z1 - z0).toBeLessThan(p.size.length + 0.1);
    expect(x1 - x0).toBeCloseTo(3.7, 6);
    expect(stairFit(d, p.stair).ok).toBe(true);
    expect(p.words).toContain('25 risers');
    // west and south from the corner
    const w = proposeStair(d, 'G', [10, 10], [5, 9], 'fire-dogleg', 'V-STAIR1', 0.1);
    if ('why' in w) throw new Error(w.why);
    expect(w.stair.up).toBe('W');
    expect(w.stair.rect[2]).toBe(10);
    expect(w.stair.rect[3]).toBe(10);
  });

  it('says why when there is no level above', () => {
    const d = load();
    const top = d.levels.slice().sort((a, b) => b.floor - a.floor)[0]!;
    expect(levelAbove(d, top.id)).toBeUndefined();
    expect('why' in proposeStair(d, top.id, [0, 0], [0, 5], 'main-dogleg', 'X', 0.1)).toBe(true);
  });

  it('too short says by how much; Fit resizes from the corner it was drawn from', () => {
    const d = load();
    const p = proposeStair(d, 'G', [10, 10], [10, 14], 'main-dogleg', 'V-STAIR1', 0.1);
    if ('why' in p) throw new Error(p.why);
    const short: Stair = { ...p.stair, rect: [10, 10, 13.7, 14] };
    const f = stairFit(d, short);
    expect(f.ok).toBe(false);
    expect(f.words).toMatch(/^Needs 1\.42 m more length for 25 risers/);
    const fit = fitStair(d, short, 0.1)!;
    expect(fit.rect).toEqual(p.stair.rect);
    expect(fitStair(d, fit, 0.1)).toBeNull();
    // a stair climbing west keeps its east (foot) edge
    const west: Stair = { ...p.stair, up: 'W', rect: [20, 10, 22, 12] };
    const fw = fitStair(d, west, 0.1)!;
    expect(fw.rect[2]).toBe(22);
    expect(fw.rect[1]).toBe(10);
  });

  it('the type change keeps the risers and takes the kind width', () => {
    const d = load();
    const s = d.stairs.find((q) => q.id === 'V-ASTAIR')!;
    const t = withStairType(s, 'fire-dogleg');
    expect(t.kind).toBe('fire');
    expect(t.width).toBe(STAIR_FACTS.fireWidth);
    expect(t.risers).toBe(s.risers);
    expect(withStairType(s, 'main-straight').layout).toBeUndefined();
    expect(turnClimb(s).up).toBe('N');
  });
});

describe('stair and stairwell kept in step', () => {
  it('a new stair makes its well; move, resize and delete take it along; undo puts back the file exactly', () => {
    const d = load();
    const text = campusText(d);
    const m = model(d);
    const p = proposeStair(d, 'G', [10, 10], [10, 14], 'main-dogleg', 'V-STAIR1', 0.1);
    if ('why' in p) throw new Error(p.why);
    m.commit('add', [{ coll: 'stairs', id: p.stair.id, before: null, after: p.stair }]);
    const well = wellOf(m.data, p.stair)!;
    expect(well.level).toBe('F');
    expect(well.kind).toBe('stairwell');
    // move
    const s0 = m.snapshot<Stair>('stairs', 'V-STAIR1')!;
    const moved = { ...s0, rect: s0.rect.map((v, i) => v + (i % 2 ? 0 : 2)) as Stair['rect'] };
    m.commit('move', [{ coll: 'stairs', id: s0.id, before: s0, after: moved }]);
    expect(m.get<Void>('voids', well.id)!.rect).toEqual(moved.rect);
    // resize (preview while dragging, then commit)
    const big = { ...moved, rect: [moved.rect[0], moved.rect[1], moved.rect[2] + 1, moved.rect[3]] as Stair['rect'] };
    m.preview('stairs', big);
    expect(m.get<Void>('voids', well.id)!.rect).toEqual(big.rect);
    m.commit('resize', [{ coll: 'stairs', id: s0.id, before: moved, after: big }]);
    expect(m.get<Void>('voids', well.id)!.rect).toEqual(big.rect);
    // delete
    m.commit('delete', deleteChanges(m, 'stairs', s0.id));
    expect(m.get('voids', well.id)).toBeUndefined();
    for (let i = 0; i < 4; i++) m.undo();
    expect(campusText(m.data)).toBe(text);
  });

  it('moving a campus stair moves its well and nothing else', () => {
    const d = load();
    const m = model(d);
    const s = m.snapshot<Stair>('stairs', 'V-ASTAIR')!;
    const well = wellOf(d, s)!;
    const after = { ...s, rect: [s.rect[0], s.rect[1] + 1, s.rect[2], s.rect[3] + 1] as Stair['rect'] };
    m.commit('move', [{ coll: 'stairs', id: s.id, before: s, after }]);
    const edit = m.history[m.history.length - 1]!;
    expect(edit.changes.map((c) => `${c.coll}:${c.id}`)).toEqual(['stairs:V-ASTAIR', `voids:${well.id}`]);
  });
});

describe('ladders', () => {
  it('a ladder on a wall faces it, from the editing level to the one above, with the climb in words', () => {
    const d = load();
    const w = d.walls.find((q) => q.level === 'G' && q.a[1] === q.b[1] && Math.abs(q.a[0] - q.b[0]) > 4)!;
    const mx = (w.a[0] + w.b[0]) / 2;
    const p = proposeLadder(d, 'G', [mx, w.a[1] - 0.6], 'LD-NEW1', 0.1, 1.2);
    if ('why' in p) throw new Error(p.why);
    expect(p.ladder.from).toBe('G');
    expect(p.ladder.to).toBe('F');
    expect(p.ladder.facing).toBe('N');
    expect(p.ladder.at[1]).toBeLessThan(w.a[1]);
    expect(p.words).toContain('climbs 4.2 m to First');
    expect(p.words).toContain('beyond jump-grab reach');
  });
});

describe('levels', () => {
  it('add a level above the roof and delete it: the file is byte-identical after undo', () => {
    const d = load();
    const text = campusText(d);
    const m = model(d);
    const add = addLevel(m.data, 'R', 'above', 'Roof Plant')!;
    m.commit(add.words, add.changes);
    const l = m.get('levels', add.id!)!;
    expect(l).toMatchObject({ floor: 8.4 + 1.1, height: 1.1 });
    expect(m.data.levels[m.data.levels.length - 1]!.id).toBe(add.id);
    const del = deleteLevel(m.data, add.id!)!;
    m.commit(del.words, del.changes);
    expect(m.get('levels', add.id!)).toBeUndefined();
    m.undo();
    m.undo();
    expect(campusText(m.data)).toBe(text);
  });

  it('adding a level above Ground moves every level at or above First up a storey and keeps floor order', () => {
    const d = load();
    const add = addLevel(d, 'G', 'above', 'Mezzanine')!;
    const m = model(d);
    m.commit(add.words, add.changes);
    const floors = m.data.levels.map((l) => l.floor);
    expect(floors).toEqual(floors.slice().sort((a, b) => a - b));
    expect(m.get('levels', 'F')).toMatchObject({ floor: 8.4 });
    expect(m.get('levels', 'B')).toMatchObject({ floor: -3.6 });
    expect(levelIdFor(d, 'First')).not.toBe('F');
  });

  it('deleting a level lists and removes everything on it (and the wells of stairs from it)', () => {
    const d = load();
    const del = deleteLevel(d, 'F')!;
    expect(del.words).toMatch(/^Deleted level First \(F\) with \d+ doors and windows, \d+ walls, \d+ rooms, \d+ stairs/);
    const m = model(d);
    m.commit(del.words, del.changes);
    expect(m.data.rooms.some((r) => r.level === 'F')).toBe(false);
    expect(m.data.stairs.some((s) => s.from === 'F' || s.to === 'F')).toBe(false);
    expect(m.data.voids.some((v) => v.level === 'F')).toBe(false);
    // the fire stairs F to R had their wells on R
    expect(m.data.voids.some((v) => v.level === 'R' && v.kind === 'stairwell' && v.reason?.toString().includes('F'))).toBe(false);
  });

  it('duplicate a level one storey up: fresh ids, equal counts, openings on the new walls', () => {
    const d = load();
    const dup = duplicateLevel(d, 'R', 'Second Roof')!;
    const m = model(d);
    m.commit(dup.words, dup.changes);
    const to = dup.id!;
    const count = (lv: string): number[] => {
      const walls = new Set(m.data.walls.filter((w) => w.level === lv).map((w) => w.id));
      return [m.data.rooms.filter((r) => r.level === lv).length, walls.size, m.data.openings.filter((o) => walls.has(o.wall)).length, m.data.voids.filter((v) => v.level === lv).length];
    };
    expect(count(to)).toEqual(count('R'));
    expect(count(to)[0]).toBeGreaterThan(0);
    for (const k of ['rooms', 'walls', 'openings', 'voids'] as const) {
      const ids = m.data[k].map((e) => e.id);
      expect(new Set(ids).size, k).toBe(ids.length);
    }
    expect(m.get('levels', to)).toMatchObject({ floor: 9.5 });
  });

  it('a storey change moves the levels above and stretches only the walls that matched the old height', () => {
    const d = load();
    const at42 = wallsAtHeight(d, 'G', 4.2);
    const other = d.walls.filter((w) => w.level === 'G' && Math.abs(w.h - 4.2) > 1e-6).map((w) => [w.id, w.h] as const);
    expect(at42).toBeGreaterThan(0);
    const m = model(d);
    const e = storeyChange(d, 'G', 4.5, true)!;
    m.commit(e.words, e.changes);
    expect(m.get('levels', 'G')).toMatchObject({ height: 4.5 });
    expect(m.get('levels', 'F')).toMatchObject({ floor: 4.5 });
    expect(m.get('levels', 'R')).toMatchObject({ floor: 8.7 });
    expect(m.get('levels', 'B')).toMatchObject({ floor: -3.6 });
    expect(wallsAtHeight(m.data, 'G', 4.5)).toBe(at42);
    for (const [id, h] of other) expect(m.get('walls', id)).toMatchObject({ h });
    // the ground to first stairs now climb 4.5 m: the rule's risers
    expect(m.get<Stair>('stairs', 'V-ASTAIR')!.risers).toBe(Math.round(4.5 / STAIR_FACTS.riserHeight));
    expect(e.words).toContain(`${at42} walls stretched`);
    // without stretching, no wall changes
    const n = storeyChange(load(), 'G', 4.5, false)!;
    expect(n.changes.some((c) => c.coll === 'walls')).toBe(false);
  });
});

describe('renaming ids', () => {
  const total = (d: Campus): number => d.walls.reduce((n, w) => n + refCount(d, 'walls', w.id), 0) + d.rooms.reduce((n, r) => n + refCount(d, 'rooms', r.id), 0) + d.levels.reduce((n, l) => n + refCount(d, 'levels', l.id), 0);

  it('a wall rename updates its openings, in one edit', () => {
    const d = load();
    const o = d.openings[0]!;
    const before = refCount(d, 'walls', o.wall);
    expect(before).toBeGreaterThan(0);
    const m = model(d);
    m.commit(`Renamed ${o.wall} to WG999`, renameChanges(d, 'walls', o.wall, 'WG999'));
    expect(refCount(m.data, 'walls', 'WG999')).toBe(before);
    expect(refCount(m.data, 'walls', o.wall)).toBe(0);
    expect(m.get('walls', 'WG999')).toBeDefined();
  });

  it('a room and a level rename move every reference (counted on the real campus file); undo restores the file', () => {
    const d = load();
    const text = campusText(d);
    const all = total(d);
    const room = d.ladders.find((l) => l.room)!.room!;
    const roomRefs = refCount(d, 'rooms', room);
    const fRefs = refCount(d, 'levels', 'F');
    expect(fRefs).toBeGreaterThan(50);
    const m = model(d);
    m.commit('r', renameChanges(m.data, 'rooms', room, 'X-ROOM'));
    m.commit('l', renameChanges(m.data, 'levels', 'F', 'Q'));
    expect(refCount(m.data, 'rooms', 'X-ROOM')).toBe(roomRefs);
    expect(refCount(m.data, 'levels', 'Q')).toBe(fRefs);
    expect(refCount(m.data, 'levels', 'F')).toBe(0);
    expect(total(m.data)).toBe(all);
    // the stairs' wells still match their stairs
    for (const s of m.data.stairs.filter((q) => q.to === 'Q')) expect(wellOf(m.data, s), s.id).toBeDefined();
    m.undo();
    m.undo();
    expect(campusText(m.data)).toBe(text);
  });

  it('a taken or empty id is refused; an odd style is a warning', () => {
    const d = load();
    expect(idProblem(d, 'walls', 'WG003', d.walls[1]!.id).block).toBe(true);
    expect(idProblem(d, 'walls', 'WG003', '').block).toBe(true);
    expect(idProblem(d, 'walls', 'WG003', 'wg new')).toMatchObject({ block: false });
    expect(idProblem(d, 'walls', 'WG003', 'wg new').text).toContain('style');
    expect(idProblem(d, 'walls', 'WG003', 'WG500').text).toBe('');
    expect(idProblem(d, 'levels', 'F', 'First').text).toContain('style');
  });
});

describe('building outlines', () => {
  it('edges move by a step; the RULES 2 caps warn, never block', () => {
    const d = load();
    expect(outlineWarnings(d)).toEqual([]);
    const m = model(d);
    m.commit('e', moveBuildingEdge(d, 'B', 'E', 1, 0.1));
    expect(m.data.meta.buildings!.find((b) => b.id === 'B')!.footprint[2]).toBe(101);
    expect(outlineWarnings(m.data)).toEqual(['Building B is 49 x 30 m, over the 48 x 30 m limit']);
  });
});

describe('the shared layout', () => {
  it('a dogleg splits 13 + 12 and reaches the upper floor; the editor and the game read the same flights', () => {
    const d = load();
    const s = d.stairs.find((q) => q.id === 'V-ASTAIR')!;
    const lay = stairLayout(d, s);
    expect(lay.flights.map((f) => f.steps)).toEqual([13, 12]);
    expect(lay.flights[1]!.y + lay.flights[1]!.rise).toBeCloseTo(4.2, 6);
  });

  it('a straight run with two flights has a mid landing', () => {
    const d = load();
    const s = d.stairs.find((q) => q.id === 'V-GAL')!;
    const lay = stairLayout(d, s);
    expect(lay.flights.length).toBe(2);
    expect(lay.landings.length).toBe(1);
    expect(lay.flights.reduce((n, f) => n + f.steps, 0)).toBe(s.risers);
  });
});

describe('the card and the 3D cut (ON2)', () => {
  it('the stair card steps its type and its To level (risers follow); a floor hole steps its kind; ids type in capitals', async () => {
    const { stepCard, typeKey } = await import('../../src/editor/card');
    const { cutRect } = await import('../../src/editor/geometry');
    const d = load();
    const s = d.stairs.find((q) => q.id === 'V-ASTAIR')!;
    expect((stepCard('stairs', s, 'type', 1, { step: 0.1 }) as Stair).kind).toBe('fire');
    const up = stepCard('stairs', s, 'to', 1, { step: 0.1, levels: d.levels }) as Stair;
    expect(up.to).not.toBe('F');
    expect(up.risers).toBe(Math.round((d.levels.find((l) => l.id === up.to)!.floor - 0) / STAIR_FACTS.riserHeight));
    const v = d.voids[0]!;
    expect((stepCard('voids', v, 'type', 1, { step: 0.1 }) as Void).kind).not.toBe(v.kind);
    expect(typeKey('WG', 'A', true)).toBe('WGA');
    expect(typeKey('WG', 'Space', true)).toBe('WG');
    expect(typeKey('Wg', 'A')).toBe('Wga');
    // a floor hole cuts the room floor into the pieces round it
    const parts = cutRect([0, 0, 10, 10], [[4, 4, 6, 6]]);
    expect(parts.reduce((a, r) => a + (r[2] - r[0]) * (r[3] - r[1]), 0)).toBeCloseTo(96, 6);
    expect(cutRect([0, 0, 10, 10], [])).toEqual([[0, 0, 10, 10]]);
  });
});

describe('the Levels tab rows (ON2)', () => {
  it('lists the level actions after the levels, and the outline edges with their warnings when on', async () => {
    const { hubRows, DEFAULT_SETTINGS } = await import('../../src/editor/hub');
    const base = { unsaved: 0, changes: [], problems: [], levels: [{ id: 'G', name: 'Ground', floor: '0', editing: true }], view: {} as never, settings: DEFAULT_SETTINGS };
    const panel = { id: 'G', name: 'Ground', height: 4.2, pending: 4.5, outlines: false, buildings: [{ id: 'A', rect: [4, 30, 40, 60], size: '36 x 30 m (limit 48 x 30)' }], warnings: ['Building A is 49 x 30 m, over the 48 x 30 m limit'], limits: 'Limits' };
    const ids = hubRows('Levels', { ...base, levelPanel: panel }).map((r) => r.id);
    expect(ids).toEqual(['level.G', 'lv.height', 'lv.addAbove', 'lv.addBelow', 'lv.dup', 'lv.rename', 'lv.renameId', 'lv.delete', 'lv.outlines']);
    const h = hubRows('Levels', { ...base, levelPanel: panel }).find((r) => r.id === 'lv.height')!;
    expect([h.value, h.note]).toEqual(['4.5 m', 'A applies (was 4.2 m); the levels above move']);
    const on = hubRows('Levels', { ...base, levelPanel: { ...panel, outlines: true } });
    expect(on.filter((r) => r.id.startsWith('bo.A.')).map((r) => r.value)).toEqual(['x 4', 'z 30', 'x 40', 'z 60']);
    expect(on.at(-1)).toMatchObject({ kind: 'line', fresh: true });
    expect(hubRows('Levels', base).map((r) => r.id)).toEqual(['level.G']);
  });
});
