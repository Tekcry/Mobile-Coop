/**
 * (guard-ai-j16 G1) The guard side's occluder shapes (`src/ai/guardOccluders.ts`; PLAN G1, BRIEF A7, A9):
 * - a guard runs feet + 0.25 to the sim head (`guardHead`), radius the hit capsule's `bodyR`; crouched, the top is lower;
 * - a dog lies along its yaw at `DOG_BODY_Y`, rump to the sim head (`dogHead`), radius 0.15;
 * - a lying body runs from the pelvis along `headYaw` by `headReach`, radius `lieLift`;
 * - owner keys come from the characters' numbers, not their order; past `FILL.reach` of every player: `OCC_FAR`;
 *   past `OCC.max`: -1;
 * - the writers write what `CharOccluders.add` writes;
 * - nothing allocates per call; the module imports no Babylon, rig or graphics code.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FILL, FILL_IN } from '../src/game/charOccluderFill';
import { headReach, lieAt, lieLift, newLie } from '../src/ai/bodyLie';
import { DOG_BODY, DOG_BODY_Y, dogHead } from '../src/ai/dogHead';
import { guardHead, guardHeadRest, newHeadIn } from '../src/ai/guardHead';
import {
  bodyOccR,
  bodyOccReach,
  GUARD_OCC,
  guardOccR,
  OCC_FAR,
  putBody,
  putDog,
  putGuard,
  type BodyOccSrc,
  type DogOccSrc,
  type GuardOccSrc,
} from '../src/ai/guardOccluders';
import { hitVolumes, proportions } from '../src/player/proportions';
import { CharOccluders, OCC, OCC_KIND, occKey } from '../src/world/charOccluders';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

const f = Math.fround;
/** A `pin` of player feet (x, z) on the floor y 0. */
const pinOf = (feet: [number, number][]): Float64Array => {
  const p = new Float64Array(FILL.players * FILL_IN);
  feet.forEach(([x, z], k) => {
    p[k * FILL_IN] = x;
    p[k * FILL_IN + 2] = z;
    p[k * FILL_IN + 3] = 1.4;
  });
  return p;
};
/** Capsule `i` as [ax, ay, az, bx, by, bz, r, kind]. */
const capOf = (c: CharOccluders, i: number): number[] => Array.from(c.cap.subarray(i * OCC.stride, (i + 1) * OCC.stride));
/** A guard of a build and height at (x, y, z) facing `yaw`, crouch 0..1: its sim head from `guardHead`. */
function guard(num: number, x: number, y: number, z: number, yaw = 0, crouch = 0, height = 1.75, build: 'average' | 'broad' | 'lean' = 'average'): GuardOccSrc {
  const rest = guardHeadRest(height, build);
  const i = newHeadIn();
  i.x = x;
  i.y = y;
  i.z = z;
  i.yaw = yaw;
  i.crouch = crouch;
  const head = { x: 0, y: 0, z: 0 };
  guardHead(i, rest, head);
  return { num, pos: { x, y, z }, simHead: head, occR: guardOccR(build, height / 1.75) };
}
function dog(num: number, x: number, y: number, z: number, yaw: number): DogOccSrc {
  const pos = { x, y, z };
  return { num, pos, yaw, simHead: dogHead(pos, yaw, 0, 0, 0, 0, { x: 0, y: 0, z: 0 }) };
}
const BODY_P = proportions('average', 1.75);
function body(num: number, x: number, floorY: number, z: number, headYaw: number): BodyOccSrc {
  return { num, lie: lieAt(newLie(), x, floorY, z, headYaw, BODY_P), occR: bodyOccR(BODY_P), occReach: bodyOccReach(BODY_P) };
}

describe('guardOccluders: shapes (A9)', () => {
  it('a guard: feet + 0.25 to the sim head, r the hit capsule bodyR, owner from num', () => {
    const occ = new CharOccluders();
    const g = guard(417, 2, 0.5, -3, 0.7);
    expect(putGuard(occ, g, pinOf([[0, 0]]), 1)).toBe(0);
    const r = hitVolumes(proportions('average', 1.75)).bodyR;
    expect(capOf(occ, 0)).toEqual([2, 0.75, -3, g.simHead.x, g.simHead.y, g.simHead.z, r, OCC_KIND.guard].map(f));
    expect(occ.owner[0]).toBe(occKey(OCC_KIND.guard, 417));
    expect(GUARD_OCC.footLift).toBe(FILL.footLift);
    // the head end is a head: well above the chest, under the guard's height
    expect(g.simHead.y - 0.5).toBeGreaterThan(1.5);
    expect(g.simHead.y - 0.5).toBeLessThan(1.75);
  });

  it('guardOccR follows the build and scale as hitboxes.ts does', () => {
    expect(guardOccR('broad', 1.1)).toBe(hitVolumes(proportions('broad', 1.75 * 1.1)).bodyR);
    expect(guardOccR('lean', 0.9)).toBe(hitVolumes(proportions('lean', 1.75 * 0.9)).bodyR);
    expect(guardOccR('broad', 1)).toBeGreaterThan(guardOccR('lean', 1));
  });

  it('crouched, the top is lower; the foot end stays', () => {
    const occ = new CharOccluders();
    const pin = pinOf([[0, 0]]);
    putGuard(occ, guard(1, 1, 0, 1, 0, 0), pin, 1);
    putGuard(occ, guard(2, 1, 0, 1, 0, 1), pin, 1);
    const up = capOf(occ, 0);
    const down = capOf(occ, 1);
    expect(down[1]).toBe(up[1]);
    expect(down[4]!).toBeLessThan(up[4]! - 0.3);
  });

  it('a dog lies along its yaw at DOG_BODY_Y: rump behind the feet to the sim head, r 0.15', () => {
    for (const yaw of [0, 1.1, -2.4, Math.PI]) {
      const occ = new CharOccluders();
      const d = dog(9, 3, 0.2, 4, yaw);
      expect(putDog(occ, d, pinOf([[0, 0]]), 1)).toBe(0);
      const c = capOf(occ, 0);
      const y = 0.2 + DOG_BODY_Y;
      const sx = Math.sin(yaw);
      const sz = Math.cos(yaw);
      expect(c[0]).toBeCloseTo(3 - sx * DOG_BODY / 2, 5);
      expect(c[2]).toBeCloseTo(4 - sz * DOG_BODY / 2, 5);
      expect(c[1]).toBe(f(y));
      expect(c[4]).toBe(f(y));
      expect([c[3], c[5], c[6], c[7]]).toEqual([d.simHead.x, d.simHead.z, 0.15, OCC_KIND.dog].map(f));
      // level, and the axis points the dog's way (rump to head along its forward)
      const ax = c[3]! - c[0]!;
      const az = c[5]! - c[2]!;
      const len = Math.sqrt(ax * ax + az * az);
      expect((ax * sx + az * sz) / len).toBeGreaterThan(0.999);
      expect(len).toBeGreaterThan(0.6);
      expect(occ.owner[0]).toBe(occKey(OCC_KIND.dog, 9));
    }
  });

  it('a lying body runs from the pelvis along headYaw by headReach, r lieLift (resting on the floor)', () => {
    for (const hy of [0, 0.8, -1.9, 3]) {
      const occ = new CharOccluders();
      const b = body(5, -2, 1, 6, hy);
      expect(putBody(occ, b, pinOf([[0, 0]]), 1)).toBe(0);
      const c = capOf(occ, 0);
      const k = headReach(BODY_P);
      const r = lieLift(BODY_P);
      expect(c[0]).toBe(f(-2));
      expect(c[2]).toBe(f(6));
      expect(c[1]).toBe(f(1 + r));
      expect(c[4]).toBe(f(1 + r));
      expect(c[3]).toBeCloseTo(-2 + Math.sin(hy) * k, 5);
      expect(c[5]).toBeCloseTo(6 + Math.cos(hy) * k, 5);
      expect([c[6], c[7]]).toEqual([f(r), OCC_KIND.body]);
      // the capsule's underside touches the floor
      expect(c[1]! - c[6]!).toBeCloseTo(1, 5);
      expect(occ.owner[0]).toBe(occKey(OCC_KIND.body, 5));
    }
  });
});

describe('guardOccluders: keys, cull, full contract (A7)', () => {
  it('owner keys follow num, not order; kinds keep apart', () => {
    const occ = new CharOccluders();
    const pin = pinOf([[0, 0]]);
    putBody(occ, body(3, 1, 0, 1, 0), pin, 1);
    putGuard(occ, guard(3, 2, 0, 2), pin, 1);
    putDog(occ, dog(40, 3, 0, 3, 0), pin, 1);
    putGuard(occ, guard(12, 4, 0, 4), pin, 1);
    expect(Array.from(occ.owner.subarray(0, 4))).toEqual([occKey(OCC_KIND.body, 3), occKey(OCC_KIND.guard, 3), occKey(OCC_KIND.dog, 40), occKey(OCC_KIND.guard, 12)]);
    // the same characters in another order keep their keys
    const occ2 = new CharOccluders();
    putGuard(occ2, guard(12, 4, 0, 4), pin, 1);
    putBody(occ2, body(3, 1, 0, 1, 0), pin, 1);
    expect(Array.from(occ2.owner.subarray(0, 2))).toEqual([occKey(OCC_KIND.guard, 12), occKey(OCC_KIND.body, 3)]);
  });

  it('beyond FILL.reach of every player (horizontal): OCC_FAR and nothing written; near any slot: written', () => {
    const occ = new CharOccluders();
    const pin = pinOf([[0, 0], [100, 0]]);
    const R = FILL.reach;
    expect(putGuard(occ, guard(1, R + 0.01, 0, 0), pin, 1)).toBe(OCC_FAR);
    expect(putDog(occ, dog(2, 0, 0, -R - 0.01, 0), pin, 1)).toBe(OCC_FAR);
    expect(putBody(occ, body(3, 50, 0, 0, 0), pin, 1)).toBe(OCC_FAR);
    expect(occ.n).toBe(0);
    // height never culls; the second slot counts once n includes it
    expect(putGuard(occ, guard(1, R, 20, 0), pin, 1)).toBe(0);
    expect(putBody(occ, body(3, 100 - R + 0.5, 0, 0, 0), pin, 1)).toBe(OCC_FAR);
    expect(putBody(occ, body(3, 100 - R + 0.5, 0, 0, 0), pin, 2)).toBe(1);
    // no players: nothing is near
    expect(putGuard(occ, guard(1, 0, 0, 0), pin, 0)).toBe(OCC_FAR);
  });

  it('past OCC.max: -1, nothing overwritten', () => {
    const occ = new CharOccluders();
    const pin = pinOf([[0, 0]]);
    for (let i = 0; i < OCC.max; i++) expect(putGuard(occ, guard(i, (i % 8) - 4, 0, (i >> 3) - 4), pin, 1)).toBe(i);
    const before = Array.from(occ.cap);
    expect(putGuard(occ, guard(99, 0, 0, 0), pin, 1)).toBe(-1);
    expect(putDog(occ, dog(99, 0, 0, 0, 0), pin, 1)).toBe(-1);
    expect(putBody(occ, body(99, 0, 0, 0, 0), pin, 1)).toBe(-1);
    // a far one is still OCC_FAR (not counted as overflow)
    expect(putBody(occ, body(99, 500, 0, 0, 0), pin, 1)).toBe(OCC_FAR);
    expect(occ.n).toBe(OCC.max);
    expect(Array.from(occ.cap)).toEqual(before);
  });

  it('writes what CharOccluders.add writes, byte for byte', () => {
    const pin = pinOf([[0, 0]]);
    const g = guard(7, 1.3, 0.1, -2.2, 0.4, 0.5, 1.82, 'broad');
    const d = dog(8, -3.1, 0, 2.7, 2.2);
    const b = body(9, 4.4, 0.3, 1.1, -0.6);
    const mine = new CharOccluders();
    putGuard(mine, g, pin, 1);
    putDog(mine, d, pin, 1);
    putBody(mine, b, pin, 1);
    const ref = new CharOccluders();
    for (let i = 0; i < 3; i++) {
      const c = capOf(mine, i);
      const kind = c[7]!;
      const num = [7, 8, 9][i]!;
      ref.add(kind, num, c[0]!, c[1]!, c[2]!, c[3]!, c[4]!, c[5]!, c[6]!);
    }
    expect(Array.from(new Uint8Array(mine.cap.buffer))).toEqual(Array.from(new Uint8Array(ref.cap.buffer)));
    expect(Array.from(mine.owner)).toEqual(Array.from(ref.owner));
    expect(mine.n).toBe(ref.n);
  });
});

describe('guardOccluders: no allocation per call', () => {
  it('putGuard x24 + putDog x4 + putBody x8 (each writer alone too) read under one HeapNumber per call; a vector per call reads 32 B+', async () => {
    const pin = pinOf([[0, 0], [5, 5], [-9, 4], [3, -8]]);
    const gs: GuardOccSrc[] = [];
    const ds: DogOccSrc[] = [];
    const bs: BodyOccSrc[] = [];
    for (let i = 0; i < 24; i++) gs.push(guard(i, -20 + ((i * 7) % 40), 0, -20 + ((i * 13) % 40), i * 0.3, (i % 3) / 2));
    // one far guard (culled every call)
    gs.push(guard(24, 200, 0, 200));
    for (let i = 0; i < 4; i++) ds.push(dog(30 + i, i * 3 - 6, 0, 2 - i, i * 1.5));
    for (let i = 0; i < 8; i++) bs.push(body(40 + i, i - 4, 0, 3 + i * 0.5, i * 0.8));
    const occ = new CharOccluders();
    const N = 2000;
    const per = (fn: (n: number) => void): Promise<number> => bytesPerCall(fn, 0, { n: N, warm: 100000 });
    const all = await per((n) => {
      for (let i = 0; i < n; i++) {
        occ.clear();
        for (let k = 0; k < gs.length; k++) putGuard(occ, gs[k]!, pin, 4);
        for (let k = 0; k < ds.length; k++) putDog(occ, ds[k]!, pin, 4);
        for (let k = 0; k < bs.length; k++) sink[0] = putBody(occ, bs[k]!, pin, 4);
      }
    });
    const capsules = occ.n;
    const g1 = await per((n) => {
      for (let i = 0; i < n; i++) {
        occ.clear();
        sink[0] = putGuard(occ, gs[i % 25]!, pin, 4);
      }
    });
    const d1 = await per((n) => {
      for (let i = 0; i < n; i++) {
        occ.clear();
        sink[0] = putDog(occ, ds[i & 3]!, pin, 4);
      }
    });
    const b1 = await per((n) => {
      for (let i = 0; i < n; i++) {
        occ.clear();
        sink[0] = putBody(occ, bs[i & 7]!, pin, 4);
      }
    });
    const P = inputs(N * 3, (k) => k * 0.5);
    const ring: object[] = new Array<object>(64);
    const ctl = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) ring[i & 63] = { x: P[i * 3]!, y: P[i * 3 + 1]!, z: P[i * 3 + 2]! };
    }, -Infinity, { n: N, warm: 100000 });
    console.info(`bytes per call: all writers (${capsules} capsules) ${all.toFixed(1)}, putGuard ${g1.toFixed(1)}, putDog ${d1.toFixed(1)}, putBody ${b1.toFixed(1)}, control with a vector ${ctl.toFixed(1)}`);
    expect(capsules).toBe(36);
    expect(all).toBeLessThan(HEAP_NUMBER);
    expect(g1).toBeLessThan(HEAP_NUMBER);
    expect(d1).toBeLessThan(HEAP_NUMBER);
    expect(b1).toBeLessThan(HEAP_NUMBER);
    expect(ctl).toBeGreaterThanOrEqual(32);
  }, 120_000);
});

describe('guardOccluders: purity', () => {
  it('imports no Babylon, rig, quality, governor, charShadowSet or net code', () => {
    const src = readFileSync('src/ai/guardOccluders.ts', 'utf8');
    const imports = src.split('\n').filter((l) => /^\s*import\b/.test(l));
    expect(imports.length).toBeGreaterThan(0);
    for (const l of imports) {
      expect(l).not.toMatch(/babylon|characterRig|lightRig|\brig\b|quality|governor|charShadowSet|bakedLamps|\/net\/|\/render\/|\/ui\//i);
      expect(l).toMatch(/from '(\.\.\/core\/mathx|\.\.\/game\/charOccluderFill|\.\.\/player\/proportions|\.\.\/world\/charOccluders|\.\/bodyLie|\.\/dogHead)'/);
    }
    expect(src).not.toMatch(/Math\.hypot/);
  });
});
