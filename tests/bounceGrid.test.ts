/**
 * (LR16-1) The bounce grid at runtime (`src/world/bounceGrid.ts`): a lamp switched, shot, jammed dark or EMP'd takes
 * exactly its own bounce out, at once and to the byte, and back on puts the same bytes back; only the touched box is
 * re-quantised; a sync with nothing moved costs one compare; no allocation. And the picture: the shader's `nsGrid2`
 * green channel, read as the GPU reads the RGBA fill texture, is the field's bounce. (Fix round) The read never blends
 * across a wall: a wall bit stops the blend, a crossing code moves the home cell; without walls it is the trilinear.
 */
import { describe, expect, it } from 'vitest';
import { BOUNCE, BOUNCE_BOX_STRIDE, BOUNCE_T_SHIFT, BOUNCE_T_STEP, type LampBounce } from '../src/voxel/lampBounce';
import { BOUNCE_WEIGHT, BounceGrid, bounceColor, packFillRGBA } from '../src/world/bounceGrid';
import { LAMP_LEVEL_GAIN } from '../src/world/lampMath';
import { LightRegistry } from '../src/world/lights';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';
import { nsGrid2 } from './helpers/bounceRead';
import { roomA, slabRoom, wallRoom } from './helpers/bounceRoom';

const N: [number, number, number] = [14, 5, 12];
const GRID = { origin: [-2, -1, -3], n: N };

/** Four lamps with overlapping boxes and seeded steps (one with an empty box). */
function setup(): { reg: LightRegistry; ids: number[]; b: LampBounce } {
  const reg = new LightRegistry();
  const ids = [0, 1, 2, 3].map((k) => reg.add({ x: k * 3, y: 2.5, z: 2, radius: 4, intensity: [1, 0.9, 0.55, 1.4][k]! }).id);
  const boxes = new Int32Array([1, 0, 1, 6, 4, 5, 4, 1, 2, 7, 3, 6, 0, 0, 0, 0, 0, 0, 7, 0, 5, 6, 5, 7]);
  let seed = 11;
  const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let len = 0;
  for (let i = 0; i < 4; i++) len += boxes[i * 6 + 3]! * boxes[i * 6 + 4]! * boxes[i * 6 + 5]!;
  const data = new Uint16Array(len);
  for (let k = 0; k < len; k++) data[k] = rnd() < 0.15 ? 0 : Math.floor(rnd() * 40000);
  return { reg, ids, b: { boxes, data } };
}

/** The grid computed from scratch for the registry as it is (an independent sum). */
function scratch(reg: LightRegistry, ids: number[], b: LampBounce): Uint8Array {
  const acc = new Float64Array(N[0] * N[1] * N[2]);
  let at = 0;
  ids.forEach((id, i) => {
    const o = i * BOUNCE_BOX_STRIDE;
    const [bx, by, bz, nx, ny, nz] = Array.from(b.boxes.subarray(o, o + 6));
    const l = reg.lights[id]!;
    const w = l.on && !l.destroyed && l.intensity > 0 ? Math.round(l.intensity * BOUNCE_WEIGHT) : 0;
    for (let z = 0; z < nz!; z++) for (let y = 0; y < ny!; y++) for (let x = 0; x < nx!; x++) { const c = bx! + x + N[0] * (by! + y + N[1] * (bz! + z)); acc[c] = acc[c]! + b.data[at++]! * w; }
  });
  return Uint8Array.from(acc, (a) => Math.round(Math.min(1, a * (BOUNCE.q / BOUNCE_WEIGHT) * LAMP_LEVEL_GAIN) * 255));
}

const same = (a: Uint8Array, b: Uint8Array): boolean => Buffer.from(a).equals(Buffer.from(b));

describe('(LR16-1) bounce grid', () => {
  it('switch off removes exactly that lamp\'s bounce', () => {
    const { reg, ids, b } = setup();
    const g = new BounceGrid(b, ids, GRID);
    g.sync(reg);
    expect(g.active).toBe(true);
    expect(same(g.g, scratch(reg, ids, b))).toBe(true);
    const lit = g.g.slice();
    // switched off
    reg.setOn(ids[1]!, false);
    g.sync(reg);
    expect(same(g.g, scratch(reg, ids, b))).toBe(true);
    // the cells only lamp 1 reaches (x 7..10, z 2..4: inside its box, outside 0's and 3's) are dark now; the ones only
    // lamp 0 holds (x 1..3) are as they were
    const c = (x: number, y: number, z: number): number => x + N[0] * (y + N[1] * z);
    let own = 0;
    for (let x = 7; x <= 10; x++) {
      for (let y = 1; y <= 3; y++) {
        for (let z = 2; z <= 4; z++) {
          if (lit[c(x, y, z)]! > 0) own++;
          expect(g.g[c(x, y, z)]).toBe(0);
        }
      }
    }
    expect(own).toBeGreaterThan(10);
    for (let x = 1; x <= 3; x++) for (let z = 1; z <= 5; z++) expect(g.g[c(x, 2, z)]).toBe(lit[c(x, 2, z)]);
    // shot, jammed dark, EMP'd: each out at once
    reg.setOn(ids[1]!, true);
    reg.kill(ids[0]!);
    g.sync(reg);
    expect(same(g.g, scratch(reg, ids, b))).toBe(true);
    reg.jamStart(ids[3]!);
    reg.jamLit(ids[3]!, false);
    g.sync(reg);
    expect(g.weight(3)).toBe(0);
    expect(same(g.g, scratch(reg, ids, b))).toBe(true);
    reg.jamEnd(ids[3]!);
    expect(reg.disrupt(3, 2.5, 2, 1, 5)).toBe(1);
    g.sync(reg);
    expect(g.weight(1)).toBe(0);
    expect(same(g.g, scratch(reg, ids, b))).toBe(true);
    // all back: the very first bytes
    reg.update(10);
    reg.restore(ids[0]!);
    reg.resetTo(ids[0]!, true, false);
    g.sync(reg);
    expect(same(g.g, lit)).toBe(true);
  });

  it('1000 random toggles return to the same bytes', () => {
    const { reg, ids, b } = setup();
    const g = new BounceGrid(b, ids, GRID);
    g.sync(reg);
    const first = g.g.slice();
    let seed = 5;
    const rnd = (): number => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let k = 0; k < 1000; k++) {
      const id = ids[Math.floor(rnd() * ids.length)]!;
      const r = rnd();
      if (r < 0.5) reg.setOn(id, !reg.lights[id]!.on);
      else if (r < 0.7) reg.kill(id);
      else if (r < 0.85) reg.resetTo(id, true, false);
      else {
        reg.lights[id]!.intensity = Math.round(rnd() * 20) / 10;
        reg.version++;
      }
      g.sync(reg);
      if (k % 50 === 0) expect(same(g.g, scratch(reg, ids, b))).toBe(true);
    }
    ids.forEach((id, i) => {
      reg.lights[id]!.intensity = [1, 0.9, 0.55, 1.4][i]!;
      reg.resetTo(id, true, false);
    });
    reg.version++;
    g.sync(reg);
    expect(same(g.g, first)).toBe(true);
  });

  it('only the touched box is re-quantised', () => {
    const { reg, ids, b } = setup();
    const g = new BounceGrid(b, ids, GRID);
    g.sync(reg);
    g.clearDirty();
    // a byte outside lamp 0's box, poisoned: a toggle of lamp 0 must not rewrite it
    const out = 12 + N[0] * (4 + N[1] * 11);
    g.g[out] = 77;
    reg.setOn(ids[0]!, false);
    g.sync(reg);
    expect(g.lastCells).toBe(6 * 4 * 5);
    expect(g.g[out]).toBe(77);
    expect(Array.from(g.dirty)).toEqual([1, 0, 1, 7, 4, 6]);
    // a second lamp grows the dirty box to the union
    reg.setOn(ids[1]!, false);
    g.sync(reg);
    expect(Array.from(g.dirty)).toEqual([1, 0, 1, 11, 4, 8]);
  });

  it('sync is free when the version did not move', async () => {
    const { reg, ids, b } = setup();
    const g = new BounceGrid(b, ids, GRID);
    g.sync(reg);
    const v = g.version;
    reg.lights[ids[0]!]!.on = false; // (behind the registry's back: no version bump, no work)
    g.sync(reg);
    expect(g.version).toBe(v);
    expect(g.weight(0)).toBeGreaterThan(0);
    // a version bump that changes nothing: no cell touched, no new version
    reg.lights[ids[0]!]!.on = true;
    reg.version++;
    g.sync(reg);
    expect(g.version).toBe(v);
    expect(g.lastCells).toBe(0);
    const bytes = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) g.sync(reg);
    }, 1);
    expect(bytes).toBeLessThan(1);
  });

  it('allocation-free', async () => {
    const { reg, ids, b } = setup();
    const g = new BounceGrid(b, ids, GRID);
    g.sync(reg);
    const l = reg.lights[ids[1]!]!;
    const bytes = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        l.on = !l.on;
        reg.version++;
        g.sync(reg);
      }
    }, 1, { n: 500 });
    expect(bytes).toBeLessThan(1);
  });

  it('a lamp-free bake or a box past the grid is no bounce', () => {
    const reg = new LightRegistry();
    const none = new BounceGrid(undefined, [], GRID);
    none.sync(reg);
    expect(none.active).toBe(false);
    const { b, ids, reg: r2 } = setup();
    // every box shifted past the grid's x end: all dropped, nothing written out of bounds
    const far: LampBounce = { boxes: b.boxes.map((v, k) => (k % 6 === 0 ? v + 20 : v)), data: b.data };
    const g = new BounceGrid(far, ids, GRID);
    g.sync(r2);
    expect(g.g.every((v) => v === 0)).toBe(true);
  });

  it('the bounce tint: lamp colours by intensity, brightest channel 1', () => {
    const c = bounceColor([{ color: [1, 0.9, 0.75], intensity: 1 }, { color: [0.6, 0.8, 1], intensity: 3 }]);
    expect(Math.max(...c)).toBeCloseTo(1, 12);
    // (fix round) a warm tint draws no channel over the level (`nsS` is the brightest channel)
    const warm = bounceColor([{ color: [1, 0.9, 0.75], intensity: 2 }]);
    expect(warm[0]).toBeCloseTo(1, 12);
    expect(warm[2]).toBeCloseTo(0.75, 12);
    expect(c[2]).toBeGreaterThan(c[0]);
    expect(bounceColor([])).toEqual([1, 1, 1]);
  });
});

describe('(LR16-1) nsGrid2 green channel = field bounce', () => {
  it('the GLSL reads the RGBA fill texture as the field reads the bounce grid (walls kept)', async () => {
    const { NS_GRID2_GLSL, LAMP_GLSL } = await import('../src/world/bakedLamps');
    // the function: R as nsGrid (one linear tap, 1 outside the grid); G, B, A by 8 texel fetches, the field's steps
    expect(LAMP_GLSL).toContain(NS_GRID2_GLSL);
    for (const line of [
      'vec3 q = (p - o.xyz) / (o.w * n.xyz);',
      'texture(t, clamp(q, 0.0, 1.0)).r;',
      'vec3 u = clamp((p - o.xyz) / o.w - 0.5, vec3(0.0), n.xyz - 1.0);',
      'ivec3 i1 = min(i0 + 1, ivec3(n.xyz) - 1);',
      // (LR16-P F3: no local arrays; the corners in two vec4 / ivec4, the reach set a bit mask)
      'ivec4 ea = ivec4(vec4(s0.b, s1.b, s2.b, s3.b) * 255.0 + 0.5) + ivec4(vec4(s0.a, s1.a, s2.a, s3.a) * 255.0 + 0.5) * 256;',
      'ivec3 hb = ivec3(step(vec3(0.5), f));',
      `int tx = (eh >> (hb.x == 1 ? ${BOUNCE_T_SHIFT[1]} : ${BOUNCE_T_SHIFT[0]})) & 3;`,
      `if (tx > 0 && d.x >= float(tx) * ${BOUNCE_T_STEP}) h ^= 1;`,
      'int mx = xa.x | (xa.z << 2) | (xb.x << 4) | (xb.z << 6);',
      'int my = ya.x | (ya.y << 1) | (yb.x << 4) | (yb.y << 5);',
      'int mz = za.x | (za.y << 1) | (za.z << 2) | (za.w << 3);',
      'for (int r = 0; r < 7; r++) {',
      'int g = c | ((c & mx) << 1) | ((c >> 1) & mx) | ((c & my) << 2) | ((c >> 2) & my) | ((c & mz) << 4) | ((c >> 4) & mz);',
      'if (g == c) break;',
      'vec4 wa = vec4(wx * (1.0 - f.y), wx * f.y) * (1.0 - f.z) * vec4(notEqual(ivec4(c) & ivec4(1, 2, 4, 8), ivec4(0)));',
      'vec4 wb = vec4(wx * (1.0 - f.y), wx * f.y) * f.z * vec4(notEqual(ivec4(c) & ivec4(16, 32, 64, 128), ivec4(0)));',
      'float sv = wa.x * va.x + wa.y * va.y + wa.z * va.z + wa.w * va.w + wb.x * vb.x + wb.y * vb.y + wb.z * vb.z + wb.w * vb.w;',
      'return vec2(amb, sw > 0.0 ? sv / sw : vh);',
    ]) expect(NS_GRID2_GLSL).toContain(line);
    // (LR16-P F3) no local arrays: dynamically indexed ones spill to local memory on NVIDIA
    expect(NS_GRID2_GLSL).not.toMatch(/\b(float|int|bool)\s+\w+\[8\]/);
    expect(NS_GRID2_GLSL).not.toMatch(/\b(float|int|bool|[biu]?vec[234])\s+\w+\s*\[/);

    // the bytes: each fixture's grid packed as the fill texture (R ambient, G bounce, B + A x 256 the wall bits) and
    // read by the GLSL written out in JS (`helpers/bounceRead.ts`) equals the field's bounceAt: the acceptance room, a
    // wall off the middle of its cell, a slab off the middle of its cell, a two-lamp room with a doorway
    const rooms = [roomA(), wallRoom(10.65, 1), wallRoom(10.15, 2), slabRoom(3.65, 3)];
    let lit = 0;
    let walled = 0;
    for (const { field, bake } of rooms) {
      const bg = field.bounce;
      const amb = bake.ambient;
      expect(bg.n).toEqual(amb.n);
      expect(bg.origin).toEqual(amb.origin);
      const rgba = new Uint8Array(amb.data.length * 4);
      packFillRGBA(amb.data, bg.g, bg.bits, rgba, amb.n);
      const o = [amb.origin[0], amb.origin[1], amb.origin[2], 1];
      let seed = 3;
      const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const hi = bake.hi;
      for (let k = 0; k < 600; k++) {
        // inside the grid, on its edges and past it; half the points within a metre of the shared wall / the slab
        const near = k % 2 === 0;
        const x = near && hi[0] > 15 ? 9.5 + rnd() * 2.5 : -2 + rnd() * (hi[0] + 3);
        const y = near && hi[0] < 15 ? 2.5 + rnd() * 2.5 : -1.5 + rnd() * (hi[1] + 2);
        const z = -1.5 + rnd() * 14;
        const want = field.bounceAt(x, y, z);
        expect(nsGrid2(rgba, [x, y, z], o, amb.n)[1], `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`).toBeCloseTo(want, 9);
        if (want > 0.02) lit++;
        // (a point whose 8 corners know a wall: the case the fix round is about)
        const c = [x, y, z].map((v, i) => Math.min(amb.n[i]! - 1, Math.max(0, Math.floor(v - amb.origin[i]!))));
        if (bg.bits[c[0]! + amb.n[0] * (c[1]! + amb.n[1] * c[2]!)]! & 7) walled++;
      }
      // R is the ambient grid untouched, B + A the bits
      for (let c = 0; c < amb.data.length; c++) {
        expect(rgba[c * 4]).toBe(amb.data[c]);
        expect(rgba[c * 4 + 2]! + rgba[c * 4 + 3]! * 256).toBe(bg.bits[c]);
      }
    }
    console.info(`nsGrid2 parity: ${lit} lit points, ${walled} beside a wall`);
    expect(lit).toBeGreaterThan(100);
    expect(walled).toBeGreaterThan(300);
  });
});

describe('(LR16-1 fix round) the wall-aware read', () => {
  it('without walls it is the plain trilinear read of the grid', async () => {
    const { trilinear } = await import('../src/world/lightField');
    const { reg, ids, b } = setup();
    const g = new BounceGrid(b, ids, GRID);
    g.sync(reg);
    let seed = 9;
    const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 400; k++) {
      const x = -3 + rnd() * 17;
      const y = -2 + rnd() * 8;
      const z = -4 + rnd() * 15;
      g.sampleInto(x, y, z);
      expect(g.out).toBeCloseTo(trilinear(g.g, 0, -2, -1, -3, N[0], N[1], N[2], 1, x, y, z), 12);
    }
  });

  it('a wall bit stops the blend; a crossing code moves the home to the point\'s side', () => {
    // two cells along x: lit (255) | dark (0)
    const reg = new LightRegistry();
    const id = reg.add({ x: 0, y: 0, z: 0, radius: 4, intensity: 1 }).id;
    const grid = { origin: [0, 0, 0], n: [2, 1, 1] };
    // (30000 steps x weight 1024: past the byte cap, 255)
    const data = new Uint16Array([30000, 0]);
    const boxes = new Int32Array([0, 0, 0, 2, 1, 1]);
    const open = new BounceGrid({ boxes, data, bits: new Uint16Array([0, 0]) }, [id], grid);
    open.sync(reg);
    expect(open.g[0]).toBe(255);
    open.sampleInto(1, 0.5, 0.5);
    expect(open.out).toBeCloseTo(0.5, 9);
    // a wall between the centres (edge bit x on the lower cell): each side reads its own cell
    const wall = new BounceGrid({ boxes, data, bits: new Uint16Array([1, 0]) }, [id], grid);
    wall.sync(reg);
    for (const [x, want] of [[0.9, 1], [0.99, 1], [1.01, 0], [1.4, 0]] as const) {
      wall.sampleInto(x, 0.5, 0.5);
      expect(wall.out, `x ${x}`).toBeCloseTo(want, 12);
    }
    // the wall inside the lit cell, its middle 0.3 m past the lit centre (code 2 on +x): a point 0.3 m or more past the
    // centre (x >= 0.8) reads the dark cell
    const off = new BounceGrid({ boxes, data, bits: new Uint16Array([1 | (2 << BOUNCE_T_SHIFT[0]), 0]) }, [id], grid);
    off.sync(reg);
    for (const [x, want] of [[0.5, 1], [0.79, 1], [0.8, 0], [0.95, 0], [1.2, 0]] as const) {
      off.sampleInto(x, 0.5, 0.5);
      expect(off.out, `x ${x}`).toBeCloseTo(want, 12);
    }
  });

  it('allocates nothing (at most the boxed doubles of its arguments)', async () => {
    const { field } = wallRoom(10.65, 1);
    const g = field.bounce;
    const xs = inputs(500, (k) => 10.3 + (k % 8) * 0.1);
    const bytes = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        g.sampleInto(xs[i]!, 1.5, 5);
        sink[0] = g.out;
      }
    }, 3 * HEAP_NUMBER, { n: 500 });
    expect(sink[0]).toBeGreaterThanOrEqual(0);
    expect(bytes).toBeLessThanOrEqual(3 * HEAP_NUMBER);
  });
});
