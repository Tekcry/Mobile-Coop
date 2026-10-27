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
 * - (S2c) `slotInto`, one player slot's inputs shared by the host's remotes and a client's partners, gives A2's inline
 *   formula (gameState.ts `fillChars`) to the bit;
 * - the field: a guard from `fillVictims` between a lamp and a player's chest lowers his meter by the lamp's share x
 *   `capsuleTransmit`; his own capsule never shades him; a contract of players alone gives today's values to the bit.
 * - (player-j16) `fillOperator`, a carried body's capsule: `LOAD`'s formula, the carrier's owner key, after every upright
 *   (ShadowCues' first match), none on a full contract, the same bytes on two machines, ridden with the players in the
 *   picture; it shades a partner's meter, never the carrier's own; nothing allocates.
 */
import { describe, expect, it } from 'vitest';
import { FILL, FILL_IN, fillOperator, fillPlayers, fillVictims, LOAD, LOAD_IN, pictureInto, slotInto, type MateLike, type VictimLike } from '../src/game/charOccluderFill';
import { lightSampleHeight, STANDARD_BODY } from '../src/game/bodyHeight';
import { posedHeadSample } from '../src/player/wallController';
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
/** (S2c) A2's inline slot formula (gameState.ts `fillChars` before S2c), restated: one player slot's 6 doubles. */
const a2Of = (r: MateLike): number[] => {
  const rh = r.head;
  if (rh) {
    const hs = posedHeadSample(r.feet.x, r.feet.y, r.feet.z, rh.x, rh.y, rh.z, { ox: 0, oz: 0, h: 0 });
    return [r.feet.x, r.feet.y, r.feet.z, hs.h, hs.ox, hs.oz];
  }
  return [r.feet.x, r.feet.y, r.feet.z, lightSampleHeight(r.height ?? STANDARD_BODY, r.crouched ? 1 : 0), r.peekX ?? 0, r.peekZ ?? 0];
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
  it('slotInto x3 + fillPlayers(4) + fillVictims(32) and pictureInto(16) read under one HeapNumber per call; a vector per call reads 32 B+', async () => {
    const rnd = rng(13);
    const vs: VictimLike[] = [];
    for (let i = 0; i < 32; i++) vs.push(victim(-20 + rnd() * 40, 0, -20 + rnd() * 40, 1.6 + rnd() * 0.3));
    const pin = pinOf([[0, 0, 0, 1.68, 0.1, 0], [5, 0, 5, 1.75, 0, 0], [-9, 0, 4, 1.1375, 0, -0.25], [3, 0, -8, 1.75, 0, 0]]);
    const keys = new Int32Array(FILL.players);
    const c = new CharOccluders();
    const a = new Float32Array(16 * 4);
    const b = new Float32Array(16 * 4);
    // (S2c) three player slots through `slotInto` each call, one ref shape (a client's `CharMates` entries): on a wall,
    // crouched, peeking
    const slots = new Float64Array(FILL.players * FILL_IN);
    const m1: MateLike = { feet: { x: 5, y: 0, z: 5 }, crouched: false, height: 1.68, peekX: 0, peekZ: 0, head: { x: 5.1, y: 1.5, z: 4.8 } };
    const m2: MateLike = { feet: { x: -9, y: 0, z: 4 }, crouched: true, height: 1.75, peekX: 0, peekZ: 0, head: null };
    const m3: MateLike = { feet: { x: 3, y: 0, z: -8 }, crouched: false, height: 1.75, peekX: 0.2, peekZ: -0.1, head: null };
    const N = 2000;
    const per = (fn: (n: number) => void, goal: number): Promise<number> => bytesPerCall(fn, goal, { n: N, warm: 100000 });
    const fill = await per((n) => {
      for (let i = 0; i < n; i++) {
        slotInto(slots, 1, m1);
        slotInto(slots, 2, m2);
        slotInto(slots, 3, m3);
        fillPlayers(c, pin, 4, keys);
        sink[0] = fillVictims(c, vs, pin, 4);
      }
    }, 0);
    expect(Array.from(slots.subarray(FILL_IN, 4 * FILL_IN))).toEqual([...a2Of(m1), ...a2Of(m2), ...a2Of(m3)]);
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
    console.info(`bytes per call: slotInto x3 + fillPlayers(4) + fillVictims(32) ${fill.toFixed(1)}, pictureInto(16) ${pic.toFixed(1)}, control with a vector ${ctl.toFixed(1)}; ${c.n} capsules`);
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

  it("(player-j16, 7) a carrier's load shades a partner's chest by the lamp share x capsuleTransmit; never the carrier's own meter", () => {
    const { reg, bake } = scene();
    const f = new LightField(bake, reg);
    const h = 1.75;
    // the carrier (slot 0) beside the partner (slot 1, the origin), his load hanging across the lamp-to-chest ray; his
    // upright capsule and his load clear of the partner's head (placement found by search, the values below computed)
    const cx = -0.3;
    const cz = 0.35;
    const pin = pinOf([[cx, 0, cz, 1.68, 0, 0], [0, 0, 0, h, 0, 0]]);
    const lin = new Float64Array(FILL.players * LOAD_IN);
    lin[0] = -1;
    lin[1] = -Math.PI / 4;
    const keys = new Int32Array(FILL.players);
    const bare = new CharOccluders();
    fillPlayers(bare, pin, 2, keys);
    const c = new CharOccluders();
    fillPlayers(c, pin, 2, keys);
    expect(fillOperator(c, pin, lin, 2, keys)).toBe(0);
    expect(c.n).toBe(3);
    const L = bake.lamps!.baked.lights;
    const T = (cap: number[], py: number): number =>
      capsuleTransmit(0, py, 0, L[0]!, L[1]!, L[2]!, cap[0]!, cap[1]!, cap[2]!, cap[4]!, cap[5]!, cap[6]!, cap[3]!);
    // (the geometry: the carrier's upright passes the partner's chest and head; the load only the chest)
    expect(T(capOf(c, 0), h * 0.6)).toBe(1);
    expect(T(capOf(c, 0), h * 0.95)).toBe(1);
    const tl = T(capOf(c, 2), h * 0.6);
    expect(tl).toBeLessThan(0.6);
    expect(T(capOf(c, 2), h * 0.95)).toBe(1);
    // the partner: lower with the load, by the lamp's share at the chest x (1 - the load's capsuleTransmit)
    const without = f.bodyLevel(0, 0, 0, h, undefined, 0, 0, bare, keys[1]);
    const got = f.bodyLevel(0, 0, 0, h, undefined, 0, 0, c, keys[1]);
    expect(got).toBeLessThan(without);
    const chestNo = f.totalAt(0, h * 0.6, 0, undefined, bare, keys[1]);
    expect(f.totalAt(0, h * 0.6, 0, undefined, c, keys[1])).toBeCloseTo(chestNo - f.lampAt(0, 0, h * 0.6, 0) * (1 - tl), 12);
    const chest = parts(f, reg, bake, c, 0, h * 0.6, 0, keys[1]!);
    const head = parts(f, reg, bake, c, 0, h * 0.95, 0, keys[1]!);
    expect(chest.hit).toBe(1);
    expect(got).toBeCloseTo(Math.max(chest.v, head.v), 12);
    // the carrier: his own load never shades him (his key), to the bit
    const own = f.bodyLevel(cx, 0, cz, 1.68, undefined, 0, 0, c, keys[0]);
    expect(Object.is(own, f.bodyLevel(cx, 0, cz, 1.68, undefined, 0, 0, bare, keys[0]))).toBe(true);
  });
});

describe('fillOperator (player-j16)', () => {
  /** The brief's formula from `LOAD` as float32 [ax, ay, az, r, bx, by, bz] (as `capOf`). */
  const loadOf = (x: number, y: number, z: number, h: number, side: number, yaw: number): number[] => {
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const ax = x + rx * side * LOAD.side;
    const ay = y + h * LOAD.hip;
    const az = z + rz * side * LOAD.side;
    return [ax, ay, az, LOAD.r, ax - fx * LOAD.back, Math.max(ay - LOAD.hang, y + LOAD.low), az - fz * LOAD.back].map((v) => Math.fround(v));
  };
  const linOf = (loads: [number, number, number][]): Float64Array => {
    const l = new Float64Array(FILL.players * LOAD_IN);
    for (const [s, side, yaw] of loads) {
      l[s * LOAD_IN] = side;
      l[s * LOAD_IN + 1] = yaw;
    }
    return l;
  };
  const near = (a: number[], b: number[]): void => {
    for (let i = 0; i < a.length; i++) expect(a[i]!, `float ${i}`).toBeCloseTo(b[i]!, 5);
  };

  it('(1) every lin 0: the contract bytes are unchanged and it returns 0', () => {
    const pin = pinOf([[0, 0, 0, 1.68, 0, 0], [4, 0, 1, 1.75, 0, 0], [-6, 0, 2, 1.1375, 0, 0], [1, 3, -9, 1.75, 0.2, 0]]);
    const keys = new Int32Array(FILL.players);
    const c = new CharOccluders();
    fillPlayers(c, pin, 4, keys);
    fillVictims(c, [victim(1, 0, 1), victim(2, 0, -3)], pin, 4);
    const before = bytes(c);
    expect(fillOperator(c, pin, new Float64Array(FILL.players * LOAD_IN), 4, keys)).toBe(0);
    expect(bytes(c)).toEqual(before);
  });

  it("(2) slot 0 at (1, 0, 2), h 1.68, yaw 0, side 1: LOAD's formula, r LOAD.r, kind player, owner keys[0]; side, yaw and crouch move it", () => {
    const keys = new Int32Array(FILL.players);
    const c = new CharOccluders();
    const at = (h: number, side: number, yaw: number, y = 0): number[] => {
      const pin = pinOf([[1, y, 2, h, 0, 0]]);
      fillPlayers(c, pin, 1, keys);
      expect(fillOperator(c, pin, linOf([[0, side, yaw]]), 1, keys)).toBe(0);
      expect(c.n).toBe(2);
      expect(c.cap[OCC.stride + 7]).toBe(OCC_KIND.player);
      expect(c.owner[1]).toBe(keys[0]);
      expect(keys[0]).toBe(occKey(OCC_KIND.player, 0));
      return capOf(c, 1);
    };
    const right = at(1.68, 1, 0);
    expect(right).toEqual(loadOf(1, 0, 2, 1.68, 1, 0));
    expect(right[3]).toBe(Math.fround(LOAD.r));
    // (the brief's standing numbers: hips 1.48 m up on his right, the head end 0.83 m up and 0.25 m behind)
    expect([right[0], right[1], right[5], right[6]].map((v) => +v!.toFixed(2))).toEqual([1.14, 1.48, 0.83, 1.75]);
    // side -1: the same distance to his left, the same heights
    const left = at(1.68, -1, 0);
    expect(left).toEqual(loadOf(1, 0, 2, 1.68, -1, 0));
    expect(left[0]! - 1).toBeCloseTo(-(right[0]! - 1), 6);
    expect([left[1], left[2], left[5], left[6]]).toEqual([right[1], right[2], right[5], right[6]]);
    // yaw PI/2 (facing +X): his right is -Z, behind him is -X
    const turned = at(1.68, 1, Math.PI / 2);
    near(turned, loadOf(1, 0, 2, 1.68, 1, Math.PI / 2));
    near([turned[0]!, turned[2]!, turned[4]!, turned[6]!], [1, 2 - LOAD.side, 1 - LOAD.back, 2 - LOAD.side]);
    // crouched: the hips drop by the sample height's ratio, the head end with them (the brief's 0.96 m and 0.31 m)
    const hc = lightSampleHeight(1.68, 1);
    const crouched = at(hc, 1, 0);
    expect(crouched).toEqual(loadOf(1, 0, 2, hc, 1, 0));
    expect(crouched[1]! / right[1]!).toBeCloseTo(hc / 1.68, 6);
    expect([crouched[1], crouched[5]].map((v) => +v!.toFixed(2))).toEqual([0.96, 0.31]);
    // a sample height low enough that the drop would reach under LOAD.low: the head end is clamped to y + LOAD.low
    const low = at(0.9, 1, 0, 0.5);
    expect(low).toEqual(loadOf(1, 0.5, 2, 0.9, 1, 0));
    expect(0.9 * LOAD.hip - LOAD.hang).toBeLessThan(LOAD.low);
    expect(low[5]).toBe(Math.fround(0.5 + LOAD.low));
  });

  it("(3) order: after fillPlayers(4) + fillVictims(8) the loads of slots 0 and 2 are last; each slot's first owner match is its upright", () => {
    const pin = pinOf([[0, 0, 0, 1.68, 0, 0], [4, 0, 1, 1.75, 0, 0], [-6, 0, 2, 1.1375, 0, 0], [1, 3, -9, 1.75, 0.2, 0]]);
    const keys = new Int32Array(FILL.players);
    const c = new CharOccluders();
    fillPlayers(c, pin, 4, keys);
    const vs: VictimLike[] = [];
    for (let i = 0; i < 8; i++) vs.push(victim(-5 + i, 0, 3 - i));
    expect(fillVictims(c, vs, pin, 4)).toBe(0);
    expect(c.n).toBe(12);
    expect(fillOperator(c, pin, linOf([[0, 1, 0.3], [2, -1, -2]]), 4, keys)).toBe(0);
    expect(c.n).toBe(14);
    const owners = Array.from(c.owner.subarray(0, c.n));
    for (let s = 0; s < 4; s++) expect(owners.indexOf(keys[s]!), `slot ${s}`).toBe(s);
    expect(owners.slice(12)).toEqual([keys[0], keys[2]]);
    expect(capOf(c, 12)).toEqual(loadOf(0, 0, 0, 1.68, 1, 0.3));
    expect(capOf(c, 13)).toEqual(loadOf(-6, 0, 2, 1.1375, -1, -2));
  });

  it('(4) keys[s] -1 gives slot s no load; a full contract returns the loads not written and writes nothing', () => {
    const pin = pinOf([[0, 0, 0, 1.68, 0, 0], [4, 0, 1, 1.75, 0, 0], [-6, 0, 2, 1.1375, 0, 0], [1, 3, -9, 1.75, 0.2, 0]]);
    const keys = new Int32Array(FILL.players);
    const c = new CharOccluders();
    fillPlayers(c, pin, 4, keys);
    keys[1] = -1;
    expect(fillOperator(c, pin, linOf([[0, 1, 0], [1, 1, 0], [2, -1, 0]]), 4, keys)).toBe(0);
    expect(Array.from(c.owner.subarray(4, c.n))).toEqual([keys[0], keys[2]]);
    // full: 4 uprights + 60 guards
    fillPlayers(c, pin, 4, keys);
    const vs: VictimLike[] = [];
    for (let i = 0; i < OCC.max; i++) vs.push(victim(-10 + (i % 10) * 2, 0, -10 + Math.floor(i / 10) * 2));
    expect(fillVictims(c, vs, pin, 4)).toBe(4);
    expect(c.n).toBe(OCC.max);
    const before = bytes(c);
    expect(fillOperator(c, pin, linOf([[0, 1, 0], [1, -1, 1], [2, 1, 2], [3, -1, 3]]), 4, keys)).toBe(4);
    expect(bytes(c)).toEqual(before);
  });

  it('(5) two machines: two contracts filled from the same pin, victims and lin hold the same bytes', () => {
    const rnd = rng(77);
    const vs: VictimLike[] = [];
    for (let i = 0; i < 30; i++) vs.push(victim(-20 + rnd() * 40, rnd() * 3, -20 + rnd() * 40, 1.5 + rnd() * 0.4, rnd() > 0.2));
    const pin = pinOf([[0, 0, 0, 1.68, 0.1, 0], [5, 0, 5, 1.75, 0, 0], [-9, 3, 4, 1.1375, 0, -0.25]]);
    const lin = linOf([[0, 1, 0.37], [2, -1, -2.9]]);
    const one = new CharOccluders();
    const two = new CharOccluders();
    const k1 = new Int32Array(FILL.players);
    const k2 = new Int32Array(FILL.players);
    // (machine two has filled before, with other loads)
    fillPlayers(two, pinOf([[50, 0, 50, 1.75, 0, 0]]), 1, k2);
    fillOperator(two, pin, linOf([[0, -1, 1]]), 1, k2);
    fillPlayers(one, pin, 3, k1);
    fillVictims(one, vs, pin, 3);
    fillOperator(one, pin, lin, 3, k1);
    fillPlayers(two, pin, 3, k2);
    fillVictims(two, vs, pin, 3);
    fillOperator(two, pin, lin, 3, k2);
    expect(two.n).toBe(one.n);
    expect(Array.from(new Uint8Array(two.cap.buffer, 0, two.n * OCC.stride * 4))).toEqual(Array.from(new Uint8Array(one.cap.buffer, 0, one.n * OCC.stride * 4)));
    expect(Array.from(new Uint8Array(two.owner.buffer, 0, two.n * 4))).toEqual(Array.from(new Uint8Array(one.owner.buffer, 0, one.n * 4)));
    expect(Array.from(one.owner.subarray(one.n - 2, one.n))).toEqual([k1[0], k1[2]]);
  });

  it('(6) pictureInto(16): the four uprights, then the loads, before any guard', () => {
    const pin = pinOf([[0, 0, 0, 1.68, 0, 0], [20, 0, 0, 1.75, 0, 0], [-20, 0, 0, 1.75, 0, 0], [0, 0, 20, 1.75, 0, 0]]);
    const keys = new Int32Array(FILL.players);
    const c = new CharOccluders();
    fillPlayers(c, pin, 4, keys);
    // (a guard nearer the local player than any load's carrier but slot 0's own)
    fillVictims(c, [victim(0.5, 0, 0.5), victim(3, 0, 3)], pin, 4);
    fillOperator(c, pin, linOf([[1, 1, 0], [3, -1, 1]]), 4, keys);
    expect(c.n).toBe(8);
    const a = new Float32Array(16 * 4);
    const b = new Float32Array(16 * 4);
    expect(pictureInto(c, a, b, 16, pin)).toBe(8);
    const pic = (k: number): number[] => [a[k * 4]!, a[k * 4 + 1]!, a[k * 4 + 2]!, a[k * 4 + 3]!, b[k * 4]!, b[k * 4 + 1]!, b[k * 4 + 2]!];
    for (let k = 0; k < 4; k++) expect(pic(k), `upright ${k}`).toEqual(capOf(c, k));
    expect(pic(4)).toEqual(capOf(c, 6));
    expect(pic(5)).toEqual(capOf(c, 7));
    expect(pic(6)).toEqual(capOf(c, 4));
    expect(pic(7)).toEqual(capOf(c, 5));
    expect(pic(4)[3]).toBe(Math.fround(LOAD.r));
  });

  it('(8) fillOperator with 4 loads after a full fill reads under one HeapNumber per call; a vector per call reads 32 B+', async () => {
    const rnd = rng(13);
    const vs: VictimLike[] = [];
    for (let i = 0; i < 32; i++) vs.push(victim(-20 + rnd() * 40, 0, -20 + rnd() * 40, 1.6 + rnd() * 0.3));
    const pin = pinOf([[0, 0, 0, 1.68, 0.1, 0], [5, 0, 5, 1.75, 0, 0], [-9, 0, 4, 1.1375, 0, -0.25], [3, 0, -8, 1.75, 0, 0]]);
    const lin = linOf([[0, 1, 0.2], [1, -1, 1.4], [2, 1, -2.2], [3, -1, 3]]);
    const keys = new Int32Array(FILL.players);
    const c = new CharOccluders();
    fillPlayers(c, pin, 4, keys);
    fillVictims(c, vs, pin, 4);
    const n0 = c.n;
    const N = 2000;
    const per = (fn: (n: number) => void, goal: number): Promise<number> => bytesPerCall(fn, goal, { n: N, warm: 100000 });
    const op = await per((n) => {
      for (let i = 0; i < n; i++) {
        // (the contract back to the full fill's count each call: the loads rewritten in place, as every sim step)
        c.n = n0;
        sink[0] = fillOperator(c, pin, lin, 4, keys);
      }
    }, 0);
    const P = inputs(N * 3, (k) => k * 0.5);
    const ring: object[] = new Array<object>(64);
    const ctl = await per((n) => {
      for (let i = 0; i < n; i++) {
        const v = { x: P[i * 3]!, y: P[i * 3 + 1]!, z: P[i * 3 + 2]! };
        ring[i & 63] = v;
      }
    }, -Infinity);
    console.info(`bytes per call: fillOperator (4 loads after ${n0} capsules) ${op.toFixed(1)}, control with a vector ${ctl.toFixed(1)}`);
    expect(c.n).toBe(n0 + 4);
    expect(op).toBeLessThan(HEAP_NUMBER);
    expect(ctl).toBeGreaterThanOrEqual(32);
  }, 120_000);
});

// (S2c) Last in the file: its refs of many shapes leave `slotInto`'s property loads megamorphic (a double field read
// there is boxed, 16 B), which the allocation case above must not inherit. A machine's slots see one shape (a client's
// `CharMates` refs; the host's `RemotePlayer.ref`), as that case's three refs do.
describe('slotInto (S2c)', () => {
  it('200 random refs (half on a wall, height absent or present, crouched or not): the 6 doubles of A2, Object.is each', () => {
    const rnd = rng(31);
    const pin = new Float64Array(FILL.players * FILL_IN).fill(Number.NaN);
    const seen = { head: 0, flat: 0, noHeight: 0, height: 0, crouched: 0, standing: 0 };
    for (let k = 0; k < 200; k++) {
      const feet = { x: -40 + rnd() * 80, y: -2 + rnd() * 8, z: -40 + rnd() * 80 };
      const r: { -readonly [K in keyof MateLike]: MateLike[K] } = { feet, crouched: (k >> 1) % 2 === 0 };
      if ((k >> 2) % 2 === 0) r.height = 1.1 + rnd() * 0.9;
      if (k % 3 !== 0) {
        r.peekX = -0.4 + rnd() * 0.8;
        r.peekZ = -0.4 + rnd() * 0.8;
      }
      if (k % 2 === 0) r.head = { x: feet.x - 0.3 + rnd() * 0.6, y: feet.y + 0.2 + rnd() * 1.6, z: feet.z - 0.3 + rnd() * 0.6 };
      else if (k % 4 === 1) r.head = null;
      const s = k % FILL.players;
      slotInto(pin, s, r);
      const want = a2Of(r);
      for (let i = 0; i < FILL_IN; i++) expect(Object.is(pin[s * FILL_IN + i], want[i]), `ref ${k} double ${i}: ${pin[s * FILL_IN + i]} vs ${want[i]}`).toBe(true);
      seen[r.head ? 'head' : 'flat']++;
      seen[r.height === undefined ? 'noHeight' : 'height']++;
      seen[r.crouched ? 'crouched' : 'standing']++;
    }
    // (both branches, both height cases, both stances, with enough of each)
    for (const v of Object.values(seen)) expect(v).toBeGreaterThanOrEqual(50);
    // (on a wall the head wins over the peek; a very low head keeps the 0.3 sample floor)
    slotInto(pin, 2, { feet: { x: 1, y: 2, z: 3 }, crouched: false, peekX: 9, peekZ: 9, head: { x: 1.25, y: 2.1, z: 2.5 } });
    expect(Array.from(pin.subarray(2 * FILL_IN, 3 * FILL_IN))).toEqual([1, 2, 3, 0.3, 1.25 - 1, 2.5 - 3]);
  });
});
