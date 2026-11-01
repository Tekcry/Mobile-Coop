/**
 * Shadow accuracy probe (sector-redesign shadow audit, Michael ~14:45). Read-only: builds maps in node, bakes them with
 * the pure bakers as `tests/warehouseS1Light.test.ts` does, prints numbers to PROBE_OUT. Results:
 * docs/sector-redesign/checks/shadow-audit.md. (LR16a: one light model, the photometric lamps and the fixes always on.)
 */
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { LevelBuilder } from '@src/world/levelBuilder';
import { MAPS } from '@src/world/maps/index';
import { dressingOn } from '@src/world/detailPass';
import { canonicalLightSet } from '@src/voxel/lightShapes';
import { bakeLamps, BOX_STRIDE, LAMP_CELL, LAMP_STRIDE } from '@src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '@src/voxel/skyBake';
import { bakedLights, type LightBake } from '@src/world/lightBake';
import { ambientFromGrid, AMBIENT_CELL, buildAmbientGrid } from '@src/world/ambientGrid';
import { bakeVisSampler, doorSeen, DOORS_PER_LAMP, LightField, trilinear, type FieldDoor } from '@src/world/lightField';
import { moonLight } from '@src/world/lampMath';
import { LIGHT } from '@src/world/lights';
import type { MapDef } from '@src/world/mapDef';

const OUT = process.env.PROBE_OUT ?? 'shadow-probe.json';
const MAP_IDS = (process.env.PROBE_MAPS ?? 'ctcourse,warehouse').split(',');
const out: Record<string, unknown> = { mode: 'photometric' };
const r3 = (v: number): number => Math.round(v * 1000) / 1000;
const band = (v: number): number => (v < LIGHT.shadow ? 0 : v < LIGHT.lit ? 1 : 2);

type Box = LevelBuilder['boxes'][number];
const inSolid = (boxes: readonly Box[], x: number, y: number, z: number, pad: number): boolean => {
  for (const bx of boxes) {
    if (!bx.collide || bx.glass) continue;
    const y0 = bx.c[1] - bx.s[1] / 2;
    const y1 = bx.c[1] + bx.s[1] / 2;
    if (y < y0 - pad || y > y1 + pad) continue;
    const c = Math.cos(-bx.yaw);
    const s = Math.sin(-bx.yaw);
    const dx = x - bx.c[0];
    const dz = z - bx.c[2];
    const lx = dx * c + dz * s;
    const lz = -dx * s + dz * c;
    if (Math.abs(lx) <= bx.s[0] / 2 + pad && Math.abs(lz) <= bx.s[2] / 2 + pad) return true;
  }
  return false;
};

function bake(map: MapDef | null, b: LevelBuilder, id: string): { shut: LightField; open: LightField; bk: LightBake; doors: FieldDoor[] } {
  const reg = b.lights;
  const set = canonicalLightSet(b.boxes, b.cylinders, id, map ? dressingOn(map) : false);
  reg.ambient = map?.theme.lightLevel ?? 0.1;
  const mL = map ? moonLight(map.theme) : 0;
  const sky = Math.max(0, reg.ambient - mL);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, set.lo, set.hi);
  const s = map?.theme.sunDir ?? [0, -1, 0];
  const l = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
  const dir: [number, number, number] = [-s[0] / l, -s[1] / l, -s[2] / l];
  const n = [0, 1, 2].map((k) => Math.max(1, Math.ceil((set.hi[k]! - set.lo[k]!) / MOON_CELL))) as [number, number, number];
  const m = bakeMoon({ kind: 'moon', id: 0, origin: set.lo, n, shapes: set.shapes, dir });
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  const bk: LightBake = { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: mL, ms: 0 };
  const shutDoors = b.anchors.doors.map((anchor) => ({ anchor, open: 0 }));
  return { shut: new LightField(bk, reg, shutDoors), open: new LightField(bk, reg, b.anchors.doors.map((anchor) => ({ anchor, open: 1 }))), bk, doors: shutDoors };
}

/** (1) Ambient fill: the field reads the nearest 1 m cell, the shader's `lampAmb` texture is BILINEAR (trilinear in 3D). */
function ambientParity(bk: LightBake, boxes: readonly Box[]) {
  const g = bk.ambient;
  let n = 0;
  let over3 = 0;
  let over10 = 0;
  let max = 0;
  let at: number[] = [];
  for (let x = bk.lo[0] + 0.125; x < bk.hi[0]; x += 0.25) {
    for (let z = bk.lo[2] + 0.125; z < bk.hi[2]; z += 0.25) {
      for (const y of [1.0, 1.6]) {
        if (inSolid(boxes, x, y, z, 0.05)) continue;
        const near = ambientFromGrid(g, x, y, z);
        const tri = trilinear(g.data, 0, g.origin[0], g.origin[1], g.origin[2], g.n[0], g.n[1], g.n[2], AMBIENT_CELL, x, y, z);
        const d = Math.abs(near - tri);
        n++;
        if (d > 0.03) over3++;
        if (d > 0.1) over10++;
        if (d > max) {
          max = d;
          at = [r3(x), y, r3(z), r3(near), r3(tri)];
        }
      }
    }
  }
  return { points: n, over003: over3, over010: over10, max: r3(max), maxAt: at };
}

/** (1) The body's pixels against the meter: the visible surface taps the atlas 0.22 (capsule) + 0.2 (`dq` offset) m off
 *  the axis the meter samples. Static level only (no torches). */
function bodyEdge(f: LightField, boxes: readonly Box[], lo: number[], hi: number[], floorY = 0) {
  const R = 0.42;
  let n = 0;
  let over3 = 0;
  let flips = 0;
  let edge = 0;
  let edgeFlips = 0;
  let sumDev = 0;
  let maxDev = 0;
  for (let x = lo[0]! + 0.25; x < hi[0]!; x += 0.5) {
    for (let z = lo[2]! + 0.25; z < hi[2]!; z += 0.5) {
      const y = floorY + 1.02;
      if (inSolid(boxes, x, y, z, 0.25)) continue;
      const axis = f.levelAt(x, y, z);
      let mx = axis;
      let mn = axis;
      let dev = 0;
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        const tx = x + Math.cos(a) * R;
        const tz = z + Math.sin(a) * R;
        if (inSolid(boxes, tx, y, tz, 0)) continue;
        const v = f.levelAt(tx, y, tz);
        if (v > mx) mx = v;
        if (v < mn) mn = v;
        dev = Math.max(dev, Math.abs(v - axis));
      }
      n++;
      sumDev += dev;
      if (dev > maxDev) maxDev = dev;
      if (dev > 0.03) over3++;
      const flip = band(mx) !== band(axis) || band(mn) !== band(axis);
      if (flip) flips++;
      // an edge point: the level changes by more than 0.1 across the body
      if (mx - mn > 0.1) {
        edge++;
        if (flip) edgeFlips++;
      }
    }
  }
  return { points: n, meanMaxDev: r3(sumDev / Math.max(1, n)), maxDev: r3(maxDev), devOver003: over3, bandFlips: flips, edgePoints: edge, edgeBandFlips: edgeFlips };
}

/** (2) Doors past `DOORS_PER_LAMP` per lamp: their closed leaves never cut that lamp (field and shaders alike). */
function doorCap(b: LevelBuilder, bk: LightBake, shut: LightField, doors: FieldDoor[], fixedField: LightField) {
  const seen = bakeVisSampler(bk.lamps!.r);
  let seenOverCap = 0;
  let fixedLeakOver3 = 0;
  let fixedLeakMax = 0;
  const L = bk.lamps!.baked.lights;
  const n = L.length / LAMP_STRIDE;
  const counts: number[] = [];
  let capped = 0;
  let leakPts = 0;
  let leakOver3 = 0;
  let leakMax = 0;
  const worst: unknown[] = [];
  for (let i = 0; i < n; i++) {
    const o = i * LAMP_STRIDE;
    const near: { k: number; d: number }[] = [];
    doors.forEach((dr, k) => {
      const a = dr.anchor;
      const cx = a.hinge.x + Math.sin(a.yaw) * a.width * 0.5;
      const cz = a.hinge.z + Math.cos(a.yaw) * a.width * 0.5;
      const d = Math.hypot(cx - L[o]!, a.hinge.y + a.height * 0.5 - L[o + 1]!, cz - L[o + 2]!);
      if (d < L[o + 3]! + a.width) near.push({ k, d });
    });
    counts.push(near.length);
    if (near.length <= DOORS_PER_LAMP) continue;
    if (near.filter(({ k }) => doorSeen(seen, i, doors[k]!)).length > DOORS_PER_LAMP) seenOverCap++;
    capped++;
    near.sort((p, q) => p.d - q.d);
    // the dropped doors: points beyond the leaf (away from the lamp) whose segment to the lamp crosses that closed leaf
    for (const { k } of near.slice(DOORS_PER_LAMP)) {
      const a = doors[k]!.anchor;
      const ux = Math.sin(a.yaw);
      const uz = Math.cos(a.yaw);
      const nx = uz;
      const nz = -ux;
      const cx = a.hinge.x + ux * a.width * 0.5;
      const cz = a.hinge.z + uz * a.width * 0.5;
      const side = (L[o]! - cx) * nx + (L[o + 2]! - cz) * nz > 0 ? -1 : 1;
      let worstHere = 0;
      for (let t = 0.3; t <= 3.01; t += 0.3) {
        for (const lat of [-0.3, 0, 0.3]) {
          for (const h of [0.3, 1.0, 1.6]) {
            const px = cx + nx * side * t + ux * lat * a.width;
            const pz = cz + nz * side * t + uz * lat * a.width;
            const py = a.hinge.y + h;
            if (!shut.doorBlocks(L[o]!, L[o + 1]!, L[o + 2]!, px, py, pz)) continue;
            const v = shut.lampAt(i, px, py, pz);
            leakPts++;
            if (v > 0.03) leakOver3++;
            if (v > leakMax) leakMax = v;
            const w = fixedField.lampAt(i, px, py, pz);
            if (w > 0.03) fixedLeakOver3++;
            if (w > fixedLeakMax) fixedLeakMax = w;
            if (v > worstHere) worstHere = v;
          }
        }
      }
      if (worstHere > 0.03 && worst.length < 12) worst.push({ lamp: [r3(L[o]!), r3(L[o + 1]!), r3(L[o + 2]!)], door: a.id ?? k, leak: r3(worstHere) });
    }
  }
  counts.sort((p, q) => p - q);
  return { lamps: n, doors: doors.length, medianDoorsInReach: counts[Math.floor(counts.length / 2)] ?? 0, maxDoorsInReach: counts[counts.length - 1] ?? 0, lampsOverCap: capped, leakPoints: leakPts, leakOver003: leakOver3, leakMax: r3(leakMax), worst, fix: { seenOverCap, leakOver003: fixedLeakOver3, leakMax: r3(fixedLeakMax) } };
}

/** Atlas bytes (the R8 visibility boxes). */
const atlasBytes = (bk: LightBake): number => {
  const B = bk.lamps!.r.boxes;
  let s = 0;
  for (let i = 0; i < B.length / BOX_STRIDE; i++) s += B[i * BOX_STRIDE + 3]! * B[i * BOX_STRIDE + 4]! * B[i * BOX_STRIDE + 5]!;
  return s;
};

for (const id of MAP_IDS) {
  it(`map ${id}`, () => {
    const map = MAPS.find((m) => m.id === id);
    if (!map) {
      out[id] = 'no such map';
      return;
    }
    const b = new LevelBuilder();
    map.build(b, 0);
    const t0 = performance.now();
    const { shut, bk, doors } = bake(map, b, id);
    const res: Record<string, unknown> = { bakeMs: Math.round(performance.now() - t0), atlasMB: r3(atlasBytes(bk) / 1e6), lampCell: LAMP_CELL };
    res.ambient = ambientParity(bk, b.boxes);
    res.body = bodyEdge(shut, b.boxes, bk.lo, bk.hi);
    const fixedField = new LightField(bk, b.lights, doors);
    res.doors = doorCap(b, bk, shut, doors, fixedField);
    out[id] = res;
    writeFileSync(OUT, JSON.stringify(out, null, 1));
  }, 600_000);
}

/** (1) A wall edge against exact geometry: a bulb at (0, 4, 0), a 0.2 m wall at x 1.0-1.2, 3 m high; the shadow line
 *  at chest height (1.2 m) behind it is where the ray over the wall's far top corner (1.2, 3) lands: x = 1.2 x 2.8 / 1. */
it('synthetic wall edge', () => {
  const b = new LevelBuilder();
  b.box(0, -0.1, 0, 30, 0.2, 30, '#888');
  b.box(1.1, 1.5, 0, 0.2, 3, 10, '#888');
  b.lights.add({ x: 0, y: 4, z: 0, radius: 10, intensity: 1 });
  const { shut, bk } = bake(null, b, 'synthetic');
  const res: Record<string, unknown> = { lampCell: LAMP_CELL, radius: b.lights.lights[0]!.radius, atlasCells: atlasBytes(bk) };
  for (const y of [0.1, 1.2, 1.6]) {
    const exact = 1.2 * (4 - y) / 1;
    let x50 = NaN;
    let x10 = NaN;
    let x90 = NaN;
    let prev = 0;
    for (let x = 1.25; x < 9; x += 0.005) {
      const v = shut.visAt(0, x, y, 0);
      if (prev < 0.9 && v >= 0.9) x90 = x;
      if (prev < 0.5 && v >= 0.5) x50 = x;
      if (prev < 0.1 && v >= 0.1) x10 = x;
      prev = v;
    }
    // (x beyond the wall: the shadow ends where the ray over the far top corner reaches y; it is dark from the wall to there)
    res[`y${y}`] = { exactEdge: r3(exact), vis50: r3(x50), vis90: r3(x90), vis10: r3(x10), shift50: r3(x50 - exact), width10to90: r3(Math.abs(x10 - x90)) };
  }
  // a bulb right over the wall top is not the case here: the march stops 0.25 m short of the light (NEAR_LIGHT)
  out.synthetic = res;
  writeFileSync(OUT, JSON.stringify(out, null, 1));
}, 120_000);

/** (3) A guard's flashlight (`TORCH`: radius 13, outer 0.34 rad, cos^2 cone, linear falloff) in the field against what
 *  Babylon draws: on the level (standard falloff: the same function) and on a PBR material left at Babylon's default
 *  physical falloff (the operator figures, weapons): 1 / d^2 with no range, a Gaussian cone
 *  exp2(6.644 x (cos - 1) / (1 - cos(outer))). Both scaled to the field's units (`LIGHT_GAIN / LAMP_LEVEL_GAIN` cancels).
 *  And an unshadowed torch whose beam a wall cuts at D: Babylon's range is `reach` = D + 0.4, so 1 - d / reach. */
it('torch math', () => {
  const R = 13;
  const outer = 0.34;
  const kappa = 6.64385618977 / (1 - Math.cos(outer));
  const field = (d: number, a: number): number => (d >= R || a > outer ? 0 : (1 - d / R) * Math.cos(a) ** 2);
  const phys = (d: number, a: number): number => (1 / Math.max(d * d, 1e-4)) * 2 ** (kappa * (Math.cos(a) - 1));
  const rows: unknown[] = [];
  for (const d of [1, 2, 3, 4, 6, 8, 10]) {
    const row: Record<string, number> = { d };
    for (const a of [0, 0.1, 0.2, 0.3]) row[`ratio@${a}`] = r3(phys(d, a) / field(d, a));
    row.fieldOnAxis = r3(1.2 * 0.85 * field(d, 0));
    row.figureOnAxis = r3(1.2 * 0.85 * phys(d, 0));
    rows.push(row);
  }
  const cut: unknown[] = [];
  for (const D of [1.5, 3, 5, 8]) {
    const reach = Math.min(R, D + 0.4);
    const row: Record<string, number> = { wallAt: D, reach: r3(reach) };
    for (const f of [0.25, 0.5, 0.75, 1]) {
      const d = D * f;
      row[`ratio@${f}D`] = r3(Math.max(0, 1 - d / reach) / (1 - d / R));
    }
    cut.push(row);
  }
  out.torch = { figurePhysical: rows, unshadowedCut: cut };
  writeFileSync(OUT, JSON.stringify(out, null, 1));
});
