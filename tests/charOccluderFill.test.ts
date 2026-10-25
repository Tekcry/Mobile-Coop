/**
 * (char-shadow-meter S2, J16) The interim fill of the character contract (`src/game/charOccluderFill.ts`; brief
 * `docs/char-shadow-meter/briefs/S2.md` steps 1-2):
 * - `put` writes the contract as `CharOccluders.add` does, byte for byte, and nothing past `OCC.max`;
 * - the local slot is today's `rtCapsule` (gameState.ts) for its feet and sample height; a crouch lowers the top, a peek
 *   moves the head end only; remote slots keep their owner keys across fills;
 * - victims: dead ones and ones beyond `FILL.reach` of every player are left out, a full contract counts the overflow;
 * - two machines filling from the same inputs hold the same bytes;
 * - `pictureInto`: players first, then the nearest the local player, at most `max`;
 * - nothing allocates per call (the fills every sim step, the picture every frame);
 * - the field: a guard from `fillVictims` between a lamp and a player's chest lowers his meter by the lamp's share x
 *   `capsuleTransmit`; his own capsule never shades him; a contract of players alone gives today's values to the bit.
 */
import { describe, expect, it } from 'vitest';
import { FILL, FILL_IN, fillPlayers, fillVictims, pictureInto, type VictimLike } from '../src/game/charOccluderFill';
import { lightSampleHeight } from '../src/game/bodyHeight';
import { capsuleTransmit, CharOccluders, holds, OCC, OCC_KIND, occKey } from '../src/world/charOccluders';
import { LightRegistry } from '../src/world/lights';
import type { LightBake } from '../src/world/lightBake';
import { packShapes, type VoxelShape } from '../src/voxel/shapes';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

const rng = (seed: number) => (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const victim = (x: number, y: number, z: number, height = 1.75, alive = true): VictimLike => ({ alive, pos: { x, y, z }, def: { height } });
/** A `pin` of `n` slots: feet, sample height, peek. */
const pinOf = (slots: [number, number, number, number, number, number][]): Float64Array => {
  const p = new Float64Array(FILL.players * FILL_IN);
  slots.forEach((s, k) => p.set(s, k * FILL_IN));
  return p;
};
/** gameState.ts `rtCapsule`, as float32: [ax, ay, az, r, bx, by, bz]. */
const rt = (x: number, y: number, z: number, h: number): number[] =>
  [x, y + 0.25, z, 0.22, x, y + Math.max(0.5, h - 0.2), z].map((v) => Math.fround(v));
/** Capsule `i` of a contract as [ax, ay, az, r, bx, by, bz]. */
const capOf = (c: CharOccluders, i: number): number[] => {
  const o = i * OCC.stride;
  return [c.cap[o]!, c.cap[o + 1]!, c.cap[o + 2]!, c.cap[o + 6]!, c.cap[o + 3]!, c.cap[o + 4]!, c.cap[o + 5]!];
};
const bytes = (c: CharOccluders): number[] => [...new Uint8Array(c.cap.buffer), ...new Uint8Array(c.owner.buffer), c.n];

describe('charOccluderFill: the capsules (step 1)', () => {
  it('put writes what CharOccluders.add writes, byte for byte, and nothing past OCC.max', () => {
    const rnd = rng(9);
    const vs: VictimLike[] = [];
    for (let i = 0; i < OCC.max + 6; i++) vs.push(victim(-20 + rnd() * 40, rnd() * 3, -20 + rnd() * 40, 1.2 + rnd() * 0.8));
    const pin = pinOf([[0, 0, 0, 1.75, 0, 0]]);
    const keys = new Int32Array(FILL.players);
    const a = new CharOccluders();
    fillPlayers(a, pin, 1, keys);
    const over = fillVictims(a, vs, pin, 1);
    const b = new CharOccluders();
    b.clear();
    b.add(OCC_KIND.player, 0, 0, 0.25, 0, 0, 1.55, 0, 0.22);
    let missed = 0;
    vs.forEach((v, i) => {
      if (b.add(OCC_KIND.guard, i, v.pos.x, v.pos.y + 0.25, v.pos.z, v.pos.x, v.pos.y + Math.max(0.5, v.def.height - 0.2), v.pos.z, 0.22) < 0) missed++;
    });
    expect(bytes(a)).toEqual(bytes(b));
    expect(a.n).toBe(OCC.max);
    expect(over).toBe(missed);
    expect(over).toBe(7);
    expect(a.version).toBe(b.version);
  });

  it('the local slot is rtCapsule for its feet and h; a crouch lowers the top by 0.35 x 1.75; a peek moves the head end only', () => {
    const c = new CharOccluders();
    const keys = new Int32Array(FILL.players);
    fillPlayers(c, pinOf([[2, 0.5, -3, 1.75, 0, 0]]), 1, keys);
    expect(c.n).toBe(1);
    expect(capOf(c, 0)).toEqual(rt(2, 0.5, -3, 1.75));
    expect(keys[0]).toBe(occKey(OCC_KIND.player, 0));
    const stand = capOf(c, 0)[5]!;
    fillPlayers(c, pinOf([[2, 0.5, -3, lightSampleHeight(1.75, 1), 0, 0]]), 1, keys);
    expect(capOf(c, 0)).toEqual(rt(2, 0.5, -3, lightSampleHeight(1.75, 1)));
    expect(stand - capOf(c, 0)[5]!).toBeCloseTo(0.35 * 1.75, 6);
    fillPlayers(c, pinOf([[2, 0.5, -3, 1.75, 0.3, -0.2]]), 1, keys);
    const peek = capOf(c, 0);
    const still = rt(2, 0.5, -3, 1.75);
    expect(peek.slice(0, 4)).toEqual(still.slice(0, 4));
    expect(peek.slice(4)).toEqual([Math.fround(2.3), still[5], Math.fround(-3.2)]);
    // (a very short sample keeps the 0.5 m top)
    fillPlayers(c, pinOf([[0, 0, 0, 0.4, 0, 0]]), 1, keys);
    expect(capOf(c, 0)[5]).toBe(Math.fround(0.5));
  });

  it('remote slots: owner keys occKey(1, s), the same across two fills, keys[s] set', () => {
    const c = new CharOccluders();
    const keys = new Int32Array(FILL.players).fill(-7);
    const pin = pinOf([[0, 0, 0, 1.68, 0, 0], [4, 0, 1, 1.75, 0, 0], [-6, 0, 2, 1.1375, 0, 0], [1, 3, -9, 1.75, 0.2, 0]]);
    fillPlayers(c, pin, 4, keys);
    const owners = Array.from(c.owner.subarray(0, 4));
    expect(owners).toEqual([0, 1, 2, 3].map((s) => occKey(OCC_KIND.player, s)));
    expect(Array.from(keys)).toEqual(owners);
    fillPlayers(c, pin, 4, keys);
    expect(Array.from(c.owner.subarray(0, 4))).toEqual(owners);
    expect(c.n).toBe(4);
    for (let s = 0; s < 4; s++) expect(c.cap[s * OCC.stride + 7]).toBe(OCC_KIND.player);
    // (fewer slots: only those, the rest of keys untouched)
    keys.fill(-7);
    fillPlayers(c, pin, 2, keys);
    expect(Array.from(keys)).toEqual([occKey(1, 0), occKey(1, 1), -7, -7]);
  });

  it('victims: a dead one absent, one 31 m from every player absent, one 31 m from the local player but 5 m from a remote present', () => {
    const c = new CharOccluders();
    const keys = new Int32Array(FILL.players);
    const pin = pinOf([[0, 0, 0, 1.75, 0, 0], [36, 0, 0, 1.75, 0, 0]]);
    const vs = [victim(3, 0, 0, 1.75, false), victim(0, 0, 31), victim(31, 0, 0, 1.8), victim(2, 0, 2)];
    fillPlayers(c, pin, 2, keys);
    expect(fillVictims(c, vs, pin, 2)).toBe(0);
    expect(c.n).toBe(4);
    expect(Array.from(c.owner.subarray(2, 4))).toEqual([occKey(OCC_KIND.guard, 2), occKey(OCC_KIND.guard, 3)]);
    expect(capOf(c, 2)).toEqual(rt(31, 0, 0, 1.8));
    // (the local player alone: the one 31 m away is out)
    fillPlayers(c, pin, 1, keys);
    fillVictims(c, vs, pin, 1);
    expect(Array.from(c.owner.subarray(0, c.n))).toEqual([occKey(OCC_KIND.player, 0), occKey(OCC_KIND.guard, 3)]);
    // (exactly at the reach: in)
    fillPlayers(c, pin, 1, keys);
    fillVictims(c, [victim(FILL.reach, 0, 0)], pin, 1);
    expect(c.n).toBe(2);
  });

  it('two machines: two contracts filled from the same pin and victims hold the same bytes', () => {
    const rnd = rng(21);
    const vs: VictimLike[] = [];
    for (let i = 0; i < 40; i++) vs.push(victim(-30 + rnd() * 60, rnd() * 4, -30 + rnd() * 60, 1.5 + rnd() * 0.4, rnd() > 0.2));
    const pin = pinOf([[0, 0, 0, 1.68, 0.1, 0], [5, 0, 5, 1.75, 0, 0], [-9, 3, 4, 1.1375, 0, -0.25]]);
    const one = new CharOccluders();
    const two = new CharOccluders();
    const k1 = new Int32Array(FILL.players);
    const k2 = new Int32Array(FILL.players);
    // (machine two has filled before: the version differs, the bytes do not)
    fillPlayers(two, pinOf([[50, 0, 50, 1.75, 0, 0]]), 1, k2);
    fillVictims(two, vs.slice(0, 5), pin, 1);
    fillPlayers(one, pin, 3, k1);
    fillVictims(one, vs, pin, 3);
    fillPlayers(two, pin, 3, k2);
    fillVictims(two, vs, pin, 3);
    expect(Array.from(new Uint8Array(two.cap.buffer, 0, two.n * OCC.stride * 4))).toEqual(Array.from(new Uint8Array(one.cap.buffer, 0, one.n * OCC.stride * 4)));
    expect(Array.from(new Uint8Array(two.owner.buffer, 0, two.n * 4))).toEqual(Array.from(new Uint8Array(one.owner.buffer, 0, one.n * 4)));
    expect(Array.from(k2)).toEqual(Array.from(k1));
    expect(one.n).toBeGreaterThan(10);
  });

  it('pictureInto: players first, then the nearest the local player (ties by slot), at most max; a[c*4+3] is r', () => {
    const c = new CharOccluders();
    const keys = new Int32Array(FILL.players);
    const pin = pinOf([[0, 0, 0, 1.75, 0, 0], [20, 0, 0, 1.75, 0, 0], [-20, 0, 0, 1.75, 0, 0]]);
    const rnd = rng(5);
    const vs: VictimLike[] = [];
    for (let i = 0; i < 37; i++) vs.push(victim(-25 + rnd() * 50, 0, -25 + rnd() * 50));
    // two at the same distance (a tie: the lower slot first)
    vs[10] = victim(1, 0, 1);
    vs[11] = victim(-1, 0, -1);
    fillPlayers(c, pin, 3, keys);
    fillVictims(c, vs, pin, 3);
    expect(c.n).toBe(40);
    const a = new Float32Array(16 * 4);
    const b = new Float32Array(16 * 4);
    const n = pictureInto(c, a, b, 16, pin);
    expect(n).toBe(16);
    // the players in contract order
    for (let k = 0; k < 3; k++) {
      expect([a[k * 4], a[k * 4 + 1], a[k * 4 + 2], a[k * 4 + 3], b[k * 4], b[k * 4 + 1], b[k * 4 + 2]]).toEqual(capOf(c, k));
    }
    // then the others by squared horizontal midpoint distance to slot 0
    const others = Array.from({ length: 37 }, (_, i) => i + 3).map((i) => {
      const o = i * OCC.stride;
      const mx = (c.cap[o]! + c.cap[o + 3]!) * 0.5;
      const mz = (c.cap[o + 2]! + c.cap[o + 5]!) * 0.5;
      return { i, d: mx * mx + mz * mz };
    }).sort((p, q) => p.d - q.d || p.i - q.i);
    for (let k = 3; k < 16; k++) {
      expect([a[k * 4], a[k * 4 + 1], a[k * 4 + 2], a[k * 4 + 3], b[k * 4], b[k * 4 + 1], b[k * 4 + 2]], `picture ${k}`).toEqual(capOf(c, others[k - 3]!.i));
      expect(a[k * 4 + 3]).toBe(Math.fround(FILL.r));
    }
    expect([a[12], a[16]]).toEqual([Math.fround(1), Math.fround(-1)]);
    // (fewer than max: all; max under the player count: the first players only)
    const few = new CharOccluders();
    fillPlayers(few, pin, 3, keys);
    fillVictims(few, vs.slice(10, 12), pin, 3);
    expect(pictureInto(few, a, b, 16, pin)).toBe(5);
    expect(pictureInto(c, a, b, 2, pin)).toBe(2);
    expect(a[4]).toBe(Math.fround(20));
    const none = new CharOccluders();
    expect(pictureInto(none, a, b, 16, pin)).toBe(0);
  });
});

describe('charOccluderFill: no allocation per call (step 1)', () => {
  it('fillPlayers(4) + fillVictims(32) and pictureInto(16) read under one HeapNumber per call; a vector per call reads 32 B+', async () => {
    const rnd = rng(13);
    const vs: VictimLike[] = [];
    for (let i = 0; i < 32; i++) vs.push(victim(-20 + rnd() * 40, 0, -20 + rnd() * 40, 1.6 + rnd() * 0.3));
    const pin = pinOf([[0, 0, 0, 1.68, 0.1, 0], [5, 0, 5, 1.75, 0, 0], [-9, 0, 4, 1.1375, 0, -0.25], [3, 0, -8, 1.75, 0, 0]]);
    const keys = new Int32Array(FILL.players);
    const c = new CharOccluders();
    const a = new Float32Array(16 * 4);
    const b = new Float32Array(16 * 4);
    const N = 2000;
    const per = (fn: (n: number) => void, goal: number): Promise<number> => bytesPerCall(fn, goal, { n: N, warm: 100000 });
    const fill = await per((n) => {
      for (let i = 0; i < n; i++) {
        fillPlayers(c, pin, 4, keys);
        sink[0] = fillVictims(c, vs, pin, 4);
      }
    }, 0);
    fillPlayers(c, pin, 4, keys);
    fillVictims(c, vs, pin, 4);
    const pic = await per((n) => {
      for (let i = 0; i < n; i++) sink[1] = pictureInto(c, a, b, 16, pin);
    }, 0);
    const P = inputs(N * 3, (k) => k * 0.5);
    const ring: object[] = new Array<object>(64);
    const ctl = await per((n) => {
      for (let i = 0; i < n; i++) {
        const v = { x: P[i * 3]!, y: P[i * 3 + 1]!, z: P[i * 3 + 2]! };
        ring[i & 63] = v;
      }
    }, -Infinity);
    console.info(`bytes per call: fillPlayers(4) + fillVictims(32) ${fill.toFixed(1)}, pictureInto(16) ${pic.toFixed(1)}, control with a vector ${ctl.toFixed(1)}; ${c.n} capsules`);
    expect(c.n).toBe(36);
    expect(fill).toBeLessThan(HEAP_NUMBER);
    expect(pic).toBeLessThan(HEAP_NUMBER);
    expect(ctl).toBeGreaterThanOrEqual(32);
  }, 120_000);
});

describe('charOccluderFill: the field (step 2)', async () => {
  const { LightField } = await import('../src/world/lightField');
  const { bakeLamps } = await import('../src/voxel/lampBake');
  const { bakedLights } = await import('../src/world/lightBake');
  const { buildAmbientGrid } = await import('../src/world/ambientGrid');

  const box = (c: [number, number, number], s: [number, number, number]): VoxelShape => ({ kind: 'box', c, s, yaw: 0, pitch: 0, mat: 1 });

  /** One lamp low on the west side (x -3, 1.6 m up) over a floor under a roof (no moon on the floor), baked as the game
   *  does (the one-lamp form of tests/lightField.test.ts's scene). */
  function scene(): { reg: LightRegistry; bake: LightBake } {
    const reg = new LightRegistry();
    reg.ambient = 0.15;
    reg.add({ x: -3, y: 1.6, z: 0, radius: 7, intensity: 0.8 });
    const shapes = packShapes([box([0, -0.25, 0], [20, 0.5, 20]), box([0, 4.1, 0], [20, 0.2, 20])]);
    const lo: [number, number, number] = [-11, -1, -11];
    const hi: [number, number, number] = [11, 6, 11];
    const baked = bakedLights(reg);
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes, lights: baked.lights, lo, hi });
    const s = Math.SQRT1_2;
    const dir: [number, number, number] = [s, s, 0];
    const n: [number, number, number] = [44, 14, 44];
    const m = bakeMoon({ kind: 'moon', id: 0, origin: lo, n, shapes, dir });
    const moonL = 0.05;
    const sky = reg.ambient - moonL;
    const ambient = buildAmbientGrid({ ambientAt: () => sky }, lo, hi);
    return { reg, bake: { lo, hi, lampKey: 'k', moonKey: 'm', lamps: { baked, r }, moon: { origin: lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: moonL, ms: 0 } };
  }

  /** The field's value at a point with the contract, from its parts: every source's share x (1 - the product of
   *  `capsuleTransmit` over the capsules between, owner `skip` and holders left out), taken off today's total. */
  function parts(f: InstanceType<typeof LightField>, reg: LightRegistry, b: LightBake, c: CharOccluders, x: number, y: number, z: number, skip: number): { v: number; hit: number } {
    const ids = new Int32Array(64);
    const lv = new Float32Array(64);
    const n = f.sourcesInto(x, y, z, ids, lv, 64);
    let v = f.totalAt(x, y, z);
    let hit = 0;
    for (let k = 0; k < n; k++) {
      const id = ids[k]!;
      let sx: number;
      let sy: number;
      let sz: number;
      if (id === -1) {
        sx = x + b.moon.dir[0] * 60;
        sy = y + b.moon.dir[1] * 60;
        sz = z + b.moon.dir[2] * 60;
      } else {
        const L = b.lamps!.baked.lights;
        const st = L.length / b.lamps!.baked.ids.length;
        const bi = b.lamps!.baked.ids.indexOf(id);
        sx = L[bi * st]!;
        sy = L[bi * st + 1]!;
        sz = L[bi * st + 2]!;
        void reg;
      }
      let t = 1;
      for (let i = 0; i < c.n; i++) {
        if (c.owner[i] === skip) continue;
        const o = i * OCC.stride;
        const C = c.cap;
        if (holds(sx, sy, sz, C[o]!, C[o + 1]!, C[o + 2]!, C[o + 3]!, C[o + 4]!, C[o + 5]!, C[o + 6]!)) continue;
        t *= capsuleTransmit(x, y, z, sx, sy, sz, C[o]!, C[o + 1]!, C[o + 2]!, C[o + 3]!, C[o + 4]!, C[o + 5]!, C[o + 6]!);
      }
      if (t < 1) hit++;
      v -= f.sourceAt(id, x, y, z) * (1 - t);
    }
    return { v, hit };
  }

  it('a guard from fillVictims between the lamp and the chest lowers bodyLevel by the lamp share x capsuleTransmit', () => {
    const { reg, bake } = scene();
    const f = new LightField(bake, reg);
    const h = 1.75;
    const pin = pinOf([[0, 0, 0, h, 0, 0]]);
    const c = new CharOccluders();
    const keys = new Int32Array(FILL.players);
    fillPlayers(c, pin, 1, keys);
    // (half way to the lamp, on the ray to the chest and the head)
    expect(fillVictims(c, [victim(-1.5, 0, 0)], pin, 1)).toBe(0);
    const before = f.bodyLevel(0, 0, 0, h);
    const got = f.bodyLevel(0, 0, 0, h, undefined, 0, 0, c, keys[0]);
    expect(got).toBeLessThan(before);
    const chest = parts(f, reg, bake, c, 0, h * 0.6, 0, keys[0]!);
    const head = parts(f, reg, bake, c, 0, h * 0.95, 0, keys[0]!);
    // (the chest is shaded; the head, above the downward lamp, gets none of it: the chest decides the meter)
    expect(chest.hit).toBe(1);
    expect(head.hit).toBe(0);
    expect(chest.v).toBeGreaterThan(head.v);
    expect(got).toBeCloseTo(Math.max(chest.v, head.v), 12);
    // the lamp's own share, the formula's number (never a literal)
    const g = capOf(c, 1);
    const L = bake.lamps!.baked.lights;
    const T = capsuleTransmit(0, h * 0.6, 0, L[0]!, L[1]!, L[2]!, g[0]!, g[1]!, g[2]!, g[4]!, g[5]!, g[6]!, g[3]!);
    expect(T).toBeLessThan(1);
    expect(f.totalAt(0, h * 0.6, 0, undefined, c, keys[0])).toBeCloseTo(f.totalAt(0, h * 0.6, 0) - f.lampAt(0, 0, h * 0.6, 0) * (1 - T), 12);
  });

  it("the player's own capsule never shades him; a contract of players alone gives today's value for each, to the bit", () => {
    const { reg, bake } = scene();
    const f = new LightField(bake, reg);
    const c = new CharOccluders();
    const keys = new Int32Array(FILL.players);
    // (around the lamp, none between it and another)
    const slots: [number, number, number, number, number, number][] = [
      [0, 0, 0, 1.75, 0, 0], [-3, 0, 3, 1.68, 0, 0], [-3, 0, -3, lightSampleHeight(1.75, 1), 0, 0], [-6, 0, 0, 1.75, 0.2, 0.1],
    ];
    const pin = pinOf(slots);
    fillPlayers(c, pin, 4, keys);
    slots.forEach(([x, y, z, h, ox, oz], s) => {
      const today = f.bodyLevel(x, y, z, h, undefined, ox, oz);
      expect(Object.is(f.bodyLevel(x, y, z, h, undefined, ox, oz, c, keys[s]), today), `slot ${s}`).toBe(true);
    });
    // (his own capsule alone, his key skipped: today's value; not skipped, he stands on its own surface: the same)
    const own = new CharOccluders();
    fillPlayers(own, pinOf([slots[0]!]), 1, keys);
    expect(Object.is(f.bodyLevel(0, 0, 0, 1.75, undefined, 0, 0, own, keys[0]), f.bodyLevel(0, 0, 0, 1.75))).toBe(true);
  });
});
