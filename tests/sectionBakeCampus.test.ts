/**
 * (section-bake) Saltmarsh Park's bake regions (`world/maps/campusBake.ts`) against the section data: every point the
 * mode or the guards use while a section is live (starts, checkpoints, objectives, connectors, the extraction, guards and
 * their routes, takedown spots, reinforcements and their run-ins, the routes, sweeps, keypads, bolts, the crate) and every
 * room corner of the section lies inside its region, so the field there is the full bake's (`sectionBake.test.ts` proves
 * the rest). And at random points of each region no lamp outside the section's set comes within its reach plus the bounce
 * pad (the membership's own promise, checked against the real lights). No bake: cheap.
 * `SECTION_BAKE_FULL=1` adds the heavy check (minutes): section 5's lamps baked through the section baker against a bake of
 * every lamp whose light comes within 20 m of the region (a superset), the field equal at 1500 points of section 5.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { CAMPUS_BAKE } from '../src/world/maps/campusBake';
import { S1_ROOMS } from '../src/world/maps/campusS1';
import { S2_ROOMS } from '../src/world/maps/campusS2';
import { S3_ROOMS } from '../src/world/maps/campusS3';
import { S4_ROOMS } from '../src/world/maps/campusS4';
import { S5_ROOMS } from '../src/world/maps/campusS5';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { LAMP_STRIDE, bakeLamps, type LampResult } from '../src/voxel/lampBake';
import { BOUNCE } from '../src/voxel/lampBounce';
import { AMBIENT_CELL, buildAmbientGrid } from '../src/world/ambientGrid';
import { inSectionRegion, joinBounce, lampLayout, lampSectionMasks, sectionBakeFor, SECTION_MARGIN, type BouncePart } from '../src/world/sectionBake';
import type { SectorDef } from '../src/game/sectors';

/** Every plan point of section `s` the mode, the guards or the players use while it is live. */
function sectionPoints(s: SectorDef): { what: string; x: number; z: number }[] {
  const out: { what: string; x: number; z: number }[] = [];
  const p = (what: string, x: number, z: number): void => {
    out.push({ what, x, z });
  };
  const box = (what: string, b: readonly number[]): void => {
    p(`${what} a`, b[0]!, b[1]!);
    p(`${what} b`, b[2]!, b[3]!);
    p(`${what} c`, b[0]!, b[3]!);
    p(`${what} d`, b[2]!, b[1]!);
  };
  p('start', s.start.x, s.start.z);
  if (s.start2) p('start2', s.start2.x, s.start2.z);
  p('objective', s.objective.x, s.objective.z);
  if (s.connector) {
    const c = s.connector;
    box('connector', c.box);
    p('checkpoint', c.checkpoint.x, c.checkpoint.z);
    if (c.checkpoint2) p('checkpoint2', c.checkpoint2.x, c.checkpoint2.z);
    if (c.nearAt) p('near door', c.nearAt[0], c.nearAt[1]);
    if (c.farAt) p('far door', c.farAt[0], c.farAt[1]);
    for (const u of c.sealUnlocks ?? []) p('seal', u[0], u[1]);
  }
  if (s.extract) box('extract', s.extract.box);
  s.guards.forEach((g, i) => {
    p(`guard ${i}`, g.x, g.z);
    p(`guard ${i} takedown`, g.takedownSpot[0], g.takedownSpot[1]);
    for (const q of g.route ?? []) p(`guard ${i} route`, q[0], q[1]);
  });
  for (const r of s.reinforce) p('reinforce', r[0], r[1]);
  for (const e of s.entries ?? []) {
    p('entry', e.at[0], e.at[1]);
    for (const q of e.route ?? []) p('entry route', q[0], q[1]);
  }
  for (const r of s.routes) for (const q of r.pts) p(`route ${r.name}`, q[0], q[1]);
  for (const q of s.sweep ?? []) p('sweep', q[0], q[1]);
  for (const k of s.keypads ?? []) p('keypad', k.at[0], k.at[1]);
  for (const b of s.bolts ?? []) p('bolt', b.at[0], b.at[1]);
  if (s.crate) p('crate', s.crate.at[0], s.crate.at[2]);
  return out;
}

const ROOMS = [S1_ROOMS, S2_ROOMS, S3_ROOMS, S4_ROOMS, S5_ROOMS];

describe('campus bake regions', () => {
  it('campusOps bakes per section, one region per section', () => {
    expect(sectionBakeFor('campusOps')).toBe(CAMPUS_BAKE);
    expect(CAMPUS_BAKE.regions.length).toBe(CAMPUS_SECTORS.length);
  });

  it('every point of each section and every room corner lies inside its region', () => {
    const miss: string[] = [];
    CAMPUS_SECTORS.forEach((s, k) => {
      for (const q of sectionPoints(s)) if (!inSectionRegion(CAMPUS_BAKE, k, q.x, q.z)) miss.push(`${s.id} ${q.what} (${q.x}, ${q.z})`);
      for (const r of ROOMS[k]!) {
        for (const [x, z] of [[r.minX, r.minZ], [r.maxX, r.maxZ], [r.minX, r.maxZ], [r.maxX, r.minZ]] as const) if (!inSectionRegion(CAMPUS_BAKE, k, x, z)) miss.push(`${s.id} room ${r.id} (${x}, ${z})`);
      }
    });
    expect(miss, miss.slice(0, 20).join('\n')).toEqual([]);
  });

  it('no lamp outside a section\'s set reaches a point of its region (reach + bounce pad), every section has lamps', () => {
    const b = new LevelBuilder();
    campusOps.build(b, 0);
    const baked = bakedLights(b.lights);
    const L = baked.lights;
    const n = L.length / LAMP_STRIDE;
    const masks = lampSectionMasks(L, CAMPUS_BAKE);
    // (influence: the reach, the bounce's reach, its receivers' grown cell and a read's blend)
    const pad = BOUNCE.reach + 2 * AMBIENT_CELL;
    let seed = 7;
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const counts: number[] = [];
    for (let k = 0; k < CAMPUS_BAKE.regions.length; k++) {
      const bit = 1 << k;
      let c = 0;
      for (let i = 0; i < n; i++) if (masks[i]! & bit) c++;
      counts.push(c);
      const rs = CAMPUS_BAKE.regions[k]!;
      let bad = '';
      for (let t = 0; t < 2000 && !bad; t++) {
        const r = rs[t % rs.length]!;
        const x = r[0] - SECTION_MARGIN + (r[2] - r[0] + 2 * SECTION_MARGIN) * rnd();
        const z = r[1] - SECTION_MARGIN + (r[3] - r[1] + 2 * SECTION_MARGIN) * rnd();
        for (let i = 0; i < n && !bad; i++) {
          if (masks[i]! & bit) continue;
          const o = i * LAMP_STRIDE;
          // (plan distance on each axis: the influence square)
          const d = Math.max(Math.abs(L[o]! - x), Math.abs(L[o + 2]! - z));
          if (d <= L[o + 3]! + pad) bad = `lamp ${i} at (${L[o]}, ${L[o + 2]}) reach ${L[o + 3]} vs (${x.toFixed(1)}, ${z.toFixed(1)})`;
        }
      }
      expect(bad, `section ${k + 1}`).toBe('');
    }
    expect(counts.every((c) => c > 0 && c < n), counts.join(',')).toBe(true);
    // (the build report's numbers)
    console.log(`campus lamps ${n}; per section ${counts.join(' / ')}`);
  });
});

describe.skipIf(!process.env.SECTION_BAKE_FULL)('campus section 5 against a superset bake (heavy)', () => {
  it('the field at section 5\'s points is the same with its set as with every lamp near it', async () => {
    const { canonicalLightSet } = await import('../src/voxel/lightShapes');
    const { dressingOn } = await import('../src/world/detailPass');
    const { LightField } = await import('../src/world/lightField');
    const b = new LevelBuilder();
    campusOps.build(b, 0);
    const reg = b.lights;
    reg.ambient = campusOps.theme.lightLevel ?? 0.75;
    const set = canonicalLightSet(b.boxes, b.cylinders, 'campusOps', dressingOn(campusOps));
    const baked = bakedLights(reg);
    const L = baked.lights;
    const n = L.length / LAMP_STRIDE;
    const masks = lampSectionMasks(L, CAMPUS_BAKE);
    const k = 4;
    const rs = CAMPUS_BAKE.regions[k]!;
    // the superset: every lamp whose plan square comes within 20 m of the region (each baked alone, as the workers do)
    const near = (i: number): boolean =>
      rs.some((r) => {
        const o = i * LAMP_STRIDE;
        const h = L[o + 3]! + 20;
        return L[o]! + h >= r[0] && L[o]! - h <= r[2] && L[o + 2]! + h >= r[1] && L[o + 2]! - h <= r[3];
      });
    const lay = lampLayout(L, set.lo, set.hi);
    const parts = new Map<number, LampResult>();
    for (let i = 0; i < n; i++) if (near(i)) parts.set(i, bakeLamps({ kind: 'lamps', id: i, shapes: set.shapes, lights: L.slice(i * LAMP_STRIDE, (i + 1) * LAMP_STRIDE), lo: set.lo, hi: set.hi }));
    const ambient = buildAmbientGrid({ ambientAt: () => 0.1 }, set.lo, set.hi);
    const field = (f: (i: number) => boolean): InstanceType<typeof LightField> => {
      const vis = new Uint8Array(lay.cells);
      const bp: (BouncePart | null)[] = [];
      for (let i = 0; i < n; i++) {
        const p = f(i) ? parts.get(i) : undefined;
        if (p) vis.set(p.vis, lay.at[i]!);
        bp.push(p?.bounce && p.bounce.data.length ? { box: p.bounce.boxes, data: p.bounce.data, bits: p.bounce.bits ?? new Uint16Array(0) } : null);
      }
      const r: LampResult = { kind: 'lamps', id: 0, boxes: lay.boxes, vis, bounce: joinBounce(bp) };
      const bake: LightBake = { lo: set.lo, hi: set.hi, lampKey: null, moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n: [1, 1, 1], cell: 1, vis: new Uint8Array([0]), dir: [0, 1, 0] }, ambient, moonLight: 0, ms: 0 };
      return new LightField(bake, reg, []);
    };
    const fSet = field((i) => (masks[i]! & (1 << k)) !== 0);
    const fSup = field(near);
    let bad = 0;
    for (let t = 0; t < 1500; t++) {
      const r = rs[t % rs.length]!;
      const x = r[0] + (r[2] - r[0]) * ((t * 0.618) % 1);
      const z = r[1] + (r[3] - r[1]) * ((t * 0.414) % 1);
      const y = 0.2 + 8 * ((t * 0.271) % 1);
      if (fSet.levelAt(x, y, z) !== fSup.levelAt(x, y, z)) bad++;
    }
    expect(bad).toBe(0);
  }, 1_800_000);
});
