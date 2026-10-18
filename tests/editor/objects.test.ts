import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GROUPS, PRESETS, presetOf } from '../../src/editor/catalogue';
import { aisleOf, backToWall, badgesOf, FACTS, newObject, placeObject, placeRect, rowCount, rowRect, stealthTint, stepPreset, turnObject } from '../../src/editor/objects';
import type { FactSet } from '../../src/editor/objects';
import { pickTraversal } from '../../src/player/movement';
import { campusToBuild } from '../../src/world/maps/kestrelCampus';
import type { Obj, Rect, Wall } from '../../src/editor/types';

const facts = JSON.parse(readFileSync('scripts/kestrel/facts.json', 'utf8')) as Record<string, Record<string, { value: number }>>;
const F = (g: string, n: string): number => facts[g]![n]!.value;
const STAND = F('player', 'standHeight');
const CROUCH = F('player', 'crouchHeight');
const VAULT = F('traverse', 'vaultMax');
const MANTLE = F('traverse', 'mantleMax');
const LIP = F('lip', 'autoHeight');
const GRAB = F('reach', 'grabMax');
const JUMP = F('reach', 'jumpGrab');
const STEP = F('traverse', 'stepMax');
const d = 0.01;
const obj = (top: number, extra: Partial<Obj> = {}): Obj => ({ id: 'O1', level: 'G', rect: [0, 0, 1.6, 0.8], h: top, y: 0, noLedge: false, ...extra });
const onGrid = (v: number, g = 0.1): boolean => Math.abs(v / g - Math.round(v / g)) < 1e-6;
const wall = (id: string, a: [number, number], b: [number, number], t = 0.3): Wall => ({ id, level: 'G', a, b, t, h: 3, kind: 'interior' }) as Wall;

describe('catalogue', () => {
  it('every entry has a src, positive sizes, a known group and a unique id', () => {
    const ids = new Set<string>();
    for (const p of PRESETS) {
      expect(p.src.length, p.id).toBeGreaterThan(0);
      expect(p.w > 0 && p.d > 0 && p.h > 0 && p.y >= 0, p.id).toBe(true);
      expect(GROUPS.some((g) => g.id === p.group), p.id).toBe(true);
      expect(ids.has(p.id), p.id).toBe(false);
      ids.add(p.id);
    }
    for (const g of GROUPS) expect(PRESETS.some((p) => p.group === g.id)).toBe(true);
  });
  it('the rack width is the facts rack width; wall-mounted presets exist', () => {
    expect(presetOf('server-rack')!.w).toBe(F('rules', 'rackWidth'));
    expect(presetOf('rack-row')!.draw!.unit).toBe(F('rules', 'rackWidth'));
    expect(PRESETS.filter((p) => p.mount === 'wall').map((p) => p.id)).toEqual(['video-wall', 'whiteboard']);
  });
  it('the traverse facts are the game\'s pickTraversal limits (F04)', () => {
    expect(pickTraversal({ height: STEP, depth: 0.5, landingClear: true, topClear: true })).toBe('step');
    expect(pickTraversal({ height: VAULT, depth: F('traverse', 'vaultDepth'), landingClear: true, topClear: false })).toBe('vault');
    expect(pickTraversal({ height: VAULT + d, depth: F('traverse', 'vaultDepth'), landingClear: true, topClear: false })).toBe('none');
    expect(pickTraversal({ height: MANTLE, depth: 2, landingClear: false, topClear: true })).toBe('mantle');
    expect(pickTraversal({ height: MANTLE + d, depth: 2, landingClear: false, topClear: true })).toBe('none');
  });
});

describe('stealth badges at each fact boundary', () => {
  const b = (o: Obj, f: FactSet = FACTS): string[] => badgesOf(o, f).badges;
  it('full cover just over standing height, crouch cover just under', () => {
    expect(b(obj(STAND + d))).toContain('full');
    expect(b(obj(STAND))).not.toContain('full');
    expect(b(obj(STAND))).toContain('crouch');
    expect(b(obj(CROUCH + d))).toContain('crouch');
    expect(b(obj(CROUCH))).not.toContain('crouch');
  });
  it('vault at or under the vault limit (thin enough), not over', () => {
    const thin: Partial<Obj> = { rect: [0, 0, 2, 0.6] };
    expect(b(obj(VAULT, thin))).toContain('vault');
    expect(b(obj(VAULT + d, thin))).not.toContain('vault');
    expect(b(obj(STEP, thin))).not.toContain('vault');
    expect(b(obj(1.0, { rect: [0, 0, 1.2, 1.2] }))).not.toContain('vault');
  });
  it('climb: a mantle up to the mantle limit or a lip within grab reach; noLedge stops the lip', () => {
    expect(b(obj(MANTLE))).toContain('climb');
    expect(b(obj(MANTLE + d))).not.toContain('climb');
    expect(b(obj(LIP))).toContain('climb');
    expect(b(obj(LIP - d))).not.toContain('climb');
    expect(b(obj(GRAB))).toContain('climb');
    expect(b(obj(GRAB + d))).not.toContain('climb');
    expect(b(obj(LIP, { noLedge: true }))).not.toContain('climb');
  });
  it('hang: a lip from the auto-lip height up to the jump grab', () => {
    expect(b(obj(LIP))).toContain('hang');
    expect(b(obj(LIP - d))).not.toContain('hang');
    expect(b(obj(JUMP))).toContain('hang');
    expect(b(obj(JUMP + d))).not.toContain('hang');
    expect(b(obj(LIP, { noLedge: true }))).not.toContain('hang');
  });
  it('see-through gives no cover; a raised object gives no cover', () => {
    expect(b(obj(STAND + 1, { seeThrough: true }))).not.toContain('full');
    expect(badgesOf(obj(STAND + 1, { seeThrough: true })).notes).toContain('See-through: no cover');
    expect(b(obj(0.1, { y: 2.7, noLedge: true }))).toEqual([]);
    expect(b(obj(0.1, { y: 2.7 }))).toEqual(['hang']);
  });
  it('a missing fact gives no badge and a "no fact" note', () => {
    const f: FactSet = { ...FACTS };
    delete f['player.standHeight'];
    const r = badgesOf(obj(STAND + 1), f);
    expect(r.badges).not.toContain('full');
    expect(r.notes.join()).toMatch(/Cover: no fact \(player.standHeight\)/);
  });
  it('the stealth tints follow the badges', () => {
    expect(stealthTint(obj(2.0, { noLedge: true }))).toBe('#30c85a');
    expect(stealthTint(obj(1.2))).toBe('#ffd60a');
    expect(stealthTint(obj(1.1, { seeThrough: true }))).toBe('#8e8e93');
    expect(stealthTint(obj(0.75))).toBe('#0a84ff');
  });
});

describe('placing, turning and rows', () => {
  it('a preset at the dot sits on the 0.1 m grid at its size', () => {
    const r = placeRect(presetOf('desk')!, 0, 10.03, 5.07, 0.1);
    expect(r.every((v) => onGrid(v))).toBe(true);
    expect(r[2] - r[0]).toBeCloseTo(1.6);
    expect(r[3] - r[1]).toBeCloseTo(0.8);
    const t = placeRect(presetOf('desk')!, 90, 10, 5, 0.1);
    expect(t[2] - t[0]).toBeCloseTo(0.8);
    expect(t[3] - t[1]).toBeCloseTo(1.6);
  });
  it('turning keeps the footprint on the grid and its size, and the yaw cycles', () => {
    let o = newObject('O1', 'G', presetOf('desk')!, [3.1, 4.2, 4.7, 5.0]);
    for (let i = 1; i <= 4; i++) {
      o = turnObject(o, 0.1);
      expect(onGrid(o.rect[0]) && onGrid(o.rect[1])).toBe(true);
      const w = o.rect[2] - o.rect[0];
      const dd = o.rect[3] - o.rect[1];
      expect(i % 2 ? [w, dd] : [dd, w]).toEqual([expect.closeTo(0.8), expect.closeTo(1.6)]);
      expect(o.yaw ?? 0).toBe((i * 90) % 360);
    }
    expect('yaw' in o).toBe(false);
  });
  it('backs onto a wall face within the closed-gap fact; a wall-mounted preset off a wall is refused', () => {
    const ws = [wall('W1', [0, 10], [10, 10])];
    const near = backToWall([2, 10.3, 3.6, 11.1] as Rect, ws, 'G');
    expect(near.wall).toBe('W1');
    expect(near.rect[1]).toBeCloseTo(10.15);
    expect(backToWall([2, 10.6, 3.6, 11.4] as Rect, ws, 'G').wall).toBeNull();
    expect(placeObject(presetOf('whiteboard')!, 0, 5, 3, 0.1, ws, 'G').why).toBe('Move onto a wall');
    expect(placeObject(presetOf('whiteboard')!, 0, 5, 10.2, 0.1, ws, 'G').why).toBeNull();
  });
  it('rack rows snap to whole racks', () => {
    const p = presetOf('rack-row')!;
    const r = rowRect(p, [70, 40], [76.2, 40.1], 0.1);
    expect(r.n).toBe(10);
    expect(r.rect[2] - r.rect[0]).toBeCloseTo(6.0);
    expect(r.rect[3] - r.rect[1]).toBeCloseTo(1.2);
    expect(rowRect(p, [70, 40], [72.0, 40], 0.1).n).toBe(3);
    const z = rowRect(p, [80, 40], [80, 37], 0.1);
    expect(z.n).toBe(5);
    expect(z.yaw).toBe(90);
    expect(z.rect[3] - z.rect[1]).toBeCloseTo(3.0);
    expect(rowCount(newObject('O1', 'G', p, r.rect))).toBe(10);
    expect(rowRect(p, [70, 40], [70, 40], 0.1).n).toBe(1);
  });
  it('aisle words: clear, short and closed against the facts', () => {
    const row = (id: string, z0: number): Obj => newObject(id, 'G', presetOf('rack-row')!, [70, z0, 76, z0 + 1.2]);
    const A = row('O1', 40);
    const min = F('rules', 'aisleMin');
    const clear = aisleOf(A.rect, A.h, 'G', [A, row('O2', 41.2 + min)], 'O1')!;
    expect(clear.ok && clear.words).toBe(`aisle ${min} m clear to O2`);
    const short = aisleOf(A.rect, A.h, 'G', [A, row('O2', 41.2 + min - 0.1)], 'O1')!;
    expect(short.ok).toBe(false);
    expect(short.words).toMatch(/under 1\.8 m/);
    expect(aisleOf(A.rect, A.h, 'G', [A, row('O2', 41.4)], 'O1')!.words).toMatch(/closed up/);
    expect(aisleOf(A.rect, F('rules', 'aisleTallObject'), 'G', [A, row('O2', 43)], 'O1')).toBeNull();
  });
  it('the Type row steps through the group; a drawn row keeps its length', () => {
    const o = newObject('O1', 'G', presetOf('desk')!, [0, 0, 1.6, 0.8]);
    const n = stepPreset(o, 1)!;
    expect(n.preset).toBe('desk-pod');
    expect(n.name).toBe('Desk pod of 4 with screens');
    const r = newObject('O2', 'G', presetOf('rack-row')!, [70, 40, 76, 41.2]);
    const r2 = stepPreset(r, 1)!;
    expect(r2.preset).not.toBe('rack-row');
    expect(r2.rect[2] - r2.rect[0]).toBeCloseTo(6);
  });
});

describe('walk test', () => {
  it('objects build as solid boxes of their real height and base, on their level', () => {
    const base = JSON.parse(readFileSync('docs/kestrel/kestrel.campus.blocks.json', 'utf8'));
    const o1 = newObject('O001', 'F', presetOf('crate-1.0')!, [10, 10, 11, 11]);
    const o2 = newObject('O002', 'G', presetOf('video-wall')!, [20, 20, 20.3, 23.6], 90);
    const b = campusToBuild({ ...base, objects: [o1, o2] });
    const f = base.levels.find((l: { id: string }) => l.id === 'F').floor;
    const s1 = b.objectBoxes.find((s) => s.id === 'O001')!;
    expect(s1.c).toEqual([10.5, f + 0.5, 10.5]);
    expect(s1.s).toEqual([1, 1, 1]);
    const s2 = b.objectBoxes.find((s) => s.id === 'O002')!;
    expect(s2.c[1]).toBeCloseTo(0.8 + 1.1);
    expect(s2.s).toEqual([expect.closeTo(0.3), 2.2, expect.closeTo(3.6)]);
    expect(s2.noLedge).toBe(true);
  });
});
