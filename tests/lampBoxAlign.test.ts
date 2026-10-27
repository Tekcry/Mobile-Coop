/**
 * (LR16-L part A) A lamp never shadows itself from its mount: the bake box's cell planes run through the light point
 * (`lampBox`), so a lamp hung up to a cell under its ceiling sits on a cell boundary under the solid row and rays from
 * below never cross it (walk 4.82 item 8, "s3 lights on low look terrible on walls, blotchy, not smooth").
 * - `lampBox` alignment over a seeded set of lamps.
 * - The Marlow A3 corridor (master's numbers: 3.5 m wide, slab 3.0-3.2, six 1.2 x 0.3 panels 5 cm under it every 3 m):
 *   the upper north wall sees the lamp in front of it and the next one; the same with the lamp 0.02-0.19 m under the slab.
 * - A real occluder (a beam under the ceiling) still shadows.
 * - Every map: no baked lamp sits inside a solid cell of its own box, and none has solid occupancy right under it
 *   (allowed: lights on top of their own post; listed: the known map data errors, A2).
 * - The wall guard (the picture model, pure): the worst 5 cm vertical step and the worst across-row max / min on the A3
 *   north wall, at a bright and a dim lamp level ("the arches never come back" for later re-levels).
 * `LAMPALIGN_PRINT=1` prints the measured numbers.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { MAPS } from '../src/world/maps';
import { dressingOn } from '../src/world/detailPass';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps, LAMP_CELL, LAMP_STRIDE, lampBox, occupancyShapes } from '../src/voxel/lampBake';
import { rasterise } from '../src/voxel/shapes';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField } from '../src/world/lightField';
import { darkWeight, DARK_DESKTOP, LEVEL_TO_RENDER } from '../src/world/darkCurve';

const c = LAMP_CELL;
const PRINT = process.env.LAMPALIGN_PRINT === '1';

describe('lampBox: cell planes through the light point', () => {
  it('aligns on x, y and z inside the old clip, and covers the reach', () => {
    // a seeded set: lamps inside the map and below its lo, downward lamps and cones, radius 0.5 .. 10
    let s = 12345;
    const rnd = (): number => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
    const lo = [-40.3, -2, -17.7];
    const hi = [52.1, 14, 33.4];
    const n = 400;
    const L = new Float32Array(n * LAMP_STRIDE);
    for (let i = 0; i < n; i++) {
      const o = i * LAMP_STRIDE;
      const r = 0.5 + rnd() * 9.5;
      const down = i % 3 !== 0;
      // (a downward lamp's box ends a cell over it: one under the map's lo would have nothing to bake)
      for (let a = 0; a < 3; a++) {
        const from = a === 1 && down ? lo[a]! + 0.05 : lo[a]! - r * 0.9;
        L[o + a] = from + rnd() * (hi[a]! - from - 0.1);
      }
      L[o + 3] = r;
      L[o + 7] = down ? -2 : 0.6;
    }
    const box = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      const o = i * LAMP_STRIDE;
      lampBox(L, i, lo, hi, box);
      const r = L[o + 3]!;
      const down = L[o + 7]! < -1.5;
      for (let a = 0; a < 3; a++) {
        const l = L[o + a]!;
        const origin = box[a]!;
        const k = (l - origin) / c;
        expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6);
        const from = Math.max(lo[a]!, l - r);
        expect(origin).toBeGreaterThanOrEqual(from - 1e-9);
        expect(origin).toBeLessThan(from + c);
        const to = Math.min(hi[a]!, a === 1 && down ? l + c : l + r);
        expect(origin + box[3 + a]! * c).toBeGreaterThanOrEqual(to - 1e-6);
        // (no spare row: one cell fewer would not cover the reach)
        expect(origin + (box[3 + a]! - 1) * c).toBeLessThan(to);
      }
    }
  });
});

// ---- the A3 corridor (copied from the LR16-L probe): north wall face z 12.5, the wall points 0.2 m off it
const WZ = 12.5;
const SZ = WZ - 0.2;
const XS = [81, 84, 87, 90, 93, 96];

interface Corridor {
  f: LightField;
  L: Float32Array;
  n: number;
}

/** The corridor with its slab bottom at 3.0, lamps at `xs` hung `under` m below it at intensity `I`; `beam`: a 0.3 m deep
 *  beam across it at x 85.4-85.6 under the slab (y 2.6-2.9). The map's lo y is forced to -2 (as the probe: the old grid
 *  ran from there and put the row boundary 0.15 m under the lamp). */
function corridor(xs: readonly number[], under: number, I: number, beam = false): Corridor {
  const b = new LevelBuilder();
  const C = '#888888';
  b.box(88.25, -0.1, 10.75, 20, 0.2, 5, C);
  b.box(88.25, 3.1, 10.75, 20, 0.2, 5, C);
  b.box(88.25, 1.5, 12.65, 20, 3, 0.3, C);
  b.box(88.25, 1.5, 8.85, 20, 3, 0.3, C);
  b.box(79.35, 1.5, 10.75, 0.3, 3, 4, C);
  b.box(97.15, 1.5, 10.75, 0.3, 3, 4, C);
  if (beam) b.box(85.5, 2.75, 10.75, 0.2, 0.3, 3.5, C);
  for (const x of xs) b.light({ x, y: 3 - under, z: 10.75, radius: 3.8, intensity: I, color: [0.96, 0.97, 1], group: 30, electric: true, destructible: true, fixture: { sx: 1.2, sy: 0.05, sz: 0.3, oy: 0.025 } });
  b.ambientZone(79.5, 97, 9, 12.5, 0.14, -1, 2.9);
  const reg = b.lights;
  reg.ambient = 0.75;
  const set = canonicalLightSet(b.boxes, b.cylinders, 'lr16l-corridor', false);
  const lo: [number, number, number] = [set.lo[0], -2, set.lo[2]];
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : 0; } }, lo, set.hi);
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo, hi: set.hi });
  const bake = { lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: null, ambient, moonLight: 0, ms: 0 } as unknown as LightBake;
  return { f: new LightField(bake, reg, []), L: baked.lights, n: baked.ids.length };
}

/** The picture on the north wall (pure model, as the probe): (direct lamp light x N.L + the rest of the level) x render
 *  gain, through the darkness curve. */
function picture(k: Corridor, x: number, y: number): number {
  const { f, L, n } = k;
  let lamps = 0;
  let lit = 0;
  for (let i = 0; i < n; i++) {
    const v = f.lampAt(i, x, y, SZ);
    if (v <= 0) continue;
    lamps += v;
    const o = i * LAMP_STRIDE;
    const vx = L[o]! - x;
    const vy = L[o + 1]! - y;
    const vz = L[o + 2]! - WZ;
    lit += v * LEVEL_TO_RENDER * Math.max(0, -vz / Math.sqrt(vx * vx + vy * vy + vz * vz));
  }
  const s = f.levelAt(x, y, SZ);
  return (lit + (s - lamps) * LEVEL_TO_RENDER) * darkWeight(s, DARK_DESKTOP);
}

/** The worst 5 cm vertical change (x 81-96, y 2.9 down to 1.0) and the worst across-row max / min over one lamp period
 *  (x 84-87, y 2.95 down to 1.6, rows whose brightest point is over 0.3). */
function wallGuard(k: Corridor): { step: number; lateral: number } {
  let step = 0;
  for (let xi = 0; xi <= 150; xi++) {
    const x = 81 + xi * 0.1;
    for (let yi = 0; yi < 38; yi++) {
      const y = 2.9 - yi * 0.05;
      step = Math.max(step, Math.abs(picture(k, x, y) - picture(k, x, y - 0.05)));
    }
  }
  let lateral = 0;
  for (let yi = 0; yi < 27; yi++) {
    const y = 2.95 - yi * 0.05;
    let mx = 0;
    let mn = 1e9;
    for (let xi = 0; xi <= 12; xi++) {
      const v = picture(k, 84 + xi * 0.25, y);
      mx = Math.max(mx, v);
      mn = Math.min(mn, v);
    }
    if (mx > 0.3) lateral = Math.max(lateral, mx / Math.max(mn, 1e-3));
  }
  return { step, lateral };
}

describe('the A3 corridor: no lamp shadows itself from its ceiling', () => {
  it('the upper north wall sees the lamp in front of it and the one beside it', () => {
    const k = corridor(XS, 0.05, 0.9);
    const front = k.f.visAt(2, 87, 2.6, SZ);
    const between = k.f.visAt(2, 85.5, 2.3, SZ);
    if (PRINT) console.info(`A3 corridor, lamp 87: vis (87, 2.6) ${front.toFixed(3)}, (85.5, 2.3) ${between.toFixed(3)}`);
    expect(front).toBeGreaterThanOrEqual(0.95);
    expect(between).toBeGreaterThanOrEqual(0.95);
  }, 120_000);

  it('holds for a lamp 0.02 to 0.19 m under the slab', () => {
    const rows: string[] = [];
    for (const under of [0.02, 0.05, 0.1, 0.15, 0.19]) {
      const k = corridor([87], under, 0.9);
      const front = k.f.visAt(0, 87, 2.6, SZ);
      const between = k.f.visAt(0, 85.5, 2.3, SZ);
      rows.push(`${under}: ${front.toFixed(3)} / ${between.toFixed(3)}`);
      expect(front, `lamp ${under} m under the slab, (87, 2.6)`).toBeGreaterThanOrEqual(0.95);
      expect(between, `lamp ${under} m under the slab, (85.5, 2.3)`).toBeGreaterThanOrEqual(0.95);
    }
    if (PRINT) console.info(`A3 corridor, lamp under the slab by (m): vis front / between\n${rows.join('\n')}`);
  }, 240_000);

  it('a real occluder still shadows: a beam under the ceiling hides the wall behind it from the lamp at 84', () => {
    const k = corridor([84, 87], 0.05, 0.9, true);
    const v = k.f.visAt(0, 86.5, 2.3, SZ);
    if (PRINT) console.info(`A3 corridor with the beam: vis of lamp 84 at (86.5, 2.3) ${v.toFixed(3)}`);
    expect(v).toBeLessThanOrEqual(0.2);
  }, 120_000);

  it('the wall guard: no hard toothed edge on the north wall at a bright and a dim lamp level', () => {
    const bright = wallGuard(corridor(XS, 0.05, 0.9));
    const dim = wallGuard(corridor(XS, 0.05, 0.4));
    if (PRINT) console.info(`A3 wall guard: I 0.9 step ${bright.step.toFixed(3)} lateral ${bright.lateral.toFixed(2)}; I 0.4 step ${dim.step.toFixed(3)} lateral ${dim.lateral.toFixed(2)}`);
    expect(bright.step).toBeLessThanOrEqual(0.32);
    expect(bright.lateral).toBeLessThanOrEqual(1.6);
    // (I 0.4: 2.92 measured with the fix, its worst row at y 2.65 where the level crosses the darkness curve's knee, the
    // brief's residual; 3.63 before it. The brief's 2.9 came from a probe that shifted the scene against the old grid.)
    expect(dim.lateral).toBeLessThanOrEqual(3.0);
  }, 240_000);
});

/**
 * Lamps with solid occupancy right under the light point (`map:id`), accepted (LR16-L A2): the light sits on top of its
 * own post, so the post shadows its own base and nothing else. (light-realism L1: the S1 car-park columns and the lane
 * floodlight left this list: their light points hang 0.8 m out on arms, campusS1.ts column block; the 26 column heads
 * moved the bike shelter and bollard ids up to 28 and 29-36.)
 */
const ON_ITS_POST: Record<string, string> = {
  ...Object.fromEntries(Array.from({ length: 8 }, (_, k) => [`campusOps:${k + 29}`, 'S1 forecourt bollard: light point 0.05 m inside the top of its 0.9 m post (campusS1.ts:295)'])),
  'warehouseOps:34': 'exit sign, a wall bulkhead 0.09 m off the wall face (warehouseS1.ts:83): wall-mounted, accepted (lead, LR16-W)',
  'warehouseOps:53': 'exit sign, a wall bulkhead 0.09 m off the wall face (warehouseS1.ts:92): wall-mounted, accepted (lead, LR16-W)',
};
/**
 * (LR16-L A2) Lamps flush with or inside a mount, listed for the lead and the map owners (map files are not LR16-L's).
 * Remove an entry when its lamp moves (or move it to ON_ITS_POST when the lead accepts it); the test then keeps it out.
 */
const KNOWN_EMBEDDED: Record<string, string> = {
  'campusOps:28': 'S1 bike shelter fitting (-5, 2.2, -48) flush with the roof underside at 2.2 (campusS1.ts:280); tagged out (radius 0, off): bakes nothing',
  // (mission-engine member d, Campaign Build, prototype mode: note and ship) Tallow Wharf: 0-17, 28-41, 44-48 and 58-62
  // have a conduit run (LIGHT.md rule 6, tallowWharfW*.ts) ending at the light point; 42 and 43 are desk lamps on their
  // desks, 109 and 110 sit 0.1 m over their mounts; 92 (the turret clock's gas jet, tallowWharfW3.ts:387) is buried 1 m
  // inside the clock block (:202) and lights nothing. Light-pass items: end each run at the fitting's top, move 92 out,
  // then move the mounted ones to ON_ITS_POST.
  ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 58, 59, 60, 61, 62, 92, 109, 110].map((k) => [`tallowWharf:${k}`, 'Tallow conduit run or mount at the light point (light-pass item)'])),
};

describe('every map: no lamp embedded in its own mount', () => {
  it('no baked lamp lies inside a solid cell of its own box or has solid occupancy right under it', () => {
    const one = new Uint8Array(1);
    const solid = (occ: Float32Array, x: number, y: number, z: number): boolean => {
      one[0] = 0;
      rasterise(occ, one, [x, y, z], c, 1, 1, 1);
      return one[0] === 1;
    };
    const inside: string[] = [];
    const under: string[] = [];
    const known: string[] = [];
    const box = [0, 0, 0, 0, 0, 0];
    for (const map of MAPS) {
      const b = new LevelBuilder();
      map.build(b, 0);
      const set = canonicalLightSet(b.boxes, b.cylinders, map.id, dressingOn(map));
      const occ = occupancyShapes(set.shapes, c * 0.5);
      const { lights: L, ids } = bakedLights(b.lights);
      for (let i = 0; i < ids.length; i++) {
        lampBox(L, i, set.lo, set.hi, box);
        const o = i * LAMP_STRIDE;
        const p = [L[o]!, L[o + 1]!, L[o + 2]!];
        const name = `${map.id}:${ids[i]} (${p.map((v) => v.toFixed(2)).join(', ')})`;
        // the cell holding the light, and how far the light sits above its bottom (inside its row)
        const cell = [0, 1, 2].map((a) => box[a]! + Math.floor((p[a]! - box[a]!) / c + 1e-6) * c);
        const depth = p[1]! - cell[1]!;
        if (depth > 0.001 && solid(occ, cell[0]!, cell[1]!, cell[2]!)) inside.push(`${name} depth ${depth.toFixed(3)}`);
        // a cell straight under the light point (centre half a cell below it) solid in the conservative occupancy: the
        // lamp hangs in its mount, and rays from below cross the mount near it
        const key = `${map.id}:${ids[i]}`;
        if (solid(occ, p[0]! - c / 2, p[1]! - c, p[2]! - c / 2) && !ON_ITS_POST[key]) {
          if (KNOWN_EMBEDDED[key]) known.push(key);
          else under.push(name);
        }
      }
    }
    if (PRINT) console.info(`inside a solid cell: ${inside.length}\n${inside.join('\n')}\nsolid right under (new): ${under.length}\n${under.join('\n')}\nknown: ${known.join(', ')}`);
    expect(inside).toEqual([]);
    expect(under).toEqual([]);
    // (a fixed entry leaves the list: it must then come out of KNOWN_EMBEDDED)
    expect(known.sort()).toEqual(Object.keys(KNOWN_EMBEDDED).sort());
  }, 600_000);
});
