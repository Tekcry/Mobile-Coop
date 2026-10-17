import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addStop, closeLoop, cycleWords, dropObjectiveRefs, GridCache, gridPath, guardSummary, isolationAt, newGuard, newObjective, newSpawn, nextId, objectiveCycles, onFirstStop, patrol, patrolAt, removeLastStop, setFace, stepWait, toggleRequires, walkable, walkGrid, withCycle } from '../../src/editor/mission';
import type { Guard, MissionData, Objective, PlayPt } from '../../src/editor/mission';
import { GUARD_KINDS, ROSTER } from '../../src/editor/missionCatalogue';
import { hyp2 } from '../../src/core/mathx';
import { joinPlay, playText, splitPlay } from '../../src/editor/playFile';
import { campusText, EditorModel } from '../../src/editor/model';
import type { Campus, Elem } from '../../src/editor/types';

const facts = JSON.parse(readFileSync('scripts/kestrel/facts.json', 'utf8')) as { guard: Record<string, { value: unknown }> };
const enemies = JSON.parse(readFileSync('src/config/enemies.json', 'utf8')) as Record<string, { walkSpeed: number }>;

/** Two rooms on G either side of a wall at x 10 (a door in it unless `closed`); a first floor with a stair up. */
const campus = (closed = false, stair = true): MissionData =>
  ({
    meta: { id: 't' },
    levels: [
      { id: 'G', name: 'Ground', floor: 0, height: 4 },
      { id: 'F', name: 'First', floor: 4, height: 4 },
    ],
    rooms: [
      { id: 'R1', level: 'G', kind: 'room', rect: [0, 0, 10, 10] },
      { id: 'R2', level: 'G', kind: 'room', rect: [10, 0, 20, 10] },
      { id: 'F1', level: 'F', kind: 'room', rect: [0, 0, 20, 10] },
    ],
    walls: [{ id: 'W1', level: 'G', a: [10, 0], b: [10, 10], t: 0.2, h: 4, kind: 'interior' }],
    openings: closed ? [] : [{ id: 'D1', wall: 'W1', at: 5, w: 1, h: 2.1, sill: 0, type: 'door' }],
    stairs: stair ? [{ id: 'ST1', kind: 'straight', from: 'G', to: 'F', rect: [16, 6, 18, 10], up: 'N' }] : [],
    ladders: [],
    voids: [],
    objects: [],
  }) as unknown as MissionData;

const pt = (x: number, z: number, l = 'G'): PlayPt => [x, z, l];
const guard = (stops: PlayPt[], kind = 'grunt', wait = 0): Guard => ({ id: 'GD1', kind, employer: '', job: '', space: '', loop: stops.map((at) => ({ at, wait, face: 0 })), cycle: 0 });
const grids = (d: Campus): ((l: string) => ReturnType<typeof walkGrid>) => {
  const c = new GridCache();
  return (l) => c.get(d, l);
};

describe('guard kinds and the roster (ON8)', () => {
  it('walk speeds are the game enemy defs (F20) and every roster entry has a src and a known kind', () => {
    for (const k of GUARD_KINDS) expect(k.walk, k.id).toBe(enemies[k.id]!.walkSpeed);
    expect(Object.keys(facts.guard.walk!.value as object).sort()).toEqual(Object.keys(enemies).sort());
    for (const r of ROSTER) {
      expect(r.src.length).toBeGreaterThan(0);
      expect(GUARD_KINDS.some((k) => k.id === r.kind), r.id).toBe(true);
    }
    expect(ROSTER.reduce((s, r) => s + r.n, 0)).toBe(21);
  });
});

describe('grid path search (ON8)', () => {
  it('the walk grid: rooms are floor, the wall blocks by the agent radius, the door lets through', () => {
    const g = walkGrid(campus(), 'G')!;
    expect(walkable(g, 5, 5)).toBe(true);
    expect(walkable(g, 10.1, 2)).toBe(false);
    expect(walkable(g, 10.2, 5)).toBe(true);
    expect(walkable(g, 25, 5)).toBe(false);
  });

  it('an open leg is found through the door; a closed wall has no way', () => {
    const open = gridPath(walkGrid(campus(), 'G')!, 5, 2, 15, 2);
    expect(open).not.toBeNull();
    const L = open!.slice(1).reduce((s, p, i) => s + hyp2(p[0] - open![i]![0], p[1] - open![i]![1]), 0);
    expect(L).toBeGreaterThan(10.5);
    expect(L).toBeLessThan(13);
    expect(gridPath(walkGrid(campus(true), 'G')!, 5, 2, 15, 2)).toBeNull();
  });

  it('a red leg says which stops it joins; a leg to another level takes the stair, or warns without one', () => {
    const shut = patrol(campus(true), guard([pt(5, 2), pt(15, 2), pt(15, 8)]), grids(campus(true)));
    expect(shut.legs[0]!.ok).toBe(false);
    expect(shut.legs[0]!.why).toBe('No way from stop 1 to stop 2');
    expect(shut.legs[1]!.ok).toBe(true);
    const d = campus();
    const up = patrol(d, guard([pt(12, 2), pt(5, 5, 'F')]), grids(d));
    expect(up.legs.every((l) => l.ok)).toBe(true);
    expect(up.legs[0]!.pts.some((p) => p[2] === 'F')).toBe(true);
    const d2 = campus(false, false);
    const none = patrol(d2, guard([pt(12, 2), pt(5, 5, 'F')]), grids(d2));
    expect(none.legs[0]!.why).toBe('No stair or ladder joins Ground and First (stop 1 to stop 2)');
  });
});

describe('path length and cycle (ON8)', () => {
  it('a rectangle in one room: length 30 m; cycle = length / walk speed + the waits', () => {
    const d = campus();
    const g = guard([pt(2, 2), pt(8, 2), pt(8, 8), pt(2, 8)], 'grunt', 3);
    const p = patrol(d, g, grids(d));
    expect(p.length).toBeCloseTo(24, 6);
    expect(p.speed).toBe(0.9);
    expect(p.cycle).toBeCloseTo(Math.round((24 / 0.9 + 12) * 10) / 10, 6);
    expect(withCycle(d, g, grids(d)).cycle).toBe(p.cycle);
    expect(guardSummary({ ...g, cycle: p.cycle, name: 'Night guard' })).toBe('guard GD1, Night guard, 4 stops, 39 s loop');
  });

  it('patrol time: waits at stop 1 first, then walks; mark alone here finds the nearest point and its time', () => {
    const d = campus();
    const g = guard([pt(2, 2), pt(8, 2), pt(8, 8)], 'grunt', 2);
    const p = patrol(d, g, grids(d));
    expect(patrolAt(g, p, 1).stop).toBe(0);
    const mid = patrolAt(g, p, 2 + 3 / 0.9);
    expect(mid.x).toBeCloseTo(5, 3);
    expect(mid.z).toBeCloseTo(2, 3);
    expect(mid.yaw).toBeCloseTo(Math.PI / 2, 3);
    const iso = isolationAt(g, p, 8.4, 5, 'G')!;
    expect(iso.at).toEqual([8, 5, 'G']);
    expect(iso.t).toBeCloseTo(2 + 6 / 0.9 + 2 + 3 / 0.9, 1);
  });
});

describe('path editing (ON8)', () => {
  it('stops: add faces the way walked, wait steps 1 s from 0, X removes the last, the loop closes on the first stop', () => {
    let g = guard([pt(2, 2)]);
    g = addStop(g, pt(2, 8));
    expect(g.loop[1]!.face).toBe(0);
    g = addStop(g, pt(8, 8));
    expect(g.loop[2]!.face).toBe(90);
    g = stepWait(g, -1);
    expect(g.loop[2]!.wait).toBe(0);
    g = stepWait(stepWait(g, 1), 1);
    expect(g.loop[2]!.wait).toBe(2);
    g = setFace(g, -45);
    expect(g.loop[2]!.face).toBe(315);
    expect(closeLoop(guard([pt(1, 1), pt(2, 2)])).closed).toBeUndefined();
    expect(onFirstStop(g, 2.3, 2.3, 'G')).toBe(true);
    expect(onFirstStop(g, 2.3, 2.3, 'F')).toBe(false);
    g = closeLoop(g);
    expect(g.closed).toBe(true);
    g = removeLastStop(g);
    expect(g.loop.length).toBe(2);
    expect(g.closed).toBe(false);
    expect(removeLastStop(guard([pt(1, 1)])).loop.length).toBe(1);
  });

  it('undo: a new guard and its stops are one undo step; a later stop edit undoes on its own', () => {
    const d = campus();
    const m = new EditorModel(d);
    const g0 = newGuard(d, pt(2, 2), ROSTER[5]!);
    expect(g0.id).toBe('GD1');
    m.commit('Added guard', [{ coll: 'guards', id: g0.id, before: null, after: g0 as Elem }], { key: 'path:GD1', at: 0, within: Infinity });
    let g = g0;
    for (const p of [pt(8, 2), pt(8, 8)]) {
      const after = addStop(g, p);
      m.commit('stop', [{ coll: 'guards', id: g.id, before: g as Elem, after: after as Elem }], { key: 'path:GD1', at: 1, within: Infinity });
      g = after;
    }
    expect(m.history.length).toBe(1);
    expect(d.guards![0]!.loop.length).toBe(3);
    const later = stepWait(g, 1);
    m.commit('wait', [{ coll: 'guards', id: g.id, before: g as Elem, after: later as Elem }]);
    expect(d.guards![0]!.loop[2]!.wait).toBe(1);
    m.undo();
    expect(d.guards![0]!.loop[2]!.wait).toBe(0);
    m.undo();
    expect(d.guards!.length).toBe(0);
  });
});

describe('markers and the play file (ON8)', () => {
  it('ids are fresh and readable; at most 4 insertion points', () => {
    expect(nextId([{ id: 'GD1' }, { id: 'GD7' }, { id: 'X9' }], 'GD')).toBe('GD8');
    const d = campus();
    d.spawns = [];
    for (let i = 0; i < 4; i++) d.spawns.push(newSpawn(d, pt(i, 1))!);
    expect(d.spawns.map((s) => s.id)).toEqual(['SP1', 'SP2', 'SP3', 'SP4']);
    expect(newSpawn(d, pt(5, 1))).toBeNull();
    const o = newObjective(d, pt(15, 5), 'intel');
    expect([o.id, o.room, o.order]).toEqual(['OBJ1', 'R2', 1]);
  });

  it('round-trips byte-identically: spawns as points and the extraction as one object in the file', () => {
    const text = readFileSync('docs/kestrel/kestrel.campus.blocks.json', 'utf8');
    const pText = playText({
      spaces: [{ id: 'S1' }],
      guards: [{ id: 'GD1', kind: 'grunt', employer: 'Guarding firm', job: 'Walks', space: '', loop: [{ at: [1, 2, 'G'], wait: 4, face: 90 }], cycle: 12.5, isolation: { at: [1, 2, 'G'], t: 3 } }],
      spawns: [[1, 2, 'G'], [3, 4, 'G']],
      objectives: [{ id: 'OBJ1', kind: 'intel', room: 'G-SEC', at: [5, 6, 'G'], optional: false, order: 1, requires: [], unlocks: [] }],
      extraction: { level: 'G', rect: [0, 0, 4, 3] },
      hides: [{ id: 'H1', space: '', at: [7, 8, 'G'], kind: 'locker' }],
      checkpoints: [{ id: 'CP1', at: [9, 9, 'G'] }],
    });
    const data = joinPlay(JSON.parse(text) as Campus, JSON.parse(pText) as Record<string, unknown>);
    expect(data.spawns!.map((s) => s.id)).toEqual(['SP1', 'SP2']);
    expect(data.extraction![0]!.id).toBe('EX1');
    const out = splitPlay(data, JSON.parse(pText) as Record<string, unknown>);
    expect(campusText(out.campus)).toBe(text);
    expect(playText(out.play!)).toBe(pText);
    data.extraction = [];
    data.spawns!.push({ id: 'SP3', at: [5, 5, 'F'] });
    const out2 = splitPlay(data, JSON.parse(pText) as Record<string, unknown>).play!;
    expect('extraction' in out2).toBe(false);
    expect(out2.spawns).toEqual([[1, 2, 'G'], [3, 4, 'G'], [5, 5, 'F']]);
  });

  it('objective requires / unlocks: picking keeps both sides; a loop is found and worded', () => {
    const o = (id: string): Objective => ({ id, kind: 'zone', room: '', at: pt(0, 0), optional: false, order: 1, requires: [], unlocks: [] });
    let [a, b] = toggleRequires(o('OBJ1'), o('OBJ2'));
    expect(a.requires).toEqual(['OBJ2']);
    expect(b.unlocks).toEqual(['OBJ1']);
    expect(objectiveCycles([a, b])).toEqual([]);
    const c = { ...o('OBJ3'), requires: ['OBJ1'], unlocks: ['OBJ2'] };
    expect(objectiveCycles([a, b, c]).sort()).toEqual(['OBJ1', 'OBJ2', 'OBJ3']);
    expect(cycleWords([a, b, c])).toMatch(/^Objectives OBJ1, OBJ2, OBJ3 need each other/);
    [a, b] = toggleRequires(a, b);
    expect(a.requires).toEqual([]);
    expect(b.unlocks).toEqual([]);
    expect(dropObjectiveRefs([a, b, c], 'OBJ2')).toEqual([{ ...c, unlocks: [] }]);
  });
});
