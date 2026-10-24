/**
 * Sector Ops LED light fittings (warehouse-lamps, reworked in sector-fixes L; Michael 2026-10-22: "light fittings in
 * same rooms are different heights and locations. Theres random lights on the roof. Theres a light in the middle of a
 * climbing pipe." / "All lights should look like LED designs."). The real warehouseOps build: every fixed light is one
 * of the three LED models (panel, strip, bulkhead) and sits on its structure (a panel flush under its ceiling, a
 * strip's wires on the roof underside, a bulkhead's back on a wall face, 3 cm); each room's ceiling fittings share one
 * height and lie on a regular grid; no light stands on or over a roof; none is within reach of a climbing pipe, ladder
 * or duct. The checks scan the boxes and anchors themselves, not through `lampMount.ts`.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { S1_LAMPS } from '../src/world/maps/warehouseS1';
import { S2_LAMPS } from '../src/world/maps/warehouseS2';
import { S3_LAMPS } from '../src/world/maps/warehouseS3';
import type { LampRoom } from '../src/world/maps/lampRooms';
import { FITTING, MAX_HANGER, PANEL_GAP, mountEnd, mountLinks, mountLights } from '../src/world/lampMount';
import { fittingMesh } from '../src/world/fixtureModels';
import type { FittingModel, LightDef } from '../src/world/lights';

const b = new LevelBuilder();
warehouseOps.build(b, 0);
const fixed = b.lights.lights.filter((l) => l.kind !== 'flashlight');
const boxes = b.boxes.filter((p) => !p.detail && p.visible !== false);
const TOL = 0.03;
const SECTIONS: [number, readonly LampRoom[]][] = [[1, S1_LAMPS], [2, S2_LAMPS], [3, S3_LAMPS]];

/** Plan distance from (x, z) to the box's footprint (0 inside). */
function planGap(p: BoxPiece, x: number, z: number): number {
  const c = Math.cos(p.yaw);
  const s = Math.sin(p.yaw);
  const dx = x - p.c[0];
  const dz = z - p.c[2];
  const ox = Math.max(0, Math.abs(c * dx - s * dz) - p.s[0] / 2);
  const oz = Math.max(0, Math.abs(s * dx + c * dz) - p.s[2] / 2);
  return Math.sqrt(ox * ox + oz * oz);
}
const bot = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
/** The lowest box underside over (x, z) above `y`; Infinity when the sky is open. Thin pieces (pipes, rafters, beams under 0.6 m) are skipped. */
function underside(x: number, z: number, y: number): number {
  let u = Infinity;
  for (const p of boxes) if (Math.min(p.s[0], p.s[2]) >= 0.6 && top(p) > y + 0.02 && planGap(p, x, z) === 0) u = Math.min(u, bot(p));
  return u;
}
/** The highest box top under (x, z) below `y` (any piece). */
function under(x: number, z: number, y: number): number {
  let f = 0;
  for (const p of boxes) if (top(p) < y - 0.1 && planGap(p, x, z) === 0) f = Math.max(f, top(p));
  return f;
}

/** One line per light: where it is and what went wrong (empty = ok). */
function check(l: LightDef): string {
  const f = l.fixture;
  const end = mountEnd(l);
  if (!f?.model || !end) return `(${l.x}, ${l.y}, ${l.z}) no model`;
  const at = `(${l.x}, ${l.y}, ${l.z}) ${f.model}`;
  const m = f.mount ?? 0;
  if (f.base === 'ceiling') {
    const here = underside(l.x, l.z, l.y);
    if (here === Infinity) return `${at}: open sky over it`;
    if (Math.abs(here - end[1]) > TOL) return `${at}: mount top ${end[1].toFixed(2)}, ceiling ${here.toFixed(2)}`;
    if (f.model === 'panel' && m > PANEL_GAP + 1e-6) return `${at}: panel ${m.toFixed(2)} m under its ceiling`;
    if (f.model === 'strip' && m > MAX_HANGER + 1e-6) return `${at}: wires ${m.toFixed(2)} m`;
    if (f.model === 'bulkhead') return `${at}: a bulkhead on a ceiling`;
    return '';
  }
  if (f.base !== 'wall' || f.model !== 'bulkhead') return `${at}: base ${f.base}`;
  const ok = boxes.some((p) => bot(p) <= l.y - FITTING.bulkhead.top && top(p) >= l.y + FITTING.bulkhead.top && planGap(p, end[0], end[2]) <= TOL);
  return ok ? '' : `${at}: back (${end[0].toFixed(2)}, ${end[2].toFixed(2)}) on no wall`;
}

/** Distance from p to the segment a-b. */
function segDist(p: readonly number[], a: readonly number[], c: readonly number[]): number {
  const d = [c[0]! - a[0]!, c[1]! - a[1]!, c[2]! - a[2]!];
  const l2 = d[0]! * d[0]! + d[1]! * d[1]! + d[2]! * d[2]!;
  const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((p[0]! - a[0]!) * d[0]! + (p[1]! - a[1]!) * d[1]! + (p[2]! - a[2]!) * d[2]!) / l2)) : 0;
  return Math.hypot(p[0]! - (a[0]! + d[0]! * t), p[1]! - (a[1]! + d[1]! * t), p[2]! - (a[2]! + d[2]! * t));
}
/** Every climbing anchor as segments (a pipe, a ladder, a duct's path), with a name. */
const CLIMBS: [string, number[], number[]][] = [];
for (const a of b.anchors.pipesV) CLIMBS.push([`pipe ${a.base.x}, ${a.base.z}`, [a.base.x, a.base.y, a.base.z], [a.top.x, a.top.y, a.top.z]]);
for (const a of b.anchors.pipesH) CLIMBS.push([`main ${a.a.x}, ${a.a.z} - ${a.b.x}, ${a.b.z}`, [a.a.x, a.a.y, a.a.z], [a.b.x, a.b.y, a.b.z]]);
for (const a of b.anchors.ladders) CLIMBS.push([`ladder ${a.base.x}, ${a.base.z}`, [a.base.x, a.base.y, a.base.z], [a.top.x, a.top.y, a.top.z]]);
for (const a of b.anchors.ducts) for (let i = 0; i + 1 < a.path.length; i++) CLIMBS.push(['duct', [a.path[i]!.x, a.path[i]!.y, a.path[i]!.z], [a.path[i + 1]!.x, a.path[i + 1]!.y, a.path[i + 1]!.z]]);
/** A fitting's centre stays this far from any climbing anchor (a body on it is about 0.3 m either side). */
const CLIMB_CLEAR = 0.8;

describe('Sector Ops LED fittings', () => {
  it('every fixed light is an LED model from its room table (lit and dead), and the tables are the whole registry', () => {
    const rows = SECTIONS.flatMap(([, rooms]) => rooms.flatMap((r) => r.lamps.map(([x, z]) => [x, r.y, z, r.model] as const)));
    expect(fixed.length).toBe(rows.length);
    for (const l of fixed) expect(['panel', 'strip', 'bulkhead'], `light ${l.id}`).toContain(l.fixture?.model);
    for (const [x, y, z, m] of rows) expect(fixed.some((l) => l.x === x && l.y === y && l.z === z && l.fixture?.model === m), `(${x}, ${y}, ${z}) ${m}`).toBe(true);
  });

  it('the mount pass finds every fitting its structure', () => {
    const r = mountLights(b.boxes, fixed);
    expect(r.filter((q) => q.model === null)).toEqual([]);
  });

  for (const [s] of SECTIONS) {
    it(`section ${s}: every fitting sits on its ceiling or wall (3 cm)`, () => {
      const rooms = SECTIONS.find(([k]) => k === s)![1];
      const bad: string[] = [];
      for (const r of rooms) for (const [x, z] of r.lamps) {
        const l = fixed.find((q) => q.x === x && q.y === r.y && q.z === z)!;
        const e = check(l);
        if (e) bad.push(e);
      }
      expect(bad).toEqual([]);
    });
  }

  /** Ceiling fittings the lamp audit moved (LR16d, LR16dx): `<room key> <new x,z>` -> the grid cells they came from (source
   *  order). The production office was re-gridded whole (LR16dx: 3 x 2 panels 1.05 m off its walls), so it is not here. */
  const LR16D_MOVED: Record<string, [number, number][]> = {
    'S3 hall ceiling 18.26,-2.6': [[18, -2.6]], 'S3 hall ceiling 22.15,-2.6': [[23.2, -2.6]], 'S3 hall ceiling 22.15,3.4': [[23.2, 3.4]], 'S3 hall ceiling 22.15,9.4': [[23.2, 9.4]],
  };

  it('one height per room and mount, and the ceiling fittings of a room on a regular grid', () => {
    const bad: string[] = [];
    const hit = new Set<string>();
    for (const [s, rooms] of SECTIONS) {
      const by = new Map<string, LampRoom[]>();
      for (const r of rooms) {
        const k = `S${s} ${r.id} ${r.model === 'bulkhead' ? 'wall' : 'ceiling'}`;
        by.set(k, [...(by.get(k) ?? []), r]);
      }
      for (const [k, rs] of by) {
        const ys = new Set(rs.map((r) => r.y));
        if (ys.size !== 1) bad.push(`${k}: heights ${[...ys].join(', ')}`);
        if (k.endsWith('wall')) continue;
        // (LR16d: a fitting the lamp audit moved off its wall is read at its grid cell, so the grid check still guards the layout)
        const used = new Map<string, number>();
        const cell = (x: number, z: number): [number, number] => {
          const o = LR16D_MOVED[`${k} ${x},${z}`];
          if (!o) return [x, z];
          hit.add(`${k} ${x},${z}`);
          const i = used.get(`${k} ${x},${z}`) ?? 0;
          used.set(`${k} ${x},${z}`, i + 1);
          return o[i]!;
        };
        const lamps = rs.flatMap((r) => r.lamps.map(([x, z]) => cell(x, z)));
        const pts = lamps.map(([x, z]) => `${x},${z}`);
        const xs = [...new Set(lamps.map(([x]) => x))].sort((a, c) => a - c);
        const zs = [...new Set(lamps.map(([, z]) => z))].sort((a, c) => a - c);
        // a full grid: every column on every row
        if (pts.length !== xs.length * zs.length || xs.some((x) => zs.some((z) => !pts.includes(`${x},${z}`)))) bad.push(`${k}: not a full grid (${xs.length} x ${zs.length}, ${pts.length} fittings)`);
        // rows evenly spaced (the roof bays)
        const dz = zs.slice(1).map((z, i) => z - zs[i]!);
        if (dz.length > 1 && Math.max(...dz) - Math.min(...dz) > 0.6) bad.push(`${k}: rows ${zs.join(', ')}`);
      }
    }
    // a key that matches no fitting is stale (the layout moved on): it would hide a real grid fault
    expect(Object.keys(LR16D_MOVED).filter((k) => !hit.has(k))).toEqual([]);
    expect(bad).toEqual([]);
  });

  it('no light on or over a roof: every fitting is under a ceiling or on a wall, and none stands over a roof top', () => {
    const bad: string[] = [];
    for (const l of fixed) {
      const f = under(l.x, l.z, l.y);
      if (f >= 5.9) bad.push(`(${l.x}, ${l.y}, ${l.z}) over a roof at ${f.toFixed(2)}`);
      if (l.fixture?.base !== 'wall' && underside(l.x, l.z, l.y) === Infinity) bad.push(`(${l.x}, ${l.y}, ${l.z}) under open sky`);
    }
    expect(bad).toEqual([]);
  });

  it('no light on traversal geometry: every fitting is clear of the climbing pipes, ladders and ducts', () => {
    const bad: string[] = [];
    for (const l of fixed) for (const [name, a, c] of CLIMBS) {
      const d = segDist([l.x, l.y, l.z], a, c);
      if (d < CLIMB_CLEAR) bad.push(`(${l.x}, ${l.y}, ${l.z}) ${d.toFixed(2)} m from ${name}`);
    }
    expect(bad).toEqual([]);
    // the yard drainpipe (the old lamp sat on it at 3.2 m): its lamp is 1 m to the side
    const pipe = b.anchors.pipesV.find((p) => Math.abs(p.base.x + 22.4) < 0.01)!;
    const near = Math.min(...fixed.map((l) => segDist([l.x, l.y, l.z], [pipe.base.x, pipe.base.y, pipe.base.z], [pipe.top.x, pipe.top.y, pipe.top.z])));
    expect(near).toBeGreaterThanOrEqual(1.0);
  });

  it('all three models are used; every mount has finite links', () => {
    for (const m of ['panel', 'strip', 'bulkhead'] as const) expect(fixed.some((l) => l.fixture!.model === m), m).toBe(true);
    const segs: number[] = [];
    for (const l of fixed) mountLinks(l, segs);
    expect(segs.length % 7).toBe(0);
    // two wires per strip at least
    expect(segs.length / 7).toBeGreaterThanOrEqual(2 * fixed.filter((l) => l.fixture!.model === 'strip').length);
    expect(segs.every(Number.isFinite)).toBe(true);
  });
});

describe('LED fitting models', () => {
  for (const m of ['panel', 'strip', 'bulkhead'] as FittingModel[]) {
    it(`${m}: a body and a face, indices in range, top / back as the mount assumes, a thin flat diffuser`, () => {
      const g = fittingMesh(m);
      for (const a of [g.body, g.face]) {
        expect(a.indices.length).toBeGreaterThan(0);
        expect(a.positions.length).toBe(a.normals.length);
        expect(Math.max(...a.indices)).toBeLessThan(a.positions.length / 3);
      }
      const ax = (a: number[], k: number): number[] => a.filter((_, i) => i % 3 === k);
      if (m === 'bulkhead') {
        expect(Math.min(...ax(g.body.positions, 2))).toBeCloseTo(-FITTING.bulkhead.back, 3);
        expect(Math.max(...ax(g.body.positions, 1))).toBeCloseTo(FITTING.bulkhead.top, 3);
        // the diffuser faces out, flat (under 15 mm deep)
        const fz = ax(g.face.positions, 2);
        expect(Math.max(...fz) - Math.min(...fz)).toBeLessThan(0.015);
      } else {
        expect(Math.max(...ax(g.body.positions, 1))).toBeCloseTo(FITTING[m].top, 3);
        // the diffuser faces down, flat (under 15 mm), its underside at the light
        const fy = ax(g.face.positions, 1);
        expect(Math.max(...fy) - Math.min(...fy)).toBeLessThan(0.015);
        expect(Math.min(...fy)).toBeGreaterThanOrEqual(0);
        expect(Math.min(...fy)).toBeLessThan(0.01);
      }
    });
  }
});
