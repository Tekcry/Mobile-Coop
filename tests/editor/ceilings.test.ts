import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import facts from '../../scripts/kestrel/facts.json';
import { addHatch, ceilingOf, ceilingWords, crawlEnd, crawlId, crawlRows, crawlWords, CRAWL_RULE, dragCrawl, extendCrawl, hatchesFor, hatchReach, newCrawl, RULE_BAD, RULE_OK, ruleColour, settleCrawl, snapHatch, soffitOver, stepCeiling, stepCrawl, voidOf } from '../../src/editor/ceilings';
import type { Ceiling, CrawlRecord } from '../../src/editor/ceilings';
import { cardRows, stepCard } from '../../src/editor/card';
import { campusText, EditorModel } from '../../src/editor/model';
import { deleteChanges } from '../../src/editor/ops';
import type { Campus, Elem, Room } from '../../src/editor/types';
import { BUILD_MIN, ceilingBoxes, ceilingType, crawlBoxes, CRAWL_BOARD, rectMinus } from '../../src/world/maps/kestrelCeilings';
import { campusToBuild } from '../../src/world/maps/kestrelCampus';
import type { CampusFile } from '../../src/world/maps/kestrelCampus';
import { CANON_MIN_THICK } from '../../src/voxel/lightShapes';
import { MOVE_MODES } from '../../src/player/moveState';

const room = (id: string, level: string, rect: [number, number, number, number], ceiling: number, kind = 'room'): Room => ({ id, level, name: id, kind, rect, ceiling, finish: '', minShort: 3, open: [], ring: 2 });

/** Ground with a corridor under a first floor, a vent at the corridor's east end. */
function campus(): Campus {
  return {
    meta: { id: 't', site: [0, 0, 60, 60], buildings: [{ id: 'A', footprint: [0, 0, 30, 20] }], entry: [1, 1] },
    levels: [
      { id: 'G', name: 'Ground', floor: 0, height: 4.2 },
      { id: 'F', name: 'First', floor: 4.2, height: 4.2 },
    ],
    rooms: [room('G-COR', 'G', [4, 10, 22, 13.5], 2.4, 'corridor'), room('G-OFF', 'G', [4, 0, 22, 10], 0), room('F-ALL', 'F', [0, 0, 30, 20], 0, 'zone')],
    walls: [],
    openings: [],
    stairs: [],
    ladders: [],
    voids: [],
    exterior: [{ id: 'E001', kind: 'vent', a: [22, 12], b: [22, 12], y0: 2.6, y1: 3.2, climbable: false, reason: '', level: 'G', facing: 'E', size: [0.6, 0.6] }],
  } as unknown as Campus;
}

describe('ON13 ceiling voids', () => {
  it('the clear height is the slab underside less the ceiling and its thickness', () => {
    const d = campus();
    const c = ceilingOf(d.rooms[0]!);
    expect(soffitOver(d, c).soffit).toBeCloseTo(4.2 - facts.room.slab.value, 6);
    const v = voidOf(d, c)!;
    // a grid ceiling (corridor default) 20 mm thick at 2.4 under the 3.9 soffit
    expect(ceilingType(c).id).toBe('grid');
    expect(v.y0).toBeCloseTo(2.42, 6);
    expect(v.clear).toBeCloseTo(3.9 - 2.42, 6);
    expect(v.ok).toBe(false);
    expect(v.colour).toBe(RULE_BAD);
    const lower = voidOf(d, { ...c, ceiling: 2.3 })!;
    expect(lower.clear).toBeCloseTo(1.58, 6);
    expect(lower.colour).toBe(RULE_OK);
    // no void over an open ceiling or an exposed slab; the roof (nothing above) is the level top less a slab
    expect(voidOf(d, { ...c, ceilingType: 'slab' })).toBeNull();
    expect(voidOf(d, { ...c, ceiling: 0 })).toBeNull();
    expect(soffitOver({ ...d, rooms: d.rooms.filter((r) => r.level === 'G') }, c).soffit).toBeCloseTo(4.2 - facts.room.slab.value, 6);
  });

  it('the crawl rule colours come from the fact', () => {
    expect(CRAWL_RULE).toBe(facts.duct.crouchHeight.value);
    expect(ruleColour(facts.duct.crouchHeight.value)).toBe(RULE_OK);
    expect(ruleColour(facts.duct.crouchHeight.value - 0.01)).toBe(RULE_BAD);
  });

  it('the ceiling card steps type, height and hatches', () => {
    const d = campus();
    const c = ceilingOf(d.rooms[0]!);
    expect(cardRows('ceilings', c as Elem).map((r) => r.id)).toEqual(['type', 'height', 'hatches']);
    const open = stepCeiling(d, c, 'type', -1, 0.1)!;
    expect(open.ceiling).toBe(0);
    // from none the corridor default comes back
    const back = stepCeiling(d, open, 'height', 1, 0.1)!;
    expect(back.ceiling).toBe(facts.ceiling.corridor.value);
    // below the minimum: none; never above the slab's underside
    expect(stepCeiling(d, { ...c, ceiling: facts.ceiling.min.value }, 'height', -1, 0.1)!.ceiling).toBe(0);
    expect(stepCeiling(d, { ...c, ceiling: 3.9 }, 'height', 1, 0.1)).toBeNull();
    const h = stepCard('ceilings', c as Elem, 'hatches', 1, { step: 0.1, data: d, dot: [10.13, 11] }) as Ceiling;
    expect(h.hatches).toEqual([[10.3, 10.9]]);
    expect(ceilingWords(d, h)).toContain('any tile lifts (1 marked)');
  });
});

describe('ON13 hatches on grid tiles', () => {
  it('a hatch on a grid ceiling is the whole tile under the point', () => {
    const c = ceilingOf(room('C', 'G', [4, 40, 40, 43.5], 2.4, 'corridor'));
    expect(snapHatch(c, [10.13, 41.0])).toEqual([10.3, 40.9]);
    // a point past the last whole tile (5 fit in 3.5 m) takes the last one
    expect(snapHatch(c, [4.01, 43.45])).toEqual([4.3, 42.7]);
    // twice on the same tile is refused
    const one = addHatch(c, [10.13, 41.0])!;
    expect(addHatch(one, [10.2, 40.8])).toBeNull();
    expect(addHatch(one, [11.0, 40.8])!.hatches!.length).toBe(2);
  });

  it('plasterboard takes an access hatch on the 0.1 m grid, inside the room', () => {
    const c = ceilingOf({ ...room('C', 'G', [0, 0, 5, 4], 2.7), ceilingType: 'plasterboard' });
    expect(snapHatch(c, [2.04, 1.96])).toEqual([2, 2]);
    expect(snapHatch(c, [0.05, 3.99])).toEqual([0.3, 3.7]);
  });

  it('what the player can do at a hatch follows the mantle and grab reach', () => {
    expect(hatchReach(1.7)).toContain('mantle');
    expect(hatchReach(2.42)).toContain('grab the edge');
    expect(hatchReach(3.0)).toContain('jump');
    expect(hatchReach(3.5)).toContain('ladder');
  });
});

describe('ON13 crawl spaces', () => {
  it('a route from a hatch to a vent takes the void heights and its ends', () => {
    const d = campus();
    const c = newCrawl(d, crawlId(d), 'G', [8.1, 11.6], [21.8, 12.1]);
    expect(c.id).toBe('CR1');
    expect(c.ends[0]!.kind).toBe('hatch');
    expect(c.ends[0]!.ref).toBe('G-COR');
    expect(c.ends[1]).toEqual({ kind: 'vent', ref: 'E001', at: [22, 12] });
    expect(c.path[1]).toEqual([22, 12]);
    expect(c.y0).toBeCloseTo(2.42, 6);
    expect(c.y1).toBeCloseTo(3.9, 6);
    expect(c.width).toBe(facts.crawl.widthDefault.value);
    expect(crawlWords(d, c)).toContain('crouch-moves');
    expect(crawlWords(d, c)).toContain('Guards never enter voids');
    // the hatch it ends at goes into the corridor's ceiling
    const hs = hatchesFor(d, c);
    expect(hs.length).toBe(1);
    expect(hs[0]!.after.hatches).toEqual([c.ends[0]!.at]);
    // an end out in the open office (no ceiling) is open
    expect(crawlEnd(d, 'G', [10, 5]).kind).toBe('open');
  });

  it('the record round-trips through the model, the file text and undo', () => {
    const d = campus();
    const m = new EditorModel(d);
    const before = campusText(m.data);
    let c = newCrawl(d, crawlId(d), 'G', [8.1, 11.6], [14, 11.6]);
    c = dragCrawl(d, extendCrawl(c), [14, 12.8]);
    const s = settleCrawl(d, c, 0.1)!;
    expect(s.path.length).toBe(3);
    m.commit('Added crawl', [{ coll: 'crawls', id: s.id, before: null, after: s as unknown as Elem }]);
    const back = JSON.parse(campusText(m.data)) as Campus;
    expect(back.crawls![0]).toEqual(s);
    expect(crawlRows(back.crawls![0] as CrawlRecord).map((r) => r.id)).toEqual(['name', 'width', 'y0', 'clear', 'start', 'end', 'id']);
    m.undo();
    expect(campusText(m.data).replace(/,\n "crawls": \[\]/, '')).toBe(before);
    // width stays within the facts
    expect(stepCrawl({ ...s, width: facts.crawl.widthMin.value }, 'width', -1, 0.1)).toBeNull();
    expect(stepCrawl({ ...s, width: facts.crawl.widthMax.value }, 'width', 1, 0.1)).toBeNull();
  });

  it('a ceiling is its room: edits write the room, undo puts it back, reads change nothing', () => {
    const d = campus();
    const m = new EditorModel(d);
    const text = campusText(m.data);
    m.list('ceilings');
    expect(campusText(m.data)).toBe(text);
    const c = m.get<Ceiling>('ceilings', 'G-COR')!;
    m.commit('Ceiling', [{ coll: 'ceilings', id: c.id, before: c as Elem, after: { ...c, ceiling: 2.3, ceilingType: 'plasterboard', hatches: [[5, 11]] } as Elem }]);
    const r = m.get<Room>('rooms', 'G-COR')!;
    expect([r.ceiling, r.ceilingType, r.hatches]).toEqual([2.3, 'plasterboard', [[5, 11]]]);
    m.undo();
    expect(campusText(m.data)).toBe(text);
    // Delete takes the ceiling away (open); undo brings it back
    m.commit('Delete', deleteChanges(m, 'ceilings', 'G-COR'));
    expect(m.get<Room>('rooms', 'G-COR')!.ceiling).toBe(0);
    m.undo();
    expect(campusText(m.data)).toBe(text);
  });
});

describe('ON13 walk test pieces', () => {
  it('ceilings build less their hatches, as light shapes; tiles do not collide', () => {
    expect(BUILD_MIN).toBe(CANON_MIN_THICK);
    expect(CRAWL_BOARD.thick).toBeGreaterThanOrEqual(CANON_MIN_THICK);
    expect(rectMinus([0, 0, 3, 3], [[1, 1, 2, 2]]).length).toBe(4);
    const grid = ceilingBoxes({ ...room('C', 'G', [0, 0, 6, 3], 2.4, 'corridor'), hatches: [[3.3, 1.5]] }, 0);
    expect(grid.length).toBe(4);
    expect(grid.every((b) => !b.collide && b.s[1] >= CANON_MIN_THICK && Math.abs(b.c[1] - b.s[1] / 2 - 2.4) < 1e-9)).toBe(true);
    const area = grid.reduce((a, b) => a + b.s[0] * b.s[2], 0);
    expect(area).toBeCloseTo(18 - 0.36, 6);
    const slab = ceilingBoxes({ ...room('C', 'G', [0, 0, 6, 3], 2.4), ceilingType: 'slab' }, 0);
    expect(slab[0]!.collide && !slab[0]!.noLedge).toBe(true);
    expect(ceilingBoxes(room('C', 'G', [0, 0, 6, 3], 0), 0)).toEqual([]);
  });

  it('a crawl space builds floor and side boards, open below its hatch; the campus build has them', () => {
    const d = campus();
    const c = newCrawl(d, 'CR1', 'G', [8.1, 11.6], [21.8, 12.1]);
    const bs = crawlBoxes(c, 0, [0.6, 0]);
    const floor = bs.find((b) => b.id === 'CR1.floor.0')!;
    expect(floor.c[1] + floor.s[1] / 2).toBeCloseTo(c.y0, 6);
    expect(floor.s[2]).toBeCloseTo(Math.sqrt((22 - c.path[0]![0]) ** 2 + (12 - c.path[0]![1]) ** 2) - 0.3, 6);
    expect(bs.filter((b) => b.id.startsWith('CR1.side')).every((b) => b.collide && b.noLedge)).toBe(true);
    const build = campusToBuild({ ...d, crawls: [c] } as unknown as CampusFile);
    expect(build.ceilings.some((b) => b.id === 'CR1.floor.0')).toBe(true);
    expect(build.ceilings.some((b) => b.id.startsWith('G-COR.ceiling'))).toBe(true);
  });

  it('the game has a duct move, which crawl spaces name but do not use', () => {
    expect((MOVE_MODES as readonly string[]).includes('duct')).toBe(true);
    const src = readFileSync('src/editor/ceilings.ts', 'utf8');
    expect(src).toContain("the game's duct move");
  });
});
