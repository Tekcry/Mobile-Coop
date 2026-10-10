import { describe, expect, it } from 'vitest';
import { ALL_MISSIONS, DOWNLOAD, evaluateRules, MISSIONS, missionRating, ObjectiveChain, validateMissions, type MissionDef } from '../src/game/missions';
import { StyleTracker } from '../src/game/playstyle';
import { MAPS } from '../src/world/maps';

const base = {
  id: 'm',
  name: 'Test',
  map: 'warehouse',
  insertions: [{ id: 'a', name: 'A', x: 0, z: 0 }],
  objectives: [{ type: 'extract', id: 'x', x: 1, z: 1 }],
};

describe('mission validation', () => {
  it('the shipped missions validate, point at real maps and every type is used', () => {
    expect(MISSIONS.length).toBeGreaterThanOrEqual(4);
    const types = new Set<string>();
    for (const m of MISSIONS) {
      expect(MAPS.some((x) => x.id === m.map)).toBe(true);
      expect(m.insertions.length).toBeGreaterThanOrEqual(1);
      for (const o of m.objectives) types.add(o.type);
    }
    for (const t of ['download', 'plant', 'rescue', 'sabotage', 'intel', 'extract']) expect(types.has(t)).toBe(true);
  });
  it('offers only missions on listed maps (Warehouse, and the First Playable greyboxes); parked ones stay bundled', () => {
    expect(MISSIONS.every((m) => m.map === 'warehouse' || m.map === 'exchange' || m.map === 'trunk-annex' || m.map === 'dead-line' || m.map === 'dead-line-v2')).toBe(true);
    expect(ALL_MISSIONS.length).toBeGreaterThan(MISSIONS.length);
    expect(ALL_MISSIONS.some((m) => m.map === 'embassy')).toBe(true);
  });
  it('rejects broken missions', () => {
    expect(() => validateMissions({})).toThrow();
    expect(() => validateMissions([{ ...base, objectives: [] }])).toThrow(/no objectives/);
    expect(() => validateMissions([{ ...base, objectives: [{ type: 'teleport' }] }])).toThrow(/unknown objective/);
    expect(() => validateMissions([{ ...base, insertions: [] }])).toThrow(/insertions/);
    expect(() => validateMissions([base, base])).toThrow(/duplicate/);
    expect(() => validateMissions([{ ...base, objectives: [{ type: 'intel' }] }])).toThrow(/items/);
    expect(() => validateMissions([{ ...base, objectives: [{ type: 'rescue' }] }])).toThrow(/vip/);
  });
  it('clamps hold times into each type range', () => {
    const [m] = validateMissions([{ ...base, objectives: [{ type: 'download', time: 5 }, { type: 'plant', time: 99 }] }]);
    expect(m!.objectives[0]!.time).toBe(30);
    expect(m!.objectives[1]!.time).toBe(8);
  });
});

const mk = (objs: unknown[], rules: Record<string, string> = {}): MissionDef => validateMissions([{ ...base, objectives: objs, rules }])[0]!;

describe('objective chain', () => {
  it('download: holds keep their progress, pulses come every period, then the next objective', () => {
    const c = new ObjectiveChain(mk([{ type: 'download', time: 30 }, { type: 'extract' }]));
    expect(c.current?.type).toBe('download');
    expect(c.hold(10)).toBe(false);
    expect(c.noticed()).toBe(DOWNLOAD.pulse <= 10);
    // away for a while: nothing lost
    expect(c.fraction).toBeCloseTo(10 / 30, 5);
    expect(c.hold(20)).toBe(true);
    expect(c.current?.type).toBe('extract');
    expect(c.reach()).toBe(true);
    expect(c.state).toBe('done');
  });
  it('intel in any order; plant, sabotage (arms), rescue (frees)', () => {
    const c = new ObjectiveChain(mk([{ type: 'intel', items: [[0, 0], [1, 1], [2, 2]] }, { type: 'plant', time: 3 }, { type: 'sabotage', time: 4 }, { type: 'rescue', vip: [0, 0, 0], time: 1 }, { type: 'extract' }]));
    expect(c.collect(2)).toBe(false);
    expect(c.collect(2)).toBe(false);
    expect(c.collect(0)).toBe(false);
    expect(c.collect(1)).toBe(true);
    expect(c.current?.type).toBe('plant');
    expect(c.hold(3)).toBe(true);
    expect(c.hold(4)).toBe(true);
    expect(c.armed).toBe(true);
    expect(c.hold(1)).toBe(true);
    expect(c.vipFree).toBe(true);
    expect(c.reach()).toBe(true);
    expect(c.state).toBe('done');
  });
  it('fails once and stays failed', () => {
    const c = new ObjectiveChain(mk([{ type: 'extract' }]));
    c.fail('Detected');
    expect(c.state).toBe('failed');
    expect(c.current).toBeNull();
    expect(c.reach()).toBe(false);
  });
});

describe('rules and rating', () => {
  it('bonus rules kept, fail rules broken', () => {
    const r = { noAlarms: 'bonus', noKills: 'off', undetected: 'fail' } as const;
    expect(evaluateRules(r, { alarms: 0, kills: 3, detections: 0 })).toEqual({ fail: null, bonuses: ['No alarms'] });
    expect(evaluateRules(r, { alarms: 1, kills: 0, detections: 1 }).fail).toMatch(/Undetected/);
    expect(evaluateRules(r, { alarms: 1, kills: 0, detections: 0 }).bonuses).toEqual([]);
  });
  it('stars: done, half the bonuses, never detected', () => {
    expect(missionRating(false, 2, 2, 0)).toBe(0);
    expect(missionRating(true, 0, 2, 3)).toBe(1);
    expect(missionRating(true, 1, 2, 3)).toBe(2);
    expect(missionRating(true, 2, 2, 0)).toBe(3);
  });
});

describe('play styles', () => {
  it('unseen non-lethal is Ghost, unseen lethal is Panther, seen is Assault', () => {
    const s = new StyleTracker();
    s.record('takedownNonLethal', false);
    s.record('knockout', false);
    expect(s.dominant()).toBe('ghost');
    s.record('takedownLethal', false);
    s.record('takedownLethal', false);
    s.record('execute', false);
    expect(s.dominant()).toBe('panther');
    for (let i = 0; i < 8; i++) s.record('kill', true);
    s.record('alarm', true);
    expect(s.dominant()).toBe('assault');
    const sp = s.split();
    expect(sp.ghost + sp.panther + sp.assault).toBeCloseTo(1, 6);
    expect(s.alarms).toBe(1);
    expect(s.kills).toBe(11);
    expect(s.knockouts).toBe(2);
  });
});
