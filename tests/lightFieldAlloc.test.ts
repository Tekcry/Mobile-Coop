/**
 * (F57, sector-ops cue-alloc-fix) The light field's meter / guard / cue queries allocate nothing, and the fix moved no
 * level by a bit.
 *
 * The leak: `levelInto` passed the point as x, y, z to the bounce grid's out-of-line `BounceGrid.sampleInto`, so V8
 * boxed three doubles a query wherever the bounce is lit (1296 B a 3-player `ShadowCues.fill`, 128 B a 3-player meter
 * tick). Now the point goes through `LightField.pt` -> `BounceGrid.q` (`sampleQ`), and `totalInto` / `levelInto` /
 * `dynamicInto` read it from `pt` too (as `dynTermInto` did), so no double crosses those calls whatever V8 inlines.
 *
 * Parity: the table below was read on origin/master a7853bed4 (before F57) from this scene; every query is compared
 * with `Object.is` (to the bit). A deliberate change to the light maths changes it: re-read the table then.
 */
import { describe, expect, it } from 'vitest';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightRegistry, makeCone, type LightDef } from '../src/world/lights';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { packShapes, type VoxelShape } from '../src/voxel/shapes';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { bakeLamps } from '../src/voxel/lampBake';
import { CharOccluders, OCC_KIND, occKey } from '../src/world/charOccluders';
import { LightField } from '../src/world/lightField';
import { bytesPerCall, inputs, sink } from './helpers/allocPerCall';

const box = (c: [number, number, number], s: [number, number, number]): VoxelShape => ({ kind: 'box', c, s, yaw: 0, pitch: 0, mat: 1 });

/** tests/lightField.test.ts's room (a wall with a doorway, a ceiling over half, three lamps and a spot, a zone, the
 *  moon), dimmed so few levels clamp at 1, plus a flashlight and a beam-cut torch (not baked) and a shut door. */
function scene(): { reg: LightRegistry; bake: LightBake; field: LightField } {
  const reg = new LightRegistry();
  reg.ambient = 0.12;
  reg.addZone({ minX: -10, maxX: 0, minY: -1, maxY: 5, minZ: -10, maxZ: 10, ambient: 0.08 });
  reg.add({ x: -3, y: 3, z: 0, radius: 6, intensity: 0.25 });
  reg.add({ x: 3, y: 3.5, z: 2, radius: 7, intensity: 0.2, fixture: { sx: 0.2, sy: 0.1, sz: 1.5, oy: 0.1 } });
  reg.add({ kind: 'spot', x: 0, y: 4, z: -4, radius: 8, intensity: 0.3, cone: makeCone(0.3, -1, 0, 0.6) });
  reg.add({ x: 6, y: 2, z: -6, radius: 4, intensity: 0.15 });
  const shapes = packShapes([box([0, -0.25, 0], [20, 0.5, 20]), box([0, 1.5, -5.4], [0.2, 3, 8.8]), box([0, 1.5, 5.6], [0.2, 3, 8.8]), box([0, 2.6, 0.6], [0.2, 0.8, 1.2]), box([-5, 4.1, 0], [10, 0.2, 20])]);
  const lo: [number, number, number] = [-11, -1, -11];
  const hi: [number, number, number] = [11, 6, 11];
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes, lights: baked.lights, lo, hi });
  const s = Math.SQRT1_2;
  const dir: [number, number, number] = [s, s, 0];
  const n: [number, number, number] = [44, 14, 44];
  const m = bakeMoon({ kind: 'moon', id: 0, origin: lo, n, shapes, dir });
  const moonL = 0.06;
  const sky = reg.ambient - moonL;
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, lo, hi);
  const bake: LightBake = { lo, hi, lampKey: 'k', moonKey: 'm', lamps: { baked, r }, moon: { origin: lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: moonL, ms: 0 };
  // not baked: a flashlight (id 4) and a beam-cut torch (id 5)
  reg.add({ kind: 'flashlight', x: 5, y: 1.5, z: 5, radius: 10, intensity: 0.25, cone: makeCone(0, 0, -1, 0.5), on: true });
  const bc = reg.add({ kind: 'flashlight', x: 6, y: 1.5, z: -2, radius: 10, intensity: 0.3, cone: makeCone(-1, -0.2, 0.3, 0.6), on: true });
  (bc as { beamCut?: boolean }).beamCut = true;
  const door = { anchor: { hinge: { x: 0, y: 0, z: 0 }, yaw: 0, width: 1.2, height: 2.2 }, open: 0 };
  return { reg, bake, field: new LightField(bake, reg, [door]) };
}

/** A deterministic stand-in for the meter's ray test (cuts the flashlight short of some points). */
const ocl = (l: LightDef, x: number, _y: number, z: number): boolean => x < 4.2 && l.z > z + 3.5;

/** Two player capsules (keys 0, 1); queries skip key 9 (nobody), so both shade. */
function chars(): CharOccluders {
  const c = new CharOccluders();
  c.add(OCC_KIND.player, 0, -2.6, 0.25, 0.4, -2.6, 1.5, 0.4, 0.25);
  c.add(OCC_KIND.player, 1, 5, 0.25, 3.4, 5, 1.5, 3.4, 0.25);
  return c;
}

/**
 * Read on origin/master a7853bed4 (pre-F57): flash, x, y, z, then levelAt, bounceAt, dynamicAt(ocl), totalAt(ocl),
 * totalAt(ocl, chars, 9), bodyLevel(1.7, ocl, 0.1, 0), bodyLevel(1.3, ocl, 0, 0, chars, 9), totalQ(ocl, chars, 9).
 * Comments: the gameplay set there (`sourcesInto`: 0, 1, 3 lamps, 2 the spot, -1 the moon, 4 flashlight, 5 torch).
 */
const PARITY: readonly (readonly number[])[] = [
  [0, -3, 0.05, 0.5, 0.524204338369321, 0.1235294117647059, 0.019672237516188316, 0.5438765758855093, 0.5014279853425992, 1, 0.8478361267407337, 0.5014279853425992], // 0 -1 5
  [0, -2.2, 1, 0.3, 0.6771098018049118, 0.09274509803921567, 0.0519658282476615, 0.7290756300525733, 0.5468837341528471, 1, 1, 0.5468837341528471], // 0 5 -1
  [0, 0.4, 1, -4, 0.14969264547423503, 0.01764705882352941, 0, 0.14969264547423503, 0.14969264547423503, 1, 0.5523742022990886, 0.14969264547423503], // -1
  [0, 3.2, 1.2, 2.5, 0.5333801099240639, 0.0608235294117647, 0, 0.5333801099240639, 0.5333801099240639, 1, 1, 0.5333801099240639], // 1 -1
  [0, 5, 1, 2, 0.3253486132586052, 0.04215686274509804, 0.20311643874699895, 0.5284650520056041, 0.35593392365898113, 0.542112472478811, 0.4991912547879853, 0.35593392365898113], // 4 1 -1
  [0, 5, 1.2, 1, 0.30429560227772534, 0.03509803921568627, 0.17865802190598934, 0.4829536241837147, 0.3424902729624072, 0.46350819048418296, 0.40227366750351234, 0.3424902729624072], // 4 1 -1
  [0, 4, 1, -1.5, 0.20998794495131698, 0.022549019607843137, 0.2823774567131278, 0.49236540166444476, 0.49236540166444476, 0.3667646116073737, 0.4493492697671667, 0.49236540166444476], // 5 1 -1
  [0, 8, 1, -8, 0.18483373043645623, 0.020098039215686276, 0, 0.18483373043645623, 0.18483373043645623, 0.12988235294117645, 0.1327288966520143, 0.18483373043645623], // -1 3
  [0, -8, 1, 8, 0.0784313725490196, 0, 0, 0.0784313725490196, 0.0784313725490196, 0.07843181862512093, 0.07843200658243514, 0.0784313725490196], // none
  [0, 1.5, 1, 0.6, 0.3366982396897755, 0.05823529411764705, 0.16165520809750328, 0.4983534477872788, 0.4983534477872788, 0.491342192588635, 0.5017921246387332, 0.4983534477872788], // 5 1 -1
];

describe('LightField queries (F57)', () => {
  // (alloc-n24) The allocation gate runs first, on code no other query in this file has warmed: run after the parity
  // test it read 0 B on the desktop, alone it read what train 166's CI read (totalAt 1.6 B, bodyLevel 8.0 B: `dynamicInto`
  // too big to inline, so its own optimized code decided whether the occluder's x and z were boxed).
  it('the meter, guard and cue queries allocate 0 B (bounce lit, a flashlight, a door, characters)', async () => {
    const { field: f } = scene();
    const c = chars();
    const sk = occKey(OCC_KIND.player, 9);
    const N = 2000;
    const X = inputs(N, (k) => (k % 40) * 0.5 - 10);
    const Z = inputs(N, (k) => ((k * 7) % 40) * 0.5 - 10);
    const ids = new Int32Array(8);
    const lv = new Float32Array(8);
    const qp = f.qp;
    const per = (fn: (n: number) => void, goal: number): Promise<number> => bytesPerCall(fn, goal, { n: N, warm: 100000 });
    // a control that makes one 3-vector per query (kept in a ring so it escapes): what a real allocation reads
    const ring: Float64Array[] = new Array<Float64Array>(64);
    const ctl = await per((n) => {
      for (let i = 0; i < n; i++) {
        const v = new Float64Array(3);
        v[0] = f.totalAt(X[i]!, 1, Z[i]!, ocl);
        ring[i & 63] = v;
      }
    }, -Infinity);
    let bounceLit = 0;
    for (let i = 0; i < N; i++) if (f.bounceAt(X[i]!, 1, Z[i]!) > 0) bounceLit++;
    const r: Record<string, number> = {};
    // guards: levelAt (torch rule, search areas), totalAt (players, bodies)
    r.levelAt = await per((n) => {
      for (let i = 0; i < n; i++) sink[0] = sink[0]! + f.levelAt(X[i]!, 1, Z[i]!);
    }, 0);
    r.totalAt = await per((n) => {
      for (let i = 0; i < n; i++) sink[0] = sink[0]! + f.totalAt(X[i]!, 1, Z[i]!, ocl);
    }, 0);
    // the meter: bodyLevel without and with the character contract
    r.bodyLevel = await per((n) => {
      for (let i = 0; i < n; i++) sink[0] = sink[0]! + f.bodyLevel(X[i]!, 0, Z[i]!, 1.7, ocl, 0.1, 0);
    }, 0);
    r.bodyLevelChars = await per((n) => {
      for (let i = 0; i < n; i++) sink[0] = sink[0]! + f.bodyLevel(X[i]!, 0, Z[i]!, 1.3, ocl, 0, 0, c, sk);
    }, 0);
    // the cue fill's calls
    r.totalQ = await per((n) => {
      for (let i = 0; i < n; i++) {
        qp[0] = X[i]!;
        qp[1] = 0.05;
        qp[2] = Z[i]!;
        f.totalQ(ocl, c, sk);
      }
    }, 0);
    r.sourcesQ = await per((n) => {
      for (let i = 0; i < n; i++) {
        qp[0] = X[i]!;
        qp[1] = 1;
        qp[2] = Z[i]!;
        f.sourcesQ(ids, lv, 8, ocl);
      }
    }, 0);
    const line = Object.entries(r).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ');
    console.info(`bytes per query (F57): ${line}; control with a vector ${ctl.toFixed(1)}; bounce lit at ${bounceLit} of ${N}`);
    expect(bounceLit).toBeGreaterThan(N / 4);
    expect(ctl).toBeGreaterThan(32);
    for (const [k, v] of Object.entries(r)) expect(v, k).toBe(0);
  });

  it('every level is the pre-F57 value to the bit (lamps, spot, moon, flashlight, beam-cut torch, door, characters)', () => {
    const { field: f } = scene();
    const c = chars();
    const sk = occKey(OCC_KIND.player, 9);
    const ids = new Int32Array(8);
    const lv = new Float32Array(8);
    const seen = new Set<number>();
    for (const row of PARITY) {
      const [flash, x, y, z] = row as [number, number, number, number];
      f.qp[0] = x;
      f.qp[1] = y;
      f.qp[2] = z;
      f.totalQ(ocl, c, sk);
      const got = [f.levelAt(x, y, z), f.bounceAt(x, y, z), f.dynamicAt(x, y, z, ocl), f.totalAt(x, y, z, ocl), f.totalAt(x, y, z, ocl, c, sk), f.bodyLevel(x, y, z, 1.7, ocl, 0.1, 0), f.bodyLevel(x, y, z, 1.3, ocl, 0, 0, c, sk), f.qr[0]!];
      for (let k = 0; k < got.length; k++) expect(Object.is(got[k], row[4 + k]), `flash ${flash} (${x}, ${y}, ${z}) query ${k}: ${got[k]} vs ${row[4 + k]}`).toBe(true);
      const n = f.sourcesInto(x, y, z, ids, lv, 8, ocl);
      for (let k = 0; k < n; k++) seen.add(ids[k]!);
    }
    // the table reaches every kind of source: baked lamps, the moon, the flashlight and the beam-cut torch
    for (const id of [0, 1, 3, -1, 4, 5]) expect(seen.has(id), `source ${id}`).toBe(true);
    // and the bounce and the characters change levels in it
    expect(PARITY.some((r) => r[5]! > 0)).toBe(true);
    expect(PARITY.some((r) => r[8]! < r[7]!)).toBe(true);
  });

  it('the bounce grid reads the same through sampleInto (x, y, z) and sampleQ (its q slots)', () => {
    const { field: f } = scene();
    const bg = f.bounce;
    expect(bg.active).toBe(true);
    let lit = 0;
    for (let i = 0; i <= 40; i++) {
      for (let k = 0; k <= 40; k++) {
        const x = -10 + i * 0.5 + 0.013;
        const z = -10 + k * 0.5 - 0.007;
        bg.sampleInto(x, 1, z);
        const a = bg.out;
        bg.q[0] = x;
        bg.q[1] = 1;
        bg.q[2] = z;
        bg.sampleQ();
        expect(Object.is(bg.out, a)).toBe(true);
        expect(Object.is(f.bounceAt(x, 1, z), a)).toBe(true);
        if (a > 0) lit++;
      }
    }
    expect(lit).toBeGreaterThan(100);
  });
});
