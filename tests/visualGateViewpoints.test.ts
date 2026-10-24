// Visual gate viewpoints (scripts/visual-gate/viewpoints.mjs, VG3): the shape of MAPS / PRESETS / VIEWS / RIGS, the
// framing rough check (every region corner within 50 deg of the cam -> target direction) and the rule keys VG5 / VG8 read.
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { MAPS, PRESETS, VIEWS, RIGS } from '../scripts/visual-gate/viewpoints.mjs';

type Vec3 = [number, number, number];
type Quad = [Vec3, Vec3, Vec3, Vec3];
type Rule = { min?: number | null; max?: number | null; presets?: string[] };
type View = {
  id: string; map: string; src: string; feet: Vec3; cam: Vec3; target: Vec3;
  regions: Record<string, Quad>; metrics: Record<string, string[]>; rules: Record<string, Rule>;
  parity: Vec3[] | null; targets: string[]; known: string | null;
};
type Rig = {
  id: string; map: string; src: string;
  door: { at: Vec3; src: Record<string, string> } | null;
  guard: { pos: Vec3; yaw: number }; feet: Vec3; cam: Vec3; target: Vec3;
  regions: Record<string, Quad>; rules: Record<string, Rule>; targets: string[]; known: string | null;
};

const maps = MAPS as Record<string, { query: string; label: string }>;
const presets = PRESETS as string[];
const views = VIEWS as View[];
const rigs = RIGS as Rig[];

const MAP_IDS = ['ctcourse', 'campusOps', 'warehouseOps', 'warehouse'];
const QUERIES: Record<string, string> = {
  ctcourse: 'autostart=ctcourse&mode=course',
  campusOps: 'autostart=campusOps&mode=sector&sectorGuards=1',
  warehouseOps: 'autostart=warehouseOps&mode=sector&sectorGuards=4',
  warehouse: 'autostart=warehouse&mode=clear',
};
const PREFIX: Record<string, string> = { ctcourse: 'm-', campusOps: 'cp-', warehouseOps: 'so-', warehouse: 'wh-' };
const STATS = ['mean', 'p5', 'p50', 'p95', 'nearBlack'];
const VIEW_METRICS = [...STATS, 'veil', 'contrast', 'blotch', 'arc'];
const EXTRAS = ['haze', 'blotch', 'arc'];
const ALL_TARGETS = ['F1', 'F2', 'F4', 'F5', 'F5b', 'F6', 'F7', 'F8'];
/** The views that carry a walk find (brief "targets"); every other view carries none. */
const VIEW_TARGETS: Record<string, string[]> = {
  'so-s1-goods-in': ['F1', 'F2'],
  'so-s1-girder': ['F1'],
  'so-s1-workshop': ['F4'],
  'm-a3-lobby': ['F6', 'F7'],
  'cp-s2-b': ['F8'],
  'cp-s2-d': ['F8'],
  'cp-s3-a': ['F8'],
};
/** The rule keys each target adds (bounds null until VG8), and the presets it is limited to (absent: both). */
const TARGET_RULES: Record<string, Record<string, string[] | undefined>> = {
  F1: { 'upper.veil': ['epic'], 'upper.contrast': ['epic'] },
  F8: { 'upper.veil': ['epic'], 'upper.contrast': ['epic'] },
  F2: { 'floor.nearBlack': undefined },
  F4: { 'wall.arc': ['epic'] },
  F6: { 'whole.mean': undefined, 'whole.nearBlack': undefined },
  F7: { 'wall.blotch': ['low'] },
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3): number => Math.sqrt(dot(a, a));
/** Angle (deg) between the cam -> target direction and the cam -> p direction. */
function coneDeg(cam: Vec3, target: Vec3, p: Vec3): number {
  const f = sub(target, cam);
  const v = sub(p, cam);
  return (Math.acos(Math.max(-1, Math.min(1, dot(f, v) / (len(f) * len(v))))) * 180) / Math.PI;
}
const isVec3 = (v: unknown): boolean => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
const isQuad = (q: unknown): boolean => Array.isArray(q) && q.length === 4 && q.every(isVec3);
function expectFramed(id: string, cam: Vec3, target: Vec3, regions: Record<string, Quad>): void {
  expect(len(sub(target, cam)), `${id}: |cam - target|`).toBeGreaterThanOrEqual(0.5);
  for (const [name, q] of Object.entries(regions)) {
    expect(isQuad(q), `${id}.${name} is 4 Vec3`).toBe(true);
    for (const p of q) expect(coneDeg(cam, target, p), `${id}.${name} corner ${p.join(', ')}`).toBeLessThanOrEqual(50);
  }
}
const ruleKeyOk = (key: string, regions: string[], metrics: string[]): boolean => {
  const [region, metric, ...rest] = key.split('.');
  return rest.length === 0 && regions.includes(region ?? '') && metrics.includes(metric ?? '');
};

describe('visual gate viewpoints: maps and presets', () => {
  it('has the two presets and the four maps with their boot queries', () => {
    expect(presets).toEqual(['low', 'epic']);
    expect(Object.keys(maps).sort()).toEqual([...MAP_IDS].sort());
    for (const id of MAP_IDS) {
      expect(maps[id]!.query, id).toBe(QUERIES[id]);
      expect(maps[id]!.query).not.toMatch(/gfx=|weather=/);
      expect(typeof maps[id]!.label).toBe('string');
    }
  });

  it('spawns at least one guard on every map that has a rig (C0 M2)', () => {
    const rigMaps = new Set(rigs.map((r) => r.map));
    expect(rigMaps.size).toBeGreaterThan(0);
    for (const m of rigMaps) {
      const q = maps[m]!.query;
      expect(q, m).not.toMatch(/sectorGuards=0(&|$)/);
      const n = /sectorGuards=(\d+)/.exec(q);
      if (n) expect(Number(n[1]), m).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('visual gate viewpoints: views and rigs', () => {
  it('has 26 views (9 / 10 / 5 / 2 by map) and 3 rigs, ids unique and prefixed by map', () => {
    expect(views).toHaveLength(26);
    expect(rigs).toHaveLength(3);
    const count = (m: string): number => views.filter((v) => v.map === m).length;
    expect([count('ctcourse'), count('campusOps'), count('warehouseOps'), count('warehouse')]).toEqual([9, 10, 5, 2]);
    const ids = [...views.map((v) => v.id), ...rigs.map((r) => r.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const x of [...views, ...rigs]) {
      expect(MAP_IDS, x.id).toContain(x.map);
      expect(x.id.startsWith(PREFIX[x.map]!), `${x.id} prefix for ${x.map}`).toBe(true);
    }
  });

  it('has finite Vec3s and quads every view and rig frames (50 deg rough check)', () => {
    for (const v of views) {
      for (const k of ['feet', 'cam', 'target'] as const) expect(isVec3(v[k]), `${v.id}.${k}`).toBe(true);
      expect(Object.keys(v.regions), v.id).not.toContain('whole');
      expect(Object.keys(v.regions), v.id).toContain('upper');
      expectFramed(v.id, v.cam, v.target, v.regions);
    }
    for (const r of rigs) {
      for (const k of ['feet', 'cam', 'target'] as const) expect(isVec3(r[k]), `${r.id}.${k}`).toBe(true);
      expect(isVec3(r.guard.pos), `${r.id}.guard.pos`).toBe(true);
      expect(Number.isFinite(r.guard.yaw), `${r.id}.guard.yaw`).toBe(true);
      expect(Object.keys(r.regions), r.id).toContain('leak');
      expectFramed(r.id, r.cam, r.target, r.regions);
    }
  });

  it('has metrics on known regions and view rules on known keys, all bounds unset', () => {
    for (const v of views) {
      const regions = Object.keys(v.regions);
      for (const [region, extras] of Object.entries(v.metrics)) {
        expect(regions, `${v.id} metrics ${region}`).toContain(region);
        for (const m of extras) expect(EXTRAS, `${v.id}.${region}`).toContain(m);
      }
      for (const [key, rule] of Object.entries(v.rules)) {
        expect(ruleKeyOk(key, [...regions, 'whole'], VIEW_METRICS), `${v.id} rule ${key}`).toBe(true);
        expect(rule.min ?? null, `${v.id} ${key}.min`).toBeNull();
        expect(rule.max ?? null, `${v.id} ${key}.max`).toBeNull();
        for (const p of rule.presets ?? []) expect(presets).toContain(p);
      }
    }
  });

  it('gives every region its extras: wall blotch and arc, upper haze, floor none', () => {
    const want: Record<string, string[]> = { wall: ['blotch', 'arc'], upper: ['haze'], floor: [] };
    for (const v of views) {
      expect(Object.keys(v.metrics).sort(), v.id).toEqual(Object.keys(v.regions).sort());
      for (const [region, extras] of Object.entries(v.metrics)) expect(extras, `${v.id}.${region}`).toEqual(want[region]);
    }
  });

  it('gives each target view the rule keys of its targets, and plain views no rules', () => {
    for (const v of views) {
      const want: Record<string, string[] | undefined> = {};
      for (const t of v.targets) Object.assign(want, TARGET_RULES[t] ?? {});
      expect(Object.keys(v.rules).sort(), v.id).toEqual(Object.keys(want).sort());
      for (const [key, ps] of Object.entries(want)) expect(v.rules[key]!.presets, `${v.id} ${key}`).toEqual(ps);
    }
  });

  it('has rig rules exactly leak.mean <= 0.004 and leak.p95 <= 0.02', () => {
    for (const r of rigs) {
      for (const key of Object.keys(r.rules)) expect(ruleKeyOk(key, ['leak'], ['mean', 'p95']), `${r.id} ${key}`).toBe(true);
      expect(r.rules).toEqual({ 'leak.mean': { max: 0.004 }, 'leak.p95': { max: 0.02 } });
    }
  });

  it('covers every walk find and puts each on its views', () => {
    const all = new Set([...views.flatMap((v) => v.targets), ...rigs.flatMap((r) => r.targets)]);
    expect([...all].sort()).toEqual([...ALL_TARGETS].sort());
    for (const v of views) {
      const want = new Set(VIEW_TARGETS[v.id] ?? []);
      if (v.map === 'ctcourse') want.add('F6');
      expect([...v.targets].sort(), v.id).toEqual([...want].sort());
    }
    const rigT = Object.fromEntries(rigs.map((r) => [r.id, r.targets]));
    expect(rigT).toEqual({ 'so-door': ['F5'], 'cp-door': ['F5'], 'so-corner': ['F5b'] });
  });

  it('has exactly 3 parity cards per map, on views only', () => {
    for (const m of MAP_IDS) {
      const cards = views.filter((v) => v.map === m).flatMap((v) => v.parity ?? []);
      expect(cards, m).toHaveLength(3);
      for (const p of cards) expect(isVec3(p), m).toBe(true);
    }
    for (const v of views) if (v.parity !== null) expect(v.parity.length, v.id).toBeGreaterThanOrEqual(1);
    for (const r of rigs) expect((r as unknown as { parity?: unknown }).parity ?? null, r.id).toBeNull();
  });

  it('marks only so-corner as a known fault (F5b)', () => {
    for (const x of [...views, ...rigs]) {
      if (x.id === 'so-corner') expect(x.known?.startsWith('F5b'), x.id).toBe(true);
      else expect(x.known, x.id).toBeNull();
    }
  });

  it('cites a source line for every view and rig, and each rig door at the three tags', () => {
    for (const x of [...views, ...rigs]) expect(x.src, x.id).toMatch(/\.(mjs|ts):\d+/);
    for (const r of rigs) {
      if (r.id === 'so-corner') expect(r.door, r.id).toBeNull();
      else expect(r.door, r.id).not.toBeNull();
      if (!r.door) continue;
      expect(isVec3(r.door.at), r.id).toBe(true);
      expect(Object.keys(r.door.src).sort(), r.id).toEqual(['master', 'v4.82.0', 'v4.88.0']);
      for (const s of Object.values(r.door.src)) expect(s, r.id).toMatch(/\.ts:\d+/);
    }
  });

  it('keeps each rig guard off the door (DOOR.enemyReach 1.0 m) and facing it', () => {
    for (const r of rigs) {
      if (!r.door) continue;
      const g = r.guard.pos;
      const d = r.door.at;
      expect(Math.hypot(g[0] - d[0], g[2] - d[2]), r.id).toBeGreaterThanOrEqual(1.1);
      const fx = Math.sin(r.guard.yaw);
      const fz = Math.cos(r.guard.yaw);
      const tx = d[0] - g[0];
      const tz = d[2] - g[2];
      expect((fx * tx + fz * tz) / Math.hypot(tx, tz), `${r.id} faces the door`).toBeGreaterThan(0.99);
    }
  });
});
