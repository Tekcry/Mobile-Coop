/**
 * (sector-redesign ART-KIT step 8, ART-PLAN 2 "Delta gate", A122) The campus art light gate: the campus light field
 * baked greybox (`buildCampus(b, { dress: false })`) and dressed (`campusOps.build`) in node with the pure bakers, as
 * `tests/ctcourseLight.test.ts` does, and every protected point of every section (route legs every 1 m, takedown
 * spots, hide spots, lip tops) held within 0.02 of the greybox level (`LightField.totalAt` at feet + 1.0 m). A solid
 * prop that shades a planned lit pool or lights a planned dark pocket fails here. When the dressed light shapes hash
 * the same as the greybox's (no solid art box), the two fields are the same by construction and nothing is baked.
 * `CAMPUS_ART_LIGHT_PRINT=1` prints the worst 20 points per section. Data-driven: the section slices never edit it.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCampus, campusOps } from '../src/world/maps/campusOps';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { CAMPUS_COOP_LIPS } from '../src/world/maps/campusLips';
import { dressingOn } from '../src/world/detailPass';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField } from '../src/world/lightField';
import { moonLight } from '../src/world/lampMath';
import type { MapLayout } from '../src/world/mapDef';
import { hyp2 } from '../src/core/mathx';

const GATE = 0.02;
const PRINT = !!process.env.CAMPUS_ART_LIGHT_PRINT;

let same = false;
let fG: LightField | null = null;
let fD: LightField | null = null;
let layG: MapLayout;

/** The light field of a built campus (the pure bakers, as `World.create` + `bakeLevelLight`; doors open). */
function field(b: LevelBuilder): LightField {
  const set = canonicalLightSet(b.boxes, b.cylinders, 'campusOps', dressingOn(campusOps));
  const reg = b.lights;
  reg.ambient = campusOps.theme.lightLevel ?? 0.75;
  const mL = moonLight(campusOps.theme);
  const sky = Math.max(0, reg.ambient - mL);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, set.lo, set.hi);
  const s = campusOps.theme.sunDir;
  const l = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
  const dir: [number, number, number] = [-s[0] / l, -s[1] / l, -s[2] / l];
  const n: [number, number, number] = [0, 1, 2].map((k) => Math.max(1, Math.ceil((set.hi[k]! - set.lo[k]!) / MOON_CELL))) as [number, number, number];
  const m = bakeMoon({ kind: 'moon', id: 0, origin: set.lo, n, shapes: set.shapes, dir });
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  const bake: LightBake = { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: mL, ms: 0 };
  return new LightField(bake, reg, b.anchors.doors.map((anchor) => ({ anchor, open: 1 })));
}

beforeAll(() => {
  const bG = new LevelBuilder();
  layG = buildCampus(bG, { dress: false });
  const bD = new LevelBuilder();
  campusOps.build(bD, 0);
  const hG = canonicalLightSet(bG.boxes, bG.cylinders, 'campusOps', dressingOn(campusOps)).hash;
  const hD = canonicalLightSet(bD.boxes, bD.cylinders, 'campusOps', dressingOn(campusOps)).hash;
  same = hG === hD;
  if (same) return;
  fG = field(bG);
  fD = field(bD);
}, 600_000);

/** Section k's protected points (feet): its route legs every 1 m, takedown spots, hide spots, the lip tops. */
function points(k: number): { what: string; x: number; y: number; z: number }[] {
  const sec = CAMPUS_SECTORS[k]!;
  const out: { what: string; x: number; y: number; z: number }[] = [];
  for (const r of sec.routes) {
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i]!;
      const b = r.pts[i + 1]!;
      const ya = a[2] ?? 0;
      const yb = b[2] ?? 0;
      const len = hyp2(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(len));
      for (let j = 0; j <= n; j++) out.push({ what: `${r.name} leg ${i}`, x: a[0] + ((b[0] - a[0]) * j) / n, y: ya + ((yb - ya) * j) / n, z: a[1] + ((b[1] - a[1]) * j) / n });
    }
  }
  sec.guards.forEach((g, i) => out.push({ what: `guard ${i} takedown spot`, x: g.takedownSpot[0], y: g.y ?? 0, z: g.takedownSpot[1] }));
  for (const h of layG.hideSpots ?? []) if (h.section === k) out.push({ what: 'hide spot', x: h.pos.x, y: h.pos.y, z: h.pos.z });
  for (const l of CAMPUS_COOP_LIPS) if (l.section === k) out.push({ what: `lip ${l.id} top`, x: (l.top.x0 + l.top.x1) / 2, y: l.top.top, z: (l.top.z0 + l.top.z1) / 2 });
  return out;
}

for (let k = 0; k < CAMPUS_SECTORS.length; k++) {
  describe(`S${k + 1}`, () => {
    it(`every protected point stays within ${GATE} of the greybox light level (feet + 1.0)`, () => {
      const pts = points(k);
      expect(pts.length).toBeGreaterThan(10);
      if (same) return;
      const rows = pts.map((p) => {
        const g = fG!.totalAt(p.x, p.y + 1.0, p.z);
        const d = fD!.totalAt(p.x, p.y + 1.0, p.z);
        return { ...p, g, d, delta: d - g };
      });
      rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      if (PRINT) console.info(`S${k + 1} worst:\n${rows.slice(0, 20).map((r) => `  ${r.what} (${r.x.toFixed(1)}, ${r.y.toFixed(1)}, ${r.z.toFixed(1)}) ${r.g.toFixed(3)} -> ${r.d.toFixed(3)} (${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(3)})`).join('\n')}`);
      expect(rows.filter((r) => Math.abs(r.delta) > GATE).map((r) => `${r.what} (${r.x.toFixed(1)}, ${r.y.toFixed(1)}, ${r.z.toFixed(1)}) ${r.g.toFixed(3)} -> ${r.d.toFixed(3)}`)).toEqual([]);
    }, 600_000);
  });
}
