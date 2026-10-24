// Visual gate viewpoints (scripts/visual-gate/viewpoints.mjs, VG3): the shape of MAPS / PRESETS / VIEWS / RIGS, the
// framing rough check (every region corner within 50 deg of the cam -> target direction), the rule keys VG5 / VG8 read and
// (vg3p) every region's projected size and frame at 960 x 540 through the harness's own projectQuads.
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { MAPS, PRESETS, VIEWS, RIGS } from '../scripts/visual-gate/viewpoints.mjs';
// @ts-expect-error plain .mjs process script without types
import { projectQuads, VIEWPORT } from '../scripts/visual-gate/harness.mjs';
import { CAMERA } from '../src/config/camera';

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
/** vg3p: the views whose `upper` was dropped (its surface cannot project to 60 px fully in frame; viewpoints.mjs says why). */
const NO_UPPER = ['m-a5-kiosk', 'cp-s1-b', 'cp-s1-f', 'so-s2-aisle'];
/** The views with a `wall` region (brief VG3 "regions", vg3p adds m-f-gallery). */
const WALL_VIEWS = ['m-a1-lounge', 'm-a3-lobby', 'm-a6-kerb', 'm-f-gallery', 'so-s1-workshop'];
/** vg3p: regions allowed under 60 px (min px per axis) because a rule needs them; stats only, no blotch erosion. */
const SMALL: Record<string, number> = { 'so-s1-goods-in.floor': 40 };
const MIN_PX = 60;

type Pt2 = [number, number];
/** The photo camera's view x projection (row-vector order, as harness `matrix()` reads it): Babylon LookAtLH (y up) times
 * PerspectiveFovLH, vertical FOV from CAMERA.fov horizontal at 16:9 (FOVMODE_VERTICAL_FIXED), aspect of VIEWPORT. */
function viewProj(eye: Vec3, target: Vec3): number[] {
  const W = VIEWPORT.width as number;
  const H = VIEWPORT.height as number;
  const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a: Vec3): Vec3 => {
    const l = len(a);
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  const z = unit(sub(target, eye));
  const x = unit(cross([0, 1, 0], z));
  const y = cross(z, x);
  const view = [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
  const f = 1 / ((Math.tan((CAMERA.fov * Math.PI) / 360) * 9) / 16);
  const near = 0.1;
  const far = 1000;
  const proj = [f / (W / H), 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (far - near), 1, 0, 0, (-2 * far * near) / (far - near), 0];
  const out = new Array<number>(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) out[i * 4 + j]! += view[i * 4 + k]! * proj[k * 4 + j]!;
  return out;
}
/** The convex polygon's minimum width (px): the least, over its edges, of the farthest corner from that edge's line. */
function minWidth(pts: Pt2[]): number {
  let w = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const el = Math.sqrt(ex * ex + ey * ey);
    let far = 0;
    for (const p of pts) far = Math.max(far, Math.abs((p[0] - a[0]) * ey - (p[1] - a[1]) * ex) / el);
    w = Math.min(w, far);
  }
  return w;
}
/** Each region of a view or rig projected at VIEWPORT through the harness's own projectQuads: bbox, min width, behind. */
function projected(x: { cam: Vec3; target: Vec3; regions: Record<string, Quad> }): Record<string, { pts: Pt2[]; behind: boolean; w: number; h: number; x0: number; x1: number; y0: number; y1: number; mw: number }> {
  const proj = projectQuads(viewProj(x.cam, x.target), x.regions, VIEWPORT.width, VIEWPORT.height) as Record<string, { pts: Pt2[]; behind: boolean }>;
  const out: ReturnType<typeof projected> = {};
  for (const [k, r] of Object.entries(proj)) {
    const xs = r.pts.map((p) => p[0]);
    const ys = r.pts.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    out[k] = { pts: r.pts, behind: r.behind, w: x1 - x0, h: y1 - y0, x0, x1, y0, y1, mw: minWidth(r.pts) };
  }
  return out;
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
      if (!NO_UPPER.includes(v.id)) expect(Object.keys(v.regions), v.id).toContain('upper');
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

  it('drops upper only where its surface cannot reach 60 px, and puts a wall on the views that face one', () => {
    expect(views.filter((v) => !('upper' in v.regions)).map((v) => v.id).sort()).toEqual([...NO_UPPER].sort());
    expect(views.filter((v) => 'wall' in v.regions).map((v) => v.id).sort()).toEqual([...WALL_VIEWS].sort());
  });

  it('projects every view region >= 60 x 60 px and fully inside the 960 x 540 frame (vg3p, VG1 polish 3)', () => {
    expect([VIEWPORT.width, VIEWPORT.height]).toEqual([960, 540]);
    for (const v of views) {
      for (const [name, r] of Object.entries(projected(v))) {
        const at = `${v.id}.${name} ${r.w.toFixed(0)} x ${r.h.toFixed(0)} px, x ${r.x0.toFixed(0)}-${r.x1.toFixed(0)}, y ${r.y0.toFixed(0)}-${r.y1.toFixed(0)}`;
        const min = SMALL[`${v.id}.${name}`] ?? MIN_PX;
        expect(r.behind, at).toBe(false);
        expect(r.w, at).toBeGreaterThanOrEqual(min);
        expect(r.h, at).toBeGreaterThanOrEqual(min);
        expect(r.x0, at).toBeGreaterThanOrEqual(0);
        expect(r.y0, at).toBeGreaterThanOrEqual(0);
        expect(r.x1, at).toBeLessThanOrEqual(VIEWPORT.width);
        expect(r.y1, at).toBeLessThanOrEqual(VIEWPORT.height);
        // blotch erodes a region under ~49 px in either axis to nothing (VG1 polish 3): a wall keeps 60 px of true width
        if (name === 'wall') expect(r.mw, `${at}, min width ${r.mw.toFixed(0)}`).toBeGreaterThanOrEqual(MIN_PX);
      }
    }
    for (const k of Object.keys(SMALL)) {
      const [id, name] = k.split('.');
      expect(views.find((v) => v.id === id)?.regions[name ?? ''], k).toBeDefined();
    }
  });

  it('projects every rig leak region >= 60 x 60 px in front of the camera', () => {
    for (const r of rigs) {
      const p = projected(r).leak!;
      expect(p.behind, r.id).toBe(false);
      expect(Math.min(p.w, p.h, p.mw), r.id).toBeGreaterThanOrEqual(MIN_PX);
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
