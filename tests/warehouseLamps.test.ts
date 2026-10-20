/**
 * Sector Ops lamp fittings (warehouse-lamps; Michael 2026-10-20: "The sector ops lights are not sitting properly on the
 * ceilings, some are even above ceilings or just floating"). The real warehouseOps build: every fixed light of each
 * section has a fitting model, and its mount meets the structure: a hung fitting's rod or hangers end within 3 cm of the
 * underside of the lowest piece over them (nothing cuts the fitting or the rod), a bulkhead's arm ends within 3 cm of a
 * wall face, a mast's foot within 3 cm of the roof or deck under it. The exceptions (no mount) are an exact list. The
 * lights themselves do not move (the light tests of each section pin their levels). The checks here scan the boxes
 * themselves, not through `lampMount.ts`.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { S1_LIGHT_PASS } from '../src/world/maps/warehouseS1';
import { S2_LIGHT_PASS } from '../src/world/maps/warehouseS2';
import { S3_LIGHT_PASS } from '../src/world/maps/warehouseS3';
import { FITTING, MAX_DROP, MAX_HANGER, mountEnd, mountLinks } from '../src/world/lampMount';
import { fittingMesh } from '../src/world/fixtureModels';
import type { FittingModel, LightDef } from '../src/world/lights';

const b = new LevelBuilder();
warehouseOps.build(b, 0);
const fixed = b.lights.lights.filter((l) => l.kind !== 'flashlight' && l.fixture);
const boxes = b.boxes.filter((p) => !p.detail && p.visible !== false);
const TOL = 0.03;

/** The section a light belongs to, by its circuit (S1 20 and 30-36, S2 40-42, S3 50-58). */
const sectionOf = (l: LightDef): 1 | 2 | 3 | 0 => (l.group === 20 || (l.group >= 30 && l.group <= 36) ? 1 : l.group >= 40 && l.group <= 42 ? 2 : l.group >= 50 && l.group <= 58 ? 3 : 0);

/** Plan point (x, z) in the box's footprint grown by `pad`, and the plan distance outside it. */
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

/** One line per light: where it is and what went wrong (empty = ok). */
function check(l: LightDef): string {
  const f = l.fixture!;
  const end = mountEnd(l);
  if (!f.model || !end) return 'no model';
  const at = `(${l.x}, ${l.y}, ${l.z}) ${f.model}`;
  const m = f.mount ?? 0;
  if (f.base === 'ceiling') {
    const bodyTop = l.y + FITTING[f.model].top;
    // nothing over the light below the mount's top (the fitting and the rod are not inside or above a slab)
    const here = underside(l.x, l.z, l.y);
    if (here < end[1] - TOL && !f.strut) return `${at}: a piece at ${here.toFixed(2)} under its mount top ${end[1].toFixed(2)}`;
    if (bodyTop > here + TOL) return `${at}: body top ${bodyTop.toFixed(2)} above the ceiling ${here.toFixed(2)}`;
    const ceil = underside(end[0], end[2], l.y);
    if (Math.abs(ceil - end[1]) > TOL) return `${at}: mount top ${end[1].toFixed(2)}, ceiling there ${ceil === Infinity ? 'open' : ceil.toFixed(2)}`;
    if (f.model === 'batten' && m > MAX_HANGER + 1e-6) return `${at}: hangers ${m.toFixed(2)} m`;
    if (m > MAX_DROP + 1e-6) return `${at}: rod ${m.toFixed(2)} m`;
    return '';
  }
  if (f.base === 'wall') {
    const ok = boxes.some((p) => bot(p) <= l.y && top(p) >= l.y && planGap(p, end[0], end[2]) <= TOL);
    return ok ? '' : `${at}: arm end (${end[0].toFixed(2)}, ${end[2].toFixed(2)}) on no wall`;
  }
  const ok = boxes.some((p) => Math.abs(top(p) - end[1]) <= TOL && planGap(p, end[0], end[2]) === 0);
  return ok ? '' : `${at}: mast foot ${end[1].toFixed(2)} on nothing`;
}

/** No mount: the lamp keeps its plain box (listed in the PR). Each [x, y, z, why]. */
const EXCEPTIONS: [number, number, number, string][] = [
  [11.25, 2.45, -22.45, 'section 1 yard: the lamp sits inside the container box (x 6-12, z -24.2 to -21.8, top 2.6)'],
];

describe('Sector Ops lamp fittings', () => {
  it('each section has its pass lamps and every fixed light is in a section', () => {
    for (const l of fixed) expect(sectionOf(l), `light ${l.id} group ${l.group}`).not.toBe(0);
    for (const [pass, s] of [[S1_LIGHT_PASS, 1], [S2_LIGHT_PASS, 2], [S3_LIGHT_PASS, 3]] as const) {
      for (const [x, y, z] of pass) expect(fixed.some((l) => sectionOf(l) === s && l.x === x && l.y === y && l.z === z), `section ${s} lamp (${x}, ${y}, ${z})`).toBe(true);
    }
  });

  for (const s of [1, 2, 3] as const) {
    it(`section ${s}: every fitting sits on its ceiling, wall or roof (3 cm)`, () => {
      const bad: string[] = [];
      for (const l of fixed) {
        if (sectionOf(l) !== s || EXCEPTIONS.some(([x, y, z]) => l.x === x && l.y === y && l.z === z)) continue;
        const r = check(l);
        if (r) bad.push(r);
      }
      expect(bad).toEqual([]);
    });
  }

  it('the exceptions are exactly the listed lamps', () => {
    const none = fixed.filter((l) => !l.fixture!.model).map((l) => [l.x, l.y, l.z]);
    expect(none).toEqual(EXCEPTIONS.map(([x, y, z]) => [x, y, z]));
  });

  it('all three models are used; counts per section (the PR table)', () => {
    const count: Record<string, number> = {};
    for (const l of fixed) {
      const k = `S${sectionOf(l)} ${l.fixture!.model ?? 'none'} ${l.fixture!.base ?? ''}`;
      count[k] = (count[k] ?? 0) + 1;
    }
    for (const m of ['dome', 'batten', 'bulkhead'] as const) expect(fixed.some((l) => l.fixture!.model === m), m).toBe(true);
    if (process.env.LAMPS_PRINT) console.log(count);
  });

  it('every mount has its links (rods, hangers, arms, struts, masts), all finite', () => {
    const segs: number[] = [];
    for (const l of fixed) mountLinks(l, segs);
    expect(segs.length % 7).toBe(0);
    expect(segs.length / 7).toBeGreaterThan(fixed.length);
    expect(segs.every(Number.isFinite)).toBe(true);
  });
});

describe('fitting models', () => {
  for (const m of ['dome', 'batten', 'bulkhead'] as FittingModel[]) {
    it(`${m}: a body and a face, indices in range, top / back as the mount assumes`, () => {
      const g = fittingMesh(m);
      for (const a of [g.body, g.face]) {
        expect(a.indices.length).toBeGreaterThan(0);
        expect(a.positions.length).toBe(a.normals.length);
        expect(Math.max(...a.indices)).toBeLessThan(a.positions.length / 3);
      }
      const ys = g.body.positions.filter((_, i) => i % 3 === 1);
      const zs = g.body.positions.filter((_, i) => i % 3 === 2);
      if (m === 'bulkhead') expect(Math.min(...zs)).toBeCloseTo(-FITTING.bulkhead.back, 3);
      else expect(Math.max(...ys)).toBeCloseTo(FITTING[m].top, 3);
    });
  }
});
