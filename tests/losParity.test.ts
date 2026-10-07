import { describe, expect, it } from 'vitest';
import { levelVoxels } from '../src/voxel/levelVoxels';
import { coarseShapes, packShapes, rasterise, shapeBounds, SHAPE_STRIDE, type VoxelShape } from '../src/voxel/shapes';
import { VOXEL_TIER, PRESET_IDS } from '../src/core/quality';

/**
 * Line-of-sight parity (3.1, crossplay fairness): what a player can see past must not depend on the preset. Gameplay
 * reads the blockout (identical everywhere); the picture is the voxels, whose layers and levels of detail differ by
 * preset (props on their own 2.5 cm layer or in the 5 cm structure, coarse levels 10 / 20 cm sooner on lower presets).
 * Sight lines through the Warehouse are traced through every layer / level combination a preset can show and compared
 * with Epic's close-up picture; only lines that pass within the coarsest voxel's reach of a surface may differ (those
 * are skipped: the reference answer must hold for the line shifted that far in any direction). Coarse levels thicken
 * thin pieces to a voxel (`coarseShapes`), so a wall never turns see-through at a distance.
 */
interface Layer {
  sh: Float32Array;
  origin: readonly number[];
  size: number;
  /** Shapes per 1 m cell (sorted: later shapes win). */
  cells: Map<number, number[]>;
}

const CELL = 1;
const key = (x: number, y: number, z: number): number => ((Math.floor(x / CELL) + 512) * 1024 + (Math.floor(y / CELL) + 64)) * 1024 + (Math.floor(z / CELL) + 512);

function layer(sh: Float32Array, origin: readonly number[], size: number): Layer {
  const cells = new Map<number, number[]>();
  const n = sh.length / SHAPE_STRIDE;
  for (let i = 0; i < n; i++) {
    const b = shapeBounds(sh, i);
    const r = size;
    for (let x = Math.floor((b[0]! - r) / CELL); x <= Math.floor((b[3]! + r) / CELL); x++)
      for (let y = Math.floor((b[1]! - r) / CELL); y <= Math.floor((b[4]! + r) / CELL); y++)
        for (let z = Math.floor((b[2]! - r) / CELL); z <= Math.floor((b[5]! + r) / CELL); z++) {
          const k = key(x * CELL, y * CELL, z * CELL);
          const l = cells.get(k);
          if (l) l.push(i);
          else cells.set(k, [i]);
        }
  }
  return { sh, origin, size, cells };
}

const g = new Uint8Array(1);
/** The voxel containing the point is solid (size 0: the shapes themselves at the point). */
function solid(L: Layer, x: number, y: number, z: number): boolean {
  const pick = L.cells.get(key(x, y, z));
  if (!pick) return false;
  g[0] = 0;
  if (L.size === 0) {
    const t = 1e-4;
    rasterise(L.sh, g, [x - t / 2, y - t / 2, z - t / 2], t, 1, 1, 1, pick);
  } else {
    const s = L.size;
    const o = L.origin;
    rasterise(L.sh, g, [o[0]! + Math.floor((x - o[0]!) / s) * s, o[1]! + Math.floor((y - o[1]!) / s) * s, o[2]! + Math.floor((z - o[2]!) / s) * s], s, 1, 1, 1, pick);
  }
  return g[0] !== 0;
}

/** The ends of a line are bodies, not points: the last `END` (m) at each end is not traced. */
const END = 0.2;

/** Does the segment pass through anything (sampled every `step`)? */
function blocked(layers: readonly Layer[], ax: number, ay: number, az: number, bx: number, by: number, bz: number, step: number): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const n = Math.ceil(len / step);
  const e = Math.ceil(END / step);
  for (let i = e; i < n - e; i++) {
    const t = i / n;
    const x = ax + dx * t;
    const y = ay + dy * t;
    const z = az + dz * t;
    for (const L of layers) if (solid(L, x, y, z)) return true;
  }
  return false;
}

/** Does the segment hit a surface that also covers the line shifted by `m` across it (along `u` and `v`)? */
function blockedWide(layers: readonly Layer[], a: readonly number[], c: readonly number[], step: number, u: readonly number[], v: readonly number[], m: number): boolean {
  const len = Math.hypot(c[0]! - a[0]!, c[1]! - a[1]!, c[2]! - a[2]!);
  const n = Math.ceil(len / step);
  const any = (x: number, y: number, z: number): boolean => layers.some((L) => solid(L, x, y, z));
  const e = Math.ceil(END / step);
  for (let i = e; i < n - e; i++) {
    const t = i / n;
    const x = a[0]! + (c[0]! - a[0]!) * t;
    const y = a[1]! + (c[1]! - a[1]!) * t;
    const z = a[2]! + (c[2]! - a[2]!) * t;
    if (!any(x, y, z)) continue;
    let wide = true;
    for (const w of [u, v])
      for (const k of [-m, m]) if (wide && !any(x + w[0]! * k, y + w[1]! * k, z + w[2]! * k)) wide = false;
    if (wide) return true;
  }
  return false;
}

describe('line-of-sight parity across presets (3.1)', () => {
  it('Warehouse: every preset shows the same sight lines (Epic close-up as reference)', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { MAPS } = await import('../src/world/maps');
    const map = MAPS.find((m) => m.id === 'warehouse')!;
    const b = new LevelBuilder();
    const lay = map.build(b, 1);
    const size = VOXEL_TIER.epic.size;
    for (const p of PRESET_IDS) expect(VOXEL_TIER[p].size, p).toBe(size);
    const fineSizes = [...new Set(PRESET_IDS.map((p) => VOXEL_TIER[p].fine))];
    /** The rendered picture of a preset family at a level of detail: voxel layers + the thin pieces left as boxes. */
    const configs: { name: string; layers: Layer[] }[] = [];
    let reference: Layer[] | null = null;
    for (const fine of fineSizes) {
      const lv = levelVoxels(b.boxes, b.cylinders, b.surfaces, 'concrete', size, undefined, map.art ?? null, fine);
      const rest: VoxelShape[] = [];
      b.boxes.forEach((p, i) => {
        if (!lv.voxelBox[i] && p.visible !== false) rest.push({ kind: 'box', c: p.c, s: p.s, yaw: p.yaw, pitch: p.pitch, mat: 1 });
      });
      b.cylinders.forEach((c, i) => {
        if (!lv.voxelCyl[i]) rest.push({ kind: 'cyl', c: c.c, r: c.r, h: c.h, mat: 1 });
      });
      const boxes = layer(packShapes(rest), [0, 0, 0], 0);
      const st = packShapes(lv.shapes);
      const fn = lv.fine ? packShapes(lv.fine.shapes) : null;
      for (let l = 0; l < 3; l++) {
        const s = size * (1 << l);
        const layers = [layer(l ? coarseShapes(st, s) : st, lv.origin, s), boxes];
        if (fn && lv.fine) {
          // (the prop layer switches level at half the distance: one level coarser than the structure, or the same)
          const fl = Math.min(2, l + 1);
          const fs = lv.fine.size * (1 << fl);
          layers.push(layer(coarseShapes(fn, fs), lv.fine.origin, fs));
          if (l === 0) {
            reference = [layer(st, lv.origin, size), boxes, layer(fn, lv.fine.origin, lv.fine.size)];
            configs.push({ name: `fine ${fine} L0 / props L0`, layers: reference });
          }
        }
        configs.push({ name: `fine ${fine} L${l}`, layers });
      }
    }
    expect(reference).not.toBeNull();
    const ref = reference!;

    // sight lines: eye heights (standing, crouched, prone-ish chest) between points in the rooms
    let seed = 7;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const rooms = lay.rooms ?? [];
    expect(rooms.length).toBeGreaterThan(4);
    const pt = (room = Math.floor(rnd() * rooms.length)): [number, number, number] => {
      const r = rooms[room]!;
      return [r.minX + 0.5 + rnd() * (r.maxX - r.minX - 1), (r.minY ?? 0) + [1.6, 1.1, 0.6][Math.floor(rnd() * 3)]!, r.minZ + 0.5 + rnd() * (r.maxZ - r.minZ - 1)];
    };
    // the coarsest voxel's reach (20 cm: half its diagonal) and a ring of shifts that far
    const m = size * 4 * 0.9;
    const step = 0.0125;
    let clear = 0;
    let shut = 0;
    let skipped = 0;
    const bad: string[] = [];
    for (let k = 0; k < 6000 && clear + shut < 600; k++) {
      // (half the lines inside one room: more of them clear)
      const ra = Math.floor(rnd() * rooms.length);
      const a = pt(ra);
      const c = pt(rnd() < 0.5 ? ra : undefined);
      const dx = c[0] - a[0];
      const dy = c[1] - a[1];
      const dz = c[2] - a[2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 3 || len > 30) continue;
      if (ref.some((L) => solid(L, ...a) || solid(L, ...c))) continue;
      const want = blocked(ref, ...a, ...c, step);
      // two axes across the line
      const ux = -dz / Math.hypot(dx, dz);
      const uz = dx / Math.hypot(dx, dz);
      const vx = -uz * (dy / len);
      const vy = Math.hypot(dx, dz) / len;
      const vz = ux * (dy / len);
      let robust = true;
      // blocked: by something wide across the line; clear: the line shifted that far either way stays clear
      if (want) robust = blockedWide(ref, a, c, step, [ux, 0, uz], [vx, vy, vz], m);
      for (let j = 0; j < 8 && robust && !want; j++) {
        const t = (j / 8) * Math.PI * 2;
        for (const r of [m, m / 2]) {
          const ox = (ux * Math.cos(t) + vx * Math.sin(t)) * r;
          const oy = vy * Math.sin(t) * r;
          const oz = (uz * Math.cos(t) + vz * Math.sin(t)) * r;
          if (blocked(ref, a[0] + ox, a[1] + oy, a[2] + oz, c[0] + ox, c[1] + oy, c[2] + oz, step) !== want) robust = false;
        }
      }
      if (!robust) {
        skipped++;
        continue;
      }
      if (want) shut++;
      else clear++;
      for (const cfg of configs) {
        if (blocked(cfg.layers, ...a, ...c, step) !== want && bad.length < 8)
          bad.push(`${cfg.name}: ${a.map((v) => v.toFixed(2))} -> ${c.map((v) => v.toFixed(2))} should be ${want ? 'blocked' : 'clear'}`);
      }
    }
    // thin walls / panels (under 25 cm): a line through the middle of each is blocked at every level of detail
    let thin = 0;
    b.boxes.forEach((p) => {
      if (p.visible === false) return;
      const ax = [0, 1, 2].sort((i, j) => p.s[i]! - p.s[j]!);
      const t = ax[0]!;
      if (p.s[t]! >= 0.25 || p.s[ax[1]!]! < 0.5 || p.s[ax[2]!]! < 0.5) return;
      const cy = Math.cos(p.yaw);
      const sy = Math.sin(p.yaw);
      const cp = Math.cos(p.pitch);
      const sp = Math.sin(p.pitch);
      const dir = [[cy, 0, -sy], [sy * sp, cp, cy * sp], [sy * cp, -sp, cy * cp]][t]!;
      const a = [p.c[0] - dir[0]! * 1, p.c[1] - dir[1]! * 1, p.c[2] - dir[2]! * 1] as const;
      const c = [p.c[0] + dir[0]! * 1, p.c[1] + dir[1]! * 1, p.c[2] + dir[2]! * 1] as const;
      if (!blocked(ref, ...a, ...c, step)) return;
      thin++;
      for (const cfg of configs) if (!blocked(cfg.layers, ...a, ...c, step) && bad.length < 8) bad.push(`${cfg.name}: see-through ${p.s.map((v) => v.toFixed(2))} piece at ${p.c.map((v) => v.toFixed(2))}`);
    });
    expect(thin, 'thin pieces tested').toBeGreaterThan(20);
    console.info(`${clear} clear, ${shut} blocked, ${skipped} grazing skipped, ${thin} thin pieces`);
    expect(bad, `${clear} clear, ${shut} blocked, ${skipped} grazing skipped`).toEqual([]);
    expect(clear, 'clear sight lines tested').toBeGreaterThan(150);
    expect(shut, 'blocked sight lines tested').toBeGreaterThan(150);
  }, 240_000);
});
